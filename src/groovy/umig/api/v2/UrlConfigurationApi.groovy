package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import umig.utils.UrlConstructionService

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import javax.ws.rs.core.UriInfo

@BaseScript CustomEndpointDelegate delegate

/**
 * GET /urlConfiguration - Get URL configuration for client-side URL construction
 * 
 * This endpoint exposes URL configuration from UrlConstructionService to client-side JavaScript,
 * enabling proper URL construction based on environment settings rather than hardcoded values.
 * 
 * Query Parameters:
 * - environment (optional): Specific environment code (DEV, EV1, EV2, PROD). Defaults to auto-detection.
 * 
 * Returns:
 * {
 *   "baseUrl": "http://localhost:8090",
 *   "spaceKey": "UMIG", 
 *   "pageId": "1048581",
 *   "pageTitle": "UMIG+-+Step+View",
 *   "environment": "DEV",
 *   "isActive": true,
 *   "urlTemplate": "http://localhost:8090/spaces/UMIG/pages/1048581/UMIG%2B-%2BStep%2BView"
 * }
 */
urlConfiguration(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, UriInfo uriInfo ->
    try {
        println "GET /urlConfiguration - Retrieving URL configuration"

        // Extract environment parameter if provided
        def environmentParam = queryParams.getFirst("environment") as String
        
        // Get URL configuration from UrlConstructionService
        def urlConfig = UrlConstructionService.getUrlConfigurationForEnvironment(environmentParam)
        
        if (!urlConfig) {
            def detectedEnv = environmentParam ?: 'auto-detected'
            return Response.status(404)
                .entity([
                    error: "No URL configuration found",
                    environment: detectedEnv,
                    message: "URL construction service could not find configuration for environment: ${detectedEnv}"
                ])
                .build()
        }

        // Get URL template for client-side parameter injection
        def urlTemplate = UrlConstructionService.buildStepViewUrlTemplate(environmentParam)
        
        // Build comprehensive response
        def response = [
            baseUrl: urlConfig.baseUrl as String,
            spaceKey: urlConfig.spaceKey as String,
            pageId: urlConfig.pageId as String,
            pageTitle: urlConfig.pageTitle as String,
            environment: urlConfig.environment as String,
            isActive: urlConfig.isActive as Boolean,
            urlTemplate: urlTemplate
        ]

        println "GET /urlConfiguration - Retrieved configuration for ${urlConfig.environment}: ${urlConfig.baseUrl}"
        
        return Response.ok(response).build()
        
    } catch (Exception e) {
        println "ERROR in GET /urlConfiguration: ${e.message}"
        e.printStackTrace()
        return Response.status(500)
            .entity([
                error: "Internal server error: ${e.message}",
                service: "UrlConstructionService",
                suggestion: "Check system_configuration_scf table entries and UrlConstructionService configuration"
            ])
            .build()
    }
}

/**
 * GET /urlConfiguration/health - Health check for URL configuration service
 * 
 * Returns service health status and basic diagnostics.
 */
urlConfigurationHealth(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, UriInfo uriInfo ->
    try {
        println "GET /urlConfiguration/health - Checking URL configuration service health"
        
        def healthCheck = UrlConstructionService.healthCheck()
        
        def statusCode = healthCheck.status == 'healthy' ? 200 : 
                        healthCheck.status == 'degraded' ? 202 : 500
        
        return Response.status(statusCode).entity(healthCheck).build()
        
    } catch (Exception e) {
        println "ERROR in GET /urlConfiguration/health: ${e.message}"
        e.printStackTrace()
        return Response.status(500)
            .entity([
                status: 'error',
                error: e.message,
                service: 'UrlConstructionService'
            ])
            .build()
    }
}

/**
 * POST /urlConfiguration/clearCache - Clear URL configuration cache
 * 
 * Forces the UrlConstructionService to refresh its configuration cache
 * from the database. Useful after configuration updates.
 */
urlConfigurationClearCache(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        println "POST /urlConfiguration/clearCache - Clearing URL configuration cache"
        
        UrlConstructionService.clearCache()
        
        def response = [
            message: "URL configuration cache cleared successfully",
            timestamp: new Date().toString(),
            nextCacheRefresh: "On next request"
        ]
        
        println "POST /urlConfiguration/clearCache - Cache cleared successfully"
        
        return Response.ok(response).build()
        
    } catch (Exception e) {
        println "ERROR in POST /urlConfiguration/clearCache: ${e.message}"
        e.printStackTrace()
        return Response.status(500)
            .entity([
                error: "Failed to clear cache: ${e.message}",
                service: "UrlConstructionService"
            ])
            .build()
    }
}

/**
 * GET /urlConfiguration/debug - Debug information for URL configuration
 * 
 * Returns detailed debug information including cached configurations
 * and environment detection results. Useful for troubleshooting.
 */
urlConfigurationDebug(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, UriInfo uriInfo ->
    try {
        println "GET /urlConfiguration/debug - Retrieving debug information"
        
        def healthCheck = UrlConstructionService.healthCheck()
        def cachedConfigs = UrlConstructionService.getCachedConfigurations()
        
        def debugInfo = [
            serviceHealth: healthCheck,
            cachedConfigurations: cachedConfigs,
            environmentDetection: [
                currentDetectedEnv: UrlConstructionService.getUrlConfigurationForEnvironment()?.environment,
                systemProperties: [
                    'umig.environment': System.getProperty('umig.environment'),
                    'confluence.hostname': System.getProperty('confluence.hostname'),
                    'confluence.port': System.getProperty('confluence.port')
                ]
            ],
            timestamp: new Date().toString()
        ]
        
        return Response.ok(debugInfo).build()
        
    } catch (Exception e) {
        println "ERROR in GET /urlConfiguration/debug: ${e.message}"
        e.printStackTrace()
        return Response.status(500)
            .entity([
                error: "Debug information retrieval failed: ${e.message}",
                service: "UrlConstructionService"
            ])
            .build()
    }
}