# TD-018: Refactor Email Template Variable Construction

**Story Type**: Technical Debt
**Priority**: HIGH
**Story Points**: 1
**Sprint**: Sprint 8
**Created**: 2025-10-02
**Status**: Ready for Development

---

## User Story

**As a** developer maintaining email notification logic
**I want** template variable construction extracted to a single reusable method
**So that** changes to template variables require modification in one place only, reducing maintenance burden by ≥70%

---

## Business Value

- **Maintainability**: Single point of change for template variable structure
- **Code Quality**: ≥70% reduction in code duplication across 3 notification types
- **Developer Efficiency**: Faster implementation of new notification types (reuse existing method)
- **Risk Reduction**: Fewer bugs from inconsistent variable handling across notification types

---

## Acceptance Criteria

### AC1: Extracted Method Implementation

**Given** template variable construction logic exists in 3 locations
**When** refactoring is complete
**Then** a single `buildTemplateVariables(stepInstance, templateType, additionalData)` method exists in `EnhancedEmailService.groovy`

### AC2: All Notification Types Use Extracted Method

**Given** the new `buildTemplateVariables()` method
**When** sending notifications for:

- Step Status Changed (lines 299-390)
- Step Opened (lines 520-550)
- Instruction Completed (lines 643-673)
  **Then** all 3 notification types call `buildTemplateVariables()` with appropriate parameters

### AC3: Backward Compatibility Maintained

**Given** the refactored implementation
**When** running all existing email notification tests
**Then** 100% of tests pass with identical email content as before refactoring

### AC4: Code Duplication Reduced

**Given** the current implementation with 3 duplicated blocks
**When** measuring code duplication via SonarQube or similar tool
**Then** duplication in `EnhancedEmailService.groovy` is reduced by ≥70% (from ~300 lines to ~90 lines)

### AC5: New Method Unit Tested

**Given** the new `buildTemplateVariables()` method
**When** running unit tests for all 3 template types
**Then** method correctly builds variables for:

- `STEP_STATUS_CHANGED` template type
- `STEP_OPENED` template type
- `INSTRUCTION_COMPLETED` template type

---

## Technical Details

### Current Implementation (Code Duplication)

**File**: `src/groovy/umig/utils/EnhancedEmailService.groovy`

**Location 1**: Lines 299-390 (Step Status Changed notification)

```groovy
def variables = [
    stepName: stepInstance.stepName,
    stepStatus: stepInstance.status,
    assignedTeam: stepInstance.assignedTeam,
    instructions: stepInstance.instructions,
    comments: stepInstance.comments,
    stepViewUrl: urlConstructionService.constructStepViewUrl(
        stepInstance.migrationId,
        stepInstance.iterationId,
        stepInstance.planId,
        stepInstance.sequenceId,
        stepInstance.phaseId,
        stepInstance.stepId
    ),
    dashboardUrl: urlConstructionService.constructDashboardUrl(),
    timestamp: new Date(),
    systemName: 'UMIG'
]
```

**Location 2**: Lines 520-550 (Step Opened notification)

```groovy
def variables = [
    stepName: stepInstance.stepName,
    stepStatus: stepInstance.status,
    assignedTeam: stepInstance.assignedTeam,
    instructions: stepInstance.instructions,
    comments: stepInstance.comments,
    stepViewUrl: urlConstructionService.constructStepViewUrl(
        stepInstance.migrationId,
        stepInstance.iterationId,
        stepInstance.planId,
        stepInstance.sequenceId,
        stepInstance.phaseId,
        stepInstance.stepId
    ),
    dashboardUrl: urlConstructionService.constructDashboardUrl(),
    timestamp: new Date(),
    systemName: 'UMIG'
]
```

**Location 3**: Lines 643-673 (Instruction Completed notification)

```groovy
def variables = [
    stepName: stepInstance.stepName,
    stepStatus: stepInstance.status,
    assignedTeam: stepInstance.assignedTeam,
    instructions: stepInstance.instructions,
    comments: stepInstance.comments,
    completedInstruction: additionalData.instructionName,
    completedBy: additionalData.completedBy,
    stepViewUrl: urlConstructionService.constructStepViewUrl(
        stepInstance.migrationId,
        stepInstance.iterationId,
        stepInstance.planId,
        stepInstance.sequenceId,
        stepInstance.phaseId,
        stepInstance.stepId
    ),
    dashboardUrl: urlConstructionService.constructDashboardUrl(),
    timestamp: new Date(),
    systemName: 'UMIG'
]
```

**Problem**:

- 300+ lines of duplicated code across 3 methods
- Any change to variable structure requires 3 separate edits
- High risk of inconsistency between notification types
- Violates DRY principle

### Proposed Solution

**Single Reusable Method**:

```groovy
/**
 * Build template variables for email notifications.
 *
 * @param stepInstance Enriched step instance data with instructions/comments
 * @param templateType Email template type (STEP_STATUS_CHANGED, STEP_OPENED, INSTRUCTION_COMPLETED)
 * @param additionalData Optional map of template-specific additional variables
 * @return Map of template variables ready for email rendering
 */
private Map<String, Object> buildTemplateVariables(
    Map<String, Object> stepInstance,
    String templateType,
    Map<String, Object> additionalData = [:]
) {
    // Validate required parameters (ADR-031 type safety)
    if (!stepInstance) {
        throw new IllegalArgumentException("stepInstance is required")
    }
    if (!templateType) {
        throw new IllegalArgumentException("templateType is required")
    }

    // Base variables common to all notification types
    def variables = [
        stepName: stepInstance.stepName as String,
        stepStatus: stepInstance.status as String,
        assignedTeam: stepInstance.assignedTeam as String,
        instructions: stepInstance.instructions ?: [],
        comments: stepInstance.comments ?: [],
        stepViewUrl: urlConstructionService.constructStepViewUrl(
            stepInstance.migrationId,
            stepInstance.iterationId,
            stepInstance.planId,
            stepInstance.sequenceId,
            stepInstance.phaseId,
            stepInstance.stepId
        ),
        dashboardUrl: urlConstructionService.constructDashboardUrl(),
        timestamp: new Date(),
        systemName: 'UMIG'
    ]

    // Add template-specific variables
    switch (templateType) {
        case 'STEP_STATUS_CHANGED':
            variables.previousStatus = additionalData.previousStatus as String
            variables.newStatus = additionalData.newStatus as String
            break

        case 'STEP_OPENED':
            // No additional variables for STEP_OPENED
            break

        case 'INSTRUCTION_COMPLETED':
            variables.completedInstruction = additionalData.instructionName as String
            variables.completedBy = additionalData.completedBy as String
            break

        default:
            log.warn("Unknown template type: ${templateType}")
    }

    return variables
}
```

**Refactored Usage** (all 3 notification methods):

```groovy
// Step Status Changed notification (line ~320)
def variables = buildTemplateVariables(
    enrichedStepInstance,
    'STEP_STATUS_CHANGED',
    [previousStatus: oldStatus, newStatus: newStatus]
)

// Step Opened notification (line ~535)
def variables = buildTemplateVariables(
    enrichedStepInstance,
    'STEP_OPENED'
)

// Instruction Completed notification (line ~658)
def variables = buildTemplateVariables(
    enrichedStepInstance,
    'INSTRUCTION_COMPLETED',
    [instructionName: instruction.name, completedBy: userCode]
)
```

### ADR Compliance

- **ADR-031**: Explicit type casting for all string/object parameters
- **ADR-043**: Parameter validation with `IllegalArgumentException` for required fields
- **DRY Principle**: Single source of truth for template variable construction

### Files to Modify

1. `src/groovy/umig/utils/EnhancedEmailService.groovy`
   - Add new method `buildTemplateVariables()` (lines ~200-260)
   - Refactor `sendStepStatusChangedNotification()` (lines 299-390)
   - Refactor `sendStepOpenedNotification()` (lines 520-550)
   - Refactor `sendInstructionCompletedNotification()` (lines 643-673)

---

## Testing Requirements

### Unit Tests (Groovy)

**File**: `src/groovy/umig/tests/unit/EnhancedEmailServiceTest.groovy`

Create new test class section:

```groovy
// ============================================================================
// Template Variable Construction Tests
// ============================================================================

void testBuildTemplateVariables_StepStatusChanged() {
    def stepInstance = [
        stepName: 'Deploy Application',
        status: 'IN_PROGRESS',
        assignedTeam: 'DevOps',
        instructions: [[name: 'Backup DB'], [name: 'Deploy Code']],
        comments: [[text: 'Ready to deploy', author: 'john.doe']],
        migrationId: UUID.randomUUID(),
        iterationId: UUID.randomUUID(),
        planId: UUID.randomUUID(),
        sequenceId: UUID.randomUUID(),
        phaseId: UUID.randomUUID(),
        stepId: UUID.randomUUID()
    ]

    def additionalData = [
        previousStatus: 'READY',
        newStatus: 'IN_PROGRESS'
    ]

    def variables = enhancedEmailService.buildTemplateVariables(
        stepInstance,
        'STEP_STATUS_CHANGED',
        additionalData
    )

    assert variables.stepName == 'Deploy Application'
    assert variables.stepStatus == 'IN_PROGRESS'
    assert variables.previousStatus == 'READY'
    assert variables.newStatus == 'IN_PROGRESS'
    assert variables.assignedTeam == 'DevOps'
    assert variables.instructions.size() == 2
    assert variables.comments.size() == 1
    assert variables.stepViewUrl != null
    assert variables.dashboardUrl != null
    assert variables.timestamp != null
    assert variables.systemName == 'UMIG'
}

void testBuildTemplateVariables_StepOpened() {
    def stepInstance = [
        stepName: 'Configure Firewall',
        status: 'OPEN',
        assignedTeam: 'Network',
        instructions: [],
        comments: [],
        migrationId: UUID.randomUUID(),
        iterationId: UUID.randomUUID(),
        planId: UUID.randomUUID(),
        sequenceId: UUID.randomUUID(),
        phaseId: UUID.randomUUID(),
        stepId: UUID.randomUUID()
    ]

    def variables = enhancedEmailService.buildTemplateVariables(
        stepInstance,
        'STEP_OPENED'
    )

    assert variables.stepName == 'Configure Firewall'
    assert variables.stepStatus == 'OPEN'
    assert variables.assignedTeam == 'Network'
    assert variables.instructions.isEmpty()
    assert variables.comments.isEmpty()
    assert !variables.containsKey('previousStatus')
    assert !variables.containsKey('completedInstruction')
}

void testBuildTemplateVariables_InstructionCompleted() {
    def stepInstance = [
        stepName: 'Data Migration',
        status: 'IN_PROGRESS',
        assignedTeam: 'Data Team',
        instructions: [[name: 'Migrate Users'], [name: 'Migrate Orders']],
        comments: [],
        migrationId: UUID.randomUUID(),
        iterationId: UUID.randomUUID(),
        planId: UUID.randomUUID(),
        sequenceId: UUID.randomUUID(),
        phaseId: UUID.randomUUID(),
        stepId: UUID.randomUUID()
    ]

    def additionalData = [
        instructionName: 'Migrate Users',
        completedBy: 'jane.smith'
    ]

    def variables = enhancedEmailService.buildTemplateVariables(
        stepInstance,
        'INSTRUCTION_COMPLETED',
        additionalData
    )

    assert variables.completedInstruction == 'Migrate Users'
    assert variables.completedBy == 'jane.smith'
    assert !variables.containsKey('previousStatus')
}

void testBuildTemplateVariables_RequiredParameterValidation() {
    shouldFail(IllegalArgumentException) {
        enhancedEmailService.buildTemplateVariables(null, 'STEP_OPENED')
    }

    shouldFail(IllegalArgumentException) {
        enhancedEmailService.buildTemplateVariables([:], null)
    }
}

void testBuildTemplateVariables_UnknownTemplateType() {
    def stepInstance = [
        stepName: 'Test Step',
        status: 'OPEN',
        assignedTeam: 'Test Team',
        instructions: [],
        comments: [],
        migrationId: UUID.randomUUID(),
        iterationId: UUID.randomUUID(),
        planId: UUID.randomUUID(),
        sequenceId: UUID.randomUUID(),
        phaseId: UUID.randomUUID(),
        stepId: UUID.randomUUID()
    ]

    // Should not throw exception, just log warning
    def variables = enhancedEmailService.buildTemplateVariables(
        stepInstance,
        'UNKNOWN_TYPE'
    )

    // Base variables should still be present
    assert variables.stepName == 'Test Step'
    assert variables.systemName == 'UMIG'
}
```

### Integration Tests

Verify all existing email notification tests pass:

```bash
npm run test:groovy:unit -- EnhancedEmailServiceTest
npm run test:groovy:integration -- EmailNotificationIntegrationTest
```

**Success Criteria**: 100% test pass rate, no functional changes to email content.

---

## Definition of Done

- [ ] `buildTemplateVariables()` method implemented with all template types
- [ ] All 3 notification methods refactored to use new method
- [ ] 5 unit tests written and passing (100% success rate)
- [ ] All existing email notification tests pass (no regression)
- [ ] Code duplication reduced by ≥70% (verified via SonarQube or manual inspection)
- [ ] Code review completed by 1 senior developer
- [ ] ADR-031 type safety compliance verified
- [ ] Parameter validation with `IllegalArgumentException` for required fields
- [ ] Logging added for unknown template types
- [ ] Documentation updated in code comments
- [ ] PR merged to `feature/sprint8-td-016-td-014b-email-notifications-repository-tests`

---

## Dependencies

- **Independent**: Can be implemented independently of TD-017
- **Prerequisite**: PR #69 (TD-016) must be merged
- **Related**: US-058 Email Service Iteration Step Views

---

## Effort Estimate

**Total**: 1 story point (2 hours)

**Breakdown**:

- Implement `buildTemplateVariables()` method: 0.5 hours
- Refactor 3 notification methods to use new method: 0.5 hours
- Write 5 unit tests: 0.75 hours
- Code review and adjustments: 0.25 hours

---

## Risk Assessment

### MEDIUM RISK

- **Template-Specific Logic**: Some notifications may have unique variable requirements
  - **Mitigation**: Use `additionalData` map for template-specific variables

### LOW RISK

- **Functional Regression**: Email content could change unintentionally
  - **Mitigation**: Comprehensive unit tests comparing old vs new variable structure

### LOW RISK

- **Performance Impact**: Method call overhead negligible
  - **Mitigation**: Groovy method calls are fast; no measurable impact expected

---

## Notes

### Code Review Feedback Context

From PR #69 review:

> "Lines 299-390, 520-550, and 643-673 have significant code duplication in template variable construction. This should be extracted to a reusable method to reduce maintenance burden and improve consistency."

### DRY Principle Violation

Current implementation violates Don't Repeat Yourself (DRY):

- Same variable construction logic repeated 3 times
- Any change requires 3 separate edits
- High risk of inconsistency between notification types

**Metric**:

- Current: ~300 lines of duplicated code
- Target: ~90 lines after refactoring (70% reduction)

### Future Extensibility

New method enables easy addition of future notification types:

- Step Assigned notification (future)
- Step Escalated notification (future)
- Iteration Started notification (future)

All future notifications can reuse `buildTemplateVariables()` with minimal code.

### Template Type Constants

Consider adding template type constants to avoid magic strings:

```groovy
class EmailTemplateType {
    static final String STEP_STATUS_CHANGED = 'STEP_STATUS_CHANGED'
    static final String STEP_OPENED = 'STEP_OPENED'
    static final String INSTRUCTION_COMPLETED = 'INSTRUCTION_COMPLETED'
}

// Usage
def variables = buildTemplateVariables(
    stepInstance,
    EmailTemplateType.STEP_STATUS_CHANGED,
    additionalData
)
```

---

## Implementation Checklist

- [ ] Create feature branch: `feature/sprint8-td-018-refactor-template-variables`
- [ ] Add `buildTemplateVariables()` method to `EnhancedEmailService.groovy`
- [ ] Add template type validation with `IllegalArgumentException`
- [ ] Add logging for unknown template types
- [ ] Refactor `sendStepStatusChangedNotification()` to use new method
- [ ] Refactor `sendStepOpenedNotification()` to use new method
- [ ] Refactor `sendInstructionCompletedNotification()` to use new method
- [ ] Write 5 unit tests for all template types and edge cases
- [ ] Run full test suite: `npm run test:groovy:all`
- [ ] Verify code duplication reduction (≥70%)
- [ ] Code review with senior developer
- [ ] Update code comments with refactoring rationale
- [ ] Merge to parent feature branch
- [ ] Update sprint tracking (14.5 → 15.5 points complete)

---

**Story Created By**: Claude Code
**Story Approved By**: [Pending]
**Implementation Start**: [Pending]
**Implementation Complete**: [Pending]
