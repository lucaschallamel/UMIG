package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.EnvironmentRepository
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import org.apache.log4j.Logger

import javax.servlet.http.HttpServletRequest
import groovy.json.JsonException
import java.sql.SQLException
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

@BaseScript CustomEndpointDelegate delegate

/**
 * SECURITY ENHANCEMENT: Rate Limiting for Environments API
 * Prevents DoS attacks and API abuse
 */
class EnvironmentsApiRateLimiter {
    // Static logger for use within static methods
    private static final Logger logger = Logger.getLogger(EnvironmentsApiRateLimiter.class)
    // Client tracking by IP address with request counts and timestamps
    private static final ConcurrentHashMap<String, ClientRequestInfo> clients = new ConcurrentHashMap<>()
    private static final int MAX_REQUESTS_PER_MINUTE = 60  // Reasonable limit for environments API
    private static final int MAX_REQUESTS_PER_HOUR = 600   // Daily usage protection
    private static final long MINUTE_IN_MS = 60 * 1000
    private static final long HOUR_IN_MS = 60 * 60 * 1000
    
    static class ClientRequestInfo {
        AtomicInteger requestsThisMinute = new AtomicInteger(0)
        AtomicInteger requestsThisHour = new AtomicInteger(0)
        long lastMinuteReset = System.currentTimeMillis()
        long lastHourReset = System.currentTimeMillis()
        long firstRequestTime = System.currentTimeMillis()
        boolean blocked = false
        String userAgent = ""
        
        synchronized void resetCountersIfNeeded() {
            long now = System.currentTimeMillis()
            
            // Reset minute counter
            if (now - lastMinuteReset > MINUTE_IN_MS) {
                requestsThisMinute.set(0)
                lastMinuteReset = now
            }
            
            // Reset hour counter
            if (now - lastHourReset > HOUR_IN_MS) {
                requestsThisHour.set(0)
                lastHourReset = now
            }
        }
    }
    
    static boolean isRequestAllowed(String clientIp, String userAgent, String method) {
        if (!clientIp) {
            return true  // Allow requests without IP (internal/admin)
        }
        
        ClientRequestInfo clientInfo = clients.computeIfAbsent(clientIp) { 
            new ClientRequestInfo(userAgent: userAgent ?: "unknown") 
        }
        
        clientInfo.resetCountersIfNeeded()
        
        // Check if client is blocked
        if (clientInfo.blocked) {
            return false
        }
        
        int minuteRequests = clientInfo.requestsThisMinute.get()
        int hourRequests = clientInfo.requestsThisHour.get()
        
        // Apply stricter limits for write operations
        int minuteLimit = (method in ['POST', 'PUT', 'DELETE']) ?
            Math.min((MAX_REQUESTS_PER_MINUTE / 2) as int, 30) : MAX_REQUESTS_PER_MINUTE
        int hourLimit = (method in ['POST', 'PUT', 'DELETE']) ?
            Math.min((MAX_REQUESTS_PER_HOUR / 2) as int, 300) : MAX_REQUESTS_PER_HOUR
        
        // Check limits
        if (minuteRequests >= minuteLimit || hourRequests >= hourLimit) {
            // Log security event
            logger.warn("Rate limit exceeded for IP: ${clientIp}, Method: ${method}, " +
                    "Minute: ${minuteRequests}/${minuteLimit}, Hour: ${hourRequests}/${hourLimit}")

            // Block aggressive clients
            if (hourRequests >= hourLimit * 1.5) {
                clientInfo.blocked = true
                logger.warn("Client ${clientIp} blocked due to excessive requests")
            }

            return false
        }
        
        // Increment counters
        clientInfo.requestsThisMinute.incrementAndGet()
        clientInfo.requestsThisHour.incrementAndGet()
        
        return true
    }
    
    static Response createRateLimitResponse(String clientIp, String method) {
        logger.warn("Rate limit response sent to IP: ${clientIp} for method: ${method}")

        return Response.status(429)  // Too Many Requests
            .entity(new JsonBuilder([
                error: "Rate limit exceeded",
                message: "Too many requests. Please try again later.",
                retryAfter: "60 seconds",
                code: "RATE_LIMIT_EXCEEDED"
            ]).toString())
            .header("Retry-After", "60")
            .header("X-RateLimit-Limit", "${MAX_REQUESTS_PER_MINUTE}")
            .header("X-RateLimit-Reset", "${System.currentTimeMillis() + MINUTE_IN_MS}")
            .build()
    }
    
    static String getClientIp(HttpServletRequest request) {
        // Get real IP address, considering proxies
        String xForwardedFor = request.getHeader("X-Forwarded-For")
        if (xForwardedFor) {
            return xForwardedFor.split(",")[0].trim()
        }
        
        String xRealIp = request.getHeader("X-Real-IP")
        if (xRealIp) {
            return xRealIp
        }
        
        return request.getRemoteAddr()
    }
    
    // Cleanup old client data periodically
    static void cleanupOldClients() {
        long now = System.currentTimeMillis()
        long cleanupThreshold = 24 * 60 * 60 * 1000  // 24 hours

        clients.entrySet().removeIf { entry ->
            ClientRequestInfo info = entry.getValue()
            return (now - info.firstRequestTime) > cleanupThreshold && !info.blocked
        }
    }

    // SECURITY: Setup periodic cleanup of rate limiting data to prevent memory leaks
    // This cleanup runs to maintain performance and prevent unbounded memory growth
    static {
        Runtime.getRuntime().addShutdownHook(new Thread({
            cleanupOldClients()
        }))
    }
}

final EnvironmentRepository environmentRepository = new EnvironmentRepository()

/**
 * Handles GET requests for Environments.
 * - GET /environments -> returns all environments with counts
 * - GET /environments/{id} -> returns a single environment with full details
 * - GET /environments/{id}/iterations -> returns iterations grouped by role
 * - GET /environments/roles -> returns all available environment roles
 * SECURITY ENHANCED: Now includes rate limiting
 */
environments(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // SECURITY: Apply rate limiting
    String clientIp = EnvironmentsApiRateLimiter.getClientIp(request)
    String userAgent = request.getHeader("User-Agent")
    
    if (!EnvironmentsApiRateLimiter.isRequestAllowed(clientIp, userAgent, "GET")) {
        return EnvironmentsApiRateLimiter.createRateLimitResponse(clientIp, "GET")
    }
    
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    try {
        // GET /environments/roles - special endpoint for environment roles
        if (pathParts.size() == 1 && pathParts[0] == 'roles') {
            def roles = environmentRepository.getAllEnvironmentRoles()
            return Response.ok(new JsonBuilder(roles).toString()).build()
        }

        // GET /environments/{id}/iterations
        if (pathParts.size() == 2 && pathParts[1] == 'iterations') {
            try {
                def envId = Integer.parseInt(pathParts[0])
                def iterationsByRole = environmentRepository.getIterationsByEnvironmentGroupedByRole(envId)
                return Response.ok(new JsonBuilder(iterationsByRole).toString()).build()
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid environment ID format"]).toString())
                    .build()
            }
        }

        // GET /environments/{id}
        if (pathParts.size() == 1) {
            try {
                def envId = Integer.parseInt(pathParts[0])
                def environment = environmentRepository.findEnvironmentById(envId)
                if (!environment) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Environment not found"]).toString())
                        .build()
                }
                return Response.ok(new JsonBuilder(environment).toString()).build()
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid environment ID format"]).toString())
                    .build()
            }
        }

        // GET /environments - list all
        // Extract pagination and search parameters
        def page = queryParams.getFirst('page')
        def size = queryParams.getFirst('size')
        def search = queryParams.getFirst('search')
        def sort = queryParams.getFirst('sort')
        def direction = queryParams.getFirst('direction')
        
        // Parse pagination parameters with defaults
        int pageNumber = 1
        int pageSize = 50
        
        if (page) {
            try {
                pageNumber = Integer.parseInt(page as String)
                if (pageNumber < 1) pageNumber = 1
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid page number format"]).toString())
                    .build()
            }
        }
        
        if (size) {
            try {
                pageSize = Integer.parseInt(size as String)
                if (pageSize < 1) pageSize = 50
                if (pageSize > 200) pageSize = 200  // Maximum page size
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid page size format"]).toString())
                    .build()
            }
        }
        
        // Parse sort parameters
        String sortField = 'env_id'  // Default sort field
        String sortDirection = 'asc'
        
        if (sort && ['env_id', 'env_code', 'env_name', 'env_description', 'application_count', 'iteration_count'].contains(sort as String)) {
            sortField = sort as String
        }
        
        if (direction && ['asc', 'desc'].contains((direction as String).toLowerCase())) {
            sortDirection = (direction as String).toLowerCase()
        }
        
        // Validate search term
        String searchTerm = search as String
        if (searchTerm && searchTerm.trim().length() < 2) {
            searchTerm = null  // Ignore very short search terms (less than 2 characters)
        }
        
        // Get paginated environments
        def result = environmentRepository.findAllEnvironmentsWithCounts(pageNumber, pageSize, searchTerm, sortField, sortDirection)
        return Response.ok(new JsonBuilder(result).toString()).build()

    } catch (SQLException e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred: ${e.message}"]).toString())
            .build()
    }
}

/**
 * Handles POST requests for Environments.
 * - POST /environments -> creates a new environment
 * - POST /environments/{id}/applications/{appId} -> associates an application
 * - POST /environments/{id}/iterations/{iteId} -> associates an iteration with role
 * SECURITY ENHANCED: Now includes rate limiting
 */
environments(httpMethod: "POST", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // SECURITY: Apply rate limiting (stricter for write operations)
    String clientIp = EnvironmentsApiRateLimiter.getClientIp(request)
    String userAgent = request.getHeader("User-Agent")
    
    if (!EnvironmentsApiRateLimiter.isRequestAllowed(clientIp, userAgent, "POST")) {
        return EnvironmentsApiRateLimiter.createRateLimitResponse(clientIp, "POST")
    }
    
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    try {
        // POST /environments/{id}/applications/{appId}
        if (pathParts.size() == 3 && pathParts[1] == 'applications') {
            try {
                def envId = Integer.parseInt(pathParts[0])
                def appId = Integer.parseInt(pathParts[2])
                
                environmentRepository.associateApplication(envId, appId)
                return Response.ok(new JsonBuilder([message: "Application associated successfully"]).toString()).build()
                
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid ID format"]).toString())
                    .build()
            } catch (SQLException e) {
                if (e.getSQLState() == "23505") {
                    return Response.status(Response.Status.CONFLICT)
                        .entity(new JsonBuilder([error: "Association already exists"]).toString())
                        .build()
                }
                throw e
            }
        }

        // POST /environments/{id}/iterations/{iteId}
        if (pathParts.size() == 3 && pathParts[1] == 'iterations') {
            try {
                def envId = Integer.parseInt(pathParts[0])
                def iteId = UUID.fromString(pathParts[2] as String)
                
                def payload = new JsonSlurper().parseText(body) as Map
                def roleId = payload.enr_id
                
                if (!roleId) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "enr_id is required"]).toString())
                        .build()
                }
                
                environmentRepository.associateIteration(envId, iteId.toString(), roleId as Integer)
                return Response.ok(new JsonBuilder([message: "Iteration associated successfully"]).toString()).build()
                
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid environment ID format"]).toString())
                    .build()
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid iteration ID format"]).toString())
                    .build()
            } catch (SQLException e) {
                if (e.getSQLState() == "23505") {
                    return Response.status(Response.Status.CONFLICT)
                        .entity(new JsonBuilder([error: "Association already exists"]).toString())
                        .build()
                }
                throw e
            }
        }

        // POST /environments - create new environment
        if (pathParts.isEmpty()) {
            def payload = new JsonSlurper().parseText(body) as Map
            
            // Validate required fields
            if (!payload.env_code || !payload.env_name) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "env_code and env_name are required"]).toString())
                    .build()
            }
            
            def newEnv = environmentRepository.createEnvironment([
                env_code: payload.env_code as String,
                env_name: payload.env_name as String,
                env_description: payload.env_description as String
            ])
            
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(newEnv).toString())
                .build()
        }

        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid endpoint"]).toString())
            .build()

    } catch (JsonException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid JSON in request body"]).toString())
            .build()
    } catch (SQLException e) {
        if (e.getSQLState() == "23505") {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([error: "An environment with this code already exists"]).toString())
                .build()
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred"]).toString())
            .build()
    }
}

/**
 * Handles PUT requests for Environments.
 * - PUT /environments/{id} -> updates an environment
 * SECURITY ENHANCED: Now includes rate limiting
 */
environments(httpMethod: "PUT", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // SECURITY: Apply rate limiting (stricter for write operations)
    String clientIp = EnvironmentsApiRateLimiter.getClientIp(request)
    String userAgent = request.getHeader("User-Agent")
    
    if (!EnvironmentsApiRateLimiter.isRequestAllowed(clientIp, userAgent, "PUT")) {
        return EnvironmentsApiRateLimiter.createRateLimitResponse(clientIp, "PUT")
    }
    
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    if (pathParts.size() != 1) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Environment ID is required"]).toString())
            .build()
    }

    try {
        def envId = Integer.parseInt(pathParts[0])
        def payload = new JsonSlurper().parseText(body) as Map
        
        // Validate required fields
        if (!payload.env_code || !payload.env_name) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "env_code and env_name are required"]).toString())
                .build()
        }
        
        def updatedEnv = environmentRepository.updateEnvironment(envId, [
            env_code: payload.env_code as String,
            env_name: payload.env_name as String,
            env_description: payload.env_description as String
        ])
        
        if (!updatedEnv) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Environment not found"]).toString())
                .build()
        }
        
        // Return the updated environment
        return Response.ok(new JsonBuilder(updatedEnv).toString()).build()

    } catch (NumberFormatException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid environment ID format"]).toString())
            .build()
    } catch (JsonException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid JSON in request body"]).toString())
            .build()
    } catch (SQLException e) {
        if (e.getSQLState() == "23505") {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([error: "An environment with this code already exists"]).toString())
                .build()
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred"]).toString())
            .build()
    }
}

/**
 * Handles DELETE requests for Environments.
 * - DELETE /environments/{id} -> deletes an environment
 * - DELETE /environments/{id}/applications/{appId} -> removes application association
 * - DELETE /environments/{id}/iterations/{iteId} -> removes iteration association
 * SECURITY ENHANCED: Now includes rate limiting
 */
environments(httpMethod: "DELETE", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // SECURITY: Apply rate limiting (stricter for write operations)
    String clientIp = EnvironmentsApiRateLimiter.getClientIp(request)
    String userAgent = request.getHeader("User-Agent")
    
    if (!EnvironmentsApiRateLimiter.isRequestAllowed(clientIp, userAgent, "DELETE")) {
        return EnvironmentsApiRateLimiter.createRateLimitResponse(clientIp, "DELETE")
    }
    
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    if (pathParts.isEmpty()) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Environment ID is required"]).toString())
            .build()
    }

    try {
        def envId = Integer.parseInt(pathParts[0])

        // DELETE /environments/{id}/applications/{appId}
        if (pathParts.size() == 3 && pathParts[1] == 'applications') {
            try {
                def appId = Integer.parseInt(pathParts[2])
                def removed = environmentRepository.disassociateApplication(envId, appId)
                
                if (!removed) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Association not found"]).toString())
                        .build()
                }
                
                return Response.noContent().build()
                
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid application ID format"]).toString())
                    .build()
            }
        }

        // DELETE /environments/{id}/iterations/{iteId}
        if (pathParts.size() == 3 && pathParts[1] == 'iterations') {
            try {
                def iteId = UUID.fromString(pathParts[2] as String)
                def removed = environmentRepository.disassociateIteration(envId, iteId.toString())
                
                if (!removed) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Association not found"]).toString())
                        .build()
                }
                
                return Response.noContent().build()
                
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid iteration ID format"]).toString())
                    .build()
            }
        }

        // DELETE /environments/{id}
        if (pathParts.size() == 1) {
            // Check for blocking relationships
            def blockingRelationships = environmentRepository.getEnvironmentBlockingRelationships(envId)
            if (blockingRelationships && !blockingRelationships.isEmpty()) {
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([
                        error: "Cannot delete environment with ID ${envId} due to existing relationships",
                        blocking_relationships: blockingRelationships
                    ]).toString())
                    .build()
            }
            
            def deleted = environmentRepository.deleteEnvironment(envId)
            if (!deleted) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Environment not found"]).toString())
                    .build()
            }
            
            return Response.noContent().build()
        }

        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid endpoint"]).toString())
            .build()

    } catch (NumberFormatException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid environment ID format"]).toString())
            .build()
    } catch (SQLException e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred"]).toString())
            .build()
    }
}
