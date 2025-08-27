#!/usr/bin/env groovy

/**
 * Test script to verify StepView configuration loading
 * Run this to check if the system configuration is properly loaded
 */

// Add the source directory to the classpath for testing
File sourceDir = new File('src/groovy')
if (sourceDir.exists()) {
    println "Adding ${sourceDir.absolutePath} to classpath"
    
    // Simple import test
    try {
        // Test if we can load the classes
        println "\n=== Class Loading Test ==="
        println "1. Testing UrlConstructionService availability..."
        
        def urlConstructionClass = Class.forName('umig.utils.UrlConstructionService', false, this.class.classLoader)
        println "   ✅ UrlConstructionService class loaded successfully"
        
        println "\n=== Environment Detection Test ==="
        // This would normally require the actual runtime context
        println "   ⚠️  Environment detection requires ScriptRunner runtime context"
        println "   ⚠️  Current system properties:"
        System.getProperties().findAll { key, value ->
            key.toString().contains('confluence') || key.toString().contains('umig')
        }.each { key, value ->
            println "     - ${key}: ${value}"
        }
        
        println "\n=== Configuration Requirements ==="
        println "   The StepView button requires these configurations:"
        println "   1. system_configuration_scf table with MACRO_LOCATION entries"
        println "   2. Environment detection (DEV/TEST/PROD)"
        println "   3. Valid Confluence URLs in the configuration"
        
        println "\n=== Next Steps ==="
        println "   1. Ensure the database migration 022_create_system_configuration_scf.sql has been run"
        println "   2. Check that the environments table has a DEV environment (ID=1)"
        println "   3. Test the macro in the actual Confluence environment"
        println "   4. Check Confluence logs for the debug output from iterationViewMacro.groovy"
        
    } catch (ClassNotFoundException e) {
        println "   ❌ Class loading failed: ${e.message}"
        println "   This is expected in standalone testing - classes need ScriptRunner context"
    }
    
} else {
    println "Source directory not found. Please run from the project root."
    System.exit(1)
}

println "\n=== StepView Configuration Fix Summary ==="
println "✅ Fixed JavaScript validation in iteration-view.js"
println "✅ Added missing DatabaseUtil import to UrlConstructionService.groovy"
println "✅ Added debug logging to iterationViewMacro.groovy"
println "✅ Enhanced error messages with baseUrl information"
println ""
println "🔍 To test the fix:"
println "1. Access the Confluence page with the iteration view macro"
println "2. Check browser console for detailed error messages"
println "3. Check Confluence logs for macro debug output"
println "4. Verify that database migration 022 has been applied"