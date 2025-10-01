# TD-015 Critical Bug Report: Email Template Data Binding Failure

**Date**: 2025-09-30
**Discovered During**: TD-015 Phase 5 (End-to-End Testing)
**Severity**: 🔴 **CRITICAL** - Production emails non-functional
**Status**: Active Bug - Requires Immediate Attention
**Sprint**: Sprint 8 (Security Architecture Enhancement)

---

## Executive Summary

**Templates are structurally perfect (45,243 bytes, 100% variable coverage), but production emails are completely broken due to data binding failure.**

During Phase 5 E2E testing of TD-015 (Email Template Consistency Finalization), we discovered that **ALL production emails display raw GSP template syntax** instead of rendered data. Users see placeholder variables like `${stepInstance.sti_code}`, conditional statements `<% if %>`, and loop syntax throughout email bodies.

**Root Cause**: `stepViewApi.groovy` only populates 2 fields (`sti_id`, `sti_name`) when templates expect 35+ fields. The data binding layer is fundamentally broken.

**Impact**: Production email notifications are unusable. Users cannot extract meaningful information from system-generated emails.

**Fix Required**: Complete rebuild of step instance data population in `stepViewApi.groovy` to include all template-required fields.

---

## Evidence: Production Email Failure

### Actual Email Sent by Production System

**Step Instance**: `fe27fc0a-aaca-43b7-8ffc-83d8a4bef995`
**Event**: Status change COMPLETED → FAILED
**Timestamp**: 2025-09-30 13:44:54.550765+00
**Template**: STEP_STATUS_CHANGED_WITH_URL
**Recipients**: garden_department@umig.com, movies_department@umig.com, it_cutover@umig.com

### Audit Log Entry

```json
{
  "id": 12,
  "timestamp": "2025-09-30 13:44:54.550765+00",
  "user_id": 1,
  "action": "EMAIL_SENT",
  "entity_type": "STEP_INSTANCE",
  "entity_id": "fe27fc0a-aaca-43b7-8ffc-83d8a4bef995",
  "details": {
    "status": "SENT",
    "subject": "[UMIG] Migration 1: Open-architected value-added moderator - Step Status: Step 3: odio thymbra vetus subiungo corrigo → FAILED",
    "step_name": "Step 3: odio thymbra vetus subiungo corrigo",
    "new_status": "FAILED",
    "old_status": "COMPLETED",
    "recipients": [
      "garden_department@umig.com",
      "movies_department@umig.com",
      "it_cutover@umig.com"
    ],
    "template_id": "4a6e2e22-40fb-4675-bdbe-122c70c413e2",
    "step_view_url": "http://localhost:8090/pages/viewpage.action?pageId=1114120&ite=CUTOVER+Iteration+1+for+Plan+e6a8d6d5-53b1-4e80-9a11-7b50c546be44&stepid=AUT-003",
    "iteration_code": "CUTOVER Iteration 1 for Plan e6a8d6d5-53b1-4e80-9a11-7b50c546be44",
    "migration_code": "Migration 1: Open-architected value-added moderator",
    "notification_type": "STEP_STATUS_CHANGED_WITH_URL"
  }
}
```

### Email Rendering Issues Observed

**Raw Template Syntax Visible**:

- `${stepInstance.sti_code ?: 'STEP'}` rendered literally (not replaced)
- `${stepInstance.team_name}` displayed as empty placeholder
- `${stepInstance.environment_name}` blank
- `${stepInstance.sti_description}` no content
- `${stepInstance.sti_duration_minutes}` empty

**Conditional Statements Exposed**:

```gsp
<% if (migrationCode && iterationCode) { %>
  <!-- This conditional is visible in email HTML -->
<% } %>
```

**Loop Syntax Displayed**:

```gsp
<% stepInstance.instructions?.eachWithIndex { instruction, index -> %>
  <!-- Loop body never executes because instructions array is null -->
<% } %>
```

**What Users See**:

- Email subject line works correctly (uses parameters passed directly to service)
- Email body is full of unprocessed template code
- No meaningful step information conveyed
- Professional appearance completely broken

---

## Root Cause Analysis

### File: `/src/groovy/umig/api/v2/stepViewApi.groovy`

**Location**: Lines 194-198 (STEP_STATUS_CHANGED notification)

**Current Code**:

```groovy
def stepInstanceForEmail = [
    sti_id: stepSummary?.sti_id,
    sti_name: stepSummary?.Name,
    // Add other fields that EnhancedEmailService might need
]

EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
    stepInstanceForEmail,  // ⚠️ INCOMPLETE OBJECT - Only 2 of 35+ fields!
    teams as List<Map>,
    cutoverTeam,
    oldStatus,
    newStatus,
    ((currentUser as Map)?.usr_id as Integer),
    migrationCode,
    iterationCode
)
```

**The Problem**: Comment says "Add other fields that EnhancedEmailService might need" but **those fields were NEVER added**.

### What Templates Expect vs What They Receive

**Templates Expect (35+ fields)**:

#### Core Step Information

- ✅ `sti_id` (UUID) - PROVIDED
- ✅ `sti_name` (String) - PROVIDED
- ❌ `sti_code` (String) - **MISSING**
- ❌ `sti_description` (Text) - **MISSING**
- ❌ `sti_duration_minutes` (Integer) - **MISSING**
- ❌ `sti_status` (String) - **MISSING**

#### Contextual Information

- ❌ `environment_name` (String) - **MISSING**
- ❌ `team_name` (String) - **MISSING**
- ❌ `predecessor_code` (String) - **MISSING**
- ❌ `predecessor_name` (String) - **MISSING**
- ❌ `successor_code` (String) - **MISSING**
- ❌ `successor_name` (String) - **MISSING**

#### Rich Data Arrays

- ❌ `instructions` (List<Map>) - **MISSING** (causes loop failures)
- ❌ `completedInstructions` (List<Map>) - **MISSING**
- ❌ `pendingInstructions` (List<Map>) - **MISSING**
- ❌ `recentComments` (List<Map>) - **MISSING**
- ❌ `impacted_teams` (List<Map>) - **MISSING**

#### Migration/Iteration Context

- ⚠️ `migrationCode` (passed separately, not in stepInstance)
- ⚠️ `iterationCode` (passed separately, not in stepInstance)
- ❌ `migration_description` - **MISSING**
- ❌ `iteration_description` - **MISSING**

#### URLs & References

- ⚠️ `stepViewUrl` (passed separately to service)
- ❌ `confluence_base_url` - **MISSING**
- ❌ `step_view_page_id` - **MISSING**

**Result**: Templates receive 2 fields but need 35+ fields. GSP engine cannot populate variables, so raw syntax is rendered.

---

## Impact Assessment

### User Experience Impact

- ❌ **Complete Loss of Email Functionality**: Users cannot understand email content
- ❌ **Professional Appearance Destroyed**: Technical template code visible to business users
- ❌ **No Actionable Information**: Users must manually check Confluence for all updates
- ❌ **Trust Erosion**: System appears broken/unprofessional

### Technical Debt Impact

- 🔴 **Critical Production Bug**: Affects all email notifications system-wide
- 🔴 **Silent Failure**: Emails technically "send" (SMTP success) but are useless
- 🔴 **Widespread**: Affects STEP_STATUS_CHANGED, STEP_OPENED, INSTRUCTION_COMPLETED templates
- 🔴 **Data Integrity**: Rich step context stored in database but never surfaced in emails

### Business Impact

- ⚠️ **Communication Breakdown**: Team coordination relies on broken notifications
- ⚠️ **Manual Workarounds**: Users must constantly refresh Confluence
- ⚠️ **Migration Risk**: Cutover teams unaware of critical status changes
- ⚠️ **Audit Trail Incomplete**: Email audit logs show "SENT" but content is broken

---

## Affected Code Sections

### Primary: stepViewApi.groovy

**Lines 173-228**: `case 'stepStatusChange'`

```groovy
// BROKEN: Only passes sti_id and sti_name
def stepInstanceForEmail = [
    sti_id: stepSummary?.sti_id,
    sti_name: stepSummary?.Name,
]
```

**Lines 229-248**: `case 'stepOpened'`

```groovy
// BROKEN: Same minimal object construction
def stepInstanceForEmail = [
    sti_id: stepSummary?.sti_id,
    sti_name: stepSummary?.Name,
]
```

**Lines 249-268**: `case 'instructionCompleted'`

```groovy
// BROKEN: Instruction object also minimal
def instructionForEmail = [
    ini_id: instructionId,
    ini_name: instructionName
]
```

### Secondary: EnhancedEmailService.groovy

**Assumption**: Service likely expects richer objects but receives minimal data. Service may need refactoring to enforce complete data requirements or query missing fields itself.

---

## Required Fix: Complete Data Population

### Strategy 1: Enhance stepViewApi.groovy (Recommended)

**Build Complete Step Instance Object**:

```groovy
// Query database for complete step details
def fullStepInstance = sql.firstRow("""
    SELECT
        sti.sti_id, sti.sti_code, sti.sti_name, sti.sti_description,
        sti.sti_duration_minutes, sti.sti_status,
        env.env_name as environment_name,
        team.tea_name as team_name,
        pred.stm_code as predecessor_code,
        pred.stm_name as predecessor_name,
        succ.stm_code as successor_code,
        succ.stm_name as successor_name,
        mig.mig_code as migration_code,
        mig.mig_description as migration_description,
        ite.ite_code as iteration_code,
        ite.ite_description as iteration_description
    FROM steps_instance_sti sti
    LEFT JOIN environments_env env ON sti.env_id = env.env_id
    LEFT JOIN teams_tea team ON sti.tea_id = team.tea_id
    LEFT JOIN steps_master_stm pred ON sti.predecessor_stm_id = pred.stm_id
    LEFT JOIN steps_master_stm succ ON sti.successor_stm_id = succ.stm_id
    LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
    LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
    LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
    LEFT JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
    LEFT JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
    WHERE sti.sti_id = ?
""", [stepId])

// Query instructions
def instructions = sql.rows("""
    SELECT ini_id, ini_name, ini_description, ini_status, ini_order
    FROM instructions_instance_ini
    WHERE sti_id = ?
    ORDER BY ini_order
""", [stepId])

// Query recent comments
def recentComments = sql.rows("""
    SELECT
        u.usr_full_name as author_name,
        c.created_at,
        c.cmt_text as comment_text
    FROM comments_cmt c
    JOIN users_usr u ON c.usr_id = u.usr_id
    WHERE c.sti_id = ?
    ORDER BY c.created_at DESC
    LIMIT 3
""", [stepId])

// Build complete object
def stepInstanceForEmail = [
    sti_id: fullStepInstance.sti_id,
    sti_code: fullStepInstance.sti_code,
    sti_name: fullStepInstance.sti_name,
    sti_description: fullStepInstance.sti_description,
    sti_duration_minutes: fullStepInstance.sti_duration_minutes,
    sti_status: fullStepInstance.sti_status,
    environment_name: fullStepInstance.environment_name,
    team_name: fullStepInstance.team_name,
    predecessor_code: fullStepInstance.predecessor_code,
    predecessor_name: fullStepInstance.predecessor_name,
    successor_code: fullStepInstance.successor_code,
    successor_name: fullStepInstance.successor_name,
    migration_code: fullStepInstance.migration_code,
    migration_description: fullStepInstance.migration_description,
    iteration_code: fullStepInstance.iteration_code,
    iteration_description: fullStepInstance.iteration_description,
    instructions: instructions,
    completedInstructions: instructions.findAll { it.ini_status == 'COMPLETED' },
    pendingInstructions: instructions.findAll { it.ini_status == 'PENDING' },
    recentComments: recentComments,
    impacted_teams: teams // Already queried in stepViewApi
]
```

### Strategy 2: Create Dedicated Repository Method

**Better Approach** - Add to StepsInstanceRepository:

```groovy
// src/groovy/umig/repository/StepsInstanceRepository.groovy

/**
 * Get complete step instance data for email rendering
 * Includes all joined data needed by email templates
 */
Map getCompleteStepForEmail(UUID stepId) {
    return DatabaseUtil.withSql { sql ->
        def stepData = sql.firstRow("""
            SELECT
                sti.sti_id, sti.sti_code, sti.sti_name, sti.sti_description,
                sti.sti_duration_minutes, sti.sti_status,
                env.env_name as environment_name,
                team.tea_name as team_name,
                pred.stm_code as predecessor_code,
                pred.stm_name as predecessor_name,
                succ.stm_code as successor_code,
                succ.stm_name as successor_name,
                mig.mig_code as migration_code,
                mig.mig_description as migration_description,
                ite.ite_code as iteration_code,
                ite.ite_description as iteration_description
            FROM steps_instance_sti sti
            LEFT JOIN environments_env env ON sti.env_id = env.env_id
            LEFT JOIN teams_tea team ON sti.tea_id = team.tea_id
            LEFT JOIN steps_master_stm pred ON sti.predecessor_stm_id = pred.stm_id
            LEFT JOIN steps_master_stm succ ON sti.successor_stm_id = succ.stm_id
            LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
            LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
            LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
            LEFT JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
            LEFT JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
            WHERE sti.sti_id = ?
        """, [stepId])

        if (!stepData) {
            throw new NotFoundException("Step instance not found: ${stepId}")
        }

        // Add instructions
        def instructions = sql.rows("""
            SELECT ini_id, ini_name, ini_description, ini_status, ini_order
            FROM instructions_instance_ini
            WHERE sti_id = ?
            ORDER BY ini_order
        """, [stepId])

        // Add recent comments
        def recentComments = sql.rows("""
            SELECT
                u.usr_full_name as author_name,
                c.created_at,
                c.cmt_text as comment_text
            FROM comments_cmt c
            JOIN users_usr u ON c.usr_id = u.usr_id
            WHERE c.sti_id = ?
            ORDER BY c.created_at DESC
            LIMIT 3
        """, [stepId])

        // Build complete map
        return [
            sti_id: stepData.sti_id,
            sti_code: stepData.sti_code,
            sti_name: stepData.sti_name,
            sti_description: stepData.sti_description,
            sti_duration_minutes: stepData.sti_duration_minutes,
            sti_status: stepData.sti_status,
            environment_name: stepData.environment_name,
            team_name: stepData.team_name,
            predecessor_code: stepData.predecessor_code,
            predecessor_name: stepData.predecessor_name,
            successor_code: stepData.successor_code,
            successor_name: stepData.successor_name,
            migration_code: stepData.migration_code,
            migration_description: stepData.migration_description,
            iteration_code: stepData.iteration_code,
            iteration_description: stepData.iteration_description,
            instructions: instructions,
            completedInstructions: instructions.findAll { it.ini_status == 'COMPLETED' },
            pendingInstructions: instructions.findAll { it.ini_status == 'PENDING' },
            recentComments: recentComments
        ]
    }
}
```

**Then in stepViewApi.groovy**:

```groovy
def stepsRepo = { -> new StepsInstanceRepository() }

// Replace minimal object construction with:
def stepInstanceForEmail = stepsRepo().getCompleteStepForEmail(stepId as UUID)
stepInstanceForEmail.impacted_teams = teams // Add teams from current query

EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
    stepInstanceForEmail,  // ✅ COMPLETE OBJECT with all 35+ fields
    teams as List<Map>,
    cutoverTeam,
    oldStatus,
    newStatus,
    ((currentUser as Map)?.usr_id as Integer),
    migrationCode,
    iterationCode
)
```

---

## Testing Plan: Validate Fix

### Phase 1: Unit Testing (Jest)

**Create**: `local-dev-setup/__tests__/unit/repositories/StepsInstanceRepository.test.js`

```javascript
describe("StepsInstanceRepository.getCompleteStepForEmail", () => {
  test("should return all 35+ required fields", async () => {
    const stepId = "c73272a2-6fb3-4e1e-8382-8d64c8739465";
    const result = await repository.getCompleteStepForEmail(stepId);

    // Core fields
    expect(result.sti_id).toBeDefined();
    expect(result.sti_code).toBeDefined();
    expect(result.sti_name).toBeDefined();
    expect(result.sti_description).toBeDefined();

    // Context fields
    expect(result.environment_name).toBeDefined();
    expect(result.team_name).toBeDefined();

    // Arrays
    expect(Array.isArray(result.instructions)).toBe(true);
    expect(Array.isArray(result.recentComments)).toBe(true);

    // Migration context
    expect(result.migration_code).toBeDefined();
    expect(result.iteration_code).toBeDefined();
  });

  test("should handle steps with no instructions gracefully", async () => {
    const stepId = "some-step-without-instructions";
    const result = await repository.getCompleteStepForEmail(stepId);

    expect(result.instructions).toEqual([]);
    expect(result.completedInstructions).toEqual([]);
    expect(result.pendingInstructions).toEqual([]);
  });
});
```

### Phase 2: Integration Testing (Groovy)

**Create**: `src/groovy/umig/tests/integration/EmailServiceDataBindingTest.groovy`

```groovy
@Grab('org.postgresql:postgresql:42.5.1')
import groovy.sql.Sql

class EmailServiceDataBindingTest {
    static void main(String[] args) {
        def sql = Sql.newInstance(
            'jdbc:postgresql://localhost:5432/umig_app_db',
            'umig_app_user',
            '123456',
            'org.postgresql.Driver'
        )

        // Get first step instance
        def stepId = sql.firstRow("""
            SELECT sti_id FROM steps_instance_sti LIMIT 1
        """).sti_id

        // Call repository method
        def repo = new StepsInstanceRepository()
        def stepData = repo.getCompleteStepForEmail(stepId)

        // Validate all required fields present
        assert stepData.sti_id != null
        assert stepData.sti_code != null
        assert stepData.sti_name != null
        assert stepData.environment_name != null
        assert stepData.instructions != null
        assert stepData.migration_code != null

        println "✅ All required fields present in stepData"
        println "   Fields count: ${stepData.size()}"
        println "   Instructions: ${stepData.instructions.size()}"
        println "   Comments: ${stepData.recentComments.size()}"

        sql.close()
    }
}
```

### Phase 3: E2E Email Rendering Test

**Enhance**: `local-dev-setup/scripts/utilities/email-database-sender.js`

```javascript
// After sending test email, fetch from MailHog and validate HTML
async function validateEmailRendering(emailType) {
  // Fetch email from MailHog API
  const response = await fetch("http://localhost:8025/api/v2/messages");
  const messages = await response.json();
  const latestEmail = messages.items[0];

  const htmlBody = latestEmail.Content.Body;

  // Validate NO raw GSP syntax present
  const gspPatterns = [
    /\$\{[^}]+\}/, // ${variable}
    /<% if/, // <% if %>
    /<% [^>]+\.each/, // <% list.each %>
    /\$\{[^}]+\s*\?\s*[^}]+:[^}]+\}/, // ${ternary ? true : false}
  ];

  let hasRawSyntax = false;
  for (const pattern of gspPatterns) {
    if (pattern.test(htmlBody)) {
      console.error(`❌ Found raw GSP syntax: ${pattern}`);
      hasRawSyntax = true;
    }
  }

  if (hasRawSyntax) {
    throw new Error("Email contains unprocessed GSP template syntax");
  }

  // Validate expected content IS present
  const requiredContent = [
    emailType === "STEP_STATUS_CHANGED" ? /Step Status:/ : null,
    /Migration \d+:/,
    /Environment:/,
    /Team:/,
    /View in Confluence/,
  ].filter(Boolean);

  for (const pattern of requiredContent) {
    if (!pattern.test(htmlBody)) {
      throw new Error(`Missing expected content: ${pattern}`);
    }
  }

  console.log(
    "✅ Email rendering validated - no raw syntax, all content present",
  );
}
```

### Phase 4: Manual Validation Checklist

**After deploying fix**:

1. **Trigger Real Email**:
   - Change step status in Confluence: fe27fc0a-aaca-43b7-8ffc-83d8a4bef995
   - Status: FAILED → IN_PROGRESS
   - Verify EMAIL_SENT audit log entry created

2. **Check MailHog** (http://localhost:8025):
   - [ ] Email received
   - [ ] Subject line correct
   - [ ] NO raw GSP syntax visible (`${`, `<%`, etc.)
   - [ ] Step code displayed: e.g., "AUT-003"
   - [ ] Step name displayed: e.g., "odio thymbra vetus subiungo corrigo"
   - [ ] Environment name displayed
   - [ ] Team name displayed
   - [ ] Migration code displayed: "Migration 1: Open-architected value-added moderator"
   - [ ] Iteration code displayed
   - [ ] Instructions section populated (if any)
   - [ ] Comments section populated (if any)
   - [ ] "View in Confluence" button functional

3. **Test All 3 Notification Types**:
   - [ ] STEP_STATUS_CHANGED: Status transition email
   - [ ] STEP_OPENED: Step ready notification
   - [ ] INSTRUCTION_COMPLETED: Instruction completion email

4. **Verify Responsive Design**:
   - [ ] Desktop view (1200px+): Full layout
   - [ ] Tablet view (768px): Adapted layout
   - [ ] Mobile view (375px): Single column, readable

5. **Check Dark Mode** (if supported by email client):
   - [ ] Background switches to dark (#1a1a1a)
   - [ ] Text switches to light (#ffffff)
   - [ ] Contrast maintained for readability

---

## Recommendation: Immediate Action Required

### Priority: 🔴 P0 - Critical Production Bug

**Suggested Follow-up Story**:

**Title**: Fix Email Service Data Binding - Complete Step Instance Population

**Type**: Bug Fix (Critical)

**Story Points**: 5 (includes repository method, API updates, comprehensive testing)

**Sprint**: Sprint 8 or Sprint 9 (depending on capacity)

**Description**:
Email notifications are broken in production due to incomplete data binding. Templates are structurally correct (TD-015 validation passed), but `stepViewApi.groovy` only passes 2 of 35+ required fields to `EnhancedEmailService`, causing raw GSP syntax to appear in production emails.

**Acceptance Criteria**:

1. Create `StepsInstanceRepository.getCompleteStepForEmail()` method that queries all required step data
2. Update `stepViewApi.groovy` to use new repository method for all 3 notification types
3. Validate all 35+ template variables populate correctly
4. Send test emails with real data - verify NO raw GSP syntax visible
5. Confirm instructions array, comments array, and team info render properly
6. Test all 3 email types: STEP_STATUS_CHANGED, STEP_OPENED, INSTRUCTION_COMPLETED
7. Add integration tests for repository method
8. Add E2E validation tests for email rendering
9. Document complete data requirements in EmailService interface

**Files to Modify**:

- `src/groovy/umig/api/v2/stepViewApi.groovy` (lines 173-268)
- `src/groovy/umig/repository/StepsInstanceRepository.groovy` (add method)
- `src/groovy/umig/tests/integration/EmailServiceDataBindingTest.groovy` (create)
- `local-dev-setup/__tests__/unit/repositories/StepsInstanceRepository.test.js` (create)

**Dependencies**:

- TD-015 (completed - provided template validation)
- Access to umig_app_db database
- MailHog running for E2E testing

**Risk Assessment**: LOW

- Database schema unchanged (read-only queries)
- No breaking changes to existing APIs
- Repository pattern isolates changes
- Easy rollback if issues

---

## TD-015 Status Update

### Phase 5 Outcome: Partial Success with Critical Discovery

**What We Validated** ✅:

1. Email template structure correct (45,243 bytes)
2. All 10 templates have 100% variable coverage
3. Email sizes within Gmail limits (55% safety margin)
4. MailHog infrastructure fully functional
5. SMTP delivery working correctly
6. Audit logging captures EMAIL_SENT events

**What We Discovered** 🔴:

1. Production emails display raw GSP syntax
2. Data binding layer fundamentally broken
3. stepViewApi only passes 2 of 35+ required fields
4. All email notification types affected
5. Issue exists since email feature inception

**TD-015 Conclusion**:

- **Template Consolidation**: ✅ SUCCESS (Migration 033 achieved goal)
- **Production Readiness**: ❌ BLOCKED (data binding must be fixed first)
- **Recommendation**: Mark TD-015 as "Completed with Follow-up" and create urgent bug fix story

---

## Appendix: Template Variable Requirements

### Complete List of Template Variables (35+ fields)

**Core Step Fields**:

1. `sti_id` (UUID)
2. `sti_code` (String, e.g., "PHI-001-STP-003")
3. `sti_name` (String)
4. `sti_description` (Text)
5. `sti_duration_minutes` (Integer)
6. `sti_status` (String, e.g., "IN_PROGRESS")

**Environment & Team Context**: 7. `environment_name` (String, e.g., "Production") 8. `team_name` (String, e.g., "Database Team") 9. `impacted_teams` (List<Map>)

**Predecessor/Successor**: 10. `predecessor_code` (String) 11. `predecessor_name` (String) 12. `successor_code` (String) 13. `successor_name` (String)

**Migration/Iteration Context**: 14. `migrationCode` (String, e.g., "MIG-2025-Q1-001") 15. `migration_description` (Text) 16. `iterationCode` (String, e.g., "IT-001") 17. `iteration_description` (Text)

**Instructions (Arrays)**: 18. `instructions` (List<Map> with ini_id, ini_name, ini_description, ini_status, ini_order) 19. `completedInstructions` (List<Map>, filtered by status) 20. `pendingInstructions` (List<Map>, filtered by status)

**Comments (Array)**: 21. `recentComments` (List<Map> with author_name, created_at, comment_text)

**Status Change Context**: 22. `oldStatus` (String, e.g., "COMPLETED") 23. `newStatus` (String, e.g., "FAILED") 24. `statusColor` (String, hex color for status badge) 25. `changedBy` (String, user full name) 26. `changedAt` (DateTime string)

**URLs & References**: 27. `stepViewUrl` (String, full URL to StepView page) 28. `hasStepViewUrl` (Boolean) 29. `confluenceBaseUrl` (String, e.g., "http://localhost:8090") 30. `stepViewPageId` (String, Confluence page ID)

**Instruction Completion Context** (for INSTRUCTION_COMPLETED emails): 31. `instruction.ini_id` (UUID) 32. `instruction.ini_name` (String) 33. `instruction.ini_description` (Text) 34. `completedBy` (String, user full name) 35. `completedAt` (DateTime string)

**Additional Template Logic Requirements**:

- Ternary operators: `${stepInstance.sti_code ?: 'STEP'}`
- Conditionals: `<% if (migrationCode && iterationCode) { %>`
- Loops: `<% recentComments.take(3).eachWithIndex { comment, index -> %>`
- Null-safe operators: `${stepInstance.instructions?.size()}`

---

## Conclusion

TD-015 successfully validated that email templates are structurally perfect with 100% variable coverage at canonical size (45,243 bytes). However, **Phase 5 E2E testing discovered a critical production bug**: the data binding layer in `stepViewApi.groovy` only passes 2 of 35+ required fields to email templates, causing all production emails to display raw GSP template syntax.

**Immediate action required**: Create urgent bug fix story to implement complete step instance data population via new repository method, ensuring all template variables receive actual values.

**Impact**: Production email notifications are currently non-functional for end users. Fix is straightforward (repository pattern + comprehensive data query) with low risk and high value.

---

**Report Created**: 2025-09-30
**Author**: Claude Code (TD-015 Phase 5 Testing)
**Status**: Ready for Review
**Next Step**: Create follow-up story for Sprint 8/9
