# ADR-059: SQL Schema-First Development Principle

## Status

**Status**: Accepted
**Date**: 2025-09-17
**Author**: Development Team
**Technical Story**: SQL Schema Alignment & Infrastructure Cleanup
**Related Journals**: 20250917-02-sql-schema-fixes-cleanup.md

## Context

During Sprint 7 SQL schema alignment work, we encountered systematic database schema mismatches that revealed a fundamental architectural problem. The issue manifested as:

- **SQL Column Reference Errors**: 8 different column/table reference errors across critical files
- **Phantom Columns**: Code referencing non-existent database columns (`sti_is_active`, `sti_priority`)
- **Unauthorized Schema Changes**: Discovery of migration file `031_add_missing_active_columns.sql` created without authorization
- **Schema Drift Risk**: Code assumptions not matching database reality

### Problem Pattern

The application contained numerous references to database columns that do not exist in the actual schema:

```sql
-- PROBLEMATIC PATTERN - Phantom Columns
WHERE sti.sti_is_active = true           -- ❌ Column doesn't exist
ORDER BY sti.sti_priority DESC,          -- ❌ Column doesn't exist
         sti.sti_created_date            -- ❌ Should be created_at
```

### Root Cause Analysis

Investigation revealed a systematic pattern of schema-code misalignment:

1. **Code-First Assumptions**: Developers assumed columns existed without schema validation
2. **Unauthorized Schema Additions**: Attempt to add columns to match broken code
3. **Schema Drift**: Incremental accumulation of schema-code mismatches
4. **No Schema Validation**: Missing process to validate code against actual schema

### The Critical Discovery

During cleanup, an unauthorized migration file was discovered:

- **File**: `031_add_missing_active_columns.sql`
- **Impact**: Would have added phantom columns to match broken code
- **Resolution**: Backed up and removed to prevent schema corruption

## Decision

We will establish the **SQL Schema-First Development Principle**: **"Fix code to match the existing database schema, never add columns to match broken code."**

### Core Principle

```
SCHEMA = SOURCE OF TRUTH
CODE = MUST CONFORM TO SCHEMA
```

### Implementation Rules

1. **Schema Authority**: The database schema is the authoritative source of truth
2. **Code Conformance**: All SQL queries must reference only existing columns
3. **No Compensatory Schema Changes**: Never add database columns to fix code errors
4. **Schema Validation**: All code changes must be validated against actual schema
5. **Schema Change Process**: Schema changes require explicit architectural review

## Consequences

### Positive

- **Schema Integrity**: Prevents uncontrolled schema drift and corruption
- **Data Model Consistency**: Maintains coherent data architecture
- **Performance Optimization**: Eliminates queries referencing non-existent columns
- **Maintenance Simplification**: Single source of truth reduces complexity
- **Quality Assurance**: Forces proper understanding of data model
- **Security Enhancement**: Prevents accidental data exposure through phantom columns

### Negative

- **Development Constraints**: Developers must understand schema before coding
- **Refactoring Requirements**: Existing code must be updated to match schema
- **Learning Curve**: Team must adopt schema-first mindset
- **Initial Effort**: Requires cleanup of existing schema mismatches

## Implementation Details

### Fixed Schema Mismatches

#### Step Instances Table (`steps_instances_sti`)

**Phantom Columns Removed**:

```sql
-- BEFORE (Broken - phantom columns)
WHERE sti.sti_is_active = true                    -- ❌ Column doesn't exist
ORDER BY sti.sti_priority DESC,                   -- ❌ Column doesn't exist
         sti.sti_created_date                     -- ❌ Wrong column name

-- AFTER (Fixed - actual schema)
-- Removed sti_is_active condition entirely
ORDER BY sti.created_at                           -- ✅ Actual column name
```

**Actual Schema Columns**:

- `created_at` (not `sti_created_date`)
- `updated_at` (not `sti_last_modified_date`)
- No `sti_is_active` column exists
- No `sti_priority` column exists

#### Step Masters Table (`steps_master_stm`)

**Fixed Column References**:

```sql
-- BEFORE (Broken)
stm_estimated_duration                            -- ❌ Wrong column name

-- AFTER (Fixed)
stm_duration_minutes                              -- ✅ Actual column name
```

#### Relationship Tables

**Fixed Table References**:

```sql
-- BEFORE (Broken - phantom table)
step_dependencies_sde                             -- ❌ Table doesn't exist

-- AFTER (Fixed - actual relationship)
steps_master_stm.stm_id_predecessor               -- ✅ Actual relationship column
```

### Files Updated

- **StepRepository.groovy**: 15 phantom column references removed
- **StepDataTransformationService.groovy**: 5 phantom column references fixed
- **Migration cleanup**: Removed unauthorized `031_add_missing_active_columns.sql`

### Schema Validation Process

#### Pre-Development Validation

1. **Schema Review**: Developers must review actual database schema
2. **Column Verification**: All SQL references validated against schema
3. **Query Testing**: SQL queries tested against actual database structure

#### Development Workflow

1. **Schema Consultation**: Check actual schema before writing SQL
2. **Code Review**: Schema compliance verified during code review
3. **Testing**: Integration tests validate SQL against real schema

#### Change Management

1. **Schema Changes**: Require architectural review and explicit approval
2. **Documentation**: All schema changes must be documented with rationale
3. **Migration Control**: Unauthorized schema changes blocked

## Related ADRs

- **ADR-034**: Liquibase SQL Compatibility Constraints - Schema migration standards
- **ADR-043**: PostgreSQL JDBC Type Casting Standards - Type safety with schema
- **ADR-031**: Groovy Type Safety and Filtering Patterns - Code compliance standards

## Validation

Success criteria for this principle:

- ✅ Zero phantom column references in production code
- ✅ All SQL queries reference only existing columns
- ✅ No unauthorized schema migrations
- ✅ Schema-code alignment validation in CI/CD
- ✅ Documentation of schema-first development process

## Implementation Examples

### Correct Pattern (Schema-First)

```groovy
// STEP 1: Consult actual schema
// Table: steps_instances_sti
// Columns: sti_id, sti_status, created_at, updated_at, usr_id_created_by

// STEP 2: Write code to match schema
def query = """
    SELECT sti.sti_id,
           sti.sti_status,
           sti.created_at,          -- ✅ Actual column name
           sti.updated_at           -- ✅ Actual column name
    FROM steps_instances_sti sti
    ORDER BY sti.created_at       -- ✅ Actual column name
"""
```

### Anti-Pattern (Code-First)

```groovy
// ANTI-PATTERN: Assuming columns exist without verification
def query = """
    SELECT sti.sti_id,
           sti.sti_is_active,       -- ❌ Phantom column
           sti.sti_priority,        -- ❌ Phantom column
           sti.sti_created_date     -- ❌ Wrong column name
    FROM steps_instances_sti sti
    WHERE sti.sti_is_active = true -- ❌ Will cause SQL error
    ORDER BY sti.sti_priority      -- ❌ Will cause SQL error
"""
```

### Schema Change Process

```sql
-- WRONG: Adding columns to fix code
-- ALTER TABLE steps_instances_sti ADD COLUMN sti_is_active BOOLEAN; -- ❌ PROHIBITED

-- RIGHT: Understanding why code assumed column existed
-- Review business requirements
-- Determine if existing columns can satisfy needs
-- Only add columns if genuinely required for new features
```

## Schema Governance Framework

### Schema Change Authority

1. **Database Administrator**: Technical schema review
2. **Data Architect**: Business impact assessment
3. **System Architect**: Integration impact review
4. **Development Lead**: Implementation feasibility

### Change Categories

#### Type 1: Bug Fixes (Immediate)

- Fixing code to match existing schema
- Correcting column name references
- Removing phantom column usage

#### Type 2: Schema Evolution (Reviewed)

- Adding columns for new business requirements
- Table structure modifications
- Index optimization

#### Type 3: Schema Migration (Planned)

- Major structural changes
- Data model refactoring
- Performance optimization migrations

### Quality Gates

1. **Pre-Commit**: Schema reference validation
2. **Code Review**: Schema compliance verification
3. **Integration Tests**: SQL execution against actual schema
4. **Performance Testing**: Query optimization validation

## Lessons Learned

1. **Schema Authority**: Database schema must be single source of truth
2. **Code Assumptions**: Never assume database structure without verification
3. **Schema Drift Prevention**: Proactive validation prevents accumulation of mismatches
4. **Quality Process**: Schema compliance must be part of development workflow

## Amendment History

- **2025-09-17**: Initial ADR creation based on SQL schema fixes and cleanup work
