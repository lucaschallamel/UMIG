# Instructions Schema Documentation

## US-004 Instructions API Database Schema

**Document Type**: Production Schema Documentation  
**Status**: ✅ PRODUCTION READY - NO CHANGES REQUIRED  
**Created**: August 2025  
**Schema Version**: 001_unified_baseline.sql

---

## 1. Executive Summary

### 🎯 Critical Notice: DOCUMENTATION ONLY

**This document describes the EXISTING production schema for the Instructions feature. The database tables are already implemented in `001_unified_baseline.sql` and are fully operational. NO database changes, migrations, or schema modifications are required.**

### Schema Purpose

The Instructions schema implements the canonical master/instance pattern for managing step-level instructions within the UMIG cutover management system. Instructions represent the granular, actionable tasks that must be completed within each step of a migration sequence.

### Key Characteristics

- **Pattern**: Canonical master (`instructions_master_inm`) + runtime instance (`instructions_instance_ini`)
- **Hierarchy**: Steps → Instructions (leaf-level entities)
- **Status Model**: Simplified boolean completion tracking (`ini_is_completed`)
- **Team Assignment**: Optional team assignment with control point integration
- **Audit Trail**: Completion timestamps and user tracking

---

## 2. Schema Overview

### Entity Relationship Diagram

```
Steps Master (stm) ──┐
                     │
                     ├─→ Instructions Master (inm) ──┐
                     │   ├─ Teams (tms) [optional]   │
                     │   └─ Controls Master (ctm)    │
                     │                               │
Steps Instance (sti) ────→ Instructions Instance (ini)
                           └─ Users (usr) [completion]
```

### Table Summary

| Table                       | Purpose                           | Row Estimate | Status        |
| --------------------------- | --------------------------------- | ------------ | ------------- |
| `instructions_master_inm`   | Canonical instruction definitions | ~14,430      | ✅ Production |
| `instructions_instance_ini` | Runtime instruction instances     | ~14,430      | ✅ Production |

---

## 3. Table Specifications

### 3.1 Instructions Master (`instructions_master_inm`)

**Purpose**: Canonical definition of instructions within steps

```sql
CREATE TABLE instructions_master_inm (
    inm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stm_id UUID NOT NULL,
    tms_id INTEGER,
    ctm_id UUID,
    inm_order INTEGER NOT NULL,
    inm_body TEXT,
    inm_duration_minutes INTEGER,
    CONSTRAINT fk_inm_stm_stm_id FOREIGN KEY (stm_id) REFERENCES steps_master_stm(stm_id),
    CONSTRAINT fk_inm_tms_tms_id FOREIGN KEY (tms_id) REFERENCES teams_tms(tms_id),
    CONSTRAINT fk_inm_ctm_ctm_id FOREIGN KEY (ctm_id) REFERENCES controls_master_ctm(ctm_id)
);
```

**Field Specifications**:

| Field                  | Type         | Constraints                            | Purpose                                        |
| ---------------------- | ------------ | -------------------------------------- | ---------------------------------------------- |
| `inm_id`               | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique instruction master identifier           |
| `stm_id`               | UUID         | NOT NULL, FK → steps_master_stm        | Parent step reference                          |
| `tms_id`               | INTEGER      | NULLABLE, FK → teams_tms               | Optional assigned team                         |
| `ctm_id`               | UUID         | NULLABLE, FK → controls_master_ctm     | Optional control point                         |
| `inm_order`            | INTEGER      | NOT NULL                               | Display/execution order within step            |
| `inm_body`             | TEXT         | NULLABLE                               | Instruction content/description                |
| `inm_duration_minutes` | INTEGER      | NULLABLE                               | Estimated completion time                      |
| `created_at`           | TIMESTAMPTZ  | DEFAULT CURRENT_TIMESTAMP              | Creation timestamp - Added migration 016       |
| `created_by`           | VARCHAR(255) | DEFAULT 'system'                       | User trigram or system - Added migration 016   |
| `updated_at`           | TIMESTAMPTZ  | DEFAULT CURRENT_TIMESTAMP              | Last update timestamp - Added migration 016    |
| `updated_by`           | VARCHAR(255) | DEFAULT 'system'                       | User trigram who updated - Added migration 016 |

### 3.2 Instructions Instance (`instructions_instance_ini`)

**Purpose**: Runtime instances with completion tracking

```sql
CREATE TABLE instructions_instance_ini (
    ini_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sti_id UUID NOT NULL,
    inm_id UUID NOT NULL,
    ini_is_completed BOOLEAN DEFAULT FALSE,
    ini_completed_at TIMESTAMPTZ,
    usr_id_completed_by INTEGER,
    CONSTRAINT fk_ini_sti_sti_id FOREIGN KEY (sti_id) REFERENCES steps_instance_sti(sti_id),
    CONSTRAINT fk_ini_inm_inm_id FOREIGN KEY (inm_id) REFERENCES instructions_master_inm(inm_id),
    CONSTRAINT fk_ini_usr_usr_id_completed_by FOREIGN KEY (usr_id_completed_by) REFERENCES users_usr(usr_id)
);
```

**Field Specifications**:

| Field                  | Type         | Constraints                            | Purpose                                               |
| ---------------------- | ------------ | -------------------------------------- | ----------------------------------------------------- |
| `ini_id`               | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique instruction instance identifier                |
| `sti_id`               | UUID         | NOT NULL, FK → steps_instance_sti      | Parent step instance                                  |
| `inm_id`               | UUID         | NOT NULL, FK → instructions_master_inm | Master instruction reference                          |
| `tms_id`               | INTEGER      | NULLABLE                               | Assigned team (from master) - Added migration 010     |
| `cti_id`               | UUID         | NULLABLE                               | Associated control instance - Added migration 010     |
| `ini_order`            | INTEGER      | NULLABLE                               | Instance order (from master) - Added migration 010    |
| `ini_body`             | TEXT         | NULLABLE                               | Instance content (from master) - Added migration 010  |
| `ini_duration_minutes` | INTEGER      | NULLABLE                               | Instance duration (from master) - Added migration 010 |
| `ini_is_completed`     | BOOLEAN      | DEFAULT FALSE                          | Simple completion flag                                |
| `ini_completed_at`     | TIMESTAMPTZ  | NULLABLE                               | Completion timestamp                                  |
| `usr_id_completed_by`  | INTEGER      | NULLABLE, FK → users_usr               | Completing user                                       |
| `created_at`           | TIMESTAMPTZ  | DEFAULT CURRENT_TIMESTAMP              | Creation timestamp - Added migration 016              |
| `created_by`           | VARCHAR(255) | DEFAULT 'system'                       | User trigram who created - Added migration 016        |
| `updated_at`           | TIMESTAMPTZ  | DEFAULT CURRENT_TIMESTAMP              | Last update timestamp - Added migration 016           |
| `updated_by`           | VARCHAR(255) | DEFAULT 'system'                       | User trigram who updated - Added migration 016        |

---

## 4. Indexes and Performance

### Recommended Indexes (Implementation Guidance)

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

### Performance Characteristics

- **Query Pattern**: Primarily hierarchical lookups by step
- **Expected Load**: Read-heavy with periodic completion updates
- **Scaling**: Linear with step count (~10 instructions per step average)

---

## 5. Constraints and Relationships

### Foreign Key Relationships

```sql
-- Master table relationships
instructions_master_inm.stm_id → steps_master_stm.stm_id (REQUIRED)
instructions_master_inm.tms_id → teams_tms.tms_id (OPTIONAL)
instructions_master_inm.ctm_id → controls_master_ctm.ctm_id (OPTIONAL)

-- Instance table relationships
instructions_instance_ini.sti_id → steps_instance_sti.sti_id (REQUIRED)
instructions_instance_ini.inm_id → instructions_master_inm.inm_id (REQUIRED)
instructions_instance_ini.usr_id_completed_by → users_usr.usr_id (OPTIONAL)
```

### Data Integrity Rules

- Instructions must belong to a valid step (`stm_id` required)
- Instances must reference both step instance and master instruction
- Completion tracking requires timestamp consistency
- Order values should be unique within step scope

---

## 6. Data Types and Validation

### UUID Fields

- All primary keys use UUID with `gen_random_uuid()` default
- Consistent with UMIG UUID strategy for distributed systems

### Status Tracking

- **Simplified Model**: Single boolean `ini_is_completed`
- **Audit Fields**: Timestamp and user ID for completion tracking
- **No State Machine**: Unlike steps/phases, instructions use binary completion

### Text Content

- `inm_body`: Unlimited text for instruction details
- Should support markdown or rich text formatting in UI layer

### Duration Estimation

- `inm_duration_minutes`: Integer minutes for time planning
- Nullable to allow instructions without time estimates

---

## 7. Schema Integration Points

### Hierarchical Navigation

```groovy
// Typical query pattern: Step → Instructions
DatabaseUtil.withSql { sql ->
    return sql.rows("""
        SELECT inm.*, ini.ini_is_completed, ini.ini_completed_at
        FROM instructions_master_inm inm
        JOIN instructions_instance_ini ini ON inm.inm_id = ini.inm_id
        WHERE ini.sti_id = ?
        ORDER BY inm.inm_order
    """, [stepInstanceId])
}
```

### Team Assignment Integration

```groovy
// Instructions assigned to specific team
DatabaseUtil.withSql { sql ->
    return sql.rows("""
        SELECT inm.*, tms.tms_name, ini.ini_is_completed
        FROM instructions_master_inm inm
        LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id
        JOIN instructions_instance_ini ini ON inm.inm_id = ini.inm_id
        WHERE ini.sti_id = ? AND inm.tms_id = ?
        ORDER BY inm.inm_order
    """, [stepInstanceId, teamId])
}
```

### Control Point Integration

```groovy
// Instructions with control points
DatabaseUtil.withSql { sql ->
    return sql.rows("""
        SELECT inm.*, ctm.ctm_name, ctm.ctm_type
        FROM instructions_master_inm inm
        LEFT JOIN controls_master_ctm ctm ON inm.ctm_id = ctm.ctm_id
        WHERE inm.ctm_id IS NOT NULL
    """)
}
```

---

## 8. Query Patterns and Examples

### 8.1 Primary Read Patterns

**Get Instructions for Step Instance**:

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

### 8.2 Update Patterns

**Mark Instruction Complete**:

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

### 8.3 Reporting Patterns

**Step Completion Progress**:

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

---

## 9. Maintenance Considerations

### 9.1 Data Cleanup Patterns

```groovy
// Clean up orphaned instances (should not occur with proper FK constraints)
def cleanupOrphanedInstructions() {
    return DatabaseUtil.withSql { sql ->
        sql.execute("""
            DELETE FROM instructions_instance_ini
            WHERE inm_id NOT IN (SELECT inm_id FROM instructions_master_inm)
        """)
    }
}
```

### 9.2 Performance Monitoring

- Monitor query performance on hierarchical lookups
- Track completion update frequency during active migrations
- Analyze team assignment query patterns

### 9.3 Data Integrity Checks

```sql
-- Verify all instances have master references
SELECT COUNT(*) FROM instructions_instance_ini ini
LEFT JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
WHERE inm.inm_id IS NULL;

-- Check completion consistency
SELECT COUNT(*) FROM instructions_instance_ini
WHERE ini_is_completed = true AND ini_completed_at IS NULL;
```

---

## 10. Schema Validation Checklist

### ✅ Production Readiness Verification

**Table Structure**:

- [x] `instructions_master_inm` table exists with all required fields
- [x] `instructions_instance_ini` table exists with all required fields
- [x] All foreign key constraints properly defined
- [x] Primary keys use UUID with proper defaults

**Data Integrity**:

- [x] Foreign key relationships enforce referential integrity
- [x] NOT NULL constraints on required fields
- [x] Default values appropriate for boolean and timestamp fields

**Indexing Strategy**:

- [ ] Primary query indexes implemented (recommendation only)
- [ ] Team assignment indexes for performance
- [ ] Completion tracking indexes for reporting

**Integration Points**:

- [x] Proper integration with steps hierarchy
- [x] Team assignment integration available
- [x] Control point integration supported
- [x] User tracking for audit trail

### 🎯 Implementation Notes

**API Development**: The existing schema fully supports the Instructions API requirements defined in US-004. No database changes are needed - proceed directly with API implementation following established patterns from StepsApi.groovy.

**Query Patterns**: All standard UMIG query patterns (hierarchical filtering, team assignment, completion tracking) are supported by the existing schema structure.

**Performance**: The schema is designed for the expected instruction volume (~14,430 records) with appropriate indexing recommendations provided above.

---

**Document Status**: ✅ COMPLETE - Schema is production-ready  
**Next Steps**: Implement Instructions API using existing schema  
**No Database Changes Required**: Proceed with API development
