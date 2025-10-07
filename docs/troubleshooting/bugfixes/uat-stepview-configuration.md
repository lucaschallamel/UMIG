# UAT StepView Configuration Fix

## Problem Summary

**Error**: `buildStepViewURL: Server configuration not available` in UAT browser console
**Root Cause**: Incomplete stepView configuration in UAT database
**Impact**: StepView URLs cannot be generated, preventing email notifications and step navigation

## Root Cause Analysis

### Database Configuration Status (UAT - env_id=3)

| Configuration Key                | Status         | Value                                | Issue                 |
| -------------------------------- | -------------- | ------------------------------------ | --------------------- |
| `stepview.confluence.base.url`   | ✅ Present     | `https://confluence-evx.corp.ubp.ch` | Valid                 |
| `stepview.confluence.space.key`  | ❌ **MISSING** | -                                    | **Not in database**   |
| `stepview.confluence.page.id`    | ❌ **Invalid** | `TBD`                                | **Placeholder value** |
| `stepview.confluence.page.title` | ✅ Present     | `UMIG - Step View (UAT)`             | Valid                 |

### Code Path Analysis

1. **iterationViewMacro.groovy** (lines 25-26):

   ```groovy
   def urlConfig = UrlConstructionService.getUrlConfigurationForEnvironment()
   def stepViewBaseUrl = UrlConstructionService.buildStepViewUrlTemplate()
   ```

2. **UrlConstructionService.groovy** `getSystemConfiguration()` (lines 335-342):

   ```groovy
   // Only cache if we have all required configuration values
   if (config.scf_base_url && config.scf_space_key && config.scf_page_id && config.scf_page_title) {
       configurationCache[environmentCode] = config
       cacheLastUpdated = now
       return config
   } else {
       println "UrlConstructionService: Incomplete configuration for ${environmentCode}"
       return null  // ← RETURNS NULL when any field missing
   }
   ```

3. **Result**: When `getSystemConfiguration('UAT')` returns `null`, the macro injects:

   ```javascript
   stepView: {
       baseUrl: "",  // Empty string instead of null
       urlConfig: null
   }
   ```

4. **Client-Side Error** (iteration-view.js:4848):
   ```javascript
   if (!stepViewConfig?.baseUrl || stepViewConfig.baseUrl.trim() === "") {
     console.error("buildStepViewURL: Server configuration not available");
   }
   ```

## Solution: Database Configuration Update

### Step 1: Find UAT Confluence Page ID

**Method A: From Browser (Recommended)**

1. Navigate to UAT Confluence: https://confluence-evx.corp.ubp.ch
2. Open the page containing the UMIG StepView macro
3. Look at the URL: `https://confluence-evx.corp.ubp.ch/pages/viewpage.action?pageId=XXXXXX`
4. Copy the `pageId=XXXXXX` value

**Method B: From Page Edit Mode**

1. Edit the stepView page in UAT
2. Page ID is visible in the edit URL

### Step 2: Apply Database Fixes

**Option A: If Space Key is 'UMIG' (Same as DEV)**

```sql
-- Add missing space key for UAT
INSERT INTO public.system_configuration_scf
(scf_id, env_id, scf_key, scf_category, scf_value, scf_description,
 scf_is_active, scf_is_system_managed, scf_data_type, scf_validation_pattern,
 created_by, created_at, updated_by, updated_at)
VALUES
(gen_random_uuid(),
 3,  -- UAT environment
 'stepview.confluence.space.key',
 'MACRO_LOCATION',
 'UMIG',  -- ← Update if different in UAT
 'Confluence space key where stepView macro is deployed for UAT',
 true,
 true,
 'STRING',
 NULL,
 'UAT-config-fix',
 NOW(),
 'UAT-config-fix',
 NOW()
);

-- Update page ID from 'TBD' to actual value
UPDATE public.system_configuration_scf
SET
  scf_value = 'XXXXXX',  -- ← Replace XXXXXX with actual page ID from Step 1
  scf_description = 'Confluence page ID containing stepView macro for UAT',
  updated_by = 'UAT-config-fix',
  updated_at = NOW()
WHERE
  env_id = 3
  AND scf_key = 'stepview.confluence.page.id';
```

**Option B: Complete Configuration Script (Copy-Paste Ready)**

```sql
-- UAT StepView Configuration Fix
-- Date: 2025-10-07
-- Issue: Missing space_key, invalid page_id ('TBD')

BEGIN;

-- 1. Add missing space key
INSERT INTO public.system_configuration_scf
(scf_id, env_id, scf_key, scf_category, scf_value, scf_description,
 scf_is_active, scf_is_system_managed, scf_data_type, scf_validation_pattern,
 created_by, created_at, updated_by, updated_at)
VALUES
(gen_random_uuid(),
 3,  -- UAT
 'stepview.confluence.space.key',
 'MACRO_LOCATION',
 'UMIG',  -- ← VERIFY THIS MATCHES UAT SPACE KEY
 'Confluence space key where stepView macro is deployed for UAT',
 true, true, 'STRING', NULL,
 'UAT-config-fix', NOW(), 'UAT-config-fix', NOW()
);

-- 2. Update page ID from 'TBD' to actual value
UPDATE public.system_configuration_scf
SET
  scf_value = 'XXXXXX',  -- ← REPLACE WITH ACTUAL PAGE ID
  scf_description = 'Confluence page ID containing stepView macro for UAT',
  updated_by = 'UAT-config-fix',
  updated_at = NOW()
WHERE
  env_id = 3
  AND scf_key = 'stepview.confluence.page.id';

-- 3. Verify configuration is complete
SELECT
  e.env_code,
  scf.scf_key,
  scf.scf_value,
  scf.scf_is_active
FROM system_configuration_scf scf
INNER JOIN environments_env e ON scf.env_id = e.env_id
WHERE e.env_code = 'UAT'
  AND scf.scf_key LIKE 'stepview.confluence%'
ORDER BY scf.scf_key;

-- Expected result: 4 rows
-- ✅ stepview.confluence.base.url = https://confluence-evx.corp.ubp.ch
-- ✅ stepview.confluence.page.id = <actual page ID>
-- ✅ stepview.confluence.page.title = UMIG - Step View (UAT)
-- ✅ stepview.confluence.space.key = UMIG (or actual space key)

COMMIT;
```

### Step 3: Clear Cache and Verify

**Clear Service Cache:**

```groovy
// In Confluence Script Console or via API
import umig.utils.UrlConstructionService
UrlConstructionService.clearCache()
println "Configuration cache cleared"
```

**Verify Configuration:**

```groovy
// In Confluence Script Console
import umig.utils.UrlConstructionService
import umig.service.ConfigurationService

def env = ConfigurationService.getCurrentEnvironment()
println "Detected environment: ${env}"

def config = UrlConstructionService.getSystemConfiguration(env)
if (config) {
    println "✅ Configuration loaded successfully:"
    println "  Base URL: ${config.scf_base_url}"
    println "  Space Key: ${config.scf_space_key}"
    println "  Page ID: ${config.scf_page_id}"
    println "  Page Title: ${config.scf_page_title}"
} else {
    println "❌ Configuration still incomplete"
}

def templateUrl = UrlConstructionService.buildStepViewUrlTemplate()
println "Template URL: ${templateUrl ?: 'NULL'}"
```

### Step 4: Refresh UAT Page

1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Reload the UMIG page in UAT
3. Check browser console - error should be gone
4. Verify `window.UMIG_ITERATION_CONFIG.stepView.baseUrl` is populated

## Verification Checklist

- [ ] Found actual UAT Confluence page ID containing stepView macro
- [ ] Verified UAT space key (likely 'UMIG' but confirm)
- [ ] Executed SQL script to add space_key and update page_id
- [ ] Verified 4 configuration rows exist for UAT environment
- [ ] Cleared UrlConstructionService cache
- [ ] Refreshed UAT browser page
- [ ] Confirmed browser console no longer shows baseUrl error
- [ ] Tested stepView URL generation works

## Expected Behavior After Fix

**Browser Console:**

```javascript
window.UMIG_ITERATION_CONFIG.stepView;
// {
//   baseUrl: "https://confluence-evx.corp.ubp.ch/pages/viewpage.action?pageId=XXXXXX",
//   urlConfig: {
//     baseUrl: "https://confluence-evx.corp.ubp.ch",
//     spaceKey: "UMIG",
//     pageId: "XXXXXX",
//     pageTitle: "UMIG - Step View (UAT)",
//     environment: "UAT",
//     isActive: true
//   }
// }
```

**URL Construction:**

```javascript
buildStepViewURL(stepInstanceId, migrationCode, iterationCode);
// Returns: https://confluence-evx.corp.ubp.ch/pages/viewpage.action?pageId=XXXXXX&mig=TORONTO&ite=run1&stepid=PRE-001
```

## Additional Improvements (Optional)

### Enhanced Error Logging

Update `UrlConstructionService.getSystemConfiguration()` to provide more specific error messages:

```groovy
// Around line 335 in UrlConstructionService.groovy
if (config.scf_base_url && config.scf_space_key && config.scf_page_id && config.scf_page_title) {
    configurationCache[environmentCode] = config
    cacheLastUpdated = now
    return config
} else {
    // Enhanced diagnostic logging
    def missing = []
    if (!config.scf_base_url) missing << 'scf_base_url'
    if (!config.scf_space_key) missing << 'scf_space_key'
    if (!config.scf_page_id) missing << 'scf_page_id'
    if (!config.scf_page_title) missing << 'scf_page_title'

    println "❌ UrlConstructionService: Incomplete configuration for ${environmentCode}"
    println "   Missing or empty fields: ${missing.join(', ')}"
    println "   Found configs: ${configs}"
    return null
}
```

## Related Documentation

- **ADR-073**: Enhanced 4-Tier Environment Detection Architecture
- **US-098**: Configuration Management System
- **UrlConstructionService**: `/src/groovy/umig/utils/UrlConstructionService.groovy`
- **ConfigurationService**: `/src/groovy/umig/service/ConfigurationService.groovy`
- **iterationViewMacro**: `/src/groovy/umig/macros/v1/iterationViewMacro.groovy`

## Troubleshooting

### Issue: Still getting empty baseUrl after fix

**Check 1**: Verify configuration in database

```sql
SELECT scf.scf_key, scf.scf_value
FROM system_configuration_scf scf
INNER JOIN environments_env e ON scf.env_id = e.env_id
WHERE e.env_code = 'UAT'
  AND scf.scf_key LIKE 'stepview%'
  AND scf.scf_is_active = true;
```

**Check 2**: Verify environment detection

```groovy
import umig.service.ConfigurationService
println ConfigurationService.getCurrentEnvironment()
// Should print: UAT
```

**Check 3**: Check Confluence logs

```bash
grep -i "UrlConstructionService" /appli/confluence/logs/atlassian-confluence.log
```

### Issue: Environment not detected as UAT

**Symptoms**: `getCurrentEnvironment()` returns 'PROD' or 'DEV' instead of 'UAT'

**Fix**: Set environment variable or system property:

```bash
# Environment variable (preferred for UAT server)
export UMIG_ENVIRONMENT=UAT

# Or system property (in Confluence startup)
-Dumig.environment=UAT
```

**Verify URL pattern**: Ensure Confluence base URL contains `confluence-evx.corp.ubp.ch`

---

**Document Version**: 1.0
**Created**: 2025-10-07
**Author**: UMIG Development Team
**Related Issue**: UAT StepView URL Configuration Loading Failure
