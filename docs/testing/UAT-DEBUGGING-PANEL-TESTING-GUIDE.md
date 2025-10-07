# UAT Debugging Panel Testing Guide

**Purpose**: Verify enhanced authentication debugging display with graceful degradation
**Related**: UAT-DEBUGGING-REFACTORING-SUMMARY.md, US-058

## Quick Test Scenarios

### Scenario 1: All APIs Working (Happy Path)

**Expected State**:

```
🔍 Authentication Debugging (UAT)
Confluence Context:    lchallamel ✓ (GREEN)
DB usr_code:           lchallamel ✓ (GREEN)
DB usr_confluence_user_id: lchallamel ✓ (GREEN)
Session Username:      lchallamel ✓ (GREEN)
```

**How to Test**:

1. Ensure ScriptRunner endpoints are properly registered
2. Navigate to Admin GUI: http://localhost:8090/pages/viewpage.action?pageId=262145
3. Open browser console (F12)
4. Verify all four fields show green color
5. Verify console log: `[UMIG] Authentication successful for user: lchallamel`

**Console Output Expected**:

```javascript
[UMIG] Authenticating via session (no query parameters)
[UMIG] Debugging Info Updated: {
  confluenceContextFromMacro: "lchallamel",
  dbUserCode: "lchallamel",
  dbConfluenceUserId: "lchallamel",
  confluenceContextFromApi: "lchallamel",
  hasError: false,
  error: null,
  fallbackUsed: false
}
[UMIG] Authentication successful for user: lchallamel
```

---

### Scenario 2: Primary API Fails, Fallback Succeeds

**Expected State**:

```
🔍 Authentication Debugging (UAT)
Confluence Context:    lchallamel ✓ (GREEN)
DB usr_code:           API FAILED: HTTP 404 (showing fallback data) (ORANGE)
DB usr_confluence_user_id: API FAILED: HTTP 404 (showing fallback data) (ORANGE)
Session Username:      lchallamel (from macro) ⚠ (ORANGE)
```

**How to Test**:

1. Disable `/users/current` endpoint in ScriptRunner (or rename it temporarily)
2. Keep `/users` endpoint active
3. Navigate to Admin GUI
4. Verify Confluence context shows green (from macro)
5. Verify other fields show orange with fallback notes
6. Hover over "DB usr_code" to see tooltip: "Check ScriptRunner endpoint registration"

**Console Output Expected**:

```javascript
[UMIG] Authenticating via session (no query parameters)
[UMIG] Primary authentication failed, attempting fallback for debugging...
[UMIG] Attempting fallback API call: GET .../users?userCode=lchallamel
[UMIG] Fallback API succeeded, updating debugging panel only
[UMIG] Debugging Info Updated: {
  confluenceContextFromMacro: "lchallamel",
  dbUserCode: "lchallamel",
  dbConfluenceUserId: "lchallamel",
  confluenceContextFromApi: "N/A",
  hasError: true,
  error: "HTTP 404: Not Found - Endpoint not found... (showing fallback data)",
  fallbackUsed: false
}
[UMIG] Automatic authentication API call failed: Error: HTTP 404...
```

---

### Scenario 3: Both APIs Fail, Macro Context Only

**Expected State**:

```
🔍 Authentication Debugging (UAT)
Confluence Context:    lchallamel ✓ (GREEN)
DB usr_code:           API FAILED: HTTP 404 - Check endpoint registration (RED)
DB usr_confluence_user_id: API FAILED: HTTP 404 - Check endpoint registration (RED)
Session Username:      lchallamel (from macro) ⚠ (ORANGE)
```

**How to Test**:

1. Disable both `/users/current` and `/users` endpoints
2. Navigate to Admin GUI
3. Verify Confluence context still shows green (from macro)
4. Verify DB fields show red with helpful error
5. Verify Session Username shows macro fallback in orange
6. Hover over DB fields to see tooltip hint

**Console Output Expected**:

```javascript
[UMIG] Authenticating via session (no query parameters)
[UMIG] Primary authentication failed, attempting fallback for debugging...
[UMIG] Attempting fallback API call: GET .../users?userCode=lchallamel
[UMIG] Fallback authentication debug failed: Error: Fallback API failed: HTTP 404
[UMIG] Debugging Info Updated: {
  confluenceContextFromMacro: "lchallamel",
  dbUserCode: "N/A",
  dbConfluenceUserId: "N/A",
  confluenceContextFromApi: "N/A",
  hasError: true,
  error: "HTTP 404: Not Found - Endpoint not found...",
  fallbackUsed: true
}
[UMIG] Automatic authentication API call failed: Error: HTTP 404...
```

---

### Scenario 4: Identity Mismatch Detection

**Expected State**:

- Debugging panel shows all values (green/orange depending on API status)
- Console shows detailed mismatch analysis

**How to Test**:

1. Ensure APIs are working
2. Create user in DB with different `usr_code` vs `usr_confluence_user_id`
3. Navigate to Admin GUI as that user
4. Verify debugging panel shows all values
5. Check console for mismatch detection logs

**Console Output Expected**:

```javascript
[UMIG] ═══════════════════════════════════════════════════
[UMIG] 🔍 UAT AUTHENTICATION DIAGNOSTICS
[UMIG] ═══════════════════════════════════════════════════
[UMIG]    Confluence Context (macro):       lchallamel
[UMIG]    Confluence Context (API response): lchallamel
[UMIG]    DB usr_code:                      lchallamel
[UMIG]    DB usr_confluence_user_id:        different_value
[UMIG]
[UMIG]    ❌ MISMATCH DETECTED:
[UMIG]       - Confluence Context (macro) ≠ DB usr_confluence_user_id
[UMIG]         'lchallamel' !== 'different_value'
[UMIG] ═══════════════════════════════════════════════════
```

---

## Visual Color Legend

| Color     | Hex Code | Meaning                         | Example                |
| --------- | -------- | ------------------------------- | ---------------------- |
| ✓ Green   | #006644  | Success - Data from primary API | All values match       |
| ⚠ Orange | #ff8b00  | Warning - Fallback data used    | Showing macro context  |
| ❌ Red    | #de350b  | Error - API failed, no data     | API endpoint not found |
| 🔵 Blue   | #0052cc  | Loading - Initial state         | "Loading..." text      |

---

## Browser DevTools Checklist

### Elements Tab

1. Inspect `<span id="debugConfluenceUser">` - Should always have green text if macro context available
2. Inspect `<span id="debugDbUserCode">` - Check color: green (API success) or red (API failed)
3. Inspect `<span id="debugDbConfluenceUserId">` - Check color: green (API success) or red (API failed)
4. Inspect `<span id="debugSessionUsername">` - Check color: green (API) or orange (fallback)
5. Verify `title` attributes on hover for helpful hints

### Console Tab

1. Look for `[UMIG] Authenticating via session` - Primary auth started
2. Look for `[UMIG] Primary authentication failed, attempting fallback` - Fallback triggered
3. Look for `[UMIG] Fallback API succeeded` - Fallback worked
4. Look for `[UMIG] Debugging Info Updated` - Panel updated with data
5. Look for `[UMIG] ❌ MISMATCH DETECTED` - Identity mismatch found

### Network Tab

1. Filter by "users"
2. Check `/users/current` request - Should show 200 (success) or 404 (failed)
3. Check `/users?userCode={username}` request - Only appears if fallback triggered
4. Verify "credentials: include" in request headers
5. Check response payload for user data structure

---

## Common Issues & Troubleshooting

### Issue 1: All Fields Show "Loading..."

**Symptom**: Debugging panel stuck on "Loading..." indefinitely
**Cause**: JavaScript not executing or UMIG_CONFIG not loaded
**Fix**:

- Check browser console for JavaScript errors
- Verify `window.UMIG_CONFIG` exists: `console.log(window.UMIG_CONFIG)`
- Clear browser cache and ScriptRunner cache

### Issue 2: Confluence Context Shows "NOT AVAILABLE"

**Symptom**: First field shows "NOT AVAILABLE" instead of username
**Cause**: Macro not receiving Confluence context
**Fix**:

- Verify user is logged into Confluence
- Check macro parameters in page edit mode
- Verify `confluenceUsername` variable in macro rendering

### Issue 3: Fallback API Called on Every Page Load

**Symptom**: Console shows fallback API call even when primary should work
**Cause**: Primary endpoint returning non-200 status
**Fix**:

- Check ScriptRunner endpoint registration in Confluence admin
- Verify endpoint is enabled and published
- Check Confluence logs for endpoint errors

### Issue 4: Console Logs Missing

**Symptom**: No `[UMIG]` logs in browser console
**Cause**: JavaScript bundling or console level filtering
**Fix**:

- Set console level to "Verbose" or "All"
- Check if `console.log` is being filtered
- Verify `admin-gui.js` is loading correctly

---

## Manual Testing Checklist

### Pre-Testing Setup

- [ ] Confluence running at http://localhost:8090
- [ ] User logged in as admin
- [ ] ScriptRunner endpoints registered and enabled
- [ ] Browser DevTools open (F12)
- [ ] Console set to "Verbose" level

### Happy Path Testing

- [ ] Navigate to Admin GUI
- [ ] Verify all four fields show green
- [ ] Verify all values match current username
- [ ] Check console for success message
- [ ] Verify no errors in console

### Fallback Testing (Tier 2)

- [ ] Disable `/users/current` endpoint
- [ ] Navigate to Admin GUI
- [ ] Verify Confluence context shows green (from macro)
- [ ] Verify fallback API call in console
- [ ] Verify DB fields show fallback note
- [ ] Verify helpful error messages

### Fallback Testing (Tier 3)

- [ ] Disable both `/users/current` and `/users` endpoints
- [ ] Navigate to Admin GUI
- [ ] Verify Confluence context still green
- [ ] Verify DB fields show red error
- [ ] Verify Session Username shows macro fallback
- [ ] Verify tooltips provide helpful hints

### Mismatch Testing

- [ ] Create user with mismatched identities
- [ ] Navigate to Admin GUI as that user
- [ ] Verify debugging panel shows all values
- [ ] Check console for mismatch analysis
- [ ] Verify detailed mismatch logs

### Edge Case Testing

- [ ] Test with `window.UMIG_CONFIG` undefined
- [ ] Test with network disconnected
- [ ] Test with invalid API response (non-JSON)
- [ ] Test with empty array from `/users` endpoint
- [ ] Test rapid page refresh (race conditions)

---

## Automated Test Ideas (Future)

```javascript
// Example Jest test structure
describe("UAT Debugging Panel", () => {
  describe("updateDebuggingInfo()", () => {
    it("should show Confluence context from macro when API fails", () => {
      window.UMIG_CONFIG = { confluence: { username: "testuser" } };
      adminGui.updateDebuggingInfo(null, "HTTP 404: Not Found");

      const sessionUsername = document.getElementById("debugSessionUsername");
      expect(sessionUsername.textContent).toBe("testuser (from macro)");
      expect(sessionUsername.style.color).toBe("rgb(255, 139, 0)"); // Orange
    });
  });

  describe("fallbackAuthenticationDebug()", () => {
    it("should attempt fallback API when primary fails", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { username: "testuser", confluenceUserId: "testuser" },
        ],
      });

      const result =
        await adminGui.fallbackAuthenticationDebug("Primary failed");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users?userCode="),
        expect.any(Object),
      );
      expect(result.username).toBe("testuser");
    });
  });
});
```

---

## Performance Considerations

### Expected Timing

- **Primary API Call**: < 200ms (typical)
- **Fallback API Call**: < 300ms (additional if needed)
- **DOM Updates**: < 50ms (instant visual feedback)
- **Total Latency**: < 500ms (worst case with fallback)

### Monitoring Points

1. Track primary API success rate (should be >95%)
2. Track fallback API activation rate (should be <5%)
3. Track total debugging panel load time
4. Monitor console error frequency

---

## Deployment Verification

After deploying changes:

1. **Smoke Test** (5 minutes):
   - [ ] Load Admin GUI successfully
   - [ ] Verify debugging panel visible
   - [ ] Check all fields populated
   - [ ] Verify no console errors

2. **Regression Test** (10 minutes):
   - [ ] Test authentication flow unchanged
   - [ ] Verify Admin GUI functionality intact
   - [ ] Check user can navigate to other pages
   - [ ] Verify no API request errors

3. **Enhancement Validation** (15 minutes):
   - [ ] Simulate API failure (disable endpoint)
   - [ ] Verify fallback behavior activates
   - [ ] Check helpful error messages displayed
   - [ ] Verify Confluence context always visible
   - [ ] Confirm tooltips and hints working

---

**Last Updated**: 2025-10-07
**Version**: 1.0
**Related**: UAT-DEBUGGING-REFACTORING-SUMMARY.md
