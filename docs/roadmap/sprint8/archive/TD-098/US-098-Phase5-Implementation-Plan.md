# US-098 Phase 5 Implementation Plan: EnhancedEmailService Refactoring

**Status**: Planning Complete - Ready for Implementation
**Created**: 2025-10-06
**Sprint**: Sprint 8
**User Story**: US-098 Configuration Management System
**Phase**: 5 of 5 (Final Phase)
**Completion**: 80% → 100%

---

## Executive Summary

### Objective

Refactor `EnhancedEmailService.groovy` to use Confluence MailServerManager API instead of hardcoded MailHog SMTP configuration, integrating with ConfigurationService for environment-specific overrides.

### Critical Blocker (P0)

**Current State**: Hardcoded SMTP values (`umig_mailhog:1025`) in `sendEmailViaMailHog()` method
**Target State**: Dynamic MailServerManager API with ConfigurationService overrides
**Blocker Impact**: Cannot deploy to UAT/PROD without this change

### Phase 5 Scope

- **Primary Deliverable**: MailServerManager API integration
- **Secondary Deliverable**: ConfigurationService override application
- **Tertiary Deliverable**: Test updates and health checks
- **Documentation**: Configuration key mapping and troubleshooting guide

### Estimated Effort

- **Core Refactoring**: 4-6 hours
- **Test Updates**: 1-2 hours
- **Health Checks**: 1 hour
- **Documentation**: 1 hour
- **Total**: 7-10 hours

---

## Phase 5 Architecture

### Current Implementation (Hardcoded)

```groovy
// Lines 848-853 in EnhancedEmailService.groovy
Properties props = new Properties()
props.put("mail.smtp.host", "umig_mailhog")
props.put("mail.smtp.port", "1025")
props.put("mail.smtp.auth", "false")
props.put("mail.smtp.starttls.enable", "false")
```

### Target Implementation (MailServerManager API)

```groovy
// Get Confluence SMTP server
SMTPMailServer mailServer = mailServerManager.getDefaultSMTPMailServer()

// Apply ConfigurationService overrides
Properties props = new Properties()
props.put("mail.smtp.host", mailServer.getHostname())
props.put("mail.smtp.port", String.valueOf(mailServer.getPort()))

// Override flags from ConfigurationService
Boolean authEnabled = ConfigurationService.getBoolean("email.smtp.auth.enabled")
if (authEnabled != null) {
    props.put("mail.smtp.auth", String.valueOf(authEnabled))
}

Boolean tlsEnabled = ConfigurationService.getBoolean("email.smtp.starttls.enabled")
if (tlsEnabled != null) {
    props.put("mail.smtp.starttls.enable", String.valueOf(tlsEnabled))
}

// Timeouts from ConfigurationService
String connectionTimeout = ConfigurationService.getString("email.smtp.connection.timeout.ms")
if (connectionTimeout) {
    props.put("mail.smtp.connectiontimeout", connectionTimeout)
}

String timeout = ConfigurationService.getString("email.smtp.timeout.ms")
if (timeout) {
    props.put("mail.smtp.timeout", timeout)
}

// Create session with Confluence authenticator
Session session = Session.getInstance(props, mailServer.getAuthenticator())
```

### Configuration Keys (Deployed in Migration 035)

| Key                                | Type    | DEV Value | PROD Value | Purpose                    |
| ---------------------------------- | ------- | --------- | ---------- | -------------------------- |
| `email.smtp.auth.enabled`          | BOOLEAN | `false`   | `true`     | Enable SMTP authentication |
| `email.smtp.starttls.enabled`      | BOOLEAN | `false`   | `true`     | Enable STARTTLS encryption |
| `email.smtp.connection.timeout.ms` | INTEGER | `5000`    | `15000`    | Connection timeout (ms)    |
| `email.smtp.timeout.ms`            | INTEGER | `5000`    | `30000`    | Operation timeout (ms)     |

---

## File Modification Breakdown

### 1. Primary Target: `src/groovy/umig/utils/EnhancedEmailService.groovy`

#### Changes Required

**A. Add Instance Variables (Line ~18)**

```groovy
import com.atlassian.confluence.mail.MailServerManager
import com.atlassian.mail.server.SMTPMailServer
import com.atlassian.sal.api.component.ComponentLocator

class EnhancedEmailService {
    // NEW: Add MailServerManager instance variable
    private static MailServerManager mailServerManager

    // Existing variables...
    private static final String DEFAULT_FROM_ADDRESS = 'umig-system@company.com'
```

**B. Add Static Initialization Block (After line ~60)**

```groovy
// Static initialization for MailServerManager
static {
    try {
        mailServerManager = ComponentLocator.getComponent(MailServerManager.class)
        println "✅ MailServerManager initialized successfully"
    } catch (Exception e) {
        println "⚠️ WARNING: MailServerManager initialization failed: ${e.message}"
        // mailServerManager will be null - fallback behavior in sendEmail()
    }
}
```

**C. Replace `sendEmailViaMailHog()` Method (Lines 837-928)**

**Current Implementation**: 92 lines of hardcoded MailHog configuration

**New Implementation**:

```groovy
/**
 * Send email via Confluence MailServerManager with ConfigurationService overrides
 *
 * Integration Points:
 * - Confluence MailServerManager API for SMTP server configuration
 * - ConfigurationService for environment-specific overrides (auth, TLS, timeouts)
 *
 * Environment Behavior:
 * - DEV: MailHog (umig_mailhog:1025), no auth, no TLS
 * - UAT/PROD: Organization SMTP server with auth and STARTTLS
 *
 * @param recipients List of email addresses
 * @param subject Email subject line
 * @param body Email body (HTML)
 * @return boolean true if all emails sent successfully
 * @throws IllegalStateException if no SMTP server configured in Confluence
 *
 * US-098 Phase 5: MailServerManager API Integration
 */
private static boolean sendEmailViaMailHog(List<String> recipients, String subject, String body) {
    try {
        println "🔧 [EnhancedEmailService] sendEmail() - MailServerManager API integration"
        println "🔧 Recipients: ${recipients}"
        println "🔧 Subject: ${subject}"

        // Step 1: Validate MailServerManager availability
        if (!mailServerManager) {
            throw new IllegalStateException(
                "MailServerManager not initialized. " +
                "This may indicate a ScriptRunner or Confluence configuration issue."
            )
        }

        // Step 2: Get Confluence default SMTP server
        SMTPMailServer mailServer = mailServerManager.getDefaultSMTPMailServer()

        if (!mailServer) {
            throw new IllegalStateException(
                "No SMTP server configured in Confluence. " +
                "Please configure in Confluence Admin → Mail Servers"
            )
        }

        println "✅ Using SMTP server: ${mailServer.getHostname()}:${mailServer.getPort()}"

        // Step 3: Build JavaMail properties with Confluence settings
        Properties props = new Properties()
        props.put("mail.smtp.host", mailServer.getHostname())
        props.put("mail.smtp.port", String.valueOf(mailServer.getPort()))

        // Step 4: Apply ConfigurationService overrides for environment-specific behavior
        applyConfigurationOverrides(props)

        println "📧 SMTP Configuration:"
        println "   - Host: ${props.get('mail.smtp.host')}"
        println "   - Port: ${props.get('mail.smtp.port')}"
        println "   - Auth: ${props.get('mail.smtp.auth') ?: 'default'}"
        println "   - TLS: ${props.get('mail.smtp.starttls.enable') ?: 'default'}"
        println "   - Connection Timeout: ${props.get('mail.smtp.connectiontimeout') ?: 'default'}ms"
        println "   - Operation Timeout: ${props.get('mail.smtp.timeout') ?: 'default'}ms"

        // Step 5: Create session with Confluence authenticator
        Session session = Session.getInstance(props, mailServer.getAuthenticator())

        // Step 6: Send to each recipient
        boolean allSent = true
        recipients.each { recipient ->
            try {
                println "📤 Sending to: ${recipient}"

                MimeMessage message = new MimeMessage(session)
                message.setFrom(new InternetAddress(mailServer.getDefaultFrom()))
                message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(recipient))
                message.setSubject(subject, "UTF-8")
                message.setContent(body, "text/html; charset=utf-8")
                message.setSentDate(new Date())

                Transport.send(message)
                println "✅ Email sent successfully to ${recipient}"

            } catch (Exception e) {
                println "❌ Failed to send email to ${recipient}: ${e.message}"
                e.printStackTrace()
                allSent = false
            }
        }

        println "📊 Email batch result: ${allSent ? 'SUCCESS' : 'PARTIAL FAILURE'}"
        return allSent

    } catch (Exception e) {
        println "❌ FATAL ERROR in sendEmail: ${e.message}"
        e.printStackTrace()
        return false
    }
}

/**
 * Apply ConfigurationService overrides to JavaMail properties
 *
 * Override Priority:
 * 1. ConfigurationService environment-specific values
 * 2. ConfigurationService global values
 * 3. Confluence MailServerManager defaults
 *
 * @param props JavaMail properties to modify
 * US-098 Phase 5: ConfigurationService Integration
 */
private static void applyConfigurationOverrides(Properties props) {
    try {
        // Authentication override
        Boolean authEnabled = umig.service.ConfigurationService.getBoolean("email.smtp.auth.enabled", null)
        if (authEnabled != null) {
            props.put("mail.smtp.auth", String.valueOf(authEnabled))
            println "🔧 Applied ConfigurationService override: auth=${authEnabled}"
        }

        // STARTTLS override
        Boolean tlsEnabled = umig.service.ConfigurationService.getBoolean("email.smtp.starttls.enabled", null)
        if (tlsEnabled != null) {
            props.put("mail.smtp.starttls.enable", String.valueOf(tlsEnabled))
            println "🔧 Applied ConfigurationService override: starttls=${tlsEnabled}"
        }

        // Connection timeout override
        String connectionTimeout = umig.service.ConfigurationService.getString("email.smtp.connection.timeout.ms", null)
        if (connectionTimeout) {
            props.put("mail.smtp.connectiontimeout", connectionTimeout)
            println "🔧 Applied ConfigurationService override: connectionTimeout=${connectionTimeout}ms"
        }

        // Operation timeout override
        String operationTimeout = umig.service.ConfigurationService.getString("email.smtp.timeout.ms", null)
        if (operationTimeout) {
            props.put("mail.smtp.timeout", operationTimeout)
            println "🔧 Applied ConfigurationService override: operationTimeout=${operationTimeout}ms"
        }

    } catch (Exception e) {
        println "⚠️ WARNING: Failed to apply ConfigurationService overrides: ${e.message}"
        // Continue with Confluence defaults if ConfigurationService fails
    }
}
```

**D. Add SMTP Health Check Method (Before healthCheck() at line ~1435)**

```groovy
/**
 * Check SMTP server availability for health monitoring
 *
 * Health Check Logic:
 * 1. MailServerManager initialized
 * 2. Default SMTP server configured in Confluence
 * 3. SMTP server hostname and port valid
 *
 * @return Map with health status and details
 * US-098 Phase 5: SMTP Health Check (P2 Priority)
 */
static Map checkSMTPHealth() {
    try {
        // Check MailServerManager availability
        if (!mailServerManager) {
            return [
                status: 'DOWN',
                available: false,
                error: 'MailServerManager not initialized',
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]
        }

        // Check default SMTP server configuration
        SMTPMailServer mailServer = mailServerManager.getDefaultSMTPMailServer()

        if (!mailServer) {
            return [
                status: 'DOWN',
                available: false,
                error: 'No default SMTP server configured in Confluence',
                recommendation: 'Configure SMTP in Confluence Admin → Mail Servers',
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]
        }

        // SMTP server configured and available
        return [
            status: 'UP',
            available: true,
            smtpHost: mailServer.getHostname(),
            smtpPort: mailServer.getPort(),
            defaultFrom: mailServer.getDefaultFrom(),
            timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        ]

    } catch (Exception e) {
        return [
            status: 'ERROR',
            available: false,
            error: e.message,
            timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        ]
    }
}
```

**E. Update healthCheck() Method (Line ~1435)**

```groovy
// Add SMTP health to existing healthCheck() response
static Map healthCheck() {
    try {
        def urlServiceHealth = UrlConstructionService.healthCheck()
        def configHealth = urlServiceHealth.status == 'healthy'
        def smtpHealth = checkSMTPHealth()  // NEW: Add SMTP health check

        return [
            service: 'EnhancedEmailService',
            status: (configHealth && smtpHealth.available) ? 'healthy' : 'degraded',
            urlConstruction: urlServiceHealth,
            smtpConfiguration: smtpHealth,  // NEW: Include SMTP health
            capabilities: [
                dynamicUrls: configHealth,
                emailTemplates: true,
                auditLogging: true,
                smtpIntegration: smtpHealth.available  // NEW: SMTP capability
            ],
            timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        ]
    } catch (Exception e) {
        return [
            service: 'EnhancedEmailService',
            status: 'error',
            error: e.message,
            timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        ]
    }
}
```

#### Summary of Changes

- **Lines Added**: ~150
- **Lines Removed**: ~92
- **Net Change**: +58 lines
- **Complexity**: Medium (API integration with error handling)
- **Risk**: Low (comprehensive fallback mechanisms)

---

### 2. Test Files to Update

#### A. Groovy Unit Tests

**File**: `src/groovy/umig/tests/unit/EnhancedEmailServiceTest.groovy`

**Changes Required**:

1. Mock MailServerManager component
2. Mock ConfigurationService.getBoolean() and getString()
3. Update test expectations for new method signatures
4. Add tests for applyConfigurationOverrides()
5. Add tests for checkSMTPHealth()

**Test Coverage Goals**:

- ✅ MailServerManager initialized successfully
- ✅ MailServerManager returns null (error handling)
- ✅ Default SMTP server available
- ✅ No SMTP server configured (exception handling)
- ✅ ConfigurationService overrides applied correctly
- ✅ ConfigurationService fails gracefully (fallback to defaults)
- ✅ SMTP health check returns UP status
- ✅ SMTP health check returns DOWN status

#### B. Groovy Integration Tests

**File**: `src/groovy/umig/tests/integration/EnhancedEmailServiceMailHogTest.groovy`

**Changes Required**:

1. Update to use Confluence SMTP configuration instead of hardcoded MailHog
2. Verify ConfigurationService values are applied
3. Test environment-specific behavior (DEV vs UAT)

**Critical**: This test specifically validates MailHog integration, which should still work through Confluence SMTP configuration pointing to MailHog in DEV environment.

**File**: `src/groovy/umig/tests/integration/EnhancedEmailServiceScriptRunnerTest.groovy`

**Changes Required**:

1. Verify MailServerManager ComponentLocator integration
2. Test actual email sending through Confluence SMTP
3. Validate audit logging with new implementation

#### C. JavaScript Tests

**File**: `local-dev-setup/__tests__/email/enhanced-email-mailhog.test.js`

**Changes Required**:

1. Update assertions to expect Confluence SMTP configuration
2. Mock MailServerManager if testing through API calls
3. Verify ConfigurationService integration

**File**: `local-dev-setup/__tests__/email/enhanced-email-database-templates.test.js`

**Changes Required**:
Minimal - may not need updates if only testing template rendering, not email sending.

---

## Implementation Sequence

### Phase 5A: Core Refactoring (4-6 hours)

**Step 1: Backup and Branch Verification** (5 min)

- Verify on branch: `bugfix/US-058-email-service-iteration-step-views`
- Current commit: `98c165ffa1a6a2124750850c9e4c7d7eb7bdb7c1`
- No uncommitted changes should exist

**Step 2: Add MailServerManager Instance Variable** (15 min)

- Add imports for Confluence mail API
- Add static MailServerManager instance variable
- Add static initialization block with error handling
- Test: Verify class loads without errors

**Step 3: Implement `applyConfigurationOverrides()` Helper** (45 min)

- Create new private method for ConfigurationService integration
- Implement Boolean overrides (auth, TLS)
- Implement String overrides (timeouts)
- Add comprehensive logging
- Test: Unit test with mocked ConfigurationService

**Step 4: Replace `sendEmailViaMailHog()` Method** (2 hours)

- Preserve method signature for compatibility
- Remove hardcoded MailHog configuration
- Implement MailServerManager.getDefaultSMTPMailServer()
- Apply ConfigurationService overrides
- Implement error handling with detailed logging
- Test: Run unit tests

**Step 5: Add `checkSMTPHealth()` Method** (30 min)

- Implement health check logic
- Return structured health status
- Test: Unit test with various scenarios

**Step 6: Update `healthCheck()` Method** (15 min)

- Integrate SMTP health check
- Update response structure
- Test: Verify health endpoint returns SMTP status

**Validation Checkpoint**:

- ✅ All unit tests pass
- ✅ No compilation errors
- ✅ Logging output shows MailServerManager usage
- ✅ Health check endpoint includes SMTP status

---

### Phase 5B: Test Updates (1-2 hours)

**Step 7: Update Groovy Unit Tests** (45 min)

- Update `EnhancedEmailServiceTest.groovy`
- Add mocks for MailServerManager
- Add mocks for ConfigurationService
- Add tests for new methods
- Run: `npm run test:groovy:unit`

**Step 8: Update Groovy Integration Tests** (45 min)

- Update `EnhancedEmailServiceMailHogTest.groovy`
- Verify Confluence SMTP configuration
- Test ConfigurationService integration
- Run: `npm run test:groovy:integration`

**Step 9: Update JavaScript Tests** (30 min)

- Update `enhanced-email-mailhog.test.js`
- Update assertions for new implementation
- Run: `npm run test:js:integration`

**Validation Checkpoint**:

- ✅ All Groovy unit tests pass (43/43)
- ✅ All Groovy integration tests pass
- ✅ JavaScript email tests pass
- ✅ No test regressions

---

### Phase 5C: Manual Testing (2 hours)

**Step 10: DEV Environment Validation** (30 min)

1. Start development stack: `npm start`
2. Verify Confluence SMTP configured for MailHog
3. Trigger step status change notification
4. Check MailHog inbox: http://localhost:8025
5. Verify logs show MailServerManager usage
6. Verify ConfigurationService overrides applied

**Step 11: Configuration Override Testing** (1 hour)

1. Query current configuration values:
   ```sql
   SELECT scf_key, scf_value, env_id
   FROM system_configuration_scf
   WHERE scf_key LIKE 'email.smtp%'
   ORDER BY scf_key;
   ```
2. Test with different override combinations:
   - Auth enabled/disabled
   - TLS enabled/disabled
   - Different timeout values
3. Verify behavior matches ConfigurationService values

**Step 12: Health Check Validation** (30 min)

1. Access health endpoint (if implemented)
2. Verify SMTP status returned
3. Test with SMTP server down scenario
4. Verify error handling and logging

**Validation Checkpoint**:

- ✅ Emails sent through MailServerManager API
- ✅ ConfigurationService overrides applied correctly
- ✅ MailHog receives test emails
- ✅ Logs show correct configuration values
- ✅ Health check returns accurate SMTP status

---

### Phase 5D: Documentation (1 hour)

**Step 13: Update Code Documentation** (30 min)

- Add comprehensive JavaDoc comments
- Document configuration keys
- Update method signatures
- Add troubleshooting notes

**Step 14: Create Configuration Guide** (30 min)

- Document all email.smtp.\* configuration keys
- Provide DEV/UAT/PROD value recommendations
- Add troubleshooting section
- Link to Confluence SMTP Admin UI

**Deliverable**: `docs/technical/Email-Configuration-Guide.md`

---

## Success Criteria

### Phase 5 Completion Checklist

**Code Quality**:

- [ ] MailServerManager API integration complete
- [ ] ConfigurationService overrides implemented
- [ ] No hardcoded SMTP values remain
- [ ] Comprehensive error handling in place
- [ ] Logging provides clear troubleshooting information

**Testing**:

- [ ] All unit tests pass (43/43 for Groovy)
- [ ] All integration tests pass
- [ ] JavaScript tests pass
- [ ] Manual testing confirms email delivery
- [ ] ConfigurationService override behavior verified

**Health & Monitoring**:

- [ ] SMTP health check method implemented
- [ ] Health endpoint returns SMTP status
- [ ] Monitoring can detect SMTP configuration issues

**Documentation**:

- [ ] Code comments updated
- [ ] Configuration keys documented
- [ ] Troubleshooting guide created
- [ ] Deployment checklist updated

**Deployment Readiness**:

- [ ] DEV environment validated
- [ ] UAT deployment plan documented
- [ ] PROD deployment prerequisites identified
- [ ] Rollback procedure documented

### Acceptance Criteria for US-098 Phase 5

1. **API Integration**: EnhancedEmailService uses MailServerManager API exclusively (no hardcoded SMTP)
2. **Configuration Override**: ConfigurationService values properly applied for auth, TLS, timeouts
3. **Environment Awareness**: DEV/UAT/PROD environments use appropriate SMTP settings
4. **Error Handling**: Clear error messages when SMTP not configured
5. **Health Monitoring**: SMTP availability status accessible for monitoring
6. **Test Coverage**: All existing tests updated and passing
7. **Documentation**: Configuration keys and troubleshooting guide complete

---

## Risk Mitigation

### Identified Risks

**Risk 1: MailServerManager Not Initialized**

- **Probability**: Low
- **Impact**: High (emails fail completely)
- **Mitigation**: Static initialization block with error handling
- **Fallback**: Clear error message directing to Confluence Admin UI
- **Detection**: Health check returns DOWN status

**Risk 2: ConfigurationService Values Missing**

- **Probability**: Medium
- **Impact**: Medium (uses Confluence defaults)
- **Mitigation**: Fallback to Confluence MailServerManager defaults
- **Validation**: Migration 035 deployed these values
- **Detection**: Logging shows which values are applied

**Risk 3: Confluence SMTP Not Configured**

- **Probability**: Low (DEV has MailHog)
- **Impact**: High (emails fail completely)
- **Mitigation**: Clear IllegalStateException with guidance
- **Documentation**: Deployment checklist includes SMTP configuration
- **Detection**: Health check returns DOWN status

**Risk 4: Test Failures After Refactoring**

- **Probability**: Medium
- **Impact**: Medium (delays deployment)
- **Mitigation**: Comprehensive test update plan
- **Fallback**: Incremental test updates with validation
- **Detection**: CI/CD test failures

### Contingency Plans

**If MailServerManager fails to initialize**:

1. Check Confluence version compatibility
2. Verify ComponentLocator availability
3. Review ScriptRunner plugin status
4. Fall back to direct JavaMail configuration (temporary)

**If ConfigurationService overrides fail**:

1. Verify Migration 035 executed successfully
2. Check system_configuration_scf table values
3. Use Confluence defaults as fallback
4. Document in audit logs

**If tests fail after refactoring**:

1. Isolate failing test category (unit vs integration)
2. Update tests incrementally
3. Validate mock setup for MailServerManager
4. Review error messages for API changes

---

## Configuration Reference

### Required Confluence SMTP Configuration

**DEV Environment**:

```
SMTP Server: MailHog Container
Hostname: umig_mailhog
Port: 1025
Authentication: None
TLS: Disabled
Default From: umig-dev@example.com
```

**UAT Environment**:

```
SMTP Server: Organization UAT Mail Server
Hostname: [UAT SMTP server]
Port: 587 (STARTTLS)
Authentication: Required (managed in Confluence)
TLS: Enabled (STARTTLS)
Default From: umig-uat@organization.com
```

**PROD Environment**:

```
SMTP Server: Organization Production Mail Server
Hostname: [Production SMTP server]
Port: 587 (STARTTLS)
Authentication: Required (managed in Confluence)
TLS: Enabled (STARTTLS)
Default From: umig-notifications@organization.com
```

### ConfigurationService Values (Deployed in Migration 035)

Query to verify deployment:

```sql
SELECT
    scf_key,
    scf_value,
    CASE
        WHEN env_id = 1 THEN 'DEV'
        WHEN env_id = 2 THEN 'TEST'
        WHEN env_id = 3 THEN 'UAT'
        WHEN env_id = 4 THEN 'PROD'
        ELSE 'GLOBAL'
    END as environment
FROM system_configuration_scf
WHERE scf_key LIKE 'email.smtp%'
  AND scf_is_active = TRUE
ORDER BY scf_key, env_id;
```

Expected results (27 configuration entries):

```
email.smtp.auth.enabled              | false | DEV
email.smtp.auth.enabled              | true  | UAT
email.smtp.auth.enabled              | true  | PROD
email.smtp.starttls.enabled          | false | DEV
email.smtp.starttls.enabled          | true  | UAT
email.smtp.starttls.enabled          | true  | PROD
email.smtp.connection.timeout.ms     | 5000  | DEV
email.smtp.connection.timeout.ms     | 15000 | UAT
email.smtp.connection.timeout.ms     | 15000 | PROD
email.smtp.timeout.ms                | 5000  | DEV
email.smtp.timeout.ms                | 30000 | UAT
email.smtp.timeout.ms                | 30000 | PROD
```

---

## Next Steps

### Immediate Actions (Today)

1. Review this implementation plan with stakeholders
2. Confirm approach and sequence
3. Set aside 7-10 hour block for implementation
4. Prepare development environment

### Implementation Day

1. **Morning Session (4 hours)**: Core refactoring (Steps 1-6)
2. **Lunch Break**: Review progress, run unit tests
3. **Afternoon Session (3 hours)**: Test updates (Steps 7-9)
4. **End of Day**: Manual testing validation (Steps 10-12)

### Follow-Up Day

1. **Morning**: Documentation completion (Steps 13-14)
2. **Midday**: Final validation and checkpoint review
3. **Afternoon**: Phase 5 completion report
4. **Commit**: Finalize Phase 5 changes, prepare for merge

---

## Appendix

### A. Technical Guide Reference

Complete implementation patterns: `/docs/technical/Confluence-SMTP-Integration-Guide.md`

### B. Related ADRs

- ADR-067: Configuration Management System Architecture
- ADR-068: Configuration Security Framework
- ADR-069: Configuration Migration Strategy
- ADR-070: Configuration Deployment Process

### C. Migration Reference

- Migration 035: Email SMTP Configuration Deployment (27 configs)
- Execution Status: ✅ Complete (2025-10-06)

### D. Code References

- `EnhancedEmailService.groovy`: Lines 837-928 (sendEmailViaMailHog)
- `ConfigurationService.groovy`: Complete and production-ready
- Technical Guide: Lines 56-309 (MailServerManager examples)

---

**Document Status**: Planning Complete - Ready for Implementation Review
**Next Review**: Before Step 1 execution
**Approval Required**: Product Owner sign-off for 7-10 hour allocation
**Version**: 1.0
**Last Updated**: 2025-10-06
