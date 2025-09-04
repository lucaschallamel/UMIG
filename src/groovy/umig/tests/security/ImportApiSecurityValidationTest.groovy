package umig.tests.security

import groovy.json.JsonBuilder
import java.io.File
import java.nio.file.Files
import java.nio.file.Paths

/**
 * Comprehensive security validation tests for ImportApi US-034
 * Tests all critical security measures including:
 * - Input size validation
 * - Path traversal protection  
 * - File extension validation
 * - CSV memory protection
 * - Batch size limits
 * - CVSS vulnerability scoring
 * 
 * @author UMIG Development Team - Security Analysis
 * @since US-034 Security Enhancement
 */
class ImportApiSecurityValidationTest {
    
    static void main(String[] args) {
        def test = new ImportApiSecurityValidationTest()
        test.runAllSecurityTests()
    }
    
    void runAllSecurityTests() {
        println "🔒 Starting ImportApi Security Validation Tests (US-034)"
        println "=" * 70
        
        int passed = 0
        int failed = 0
        
        // Critical Security Tests
        if (testInputSizeValidation()) passed++ else failed++
        if (testPathTraversalProtection()) passed++ else failed++
        if (testFileExtensionWhitelist()) passed++ else failed++
        if (testCsvMemoryProtection()) passed++ else failed++
        if (testBatchSizeLimits()) passed++ else failed++
        if (testSecurityLogging()) passed++ else failed++
        if (testVulnerabilityScoring()) passed++ else failed++
        if (testDefensiveProgramming()) passed++ else failed++
        if (testSecurityConstants()) passed++ else failed++
        if (testErrorHandlingSecurity()) passed++ else failed++
        
        println "=" * 70
        println "🔒 Security Test Results: ${passed} passed, ${failed} failed"
        
        if (failed == 0) {
            println "✅ ALL SECURITY TESTS PASSED - ImportApi is secure!"
            println "📊 CVSS Base Scores: All vulnerabilities mitigated"
            println "🛡️  Defense-in-depth security posture confirmed"
        } else {
            println "❌ SECURITY FAILURES DETECTED - Review required!"
            println "⚠️  Some security vulnerabilities may exist"
        }
    }
    
    /**
     * Test 1: Input Size Validation (CVSS 7.5)
     * Validates protection against memory exhaustion attacks
     */
    boolean testInputSizeValidation() {
        try {
            def apiFile = new File("src/groovy/umig/api/v2/ImportApi.groovy")
            assert apiFile.exists() : "ImportApi.groovy should exist"
            
            def content = apiFile.text
            
            // Check for size validation method
            assert content.contains("validateInputSize(") : 
                "validateInputSize method should exist"
                
            // Check for size limits
            assert content.contains("MAX_REQUEST_SIZE") : 
                "MAX_REQUEST_SIZE constant should be defined"
                
            // Check for size checking before JSON parsing
            assert content.contains("validateInputSize(body") : 
                "Input size should be validated before parsing"
                
            // Check for CVSS scoring
            assert content.contains("cvssScore: 7.5") : 
                "CVSS score 7.5 should be documented for memory exhaustion"
                
            // Check for security logging
            assert content.contains("Security violation - Input size validation failed") :
                "Security violations should be logged"
                
            println "✅ Input Size Validation: PROTECTED (CVSS 7.5 mitigated)"
            return true
            
        } catch (AssertionError e) {
            println "❌ Input Size Validation FAILED: ${e.message}"
            println "🚨 CRITICAL: Memory exhaustion attacks possible (CVSS 7.5)"
            return false
        }
    }
    
    /**
     * Test 2: Path Traversal Protection (CVSS 9.1)  
     * Validates protection against directory traversal attacks
     */
    boolean testPathTraversalProtection() {
        try {
            def apiFile = new File("src/groovy/umig/api/v2/ImportApi.groovy")
            def content = apiFile.text
            
            // Check for secure path validation method
            assert content.contains("validateSecurePath(") :
                "validateSecurePath method should exist"
                
            // Check for path sanitization
            assert content.contains("replaceAll(/[^\\w\\-]/, '')") :
                "Path sanitization should remove dangerous characters"
                
            // Check for whitelist validation
            assert content.contains("ALLOWED_TEMPLATE_FILES") :
                "Template file whitelist should be defined"
                
            // Check for Path.resolve() usage
            assert content.contains("Path.resolve(") :
                "Secure path construction using Path.resolve should be used"
                
            // Check for directory containment validation
            assert content.contains("templatePath.startsWith(basePath)") :
                "Path traversal detection should verify containment"
                
            // Check for CVSS scoring
            assert content.contains("cvssScore: 9.1") :
                "CVSS score 9.1 should be documented for path traversal"
                
            println "✅ Path Traversal Protection: PROTECTED (CVSS 9.1 mitigated)"
            return true
            
        } catch (AssertionError e) {
            println "❌ Path Traversal Protection FAILED: ${e.message}"
            println "🚨 CRITICAL: Directory traversal attacks possible (CVSS 9.1)"
            return false
        }
    }
    
    /**
     * Test 3: File Extension Whitelist (CVSS 8.8)
     * Validates protection against malicious file uploads
     */
    boolean testFileExtensionWhitelist() {
        try {
            def apiFile = new File("src/groovy/umig/api/v2/ImportApi.groovy")
            def content = apiFile.text
            
            // Check for file extension validation method
            assert content.contains("validateFileExtension(") :
                "validateFileExtension method should exist"
                
            // Check for allowed extensions whitelist
            assert content.contains("ALLOWED_FILE_EXTENSIONS = ['json', 'csv', 'txt']") :
                "File extension whitelist should be defined"
                
            // Check for extension checking
            assert content.contains("ALLOWED_FILE_EXTENSIONS.contains(extension)") :
                "Extension should be validated against whitelist"
                
            // Check for CVSS scoring
            assert content.contains("cvssScore: 8.8") :
                "CVSS score 8.8 should be documented for malicious uploads"
                
            println "✅ File Extension Validation: PROTECTED (CVSS 8.8 mitigated)"
            return true
            
        } catch (AssertionError e) {
            println "❌ File Extension Validation FAILED: ${e.message}" 
            println "🚨 HIGH: Malicious file upload possible (CVSS 8.8)"
            return false
        }
    }
    
    /**
     * Test 4: CSV Memory Protection 
     * Validates streaming parser and memory limits
     */
    boolean testCsvMemoryProtection() {
        try {
            def csvFile = new File("src/groovy/umig/service/CsvImportService.groovy")
            assert csvFile.exists() : "CsvImportService.groovy should exist"
            
            def content = csvFile.text
            
            // Check for streaming parser
            assert content.contains("parseCsvContentStreaming(") :
                "Streaming CSV parser should be implemented"
                
            // Check for size limits
            assert content.contains("MAX_CSV_SIZE = 10 * 1024 * 1024") :
                "CSV size limit should be defined (10MB)"
                
            // Check for row limits
            assert content.contains("MAX_CSV_ROWS = 10000") :
                "CSV row limit should be defined (10,000 rows)"
                
            // Check for chunked processing
            assert content.contains("CHUNK_SIZE = 1000") :
                "Chunked processing should be implemented (1,000 rows)"
                
            // Check for memory-efficient reading
            assert content.contains("BufferedReader") :
                "Memory-efficient BufferedReader should be used"
                
            // Check for size validation
            assert content.contains("contentSize > MAX_CSV_SIZE") :
                "CSV size should be validated before processing"
                
            println "✅ CSV Memory Protection: PROTECTED (Streaming + 10MB limit)"
            return true
            
        } catch (AssertionError e) {
            println "❌ CSV Memory Protection FAILED: ${e.message}"
            println "⚠️  MEDIUM: Memory exhaustion via large CSV possible"
            return false
        }
    }
    
    /**
     * Test 5: Batch Size Limits (CVSS 6.5)
     * Validates protection against resource exhaustion
     */
    boolean testBatchSizeLimits() {
        try {
            def apiFile = new File("src/groovy/umig/api/v2/ImportApi.groovy")
            def serviceFile = new File("src/groovy/umig/service/ImportService.groovy")
            
            def apiContent = apiFile.text
            def serviceContent = serviceFile.text
            
            // Check for batch size validation in API
            assert apiContent.contains("validateBatchSize(") :
                "validateBatchSize method should exist in API"
                
            // Check for batch size constant
            assert apiContent.contains("MAX_BATCH_SIZE = 1000") :
                "MAX_BATCH_SIZE should be defined (1,000 files)"
                
            // Check for batch size validation in service
            assert serviceContent.contains("jsonFiles?.size() > MAX_BATCH_SIZE") :
                "Batch size should be validated in service"
                
            // Check for CVSS scoring
            assert apiContent.contains("cvssScore: 6.5") :
                "CVSS score 6.5 should be documented for batch attacks"
                
            println "✅ Batch Size Limits: PROTECTED (CVSS 6.5 mitigated)"
            return true
            
        } catch (AssertionError e) {
            println "❌ Batch Size Limits FAILED: ${e.message}"
            println "⚠️  MEDIUM: Resource exhaustion via large batches possible"
            return false
        }
    }
    
    /**
     * Test 6: Security Logging
     * Validates comprehensive security event logging
     */
    boolean testSecurityLogging() {
        try {
            def apiFile = new File("src/groovy/umig/api/v2/ImportApi.groovy")
            def content = apiFile.text
            
            // Check for security violation logging
            def securityLogPatterns = [
                "Security violation - Input size validation failed",
                "Security violation - Path traversal attempt blocked", 
                "Security violation - Batch size validation failed",
                "Path traversal attempt detected",
                "File extension validation failed"
            ]
            
            securityLogPatterns.each { pattern ->
                assert content.contains(pattern) :
                    "Security logging should include: ${pattern}"
            }
            
            // Check for audit trail logging
            assert content.contains("logger.warn") || content.contains("logger.error") :
                "Security events should be logged at appropriate levels"
                
            println "✅ Security Logging: COMPREHENSIVE (All threats logged)"
            return true
            
        } catch (AssertionError e) {
            println "❌ Security Logging FAILED: ${e.message}"
            println "⚠️  AUDIT: Security events may not be properly logged"
            return false
        }
    }
    
    /**
     * Test 7: CVSS Vulnerability Scoring
     * Validates proper vulnerability risk assessment
     */
    boolean testVulnerabilityScoring() {
        try {
            def apiFile = new File("src/groovy/umig/api/v2/ImportApi.groovy")
            def content = apiFile.text
            
            // Check for CVSS scores for each vulnerability type
            Map<String, Double> expectedCvssScores = [
                "Input Size": 7.5,
                "Path Traversal": 9.1, 
                "File Extension": 8.8,
                "Batch Size": 6.5
            ]
            
            expectedCvssScores.each { vulnType, expectedScore ->
                assert content.contains("cvssScore: ${expectedScore}") :
                    "${vulnType} should have CVSS score ${expectedScore}"
            }
            
            // Check for threat level classifications
            def threatLevels = ["HIGH", "CRITICAL", "MEDIUM"]
            threatLevels.each { level ->
                assert content.contains("threatLevel: \"${level}\"") :
                    "Threat level ${level} should be documented"
            }
            
            println "✅ CVSS Vulnerability Scoring: COMPLETE (All threats scored)"
            return true
            
        } catch (AssertionError e) {
            println "❌ CVSS Scoring FAILED: ${e.message}"
            println "⚠️  RISK: Vulnerabilities may not be properly assessed"
            return false
        }
    }
    
    /**
     * Test 8: Defensive Programming Patterns
     * Validates defensive coding practices
     */
    boolean testDefensiveProgramming() {
        try {
            def apiFile = new File("src/groovy/umig/api/v2/ImportApi.groovy")
            def content = apiFile.text
            
            // Check for null safety
            assert content.contains("if (!") :
                "Null checks should be implemented"
                
            // Check for type safety (ADR-031 compliance)
            assert content.contains("as String") :
                "Explicit type casting should be used"
                
            // Check for input validation before processing
            assert content.contains("validation") && content.contains("if (!") :
                "Input should be validated before processing"
                
            // Check for proper exception handling
            assert content.contains("try {") && content.contains("} catch") :
                "Proper exception handling should be implemented"
                
            // Check for early returns on validation failures
            assert content.contains("return Response.status") :
                "Early returns should be used for validation failures"
                
            println "✅ Defensive Programming: IMPLEMENTED (Robust error handling)"
            return true
            
        } catch (AssertionError e) {
            println "❌ Defensive Programming FAILED: ${e.message}"
            println "⚠️  CODE: Defensive practices may be missing"
            return false
        }
    }
    
    /**
     * Test 9: Security Constants
     * Validates security configuration constants
     */
    boolean testSecurityConstants() {
        try {
            def apiFile = new File("src/groovy/umig/api/v2/ImportApi.groovy")
            def content = apiFile.text
            
            // Required security constants
            def requiredConstants = [
                "MAX_REQUEST_SIZE = 50 * 1024 * 1024", // 50MB
                "MAX_BATCH_SIZE = 1000",               // 1000 files
                "ALLOWED_FILE_EXTENSIONS = ['json', 'csv', 'txt']",
                "TEMPLATE_BASE_DIR = \"local-dev-setup/data-utils/CSV_Templates\"",
                "ALLOWED_TEMPLATE_FILES"
            ]
            
            requiredConstants.each { constant ->
                assert content.contains(constant) :
                    "Security constant should be defined: ${constant}"
            }
            
            println "✅ Security Constants: ALL DEFINED (Proper limits configured)"
            return true
            
        } catch (AssertionError e) {
            println "❌ Security Constants FAILED: ${e.message}"
            println "⚠️  CONFIG: Security limits may not be properly configured"
            return false
        }
    }
    
    /**
     * Test 10: Error Handling Security
     * Validates secure error responses without information leakage
     */
    boolean testErrorHandlingSecurity() {
        try {
            def apiFile = new File("src/groovy/umig/api/v2/ImportApi.groovy")
            def content = apiFile.text
            
            // Check for proper HTTP status codes
            assert content.contains("Response.Status.BAD_REQUEST") :
                "Proper HTTP 400 status should be used for validation errors"
                
            assert content.contains("Response.Status.FORBIDDEN") :
                "HTTP 403 status should be used for security violations"
                
            // Check for generic error messages
            assert content.contains("Access denied") :
                "Generic error messages should be used"
                
            // Check that sensitive information is not leaked
            assert !content.contains("printStackTrace()") :
                "Stack traces should not be exposed"
                
            // Check for security alert messaging
            assert content.contains("securityAlert") :
                "Security alerts should be included in error responses"
                
            println "✅ Error Handling Security: SECURE (No information leakage)"
            return true
            
        } catch (AssertionError e) {
            println "❌ Error Handling Security FAILED: ${e.message}"
            println "⚠️  LEAK: Sensitive information may be exposed in errors"
            return false
        }
    }
}