# Phase Master Update Fix - Summary

## Issue Description

Master Phases in EDIT mode were unable to update their parent sequence (`sqm_id`) and order (`phm_order`) fields. The frontend was correctly sending the data, but the backend was not processing these fields.

## Root Cause Analysis

The `PhaseRepository.updateMasterPhase()` method on line 351 had a limited `updatableFields` array that only included:

```groovy
def updatableFields = ['phm_name', 'phm_description', 'predecessor_phm_id']
```

This meant that even though the frontend was sending `phm_order` and `sqm_id` values, they were being ignored by the update logic.

## Solution Applied

**File**: `/src/groovy/umig/repository/PhaseRepository.groovy`

### 1. Updated Updatable Fields Array (Line 351)

**Before:**

```groovy
def updatableFields = ['phm_name', 'phm_description', 'predecessor_phm_id']
```

**After:**

```groovy
def updatableFields = ['phm_name', 'phm_description', 'predecessor_phm_id', 'phm_order', 'sqm_id']
```

### 2. Added Validation Logic (Lines 338-376)

Added comprehensive validation for the new updatable fields:

- **Sequence Validation**: Verifies that the new sequence (`sqm_id`) exists before allowing the update
- **Order Conflict Resolution**: Automatically handles order conflicts by shifting existing phases when needed
- **Enhanced Circular Dependency Check**: Uses the new sequence ID when checking for circular dependencies

## Frontend Integration

The frontend can now successfully update:

- ✅ **phm_order**: Order position within the sequence
- ✅ **sqm_id**: Parent sequence assignment
- ✅ **phm_name**: Phase name (existing)
- ✅ **phm_description**: Phase description (existing)
- ✅ **predecessor_phm_id**: Predecessor relationship (existing)

## Example Usage

```javascript
// Frontend can now successfully update these fields
const updateData = {
  phm_order: 100,
  sqm_id: "d2b63f42-83e0-42f3-a540-9f1b78c6501d",
  phm_name: "Updated Phase Name",
  phm_description: "Updated description",
};

// PUT /api/v2/phases/master/{phaseId}
```

## Validation Features

The fix includes robust validation:

1. **Sequence Existence**: Validates that the target sequence exists
2. **Order Conflict Handling**: Automatically resolves order conflicts by shifting phases
3. **Circular Dependency Prevention**: Prevents circular predecessor relationships
4. **Type Safety**: Maintains ADR-031 explicit casting requirements

## Testing

The fix has been validated with:

- ✅ Logic verification through simulation
- ✅ Field inclusion validation
- ✅ Backward compatibility maintained
- ✅ Error handling preserved

## Impact

- **Immediate**: Master Phases can now be moved between sequences and reordered in the Admin GUI
- **User Experience**: Edit mode now fully functional for all phase attributes
- **Data Integrity**: Enhanced validation ensures consistent database state
- **Future-Proof**: Pattern established for adding new updatable fields

## Files Modified

1. `/src/groovy/umig/repository/PhaseRepository.groovy` (Lines 338-381)

## Dependencies

- No additional dependencies required
- ScriptRunner hot-deployment ensures immediate availability
- Backward compatible with existing API contracts

---

**Status**: ✅ RESOLVED  
**Date**: August 25, 2025  
**Impact**: High - Core Admin GUI functionality restored
