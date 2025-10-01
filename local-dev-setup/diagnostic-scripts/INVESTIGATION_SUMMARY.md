# Email Enrichment Investigation Summary

**Date**: 2025-10-01
**Issue**: Email showing empty data despite database having correct values
**Priority**: High
**Status**: Investigation complete, awaiting cache refresh

---

## Executive Summary

The email template is showing empty data (step_code, environment, instructions, comments) despite the database containing correct values. After comprehensive investigation, the root cause is **90% likely to be ScriptRunner cache** still running the old buggy code after our static method invocation fix.

---

## Timeline of Events

### Previous Session
1. ✅ Identified static method invocation bug in `EnhancedEmailService.groovy` (line 86)
2. ✅ Fixed: Changed `stepRepository.method()` → `StepRepository.method()`
3. ✅ Updated Liquibase migration with simplified template variables
4. ✅ Verified database has all correct data

### Current Session
5. ❌ Email still showing empty sections (screenshot evidence)
6. ✅ Added comprehensive diagnostic logging
7. ✅ Created standalone test scripts
8. ✅ Documented cache refresh procedures
9. ✅ Verified template variable mapping is correct

---

## Evidence Analysis

### 1. Email Screenshot Analysis

**Subject**: `[UMIG] : Step 4: socius vester amiculum sursum amita - Status Changed to CANCELLED`

**Key Observation**: Notice `: Step 4:` with colon before "Step 4"
- This means `${step_code}` is being replaced with **empty string** (not null)
- Template processor IS working (variables are being substituted)
- But the enrichment data is not being provided

**Empty Sections**:
- ❌ `step_code`: Empty (shows only `: Step 4:` instead of `TRT-004: Step 4:`)
- ❌ `environment_name`: Empty ("Duration & Environment" section empty)
- ❌ `instructions`: Shows "No instructions defined" (database has 4)
- ❌ `comments`: Empty (database has 1)

**All four critical fields are empty → Strong evidence of enrichment failure**

---

### 2. Database Verification

**Step Instance UUID**: `821ccc8f-1e4f-4986-8478-96cc2ce4ecd0`

**Database Query Results** (verified):
- ✅ Step exists in `steps_instance_sti`
- ✅ `stt_code` = "TRT"
- ✅ `stm_number` = 4
- ✅ `step_code` (computed) = "TRT-004"
- ✅ 4 instructions exist in `instructions_instance_ini`
- ✅ 1 comment exists in `step_instance_comments_sic`

**Conclusion**: Database is correct ✅

---

### 3. Code Analysis

#### Fixed Code (Current)
```groovy
// Line 86 - CORRECT
Map<String, Object> enrichedData = umig.repository.StepRepository.getEnhancedStepInstanceForEmail(stepInstanceId)
```

This is the proper way to call a static method.

#### Old Code (Buggy - May Still Be Running)
```groovy
// OLD - INCORRECT
Map<String, Object> enrichedData = stepRepository.getEnhancedStepInstanceForEmail(stepInstanceId)
```

This would fail because `stepRepository` is not defined. It should be `StepRepository` (the class).

**Key Insight**: If ScriptRunner hasn't reloaded the Groovy files, it's still running the OLD buggy code!

---

### 4. Template Variable Mapping

**Variable Flow**:
1. Database query → `enrichedData.step_code` = "TRT-004"
2. Merge enrichment → `stepInstance.step_code` = "TRT-004"
3. Template vars → `variables.step_code` = `stepInstance.step_code`
4. Template → `${step_code}` replaced with value

**Line 230 Logic** (in EnhancedEmailService):
```groovy
step_code: stepInstance.step_code ?: stepInstance.stt_code ?
    "${stepInstance.stt_code}-${String.format('%03d', stepInstance.stm_number ?: 0)}" : '',
```

**If enrichment fails**:
- `stepInstance.step_code` = null
- Fallback to `stepInstance.stt_code` = null (not in original stepInstance)
- Result: empty string ''

**Conclusion**: Variable mapping is correct, but enrichment is failing ✅

---

## Root Cause Analysis

### Primary Hypothesis: ScriptRunner Cache (90% confidence)

**Evidence**:
1. Code was fixed (static method call is correct)
2. Database has correct data
3. Template syntax is correct
4. Template variable mapping is correct
5. **Behavior hasn't changed** despite all fixes

**Logic**:
- ScriptRunner caches compiled Groovy classes for performance
- When you modify `.groovy` files, ScriptRunner continues using cached versions
- Our fix was made to the source file, but ScriptRunner is still running the old cached version
- The old cached version has the bug: `stepRepository.getEnhancedStepInstanceForEmail()` → fails
- When enrichment fails, catch block continues with original stepInstance (no enriched fields)
- Template gets empty values for all enriched fields

**Expected Log Output** (if cache is the issue):

**What you WON'T see** (because old code doesn't have these logs):
```
🔍 DIAGNOSTIC: Calling getEnhancedStepInstanceForEmail with UUID: [uuid]
🔍 DIAGNOSTIC: enrichedData = NOT NULL
✅ Enhanced data retrieved - DETAILED INSPECTION:
   🔍 step_code: 'TRT-004' (empty=false)
```

**What you MIGHT see** (if old code is running):
```
⚠️ WARNING: Data enrichment failed: [error about stepRepository not found]
```

---

### Secondary Hypotheses (10% total)

#### Hypothesis 2: Query Returns NULL (5% confidence)
- Database query succeeds but returns NULL for step_code
- Would need to verify with standalone test script

#### Hypothesis 3: Variable Mapping Bug (5% confidence)
- Template variable preparation has logic bug
- Would need to verify logs show enrichedData but empty after processing

---

## Diagnostic Tools Created

### 1. Enhanced Logging
**File**: `/src/groovy/umig/utils/EnhancedEmailService.groovy`

**Added Lines 86-88, 91-106**:
- Detailed inspection of enrichedData
- Shows actual values of critical fields
- Shows all keys in enrichedData map
- Shows step_code after merge

**Purpose**: Identify exactly where enrichment is failing

---

### 2. Diagnostic Test Script
**File**: `/local-dev-setup/diagnostic-scripts/test-email-enrichment.groovy`

**Usage**:
```bash
groovy local-dev-setup/diagnostic-scripts/test-email-enrichment.groovy
```

**Purpose**: Test enrichment method directly, bypassing ScriptRunner cache

**Tests**: Both UUIDs (old and new)

**Expected Output** (if database is correct):
```
✅ SUCCESS - Step data retrieved!
📋 CRITICAL FIELDS:
   step_code: 'TRT-004' ✅
   sti_name: 'socius vester amiculum sursum amita'
   Instructions count: 4
   Comments count: 1
```

---

### 3. Database Verification Script
**File**: `/local-dev-setup/diagnostic-scripts/verify-step-instance-data.sql`

**Usage**:
```bash
docker exec -it umig-postgres psql -U umig_app_user -d umig_app_db -f verify-step-instance-data.sql
```

**Purpose**: Verify database data exists and step_code is correctly computed

**Checks**:
- Step instance basic data
- Step master data with step_code construction
- Complete enriched data
- Instructions data
- Comments data
- Impacted teams

---

### 4. ScriptRunner Cache Refresh Guide
**File**: `/local-dev-setup/diagnostic-scripts/SCRIPTRUNNER_CACHE_REFRESH.md`

**Methods Documented**:
1. **Script Console** (5 seconds - RECOMMENDED)
2. **Plugin Restart** (30 seconds)
3. **Confluence Restart** (2-3 minutes)
4. **Full Stack Restart** (3-5 minutes)

**Includes**: Verification steps and troubleshooting

---

### 5. Template Variable Mapping Analysis
**File**: `/local-dev-setup/diagnostic-scripts/TEMPLATE_VARIABLE_MAPPING.md`

**Documents**:
- Complete variable flow (Database → EnrichedData → stepInstance → Template)
- Variable mapping reference table
- Diagnostic workflow with decision tree
- Quick reference for all 20+ template variables

---

## Action Items for User

### Immediate Actions (Required)

#### 1. Force ScriptRunner Cache Refresh
**Method** (Recommended - fastest):
1. Open http://localhost:8090
2. Settings (gear icon) → Manage apps
3. Script Console (left sidebar under SCRIPTRUNNER)
4. Paste and run:
```groovy
import com.onresolve.scriptrunner.runner.ScriptRunnerImpl
ScriptRunnerImpl.getInstance().clearCaches()
return "✅ Caches cleared"
```

**Expected**: See "✅ Caches cleared" message

**Time**: 5 seconds

---

#### 2. Check Confluence Logs Immediately After Cache Clear
```bash
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup
npm run logs:confluence | grep "EnhancedEmailService" | tail -100
```

**Look For** (NEW diagnostic messages):
```
🔍 DIAGNOSTIC: Calling getEnhancedStepInstanceForEmail with UUID: 821ccc8f-...
🔍 DIAGNOSTIC: enrichedData = NOT NULL
✅ Enhanced data retrieved - DETAILED INSPECTION:
   🔍 step_code: 'TRT-004' (empty=false)
   🔍 sti_name: 'socius vester amiculum sursum amita'
   🔍 environment_name: 'Production'
   🔍 Instructions count: 4
   🔍 Comments count: 1
```

**If you see these messages**: Cache refresh worked! ✅
**If you DON'T see these messages**: Try Method 2 (plugin restart)

---

#### 3. Trigger Test Email
1. Open Admin GUI: http://localhost:8090/pages/viewpage.action?pageId=...
2. Change any step status (e.g., COMPLETED → CANCELLED)
3. Check MailHog: http://localhost:8025
4. Email should now show populated data

**Expected Result**:
- Subject: `[UMIG] TRT-004: socius vester... - Status Changed to CANCELLED` (note TRT-004 present)
- Header: `📋 TRT-004: socius vester...` (note TRT-004 present)
- "Duration & Environment" section: Shows environment name
- "Instructions" section: Shows 4 instructions
- "Recent Comments" section: Shows 1 comment

---

### Verification Actions (Optional but Recommended)

#### 4. Run Diagnostic Test Script
```bash
cd /Users/lucaschallamel/Documents/GitHub/UMIG
groovy local-dev-setup/diagnostic-scripts/test-email-enrichment.groovy
```

**Purpose**: Verify enrichment method works standalone (independent of ScriptRunner)

**Expected**: See "✅ SUCCESS - Step data retrieved!" with step_code: 'TRT-004'

---

#### 5. Run Database Verification
```bash
docker exec -it umig-postgres psql -U umig_app_user -d umig_app_db
\i /path/to/local-dev-setup/diagnostic-scripts/verify-step-instance-data.sql
```

**Purpose**: Confirm database data is correct

**Expected**: See step_code_computed: 'TRT-004' and all related data

---

### Troubleshooting Actions (If Cache Refresh Doesn't Work)

#### If Method 1 Doesn't Work
Try **Method 2**: Plugin Restart
1. Settings → Manage apps
2. Find "ScriptRunner for Confluence"
3. Click **Disable** → Wait 5 seconds → Click **Enable**
4. Go back to step 2 (check logs)

#### If Method 2 Doesn't Work
Try **Method 3**: Confluence Container Restart
```bash
npm run restart:confluence
```
Wait 2-3 minutes for Confluence to fully restart, then go back to step 2.

#### If All Methods Don't Work
Possible issues:
1. **Files not saved** - Check file timestamps
2. **Syntax errors** - Check Confluence logs for compilation errors
3. **Wrong files modified** - Verify file paths are correct

---

## Success Criteria

### Email Should Show

✅ **Subject**: `[UMIG] TRT-004: socius vester amiculum sursum amita - Status Changed to CANCELLED`

✅ **Header**: `📋 TRT-004: socius vester amiculum sursum amita`

✅ **Duration & Environment Section**:
```
Target Environment: Production (Target Environment Role Name)
Duration: 30 minutes
```

✅ **Instructions Section**: List of 4 instructions

✅ **Recent Comments Section**: 1 comment with author and text

---

## Logs Should Show

✅ **BEFORE enrichment** (line 86):
```
🔍 DIAGNOSTIC: Calling getEnhancedStepInstanceForEmail with UUID: 821ccc8f-1e4f-4986-8478-96cc2ce4ecd0
```

✅ **AFTER query** (line 88):
```
🔍 DIAGNOSTIC: enrichedData = NOT NULL
```

✅ **DETAILED inspection** (lines 91-101):
```
✅ Enhanced data retrieved - DETAILED INSPECTION:
   🔍 step_code: 'TRT-004' (empty=false)
   🔍 sti_name: 'socius vester amiculum sursum amita'
   🔍 environment_name: 'Production'
   🔍 Instructions count: 4
   🔍 Comments count: 1
   🔍 ALL KEYS in enrichedData: [step_code, sti_name, environment_name, ...]
```

✅ **AFTER merge** (line 106):
```
✅ Step instance enriched - AFTER MERGE step_code: 'TRT-004'
```

---

## Files Modified

1. `/src/groovy/umig/utils/EnhancedEmailService.groovy`
   - Lines 86-88: Added diagnostic logging before/after enrichment call
   - Lines 91-106: Enhanced detailed inspection of enrichedData

2. `/local-dev-setup/diagnostic-scripts/test-email-enrichment.groovy`
   - **NEW**: Standalone test script for enrichment method

3. `/local-dev-setup/diagnostic-scripts/verify-step-instance-data.sql`
   - **NEW**: Database verification SQL script

4. `/local-dev-setup/diagnostic-scripts/SCRIPTRUNNER_CACHE_REFRESH.md`
   - **NEW**: Comprehensive cache refresh procedures

5. `/local-dev-setup/diagnostic-scripts/TEMPLATE_VARIABLE_MAPPING.md`
   - **NEW**: Complete variable flow analysis

6. `/local-dev-setup/diagnostic-scripts/INVESTIGATION_SUMMARY.md`
   - **NEW**: This file

---

## Next Session

If cache refresh resolves the issue:
1. ✅ Verify email has populated data
2. ✅ Verify logs show detailed diagnostics
3. ✅ Mark TD-015 as complete
4. 🧹 Clean up excessive logging (optional - keep for now)

If cache refresh doesn't resolve the issue:
1. Run diagnostic script to identify where enrichment fails
2. Check database verification results
3. Review Confluence logs for compilation errors
4. May need to add even more granular logging

---

## Conclusion

**Confidence Level**: 90% that ScriptRunner cache is the root cause

**Recommended Action**: Force ScriptRunner cache refresh via Script Console (Method 1)

**Expected Outcome**: Email will show populated data after cache refresh

**Verification**: Check logs for new diagnostic messages

**Time to Resolution**: 5 minutes (cache clear + test email + verification)

---

**Investigation Completed**: 2025-10-01
**Diagnostic Tools Created**: 5 files
**Lines of Logging Added**: 20+ diagnostic lines
**Confidence in Root Cause**: 90% (ScriptRunner cache)
**Recommended Next Action**: Clear ScriptRunner cache via Script Console
