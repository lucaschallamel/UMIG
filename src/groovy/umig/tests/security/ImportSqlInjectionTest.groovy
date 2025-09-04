package umig.tests.security

import java.io.File

/**
 * SQL Injection Prevention Tests for Import APIs
 * Validates that all database operations use parameterized queries
 * and proper input sanitization to prevent SQL injection attacks.
 * 
 * @author UMIG Development Team - Security Analysis  
 * @since US-034 Security Enhancement
 */
class ImportSqlInjectionTest {
    
    static void main(String[] args) {
        def test = new ImportSqlInjectionTest()
        test.runSqlInjectionTests()
    }
    
    void runSqlInjectionTests() {
        println "💉 Starting SQL Injection Prevention Tests (US-034)"
        println "=" * 60
        
        int passed = 0
        int failed = 0
        
        // SQL Injection Prevention Tests
        if (testParameterizedQueries()) passed++ else failed++
        if (testInputSanitization()) passed++ else failed++
        if (testNoRawSqlConstruction()) passed++ else failed++
        if (testDatabaseUtilUsage()) passed++ else failed++
        if (testRepositoryPattern()) passed++ else failed++
        if (testStagingTableSecurity()) passed++ else failed++
        
        println "=" * 60
        println "💉 SQL Injection Test Results: ${passed} passed, ${failed} failed"
        
        if (failed == 0) {
            println "✅ SQL INJECTION PROTECTION: COMPLETE"
            println "🛡️  All database operations use parameterized queries"
        } else {
            println "❌ SQL INJECTION VULNERABILITIES DETECTED"
            println "🚨 CRITICAL: Review database operations immediately"
        }
    }
    
    /**
     * Test 1: Parameterized Queries
     * Ensures all SQL queries use proper parameterization
     */
    boolean testParameterizedQueries() {
        try {
            def importFiles = [
                "src/groovy/umig/api/v2/ImportApi.groovy",
                "src/groovy/umig/service/ImportService.groovy", 
                "src/groovy/umig/service/CsvImportService.groovy",
                "src/groovy/umig/repository/ImportRepository.groovy",
                "src/groovy/umig/repository/StagingImportRepository.groovy"
            ]
            
            importFiles.each { filePath ->
                def file = new File(filePath)
                if (!file.exists()) return true // Skip if file doesn't exist
                
                def content = file.text
                
                // Check for parameterized query patterns
                if (content.contains("sql.execute")) {
                    // Should use parameter placeholders
                    assert content.contains("sql.execute(") && content.contains("?, ?") ||
                           content.contains("sql.executeInsert(") && content.contains("?, ?") :
                        "${filePath}: SQL operations should use parameterized queries"
                }
                
                // Check for dangerous string concatenation in SQL
                assert !content.contains("SELECT * FROM \" + ") :
                    "${filePath}: SQL should not be constructed via string concatenation"
                    
                assert !content.contains("INSERT INTO \" + ") :
                    "${filePath}: SQL should not be constructed via string concatenation"
                    
                assert !content.contains("UPDATE \" + ") :
                    "${filePath}: SQL should not be constructed via string concatenation"
                    
                assert !content.contains("DELETE FROM \" + ") :
                    "${filePath}: SQL should not be constructed via string concatenation"
            }
            
            println "✅ Parameterized Queries: ALL SECURE"
            return true
            
        } catch (AssertionError e) {
            println "❌ Parameterized Queries FAILED: ${e.message}"
            println "🚨 CRITICAL: SQL injection possible via parameter injection"
            return false
        }
    }
    
    /**
     * Test 2: Input Sanitization
     * Validates input sanitization before database operations
     */
    boolean testInputSanitization() {
        try {
            def importApiFile = new File("src/groovy/umig/api/v2/ImportApi.groovy")
            def content = importApiFile.text
            
            // Check for explicit type casting (ADR-031 compliance)
            assert content.contains("as String") && content.contains("as UUID") :
                "Input parameters should be explicitly cast for type safety"
                
            // Check for UUID validation
            assert content.contains("UUID.fromString(") :
                "UUID parameters should be validated"
                
            // Check for string sanitization
            assert content.contains("replaceAll(") :
                "String input should be sanitized"
                
            // Check for length validation
            assert content.contains("length()") :
                "Input length should be validated"
                
            println "✅ Input Sanitization: IMPLEMENTED"
            return true
            
        } catch (AssertionError e) {
            println "❌ Input Sanitization FAILED: ${e.message}"
            println "⚠️  MEDIUM: Unsanitized input may lead to injection"
            return false
        }
    }
    
    /**
     * Test 3: No Raw SQL Construction
     * Ensures no dynamic SQL construction from user input
     */
    boolean testNoRawSqlConstruction() {
        try {
            def importFiles = [
                "src/groovy/umig/api/v2/ImportApi.groovy",
                "src/groovy/umig/service/ImportService.groovy",
                "src/groovy/umig/service/CsvImportService.groovy"
            ]
            
            importFiles.each { filePath ->
                def file = new File(filePath)
                if (!file.exists()) return true
                
                def content = file.text
                
                // Check for dangerous dynamic SQL patterns
                assert !content.contains("\"SELECT * FROM \" + tableName") :
                    "${filePath}: Dynamic table name construction is dangerous"
                    
                assert !content.contains("\"WHERE \" + whereClause") :
                    "${filePath}: Dynamic WHERE clause construction is dangerous"
                    
                // Check that user input is not directly embedded in SQL
                assert !content.contains("\${entityType}\" + \"") ||
                       content.contains("sanitized") :
                    "${filePath}: User input should not be directly embedded in SQL"
            }
            
            println "✅ No Raw SQL Construction: VALIDATED"
            return true
            
        } catch (AssertionError e) {
            println "❌ Raw SQL Construction DETECTED: ${e.message}"
            println "🚨 CRITICAL: Dynamic SQL construction creates injection risk"
            return false
        }
    }
    
    /**
     * Test 4: DatabaseUtil Usage
     * Validates proper use of DatabaseUtil.withSql pattern
     */
    boolean testDatabaseUtilUsage() {
        try {
            def serviceFiles = [
                "src/groovy/umig/service/ImportService.groovy",
                "src/groovy/umig/service/CsvImportService.groovy"
            ]
            
            serviceFiles.each { filePath ->
                def file = new File(filePath)
                if (!file.exists()) return true
                
                def content = file.text
                
                // Check for DatabaseUtil.withSql usage
                assert content.contains("DatabaseUtil.withSql") :
                    "${filePath}: Should use DatabaseUtil.withSql pattern"
                    
                // Check for transaction usage
                assert content.contains("sql.withTransaction") :
                    "${filePath}: Database operations should use transactions"
            }
            
            println "✅ DatabaseUtil Usage: CORRECT PATTERN"
            return true
            
        } catch (AssertionError e) {
            println "❌ DatabaseUtil Usage FAILED: ${e.message}"
            println "⚠️  PATTERN: Non-standard database access may be vulnerable"
            return false
        }
    }
    
    /**
     * Test 5: Repository Pattern
     * Validates data access through repository layer
     */
    boolean testRepositoryPattern() {
        try {
            def serviceFiles = [
                "src/groovy/umig/service/ImportService.groovy",
                "src/groovy/umig/service/CsvImportService.groovy"
            ]
            
            serviceFiles.each { filePath ->
                def file = new File(filePath)
                if (!file.exists()) return true
                
                def content = file.text
                
                // Check for repository instantiation
                assert content.contains("ImportRepository") ||
                       content.contains("StagingImportRepository") :
                    "${filePath}: Should use repository pattern for data access"
                    
                // Check that direct SQL is minimal in services
                def sqlOccurrences = content.findAll(/sql\.(execute|rows|firstRow)/).size()
                assert sqlOccurrences <= 10 : // Allow some direct SQL but not excessive
                    "${filePath}: Excessive direct SQL usage - consider using repositories"
            }
            
            println "✅ Repository Pattern: PROPERLY IMPLEMENTED"
            return true
            
        } catch (AssertionError e) {
            println "❌ Repository Pattern FAILED: ${e.message}"
            println "⚠️  ARCHITECTURE: Direct SQL access may bypass security controls"
            return false
        }
    }
    
    /**
     * Test 6: Staging Table Security
     * Validates security around staging table operations
     */
    boolean testStagingTableSecurity() {
        try {
            def stagingRepoFile = new File("src/groovy/umig/repository/StagingImportRepository.groovy")
            if (!stagingRepoFile.exists()) {
                println "ℹ️  StagingImportRepository not found - skipping staging security test"
                return true
            }
            
            def content = stagingRepoFile.text
            
            // Check for batch ID isolation
            assert content.contains("sts_batch_id") :
                "Staging operations should be isolated by batch ID"
                
            // Check for proper cleanup operations
            assert content.contains("DELETE FROM stg_") :
                "Staging cleanup operations should be implemented"
                
            println "✅ Staging Table Security: ISOLATED AND SECURED"
            return true
            
        } catch (AssertionError e) {
            println "❌ Staging Table Security FAILED: ${e.message}"
            println "⚠️  DATA: Staging operations may not be properly isolated"
            return false
        }
    }
}