# ADR-031: Groovy Type Safety and Filtering Patterns

**Date:** 2025-07-10  
**Status:** Accepted  
**Context:** Iteration View Implementation - Hierarchical Filtering and Labels

## Context

During the implementation of hierarchical filtering and labels integration in the iteration view, we encountered several critical issues related to Groovy's static type checking system and database filtering patterns. These issues manifested as HTTP 400/500 errors and required deep investigation to resolve.

## Problems Encountered

### 1. Groovy Static Type Checking Errors

- `UUID.fromString()` and `Integer.parseInt()` methods were receiving `Object` types but expecting `String` types
- Error: "Cannot find matching method java.util.UUID#fromString(java.lang.Object)"
- This occurred when query parameters were passed through maps and filter objects

### 2. Database Field Selection Issues

- Missing fields in SELECT queries caused "No such property" runtime errors
- Specifically: `stm_id` was referenced in result mapping but not selected in SQL query
- Error: "No such property: stm_id for class: groovy.sql.GroovyRowResult"

### 3. Master vs Instance ID Filtering

- Incorrect filtering logic using master IDs instead of instance IDs
- Steps would disappear when selecting plan/sequence/phase filters
- Required understanding of canonical vs instance entity relationships

### 4. Field Reference Errors

- Incorrect table aliases causing join failures
- Teams filter using wrong field reference (`sti.tms_id_owner` vs `stm.tms_id_owner`)

## Decision

### Groovy Type Safety Best Practices

1. **Explicit Type Casting**: Always use explicit casting when static type checking is enabled

   ```groovy
   // CORRECT
   params.migrationId = UUID.fromString(filters.migrationId as String)
   params.teamId = Integer.parseInt(filters.teamId as String)

   // INCORRECT
   params.migrationId = UUID.fromString(filters.migrationId)
   ```

2. **Complete Field Selection**: Include ALL fields referenced in result mapping

   ```groovy
   // CORRECT - includes stm.stm_id for mapping
   SELECT sti.sti_id, stm.stm_id, stm.stt_code, ...

   // INCORRECT - missing stm.stm_id
   SELECT sti.sti_id, stm.stt_code, ...
   ```

### Database Filtering Patterns

1. **Instance-Based Filtering**: Use instance IDs for hierarchical filtering, not master IDs

   ```groovy
   // CORRECT - filters by instance IDs
   query += ' AND pli.pli_id = :planId'     // plan instance
   query += ' AND sqi.sqi_id = :sequenceId' // sequence instance
   query += ' AND phi.phi_id = :phaseId'    // phase instance

   // INCORRECT - filters by master IDs
   query += ' AND plm.plm_id = :planId'     // plan master
   ```

2. **Proper Table Aliases**: Use correct table aliases in field references

   ```groovy
   // CORRECT - owner team from step master table
   query += ' AND stm.tms_id_owner = :teamId'

   // INCORRECT - wrong table alias
   query += ' AND sti.tms_id_owner = :teamId'
   ```

### Error Handling Patterns

1. **Graceful Label Fetching**: Handle label fetching errors without breaking API responses

   ```groovy
   try {
       def stmId = step.stmId instanceof UUID ? step.stmId : UUID.fromString(step.stmId.toString())
       stepLabels = stepRepository.findLabelsByStepId(stmId)
   } catch (Exception e) {
       stepLabels = [] // Continue with empty labels
   }
   ```

## Consequences

### Positive

- **Robust Type Safety**: Explicit casting prevents runtime type errors
- **Predictable Filtering**: Instance-based filtering provides correct hierarchical behavior
- **Complete Data Mapping**: All required fields are properly selected and mapped
- **Error Resilience**: Graceful handling of edge cases and missing data

### Negative

- **Verbose Code**: Explicit casting adds boilerplate to parameter handling
- **Database Complexity**: Must understand master vs instance relationships
- **Debugging Difficulty**: Type errors can be cryptic and require deep investigation

## Implementation Guidelines

### Repository Methods

```groovy
// Type-safe parameter handling
if (filters.migrationId) {
    query += ' AND mig.mig_id = :migrationId'
    params.migrationId = UUID.fromString(filters.migrationId as String)
}

if (filters.teamId) {
    query += ' AND stm.tms_id_owner = :teamId'
    params.teamId = Integer.parseInt(filters.teamId as String)
}
```

### SQL Field Selection

```groovy
// Include ALL fields used in result mapping
def query = '''
    SELECT
        sti.sti_id, stm.stm_id, stm.stt_code, stm.stm_number,
        sti.sti_name, sti.sti_status, sti.sti_duration_minutes,
        stm.tms_id_owner, stm.stm_name as master_name,
        -- Continue with all required fields...
'''
```

### API Error Handling

```groovy
try {
    // API logic with potential type conversions
} catch (IllegalArgumentException e) {
    return Response.status(Response.Status.BAD_REQUEST)
        .entity(new JsonBuilder([error: "Invalid parameter format: ${e.message}"]).toString())
        .build()
}
```

## Related ADRs

- ADR-024: Iteration-Centric Data Model (master vs instance relationships)
- ADR-030: Hierarchical Filtering Pattern (filtering hierarchy design)
- ADR-023: Standardized REST API Patterns (error handling patterns)

---

_This ADR codifies the lessons learned from implementing hierarchical filtering and labels integration, providing patterns for future Groovy/ScriptRunner development._
