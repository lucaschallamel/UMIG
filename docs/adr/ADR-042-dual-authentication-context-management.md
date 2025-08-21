# ADR-042: Dual Authentication Context Management

## Status
Accepted

## Date
2025-08-21

## Context

UMIG operates within a complex authentication environment where it runs as a Confluence/ScriptRunner application. This creates a dual-layer authentication challenge:

1. **Platform Layer (Confluence)**: Handles authorization - "can they access this resource?"
2. **Application Layer (UMIG)**: Needs audit logging - "who performed this action?"

### Problems Identified

During US-036 implementation (August 21, 2025), a 3+ hour debugging session revealed critical authentication flow issues:

1. **Inconsistent User Context**: `UserService.getCurrentUserContext()` sometimes returns null in macro contexts
2. **Missing Audit Trail**: Actions performed without clear user identification
3. **Authentication vs Authorization Confusion**: Mixing platform authorization with application audit needs
4. **Fallback Scenarios**: No clear strategy when primary user identification fails

### Current State Challenges

- Frontend components sometimes lack user context
- API endpoints receive requests without clear user identification
- Audit logs contain generic system users instead of actual performers
- Authentication failures cause system errors rather than graceful degradation

## Decision

Implement a **Dual Authentication Context Management** pattern with intelligent fallback hierarchy that separates platform authorization from application audit logging.

### Core Principles

1. **Separation of Concerns**: Platform handles authorization, Application handles audit
2. **Graceful Degradation**: System continues functioning with degraded audit information
3. **Intelligent Fallback**: Multiple strategies to identify the acting user
4. **Session Optimization**: Cache expensive user lookups at session level

### Fallback Hierarchy

The system will attempt user identification in this order:

1. **Direct UMIG User**: User exists in `users_usr` table with full UMIG profile
2. **System User (SYS)**: Confluence user exists but not registered in UMIG
3. **Confluence System User (CSU)**: Confluence user context available but not mapped
4. **Anonymous**: Complete fallback when all user identification fails

## Implementation

### 1. UserService Enhancement

```groovy
class UserService {
    private static final String CACHE_KEY_PREFIX = "user_context_"
    
    static Map<String, Object> getUserContextWithFallback(String preferredUserId = null) {
        // 1. Try preferred user (from frontend)
        if (preferredUserId) {
            def directUser = getUserById(preferredUserId)
            if (directUser) {
                return createUserContext(directUser, 'DIRECT')
            }
        }
        
        // 2. Try current Confluence user context
        def confluenceUser = getCurrentConfluenceUser()
        if (confluenceUser) {
            def umigUser = getUserByConfluenceKey(confluenceUser.key)
            if (umigUser) {
                return createUserContext(umigUser, 'UMIG_REGISTERED')
            } else {
                return createSystemUserContext(confluenceUser, 'SYS')
            }
        }
        
        // 3. Confluence system user fallback
        if (confluenceUser) {
            return createSystemUserContext(confluenceUser, 'CSU')
        }
        
        // 4. Anonymous fallback
        return createAnonymousContext()
    }
    
    private static Map<String, Object> createUserContext(Map user, String contextType) {
        return [
            userId: user.usr_id,
            username: user.usr_username,
            displayName: user.usr_display_name,
            contextType: contextType,
            isSystemUser: false,
            auditIdentifier: user.usr_username
        ]
    }
    
    private static Map<String, Object> createSystemUserContext(def confluenceUser, String contextType) {
        return [
            userId: null,
            username: confluenceUser.name,
            displayName: confluenceUser.displayName,
            contextType: contextType,
            isSystemUser: true,
            auditIdentifier: "SYSTEM(${confluenceUser.name})"
        ]
    }
    
    private static Map<String, Object> createAnonymousContext() {
        return [
            userId: null,
            username: 'anonymous',
            displayName: 'Anonymous User',
            contextType: 'ANONYMOUS',
            isSystemUser: true,
            auditIdentifier: 'ANONYMOUS'
        ]
    }
}
```

### 2. API Pattern Implementation

```groovy
// REST API endpoints should implement this pattern
@BaseScript CustomEndpointDelegate delegate
steps(httpMethod: "PUT", groups: ["confluence-users"]) { request, binding ->
    try {
        def requestData = request.contentAsObject
        def preferredUserId = requestData.userId as String
        
        // Get user context with fallback
        def userContext = UserService.getUserContextWithFallback(preferredUserId)
        
        // Perform operation
        def result = StepRepository.updateStep(
            requestData.stepId as String,
            requestData,
            userContext.auditIdentifier
        )
        
        // Log audit information
        AuditLogRepository.logAction([
            action: 'STEP_UPDATE',
            entityId: requestData.stepId,
            userId: userContext.userId,
            auditIdentifier: userContext.auditIdentifier,
            contextType: userContext.contextType
        ])
        
        return Response.ok(result).build()
        
    } catch (Exception e) {
        log.error("Error updating step with authentication context", e)
        return Response.status(500)
            .entity([error: "Internal server error", message: e.message])
            .build()
    }
}
```

### 3. Frontend Integration Pattern

```javascript
// Frontend components should provide user context when available
class StepsAPIv2Client {
    async updateStep(stepId, updateData) {
        // Include user context if available
        const payload = {
            ...updateData,
            userId: this.currentUser?.userId || null
        };
        
        const response = await fetch(`/steps/${stepId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to update step: ${response.status}`);
        }
        
        return response.json();
    }
    
    // Method to set current user context
    setCurrentUser(userContext) {
        this.currentUser = userContext;
    }
}
```

### 4. Audit Logging Enhancement

```groovy
class AuditLogRepository {
    static void logAction(Map auditData) {
        DatabaseUtil.withSql { sql ->
            sql.executeInsert("""
                INSERT INTO audit_log_aul (
                    aul_id, aul_action, aul_entity_id, 
                    aul_user_id, aul_audit_identifier, aul_context_type,
                    aul_timestamp, aul_details
                ) VALUES (
                    gen_random_uuid(), ?, ?, 
                    ?, ?, ?,
                    NOW(), ?
                )
            """, [
                auditData.action,
                auditData.entityId,
                auditData.userId, // May be null for system users
                auditData.auditIdentifier, // Always populated
                auditData.contextType,
                JsonBuilder(auditData.details ?: [:]).toString()
            ])
        }
    }
}
```

## Context Types

| Type | Description | User ID | Audit Identifier | Use Case |
|------|-------------|---------|------------------|----------|
| `DIRECT` | Direct UMIG user with full profile | UUID | username | Normal operations |
| `UMIG_REGISTERED` | Confluence user registered in UMIG | UUID | username | Standard user actions |
| `SYS` | Confluence user, not in UMIG | null | SYSTEM(username) | External user access |
| `CSU` | Confluence system context | null | CSU(username) | System operations |
| `ANONYMOUS` | No user identification | null | ANONYMOUS | Fallback scenarios |

## Consequences

### Positive

1. **Robust Audit Trail**: Every action is logged with some form of user identification
2. **Graceful Degradation**: System continues functioning even with authentication issues
3. **Clear Separation**: Platform authorization vs application audit concerns are distinct
4. **Performance Optimization**: Session-level caching reduces expensive user lookups
5. **Debugging Clarity**: Context types help identify authentication flow issues

### Negative

1. **Increased Complexity**: More sophisticated authentication logic to understand and maintain
2. **Audit Confusion**: Logs may contain system users instead of actual human performers
3. **Testing Complexity**: Multiple authentication scenarios to test and validate
4. **Documentation Burden**: Developers need to understand the fallback hierarchy

### Neutral

1. **Migration Impact**: Existing audit logs remain valid, new logs are enhanced
2. **Performance**: Minimal impact due to session-level caching
3. **Security**: No reduction in actual security, only improved audit trail

## Implementation Timeline

1. **Phase 1**: Implement UserService enhancements (Day 1)
2. **Phase 2**: Update API endpoints to use new pattern (Day 2)
3. **Phase 3**: Enhance frontend to provide user context (Day 2-3)
4. **Phase 4**: Update audit logging with context types (Day 3)
5. **Phase 5**: Testing and validation (Day 4)

## References

- US-036 StepView UI Refactoring implementation (August 21, 2025)
- SESSION_HANDOFF_2025-08-21.md - Authentication debugging session
- US-036-authentication-architecture.md - Architecture analysis
- ADR-031: Type Safety Enforcement - Related type handling patterns
- ADR-038: Audit Logging Best Practices - Foundation audit principles

## Related ADRs

- ADR-031: Type Safety Enforcement
- ADR-038: Audit Logging Best Practices
- ADR-025: Repository Pattern Implementation

---

*This ADR addresses the authentication context management challenges discovered during US-036 implementation and provides a robust foundation for future authentication-related development.*