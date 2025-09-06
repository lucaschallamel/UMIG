package umig.tests.unit

import spock.lang.Specification
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import groovy.transform.TypeChecked
import groovy.transform.TypeCheckingMode

import umig.dto.StepInstanceDTO
import umig.dto.CommentDTO

/**
 * Unit tests for CommentDTO Template Integration (US-056B)
 * 
 * Tests the enhanced CommentDTO and its integration with StepInstanceDTO
 * to ensure proper template variable mapping for email notifications.
 * 
 * Note: Static type checking completely disabled for this test class to allow
 * dynamic Map operations required by Spock assertions and template testing
 */
@TypeChecked(TypeCheckingMode.SKIP)
class CommentDTOTemplateIntegrationTest extends Specification {
    
    def "CommentDTO toTemplateMap should produce template-compatible properties"() {
        given: "A CommentDTO with all fields populated"
        CommentDTO comment = CommentDTO.builder()
            .commentId("test-comment-123")
            .text("This is a test comment")
            .authorId("user-456")
            .authorName("John Doe")
            .createdDate(LocalDateTime.of(2025, 1, 15, 14, 30))
            .isActive(true)
            .isResolved(false)
            .priority(3)
            .commentType("IMPORTANT")
            .replyCount(2)
            .requiresAttention(true)
            .build()
        
        when: "Converting to template map"
        def templateMapResult = comment.toTemplateMap()
        
        then: "Template-expected property names are present"
        templateMapResult.comment_id == "test-comment-123"
        templateMapResult.comment_text == "This is a test comment"
        templateMapResult.author_id == "user-456"
        templateMapResult.author_name == "John Doe"
        templateMapResult.created_at == "2025-01-15T14:30:00"
        
        and: "Status fields are mapped correctly"
        templateMapResult.is_active == true
        templateMapResult.is_resolved == false
        
        and: "Enhanced fields are present"
        templateMapResult.priority == 3
        templateMapResult.comment_type == "IMPORTANT"
        templateMapResult.reply_count == 2
        templateMapResult.requires_attention == true
        
        and: "Computed display fields are generated"
        templateMapResult.formatted_date == "Jan 15, 2025 14:30"
        templateMapResult.short_date == "Jan 15"
        templateMapResult.time_only == "14:30"
        templateMapResult.is_priority == true  // priority > 2
        templateMapResult.is_recent == false   // not within 24 hours
    }
    
    def "CommentDTO toTemplateMap should handle null values defensively"() {
        given: "A minimal CommentDTO with null fields"
        CommentDTO comment = new CommentDTO()
        
        when: "Converting to template map"
        Map<String, Object> templateMap = comment.toTemplateMap()
        
        then: "Default values are provided for template safety"
        templateMap.comment_id == ""
        templateMap.comment_text == ""
        templateMap.author_id == ""
        templateMap.author_name == "Anonymous"
        templateMap.created_at == ""
        templateMap.formatted_date == "Recent"
        templateMap.short_date == "Recent"
        templateMap.time_only == ""
        templateMap.is_priority == false
        templateMap.is_recent == false
    }
    
    def "StepInstanceDTO toTemplateMap should use CommentDTO template mapping"() {
        given: "A StepInstanceDTO with CommentDTO instances"
        CommentDTO comment1 = CommentDTO.builder()
            .commentId("comment-1")
            .text("First comment")
            .authorName("Alice")
            .createdDate(LocalDateTime.now().minusHours(2))
            .priority(2)
            .build()
            
        CommentDTO comment2 = CommentDTO.builder()
            .commentId("comment-2")
            .text("Second comment")
            .authorName("Bob")
            .createdDate(LocalDateTime.now().minusMinutes(30))
            .priority(4)
            .requiresAttention(true)
            .build()
        
        List<CommentDTO> commentList = [comment1, comment2]
        StepInstanceDTO stepDTO = StepInstanceDTO.builder()
            .stepId("step-123")
            .stepName("Test Step")
            .stepStatus("IN_PROGRESS")
            .comments(commentList)
            .build()
        
        when: "Converting StepDTO to template map"
        def templateMap = stepDTO.toTemplateMap()
        
        then: "Recent comments use template-compatible properties"
        def recentComments = templateMap.recentComments
        recentComments.size() == 2
        
        def mappedComment1 = recentComments[0]
        mappedComment1.comment_id == "comment-1"
        mappedComment1.comment_text == "First comment"
        mappedComment1.author_name == "Alice"
        mappedComment1.priority == 2
        mappedComment1.is_priority == false
        
        def mappedComment2 = recentComments[1]
        mappedComment2.comment_id == "comment-2"
        mappedComment2.comment_text == "Second comment"
        mappedComment2.author_name == "Bob"
        mappedComment2.priority == 4
        mappedComment2.is_priority == true
        mappedComment2.requires_attention == true
    }
    
    def "StepInstanceDTO should handle legacy comment objects gracefully"() {
        given: "A legacy comment object (non-CommentDTO)"
        Map<String, Object> legacyComment = [
            commentId: "legacy-comment-123",
            text: "Legacy comment text",
            authorName: "Legacy User",
            createdDate: LocalDateTime.of(2025, 1, 10, 10, 0)
        ]
        
        List<Object> commentList = [legacyComment]
        StepInstanceDTO.Builder builder = StepInstanceDTO.builder()
        StepInstanceDTO stepDTO = builder
            .stepId("step-456")
            .stepName("Legacy Test Step")  
            .stepStatus("COMPLETED")
            .comments(commentList as List<CommentDTO>)
            .build()
        
        when: "Converting to template map"
        def templateMap = stepDTO.toTemplateMap()
        
        then: "Legacy comments are mapped to template-compatible format"
        def recentComments = templateMap.recentComments
        recentComments.size() == 1
        
        def mappedComment = recentComments[0]
        mappedComment.comment_id == "legacy-comment-123"
        mappedComment.comment_text == "Legacy comment text"
        mappedComment.author_name == "Legacy User"
        mappedComment.created_at == "2025-01-10T10:00:00"
        mappedComment.formatted_date == "Jan 10, 2025 10:00"
    }
    
    def "CommentDTO builder should set sensible defaults"() {
        given: "A CommentDTO built with minimal information"
        CommentDTO comment = CommentDTO.builder()
            .text("Simple comment")
            .authorName("Test User")
            .build()
        
        expect: "Default values are set correctly"
        comment.isActive == true
        comment.isResolved == false
        comment.priority == 1
        comment.commentType == "GENERAL"
        comment.replyCount == 0
        comment.requiresAttention == false
        comment.createdDate != null  // Should be set to now()
    }
}