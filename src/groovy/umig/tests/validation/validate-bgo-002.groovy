#!/usr/bin/env groovy

/**
 * BGO-002 Step Data Validation Script
 * 
 * This script validates that BGO-002 step data is correctly fetched and displayed
 * by the StepRepository fixes, specifically testing:
 * 
 * 1. Step existence and basic data
 * 2. Hierarchical context (Migration → Iteration → Sequence → Phase)
 * 3. Team assignments and status information
 * 4. Labels and metadata
 * 5. Instructions and completion status
 * 
 * Target Step: BGO-002 in Migration 1 → RUN Iteration 1 → Sequence 1 → Phase 1
 * 
 * Author: GenDev Project Orchestrator
 * Part of: StepView data accuracy validation
 */

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.Sql
import umig.repository.StepRepository
import umig.utils.DatabaseUtil

// Test configuration
def TARGET_STEP_CODE = "BGO-002"
def TARGET_STEP_INSTANCE_ID = "4b97103c-1445-4d0e-867a-725502e04cba" // From Migration 1, Sequence 1, Phase 1

println "=" * 80
println "BGO-002 STEP DATA VALIDATION"
println "Target Step: ${TARGET_STEP_CODE}"
println "Instance ID: ${TARGET_STEP_INSTANCE_ID}"
println "=" * 80

def stepRepository = new StepRepository()
def validationResults = [:]
def errors = []

/**
 * Test 1: Validate step existence in database
 */
println "\n1. TESTING: Step existence in database"
try {
    DatabaseUtil.withSql { sql ->
        def stepExists = sql.firstRow("""
            SELECT 
                stm.stm_id,
                stm.stt_code,
                stm.stm_number,
                stm.stm_name,
                stm.stm_description,
                stm.tms_id_owner
            FROM steps_master_stm stm 
            WHERE stm.stt_code = 'BGO' AND stm.stm_number = 2
            LIMIT 1
        """)
        
        if (stepExists) {
            println "   ✓ BGO-002 step found in database"
            println "   - Step ID: ${stepExists.stm_id}"
            println "   - Name: ${stepExists.stm_name}"
            println "   - Owner Team ID: ${stepExists.tms_id_owner}"
            validationResults.stepExists = true
            validationResults.stepMasterData = stepExists
        } else {
            errors << "BGO-002 step not found in database"
            validationResults.stepExists = false
        }
    }
} catch (Exception e) {
    errors << "Database query failed: ${e.message}"
    println "   ✗ Database query failed: ${e.message}"
}

/**
 * Test 2: Validate step instance and hierarchical context
 */
println "\n2. TESTING: Step instance hierarchical context"
try {
    DatabaseUtil.withSql { sql ->
        def stepInstance = sql.firstRow("""
            SELECT 
                sti.sti_id,
                sti.sti_name,
                sti.sti_status,
                mig.mig_name as migration_name,
                ite.ite_name as iteration_name,
                sqm.sqm_name as sequence_name,
                phm.phm_name as phase_name,
                stm.stt_code || '-' || LPAD(stm.stm_number::text, 3, '0') as step_code,
                stm.stm_name as master_name,
                tms.tms_name as owner_team_name
            FROM steps_instance_sti sti
            JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
            LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
            JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
            JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
            JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
            JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
            JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
            JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
            JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
            WHERE sti.sti_id = :targetId::uuid
        """, [targetId: TARGET_STEP_INSTANCE_ID])
        
        if (stepInstance) {
            println "   ✓ Step instance found with complete hierarchy"
            println "   - Migration: ${stepInstance.migration_name}"
            println "   - Iteration: ${stepInstance.iteration_name}"
            println "   - Sequence: ${stepInstance.sequence_name}"
            println "   - Phase: ${stepInstance.phase_name}"
            println "   - Step Code: ${stepInstance.step_code}"
            println "   - Owner Team: ${stepInstance.owner_team_name ?: 'Unassigned'}"
            println "   - Status: ${stepInstance.sti_status}"
            
            validationResults.hierarchyValid = true
            validationResults.stepInstanceData = stepInstance
        } else {
            errors << "Step instance not found or hierarchy incomplete"
            validationResults.hierarchyValid = false
        }
    }
} catch (Exception e) {
    errors << "Hierarchy validation failed: ${e.message}"
    println "   ✗ Hierarchy validation failed: ${e.message}"
}

/**
 * Test 3: Test StepRepository findStepInstanceDetailsByCode method
 */
println "\n3. TESTING: StepRepository.findStepInstanceDetailsByCode"
try {
    def stepDetails = stepRepository.findStepInstanceDetailsByCode(TARGET_STEP_CODE)
    
    if (stepDetails) {
        println "   ✓ StepRepository method returned data"
        println "   - Step Summary ID: ${stepDetails.stepSummary?.ID}"
        println "   - Step Name: ${stepDetails.stepSummary?.Name}"
        println "   - Status: ${stepDetails.stepSummary?.Status}"
        println "   - Team: ${stepDetails.stepSummary?.AssignedTeam}"
        println "   - Migration: ${stepDetails.stepSummary?.MigrationName}"
        println "   - Iteration: ${stepDetails.stepSummary?.IterationName}"
        println "   - Sequence: ${stepDetails.stepSummary?.SequenceName}"
        println "   - Phase: ${stepDetails.stepSummary?.PhaseName}"
        println "   - Instructions Count: ${stepDetails.instructions?.size() ?: 0}"
        println "   - Impacted Teams Count: ${stepDetails.impactedTeams?.size() ?: 0}"
        println "   - Comments Count: ${stepDetails.comments?.size() ?: 0}"
        println "   - Labels Count: ${stepDetails.stepSummary?.Labels?.size() ?: 0}"
        
        validationResults.repositoryMethodWorking = true
        validationResults.stepRepositoryData = stepDetails
    } else {
        errors << "StepRepository.findStepInstanceDetailsByCode returned null"
        validationResults.repositoryMethodWorking = false
    }
} catch (Exception e) {
    errors << "StepRepository method failed: ${e.message}"
    println "   ✗ StepRepository method failed: ${e.message}"
}

/**
 * Test 4: Test StepRepository findStepInstanceDetailsById method  
 */
println "\n4. TESTING: StepRepository.findStepInstanceDetailsById"
try {
    def stepDetailsById = stepRepository.findStepInstanceDetailsById(UUID.fromString(TARGET_STEP_INSTANCE_ID))
    
    if (stepDetailsById) {
        println "   ✓ StepRepository by ID method returned data"
        println "   - Step ID: ${stepDetailsById.stepSummary?.ID}"
        println "   - Step Code: ${stepDetailsById.stepSummary?.StepCode}"
        println "   - Migration: ${stepDetailsById.stepSummary?.MigrationName}"
        println "   - Instructions Count: ${stepDetailsById.instructions?.size() ?: 0}"
        
        validationResults.repositoryByIdWorking = true
        validationResults.stepRepositoryByIdData = stepDetailsById
    } else {
        errors << "StepRepository.findStepInstanceDetailsById returned null"
        validationResults.repositoryByIdWorking = false
    }
} catch (Exception e) {
    errors << "StepRepository by ID method failed: ${e.message}"
    println "   ✗ StepRepository by ID method failed: ${e.message}"
}

/**
 * Test 5: Validate instructions data
 */
println "\n5. TESTING: Instructions data validation"
try {
    DatabaseUtil.withSql { sql ->
        def instructionsCount = sql.firstRow("""
            SELECT COUNT(*) as instruction_count
            FROM instructions_instance_ini ini
            JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
            WHERE ini.sti_id = :targetId::uuid
        """, [targetId: TARGET_STEP_INSTANCE_ID])
        
        def instructions = sql.rows("""
            SELECT 
                ini.ini_id,
                ini.ini_is_completed,
                inm.inm_order,
                inm.inm_body,
                inm.inm_duration_minutes
            FROM instructions_instance_ini ini
            JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
            WHERE ini.sti_id = :targetId::uuid
            ORDER BY inm.inm_order
            LIMIT 5
        """, [targetId: TARGET_STEP_INSTANCE_ID])
        
        println "   ✓ Instructions query successful"
        println "   - Total Instructions: ${instructionsCount.instruction_count}"
        
        if (instructions) {
            println "   - First 5 Instructions:"
            instructions.eachWithIndex { instruction, index ->
                println "     ${index + 1}. Order: ${instruction.inm_order}, Completed: ${instruction.ini_is_completed}"
                println "        Body: ${instruction.inm_body?.take(80)}..."
            }
        }
        
        validationResults.instructionsValid = true
        validationResults.instructionsCount = instructionsCount.instruction_count
    }
} catch (Exception e) {
    errors << "Instructions validation failed: ${e.message}"
    println "   ✗ Instructions validation failed: ${e.message}"
}

/**
 * Test 6: Validate labels data
 */
println "\n6. TESTING: Labels data validation"
try {
    if (validationResults.stepMasterData?.stm_id) {
        def labels = stepRepository.findLabelsByStepId(UUID.fromString(validationResults.stepMasterData.stm_id as String))
        
        println "   ✓ Labels query successful"
        println "   - Labels Count: ${labels?.size() ?: 0}"
        
        if (labels && labels.size() > 0) {
            println "   - Labels:"
            labels.each { label ->
                println "     - ${label.name}: ${label.description} (${label.color})"
            }
        } else {
            println "   - No labels assigned to this step"
        }
        
        validationResults.labelsValid = true
        validationResults.labelsCount = labels?.size() ?: 0
    } else {
        println "   ⚠ Skipping labels test - no step master ID available"
    }
} catch (Exception e) {
    errors << "Labels validation failed: ${e.message}"
    println "   ✗ Labels validation failed: ${e.message}"
}

/**
 * Test 7: Cross-reference validation between methods
 */
println "\n7. TESTING: Cross-reference validation"
try {
    def codeMethodData = validationResults.stepRepositoryData
    def idMethodData = validationResults.stepRepositoryByIdData
    
    if (codeMethodData && idMethodData) {
        def codeBasedName = codeMethodData.stepSummary?.Name
        def idBasedName = idMethodData.stepSummary?.Name
        def codeBasedMigration = codeMethodData.stepSummary?.MigrationName  
        def idBasedMigration = idMethodData.stepSummary?.MigrationName
        
        if (codeBasedName == idBasedName && codeBasedMigration == idBasedMigration) {
            println "   ✓ Data consistency between findByCode and findById methods"
            validationResults.crossReferenceValid = true
        } else {
            errors << "Data inconsistency between repository methods"
            println "   ✗ Data inconsistency detected:"
            println "     - Code Method Name: ${codeBasedName}"
            println "     - ID Method Name: ${idBasedName}"
            println "     - Code Method Migration: ${codeBasedMigration}"
            println "     - ID Method Migration: ${idBasedMigration}"
            validationResults.crossReferenceValid = false
        }
    } else {
        println "   ⚠ Insufficient data for cross-reference validation"
    }
} catch (Exception e) {
    errors << "Cross-reference validation failed: ${e.message}"
    println "   ✗ Cross-reference validation failed: ${e.message}"
}

/**
 * Final Results Summary
 */
println "\n" + "=" * 80
println "VALIDATION RESULTS SUMMARY"
println "=" * 80

if (errors.isEmpty()) {
    println "🎉 ALL TESTS PASSED - BGO-002 data validation successful!"
    println ""
    println "Key Validation Points:"
    println "✓ Step BGO-002 exists in database"
    println "✓ Complete hierarchical context available"
    println "✓ StepRepository.findStepInstanceDetailsByCode works correctly"
    println "✓ StepRepository.findStepInstanceDetailsById works correctly"
    println "✓ Instructions data is accessible"
    println "✓ Labels data is accessible" 
    println "✓ Data consistency between different query methods"
    
} else {
    println "❌ VALIDATION FAILED - ${errors.size()} error(s) found:"
    errors.eachWithIndex { error, index ->
        println "   ${index + 1}. ${error}"
    }
}

println ""
println "Detailed Results:"
validationResults.each { key, value ->
    println "- ${key}: ${value}"
}

println "\n" + "=" * 80
println "BGO-002 VALIDATION COMPLETE"
println "=" * 80

return [
    success: errors.isEmpty(),
    errors: errors,
    validationResults: validationResults,
    targetStep: TARGET_STEP_CODE,
    targetInstanceId: TARGET_STEP_INSTANCE_ID
]