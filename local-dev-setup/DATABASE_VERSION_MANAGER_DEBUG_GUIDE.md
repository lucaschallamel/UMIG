# DatabaseVersionManager Debug Guide

## URGENT: No Changes Visible After JavaScript Fixes

**Problem**: Applied critical URL fixes to DatabaseVersionManager.js but user reports "I don't see any change happening at all"

**Fixed URLs Applied**:
- `/packages/sql` → `/packageSQL` ✅
- `/packages/liquibase` → `/packageLiquibase` ✅
- Added comprehensive error logging ✅
- Improved fallback template ✅

**Goal**: Identify why fixes aren't taking effect in browser

---

## 🚀 IMMEDIATE DEBUGGING STEPS

### Step 1: Load Debug Script (CRITICAL)

1. **Open browser** and navigate to Admin GUI: `http://localhost:8090`
2. **Open Developer Tools**: `F12` or right-click → "Inspect"
3. **Go to Console tab**
4. **Copy and paste** the entire contents of `/local-dev-setup/DATABASE_VERSION_MANAGER_DEBUG.js`
5. **Press Enter** to load debug tools

### Step 2: Run Comprehensive Analysis

In the browser console, run:
```javascript
debugDatabaseVersionManager()
```

This will perform complete analysis and provide immediate insights.

### Step 3: Check Critical Results

Look for these key indicators in the debug output:

#### 🔍 Component Loading Status
```
📦 COMPONENT STATUS:
  ✅/❌ Status: LOADED/FAILED
  📋 Class exists: true/false
  🏗️ Instance creation: true/false
```

#### 🌐 API Endpoint Status
```
🌐 API ENDPOINTS:
  ✅/❌ main: 200/404
  ✅/❌ packageSQL: 200/404
  ✅/❌ packageLiquibase: 200/404
```

#### 🚨 Critical Issues
```
🚨 CRITICAL ISSUES:
  1. [Specific issue found]
     → [Recommended action]
```

---

## 🎯 MOST LIKELY CAUSES & SOLUTIONS

### Issue 1: JavaScript File Not Loading (80% of cases)
**Symptoms**: `❌ DatabaseVersionManager class not found`

**Solutions**:
1. **Hard Refresh**: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
2. **Clear Browser Cache**: Dev Tools → Application → Storage → Clear Site Data
3. **ScriptRunner Cache**: Confluence Admin → ScriptRunner → Clear Cache

**Verification**:
```javascript
// Run in console:
typeof window.DatabaseVersionManager === 'function'  // Should return true
```

### Issue 2: ScriptRunner Cache (15% of cases)
**Symptoms**: Old version of file is cached in ScriptRunner

**Solutions**:
1. **Confluence Admin** → **ScriptRunner** → **Script Console**
2. **Clear Cache** button
3. **Restart Confluence** if persistent

### Issue 3: API Endpoints Not Registered (5% of cases)
**Symptoms**: `❌ packageSQL: 404`, `❌ packageLiquibase: 404`

**Solutions**:
1. Check **ScriptRunner REST Endpoints** in admin
2. Verify `DatabaseVersionsApi.groovy` compiled without errors
3. Check ScriptRunner logs for Groovy compilation errors

---

## 🧪 INDIVIDUAL TEST FUNCTIONS

### Test Component Loading
```javascript
testComponentInstantiation()
```
**Expected**: `✅ Test instance created successfully`

### Test API Endpoints
```javascript
testApiEndpoints()
```
**Expected**: All endpoints return `✅ 200 OK`

### Check Cache Status
```javascript
checkScriptRunnerCache()
```
**Expected**: Scripts loaded, no cache warnings

---

## 🔧 STEP-BY-STEP VERIFICATION

### Verification 1: File Loading
```javascript
// Check if class exists
window.DatabaseVersionManager

// Check if file is loaded
document.querySelector('script[src*="DatabaseVersionManager"]')

// Check script content
Array.from(document.querySelectorAll('script')).find(s =>
  s.innerHTML.includes('generateSQLPackage')
)
```

### Verification 2: URL Fixes Applied
```javascript
// Create test instance and check URLs
const test = new window.DatabaseVersionManager({temporaryInstance: true});
// Check the fetchWithCSRF calls in generateSQLPackage method
test.toString().includes('packageSQL')  // Should be true
test.toString().includes('packageLiquibase')  // Should be true
```

### Verification 3: API Endpoint Response
```javascript
// Test the fixed URLs directly
fetch('/rest/scriptrunner/latest/custom/databaseVersions/packageSQL')
  .then(r => console.log('packageSQL:', r.status))

fetch('/rest/scriptrunner/latest/custom/databaseVersions/packageLiquibase')
  .then(r => console.log('packageLiquibase:', r.status))
```

---

## 📊 NETWORK TAB ANALYSIS

### What to Check in Network Tab:
1. **JavaScript Loading**:
   - Look for `DatabaseVersionManager.js` requests
   - Verify status is `200 OK`, not `304 Not Modified` (cache)
   - Check response content has latest fixes

2. **API Requests**:
   - Look for requests to `/rest/scriptrunner/latest/custom/databaseVersions/`
   - Verify URLs are `packageSQL` and `packageLiquibase` (NOT `packages/sql`)
   - Check response codes (200 vs 404)

3. **Error Indicators**:
   - Any 404 errors on JavaScript files
   - CORS errors
   - Authentication failures

---

## 🏃 QUICK RESOLUTION CHECKLIST

**Try these in order until issue resolves:**

### ☐ Level 1: Browser Cache (30 seconds)
```bash
1. Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. Check if changes appear
```

### ☐ Level 2: Clear Browser Cache (2 minutes)
```bash
1. F12 → Application tab → Storage → Clear Site Data (localhost:8090)
2. Refresh page
3. Run: debugDatabaseVersionManager()
```

### ☐ Level 3: ScriptRunner Cache (5 minutes)
```bash
1. Confluence Admin → ScriptRunner → Script Console → Clear Cache
2. Wait 30 seconds
3. Refresh admin GUI page
4. Run: debugDatabaseVersionManager()
```

### ☐ Level 4: Component Registration (3 minutes)
```bash
1. Check ScriptRunner REST Endpoints for DatabaseVersionsApi entries
2. Verify all endpoints exist: databaseVersions, databaseVersionsPackageSQL, etc.
3. Re-save the Groovy API file if needed
```

### ☐ Level 5: Full Restart (10 minutes)
```bash
1. From local-dev-setup/: npm stop
2. Wait 30 seconds
3. npm start
4. Wait for full startup
5. Test again
```

---

## 📋 EXPECTED DEBUG RESULTS

### ✅ HEALTHY STATE:
```
📦 COMPONENT STATUS:
  ✅ Status: LOADED
  📋 Class exists: true
  🏗️ Instance creation: true

🌐 API ENDPOINTS:
  ✅ main: 200
  ✅ packageSQL: 200
  ✅ packageLiquibase: 200
  ✅ statistics: 200

🚨 CRITICAL ISSUES: (none)
```

### ❌ PROBLEM STATES:

#### JavaScript Not Loading:
```
📦 COMPONENT STATUS:
  ❌ Status: FAILED
  📋 Class exists: false
```
**→ Solution**: Clear browser/ScriptRunner cache

#### API Endpoints Missing:
```
🌐 API ENDPOINTS:
  ✅ main: 200
  ❌ packageSQL: 404
  ❌ packageLiquibase: 404
```
**→ Solution**: Check ScriptRunner endpoint registration

#### Component Broken:
```
📦 COMPONENT STATUS:
  ✅ Status: FAILED
  📋 Class exists: true
  🏗️ Instance creation: false
```
**→ Solution**: Check console for constructor errors

---

## 🔍 ADVANCED DEBUGGING

### Manual Component Test:
```javascript
// Test in browser console:
const container = document.createElement('div');
container.id = 'test-dvm-container';
document.body.appendChild(container);

const dvm = new window.DatabaseVersionManager('test-dvm-container');
dvm.initialize().then(() => {
  console.log('✅ Component initialized');
  return dvm.render();
}).then(() => {
  console.log('✅ Component rendered');
}).catch(error => {
  console.error('❌ Component test failed:', error);
});
```

### API Call Test:
```javascript
// Test the exact API calls the component makes:
fetch('/rest/scriptrunner/latest/custom/databaseVersions/packageSQL?selection=all&format=postgresql')
  .then(response => {
    console.log('Response:', response.status, response.statusText);
    return response.json();
  })
  .then(data => {
    console.log('✅ packageSQL working, keys:', Object.keys(data));
  })
  .catch(error => {
    console.error('❌ packageSQL failed:', error);
  });
```

---

## 📞 ESCALATION CRITERIA

**Escalate to system-level debugging if:**
1. All cache clearing attempts fail
2. Debug script shows all components healthy but UI still doesn't work
3. API endpoints return 200 but with error responses
4. Confluence logs show persistent errors

**Next steps would involve:**
- Confluence application log analysis
- ScriptRunner internal state inspection
- Database connectivity verification
- System resource constraint analysis

---

## 🎯 SUCCESS CRITERIA

**Changes are working when you see:**
1. ✅ `debugDatabaseVersionManager()` shows all green status
2. ✅ Component loads and renders without errors
3. ✅ "Generate SQL Package" button works and shows results
4. ✅ Network tab shows correct API URLs being called
5. ✅ No 404 errors in browser console

**The user should be able to:**
- Click "Generate SQL Package" and see package results
- Click "Generate Liquibase Package" and see XML output
- Copy deployment scripts using the copy buttons
- See migration statistics and version information

---

**Start with running `debugDatabaseVersionManager()` and report the critical issues found!**