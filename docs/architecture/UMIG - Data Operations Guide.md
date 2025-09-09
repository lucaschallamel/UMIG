# UMIG Data Operations Guide

**Version:** 1.1  
**Date:** September 9, 2025  
**Purpose:** Operational procedures, troubleshooting, and performance optimization for UMIG database operations  
**Audience:** Database administrators, developers, operations teams

**Document Status**: ✅ Production Ready | **Extracted from**: UMIG_DB_Best_Practices.md v2.1  
**Scope**: Database operations, performance optimization, troubleshooting procedures, maintenance workflows

---

## Table of Contents

1. [Introduction and Scope](#1-introduction-and-scope)
2. [Query Patterns and Best Practices](#2-query-patterns-and-best-practices)
3. [Performance Optimization Strategies](#3-performance-optimization-strategies)
4. [Troubleshooting Procedures](#4-troubleshooting-procedures)
5. [Performance Diagnostics and Monitoring](#5-performance-diagnostics-and-monitoring)
6. [Operational Workflows](#6-operational-workflows)
7. [Emergency Procedures](#7-emergency-procedures)
8. [Cross-References](#8-cross-references)

---

## 1. Introduction and Scope

### 1.1. Document Purpose

This guide provides comprehensive operational procedures for managing the UMIG database in production environments. It focuses on:

- **Query Patterns**: Production-tested database access patterns
- **Performance Optimization**: Monitoring and tuning strategies
- **Troubleshooting**: Systematic problem resolution procedures
- **Maintenance**: Regular operational tasks and health checks
- **Emergency Response**: Critical incident resolution procedures

### 1.2. Prerequisites

**Required Knowledge**:

- UMIG data model understanding (canonical vs instance entities)
- PostgreSQL administration
- ScriptRunner/Groovy development patterns
- UMIG API architecture

**Required Access**:

- Database administrator privileges
- Application logs access
- Monitoring system access
- Production environment access (when applicable)

### 1.3. Operational Context

**Stack Configuration**:

- **Database**: PostgreSQL with Liquibase migrations
- **Application**: ScriptRunner/Groovy backend with RESTful APIs
- **Access Pattern**: DatabaseUtil.withSql standard pattern
- **Scale**: 5 migrations → 30 iterations → 5 plans → 13 sequences → 43 phases → 1,443+ step instances

---

## 2. Query Patterns and Best Practices

### 2.1. Instructions Query Patterns

#### Primary Read Pattern: Get Instructions for Step Instance

**Purpose**: Retrieve all instructions associated with a specific step instance with completion tracking

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

**Operational Notes**:

- **Index Dependency**: Requires `idx_ini_sti_id` for optimal performance
- **Joins**: LEFT JOINs handle optional team and control assignments
- **Ordering**: Uses `inm_order` from master table for consistent sequence

#### Completion Tracking Pattern

**Purpose**: Mark instruction as completed with audit trail

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

**Operational Notes**:

- **Timestamp**: Uses `NOW()` for server-side timestamp consistency
- **User Tracking**: Records who completed the instruction for audit purposes
- **Atomicity**: Single UPDATE operation ensures consistency

#### Progress Reporting Pattern

**Purpose**: Calculate completion percentage for dashboards and monitoring

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

**Operational Notes**:

- **Performance**: Single query aggregation avoids N+1 patterns
- **Precision**: ROUND to 2 decimal places for UI consistency
- **Null Handling**: COUNT with CASE WHEN handles boolean logic correctly

### 2.2. System Configuration Query Patterns

#### Environment-based Configuration Lookup

**Purpose**: Retrieve environment-specific configurations for macro and system settings

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

**Operational Notes**:

- **Environment Isolation**: Always filter by `env_id`
- **Active Status**: Only retrieve active configurations
- **Category Filtering**: Use categories for logical grouping

#### Configuration Update with History

**Purpose**: Update configuration values while maintaining complete audit trail

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

**Operational Notes**:

- **Transaction Safety**: Uses `DatabaseUtil.withSql` for automatic transaction handling
- **Audit Trail**: Captures old value, new value, reason, and user
- **Change Tracking**: Categorizes change type for reporting

### 2.4. US-034 Import Queue Operations

#### 2.4.1 Queue Monitoring

Monitor import queue status and performance:

```sql
-- Real-time queue status (51ms avg response)
SELECT iqm_status, COUNT(*) as queue_count,
       AVG(iqm_estimated_duration) as avg_duration
FROM stg_import_queue_management_iqm
WHERE iqm_is_active = true
GROUP BY iqm_status
ORDER BY iqm_priority DESC;
```

#### 2.4.2 Resource Management

Check resource lock status and conflicts:

```sql
-- Detect resource deadlocks
SELECT COUNT(*) as long_running_locks,
       irl_resource_identifier,
       irl_locked_at
FROM stg_import_resource_locks_irl
WHERE irl_is_active = true
  AND irl_locked_at < NOW() - INTERVAL '30 minutes'
GROUP BY irl_resource_identifier, irl_locked_at;
```

#### 2.4.3 Performance Baselines

- **Queue Operations**: 51ms average response (US-034 benchmark)
- **Resource Locks**: <30ms acquisition time
- **Schedule Execution**: <45ms tracking queries
- **Performance Monitoring**: <60ms aggregation queries

### 2.5. Type Safety and Filtering Patterns (ADR-031 Compliance)

#### Explicit Type Casting for Query Parameters

**Purpose**: Ensure type safety and prevent SQL injection

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

#### Hierarchical Filtering Best Practices

**Purpose**: Ensure correct step retrieval through proper ID filtering

```groovy
// CORRECT - filters by instance IDs
query += ' AND pli.pli_id = :planId'     // plan instance
query += ' AND sqi.sqi_id = :sequenceId' // sequence instance
query += ' AND phi.phi_id = :phaseId'    // phase instance

// INCORRECT - filters by master IDs (will miss steps)
query += ' AND plm.plm_id = :planId'     // plan master
```

**Operational Impact**:

- **Instance IDs**: Required for proper hierarchical navigation
- **Master IDs**: Only use for master entity operations
- **Data Integrity**: Prevents orphaned or missing records in results

#### Complete Field Selection

**Purpose**: Prevent "No such property" errors in result mapping

```groovy
// CORRECT - includes stm.stm_id for mapping
SELECT sti.sti_id, stm.stm_id, stm.stt_code, stm.stm_number, ...

// INCORRECT - missing stm.stm_id causes "No such property" error
SELECT sti.sti_id, stm.stt_code, stm.stm_number, ...
```

---

## 3. Performance Optimization Strategies

### 3.1. Essential Database Indexes

#### Instructions Performance Indexes

**Primary Query Patterns**:

```sql
-- Core instruction queries
CREATE INDEX idx_inm_stm_id_order ON instructions_master_inm(stm_id, inm_order);
CREATE INDEX idx_ini_sti_id ON instructions_instance_ini(sti_id);
CREATE INDEX idx_ini_completion ON instructions_instance_ini(ini_is_completed, ini_completed_at);

-- Team assignment queries
CREATE INDEX idx_inm_tms_id ON instructions_master_inm(tms_id) WHERE tms_id IS NOT NULL;

-- Control point queries
CREATE INDEX idx_inm_ctm_id ON instructions_master_inm(ctm_id) WHERE ctm_id IS NOT NULL;
```

**Usage Patterns**:

- **Composite Index**: `(stm_id, inm_order)` supports ORDER BY optimization
- **Partial Index**: Team and control indexes use WHERE clauses to reduce size
- **Completion Index**: Supports progress queries and filtering

#### System Configuration Indexes

**Environment and Category Queries**:

```sql
-- Primary configuration lookups
CREATE INDEX idx_scf_env_category ON system_configuration_scf(env_id, scf_category);
CREATE INDEX idx_scf_key_active ON system_configuration_scf(scf_key, scf_is_active);
CREATE INDEX idx_scf_category_active ON system_configuration_scf(scf_category, scf_is_active);

-- History queries
CREATE INDEX idx_sch_scf_id ON system_configuration_history_sch(scf_id);
```

#### Audit Fields Performance Indexes

**Audit Query Patterns**:

```sql
-- Master tables: Composite index on (created_by, created_at)
CREATE INDEX idx_audit_master_created ON instructions_master_inm(created_by, created_at);
CREATE INDEX idx_audit_instance_created ON instructions_instance_ini(created_by, created_at);

-- Frequently queried reference tables: Index on created_at
CREATE INDEX idx_scf_created_at ON system_configuration_scf(created_at);
```

### 3.2. Query Optimization Techniques

#### Avoiding N+1 Query Patterns

**Problem**: Multiple round trips for related data

**Detection**:

- Monitor database logs for repeated similar queries
- Profile API response times for endpoints returning lists

**Solutions**:

```groovy
// Use JOIN queries instead of separate lookups
def getStepsWithInstructionsOptimized(UUID phaseInstanceId) {
    return DatabaseUtil.withSql { sql ->
        sql.rows("""
            SELECT
                sti.sti_id,
                sti.sti_name,
                COUNT(ini.ini_id) as instruction_count,
                COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_count
            FROM steps_instance_sti sti
            LEFT JOIN instructions_instance_ini ini ON sti.sti_id = ini.sti_id
            WHERE sti.phi_id = ?
            GROUP BY sti.sti_id, sti.sti_name
            ORDER BY sti.sti_order
        """, [phaseInstanceId])
    }
}
```

#### Large Result Set Optimization

**Pagination Implementation**:

```groovy
def getPaginatedInstructions(UUID stepInstanceId, Integer limit = 20, Integer offset = 0) {
    return DatabaseUtil.withSql { sql ->
        sql.rows("""
            SELECT ini.ini_id, inm.inm_body, ini.ini_is_completed
            FROM instructions_instance_ini ini
            JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
            WHERE ini.sti_id = ?
            ORDER BY inm.inm_order
            LIMIT ? OFFSET ?
        """, [stepInstanceId, limit, offset])
    }
}
```

### 3.4. US-034 Performance Optimization

#### 3.4.1 Query Optimization Patterns

```groovy
// Optimized queue management queries (proven 51ms performance)
class ImportQueueOptimizedQueries {
    static List<Map> getQueueStatusOptimized() {
        return DatabaseUtil.withSql { sql ->
            sql.rows('''
                SELECT iqm_status, COUNT(*) as queue_count,
                       AVG(iqm_estimated_duration) as avg_duration,
                       MIN(iqm_requested_at) as oldest_request
                FROM stg_import_queue_management_iqm
                WHERE iqm_is_active = true
                GROUP BY iqm_status
                ORDER BY iqm_priority DESC, oldest_request ASC
            ''')
        }
    }
}
```

#### 3.4.2 Resource Utilization Thresholds

- **Memory**: 85% warning, 95% critical
- **CPU**: 80% warning, 90% critical
- **Concurrent Imports**: 3 active limit, 10 queue capacity
- **Database Connections**: 3 per import, 15 total pool

### 3.5. Performance Monitoring Queries

#### Configuration Query Performance Analysis

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

#### Query Pattern Analysis

```sql
-- Monitor configuration query patterns
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%system_configuration_scf%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 4. Troubleshooting Procedures

### 4.1. Configuration Management Issues

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

```sql
-- Activate disabled configuration
UPDATE system_configuration_scf
SET scf_is_active = true
WHERE scf_key = ? AND env_id = ?;

-- Verify environment exists
SELECT env_id, env_name FROM environments_env WHERE env_id = ?;
```

#### Configuration Validation Failures

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

### 4.2. Database Integrity Issues

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

### 4.3. Performance Troubleshooting

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

---

## 5. Performance Diagnostics and Monitoring

### 5.1. Health Monitoring Procedures

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

#### Regular Maintenance Tasks

**1. Configuration Cleanup**:

```sql
-- Find unused configurations (no access in 90 days)
SELECT scf_key, scf_category, created_at
FROM system_configuration_scf
WHERE scf_is_active = false
  AND updated_at < CURRENT_DATE - INTERVAL '90 days';
```

**2. History Table Pruning**:

```sql
-- Remove configuration history older than 1 year
DELETE FROM system_configuration_history_sch
WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
```

**3. Performance Monitoring**:

```sql
-- Monitor configuration query patterns
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%system_configuration_scf%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 5.2. Monitoring Alerts and Thresholds

#### Key Metrics to Monitor

**Performance Metrics**:

- Configuration lookup response times (< 50ms target)
- Query execution times for instruction retrieval
- Database connection pool utilization
- Index hit ratios

**Operational Metrics**:

- Failed validation attempts (should be minimal)
- Missing critical configurations (should be 0)
- Audit field compliance percentage
- Data integrity violation counts

#### Alert Thresholds

**Critical Alerts**:

- Configuration response time > 100ms
- More than 5 validation failures per minute
- Any missing MACRO_LOCATION configurations
- Database pool utilization > 80%

**Warning Alerts**:

- Configuration response time > 50ms
- More than 1 validation failure per minute
- Database pool utilization > 60%
- Query execution time > 1 second for instruction queries

### 5.3. Data Integrity Validation

#### Regular Health Checks

```sql
-- Comprehensive data integrity check
WITH integrity_checks AS (
    -- Check instance-master relationships
    SELECT 'Orphaned Instructions' as check_type, COUNT(*) as issue_count
    FROM instructions_instance_ini ini
    LEFT JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
    WHERE inm.inm_id IS NULL

    UNION ALL

    -- Check completion consistency
    SELECT 'Completion Inconsistencies', COUNT(*)
    FROM instructions_instance_ini
    WHERE ini_is_completed = true AND ini_completed_at IS NULL

    UNION ALL

    -- Validate configuration data types
    SELECT 'Invalid Configuration Types', COUNT(*)
    FROM system_configuration_scf
    WHERE scf_data_type = 'INTEGER' AND scf_value !~ '^[0-9]+$'
)
SELECT * FROM integrity_checks WHERE issue_count > 0;
```

---

## 6. Operational Workflows

### 6.1. Configuration Management Workflow

#### Standard Configuration Update Process

**Pre-Update Validation**:

1. Verify configuration key exists and is active
2. Validate new value against data type and pattern constraints
3. Test configuration change in development environment
4. Prepare rollback plan

**Update Execution**:

```groovy
def updateConfigurationWorkflow(UUID scfId, String newValue, String updatedBy, String changeReason) {
    return DatabaseUtil.withSql { sql ->
        // Step 1: Validate current state
        def currentConfig = sql.firstRow("""
            SELECT scf_value, scf_data_type, scf_validation_pattern, scf_is_active
            FROM system_configuration_scf WHERE scf_id = ?
        """, [scfId])

        if (!currentConfig || !currentConfig.scf_is_active) {
            throw new IllegalStateException("Configuration not found or inactive")
        }

        // Step 2: Validate new value
        if (!validateConfigurationValue(newValue, currentConfig.scf_data_type, currentConfig.scf_validation_pattern)) {
            throw new IllegalArgumentException("Value validation failed")
        }

        // Step 3: Execute update with history
        return updateConfigurationValue(scfId, newValue, updatedBy, changeReason)
    }
}
```

**Post-Update Verification**:

1. Confirm configuration change applied correctly
2. Test dependent application functionality
3. Monitor for any related errors or performance issues
4. Document change completion

### 6.2. Database Maintenance Workflow

#### Weekly Maintenance Schedule

**Monday: Performance Review**

```sql
-- Review slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries slower than 100ms
ORDER BY total_exec_time DESC
LIMIT 20;
```

**Wednesday: Data Integrity Check**

```sql
-- Run comprehensive integrity validation
SELECT 'Audit Check' as maintenance_type, NOW() as run_time;
-- Execute integrity_checks query from section 5.3
```

**Friday: Cleanup Operations**

```sql
-- Cleanup old history records
DELETE FROM system_configuration_history_sch
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

-- Update table statistics
ANALYZE system_configuration_scf;
ANALYZE instructions_instance_ini;
ANALYZE instructions_master_inm;
```

#### Monthly Maintenance Tasks

**Index Maintenance**:

```sql
-- Check index usage statistics
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_tup_read < 1000  -- Potentially unused indexes
ORDER BY idx_tup_read;

-- Rebuild fragmented indexes if needed
REINDEX INDEX CONCURRENTLY idx_ini_sti_id;
```

**Statistics Updates**:

```sql
-- Update table statistics for query planner
ANALYZE;

-- Check for tables needing statistics updates
SELECT schemaname, tablename, last_analyze
FROM pg_stat_user_tables
WHERE last_analyze < CURRENT_DATE - INTERVAL '7 days';
```

### 6.3. Backup and Recovery Workflow

#### Configuration Backup

**Pre-Change Backup**:

```sql
-- Create configuration snapshot before major changes
CREATE TABLE config_backup_YYYYMMDD AS
SELECT * FROM system_configuration_scf WHERE scf_is_active = true;

-- Create history snapshot
CREATE TABLE config_history_backup_YYYYMMDD AS
SELECT * FROM system_configuration_history_sch
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
```

**Recovery Procedures**:

```sql
-- Restore configuration from backup
INSERT INTO system_configuration_scf
SELECT * FROM config_backup_YYYYMMDD
WHERE scf_id NOT IN (SELECT scf_id FROM system_configuration_scf);
```

---

## 7. Emergency Procedures

### 7.1. Configuration Rollback Procedures

#### Immediate Rollback Process

**Identify Problematic Change**:

```sql
-- Find recent configuration changes
SELECT sch.scf_id, scf.scf_key, sch.sch_old_value, sch.sch_new_value,
       sch.created_at, sch.created_by, sch.sch_change_reason
FROM system_configuration_history_sch sch
JOIN system_configuration_scf scf ON sch.scf_id = scf.scf_id
WHERE sch.created_at >= CURRENT_TIMESTAMP - INTERVAL '4 hours'
ORDER BY sch.created_at DESC;
```

**Execute Rollback**:

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

-- Record rollback in history
INSERT INTO system_configuration_history_sch
(scf_id, sch_old_value, sch_new_value, sch_change_reason, sch_change_type, created_by)
SELECT ?, scf_value, (SELECT sch_old_value FROM previous_value),
       'Emergency rollback due to production issue', 'ROLLBACK', 'emergency_rollback'
FROM system_configuration_scf WHERE scf_id = ?;
```

### 7.2. Database Recovery Procedures

#### Data Corruption Recovery

**Assessment Phase**:

1. Identify affected tables via integrity checks
2. Estimate scope of data corruption
3. Determine if point-in-time recovery is needed

**Recovery Execution**:

```sql
-- Identify corrupted records
SELECT table_name, record_id, issue_type
FROM (
    SELECT 'instructions' as table_name, ini_id as record_id, 'missing_master' as issue_type
    FROM instructions_instance_ini ini
    LEFT JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
    WHERE inm.inm_id IS NULL

    UNION ALL

    SELECT 'steps', sti_id, 'missing_master'
    FROM steps_instance_sti sti
    LEFT JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
    WHERE stm.stm_id IS NULL
) corruption_check;
```

**Repair Operations**:

1. Restore from latest backup if corruption is extensive
2. For isolated issues, repair specific records manually
3. Re-establish foreign key constraints
4. Verify data integrity post-recovery

#### Reference Integrity Repair

**Systematic Repair Process**:

```sql
-- Step 1: Document all integrity violations
CREATE TEMP TABLE integrity_violations AS
SELECT 'instructions_orphaned' as violation_type, ini_id as record_id
FROM instructions_instance_ini ini
LEFT JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
WHERE inm.inm_id IS NULL;

-- Step 2: Attempt repair or cleanup
-- Either restore missing masters or remove orphaned instances
DELETE FROM instructions_instance_ini
WHERE ini_id IN (SELECT record_id FROM integrity_violations WHERE violation_type = 'instructions_orphaned');

-- Step 3: Re-establish constraints
ALTER TABLE instructions_instance_ini
ADD CONSTRAINT fk_ini_inm_id
FOREIGN KEY (inm_id) REFERENCES instructions_master_inm(inm_id);
```

### 7.3. Performance Emergency Response

#### Query Performance Crisis

**Immediate Assessment**:

```sql
-- Find currently running slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state = 'active';
```

**Emergency Response**:

1. **Kill Long-Running Queries** (if safe):

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid = ? AND state = 'active';
```

2. **Add Missing Indexes** (if identified):

```sql
-- Add emergency index concurrently
CREATE INDEX CONCURRENTLY idx_emergency_fix
ON instructions_instance_ini(sti_id, ini_is_completed);
```

3. **Implement Query Limits**:

```sql
-- Set statement timeout for problematic queries
SET statement_timeout = '30s';
```

---

## 8. Cross-References

### 8.1. Related UMIG Documentation

**Architecture Documentation**:

- [UMIG Data Model](../dataModel/UMIG_Data_Model.md) - Core schema specification
- [UMIG - TOGAF Phases A-D - Architecture Requirements Specification](./UMIG%20-%20TOGAF%20Phases%20A-D%20-%20Architecture%20Requirements%20Specification.md) - System architecture overview
- [UMIG - TOGAF Phase C - Data Architecture](./UMIG%20-%20TOGAF%20Phase%20C%20-%20Data%20Architecture.md) - Enhanced data architecture with validation evidence
- [Legacy Solution Architecture](./_archives/solution-architecture.md) - Archived architecture reference
- **Source**: UMIG_DB_Best_Practices.md v2.1 (consolidated into this guide)

**Architecture Decision Records**:

- [ADR-029: Full Attribute Instantiation](../adr/ADR-029-full-attribute-instantiation-instance-tables.md) - Instance table design rationale
- [ADR-031: Groovy Type Safety](../adr/ADR-031-groovy-type-safety-and-filtering-patterns.md) - Type safety patterns
- [ADR-022: User-Team N-N Relationship](../adr/ADR-022-user-team-nn-relationship.md) - Team membership model

### 8.2. API and Implementation References

**Repository Classes**:

- [SystemConfigurationRepository.groovy](../../src/groovy/umig/repository/SystemConfigurationRepository.groovy)
- [InstructionsRepository.groovy](../../src/groovy/umig/repository/InstructionsRepository.groovy)
- [StepsRepository.groovy](../../src/groovy/umig/repository/StepsRepository.groovy)

**API Endpoints**:

- [SystemConfigurationApi.groovy](../../src/groovy/umig/api/v2/SystemConfigurationApi.groovy)
- [InstructionsApi.groovy](../../src/groovy/umig/api/v2/InstructionsApi.groovy)
- [StepsApi.groovy](../../src/groovy/umig/api/v2/StepsApi.groovy)

**Testing Documentation**:

- [Quality Check Procedures](../testing/QUALITY_CHECK_PROCEDURES.md)
- [Integration Tests](../../src/groovy/umig/tests/integration/)
- [Unit Tests](../../src/groovy/umig/tests/unit/)

### 8.3. External References

**PostgreSQL Documentation**:

- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring.html)
- [Index Usage Patterns](https://www.postgresql.org/docs/current/indexes.html)

**ScriptRunner Documentation**:

- [Database Access Patterns](https://docs.atlassian.com/groovy/latest/html/gapi/)
- [Error Handling Best Practices](https://scriptrunner.adaptavist.com/latest/confluence/knowledge-base/)

### 8.4. Maintenance Schedules and Contacts

**Regular Maintenance**:

- **Daily**: Monitor alert thresholds and performance metrics
- **Weekly**: Execute maintenance queries and data integrity checks
- **Monthly**: Index maintenance, statistics updates, backup validation
- **Quarterly**: Complete performance review and optimization planning

**Escalation Contacts**:

- **Database Issues**: DBA team / System administrator
- **Application Issues**: Development team / ScriptRunner specialist
- **Performance Issues**: Performance engineering team
- **Security Issues**: Security team / Infrastructure team

---

**Document Maintenance**: This guide should be reviewed quarterly and updated whenever new operational patterns or procedures are implemented. All changes should be documented with version control and change rationale.

**Last Updated**: August 28, 2025 | **Version**: 1.0 | **Next Review**: November 2025
