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

        // Input validation and sanitization
        def environmentParam = queryParams.getFirst("environment") as String
        if (environmentParam) {
            // Validate environment parameter format
            if (!isValidEnvironmentCode(environmentParam)) {
                return Response.status(400)
                    .entity([
                        error: "Invalid environment parameter",
                        parameter: environmentParam,
                        message: "Environment code must be 3-4 alphanumeric characters (e.g., DEV, EV1, PROD)",
                        validFormats: ["DEV", "EV1", "EV2", "PROD", "TST"]
                    ])
                    .build()
            }
            
            // Sanitize environment parameter to prevent injection
            environmentParam = sanitizeEnvironmentParameter(environmentParam)
        }
        
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

        // Validate URL configuration for security before sending to client
        def validatedConfig = validateUrlConfiguration(urlConfig)
        if (!validatedConfig) {
            return Response.status(500)
                .entity([
                    error: "Configuration validation failed",
                    message: "URL configuration contains invalid or unsafe values"
                ])
                .build()
        }

        // Get URL template for client-side parameter injection
        def urlTemplate = UrlConstructionService.buildStepViewUrlTemplate(environmentParam)
        
        // Build comprehensive response with validated data
        def response = [
            baseUrl: validatedConfig.baseUrl as String,
            spaceKey: validatedConfig.spaceKey as String,
            pageId: validatedConfig.pageId as String,
            pageTitle: validatedConfig.pageTitle as String,
            environment: validatedConfig.environment as String,
            isActive: validatedConfig.isActive as Boolean,
            urlTemplate: urlTemplate
        ]

        println "GET /urlConfiguration - Retrieved and validated configuration for ${validatedConfig.environment}: ${validatedConfig.baseUrl}"
        
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

/**
 * SECURITY & VALIDATION HELPER METHODS
 */

/**
 * Validates environment code format for security
 * Prevents SQL injection and ensures valid environment codes
 */
private static boolean isValidEnvironmentCode(String envCode) {
    if (!envCode) return false
    
    // Must be 2-5 characters, alphanumeric only
    if (envCode.length() < 2 || envCode.length() > 5) return false
    
    // Only allow alphanumeric characters (prevent injection)
    if (!envCode.matches(/^[A-Za-z0-9]+$/)) return false
    
    // Optional: Validate against known environment patterns
    def validPatterns = [
        ~/(?i)^DEV$/,           // Development
        ~/(?i)^TST$/,           // Test  
        ~/(?i)^EV[1-9]$/,       // Environment 1-9 (EV1, EV2, etc.)
        ~/(?i)^PROD$/,          // Production
        ~/(?i)^STG$/,           // Staging
        ~/(?i)^PRE$/,           // Pre-production
        ~/(?i)^UAT$/,           // User Acceptance Testing
        ~/(?i)^LOCAL$/          // Local development
    ]
    
    return validPatterns.any { pattern -> envCode ==~ pattern }
}

/**
 * Sanitizes environment parameter to prevent injection attacks
 */
private static String sanitizeEnvironmentParameter(String envCode) {
    if (!envCode) return null
    
    // Remove any potentially dangerous characters
    def sanitized = envCode.replaceAll(/[^A-Za-z0-9]/, '')
    
    // Convert to uppercase for consistency
    sanitized = sanitized.toUpperCase()
    
    // Limit length to prevent buffer attacks
    if (sanitized.length() > 10) {
        sanitized = sanitized.substring(0, 10)
    }
    
    return sanitized
}

/**
 * Validates URL configuration for security before returning to client
 */
private static Map validateUrlConfiguration(Map urlConfig) {
    if (!urlConfig) return null
    
    // Validate each URL component for security
    def validatedConfig = [:]
    
    // Validate base URL
    def baseUrl = urlConfig.baseUrl as String
    if (baseUrl && isValidHttpUrl(baseUrl)) {
        validatedConfig.baseUrl = baseUrl
    }
    
    // Validate space key (alphanumeric, hyphens, underscores only)
    def spaceKey = urlConfig.spaceKey as String
    if (spaceKey && spaceKey.matches(/^[A-Za-z0-9_-]+$/)) {
        validatedConfig.spaceKey = spaceKey
    }
    
    // Validate page ID (numeric only)
    def pageId = urlConfig.pageId as String
    if (pageId && pageId.matches(/^\d+$/)) {
        validatedConfig.pageId = pageId
    }
    
    // Validate page title (remove potential XSS characters)
    def pageTitle = urlConfig.pageTitle as String
    if (pageTitle) {
        validatedConfig.pageTitle = sanitizePageTitle(pageTitle)
    }
    
    // Copy safe fields
    validatedConfig.environment = urlConfig.environment
    validatedConfig.isActive = urlConfig.isActive
    
    return validatedConfig
}

/**
 * Validates HTTP URL format and security
 */
private static boolean isValidHttpUrl(String url) {
    if (!url) return false
    
    try {
        def urlObj = new URL(url)
        
        // Only allow HTTP and HTTPS protocols
        if (!['http', 'https'].contains(urlObj.protocol?.toLowerCase())) {
            return false
        }
        
        // Validate hostname is not suspicious
        def host = urlObj.host
        if (!host || host.contains('..')) {
            return false
        }
        
        // Allow localhost and 127.0.0.1 for development
        if (host.toLowerCase() in ['localhost', '127.0.0.1']) {
            return true
        }
        
        // Prevent suspicious ports
        def port = urlObj.port
        if (port != -1 && (port < 80 || port > 65535)) {
            return false
        }
        
        return true
    } catch (MalformedURLException e) {
        return false
    }
}

/**
 * Sanitizes page title to prevent XSS attacks
 */
private static String sanitizePageTitle(String title) {
    if (!title) return null
    
    // Remove potential XSS characters but keep URL encoding
    return title.replaceAll(/[<>'"&]/, '')
                .trim()
}