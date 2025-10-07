# Authentication Security Fixes - Sprint 8

**Branch**: `bugfix/uat-deployment-issues`
**Date**: 2025-10-07
**Status**: ✅ COMPLETED
**Security Impact**: CRITICAL vulnerabilities fixed

## Executive Summary

This document summarizes the critical security fixes implemented to address authentication bypass vulnerabilities and ThreadLocal authentication failures in the UMIG AdminGUI system. These fixes eliminate a **CRITICAL authentication bypass vulnerability** that allowed any authenticated user to access any other user's data.

## Security Vulnerabilities Fixed

### 🔴 CRITICAL: Authentication Bypass Vulnerability

**Severity**: Critical
**CVE-Style Classification**: CWE-639 (Authorization Bypass Through User-Controlled Key)
**Impact**: Any authenticated user could query any other user's data via URL parameters

**Before (VULNERABLE)**:

```groovy
// UsersApi.groovy - INSECURE FALLBACK
if (!username) {
    username = queryParams.getFirst('username') as String  // ❌ VULNERABILITY
}
if (!username) {
    username = queryParams.getFirst('userCode') as String  // ❌ VULNERABILITY
}
```

**After (SECURE)**:

```groovy
// UsersApi.groovy - SECURE AUTHENTICATION
if (!username) {
    return Response.status(Response.Status.UNAUTHORIZED)  // ✅ FAIL SECURE
        .entity("Session authentication required")
        .build()
}
```

### 🟡 HIGH: ThreadLocal Authentication Failures

**Severity**: High
**Impact**: Authentication failures in UAT environment due to ThreadLocal context issues

**Root Cause**: Single authentication method (AuthenticatedUserThreadLocal) failing in certain environments

**Solution**: Enhanced authentication with multiple legitimate fallback methods

## Implementation Details

### Priority 2: Enhanced Authentication in UserService (COMPLETED ✅)

**File**: `/src/groovy/umig/service/UserService.groovy`
**Method**: `getCurrentConfluenceUser()`
**Lines**: 302-366

**Enhancement**: Added dual authentication strategy with comprehensive fallback:

1. **Primary Method**: `AuthenticatedUserThreadLocal.get()` (Confluence-specific)
2. **Fallback Method**: SAL `UserManager.getRemoteUsername()` (cross-application)

**Key Security Features**:

- ✅ Multiple legitimate authentication methods
- ✅ Comprehensive error logging for troubleshooting
- ✅ FAIL SECURE: Returns null if all methods fail (NO query parameter fallback)
- ✅ Clear documentation of failure scenarios

**Code Changes**:

```groovy
// Method 1: Try AuthenticatedUserThreadLocal (Confluence-specific)
def user = com.atlassian.confluence.user.AuthenticatedUserThreadLocal.get()
if (user) return user

// Method 2: Try SAL UserManager (cross-application abstraction)
def userManager = ComponentLocator.getComponent(UserManager.class)
def remoteUsername = userManager.getRemoteUsername()
if (remoteUsername) {
    // Convert SAL username to Confluence User object
    def userAccessor = ComponentLocator.getComponent(UserAccessor.class)
    return userAccessor.getUserByName(remoteUsername)
}

// If all fail, log CRITICAL error and return null (NO insecure fallback)
log.error("CRITICAL - All authentication methods failed")
return null
```

**Benefits**:

- Better UAT/production environment compatibility
- Reduced authentication failures
- Clear troubleshooting information
- No security compromise

---

### Priority 1: Authorization Enforcement in UsersApi (COMPLETED ✅)

**File**: `/src/groovy/umig/api/v2/UsersApi.groovy`
**Endpoint**: `GET /users/current`
**Lines**: 48-150

**Critical Fix**: Removed authentication bypass and added authorization checks

**Security Changes**:

#### 1. Removed Insecure Query Parameter Fallback

**Before**:

```groovy
// ❌ VULNERABILITY: Any user could specify ?username=admin
if (!username) {
    username = queryParams.getFirst('username')
}
if (!username) {
    username = queryParams.getFirst('userCode')
}
```

**After**:

```groovy
// ✅ SECURE: Return 401 if authentication fails
if (!username) {
    return Response.status(Response.Status.UNAUTHORIZED)
        .entity(new JsonBuilder([
            error: "Session authentication required",
            details: "Unable to verify user identity",
            troubleshooting: [
                "Verify Confluence session is active",
                "Check ScriptRunner authentication context",
                "Review logs for authentication method failures"
            ]
        ]).toString())
        .build()
}
```

#### 2. Added Admin-Only Cross-User Viewing Authorization

**New Feature**: Admins can view other users' data (authorized use case)

```groovy
// Check for admin-only cross-user viewing
def requestedUsername = queryParams.getFirst('username')

if (requestedUsername && requestedUsername != username) {
    // Cross-user query detected - verify admin privileges
    def authenticatedUser = userRepository.findUserByUsername(username)

    if (!authenticatedUser?.usr_is_admin) {
        // Non-admin attempting unauthorized access - REJECT
        log.warn("SECURITY: User '${username}' attempted unauthorized access to '${requestedUsername}'")

        return Response.status(Response.Status.FORBIDDEN)
            .entity(new JsonBuilder([
                error: "Insufficient privileges",
                details: "Only administrators can view other users' data"
            ]).toString())
            .build()
    }

    // Admin is authorized - allow cross-user query
    log.info("SECURITY: Admin '${username}' authorized to view user '${requestedUsername}'")
    username = requestedUsername
}
```

#### 3. Comprehensive Audit Logging

All security events are now logged:

```groovy
// Authentication success
log.info("GET /users/current - Authenticated user: ${username}")

// Authentication failure
log.warn("SECURITY: GET /users/current - Authentication failed")

// Unauthorized cross-user attempt
log.warn("SECURITY: User '${username}' attempted unauthorized access to '${requestedUsername}'")

// Authorized admin cross-user access
log.info("SECURITY: Admin '${username}' authorized to view user '${requestedUsername}'")
```

**Benefits**:

- Eliminates authentication bypass vulnerability
- Implements proper authorization (Principle of Least Privilege)
- Provides legitimate admin functionality (cross-user viewing)
- Complete audit trail for security monitoring
- Clear error messages for troubleshooting

---

### Additional Fix: Null Pointer Protection (COMPLETED ✅)

**File**: `/src/groovy/umig/macros/v1/adminGuiMacro.groovy`
**Lines**: 39-50

**Issue**: Potential NullPointerException when configuration values are null

**Fix**: Added defensive null checks with sensible defaults

```groovy
def apiBaseUrl = ConfigurationService.getString('umig.api.base.url', null)
if (!apiBaseUrl) {
    // SECURITY: Add null pointer protection
    if (webResourcesPath) {
        apiBaseUrl = webResourcesPath.replaceAll('/web$', '')
    } else {
        // Ultimate fallback: use default API path
        apiBaseUrl = '/rest/scriptrunner/latest/custom'
        log.warn("adminGuiMacro: Both apiBaseUrl and webResourcesPath are null, using default: ${apiBaseUrl}")
    }
}
```

**Benefits**:

- Prevents application crashes
- Graceful degradation
- Clear logging for troubleshooting
- Sensible default values

---

### Additional Fix: Frontend Username Validation (COMPLETED ✅)

**File**: `/src/groovy/umig/web/js/admin-gui.js`
**Method**: `getConfluenceUsername()`
**Lines**: 2109-2161

**Enhancement**: Defense-in-depth username validation

**Validation Rules**:

1. **Trim whitespace** from extracted username
2. **Length validation**: 1-255 characters
3. **Character validation**: `^[a-zA-Z0-9._@-]+$` (alphanumeric + common username chars)
4. **Reject suspicious characters** that could indicate injection attempts

```javascript
// SECURITY: Validate extracted username before returning
if (username && typeof username === "string") {
  username = username.trim();

  // Validate username length (reasonable bounds)
  if (username.length > 0 && username.length <= 255) {
    // Allow alphanumeric, dot, hyphen, underscore (common username patterns)
    const validUsernamePattern = /^[a-zA-Z0-9._@-]+$/;
    if (validUsernamePattern.test(username)) {
      return username;
    } else {
      console.warn("[UMIG] Username contains invalid characters:", username);
    }
  } else {
    console.warn("[UMIG] Invalid username length:", username.length);
  }
}

return null;
```

**Note**: This is **defense-in-depth** - server-side validation is the primary security control

**Also Removed**: Insecure query parameter usage in `automaticAuthentication()`

```javascript
// BEFORE (VULNERABLE):
const confluenceUsername = this.getConfluenceUsername();
if (confluenceUsername) {
  url += `?username=${encodeURIComponent(confluenceUsername)}`; // ❌ BYPASS
}

// AFTER (SECURE):
// SECURITY: Use session-based authentication ONLY
const url = `${this.api.baseUrl}/users/current`; // ✅ NO QUERY PARAMS
console.log("[UMIG] Authenticating via session (no query parameters)");
```

---

## Test Suite (COMPLETED ✅)

Comprehensive test suite created to document and verify security fixes:

### 1. Unit Tests - UserService Authentication

**File**: `/src/groovy/umig/tests/unit/UserServiceAuthenticationTest.groovy`

**Test Cases**:

- ✅ Authentication failure handling (no insecure fallback)
- ✅ User cache clearing and statistics
- ✅ Current user context validation
- ✅ System user fallback logic
- ✅ Comprehensive error messaging
- ✅ Null username handling
- ✅ NO query parameter authentication (security verification)

### 2. Unit Tests - UsersApi Authorization

**File**: `/src/groovy/umig/tests/unit/UsersApiAuthorizationTest.groovy`

**Test Cases**:

- ✅ Regular user CANNOT access other user data
- ✅ Regular user CAN access own data
- ✅ Admin CAN access other user data (authorized)
- ✅ Authentication failure returns 401
- ✅ Query parameter ignored for non-admin users
- ✅ Authorization audit logging
- ✅ Error messages provide guidance
- ✅ Security principles implementation
- ✅ Query parameter fallback removed

### 3. Integration Tests - Complete Security Flow

**File**: `/src/groovy/umig/tests/integration/AuthenticationSecurityIntegrationTest.groovy`

**Test Scenarios**:

- ✅ Complete authentication flow (regular user)
- ✅ Admin cross-user viewing (authorized)
- ✅ Regular user cross-user viewing (DENIED)
- ✅ Authentication failure (no session)
- ✅ ThreadLocal + SAL fallback mechanism
- ✅ Frontend username validation
- ✅ AdminGUI macro null protection
- ✅ End-to-end security validation

---

## Security Principles Implemented

### 1. Principle of Least Privilege ✅

- Regular users can only access their own data
- Admin privileges required for cross-user viewing
- Explicit authorization checks before sensitive operations

### 2. Defense in Depth ✅

- Multiple security layers:
  - Frontend validation (username validation)
  - Session authentication (NO query parameter bypass)
  - Backend authorization (admin checks)
  - Audit logging (security event monitoring)

### 3. Fail Secure ✅

- Authentication failure → 401 Unauthorized (NO fallback)
- Authorization failure → 403 Forbidden (explicit denial)
- No silent failures or insecure fallbacks

### 4. Audit Trail ✅

- All authentication events logged
- All authorization decisions logged
- Security violations logged with WARN level
- Admin cross-user access logged for monitoring

### 5. Zero Trust Architecture ✅

- Never trust query parameters for authentication
- Always verify user identity via session
- Always verify authorization before data access
- Always log security-relevant events

---

## Files Modified

| File                                             | Lines     | Change Type      | Impact                                             |
| ------------------------------------------------ | --------- | ---------------- | -------------------------------------------------- |
| `src/groovy/umig/service/UserService.groovy`     | 302-366   | Enhanced         | Enhanced authentication (ThreadLocal + SAL)        |
| `src/groovy/umig/api/v2/UsersApi.groovy`         | 48-150    | **CRITICAL FIX** | Removed authentication bypass, added authorization |
| `src/groovy/umig/macros/v1/adminGuiMacro.groovy` | 39-50     | Enhanced         | Added null pointer protection                      |
| `src/groovy/umig/web/js/admin-gui.js`            | 2067-2161 | Enhanced         | Removed query param bypass, added validation       |

**New Test Files**:

- `src/groovy/umig/tests/unit/UserServiceAuthenticationTest.groovy` (NEW)
- `src/groovy/umig/tests/unit/UsersApiAuthorizationTest.groovy` (NEW)
- `src/groovy/umig/tests/integration/AuthenticationSecurityIntegrationTest.groovy` (NEW)

---

## Testing & Validation

### Manual Testing Required

1. **Local Environment Testing**

   ```bash
   # Start development stack
   npm start

   # Test authentication as regular user
   # - Login as non-admin user
   # - Access AdminGUI
   # - Verify can only see own data
   # - Try GET /users/current?username=admin → Should receive 403 Forbidden

   # Test authentication as admin user
   # - Login as admin user
   # - Try GET /users/current?username=otheruser → Should receive 200 OK
   # - Verify audit log entries created
   ```

2. **UAT Environment Testing**
   - Verify ThreadLocal authentication works
   - Verify SAL fallback works if ThreadLocal fails
   - Monitor logs for authentication method used
   - Verify NO authentication failures

3. **Security Testing**

   ```bash
   # Test 1: Authentication bypass attempt (should FAIL)
   curl "http://localhost:8090/rest/scriptrunner/latest/custom/users/current?username=admin"
   # Expected: 401 Unauthorized (no session)

   # Test 2: Regular user cross-user access (should FAIL)
   # Login as regular user, then:
   curl -b cookies.txt "http://localhost:8090/rest/scriptrunner/latest/custom/users/current?username=admin"
   # Expected: 403 Forbidden (insufficient privileges)

   # Test 3: Admin cross-user access (should SUCCEED)
   # Login as admin user, then:
   curl -b cookies.txt "http://localhost:8090/rest/scriptrunner/latest/custom/users/current?username=bob"
   # Expected: 200 OK (admin authorized)
   ```

### Automated Testing

Run the comprehensive test suite:

```bash
# Run unit tests
npm run test:groovy:unit

# Run integration tests
npm run test:groovy:integration

# Run all tests
npm run test:groovy:all
```

**Note**: Tests require proper Groovy classpath configuration and may need adjustment for CI/CD environment.

---

## Deployment Checklist

- [x] **Priority 2**: Enhanced UserService authentication (ThreadLocal + SAL)
- [x] **Priority 1**: Removed authentication bypass in UsersApi
- [x] Added admin authorization for cross-user viewing
- [x] Added comprehensive audit logging
- [x] Added null pointer protection in adminGuiMacro
- [x] Added frontend username validation
- [x] Removed frontend query parameter usage
- [x] Created comprehensive test suite
- [x] Documented all security fixes
- [ ] Manual testing in local environment
- [ ] Manual testing in UAT environment
- [ ] Security penetration testing
- [ ] Code review by security team
- [ ] Deployment to production

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback** (if critical failure):

   ```bash
   git revert <commit-hash>
   # Redeploy previous version
   ```

2. **Temporary Workaround** (if authentication failures):
   - Monitor logs for authentication method failures
   - Investigate ThreadLocal vs SAL behavior in environment
   - DO NOT re-enable query parameter fallback (security vulnerability)

3. **Escalation Path**:
   - Minor issues → Continue monitoring, apply hotfix if needed
   - Major issues → Rollback to previous version
   - Critical security issue → Emergency deployment team notification

---

## Related Documentation

- **ADR-042**: Dual Authentication Pattern (ThreadLocal + Fallback)
- **ADR-058**: Component Security (Enterprise-grade Controls)
- **ADR-067 to ADR-070**: Security Architecture Enhancement (Sprint 8)
- **Sprint 8 Roadmap**: Security Architecture Enhancement

---

## Security Review Status

- [x] Code changes implemented
- [x] Unit tests created
- [x] Integration tests created
- [x] Documentation completed
- [ ] Security team review (PENDING)
- [ ] Penetration testing (PENDING)
- [ ] UAT validation (PENDING)
- [ ] Production deployment approval (PENDING)

---

## Contact & Support

**Security Issues**: Report to security team immediately
**Implementation Questions**: Contact development team
**Deployment Support**: Contact DevOps team

---

**Status**: ✅ **IMPLEMENTATION COMPLETE** - Awaiting testing and security review
**Next Steps**: Manual testing, security review, UAT validation
**Deployment Target**: Sprint 8 completion (subject to security approval)

---

_Last Updated: 2025-10-07_
_Document Version: 1.0_
_Author: Claude Code Agent (with Lucas Challamel oversight)_
