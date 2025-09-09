#!/usr/bin/env groovy

package umig.tests.unit

/**
 * Direct Audit Logging Test
 * 
 * Purpose: Test audit logging for instruction completion/uncompletion directly
 * Author: Claude AI Assistant
 * Date: 2025-08-21
 */

@Grab('org.postgresql:postgresql:42.6.0')

import umig.utils.DatabaseUtil
import umig.repository.InstructionRepository
import umig.repository.AuditLogRepository
import java.util.UUID

println "🚀 Direct Audit Logging Test - Testing the Fix"
println "=============================================="

try {
    DatabaseUtil.withSql { sql ->
        println "✅ Database connection established"
        
        // Find a test instruction instance that exists and is not completed
        def testInstruction = sql.firstRow('''
            SELECT ini_id, sti_id 
            FROM instructions_instance_ini 
            WHERE ini_is_completed = false 
            LIMIT 1
        ''')
        
        if (!testInstruction) {
            println "❌ No incomplete instruction found for testing"
            return
        }
        
        def iniId = testInstruction.ini_id as UUID
        def stiId = testInstruction.sti_id as UUID
        def testUserId = 1
        
        println "✅ Using test instruction: ${iniId}"
        println "✅ Using test step: ${stiId}"
        
        // Test 1: Direct repository call for completion
        println "\n🧪 Test 1: Calling InstructionRepository.completeInstruction directly..."
        def instructionRepo = new InstructionRepository()
        def affectedRows = instructionRepo.completeInstruction(iniId, testUserId)
        println "✅ Completed ${affectedRows} instruction(s)"
        
        // Check if audit log was created
        println "\n🔍 Checking for audit log entries..."
        def auditEntries = sql.rows('''
            SELECT aud_id, aud_action, aud_entity_type, aud_entity_id, aud_details, aud_timestamp
            FROM audit_log_aud 
            WHERE aud_entity_id = :iniId 
            AND aud_action = 'INSTRUCTION_COMPLETED'
            ORDER BY aud_timestamp DESC
            LIMIT 5
        ''', [iniId: iniId])
        
        println "📊 Found ${auditEntries.size()} audit entries for instruction completion"
        auditEntries.each { entry ->
            println "   - Audit ID: ${entry.aud_id}, Action: ${entry.aud_action}, Time: ${entry.aud_timestamp}"
            println "   - Details: ${entry.aud_details}"
        }
        
        // Test 2: Direct repository call for uncompletion
        println "\n🧪 Test 2: Calling InstructionRepository.uncompleteInstruction directly..."
        def affectedRows2 = instructionRepo.uncompleteInstruction(iniId)
        println "✅ Uncompleted ${affectedRows2} instruction(s)"
        
        // Check if uncompletion audit log was created
        println "\n🔍 Checking for uncompletion audit log entries..."
        def uncompletionAuditEntries = sql.rows('''
            SELECT aud_id, aud_action, aud_entity_type, aud_entity_id, aud_details, aud_timestamp
            FROM audit_log_aud 
            WHERE aud_entity_id = :iniId 
            AND aud_action = 'INSTRUCTION_UNCOMPLETED'
            ORDER BY aud_timestamp DESC
            LIMIT 5
        ''', [iniId: iniId])
        
        println "📊 Found ${uncompletionAuditEntries.size()} audit entries for instruction uncompletion"
        uncompletionAuditEntries.each { entry ->
            println "   - Audit ID: ${entry.aud_id}, Action: ${entry.aud_action}, Time: ${entry.aud_timestamp}"
            println "   - Details: ${entry.aud_details}"
        }
        
        // Test 3: Direct AuditLogRepository call
        println "\n🧪 Test 3: Calling AuditLogRepository methods directly..."
        try {
            AuditLogRepository.logInstructionCompleted(sql, testUserId, iniId, stiId)
            println "✅ Direct AuditLogRepository.logInstructionCompleted call succeeded"
        } catch (Exception e) {
            println "❌ Direct AuditLogRepository.logInstructionCompleted call failed: ${e.message}"
            e.printStackTrace()
        }
        
        try {
            AuditLogRepository.logInstructionUncompleted(sql, testUserId, iniId, stiId)
            println "✅ Direct AuditLogRepository.logInstructionUncompleted call succeeded"
        } catch (Exception e) {
            println "❌ Direct AuditLogRepository.logInstructionUncompleted call failed: ${e.message}"
            e.printStackTrace()
        }
        
        // Final audit count check
        println "\n📈 Final audit log summary for this instruction:"
        def finalCount = sql.rows('''
            SELECT aud_action, COUNT(*) as count
            FROM audit_log_aud 
            WHERE aud_entity_id = :iniId 
            GROUP BY aud_action
            ORDER BY aud_action
        ''', [iniId: iniId])
        
        finalCount.each { entry ->
            println "   - ${entry.aud_action}: ${entry.count} entries"
        }
        
        println "\n✅ Direct Audit Logging Test completed successfully!"
    }
} catch (Exception e) {
    println "❌ Test failed with error: ${e.message}"
    e.printStackTrace()
}