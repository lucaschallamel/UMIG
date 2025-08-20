#!/usr/bin/env groovy

/**
 * Quick test script to validate the status dropdown 500 error fix
 * Tests the updated StepsApi to ensure it handles status updates correctly
 * with Confluence authentication context.
 */

@GrabConfig(systemClassLoader=true)
@Grab('org.postgresql:postgresql:42.6.0')

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import umig.tests.integration.StepsApiIntegrationTest

println "🔧 Testing Status Dropdown 500 Error Fix"
println "=" * 50

try {
    // Create test instance
    def testRunner = new StepsApiIntegrationTest()
    
    // Run the specific test for the status update fix
    def result = testRunner.testStatusUpdateWithConfluenceAuth()
    
    println "Test Name: ${result.test}"
    println "Success: ${result.success ? '✅ PASSED' : '❌ FAILED'}"
    
    if (result.details) {
        println "Details: ${result.details}"
    }
    
    if (result.error) {
        println "Error: ${result.error}"
    }
    
    if (result.success) {
        println "\n🎉 Status dropdown fix is working correctly!"
        println "The API now properly gets userId from Confluence context"
        println "instead of requiring it in the request body."
    } else {
        println "\n⚠️  Status dropdown fix needs attention."
        println "Check the API implementation or authentication setup."
    }
    
} catch (Exception e) {
    println "❌ Test execution failed: ${e.message}"
    e.printStackTrace()
}

println "\n" + "=" * 50
println "Status dropdown fix validation complete"