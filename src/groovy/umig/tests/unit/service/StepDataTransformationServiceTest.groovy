#!/usr/bin/env groovy

package umig.tests.unit.service

import java.util.UUID
import umig.dto.StepInstanceDTO
import umig.dto.StepMasterDTO
import umig.service.StepDataTransformationService
import umig.tests.unit.mock.MockStatusService

/**
 * Unit Tests for StepDataTransformationService (US-056-C API Layer Integration)
 * 
 * Tests the data transformation service that converts raw database results
 * to properly typed DTO objects for the API layer integration.
 * 
 * Key Testing Areas:
 * - fromDatabaseRow() method (StepInstanceDTO transformation)
 * - fromMasterDatabaseRow() method (StepMasterDTO transformation)
 * - null handling and defensive programming
 * - type casting validation (ADR-031)
 * - error handling for malformed data
 * 
 * Following UMIG patterns:
 * - Zero external dependencies (no Spock framework)
 * - Defensive null checking
 * - Explicit type casting validation (ADR-031, ADR-043)
 * - Mock-free unit testing where possible
 * 
 * Created: US-056-C API Layer Integration
 * Coverage Target: 95%+ for transformation methods
 */
class StepDataTransformationServiceTest {
    
    private StepDataTransformationService service
    
    void setUp() {
        service = new StepDataTransformationService()
    }
    
    /**
     * Test successful transformation from raw database row to StepInstanceDTO
     */
    void testFromDatabaseRow_Success() {
        setUp()
        
        // Arrange - Mock database row data with proper Map<String, Object> type
        Map<String, Object> rawData = [
            sti_id: UUID.randomUUID(),
            stm_id: UUID.randomUUID(),
            phm_id: UUID.randomUUID(),
            // TD-003 Migration: Use MockStatusService for controlled status values
            sti_status: MockStatusService.getStatusByName('IN_PROGRESS', 'Step')?.name ?: 'IN_PROGRESS',
            sti_actual_start_time: new Date(),
            sti_actual_end_time: new Date(),
            sti_assigned_user_id: "testuser",
            sti_comments: "Test comment",
            stm_name: "Test Step",
            stm_description: "Test Description",
            phi_name: "Test Phase",
            // TD-003 Migration: Dynamic status name from MockStatusService
            status_name: MockStatusService.getStatusByName('IN_PROGRESS', 'Step')?.name ?: 'IN_PROGRESS'
        ] as Map<String, Object>
        
        // Act - Use correct method name from service
        StepInstanceDTO result = service.fromDatabaseRow(rawData)
        
        // Assert - Use correct DTO property names
        assert result != null : "DTO should not be null"
        assert result.stepInstanceId == rawData.sti_id.toString() : "Step instance ID should match"
        assert result.stepId == rawData.stm_id.toString() : "Step master ID should match" 
        assert result.phaseId == rawData.phm_id.toString() : "Phase ID should match"
        // TD-003 Migration: Validate status using MockStatusService instead of hardcoded comparison
        assert MockStatusService.validateStatus(result.stepStatus, 'Step') : "Status should be valid: ${result.stepStatus}"
        assert result.stepStatus == MockStatusService.getStatusByName('IN_PROGRESS', 'Step')?.name : "Status should match expected value from service"
        assert result.stepName == rawData.stm_name : "Step name should match"
        assert result.stepDescription == rawData.stm_description : "Step description should match"
        
        println "[PASS] testFromDatabaseRow_Success"
    }
    
    /**
     * Test null handling in StepInstanceDTO transformation
     */
    void testFromDatabaseRow_NullHandling() {
        setUp()
        
        // Arrange - Minimal required fields only with proper type casting
        Map<String, Object> rawData = [
            sti_id: UUID.randomUUID(),
            stm_id: UUID.randomUUID(),
            phm_id: UUID.randomUUID(),
            // TD-003 Migration: Use MockStatusService for status value
            sti_status: MockStatusService.getDefaultStatus('Step'),
            stm_name: "Test Step",
            phi_name: "Test Phase",
            // TD-003 Migration: Dynamic status name
            status_name: MockStatusService.getDefaultStatus('Step')
            // Intentionally omitting optional fields
        ] as Map<String, Object>
        
        // Act
        StepInstanceDTO result = service.fromDatabaseRow(rawData)
        
        // Assert - Use correct DTO property names
        assert result != null : "DTO should not be null even with minimal data"
        assert result.stepInstanceId == rawData.sti_id.toString() : "Required field should be present"
        assert result.createdDate == null : "Optional field should be null"
        assert result.lastModifiedDate == null : "Optional field should be null"
        assert result.assignedTeamId == null : "Optional field should be null"
        
        println "[PASS] testFromDatabaseRow_NullHandling"
    }
    
    /**
     * Test successful transformation from raw database row to StepMasterDTO
     */
    void testFromMasterDatabaseRow_Success() {
        setUp()
        
        // Arrange - Mock master database row data with proper type casting
        Map<String, Object> rawData = [
            stm_id: UUID.randomUUID(),
            stt_code: "STP",
            stm_number: 1,
            stm_name: "Test Master Step",
            stm_description: "Test Master Description",
            stm_expected_duration_minutes: 30,
            stm_is_parallel: true,
            stm_dependencies: "DEP1,DEP2",
            stm_rollback_procedure: "Test rollback",
            phm_id: UUID.randomUUID(),
            phi_name: "Test Phase",
            instruction_count: 5,
            instance_count: 3
        ] as Map<String, Object>
        
        // Act - Use correct method name
        StepMasterDTO result = service.fromMasterDatabaseRow(rawData)
        
        // Assert - Use correct DTO property names from StepMasterDTO
        assert result != null : "DTO should not be null"
        assert result.stepMasterId == rawData.stm_id.toString() : "Step master ID should match"
        assert result.stepTypeCode == rawData.stt_code : "Step type code should match"
        assert result.stepNumber == rawData.stm_number : "Step number should match"
        assert result.stepName == rawData.stm_name : "Step name should match"
        assert result.stepDescription == rawData.stm_description : "Description should match"
        assert result.phaseId == rawData.phm_id.toString() : "Phase ID should match"
        assert result.instructionCount == rawData.instruction_count : "Instruction count should match"
        assert result.instanceCount == rawData.instance_count : "Instance count should match"
        
        println "[PASS] testFromMasterDatabaseRow_Success"
    }
    
    /**
     * Test error handling for null input
     */
    void testFromDatabaseRow_NullInput() {
        setUp()
        
        try {
            // Act - Pass null input with proper type casting
            service.fromDatabaseRow(null as Map<String, Object>)
            
            // Should not reach here
            assert false : "Should throw exception for null input"
        } catch (Exception e) {
            // Assert - Should handle gracefully with meaningful error message
            assert e.message.contains("null") || e.message.contains("cannot be null") : "Should have meaningful error message"
            println "[PASS] testFromDatabaseRow_NullInput - Exception handled: ${e.message}"
        }
    }
    
    /**
     * Test type casting validation (ADR-031 compliance)
     */
    void testFromDatabaseRow_TypeCasting() {
        setUp()
        
        // Arrange - Mix of proper and string types to test casting with explicit type
        Map<String, Object> rawData = [
            sti_id: UUID.randomUUID(),
            stm_id: UUID.randomUUID(),
            phm_id: UUID.randomUUID(),
            // TD-003 Migration: Use MockStatusService for test status
            sti_status: MockStatusService.getStatusByName('IN_PROGRESS', 'Step')?.name ?: 'IN_PROGRESS', // Dynamic status value
            sti_priority: "7", // String instead of Integer for priority
            stm_name: "Test Step",
            phi_name: "Test Phase",
            // TD-003 Migration: Consistent status naming
            status_name: MockStatusService.getStatusByName('IN_PROGRESS', 'Step')?.name ?: 'IN_PROGRESS'
        ] as Map<String, Object>
        
        // Act
        StepInstanceDTO result = service.fromDatabaseRow(rawData)
        
        // Assert - Should handle type casting per ADR-031
        assert result != null : "DTO should not be null"
        // TD-003 Migration: Dynamic status validation instead of hardcoded checks
        assert result.stepStatus instanceof String : "Status should remain as String"
        assert MockStatusService.validateStatus(result.stepStatus, 'Step') : "Status should be valid: ${result.stepStatus}"
        assert result.stepStatus == MockStatusService.getStatusByName('IN_PROGRESS', 'Step')?.name : "Status value should be correct from service"
        assert result.priority instanceof Integer : "Priority should be cast to Integer"
        assert result.priority == 7 : "Priority value should be correctly cast"
        
        println "[PASS] testFromDatabaseRow_TypeCasting"
    }
    
    /**
     * Run all tests
     */
    static void main(String[] args) {
        println "=== StepDataTransformationService Unit Tests ==="
        
        StepDataTransformationServiceTest test = new StepDataTransformationServiceTest()
        
        try {
            test.testFromDatabaseRow_Success()
            test.testFromDatabaseRow_NullHandling()
            test.testFromMasterDatabaseRow_Success()
            test.testFromDatabaseRow_NullInput()
            test.testFromDatabaseRow_TypeCasting()
            
            println "\n=== All Tests Passed ✓ ==="
            println "Coverage: StepDataTransformationService DTO transformation methods"
            println "Framework: ADR-036 Pure Groovy (Zero dependencies)"
            println "Type Safety: ADR-031 and ADR-043 compliant explicit casting"
            
        } catch (Exception e) {
            println "\n=== Test Failed ✗ ==="
            println "Error: ${e.message}"
            e.printStackTrace()
            System.exit(1)
        }
    }
}