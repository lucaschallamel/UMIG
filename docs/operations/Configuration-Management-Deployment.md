# Configuration Management System - Operations & Deployment Guide

**Created**: 2025-10-06
**Owner**: Lucas Challamel
**Lifecycle**: Living Document
**Cross-References**: [Sprint Completion Report](../roadmap/sprint8/US-098-Configuration-Management-System-Sprint-Completion.md), [Technical Reference Guide](../architecture/configuration-management/Configuration-Management-System-Guide.md)

---

## Overview

This guide provides step-by-step procedures for deploying, operating, and troubleshooting the Configuration Management System across DEV, UAT, and PROD environments.

**Target Audience**: DevOps engineers, system administrators, deployment teams

**Prerequisites**:

- Access to target environment (DEV/UAT/PROD)
- Database admin credentials
- Confluence admin access (UAT/PROD)
- Liquibase migration tool

---

## Pre-Deployment Checklist

### DEV Environment (localhost:8090)

- [ ] Confluence container running via `npm start`
- [ ] PostgreSQL database accessible (localhost:5432)
- [ ] MailHog SMTP server running (localhost:1025)
- [ ] Database user `umig_app_user` has INSERT/UPDATE permissions
- [ ] Environments table populated: `SELECT * FROM environments_env`
- [ ] System property or environment variable set: `umig.environment=DEV`

### UAT Environment (https://confluence-evx.corp.ubp.ch)

- [ ] UAT Confluence instance accessible
- [ ] UAT database connection verified
- [ ] UAT environment exists in environments_env: `env_id=3, env_code='UAT'`
- [ ] Confluence SMTP server configured in Confluence Admin
- [ ] System property set on Confluence JVM: `-Dumig.environment=UAT`
- [ ] Backup of system_configuration_scf table created

### PROD Environment (https://confluence.corp.ubp.ch)

- [ ] Production change approval obtained
- [ ] Rollback plan documented and reviewed
- [ ] Production database backup verified (< 1 hour old)
- [ ] PROD environment exists: `env_id=2, env_code='PROD'`
- [ ] Confluence SMTP server configured and tested
- [ ] Deployment window scheduled (low-traffic period)
- [ ] System property set: `-Dumig.environment=PROD`
- [ ] Monitoring alerts configured

---

## Deployment Procedures

### Phase 1: Database Migration Execution

#### Step 1.1: Backup Current Configuration

**Execute in Target Environment**:

```bash
# DEV
npm run db:backup

# UAT/PROD (via database console)
pg_dump -h <DB_HOST> -U postgres -d umig_app_db \
  -t system_configuration_scf \
  -t environments_env \
  > backup_config_$(date +%Y%m%d_%H%M%S).sql
```

**Verification**:

```sql
-- Check backup file size
ls -lh backup_config_*.sql

-- Expected: > 10KB (contains existing configs)
```

#### Step 1.2: Execute Migration 035

**Liquibase Execution (Recommended)**:

```bash
# From project root
cd local-dev-setup/liquibase

# Execute migration
liquibase --changeLogFile=changelogs/035_us098_phase4_batch1_revised.sql update

# Verify execution
liquibase history
```

**Manual Execution** (if Liquibase unavailable):

```bash
# Execute migration file directly
psql -h localhost -U postgres -d umig_app_db \
  -f local-dev-setup/liquibase/changelogs/035_us098_phase4_batch1_revised.sql

# Expected output: INSERT 0 27 (27 configurations inserted)
```

#### Step 1.3: Validate Migration Success

**Configuration Count Validation**:

```sql
-- Check total configurations inserted
SELECT COUNT(*) as total_configs
FROM system_configuration_scf;
-- Expected: 27 (if starting from empty table)

-- Check environment distribution
SELECT
    e.env_code,
    COUNT(s.scf_id) as config_count
FROM environments_env e
LEFT JOIN system_configuration_scf s ON e.env_id = s.env_id
GROUP BY e.env_code
ORDER BY e.env_code;

-- Expected results:
-- DEV:  7 configurations
-- UAT:  10 configurations
-- PROD: 10 configurations
```

**Configuration Category Validation**:

```sql
-- Check SMTP application behavior configs (4 total)
SELECT COUNT(*) FROM system_configuration_scf
WHERE scf_key LIKE 'email.smtp%';
-- Expected: 4 (global configs across all environments)

-- Check API URLs (3 environment-specific)
SELECT env_id, scf_key, scf_value
FROM system_configuration_scf
WHERE scf_key = 'app.api.base.url'
ORDER BY env_id;
-- Expected:
--   env_id=1: http://localhost:8090
--   env_id=3: https://confluence-evx.corp.ubp.ch
--   env_id=2: https://confluence.corp.ubp.ch

-- Check timeouts (6 environment-specific)
SELECT COUNT(*) FROM system_configuration_scf
WHERE scf_key LIKE '%timeout%';
-- Expected: 6 (connection + operation for DEV, UAT, PROD)

-- Check batch sizes (6 environment-specific)
SELECT COUNT(*) FROM system_configuration_scf
WHERE scf_key = 'import.batch.size';
-- Expected: 3 (one per environment)

-- Check feature flags (6 environment-specific)
SELECT COUNT(*) FROM system_configuration_scf
WHERE scf_key LIKE 'feature.%';
-- Expected: 6 (monitoring + email notifications for 3 environments)

-- Check StepView configs (2 for UAT/PROD only)
SELECT COUNT(*) FROM system_configuration_scf
WHERE scf_key = 'app.stepview.macro.location';
-- Expected: 2 (UAT + PROD)
```

**Security Classification Validation**:

```sql
-- Verify default classification is PUBLIC
SELECT scf_security_classification, COUNT(*)
FROM system_configuration_scf
GROUP BY scf_security_classification;
-- Expected: PUBLIC = 27 (no credentials stored)
```

---

### Phase 2: Confluence SMTP Configuration

**Note**: Required for UAT and PROD only (DEV uses MailHog)

#### Step 2.1: Access Confluence Admin

**Navigate to**:

```
Confluence Admin → General Configuration → Mail Servers
```

#### Step 2.2: Configure SMTP Server

**UAT Configuration**:

```
Mail Server Name: UAT SMTP Server
Hostname: <UAT SMTP host from IT department>
Port: 587 (or 25 for non-TLS)
From Address: noreply-uat@corp.ubp.ch
From Name: UMIG UAT System

Protocol: SMTP
Authentication:
  ☑ This server requires authentication
  Username: <UAT SMTP username>
  Password: <UAT SMTP password>

TLS Settings:
  ☑ Use STARTTLS (Upgrade to TLS)
  Port: 587
```

**PROD Configuration**:

```
Mail Server Name: Production SMTP Server
Hostname: <PROD SMTP host from IT department>
Port: 587
From Address: noreply@corp.ubp.ch
From Name: UMIG Production System

Protocol: SMTP
Authentication:
  ☑ This server requires authentication
  Username: <PROD SMTP username>
  Password: <PROD SMTP password>

TLS Settings:
  ☑ Use STARTTLS (Upgrade to TLS)
  Port: 587
```

#### Step 2.3: Set as Default Mail Server

**Actions**:

1. Click **Test Connection** to verify SMTP connectivity
2. If successful, click **Set as Default**
3. Verify "Default Server" badge appears next to server name

#### Step 2.4: Validate MailServerManager API Access

**Execute in ScriptRunner Console**:

```groovy
import com.atlassian.sal.api.component.ComponentLocator
import com.atlassian.mail.server.MailServerManager

// Retrieve MailServerManager
def mailServerManager = ComponentLocator.getComponent(MailServerManager)
println "MailServerManager initialized: ${mailServerManager != null}"

// Retrieve default SMTP server
def smtpServer = mailServerManager.getDefaultSMTPMailServer()

if (smtpServer) {
    println "✅ Default SMTP Server Found:"
    println "  Name: ${smtpServer.getName()}"
    println "  Host: ${smtpServer.getHostname()}"
    println "  Port: ${smtpServer.getPort()}"
    println "  From: ${smtpServer.getDefaultFrom()}"
    println "  Protocol: ${smtpServer.getMailProtocol().getProtocol()}"
} else {
    println "❌ No default SMTP server configured"
}
```

**Expected Output (UAT)**:

```
MailServerManager initialized: true
✅ Default SMTP Server Found:
  Name: UAT SMTP Server
  Host: <UAT SMTP host>
  Port: 587
  From: noreply-uat@corp.ubp.ch
  Protocol: smtp
```

---

### Phase 3: EnhancedEmailService Validation

**Note**: Phase 5 refactoring must be complete before this step

#### Step 3.1: Health Check Execution

**Execute in ScriptRunner Console**:

```groovy
import umig.utils.EnhancedEmailService

// Execute health check
Map healthCheck = EnhancedEmailService.healthCheck()

println "=== EnhancedEmailService Health Check ==="
println "Service Status: ${healthCheck.status}"
println "SMTP Configuration:"
println "  Configured: ${healthCheck.smtp?.configured}"
println "  MailServerManager: ${healthCheck.smtp?.mailServerManager}"
println "Capabilities:"
healthCheck.capabilities.each { key, value ->
    println "  ${key}: ${value}"
}
```

**Expected Output (UAT/PROD)**:

```
=== EnhancedEmailService Health Check ===
Service Status: healthy
SMTP Configuration:
  Configured: true
  MailServerManager: initialized
Capabilities:
  smtpIntegration: true
  emailTemplates: true
  auditLogging: true
  dynamicUrls: true
```

**Expected Output (DEV)**:

```
Service Status: healthy
SMTP Configuration:
  Configured: true
  MailServerManager: initialized
Capabilities:
  smtpIntegration: true
  emailTemplates: true
  auditLogging: true
  dynamicUrls: true
```

#### Step 3.2: SMTP Connectivity Test

**Execute in ScriptRunner Console**:

```groovy
import umig.utils.EnhancedEmailService

// Check SMTP health
Boolean smtpHealthy = EnhancedEmailService.checkSMTPHealth()

if (smtpHealthy) {
    println "✅ SMTP server is healthy and reachable"
} else {
    println "❌ SMTP server is not configured or unreachable"
}
```

**Expected**: `✅ SMTP server is healthy and reachable`

#### Step 3.3: Test Email Sending

**Execute in ScriptRunner Console (DEV only)**:

```groovy
import umig.utils.EnhancedEmailService

// Send test email
def result = EnhancedEmailService.sendTestEmail(
    'test-recipient@example.com',
    'Configuration Management Test',
    'This is a test email from US-098 Phase 5'
)

if (result.success) {
    println "✅ Test email sent successfully"
    println "Check MailHog: http://localhost:8025"
} else {
    println "❌ Test email failed: ${result.error}"
}
```

**Validation (DEV)**:

1. Open MailHog UI: http://localhost:8025
2. Verify email appears in inbox
3. Check subject matches: "Configuration Management Test"
4. Verify email body content

**Validation (UAT/PROD)**:

- Use actual recipient email address
- Verify email received in corporate inbox
- Do NOT use MailHog (not available in UAT/PROD)

---

### Phase 4: ConfigurationService Integration Validation

#### Step 4.1: Environment Detection Test

**Execute in ScriptRunner Console**:

```groovy
import umig.service.ConfigurationService

println "=== Environment Detection Test ==="

// Get current environment
String env = ConfigurationService.getCurrentEnvironment()
println "Current Environment Code: ${env}"

// Get environment ID
Integer envId = ConfigurationService.getCurrentEnvironmentId()
println "Current Environment ID: ${envId}"

// Validate environment exists
Boolean exists = ConfigurationService.environmentExists(env)
println "Environment Exists: ${exists}"

// Expected outputs:
// DEV:  env=DEV, envId=1, exists=true
// UAT:  env=UAT, envId=3, exists=true
// PROD: env=PROD, envId=2, exists=true
```

#### Step 4.2: Configuration Retrieval Test

**Execute in ScriptRunner Console**:

```groovy
import umig.service.ConfigurationService

println "=== Configuration Retrieval Test ==="

// Test 1: String configuration
String apiUrl = ConfigurationService.getString('app.api.base.url')
println "API Base URL: ${apiUrl}"

// Test 2: Integer configuration
Integer timeout = ConfigurationService.getInteger('api.connection.timeout.ms')
println "Connection Timeout: ${timeout} ms"

// Test 3: Boolean configuration
Boolean emailEnabled = ConfigurationService.getBoolean('feature.email.notifications.enabled')
println "Email Notifications Enabled: ${emailEnabled}"

// Test 4: Section retrieval
Map smtpConfig = ConfigurationService.getSection('email.smtp.')
println "SMTP Configuration: ${smtpConfig}"

// Verify values match environment expectations:
// DEV:  apiUrl = http://localhost:8090, timeout = 5000
// UAT:  apiUrl = https://confluence-evx.corp.ubp.ch, timeout = 10000
// PROD: apiUrl = https://confluence.corp.ubp.ch, timeout = 15000
```

#### Step 4.3: Cache Performance Test

**Execute in ScriptRunner Console**:

```groovy
import umig.service.ConfigurationService

println "=== Cache Performance Test ==="

// First retrieval (uncached)
long startUncached = System.nanoTime()
String value1 = ConfigurationService.getString('app.api.base.url')
long durationUncached = (System.nanoTime() - startUncached) / 1_000_000
println "Uncached retrieval: ${durationUncached} ms"

// Second retrieval (cached)
long startCached = System.nanoTime()
String value2 = ConfigurationService.getString('app.api.base.url')
long durationCached = (System.nanoTime() - startCached) / 1_000_000
println "Cached retrieval: ${durationCached} ms"

// Calculate speedup
double speedup = durationUncached / durationCached
println "Cache speedup: ${speedup}×"

// Verify cache stats
Map stats = ConfigurationService.getCacheStats()
println "Config cache size: ${stats.configCacheSize}"
println "Environment cache size: ${stats.environmentCacheSize}"

// Expected:
// - Uncached: ~100-150ms
// - Cached: <50ms
// - Speedup: >3×
```

#### Step 4.4: Audit Logging Verification

**Check Confluence Logs**:

```bash
# DEV
npm run logs:confluence | grep "AUDIT:"

# UAT/PROD (SSH to Confluence server)
tail -f /var/atlassian/application-data/confluence/logs/atlassian-confluence.log | grep "AUDIT:"
```

**Expected Audit Entries**:

```
AUDIT: user=admin, key=app.api.base.url, classification=INTERNAL,
       value=htt*****com, source=cache, success=true,
       timestamp=2025-10-06T10:15:23.456Z

AUDIT: user=admin, key=feature.email.notifications.enabled, classification=PUBLIC,
       value=true, source=database, success=true,
       timestamp=2025-10-06T10:15:24.123Z
```

**Verification Points**:

- User attribution present (admin, system, or actual username)
- Key matches requested configuration
- Classification correct (PUBLIC for feature flags, INTERNAL for URLs)
- Value sanitized appropriately (INTERNAL URLs partially masked)
- Source identified (cache, database, default)
- Success=true for successful retrievals
- ISO-8601 timestamp format

---

## Environment-Specific Configuration Reference

### DEV Environment Configuration

**SMTP Application Behavior**:

```
email.smtp.auth.enabled = false              # MailHog no auth
email.smtp.starttls.enabled = false          # MailHog no TLS
email.smtp.connection.timeout.ms = 5000      # 5 seconds
email.smtp.timeout.ms = 5000                 # 5 seconds
```

**API & URLs**:

```
app.api.base.url = http://localhost:8090
```

**Timeouts**:

```
api.connection.timeout.ms = 5000             # 5 seconds
api.operation.timeout.ms = 10000             # 10 seconds
```

**Batch Sizes**:

```
import.batch.size = 100                      # Smaller for testing
pagination.default.page.size = 20            # Smaller pages
```

**Feature Flags**:

```
feature.monitoring.enabled = false           # Disable in DEV
feature.email.notifications.enabled = true   # Enable email testing
```

**StepView Config**:

```
# Uses existing config from migration 022
# app.stepview.macro.location = /display/TEST/StepView
```

**Environment Detection**:

```bash
# Option 1: System property
export JAVA_OPTS="-Dumig.environment=DEV"

# Option 2: Environment variable
export UMIG_ENVIRONMENT=DEV
```

---

### UAT Environment Configuration

**SMTP Application Behavior**:

```
email.smtp.auth.enabled = true               # Confluence SMTP with auth
email.smtp.starttls.enabled = true           # TLS required
email.smtp.connection.timeout.ms = 5000      # 5 seconds
email.smtp.timeout.ms = 5000                 # 5 seconds
```

**API & URLs**:

```
app.api.base.url = https://confluence-evx.corp.ubp.ch
```

**Timeouts**:

```
api.connection.timeout.ms = 10000            # 10 seconds (UAT network)
api.operation.timeout.ms = 20000             # 20 seconds
```

**Batch Sizes**:

```
import.batch.size = 500                      # Medium batch size
pagination.default.page.size = 50            # Medium pages
```

**Feature Flags**:

```
feature.monitoring.enabled = true            # Enable monitoring
feature.email.notifications.enabled = true   # Enable notifications
```

**StepView Config**:

```
app.stepview.macro.location = /display/UMIG-UAT/StepView
```

**Environment Detection**:

```bash
# Confluence JVM system property (preferred)
-Dumig.environment=UAT

# Or in setenv.sh
export UMIG_ENVIRONMENT=UAT
```

---

### PROD Environment Configuration

**SMTP Application Behavior**:

```
email.smtp.auth.enabled = true               # Production SMTP with auth
email.smtp.starttls.enabled = true           # TLS required
email.smtp.connection.timeout.ms = 5000      # 5 seconds
email.smtp.timeout.ms = 5000                 # 5 seconds
```

**API & URLs**:

```
app.api.base.url = https://confluence.corp.ubp.ch
```

**Timeouts**:

```
api.connection.timeout.ms = 15000            # 15 seconds (production SLA)
api.operation.timeout.ms = 30000             # 30 seconds
```

**Batch Sizes**:

```
import.batch.size = 1000                     # Large batch size for performance
pagination.default.page.size = 100           # Large pages
```

**Feature Flags**:

```
feature.monitoring.enabled = true            # Critical: monitoring required
feature.email.notifications.enabled = true   # Critical: notifications required
```

**StepView Config**:

```
app.stepview.macro.location = /display/UMIG/StepView
```

**Environment Detection**:

```bash
# Confluence JVM system property (REQUIRED)
-Dumig.environment=PROD

# Fail-safe: Defaults to PROD if not set
```

---

## Monitoring & Health Checks

### Automated Health Check Script

**Create Scheduled Job** (execute every 5 minutes):

```groovy
import umig.service.ConfigurationService
import umig.utils.EnhancedEmailService

// 1. Configuration Service Health
Map configStats = ConfigurationService.getCacheStats()
if (configStats.configCacheSize == 0) {
    log.warn("Configuration cache is empty - possible issue")
}

// 2. SMTP Health
Boolean smtpHealthy = EnhancedEmailService.checkSMTPHealth()
if (!smtpHealthy) {
    log.error("SMTP server health check failed - email sending may not work")
}

// 3. Environment Detection
String env = ConfigurationService.getCurrentEnvironment()
Integer envId = ConfigurationService.getCurrentEnvironmentId()
if (envId == null) {
    log.error("Environment ID resolution failed for environment: ${env}")
}

// 4. Log health summary
log.info("Health Check: config_cache=${configStats.configCacheSize}, " +
         "smtp_healthy=${smtpHealthy}, env=${env}, env_id=${envId}")
```

### Monitoring Dashboards

**Key Metrics to Track**:

| Metric                                  | Target         | Alert Threshold    |
| --------------------------------------- | -------------- | ------------------ |
| Configuration cache size                | <1000 entries  | >2000 entries      |
| Configuration retrieval time (cached)   | <50ms average  | >100ms average     |
| Configuration retrieval time (uncached) | <200ms average | >500ms average     |
| SMTP health check success rate          | 100%           | <95%               |
| Environment ID resolution failures      | 0 per hour     | >5 per hour        |
| Audit log volume                        | Varies         | Sudden drop (>50%) |

**Grafana Dashboard Queries** (example):

```promql
# Configuration cache size
umig_configuration_cache_size

# Configuration retrieval latency (p95)
histogram_quantile(0.95, umig_configuration_retrieval_duration_ms)

# SMTP health check success rate
rate(umig_smtp_health_check_success_total[5m]) /
rate(umig_smtp_health_check_total[5m])
```

---

## Troubleshooting Procedures

### Issue 1: Migration Failed - Duplicate Key Constraint

**Symptom**:

```
ERROR: duplicate key value violates unique constraint "unique_env_key"
DETAIL: Key (env_id, scf_key)=(3, 'app.stepview.macro.location') already exists.
```

**Root Cause**: Configuration key already exists for that environment

**Resolution**:

```sql
-- Option 1: Update existing configuration
UPDATE system_configuration_scf
SET scf_value = 'new-value',
    scf_updated_at = CURRENT_TIMESTAMP,
    scf_updated_by = 'migration-035'
WHERE env_id = 3
  AND scf_key = 'app.stepview.macro.location';

-- Option 2: Delete existing and re-insert
DELETE FROM system_configuration_scf
WHERE env_id = 3
  AND scf_key = 'app.stepview.macro.location';

-- Then re-run migration
```

---

### Issue 2: ConfigurationService Returns Wrong Environment Values

**Symptom**: getString() returns DEV values when expecting PROD values

**Root Cause**: Environment detection not configured correctly

**Diagnosis**:

```groovy
// Check current environment detection
String env = ConfigurationService.getCurrentEnvironment()
println "Detected environment: ${env}"

// Check system property
println "System property: ${System.getProperty('umig.environment')}"

// Check environment variable
println "Env variable: ${System.getenv('UMIG_ENVIRONMENT')}"
```

**Resolution**:

```bash
# Option 1: Set JVM system property (recommended)
# Add to Confluence setenv.sh or JVM arguments
JAVA_OPTS="$JAVA_OPTS -Dumig.environment=PROD"

# Option 2: Set environment variable
export UMIG_ENVIRONMENT=PROD

# Restart Confluence for changes to take effect
systemctl restart confluence
```

---

### Issue 3: SMTP Health Check Failing

**Symptom**: `checkSMTPHealth()` returns false

**Diagnosis**:

```groovy
import com.atlassian.sal.api.component.ComponentLocator
import com.atlassian.mail.server.MailServerManager

// Check MailServerManager initialization
def mailServerManager = ComponentLocator.getComponent(MailServerManager)
println "MailServerManager: ${mailServerManager != null ? 'initialized' : 'NOT initialized'}"

// Check default SMTP server configuration
def smtpServer = mailServerManager?.getDefaultSMTPMailServer()
if (smtpServer) {
    println "SMTP Host: ${smtpServer.getHostname()}"
    println "SMTP Port: ${smtpServer.getPort()}"
} else {
    println "ERROR: No default SMTP server configured"
}
```

**Resolution**:

1. **Configure Confluence SMTP** (see Phase 2 above)
2. **Set as Default Server**: Verify "Default Server" badge in Confluence Admin
3. **Test Connection**: Use Confluence Admin → Mail Servers → Test Connection
4. **Check Firewall**: Ensure Confluence can reach SMTP host:port
5. **Verify Credentials**: Ensure SMTP username/password are correct

---

### Issue 4: Audit Logs Not Appearing

**Symptom**: No AUDIT log entries in Confluence logs

**Diagnosis**:

```bash
# Check logging configuration
cat /var/atlassian/application-data/confluence/confluence/WEB-INF/classes/log4j.properties | grep ConfigurationService

# Check log level
grep "ConfigurationService" confluence-current.log
```

**Resolution**:

```xml
<!-- Add to log4j.properties or logging configuration -->
log4j.logger.umig.service.ConfigurationService=INFO
```

**Alternative**: Enable DEBUG logging temporarily

```groovy
// In ScriptRunner console
import org.apache.log4j.Logger
import org.apache.log4j.Level

Logger logger = Logger.getLogger('umig.service.ConfigurationService')
logger.setLevel(Level.DEBUG)

// Test configuration retrieval
ConfigurationService.getString('test.key')

// Check logs for DEBUG entries
```

---

### Issue 5: Cache Not Refreshing After Configuration Update

**Symptom**: Updated configuration in database not reflected in ConfigurationService

**Root Cause**: Cache TTL (5 minutes) not expired yet

**Immediate Resolution**:

```groovy
// Force cache refresh
ConfigurationService.refreshConfiguration()

// Verify new value retrieved
String updatedValue = ConfigurationService.getString('updated.key')
println "Updated value: ${updatedValue}"
```

**Long-term Solution**:

- Wait 5 minutes for automatic cache expiration
- OR implement configuration update notification system
- OR reduce cache TTL (not recommended for performance)

---

### Issue 6: EnhancedEmailService Not Using MailServerManager

**Symptom**: Emails still using hardcoded MailHog settings in UAT/PROD

**Root Cause**: Phase 5 refactoring not complete or not deployed

**Diagnosis**:

```groovy
import umig.utils.EnhancedEmailService

// Check EnhancedEmailService health
Map health = EnhancedEmailService.healthCheck()

println "SMTP Integration: ${health.smtp?.mailServerManager}"
// Expected: "initialized"
// If "not-available" or null: Phase 5 refactoring not deployed
```

**Resolution**:

1. Verify Phase 5 refactored EnhancedEmailService.groovy is deployed
2. Check MailServerManager static initialization:

   ```groovy
   import com.atlassian.sal.api.component.ComponentLocator
   import com.atlassian.mail.server.MailServerManager

   def mailServerManager = ComponentLocator.getComponent(MailServerManager.class)
   println "MailServerManager available: ${mailServerManager != null}"
   ```

3. Restart Confluence to reload EnhancedEmailService
4. Re-run health check to verify

---

## Rollback Procedures

### Rollback Scenario 1: Migration Failure

**When to Use**: Migration 035 execution failed mid-way

**Procedure**:

```bash
# 1. Stop application (if needed)
systemctl stop confluence

# 2. Restore from backup
psql -h localhost -U postgres -d umig_app_db < backup_config_YYYYMMDD_HHMMSS.sql

# 3. Verify restoration
psql -h localhost -U postgres -d umig_app_db \
  -c "SELECT COUNT(*) FROM system_configuration_scf;"

# 4. Restart application
systemctl start confluence

# 5. Verify ConfigurationService functioning
# (Execute health check scripts from validation section)
```

**Validation**:

- Configuration count matches pre-migration state
- ConfigurationService retrieval working
- No errors in Confluence startup logs

---

### Rollback Scenario 2: Production Issues After Deployment

**When to Use**: ConfigurationService causing production issues

**Procedure**:

**Step 1: Immediate Mitigation** (if needed)

```sql
-- Disable problematic configurations temporarily
UPDATE system_configuration_scf
SET scf_is_active = false
WHERE scf_key IN ('problematic.key.1', 'problematic.key.2');

-- Force cache refresh
-- (Execute in ScriptRunner console)
ConfigurationService.refreshConfiguration()
```

**Step 2: Full Rollback**

```bash
# 1. Database restoration
psql -h <PROD_DB_HOST> -U postgres -d umig_app_db \
  -c "DELETE FROM system_configuration_scf WHERE scf_created_at > '2025-10-06'::timestamp;"

# Or full table restore from backup
psql -h <PROD_DB_HOST> -U postgres -d umig_app_db \
  < backup_config_YYYYMMDD_HHMMSS.sql

# 2. Restart Confluence
systemctl restart confluence

# 3. Verify restoration
# (Execute health check scripts)
```

**Step 3: Post-Rollback Validation**

- Verify application functionality restored
- Check error logs for remaining issues
- Validate with smoke tests
- Communicate status to stakeholders

---

## Security Procedures

### Configuration Value Encryption (Future Enhancement)

**Current State**: Configuration values stored in plain text (non-credential configs only)

**Recommended Enhancement** (not implemented in US-098):

```sql
-- Add encryption columns (future migration)
ALTER TABLE system_configuration_scf
ADD COLUMN scf_is_encrypted BOOLEAN DEFAULT false,
ADD COLUMN scf_encrypted_value BYTEA;

-- Encryption implementation (future)
-- Use PostgreSQL pgcrypto for column-level encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example encrypted insert
INSERT INTO system_configuration_scf
  (scf_id, env_id, scf_key, scf_encrypted_value, scf_is_encrypted)
VALUES
  (gen_random_uuid(), 1, 'future.encrypted.key',
   pgp_sym_encrypt('sensitive-value', 'encryption-key'),
   true);
```

---

### Audit Log Retention

**Current Implementation**: Audit logs written to Confluence application logs

**Retention Policy** (configure in logging framework):

```xml
<!-- log4j.properties or similar -->
log4j.appender.auditAppender=org.apache.log4j.RollingFileAppender
log4j.appender.auditAppender.File=/var/logs/confluence/audit.log
log4j.appender.auditAppender.MaxFileSize=100MB
log4j.appender.auditAppender.MaxBackupIndex=90
<!-- Retains ~90 days of audit logs -->
```

**Long-term Archival** (recommended):

```bash
# Archive audit logs monthly
#!/bin/bash
# /opt/scripts/archive_audit_logs.sh

ARCHIVE_DIR="/var/backups/audit-logs"
LOG_FILE="/var/logs/confluence/audit.log"
MONTH=$(date -d "last month" +%Y-%m)

# Compress and archive
gzip -c ${LOG_FILE} > ${ARCHIVE_DIR}/audit-${MONTH}.log.gz

# Rotate log
> ${LOG_FILE}

# Optional: Upload to S3 for compliance
aws s3 cp ${ARCHIVE_DIR}/audit-${MONTH}.log.gz \
  s3://umig-audit-archive/audit-${MONTH}.log.gz
```

---

### Access Control

**Database-Level Permissions**:

```sql
-- Create read-only role for monitoring/reporting
CREATE ROLE umig_config_reader;

GRANT SELECT ON system_configuration_scf TO umig_config_reader;
GRANT SELECT ON environments_env TO umig_config_reader;

-- Create admin role for configuration management
CREATE ROLE umig_config_admin;

GRANT SELECT, INSERT, UPDATE ON system_configuration_scf TO umig_config_admin;
GRANT SELECT ON environments_env TO umig_config_admin;

-- Prevent direct DELETE (use scf_is_active instead)
REVOKE DELETE ON system_configuration_scf FROM umig_config_admin;
```

**Confluence Admin UI Access Control**:

- Restrict ScriptRunner console access to administrators only
- Implement approval workflow for production configuration changes
- Enable audit logging for all configuration modifications

---

## Maintenance Procedures

### Regular Maintenance Tasks

**Daily**:

- [ ] Review audit logs for anomalies
- [ ] Check SMTP health status
- [ ] Verify configuration cache performance

**Weekly**:

- [ ] Review cache statistics and hit ratios
- [ ] Clean up expired cache entries (automatic)
- [ ] Validate environment detection accuracy

**Monthly**:

- [ ] Review and archive audit logs
- [ ] Database maintenance: VACUUM, ANALYZE system_configuration_scf
- [ ] Performance benchmarking and trending
- [ ] Review configuration changes and approvals

**Quarterly**:

- [ ] Configuration audit: verify all configs still needed
- [ ] Security review: check for sensitive data in PUBLIC configs
- [ ] Disaster recovery drill: test backup/restore procedures
- [ ] Performance tuning review

---

### Database Maintenance

**Vacuum and Analyze** (monthly):

```sql
-- Reclaim space and update statistics
VACUUM ANALYZE system_configuration_scf;
VACUUM ANALYZE environments_env;

-- Check table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
FROM pg_tables
WHERE tablename IN ('system_configuration_scf', 'environments_env');
```

**Index Maintenance** (quarterly):

```sql
-- Rebuild indexes for performance
REINDEX TABLE system_configuration_scf;

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'system_configuration_scf';
```

---

### Cache Optimization

**Cache Tuning** (if needed):

```groovy
// Current TTL: 5 minutes (300,000 ms)
// Adjust if necessary in ConfigurationService.groovy

private static final long CACHE_TTL_MILLIS = 5 * 60 * 1000  // 5 minutes

// Options:
// - 1 minute: 1 * 60 * 1000 (for rapidly changing configs)
// - 10 minutes: 10 * 60 * 1000 (for stable configs)
// - 30 minutes: 30 * 60 * 1000 (for very stable configs)

// Note: Longer TTL = better performance but slower config updates visibility
```

**Cache Preloading** (optional optimization):

```groovy
// Preload critical configurations at application startup
import umig.service.ConfigurationService

class ConfigurationPreloader {
    static void warmupCache() {
        // Critical configurations to preload
        List<String> criticalConfigs = [
            'app.api.base.url',
            'email.smtp.auth.enabled',
            'email.smtp.starttls.enabled',
            'import.batch.size',
            'feature.email.notifications.enabled',
            'feature.monitoring.enabled'
        ]

        criticalConfigs.each { key ->
            ConfigurationService.getString(key)  // Load into cache
        }

        log.info("Configuration cache warmed up with ${criticalConfigs.size()} critical configs")
    }
}

// Call at application startup
ConfigurationPreloader.warmupCache()
```

---

## Appendix: Quick Reference

### Essential Commands

**Configuration Retrieval**:

```groovy
String value = ConfigurationService.getString('key', 'default')
Integer number = ConfigurationService.getInteger('key', 100)
Boolean flag = ConfigurationService.getBoolean('key', true)
Map section = ConfigurationService.getSection('prefix.')
```

**Environment Management**:

```groovy
String env = ConfigurationService.getCurrentEnvironment()
Integer envId = ConfigurationService.getCurrentEnvironmentId()
```

**Cache Management**:

```groovy
ConfigurationService.refreshConfiguration()  // Force reload
Map stats = ConfigurationService.getCacheStats()  // View stats
```

**Health Checks**:

```groovy
Boolean smtpHealthy = EnhancedEmailService.checkSMTPHealth()
Map health = EnhancedEmailService.healthCheck()
```

---

### Validation Queries

**Configuration Count**:

```sql
SELECT COUNT(*) FROM system_configuration_scf;
-- Expected: 27 after migration 035
```

**Environment Distribution**:

```sql
SELECT e.env_code, COUNT(s.scf_id)
FROM environments_env e
LEFT JOIN system_configuration_scf s ON e.env_id = s.env_id
GROUP BY e.env_code;
-- Expected: DEV=7, UAT=10, PROD=10
```

**Active Configurations Only**:

```sql
SELECT COUNT(*) FROM system_configuration_scf WHERE scf_is_active = true;
-- Expected: 27 (all active)
```

---

### Emergency Contacts

**Database Issues**: Database Admin Team
**Confluence Issues**: Confluence Admin Team
**Network/SMTP Issues**: IT Infrastructure Team
**Escalation Path**: Team Lead → Department Manager → CTO

---

**Document Version**: 1.0 (Production)
**Last Updated**: 2025-10-06
**Review Schedule**: Quarterly or after major changes
