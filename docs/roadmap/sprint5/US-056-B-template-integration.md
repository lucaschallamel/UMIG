# US-056-B: Template Integration - EmailService and Template Standardization

## User Story

**Story ID**: US-056-B  
**Title**: Template Integration - EmailService DTO Integration and Template Standardization  
**Epic**: US-056 JSON-Based Step Data Architecture  
**Priority**: High  
**Story Points**: 3  
**Sprint**: Sprint 6  
**Phase**: Phase 2 of 4 (Strangler Fig Pattern)

## Story Overview

Integrate the StepDataTransferObject into EmailService and EnhancedEmailService, update email templates to use standardized JSON data structure, and resolve the critical recentComments template failures. This story eliminates the data format inconsistencies between repository layer and email template rendering that are causing notification failures.

This phase builds on the DTO foundation from US-056-A to standardize email template data processing while maintaining backward compatibility with existing notification triggers.

## User Story Statement

**As a** UMIG user receiving email notifications  
**I want** email templates to render correctly with consistent Step data from the standardized DTO  
**So that** I receive reliable notifications with properly formatted step information, working URLs, and accurate content that eliminates the current template rendering failures

## Acceptance Criteria

### AC1: EmailService DTO Integration

- **GIVEN** StepDataTransferObject is available from the repository layer (US-056-A)
- **WHEN** EmailService processes step notification requests
- **THEN** EmailService must integrate with StepDataTransferObject:
  - **Replace raw step data usage** with StepDataTransferObject in all notification methods
  - **Update sendStepStatusChanged()** to accept and process StepDataTransferObject
  - **Update sendStepOpened()** to use DTO for template variable population
  - **Update sendInstructionCompleted()** to use standardized step data structure
- **AND** maintain existing method signatures for backward compatibility using adapter pattern
- **AND** implement proper error handling when DTO data is incomplete or missing
- **AND** provide fallback to legacy data format if DTO processing fails

### AC2: EnhancedEmailService DTO Integration

- **GIVEN** EnhancedEmailService handles URL construction and rich content (US-039)
- **WHEN** integrating with StepDataTransferObject for enhanced notifications
- **THEN** EnhancedEmailService must utilize DTO structure:
  - **Use DTO hierarchical context** (migrationCode, iterationCode) for URL construction
  - **Extract template variables** from DTO JSON structure instead of ad-hoc parsing
  - **Leverage DTO comment integration** for recentComments template rendering
  - **Use DTO team information** for recipient list generation and personalization
- **AND** integrate with StepDataTransformationService.toEmailTemplateData()
- **AND** maintain URL construction accuracy with DTO-provided context fields
- **AND** ensure enhanced content rendering works with standardized data structure

### AC3: Email Template Standardization and Variable Mapping

- **GIVEN** email templates currently fail due to inconsistent data structures
- **WHEN** updating templates to use StepDataTransferObject data
- **THEN** standardize template variables across all email templates:
  - **stepName, stepDescription, stepStatus** - consistent naming and format
  - **assignedTeamName, migrationCode, iterationCode** - reliable hierarchical context
  - **stepViewUrl, hasStepViewUrl** - consistent URL construction from DTO context
  - **formattedInstructions, instructionCount** - instruction data from DTO
  - **recentComments, hasActiveComments, lastCommentDate** - comment data from DTO
- **AND** create template variable mapping documentation
- **AND** implement template variable validation to prevent missing data errors
- **AND** ensure consistent date/time formatting across all templates

### AC4: recentComments Template Resolution

- **GIVEN** recentComments template currently fails due to data structure issues
- **WHEN** processing step notifications with comment data
- **THEN** resolve recentComments template rendering:
  - **Use DTO.comments list** with properly structured comment objects
  - **Implement CommentDTO structure** with user info, timestamps, and content
  - **Format comment display** with consistent date formatting and user attribution
  - **Handle empty comments gracefully** with appropriate fallback messages
- **AND** validate comment data structure before template rendering
- **AND** implement security sanitization for comment content in email templates
- **AND** support comment truncation for lengthy comments with "view more" links

### AC5: Template Variable Validation and Error Handling

- **GIVEN** templates require consistent data to render correctly
- **WHEN** processing template variables from StepDataTransferObject
- **THEN** implement comprehensive template variable validation:
  - **Required field validation** - ensure critical template variables are present
  - **Data type validation** - verify dates, UUIDs, and enums are properly formatted
  - **Business logic validation** - check data consistency and relationships
  - **Graceful degradation** - provide default values for missing optional fields
- **AND** create informative error messages for template rendering failures
- **AND** implement monitoring and alerting for template variable validation failures
- **AND** maintain audit trail of validation errors for debugging

### AC6: Backward Compatibility and Migration Support

- **GIVEN** existing notification triggers must continue to function
- **WHEN** implementing DTO-based template processing
- **THEN** ensure seamless backward compatibility:
  - **Legacy notification calls** continue to work without modification
  - **Adapter pattern** converts legacy data formats to DTO automatically
  - **Feature flags** control DTO vs legacy template processing
  - **Fallback mechanisms** handle DTO processing failures gracefully
- **AND** implement comprehensive logging to track template processing method usage
- **AND** provide migration utilities for notification trigger updates

## Technical Requirements

### EmailService Architecture

- **DTO Integration**: Seamless integration with StepDataTransferObject from repository
- **Template Processing**: Standardized template variable population from DTO JSON
- **Error Handling**: Comprehensive error handling for DTO processing failures
- **Performance**: Maintain email processing performance while adding DTO processing

### Template Engine Integration

- **Variable Mapping**: Consistent mapping from DTO fields to template variables
- **Data Validation**: Runtime validation of template variables before rendering
- **Security**: HTML/content sanitization from DTO data for email safety
- **Formatting**: Consistent date, number, and text formatting across templates

### Comment Integration

- **CommentDTO Structure**: Nested comment objects within StepDataTransferObject
- **Template Rendering**: Proper comment list rendering in recentComments template
- **Security**: Comment content sanitization and XSS prevention
- **Performance**: Efficient comment data loading and processing

## Implementation Details

### Phase 2 Core Components

1. **Enhanced EmailService Integration**:

   ```groovy
   @Service
   class EmailService {
       // Updated method signatures with DTO support
       void sendStepStatusChanged(StepDataTransferObject stepDTO, String newStatus)
       void sendStepOpened(StepDataTransferObject stepDTO, String userId)
       void sendInstructionCompleted(StepDataTransferObject stepDTO, String instructionId)

       // Backward compatibility adapters
       void sendStepStatusChanged(Map stepData, String newStatus) {
           StepDataTransferObject dto = transformationService.fromLegacyStepData(stepData)
           sendStepStatusChanged(dto, newStatus)
       }

       // Template variable population from DTO
       private Map buildTemplateVariables(StepDataTransferObject dto) {
           return transformationService.toEmailTemplateData(dto)
       }
   }
   ```

2. **EnhancedEmailService DTO Integration**:

   ```groovy
   @Service
   class EnhancedEmailService extends EmailService {
       // URL construction using DTO context
       String constructStepViewUrl(StepDataTransferObject dto) {
           return urlConstructionService.buildStepUrl(
               dto.migrationCode,
               dto.iterationCode,
               dto.stepInstanceId
           )
       }

       // Rich content processing from DTO
       Map buildEnhancedTemplateVariables(StepDataTransferObject dto) {
           Map variables = super.buildTemplateVariables(dto)
           variables.putAll([
               stepViewUrl: constructStepViewUrl(dto),
               hasStepViewUrl: true,
               recentComments: formatCommentsForEmail(dto.comments),
               hasActiveComments: dto.hasActiveComments ?: false
           ])
           return variables
       }
   }
   ```

3. **CommentDTO Structure**:

   ```groovy
   @JsonSerializable
   class CommentDTO {
       String commentId
       String commentText
       String authorName
       String authorUsername
       Date createdDate
       Boolean isInternal
       String status

       // Template-friendly formatting
       String getFormattedDate() {
           return createdDate.format("MMM dd, yyyy HH:mm")
       }

       String getTruncatedText(int maxLength = 200) {
           return commentText.length() > maxLength ?
               commentText.substring(0, maxLength) + "..." : commentText
       }
   }
   ```

4. **Updated Email Templates**:

   ```html
   <!-- stepStatusChanged.html template -->
   <h2>Step Status Update: ${stepName}</h2>
   <p><strong>Status:</strong> ${stepStatus}</p>
   <p><strong>Migration:</strong> ${migrationCode} - ${iterationCode}</p>
   <p><strong>Assigned Team:</strong> ${assignedTeamName}</p>

   <#if stepDescription?has_content>
   <p><strong>Description:</strong> ${stepDescription}</p>
   </#if>

   <#if hasActiveComments>
   <h3>Recent Comments</h3>
   <#list recentComments as comment>
   <div class="comment">
       <p><strong>${comment.authorName}</strong> - ${comment.formattedDate}</p>
       <p>${comment.truncatedText}</p>
   </div>
   </#list>
   </#if>

   <#if hasStepViewUrl>
   <p><a href="${stepViewUrl}" class="button">View Step in UMIG</a></p>
   </#if>
   ```

5. **Template Variable Validation**:

   ```groovy
   @Component
   class TemplateVariableValidator {
       ValidationResult validateStepTemplateVariables(Map variables) {
           ValidationResult result = new ValidationResult()

           // Required field validation
           if (!variables.stepName) {
               result.addError("stepName is required for email template")
           }
           if (!variables.stepStatus) {
               result.addError("stepStatus is required for email template")
           }

           // Data type validation
           if (variables.createdDate && !(variables.createdDate instanceof Date)) {
               result.addError("createdDate must be a valid Date object")
           }

           // Business logic validation
           if (variables.hasActiveComments && !variables.recentComments) {
               result.addWarning("hasActiveComments is true but no recentComments provided")
           }

           return result
       }
   }
   ```

## Dependencies

### Prerequisites

- **US-056-A**: Service Layer Standardization must be completed
- StepDataTransferObject and transformation services available
- Current EmailService and EnhancedEmailService implementations
- Existing email templates and template engine infrastructure

### Parallel Work

- Can coordinate with US-039 Enhanced Email Notifications for rich content features
- Supports US-031 Admin GUI for notification configuration management

### Blocked By

- **US-056-A completion**: Cannot proceed without DTO foundation and transformation services

## Risk Assessment

### Technical Risks

1. **Template Rendering Compatibility**
   - **Risk**: Updated templates may not render correctly with existing data
   - **Mitigation**: Comprehensive template testing, backward compatibility adapters
   - **Likelihood**: Medium | **Impact**: Medium

2. **Comment Data Complexity**
   - **Risk**: CommentDTO integration may be more complex than anticipated
   - **Mitigation**: Incremental development, focused unit testing, simple fallbacks
   - **Likelihood**: Medium | **Impact**: Low

3. **Performance Impact from Template Processing**
   - **Risk**: Additional DTO processing may slow email generation
   - **Mitigation**: Performance testing, caching strategies, optimization
   - **Likelihood**: Low | **Impact**: Medium

### Business Risks

1. **Email Notification Disruption**
   - **Risk**: Template changes may temporarily disrupt email notifications
   - **Mitigation**: Staged rollout, feature flags, comprehensive testing
   - **Likelihood**: Low | **Impact**: High

## Testing Strategy

### Unit Testing (Target: 95% Coverage)

1. **EmailService DTO Integration Tests**:
   - DTO to template variable mapping accuracy
   - Backward compatibility with legacy method signatures
   - Error handling for incomplete or malformed DTO data
   - Template variable validation logic

2. **Template Rendering Tests**:
   - All email templates render correctly with DTO data
   - Comment formatting and truncation logic
   - Date and time formatting consistency
   - URL construction integration

3. **CommentDTO Tests**:
   - JSON serialization/deserialization
   - Template-friendly formatting methods
   - Content sanitization and security

### Integration Testing

1. **End-to-End Email Flow**:
   - Step status change → DTO creation → email template rendering → delivery
   - Instruction completion → DTO processing → enhanced email with comments
   - Step opened → DTO integration → URL construction → clickable links

2. **Template Validation Tests**:
   - Template variable validation with production-like data
   - Error handling for missing or invalid template variables
   - Graceful degradation when optional data is missing

### Email Client Testing

1. **Template Rendering Validation**:
   - All updated templates render correctly across major email clients
   - Comment formatting displays properly on mobile and desktop
   - URL construction works correctly in all email environments

## Definition of Done

### Development Complete

- [ ] EmailService integrated with StepDataTransferObject for all notification methods
- [ ] EnhancedEmailService DTO integration with URL construction support
- [ ] CommentDTO structure implemented with template-friendly formatting
- [ ] All email templates updated to use standardized DTO variables
- [ ] recentComments template resolution completed and tested
- [ ] Template variable validation implemented with comprehensive error handling
- [ ] Backward compatibility maintained through adapter pattern

### Testing Complete

- [ ] Unit tests achieving ≥95% coverage for all email service DTO integration
- [ ] Integration tests validating end-to-end email flow with DTO data
- [ ] Template rendering tests confirming all templates work with DTO variables
- [ ] Email client compatibility tests for updated template formatting
- [ ] Comment integration tests validating recentComments template resolution

### Documentation Complete

- [ ] **ADR-049**: Template Integration and DTO Email Processing documented
- [ ] Template variable mapping documentation with examples
- [ ] Comment integration guide for developers
- [ ] Migration guide for email template updates

### Quality Assurance

- [ ] Code review completed focusing on template security and data consistency
- [ ] Email security review for comment content sanitization
- [ ] Performance testing confirms email generation speed maintained
- [ ] Backward compatibility validated with existing notification triggers

## Story Points: 3

**Complexity Factors:**

- **Template Integration**: Medium - updating templates with standardized variables
- **Comment Resolution**: High - implementing CommentDTO and resolving recentComments failures
- **Backward Compatibility**: Medium - maintaining existing notification functionality
- **Email Service Integration**: Medium - integrating DTO with multiple email service layers
- **Validation Logic**: Medium - implementing template variable validation

**Risk Adjustment**: Base complexity appropriate for template integration work

**Total Estimated Effort**: 12 hours

## Related ADRs

- **ADR-049**: Template Integration and Backward Compatibility Approach (to be created)
- **ADR-048**: StepDataTransferObject Design and JSON Schema (from US-056-A)
- **ADR-032**: Email Notification Architecture (existing foundation)
- **ADR-039**: Enhanced Error Handling and User Guidance (existing patterns)

## Implementation Notes

### Development Approach

- Start with CommentDTO structure and recentComments template resolution
- Update EmailService methods incrementally with DTO integration
- Implement comprehensive template variable validation
- Use feature flags to control DTO vs legacy template processing

### Template Security

- All DTO data must be sanitized before template rendering
- Comment content requires XSS prevention and HTML encoding
- URL construction must validate all parameters from DTO context

### Performance Considerations

- Template variable population should be optimized for common scenarios
- Comment data loading should be efficient and cached where appropriate
- Template rendering performance must be monitored and maintained

## Change Log

| Date       | Version | Changes                | Author |
| ---------- | ------- | ---------------------- | ------ |
| 2025-08-27 | 1.0     | Initial story creation | System |

---

**Story Status**: Ready for Sprint 6 Implementation  
**Next Phase**: US-056-C API Layer Integration  
**Risk Level**: Medium (template compatibility requires careful testing)  
**Strategic Priority**: High (resolves critical email template rendering failures)
