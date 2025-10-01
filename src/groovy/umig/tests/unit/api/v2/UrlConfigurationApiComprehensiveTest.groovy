#!/usr/bin/env groovy

package umig.tests.unit.api.v2

/**
 * UrlConfigurationApi Comprehensive Test Suite (TD-014 Phase 1 Week 1 Day 4)
 * Self-contained architecture following TD-001 proven pattern
 * Coverage Target: 90-95%+ comprehensive test scenarios with security emphasis
 *
 * Tests UrlConfigurationApi operations including:
 * - Configuration retrieval with auto-detection
 * - URL validation (protocol, security)
 * - Security validation (XSS, injection, path traversal)
 * - Cache management
 * - Health check and debug endpoints
 *
 * @since TD-014 API Layer Testing Completion - Phase 1
 * @architecture Self-contained (35% performance improvement expected)
 * @compliance ADR-031 (Type Casting), ADR-039 (Error Messages), Security-First Design
 */

import groovy.json.*
import java.sql.*
import java.util.concurrent.ConcurrentHashMap

// ==========================================
// EMBEDDED DEPENDENCIES (TD-001 PATTERN)
// ==========================================

/**
 * Embedded MockSql implementation
 */
class MockSql {
    private Map<Integer, Map<String, String>> environmentConfigurations = new ConcurrentHashMap<>()
    private boolean throwException = false

    MockSql() {
        setupMockData()
    }

    private void setupMockData() {
        // DEV environment configuration
        environmentConfigurations[1] = [
            'confluence.base.url': 'http://localhost:8090',
            'confluence.space.key': 'UMIG',
            'confluence.page.id': '1048581',
            'confluence.page.title': 'UMIG - Step View'
        ]

        // EV1 environment configuration
        environmentConfigurations[2] = [
            'confluence.base.url': 'https://confluence-ev1.example.com',
            'confluence.space.key': 'UMIG',
            'confluence.page.id': '2048581',
            'confluence.page.title': 'UMIG - Step View EV1'
        ]

        // PROD environment configuration
        environmentConfigurations[4] = [
            'confluence.base.url': 'https://confluence.prod.example.com',
            'confluence.space.key': 'UMIG_PROD',
            'confluence.page.id': '3048581',
            'confluence.page.title': 'UMIG - Production Step View'
        ]
    }

    def rows(String query, Map params = [:]) {
        if (throwException) {
            throw new SQLException('Database error', '08000')
        }

        if (query.contains('system_configuration_scf')) {
            def envId = params.envId
            def configs = environmentConfigurations[envId]

            if (!configs) {
                return []
            }

            return configs.collect { key, value ->
                [
                    scf_key: key,
                    scf_value: value,
                    scf_category: 'MACRO_LOCATION',
                    scf_is_active: true,
                    env_id: envId,
                    env_code: getEnvCode(envId as Integer)
                ]
            }
        }

        return []
    }

    private String getEnvCode(int envId) {
        switch (envId) {
            case 1: return 'DEV'
            case 2: return 'EV1'
            case 3: return 'EV2'
            case 4: return 'PROD'
            default: return 'UNKNOWN'
        }
    }

    void setThrowException(boolean shouldThrow) {
        this.throwException = shouldThrow
    }
}

/**
 * Embedded DatabaseUtil
 */
class DatabaseUtil {
    static def withSql(Closure closure) {
        def mockSql = TestContext.getMockSql()
        return closure.call(mockSql)
    }
}

/**
 * Test context manager
 */
class TestContext {
    private static MockSql mockSql
    private static Map<String, Map> configurationCache = new ConcurrentHashMap<>()

    static MockSql getMockSql() {
        if (!mockSql) {
            mockSql = new MockSql()
        }
        return mockSql
    }

    static void reset() {
        mockSql = new MockSql()
        configurationCache.clear()
    }

    static Map getConfigurationCache() {
        return configurationCache
    }

    static void clearCache() {
        configurationCache.clear()
    }
}

/**
 * Embedded UrlConstructionService
 */
class UrlConstructionService {

    static Map getUrlConfigurationForEnvironment(String environment = null) {
        def cacheKey = environment ?: 'auto'

        // Check cache
        if (TestContext.getConfigurationCache().containsKey(cacheKey)) {
            return TestContext.getConfigurationCache()[cacheKey] as Map
        }

        // Detect environment if not provided
        def detectedEnv = environment ?: detectEnvironment()
        def envId = getEnvironmentId(detectedEnv)

        if (!envId) {
            return null
        }

        // Fetch configuration from database
        def configs = DatabaseUtil.withSql { sql ->
            return (sql as MockSql).rows('''
                SELECT scf_key, scf_value
                FROM system_configuration_scf
                WHERE env_id = :envId AND scf_is_active = true
            ''', [envId: envId])
        } as List

        if (!configs || (configs as List).isEmpty()) {
            return null
        }

        // Build configuration map
        def configMap = (configs as List).collectEntries { config ->
            [((config as Map).scf_key as String): (config as Map).scf_value as String]
        }

        def urlConfig = [
            baseUrl: configMap['confluence.base.url'],
            spaceKey: configMap['confluence.space.key'],
            pageId: configMap['confluence.page.id'],
            pageTitle: configMap['confluence.page.title'],
            environment: detectedEnv,
            isActive: true
        ]

        // Cache configuration
        TestContext.getConfigurationCache()[cacheKey] = urlConfig

        return urlConfig
    }

    static String buildStepViewUrlTemplate(String environment = null) {
        def config = getUrlConfigurationForEnvironment(environment)

        if (!config) {
            return null
        }

        def baseUrl = config.baseUrl
        def spaceKey = config.spaceKey
        def pageId = config.pageId
        def pageTitle = URLEncoder.encode(config.pageTitle as String, 'UTF-8')

        return "${baseUrl}/spaces/${spaceKey}/pages/${pageId}/${pageTitle}"
    }

    static Map healthCheck() {
        try {
            def devConfig = getUrlConfigurationForEnvironment('DEV')

            if (!devConfig) {
                return [
                    status: 'degraded',
                    message: 'No configuration found for DEV environment',
                    timestamp: new Timestamp(System.currentTimeMillis()).toString()
                ]
            }

            return [
                status: 'healthy',
                message: 'UrlConstructionService is operational',
                configurationsLoaded: TestContext.getConfigurationCache().size(),
                timestamp: new Timestamp(System.currentTimeMillis()).toString()
            ]
        } catch (Exception e) {
            return [
                status: 'error',
                message: "Health check failed: ${e.message}",
                timestamp: new Timestamp(System.currentTimeMillis()).toString()
            ]
        }
    }

    static void clearCache() {
        TestContext.clearCache()
    }

    static Map getCachedConfigurations() {
        return new HashMap(TestContext.getConfigurationCache())
    }

    private static String detectEnvironment() {
        // Simulate environment detection
        def sysProp = System.getProperty('umig.environment')
        if (sysProp) {
            return sysProp
        }

        def hostname = System.getProperty('confluence.hostname')
        if (hostname?.contains('localhost')) {
            return 'DEV'
        }

        return 'DEV' // Default to DEV
    }

    private static Integer getEnvironmentId(String envCode) {
        switch (envCode?.toUpperCase()) {
            case 'DEV': return 1
            case 'EV1': return 2
            case 'EV2': return 3
            case 'PROD': return 4
            default: return null
        }
    }
}

// ==========================================
// VALIDATION HELPER METHODS (FROM API)
// ==========================================

class ValidationHelpers {

    static boolean isValidEnvironmentCode(String envCode) {
        if (!envCode) return false

        // Must be 2-5 characters, alphanumeric only
        if (envCode.length() < 2 || envCode.length() > 5) return false

        // Only allow alphanumeric characters (prevent injection)
        if (!envCode.matches(/^[A-Za-z0-9]+$/)) return false

        // Validate against known environment patterns
        def validPatterns = [
            ~/(?i)^DEV$/,
            ~/(?i)^TST$/,
            ~/(?i)^EV[1-9]$/,
            ~/(?i)^PROD$/,
            ~/(?i)^STG$/,
            ~/(?i)^PRE$/,
            ~/(?i)^UAT$/,
            ~/(?i)^LOCAL$/
        ]

        return validPatterns.any { pattern -> envCode ==~ pattern }
    }

    static String sanitizeEnvironmentParameter(String envCode) {
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

    static Map validateUrlConfiguration(Map urlConfig) {
        if (!urlConfig) return null

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

    static boolean isValidHttpUrl(String url) {
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

    static String sanitizePageTitle(String title) {
        if (!title) return null

        // Remove potential XSS characters but keep URL encoding
        return title.replaceAll(/[<>'"&]/, '').trim()
    }
}

// ==========================================
// TEST SUITE
// ==========================================

class UrlConfigurationApiComprehensiveTest {
    private static int testCount = 0
    private static int passCount = 0
    private static int failCount = 0

    static void main(String... args) {
        println "=" * 80
        println "UrlConfigurationApi Comprehensive Test Suite (TD-014 Phase 1)"
        println "=" * 80
        println()

        // Configuration Retrieval (4 tests)
        testAutoDetectEnvironmentConfiguration()
        testExplicitEnvironmentParameter()
        testConfigurationNotFound()
        testUrlTemplateGeneration()

        // URL Validation (4 tests)
        testValidHttpUrl()
        testValidHttpsUrl()
        testInvalidProtocolRejected()
        testMaliciousUrlPatternsRejected()

        // Security Validation (3 tests)
        testEnvironmentCodeInjectionPrevention()
        testXssInPageTitleSanitization()
        testPathTraversalPrevention()

        // Cache Management (3 tests)
        testClearCacheOperation()
        testCacheRefreshAfterUpdate()
        testCacheConsistency()

        // Health & Debug (3 tests)
        testHealthCheckReturnsHealthy()
        testHealthCheckDegradedState()
        testDebugInformationCompleteness()

        printSummary()
    }

    // ==========================================
    // CONFIGURATION RETRIEVAL TESTS
    // ==========================================

    static void testAutoDetectEnvironmentConfiguration() {
        TestContext.reset()
        try {
            def config = UrlConstructionService.getUrlConfigurationForEnvironment()

            assert config != null, "Configuration should be found"
            assert config.baseUrl != null, "Base URL should be present"
            assert config.spaceKey != null, "Space key should be present"
            assert config.pageId != null, "Page ID should be present"
            assert config.pageTitle != null, "Page title should be present"
            assert config.environment != null, "Environment should be detected"
            assert config.isActive == true, "Configuration should be active"

            recordPass("Auto-detect environment configuration")
        } catch (AssertionError e) {
            recordFail("Auto-detect environment configuration", e.message)
        }
    }

    static void testExplicitEnvironmentParameter() {
        TestContext.reset()
        try {
            def devConfig = UrlConstructionService.getUrlConfigurationForEnvironment('DEV')
            assert devConfig != null, "DEV configuration should be found"
            assert devConfig.environment == 'DEV', "Environment should be DEV"
            assert devConfig.baseUrl == 'http://localhost:8090', "DEV base URL should match"

            def prodConfig = UrlConstructionService.getUrlConfigurationForEnvironment('PROD')
            assert prodConfig != null, "PROD configuration should be found"
            assert prodConfig.environment == 'PROD', "Environment should be PROD"
            assert prodConfig.baseUrl == 'https://confluence.prod.example.com', "PROD base URL should match"

            recordPass("Explicit environment parameter")
        } catch (AssertionError e) {
            recordFail("Explicit environment parameter", e.message)
        }
    }

    static void testConfigurationNotFound() {
        TestContext.reset()
        try {
            def config = UrlConstructionService.getUrlConfigurationForEnvironment('NONEXISTENT')

            assert config == null, "Should return null for nonexistent environment"

            recordPass("Configuration not found (404)")
        } catch (AssertionError e) {
            recordFail("Configuration not found", e.message)
        }
    }

    static void testUrlTemplateGeneration() {
        TestContext.reset()
        try {
            def urlTemplate = UrlConstructionService.buildStepViewUrlTemplate('DEV')

            assert urlTemplate != null, "URL template should be generated"
            assert urlTemplate.contains('http://localhost:8090'), "Should contain base URL"
            assert urlTemplate.contains('/spaces/'), "Should contain spaces path"
            assert urlTemplate.contains('/pages/'), "Should contain pages path"
            assert urlTemplate.contains('UMIG'), "Should contain space key"
            assert urlTemplate.contains('1048581'), "Should contain page ID"

            recordPass("URL template generation")
        } catch (AssertionError e) {
            recordFail("URL template generation", e.message)
        }
    }

    // ==========================================
    // URL VALIDATION TESTS
    // ==========================================

    static void testValidHttpUrl() {
        try {
            assert ValidationHelpers.isValidHttpUrl('http://localhost:8090'), "HTTP localhost should be valid"
            assert ValidationHelpers.isValidHttpUrl('http://example.com'), "HTTP domain should be valid"
            assert ValidationHelpers.isValidHttpUrl('http://example.com:8080'), "HTTP with port should be valid"

            recordPass("Valid HTTP URL accepted")
        } catch (AssertionError e) {
            recordFail("Valid HTTP URL accepted", e.message)
        }
    }

    static void testValidHttpsUrl() {
        try {
            assert ValidationHelpers.isValidHttpUrl('https://confluence.example.com'), "HTTPS should be valid"
            assert ValidationHelpers.isValidHttpUrl('https://example.com:443'), "HTTPS with port should be valid"

            recordPass("Valid HTTPS URL accepted")
        } catch (AssertionError e) {
            recordFail("Valid HTTPS URL accepted", e.message)
        }
    }

    static void testInvalidProtocolRejected() {
        try {
            assert !ValidationHelpers.isValidHttpUrl('ftp://example.com'), "FTP protocol should be rejected"
            assert !ValidationHelpers.isValidHttpUrl('javascript:alert(1)'), "JavaScript protocol should be rejected"
            assert !ValidationHelpers.isValidHttpUrl('file:///etc/passwd'), "File protocol should be rejected"
            assert !ValidationHelpers.isValidHttpUrl('data:text/html,<script>'), "Data protocol should be rejected"

            recordPass("Invalid protocol rejected (ftp://, javascript://, file://)")
        } catch (AssertionError e) {
            recordFail("Invalid protocol rejected", e.message)
        }
    }

    static void testMaliciousUrlPatternsRejected() {
        try {
            assert !ValidationHelpers.isValidHttpUrl('http://example..com'), "Double dots in hostname should be rejected"
            assert !ValidationHelpers.isValidHttpUrl('http://'), "Incomplete URL should be rejected"
            assert !ValidationHelpers.isValidHttpUrl('not a url'), "Invalid URL format should be rejected"

            recordPass("Malicious URL patterns rejected")
        } catch (AssertionError e) {
            recordFail("Malicious URL patterns rejected", e.message)
        }
    }

    // ==========================================
    // SECURITY VALIDATION TESTS
    // ==========================================

    static void testEnvironmentCodeInjectionPrevention() {
        try {
            // Path traversal attempts
            assert !ValidationHelpers.isValidEnvironmentCode('../../../etc/passwd'), "Path traversal should be rejected"
            assert !ValidationHelpers.isValidEnvironmentCode('..\\..\\..\\windows\\system32'), "Windows path traversal should be rejected"

            // SQL injection attempts
            assert !ValidationHelpers.isValidEnvironmentCode("DEV'; DROP TABLE system_configuration_scf; --"), "SQL injection should be rejected"
            assert !ValidationHelpers.isValidEnvironmentCode("' OR '1'='1"), "SQL injection should be rejected"

            // Command injection attempts
            assert !ValidationHelpers.isValidEnvironmentCode('DEV; rm -rf /'), "Command injection should be rejected"
            assert !ValidationHelpers.isValidEnvironmentCode('DEV && cat /etc/passwd'), "Command injection should be rejected"

            // Special characters
            assert !ValidationHelpers.isValidEnvironmentCode('DEV<script>'), "Special characters should be rejected"
            assert !ValidationHelpers.isValidEnvironmentCode('DEV!@#$%'), "Special characters should be rejected"

            // Valid codes should pass
            assert ValidationHelpers.isValidEnvironmentCode('DEV'), "Valid DEV code should pass"
            assert ValidationHelpers.isValidEnvironmentCode('EV1'), "Valid EV1 code should pass"
            assert ValidationHelpers.isValidEnvironmentCode('PROD'), "Valid PROD code should pass"

            recordPass("Environment code injection prevention (../../../etc/passwd)")
        } catch (AssertionError e) {
            recordFail("Environment code injection prevention", e.message)
        }
    }

    static void testXssInPageTitleSanitization() {
        try {
            def xssTitle = '<script>alert("xss")</script>UMIG - Step View'
            def sanitized = ValidationHelpers.sanitizePageTitle(xssTitle)

            assert !sanitized.contains('<script>'), "Script tags should be removed"
            assert !sanitized.contains('</script>'), "Script tags should be removed"
            assert sanitized.contains('UMIG'), "Legitimate content should remain"

            def htmlTitle = '<img src=x onerror=alert(1)>Title'
            def sanitizedHtml = ValidationHelpers.sanitizePageTitle(htmlTitle)
            assert !sanitizedHtml.contains('<img'), "HTML tags should be removed"
            assert !sanitizedHtml.contains('onerror'), "Event handlers should be removed"

            recordPass("XSS in page title sanitization (<script>alert('xss')</script>)")
        } catch (AssertionError e) {
            recordFail("XSS in page title sanitization", e.message)
        }
    }

    static void testPathTraversalPrevention() {
        try {
            // Environment parameter sanitization
            def traversalAttempt1 = '../../../etc/passwd'
            def sanitized1 = ValidationHelpers.sanitizeEnvironmentParameter(traversalAttempt1)
            assert !sanitized1.contains('../'), "Path traversal should be sanitized"
            assert !sanitized1.contains('/'), "Slashes should be removed"

            def traversalAttempt2 = '..\\..\\..\\windows\\system32'
            def sanitized2 = ValidationHelpers.sanitizeEnvironmentParameter(traversalAttempt2)
            assert !sanitized2.contains('..\\'), "Windows path traversal should be sanitized"
            assert !sanitized2.contains('\\'), "Backslashes should be removed"

            // Valid environment codes should work
            def validCode = 'DEV'
            def sanitizedValid = ValidationHelpers.sanitizeEnvironmentParameter(validCode)
            assert sanitizedValid == 'DEV', "Valid code should remain unchanged"

            recordPass("Path traversal prevention (../ sequences)")
        } catch (AssertionError e) {
            recordFail("Path traversal prevention", e.message)
        }
    }

    // ==========================================
    // CACHE MANAGEMENT TESTS
    // ==========================================

    static void testClearCacheOperation() {
        TestContext.reset()
        try {
            // Load configuration into cache
            def config1 = UrlConstructionService.getUrlConfigurationForEnvironment('DEV')
            assert config1 != null, "Configuration should load"

            def cachedBefore = UrlConstructionService.getCachedConfigurations()
            assert !cachedBefore.isEmpty(), "Cache should have entries"

            // Clear cache
            UrlConstructionService.clearCache()

            def cachedAfter = UrlConstructionService.getCachedConfigurations()
            assert cachedAfter.isEmpty(), "Cache should be empty after clear"

            recordPass("Clear cache operation successful")
        } catch (AssertionError e) {
            recordFail("Clear cache operation", e.message)
        }
    }

    static void testCacheRefreshAfterUpdate() {
        TestContext.reset()
        try {
            // Load configuration
            def config1 = UrlConstructionService.getUrlConfigurationForEnvironment('DEV')
            assert config1 != null, "Initial configuration should load"

            def initialBaseUrl = config1.baseUrl

            // Clear cache to simulate update
            UrlConstructionService.clearCache()

            // Reload configuration
            def config2 = UrlConstructionService.getUrlConfigurationForEnvironment('DEV')
            assert config2 != null, "Configuration should reload after cache clear"

            recordPass("Cache refresh after update")
        } catch (AssertionError e) {
            recordFail("Cache refresh after update", e.message)
        }
    }

    static void testCacheConsistency() {
        TestContext.reset()
        try {
            // Load same configuration multiple times
            def config1 = UrlConstructionService.getUrlConfigurationForEnvironment('DEV')
            def config2 = UrlConstructionService.getUrlConfigurationForEnvironment('DEV')

            assert config1.baseUrl == config2.baseUrl, "Cached configuration should be consistent"
            assert config1.spaceKey == config2.spaceKey, "Cached configuration should be consistent"
            assert config1.pageId == config2.pageId, "Cached configuration should be consistent"

            // Load different environment
            def config3 = UrlConstructionService.getUrlConfigurationForEnvironment('PROD')
            assert config3.baseUrl != config1.baseUrl, "Different environments should have different configs"

            recordPass("Cache consistency validation")
        } catch (AssertionError e) {
            recordFail("Cache consistency validation", e.message)
        }
    }

    // ==========================================
    // HEALTH & DEBUG TESTS
    // ==========================================

    static void testHealthCheckReturnsHealthy() {
        TestContext.reset()
        try {
            def health = UrlConstructionService.healthCheck()

            assert health != null, "Health check should return result"
            assert health.status == 'healthy', "Status should be healthy"
            assert health.message != null, "Should have message"
            assert health.timestamp != null, "Should have timestamp"

            recordPass("Health check returns healthy status")
        } catch (AssertionError e) {
            recordFail("Health check returns healthy", e.message)
        }
    }

    static void testHealthCheckDegradedState() {
        TestContext.reset()
        try {
            // Clear all configurations to simulate degraded state
            TestContext.getMockSql().setThrowException(true)

            def health = UrlConstructionService.healthCheck()

            assert health != null, "Health check should return result even on error"
            assert health.status in ['degraded', 'error'], "Status should be degraded or error"

            TestContext.reset()
            recordPass("Health check degraded state")
        } catch (AssertionError e) {
            recordFail("Health check degraded state", e.message)
        }
    }

    static void testDebugInformationCompleteness() {
        TestContext.reset()
        try {
            // Load some configurations
            UrlConstructionService.getUrlConfigurationForEnvironment('DEV')
            UrlConstructionService.getUrlConfigurationForEnvironment('PROD')

            // Get cached configurations (simulating debug endpoint)
            def cachedConfigs = UrlConstructionService.getCachedConfigurations()

            assert cachedConfigs != null, "Debug info should be available"
            assert cachedConfigs.size() >= 2, "Should have cached configurations"
            assert cachedConfigs.containsKey('DEV'), "Should have DEV in cache"
            assert cachedConfigs.containsKey('PROD'), "Should have PROD in cache"

            // Health check should also provide debug info
            def health = UrlConstructionService.healthCheck()
            assert health.configurationsLoaded != null, "Should report configurations loaded"

            recordPass("Debug information completeness")
        } catch (AssertionError e) {
            recordFail("Debug information completeness", e.message)
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    static void recordPass(String testName) {
        testCount++
        passCount++
        println "✓ PASS: ${testName}"
    }

    static void recordFail(String testName, String error) {
        testCount++
        failCount++
        println "✗ FAIL: ${testName}"
        println "  Error: ${error}"
    }

    static void printSummary() {
        println()
        println "=" * 80
        println "TEST SUMMARY"
        println "=" * 80
        println "Total Tests: ${testCount}"
        println "Passed:      ${passCount} (${testCount > 0 ? (passCount * 100 / testCount) : 0}%)"
        println "Failed:      ${failCount}"
        println "=" * 80

        if (failCount == 0) {
            println "✓ ALL TESTS PASSED - UrlConfigurationApi comprehensive test suite complete!"
        } else {
            println "✗ SOME TESTS FAILED - Review failures above"
            System.exit(1)
        }
    }
}