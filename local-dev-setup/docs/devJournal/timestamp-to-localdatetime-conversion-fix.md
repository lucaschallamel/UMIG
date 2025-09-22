# Timestamp to LocalDateTime Conversion Fix

## Problem

The casting error occurs when trying to cast `java.sql.Timestamp` directly to `java.time.LocalDateTime`:

```groovy
// ❌ INCORRECT - This causes ClassCastException
.createdDate(stepData.created_date as java.time.LocalDateTime)
.lastModifiedDate(stepData.updated_date as java.time.LocalDateTime)
```

**Error**: `Cannot cast object '2025-09-22 08:41:12.779' with class 'java.sql.Timestamp' to class 'java.time.LocalDateTime'`

## Root Cause

- Database returns `java.sql.Timestamp` objects
- `java.sql.Timestamp` cannot be directly cast to `java.time.LocalDateTime`
- Need explicit conversion using `toLocalDateTime()` method

## Solution

### 1. Simple Conversion Pattern

```groovy
// ✅ CORRECT - Convert Timestamp to LocalDateTime
.createdDate(stepData.created_date ? ((java.sql.Timestamp) stepData.created_date).toLocalDateTime() : null)
.lastModifiedDate(stepData.updated_date ? ((java.sql.Timestamp) stepData.updated_date).toLocalDateTime() : null)
```

### 2. Safe Conversion with Utility Method

```groovy
// Utility method for safe conversion
private static java.time.LocalDateTime safeTimestampToLocalDateTime(Object timestamp) {
    if (timestamp == null) return null
    if (timestamp instanceof java.sql.Timestamp) {
        return ((java.sql.Timestamp) timestamp).toLocalDateTime()
    }
    if (timestamp instanceof java.time.LocalDateTime) {
        return (java.time.LocalDateTime) timestamp
    }
    // Handle string representation if needed
    if (timestamp instanceof String) {
        return java.time.LocalDateTime.parse(timestamp.toString())
    }
    throw new IllegalArgumentException("Cannot convert ${timestamp.class} to LocalDateTime")
}

// Usage in DTO building
.createdDate(safeTimestampToLocalDateTime(stepData.created_date))
.lastModifiedDate(safeTimestampToLocalDateTime(stepData.updated_date))
```

### 3. Complete DTO Building Pattern

```groovy
private StepInstanceDTO buildEmailNotificationDTO(Map stepData) {
    return StepInstanceDTO.builder()
        .stepId(stepData.stm_id?.toString())
        .stepInstanceId(stepData.sti_id?.toString())
        .stepName(stepData.stm_name?.toString())
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
        // ✅ CORRECT Timestamp conversion
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

## Key Points

1. **Always check for null** before conversion
2. **Cast to Timestamp first**, then call `toLocalDateTime()`
3. **Handle defensive programming** for unexpected types
4. **Use utility methods** for reusable conversion logic
5. **Follow ADR-031** type safety requirements

## Application to StepNotificationIntegration.groovy

Replace lines 539-540 in your `buildEmailNotificationDTO` method:

```groovy
// Replace these lines:
.createdDate(stepData.created_date as java.time.LocalDateTime)
.lastModifiedDate(stepData.updated_date as java.time.LocalDateTime)

// With these lines:
.createdDate(stepData.created_date ?
    ((java.sql.Timestamp) stepData.created_date).toLocalDateTime() : null)
.lastModifiedDate(stepData.updated_date ?
    ((java.sql.Timestamp) stepData.updated_date).toLocalDateTime() : null)
```

## Testing

After applying the fix, test with:

```bash
npm run test:groovy:integration
# or specific test for email service integration
```

This follows ADR-031 explicit casting requirements and ensures proper type safety for LocalDateTime handling in the EmailService integration.
