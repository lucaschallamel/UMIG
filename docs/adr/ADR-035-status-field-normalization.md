# ADR-035: Status Field Normalization

## Status
**Status**: Accepted (Recovered from commit a4cc184)  
**Date**: 2025-08-06  
**Author**: Development Team  
**Implementation**: US-006b - Status Field Normalization

## Context

The UMIG application manages various entities (Plans, Sequences, Phases, Steps, Controls, Instructions) that track execution state. Initially, each entity used string-based status fields with inconsistent values and no referential integrity. This led to:

1. **Data Inconsistency**: Different status values for the same conceptual state
2. **No Validation**: Invalid status values could be inserted
3. **Maintenance Burden**: Status changes required code updates in multiple places
4. **Poor Visualization**: No centralized place to manage status colors and descriptions

During Sprint 3, we needed to standardize status management across the system while recognizing that not all entities require the same level of status tracking.

## Decision

We will implement a **hybrid approach** to status management:

### 1. Normalized Status Table (`status_sts`)
Create a centralized lookup table for all status values with:
- Unique ID (integer primary key)
- Name (string identifier)
- Color (hex code for UI visualization)
- Type (entity type: Plan, Sequence, Phase, Step, Control)
- Description (optional explanatory text)
- Active flag (for soft deletion)

### 2. Foreign Key Constraints for Complex Entities
Implement FK constraints for entities with complex workflows:
- **Plans** (`pln_status` → `status_sts.sts_id`)
- **Sequences** (`sqm_status` → `status_sts.sts_id`)
- **Phases** (`phm_status` → `status_sts.sts_id`)
- **Steps** (`stm_status` → `status_sts.sts_id`)
- **Controls** (`ctm_status`, `cti_status` → `status_sts.sts_id`)

### 3. Simple Boolean for Instructions
Instructions use a simpler model for BOTH master and instance levels:
- **Instruction Masters**: No status field at all
- **Instruction Instances**: Use `ini_is_completed` boolean field only
- No FK constraints to status table for either level
- Binary state (completed/not completed) sufficient for instruction tracking
- Completion tracked with timestamp (`ini_completed_at`) and user (`usr_id_completed_by`)

### 4. API Flexibility
APIs accept status as either:
- Integer ID (direct reference)
- String name (resolved to ID)
- Returns `statusMetadata` object with full details

## Consequences

### Positive
- **Data Integrity**: FK constraints prevent invalid status values
- **Centralized Management**: Single source of truth for status definitions
- **Flexible API**: Backward compatible with string status names
- **Better UX**: Consistent colors and descriptions across UI
- **Simplified Instructions**: Boolean field reduces complexity where appropriate
- **Maintainability**: Status changes don't require code updates
- **Performance**: Integer comparisons faster than string comparisons

### Negative
- **Migration Complexity**: Existing data must be migrated to use IDs
- **Additional Joins**: GET operations require JOIN with status_sts
- **Learning Curve**: Developers must understand the dual input format
- **Schema Complexity**: Additional table and relationships

### Neutral
- **Hybrid Approach**: Different patterns for different entity types
- **Backward Compatibility**: APIs still accept string status names

## Implementation Details

### Status Table Structure
```sql
CREATE TABLE status_sts (
    sts_id SERIAL PRIMARY KEY,
    sts_name VARCHAR(50) NOT NULL,
    sts_color VARCHAR(7),
    sts_type VARCHAR(20) NOT NULL,
    sts_description TEXT,
    sts_is_active BOOLEAN DEFAULT true,
    UNIQUE(sts_name, sts_type)
);
```

### Standard Status Values per Entity

**Plans/Sequences/Phases**:
- NOT_STARTED (Gray)
- IN_PROGRESS (Blue)
- COMPLETED (Green)
- ON_HOLD (Yellow)

**Steps**:
- TODO (Yellow)
- IN_PROGRESS (Blue)
- COMPLETED (Green)
- BLOCKED (Red)

**Controls**:
- PENDING (Gray)
- VALIDATED (Green)
- PASSED (Green)
- FAILED (Red)
- CANCELLED (Dark Red)
- TODO (Yellow)

### API Pattern
```groovy
// Accept both formats
def status = params.cti_status
if (status instanceof String) {
    statusId = repository.resolveStatusId(status, 'Control')
} else {
    statusId = status as Integer
}

// Validate
if (!repository.validateStatusId(statusId)) {
    return Response.status(400).entity([error: "Invalid status"]).build()
}

// Return with metadata
response.statusMetadata = [
    sts_id: statusId,
    sts_name: statusName,
    sts_color: statusColor
]
```

## Migration Strategy

### Phase 1: Database Schema (✅ Complete)
1. Create status_sts table
2. Populate with standard values
3. Add FK constraints for Plans, Sequences, Phases, Steps

### Phase 2: Controls Migration (✅ Complete)
1. Add FK constraints for Controls tables
2. Update ControlsApi with validation
3. Update integration tests

### Phase 3: Instructions Confirmation (✅ Complete)
1. Confirm Instructions use boolean field only
2. No FK constraints needed
3. Document the decision

## Related ADRs

- **ADR-030**: Hierarchical Filtering Pattern - Status filtering follows same pattern
- **ADR-031**: Groovy Type Safety - Status ID explicit casting required
- **ADR-034**: Liquibase SQL Compatibility - Migration uses simple SQL only

## References

- Sprint 3 User Story US-006: Status Field Normalization
- Database Migration: 019_add_status_normalization.sql (initial)
- Database Migration: 021_add_status_foreign_keys.sql (Controls only)

## Notes

The decision to use a boolean for Instructions rather than normalized status was based on:
1. Instructions have a simple binary state (completed/not completed)
2. No need for intermediate states or complex workflows at either master or instance level
3. Reduces complexity and improves performance
4. Aligns with the actual business requirement for simple task completion tracking
5. Instruction masters don't require status at all - they are templates
6. Only instruction instances need completion tracking

This hybrid approach balances consistency and normalization with pragmatic simplicity where appropriate, recognizing that different entity types have different state management needs.

## Recovery Notes

**Important:** The US-006b implementation was accidentally reverted in commit 7056d21 and has been successfully recovered from commit a4cc184. The recovery included:

### Recovered Files
- `ControlsApi.groovy` - Full INTEGER FK status implementation
- `InstructionsApi.groovy` - Boolean completion tracking (no status FK)
- `PlansApi.groovy` - Status field normalization
- `SequencesApi.groovy` - Status field normalization  
- `StepsApi.groovy` - Status field normalization
- `migrationApi.groovy` - Migration-level status handling
- `ControlRepository.groovy` - Repository layer status validation
- `InstructionRepository.groovy` - Boolean completion logic

All recovered implementations pass integration tests and comply with ADR specifications.