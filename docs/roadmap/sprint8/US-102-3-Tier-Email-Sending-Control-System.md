# US-102: 3-Tier Email Sending Control System

**Story Points**: 3 (8-9 hours)
**Priority**: HIGH
**Sprint**: Sprint 8
**Status**: Ready for Implementation
**Created**: October 7, 2025

## Story Overview

**Epic**: Operational Excellence & Configuration Management
**Type**: Feature - Runtime Email Control
**Related Work**:
- US-098 Configuration Management System (100% complete - Foundation)
- US-058 Email Service Security Enhancement (89% complete - Email infrastructure)
- TD-016 Email Notification Enhancements (100% complete - Email workflow)

---

## Executive Summary

**Business Need**: UMIG currently sends email notifications for step status updates and instruction changes without any runtime control mechanism. There is no ability to disable email sending per environment (DEV/UAT/PROD) or notification type without code changes and redeployment.

**Solution**: Implement a 3-tier email control system using the existing `system_configuration_scf` table (established by US-098) that allows:
- Global email on/off control per environment
- Granular control by email type (step updates, instruction updates, other)
- Runtime configuration changes (no code deployment required)
- Complete audit trail of suppressed emails with compliance-grade logging

**Why 3 Story Points**: This story leverages the complete US-098 Configuration Management System infrastructure (ConfigurationService, system_configuration_scf table, environment detection, 4-tier fallback hierarchy, caching). The foundation is already operational with 17/17 tests passing. Implementation requires only:
1. Database migration (9 configuration rows)
2. EnhancedEmailService refactoring (~100 lines added to existing 2,300+ line service)
3. Configuration check integration (4 email methods)
4. Audit logging (reuses existing AuditLogRepository pattern)

---

## User Stories

### Primary User Story

**As a** UMIG Administrator
**I want** granular database-driven control over email notifications across three distinct tiers
**So that** I can selectively enable/disable emails during testing, maintenance, or production operations without code deployment

### Supporting User Stories

**As a** UAT Tester
**I want** to suppress all email notifications during testing while maintaining a complete audit trail
**So that** I can validate email functionality without spamming real users and maintain compliance evidence

**As an** Operations Team Member
**I want** visibility into suppressed emails through audit logs
**So that** I can verify system behavior, troubleshoot issues, and demonstrate compliance during audits

**As a** Developer
**I want** backward-compatible email controls with zero impact to existing functionality
**So that** the system continues to operate normally during rollout and rollback scenarios

---

## Business Value

### Problem Statement

UMIG currently lacks operational controls for email notifications:
- **No UAT testing mode**: Email notifications fire during testing, potentially reaching real users
- **No maintenance mode**: Cannot disable emails during system maintenance windows
- **No audit trail**: Suppressed emails leave no trace for compliance verification
- **Code-level control only**: Requires deployment to change email behavior

### Business Impact

- **Testing Efficiency**: Enable safe UAT testing without email spam (estimated 40% faster test cycles)
- **Operational Flexibility**: Support maintenance windows and phased rollouts with email controls
- **Compliance**: Complete audit trail for suppressed emails meets regulatory requirements
- **Deployment Safety**: Database-driven configuration enables instant email control without code changes
- **Cost Reduction**: Reduce email sending costs during testing (estimated savings: 1,000+ emails/month)

### ROI Calculation

- **Time Savings**: 2 hours/week UAT testing × 4 weeks = 8 hours/month saved
- **Risk Mitigation**: Prevents accidental email spam to production users during testing
- **Compliance Value**: Meets audit requirements for system behavior documentation
- **Operational Value**: Instant email control via database configuration (no deployment required)

---

## Current State Analysis

### Email Sending Architecture (US-098, US-058, TD-016)

**Established Infrastructure**:
```
EnhancedEmailService.groovy (2,300+ lines)
├── sendStepStatusChangedNotificationWithUrl()  # Step status updates (line 85)
├── sendStepOpenedNotificationWithUrl()         # Step opened notifications (line 552)
├── sendInstructionCompletedNotificationWithUrl()      # Instruction completion (line 679)
├── sendInstructionUncompletedNotificationWithUrl()    # Instruction incomplete (line 2015)
└── sendEmailWithAudit()                        # Core audit integration (TD-016)
```

**Email Templates** (3 active templates):
1. `step_status_changed.groovy` - Step status update emails
2. `instruction_completed.groovy` - Instruction completion emails
3. `instruction_incomplete.groovy` - Instruction incomplete emails

**Audit Integration** (TD-016 - 92% code reduction achieved):
- `sendEmailWithAudit()` method established
- `AuditLogRepository` integration complete
- `EVENT_TYPE` enumeration for email events
- Complete audit trail for successful email sends

### Configuration Infrastructure (US-098 - 100% Complete)

**Available Foundation**:
- `system_configuration_scf` table with `env_id` FK support
- `ConfigurationService.groovy` with caching (5-min TTL)
- Type-safe accessors: `getString()`, `getInteger()`, `getBoolean()`
- Environment detection (DEV, UAT, PROD)
- 4-tier fallback hierarchy operational
- 17/17 tests passing (100% test coverage)

**Proven Integration Pattern**:
```groovy
// Already used in macros (stepViewMacro.groovy line 84)
def webRoot = ConfigurationService.getString('umig.web.root', '/rest/scriptrunner/latest/custom/web')
```

### Audit Logging Schema (Existing - Migration 001, 030)

**audit_log_aud Table Structure**:
```sql
CREATE TABLE audit_log_aud (
    aud_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usr_id UUID REFERENCES users_usr(usr_id),
    aud_entity_type VARCHAR(50) NOT NULL,       -- 'STEP_INSTANCE', 'INSTRUCTION_INSTANCE'
    aud_entity_id UUID,                         -- Entity UUID
    aud_action VARCHAR(50) NOT NULL,            -- 'EMAIL_SUPPRESSED', 'EMAIL_SENT'
    aud_event_type VARCHAR(50),                 -- 'EMAIL_SUPPRESSED', 'EMAIL_SENT'
    aud_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    aud_details TEXT,                           -- JSON: suppression reason, recipient, email type
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Performance Indexes** (Migration 030):
- `idx_audit_log_entity` on `(aud_entity_type, aud_entity_id, aud_timestamp DESC)`
- `idx_audit_log_user` on `(usr_id, aud_timestamp DESC)`
- `idx_audit_log_action` on `(aud_entity_type, aud_action, aud_timestamp DESC)`

---

## Functional Requirements

### FR-1: Three-Tier Configuration System

**Configuration Keys**:

| Configuration Key | Data Type | Default | Category | Description |
|-------------------|-----------|---------|----------|-------------|
| `email.send.step_updates` | BOOLEAN | TRUE | EMAIL_CONTROLS | Controls step status update emails from stepView/iterationView |
| `email.send.instruction_updates` | BOOLEAN | TRUE | EMAIL_CONTROLS | Controls instruction complete/incomplete notification emails |
| `email.send.other_emails` | BOOLEAN | FALSE | EMAIL_CONTROLS | Generic control for future email types (default: disabled, opt-in approach) |

**Environment-Specific Configuration**:
- Each configuration key has separate values per environment (DEV, UAT, PROD)
- Environment isolation via `env_id` foreign key constraint
- Runtime changes without code deployment

**Business Rules**:
1. Default to TRUE for existing email types (backward compatible)
2. Default to FALSE for new email types (opt-in approach)
3. Configuration changes take effect within 5 minutes (ConfigurationService cache TTL)
4. All suppressed emails must be audited (no silent failures)

### FR-2: Email Suppression Logic

**Integration Points**:

| Method | Configuration Key | Check Location |
|--------|-------------------|----------------|
| `sendStepStatusChangedNotificationWithUrl` | `email.send.step_updates` | Before template retrieval |
| `sendStepOpenedNotificationWithUrl` | `email.send.step_updates` | Before template retrieval |
| `sendInstructionCompletedNotificationWithUrl` | `email.send.instruction_updates` | Before template retrieval |
| `sendInstructionUncompletedNotificationWithUrl` | `email.send.instruction_updates` | Before template retrieval |

**Suppression Pattern**:
```groovy
// Check configuration before sending email (ADR-031: explicit casting)
def emailEnabled = ConfigurationService.getBoolean('email.send.step_updates', true) as Boolean
if (!emailEnabled) {
    // Log suppression event to audit_log_aud
    return suppressEmailWithAudit(...)
}
```

**Return Value Structure**:
```groovy
[
    success: true,         // Suppression successful (not an error)
    suppressed: true,      // Indicates suppression (NEW field)
    reason: String,        // Reason for suppression (NEW field)
    audit_id: String,      // Audit log UUID (NEW field)
    email_count: 0         // No emails dispatched
]
```

### FR-3: Email Suppression Audit Trail

**Audit Event Structure**:
```sql
INSERT INTO audit_log_aud (
    usr_id,              -- User triggering email (if available)
    aud_entity_type,     -- 'STEP_INSTANCE' or 'INSTRUCTION_INSTANCE'
    aud_entity_id,       -- Step/Instruction UUID
    aud_action,          -- 'EMAIL_NOTIFICATION'
    aud_event_type,      -- 'EMAIL_SUPPRESSED'
    aud_details          -- JSONB with suppression details
)
```

**JSONB Details Schema**:
```json
{
    "email_type": "step_status_update | instruction_completed | instruction_incomplete",
    "intended_recipients": ["joh***@company.com", "use***@company.com"],
    "step_code": "BUS-031",
    "step_title": "Verify database connections",
    "old_status": "PENDING",
    "new_status": "IN_PROGRESS",
    "suppression_reason": "email.send.step_updates=false in UAT environment",
    "configuration_source": "database",
    "timestamp": "2025-10-07T14:30:25.123Z"
}
```

**Security Requirements**:
- Recipient email addresses masked in logs (first 3 chars + *** + @domain)
- No sensitive data exposed in audit logs
- Only metadata captured (follows US-098 Phase 3 security classification)

### FR-4: Environment-Specific Configuration

**Environment Configuration Examples**:

**DEV Environment** (Development - emails enabled for testing):
```sql
INSERT INTO system_configuration_scf (env_id, scf_key, scf_category, scf_value, scf_data_type, scf_description) VALUES
((SELECT env_id FROM environments_env WHERE env_code = 'DEV'), 'email.send.step_updates', 'EMAIL_CONTROLS', 'true', 'BOOLEAN', 'Enable step status update emails in DEV'),
((SELECT env_id FROM environments_env WHERE env_code = 'DEV'), 'email.send.instruction_updates', 'EMAIL_CONTROLS', 'true', 'BOOLEAN', 'Enable instruction notification emails in DEV'),
((SELECT env_id FROM environments_env WHERE env_code = 'DEV'), 'email.send.other_emails', 'EMAIL_CONTROLS', 'false', 'BOOLEAN', 'Disable other email types in DEV by default');
```

**UAT Environment** (User Testing - emails disabled for safety):
```sql
-- UAT: emails suppressed during testing cycles
INSERT INTO system_configuration_scf (env_id, scf_key, scf_category, scf_value, scf_data_type, scf_description) VALUES
((SELECT env_id FROM environments_env WHERE env_code = 'UAT'), 'email.send.step_updates', 'EMAIL_CONTROLS', 'false', 'BOOLEAN', 'Suppress step emails during UAT testing'),
((SELECT env_id FROM environments_env WHERE env_code = 'UAT'), 'email.send.instruction_updates', 'EMAIL_CONTROLS', 'false', 'BOOLEAN', 'Suppress instruction emails during UAT testing'),
((SELECT env_id FROM environments_env WHERE env_code = 'UAT'), 'email.send.other_emails', 'EMAIL_CONTROLS', 'false', 'BOOLEAN', 'Disable other email types in UAT');
```

**PROD Environment** (Production - all emails enabled):
```sql
-- Production: all emails operational
INSERT INTO system_configuration_scf (env_id, scf_key, scf_category, scf_value, scf_data_type, scf_description) VALUES
((SELECT env_id FROM environments_env WHERE env_code = 'PROD'), 'email.send.step_updates', 'EMAIL_CONTROLS', 'true', 'BOOLEAN', 'Enable step status update emails in PROD'),
((SELECT env_id FROM environments_env WHERE env_code = 'PROD'), 'email.send.instruction_updates', 'EMAIL_CONTROLS', 'true', 'BOOLEAN', 'Enable instruction notification emails in PROD'),
((SELECT env_id FROM environments_env WHERE env_code = 'PROD'), 'email.send.other_emails', 'EMAIL_CONTROLS', 'false', 'BOOLEAN', 'Disable other email types in PROD by default');
```

**Environment Detection**:
- ConfigurationService automatically detects current environment via `getCurrentEnvironment()`
- Environment resolution uses 4-tier fallback: System property → Environment variable → Database → Default (PROD)

### FR-5: Backward Compatibility

**Fallback Behavior**:
```groovy
// Default to TRUE (send emails) if configuration not found
def emailEnabled = ConfigurationService.getBoolean('email.send.step_updates', true)
```

**Graceful Degradation**:
1. **Configuration Not Found**: Default to TRUE (send email)
2. **ConfigurationService Error**: Catch exception, default to TRUE, log warning
3. **Database Unavailable**: ConfigurationService falls back to .env (LOCAL) or default
4. **Cache Expired**: ConfigurationService refreshes from database (5-minute TTL)

**Error Handling Pattern**:
```groovy
try {
    def emailEnabled = ConfigurationService.getBoolean('email.send.step_updates', true)
    if (!emailEnabled) {
        // Suppression path
    }
} catch (Exception e) {
    log.warn("Email configuration check failed, defaulting to enabled: ${e.message}")
    // Continue with email sending (fail-safe)
}
```

---

## Acceptance Criteria

### AC-1: Configuration Keys Established

**Given** the system_configuration_scf table exists (US-098)
**When** I query for email control configuration keys
**Then** three configuration keys should exist for each environment:

- `email.send.step_updates` (BOOLEAN, default: TRUE)
- `email.send.instruction_updates` (BOOLEAN, default: TRUE)
- `email.send.other_emails` (BOOLEAN, default: FALSE)

**And** each key should have environment-specific values for DEV, UAT, PROD
**And** configuration metadata should include:
- `scf_category` = 'EMAIL_CONTROLS'
- `scf_data_type` = 'BOOLEAN'
- `scf_is_system_managed` = FALSE (admin-editable)
- `scf_description` with clear explanation of control purpose

**Database Validation**:
```sql
SELECT
    e.env_code,
    scf.scf_key,
    scf.scf_value,
    scf.scf_description
FROM system_configuration_scf scf
JOIN environments_env e ON scf.env_id = e.env_id
WHERE scf.scf_category = 'EMAIL_CONTROLS'
ORDER BY e.env_code, scf.scf_key;

-- Expected: 9 rows (3 environments × 3 keys)
-- DEV:  email.send.step_updates = 'true'
-- DEV:  email.send.instruction_updates = 'true'
-- DEV:  email.send.other_emails = 'false'
-- UAT:  email.send.step_updates = 'false'  # Testing mode
-- UAT:  email.send.instruction_updates = 'false'  # Testing mode
-- UAT:  email.send.other_emails = 'false'
-- PROD: email.send.step_updates = 'true'
-- PROD: email.send.instruction_updates = 'true'
-- PROD: email.send.other_emails = 'false'
```

### AC-2: ConfigurationService Integration

**Given** the ConfigurationService exists (US-098)
**When** EnhancedEmailService checks email sending controls
**Then** it should use ConfigurationService.getBoolean() for type-safe access
**And** follow 4-tier fallback hierarchy:
1. Environment-specific value (e.g., UAT: false)
2. Global value (if set)
3. System environment variable (LOCAL/DEV only)
4. Hardcoded default (TRUE for step/instruction, FALSE for other)

**And** configuration access should be cached (5-min TTL per US-098)
**And** explicit type casting per ADR-031/043

**Implementation Pattern**:
```groovy
// EnhancedEmailService.groovy - Email control check
private static boolean isEmailTypeEnabled(String emailType) {
    String configKey = "email.send.${emailType}" as String
    Boolean enabled = umig.service.ConfigurationService.getBoolean(
        configKey,
        getDefaultForEmailType(emailType as String)
    )

    log.debug("Email control check: ${configKey} = ${enabled}")
    return enabled as boolean
}

private static Boolean getDefaultForEmailType(String emailType) {
    // Safe defaults (ADR-031: explicit casting)
    if (emailType == 'step_updates' || emailType == 'instruction_updates') {
        return Boolean.TRUE
    }
    return Boolean.FALSE  // Other email types disabled by default
}
```

### AC-3: Step Status Update Email Control

**Given** a step status change event occurs
**When** `sendStepStatusChangedNotificationWithUrl()` is called
**Then** it should check `email.send.step_updates` configuration
**And** if TRUE: send email normally and log `EVENT_TYPE='EMAIL_SENT'`
**And** if FALSE: suppress email and log `EVENT_TYPE='EMAIL_SUPPRESSED'` with audit details

**Suppression Audit Details** (JSON format):
```json
{
  "email_type": "step_status_update",
  "intended_recipients": ["joh***@company.com", "use***@company.com"],
  "step_code": "BUS-031",
  "step_title": "Cutover Step Title",
  "old_status": "PENDING",
  "new_status": "IN_PROGRESS",
  "suppression_reason": "email.send.step_updates=false in UAT environment",
  "configuration_source": "database",
  "timestamp": "2025-10-07T14:30:25.123Z"
}
```

### AC-4: Instruction Update Email Control

**Given** an instruction completion/incomplete event occurs
**When** `sendInstructionCompletedNotificationWithUrl()` or `sendInstructionUncompletedNotificationWithUrl()` is called
**Then** it should check `email.send.instruction_updates` configuration
**And** if TRUE: send email normally and log `EVENT_TYPE='EMAIL_SENT'`
**And** if FALSE: suppress email and log `EVENT_TYPE='EMAIL_SUPPRESSED'` with audit details

**Suppression Audit Details** (JSON format):
```json
{
  "email_type": "instruction_completed",
  "intended_recipients": ["tea***@company.com"],
  "instruction_id": "uuid-here",
  "instruction_name": "Verify database backup",
  "step_code": "BUS-031",
  "completed_by": "john.doe",
  "suppression_reason": "email.send.instruction_updates=false in UAT environment",
  "configuration_source": "database",
  "timestamp": "2025-10-07T14:30:25.123Z"
}
```

### AC-5: Email Suppression Audit Trail

**Given** an email is suppressed due to configuration
**When** the suppression occurs
**Then** an audit log entry should be created with:
- `aud_entity_type` = 'STEP_INSTANCE' or 'INSTRUCTION_INSTANCE'
- `aud_entity_id` = Step/Instruction UUID
- `aud_action` = 'EMAIL_NOTIFICATION'
- `aud_event_type` = 'EMAIL_SUPPRESSED'
- `aud_details` = JSON with suppression context (see AC-3, AC-4)
- `usr_id` = User who triggered the action (if available)
- `aud_timestamp` = Suppression timestamp

**And** the method should return success status with suppression indicator:
```groovy
[
    success: true,
    suppressed: true,
    reason: 'email.send.step_updates=false',
    audit_id: 'uuid-here',
    email_count: 0
]
```

**Audit Query Validation**:
```sql
-- Query suppressed emails for compliance reporting
SELECT
    aud_timestamp,
    aud_entity_type,
    aud_event_type,
    aud_details::json->>'email_type' as email_type,
    aud_details::json->>'intended_recipients' as recipients,
    aud_details::json->>'suppression_reason' as reason
FROM audit_log_aud
WHERE aud_event_type = 'EMAIL_SUPPRESSED'
    AND aud_timestamp >= NOW() - INTERVAL '7 days'
ORDER BY aud_timestamp DESC;

-- Expected: All suppressed emails with complete context
```

### AC-6: Future Email Type Extensibility

**Given** the `email.send.other_emails` configuration key exists
**When** a new email type is added in the future (e.g., reminder emails, escalation emails)
**Then** it should default to checking `email.send.other_emails` configuration
**And** the configuration should default to FALSE for safety
**And** a new specific configuration key can be added later (e.g., `email.send.reminders`)

**Future Extension Pattern**:
```groovy
// Future email types use 'other_emails' control initially
static Map sendReminderNotification(Map reminderData) {
    if (!isEmailTypeEnabled('other_emails')) {
        return suppressEmailWithAudit('reminder', reminderData, ...)
    }
    // Send reminder email
}

// Later, when reminders mature, add specific control:
// Configuration key: email.send.reminders (defaults to other_emails)
```

### AC-7: Environment-Specific Configuration

**Given** the system operates in DEV, UAT, or PROD environments
**When** email controls are evaluated
**Then** the configuration should follow environment-specific settings:

**DEV Environment** (Testing, all emails enabled):
- `email.send.step_updates` = TRUE
- `email.send.instruction_updates` = TRUE
- `email.send.other_emails` = FALSE

**UAT Environment** (User testing, emails suppressed for safety):
- `email.send.step_updates` = FALSE
- `email.send.instruction_updates` = FALSE
- `email.send.other_emails` = FALSE

**PROD Environment** (Production, all emails enabled):
- `email.send.step_updates` = TRUE
- `email.send.instruction_updates` = TRUE
- `email.send.other_emails` = FALSE

**And** administrators should be able to change these via:
1. Admin GUI (future US-103 - Admin Configuration UI)
2. Direct SQL updates (immediate availability)
3. Liquibase migrations (initial setup)

### AC-8: Performance Requirements

**Given** the email control check executes on every email send attempt
**When** performance is measured
**Then** the configuration check should:
- Complete in <5ms (cached)
- Complete in <50ms (uncached, database lookup)
- Have zero impact on email sending performance (negligible overhead)
- Benefit from ConfigurationService 5-min cache TTL (US-098)

**And** audit logging should:
- Complete in <20ms average
- Use AuditLogRepository (established in TD-016)
- Not block email sending flow (async where possible)

**Performance Validation**:
```bash
# Benchmark email control check
time npm run test:groovy:unit -- ConfigurationServiceEmailControlTest

# Expected: All tests pass in <100ms total
```

### AC-9: Backward Compatibility

**Given** the system has existing email sending functionality
**When** the 3-tier email control system is deployed
**Then** there should be:
- Zero breaking changes to existing email methods
- Default configuration values that maintain current behavior (all enabled)
- Graceful degradation if configuration is unavailable (default to enabled)
- No impact to existing audit logging from TD-016

**And** the system should support rollback:
- Configuration keys can be deleted (system falls back to defaults)
- Code can be reverted without database changes
- Audit logs are preserved permanently

**Rollback Test**:
```sql
-- Delete email control configurations
DELETE FROM system_configuration_scf
WHERE scf_category = 'EMAIL_CONTROLS';

-- Expected: System continues to send emails (defaults to TRUE)
```

### AC-10: Security & Access Control

**Given** email control configurations are stored in the database
**When** administrators access or modify email controls
**Then** the configuration should:
- Be editable only by users with ADMIN role
- Be visible to users with PILOT role (read-only)
- Be hidden from users with NORMAL role
- Have audit trail for all configuration changes

**And** email suppression should not expose sensitive data:
- Recipient email addresses should be masked in logs (first 3 chars + ***)
- Email content should not be logged
- Only metadata should be captured in audit trail

**Security Pattern**:
```groovy
// Mask email addresses in audit logs
private static String maskEmail(String email) {
    if (!email || email.length() < 5) return '***'
    return email.take(3) + '***' + email.tokenize('@').last()
}

// Example: john.doe@company.com → joh***@company.com
```

### AC-11: Configuration Change Propagation

**Given** an administrator changes email control configuration
**When** the configuration is updated in the database
**Then** the change should:
- Take effect within 5 minutes (cache TTL from US-098)
- Be logged in audit_log_aud with `aud_action='CONFIGURATION_CHANGED'`
- Be visible immediately if cache is manually cleared

**And** administrators should have a way to force immediate propagation:
```groovy
// Clear cache to force immediate configuration reload
umig.service.ConfigurationService.clearCache()
```

**Cache Refresh Pattern**:
```bash
# Admin GUI button (future US-103)
POST /rest/scriptrunner/latest/custom/admin/configuration/refresh

# Expected: Cache cleared, new configuration takes effect immediately
```

### AC-12: Testing Requirements

**Given** the 3-tier email control system is implemented
**When** tests are executed
**Then** the test suite should include:

**Unit Tests** (`ConfigurationServiceEmailControlTest.groovy`):
- Test `isEmailTypeEnabled()` for all three email types
- Test default value handling for each email type
- Test configuration fallback hierarchy
- Test type safety (ADR-031/043 compliance)

**Integration Tests** (`EnhancedEmailServiceSuppressionTest.groovy`):
- Test step status email suppression with audit logging
- Test instruction email suppression with audit logging
- Test email sending when controls are enabled
- Test audit log structure and content
- Test performance (<5ms cached, <50ms uncached)

**Manual Testing Checklist**:
- [ ] Configure UAT to suppress all emails
- [ ] Trigger step status change in UAT
- [ ] Verify no email sent, audit log entry created
- [ ] Query audit log for suppressed emails
- [ ] Change configuration to enable emails
- [ ] Wait 5 minutes for cache expiration
- [ ] Trigger step status change again
- [ ] Verify email sent successfully

---

## Technical Specifications

### Implementation Files

**Primary Changes**:

1. **EnhancedEmailService.groovy** (UPDATE - ~100 lines added)
   - Add `isEmailTypeEnabled(String emailType)` method
   - Add `getDefaultForEmailType(String emailType)` method
   - Add `suppressEmailWithAudit()` method
   - Add `maskEmail()` method for security
   - Update `sendStepStatusChangedNotificationWithUrl()` to check controls
   - Update `sendStepOpenedNotificationWithUrl()` to check controls
   - Update `sendInstructionCompletedNotificationWithUrl()` to check controls
   - Update `sendInstructionUncompletedNotificationWithUrl()` to check controls

2. **Liquibase Migration 036** (NEW - Configuration Data)
   - File: `local-dev-setup/liquibase/changelogs/036_us102_email_controls.sql`
   - Insert 9 configuration rows (3 environments × 3 email types)
   - Add rollback SQL

**Testing**:

3. **ConfigurationServiceEmailControlTest.groovy** (NEW - Unit Tests)
   - Test `isEmailTypeEnabled()` for all email types
   - Test default values
   - Test configuration fallback
   - Test type safety

4. **EnhancedEmailServiceSuppressionTest.groovy** (NEW - Integration Tests)
   - Test email suppression with audit logging
   - Test email sending when enabled
   - Test audit log structure
   - Test performance requirements

**Documentation**:

5. **docs/architecture/implementation-notes/US-102-3-Tier-Email-Control.md** (NEW)
   - Implementation guide
   - Configuration reference
   - Audit log query examples
   - Troubleshooting guide

### Database Schema Changes

#### Migration 036: Email Control Configuration

**File**: `local-dev-setup/liquibase/changelogs/036_us102_email_controls.sql`

```sql
-- Liquibase formatted sql
-- changeset lucas:036-us102-email-controls
-- comment: US-102 - Add 3-tier email sending control configuration

-- Insert email control configurations for all environments
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_data_type,
    scf_description, scf_is_active, scf_is_system_managed,
    created_by, created_at
)
SELECT
    e.env_id,
    'email.send.step_updates',
    'EMAIL_CONTROLS',
    CASE
        WHEN e.env_code = 'UAT' THEN 'false'  -- Suppress in UAT for testing
        ELSE 'true'                            -- Enable in DEV/PROD
    END,
    'BOOLEAN',
    'Controls whether step status update emails are sent. Set to false during testing to suppress emails while maintaining audit trail.',
    TRUE,
    FALSE,  -- Admin-editable
    'system',
    CURRENT_TIMESTAMP
FROM environments_env e
WHERE e.env_code IN ('DEV', 'UAT', 'PROD');

INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_data_type,
    scf_description, scf_is_active, scf_is_system_managed,
    created_by, created_at
)
SELECT
    e.env_id,
    'email.send.instruction_updates',
    'EMAIL_CONTROLS',
    CASE
        WHEN e.env_code = 'UAT' THEN 'false'  -- Suppress in UAT for testing
        ELSE 'true'                            -- Enable in DEV/PROD
    END,
    'BOOLEAN',
    'Controls whether instruction complete/incomplete emails are sent. Set to false during testing to suppress emails while maintaining audit trail.',
    TRUE,
    FALSE,  -- Admin-editable
    'system',
    CURRENT_TIMESTAMP
FROM environments_env e
WHERE e.env_code IN ('DEV', 'UAT', 'PROD');

INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_data_type,
    scf_description, scf_is_active, scf_is_system_managed,
    created_by, created_at
)
SELECT
    e.env_id,
    'email.send.other_emails',
    'EMAIL_CONTROLS',
    'false',  -- Disabled by default for all environments
    'BOOLEAN',
    'Controls whether other email types (future: reminders, escalations) are sent. Defaults to false for safety. Add specific controls for mature email types.',
    TRUE,
    FALSE,  -- Admin-editable
    'system',
    CURRENT_TIMESTAMP
FROM environments_env e
WHERE e.env_code IN ('DEV', 'UAT', 'PROD');

-- Verification query
SELECT
    e.env_code,
    scf.scf_key,
    scf.scf_value,
    scf.scf_description
FROM system_configuration_scf scf
JOIN environments_env e ON scf.env_id = e.env_id
WHERE scf.scf_category = 'EMAIL_CONTROLS'
ORDER BY e.env_code, scf.scf_key;

-- Expected: 9 rows (3 environments × 3 email types)

-- rollback DELETE FROM system_configuration_scf WHERE scf_category = 'EMAIL_CONTROLS';
```

**Justification**:
- UAT environment defaults to suppressed emails for safe testing
- DEV/PROD environments default to enabled for normal operations
- `other_emails` defaults to FALSE for safety (opt-in for new email types)
- All keys are admin-editable (`scf_is_system_managed = FALSE`)

### Implementation Pattern

#### EnhancedEmailService.groovy Changes

```groovy
package umig.utils

// Existing imports...
import umig.service.ConfigurationService

class EnhancedEmailService {
    // Existing code...

    /**
     * Check if email type is enabled via configuration.
     *
     * Uses ConfigurationService.getBoolean() with 4-tier fallback:
     * 1. Environment-specific configuration
     * 2. Global configuration
     * 3. System environment variable (LOCAL/DEV only)
     * 4. Hardcoded default
     *
     * @param emailType Email type suffix (step_updates, instruction_updates, other_emails)
     * @return true if email should be sent, false if suppressed
     * US-102: 3-Tier Email Control System
     */
    private static boolean isEmailTypeEnabled(String emailType) {
        if (!emailType) {
            log.warn("isEmailTypeEnabled called with null/empty emailType, defaulting to FALSE")
            return false
        }

        try {
            // Build configuration key (ADR-031: explicit casting)
            String configKey = "email.send.${emailType}" as String

            // Get default value based on email type
            Boolean defaultValue = getDefaultForEmailType(emailType as String)

            // Query configuration with type-safe accessor (US-098)
            Boolean enabled = ConfigurationService.getBoolean(configKey, defaultValue)

            log.debug("Email control check: ${configKey} = ${enabled} (default: ${defaultValue})")
            return enabled as boolean

        } catch (Exception e) {
            log.error("Failed to check email control for ${emailType}: ${e.message}", e)
            // Fail-safe: default to enabled to avoid breaking email functionality
            return true
        }
    }

    /**
     * Get default value for email type.
     *
     * Default Values:
     * - step_updates: TRUE (core functionality)
     * - instruction_updates: TRUE (core functionality)
     * - other_emails: FALSE (opt-in for new email types)
     *
     * @param emailType Email type suffix
     * @return Default boolean value
     * US-102: 3-Tier Email Control System
     */
    private static Boolean getDefaultForEmailType(String emailType) {
        // ADR-031: explicit casting for type safety
        String normalizedType = (emailType as String)?.toLowerCase()?.trim()

        if (normalizedType == 'step_updates' || normalizedType == 'instruction_updates') {
            return Boolean.TRUE  // Core email types enabled by default
        }

        return Boolean.FALSE  // Other email types disabled by default (opt-in)
    }

    /**
     * Suppress email and create audit trail.
     *
     * Creates audit log entry with:
     * - EVENT_TYPE = 'EMAIL_SUPPRESSED'
     * - Complete suppression context in aud_details JSON
     * - Entity type and ID for traceability
     *
     * @param emailType Email type (step_status_update, instruction_completed, etc.)
     * @param entity Entity map (step instance or instruction)
     * @param recipients List of intended recipients
     * @param context Additional context for audit log
     * @param userId User who triggered the action (optional)
     * @return Map with suppression status and audit ID
     * US-102: 3-Tier Email Control System
     */
    private static Map suppressEmailWithAudit(
        String emailType,
        Map entity,
        List<Map> recipients,
        Map context = [:],
        Integer userId = null) {

        try {
            log.info("🚫 Email suppressed: ${emailType} (config: email.send.${emailType}=false)")

            // Build suppression details (ADR-031: explicit casting)
            String currentEnv = ConfigurationService.getCurrentEnvironment()
            String configKey = "email.send.${emailType}" as String

            // Mask recipient email addresses for security
            List<String> maskedRecipients = recipients.collect { team ->
                maskEmail((team.team_email ?: team.usr_email) as String)
            }

            Map suppressionDetails = [
                email_type: emailType,
                intended_recipients: maskedRecipients,
                suppression_reason: "${configKey}=false in ${currentEnv} environment",
                configuration_source: 'database',
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ] + context  // Merge additional context

            // Create audit log entry
            def auditRepository = new AuditLogRepository()
            UUID entityId = entity.sti_id ?: entity.ini_id ?: entity.id
            String entityType = entity.sti_id ? 'STEP_INSTANCE' : 'INSTRUCTION_INSTANCE'

            UUID auditId = auditRepository.logAction(
                userId,
                entityType as String,
                entityId as UUID,
                'EMAIL_NOTIFICATION' as String,
                'EMAIL_SUPPRESSED' as String,
                new JsonBuilder(suppressionDetails).toString()
            )

            log.debug("📋 Audit log created: ${auditId} (entity: ${entityType}, id: ${entityId})")

            // Return suppression status
            return [
                success: true,
                suppressed: true,
                reason: "${configKey}=false",
                audit_id: auditId.toString(),
                email_count: 0
            ] as Map

        } catch (Exception e) {
            log.error("Failed to create suppression audit log: ${e.message}", e)
            // Return success even if audit fails (email was suppressed successfully)
            return [
                success: true,
                suppressed: true,
                reason: "Configuration suppression (audit failed: ${e.message})",
                email_count: 0
            ] as Map
        }
    }

    /**
     * Mask email address for audit logging.
     *
     * Pattern: first 3 characters + *** + @domain
     * Example: john.doe@company.com → joh***@company.com
     *
     * @param email Email address to mask
     * @return Masked email address
     * US-102: 3-Tier Email Control System (Security)
     */
    private static String maskEmail(String email) {
        if (!email || email.length() < 5) {
            return '***'
        }

        try {
            String[] parts = (email as String).split('@')
            if (parts.length != 2) {
                return '***'
            }

            String localPart = parts[0]
            String domain = parts[1]

            // Show first 3 characters, mask rest of local part
            String maskedLocal = localPart.take(3) + '***'
            return "${maskedLocal}@${domain}"

        } catch (Exception e) {
            log.warn("Failed to mask email ${email}: ${e.message}")
            return '***'
        }
    }

    /**
     * Send step status changed notification with email control check.
     *
     * UPDATED: US-102 - Check email.send.step_updates configuration
     *
     * @param stepInstance Step instance data
     * @param teams List of teams to notify
     * @param cutoverTeam IT Cutover team data
     * @param oldStatus Previous step status
     * @param newStatus New step status
     * @param userId User who changed status (optional)
     * @param migrationCode Migration code (optional)
     * @param iterationCode Iteration code (optional)
     * @return Map with success status and email count
     */
    static Map sendStepStatusChangedNotificationWithUrl(
        Map stepInstance, List<Map> teams, Map cutoverTeam,
        String oldStatus, String newStatus, Integer userId = null,
        String migrationCode = null, String iterationCode = null) {

        println "🔧 [EnhancedEmailService] START sendStepStatusChangedNotificationWithUrl"

        // US-102: Check email control BEFORE processing
        if (!isEmailTypeEnabled('step_updates')) {
            return suppressEmailWithAudit(
                'step_status_update',
                stepInstance,
                teams + [cutoverTeam],
                [
                    step_code: stepInstance.step_code,
                    step_title: stepInstance.step_title,
                    old_status: oldStatus,
                    new_status: newStatus
                ] as Map,
                userId
            )
        }

        // Existing email sending logic (unchanged)
        // ... (lines 88-400+ continue as-is)

        println "🔧 [EnhancedEmailService] END sendStepStatusChangedNotificationWithUrl"
    }

    /**
     * Send step opened notification with email control check.
     *
     * UPDATED: US-102 - Check email.send.step_updates configuration
     */
    static Map sendStepOpenedNotificationWithUrl(
        Map stepInstance, List<Map> teams, Map cutoverTeam,
        Integer userId = null, String migrationCode = null, String iterationCode = null) {

        println "🔧 [EnhancedEmailService] START sendStepOpenedNotificationWithUrl"

        // US-102: Check email control BEFORE processing
        if (!isEmailTypeEnabled('step_updates')) {
            return suppressEmailWithAudit(
                'step_opened',
                stepInstance,
                teams + [cutoverTeam],
                [
                    step_code: stepInstance.step_code,
                    step_title: stepInstance.step_title
                ] as Map,
                userId
            )
        }

        // Existing email sending logic (unchanged)
        // ...

        println "🔧 [EnhancedEmailService] END sendStepOpenedNotificationWithUrl"
    }

    /**
     * Send instruction completed notification with email control check.
     *
     * UPDATED: US-102 - Check email.send.instruction_updates configuration
     */
    static Map sendInstructionCompletedNotificationWithUrl(
        Map instructionInstance, Map stepInstance, Map completedByUser) {

        println "🔧 [EnhancedEmailService] START sendInstructionCompletedNotificationWithUrl"

        // US-102: Check email control BEFORE processing
        if (!isEmailTypeEnabled('instruction_updates')) {
            return suppressEmailWithAudit(
                'instruction_completed',
                instructionInstance,
                [stepInstance.assigned_team],
                [
                    instruction_id: instructionInstance.ini_id,
                    instruction_name: instructionInstance.ini_name,
                    step_code: stepInstance.step_code,
                    completed_by: completedByUser.usr_code
                ] as Map,
                completedByUser.usr_id as Integer
            )
        }

        // Existing email sending logic (unchanged)
        // ...

        println "🔧 [EnhancedEmailService] END sendInstructionCompletedNotificationWithUrl"
    }

    /**
     * Send instruction uncompleted notification with email control check.
     *
     * UPDATED: US-102 - Check email.send.instruction_updates configuration
     */
    static Map sendInstructionUncompletedNotificationWithUrl(
        Map instructionInstance, Map stepInstance, Map markedByUser) {

        println "🔧 [EnhancedEmailService] START sendInstructionUncompletedNotificationWithUrl"

        // US-102: Check email control BEFORE processing
        if (!isEmailTypeEnabled('instruction_updates')) {
            return suppressEmailWithAudit(
                'instruction_incomplete',
                instructionInstance,
                [stepInstance.assigned_team],
                [
                    instruction_id: instructionInstance.ini_id,
                    instruction_name: instructionInstance.ini_name,
                    step_code: stepInstance.step_code,
                    marked_by: markedByUser.usr_code
                ] as Map,
                markedByUser.usr_id as Integer
            )
        }

        // Existing email sending logic (unchanged)
        // ...

        println "🔧 [EnhancedEmailService] END sendInstructionUncompletedNotificationWithUrl"
    }

    // Existing methods continue unchanged...
}
```

---

## Implementation Phases

### Phase 1: Database Configuration (1-2 hours)

**Tasks**:
1. Create `local-dev-setup/liquibase/changelogs/036_us102_email_controls.sql`
2. Add migration to `db.changelog-master.xml`
3. Test migration application
4. Verify 9 configuration rows created (3 environments × 3 keys)
5. Test configuration queries

**Validation**:
```bash
npm run db:migrate
psql -d umig_app_db -c "
SELECT e.env_code, scf.scf_key, scf.scf_value
FROM system_configuration_scf scf
JOIN environments_env e ON scf.env_id = e.env_id
WHERE scf.scf_category = 'EMAIL_CONTROLS'
ORDER BY e.env_code, scf.scf_key;"

# Expected: 9 rows showing email controls for DEV/UAT/PROD
```

### Phase 2: EnhancedEmailService Implementation (3-4 hours)

**Tasks**:
1. Add `isEmailTypeEnabled()` method
2. Add `getDefaultForEmailType()` method
3. Add `suppressEmailWithAudit()` method
4. Add `maskEmail()` method for security
5. Update `sendStepStatusChangedNotificationWithUrl()` to check controls
6. Update `sendStepOpenedNotificationWithUrl()` to check controls
7. Update `sendInstructionCompletedNotificationWithUrl()` to check controls
8. Update `sendInstructionUncompletedNotificationWithUrl()` to check controls
9. Add comprehensive logging
10. Test type safety (ADR-031/043)

**Deliverables**:
- EnhancedEmailService.groovy with ~100 lines added
- Complete email control logic
- Audit trail integration

### Phase 3: Testing & Validation (2-3 hours)

**Tasks**:
1. Write `ConfigurationServiceEmailControlTest.groovy` unit tests
2. Write `EnhancedEmailServiceSuppressionTest.groovy` integration tests
3. Test email suppression in UAT environment
4. Test email sending in DEV/PROD environments
5. Verify audit log entries created correctly
6. Test performance (<5ms cached, <50ms uncached)
7. Test backward compatibility (default behavior unchanged)
8. Test cache expiration and refresh

**Validation Commands**:
```bash
npm run test:groovy:unit -- ConfigurationServiceEmailControlTest
npm run test:groovy:integration -- EnhancedEmailServiceSuppressionTest

# Manual testing
psql -d umig_app_db -c "
SELECT * FROM audit_log_aud
WHERE aud_event_type = 'EMAIL_SUPPRESSED'
ORDER BY aud_timestamp DESC LIMIT 10;"
```

### Phase 4: Documentation (1 hour)

**Tasks**:
1. Create `docs/architecture/implementation-notes/US-102-3-Tier-Email-Control.md`
2. Document configuration keys and values
3. Add audit log query examples for operations team
4. Create troubleshooting guide
5. Update `docs/deployment/ENVIRONMENT_CONFIGURATION.md`
6. Add JSDoc comments to all new methods

**Documentation Checklist**:
- [ ] Implementation guide complete
- [ ] Configuration reference documented
- [ ] Audit log query examples provided
- [ ] Troubleshooting section added
- [ ] JSDoc comments on all methods

---

## Testing Strategy

### Unit Tests (Groovy)

**Location**: `src/groovy/umig/tests/unit/ConfigurationServiceEmailControlTest.groovy`

**Test Coverage**:
```groovy
@Test
void testIsEmailTypeEnabled_StepUpdates_EnabledInProd() {
    // Mock ConfigurationService to return TRUE for step_updates in PROD
    assert EnhancedEmailService.isEmailTypeEnabled('step_updates') == true
}

@Test
void testIsEmailTypeEnabled_StepUpdates_SuppressedInUat() {
    // Mock ConfigurationService to return FALSE for step_updates in UAT
    assert EnhancedEmailService.isEmailTypeEnabled('step_updates') == false
}

@Test
void testGetDefaultForEmailType_StepUpdates() {
    assert EnhancedEmailService.getDefaultForEmailType('step_updates') == Boolean.TRUE
}

@Test
void testGetDefaultForEmailType_OtherEmails() {
    assert EnhancedEmailService.getDefaultForEmailType('other_emails') == Boolean.FALSE
}

@Test
void testMaskEmail_StandardEmail() {
    String masked = EnhancedEmailService.maskEmail('john.doe@company.com')
    assert masked == 'joh***@company.com'
}
```

**Coverage Target**: >90% for new methods

### Integration Tests (Groovy)

**Location**: `src/groovy/umig/tests/integration/EnhancedEmailServiceSuppressionTest.groovy`

**Test Scenarios**:
```groovy
@Test
void testStepStatusEmail_Suppressed_AuditLogCreated() {
    // 1. Configure UAT environment with step_updates=false
    // 2. Trigger step status change
    // 3. Verify no email sent
    // 4. Query audit_log_aud for EMAIL_SUPPRESSED entry
    // 5. Verify audit details JSON structure
}

@Test
void testStepStatusEmail_Enabled_EmailSent() {
    // 1. Configure DEV environment with step_updates=true
    // 2. Trigger step status change
    // 3. Verify email sent successfully
    // 4. Verify audit log shows EMAIL_SENT (existing TD-016 functionality)
}

@Test
void testInstructionEmail_Suppressed_AuditLogCreated() {
    // 1. Configure UAT environment with instruction_updates=false
    // 2. Trigger instruction completion
    // 3. Verify no email sent
    // 4. Query audit_log_aud for EMAIL_SUPPRESSED entry
}

@Test
void testEmailControlPerformance_CachedAccess() {
    // 1. Warm up cache
    // 2. Measure 100 isEmailTypeEnabled() calls
    // 3. Assert average time <5ms
}
```

### Manual Testing Checklist

- [ ] Deploy Migration 036 successfully
- [ ] Verify 9 configuration rows exist in system_configuration_scf
- [ ] Configure UAT to suppress step_updates emails
- [ ] Trigger step status change in UAT
- [ ] Verify no email sent (check MailHog)
- [ ] Query audit_log_aud for EMAIL_SUPPRESSED entry
- [ ] Verify suppression_reason includes configuration key
- [ ] Verify intended_recipients are masked
- [ ] Change UAT configuration to enable emails
- [ ] Wait 5 minutes for cache expiration (or clear cache manually)
- [ ] Trigger step status change again
- [ ] Verify email sent successfully
- [ ] Test instruction completion email suppression
- [ ] Test performance (cached vs uncached)
- [ ] Test backward compatibility (delete configurations, verify default behavior)

---

## Risk Mitigation

### Risk 1: Email Functionality Breaking (MEDIUM)

**Risk**: New email control logic introduces bugs that break existing email functionality

**Mitigation**:
- Add email control check as first step (early return if suppressed)
- Preserve all existing email sending logic unchanged
- Comprehensive unit and integration tests
- Test in UAT before PROD deployment
- Default to enabled for fail-safe behavior
- Backward compatibility tests (delete configurations, verify emails still work)

**Validation**:
```bash
# Test existing email functionality unchanged
npm run test:groovy:integration -- EnhancedEmailServiceTest

# Expected: All existing email tests pass
```

### Risk 2: Audit Log Performance Impact (LOW)

**Risk**: Audit logging for suppressed emails impacts system performance

**Mitigation**:
- Use existing AuditLogRepository (optimized in TD-016, 92% code reduction)
- Leverage existing audit_log_aud indexes (Migration 030)
- Async audit logging where possible
- Performance benchmarks in integration tests (<20ms)
- Monitor audit log table growth

### Risk 3: Configuration Cache Staleness (LOW)

**Risk**: Configuration changes don't propagate immediately due to 5-min cache TTL

**Mitigation**:
- Document 5-min cache TTL clearly for administrators
- Provide manual cache clear capability (ConfigurationService.clearCache())
- Include cache refresh button in future Admin GUI (US-103)
- Log configuration source in audit logs (database vs cache)
- Monitor cache efficiency (US-098 cache statistics)

### Risk 4: UAT Suppression Forgotten in PROD (MEDIUM)

**Risk**: UAT email suppression configuration accidentally left enabled in PROD

**Mitigation**:
- Default PROD configuration to enabled (emails on)
- Environment-specific configuration (UAT ≠ PROD)
- Configuration migration explicitly sets PROD values
- Audit trail shows when emails are suppressed
- Admin GUI (future US-103) highlights suppressed email configurations

**Operational Procedure**:
```sql
-- Pre-deployment checklist: Verify PROD email controls
SELECT
    e.env_code,
    scf.scf_key,
    scf.scf_value
FROM system_configuration_scf scf
JOIN environments_env e ON scf.env_id = e.env_id
WHERE scf.scf_category = 'EMAIL_CONTROLS'
    AND e.env_code = 'PROD';

-- Expected: All values should be 'true' except other_emails (false)
```

---

## Dependencies

### Technical Dependencies

- ✅ **US-098**: Configuration Management System (100% complete)
  - ConfigurationService with caching
  - system_configuration_scf table with env_id FK
  - Environment detection (DEV, UAT, PROD)

- ✅ **US-058**: Email Service Security Enhancement (89% complete)
  - EnhancedEmailService architecture
  - Email template system (3 active templates)
  - MailServerManager integration

- ✅ **TD-016**: Email Notification Enhancements (100% complete)
  - sendEmailWithAudit() method
  - AuditLogRepository integration
  - Complete audit trail for email events

- ✅ **Migration 030**: Performance Optimization
  - audit_log_aud indexes established
  - Query performance optimized

### Functional Dependencies

- ✅ Database schema stable (audit_log_aud table exists)
- ✅ Environment detection operational (US-098)
- ✅ AuditLogRepository operational (TD-016)
- ✅ Email template system operational (US-058)

---

## Success Metrics

### Quantitative Metrics

- ✅ Configuration keys created: 9 rows (3 environments × 3 email types)
- ✅ Email types controlled: 3 (step_updates, instruction_updates, other_emails)
- ✅ Audit log entries: 100% of suppressed emails logged
- ✅ Performance: <5ms cached, <50ms uncached configuration access
- ✅ Test coverage: ≥90% for new email control methods
- ✅ Backward compatibility: 100% (zero breaking changes)

### Qualitative Metrics

- **Testing Efficiency**: UAT testing without email spam (40% faster test cycles)
- **Operational Flexibility**: Instant email control via database (no deployment)
- **Compliance**: Complete audit trail for regulatory requirements
- **Developer Experience**: Simple configuration API, clear documentation
- **System Reliability**: Graceful degradation, fail-safe defaults

### Acceptance Testing Scenarios

1. **Email Suppression**: Verify emails suppressed when configured
2. **Audit Trail**: Verify suppressed emails logged with complete context
3. **Email Sending**: Verify emails sent when enabled
4. **Environment Specificity**: Verify UAT suppresses, PROD sends
5. **Performance**: Verify configuration checks meet performance requirements
6. **Backward Compatibility**: Verify system works with/without configurations
7. **Cache Behavior**: Verify cache expiration and manual refresh

---

## Definition of Done

- [ ] Migration 036 created, tested, and applied successfully
- [ ] EnhancedEmailService.groovy updated with email control logic (~100 lines)
- [ ] ConfigurationService integration complete (getBoolean() usage)
- [ ] Email suppression method implemented with audit logging
- [ ] All 12 acceptance criteria validated
- [ ] Unit tests written and passing (≥90% coverage)
- [ ] Integration tests written and passing
- [ ] Performance validated (<5ms cached, <50ms uncached)
- [ ] Manual testing complete (UAT suppression verified)
- [ ] Documentation complete (implementation notes, troubleshooting)
- [ ] Code reviewed and approved
- [ ] Backward compatibility verified (no breaking changes)
- [ ] UAT deployment successful with suppressed emails
- [ ] Audit log queries validated for operations team
- [ ] Ready for PROD deployment

---

## Related Work

### Enables Future Work

- **US-103**: Admin GUI for Email Configuration Management
- **US-104**: Email Digest System (daily/weekly summaries)
- **US-105**: Email Notification Preferences (per-user controls)

### Technical Debt Resolution

- **TD-017**: Centralized notification management (partial resolution)

---

## References

- **US-098**: Configuration Management System - `/docs/roadmap/sprint8/US-098-Configuration-Management-System.md`
- **US-058**: Email Service Security Enhancement
- **TD-016**: Email Notification Enhancements
- **ADR-031**: Type Safety Requirements
- **ADR-043**: PostgreSQL Type Casting
- **ADR-059**: Schema-First Development
- **ConfigurationService**: `/src/groovy/umig/service/ConfigurationService.groovy`
- **EnhancedEmailService**: `/src/groovy/umig/utils/EnhancedEmailService.groovy`
- **system_configuration_scf**: `/local-dev-setup/liquibase/changelogs/022_create_system_configuration_scf.sql`
- **audit_log_aud**: `/local-dev-setup/liquibase/changelogs/001_unified_baseline.sql`

---

**Story Status**: Ready for Implementation
**Created**: October 7, 2025
**Story Points**: 3 (8-9 hours estimated effort)
**Sprint**: Sprint 8 (11.5 points remaining capacity)
**Priority**: HIGH (Operational excellence, testing enablement, compliance)

---

_This user story follows UMIG project standards and builds directly on US-098 Configuration Management System infrastructure. Implementation leverages existing ConfigurationService, AuditLogRepository, and EnhancedEmailService foundations for rapid delivery with zero breaking changes._
