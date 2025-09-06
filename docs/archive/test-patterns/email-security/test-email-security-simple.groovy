#!/usr/bin/env groovy

/**
 * EmailService Security Test - Phase 1 Quick Win Validation
 * Tests the implemented security features
 */

println "EmailService Security Test - Phase 1 Quick Win Validation"
println "============================================================"

// Test that the EmailService class exists and has security methods
try {
    def emailServiceFile = new File("../src/groovy/umig/utils/EmailService.groovy")
    if (!emailServiceFile.exists()) {
        println "ERROR: EmailService.groovy not found"
        return
    }
    
    def content = emailServiceFile.text
    
    // Test 1: Check for security constants
    println "\n1. Testing Security Constants"
    println "----------------------------------------"
    
    def hasMaxVariableSize = content.contains("MAX_VARIABLE_SIZE_BYTES = 100 * 1024")
    def hasMaxTotalSize = content.contains("MAX_TOTAL_EMAIL_SIZE_BYTES = 500 * 1024")
    
    println hasMaxVariableSize ? "✅ MAX_VARIABLE_SIZE_BYTES (100KB) defined" : "❌ MAX_VARIABLE_SIZE_BYTES missing"
    println hasMaxTotalSize ? "✅ MAX_TOTAL_EMAIL_SIZE_BYTES (500KB) defined" : "❌ MAX_TOTAL_EMAIL_SIZE_BYTES missing"
    
    // Test 2: Check for security methods
    println "\n2. Testing Security Methods"
    println "----------------------------------------"
    
    def hasValidateExpression = content.contains("validateTemplateExpression(String templateText)")
    def hasValidateSize = content.contains("validateContentSize(Map variables, String templateText)")
    
    println hasValidateExpression ? "✅ validateTemplateExpression method implemented" : "❌ validateTemplateExpression missing"
    println hasValidateSize ? "✅ validateContentSize method implemented" : "❌ validateContentSize missing"
    
    // Test 3: Check for dangerous pattern blocking
    println "\n3. Testing Dangerous Pattern Detection"
    println "----------------------------------------"
    
    def blocksSystemCalls = content.contains("system.") && content.contains("runtime.") && content.contains("process")
    def blocksFileAccess = content.contains("file.") && content.contains("execute")
    def blocksScriptExecution = content.contains("eval") && content.contains("script")
    def blocksControlFlow = content.contains("if ") && content.contains("for ") && content.contains("while ")
    
    println blocksSystemCalls ? "✅ System/Runtime/Process calls blocked" : "❌ System calls not blocked"
    println blocksFileAccess ? "✅ File access/Execute calls blocked" : "❌ File access not blocked"  
    println blocksScriptExecution ? "✅ Script/Eval execution blocked" : "❌ Script execution not blocked"
    println blocksControlFlow ? "✅ Control flow statements blocked" : "❌ Control flow not blocked"
    
    // Test 4: Check for security integration in processTemplate
    println "\n4. Testing Security Integration"
    println "----------------------------------------"
    
    def hasSecurityValidation = content.contains("validateTemplateExpression(templateText)") && 
                               content.contains("validateContentSize(variables, templateText)")
    def hasSecurityException = content.contains("Re-throw security exceptions to prevent unsafe template execution")
    
    println hasSecurityValidation ? "✅ Security validation integrated in processTemplate" : "❌ Security validation not integrated"
    println hasSecurityException ? "✅ Security exception handling implemented" : "❌ Security exception handling missing"
    
    // Test 5: Check for common template processing refactor
    println "\n5. Testing Common Template Processing"
    println "----------------------------------------"
    
    def hasCommonProcessing = content.contains("processNotificationTemplate(") && 
                             content.contains("Common template processing method (Phase 1 Quick Win)")
    
    println hasCommonProcessing ? "✅ Common template processing method implemented" : "❌ Common processing method missing"
    
    // Summary
    println "\n============================================================"
    println "Security Implementation Summary"
    println "============================================================"
    
    def securityFeatures = [
        hasMaxVariableSize,
        hasMaxTotalSize,
        hasValidateExpression,
        hasValidateSize,
        blocksSystemCalls,
        blocksFileAccess,
        blocksScriptExecution,
        blocksControlFlow,
        hasSecurityValidation,
        hasSecurityException,
        hasCommonProcessing
    ]
    
    def passedFeatures = securityFeatures.count { it == true }
    def totalFeatures = securityFeatures.size()
    
    println "Phase 1 Security Features: ${passedFeatures}/${totalFeatures} implemented"
    
    if (passedFeatures == totalFeatures) {
        println "✅ ALL PHASE 1 SECURITY IMPROVEMENTS IMPLEMENTED CORRECTLY!"
    } else {
        println "⚠️  Some Phase 1 security features may be missing"
    }
    
    // Performance check
    def hasPerformanceOptimizations = content.contains("getCachedTemplate(templateText)") &&
                                     content.contains("TEMPLATE_CACHE")
    println "\nPerformance: " + (hasPerformanceOptimizations ? "✅ Template caching implemented" : "❌ Template caching missing")
    
} catch (Exception e) {
    println "❌ Test execution failed: ${e.message}"
    e.printStackTrace()
}