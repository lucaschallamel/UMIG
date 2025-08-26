package umig.utils

import groovy.sql.Sql
import java.util.UUID
import java.util.regex.Pattern
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import umig.repository.SystemConfigurationRepository

/**
 * UrlConstructionService - Constructs secure URLs for UMIG step views
 * 
 * Builds clickable links for email notifications based on system configuration
 * and step context. Handles environment-specific URL construction with security
 * validation and parameter sanitization.
 * 
 * URL Format: {baseURL}/spaces/{spaceKey}/pages/{pageId}/{pageTitle}?mig={migrationCode}&ite={iterationCode}&stepid={stepCode}
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
        '^[a-zA-Z0-9._-]+$'
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
                stepid: stepDetails.stepCode
            ])
            
            if (!sanitizedParams) {
                println "UrlConstructionService: Parameter validation failed"
                return null
            }
            
            // Construct the URL
            def baseUrl = sanitizeBaseUrl(config.scf_base_url as String)
            def spaceKey = sanitizeParameter(config.scf_space_key as String)
            def pageId = sanitizeParameter(config.scf_page_id as String)
            def pageTitle = sanitizeParameter(config.scf_page_title as String)
            
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
            urlBuilder.append("spaces/${spaceKey}/pages/${pageId}/${URLEncoder.encode(pageTitle, StandardCharsets.UTF_8.toString())}")
            
            // Add query parameters
            def queryParams = sanitizedParams.collect { key, value ->
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
     */
    private static Map getSystemConfiguration(String environmentCode) {
        def now = System.currentTimeMillis()
        
        // Check cache first
        if (configurationCache[environmentCode] && (now - cacheLastUpdated) < CACHE_DURATION_MS) {
            return configurationCache[environmentCode]
        }
        
        try {
            // Get environment ID from environment code
            def envId = getEnvironmentIdByCode(environmentCode)
            if (!envId) {
                println "UrlConstructionService: No environment found for code: ${environmentCode}"
                return getDefaultConfiguration(environmentCode)
            }
            
            // Use SystemConfigurationRepository to fetch configuration
            def repository = new SystemConfigurationRepository()
            def confluenceConfig = repository.findConfluenceConfigurationForEnvironment(envId)
            
            if (!confluenceConfig || !confluenceConfig.configurations) {
                println "UrlConstructionService: No configuration found in database for environment: ${environmentCode}, using defaults"
                return getDefaultConfiguration(environmentCode)
            }
            
            // Build configuration map from database values
            def configs = confluenceConfig.configurations as Map
            def config = [
                scf_environment_code: environmentCode,
                scf_base_url: getConfigValue(configs, 'stepview.confluence.base.url', 'http://localhost:8090'),
                scf_space_key: getConfigValue(configs, 'stepview.confluence.space.key', 'UMIG'),
                scf_page_id: getConfigValue(configs, 'stepview.confluence.page.id', '1114120'),
                scf_page_title: getConfigValue(configs, 'stepview.confluence.page.title', 'UMIG - Step View'),
                scf_is_active: true
            ]
            
            configurationCache[environmentCode] = config
            cacheLastUpdated = now
            return config
            
        } catch (Exception e) {
            println "UrlConstructionService: Error retrieving configuration for ${environmentCode}: ${e.message}"
            e.printStackTrace()
            return getDefaultConfiguration(environmentCode)
        }
    }
    
    /**
     * Gets environment ID by environment code from database
     */
    private static Integer getEnvironmentIdByCode(String environmentCode) {
        try {
            DatabaseUtil.withSql { sql ->
                def result = sql.firstRow('''
                    SELECT env_id 
                    FROM environments_env 
                    WHERE UPPER(env_code) = UPPER(:envCode)
                ''', [envCode: environmentCode])
                
                return result ? (result.env_id as Integer) : null
            }
        } catch (Exception e) {
            println "UrlConstructionService: Error retrieving environment ID for ${environmentCode}: ${e.message}"
            return null
        }
    }
    
    /**
     * Helper method to safely extract configuration values with defaults
     */
    private static String getConfigValue(Map configs, String key, String defaultValue) {
        try {
            def configEntry = configs[key]
            if (configEntry && configEntry instanceof Map) {
                def value = (configEntry as Map).value
                return value ? value.toString().trim() : defaultValue
            }
            return defaultValue
        } catch (Exception e) {
            println "UrlConstructionService: Error extracting config value for key ${key}: ${e.message}"
            return defaultValue
        }
    }
    
    /**
     * Provides default configuration for URL construction
     */
    private static Map getDefaultConfiguration(String environmentCode) {
        return [
            scf_environment_code: environmentCode,
            scf_base_url: 'http://localhost:8090',
            scf_space_key: 'UMIG',
            scf_page_id: '1114120',
            scf_page_title: 'UMIG - Step View',
            scf_is_active: true
        ]
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
            def pageTitle = sanitizeParameter(config.scf_page_title as String)
            
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
            urlBuilder.append("spaces/${spaceKey}/pages/${pageId}/${URLEncoder.encode(pageTitle, StandardCharsets.UTF_8.toString())}")
            
            def templateUrl = urlBuilder.toString()
            
            // Final validation
            if (!isValidUrl("${templateUrl}?test=value")) {
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
}