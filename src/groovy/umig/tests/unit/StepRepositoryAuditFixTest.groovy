#!/usr/bin/env groovy

/**
 * StepRepository Audit Fix Test - Code Analysis
 * 
 * Purpose: Verify that StepRepository methods now call InstructionRepository for audit logging
 * Author: Claude AI Assistant  
 * Date: 2025-08-21
 */

// This test performs static code analysis to verify the fix is correctly implemented

println "🚀 StepRepository Audit Fix Test - Code Analysis"
println "==============================================="

def testPassed = true

// Test 1: Check that InstructionRepository is imported
println "\\n🧪 Test 1: Checking InstructionRepository import..."
def stepRepoFile = new File("src/groovy/umig/repository/StepRepository.groovy")

if (!stepRepoFile.exists()) {
    println "❌ FAILED: StepRepository.groovy not found"
    testPassed = false
} else {
    def content = stepRepoFile.text
    
    if (content.contains("import umig.repository.InstructionRepository")) {
        println "✅ PASSED: InstructionRepository is properly imported"
    } else {
        println "❌ FAILED: InstructionRepository import not found"
        testPassed = false
    }
    
    // Test 2: Check completeInstructionWithNotification method
    println "\\n🧪 Test 2: Checking completeInstructionWithNotification method..."
    
    if (content.contains("def instructionRepository = new InstructionRepository()") &&
        content.contains("instructionRepository.completeInstruction(instructionId, userId)")) {
        println "✅ PASSED: completeInstructionWithNotification calls InstructionRepository.completeInstruction"
    } else {
        println "❌ FAILED: completeInstructionWithNotification does not call InstructionRepository.completeInstruction"
        testPassed = false
    }
    
    // Test 3: Check uncompleteInstructionWithNotification method  
    println "\\n🧪 Test 3: Checking uncompleteInstructionWithNotification method..."
    
    if (content.contains("instructionRepository.uncompleteInstruction(instructionId)")) {
        println "✅ PASSED: uncompleteInstructionWithNotification calls InstructionRepository.uncompleteInstruction"
    } else {
        println "❌ FAILED: uncompleteInstructionWithNotification does not call InstructionRepository.uncompleteInstruction"
        testPassed = false
    }
}

// Test 4: Verify InstructionRepository has audit logging
println "\\n🧪 Test 4: Verifying InstructionRepository has audit logging..."
def instructionRepoFile = new File("src/groovy/umig/repository/InstructionRepository.groovy")

if (!instructionRepoFile.exists()) {
    println "❌ FAILED: InstructionRepository.groovy not found"
    testPassed = false
} else {
    def content = instructionRepoFile.text
    
    if (content.contains("AuditLogRepository.logInstructionCompleted") &&
        content.contains("AuditLogRepository.logInstructionUncompleted")) {
        println "✅ PASSED: InstructionRepository contains audit logging calls"
    } else {
        println "❌ FAILED: InstructionRepository missing audit logging calls"
        testPassed = false
    }
}

// Final result
println "\\n" + "="*50
if (testPassed) {
    println "🎉 ALL TESTS PASSED: Audit logging fix is correctly implemented!"
    println ""
    println "Summary of changes verified:"
    println "✅ InstructionRepository import added to StepRepository"
    println "✅ completeInstructionWithNotification calls InstructionRepository.completeInstruction"
    println "✅ uncompleteInstructionWithNotification calls InstructionRepository.uncompleteInstruction"  
    println "✅ InstructionRepository contains proper audit logging calls"
    println ""
    println "🔧 FIX STATUS: COMPLETE - Audit logging should now work for instruction completion/incompletion"
} else {
    println "❌ SOME TESTS FAILED: Audit logging fix needs attention"
    System.exit(1)
}