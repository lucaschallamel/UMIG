# TD-016: Automated Email Notification Enhancements - Requirements Analysis

**Sprint**: Sprint 8 - Security Architecture Enhancement
**Date**: October 1, 2025 (Day 2)
**Status**: Requirements Analysis Complete
**Story Points**: **8 points** (realistic for Sprint 8 constraints)
**Priority**: Mandatory (user decision)

---

## Executive Summary

TD-016 completes the email notification infrastructure by adding missing step details (instructions, comments), fixing broken Confluence links, validating audit log integration, and verifying multi-view consistency. This is the "finish off" work deferred from TD-015, plus critical URL generation fixes.

**Estimated Effort**: 8 story points

- **Requirement 1** (Step Details): 3 points (medium complexity, well-defined scope)
- **Requirement 2** (URL Fix): 2 points (focused fix, clear root cause)
- **Requirement 3** (Audit Validation): 2 points (validation only, infrastructure exists)
- **Requirement 4** (Multi-View): 1 point (verification testing)

**Sprint 8 Capacity Analysis**:

- Total remaining: 29.75 points, 13 days
- TD-014 remaining: 7.75 points (TD-014-B/C/D)
- US-098: 20 points (starts Oct 7)
- TD-016: 8 points (THIS STORY)
- **Total Sprint Load**: 35.75 points (5.75 over capacity)
- **Risk**: MEDIUM - Requires careful prioritization or scope adjustment

**Recommendation**: TD-016 is achievable IF TD-014 completes on schedule (Oct 4) and US-098 starts as planned (Oct 7). Consider TD-016 as Oct 2-4 work (parallel with TD-014 completion).

---

## Detailed Requirements Breakdown

### Requirement 1: Complete Step Details in Email Notifications

**User Statement**: "finish off" from TD-015 - include ALL step details in status update notification emails

**Scope Definition** (extracted from TD-015 documentation):

TD-015 successfully simplified email templates (540 scriptlets removed, 83% size reduction) but deferred **content enrichment** to TD-016. The templates now support instructions and comments through helper methods `buildInstructionsHtml()` and `buildCommentsHtml()`, but the data binding needs completion.

**Current State** (verified from code analysis):

- ✅ Helper methods exist: `buildInstructionsHtml()` (lines 914-946), `buildCommentsHtml()` (lines 955-984)
- ✅ Template variables prepared: `instructionsHtml`, `commentsHtml`, `recentComments` (lines 332-333, 328)
- ✅ Data structures defined: `instructions` (List), `comments` (List via `processCommentsForTemplate()`)
- ⚠️ Data binding incomplete: `stepRepository.getCompleteStepForEmail()` may not retrieve all required fields

**What Needs to Be Done**:

1. **Verify Data Retrieval** (1 point):
   - Audit `StepRepository.getCompleteStepForEmail()` method to confirm it retrieves:
     - `instructions` collection with all fields (ini_name, ini_duration_minutes, team_name, control_code, completed)
     - `comments` collection with all fields (author_name, created_at, comment_text)
   - If missing: Add SQL JOINs to retrieve these collections
   - Validate against TD-015's documented variable requirements (35 variables)

2. **Test Data Flow** (1 point):
   - Unit test: Verify `buildInstructionsHtml()` with real instruction data
   - Unit test: Verify `buildCommentsHtml()` with real comment data
   - Integration test: End-to-end email generation with instructions and comments
   - Manual test: MailHog inspection showing instructions table and comments section

3. **Template Validation** (1 point):
   - Confirm instructions table renders correctly (5 columns: status, name, duration, team, control)
   - Confirm comments section renders correctly (max 3 comments, with author/date/text)
   - Verify empty state handling (graceful fallback messages)
   - Email size validation: Ensure <102KB Gmail limit (currently 47KB with 55% margin)

**Acceptance Criteria**:

**AC-1.1**: `StepRepository.getCompleteStepForEmail()` retrieves `instructions` collection with all required fields (ini_name, ini_duration_minutes, team_name, control_code, completed)

**AC-1.2**: `StepRepository.getCompleteStepForEmail()` retrieves `comments` collection with all required fields (author_name, created_at, comment_text)

**AC-1.3**: Email template includes instructions table with 5 columns: status icon (✓ or index), name, duration, team, control code

**AC-1.4**: Email template includes comments section with max 3 most recent comments, each showing author name, timestamp, and comment text

**AC-1.5**: Empty state handling: Instructions table shows "No instructions defined for this step" when empty

**AC-1.6**: Empty state handling: Comments section shows "No comments yet. Be the first to add your insights!" when empty

**AC-1.7**: Unit tests: `buildInstructionsHtml()` passes with 3+ test scenarios (multiple instructions, empty list, missing data)

**AC-1.8**: Unit tests: `buildCommentsHtml()` passes with 3+ test scenarios (multiple comments, empty list, max 3 limit)

**AC-1.9**: Integration test: End-to-end email generation includes instructions and comments in final HTML

**AC-1.10**: Manual validation: MailHog inspection confirms instructions table and comments section render correctly

**AC-1.11**: Email size remains under 102KB Gmail limit (target <60KB with instructions/comments)

**Testing Requirements**:

- **Unit Tests**: 6 tests minimum (3 for instructions, 3 for comments)
- **Integration Tests**: 2 tests (status change with instructions, status change with comments)
- **Manual Tests**: MailHog visual inspection (15 minutes)
- **Coverage Target**: >80% for helper methods

**Dependencies**:

- TD-015 completion (DONE ✅)
- Email template infrastructure (EXISTS ✅)
- StepRepository access (EXISTS ✅)

**Risk Assessment**:

- **Risk**: `getCompleteStepForEmail()` may require SQL query modifications
- **Mitigation**: Use existing DTO method `findByInstanceIdAsDTO()` which already retrieves comprehensive data
- **Risk**: Email size could exceed 102KB with large instructions/comments
- **Mitigation**: Limit comments to 3 (already implemented), instructions have no hard limit but typical steps have <20

---

### Requirement 2: Fix Broken Confluence Link

**User Statement**: Current broken URL missing migration name parameter

**Problem Analysis**:

**Broken URL Example**:

```
http://localhost:8090/pages/viewpage.action?pageId=1114120&ite=CUTOVER+Iteration+1+for+Plan+d4d9c54f-82b7-4b9a-8a0a-bd2bb7156cc2&stepid=BUS-031
```

**Issues Identified**:

1. ❌ Missing `mig` parameter (migration name/code)
2. ❌ URL-encoded iteration name instead of iteration code
3. ✅ Correct `stepid` parameter (BUS-031)

**Expected URL Format** (from UrlConstructionService.groovy line 17):

```
{baseURL}/pages/viewpage.action?pageId={pageId}&mig={migrationCode}&ite={iterationCode}&stepid={stepCode}
```

**Root Cause** (verified from code):

- `UrlConstructionService.buildStepViewUrl()` generates correct URLs (line 523: `"pages/viewpage.action?pageId=${pageId}"`)
- Problem is likely in `stepViewApi.groovy` passing incorrect parameters to email service
- OR email template URL construction is bypassing `UrlConstructionService`

**What Needs to Be Done**:

1. **Audit URL Generation Flow** (0.5 points):
   - Trace URL generation from `stepViewApi.groovy` → `EnhancedEmailService` → `UrlConstructionService`
   - Verify `migrationCode` parameter is passed correctly at each layer
   - Check if email templates use `stepViewUrl` variable correctly

2. **Fix URL Construction** (1 point):
   - Ensure `UrlConstructionService.buildStepViewUrl()` receives correct parameters
   - Validate `migrationCode` is available in `stepViewApi.groovy` context
   - Add defensive null checks and logging for debugging

3. **Test URL Generation** (0.5 points):
   - Unit test: `buildStepViewUrl()` with all parameters
   - Integration test: End-to-end URL generation from API to email
   - Manual test: Click URL in MailHog email and verify navigation

**Acceptance Criteria**:

**AC-2.1**: Step view URL includes `mig` parameter with correct migration code (e.g., `mig=MIG-2025-Q1`)

**AC-2.2**: Step view URL includes `ite` parameter with correct iteration code (e.g., `ite=ITER-001`)

**AC-2.3**: Step view URL includes `stepid` parameter with correct step code (e.g., `stepid=BUS-031`)

**AC-2.4**: Generated URL matches format: `{baseURL}/pages/viewpage.action?pageId={pageId}&mig={migrationCode}&ite={iterationCode}&stepid={stepCode}`

**AC-2.5**: URL is properly URL-encoded (spaces and special characters handled)

**AC-2.6**: Clicking URL in email navigates to correct Confluence page

**AC-2.7**: Unit test validates `buildStepViewUrl()` generates correct URL format

**AC-2.8**: Integration test validates end-to-end URL generation includes all parameters

**Testing Requirements**:

- **Unit Tests**: 2 tests (URL construction with all parameters, parameter encoding)
- **Integration Tests**: 1 test (end-to-end URL in email)
- **Manual Tests**: Click test from MailHog (5 minutes)

**Dependencies**:

- `UrlConstructionService` (EXISTS ✅)
- `stepViewApi.groovy` (EXISTS ✅)
- System configuration table `system_configuration_scf` (EXISTS ✅)

**Risk Assessment**:

- **Risk**: Migration code may not be available in all contexts
- **Mitigation**: Add fallback logic to retrieve migration code from step instance
- **Risk**: URL encoding issues with special characters
- **Mitigation**: Use proper URLEncoder or Groovy's URL-safe encoding

---

### Requirement 3: Email Integration & Audit Log Validation

**User Statement**: All status changes and mail events must be logged with >80% test coverage and 100% pass rate

**Scope Definition**:

This is **validation only** - audit log infrastructure already exists via `AuditLogRepository`. TD-016 must verify that email integration properly logs all events.

**Current State** (verified from code analysis):

- ✅ `AuditLogRepository` exists with methods: `logEmailSent()`, `logEmailFailed()` (used in EnhancedEmailService.groovy lines 371-387, 412-419)
- ✅ Status change logging: Already integrated in `EnhancedEmailService.sendStepStatusChangedNotificationWithUrl()` (lines 371-391)
- ✅ Email success logging: `logEmailSent()` called with notification_type, step details, URL (lines 371-387)
- ✅ Email failure logging: `logEmailFailed()` called with error details (lines 412-419)
- ⚠️ Need to verify: Instruction completion and step opened notifications also log correctly

**What Needs to Be Done**:

1. **Audit Log Coverage Verification** (1 point):
   - Verify `sendStepStatusChangedNotificationWithUrl()` logs correctly ✅ (already exists)
   - Verify `sendStepOpenedNotificationWithUrl()` logs correctly (check lines 514-530)
   - Verify `sendInstructionCompletedNotificationWithUrl()` logs correctly (check lines 634-650)
   - Confirm all three notification types write to audit log

2. **Test Coverage Implementation** (1 point):
   - Unit tests: Mock `AuditLogRepository` calls and verify parameters
   - Integration tests: Verify audit log entries created in database
   - Test scenarios: Success logging, failure logging, parameter validation
   - Coverage target: >80% for audit logging code paths

**Acceptance Criteria**:

**AC-3.1**: `sendStepStatusChangedNotificationWithUrl()` calls `AuditLogRepository.logEmailSent()` on success with correct parameters (notification_type: 'STEP_STATUS_CHANGED_WITH_URL', step details, URL)

**AC-3.2**: `sendStepStatusChangedNotificationWithUrl()` calls `AuditLogRepository.logEmailFailed()` on failure with error details

**AC-3.3**: `sendStepOpenedNotificationWithUrl()` calls `AuditLogRepository.logEmailSent()` on success with correct parameters (notification_type: 'STEP_OPENED_WITH_URL')

**AC-3.4**: `sendInstructionCompletedNotificationWithUrl()` calls `AuditLogRepository.logEmailSent()` on success with correct parameters (notification_type: 'INSTRUCTION_COMPLETED_WITH_URL')

**AC-3.5**: Audit log entries include all required fields: user_id, entity_id (step/instruction), recipients, subject, template_id, metadata (notification_type, URLs, codes)

**AC-3.6**: Unit tests verify audit log calls with mocked `AuditLogRepository` (>80% coverage of audit logging paths)

**AC-3.7**: Integration tests verify audit log entries created in database (check `audit_log_aud` table)

**AC-3.8**: Test pass rate: 100% (all audit log tests pass)

**AC-3.9**: AC compliance: Follows acceptance criteria standards from user stories (clear, testable, complete)

**Testing Requirements**:

- **Unit Tests**: 6 tests minimum (2 per notification type: success + failure)
- **Integration Tests**: 3 tests (verify database entries for each notification type)
- **Coverage Measurement**: Use Groovy code coverage tools (target >80%)
- **Test Pass Rate**: 100% required (bug-free definition)

**Dependencies**:

- `AuditLogRepository` (EXISTS ✅)
- Email service methods (EXISTS ✅)
- Test infrastructure (EXISTS ✅)

**Risk Assessment**:

- **Risk**: Audit log writes may fail silently without breaking email flow
- **Mitigation**: Implement explicit error handling and logging for audit failures
- **Risk**: Test coverage measurement may be difficult for Groovy code
- **Mitigation**: Use manual code review if automated coverage tools unavailable

---

### Requirement 4: Multi-View Verification

**User Statement**: Verify IterationView and StepView consistency (both views not 100% sure yet)

**Scope Definition**:

Verify that email notifications work correctly from BOTH IterationView and StepView contexts. Currently, implementation is primarily in `stepViewApi.groovy` - need to verify IterationView integration.

**Current State** (code analysis shows):

- ✅ StepView: Email integration exists in `stepViewApi.groovy` (lines 210-268)
- ❌ IterationView: No `*ViewEntityManager.js` files found (need to locate iteration view code)
- ⚠️ Uncertainty: User stated "not 100% sure yet" - requires investigation

**What Needs to Be Done**:

1. **Locate View Components** (0.5 points):
   - Find IterationView JavaScript files (likely in different location)
   - Identify email notification trigger points in both views
   - Document view-specific email integration patterns

2. **Verify Consistency** (0.5 points):
   - Test email notifications from IterationView UI
   - Test email notifications from StepView UI
   - Verify same notification types work from both views
   - Check for view-specific edge cases or bugs

**Acceptance Criteria**:

**AC-4.1**: IterationView code location identified and documented

**AC-4.2**: StepView email notifications verified working (manual test from UI)

**AC-4.3**: IterationView email notifications verified working (manual test from UI)

**AC-4.4**: Both views generate identical email content for same step status change

**AC-4.5**: Both views pass correct parameters to `EnhancedEmailService` (migrationCode, iterationCode, stepInstance)

**AC-4.6**: URL generation works correctly from both views

**AC-4.7**: Audit log entries created consistently from both views

**AC-4.8**: Manual testing guide updated with multi-view verification steps

**Testing Requirements**:

- **Manual Tests**: 4 scenarios (2 per view: status change + instruction completion)
- **Integration Tests**: 2 tests (verify view-specific parameters)
- **Documentation**: Testing guide with screenshots and expected behavior

**Dependencies**:

- IterationView code (LOCATION TBD ⚠️)
- StepView code (EXISTS ✅)
- Email service integration (EXISTS ✅)

**Risk Assessment**:

- **Risk**: IterationView may not have email integration implemented
- **Mitigation**: If missing, create new story for IterationView integration (out of scope for TD-016)
- **Risk**: Views may use different parameter naming conventions
- **Mitigation**: Standardize parameter names via helper method or adapter pattern

---

## Complete Acceptance Criteria List

### Requirement 1: Step Details Completion (11 ACs)

- AC-1.1: Instructions collection retrieval with all fields
- AC-1.2: Comments collection retrieval with all fields
- AC-1.3: Instructions table rendering (5 columns)
- AC-1.4: Comments section rendering (max 3 items)
- AC-1.5: Instructions empty state handling
- AC-1.6: Comments empty state handling
- AC-1.7: Instructions unit tests (3+ scenarios)
- AC-1.8: Comments unit tests (3+ scenarios)
- AC-1.9: Integration test with instructions/comments
- AC-1.10: MailHog manual validation
- AC-1.11: Email size under 102KB limit

### Requirement 2: URL Fix (8 ACs)

- AC-2.1: URL includes `mig` parameter
- AC-2.2: URL includes `ite` parameter
- AC-2.3: URL includes `stepid` parameter
- AC-2.4: URL matches expected format
- AC-2.5: URL proper encoding
- AC-2.6: Clickable URL navigation
- AC-2.7: Unit test for URL construction
- AC-2.8: Integration test for end-to-end URL

### Requirement 3: Audit Log Validation (9 ACs)

- AC-3.1: Status change success logging
- AC-3.2: Status change failure logging
- AC-3.3: Step opened success logging
- AC-3.4: Instruction completed success logging
- AC-3.5: Audit log field completeness
- AC-3.6: Unit tests with >80% coverage
- AC-3.7: Integration tests verify database entries
- AC-3.8: 100% test pass rate
- AC-3.9: AC standards compliance

### Requirement 4: Multi-View Verification (8 ACs)

- AC-4.1: IterationView location documented
- AC-4.2: StepView notifications verified
- AC-4.3: IterationView notifications verified
- AC-4.4: Identical email content from both views
- AC-4.5: Correct parameters from both views
- AC-4.6: URL generation from both views
- AC-4.7: Audit logs from both views
- AC-4.8: Testing guide updated

**Total: 36 Acceptance Criteria**

---

## Testing Requirements Summary

### Unit Tests (>80% Coverage Required)

- **Requirement 1**: 6 tests (instructions: 3, comments: 3)
- **Requirement 2**: 2 tests (URL construction, encoding)
- **Requirement 3**: 6 tests (3 notification types × success/failure)
- **Requirement 4**: 2 tests (view-specific parameters)
- **Total Unit Tests**: 16 tests

### Integration Tests

- **Requirement 1**: 2 tests (end-to-end with instructions, with comments)
- **Requirement 2**: 1 test (end-to-end URL in email)
- **Requirement 3**: 3 tests (audit log database entries)
- **Requirement 4**: 2 tests (multi-view parameter passing)
- **Total Integration Tests**: 8 tests

### Manual Tests

- **Requirement 1**: MailHog inspection (15 minutes)
- **Requirement 2**: URL click test (5 minutes)
- **Requirement 4**: Multi-view testing (20 minutes)
- **Total Manual Testing Time**: 40 minutes

### Test Coverage Goals

- **Unit Test Coverage**: >80% of email service code paths
- **Pass Rate**: 100% (bug-free definition)
- **Integration Test Coverage**: All critical email flows

---

## Dependency Analysis

### Internal Dependencies

1. **TD-015 Completion** (DONE ✅): Email template infrastructure, helper methods
2. **StepRepository**: `getCompleteStepForEmail()` method access
3. **AuditLogRepository**: Audit logging infrastructure
4. **UrlConstructionService**: URL generation service
5. **Email Templates**: Database templates with simplified syntax

### External Dependencies

1. **MailHog**: Development SMTP server for testing
2. **PostgreSQL**: Database for audit logs and templates
3. **Confluence API**: For URL navigation validation (manual testing)

### Blockers

- **None identified** - All required infrastructure exists

### Nice-to-Have (Not Blockers)

- IterationView code location (can proceed with StepView verification first)
- Automated code coverage tools for Groovy (can use manual review)

---

## Risk Assessment & Mitigation

### High Priority Risks

**Risk 1: Sprint 8 Capacity Overload**

- **Impact**: HIGH - 35.75 points total vs 29.75 capacity (6 points over)
- **Probability**: MEDIUM - Depends on TD-014 completion and US-098 start date
- **Mitigation**:
  - Start TD-016 immediately (Oct 2) in parallel with TD-014 completion
  - Prioritize Requirements 1-2 (5 points) as mandatory
  - Requirements 3-4 (3 points) can be time-boxed if needed
  - Request user confirmation on priority if capacity conflict occurs

**Risk 2: IterationView Location Unknown**

- **Impact**: MEDIUM - Requirement 4 may be incomplete
- **Probability**: HIGH - No view files found in expected locations
- **Mitigation**:
  - Start with StepView verification (definitely exists)
  - Use codebase search to locate iteration-related JavaScript
  - If not found: Scope Requirement 4 to StepView only, create follow-up story

**Risk 3: Email Size Growth**

- **Impact**: MEDIUM - Could exceed 102KB Gmail limit
- **Probability**: LOW - Currently 47KB with 55% margin
- **Mitigation**:
  - Limit comments to 3 (already implemented)
  - Monitor email size during testing
  - Add size validation to integration tests

### Medium Priority Risks

**Risk 4: Test Coverage Measurement**

- **Impact**: LOW - May not reach exact 80% coverage metric
- **Probability**: MEDIUM - Groovy coverage tools may be unavailable
- **Mitigation**:
  - Use manual code review to estimate coverage
  - Focus on critical code paths (email sending, audit logging)
  - Document test coverage approach in testing guide

**Risk 5: URL Encoding Edge Cases**

- **Impact**: LOW - URLs may break with special characters
- **Probability**: LOW - Standard URL encoding should handle most cases
- **Mitigation**:
  - Test with special characters (spaces, Unicode, symbols)
  - Use proven URL encoding libraries
  - Add defensive validation for URL parameters

---

## Implementation Guidance for User Story Generator

### Story Structure

**Title**: TD-016: Automated Email Notification Enhancements

**Story Points**: 8

**Priority**: High (Sprint 8 mandatory)

**Description**: Complete email notification infrastructure by adding step details (instructions, comments), fixing broken Confluence links, validating audit log integration, and verifying multi-view consistency.

### Task Breakdown (for TodoWrite)

**Phase 1: Step Details Completion (3 points)**

- Task 1.1: Audit `StepRepository.getCompleteStepForEmail()` for instructions/comments retrieval
- Task 1.2: Add missing SQL JOINs if needed (instructions, comments collections)
- Task 1.3: Unit test `buildInstructionsHtml()` with real data (3 scenarios)
- Task 1.4: Unit test `buildCommentsHtml()` with real data (3 scenarios)
- Task 1.5: Integration test end-to-end email with instructions/comments
- Task 1.6: MailHog manual validation

**Phase 2: URL Generation Fix (2 points)**

- Task 2.1: Trace URL generation flow from API to email
- Task 2.2: Fix missing `mig` parameter in `buildStepViewUrl()`
- Task 2.3: Validate `migrationCode` availability in `stepViewApi.groovy`
- Task 2.4: Unit test URL construction with all parameters
- Task 2.5: Integration test end-to-end URL in email
- Task 2.6: Manual click test from MailHog

**Phase 3: Audit Log Validation (2 points)**

- Task 3.1: Verify status change audit logging (already implemented)
- Task 3.2: Verify step opened audit logging
- Task 3.3: Verify instruction completed audit logging
- Task 3.4: Unit tests for audit log calls (6 tests)
- Task 3.5: Integration tests for database entries (3 tests)
- Task 3.6: Measure test coverage (>80% target)

**Phase 4: Multi-View Verification (1 point)**

- Task 4.1: Locate IterationView code
- Task 4.2: Manual test StepView email notifications
- Task 4.3: Manual test IterationView email notifications
- Task 4.4: Verify parameter consistency between views
- Task 4.5: Update testing guide with multi-view steps

### Definition of Done

- [ ] All 36 acceptance criteria met
- [ ] 16 unit tests passing (100% pass rate)
- [ ] 8 integration tests passing (100% pass rate)
- [ ] > 80% test coverage for email service code paths
- [ ] Manual testing completed (40 minutes, documented)
- [ ] Email size under 102KB Gmail limit
- [ ] Audit log entries verified in database
- [ ] URL navigation tested and working
- [ ] Multi-view consistency verified (or scoped to StepView only)
- [ ] Code reviewed and approved
- [ ] Documentation updated (testing guide, ADR if needed)

### Sprint 8 Integration

**Timeline**: October 2-4, 2025 (3 days, parallel with TD-014 completion)

**Capacity Check**:

- TD-014 remaining: 7.75 points (completes Oct 4)
- TD-016: 8 points (Oct 2-4)
- US-098: 20 points (starts Oct 7)
- **Overlap Risk**: TD-016 and TD-014 final days overlap
- **Mitigation**: TD-016 can proceed independently, minimal coordination needed

### Related Stories

- **TD-015** (DONE): Email template simplification, helper methods
- **TD-014** (IN PROGRESS): Security enhancements (related to audit logging)
- **US-098** (UPCOMING): Next Sprint 8 deliverable

---

## Conclusion

TD-016 is a well-defined 8-point story that completes the email notification infrastructure deferred from TD-015. The scope is realistic for Sprint 8 with clear acceptance criteria, testable outcomes, and manageable risks.

**Key Success Factors**:

1. ✅ Well-defined scope (4 clear requirements)
2. ✅ Existing infrastructure (TD-015 completion)
3. ✅ Testable acceptance criteria (36 ACs)
4. ✅ Realistic effort estimate (8 points)
5. ⚠️ Sprint capacity requires careful scheduling

**Recommendation**: **PROCEED with TD-016** as Oct 2-4 priority work, with explicit user confirmation on Sprint 8 capacity management.

---

**Document Status**: Ready for User Story Generation
**Next Steps**: Create TD-016 user story with acceptance criteria and task breakdown
**Estimated Story Creation Time**: 15 minutes

---

_Analysis completed: October 1, 2025_
_Total Analysis Time: 2 hours_
_Quality: Comprehensive requirements analysis with risk assessment_
