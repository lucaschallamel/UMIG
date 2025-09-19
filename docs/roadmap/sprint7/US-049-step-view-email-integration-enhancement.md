# US-049: Step View Email Integration Enhancement

**Epic**: User Interface Enhancement + Email Notification Excellence
**Story Points**: 5 (Enhanced scope with email integration)
**Priority**: HIGH
**Sprint**: 7
**Dependencies**: US-058 (EmailService Refactoring), US-056 (StepDTO Architecture)

## Story Summary

As a **system integrator, end user, and operations coordinator**, I want a **simplified Step View that accepts step instance UUIDs directly and integrates with enhanced email notifications** so that I can **access specific steps efficiently, receive automated notifications for status changes, and maintain comprehensive audit trails for step operations**.

## Business Value & Enhanced Scope

### Original Business Value

- **Simplified Integration**: External systems can link directly to specific steps
- **Improved Usability**: Users can bookmark and share direct step links
- **Enhanced Performance**: Single UUID lookup vs hierarchical navigation
- **Mobile Accessibility**: QR codes and short links for mobile device access
- **Reduced Complexity**: Eliminates ambiguity when step IDs might not be unique across iterations

### Enhanced Email Integration Value

- **Automated Notifications**: Step status changes trigger contextual email notifications
- **Instruction Completion Tracking**: Email alerts for instruction completion/uncompletion
- **Comprehensive Audit Trail**: Email-based audit trail for compliance and tracking
- **Team Coordination**: Automated team notifications for step assignments and completions
- **Integration Point**: Foundation for IterationView and other components to use email features

## Current State vs Enhanced Target

### Current State

- Existing StepView requires: `/stepview?migration=X&iteration=Y&stepId=XXX-NNNN`
- Depends on hierarchical navigation through migration → iteration → step
- Assumes step IDs are unique within each iteration
- Multiple API calls needed for complete data resolution
- No integrated email notification capabilities

### Enhanced Target State

- UUID-based Step View: `/stepview-uuid?uuid={step-instance-uuid}`
- Single API endpoint with complete step data including parent hierarchy
- Integrated EmailService for automated notifications
- StepDTO architecture integration for consistent data handling
- Email templates for all step status transitions
- Audit trail integration with email logging

## Enhanced Acceptance Criteria

### AC-049.1: UUID-Based Step View Creation with Email Context

**Given** a step instance UUID and email integration requirements
**When** I navigate to `/stepview-uuid?uuid={step-instance-uuid}`
**Then** the system must:

- [ ] Display complete step information including parent hierarchy context
- [ ] Use the same UI components and styling as existing StepView
- [ ] Load step data with email notification history and preferences
- [ ] Show email notification status for step status changes
- [ ] Provide email notification controls for step operations

### AC-049.2: Enhanced API Integration with StepDTO Architecture

**Given** a step instance UUID and the new StepDTO architecture
**When** the UUID variant loads step data
**Then** it must:

- [ ] Make a single API call to retrieve complete step data using StepInstanceDTO/StepMasterDTO
- [ ] Include step details, parent hierarchy, and all related information
- [ ] Integrate with StepDataTransformationService for consistent data processing
- [ ] Load email notification preferences and history
- [ ] Performance better than or equal to hierarchical approach (<500ms target)

### AC-049.3: EmailService Integration for Status Changes

**Given** the refactored EmailService from US-058
**When** step status changes occur through the UUID-based Step View
**Then** the system must:

- [ ] Trigger appropriate email notifications using EmailService
- [ ] Use email templates for step status change notifications
- [ ] Include complete step context (hierarchy, user, timestamp) in notifications
- [ ] Send notifications to assigned team members and stakeholders
- [ ] Log all email notifications in audit trail
- [ ] Handle email failures gracefully with retry mechanisms

### AC-049.4: Instruction Completion Email Notifications

**Given** step instructions with completion tracking
**When** instructions are marked complete/incomplete through the Step View
**Then** the system must:

- [ ] Send instruction completion email notifications to relevant parties
- [ ] Use instruction-specific email templates with context
- [ ] Include instruction details, completion user, and timestamp
- [ ] Trigger notifications for both completion and uncompletion events
- [ ] Support bulk instruction operations with consolidated notifications
- [ ] Maintain performance targets even with email processing

### AC-049.5: Email Template Integration and Customization

**Given** the email template system from US-058
**When** sending step-related email notifications
**Then** the system must:

- [ ] Use appropriate email templates for different step events:
  - Step status changes (pending → in-progress → completed → failed)
  - Instruction completion/uncompletion
  - Step assignment notifications
  - Step escalation alerts
- [ ] Support template customization with step and hierarchy context
- [ ] Include direct UUID-based links in email notifications
- [ ] Maintain consistent branding and formatting across all step emails

### AC-049.6: Integration Points for IterationView and Other Components

**Given** the need for system-wide email integration
**When** other components need step-related email functionality
**Then** the UUID-based Step View must:

- [ ] Provide reusable email service integration patterns
- [ ] Support programmatic email notification triggering from IterationView
- [ ] Enable email notification preferences management
- [ ] Provide email notification history and status APIs
- [ ] Support bulk operations for multiple steps with email notifications

### AC-049.7: Enhanced Security and Audit Integration

**Given** enterprise security requirements and email compliance
**When** processing step operations with email notifications
**Then** the system must:

- [ ] Validate email recipients against user permissions and roles
- [ ] Log all email notifications in comprehensive audit trail
- [ ] Prevent email-based information disclosure vulnerabilities
- [ ] Support GDPR compliance for email notification preferences
- [ ] Integrate with existing authentication and authorization systems

## Technical Implementation

### Enhanced Frontend Implementation

```javascript
// Enhanced stepview-uuid.html with email integration
class UUIDStepViewWithEmailController {
  constructor() {
    this.emailService = new EmailServiceIntegration();
    this.auditLogger = new AuditLogger();
    this.stepDataTransformationService = new StepDataTransformationService();
  }

  async loadStepByUuid(uuid) {
    try {
      // Single API call with enhanced data including email context
      const response = await fetch(`/api/v2/steps/instance/${uuid}/enhanced`);
      const rawData = await response.json();

      // Use StepDataTransformationService for consistent processing
      const stepData = this.stepDataTransformationService.transform(rawData, {
        includeEmailHistory: true,
        includeNotificationPreferences: true,
        includeHierarchyContext: true,
      });

      return stepData;
    } catch (error) {
      this.auditLogger.logError("stepViewUUID", "loadFailure", { uuid, error });
      throw error;
    }
  }

  async updateStepStatus(stepId, newStatus) {
    try {
      // Update step status
      const response = await fetch(`/api/v2/steps/instance/${stepId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        // Trigger email notification
        await this.emailService.sendStepStatusChangeNotification({
          stepId: stepId,
          newStatus: newStatus,
          user: this.getCurrentUser(),
          timestamp: new Date(),
          directLink: `/stepview-uuid?uuid=${stepId}`,
        });

        // Log audit event
        this.auditLogger.logStepStatusChange(
          stepId,
          newStatus,
          "uuid-step-view",
        );
      }

      return response.json();
    } catch (error) {
      this.auditLogger.logError("stepViewUUID", "statusUpdateFailure", {
        stepId,
        newStatus,
        error,
      });
      throw error;
    }
  }

  async toggleInstructionCompletion(instructionId, completed) {
    try {
      const response = await fetch(
        `/api/v2/instructions/${instructionId}/completion`,
        {
          method: "PUT",
          body: JSON.stringify({ completed: completed }),
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        // Send instruction completion email
        await this.emailService.sendInstructionCompletionNotification({
          instructionId: instructionId,
          completed: completed,
          user: this.getCurrentUser(),
          stepUuid: this.currentStepUuid,
          directLink: `/stepview-uuid?uuid=${this.currentStepUuid}`,
        });

        // Audit log
        this.auditLogger.logInstructionCompletion(
          instructionId,
          completed,
          "uuid-step-view",
        );
      }

      return response.json();
    } catch (error) {
      this.auditLogger.logError("stepViewUUID", "instructionToggleFailure", {
        instructionId,
        completed,
        error,
      });
      throw error;
    }
  }
}
```

### Enhanced Backend API Implementation

```groovy
// Enhanced StepsApi.groovy with email integration
@Path("/instance/{uuid}/enhanced")
stepInstanceByUuidEnhanced(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def uuid = UUID.fromString(binding.variables.uuid as String)

    try {
        // Load step data with email context
        def stepData = StepRepository.findInstanceByUuidWithEmailContext(uuid)

        if (!stepData) {
            return Response.status(404)
                .entity(new JsonBuilder([error: "Step instance not found", uuid: uuid.toString()]).toString())
                .build()
        }

        // Transform using StepDataTransformationService
        def transformedData = StepDataTransformationService.transform(stepData, [
            includeEmailHistory: true,
            includeNotificationPreferences: true,
            includeHierarchyContext: true
        ])

        return Response.ok(new JsonBuilder(transformedData).toString()).build()

    } catch (Exception e) {
        log.error("Failed to load step instance by UUID: ${uuid}", e)
        return Response.status(500)
            .entity(new JsonBuilder([error: "Internal server error", uuid: uuid.toString()]).toString())
            .build()
    }
}

@Path("/instance/{uuid}/status")
updateStepStatusWithNotification(httpMethod: "PUT", groups: ["confluence-users"]) { request, binding ->
    def uuid = UUID.fromString(binding.variables.uuid as String)
    def requestBody = new JsonSlurper().parseText(request.body)
    def newStatus = requestBody.status

    try {
        // Update step status
        def updateResult = StepRepository.updateStepStatus(uuid, newStatus)

        if (updateResult.success) {
            // Get enhanced step data for email context
            def stepContext = StepRepository.findInstanceByUuidWithEmailContext(uuid)

            // Send email notification
            def emailService = getEmailService() // From US-058 refactoring
            emailService.sendStepStatusChangedNotification(stepContext, newStatus, getCurrentUser())

            // Audit logging
            AuditLogRepository.logStepStatusChange(uuid, newStatus, getCurrentUser(), "uuid-step-view")
        }

        return Response.ok(new JsonBuilder(updateResult).toString()).build()

    } catch (Exception e) {
        log.error("Failed to update step status for UUID: ${uuid}", e)
        return Response.status(500)
            .entity(new JsonBuilder([error: "Update failed", uuid: uuid.toString()]).toString())
            .build()
    }
}
```

### Email Service Integration Class

```javascript
// Email service integration for UUID Step View
class EmailServiceIntegration {
  constructor() {
    this.emailServiceEndpoint = "/rest/scriptrunner/latest/custom/emailService";
    this.templateMapping = {
      stepStatusChange: "step-status-change-template",
      instructionCompletion: "instruction-completion-template",
      stepAssignment: "step-assignment-template",
      stepEscalation: "step-escalation-template",
    };
  }

  async sendStepStatusChangeNotification(context) {
    const emailData = {
      templateType: "stepStatusChange",
      templateData: {
        stepId: context.stepId,
        stepName: context.stepName,
        oldStatus: context.oldStatus,
        newStatus: context.newStatus,
        user: context.user,
        timestamp: context.timestamp,
        directLink: context.directLink,
        hierarchy: context.hierarchy,
      },
      recipients: await this.determineRecipients(
        context.stepId,
        "statusChange",
      ),
    };

    return await this.sendEmailNotification(emailData);
  }

  async sendInstructionCompletionNotification(context) {
    const emailData = {
      templateType: "instructionCompletion",
      templateData: {
        instructionId: context.instructionId,
        instructionText: context.instructionText,
        completed: context.completed,
        user: context.user,
        timestamp: new Date(),
        stepDirectLink: context.directLink,
      },
      recipients: await this.determineRecipients(
        context.stepUuid,
        "instructionChange",
      ),
    };

    return await this.sendEmailNotification(emailData);
  }

  async sendEmailNotification(emailData) {
    try {
      const response = await fetch(this.emailServiceEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error(
          `Email service responded with status: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to send email notification:", error);
      throw error;
    }
  }

  async determineRecipients(stepId, notificationType) {
    // Logic to determine email recipients based on step assignments, teams, etc.
    const response = await fetch(
      `/api/v2/steps/${stepId}/notification-recipients?type=${notificationType}`,
    );
    return await response.json();
  }
}
```

## Testing Requirements

### Enhanced Unit Tests

```groovy
// Email integration tests
class StepViewUuidEmailIntegrationTest extends BaseIntegrationTest {

    @Test
    void testStepStatusChangeTriggersEmail() {
        // Given: Step with UUID and email recipients
        def stepUuid = createTestStepInstance()
        def recipients = ['test@example.com']

        // When: Updating step status through UUID endpoint
        def response = stepsApi.updateStepStatusWithNotification(stepUuid, 'completed')

        // Then: Email notification is sent
        assert response.success
        assert emailService.wasNotificationSent(stepUuid, 'stepStatusChange')
        assert emailService.getLastNotification().recipients.containsAll(recipients)
    }

    @Test
    void testInstructionCompletionEmail() {
        // Given: Instruction within step
        def stepUuid = createTestStepInstance()
        def instructionId = createTestInstruction(stepUuid)

        // When: Marking instruction as complete
        def response = instructionsApi.toggleCompletion(instructionId, true)

        // Then: Instruction completion email is sent
        assert response.success
        assert emailService.wasNotificationSent(instructionId, 'instructionCompletion')
    }

    @Test
    void testEmailTemplateUsage() {
        // Given: Step status change
        def stepUuid = createTestStepInstance()

        // When: Status change triggers email
        stepsApi.updateStepStatusWithNotification(stepUuid, 'in-progress')

        // Then: Correct template is used
        def sentEmail = emailService.getLastNotification()
        assert sentEmail.template == 'step-status-change-template'
        assert sentEmail.templateData.newStatus == 'in-progress'
        assert sentEmail.templateData.directLink.contains(stepUuid.toString())
    }
}
```

### Integration Tests with IterationView

```javascript
// Test integration points for IterationView
describe("Step View Email Integration for IterationView", () => {
  test("should support bulk step operations with email notifications", async () => {
    const stepUuids = ["uuid1", "uuid2", "uuid3"];
    const emailService = new EmailServiceIntegration();

    // Simulate bulk status update from IterationView
    const results = await Promise.all(
      stepUuids.map((uuid) =>
        new UUIDStepViewWithEmailController().updateStepStatus(
          uuid,
          "completed",
        ),
      ),
    );

    // Verify all operations succeeded and emails were sent
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(emailService.wasNotificationSent(stepUuids[index])).toBe(true);
    });
  });

  test("should provide email notification history for IterationView", async () => {
    const controller = new UUIDStepViewWithEmailController();
    const stepUuid = "test-step-uuid";

    // Load step with email history
    const stepData = await controller.loadStepByUuid(stepUuid);

    expect(stepData.emailHistory).toBeDefined();
    expect(stepData.emailHistory).toBeInstanceOf(Array);
    expect(stepData.notificationPreferences).toBeDefined();
  });
});
```

## Performance Considerations

### Enhanced Performance Requirements

- **UUID Resolution**: <200ms for step data retrieval with email context
- **Email Processing**: Asynchronous email sending to avoid blocking UI operations
- **Template Processing**: <100ms for email template rendering
- **Bulk Operations**: Support for multiple step operations without performance degradation

### Optimization Strategies

```javascript
// Asynchronous email processing
class AsyncEmailProcessor {
  constructor() {
    this.emailQueue = [];
    this.processing = false;
  }

  async queueEmail(emailData) {
    this.emailQueue.push(emailData);

    if (!this.processing) {
      this.processQueue();
    }
  }

  async processQueue() {
    this.processing = true;

    while (this.emailQueue.length > 0) {
      const emailData = this.emailQueue.shift();
      try {
        await this.sendEmail(emailData);
      } catch (error) {
        console.error("Failed to send queued email:", error);
        // Implement retry logic if needed
      }
    }

    this.processing = false;
  }
}
```

## Integration Points and Future Enhancements

### IterationView Integration

- **Bulk Operations**: Support multiple step operations with consolidated email notifications
- **Real-time Updates**: Email notifications trigger real-time UI updates in IterationView
- **Notification Preferences**: Centralized notification preference management
- **Audit Integration**: Shared audit trail between Step View and IterationView

### Mobile Integration

- **QR Code Generation**: Generate QR codes for UUID-based step links in emails
- **Mobile-Optimized Emails**: Responsive email templates for mobile devices
- **Push Notifications**: Foundation for future push notification integration

### Reporting Integration

- **Email Analytics**: Track email open rates and click-through for step notifications
- **Compliance Reporting**: Email-based audit trails for compliance requirements
- **Performance Metrics**: Email processing performance monitoring

## Risk Assessment

### Technical Risks

| Risk                                   | Impact | Probability | Mitigation                                      |
| -------------------------------------- | ------ | ----------- | ----------------------------------------------- |
| Email service integration complexity   | High   | Medium      | Comprehensive testing, fallback mechanisms      |
| Performance impact of email processing | Medium | Low         | Asynchronous processing, performance monitoring |
| Template compatibility issues          | Medium | Low         | Template validation, backward compatibility     |

### Business Risks

| Risk                                | Impact | Probability | Mitigation                            |
| ----------------------------------- | ------ | ----------- | ------------------------------------- |
| Email notification overload         | Medium | Medium      | Configurable notification preferences |
| Privacy concerns with email data    | High   | Low         | GDPR compliance, data minimization    |
| Integration with existing workflows | Medium | Low         | Gradual rollout, user training        |

## Definition of Done

### Technical Completion

- [ ] UUID-based Step View fully functional with single API endpoint
- [ ] EmailService integration complete with all notification types
- [ ] StepDTO architecture integrated for consistent data handling
- [ ] Performance targets met: <500ms step load, asynchronous email processing
- [ ] Security validation for email recipients and data privacy
- [ ] Comprehensive test coverage: 90% unit tests, 85% integration tests

### Email Integration Completion

- [ ] Step status change email notifications implemented and tested
- [ ] Instruction completion/uncompletion email notifications functional
- [ ] Email templates integrated for all step-related notifications
- [ ] Audit trail integration with email logging complete
- [ ] Integration points established for IterationView and other components
- [ ] Email notification preferences and history management implemented

### Quality Assurance

- [ ] All existing Step View functionality preserved and enhanced
- [ ] Email notifications tested across all step operation scenarios
- [ ] Integration testing with US-058 EmailService refactoring complete
- [ ] Performance benchmarking shows no regression in step operations
- [ ] Security review completed for email integration components
- [ ] User acceptance testing passed for enhanced step workflows

---

**Created**: 2025-07-16
**Status**: Sprint 7 - Ready for Development
**Dependencies**: US-058 (EmailService Refactoring), US-056 (StepDTO Architecture)
**Integration**: Foundation for IterationView email capabilities and system-wide step notifications
