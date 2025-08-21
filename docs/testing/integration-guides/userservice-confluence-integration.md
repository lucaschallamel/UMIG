# UserService Confluence Integration Guide

**Version**: 1.0  
**Date**: August 20, 2025  
**Related**: US-036 StepView UI Refactoring  
**Purpose**: UserService integration for handling Confluence system users

## Overview

This guide documents the UserService integration that resolves authentication issues when Confluence system users (like "admin") interact with UMIG StepView components. The solution provides intelligent user fallback to prevent Error 400 "User not found in system" issues.

## Problem Statement

**Before Integration:**

- StepsApi required UMIG database user → Error 400 for 'admin' user
- Confluence system users couldn't update step statuses
- No graceful fallback for unknown users

**After Integration:**

- UserService provides intelligent fallback → Success with system user
- Confluence system users work seamlessly
- Proper audit trail maintained

## Architecture Solution

### UserService Flow

1. Get Confluence user from `AuthenticatedUserThreadLocal`
2. Check session cache for performance
3. Try to find user in UMIG database
4. If not found, apply intelligent fallback:
   - **System users** (admin, system, etc.) → CSU (Confluence System User) fallback
   - **Business users** → Auto-create or system fallback
5. Cache result for session performance
6. Return userId for audit trail

## Test Scenarios

### Critical Test Cases

| Scenario                  | Confluence User | Expected Behavior                            | Critical |
| ------------------------- | --------------- | -------------------------------------------- | -------- |
| **Confluence Admin**      | `admin`         | Should use system user fallback (CSU or SYS) | ✅ YES   |
| **Known UMIG User**       | `john.doe`      | Should return actual UMIG user ID            | No       |
| **Unknown Business User** | `jane.smith`    | Should auto-create or use system fallback    | No       |
| **Null/Anonymous**        | `null`          | Should handle gracefully with fallback       | No       |

### Key Features Verified

#### 1. ✅ System User Fallback

- 'admin' → CSU (Confluence System User) or SYS (System)
- No authentication failure for Confluence system users

#### 2. ✅ Auto-Creation for Business Users

- New Confluence users can be auto-created in UMIG
- Proper user code generation (e.g., JD1, JS2)

#### 3. ✅ Session Caching

- User lookups cached for performance
- Reduces database queries during user session

#### 4. ✅ Audit Trail Preservation

- All operations logged with proper user context
- Email notifications include userId reference

## Integration Points

### StepsApi Integration

- `StepsApi.updateStepStatus()` - Uses `UserService.getCurrentUserContext()`
- `StepsApi.openStep()` - Uses UserService for audit userId
- `StepsApi.completeInstruction()` - Uses UserService for notifications
- `StepsApi.uncompleteInstruction()` - Uses UserService for tracking

### Expected UI Behavior

- ✅ Step status dropdown changes work for 'admin' user
- ✅ No more Error 400 'User not found in system'
- ✅ Email notifications sent with proper user context
- ✅ Audit trail preserved with fallback user when needed

## Testing Procedures

### Manual Testing Steps

1. **Test UI Functionality:**
   - Login as Confluence 'admin' user
   - Navigate to StepView with valid step ID
   - Change step status using dropdown
   - Verify: No Error 400 or Error 500

2. **Verify Logging:**
   - Check application logs
   - Should see "Using system user fallback" messages
   - Confirm proper user context in audit entries

3. **Test Email Notifications:**
   - Trigger notification-generating action
   - Verify emails sent with proper context
   - Confirm no authentication errors

### Automated Validation

```javascript
// Basic role detection validation
function validateUserServiceIntegration() {
  const testCases = [
    { user: "admin", expectFallback: true },
    { user: "john.doe", expectFallback: false },
    { user: null, expectFallback: true },
  ];

  // Test each scenario...
}
```

## Security Considerations

### Access Control

- System users get minimal necessary permissions
- Fallback users cannot access sensitive operations
- Audit trail maintains full traceability

### User Context

- All operations attributed to appropriate user
- System actions clearly identified in logs
- No elevation of privileges through fallback mechanism

## Troubleshooting

### Common Issues

**Issue**: Still getting Error 400 for system users  
**Solution**: Verify UserService is properly integrated in all API endpoints

**Issue**: Missing audit trail for system users  
**Solution**: Confirm fallback user creation includes proper userId assignment

**Issue**: Performance degradation  
**Solution**: Check session caching is working, monitor database query frequency

### Diagnostic Commands

```bash
# Check user service logs
grep "UserService" application.log | tail -20

# Verify fallback user creation
grep "system user fallback" application.log

# Monitor session cache performance
grep "session cache" application.log
```

## Future Enhancements

### Potential Improvements

1. **Enhanced Auto-Creation**: More sophisticated business user detection
2. **Role-Based Fallback**: Different system users based on operation type
3. **Performance Metrics**: Detailed caching statistics
4. **Administrative Interface**: Manage fallback user configurations

### Monitoring Recommendations

- Track fallback user usage frequency
- Monitor authentication failure rates
- Alert on unexpected user mapping failures

---

## Related Documentation

- [StepsApi Documentation](../api/stepsapi.md)
- [Authentication Architecture](../../solution-architecture.md#authentication)
- [US-036 Testing Strategy](../uat/us-036-stepview-status-display-testing-strategy.md)

---

**Document Status**: ✅ Complete  
**Last Updated**: August 20, 2025  
**Next Review**: Sprint 6 (August 25, 2025)
