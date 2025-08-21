# UMIG Database Best Practices - Implementation Guide

This document provides comprehensive guidance on design philosophy, implementation patterns, performance optimization, and best practices for the UMIG database. This complements the pure schema specification in [UMIG_Data_Model.md](./UMIG_Data_Model.md).

**Document Status**: ✅ Production Ready | **Last Updated**: August 2025 | **Version**: 2.1  
**Consolidated Sources**: Query Patterns, Performance Guidelines, Implementation Standards, ADR References

---

## 1. Core Design Philosophy

UMIG is built on:

- **Separation of Canonical (Master) vs. Instance (Execution) Entities**
- **Normalized, auditable, and extensible schema**
- **Explicit support for many-to-many relationships via join tables**
- **Standardized audit fields pattern** (migrations 016 & 017)
- **Environment-aware configuration management**
- **Comprehensive status management** with centralized control

---

## 2. Query Patterns & Performance

### 2.1. Instructions Query Patterns

#### Primary Read Pattern: Get Instructions for Step Instance

```groovy
def getInstructionsForStep(UUID stepInstanceId) {
    return DatabaseUtil.withSql { sql ->
        sql.rows("""
            SELECT
                ini.ini_id,
                inm.inm_id,
                inm.inm_order,
                inm.inm_body,
                inm.inm_duration_minutes,
                tms.tms_name,
                ctm.ctm_name,
                ini.ini_is_completed,
                ini.ini_completed_at,
                usr.usr_display_name as completed_by_name
            FROM instructions_master_inm inm
            JOIN instructions_instance_ini ini ON inm.inm_id = ini.inm_id
            LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id
            LEFT JOIN controls_master_ctm ctm ON inm.ctm_id = ctm.ctm_id
            LEFT JOIN users_usr usr ON ini.usr_id_completed_by = usr.usr_id
            WHERE ini.sti_id = ?
            ORDER BY inm.inm_order
        """, [stepInstanceId])
    }
}
```

#### Completion Tracking Pattern

```groovy
def completeInstruction(UUID instructionInstanceId, Integer userId) {
    return DatabaseUtil.withSql { sql ->
        sql.executeUpdate("""
            UPDATE instructions_instance_ini
            SET ini_is_completed = true,
                ini_completed_at = NOW(),
                usr_id_completed_by = ?
            WHERE ini_id = ?
        """, [userId, instructionInstanceId])
    }
}
```

#### Progress Reporting Pattern

```groovy
def getStepCompletionProgress(UUID stepInstanceId) {
    return DatabaseUtil.withSql { sql ->
        sql.firstRow("""
            SELECT
                COUNT(*) as total_instructions,
                COUNT(CASE WHEN ini_is_completed THEN 1 END) as completed_instructions,
                ROUND(
                    COUNT(CASE WHEN ini_is_completed THEN 1 END) * 100.0 / COUNT(*),
                    2
                ) as completion_percentage
            FROM instructions_instance_ini
            WHERE sti_id = ?
        """, [stepInstanceId])
    }
}
```

### 2.2. System Configuration Query Patterns

#### Environment-based Configuration Lookup

```groovy
def findConfluenceConfigurationForEnvironment(Integer envId) {
    return DatabaseUtil.withSql { sql ->
        sql.rows("""
            SELECT scf_key, scf_value, scf_data_type
            FROM system_configuration_scf
            WHERE env_id = ? AND scf_category = 'MACRO_LOCATION' AND scf_is_active = true
        """, [envId])
    }
}
```

#### Configuration Update with History

```groovy
def updateConfigurationValue(UUID scfId, String newValue, String updatedBy, String changeReason) {
    return DatabaseUtil.withSql { sql ->
        // Get current value for history
        def currentConfig = sql.firstRow("""
            SELECT scf_value FROM system_configuration_scf WHERE scf_id = ?
        """, [scfId])

        // Update configuration
        sql.executeUpdate("""
            UPDATE system_configuration_scf
            SET scf_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
            WHERE scf_id = ?
        """, [newValue, updatedBy, scfId])

        // Insert history record
        sql.executeUpdate("""
            INSERT INTO system_configuration_history_sch
            (scf_id, sch_old_value, sch_new_value, sch_change_reason, sch_change_type, created_by)
            VALUES (?, ?, ?, ?, 'UPDATE', ?)
        """, [scfId, currentConfig.scf_value, newValue, changeReason, updatedBy])
    }
}
```

### 2.3. Performance Indexes

#### Essential Indexes for Instructions

```sql
-- Primary query patterns
CREATE INDEX idx_inm_stm_id_order ON instructions_master_inm(stm_id, inm_order);
CREATE INDEX idx_ini_sti_id ON instructions_instance_ini(sti_id);
CREATE INDEX idx_ini_completion ON instructions_instance_ini(ini_is_completed, ini_completed_at);

-- Team assignment queries
CREATE INDEX idx_inm_tms_id ON instructions_master_inm(tms_id) WHERE tms_id IS NOT NULL;

-- Control point queries
CREATE INDEX idx_inm_ctm_id ON instructions_master_inm(ctm_id) WHERE ctm_id IS NOT NULL;
```

#### Essential Indexes for System Configuration

```sql
-- Environment and category queries
CREATE INDEX idx_scf_env_category ON system_configuration_scf(env_id, scf_category);
CREATE INDEX idx_scf_key_active ON system_configuration_scf(scf_key, scf_is_active);
CREATE INDEX idx_scf_category_active ON system_configuration_scf(scf_category, scf_is_active);

-- History queries
CREATE INDEX idx_sch_scf_id ON system_configuration_history_sch(scf_id);
```

#### Audit Fields Performance Indexes

```sql
-- Master tables: Composite index on (created_by, created_at)
CREATE INDEX idx_audit_master_created ON instructions_master_inm(created_by, created_at);
CREATE INDEX idx_audit_instance_created ON instructions_instance_ini(created_by, created_at);

-- Frequently queried reference tables: Index on created_at
CREATE INDEX idx_scf_created_at ON system_configuration_scf(created_at);
```

---

## 3. Data Model Normalization Analysis & Best Practices

### 3.1. Current State Assessment (✅ Significant Progress Achieved)

**Status Update as of August 2025**: The UMIG team has successfully implemented major improvements addressing most critical normalization issues identified in earlier analysis.

#### ✅ **COMPLETED IMPROVEMENTS**

1. **✅ Audit Fields Standardization**: Migration 016 successfully implemented consistent audit fields across all 25+ tables
2. **✅ Status Management**: Migration 015 implemented centralized status table with proper constraints
3. **✅ Type Safety**: ADR-031 patterns fully implemented across all repository methods
4. **✅ Association Table Strategy**: Migration 017 implemented tiered audit approach for join tables

### 3.2. Design Patterns & Recommendations

#### Full Attribute Instantiation Pattern (ADR-029)

The instance tables use denormalization by design for specific business requirements:

```sql
-- Example: sequences_instance_sqi includes override fields
sqi_name         -- Can override sqm_name from master
sqi_description  -- Can override sqm_description from master
sqi_order        -- Can override sqm_order from master
```

**Rationale**:

- Enables per-instance overrides for execution flexibility
- Preserves historical accuracy during migrations
- Supports auditability of changes over time
- Allows future promotion of instance changes to master

**Trade-offs Accepted**:

- Data redundancy vs. operational flexibility
- Storage overhead vs. query simplicity
- Synchronization complexity vs. historical preservation

#### Tiered Audit Strategy for Association Tables

**Tier 1 - Critical Associations (Full Audit)**:

- `teams_tms_x_users_usr`: User-team assignments (created_at, created_by as VARCHAR)
- **Rationale**: Access control and organizational structure changes require full tracking

**Tier 2 - Standard Associations (Minimal Audit)**:

- `teams_tms_x_applications_app`: Team-application links (created_at only)
- `labels_lbl_x_*`: Label associations (created_at, created_by)
- **Rationale**: Basic tracking without over-engineering

**Tier 3 - Simple Associations (No Audit)**:

- `environments_env_x_applications_app`: Environment-application links
- **Rationale**: Pure many-to-many relationships with minimal change tracking needs

### 3.3. Configuration Management Best Practices

#### Environment Isolation Pattern

```groovy
// Always scope configuration queries by environment
def getConfigValue(String key, Integer envId) {
    return DatabaseUtil.withSql { sql ->
        sql.firstRow("""
            SELECT scf_value, scf_data_type
            FROM system_configuration_scf
            WHERE scf_key = ? AND env_id = ? AND scf_is_active = true
        """, [key, envId])
    }
}
```

#### Configuration Validation Pattern

```groovy
// Validate configuration values before storage
def validateConfigurationValue(String value, String dataType, String validationPattern = null) {
    switch (dataType) {
        case 'INTEGER':
            return value.isInteger()
        case 'BOOLEAN':
            return value.toLowerCase() in ['true', 'false']
        case 'URL':
            return isValidUrl(value)
        case 'JSON':
            return isValidJson(value)
        default:
            return validationPattern ? value.matches(validationPattern) : true
    }
}
```

### 3.4. Performance Optimization Guidelines

#### Query Pattern Optimization

**DO: Use hierarchical filtering with instance IDs**

```groovy
// CORRECT - filters by instance IDs for proper hierarchical navigation
query += ' AND pli.pli_id = :planId'     // plan instance
query += ' AND sqi.sqi_id = :sequenceId' // sequence instance
query += ' AND phi.phi_id = :phaseId'    // phase instance
```

**DON'T: Use master IDs for instance queries**

```groovy
// INCORRECT - filters by master IDs (will miss steps)
query += ' AND plm.plm_id = :planId'     // plan master
```

#### Field Selection Best Practices

```groovy
// ALWAYS include ALL fields referenced in result mapping
SELECT sti.sti_id, stm.stm_id, stm.stt_code, stm.stm_number, ...
// Never omit referenced fields - causes "No such property" errors
```

### 3.5. Future Normalization Considerations

#### Status Management Enhancement

Consider implementing status transition validation:

```sql
-- Status transition rules table
CREATE TABLE status_transitions (
    str_id SERIAL PRIMARY KEY,
    stt_id_from INTEGER REFERENCES status_sts(sts_id),
    stt_id_to INTEGER NOT NULL REFERENCES status_sts(sts_id),
    str_entity_type VARCHAR(50) NOT NULL,
    str_role_required VARCHAR(50)
);
```

#### Versioning Support

For future requirements, consider adding versioning to master entities:

```sql
-- Example versioning pattern
ALTER TABLE steps_master_stm ADD COLUMN stm_version INTEGER DEFAULT 1;
ALTER TABLE steps_master_stm ADD COLUMN stm_is_latest BOOLEAN DEFAULT TRUE;
```

### 3.6. Data Integrity Validation

#### Regular Health Checks

```sql
-- Verify all instances have master references
SELECT COUNT(*) FROM instructions_instance_ini ini
LEFT JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
WHERE inm.inm_id IS NULL;

-- Check completion consistency
SELECT COUNT(*) FROM instructions_instance_ini
WHERE ini_is_completed = true AND ini_completed_at IS NULL;

-- Validate configuration data types
SELECT scf_key, scf_value, scf_data_type
FROM system_configuration_scf
WHERE scf_data_type = 'INTEGER' AND scf_value !~ '^[0-9]+$';
```

---

## 4. Implementation Patterns & Best Practices

### 4.1. Type Safety in Repository Methods

All repository methods must use explicit type casting when handling query parameters:

```groovy
// CORRECT - Explicit casting for type safety
if (filters.migrationId) {
    query += ' AND mig.mig_id = :migrationId'
    params.migrationId = UUID.fromString(filters.migrationId as String)
}

if (filters.teamId) {
    query += ' AND stm.tms_id_owner = :teamId'
    params.teamId = Integer.parseInt(filters.teamId as String)
}
```

### 4.2. Master vs Instance ID Filtering

Always use instance IDs for hierarchical filtering to ensure correct step retrieval:

```groovy
// CORRECT - filters by instance IDs
query += ' AND pli.pli_id = :planId'     // plan instance
query += ' AND sqi.sqi_id = :sequenceId' // sequence instance
query += ' AND phi.phi_id = :phaseId'    // phase instance

// INCORRECT - filters by master IDs (will miss steps)
query += ' AND plm.plm_id = :planId'     // plan master
```

### 4.3. Complete Field Selection

All SQL queries must include ALL fields referenced in result mapping:

```groovy
// CORRECT - includes stm.stm_id for mapping
SELECT sti.sti_id, stm.stm_id, stm.stt_code, stm.stm_number, ...

// INCORRECT - missing stm.stm_id causes "No such property" error
SELECT sti.sti_id, stm.stt_code, stm.stm_number, ...
```

### 4.4. Many-to-Many Relationship Handling

Handle optional many-to-many relationships gracefully:

```groovy
// Graceful label fetching with error handling
def stepLabels = []
try {
    def stmId = step.stmId instanceof UUID ? step.stmId : UUID.fromString(step.stmId.toString())
    stepLabels = stepRepository.findLabelsByStepId(stmId)
} catch (Exception e) {
    stepLabels = [] // Continue with empty labels if fetching fails
}
```

### 4.5. Active User Filtering Pattern

Handle active status filtering with proper validation:

```groovy
// Active filter parameter validation
Boolean activeFilter = null
if (active) {
    if (active.toString().toLowerCase() in ['true', 'false']) {
        activeFilter = Boolean.parseBoolean(active as String)
    } else {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid active parameter. Must be true or false"]).toString()).build()
    }
}

// Apply active filter in WHERE clause
if (activeFilter != null) {
    whereConditions.add("u.usr_active = :activeFilter")
    params.activeFilter = activeFilter
}
```

### 4.6. Audit Fields Handling Pattern

Properly manage audit fields in create and update operations:

```groovy
// CREATE operation - set all audit fields
def currentUserCode = getUserCode(currentUserEmail) ?: 'system'  // Get trigram
def now = new Timestamp(System.currentTimeMillis())

params.created_by = currentUserCode  // User trigram (e.g., 'JDS')
params.created_at = now
params.updated_by = currentUserCode  // User trigram
params.updated_at = now  // Will be auto-updated by trigger on subsequent updates

// UPDATE operation - only set updated_by (updated_at handled by trigger)
params.updated_by = currentUserCode  // User trigram
// updated_at is automatically set by PostgreSQL trigger

// Helper function to get user trigram from email
def getUserCode(String email) {
    def result = DatabaseUtil.withSql { sql ->
        sql.firstRow('SELECT usr_code FROM users_usr WHERE usr_email = ?', [email])
    }
    return result?.usr_code ?: 'system'
}

// Utility class usage (AuditFieldsUtil.groovy - if created)
import umig.utils.AuditFieldsUtil

// For create operations
def auditFields = AuditFieldsUtil.getCreateAuditFields(currentUserCode)
params.putAll(auditFields)

// For update operations
def updateFields = AuditFieldsUtil.getUpdateAuditFields(currentUserCode)
params.putAll(updateFields)

// Association table audit patterns
// Tier 1 - Critical (full audit)
sql.execute("""
    INSERT INTO teams_tms_x_users_usr (tms_id, usr_id, created_at, created_by)
    VALUES (?, ?, CURRENT_TIMESTAMP, ?)
""", [teamId, userId, currentUserCode])

// Tier 2 - Standard (minimal audit)
sql.execute("""
    INSERT INTO teams_tms_x_applications_app (tms_id, app_id, created_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
""", [teamId, appId])

// Tier 3 - Simple (no audit)
sql.execute("""
    INSERT INTO environments_env_x_applications_app (env_id, app_id)
    VALUES (?, ?)
""", [envId, appId])
```

---

## 5. Audit Fields Standardization (US-002b & US-002d)

### Standard Audit Fields Pattern

All tables in the UMIG database now follow a standardized audit fields pattern (migrations 016 & 017):

#### Core Audit Fields

- **created_by** (VARCHAR(255)): User trigram (usr_code), 'system', 'generator', or 'migration'
- **created_at** (TIMESTAMPTZ): Timestamp when the record was created
- **updated_by** (VARCHAR(255)): User trigram (usr_code), 'system', 'generator', or 'migration'
- **updated_at** (TIMESTAMPTZ): Timestamp when the record was last updated (auto-updated via trigger)

#### Audit Field Values (US-002d)

The `created_by` and `updated_by` fields store the following values:

- **User trigram**: The 3-character `usr_code` from the `users_usr` table (e.g., 'JDS' for John Doe Smith)
- **'system'**: For operations performed by the system or background processes
- **'generator'**: For data created by data generation scripts
- **'migration'**: For data created or modified during database migrations

A helper function `get_user_code(user_email VARCHAR)` is available to retrieve user trigrams from email addresses.

#### Tables with Audit Fields

The following tables have been standardized with the audit fields pattern:

**Master Tables:**

- sequences_master_sqm, phases_master_phm, steps_master_stm
- controls_master_ctm, instructions_master_inm

**Instance Tables:**

- sequences_instance_sqi, phases_instance_phi, steps_instance_sti
- controls_instance_cti, instructions_instance_ini

**Reference Tables:**

- teams_tms, applications_app, environments_env
- roles_rls, environment_roles_enr, step_types_stt
- iteration_types_itt, status_sts, email_templates_emt

**Special Cases:**

- **users_usr**: Has created_at/updated_at from migration 012, added created_by/updated_by in migration 016
- **labels_lbl**: Already had created_by as INTEGER (user reference), only added updated_by/updated_at

#### Automatic Update Triggers

All tables with audit fields have PostgreSQL triggers that automatically update the `updated_at` timestamp on any UPDATE operation using the `update_updated_at_column()` function.

#### Association Tables Audit Strategy (US-002d)

Association (join) tables follow a tiered audit approach based on business criticality:

**Tier 1 - Critical Associations (Full Audit)**

- `teams_tms_x_users_usr`: User-team assignments (created_at, created_by as VARCHAR)
- `environment_roles_enr_x_users_usr`: User-role assignments (when created)
- **Rationale**: These track access control and organizational structure changes

**Tier 2 - Standard Associations (Minimal Audit)**

- `teams_tms_x_applications_app`: Team-application links (created_at only)
- `labels_lbl_x_steps_master_stm`: Label-step associations (created_at, created_by)
- `labels_lbl_x_applications_app`: Label-application associations (created_at, created_by)
- `labels_lbl_x_controls_master_ctm`: Label-control associations (created_at, created_by)
- **Rationale**: These provide basic tracking without over-engineering

**Tier 3 - Simple Associations (No Audit)**

- `environments_env_x_applications_app`: Environment-application links
- `environments_env_x_iterations_ite`: Environment-iteration links
- `steps_master_stm_x_iteration_types_itt`: Step-iteration type links
- `steps_master_stm_x_teams_tms_impacted`: Step-impacted teams links
- **Rationale**: These are pure many-to-many relationships with minimal change tracking needs

#### Performance Indexes

Audit field indexes have been created for common query patterns:

- Master tables: Composite index on (created_by, created_at)
- Instance tables: Composite index on (created_by, created_at)
- Frequently queried reference tables: Index on created_at

---

## 6. Recent Changes & Migration Notes

### 2025-08-14: US-024 Steps API Refactoring and Database Quality Enhancement

- **Steps API Enhancement**: Complete refactoring of Steps API with enhanced error handling
- **Comments System Integration**: Improved comments system with better validation
- **DatabaseQualityValidator**: Implemented comprehensive database validation framework
- **Type Safety Improvements**: Enhanced ADR-031 compliance across all repository methods
- **Performance Optimizations**: Improved query performance and hierarchical filtering patterns

### 2025-08-04: Audit Fields Standardization (US-002b & US-002d)

- **Migration 016**: Standardized audit fields across all 25+ tables
- **Migration 017**: Standardized association table audit fields using tiered approach
- **Key Design Decisions (US-002d)**:
  - Use user trigrams (usr_code) instead of user IDs for audit fields
  - Implement tiered audit strategy for association tables based on business criticality
  - Convert existing INTEGER created_by fields to VARCHAR(255) for consistency
- **Trigger Function**: Reused `update_updated_at_column()` function from migration 012
- **Helper Function**: Added `get_user_code(user_email)` for retrieving user trigrams
- **Special Cases**:
  - Converted teams_tms_x_users_usr and labels_lbl_x_steps_master_stm from INTEGER to VARCHAR created_by
  - Added created_at to teams_tms_x_applications_app for Tier 2 audit tracking
- **Performance**: Added indexes for common audit field query patterns
- **Generator Updates**: Updated all data generators to populate audit fields with 'generator'

### 2025-07-15: Teams Association Management and Environment Search Enhancement

- **Teams Association APIs**: Implemented comprehensive team-application association management:
  - Enhanced `teams_tms_x_applications_app` join table utilization for team-application relationships
  - Added application association endpoints for add/remove functionality in admin interface
  - Improved team management with user and application association modals
- **Environment Search Enhancement**: Added full-stack search functionality for environments:
  - Enhanced EnvironmentsApi with search, pagination, and sorting parameters
  - Fixed GString SQL type inference issues with proper parameterized query patterns
  - Added EntityConfig support for environment search filtering
- **User Status Management**: Enhanced user management with active status filtering:
  - Migration 011: Added `usr_active` boolean field with NOT NULL constraint and TRUE default
  - Migration 012: Added `created_at` and `updated_at` audit timestamp fields with automatic triggers
  - Index created on `usr_active` for performance optimization
  - Extended Users API with active parameter for filtering active/inactive users
- **Modal Consistency**: Standardized modal UI patterns across Teams and Environments with consistent AUI styling
- **State Management**: Fixed sort field persistence bugs and confirmation dialog regressions

### 2025-07-10: Hierarchical Filtering and Labels Implementation

- **Fixed Type System Issues**: Resolved Groovy static type checking errors in StepRepository
- **Corrected Field References**: Fixed master vs instance ID filtering patterns
- **Enhanced Labels Integration**: Added proper many-to-many label-step relationship handling
- **Database Field Selection**: Ensured all referenced fields are included in SQL queries

### 2025-07-04: Full Attribute Replication (Migration 010)

- **Instance Tables Enhancement**: Added full attribute replication to all instance tables:
  - `sequences_instance_sqi`: Added `sqi_name`, `sqi_description`, `sqi_order`, `predecessor_sqi_id`
  - `phases_instance_phi`: Added `phi_order`, `phi_name`, `phi_description`, `predecessor_phi_id`
  - `steps_instance_sti`: Added `sti_name`, `sti_description`, `sti_duration_minutes`, `sti_id_predecessor`, `enr_id_target`
  - `instructions_instance_ini`: Added `ini_order`, `ini_body`, `ini_duration_minutes`, `tms_id`, `cti_id`
  - `controls_instance_cti`: Added `cti_order`, `cti_name`, `cti_description`, `cti_type`, `cti_is_critical`, `cti_code`
- **Override Capability**: Enables per-instance overrides, auditability, and future promotion capabilities
- **See**: [ADR-029](../adr/ADR-029-full-attribute-instantiation-instance-tables.md) for design rationale

### 2025-07-02: Labels and Team Membership

- **Labels System**: Created `labels_lbl` table with migration-scoped labels
- **Step-Label Association**: Added `labels_lbl_x_steps_master_stm` join table for step labeling
- **Application Labels**: Added `labels_lbl_x_applications_app` for application labeling
- **Team Membership Refactor**: Introduced `teams_tms_x_users_usr` for N-N user-team membership
- **Schema Cleanup**: Dropped `tms_id` column from `users_usr` table
- **Comments System**: Added `step_pilot_comments_spc` and `step_instance_comments_sic` tables

### 2025-06-24: Controls Enhancement

- **Control Codes**: Added `ctm_code` field to `controls_master_ctm` for business identifiers
- **Label-Control Association**: Added `labels_lbl_x_controls_master_ctm` join table

All changes are reflected in this document and the main data model specification.

### Database Normalization Migration Strategy (Historical Reference)

Based on the comprehensive analysis in [normalization-recommendations.md](./normalization-recommendations.md), a 4-phase implementation approach was originally recommended:

#### Phase 1: Add Audit Fields (Week 1)

**Scope**: Standardize audit fields across all 25+ tables

- Create Liquibase migration to add audit fields to all tables
- Set default values for existing records ('system', 'generator', 'migration')
- Update all repository classes to handle audit fields
- Modify APIs to populate audit fields with user trigrams

**Risk Mitigation**:

- Transaction-based migration with rollback capability
- Comprehensive validation queries post-migration

#### Phase 2: Normalize Instance Tables (Week 2)

**Scope**: Address data duplication in instance tables

- Create override tables for instance-specific changes
- Migrate existing override data to new normalized structure
- Update repository methods to handle proper joins
- Refactor APIs to use normalized structure

**Key Decision**: ADR-029 pattern was retained by design for operational flexibility

#### Phase 3: Implement Status Management (Week 3)

**Scope**: Replace VARCHAR status with proper status tables

- Create status_types and status_transitions tables
- Migrate existing status values to centralized system
- Update APIs to use status tables for validation
- Implement status transition validation logic

#### Phase 4: Testing & Validation (Week 4)

**Scope**: Comprehensive validation and performance testing

- Full API regression testing with normalized structure
- Performance testing and benchmarking
- Data integrity validation across all tables
- Documentation updates and deployment procedures

**Status Update**: Most critical improvements from Phases 1 and 3 have been successfully implemented as of August 2025, with ADR-029 pattern maintained for Phase 2 considerations.

---

## 7. Troubleshooting & Operational Guidance

### 7.1. Common Configuration Issues & Solutions

#### Configuration Not Found

**Issue**: Application cannot find required configuration settings

**Diagnostic Steps**:

1. Verify environment ID and configuration key
2. Check `scf_is_active` status
3. Validate environment exists in `environments_env`

**Debug Query**:

```sql
-- Find all configurations for environment
SELECT scf_key, scf_value, scf_is_active, scf_category
FROM system_configuration_scf
WHERE env_id = ?
ORDER BY scf_category, scf_key;
```

**Common Solutions**:

- Activate disabled configuration: `UPDATE system_configuration_scf SET scf_is_active = true WHERE scf_key = ? AND env_id = ?`
- Create missing configuration via SystemConfigurationApi or repository
- Verify environment ID matches actual environment table entries

#### Validation Failures

**Issue**: Configuration updates fail due to validation errors

**Diagnostic Steps**:

1. Review `scf_data_type` and `scf_validation_pattern`
2. Test validation patterns with sample data
3. Check for special characters in values

**Debug Queries**:

```sql
-- Check configuration data type and pattern
SELECT scf_key, scf_data_type, scf_validation_pattern, scf_value
FROM system_configuration_scf
WHERE scf_key = ? AND env_id = ?;

-- Find configurations with invalid data types
SELECT scf_key, scf_value, scf_data_type
FROM system_configuration_scf
WHERE scf_data_type = 'INTEGER' AND scf_value !~ '^[0-9]+$';
```

**Common Solutions**:

- Update validation pattern to match actual data requirements
- Convert data type if pattern is correct but type is wrong
- Clean data values to match expected format

#### Confluence Macro Integration Issues

**Issue**: Confluence macros not loading or displaying incorrect data

**Diagnostic Steps**:

1. Verify macro-specific configurations exist
2. Check Confluence connectivity
3. Validate page ID and space key format

**Debug Query**:

```sql
-- Get all Confluence macro configurations
SELECT scf_key, scf_value
FROM system_configuration_scf
WHERE env_id = ? AND scf_category = 'MACRO_LOCATION' AND scf_is_active = true
ORDER BY scf_key;
```

**Common Solutions**:

- Verify base URL accessibility: Test `stepview.confluence.base.url`
- Validate page exists: Check `stepview.confluence.page.id`
- Confirm space permissions: Verify `stepview.confluence.space.key`

### 7.2. Database Integrity & Validation Issues

#### Instance-Master Reference Integrity

**Issue**: Instance records missing master references

**Health Check Query**:

```sql
-- Verify all instances have master references
SELECT 'instructions' as table_name, COUNT(*) as orphaned_records
FROM instructions_instance_ini ini
LEFT JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
WHERE inm.inm_id IS NULL

UNION ALL

SELECT 'steps', COUNT(*)
FROM steps_instance_sti sti
LEFT JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
WHERE stm.stm_id IS NULL;
```

**Resolution Steps**:

1. Identify orphaned instance records
2. Either restore missing master records or clean up orphaned instances
3. Implement referential integrity constraints if missing

#### Completion Status Inconsistencies

**Issue**: Completion flags inconsistent with timestamps

**Health Check Query**:

```sql
-- Check completion consistency
SELECT COUNT(*) as inconsistent_records
FROM instructions_instance_ini
WHERE ini_is_completed = true AND ini_completed_at IS NULL

UNION ALL

SELECT COUNT(*)
FROM instructions_instance_ini
WHERE ini_is_completed = false AND ini_completed_at IS NOT NULL;
```

**Resolution**:

```sql
-- Fix completion timestamp inconsistencies
UPDATE instructions_instance_ini
SET ini_completed_at = CURRENT_TIMESTAMP
WHERE ini_is_completed = true AND ini_completed_at IS NULL;

UPDATE instructions_instance_ini
SET ini_is_completed = false, usr_id_completed_by = NULL
WHERE ini_is_completed = false AND ini_completed_at IS NOT NULL;
```

#### Audit Fields Validation

**Issue**: Missing or inconsistent audit field data

**Health Check Queries**:

```sql
-- Check for missing audit field data
SELECT table_name,
       COUNT(*) FILTER (WHERE created_by IS NULL OR created_by = '') as missing_created_by,
       COUNT(*) FILTER (WHERE created_at IS NULL) as missing_created_at,
       COUNT(*) FILTER (WHERE updated_by IS NULL OR updated_by = '') as missing_updated_by
FROM (
    SELECT 'steps_master' as table_name, created_by, created_at, updated_by FROM steps_master_stm
    UNION ALL
    SELECT 'instructions_master', created_by, created_at, updated_by FROM instructions_master_inm
    -- Add other tables as needed
) audit_check
GROUP BY table_name;
```

### 7.3. Performance Troubleshooting

#### Large Configuration Sets Performance

**Issue**: Slow query performance on large configuration datasets

**Diagnostic Queries**:

```sql
-- Check configuration query performance
EXPLAIN ANALYZE
SELECT scf_key, scf_value
FROM system_configuration_scf
WHERE env_id = 1 AND scf_category = 'MACRO_LOCATION' AND scf_is_active = true;

-- Monitor index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'system_configuration_scf'
ORDER BY n_distinct DESC;
```

**Optimization Solutions**:

1. **Index Monitoring**: Ensure proper index usage

```sql
-- Verify essential indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'system_configuration_scf';
```

2. **Query Pattern Analysis**: Review slow query patterns
3. **Pagination Implementation**: Consider pagination for admin interfaces
4. **Caching Strategy**: Implement application-level caching for frequently accessed configurations

#### N+1 Query Issues

**Issue**: Multiple database round trips for related data

**Detection Pattern**:

- Monitor database logs for repeated similar queries
- Profile API response times for endpoints returning lists

**Common Solutions**:

- Use JOIN queries instead of separate lookups
- Implement eager loading in repository methods
- Cache frequently accessed reference data

### 7.4. Migration & Deployment Troubleshooting

#### 4-Phase Implementation Guidance

Based on the detailed migration strategy from normalization analysis:

**Phase 1: Audit Fields Implementation (Week 1)**

- **Risk**: Existing data may have NULL audit fields
- **Mitigation**: Set reasonable defaults during migration
- **Validation**: Run audit field health checks post-migration

**Phase 2: Instance Table Normalization (Week 2)**

- **Risk**: Data duplication and synchronization issues
- **Mitigation**: Implement transaction-based migration with rollback capability
- **Validation**: Compare data before/after migration

**Phase 3: Status Management Enhancement (Week 3)**

- **Risk**: Invalid status transitions during cutover
- **Mitigation**: Implement gradual status table adoption
- **Validation**: Verify all status values map correctly

**Phase 4: Testing & Validation (Week 4)**

- **Focus**: Comprehensive API and data integrity testing
- **Tools**: Automated test suite execution
- **Validation**: Performance benchmarking against baseline

### 7.5. Health Monitoring & Maintenance

#### Configuration Validation on Startup

**Startup Health Check Script**:

```sql
-- Essential configuration validation
SELECT
    'Missing MACRO_LOCATION configs' as check_type,
    env_id,
    COUNT(*) as config_count
FROM system_configuration_scf
WHERE scf_category = 'MACRO_LOCATION' AND scf_is_active = true
GROUP BY env_id
HAVING COUNT(*) < 4; -- Expecting 4 macro location configs per environment
```

**Implementation**:

- Execute during application startup
- Log warnings for missing configurations
- Fail startup for critical missing configurations

#### Maintenance Operations

**Regular Maintenance Tasks**:

1. **Configuration Cleanup**:

```sql
-- Find unused configurations (no access in 90 days)
SELECT scf_key, scf_category, created_at
FROM system_configuration_scf
WHERE scf_is_active = false
  AND updated_at < CURRENT_DATE - INTERVAL '90 days';
```

2. **History Table Pruning**:

```sql
-- Remove configuration history older than 1 year
DELETE FROM system_configuration_history_sch
WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
```

3. **Performance Monitoring**:

```sql
-- Monitor configuration query patterns
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%system_configuration_scf%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### Monitoring Alerts

**Key Metrics to Monitor**:

- Configuration lookup response times (< 50ms target)
- Failed validation attempts (should be minimal)
- Missing critical configurations (should be 0)
- Database connection pool utilization
- Query performance degradation

**Alert Thresholds**:

- Configuration response time > 100ms
- More than 5 validation failures per minute
- Any missing MACRO_LOCATION configurations
- Database pool utilization > 80%

### 7.6. Emergency Procedures

#### Configuration Rollback

**Immediate Rollback Process**:

1. Identify problematic configuration change via history table
2. Retrieve previous value from `system_configuration_history_sch`
3. Execute rollback update with proper audit trail

```sql
-- Rollback configuration to previous value
WITH previous_value AS (
    SELECT sch_old_value
    FROM system_configuration_history_sch
    WHERE scf_id = ?
    ORDER BY created_at DESC
    LIMIT 1
)
UPDATE system_configuration_scf
SET scf_value = (SELECT sch_old_value FROM previous_value),
    updated_by = 'emergency_rollback',
    updated_at = CURRENT_TIMESTAMP
WHERE scf_id = ?;
```

#### Database Recovery Procedures

**Data Corruption Recovery**:

1. Identify affected tables via integrity checks
2. Restore from latest backup if available
3. Re-run data validation queries
4. Verify application functionality

**Reference Integrity Repair**:

1. Run comprehensive integrity check queries
2. Identify and document all integrity violations
3. Repair or clean up orphaned records
4. Re-establish foreign key constraints if needed

---

## 8. References & Further Reading

### Core Documentation

- [UMIG_Data_Model.md](./UMIG_Data_Model.md) - Pure schema specification and table definitions
- [ADR-029: Full Attribute Instantiation Instance Tables](../adr/ADR-029-full-attribute-instantiation-instance-tables.md)
- [ADR-031: Groovy Type Safety and Filtering Patterns](../adr/ADR-031-groovy-type-safety-and-filtering-patterns.md)
- [ADR-022: User-Team N-N Relationship](../adr/ADR-022-user-team-nn-relationship.md)
- [Solution Architecture Documentation](../solution-architecture.md)
- [Project README](../../README.md)

### Schema-Specific Documentation

- [System Configuration Schema](../database/system-configuration-schema.md) - Detailed configuration management implementation
- [Instructions Schema Documentation](./instructions-schema-documentation.md) - Production-ready instructions implementation
- [Normalization Recommendations](./normalization-recommendations.md) - Historical analysis and best practices

### API Documentation

- [SystemConfigurationApi Reference](../../src/groovy/umig/api/v2/SystemConfigurationApi.groovy)
- [SystemConfigurationRepository](../../src/groovy/umig/repository/SystemConfigurationRepository.groovy)
- [OpenAPI Specification](../api/openapi.yaml)

### Testing & Validation

- [SystemConfigurationRepositoryTest](../../src/groovy/umig/tests/unit/SystemConfigurationRepositoryTest.groovy)
- [Instructions API Integration Tests](../../src/groovy/umig/tests/integration/)
- [Database Quality Validation](../testing/QUALITY_CHECK_PROCEDURES.md)
