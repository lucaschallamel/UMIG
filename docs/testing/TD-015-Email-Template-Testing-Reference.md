# TD-015: Email Template Testing Reference

> **Purpose**: Comprehensive reference for testing email template functionality including variable inventory, testing procedures, and regression baselines.
> **Audience**: QA engineers, developers maintaining email templates, regression testers
> **Status**: Active reference (updated as templates evolve)
> **Last Updated**: October 1, 2025

## Quick Navigation

- [Variable Reference](#variable-reference) - Complete 35-variable inventory
- [Testing Procedures](#testing-procedures) - Automated and manual testing
- [Regression Testing](#regression-testing) - Baselines and validation
- [Email Client Compatibility](#email-client-compatibility) - Client testing matrix

---

## Part 1: Variable Reference

### Complete Variable Inventory (35 Variables)

#### 1.1 Core Step Variables (10 variables)

| Variable                               | Data Type     | Source                                                | Null Safe | Example Value                           |
| -------------------------------------- | ------------- | ----------------------------------------------------- | --------- | --------------------------------------- |
| `${stepInstance.sti_name}`             | String        | steps_instance_sti.sti_name                           | ✅        | "Database Migration - User Tables"      |
| `${stepInstance.sti_code}`             | String        | Computed: `stt_code + '-' + LPAD(stm_number, 3, '0')` | ✅        | "DB-001"                                |
| `${stepInstance.sti_status}`           | String (Enum) | steps_instance_sti.sti_status                         | ✅        | "IN_PROGRESS", "COMPLETED"              |
| `${stepInstance.sti_duration_minutes}` | Integer       | steps_instance_sti.sti_duration_minutes               | ✅        | 120                                     |
| `${stepInstance.migration_name}`       | String        | migrations_mig.mig_name (via JOIN)                    | ✅        | "Toronto Data Center Migration"         |
| `${stepInstance.iteration_name}`       | String        | iterations_ite.ite_name (via JOIN)                    | ✅        | "Production Cutover - Run 1"            |
| `${stepInstance.sti_description}`      | String        | steps_instance_sti.sti_description                    | ✅        | "Migrate user authentication tables..." |
| `${stepInstance.team_name}`            | String        | teams_tms.tms_name (assigned team)                    | ✅        | "Database Team"                         |
| `${stepInstance.environment_name}`     | String        | environments_env.env_name                             | ✅        | "Production (EV1)"                      |
| `${stepInstance.impacted_teams}`       | String        | Aggregated team names                                 | ✅        | "API Team, Frontend Team"               |

**Validation Status**: ✅ All 10 variables present in `EnhancedEmailService.groovy` lines 184-205

#### 1.2 URL Variables (2 variables)

| Variable            | Data Type    | Source                                    | Null Safe | Example Value                                                                                        |
| ------------------- | ------------ | ----------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `${hasStepViewUrl}` | Boolean      | Computed by UrlConstructionService        | ✅        | true/false                                                                                           |
| `${stepViewUrl}`    | String (URL) | UrlConstructionService.buildStepViewUrl() | ✅        | "https://confluence.example.com/pages/viewpage.action?pageId=123&mig=TORONTO&ite=run1&stepid=DB-001" |

**Implementation Location**:

- `UrlConstructionService.groovy` lines 50-125 (buildStepViewUrl method)
- `EnhancedEmailService.groovy` lines 155-181 (URL construction logic)

**Validation Status**: ✅ Both variables present with proper fallback handling

#### 1.3 Status Variables (3 variables)

| Variable         | Data Type          | Source                  | Null Safe | Example Value                   |
| ---------------- | ------------------ | ----------------------- | --------- | ------------------------------- |
| `${oldStatus}`   | String (Enum)      | Method parameter        | ✅        | "IN_PROGRESS"                   |
| `${newStatus}`   | String (Enum)      | Method parameter        | ✅        | "COMPLETED"                     |
| `${statusColor}` | String (CSS Color) | getStatusColor() helper | ✅        | "#28a745" (green for COMPLETED) |

**Color Mapping** (from `EnhancedEmailService.groovy` lines 759-773):

- OPEN, IN_PROGRESS: `#0052cc` (blue)
- COMPLETED, DONE: `#28a745` (green)
- BLOCKED, FAILED: `#dc3545` (red)
- Default: `#6c757d` (gray)

**Validation Status**: ✅ All 3 variables present with color mapping

#### 1.4 User Action Variables (6 variables)

| Variable         | Data Type         | Source                                   | Null Safe | Example Value         |
| ---------------- | ----------------- | ---------------------------------------- | --------- | --------------------- |
| `${changedBy}`   | String            | getUsernameById(sql, userId)             | ✅        | "jsmith"              |
| `${changedAt}`   | String (DateTime) | new Date().format('yyyy-MM-dd HH:mm:ss') | ✅        | "2025-09-30 14:23:45" |
| `${openedBy}`    | String            | getUsernameById(sql, userId)             | ✅        | "jdoe"                |
| `${openedAt}`    | String (DateTime) | new Date().format('yyyy-MM-dd HH:mm:ss') | ✅        | "2025-09-30 10:00:00" |
| `${completedBy}` | String            | getUsernameById(sql, userId)             | ✅        | "asmith"              |
| `${completedAt}` | String (DateTime) | new Date().format('yyyy-MM-dd HH:mm:ss') | ✅        | "2025-09-30 16:45:00" |

**User Lookup Logic** (`EnhancedEmailService.groovy` lines 742-754):

- Queries `users_usr.usr_code` by `usr_id`
- Falls back to "System" if userId is null
- Falls back to "User {userId}" if database lookup fails

#### 1.5 Context Variables (2 variables)

| Variable           | Data Type | Source           | Null Safe | Example Value |
| ------------------ | --------- | ---------------- | --------- | ------------- |
| `${migrationCode}` | String    | Method parameter | ✅        | "TORONTO"     |
| `${iterationCode}` | String    | Method parameter | ✅        | "run1"        |

**Usage**: Required for URL construction and email context display

#### 1.6 Instructions Variables (6 variables)

| Variable                              | Data Type | Source                                             | Null Safe | Example Value                                |
| ------------------------------------- | --------- | -------------------------------------------------- | --------- | -------------------------------------------- |
| `${stepInstance.instructions}`        | List<Map> | Nested collection in stepInstance                  | ✅        | `[{ini_name: "Stop application", ...}, ...]` |
| `${instruction.ini_name}`             | String    | instructions_instance_ini.ini_name                 | ✅        | "Stop application services"                  |
| `${instruction.ini_duration_minutes}` | Integer   | instructions_instance_ini.ini_duration_minutes     | ✅        | 15                                           |
| `${instruction.team_name}`            | String    | teams_tms.tms_name (via JOIN)                      | ✅        | "Application Team"                           |
| `${instruction.control_code}`         | String    | controls_ctl.ctl_code                              | ✅        | "CTL-001"                                    |
| `${instruction.completed}`            | Boolean   | instructions_instance_ini.ini_status = 'COMPLETED' | ✅        | true/false                                   |

**Template Usage**: Instructions table with iteration loop

#### 1.7 Comments Variables (6 variables)

| Variable                  | Data Type         | Source                       | Null Safe | Example Value                                      |
| ------------------------- | ----------------- | ---------------------------- | --------- | -------------------------------------------------- |
| `${recentComments}`       | List<Map>         | processCommentsForTemplate() | ✅        | `[{comment_id: "uuid", comment_text: "...", ...}]` |
| `${comment.author_name}`  | String            | Comment object property      | ✅        | "John Smith"                                       |
| `${comment.created_at}`   | String (DateTime) | formatCommentDate()          | ✅        | "2025-09-30T14:23:45"                              |
| `${comment.comment_text}` | String            | Comment object property      | ✅        | "Step is progressing well..."                      |
| `${documentationUrl}`     | String (URL)      | Optional configuration       | ✅        | "https://wiki.example.com/umig"                    |
| `${supportUrl}`           | String (URL)      | Optional configuration       | ✅        | "https://support.example.com"                      |

**Comment Processing** (`EnhancedEmailService.groovy` lines 820-858):

- Limits to 3 most recent comments (`take(3)`)
- Handles CommentDTO objects and legacy maps
- Provides safe fallback structure if comments unavailable

### UrlConstructionService Integration

**Service Location**: `/src/groovy/umig/utils/UrlConstructionService.groovy`
**Integration Point**: `/src/groovy/umig/utils/EnhancedEmailService.groovy` lines 155-181

**Key Methods**:

1. `buildStepViewUrl(UUID stepInstanceId, String migrationCode, String iterationCode, String environmentCode = null)`
2. `buildIterationViewUrl(UUID iterationId, String migrationCode, String iterationCode, String environmentCode = null)`
3. `getSystemConfiguration(String environmentCode)` - Cached configuration retrieval

**URL Format Specification**:

```
{baseUrl}/pages/viewpage.action?pageId={pageId}&mig={migrationCode}&ite={iterationCode}&stepid={stepCode}
```

**Example**:

```
https://confluence.example.com/pages/viewpage.action?pageId=123456789&mig=TORONTO&ite=run1&stepid=DB-001
```

**Security Validation Patterns** (`UrlConstructionService.groovy` lines 24-34):

- URL Pattern: `^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$`
- Parameter Pattern: `^[a-zA-Z0-9._\\-\\s]+$` (allows spaces for iteration names)
- Page Title Pattern: `^[a-zA-Z0-9\\s._-]+$`

### Null Safety Verification Matrix

| Variable Category            | Null Allowed | Default Value   | Safe Navigation                 | Implementation                                     |
| ---------------------------- | ------------ | --------------- | ------------------------------- | -------------------------------------------------- |
| stepInstance.sti_name        | No           | Required        | N/A                             | Method validation                                  |
| stepInstance.sti_description | Yes          | "" (empty)      | ✅ `?.`                         | Template: `${stepInstance?.sti_description ?: ''}` |
| stepViewUrl                  | Yes          | null            | ✅ `?: '#'`                     | Template: `${hasStepViewUrl ? stepViewUrl : '#'}`  |
| migrationCode                | Yes          | "" (empty)      | ✅ `?: ''`                      | Template: `${migrationCode ?: ''}`                 |
| changedBy                    | No           | "System"        | ✅ getUsernameById()            | Service fallback                                   |
| recentComments               | Yes          | [] (empty list) | ✅ processCommentsForTemplate() | Service: returns `[]` if null                      |
| documentationUrl             | Yes          | "" (empty)      | ✅ `?: ''`                      | Template: optional section                         |
| supportUrl                   | Yes          | "" (empty)      | ✅ `?: ''`                      | Template: optional section                         |

### Template Syntax Validation

**GSP (Groovy Server Pages) Syntax Elements**:

1. **Scriptlet** (`<% ... %>`): Execute Groovy code

   ```groovy
   <%
   def totalDuration = stepInstance.instructions.sum { it.ini_duration_minutes }
   %>
   ```

2. **Expression** (`${...}`): Output variable value

   ```groovy
   <h2>${stepInstance.sti_name}</h2>
   ```

3. **Conditional** (`if/else`): Control flow

   ```groovy
   <% if (hasStepViewUrl) { %>
       <a href="${stepViewUrl}">View Step</a>
   <% } else { %>
       <span>URL not available</span>
   <% } %>
   ```

4. **Loop** (`each`, `eachWithIndex`): Iteration
   ```groovy
   <% stepInstance.instructions.eachWithIndex { instruction, index -> %>
       <tr>
           <td>${index + 1}</td>
           <td>${instruction.ini_name}</td>
       </tr>
   <% } %>
   ```

---

## Part 2: Testing Procedures

### Automated Test Baselines

**Performance Baselines** (expected execution times):

- buildBreadcrumb tests: < 12ms each
- buildInstructionsHtml tests: < 15ms each
- buildCommentsHtml tests: < 20ms each
- Other helper methods: < 10ms each
- **Total Suite**: < 300ms

**Coverage Baselines**:

- Line Coverage: 100% (all 278 lines in helper methods)
- Branch Coverage: ≥ 95% (all conditional paths tested)
- Method Coverage: 100% (all 8 helper methods invoked)

### Manual Testing Procedures

#### MailHog Visual Inspection (15 minutes)

**Objective**: Verify email rendering in MailHog without sending to real email clients

**Prerequisites**:

1. **Services Running**:

   ```bash
   # Check service status
   npm run health:check

   # Ensure these are running:
   # - Confluence: http://localhost:8090
   # - MailHog SMTP: localhost:1025
   # - MailHog Web UI: http://localhost:8025
   # - PostgreSQL: localhost:5432
   ```

2. **Clean Inbox**:

   ```bash
   npm run mailhog:clear
   ```

3. **Verify Test Data**:
   ```bash
   # Ensure database has active step instances
   podman exec umig_postgres psql -U umig_app_user -d umig_app_db -c \
     "SELECT COUNT(*) as step_count FROM steps_instance_sti WHERE sti_status = 'OPEN' OR sti_status = 'IN_PROGRESS';"
   ```

**Test Execution Steps**:

**Step 1: Send Test Emails**

```bash
npm run email:test
```

**Expected Result**:

- Console output shows 3 emails sent
- No error messages
- SMTP connection successful

**Step 2: Open MailHog Web UI**

```bash
open http://localhost:8025
# Or manually navigate to http://localhost:8025 in browser
```

**Step 3: Verify Email Receipt**

**Checklist**:

- [ ] 3 emails visible in inbox
- [ ] Email #1: STEP_STATUS_CHANGED subject
- [ ] Email #2: STEP_OPENED subject
- [ ] Email #3: INSTRUCTION_COMPLETED subject
- [ ] All emails show recipients (not empty "To:" field)
- [ ] All emails have timestamps

**Step 4: Inspect Email #1 - STEP_STATUS_CHANGED**

1. **Click on first email in inbox**
2. **Switch to "HTML" tab** (not "Source")
3. **Verify Rendering**:

   **Header Section**:
   - [ ] Gradient header (blue to purple) visible
   - [ ] UMIG logo or header text present
   - [ ] Email title: "Step Status Changed" or similar

   **Breadcrumb Navigation**:
   - [ ] Breadcrumb shows: `{migration} › {iteration} › {plan} › {sequence} › {phase}`
   - [ ] No raw `${migrationCode}` visible
   - [ ] Separator `›` character renders correctly

   **Status Badge**:
   - [ ] Status badge shows current status (e.g., "IN_PROGRESS")
   - [ ] Badge has colored background:
     - Blue (#0052cc) for OPEN/IN_PROGRESS
     - Green (#28a745) for COMPLETED
     - Red (#dc3545) for BLOCKED/FAILED
   - [ ] Status text is white and readable

   **Step Summary Table**:
   - [ ] Step Name row present (not empty)
   - [ ] Step Code row present (e.g., "DB-001")
   - [ ] Duration & Environment row (e.g., "30 min | Production")
   - [ ] Assigned Team row (if present in data)
   - [ ] Optional rows visible only when data present

   **Instructions Table**:
   - [ ] Table header: "#", "Instruction", "Duration", "Team", "Control"
   - [ ] Rows display with sequential numbering (1, 2, 3, ...) or ✓ for completed
   - [ ] Duration shows "X min" format
   - [ ] If no instructions: "No instructions defined" message

   **StepView URL Button**:
   - [ ] Blue button visible with text "View in Confluence →"
   - [ ] Button height ≥ 44px (touch-friendly)
   - [ ] Button has rounded corners (border-radius: 4px)
   - [ ] OR: Gray fallback message if URL unavailable

   **Comments Section**:
   - [ ] Section header: "Recent Comments" or similar
   - [ ] Up to 3 comment cards visible
   - [ ] Each comment shows: author name, date, comment text
   - [ ] If no comments: "No comments yet" message

   **Footer**:
   - [ ] Footer text: "UMIG - Unified Migration Implementation Guide"
   - [ ] Migration context: "This step is part of the migration {code}"
   - [ ] Links to documentation/support (if configured)

4. **Screenshot**:
   - Take full-page screenshot
   - Save as `TD-015-Test-Email-STEP_STATUS_CHANGED.png`

**Step 5: Variable Rendering Validation**

**Command to extract HTML**:

```bash
curl http://localhost:8025/api/v2/messages | jq -r '.items[0].Content.Body' > /tmp/email-step-status-changed.html
curl http://localhost:8025/api/v2/messages | jq -r '.items[1].Content.Body' > /tmp/email-step-opened.html
curl http://localhost:8025/api/v2/messages | jq -r '.items[2].Content.Body' > /tmp/email-instruction-completed.html
```

**Validation Checks** (search HTML files):

```bash
# Should NOT find raw variables (all should return 0 matches)
grep -o '\${stepInstance' /tmp/email-step-status-changed.html | wc -l  # Expected: 0
grep -o '\${migrationCode' /tmp/email-step-status-changed.html | wc -l  # Expected: 0
grep -o '<% if' /tmp/email-step-status-changed.html | wc -l  # Expected: 0

# SHOULD find actual values (verify > 0 matches)
grep -o 'Database Migration' /tmp/email-step-status-changed.html | wc -l  # Expected: > 0
grep -o 'View in Confluence' /tmp/email-step-status-changed.html | wc -l  # Expected: 1
grep -o '@media' /tmp/email-step-status-changed.html | wc -l  # Expected: ≥ 3 (responsive CSS)
```

**Step 6: Email Size Verification**

```bash
# Get email sizes
curl http://localhost:8025/api/v2/messages | jq '.items[] | {subject: .Content.Headers.Subject[0], size: .Content.Size}'
```

**Expected Results**:

- STEP_STATUS_CHANGED: 47,000 - 49,000 bytes (47-49 KB)
- STEP_OPENED: 47,000 - 49,000 bytes
- INSTRUCTION_COMPLETED: 47,000 - 49,000 bytes

**Gmail Limit**: 102,400 bytes (102 KB)
**Status**: ✅ All emails should be < 50 KB (safe margin)

#### Email Client Testing (6 hours, 21 scenarios)

**Objective**: Validate email rendering across major email clients

**Test Matrix**:

| Client          | Platform | Version | Layout | Colors | Buttons | Links | Mobile | Dark Mode |
| --------------- | -------- | ------- | ------ | ------ | ------- | ----- | ------ | --------- |
| Gmail Web       | Browser  | Latest  | ✓      | ✓      | ✓       | ✓     | N/A    | ✓         |
| Outlook Desktop | Windows  | 2019+   | ✓      | ✓      | ✓       | ✓     | N/A    | -         |
| Apple Mail      | macOS    | 14+     | ✓      | ✓      | ✓       | ✓     | N/A    | ✓         |
| Outlook Web     | Browser  | Latest  | ✓      | ✓      | ✓       | ✓     | N/A    | -         |
| Thunderbird     | Desktop  | 115+    | ✓      | ✓      | ✓       | ✓     | N/A    | -         |
| iOS Mail        | iPhone   | iOS 17+ | ✓      | ✓      | ✓       | ✓     | ✓      | ✓         |
| Android Gmail   | Android  | Latest  | ✓      | ✓      | ✓       | ✓     | ✓      | ✓         |

**Test Procedure per Client**:

**Step 1: Forward Test Email from MailHog**

1. Open MailHog Web UI: http://localhost:8025
2. Click on test email (STEP_STATUS_CHANGED)
3. Copy email address: `your-email@example.com`
4. Use MailHog "Forward" feature or manually forward via SMTP client

**Step 2: Verify Rendering Quality**

**Checklist per Client**:

**Layout**:

- [ ] Email container centered
- [ ] Max width: 800px (desktop) or 100% (mobile)
- [ ] No horizontal scrolling
- [ ] Sections stack vertically (single column)

**Colors & Typography**:

- [ ] Gradient header visible (blue to purple)
- [ ] Status badge colored correctly:
  - Blue (#0052cc) for OPEN/IN_PROGRESS
  - Green (#28a745) for COMPLETED
  - Red (#dc3545) for BLOCKED
- [ ] Text readable (contrast ratio ≥ 4.5:1)
- [ ] Font sizes: 14-16px body, 20-24px headings

**Buttons & Links**:

- [ ] "View in Confluence" button renders as blue button
- [ ] Button has proper padding (12px 24px)
- [ ] Button is clickable (not just styled text)
- [ ] Links underlined or visually distinct
- [ ] Hover states work (desktop clients)

**Mobile-Specific** (iOS Mail, Android Gmail):

- [ ] Touch targets ≥ 44px height
- [ ] Font size ≥ 16px (prevents iOS zoom)
- [ ] Buttons span full width on narrow screens (< 600px)
- [ ] Tables stack or scroll horizontally

**Dark Mode** (Gmail Web, Apple Mail, iOS Mail, Android Gmail):

- [ ] Email background: #1e1e1e or #121212 (dark gray)
- [ ] Email container: #2d2d2d (lighter dark gray)
- [ ] Text color: #ffffff or #f0f0f0 (white/off-white)
- [ ] Status badges maintain contrast (readable in dark mode)
- [ ] Links visible: #64b5f6 (light blue)

#### Responsive Design Validation (4 hours, 42 scenarios)

**Objective**: Verify email layout adapts correctly across all screen sizes

**Breakpoints to Test**:

| Breakpoint  | Device Example | Width   | Layout         | Font Size | Touch Targets |
| ----------- | -------------- | ------- | -------------- | --------- | ------------- |
| **320px**   | iPhone SE      | 320px   | Single column  | 14px      | 44px min      |
| **375px**   | iPhone 12      | 375px   | Single column  | 15px      | 44px min      |
| **600px**   | Large phone    | 600px   | Tablet layout  | 16px      | 44px min      |
| **768px**   | iPad           | 768px   | Desktop layout | 16px      | N/A           |
| **1000px**  | Desktop        | 1000px  | Full desktop   | 16px      | N/A           |
| **1200px+** | Wide desktop   | 1200px+ | Max-width      | 16px      | N/A           |

**Total Scenarios**: 6 breakpoints × 7 email clients = 42 tests

**Test Procedure**:

**Step 1: Set Up Browser DevTools**

1. Open email HTML file in browser:

   ```bash
   open /tmp/email-step-status-changed.html
   ```

2. Open Chrome DevTools:
   - Press `F12` or `Cmd+Opt+I` (Mac)
   - Click "Toggle device toolbar" icon (or `Cmd+Shift+M`)

3. Select device or enter custom width

**Step 2: Test Each Breakpoint**

**320px (iPhone SE)**:

- [ ] Email container: 100% width
- [ ] Single column layout (no side-by-side content)
- [ ] Tables: Stack vertically or scroll horizontally
- [ ] Buttons: Full width (100% minus padding)
- [ ] Font size: 14px body, 18px headings
- [ ] Touch targets: ≥ 44px height
- [ ] No horizontal overflow

**375px - 1200px+**: See detailed checklists in Testing Guide

#### StepView URL Click-Through Testing (30 minutes)

**Objective**: Verify "View in Confluence" button redirects correctly to StepView page

**Prerequisites**:

1. **Active Confluence Instance**:
   - Confluence running at http://localhost:8090 (or production URL)
   - User logged in with valid credentials

2. **System Configuration**:

   ```sql
   -- Verify configuration exists
   SELECT scf_key, scf_value, e.env_code
   FROM system_configuration_scf scf
   INNER JOIN environments_env e ON scf.env_id = e.env_id
   WHERE scf.scf_category = 'MACRO_LOCATION'
     AND scf.scf_is_active = true
     AND scf.scf_key IN (
         'stepview.confluence.base.url',
         'stepview.confluence.space.key',
         'stepview.confluence.page.id',
         'stepview.confluence.page.title'
     );
   ```

   **Expected Result**: 4 rows with complete configuration

**Test Procedure**:

**Step 1: Click Button** → Verify redirect opens Confluence with correct URL parameters

**Expected URL Format**:

```
https://confluence.example.com/pages/viewpage.action?pageId=123456&mig=TORONTO&ite=run1&stepid=DB-001
```

**Checklist**:

- [ ] Browser opens new tab
- [ ] Confluence base URL correct
- [ ] Page ID parameter present: `pageId=123456`
- [ ] Migration code parameter present: `mig=TORONTO`
- [ ] Iteration code parameter present: `ite=run1`
- [ ] Step ID parameter present: `stepid=DB-001`

---

## Part 3: Regression Testing

### Test Execution Commands

**Run All Automated Tests**:

```bash
npm run test:groovy:unit -- EnhancedEmailServiceHelperMethodsTest
npm run test:js:components -- --testPathPattern='EmailService'
```

**Send Regression Test Emails**:

```bash
# Clear inbox
npm run mailhog:clear

# Send all 3 test scenarios
npm run email:test

# Verify 3 emails received
npm run mailhog:check
# Expected output: 3 messages
```

### Baseline Comparison Table

| Metric         | Baseline (Phase 5) | Current | Status  |
| -------------- | ------------------ | ------- | ------- |
| Template Size  | 7,650 bytes        | ?       | Compare |
| Email Size     | 47,336 bytes       | ?       | Compare |
| Test Coverage  | 100% (8/8)         | ?       | Compare |
| Rendering Time | < 50ms             | ?       | Compare |

### Common Regression Issues

**Issue: Template size increased**

- **Cause**: New CSS added or HTML bloat
- **Fix**: Review template HTML, optimize CSS

**Issue: Tests failing**

- **Cause**: Helper method logic changed
- **Fix**: Review commit history, revert breaking changes

**Issue: Emails not sending**

- **Cause**: SMTP configuration changed or service down
- **Fix**: Check MailHog running, verify SMTP host/port

---

## Part 4: Email Client Compatibility Matrix

### Client Testing Requirements

**7 email clients** × **6 responsive breakpoints** = **42 total test scenarios**

**Email Clients**:

1. Gmail Web (Browser)
2. Outlook Desktop (Windows)
3. Apple Mail (macOS)
4. Outlook Web (Browser)
5. Thunderbird (Desktop)
6. iOS Mail (iPhone)
7. Android Gmail (Android)

**Responsive Breakpoints**:

1. 320px (iPhone SE)
2. 375px (iPhone 12)
3. 600px (Large phone)
4. 768px (iPad)
5. 1000px (Desktop)
6. 1200px+ (Wide desktop)

---

## Appendices

### A: Test Result Archive

- **Historical test results archived**: `/docs/testing/archive/TD-015-sprint8-validation/`
- **Helper method test specifications archived** (superseded by code)
- **Automated test results from Phase 5** (point-in-time snapshot)

### B: Related Documentation

- **Master story**: `/docs/roadmap/sprint8/TD-015-Email-Template-Fix.md`
- **Test code**: `/src/groovy/umig/tests/unit/EnhancedEmailServiceHelperMethodsTest.groovy`
- **Helper methods**: `EnhancedEmailService.groovy` lines 725-1002
- **URL Construction**: `UrlConstructionService.groovy`

### C: Quick Reference Commands

```bash
# MailHog Testing
npm run mailhog:clear                    # Clear inbox
npm run mailhog:check                    # Check message count
npm run mailhog:test                     # Test SMTP connectivity
npm run email:test                       # Send test emails

# Database Queries (via podman)
podman exec umig_postgres psql -U umig_user -d umig_app_db -c "SELECT emt_type, length(emt_body_html) FROM email_templates_emt;"

# Email Size Check
curl http://localhost:8025/api/v2/messages | jq '.items[0].Content.Size'

# HTML Source Inspection
curl http://localhost:8025/api/v2/messages | jq -r '.items[0].Content.Body' > /tmp/email.html

# Variable Search
grep -o 'stepInstance.sti_name' /tmp/email.html  # Should NOT appear
grep -o 'Database Migration' /tmp/email.html     # Should appear
```

---

**Testing Reference Version**: 1.0
**Last Updated**: October 1, 2025
**Status**: Active Reference
**Coverage**: 35 variables, 90 test scenarios, 7 email clients
