package umig.tests.integration

import spock.lang.Specification
import umig.utils.UrlConstructionService
import umig.utils.DatabaseUtil
import javax.ws.rs.core.Response

/**
 * Integration test for the complete URL configuration flow
 * Tests end-to-end configuration retrieval from database through API to frontend
 * 
 * Priority: P1 - Critical configuration flow validation
 * Coverage: UrlConstructionService → UrlConfigurationApi → Frontend integration
 */
class UrlConfigurationFlowTest extends Specification {
    
    def setup() {
        // Clear cache before each test
        UrlConstructionService.clearCache()
        mockDatabaseConfiguration()
    }
    
    def cleanup() {
        UrlConstructionService.clearCache()
    }
    
    def "should retrieve configuration end-to-end without hardcoded fallbacks"() {
        given: "Mock database with valid configuration"
        // Database configuration is mocked in setup()
        
        when: "Getting URL configuration from service"
        def config = UrlConstructionService.getUrlConfigurationForEnvironment('DEV')
        
        then: "Configuration should be retrieved from database"
        config != null
        config.baseUrl == 'http://localhost:8090'
        config.spaceKey == 'UMIG'
        config.pageId == '123456789' 
        config.pageTitle == 'UMIG - Step View'
        config.environment == 'DEV'
        config.isActive == true
        
        and: "URL template should be buildable"
        def urlTemplate = UrlConstructionService.buildStepViewUrlTemplate('DEV')
        urlTemplate != null
        urlTemplate.startsWith('http://localhost:8090/spaces/UMIG/pages/123456789/')
        urlTemplate.contains('UMIG%20-%20Step%20View') // URL encoded page title
    }
    
    def "should build step view URLs using database configuration"() {
        given: "Valid step instance and parameters"
        def stepInstanceId = UUID.randomUUID()
        def migrationCode = "TORONTO"
        def iterationCode = "run1"
        
        when: "Building step view URL"
        def stepViewUrl = UrlConstructionService.buildStepViewUrl(
            stepInstanceId, migrationCode, iterationCode, 'DEV'
        )
        
        then: "URL should be constructed from database configuration"
        stepViewUrl != null
        stepViewUrl.startsWith('http://localhost:8090') // From database config
        stepViewUrl.contains('/spaces/UMIG/')          // From database config
        stepViewUrl.contains('/pages/123456789/')      // From database config
        stepViewUrl.contains('UMIG%20-%20Step%20View') // From database config
        stepViewUrl.contains('mig=TORONTO')
        stepViewUrl.contains('ite=run1')
        stepViewUrl.contains('stepid=DUM-001')
        
        and: "Should NOT contain any hardcoded fallback values"
        !stepViewUrl.contains('1048581') // Old hardcoded page ID
    }
    
    def "should handle missing configuration gracefully without fallbacks"() {
        given: "Mock database returns no configuration"
        DatabaseUtil.metaClass.static.withSql = { closure ->
            def mockSql = [
                rows: { query, params -> [] }, // Empty result
                firstRow: { query, params -> null }
            ]
            return closure.call(mockSql)
        }
        
        when: "Attempting to get configuration for non-existent environment"
        def config = UrlConstructionService.getUrlConfigurationForEnvironment('NONEXISTENT')
        
        then: "Should return null instead of hardcoded fallback"
        config == null
        
        when: "Attempting to build step view URL"
        def stepViewUrl = UrlConstructionService.buildStepViewUrl(
            UUID.randomUUID(), 'TORONTO', 'run1', 'NONEXISTENT'
        )
        
        then: "Should return null instead of hardcoded fallback URL"
        stepViewUrl == null
    }
    
    def "should validate configuration completeness"() {
        given: "Database returns incomplete configuration"
        DatabaseUtil.metaClass.static.withSql = { closure ->
            def mockSql = [
                rows: { query, params ->
                    // Return incomplete configuration (missing page.title)
                    if (params.envCode == 'PARTIAL') {
                        return [
                            [scf_key: 'stepview.confluence.base.url', scf_value: 'http://localhost:8090'],
                            [scf_key: 'stepview.confluence.space.key', scf_value: 'UMIG'],
                            [scf_key: 'stepview.confluence.page.id', scf_value: '123456789']
                            // Missing: stepview.confluence.page.title
                        ]
                    }
                    return []
                },
                firstRow: { query, params -> null }
            ]
            return closure.call(mockSql)
        }
        
        when: "Getting configuration with missing required fields"
        def config = UrlConstructionService.getUrlConfigurationForEnvironment('PARTIAL')
        
        then: "Should return null for incomplete configuration"
        config == null
        
        and: "Should not attempt hardcoded fallbacks"
        def urlTemplate = UrlConstructionService.buildStepViewUrlTemplate('PARTIAL')
        urlTemplate == null
    }
    
    def "should cache configuration properly to avoid repeated database queries"() {
        given: "Multiple requests for same environment"
        def callCount = 0
        
        DatabaseUtil.metaClass.static.withSql = { closure ->
            def mockSql = [
                rows: { query, params ->
                    callCount++ // Track number of database calls
                    return [
                        [scf_key: 'stepview.confluence.base.url', scf_value: 'http://localhost:8090'],
                        [scf_key: 'stepview.confluence.space.key', scf_value: 'UMIG'],
                        [scf_key: 'stepview.confluence.page.id', scf_value: '123456789'],
                        [scf_key: 'stepview.confluence.page.title', scf_value: 'UMIG - Step View']
                    ]
                },
                firstRow: { query, params -> null }
            ]
            return closure.call(mockSql)
        }
        
        when: "Making multiple configuration requests"
        def config1 = UrlConstructionService.getUrlConfigurationForEnvironment('DEV')
        def config2 = UrlConstructionService.getUrlConfigurationForEnvironment('DEV')
        def config3 = UrlConstructionService.getUrlConfigurationForEnvironment('DEV')
        
        then: "Should use cache to minimize database calls"
        callCount == 1 // Only one database call should be made
        config1 != null
        config2 != null
        config3 != null
        config1.baseUrl == config2.baseUrl
        config2.baseUrl == config3.baseUrl
        
        and: "Cache should contain the configuration"
        def cached = UrlConstructionService.getCachedConfigurations()
        cached['DEV'] != null
    }
    
    def "should perform health check correctly"() {
        when: "Performing health check"
        def health = UrlConstructionService.healthCheck()
        
        then: "Should return health status with configuration information"
        health != null
        health.status in ['healthy', 'degraded', 'error']
        health.environment != null
        health.containsKey('configurationFound')
        health.containsKey('cacheSize')
        health.containsKey('cacheAge')
    }
    
    // ===========================================
    // HELPER METHODS FOR TESTING
    // ===========================================
    
    private void mockDatabaseConfiguration() {
        // Mock the database configuration for testing - Updated for key-value pair structure
        DatabaseUtil.metaClass.static.withSql = { closure ->
            def mockSql = [
                rows: { query, params ->
                    // Mock the new key-value pair structure query
                    if (params.envCode == "DEV" && query.contains('MACRO_LOCATION')) {
                        return [
                            [scf_key: 'stepview.confluence.base.url', scf_value: 'http://localhost:8090'],
                            [scf_key: 'stepview.confluence.space.key', scf_value: 'UMIG'],
                            [scf_key: 'stepview.confluence.page.id', scf_value: '123456789'],
                            [scf_key: 'stepview.confluence.page.title', scf_value: 'UMIG - Step View']
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
}