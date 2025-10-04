# US-098 Phase 4 Step 2: Migration Execution Plan - REVISED

**Date**: 2025-10-02
**Status**: REVISED - Architecture Pivot Approved
**Branch**: `feature/sprint8-us-098-configuration-management-system`
**Batches**: 2 (Batch 1: Non-Credentials, Batch 2: Credentials)
**Risk Acceptance**: Plain text credential storage approved (see Risk Assessment)

---

## Table of Contents

1. [Architecture Pivot Summary](#architecture-pivot-summary)
2. [Revised Batch Definitions](#revised-batch-definitions)
3. [Batch 1 Execution Plan](#batch-1-execution-plan)
4. [Batch 2 Execution Plan](#batch-2-execution-plan)
5. [Validation Steps](#validation-steps)
6. [Rollback Procedures](#rollback-procedures)
7. [Post-Migration Activities](#post-migration-activities)

---

## Architecture Pivot Summary

### Critical Decision: Database Credentials Excluded

**User Decision**: Database credentials (UMIG_DB_PASSWORD, etc.) will **NOT** be migrated to ConfigurationService.

**Rationale**:
1. **Deployment Model Incompatibility**:
   - UAT/PROD environments use ScriptRunner's pre-configured resource pool
   - NO environment variables available in UAT/PROD
   - Database credentials set ONCE manually in ScriptRunner admin UI
   - Application must work autonomously after database setup

2. **Original Approach Was Wrong**:
   - Batch 1 attempt stored environment variable NAMES (e.g., 'UMIG_DB_PASSWORD')
   - This won't work in UAT/PROD where no environment variables exist
   - Fundamental misunderstanding of deployment architecture

3. **Correct Approach**:
   - DatabaseUtil.groovy keeps current environment variable pattern
   - DEV: Environment variables with fallback
   - UAT/PROD: ScriptRunner resource pool (no code changes needed)
   - ConfigurationService uses DatabaseUtil.withSql (no bootstrap paradox)

### Encryption Decision: Deferred to Sprint 9+

**User Decision**: Skip encryption implementation for Phase 4.

**Rationale**:
1. **Complexity**: pgcrypto extension + schema changes + key management = 30-40 hours
2. **Timeline**: Cannot afford extra complexity in Sprint 8
3. **Risk Acceptance**: Plain text storage acceptable with mitigations
4. **Upgrade Path**: Security category classification enables future encryption

### Revised Scope

| Batch | Scope | Config Count | Includes Credentials? |
|-------|-------|--------------|----------------------|
| **Batch 1** | Non-credential infrastructure, performance, features | 18 | ❌ NO |
| **Batch 2** | SMTP credentials, usernames (plain text) | 4 | ✅ YES (plain text) |
| **Database Credentials** | ❌ EXCLUDED - Managed by ScriptRunner | 0 | N/A |
| **Total** | 22 configurations | 22 | 4 credentials |

---

## Revised Batch Definitions

### Batch 1: Non-Credential Configurations (18 configs)

**File**: `local-dev-setup/liquibase/changelogs/035_us098_phase4_batch1_revised.sql`

**Categories**:
- SMTP Infrastructure (4): Host, port, auth enabled, STARTTLS enabled
- API URLs (2): Confluence base URL
- Timeouts (4): SMTP connection timeout, SMTP operation timeout
- Batch Sizes (4): Import max size, API pagination
- Feature Flags (4): Email notifications enabled, performance monitoring

**Security Classifications**:
- Infrastructure: 6 configs
- Performance: 8 configs
- General: 4 configs

**Environments**:
- DEV: 9 configs
- PROD: 9 configs
- Total: 18 configs

**Duration**: 30-45 minutes (simple migration)

---

### Batch 2: Credential Configurations (4 configs - PLAIN TEXT)

**File**: `local-dev-setup/liquibase/changelogs/036_us098_phase4_batch2_credentials_plaintext.sql`

**⚠️  SECURITY CLASSIFICATION**: ALL configs are category = 'security'

**Categories**:
- SMTP Credentials (2): Passwords (DEV, PROD)
- SMTP Usernames (2): Usernames (DEV, PROD)

**Security Classifications**:
- Security: 4 configs (all)

**Environments**:
- DEV: 2 configs (non-functional for MailHog)
- PROD: 2 configs (PLACEHOLDERS - must replace before deployment)
- Total: 4 configs

**Duration**: 20-30 minutes (includes security validation)

**CRITICAL NOTES**:
1. ⚠️  **Plain Text Storage**: Credentials stored in `scf_value` column unencrypted
2. ⚠️  **Placeholder Values**: PROD configs have `REPLACE_WITH_*` placeholders
3. ⚠️  **Pre-Deployment Required**: Real credentials must be set via UPDATE statements
4. ⚠️  **Risk Assessment**: See `claudedocs/US-098-Phase4-Security-Risk-Assessment.md`

---

## Batch 1 Execution Plan

### Prerequisites

- [x] Phase 3 complete (ConfigurationService production-ready)
- [x] Database connectivity verified
- [x] Liquibase up to date
- [ ] Team notified of migration schedule

### Step 1: Apply Liquibase Migration (10 minutes)

**Action**: Execute Batch 1 Liquibase changeset

**Commands**:
```bash
# From project root
cd local-dev-setup
npm run liquibase:update

# OR directly with Liquibase (if npm command unavailable)
liquibase --changeLogFile=liquibase/changelogs/changelog-master.xml update
```

**Expected Outcome**:
- Liquibase reports successful changeset application
- 18 INSERT statements executed (9 DEV + 9 PROD)
- No errors or warnings
- Changeset ID `035_us098_phase4_batch1_revised` recorded in DATABASECHANGELOG

**Verification Command**:
```sql
-- Via Podman container
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT * FROM DATABASECHANGELOG
  WHERE ID = '035_us098_phase4_batch1_revised';
"
```

### Step 2: Verify Configuration Data (15 minutes)

**Action**: Run verification queries embedded in migration file

**Critical Queries**:

1. **Count by Category** (Expected: infrastructure=6, performance=8, general=4):
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT
      scf_category,
      COUNT(*) AS config_count,
      COUNT(DISTINCT scf_key) AS unique_keys
  FROM system_configuration_scf
  WHERE created_by = 'US-098-migration'
  GROUP BY scf_category
  ORDER BY scf_category;
"
```

2. **Count by Environment** (Expected: DEV=9, PROD=9):
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT
      e.env_name,
      COUNT(*) AS config_count
  FROM system_configuration_scf scf
  JOIN environment_env e ON scf.env_id = e.env_id
  WHERE scf.created_by = 'US-098-migration'
  GROUP BY e.env_name
  ORDER BY e.env_name;
"
```

3. **Security Check - No Credentials** (Expected: 0 rows):
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT
      scf_key,
      scf_category,
      '❌ UNEXPECTED CREDENTIAL CONFIG' AS issue
  FROM system_configuration_scf
  WHERE created_by = 'US-098-migration'
    AND scf_category = 'security';
"
```

4. **Overall Health Check** (Expected: `✅ ALL CHECKS PASSED`):
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT
      COUNT(*) AS total_configs,
      SUM(CASE WHEN scf_category = 'infrastructure' THEN 1 ELSE 0 END) AS infrastructure_count,
      SUM(CASE WHEN scf_category = 'performance' THEN 1 ELSE 0 END) AS performance_count,
      SUM(CASE WHEN scf_category = 'general' THEN 1 ELSE 0 END) AS general_count,
      CASE
          WHEN COUNT(*) = 18
           AND SUM(CASE WHEN scf_category = 'infrastructure' THEN 1 ELSE 0 END) = 6
           AND SUM(CASE WHEN scf_category = 'performance' THEN 1 ELSE 0 END) = 8
           AND SUM(CASE WHEN scf_category = 'general' THEN 1 ELSE 0 END) = 4
          THEN '✅ ALL CHECKS PASSED'
          ELSE '❌ VERIFICATION FAILED'
      END AS overall_status
  FROM system_configuration_scf
  WHERE created_by = 'US-098-migration';
"
```

### Step 3: Functional Testing (Optional for Batch 1 - 10 minutes)

**Rationale**: Batch 1 configs not yet used by application code (migration first, code changes later)

**If testing desired**:
- Verify ConfigurationService.getString('email.smtp.host') returns correct values
- Test environment-aware retrieval
- Confirm no errors in application logs

---

## Batch 2 Execution Plan

### Prerequisites

- [x] Batch 1 completed successfully
- [ ] Security Risk Assessment reviewed and approved
- [ ] Team aware of plain text credential storage
- [ ] Pre-deployment checklist prepared

### Step 1: Apply Liquibase Migration (10 minutes)

**Action**: Execute Batch 2 Liquibase changeset

**Commands**:
```bash
# From project root
cd local-dev-setup
npm run liquibase:update
```

**Expected Outcome**:
- Liquibase reports successful changeset application
- 4 INSERT statements executed (2 DEV + 2 PROD)
- No errors or warnings
- Changeset ID `036_us098_phase4_batch2_credentials_plaintext` recorded

**Verification Command**:
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT * FROM DATABASECHANGELOG
  WHERE ID = '036_us098_phase4_batch2_credentials_plaintext';
"
```

### Step 2: Verify Credential Data (15 minutes)

**Action**: Run verification queries embedded in migration file

**Critical Queries**:

1. **Count by Category** (Expected: security=4):
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT
      scf_category,
      COUNT(*) AS config_count,
      COUNT(DISTINCT scf_key) AS unique_keys
  FROM system_configuration_scf
  WHERE created_by = 'US-098-migration'
    AND scf_key IN ('email.smtp.password', 'email.smtp.username')
  GROUP BY scf_category
  ORDER BY scf_category;
"
```

2. **Placeholder Credential Check** (Expected: 2 PROD placeholders):
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT
      e.env_name,
      scf.scf_key,
      scf.scf_value,
      CASE
          WHEN scf.scf_value LIKE '%REPLACE%' THEN '⚠️  PLACEHOLDER - MUST REPLACE'
          WHEN scf.scf_value LIKE '%not-required%' THEN '✅ DEV - No action needed'
          ELSE '✅ REAL VALUE'
      END AS credential_status
  FROM system_configuration_scf scf
  JOIN environment_env e ON scf.env_id = e.env_id
  WHERE scf.created_by = 'US-098-migration'
    AND scf.scf_key IN ('email.smtp.password', 'email.smtp.username')
  ORDER BY e.env_name, scf.scf_key;
"
```

3. **Audit Log Sanitization Test**:
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT
      e.env_name,
      scf.scf_key,
      scf.scf_category,
      CASE
          WHEN scf.scf_category = 'security' AND scf.scf_key LIKE '%password%'
              THEN '***REDACTED***'
          WHEN scf.scf_category = 'security'
              THEN CONCAT(LEFT(scf.scf_value, 3), REPEAT('*', LENGTH(scf.scf_value) - 6), RIGHT(scf.scf_value, 3))
          ELSE scf.scf_value
      END AS sanitized_value
  FROM system_configuration_scf scf
  JOIN environment_env e ON scf.env_id = e.env_id
  WHERE scf.created_by = 'US-098-migration'
    AND scf.scf_key IN ('email.smtp.password', 'email.smtp.username')
  ORDER BY e.env_name, scf.scf_key;
"
```

### Step 3: Security Validation (MANDATORY - 10 minutes)

**Action**: Verify security controls are working

**Checklist**:
- [ ] Passwords show as `***REDACTED***` in audit simulation
- [ ] Usernames show partial masking (e.g., `smt*****com`)
- [ ] Security category = 'security' for all credentials
- [ ] Placeholder values clearly marked for PROD
- [ ] No real credentials accidentally committed to git

---

## Validation Steps

### Post-Migration Validation (Both Batches)

1. **Database Integrity**:
   - Total configs: 22 (18 Batch 1 + 4 Batch 2)
   - All configs have `created_by = 'US-098-migration'`
   - All configs active (`scf_is_active = true`)

2. **Environment Distribution**:
   - DEV: 11 configs (9 Batch 1 + 2 Batch 2)
   - PROD: 11 configs (9 Batch 1 + 2 Batch 2)

3. **Category Distribution**:
   - infrastructure: 6 configs
   - performance: 8 configs
   - general: 4 configs
   - security: 4 configs

4. **Security Verification**:
   - No credentials in Batch 1 (category != 'security')
   - All credentials in Batch 2 (category = 'security')
   - Audit log sanitization working correctly

### Master Verification Query

```sql
-- Run this query to get complete migration status
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  WITH migration_summary AS (
    SELECT
      COUNT(*) AS total_configs,
      COUNT(DISTINCT scf_key) AS unique_keys,
      SUM(CASE WHEN e.env_name = 'DEV' THEN 1 ELSE 0 END) AS dev_count,
      SUM(CASE WHEN e.env_name = 'PROD' THEN 1 ELSE 0 END) AS prod_count,
      SUM(CASE WHEN scf.scf_category = 'infrastructure' THEN 1 ELSE 0 END) AS infrastructure_count,
      SUM(CASE WHEN scf.scf_category = 'performance' THEN 1 ELSE 0 END) AS performance_count,
      SUM(CASE WHEN scf.scf_category = 'general' THEN 1 ELSE 0 END) AS general_count,
      SUM(CASE WHEN scf.scf_category = 'security' THEN 1 ELSE 0 END) AS security_count,
      SUM(CASE WHEN scf.scf_value LIKE '%REPLACE%' THEN 1 ELSE 0 END) AS placeholder_count
    FROM system_configuration_scf scf
    JOIN environment_env e ON scf.env_id = e.env_id
    WHERE scf.created_by = 'US-098-migration'
  )
  SELECT
    total_configs,
    unique_keys,
    dev_count,
    prod_count,
    infrastructure_count,
    performance_count,
    general_count,
    security_count,
    placeholder_count,
    CASE
      WHEN total_configs = 22
       AND dev_count = 11
       AND prod_count = 11
       AND infrastructure_count = 6
       AND performance_count = 8
       AND general_count = 4
       AND security_count = 4
      THEN '✅ MIGRATION COMPLETE'
      ELSE '❌ VERIFICATION FAILED'
    END AS overall_status,
    CASE
      WHEN placeholder_count > 0
      THEN CONCAT('⚠️  ', placeholder_count, ' PLACEHOLDER(S) - REPLACE BEFORE PROD')
      ELSE '✅ ALL CREDENTIALS SET'
    END AS credential_status
  FROM migration_summary;
"
```

**Expected Output**:
```
 total_configs | unique_keys | dev_count | prod_count | infrastructure_count | performance_count | general_count | security_count | placeholder_count | overall_status        | credential_status
---------------+-------------+-----------+------------+----------------------+-------------------+---------------+----------------+-------------------+-----------------------+--------------------------------------------------
            22 |          11 |        11 |         11 |                    6 |                 8 |             4 |              4 |                 2 | ✅ MIGRATION COMPLETE | ⚠️  2 PLACEHOLDER(S) - REPLACE BEFORE PROD
```

---

## Rollback Procedures

### Rollback Batch 2 Only (Keep Batch 1)

**When**: If Batch 2 fails validation or security concerns raised

**Command**:
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  DELETE FROM system_configuration_scf
  WHERE created_by = 'US-098-migration'
    AND scf_key IN ('email.smtp.password', 'email.smtp.username');
"
```

**Verification**:
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT COUNT(*) AS remaining_configs
  FROM system_configuration_scf
  WHERE created_by = 'US-098-migration';
"
```

**Expected**: 18 configs (Batch 1 only)

---

### Rollback Both Batches (Complete Rollback)

**When**: If complete migration needs to be reverted

**Command**:
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  DELETE FROM system_configuration_scf
  WHERE created_by = 'US-098-migration';
"
```

**Verification**:
```sql
podman exec -it umig_postgres psql -U umig_app_user -d umig_app_db -c "
  SELECT COUNT(*) AS remaining_configs
  FROM system_configuration_scf
  WHERE created_by = 'US-098-migration';
"
```

**Expected**: 0 configs

---

## Post-Migration Activities

### Phase 4 Step 3: Code Migration (Future)

**Scope**: Update application code to use ConfigurationService instead of hardcoded values

**Files to Update** (Batch 1 configs):
1. `EnhancedEmailService.groovy` (lines 848-853): SMTP infrastructure
2. `AdminVersionApi.groovy` (line 930): Confluence base URL
3. `UrlConfigurationApi.groovy` (line 26): Confluence base URL
4. `ImportService.groovy` (line 25): Import batch size
5. `PlansApi.groovy` (lines 81, 249): API pagination
6. `ImportQueueConfiguration.groovy` (lines 251, 106): Feature flags

**Pattern**:
```groovy
// BEFORE
props.put("mail.smtp.host", "umig_mailhog")
props.put("mail.smtp.port", "1025")

// AFTER
props.put("mail.smtp.host", ConfigurationService.getString("email.smtp.host"))
props.put("mail.smtp.port", ConfigurationService.getString("email.smtp.port"))
```

**Files to Update** (Batch 2 configs - when code needs SMTP auth):
1. `EnhancedEmailService.groovy`: Add SMTP authentication logic (currently disabled)

**Estimated Effort**: 4-6 hours for code migration + testing

---

### Documentation Updates

- [x] Updated migration execution plan (this file)
- [x] Created security risk assessment
- [x] Created revised Batch 1 migration file
- [x] Created Batch 2 credential migration file
- [ ] Update US-098 completion report after all batches complete

---

## Summary of Changes from Original Plan

| Aspect | Original Plan | Revised Plan | Reason |
|--------|--------------|--------------|--------|
| **Database Credentials** | Store env var NAMES in ConfigService | ❌ EXCLUDED from ConfigService | Won't work in UAT/PROD (no env vars) |
| **Encryption** | Implement pgcrypto + encrypted columns | ⏭️  DEFERRED to Sprint 9+ | Timeline constraints (30-40 hours) |
| **Credential Storage** | Encrypted storage from start | ✅ Plain text with risk acceptance | Accepted risk with mitigations |
| **Batch 1 Scope** | 12 database credential configs | ✅ 18 non-credential configs | Revised to exclude all credentials |
| **Batch 2 Scope** | Not defined in original | ✅ 4 SMTP credential configs | New batch for plain text credentials |
| **Total Configs** | 156 identified in audit | ✅ 22 in Phase 4 (18 + 4) | Remaining 134 in future phases |
| **Completion Timeline** | 2-3 hours original Batch 1 | ✅ 1-1.5 hours both batches | Faster without encryption complexity |

---

**Document Status**: APPROVED - REVISED PLAN
**Approval Date**: 2025-10-02
**Approved By**: Lucas Challamel (Project Owner)
**Next Steps**: Execute Batch 1 migration when ready
**Version**: 2.0 (Revised after architecture pivot)

---

**End of Revised Migration Execution Plan**
