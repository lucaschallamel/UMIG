package umig.tests.unit

import umig.utils.UrlConstructionService
import umig.utils.DatabaseUtil

/**
 * Unit tests for UrlConstructionService database query fix validation.
 * Ensures the service uses proper JOIN syntax instead of non-existent column.
 * 
 * @author UMIG Development Team
 * @since 2025-08-27
 */
class UrlConstructionServiceValidationTest {
    
    static void main(String[] args) {
        def test = new UrlConstructionServiceValidationTest()
        test.runAllTests()
    }
    
    void runAllTests() {
        println "Starting UrlConstructionService Validation Tests..."
        println "=" * 60
        
        int passed = 0
        int failed = 0
        
        // Run all test methods
        if (testQueryStructureUsesProperJoinSyntax()) passed++ else failed++
        if (testKeyValuePairConversionToExpectedStructure()) passed++ else failed++
        if (testCachePreventsDuplicateDatabaseCalls()) passed++ else failed++
        if (testEnvironmentCodeParameterHandling()) passed++ else failed++
        if (testMissingConfigurationHandling()) passed++ else failed++
        
        println "=" * 60
        println "Test Results: ${passed} passed, ${failed} failed"
        if (failed == 0) {
            println "✅ All UrlConstructionService validation tests passed!"
        } else {
            println "❌ Some tests failed. Please review the output above."
        }
    }
    
    boolean testQueryStructureUsesProperJoinSyntax() {
        try {
            boolean queryValidated = false
            
            // Mock DatabaseUtil to verify query structure
            DatabaseUtil.metaClass.static.withSql = { closure ->
                def mockSql = [
                    rows: { query, params ->
                        // Validate the query structure
                        assert query.contains('INNER JOIN environments_env e ON scf.env_id = e.env_id') :
                            "Query should JOIN with environments_env table"
                        assert query.contains('WHERE e.env_code = :envCode') :
                            "Query should use env_code from environments table"
                        assert query.contains("scf_category = 'MACRO_LOCATION'") :
                            "Query should filter by MACRO_LOCATION category"
                        assert !query.contains('scf_environment_code') :
                            "Query should NOT use the non-existent scf_environment_code column"
                        
                        queryValidated = true
                        
                        // Return mock data
                        return [
                            [scf_key: 'stepview.confluence.base.url', scf_value: 'http://localhost:8090'],
                            [scf_key: 'stepview.confluence.space.key', scf_value: 'UMIG']
                        ]
                    }
                ]
                return closure.call(mockSql)
            }
            
            // When: Getting configuration
            def result = UrlConstructionService.getSystemConfiguration("DEV")
            
            // Then: Query was validated
            assert queryValidated : "Query structure should have been validated"
            assert result != null : "Result should not be null"
            
            println "✅ testQueryStructureUsesProperJoinSyntax passed"
            return true
        } catch (AssertionError e) {
            println "❌ testQueryStructureUsesProperJoinSyntax failed: ${e.message}"
            return false
        } finally {
            // Reset metaClass
            DatabaseUtil.metaClass = null
        }
    }
    
    boolean testKeyValuePairConversionToExpectedStructure() {
        try {
            // Mock DatabaseUtil to return key-value pairs
            DatabaseUtil.metaClass.static.withSql = { closure ->
                def mockSql = [
                    rows: { query, params ->
                        return [
                            [scf_key: 'stepview.confluence.base.url', scf_value: 'http://localhost:8090'],
                            [scf_key: 'stepview.confluence.space.key', scf_value: 'UMIG'],
                            [scf_key: 'stepview.confluence.page.id', scf_value: '123456789'],
                            [scf_key: 'stepview.confluence.page.title', scf_value: 'StepView']
                        ]
                    }
                ]
                return closure.call(mockSql)
            }
            
            // When: Getting configuration
            def result = UrlConstructionService.getSystemConfiguration("DEV")
            
            // Then: Key-value pairs are converted to expected structure
            assert result.scf_base_url == 'http://localhost:8090' :
                "Base URL should be mapped correctly"
            assert result.scf_space_key == 'UMIG' :
                "Space key should be mapped correctly"
            assert result.scf_page_id == '123456789' :
                "Page ID should be mapped correctly"
            assert result.scf_page_title == 'StepView' :
                "Page title should be mapped correctly"
            assert result.scf_environment_code == 'DEV' :
                "Environment code should be included"
            assert result.scf_is_active == true :
                "Active flag should be set"
            
            println "✅ testKeyValuePairConversionToExpectedStructure passed"
            return true
        } catch (AssertionError e) {
            println "❌ testKeyValuePairConversionToExpectedStructure failed: ${e.message}"
            return false
        } finally {
            DatabaseUtil.metaClass = null
        }
    }
    
    boolean testCachePreventsDuplicateDatabaseCalls() {
        try {
            int databaseCallCount = 0
            
            // Mock DatabaseUtil to count calls
            DatabaseUtil.metaClass.static.withSql = { closure ->
                databaseCallCount++
                def mockSql = [
                    rows: { query, params ->
                        return [[scf_key: 'stepview.confluence.base.url', scf_value: 'http://test']]
                    }
                ]
                return closure.call(mockSql)
            }
            
            // Clear cache first
            UrlConstructionService.clearCache()
            
            // First call should hit database
            def result1 = UrlConstructionService.getSystemConfiguration("TEST")
            assert databaseCallCount == 1 : "First call should hit database"
            
            // Second immediate call should use cache
            def result2 = UrlConstructionService.getSystemConfiguration("TEST")
            assert databaseCallCount == 1 : "Second call should use cache"
            
            // Results should be identical
            assert result1.is(result2) : "Cached results should be the same object"
            
            println "✅ testCachePreventsDuplicateDatabaseCalls passed"
            return true
        } catch (AssertionError e) {
            println "❌ testCachePreventsDuplicateDatabaseCalls failed: ${e.message}"
            return false
        } finally {
            DatabaseUtil.metaClass = null
            UrlConstructionService.clearCache()
        }
    }
    
    boolean testEnvironmentCodeParameterHandling() {
        try {
            Map<String, String> capturedParams = null
            
            // Mock DatabaseUtil to capture parameters
            DatabaseUtil.metaClass.static.withSql = { closure ->
                def mockSql = [
                    rows: { query, params ->
                        capturedParams = params as Map<String, String>
                        return []
                    }
                ]
                return closure.call(mockSql)
            }
            
            // Test various environment codes
            def testCases = ["DEV", "TEST", "UAT", "PROD"]
            
            testCases.each { envCode ->
                UrlConstructionService.clearCache()
                UrlConstructionService.getSystemConfiguration(envCode)
                assert capturedParams?.envCode == envCode :
                    "Environment code '${envCode}' should be passed correctly"
            }
            
            println "✅ testEnvironmentCodeParameterHandling passed"
            return true
        } catch (AssertionError e) {
            println "❌ testEnvironmentCodeParameterHandling failed: ${e.message}"
            return false
        } finally {
            DatabaseUtil.metaClass = null
        }
    }
    
    boolean testMissingConfigurationHandling() {
        try {
            // Mock DatabaseUtil to return empty results
            DatabaseUtil.metaClass.static.withSql = { closure ->
                def mockSql = [
                    rows: { query, params ->
                        return [] // No configuration found
                    }
                ]
                return closure.call(mockSql)
            }
            
            // When: Getting configuration for non-existent environment
            def result = UrlConstructionService.getSystemConfiguration("NONEXISTENT")
            
            // Then: Should return null or empty configuration
            assert result == null || result.isEmpty() :
                "Should handle missing configuration gracefully"
            
            println "✅ testMissingConfigurationHandling passed"
            return true
        } catch (AssertionError e) {
            println "❌ testMissingConfigurationHandling failed: ${e.message}"
            return false
        } finally {
            DatabaseUtil.metaClass = null
        }
    }
}