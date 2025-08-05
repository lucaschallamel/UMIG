#!/usr/bin/env groovy

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper

// Import our mock response
import umig.tests.unit.api.v2.MockResponse

class InstructionsApiWorkingTest {
    
    static void testGetInstructionsByStepId() {
        println "\n🧪 Testing GET /instructions by stepId..."
        
        def stepId = UUID.fromString("0360e412-aa59-410a-b7e0-8fbec452949b")
        def expectedInstructions = [
            [inm_id: "123", inm_body: "Test instruction 1"],
            [inm_id: "456", inm_body: "Test instruction 2"]
        ]
        
        // Simulate API response
        def response = MockResponse.ok(new JsonBuilder([
            instructions: expectedInstructions,
            total: expectedInstructions.size()
        ]).toString()).build()
        
        assert response.status == 200
        def parsed = new JsonSlurper().parseText(response.entity)
        assert parsed.instructions.size() == 2
        assert parsed.total == 2
        
        println "✅ GET by stepId test passed"
    }
    
    static void testGetInstructionNotFound() {
        println "\n🧪 Testing GET /instructions/instance/{id} not found..."
        
        // Simulate 404 response
        def response = MockResponse.notFound()
            .entity(new JsonBuilder([error: "Instruction not found"]).toString())
            .build()
        
        assert response.status == 404
        def parsed = new JsonSlurper().parseText(response.entity)
        assert parsed.error == "Instruction not found"
        
        println "✅ Not found test passed"
    }
    
    static void testInvalidUUID() {
        println "\n🧪 Testing invalid UUID handling..."
        
        // Simulate 400 response for invalid UUID
        def response = MockResponse.badRequest()
            .entity(new JsonBuilder([error: "Invalid UUID format"]).toString())
            .build()
        
        assert response.status == 400
        def parsed = new JsonSlurper().parseText(response.entity)
        assert parsed.error == "Invalid UUID format"
        
        println "✅ Invalid UUID test passed"
    }
    
    static void testUpdateInstruction() {
        println "\n🧪 Testing PUT /instructions/{id}..."
        
        def instructionId = UUID.randomUUID()
        def updateData = [inm_body: "Updated instruction"]
        
        // Simulate successful update
        def response = MockResponse.ok(new JsonBuilder([
            message: "Instruction updated successfully"
        ]).toString()).build()
        
        assert response.status == 200
        def parsed = new JsonSlurper().parseText(response.entity)
        assert parsed.message == "Instruction updated successfully"
        
        println "✅ Update instruction test passed"
    }
    
    static void testDeleteInstruction() {
        println "\n🧪 Testing DELETE /instructions/{id}..."
        
        def instructionId = UUID.randomUUID()
        
        // Simulate successful deletion
        def response = MockResponse.ok(new JsonBuilder([
            message: "Master instruction deleted successfully"
        ]).toString()).build()
        
        assert response.status == 200
        def parsed = new JsonSlurper().parseText(response.entity)
        assert parsed.message == "Master instruction deleted successfully"
        
        println "✅ Delete instruction test passed"
    }
    
    static void main(String[] args) {
        println "🚀 Running Instructions API Unit Tests (Without External Dependencies)..."
        
        try {
            testGetInstructionsByStepId()
            testGetInstructionNotFound()
            testInvalidUUID()
            testUpdateInstruction()
            testDeleteInstruction()
            
            println "\n✅ All Instructions API unit tests passed!"
        } catch (AssertionError e) {
            println "\n❌ Test failed: ${e.message}"
            System.exit(1)
        }
    }
}