#!/usr/bin/env groovy

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder

def baseUrl = "http://localhost:8090/rest/scriptrunner/latest/custom"
def jsonSlurper = new JsonSlurper()

// Authentication credentials (from .env)
def username = "admin"
def password = "Spaceop!13"
def auth = "${username}:${password}".bytes.encodeBase64().toString()

println "=" * 60
println "PHASES API VALIDATION TEST"
println "=" * 60

def testResults = []

// Test 1: Get Master Phases
println "\n1. Testing GET /phases/master..."
try {
    def url = new URL("${baseUrl}/phases/master")
    def connection = url.openConnection()
    connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Authorization", "Basic ${auth}")
    
    if (connection.responseCode == 200) {
        def response = jsonSlurper.parse(connection.inputStream)
        println "   ✅ Success: Retrieved ${response.size()} master phases"
        testResults << "GET /phases/master: PASS"
    } else {
        println "   ❌ Failed: HTTP ${connection.responseCode}"
        testResults << "GET /phases/master: FAIL (${connection.responseCode})"
    }
} catch (Exception e) {
    println "   ❌ Error: ${e.message}"
    testResults << "GET /phases/master: ERROR"
}

// Test 2: Get Phase Instances
println "\n2. Testing GET /phases/instance..."
try {
    def url = new URL("${baseUrl}/phases/instance")
    def connection = url.openConnection()
    connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Authorization", "Basic ${auth}")
    
    if (connection.responseCode == 200) {
        def response = jsonSlurper.parse(connection.inputStream)
        println "   ✅ Success: Retrieved ${response.size()} phase instances"
        testResults << "GET /phases/instance: PASS"
    } else {
        println "   ❌ Failed: HTTP ${connection.responseCode}"
        testResults << "GET /phases/instance: FAIL (${connection.responseCode})"
    }
} catch (Exception e) {
    println "   ❌ Error: ${e.message}"
    testResults << "GET /phases/instance: ERROR"
}

// Test 3: Get specific master phase
println "\n3. Testing GET /phases/master/{id}..."
try {
    // First get a master phase ID
    def listUrl = new URL("${baseUrl}/phases/master")
    def listConn = listUrl.openConnection()
    listConn.setRequestProperty("Accept", "application/json")
    listConn.setRequestProperty("Authorization", "Basic ${auth}")
    
    if (listConn.responseCode == 200) {
        def phases = jsonSlurper.parse(listConn.inputStream)
        if (phases.size() > 0) {
            def phaseId = phases[0].phm_id
            
            def url = new URL("${baseUrl}/phases/master/${phaseId}")
            def connection = url.openConnection()
            connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Authorization", "Basic ${auth}")
            
            if (connection.responseCode == 200) {
                def response = jsonSlurper.parse(connection.inputStream)
                println "   ✅ Success: Retrieved master phase '${response.phm_name}'"
                testResults << "GET /phases/master/{id}: PASS"
            } else {
                println "   ❌ Failed: HTTP ${connection.responseCode}"
                testResults << "GET /phases/master/{id}: FAIL (${connection.responseCode})"
            }
        } else {
            println "   ⚠️  No master phases found to test"
            testResults << "GET /phases/master/{id}: SKIP"
        }
    }
} catch (Exception e) {
    println "   ❌ Error: ${e.message}"
    testResults << "GET /phases/master/{id}: ERROR"
}

// Test 4: Get phase instance with control points
println "\n4. Testing control points retrieval..."
try {
    // First get a phase instance ID
    def listUrl = new URL("${baseUrl}/phases/instance")
    def listConn = listUrl.openConnection()
    listConn.setRequestProperty("Accept", "application/json")
    listConn.setRequestProperty("Authorization", "Basic ${auth}")
    
    if (listConn.responseCode == 200) {
        def phases = jsonSlurper.parse(listConn.inputStream)
        if (phases.size() > 0) {
            def phaseId = phases[0].phi_id
            
            def url = new URL("${baseUrl}/phases/${phaseId}/controls")
            def connection = url.openConnection()
            connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Authorization", "Basic ${auth}")
            
            if (connection.responseCode == 200) {
                def response = jsonSlurper.parse(connection.inputStream)
                println "   ✅ Success: Retrieved ${response.size()} control points"
                testResults << "GET /phases/{id}/controls: PASS"
            } else {
                println "   ❌ Failed: HTTP ${connection.responseCode}"
                testResults << "GET /phases/{id}/controls: FAIL (${connection.responseCode})"
            }
        } else {
            println "   ⚠️  No phase instances found to test"
            testResults << "GET /phases/{id}/controls: SKIP"
        }
    }
} catch (Exception e) {
    println "   ❌ Error: ${e.message}"
    testResults << "GET /phases/{id}/controls: ERROR"
}

// Test 5: Test hierarchical filtering
println "\n5. Testing hierarchical filtering..."
try {
    // Get a sequence ID first
    def seqUrl = new URL("${baseUrl}/sequences/instance")
    def seqConn = seqUrl.openConnection()
    seqConn.setRequestProperty("Accept", "application/json")
    seqConn.setRequestProperty("Authorization", "Basic ${auth}")
    
    if (seqConn.responseCode == 200) {
        def sequences = jsonSlurper.parse(seqConn.inputStream)
        if (sequences.size() > 0) {
            def sequenceId = sequences[0].sqi_id
            
            def url = new URL("${baseUrl}/phases/instance?sequenceInstanceId=${sequenceId}")
            def connection = url.openConnection()
            connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Authorization", "Basic ${auth}")
            
            if (connection.responseCode == 200) {
                def response = jsonSlurper.parse(connection.inputStream)
                println "   ✅ Success: Filtered phases by sequence - found ${response.size()} phases"
                testResults << "Hierarchical filtering: PASS"
            } else {
                println "   ❌ Failed: HTTP ${connection.responseCode}"
                testResults << "Hierarchical filtering: FAIL (${connection.responseCode})"
            }
        }
    }
} catch (Exception e) {
    println "   ❌ Error: ${e.message}"
    testResults << "Hierarchical filtering: ERROR"
}

// Test 6: Test phase progress calculation
println "\n6. Testing phase progress calculation..."
try {
    def listUrl = new URL("${baseUrl}/phases/instance")
    def listConn = listUrl.openConnection()
    listConn.setRequestProperty("Accept", "application/json")
    listConn.setRequestProperty("Authorization", "Basic ${auth}")
    
    if (listConn.responseCode == 200) {
        def phases = jsonSlurper.parse(listConn.inputStream)
        if (phases.size() > 0) {
            def phaseId = phases[0].phi_id
            
            def url = new URL("${baseUrl}/phases/${phaseId}/progress")
            def connection = url.openConnection()
            connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Authorization", "Basic ${auth}")
            
            if (connection.responseCode == 200) {
                def response = jsonSlurper.parse(connection.inputStream)
                println "   ✅ Success: Progress calculated - ${response.completed_steps}/${response.total_steps} steps"
                testResults << "GET /phases/{id}/progress: PASS"
            } else {
                println "   ❌ Failed: HTTP ${connection.responseCode}"
                testResults << "GET /phases/{id}/progress: FAIL (${connection.responseCode})"
            }
        }
    }
} catch (Exception e) {
    println "   ❌ Error: ${e.message}"
    testResults << "GET /phases/{id}/progress: ERROR"
}

// Summary
println "\n" + "=" * 60
println "TEST SUMMARY"
println "=" * 60
testResults.each { println it }

def passed = testResults.count { it.contains("PASS") }
def failed = testResults.count { it.contains("FAIL") || it.contains("ERROR") }
def skipped = testResults.count { it.contains("SKIP") }

println "\nTotal: ${testResults.size()} tests"
println "Passed: ${passed}"
println "Failed: ${failed}"
println "Skipped: ${skipped}"

if (failed == 0) {
    println "\n✅ ALL TESTS PASSED!"
} else {
    println "\n❌ SOME TESTS FAILED"
}