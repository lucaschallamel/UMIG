# StepView Email Functionality Fix

## Issue Analysis

After comprehensive analysis of the StepView email functionality issues, I found that:

### ✅ **All Code is Actually Correct**

1. **User Context Endpoint**: `/rest/scriptrunner/latest/custom/v2/user/context?username=admin`
   - ✅ EXISTS in `/src/groovy/umig/api/v2/UsersApi.groovy` (lines 341-403)
   - ✅ Properly implemented with username parameter support

2. **URL Configuration Endpoint**: `/rest/scriptrunner/latest/custom/v2/urlConfiguration` 
   - ✅ EXISTS in `/src/groovy/umig/api/v2/UrlConfigurationApi.groovy`
   - ✅ Complete implementation with health check and debug endpoints

3. **hasPermission Method**: `self.hasPermission("email_step_details")`
   - ✅ EXISTS in StepView class (line 2569)
   - ✅ Correctly implemented with defensive programming

4. **Step Email Endpoint**: `/rest/scriptrunner/latest/custom/steps/instance/{uuid}/send-email`
   - ✅ EXISTS in `/src/groovy/umig/api/v2/StepsApi.groovy` (lines 1804-1850+)
   - ✅ Properly implemented in `stepEmail` method

## Root Cause: Endpoint Registration Issue

The 404 errors indicate that these endpoints are not **registered in ScriptRunner's REST endpoint manager**.

## Solution: ScriptRunner Endpoint Registration

### **Method 1: Manual Registration via ScriptRunner UI**

1. **Access ScriptRunner Console**:
   - Go to Confluence Administration → Manage apps → ScriptRunner → REST Endpoints

2. **Register Missing Endpoints**:
   - `UsersApi.groovy` - Contains `user` method for `/v2/user/context`
   - `UrlConfigurationApi.groovy` - Contains `urlConfiguration` method for `/v2/urlConfiguration`
   - `StepsApi.groovy` - Contains `stepEmail` method for `/steps/instance/{id}/send-email`

3. **Enable Endpoints**:
   - Ensure all three API files are enabled and active
   - Verify they appear in the REST endpoint list
   - Check that the correct HTTP methods are registered (GET for user context, GET for URL config, POST for step email)

### **Method 2: Verify Registration with Test Tool**

1. **Use the Test Tool**: Open `/test-endpoint-access.html` in your browser (from Confluence)

2. **Run Endpoint Tests**:
   - ✅ **200 Response**: Endpoint is properly registered and working
   - ❌ **404 Response**: Endpoint needs registration in ScriptRunner
   - ⚠️ **400/500 Response**: Endpoint is registered but has validation/logic issues (this is actually good news!)

3. **Expected Results After Registration**:
   - User Context: Should return 200 with user data or 404 if user not found
   - URL Configuration: Should return 200 with configuration data
   - Step Email: Should return 400/500 (validation error) instead of 404
   - Permission System: Should show all tests passing ✅

## Implementation Steps

### **Step 1: Register Endpoints in ScriptRunner**

Navigate to ScriptRunner Administration and ensure these three API files are registered:

```
✅ /src/groovy/umig/api/v2/UsersApi.groovy
✅ /src/groovy/umig/api/v2/UrlConfigurationApi.groovy  
✅ /src/groovy/umig/api/v2/StepsApi.groovy
```

### **Step 2: Test Email Functionality**

After registration, the email workflow should work correctly:

1. **User clicks email button** → Permission check passes ✅
2. **Load user context** → `/v2/user/context` returns user data ✅  
3. **Load URL configuration** → `/v2/urlConfiguration` returns config ✅
4. **Send email** → `/steps/instance/{id}/send-email` processes request ✅

### **Step 3: Verification**

Use the test tool (`/test-endpoint-access.html`) to verify all endpoints return appropriate responses (not 404).

## Code Quality Assessment

The existing code demonstrates excellent patterns:

- ✅ **Proper error handling** with try/catch blocks
- ✅ **Security validation** with permission checks
- ✅ **Type safety** with explicit casting (as per ADR-031)
- ✅ **REST compliance** with appropriate HTTP status codes
- ✅ **Defensive programming** in hasPermission method
- ✅ **Consistent patterns** following established API conventions

## Expected Outcome

After proper endpoint registration:

1. **No 404 errors** for the three endpoints
2. **Email button works** without JavaScript errors  
3. **Permission system functions** correctly
4. **User context loads** for role-based features
5. **Email composition dialog** appears when clicking email button

## Files Involved

- **Primary Issue**: ScriptRunner endpoint registration (not code changes needed)
- **Test Tool**: `/test-endpoint-access.html` (created for verification)
- **Working APIs**: 
  - `/src/groovy/umig/api/v2/UsersApi.groovy`
  - `/src/groovy/umig/api/v2/UrlConfigurationApi.groovy`
  - `/src/groovy/umig/api/v2/StepsApi.groovy`
- **Working Frontend**: `/src/groovy/umig/web/js/step-view.js`

## Summary

**The StepView email functionality is correctly implemented**. The issue is purely a **ScriptRunner endpoint registration problem**, not a code problem. Once the three API endpoints are properly registered in ScriptRunner, the email functionality will work as designed.