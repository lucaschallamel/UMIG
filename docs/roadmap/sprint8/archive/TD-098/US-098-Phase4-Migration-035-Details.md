# US-098 Phase 4: Migration 035 Technical Details

**Date**: 2025-10-06
**Migration ID**: 035_us098_phase4_batch1_revised
**Configurations**: 27 (non-credential only)
**Environments**: DEV (7), UAT (10), PROD (10)
**Status**: ✅ FINALIZED - Ready for Execution

---

## Executive Summary

Migration 035 implements the final Phase 4 configuration structure with **zero credential storage** through Confluence MailServerManager API delegation. The migration creates 27 application behavior configurations across three environments (DEV/UAT/PROD), with intelligent environment-specific value assignment.

**Key Achievement**: Complete elimination of SMTP infrastructure and credential configurations through platform delegation.

---

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Configuration Breakdown](#configuration-breakdown)
3. [Environment Strategy](#environment-strategy)
4. [Technical Implementation](#technical-implementation)
5. [Validation Queries](#validation-queries)
6. [Execution Checklist](#execution-checklist)
7. [Troubleshooting Guide](#troubleshooting-guide)

---

## Migration Overview

### File Information

**File**: `local-dev-setup/liquibase/changelogs/035_us098_phase4_batch1_revised.sql`

**Changeset Metadata**:

```xml
<changeSet id="035_us098_phase4_batch1_revised" author="us-098-phase4">
  - Migration of application behavior configurations
  - Zero credential storage (Confluence MailServerManager integration)
  - Three-environment support (DEV/UAT/PROD)
  - StepView config split (DEV from 022, UAT/PROD from 035)
</changeSet>
```

### Architecture Principles

1. **Zero Credential Storage**: No SMTP credentials or infrastructure (host/port) in database
2. **Platform Delegation**: Confluence MailServerManager manages SMTP connections
3. **Application Overrides**: ConfigurationService provides behavior customization only
4. **Environment Parity**: Consistent configuration keys across all environments

### Scope Boundaries

**INCLUDED**:

- SMTP application behavior (auth/TLS flags, timeouts)
- API URLs (Confluence base URL per environment)
- Business logic (batch sizes, pagination)
- Feature flags (email notifications, monitoring)
- StepView macro location (UAT/PROD only)

**EXCLUDED** (managed by Confluence):

- SMTP host/port (infrastructure)
- SMTP username/password (credentials)
- TLS certificates
- Connection pooling settings

---

## Configuration Breakdown

### Category 1: SMTP Application Behavior (4 configs)

**Purpose**: Override Confluence SMTP settings for application-specific requirements

| Config Key                         | Type    | Classification | DEV Value | UAT Value | PROD Value |
| ---------------------------------- | ------- | -------------- | --------- | --------- | ---------- |
| `email.smtp.auth.enabled`          | BOOLEAN | general        | `false`   | `true`    | `true`     |
| `email.smtp.starttls.enabled`      | BOOLEAN | general        | `false`   | `true`    | `true`     |
| `email.smtp.connection.timeout.ms` | INTEGER | performance    | `5000`    | `10000`   | `15000`    |
| `email.smtp.timeout.ms`            | INTEGER | performance    | `5000`    | `20000`   | `30000`    |

**Rationale**:

- **Auth/TLS Flags**: DEV uses MailHog (no auth/TLS), UAT/PROD use corporate SMTP (auth/TLS required)
- **Timeouts**: Progressive increase from DEV (5s) → UAT (10-20s) → PROD (15-30s) for stability

**Environment Count**: DEV (2), UAT (2), PROD (2) = **6 configs**

**Note**: Only auth/TLS flags differ by environment; timeouts are environment-appropriate

### Category 2: API URLs (3 configs)

**Purpose**: Environment-specific Confluence API endpoint configuration

| Config Key            | Type   | Classification | DEV Value               | UAT Value                            | PROD Value                       |
| --------------------- | ------ | -------------- | ----------------------- | ------------------------------------ | -------------------------------- |
| `confluence.base.url` | STRING | infrastructure | `http://localhost:8090` | `https://confluence-evx.corp.ubp.ch` | `https://confluence.corp.ubp.ch` |

**Rationale**:

- **DEV**: Local Podman container (umig_confluence)
- **UAT**: Pre-production Confluence instance
- **PROD**: Production Confluence instance

**Environment Count**: DEV (1), UAT (1), PROD (1) = **3 configs**

**Security Note**: URLs classified as 'infrastructure' for partial masking in audit logs

### Category 3: Timeouts (Additional - 2 configs)

**Purpose**: Non-SMTP timeout configurations

| Config Key       | Type    | Classification | DEV Value | UAT Value | PROD Value |
| ---------------- | ------- | -------------- | --------- | --------- | ---------- |
| `api.timeout.ms` | INTEGER | performance    | `10000`   | `20000`   | `30000`    |

**Note**: Only `email.smtp.*` timeouts listed in Category 1; this is general API timeout

**Environment Count**: DEV (1), UAT (1), PROD (1) = **3 configs** (if exists)

### Category 4: Batch Sizes (6 configs)

**Purpose**: Environment-specific resource and performance tuning

| Config Key                    | Type    | Classification | DEV Value | UAT Value | PROD Value |
| ----------------------------- | ------- | -------------- | --------- | --------- | ---------- |
| `import.batch.max.size`       | INTEGER | performance    | `1000`    | `3000`    | `5000`     |
| `api.pagination.default.size` | INTEGER | performance    | `50`      | `75`      | `100`      |

**Rationale**:

- **Import Batch**: DEV (1K), UAT (3K), PROD (5K) for progressive load testing
- **Pagination**: DEV (50), UAT (75), PROD (100) for optimal user experience

**Environment Count**: DEV (2), UAT (2), PROD (2) = **6 configs**

### Category 5: Feature Flags (6 configs)

**Purpose**: Environment-specific feature enablement

| Config Key                              | Type    | Classification | DEV Value | UAT Value | PROD Value |
| --------------------------------------- | ------- | -------------- | --------- | --------- | ---------- |
| `import.email.notifications.enabled`    | BOOLEAN | general        | `false`   | `true`    | `true`     |
| `import.monitoring.performance.enabled` | BOOLEAN | general        | `true`    | `true`    | `true`     |

**Rationale**:

- **Email Notifications**: Disabled in DEV (MailHog testing only), enabled in UAT/PROD
- **Performance Monitoring**: Enabled in all environments for observability

**Environment Count**: DEV (2), UAT (2), PROD (2) = **6 configs**

### Category 6: StepView Macro Location (2 configs)

**Purpose**: Confluence macro integration for step view rendering

| Config Key                 | Type   | Classification | UAT Value | PROD Value |
| -------------------------- | ------ | -------------- | --------- | ---------- |
| `stepview.macro.space.key` | STRING | general        | `UMIGUAT` | `UMIG`     |

**Rationale**:

- **DEV**: Already configured in migration 022 (no new config needed)
- **UAT**: New configuration for UAT Confluence space
- **PROD**: New configuration for PROD Confluence space

**Environment Count**: UAT (1), PROD (1) = **2 configs**

**Critical Note**: DEV stepview config exists from migration 022; do NOT create duplicate

---

## Configuration Summary Table

| Category                  | Config Keys                                                                   | Env Count        | Total Configs            |
| ------------------------- | ----------------------------------------------------------------------------- | ---------------- | ------------------------ |
| SMTP Application Behavior | `email.smtp.auth.enabled`, `email.smtp.starttls.enabled`                      | DEV/UAT/PROD     | 6                        |
| SMTP Timeouts             | `email.smtp.connection.timeout.ms`, `email.smtp.timeout.ms`                   | DEV/UAT/PROD     | 6 (included in behavior) |
| API URLs                  | `confluence.base.url`                                                         | DEV/UAT/PROD     | 3                        |
| Batch Sizes               | `import.batch.max.size`, `api.pagination.default.size`                        | DEV/UAT/PROD     | 6                        |
| Feature Flags             | `import.email.notifications.enabled`, `import.monitoring.performance.enabled` | DEV/UAT/PROD     | 6                        |
| StepView Macro            | `stepview.macro.space.key`                                                    | UAT/PROD only    | 2                        |
| **Total**                 | **9 unique keys**                                                             | **27 instances** | **27**                   |

**Note**: SMTP behavior configs (auth/TLS + timeouts) counted separately for clarity but part of same category

---

## Environment Strategy

### Environment IDs

**Database Environment Table** (`environment_env`):

| env_id | env_name | env_description                     |
| ------ | -------- | ----------------------------------- |
| 1      | DEV      | Development environment (localhost) |
| 2      | PROD     | Production environment              |
| 3      | UAT      | User Acceptance Testing environment |

**Migration Foreign Keys**: All configurations reference `env_id` (1=DEV, 2=PROD, 3=UAT)

### DEV Environment (env_id=1)

**Characteristics**:

- **Confluence URL**: `http://localhost:8090` (Podman container)
- **SMTP**: MailHog (umig_mailhog:1025)
- **Auth**: Disabled (false)
- **TLS**: Disabled (false)
- **Timeouts**: Short (5s connection, 5s operation)
- **Batch Sizes**: Small (1K import, 50 pagination)
- **Feature Flags**: Email notifications disabled, monitoring enabled

**Configuration Count**: 7 (excludes stepview - already in migration 022)

**StepView Special Case**: DEV already has `stepview.macro.space.key` from migration 022; do NOT create duplicate

### UAT Environment (env_id=3)

**Characteristics**:

- **Confluence URL**: `https://confluence-evx.corp.ubp.ch`
- **SMTP**: Confluence MailServerManager API (corporate SMTP)
- **Auth**: Enabled (true)
- **TLS**: Enabled (true)
- **Timeouts**: Medium (10s connection, 20s operation)
- **Batch Sizes**: Medium (3K import, 75 pagination)
- **Feature Flags**: Email notifications enabled, monitoring enabled

**Configuration Count**: 10 (includes stepview)

**New Integration**: UAT environment first introduced in migration 035

### PROD Environment (env_id=2)

**Characteristics**:

- **Confluence URL**: `https://confluence.corp.ubp.ch`
- **SMTP**: Confluence MailServerManager API (corporate SMTP)
- **Auth**: Enabled (true)
- **TLS**: Enabled (true)
- **Timeouts**: Long (15s connection, 30s operation)
- **Batch Sizes**: Large (5K import, 100 pagination)
- **Feature Flags**: Email notifications enabled, monitoring enabled

**Configuration Count**: 10 (includes stepview)

---

## Technical Implementation

### Migration File Structure

```sql
-- Migration: 035_us098_phase4_batch1_revised.sql
-- Liquibase Changeset: id="035_us098_phase4_batch1_revised" author="us-098-phase4"

-- PART 1: SMTP Application Behavior (6 configs)
-- DEV configs (auth=false, TLS=false, timeout=5s)
-- UAT configs (auth=true, TLS=true, timeout=10-20s)
-- PROD configs (auth=true, TLS=true, timeout=15-30s)

-- PART 2: API URLs (3 configs)
-- DEV: localhost:8090
-- UAT: confluence-evx.corp.ubp.ch
-- PROD: confluence.corp.ubp.ch

-- PART 3: Batch Sizes (6 configs)
-- DEV: 1000 import, 50 pagination
-- UAT: 3000 import, 75 pagination
-- PROD: 5000 import, 100 pagination

-- PART 4: Feature Flags (6 configs)
-- DEV: email disabled, monitoring enabled
-- UAT: email enabled, monitoring enabled
-- PROD: email enabled, monitoring enabled

-- PART 5: StepView Macro (2 configs)
-- UAT: UMIGUAT space
-- PROD: UMIG space
-- (DEV already has config from migration 022)

-- PART 6: Verification Queries
-- Count by category, count by environment, security check
```

### INSERT Statement Pattern

```sql
INSERT INTO system_configuration_scf (
    scf_key,
    scf_value,
    scf_description,
    scf_category,
    env_id,
    scf_is_active,
    created_by,
    created_date
) VALUES (
    'email.smtp.auth.enabled',              -- Config key
    'false',                                  -- Value (DEV: false, UAT/PROD: true)
    'Enable SMTP authentication',           -- Description
    'general',                                -- Category
    1,                                        -- Environment ID (1=DEV, 2=PROD, 3=UAT)
    true,                                     -- Active flag
    'US-098-migration-035',                  -- Migration identifier
    CURRENT_TIMESTAMP                        -- Creation timestamp
);
```

### Fixed Issues

#### Issue #1: Duplicate Key Constraint Violation

**Problem**: Original migration attempted to create stepview config for DEV, but migration 022 already created it

**Error**:

```
ERROR: duplicate key value violates unique constraint "uq_system_configuration_key_env"
DETAIL: Key (scf_key, env_id)=(stepview.macro.space.key, 1) already exists.
```

**Root Cause**: Migration 022 (earlier work) created stepview config for DEV environment

**Solution**: Exclude stepview config for DEV from migration 035 (only create for UAT/PROD)

**Verification Query**:

```sql
SELECT scf_key, e.env_name, created_by, created_date
FROM system_configuration_scf scf
JOIN environment_env e ON scf.env_id = e.env_id
WHERE scf_key = 'stepview.macro.space.key'
ORDER BY e.env_name;
```

**Expected Result**:

```
     scf_key            | env_name | created_by           | created_date
------------------------+----------+----------------------+-------------------
 stepview.macro.space.key | DEV    | US-098-migration-022 | 2025-09-28 10:15:00
 stepview.macro.space.key | UAT    | US-098-migration-035 | 2025-10-06 14:30:00
 stepview.macro.space.key | PROD   | US-098-migration-035 | 2025-10-06 14:30:00
```

---

## Validation Queries

### Query 1: Count by Category

**Purpose**: Verify configuration distribution across categories

**Expected Results**:

- `infrastructure`: 3 configs (API URLs)
- `performance`: 12 configs (timeouts + batch sizes)
- `general`: 12 configs (auth/TLS flags + feature flags + stepview)

**SQL**:

```sql
SELECT
    scf_category,
    COUNT(*) AS config_count,
    COUNT(DISTINCT scf_key) AS unique_keys
FROM system_configuration_scf
WHERE created_by = 'US-098-migration-035'
GROUP BY scf_category
ORDER BY scf_category;
```

**Expected Output**:

```
  scf_category  | config_count | unique_keys
----------------+--------------+-------------
 general        |           12 |           5
 infrastructure |            3 |           1
 performance    |           12 |           4
```

### Query 2: Count by Environment

**Purpose**: Verify configuration distribution across environments

**Expected Results**:

- `DEV`: 7 configs
- `UAT`: 10 configs
- `PROD`: 10 configs

**SQL**:

```sql
SELECT
    e.env_name,
    COUNT(*) AS config_count
FROM system_configuration_scf scf
JOIN environment_env e ON scf.env_id = e.env_id
WHERE scf.created_by = 'US-098-migration-035'
GROUP BY e.env_name
ORDER BY e.env_name;
```

**Expected Output**:

```
 env_name | config_count
----------+--------------
 DEV      |            7
 PROD     |           10
 UAT      |           10
```

### Query 3: Security Check - No Credentials

**Purpose**: Verify zero credential storage (no 'security' category configs)

**Expected Results**: 0 rows (no credentials in this migration)

**SQL**:

```sql
SELECT
    scf_key,
    scf_category,
    '❌ UNEXPECTED CREDENTIAL CONFIG' AS issue
FROM system_configuration_scf
WHERE created_by = 'US-098-migration-035'
  AND scf_category = 'security';
```

**Expected Output**: Empty result set (0 rows)

### Query 4: StepView Config Verification

**Purpose**: Verify DEV stepview from migration 022, UAT/PROD from migration 035

**SQL**:

```sql
SELECT
    e.env_name,
    scf.scf_value AS space_key,
    scf.created_by,
    scf.created_date
FROM system_configuration_scf scf
JOIN environment_env e ON scf.env_id = e.env_id
WHERE scf.scf_key = 'stepview.macro.space.key'
ORDER BY e.env_name;
```

**Expected Output**:

```
 env_name | space_key | created_by           | created_date
----------+-----------+----------------------+-------------------
 DEV      | UMIGDEV   | US-098-migration-022 | 2025-09-28 (earlier)
 PROD     | UMIG      | US-098-migration-035 | 2025-10-06 (today)
 UAT      | UMIGUAT   | US-098-migration-035 | 2025-10-06 (today)
```

### Query 5: Overall Health Check

**Purpose**: Comprehensive validation of migration success

**Expected Results**: `✅ ALL CHECKS PASSED`

**SQL**:

```sql
SELECT
    COUNT(*) AS total_configs,
    SUM(CASE WHEN scf_category = 'infrastructure' THEN 1 ELSE 0 END) AS infrastructure_count,
    SUM(CASE WHEN scf_category = 'performance' THEN 1 ELSE 0 END) AS performance_count,
    SUM(CASE WHEN scf_category = 'general' THEN 1 ELSE 0 END) AS general_count,
    CASE
        WHEN COUNT(*) = 27
         AND SUM(CASE WHEN scf_category = 'infrastructure' THEN 1 ELSE 0 END) = 3
         AND SUM(CASE WHEN scf_category = 'performance' THEN 1 ELSE 0 END) = 12
         AND SUM(CASE WHEN scf_category = 'general' THEN 1 ELSE 0 END) = 12
        THEN '✅ ALL CHECKS PASSED'
        ELSE '❌ VERIFICATION FAILED'
    END AS overall_status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration-035';
```

**Expected Output**:

```
 total_configs | infrastructure_count | performance_count | general_count | overall_status
---------------+----------------------+-------------------+---------------+----------------------
            27 |                    3 |                12 |            12 | ✅ ALL CHECKS PASSED
```

---

## Execution Checklist

### Pre-Execution

- [ ] Phase 3 complete (ConfigurationService production-ready)
- [ ] Database connectivity verified
- [ ] Liquibase up to date (`npm run liquibase:update --dry-run`)
- [ ] Team notified of migration schedule
- [ ] Backup created (if production environment)

### Execution Steps

1. **Navigate to Project Root**:

```bash
cd /Users/lucaschallamel/Documents/GitHub/UMIG
```

2. **Execute Liquibase Migration**:

```bash
cd local-dev-setup
npm run liquibase:update
```

3. **Verify Changeset Application**:

```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT * FROM DATABASECHANGELOG
  WHERE ID = '035_us098_phase4_batch1_revised';
"
```

4. **Run Validation Queries** (all 5 queries above)

5. **Verify Overall Health Check** (Query 5 must show `✅ ALL CHECKS PASSED`)

### Post-Execution

- [ ] All validation queries pass
- [ ] Overall health check: `✅ ALL CHECKS PASSED`
- [ ] No credential configs in database (Query 3 returns 0 rows)
- [ ] StepView configs correct (DEV from 022, UAT/PROD from 035)
- [ ] ConfigurationService API retrieval working
- [ ] Document migration execution results

---

## Troubleshooting Guide

### Issue: Migration Fails with Duplicate Key Error

**Symptom**: `ERROR: duplicate key value violates unique constraint "uq_system_configuration_key_env"`

**Cause**: Attempting to create config that already exists (e.g., stepview for DEV)

**Solution**:

1. Identify conflicting config key and environment
2. Check if config already exists from earlier migration
3. Update migration 035 to exclude duplicate config
4. Re-run migration

**Prevention**: Always check existing configs before migration execution

### Issue: Wrong Environment Count

**Symptom**: Query 2 shows incorrect counts (e.g., DEV=10 instead of 7)

**Cause**: Stepview config duplicated for DEV (should only be from migration 022)

**Solution**:

```sql
-- Remove duplicate stepview config for DEV
DELETE FROM system_configuration_scf
WHERE created_by = 'US-098-migration-035'
  AND scf_key = 'stepview.macro.space.key'
  AND env_id = 1;  -- DEV environment
```

**Verification**:

```sql
-- Should show only 7 configs for DEV
SELECT COUNT(*) FROM system_configuration_scf
WHERE created_by = 'US-098-migration-035' AND env_id = 1;
```

### Issue: Unexpected Credential Configs

**Symptom**: Query 3 returns rows (should be empty)

**Cause**: Wrong category assignment or leftover from Batch 2 approach

**Solution**:

1. Identify credential configs
2. Verify they should NOT exist (MailServerManager architecture)
3. Delete if incorrect:

```sql
DELETE FROM system_configuration_scf
WHERE created_by = 'US-098-migration-035'
  AND scf_category = 'security';
```

**Prevention**: Migration 035 should have ZERO security category configs

### Issue: Migration Rollback Needed

**Symptom**: Critical error requires complete rollback

**Solution**:

```sql
-- Complete rollback of migration 035
DELETE FROM system_configuration_scf
WHERE created_by = 'US-098-migration-035';

-- Verify rollback
SELECT COUNT(*) AS remaining_configs
FROM system_configuration_scf
WHERE created_by = 'US-098-migration-035';
-- Expected: 0
```

**Re-execution**: Fix migration file, then re-run `npm run liquibase:update`

---

## Related Documentation

| Document                   | Location                                                | Purpose                          |
| -------------------------- | ------------------------------------------------------- | -------------------------------- |
| Phase 4 Completion Summary | `/claudedocs/US-098-Phase4-Completion-Summary.md`       | Overall phase status             |
| SMTP Integration Guide     | `/docs/technical/Confluence-SMTP-Integration-Guide.md`  | MailServerManager implementation |
| Security Risk Assessment   | `/claudedocs/US-098-Phase4-Security-Risk-Assessment.md` | Risk analysis                    |
| Remaining Work Plan        | `/claudedocs/US-098-Phase5-Remaining-Work-Plan.md`      | Next steps                       |
| ADR-067                    | `/docs/architecture/adr/067-*.md`                       | Configuration architecture       |

---

**Document Created**: 2025-10-06
**Author**: gendev-documentation-generator
**Status**: ✅ FINALIZED
**Next Review**: After migration 035 execution
**Migration File**: `local-dev-setup/liquibase/changelogs/035_us098_phase4_batch1_revised.sql`
