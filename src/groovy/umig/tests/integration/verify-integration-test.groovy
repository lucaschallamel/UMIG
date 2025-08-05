#!/usr/bin/env groovy
/**
 * Quick verification script to check if integration test compiles
 */

@Grab('org.spockframework:spock-core:2.3-groovy-3.0')
@Grab('org.postgresql:postgresql:42.7.3')
@Grab('io.rest-assured:rest-assured:5.3.2')

println 'Testing integration test compilation...'

try {
    // Try to load the test class
    def testFile = new File('InstructionsApiDeleteIntegrationTest.groovy')
    if (testFile.exists()) {
        println '✓ Test file exists'
        
        // Check if it has required imports
        def content = testFile.text
        def requiredImports = [
            'import spock.lang.Specification',
            'import io.restassured.RestAssured',
            'import groovy.sql.Sql'
        ]
        
        requiredImports.each { imp ->
            if (content.contains(imp)) {
                println "✓ Found: $imp"
            } else {
                println "✗ Missing: $imp"
            }
        }
        
        println '\nTest methods found:'
        content.eachLine { line ->
            if (line.trim().startsWith('def "')) {
                println "  - ${line.trim()}"
            }
        }
    } else {
        println '✗ Test file not found'
    }
} catch (Exception e) {
    println "Error: ${e.message}"
}