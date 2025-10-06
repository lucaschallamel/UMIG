# US-098 Phase 5 Manual Testing Guide

## MailServerManager Integration Validation

**Document Version**: 1.0
**Created**: 2025-10-06
**User Story**: US-098 Phase 5 - Delegate SMTP Credentials to Confluence MailServerManager
**Total Estimated Time**: 85 minutes (1.5 hours)

---

## Executive Summary

This manual testing guide validates the critical US-098 Phase 5 integration that delegates SMTP credential management from application code to Confluence's built-in MailServerManager API. This architectural refactoring enhances security and maintainability by centralizing SMTP configuration.

**Critical Validation Gap**: Phase 5 code has never been deployed or tested in real Confluence/ScriptRunner environment - only unit tests with mocks exist.

**Testing Objectives**:

1. ✅ Validate MailServerManager API integration works in real Confluence
2. ✅ Execute 4/6 deferred integration tests requiring ScriptRunner Console
3. ✅ Send real test emails through refactored service
4. ✅ Validate ConfigurationService 4-tier override hierarchy

**Environment**: Local development (Confluence + PostgreSQL + MailHog)

---

## Table of Contents

1. [Prerequisites & Setup](#part-1-prerequisites--setup-10-minutes) (10 min)
2. [Deploy Phase 5 Code](#part-2-deploy-phase-5-code-15-minutes) (15 min)
3. [Execute Integration Tests](#part-3-execute-integration-tests-20-minutes) (20 min)
4. [Real Email Testing](#part-4-real-email-testing-20-minutes) (20 min)
5. [Configuration Override Validation](#part-5-configuration-override-validation-15-minutes) (15 min)
6. [Test Results Summary & Sign-Off](#part-6-test-results-summary--sign-off-5-minutes) (5 min)

---

## Part 1: Prerequisites & Setup (10 minutes)

### Section 1.1: Environment Verification ✅

**Objective**: Confirm development environment running and accessible

**Steps**:

1. **Verify development stack running**:

   ```bash
   # If not running, start environment
   cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup
   npm start

   # Wait for services to initialize (30-60 seconds)
   ```

2. **Check Confluence accessible**:
   - Open browser: http://localhost:8090
   - Login: `admin` / `123456`
   - Expected: Confluence dashboard loads successfully
   - **📸 Screenshot**: Confluence dashboard after login

3. **Check MailHog accessible**:
   - Open browser: http://localhost:8025
   - Expected: MailHog inbox interface loads (should be empty initially)
   - **📸 Screenshot**: MailHog inbox (empty state)

4. **Verify database connection**:

   ```bash
   psql -h localhost -p 5432 -U umig_app_user -d umig_app_db
   # Password: umig_app_password

   # Run quick test query
   \dt system_configuration_scf

   # Expected: Table exists
   # Exit: \q
   ```

**Expected Results**:

- ✅ All services accessible
- ✅ Database connection successful
- ✅ No error messages in logs

**Troubleshooting**:

- If services not running: `npm start` from `local-dev-setup/`
- If database connection fails: Check `.env` credentials match
- If Confluence won't load: Check `npm run logs:confluence` for errors

---

### Section 1.2: Confluence SMTP Configuration ✅

**Objective**: Configure Confluence to use MailHog for development email testing

**Steps**:

1. **Navigate to Confluence Admin Mail Servers**:
   - In Confluence: Click ⚙️ (Settings) → General Configuration
   - Left sidebar: Scroll to "Administration" section
   - Click: **Mail Servers**

2. **Add SMTP Server Configuration**:
   - Click: **Add SMTP Mail Server**
   - Fill in form:
     - **Name**: `MailHog (Development)`
     - **From Address**: `noreply@umig.dev`
     - **From Name**: `UMIG System`
     - **Prefix**: `[UMIG]`
     - **Host Name**: `localhost`
     - **Host Port**: `1025`
     - **Username**: _(leave blank - no auth for MailHog)_
     - **Password**: _(leave blank)_
     - **Use SSL/TLS**: _(unchecked)_
   - Click: **Save**

3. **Test SMTP Configuration**:
   - After saving, click: **Send Test Email**
   - Enter your email: `test@umig.dev`
   - Click: **Send**
   - Expected: "Email sent successfully" message

4. **Verify in MailHog**:
   - Switch to MailHog browser tab: http://localhost:8025
   - Expected: Test email from Confluence appears in inbox
   - **📸 Screenshot**: MailHog showing Confluence test email

5. **Clear MailHog inbox for clean testing**:
   ```bash
   cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup
   npm run mailhog:clear
   ```

**Expected Results**:

- ✅ SMTP server configured in Confluence
- ✅ Test email sent successfully
- ✅ Email received in MailHog
- ✅ Inbox cleared for Phase 5 tests

**Troubleshooting**:

- If test email fails: Verify hostname is `localhost`, not `127.0.0.1`
- If MailHog doesn't show email: Check MailHog running with `npm run logs:mailhog`
- If cannot save: Check Confluence logs for permission errors

---

### Section 1.3: Migration 035 Verification ✅

**Objective**: Verify Migration 035 SMTP configurations deployed to database

**Steps**:

1. **Connect to database**:

   ```bash
   psql -h localhost -p 5432 -U umig_app_user -d umig_app_db
   # Password: umig_app_password
   ```

2. **Execute verification query**:

   ```sql
   -- Verify Migration 035 configurations exist
   SELECT
       scf_key,
       scf_value,
       e.env_name,
       scf.created_by
   FROM system_configuration_scf scf
   JOIN environment_env e ON scf.env_id = e.env_id
   WHERE scf.created_by = 'US-098-migration'
   ORDER BY scf_key, env_name;
   ```

3. **Verify expected results**:
   - **Expected row count**: 14 rows (7 configs × 2 environments)
   - **Expected environments**: `DEV` and `PROD`
   - **Expected keys** (7 total):
     - `email.smtp.auth.enabled`
     - `email.smtp.starttls.enabled`
     - `email.smtp.connection.timeout.ms`
     - `email.smtp.timeout.ms`
     - `email.smtp.debug.enabled`
     - `email.smtp.ssl.trust`
     - `email.smtp.ssl.enabled`

4. **Verify critical DEV environment values**:

   ```sql
   -- Check DEV environment critical values
   SELECT scf_key, scf_value, e.env_name
   FROM system_configuration_scf scf
   JOIN environment_env e ON scf.env_id = e.env_id
   WHERE scf.created_by = 'US-098-migration'
     AND e.env_name = 'DEV'
     AND scf_key IN (
         'email.smtp.auth.enabled',
         'email.smtp.starttls.enabled',
         'email.smtp.connection.timeout.ms',
         'email.smtp.timeout.ms'
     )
   ORDER BY scf_key;
   ```

   **Expected DEV values**:
   - `email.smtp.auth.enabled` = `false`
   - `email.smtp.starttls.enabled` = `false`
   - `email.smtp.connection.timeout.ms` = `5000`
   - `email.smtp.timeout.ms` = `5000`

5. **Exit database**:
   ```sql
   \q
   ```

**Expected Results**:

- ✅ 14 configuration rows found
- ✅ DEV and PROD environments present
- ✅ All 7 SMTP configuration keys present
- ✅ DEV values match expected (auth disabled, short timeouts)

**Troubleshooting**:

- If no rows found: Migration 035 not deployed - check `db/migrations/` and Liquibase logs
- If wrong values: Database may have been manually modified - restore from migration
- If missing environment: Check `environment_env` table for DEV/PROD records

**📸 Screenshot**: psql terminal showing 14 configuration rows

---

### Section 1.4: ScriptRunner Console Access ✅

**Objective**: Verify ScriptRunner Console accessible and functional

**Steps**:

1. **Navigate to ScriptRunner Console**:
   - In Confluence: Click ⚙️ (Settings) → Manage apps
   - Left sidebar: Scroll to "SCRIPTRUNNER"
   - Click: **Script Console**
   - Alternative URL: http://localhost:8090/admin/plugins/scriptrunner/console.action

2. **Verify console loads**:
   - Expected: Groovy script editor appears
   - Expected: Execute button visible
   - **📸 Screenshot**: ScriptRunner Console interface

3. **Test basic Groovy execution**:
   - In script editor, enter:
     ```groovy
     println "Hello from ScriptRunner - Phase 5 Testing"
     return "Console is working!"
     ```
   - Click: **Execute** (or Ctrl+Enter)
   - Expected output in result panel:
     ```
     Hello from ScriptRunner - Phase 5 Testing
     Console is working!
     ```

4. **Test database access from console**:

   ```groovy
   import groovy.sql.Sql

   def db = [
       driver: 'org.postgresql.Driver',
       url: 'jdbc:postgresql://localhost:5432/umig_app_db',
       user: 'umig_app_user',
       password: 'umig_app_password'
   ]

   def sql = Sql.newInstance(db.url, db.user, db.password, db.driver)
   def count = sql.firstRow("SELECT COUNT(*) as cnt FROM system_configuration_scf WHERE created_by = 'US-098-migration'")
   sql.close()

   println "Migration 035 configurations found: ${count.cnt}"
   return "Database access: OK"
   ```

   - Expected: `Migration 035 configurations found: 14`

**Expected Results**:

- ✅ Console loads without errors
- ✅ Basic script executes successfully
- ✅ Database accessible from console
- ✅ Migration 035 data accessible

**Troubleshooting**:

- If console won't load: Check ScriptRunner license valid
- If script fails: Check Confluence logs for compilation errors
- If database fails: Verify `.env` credentials and PostgreSQL running

---

## Part 2: Deploy Phase 5 Code (15 minutes)

### Section 2.1: Deploy EnhancedEmailService.groovy ✅

**Objective**: Load refactored EnhancedEmailService into ScriptRunner classpath

**Steps**:

1. **Open EnhancedEmailService.groovy**:

   ```bash
   # Open in text editor
   code /Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/utils/EnhancedEmailService.groovy

   # Or read to terminal
   cat /Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/utils/EnhancedEmailService.groovy
   ```

2. **Copy entire file contents to clipboard**:
   - Select all content (Cmd+A)
   - Copy (Cmd+C)

3. **Create new script in ScriptRunner Console**:
   - In ScriptRunner Console editor, **clear existing code**
   - Paste EnhancedEmailService.groovy contents (Cmd+V)

4. **Execute to load into classpath**:
   - Click: **Execute** button
   - **This will take 5-10 seconds** - service has complex initialization

5. **Verify successful compilation**:
   - Expected output should include:
     ```
     ✅ EnhancedEmailService: MailServerManager initialized successfully
     ```
   - No compilation errors
   - No exception stack traces

6. **Verify MailServerManager initialization**:
   - Output should show MailServerManager detected Confluence SMTP configuration
   - If you see `⚠️ Failed to initialize MailServerManager`, check Confluence SMTP setup

**Expected Results**:

- ✅ No compilation errors
- ✅ MailServerManager initialized successfully
- ✅ Service loaded into ScriptRunner classpath
- ✅ Ready for testing

**Expected Output Example**:

```
✅ EnhancedEmailService: MailServerManager initialized successfully
Result: umig.utils.EnhancedEmailService
```

**Troubleshooting**:

- **Compilation error - class not found**: Missing dependency - check imports
- **MailServerManager not initialized**: Confluence SMTP not configured (Section 1.2)
- **Class already defined**: Clear console and paste again
- **Null pointer exception**: Check Confluence API availability

**📸 Screenshot**: ScriptRunner Console showing successful EnhancedEmailService compilation

---

### Section 2.2: Deploy Test Helper (Optional) ✅

**Objective**: Load MailServerManagerMockHelper for potential debugging

**Note**: This step is **optional** - only needed if you want to run mock-based tests. Integration tests in Part 3 use **real MailServerManager**, not mocks.

**Steps**:

1. **Open MailServerManagerMockHelper.groovy**:

   ```bash
   cat /Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/helpers/MailServerManagerMockHelper.groovy
   ```

2. **Copy file contents**:
   - Select all content (Cmd+A)
   - Copy (Cmd+C)

3. **Load in ScriptRunner Console**:
   - In console editor, clear existing code
   - Paste MailServerManagerMockHelper.groovy contents (Cmd+V)
   - Click: **Execute**

4. **Verify compilation**:
   - Expected: No compilation errors
   - Expected: Class loaded successfully

**Expected Results**:

- ✅ No compilation errors
- ✅ Helper loaded (if needed for debugging)

**Skip this section if**: You're only running integration tests with real MailServerManager (recommended path)

---

### Section 2.3: Prepare Phase 5 Test Suite ✅

**Objective**: Review available tests and prepare for execution

**Steps**:

1. **Review test file structure**:

   ```bash
   cat /Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/unit/EnhancedEmailServicePhase5Test.groovy
   ```

2. **Understand test architecture**:
   - **6 total tests** in file
   - **Tests 1-4**: Integration tests (require real Confluence/MailServerManager)
   - **Tests 5-6**: Mock helper validation tests (use mocks)

3. **Integration tests we'll execute** (Part 3):
   - ✅ Test 1: `checkSMTPHealth()` with configured SMTP server
   - ✅ Test 2: `checkSMTPHealth()` without configured SMTP server
   - ✅ Test 3: `healthCheck()` includes SMTP status (configured)
   - ✅ Test 4: `healthCheck()` includes SMTP status (not configured)

4. **Note about test execution**:
   - **DO NOT** paste entire test file into console (contains mock code)
   - We'll execute tests **one at a time** as inline scripts
   - Tests adapted for real MailServerManager (no mocks)

**Expected Results**:

- ✅ Test file reviewed and understood
- ✅ Ready to execute individual integration tests
- ✅ Know which 4 tests to run in Part 3

**No screenshots needed** - preparation step only

---

## Part 3: Execute Integration Tests (20 minutes)

### Section 3.1: Test 1 - checkSMTPHealth() with Configured Server ✅

**Objective**: Verify SMTP health check returns TRUE when Confluence SMTP configured

**Prerequisites**:

- ✅ Confluence SMTP configured (Section 1.2)
- ✅ EnhancedEmailService loaded (Section 2.1)

**Steps**:

1. **Ensure SMTP configured in Confluence**:
   - Confluence → Settings → Mail Servers
   - Verify: MailHog server present and enabled

2. **Execute test in ScriptRunner Console**:

   ```groovy
   import umig.utils.EnhancedEmailService

   println "=" * 70
   println "TEST 1: checkSMTPHealth() with configured SMTP server"
   println "=" * 70

   // Execute health check
   boolean isHealthy = EnhancedEmailService.checkSMTPHealth()

   // Display result
   println "\nResult: ${isHealthy}"
   println "Expected: true"

   // Assertion
   assert isHealthy == true : "Expected SMTP health check to pass with configured server"

   println "\n✅ TEST 1 PASSED: SMTP health check successful"
   return "TEST 1: PASS"
   ```

3. **Verify expected output**:

   ```
   ======================================================================
   TEST 1: checkSMTPHealth() with configured SMTP server
   ======================================================================
   ✅ SMTP health check: OK (localhost:1025)

   Result: true
   Expected: true

   ✅ TEST 1 PASSED: SMTP health check successful
   TEST 1: PASS
   ```

**Expected Results**:

- ✅ `checkSMTPHealth()` returns `true`
- ✅ Console shows: "SMTP health check: OK (localhost:1025)"
- ✅ Assertion passes
- ✅ No exceptions thrown

**Troubleshooting**:

- **Returns false**: Confluence SMTP not configured - check Section 1.2
- **MailServerManager not initialized**: Reload EnhancedEmailService (Section 2.1)
- **Exception thrown**: Check Confluence API availability

**📸 Screenshot**: ScriptRunner Console showing TEST 1 PASSED

**Test Checklist**:

- [ ] ✅ Test executed without errors
- [ ] ✅ `checkSMTPHealth()` returned `true`
- [ ] ✅ Health message shows "OK (localhost:1025)"
- [ ] ✅ Assertion passed

---

### Section 3.2: Test 2 - checkSMTPHealth() without Configured Server ✅

**Objective**: Verify SMTP health check returns FALSE when no SMTP server configured

**Prerequisites**:

- ✅ EnhancedEmailService loaded

**Steps**:

1. **Temporarily delete SMTP configuration**:
   - Confluence → Settings → Mail Servers
   - Find: MailHog (Development) server
   - Click: **Delete** (confirm deletion)
   - **⚠️ IMPORTANT**: You will re-add this in Step 5

2. **Execute test in ScriptRunner Console**:

   ```groovy
   import umig.utils.EnhancedEmailService

   println "=" * 70
   println "TEST 2: checkSMTPHealth() without configured SMTP server"
   println "=" * 70

   // Execute health check (should fail gracefully)
   boolean isHealthy = EnhancedEmailService.checkSMTPHealth()

   // Display result
   println "\nResult: ${isHealthy}"
   println "Expected: false"

   // Assertion
   assert isHealthy == false : "Expected SMTP health check to fail without configured server"

   println "\n✅ TEST 2 PASSED: Health check correctly reports unhealthy state"
   return "TEST 2: PASS"
   ```

3. **Verify expected output**:

   ```
   ======================================================================
   TEST 2: checkSMTPHealth() without configured SMTP server
   ======================================================================
   ⚠️ SMTP health check: No SMTP server configured in Confluence

   Result: false
   Expected: false

   ✅ TEST 2 PASSED: Health check correctly reports unhealthy state
   TEST 2: PASS
   ```

4. **Verify graceful degradation**:
   - No exceptions thrown
   - Service handles missing configuration gracefully
   - Returns `false` instead of crashing

5. **⚠️ CRITICAL: Re-add SMTP configuration**:
   - Confluence → Settings → Mail Servers
   - Click: **Add SMTP Mail Server**
   - Re-enter configuration from Section 1.2:
     - Name: `MailHog (Development)`
     - Host: `localhost`
     - Port: `1025`
     - From: `noreply@umig.dev`
   - Click: **Save**
   - Verify: Server re-added successfully

**Expected Results**:

- ✅ `checkSMTPHealth()` returns `false`
- ✅ Console shows: "No SMTP server configured in Confluence"
- ✅ No exceptions thrown (graceful degradation)
- ✅ SMTP configuration restored after test

**Troubleshooting**:

- **Returns true**: SMTP still configured - verify deletion successful
- **Exception thrown**: Service should handle missing config gracefully - check code
- **Cannot re-add SMTP**: Restart Confluence if Mail Servers page won't save

**📸 Screenshot**: ScriptRunner Console showing TEST 2 PASSED

**Test Checklist**:

- [ ] ✅ Test executed without errors
- [ ] ✅ `checkSMTPHealth()` returned `false`
- [ ] ✅ Warning message shows "No SMTP server configured"
- [ ] ✅ No exceptions thrown
- [ ] ⚠️ **CRITICAL**: SMTP configuration re-added successfully

---

### Section 3.3: Test 3 - healthCheck() includes SMTP status (configured) ✅

**Objective**: Verify comprehensive health check includes SMTP information when configured

**Prerequisites**:

- ✅ Confluence SMTP configured (restored in Section 3.2 Step 5)
- ✅ EnhancedEmailService loaded

**Steps**:

1. **Verify SMTP configured**:
   - Confluence → Settings → Mail Servers
   - Confirm: MailHog server present

2. **Execute test in ScriptRunner Console**:

   ```groovy
   import umig.utils.EnhancedEmailService

   println "=" * 70
   println "TEST 3: healthCheck() includes SMTP status when configured"
   println "=" * 70

   // Execute comprehensive health check
   Map health = EnhancedEmailService.healthCheck()

   // Display health status
   println "\nHealth Status:"
   println "  Overall status: ${health['status']}"
   println "  Service: ${health['service']}"
   println "\nSMTP Configuration:"
   println "  smtp.configured: ${health['smtp']['configured']}"
   println "  smtp.mailServerManager: ${health['smtp']['mailServerManager']}"
   println "\nCapabilities:"
   println "  smtpIntegration: ${health['capabilities']['smtpIntegration']}"

   // Assertions
   assert health['status'] == 'healthy' : "Expected overall status to be healthy"
   assert health['smtp']['configured'] == true : "Expected SMTP to be configured"
   assert health['smtp']['mailServerManager'] == 'initialized' : "Expected MailServerManager to be initialized"
   assert health['capabilities']['smtpIntegration'] == true : "Expected SMTP integration capability to be true"

   println "\n✅ TEST 3 PASSED: Health check includes complete SMTP status"
   return "TEST 3: PASS"
   ```

3. **Verify expected output**:

   ```
   ======================================================================
   TEST 3: healthCheck() includes SMTP status when configured
   ======================================================================

   Health Status:
     Overall status: healthy
     Service: EnhancedEmailService

   SMTP Configuration:
     smtp.configured: true
     smtp.mailServerManager: initialized

   Capabilities:
     smtpIntegration: true

   ✅ TEST 3 PASSED: Health check includes complete SMTP status
   TEST 3: PASS
   ```

4. **Validate health check structure**:
   - `status`: Overall service health (`healthy` when SMTP configured)
   - `smtp.configured`: Boolean indicating SMTP availability
   - `smtp.mailServerManager`: Initialization status
   - `capabilities.smtpIntegration`: Feature availability flag

**Expected Results**:

- ✅ Overall status: `healthy`
- ✅ SMTP configured: `true`
- ✅ MailServerManager: `initialized`
- ✅ SMTP integration capability: `true`
- ✅ All assertions pass

**Troubleshooting**:

- **Status is 'degraded'**: SMTP not configured - check Section 1.2
- **Missing 'smtp' section**: EnhancedEmailService version mismatch - reload code
- **mailServerManager is 'not_initialized'**: Confluence API issue - check logs

**📸 Screenshot**: ScriptRunner Console showing TEST 3 PASSED with health status

**Test Checklist**:

- [ ] ✅ Test executed without errors
- [ ] ✅ Overall status is `healthy`
- [ ] ✅ `smtp.configured` is `true`
- [ ] ✅ `smtp.mailServerManager` is `initialized`
- [ ] ✅ `capabilities.smtpIntegration` is `true`
- [ ] ✅ All assertions passed

---

### Section 3.4: Test 4 - healthCheck() includes SMTP status (not configured) ✅

**Objective**: Verify health check reports degraded status when SMTP not configured

**Prerequisites**:

- ✅ EnhancedEmailService loaded

**Steps**:

1. **Temporarily delete SMTP configuration** (again):
   - Confluence → Settings → Mail Servers
   - Find: MailHog (Development) server
   - Click: **Delete** (confirm deletion)
   - **⚠️ IMPORTANT**: You will re-add this in Step 5

2. **Execute test in ScriptRunner Console**:

   ```groovy
   import umig.utils.EnhancedEmailService

   println "=" * 70
   println "TEST 4: healthCheck() includes SMTP status when not configured"
   println "=" * 70

   // Execute comprehensive health check
   Map health = EnhancedEmailService.healthCheck()

   // Display health status
   println "\nHealth Status:"
   println "  Overall status: ${health['status']}"
   println "  Service: ${health['service']}"
   println "\nSMTP Configuration:"
   println "  smtp.configured: ${health['smtp']['configured']}"
   println "\nCapabilities:"
   println "  smtpIntegration: ${health['capabilities']['smtpIntegration']}"

   // Assertions
   assert health['status'] == 'degraded' : "Expected overall status to be degraded"
   assert health['smtp']['configured'] == false : "Expected SMTP to not be configured"
   assert health['capabilities']['smtpIntegration'] == false : "Expected SMTP integration capability to be false"

   println "\n✅ TEST 4 PASSED: Health check correctly reports degraded status"
   return "TEST 4: PASS"
   ```

3. **Verify expected output**:

   ```
   ======================================================================
   TEST 4: healthCheck() includes SMTP status when not configured
   ======================================================================

   Health Status:
     Overall status: degraded
     Service: EnhancedEmailService

   SMTP Configuration:
     smtp.configured: false

   Capabilities:
     smtpIntegration: false

   ✅ TEST 4 PASSED: Health check correctly reports degraded status
   TEST 4: PASS
   ```

4. **Validate degraded state handling**:
   - Service continues functioning (doesn't crash)
   - Status clearly indicates degraded state
   - SMTP capability correctly reported as unavailable

5. **⚠️ CRITICAL: Re-add SMTP configuration** (final time):
   - Confluence → Settings → Mail Servers
   - Click: **Add SMTP Mail Server**
   - Re-enter configuration from Section 1.2:
     - Name: `MailHog (Development)`
     - Host: `localhost`
     - Port: `1025`
     - From: `noreply@umig.dev`
   - Click: **Save**
   - **Verify**: Test email sends successfully
   - **Keep SMTP configured** for remaining tests

**Expected Results**:

- ✅ Overall status: `degraded`
- ✅ SMTP configured: `false`
- ✅ SMTP integration capability: `false`
- ✅ Service handles degraded state gracefully
- ✅ SMTP configuration restored successfully

**Troubleshooting**:

- **Status is 'healthy'**: SMTP still configured - verify deletion
- **Service crashes**: Should handle missing SMTP gracefully - check code
- **Cannot restore SMTP**: See Section 1.2 for detailed configuration steps

**📸 Screenshot**: ScriptRunner Console showing TEST 4 PASSED with degraded status

**Test Checklist**:

- [ ] ✅ Test executed without errors
- [ ] ✅ Overall status is `degraded`
- [ ] ✅ `smtp.configured` is `false`
- [ ] ✅ `capabilities.smtpIntegration` is `false`
- [ ] ✅ All assertions passed
- [ ] ⚠️ **CRITICAL**: SMTP configuration restored and tested

---

## Part 4: Real Email Testing (20 minutes)

### Section 4.1: Send Test Email via EnhancedEmailService ✅

**Objective**: Send real email through refactored service using MailServerManager

**Prerequisites**:

- ✅ Confluence SMTP configured and working
- ✅ MailHog running and accessible
- ✅ EnhancedEmailService loaded

**Steps**:

1. **Verify prerequisites**:
   - MailHog: http://localhost:8025 (should be accessible)
   - Confluence SMTP: Settings → Mail Servers (MailHog configured)

2. **Clear MailHog inbox for clean test**:

   ```bash
   cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup
   npm run mailhog:clear
   ```

3. **Execute email test in ScriptRunner Console**:

   ```groovy
   import umig.utils.EnhancedEmailService

   println "=" * 70
   println "REAL EMAIL TEST: Sending test email via EnhancedEmailService"
   println "=" * 70

   // Prepare email content
   def recipients = ['test@umig.dev']
   def subject = 'US-098 Phase 5 Validation Test'
   def body = '''
   <html>
   <head>
       <style>
           body { font-family: Arial, sans-serif; color: #333; }
           h2 { color: #0052CC; }
           .checklist { background-color: #f4f5f7; padding: 15px; border-radius: 5px; }
           .checklist li { margin: 8px 0; }
           .success { color: #00875A; font-weight: bold; }
           .footer { margin-top: 20px; font-size: 12px; color: #666; font-style: italic; }
       </style>
   </head>
   <body>
       <h2>🎯 US-098 Phase 5 Validation Test</h2>
       <p>This email validates <strong>MailServerManager integration</strong> for UMIG email service.</p>

       <div class="checklist">
           <h3>Validation Checklist:</h3>
           <ul>
               <li class="success">✅ MailServerManager API: Working</li>
               <li class="success">✅ ConfigurationService Overrides: Applied</li>
               <li class="success">✅ Email Sending: Successful</li>
               <li class="success">✅ Real Confluence Integration: Verified</li>
           </ul>
       </div>

       <p class="footer">
           🚀 Sent via refactored EnhancedEmailService with Confluence MailServerManager<br/>
           📅 Date: ''' + new Date().format('yyyy-MM-dd HH:mm:ss') + '''<br/>
           🔧 Environment: DEV (localhost:8090)
       </p>
   </body>
   </html>
   '''

   println "\n📧 Sending email..."
   println "   To: ${recipients}"
   println "   Subject: ${subject}"

   // Send email via MailHog using MailServerManager
   boolean success = EnhancedEmailService.sendEmailViaMailHog(recipients, subject, body)

   println "\n📊 Result:"
   println "   Email sent: ${success}"

   // Assertion
   assert success == true : "Expected email to send successfully"

   println "\n✅ EMAIL TEST PASSED"
   println "📧 Check MailHog at http://localhost:8025 to verify email received"

   return "EMAIL TEST: PASS - Check MailHog for confirmation"
   ```

4. **Verify script execution**:
   - Expected: Script executes without errors
   - Expected: `success = true`
   - Expected: No exceptions thrown

**Expected Output**:

```
======================================================================
REAL EMAIL TEST: Sending test email via EnhancedEmailService
======================================================================

📧 Sending email...
   To: [test@umig.dev]
   Subject: US-098 Phase 5 Validation Test

📊 Result:
   Email sent: true

✅ EMAIL TEST PASSED
📧 Check MailHog at http://localhost:8025 to verify email received
EMAIL TEST: PASS - Check MailHog for confirmation
```

**Expected Results**:

- ✅ Script executes successfully
- ✅ `sendEmailViaMailHog()` returns `true`
- ✅ No exceptions in console
- ✅ Ready to verify in MailHog (Section 4.2)

**Troubleshooting**:

- **Returns false**: SMTP configuration issue - check Confluence Mail Servers
- **Method not found**: EnhancedEmailService not loaded - see Section 2.1
- **Exception thrown**: Check exception details - may be SMTP connection issue
- **Timeout error**: MailHog may not be running - check `npm run logs:mailhog`

**📸 Screenshot**: ScriptRunner Console showing EMAIL TEST PASSED

**Test Checklist**:

- [ ] ✅ Test executed without errors
- [ ] ✅ `sendEmailViaMailHog()` returned `true`
- [ ] ✅ Console shows "EMAIL TEST PASSED"

---

### Section 4.2: Verify Email in MailHog ✅

**Objective**: Confirm email received in MailHog with correct content

**Prerequisites**:

- ✅ Email sent successfully (Section 4.1)

**Steps**:

1. **Navigate to MailHog inbox**:
   - Open browser: http://localhost:8025
   - Expected: MailHog interface loads

2. **Verify email received**:
   - Expected: **1 message** in inbox
   - Email should appear within 1-2 seconds of sending

3. **Click email to open**:
   - Click on email in message list
   - Email preview pane opens on right

4. **Verify email metadata**:
   - **From**: `noreply@umig.dev` (Confluence SMTP configuration)
   - **To**: `test@umig.dev`
   - **Subject**: `US-098 Phase 5 Validation Test`

5. **Verify email content** (HTML rendered):
   - Header: "🎯 US-098 Phase 5 Validation Test"
   - Body text: "This email validates MailServerManager integration"
   - Checklist section with 4 green checkmarks:
     - ✅ MailServerManager API: Working
     - ✅ ConfigurationService Overrides: Applied
     - ✅ Email Sending: Successful
     - ✅ Real Confluence Integration: Verified
   - Footer with timestamp and environment

6. **Check email source** (optional):
   - In MailHog, click: **Source** tab
   - Verify SMTP headers:
     - `X-Mailer` header (if present)
     - `Content-Type: text/html`
     - Proper MIME encoding

7. **Test multiple recipients** (optional):
   - Return to ScriptRunner Console
   - Modify `recipients` to: `['test1@umig.dev', 'test2@umig.dev', 'test3@umig.dev']`
   - Re-run email test script from Section 4.1
   - Verify: 3 separate emails appear in MailHog (one per recipient)

**Expected Results**:

- ✅ Email received in MailHog inbox
- ✅ From address matches Confluence SMTP configuration
- ✅ To address matches test recipient
- ✅ Subject correct
- ✅ HTML content renders correctly
- ✅ Checklist visible with 4 green checkmarks
- ✅ Footer shows timestamp and environment

**Troubleshooting**:

- **No email in MailHog**: Check MailHog logs with `npm run logs:mailhog`
- **Email appears malformed**: Check HTML in script - may have encoding issue
- **Wrong from address**: Check Confluence SMTP "From Address" setting
- **Multiple duplicate emails**: MailHog may have cached old messages - clear inbox

**📸 Screenshot**: MailHog inbox showing received email with HTML preview

**Test Checklist**:

- [ ] ✅ Email received in MailHog
- [ ] ✅ From: `noreply@umig.dev`
- [ ] ✅ To: `test@umig.dev`
- [ ] ✅ Subject: `US-098 Phase 5 Validation Test`
- [ ] ✅ HTML content renders correctly
- [ ] ✅ Checklist with 4 green checkmarks visible
- [ ] ✅ Footer shows timestamp

---

### Section 4.3: Trigger Real Workflow Email ✅

**Objective**: Confirm email sending works from actual UMIG workflow (not just test scripts)

**Note**: This section tests email in context of real application workflow. If your local environment doesn't have workflow email triggers set up, **this section is optional**.

**Prerequisites**:

- ✅ UMIG application accessible: http://localhost:8090
- ✅ Email templates configured in database
- ✅ Confluence SMTP configured

**Steps**:

1. **Clear MailHog inbox**:

   ```bash
   cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup
   npm run mailhog:clear
   ```

2. **Trigger step status change** (or other email-triggering action):
   - Navigate to UMIG application in Confluence
   - Find a step instance in an iteration
   - Change step status (e.g., "Not Started" → "In Progress")
   - Or trigger any other action that sends email notification

3. **Verify workflow email sent**:
   - Check ScriptRunner Console for any errors
   - Check Confluence logs: `npm run logs:confluence`
   - Look for email service log messages

4. **Check MailHog for workflow email**:
   - Navigate to: http://localhost:8025
   - Expected: Email from workflow appears
   - Verify email is related to the workflow action (not test email)

5. **Verify email uses MailServerManager** (not hardcoded SMTP):
   - Email source should show connection to `localhost:1025`
   - No hardcoded SMTP credentials in email headers
   - Email sent via Confluence MailServerManager

**Expected Results**:

- ✅ Workflow action triggers email successfully
- ✅ Email received in MailHog
- ✅ Email uses MailServerManager (not hardcoded SMTP)
- ✅ No errors in Confluence logs

**Alternative if workflow trigger not available**:

If you don't have a workflow trigger set up, execute this simplified workflow simulation in ScriptRunner Console:

```groovy
import umig.utils.EnhancedEmailService

println "WORKFLOW SIMULATION: Testing email from workflow context"

// Simulate workflow email notification
def workflowRecipients = ['workflow-test@umig.dev']
def workflowSubject = '[UMIG] Step Status Changed - Workflow Test'
def workflowBody = '''
<html>
<body>
    <h2>Step Status Changed</h2>
    <p><strong>Migration:</strong> TEST-2025</p>
    <p><strong>Step:</strong> Database Backup Verification</p>
    <p><strong>Status Change:</strong> Not Started → In Progress</p>
    <p><strong>Changed By:</strong> admin</p>
    <p>This is a workflow simulation email to validate MailServerManager integration.</p>
</body>
</html>
'''

boolean sent = EnhancedEmailService.sendEmailViaMailHog(
    workflowRecipients,
    workflowSubject,
    workflowBody
)

println "Workflow email sent: ${sent}"
assert sent == true
return "Workflow simulation: PASS"
```

**Troubleshooting**:

- **Email not sent**: Check email templates exist in database
- **Workflow action has no email trigger**: Use alternative workflow simulation script
- **Email uses old service**: Clear ScriptRunner cache and reload EnhancedEmailService
- **SMTP errors in logs**: Check Confluence SMTP configuration

**📸 Screenshot**: MailHog showing workflow email (or workflow simulation email)

**Test Checklist**:

- [ ] ✅ Workflow email triggered successfully (or simulation executed)
- [ ] ✅ Email received in MailHog
- [ ] ✅ Email uses MailServerManager
- [ ] ✅ No errors in Confluence logs

---

## Part 5: Configuration Override Validation (15 minutes)

### Section 5.1: Verify Configuration Overrides Applied ✅

**Objective**: Confirm ConfigurationService 4-tier hierarchy applies SMTP overrides correctly

**Prerequisites**:

- ✅ Migration 035 deployed (Section 1.3)
- ✅ ConfigurationService accessible

**Background**: ConfigurationService provides a 4-tier configuration hierarchy:

1. **Database** (`system_configuration_scf` table) - **Highest priority**
2. **Environment Variables** (`.env` file)
3. **Default Values** (hardcoded in service)
4. **Fallback** (method parameter defaults)

Migration 035 inserted DEV-specific SMTP overrides into the database that should override defaults.

**Steps**:

1. **Execute configuration override test in ScriptRunner Console**:

   ```groovy
   import umig.service.ConfigurationService

   println "=" * 70
   println "CONFIGURATION OVERRIDE TEST - 4-Tier Hierarchy Validation"
   println "=" * 70

   // Initialize ConfigurationService
   def configService = new ConfigurationService()

   println "\n🔍 Testing SMTP Configuration Overrides (DEV Environment)"
   println "-" * 70

   // Test 1: SMTP auth enabled (should be FALSE in DEV)
   def authEnabled = configService.getBoolean('email.smtp.auth.enabled')
   println "\n[Test 1] email.smtp.auth.enabled"
   println "   Retrieved value: ${authEnabled}"
   println "   Expected (DEV):  false"
   println "   Source: Database (Migration 035)"
   assert authEnabled == false : "Expected DEV environment to have auth disabled"
   println "   ✅ PASS"

   // Test 2: SMTP STARTTLS enabled (should be FALSE in DEV)
   def tlsEnabled = configService.getBoolean('email.smtp.starttls.enabled')
   println "\n[Test 2] email.smtp.starttls.enabled"
   println "   Retrieved value: ${tlsEnabled}"
   println "   Expected (DEV):  false"
   println "   Source: Database (Migration 035)"
   assert tlsEnabled == false : "Expected DEV environment to have TLS disabled"
   println "   ✅ PASS"

   // Test 3: Connection timeout (should be 5000ms in DEV)
   def connectionTimeout = configService.getString('email.smtp.connection.timeout.ms')
   println "\n[Test 3] email.smtp.connection.timeout.ms"
   println "   Retrieved value: ${connectionTimeout}"
   println "   Expected (DEV):  5000"
   println "   Source: Database (Migration 035)"
   assert connectionTimeout == '5000' : "Expected DEV environment to have 5000ms connection timeout"
   println "   ✅ PASS"

   // Test 4: Operation timeout (should be 5000ms in DEV)
   def operationTimeout = configService.getString('email.smtp.timeout.ms')
   println "\n[Test 4] email.smtp.timeout.ms"
   println "   Retrieved value: ${operationTimeout}"
   println "   Expected (DEV):  5000"
   println "   Source: Database (Migration 035)"
   assert operationTimeout == '5000' : "Expected DEV environment to have 5000ms operation timeout"
   println "   ✅ PASS"

   println "\n" + "=" * 70
   println "✅ ALL CONFIGURATION OVERRIDES VALIDATED"
   println "=" * 70
   println "\n📊 Summary:"
   println "   • Database overrides successfully applied"
   println "   • 4-tier hierarchy working correctly"
   println "   • DEV environment SMTP settings confirmed"

   return "CONFIGURATION OVERRIDE TEST: PASS (4/4 configs validated)"
   ```

2. **Verify expected output**:

   ```
   ======================================================================
   CONFIGURATION OVERRIDE TEST - 4-Tier Hierarchy Validation
   ======================================================================

   🔍 Testing SMTP Configuration Overrides (DEV Environment)
   ----------------------------------------------------------------------

   [Test 1] email.smtp.auth.enabled
      Retrieved value: false
      Expected (DEV):  false
      Source: Database (Migration 035)
      ✅ PASS

   [Test 2] email.smtp.starttls.enabled
      Retrieved value: false
      Expected (DEV):  false
      Source: Database (Migration 035)
      ✅ PASS

   [Test 3] email.smtp.connection.timeout.ms
      Retrieved value: 5000
      Expected (DEV):  5000
      Source: Database (Migration 035)
      ✅ PASS

   [Test 4] email.smtp.timeout.ms
      Retrieved value: 5000
      Expected (DEV):  5000
      Source: Database (Migration 035)
      ✅ PASS

   ======================================================================
   ✅ ALL CONFIGURATION OVERRIDES VALIDATED
   ======================================================================

   📊 Summary:
      • Database overrides successfully applied
      • 4-tier hierarchy working correctly
      • DEV environment SMTP settings confirmed

   CONFIGURATION OVERRIDE TEST: PASS (4/4 configs validated)
   ```

**Expected Results**:

- ✅ All 4 configuration tests pass
- ✅ Database values override defaults
- ✅ DEV environment settings applied correctly
- ✅ ConfigurationService hierarchy working

**Troubleshooting**:

- **Wrong values retrieved**: Database may not have Migration 035 - check Section 1.3
- **ConfigurationService not found**: Import path incorrect - check package name
- **Environment mismatch**: ConfigurationService may detect wrong environment - check environment detection logic
- **Null values**: Database query may be failing - check ConfigurationService logs

**📸 Screenshot**: ScriptRunner Console showing all 4 configuration override tests passing

**Test Checklist**:

- [ ] ✅ Test 1 PASSED: `email.smtp.auth.enabled` = `false`
- [ ] ✅ Test 2 PASSED: `email.smtp.starttls.enabled` = `false`
- [ ] ✅ Test 3 PASSED: `email.smtp.connection.timeout.ms` = `5000`
- [ ] ✅ Test 4 PASSED: `email.smtp.timeout.ms` = `5000`
- [ ] ✅ All 4 configuration overrides validated

---

### Section 5.2: Test Fallback Mechanism ✅

**Objective**: Verify ConfigurationService falls back to defaults when database key missing

**Prerequisites**:

- ✅ ConfigurationService accessible

**Steps**:

1. **Execute fallback test in ScriptRunner Console**:

   ```groovy
   import umig.service.ConfigurationService

   println "=" * 70
   println "FALLBACK MECHANISM TEST - Testing 4-Tier Hierarchy"
   println "=" * 70

   def configService = new ConfigurationService()

   println "\n🔍 Testing fallback to default values"
   println "-" * 70

   // Test 1: Non-existent key with explicit default
   println "\n[Test 1] Non-existent key with explicit default"
   def nonExistentKey = configService.getString(
       'email.smtp.nonexistent.test.key',
       'fallback-default-value'
   )
   println "   Key: email.smtp.nonexistent.test.key"
   println "   Retrieved value: ${nonExistentKey}"
   println "   Expected: fallback-default-value"
   assert nonExistentKey == 'fallback-default-value' : "Expected fallback to default value"
   println "   ✅ PASS: Fallback to method parameter default"

   // Test 2: Non-existent boolean key
   println "\n[Test 2] Non-existent boolean key with default"
   def nonExistentBool = configService.getBoolean(
       'email.smtp.nonexistent.bool.key',
       true  // default value
   )
   println "   Key: email.smtp.nonexistent.bool.key"
   println "   Retrieved value: ${nonExistentBool}"
   println "   Expected: true"
   assert nonExistentBool == true : "Expected fallback to boolean default"
   println "   ✅ PASS: Boolean fallback working"

   // Test 3: Verify existing key does NOT fallback
   println "\n[Test 3] Existing key should NOT use fallback"
   def existingKey = configService.getString(
       'email.smtp.auth.enabled',
       'THIS-SHOULD-NOT-BE-RETURNED'  // fallback that should be ignored
   )
   println "   Key: email.smtp.auth.enabled"
   println "   Retrieved value: ${existingKey}"
   println "   Expected: Database value (not fallback)"
   assert existingKey != 'THIS-SHOULD-NOT-BE-RETURNED' : "Existing key should not use fallback"
   println "   ✅ PASS: Database value takes precedence"

   println "\n" + "=" * 70
   println "✅ FALLBACK MECHANISM VALIDATED"
   println "=" * 70
   println "\n📊 Summary:"
   println "   • Fallback to method defaults: ✅ Working"
   println "   • Database values take precedence: ✅ Confirmed"
   println "   • 4-tier hierarchy intact: ✅ Validated"

   return "FALLBACK TEST: PASS (3/3 scenarios validated)"
   ```

2. **Verify expected output**:

   ```
   ======================================================================
   FALLBACK MECHANISM TEST - Testing 4-Tier Hierarchy
   ======================================================================

   🔍 Testing fallback to default values
   ----------------------------------------------------------------------

   [Test 1] Non-existent key with explicit default
      Key: email.smtp.nonexistent.test.key
      Retrieved value: fallback-default-value
      Expected: fallback-default-value
      ✅ PASS: Fallback to method parameter default

   [Test 2] Non-existent boolean key with default
      Key: email.smtp.nonexistent.bool.key
      Retrieved value: true
      Expected: true
      ✅ PASS: Boolean fallback working

   [Test 3] Existing key should NOT use fallback
      Key: email.smtp.auth.enabled
      Retrieved value: false
      Expected: Database value (not fallback)
      ✅ PASS: Database value takes precedence

   ======================================================================
   ✅ FALLBACK MECHANISM VALIDATED
   ======================================================================

   📊 Summary:
      • Fallback to method defaults: ✅ Working
      • Database values take precedence: ✅ Confirmed
      • 4-tier hierarchy intact: ✅ Validated

   FALLBACK TEST: PASS (3/3 scenarios validated)
   ```

**Expected Results**:

- ✅ Non-existent keys fall back to defaults
- ✅ Existing keys use database values (not fallback)
- ✅ 4-tier hierarchy preserved
- ✅ All 3 test scenarios pass

**Troubleshooting**:

- **Fallback not working**: ConfigurationService may have bug in fallback logic
- **Existing key uses fallback**: Database query failing - check ConfigurationService implementation
- **Null pointer exception**: Check ConfigurationService constructor and initialization

**📸 Screenshot**: ScriptRunner Console showing fallback mechanism test passing

**Test Checklist**:

- [ ] ✅ Test 1 PASSED: Non-existent key falls back to default
- [ ] ✅ Test 2 PASSED: Boolean fallback working
- [ ] ✅ Test 3 PASSED: Database value takes precedence over fallback
- [ ] ✅ All 3 fallback scenarios validated

---

## Part 6: Test Results Summary & Sign-Off (5 minutes)

### Section 6.1: Test Results Checklist ✅

**Objective**: Complete comprehensive checklist of all validation tests

**Instructions**: Mark each test as PASSED or FAILED based on execution results from Parts 3-5.

**Integration Tests (Part 3)**: ✅ 4/4 Tests Required

- [ ] ✅ **TEST 1**: `checkSMTPHealth()` with configured server - **PASSED**
  - Returns: `true`
  - Message: "SMTP health check: OK (localhost:1025)"

- [ ] ✅ **TEST 2**: `checkSMTPHealth()` without configured server - **PASSED**
  - Returns: `false`
  - Message: "No SMTP server configured in Confluence"
  - Graceful degradation: No exceptions thrown

- [ ] ✅ **TEST 3**: `healthCheck()` includes SMTP status (configured) - **PASSED**
  - Overall status: `healthy`
  - `smtp.configured`: `true`
  - `smtp.mailServerManager`: `initialized`
  - `capabilities.smtpIntegration`: `true`

- [ ] ✅ **TEST 4**: `healthCheck()` includes SMTP status (not configured) - **PASSED**
  - Overall status: `degraded`
  - `smtp.configured`: `false`
  - `capabilities.smtpIntegration`: `false`

**Real Email Tests (Part 4)**: ✅ 3/3 Tests Required

- [ ] ✅ **EMAIL TEST 1**: Real email sent via EnhancedEmailService - **PASSED**
  - `sendEmailViaMailHog()` returned: `true`
  - No exceptions thrown

- [ ] ✅ **EMAIL TEST 2**: Email received in MailHog - **PASSED**
  - From: `noreply@umig.dev`
  - To: `test@umig.dev`
  - Subject: `US-098 Phase 5 Validation Test`
  - HTML content rendered correctly
  - Checklist with 4 green checkmarks visible

- [ ] ✅ **EMAIL TEST 3**: Real workflow triggered email - **PASSED** (or workflow simulation)
  - Email sent through MailServerManager
  - No hardcoded SMTP credentials
  - No errors in Confluence logs

**Configuration Override Tests (Part 5)**: ✅ 7/7 Tests Required

- [ ] ✅ **CONFIG TEST 1**: `email.smtp.auth.enabled` = `false` - **PASSED**
- [ ] ✅ **CONFIG TEST 2**: `email.smtp.starttls.enabled` = `false` - **PASSED**
- [ ] ✅ **CONFIG TEST 3**: `email.smtp.connection.timeout.ms` = `5000` - **PASSED**
- [ ] ✅ **CONFIG TEST 4**: `email.smtp.timeout.ms` = `5000` - **PASSED**
- [ ] ✅ **CONFIG TEST 5**: Non-existent key falls back to default - **PASSED**
- [ ] ✅ **CONFIG TEST 6**: Boolean fallback working - **PASSED**
- [ ] ✅ **CONFIG TEST 7**: Database value takes precedence - **PASSED**

**Total Tests**: 14/14 Required
**Pass Rate**: **\_\_**%

---

### Section 6.2: Known Issues & Workarounds 📝

**Objective**: Document any issues encountered and workarounds applied during testing

**Instructions**: Record any issues, errors, or unexpected behaviors encountered. This helps future testers and developers.

**Template**:

| Issue # | Description                                    | Severity | Workaround                            | Status   |
| ------- | ---------------------------------------------- | -------- | ------------------------------------- | -------- |
| 1       | _(Example: SMTP test email timeout after 30s)_ | Low      | _(Example: Increased timeout to 60s)_ | Resolved |
|         |                                                |          |                                       |          |
|         |                                                |          |                                       |          |
|         |                                                |          |                                       |          |

**Severity Levels**:

- **Critical**: Prevents testing, blocks progress
- **High**: Major functionality broken, but workaround exists
- **Medium**: Minor functionality issue, easy workaround
- **Low**: Cosmetic or convenience issue

**Additional Notes**:

```
(Record any additional observations, unexpected behaviors, or recommendations)






```

---

### Section 6.3: UAT Acceptance Criteria ✅

**Objective**: Verify all User Acceptance Testing criteria met before sign-off

**Instructions**: Check each acceptance criterion. **ALL must be checked** for UAT acceptance.

**Functional Requirements**:

- [ ] ✅ All 14 tests passed in ScriptRunner Console (100% pass rate)
- [ ] ✅ Real emails sent and received via MailServerManager
- [ ] ✅ Configuration overrides applied correctly (4/4 configs validated)
- [ ] ✅ Fallback mechanism working (3/3 scenarios validated)
- [ ] ✅ No compilation errors in ScriptRunner
- [ ] ✅ MailServerManager initialized successfully

**Quality Requirements**:

- [ ] ✅ Health checks show SMTP status correctly (healthy/degraded)
- [ ] ✅ Graceful degradation when SMTP not configured (no crashes)
- [ ] ✅ Error handling validated (Tests 2 & 4)
- [ ] ✅ Zero regressions in existing functionality

**Integration Requirements**:

- [ ] ✅ Confluence SMTP integration working
- [ ] ✅ ConfigurationService 4-tier hierarchy validated
- [ ] ✅ MailHog email delivery confirmed
- [ ] ✅ Database Migration 035 deployed and functional

**Documentation Requirements**:

- [ ] ✅ All test steps executed and documented
- [ ] ✅ Screenshots captured for critical validation points
- [ ] ✅ Known issues documented (if any)
- [ ] ✅ Sign-off form completed

**Overall UAT Status**:

- [ ] ✅ **ACCEPT** - All acceptance criteria met, ready for production deployment
- [ ] ⚠️ **CONDITIONAL ACCEPT** - Minor issues, acceptable with documented workarounds
- [ ] ❌ **REJECT** - Critical issues prevent acceptance, requires remediation

---

### Section 6.4: Sign-Off Form 📋

**Objective**: Official sign-off for US-098 Phase 5 UAT completion

**Instructions**: Complete all fields and sign. This becomes the official UAT acceptance record.

---

**US-098 Phase 5 - MailServerManager Integration**
**User Acceptance Testing - Sign-Off Form**

**Test Session Information**:

- **Tester Name**: **\*\*\*\***\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\***\*\*\*\***
- **Date Tested**: **\*\*\*\***\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\***\*\*\*\***
- **Environment**:
  - [ ] DEV (localhost:8090)
  - [ ] UAT
  - [ ] PROD
- **Testing Duration**: **\_\_\_** minutes (Estimated: 85 minutes)

**Test Results Summary**:

- **Total Tests Executed**: **\_\_\_** / 14
- **Tests Passed**: **\_\_\_** / 14
- **Tests Failed**: **\_\_\_** / 14
- **Pass Rate**: **\_\_\_** %

**Critical Validations**:

- [ ] ✅ MailServerManager API integration working
- [ ] ✅ Real emails sent successfully
- [ ] ✅ Configuration overrides validated
- [ ] ✅ Zero critical issues identified

**Overall Result**:

- [ ] ✅ **PASS** - All tests successful, ready for next phase
- [ ] ⚠️ **PASS WITH NOTES** - Minor issues documented, acceptable
- [ ] ❌ **FAIL** - Critical issues identified, requires remediation

**Comments / Additional Notes**:

```
(Optional: Record any additional feedback, suggestions, or observations)








```

**Tester Signature**: **\*\*\*\***\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\***\*\*\*\***

**Date**: **\*\*\*\***\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\***\*\*\*\***

**Approved By** _(if applicable)_: **\*\*\*\***\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\***\*\*\*\***

---

**End of US-098 Phase 5 Manual Testing Guide**

---

## Appendix A: Quick Reference

### Environment URLs

- **Confluence**: http://localhost:8090 (admin / 123456)
- **MailHog**: http://localhost:8025
- **ScriptRunner Console**: http://localhost:8090/admin/plugins/scriptrunner/console.action

### Key Commands

```bash
# Start environment
npm start

# Stop environment
npm stop

# Clear MailHog
npm run mailhog:clear

# View logs
npm run logs:confluence
npm run logs:postgres
npm run logs:mailhog

# Database access
psql -h localhost -p 5432 -U umig_app_user -d umig_app_db
```

### File Locations

- **EnhancedEmailService**: `/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/utils/EnhancedEmailService.groovy`
- **Phase 5 Tests**: `/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/unit/EnhancedEmailServicePhase5Test.groovy`
- **Mock Helper**: `/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/helpers/MailServerManagerMockHelper.groovy`

### Critical Configuration

- **SMTP Host**: `localhost`
- **SMTP Port**: `1025`
- **From Address**: `noreply@umig.dev`
- **Database**: `umig_app_db`
- **Environment**: `DEV`

---

## Appendix B: Troubleshooting Decision Tree

```
Issue: Test fails or errors occur
├─ Compilation error in ScriptRunner?
│  ├─ Yes → Check imports, reload EnhancedEmailService (Section 2.1)
│  └─ No → Continue
│
├─ SMTP health check returns false?
│  ├─ Yes → Verify Confluence SMTP configured (Section 1.2)
│  └─ No → Continue
│
├─ Email not received in MailHog?
│  ├─ Yes → Check MailHog running, verify SMTP port 1025
│  └─ No → Continue
│
├─ Configuration override wrong values?
│  ├─ Yes → Verify Migration 035 deployed (Section 1.3)
│  └─ No → Continue
│
├─ Database connection failed?
│  ├─ Yes → Check .env credentials, PostgreSQL running
│  └─ No → Continue
│
└─ Other issue → Check Confluence logs, ScriptRunner cache
```

---

## Appendix C: Test Execution Checklist Summary

**Quick checklist for executing all tests** (print this page for easy reference):

**Part 1: Setup** (10 min)

- [ ] Environment running (Confluence, PostgreSQL, MailHog)
- [ ] Confluence SMTP configured
- [ ] Migration 035 verified (14 rows)
- [ ] ScriptRunner Console accessible

**Part 2: Deployment** (15 min)

- [ ] EnhancedEmailService.groovy loaded
- [ ] MailServerManager initialized
- [ ] No compilation errors

**Part 3: Integration Tests** (20 min)

- [ ] Test 1: SMTP health with server (PASS)
- [ ] Test 2: SMTP health without server (PASS)
- [ ] Test 3: Health check configured (PASS)
- [ ] Test 4: Health check not configured (PASS)
- [ ] SMTP configuration restored

**Part 4: Email Tests** (20 min)

- [ ] Test email sent successfully
- [ ] Email received in MailHog
- [ ] Workflow email tested (or simulation)

**Part 5: Config Tests** (15 min)

- [ ] 4 SMTP configs validated
- [ ] 3 fallback scenarios tested

**Part 6: Sign-Off** (5 min)

- [ ] All 14 tests passed
- [ ] Issues documented
- [ ] UAT criteria met
- [ ] Sign-off form completed

**Total Time**: **\_\_\_** minutes (Target: 85 minutes)

---

**Document End**
