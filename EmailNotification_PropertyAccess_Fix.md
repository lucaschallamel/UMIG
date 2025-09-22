# Email Notification Property Access Fix

## Problem

The email notification system is failing with the error:
```
Database row transformation failed: No such property: stm_name for class: groovy.sql.GroovyRowResult
```

## Root Cause Analysis

Based on the error message and codebase analysis:

1. **SQL Query Aliasing**: The SQL query in `buildEmailNotificationDTO` method (around lines 454-501) aliases the step master name as:
   ```sql
   stm.stm_name as step_master_name
   ```

2. **Property Access Mismatch**: The DTO building code is trying to access `stepData.stm_name` but the actual property in the result is `stepData.step_master_name`.

3. **Inconsistent Naming**: Throughout the codebase, there are inconsistent patterns for accessing step names:
   - Some code uses `step.stepName`
   - Some code uses `step.stm_name`
   - The SQL aliases it as `step_master_name`

## Evidence from Codebase

From `debug-labels-issue.js` line 156:
```javascript
const stepName = step.stepName || step.stm_name || `Unknown Step ${i + 1}`;
```

From `labels-display-pipeline.integration.test.js` line 345:
```javascript
<td class="col-step-name">${step.stepName || step.stm_name}</td>
```

From the documentation `timestamp-to-localdatetime-conversion-fix.md` line 62:
```groovy
.stepName(stepData.stm_name?.toString())
```

## Required Fixes

### 1. Fix DTO Building Method

In the `buildEmailNotificationDTO` method, replace:
```groovy
// ❌ INCORRECT - stm_name doesn't exist in result
.stepName(stepData.stm_name?.toString())
```

With:
```groovy
// ✅ CORRECT - Use the actual SQL alias
.stepName(stepData.step_master_name?.toString())
```

### 2. Alternative: Update SQL Alias

If you prefer to keep the `stm_name` property access, update the SQL query to alias as:
```sql
-- Change from:
stm.stm_name as step_master_name

-- To:
stm.stm_name as stm_name
```

### 3. Defensive Programming Pattern

For maximum robustness, use a defensive pattern that handles both cases:
```groovy
.stepName((stepData.step_master_name ?: stepData.stm_name ?: stepData.stepName)?.toString())
```

## Recommended Fix

**Option 1 (Preferred)**: Update the DTO building code to match the SQL alias:

```groovy
private StepInstanceDTO buildEmailNotificationDTO(Map stepData) {
    return StepInstanceDTO.builder()
        .stepId(stepData.stm_id?.toString())
        .stepInstanceId(stepData.sti_id?.toString())
        // ✅ FIX: Use step_master_name instead of stm_name
        .stepName(stepData.step_master_name?.toString())
        .stepDescription(stepData.stm_description?.toString())
        .stepStatus(stepData.sti_status?.toString() ?: 'PENDING')
        .migrationId(stepData.migration_id?.toString())
        .migrationCode(stepData.migration_code?.toString())
        .iterationId(stepData.iteration_id?.toString())
        .iterationCode(stepData.iteration_code?.toString())
        .teamId(stepData.tms_id?.toString())
        .teamName(stepData.team_name?.toString())
        .priority(stepData.sti_priority as Integer ?: 1)
        .estimatedDuration(stepData.estimated_duration as Integer ?: 0)
        .actualDuration(stepData.actual_duration as Integer ?: 0)
        .isActive(stepData.is_active as Boolean ?: true)
        .createdDate(stepData.created_date ?
            ((java.sql.Timestamp) stepData.created_date).toLocalDateTime() : null)
        .lastModifiedDate(stepData.updated_date ?
            ((java.sql.Timestamp) stepData.updated_date).toLocalDateTime() : null)
        .dependencyCount(stepData.dependency_count as Integer ?: 0)
        .completedDependencies(stepData.completed_dependencies as Integer ?: 0)
        .instructionCount(stepData.instruction_count as Integer ?: 0)
        .completedInstructions(stepData.completed_instructions as Integer ?: 0)
        .commentCount(stepData.comment_count as Integer ?: 0)
        .hasActiveComments(stepData.has_active_comments as Boolean ?: false)
        .build()
}
```

## Verification Steps

1. **Identify the File**: Look for `StepNotificationIntegration.groovy` or similar file containing the `buildEmailNotificationDTO` method
2. **Check SQL Query**: Verify the SQL query around lines 454-501 to confirm the alias used
3. **Update Property Access**: Change `stepData.stm_name` to `stepData.step_master_name`
4. **Test**: Run the email notification functionality to ensure the error is resolved

## Files to Update

Based on the error location, likely files include:
- `src/groovy/umig/service/EmailService.groovy` (if it exists)
- `src/groovy/umig/integration/StepNotificationIntegration.groovy` (if it exists)
- Any file containing the `buildEmailNotificationDTO` method

## Additional Consistency Fixes

Consider updating other files for consistency:
- `debug-labels-issue.js` line 156
- Test files that use similar patterns
- Any other places where `stm_name` is accessed but the SQL aliases it differently

## Follow-up Actions

1. Search for all occurrences of `stm_name` vs `step_master_name` in the codebase
2. Standardize the naming convention across SQL queries and property access
3. Add defensive programming patterns for robust property access
4. Update any related test files to use the correct property names

This fix should resolve the "No such property: stm_name" error and allow the email notification system to function correctly.