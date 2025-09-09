#!/usr/bin/env groovy

package umig.tests.unit

import java.util.UUID
import java.util.regex.Pattern
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import groovy.transform.CompileStatic
import groovy.transform.TypeCheckingMode

/**
 * Unit test for UrlConstructionService - Standalone Groovy Test
 * Converted from Spock to standard Groovy per ADR-036
 * Self-contained with embedded mock classes for ScriptRunner compatibility
 * Uses the most basic mocking approach to avoid MetaClass issues
 */

// ==================== MOCK CLASSES ====================

/**
 * Mock SQL class that simulates database operations
 * Explicit typing for static type checker compatibility
 */
class MockSql {
    Map<String, Object> mockResults = [:]
    String queryCaptured = null
    Object paramsCaptured = null
    String methodCalled = null
    
    List<Map<String, Object>> rows(String query, Map<String, Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'rows'
        return (mockResults['rows'] as List<Map<String, Object>>) ?: []
    }
    
    List<Map<String, Object>> rows(String query, List<Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'rows'
        return (mockResults['rows'] as List<Map<String, Object>>) ?: []
    }
    
    List<Map<String, Object>> rows(String query) {
        queryCaptured = query
        paramsCaptured = [:]
        methodCalled = 'rows'
        return (mockResults['rows'] as List<Map<String, Object>>) ?: []
    }
    
    Map<String, Object> firstRow(String query, Map<String, Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'firstRow'
        return mockResults['firstRow'] as Map<String, Object>
    }
    
    Map<String, Object> firstRow(String query, List<Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'firstRow'
        return mockResults['firstRow'] as Map<String, Object>
    }
    
    Map<String, Object> firstRow(String query) {
        queryCaptured = query
        paramsCaptured = [:]
        methodCalled = 'firstRow'
        return mockResults['firstRow'] as Map<String, Object>
    }
    
    void setMockResult(String method, Object result) {
        mockResults[method] = result
    }
}

/**
 * Mock DatabaseUtil for testing - completely self-contained
 */
class DatabaseUtil {
    static MockSql mockSql = new MockSql()
    
    static <T> T withSql(Closure<T> closure) {
        return closure(mockSql)
    }
    
    static void resetMock() {
        mockSql = new MockSql()
    }
}

// ==================== SERVICE IMPLEMENTATION ====================

/**
 * UrlConstructionService - Constructs secure URLs for UMIG step views
 * Embedded implementation for self-contained testing.
 */
class UrlConstructionService {
    
    // URL validation patterns for security
    private static final Pattern URL_PATTERN = Pattern.compile(
        '^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$'
    )
    private static final Pattern PARAM_PATTERN = Pattern.compile(
        '^[a-zA-Z0-9._\\-\\s]+$'  // Allow spaces for iteration names
    )
    // More permissive pattern for page titles (allows spaces and common punctuation)
    private static final Pattern PAGE_TITLE_PATTERN = Pattern.compile(
        '^[a-zA-Z0-9\\s._-]+$'
    )
    
    // Cache for configuration data to avoid repeated database queries
    private static Map<String, Map<String, Object>> configurationCache = [:]
    private static long cacheLastUpdated = 0
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes
    
    /**
     * Constructs a secure stepView URL for email notifications
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
                stepid: stepDetails['step_code'] as String
            ] as Map<String, Object>)
            
            if (!sanitizedParams) {
                println "UrlConstructionService: Parameter validation failed"
                return null
            }
            
            // Construct the URL
            def baseUrl = sanitizeBaseUrl(config['scf_base_url'] as String)
            def spaceKey = sanitizeParameter(config['scf_space_key'] as String)
            def pageId = sanitizeParameter(config['scf_page_id'] as String)
            def pageTitle = sanitizePageTitle(config['scf_page_title'] as String)
            
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
            def allParams = ([pageId: pageId] as Map<String, String>) + (sanitizedParams as Map<String, String>)
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
     * Auto-detect current environment based on system properties or defaults
     */
    static String detectEnvironment() {
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
    static Map<String, Object> getSystemConfiguration(String environmentCode) {
        def now = System.currentTimeMillis()
        
        // Check cache first
        if (configurationCache[environmentCode] && (now - cacheLastUpdated) < CACHE_DURATION_MS) {
            return configurationCache[environmentCode]
        }
        
        try {
            return DatabaseUtil.withSql { MockSql sql ->
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
                ''', [envCode: environmentCode] as Map<String, Object>)
                
                if (configs && configs.size() > 0) {
                    // Convert key-value pairs to expected structure
                    def config = [
                        scf_environment_code: environmentCode,
                        scf_is_active: true
                    ] as Map<String, Object>
                    
                    configs.each { Map<String, Object> row ->
                        switch (row['scf_key'] as String) {
                            case 'stepview.confluence.base.url':
                                config['scf_base_url'] = row['scf_value'] as String
                                break
                            case 'stepview.confluence.space.key':
                                config['scf_space_key'] = row['scf_value'] as String
                                break
                            case 'stepview.confluence.page.id':
                                config['scf_page_id'] = row['scf_value'] as String
                                break
                            case 'stepview.confluence.page.title':
                                config['scf_page_title'] = row['scf_value'] as String
                                break
                        }
                    }
                    
                    // Only cache if we have all required configuration values
                    if (config['scf_base_url'] && config['scf_space_key'] && config['scf_page_id'] && config['scf_page_title']) {
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
            } as Map<String, Object>
        } catch (Exception e) {
            println "UrlConstructionService: Error retrieving configuration for ${environmentCode}: ${e.message}"
            e.printStackTrace()
            return null
        }
    }
    
    /**
     * Retrieves step details needed for URL construction
     */
    private static Map<String, Object> getStepDetails(UUID stepInstanceId) {
        try {
            return DatabaseUtil.withSql { MockSql sql ->
                return sql.firstRow('''
                    SELECT sti.sti_id, stm.stt_code, stm.stm_number, sti.sti_name,
                           CONCAT(stm.stt_code, '-', LPAD(stm.stm_number::text, 3, '0')) as step_code
                    FROM steps_instance_sti sti
                    INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    WHERE sti.sti_id = :stepId
                ''', [stepId: stepInstanceId] as Map<String, Object>)
            } as Map<String, Object>
        } catch (Exception e) {
            println "UrlConstructionService: Error retrieving step details for ${stepInstanceId}: ${e.message}"
            return null
        }
    }
    
    /**
     * Validates and sanitizes URL parameters for security
     */
    private static Map<String, Object> sanitizeUrlParameters(Map<String, Object> params) {
        def sanitized = [:] as Map<String, Object>
        
        params.each { String key, Object value ->
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
    static String sanitizeParameter(String param) {
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
    static String sanitizeBaseUrl(String url) {
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
     * Clears configuration cache
     */
    static void clearCache() {
        configurationCache.clear()
        cacheLastUpdated = 0
    }
    
    /**
     * Gets cached configuration for debugging/monitoring
     */
    static Map<String, Map<String, Object>> getCachedConfigurations() {
        return new HashMap(configurationCache)
    }
    
    /**
     * Health check method for monitoring
     */
    static Map<String, Object> healthCheck() {
        try {
            def env = detectEnvironment()
            def config = getSystemConfiguration(env)
            
            return [
                status: config ? 'healthy' : 'degraded',
                environment: env,
                configurationFound: config != null,
                cacheSize: configurationCache.size(),
                cacheAge: System.currentTimeMillis() - cacheLastUpdated
            ] as Map<String, Object>
        } catch (Exception e) {
            return [
                status: 'error',
                error: e.message,
                environment: null,
                configurationFound: false
            ] as Map<String, Object>
        }
    }
}

// ==================== TEST CLASS ====================

@CompileStatic(TypeCheckingMode.SKIP)
class UrlConstructionServiceTest {
    
    void setup() {
        // Clear cache before each test
        UrlConstructionService.clearCache()
        
        // Mock database configuration data
        mockDatabaseConfiguration()
    }
    
    void teardown() {
        // Clear cache after each test
        UrlConstructionService.clearCache()
        // Reset mock
        DatabaseUtil.resetMock()
    }
    
    void testConstructValidStepViewUrlWithAllRequiredParameters() {
        println "Testing valid stepView URL construction..."
        
        def stepInstanceId = UUID.randomUUID()
        def migrationCode = "TORONTO"
        def iterationCode = "run1"
        def environmentCode = "DEV"
        
        def result = UrlConstructionService.buildStepViewUrl(
            stepInstanceId, migrationCode, iterationCode, environmentCode
        )
        
        assert result != null
        assert result.startsWith("http://localhost:8090")
        assert result.contains("spaces/UMIG")
        assert result.contains("pages/123456789")
        assert result.contains("StepView")
        assert result.contains("mig=TORONTO")
        assert result.contains("ite=run1")
        assert result.contains("stepid=DUM-001")
        
        println "✓ Valid stepView URL construction test passed"
    }
    
    void testHandleUrlEncodingForSpecialCharacters() {
        println "Testing URL encoding for special characters..."
        
        def stepInstanceId = UUID.randomUUID()
        def migrationCode = "TEST & PROD"
        def iterationCode = "run#1"
        def environmentCode = "DEV"
        
        def result = UrlConstructionService.buildStepViewUrl(
            stepInstanceId, migrationCode, iterationCode, environmentCode
        )
        
        assert result != null
        assert result.contains("mig=TEST+%26+PROD")
        assert result.contains("ite=run%231")
        
        println "✓ URL encoding test passed"
    }
    
    void testValidateParametersAndRejectInvalidValues() {
        println "Testing parameter validation..."
        
        // Test null step instance ID
        def result1 = UrlConstructionService.buildStepViewUrl(
            null, "TORONTO", "run1", "DEV"
        )
        assert result1 == null
        
        // Test null migration code
        def result2 = UrlConstructionService.buildStepViewUrl(
            UUID.randomUUID(), null, "run1", "DEV"
        )
        assert result2 == null
        
        // Test empty migration code
        def result3 = UrlConstructionService.buildStepViewUrl(
            UUID.randomUUID(), "", "run1", "DEV"
        )
        assert result3 == null
        
        // Test null iteration code
        def result4 = UrlConstructionService.buildStepViewUrl(
            UUID.randomUUID(), "TORONTO", null, "DEV"
        )
        assert result4 == null
        
        // Test empty iteration code
        def result5 = UrlConstructionService.buildStepViewUrl(
            UUID.randomUUID(), "TORONTO", "", "DEV"
        )
        assert result5 == null
        
        // Test valid parameters
        def result6 = UrlConstructionService.buildStepViewUrl(
            UUID.randomUUID(), "TORONTO", "run1", "DEV"
        )
        assert result6 != null && result6.contains("TORONTO")
        
        println "✓ Parameter validation test passed"
    }
    
    void testDetectEnvironmentCorrectlyFromSystemProperties() {
        println "Testing environment detection from system properties..."
        
        System.setProperty("umig.environment", "PROD")
        def result1 = UrlConstructionService.detectEnvironment()
        assert result1 == "PROD"
        
        System.setProperty("umig.environment", "EV2")
        def result2 = UrlConstructionService.detectEnvironment()
        assert result2 == "EV2"
        
        System.clearProperty("umig.environment")
        def result3 = UrlConstructionService.detectEnvironment()
        assert result3 == "DEV" // Default fallback
        
        println "✓ Environment detection test passed"
    }
    
    void testCacheConfigurationData() {
        println "Testing configuration caching..."
        
        def environmentCode = "DEV"
        
        def config1 = UrlConstructionService.getSystemConfiguration(environmentCode)
        def config2 = UrlConstructionService.getSystemConfiguration(environmentCode)
        
        assert config1 != null
        assert config2 != null
        assert config1.scf_base_url == config2.scf_base_url
        
        def cached = UrlConstructionService.getCachedConfigurations()
        assert cached[environmentCode] != null
        
        println "✓ Configuration caching test passed"
    }
    
    void testHandleMissingConfigurationGracefully() {
        println "Testing missing configuration handling..."
        
        def environmentCode = "NONEXISTENT"
        
        def result = UrlConstructionService.buildStepViewUrl(
            UUID.randomUUID(), "TORONTO", "run1", environmentCode
        )
        
        assert result == null
        
        println "✓ Missing configuration handling test passed"
    }
    
    void testValidateBaseUrlFormat() {
        println "Testing base URL format validation..."
        
        def validHttp = UrlConstructionService.sanitizeBaseUrl("http://example.com")
        assert validHttp == "http://example.com"
        
        def validHttps = UrlConstructionService.sanitizeBaseUrl("https://example.com:8080")
        assert validHttps == "https://example.com:8080"
        
        def invalidProtocol = UrlConstructionService.sanitizeBaseUrl("ftp://example.com")
        assert invalidProtocol == null
        
        def malformed = UrlConstructionService.sanitizeBaseUrl("not-a-url")
        assert malformed == null
        
        def nullValue = UrlConstructionService.sanitizeBaseUrl(null)
        assert nullValue == null
        
        def emptyValue = UrlConstructionService.sanitizeBaseUrl("")
        assert emptyValue == null
        
        println "✓ Base URL format validation test passed"
    }
    
    void testSanitizeParametersToPreventInjectionAttacks() {
        println "Testing parameter sanitization..."
        
        def validParam = UrlConstructionService.sanitizeParameter("valid-param_123")
        assert validParam == "valid-param_123"
        
        def scriptInjection = UrlConstructionService.sanitizeParameter("<script>alert('xss')</script>")
        assert scriptInjection == null // Rejected due to invalid characters
        
        def sqlInjection = UrlConstructionService.sanitizeParameter("'; DROP TABLE users; --")
        assert sqlInjection == null // Rejected due to invalid characters
        
        def specialChars = UrlConstructionService.sanitizeParameter("param@#\$%^&*()")
        assert specialChars == null // Rejected due to invalid characters
        
        println "✓ Parameter sanitization test passed"
    }
    
    void testPerformHealthCheckCorrectly() {
        println "Testing health check..."
        
        def health = UrlConstructionService.healthCheck()
        
        assert health != null
        assert health.status in ["healthy", "degraded", "error"]
        assert health.environment != null
        assert health.containsKey("configurationFound")
        assert health.containsKey("cacheSize")
        
        println "✓ Health check test passed"
    }
    
    void testHandleDatabaseConnectionErrorsGracefully() {
        println "Testing database connection error handling..."
        
        // Mock database connection failure
        mockDatabaseFailure()
        
        def result = UrlConstructionService.buildStepViewUrl(
            UUID.randomUUID(), "TORONTO", "run1", "DEV"
        )
        
        assert result == null
        
        // Restore normal mock
        mockDatabaseConfiguration()
        
        println "✓ Database connection error handling test passed"
    }
    
    void testClearCacheWhenRequested() {
        println "Testing cache clearing..."
        
        UrlConstructionService.getSystemConfiguration("DEV")
        def beforeClear = UrlConstructionService.getCachedConfigurations()
        assert beforeClear.size() > 0
        
        UrlConstructionService.clearCache()
        def afterClear = UrlConstructionService.getCachedConfigurations()
        assert afterClear.size() == 0
        
        println "✓ Cache clearing test passed"
    }
    
    void testQueryDatabaseWithFixedKeyValueStructure() {
        println "Testing database query with key-value structure..."
        
        UrlConstructionService.clearCache()
        
        def queriesCalled = []
        
        // Setup special mock for this test
        DatabaseUtil.mockSql.setMockResult('rows', [
            [scf_key: 'stepview.confluence.base.url', scf_value: 'http://localhost:8090'],
            [scf_key: 'stepview.confluence.space.key', scf_value: 'UMIG'],
            [scf_key: 'stepview.confluence.page.id', scf_value: '123456789'],
            [scf_key: 'stepview.confluence.page.title', scf_value: 'StepView']
        ] as List<Map<String, Object>>)
        
        def config = UrlConstructionService.getSystemConfiguration("DEV")
        
        // Verify the query was called
        assert DatabaseUtil.mockSql.methodCalled == 'rows'
        assert DatabaseUtil.mockSql.queryCaptured != null
        
        // Verify the fixed query structure
        def query = DatabaseUtil.mockSql.queryCaptured as String
        assert query.contains('INNER JOIN environments_env e ON scf.env_id = e.env_id')
        assert query.contains('WHERE e.env_code = :envCode')
        assert query.contains('scf_category = \'MACRO_LOCATION\'')
        assert !query.contains('scf_environment_code')
        
        // Verify the parameters
        def params = DatabaseUtil.mockSql.paramsCaptured as Map<String, Object>
        assert params['envCode'] == "DEV"
        
        assert config != null
        assert config['scf_environment_code'] == "DEV"
        assert config['scf_base_url'] == "http://localhost:8090"
        assert config['scf_space_key'] == "UMIG"
        assert config['scf_page_id'] == "123456789"
        assert config['scf_page_title'] == "StepView"
        assert config['scf_is_active'] == true
        
        // Restore original mock
        mockDatabaseConfiguration()
        
        println "✓ Database query with key-value structure test passed"
    }
    
    void testHandleIncompleteConfigurationKeysProperly() {
        println "Testing incomplete configuration handling..."
        
        UrlConstructionService.clearCache()
        
        // Setup mock for incomplete configuration (missing page title)
        DatabaseUtil.mockSql.setMockResult('rows', [
            [scf_key: 'stepview.confluence.base.url', scf_value: 'http://localhost:8090'],
            [scf_key: 'stepview.confluence.space.key', scf_value: 'UMIG'],
            [scf_key: 'stepview.confluence.page.id', scf_value: '123456789']
            // Missing: stepview.confluence.page.title
        ] as List<Map<String, Object>>)
        
        def config = UrlConstructionService.getSystemConfiguration("PARTIAL")
        assert config == null
        
        // Restore original mock
        mockDatabaseConfiguration()
        
        println "✓ Incomplete configuration handling test passed"
    }
    
    // Helper methods
    private void mockDatabaseConfiguration() {
        // Reset and setup standard mocks
        DatabaseUtil.resetMock()
        
        // Setup standard configuration rows mock
        DatabaseUtil.mockSql.setMockResult('rows', [
            [scf_key: 'stepview.confluence.base.url', scf_value: 'http://localhost:8090'],
            [scf_key: 'stepview.confluence.space.key', scf_value: 'UMIG'],
            [scf_key: 'stepview.confluence.page.id', scf_value: '123456789'],
            [scf_key: 'stepview.confluence.page.title', scf_value: 'StepView']
        ] as List<Map<String, Object>>)
        
        // Setup standard step details mock
        DatabaseUtil.mockSql.setMockResult('firstRow', [
            sti_id: UUID.randomUUID(),
            stt_code: "DUM",
            stm_number: 1,
            sti_name: "Test Step",
            step_code: "DUM-001"
        ] as Map<String, Object>)
    }
    
    private void mockDatabaseFailure() {
        // For database failure, we'll use a custom MockSql that throws exceptions
        DatabaseUtil.mockSql = new MockSql() {
            @Override
            List<Map<String, Object>> rows(String query, Map<String, Object> params) {
                throw new RuntimeException("Database connection failed")
            }
            
            @Override
            Map<String, Object> firstRow(String query, Map<String, Object> params) {
                throw new RuntimeException("Database connection failed")
            }
        }
    }
    
    // Main method for standalone execution per ADR-036
    static void main(String[] args) {
        def test = new UrlConstructionServiceTest()
        def totalTests = 0
        def passedTests = 0
        List<Map<String, Object>> failedTests = []
        
        println "\n=== Running UrlConstructionServiceTest ==="
        println "Testing pattern: ADR-036 (Pure Groovy, no external dependencies)\n"
        
        def testMethods = [
            'testConstructValidStepViewUrlWithAllRequiredParameters',
            'testHandleUrlEncodingForSpecialCharacters',
            'testValidateParametersAndRejectInvalidValues',
            'testDetectEnvironmentCorrectlyFromSystemProperties',
            'testCacheConfigurationData',
            'testHandleMissingConfigurationGracefully',
            'testValidateBaseUrlFormat',
            'testSanitizeParametersToPreventInjectionAttacks',
            'testPerformHealthCheckCorrectly',
            'testHandleDatabaseConnectionErrorsGracefully',
            'testClearCacheWhenRequested',
            'testQueryDatabaseWithFixedKeyValueStructure',
            'testHandleIncompleteConfigurationKeysProperly'
        ]
        
        testMethods.each { String methodName ->
            totalTests++
            try {
                test.setup()
                test.invokeMethod(methodName, null)
                test.teardown()
                passedTests++
            } catch (AssertionError | Exception e) {
                failedTests << ([test: methodName as Object, error: e.message as Object] as Map<String, Object>)
                println "✗ ${methodName} failed: ${e.message}"
            }
        }
        
        println "\n=== Test Summary ==="
        println "Total: ${totalTests}"
        println "Passed: ${passedTests}"
        println "Failed: ${failedTests.size()}"
        println "Success rate: ${Math.round(((passedTests as BigDecimal) / (totalTests as BigDecimal) * 100).doubleValue())}%"
        
        if (failedTests) {
            println "\nFailed tests:"
            failedTests.each { Map<String, Object> failure ->
                println "  - ${failure['test'] as String}: ${failure['error'] as String}"
            }
            System.exit(1)
        } else {
            println "\n✅ All tests passed!"
            System.exit(0)
        }
    }
}