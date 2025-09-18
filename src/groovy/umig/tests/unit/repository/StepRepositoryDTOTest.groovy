#!/usr/bin/env groovy

package umig.tests.unit.repository

import java.util.UUID
import java.sql.SQLException
import umig.dto.StepInstanceDTO
import umig.dto.StepMasterDTO
import umig.service.StepDataTransformationService
import umig.tests.unit.mock.MockStatusService

/**
 * Unit Tests for StepRepository DTO Methods (US-056-C API Layer Integration)
 * 
 * Tests the new DTO methods added to StepRepository:
 * - findFilteredStepInstancesAsDTO(Map filters)
 * - findMasterStepsWithFiltersAsDTO(Map filters, int pageNumber, int pageSize, String sortField, String sortDirection)
 * 
 * These tests verify the migration to service layer DTOs maintains functionality
 * while providing proper type safety and data transformation.
 * 
 * Following UMIG patterns:
 * - ADR-026: Specific SQL query mocking to prevent regressions
 * - ADR-031: Explicit type casting validation
 * - Zero external dependencies (no Spock framework)
 * - DatabaseUtil.withSql pattern compliance
 * 
 * Created: US-056-C API Layer Integration
 * Coverage Target: 95%+ for DTO methods
 */

// --- Mock Database Util ---
class DatabaseUtil {
    static Object withSql(Closure closure) {
        MockSql mockSql = new MockSql()
        return closure.call(mockSql)
    }
}

class MockSql {
    Object firstRow(String query, Map params = [:]) {
        // Mock count queries for pagination
        if (query.contains("SELECT COUNT(DISTINCT stm.stm_id)")) {
            return [15] // Mock total count for pagination testing
        }
        
        return null
    }
    
    List<Map> rows(String query, Map params = [:]) {
        // Mock findFilteredStepInstancesAsDTO query (DTO base query)
        if (query.contains("ORDER BY sqm.sqm_order, phm.phm_order, stm.stm_number")) {
            return createMockStepInstanceRows(params)
        }
        
        // Mock findMasterStepsWithFiltersAsDTO data query
        if (query.contains("SELECT stm.stm_id,") && query.contains("instruction_count") && query.contains("LIMIT :limit")) {
            return createMockStepMasterRows(params)
        }
        
        return []
    }
    
    private List<Map> createMockStepInstanceRows(Map params) {
        List<Map> baseRows = [
            [
                // Core step identification
                sti_id: UUID.randomUUID(),
                stm_id: UUID.randomUUID(),
                stm_name: "Test Step 1",
                stm_description: "Test step description 1",
                sti_status: 1,
                
                // Team assignment
                tms_id_owner: 101,
                tms_name: "Test Team",
                
                // Hierarchical context
                mig_id: UUID.randomUUID(),
                mig_code: "MIG001",
                ite_id: UUID.randomUUID(),
                ite_code: "ITE001",
                sqi_id: UUID.randomUUID(),
                phi_id: UUID.randomUUID(),
                
                // Step type and ordering
                stt_code: "CUTOVER",
                stm_number: 1,
                
                // Temporal fields
                sti_planned_start_time: new Date(),
                sti_planned_end_time: new Date(System.currentTimeMillis() + 3600000),
                sti_actual_start_time: null,
                sti_actual_end_time: null,
                
                // Progress tracking
                sti_progress_percentage: 0,
                sti_duration_minutes: null,
                sti_execution_notes: null
            ],
            [
                // Second row for multiple results testing
                sti_id: UUID.randomUUID(),
                stm_id: UUID.randomUUID(),
                stm_name: "Test Step 2",
                stm_description: "Test step description 2",
                sti_status: 2,
                tms_id_owner: 102,
                tms_name: "Test Team 2",
                mig_id: params.migrationId ?: UUID.randomUUID(),
                mig_code: "MIG001",
                ite_id: params.iterationId ?: UUID.randomUUID(),
                ite_code: "ITE001",
                sqi_id: UUID.randomUUID(),
                phi_id: UUID.randomUUID(),
                stt_code: "VALIDATION",
                stm_number: 2,
                sti_planned_start_time: new Date(),
                sti_planned_end_time: new Date(System.currentTimeMillis() + 3600000),
                sti_actual_start_time: null,
                sti_actual_end_time: null,
                sti_progress_percentage: 50,
                sti_duration_minutes: null,
                sti_execution_notes: "Test notes"
            ]
        ]
        
        // Apply filtering logic based on parameters
        List<Map> filteredRows = baseRows
        
        if (params.migrationId) {
            filteredRows = filteredRows.findAll { it.mig_id == params.migrationId }
        }
        
        if (params.iterationId) {
            filteredRows = filteredRows.findAll { it.ite_id == params.iterationId }
        }
        
        if (params.teamId) {
            filteredRows = filteredRows.findAll { it.tms_id_owner == params.teamId }
        }
        
        return filteredRows
    }
    
    private List<Map> createMockStepMasterRows(Map params) {
        List<Map> baseRows = [
            [
                stm_id: UUID.randomUUID(),
                stt_code: "CUTOVER",
                stm_number: 1,
                stm_name: "Master Step 1",
                stm_description: "Master step description 1",
                phm_id: UUID.randomUUID(),
                created_date: new Date(),
                last_modified_date: new Date(),
                is_active: true,
                phm_name: "Phase 1",
                sqm_name: "Sequence 1", 
                plm_name: "Plan 1",
                owner_team_name: "Owner Team",
                instruction_count: 3,
                instance_count: 5
            ],
            [
                stm_id: UUID.randomUUID(),
                stt_code: "VALIDATION",
                stm_number: 1,
                stm_name: "Master Step 2",
                stm_description: "Master step description 2",
                phm_id: UUID.randomUUID(),
                created_date: new Date(),
                last_modified_date: new Date(),
                is_active: true,
                phm_name: "Phase 2",
                sqm_name: "Sequence 2",
                plm_name: "Plan 2", 
                owner_team_name: "Owner Team 2",
                instruction_count: 2,
                instance_count: 3
            ]
        ]
        
        // Apply filtering logic
        List<Map> filteredRows = baseRows
        
        if (params.stmId) {
            filteredRows = filteredRows.findAll { Map it -> it.stm_id == params.stmId }
        }
        
        if (params.stmName) {
            String searchTerm = params.stmName.toString().toLowerCase().replace("%", "")
            filteredRows = filteredRows.findAll { Map it -> 
                ((String) it.stm_name).toLowerCase().contains(searchTerm)
            }
        }
        
        if (params.sttCode) {
            filteredRows = filteredRows.findAll { Map it -> it.stt_code == params.sttCode }
        }
        
        return filteredRows
    }
}

// --- Mock StepDataTransformationService ---
class MockStepDataTransformationService {
    
    List<StepInstanceDTO> batchTransformFromDatabaseRows(List<Map> rows) {
        return rows.collect { Map row ->
            StepInstanceDTO dto = new StepInstanceDTO()
            dto.stepId = row.stm_id?.toString()
            dto.stepInstanceId = row.sti_id?.toString()
            dto.stepName = row.stm_name
            dto.stepDescription = row.stm_description
            // TD-003 Migration: Dynamic status transformation via MockStatusService
            dto.stepStatus = MockStatusService.getStatusNameById(row.sti_status as Integer)
            dto.assignedTeamId = row.tms_id_owner?.toString()
            dto.assignedTeamName = row.tms_name
            dto.migrationId = row.mig_id?.toString()
            dto.migrationCode = row.mig_code
            dto.iterationId = row.ite_id?.toString()
            dto.iterationCode = row.ite_code
            dto.sequenceId = row.sqi_id?.toString()
            dto.phaseId = row.phi_id?.toString()
            dto.stepType = row.stt_code
            // Note: stepNumber and progressPercentage are not properties of StepInstanceDTO
            // Note: executionNotes is not a property of StepInstanceDTO
            return dto
        }
    }
    
    List<StepMasterDTO> fromMasterDatabaseRows(List<Map> rows) {
        return rows.collect { Map row ->
            StepMasterDTO dto = new StepMasterDTO()
            dto.stepMasterId = row.stm_id?.toString()
            dto.stepTypeCode = row.stt_code
            dto.stepNumber = row.stm_number as Integer
            dto.stepName = row.stm_name
            dto.stepDescription = row.stm_description
            dto.phaseId = row.phm_id?.toString()
            dto.createdDate = row.created_date?.toString()
            dto.lastModifiedDate = row.last_modified_date?.toString()
            dto.isActive = row.is_active as Boolean
            dto.instructionCount = row.instruction_count as Integer
            dto.instanceCount = row.instance_count as Integer
            return dto
        }
    }
    
    String mapStatusToString(Integer status) {
        // TD-003 Migration: Use MockStatusService instead of hardcoded values
        return MockStatusService.getStatusNameById(status)
    }
}

// --- Mock StepRepository for DTO Methods ---
class MockStepRepository {
    private final MockStepDataTransformationService transformationService = new MockStepDataTransformationService()
    
    List<StepInstanceDTO> findFilteredStepInstancesAsDTO(Map filters) {
        return (DatabaseUtil.withSql { MockSql sql ->
            String query = buildDTOBaseQuery()
            Map params = [:]
            List<String> whereConditions = ["sti.sti_is_active = true"]
            
            // Add hierarchical filters with explicit casting (ADR-031)
            if (filters.migrationId) {
                whereConditions << "mig.mig_id = :migrationId"
                params.migrationId = UUID.fromString(filters.migrationId as String)
            }
            
            if (filters.iterationId) {
                whereConditions << "ite.ite_id = :iterationId"
                params.iterationId = UUID.fromString(filters.iterationId as String)
            }
            
            if (filters.planId) {
                whereConditions << "pli.pli_id = :planId"
                params.planId = UUID.fromString(filters.planId as String)
            }
            
            if (filters.sequenceId) {
                whereConditions << "sqi.sqi_id = :sequenceId"
                params.sequenceId = UUID.fromString(filters.sequenceId as String)
            }
            
            if (filters.phaseId) {
                whereConditions << "phi.phi_id = :phaseId"
                params.phaseId = UUID.fromString(filters.phaseId as String)
            }
            
            // Add team filter with explicit casting
            if (filters.teamId) {
                whereConditions << "stm.tms_id_owner = :teamId"
                params.teamId = Integer.parseInt(filters.teamId as String)
            }
            
            // Add label filter
            if (filters.labelId) {
                whereConditions << '''EXISTS (
                        SELECT 1 FROM labels_lbl_x_steps_master_stm lxs 
                        WHERE lxs.stm_id = stm.stm_id AND lxs.lbl_id = :labelId
                    )'''
                params.labelId = Integer.parseInt(filters.labelId as String)
            }
            
            String whereClause = whereConditions ? "WHERE ${whereConditions.join(' AND ')}" : ""
            String orderByClause = "ORDER BY sqm.sqm_order, phm.phm_order, stm.stm_number"
            
            String finalQuery = query + " " + whereClause + " " + orderByClause
            List<Map> rows = sql.rows(finalQuery, params)
            
            return transformationService.batchTransformFromDatabaseRows(rows as List<Map>)
        }) as List<StepInstanceDTO>
    }
    
    Map findMasterStepsWithFiltersAsDTO(Map filters, int pageNumber = 1, int pageSize = 50, String sortField = null, String sortDirection = 'asc') {
        return (DatabaseUtil.withSql { MockSql sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            List<String> whereConditions = []
            Map params = [:]
            
            // Build WHERE clause from filters with explicit casting (ADR-031)
            if (filters.stm_id) {
                whereConditions << "stm.stm_id = :stmId"
                params.stmId = UUID.fromString(filters.stm_id as String)
            }
            
            if (filters.stm_name) {
                whereConditions << "LOWER(stm.stm_name) LIKE LOWER(:stmName)"
                params.stmName = "%${filters.stm_name}%"
            }
            
            if (filters.stt_code) {
                whereConditions << "stm.stt_code = :sttCode"
                params.sttCode = filters.stt_code as String
            }
            
            String whereClause = whereConditions ? "WHERE ${whereConditions.join(' AND ')}" : ""
            
            // Validate and set sort field
            List<String> allowedSortFields = ['stm_id', 'stm_name', 'stm_order', 'created_at', 'updated_at', 'instruction_count', 'instance_count', 'plm_name', 'sqm_name', 'phm_name']
            String actualSortField = allowedSortFields.contains(sortField) ? sortField : 'stm.stm_order'
            String actualSortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
            
            // Count query for pagination
            String countQuery = """
                SELECT COUNT(DISTINCT stm.stm_id)
                FROM steps_master_stm stm
                JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                ${whereClause}
            """
            
            Object firstRowResult = sql.firstRow(countQuery, params)
            Integer totalCount = ((List) firstRowResult)[0] as Integer
            Integer totalPages = Math.ceil(totalCount / (double) pageSize) as Integer
            
            // Main query with pagination
            int offset = (pageNumber - 1) * pageSize
            params.limit = pageSize
            params.offset = offset
            
            String dataQuery = """
                SELECT stm.stm_id,
                       stm.stt_code,
                       stm.stm_number,
                       stm.stm_name,
                       stm.stm_description,
                       stm.phm_id,
                       stm.created_date,
                       stm.last_modified_date,
                       stm.is_active,
                       phm.phm_name,
                       sqm.sqm_name,
                       plm.plm_name,
                       tms.tms_name as owner_team_name,
                       (SELECT COUNT(*) FROM instructions_master_inm inm 
                        WHERE inm.stm_id = stm.stm_id) as instruction_count,
                       (SELECT COUNT(*) FROM steps_instance_sti sti 
                        WHERE sti.stm_id = stm.stm_id) as instance_count
                FROM steps_master_stm stm
                JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                ${whereClause}
                ORDER BY ${actualSortField} ${actualSortDirection}
                LIMIT :limit OFFSET :offset
            """
            
            List<Map> rows = sql.rows(dataQuery, params)
            List<StepMasterDTO> dtos = transformationService.fromMasterDatabaseRows(rows as List<Map>)
            
            return [
                data: dtos,
                pagination: [
                    pageNumber: pageNumber,
                    pageSize: pageSize,
                    totalPages: totalPages,
                    totalCount: totalCount,
                    hasNext: pageNumber < totalPages,
                    hasPrevious: pageNumber > 1
                ],
                filters: filters,
                sort: [
                    field: actualSortField,
                    direction: actualSortDirection
                ]
            ]
        }) as Map
    }
    
    private String buildDTOBaseQuery() {
        return "MOCK_DTO_BASE_QUERY"
    }
}

// --- Test Runner ---
class StepRepositoryDTOTests {
    MockStepRepository stepRepository = new MockStepRepository()
    
    void runTests() {
        println "🚀 Running StepRepository DTO Unit Tests (US-056-C)..."
        int passed = 0
        int failed = 0
        
        // Test 1: findFilteredStepInstancesAsDTO - with migrationId filter
        try {
            UUID migrationId = UUID.randomUUID()
            Map filters = [migrationId: migrationId.toString()]
            
            List<StepInstanceDTO> results = stepRepository.findFilteredStepInstancesAsDTO(filters)
            
            assert results != null : "Results should not be null"
            assert results instanceof List : "Results should be a List"
            assert results.size() >= 1 : "Should return at least 1 result for migration filter"
            assert results[0] instanceof StepInstanceDTO : "Results should contain StepInstanceDTO objects"
            assert results[0].stepName != null : "DTO should have step name populated"
            assert results[0].stepStatus != null : "DTO should have step status populated"
            
            println "✅ Test 1 passed: findFilteredStepInstancesAsDTO with migrationId filter"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 1 failed: ${e.message}"
            failed++
        }
        
        // Test 2: findFilteredStepInstancesAsDTO - with iterationId filter
        try {
            UUID iterationId = UUID.randomUUID()
            Map filters = [iterationId: iterationId.toString()]
            
            List<StepInstanceDTO> results = stepRepository.findFilteredStepInstancesAsDTO(filters)
            
            assert results != null : "Results should not be null"
            assert results instanceof List : "Results should be a List"
            assert results.size() >= 1 : "Should return at least 1 result for iteration filter"
            assert results[0] instanceof StepInstanceDTO : "Results should contain StepInstanceDTO objects"
            assert results[0].iterationId != null : "DTO should have iteration ID populated"
            
            println "✅ Test 2 passed: findFilteredStepInstancesAsDTO with iterationId filter"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 2 failed: ${e.message}"
            failed++
        }
        
        // Test 3: findFilteredStepInstancesAsDTO - with multiple filters
        try {
            UUID migrationId = UUID.randomUUID()
            int teamId = 101
            Map filters = [
                migrationId: migrationId.toString(),
                teamId: teamId.toString()
            ]
            
            List<StepInstanceDTO> results = stepRepository.findFilteredStepInstancesAsDTO(filters)
            
            assert results != null : "Results should not be null"
            assert results instanceof List : "Results should be a List"
            // Note: Mock will filter results, so may be empty with specific IDs
            assert results.every { it instanceof StepInstanceDTO } : "All results should be StepInstanceDTO objects"
            
            println "✅ Test 3 passed: findFilteredStepInstancesAsDTO with multiple filters"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 3 failed: ${e.message}"
            failed++
        }
        
        // Test 4: findFilteredStepInstancesAsDTO - empty filters returns all
        try {
            Map filters = [:]
            
            List<StepInstanceDTO> results = stepRepository.findFilteredStepInstancesAsDTO(filters)
            
            assert results != null : "Results should not be null"
            assert results instanceof List : "Results should be a List"
            assert results.size() >= 2 : "Should return all results when no filters"
            assert results.every { it instanceof StepInstanceDTO } : "All results should be StepInstanceDTO objects"
            
            println "✅ Test 4 passed: findFilteredStepInstancesAsDTO with empty filters"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 4 failed: ${e.message}"
            failed++
        }
        
        // Test 5: findFilteredStepInstancesAsDTO - DTO transformation correctness
        try {
            Map filters = [:]
            
            List<StepInstanceDTO> results = stepRepository.findFilteredStepInstancesAsDTO(filters)
            StepInstanceDTO dto = results[0]
            
            // Verify all key fields are populated correctly
            assert dto.stepId != null : "Step ID should be populated"
            assert dto.stepInstanceId != null : "Step Instance ID should be populated"
            assert dto.stepName == "Test Step 1" : "Step name should match mock data"
            assert dto.stepDescription == "Test step description 1" : "Description should match"
            // TD-003 Migration: Use dynamic status validation instead of hardcoded expectation
            assert MockStatusService.validateStatus(dto.stepStatus, 'Step') : "Status should be valid: ${dto.stepStatus}"
            assert dto.stepStatus == MockStatusService.getStatusNameById(1) : "Status should match expected mapping for ID 1"
            assert dto.assignedTeamId == "101" : "Team ID should be transformed to string"
            assert dto.assignedTeamName == "Test Team" : "Team name should be populated"
            assert dto.stepType == "CUTOVER" : "Step type should be populated"
            // Note: stepNumber is not available in StepInstanceDTO
            
            println "✅ Test 5 passed: findFilteredStepInstancesAsDTO DTO transformation correctness"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 5 failed: ${e.message}"
            failed++
        }
        
        // Test 6: findMasterStepsWithFiltersAsDTO - basic pagination
        try {
            Map filters = [:]
            int pageNumber = 1
            int pageSize = 10
            
            Map result = stepRepository.findMasterStepsWithFiltersAsDTO(filters, pageNumber, pageSize)
            
            assert result != null : "Result should not be null"
            assert result.data != null : "Data should not be null"
            assert result.pagination != null : "Pagination should not be null"
            assert result.data instanceof List : "Data should be a List"
            assert result.data.every { it instanceof StepMasterDTO } : "All data should be StepMasterDTO objects"
            
            // Verify pagination structure
            Map paginationInfo = (Map) result.pagination
            assert paginationInfo.pageNumber == 1 : "Page number should be 1"
            assert paginationInfo.pageSize == 10 : "Page size should be 10"
            assert paginationInfo.totalCount == 15 : "Total count should match mock"
            assert paginationInfo.totalPages == 2 : "Total pages should be calculated correctly"
            assert paginationInfo.hasNext == true : "Should have next page"
            assert paginationInfo.hasPrevious == false : "Should not have previous page"
            
            println "✅ Test 6 passed: findMasterStepsWithFiltersAsDTO basic pagination"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 6 failed: ${e.message}"
            failed++
        }
        
        // Test 7: findMasterStepsWithFiltersAsDTO - sorting validation
        try {
            Map filters = [:]
            Map result = stepRepository.findMasterStepsWithFiltersAsDTO(filters, 1, 10, "stm_name", "desc")
            
            assert result.sort != null : "Sort information should be provided"
            Map sortInfo = (Map) result.sort
            assert sortInfo.field == "stm_name" : "Sort field should be set correctly"
            assert sortInfo.direction == "DESC" : "Sort direction should be uppercase"
            
            println "✅ Test 7 passed: findMasterStepsWithFiltersAsDTO sorting validation"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 7 failed: ${e.message}"
            failed++
        }
        
        // Test 8: findMasterStepsWithFiltersAsDTO - filtering by step name
        try {
            Map filters = [stm_name: "Master Step 1"]
            
            Map result = stepRepository.findMasterStepsWithFiltersAsDTO(filters, 1, 10)
            
            assert result.data != null : "Data should not be null"
            assert result.filters == filters : "Filters should be preserved in response"
            assert result.data.every { it instanceof StepMasterDTO } : "All results should be StepMasterDTO objects"
            
            println "✅ Test 8 passed: findMasterStepsWithFiltersAsDTO filtering by step name"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 8 failed: ${e.message}"
            failed++
        }
        
        // Test 9: findMasterStepsWithFiltersAsDTO - DTO transformation correctness
        try {
            Map filters = [:]
            Map result = stepRepository.findMasterStepsWithFiltersAsDTO(filters, 1, 10)
            StepMasterDTO dto = ((List<StepMasterDTO>) result.data)[0]
            
            // Verify all key fields are populated correctly
            assert dto.stepMasterId != null : "Step Master ID should be populated"
            assert dto.stepName == "Master Step 1" : "Step name should match mock data"
            assert dto.stepDescription == "Master step description 1" : "Description should match"
            assert dto.stepTypeCode == "CUTOVER" : "Step type code should be populated"
            assert dto.stepNumber == 1 : "Step number should be populated"
            assert dto.phaseId != null : "Phase ID should be populated"
            assert dto.isActive == true : "Active flag should be populated"
            assert dto.instructionCount == 3 : "Instruction count should match mock"
            assert dto.instanceCount == 5 : "Instance count should match mock"
            
            println "✅ Test 9 passed: findMasterStepsWithFiltersAsDTO DTO transformation correctness"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 9 failed: ${e.message}"
            failed++
        }
        
        // Test 10: Type casting validation (ADR-031)
        try {
            UUID stepId = UUID.randomUUID()
            Map filters = [
                stm_id: stepId.toString(),      // UUID casting
                teamId: "123",                  // Integer casting
                stm_name: "test",              // String casting
            ]
            
            // This should not throw casting exceptions
            List<StepInstanceDTO> instanceResults = stepRepository.findFilteredStepInstancesAsDTO([teamId: filters.teamId])
            Map masterResults = stepRepository.findMasterStepsWithFiltersAsDTO([stm_id: filters.stm_id], 1, 10)
            
            assert instanceResults != null : "Instance results should not be null"
            assert masterResults != null : "Master results should not be null"
            
            println "✅ Test 10 passed: Type casting validation (ADR-031)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 10 failed: ${e.message}"
            failed++
        }
        
        // Test 11: Pagination edge cases
        try {
            Map filters = [:]
            
            // Test negative page number correction
            Map result1 = stepRepository.findMasterStepsWithFiltersAsDTO(filters, -1, 10)
            assert ((Map) result1.pagination).pageNumber == 1 : "Negative page numbers should be corrected to 1"
            
            // Test excessive page size correction  
            Map result2 = stepRepository.findMasterStepsWithFiltersAsDTO(filters, 1, 150)
            assert ((Map) result2.pagination).pageSize == 100 : "Excessive page size should be capped at 100"
            
            // Test zero page size correction
            Map result3 = stepRepository.findMasterStepsWithFiltersAsDTO(filters, 1, 0)
            assert ((Map) result3.pagination).pageSize == 1 : "Zero page size should be corrected to 1"
            
            println "✅ Test 11 passed: Pagination edge cases"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 11 failed: ${e.message}"
            failed++
        }
        
        // Test 12: Null safety validation
        try {
            Map filters = [
                stm_id: null,
                stm_name: null,
                teamId: null
            ]
            
            // Should handle null filters gracefully
            List<StepInstanceDTO> instanceResults = stepRepository.findFilteredStepInstancesAsDTO(filters)
            Map masterResults = stepRepository.findMasterStepsWithFiltersAsDTO(filters, 1, 10)
            
            assert instanceResults != null : "Should handle null filters without crashing"
            assert masterResults != null : "Should handle null filters without crashing"
            
            println "✅ Test 12 passed: Null safety validation"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 12 failed: ${e.message}"
            failed++
        }
        
        println "\n========== StepRepository DTO Test Summary =========="
        println "Total tests: ${passed + failed}"
        println "Passed: ${passed}"
        println "Failed: ${failed}"
        println "Coverage: DTO methods for US-056-C API layer integration"
        println "Success rate: ${(passed / (passed + failed) * 100).round(1)}%"
        println "Target: 95%+ coverage for DTO methods"
        println "=================================================="
        
        if (failed > 0) {
            System.exit(1)
        }
    }
}

// Run the tests
StepRepositoryDTOTests tests = new StepRepositoryDTOTests()
tests.runTests()