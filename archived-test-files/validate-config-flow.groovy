#!/usr/bin/env groovy

/**
 * Simple validation script for URL Configuration Flow
 * Tests the key components without complex dependencies
 */

// Simulate the flow validation
def validateConfigurationFlow() {
    println "=== URL Configuration Flow Validation ==="
    
    def results = [:]
    
    // Test 1: Verify UrlConstructionService exists and has correct methods
    try {
        def serviceFile = new File("src/groovy/umig/utils/UrlConstructionService.groovy")
        def content = serviceFile.text
        
        results.serviceExists = serviceFile.exists()
        results.hasGetSystemConfiguration = content.contains("static Map getSystemConfiguration")
        results.hasProperJoin = content.contains("INNER JOIN environments_env e ON scf.env_id = e.env_id")
        results.hasNoOldColumn = !content.contains("SELECT scf_environment_code") && !content.contains("WHERE scf_environment_code")
        results.hasKeyValueStructure = content.contains("scf_key") && content.contains("scf_value")
        
        println "✅ UrlConstructionService: EXISTS"
        println "✅ Method getSystemConfiguration: ${results.hasGetSystemConfiguration ? 'FOUND' : 'MISSING'}"
        println "✅ Proper JOIN syntax: ${results.hasProperJoin ? 'CORRECT' : 'INCORRECT'}"  
        println "✅ No old column reference: ${results.hasNoOldColumn ? 'CLEAN' : 'STILL HAS OLD COLUMN'}"
        println "✅ Key-value structure: ${results.hasKeyValueStructure ? 'IMPLEMENTED' : 'MISSING'}"
        
    } catch (Exception e) {
        println "❌ UrlConstructionService validation failed: ${e.message}"
        results.serviceExists = false
    }
    
    // Test 2: Verify UrlConfigurationApi exists
    try {
        def apiFile = new File("src/groovy/umig/api/v2/UrlConfigurationApi.groovy")
        def content = apiFile.text
        
        results.apiExists = apiFile.exists()
        results.hasUrlConfigurationEndpoint = content.contains("urlConfiguration(httpMethod: \"GET\"")
        results.hasHealthEndpoint = content.contains("urlConfigurationHealth")
        results.hasErrorHandling = content.contains("Response.status(500)")
        
        println "✅ UrlConfigurationApi: EXISTS"
        println "✅ GET /urlConfiguration endpoint: ${results.hasUrlConfigurationEndpoint ? 'FOUND' : 'MISSING'}"
        println "✅ Health endpoint: ${results.hasHealthEndpoint ? 'FOUND' : 'MISSING'}"
        println "✅ Error handling: ${results.hasErrorHandling ? 'IMPLEMENTED' : 'MISSING'}"
        
    } catch (Exception e) {
        println "❌ UrlConfigurationApi validation failed: ${e.message}"
        results.apiExists = false
    }
    
    // Test 3: Verify iteration-view.js has no hardcoded fallbacks
    try {
        def jsFile = new File("src/groovy/umig/web/js/iteration-view.js")
        def content = jsFile.text
        
        results.jsExists = jsFile.exists()
        results.hasNoHardcodedFallback = !content.contains("/spaces/UMIG/pages/1048581/") && !content.contains("fullPageUrl")
        results.hasProperErrorHandling = content.contains("this.showNotification") && content.contains("return null")
        results.usesServerConfig = content.contains("window.UMIG_ITERATION_CONFIG")
        
        println "✅ iteration-view.js: EXISTS"
        println "✅ No hardcoded fallback URLs: ${results.hasNoHardcodedFallback ? 'CLEAN' : 'STILL HAS HARDCODED VALUES'}"
        println "✅ Proper error handling: ${results.hasProperErrorHandling ? 'IMPLEMENTED' : 'MISSING'}"
        println "✅ Uses server config: ${results.usesServerConfig ? 'YES' : 'NO'}"
        
    } catch (Exception e) {
        println "❌ iteration-view.js validation failed: ${e.message}"
        results.jsExists = false
    }
    
    // Test 4: Check database schema matches expectations
    try {
        def schemaFile = new File("local-dev-setup/liquibase/changelogs/022_create_system_configuration_scf.sql")
        def content = schemaFile.text
        
        results.schemaExists = schemaFile.exists()
        results.hasCorrectTable = content.contains("CREATE TABLE system_configuration_scf")
        results.hasKeyValueFields = content.contains("scf_key VARCHAR") && content.contains("scf_value TEXT")
        results.hasMacroLocationData = content.contains("'MACRO_LOCATION'") && content.contains("stepview.confluence")
        
        println "✅ Database schema: EXISTS"
        println "✅ Correct table structure: ${results.hasCorrectTable ? 'CORRECT' : 'INCORRECT'}"
        println "✅ Key-value fields: ${results.hasKeyValueFields ? 'PRESENT' : 'MISSING'}"
        println "✅ Macro location data: ${results.hasMacroLocationData ? 'SEEDED' : 'MISSING'}"
        
    } catch (Exception e) {
        println "❌ Database schema validation failed: ${e.message}"
        results.schemaExists = false
    }
    
    // Overall assessment
    def criticalTests = [
        results.serviceExists,
        results.hasGetSystemConfiguration, 
        results.hasProperJoin,
        results.hasNoOldColumn,
        results.apiExists,
        results.jsExists,
        results.hasNoHardcodedFallback
    ]
    
    def passedCritical = criticalTests.count { it == true }
    def totalCritical = criticalTests.size()
    
    println "\n=== VALIDATION SUMMARY ==="
    println "Critical Tests Passed: ${passedCritical}/${totalCritical}"
    
    if (passedCritical == totalCritical) {
        println "🎉 ALL CRITICAL TESTS PASSED"
        println "✅ Configuration flow is ready for testing"
        return true
    } else {
        println "❌ Some critical tests failed"
        println "⚠️  Configuration flow needs attention"
        return false
    }
}

// Run the validation
def success = validateConfigurationFlow()
System.exit(success ? 0 : 1)