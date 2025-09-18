package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.UserRepository
import umig.service.UserService
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import org.apache.log4j.LogManager
import org.apache.log4j.Logger

@BaseScript CustomEndpointDelegate delegate

@Field
final UserRepository userRepository = new UserRepository()

@Field
final Logger log = LogManager.getLogger(getClass())

private Integer getUserIdFromPath(HttpServletRequest request) {
    def extraPath = getAdditionalPath(request)
    if (extraPath) {
        def pathParts = extraPath.split('/').findAll { it }
        if (pathParts.size() == 1) {
            try {
                return pathParts[0].toInteger()
            } catch (NumberFormatException e) {
                // Will be handled by the caller by returning a 400
                return null
            }
        }
    }
    return null
}

// GET /users and /users/{id} and /users/current
users(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // GET /users/current - Get current authenticated user
    if (pathParts.size() == 1 && pathParts[0] == 'current') {
        try {
            // Try to get username from ThreadLocal (primary method)
            def currentUser = null
            def username = null

            try {
                // Get username from UserService ThreadLocal access (per ADR-042)
                def userContext = UserService.getCurrentUserContext()
                username = userContext?.confluenceUsername as String
                log.info("GET /users/current - Got username from ThreadLocal: ${username}")
            } catch (Exception e) {
                log.warn("GET /users/current - ThreadLocal access failed: ${e.message}")
            }

            // Fallback: check query parameter
            if (!username) {
                username = queryParams.getFirst('username') as String
                log.info("GET /users/current - Using username from query parameter: ${username}")
            }

            // Additional fallback: check for userCode parameter (legacy support)
            if (!username) {
                username = queryParams.getFirst('userCode') as String
                log.info("GET /users/current - Using userCode from query parameter: ${username}")
            }

            if (!username) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "Unable to determine current user. Username parameter required.",
                        debug: "ThreadLocal failed, no username or userCode parameter provided"
                    ]).toString())
                    .build()
            }

            // Find user by username
            currentUser = userRepository.findUserByUsername(username as String)

            if (!currentUser) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([
                        error: "Current user not found in database",
                        username: username
                    ]).toString())
                    .build()
            }

            // Return current user with role information
            def userMap = currentUser as Map

            // Get the role code from the role ID
            def roleCode = 'USER' // Default
            if (userMap.rls_id) {
                switch(userMap.rls_id) {
                    case 1: roleCode = 'ADMIN'; break
                    case 2: roleCode = 'USER'; break
                    case 3: roleCode = 'PILOT'; break
                    default: roleCode = 'USER'
                }
            }

            return Response.ok(new JsonBuilder([
                userId: userMap.usr_id,
                username: userMap.usr_code,
                firstName: userMap.usr_first_name,
                lastName: userMap.usr_last_name,
                email: userMap.usr_email,
                isAdmin: userMap.usr_is_admin ?: false,
                roleId: userMap.rls_id,
                role: roleCode,
                isActive: userMap.usr_active,
                source: "current_user_endpoint"
            ]).toString()).build()

        } catch (Exception e) {
            log.error("GET /users/current - Error getting current user: ${e.message}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([
                    error: "Failed to get current user information",
                    details: e.message
                ]).toString())
                .build()
        }
    }

    Integer userId = getUserIdFromPath(request)

    // Handle case where path is /users/{invalid_id} (but not /users/current)
    if (extraPath && pathParts.size() == 1 && pathParts[0] != 'current' && userId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid User ID format."]).toString()).build()
    }

    try {
        if (userId != null) {
            def user = userRepository.findUserById(userId)
            if (!user) {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
            }
            return Response.ok(new JsonBuilder(user).toString()).build()
        } else {
            // Check for userCode authentication parameter
            def userCode = queryParams.getFirst('userCode')
            if (userCode) {
                log.info("GET /users - Authentication request for userCode: ${userCode}")
                // Find user by userCode for authentication
                def userResult = userRepository.findUserByUsername(userCode as String)
                if (userResult) {
                    Map user = userResult as Map
                    log.info("GET /users - User found for authentication: ${user.usr_code} (ID: ${user.usr_id})")
                    return Response.ok(new JsonBuilder([user]).toString()).build()
                } else {
                    log.warn("GET /users - User not found for authentication: ${userCode}")
                    // Provide additional debugging information
                    def allUserCodes = DatabaseUtil.withSql { sql ->
                        return sql.rows("SELECT usr_code FROM users_usr WHERE usr_active = true ORDER BY usr_code").collect { it.usr_code }
                    }
                    return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([
                        error: "User with code ${userCode} not found.", 
                        debug: "Available active user codes: ${allUserCodes.join(', ')}"
                    ]).toString()).build()
                }
            }
            
            // Extract pagination parameters
            def page = queryParams.getFirst('page')
            def size = queryParams.getFirst('size')
            def search = queryParams.getFirst('search')
            def sort = queryParams.getFirst('sort')
            def direction = queryParams.getFirst('direction')
            def teamId = queryParams.getFirst('teamId')
            def active = queryParams.getFirst('active')
            
            // Parse pagination parameters with defaults
            int pageNumber = 1
            int pageSize = 50
            
            if (page) {
                try {
                    pageNumber = Integer.parseInt(page as String)
                    if (pageNumber < 1) pageNumber = 1
                } catch (NumberFormatException e) {
                    pageNumber = 1
                }
            }
            
            if (size) {
                try {
                    pageSize = Integer.parseInt(size as String)
                    if (pageSize < 1) pageSize = 50
                    if (pageSize > 500) pageSize = 500 // Maximum limit
                } catch (NumberFormatException e) {
                    pageSize = 50
                }
            }
            
            // Parse sort parameters
            String sortField = null
            String sortDirection = 'asc'
            
            if (sort) {
                // Validate sort field against allowed columns
                def allowedSortFields = ['usr_id', 'usr_first_name', 'usr_last_name', 'usr_email', 'usr_code', 'usr_is_admin', 'usr_active', 'rls_id']
                if (allowedSortFields.contains(sort as String)) {
                    sortField = sort as String
                }
            }
            
            if (direction && ['asc', 'desc'].contains((direction as String).toLowerCase())) {
                sortDirection = (direction as String).toLowerCase()
            }
            
            // Validate search term
            String searchTerm = search as String
            if (searchTerm && searchTerm.trim().length() < 2) {
                searchTerm = null  // Ignore very short search terms (less than 2 characters)
            }
            
            // Parse team filter
            Integer teamFilter = null
            if (teamId) {
                try {
                    teamFilter = Integer.parseInt(teamId as String)
                } catch (NumberFormatException e) {
                    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid team ID format"]).toString()).build()
                }
            }
            
            // Parse active filter
            Boolean activeFilter = null
            if (active) {
                if (active.toString().toLowerCase() in ['true', 'false']) {
                    activeFilter = Boolean.parseBoolean(active as String)
                } else {
                    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid active parameter. Must be true or false"]).toString()).build()
                }
            }
            
            // Get paginated users
            def result = userRepository.findAllUsers(pageNumber, pageSize, searchTerm, sortField, sortDirection, teamFilter, activeFilter)
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
    } catch (SQLException e) {
        log.error("Database error in GET /users", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
    } catch (Exception e) {
        log.error("Unexpected error in GET /users", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
    }
}

// POST /users
users(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        Map userData = new JsonSlurper().parseText(body) as Map

        if (userData.containsKey('teams')) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Team membership must be managed via the Teams API. The 'teams' field is not accepted here."]).toString()).build()
        }

        def missing = []
        if (!userData.usr_first_name || !(userData.usr_first_name instanceof String) || (userData.usr_first_name as String).trim().isEmpty()) missing << 'usr_first_name'
        if (!userData.usr_last_name || !(userData.usr_last_name instanceof String) || (userData.usr_last_name as String).trim().isEmpty()) missing << 'usr_last_name'
        if (userData.usr_is_admin == null || !(userData.usr_is_admin instanceof Boolean)) missing << 'usr_is_admin'
        if (missing) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Missing or invalid required field(s): ${missing.join(', ')}"]).toString()).build()
        }

        def newUser = userRepository.createUser(userData)
        return Response.status(Response.Status.CREATED).entity(new JsonBuilder(newUser).toString()).build()
    } catch (SQLException e) {
        log.error("Database error in POST /users: ${e.message}", e)
        
        if (e.getSQLState() == '23505') { // unique_violation
            String constraintName = e.getMessage()
            String fieldName = "field"
            
            if (constraintName.contains('usr_email')) {
                fieldName = "email address"
            } else if (constraintName.contains('usr_code')) {
                fieldName = "user code"
            }
            
            return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([
                error: "A user with this ${fieldName} already exists.",
                details: "Duplicate value constraint violation",
                sqlState: e.getSQLState()
            ]).toString()).build()
        } else if (e.getSQLState() == '23502') { // not_null_violation
            String message = e.getMessage()
            String fieldName = "field"
            
            if (message.contains('usr_code')) {
                fieldName = "User Code (usr_code)"
            } else if (message.contains('usr_first_name')) {
                fieldName = "First Name (usr_first_name)"
            } else if (message.contains('usr_last_name')) {
                fieldName = "Last Name (usr_last_name)"
            } else if (message.contains('usr_email')) {
                fieldName = "Email (usr_email)"
            } else if (message.contains('usr_is_admin')) {
                fieldName = "Super Admin flag (usr_is_admin)"
            }
            
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([
                error: "Missing required field: ${fieldName}",
                details: "Database constraint violation - field cannot be null",
                sqlState: e.getSQLState()
            ]).toString()).build()
        } else if (e.getSQLState() == '23503') { // foreign_key_violation
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([
                error: "Invalid reference - the specified role or team does not exist.",
                details: "Foreign key constraint violation",
                sqlState: e.getSQLState()
            ]).toString()).build()
        }
        
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([
            error: "Database error occurred.",
            details: e.getMessage(),
            sqlState: e.getSQLState()
        ]).toString()).build()
    } catch (Exception e) {
        log.error("Unexpected error in POST /users", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
    }
}

// PUT /users/{id}
users(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    Integer userId = getUserIdFromPath(request)
    if (userId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "A numeric User ID must be provided in the URL path for PUT requests."]).toString()).build()
    }

    try {
        Map userData = new JsonSlurper().parseText(body) as Map

        if (userData.containsKey('teams')) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Team membership must be managed via the Teams API. The 'teams' field is not accepted here."]).toString()).build()
        }

        if (userRepository.findUserById(userId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        def updatedUser = userRepository.updateUser(userId, userData)
        return Response.ok(new JsonBuilder(updatedUser).toString()).build()
    } catch (SQLException e) {
        log.error("Database error in PUT /users/${userId}: ${e.message}", e)
        
        if (e.getSQLState() == '23505') { // unique_violation
            String constraintName = e.getMessage()
            String fieldName = "field"
            
            if (constraintName.contains('usr_email')) {
                fieldName = "email address"
            } else if (constraintName.contains('usr_code')) {
                fieldName = "user code"
            }
            
            return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([
                error: "A user with this ${fieldName} already exists.",
                details: "Duplicate value constraint violation",
                sqlState: e.getSQLState()
            ]).toString()).build()
        } else if (e.getSQLState() == '23503') { // foreign_key_violation
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([
                error: "Invalid reference - the specified role or team does not exist.",
                details: "Foreign key constraint violation",
                sqlState: e.getSQLState()
            ]).toString()).build()
        }
        
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([
            error: "Database error occurred during update.",
            details: e.getMessage(),
            sqlState: e.getSQLState(),
            stackTrace: e.getStackTrace().take(5).collect { it.toString() }
        ]).toString()).build()
    } catch (Exception e) {
        log.error("Unexpected error in PUT /users/${userId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
    }
}

// DELETE /users/{id}
users(httpMethod: "DELETE", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    Integer userId = getUserIdFromPath(request)
    if (userId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "A numeric User ID must be provided in the URL path for DELETE requests."]).toString()).build()
    }

    // Pre-fetch blocking relationships before attempting delete
    def blocking = userRepository.getUserBlockingRelationships(userId)
    try {
        if (userRepository.findUserById(userId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        userRepository.deleteUser(userId)
        return Response.noContent().build() // Correct REST pattern for DELETE

    } catch (SQLException e) {
        if (e.getSQLState() == '23503') { // foreign_key_violation
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([
                    error: "Cannot delete user with ID ${userId} as they are still referenced by other resources.",
                    blocking_relationships: blocking
                ]).toString()).build()
        }
        log.error("Database error in DELETE /users/${userId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "A database error occurred."]).toString()).build()
    } catch (Exception e) {
        log.error("Unexpected error in DELETE /users/${userId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
    }
}

/**
 * User context endpoint
 * GET /user/context?username=xxx - Get user context including role information
 */
user(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // GET /user/context
    if (pathParts.size() == 1 && pathParts[0] == 'context') {
        try {
            // Get user by username from query params
            def username = queryParams.getFirst('username')
            if (!username) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Username is required"]).toString())
                    .build()
            }
            
            // Find user by username
            def user = userRepository.findUserByUsername(username as String)
            
            if (!user) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "User not found"]).toString())
                    .build()
            }
            
            // Return user context with role information
            def userMap = user as Map
            
            // Get the role code from the role ID
            def roleCode = 'NORMAL' // Default
            if (userMap.rls_id) {
                // Need to add DatabaseUtil import and fetch role
                // For now, let's map role IDs directly
                switch(userMap.rls_id) {
                    case 1: roleCode = 'ADMIN'; break
                    case 2: roleCode = 'NORMAL'; break
                    case 3: roleCode = 'PILOT'; break
                    default: roleCode = 'NORMAL'
                }
            }
            
            return Response.ok(new JsonBuilder([
                userId: userMap.usr_id,
                username: userMap.usr_code,
                firstName: userMap.usr_first_name,
                lastName: userMap.usr_last_name,
                email: userMap.usr_email,
                isAdmin: userMap.usr_is_admin ?: false,
                roleId: userMap.rls_id,
                role: roleCode,
                isActive: userMap.usr_active
            ]).toString()).build()
            
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to get user context: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid user endpoint"]).toString())
        .build()
}
