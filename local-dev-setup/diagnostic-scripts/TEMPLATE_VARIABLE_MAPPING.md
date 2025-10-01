# Email Template Variable Mapping Analysis

## Variable Flow Analysis

### 1. Database → EnrichedData

**Source**: `StepRepository.getEnhancedStepInstanceForEmail()`
**File**: `/src/groovy/umig/repository/StepRepository.groovy` (line 4241)

```sql
CONCAT(stm.stt_code, '-', LPAD(stm.stm_number::text, 3, '0')) as step_code
```

This SQL computes `step_code` directly in the query and returns it as a field in the result map.

**Result**: `enrichedData.step_code` = "TRT-004" (or similar)

---

### 2. EnrichedData → stepInstance (Enrichment Merge)

**Source**: `EnhancedEmailService.sendStepStatusChangedNotificationWithUrl()`
**File**: `/src/groovy/umig/utils/EnhancedEmailService.groovy` (line 105)

```groovy
stepInstance = (enrichedData as Map) + (stepInstance as Map)
```

This merges enrichedData into stepInstance, with enrichedData taking precedence.

**Result**: `stepInstance.step_code` = "TRT-004" (after merge)

---

### 3. stepInstance → Template Variables

**Source**: `EnhancedEmailService.sendStepStatusChangedNotificationWithUrl()`
**File**: `/src/groovy/umig/utils/EnhancedEmailService.groovy` (line 230)

```groovy
def variables = [
    step_code: stepInstance.step_code ?: stepInstance.stt_code ?
        "${stepInstance.stt_code}-${String.format('%03d', stepInstance.stm_number ?: 0)}" : '',
    // ... other variables
]
```

**Logic**:
1. First tries `stepInstance.step_code` (from enrichedData)
2. If empty, tries to construct from `stepInstance.stt_code` and `stepInstance.stm_number`
3. If still empty, uses empty string ''

**Result**: `variables.step_code` = "TRT-004" (should be from enrichedData)

---

### 4. Template Variables → Email Template

**Source**: Email template in database
**File**: `/local-dev-setup/liquibase/changelogs/034_td015_simplify_email_templates.sql` (line 187)

```html
<h1 style="font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">
  📋 ${step_code}: ${step_title ?: "Step Details"}
</h1>
```

**Processing**: `GStringTemplateEngine` replaces `${step_code}` with value from variables map

**Expected**: `📋 TRT-004: socius vester amiculum sursum amita`
**Actual (Screenshot)**: `📋 : Step 4: socius vester amiculum sursum amita`

---

## Problem Analysis

### Symptom: Empty step_code in Email

The email subject and header show:
- Subject: `[UMIG] : Step 4: socius vester amiculum sursum amita - Status Changed to CANCELLED`
- Header: `📋 : Step 4: socius vester amiculum sursum amita`

Notice the `: Step 4:` pattern - the colon with space before "Step 4" indicates:
- **`${step_code}` is being replaced with an EMPTY STRING** (not null, not undefined)
- The template processor IS working (variables are being substituted)
- But the value is empty

### Root Cause Analysis

**Three Possible Scenarios**:

#### Scenario 1: ScriptRunner Cache Issue (MOST LIKELY)
**Probability**: 90%

**Evidence**:
- Code was fixed (static method call on line 86)
- Database has correct data (verified)
- Liquibase migration updated templates
- But behavior hasn't changed

**Hypothesis**:
ScriptRunner is still running the OLD version of EnhancedEmailService.groovy (before the static method fix). The old code had this bug:

```groovy
// OLD CODE (buggy)
Map<String, Object> enrichedData = stepRepository.getEnhancedStepInstanceForEmail(stepInstanceId)
// This fails because stepRepository is not defined (it should be StepRepository class)
```

When this fails, `enrichedData` is null, so:
1. The catch block at line 103-107 prints "WARNING: Data enrichment failed"
2. `stepInstance` is NOT enriched (no `step_code` field added)
3. Line 230 evaluates: `stepInstance.step_code` → null → fallback to `stepInstance.stt_code` → might also be null → empty string ''
4. Template gets empty string for `${step_code}`

**Verification**:
Check Confluence logs for this message:
```
🔧 [EnhancedEmailService] ⚠️ WARNING: Data enrichment failed: [error message]
```

If you DON'T see this message but also don't see the new diagnostic messages (lines 86-88, 91-101), it confirms ScriptRunner cache issue.

**Solution**: Force ScriptRunner cache refresh (see `SCRIPTRUNNER_CACHE_REFRESH.md`)

---

#### Scenario 2: Enrichment Query Returns NULL for step_code
**Probability**: 5%

**Evidence**: Would need to verify

**Hypothesis**:
The database query in `StepRepository.getEnhancedStepInstanceForEmail()` is running but returning NULL for step_code field due to:
- `stm.stt_code` is NULL in database
- `stm.stm_number` is NULL in database
- JOIN condition failing

**Verification**:
Run the SQL verification script:
```bash
psql -h localhost -p 5432 -U umig_app_user -d umig_app_db -f local-dev-setup/diagnostic-scripts/verify-step-instance-data.sql
```

**Solution**: If verified, fix database data

---

#### Scenario 3: Template Variable Mapping Bug
**Probability**: 5%

**Evidence**: Would need to verify

**Hypothesis**:
The template variable preparation (line 230) has a logic bug that results in empty string even when stepInstance.step_code exists.

**Verification**:
Check logs for this message (from line 106):
```
🔧 [EnhancedEmailService] ✅ Step instance enriched - AFTER MERGE step_code: '[value]'
```

If it shows empty, the merge itself worked but the value is empty. If it shows NULL, the merge failed.

**Solution**: Debug the variable preparation logic

---

## Diagnostic Workflow

### Step 1: Check Confluence Logs

```bash
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup
npm run logs:confluence | grep -A 50 "EnhancedEmailService" | tail -100
```

**Look for**:
- `🔍 DIAGNOSTIC: Calling getEnhancedStepInstanceForEmail` (new logging)
- `✅ Enhanced data retrieved - DETAILED INSPECTION:` (new logging)
- `step_code: 'TRT-004'` (should show value)
- `AFTER MERGE step_code: 'TRT-004'` (should show value after merge)

**If you DON'T see these new diagnostic messages**: ScriptRunner cache needs refresh → Go to Step 2

**If you see "enrichedData = NULL"**: Query failed → Go to Step 3

**If you see "step_code: ''" (empty)**: Database issue → Go to Step 3

---

### Step 2: Force ScriptRunner Cache Refresh

**Method 1** (Recommended - 5 seconds):
1. Open Confluence: http://localhost:8090
2. Settings → Manage apps → Script Console
3. Run this code:
```groovy
import com.onresolve.scriptrunner.runner.ScriptRunnerImpl
ScriptRunnerImpl.getInstance().clearCaches()
return "✅ Caches cleared"
```

**Verification**:
- Trigger another step status change
- Check logs immediately
- Should now see new diagnostic messages

**If still not working**: Try Method 2 (Plugin restart) or Method 3 (Confluence restart)

See full instructions in: `SCRIPTRUNNER_CACHE_REFRESH.md`

---

### Step 3: Verify Database Data

```bash
# Connect to PostgreSQL
docker exec -it umig-postgres psql -U umig_app_user -d umig_app_db

# Run verification query
\i /path/to/local-dev-setup/diagnostic-scripts/verify-step-instance-data.sql
```

**Check**:
- Does `step_code_computed` show "TRT-004"?
- Does `stt_code` have value?
- Does `stm_number` have value?

**If all correct**: Not a database issue → Go back to Step 2

**If any NULL**: Database data issue → Fix data

---

### Step 4: Test Enrichment Method Standalone

```bash
cd /Users/lucaschallamel/Documents/GitHub/UMIG
groovy local-dev-setup/diagnostic-scripts/test-email-enrichment.groovy
```

This tests the enrichment method directly, bypassing ScriptRunner.

**Expected Output**:
```
✅ SUCCESS - Step data retrieved!

📋 CRITICAL FIELDS:
   step_code: 'TRT-004' ✅
   stt_code: 'TRT'
   stm_number: 4
   sti_name: 'socius vester amiculum sursum amita'
```

**If step_code is empty**: Database or query issue
**If step_code has value**: Confirms ScriptRunner cache issue

---

## Variable Mapping Reference

### All Template Variables

From line 227-289 in `EnhancedEmailService.groovy`:

| Variable Name | Source | Fallback |
|---------------|--------|----------|
| `step_code` | `stepInstance.step_code` | Construct from `stt_code` + `stm_number` |
| `step_title` | `stepInstance.stm_name` | `stepInstance.sti_name` |
| `step_description` | `stepInstance.stm_description` | `stepInstance.sti_description` |
| `environment_name` | `stepInstance.environment_name` | Empty string |
| `environment_role_name` | `stepInstance.environment_role_name` | Empty string |
| `team_name` | `stepInstance.team_name` | 'Unassigned' |
| `team_email` | `stepInstance.team_email` | Empty string |
| `step_duration` | `stepInstance.sti_duration_minutes` | 0 |
| `instructions` | `stepInstance.instructions` | Empty array |
| `comments` | `stepInstance.comments` | Empty array |
| `impacted_teams` | `stepInstance.impacted_teams` | Empty array |

### Critical Fields for Email Rendering

**Required for proper display**:
1. `step_code` - Shows empty in screenshot (PRIMARY ISSUE)
2. `environment_name` - Shows empty in screenshot
3. `instructions` - Shows "No instructions" despite 4 existing
4. `comments` - Shows empty despite 1 existing

**All four are empty → Strong evidence of enrichment failure**

---

## Summary

**Problem**: Email template variables are empty despite database having correct data

**Root Cause (90% confidence)**: ScriptRunner cache still running old buggy code

**Evidence**:
- Code was fixed (static method call)
- Database has correct data
- Template syntax is correct
- Behavior unchanged → suggests old code still running

**Solution**: Force ScriptRunner cache refresh using Script Console

**Verification**: Check logs for new diagnostic messages after cache refresh

---

**Last Updated**: 2025-10-01
**Related Files**:
- `/src/groovy/umig/utils/EnhancedEmailService.groovy` (lines 76-109, 227-289)
- `/src/groovy/umig/repository/StepRepository.groovy` (line 4241)
- `/local-dev-setup/liquibase/changelogs/034_td015_simplify_email_templates.sql`
