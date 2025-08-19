# US-038: RBAC Security Enhancement with Audit Logging and Permission Validation

## User Story

**As a** System Administrator  
**I want** comprehensive security controls and audit logging for the RBAC system  
**So that** I can ensure proper access control, maintain compliance audit trails, and prevent unauthorized privilege escalation in the UMIG application

## Acceptance Criteria

### AC1: Audit Logging Implementation
- **GIVEN** the UMIG application has user and role management
- **WHEN** any role assignment, role change, or `user_is_admin` flag modification occurs
- **THEN** the system must log the change with timestamp, actor, target user, old value, new value, and IP address
- **AND** audit logs must be immutable and stored in a dedicated audit table
- **AND** audit logs must be accessible via REST API with appropriate authorization

### AC2: Permission Validation Logic
- **GIVEN** a user has role and admin flag assignments
- **WHEN** the system validates user permissions
- **THEN** conflicting permissions must be detected and prevented (e.g., USER role with admin flag = true)
- **AND** validation rules must enforce the hierarchy: SUPERADMIN > ADMIN > PILOT > USER
- **AND** validation must occur on all user creation, update, and role assignment operations

### AC3: Row-Level Security Implementation
- **GIVEN** users have different role levels
- **WHEN** querying data through the application
- **THEN** data access must be filtered based on user role automatically
- **AND** SUPERADMIN users can access all data
- **AND** ADMIN users can access data within their scope
- **AND** PILOT and USER roles have restricted data access based on business rules

### AC4: Admin Flag Control and Documentation
- **GIVEN** the `user_is_admin` flag grants SUPERADMIN privileges
- **WHEN** modifying this flag
- **THEN** only existing SUPERADMIN users can make this change
- **AND** the change must require additional validation/confirmation
- **AND** comprehensive audit logging must capture the change
- **AND** system documentation must clearly define admin flag usage and control procedures

### AC5: API Security Enhancements
- **GIVEN** existing REST APIs for user and role management
- **WHEN** accessing security-sensitive endpoints
- **THEN** enhanced authorization checks must be implemented beyond basic `groups: ["confluence-users"]`
- **AND** role-based endpoint access must be enforced
- **AND** audit logs must capture all API access attempts (successful and failed)

### AC6: Two-Layer Authentication Model
- **GIVEN** users access the UMIG application through Confluence
- **WHEN** authenticating user requests
- **THEN** Layer 1 (Confluence authentication) must verify `groups: ["confluence-users"]`
- **AND** Layer 2 (Application authorization) must verify user exists in `users_usr` table
- **AND** user must have valid role: NORMAL/PILOT/ADMIN (no anonymous access)
- **AND** system must reject requests where Confluence user is not in `users_usr` table

### AC7: AuthenticationService.groovy Enhancements
- **GIVEN** current AuthenticationService returns "anonymous" for missing users
- **WHEN** enhancing the authentication service
- **THEN** new `getUserContext()` method must implement two-layer authentication
- **AND** service must return rich `UserContext` object with role, teams, and permissions
- **AND** service must include role validation methods: `hasRole()`, `isAdmin()`, `canAccess()`
- **AND** service must implement 5-minute cache for performance optimization
- **AND** service must maintain backward compatibility with existing `getCurrentUser()` method
- **AND** service must integrate with audit logging for authentication events

### AC8: Enhanced User Context and Caching
- **GIVEN** the need for efficient user context retrieval
- **WHEN** accessing user information across the application
- **THEN** `UserContext` class must include: userId, userName, role, isAdmin, teams, permissions
- **AND** cache must store user context for 5 minutes to improve performance
- **AND** cache must invalidate on role/permission changes
- **AND** SUPERADMIN check must validate `user_is_admin` flag from database

### AC9: Macro-Level RBAC Implementation
- **GIVEN** users access UMIG through Confluence macro pages (IterationView, StepView, etc.)
- **WHEN** user hits any UMIG macro page
- **THEN** system must immediately retrieve user role from `users_usr` + `roles_rls` tables via `AuthenticationService.getUserContext()`
- **AND** each macro must implement different role-based behaviors:
  - **IterationView**: NORMAL (read-only), PILOT (edit status), ADMIN (full control), SUPERADMIN (system config)
  - **StepView**: NORMAL (view details), PILOT (update progress), ADMIN (modify assignments), SUPERADMIN (edit templates)
  - **Other macros**: Similar role-based feature access patterns
- **AND** role-based UI elements must be determined server-side in macro Groovy code (no client-side bypass)
- **AND** user role and permissions must be passed to frontend JavaScript for dynamic UI control
- **AND** 5-minute cached UserContext must enable instant subsequent macro loads
- **AND** unauthorized users must see access denied message with administrator contact information

### AC10: Remove Client-Side Admin Backdoor (CRITICAL SECURITY)
- **GIVEN** the current admin GUI has hardcoded trump users in `AuthenticationManager.js`
- **WHEN** implementing proper RBAC authentication
- **THEN** the following client-side backdoor code MUST be removed immediately:
  - Hardcoded admin trigrams: "ADM", "JAS", "SUP", "SYS" (lines 176-178)
  - Any trigram starting with "A" granting admin access
  - Client-side `createMockUser()` function that bypasses server authentication
- **AND** replace ALL client-side authentication with server-side validation via `AuthenticationService.groovy`
- **AND** ensure NO authentication or authorization logic exists in client-side JavaScript
- **AND** all authentication decisions must be made server-side only
- **AND** remove the fallback to mock authentication completely (no environment exceptions)
- **AND** implement proper error handling when authentication fails (redirect to login, no mock fallback)
- **AND** this is a CRITICAL security vulnerability that must be fixed before ANY production deployment

### AC11: Differential Macro Authentication Strategy
- **GIVEN** UMIG has different types of macros with varying security requirements
- **WHEN** implementing macro-level authentication
- **THEN** two distinct authentication strategies must be implemented:

**Permissive Strategy (Regular Macros: IterationView, StepView)**:
- **AND** implement implicit role discovery from Confluence context + user trigram
- **AND** auto-provision unknown users with NORMAL role in users_usr table
- **AND** provide progressive feature enhancement based on discovered/assigned role
- **AND** always show UI with role-appropriate features (graceful degradation)
- **AND** follow "default allow with restrictions" approach for user experience

**Strict Strategy (Admin GUI Macro)**:
- **AND** implement NO auto-provisioning - user MUST exist in users_usr table
- **AND** user MUST have ADMIN or PILOT role explicitly assigned
- **AND** completely deny access for NORMAL users or undeclared users
- **AND** show "Access Denied" page with "contact administrator" message for unauthorized access
- **AND** check usr_is_admin flag for SUPERADMIN privileges verification
- **AND** follow "default deny unless explicitly authorized" approach for security

**Strategy Pattern Implementation**:
- **AND** implement MacroAuthenticationStrategy interface with authenticate(MacroType, user) method
- **AND** create MacroType enum with REGULAR_MACRO and ADMIN_GUI_MACRO values
- **AND** implement different caching durations (10 minutes for regular macros, 2 minutes for admin GUI)
- **AND** implement PermissiveMacroAuthStrategy with auto-provisioning logic
- **AND** implement StrictMacroAuthStrategy with AccessDeniedException handling
- **AND** enhance AuthenticationService with authenticateForMacro(MacroType, user) method
- **AND** ensure strategy selection is determined by macro type configuration, not user input

## Technical Implementation Notes

### Database Changes (Liquibase Migration)
```sql
-- Audit table for security changes
CREATE TABLE audit_security_changes (
    asc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asc_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    asc_actor_user_id UUID NOT NULL REFERENCES users_usr(usr_id),
    asc_target_user_id UUID NOT NULL REFERENCES users_usr(usr_id),
    asc_action VARCHAR(50) NOT NULL, -- 'ROLE_CHANGE', 'ADMIN_FLAG_CHANGE'
    asc_old_value TEXT,
    asc_new_value TEXT,
    asc_ip_address INET,
    asc_user_agent TEXT
);

-- Enable RLS on sensitive tables
ALTER TABLE users_usr ENABLE ROW LEVEL SECURITY;
ALTER TABLE migrations_mig ENABLE ROW LEVEL SECURITY;
-- Add policies based on user roles
```

### Repository Pattern (AuditSecurityRepository.groovy)
```groovy
class AuditSecurityRepository {
    static List<Map> getAuditTrail(UUID userId, String action = null) {
        return DatabaseUtil.withSql { sql ->
            def query = """
                SELECT asc_id, asc_timestamp, asc_action, asc_old_value, asc_new_value
                FROM audit_security_changes 
                WHERE asc_target_user_id = ?
            """
            def params = [userId as String]
            if (action) {
                query += " AND asc_action = ?"
                params << action
            }
            return sql.rows(query + " ORDER BY asc_timestamp DESC", params)
        }
    }
    
    static void logSecurityChange(UUID actorId, UUID targetId, String action, 
                                String oldValue, String newValue, String ipAddress) {
        DatabaseUtil.withSql { sql ->
            sql.executeInsert("""
                INSERT INTO audit_security_changes 
                (asc_actor_user_id, asc_target_user_id, asc_action, asc_old_value, asc_new_value, asc_ip_address)
                VALUES (?, ?, ?, ?, ?, ?::inet)
            """, [actorId as String, targetId as String, action, oldValue, newValue, ipAddress])
        }
    }
    
    static void logAuthenticationAttempt(String confluenceUserName, String result, String ipAddress) {
        DatabaseUtil.withSql { sql ->
            sql.executeInsert("""
                INSERT INTO audit_security_changes 
                (asc_actor_user_id, asc_target_user_id, asc_action, asc_old_value, asc_new_value, asc_ip_address)
                VALUES (null, null, ?, ?, ?, ?::inet)
            """, ['AUTHENTICATION_ATTEMPT', confluenceUserName, result, ipAddress])
        }
    }
}
```

### Enhanced UsersRepository with Validation
```groovy
class EnhancedUsersRepository {
    static void validateUserPermissions(Map user) {
        def roleId = user.usr_role_id as UUID
        def isAdmin = user.user_is_admin as Boolean
        
        // Get role name for validation
        def role = DatabaseUtil.withSql { sql ->
            sql.firstRow("SELECT rls_name FROM roles_rls WHERE rls_id = ?", [roleId as String])
        }
        
        // Validate no conflicting permissions
        if (role?.rls_name == 'USER' && isAdmin) {
            throw new IllegalArgumentException("USER role cannot have admin privileges")
        }
        // Add more validation rules...
    }
}
```

### API Security Enhancements
```groovy
@BaseScript CustomEndpointDelegate delegate
usersSecurityManagement(httpMethod: "POST", groups: ["confluence-users"]) { request, binding ->
    def currentUser = getCurrentUser()
    
    // Enhanced authorization - only SUPERADMIN can modify admin flags
    if (!isUserSuperAdmin(currentUser.usr_id)) {
        return Response.status(403).entity([error: "Insufficient privileges"]).build()
    }
    
    // Validation and audit logging
    EnhancedUsersRepository.validateUserPermissions(requestData)
    AuditSecurityRepository.logSecurityChange(...)
    
    return Response.ok().build()
}
```

### Macro-Level RBAC Implementation Pattern

#### Server-Side Macro Integration (Groovy)
```groovy
// Example: IterationViewMacro.groovy implementation
@Component
class IterationViewMacro {
    
    String execute(Map<String, String> parameters, String bodyContent, ConversionContext conversionContext) {
        def request = ((DefaultConversionContext) conversionContext).getHttpServletRequest()
        
        try {
            // Immediate role retrieval - no bypass possible
            def userContext = AuthenticationService.getUserContext(request)
            
            // Server-side authorization check
            if (!userContext.isAuthorized) {
                return """
                <div class='umig-error'>
                    <h3>Access Denied</h3>
                    <p>You are not authorized to access UMIG. Please contact your system administrator.</p>
                </div>
                """
            }
            
            // Role-based feature flags determined server-side
            def configJson = new JsonBuilder([
                user: [
                    role: userContext.role,
                    canEdit: userContext.hasRole("PILOT") || userContext.isAdmin,
                    canManage: userContext.hasRole("ADMIN") || userContext.isSuperAdmin,
                    isAdmin: userContext.isAdmin,
                    isSuperAdmin: userContext.isSuperAdmin,
                    permissions: userContext.permissions
                ],
                features: [
                    editStatus: userContext.hasRole("PILOT"),
                    fullControl: userContext.hasRole("ADMIN"),
                    systemConfig: userContext.isSuperAdmin
                ]
            ]).toString()
            
            return buildMacroHtml(configJson, parameters)
            
        } catch (SecurityException e) {
            AuditSecurityRepository.logAuthenticationAttempt(
                "unknown", "MACRO_ACCESS_DENIED", request.remoteAddr
            )
            return """
            <div class='umig-error'>
                <h3>Authentication Failed</h3>
                <p>${e.message}</p>
                <p>Please ensure you are logged into Confluence and have UMIG access.</p>
            </div>
            """
        }
    }
    
    private String buildMacroHtml(String configJson, Map parameters) {
        return """
        <div class="umig-macro-container" data-macro="iteration-view">
            <div id="iteration-view-container"></div>
            <script type="text/javascript">
                // Configuration passed from server-side (no client manipulation possible)
                window.UMIGConfig = ${configJson};
                
                // Initialize macro with role-based features
                if (typeof initializeIterationView === 'function') {
                    initializeIterationView(UMIGConfig);
                }
            </script>
        </div>
        """
    }
}
```

#### Frontend JavaScript Integration Pattern
```javascript
// IterationView frontend integration
function initializeIterationView(config) {
    const userRole = config.user.role;
    const canEdit = config.user.canEdit;
    const isAdmin = config.user.isAdmin;
    
    // Role-based UI rendering
    if (canEdit) {
        document.getElementById('editStatusButton').style.display = 'block';
        enableStatusEditing();
    }
    
    if (isAdmin) {
        document.getElementById('adminControls').style.display = 'block';
        enableFullControl();
    }
    
    if (config.user.isSuperAdmin) {
        document.getElementById('systemConfigPanel').style.display = 'block';
        enableSystemConfiguration();
    }
    
    // Read-only mode for NORMAL users
    if (userRole === 'NORMAL') {
        disableAllEditFeatures();
        showReadOnlyMessage();
    }
}

// StepView role-based features
function initializeStepView(config) {
    const permissions = config.user.permissions;
    
    if (permissions.update_steps) {
        enableProgressUpdates();
    }
    
    if (permissions.manage_assignments) {
        enableAssignmentModification();
    }
    
    if (permissions.edit_templates) {
        enableTemplateEditing();
    }
}
```

#### Differential Macro Authentication Usage Examples

#### Regular Macro Implementation (PermissiveStrategy)
```groovy
@Component
class IterationViewMacro extends UMIGBaseMacro {
    
    String execute(Map<String, String> parameters, String bodyContent, ConversionContext conversionContext) {
        def request = ((DefaultConversionContext) conversionContext).getHttpServletRequest()
        
        try {
            // Use permissive strategy - auto-provision if needed
            def userContext = AuthenticationService.authenticateForMacro(MacroType.REGULAR_MACRO, request)
            
            return buildRegularMacroHtml(userContext, parameters, "iteration-view")
            
        } catch (SecurityException e) {
            return buildErrorResponse("IterationView", e.message)
        }
    }
}
```

#### Admin GUI Macro Implementation (StrictStrategy)
```groovy
@Component 
class AdminGUIMacro extends UMIGBaseMacro {
    
    String execute(Map<String, String> parameters, String bodyContent, ConversionContext conversionContext) {
        def request = ((DefaultConversionContext) conversionContext).getHttpServletRequest()
        
        try {
            // Use strict strategy - must exist and have ADMIN/PILOT role
            def userContext = AuthenticationService.authenticateForMacro(MacroType.ADMIN_GUI_MACRO, request)
            
            return buildAdminGUIMacroHtml(userContext, parameters)
            
        } catch (AccessDeniedException e) {
            return buildAccessDeniedResponse(e.message)
        } catch (SecurityException e) {
            return buildErrorResponse("AdminGUI", e.message) 
        }
    }
    
    private String buildAccessDeniedResponse(String message) {
        return """
        <div class='umig-access-denied'>
            <div class='umig-error-icon'>🔒</div>
            <h2>Access Denied</h2>
            <p>${message}</p>
            <div class='umig-contact-info'>
                <h4>Need Access?</h4>
                <p>Contact your system administrator to request UMIG administration privileges.</p>
                <p><strong>Requirements:</strong> ADMIN or PILOT role in UMIG user management system</p>
            </div>
            <div class='umig-error-code'>Error Code: UMIG_ADMIN_GUI_UNAUTHORIZED</div>
        </div>
        """
    }
}
```

### Macro Registration Pattern
```groovy
// Common pattern for all UMIG macros with differential authentication support
abstract class UMIGBaseMacro implements Macro {
    
    // NEW: Differential authentication based on macro type
    protected UserContext authenticateForMacroType(HttpServletRequest request, MacroType macroType) throws SecurityException {
        return AuthenticationService.authenticateForMacro(macroType, request)
    }
    
    // Legacy method for backward compatibility - defaults to regular macro
    protected UserContext authenticateAndAuthorize(HttpServletRequest request) throws SecurityException {
        return authenticateForMacroType(request, MacroType.REGULAR_MACRO)
    }
    
    protected String buildUnauthorizedResponse(String macroName) {
        return """
        <div class='umig-error umig-${macroName}-error'>
            <div class='umig-error-icon'>🔒</div>
            <h3>Access Denied</h3>
            <p>You are not authorized to access the ${macroName} macro.</p>
            <p>Contact your system administrator to request UMIG access.</p>
            <div class='umig-error-code'>Error Code: UMIG_${macroName.toUpperCase()}_UNAUTHORIZED</div>
        </div>
        """
    }
    
    protected String buildConfigurationJson(UserContext userContext, String macroType) {
        def rolePermissions = getRolePermissionsForMacro(userContext.role, macroType)
        
        return new JsonBuilder([
            user: [
                userId: userContext.userId,
                role: userContext.role,
                isAdmin: userContext.isAdmin,
                isSuperAdmin: userContext.isSuperAdmin,
                permissions: userContext.permissions
            ],
            macro: [
                type: macroType,
                features: rolePermissions
            ],
            timestamp: new Date().time
        ]).toString()
    }
    
    private Map getRolePermissionsForMacro(String role, String macroType) {
        def permissions = [:]
        
        switch (macroType) {
            case 'iteration-view':
                permissions = getIterationViewPermissions(role)
                break
            case 'step-view':
                permissions = getStepViewPermissions(role)
                break
            // Add other macro types as needed
        }
        
        return permissions
    }
    
    private Map getIterationViewPermissions(String role) {
        return [
            canView: ['NORMAL', 'PILOT', 'ADMIN'].contains(role),
            canEditStatus: ['PILOT', 'ADMIN'].contains(role),
            canManageAll: role == 'ADMIN',
            canConfigureSystem: role == 'ADMIN' // && isSuperAdmin check done separately
        ]
    }
    
    private Map getStepViewPermissions(String role) {
        return [
            canViewDetails: ['NORMAL', 'PILOT', 'ADMIN'].contains(role),
            canUpdateProgress: ['PILOT', 'ADMIN'].contains(role),
            canModifyAssignments: role == 'ADMIN',
            canEditTemplates: role == 'ADMIN' // && isSuperAdmin check done separately
        ]
    }
}
```

### Differential Macro Authentication Strategy Implementation

#### Strategy Pattern Architecture
```groovy
// MacroType enum for strategy selection
enum MacroType {
    REGULAR_MACRO,    // IterationView, StepView - Permissive strategy
    ADMIN_GUI_MACRO   // Admin GUI - Strict strategy
}

// Strategy interface
interface MacroAuthenticationStrategy {
    UserContext authenticate(MacroType macroType, String confluenceUserName, HttpServletRequest request) throws SecurityException
}

// Permissive strategy for regular macros
class PermissiveMacroAuthStrategy implements MacroAuthenticationStrategy {
    @Override
    UserContext authenticate(MacroType macroType, String confluenceUserName, HttpServletRequest request) throws SecurityException {
        def userContext = getUserFromDatabase(confluenceUserName)
        
        if (!userContext) {
            // Auto-provision unknown users with NORMAL role
            userContext = autoProvisionUser(confluenceUserName)
            AuditSecurityRepository.logSecurityChange(
                null, userContext.userId, 'USER_AUTO_PROVISIONED', 
                null, 'NORMAL', request.remoteAddr
            )
        }
        
        // Always return context for progressive feature enhancement
        return userContext
    }
    
    private UserContext autoProvisionUser(String confluenceUserName) {
        def trigram = extractTrigram(confluenceUserName)
        def normalRoleId = getNormalRoleId()
        
        return DatabaseUtil.withSql { sql ->
            def userId = UUID.randomUUID()
            sql.executeInsert("""
                INSERT INTO users_usr (usr_id, usr_first_name, usr_last_name, usr_trigram, 
                                     usr_confluence_username, usr_role_id, user_is_admin)
                VALUES (?, ?, ?, ?, ?, ?, false)
            """, [userId as String, "Auto", "Provisioned", trigram, confluenceUserName, normalRoleId as String])
            
            return buildUserContext(confluenceUserName) // Rebuild after insert
        }
    }
}

// Strict strategy for admin GUI
class StrictMacroAuthStrategy implements MacroAuthenticationStrategy {
    @Override
    UserContext authenticate(MacroType macroType, String confluenceUserName, HttpServletRequest request) throws SecurityException {
        def userContext = getUserFromDatabase(confluenceUserName)
        
        if (!userContext) {
            AuditSecurityRepository.logAuthenticationAttempt(confluenceUserName, "ADMIN_GUI_REJECTED_NOT_IN_DB", request.remoteAddr)
            throw new AccessDeniedException("User not authorized for UMIG administration. Contact your system administrator.")
        }
        
        // Must have ADMIN or PILOT role explicitly
        if (!["ADMIN", "PILOT"].contains(userContext.role)) {
            AuditSecurityRepository.logAuthenticationAttempt(confluenceUserName, "ADMIN_GUI_REJECTED_INSUFFICIENT_ROLE", request.remoteAddr)
            throw new AccessDeniedException("Insufficient privileges for UMIG administration. Contact your system administrator.")
        }
        
        return userContext
    }
}

// Access denied exception for strict strategy
class AccessDeniedException extends SecurityException {
    AccessDeniedException(String message) {
        super(message)
    }
}
```

### Enhanced AuthenticationService.groovy Implementation
```groovy
// UserContext data class
class UserContext {
    UUID userId
    String userName
    String confluenceUserName
    String role
    boolean isAdmin
    boolean isSuperAdmin
    List<String> teams
    Map<String, Boolean> permissions
    Date lastUpdated
    MacroType authenticatedForMacroType  // NEW: Track authentication context
}

// Enhanced AuthenticationService with two-layer authentication and strategy pattern
class AuthenticationService {
    private static final Map<String, UserContext> userContextCache = [:]
    private static final int REGULAR_MACRO_CACHE_MINUTES = 10
    private static final int ADMIN_GUI_CACHE_MINUTES = 2
    
    // Strategy instances
    private static final MacroAuthenticationStrategy permissiveStrategy = new PermissiveMacroAuthStrategy()
    private static final MacroAuthenticationStrategy strictStrategy = new StrictMacroAuthStrategy()

    // Backward compatible method - KEEP EXISTING
    static String getCurrentUser() {
        return ComponentAccessor.jiraAuthenticationContext.loggedInUser?.name ?: "anonymous"
    }
    
    // NEW: Macro-specific authentication with strategy pattern
    static UserContext authenticateForMacro(MacroType macroType, javax.servlet.http.HttpServletRequest request) {
        def confluenceUser = ComponentAccessor.jiraAuthenticationContext.loggedInUser
        
        if (!confluenceUser) {
            throw new SecurityException("No Confluence authentication found")
        }
        
        def cacheKey = "${confluenceUser.name}_${macroType.name()}"
        def cacheDuration = (macroType == MacroType.ADMIN_GUI_MACRO) ? 
            ADMIN_GUI_CACHE_MINUTES : REGULAR_MACRO_CACHE_MINUTES
        def cachedContext = getCachedUserContext(cacheKey, cacheDuration)
        if (cachedContext) {
            return cachedContext
        }
        
        // Select strategy based on macro type
        def strategy = (macroType == MacroType.ADMIN_GUI_MACRO) ? strictStrategy : permissiveStrategy
        
        try {
            def userContext = strategy.authenticate(macroType, confluenceUser.name, request)
            userContext.authenticatedForMacroType = macroType
            
            // Cache with appropriate duration
            cacheUserContext(cacheKey, userContext)
            AuditSecurityRepository.logAuthenticationAttempt(confluenceUser.name, "SUCCESS_${macroType.name()}", request.remoteAddr)
            
            return userContext
            
        } catch (AccessDeniedException e) {
            // Don't cache failed admin GUI attempts
            throw e
        } catch (SecurityException e) {
            AuditSecurityRepository.logAuthenticationAttempt(confluenceUser.name, "FAILED_${macroType.name()}", request.remoteAddr)
            throw e
        }
    }

    // Original two-layer authentication method (backward compatibility)
    static UserContext getUserContext(javax.servlet.http.HttpServletRequest request) {
        def confluenceUser = ComponentAccessor.jiraAuthenticationContext.loggedInUser
        
        if (!confluenceUser) {
            throw new SecurityException("No Confluence authentication found")
        }
        
        def cacheKey = confluenceUser.name
        def cachedContext = getCachedUserContext(cacheKey)
        if (cachedContext) {
            return cachedContext
        }
        
        // Layer 2: Verify user exists in users_usr table
        def userContext = buildUserContext(confluenceUser.name)
        if (!userContext) {
            AuditSecurityRepository.logAuthenticationAttempt(confluenceUser.name, "REJECTED_NOT_IN_DB", request.remoteAddr)
            throw new SecurityException("User not authorized for UMIG application")
        }
        
        // Cache for performance
        cacheUserContext(cacheKey, userContext)
        AuditSecurityRepository.logAuthenticationAttempt(confluenceUser.name, "SUCCESS", request.remoteAddr)
        
        return userContext
    }

    private static UserContext buildUserContext(String confluenceUserName) {
        return DatabaseUtil.withSql { sql ->
            def userRow = sql.firstRow("""
                SELECT usr_id, usr_first_name, usr_last_name, usr_role_id, user_is_admin,
                       rls_name as role_name
                FROM users_usr u 
                JOIN roles_rls r ON u.usr_role_id = r.rls_id 
                WHERE usr_confluence_username = ?
            """, [confluenceUserName])
            
            if (!userRow) return null
            
            def teams = getUserTeams(userRow.usr_id as UUID)
            def permissions = buildUserPermissions(userRow.role_name, userRow.user_is_admin as Boolean, teams)
            
            return new UserContext(
                userId: userRow.usr_id as UUID,
                userName: "${userRow.usr_first_name} ${userRow.usr_last_name}",
                confluenceUserName: confluenceUserName,
                role: userRow.role_name,
                isAdmin: userRow.user_is_admin as Boolean,
                isSuperAdmin: (userRow.user_is_admin as Boolean) && (userRow.role_name == 'ADMIN'),
                teams: teams,
                permissions: permissions,
                lastUpdated: new Date()
            )
        }
    }

    // Role validation methods
    static boolean hasRole(HttpServletRequest request, String requiredRole) {
        try {
            def userContext = getUserContext(request)
            return userContext.role == requiredRole
        } catch (SecurityException e) {
            return false
        }
    }

    static boolean isAdmin(HttpServletRequest request) {
        try {
            def userContext = getUserContext(request)
            return userContext.isAdmin
        } catch (SecurityException e) {
            return false
        }
    }

    static boolean canAccess(HttpServletRequest request, String resource) {
        try {
            def userContext = getUserContext(request)
            return userContext.permissions[resource] ?: false
        } catch (SecurityException e) {
            return false
        }
    }

    // Cache management with variable durations
    private static UserContext getCachedUserContext(String cacheKey, int cacheDurationMinutes = 5) {
        def cached = userContextCache[cacheKey]
        if (cached && isWithinCacheDuration(cached.lastUpdated, cacheDurationMinutes)) {
            return cached
        }
        return null
    }
    
    // Overload for backward compatibility
    private static UserContext getCachedUserContext(String cacheKey) {
        return getCachedUserContext(cacheKey, 5)
    }

    private static void cacheUserContext(String cacheKey, UserContext userContext) {
        userContextCache[cacheKey] = userContext
    }

    static void invalidateUserCache(String confluenceUserName) {
        userContextCache.remove(confluenceUserName)
    }

    private static boolean isWithinCacheDuration(Date lastUpdated, int cacheDurationMinutes = 5) {
        def now = new Date()
        def diffMinutes = (now.time - lastUpdated.time) / (1000 * 60)
        return diffMinutes < cacheDurationMinutes
    }
    
    // Overload for backward compatibility
    private static boolean isWithinCacheDuration(Date lastUpdated) {
        return isWithinCacheDuration(lastUpdated, 5)
    }

    private static List<String> getUserTeams(UUID userId) {
        return DatabaseUtil.withSql { sql ->
            sql.rows("""
                SELECT tms_name FROM teams_tms t
                JOIN user_teams ut ON t.tms_id = ut.usr_id
                WHERE ut.usr_id = ?
            """, [userId as String]).collect { it.tms_name }
        }
    }

    private static Map<String, Boolean> buildUserPermissions(String role, Boolean isAdmin, List<String> teams) {
        def permissions = [:]
        
        // Base permissions by role
        switch (role) {
            case 'ADMIN':
                permissions.putAll([
                    'view_all_data': true,
                    'manage_users': true,
                    'manage_migrations': true,
                    'view_audit_logs': true
                ])
                break
            case 'PILOT':
                permissions.putAll([
                    'view_team_data': true,
                    'manage_iterations': true,
                    'view_reports': true
                ])
                break
            case 'NORMAL':
                permissions.putAll([
                    'view_own_data': true,
                    'update_steps': true
                ])
                break
        }
        
        // SUPERADMIN gets all permissions
        if (isAdmin) {
            permissions.putAll([
                'system_admin': true,
                'manage_security': true,
                'view_all_audit_logs': true
            ])
        }
        
        return permissions
    }
}
```

### Integration Pattern for APIs
```groovy
@BaseScript CustomEndpointDelegate delegate
enhancedSecureEndpoint(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    try {
        // Two-layer authentication
        def userContext = AuthenticationService.getUserContext(request)
        
        // Role-based authorization
        if (!AuthenticationService.canAccess(request, 'view_sensitive_data')) {
            return Response.status(403).entity([error: "Insufficient permissions"]).build()
        }
        
        // Proceed with business logic
        def data = SomeRepository.getSecureData(userContext.userId)
        return Response.ok(data).build()
        
    } catch (SecurityException e) {
        return Response.status(401).entity([error: e.message]).build()
    }
}
```

### Row-Level Security Policies
```sql
-- Example RLS policy for user data access
CREATE POLICY user_data_access ON users_usr 
    FOR ALL TO application_role 
    USING (
        usr_id = current_setting('app.current_user_id')::uuid OR
        is_user_admin(current_setting('app.current_user_id')::uuid) = true
    );
```

## Test Scenarios

### Unit Tests
1. **Permission Validation Tests**
   - Test valid role/admin flag combinations
   - Test invalid combinations (USER + admin flag)
   - Test hierarchy enforcement

2. **Audit Logging Tests**
   - Verify audit records are created for all changes
   - Test audit log immutability
   - Verify audit log data integrity
   - Test authentication attempt logging

3. **AuthenticationService Tests**
   - Test two-layer authentication (Confluence + users_usr)
   - Test UserContext creation and caching
   - Test role validation methods (hasRole, isAdmin, canAccess)
   - Test cache expiration and invalidation
   - Test backward compatibility with getCurrentUser()
   - Test security exceptions for unauthorized users

### Integration Tests
1. **API Security Tests**
   - Test role-based endpoint access
   - Test SUPERADMIN-only operations
   - Test unauthorized access attempts
   - Test two-layer authentication in API endpoints

2. **Row-Level Security Tests**
   - Verify data filtering by role
   - Test cross-user data access restrictions
   - Performance impact assessment

3. **Authentication Integration Tests**
   - Test end-to-end authentication flow (Confluence → UMIG)
   - Test user not in users_usr table rejection
   - Test cache behavior across multiple requests
   - Test concurrent user authentication

4. **Macro-Level RBAC Integration Tests**
   - Test macro authentication flow: User → Confluence → Macro → getUserContext() → Role-based UI
   - Test IterationView role behaviors (NORMAL read-only, PILOT edit status, ADMIN full control, SUPERADMIN system config)
   - Test StepView role behaviors (NORMAL view details, PILOT update progress, ADMIN modify assignments, SUPERADMIN edit templates)
   - Test server-side role determination with no client-side bypass possible
   - Test 5-minute cached UserContext for instant subsequent macro loads
   - Test unauthorized user access denied messages with administrator contact information
   - Test configuration JSON passing from server-side to frontend JavaScript
   - Test role-based UI element visibility and functionality
   - Test macro error handling for authentication failures and security exceptions

### Security Tests
1. **Privilege Escalation Tests**
   - Attempt to elevate USER to admin without proper authorization
   - Test role assignment bypassing validation
   - Test direct database manipulation protection

2. **Audit Trail Integrity Tests**
   - Attempt to modify audit logs
   - Test audit log completeness
   - Verify log retention and immutability

3. **Macro-Level Security Tests**
   - Test client-side JavaScript manipulation attempts to bypass role restrictions
   - Test direct macro URL access without proper Confluence authentication
   - Test configuration JSON tampering attempts (should be regenerated server-side each time)
   - Test macro injection attacks through parameters
   - Test unauthorized macro access attempts with proper error handling
   - Test role escalation attempts through macro configuration manipulation
   - Test cross-site scripting (XSS) prevention in macro error messages
   - Test role-based feature access enforcement across all macro types
   - Test cache poisoning attempts for UserContext data
   - Test concurrent user session handling across multiple macro pages

### Performance Tests
1. **RLS Performance Impact**
   - Benchmark query performance with RLS enabled
   - Test with large datasets
   - Verify index effectiveness

## Definition of Done

- [ ] Database migrations implemented and tested
- [ ] Repository layer enhanced with validation and audit logging
- [ ] AuthenticationService.groovy enhanced with two-layer authentication
- [ ] UserContext class implemented with caching mechanism
- [ ] API endpoints secured with role-based authorization
- [ ] Row-level security policies implemented and tested
- [ ] All role validation methods implemented (hasRole, isAdmin, canAccess)
- [ ] Backward compatibility maintained with existing getCurrentUser() method
- [ ] Cache invalidation system implemented for user context
- [ ] Authentication attempt logging integrated
- [ ] Macro-level RBAC implementation completed for all UMIG macros (IterationView, StepView, etc.)
- [ ] Server-side role determination implemented with no client-side bypass possibility
- [ ] UMIGBaseMacro abstract class implemented for consistent RBAC patterns across macros
- [ ] Role-based UI features implemented for each macro type with proper permissions
- [ ] Frontend JavaScript integration completed with configuration JSON passing from server-side
- [ ] Macro error handling implemented for unauthorized access and authentication failures
- [ ] Comprehensive unit and integration tests (>90% coverage) including macro-level RBAC tests
- [ ] Security penetration testing completed including macro-specific security tests
- [ ] Performance impact assessed and documented (with caching and macro loading optimization)
- [ ] Admin documentation updated with security procedures and macro-level RBAC configuration
- [ ] Code review completed with security focus including macro implementation patterns
- [ ] UAT testing with different role levels and authentication scenarios across all macro types
- [ ] **CRITICAL: Client-side admin backdoor removed from AuthenticationManager.js**
- [ ] **CRITICAL: All mock authentication code removed (createMockUser function)**
- [ ] **CRITICAL: No client-side authentication or authorization logic remaining**
- [ ] **Differential Macro Authentication Strategy implemented with MacroType enum and strategy pattern**
- [ ] **PermissiveMacroAuthStrategy implemented with auto-provisioning for regular macros (IterationView, StepView)**
- [ ] **StrictMacroAuthStrategy implemented with access denial for admin GUI macro**
- [ ] **AuthenticationService.authenticateForMacro() method implemented with different cache durations (10min regular, 2min admin)**
- [ ] **MacroAuthenticationStrategy interface implemented with proper exception handling**
- [ ] **AccessDeniedException implemented for strict strategy access denials**
- [ ] **Auto-provisioning logic implemented for unknown users in regular macros (NORMAL role assignment)**
- [ ] **Strategy selection logic implemented based on macro type configuration**
- [ ] **Enhanced audit logging implemented for macro-specific authentication events**
- [ ] **Access denied UI implemented for admin GUI with contact administrator message**

## Story Points: 13

**Complexity Factors:**
- Multi-layer implementation (database, repository, API, authentication service, macro layer)
- Two-layer authentication system design and implementation
- Security-critical functionality requiring extensive testing
- Row-level security implementation complexity
- Comprehensive audit logging requirements (including authentication events)
- Complex caching mechanism with invalidation logic
- UserContext class design with rich permission mapping
- Integration with existing RBAC system while maintaining backward compatibility
- Performance optimization needs with caching strategy
- Enhanced testing requirements for authentication flows
- **NEW:** Macro-level RBAC implementation across all UMIG macro types (IterationView, StepView, etc.)
- **NEW:** Server-side role determination with frontend integration patterns
- **NEW:** UMIGBaseMacro abstract class design for consistent RBAC patterns
- **NEW:** Role-based UI feature implementation for each macro type
- **NEW:** Macro-specific security testing and penetration testing requirements
- **NEW:** Frontend JavaScript integration with server-side configuration JSON passing
- **CRITICAL:** Complete removal of client-side admin backdoor (ADM, JAS, SUP, SYS trump users)
- **CRITICAL:** Refactoring AuthenticationManager.js to eliminate all mock authentication
- **CRITICAL:** Migration from client-side to server-side only authentication decisions
- **NEW COMPLEXITY:** Differential macro authentication strategy pattern implementation
- **NEW COMPLEXITY:** Two distinct authentication strategies (permissive vs strict) with different behaviors
- **NEW COMPLEXITY:** Auto-provisioning logic for unknown users in regular macros only
- **NEW COMPLEXITY:** Different caching durations and invalidation strategies per macro type
- **NEW COMPLEXITY:** Enhanced error handling with AccessDeniedException and graceful degradation
- **NEW COMPLEXITY:** Strategy selection logic and macro type configuration management

**Note**: Story points remain at 13 as the differential authentication strategy represents a refinement of the existing macro-level RBAC work rather than completely new functionality. The strategy pattern provides a cleaner, more maintainable implementation of the already planned two-layer authentication system.

## Dependencies

- **Preconditions:** Current user and role management system (existing)
- **Parallel Work:** None identified
- **Follow-up Stories:** UI enhancements for audit log viewing, advanced RLS policies

## Risk Mitigation

- **Security Risk:** Extensive testing and code review required
- **Performance Risk:** Benchmark testing with RLS enabled
- **Data Risk:** Backup and rollback procedures for schema changes
- **Integration Risk:** Thorough testing with existing authentication flows

## Notes

- Created based on system architect recommendations for RBAC security enhancements
- Focus on audit compliance and preventing unauthorized privilege escalation
- Aligns with existing repository patterns and DatabaseUtil security model