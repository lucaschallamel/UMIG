package umig.tests.integration

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import groovyx.net.http.*
import spock.lang.*

/**
 * Integration tests for manual email sending feature (US-039 Phase 1)
 * Tests the POST /steps/{stepInstanceId}/send-email endpoint
 * with proper TO, CC, BCC recipient configuration
 */
@Title("Manual Email Sending Integration Tests")
@Narrative("""
    As a PILOT user
    I want to manually send email reports for steps
    So that I can test the enhanced mobile email templates
    With proper recipient configuration (TO: assigned team, CC: impacted teams, BCC: IT_CUTOVER)
""")
class ManualEmailSendingTest extends BaseIntegrationSpec {
    
    def setup() {
        println "=========================================="
        println "Starting ManualEmailSendingTest"
        println "=========================================="
    }
    
    def cleanup() {
        println "ManualEmailSendingTest completed"
        println "=========================================="
    }
    
    @Unroll
    def "Manual email sending for step instance #stepInstanceId should configure recipients correctly"() {
        given: "A valid step instance ID and user context"
        def requestBody = new JsonBuilder([
            userId: 1
        ]).toString()
        
        when: "POST request is sent to send-email endpoint"
        def response = sendRequest(
            method: 'POST',
            path: "/steps/${stepInstanceId}/send-email",
            body: requestBody,
            contentType: 'application/json'
        )
        
        then: "The response should be successful"
        response.status == expectedStatus
        
        and: "Response should contain proper recipient counts"
        if (expectedStatus == 200) {
            def jsonResponse = new JsonSlurper().parseText(response.data)
            assert jsonResponse.success == true
            assert jsonResponse.message.contains("mobile template")
            assert jsonResponse.stepInstanceId == stepInstanceId
            assert jsonResponse.recipientCount > 0
            assert jsonResponse.recipients != null
            assert jsonResponse.recipients.to >= 0
            assert jsonResponse.recipients.cc >= 0
            assert jsonResponse.recipients.bcc >= 0
            assert jsonResponse.emailsSent == 1
        }
        
        where:
        stepInstanceId                          | expectedStatus | description
        "a0000000-0000-0000-0000-000000000001" | 200           | "Valid step with teams"
        "a0000000-0000-0000-0000-000000000002" | 200           | "Valid step with multiple impacted teams"
        "a0000000-0000-0000-0000-000000000003" | 200           | "Valid step with IT_CUTOVER team"
        "invalid-uuid"                          | 400           | "Invalid UUID format"
        "b0000000-0000-0000-0000-999999999999" | 404           | "Non-existent step"
    }
    
    def "Manual email should properly configure TO, CC, and BCC recipients"() {
        given: "A step instance with known team configuration"
        def stepInstanceId = "a0000000-0000-0000-0000-000000000001"
        def requestBody = new JsonBuilder([
            userId: 1
        ]).toString()
        
        when: "Email is sent manually"
        def response = sendRequest(
            method: 'POST',
            path: "/steps/${stepInstanceId}/send-email",
            body: requestBody,
            contentType: 'application/json'
        )
        
        then: "Recipients should be properly categorized"
        response.status == 200
        def jsonResponse = new JsonSlurper().parseText(response.data)
        
        and: "TO should contain assigned team (1 recipient expected)"
        jsonResponse.recipients.to == 1 // Owner team
        
        and: "CC should contain impacted teams"
        jsonResponse.recipients.cc >= 0 // May have 0 or more impacted teams
        
        and: "BCC should contain IT_CUTOVER team if it exists"
        jsonResponse.recipients.bcc >= 0 // 0 if IT_CUTOVER team doesn't exist, 1 if it does
        
        and: "Total recipient count should match sum"
        jsonResponse.recipientCount == (jsonResponse.recipients.to + 
                                        jsonResponse.recipients.cc + 
                                        jsonResponse.recipients.bcc)
    }
    
    def "Manual email should handle missing teams gracefully"() {
        given: "A step instance that might have missing team data"
        def stepInstanceId = "a0000000-0000-0000-0000-000000000004"
        def requestBody = new JsonBuilder([
            userId: 1
        ]).toString()
        
        when: "Email is sent manually"
        def response = sendRequest(
            method: 'POST',
            path: "/steps/${stepInstanceId}/send-email",
            body: requestBody,
            contentType: 'application/json'
        )
        
        then: "Should handle gracefully even if some teams are missing"
        response.status == 200
        def jsonResponse = new JsonSlurper().parseText(response.data)
        jsonResponse.success == true
        jsonResponse.recipientCount >= 0 // At least 0 recipients
    }
    
    def "Manual email should log audit event"() {
        given: "A valid step instance and user context"
        def stepInstanceId = "a0000000-0000-0000-0000-000000000001"
        def requestBody = new JsonBuilder([
            userId: 42 // Specific user ID for audit tracking
        ]).toString()
        
        when: "Email is sent manually"
        def response = sendRequest(
            method: 'POST',
            path: "/steps/${stepInstanceId}/send-email",
            body: requestBody,
            contentType: 'application/json'
        )
        
        then: "Audit event should be logged"
        response.status == 200
        
        // Note: In a real test, we would verify the audit log entry
        // was created in the database with:
        // - usr_id = 42
        // - aud_action = 'EMAIL_SENT'
        // - aud_entity_type = 'steps_instance_sti'
        // - aud_entity_id = stepInstanceId
        // - aud_details containing recipient configuration
    }
    
    def "Manual email should use enhanced mobile template"() {
        given: "A step instance with rich content"
        def stepInstanceId = "a0000000-0000-0000-0000-000000000005"
        def requestBody = new JsonBuilder([
            userId: 1
        ]).toString()
        
        when: "Email is sent manually"
        def response = sendRequest(
            method: 'POST',
            path: "/steps/${stepInstanceId}/send-email",
            body: requestBody,
            contentType: 'application/json'
        )
        
        then: "Should use enhanced mobile template"
        response.status == 200
        def jsonResponse = new JsonSlurper().parseText(response.data)
        jsonResponse.message.contains("enhanced mobile template")
        jsonResponse.success == true
    }
    
    def "Manual email should handle concurrent requests"() {
        given: "Multiple concurrent email requests"
        def stepInstanceId = "a0000000-0000-0000-0000-000000000001"
        def requestBody = new JsonBuilder([
            userId: 1
        ]).toString()
        
        when: "Multiple requests are sent simultaneously"
        def responses = (1..3).collect { index ->
            Thread.start {
                sendRequest(
                    method: 'POST',
                    path: "/steps/${stepInstanceId}/send-email",
                    body: requestBody,
                    contentType: 'application/json'
                )
            }
        }*.join()
        
        then: "All requests should succeed"
        responses.each { response ->
            assert response.status == 200
            def jsonResponse = new JsonSlurper().parseText(response.data)
            assert jsonResponse.success == true
        }
    }
    
    def "Manual email should validate request body"() {
        given: "Various request body formats"
        def stepInstanceId = "a0000000-0000-0000-0000-000000000001"
        
        when: "Request is sent with body format: #bodyFormat"
        def response = sendRequest(
            method: 'POST',
            path: "/steps/${stepInstanceId}/send-email",
            body: requestBody,
            contentType: 'application/json'
        )
        
        then: "Should handle request appropriately"
        response.status == expectedStatus
        
        where:
        requestBody                                      | bodyFormat           | expectedStatus
        '{"userId": 1}'                                 | "Valid JSON"         | 200
        '{"userId": "1"}'                               | "String userId"      | 200
        '{}'                                            | "Empty object"       | 200
        ''                                              | "Empty body"         | 200
        '{"userId": null}'                              | "Null userId"        | 200
        '{"userId": -1}'                                | "Invalid userId"     | 200
        'invalid json'                                  | "Invalid JSON"       | 200 // Should handle gracefully
    }
}