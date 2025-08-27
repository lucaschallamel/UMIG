#!/usr/bin/env groovy

import umig.utils.EnhancedEmailService
import umig.utils.DatabaseUtil
import groovy.sql.Sql
import java.util.UUID

/**
 * Simple EnhancedEmailService Test Script
 * Tests the actual existing methods in EnhancedEmailService
 * Run this in ScriptRunner console
 */

println "=" * 60
println "ENHANCED EMAIL SERVICE TEST - SIMPLE VERSION"
println "=" * 60

def testResults = []

// Test data setup
def testStepInstance = [
    sti_id: UUID.randomUUID(),
    sti_name: "CHK-006-TEST",
    sti_description: "Test checkpoint for email validation",
    sti_sequence: 1,
    sti_status: "OPEN"
]

def testTeam1 = [
    tem_id: 1,
    tem_name: "Infrastructure Team",
    tem_email: "infrastructure@test.com"
]

def testTeam2 = [
    tem_id: 2,
    tem_name: "Application Team", 
    tem_email: "application@test.com"
]

def cutoverTeam = [
    tem_id: 99,
    tem_name: "IT Cutover Team",
    tem_email: "cutover@test.com"
]

def testInstruction = [
    ini_id: UUID.randomUUID(),
    ini_description: "Validate database connectivity",
    ini_sequence: 1,
    ini_is_completed: true,
    sti_id: testStepInstance.sti_id
]

def teams = [testTeam1, testTeam2]

// Migration and Iteration codes for URL construction
def migrationCode = "MIG-001"
def iterationCode = "ITR-2025-01"
def userId = 1

println "\n📧 TEST 1: Step Status Changed Notification"
println "-" * 40
try {
    println "Sending notification for status change: OPEN → IN_PROGRESS"
    println "Step: ${testStepInstance.sti_name}"
    println "Teams: ${teams.collect{it.tem_name}.join(', ')}"
    
    EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
        testStepInstance,
        teams,
        cutoverTeam,
        "OPEN",
        "IN_PROGRESS",
        userId,
        migrationCode,
        iterationCode
    )
    
    println "✅ Status change notification sent successfully"
    testResults << [test: "Step Status Changed", status: "PASSED"]
} catch (Exception e) {
    println "❌ Error: ${e.message}"
    testResults << [test: "Step Status Changed", status: "FAILED", error: e.message]
}

println "\n📧 TEST 2: Step Opened Notification"
println "-" * 40
try {
    println "Sending notification for step opened"
    println "Step: ${testStepInstance.sti_name}"
    
    EnhancedEmailService.sendStepOpenedNotificationWithUrl(
        testStepInstance,
        teams,
        userId,
        migrationCode,
        iterationCode
    )
    
    println "✅ Step opened notification sent successfully"
    testResults << [test: "Step Opened", status: "PASSED"]
} catch (Exception e) {
    println "❌ Error: ${e.message}"
    testResults << [test: "Step Opened", status: "FAILED", error: e.message]
}

println "\n📧 TEST 3: Instruction Completed Notification"
println "-" * 40
try {
    println "Sending notification for instruction completion"
    println "Instruction: ${testInstruction.ini_description}"
    println "Step: ${testStepInstance.sti_name}"
    
    EnhancedEmailService.sendInstructionCompletedNotificationWithUrl(
        testInstruction,
        testStepInstance,
        teams,
        cutoverTeam,
        userId,
        migrationCode,
        iterationCode
    )
    
    println "✅ Instruction completed notification sent successfully"
    testResults << [test: "Instruction Completed", status: "PASSED"]
} catch (Exception e) {
    println "❌ Error: ${e.message}"
    testResults << [test: "Instruction Completed", status: "FAILED", error: e.message]
}

// Check audit log for email activities
println "\n📊 DATABASE VERIFICATION"
println "-" * 40

DatabaseUtil.withSql { sql ->
    try {
        // Check for recent email audit entries
        def recentAudits = sql.rows("""
            SELECT aud_action, aud_entity_type, aud_timestamp 
            FROM audit_log_aud 
            WHERE aud_timestamp >= CURRENT_TIMESTAMP - INTERVAL '5 minutes'
                AND (aud_action LIKE '%EMAIL%' OR aud_entity_type = 'NOTIFICATION')
            ORDER BY aud_timestamp DESC
            LIMIT 10
        """)
        
        if (recentAudits) {
            println "Found ${recentAudits.size()} recent email audit entries:"
            recentAudits.each { audit ->
                println "  - ${audit.aud_action} (${audit.aud_entity_type}) at ${audit.aud_timestamp}"
            }
        } else {
            println "No recent email audit entries found (check audit logging configuration)"
        }
    } catch (Exception e) {
        println "Could not check audit log: ${e.message}"
    }
}

// Summary
println "\n" + "=" * 60
println "TEST SUMMARY"
println "=" * 60

def passed = testResults.count { it.status == "PASSED" }
def failed = testResults.count { it.status == "FAILED" }

testResults.each { result ->
    def icon = result.status == "PASSED" ? "✅" : "❌"
    println "${icon} ${result.test}: ${result.status}"
    if (result.error) {
        println "   Error: ${result.error}"
    }
}

println "\nTotal: ${testResults.size()} tests"
println "Passed: ${passed}"
println "Failed: ${failed}"

if (failed == 0) {
    println "\n🎉 ALL TESTS PASSED!"
} else {
    println "\n⚠️ Some tests failed. Check the errors above."
}

println "\n📮 Check MailHog for emails: http://localhost:8025"
println "If no emails appear, check:"
println "  1. MailHog is running (port 1025 for SMTP)"
println "  2. Email service configuration in Confluence"
println "  3. Email templates are active in database"

return "Test completed: ${passed}/${testResults.size()} passed"