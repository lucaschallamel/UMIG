package umig.utils

import com.atlassian.confluence.user.UserAccessor
import com.atlassian.user.User
import com.atlassian.spring.container.ContainerManager
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Role-Based Access Control Utility for UMIG
 * Provides enterprise-grade RBAC implementation for US-082-C security requirements
 * Target security rating: 8.9/10
 * 
 * @since Sprint 7 - US-082-C Entity Migration Standard
 */
class RBACUtil {
    private static final Logger log = LoggerFactory.getLogger(RBACUtil.class)
    private static RBACUtil instance
    private final UserAccessor userAccessor
    private final ScheduledExecutorService cacheCleanupExecutor
    
    // Role definitions - in production, these would be database-driven
    private static final Map<String, Set<String>> ROLE_PERMISSIONS = [
        'SYSTEM_ADMIN': ['ALL'] as Set<String>,
        'ITERATION_TYPE_ADMIN': ['ITERATION_TYPE_CREATE', 'ITERATION_TYPE_UPDATE', 'ITERATION_TYPE_DELETE', 'ITERATION_TYPE_READ'] as Set<String>,
        'MIGRATION_TYPE_ADMIN': ['MIGRATION_TYPE_CREATE', 'MIGRATION_TYPE_UPDATE', 'MIGRATION_TYPE_DELETE', 'MIGRATION_TYPE_READ'] as Set<String>,
        'DATA_ADMIN': ['DATA_CREATE', 'DATA_UPDATE', 'DATA_DELETE', 'DATA_READ'] as Set<String>,
        'VIEWER': ['DATA_READ', 'ITERATION_TYPE_READ', 'MIGRATION_TYPE_READ'] as Set<String>
    ]
    
    // User-role mappings cache (in production, from database)
    private final Map<String, Set<String>> userRoles = new ConcurrentHashMap<>()
    
    // Group-to-role mappings for Confluence integration
    private static final Map<String, Set<String>> GROUP_ROLES = [
        'confluence-administrators': ['SYSTEM_ADMIN'] as Set<String>,
        'umig-admins': ['ITERATION_TYPE_ADMIN', 'MIGRATION_TYPE_ADMIN', 'DATA_ADMIN'] as Set<String>,
        'umig-managers': ['DATA_ADMIN'] as Set<String>,
        'umig-users': ['VIEWER'] as Set<String>,
        'confluence-users': ['VIEWER'] as Set<String>
    ]
    
    private RBACUtil() {
        this.userAccessor = ContainerManager.getComponent("userAccessor") as UserAccessor
        // Initialize with single daemon thread for cache cleanup
        this.cacheCleanupExecutor = Executors.newSingleThreadScheduledExecutor { runnable ->
            Thread thread = new Thread(runnable, "RBAC-Cache-Cleanup")
            thread.setDaemon(true) // Daemon thread for proper shutdown
            return thread
        }
        log.info("RBACUtil initialized with scheduled cache cleanup executor")
    }
    
    static synchronized RBACUtil getInstance() {
        if (instance == null) {
            instance = new RBACUtil()
        }
        return instance
    }
    
    /**
     * Check if user has specific role
     */
    boolean hasRole(String username, String role) {
        if (!username || !role) {
            log.debug("RBAC check failed: missing username or role")
            return false
        }
        
        try {
            def userRoleSet = getUserRoles(username)
            boolean hasRole = userRoleSet.contains(role) || userRoleSet.contains('SYSTEM_ADMIN')
            
            if (!hasRole) {
                log.debug("User ${username} does not have role ${role}. User roles: ${userRoleSet}")
            }
            
            return hasRole
        } catch (Exception e) {
            log.error("Error checking role for user ${username}", e)
            return false
        }
    }
    
    /**
     * Check if user has specific permission
     */
    boolean hasPermission(String username, String permission) {
        if (!username || !permission) {
            return false
        }
        
        try {
            def userRoleSet = getUserRoles(username)
            
            // Check each role for the permission
            for (String userRole : userRoleSet) {
                def permissions = ROLE_PERMISSIONS[userRole]
                if (permissions && (permissions.contains(permission) || permissions.contains('ALL'))) {
                    return true
                }
            }
            
            log.debug("User ${username} does not have permission ${permission}")
            return false
        } catch (Exception e) {
            log.error("Error checking permission for user ${username}", e)
            return false
        }
    }
    
    /**
     * Get all roles for a user
     */
    Set<String> getUserRoles(String username) {
        // Check cache first
        if (userRoles.containsKey(username)) {
            return userRoles[username]
        }
        
        Set<String> roles = new HashSet<>()
        
        try {
            // Get user from Confluence
            User user = userAccessor.getUserByName(username) as User
            if (user == null) {
                log.warn("User not found: ${username}")
                return roles
            }

            // Check user's group memberships using the correct API method
            List<String> groupNames = userAccessor.getGroupNames(user) as List<String>
            groupNames.each { String groupName ->
                def groupRoleSet = GROUP_ROLES[groupName]
                if (groupRoleSet) {
                    roles.addAll(groupRoleSet)
                }
            }

            // Special handling for system admins
            if (userAccessor.isSuperUser(user)) {
                roles.add('SYSTEM_ADMIN')
            }
            
            // Cache the result with TTL (5 minutes)
            userRoles[username] = roles
            
            // Schedule cache cleanup
            scheduleCacheCleanup(username)
            
        } catch (Exception e) {
            log.error("Error determining roles for user ${username}", e)
        }
        
        return roles
    }
    
    /**
     * Invalidate user role cache
     */
    void invalidateUserCache(String username) {
        userRoles.remove(username)
    }
    
    /**
     * Clear entire cache
     */
    void clearCache() {
        userRoles.clear()
    }
    
    /**
     * Schedule cache cleanup after TTL using ScheduledExecutorService
     * Production-ready implementation with proper thread management
     * @param username The username to clean from cache
     */
    private void scheduleCacheCleanup(String username) {
        try {
            cacheCleanupExecutor.schedule({
                userRoles.remove(username)
                log.debug("Cache entry removed for user: ${username}")
            }, 5, TimeUnit.MINUTES)
            log.debug("Cache cleanup scheduled for user: ${username}")
        } catch (Exception e) {
            log.error("Failed to schedule cache cleanup for user ${username}: ${e.message}", e)
            // Fallback: remove immediately if scheduling fails
            userRoles.remove(username)
        }
    }
    
    /**
     * Audit log for security events
     */
    void auditSecurityEvent(String username, String action, String resource, boolean allowed) {
        def message = "Security Event: User=${username}, Action=${action}, Resource=${resource}, Allowed=${allowed}"
        if (allowed) {
            log.info(message)
        } else {
            log.warn(message)
        }
    }
    
    /**
     * Graceful shutdown of cache cleanup executor
     * Should be called during application shutdown to ensure proper cleanup
     */
    void shutdown() {
        if (cacheCleanupExecutor != null && !cacheCleanupExecutor.isShutdown()) {
            log.info("Shutting down RBAC cache cleanup executor...")
            cacheCleanupExecutor.shutdown()
            
            try {
                // Wait for existing tasks to complete
                if (!cacheCleanupExecutor.awaitTermination(10, TimeUnit.SECONDS)) {
                    log.warn("Cache cleanup executor did not terminate gracefully, forcing shutdown")
                    cacheCleanupExecutor.shutdownNow()
                    
                    // Wait again for forced termination
                    if (!cacheCleanupExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                        log.error("Cache cleanup executor did not terminate after forced shutdown")
                    }
                }
                log.info("RBAC cache cleanup executor shutdown completed")
            } catch (InterruptedException e) {
                log.warn("Interrupted while waiting for cache cleanup executor shutdown")
                cacheCleanupExecutor.shutdownNow()
                Thread.currentThread().interrupt() // Restore interrupt status
            }
        }
    }
}