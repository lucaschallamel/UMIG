#!/usr/bin/env groovy

package umig.tests.unit.security

import umig.utils.EnhancedEmailService
import groovy.text.SimpleTemplateEngine
import java.sql.SQLException

/**
 * EmailSecurityTest - Standalone security test for EnhancedEmailService
 *
 * Tests Phase 1 security implementations:
 * - Template expression validation
 * - Content size limits
 * - Dangerous pattern detection
 *
 * Based on US-067 requirements and migrated from ad hoc tests
 *
 * @author UMIG Test Framework
 * @since 2025-09-06
 */
class EmailSecurityTest {
    
    // Test performance tracking
    static final long PERFORMANCE_THRESHOLD_MS = 2L
    long testStartTime
    String currentTestName
    
    // Test counters
    int passed = 0
    int failed = 0
    
    // Attack patterns from ad hoc tests
    static final List<String> DANGEROUS_PATTERNS = [
        'System.exit(0)',
        'Runtime.getRuntime().exec("rm -rf /")',
        'new File("/etc/passwd").text',
        'Class.forName("java.lang.System")',
        'Thread.sleep(10000)',
        '"".execute()',
        'evaluate("1+1")',
        'Eval.me("malicious")',
        '${def x = System.exit(0)}',
        'import java.io.File',
        'Process proc = "ls".execute()',
        '${System.getProperty("user.home")}',
        '${Runtime.getRuntime().availableProcessors()}',
        '${File.listRoots()}',
        '${Thread.currentThread().interrupt()}',
        '${Class.forName("java.lang.Runtime")}',
        '${new File("/").delete()}',
        '${System.setProperty("key", "value")}',
        '${System.getenv("PATH")}',
        '${Runtime.getRuntime().halt(0)}'
    ]
    
    static void main(String[] args) {
        println "\n" + "="*80
        println "UMIG Email Security Test - US-067 Validation"
        println "="*80
        
        def test = new EmailSecurityTest()
        test.runAllTests()
    }
    
    void runAllTests() {
        println "\nStarting Email Security Tests..."
        println "-" * 60
        
        // Test Phase 1 security features
        testDangerousPatternDetection()
        testContentSizeLimits()
        testTemplateExpressionValidation()
        testPerformanceOverhead()
        
        // Print summary
        println "\n" + "="*80
        println "TEST SUMMARY"
        println "-" * 60
        println "✅ Passed: ${passed}"
        println "❌ Failed: ${failed}"
        println "📊 Total: ${passed + failed}"
        println "🎯 Success Rate: ${passed * 100 / (passed + failed)}%"
        println "="*80
        
        if (failed > 0) {
            println "\n⚠️  SECURITY TESTS FAILED - Review failures above"
            System.exit(1)
        } else {
            println "\n✅ ALL SECURITY TESTS PASSED"
            System.exit(0)
        }
    }
    
    void testDangerousPatternDetection() {
        println "\n📋 Testing Dangerous Pattern Detection..."
        println "-" * 40
        
        DANGEROUS_PATTERNS.each { pattern ->
            startTest("Blocking: ${pattern.take(40)}...")
            
            try {
                // Test template with dangerous pattern - convert GString to String per ADR-031
                def template = "Hello \${userName}, ${pattern}" as String
                
                // Method is private, use reflection directly
                def shouldFail = false
                try {
                    def method = EnhancedEmailService.class.getDeclaredMethod("validateTemplateExpression", String.class)
                    method.setAccessible(true)
                    method.invoke(null, template)
                    shouldFail = true
                } catch (java.lang.reflect.InvocationTargetException ite) {
                    if (ite.cause instanceof SecurityException) {
                        testPassed("Pattern blocked: ${ite.cause.message}")
                    } else {
                        testFailed("Unexpected exception: ${ite.cause}")
                    }
                } catch (NoSuchMethodException e) {
                    testFailed("Method validateTemplateExpression not found: ${e.message}")
                }
                
                if (shouldFail) {
                    testFailed("Dangerous pattern NOT blocked: ${pattern}")
                }
                
            } catch (Exception e) {
                testFailed("Error testing pattern: ${e.message}")
            }
        }
    }
    
    void testContentSizeLimits() {
        println "\n📏 Testing Content Size Limits..."
        println "-" * 40
        
        // Test template size limit (1MB)
        startTest("Template size limit (1MB)")
        try {
            def largeTemplate = "x" * (1024 * 1024 + 1) // 1MB + 1 byte
            def variables = [:] as Map<String, Object>
            
            // Method is private, use reflection directly
            def shouldFail = false
            try {
                def method = EnhancedEmailService.class.getDeclaredMethod("validateContentSize", Map.class, String.class)
                method.setAccessible(true)
                method.invoke(null, variables, largeTemplate)
                shouldFail = true
            } catch (java.lang.reflect.InvocationTargetException ite) {
                if (ite.cause instanceof SecurityException) {
                    testPassed("Large template blocked: ${ite.cause.message}")
                } else {
                    testFailed("Unexpected exception: ${ite.cause}")
                }
            } catch (NoSuchMethodException e) {
                testFailed("Method validateContentSize not found: ${e.message}")
            }
            
            if (shouldFail) {
                testFailed("Large template NOT blocked")
            }
            
        } catch (Exception e) {
            testFailed("Error testing size limits: ${e.message}")
        }
        
        // Test variable size limit (100KB)
        startTest("Variable size limit (100KB)")
        try {
            def template = "Hello \${name}" as String
            def largeValue = "x" * (100 * 1024 + 1) // 100KB + 1 byte
            def variables = [name: largeValue] as Map<String, Object>
            
            // Method is private, use reflection directly
            def shouldFail = false
            try {
                def method = EnhancedEmailService.class.getDeclaredMethod("validateContentSize", Map.class, String.class)
                method.setAccessible(true)
                method.invoke(null, variables, template)
                shouldFail = true
            } catch (java.lang.reflect.InvocationTargetException ite) {
                if (ite.cause instanceof SecurityException) {
                    testPassed("Large variable blocked: ${ite.cause.message}")
                } else {
                    testFailed("Unexpected exception: ${ite.cause}")
                }
            } catch (NoSuchMethodException e) {
                testFailed("Method validateContentSize not found: ${e.message}")
            }
            
            if (shouldFail) {
                testFailed("Large variable NOT blocked")
            }
            
        } catch (Exception e) {
            testFailed("Error testing variable size: ${e.message}")
        }
    }
    
    void testTemplateExpressionValidation() {
        println "\n🛡️ Testing Template Expression Validation..."
        println "-" * 40
        
        // Test safe patterns that should pass
        def safePatterns = [
            'Hello ${userName}',
            'Welcome ${user.name}',
            'Status: ${step?.status}',
            'ID: ${migration.id}',
            '${team.name} - ${team.description}'
        ]
        
        safePatterns.each { pattern ->
            startTest("Safe pattern: ${pattern}")
            try {
                // Method is private, use reflection directly - convert to String per ADR-031
                def patternStr = pattern as String
                def method = EnhancedEmailService.class.getDeclaredMethod("validateTemplateExpression", String.class)
                method.setAccessible(true)
                method.invoke(null, patternStr)
                testPassed("Safe pattern allowed")
            } catch (java.lang.reflect.InvocationTargetException ite) {
                if (ite.cause instanceof SecurityException) {
                    testFailed("Safe pattern blocked: ${ite.cause.message}")
                } else {
                    testFailed("Unexpected exception: ${ite.cause}")
                }
            } catch (NoSuchMethodException e) {
                testFailed("Method validateTemplateExpression not found: ${e.message}")
            } catch (Exception e) {
                testFailed("Error accessing method: ${e.message}")
            }
        }
    }
    
    void testPerformanceOverhead() {
        println "\n⚡ Testing Performance Overhead..."
        println "-" * 40
        
        startTest("Security validation performance (<2ms)")
        
        def template = "Hello \${userName}, your step \${stepName} is \${status}"
        def variables = [
            userName: "Test User",
            stepName: "Data Migration",
            status: "In Progress"
        ]
        
        // Warm up - use reflection since methods are private
        10.times {
            try {
                def validateExpr = EnhancedEmailService.class.getDeclaredMethod("validateTemplateExpression", String.class)
                validateExpr.setAccessible(true)
                validateExpr.invoke(null, template)
                
                def validateSize = EnhancedEmailService.class.getDeclaredMethod("validateContentSize", Map.class, String.class)
                validateSize.setAccessible(true)
                validateSize.invoke(null, variables, template)
            } catch (Exception ex) {
                // Ignore warmup errors
            }
        }
        
        // Measure performance
        def iterations = 100
        def totalTime = 0L
        
        iterations.times {
            def start = System.currentTimeMillis()
            try {
                // Use reflection since methods are private
                def validateExpr = EnhancedEmailService.class.getDeclaredMethod("validateTemplateExpression", String.class)
                validateExpr.setAccessible(true)
                validateExpr.invoke(null, template)
                
                def validateSize = EnhancedEmailService.class.getDeclaredMethod("validateContentSize", Map.class, String.class)
                validateSize.setAccessible(true)
                validateSize.invoke(null, variables, template)
            } catch (Exception ex) {
                // Count the time anyway for consistent measurement
            }
            def end = System.currentTimeMillis()
            totalTime += (end - start)
        }
        
        def avgTime = totalTime / iterations
        if (avgTime <= PERFORMANCE_THRESHOLD_MS) {
            testPassed("Average time: ${avgTime}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)")
        } else {
            testFailed("Performance degradation: ${avgTime}ms > ${PERFORMANCE_THRESHOLD_MS}ms")
        }
    }
    
    // Test utilities
    void startTest(String testName) {
        currentTestName = testName
        testStartTime = System.currentTimeMillis()
        print "  🧪 ${testName}... "
    }
    
    void testPassed(String message = "OK") {
        def duration = System.currentTimeMillis() - testStartTime
        println "✅ PASSED (${duration}ms) - ${message}"
        passed++
    }
    
    void testFailed(String reason) {
        def duration = System.currentTimeMillis() - testStartTime
        println "❌ FAILED (${duration}ms) - ${reason}"
        failed++
    }
}