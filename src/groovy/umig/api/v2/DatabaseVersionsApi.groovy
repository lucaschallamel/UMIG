package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.DatabaseVersionRepository
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import javax.ws.rs.BadRequestException
import javax.ws.rs.InternalServerErrorException
import javax.ws.rs.NotFoundException
import org.postgresql.util.PSQLException

@BaseScript CustomEndpointDelegate delegate

/**
 * DatabaseVersionsApi - REST API for Database Version Management
 * US-088-B: Database Version Manager Liquibase Integration
 *
 * Purpose: Provides REST endpoints for querying Liquibase database version information
 * Replaces hardcoded data sources with dynamic Liquibase table queries
 *
 * Endpoints:
 * - GET /databaseVersions - Retrieve all database migrations
 * - GET /databaseVersions/{id} - Retrieve specific migration
 * - GET /databaseVersions/statistics - Migration statistics and health
 * - POST /databaseVersions/{id}/validate - Validate migration checksum
 *
 * Implements UMIG patterns:
 * - Authentication with groups: ["confluence-users"] (ADR-042)
 * - Explicit type casting for all parameters (ADR-043)
 * - SQL state mappings for error handling (ADR-039)
 * - Repository pattern for data access layer separation
 * - Lazy loading to avoid class loading issues
 */

/**
 * GET /databaseVersions - Retrieve all database migrations from Liquibase
 *
 * Query Parameters:
 * - includeStatistics (optional): Include summary statistics in response
 *
 * Response: JSON array of migration objects with enriched metadata
 * Security: Requires confluence-users group membership
 */
databaseVersions(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->

    try {
        // Lazy load repository to avoid class loading issues
        def getRepository = { -> new DatabaseVersionRepository() }

        // Parse query parameters with explicit casting (ADR-043)
        def includeStatistics = Boolean.parseBoolean((queryParams.getFirst("includeStatistics") ?: "false") as String)

        // Retrieve all migrations
        def repository = getRepository()
        def migrations = repository.getAllMigrations()

        def responseData = [
            migrations: migrations,
            count: (migrations as List).size(),
            timestamp: new Date().toInstant().toString()
        ]

        // Add statistics if requested
        if (includeStatistics) {
            def statistics = repository.getMigrationStatistics()
            responseData.statistics = statistics
        }

        return Response.ok(new JsonBuilder(responseData).toString()).build()

    } catch (InternalServerErrorException e) {
        // Database connectivity or Liquibase table issues
        def errorResponse = [
            error: "Database version retrieval failed",
            message: e.getMessage(),
            timestamp: new Date().toInstant().toString(),
            fallbackMessage: "Liquibase table may not be initialized or accessible"
        ]
        return Response.status(500).entity(new JsonBuilder(errorResponse).toString()).build()

    } catch (Exception e) {
        // Unexpected errors
        def errorResponse = [
            error: "Unexpected error retrieving database versions",
            message: e.getMessage(),
            timestamp: new Date().toInstant().toString()
        ]
        return Response.status(500).entity(new JsonBuilder(errorResponse).toString()).build()
    }
}

/**
 * GET /databaseVersions/{id} - Retrieve specific migration by changeset ID
 *
 * Path Parameters:
 * - id: Liquibase changeset identifier (e.g., "001_baseline.sql::author::changelog")
 *
 * Response: JSON object with migration details or 404 if not found
 * Security: Requires confluence-users group membership
 */
databaseVersions(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->

    // Extract changeset ID from path using UMIG pattern
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    if (!extraPath || pathParts.isEmpty()) {
        def errorResponse = [
            error: "Invalid request path",
            message: "Changeset ID is required",
            timestamp: new Date().toInstant().toString()
        ]
        return Response.status(400).entity(new JsonBuilder(errorResponse).toString()).build()
    }

    // Get the changeset ID from the first path part
    def changesetId = pathParts[0]

    try {
        // Input validation with explicit casting (ADR-043)
        def sanitizedId = changesetId as String
        if (!sanitizedId || sanitizedId.trim().isEmpty()) {
            def errorResponse = [
                error: "Invalid changeset ID",
                message: "Changeset ID cannot be empty",
                timestamp: new Date().toInstant().toString()
            ]
            return Response.status(400).entity(new JsonBuilder(errorResponse).toString()).build()
        }

        // Lazy load repository
        def getRepository = { -> new DatabaseVersionRepository() }
        def repository = getRepository()

        def migration = repository.getMigrationById(sanitizedId)

        if (!migration) {
            def errorResponse = [
                error: "Migration not found",
                message: "No migration found with ID: ${sanitizedId}",
                changesetId: sanitizedId,
                timestamp: new Date().toInstant().toString()
            ]
            return Response.status(404).entity(new JsonBuilder(errorResponse).toString()).build()
        }

        def responseData = [
            migration: migration,
            timestamp: new Date().toInstant().toString()
        ]

        return Response.ok(new JsonBuilder(responseData).toString()).build()

    } catch (BadRequestException e) {
        // Input validation errors
        def errorResponse = [
            error: "Invalid request",
            message: e.getMessage(),
            changesetId: changesetId,
            timestamp: new Date().toInstant().toString()
        ]
        return Response.status(400).entity(new JsonBuilder(errorResponse).toString()).build()

    } catch (InternalServerErrorException e) {
        // Database errors
        def errorResponse = [
            error: "Database error",
            message: e.getMessage(),
            changesetId: changesetId,
            timestamp: new Date().toInstant().toString()
        ]
        return Response.status(500).entity(new JsonBuilder(errorResponse).toString()).build()

    } catch (Exception e) {
        // Unexpected errors
        def errorResponse = [
            error: "Unexpected error",
            message: e.getMessage(),
            changesetId: changesetId,
            timestamp: new Date().toInstant().toString()
        ]
        return Response.status(500).entity(new JsonBuilder(errorResponse).toString()).build()
    }
}

/**
 * GET /databaseVersions/statistics - Retrieve migration statistics and health information
 *
 * Response: JSON object with migration counts, execution breakdown, and timestamps
 * Security: Requires confluence-users group membership
 */
databaseVersionsStatistics(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->

    try {
        // Lazy load repository to avoid class loading issues
        def getRepository = { -> new DatabaseVersionRepository() }
        def repository = getRepository()

        def statistics = repository.getMigrationStatistics()

        def responseData = [
            statistics: statistics,
            timestamp: new Date().toInstant().toString(),
            healthStatus: determineHealthStatus(statistics as Map)
        ]

        return Response.ok(new JsonBuilder(responseData).toString()).build()

    } catch (InternalServerErrorException e) {
        // Database connectivity issues
        def errorResponse = [
            error: "Statistics retrieval failed",
            message: e.getMessage(),
            timestamp: new Date().toInstant().toString(),
            healthStatus: "UNHEALTHY"
        ]
        return Response.status(500).entity(new JsonBuilder(errorResponse).toString()).build()

    } catch (Exception e) {
        // Unexpected errors
        def errorResponse = [
            error: "Unexpected error retrieving statistics",
            message: e.getMessage(),
            timestamp: new Date().toInstant().toString(),
            healthStatus: "UNKNOWN"
        ]
        return Response.status(500).entity(new JsonBuilder(errorResponse).toString()).build()
    }
}

/**
 * POST /databaseVersions/{id}/validate - Validate migration checksum
 *
 * Path Parameters:
 * - id: Changeset identifier to validate
 *
 * Response: JSON object with validation result and checksum information
 * Security: Requires confluence-users group membership
 */
databaseVersionsValidate(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->

    // Extract changeset ID from path using UMIG pattern
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    if (!extraPath || pathParts.size() < 2 || pathParts[1] != 'validate') {
        def errorResponse = [
            error: "Invalid request path",
            message: "Changeset ID is required for validation",
            timestamp: new Date().toInstant().toString()
        ]
        return Response.status(400).entity(new JsonBuilder(errorResponse).toString()).build()
    }

    // Get the changeset ID from the first path part (before /validate)
    def changesetId = pathParts[0]

    try {
        // Input validation with explicit casting (ADR-043)
        def sanitizedId = changesetId as String
        if (!sanitizedId || sanitizedId.trim().isEmpty()) {
            def errorResponse = [
                error: "Invalid changeset ID",
                message: "Changeset ID cannot be empty for validation",
                timestamp: new Date().toInstant().toString()
            ]
            return Response.status(400).entity(new JsonBuilder(errorResponse).toString()).build()
        }

        // Lazy load repository
        def getRepository = { -> new DatabaseVersionRepository() }
        def repository = getRepository()

        def validationResult = repository.validateMigrationChecksum(sanitizedId)

        def responseData = [
            validation: validationResult,
            timestamp: new Date().toInstant().toString()
        ]

        // Return appropriate status based on validation result with explicit casting (ADR-043)
        def validationMap = validationResult as Map
        def httpStatus = (validationMap?.valid as Boolean) ? 200 : 404
        return Response.status(httpStatus).entity(new JsonBuilder(responseData).toString()).build()

    } catch (BadRequestException e) {
        // Input validation errors
        def errorResponse = [
            error: "Validation request invalid",
            message: e.getMessage(),
            changesetId: changesetId,
            timestamp: new Date().toInstant().toString()
        ]
        return Response.status(400).entity(new JsonBuilder(errorResponse).toString()).build()

    } catch (InternalServerErrorException e) {
        // Database errors
        def errorResponse = [
            error: "Validation failed",
            message: e.getMessage(),
            changesetId: changesetId,
            timestamp: new Date().toInstant().toString()
        ]
        return Response.status(500).entity(new JsonBuilder(errorResponse).toString()).build()

    } catch (Exception e) {
        // Unexpected errors
        def errorResponse = [
            error: "Unexpected validation error",
            message: e.getMessage(),
            changesetId: changesetId,
            timestamp: new Date().toInstant().toString()
        ]
        return Response.status(500).entity(new JsonBuilder(errorResponse).toString()).build()
    }
}

/**
 * Helper method to determine health status based on migration statistics
 *
 * @param statistics Map containing migration statistics
 * @return String health status indicator
 */
private String determineHealthStatus(Map statistics) {
    if (!statistics) return "UNKNOWN"

    // Explicit casting for all property access (ADR-043)
    def totalMigrations = (statistics?.totalMigrations as Integer) ?: 0
    def executionTypes = (statistics?.executionTypes as List) ?: []

    // Basic health checks
    if (totalMigrations == 0) {
        return "UNHEALTHY" // No migrations found
    }

    if (totalMigrations < 10) {
        return "DEGRADED" // Very few migrations
    }

    // Check execution type distribution with explicit casting
    def executedCount = 0
    executionTypes?.each { item ->
        def itemMap = item as Map
        if ((itemMap?.type as String) == 'EXECUTED') {
            executedCount = (itemMap?.count as Integer) ?: 0
        }
    }
    def successRate = totalMigrations > 0 ? (executedCount / totalMigrations) * 100 : 0

    if (successRate >= 95) {
        return "HEALTHY"
    } else if (successRate >= 80) {
        return "DEGRADED"
    } else {
        return "UNHEALTHY"
    }
}