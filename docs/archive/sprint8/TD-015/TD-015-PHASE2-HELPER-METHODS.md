# TD-015 Phase 2: Helper Method Design & Specification

**Date**: September 30, 2025
**Sprint**: Sprint 8
**Status**: Implementation Ready
**Priority**: High

---

## Executive Summary

Design specification for 8 pre-processing helper methods that will eliminate all GSP scriptlets from email templates. Each method is pure, stateless, and easily testable.

**Goal**: Process complex conditionals and loops in Groovy code BEFORE template rendering, allowing templates to use simple `${}` variable substitution only.

---

## Helper Method Specifications

### Method 1: buildBreadcrumb (HIGH PRIORITY)

**Purpose**: Construct hierarchical breadcrumb navigation string from migration/iteration context

**Signature**:

```groovy
/**
 * Build hierarchical breadcrumb navigation string
 * Handles 6 nested conditionals from template lines 19-30
 *
 * @param migrationCode Migration identifier (e.g., "MIG-2025-Q1")
 * @param iterationCode Iteration identifier (e.g., "ITER-001")
 * @param stepInstance Map containing step hierarchy (plan_name, sequence_name, phase_name)
 * @return Formatted breadcrumb string with › separators
 */
private static String buildBreadcrumb(String migrationCode, String iterationCode, Map stepInstance)
```

**Logic**:

```groovy
// Primary path: Use codes if available
if (migrationCode && iterationCode) {
    def parts = [migrationCode, iterationCode]

    // Add optional hierarchy levels
    if (stepInstance.plan_name) parts.add(stepInstance.plan_name)
    if (stepInstance.sequence_name) parts.add(stepInstance.sequence_name)
    if (stepInstance.phase_name) parts.add(stepInstance.phase_name)

    return parts.join(' › ')
}

// Fallback path: Use full names from stepInstance
else {
    String migration = stepInstance.migration_name ?: 'Migration'
    String iteration = stepInstance.iteration_name ?: 'Iteration'
    return "${migration} › ${iteration}"
}
```

**Input Examples**:

```groovy
// Example 1: Full hierarchy
buildBreadcrumb('MIG-2025-Q1', 'ITER-001', [
    plan_name: 'Database Upgrade',
    sequence_name: 'Pre-Migration',
    phase_name: 'Backup'
])
// Output: "MIG-2025-Q1 › ITER-001 › Database Upgrade › Pre-Migration › Backup"

// Example 2: Minimal hierarchy
buildBreadcrumb('MIG-2025-Q1', 'ITER-001', [:])
// Output: "MIG-2025-Q1 › ITER-001"

// Example 3: Fallback (no codes)
buildBreadcrumb(null, null, [
    migration_name: 'Cloud Migration Project',
    iteration_name: 'Phase 1 - Assessment'
])
// Output: "Cloud Migration Project › Phase 1 - Assessment"
```

**Edge Cases**:

- Null migration/iteration codes → fallback to names
- Missing optional hierarchy levels → skip gracefully
- All values null → "Migration › Iteration"

---

### Method 2: buildInstructionsHtml (HIGH PRIORITY)

**Purpose**: Generate complete HTML table rows for instructions list

**Signature**:

```groovy
/**
 * Build instructions table HTML from instructions list
 * Handles loop with conditional icons (template lines 145-158)
 *
 * @param instructions List of instruction maps (ini_name, ini_duration_minutes, team_name, control_code, completed)
 * @return HTML string with <tr> rows for each instruction
 */
private static String buildInstructionsHtml(List instructions)
```

**Logic**:

```groovy
// Empty collection fallback
if (!instructions || instructions.isEmpty()) {
    return '<tr><td colspan="5" style="text-align:center; color:#6c757d; padding:20px;">No instructions defined for this step.</td></tr>'
}

def html = new StringBuilder()
instructions.eachWithIndex { instruction, index ->
    // Status icon: ✓ if completed, otherwise show 1-based index number
    def statusIcon = instruction.completed ? '✓' : (index + 1).toString()

    // Fallback values for missing data
    def name = instruction.ini_name ?: instruction.description ?: "Instruction ${index + 1}"
    def duration = instruction.ini_duration_minutes ? "${instruction.ini_duration_minutes} min" : '-'
    def team = instruction.team_name ?: '-'
    def control = instruction.control_code ?: '-'

    html.append("""
        <tr>
            <td style="text-align:center; font-weight:bold; color:${instruction.completed ? '#28a745' : '#6c757d'};">${statusIcon}</td>
            <td>${name}</td>
            <td>${duration}</td>
            <td>${team}</td>
            <td>${control}</td>
        </tr>
    """)
}

return html.toString()
```

**Input Examples**:

```groovy
// Example 1: Standard instructions
buildInstructionsHtml([
    [ini_name: 'Backup database', ini_duration_minutes: 30, team_name: 'DBA Team', control_code: 'CTRL-001', completed: true],
    [ini_name: 'Stop application', ini_duration_minutes: 5, team_name: 'App Team', control_code: 'CTRL-002', completed: false]
])
// Output: Two <tr> rows, first with ✓, second with "2"

// Example 2: Empty list
buildInstructionsHtml([])
// Output: Single <tr> with colspan message

// Example 3: Missing data
buildInstructionsHtml([
    [ini_name: null, ini_duration_minutes: null, team_name: null, control_code: null, completed: false]
])
// Output: Single <tr> with fallback values ("-" for missing fields)
```

**Edge Cases**:

- Empty list → message row
- Null collection → message row
- Missing fields → fallback to "-" or generated values
- Completed boolean → ✓ vs index number

---

### Method 3: buildCommentsHtml (HIGH PRIORITY)

**Purpose**: Generate HTML comment cards (limited to 3 most recent)

**Signature**:

```groovy
/**
 * Build recent comments HTML (max 3 items)
 * Handles loop with index-based margin (template lines 185-197)
 *
 * @param comments List of comment maps (author_name, created_at, comment_text)
 * @return HTML string with comment card divs (max 3)
 */
private static String buildCommentsHtml(List comments)
```

**Logic**:

```groovy
// Empty collection fallback
if (!comments || comments.isEmpty()) {
    return '<p style="color:#6c757d; text-align:center; padding:20px;">No comments yet. Be the first to add your insights!</p>'
}

def html = new StringBuilder()
comments.take(3).eachWithIndex { comment, index ->
    // First comment has no top margin, others have 12px
    def marginTop = index == 0 ? '0' : '12px'

    // Fallback values
    def author = comment.author_name ?: 'Anonymous'
    def date = comment.created_at ?: 'Recent'
    def text = comment.comment_text ?: '(No comment text)'

    html.append("""
        <div class="comment-card" style="margin: ${marginTop} 0; padding: 12px; background: #f8f9fa; border-left: 3px solid #0052cc;">
            <div class="comment-author" style="font-weight: bold; color: #0052cc; margin-bottom: 4px;">${author}</div>
            <div class="comment-date" style="font-size: 12px; color: #6c757d; margin-bottom: 8px;">${date}</div>
            <div class="comment-text" style="color: #212529;">${text}</div>
        </div>
    """)
}

return html.toString()
```

**Input Examples**:

```groovy
// Example 1: Multiple comments (limited to 3)
buildCommentsHtml([
    [author_name: 'John Doe', created_at: '2025-09-30 10:15', comment_text: 'Backup completed successfully'],
    [author_name: 'Jane Smith', created_at: '2025-09-30 10:20', comment_text: 'Verified data integrity'],
    [author_name: 'Bob Wilson', created_at: '2025-09-30 10:25', comment_text: 'Ready to proceed'],
    [author_name: 'Alice Brown', created_at: '2025-09-30 10:30', comment_text: 'This should not appear'] // Ignored (4th item)
])
// Output: Three comment cards with progressive margins

// Example 2: Empty list
buildCommentsHtml([])
// Output: Centered "No comments yet" message

// Example 3: Missing data
buildCommentsHtml([
    [author_name: null, created_at: null, comment_text: null]
])
// Output: Single comment card with fallback values
```

**Edge Cases**:

- Empty list → message paragraph
- Null collection → message paragraph
- More than 3 items → take only first 3
- Missing fields → fallback values (Anonymous, Recent, No text)
- Index-based margin → first comment has 0, others have 12px

---

### Method 4: buildDurationAndEnvironment

**Purpose**: Combine duration and environment with smart separator logic

**Signature**:

```groovy
/**
 * Build duration and environment display string
 * Handles 3 conditionals with smart separator (template lines 67-76)
 *
 * @param stepInstance Map containing sti_duration_minutes and environment_name
 * @return Formatted string: "30 min | Production" or "30 min" or "Production" or ""
 */
private static String buildDurationAndEnvironment(Map stepInstance)
```

**Logic**:

```groovy
def parts = []

// Add duration if present
if (stepInstance.sti_duration_minutes) {
    parts.add("${stepInstance.sti_duration_minutes} min")
}

// Add environment if present
if (stepInstance.environment_name) {
    parts.add(stepInstance.environment_name)
}

// Join with " | " separator only if both exist
return parts.join(' | ')
```

**Input Examples**:

```groovy
// Example 1: Both duration and environment
buildDurationAndEnvironment([sti_duration_minutes: 30, environment_name: 'Production'])
// Output: "30 min | Production"

// Example 2: Duration only
buildDurationAndEnvironment([sti_duration_minutes: 45, environment_name: null])
// Output: "45 min"

// Example 3: Environment only
buildDurationAndEnvironment([sti_duration_minutes: null, environment_name: 'Development'])
// Output: "Development"

// Example 4: Neither present
buildDurationAndEnvironment([:])
// Output: ""
```

**Edge Cases**:

- Both present → separated by " | "
- One present → just that value
- Neither present → empty string
- Zero duration → treated as falsy, not included

---

### Method 5: buildStepViewLinkHtml

**Purpose**: Generate complete StepView link block or fallback message

**Signature**:

```groovy
/**
 * Build StepView link HTML or fallback message
 * Handles conditional URL block (template lines 173-182)
 *
 * @param stepViewUrl Confluence StepView URL (or null if unavailable)
 * @param hasStepViewUrl Boolean flag indicating URL availability
 * @return HTML string with clickable link or informational message
 */
private static String buildStepViewLinkHtml(String stepViewUrl, boolean hasStepViewUrl)
```

**Logic**:

```groovy
// Primary path: URL available
if (hasStepViewUrl && stepViewUrl) {
    return """
        <div style="margin: 20px 0; text-align: center;">
            <a href="${stepViewUrl}" class="btn-primary" style="
                display: inline-block;
                padding: 12px 24px;
                background-color: #0052cc;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
            ">
                🔗 View in Confluence
            </a>
            <p style="margin-top: 12px; color: #6c757d; font-size: 14px;">
                Click to view this step with live updates and collaboration features
            </p>
        </div>
    """
}

// Fallback path: URL unavailable
else {
    return """
        <div style="margin: 20px 0; padding: 16px; background: #f8f9fa; border-radius: 4px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #495057;">📌 Access Information:</p>
            <p style="margin: 0; color: #6c757d;">
                Direct link is not available. Please access the UMIG system in Confluence
                to view the most current step details and collaborate with your team.
            </p>
        </div>
    """
}
```

**Input Examples**:

```groovy
// Example 1: Valid URL
buildStepViewLinkHtml('https://confluence.company.com/pages/123456', true)
// Output: Clickable button with link

// Example 2: No URL (null)
buildStepViewLinkHtml(null, false)
// Output: Informational message box

// Example 3: Flag false even with URL (defensive)
buildStepViewLinkHtml('https://confluence.company.com/pages/123456', false)
// Output: Informational message box (flag takes precedence)
```

**Edge Cases**:

- URL present and flag true → clickable link
- URL null or flag false → fallback message
- Empty string URL → fallback message
- Both checks required for safety

---

### Method 6: buildOptionalField (REUSABLE)

**Purpose**: Generate optional table row (used 11 times in templates)

**Signature**:

```groovy
/**
 * Build optional table row HTML (reusable utility)
 * Used for team, impacted_teams, predecessor, environment, etc.
 *
 * @param label Row label (e.g., "Team", "Predecessor")
 * @param value Field value (or null if not present)
 * @return HTML <tr> string or empty string if value is null/empty
 */
private static String buildOptionalField(String label, String value)
```

**Logic**:

```groovy
// Only generate row if value is present
if (value && value.trim()) {
    return """
        <tr>
            <td style="font-weight: bold; color: #495057; width: 180px;">${label}</td>
            <td style="color: #212529;">${value}</td>
        </tr>
    """
} else {
    return '' // Return empty string to hide row
}
```

**Input Examples**:

```groovy
// Example 1: Present value
buildOptionalField('Team', 'Database Administration Team')
// Output: "<tr><td>Team</td><td>Database Administration Team</td></tr>"

// Example 2: Null value
buildOptionalField('Impacted Teams', null)
// Output: ""

// Example 3: Empty string
buildOptionalField('Predecessor', '')
// Output: ""

// Example 4: Whitespace only
buildOptionalField('Environment', '   ')
// Output: ""
```

**Usage Pattern**:

```groovy
// In notification methods, pre-process all optional fields:
variables = [
    teamRowHtml: buildOptionalField('Team', stepInstance.team_name),
    impactedTeamsRowHtml: buildOptionalField('Impacted Teams', stepInstance.impacted_teams),
    predecessorRowHtml: buildOptionalField('Predecessor', "${stepInstance.predecessor_code} ${stepInstance.predecessor_name}"),
    environmentRowHtml: buildOptionalField('Environment', stepInstance.environment_name),
    phaseRowHtml: buildOptionalField('Phase', stepInstance.phase_name),
    durationRowHtml: buildOptionalField('Duration', stepInstance.sti_duration_minutes ? "${stepInstance.sti_duration_minutes} min" : null)
]
```

**Edge Cases**:

- Null value → empty string (row hidden)
- Empty string → empty string (row hidden)
- Whitespace only → empty string (row hidden)
- Valid value → formatted table row

---

### Method 7: buildStatusBadge

**Purpose**: Generate status badge HTML with dynamic color

**Signature**:

```groovy
/**
 * Build status badge HTML with color based on status
 *
 * @param status Step status string (e.g., "OPEN", "COMPLETED", "BLOCKED")
 * @return HTML span with colored badge
 */
private static String buildStatusBadge(String status)
```

**Logic**:

```groovy
// Determine badge color based on status
String color
String displayText = status ?: 'UNKNOWN'

switch (status?.toUpperCase()) {
    case 'OPEN':
    case 'IN_PROGRESS':
        color = '#0052cc' // Blue
        break
    case 'COMPLETED':
    case 'DONE':
        color = '#28a745' // Green
        break
    case 'BLOCKED':
    case 'FAILED':
        color = '#dc3545' // Red
        break
    case 'PENDING':
    case 'WAITING':
        color = '#ffc107' // Yellow/Orange
        break
    default:
        color = '#6c757d' // Gray
        break
}

return """
    <span class="status-badge" style="
        display: inline-block;
        padding: 6px 12px;
        background-color: ${color};
        color: white;
        border-radius: 4px;
        font-weight: bold;
        font-size: 14px;
    ">
        ${displayText}
    </span>
"""
```

**Input Examples**:

```groovy
// Example 1: Completed status
buildStatusBadge('COMPLETED')
// Output: Green badge with "COMPLETED"

// Example 2: In progress
buildStatusBadge('IN_PROGRESS')
// Output: Blue badge with "IN_PROGRESS"

// Example 3: Blocked
buildStatusBadge('BLOCKED')
// Output: Red badge with "BLOCKED"

// Example 4: Unknown status
buildStatusBadge('CUSTOM_STATUS')
// Output: Gray badge with "CUSTOM_STATUS"

// Example 5: Null status
buildStatusBadge(null)
// Output: Gray badge with "UNKNOWN"
```

**Edge Cases**:

- Null status → "UNKNOWN" with gray color
- Empty string → "UNKNOWN" with gray color
- Unrecognized status → displayed as-is with gray color
- Case-insensitive matching (OPEN = open = Open)

---

### Method 8: buildDocumentationLink

**Purpose**: Generate documentation link HTML (active or disabled state)

**Signature**:

```groovy
/**
 * Build documentation link HTML
 * Can be active link or disabled/placeholder state
 *
 * @param url Documentation URL (or null if unavailable)
 * @param linkText Link display text (e.g., "View Documentation")
 * @return HTML anchor tag or disabled text
 */
private static String buildDocumentationLink(String url, String linkText)
```

**Logic**:

```groovy
def displayText = linkText ?: 'View Documentation'

// Active link if URL present
if (url && url.trim() && url != '#') {
    return """
        <a href="${url}" target="_blank" style="
            color: #0052cc;
            text-decoration: none;
            font-weight: bold;
        ">
            📖 ${displayText}
        </a>
    """
}

// Disabled state if URL not available
else {
    return """
        <span style="color: #6c757d; font-style: italic;">
            📖 ${displayText} (Not Available)
        </span>
    """
}
```

**Input Examples**:

```groovy
// Example 1: Valid URL
buildDocumentationLink('https://docs.company.com/migration-guide', 'Migration Guide')
// Output: Clickable link with "Migration Guide"

// Example 2: Null URL
buildDocumentationLink(null, 'User Manual')
// Output: Disabled text "User Manual (Not Available)"

// Example 3: Empty URL
buildDocumentationLink('', 'API Reference')
// Output: Disabled text "API Reference (Not Available)"

// Example 4: Default link text
buildDocumentationLink('https://docs.company.com', null)
// Output: Clickable link with "View Documentation"
```

**Edge Cases**:

- Null URL → disabled state
- Empty string URL → disabled state
- '#' placeholder URL → disabled state
- Null link text → "View Documentation" default
- Opens in new tab (\_blank) for external docs

---

## Implementation Location

**File**: `/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/utils/EnhancedEmailService.groovy`
**Insert After**: Line 683 (after existing processTemplate method)
**New Lines**: ~150 lines (8 methods × ~18 lines average)

**Format**:

```groovy
// ========================================
// TEMPLATE PRE-PROCESSING HELPER METHODS (TD-015 Phase 2)
// ========================================

/**
 * Helper methods for pre-processing email template content
 * These methods eliminate the need for GSP scriptlets in templates
 * by performing all conditionals and loops in Groovy code before rendering
 *
 * All methods are:
 * - Pure functions (no side effects)
 * - Stateless (no instance variables)
 * - Null-safe (handle missing data gracefully)
 * - Easily testable (deterministic outputs)
 *
 * @see TD-015-PHASE2-HELPER-METHODS.md
 * @since Sprint 8 (2025-09-30)
 */

private static String buildBreadcrumb(...) { ... }
private static String buildInstructionsHtml(...) { ... }
private static String buildCommentsHtml(...) { ... }
private static String buildDurationAndEnvironment(...) { ... }
private static String buildStepViewLinkHtml(...) { ... }
private static String buildOptionalField(...) { ... }
private static String buildStatusBadge(...) { ... }
private static String buildDocumentationLink(...) { ... }
```

---

## Test Case Documentation (Phase 3)

### Test Suite Structure (24 tests total)

**Method 1: buildBreadcrumb (3 tests)**

1. `test_buildBreadcrumb_fullHierarchy()` - All optional levels present
2. `test_buildBreadcrumb_minimalHierarchy()` - Only required codes
3. `test_buildBreadcrumb_fallbackPath()` - Null codes, use names

**Method 2: buildInstructionsHtml (3 tests)**

1. `test_buildInstructionsHtml_multipleInstructions()` - Standard list with completed/incomplete
2. `test_buildInstructionsHtml_emptyList()` - Empty collection fallback
3. `test_buildInstructionsHtml_missingData()` - Null fields, use fallbacks

**Method 3: buildCommentsHtml (3 tests)**

1. `test_buildCommentsHtml_multipleComments()` - 4 comments, limit to 3
2. `test_buildCommentsHtml_emptyList()` - Empty collection fallback
3. `test_buildCommentsHtml_missingData()` - Null fields, use fallbacks

**Method 4: buildDurationAndEnvironment (3 tests)**

1. `test_buildDurationAndEnvironment_bothPresent()` - Duration and environment
2. `test_buildDurationAndEnvironment_durationOnly()` - Duration only
3. `test_buildDurationAndEnvironment_environmentOnly()` - Environment only

**Method 5: buildStepViewLinkHtml (3 tests)**

1. `test_buildStepViewLinkHtml_validUrl()` - URL present, flag true
2. `test_buildStepViewLinkHtml_nullUrl()` - URL null, flag false
3. `test_buildStepViewLinkHtml_flagFalse()` - URL present but flag false

**Method 6: buildOptionalField (3 tests)**

1. `test_buildOptionalField_presentValue()` - Valid value generates row
2. `test_buildOptionalField_nullValue()` - Null value returns empty
3. `test_buildOptionalField_whitespaceValue()` - Whitespace returns empty

**Method 7: buildStatusBadge (3 tests)**

1. `test_buildStatusBadge_knownStatuses()` - OPEN, COMPLETED, BLOCKED colors
2. `test_buildStatusBadge_unknownStatus()` - Custom status gets gray
3. `test_buildStatusBadge_nullStatus()` - Null becomes "UNKNOWN"

**Method 8: buildDocumentationLink (3 tests)**

1. `test_buildDocumentationLink_validUrl()` - URL present, active link
2. `test_buildDocumentationLink_nullUrl()` - URL null, disabled state
3. `test_buildDocumentationLink_defaultText()` - Null linkText uses default

---

## Integration with Notification Methods

**Before (Current State)**:

```groovy
def variables = [
    stepInstance: stepInstanceForEmail,
    migrationCode: migrationCode,
    iterationCode: iterationCode,
    oldStatus: oldStatus,
    newStatus: newStatus
]
```

**After (Phase 2 Complete)**:

```groovy
def variables = [
    // Original simple variables (unchanged)
    stepInstance: stepInstanceForEmail,
    migrationCode: migrationCode,
    iterationCode: iterationCode,
    oldStatus: oldStatus,
    newStatus: newStatus,

    // NEW: Pre-processed HTML blocks
    breadcrumb: buildBreadcrumb(migrationCode, iterationCode, stepInstanceForEmail),
    instructionsHtml: buildInstructionsHtml(stepInstanceForEmail.instructions),
    commentsHtml: buildCommentsHtml(stepInstanceForEmail.recentComments),
    durationAndEnvironment: buildDurationAndEnvironment(stepInstanceForEmail),
    stepViewLinkHtml: buildStepViewLinkHtml(stepViewUrl, hasStepViewUrl),
    statusBadgeHtml: buildStatusBadge(newStatus),

    // NEW: Pre-processed optional fields (reusable buildOptionalField)
    teamRowHtml: buildOptionalField('Team', stepInstanceForEmail.team_name),
    impactedTeamsRowHtml: buildOptionalField('Impacted Teams', stepInstanceForEmail.impacted_teams),
    predecessorRowHtml: buildOptionalField('Predecessor', "${stepInstanceForEmail.predecessor_code} ${stepInstanceForEmail.predecessor_name}"),
    environmentRowHtml: buildOptionalField('Environment', stepInstanceForEmail.environment_name),

    // NEW: Documentation link
    documentationLinkHtml: buildDocumentationLink(documentationUrl, 'View Migration Guide')
]
```

---

## Performance Characteristics

**Method Complexity**:

- All methods: O(n) where n is collection size
- buildBreadcrumb: O(1) - fixed 5 checks
- buildInstructionsHtml: O(n) - linear iteration
- buildCommentsHtml: O(1) - limited to 3 items
- Others: O(1) - simple conditionals

**Memory Impact**:

- StringBuilder usage for multi-line HTML (efficient concatenation)
- No caching needed (methods are pure functions)
- Garbage collection friendly (local variables only)

---

## Success Criteria

✅ All 8 methods implemented with correct signatures
✅ All methods handle null/empty inputs gracefully
✅ HTML output is valid and matches existing template styling
✅ No static type checking errors
✅ JavaDoc comments complete for all methods
✅ Input/output examples documented
✅ Test cases documented (24 scenarios)
✅ Integration pattern documented

---

## Next Phase: Phase 3

**Phase 3 Goals**:

1. Update email notification methods to use helper methods
2. Simplify processTemplate() to remove scriptlet handling
3. Create Liquibase migration for simplified templates
4. Implement 24 unit tests
5. Test with MailHog rendering

**Dependencies**:

- Phase 2 must be complete (all 8 methods implemented)
- Static type checking validation passed
- No compilation errors

---

**Status**: ✅ DESIGN COMPLETE
**Next Step**: Implement helper methods in EnhancedEmailService.groovy
**Estimated Implementation Time**: 3 hours

---

_Design document completed: September 30, 2025_
_Total methods: 8 helper functions_
_Total test cases: 24 scenarios_
_Target file: EnhancedEmailService.groovy (line 683+)_
