# TD-016 Implementation Plan: Email Notification Enhancements

**Execution Dates**: October 2-3, 2025  
**Story Points**: 4.5 (Revised from 8)  
**Duration**: 1.5 days  
**Prerequisites**: ✅ COMPLETE (All 6 tasks finished October 1, 2025)  
**Status**: 🟢 READY TO EXECUTE

---

## Executive Summary

This implementation plan provides hour-by-hour execution guidance for TD-016 (Email Notification Enhancements). Following comprehensive prerequisite analysis, the story scope was reduced 44% (8 → 4.5 points) after discovering Components 1-2 were already implemented.

**Implementation Focus**:

- **Day 1 (Oct 2)**: Components 1-2 verification + Component 3 implementation (3.5 points)
- **Day 2 (Oct 3)**: Component 4 multi-view testing + final validation (1 point)

**Critical Success Factors**:

1. All 22 unit tests passing (100% pass rate)
2. All 8 integration tests passing (100% pass rate)
3. > 80% test coverage achieved
4. 35+ manual verification checkpoints complete
5. All 36 acceptance criteria met

---

## Pre-Implementation Checklist

### Development Environment (5 minutes)

**PostgreSQL Database**:

- [ ] Database running and accessible: `npm run health:check`
- [ ] Connection verified: `psql -h localhost -p 5432 -U umig_app_user -d umig_app_db`
- [ ] Test data loaded: Check migrations, iterations, steps exist
- [ ] Backup created: `npm run backup:create` (safety measure)

**Email Testing Infrastructure**:

- [ ] MailHog running: http://localhost:8025 accessible
- [ ] SMTP connectivity verified: `npm run mailhog:test`
- [ ] Inbox cleared: `npm run mailhog:clear`
- [ ] Test email sent successfully: `npm run email:test`

**Development Stack**:

- [ ] Confluence running: http://localhost:8090 accessible
- [ ] ScriptRunner endpoints responding: Test GET /rest/scriptrunner/latest/custom/teams
- [ ] All containers healthy: `podman ps` shows all services up
- [ ] No port conflicts: Check 5432, 8090, 8025, 1025

**Testing Infrastructure**:

- [ ] Jest configured: `npm run test:js:unit -- --version` works
- [ ] Groovy test runner available: `groovy --version` shows 3.0.15
- [ ] Coverage tools ready: `npm run test:js:coverage -- --version` works
- [ ] Browser available for manual testing: Chrome/Firefox installed

**Version Control**:

- [ ] On correct branch: `git branch` shows `feature/sprint8-td-016` (or appropriate)
- [ ] Clean working directory: `git status` shows no uncommitted changes
- [ ] Latest changes pulled: `git pull origin <branch>`
- [ ] Backup branch created: `git branch backup/td-016-start-$(date +%Y%m%d)`

**Documentation Access**:

- [ ] TD-016 story document open: `docs/roadmap/sprint8/TD-016-email-notification-enhancements.md`
- [ ] Prerequisite findings available:
  - `docs/roadmap/sprint8/TD-016-MIG-PARAMETER-VERIFICATION.md`
  - `docs/roadmap/sprint8/TD-016-EMAIL-TEMPLATE-VARIABLE-MAPPING.md`
- [ ] Stakeholder communication ready: `docs/roadmap/sprint8/TD-016-STAKEHOLDER-COMMUNICATION.md`
- [ ] This implementation plan accessible: `docs/roadmap/sprint8/TD-016-IMPLEMENTATION-PLAN.md`

**Acceptance Criteria Reference**:

- [ ] All 36 acceptance criteria documented and understood
- [ ] Quality gates defined and measurable
- [ ] Test coverage targets clear (>80% for new/modified code)
- [ ] Manual testing checklist printed/accessible (35+ checkpoints)

---

## Day 1: October 2, 2025 (3.5 points)

### Morning Session: Components 1-2 Verification (8:00 AM - 12:00 PM, 2 points)

#### Block 1: Component 1 Verification (8:00 AM - 10:00 AM, 1 point)

**Objective**: Verify StepRepository.getCompleteStepForEmail() returns all 56 variables

**8:00 AM - 8:15 AM**: Setup and Code Review

- [ ] Open `src/groovy/umig/repository/StepRepository.groovy` line 4032
- [ ] Review getCompleteStepForEmail() method (lines 4032-4250)
- [ ] Open `docs/roadmap/sprint8/TD-016-EMAIL-TEMPLATE-VARIABLE-MAPPING.md`
- [ ] Review all 12 variable categories documented

**8:15 AM - 8:45 AM**: SQL Query Validation

- [ ] Execute SQL query from getCompleteStepForEmail() in psql console
- [ ] Verify 35 fields returned from database query
- [ ] Check COALESCE statements handle nulls correctly
- [ ] Validate LEFT JOINs return data for all relationships

**8:45 AM - 9:15 AM**: Email Service Variable Mapping

- [ ] Open `src/groovy/umig/utils/EnhancedEmailService.groovy` line 250
- [ ] Trace variable construction in sendStepStatusChangedNotificationWithUrl()
- [ ] Count repository variables (35) + computed variables (21)
- [ ] Verify total = 56 variables as documented

**9:15 AM - 9:45 AM**: Unit Test Execution

- [ ] Run existing instruction helper tests: `npm run test:groovy:unit -- InstructionHelperTest`
- [ ] Run existing comment helper tests: `npm run test:groovy:unit -- CommentHelperTest`
- [ ] Verify 6 tests passing (instruction formatting, comment ordering, empty states)
- [ ] Review test coverage report for helper methods

**9:45 AM - 10:00 AM**: Integration Test Execution

- [ ] Run integration test: `npm run test:groovy:integration -- StepRepositoryIntegrationTest`
- [ ] Verify getCompleteStepForEmail() with real migration data
- [ ] Test with different step statuses (Not Started, In Progress, Completed)
- [ ] Validate all 56 variables populated correctly

**Deliverable**: Component 1 verification report documenting:

- ✅ 35 repository variables confirmed
- ✅ 21 computed variables confirmed
- ✅ Total 56 variables validated
- ✅ 6 unit tests passing
- ✅ 2 integration tests passing
- ✅ Evidence: SQL query results, test output, coverage report

**Quality Gate**: All tests passing, no null pointer exceptions, all 12 categories verified

---

#### Block 2: Component 2 Verification (10:00 AM - 11:00 AM, 0.5 points)

**Objective**: Verify UrlConstructionService includes mig parameter at line 73

**10:00 AM - 10:15 AM**: Code Review

- [ ] Open `src/groovy/umig/utils/UrlConstructionService.groovy` line 73
- [ ] Verify buildStepViewUrl() method signature (line 50)
- [ ] Confirm sanitizeUrlParameters() includes `mig: migrationCode` (line 73)
- [ ] Review URL construction logic (lines 99-110)

**10:15 AM - 10:30 AM**: Email Service Integration

- [ ] Open `src/groovy/umig/api/v2/stepViewApi.groovy`
- [ ] Verify sendStepStatusChangedNotificationWithUrl() passes migrationCode (line 235)
- [ ] Verify sendStepOpenedNotificationWithUrl() passes migrationCode (line 457)
- [ ] Verify sendInstructionCompletedNotificationWithUrl() passes migrationCode (line 582)

**10:30 AM - 10:50 AM**: Unit Test Execution

- [ ] Run core URL tests: `npm run test:groovy:unit -- UrlConstructionServiceTest`
- [ ] Verify testBuildStepViewUrl_Success_WithAllParameters() passes (line 502)
- [ ] Run new edge case tests (6 tests):
  - [ ] Null/empty migrationCode handling (3 tests)
  - [ ] URL encoding special characters (3 tests)
- [ ] Total: 8 unit tests should pass (2 core + 6 edge cases)

**10:50 AM - 11:00 AM**: Integration Test

- [ ] Run end-to-end URL generation test: `npm run test:groovy:integration -- EmailUrlIntegrationTest`
- [ ] Verify URL format: `{baseURL}/pages/viewpage.action?pageId={id}&mig={code}&ite={code}&stepid={code}`
- [ ] Test URL decoding (spaces, special characters)
- [ ] Validate URL length <2083 characters (IE limit)

**Deliverable**: Component 2 verification report documenting:

- ✅ mig parameter present at line 73
- ✅ All 3 email methods pass migrationCode
- ✅ 8 unit tests passing (2 core + 6 edge cases)
- ✅ 1 integration test passing
- ✅ Evidence: Code snippets, test output, URL format validation

**Quality Gate**: URL format correct, all parameters present, edge cases handled

---

#### Block 3: Component 3 Planning (11:00 AM - 12:00 PM, 0.5 points)

**Objective**: Design audit log integration strategy for 3 notification methods

**11:00 AM - 11:20 AM**: Infrastructure Audit

- [ ] Open `src/groovy/umig/repository/AuditLogRepository.groovy`
- [ ] Review logEmailSent() method signature and parameters
- [ ] Review logEmailFailed() method signature and error handling
- [ ] Verify database schema: `\d audit_log_aud` in psql
- [ ] Confirm required fields: entity_type, entity_id, notification_type, recipients, metadata

**11:20 AM - 11:40 AM**: Integration Point Analysis

- [ ] Open `src/groovy/umig/utils/EnhancedEmailService.groovy`
- [ ] Identify audit log insertion points:
  - Line 371-387: sendStepStatusChangedNotificationWithUrl()
  - Line 514-530: sendStepOpenedNotificationWithUrl()
  - Line 634-650: sendInstructionCompletedNotificationWithUrl()
- [ ] Design metadata structure: `[migrationCode: '', iterationCode: '', stepCode: '', url: '']`
- [ ] Plan error handling for audit log failures (don't block email sending)

**11:40 AM - 12:00 PM**: Test Strategy Design

- [ ] Design 6 unit tests:
  - sendStepStatusChangedNotificationWithUrl() success logging (mock AuditLogRepository)
  - sendStepStatusChangedNotificationWithUrl() failure logging
  - sendStepOpenedNotificationWithUrl() success logging
  - sendStepOpenedNotificationWithUrl() failure logging
  - sendInstructionCompletedNotificationWithUrl() success logging
  - sendInstructionCompletedNotificationWithUrl() failure logging
- [ ] Design 3 integration tests:
  - Verify audit log database entry for status change (real database)
  - Verify audit log database entry for step opened
  - Verify audit log database entry for instruction completed
- [ ] Plan coverage measurement approach (>80% target)

**Deliverable**: Component 3 implementation plan documenting:

- ✅ 3 integration points identified with line numbers
- ✅ Metadata structure defined
- ✅ Error handling strategy documented
- ✅ 6 unit tests designed with mock strategy
- ✅ 3 integration tests designed with database verification queries
- ✅ Coverage measurement approach defined

**Quality Gate**: Clear implementation plan, all integration points identified, tests designed

---

### Lunch Break (12:00 PM - 1:00 PM)

- [ ] Save all work in progress
- [ ] Commit morning progress: `git commit -m "TD-016: Components 1-2 verified, Component 3 planned"`
- [ ] Review morning accomplishments against plan
- [ ] Prepare for afternoon implementation session

---

### Afternoon Session: Component 3 Implementation (1:00 PM - 5:00 PM, 1.5 points)

#### Block 4: Audit Log Integration (1:00 PM - 2:30 PM, 0.5 points)

**Objective**: Add audit log calls to 3 email notification methods

**1:00 PM - 1:40 PM**: sendStepStatusChangedNotificationWithUrl() Integration

- [ ] Open `src/groovy/umig/utils/EnhancedEmailService.groovy` line 371
- [ ] After successful email send (line 383), add audit log call:

```groovy
try {
    AuditLogRepository.logEmailSent(
        entityType: 'STEP',
        entityId: stepInstanceId,
        notificationType: 'STEP_STATUS_CHANGED_WITH_URL',
        recipients: [teamEmail],
        subject: subject,
        templateId: 'step_status_changed_with_url',
        metadata: [
            migrationCode: migrationCode,
            iterationCode: iterationCode,
            stepCode: stepInstance.step_code,
            url: stepViewUrl,
            oldStatus: oldStatus,
            newStatus: newStatus
        ]
    )
} catch (Exception e) {
    log.error("Failed to log email audit entry", e)
    // Don't throw - audit log failure shouldn't block email
}
```

- [ ] After email failure (catch block), add failure logging:

```groovy
AuditLogRepository.logEmailFailed(
    entityType: 'STEP',
    entityId: stepInstanceId,
    notificationType: 'STEP_STATUS_CHANGED_WITH_URL',
    recipients: [teamEmail],
    errorMessage: e.message
)
```

- [ ] Test locally: Trigger status change, check log output
- [ ] Verify no compilation errors: `groovy -c EnhancedEmailService.groovy`

**1:40 PM - 2:10 PM**: sendStepOpenedNotificationWithUrl() Integration

- [ ] Open line 514, add similar audit log call after successful send
- [ ] Metadata structure: same as above but notificationType = 'STEP_OPENED_WITH_URL'
- [ ] Add failure logging in catch block
- [ ] Test locally: Trigger step opened event

**2:10 PM - 2:30 PM**: sendInstructionCompletedNotificationWithUrl() Integration

- [ ] Open line 634, add audit log call after successful send
- [ ] Metadata structure: notificationType = 'INSTRUCTION_COMPLETED_WITH_URL'
- [ ] Add failure logging in catch block
- [ ] Test locally: Complete instruction, verify audit log

**Checkpoint**: All 3 methods integrated, code compiles, manual smoke test passes

---

#### Block 5: Unit Test Implementation (2:30 PM - 3:30 PM, 0.5 points)

**Objective**: Create 6 unit tests with mock audit log repository

**2:30 PM - 3:30 PM**: Test File Creation and Execution

- [ ] Create `local-dev-setup/__tests__/groovy/unit/EmailAuditLogTest.groovy`
- [ ] Import MockSql (TD-001 self-contained test pattern)
- [ ] Mock AuditLogRepository.logEmailSent() and logEmailFailed()
- [ ] Implement 6 tests:

**Test 1: Status Change Success Logging**

```groovy
@Test
void testStatusChangeSuccessLogging() {
    def mockAuditLog = new MockAuditLogRepository()
    // Trigger sendStepStatusChangedNotificationWithUrl()
    // Verify mockAuditLog.logEmailSent() called once
    // Verify metadata includes migrationCode, iterationCode, stepCode, url
    assert mockAuditLog.logEmailSentCalls.size() == 1
    assert mockAuditLog.logEmailSentCalls[0].notificationType == 'STEP_STATUS_CHANGED_WITH_URL'
}
```

**Test 2: Status Change Failure Logging**

```groovy
@Test
void testStatusChangeFailureLogging() {
    def mockAuditLog = new MockAuditLogRepository()
    // Force email send failure (mock SMTP exception)
    // Verify mockAuditLog.logEmailFailed() called once
    // Verify error message captured
    assert mockAuditLog.logEmailFailedCalls.size() == 1
}
```

**Tests 3-6**: Repeat for sendStepOpenedNotificationWithUrl() and sendInstructionCompletedNotificationWithUrl()

- [ ] Run all 6 tests: `npm run test:groovy:unit -- EmailAuditLogTest`
- [ ] Verify 100% pass rate
- [ ] Fix any failures immediately

**Deliverable**: 6 unit tests passing, mock audit log repository working

---

#### Block 6: Integration Test Implementation (3:30 PM - 4:30 PM, 0.5 points)

**Objective**: Create 3 integration tests with real database verification

**3:30 PM - 4:30 PM**: Test File Creation and Execution

- [ ] Create `local-dev-setup/__tests__/groovy/integration/AuditLogIntegrationTest.groovy`
- [ ] Use real database connection (DatabaseUtil.withSql)
- [ ] Implement 3 tests:

**Test 1: Status Change Database Entry**

```groovy
@Test
void testStatusChangeDatabaseEntry() {
    // Setup: Clear audit log table
    // Trigger status change email
    // Query audit log: SELECT * FROM audit_log_aud WHERE entity_id = ? ORDER BY created_at DESC LIMIT 1
    def auditEntry = sql.firstRow("SELECT * FROM audit_log_aud WHERE entity_id = ? AND notification_type = ?",
                                   [stepInstanceId, 'STEP_STATUS_CHANGED_WITH_URL'])

    // Verify entry exists
    assert auditEntry != null
    // Verify all required fields
    assert auditEntry.entity_type == 'STEP'
    assert auditEntry.metadata.migrationCode != null
    assert auditEntry.metadata.url =~ /mig=.*&ite=.*&stepid=/
}
```

**Tests 2-3**: Repeat for step opened and instruction completed

- [ ] Run all 3 integration tests: `npm run test:groovy:integration -- AuditLogIntegrationTest`
- [ ] Verify database entries created correctly
- [ ] Check metadata JSON structure
- [ ] Verify URL included in metadata

**Deliverable**: 3 integration tests passing, database entries validated

---

#### Block 7: Coverage Measurement and Validation (4:30 PM - 5:00 PM)

**Objective**: Measure test coverage and validate >80% target

**4:30 PM - 4:45 PM**: Coverage Measurement

- [ ] Run coverage tool: `npm run test:groovy:coverage -- EmailAuditLogTest AuditLogIntegrationTest`
- [ ] Generate coverage report: HTML format
- [ ] Review EnhancedEmailService.groovy coverage:
  - Lines covered for audit log calls (target >80%)
  - Branches covered for success/failure paths (target >80%)
- [ ] Review AuditLogRepository.groovy coverage (should be 100% - simple methods)

**4:45 PM - 5:00 PM**: Quality Gate Validation

- [ ] All 22 unit tests passing (16 existing + 6 new)
- [ ] All 6 integration tests passing (3 existing + 3 new)
- [ ] Test coverage >80% for new/modified code
- [ ] No compilation errors or warnings
- [ ] No database connection leaks (check connection pool)

**Deliverable**: Coverage report showing >80%, all tests passing

---

### End of Day 1 Summary (5:00 PM - 5:15 PM)

**Accomplishments Review**:

- [ ] Components 1-2 verified (1.5 points) ✅
- [ ] Component 3 implemented and tested (1.5 points) ✅
- [ ] Total: 3.5 points delivered
- [ ] 22/22 unit tests passing
- [ ] 6/8 integration tests passing (2 manual tests remaining for Day 2)
- [ ] > 80% test coverage achieved

**Git Commit**:

```bash
git add src/groovy/umig/utils/EnhancedEmailService.groovy
git add local-dev-setup/__tests__/groovy/unit/EmailAuditLogTest.groovy
git add local-dev-setup/__tests__/groovy/integration/AuditLogIntegrationTest.groovy
git commit -m "TD-016: Component 3 complete - Audit logging integrated with tests (1.5 points)

- Added audit log calls to 3 email notification methods
- Implemented 6 unit tests with mock audit log repository
- Implemented 3 integration tests with database verification
- Achieved >80% test coverage for new code
- All 22 unit tests passing, 6 integration tests passing"
```

**Preparation for Day 2**:

- [ ] Review Component 4 manual testing checklist (35+ checkpoints)
- [ ] Ensure MailHog inbox cleared
- [ ] Prepare screenshots folder for evidence capture
- [ ] Set up test migration/iteration data for manual testing
- [ ] Confirm browser and database access ready

---

## Day 2: October 3, 2025 (1 point)

### Morning Session: Component 4 Multi-View Verification (8:00 AM - 10:00 AM, 1 point)

#### Block 8: Manual Testing Execution (8:00 AM - 9:20 AM, 0.7 points)

**Objective**: Execute comprehensive 35+ checkpoint manual testing procedure

**8:00 AM - 8:02 AM**: Pre-requisites (2 minutes)

- [ ] UMIG stack running: `npm start` from local-dev-setup/
- [ ] MailHog accessible: http://localhost:8025
- [ ] Confluence accessible: http://localhost:8090
- [ ] Test migration and iteration set up with ≥3 steps
- [ ] Clear MailHog inbox: `npm run mailhog:clear`
- [ ] Browser dev tools console open (F12)
- [ ] Screenshots folder ready: `mkdir -p /tmp/td-016-screenshots/`

---

**8:02 AM - 8:07 AM**: Test 1 - StepView Email Trigger (5 minutes)

**Setup**:

- [ ] Navigate to StepView: Select migration → iteration → step
- [ ] Note current step status (e.g., "Not Started")
- [ ] Record step code, migration code, iteration code

**Trigger Email**:

- [ ] Change step status: "Not Started" → "In Progress" (use dropdown)
- [ ] Verify success message in UI
- [ ] Wait 5 seconds for email processing

**Email Verification in MailHog**:

- [ ] Open MailHog: http://localhost:8025
- [ ] **VERIFY**: New email appeared within 5 seconds
- [ ] Open email in MailHog viewer
- [ ] **VERIFY**: Subject includes step code and "In Progress" status
- [ ] **VERIFY**: Email body includes:
  - [ ] Step code and title displayed prominently
  - [ ] Status change: "Not Started" → "In Progress"
  - [ ] Instructions table (5 columns: #, Instruction, Role, Result, Status) OR "No instructions assigned" message
  - [ ] Comments section (max 3 comments) OR "No comments available" message
  - [ ] Step view link (blue button or hyperlink)
- [ ] **VERIFY**: URL format: `...?pageId={id}&mig={code}&ite={code}&stepid={code}`
- [ ] Click step view link
- [ ] **VERIFY**: Browser navigates to Confluence page
- [ ] **VERIFY**: URL parameters visible in address bar (mig=, ite=, stepid=)
- [ ] **SCREENSHOT**: Capture MailHog email view → `/tmp/td-016-screenshots/test1-stepview-email.png`
- [ ] **SCREENSHOT**: Capture Confluence page → `/tmp/td-016-screenshots/test1-confluence-page.png`

---

**8:07 AM - 8:12 AM**: Test 2 - IterationView Email Trigger (5 minutes)

**Setup**:

- [ ] Navigate to IterationView (iteration overview/grid view)
- [ ] Locate SAME step tested in Test 1
- [ ] Note current status (should be "In Progress" from Test 1)

**Trigger Email**:

- [ ] Change step status: "In Progress" → "Completed" (IterationView controls)
- [ ] Verify success message in UI
- [ ] Wait 5 seconds

**Email Verification in MailHog**:

- [ ] Open MailHog, check new email
- [ ] **VERIFY**: Email subject includes step code and "Completed" status
- [ ] **VERIFY**: Email body format identical to Test 1
- [ ] **VERIFY**: Instructions table content matches Test 1 (if not empty)
- [ ] **VERIFY**: Comments section content matches Test 1 (if not empty)
- [ ] **VERIFY**: URL format: `...?pageId={id}&mig={code}&ite={code}&stepid={code}`
- [ ] Click step view link
- [ ] **VERIFY**: Browser navigates correctly
- [ ] **VERIFY**: URL parameters present
- [ ] **SCREENSHOT**: Capture MailHog email → `/tmp/td-016-screenshots/test2-iterationview-email.png`

---

**8:12 AM - 8:16 AM**: Test 3 - Email Content Comparison (4 minutes)

**Side-by-Side Comparison in MailHog**:

- [ ] Open BOTH emails side-by-side (Test 1 and Test 2)
- [ ] **VERIFY**: Same step code displayed in both
- [ ] **VERIFY**: Same step title displayed in both
- [ ] **VERIFY**: Same instructions table content (or both have empty state)
- [ ] **VERIFY**: Same comments section content (or both have empty state)
- [ ] **VERIFY**: Same URL structure (only status parameter differs)
- [ ] **VERIFY**: Same email template layout (header, body, footer)
- [ ] **VERIFY**: Same styling (fonts, colors, spacing)
- [ ] **VERIFY**: Both emails include migration code parameter
- [ ] **VERIFY**: Both emails include iteration code parameter
- [ ] **VERIFY**: Both emails include step code parameter
- [ ] **VERIFY**: Email size <60KB for both (check MailHog size indicator)

---

**8:16 AM - 8:20 AM**: Test 4 - Audit Log Verification (4 minutes)

**Database Verification**:

- [ ] Open psql: `psql -h localhost -p 5432 -U umig_app_user -d umig_app_db`
- [ ] Query audit log:

```sql
SELECT
    aud_id,
    entity_type,
    entity_id,
    notification_type,
    metadata ->> 'migrationCode' as migration_code,
    metadata ->> 'iterationCode' as iteration_code,
    metadata ->> 'stepCode' as step_code,
    metadata ->> 'url' as url,
    created_at
FROM audit_log_aud
WHERE entity_type = 'STEP'
  AND notification_type LIKE '%_WITH_URL'
ORDER BY created_at DESC
LIMIT 5;
```

**Entry 1 Verification (StepView trigger)**:

- [ ] **VERIFY**: notification_type = 'STEP_STATUS_CHANGED_WITH_URL'
- [ ] **VERIFY**: entity_id matches step UUID
- [ ] **VERIFY**: metadata.migrationCode = expected migration code
- [ ] **VERIFY**: metadata.iterationCode = expected iteration code
- [ ] **VERIFY**: metadata.stepCode = expected step code
- [ ] **VERIFY**: metadata.url includes all 4 parameters
- [ ] **VERIFY**: metadata.oldStatus = 'Not Started'
- [ ] **VERIFY**: metadata.newStatus = 'In Progress'

**Entry 2 Verification (IterationView trigger)**:

- [ ] **VERIFY**: notification_type = 'STEP_STATUS_CHANGED_WITH_URL'
- [ ] **VERIFY**: Same entity_id as Entry 1
- [ ] **VERIFY**: metadata fields match Entry 1 (migration, iteration, step codes)
- [ ] **VERIFY**: metadata.oldStatus = 'In Progress'
- [ ] **VERIFY**: metadata.newStatus = 'Completed'

---

**Deliverable**: Manual testing complete with evidence:

- ✅ 35+ checkpoints validated
- ✅ 3 screenshots captured
- ✅ 2 audit log entries verified
- ✅ Email consistency confirmed across views
- ✅ URL format validated

**Quality Gate**: All checkpoints pass, no regressions found

---

#### Block 9: Integration Test Finalization (9:20 AM - 9:40 AM, 0.2 points)

**Objective**: Execute remaining 2 integration tests for multi-view consistency

**9:20 AM - 9:30 AM**: StepView Integration Test

- [ ] Create `local-dev-setup/__tests__/groovy/integration/StepViewEmailIntegrationTest.groovy`
- [ ] Test: Trigger status change from StepView API
- [ ] Verify: Email sent, audit log created, URL parameters correct
- [ ] Run: `npm run test:groovy:integration -- StepViewEmailIntegrationTest`

**9:30 AM - 9:40 AM**: IterationView Integration Test

- [ ] Create `local-dev-setup/__tests__/groovy/integration/IterationViewEmailIntegrationTest.groovy`
- [ ] Test: Trigger status change from IterationView API
- [ ] Verify: Email sent, audit log created, parameters match StepView
- [ ] Run: `npm run test:groovy:integration -- IterationViewEmailIntegrationTest`

**Deliverable**: 2 integration tests passing, total now 8/8 integration tests complete

---

#### Block 10: Documentation Update (9:40 AM - 10:00 AM, 0.1 points)

**Objective**: Update manual testing guide with multi-view steps

**9:40 AM - 10:00 AM**: Documentation Finalization

- [ ] Update `docs/roadmap/sprint8/TD-016-email-notification-enhancements.md`:
  - Add IterationView location details (if discovered)
  - Add multi-view consistency notes
  - Update manual testing results section
- [ ] Create evidence package:
  - Copy screenshots to `docs/roadmap/sprint8/TD-016-evidence/`
  - Export MailHog emails as .eml files
  - Export psql audit log query results
- [ ] Update TD-016 status: "In Progress" → "Testing Complete"

**Deliverable**: Documentation updated with multi-view details and evidence

---

### Mid-Morning: Final Validation (10:00 AM - 10:30 AM, Buffer Time)

#### Block 11: Complete Test Suite Execution (10:00 AM - 10:20 AM)

**Objective**: Final validation that all 36 acceptance criteria met

**10:00 AM - 10:10 AM**: Unit Test Suite

- [ ] Run all unit tests: `npm run test:groovy:unit`
- [ ] **VERIFY**: 22/22 tests passing
- [ ] **VERIFY**: No flaky tests (run twice if needed)
- [ ] **VERIFY**: Test execution time <2 minutes

**10:10 AM - 10:20 AM**: Integration Test Suite

- [ ] Run all integration tests: `npm run test:groovy:integration`
- [ ] **VERIFY**: 8/8 tests passing
- [ ] **VERIFY**: Database cleanup executed correctly
- [ ] **VERIFY**: No connection pool exhaustion

**Deliverable**: All 30 automated tests passing (22 unit + 8 integration)

---

#### Block 12: Acceptance Criteria Verification (10:20 AM - 10:30 AM)

**Objective**: Systematically verify all 36 acceptance criteria

**10:20 AM - 10:30 AM**: Criteria Checklist

- [ ] **Requirements 1-7**: Email template accuracy (7 criteria) → Verified in Component 1
- [ ] **Requirements 8-14**: URL generation standards (7 criteria) → Verified in Component 2
- [ ] **Requirements 15-23**: Audit log standards (9 criteria) → Verified in Component 3
- [ ] **Requirements 24-29**: Multi-view standards (6 criteria) → Verified in Component 4
- [ ] **Requirements 30-36**: Code quality (7 criteria) → Verified across all components
- [ ] **Total**: 36/36 acceptance criteria met ✅

**Deliverable**: Acceptance criteria validation checklist complete

---

### Late Morning: Documentation Finalization (10:30 AM - 11:00 AM, Buffer Time)

#### Block 13: Implementation Notes and Completion Report (10:30 AM - 11:00 AM)

**Objective**: Generate comprehensive TD-016 completion report

**10:30 AM - 10:45 AM**: Implementation Summary

- [ ] Create `docs/roadmap/sprint8/TD-016-COMPLETION-REPORT.md`:
  - Executive summary (scope reduction, actual vs estimated effort)
  - Component-by-component delivery summary
  - Test results (30 automated tests, 35+ manual checkpoints)
  - Coverage metrics (>80% achieved)
  - Lessons learned (prerequisite analysis saved 44% effort)
  - Recommendations for future stories

**10:45 AM - 11:00 AM**: Memory Bank Update

- [ ] Update `docs/memory-bank/progress.md`:
  - Mark TD-016 COMPLETE
  - Add delivery metrics (4.5 points, 1.5 days actual)
  - Document test coverage achievements
  - Update Sprint 8 progress (32.25 points / 51.5 committed)
- [ ] Update `docs/memory-bank/activeContext.md`:
  - Remove TD-016 from active work
  - Add TD-016 completion date
  - Update capacity for remaining sprint days

**Deliverable**: Complete documentation package ready for review

---

### Final Checkpoint: Story DONE (11:00 AM)

**Completion Verification**:

- ✅ All 4 components complete (4.5 points delivered)
- ✅ 22 unit tests passing (100% pass rate)
- ✅ 8 integration tests passing (100% pass rate)
- ✅ >80% test coverage achieved
- ✅ 35+ manual checkpoints validated
- ✅ All 36 acceptance criteria met
- ✅ Documentation complete with evidence
- ✅ No regressions in existing functionality
- ✅ **Story ready for DONE**

**Git Commit**:

```bash
git add src/groovy/umig/utils/EnhancedEmailService.groovy
git add local-dev-setup/__tests__/groovy/unit/EmailAuditLogTest.groovy
git add local-dev-setup/__tests__/groovy/integration/*.groovy
git add docs/roadmap/sprint8/TD-016-*.md
git add docs/roadmap/sprint8/TD-016-evidence/
git commit -m "TD-016 COMPLETE: Email Notification Enhancements (4.5 points)

Components Delivered:
- Component 1: Variable mapping verified (56 variables) - 1 point
- Component 2: URL construction verified (mig parameter present) - 0.5 points
- Component 3: Audit logging implemented and tested - 2 points
- Component 4: Multi-view consistency validated - 1 point

Test Results:
- Unit tests: 22/22 passing (100%)
- Integration tests: 8/8 passing (100%)
- Manual checkpoints: 35+ validated
- Test coverage: >80% achieved

Acceptance Criteria: 36/36 met ✅

Scope Reduction: 8 → 4.5 points (44%) after prerequisite discovery
Actual Effort: 1.5 days (as estimated after prerequisites)
Quality Rating: 9.5/10 (comprehensive testing, zero regressions)"
```

**Branch Strategy**:

- [ ] Push to feature branch: `git push origin feature/sprint8-td-016`
- [ ] Create pull request: Target `main` branch
- [ ] Add reviewers: Request code review
- [ ] Link PR to TD-016 story in tracking system

---

## Risk Mitigation and Rollback Procedures

### Risk 1: IterationView Location Unknown (MEDIUM)

**Symptoms**:

- Cannot find IterationView email trigger code
- Different API endpoint than expected
- Test 2 cannot be executed

**Mitigation Strategy**:

1. **Phase 1 - Codebase Search** (15 minutes):
   - Search for "iteration" in JavaScript files: `grep -r "iteration" src/groovy/umig/web/js/`
   - Search for email trigger keywords: `grep -r "sendEmail\|sendNotification" src/`
   - Check API endpoints: `grep -r "status.*change" src/groovy/umig/api/v2/`
2. **Phase 2 - UI Investigation** (15 minutes):
   - Open Confluence in browser dev tools
   - Navigate to IterationView (grid/overview page)
   - Change step status and capture network requests
   - Identify API endpoint called on status change
3. **Phase 3 - Code Tracing** (15 minutes):
   - Once API endpoint identified, open corresponding groovy file
   - Trace email notification call chain
   - Verify parameters passed match StepView

**Fallback**:

- If IterationView cannot be located within 45 minutes, escalate to user
- Request assistance from team member familiar with IterationView code
- Document limitation in completion report
- Reduce Component 4 scope to StepView-only verification (0.5 points instead of 1 point)

**Rollback Not Required**: This is verification-only, no code changes

---

### Risk 2: Integration Tests Fail in Real Database (HIGH)

**Symptoms**:

- Unit tests pass but integration tests fail
- Audit log entries not appearing in database
- Foreign key constraint violations
- Null pointer exceptions in SQL queries

**Mitigation Strategy**:

1. **Immediate Debugging** (10 minutes):
   - Check PostgreSQL logs: `npm run logs:postgres`
   - Verify database connection: `psql -h localhost -p 5432 -U umig_app_user -d umig_app_db`
   - Test audit log table exists: `\d audit_log_aud`
   - Check for schema mismatches
2. **Isolation Testing** (15 minutes):
   - Test AuditLogRepository.logEmailSent() in isolation
   - Insert test record manually in psql
   - Verify SQL query returns expected results
   - Check metadata JSON structure
3. **Fix Implementation** (30 minutes):
   - Review audit log integration code
   - Fix SQL syntax errors or schema mismatches
   - Add defensive null checks
   - Re-run integration tests

**Rollback Procedure** (if cannot fix within 1 hour):

```bash
# Step 1: Revert audit log changes
git checkout src/groovy/umig/utils/EnhancedEmailService.groovy

# Step 2: Keep unit tests (they use mocks, no database issues)
# Step 3: Document partial completion
echo "Component 3: Unit tests complete, integration tests pending" >> TD-016-COMPLETION-REPORT.md

# Step 4: Reduce delivered points
# 4.5 points → 3.5 points (Component 3 reduced from 2 to 1 point)

# Step 5: Create follow-up task
echo "TD-016-B: Fix audit log integration tests (1 point)" >> sprint8-breakdown.md
```

**Escalation**: If rollback required, inform user immediately, explain database issues, request debugging assistance

---

### Risk 3: Email Sending Fails in Development Environment (HIGH)

**Symptoms**:

- MailHog not accessible
- SMTP connection refused
- Emails not appearing in MailHog inbox
- Timeout errors in EnhancedEmailService

**Mitigation Strategy**:

1. **Service Health Check** (5 minutes):
   - Check MailHog status: `podman ps | grep mailhog`
   - Verify MailHog accessible: `curl http://localhost:8025`
   - Test SMTP connectivity: `npm run mailhog:test`
   - Check port conflicts: `lsof -i :1025 -i :8025`
2. **Service Restart** (5 minutes):
   - Restart MailHog: `npm run restart:mailhog`
   - Clear inbox: `npm run mailhog:clear`
   - Test email: `npm run email:test`
   - Verify test email received
3. **Configuration Validation** (10 minutes):
   - Check .env file: SMTP_HOST=localhost, SMTP_PORT=1025
   - Verify EnhancedEmailService configuration
   - Test with simple email (no templates)

**Rollback Not Required**: Email infrastructure issues don't require code rollback

**Escalation**: If MailHog cannot be restored within 20 minutes:

- Inform user of infrastructure issue
- Request environment support
- Consider postponing manual testing to Day 3 morning (1 hour delay)

---

### Risk 4: Test Coverage Below 80% Threshold (MEDIUM)

**Symptoms**:

- Coverage report shows 70-79% coverage
- Critical paths not covered by tests
- Edge cases missing test coverage

**Mitigation Strategy**:

1. **Gap Analysis** (15 minutes):
   - Review coverage report HTML
   - Identify uncovered lines in EnhancedEmailService
   - Check for uncovered branches (if/else not tested)
   - List missing test scenarios
2. **Quick Test Addition** (30 minutes):
   - Add targeted unit tests for uncovered lines
   - Test error handling paths
   - Test edge cases (null parameters, empty strings)
   - Re-run coverage: `npm run test:groovy:coverage`
3. **Acceptance Decision** (if still below 80%):
   - If coverage reaches 75-79%, document gap
   - Explain why remaining 1-5% uncovered (e.g., defensive logging)
   - Request user approval to proceed with 75%+ coverage
   - Create follow-up task for additional tests if needed

**Rollback Not Required**: Coverage is a quality metric, not a blocker

**Escalation**: If coverage significantly below 80% (e.g., <70%), this indicates inadequate testing:

- Inform user of coverage shortfall
- Request time extension (add 0.5 days for additional testing)
- Downgrade story from "Done" to "Testing In Progress"

---

### Risk 5: Performance Degradation from Audit Logging (LOW)

**Symptoms**:

- Email sending takes >5 seconds (normally <1 second)
- Database connection pool exhaustion
- User complaints about slow status changes

**Mitigation Strategy**:

1. **Performance Measurement** (10 minutes):
   - Measure email send time: Add timing logs
   - Check database connection pool: `SELECT count(*) FROM pg_stat_activity`
   - Test with 10 concurrent status changes
   - Verify <2 second response time maintained
2. **Optimization** (if needed, 30 minutes):
   - Make audit log call asynchronous (background thread)
   - Add connection pooling configuration
   - Implement audit log batching (buffer 5 entries, flush every 30 seconds)
   - Re-test performance
3. **Acceptance Decision**:
   - If email send time <3 seconds, acceptable (no action)
   - If 3-5 seconds, document performance note
   - If >5 seconds, implement optimization

**Rollback Procedure** (if performance unacceptable and optimization fails):

```groovy
// Wrap audit log call in background thread
new Thread({
    try {
        AuditLogRepository.logEmailSent(...)
    } catch (Exception e) {
        log.error("Background audit logging failed", e)
    }
}).start()
```

**Escalation**: If performance cannot be optimized within 1 hour, inform user, request acceptance of asynchronous logging approach

---

### Risk 6: Git Merge Conflicts with TD-014-B (LOW)

**Symptoms**:

- Cannot merge feature branch to main
- Conflict in EnhancedEmailService.groovy
- Conflict in test files

**Mitigation Strategy**:

1. **Pre-Merge Check** (5 minutes):
   - Pull latest main: `git checkout main && git pull origin main`
   - Check for conflicts: `git merge --no-commit --no-ff feature/sprint8-td-016`
   - If conflicts exist, identify files
2. **Conflict Resolution** (15 minutes per file):
   - Open conflicted file in IDE
   - Review both changes (TD-016 vs TD-014-B)
   - Merge manually, preserving both sets of changes
   - Test after merge: Run all tests again
3. **Coordination with TD-014-B** (if major conflicts):
   - Contact TD-014-B implementer
   - Coordinate merge strategy
   - Consider feature flags to isolate changes

**Rollback Not Required**: Merge conflicts are resolved, not rolled back

**Escalation**: If complex conflicts require architectural decision:

- Inform user of merge complexity
- Request technical leadership input
- Consider sequential merges instead of parallel

---

## Success Criteria and Definition of Done

### Functional Criteria (36 total)

**Component 1: Variable Mapping (7 criteria)**

1. ✅ All 56 variables (35 repository + 21 computed) documented
2. ✅ All 12 variable categories mapped to data sources
3. ✅ Null handling tested for all computed variables
4. ✅ Instructions table displays correctly (5 columns OR empty state)
5. ✅ Comments section displays correctly (max 3 OR empty state)
6. ✅ 6 unit tests passing for helper methods
7. ✅ 2 integration tests passing with real migration data

**Component 2: URL Construction (7 criteria)** 8. ✅ mig parameter present at UrlConstructionService line 73 9. ✅ All 3 email methods pass migrationCode correctly 10. ✅ URL format includes all 4 parameters: pageId, mig, ite, stepid 11. ✅ URL properly encoded (spaces, special characters, international chars) 12. ✅ 8 unit tests passing (2 core + 6 edge cases) 13. ✅ 1 integration test passing (end-to-end URL generation) 14. ✅ URL navigation tested and working (clicks lead to correct Confluence page)

**Component 3: Audit Logging (9 criteria)** 15. ✅ sendStepStatusChangedNotificationWithUrl() logs success/failure 16. ✅ sendStepOpenedNotificationWithUrl() logs success/failure 17. ✅ sendInstructionCompletedNotificationWithUrl() logs success/failure 18. ✅ Audit log entries include all required fields (entity_type, entity_id, notification_type, recipients, metadata) 19. ✅ Metadata includes migrationCode, iterationCode, stepCode, url 20. ✅ Error handling doesn't block email sending (audit failure is logged but not thrown) 21. ✅ 6 unit tests passing (success/failure logging for each method) 22. ✅ 3 integration tests passing (database entry verification) 23. ✅ >80% test coverage for audit logging code paths

**Component 4: Multi-View Consistency (6 criteria)** 24. ✅ StepView email trigger tested and working 25. ✅ IterationView email trigger tested and working 26. ✅ Email content identical from both views (same template, same variables) 27. ✅ URL parameters consistent across views (same format, same encoding) 28. ✅ Manual testing checklist complete (35+ checkpoints validated) 29. ✅ 2 integration tests passing (StepView + IterationView)

**Code Quality (7 criteria)** 30. ✅ Code reviewed and approved (peer review or self-review documented) 31. ✅ No regressions in existing email functionality (all existing tests still pass) 32. ✅ Defensive null checks added (all parameters validated before use) 33. ✅ Logging added for debugging (audit log integration, email send success/failure) 34. ✅ No compilation errors or warnings 35. ✅ Code follows project conventions (DatabaseUtil.withSql, explicit type casting) 36. ✅ Documentation updated (implementation notes, manual testing guide)

### Technical Criteria

**Test Coverage**:

- ✅ 22/22 unit tests passing (100% pass rate)
- ✅ 8/8 integration tests passing (100% pass rate)
- ✅ >80% code coverage for new/modified code
- ✅ 35+ manual test checkpoints validated
- ✅ Zero flaky tests (consistent pass rate across multiple runs)

**Performance**:

- ✅ Email send time <3 seconds (including audit log)
- ✅ Database queries <200ms (audit log insertion)
- ✅ No connection pool exhaustion (10 concurrent status changes tested)
- ✅ Email size <60KB (templates render efficiently)

**Quality Metrics**:

- ✅ Zero critical bugs introduced
- ✅ Zero regressions in existing functionality
- ✅ Zero security vulnerabilities (XSS, SQL injection, CSRF)
- ✅ Zero data loss scenarios (audit log failures don't block emails)

### Documentation Criteria

**Implementation Documentation**:

- ✅ Component 1 verification report with evidence
- ✅ Component 2 verification report with evidence
- ✅ Component 3 implementation notes with code snippets
- ✅ Component 4 manual testing evidence (screenshots, psql queries)
- ✅ TD-016 completion report with lessons learned

**Test Documentation**:

- ✅ Unit test descriptions and assertions documented
- ✅ Integration test database setup/teardown documented
- ✅ Manual testing checklist with results
- ✅ Coverage report archived (HTML format)
- ✅ Test evidence package created (screenshots, emails, logs)

**Architecture Documentation**:

- ✅ Audit log integration pattern documented
- ✅ Multi-view email consistency pattern documented
- ✅ URL construction flow diagram (optional but recommended)
- ✅ Variable mapping reference updated

### Deliverables Checklist

**Code Deliverables**:

- [x] `src/groovy/umig/utils/EnhancedEmailService.groovy` (audit log integration)
- [x] `local-dev-setup/__tests__/groovy/unit/EmailAuditLogTest.groovy` (6 unit tests)
- [x] `local-dev-setup/__tests__/groovy/integration/AuditLogIntegrationTest.groovy` (3 integration tests)
- [x] `local-dev-setup/__tests__/groovy/integration/StepViewEmailIntegrationTest.groovy` (1 integration test)
- [x] `local-dev-setup/__tests__/groovy/integration/IterationViewEmailIntegrationTest.groovy` (1 integration test)

**Documentation Deliverables**:

- [x] `docs/roadmap/sprint8/TD-016-COMPLETION-REPORT.md` (comprehensive summary)
- [x] `docs/roadmap/sprint8/TD-016-evidence/` (screenshots, emails, logs)
- [x] `docs/memory-bank/progress.md` (updated with TD-016 completion)
- [x] `docs/memory-bank/activeContext.md` (TD-016 removed from active work)

**Evidence Deliverables**:

- [x] Test coverage report (HTML, archived)
- [x] Manual testing screenshots (3 minimum)
- [x] MailHog email exports (.eml files)
- [x] PostgreSQL audit log query results (CSV export)
- [x] Git commit history (component-by-component progress)

### Definition of DONE

**TD-016 is considered DONE when**:

1. ✅ All 36 acceptance criteria verified (checklist complete)
2. ✅ All 30 automated tests passing (22 unit + 8 integration)
3. ✅ >80% test coverage achieved and documented
4. ✅ 35+ manual checkpoints validated with evidence
5. ✅ All 4 components delivered (4.5 points total)
6. ✅ No regressions introduced (existing tests still pass)
7. ✅ Documentation complete (implementation notes, test evidence, completion report)
8. ✅ Code reviewed and approved (peer review or documented self-review)
9. ✅ Git commits pushed to feature branch
10. ✅ Pull request created and linked to TD-016 story
11. ✅ Memory bank updated (progress.md, activeContext.md)
12. ✅ User notified of completion with summary report

---

## Post-Implementation Activities

### Immediate (October 3, 11:00 AM - 12:00 PM)

1. **User Notification**:
   - Send completion summary email with key metrics
   - Attach TD-016-COMPLETION-REPORT.md
   - Provide pull request link for review
   - Request acceptance and sign-off

2. **Team Handoff**:
   - Brief team on changes made (audit log integration)
   - Share manual testing procedure for future use
   - Document lessons learned (prerequisite analysis value)
   - Update team knowledge base with variable mapping reference

3. **Sprint 8 Update**:
   - Update sprint tracking: 32.25 points delivered (TD-016 = 4.5)
   - Remaining capacity: 19.25 points / 12 days
   - Next story: US-098 or Phase 2 work (user priority decision)

### Short-Term (October 4-5)

1. **Code Review Response**:
   - Address review comments within 24 hours
   - Make requested changes
   - Re-run tests after changes
   - Update pull request

2. **Production Readiness**:
   - Verify merge to main branch successful
   - Tag release: `git tag v1.x.x-sprint8-td-016`
   - Prepare deployment notes (if applicable)
   - Schedule UAT with stakeholders (if required)

3. **Continuous Improvement**:
   - Archive test evidence for compliance
   - Update test automation framework (if patterns identified)
   - Refine manual testing checklist based on execution experience
   - Document reusable patterns for future email enhancements

---

## Appendix A: Command Reference

### Environment Management

```bash
# Start/stop services
npm start                    # Start complete UMIG stack
npm stop                     # Stop all services
npm run restart:erase        # Reset everything (WARNING: erases data)

# Health checks
npm run health:check         # Verify system health
npm run logs:postgres        # View PostgreSQL logs
npm run logs:confluence      # View Confluence logs
```

### Email Testing

```bash
# MailHog operations
npm run mailhog:test         # Test SMTP connectivity
npm run mailhog:check        # Check message count
npm run mailhog:clear        # Clear inbox
npm run email:test           # Comprehensive email test
```

### Test Execution

```bash
# Groovy tests
npm run test:groovy:unit                           # All unit tests
npm run test:groovy:unit -- EmailAuditLogTest      # Specific test
npm run test:groovy:integration                    # All integration tests
npm run test:groovy:coverage                       # With coverage report

# JavaScript tests (if applicable)
npm run test:js:unit         # JavaScript unit tests
npm run test:js:integration  # JavaScript integration tests
```

### Database Operations

```bash
# Connect to PostgreSQL
psql -h localhost -p 5432 -U umig_app_user -d umig_app_db

# Common queries
SELECT * FROM audit_log_aud WHERE entity_type = 'STEP' ORDER BY created_at DESC LIMIT 5;
SELECT count(*) FROM pg_stat_activity;  # Check connection pool
\d audit_log_aud  # Describe table schema
```

### Git Operations

```bash
# Branch management
git checkout -b feature/sprint8-td-016    # Create feature branch
git branch backup/td-016-start-$(date +%Y%m%d)  # Backup branch

# Commit pattern
git add <files>
git commit -m "TD-016: Component N - Description (X points)"

# Push and PR
git push origin feature/sprint8-td-016
# Create PR via GitHub UI or gh CLI
```

---

## Appendix B: Troubleshooting Quick Reference

### Issue: "Cannot connect to database"

**Solution**:

1. Check PostgreSQL running: `podman ps | grep postgres`
2. Verify port: `lsof -i :5432`
3. Test connection: `psql -h localhost -p 5432 -U umig_app_user -d umig_app_db`
4. Check credentials in .env file
5. Restart if needed: `npm run restart:erase`

### Issue: "MailHog not accessible"

**Solution**:

1. Check MailHog running: `podman ps | grep mailhog`
2. Verify ports: `lsof -i :1025 -i :8025`
3. Test SMTP: `npm run mailhog:test`
4. Restart: `npm run restart:mailhog`
5. Clear inbox: `npm run mailhog:clear`

### Issue: "Tests fail with MockSql error"

**Solution**:

1. Verify TD-001 self-contained test pattern used
2. Check MockSql setup in test file
3. Ensure no real database connection in unit tests
4. Review test isolation (each test cleans up)

### Issue: "Coverage below 80%"

**Solution**:

1. Run coverage with verbose: `npm run test:groovy:coverage -- --verbose`
2. Open HTML report: `open coverage/index.html`
3. Identify uncovered lines (red highlighting)
4. Add targeted tests for uncovered code
5. Re-run coverage to verify improvement

### Issue: "Email not appearing in MailHog"

**Solution**:

1. Check EnhancedEmailService logs for errors
2. Verify SMTP configuration (localhost:1025)
3. Test simple email: `npm run email:test`
4. Check MailHog inbox: http://localhost:8025
5. Verify email method called (add debug logging)

### Issue: "Audit log entry not in database"

**Solution**:

1. Check audit_log_aud table exists: `\d audit_log_aud`
2. Verify AuditLogRepository.logEmailSent() called (add debug logging)
3. Check for SQL exceptions in logs
4. Test manual insert in psql
5. Verify metadata JSON structure valid

---

## Appendix C: Contact and Escalation

### Technical Issues

**Primary Contact**: Development Team Lead  
**Escalation Path**: Technical Architect → Engineering Manager  
**Response Time**: <2 hours during business hours

### Environment Issues

**Primary Contact**: DevOps Engineer  
**Escalation Path**: Infrastructure Team  
**Response Time**: <1 hour for critical services (PostgreSQL, Confluence)

### Scope/Requirements Changes

**Primary Contact**: Product Owner  
**Escalation Path**: Sprint Planning Team  
**Response Time**: Same-day for blocking issues

### Quality/Testing Issues

**Primary Contact**: QA Lead  
**Escalation Path**: QA Manager → Development Manager  
**Response Time**: <4 hours for test infrastructure issues

---

**End of Implementation Plan**

**Plan Status**: 🟢 READY FOR EXECUTION  
**Next Action**: Begin Day 1, Block 1 (Component 1 Verification) on October 2, 2025 at 8:00 AM  
**Prerequisites**: ✅ ALL COMPLETE  
**Approval**: ✅ USER APPROVED (October 1, 2025)
