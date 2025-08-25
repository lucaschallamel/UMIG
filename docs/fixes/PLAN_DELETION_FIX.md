# Plan Deletion Fix - Master Plan DELETE Endpoint

**Date**: August 22, 2025  
**Issue**: Master plan deletion was not working - users got success messages but plans remained in list  
**Status**: ✅ FIXED

## Problem Analysis

The `DELETE /plans/master/{id}` endpoint was calling `PlanRepository.softDeleteMasterPlan(planId)`, but this method was not actually performing any deletion. Instead, it was only checking if the plan exists:

```groovy
def softDeleteMasterPlan(UUID planId) {
    DatabaseUtil.withSql { sql ->
        // Note: Currently plans_master_plm doesn't have soft_delete_flag
        // For now, we'll just check if deletion is possible
        // In production, you'd add a soft_delete_flag column
        return sql.firstRow('SELECT plm_id FROM plans_master_plm WHERE plm_id = :planId', [planId: planId]) != null
    }
}
```

This caused:
- API returned success message
- Plan remained in database
- UI still showed the plan in the list
- Console showed same number of plans after "deletion"

## Solution Implemented

Updated `PlanRepository.softDeleteMasterPlan()` method to perform actual hard deletion:

```groovy
def softDeleteMasterPlan(UUID planId) {
    DatabaseUtil.withSql { sql ->
        // Since soft_delete_flag column doesn't exist yet, perform hard delete
        // Check if plan exists first
        def existingPlan = sql.firstRow('SELECT plm_id FROM plans_master_plm WHERE plm_id = :planId', [planId: planId])
        if (!existingPlan) {
            return false
        }
        
        // Perform hard delete
        def rowsDeleted = sql.executeUpdate('DELETE FROM plans_master_plm WHERE plm_id = :planId', [planId: planId])
        return rowsDeleted > 0
    }
}
```

## Changes Made

### 1. Updated PlanRepository.groovy
- **File**: `/src/groovy/umig/repository/PlanRepository.groovy`
- **Method**: `softDeleteMasterPlan(UUID planId)`
- **Change**: Implemented actual hard delete instead of just existence check
- **Returns**: `true` if plan was deleted successfully, `false` otherwise

### 2. API Endpoint Flow (No Changes Needed)
The existing API endpoint in `PlansApi.groovy` already had correct logic:
- Checks for active instances before deletion (line 541)
- Returns 409 Conflict if instances exist
- Returns 200 Success with confirmation message if deletion succeeds
- Returns 404 if plan not found

### 3. Integration Test Created
- **File**: `/src/groovy/umig/tests/integration/PlanDeletionTest.groovy`
- **Framework**: ADR-036 Pure Groovy testing
- **Coverage**: 
  - Successful deletion scenario
  - Non-existent plan handling (404)
  - Plan with instances rejection (409) 
  - Invalid UUID handling (400)

## Business Logic Preserved

The fix maintains all existing business rules:
- ✅ Only administrators can delete plans (`confluence-administrators` group)
- ✅ Cannot delete plans that have active instances (409 Conflict)
- ✅ Proper validation of UUID format (400 Bad Request)
- ✅ Proper error handling for non-existent plans (404 Not Found)

## Testing Strategy

1. **Manual Testing**: Users can verify deletion works by:
   - Creating a test plan
   - Deleting it via Admin GUI
   - Confirming it disappears from the list
   - Verifying API returns fewer plans

2. **Automated Testing**: Integration test covers:
   - Happy path deletion
   - Error scenarios (404, 409, 400)
   - Business rule validation

## Future Considerations

When implementing proper soft delete:
1. Add `soft_delete_flag` column to `plans_master_plm` table
2. Update all query methods to exclude soft-deleted records
3. Change `softDeleteMasterPlan` to set flag instead of hard delete
4. Add "restore" functionality if needed

## Verification Steps

To verify the fix works:
1. Start the development environment
2. Navigate to Admin GUI > Plans
3. Create a test plan without instances
4. Delete the plan
5. Verify it disappears from the list
6. Check database to confirm record is removed

## API Endpoints Affected

- `DELETE /api/v2/plans/master/{id}` - Now actually deletes plans
- `GET /api/v2/plans/master` - Will return fewer plans after deletion

## Database Impact

- **Tables Affected**: `plans_master_plm`
- **Operation**: Hard delete (until soft delete column is added)
- **Data Loss**: Yes - deleted plans are permanently removed
- **Rollback**: Not possible without database backup

---

**Resolution**: Master plan deletion now works correctly. Users will see plans disappear from the list immediately after deletion, and the API will return the correct count of remaining plans.