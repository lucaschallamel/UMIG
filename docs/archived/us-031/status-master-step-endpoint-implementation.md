# Master Step Individual GET Endpoint Implementation

## Problem Summary

The Master Steps VIEW and EDIT modals were failing because there was no individual GET endpoint to retrieve a single master step by ID. The frontend was trying to call `GET /steps/master/{id}` but getting 404 (Not Found).

## Solution Implemented

### 1. Repository Method Added - `StepRepository.groovy`

Added `findMasterStepById(UUID stepId)` method at line 207:

```groovy
/**
 * Finds a single master step by ID with hierarchy data and computed fields
 * @param stepId The UUID of the master step
 * @return Map containing master step data or null if not found
 */
def findMasterStepById(UUID stepId) {
    DatabaseUtil.withSql { sql ->
        def result = sql.firstRow("""
            SELECT DISTINCT stm.*,
                   phm.phm_name,
                   sqm.sqm_name,
                   plm.plm_name,
                   COALESCE(instruction_counts.instruction_count, 0) as instruction_count,
                   COALESCE(instance_counts.instance_count, 0) as instance_count
            FROM steps_master_stm stm
            JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
            JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
            JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
            LEFT JOIN (
                SELECT stm_id, COUNT(*) as instruction_count
                FROM instructions_master_inm
                GROUP BY stm_id
            ) instruction_counts ON stm.stm_id = instruction_counts.stm_id
            LEFT JOIN (
                SELECT stm_id, COUNT(*) as instance_count
                FROM steps_instance_sti
                GROUP BY stm_id
            ) instance_counts ON stm.stm_id = instance_counts.stm_id
            WHERE stm.stm_id = :stepId
        """, [stepId: stepId])

        return result ? enrichMasterStepWithStatusMetadata(result) : null
    }
}
```

**Features**:

- Retrieves single master step with all required hierarchy data
- Includes computed fields (instruction_count, instance_count)
- Uses same SQL pattern as bulk endpoint for consistency
- Returns enriched data via existing `enrichMasterStepWithStatusMetadata` method

### 2. API Endpoint Added - `StepsApi.groovy`

Added `GET /steps/master/{id}` endpoint at line 280:

```groovy
// GET /steps/master/{id} - return specific master step
if (pathParts.size() == 2 && pathParts[0] == 'master') {
    try {
        def stepId = UUID.fromString(pathParts[1])
        StepRepository stepRepository = getStepRepository()
        def masterStep = stepRepository.findMasterStepById(stepId)

        if (!masterStep) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Master step not found for ID: ${stepId}"]).toString())
                .build()
        }

        return Response.ok(new JsonBuilder(masterStep).toString()).build()

    } catch (IllegalArgumentException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid step ID format"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Failed to retrieve master step: ${e.message}"]).toString())
            .build()
    }
}
```

**Features**:

- Follows exact same pattern as PlansApi.groovy and PhasesApi.groovy
- Proper error handling: 400 for invalid UUID, 404 for not found, 500 for server errors
- Standard JSON response format
- Uses lazy-loaded repository pattern

### 3. Documentation Updated

Updated API javadoc comment to include the new endpoint:

```
* - GET /steps/master/{id} -> returns specific master step by ID
```

### 4. Integration Tests Added

Added comprehensive tests to `StepsApiIntegrationTest.groovy`:

1. **testGetMasterStepById()** - Tests successful retrieval with validation of all required fields
2. **testGetMasterStepByIdNotFound()** - Tests 404 response for non-existent ID
3. **testGetMasterStepByIdInvalidFormat()** - Tests 400 response for invalid UUID format

Tests validate response includes all required fields:

- Core step fields (stm_id, stm_name)
- Hierarchy fields (plm_name, sqm_name, phm_name)
- Computed fields (instruction_count, instance_count)

## Expected Response Format

```json
{
  "stm_id": "uuid",
  "stm_name": "Step Name",
  "stm_description": "Description",
  "stm_number": 1,
  "stm_duration_minutes": 30,
  "phm_id": "uuid",
  "tms_id_owner": 123,
  "stt_code": "NORMAL",
  "enr_id_target": 1,
  "stm_id_predecessor": null,
  "plm_name": "Plan Name",
  "sqm_name": "Sequence Name",
  "phm_name": "Phase Name",
  "instruction_count": 5,
  "instance_count": 10
}
```

## Error Scenarios

- **400 Bad Request**: Invalid UUID format in path parameter
- **404 Not Found**: Master step with given ID does not exist
- **500 Internal Server Error**: Database or server errors

## Files Modified

1. `/src/groovy/umig/repository/StepRepository.groovy` - Added findMasterStepById method
2. `/src/groovy/umig/api/v2/StepsApi.groovy` - Added GET endpoint and updated documentation
3. `/src/groovy/umig/tests/integration/StepsApiIntegrationTest.groovy` - Added comprehensive tests

## Status

✅ **IMPLEMENTATION COMPLETE** - Ready for testing

The Admin GUI VIEW and EDIT modals should now work correctly as they can retrieve individual master steps via `GET /steps/master/{id}`.

## Testing Verification

To verify the implementation works:

1. Start the development environment
2. Navigate to Admin GUI master steps
3. Try to view or edit a master step
4. The modal should now load with step details instead of getting 404 errors

The endpoint follows established patterns and should integrate seamlessly with existing functionality.
