# US-098 Phase 5 ScriptRunner Deployment Guide

**Purpose**: Step-by-step deployment and validation procedures for Phase 5 in ScriptRunner/Confluence environment

**Target Audience**: DevOps Engineers, Confluence Administrators, UMIG Deployment Team

**Last Updated**: 2025-10-06

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Steps](#deployment-steps)
4. [Post-Deployment Validation](#post-deployment-validation)
5. [Rollback Procedure](#rollback-procedure)

---

## Overview

### Deployment Scope

Phase 5 deployment replaces hardcoded SMTP configuration with Confluence MailServerManager API integration, enabling environment-specific email behavior through ConfigurationService overrides.

**Files to Deploy**:

1. `src/groovy/umig/utils/EnhancedEmailService.groovy` (MODIFIED)
2. `src/groovy/umig/tests/helpers/MailServerManagerMockHelper.groovy` (NEW)
3. `src/groovy/umig/tests/unit/EnhancedEmailServicePhase5Test.groovy` (NEW)
4. `src/groovy/umig/tests/integration/EnhancedEmailServiceMailHogTest.groovy` (MODIFIED - documentation only)

### Deployment Prerequisites

**Must Complete Before Deployment**:

- ✅ Migration 035 deployed to target database
- ✅ Confluence SMTP server configured (see Configuration Guide)
- ✅ ConfigurationService values verified (27 configurations)
- ✅ Development environment running (`npm start` for DEV)
- ✅ Database backup completed
- ✅ Previous EnhancedEmailService.groovy backed up

### Deployment Environments

| Environment | Deployment Method             | Validation                 |
| ----------- | ----------------------------- | -------------------------- |
| **DEV**     | ScriptRunner UI manual upload | MailHog integration test   |
| **UAT**     | ScriptRunner UI manual upload | Real SMTP integration test |
| **PROD**    | ScriptRunner UI manual upload | Smoke test with monitoring |

**Note**: ScriptRunner does not support automated deployment - all uploads are manual through Confluence Admin UI.

---

## Pre-Deployment Checklist

### Step 1: Database Prerequisites

#### 1.1 Verify Migration 035 Deployed

```sql
-- Check Migration 035 configuration count
SELECT COUNT(*) AS total_configs
FROM system_configuration_scf
WHERE created_by = 'US-098-migration';

-- Expected Result: 27 rows
-- If count ≠ 27: Deploy Migration 035 first
```

#### 1.2 Verify Environment Records Exist

```sql
-- Check environment records
SELECT env_id, env_code, env_name
FROM environments_env
WHERE env_code IN ('DEV', 'UAT', 'PROD')
ORDER BY env_id;

-- Expected Results:
-- env_id=1, env_code='DEV', env_name='Development'
-- env_id=2, env_code='PROD', env_name='Production'
-- env_id=3, env_code='UAT', env_name='User Acceptance Testing'
```

#### 1.3 Verify Email SMTP Configurations

```sql
-- Check email SMTP configurations for current environment
SELECT
    e.env_name,
    scf.scf_key,
    scf.scf_value,
    scf.scf_is_active
FROM system_configuration_scf scf
JOIN environments_env e ON scf.env_id = e.env_id
WHERE scf.scf_key LIKE 'email.smtp%'
  AND scf.scf_is_active = TRUE
ORDER BY e.env_name, scf.scf_key;

-- Expected: 12 rows (4 keys × 3 environments)
-- Verify values match environment (DEV: auth=false, PROD: auth=true)
```

### Step 2: Confluence SMTP Prerequisites

#### 2.1 Verify Confluence SMTP Configured

**Access**: Confluence Admin → General Configuration → Mail Servers

**Verification Checklist**:

- [ ] At least one SMTP server configured
- [ ] SMTP server set as **Default** (important!)
- [ ] Test email sent successfully through Confluence UI
- [ ] From address matches expected (umig-dev@example.com for DEV)

**DEV Environment** (MailHog):

```
Expected Configuration:
├── Hostname: umig_mailhog
├── Port: 1025
├── Authentication: None
├── TLS: No
└── Default: Yes ✓
```

**UAT/PROD Environments**:

```
Expected Configuration:
├── Hostname: [Organization SMTP server]
├── Port: 587
├── Authentication: Username + Password
├── TLS: Yes (STARTTLS)
└── Default: Yes ✓
```

#### 2.2 Test Confluence SMTP

1. Navigate to: Confluence Admin → Mail Servers
2. Click **Send Test Email** button
3. Enter recipient email address
4. Verify email received:
   - **DEV**: Check MailHog UI at http://localhost:8025
   - **UAT/PROD**: Check recipient's inbox

**If test email fails**: Fix Confluence SMTP configuration before proceeding.

### Step 3: Backup Current Code

#### 3.1 Export Current EnhancedEmailService.groovy

**Access**: ScriptRunner → Built-in Scripts → Script Registry

1. Locate `EnhancedEmailService.groovy` in script list
2. Click **Edit** (or open in Script Console if not in registry)
3. Click **Copy** to copy entire script content
4. Save backup to local file:
   - Filename: `EnhancedEmailService.groovy.backup-YYYY-MM-DD`
   - Location: `/Users/lucaschallamel/Documents/GitHub/UMIG/claudedocs/backups/`

**Alternative Backup Method**:

```bash
# If EnhancedEmailService.groovy is in ScriptRunner file system
# SSH into Confluence server and copy file
cp /path/to/scriptrunner/scripts/EnhancedEmailService.groovy \
   /path/to/backup/EnhancedEmailService.groovy.backup-$(date +%Y-%m-%d)
```

#### 3.2 Verify Backup Integrity

```bash
# Check backup file exists and has content
ls -lh /Users/lucaschallamel/Documents/GitHub/UMIG/claudedocs/backups/EnhancedEmailService.groovy.backup-*

# Expected: File size ~50-70 KB (similar to current EnhancedEmailService.groovy)
```

### Step 4: Development Environment Verification

**For DEV Environment Only**:

#### 4.1 Start Development Stack

```bash
# Navigate to project root
cd /Users/lucaschallamel/Documents/GitHub/UMIG

# Start complete development stack
npm start

# Verify all services running:
# - Confluence: http://localhost:8090
# - PostgreSQL: localhost:5432
# - MailHog: http://localhost:8025
```

#### 4.2 Verify MailHog Availability

```bash
# Check MailHog web UI accessible
curl -I http://localhost:8025

# Expected: HTTP/1.1 200 OK

# Open MailHog UI in browser
open http://localhost:8025
```

#### 4.3 Clear MailHog Inbox

```bash
# Clear existing test emails
npm run mailhog:clear

# Verify inbox empty
npm run mailhog:check
# Expected: Message count: 0
```

---

## Deployment Steps

### Step 1: Deploy EnhancedEmailService.groovy to ScriptRunner

#### 1.1 Access ScriptRunner Script Console

1. Log in to Confluence with administrator credentials
2. Navigate to: **⚙️ Settings** → **Manage Apps** → **ScriptRunner** → **Script Console**
3. Ensure correct **Environment** selected (DEV, UAT, or PROD)

#### 1.2 Load Updated EnhancedEmailService.groovy

**Option A: Copy/Paste from Local File**

1. Open local file: `/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/utils/EnhancedEmailService.groovy`
2. Select all content (Cmd+A)
3. Copy to clipboard (Cmd+C)
4. Paste into ScriptRunner Script Console (Cmd+V)

**Option B: Upload File via ScriptRunner UI**

1. Click **File** → **Upload Script**
2. Select: `/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/utils/EnhancedEmailService.groovy`
3. Confirm upload

#### 1.3 Verify Script Compilation

1. Click **Run** button in ScriptRunner Console
2. Verify **No compilation errors** in output
3. Check for initialization message:
   ```
   ✅ EnhancedEmailService: MailServerManager initialized successfully
   ```

**If compilation errors occur**:

- Check for missing imports (Confluence mail API)
- Verify ScriptRunner version compatibility
- Review error messages and fix syntax issues

### Step 2: Deploy Test Helper (Optional but Recommended)

#### 2.1 Deploy MailServerManagerMockHelper.groovy

**Purpose**: Enables unit testing in ScriptRunner Console (optional for PROD)

**Access**: ScriptRunner → Script Console

1. Open local file: `/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/helpers/MailServerManagerMockHelper.groovy`
2. Copy entire content
3. Paste into ScriptRunner Script Console
4. Click **Run** to verify compilation
5. Expected output: No errors, helper class loaded

### Step 3: Deploy Phase 5 Unit Tests

#### 3.1 Deploy EnhancedEmailServicePhase5Test.groovy

**Purpose**: Validate Phase 5 changes in ScriptRunner environment

**Access**: ScriptRunner → Script Console

1. Open local file: `/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/unit/EnhancedEmailServicePhase5Test.groovy`
2. Copy entire content
3. Paste into ScriptRunner Script Console
4. Click **Run** to execute all 6 tests
5. Monitor output for test results

**Expected Output**:

```
🧪 Running Phase 5 Unit Tests...

Test 1: checkSMTPHealth() with configured server... ✅ PASSED
Test 2: checkSMTPHealth() without configured server... ✅ PASSED
Test 3: healthCheck() includes SMTP status (configured)... ✅ PASSED
Test 4: healthCheck() includes SMTP status (not configured)... ✅ PASSED
Test 5: Mock helper creates valid mocks... ✅ PASSED
Test 6: Authenticated SMTP configuration... ✅ PASSED

📊 Test Results: 6/6 PASSED (100%)
```

**If tests fail**:

- Review error messages for specific failure reasons
- Verify Confluence SMTP configured (Tests 1, 3 require SMTP server)
- Check MailServerManager initialization (printed in console)
- Ensure Migration 035 deployed (ConfigurationService required)

### Step 4: Verify Service Registration

#### 4.1 Check EnhancedEmailService in ScriptRunner Registry

**Access**: ScriptRunner → Built-in Scripts → Script Registry

1. Search for: `EnhancedEmailService`
2. Verify **Status**: Active
3. Verify **Last Modified**: Current date/time
4. Verify **Version**: Includes Phase 5 changes

#### 4.2 Test Service Import in Script Console

```groovy
// Execute in ScriptRunner Console to verify import works
import umig.utils.EnhancedEmailService

// Test MailServerManager initialization
println "Testing MailServerManager availability..."
def health = EnhancedEmailService.checkSMTPHealth()
println "SMTP Health: ${health}"

// Expected Output:
// ✅ MailServerManager initialized successfully
// SMTP Health: [status:UP, available:true, smtpHost:..., smtpPort:...]
```

---

## Post-Deployment Validation

### Step 1: Execute checkSMTPHealth() Method

#### 1.1 Run Health Check in ScriptRunner Console

```groovy
import umig.utils.EnhancedEmailService
import groovy.json.JsonOutput

// Execute SMTP health check
def health = EnhancedEmailService.checkSMTPHealth()

// Pretty-print results
println JsonOutput.prettyPrint(JsonOutput.toJson(health))

// Expected Output (DEV - MailHog):
// {
//     "status": "UP",
//     "available": true,
//     "smtpHost": "umig_mailhog",
//     "smtpPort": 1025,
//     "defaultFrom": "umig-dev@example.com",
//     "timestamp": "2025-10-06T14:30:00.000Z"
// }
```

**Success Criteria**:

- `status: 'UP'`
- `available: true`
- `smtpHost` matches Confluence SMTP configuration
- `smtpPort` correct (1025 for DEV, 587 for UAT/PROD)

**If health check fails**:

- Check Confluence SMTP configured (see [Pre-Deployment Checklist](#step-2-confluence-smtp-prerequisites))
- Review error message in health check response
- Verify MailServerManager initialization in console logs

### Step 2: Execute healthCheck() Method

#### 2.1 Run Enhanced Health Check

```groovy
import umig.utils.EnhancedEmailService
import groovy.json.JsonOutput

// Execute complete health check (includes SMTP status)
def health = EnhancedEmailService.healthCheck()

// Pretty-print results
println JsonOutput.prettyPrint(JsonOutput.toJson(health))

// Expected Output:
// {
//     "service": "EnhancedEmailService",
//     "status": "healthy",
//     "urlConstruction": { ... },
//     "smtpConfiguration": {
//         "status": "UP",
//         "available": true,
//         "smtpHost": "...",
//         "smtpPort": ...
//     },
//     "capabilities": {
//         "dynamicUrls": true,
//         "emailTemplates": true,
//         "auditLogging": true,
//         "smtpIntegration": true
//     },
//     "timestamp": "..."
// }
```

**Success Criteria**:

- `status: 'healthy'`
- `smtpConfiguration.available: true`
- `capabilities.smtpIntegration: true`

### Step 3: Trigger Test Email

#### 3.1 Send Test Email via Step Status Change (DEV)

**Method**: Trigger step status change notification

1. Access UMIG Admin GUI
2. Navigate to a step instance
3. Change step status (e.g., "Not Started" → "In Progress")
4. Submit status change
5. Monitor console logs for email sending confirmation

**Expected Console Output**:

```
🔧 [EnhancedEmailService] sendEmail() - MailServerManager API integration
🔧 Recipients: [user@example.com, team@example.com]
🔧 Subject: Step Status Changed: [step_name]
✅ Using SMTP server: umig_mailhog:1025
📧 SMTP Configuration:
   - Host: umig_mailhog
   - Port: 1025
   - Auth: false
   - TLS: false
   - Connection Timeout: 5000ms
   - Operation Timeout: 5000ms
📤 Sending to: user@example.com
✅ Email sent successfully to user@example.com
📊 Email batch result: SUCCESS
```

#### 3.2 Verify Email in MailHog (DEV Only)

1. Open MailHog UI: http://localhost:8025
2. Verify email received:
   - **Subject**: "Step Status Changed: [step_name]"
   - **From**: umig-dev@example.com
   - **To**: Expected recipients
   - **Body**: Contains step information and dynamic URL

**Success Criteria**:

- Email appears in MailHog inbox within 5 seconds
- All recipients listed in "To:" field
- Email body contains correct step details
- Dynamic URL points to correct Confluence page

#### 3.3 Verify ConfigurationService Overrides Applied

**Check Console Logs** for override confirmation:

```
🔧 Applied ConfigurationService override: auth=false
🔧 Applied ConfigurationService override: starttls=false
🔧 Applied ConfigurationService override: connectionTimeout=5000ms
🔧 Applied ConfigurationService override: operationTimeout=5000ms
```

**Verification Query**:

```sql
-- Verify ConfigurationService values match console logs
SELECT scf_key, scf_value
FROM system_configuration_scf
WHERE env_id = (SELECT env_id FROM environments_env WHERE env_code = 'DEV')
  AND scf_key LIKE 'email.smtp%'
ORDER BY scf_key;

-- Expected:
-- email.smtp.auth.enabled: false
-- email.smtp.starttls.enabled: false
-- email.smtp.connection.timeout.ms: 5000
-- email.smtp.timeout.ms: 5000
```

### Step 4: Integration Test Execution (Optional)

#### 4.1 Run EnhancedEmailServiceMailHogTest.groovy

**Purpose**: Comprehensive integration test with real database and MailHog

**Prerequisites**:

- Development environment running (`npm start`)
- MailHog accessible (localhost:1025)
- Database connection active

**Execution**:

```groovy
// Execute in ScriptRunner Console
import umig.tests.integration.EnhancedEmailServiceMailHogTest

// Run all integration tests
EnhancedEmailServiceMailHogTest.main([] as String[])

// Monitor output for test results
```

**Expected Output**:

```
🧪 Running MailHog Integration Tests...

Test: Send email via MailServerManager API... ✅ PASSED
Test: ConfigurationService overrides applied... ✅ PASSED
Test: Email received in MailHog... ✅ PASSED
Test: Dynamic URL construction works... ✅ PASSED

📊 Integration Test Results: 4/4 PASSED (100%)
```

### Step 5: UAT/PROD Smoke Tests

**For UAT and PROD Environments Only**

#### 5.1 Send Test Email to Known Recipient

```groovy
// Execute in ScriptRunner Console (UAT/PROD)
import umig.utils.EnhancedEmailService

// Send simple test email
def recipients = ['test-recipient@organization.com']
def subject = 'UMIG Phase 5 Deployment Test'
def body = '''
<html>
<body>
    <h2>UMIG Phase 5 Deployment Verification</h2>
    <p>This is a test email to verify Phase 5 deployment.</p>
    <p>If you receive this email, the deployment is successful.</p>
    <p><strong>Environment:</strong> UAT (or PROD)</p>
    <p><strong>Timestamp:</strong> ''' + new Date() + '''</p>
</body>
</html>
'''

// Send email (uses MailServerManager API + ConfigurationService overrides)
def result = EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
    [:], // stepInstance (not used for test)
    [], // teams
    [:], // cutoverTeam
    'Test', // oldStatus
    'Test', // newStatus
    null, // userId
    null, // migrationCode
    null // iterationCode
)

println "Email Send Result: ${result}"
// Expected: {success: true, emailCount: 1}
```

#### 5.2 Verify Recipient Receives Email

**Verification Steps**:

1. Check recipient's inbox within 1-2 minutes
2. Verify email received with correct subject
3. Verify email from correct address (umig-uat@organization.com or umig-notifications@organization.com)
4. Verify STARTTLS encryption used (check email headers)

**Email Headers to Verify**:

```
From: umig-notifications@organization.com
To: test-recipient@organization.com
Subject: UMIG Phase 5 Deployment Test
X-Mailer: JavaMail
X-Transport: STARTTLS (for UAT/PROD)
```

#### 5.3 Monitor Confluence Logs

**Check for errors**:

```bash
# View Confluence application logs
tail -f /path/to/confluence/logs/atlassian-confluence.log

# Look for:
# - MailServerManager initialization messages
# - Email sending confirmation
# - Any error messages related to SMTP
```

**Expected Log Entries**:

```
✅ EnhancedEmailService: MailServerManager initialized successfully
INFO: Using SMTP server: smtp.organization.com:587
INFO: Email sent successfully to test-recipient@organization.com
```

---

## Rollback Procedure

### When to Rollback

**Rollback Triggers**:

- ✅ All Phase 5 tests fail in ScriptRunner Console
- ✅ MailServerManager fails to initialize
- ✅ Emails fail to send in production
- ✅ Critical errors detected in Confluence logs
- ✅ Security vulnerability discovered in Phase 5 code

**Do NOT Rollback If**:

- ❌ Single test failure (investigate and fix instead)
- ❌ ConfigurationService values incorrect (fix values, not code)
- ❌ Confluence SMTP misconfigured (fix SMTP, not code)

### Rollback Steps

#### Step 1: Restore Previous EnhancedEmailService.groovy

**Access**: ScriptRunner → Script Console

1. Open backup file: `/Users/lucaschallamel/Documents/GitHub/UMIG/claudedocs/backups/EnhancedEmailService.groovy.backup-YYYY-MM-DD`
2. Copy entire content from backup
3. Paste into ScriptRunner Script Console
4. Click **Run** to verify compilation
5. Verify backup version loads successfully

**Verification**:

```groovy
// Check MailServerManager NOT initialized (old version)
import umig.utils.EnhancedEmailService

// Old version should NOT have checkSMTPHealth() method
try {
    EnhancedEmailService.checkSMTPHealth()
    println "❌ ROLLBACK FAILED - Still on Phase 5 version"
} catch (MissingMethodException e) {
    println "✅ ROLLBACK SUCCESSFUL - Reverted to pre-Phase 5 version"
}
```

#### Step 2: Verify System Stability

**Execute Basic Health Check**:

```groovy
import umig.utils.EnhancedEmailService

// Old healthCheck() method (should still work)
def health = EnhancedEmailService.healthCheck()
println health

// Expected: {service: 'EnhancedEmailService', status: 'healthy', ...}
// Note: No 'smtpConfiguration' field in old version
```

**Send Test Email** (using old implementation):

1. Trigger step status change
2. Verify email sent (uses hardcoded MailHog configuration)
3. Check MailHog inbox for email

**Success Criteria**:

- Email sending works
- No errors in Confluence logs
- System stable

#### Step 3: Rollback Migration 035 (If Necessary)

**⚠️ CRITICAL**: Only rollback Migration 035 if it causes database issues

**Rollback Query** (from Migration 035):

```sql
-- Rollback all Migration 035 configurations
DELETE FROM system_configuration_scf
WHERE created_by = 'US-098-migration';

-- Verify rollback
SELECT COUNT(*) FROM system_configuration_scf
WHERE created_by = 'US-098-migration';
-- Expected: 0 rows
```

**Note**: Rollback Migration 035 ONLY if ConfigurationService errors persist after code rollback.

#### Step 4: Document Rollback

**Create Rollback Report**:

**Filename**: `/Users/lucaschallamel/Documents/GitHub/UMIG/claudedocs/US-098-Phase5-Rollback-Report-YYYY-MM-DD.md`

**Contents**:

```markdown
# Phase 5 Rollback Report

**Date**: YYYY-MM-DD
**Environment**: DEV / UAT / PROD
**Rollback Reason**: [Describe why rollback was necessary]

## Rollback Actions Taken

- [ ] EnhancedEmailService.groovy reverted to backup version
- [ ] System stability verified
- [ ] Migration 035 rolled back (if applicable)
- [ ] Email sending tested and working

## Root Cause Analysis

[Describe what went wrong and why Phase 5 failed]

## Next Steps

[Plan for fixing issues and re-attempting Phase 5 deployment]
```

#### Step 5: Notify Stakeholders

**Notification Template**:

```
Subject: UMIG Phase 5 Deployment Rolled Back - [Environment]

Dear Stakeholders,

Phase 5 deployment to [Environment] has been rolled back due to [reason].

Current Status:
- System reverted to pre-Phase 5 version
- Email functionality restored
- System stable

Impact:
- Email notifications continue to work (hardcoded MailHog/SMTP)
- No feature loss for end users
- Phase 5 benefits (MailServerManager API) not available until re-deployment

Next Steps:
- Root cause analysis in progress
- Fix will be deployed after testing
- Timeline: [Estimated re-deployment date]

Please contact [UMIG Development Team] for questions.
```

---

## Additional Resources

### Documentation References

- **Phase 5 Completion Summary**: `/claudedocs/US-098-Phase5-COMPLETION-SUMMARY.md`
- **Configuration Guide**: `/claudedocs/US-098-Phase5-Configuration-Guide.md`
- **Confluence SMTP Integration Guide**: `/docs/technical/Confluence-SMTP-Integration-Guide.md`
- **Migration 035 SQL**: `/local-dev-setup/liquibase/changelogs/035_us098_phase4_batch1_revised.sql`

### Support Contacts

- **UMIG Development Team**: For deployment issues
- **Confluence Administrators**: For ScriptRunner and SMTP configuration
- **DevOps Team**: For environment and database issues
- **IT Infrastructure Team**: For SMTP server and network issues

### Deployment History

**Record all deployments in deployment log**:

**Filename**: `/Users/lucaschallamel/Documents/GitHub/UMIG/claudedocs/US-098-Phase5-Deployment-Log.md`

**Format**:

```markdown
# Phase 5 Deployment Log

## DEV Deployment

**Date**: YYYY-MM-DD
**Status**: Success / Failed / Rolled Back
**Deployed By**: [Name]
**Validation Results**: 6/6 tests passed
**Notes**: [Any issues or observations]

## UAT Deployment

**Date**: YYYY-MM-DD
**Status**: Success / Failed / Rolled Back
**Deployed By**: [Name]
**Validation Results**: Smoke test successful
**Notes**: [Any issues or observations]

## PROD Deployment

**Date**: YYYY-MM-DD
**Status**: Success / Failed / Rolled Back
**Deployed By**: [Name]
**Validation Results**: Smoke test successful
**Notes**: [Any issues or observations]
```

---

**Document Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Maintained By**: UMIG Development Team
**Review Frequency**: Before each deployment or quarterly
