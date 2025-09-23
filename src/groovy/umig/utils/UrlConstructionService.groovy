package umig.utils

import groovy.sql.Sql
import java.util.UUID
import java.util.regex.Pattern
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import umig.utils.DatabaseUtil

/**
 * UrlConstructionService - Constructs secure URLs for UMIG step views
 * 
 * Builds clickable links for email notifications based on system configuration
 * and step context. Handles environment-specific URL construction with security
 * validation and parameter sanitization.
 * 
 * URL Format: {baseURL}/pages/viewpage.action?pageId={pageId}&mig={migrationCode}&ite={iterationCode}&stepid={stepCode}
 * 
 * @author UMIG Project Team
 * @since 2025-08-21
 */
class UrlConstructionService {
    
    // URL validation patterns for security
    private static final Pattern URL_PATTERN = Pattern.compile(
        '^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$'
    )
    private static final Pattern PARAM_PATTERN = Pattern.compile(
        '^[a-zA-Z0-9._\\-\\s]+$'  // Allow spaces for iteration names (\\s for all whitespace)
    )
    // More permissive pattern for page titles (allows spaces and common punctuation)
    private static final Pattern PAGE_TITLE_PATTERN = Pattern.compile(
        '^[a-zA-Z0-9\\s._-]+$'
    )
    
    // Cache for configuration data to avoid repeated database queries
    private static Map<String, Map> configurationCache = [:]
    private static long cacheLastUpdated = 0
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes
    
    /**
     * Constructs a secure stepView URL for email notifications
     * 
     * @param stepInstanceId UUID of the step instance
     * @param migrationCode Migration code (e.g., "TORONTO")  
     * @param iterationCode Iteration code (e.g., "run1")
     * @param environmentCode Environment code (e.g., "EV1", "PROD") - defaults to auto-detection
     * @return Fully constructed and validated URL, or null if construction fails
     */
    static String buildStepViewUrl(UUID stepInstanceId, String migrationCode, String iterationCode, String environmentCode = null) {
        try {
            // Auto-detect environment if not provided
            if (!environmentCode) {
                environmentCode = detectEnvironment()
            }
            
            // Get system configuration for the environment
            def config = getSystemConfiguration(environmentCode)
            if (!config) {
                println "UrlConstructionService: No configuration found for environment: ${environmentCode}"
                return null
            }
            
            // Get step details for URL construction
            def stepDetails = getStepDetails(stepInstanceId)
            if (!stepDetails) {
                println "UrlConstructionService: No step details found for stepInstanceId: ${stepInstanceId}"
                return null
            }
            
            // Validate and sanitize parameters
            def sanitizedParams = sanitizeUrlParameters([
                mig: migrationCode,
                ite: iterationCode, 
                stepid: stepDetails.step_code  // Fixed: use step_code (lowercase) from SQL query
            ])
            
            if (!sanitizedParams) {
                println "UrlConstructionService: Parameter validation failed"
                return null
            }
            
            // Construct the URL
            def baseUrl = sanitizeBaseUrl(config.scf_base_url as String)
            def spaceKey = sanitizeParameter(config.scf_space_key as String)
            def pageId = sanitizeParameter(config.scf_page_id as String)
            def pageTitle = sanitizePageTitle(config.scf_page_title as String)
            
            if (!baseUrl || !spaceKey || !pageId || !pageTitle) {
                println "UrlConstructionService: Configuration validation failed for environment: ${environmentCode}"
                return null
            }
            
            // Build the URL
            def urlBuilder = new StringBuilder()
            urlBuilder.append(baseUrl)
            if (!baseUrl.endsWith('/')) {
                urlBuilder.append('/')
            }
            urlBuilder.append("pages/viewpage.action")
            
            // Add query parameters including pageId
            def allParams = [pageId: pageId] + sanitizedParams
            def queryParams = allParams.collect { key, value ->
                "${key}=${URLEncoder.encode(value as String, StandardCharsets.UTF_8.toString())}"
            }.join('&')
            
            urlBuilder.append("?${queryParams}")
            
            def constructedUrl = urlBuilder.toString()
            
            // Final validation
            if (!isValidUrl(constructedUrl)) {
                println "UrlConstructionService: Final URL validation failed: ${constructedUrl}"
                return null
            }
            
            return constructedUrl
            
        } catch (Exception e) {
            println "UrlConstructionService: Error constructing URL for step ${stepInstanceId}: ${e.message}"
            e.printStackTrace()
            return null
        }
    }

    /**
     * Constructs a secure iteration view URL for email notifications
     *
     * @param iterationId UUID of the iteration
     * @param migrationCode Migration code (e.g., "TORONTO")
     * @param iterationCode Iteration code (e.g., "run1")
     * @param environmentCode Environment code (e.g., "EV1", "PROD") - defaults to auto-detection
     * @return Fully constructed and validated URL, or null if construction fails
     */
    static String buildIterationViewUrl(UUID iterationId, String migrationCode, String iterationCode, String environmentCode = null) {
        try {
            // Auto-detect environment if not provided
            if (!environmentCode) {
                environmentCode = detectEnvironment()
            }

            // Get system configuration for the environment
            def config = getSystemConfiguration(environmentCode)
            if (!config) {
                println "UrlConstructionService: No configuration found for environment: ${environmentCode}"
                return null
            }

            // Get iteration details for URL construction
            def iterationDetails = getIterationDetails(iterationId)
            if (!iterationDetails) {
                println "UrlConstructionService: No iteration details found for iterationId: ${iterationId}"
                return null
            }

            // Validate and sanitize parameters
            def sanitizedParams = sanitizeUrlParameters([
                mig: migrationCode,
                ite: iterationCode,
                view: 'iteration'  // Add view parameter to distinguish from step view
            ])

            if (!sanitizedParams) {
                println "UrlConstructionService: Parameter validation failed for iteration URL"
                return null
            }

            // Construct the URL
            def baseUrl = sanitizeBaseUrl(config.scf_base_url as String)
            def spaceKey = sanitizeParameter(config.scf_space_key as String)
            def pageId = sanitizeParameter(config.scf_page_id as String)
            def pageTitle = sanitizePageTitle(config.scf_page_title as String)

            if (!baseUrl || !spaceKey || !pageId || !pageTitle) {
                println "UrlConstructionService: Configuration validation failed for environment: ${environmentCode}"
                return null
            }

            // Build the URL for iteration view
            def urlBuilder = new StringBuilder()
            urlBuilder.append(baseUrl)
            if (!baseUrl.endsWith('/')) {
                urlBuilder.append('/')
            }
            urlBuilder.append("pages/viewpage.action")

            // Add query parameters including pageId and iteration-specific parameters
            def allParams = [pageId: pageId] + sanitizedParams
            def queryParams = allParams.collect { key, value ->
                "${key}=${URLEncoder.encode(value as String, StandardCharsets.UTF_8.toString())}"
            }.join('&')

            urlBuilder.append("?${queryParams}")

            def constructedUrl = urlBuilder.toString()

            // Final validation
            if (!isValidUrl(constructedUrl)) {
                println "UrlConstructionService: Final URL validation failed: ${constructedUrl}"
                return null
            }

            return constructedUrl

        } catch (Exception e) {
            println "UrlConstructionService: Error constructing iteration URL for ${iterationId}: ${e.message}"
            e.printStackTrace()
            return null
        }
    }

    /**
     * Auto-detect current environment based on system properties or defaults
     */
    private static String detectEnvironment() {
        // Check system property first
        def env = System.getProperty('umig.environment')
        if (env) {
            return env.toUpperCase()
        }
        
        // Check if we're in local development (common patterns)
        def hostname = System.getProperty('confluence.hostname', 'localhost')
        def port = System.getProperty('confluence.port', '8090')
        
        if (hostname.contains('localhost') || hostname.contains('127.0.0.1') || port == '8090') {
            return 'DEV'
        }
        
        // Check for environment indicators in hostname
        if (hostname.contains('dev')) return 'DEV'
        if (hostname.contains('test') || hostname.contains('ev1')) return 'EV1'
        if (hostname.contains('stage') || hostname.contains('ev2')) return 'EV2'
        if (hostname.contains('prod')) return 'PROD'
        
        // Default to DEV for safety
        return 'DEV'
    }
    
    /**
     * Retrieves system configuration for the specified environment with caching
     * Package-private for testing access
     */
    static Map getSystemConfiguration(String environmentCode) {
        def now = System.currentTimeMillis()
        
        // Check cache first
        if (configurationCache[environmentCode] && (now - cacheLastUpdated) < CACHE_DURATION_MS) {
            return configurationCache[environmentCode]
        }
        
        try {
            DatabaseUtil.withSql { sql ->
                // Get all MACRO_LOCATION configurations for this environment
                def configs = sql.rows('''
                    SELECT scf.scf_key, scf.scf_value
                    FROM system_configuration_scf scf
                    INNER JOIN environments_env e ON scf.env_id = e.env_id
                    WHERE e.env_code = :envCode 
                      AND scf.scf_is_active = true
                      AND scf.scf_category = 'MACRO_LOCATION'
                      AND scf.scf_key IN ('stepview.confluence.base.url', 
                                         'stepview.confluence.space.key',
                                         'stepview.confluence.page.id', 
                                         'stepview.confluence.page.title')
                ''', [envCode: environmentCode])
                
                if (configs && configs.size() > 0) {
                    // Convert key-value pairs to expected structure
                    def config = [
                        scf_environment_code: environmentCode,
                        scf_is_active: true
                    ]
                    
                    configs.each { row ->
                        def configMap = row as Map
                        switch (configMap.scf_key as String) {
                            case 'stepview.confluence.base.url':
                                config.scf_base_url = configMap.scf_value as String
                                break
                            case 'stepview.confluence.space.key':
                                config.scf_space_key = configMap.scf_value as String
                                break
                            case 'stepview.confluence.page.id':
                                config.scf_page_id = configMap.scf_value as String
                                break
                            case 'stepview.confluence.page.title':
                                config.scf_page_title = configMap.scf_value as String
                                break
                        }
                    }
                    
                    // Only cache if we have all required configuration values
                    if (config.scf_base_url && config.scf_space_key && config.scf_page_id && config.scf_page_title) {
                        configurationCache[environmentCode] = config
                        cacheLastUpdated = now
                        return config
                    } else {
                        println "UrlConstructionService: Incomplete configuration for ${environmentCode}. Found configs: ${configs}"
                        return null
                    }
                } else {
                    println "UrlConstructionService: No MACRO_LOCATION configurations found for ${environmentCode}"
                    return null
                }
            }
        } catch (Exception e) {
            println "UrlConstructionService: Error retrieving configuration for ${environmentCode}: ${e.message}"
            e.printStackTrace()
            return null
        }
    }
    
    /**
     * Retrieves step details needed for URL construction
     */
    private static Map getStepDetails(UUID stepInstanceId) {
        try {
            DatabaseUtil.withSql { sql ->
                return sql.firstRow('''
                    SELECT sti.sti_id, stm.stt_code, stm.stm_number, sti.sti_name,
                           CONCAT(stm.stt_code, '-', LPAD(stm.stm_number::text, 3, '0')) as step_code
                    FROM steps_instance_sti sti
                    INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    WHERE sti.sti_id = :stepId
                ''', [stepId: stepInstanceId])
            }
        } catch (Exception e) {
            println "UrlConstructionService: Error retrieving step details for ${stepInstanceId}: ${e.message}"
            return null
        }
    }

    /**
     * Retrieves iteration details for URL construction
     */
    private static Map getIterationDetails(UUID iterationId) {
        try {
            DatabaseUtil.withSql { sql ->
                return sql.firstRow('''
                    SELECT ite.ite_id, ite.ite_name,
                           mig.mig_name
                    FROM iterations_ite ite
                    INNER JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    WHERE ite.ite_id = :iterationId
                ''', [iterationId: iterationId])
            }
        } catch (Exception e) {
            println "UrlConstructionService: Error retrieving iteration details for ${iterationId}: ${e.message}"
            return null
        }
    }

    /**
     * Validates and sanitizes URL parameters for security
     */
    private static Map sanitizeUrlParameters(Map params) {
        def sanitized = [:]
        
        params.each { key, value ->
            if (!key || !value) {
                return null // Fail fast on null/empty values
            }
            
            def sanitizedKey = sanitizeParameter(key.toString())
            def sanitizedValue = sanitizeParameter(value.toString())
            
            if (!sanitizedKey || !sanitizedValue) {
                return null // Fail fast on invalid parameters
            }
            
            sanitized[sanitizedKey] = sanitizedValue
        }
        
        return sanitized.isEmpty() ? null : sanitized
    }
    
    /**
     * Sanitizes a single parameter value
     */
    private static String sanitizeParameter(String param) {
        if (!param) return null
        
        def trimmed = param.trim()
        if (trimmed.isEmpty()) return null
        
        // Allow alphanumeric, dots, underscores, hyphens
        if (!PARAM_PATTERN.matcher(trimmed).matches()) {
            println "UrlConstructionService: Parameter validation failed for: ${trimmed}"
            return null
        }
        
        return trimmed
    }
    
    /**
     * Sanitizes page title value (allows spaces and common punctuation)
     */
    private static String sanitizePageTitle(String pageTitle) {
        if (!pageTitle) return null
        
        def trimmed = pageTitle.trim()
        if (trimmed.isEmpty()) return null
        
        // Allow alphanumeric, spaces, dots, underscores, hyphens
        if (!PAGE_TITLE_PATTERN.matcher(trimmed).matches()) {
            println "UrlConstructionService: Page title validation failed for: ${trimmed}"
            return null
        }
        
        return trimmed
    }
    
    /**
     * Sanitizes and validates base URL
     */
    private static String sanitizeBaseUrl(String url) {
        if (!url) return null
        
        def trimmed = url.trim()
        if (trimmed.isEmpty()) return null
        
        // Remove trailing slash for consistency
        if (trimmed.endsWith('/')) {
            trimmed = trimmed.substring(0, trimmed.length() - 1)
        }
        
        if (!URL_PATTERN.matcher(trimmed).matches()) {
            println "UrlConstructionService: Base URL validation failed for: ${trimmed}"
            return null
        }
        
        return trimmed
    }
    
    /**
     * Validates final constructed URL
     */
    private static boolean isValidUrl(String url) {
        if (!url) return false
        
        try {
            // Basic pattern validation
            if (!URL_PATTERN.matcher(url).matches()) {
                return false
            }
            
            // Additional URL validation
            def urlObj = new URL(url)
            
            // Check protocol
            if (!['http', 'https'].contains(urlObj.protocol)) {
                return false
            }
            
            // Check host is not empty
            if (!urlObj.host || urlObj.host.trim().isEmpty()) {
                return false
            }
            
            return true
            
        } catch (Exception e) {
            println "UrlConstructionService: URL validation error: ${e.message}"
            return false
        }
    }
    
    /**
     * Clears configuration cache (useful for testing or configuration updates)
     */
    static void clearCache() {
        configurationCache.clear()
        cacheLastUpdated = 0
    }
    
    /**
     * Gets cached configuration for debugging/monitoring
     */
    static Map getCachedConfigurations() {
        return new HashMap(configurationCache)
    }
    
    /**
     * Constructs a stepView URL template for dynamic parameter injection
     * Used by macros that need to build URLs client-side with user selections
     * 
     * @param environmentCode Environment code (e.g., "EV1", "PROD") - defaults to auto-detection
     * @return Base URL template without step-specific parameters, or null if construction fails
     */
    static String buildStepViewUrlTemplate(String environmentCode = null) {
        try {
            // Auto-detect environment if not provided
            if (!environmentCode) {
                environmentCode = detectEnvironment()
            }
            
            // Get system configuration for the environment
            def config = getSystemConfiguration(environmentCode)
            if (!config) {
                println "UrlConstructionService: No configuration found for environment: ${environmentCode}"
                return null
            }
            
            // Validate and sanitize configuration components
            def baseUrl = sanitizeBaseUrl(config.scf_base_url as String)
            def spaceKey = sanitizeParameter(config.scf_space_key as String)
            def pageId = sanitizeParameter(config.scf_page_id as String)
            def pageTitle = sanitizePageTitle(config.scf_page_title as String)
            
            if (!baseUrl || !spaceKey || !pageId || !pageTitle) {
                println "UrlConstructionService: Configuration validation failed for environment: ${environmentCode}"
                return null
            }
            
            // Build the template URL without query parameters
            def urlBuilder = new StringBuilder()
            urlBuilder.append(baseUrl)
            if (!baseUrl.endsWith('/')) {
                urlBuilder.append('/')
            }
            urlBuilder.append("pages/viewpage.action?pageId=${pageId}")
            
            def templateUrl = urlBuilder.toString()
            
            // Final validation
            if (!isValidUrl("${templateUrl}&test=value")) {
                println "UrlConstructionService: Template URL validation failed: ${templateUrl}"
                return null
            }
            
            return templateUrl
            
        } catch (Exception e) {
            println "UrlConstructionService: Error constructing URL template for environment ${environmentCode}: ${e.message}"
            e.printStackTrace()
            return null
        }
    }
    
    /**
     * Gets the base URL configuration for a specific environment
     * Used by macros to expose configuration to client-side JavaScript
     * 
     * @param environmentCode Environment code (e.g., "EV1", "PROD") - defaults to auto-detection
     * @return Map containing URL configuration components, or null if not available
     */
    static Map getUrlConfigurationForEnvironment(String environmentCode = null) {
        try {
            // Auto-detect environment if not provided
            if (!environmentCode) {
                environmentCode = detectEnvironment()
            }
            
            // Get system configuration for the environment
            def config = getSystemConfiguration(environmentCode)
            if (!config) {
                println "UrlConstructionService: No configuration found for environment: ${environmentCode}"
                return null
            }
            
            return [
                baseUrl: config.scf_base_url as String,
                spaceKey: config.scf_space_key as String,
                pageId: config.scf_page_id as String,
                pageTitle: config.scf_page_title as String,
                environment: environmentCode,
                isActive: config.scf_is_active as Boolean
            ]
            
        } catch (Exception e) {
            println "UrlConstructionService: Error retrieving URL configuration for environment ${environmentCode}: ${e.message}"
            e.printStackTrace()
            return null
        }
    }

    /**
     * Health check method for monitoring
     */
    static Map healthCheck() {
        try {
            def env = detectEnvironment()
            def config = getSystemConfiguration(env)
            
            return [
                status: config ? 'healthy' : 'degraded',
                environment: env,
                configurationFound: config != null,
                cacheSize: configurationCache.size(),
                cacheAge: System.currentTimeMillis() - cacheLastUpdated
            ]
        } catch (Exception e) {
            return [
                status: 'error',
                error: e.message,
                environment: null,
                configurationFound: false
            ]
        }
    }
    
    /**
     * Public method to get current environment detection result for debugging
     */
    static String getCurrentEnvironment() {
        return detectEnvironment()
    }
}