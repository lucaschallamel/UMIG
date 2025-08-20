# US-036 Critical Data Integrity Issue - Duplicate Step Codes

**Status**: 🚨 CRITICAL ISSUE IDENTIFIED  
**Date**: August 20, 2025  
**Impact**: High - Affects UI consistency and data reliability  
**Priority**: P0 - Must fix before production  

## Executive Summary

A critical data integrity issue has been identified in the synthetic test data generation that creates **duplicate step codes** within the same iteration/plan. This causes the **IterationView** and **StepView** to display different instances of the same step code (e.g., BGO-002), leading to user confusion and inconsistent data presentation.

## Problem Description

### Issue Discovery
While validating US-036 StepView UI Refactoring, user screenshots revealed:
- **IterationView**: BGO-002 showing "placeat soleo succedo audentia voluptatem" (Electronics Squad)
- **StepView**: BGO-002 showing "corrigo cornu amitto denuo atqui" (Electronics Team)

Both claimed to be from TORONTO/RUN1, but displayed completely different step data.

### Database Analysis Results

**SQL Query Execution**: Confirmed **20 duplicate step codes** across all migrations, with BGO-002 in TORONTO/RUN1 having **3 instances**:

```
Migration: TORONTO
Iteration: RUN1
Step Code: BGO-002
Instance Count: 3
Different Names: 
  - Step 2: corrigo cornu amitto denuo atqui
  - Step 2: placeat soleo succedo audentia voluptatem  
  - Step 2: ventosus tamdiu absconditus conforto pecus
Different Phases: 
  - Phase 1: comis crepusculum conventus collum
  - Phase 2: verecundia campana sordeo contabesco
  - sonitus incidunt
Instance IDs: 
  - 41017f87-af8a-4422-b59e-cb04e541ec0d
  - 4b97103c-1445-4d0e-867a-725502e04cba  
  - d59a4e9f-6bed-48aa-8e17-7565b47ff416
```

## Root Cause Analysis

### Technical Root Cause
**File**: `/local-dev-setup/scripts/generators/004_generate_canonical_plans.js`  
**Lines**: 143-144

```javascript
faker.helpers.arrayElement(stepTypes.rows).stt_code,
l + 1,  // stm_number - THIS IS THE PROBLEM
```

### Logic Flaw
The step number (`stm_number`) resets to 1 for each phase:
- **Phase 1**: Creates steps 1, 2, 3, 4, 5...
- **Phase 2**: Creates steps 1, 2, 3, 4, 5... (**DUPLICATE numbers!**)
- **Phase 3**: Creates steps 1, 2, 3, 4, 5... (**MORE DUPLICATES!**)

Combined with random `stt_code` selection, this creates duplicate step codes like:
- BGO-002 in Phase 1
- BGO-002 in Phase 2  
- BGO-002 in Phase 3

### Business Rule Violation
**Expected**: Step codes (stt_code + stm_number) should be **unique within each iteration/plan**  
**Actual**: Step codes are duplicated across phases within the same iteration

## Impact Assessment

### UI Consistency Impact
- **IterationView** and **StepView** display different instances of the same step code
- Users cannot rely on step codes for consistent identification
- Navigation between views shows inconsistent data

### Data Reliability Impact
- Step code uniqueness assumption violated
- API responses may return different instances depending on query order
- Reporting and analytics compromised by duplicate data

### Testing Impact
- US-036 validation cannot proceed reliably
- Visual alignment testing produces inconsistent results
- Backend data validation undermined

## Required Fixes

### 1. Data Generation Logic Fix
**File**: `004_generate_canonical_plans.js`  
**Change**: Implement continuous step numbering across all phases within a plan

```javascript
// BEFORE (BROKEN):
l + 1,  // Resets for each phase

// AFTER (FIXED):
globalStepNumber++,  // Continuous across all phases
```

### 2. Database Cleanup
- Identify and remove duplicate step instances
- Ensure step code uniqueness within each iteration
- Preserve referential integrity during cleanup

### 3. Data Validation Rules
- Add database constraints to prevent future duplicates
- Implement validation in data generation scripts
- Add automated tests to detect duplicate step codes

## Immediate Actions Required

1. **🚨 STOP**: Halt all UI validation work until data is fixed
2. **📊 ANALYZE**: Complete duplicate analysis across all migrations
3. **🔧 FIX**: Repair data generation logic
4. **🗃️ CLEAN**: Remove duplicate step instances from database
5. **✅ VALIDATE**: Re-run US-036 validation with clean data

## Success Criteria

- [ ] Zero duplicate step codes within any iteration/plan
- [ ] BGO-002 in TORONTO/RUN1 has exactly 1 instance
- [ ] IterationView and StepView show identical data for same step code
- [ ] US-036 validation can proceed with consistent data

## Timeline Impact

**US-036 StepView UI Refactoring**: Blocked until data integrity is resolved  
**Sprint 5**: May require scope adjustment if fix is complex  
**MVP Delivery**: At risk if not resolved quickly  

## Next Steps

1. **Immediate**: Fix data generation script logic
2. **Short-term**: Clean existing duplicate data  
3. **Medium-term**: Add validation constraints
4. **Long-term**: Implement automated duplicate detection

---

**Assigned**: Data Architect + GENDEV Team  
**Review Required**: Project Lead + QA Team  
**Classification**: P0 Critical Data Integrity Issue
