package umig.tests.unit

import spock.lang.Specification
import spock.lang.Unroll
import java.util.UUID

import umig.utils.UrlConstructionService
import umig.utils.DatabaseUtil

/**
 * Unit Tests for UrlConstructionService
 * 
 * Tests URL construction, security validation, environment detection,
 * and error handling for the email notification URL system.
 * 
 * @author UMIG Project Team
 * @since 2025-08-21
 */
class UrlConstructionServiceTest extends Specification {
    
    def setup() {
        // Clear cache before each test
        UrlConstructionService.clearCache()
        
        // Mock database configuration data
        mockDatabaseConfiguration()
    }
    
    def cleanup() {
        // Clear cache after each test
        UrlConstructionService.clearCache()
    }
    
    def "should construct valid stepView URL with all required parameters"() {
        given: "Valid step instance and context parameters"
        def stepInstanceId = UUID.randomUUID()
        def migrationCode = "TORONTO"
        def iterationCode = "run1"
        def environmentCode = "DEV"
        
        when: "Building step view URL"
        def result = UrlConstructionService.buildStepViewUrl(
            stepInstanceId, migrationCode, iterationCode, environmentCode
        )
        
        then: "URL should be properly constructed"
        result != null
        result.startsWith("http://localhost:8090")
        result.contains("spaces/UMIG")
        result.contains("pages/123456789")
        result.contains("StepView")
        result.contains("mig=TORONTO")
        result.contains("ite=run1")
        result.contains("stepid=DUM-001")
    }
    
    def "should handle URL encoding for special characters in parameters"() {
        given: "Parameters with special characters"
        def stepInstanceId = UUID.randomUUID()
        def migrationCode = "TEST & PROD"
        def iterationCode = "run#1"
        def environmentCode = "DEV"
        
        when: "Building step view URL"
        def result = UrlConstructionService.buildStepViewUrl(
            stepInstanceId, migrationCode, iterationCode, environmentCode
        )
        
        then: "Special characters should be URL encoded"
        result != null
        result.contains("mig=TEST+%26+PROD")
        result.contains("ite=run%231")
    }
    
    @Unroll
    def "should validate parameters and reject invalid values: #scenario"() {
        given: "Test parameters"
        def stepInstanceId = validId ? UUID.randomUUID() : null
        
        when: "Building step view URL"
        def result = UrlConstructionService.buildStepViewUrl(
            stepInstanceId, migCode, iterCode, "DEV"
        )
        
        then: "Should handle validation appropriately"
        result == expectedResult
        
        where:
        scenario                    | validId | migCode     | iterCode   | expectedResult
        "null step instance ID"     | false   | "TORONTO"   | "run1"     | null
        "null migration code"       | true    | null        | "run1"     | null
        "empty migration code"      | true    | ""          | "run1"     | null
        "null iteration code"       | true    | "TORONTO"   | null       | null
        "empty iteration code"      | true    | "TORONTO"   | ""         | null
        "valid parameters"          | true    | "TORONTO"   | "run1"     | "valid_url"
    }
    
    def "should detect environment correctly from system properties"() {
        when: "Detecting environment with different system properties"
        System.setProperty("umig.environment", "PROD")
        def result1 = UrlConstructionService.detectEnvironment()
        
        System.setProperty("umig.environment", "EV2")
        def result2 = UrlConstructionService.detectEnvironment()
        
        System.clearProperty("umig.environment")
        def result3 = UrlConstructionService.detectEnvironment()
        
        then: "Should detect correctly"
        result1 == "PROD"
        result2 == "EV2"
        result3 == "DEV" // Default fallback
    }
    
    def "should cache configuration data to avoid repeated database calls"() {
        given: "Multiple calls to get configuration"
        def environmentCode = "DEV"
        
        when: "Making multiple configuration requests"
        def config1 = UrlConstructionService.getSystemConfiguration(environmentCode)
        def config2 = UrlConstructionService.getSystemConfiguration(environmentCode)
        
        then: "Should use cached data for second call"
        config1 != null
        config2 != null
        config1.scf_base_url == config2.scf_base_url
        
        and: "Cache should contain the configuration"
        def cached = UrlConstructionService.getCachedConfigurations()
        cached[environmentCode] != null
    }
    
    def "should handle missing configuration gracefully"() {
        given: "Non-existent environment code"
        def environmentCode = "NONEXISTENT"
        
        when: "Building step view URL"
        def result = UrlConstructionService.buildStepViewUrl(
            UUID.randomUUID(), "TORONTO", "run1", environmentCode
        )
        
        then: "Should return null for missing configuration"
        result == null
    }
    
    def "should validate base URL format"() {
        when: "Testing various URL formats"
        def validHttp = UrlConstructionService.sanitizeBaseUrl("http://example.com")
        def validHttps = UrlConstructionService.sanitizeBaseUrl("https://example.com:8080")
        def invalidProtocol = UrlConstructionService.sanitizeBaseUrl("ftp://example.com")
        def malformed = UrlConstructionService.sanitizeBaseUrl("not-a-url")
        def nullValue = UrlConstructionService.sanitizeBaseUrl(null)
        def emptyValue = UrlConstructionService.sanitizeBaseUrl("")
        
        then: "Should validate correctly"
        validHttp == "http://example.com"
        validHttps == "https://example.com:8080"
        invalidProtocol == null
        malformed == null
        nullValue == null
        emptyValue == null
    }
    
    def "should sanitize parameters to prevent injection attacks"() {
        when: "Testing malicious parameter values"
        def validParam = UrlConstructionService.sanitizeParameter("valid-param_123")
        def scriptInjection = UrlConstructionService.sanitizeParameter("<script>alert('xss')</script>")
        def sqlInjection = UrlConstructionService.sanitizeParameter("'; DROP TABLE users; --")
        def specialChars = UrlConstructionService.sanitizeParameter("param@#\$%^&*()")
        
        then: "Should sanitize appropriately"
        validParam == "valid-param_123"
        scriptInjection == null // Rejected due to invalid characters
        sqlInjection == null     // Rejected due to invalid characters  
        specialChars == null     // Rejected due to invalid characters
    }
    
    def "should perform health check correctly"() {
        when: "Performing health check"
        def health = UrlConstructionService.healthCheck()
        
        then: "Should return health status"
        health != null
        health.status in ["healthy", "degraded", "error"]
        health.environment != null
        health.containsKey("configurationFound")
        health.containsKey("cacheSize")
    }
    
    def "should handle database connection errors gracefully"() {
        given: "Simulated database failure"
        // Mock database connection failure
        mockDatabaseFailure()
        
        when: "Building step view URL"
        def result = UrlConstructionService.buildStepViewUrl(
            UUID.randomUUID(), "TORONTO", "run1", "DEV"
        )
        
        then: "Should handle gracefully and return null"
        result == null
    }
    
    def "should clear cache when requested"() {
        given: "Cached configuration data"
        UrlConstructionService.getSystemConfiguration("DEV")
        def beforeClear = UrlConstructionService.getCachedConfigurations()
        
        when: "Clearing cache"
        UrlConstructionService.clearCache()
        def afterClear = UrlConstructionService.getCachedConfigurations()
        
        then: "Cache should be empty"
        beforeClear.size() > 0
        afterClear.size() == 0
    }
    
    def "should query database with fixed key-value pair structure without SQL errors"() {
        given: "A fresh configuration request that will hit the database"
        UrlConstructionService.clearCache()
        
        // Track SQL queries to verify the fix
        def queriesCalled = []
        
        DatabaseUtil.metaClass.static.withSql = { closure ->
            def mockSql = [
                rows: { query, params ->
                    // Record the query for verification
                    queriesCalled << [query: query, params: params]
                    
                    // Verify the fixed query structure
                    assert query.contains('INNER JOIN environments_env e ON scf.env_id = e.env_id')
                    assert query.contains('WHERE e.env_code = :envCode')
                    assert query.contains('scf_category = \'MACRO_LOCATION\'')
                    assert !query.contains('scf_environment_code') // Should NOT contain old buggy column
                    
                    // Return proper key-value pairs
                    if (params.envCode == "DEV") {
                        return [
                            [scf_key: 'stepview.confluence.base.url', scf_value: 'http://localhost:8090'],
                            [scf_key: 'stepview.confluence.space.key', scf_value: 'UMIG'],
                            [scf_key: 'stepview.confluence.page.id', scf_value: '123456789'],
                            [scf_key: 'stepview.confluence.page.title', scf_value: 'StepView']
                        ]
                    }
                    return []
                },
                firstRow: { query, params ->
                    return null // Not needed for this test
                }
            ]
            return closure.call(mockSql)
        }
        
        when: "Getting system configuration"
        def config = UrlConstructionService.getSystemConfiguration("DEV")
        
        then: "Configuration is retrieved successfully with fixed query structure"
        queriesCalled.size() == 1
        config != null
        config.scf_environment_code == "DEV"
        config.scf_base_url == "http://localhost:8090"
        config.scf_space_key == "UMIG" 
        config.scf_page_id == "123456789"
        config.scf_page_title == "StepView"
        config.scf_is_active == true
        
        and: "No SQL exceptions are thrown"
        notThrown(Exception)
        
        cleanup:
        // Restore original mock
        mockDatabaseConfiguration()
    }
    
    def "should handle incomplete configuration keys properly"() {
        given: "Database returns partial configuration"
        UrlConstructionService.clearCache()
        
        DatabaseUtil.metaClass.static.withSql = { closure ->
            def mockSql = [
                rows: { query, params ->
                    // Return incomplete configuration (missing page.title)
                    if (params.envCode == "PARTIAL") {
                        return [
                            [scf_key: 'stepview.confluence.base.url', scf_value: 'http://localhost:8090'],
                            [scf_key: 'stepview.confluence.space.key', scf_value: 'UMIG'],
                            [scf_key: 'stepview.confluence.page.id', scf_value: '123456789']
                            // Missing: stepview.confluence.page.title
                        ]
                    }
                    return []
                },
                firstRow: { query, params -> return null }
            ]
            return closure.call(mockSql)
        }
        
        when: "Getting configuration for environment with partial data"
        def config = UrlConstructionService.getSystemConfiguration("PARTIAL")
        
        then: "Should return null for incomplete configuration"
        config == null
        
        and: "No exceptions are thrown" 
        notThrown(Exception)
        
        cleanup:
        // Restore original mock
        mockDatabaseConfiguration()
    }
    
    // ===========================================
    // HELPER METHODS FOR TESTING
    // ===========================================
    
    private void mockDatabaseConfiguration() {
        // Mock the database configuration for testing - Updated for key-value pair structure
        // This mock now properly reflects the fixed SQL query structure
        
        DatabaseUtil.metaClass.static.withSql = { closure ->
            // Mock SQL connection and configuration data
            def mockSql = [
                rows: { query, params ->
                    // Mock the new key-value pair structure query
                    if (params.envCode == "DEV" && query.contains('MACRO_LOCATION')) {
                        return [
                            [scf_key: 'stepview.confluence.base.url', scf_value: 'http://localhost:8090'],
                            [scf_key: 'stepview.confluence.space.key', scf_value: 'UMIG'],
                            [scf_key: 'stepview.confluence.page.id', scf_value: '123456789'],
                            [scf_key: 'stepview.confluence.page.title', scf_value: 'StepView']
                        ]
                    } else if (params.envCode == "NONEXISTENT") {
                        return []  // Empty result for non-existent environment
                    }
                    return []
                },
                firstRow: { query, params ->
                    if (params.stepId) {
                        return [
                            sti_id: params.stepId,
                            stt_code: "DUM",
                            stm_number: 1,
                            sti_name: "Test Step",
                            step_code: "DUM-001"
                        ]
                    }
                    return null
                }
            ]
            return closure.call(mockSql)
        }
    }
    
    private void mockDatabaseFailure() {
        // Mock database connection failure
        DatabaseUtil.metaClass.static.withSql = { closure ->
            throw new RuntimeException("Database connection failed")
        }
    }
}