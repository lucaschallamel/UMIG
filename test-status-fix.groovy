#!/usr/bin/env groovy

/**
 * Test script to verify StatusRepository fix for StepView status update "Error 500" issue
 * 
 * ROOT CAUSE: StatusRepository.findStatusesByType() was aliasing sts_code as 'code' 
 * but frontend JavaScript expected 'sts_code' field
 * 
 * FIX: Removed alias to return sts_code as original field name
 */

// Add the repository to classpath
@GrabResolver(name='local', root='file:///Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/')
@Grab('org.postgresql:postgresql:42.5.1')

import umig.repository.StatusRepository
import groovy.json.JsonBuilder

println "=== StatusRepository Fix Verification Test ==="
println "Testing that StatusRepository.findStatusesByType() returns 'sts_code' field"
println ""

try {
    def statusRepo = new StatusRepository()
    
    // Test the method that was causing the issue
    def stepStatuses = statusRepo.findStatusesByType('Step')
    
    if (stepStatuses && stepStatuses.size() > 0) {
        def firstStatus = stepStatuses[0]
        
        println "✅ SUCCESS: Retrieved ${stepStatuses.size()} statuses for type 'Step'"
        println ""
        println "First status object fields:"
        firstStatus.each { key, value ->
            println "  - ${key}: ${value}"
        }
        
        // Verify the critical field that frontend expects
        if (firstStatus.containsKey('sts_code')) {
            println ""
            println "✅ CRITICAL FIX VERIFIED: 'sts_code' field is present!"
            println "   Frontend can now access status.sts_code without getting 'undefined'"
            println "   This should resolve the Error 500 when updating step status"
        } else {
            println ""
            println "❌ ISSUE: 'sts_code' field is missing - frontend will still get 'undefined'"
            println "   Available fields: ${firstStatus.keySet()}"
        }
        
        // Also verify we still have the other expected fields
        def requiredFields = ['id', 'sts_name', 'sts_color', 'type']
        def missingFields = requiredFields.findAll { !firstStatus.containsKey(it) }
        
        if (missingFields.empty) {
            println "✅ All other required fields present: ${requiredFields}"
        } else {
            println "❌ Missing required fields: ${missingFields}"
        }
        
    } else {
        println "❌ No statuses found for type 'Step' - check database setup"
    }
    
} catch (Exception e) {
    println "❌ Test failed with error:"
    println "   ${e.class.simpleName}: ${e.message}"
    e.printStackTrace()
}

println ""
println "=== Test Complete ==="
