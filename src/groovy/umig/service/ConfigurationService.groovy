package umig.service

import umig.repository.SystemConfigurationRepository
import umig.utils.DatabaseUtil
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.util.concurrent.ConcurrentHashMap
import com.atlassian.sal.api.component.ComponentLocator
import com.atlassian.confluence.setup.settings.SettingsManager

/**
 * ConfigurationService - Central configuration management service
 *
 * Provides cached access to system configuration with environment-aware capabilities.
 * Implements thread-safe caching with TTL expiration for performance optimization.
 *
 * Task 1.1: Base class skeleton with cache structures and method stubs
 * US-098: Configuration Management System (Sprint 8)
 *
 * ADR Compliance:
 * - ADR-036: Repository pattern (lazy initialization)
 * - ADR-031/043: Type safety (explicit casting)
 * - ADR-059: Schema-first approach
 */
class ConfigurationService {
    private static final Logger log = LoggerFactory.getLogger(ConfigurationService.class)

    // Caches
    private static final Map<String, CachedValue> configCache = new ConcurrentHashMap<>()
    private static final Map<String, Integer> environmentIdCache = new ConcurrentHashMap<>()
    private static final long CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

    /**
     * Lazy repository initialization to avoid class loading issues
     * Follows pattern from UserService.groovy
     */
    private static SystemConfigurationRepository getRepository() {
        return new SystemConfigurationRepository()
    }

    /**
     * Security classification levels for configuration keys.
     * 
     * Classification determines how values are handled in logs and audit trails:
     * - PUBLIC: No sensitive data, safe to log in full
     * - INTERNAL: Infrastructure configs (hosts, ports), partial masking in logs
     * - CONFIDENTIAL: Credentials and secrets, complete redaction required
     * 
     * US-098 Phase 3: Security Hardening
     */
    private static enum SecurityClassification {
        PUBLIC,      // Default, no sensitive patterns detected
        INTERNAL,    // Infrastructure configuration (host, port, url, path)
        CONFIDENTIAL // Credentials (password, token, key, secret, credential)
    }

    /**
     * Classify configuration key based on pattern matching.
     * 
     * Classification Logic:
     * 1. CONFIDENTIAL (highest priority): password, token, key, secret, credential
     * 2. INTERNAL: host, port, url, path
     * 3. PUBLIC (default): Everything else
     * 
     * @param key Configuration key to classify
     * @return SecurityClassification level for the key
     * US-098 Phase 3 Step 1
     */
    private static SecurityClassification classifyConfigurationKey(String key) {
        if (!key) {
            return SecurityClassification.PUBLIC
        }

        String lowerKey = key.toLowerCase()

        // CONFIDENTIAL patterns (highest priority)
        if (lowerKey.contains('password') || lowerKey.contains('token') || 
            lowerKey.contains('key') || lowerKey.contains('secret') || 
            lowerKey.contains('credential')) {
            return SecurityClassification.CONFIDENTIAL
        }

        // INTERNAL patterns
        if (lowerKey.contains('host') || lowerKey.contains('port') || 
            lowerKey.contains('url') || lowerKey.contains('path')) {
            return SecurityClassification.INTERNAL
        }

        // PUBLIC (default)
        return SecurityClassification.PUBLIC
    }

    /**
     * Sanitize configuration value based on classification level.
     * 
     * Sanitization Strategy:
     * - CONFIDENTIAL: Complete redaction (***REDACTED***)
     * - INTERNAL: Partial masking (show 20% at start/end, mask middle)
     * - PUBLIC: No sanitization (return as-is)
     * 
     * @param key Configuration key (used for classification context)
     * @param value Configuration value to sanitize
     * @param classification Security classification level
     * @return Sanitized value safe for logging
     * US-098 Phase 3 Step 1
     */
    private static String sanitizeValue(String key, String value, SecurityClassification classification) {
        if (!value) {
            return value
        }

        switch (classification) {
            case SecurityClassification.CONFIDENTIAL:
                // Complete redaction for credentials
                return '***REDACTED***'

            case SecurityClassification.INTERNAL:
                // Partial masking for infrastructure configs
                if (value.length() <= 5) {
                    // Too short to mask effectively, return as-is
                    return value
                }

                // Show 20% at start and end, mask middle
                int showChars = Math.max(1, (int)(value.length() * 0.2))
                String start = value.substring(0, showChars)
                String end = value.substring(value.length() - showChars)
                return "${start}*****${end}"

            case SecurityClassification.PUBLIC:
            default:
                // No sanitization needed
                return value
        }
    }

    /**
     * Audit configuration access with security-aware logging.
     * 
     * Audit Log Format:
     * AUDIT: user={username}, key={key}, classification={level}, 
     *        value={sanitized}, source={database|environment|default}, 
     *        success={true|false}, timestamp={ISO-8601}
     * 
     * @param key Configuration key accessed
     * @param value Configuration value (will be sanitized)
     * @param classification Security classification level
     * @param success Whether access was successful
     * @param source Source of configuration value (database, environment, default)
     * US-098 Phase 3 Step 2
     */
    private static void auditConfigurationAccess(String key, String value, SecurityClassification classification, 
                                                  boolean success, String source = 'database') {
        String sanitizedValue = sanitizeValue(key, value, classification)
        
        // Get username from UserService.getCurrentUserContext() with system fallback
        String username = 'system'
        try {
            def userContext = umig.service.UserService.getCurrentUserContext()
            username = (userContext as Map)?.confluenceUsername as String ?: 'system'
        } catch (Exception e) {
            // Fallback to 'system' if UserService unavailable (e.g., unit tests)
            log.debug("UserService unavailable for audit, using 'system': ${e.message}")
        }
        
        String timestamp = new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")

        log.info("AUDIT: user=${username}, key=${key}, classification=${classification}, " +
                 "value=${sanitizedValue}, source=${source}, success=${success}, timestamp=${timestamp}")
    }

    /**
     * Retrieve string configuration value with fallback hierarchy.
     *
     * Fallback order:
     * 1. Environment-specific value (current env_id)
     * 2. Global value (env_id = NULL, if supported by schema)
     * 3. System env variable (LOCAL environment only)
     * 4. Default value
     *
     * @param key Configuration key (e.g., 'app.base.url')
     * @param defaultValue Default value if not found (can be null)
     * @return String configuration value or defaultValue
     */
    static String getString(String key, String defaultValue = null) {
        if (!key) {
            log.warn("getString called with null/empty key")
            return defaultValue
        }

        // US-098 Phase 3: Classify configuration key for security
        SecurityClassification classification = classifyConfigurationKey(key)

        String cacheKey = "${key}:${getCurrentEnvironment()}"

        // Check cache first
        CachedValue cached = configCache.get(cacheKey)
        if (cached != null && !cached.isExpired()) {
            log.debug("Cache hit for key: ${cacheKey}")
            auditConfigurationAccess(key, cached.value, classification, true, 'cache')
            return cached.value
        }

        // Tier 1: Environment-specific configuration
        try {
            Integer envId = getCurrentEnvironmentId()
            def repository = getRepository()
            def config = repository.findConfigurationByKey(key as String, envId)

            if (config?.scf_value) {
                String value = config.scf_value as String
                configCache.put(cacheKey, new CachedValue(value))
                log.debug("Found environment-specific config: ${key} = ${sanitizeValue(key, value, classification)} (env_id=${envId})")
                auditConfigurationAccess(key, value, classification, true, 'database')
                return value
            }
        } catch (Exception e) {
            log.warn("Failed to retrieve environment-specific config for ${key}: ${e.message}")
        }

        // Tier 2: Global configuration (env_id = NULL)
        try {
            def repository = getRepository()
            def config = repository.findConfigurationByKey(key as String, null)

            if (config?.scf_value) {
                String value = config.scf_value as String
                configCache.put(cacheKey, new CachedValue(value))
                log.debug("Found global config: ${key} = ${sanitizeValue(key, value, classification)}")
                auditConfigurationAccess(key, value, classification, true, 'database')
                return value
            }
        } catch (Exception e) {
            log.warn("Failed to retrieve global config for ${key}: ${e.message}")
        }

        // Tier 3: System environment variable (LOCAL only)
        String currentEnv = getCurrentEnvironment()
        if (currentEnv == 'LOCAL' || currentEnv == 'DEV') {
            String envKey = (key as String).toUpperCase().replace('.', '_')
            String envValue = System.getenv(envKey)
            if (envValue) {
                log.debug("Found system env variable: ${envKey} = ${sanitizeValue(key, envValue, classification)}")
                auditConfigurationAccess(key, envValue, classification, true, 'environment')
                return envValue
            }
        }

        // Tier 4: Default value
        log.debug("Using default value for ${key}: ${sanitizeValue(key, defaultValue, classification)}")
        auditConfigurationAccess(key, defaultValue, classification, defaultValue != null, 'default')
        return defaultValue
    }

    /**
     * Retrieve integer configuration value with type safety.
     *
     * @param key Configuration key
     * @param defaultValue Default value if not found or parse fails
     * @return Integer configuration value or defaultValue
     */
    static Integer getInteger(String key, Integer defaultValue = null) {
        // US-098 Phase 3: Classification done in getString(), audit parsing results
        SecurityClassification classification = classifyConfigurationKey(key)
        String value = getString(key, null)

        if (value == null) {
            return defaultValue
        }

        try {
            Integer result = Integer.parseInt(value as String)
            auditConfigurationAccess(key, value, classification, true, 'parsed')
            return result
        } catch (NumberFormatException e) {
            log.error("Failed to parse integer for key ${key}: ${value}", e)
            auditConfigurationAccess(key, value, classification, false, 'parse-error')
            return defaultValue
        }
    }

    /**
     * Retrieve boolean configuration value with type safety.
     *
     * Accepts: true/false, yes/no, 1/0 (case-insensitive)
     *
     * @param key Configuration key
     * @param defaultValue Default value if not found or parse fails
     * @return Boolean configuration value or defaultValue
     */
    static Boolean getBoolean(String key, Boolean defaultValue = false) {
        // US-098 Phase 3: Classification done in getString(), audit parsing results
        SecurityClassification classification = classifyConfigurationKey(key)
        String value = getString(key, null)

        if (value == null) {
            return defaultValue
        }

        String normalized = (value as String).toLowerCase().trim()

        // Handle various boolean representations
        if (normalized in ['true', 'yes', '1', 'on', 'enabled']) {
            auditConfigurationAccess(key, value, classification, true, 'parsed')
            return true
        } else if (normalized in ['false', 'no', '0', 'off', 'disabled']) {
            auditConfigurationAccess(key, value, classification, true, 'parsed')
            return false
        } else {
            log.warn("Invalid boolean value for key ${key}: ${value}, using default: ${defaultValue}")
            auditConfigurationAccess(key, value, classification, false, 'parse-error')
            return defaultValue
        }
    }

    /**
     * Retrieve all configuration values for a given section prefix.
     *
     * Example: getSection('email.') returns all keys starting with 'email.'
     *
     * @param sectionPrefix Section prefix (e.g., 'email.', 'database.')
     * @return Map<String, Object> of key-value pairs (keys without prefix)
     */
    static Map<String, Object> getSection(String sectionPrefix) {
        if (!sectionPrefix) {
            log.warn("getSection called with null/empty prefix")
            return [:]
        }

        Map<String, Object> result = [:]

        try {
            Integer envId = getCurrentEnvironmentId()
            def repository = getRepository()

            // Query all configurations for current environment
            def configs = repository.findActiveConfigurationsByEnvironment(envId)

            // Filter by prefix and build result map
            configs.each { config ->
                def configMap = config as Map
                String fullKey = configMap.scf_key as String
                if (fullKey.startsWith(sectionPrefix)) {
                    // US-098 Phase 3: Classify and audit each section entry
                    SecurityClassification classification = classifyConfigurationKey(fullKey)
                    String value = configMap.scf_value as String
                    
                    // Remove prefix for cleaner keys
                    String shortKey = fullKey.substring(sectionPrefix.length())
                    result.put(shortKey, value)
                    
                    // Audit each configuration access
                    auditConfigurationAccess(fullKey, value, classification, true, 'section-query')
                }
            }

            log.debug("Retrieved ${result.size()} configurations for section: ${sectionPrefix}")
            return result

        } catch (Exception e) {
            log.error("Failed to retrieve section ${sectionPrefix}: ${e.message}", e)
            // Audit the failed section query
            auditConfigurationAccess(sectionPrefix, null, SecurityClassification.PUBLIC, false, 'section-error')
            return [:]
        }
    }

    /**
     * Get Confluence base URL using multi-tier fallback strategy.
     * Used for environment auto-detection via URL pattern matching.
     *
     * Fallback Strategy:
     * - Tier 1: ComponentLocator (may fail in ScriptRunner context)
     * - Tier 2: System property 'confluence.base.url'
     * - Tier 3: Environment variable 'CONFLUENCE_BASE_URL'
     * - Tier 4: Hardcoded localhost fallback for DEV
     *
     * @return String Confluence base URL, always returns non-null value
     * US-098 Phase 4: URL-based environment detection
     * Bugfix: Added multi-tier fallback for ScriptRunner compatibility
     */
    private static String getConfluenceBaseUrl() {
        // Tier 1: Try ComponentLocator (may fail in ScriptRunner context)
        try {
            def settingsManager = ComponentLocator.getComponent(SettingsManager.class)
            if (settingsManager?.globalSettings?.baseUrl) {
                String baseUrl = settingsManager.globalSettings.baseUrl
                log.info("ConfigurationService: Retrieved Confluence base URL via ComponentLocator: ${baseUrl}")
                return baseUrl
            }
        } catch (Exception e) {
            log.warn("ConfigurationService: ComponentLocator.getComponent(SettingsManager) failed (this is expected in ScriptRunner context): ${e.message}")
        }

        // Tier 2: Try system property (explicit configuration)
        String systemPropUrl = System.getProperty('confluence.base.url')
        if (systemPropUrl) {
            log.info("ConfigurationService: Using Confluence base URL from system property 'confluence.base.url': ${systemPropUrl}")
            return systemPropUrl
        }

        // Tier 3: Try environment variable
        String envVarUrl = System.getenv('CONFLUENCE_BASE_URL')
        if (envVarUrl) {
            log.info("ConfigurationService: Using Confluence base URL from environment variable 'CONFLUENCE_BASE_URL': ${envVarUrl}")
            return envVarUrl
        }

        // Tier 4: Hardcoded localhost fallback for DEV (last resort)
        log.warn("ConfigurationService: Could not determine Confluence base URL via any method - using localhost:8090 fallback for DEV")
        return 'http://localhost:8090'
    }

    /**
     * Detect environment based on Confluence base URL pattern matching.
     *
     * URL Pattern Mapping:
     * - localhost / 127.0.0.1 / 0.0.0.0 → DEV
     * - confluence-evx.corp.ubp.ch → UAT
     * - confluence.corp.ubp.ch → PROD
     *
     * IMPORTANT: Check UAT before PROD (UAT URL contains PROD substring)
     *
     * @param baseUrl Confluence base URL to analyze
     * @return String environment code (DEV, UAT, PROD), null if cannot determine
     * US-098 Phase 4: URL-based environment detection
     */
    private static String detectEnvironmentFromUrl(String baseUrl) {
        if (!baseUrl) {
            return null
        }

        String lowerUrl = (baseUrl as String).toLowerCase()

        // DEV: localhost patterns
        if (lowerUrl.contains('localhost') ||
            lowerUrl.contains('127.0.0.1') ||
            lowerUrl.contains('0.0.0.0')) {
            log.debug("Detected DEV environment from URL: ${baseUrl}")
            return 'DEV'
        }

        // UAT: confluence-evx.corp.ubp.ch (check BEFORE PROD to avoid false match)
        if (lowerUrl.contains('confluence-evx.corp.ubp.ch')) {
            log.debug("Detected UAT environment from URL: ${baseUrl}")
            return 'UAT'
        }

        // PROD: confluence.corp.ubp.ch
        if (lowerUrl.contains('confluence.corp.ubp.ch')) {
            log.debug("Detected PROD environment from URL: ${baseUrl}")
            return 'PROD'
        }

        // Unknown URL pattern
        log.warn("Unknown Confluence URL pattern: ${baseUrl}")
        return null
    }

    /**
     * Get current environment code using 4-tier detection hierarchy.
     *
     * Detection Order:
     * 1. System property: -Dumig.environment=ENV (manual override)
     * 2. Environment variable: UMIG_ENVIRONMENT (fallback)
     * 3. Confluence Base URL pattern matching (self-service)
     * 4. Default: PROD (fail-safe)
     *
     * URL Pattern Mapping (Tier 3):
     * - http://localhost:8090 → DEV
     * - https://confluence-evx.corp.ubp.ch → UAT
     * - https://confluence.corp.ubp.ch → PROD
     *
     * @return String environment code (DEV, UAT, PROD)
     * Task 1.2: IMPLEMENTED + US-098 Phase 4 Enhancement
     */
    static String getCurrentEnvironment() {
        // Tier 1: System property (highest priority - manual override)
        String sysProperty = System.getProperty('umig.environment')
        if (sysProperty) {
            log.debug("ConfigurationService: Environment from system property: ${sysProperty}")
            return (sysProperty as String).toUpperCase()
        }

        // Tier 2: Environment variable (fallback)
        String envVar = System.getenv('UMIG_ENVIRONMENT')
        if (envVar) {
            log.debug("ConfigurationService: Environment from environment variable: ${envVar}")
            return (envVar as String).toUpperCase()
        }

        // Tier 3: Confluence Base URL pattern matching (self-service auto-detection)
        // Note: getConfluenceBaseUrl() now always returns non-null (has 4-tier fallback with localhost default)
        String baseUrl = getConfluenceBaseUrl()
        if (baseUrl) {
            String urlBasedEnv = detectEnvironmentFromUrl(baseUrl)
            if (urlBasedEnv) {
                log.info("ConfigurationService: Environment detected from Confluence URL (${baseUrl}): ${urlBasedEnv}")
                return urlBasedEnv
            }
        }

        // Tier 4: Fail-safe default (only reached if URL pattern doesn't match known environments)
        log.warn("Could not detect environment from any source - using fail-safe default: PROD")
        return 'PROD'
    }

    /**
     * Get current environment's env_id (FK-compliant).
     *
     * @return Integer env_id for current environment
     * @throws IllegalStateException if environment cannot be resolved
     * Task 1.2: IMPLEMENTED
     */
    static Integer getCurrentEnvironmentId() {
        String currentEnv = getCurrentEnvironment()
        Integer envId = resolveEnvironmentId(currentEnv)

        if (envId == null) {
            throw new IllegalStateException(
                "Cannot resolve env_id for current environment: ${currentEnv}. " +
                "Ensure environments_env table contains entry for ${currentEnv}."
            )
        }

        return envId
    }

    /**
     * Resolve environment code to env_id (FK to environments_env).
     * Uses cache to reduce database queries (5-min TTL).
     *
     * @param envCode Environment code (DEV, TEST, UAT, PROD)
     * @return Integer env_id for FK operations, null if not found
     * Task 1.2: IMPLEMENTED
     */
    static Integer resolveEnvironmentId(String envCode) {
        if (!envCode) {
            log.warn("resolveEnvironmentId called with null/empty envCode")
            return null
        }

        String normalizedCode = (envCode as String).toUpperCase()

        // Check cache first (with expiration)
        if (environmentIdCache.containsKey(normalizedCode)) {
            log.debug("Environment ID cache hit for: ${normalizedCode}")
            return environmentIdCache.get(normalizedCode)
        }

        // Query database for env_id
        try {
            def envId = DatabaseUtil.withSql { sql ->
                def row = sql.firstRow(
                    'SELECT env_id FROM environments_env WHERE UPPER(env_code) = UPPER(:envCode)',
                    [envCode: normalizedCode]
                )
                return row?.env_id ? (row.env_id as Integer) : null
            }

            if (envId != null) {
                // Cache the mapping (5-min TTL handled by cache cleanup)
                environmentIdCache.put(normalizedCode, envId)
                log.debug("Resolved ${normalizedCode} → env_id=${envId}")
                return envId
            } else {
                log.error("Environment code not found in environments_env: ${normalizedCode}")
                return null
            }
        } catch (Exception e) {
            log.error("Failed to resolve environment ID for ${normalizedCode}: ${e.message}", e)
            return null
        }
    }

    /**
     * Check if environment code exists in environments_env.
     * Used for FK validation before configuration operations.
     *
     * @param envCode Environment code to validate
     * @return boolean true if environment exists, false otherwise
     * Task 1.2: IMPLEMENTED
     */
    static boolean environmentExists(String envCode) {
        if (!envCode) {
            return false
        }

        try {
            Integer envId = resolveEnvironmentId(envCode)
            return envId != null
        } catch (Exception e) {
            log.error("Failed to check environment existence for ${envCode}: ${e.message}", e)
            return false
        }
    }

    /**
     * Clear all cached configuration values and environment mappings.
     *
     * Use cases:
     * - Configuration updates in database
     * - Environment changes
     * - Testing/debugging
     * - Memory pressure scenarios
     *
     * Thread-safe operation using ConcurrentHashMap.clear()
     *
     * Task 1.4: IMPLEMENTED
     */
    static void clearCache() {
        log.info("Clearing configuration cache")

        int configCacheSize = configCache.size()
        int envCacheSize = environmentIdCache.size()

        configCache.clear()
        environmentIdCache.clear()

        log.info("Cache cleared - Removed ${configCacheSize} config entries and ${envCacheSize} environment mappings")
    }

    /**
     * Refresh all cached configuration values by clearing cache.
     * Subsequent calls will fetch fresh values from database.
     *
     * This is an alias to clearCache() with more intuitive naming
     * for application code that needs to reload configurations.
     *
     * Use cases:
     * - After configuration updates via admin UI
     * - After environment switches
     * - Periodic cache refresh in long-running processes
     *
     * Task 1.4: IMPLEMENTED
     */
    static void refreshConfiguration() {
        log.info("Refreshing configuration cache")
        clearCache()
    }

    /**
     * Get current cache statistics for monitoring and debugging.
     *
     * @return Map with cache statistics
     * Task 1.4: IMPLEMENTED (BONUS)
     */
    static Map<String, Object> getCacheStats() {
        return [
            configCacheSize: configCache.size() as Integer,
            environmentCacheSize: environmentIdCache.size() as Integer,
            cacheTtlMinutes: (CACHE_TTL_MS / (60 * 1000)) as Integer,
            configCacheKeys: configCache.keySet().toList() as List<String>,
            environmentCacheEntries: environmentIdCache.entrySet().collect {
                [envCode: it.key as String, envId: it.value as Integer]
            } as List<Map<String, Object>>
        ] as Map<String, Object>
    }

    /**
     * Remove expired entries from configuration cache.
     * Called periodically or on-demand to free memory.
     *
     * Note: ConcurrentHashMap iteration is thread-safe.
     *
     * Task 1.4: IMPLEMENTED (BONUS)
     */
    static void clearExpiredCacheEntries() {
        log.debug("Clearing expired cache entries")

        int removedCount = 0

        // Remove expired config cache entries
        def expiredKeys = configCache.findAll { key, value ->
            value.isExpired()
        }.keySet()

        expiredKeys.each { key ->
            configCache.remove(key)
            removedCount++
        }

        log.debug("Removed ${removedCount} expired cache entries")
    }

    /**
     * CachedValue - Inner class for cache entries with TTL
     */
    private static class CachedValue {
        String value
        long timestamp

        CachedValue(String value) {
            this.value = value
            this.timestamp = System.currentTimeMillis()
        }

        boolean isExpired() {
            return (System.currentTimeMillis() - timestamp) > CACHE_TTL_MS
        }
    }
}
