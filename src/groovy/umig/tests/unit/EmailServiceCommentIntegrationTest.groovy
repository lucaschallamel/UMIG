package umig.tests.unit

import spock.lang.Specification
import java.time.LocalDateTime
import groovy.transform.TypeChecked
import groovy.transform.TypeCheckingMode

import umig.utils.EmailService
import umig.dto.StepInstanceDTO
import umig.dto.CommentDTO

/**
 * EmailService Comment Integration Test (US-056B Phase 2)
 * 
 * Tests the enhanced comment processing integration in EmailService
 * to ensure CommentDTO objects are properly converted to template-compatible
 * maps for email notifications while maintaining backward compatibility.
 * 
 * Note: Static type checking completely disabled for this test class to allow
 * dynamic Map operations required by Spock assertions and template testing
 */
@TypeChecked(TypeCheckingMode.SKIP)
class EmailServiceCommentIntegrationTest extends Specification {

    def "processCommentsForTemplate should handle CommentDTO objects correctly"() {
        given: "A list of CommentDTO objects"
        def comment1 = CommentDTO.builder()
            .commentId("comment-1")
            .text("First comment with high priority")
            .authorName("Alice Smith")
            .createdDate(LocalDateTime.now().minusHours(2))
            .priority(4)
            .requiresAttention(true)
            .commentType("URGENT")
            .build()
            
        def comment2 = CommentDTO.builder()
            .commentId("comment-2")
            .text("Second comment with low priority")
            .authorName("Bob Johnson")
            .createdDate(LocalDateTime.now().minusMinutes(30))
            .priority(1)
            .commentType("GENERAL")
            .build()
            
        List<CommentDTO> comments = [comment1, comment2]
        
        when: "Processing comments for template"
        def result = EmailService.processCommentsForTemplate(comments)
        
        then: "All comments are processed with correct template mapping"
        result != null
        result.size() == 2
        
        // Validate first comment using direct property access
        def processedComment1 = result.get(0)
        processedComment1.comment_id == "comment-1"
        processedComment1.comment_text == "First comment with high priority"
        processedComment1.author_name == "Alice Smith"
        processedComment1.priority == 4
        processedComment1.comment_type == "URGENT"
        processedComment1.requires_attention == true
        processedComment1.is_priority == true  // priority > 2
        
        // Validate second comment using direct property access
        def processedComment2 = result.get(1)
        processedComment2.comment_id == "comment-2"
        processedComment2.comment_text == "Second comment with low priority"
        processedComment2.author_name == "Bob Johnson"
        processedComment2.priority == 1
        processedComment2.comment_type == "GENERAL"
        processedComment2.requires_attention == false
        processedComment2.is_priority == false  // priority <= 2
        
        and: "Template-specific fields are present"
        processedComment1.containsKey('formatted_date')
        processedComment1.containsKey('short_date')
        processedComment1.containsKey('time_only')
        processedComment1.containsKey('created_at')
        processedComment1.containsKey('is_recent')
    }
    
    def "processCommentsForTemplate should handle legacy comment objects"() {
        given: "Legacy comment objects (Maps)"
        Map<String, Object> legacyComment1 = [
            commentId: "legacy-1",
            text: "Legacy comment text",
            authorName: "Legacy User",
            createdDate: LocalDateTime.now().minusHours(1),
            priority: 3
        ]
        
        Map<String, Object> legacyComment2 = [
            comment_id: "legacy-2",           // Alternative property name
            comment_text: "Another legacy comment",  // Alternative property name
            author_name: "Another User",      // Alternative property name
            created_at: LocalDateTime.now().minusMinutes(15)
        ]
        
        List<Map<String, Object>> legacyComments = [legacyComment1, legacyComment2]
        
        when: "Processing legacy comments for template"
        def result = EmailService.processCommentsForTemplate(legacyComments)
        
        then: "Legacy comments are properly mapped to template format"
        result != null
        result.size() == 2
        
        // Validate first legacy comment using direct property access
        def processed1 = result.get(0)
        processed1.comment_id == "legacy-1"
        processed1.comment_text == "Legacy comment text"
        processed1.author_name == "Legacy User"
        processed1.priority == 3
        processed1.is_priority == true  // priority > 2
        
        // Validate second legacy comment with alternative property names
        def processed2 = result.get(1)
        processed2.comment_id == "legacy-2"
        processed2.comment_text == "Another legacy comment"
        processed2.author_name == "Another User"
        processed2.priority == 1  // Default value
        
        and: "All template-required fields are present with defaults"
        processed1.containsKey('formatted_date')
        processed1.containsKey('short_date')
        processed1.containsKey('is_active')
        processed1.containsKey('is_resolved')
        processed2.author_name == "Another User"
    }
    
    def "processCommentsForTemplate should handle mixed CommentDTO and legacy objects"() {
        given: "A mix of CommentDTO and legacy comment objects"
        CommentDTO modernComment = CommentDTO.builder()
            .commentId("modern-1")
            .text("Modern CommentDTO")
            .authorName("Modern User")
            .priority(2)
            .build()
            
        Map<String, Object> legacyComment = [
            commentId: "legacy-1",
            text: "Legacy comment",
            authorName: "Legacy User",
            priority: 3
        ]
        
        List<Object> mixedComments = [modernComment, legacyComment]
        
        when: "Processing mixed comments"
        def result = EmailService.processCommentsForTemplate(mixedComments)
        
        then: "Both types are processed correctly"
        result != null
        result.size() == 2
        
        // Modern comment processed via toTemplateMap()
        def processedModern = result.get(0)
        processedModern.comment_id == "modern-1"
        processedModern.comment_text == "Modern CommentDTO"
        processedModern.author_name == "Modern User"
        processedModern.is_priority == false
        
        // Legacy comment processed via fallback
        def processedLegacy = result.get(1)
        processedLegacy.comment_id == "legacy-1"
        processedLegacy.comment_text == "Legacy comment"
        processedLegacy.author_name == "Legacy User"
        processedLegacy.is_priority == true
    }
    
    def "processCommentsForTemplate should handle edge cases gracefully"() {
        expect: "Edge cases return safe defaults"
        EmailService.processCommentsForTemplate(null) == []
        EmailService.processCommentsForTemplate("") == []
        EmailService.processCommentsForTemplate("invalid string") == []
        EmailService.processCommentsForTemplate([]) == []
        
        and: "Unknown objects get minimal safe structure"
        def unknownObject = new Object()
        def result = EmailService.processCommentsForTemplate([unknownObject])
        result != null
        result.size() == 1
        def processed = result.get(0)
        processed.comment_id == ""
        processed.comment_text != null
        processed.author_name == "Anonymous"
        processed.is_active == false
    }
    
    def "processCommentsForTemplate should limit comments to 3 items"() {
        given: "More than 3 comments"
        List<CommentDTO> manyComments = (1..5).collect { i ->
            CommentDTO.builder()
                .commentId("comment-${i}")
                .text("Comment number ${i}")
                .authorName("User ${i}")
                .build()
        }
        
        when: "Processing many comments"
        def result = EmailService.processCommentsForTemplate(manyComments)
        
        then: "Only first 3 comments are processed"
        result != null
        result.size() == 3
        result.get(0).comment_id == "comment-1"
        result.get(1).comment_id == "comment-2"
        result.get(2).comment_id == "comment-3"
    }
    
    def "processCommentsForTemplate should handle single comment object"() {
        given: "A single CommentDTO object (not in list)"
        CommentDTO singleComment = CommentDTO.builder()
            .commentId("single-1")
            .text("Single comment")
            .authorName("Single User")
            .build()
        
        when: "Processing single comment"
        def result = EmailService.processCommentsForTemplate(singleComment)
        
        then: "Single comment is returned as list with one item"
        result != null
        result.size() == 1
        def processed = result.get(0)
        processed.comment_id == "single-1"
        processed.comment_text == "Single comment"
        processed.author_name == "Single User"
    }
    
    def "date formatting helper methods should handle different date types"() {
        given: "Different date types and edge cases"
        LocalDateTime localDateTime = LocalDateTime.of(2025, 1, 15, 14, 30)
        Date javaDate = new Date(125, 0, 15, 14, 30)  // Year 2025
        
        when: "Processing comments with different date types"
        CommentDTO commentWithLocalDateTime = CommentDTO.builder()
            .commentId("dt-1")
            .text("Comment with LocalDateTime")
            .authorName("DateTime User")
            .createdDate(localDateTime)
            .build()
            
        Map<String, Object> legacyWithJavaDate = [
            commentId: "dt-2",
            text: "Comment with Java Date",
            authorName: "Date User",
            createdDate: javaDate
        ]
        
        def result = EmailService.processCommentsForTemplate([commentWithLocalDateTime, legacyWithJavaDate])
        
        then: "Date formatting works for both types"
        result != null
        result.size() == 2
        
        // LocalDateTime formatting
        def dtComment = result.get(0)
        dtComment.created_at == "2025-01-15T14:30:00"
        dtComment.formatted_date == "Jan 15, 2025 14:30"
        dtComment.short_date == "Jan 15"
        dtComment.time_only == "14:30"
        
        // Java Date formatting (legacy processing)
        def dateComment = result.get(1)
        dateComment.containsKey('created_at')
        dateComment.containsKey('formatted_date')
        dateComment.containsKey('short_date')
        dateComment.containsKey('time_only')
    }
}