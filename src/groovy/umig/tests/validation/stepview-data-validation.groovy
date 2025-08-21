#!/usr/bin/env groovy

/**
 * StepView Data Validation Test Script
 * 
 * Purpose: Validate that the StepRepository fixes correctly provide all required data
 * for the StepView pane in IterationView
 * 
 * Test Target: Step code APP-001 (or any available application step)
 * 
 * Created: August 19, 2025
 * Part of: US-036 StepView UI Refactoring
 */

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.Sql

// Test configuration
def TEST_STEP_CODE = "BGO-002"
def API_BASE_URL = "http://localhost:8090/rest/scriptrunner/latest/custom"

println "=" * 80
println "STEPVIEW DATA VALIDATION TEST"
println "Testing Step: ${TEST_STEP_CODE}"
println "=" * 80

/**
 * Validation Checklist
 * Each item represents a critical data point that must be validated
 */
class ValidationResult {
    String field
    String expected
    String actual
    boolean passed
    String notes
}

def validationResults = []

/**
 * Test 1: Direct Repository Method Test
 * Call the repository method directly to verify data structure
 */
println "\n1. TESTING REPOSITORY METHOD"
println "-" * 40

try {
    // Import repository
    def stepRepository = new umig.repository.StepRepository()
    def stepData = stepRepository.findStepInstanceDetailsByCode(TEST_STEP_CODE)
    
    if (stepData) {
        println "✅ Repository method returned data"
        
        // Validate Step Summary Fields
        def summary = stepData.stepSummary
        
        // Test hierarchical context
        validationResults << new ValidationResult(
            field: "MigrationName",
            expected: "Not null",
            actual: summary.MigrationName ?: "NULL",
            passed: summary.MigrationName != null,
            notes: "Hierarchical context from joins"
        )
        
        validationResults << new ValidationResult(
            field: "IterationName", 
            expected: "Not null",
            actual: summary.IterationName ?: "NULL",
            passed: summary.IterationName != null,
            notes: "Hierarchical context from joins"
        )
        
        validationResults << new ValidationResult(
            field: "PlanName",
            expected: "Not null",
            actual: summary.PlanName ?: "NULL",
            passed: summary.PlanName != null,
            notes: "Hierarchical context from joins"
        )
        
        validationResults << new ValidationResult(
            field: "SequenceName",
            expected: "Not null",
            actual: summary.SequenceName ?: "NULL",
            passed: summary.SequenceName != null,
            notes: "Hierarchical context from joins"
        )
        
        validationResults << new ValidationResult(
            field: "PhaseName",
            expected: "Not null",
            actual: summary.PhaseName ?: "NULL",
            passed: summary.PhaseName != null,
            notes: "Hierarchical context from joins"
        )
        
        // Test Labels
        validationResults << new ValidationResult(
            field: "Labels",
            expected: "Array (can be empty)",
            actual: summary.Labels ? "${summary.Labels.size()} labels" : "NULL or empty",
            passed: summary.Labels != null,
            notes: "Labels should be an array"
        )
        
        // Test Status
        validationResults << new ValidationResult(
            field: "Status",
            expected: "String status name",
            actual: summary.Status ?: "NULL",
            passed: summary.Status != null && !summary.Status.toString().matches("\\d+"),
            notes: "Should be status name, not ID"
        )
        
        // Test Team Assignment
        validationResults << new ValidationResult(
            field: "AssignedTeam",
            expected: "Team name",
            actual: summary.AssignedTeam ?: "NULL",
            passed: summary.AssignedTeam != null,
            notes: "From corrected team join"
        )
        
        // Test Step Code
        validationResults << new ValidationResult(
            field: "StepCode",
            expected: TEST_STEP_CODE,
            actual: summary.StepCode ?: "NULL",
            passed: summary.StepCode == TEST_STEP_CODE,
            notes: "Formatted step code"
        )
        
        // Test Instructions
        def instructions = stepData.instructions
        validationResults << new ValidationResult(
            field: "Instructions",
            expected: "Array",
            actual: instructions ? "${instructions.size()} instructions" : "NULL",
            passed: instructions != null && instructions instanceof List,
            notes: "Instructions array"
        )
        
    } else {
        println "❌ Repository method returned null"
        println "   Step ${TEST_STEP_CODE} may not exist in database"
    }
    
} catch (Exception e) {
    println "❌ Repository test failed: ${e.message}"
    e.printStackTrace()
}

/**
 * Test 2: API Endpoint Test
 * Call the REST API to verify the complete data flow
 */
println "\n2. TESTING API ENDPOINT"
println "-" * 40

try {
    def apiUrl = "${API_BASE_URL}/steps/instance/${TEST_STEP_CODE}"
    println "Calling: ${apiUrl}"
    
    def connection = new URL(apiUrl).openConnection()
    connection.setRequestProperty("Authorization", "Basic YWRtaW46YWRtaW4=") // admin:admin
    
    if (connection.responseCode == 200) {
        def response = new JsonSlurper().parseText(connection.inputStream.text)
        println "✅ API returned data"
        
        // Additional API-specific validations
        def summary = response.stepSummary
        
        // Verify all expected fields are present
        def requiredFields = [
            'ID', 'Name', 'Description', 'Status', 'AssignedTeam',
            'MigrationName', 'IterationName', 'PlanName', 'SequenceName', 'PhaseName',
            'StepCode', 'Labels', 'TargetEnvironment'
        ]
        
        requiredFields.each { field ->
            def value = summary[field]
            validationResults << new ValidationResult(
                field: "API.${field}",
                expected: "Present",
                actual: value ? "✓" : "Missing",
                passed: value != null,
                notes: "API response field"
            )
        }
        
    } else {
        println "❌ API returned error: ${connection.responseCode}"
    }
    
} catch (Exception e) {
    println "❌ API test failed: ${e.message}"
}

/**
 * Test 3: Visual Comparison Requirements
 * Document what needs to be checked visually in the UI
 */
println "\n3. VISUAL VALIDATION CHECKLIST"
println "-" * 40

def visualChecks = [
    "Breadcrumb displays: Migration › Plan › Iteration › Sequence › Phase",
    "Status dropdown shows status name (not ID)",
    "Labels display with correct colors",
    "Team name appears in 'Primary Team' field",
    "Instructions table shows all instructions with checkboxes",
    "Step code formatted as XXX-NNN (e.g., APP-001)",
    "Target Environment field populated",
    "Impacted Teams list shows team names",
    "Comments section loads and displays",
    "All data matches between StepView and IterationView pane"
]

println "Visual checks required:"
visualChecks.eachWithIndex { check, index ->
    println "  ${index + 1}. [ ] ${check}"
}

/**
 * Generate Test Report
 */
println "\n" + "=" * 80
println "TEST RESULTS SUMMARY"
println "=" * 80

def totalTests = validationResults.size()
def passedTests = validationResults.count { it.passed }
def failedTests = totalTests - passedTests

println "\nTotal Tests: ${totalTests}"
println "Passed: ${passedTests} ✅"
println "Failed: ${failedTests} ❌"
println "Success Rate: ${totalTests > 0 ? (passedTests * 100 / totalTests).round(1) : 0}%"

println "\nDetailed Results:"
println "-" * 40

validationResults.each { result ->
    def status = result.passed ? "✅ PASS" : "❌ FAIL"
    println "\n${status}: ${result.field}"
    println "  Expected: ${result.expected}"
    println "  Actual: ${result.actual}"
    if (result.notes) {
        println "  Notes: ${result.notes}"
    }
}

/**
 * Recommendations
 */
println "\n" + "=" * 80
println "RECOMMENDATIONS"
println "=" * 80

if (failedTests > 0) {
    println "\n⚠️ CRITICAL ISSUES FOUND:"
    validationResults.findAll { !it.passed }.each { result ->
        println "  - ${result.field}: ${result.notes ?: 'Validation failed'}"
    }
    
    println "\n📋 REQUIRED ACTIONS:"
    println "  1. Review the StepRepository.findStepInstanceDetailsByCode method"
    println "  2. Verify all SQL joins are correct"
    println "  3. Ensure Labels query is executed"
    println "  4. Check status name resolution"
    println "  5. Test with multiple step instances"
} else {
    println "\n✅ All automated tests passed!"
    println "\n📋 NEXT STEPS:"
    println "  1. Perform visual validation in the UI"
    println "  2. Compare StepView standalone vs IterationView pane"
    println "  3. Test with different user roles (NORMAL, PILOT, ADMIN)"
    println "  4. Verify real-time updates work correctly"
}

println "\n" + "=" * 80
println "Test completed at: ${new Date()}"
println "=" * 80