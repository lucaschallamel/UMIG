# US-098 Phase 4 Step 2: Migration Execution Plan

**Date**: 2025-10-02
**Status**: Ready for Review
**Branch**: `feature/sprint8-us-098-configuration-management-system`
**Batch**: 1 of 4 (Critical Security)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Batch 1 Execution Plan](#batch-1-execution-plan)
4. [Validation Steps](#validation-steps)
5. [Rollback Procedures](#rollback-procedures)
6. [Post-Migration Activities](#post-migration-activities)
7. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### Batch 1: Critical Security Configuration Migration

**Objective**: Eliminate hardcoded database passwords ("123456") from 12+ source files by migrating database connection configurations to ConfigurationService.

**Scope**:
- 12 configuration values
- 4 configuration keys (6 total keys including test configs)
- 3 environments (DEV, UAT, PROD)
- 2 security classifications (CONFIDENTIAL, INTERNAL)

**Impact**:
- **Security**: Eliminates critical vulnerability of hardcoded passwords
- **Operations**: Enables environment-specific database connections
- **Compliance**: Meets security audit requirements

**Duration**: 2-3 hours estimated

**Risk Level**: HIGH (database access failure impacts entire application)

---

## Pre-Migration Checklist

### ✅ Phase 3 Prerequisites (COMPLETED)

- [x] ConfigurationService production-ready
- [x] All 62 tests passing (100% success rate)
- [x] Security classification implemented (ADR-058)
- [x] Audit logging operational
- [x] Environment-aware configuration retrieval working
- [x] CONFIDENTIAL value masking verified

### ✅ Phase 4 Step 1 Prerequisites (COMPLETED)

- [x] Configuration audit complete (156 configs identified)
- [x] Detailed audit report created
- [x] Migration batches defined
- [x] Security classifications assigned

### 🔲 Pre-Migration Validation (REQUIRED BEFORE EXECUTION)

#### Environment Verification

- [ ] **DEV Environment**:
  - [ ] Environment variable `UMIG_DB_PASSWORD` is set
  - [ ] Environment variable `UMIG_TEST_DB_PASSWORD` is set
  - [ ] Database connectivity verified: `jdbc:postgresql://localhost:5432/umig_app_db`
  - [ ] Test database connectivity verified
  - [ ] ConfigurationService functional in DEV

- [ ] **UAT Environment** (if available):
  - [ ] Environment variable `UMIG_UAT_DB_PASSWORD` is set
  - [ ] Database server reachable: `uat-db.example.com:5432`
  - [ ] Database name confirmed: `umig_uat_db`
  - [ ] Username confirmed: `umig_uat_user`
  - [ ] ConfigurationService deployed to UAT

- [ ] **PROD Environment** (if available):
  - [ ] Environment variable `UMIG_PROD_DB_PASSWORD` is set
  - [ ] Database server reachable: `prod-db.example.com:5432`
  - [ ] Database name confirmed: `umig_prod_db`
  - [ ] Username confirmed: `umig_prod_user`
  - [ ] ConfigurationService deployed to PROD

#### Database Verification

- [ ] Current database passwords are NOT "123456" in UAT/PROD
- [ ] Database passwords have been rotated (if repository was ever public)
- [ ] Liquibase migrations are up to date in all environments
- [ ] `system_configuration_scf` table exists and is functional

#### Backup Verification

- [ ] Recent database backup exists (< 24 hours old)
- [ ] Backup restoration procedure documented and tested
- [ ] Code repository has latest commit pushed to remote
- [ ] Emergency rollback plan reviewed and approved

#### Documentation Review

- [ ] Audit report reviewed: `claudedocs/US-098-Phase4-Step1-Configuration-Audit-DETAILED.md`
- [ ] Liquibase changeset reviewed: `db/migrations/sprint8/US-098-Phase4-configuration-data-seed.xml`
- [ ] Verification queries reviewed: `db/migrations/sprint8/US-098-Phase4-verification-queries.sql`
- [ ] Team notified of migration schedule

---

## Batch 1 Execution Plan

### Step 1: Apply Liquibase Changeset (5 minutes)

**Action**: Execute Liquibase migration to seed configuration data

**Commands**:
```bash
# From local-dev-setup/ directory
npm run liquibase:update

# OR directly with Liquibase
liquibase --changeLogFile=db/migrations/changelog-master.xml update
```

**Expected Outcome**:
- Liquibase reports successful changeset application
- 12 INSERT statements executed
- No errors or warnings
- Changeset ID `US-098-phase4-batch1-critical-security` recorded in DATABASECHANGELOG

**Verification Command**:
```sql
-- Verify changeset was applied
SELECT * FROM DATABASECHANGELOG
WHERE ID = 'US-098-phase4-batch1-critical-security';
```

**Failure Handling**:
- If Liquibase fails: Review error message, fix issue, retry
- If duplicate key errors: Check if changeset already applied
- If table not found: Verify schema is up to date

---

### Step 2: Verify Configuration Data (10 minutes)

**Action**: Run verification queries to confirm data integrity

**Location**: `db/migrations/sprint8/US-098-Phase4-verification-queries.sql`

**Critical Queries** (run in order):

1. **Quick Health Check**:
```sql
-- Query 12: Overall status check
SELECT
    COUNT(*) AS total_configs,
    SUM(CASE WHEN scf_security_classification = 'CONFIDENTIAL' THEN 1 ELSE 0 END) AS confidential_count,
    SUM(CASE WHEN scf_security_classification = 'INTERNAL' THEN 1 ELSE 0 END) AS internal_count,
    CASE
        WHEN COUNT(*) = 12
         AND SUM(CASE WHEN scf_security_classification = 'CONFIDENTIAL' THEN 1 ELSE 0 END) = 4
         AND SUM(CASE WHEN scf_security_classification = 'INTERNAL' THEN 1 ELSE 0 END) = 8
        THEN '✅ ALL CHECKS PASSED'
        ELSE '❌ VERIFICATION FAILED'
    END AS overall_status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration';
```

**Expected Result**: `✅ ALL CHECKS PASSED`

2. **Security Violation Check** (CRITICAL):
```sql
-- Query 5: Verify no actual passwords in database
SELECT
    scf_key,
    scf_value,
    scf_environment,
    '❌ CRITICAL SECURITY VIOLATION' AS issue
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
  AND scf_security_classification = 'CONFIDENTIAL'
  AND (
    scf_value ~ '^[0-9]{6,}$'
    OR scf_value ILIKE '%password%'
    OR LENGTH(scf_value) > 50
    OR scf_value NOT LIKE 'UMIG_%'
);
```

**Expected Result**: 0 rows (empty result set)

**If ANY rows returned**: STOP IMMEDIATELY and execute rollback

3. **Environment Distribution Check**:
```sql
-- Query 2: Count configurations per environment
SELECT
    scf_environment,
    COUNT(*) AS configuration_count,
    CASE scf_environment
        WHEN 'DEV'  THEN 6
        WHEN 'UAT'  THEN 3
        WHEN 'PROD' THEN 3
    END AS expected_count,
    CASE
        WHEN (scf_environment = 'DEV' AND COUNT(*) = 6)
          OR (scf_environment = 'UAT' AND COUNT(*) = 3)
          OR (scf_environment = 'PROD' AND COUNT(*) = 3)
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END AS status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
GROUP BY scf_environment
ORDER BY scf_environment;
```

**Expected Results**:
- DEV: 6 configurations ✅ PASS
- UAT: 3 configurations ✅ PASS
- PROD: 3 configurations ✅ PASS

**Failure Handling**:
- If verification fails: Do NOT proceed to code changes
- Review `claudedocs/US-098-Phase4-Step2-Migration-Execution-Plan.md` rollback section
- Execute rollback procedure
- Investigate root cause before retrying

---

### Step 3: Code Changes (NOT YET - AWAIT APPROVAL)

**⚠️ IMPORTANT**: Do NOT make code changes until:
1. Liquibase changeset successfully applied
2. All verification queries pass
3. User explicitly approves proceeding

**Planned Code Changes** (for future step):

#### File 1: `src/groovy/umig/utils/DatabaseUtil.groovy`

**Current Code** (lines 56-58):
```groovy
String url = System.getenv('UMIG_DB_URL') ?: 'jdbc:postgresql://localhost:5432/umig_app_db'
String user = System.getenv('UMIG_DB_USER') ?: 'umig_app_user'
String password = System.getenv('UMIG_DB_PASSWORD') ?: '123456'
```

**New Code** (proposed):
```groovy
// Phase 1: Try environment variables (backward compatibility)
String url = System.getenv('UMIG_DB_URL')
String user = System.getenv('UMIG_DB_USER')
String password = System.getenv('UMIG_DB_PASSWORD')

// Phase 2: If env vars not set, use ConfigurationService
if (!url) {
    url = ConfigurationService.getString('database.url')
}
if (!user) {
    user = ConfigurationService.getString('database.username')
}
if (!password) {
    String envVarName = ConfigurationService.getString('database.password.env.var')
    password = System.getenv(envVarName)
}

// Phase 3: Fail fast if still no credentials
if (!password) {
    throw new IllegalStateException(
        "Database password not configured. Set UMIG_DB_PASSWORD environment variable " +
        "or configure 'database.password.env.var' in ConfigurationService"
    )
}
```

**Rationale**:
- Maintains backward compatibility with environment variables
- Adds ConfigurationService as fallback
- Provides clear error message if neither configured
- Never stores actual password in ConfigurationService

#### File 2: `src/groovy/umig/tests/integration/TestDatabaseUtil.groovy`

**Current Code** (lines 20-22):
```groovy
String url = System.getenv('UMIG_TEST_DB_URL') ?: 'jdbc:postgresql://localhost:5432/umig_app_db'
String user = System.getenv('UMIG_TEST_DB_USER') ?: 'umig_app_user'
String password = System.getenv('UMIG_TEST_DB_PASSWORD') ?: '123456'
```

**New Code** (proposed):
```groovy
// Similar pattern to DatabaseUtil.groovy but using test.database.* keys
String url = System.getenv('UMIG_TEST_DB_URL')
String user = System.getenv('UMIG_TEST_DB_USER')
String password = System.getenv('UMIG_TEST_DB_PASSWORD')

if (!url) {
    url = ConfigurationService.getString('test.database.url')
}
if (!user) {
    user = ConfigurationService.getString('test.database.username')
}
if (!password) {
    String envVarName = ConfigurationService.getString('test.database.password.env.var')
    password = System.getenv(envVarName)
}

if (!password) {
    throw new IllegalStateException("Test database password not configured")
}
```

**Additional Files to Update** (9+ files total):
- `src/groovy/umig/utils/DatabaseQualityValidator.groovy`
- `src/groovy/umig/tests/integration/IntegrationTestBase.groovy`
- `src/groovy/umig/tests/performance/PerformanceTestUtil.groovy`
- `src/groovy/umig/tests/e2e/E2ETestConfiguration.groovy`
- Additional test utility files (as identified in audit)

---

## Validation Steps

### Post-Code-Change Validation (When Code Changes Made)

#### Unit Test Validation
```bash
# Run ConfigurationService tests
npm run test:groovy:unit

# Expected: All tests pass, including new configuration retrieval tests
```

#### Integration Test Validation
```bash
# Run integration tests with ConfigurationService
npm run test:groovy:integration

# Expected: All tests pass, database connections successful
```

#### Manual Validation

1. **Verify Database Connection**:
```groovy
// Test in Groovy console
def sql = DatabaseUtil.getSql()
def result = sql.firstRow("SELECT 1 AS test")
assert result.test == 1
println "✅ Database connection successful"
```

2. **Verify ConfigurationService Retrieval**:
```groovy
// Test configuration retrieval
def passwordEnvVar = ConfigurationService.getString('database.password.env.var')
println "Password env var: ${passwordEnvVar}"
assert passwordEnvVar == 'UMIG_DB_PASSWORD' || passwordEnvVar == 'UMIG_UAT_DB_PASSWORD' || passwordEnvVar == 'UMIG_PROD_DB_PASSWORD'
println "✅ ConfigurationService working"
```

3. **Verify Audit Logging**:
```sql
-- Check audit logs for configuration access
SELECT
    cal_action,
    cal_configuration_key,
    cal_security_classification,
    cal_accessed_at,
    cal_accessed_by
FROM configuration_audit_log_cal
WHERE cal_configuration_key IN (
    'database.password.env.var',
    'database.url',
    'database.username'
)
ORDER BY cal_accessed_at DESC
LIMIT 10;
```

**Expected**: Audit entries show configuration access with CONFIDENTIAL values masked

4. **Verify No Hardcoded Passwords Remain**:
```bash
# Search for hardcoded password patterns
grep -r "123456" src/groovy/umig/ --include="*.groovy"

# Expected: No matches (or only in comments/documentation)
```

---

## Rollback Procedures

### Rollback Trigger Conditions

Execute rollback immediately if:
- ❌ Security violation detected (actual passwords in database)
- ❌ Verification queries fail
- ❌ Database connection failures after code changes
- ❌ Test suite failures
- ❌ Application startup failures
- ❌ Critical errors in production

### Rollback Procedure: Database Only

**If code changes NOT yet made**, simple database rollback:

```bash
# Option 1: Liquibase rollback command
liquibase --changeLogFile=db/migrations/changelog-master.xml rollback US-098-phase4-batch1-critical-security

# Option 2: Manual SQL deletion
psql -U umig_app_user -d umig_app_db
```

```sql
-- Delete all Batch 1 configurations
DELETE FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
  AND scf_key IN (
    'database.password.env.var',
    'test.database.password.env.var',
    'database.url',
    'database.username',
    'test.database.url',
    'test.database.username'
);

-- Verify deletion
SELECT COUNT(*) FROM system_configuration_scf WHERE created_by = 'US-098-migration';
-- Expected: 0
```

### Rollback Procedure: Code + Database

**If code changes were made**, full rollback:

```bash
# 1. Revert code changes
git checkout src/groovy/umig/utils/DatabaseUtil.groovy
git checkout src/groovy/umig/tests/integration/TestDatabaseUtil.groovy
# ... revert all modified files

# 2. Verify code reverted
git status
# Expected: No modified files

# 3. Execute database rollback (see above)

# 4. Verify application functionality
npm run test:groovy:all
# Expected: All tests pass with environment variables

# 5. Document rollback
echo "Rollback executed at $(date)" >> claudedocs/US-098-rollback-log.txt
```

### Post-Rollback Validation

- [ ] Environment variables still working for database connection
- [ ] All tests passing
- [ ] Application starts successfully
- [ ] No ConfigurationService references in critical paths
- [ ] Audit log reviewed for any issues during rollback

---

## Post-Migration Activities

### Immediate Activities (Within 1 Hour)

- [ ] **Monitoring**: Check application logs for ConfigurationService errors
- [ ] **Validation**: Run smoke tests in all environments
- [ ] **Documentation**: Update migration status in this document
- [ ] **Communication**: Notify team of successful migration

### Short-Term Activities (Within 24 Hours)

- [ ] **Performance Monitoring**: Verify no performance degradation
- [ ] **Audit Review**: Review configuration audit logs for anomalies
- [ ] **Test Coverage**: Verify all test suites still passing
- [ ] **Documentation Update**: Update configuration reference documentation

### Medium-Term Activities (Within 1 Week)

- [ ] **Security Audit**: Confirm no hardcoded passwords remain in codebase
- [ ] **Password Rotation**: Rotate database passwords in UAT/PROD
- [ ] **Backup Verification**: Confirm backups include new configuration data
- [ ] **Lessons Learned**: Document migration experience for future batches

---

## Risk Assessment

### Critical Risks (HIGH)

| Risk | Probability | Impact | Mitigation | Contingency |
|------|-------------|--------|------------|-------------|
| Database connection failures | Medium | Critical | Maintain env var fallback | Immediate rollback |
| Password exposure in logs | Low | Critical | CONFIDENTIAL masking | Rotate passwords |
| Liquibase migration failure | Low | High | Pre-validate changeset | Manual SQL insertion |
| Test suite failures | Medium | High | Run tests before code changes | Revert code |

### Moderate Risks (MEDIUM)

| Risk | Probability | Impact | Mitigation | Contingency |
|------|-------------|--------|------------|-------------|
| Performance degradation | Low | Medium | ConfigurationService caching | Optimize queries |
| Configuration inconsistency | Medium | Medium | Verification queries | Reseed data |
| Missing configurations | Low | Medium | Comprehensive audit | Add missing configs |
| Audit log overflow | Low | Low | Log retention policy | Archive old logs |

### Risk Tolerance

- **Zero Tolerance**: Security violations, data loss, production outages
- **Low Tolerance**: Test failures, performance degradation >10%
- **Moderate Tolerance**: Minor logging issues, non-critical errors
- **High Tolerance**: Documentation gaps, cosmetic issues

---

## Approval Gates

### Pre-Execution Approval Required

- [ ] **Technical Lead**: Review migration plan and changeset
- [ ] **Security Team**: Approve password handling approach
- [ ] **Operations Team**: Confirm environment variable setup
- [ ] **Database Administrator**: Approve Liquibase changeset

### Post-Migration Sign-Off Required

- [ ] **Developer**: All tests passing
- [ ] **QA**: Verification queries successful
- [ ] **Operations**: No production issues detected
- [ ] **Security**: Audit logs reviewed, no violations

---

## Next Steps After Batch 1

Upon successful completion of Batch 1:

1. **Document Lessons Learned**: Capture any issues or improvements
2. **Update Batch 2 Plan**: Apply lessons to next migration batch
3. **Schedule Batch 2**: Infrastructure configurations (SMTP, APIs, file paths)
4. **Continue Monitoring**: Watch for delayed issues from Batch 1

**Estimated Timeline**:
- Batch 2 (Infrastructure): 3-4 hours (15 configs)
- Batch 3 (Performance): 4-5 hours (35 configs)
- Batch 4 (Features): 2-3 hours (36 configs)

**Total Remaining**: 11-15 hours across 3 batches

---

## References

- **Configuration Audit**: `claudedocs/US-098-Phase4-Step1-Configuration-Audit-DETAILED.md`
- **Liquibase Changeset**: `db/migrations/sprint8/US-098-Phase4-configuration-data-seed.xml`
- **Verification Queries**: `db/migrations/sprint8/US-098-Phase4-verification-queries.sql`
- **ConfigurationService Tests**: `src/groovy/umig/tests/unit/service/ConfigurationServiceTest.groovy`
- **Security ADR**: `docs/architecture/adr/ADR-058-security-classification.md`

---

**Document Status**: Ready for Review
**Next Action**: User approval to execute Liquibase migration
**Estimated Duration**: 2-3 hours (Batch 1 only)
**Risk Level**: HIGH (database access critical)

---

_Created: 2025-10-02_
_Author: Claude Code (GENDEV Project Orchestrator)_
_Branch: feature/sprint8-us-098-configuration-management-system_
