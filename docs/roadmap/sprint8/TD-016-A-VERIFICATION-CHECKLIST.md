# TD-016-A Verification Checklist

**Task**: Email Instructions/Comments Population Enhancement
**Date**: October 1, 2025
**Status**: ✅ Implementation Complete → ⏳ Awaiting Verification

---

## Pre-Verification: Schema Validation ✅

### Instructions Schema

- [x] Verified master/instance pattern: `instructions_instance_ini` + `instructions_master_inm`
- [x] Confirmed `inm_body` column contains instruction text
- [x] Confirmed `inm_duration_minutes` in master table
- [x] Confirmed `ini_is_completed` in instance table
- [x] Verified JOIN to `teams_tms` via `inm.tms_id`
- [x] Verified JOIN to `controls_master_ctm` via `inm.ctm_id`
- [x] Confirmed ordering by `inm.inm_order`

### Comments Schema

- [x] Verified single table: `step_instance_comments_sic`
- [x] Confirmed column name: `comment_body` (not `sic_text`)
- [x] Confirmed foreign key: `created_by` (not `usr_id`)
- [x] Confirmed timestamp: `created_at` (not `sic_created_at`)
- [x] Verified JOIN to `users_usr` via `sic.created_by = usr.usr_id`
- [x] Confirmed DESC ordering with LIMIT 3

---

## Step 1: Test Data Verification ⏳

### 1.1 Check Step GON-7 Instructions

```sql
SELECT
    sti.sti_id,
    sti.sti_name,
    ini.ini_id,
    inm.inm_body as instruction_text,
    inm.inm_duration_minutes,
    ini.ini_is_completed,
    tms.tms_name as team_name,
    ctm.ctm_name as control_code
FROM steps_instance_sti sti
LEFT JOIN instructions_instance_ini ini ON sti.sti_id = ini.sti_id
LEFT JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id
LEFT JOIN controls_master_ctm ctm ON inm.ctm_id = ctm.ctm_id
WHERE sti.sti_name LIKE '%GON-7%'
ORDER BY inm.inm_order;
```

**Expected Result**: [ ] Should return 1+ instructions for GON-7

**Actual Result**: ****\_\_\_****

### 1.2 Check Step GON-7 Comments

```sql
SELECT
    sti.sti_id,
    sti.sti_name,
    sic.sic_id,
    sic.comment_body,
    usr.usr_code as author,
    sic.created_at
FROM steps_instance_sti sti
LEFT JOIN step_instance_comments_sic sic ON sti.sti_id = sic.sti_id
LEFT JOIN users_usr usr ON sic.created_by = usr.usr_id
WHERE sti.sti_name LIKE '%GON-7%'
ORDER BY sic.created_at DESC;
```

**Expected Result**: [ ] Should return 1+ comments for GON-7

**Actual Result**: ****\_\_\_****

### 1.3 Test Data Actions

- [ ] If no instructions: Add test instructions via Admin GUI or SQL
- [ ] If no comments: Add test comments via StepView
- [ ] If no Step GON-7: Use different step with known instructions/comments

---

## Step 2: ScriptRunner Refresh ⏳

### 2.1 Refresh ScriptRunner Cache

- [ ] User navigates to Confluence → ScriptRunner → Script Console
- [ ] User clicks "Clear Cache" or restarts Confluence
- [ ] Confirmation message displayed

### 2.2 Verify Script Loads

- [ ] No compilation errors in Confluence logs
- [ ] EnhancedEmailService.groovy loads successfully
- [ ] No ClassNotFoundException or similar errors

---

## Step 3: Trigger Email Notification ⏳

### 3.1 Navigate to StepView

- [ ] Open Confluence UMIG page
- [ ] Navigate to Step GON-7 (or selected test step)
- [ ] Verify step is in a changeable status (e.g., PENDING)

### 3.2 Change Step Status

- [ ] Click status dropdown
- [ ] Select new status (e.g., IN_PROGRESS)
- [ ] Confirm status change
- [ ] Email notification should trigger

### 3.3 Check Confluence Logs

Look for TD-016-A debug messages:

```
🔧 [EnhancedEmailService] TD-016-A: Fetching instructions array
🔧 [EnhancedEmailService] TD-016-A: Retrieved X instructions
🔧 [EnhancedEmailService] TD-016-A: Fetching comments array (last 3)
🔧 [EnhancedEmailService] TD-016-A: Retrieved Y comments
🔧 [EnhancedEmailService] TD-016-A: instructions array size: X
🔧 [EnhancedEmailService] TD-016-A: comments array size: Y
```

**Log Results**:

- [ ] Instructions query executed: **\_** ms
- [ ] Instructions retrieved: **\_** count
- [ ] Comments query executed: **\_** ms
- [ ] Comments retrieved: **\_** count
- [ ] Total enrichment time: **\_** ms

---

## Step 4: Verify Email Content in MailHog ⏳

### 4.1 Open MailHog

- [ ] Navigate to http://localhost:8025
- [ ] Find the most recent email (status change notification)
- [ ] Open email in MailHog viewer

### 4.2 Verify Instructions Section

**When Instructions Exist** (X > 0):

- [ ] Instructions table is visible
- [ ] Table has 5 columns: #, Name, Duration, Team, Control
- [ ] Each instruction row displays:
  - [ ] Status icon (✓ or number)
  - [ ] Instruction name/body
  - [ ] Duration in minutes
  - [ ] Assigned team name
  - [ ] Control code

**When No Instructions** (X = 0):

- [ ] See message: "No instructions defined for this step"
- [ ] No broken HTML or rendering errors

### 4.3 Verify Comments Section

**When Comments Exist** (Y > 0):

- [ ] Comment cards are visible (max 3)
- [ ] Each comment displays:
  - [ ] Author username
  - [ ] Timestamp (formatted)
  - [ ] Comment text
  - [ ] Proper styling (border-left blue, padding)

**When No Comments** (Y = 0):

- [ ] See message: "No comments yet. Be the first to add your insights!"
- [ ] No broken HTML or rendering errors

### 4.4 Email Quality Checks

- [ ] Email renders properly in MailHog viewer
- [ ] No HTML syntax errors
- [ ] All template variables populated
- [ ] StepView URL clickable and correct
- [ ] Status badge displays correctly
- [ ] Overall email layout is clean

---

## Step 5: Test All 3 Notification Types ⏳

### 5.1 STEP_STATUS_CHANGED ✅

- [x] Already tested in Steps 3-4 above
- [ ] Instructions/comments display correctly

### 5.2 STEP_OPENED

**Test Method**:

1. Find a step in PENDING status
2. Click "Open Step" button in StepView
3. Check MailHog for STEP_OPENED email

**Verification**:

- [ ] Email received
- [ ] Instructions section present and populated
- [ ] Comments section present and populated
- [ ] Status shows "OPEN"

### 5.3 INSTRUCTION_COMPLETED

**Test Method**:

1. Open a step with incomplete instructions
2. Mark an instruction as complete
3. Check MailHog for INSTRUCTION_COMPLETED email

**Verification**:

- [ ] Email received
- [ ] Instructions section shows all instructions (with completion status)
- [ ] Comments section present and populated
- [ ] Completed instruction highlighted

---

## Step 6: Performance Validation ⏳

### 6.1 Query Performance

From Confluence logs (TD-016-A debug messages):

| Query            | Execution Time | Acceptable? |
| ---------------- | -------------- | ----------- |
| Instructions     | **\_** ms      | [ ] < 100ms |
| Comments         | **\_** ms      | [ ] < 100ms |
| Total Enrichment | **\_** ms      | [ ] < 500ms |

### 6.2 Email Send Performance

- [ ] Total email send time: **\_** ms
- [ ] Target: < 2 seconds per email
- [ ] No connection pool warnings in logs
- [ ] No timeout errors

### 6.3 Load Test (Optional)

Send 10 status change emails in rapid succession:

- [ ] All emails sent successfully
- [ ] No degradation in performance
- [ ] No database connection issues

---

## Step 7: Error Handling Verification ⏳

### 7.1 Test Empty Step (No Instructions/Comments)

- [ ] Find step with no instructions and no comments
- [ ] Change status
- [ ] Email shows appropriate fallback messages
- [ ] No errors in logs

### 7.2 Test Database Error Handling

**Method**: Temporarily break SQL (typo in column name):

- [ ] Change `inm.inm_body` to `inm.invalid_column`
- [ ] Trigger status change
- [ ] Verify graceful error handling:
  - [ ] Error logged in Confluence logs
  - [ ] Email still sends (with empty instructions)
  - [ ] No crashes or exceptions propagate to user

**Action**: [ ] Revert SQL to correct version

### 7.3 Test Missing Foreign Key Data

- [ ] Test instruction with no team (`tms_id = NULL`)
- [ ] Test comment with no author (`created_by = NULL`)
- [ ] Verify LEFT JOIN handles nulls gracefully

---

## Step 8: Acceptance Criteria Final Check ✅

| AC # | Criteria                                           | Status | Evidence                         |
| ---- | -------------------------------------------------- | ------ | -------------------------------- |
| AC-1 | Instructions array fetched with 7 fields           | [ ]    | MailHog email shows all fields   |
| AC-2 | Comments array fetched with 4 fields, limited to 3 | [ ]    | MailHog shows max 3 comments     |
| AC-3 | Empty arrays handled gracefully                    | [ ]    | Fallback messages display        |
| AC-4 | Email templates display data when exists           | [ ]    | MailHog shows populated sections |
| AC-5 | All 3 notification types tested                    | [ ]    | All 3 emails verified            |
| AC-6 | ADR-031 type safety maintained                     | [x]    | Code review confirms             |
| AC-7 | DatabaseUtil.withSql pattern followed              | [x]    | Code review confirms             |
| AC-8 | No performance degradation (<500ms)                | [ ]    | Logs confirm timing              |

---

## Step 9: Documentation Update ⏳

### 9.1 Update Task Status

- [ ] Mark TD-016-A as "COMPLETE" in roadmap
- [ ] Update Sprint 8 progress tracking
- [ ] Archive gap analysis document

### 9.2 Update Code Comments

- [ ] Update method-level documentation in EnhancedEmailService
- [ ] Add TD-016-A reference in code comments
- [ ] Document query performance characteristics

### 9.3 Create Integration Test (Optional - Sprint 9)

- [ ] Create test file: `__tests__/groovy/isolated/services/EmailInstructionsCommentsTest.groovy`
- [ ] Test instruction query returns correct fields
- [ ] Test comment query returns correct fields
- [ ] Test empty state handling

---

## Step 10: Sign-Off ⏳

### 10.1 Technical Sign-Off

**Verified by**: ********\_\_\_********
**Date**: ********\_\_\_********

**Confirmation**:

- [ ] All queries execute without errors
- [ ] Email templates display instructions/comments correctly
- [ ] Performance is acceptable (<500ms)
- [ ] Error handling is graceful
- [ ] No breaking changes introduced

### 10.2 User Sign-Off

**Verified by**: ********\_\_\_********
**Date**: ********\_\_\_********

**Confirmation**:

- [ ] Email notifications are more useful with instructions/comments
- [ ] Instructions display clearly in emails
- [ ] Comments provide helpful context
- [ ] Empty state messages are appropriate

---

## Rollback Criteria ⚠️

**Trigger Rollback If**:

- [ ] Queries cause >1 second delay in email sending
- [ ] SQL errors prevent emails from sending
- [ ] Email templates break or show incorrect data
- [ ] Database connection pool exhaustion
- [ ] Any critical bug preventing email notifications

**Rollback Method**:

```bash
git checkout HEAD~1 src/groovy/umig/utils/EnhancedEmailService.groovy
# Refresh ScriptRunner cache in Confluence
```

---

## Completion Status

**Overall Status**: ⏳ **AWAITING VERIFICATION**

**Next Action**: Execute Steps 1-9 of verification checklist

**Estimated Time**: 1-2 hours for complete verification

**Ready for Testing**: ✅ YES

**Blockers**: None

---

**Document Version**: 1.0
**Last Updated**: October 1, 2025
**Maintained By**: Development Team
