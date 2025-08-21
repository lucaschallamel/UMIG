# Lessons Learned: US-036 Authentication Architecture Issue

**Date**: August 20, 2025  
**Story**: US-036 StepView UI Refactoring  
**Issue**: Error 400/500 when changing step status as Confluence admin user

## Executive Summary

A critical authentication architecture mismatch was discovered where Confluence system users (like "admin") don't exist in the UMIG application database, causing API failures. This was resolved by implementing an intelligent user mapping service that provides fallback mechanisms while preserving audit trails.

## The Problem

### Symptoms

- **Error 400**: "User not found in system" when admin user changes step status
- **Error 500**: Missing methods and incorrect database column names
- **Root Cause**: Architectural assumption that all Confluence users would have corresponding UMIG database records

### Why It Happened

1. **Dual User Systems**: Confluence has its own user system, UMIG has a separate application user table
2. **Incorrect Assumption**: APIs assumed every API caller would have a UMIG user record
3. **Mixed Responsibilities**: Confusion between authorization (who can call) and audit logging (who did what)

## The Solution

### Architectural Insight

**Key Learning**: Separate authorization from audit logging

- **Authorization**: Handled by ScriptRunner/Confluence permissions (already working)
- **Audit Logging**: Handled by UMIG database (needed fallback mechanism)

### Implementation: UserService Pattern

```groovy
// Intelligent fallback hierarchy
1. Check for direct UMIG user mapping
2. If system user (admin, system) → Use Confluence System User (CSU)
3. If business user → Auto-create or use system fallback
4. Cache results for performance
```

## Critical Lessons Learned

### 1. Don't Confuse Authorization with Audit Logging

**Wrong Approach**: Blocking API calls when user not in application database

```groovy
// BAD - This blocks legitimate users
if (!userId) {
    return Response.status(400).entity([error: "User not found"]).build()
}
```

**Right Approach**: Use fallback for audit while trusting platform authorization

```groovy
// GOOD - Platform authorized, we just need audit context
def userContext = UserService.getCurrentUserContext() // Has fallback
def userId = userContext?.userId // Can be null or system user
```

### 2. System Users Are Special

**Learning**: System/admin users often don't exist in application databases

- Confluence admin, ScriptRunner system, automation users
- Need explicit handling with dedicated fallback users
- Document these special cases

### 3. JavaScript Authentication Headers Are Critical

**Required Headers for Confluence**:

```javascript
headers: {
    "Content-Type": "application/json",
    "X-Atlassian-Token": "no-check"  // XSRF protection
},
credentials: "same-origin"  // Include auth cookies
```

### 4. Database Column Naming Consistency

**Issue**: Inconsistent audit column names

- Some tables: `usr_id_last_updated`
- Others: `updated_by`, `updated_at`
  **Solution**: Standardize on `updated_by` (varchar) and `updated_at` (timestamp)

### 5. Helper Method Organization

**Problem**: Missing lazy-loaded repository getters

```groovy
// These must exist at class level for lazy loading pattern
private def getStatusRepository() { return new StatusRepository() }
private def getStepRepository() { return new StepRepository() }
```

## Debugging Approach That Worked

### 1. Follow the Error Chain

- Start with browser console error
- Check network tab for actual API response
- Read server-side logs for stack traces
- Identify the exact line causing issues

### 2. Question Assumptions

**Initial Assumption**: "It's a JavaScript authentication issue"
**Reality**: Multiple issues - JS auth, user mapping, SQL columns

### 3. Incremental Fixes

Don't try to fix everything at once:

1. Fix JavaScript headers → Still Error 400
2. Fix user validation logic → Error 500 appears
3. Fix missing methods → SQL error appears
4. Fix SQL columns → Success

### 4. Direct Action vs Delegation

**Learning**: Simple fixes don't need agent delegation

- Missing methods? Add them directly
- Wrong column names? Fix the SQL directly
- Save delegation for complex architectural changes

## Patterns to Reuse

### 1. UserService Pattern

Reusable for any system with dual user contexts:

- Platform users vs Application users
- External systems vs Internal records
- SSO users vs Local database

### 2. Fallback Hierarchy

```
Specific User → Role-based User → System User → Anonymous/Null
```

### 3. Session Caching

Cache expensive lookups per session to avoid repeated database queries

### 4. Audit-Safe Operations

Operations should work with null userId for audit fields:

```sql
updated_by = CASE WHEN :userId IS NULL THEN 'system' ELSE :userId::varchar END
```

## Red Flags to Watch For

1. **"User not found" errors** in systems with external authentication
2. **Mixing authorization and audit concerns** in the same validation
3. **Assuming all users exist** in application database
4. **Hardcoded user checks** without fallback mechanisms
5. **Missing XSRF tokens** in AJAX calls to Atlassian products

## Recommended ADR (Architecture Decision Record)

### Title: User Context Mapping Strategy for Dual Authentication Systems

**Status**: Proposed

**Context**: UMIG runs within Confluence using ScriptRunner, creating a dual user system where Confluence handles authentication/authorization while UMIG needs user context for audit trails.

**Decision**: Implement a UserService layer that provides intelligent mapping between Confluence users and UMIG users with automatic fallback mechanisms.

**Consequences**:

- **Positive**: System works for all Confluence users, maintains audit trails, improves reliability
- **Negative**: Additional complexity, potential for audit records with generic "system" user
- **Neutral**: Requires monitoring to identify unmapped users for potential registration

## Team Knowledge Transfer Points

1. **For Developers**: Always separate authorization (can they?) from audit (who did?)
2. **For Architects**: Design for external user systems from day one
3. **For QA**: Test with system/admin users, not just application users
4. **For DevOps**: Monitor for fallback user usage to identify mapping gaps

## Metrics to Track

- Percentage of operations using fallback users
- Cache hit rate for user lookups
- Time spent in user resolution
- Failed authentication vs failed user mapping

## Prevention Checklist

- [ ] Document user system architecture upfront
- [ ] Test with system/admin users early
- [ ] Implement fallback mechanisms for external users
- [ ] Separate authorization from audit logging
- [ ] Include proper authentication headers in all AJAX calls
- [ ] Standardize database column naming conventions
- [ ] Create integration tests for user edge cases

---

_This issue took 3+ hours to debug but provides valuable patterns for any system integrating with external authentication providers._
