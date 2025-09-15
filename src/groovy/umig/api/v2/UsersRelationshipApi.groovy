package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.UserRepository
import umig.repository.TeamRepository
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import groovy.json.JsonException
import java.sql.SQLException
import java.util.UUID
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

/**
 * Enhanced Users Relationship API for Bidirectional Management
 * 
 * Provides comprehensive bidirectional user-team relationship management endpoints
 * supporting the Users Entity Migration (US-082-C) with enterprise-grade
 * relationship integrity, cascade delete protection, and role management.
 * 
 * Features:
 * - Bidirectional relationship queries (getTeamsForUser/getUsersForTeam)
 * - Role transition validation and management
 * - Relationship integrity validation
 * - Cascade delete protection
 * - Soft delete with restoration
 * - Orphaned member cleanup
 * - Performance optimization for large datasets
 * - Comprehensive audit logging
 * - User activity tracking
 * - Batch operations
 * 
 * @version 1.0.0
 * @created 2025-01-13 (US-082-C Implementation)
 * @performance Target: <200ms for relationship queries
 * @integrity 100% bidirectional consistency
 * @safety Zero data loss from cascade operations
 * @audit 90-day retention requirement
 */

@BaseScript CustomEndpointDelegate delegate

final UserRepository userRepository = new UserRepository()
final TeamRepository teamRepository = new TeamRepository()

/**
 * Enhanced users endpoint for bidirectional relationship management
 * Provides user-centric operations with team relationships
 */
users(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // Route: GET /users/{userId}/teams?includeArchived={boolean}
    if (pathParts.size() == 2 && pathParts[1] == 'teams') {
        def userId
        try {
            userId = pathParts[0].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid User ID format: '${pathParts[0]}'"]).toString()).build()
        }

        // Validate user exists
        def user = userRepository.findUserById(userId)
        if (!user) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        try {
            // Parse query parameters
            def includeArchived = (queryParams.getFirst('includeArchived') as String)?.toLowerCase() == 'true'

            def teams = userRepository.getTeamsForUser(userId, includeArchived)

            // Explicit Map casting for user properties (ADR-031, ADR-043)
            def userMap = user as Map

            return Response.ok(new JsonBuilder([
                userId: userId,
                userName: "${userMap.usr_first_name} ${userMap.usr_last_name}".toString(),
                userEmail: userMap.usr_email,
                includeArchived: includeArchived,
                teams: teams,
                totalTeams: (teams as List).size(),
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
            ]).toString()).build()

        } catch (Exception e) {
            log.error("Unexpected error retrieving teams for user ${userId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Route: GET /users/{userId}/teams/{teamId}/validate
    if (pathParts.size() == 4 && pathParts[1] == 'teams' && pathParts[3] == 'validate') {
        def userId
        def teamId
        try {
            userId = pathParts[0].toInteger()
            teamId = pathParts[2].toInteger() // users/{userId}/teams/{teamId}/validate
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid User ID or Team ID format."]).toString()).build()
        }

        try {
            def validationResult = userRepository.validateRelationshipIntegrity(userId, teamId)
            
            return Response.ok(new JsonBuilder([
                userId: userId,
                teamId: teamId,
                validation: validationResult,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
            ]).toString()).build()

        } catch (Exception e) {
            log.error("Unexpected error validating relationship for user ${userId} and team ${teamId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Route: GET /users/{userId}/delete-protection
    if (pathParts.size() == 2 && pathParts[1] == 'delete-protection') {
        def userId
        try {
            userId = pathParts[0].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid User ID format: '${pathParts[0]}'"]).toString()).build()
        }

        // Validate user exists
        def user = userRepository.findUserById(userId)
        if (!user) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        try {
            def protectionResult = userRepository.protectCascadeDelete(userId)

            // Explicit Map casting for user properties (ADR-031, ADR-043)
            def userMap = user as Map

            return Response.ok(new JsonBuilder([
                userId: userId,
                userName: "${userMap.usr_first_name} ${userMap.usr_last_name}".toString(),
                protection: protectionResult,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
            ]).toString()).build()

        } catch (Exception e) {
            log.error("Unexpected error checking cascade delete protection for user ${userId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Route: GET /users/{userId}/activity?days={number}
    if (pathParts.size() == 2 && pathParts[1] == 'activity') {
        def userId
        try {
            userId = pathParts[0].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid User ID format: '${pathParts[0]}'"]).toString()).build()
        }

        // Validate user exists
        def user = userRepository.findUserById(userId)
        if (!user) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        try {
            // Parse days parameter
            def days = 30 // default
            if (queryParams.getFirst('days')) {
                try {
                    days = Integer.parseInt(queryParams.getFirst('days') as String)
                    if (days < 1 || days > 365) days = 30 // restrict range
                } catch (NumberFormatException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid days parameter. Must be between 1 and 365."]).toString()).build()
                }
            }
            
            def activities = userRepository.getUserActivity(userId, days)

            // Explicit Map casting for user properties (ADR-031, ADR-043)
            def userMap = user as Map

            return Response.ok(new JsonBuilder([
                userId: userId,
                userName: "${userMap.usr_first_name} ${userMap.usr_last_name}".toString(),
                days: days,
                activities: activities,
                totalActivities: (activities as List).size(),
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
            ]).toString()).build()

        } catch (Exception e) {
            log.error("Unexpected error retrieving activity for user ${userId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Route: GET /users/relationship-statistics
    if (pathParts.size() == 1 && pathParts[0] == 'relationship-statistics') {
        try {
            def statistics = userRepository.getUserRelationshipStatistics()
            
            return Response.ok(new JsonBuilder([
                statistics: statistics,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
            ]).toString()).build()

        } catch (Exception e) {
            log.error("Unexpected error retrieving user relationship statistics.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Fallback for invalid GET paths
    return Response.status(Response.Status.BAD_REQUEST)
        .entity(new JsonBuilder([error: "Invalid path for GET request on users relationship endpoint."]).toString()).build()
}

/**
 * PUT endpoints for administrative user management operations
 * [SFT] Admin-only access for destructive operations
 */
users(httpMethod: "PUT", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // Route: PUT /users/{userId}/soft-delete
    if (pathParts.size() == 2 && pathParts[1] == 'soft-delete') {
        def userId
        try {
            userId = pathParts[0].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid User ID format: '${pathParts[0]}'"]).toString()).build()
        }

        // Validate user exists
        def user = userRepository.findUserById(userId)
        if (!user) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        try {
            // Parse request body for user context
            Map userContext = [:]
            if (body) {
                try {
                    userContext = new JsonSlurper().parseText(body) as Map
                } catch (JsonException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid JSON format in request body."]).toString()).build()
                }
            }

            def result = userRepository.softDeleteUser(userId, userContext)

            if ((result as Map).success) {
                return Response.ok(new JsonBuilder([
                    userId: userId,
                    result: result,
                    message: "User soft deleted successfully",
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: (result as Map).error ?: "Failed to soft delete user"]).toString()).build()
            }

        } catch (Exception e) {
            log.error("Unexpected error soft deleting user ${userId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Route: PUT /users/{userId}/restore
    if (pathParts.size() == 2 && pathParts[1] == 'restore') {
        def userId
        try {
            userId = pathParts[0].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid User ID format: '${pathParts[0]}'"]).toString()).build()
        }

        // Validate user exists (including inactive users)
        def user = userRepository.findUserById(userId)
        if (!user) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        try {
            // Parse request body for user context
            Map userContext = [:]
            if (body) {
                try {
                    userContext = new JsonSlurper().parseText(body) as Map
                } catch (JsonException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid JSON format in request body."]).toString()).build()
                }
            }

            def result = userRepository.restoreUser(userId, userContext)

            if ((result as Map).success) {
                return Response.ok(new JsonBuilder([
                    userId: userId,
                    result: result,
                    message: "User restored successfully",
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: (result as Map).error ?: "Failed to restore user"]).toString()).build()
            }

        } catch (Exception e) {
            log.error("Unexpected error restoring user ${userId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Route: PUT /users/{userId}/role
    if (pathParts.size() == 2 && pathParts[1] == 'role') {
        def userId
        try {
            userId = pathParts[0].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid User ID format: '${pathParts[0]}'"]).toString()).build()
        }

        // Validate user exists
        def user = userRepository.findUserById(userId)
        if (!user) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        try {
            // Parse request body for role change
            Map requestData = [:]
            if (body) {
                try {
                    requestData = new JsonSlurper().parseText(body) as Map
                } catch (JsonException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid JSON format in request body."]).toString()).build()
                }
            }

            def newRoleId = requestData.roleId
            if (!newRoleId) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request must contain 'roleId' field."]).toString()).build()
            }

            try {
                newRoleId = newRoleId as Integer
            } catch (Exception e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Role ID must be a valid integer."]).toString()).build()
            }

            def userContext = requestData.userContext ?: [:]
            def result = userRepository.changeUserRole(userId, newRoleId as Integer, userContext as Map)

            if ((result as Map).success) {
                return Response.ok(new JsonBuilder([
                    userId: userId,
                    result: result,
                    message: "User role changed successfully",
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: (result as Map).error ?: "Failed to change user role"]).toString()).build()
            }

        } catch (Exception e) {
            log.error("Unexpected error changing role for user ${userId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Route: PUT /users/{userId}/role/validate
    if (pathParts.size() == 3 && pathParts[1] == 'role' && pathParts[2] == 'validate') {
        def userId
        try {
            userId = pathParts[0].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid User ID format: '${pathParts[0]}'"]).toString()).build()
        }

        // Validate user exists
        def user = userRepository.findUserById(userId)
        if (!user) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }

        try {
            // Parse request body for role transition
            Map requestData = [:]
            if (body) {
                try {
                    requestData = new JsonSlurper().parseText(body) as Map
                } catch (JsonException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid JSON format in request body."]).toString()).build()
                }
            }

            def fromRoleId = requestData.fromRoleId as Integer
            def toRoleId = requestData.toRoleId as Integer

            if (!toRoleId) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request must contain 'toRoleId' field."]).toString()).build()
            }

            def validation = userRepository.validateRoleTransition(userId, fromRoleId, toRoleId)

            return Response.ok(new JsonBuilder([
                userId: userId,
                roleTransition: [
                    fromRoleId: fromRoleId,
                    toRoleId: toRoleId
                ],
                validation: validation,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
            ]).toString()).build()

        } catch (Exception e) {
            log.error("Unexpected error validating role transition for user ${userId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Fallback for invalid PUT paths
    return Response.status(Response.Status.BAD_REQUEST)
        .entity(new JsonBuilder([error: "Invalid path for PUT request on users relationship endpoint."]).toString()).build()
}

/**
 * POST endpoints for administrative batch operations and cleanup
 * [SFT] Admin-only access for data modification operations  
 */
users(httpMethod: "POST", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // Route: POST /users/cleanup-orphaned-members
    if (pathParts.size() == 1 && pathParts[0] == 'cleanup-orphaned-members') {
        try {
            def cleanupResult = userRepository.cleanupOrphanedMembers()
            
            return Response.ok(new JsonBuilder([
                cleanup: cleanupResult,
                message: "Orphaned member cleanup completed",
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
            ]).toString()).build()

        } catch (Exception e) {
            log.error("Unexpected error during orphaned member cleanup.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    return Response.status(Response.Status.BAD_REQUEST)
        .entity(new JsonBuilder([error: "Invalid path for POST admin request on users relationship endpoint."]).toString()).build()
}

/**
 * POST endpoints for regular user validation operations
 * [SFT] User-level access for read-only validation operations
 */
users(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // Route: POST /users/batch-validate
    if (pathParts.size() == 1 && pathParts[0] == 'batch-validate') {
        try {
            // Parse request body for user IDs array
            Map requestData = [:]
            if (body) {
                try {
                    requestData = new JsonSlurper().parseText(body) as Map
                } catch (JsonException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid JSON format in request body."]).toString()).build()
                }
            }

            def userIds = requestData.userIds
            if (!userIds || !(userIds instanceof List)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request must contain 'userIds' array."]).toString()).build()
            }

            // Convert to integers and validate
            List<Integer> validUserIds = []
            try {
                userIds.each { id ->
                    validUserIds << (id as Integer)
                }
            } catch (Exception e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "All user IDs must be valid integers."]).toString()).build()
            }

            def batchResult = userRepository.batchValidateUsers(validUserIds)
            
            return Response.ok(new JsonBuilder([
                batchValidation: batchResult,
                message: "Batch user validation completed",
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
            ]).toString()).build()

        } catch (Exception e) {
            log.error("Unexpected error during batch user validation.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Route: POST /users/batch-validate-relationships
    if (pathParts.size() == 1 && pathParts[0] == 'batch-validate-relationships') {
        try {
            // Parse request body for relationships array
            Map requestData = [:]
            if (body) {
                try {
                    requestData = new JsonSlurper().parseText(body) as Map
                } catch (JsonException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid JSON format in request body."]).toString()).build()
                }
            }

            def relationships = requestData.relationships
            if (!relationships || !(relationships instanceof List)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request must contain 'relationships' array."]).toString()).build()
            }

            // Validate each relationship structure
            def validationResults = []
            relationships.each { rel ->
                Map relMap = rel as Map
                if (!relMap.userId || !relMap.teamId) {
                    validationResults << [
                        userId: relMap.userId,
                        teamId: relMap.teamId,
                        valid: false,
                        error: "Missing userId or teamId"
                    ]
                } else {
                    try {
                        def userId = relMap.userId as Integer
                        def teamId = relMap.teamId as Integer
                        def result = userRepository.validateRelationshipIntegrity(userId, teamId)
                        
                        validationResults << [
                            userId: userId,
                            teamId: teamId,
                            validation: result
                        ]
                    } catch (Exception e) {
                        validationResults << [
                            userId: relMap.userId,
                            teamId: relMap.teamId,
                            valid: false,
                            error: e.message
                        ]
                    }
                }
            }
            
            return Response.ok(new JsonBuilder([
                batchValidation: [
                    totalRelationships: (relationships as List).size(),
                    results: validationResults,
                    validCount: validationResults.count { it ->
                        def validationMap = it as Map
                        def validation = validationMap.validation as Map
                        return validation?.isValid == true
                    },
                    invalidCount: validationResults.count { it ->
                        def validationMap = it as Map
                        def validation = validationMap.validation as Map
                        def valid = validationMap.valid as Boolean
                        return validation?.isValid == false || valid == false
                    }
                ],
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
            ]).toString()).build()

        } catch (Exception e) {
            log.error("Unexpected error during batch relationship validation.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Fallback for invalid POST paths
    return Response.status(Response.Status.BAD_REQUEST)
        .entity(new JsonBuilder([error: "Invalid path for POST request on users relationship endpoint."]).toString()).build()
}