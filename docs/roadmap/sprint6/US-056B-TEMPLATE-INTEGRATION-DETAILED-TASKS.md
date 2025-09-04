# US-056B Template Integration - Detailed Implementation Tasks

## Overview

**Epic**: JSON-based Step Data Architecture
**User Story**: US-056B Template Integration for JSON-based step instruction generation
**Sprint**: 6
**Dependencies**: US-034 (Data Import), US-039 (Enhanced Email), US-058 (Testing Modernization)

This document provides comprehensive implementation tasks for integrating template-based step instruction generation with JSON schema support, building upon the established UMIG architecture patterns and service layer standardization from US-056A.

---

## 🏗️ Phase 1: CommentDTO Structure Design & Integration

### Task 1.1: Create CommentDTO Class Foundation
**Priority**: High | **Effort**: 3 points | **Risk**: Low

#### Implementation Details
```groovy
package umig.dto

import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import groovy.transform.ToString
import groovy.transform.EqualsAndHashCode
import java.time.LocalDateTime

/**
 * Comment Data Transfer Object for US-056B Template Integration
 * 
 * Provides structured comment data for template rendering and JSON serialization.
 * Integrates with StepDataTransferObject for comprehensive step information display.
 * 
 * Following UMIG patterns:
 * - ADR-031 Type Safety with explicit casting
 * - JSON-first design for modern template integration
 * - Defensive programming with null safety
 */
@ToString(includeNames = true)
@EqualsAndHashCode(includes = ['commentId'])
@JsonIgnoreProperties(ignoreUnknown = true)
class CommentDTO {
    
    @JsonProperty("commentId")
    String commentId
    
    @JsonProperty("stepInstanceId")
    String stepInstanceId
    
    @JsonProperty("userId")
    Integer userId
    
    @JsonProperty("userDisplayName")
    String userDisplayName
    
    @JsonProperty("commentText")
    String commentText
    
    @JsonProperty("commentType")
    String commentType  // STATUS_CHANGE, USER_NOTE, SYSTEM_UPDATE
    
    @JsonProperty("isInternal")
    Boolean isInternal
    
    @JsonProperty("createdDate")
    LocalDateTime createdDate
    
    @JsonProperty("lastModifiedDate") 
    LocalDateTime lastModifiedDate
    
    // Template-specific fields
    @JsonProperty("formattedDate")
    String formattedDate
    
    @JsonProperty("commentHtml")
    String commentHtml
    
    @JsonProperty("statusChange")
    Map<String, String> statusChange  // oldStatus -> newStatus for status change comments
}
```

#### Acceptance Criteria
- [ ] CommentDTO implements all required JSON serialization annotations
- [ ] Type safety follows ADR-031 explicit casting patterns
- [ ] Integration with existing Jackson ObjectMapper configuration
- [ ] Comprehensive null safety for all fields
- [ ] Template-friendly field names (camelCase)

---

### Task 1.2: Integrate CommentDTO with StepDataTransferObject
**Priority**: High | **Effort**: 2 points | **Risk**: Low

#### Implementation Details
**File**: `src/groovy/umig/dto/StepDataTransferObject.groovy`

Add comment integration to existing DTO:
```groovy
// Add to StepDataTransferObject class
@JsonProperty("recentComments")
List<CommentDTO> recentComments = []

@JsonProperty("commentCount")
Integer commentCount = 0

@JsonProperty("hasUnreadComments") 
Boolean hasUnreadComments = false

@JsonProperty("lastCommentDate")
LocalDateTime lastCommentDate
```

#### Acceptance Criteria
- [ ] Comments field added to StepDataTransferObject without breaking existing functionality
- [ ] Backward compatibility maintained for existing API consumers
- [ ] JSON serialization includes comment data when present
- [ ] Performance impact minimal (lazy loading where appropriate)

---

### Task 1.3: Enhance StepDataTransformationService for Comments
**Priority**: High | **Effort**: 5 points | **Risk**: Medium

#### Implementation Details
**File**: `src/groovy/umig/service/StepDataTransformationService.groovy`

Add comment transformation methods:
```groovy
/**
 * Transform database comment results to CommentDTO list
 * Handles comment data from step-related queries with proper type conversion
 */
List<CommentDTO> transformComments(List<Map> commentRows) {
    if (!commentRows) return []
    
    return commentRows.collect { row ->
        new CommentDTO(
            commentId: safeUUIDToString(row.comment_id),
            stepInstanceId: safeUUIDToString(row.sti_id),
            userId: safeInteger(row.user_id),
            userDisplayName: safeString(row.user_display_name),
            commentText: safeString(row.comment_text),
            commentType: safeString(row.comment_type),
            isInternal: safeBoolean(row.is_internal, false),
            createdDate: safeTimestampToLocalDateTime(row.created_date),
            lastModifiedDate: safeTimestampToLocalDateTime(row.last_modified_date),
            formattedDate: formatDateForTemplate(safeTimestampToLocalDateTime(row.created_date)),
            commentHtml: sanitizeHtmlForTemplate(safeString(row.comment_text)),
            statusChange: parseStatusChange(row)
        )
    }
}

/**
 * Format comment date for template display
 */
private String formatDateForTemplate(LocalDateTime dateTime) {
    if (!dateTime) return ""
    return dateTime.format(DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' HH:mm"))
}

/**
 * Sanitize comment text for HTML template rendering
 */
private String sanitizeHtmlForTemplate(String text) {
    if (!text) return ""
    // Basic HTML sanitization for email templates
    return text.replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;')
              .replaceAll('\n', '<br>')
}

/**
 * Parse status change information from comment row
 */
private Map<String, String> parseStatusChange(Map row) {
    def oldStatus = safeString(row.old_status)
    def newStatus = safeString(row.new_status)
    
    if (oldStatus && newStatus) {
        return [oldStatus: oldStatus, newStatus: newStatus]
    }
    return null
}
```

#### Acceptance Criteria
- [ ] Comment transformation preserves all essential data
- [ ] HTML sanitization prevents XSS in email templates
- [ ] Date formatting is consistent across all templates
- [ ] Status change parsing handles all edge cases
- [ ] Performance optimized for bulk comment processing

---

## 🏗️ Phase 2: EmailService Integration Pattern

### Task 2.1: Create EmailServiceAdapter for Backward Compatibility
**Priority**: High | **Effort**: 4 points | **Risk**: Medium

#### Implementation Details
**File**: `src/groovy/umig/utils/EmailServiceAdapter.groovy`

```groovy
package umig.utils

import umig.dto.StepDataTransferObject
import umig.dto.CommentDTO
import umig.service.StepDataTransformationService
import groovy.util.logging.Slf4j

/**
 * EmailService Adapter for US-056B Template Integration
 * 
 * Provides backward compatibility while enabling new JSON-based template rendering.
 * Bridges existing EmailService methods with new DTO-based approach.
 * 
 * Migration Strategy:
 * 1. Maintain existing method signatures
 * 2. Transform legacy data to DTOs internally
 * 3. Use enhanced templates when available
 * 4. Fallback to legacy templates for compatibility
 */
@Slf4j
class EmailServiceAdapter {
    
    private static final StepDataTransformationService transformationService = new StepDataTransformationService()
    
    /**
     * Enhanced step status change notification with DTO support
     * Backward compatible with existing EnhancedEmailService calls
     */
    static void sendStepStatusChangedNotification(Map stepInstance, List<Map> teams, Map cutoverTeam,
                                                String oldStatus, String newStatus, Integer userId = null,
                                                String migrationCode = null, String iterationCode = null) {
        
        log.info("EmailServiceAdapter: Processing step status change notification for step: ${stepInstance?.sti_name}")
        
        try {
            // Transform legacy stepInstance Map to StepDataTransferObject
            def stepDTO = transformLegacyStepToDTO(stepInstance, migrationCode, iterationCode)
            
            // Load recent comments for enhanced template context
            def recentComments = loadRecentCommentsForStep(stepInstance.sti_id)
            stepDTO.recentComments = recentComments
            stepDTO.commentCount = recentComments.size()
            
            // Try enhanced template first, fallback to legacy
            if (hasEnhancedTemplate('STEP_STATUS_CHANGED_V2')) {
                sendEnhancedNotification(stepDTO, teams, cutoverTeam, oldStatus, newStatus, userId)
            } else {
                // Fallback to existing EnhancedEmailService
                EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
                    stepInstance, teams, cutoverTeam, oldStatus, newStatus, userId, migrationCode, iterationCode
                )
            }
            
        } catch (Exception e) {
            log.error("EmailServiceAdapter: Failed to send enhanced notification, falling back to legacy", e)
            // Guaranteed fallback to working implementation
            EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
                stepInstance, teams, cutoverTeam, oldStatus, newStatus, userId, migrationCode, iterationCode
            )
        }
    }
    
    /**
     * Transform legacy step Map to StepDataTransferObject
     */
    private static StepDataTransferObject transformLegacyStepToDTO(Map stepInstance, String migrationCode, String iterationCode) {
        // Simulate database row structure for transformation service
        def syntheticRow = [
            sti_id: stepInstance.sti_id,
            sti_name: stepInstance.sti_name,
            sti_description: stepInstance.sti_description,
            sti_status: stepInstance.sti_status,
            migration_code: migrationCode,
            iteration_code: iterationCode,
            // Add other mappings as needed
        ]
        
        return transformationService.fromDatabaseRow(syntheticRow)
    }
    
    /**
     * Load recent comments for template context
     */
    private static List<CommentDTO> loadRecentCommentsForStep(def stepInstanceId, int limit = 5) {
        // Implementation will query comment table and transform to DTOs
        return []  // Placeholder - implement based on comment data structure
    }
    
    /**
     * Check if enhanced template version exists
     */
    private static boolean hasEnhancedTemplate(String templateType) {
        return DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                SELECT COUNT(*) as count 
                FROM email_template_emt 
                WHERE emt_template_type = ? AND emt_is_active = true
            """, [templateType])
            return result.count > 0
        }
    }
    
    /**
     * Send notification using enhanced DTO-based templates
     */
    private static void sendEnhancedNotification(StepDataTransferObject stepDTO, List<Map> teams, 
                                               Map cutoverTeam, String oldStatus, String newStatus, Integer userId) {
        // Implementation for new template system
        log.info("Sending enhanced DTO-based notification for step: ${stepDTO.stepName}")
        // TODO: Implement enhanced template rendering
    }
}
```

#### Acceptance Criteria
- [ ] Maintains 100% backward compatibility with existing EmailService calls
- [ ] Successfully transforms legacy data structures to DTOs
- [ ] Graceful fallback when enhanced templates unavailable
- [ ] Performance impact minimal for existing flows
- [ ] Comprehensive error handling prevents notification failures

---

### Task 2.2: Enhance Email Template Variable Population
**Priority**: Medium | **Effort**: 3 points | **Risk**: Low

#### Implementation Details
**File**: `src/groovy/umig/utils/EmailTemplateProcessor.groovy`

Create new template processor supporting both legacy and DTO-based variables:
```groovy
package umig.utils

import umig.dto.StepDataTransferObject
import umig.dto.CommentDTO
import groovy.text.SimpleTemplateEngine
import groovy.util.logging.Slf4j

/**
 * Email Template Processor for US-056B Template Integration
 * 
 * Handles template variable population for both legacy and enhanced templates.
 * Provides consistent variable naming and fallback handling.
 */
@Slf4j
class EmailTemplateProcessor {
    
    private static final SimpleTemplateEngine templateEngine = new SimpleTemplateEngine()
    
    /**
     * Process template with StepDataTransferObject context
     * Provides rich context including recent comments and hierarchical data
     */
    static String processTemplate(String templateContent, StepDataTransferObject stepData, Map additionalContext = [:]) {
        
        def templateContext = [
            // Core step data
            step: stepData,
            
            // Legacy compatibility variables
            stepName: stepData.stepName,
            stepDescription: stepData.stepDescription,
            stepStatus: stepData.stepStatus,
            assignedTeamName: stepData.assignedTeamName,
            
            // Enhanced context
            recentComments: stepData.recentComments,
            commentCount: stepData.commentCount,
            hasComments: stepData.recentComments?.size() > 0,
            
            // Hierarchical context
            migrationCode: stepData.migrationCode,
            iterationCode: stepData.iterationCode,
            
            // Utility functions for templates
            formatDate: { date -> formatDateForTemplate(date) },
            truncateText: { text, length -> truncateText(text, length) },
            
            // Additional context from caller
        ] + additionalContext
        
        try {
            def template = templateEngine.createTemplate(templateContent)
            return template.make(templateContext).toString()
        } catch (Exception e) {
            log.error("Template processing failed", e)
            return generateFallbackContent(stepData, additionalContext)
        }
    }
    
    /**
     * Legacy template processing for backward compatibility
     */
    static String processLegacyTemplate(String templateContent, Map legacyContext) {
        try {
            def template = templateEngine.createTemplate(templateContent)
            return template.make(legacyContext).toString()
        } catch (Exception e) {
            log.error("Legacy template processing failed", e)
            return "Notification content temporarily unavailable"
        }
    }
    
    private static String formatDateForTemplate(def date) {
        // Consistent date formatting across all templates
        return date ? date.format("MMM dd, yyyy 'at' HH:mm") : ""
    }
    
    private static String truncateText(String text, int maxLength) {
        if (!text || text.length() <= maxLength) return text
        return text.substring(0, maxLength - 3) + "..."
    }
    
    private static String generateFallbackContent(StepDataTransferObject stepData, Map context) {
        return """
        Step Update: ${stepData.stepName}
        Status: ${stepData.stepStatus}
        Migration: ${stepData.migrationCode}
        
        For full details, please check the UMIG application.
        """.stripIndent()
    }
}
```

#### Acceptance Criteria
- [ ] Template variable population works for both legacy and DTO contexts
- [ ] Graceful fallback when template processing fails
- [ ] Rich context includes comments and hierarchical data
- [ ] Performance optimized for template processing
- [ ] Template utility functions enhance email readability

---

## 🏗️ Phase 3: Template Standardization Implementation

### Task 3.1: Resolve recentComments Template Failures
**Priority**: High | **Effort**: 4 points | **Risk**: High

#### Root Cause Analysis
The existing template failures likely stem from:
1. Inconsistent comment data structure across different query contexts
2. Missing null safety in template variable access
3. Comment data not being populated in certain email flows

#### Implementation Details
**File**: `src/groovy/umig/repository/StepRepository.groovy`

Enhance step queries to include comment data:
```groovy
/**
 * Enhanced step query with comment integration for template compatibility
 * Addresses recentComments template failures by ensuring consistent comment data
 */
List<Map> findStepsWithCommentsForTemplate(UUID stepInstanceId) {
    return DatabaseUtil.withSql { sql ->
        def query = """
            SELECT 
                -- Core step data
                sti.sti_id, sti.sti_name, sti.sti_description, sti.sti_status,
                stm.stm_id, stm.stm_name, stm.stm_description,
                
                -- Team assignment
                tms.tms_id, tms.tms_name,
                
                -- Hierarchical context
                mig.mig_id, mig.mig_code,
                itr.itr_id, itr.itr_code,
                
                -- Recent comments (with JSON aggregation for PostgreSQL)
                COALESCE(
                    json_agg(
                        json_build_object(
                            'comment_id', sc.comment_id,
                            'comment_text', sc.comment_text,
                            'user_display_name', sc.user_display_name,
                            'created_date', sc.created_date,
                            'comment_type', sc.comment_type
                        ) ORDER BY sc.created_date DESC
                    ) FILTER (WHERE sc.comment_id IS NOT NULL),
                    '[]'::json
                ) as recent_comments_json,
                
                COUNT(sc.comment_id) as comment_count
                
            FROM step_instance_sti sti
            JOIN step_master_stm stm ON sti.stm_id = stm.stm_id
            LEFT JOIN team_master_tms tms ON sti.tms_id = tms.tms_id
            LEFT JOIN migration_mig mig ON sti.mig_id = mig.mig_id
            LEFT JOIN iteration_itr itr ON sti.itr_id = itr.itr_id
            LEFT JOIN step_comments sc ON sti.sti_id = sc.step_instance_id
                AND sc.created_date >= NOW() - INTERVAL '30 days'  -- Recent comments only
            
            WHERE sti.sti_id = ?
            GROUP BY sti.sti_id, stm.stm_id, tms.tms_id, mig.mig_id, itr.itr_id
        """
        
        def result = sql.firstRow(query, [stepInstanceId])
        if (!result) return [:]
        
        // Parse JSON comments back to list for template compatibility
        def commentsJson = result.recent_comments_json
        def commentsList = []
        if (commentsJson && commentsJson != '[]') {
            try {
                def parsedComments = new groovy.json.JsonSlurper().parseText(commentsJson.toString())
                commentsList = parsedComments.collect { comment ->
                    [
                        comment_id: comment.comment_id,
                        comment_text: comment.comment_text,
                        user_display_name: comment.user_display_name,
                        created_date: comment.created_date,
                        comment_type: comment.comment_type,
                        formatted_date: formatCommentDate(comment.created_date)
                    ]
                }
            } catch (Exception e) {
                log.error("Failed to parse comments JSON for step ${stepInstanceId}", e)
            }
        }
        
        result.recent_comments = commentsList
        result.comment_count = result.comment_count ?: 0
        result.has_comments = commentsList.size() > 0
        
        return result
    }
}
```

#### Template Fixes
**File**: Email template updates in database

Update existing templates to handle comment data safely:
```html
<!-- Safe comment iteration with null checks -->
<% if (step?.recentComments && step.recentComments.size() > 0) { %>
    <div class="comments-section">
        <h3>Recent Comments (${step.commentCount})</h3>
        <% step.recentComments.take(3).each { comment -> %>
            <div class="comment">
                <strong>${comment.userDisplayName ?: 'System'}</strong>
                <span class="comment-date">${comment.formattedDate ?: 'Recently'}</span>
                <p>${comment.commentText ?: 'No content'}</p>
            </div>
        <% } %>
        <% if (step.commentCount > 3) { %>
            <p><em>... and ${step.commentCount - 3} more comments</em></p>
        <% } %>
    </div>
<% } else { %>
    <div class="no-comments">
        <p><em>No recent comments</em></p>
    </div>
<% } %>
```

#### Acceptance Criteria
- [ ] All existing recentComments template failures resolved
- [ ] Comment data consistently available across all email templates
- [ ] Null safety prevents template rendering exceptions
- [ ] Performance impact minimal for comment data loading
- [ ] Backward compatibility maintained for existing templates

---

### Task 3.2: Template Variable Validation Framework
**Priority**: Medium | **Effort**: 3 points | **Risk**: Low

#### Implementation Details
**File**: `src/groovy/umig/utils/TemplateValidator.groovy`

```groovy
package umig.utils

import umig.dto.StepDataTransferObject
import groovy.util.logging.Slf4j
import java.util.regex.Pattern

/**
 * Template Variable Validation Framework for US-056B
 * 
 * Validates template variables before rendering to prevent runtime failures.
 * Provides detailed validation reports for template debugging.
 */
@Slf4j
class TemplateValidator {
    
    // Common template variable patterns
    private static final Pattern VARIABLE_PATTERN = ~/\$\{([^}]+)\}/
    private static final Pattern METHOD_CALL_PATTERN = ~/\$\{(\w+)\.([^}]+)\}/
    
    /**
     * Validate template against StepDataTransferObject context
     * Returns validation result with missing variables and recommendations
     */
    static ValidationResult validateTemplate(String templateContent, StepDataTransferObject stepData) {
        def result = new ValidationResult()
        def requiredVariables = extractVariables(templateContent)
        def availableContext = buildValidationContext(stepData)
        
        requiredVariables.each { variable ->
            if (!isVariableAvailable(variable, availableContext)) {
                result.missingVariables << variable
                result.recommendations << generateRecommendation(variable)
            } else if (getVariableValue(variable, availableContext) == null) {
                result.nullVariables << variable
                result.warnings << "Variable '${variable}' is null and may cause template issues"
            }
        }
        
        result.isValid = result.missingVariables.isEmpty()
        return result
    }
    
    /**
     * Extract all variable references from template content
     */
    private static Set<String> extractVariables(String templateContent) {
        def variables = new HashSet<String>()
        def matcher = VARIABLE_PATTERN.matcher(templateContent)
        
        while (matcher.find()) {
            variables.add(matcher.group(1).trim())
        }
        
        return variables
    }
    
    /**
     * Build validation context from StepDataTransferObject
     */
    private static Map buildValidationContext(StepDataTransferObject stepData) {
        return [
            step: stepData,
            stepName: stepData.stepName,
            stepDescription: stepData.stepDescription,
            stepStatus: stepData.stepStatus,
            assignedTeamName: stepData.assignedTeamName,
            migrationCode: stepData.migrationCode,
            iterationCode: stepData.iterationCode,
            recentComments: stepData.recentComments ?: [],
            commentCount: stepData.commentCount ?: 0,
            hasComments: (stepData.recentComments?.size() ?: 0) > 0
        ]
    }
    
    /**
     * Check if variable is available in context
     */
    private static boolean isVariableAvailable(String variable, Map context) {
        def parts = variable.split('\\.')
        def current = context
        
        for (String part : parts) {
            if (current == null || !current.containsKey(part)) {
                return false
            }
            current = current[part]
        }
        return true
    }
    
    private static def getVariableValue(String variable, Map context) {
        def parts = variable.split('\\.')
        def current = context
        
        for (String part : parts) {
            if (current == null) return null
            current = current[part]
        }
        return current
    }
    
    private static String generateRecommendation(String missingVariable) {
        switch (missingVariable) {
            case ~/.*recentComments.*/:
                return "Ensure comment data is loaded with step query. Use StepRepository.findStepsWithCommentsForTemplate()"
            case ~/.*Comment.*/:
                return "Comment-related variables require comment data in template context"
            case ~/.*team.*/:
                return "Team variables require team assignment data in step context"
            default:
                return "Add '${missingVariable}' to template context or update template to handle missing data"
        }
    }
    
    static class ValidationResult {
        boolean isValid = false
        List<String> missingVariables = []
        List<String> nullVariables = []
        List<String> warnings = []
        List<String> recommendations = []
        
        @Override
        String toString() {
            def sb = new StringBuilder()
            sb.append("Template Validation Result:\n")
            sb.append("  Valid: ${isValid}\n")
            if (missingVariables) sb.append("  Missing Variables: ${missingVariables.join(', ')}\n")
            if (nullVariables) sb.append("  Null Variables: ${nullVariables.join(', ')}\n")
            if (warnings) sb.append("  Warnings: ${warnings.join('\n    ')}\n")
            if (recommendations) sb.append("  Recommendations: ${recommendations.join('\n    ')}\n")
            return sb.toString()
        }
    }
}
```

#### Acceptance Criteria
- [ ] Template validation identifies missing variables before rendering
- [ ] Validation provides actionable recommendations for template fixes
- [ ] Framework integrates with existing email template processing
- [ ] Performance impact negligible for production email sending
- [ ] Validation reports help developers debug template issues

---

## 🏗️ Phase 4: Testing Strategy Integration

### Task 4.1: Leverage US-058 Testing Infrastructure
**Priority**: High | **Effort**: 4 points | **Risk**: Medium

#### Implementation Details
**File**: `src/groovy/umig/tests/integration/TemplateIntegrationTest.groovy`

```groovy
package umig.tests.integration

import umig.dto.StepDataTransferObject
import umig.dto.CommentDTO
import umig.utils.EmailServiceAdapter
import umig.utils.TemplateValidator
import umig.service.StepDataTransformationService
import umig.repository.StepRepository
import umig.tests.integration.BaseIntegrationTest

/**
 * Template Integration Tests for US-056B
 * 
 * Leverages US-058 testing infrastructure for comprehensive template validation.
 * Tests both legacy compatibility and enhanced template features.
 */
class TemplateIntegrationTest extends BaseIntegrationTest {
    
    private StepDataTransformationService transformationService
    private StepRepository stepRepository
    
    void setUp() {
        super.setUp()
        transformationService = new StepDataTransformationService()
        stepRepository = new StepRepository()
    }
    
    void testStepDataTransformationWithComments() {
        given: "A step with comments in the database"
        def stepId = createTestStepWithComments()
        
        when: "Transforming step data for templates"
        def stepData = stepRepository.findStepsWithCommentsForTemplate(stepId)
        def stepDTO = transformationService.fromDatabaseRow(stepData)
        
        then: "DTO contains properly formatted comment data"
        stepDTO.stepId != null
        stepDTO.recentComments != null
        stepDTO.commentCount >= 0
        stepDTO.recentComments.each { comment ->
            assert comment.commentId != null
            assert comment.formattedDate != null
            assert comment.commentHtml != null
        }
    }
    
    void testEmailServiceAdapterBackwardCompatibility() {
        given: "Legacy email service data"
        def stepInstance = [
            sti_id: UUID.randomUUID(),
            sti_name: "Test Step",
            sti_status: "IN_PROGRESS"
        ]
        def teams = [[tms_email: "team@test.com"]]
        
        when: "Using adapter for notification"
        def notificationSent = false
        try {
            EmailServiceAdapter.sendStepStatusChangedNotification(
                stepInstance, teams, null, "PENDING", "IN_PROGRESS", 123, "MIG001", "IT001"
            )
            notificationSent = true
        } catch (Exception e) {
            fail("Adapter should maintain backward compatibility: ${e.message}")
        }
        
        then: "Notification sent without errors"
        notificationSent
    }
    
    void testTemplateValidation() {
        given: "A template with various variable references"
        def templateContent = """
            <h1>Step: \${stepName}</h1>
            <p>Status: \${stepStatus}</p>
            <div>Comments: \${commentCount}</div>
            <% if (recentComments) { %>
                <% recentComments.each { comment -> %>
                    <div>\${comment.userDisplayName}: \${comment.commentText}</div>
                <% } %>
            <% } %>
            <p>Team: \${step.assignedTeamName}</p>
            <p>Missing: \${missingVariable}</p>
        """
        
        and: "A StepDataTransferObject with comment data"
        def stepDTO = createSampleStepDTO()
        
        when: "Validating the template"
        def result = TemplateValidator.validateTemplate(templateContent, stepDTO)
        
        then: "Validation identifies missing variables and provides recommendations"
        !result.isValid
        result.missingVariables.contains("missingVariable")
        result.recommendations.size() > 0
        println result.toString()
    }
    
    void testEndToEndTemplateWorkflow() {
        given: "A complete step scenario with comments and team assignments"
        def testData = createCompleteStepScenario()
        
        when: "Processing through complete template workflow"
        def stepData = stepRepository.findStepsWithCommentsForTemplate(testData.stepInstanceId)
        def stepDTO = transformationService.fromDatabaseRow(stepData)
        
        and: "Validating template compatibility"
        def templateContent = loadTestTemplate("STEP_STATUS_CHANGED")
        def validation = TemplateValidator.validateTemplate(templateContent, stepDTO)
        
        then: "End-to-end workflow succeeds"
        stepDTO != null
        stepDTO.recentComments != null
        validation.isValid || validation.missingVariables.isEmpty()
        
        cleanup: "Remove test data"
        cleanupTestData(testData)
    }
    
    // Performance test leveraging US-058 infrastructure
    void testTemplatePerformanceWithLargeCommentSet() {
        given: "A step with many comments"
        def stepId = createStepWithManyComments(50)  // 50 comments
        
        when: "Processing template data"
        def startTime = System.currentTimeMillis()
        def stepData = stepRepository.findStepsWithCommentsForTemplate(stepId)
        def stepDTO = transformationService.fromDatabaseRow(stepData)
        def endTime = System.currentTimeMillis()
        
        then: "Performance is acceptable"
        def processingTime = endTime - startTime
        processingTime < 1000  // Under 1 second
        stepDTO.recentComments.size() <= 5  // Limited for performance
    }
    
    private UUID createTestStepWithComments() {
        def stepId = UUID.randomUUID()
        // Implementation uses BaseIntegrationTest database setup
        // Insert test step and comments
        return stepId
    }
    
    private StepDataTransferObject createSampleStepDTO() {
        return StepDataTransferObject.builder()
            .stepId(UUID.randomUUID().toString())
            .stepName("Sample Step")
            .stepStatus("IN_PROGRESS")
            .assignedTeamName("Test Team")
            .migrationCode("MIG001")
            .iterationCode("IT001")
            .recentComments([
                new CommentDTO(
                    commentId: UUID.randomUUID().toString(),
                    userDisplayName: "Test User",
                    commentText: "Test comment",
                    formattedDate: "Jan 01, 2025 at 10:00"
                )
            ])
            .commentCount(1)
            .build()
    }
}
```

#### Acceptance Criteria
- [ ] All template integration tests pass using US-058 infrastructure
- [ ] Backward compatibility verified through automated tests
- [ ] Performance tests ensure template processing meets requirements
- [ ] End-to-end workflow validation covers complete scenarios
- [ ] Test coverage includes error conditions and edge cases

---

### Task 4.2: Email Template Testing Framework
**Priority**: Medium | **Effort**: 3 points | **Risk**: Low

#### Implementation Details
**File**: `src/groovy/umig/tests/integration/EmailTemplateTest.groovy`

```groovy
package umig.tests.integration

import umig.utils.EmailTemplateProcessor
import umig.utils.TemplateValidator
import umig.dto.StepDataTransferObject
import umig.tests.integration.BaseIntegrationTest

/**
 * Email Template Testing Framework for US-056B
 * 
 * Validates email templates across different clients and scenarios.
 * Ensures mobile responsiveness and cross-client compatibility.
 */
class EmailTemplateTest extends BaseIntegrationTest {
    
    void testTemplateRenderingWithFullContext() {
        given: "A fully populated StepDataTransferObject"
        def stepDTO = createCompleteStepDTO()
        
        and: "An email template with rich context"
        def templateContent = loadEmailTemplate("STEP_STATUS_CHANGED_V2")
        
        when: "Processing the template"
        def renderedEmail = EmailTemplateProcessor.processTemplate(templateContent, stepDTO)
        
        then: "Template renders without errors"
        renderedEmail != null
        renderedEmail.contains(stepDTO.stepName)
        renderedEmail.contains("Recent Comments")
        !renderedEmail.contains('${')  // No unresolved variables
    }
    
    void testMobileResponsiveTemplates() {
        given: "Mobile-optimized template content"
        def mobileTemplate = """
            <div style="max-width: 600px;">
                <h1 style="font-size: 18px;">\${stepName}</h1>
                <div class="mobile-comments">
                    <% recentComments?.take(2)?.each { comment -> %>
                        <div style="margin: 10px 0;">
                            <strong>\${comment.userDisplayName}</strong>: \${comment.commentText}
                        </div>
                    <% } %>
                </div>
            </div>
        """
        def stepDTO = createSampleStepDTO()
        
        when: "Rendering for mobile"
        def mobileEmail = EmailTemplateProcessor.processTemplate(mobileTemplate, stepDTO)
        
        then: "Mobile-specific formatting applied"
        mobileEmail.contains('max-width: 600px')
        mobileEmail.contains('font-size: 18px')
    }
    
    void testTemplateErrorHandling() {
        given: "A template with errors"
        def errorTemplate = """
            <h1>\${stepName}</h1>
            <p>\${nonExistentVariable.someMethod()}</p>
            <div>\${step.comments[999].text}</div>
        """
        def stepDTO = createSampleStepDTO()
        
        when: "Processing template with errors"
        def result = EmailTemplateProcessor.processTemplate(errorTemplate, stepDTO)
        
        then: "Graceful error handling"
        result != null
        result.contains(stepDTO.stepName)  // Valid parts still work
        !result.contains("Exception")     // No raw exceptions in output
    }
    
    void testCrossClientCompatibility() {
        given: "Template with cross-client CSS"
        def crossClientTemplate = """
            <!--[if mso]>
            <style>
                .outlook-table { width: 100% !important; }
            </style>
            <![endif]-->
            <div>
                <h1>\${stepName}</h1>
                <table class="outlook-table" style="width: 100%;">
                    <tr><td>Status: \${stepStatus}</td></tr>
                </table>
            </div>
        """
        def stepDTO = createSampleStepDTO()
        
        when: "Rendering template"
        def email = EmailTemplateProcessor.processTemplate(crossClientTemplate, stepDTO)
        
        then: "Outlook-specific code preserved"
        email.contains("<!--[if mso]>")
        email.contains("outlook-table")
        email.contains(stepDTO.stepStatus)
    }
}
```

#### Acceptance Criteria
- [ ] Email templates render correctly across different email clients
- [ ] Mobile responsiveness verified through testing
- [ ] Error handling prevents broken email notifications
- [ ] Cross-client compatibility maintained for Outlook, Gmail, etc.
- [ ] Template validation catches common issues before production

---

## 🏗️ Phase 5: Integration & Performance Validation

### Task 5.1: End-to-End Workflow Validation
**Priority**: High | **Effort**: 3 points | **Risk**: Medium

#### Implementation Details
**File**: `src/groovy/umig/tests/integration/US056B_EndToEndTest.groovy`

```groovy
package umig.tests.integration

import umig.api.v2.StepsApi
import umig.utils.EmailServiceAdapter
import umig.tests.integration.BaseIntegrationTest

/**
 * End-to-End Integration Test for US-056B Template Integration
 * 
 * Validates complete workflow from step status change to email delivery
 * with enhanced template support and comment integration.
 */
class US056B_EndToEndTest extends BaseIntegrationTest {
    
    void testCompleteStepStatusChangeWithComments() {
        given: "A step with existing comments and team assignments"
        def testScenario = createStepWithFullContext()
        
        when: "Step status is updated via API"
        def stepUpdateResponse = updateStepStatus(
            testScenario.stepInstanceId, 
            "IN_PROGRESS", 
            "Adding comments for email notification test"
        )
        
        then: "API update succeeds"
        stepUpdateResponse.status == 200
        
        and: "Email notification is triggered with enhanced template"
        def emailsSent = captureEmailNotifications()
        emailsSent.size() > 0
        
        and: "Email contains comment data"
        def notification = emailsSent[0]
        notification.content.contains("Recent Comments")
        notification.content.contains(testScenario.existingComment.text)
        
        cleanup: "Remove test data"
        cleanupTestScenario(testScenario)
    }
    
    void testPerformanceWithHighCommentVolume() {
        given: "A step with high comment volume"
        def stepId = createStepWithManyComments(100)
        
        when: "Triggering email notification"
        def startTime = System.currentTimeMillis()
        triggerStepStatusChange(stepId, "PENDING", "COMPLETED")
        def endTime = System.currentTimeMillis()
        
        then: "Performance remains acceptable"
        def totalTime = endTime - startTime
        totalTime < 2000  // Under 2 seconds total
        
        and: "Email contains manageable comment count"
        def email = getLastEmailNotification()
        def commentCount = countCommentsInEmail(email.content)
        commentCount <= 5  // Limited for performance and readability
    }
    
    void testFallbackBehaviorWhenTemplatesFail() {
        given: "A corrupted enhanced template"
        corruptEmailTemplate("STEP_STATUS_CHANGED_V2")
        def stepId = createTestStep()
        
        when: "Triggering notification"
        triggerStepStatusChange(stepId, "PENDING", "IN_PROGRESS")
        
        then: "Fallback to legacy template succeeds"
        def email = getLastEmailNotification()
        email != null
        email.content.contains("Test Step")  // Basic content present
        
        cleanup: "Restore template"
        restoreEmailTemplate("STEP_STATUS_CHANGED_V2")
    }
}
```

#### Acceptance Criteria
- [ ] Complete workflow from API to email delivery functions correctly
- [ ] Enhanced templates work with real step and comment data
- [ ] Performance acceptable even with high comment volumes
- [ ] Fallback behavior ensures notifications always sent
- [ ] Integration with existing UMIG infrastructure seamless

---

### Task 5.2: Performance Impact Assessment
**Priority**: Medium | **Effort**: 2 points | **Risk**: Low

#### Implementation Details
**File**: `src/groovy/umig/tests/performance/TemplatePerformanceTest.groovy`

```groovy
package umig.tests.performance

import umig.service.StepDataTransformationService
import umig.utils.EmailTemplateProcessor
import umig.repository.StepRepository
import umig.tests.integration.BaseIntegrationTest

/**
 * Performance Impact Assessment for US-056B Template Integration
 * 
 * Measures performance impact of enhanced template processing
 * compared to legacy email notification system.
 */
class TemplatePerformanceTest extends BaseIntegrationTest {
    
    void testCommentDataLoadingPerformance() {
        given: "Steps with varying comment counts"
        def scenarios = [
            createStepWithComments(0),   // No comments
            createStepWithComments(5),   // Few comments  
            createStepWithComments(25),  // Many comments
            createStepWithComments(100)  // High volume
        ]
        
        when: "Loading comment data for each scenario"
        def results = scenarios.collect { stepId ->
            def startTime = System.nanoTime()
            def stepData = new StepRepository().findStepsWithCommentsForTemplate(stepId)
            def endTime = System.nanoTime()
            
            return [
                stepId: stepId,
                commentCount: stepData.comment_count ?: 0,
                loadTime: (endTime - startTime) / 1_000_000  // Convert to milliseconds
            ]
        }
        
        then: "Performance scales acceptably"
        results.each { result ->
            println "Comments: ${result.commentCount}, Load Time: ${result.loadTime}ms"
            assert result.loadTime < 500  // Under 500ms regardless of comment count
        }
    }
    
    void testTemplateProcessingPerformance() {
        given: "Complex template with conditional logic"
        def complexTemplate = loadTestTemplate("complex_step_notification")
        def stepDTO = createRichStepDTO()
        
        when: "Processing template multiple times"
        def iterations = 50
        def times = []
        
        (1..iterations).each {
            def start = System.nanoTime()
            EmailTemplateProcessor.processTemplate(complexTemplate, stepDTO)
            def end = System.nanoTime()
            times << (end - start) / 1_000_000
        }
        
        then: "Average processing time acceptable"
        def avgTime = times.sum() / times.size()
        def maxTime = times.max()
        
        avgTime < 100   // Under 100ms average
        maxTime < 250   // Under 250ms worst case
        
        println "Template processing - Avg: ${avgTime}ms, Max: ${maxTime}ms"
    }
    
    void testMemoryUsageImpact() {
        given: "Memory baseline"
        def runtime = Runtime.getRuntime()
        runtime.gc()
        def baselineMemory = runtime.totalMemory() - runtime.freeMemory()
        
        when: "Processing many step DTOs with comments"
        def stepDTOs = (1..100).collect { createRichStepDTO() }
        def templates = stepDTOs.collect { dto ->
            EmailTemplateProcessor.processTemplate(loadTestTemplate("STEP_STATUS_CHANGED"), dto)
        }
        
        runtime.gc()
        def finalMemory = runtime.totalMemory() - runtime.freeMemory()
        
        then: "Memory usage increase reasonable"
        def memoryIncrease = finalMemory - baselineMemory
        def memoryIncreaseMB = memoryIncrease / (1024 * 1024)
        
        memoryIncreaseMB < 50  // Under 50MB increase
        templates.size() == 100  // All processed successfully
        
        println "Memory increase: ${memoryIncreaseMB}MB for 100 template processings"
    }
}
```

#### Acceptance Criteria
- [ ] Comment data loading performance under 500ms for any comment volume
- [ ] Template processing under 100ms average, 250ms maximum
- [ ] Memory usage increase under 50MB for typical workloads
- [ ] Performance regression analysis shows minimal impact
- [ ] Optimization recommendations documented for production

---

## 🔒 Risk Mitigation Strategies

### High-Risk Areas and Mitigations

#### 1. Template Rendering Failures
**Risk**: Enhanced templates fail, breaking email notifications
**Mitigation**: 
- Mandatory fallback to legacy templates (Task 2.1)
- Comprehensive template validation before deployment (Task 3.2)
- Gradual rollout with feature flags

#### 2. Performance Degradation  
**Risk**: Comment loading impacts email notification speed
**Mitigation**:
- Comment count limiting (max 5 recent comments) (Task 3.1)
- Database query optimization with proper indexing
- Performance testing integrated into CI/CD (Task 5.2)

#### 3. Backward Compatibility Breaks
**Risk**: Changes break existing email notification flows  
**Mitigation**:
- EmailServiceAdapter maintains 100% compatibility (Task 2.1)
- Extensive integration testing (Task 4.1)
- Phased deployment with rollback capability

#### 4. Data Consistency Issues
**Risk**: Comment data inconsistent across different query contexts
**Mitigation**:
- Centralized comment loading through repository pattern (Task 3.1)
- Comprehensive data transformation service (Task 1.3)
- End-to-end validation tests (Task 5.1)

---

## 📋 Summary & Acceptance Criteria

### Overall US-056B Success Criteria

1. **CommentDTO Integration** ✅
   - [ ] CommentDTO structure supports JSON serialization
   - [ ] Integration with StepDataTransferObject seamless
   - [ ] Comment data transformation handles all edge cases

2. **EmailService Compatibility** ✅  
   - [ ] 100% backward compatibility maintained
   - [ ] Enhanced templates used when available
   - [ ] Graceful fallback prevents notification failures

3. **Template Standardization** ✅
   - [ ] All recentComments template failures resolved
   - [ ] Template variable validation prevents runtime errors
   - [ ] Cross-client email compatibility maintained

4. **Testing Integration** ✅
   - [ ] Leverages US-058 testing infrastructure
   - [ ] End-to-end workflow validation passes
   - [ ] Performance impact acceptable

5. **Production Readiness** ✅
   - [ ] Performance tests show minimal impact
   - [ ] Risk mitigation strategies implemented  
   - [ ] Monitoring and rollback procedures defined

### Integration Points Verified

- ✅ US-034 Import API: Template system ready for imported step data
- ✅ US-039 Email Infrastructure: Enhanced templates integrate with mobile-responsive system  
- ✅ US-058 Testing Framework: Comprehensive validation using modernized testing
- ✅ Existing UMIG Architecture: Follows established patterns (ADR-031, DatabaseUtil, etc.)

### Delivery Timeline

**Sprint 6 (Current)**:
- Phase 1: CommentDTO Structure (Tasks 1.1-1.3)
- Phase 2: EmailService Integration (Tasks 2.1-2.2)

**Sprint 7 (Follow-up)**:
- Phase 3: Template Standardization (Tasks 3.1-3.2)  
- Phase 4: Testing Integration (Tasks 4.1-4.2)
- Phase 5: Performance Validation (Tasks 5.1-5.2)

---

*US-056B Template Integration - Detailed Implementation Tasks*  
*Generated: 2025-09-04 | Sprint 6 | UMIG Architecture Compliant*