package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import groovy.transform.Field
import umig.service.StatusService
import umig.service.UserService

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import org.apache.log4j.LogManager
import org.apache.log4j.Logger

@BaseScript CustomEndpointDelegate delegate

@Field
final StatusService statusService = new StatusService()

@Field
final UserService userService = new UserService()

@Field
final Logger log = LogManager.getLogger(getClass())

/**
 * REST API for centralized status management - TD-003
 * Provides cached status information for different entity types
 */
status(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, HttpServletRequest request ->
    try {
        // Get current user for logging
        def userContext = userService.getCurrentUserContext()
        def userId = userContext.userId

        log.info("StatusApi: User '${userId}' accessing status endpoint")

        // Get entity type parameter (optional - if not provided, return all)
        def entityType = queryParams.getFirst("entityType") as String

        if (entityType) {
            // Validate entity type
            def availableTypes = statusService.getAvailableEntityTypes()
            if (!availableTypes.contains(entityType)) {
                log.warn("StatusApi: Invalid entity type '${entityType}' requested")

                return Response.status(400)
                    .entity(new JsonBuilder([
                        error: "Invalid entity type",
                        message: "Entity type '${entityType}' is not supported",
                        validTypes: availableTypes.toList(),
                        action: "Please use one of the valid entity types"
                    ]).toString())
                    .header("Content-Type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .build()
            }

            // Get statuses for specific entity type with caching
            def statuses = statusService.getStatusesByType(entityType)
            def dropdownOptions = statusService.getDropdownOptions(entityType)

            def result = [
                entityType: entityType,
                statuses: statuses,
                dropdownOptions: dropdownOptions,
                count: statuses.size()
            ]

            log.info("StatusApi: Returning ${statuses.size()} statuses for entity type '${entityType}'")

            // Build response with caching headers
            return Response.ok(new JsonBuilder(result).toString())
                .header("Content-Type", "application/json")
                .header("Cache-Control", "public, max-age=300") // 5 minute client cache
                .header("Access-Control-Allow-Origin", "*")
                .build()

        } else {
            // Return all statuses grouped by entity type
            def allStatuses = statusService.getAllStatuses()
            def groupedStatuses = [:] as Map<String, List>

            // Group by entity type
            allStatuses.each { Map status ->
                def type = status.type as String
                if (!groupedStatuses.containsKey(type)) {
                    groupedStatuses[type] = []
                }
                groupedStatuses[type] << status
            }

            def result = [
                statusesByType: groupedStatuses,
                entityTypes: statusService.getAvailableEntityTypes().toList(),
                totalCount: allStatuses.size(),
                cacheStatistics: statusService.getCacheStatistics()
            ]

            log.info("StatusApi: Returning all ${allStatuses.size()} statuses grouped by entity type")

            return Response.ok(new JsonBuilder(result).toString())
                .header("Content-Type", "application/json")
                .header("Cache-Control", "public, max-age=300")
                .header("Access-Control-Allow-Origin", "*")
                .build()
        }

    } catch (Exception e) {
        log.error("StatusApi: Error retrieving statuses", e)

        return Response.status(500)
            .entity(new JsonBuilder([
                error: "Internal server error",
                message: "Failed to retrieve status data",
                action: "Please try again or contact support"
            ]).toString())
            .header("Content-Type", "application/json")
            .build()
    }
}

/**
 * POST /status/refresh - Clear cache and refresh status data (admin only)
 */
statusRefresh(httpMethod: "POST", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, HttpServletRequest request ->
    try {
        // Get current user for logging
        def userContext = userService.getCurrentUserContext()
        def userId = userContext.userId

        log.info("StatusApi: Admin user '${userId}' refreshing status cache")

        // Get cache statistics before clearing
        def beforeStats = statusService.getCacheStatistics()

        // Clear the cache
        statusService.clearCache()

        // Pre-warm the cache for critical entity types
        statusService.prewarmCache()

        // Get cache statistics after pre-warming
        def afterStats = statusService.getCacheStatistics()

        def result = [
            success: true,
            message: "Status cache refreshed successfully",
            statistics: [
                before: beforeStats,
                after: afterStats
            ],
            timestamp: new Date().format("yyyy-MM-dd HH:mm:ss")
        ]

        log.info("StatusApi: Cache refreshed - cleared ${beforeStats.totalEntries} entries, pre-warmed ${afterStats.activeEntries} entries")

        return Response.ok(new JsonBuilder(result).toString())
            .header("Content-Type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .build()

    } catch (Exception e) {
        log.error("StatusApi: Error refreshing cache", e)

        return Response.status(500)
            .entity(new JsonBuilder([
                error: "Internal server error",
                message: "Failed to refresh status cache",
                action: "Please try again or contact support"
            ]).toString())
            .header("Content-Type", "application/json")
            .build()
    }
}