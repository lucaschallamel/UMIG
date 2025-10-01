# TD-015 Phase 3: Comprehensive Test Case Documentation

**Date**: September 30, 2025
**Sprint**: Sprint 8
**Status**: Ready for Implementation
**Priority**: High

---

## Test Suite Overview

**Total Test Cases**: 24 unit tests (3 per helper method)
**Test Framework**: Groovy Spock or JUnit 4 (aligned with existing test infrastructure)
**Test Location**: `src/groovy/umig/tests/unit/EnhancedEmailServiceHelperMethodsTest.groovy`

**Coverage Target**: 100% line coverage for all 8 helper methods
**Execution Time Target**: < 100ms for complete suite

---

## Test Class Structure

```groovy
package umig.tests.unit

import spock.lang.Specification
import spock.lang.Unroll
import umig.utils.EnhancedEmailService

/**
 * Unit tests for EnhancedEmailService helper methods (TD-015 Phase 2)
 * Tests pre-processing logic that eliminates GSP scriptlets from templates
 *
 * @see TD-015-PHASE2-HELPER-METHODS.md
 * @since Sprint 8 (2025-09-30)
 */
class EnhancedEmailServiceHelperMethodsTest extends Specification {

    // Test cases for each method...
}
```

---

## Method 1: buildBreadcrumb - 3 Test Cases

### Test 1.1: Full Hierarchy with All Optional Levels

**Test Name**: `test_buildBreadcrumb_fullHierarchy()`

**Purpose**: Verify breadcrumb includes all 5 hierarchy levels when present

**Test Data**:

```groovy
String migrationCode = 'MIG-2025-Q1'
String iterationCode = 'ITER-001'
Map stepInstance = [
    plan_name: 'Database Upgrade',
    sequence_name: 'Pre-Migration',
    phase_name: 'Backup',
    migration_name: 'Cloud Migration Project',
    iteration_name: 'Phase 1 - Assessment'
]
```

**Expected Output**:

```
"MIG-2025-Q1 › ITER-001 › Database Upgrade › Pre-Migration › Backup"
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildBreadcrumb(migrationCode, iterationCode, stepInstance)
assert result == 'MIG-2025-Q1 › ITER-001 › Database Upgrade › Pre-Migration › Backup'
assert result.contains(' › ')
assert result.split(' › ').size() == 5
```

---

### Test 1.2: Minimal Hierarchy (Codes Only)

**Test Name**: `test_buildBreadcrumb_minimalHierarchy()`

**Purpose**: Verify breadcrumb works with just migration and iteration codes

**Test Data**:

```groovy
String migrationCode = 'MIG-2025-Q2'
String iterationCode = 'ITER-005'
Map stepInstance = [:] // Empty map - no optional levels
```

**Expected Output**:

```
"MIG-2025-Q2 › ITER-005"
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildBreadcrumb(migrationCode, iterationCode, stepInstance)
assert result == 'MIG-2025-Q2 › ITER-005'
assert result.split(' › ').size() == 2
assert !result.contains('Database')
```

---

### Test 1.3: Fallback Path (No Codes)

**Test Name**: `test_buildBreadcrumb_fallbackPath()`

**Purpose**: Verify fallback to full names when codes are null

**Test Data**:

```groovy
String migrationCode = null
String iterationCode = null
Map stepInstance = [
    migration_name: 'Cloud Migration Project',
    iteration_name: 'Phase 1 - Assessment'
]
```

**Expected Output**:

```
"Cloud Migration Project › Phase 1 - Assessment"
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildBreadcrumb(migrationCode, iterationCode, stepInstance)
assert result == 'Cloud Migration Project › Phase 1 - Assessment'
assert result.contains('Cloud Migration')
assert !result.contains('MIG-')
```

**Edge Case Test**: All null values

```groovy
def result = EnhancedEmailService.buildBreadcrumb(null, null, [:])
assert result == 'Migration › Iteration'
```

---

## Method 2: buildInstructionsHtml - 3 Test Cases

### Test 2.1: Multiple Instructions with Mixed Completion Status

**Test Name**: `test_buildInstructionsHtml_multipleInstructions()`

**Purpose**: Verify HTML generation for standard instruction list

**Test Data**:

```groovy
List instructions = [
    [
        ini_name: 'Backup database',
        ini_duration_minutes: 30,
        team_name: 'DBA Team',
        control_code: 'CTRL-001',
        completed: true
    ],
    [
        ini_name: 'Stop application',
        ini_duration_minutes: 5,
        team_name: 'App Team',
        control_code: 'CTRL-002',
        completed: false
    ],
    [
        ini_name: 'Verify connectivity',
        ini_duration_minutes: 10,
        team_name: 'Network Team',
        control_code: 'CTRL-003',
        completed: false
    ]
]
```

**Expected Output** (HTML):

- 3 `<tr>` tags
- First row: status icon "✓" (green color)
- Second row: status icon "2" (gray color)
- Third row: status icon "3" (gray color)
- All durations formatted as "X min"

**Assertions**:

```groovy
def result = EnhancedEmailService.buildInstructionsHtml(instructions)
assert result.contains('<tr>')
assert result.count('<tr>') == 3
assert result.contains('✓') // Completed icon
assert result.contains('Backup database')
assert result.contains('30 min')
assert result.contains('CTRL-001')
assert result.contains('#28a745') // Green color for completed
assert result.contains('#6c757d') // Gray color for incomplete
```

---

### Test 2.2: Empty Instructions List

**Test Name**: `test_buildInstructionsHtml_emptyList()`

**Purpose**: Verify fallback message for empty list

**Test Data**:

```groovy
List instructions = []
```

**Expected Output**:

```html
<tr>
  <td colspan="5" style="text-align:center; color:#6c757d; padding:20px;">
    No instructions defined for this step.
  </td>
</tr>
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildInstructionsHtml(instructions)
assert result.contains('colspan="5"')
assert result.contains('No instructions defined')
assert result.count('<tr>') == 1
assert !result.contains('✓')
```

**Edge Case**: Null list

```groovy
def result = EnhancedEmailService.buildInstructionsHtml(null)
assert result.contains('No instructions defined')
```

---

### Test 2.3: Instructions with Missing Data

**Test Name**: `test_buildInstructionsHtml_missingData()`

**Purpose**: Verify fallback values for missing fields

**Test Data**:

```groovy
List instructions = [
    [
        ini_name: null,
        ini_duration_minutes: null,
        team_name: null,
        control_code: null,
        completed: false
    ],
    [
        description: 'Alternative description field',
        ini_duration_minutes: 0, // Zero should be treated as falsy
        completed: true
    ]
]
```

**Expected Output**:

- First row: "Instruction 1", "-", "-", "-"
- Second row: "Alternative description field", "-", "-", "-"

**Assertions**:

```groovy
def result = EnhancedEmailService.buildInstructionsHtml(instructions)
assert result.contains('Instruction 1')
assert result.contains('Alternative description field')
assert result.count('-</td>') >= 6 // Multiple fallback dashes
assert result.contains('✓') // Second instruction is completed
```

---

## Method 3: buildCommentsHtml - 3 Test Cases

### Test 3.1: Multiple Comments (Limited to 3)

**Test Name**: `test_buildCommentsHtml_multipleComments()`

**Purpose**: Verify limit of 3 comments and correct margin spacing

**Test Data**:

```groovy
List comments = [
    [author_name: 'John Doe', created_at: '2025-09-30 10:15', comment_text: 'Backup completed successfully'],
    [author_name: 'Jane Smith', created_at: '2025-09-30 10:20', comment_text: 'Verified data integrity'],
    [author_name: 'Bob Wilson', created_at: '2025-09-30 10:25', comment_text: 'Ready to proceed'],
    [author_name: 'Alice Brown', created_at: '2025-09-30 10:30', comment_text: 'This should not appear']
]
```

**Expected Output**:

- Only 3 comment cards
- First comment: margin-top: 0
- Second comment: margin-top: 12px
- Third comment: margin-top: 12px
- Fourth comment: not rendered

**Assertions**:

```groovy
def result = EnhancedEmailService.buildCommentsHtml(comments)
assert result.count('<div class="comment-card"') == 3
assert result.contains('margin: 0 0') // First comment
assert result.count('margin: 12px 0') == 2 // Second and third
assert result.contains('John Doe')
assert result.contains('Backup completed')
assert !result.contains('Alice Brown') // Fourth comment excluded
```

---

### Test 3.2: Empty Comments List

**Test Name**: `test_buildCommentsHtml_emptyList()`

**Purpose**: Verify fallback message for empty list

**Test Data**:

```groovy
List comments = []
```

**Expected Output**:

```html
<p style="color:#6c757d; text-align:center; padding:20px;">
  No comments yet. Be the first to add your insights!
</p>
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildCommentsHtml(comments)
assert result.contains('No comments yet')
assert result.contains('<p style')
assert !result.contains('<div class="comment-card"')
```

**Edge Case**: Null list

```groovy
def result = EnhancedEmailService.buildCommentsHtml(null)
assert result.contains('No comments yet')
```

---

### Test 3.3: Comments with Missing Data

**Test Name**: `test_buildCommentsHtml_missingData()`

**Purpose**: Verify fallback values for missing fields

**Test Data**:

```groovy
List comments = [
    [author_name: null, created_at: null, comment_text: null],
    [author_name: '', created_at: '', comment_text: ''],
    [comment_text: 'Valid comment with missing author']
]
```

**Expected Output**:

- First comment: "Anonymous", "Recent", "(No comment text)"
- Second comment: "Anonymous", "Recent", "(No comment text)"
- Third comment: "Anonymous", "Recent", "Valid comment..."

**Assertions**:

```groovy
def result = EnhancedEmailService.buildCommentsHtml(comments)
assert result.count('Anonymous') == 3
assert result.count('Recent') == 3
assert result.contains('(No comment text)')
assert result.contains('Valid comment with missing author')
```

---

## Method 4: buildDurationAndEnvironment - 3 Test Cases

### Test 4.1: Both Duration and Environment Present

**Test Name**: `test_buildDurationAndEnvironment_bothPresent()`

**Purpose**: Verify separator logic when both fields present

**Test Data**:

```groovy
Map stepInstance = [
    sti_duration_minutes: 30,
    environment_name: 'Production'
]
```

**Expected Output**:

```
"30 min | Production"
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildDurationAndEnvironment(stepInstance)
assert result == '30 min | Production'
assert result.contains(' | ')
assert result.split(' \\| ').size() == 2
```

---

### Test 4.2: Duration Only

**Test Name**: `test_buildDurationAndEnvironment_durationOnly()`

**Purpose**: Verify output with only duration present

**Test Data**:

```groovy
Map stepInstance = [
    sti_duration_minutes: 45,
    environment_name: null
]
```

**Expected Output**:

```
"45 min"
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildDurationAndEnvironment(stepInstance)
assert result == '45 min'
assert !result.contains(' | ')
assert !result.contains('null')
```

---

### Test 4.3: Environment Only

**Test Name**: `test_buildDurationAndEnvironment_environmentOnly()`

**Purpose**: Verify output with only environment present

**Test Data**:

```groovy
Map stepInstance = [
    sti_duration_minutes: null,
    environment_name: 'Development'
]
```

**Expected Output**:

```
"Development"
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildDurationAndEnvironment(stepInstance)
assert result == 'Development'
assert !result.contains(' | ')
assert !result.contains('min')
```

**Edge Case**: Neither present

```groovy
def result = EnhancedEmailService.buildDurationAndEnvironment([:])
assert result == ''
assert result.isEmpty()
```

---

## Method 5: buildStepViewLinkHtml - 3 Test Cases

### Test 5.1: Valid URL Available

**Test Name**: `test_buildStepViewLinkHtml_validUrl()`

**Purpose**: Verify clickable link HTML generation

**Test Data**:

```groovy
String stepViewUrl = 'https://confluence.company.com/pages/123456'
boolean hasStepViewUrl = true
```

**Expected Output**:

- Clickable `<a>` tag with href
- Button styling with blue background (#0052cc)
- 🔗 emoji icon
- Helper text about live updates

**Assertions**:

```groovy
def result = EnhancedEmailService.buildStepViewLinkHtml(stepViewUrl, hasStepViewUrl)
assert result.contains('<a href="https://confluence.company.com/pages/123456"')
assert result.contains('🔗 View in Confluence')
assert result.contains('#0052cc')
assert result.contains('live updates')
assert !result.contains('not available')
```

---

### Test 5.2: Null URL (No Link Available)

**Test Name**: `test_buildStepViewLinkHtml_nullUrl()`

**Purpose**: Verify fallback message when URL unavailable

**Test Data**:

```groovy
String stepViewUrl = null
boolean hasStepViewUrl = false
```

**Expected Output**:

- Informational `<div>` with gray background
- 📌 emoji icon
- Message about accessing via Confluence
- No clickable link

**Assertions**:

```groovy
def result = EnhancedEmailService.buildStepViewLinkHtml(stepViewUrl, hasStepViewUrl)
assert result.contains('📌 Access Information')
assert result.contains('Direct link is not available')
assert result.contains('UMIG system in Confluence')
assert !result.contains('<a href')
assert result.contains('#f8f9fa') // Gray background
```

---

### Test 5.3: URL Present but Flag False (Defensive Check)

**Test Name**: `test_buildStepViewLinkHtml_flagFalse()`

**Purpose**: Verify flag takes precedence over URL presence

**Test Data**:

```groovy
String stepViewUrl = 'https://confluence.company.com/pages/123456'
boolean hasStepViewUrl = false // Flag says no URL
```

**Expected Output**:

- Fallback message (flag overrides URL presence)

**Assertions**:

```groovy
def result = EnhancedEmailService.buildStepViewLinkHtml(stepViewUrl, hasStepViewUrl)
assert result.contains('Direct link is not available')
assert !result.contains('<a href')
assert result.contains('📌')
```

---

## Method 6: buildOptionalField - 3 Test Cases

### Test 6.1: Present Value Generates Row

**Test Name**: `test_buildOptionalField_presentValue()`

**Purpose**: Verify HTML table row generation

**Test Data**:

```groovy
String label = 'Team'
String value = 'Database Administration Team'
```

**Expected Output**:

```html
<tr>
  <td style="font-weight: bold; color: #495057; width: 180px;">Team</td>
  <td style="color: #212529;">Database Administration Team</td>
</tr>
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildOptionalField(label, value)
assert result.contains('<tr>')
assert result.contains('</tr>')
assert result.contains('Team</td>')
assert result.contains('Database Administration Team</td>')
assert result.contains('font-weight: bold')
```

---

### Test 6.2: Null Value Returns Empty String

**Test Name**: `test_buildOptionalField_nullValue()`

**Purpose**: Verify row is hidden when value is null

**Test Data**:

```groovy
String label = 'Impacted Teams'
String value = null
```

**Expected Output**:

```
""
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildOptionalField(label, value)
assert result == ''
assert result.isEmpty()
assert !result.contains('<tr>')
assert !result.contains('Impacted Teams')
```

---

### Test 6.3: Whitespace Value Returns Empty String

**Test Name**: `test_buildOptionalField_whitespaceValue()`

**Purpose**: Verify row is hidden when value is whitespace-only

**Test Data**:

```groovy
String label = 'Environment'
String value = '   ' // Whitespace only
```

**Expected Output**:

```
""
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildOptionalField(label, value)
assert result == ''
assert result.isEmpty()
assert !result.contains('<tr>')
```

**Edge Case**: Empty string

```groovy
def result = EnhancedEmailService.buildOptionalField('Phase', '')
assert result == ''
```

---

## Method 7: buildStatusBadge - 3 Test Cases

### Test 7.1: Known Statuses with Correct Colors

**Test Name**: `test_buildStatusBadge_knownStatuses()`

**Purpose**: Verify color mapping for standard statuses

**Test Data & Expected Colors**:

- `'OPEN'` → Blue (#0052cc)
- `'IN_PROGRESS'` → Blue (#0052cc)
- `'COMPLETED'` → Green (#28a745)
- `'DONE'` → Green (#28a745)
- `'BLOCKED'` → Red (#dc3545)
- `'FAILED'` → Red (#dc3545)
- `'PENDING'` → Yellow (#ffc107)
- `'WAITING'` → Yellow (#ffc107)

**Assertions**:

```groovy
def openBadge = EnhancedEmailService.buildStatusBadge('OPEN')
assert openBadge.contains('#0052cc')
assert openBadge.contains('OPEN</span>')

def completedBadge = EnhancedEmailService.buildStatusBadge('COMPLETED')
assert completedBadge.contains('#28a745')
assert completedBadge.contains('COMPLETED</span>')

def blockedBadge = EnhancedEmailService.buildStatusBadge('BLOCKED')
assert blockedBadge.contains('#dc3545')
assert blockedBadge.contains('BLOCKED</span>')

def pendingBadge = EnhancedEmailService.buildStatusBadge('PENDING')
assert pendingBadge.contains('#ffc107')
assert pendingBadge.contains('PENDING</span>')
```

---

### Test 7.2: Unknown Status Gets Gray Color

**Test Name**: `test_buildStatusBadge_unknownStatus()`

**Purpose**: Verify default gray color for unrecognized statuses

**Test Data**:

```groovy
String status = 'CUSTOM_STATUS'
```

**Expected Output**:

- Gray color (#6c757d)
- Status text preserved as-is

**Assertions**:

```groovy
def result = EnhancedEmailService.buildStatusBadge(status)
assert result.contains('#6c757d')
assert result.contains('CUSTOM_STATUS</span>')
assert result.contains('<span class="status-badge"')
```

---

### Test 7.3: Null Status Becomes "UNKNOWN"

**Test Name**: `test_buildStatusBadge_nullStatus()`

**Purpose**: Verify fallback for null status

**Test Data**:

```groovy
String status = null
```

**Expected Output**:

- Gray color (#6c757d)
- Display text "UNKNOWN"

**Assertions**:

```groovy
def result = EnhancedEmailService.buildStatusBadge(status)
assert result.contains('#6c757d')
assert result.contains('UNKNOWN</span>')
assert !result.contains('null')
```

**Edge Case**: Empty string

```groovy
def result = EnhancedEmailService.buildStatusBadge('')
assert result.contains('UNKNOWN')
```

---

## Method 8: buildDocumentationLink - 3 Test Cases

### Test 8.1: Valid URL Creates Active Link

**Test Name**: `test_buildDocumentationLink_validUrl()`

**Purpose**: Verify clickable link generation

**Test Data**:

```groovy
String url = 'https://docs.company.com/migration-guide'
String linkText = 'Migration Guide'
```

**Expected Output**:

```html
<a href="https://docs.company.com/migration-guide" target="_blank" style="...">
  📖 Migration Guide
</a>
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildDocumentationLink(url, linkText)
assert result.contains('<a href="https://docs.company.com/migration-guide"')
assert result.contains('target="_blank"')
assert result.contains('📖 Migration Guide')
assert result.contains('#0052cc')
assert !result.contains('Not Available')
```

---

### Test 8.2: Null URL Creates Disabled State

**Test Name**: `test_buildDocumentationLink_nullUrl()`

**Purpose**: Verify disabled state when URL unavailable

**Test Data**:

```groovy
String url = null
String linkText = 'User Manual'
```

**Expected Output**:

```html
<span style="color: #6c757d; font-style: italic;">
  📖 User Manual (Not Available)
</span>
```

**Assertions**:

```groovy
def result = EnhancedEmailService.buildDocumentationLink(url, linkText)
assert result.contains('<span style')
assert result.contains('📖 User Manual (Not Available)')
assert result.contains('#6c757d')
assert !result.contains('<a href')
```

---

### Test 8.3: Default Link Text When Text is Null

**Test Name**: `test_buildDocumentationLink_defaultText()`

**Purpose**: Verify default text "View Documentation"

**Test Data**:

```groovy
String url = 'https://docs.company.com'
String linkText = null
```

**Expected Output**:

- Link with text "View Documentation"

**Assertions**:

```groovy
def result = EnhancedEmailService.buildDocumentationLink(url, linkText)
assert result.contains('📖 View Documentation')
assert result.contains('<a href')
assert !result.contains('null')
```

**Edge Cases**:

- Empty URL: `buildDocumentationLink('', 'Test')` → Disabled state
- '#' URL: `buildDocumentationLink('#', 'Test')` → Disabled state

---

## Test Execution Instructions

### Running the Test Suite

```bash
# Run all helper method tests
npm run test:groovy:unit -- EnhancedEmailServiceHelperMethodsTest

# Run specific test
npm run test:groovy:unit -- EnhancedEmailServiceHelperMethodsTest.test_buildBreadcrumb_fullHierarchy

# Run with coverage
npm run test:groovy:coverage
```

### Expected Results

```
EnhancedEmailServiceHelperMethodsTest
✓ test_buildBreadcrumb_fullHierarchy (12ms)
✓ test_buildBreadcrumb_minimalHierarchy (8ms)
✓ test_buildBreadcrumb_fallbackPath (10ms)
✓ test_buildInstructionsHtml_multipleInstructions (15ms)
✓ test_buildInstructionsHtml_emptyList (5ms)
✓ test_buildInstructionsHtml_missingData (12ms)
✓ test_buildCommentsHtml_multipleComments (18ms)
✓ test_buildCommentsHtml_emptyList (6ms)
✓ test_buildCommentsHtml_missingData (14ms)
✓ test_buildDurationAndEnvironment_bothPresent (7ms)
✓ test_buildDurationAndEnvironment_durationOnly (6ms)
✓ test_buildDurationAndEnvironment_environmentOnly (6ms)
✓ test_buildStepViewLinkHtml_validUrl (10ms)
✓ test_buildStepViewLinkHtml_nullUrl (8ms)
✓ test_buildStepViewLinkHtml_flagFalse (9ms)
✓ test_buildOptionalField_presentValue (7ms)
✓ test_buildOptionalField_nullValue (5ms)
✓ test_buildOptionalField_whitespaceValue (6ms)
✓ test_buildStatusBadge_knownStatuses (20ms)
✓ test_buildStatusBadge_unknownStatus (8ms)
✓ test_buildStatusBadge_nullStatus (7ms)
✓ test_buildDocumentationLink_validUrl (9ms)
✓ test_buildDocumentationLink_nullUrl (7ms)
✓ test_buildDocumentationLink_defaultText (8ms)

Tests: 24 passed, 24 total
Time: 0.247s
Coverage: 100% (8/8 methods)
```

---

## Coverage Verification

**Required Coverage Metrics**:

- Line Coverage: 100% (all 8 methods)
- Branch Coverage: ≥ 95% (all conditionals tested)
- Method Coverage: 100% (all 8 methods invoked)

**Coverage Report Location**: `build/reports/tests/unit/coverage/`

---

## Integration Test Considerations (Future)

**Phase 4 Integration Tests** (not covered in this document):

1. End-to-end email rendering with MailHog
2. Template processing with pre-processed variables
3. Database template updates via Liquibase
4. Visual regression testing across email clients

---

**Status**: ✅ TEST CASES DOCUMENTED
**Next Step**: Implement 24 unit tests in Phase 3
**Estimated Implementation Time**: 2 hours

---

_Test case documentation completed: September 30, 2025_
_Total test cases: 24 unit tests_
_Coverage target: 100% for 8 helper methods_
