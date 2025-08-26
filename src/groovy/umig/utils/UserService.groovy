package umig.utils

import umig.repository.UserRepository
import umig.utils.DatabaseUtil
import org.slf4j.Logger
import org.slf4j.LoggerFactory

/**
 * UserService handles the mapping between Confluence users and UMIG application users.
 * 
 * This service addresses the critical authentication architecture issue where Confluence
 * system users (like "admin") don't exist in the UMIG database, causing authentication
 * failures in API operations that require user context for audit trails.
 * 
 * Key Features:
 * - System user fallback for unmapped Confluence users
 * - Optional auto-creation of UMIG users for business users
 * - Session-level caching to avoid repeated database lookups
 * - Full audit trail preservation with proper user context
 * - Configurable behavior for different deployment scenarios
 */
class UserService {
    
    private static final Logger log = LoggerFactory.getLogger(UserService.class)
    
    private static final String SYSTEM_USER_CODE = "SYS"
    private static final String CONFLUENCE_SYSTEM_USER_CODE = "CSU"
    private static final Integer DEFAULT_SYSTEM_USER_ID = 1
    
    // Session-level cache to avoid repeated database lookups
    private static final Map<String, Map> userCache = [:]
    private static UserRepository userRepository = new UserRepository()
    
    // Configuration flags
    private static final boolean AUTO_CREATE_BUSINESS_USERS = true
    private static final boolean USE_SYSTEM_FALLBACK = true
    private static final Set<String> CONFLUENCE_SYSTEM_USERS = [
        'admin', 'system', 'confluence', 'scriptrunner', 'automation'
    ] as Set
    
    /**
     * Gets the UMIG user ID for the current Confluence user with intelligent fallback.
     * 
     * This method implements the core authentication mapping logic:
     * 1. Get current Confluence user
     * 2. Check session cache first
     * 3. Try to find corresponding UMIG user
     * 4. For system users: use system user fallback
     * 5. For business users: optionally auto-create or use system fallback
     * 6. Cache result for session
     * 
     * @return Map containing [userId: Integer, userCode: String, isSystemUser: Boolean, 
     *                         confluenceUsername: String, fallbackReason: String]
     * @throws IllegalStateException if no Confluence user found and no fallback available
     */
    static Map getCurrentUserContext() {
        // Get current Confluence user
        def confluenceUser = getCurrentConfluenceUser()
        if (!confluenceUser) {
            throw new IllegalStateException("Unable to determine current Confluence user")
        }
        
        String confluenceUsername = (confluenceUser as com.atlassian.confluence.user.ConfluenceUser).getName()
        
        // Check session cache first
        if (userCache.containsKey(confluenceUsername)) {
            return userCache[confluenceUsername]
        }
        
        // Try to find corresponding UMIG user
        def umigUser = userRepository.findUserByUsername(confluenceUsername)
        
        Map userContext
        if (umigUser) {
            // Direct mapping found
            userContext = [
                userId: (umigUser as Map).usr_id as Integer,
                userCode: (umigUser as Map).usr_code as String,
                isSystemUser: false,
                confluenceUsername: confluenceUsername,
                fallbackReason: null,
                umigUserExists: true
            ]
        } else {
            // No direct mapping - apply fallback logic
            userContext = applyUserFallbackLogic(confluenceUsername)
        }
        
        // Cache result for session
        userCache[confluenceUsername] = userContext
        return userContext
    }
    
    /**
     * Applies intelligent fallback logic when no direct Confluence→UMIG user mapping exists.
     */
    private static Map applyUserFallbackLogic(String confluenceUsername) {
        // Check if it's a known Confluence system user
        boolean isConfluenceSystemUser = CONFLUENCE_SYSTEM_USERS.contains(confluenceUsername.toLowerCase())
        
        if (isConfluenceSystemUser && USE_SYSTEM_FALLBACK) {
            // Use dedicated Confluence system user or general system user
            def systemUser = getOrCreateConfluenceSystemUser()
            return [
                userId: (systemUser as Map).usr_id as Integer,
                userCode: (systemUser as Map).usr_code as String,
                isSystemUser: true,
                confluenceUsername: confluenceUsername,
                fallbackReason: "Confluence system user mapped to UMIG system user",
                umigUserExists: false
            ]
        }
        
        // For non-system users, decide whether to auto-create or use system fallback
        if (AUTO_CREATE_BUSINESS_USERS && !isConfluenceSystemUser) {
            // Attempt to auto-create UMIG user for business users
            def createdUser = autoCreateUmigUser(confluenceUsername)
            if (createdUser) {
                return [
                    userId: (createdUser as Map).usr_id as Integer,
                    userCode: (createdUser as Map).usr_code as String,
                    isSystemUser: false,
                    confluenceUsername: confluenceUsername,
                    fallbackReason: "Auto-created UMIG user from Confluence user",
                    umigUserExists: false
                ]
            }
        }
        
        // Final fallback: use general system user
        if (USE_SYSTEM_FALLBACK) {
            def systemUser = getOrCreateSystemUser()
            return [
                userId: (systemUser as Map).usr_id as Integer,
                userCode: (systemUser as Map).usr_code as String,
                isSystemUser: true,
                confluenceUsername: confluenceUsername,
                fallbackReason: "Unmapped Confluence user, using system fallback",
                umigUserExists: false
            ]
        }
        
        // No fallback available - this should be rare
        throw new IllegalStateException("No UMIG user found for Confluence user '${confluenceUsername}' and no fallback mechanism enabled")
    }
    
    /**
     * Gets or creates the Confluence System User in UMIG database.
     * This user represents all Confluence system operations.
     */
    private static Map getOrCreateConfluenceSystemUser() {
        def existingUser = userRepository.findUserByUsername(CONFLUENCE_SYSTEM_USER_CODE)
        if (existingUser) {
            return existingUser as Map
        }
        
        // Create Confluence system user
        def userData = [
            usr_code: CONFLUENCE_SYSTEM_USER_CODE,
            usr_first_name: "Confluence",
            usr_last_name: "System",
            usr_email: "confluence.system@umig.local",
            usr_is_admin: false,
            usr_active: true,
            rls_id: getDefaultRoleId(), // Get default role
            usr_confluence_user_id: "confluence_system"
        ]
        
        def createdUser = userRepository.createUser(userData)
        if (createdUser) {
            log.info("Created Confluence system user: ${CONFLUENCE_SYSTEM_USER_CODE}")
            return createdUser as Map
        }
        
        // Fallback to general system user if creation fails
        return getOrCreateSystemUser()
    }
    
    /**
     * Gets or creates the general System User in UMIG database.
     * This user represents all unmapped operations.
     */
    private static Map getOrCreateSystemUser() {
        // Try to get system user by ID first (most common case)
        def existingUser = userRepository.findUserById(DEFAULT_SYSTEM_USER_ID)
        if (existingUser) {
            return existingUser as Map
        }
        
        // Try to find by username
        existingUser = userRepository.findUserByUsername(SYSTEM_USER_CODE)
        if (existingUser) {
            return existingUser as Map
        }
        
        // Create system user
        def userData = [
            usr_code: SYSTEM_USER_CODE,
            usr_first_name: "System",
            usr_last_name: "User",
            usr_email: "system@umig.local",
            usr_is_admin: false,
            usr_active: true,
            rls_id: getDefaultRoleId(),
            usr_confluence_user_id: "system"
        ]
        
        def createdUser = userRepository.createUser(userData)
        if (createdUser) {
            log.info("Created system user: ${SYSTEM_USER_CODE}")
            return createdUser as Map
        }
        
        // This should never happen, but provide emergency fallback
        throw new IllegalStateException("Unable to create or find system user")
    }
    
    /**
     * Auto-creates an UMIG user from a Confluence user for business users.
     * This is used when a real person (not system user) needs UMIG access.
     */
    private static Map autoCreateUmigUser(String confluenceUsername) {
        try {
            // Get additional Confluence user details if available
            def confluenceUser = getCurrentConfluenceUser()
            def fullName = (confluenceUser as com.atlassian.confluence.user.ConfluenceUser)?.getFullName() ?: confluenceUsername
            def email = (confluenceUser as com.atlassian.confluence.user.ConfluenceUser)?.getEmail() ?: "${confluenceUsername}@domain.local"
            
            // Parse name (simple logic, can be enhanced)
            def nameParts = (fullName as String).split(' ')
            def firstName = (nameParts as String[])[0] ?: confluenceUsername
            def lastName = (nameParts as String[]).length > 1 ? (nameParts as String[])[-1] : "User"
            
            // Generate user code (first letter of first + first letter of last + random)
            def userCode = generateUniqueUserCode(firstName as String, lastName as String)
            
            def userData = [
                usr_code: userCode,
                usr_first_name: firstName,
                usr_last_name: lastName,
                usr_email: email,
                usr_is_admin: false,
                usr_active: true,
                rls_id: getDefaultRoleId(),
                usr_confluence_user_id: confluenceUsername
            ]
            
            def createdUser = userRepository.createUser(userData)
            if (createdUser) {
                log.info("Auto-created UMIG user '${userCode}' for Confluence user '${confluenceUsername}'")
                return createdUser as Map
            }
        } catch (Exception e) {
            log.warn("Failed to auto-create UMIG user for Confluence user '${confluenceUsername}': ${e.message}")
        }
        
        return null
    }
    
    /**
     * Generates a unique 3-character user code.
     */
    private static String generateUniqueUserCode(String firstName, String lastName) {
        def baseCode = (firstName.substring(0, 1) + lastName.substring(0, 1)).toUpperCase()
        
        // Try with numbers 0-9, then letters A-Z
        def suffixes = (0..9).collect { it.toString() } + ('A'..'Z').collect { it }
        
        for (suffix in suffixes) {
            def candidate = baseCode + suffix
            def existing = userRepository.findUserByUsername(candidate)
            if (!existing) {
                return candidate
            }
        }
        
        // If all combinations are taken, use random alphanumeric
        def random = new Random()
        for (int i = 0; i < 10; i++) {
            def randomSuffix = random.nextInt(36).toString(36).toUpperCase()
            def candidate = baseCode + randomSuffix
            def existing = userRepository.findUserByUsername(candidate)
            if (!existing) {
                return candidate
            }
        }
        
        throw new IllegalStateException("Unable to generate unique user code for ${firstName} ${lastName}")
    }
    
    /**
     * Gets the default role ID for new users.
     */
    private static Integer getDefaultRoleId() {
        DatabaseUtil.withSql { sql ->
            def role = sql.firstRow("SELECT rls_id FROM roles_rls WHERE rls_code = 'NORMAL' ORDER BY rls_id LIMIT 1")
            return role?.rls_id as Integer ?: 1 // Fallback to ID 1 if NORMAL role not found
        }
    }
    
    /**
     * Gets the current Confluence user from the thread local context.
     */
    private static def getCurrentConfluenceUser() {
        try {
            return com.atlassian.confluence.user.AuthenticatedUserThreadLocal.get()
        } catch (Exception e) {
            log.warn("UserService: Could not get current Confluence user", e)
            return null
        }
    }
    
    /**
     * Clears the session user cache. Useful for testing or when user data changes.
     */
    static void clearUserCache() {
        userCache.clear()
    }
    
    /**
     * Gets user cache statistics for monitoring/debugging.
     */
    static Map getUserCacheStats() {
        return [
            size: userCache.size(),
            keys: userCache.keySet().collect { it },
            lastAccessed: new Date()
        ]
    }
    
    /**
     * Validates the current user context and returns detailed information.
     * Useful for debugging authentication issues.
     */
    static Map validateCurrentUserContext() {
        def confluenceUser = getCurrentConfluenceUser()
        def userContext = confluenceUser ? getCurrentUserContext() : null
        
        return [
            hasConfluenceUser: confluenceUser != null,
            confluenceUsername: (confluenceUser as com.atlassian.confluence.user.ConfluenceUser)?.getName(),
            confluenceFullName: (confluenceUser as com.atlassian.confluence.user.ConfluenceUser)?.getFullName(),
            confluenceEmail: (confluenceUser as com.atlassian.confluence.user.ConfluenceUser)?.getEmail(),
            userContext: userContext,
            cacheStats: getUserCacheStats(),
            timestamp: new Date()
        ]
    }
}