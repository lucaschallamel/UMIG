# UAT Authentication Debugging Display Refactoring

**Date**: 2025-10-07
**Status**: Implemented
**Related**: US-058, ADR-042 (Dual Authentication Strategy)

## Problem Statement

The UAT authentication debugging panel in admin-gui.js was showing "ERROR: HTTP 404:" for all three identity fields when the `/users/current` API endpoint failed. This prevented developers from diagnosing authentication mismatches because:

1. No Confluence context was visible when API failed
2. No fallback mechanism to fetch user data
3. Error messages were generic and unhelpful
4. Debugging panel became useless on API failure

## Solution Overview

Implemented graceful degradation with three-tier fallback strategy:

### Tier 1: Primary Authentication (`/users/current`)

- Default authentication endpoint
- Returns complete user data including all identity fields
- Works when ScriptRunner endpoint is properly registered

### Tier 2: Fallback API (`/users?userCode={username}`)

- Activates when Tier 1 fails with HTTP 404
- Uses Confluence username from macro (`window.UMIG_CONFIG.confluence.username`)
- Attempts to fetch user data from general `/users` endpoint
- Updates debugging panel with fallback data if successful

### Tier 3: Macro Context Fallback

- Always shows Confluence context from macro, even when all APIs fail
- Extracts username from `window.UMIG_CONFIG.confluence.username`
- Ensures at least one identity value is always visible
- Defensive update of `debugConfluenceUser` element

## Implementation Details

### 1. Enhanced `updateDebuggingInfo()` Method

**Location**: `src/groovy/umig/web/js/admin-gui.js` (lines 2368-2454)

**Key Changes**:

```javascript
// Extract Confluence context from macro (always available)
const confluenceContextUsername =
  window.UMIG_CONFIG?.confluence?.username || null;

// DB fields show "API FAILED" on error (lines 2382, 2401)
dbUserCodeEl.textContent = `API FAILED: ${errorMsg}`;
dbUserCodeEl.title =
  "Check ScriptRunner endpoint registration for /users/current";

// Session username uses fallback (lines 2419-2423)
if (confluenceContextUsername) {
  sessionUsernameEl.textContent = `${confluenceContextUsername} (from macro)`;
  sessionUsernameEl.style.color = "#ff8b00"; // Orange for fallback
  sessionUsernameEl.title = "Confluence context from macro (API unavailable)";
}

// Defensive update of Confluence Context field (lines 2434-2439)
if (confluenceUserEl && confluenceContextUsername) {
  confluenceUserEl.textContent = confluenceContextUsername;
  confluenceUserEl.style.color = "#006644";
}
```

**Enhanced Console Logging** (lines 2442-2450):

- Logs all identity sources (macro vs API)
- Indicates when fallback is used
- Tracks error state for debugging

### 2. New `fallbackAuthenticationDebug()` Method

**Location**: `src/groovy/umig/web/js/admin-gui.js` (lines 2249-2304)

**Purpose**: Attempt alternative API call when primary endpoint fails

**Logic Flow**:

1. Extract Confluence username from `window.UMIG_CONFIG.confluence.username`
2. Attempt GET `/users?userCode={username}`
3. Parse array response and extract first user
4. Update debugging panel with fallback data and note
5. On failure, still update debugging panel with macro context

**Key Features**:

- Non-blocking: Doesn't prevent error flow, only enhances debugging
- Transparent: Clearly indicates fallback data vs primary data
- Robust: Multiple fallback levels (API → macro context)

### 3. Enhanced `automaticAuthentication()` Method

**Location**: `src/groovy/umig/web/js/admin-gui.js` (lines 2178-2247)

**Changes**:

```javascript
// Enhanced error messages (lines 2207-2210)
else if (response.status === 404) {
  errorMsg += " - Endpoint not found. Check ScriptRunner endpoint registration.";
}

// Fallback strategy (lines 2212-2223)
return this.fallbackAuthenticationDebug(errorMsg)
  .then(() => {
    // Fallback succeeded for debugging, but still reject primary auth
    throw new Error(errorMsg);
  })
  .catch(() => {
    // Fallback also failed, update debugging panel and throw original error
    this.updateDebuggingInfo(null, errorMsg);
    throw new Error(errorMsg);
  });
```

**Authentication vs Debugging Separation**:

- Authentication still fails if `/users/current` fails (correct behavior)
- Debugging panel gets populated with fallback data (developer UX)
- Clear separation between authentication logic and debugging display

## Visual Changes to Debugging Panel

### Before (HTTP 404 failure)

```
🔍 Authentication Debugging (UAT)
Confluence Context:    NOT AVAILABLE
DB usr_code:           ERROR: HTTP 404:
DB usr_confluence_user_id: ERROR: HTTP 404:
Session Username:      ERROR: HTTP 404:
```

### After Tier 2 Success (Fallback API works)

```
🔍 Authentication Debugging (UAT)
Confluence Context:    lchallamel ✓
DB usr_code:           API FAILED: HTTP 404: Not Found (showing fallback data)
DB usr_confluence_user_id: API FAILED: HTTP 404: Not Found (showing fallback data)
Session Username:      lchallamel (from macro) ⚠
```

### After Tier 3 (Both APIs fail, macro context only)

```
🔍 Authentication Debugging (UAT)
Confluence Context:    lchallamel ✓
DB usr_code:           API FAILED: HTTP 404: Not Found - Check endpoint registration
DB usr_confluence_user_id: API FAILED: HTTP 404: Not Found - Check endpoint registration
Session Username:      lchallamel (from macro) ⚠
```

## Color Coding Legend

- **Green (#006644)**: Success - Data from API
- **Orange (#ff8b00)**: Warning - Fallback data or partial success
- **Red (#de350b)**: Error - API failed, no data available

## Benefits

### 1. Enhanced Developer Experience

- Always shows at least one identity value (Confluence context)
- Clear indication of data source (API vs macro vs fallback)
- Helpful error messages with actionable hints
- Debugging panel never becomes completely useless

### 2. Better Diagnostics

- Can diagnose authentication mismatches even when API fails
- Identifies whether issue is ScriptRunner registration vs database mismatch
- Console logs show complete picture of authentication attempt
- Hover tooltips provide additional context

### 3. Graceful Degradation

- Three-tier fallback ensures maximum information visibility
- Non-blocking: Doesn't interfere with error flow
- Transparent: Always indicates data source and quality
- Robust: Handles multiple failure scenarios

### 4. Maintainability

- Clear separation of concerns (authentication vs debugging)
- Well-documented fallback strategy
- Defensive programming (null checks, optional chaining)
- Consistent error handling patterns

## Testing Strategy

### Manual Testing Scenarios

1. **Happy Path** (all APIs work):
   - Verify all four fields show green
   - Verify all values match
   - Verify console logs show success

2. **Tier 2 Fallback** (/users/current fails, /users works):
   - Verify Confluence context shows green (from macro)
   - Verify DB fields show "API FAILED" with fallback note
   - Verify Session Username shows fallback with orange color
   - Verify console logs show fallback attempt

3. **Tier 3 Fallback** (both APIs fail):
   - Verify Confluence context shows green (from macro)
   - Verify DB fields show "API FAILED" with helpful hint
   - Verify Session Username shows macro context with orange
   - Verify tooltip on hover provides additional context

4. **Edge Cases**:
   - Macro context unavailable (`window.UMIG_CONFIG` undefined)
   - Network timeout
   - Invalid JSON response
   - Empty array from `/users` endpoint

### Automated Testing (Future)

Consider adding Jest tests for:

- `updateDebuggingInfo()` with various error states
- `fallbackAuthenticationDebug()` promise resolution
- DOM element updates with mocked UMIG_CONFIG
- Console logging output verification

## Related Files

- **Implementation**: `src/groovy/umig/web/js/admin-gui.js`
- **UI Template**: `src/groovy/umig/macros/v1/adminGuiMacro.groovy` (lines 97-116)
- **Config Injection**: `src/groovy/umig/macros/v1/adminGuiMacro.groovy` (lines 443-462)
- **Session Auth Docs**: `local-dev-setup/SESSION_AUTH_UTILITIES.md`

## Rollout Considerations

### Deployment Steps

1. Deploy refactored `admin-gui.js` (no schema changes required)
2. Clear ScriptRunner cache in Confluence admin
3. Refresh admin GUI page
4. Verify debugging panel shows enhanced fallback behavior

### Rollback Plan

- Revert `admin-gui.js` to previous version
- Clear ScriptRunner cache
- No database rollback needed (no schema changes)

### Monitoring

- Check browser console for fallback authentication logs
- Monitor debugging panel color coding (orange = fallback active)
- Track frequency of Tier 2/3 fallbacks to identify ScriptRunner issues

## Future Enhancements

1. **API Health Check**: Add endpoint health indicator to debugging panel
2. **Retry Logic**: Implement exponential backoff for failed API calls
3. **Caching**: Cache fallback data to reduce API calls
4. **Metrics**: Track fallback activation rate in analytics
5. **User Feedback**: Add "Report Issue" button when fallbacks are active

## Conclusion

This refactoring transforms the UAT debugging panel from a binary success/failure display into a comprehensive diagnostic tool with graceful degradation. Developers can now diagnose authentication issues even when APIs fail, significantly improving the troubleshooting experience during UAT testing.

The three-tier fallback strategy (Primary API → Fallback API → Macro Context) ensures maximum information visibility while maintaining clear separation between authentication logic and debugging display.

---

**Author**: Claude Code Agent
**Reviewed By**: TBD
**Implementation Date**: 2025-10-07
