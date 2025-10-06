# US-098 Phase 5 Configuration Guide

**Purpose**: Comprehensive configuration instructions for Confluence SMTP integration and ConfigurationService overrides

**Target Audience**: DevOps Engineers, Confluence Administrators, UMIG Deployment Team

**Last Updated**: 2025-10-06

---

## Table of Contents

1. [Overview](#overview)
2. [Confluence SMTP Configuration](#confluence-smtp-configuration)
3. [Configuration Override Setup](#configuration-override-setup)
4. [Environment-Specific Settings](#environment-specific-settings)
5. [Validation Queries](#validation-queries)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture Summary

UMIG Phase 5 email service uses **Confluence MailServerManager API** for SMTP infrastructure (host, port, credentials) with **ConfigurationService overrides** for application-level behavior (authentication, TLS, timeouts).

**Key Principles**:

- ✅ **Zero Credential Storage**: No SMTP credentials in UMIG database
- ✅ **Platform Delegation**: Confluence manages infrastructure securely
- ✅ **Application Control**: ConfigurationService provides environment-specific behavior
- ✅ **4-Tier Hierarchy**: ConfigurationService → Confluence → JavaMail defaults

### Configuration Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: ConfigurationService (Environment-Specific)        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ email.smtp.auth.enabled = true (PROD) / false (DEV)    │ │
│ │ email.smtp.starttls.enabled = true (PROD) / false (DEV)│ │
│ │ email.smtp.connection.timeout.ms = 15000 (PROD)        │ │
│ │ email.smtp.timeout.ms = 30000 (PROD)                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │ overrides
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Confluence MailServerManager (Infrastructure)      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Host: smtp.organization.com                            │ │
│ │ Port: 587                                              │ │
│ │ Username: umig-notifications@organization.com          │ │
│ │ Password: [Encrypted by Confluence]                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │ fallback to
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: JavaMail Defaults (Final Fallback)                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Connection timeout: 60000ms                            │ │
│ │ Operation timeout: 60000ms                             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Confluence SMTP Configuration

### Prerequisites

1. **Confluence Administrator Access**: Required for SMTP configuration
2. **SMTP Server Details**: Hostname, port, credentials from IT infrastructure team
3. **Test Email Account**: For validation after configuration
4. **Network Access**: Confluence server must reach SMTP server (firewall rules)

### Step-by-Step Configuration

#### Step 1: Access Confluence Admin

1. Log in to Confluence with administrator credentials
2. Click **⚙️ Settings** (top right)
3. Navigate to **General Configuration**
4. Select **Mail Servers** from left sidebar

#### Step 2: Add SMTP Mail Server

1. Click **Add SMTP Mail Server** button
2. Complete the form with environment-specific details:

**DEV Environment** (MailHog):

```
┌──────────────────────────────────────────────┐
│ SMTP Mail Server Configuration              │
├──────────────────────────────────────────────┤
│ Name: MailHog Development Server             │
│ Description: Local email testing (MailHog)   │
│ From Address: umig-dev@example.com           │
│ From Name: UMIG Development                  │
│ Hostname: umig_mailhog                       │
│ Port: 1025                                   │
│ Use TLS: No                                  │
│ Username: (leave blank)                      │
│ Password: (leave blank)                      │
│ Default Server: Yes ✓                        │
└──────────────────────────────────────────────┘
```

**UAT Environment**:

```
┌──────────────────────────────────────────────┐
│ SMTP Mail Server Configuration              │
├──────────────────────────────────────────────┤
│ Name: UAT SMTP Server                        │
│ Description: UAT email notifications         │
│ From Address: umig-uat@organization.com      │
│ From Name: UMIG UAT                          │
│ Hostname: [UAT SMTP hostname]                │
│ Port: 587                                    │
│ Use TLS: Yes (STARTTLS) ✓                    │
│ Username: [UAT SMTP username]                │
│ Password: [UAT SMTP password]                │
│ Default Server: Yes ✓                        │
└──────────────────────────────────────────────┘
```

**PROD Environment**:

```
┌──────────────────────────────────────────────┐
│ SMTP Mail Server Configuration              │
├──────────────────────────────────────────────┤
│ Name: Production SMTP Server                 │
│ Description: Production email notifications  │
│ From Address: umig-notifications@org.com     │
│ From Name: UMIG Production                   │
│ Hostname: [Production SMTP hostname]         │
│ Port: 587                                    │
│ Use TLS: Yes (STARTTLS) ✓                    │
│ Username: [Production SMTP username]         │
│ Password: [Production SMTP password]         │
│ Default Server: Yes ✓                        │
└──────────────────────────────────────────────┘
```

#### Step 3: Test SMTP Configuration

1. After saving SMTP configuration, click **Send Test Email**
2. Enter recipient email address
3. Send test email
4. Verify receipt:
   - **DEV**: Check MailHog UI at http://localhost:8025
   - **UAT/PROD**: Check recipient's inbox

#### Step 4: Verify Default Server

1. Navigate back to **Mail Servers** configuration
2. Confirm **Default** column shows **Yes** for the configured server
3. If multiple SMTP servers exist, ensure correct server is default

### Common SMTP Server Settings

#### Standard Ports

| Port | Protocol | Usage                                 |
| ---- | -------- | ------------------------------------- |
| 25   | SMTP     | Unencrypted (legacy, not recommended) |
| 465  | SMTPS    | SSL/TLS encryption (implicit)         |
| 587  | SMTP     | STARTTLS encryption (recommended)     |
| 2525 | SMTP     | Alternative port (some providers)     |
| 1025 | SMTP     | MailHog (development only)            |

**Recommendation**: Use **port 587 with STARTTLS** for UAT and PROD environments.

#### TLS Configuration Options

| Setting      | Description               | When to Use                  |
| ------------ | ------------------------- | ---------------------------- |
| **No TLS**   | Plain text SMTP           | DEV only (MailHog)           |
| **STARTTLS** | Opportunistic TLS upgrade | **Recommended** for UAT/PROD |
| **SSL/TLS**  | Implicit TLS encryption   | Port 465 servers             |

---

## Configuration Override Setup

### Migration 035 Deployment

**Critical Prerequisite**: Migration 035 must be deployed **before** Phase 5 code.

#### Migration 035 Contents

**File**: `local-dev-setup/liquibase/changelogs/035_us098_phase4_batch1_revised.sql`

**Deploys**:

- 27 configuration entries
- 3 environment records (DEV, UAT, PROD)
- 4 SMTP behavior configuration keys × 3 environments
- 6 stepview macro location configs

#### Deployment Verification

After deploying Migration 035, execute verification query:

```sql
-- Verify total configuration count
SELECT COUNT(*) AS total_configs
FROM system_configuration_scf
WHERE created_by = 'US-098-migration';

-- Expected Result: 27 rows
```

**If count ≠ 27**: Migration 035 deployment failed - investigate and re-run.

### Configuration Key Definitions

#### 1. email.smtp.auth.enabled

**Purpose**: Control SMTP authentication requirement

**Type**: BOOLEAN

**Values**:

- `false`: No authentication required (DEV - MailHog)
- `true`: Authentication required (UAT, PROD)

**Environment-Specific Settings**:

| Environment | Value   | Rationale                                   |
| ----------- | ------- | ------------------------------------------- |
| DEV         | `false` | MailHog accepts unauthenticated connections |
| UAT         | `true`  | Production-like security requirements       |
| PROD        | `true`  | Security compliance requirement             |

**Database Query**:

```sql
SELECT env_id, scf_value
FROM system_configuration_scf
WHERE scf_key = 'email.smtp.auth.enabled'
ORDER BY env_id;

-- Expected Results:
-- env_id=1 (DEV):  scf_value='false'
-- env_id=3 (UAT):  scf_value='true'
-- env_id=2 (PROD): scf_value='true'
```

#### 2. email.smtp.starttls.enabled

**Purpose**: Control STARTTLS encryption requirement

**Type**: BOOLEAN

**Values**:

- `false`: No encryption (DEV - MailHog)
- `true`: STARTTLS encryption enabled (UAT, PROD)

**Environment-Specific Settings**:

| Environment | Value   | Rationale                                               |
| ----------- | ------- | ------------------------------------------------------- |
| DEV         | `false` | MailHog doesn't support TLS                             |
| UAT         | `true`  | Production-like security (encrypted email transmission) |
| PROD        | `true`  | Security compliance requirement (data protection)       |

**Database Query**:

```sql
SELECT env_id, scf_value
FROM system_configuration_scf
WHERE scf_key = 'email.smtp.starttls.enabled'
ORDER BY env_id;

-- Expected Results:
-- env_id=1 (DEV):  scf_value='false'
-- env_id=3 (UAT):  scf_value='true'
-- env_id=2 (PROD): scf_value='true'
```

**Security Note**: STARTTLS encrypts email content during transmission, protecting sensitive step status information.

#### 3. email.smtp.connection.timeout.ms

**Purpose**: Control SMTP connection establishment timeout

**Type**: INTEGER (milliseconds)

**Values**:

- `5000` (5 seconds): DEV - fast feedback
- `15000` (15 seconds): UAT, PROD - network latency accommodation

**Environment-Specific Settings**:

| Environment | Value (ms) | Rationale                              |
| ----------- | ---------- | -------------------------------------- |
| DEV         | `5000`     | Local network - fast failure detection |
| UAT         | `15000`    | Production-like network latency        |
| PROD        | `15000`    | Accommodate corporate network routing  |

**Database Query**:

```sql
SELECT env_id, scf_value
FROM system_configuration_scf
WHERE scf_key = 'email.smtp.connection.timeout.ms'
ORDER BY env_id;

-- Expected Results:
-- env_id=1 (DEV):  scf_value='5000'
-- env_id=3 (UAT):  scf_value='15000'
-- env_id=2 (PROD): scf_value='15000'
```

**Tuning Guidance**: Increase if connection timeout errors occur frequently (check network latency).

#### 4. email.smtp.timeout.ms

**Purpose**: Control SMTP operation timeout (email sending, including large attachments)

**Type**: INTEGER (milliseconds)

**Values**:

- `5000` (5 seconds): DEV - fast feedback
- `30000` (30 seconds): UAT, PROD - large email accommodation

**Environment-Specific Settings**:

| Environment | Value (ms) | Rationale                                 |
| ----------- | ---------- | ----------------------------------------- |
| DEV         | `5000`     | Simple test emails - fast failure         |
| UAT         | `30000`    | Production-like email sizes               |
| PROD        | `30000`    | Accommodate large step instruction emails |

**Database Query**:

```sql
SELECT env_id, scf_value
FROM system_configuration_scf
WHERE scf_key = 'email.smtp.timeout.ms'
ORDER BY env_id;

-- Expected Results:
-- env_id=1 (DEV):  scf_value='5000'
-- env_id=3 (UAT):  scf_value='30000'
-- env_id=2 (PROD): scf_value='30000'
```

**Tuning Guidance**: Increase if timeout errors occur when sending emails with large instruction content.

---

## Environment-Specific Settings

### DEV Environment (Development)

**Purpose**: Local development and testing with MailHog

#### Confluence SMTP Settings

```yaml
smtp_server:
  name: MailHog Development Server
  hostname: umig_mailhog
  port: 1025
  from_address: umig-dev@example.com
  authentication: false
  tls: false
  default: true
```

#### ConfigurationService Overrides

```yaml
email.smtp.auth.enabled: false
email.smtp.starttls.enabled: false
email.smtp.connection.timeout.ms: 5000
email.smtp.timeout.ms: 5000
```

#### MailHog Verification

```bash
# Start development stack
npm start

# Trigger test email
# (Through UMIG step status change)

# Check MailHog inbox
open http://localhost:8025

# Verify email received
# Subject: "Step Status Changed: [step_name]"
# From: umig-dev@example.com
```

#### Configuration Verification Query

```sql
SELECT scf_key, scf_value
FROM system_configuration_scf
WHERE env_id = (SELECT env_id FROM environments_env WHERE env_code = 'DEV')
  AND scf_key LIKE 'email.smtp%'
ORDER BY scf_key;

-- Expected: 4 rows (auth=false, starttls=false, connection=5000, timeout=5000)
```

### UAT Environment (User Acceptance Testing)

**Purpose**: Production-like testing with real SMTP server

#### Confluence SMTP Settings

```yaml
smtp_server:
  name: UAT SMTP Server
  hostname: [UAT SMTP hostname - from IT infrastructure]
  port: 587
  from_address: umig-uat@organization.com
  authentication: true
  username: [UAT SMTP username]
  password: [UAT SMTP password - securely managed]
  tls: STARTTLS
  default: true
```

#### ConfigurationService Overrides

```yaml
email.smtp.auth.enabled: true
email.smtp.starttls.enabled: true
email.smtp.connection.timeout.ms: 15000
email.smtp.timeout.ms: 30000
```

#### UAT Email Verification

```bash
# Trigger test email in UAT
# (Through UMIG step status change or API call)

# Check recipient inbox
# Verify:
# - Email received successfully
# - From: umig-uat@organization.com
# - Links to UAT Confluence instance
# - STARTTLS encryption used
```

#### Configuration Verification Query

```sql
SELECT scf_key, scf_value
FROM system_configuration_scf
WHERE env_id = (SELECT env_id FROM environments_env WHERE env_code = 'UAT')
  AND scf_key LIKE 'email.smtp%'
ORDER BY scf_key;

-- Expected: 4 rows (auth=true, starttls=true, connection=15000, timeout=30000)
```

### PROD Environment (Production)

**Purpose**: Production email notifications with full security

#### Confluence SMTP Settings

```yaml
smtp_server:
  name: Production SMTP Server
  hostname: [Production SMTP hostname - from IT infrastructure]
  port: 587
  from_address: umig-notifications@organization.com
  authentication: true
  username: [Production SMTP username]
  password: [Production SMTP password - securely managed]
  tls: STARTTLS
  certificate_validation: enabled
  default: true
```

#### ConfigurationService Overrides

```yaml
email.smtp.auth.enabled: true
email.smtp.starttls.enabled: true
email.smtp.connection.timeout.ms: 15000
email.smtp.timeout.ms: 30000
```

#### Production Validation Checklist

```
Pre-Deployment:
☐ SMTP server configured in Confluence Admin
☐ Test email sent through Confluence UI (successful)
☐ ConfigurationService values verified (query below)
☐ Security review completed (no credentials in UMIG DB)
☐ Monitoring alerts configured for SMTP failures

Post-Deployment:
☐ Send test email through UMIG
☐ Verify email delivery to stakeholder
☐ Check SMTP health endpoint status
☐ Monitor email sending logs for errors
☐ Validate STARTTLS encryption active
```

#### Configuration Verification Query

```sql
SELECT scf_key, scf_value
FROM system_configuration_scf
WHERE env_id = (SELECT env_id FROM environments_env WHERE env_code = 'PROD')
  AND scf_key LIKE 'email.smtp%'
ORDER BY scf_key;

-- Expected: 4 rows (auth=true, starttls=true, connection=15000, timeout=30000)
```

---

## Validation Queries

### Complete Configuration Audit

```sql
-- Complete audit of all email SMTP configurations across all environments
SELECT
    e.env_name,
    scf.scf_key,
    scf.scf_value,
    scf.scf_data_type,
    scf.scf_is_active,
    scf.created_by,
    scf.created_at
FROM system_configuration_scf scf
JOIN environments_env e ON scf.env_id = e.env_id
WHERE scf.scf_key LIKE 'email.smtp%'
  AND scf.scf_is_active = TRUE
ORDER BY scf.scf_key, e.env_name;

-- Expected: 12 rows total (4 keys × 3 environments)
```

### Environment-Specific Configuration Check

```sql
-- Check configuration for specific environment (replace 'PROD' with DEV or UAT as needed)
SELECT
    scf_key,
    scf_value,
    scf_data_type,
    scf_description
FROM system_configuration_scf
WHERE env_id = (SELECT env_id FROM environments_env WHERE env_code = 'PROD')
  AND scf_key LIKE 'email.smtp%'
  AND scf_is_active = TRUE
ORDER BY scf_key;

-- Expected: 4 rows for specified environment
```

### Configuration Consistency Check

```sql
-- Verify all environments have all 4 email SMTP keys configured
SELECT
    e.env_name,
    COUNT(DISTINCT scf.scf_key) AS config_count,
    CASE
        WHEN COUNT(DISTINCT scf.scf_key) = 4 THEN '✅ Complete'
        ELSE '❌ Missing configs'
    END AS status
FROM environments_env e
LEFT JOIN system_configuration_scf scf ON e.env_id = scf.env_id
    AND scf.scf_key LIKE 'email.smtp%'
    AND scf.scf_is_active = TRUE
WHERE e.env_code IN ('DEV', 'UAT', 'PROD')
GROUP BY e.env_name
ORDER BY e.env_name;

-- Expected: All environments show '✅ Complete' with config_count=4
```

### Active vs Inactive Configuration Check

```sql
-- Identify any inactive email SMTP configurations
SELECT
    e.env_name,
    scf.scf_key,
    scf.scf_value,
    scf.scf_is_active,
    CASE
        WHEN scf.scf_is_active = FALSE THEN '⚠️ INACTIVE - May cause issues'
        ELSE '✅ Active'
    END AS status
FROM system_configuration_scf scf
JOIN environments_env e ON scf.env_id = e.env_id
WHERE scf.scf_key LIKE 'email.smtp%'
ORDER BY scf.scf_is_active, e.env_name, scf.scf_key;

-- Expected: All configurations should be active (scf_is_active = TRUE)
```

### Migration 035 Deployment Verification

```sql
-- Verify Migration 035 deployed all expected configurations
SELECT
    scf_category,
    COUNT(*) AS config_count,
    COUNT(DISTINCT scf_key) AS unique_keys
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
  AND scf_category IN ('general', 'performance', 'infrastructure', 'MACRO_LOCATION')
GROUP BY scf_category
ORDER BY scf_category;

-- Expected:
-- general: 6 configs
-- performance: 12 configs
-- infrastructure: 3 configs
-- MACRO_LOCATION: 6 configs
-- Total: 27 configs
```

---

## Troubleshooting

### Common Issues

#### Issue 1: No SMTP Server Configured

**Symptoms**:

- Error: "No SMTP server configured in Confluence"
- Email sending fails with `IllegalStateException`
- Health check shows `smtpConfiguration.status = 'DOWN'`

**Diagnosis**:

```sql
-- Check if Confluence SMTP is configured (via MailServerManager)
-- Note: This query checks UMIG configurations, not Confluence SMTP directly
SELECT COUNT(*) AS smtp_configs
FROM system_configuration_scf
WHERE scf_key LIKE 'email.smtp%'
  AND scf_is_active = TRUE;

-- If count < 4, ConfigurationService missing configs (not Confluence SMTP issue)
```

**Solution**:

1. Log in to Confluence as Administrator
2. Navigate to: ⚙️ → General Configuration → Mail Servers
3. Click "Add SMTP Mail Server"
4. Configure SMTP settings (see [Confluence SMTP Configuration](#confluence-smtp-configuration))
5. Set as default mail server
6. Send test email through Confluence UI
7. Restart UMIG application (if needed)

**Verification**:

```groovy
// Execute in ScriptRunner Console
import umig.utils.EnhancedEmailService
def health = EnhancedEmailService.checkSMTPHealth()
println health

// Expected: {status: 'UP', available: true, smtpHost: '...', smtpPort: ...}
```

#### Issue 2: Authentication Failures

**Symptoms**:

- Error: "535 Authentication failed"
- Email sending fails with `AuthenticationFailedException`
- SMTP server rejects credentials

**Diagnosis**:

```sql
-- Check authentication flag for current environment
SELECT scf_value
FROM system_configuration_scf
WHERE scf_key = 'email.smtp.auth.enabled'
  AND env_id = (SELECT env_id FROM environments_env WHERE env_code = 'PROD');

-- Expected: 'true' for PROD/UAT, 'false' for DEV
```

**Solutions**:

**Solution A**: Verify Confluence SMTP credentials

1. Confluence Admin → Mail Servers
2. Edit SMTP server configuration
3. Verify username and password correct
4. Send test email through Confluence UI
5. If successful, issue is in UMIG code integration

**Solution B**: Verify ConfigurationService authentication flag

```sql
-- Enable authentication for production
UPDATE system_configuration_scf
SET scf_value = 'true'
WHERE scf_key = 'email.smtp.auth.enabled'
  AND env_id = (SELECT env_id FROM environments_env WHERE env_code = 'PROD');
```

**Solution C**: Check SMTP server allows authentication from Confluence IP

- Contact IT infrastructure team
- Verify firewall rules allow Confluence → SMTP server (port 587)
- Check SMTP server authentication logs

**Verification**:

```bash
# Test SMTP authentication manually
telnet [smtp-host] 587
EHLO localhost
STARTTLS
AUTH LOGIN
[base64-encoded-username]
[base64-encoded-password]

# Expected: "235 Authentication successful"
```

#### Issue 3: Timeout Errors

**Symptoms**:

- Error: "Connection timed out" or "Read timed out"
- Email sending slow or fails intermittently
- Health check shows `status: 'ERROR'`

**Diagnosis**:

```sql
-- Check current timeout values
SELECT scf_key, scf_value
FROM system_configuration_scf
WHERE scf_key IN ('email.smtp.connection.timeout.ms', 'email.smtp.timeout.ms')
  AND env_id = (SELECT env_id FROM environments_env WHERE env_code = 'PROD')
ORDER BY scf_key;

-- Current: connection=15000ms, operation=30000ms
```

**Solutions**:

**Solution A**: Increase connection timeout

```sql
-- Increase to 30 seconds if network latency high
UPDATE system_configuration_scf
SET scf_value = '30000'
WHERE scf_key = 'email.smtp.connection.timeout.ms'
  AND env_id = (SELECT env_id FROM environments_env WHERE env_code = 'PROD');
```

**Solution B**: Increase operation timeout

```sql
-- Increase to 60 seconds for large emails
UPDATE system_configuration_scf
SET scf_value = '60000'
WHERE scf_key = 'email.smtp.timeout.ms'
  AND env_id = (SELECT env_id FROM environments_env WHERE env_code = 'PROD');
```

**Solution C**: Check network latency

```bash
# Test network latency to SMTP server
ping [smtp-host]

# Expected: Average latency < 100ms
# If > 200ms, increase timeouts accordingly
```

**Verification**:

- Trigger test email
- Monitor logs for timeout errors
- Adjust timeouts incrementally until emails send successfully

#### Issue 4: TLS/STARTTLS Errors

**Symptoms**:

- Error: "STARTTLS is required"
- Error: "SSLHandshakeException"
- Certificate validation failures

**Diagnosis**:

```sql
-- Check STARTTLS configuration
SELECT scf_value
FROM system_configuration_scf
WHERE scf_key = 'email.smtp.starttls.enabled'
  AND env_id = (SELECT env_id FROM environments_env WHERE env_code = 'PROD');

-- Expected: 'true' for PROD/UAT
```

**Solutions**:

**Solution A**: Enable STARTTLS in ConfigurationService

```sql
-- Enable STARTTLS for production
UPDATE system_configuration_scf
SET scf_value = 'true'
WHERE scf_key = 'email.smtp.starttls.enabled'
  AND env_id = (SELECT env_id FROM environments_env WHERE env_code = 'PROD');
```

**Solution B**: Verify Confluence SMTP server uses correct port

- Port 587 → STARTTLS (recommended)
- Port 465 → Implicit SSL/TLS
- Port 25 → Unencrypted (not recommended)

**Solution C**: Trust SMTP server certificate

```bash
# Import SMTP server certificate to Confluence JVM keystore
keytool -import -alias smtp-server \
  -file smtp-server.crt \
  -keystore $JAVA_HOME/jre/lib/security/cacerts \
  -storepass changeit

# Restart Confluence after certificate import
```

**Verification**:

```bash
# Test STARTTLS support
openssl s_client -connect [smtp-host]:587 -starttls smtp

# Expected: Shows certificate chain and "CONNECTED"
```

#### Issue 5: Health Check Shows SMTP DOWN

**Symptoms**:

- `checkSMTPHealth()` returns `status: 'DOWN'`
- `healthCheck()` shows `status: 'degraded'`
- Email functionality unavailable

**Diagnosis**:

```groovy
// Execute in ScriptRunner Console
import umig.utils.EnhancedEmailService
def health = EnhancedEmailService.checkSMTPHealth()
println groovy.json.JsonOutput.prettyPrint(groovy.json.JsonOutput.toJson(health))

// Examine 'error' field for specific issue
```

**Solutions by Error Message**:

| Error Message                       | Solution                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| "MailServerManager not initialized" | Restart Confluence, check ComponentLocator availability                              |
| "No default SMTP server configured" | Configure SMTP in Confluence Admin (see [Step 2](#step-2-add-smtp-mail-server))      |
| "Connection refused"                | Check SMTP server running, firewall rules                                            |
| "Authentication failed"             | Verify Confluence SMTP credentials (see [Issue 2](#issue-2-authentication-failures)) |
| "Unknown host"                      | Verify SMTP hostname DNS resolution                                                  |

**Verification After Fix**:

```groovy
// Re-check health after applying fix
import umig.utils.EnhancedEmailService
def health = EnhancedEmailService.checkSMTPHealth()
assert health.status == 'UP', "SMTP still not healthy: ${health.error}"
println "✅ SMTP health check successful"
```

---

## Additional Resources

### Documentation References

- **Confluence SMTP Integration Guide**: `/docs/technical/Confluence-SMTP-Integration-Guide.md`
- **Phase 5 Completion Summary**: `/claudedocs/US-098-Phase5-COMPLETION-SUMMARY.md`
- **ScriptRunner Deployment Guide**: `/claudedocs/US-098-Phase5-ScriptRunner-Deployment-Guide.md`
- **Migration 035 SQL**: `/local-dev-setup/liquibase/changelogs/035_us098_phase4_batch1_revised.sql`

### Related ADRs

- **ADR-067**: Configuration Management System Architecture
- **ADR-068**: Configuration Security Framework
- **ADR-069**: Configuration Migration Strategy
- **ADR-070**: Configuration Deployment Process

### Support Contacts

- **UMIG Development Team**: For code-related issues
- **Confluence Administrators**: For Confluence SMTP configuration
- **IT Infrastructure Team**: For SMTP server details, credentials, firewall rules
- **DevOps Team**: For deployment and configuration management

---

**Document Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Maintained By**: UMIG Development Team
**Review Frequency**: Quarterly or when environment changes occur
