#!/usr/bin/env groovy

package umig.tests.unit.security

import java.util.UUID
import java.sql.SQLException
import groovy.json.JsonBuilder
// EmailSecurityTestBase is in the same package, no import needed

/**
 * EmailTemplateSecurityTest - Concrete security test implementation
 * 
 * Comprehensive email template security testing covering US-067 requirements.
 * Migrates and enhances patterns from test-email-security-simple.groovy with
 * industrial-strength testing infrastructure.
 * 
 * Coverage Areas:
 * - Phase 1 Security Feature Validation (migrated from ad hoc test)
 * - SQL Injection Attack Prevention
 * - Cross-Site Scripting (XSS) Prevention
 * - Command Injection Prevention
 * - Template Injection Prevention
 * - System Access Prevention
 * - File Access Prevention
 * - Control Flow Manipulation Prevention
 * - Script Execution Prevention
 * - Resource Exhaustion Prevention
 * - Template Nesting Attack Prevention
 * - Content Size Validation
 * - Performance Impact Validation
 * 
 * Follows UMIG Testing Standards:
 * - ADR-026: Specific SQL query mocking
 * - Performance requirement: <2ms overhead
 * - Simple Groovy test pattern (no Spock)
 * - 90%+ security coverage target
 * 
 * @author UMIG Test Framework
 * @since 2025-01-17 Sprint 6
 * @version 1.0
 */
class EmailTemplateSecurityTest extends EmailSecurityTestBase {
    
    /**
     * Main test execution method
     * Orchestrates all security test suites
     */
    void runSecurityTests() {
        
        // Test 1: Phase 1 Security Features (migrated from ad hoc test)
        runPhase1SecurityValidation()
        
        // Test 2: SQL Injection Prevention
        runSqlInjectionTests()
        
        // Test 3: XSS Prevention
        runXssPreventionTests()
        
        // Test 4: Command Injection Prevention
        runCommandInjectionTests()
        
        // Test 5: Template Injection Prevention
        runTemplateInjectionTests()
        
        // Test 6: System Access Prevention
        runSystemAccessTests()
        
        // Test 7: File Access Prevention
        runFileAccessTests()
        
        // Test 8: Control Flow Prevention
        runControlFlowTests()
        
        // Test 9: Script Execution Prevention
        runScriptExecutionTests()
        
        // Test 10: Resource Exhaustion Prevention
        runResourceExhaustionTests()
        
        // Test 11: Template Nesting Attack Prevention
        runNestingAttackTests()
        
        // Test 12: Content Size Validation
        runContentSizeTests()
        
        // Test 13: Performance Impact Validation
        runPerformanceImpactTests()
        
        // Generate comprehensive report
        generateSecurityTestReport()
    }
    
    /**
     * Test 1: Phase 1 Security Features Validation
     * Migrates and enhances the basic validation from test-email-security-simple.groovy
     */
    void runPhase1SecurityValidation() {
        setUp("Phase1SecurityFeatures")
        
        println "Testing Phase 1 Security Features (migrated from ad hoc test)"
        println "----------------------------------------"
        
        // Test security constants existence (from original ad hoc test)
        assert MAX_VARIABLE_SIZE_BYTES == 100 * 1024 : "MAX_VARIABLE_SIZE_BYTES should be 100KB"
        assert MAX_TOTAL_EMAIL_SIZE_BYTES == 500 * 1024 : "MAX_TOTAL_EMAIL_SIZE_BYTES should be 500KB"
        println "✅ Security constants validated: MAX_VARIABLE_SIZE_BYTES=${MAX_VARIABLE_SIZE_BYTES}, MAX_TOTAL_EMAIL_SIZE_BYTES=${MAX_TOTAL_EMAIL_SIZE_BYTES}"
        
        // Test basic dangerous pattern detection (enhanced from ad hoc test)
        List<String> basicDangerousPatterns = [
            "system.", "runtime.", "process",
            "file.", "execute", "eval", "script",
            "if ", "for ", "while "
        ]
        
        int blockedPatterns = 0
        basicDangerousPatterns.each { pattern ->
            try {
                emailService.validateTemplateExpression("Template with ${pattern}malicious")
                println "❌ Pattern '${pattern}' was NOT blocked"
            } catch (SecurityException se) {
                blockedPatterns++
                println "✅ Pattern '${pattern}' correctly blocked"
            }
        }
        
        assert blockedPatterns == basicDangerousPatterns.size() : "All basic dangerous patterns should be blocked"
        
        // Test security integration in template processing
        try {
            Map testVariables = [user: "testuser", action: "login"]
            String safeTemplate = "User \${user} performed \${action}"
            String result = emailService.processNotificationTemplate(testVariables, safeTemplate)
            assert result == "User testuser performed login" : "Safe template should process correctly"
            println "✅ Safe template processing works correctly"
        } catch (Exception e) {
            println "❌ Safe template processing failed: ${e.message}"
            assert false : "Safe templates should not be rejected"
        }
        
        testResults["Phase1SecurityFeatures"] = [passed: true]
        tearDown()
    }
    
    /**
     * Test 2: SQL Injection Prevention
     * Tests comprehensive SQL injection attack patterns
     */
    void runSqlInjectionTests() {
        setUp("SqlInjectionPrevention")
        
        println "Testing SQL Injection Prevention"
        println "----------------------------------------"
        
        Map results = runPatternTestSuite(ATTACK_PATTERNS.sql_injection, "SQL_INJECTION")
        
        assert results.failed == 0 : "All SQL injection patterns should be blocked (${results.failed}/${results.total} failed)"
        
        println "✅ SQL Injection Tests: ${results.passed}/${results.total} patterns blocked"
        testResults["SqlInjectionPrevention"] = [passed: true, details: results]
        tearDown()
    }
    
    /**
     * Test 3: Cross-Site Scripting (XSS) Prevention
     * Tests XSS attack patterns in email templates
     */
    void runXssPreventionTests() {
        setUp("XssPrevention")
        
        println "Testing XSS Prevention"
        println "----------------------------------------"
        
        Map results = runPatternTestSuite(ATTACK_PATTERNS.xss_attacks, "XSS")
        
        assert results.failed == 0 : "All XSS patterns should be blocked (${results.failed}/${results.total} failed)"
        
        println "✅ XSS Prevention Tests: ${results.passed}/${results.total} patterns blocked"
        testResults["XssPrevention"] = [passed: true, details: results]
        tearDown()
    }
    
    /**
     * Test 4: Command Injection Prevention
     * Tests system command injection attack patterns
     */
    void runCommandInjectionTests() {
        setUp("CommandInjectionPrevention")
        
        println "Testing Command Injection Prevention"
        println "----------------------------------------"
        
        Map results = runPatternTestSuite(ATTACK_PATTERNS.command_injection, "COMMAND_INJECTION")
        
        assert results.failed == 0 : "All command injection patterns should be blocked (${results.failed}/${results.total} failed)"
        
        println "✅ Command Injection Tests: ${results.passed}/${results.total} patterns blocked"
        testResults["CommandInjectionPrevention"] = [passed: true, details: results]
        tearDown()
    }
    
    /**
     * Test 5: Template Injection Prevention
     * Tests Groovy template injection attack patterns
     */
    void runTemplateInjectionTests() {
        setUp("TemplateInjectionPrevention")
        
        println "Testing Template Injection Prevention"
        println "----------------------------------------"
        
        Map results = runPatternTestSuite(ATTACK_PATTERNS.template_injection, "TEMPLATE_INJECTION")
        
        assert results.failed == 0 : "All template injection patterns should be blocked (${results.failed}/${results.total} failed)"
        
        println "✅ Template Injection Tests: ${results.passed}/${results.total} patterns blocked"
        testResults["TemplateInjectionPrevention"] = [passed: true, details: results]
        tearDown()
    }
    
    /**
     * Test 6: System Access Prevention
     * Tests prevention of system-level access attempts
     */
    void runSystemAccessTests() {
        setUp("SystemAccessPrevention")
        
        println "Testing System Access Prevention"
        println "----------------------------------------"
        
        Map results = runPatternTestSuite(ATTACK_PATTERNS.system_access, "SYSTEM_ACCESS")
        
        assert results.failed == 0 : "All system access patterns should be blocked (${results.failed}/${results.total} failed)"
        
        println "✅ System Access Tests: ${results.passed}/${results.total} patterns blocked"
        testResults["SystemAccessPrevention"] = [passed: true, details: results]
        tearDown()
    }
    
    /**
     * Test 7: File Access Prevention
     * Tests prevention of file system access attempts
     */
    void runFileAccessTests() {
        setUp("FileAccessPrevention")
        
        println "Testing File Access Prevention"
        println "----------------------------------------"
        
        Map results = runPatternTestSuite(ATTACK_PATTERNS.file_access, "FILE_ACCESS")
        
        assert results.failed == 0 : "All file access patterns should be blocked (${results.failed}/${results.total} failed)"
        
        println "✅ File Access Tests: ${results.passed}/${results.total} patterns blocked"
        testResults["FileAccessPrevention"] = [passed: true, details: results]
        tearDown()
    }
    
    /**
     * Test 8: Control Flow Prevention
     * Tests prevention of control flow manipulation
     */
    void runControlFlowTests() {
        setUp("ControlFlowPrevention")
        
        println "Testing Control Flow Prevention"
        println "----------------------------------------"
        
        Map results = runPatternTestSuite(ATTACK_PATTERNS.control_flow, "CONTROL_FLOW")
        
        assert results.failed == 0 : "All control flow patterns should be blocked (${results.failed}/${results.total} failed)"
        
        println "✅ Control Flow Tests: ${results.passed}/${results.total} patterns blocked"
        testResults["ControlFlowPrevention"] = [passed: true, details: results]
        tearDown()
    }
    
    /**
     * Test 9: Script Execution Prevention
     * Tests prevention of dynamic script execution
     */
    void runScriptExecutionTests() {
        setUp("ScriptExecutionPrevention")
        
        println "Testing Script Execution Prevention"
        println "----------------------------------------"
        
        Map results = runPatternTestSuite(ATTACK_PATTERNS.script_execution, "SCRIPT_EXECUTION")
        
        assert results.failed == 0 : "All script execution patterns should be blocked (${results.failed}/${results.total} failed)"
        
        println "✅ Script Execution Tests: ${results.passed}/${results.total} patterns blocked"
        testResults["ScriptExecutionPrevention"] = [passed: true, details: results]
        tearDown()
    }
    
    /**
     * Test 10: Resource Exhaustion Prevention
     * Tests prevention of memory/CPU exhaustion attacks
     */
    void runResourceExhaustionTests() {
        setUp("ResourceExhaustionPrevention")
        
        println "Testing Resource Exhaustion Prevention"
        println "----------------------------------------"
        
        Map results = runPatternTestSuite(ATTACK_PATTERNS.resource_exhaustion, "RESOURCE_EXHAUSTION")
        
        assert results.failed == 0 : "All resource exhaustion patterns should be blocked (${results.failed}/${results.total} failed)"
        
        println "✅ Resource Exhaustion Tests: ${results.passed}/${results.total} patterns blocked"
        testResults["ResourceExhaustionPrevention"] = [passed: true, details: results]
        tearDown()
    }
    
    /**
     * Test 11: Template Nesting Attack Prevention
     * Tests prevention of excessive template nesting
     */
    void runNestingAttackTests() {
        setUp("NestingAttackPrevention")
        
        println "Testing Nesting Attack Prevention"
        println "----------------------------------------"
        
        int blockedNesting = 0
        int totalNesting = NESTING_ATTACKS.size()
        
        NESTING_ATTACKS.each { nestingPattern ->
            if (validatePatternBlocked(nestingPattern, "NESTING")) {
                blockedNesting++
            }
        }
        
        // Test excessive depth
        String deepNesting = createNestedTemplate(10)  // Exceeds MAX_TEMPLATE_DEPTH
        if (validatePatternBlocked(deepNesting, "DEEP_NESTING")) {
            blockedNesting++
        }
        totalNesting++
        
        assert blockedNesting >= totalNesting * 0.8 : "At least 80% of nesting attacks should be blocked"
        
        println "✅ Nesting Attack Tests: ${blockedNesting}/${totalNesting} patterns blocked"
        testResults["NestingAttackPrevention"] = [passed: true, details: [passed: blockedNesting, total: totalNesting]]
        tearDown()
    }
    
    /**
     * Test 12: Content Size Validation
     * Tests email content size limits and variable size limits
     */
    void runContentSizeTests() {
        setUp("ContentSizeValidation")
        
        println "Testing Content Size Validation"
        println "----------------------------------------"
        
        // Test normal size (should pass)
        Map normalVars = [user: "john", action: "login"]
        String normalTemplate = "User \${user} performed \${action}"
        assert validateSizeLimit(normalVars, normalTemplate) : "Normal size content should be accepted"
        println "✅ Normal size content accepted"
        
        // Test oversized variable (should fail)
        Map oversizedVars = createOversizedVariables()
        String smallTemplate = "Small template with \${large_var}"
        
        try {
            emailService.validateContentSize(oversizedVars, smallTemplate)
            println "❌ Oversized variable was NOT rejected"
            assert false : "Oversized variables should be rejected"
        } catch (SecurityException se) {
            println "✅ Oversized variable correctly rejected: ${se.message}"
        }
        
        // Test oversized total content (should fail)
        String hugeTemplate = SIZE_ATTACK_PATTERNS.huge_template
        try {
            emailService.validateContentSize(normalVars, hugeTemplate)
            println "❌ Oversized total content was NOT rejected"
            assert false : "Oversized total content should be rejected"
        } catch (SecurityException se) {
            println "✅ Oversized total content correctly rejected: ${se.message}"
        }
        
        testResults["ContentSizeValidation"] = [passed: true]
        tearDown()
    }
    
    /**
     * Test 13: Performance Impact Validation
     * Ensures security validation has minimal performance impact
     */
    void runPerformanceImpactTests() {
        setUp("PerformanceImpactValidation")
        
        println "Testing Performance Impact"
        println "----------------------------------------"
        
        // Test multiple security validations in sequence
        long performanceStart = System.currentTimeMillis()
        
        Map testVars = [user: "testuser", step: "validation", count: "100"]
        String testTemplate = "User \${user} executing \${step} #\${count}"
        
        // Run 100 security validations to measure average performance
        for (int i = 0; i < 100; i++) {
            try {
                emailService.validateTemplateExpression(testTemplate)
                emailService.validateContentSize(testVars, testTemplate)
            } catch (Exception e) {
                // Ignore expected security exceptions for performance test
            }
        }
        
        long performanceDuration = System.currentTimeMillis() - performanceStart
        double avgPerValidation = performanceDuration / 100.0
        
        println "✅ Performance Test: 100 validations in ${performanceDuration}ms (avg: ${avgPerValidation}ms per validation)"
        
        // Performance requirement: average validation should be fast
        assert avgPerValidation < 1.0 : "Average validation time should be < 1ms (actual: ${avgPerValidation}ms)"
        
        testResults["PerformanceImpactValidation"] = [
            passed: true, 
            details: [totalTime: performanceDuration, avgTime: avgPerValidation]
        ]
        tearDown()
    }
    
    /**
     * Entry point for running all tests
     */
    static void main(String[] args) {
        println "UMIG Email Security Test Suite - Comprehensive Validation"
        println "=========================================================="
        println "US-067: Email Security Implementation Testing"
        println "Coverage: 25+ attack patterns, 13 security test categories"
        println "Framework: UMIG Simple Groovy Test Pattern"
        println "Performance: <2ms overhead requirement"
        println "=========================================================="
        
        EmailTemplateSecurityTest testInstance = new EmailTemplateSecurityTest()
        
        try {
            testInstance.runSecurityTests()
            
            // Final validation - access static testResults from base class
            int totalTests = EmailSecurityTestBase.testResults.size()
            int failedTests = EmailSecurityTestBase.testResults.count { (it.value as Map).passed == false } as int
            
            if (failedTests == 0) {
                println "\n🎉 ALL SECURITY TESTS PASSED!"
                println "✅ ${totalTests} security test categories completed successfully"
                println "✅ 25+ attack patterns validated"
                println "✅ Performance requirements met"
                println "✅ UMIG EmailService security implementation verified"
            } else {
                println "\n⚠️  SECURITY TEST FAILURES DETECTED!"
                println "❌ ${failedTests}/${totalTests} test categories failed"
                println "🔍 Review failed tests above for security vulnerabilities"
                
                // Exit with error code for CI/CD integration
                System.exit(1)
            }
            
        } catch (Exception e) {
            println "❌ CRITICAL ERROR during security testing: ${e.message}"
            e.printStackTrace()
            System.exit(1)
        }
    }
}