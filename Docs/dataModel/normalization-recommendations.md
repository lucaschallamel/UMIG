# Data Model Normalization Recommendations

**Date:** 2025-08-04  
**Author:** Claude AI Assistant  
**Purpose:** Comprehensive analysis and recommendations for normalizing the UMIG data model

## Executive Summary

The UMIG data model has several normalization issues that impact API development efficiency, data consistency, and maintainability. Key issues include:

1. **Inconsistent audit fields** across tables
2. **Denormalized instance tables** with duplicated master fields (ADR-029 pattern)
3. **Missing standard fields** in many tables
4. **Inconsistent naming conventions** for audit fields
5. **Lack of abstraction** for common patterns

## Current State Analysis

### 1. Audit Fields Inconsistency

#### Tables WITH Complete Audit Fields
- `plans_master_plm` ✅ (created_by, created_at, updated_by, updated_at)
- `migrations_mig` ✅ (created_by, created_at, updated_by, updated_at)
- `iterations_ite` ✅ (created_by, created_at, updated_by, updated_at)
- `plans_instance_pli` ✅ (created_by, created_at, updated_by, updated_at)
- `users_usr` ⚠️ (only created_at, updated_at - missing created_by, updated_by)

#### Tables MISSING Audit Fields Completely
**Master Tables:**
- `sequences_master_sqm` ❌
- `phases_master_phm` ❌
- `steps_master_stm` ❌
- `controls_master_ctm` ❌
- `instructions_master_inm` ❌

**Instance Tables:**
- `sequences_instance_sqi` ❌
- `phases_instance_phi` ❌
- `steps_instance_sti` ❌
- `controls_instance_cti` ❌
- `instructions_instance_ini` ❌

**Reference Tables:**
- `teams_tms` ❌
- `applications_app` ❌
- `environments_env` ❌
- `roles_rls` ❌
- `environment_roles_enr` ❌
- `step_types_stt` ❌
- `iteration_types_itt` ❌

### 2. Denormalization Issues (ADR-029 Pattern)

The instance tables have been denormalized by duplicating master fields (via migration 010):

#### Duplicated Fields Pattern
```sql
-- Example: sequences_instance_sqi duplicates from sequences_master_sqm
sqi_name         -- Duplicates sqm_name
sqi_description  -- Duplicates sqm_description
sqi_order        -- Duplicates sqm_order
predecessor_sqi_id -- Duplicates predecessor_sqm_id
```

This pattern is repeated across all instance tables:
- `sequences_instance_sqi` (4 duplicated fields)
- `phases_instance_phi` (4 duplicated fields)
- `steps_instance_sti` (5 duplicated fields)
- `instructions_instance_ini` (5 duplicated fields)
- `controls_instance_cti` (6 duplicated fields)

**Issues with this approach:**
- Data redundancy and potential inconsistency
- Increased storage requirements
- Complex synchronization logic needed
- Unclear source of truth (master vs instance)
- Complicated API logic to handle overrides

### 3. Missing Standard Fields

#### Status Management
- Status fields are VARCHAR(50) without FK constraints to a status table
- No standardized status values or transitions
- Inconsistent status field naming (mig_status, ite_status, pli_status, etc.)

#### Soft Delete Support
- No soft delete capability (no deleted_at, is_deleted fields)
- Physical deletes can cause referential integrity issues
- No audit trail for deletions

#### Versioning
- No version tracking for master entities
- Cannot track changes over time
- No way to rollback to previous versions

## Normalization Recommendations

### 1. Standardize Audit Fields

#### Create Standard Audit Columns for ALL Tables
```sql
-- Standard audit fields to add to ALL tables (except join tables)
created_by VARCHAR(255) NOT NULL DEFAULT 'system',
created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
deleted_at TIMESTAMPTZ NULL,  -- For soft delete
is_deleted BOOLEAN NOT NULL DEFAULT FALSE
```

#### Implementation Priority
1. **High Priority** (affects API operations):
   - All master tables (sequences, phases, steps, controls, instructions)
   - All instance tables
   - Core reference tables (teams, applications, environments)

2. **Medium Priority**:
   - Lookup tables (roles, environment_roles, step_types, iteration_types)

3. **Low Priority**:
   - Join tables (optional, but useful for tracking associations)

### 2. Normalize Instance Tables

#### Option A: True Normalization (Recommended)
Remove duplicated fields from instance tables and always join to master:

```sql
-- Example: Normalized sequences_instance_sqi
CREATE TABLE sequences_instance_sqi (
    sqi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pli_id UUID NOT NULL REFERENCES plans_instance_pli(pli_id),
    sqm_id UUID NOT NULL REFERENCES sequences_master_sqm(sqm_id),
    sqi_status VARCHAR(50) NOT NULL,
    sqi_start_time TIMESTAMPTZ,
    sqi_end_time TIMESTAMPTZ,
    -- Audit fields
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- For overrides, create a separate override table
CREATE TABLE sequences_instance_overrides (
    sio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sqi_id UUID NOT NULL REFERENCES sequences_instance_sqi(sqi_id),
    field_name VARCHAR(50) NOT NULL,
    field_value TEXT,
    -- Audit fields
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sqi_id, field_name)
);
```

#### Option B: Hybrid Approach
Keep override fields but make them explicitly nullable and document that NULL means "use master value":

```sql
-- Clearly mark override fields as nullable
ALTER TABLE sequences_instance_sqi
    ALTER COLUMN sqi_name DROP NOT NULL,
    ALTER COLUMN sqi_description DROP NOT NULL;

-- Add comments to clarify
COMMENT ON COLUMN sequences_instance_sqi.sqi_name IS 
    'Override name - NULL means use master value from sequences_master_sqm.sqm_name';
```

### 3. Create Status Management Tables

```sql
-- Centralized status management
CREATE TABLE status_types (
    stt_id SERIAL PRIMARY KEY,
    stt_code VARCHAR(50) NOT NULL UNIQUE,
    stt_name VARCHAR(100) NOT NULL,
    stt_entity_type VARCHAR(50) NOT NULL, -- 'migration', 'iteration', 'plan', etc.
    stt_order INTEGER NOT NULL, -- For workflow progression
    stt_is_terminal BOOLEAN DEFAULT FALSE,
    -- Audit fields
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Status transition rules
CREATE TABLE status_transitions (
    str_id SERIAL PRIMARY KEY,
    stt_id_from INTEGER REFERENCES status_types(stt_id),
    stt_id_to INTEGER NOT NULL REFERENCES status_types(stt_id),
    str_entity_type VARCHAR(50) NOT NULL,
    str_role_required VARCHAR(50), -- Role required for transition
    -- Audit fields
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Abstract Common Patterns

#### Create Base Entity Pattern
Consider using table inheritance or a base entity table:

```sql
-- Option 1: PostgreSQL Table Inheritance
CREATE TABLE base_entity (
    entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Tables can inherit from base_entity
CREATE TABLE sequences_master_sqm (
    -- Specific fields
    plm_id UUID NOT NULL,
    sqm_order INTEGER NOT NULL,
    sqm_name VARCHAR(255) NOT NULL,
    sqm_description TEXT,
    predecessor_sqm_id UUID
) INHERITS (base_entity);
```

## Migration Strategy

### Phase 1: Add Audit Fields (Week 1)
1. Create Liquibase migration to add audit fields to all tables
2. Set default values for existing records
3. Update all repository classes to handle audit fields
4. Modify APIs to populate audit fields

### Phase 2: Normalize Instance Tables (Week 2)
1. Create override tables for instance-specific changes
2. Migrate existing override data to new structure
3. Update repository methods to handle joins
4. Refactor APIs to use normalized structure

### Phase 3: Implement Status Management (Week 3)
1. Create status and transition tables
2. Migrate existing status values
3. Update APIs to use status tables
4. Implement status transition validation

### Phase 4: Testing & Validation (Week 4)
1. Comprehensive testing of all APIs
2. Performance testing with normalized structure
3. Data integrity validation
4. Documentation updates

## Impact Analysis

### API Impact
- **Repository Layer**: All repository classes need updates for audit fields
- **API Endpoints**: Minimal changes if repositories handle complexity
- **Performance**: Slight increase in query complexity, but better data integrity

### Benefits
1. **Consistency**: Standard fields across all tables
2. **Auditability**: Complete audit trail for all changes
3. **Maintainability**: Cleaner, more normalized structure
4. **Scalability**: Better foundation for future features
5. **API Standardization**: Consistent patterns across all endpoints

### Risks
1. **Migration Complexity**: Large number of tables to update
2. **Testing Effort**: All APIs need retesting
3. **Performance**: Additional joins may impact query performance
4. **Backward Compatibility**: May need to support old structure temporarily

## Recommended Immediate Actions

### Priority 1: Standardize Audit Fields
Add audit fields to all tables with a single Liquibase migration. This is the highest impact, lowest risk change.

### Priority 2: Create Status Management
Implement proper status tables to replace VARCHAR status fields. This improves data integrity and enables workflow management.

### Priority 3: Document Override Strategy
Clearly define when and how instance overrides should be used. Consider if the current denormalized approach is truly needed.

### Priority 4: Plan Normalization
Evaluate if the benefits of normalization outweigh the migration effort. Consider a gradual approach starting with new tables.

## Conclusion

The current data model has significant normalization issues that impact development efficiency and data integrity. The most critical issue is the lack of consistent audit fields, which should be addressed immediately. The denormalized instance tables represent a more complex challenge that requires careful consideration of trade-offs between normalization and practical implementation needs.

Implementing these recommendations will:
- Reduce code duplication in APIs and repositories
- Improve data consistency and integrity
- Provide better auditability
- Create a more maintainable and scalable foundation

The phased approach allows for incremental improvements while minimizing disruption to ongoing development.