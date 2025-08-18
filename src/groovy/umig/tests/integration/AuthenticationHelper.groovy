package umig.tests.integration

import java.util.Base64
import java.util.Properties
import java.io.File
import java.io.FileInputStream

/**
 * Secure authentication helper for integration tests.
 * Provides secure credential management following security best practices.
 * 
 * Security Features:
 * - Loads credentials from .env file or environment variables
 * - Never exposes credentials in logs or error messages
 * - Uses proper HTTP Basic Auth encoding
 * - Provides fallback mechanisms for credential retrieval
 * 
 * Created: 2025-08-18
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Security: Environment-based credential management
 */
class AuthenticationHelper {
    
    private static final String ENV_FILE_PATH = "local-dev-setup/.env"
    private static String cachedAuthHeader = null
    private static boolean credentialsLoaded = false
    
    /**
     * Get Basic Auth header for HTTP requests
     * @return Base64-encoded Basic Auth header value
     */
    static String getAuthHeader() {
        if (!credentialsLoaded) {
            loadCredentials()
        }
        return cachedAuthHeader
    }
    
    /**
     * Configure HTTP connection with authentication
     * @param connection HttpURLConnection to configure
     */
    static void configureAuthentication(HttpURLConnection connection) {
        def authHeader = getAuthHeader()
        if (authHeader) {
            connection.setRequestProperty("Authorization", "Basic ${authHeader}")
        } else {
            throw new IllegalStateException("Authentication credentials not available")
        }
    }
    
    /**
     * Load credentials from .env file or environment variables
     * Security: Credentials are never logged or exposed in error messages
     */
    private static void loadCredentials() {
        def username = null
        def password = null
        
        try {
            // Try to load from .env file first
            def envFile = findEnvFile()
            if (envFile?.exists()) {
                def properties = loadEnvFile(envFile)
                username = properties.getProperty('POSTMAN_AUTH_USERNAME')
                password = properties.getProperty('POSTMAN_AUTH_PASSWORD')
            }
            
            // Fallback to environment variables
            if (!username || !password) {
                username = username ?: System.getenv('POSTMAN_AUTH_USERNAME')
                password = password ?: System.getenv('POSTMAN_AUTH_PASSWORD')
            }
            
            // Final fallback to system properties
            if (!username || !password) {
                username = username ?: System.getProperty('test.auth.username')
                password = password ?: System.getProperty('test.auth.password')
            }
            
            if (username && password) {
                // Create Basic Auth header
                def credentials = "${username}:${password}"
                cachedAuthHeader = Base64.getEncoder().encodeToString(credentials.getBytes('UTF-8'))
                credentialsLoaded = true
                println "✅ Authentication credentials loaded successfully"
            } else {
                throw new IllegalStateException("Authentication credentials not found in .env file, environment variables, or system properties")
            }
            
        } catch (Exception e) {
            // Security: Never expose actual credentials in error messages
            def sanitizedMessage = e.message?.replaceAll(/[Pp]assword[=:]\s*\S+/, 'password=***')
                                              ?.replaceAll(/[Uu]sername[=:]\s*\S+/, 'username=***')
            throw new IllegalStateException("Failed to load authentication credentials: ${sanitizedMessage}")
        }
    }
    
    /**
     * Find the .env file in the project structure
     * @return File object pointing to .env file or null if not found
     */
    private static File findEnvFile() {
        def currentDir = new File(System.getProperty("user.dir"))
        
        // Look for .env file in common locations
        def possiblePaths = [
            ENV_FILE_PATH,
            "../${ENV_FILE_PATH}",
            "../../${ENV_FILE_PATH}",
            ".env",
            "../.env",
            "../../.env"
        ]
        
        for (def path : possiblePaths) {
            def file = new File(currentDir, path)
            if (file.exists() && file.isFile()) {
                return file
            }
        }
        
        return null
    }
    
    /**
     * Load properties from .env file
     * @param envFile File object pointing to .env file
     * @return Properties object with loaded values
     */
    private static Properties loadEnvFile(File envFile) {
        def properties = new Properties()
        
        envFile.withReader('UTF-8') { reader ->
            reader.eachLine { line ->
                line = line.trim()
                
                // Skip comments and empty lines
                if (line.isEmpty() || line.startsWith('#')) {
                    return
                }
                
                // Parse key=value pairs
                def parts = line.split('=', 2)
                if (parts.length == 2) {
                    def key = parts[0].trim()
                    def value = parts[1].trim()
                    
                    // Remove quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length() - 1)
                    }
                    
                    properties.setProperty(key, value)
                }
            }
        }
        
        return properties
    }
    
    /**
     * Validate that credentials are properly configured
     * @return true if credentials are available, false otherwise
     */
    static boolean validateCredentials() {
        try {
            return getAuthHeader() != null
        } catch (Exception e) {
            return false
        }
    }
    
    /**
     * Clear cached credentials (useful for testing)
     */
    static void clearCache() {
        cachedAuthHeader = null
        credentialsLoaded = false
    }
    
    /**
     * Get sanitized error message (removes sensitive information)
     * @param originalMessage Original error message
     * @return Sanitized message with credentials removed
     */
    static String sanitizeErrorMessage(String originalMessage) {
        return originalMessage?.replaceAll(/[Pp]assword[=:]\s*\S+/, 'password=***')
                              ?.replaceAll(/[Uu]sername[=:]\s*\S+/, 'username=***')
                              ?.replaceAll(/Authorization:\s*Basic\s+\S+/, 'Authorization: Basic ***')
    }
}