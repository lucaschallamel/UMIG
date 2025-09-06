package umig.tests.integration

import spock.lang.Specification
import groovy.transform.TypeChecked
import groovy.transform.TypeCheckingMode
import java.time.LocalDateTime

import umig.dto.StepInstanceDTO
import umig.dto.CommentDTO
import umig.utils.EnhancedEmailService

/**
 * Integration tests for US-056B Template Integration
 * 
 * Verifies end-to-end integration between StepInstanceDTO,
 * CommentDTO, and EnhancedEmailService template processing.
 * 
 * NOTE: Static type checking is disabled for this Spock test to avoid
 * compilation errors when accessing Map properties returned from template
 * transformations. The static type checker incorrectly treats Map results
 * as Object, causing false positive "No such property" errors.
 */
@TypeChecked(TypeCheckingMode.SKIP)
class EmailTemplateIntegrationTest extends Specification {
    
    EnhancedEmailService emailService
    
    def setup() {
        emailService = new EnhancedEmailService()
    }
    
    def "Enhanced CommentDTO should integrate seamlessly with email templates"() {
        given: "A StepInstanceDTO with enhanced CommentDTO instances"
        def priorityComment = CommentDTO.builder()
            .commentId("priority-comment-001")
            .text("URGENT: This step requires immediate attention due to dependency conflicts!")
            .authorName("System Admin")
            .authorId("admin-001")
            .createdDate(LocalDateTime.now().minusMinutes(15))
            .priority(5)
            .commentType("URGENT")
            .requiresAttention(true)
            .replyCount(3)
            .build()
            
        def regularComment = CommentDTO.builder()
            .commentId("regular-comment-002")
            .text("Please verify the database connection configuration.")
            .authorName("DevOps Engineer")
            .authorId("devops-001")
            .createdDate(LocalDateTime.now().minusHours(2))
            .priority(2)
            .commentType("TECHNICAL")
            .build()
            
        def resolvedComment = CommentDTO.builder()
            .commentId("resolved-comment-003")
            .text("Issue has been resolved - tests are now passing.")
            .authorName("QA Analyst")
            .authorId("qa-001")
            .createdDate(LocalDateTime.now().minusHours(4))
            .priority(1)
            .commentType("RESOLVED")
            .isResolved(true)
            .build()
        
        def stepDTO = StepInstanceDTO.builder()
            .stepId("critical-step-456")
            .stepName("Database Migration Validation")
            .stepStatus("IN_PROGRESS")
            .stepDescription("Validate database migration scripts and test data integrity")
            .assignedTeamName("Database Team")
            .migrationCode("PROJ-2025-Q1")
            .iterationCode("IT-001")
            .priority(8)
            .estimatedDuration(120)
            .dependencyCount(5)
            .completedDependencies(3)
            .comments([priorityComment, regularComment, resolvedComment])
            .hasActiveComments(true)
            .lastCommentDate(priorityComment.createdDate)
            .build()
        
        when: "Converting to template variables"
        def templateMap = stepDTO.toTemplateMap()
        
        then: "Step-level template variables are correctly mapped"
        templateMap.stepName == "Database Migration Validation"
        templateMap.stepStatus == "IN_PROGRESS"
        templateMap.assignedTeamName == "Database Team"
        templateMap.hasActiveComments == true
        templateMap.commentCount == 3
        
        and: "Recent comments use template-compatible property names"
        templateMap.recentComments.size() == 3
        
        // Priority comment validation
        def mappedPriorityComment = templateMap.recentComments[0]
        mappedPriorityComment.comment_id == "priority-comment-001"
        mappedPriorityComment.comment_text.contains("URGENT")
        mappedPriorityComment.author_name == "System Admin"
        mappedPriorityComment.priority == 5
        mappedPriorityComment.comment_type == "URGENT"
        mappedPriorityComment.requires_attention == true
        mappedPriorityComment.is_priority == true  // priority > 2
        mappedPriorityComment.reply_count == 3
        mappedPriorityComment.is_recent == true    // within 24 hours
        
        // Regular comment validation
        def mappedRegularComment = templateMap.recentComments[1]
        mappedRegularComment.comment_id == "regular-comment-002"
        mappedRegularComment.author_name == "DevOps Engineer"
        mappedRegularComment.priority == 2
        mappedRegularComment.comment_type == "TECHNICAL"
        mappedRegularComment.requires_attention == false
        mappedRegularComment.is_priority == false  // priority <= 2
        
        // Resolved comment validation
        def mappedResolvedComment = templateMap.recentComments[2]
        mappedResolvedComment.comment_id == "resolved-comment-003"
        mappedResolvedComment.author_name == "QA Analyst"
        mappedResolvedComment.is_resolved == true
        mappedResolvedComment.comment_type == "RESOLVED"
        
        and: "Computed display fields are generated for template use"
        mappedPriorityComment.formatted_date != null
        mappedPriorityComment.short_date != null
        mappedPriorityComment.time_only != null
    }
    
    def "Template integration should handle edge cases defensively"() {
        given: "A StepDTO with minimal comment data"
        def minimalComment = new CommentDTO()
        minimalComment.text = "Minimal comment"
        
        def stepDTO = StepInstanceDTO.builder()
            .stepId("minimal-step-789")
            .stepName("Minimal Step")
            .stepStatus("PENDING")
            .comments([minimalComment])
            .build()
        
        when: "Processing template variables"
        def templateMap = stepDTO.toTemplateMap()
        
        then: "No errors occur and safe defaults are provided"
        templateMap.recentComments.size() == 1
        
        def mappedComment = templateMap.recentComments[0]
        mappedComment.comment_text == "Minimal comment"
        mappedComment.author_name == "Anonymous"
        mappedComment.comment_id == ""
        mappedComment.created_at == ""
        mappedComment.formatted_date == "Recent"
        mappedComment.is_priority == false
        mappedComment.requires_attention == false
    }
    
    def "Template should support mixed CommentDTO and legacy comment objects"() {
        given: "A mix of enhanced CommentDTO and legacy comment objects"
        def enhancedComment = CommentDTO.builder()
            .commentId("enhanced-001")
            .text("Enhanced comment with full features")
            .authorName("Modern User")
            .priority(3)
            .commentType("ENHANCED")
            .build()
        
        def legacyComment = [
            commentId: "legacy-001",
            text: "Legacy comment object",
            authorName: "Legacy User",
            createdDate: LocalDateTime.now().minusHours(1)
        ]
        
        def stepDTO = StepInstanceDTO.builder()
            .stepId("mixed-step-101")
            .stepName("Mixed Comment Step")
            .stepStatus("COMPLETED")
            .comments([enhancedComment, legacyComment])
            .build()
        
        when: "Processing template variables"
        def templateMap = stepDTO.toTemplateMap()
        
        then: "Both types are handled correctly"
        templateMap.recentComments.size() == 2
        
        // Enhanced comment uses new mapping
        def mappedEnhanced = templateMap.recentComments[0]
        mappedEnhanced.comment_id == "enhanced-001"
        mappedEnhanced.priority == 3
        mappedEnhanced.comment_type == "ENHANCED"
        mappedEnhanced.is_priority == true
        
        // Legacy comment uses fallback mapping
        def mappedLegacy = templateMap.recentComments[1]
        mappedLegacy.comment_id == "legacy-001"
        mappedLegacy.comment_text == "Legacy comment object"
        mappedLegacy.author_name == "Legacy User"
        mappedLegacy.formatted_date != null
    }
    
    def "EnhancedEmailService should receive template-compatible comment data"() {
        given: "A step instance with enhanced comments"
        def criticalComment = CommentDTO.builder()
            .commentId("critical-issue-001")
            .text("Database connection pool exhausted - immediate action required")
            .authorName("Database Administrator")
            .priority(5)
            .commentType("CRITICAL")
            .requiresAttention(true)
            .createdDate(LocalDateTime.now().minusMinutes(5))
            .build()
        
        def stepInstance = StepInstanceDTO.builder()
            .stepId("emergency-step-999")
            .stepName("Emergency Database Recovery")
            .stepStatus("FAILED")
            .assignedTeamName("Emergency Response Team")
            .comments([criticalComment])
            .hasActiveComments(true)
            .build()
        
        when: "Preparing template variables for email service"
        def templateMap = stepInstance.toTemplateMap()
        def recentComments = templateMap.recentComments
        
        then: "Email service receives properly structured comment data"
        recentComments instanceof List
        recentComments.size() == 1
        
        def commentForEmail = recentComments[0]
        
        // Properties expected by enhanced-mobile-email-template.html
        commentForEmail.comment_text == "Database connection pool exhausted - immediate action required"
        commentForEmail.author_name == "Database Administrator"
        commentForEmail.created_at != null
        
        // Enhanced fields for advanced template logic
        commentForEmail.priority == 5
        commentForEmail.comment_type == "CRITICAL"
        commentForEmail.requires_attention == true
        commentForEmail.is_priority == true
        commentForEmail.is_recent == true
        
        // Display formatting fields
        commentForEmail.formatted_date != null
        commentForEmail.short_date != null
        commentForEmail.time_only != null
        
        and: "Defensive handling ensures no null pointer exceptions"
        commentForEmail.comment_id != null
        commentForEmail.author_id != null
        commentForEmail.is_active != null
        commentForEmail.is_resolved != null
    }
}