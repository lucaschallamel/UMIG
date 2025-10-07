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
            // SECURITY: Get authenticated user from session (REQUIRED)
            // This uses UserService.getCurrentUserContext() which now has enhanced authentication
            // with AuthenticatedUserThreadLocal + SAL UserManager fallback
            def username = null
            def authenticatedUserContext = null

            try {
                // Get username from UserService ThreadLocal/SAL authentication (per ADR-042)
                authenticatedUserContext = UserService.getCurrentUserContext()
                username = authenticatedUserContext?.confluenceUsername as String
                log.info("GET /users/current - Authenticated user: ${username}")
            } catch (Exception e) {
                log.error("GET /users/current - Authentication failed: ${e.message}", e)
            }

            // SECURITY: If authentication fails, return 401 Unauthorized
            // DO NOT fall back to query parameters - this would create an authentication bypass vulnerability
            if (!username) {
                log.warn("SECURITY: GET /users/current - Authentication failed, no valid session")
                return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(new JsonBuilder([
                        error: "Session authentication required",
                        details: "Unable to verify user identity. Please ensure you are logged into Confluence.",
                        troubleshooting: [
                            "Verify Confluence session is active",
                            "Check ScriptRunner authentication context",
                            "Review logs for authentication method failures"
                        ]
                    ]).toString())
                    .build()
            }

            // SECURITY: Check for admin-only cross-user viewing
            // Optional feature: Allow admins to view other users' data via ?username parameter
            def requestedUsername = queryParams.getFirst('username') as String

            if (requestedUsername && requestedUsername != username) {
                // Cross-user query detected - verify admin privileges
                def authenticatedUser = userRepository.findUserByUsername(username)

                // Explicit casting for type safety (ADR-031, ADR-043)
                def authenticatedUserMap = authenticatedUser as Map

                if (!authenticatedUserMap?.usr_is_admin) {
                    // Non-admin attempting to view other user's data - REJECT
                    log.warn("SECURITY: User '${username}' (non-admin) attempted unauthorized access to user '${requestedUsername}'")

                    return Response.status(Response.Status.FORBIDDEN)
                        .entity(new JsonBuilder([
                            error: "Insufficient privileges",
                            details: "Only administrators can view other users' data",
                            authenticatedUser: username,
                            requestedUser: requestedUsername
                        ]).toString())
                        .build()
                }

                // Admin is authorized - allow cross-user query
                log.info("SECURITY: Admin '${username}' authorized to view user '${requestedUsername}'")
                username = requestedUsername
            }

            // Find user by username (either authenticated user or admin-requested user)
            def currentUser = userRepository.findUserByUsername(username as String)

            if (!currentUser) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([
                        error: "User not found in database",
                        username: username
                    ]).toString())
                    .build()
            }

            // Return current user with role information
            def userMap = currentUser as Map

            // Use the role code directly from the database
            def roleCode = userMap.role_code ?: 'USER' // Default to USER if no role

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

            // Include audit fields and role information in the response
            def userMap = user as Map
            def userResponse = [
                usr_id: userMap.usr_id,
                usr_code: userMap.usr_code,
                usr_first_name: userMap.usr_first_name,
                usr_last_name: userMap.usr_last_name,
                usr_email: userMap.usr_email,
                usr_is_admin: userMap.usr_is_admin,
                usr_active: userMap.usr_active,
                rls_id: userMap.rls_id,
                role_code: userMap.role_code,
                role_description: userMap.role_description,
                teams: userMap.teams,
                // Audit fields
                created_at: userMap.created_at,
                updated_at: userMap.updated_at,
                created_by: userMap.created_by,
                updated_by: userMap.updated_by
            ]

            return Response.ok(new JsonBuilder(userResponse).toString()).build()
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

            // Cast result to Map for static type checking compliance (ADR-031, ADR-043)
            def resultMap = result as Map

            // Ensure all users include audit fields
            if (resultMap.content) {
                resultMap.content = (resultMap.content as List).collect { user ->
                    def userMap = user as Map
                    return [
                        usr_id: userMap.usr_id,
                        usr_code: userMap.usr_code,
                        usr_first_name: userMap.usr_first_name,
                        usr_last_name: userMap.usr_last_name,
                        usr_email: userMap.usr_email,
                        usr_is_admin: userMap.usr_is_admin,
                        usr_active: userMap.usr_active,
                        rls_id: userMap.rls_id,
                        role_code: userMap.role_code,
                        role_description: userMap.role_description,
                        teams: userMap.teams,
                        // Audit fields
                        created_at: userMap.created_at,
                        updated_at: userMap.updated_at,
                        created_by: userMap.created_by,
                        updated_by: userMap.updated_by
                    ]
                }
            }

            return Response.ok(new JsonBuilder(resultMap).toString()).build()
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

        // Ensure audit fields are included in the response
        def userMap = newUser as Map
        def userResponse = [
            usr_id: userMap.usr_id,
            usr_code: userMap.usr_code,
            usr_first_name: userMap.usr_first_name,
            usr_last_name: userMap.usr_last_name,
            usr_email: userMap.usr_email,
            usr_is_admin: userMap.usr_is_admin,
            usr_active: userMap.usr_active,
            rls_id: userMap.rls_id,
            teams: userMap.teams,
            // Audit fields
            created_at: userMap.created_at,
            updated_at: userMap.updated_at,
            created_by: userMap.created_by,
            updated_by: userMap.updated_by
        ]

        return Response.status(Response.Status.CREATED).entity(new JsonBuilder(userResponse).toString()).build()
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

        // Add validation for required fields and data types (matching POST endpoint validation)
        def validationErrors = []

        // Validate first name if provided
        if (userData.containsKey('usr_first_name')) {
            if (!userData.usr_first_name || !(userData.usr_first_name instanceof String) || (userData.usr_first_name as String).trim().isEmpty()) {
                validationErrors << 'usr_first_name must be a non-empty string'
            }
        }

        // Validate last name if provided
        if (userData.containsKey('usr_last_name')) {
            if (!userData.usr_last_name || !(userData.usr_last_name instanceof String) || (userData.usr_last_name as String).trim().isEmpty()) {
                validationErrors << 'usr_last_name must be a non-empty string'
            }
        }

        // Validate usr_is_admin if provided (this is the key fix for the reported issue)
        if (userData.containsKey('usr_is_admin')) {
            if (userData.usr_is_admin == null || !(userData.usr_is_admin instanceof Boolean)) {
                validationErrors << 'usr_is_admin must be a boolean value (true or false)'
            }
        }

        // Validate usr_active if provided
        if (userData.containsKey('usr_active')) {
            if (userData.usr_active == null || !(userData.usr_active instanceof Boolean)) {
                validationErrors << 'usr_active must be a boolean value (true or false)'
            }
        }

        // Validate usr_code if provided
        if (userData.containsKey('usr_code')) {
            if (!userData.usr_code || !(userData.usr_code instanceof String) || (userData.usr_code as String).trim().isEmpty()) {
                validationErrors << 'usr_code must be a non-empty string'
            }
        }

        // Validate usr_email if provided
        if (userData.containsKey('usr_email')) {
            if (!userData.usr_email || !(userData.usr_email instanceof String) || (userData.usr_email as String).trim().isEmpty()) {
                validationErrors << 'usr_email must be a non-empty string'
            }
        }

        if (validationErrors) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Validation failed: ${validationErrors.join(', ')}"]).toString()).build()
        }

        if (userRepository.findUserById(userId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        def updatedUser = userRepository.updateUser(userId, userData)

        // Ensure audit fields are included in the response
        def userMap = updatedUser as Map
        def userResponse = [
            usr_id: userMap.usr_id,
            usr_code: userMap.usr_code,
            usr_first_name: userMap.usr_first_name,
            usr_last_name: userMap.usr_last_name,
            usr_email: userMap.usr_email,
            usr_is_admin: userMap.usr_is_admin,
            usr_active: userMap.usr_active,
            rls_id: userMap.rls_id,
            teams: userMap.teams,
            // Audit fields
            created_at: userMap.created_at,
            updated_at: userMap.updated_at,
            created_by: userMap.created_by,
            updated_by: userMap.updated_by
        ]

        return Response.ok(new JsonBuilder(userResponse).toString()).build()
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
            
            // Use the role code directly from the database
            def roleCode = userMap.role_code ?: 'NORMAL' // Default to NORMAL if no role

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
