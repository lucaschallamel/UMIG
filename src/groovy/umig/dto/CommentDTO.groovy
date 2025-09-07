package umig.dto

import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import groovy.transform.ToString
import groovy.transform.EqualsAndHashCode
import groovy.util.logging.Slf4j

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Comment Data Transfer Object for embedded comments
 * Enhanced for US-056B Template Integration
 */
@ToString(includeNames = true)
@EqualsAndHashCode
@JsonIgnoreProperties(ignoreUnknown = true)
@Slf4j
class CommentDTO {
    
    @JsonProperty("commentId")
    String commentId
    
    @JsonProperty("text")
    String text
    
    @JsonProperty("authorId") 
    String authorId
    
    @JsonProperty("authorName")
    String authorName
    
    @JsonProperty("createdDate")
    LocalDateTime createdDate
    
    @JsonProperty("isActive")
    Boolean isActive = true
    
    @JsonProperty("isResolved")
    Boolean isResolved = false
    
    // ========================================
    // TEMPLATE INTEGRATION ENHANCEMENTS (US-056B)
    // ========================================
    
    /** Comment priority level for template filtering */
    @JsonProperty("priority")
    Integer priority = 1
    
    /** Comment type classification */
    @JsonProperty("commentType")
    String commentType = "GENERAL"
    
    /** Number of replies to this comment */
    @JsonProperty("replyCount")
    Integer replyCount = 0
    
    /** Indicates if comment requires attention */
    @JsonProperty("requiresAttention")
    Boolean requiresAttention = false
    
    /**
     * Convert CommentDTO to template-compatible map
     * Ensures property names match email template expectations
     * @return Map with template-compatible property names
     */
    Map<String, Object> toTemplateMap() {
        return [
            // Template-expected property names (US-056B compatibility)
            comment_id: commentId ?: "",
            comment_text: text ?: "",
            author_id: authorId ?: "",
            author_name: authorName ?: "Anonymous",
            created_at: createdDate?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) ?: "",
            
            // Status fields
            is_active: isActive ?: false,
            is_resolved: isResolved ?: false,
            
            // Enhanced fields for template logic
            priority: priority ?: 1,
            comment_type: commentType ?: "GENERAL",
            reply_count: replyCount ?: 0,
            requires_attention: requiresAttention ?: false,
            
            // Computed fields for template display
            formatted_date: createdDate?.format(DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm")) ?: "Recent",
            short_date: createdDate?.format(DateTimeFormatter.ofPattern("MMM dd")) ?: "Recent",
            time_only: createdDate?.format(DateTimeFormatter.ofPattern("HH:mm")) ?: "",
            is_priority: (priority ?: 1) > 2,
            is_recent: createdDate?.isAfter(LocalDateTime.now().minusHours(24)) ?: false
        ]
    }
    
    /**
     * Create builder for fluent CommentDTO construction
     * @return Builder instance
     */
    static Builder builder() {
        return new Builder()
    }
    
    /**
     * Builder pattern for CommentDTO construction
     */
    static class Builder {
        private CommentDTO comment = new CommentDTO()
        
        Builder commentId(String commentId) { comment.commentId = commentId; return this }
        Builder text(String text) { comment.text = text; return this }
        Builder authorId(String authorId) { comment.authorId = authorId; return this }
        Builder authorName(String authorName) { comment.authorName = authorName; return this }
        Builder createdDate(LocalDateTime createdDate) { comment.createdDate = createdDate; return this }
        Builder isActive(Boolean isActive) { comment.isActive = isActive; return this }
        Builder isResolved(Boolean isResolved) { comment.isResolved = isResolved; return this }
        Builder priority(Integer priority) { comment.priority = priority; return this }
        Builder commentType(String commentType) { comment.commentType = commentType; return this }
        Builder replyCount(Integer replyCount) { comment.replyCount = replyCount; return this }
        Builder requiresAttention(Boolean requiresAttention) { comment.requiresAttention = requiresAttention; return this }
        
        CommentDTO build() {
            // Set defaults if not provided
            if (!comment.createdDate) {
                comment.createdDate = LocalDateTime.now()
            }
            return comment
        }
    }
}