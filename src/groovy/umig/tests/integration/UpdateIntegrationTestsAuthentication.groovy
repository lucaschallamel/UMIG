#!/usr/bin/env groovy

/**
 * Utility script to add secure authentication to all UMIG integration test files.
 * This script systematically updates integration test files to use the AuthenticationHelper.
 * 
 * Usage: groovy UpdateIntegrationTestsAuthentication.groovy
 * 
 * Created: 2025-08-18
 * Purpose: Mass update of integration tests for secure authentication
 * Security: Ensures all integration tests use proper authentication
 */

import java.util.regex.Pattern

class UpdateIntegrationTestsAuthentication {
    
    private static final String INTEGRATION_TESTS_DIR = "src/groovy/umig/tests/integration"
    private static final String HELPER_METHOD = '''
    /**
     * Create authenticated HTTP connection
     * @param url The URL to connect to
     * @param method HTTP method (GET, POST, PUT, DELETE)
     * @param contentType Content-Type header value (optional)
     * @return Configured HttpURLConnection with authentication
     */
    private HttpURLConnection createAuthenticatedConnection(String url, String method, String contentType = null) {
        def connection = new URL(url).openConnection() as HttpURLConnection
        connection.requestMethod = method
        
        // Add authentication
        AuthenticationHelper.configureAuthentication(connection)
        
        // Add content type if specified
        if (contentType) {
            connection.setRequestProperty("Content-Type", contentType)
        }
        
        // Enable output for POST/PUT operations
        if (method in ['POST', 'PUT']) {
            connection.doOutput = true
        }
        
        return connection
    }
'''

    private static final String AUTH_VALIDATION_CODE = '''
        // Verify authentication credentials are available
        try {
            if (!AuthenticationHelper.validateCredentials()) {
                println "❌ Authentication credentials not available"
                println "   Please ensure .env file contains POSTMAN_AUTH_USERNAME and POSTMAN_AUTH_PASSWORD"
                System.exit(1)
            }
        } catch (Exception e) {
            println "❌ Authentication setup failed: ${AuthenticationHelper.sanitizeErrorMessage(e.message)}"
            System.exit(1)
        }
        
'''

    def updateIntegrationTestFiles() {
        def testDir = new File(INTEGRATION_TESTS_DIR)
        if (!testDir.exists()) {
            println "❌ Integration tests directory not found: ${INTEGRATION_TESTS_DIR}"
            return
        }
        
        def testFiles = testDir.listFiles().findAll { 
            it.name.endsWith('IntegrationTest.groovy') || 
            it.name.endsWith('IntegrationSpec.groovy') ||
            it.name.endsWith('integrationTest.groovy')
        }
        
        // Exclude files that are already updated
        def excludeFiles = ['CrossApiIntegrationTest.groovy', 'MigrationsApiBulkOperationsTest.groovy', 'AuthenticationTest.groovy']
        testFiles = testFiles.findAll { !excludeFiles.contains(it.name) }
        
        println "Found ${testFiles.size()} integration test files to update:"
        testFiles.each { println "  - ${it.name}" }
        
        def updatedFiles = []
        def failedFiles = []
        
        testFiles.each { file ->
            try {
                if (updateTestFile(file)) {
                    updatedFiles << file.name
                    println "✅ Updated: ${file.name}"
                } else {
                    failedFiles << file.name
                    println "⚠️ Skipped: ${file.name} (already updated or no changes needed)"
                }
            } catch (Exception e) {
                failedFiles << file.name
                println "❌ Failed: ${file.name} - ${e.message}"
            }
        }
        
        // Summary
        println """
╔════════════════════════════════════════════════════════════════╗
║  Integration Tests Authentication Update Summary              ║
╚════════════════════════════════════════════════════════════════╝
  Total Files Processed: ${testFiles.size()}
  Successfully Updated: ${updatedFiles.size()}
  Failed/Skipped: ${failedFiles.size()}
  
  Updated Files:"""
        updatedFiles.each { println "    ✅ ${it}" }
        
        if (!failedFiles.isEmpty()) {
            println "\n  Failed/Skipped Files:"
            failedFiles.each { println "    ⚠️ ${it}" }
        }
        
        println "\n  🎉 Authentication update completed!"
        println "  📝 Remember to manually review the updated files and test them."
    }
    
    def updateTestFile(File file) {
        def content = file.text
        def originalContent = content
        def updated = false
        
        // Check if file already has authentication helper
        if (content.contains('createAuthenticatedConnection')) {
            return false // Already updated
        }
        
        // Add security comment to header
        if (!content.contains('Security: Secure authentication')) {
            content = content.replaceAll(
                /(\* Coverage: [^\n]*\n)(\s*\*\/)/,
                '$1 * Security: Secure authentication using environment variables\n$2'
            )
            updated = true
        }
        
        // Add helper method after static initialization
        def staticPattern = /(?s)(static \{[^}]*\})\s*(\n\s*\/\*\*[^*]*\* Setup test data)/
        if (content.contains('static {') && !content.contains('createAuthenticatedConnection')) {
            content = content.replaceAll(staticPattern, "\$1${HELPER_METHOD}\$2")
            updated = true
        }
        
        // Add authentication validation to main method
        def mainMethodPattern = /(?s)(static void main\(String\[\] args\) \{\s*)(.*?)(def testRunner|println)/
        if (content.contains('static void main(String[] args)') && !content.contains('AuthenticationHelper.validateCredentials')) {
            content = content.replaceAll(mainMethodPattern, "\$1${AUTH_VALIDATION_CODE}\$2\$3")
            updated = true
        }
        
        // Basic HTTP connection patterns to update (this is complex, so we'll document the needed changes)
        if (updated) {
            file.text = content
            
            // Add a note about manual HTTP connection updates needed
            def notesFile = new File(file.parent, "${file.name}.UPDATE_NOTES.txt")
            notesFile.text = """
AUTHENTICATION UPDATE NOTES for ${file.name}
===========================================

AUTOMATIC UPDATES COMPLETED:
✅ Added security comment to header
✅ Added createAuthenticatedConnection() helper method  
✅ Added authentication validation to main method

MANUAL UPDATES STILL NEEDED:
⚠️  Update HTTP connections to use authentication

FIND AND REPLACE these patterns manually:

1. Basic URL connections:
   FIND:    def url = new URL("...")"
            def connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "..."
            connection.setRequestProperty("Content-Type", "...")
            connection.doOutput = true
   
   REPLACE: def connection = createAuthenticatedConnection("...", "METHOD", "CONTENT_TYPE")

2. Simple GET requests:
   FIND:    def url = new URL("...")
            def connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
   
   REPLACE: def connection = createAuthenticatedConnection("...", "GET")

TESTING:
After manual updates, test the file by running:
groovy ${file.name}

CLEANUP:
Delete this .UPDATE_NOTES.txt file after completing manual updates.
"""
        }
        
        return updated
    }
    
    static void main(String[] args) {
        println """
╔════════════════════════════════════════════════════════════════╗
║  UMIG Integration Tests Authentication Updater               ║
║  Adds secure authentication to all integration test files    ║
╚════════════════════════════════════════════════════════════════╝
"""
        
        def updater = new UpdateIntegrationTestsAuthentication()
        updater.updateIntegrationTestFiles()
    }
}