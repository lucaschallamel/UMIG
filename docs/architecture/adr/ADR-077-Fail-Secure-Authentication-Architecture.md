# ADR-077: Fail-Secure Authentication Architecture

## Status

**Status**: Implemented
**Date**: 2025-10-08
**Author**: Security Architecture Team
**Sprint**: Sprint 8 - Security Architecture Enhancement
**Related ADRs**: ADR-042 (Dual Authentication), ADR-067 (Session Security), ADR-068 (SecurityUtils), ADR-069 (Security Boundary)

## Context and Problem Statement

During Sprint 8 security architecture review, a **CRITICAL authentication bypass vulnerability (CWE-639)** was discovered in the dual authentication fallback pattern. The vulnerability allowed any authenticated Confluence user to access other users' data by manipulating URL parameters, bypassing UMIG's authorization controls.

### The Vulnerability: CWE-639 Authorization Bypass Through User-Controlled Key

**CWE-639 Definition**: "The system's authorization functionality does not prevent one user from gaining access to another user's data or record by modifying the key value identifying the data."

**Attack Vector Discovered**:

```groovy
// UsersApi.groovy - VULNERABLE CODE (PRE-FIX)
users(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def queryParams = request.getQueryParameters()

    // 1. Try to get username from Confluence session
    def username = UserService.getCurrentUsername()

    // 2. VULNERABILITY: Fallback to query parameter!
    if (!username) {
        username = queryParams.getFirst('username') as String  // ❌ ATTACK VECTOR
    }

    // 3. Fetch user data with attacker-controlled username
    def user = UserRepository.getUserByUsername(username)  // ❌ DATA LEAK

    return Response.ok(user).build()
}
```

**Attack Scenario**:

1. **Attacker**: Any authenticated Confluence user (baseline access)
2. **Method**: `GET /rest/scriptrunner/latest/custom/users?username=admin`
3. **Bypass**: Query parameter `?username=admin` overrides session authentication
4. **Result**: Attacker accesses admin user's profile, permissions, team memberships
5. **Impact**: Complete authorization bypass, privilege escalation, data exfiltration

**Severity Assessment**:

- **CVSS Score**: 8.1/10 (High)
- **Exploitability**: Easy (requires only basic Confluence access)
- **Impact**: High (complete user data access, privilege escalation)
- **Detection**: Low (looks like normal API usage, no suspicious patterns)

### Root Cause Analysis

The vulnerability existed in ADR-042's original dual authentication fallback pattern:

```groovy
// ADR-042 ORIGINAL PATTERN (INSECURE)
def userContext = UserService.getUserContextWithFallback(preferredUserId)

// Frontend could pass userId:
{
  "stepId": "...",
  "userId": "attacker-controlled-value"  // ❌ User-controlled authentication
}
```

**Architectural Flaw**: Trusting user-provided authentication identifiers without session validation

**Why It Happened**:

1. **Frontend Convenience**: Allowed frontend to "suggest" which user is acting
2. **Macro Context Workaround**: Addressed `AuthenticatedUserThreadLocal.get()` returning null in macros
3. **Incomplete Security Review**: Did not consider malicious user scenarios
4. **Defense-in-Depth Missing**: No validation that provided userId matched session user

## Decision

Implement a **Fail-Secure Authentication Architecture** that eliminates user-controlled authentication identifiers and enforces session-based authentication with NO query parameter fallback.

### Core Principle: Fail-Secure Design

**Definition**: When authentication determination fails, the system denies access rather than attempting insecure fallbacks.

**Application**:

- ❌ **NO query parameter authentication** (`?userId=`, `?username=`)
- ❌ **NO request body userId** for authentication purposes
- ✅ **ONLY session-based authentication** (server-side validation)
- ✅ **Explicit anonymous mode** for read-only public access
- ✅ **Audit all authentication failures** for security monitoring

### Secure Fallback Hierarchy (Post-Fix)

```groovy
/**
 * FAIL-SECURE AUTHENTICATION HIERARCHY
 * Each tier validated against session, NO user-controlled values
 */
class UserService {
    static Map<String, Object> getSecureUserContext() {
        // Tier 1: Session Cookie Authentication (PRIMARY - SECURE)
        def sessionUser = getSessionUser()
        if (sessionUser) {
            return createUserContext(sessionUser, 'SESSION_AUTH')
        }

        // Tier 2: Atlassian ThreadLocal (BACKEND ONLY - SECURE)
        def threadLocalUser = AuthenticatedUserThreadLocal.get()
        if (threadLocalUser) {
            def umigUser = getUserByConfluenceKey(threadLocalUser.key)
            if (umigUser) {
                return createUserContext(umigUser, 'THREADLOCAL_AUTH')
            }
        }

        // Tier 3: Frontend Context Injection (TRUSTED MACRO ONLY - LIMITED)
        // ONLY in macro context where ThreadLocal is null
        // ONLY when embedded userId is cryptographically signed
        def macroEmbeddedUser = getMacroEmbeddedUserIfValid()
        if (macroEmbeddedUser) {
            return createUserContext(macroEmbeddedUser, 'MACRO_EMBEDDED')
        }

        // Tier 4: Secure Anonymous Fallback (READ-ONLY - FAIL-SECURE)
        return createAnonymousContext()  // Read-only mode, no privileges
    }

    // ❌ REMOVED: getUserContextWithFallback(String preferredUserId)
    // ❌ REMOVED: Query parameter fallback
    // ❌ REMOVED: Request body userId for authentication
}
```

### Fixed API Pattern (Secure)

```groovy
// UsersApi.groovy - SECURE IMPLEMENTATION (POST-FIX)
users(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    try {
        // 1. Get session-validated user context (NO user input)
        def userContext = UserService.getSecureUserContext()

        // 2. AUTHORIZATION CHECK: User can only access their own data
        //    (unless they have ADMIN role)
        def requestedUsername = request.getQueryParameters().getFirst('username')

        if (requestedUsername && requestedUsername != userContext.username) {
            // Trying to access another user's data
            if (!hasAdminRole(userContext)) {
                // DENY: Not authorized to access other users
                AuditLogRepository.logAuthorizationFailure([
                    action: 'UNAUTHORIZED_USER_ACCESS_ATTEMPT',
                    attackerUser: userContext.username,
                    targetUser: requestedUsername,
                    timestamp: new Date(),
                    severity: 'HIGH'
                ])

                return Response.status(403)
                    .entity([error: "Forbidden: Cannot access other user data"])
                    .build()
            }
        }

        // 3. Fetch authorized user data
        def username = requestedUsername ?: userContext.username
        def user = UserRepository.getUserByUsername(username)

        if (!user) {
            return Response.status(404)
                .entity([error: "User not found"])
                .build()
        }

        // 4. Audit successful access
        AuditLogRepository.logUserDataAccess([
            accessedBy: userContext.username,
            accessedUser: username,
            contextType: userContext.contextType
        ])

        return Response.ok(user).build()

    } catch (Exception e) {
        log.error("Error in secure user retrieval", e)
        return Response.status(500)
            .entity([error: "Internal server error"])
            .build()
    }
}
```

### Authorization Enforcement Pattern

**Principle**: Authentication identifies WHO, Authorization determines WHAT they can access

```groovy
class AuthorizationService {
    /**
     * Validate user can access target resource
     * @param userContext - Session-validated user context
     * @param targetUserId - Resource being accessed
     * @param requiredPermission - Permission level required
     */
    static boolean canAccessUserData(
        Map userContext,
        String targetUserId,
        String requiredPermission = 'READ'
    ) {
        // 1. Check if accessing own data (always allowed)
        if (userContext.userId == targetUserId) {
            return true
        }

        // 2. Check admin role
        if (hasRole(userContext, 'ADMIN') || hasRole(userContext, 'SUPERADMIN')) {
            return true
        }

        // 3. Check team-based access (if same team)
        if (requiredPermission == 'READ' && isTeamMember(userContext, targetUserId)) {
            return true
        }

        // 4. DENY by default (fail-secure)
        return false
    }
}
```

### Security Enhancements

#### 1. Device Fingerprinting (ADR-067 Integration)

```groovy
// Enhanced session validation with device fingerprinting
static Map getSessionUser() {
    def sessionId = getSessionId()
    def deviceFingerprint = generateDeviceFingerprint(request)

    return SessionCache.get(sessionId)?.tap { session ->
        // Validate device fingerprint matches
        if (session.deviceFingerprint != deviceFingerprint) {
            // Session hijacking attempt detected
            AuditLogRepository.logSecurityEvent([
                event: 'SESSION_HIJACK_ATTEMPT',
                sessionId: sessionId,
                originalFingerprint: session.deviceFingerprint,
                requestFingerprint: deviceFingerprint,
                severity: 'CRITICAL'
            ])

            // Invalidate session
            SessionCache.invalidate(sessionId)
            return null
        }
    }
}
```

#### 2. IP Address Collision Detection (ADR-067)

```groovy
// Detect session sharing across different IP addresses
if (session.ipAddress != currentIpAddress) {
    if (session.ipCollisionCount++ > MAX_IP_COLLISIONS) {
        // Suspicious: Same session used from multiple IPs
        SessionCache.invalidate(sessionId)
        return null
    }
}
```

#### 3. Comprehensive Audit Trail

```groovy
// Log ALL authentication decisions
AuditLogRepository.logAuthenticationAttempt([
    timestamp: new Date(),
    method: authenticationMethod,
    success: authenticationSucceeded,
    userId: userId,
    ipAddress: ipAddress,
    deviceFingerprint: deviceFingerprint,
    contextType: contextType,
    failureReason: failureReason  // If failed
])
```

## Consequences

### Positive

1. **CWE-639 Vulnerability Eliminated**: No user-controlled authentication identifiers
   - Query parameters cannot override session authentication
   - Request body userId cannot bypass authorization
   - All authentication server-side validated

2. **Fail-Secure Design**: Authentication failures deny access, never grant
   - No insecure fallbacks to user-provided values
   - Anonymous mode is explicit and read-only
   - Audit trail for all authentication failures

3. **Defense-in-Depth**: Multiple security layers
   - Session validation (Tier 1)
   - Device fingerprinting (ADR-067)
   - IP collision detection (ADR-067)
   - Role-based authorization checks
   - Comprehensive audit logging

4. **Security Rating Improvement**: 6.5/10 → 9.0/10
   - Eliminated critical vulnerability
   - Enhanced authentication controls
   - Comprehensive security monitoring

5. **Compliance Alignment**:
   - ✅ OWASP Top 10 - Broken Access Control (A01:2021)
   - ✅ NIST CSF - PR.AC-1 (Identities and credentials managed)
   - ✅ ISO27001 - A.9.2.1 (User registration and de-registration)
   - ✅ GDPR Article 32 - Security of processing

### Negative

1. **Reduced Flexibility**: Cannot use query parameters for authentication
   - May require session management in all contexts
   - Frontend must maintain session cookies

2. **Macro Context Complexity**: Frontend context injection requires signing
   - Additional cryptographic overhead
   - More complex implementation for macros

3. **Testing Complexity**: Must test all authentication tiers
   - Session validation
   - ThreadLocal authentication
   - Macro-embedded context
   - Anonymous fallback

### Neutral

1. **Performance**: Minimal impact with session caching
   - Session lookup cached in memory
   - Device fingerprinting computed once per request

2. **User Experience**: Transparent to end users
   - Session management handled automatically
   - No user-facing changes

## Validation Criteria

✅ **CWE-639 Eliminated**: No query parameter or request body authentication bypass possible

✅ **Fail-Secure Verified**: All authentication failures deny access (no insecure fallbacks)

✅ **Authorization Enforced**: Users cannot access other users' data without proper permissions

✅ **Audit Complete**: All authentication attempts and authorization failures logged

✅ **Security Rating**: 9.0/10 achieved (OWASP, NIST CSF, ISO27001, GDPR compliant)

## Implementation Status

- **Sprint 8**: CWE-639 vulnerability discovered and fixed (October 7, 2025)
- **Security Review**: Critical vulnerability eliminated, security rating 9.0/10
- **Testing**: Integration tests validate authorization enforcement
- **Production**: Deployed to UAT and PROD with enhanced security controls

## Related Security Architecture

### ADR-042: Dual Authentication Context Management

- **Enhanced**: Removed user-controlled authentication fallback
- **Secured**: Session-based authentication enforced
- **Validated**: Security rating upgraded to 9.0/10

### ADR-067: Session Security Enhancement

- **Integration**: Device fingerprinting + IP collision detection
- **Foundation**: Session-based authentication (Tier 1)

### ADR-068: SecurityUtils Enhancement

- **Support**: Centralized security utilities for validation
- **Tools**: Device fingerprinting, CSRF protection, XSS prevention

### ADR-069: Component Security Boundary

- **Enforcement**: Frontend authorization checks
- **Defense**: Client-side permission validation

## References

- **CWE-639**: Authorization Bypass Through User-Controlled Key
- **OWASP A01:2021**: Broken Access Control
- **NIST CSF**: PR.AC-1 (Identity and Credential Management)
- **ISO27001**: A.9.2.1 (User Registration and De-registration)
- Dev Journal: `20251007-01.md` (CWE-639 discovery and fix)
- Sprint 8: Security Architecture Enhancement (ADR-067 through ADR-070)

---

_This ADR documents the Fail-Secure Authentication Architecture that eliminates CWE-639 authorization bypass vulnerability by removing user-controlled authentication identifiers and enforcing session-based authentication with comprehensive security controls._
