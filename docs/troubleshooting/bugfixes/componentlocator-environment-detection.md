# BUGFIX: ComponentLocator Environment Detection Failure

## Executive Summary

**Issue**: Email service broken in DEV environment due to ComponentLocator failure
**Root Cause**: `ComponentLocator.getComponent(SettingsManager.class)` returns null in ScriptRunner context
**Solution**: Multi-tier fallback strategy with localhost default for DEV
**Status**: ✅ Fixed - Verified
**Date**: 2025-10-07

---

## Quick Verification

### 1. Run Test Script (ScriptRunner Console)

Copy/paste into ScriptRunner Console (`/plugins/servlet/scriptrunner-resources/console`):

```groovy
// Load and run diagnostic test
def testScript = new File('/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/diagnostics/test-environment-detection-bugfix.groovy')
evaluate(testScript)
```

**Expected Output**:

```
✅ SUCCESS: Detected environment = DEV
✅ VALIDATION: Environment code is valid
✅ Tier 3 (URL Detection): Retrieved base URL: http://localhost:8090
✅ SUCCESS: Generated URL
✅ VALIDATION: URL structure looks correct
```

### 2. Test Email Service

```bash
cd local-dev-setup
npm run email:test
```

**Expected Output**:

```
✅ Email sent successfully
✅ StepView URL: http://localhost:8090/display/UMIG/stepview?...
```

### 3. Verify Logs

Check Confluence logs for environment detection:

```bash
npm run logs:confluence | grep "Retrieved Confluence base URL"
```

**Expected Log Entry**:

```
ConfigurationService: Retrieved Confluence base URL via ComponentLocator: http://localhost:8090
# OR (if ComponentLocator fails - this is OK!)
ConfigurationService: Could not determine Confluence base URL via ComponentLocator or system property - using localhost:8090 fallback
```

---

## Root Cause Explanation

### What Broke and Why

**Before US-098 Phase 4** (Sept 2025):

```groovy
// Simple 2-tier detection - ALWAYS WORKED
getCurrentEnvironment() {
    return System.getProperty('umig.environment') ?:
           System.getenv('UMIG_ENVIRONMENT') ?:
           'PROD'
}
```

**US-098 Phase 4** (Sept 26, 2025):

```groovy
// Added URL-based auto-detection - BROKE DEV
getCurrentEnvironment() {
    // ... Tier 1 & 2 same ...

    // NEW: Tier 3 - URL-based detection
    String baseUrl = ComponentLocator.getComponent(SettingsManager.class)
                                     .globalSettings.baseUrl
    // ❌ PROBLEM: Returns null in ScriptRunner context!

    return detectEnvironmentFromUrl(baseUrl) ?: 'PROD'
    // ❌ Returns 'PROD' for DEV environment!
}
```

### Why ComponentLocator Fails

**ComponentLocator Context Dependency Matrix**:

| Execution Context        | Works?    | Reason                            |
| ------------------------ | --------- | --------------------------------- |
| REST API Endpoints       | ✅ YES    | Confluence servlet context        |
| Web Actions              | ✅ YES    | Full component registry available |
| Scheduled Jobs           | ✅ YES    | Background executor context       |
| **ScriptRunner Console** | **❌ NO** | **Isolated Groovy execution**     |
| Background Scripts       | ❌ NO     | Different class loader            |
| Database Migrations      | ❌ NO     | Bootstrap phase                   |

**Technical Details**:

```
ScriptRunner Groovy Execution
  ↓
Isolated Class Loader Boundary
  ↓
ComponentLocator.getComponent(SettingsManager)
  ↓
Looks up in Confluence Component Registry
  ↓
❌ FAILS: Component not accessible across class loader boundary
  ↓
Returns null
  ↓
detectEnvironmentFromUrl(null) → null
  ↓
Defaults to 'PROD' ❌ WRONG for DEV!
```

### Impact

**Broken Functionality**:

- ✅ **Fixed**: Email notifications now work
- ✅ **Fixed**: StepView URL generation
- ✅ **Fixed**: Environment-specific configuration lookup
- ✅ **Fixed**: URL construction service

**Why Undetected Initially**:

- UAT/PROD had system properties set (`-Dumig.environment=UAT`) → Tier 1 worked
- DEV had no system property → Relied on Tier 3 (URL detection) → Failed silently
- Integration tests ran in Confluence context → ComponentLocator worked

---

## The Fix - Multi-Tier Fallback Strategy

### Implementation

```groovy
private static String getConfluenceBaseUrl() {
    // Tier 1: Try ComponentLocator (best effort)
    try {
        def settingsManager = ComponentLocator.getComponent(SettingsManager.class)
        if (settingsManager?.globalSettings?.baseUrl) {
            String baseUrl = settingsManager.globalSettings.baseUrl
            log.info("Retrieved Confluence base URL via ComponentLocator: ${baseUrl}")
            return baseUrl
        }
    } catch (Exception e) {
        log.warn("ComponentLocator failed (expected in ScriptRunner): ${e.message}")
    }

    // Tier 2: Try system property (explicit override)
    String systemPropUrl = System.getProperty('confluence.base.url')
    if (systemPropUrl) {
        log.info("Using Confluence base URL from system property: ${systemPropUrl}")
        return systemPropUrl
    }

    // Tier 3: Hardcoded localhost fallback (fail-safe for DEV)
    log.warn("Using localhost:8090 fallback (DEV default)")
    return 'http://localhost:8090'
}
```

### Why This Works

1. **Always Returns Non-Null**: No more silent null failures
2. **Graceful Degradation**: Tries best option first, falls back progressively
3. **Context-Aware**: Recognizes ScriptRunner limitations
4. **DEV-Safe**: Localhost fallback appropriate for development environment
5. **Override Capable**: System property allows manual configuration if needed

---

## Comprehensive Testing Guide

### Test 1: Groovy Console Verification

**Run In**: ScriptRunner Console (`/plugins/servlet/scriptrunner-resources/console`)

```groovy
import umig.service.ConfigurationService
import umig.utils.UrlConstructionService

// Test environment detection
def env = ConfigurationService.getCurrentEnvironment()
println "Current Environment: ${env}"
assert env == 'DEV', "Expected DEV, got ${env}"

// Test URL construction
def testUrl = UrlConstructionService.buildStepViewUrl(
    java.util.UUID.randomUUID(),
    'MIG001',
    'ITER001'
)
println "Test URL: ${testUrl}"
assert testUrl != null, "URL should not be null"
assert testUrl.contains('localhost'), "URL should contain localhost for DEV"

println "✅ ALL TESTS PASSED"
```

**Expected Output**:

```
Current Environment: DEV
Test URL: http://localhost:8090/display/UMIG/stepview?...
✅ ALL TESTS PASSED
```

### Test 2: Email Service End-to-End Test

```bash
# Terminal 1: Start email test service
cd local-dev-setup
npm run mailhog:clear  # Clear previous test emails
npm run email:test     # Send test email

# Terminal 2: Verify email received
npm run mailhog:check  # Should show 1 message

# Open MailHog UI
open http://localhost:8025
```

**Verify in MailHog**:

1. Email received successfully
2. StepView link points to `http://localhost:8090/...`
3. Link is clickable and correct

### Test 3: REST API Environment Detection

```bash
# Get session cookie first
COOKIE=$(curl -X POST "http://localhost:8090/rest/api/session" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}' \
  -c - -s | grep JSESSIONID | awk '{print $7}')

# Test environment endpoint
curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/web" \
  -H "Cookie: JSESSIONID=${COOKIE}" \
  -H "X-Atlassian-Token: no-check" \
  -s | jq '.currentEnvironment'
```

**Expected Output**: `"DEV"`

### Test 4: System Property Override

**Run In**: ScriptRunner Console

```groovy
// Test Tier 1 override (highest priority)
System.setProperty('umig.environment', 'UAT')
def env = umig.service.ConfigurationService.getCurrentEnvironment()
println "Override Test: ${env}"
assert env == 'UAT', "System property override failed"

// Clean up
System.clearProperty('umig.environment')
env = umig.service.ConfigurationService.getCurrentEnvironment()
println "After cleanup: ${env}"
assert env == 'DEV', "Should return to DEV after clearing override"

println "✅ OVERRIDE TEST PASSED"
```

### Test 5: ComponentLocator Direct Diagnostic

**Run In**: ScriptRunner Console

```groovy
import com.atlassian.sal.api.component.ComponentLocator
import com.atlassian.confluence.setup.settings.SettingsManager

try {
    def settingsManager = ComponentLocator.getComponent(SettingsManager.class)
    if (settingsManager) {
        println "✅ ComponentLocator WORKS in this context"
        println "   Base URL: ${settingsManager.globalSettings.baseUrl}"
    } else {
        println "⚠️  ComponentLocator returned null (expected in ScriptRunner console)"
    }
} catch (Exception e) {
    println "❌ ComponentLocator FAILED (expected in ScriptRunner console):"
    println "   ${e.class.simpleName}: ${e.message}"
    println "   This is NORMAL and why we need the fallback logic!"
}
```

**Expected Behaviors**:

- In **REST API context**: ComponentLocator works ✅
- In **ScriptRunner Console**: ComponentLocator fails ❌ (expected, fallback used)

---

## Verification Checklist

### Before This Fix

- [ ] ❌ Email service fails in DEV
- [ ] ❌ buildStepViewUrl() returns null
- [ ] ❌ getCurrentEnvironment() returns 'PROD' (wrong)
- [ ] ❌ ConfigurationService logs "Failed to get Confluence base URL"

### After This Fix

- [x] ✅ Email service works in DEV
- [x] ✅ buildStepViewUrl() returns valid URL
- [x] ✅ getCurrentEnvironment() returns 'DEV' (correct)
- [x] ✅ ConfigurationService logs "Using localhost:8090 fallback"

---

## Deployment Notes

### No Action Required for DEV

The fix automatically detects DEV environment via localhost fallback.

### Optional: System Property Configuration

For explicit control in any environment:

```bash
# In docker-compose.yml or container startup
environment:
  - CATALINA_OPTS=-Dumig.environment=DEV -Dconfluence.base.url=http://localhost:8090
```

### UAT/PROD Deployments

No changes needed - these environments already use system properties:

```bash
-Dumig.environment=UAT
-Dumig.environment=PROD
```

---

## Monitoring and Alerts

### Warning Signs

**In Production Logs** - Watch for these warnings:

```log
⚠️  ConfigurationService: Could not determine Confluence base URL via ComponentLocator or system property - using localhost:8090 fallback
```

**Action**: This should NEVER appear in UAT/PROD. If it does:

1. Check system property is set: `-Dumig.environment=UAT`
2. Verify Confluence SettingsManager is initialized
3. Check class loader configuration

### Success Indicators

**In DEV Logs**:

```log
✅ ConfigurationService: Retrieved Confluence base URL via ComponentLocator: http://localhost:8090
# OR
✅ ConfigurationService: Using localhost:8090 fallback (DEV default)
```

**In UAT/PROD Logs**:

```log
✅ ConfigurationService: Environment from system property: UAT
✅ ConfigurationService: Retrieved Confluence base URL via ComponentLocator: https://confluence-evx.corp.ubp.ch
```

---

## Related Documentation

- **ADR-074**: ComponentLocator ScriptRunner Compatibility Fix (detailed architecture decision)
- **ADR-073**: Enhanced 4-Tier Environment Detection Architecture (parent design)
- **US-098**: Configuration Management System (feature that introduced the issue)
- **Test Script**: `src/groovy/umig/tests/diagnostics/test-environment-detection-bugfix.groovy`

---

## Lessons Learned

### ✅ Best Practices Established

1. **Always Provide Fallbacks**: External dependencies (ComponentLocator) may not be available in all contexts
2. **Test in ScriptRunner Console**: Most restrictive execution context - if it works there, it works everywhere
3. **Fail-Safe Defaults**: Prefer DEV over PROD when environment is ambiguous (safety first)
4. **Explicit Logging**: Log which detection tier succeeded for debugging
5. **Defensive Programming**: Check for null even when theoretically impossible

### ❌ Anti-Patterns to Avoid

1. **Don't Rely Solely on ComponentLocator**: May not work in ScriptRunner scripts
2. **Don't Default to PROD**: Unknown environment should default to DEV (safer)
3. **Don't Skip Context Testing**: Test in multiple execution contexts (REST API, console, background)
4. **Don't Ignore Null Returns**: Always handle null gracefully with fallbacks
5. **Don't Assume Confluence APIs Always Available**: Class loader boundaries matter

---

## Summary

**Problem**: ComponentLocator unreliable across execution contexts
**Solution**: 3-tier fallback (ComponentLocator → System Property → Localhost)
**Result**: Environment detection works in ALL contexts
**Verification**: Run test script + email service test
**Status**: ✅ Fixed and verified

---

**Author**: System Architecture Team
**Date**: 2025-10-07
**Version**: 1.0
