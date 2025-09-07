#!/usr/bin/env groovy
/**
 * CommentDTO Template Integration Test (US-056B)
 * 
 * Tests the enhanced CommentDTO and its integration with StepInstanceDTO
 * to ensure proper template variable mapping for email notifications.
 * 
 * Integration test using actual project classes for proper validation
 */

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Date

// Import actual project classes instead of creating mocks
import umig.dto.StepInstanceDTO
import umig.dto.CommentDTO
import umig.utils.EmailService

// ========================================
// TEST EXECUTION
// ========================================

println "🧪 CommentDTO Template Integration Test (US-056B)"
println "="*60

// Global test counters
@groovy.transform.Field int testCount = 0
@groovy.transform.Field int passCount = 0

// Test helper for assertions
def assertTrue(condition, message) {
    testCount++
    if (condition) {
        passCount++
        println "✅ ${message}"
    } else {
        println "❌ ${message}"
        println "   Expected: true, Got: ${condition}"
    }
}

def assertEquals(expected, actual, message) {
    testCount++
    if (expected == actual) {
        passCount++
        println "✅ ${message}"
    } else {
        println "❌ ${message}"
        println "   Expected: ${expected}, Got: ${actual}"
    }
}

def assertNotNull(value, message) {
    testCount++
    if (value != null) {
        passCount++
        println "✅ ${message}"
    } else {
        println "❌ ${message}"
        println "   Expected: not null, Got: ${value}"
    }
}
    
// Test 1: CommentDTO template mapping with all fields
println "\n📝 Test 1: CommentDTO template mapping with all fields"
println "-" * 50

def comment1 = umig.dto.CommentDTO.builder()
    .commentId("test-comment-123")
    .text("This is a test comment")
    .authorName("John Doe")
    .createdDate(LocalDateTime.of(2025, 1, 15, 14, 30))
    .priority(3)
    .commentType("IMPORTANT")
    .requiresAttention(true)
    .build()

// Test the toTemplateMap() method directly
def result1 = comment1.toTemplateMap()

assertNotNull(result1, "Comment template map should not be null")

// Validate template-expected property names
assertEquals("test-comment-123", result1.comment_id, "Comment ID should match")
assertEquals("This is a test comment", result1.comment_text, "Comment text should match")
assertEquals("John Doe", result1.author_name, "Comment author should match")
assertEquals(3, result1.priority, "Comment priority should match")
assertEquals("IMPORTANT", result1.comment_type, "Comment type should match")
assertTrue(result1.requires_attention, "Comment should require attention")
assertTrue(result1.is_priority, "Comment should be priority (priority > 2)")

// Validate template-specific fields are present
assertTrue(result1.containsKey('formatted_date'), "Comment should have formatted_date")
assertTrue(result1.containsKey('short_date'), "Comment should have short_date")
assertTrue(result1.containsKey('time_only'), "Comment should have time_only")
assertTrue(result1.containsKey('created_at'), "Comment should have created_at")
assertTrue(result1.containsKey('is_recent'), "Comment should have is_recent")

// Test 2: CommentDTO with null/minimal values
println "\n📝 Test 2: CommentDTO with null/minimal values"
println "-" * 50

def minimalComment = umig.dto.CommentDTO.builder()
    .text("Minimal comment")
    .authorName("Test User")
    .build()

def result2 = minimalComment.toTemplateMap()

assertNotNull(result2, "Minimal comment template map should not be null")
assertEquals("Minimal comment", result2.comment_text, "Minimal comment text should match")
assertEquals("Test User", result2.author_name, "Minimal comment author should match")

// Default values should be set
assertTrue(result2.containsKey('priority'), "Minimal comment should have priority")
assertTrue(result2.containsKey('comment_type'), "Minimal comment should have comment_type")
assertTrue(result2.containsKey('is_priority'), "Minimal comment should have is_priority")

// Test 3: StepInstanceDTO with CommentDTO integration
println "\n📝 Test 3: StepInstanceDTO with CommentDTO integration"
println "-" * 50

def comment3 = umig.dto.CommentDTO.builder()
    .commentId("step-comment-1")
    .text("Step comment")
    .authorName("Step User")
    .priority(2)
    .build()

def comment4 = umig.dto.CommentDTO.builder()
    .commentId("step-comment-2")
    .text("Another step comment")
    .authorName("Another User")
    .priority(4)
    .requiresAttention(true)
    .build()

// Note: This test assumes StepInstanceDTO has a way to accept comments
// The exact integration depends on the actual StepInstanceDTO implementation

// Test 4: Mixed comment processing via EmailService
println "\n📝 Test 4: Mixed comment processing via EmailService"
println "-" * 50

def modernComment = umig.dto.CommentDTO.builder()
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

def mixedResult = EmailService.processCommentsForTemplate(mixedComments)

assertNotNull(mixedResult, "Mixed result should not be null")
assertEquals(2, mixedResult.size(), "Should process 2 mixed comments")

// Modern comment processed via toTemplateMap()
def processedModern = mixedResult.get(0)
assertEquals("modern-1", processedModern.comment_id, "Modern comment ID should match")
assertEquals("Modern CommentDTO", processedModern.comment_text, "Modern comment text should match")
assertEquals("Modern User", processedModern.author_name, "Modern comment author should match")
assertTrue(!processedModern.is_priority, "Modern comment should not be priority (priority <= 2)")

// Legacy comment processed via fallback
def processedLegacy = mixedResult.get(1)
assertEquals("legacy-1", processedLegacy.comment_id, "Legacy comment ID should match")
assertEquals("Legacy comment", processedLegacy.comment_text, "Legacy comment text should match")
assertEquals("Legacy User", processedLegacy.author_name, "Legacy comment author should match")
assertTrue(processedLegacy.is_priority, "Legacy comment should be priority (priority > 2)")

// Test 5: Edge cases with EmailService
println "\n📝 Test 5: Edge cases with EmailService"
println "-" * 50

def nullResult = EmailService.processCommentsForTemplate(null)
assertEquals([], nullResult, "Null input should return empty list")

def emptyResult = EmailService.processCommentsForTemplate([])
assertEquals([], emptyResult, "Empty list should return empty list")

// Test 6: Date formatting validation
println "\n📝 Test 6: Date formatting validation"
println "-" * 50

LocalDateTime testDateTime = LocalDateTime.of(2025, 1, 15, 14, 30)

def dateComment = umig.dto.CommentDTO.builder()
    .commentId("date-test")
    .text("Date formatting test")
    .authorName("Date User")
    .createdDate(testDateTime)
    .build()

def dateResult = dateComment.toTemplateMap()

assertNotNull(dateResult, "Date comment result should not be null")
assertTrue(dateResult.containsKey('created_at'), "Date comment should have created_at")
assertTrue(dateResult.containsKey('formatted_date'), "Date comment should have formatted_date")
assertTrue(dateResult.containsKey('short_date'), "Date comment should have short_date")
assertTrue(dateResult.containsKey('time_only'), "Date comment should have time_only")

// Summary
println "\n" + "="*60
println "🎯 Test Summary"
println "="*60
println "Total Tests: ${testCount}"
println "Passed: ${passCount}"
println "Failed: ${testCount - passCount}"
println "Pass Rate: ${Math.round(((passCount as double) / (testCount as double) * 100.0) as double) as int}%"
println "="*60

if (passCount == testCount) {
    println "✅ ALL TESTS PASSED - CommentDTO Template Integration working correctly!"
    System.exit(0)
} else {
    println "❌ SOME TESTS FAILED - Review failures above"
    System.exit(1)
}