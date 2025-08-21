package umig.utils

import com.atlassian.confluence.user.UserAccessor
import com.atlassian.user.User
import com.onresolve.scriptrunner.runner.customisers.WithPlugin
import com.onresolve.scriptrunner.runner.ScriptRunnerImpl
import groovy.transform.CompileStatic
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import javax.servlet.http.HttpServletRequest

/**
 * Authentication service for extracting user context in ScriptRunner/Confluence environment.
 * Provides secure user identification with configurable fallback values.
 */
@WithPlugin("com.atlassian.confluence.plugins.confluence-software-project")
@CompileStatic
class AuthenticationService {
    
    private static final Logger log = LoggerFactory.getLogger(AuthenticationService.class)
    
    private static final String DEFAULT_SYSTEM_USER = "system"
    private static final String ANONYMOUS_USER = "anonymous"
    
    /**
     * Get the current authenticated user from the request context
     * @param request The HTTP servlet request
     * @return Username of authenticated user or appropriate fallback
     */
    static String getCurrentUser(HttpServletRequest request) {
        try {
            // Get Confluence UserAccessor component
            def userAccessor = ScriptRunnerImpl.getPluginAccessor()
                .getClassLoader()
                .loadClass("com.atlassian.confluence.user.UserAccessor")
                .getMethod("getUserAccessor")
                .invoke(null) as UserAccessor
            
            // Try to get user from request
            User user = userAccessor.getUser(request.getRemoteUser())
            
            if (user && user.getName()) {
                return user.getName()
            }
            
            // Check for API token authentication
            String authHeader = request.getHeader("Authorization")
            if (authHeader && authHeader.startsWith("Bearer ")) {
                // Extract username from token if possible
                // This would integrate with your token validation logic
                return extractUserFromToken(authHeader.substring(7))
            }
            
            // No authenticated user found
            return request.getRemoteUser() ?: ANONYMOUS_USER
            
        } catch (Exception e) {
            // Log error and return safe default
            log.error("Failed to get current user: ${e.message}", e)
            return getSystemUser()
        }
    }
    
    /**
     * Get the configured system user for automated operations
     * @return System username from configuration or default
     */
    static String getSystemUser() {
        // Try to get from system property first
        String systemUser = System.getProperty("umig.system.user")
        if (systemUser) {
            return systemUser
        }
        
        // Try environment variable
        systemUser = System.getenv("UMIG_SYSTEM_USER")
        if (systemUser) {
            return systemUser
        }
        
        // Return default
        return DEFAULT_SYSTEM_USER
    }
    
    /**
     * Extract username from API token (placeholder for actual implementation)
     * @param token The API token
     * @return Username associated with token or null
     */
    private static String extractUserFromToken(String token) {
        // This would integrate with your actual token validation
        // For now, return null to fall back to other methods
        return null
    }
    
    /**
     * Check if a username represents a system/automated user
     * @param username The username to check
     * @return true if this is a system user
     */
    static boolean isSystemUser(String username) {
        return username in [DEFAULT_SYSTEM_USER, getSystemUser(), "migration-tool", "api-service"]
    }
}