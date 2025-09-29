# Database Version Manager Troubleshooting Guide

> **Note**: This guide was created during US-088-B Database Version Manager implementation (now complete). Preserved for future troubleshooting reference.

## Overview

The Database Version Manager component manages SQL package generation and Liquibase changelog creation. This guide consolidates debugging procedures for common issues encountered during development and deployment.

---

## Common Issues & Solutions

### Issue 1: Component Not Loading (80% of cases)

**Symptoms**:

- `DatabaseVersionManager class not found` error in console
- Component UI not appearing in Admin GUI
- `window.DatabaseVersionManager` returns undefined

**Root Causes**:

- Browser cache serving old JavaScript files
- ScriptRunner cache not cleared after updates
- Component registration issues in ComponentOrchestrator

**Solutions**:

1. **Browser Cache Clear** (Try First):
   - Hard refresh: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
   - If persists: Dev Tools → Application → Storage → Clear Site Data

2. **ScriptRunner Cache Clear**:
   - Navigate to: Confluence Admin → ScriptRunner → Script Console
   - Click "Clear Cache" button
   - Wait 30 seconds before refreshing

3. **Verify Component Loading**:
   ```javascript
   // Run in browser console
   typeof window.DatabaseVersionManager === "function"; // Should return true
   ```

### Issue 2: API Endpoints Returning 404 (15% of cases)

**Symptoms**:

- `404 Not Found` for `/packageSQL` or `/packageLiquibase` endpoints
- Network tab shows failed API calls
- Component loads but buttons don't work

**Root Causes**:

- ScriptRunner REST endpoints not registered
- DatabaseVersionsApi.groovy compilation errors
- URL path changes not propagated to backend

**Solutions**:

1. **Verify Endpoint Registration**:
   - Check ScriptRunner REST Endpoints in admin panel
   - Look for `databaseVersions`, `packageSQL`, `packageLiquibase` entries

2. **Test API Directly**:

   ```bash
   # From terminal
   curl -u admin:password "http://localhost:8090/rest/scriptrunner/latest/custom/databaseVersions/packageSQL"
   curl -u admin:password "http://localhost:8090/rest/scriptrunner/latest/custom/databaseVersions/packageLiquibase"
   ```

3. **Re-register Endpoints**:
   - Open and re-save `DatabaseVersionsApi.groovy` in ScriptRunner
   - Check for Groovy compilation errors in logs

### Issue 3: Component Loads but No Data (5% of cases)

**Symptoms**:

- Component renders but shows no migration data
- API returns 200 but empty responses
- Console shows successful initialization but no content

**Root Causes**:

- Database connectivity issues
- Missing test data
- Authentication/permission problems

**Solutions**:

1. **Verify Database Connection**:

   ```bash
   # From local-dev-setup/
   npm run postgres:check
   ```

2. **Generate Test Data**:

   ```bash
   # From local-dev-setup/
   npm run generate-data:erase  # WARNING: Erases existing data
   ```

3. **Check User Permissions**:
   - Verify user is in `confluence-users` group
   - Check API authentication headers in Network tab

---

## Quick Debugging Script

For rapid diagnosis, use this browser console script:

```javascript
// Quick component health check
(function debugDVM() {
  console.log("=== Database Version Manager Debug ===");

  // Check component existence
  const exists = typeof window.DatabaseVersionManager === "function";
  console.log("Component exists:", exists ? "✅" : "❌");

  if (!exists) {
    console.log("→ Solution: Clear browser cache and ScriptRunner cache");
    return;
  }

  // Test instantiation
  try {
    const test = new window.DatabaseVersionManager({ temporaryInstance: true });
    console.log("Can instantiate:", "✅");
  } catch (e) {
    console.log("Can instantiate:", "❌", e.message);
    console.log("→ Solution: Check console for constructor errors");
    return;
  }

  // Test API endpoints
  Promise.all([
    fetch("/rest/scriptrunner/latest/custom/databaseVersions/packageSQL").then(
      (r) => ({ endpoint: "packageSQL", status: r.status }),
    ),
    fetch(
      "/rest/scriptrunner/latest/custom/databaseVersions/packageLiquibase",
    ).then((r) => ({ endpoint: "packageLiquibase", status: r.status })),
  ]).then((results) => {
    console.log("API Endpoints:");
    results.forEach((r) => {
      console.log(`  ${r.endpoint}:`, r.status === 200 ? "✅" : "❌", r.status);
    });

    if (results.some((r) => r.status !== 200)) {
      console.log("→ Solution: Check ScriptRunner endpoint registration");
    }
  });
})();
```

---

## Escalation Path

### Level 1: Browser Issues (30 seconds)

1. Hard refresh: `Ctrl+Shift+R` / `Cmd+Shift+R`
2. Clear browser cache for localhost:8090

### Level 2: ScriptRunner Cache (2 minutes)

1. Confluence Admin → ScriptRunner → Clear Cache
2. Wait 30 seconds
3. Refresh Admin GUI

### Level 3: Component Registration (5 minutes)

1. Verify ComponentOrchestrator includes DatabaseVersionManager
2. Check component loading order in browser Network tab
3. Look for race conditions in console errors

### Level 4: Full System Reset (10 minutes)

```bash
# From local-dev-setup/
npm stop
# Wait 30 seconds
npm start
# Wait for full startup
```

### Level 5: Deep Debugging (15 minutes)

1. Check Confluence logs: `npm run logs:confluence`
2. Check PostgreSQL logs: `npm run logs:postgres`
3. Verify database migrations: Check Liquibase changelogs
4. Review ScriptRunner compilation logs

---

## Success Criteria

The Database Version Manager is working correctly when:

1. ✅ Component loads without console errors
2. ✅ "Generate SQL Package" button produces output
3. ✅ "Generate Liquibase Package" button produces XML
4. ✅ Copy buttons successfully copy to clipboard
5. ✅ Migration statistics display correctly
6. ✅ API endpoints return 200 with valid data

---

## Network Tab Analysis

When debugging, check the Network tab for:

### JavaScript Loading

- `DatabaseVersionManager.js` should return 200 (not 304 cached)
- File size should match latest version
- Response headers should show recent timestamp

### API Requests

- Look for `/rest/scriptrunner/latest/custom/databaseVersions/` calls
- Verify URLs use `packageSQL` and `packageLiquibase` (not old `packages/sql`)
- Check response codes and content-type headers

### Common Problems

- 404 errors → Endpoint registration issue
- 401/403 errors → Authentication problem
- CORS errors → Configuration issue
- Empty responses → Database connection problem

---

## Historical Context

This component underwent significant URL restructuring:

- **Original**: `/packages/sql` and `/packages/liquibase`
- **Fixed**: `/packageSQL` and `/packageLiquibase`

The change was made to comply with ScriptRunner REST endpoint naming conventions which don't support nested paths well.

---

## Related Documentation

- US-088-B: Database Version Manager story (completed)
- ADR-059: SQL Schema-First Development Principle
- Component Architecture: `docs/roadmap/sprint6/US-082-B-component-architecture.md`

---

_Last Updated: Sprint 7 - Post US-088-B Completion_
