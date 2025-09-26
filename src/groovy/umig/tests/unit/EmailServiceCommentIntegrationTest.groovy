#!/usr/bin/env groovy

package umig.tests.unit

/**
 * CommentDTO Template Integration Test (US-056B Phase 2)
 * 
 * Tests the enhanced comment DTO template integration functionality
 * to ensure CommentDTO objects are properly converted to template-compatible
 * maps for email notifications. This unit test validates the toTemplateMap() method
 * and CommentDTO builder functionality.
 * 
 * Unit test using actual project classes for proper integration validation
 */

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Date

// Import actual project classes instead of creating mocks
import umig.dto.StepInstanceDTO
import umig.dto.CommentDTO
import umig.utils.EnhancedEmailService

// ========================================
// TEST EXECUTION
// ========================================

println "🧪 EmailService Comment Integration Test (US-056B Phase 2)"
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

// Test 1: StepInstanceDTO.CommentDTO objects
println "\n📝 Test 1: StepInstanceDTO.CommentDTO objects"
println "-" * 50

def comment1 = umig.dto.CommentDTO.builder()
    .commentId("comment-1")
    .text("First comment with high priority")
    .authorName("Alice Smith")
    .createdDate(LocalDateTime.now().minusHours(2))
    .priority(4)
    .requiresAttention(true)
    .commentType("URGENT")
    .build()
    
def comment2 = umig.dto.CommentDTO.builder()
    .commentId("comment-2")
    .text("Second comment with low priority")
    .authorName("Bob Johnson")
    .createdDate(LocalDateTime.now().minusMinutes(30))
    .priority(1)
    .commentType("GENERAL")
    .build()
    
def comments = [comment1, comment2]

// Test the toTemplateMap() method directly on CommentDTO objects
def result1 = comment1.toTemplateMap()
def result2 = comment2.toTemplateMap()

assertNotNull(result1, "Comment1 template map should not be null")
assertNotNull(result2, "Comment2 template map should not be null")

// Validate first comment
Map<String, Object> processedComment1 = result1 as Map<String, Object>
assertEquals("comment-1", processedComment1.comment_id, "First comment ID should match")
assertEquals("First comment with high priority", processedComment1.comment_text, "First comment text should match")
assertEquals("Alice Smith", processedComment1.author_name, "First comment author should match")
assertEquals(4, processedComment1.priority, "First comment priority should match")
assertEquals("URGENT", processedComment1.comment_type, "First comment type should match")
assertTrue((Boolean) processedComment1.requires_attention, "First comment should require attention")
assertTrue((Boolean) processedComment1.is_priority, "First comment should be priority (priority > 2)")

// Validate second comment
Map<String, Object> processedComment2 = result2 as Map<String, Object>
assertEquals("comment-2", processedComment2.comment_id, "Second comment ID should match")
assertEquals("Second comment with low priority", processedComment2.comment_text, "Second comment text should match")
assertEquals("Bob Johnson", processedComment2.author_name, "Second comment author should match")
assertEquals(1, processedComment2.priority, "Second comment priority should match")
assertEquals("GENERAL", processedComment2.comment_type, "Second comment type should match")
assertTrue(!(Boolean) processedComment2.requires_attention, "Second comment should not require attention")
assertTrue(!(Boolean) processedComment2.is_priority, "Second comment should not be priority (priority <= 2)")

// Validate template-specific fields are present
assertTrue(processedComment1.containsKey('formatted_date'), "First comment should have formatted_date")
assertTrue(processedComment1.containsKey('short_date'), "First comment should have short_date")
assertTrue(processedComment1.containsKey('time_only'), "First comment should have time_only")
assertTrue(processedComment1.containsKey('created_at'), "First comment should have created_at")
assertTrue(processedComment1.containsKey('is_recent'), "First comment should have is_recent")

// Test 2: Legacy comment objects
println "\n📝 Test 2: Legacy comment objects"
println "-" * 50

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

List<Map<String, Object>> legacyResult = EnhancedEmailService.processCommentsForTemplate(legacyComments)

assertNotNull(legacyResult, "Legacy result should not be null")
assertEquals(2, legacyResult.size(), "Should process 2 legacy comments")

// Validate first legacy comment
Map<String, Object> processed1 = legacyResult.get(0) as Map<String, Object>
assertEquals("legacy-1", processed1.comment_id, "First legacy comment ID should match")
assertEquals("Legacy comment text", processed1.comment_text, "First legacy comment text should match")
assertEquals("Legacy User", processed1.author_name, "First legacy comment author should match")
assertEquals(3, processed1.priority, "First legacy comment priority should match")
assertTrue((Boolean) processed1.is_priority, "First legacy comment should be priority (priority > 2)")

// Validate second legacy comment with alternative property names
Map<String, Object> processed2 = legacyResult.get(1) as Map<String, Object>
assertEquals("legacy-2", processed2.comment_id, "Second legacy comment ID should match")
assertEquals("Another legacy comment", processed2.comment_text, "Second legacy comment text should match")
assertEquals("Another User", processed2.author_name, "Second legacy comment author should match")
assertEquals(1, processed2.priority, "Second legacy comment should have default priority")

// Test 3: Mixed objects
println "\n📝 Test 3: Mixed StepInstanceDTO.CommentDTO and legacy objects"
println "-" * 50

def modernComment = umig.dto.CommentDTO.builder()
    .commentId("modern-1")
    .text("Modern StepInstanceDTO.CommentDTO")
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

List<Map<String, Object>> mixedResult = EnhancedEmailService.processCommentsForTemplate(mixedComments)

assertNotNull(mixedResult, "Mixed result should not be null")
assertEquals(2, mixedResult.size(), "Should process 2 mixed comments")

// Modern comment processed via toTemplateMap()
Map<String, Object> processedModern = mixedResult.get(0) as Map<String, Object>
assertEquals("modern-1", processedModern.comment_id, "Modern comment ID should match")
assertEquals("Modern StepInstanceDTO.CommentDTO", processedModern.comment_text, "Modern comment text should match")
assertEquals("Modern User", processedModern.author_name, "Modern comment author should match")
assertTrue(!(Boolean) processedModern.is_priority, "Modern comment should not be priority (priority <= 2)")

// Legacy comment processed via fallback
Map<String, Object> processedLegacy = mixedResult.get(1) as Map<String, Object>
assertEquals("legacy-1", processedLegacy.comment_id, "Legacy comment ID should match")
assertEquals("Legacy comment", processedLegacy.comment_text, "Legacy comment text should match")
assertEquals("Legacy User", processedLegacy.author_name, "Legacy comment author should match")
assertTrue((Boolean) processedLegacy.is_priority, "Legacy comment should be priority (priority > 2)")

// Test 4: Edge cases
println "\n📝 Test 4: Edge cases"
println "-" * 50

List<Map<String, Object>> nullResult = EnhancedEmailService.processCommentsForTemplate(null)
assertEquals([], nullResult, "Null input should return empty list")

List<Map<String, Object>> emptyStringResult = EnhancedEmailService.processCommentsForTemplate("")
assertEquals([], emptyStringResult, "Empty string should return empty list")

List<Map<String, Object>> invalidStringResult = EnhancedEmailService.processCommentsForTemplate("invalid string")
assertEquals([], invalidStringResult, "Invalid string should return empty list")

List<Map<String, Object>> emptyListResult = EnhancedEmailService.processCommentsForTemplate([])
assertEquals([], emptyListResult, "Empty list should return empty list")

// Unknown objects get minimal safe structure
Object unknownObject = new Object()
List<Map<String, Object>> unknownResult = EnhancedEmailService.processCommentsForTemplate([unknownObject])
assertNotNull(unknownResult, "Unknown object result should not be null")
assertEquals(1, unknownResult.size(), "Unknown object should return 1 item")
Map<String, Object> processed = unknownResult.get(0) as Map<String, Object>
assertEquals("", processed.comment_id, "Unknown object should have empty comment_id")
assertNotNull(processed.comment_text, "Unknown object should have non-null comment_text")
assertEquals("Anonymous", processed.author_name, "Unknown object should have Anonymous author")
assertTrue(!(Boolean) processed.is_active, "Unknown object should not be active")

// Test 5: Comment limiting
println "\n📝 Test 5: Comment limiting to 3 items"
println "-" * 50

def manyComments = (1..5).collect { i ->
    umig.dto.CommentDTO.builder()
        .commentId("comment-${i}")
        .text("Comment number ${i}")
        .authorName("User ${i}")
        .build()
}

List<Map<String, Object>> limitedResult = EnhancedEmailService.processCommentsForTemplate(manyComments)

assertNotNull(limitedResult, "Limited result should not be null")
assertEquals(3, limitedResult.size(), "Should limit to 3 comments")
assertEquals("comment-1", (limitedResult.get(0) as Map<String, Object>).comment_id, "First comment should be comment-1")
assertEquals("comment-2", (limitedResult.get(1) as Map<String, Object>).comment_id, "Second comment should be comment-2")
assertEquals("comment-3", (limitedResult.get(2) as Map<String, Object>).comment_id, "Third comment should be comment-3")

// Test 6: Single comment object
println "\n📝 Test 6: Single comment object (not in list)"
println "-" * 50

def singleComment = umig.dto.CommentDTO.builder()
    .commentId("single-1")
    .text("Single comment")
    .authorName("Single User")
    .build()

List<Map<String, Object>> singleResult = EnhancedEmailService.processCommentsForTemplate(singleComment)

assertNotNull(singleResult, "Single result should not be null")
assertEquals(1, singleResult.size(), "Single comment should return 1 item")
Map<String, Object> singleProcessed = singleResult.get(0) as Map<String, Object>
assertEquals("single-1", singleProcessed.comment_id, "Single comment ID should match")
assertEquals("Single comment", singleProcessed.comment_text, "Single comment text should match")
assertEquals("Single User", singleProcessed.author_name, "Single comment author should match")

// Test 7: Date formatting
println "\n📝 Test 7: Date formatting helper methods"
println "-" * 50

LocalDateTime localDateTime = LocalDateTime.of(2025, 1, 15, 14, 30)
Date javaDate = new Date(125, 0, 15, 14, 30)  // Year 2025

def commentWithLocalDateTime = umig.dto.CommentDTO.builder()
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

List<Map<String, Object>> dateResult = EnhancedEmailService.processCommentsForTemplate([commentWithLocalDateTime, legacyWithJavaDate])

assertNotNull(dateResult, "Date result should not be null")
assertEquals(2, dateResult.size(), "Should process 2 comments with different date types")

// LocalDateTime formatting
Map<String, Object> dtComment = dateResult.get(0) as Map<String, Object>
assertEquals("2025-01-15T14:30:00", dtComment.created_at, "LocalDateTime should format correctly to ISO")
assertEquals("Jan. 15, 2025 14:30", dtComment.formatted_date, "LocalDateTime should format correctly")
assertEquals("Jan. 15", dtComment.short_date, "LocalDateTime should format short date correctly")
assertEquals("14:30", dtComment.time_only, "LocalDateTime should format time correctly")

// Java Date formatting (legacy processing)
Map<String, Object> dateComment = dateResult.get(1) as Map<String, Object>
assertTrue(dateComment.containsKey('created_at'), "Java Date comment should have created_at")
assertTrue(dateComment.containsKey('formatted_date'), "Java Date comment should have formatted_date")
assertTrue(dateComment.containsKey('short_date'), "Java Date comment should have short_date")
assertTrue(dateComment.containsKey('time_only'), "Java Date comment should have time_only")

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
    println "✅ ALL TESTS PASSED - EmailService Comment Integration working correctly!"
    System.exit(0)
} else {
    println "❌ SOME TESTS FAILED - Review failures above"
    System.exit(1)
}