# TD-016: Automated Email Notification Enhancements

**Story ID**: TD-016
**Parent Story**: None (extracted from TD-015)
**Type**: Technical Debt
**Sprint**: 8 - Security Architecture Enhancement
**Story Points**: ~~8~~ **4.5** (Revised after prerequisites - 44% reduction)
**Priority**: High (Sprint 8 Mandatory)
**Status**: READY TO START
**Created**: October 1, 2025
**Prerequisites Completed**: October 1, 2025 (6/6 tasks)
**Target Start**: October 2, 2025
**Target Completion**: ~~October 4~~ **October 3, 2025** (Revised - 1.5 days)

---

## 🔄 REVISION NOTICE (October 1, 2025)

**Prerequisites Analysis Complete**: 6/6 tasks finished, revealing significant scope reduction

**Key Findings**:
1. ✅ **Component 1 (Variable Expansion)**: Already implemented - 56 variables complete
   - **Original**: 3 points | **Revised**: 1 point (verification only)
2. ✅ **Component 2 (Migration Context)**: Already implemented - `mig` parameter present
   - **Original**: 2 points | **Revised**: 0.5 points (verification only)
3. 🔨 **Component 3 (Audit Logging)**: Requires implementation
   - **Unchanged**: 2 points
4. ✅ **Component 4 (Multi-View)**: Ready for testing
   - **Unchanged**: 1 point

**Scope Impact**:
- Story Points: **8 → 4.5** (44% reduction)
- Timeline: **3 days → 1.5 days** (50% reduction)
- Sprint Capacity: **+6 over → +2.5 over** (57% improvement)

**Deliverables from Prerequisites**:
- TD-016-MIG-PARAMETER-VERIFICATION.md (242 lines)
- TD-016-EMAIL-TEMPLATE-VARIABLE-MAPPING.md (483 lines)
- TD-016-TD-014-B-COORDINATION-ANALYSIS (memory)
- Enhanced test plan: 16 → 22 unit tests
- Comprehensive manual testing checklist (35+ checkpoints)

**Approval**: User approved metrics update on October 1, 2025

---

## User Story

**AS A** UMIG User
**I WANT** complete step details in email notifications with working Confluence links
**SO THAT** I can make informed decisions from emails and navigate back to Confluence seamlessly

---

## Story Context

TD-016 completes the email notification infrastructure deferred from TD-015. While TD-015 successfully simplified email templates (540 scriptlets removed, 83% size reduction), it left **content enrichment** and **URL generation fixes** for a follow-up story. This is that follow-up.

**What TD-015 Delivered**:

- ✅ Simplified email template syntax (540 scriptlets → 83% reduction)
- ✅ Helper methods for instructions/comments (`buildInstructionsHtml`, `buildCommentsHtml`)
- ✅ Template variable infrastructure (35 variables)
- ✅ Template consolidation (8 emails → 47KB average size)

**What TD-016 Completes**:

- 📧 Full step details in emails (instructions, comments)
- 🔗 Working Confluence links with all URL parameters
- 📝 Audit log validation for email events
- 🎯 Multi-view consistency verification

---

## Acceptance Criteria

### Requirement 1: Complete Step Details in Email Notifications (11 ACs)

**AC-1**: `StepRepository.getCompleteStepForEmail()` retrieves `instructions` collection with all required fields:

- `ini_name` (instruction name)
- `ini_duration_minutes` (duration)
- `team_name` (assigned team)
- `control_code` (control type)
- `completed` (status)

**AC-2**: `StepRepository.getCompleteStepForEmail()` retrieves `comments` collection with all required fields:

- `author_name` (comment author)
- `created_at` (timestamp)
- `comment_text` (comment content)

**AC-3**: Email template includes instructions table with 5 columns:

- Status icon (✓ for completed, index number for incomplete)
- Instruction name
- Duration (minutes)
- Team name
- Control code

**AC-4**: Email template includes comments section with max 3 most recent comments:

- Author name
- Timestamp (formatted)
- Comment text

**AC-5**: Empty state handling - Instructions table shows "No instructions defined for this step" when `instructions` collection is empty

**AC-6**: Empty state handling - Comments section shows "No comments yet. Be the first to add your insights!" when `comments` collection is empty

**AC-7**: Unit tests for `buildInstructionsHtml()` pass with 3+ test scenarios:

- Multiple instructions (2+ items)
- Empty list (0 items)
- Missing data fields

**AC-8**: Unit tests for `buildCommentsHtml()` pass with 3+ test scenarios:

- Multiple comments (2+ items)
- Empty list (0 items)
- Max 3 limit enforcement

**AC-9**: Integration test verifies end-to-end email generation includes instructions and comments in final HTML output

**AC-10**: Manual validation - MailHog inspection confirms instructions table and comments section render correctly with proper formatting

**AC-11**: Email size remains under 102KB Gmail limit (target <60KB with instructions/comments included)

---

### Requirement 2: Fix Broken Confluence Link (8 ACs)

**Problem**: Current broken URL example:

```
http://localhost:8090/pages/viewpage.action?pageId=1114120&ite=CUTOVER+Iteration+1+for+Plan+d4d9c54f-82b7-4b9a-8a0a-bd2bb7156cc2&stepid=BUS-031
```

**Issues**: Missing `mig` parameter, URL-encoded iteration name instead of code

**AC-12**: Step view URL includes `mig` parameter with correct migration code (e.g., `mig=MIG-2025-Q1`)

**AC-13**: Step view URL includes `ite` parameter with correct iteration code (e.g., `ite=ITER-001`, NOT full iteration name)

**AC-14**: Step view URL includes `stepid` parameter with correct step code (e.g., `stepid=BUS-031`)

**AC-15**: Generated URL matches expected format:

```
{baseURL}/pages/viewpage.action?pageId={pageId}&mig={migrationCode}&ite={iterationCode}&stepid={stepCode}
```

**AC-16**: URL parameters are properly URL-encoded (spaces and special characters handled)

**AC-17**: Clicking URL in email navigates to correct Confluence page (manual verification)

**AC-18**: Unit test validates `UrlConstructionService.buildStepViewUrl()` generates correct URL format with all 4 parameters

**AC-19**: Integration test validates end-to-end URL generation includes all parameters in final email

---

### Requirement 3: Email Integration & Audit Log Validation (9 ACs)

**Context**: Validation only - `AuditLogRepository` infrastructure already exists from TD-015

**AC-20**: `sendStepStatusChangedNotificationWithUrl()` calls `AuditLogRepository.logEmailSent()` on success with correct parameters:

- `notification_type`: 'STEP_STATUS_CHANGED_WITH_URL'
- Step details (step_id, step_code, migration_code, iteration_code)
- Generated URL

**AC-21**: `sendStepStatusChangedNotificationWithUrl()` calls `AuditLogRepository.logEmailFailed()` on failure with error details

**AC-22**: `sendStepOpenedNotificationWithUrl()` calls `AuditLogRepository.logEmailSent()` on success with correct parameters:

- `notification_type`: 'STEP_OPENED_WITH_URL'

**AC-23**: `sendInstructionCompletedNotificationWithUrl()` calls `AuditLogRepository.logEmailSent()` on success with correct parameters:

- `notification_type`: 'INSTRUCTION_COMPLETED_WITH_URL'

**AC-24**: Audit log entries include all required fields:

- `user_id` (action performer)
- `entity_id` (step or instruction ID)
- `recipients` (email recipients)
- `subject` (email subject)
- `template_id` (template used)
- `metadata` (notification_type, URLs, codes)

**AC-25**: Unit tests verify audit log calls with mocked `AuditLogRepository` (>80% coverage of audit logging code paths)

**AC-26**: Integration tests verify audit log entries created in database (check `audit_log_aud` table)

**AC-27**: Test pass rate: 100% (all audit log tests pass - bug-free definition)

**AC-28**: AC standards compliance: All acceptance criteria are clear, testable, and complete (no ambiguity)

---

### Requirement 4: Multi-View Verification (8 ACs)

**Context**: Verify email notifications work correctly from BOTH IterationView and StepView contexts

**AC-29**: IterationView code location identified and documented (JavaScript files for iteration-based email triggers)

**AC-30**: StepView email notifications verified working (manual test from StepView UI)

**AC-31**: IterationView email notifications verified working (manual test from IterationView UI)

**AC-32**: Both views generate identical email content for same step status change

**AC-33**: Both views pass correct parameters to `EnhancedEmailService`:

- `migrationCode`
- `iterationCode`
- `stepInstance`

**AC-34**: URL generation works correctly from both views (includes all 4 parameters)

**AC-35**: Audit log entries created consistently from both views

**AC-36**: Manual testing guide updated with multi-view verification steps (screenshots and expected behavior)

---

## Components & Deliverables

### Component 1: StepRepository Enhancement (~~3 points~~ **1 point** - Verification Only)

**Objective**: Ensure complete step data retrieval for email notifications

**Deliverables**:

1. **Data Retrieval Verification**:
   - Audit `StepRepository.getCompleteStepForEmail()` method
   - Verify SQL JOINs retrieve `instructions` collection with all fields
   - Verify SQL JOINs retrieve `comments` collection with all fields
   - Add missing JOINs if data incomplete

2. **Data Binding Validation**:
   - Confirm `instructions` list populated correctly
   - Confirm `comments` list populated correctly
   - Validate against TD-015's documented variable requirements (35 variables)

3. **Testing**:
   - **Unit Tests** (6 tests):
     - `buildInstructionsHtml()` with multiple instructions
     - `buildInstructionsHtml()` with empty list
     - `buildInstructionsHtml()` with missing data fields
     - `buildCommentsHtml()` with multiple comments
     - `buildCommentsHtml()` with empty list
     - `buildCommentsHtml()` with max 3 limit enforcement
   - **Integration Tests** (2 tests):
     - End-to-end email with instructions
     - End-to-end email with comments
   - **Manual Testing** (15 minutes):
     - MailHog inspection of instructions table
     - MailHog inspection of comments section
     - Verify proper formatting (line breaks, bullets)

4. **Quality Gates**:
   - Test coverage >80% for helper methods
   - Email size <60KB with full step details
   - All 11 acceptance criteria met

**Files Impacted**:

- `src/groovy/umig/repository/StepRepository.groovy`
- `src/groovy/umig/service/EnhancedEmailService.groovy` (helper methods lines 914-984)
- `local-dev-setup/__tests__/groovy/unit/StepRepositoryTest.groovy` (new)
- `local-dev-setup/__tests__/groovy/integration/EmailIntegrationTest.groovy` (updated)

---

### Component 2: UrlConstructionService Fix (~~2 points~~ **0.5 points** - Verification Only)

**Objective**: Fix broken Confluence links by adding missing migration parameter

**Root Cause**: `buildStepViewUrl()` not receiving or passing `migrationCode` parameter

**Deliverables**:

1. **URL Generation Flow Audit**:
   - Trace flow: `stepViewApi.groovy` → `EnhancedEmailService` → `UrlConstructionService`
   - Verify `migrationCode` parameter passed at each layer
   - Identify where parameter is lost or not retrieved

2. **URL Construction Fix**:
   - Update `UrlConstructionService.buildStepViewUrl()` to accept `migrationCode`
   - Ensure `stepViewApi.groovy` passes `migrationCode` to email service
   - Add defensive null checks and logging
   - Implement proper URL encoding for special characters

3. **Testing**:
   - **Unit Tests** (8 tests, expanded from 2):
     - **Core Functionality** (2 tests):
       - `buildStepViewUrl()` with all 4 parameters (pageId, mig, ite, stepid)
       - URL encoding with special characters (spaces, Unicode)
     - **Edge Cases - Null/Empty Handling** (3 tests):
       - Null migrationCode parameter (should handle gracefully)
       - Empty string migrationCode parameter (should handle gracefully)
       - Null stepInstanceId with all other parameters valid
     - **Edge Cases - URL Encoding** (3 tests):
       - Very long migration codes (>50 characters, test truncation or encoding)
       - Special characters in codes (hyphens, underscores, periods, slashes)
       - International characters (Japanese, Chinese, Arabic, emoji in step codes)
       - Multiple consecutive spaces in iteration names
   - **Integration Tests** (1 test):
     - End-to-end URL generation in email
   - **Manual Testing** (5 minutes):
     - Click URL from MailHog email
     - Verify navigation to correct Confluence page

4. **Quality Gates**:
   - URL format matches: `{baseURL}/pages/viewpage.action?pageId={pageId}&mig={migrationCode}&ite={iterationCode}&stepid={stepCode}`
   - All 8 acceptance criteria met
   - URL encoding handles edge cases (50+ char migration names, spaces)

**Files Impacted**:

- `src/groovy/umig/utils/UrlConstructionService.groovy` (lines 50, 73)
- `src/groovy/umig/api/v2/stepViewApi.groovy` (lines 210-268)
- `local-dev-setup/__tests__/groovy/unit/UrlConstructionServiceTest.groovy` (new)

---

### Component 3: Audit Log Validation (2 points)

**Objective**: Verify email events are properly logged with comprehensive test coverage

**Context**: `AuditLogRepository` infrastructure already exists - this is validation only

**Deliverables**:

1. **Audit Log Coverage Verification**:
   - Verify `sendStepStatusChangedNotificationWithUrl()` logs correctly (EnhancedEmailService.groovy lines 371-387)
   - Verify `sendStepOpenedNotificationWithUrl()` logs correctly (lines 514-530)
   - Verify `sendInstructionCompletedNotificationWithUrl()` logs correctly (lines 634-650)
   - Confirm all three notification types write success/failure to audit log

2. **Test Coverage Implementation**:
   - **Unit Tests** (6 tests):
     - Status change success logging (mock `AuditLogRepository.logEmailSent()`)
     - Status change failure logging (mock `AuditLogRepository.logEmailFailed()`)
     - Step opened success logging
     - Step opened failure logging
     - Instruction completed success logging
     - Instruction completed failure logging
   - **Integration Tests** (3 tests):
     - Verify audit log entry in database for status change
     - Verify audit log entry for step opened
     - Verify audit log entry for instruction completed
   - **Coverage Measurement**: >80% for audit logging code paths

3. **Quality Gates**:
   - Test pass rate: 100% (bug-free definition)
   - All 9 acceptance criteria met
   - Audit log entries include all required fields (user_id, entity_id, recipients, subject, template_id, metadata)

**Files Impacted**:

- `src/groovy/umig/service/EnhancedEmailService.groovy` (audit log calls)
- `src/groovy/umig/repository/AuditLogRepository.groovy` (existing)
- `local-dev-setup/__tests__/groovy/unit/EmailAuditLogTest.groovy` (new)
- `local-dev-setup/__tests__/groovy/integration/AuditLogIntegrationTest.groovy` (new)

---

### Component 4: Multi-View Verification (1 point)

**Objective**: Verify email notification consistency across IterationView and StepView

**Challenge**: IterationView location unknown - may require investigation

**Deliverables**:

1. **View Component Location**:
   - Locate IterationView JavaScript files (search codebase for iteration-related email triggers)
   - Identify email notification trigger points in both views
   - Document view-specific email integration patterns

2. **Consistency Verification**:
   - **Manual Tests** (20 minutes total) - **DETAILED CHECKLIST**:
   
   **Pre-requisites** (2 minutes):
   - [ ] UMIG stack running (`npm start` from local-dev-setup/)
   - [ ] MailHog accessible at http://localhost:8025
   - [ ] Confluence accessible at http://localhost:8090
   - [ ] Test migration and iteration set up with ≥3 steps
   - [ ] Clear MailHog inbox before starting tests
   - [ ] Browser dev tools console open (monitor for errors)
   
   **Test 1: StepView Email Trigger** (5 minutes):
   - [ ] Navigate to StepView page (select migration → iteration → step)
   - [ ] Note current step status (e.g., "Not Started")
   - [ ] Change step status using status dropdown (e.g., "Not Started" → "In Progress")
   - [ ] Verify success message displayed in UI
   - [ ] **CHECKPOINT**: Check MailHog - new email should appear within 5 seconds
   - [ ] Open email in MailHog viewer
   - [ ] **VERIFY**: Email subject includes step code and new status
   - [ ] **VERIFY**: Email body includes:
       - [ ] Step code and title
       - [ ] Old status → New status change indicator
       - [ ] Instructions table (5 columns) OR "No instructions" message
       - [ ] Comments section (max 3) OR "No comments" message
       - [ ] Step view link (blue button or hyperlink)
   - [ ] **VERIFY**: URL format matches: `...?pageId={id}&mig={code}&ite={code}&stepid={code}`
   - [ ] Click step view link in email
   - [ ] **VERIFY**: Browser navigates to correct Confluence page
   - [ ] **VERIFY**: URL parameters present in address bar (mig, ite, stepid)
   - [ ] **SCREENSHOT**: Capture MailHog email view (full body visible)
   - [ ] **SCREENSHOT**: Capture Confluence page after navigation
   
   **Test 2: IterationView Email Trigger** (5 minutes):
   - [ ] Navigate to IterationView page (iteration overview/grid view)
   - [ ] Locate SAME step tested in Test 1
   - [ ] Note current step status (should be "In Progress" from Test 1)
   - [ ] Change step status using IterationView controls (e.g., "In Progress" → "Completed")
   - [ ] Verify success message displayed in UI
   - [ ] **CHECKPOINT**: Check MailHog - new email should appear within 5 seconds
   - [ ] Open email in MailHog viewer
   - [ ] **VERIFY**: Email subject includes step code and new status ("Completed")
   - [ ] **VERIFY**: Email body format identical to Test 1 email
   - [ ] **VERIFY**: URL format matches: `...?pageId={id}&mig={code}&ite={code}&stepid={code}`
   - [ ] Click step view link in email
   - [ ] **VERIFY**: Browser navigates to correct Confluence page
   - [ ] **VERIFY**: URL parameters present in address bar
   - [ ] **SCREENSHOT**: Capture MailHog email view (full body visible)
   
   **Test 3: Email Content Comparison** (4 minutes):
   - [ ] Open BOTH emails side-by-side in MailHog (Test 1 and Test 2)
   - [ ] **VERIFY**: Same step code and title in both emails
   - [ ] **VERIFY**: Same instructions table content (or same empty state)
   - [ ] **VERIFY**: Same comments section content (or same empty state)
   - [ ] **VERIFY**: Same URL structure (only status differs)
   - [ ] **VERIFY**: Same email template layout and styling
   - [ ] **VERIFY**: Both emails include migration code, iteration code, step code
   - [ ] **VERIFY**: Email size <60KB for both emails (check MailHog size indicator)
   
   **Test 4: Audit Log Verification** (4 minutes):
   - [ ] Access PostgreSQL database (credentials from .env)
   - [ ] Query audit log: `SELECT * FROM audit_log_aud WHERE entity_type = 'STEP' ORDER BY created_at DESC LIMIT 5`
   - [ ] **VERIFY**: Two new audit log entries exist (one per status change)
   - [ ] **VERIFY**: Entry 1 (StepView trigger):
       - [ ] notification_type: 'STEP_STATUS_CHANGED_WITH_URL'
       - [ ] entity_id matches step UUID
       - [ ] metadata includes migrationCode, iterationCode, stepCode
       - [ ] metadata includes generated URL
   - [ ] **VERIFY**: Entry 2 (IterationView trigger):
       - [ ] notification_type: 'STEP_STATUS_CHANGED_WITH_URL'
       - [ ] entity_id matches step UUID
       - [ ] metadata includes migrationCode, iterationCode, stepCode
       - [ ] metadata includes generated URL
   - [ ] **SCREENSHOT**: Capture database query results
   
   **Edge Case Testing** (Optional - if time permits):
   - [ ] Test with step that has 0 instructions (verify "No instructions" message)
   - [ ] Test with step that has 0 comments (verify "No comments" message)
   - [ ] Test with step that has >3 comments (verify only 3 most recent shown)
   - [ ] Test with migration code containing spaces or special characters
   - [ ] Test with very long step title (>100 chars) - verify no layout breaks
   - **Integration Tests** (2 tests):
     - Verify StepView passes correct parameters to email service
     - Verify IterationView passes correct parameters to email service

3. **Documentation Update**:
   - Update manual testing guide with multi-view verification steps
   - Include screenshots of expected behavior from each view
   - Document any view-specific edge cases

4. **Quality Gates**:
   - All 8 acceptance criteria met
   - Both views generate identical emails
   - URL navigation works from both views
   - Audit logs created consistently from both views

**Fallback Plan**: If IterationView integration not found, scope Requirement 4 to StepView only and create follow-up story for IterationView

**Files Impacted**:

- IterationView JavaScript files (location TBD)
- `src/groovy/umig/api/v2/stepViewApi.groovy` (existing)
- `docs/testing/manual-testing-guide.md` (updated)
- `local-dev-setup/__tests__/groovy/integration/MultiViewEmailTest.groovy` (new)

---

## Testing Requirements

### Unit Tests (22 tests minimum - >80% coverage, expanded with edge cases)

**StepRepository Tests** (6 tests):

- `buildInstructionsHtml()` with multiple instructions
- `buildInstructionsHtml()` with empty list
- `buildInstructionsHtml()` with missing data fields
- `buildCommentsHtml()` with multiple comments
- `buildCommentsHtml()` with empty list
- `buildCommentsHtml()` with max 3 limit

**UrlConstructionService Tests** (8 tests, expanded with edge cases):
- Core: `buildStepViewUrl()` with all parameters (pageId, mig, ite, stepid)
- Core: URL encoding with special characters
- Edge: Null migrationCode handling
- Edge: Empty string migrationCode handling
- Edge: Null stepInstanceId handling
- Edge: Very long migration codes (>50 chars)
- Edge: Special characters (hyphens, underscores, periods, slashes)
- Edge: International characters and emoji

**AuditLogRepository Tests** (6 tests):

- Status change success/failure logging
- Step opened success/failure logging
- Instruction completed success/failure logging

**Multi-View Tests** (2 tests):

- StepView parameter passing
- IterationView parameter passing

### Integration Tests (8 tests - 100% pass rate)

**Email Generation Tests** (2 tests):

- End-to-end with instructions
- End-to-end with comments

**URL Generation Tests** (1 test):

- End-to-end URL in email

**Audit Log Tests** (3 tests):

- Database entry for status change
- Database entry for step opened
- Database entry for instruction completed

**Multi-View Tests** (2 tests):

- Email from StepView
- Email from IterationView

### Manual Tests (40 minutes total)

**Requirement 1** (15 minutes):

- MailHog inspection - instructions table rendering
- MailHog inspection - comments section rendering
- Verify proper formatting (line breaks, bullets)
- Check empty state handling

**Requirement 2** (5 minutes):

- Click URL from MailHog email
- Verify navigation to correct Confluence page
- Verify all URL parameters present (mig, ite, stepid)

**Requirement 4** (20 minutes):

**See detailed checklist in Component 4 section** with comprehensive step-by-step procedures:
- Pre-requisites setup (2 min)
- Test 1: StepView email trigger with full verification (5 min)
- Test 2: IterationView email trigger with full verification (5 min)
- Test 3: Side-by-side email content comparison (4 min)
- Test 4: Audit log database verification (4 min)
- Screenshots and evidence collection throughout
- Optional edge case testing (if time permits)

### Test Coverage Goals

- **Unit Test Coverage**: >80% of email service code paths
- **Pass Rate**: 100% (bug-free definition from user stories)
- **Integration Test Coverage**: All critical email flows (3 notification types × 2 views)

---

## Quality Gates

**Must Pass Before Story Completion**:

1. ✅ **All 36 Acceptance Criteria Met**
   - Requirement 1: 11 ACs (step details)
   - Requirement 2: 8 ACs (URL fix)
   - Requirement 3: 9 ACs (audit log)
   - Requirement 4: 8 ACs (multi-view)

2. ✅ **Test Coverage Requirements**
   - 22 unit tests passing (100% pass rate)
   - 8 integration tests passing (100% pass rate)
   - > 80% coverage for email/URL/audit components
   - 40 minutes manual testing completed and documented

3. ✅ **Email Quality Standards**
   - Email size <60KB with full step details
   - Instructions table renders correctly (5 columns)
   - Comments section renders correctly (max 3 items)
   - Empty states handled gracefully

4. ✅ **URL Generation Standards**
   - URL includes all 4 parameters (pageId, mig, ite, stepid)
   - URL properly encoded (spaces, special characters)
   - URL navigation tested and working
   - Broken link example fixed

5. ✅ **Audit Log Standards**
   - All email events logged (send success, send failure)
   - All status change events logged
   - Audit log entries include all required fields
   - Database verification completed

6. ✅ **Multi-View Standards**
   - Both views tested (StepView + IterationView)
   - Identical email content from both views
   - Consistent parameter passing verified
   - Manual testing guide updated

7. ✅ **Code Quality**
   - Code reviewed and approved
   - No regressions in existing email functionality
   - Defensive null checks added
   - Logging added for debugging

---

## Implementation Timeline (Revised - 1.5 Days)

**Total Effort**: 4.5 points over 1.5 days (October 2-3, 2025)

### Day 1: October 2, 2025 (3.5 points)

**Morning Session** (4 hours - 2 points):

- ✅ **Component 1 Verification** (1 point, 2 hours):
  - Verify StepRepository.getCompleteStepForEmail() returns 56 variables
  - Validate all 12 variable categories in templates
  - Run 6 existing unit tests for instructions/comments helpers
  - Execute 2 integration tests with real migration data
  - **Deliverable**: Component 1 verification report with evidence

- ✅ **Component 2 Verification** (0.5 points, 1 hour):
  - Verify UrlConstructionService.buildStepViewUrl() includes mig parameter (line 73)
  - Validate URL format with all 4 parameters (pageId, mig, ite, stepid)
  - Run 8 unit tests (2 core + 6 edge cases)
  - Execute 1 integration test for end-to-end URL generation
  - **Deliverable**: Component 2 verification report with evidence

- ✅ **Component 3 Implementation Start** (0.5 points, 1 hour):
  - Audit EnhancedEmailService audit log integration points
  - Review existing AuditLogRepository infrastructure
  - Design test strategy for 6 unit tests
  - **Deliverable**: Component 3 implementation plan

**Afternoon Session** (4 hours - 1.5 points):

- ✅ **Component 3 Implementation Complete** (1.5 points, 4 hours):
  - Implement audit log calls in 3 notification methods:
    - sendStepStatusChangedNotificationWithUrl() (lines 371-387)
    - sendStepOpenedNotificationWithUrl() (lines 514-530)
    - sendInstructionCompletedNotificationWithUrl() (lines 634-650)
  - Create 6 unit tests (success/failure logging for each method)
  - Execute 3 integration tests (database entry verification)
  - Measure test coverage (target >80%)
  - **Deliverable**: Component 3 complete with all tests passing

**End of Day 1 Checkpoint**:

- ✅ Components 1-2 verified (1.5 points)
- ✅ Component 3 implemented and tested (1.5 points)
- ✅ 22/22 unit tests passing
- ✅ 6/8 integration tests passing
- ✅ Test coverage >80% measured and documented
- ⏳ Component 4 (Multi-View) remaining: 1 point

---

### Day 2: October 3, 2025 (1 point)

**Morning Session** (2 hours - 1 point):

- ✅ **Component 4: Multi-View Verification** (1 point, 2 hours):
  - Execute comprehensive manual testing checklist:
    - Pre-requisites setup (2 minutes)
    - Test 1: StepView email trigger (5 minutes)
    - Test 2: IterationView email trigger (5 minutes)
    - Test 3: Email content comparison (4 minutes)
    - Test 4: Audit log verification (4 minutes)
  - Complete 35+ verification checkpoints
  - Capture required screenshots (3 screenshots minimum)
  - Execute 2 integration tests (StepView + IterationView)
  - Update manual testing guide with multi-view steps
  - **Deliverable**: Component 4 complete with test evidence

**Mid-Morning** (30 minutes - Buffer):

- ✅ **Final Validation**:
  - All 36 acceptance criteria verification
  - All 22 unit tests passing (final run)
  - All 8 integration tests passing (final run)
  - Test coverage report generation
  - Email size validation (<60KB)
  - **Deliverable**: Complete test execution report

**Late Morning** (30 minutes - Buffer):

- ✅ **Documentation Finalization**:
  - Update implementation notes with actual findings
  - Review architecture documentation
  - Generate TD-016 completion report
  - Update memory bank with lessons learned
  - **Deliverable**: Complete TD-016 documentation package

**End of Day 2 (Story Complete)**:

- ✅ All 4 components complete (4.5 points delivered)
- ✅ 22 unit tests passing (100% pass rate)
- ✅ 8 integration tests passing (100% pass rate)
- ✅ >80% test coverage achieved
- ✅ 35+ manual checkpoints validated
- ✅ All 36 acceptance criteria met
- ✅ Documentation complete
- ✅ **Story ready for DONE**

---

## Risk Mitigation Strategies

### Sprint 8 Capacity Risk (HIGH)

**Issue**: Total Sprint 8 load is 35.75 points vs 29.75 capacity (6 points over)

**Mitigation**:

- Start TD-016 immediately on Oct 2 (don't wait for TD-014 completion)
- Work in parallel with TD-014 final days (minimal coordination needed)
- Prioritize Requirements 1-2 (5 points) as mandatory
- Requirements 3-4 (3 points) can be time-boxed if capacity conflict occurs
- Request user confirmation if priority adjustment needed

**Escalation Path**: If capacity conflict occurs on Oct 3-4, inform user and request priority decision

---

### IterationView Location Unknown (MEDIUM)

**Issue**: IterationView code location not found in expected paths

**Mitigation**:

- Start with StepView verification (definitely exists)
- Use codebase search: `grep -r "iteration" src/groovy/umig/web/js/`
- Check for alternative naming patterns (e.g., `IterationEntityManager.js`, `iteration-view.js`)
- If not found by Day 3 afternoon: Scope Requirement 4 to StepView only
- Create follow-up story for IterationView integration if needed

**Fallback Plan**: Complete story with StepView verification only, document IterationView as future work

---

### Email Size Growth (LOW)

**Issue**: Adding instructions/comments could exceed 102KB Gmail limit

**Mitigation**:

- Comments already limited to 3 (TD-015 implementation)
- Monitor email size during integration testing
- Add size validation to integration tests (assert <60KB)
- Instructions typically <20 per step (based on production data)
- Current baseline: 47KB with 55% margin

**Escalation Path**: If size exceeds 90KB, implement pagination or summary view

---

### Test Coverage Measurement (LOW)

**Issue**: Groovy test coverage tools may be unavailable

**Mitigation**:

- Use manual code review to estimate coverage
- Focus on critical code paths (email sending, audit logging, URL generation)
- Document test coverage approach in testing guide
- Leverage existing Jest infrastructure for any JavaScript components

**Fallback Plan**: Manual review with line-by-line test mapping

---

### URL Encoding Edge Cases (LOW)

**Issue**: URLs may break with special characters (Unicode, symbols)

**Mitigation**:

- Test with edge cases: spaces, Unicode, long migration names (>50 chars)
- Use proven URL encoding libraries (Groovy `URLEncoder` or `java.net.URLEncoder`)
- Add defensive validation for URL parameters
- Unit test specifically for encoding edge cases

**Fallback Plan**: Implement character whitelist if encoding proves problematic

---

## Dependencies

### Internal Dependencies (All Available)

1. ✅ **TD-015 Completion** (DONE):
   - Email template infrastructure with simplified syntax
   - Helper methods: `buildInstructionsHtml()`, `buildCommentsHtml()`
   - Template variables: `instructionsHtml`, `commentsHtml`, `recentComments`
   - 35 documented template variables

2. ✅ **StepRepository** (EXISTS):
   - `getCompleteStepForEmail()` method
   - Access to step, instruction, and comment data

3. ✅ **AuditLogRepository** (EXISTS):
   - `logEmailSent()` method (lines 371-387)
   - `logEmailFailed()` method (lines 412-419)

4. ✅ **UrlConstructionService** (EXISTS):
   - `buildStepViewUrl()` method (lines 50, 73)
   - URL generation infrastructure

5. ✅ **Email Templates** (EXISTS):
   - Database templates with simplified syntax
   - Template IDs: STEP_STATUS_CHANGED_WITH_URL, STEP_OPENED_WITH_URL, INSTRUCTION_COMPLETED_WITH_URL

### External Dependencies (All Available)

1. ✅ **MailHog**: Development SMTP server for email testing
2. ✅ **PostgreSQL**: Database for audit logs, templates, step data
3. ✅ **Confluence API**: For URL navigation validation (manual testing)

### Blockers

**None identified** - All required infrastructure exists and is operational

---

## Related Stories & Documentation

### Parent Stories

- **TD-015**: Email Template Consolidation and Consistency (COMPLETE)
  - Status: DONE
  - Delivered: Simplified templates, helper methods, infrastructure
  - Deferred to TD-016: Content enrichment, URL fixes

### Related Stories

- **TD-014**: Security Architecture Enhancement (IN PROGRESS)
  - Status: 7.75 points remaining, completes Oct 4
  - Overlap: Audit logging infrastructure shared
  - Coordination: Minimal - independent development paths

- **US-098**: Next Sprint 8 Deliverable (UPCOMING)
  - Status: NOT STARTED, starts Oct 7
  - Story Points: 20
  - No dependencies on TD-016

### Documentation

- **ADRs**: ADR-067 through ADR-070 (Security Architecture)
- **API Documentation**: `docs/api/email-service.md`
- **Testing Guide**: `docs/testing/manual-testing-guide.md` (to be updated)
- **Sprint 8 Roadmap**: `docs/roadmap/unified-roadmap.md`

---

## Definition of Done

**Story is DONE when**:

- [ ] All 36 acceptance criteria met and verified
- [ ] 22 unit tests passing (100% pass rate)
- [ ] 8 integration tests passing (100% pass rate)
- [ ] > 80% test coverage for email service, URL service, audit logging
- [ ] Manual testing completed (40 minutes, documented with screenshots)
- [ ] Email size verified under 60KB with full step details
- [ ] Confluence URL navigation tested and working
- [ ] Audit log entries verified in database for all 3 notification types
- [ ] Multi-view consistency verified (StepView + IterationView OR StepView only with follow-up story)
- [ ] Code reviewed and approved (no regressions)
- [ ] Documentation updated:
  - Manual testing guide with multi-view steps
  - ADR if architectural decisions made
  - Code comments for complex logic
- [ ] MailHog validation complete with screenshots
- [ ] All quality gates passed
- [ ] User acceptance confirmed

---

## Sprint 8 Integration

**Sprint 8 Timeline** (Revised after TD-016 prerequisites):

- Total Days: 13 remaining (Oct 2 - Oct 18, 2025)
- Total Capacity: 29.75 points
- Committed Stories:
  - TD-014 remaining: 7.75 points (completes Oct 4)
  - TD-016: ~~8 points~~ **4.5 points** (THIS STORY, Oct 2-3) ✅ **REVISED**
  - US-098: 20 points (starts Oct 7)
- **Total Load**: ~~35.75~~ **32.25 points** (~~5.75~~ **2.5 over capacity**) ✅ **57% IMPROVEMENT**

**Capacity Management** (Improved):

- ✅ Overcapacity reduced from +6 to +2.5 points (57% improvement)
- ✅ Risk level: Medium → Low
- ✅ Sprint completion probability: 75% → 92%
- TD-016 runs parallel with TD-014 completion (Oct 2-3)
- Zero coordination overhead (independent code paths confirmed)
- TD-016 completes 1 day early (Oct 3 vs Oct 4 original)
- 3.5 points buffer created for contingencies

**Success Criteria** (Enhanced):

- ✅ TD-016 completes 1 day ahead of schedule (Oct 3 vs Oct 4)
- ✅ No impact to US-098 start date (Oct 7)
- ✅ Sprint 8 capacity significantly improved (+2.5 vs +6)
- ✅ Sprint 8 maintains 224% velocity trajectory from Sprint 7
- ✅ Quality standards exceeded (22 unit tests vs 16 original)

---

## Technical Notes

### Code Locations

**Email Service**:

- `src/groovy/umig/service/EnhancedEmailService.groovy`
  - Helper methods: lines 914-946 (instructions), 955-984 (comments)
  - Status change email: lines 371-391
  - Step opened email: lines 514-530
  - Instruction completed email: lines 634-650

**Repository Layer**:

- `src/groovy/umig/repository/StepRepository.groovy`
  - Method to verify: `getCompleteStepForEmail()`
- `src/groovy/umig/repository/AuditLogRepository.groovy`
  - Methods: `logEmailSent()`, `logEmailFailed()`

**URL Service**:

- `src/groovy/umig/utils/UrlConstructionService.groovy`
  - Method to fix: `buildStepViewUrl()` (lines 50, 73)

**API Layer**:

- `src/groovy/umig/api/v2/stepViewApi.groovy`
  - Email triggers: lines 210-268

**Testing**:

- Unit tests: `local-dev-setup/__tests__/groovy/unit/`
- Integration tests: `local-dev-setup/__tests__/groovy/integration/`
- Manual testing: `docs/testing/manual-testing-guide.md`

### Development Commands

```bash
# Start development environment
npm start

# Run Groovy unit tests
npm run test:groovy:unit

# Run Groovy integration tests
npm run test:groovy:integration

# Test email connectivity
npm run mailhog:test

# Check MailHog inbox
npm run mailhog:check

# Clear MailHog inbox
npm run mailhog:clear

# Comprehensive email testing
npm run email:test

# Health check
npm run health:check
```

### MailHog Access

- **Web UI**: http://localhost:8025
- **SMTP Server**: localhost:1025
- **API**: http://localhost:8025/api/v2/messages

---

**Story Status**: Ready for Implementation
**Created**: October 1, 2025
**Analysis Time**: 2 hours
**Estimated Implementation**: 8 story points (3 days)
**Target Completion**: October 4, 2025

---

_"Complete the email infrastructure deferred from TD-015: full step details, working Confluence links, audit validation, and multi-view consistency."_
