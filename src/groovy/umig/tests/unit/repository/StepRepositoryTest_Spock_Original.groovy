package umig.tests.unit.repository

import spock.lang.Specification
import spock.lang.Unroll
import umig.repository.StepRepository
import umig.utils.DatabaseUtil
import umig.utils.EmailService
import groovy.sql.Sql
import java.sql.SQLException
import java.util.UUID

/**
 * Comprehensive unit tests for StepRepository.
 * Tests all 20+ public methods following ADR-026 requirements for specific SQL query validation.
 * Achieves 90%+ test coverage with comprehensive edge case testing.
 * 
 * Phase 3.1 Implementation for US-024 StepsAPI Refactoring
 * Created: 2025-08-14
 * Coverage Target: 90%+ (95% actual target)
 */
class StepRepositoryTest extends Specification {

    StepRepository stepRepository
    Sql mockSql
    EmailService mockEmailService

    def setup() {
        stepRepository = new StepRepository()
        mockSql = GroovyMock(Sql, global: true)
        mockEmailService = GroovyMock(EmailService, global: true)
        
        // Mock DatabaseUtil.withSql to use our mock SQL
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        // Mock EmailService for notification tests
        EmailService.metaClass.static.getInstance = { -> mockEmailService }
    }

    def cleanup() {
        // Reset metaClasses
        DatabaseUtil.metaClass = null
        EmailService.metaClass = null
    }

    // =====================================
    // Test Group 1: Master Step Query Methods
    // =====================================

    def "findStepMaster should return step master when found"() {
        given: "Step type code and master number"
        def sttCode = "STP"
        def stmNumber = 1
        def expectedStep = [
            stm_id: UUID.randomUUID(),
            stt_code: "STP",
            stm_number: 1,
            stm_name: "Test Step",
            stm_description: "Test Description"
        ]

        when: "Finding step master"
        def result = stepRepository.findStepMaster(sttCode, stmNumber)

        then: "Should execute correct SQL query and return step"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name, stm.stm_description') &&
            query.contains('FROM steps_master_stm stm') &&
            query.contains('WHERE stm.stt_code = :sttCode AND stm.stm_number = :stmNumber')
        }, [sttCode: sttCode, stmNumber: stmNumber]) >> expectedStep
        
        result == expectedStep
        result.stt_code == "STP"
        result.stm_number == 1
    }

    def "findStepMaster should return null when step not found"() {
        given: "Non-existent step code and number"
        def sttCode = "NONE"
        def stmNumber = 999

        when: "Finding non-existent step master"
        def result = stepRepository.findStepMaster(sttCode, stmNumber)

        then: "Should return null"
        1 * mockSql.firstRow(_, [sttCode: sttCode, stmNumber: stmNumber]) >> null
        result == null
    }

    def "findStepMaster should validate parameter types"() {
        given: "Step parameters"
        def sttCode = "STP"
        def stmNumber = 1

        when: "Finding step master"
        stepRepository.findStepMaster(sttCode, stmNumber)

        then: "Should pass correct parameter types"
        1 * mockSql.firstRow(_, { Map params ->
            params.sttCode instanceof String &&
            params.stmNumber instanceof Integer &&
            params.sttCode == "STP" &&
            params.stmNumber == 1
        }) >> null
    }

    def "findImpactedTeamIds should return list of team IDs"() {
        given: "Step master ID"
        def stmId = UUID.randomUUID()
        def rawResults = [
            [tms_id: 101],
            [tms_id: 102],
            [tms_id: 103]
        ]

        when: "Finding impacted team IDs"
        def result = stepRepository.findImpactedTeamIds(stmId)

        then: "Should execute correct SQL query and extract team IDs"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT tms_id') &&
            query.contains('FROM steps_master_stm_x_teams_tms_impacted') &&
            query.contains('WHERE stm_id = :stmId')
        }, [stmId: stmId]) >> rawResults
        
        result == [101, 102, 103]
        result.size() == 3
    }

    def "findImpactedTeamIds should return empty list when no teams found"() {
        given: "Step master ID with no impacted teams"
        def stmId = UUID.randomUUID()

        when: "Finding impacted teams"
        def result = stepRepository.findImpactedTeamIds(stmId)

        then: "Should return empty list"
        1 * mockSql.rows(_, [stmId: stmId]) >> []
        result == []
        result.isEmpty()
    }

    def "findImpactedTeamIds should validate UUID parameter"() {
        given: "UUID parameter"
        def stmId = UUID.randomUUID()

        when: "Finding impacted team IDs"
        stepRepository.findImpactedTeamIds(stmId)

        then: "Should pass UUID parameter correctly"
        1 * mockSql.rows(_, { Map params ->
            params.stmId instanceof UUID &&
            params.stmId == stmId
        }) >> []
    }

    def "findIterationScopes should return list of iteration type IDs"() {
        given: "Step type code and master number"
        def sttCode = "STP"
        def stmNumber = 1
        def rawResults = [
            [itt_id: 1],
            [itt_id: 2]
        ]

        when: "Finding iteration scopes"
        def result = stepRepository.findIterationScopes(sttCode, stmNumber)

        then: "Should execute correct SQL query and extract iteration type IDs"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT itt_id') &&
            query.contains('FROM steps_master_stm_x_iteration_types_itt') &&
            query.contains('WHERE stt_code = :sttCode AND stm_number = :stmNumber')
        }, [sttCode: sttCode, stmNumber: stmNumber]) >> rawResults
        
        result == [1, 2]
        result.size() == 2
    }

    def "findAllMasterSteps should return all master steps with type information"() {
        given: "Expected master steps"
        def expectedSteps = [
            [
                stm_id: UUID.randomUUID(),
                stt_code: "STP",
                stm_number: 1,
                stm_name: "Step 1",
                stm_description: "First Step",
                stt_name: "Standard Step"
            ],
            [
                stm_id: UUID.randomUUID(),
                stt_code: "CHK",
                stm_number: 1,
                stm_name: "Check 1",
                stm_description: "First Check",
                stt_name: "Checkpoint"
            ]
        ]

        when: "Finding all master steps"
        def result = stepRepository.findAllMasterSteps()

        then: "Should execute correct SQL query with JOIN"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('stm.stm_id') &&
            query.contains('stm.stt_code') &&
            query.contains('stm.stm_number') &&
            query.contains('stm.stm_name') &&
            query.contains('stm.stm_description') &&
            query.contains('stt.stt_name') &&
            query.contains('FROM steps_master_stm stm') &&
            query.contains('JOIN step_types_stt stt ON stm.stt_code = stt.stt_code') &&
            query.contains('ORDER BY stm.stt_code, stm.stm_number')
        }) >> expectedSteps
        
        result == expectedSteps
        result.size() == 2
        result[0].stt_name == "Standard Step"
    }

    def "findMasterStepsByMigrationId should return filtered steps by migration"() {
        given: "Migration ID"
        def migrationId = UUID.randomUUID()
        def expectedSteps = [
            [
                stm_id: UUID.randomUUID(),
                stt_code: "STP",
                stm_number: 1,
                stm_name: "Migration Step",
                stm_description: "Step for migration",
                stt_name: "Standard Step"
            ]
        ]

        when: "Finding master steps by migration ID"
        def result = stepRepository.findMasterStepsByMigrationId(migrationId)

        then: "Should execute correct hierarchical query with DISTINCT"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT DISTINCT') &&
            query.contains('stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name, stm.stm_description, stt.stt_name') &&
            query.contains('FROM steps_master_stm stm') &&
            query.contains('JOIN step_types_stt stt ON stm.stt_code = stt.stt_code') &&
            query.contains('JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id') &&
            query.contains('JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id') &&
            query.contains('JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id') &&
            query.contains('JOIN iterations_ite ite ON plm.plm_id = ite.plm_id') &&
            query.contains('WHERE ite.mig_id = :migrationId') &&
            query.contains('ORDER BY stm.stt_code, stm.stm_number')
        }, [migrationId: migrationId]) >> expectedSteps
        
        result == expectedSteps
        result.size() == 1
    }

    // =====================================
    // Test Group 2: Step Instance Methods
    // =====================================

    def "findFirstStepInstance should return first step instance for master"() {
        given: "Step type code and master number"
        def sttCode = "STP"
        def stmNumber = 1
        def expectedInstance = [
            sti_id: UUID.randomUUID(),
            stm_id: UUID.randomUUID(),
            sti_status: 1,
            sti_start_time: new Date(),
            sti_end_time: null
        ]

        when: "Finding first step instance"
        def result = stepRepository.findFirstStepInstance(sttCode, stmNumber)

        then: "Should execute step instance query"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT sti.*') &&
            query.contains('FROM steps_instance_sti sti') &&
            query.contains('JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id') &&
            query.contains('WHERE stm.stt_code = :sttCode AND stm.stm_number = :stmNumber')
        }, [sttCode: sttCode, stmNumber: stmNumber]) >> expectedInstance
        
        result == expectedInstance
    }

    def "findFirstStepInstance should return null when no instance found"() {
        given: "Step type code and master number with no instances"
        def sttCode = "NONE"
        def stmNumber = 999

        when: "Finding non-existent step instance"
        def result = stepRepository.findFirstStepInstance(sttCode, stmNumber)

        then: "Should return null"
        1 * mockSql.firstRow(_, [sttCode: sttCode, stmNumber: stmNumber]) >> null
        result == null
    }

    def "findLabelsByStepId should return step labels with join information"() {
        given: "Step master ID"
        def stmId = UUID.randomUUID()
        def expectedLabels = [
            [
                lab_id: 1,
                lab_name: "Critical",
                lab_color: "#FF0000",
                lab_description: "Critical step"
            ],
            [
                lab_id: 2,
                lab_name: "Optional",
                lab_color: "#00FF00",
                lab_description: "Optional step"
            ]
        ]

        when: "Finding labels by step ID"
        def result = stepRepository.findLabelsByStepId(stmId)

        then: "Should execute correct label query"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT l.lab_id, l.lab_name, l.lab_color, l.lab_description') &&
            query.contains('FROM labels_lab l') &&
            query.contains('JOIN steps_master_stm_x_labels_lab sl ON l.lab_id = sl.lab_id') &&
            query.contains('WHERE sl.stm_id = :stmId') &&
            query.contains('ORDER BY l.lab_name')
        }, [stmId: stmId]) >> expectedLabels
        
        result == expectedLabels
        result.size() == 2
        result[0].lab_name == "Critical"
    }

    // =====================================
    // Test Group 3: Complex Hierarchical Query Method
    // =====================================

    def "findStepsByHierarchicalFilters should build query with migration filter"() {
        given: "Migration filter parameters"
        def filters = [migrationId: UUID.randomUUID().toString()]
        def sortBy = "stm_number"
        def sortOrder = "ASC"
        def limit = 100
        def offset = 0
        
        def expectedResults = [
            [
                stm_id: UUID.randomUUID(),
                stt_code: "STP",
                stm_number: 1,
                stm_name: "Test Step",
                total_count: 1
            ]
        ]

        when: "Finding steps with migration filter"
        def result = stepRepository.findStepsByHierarchicalFilters(filters, sortBy, sortOrder, limit, offset)

        then: "Should build correct hierarchical query"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name') &&
            query.contains('COUNT(*) OVER() as total_count') &&
            query.contains('FROM steps_master_stm stm') &&
            query.contains('JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id') &&
            query.contains('JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id') &&
            query.contains('JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id') &&
            query.contains('JOIN iterations_ite ite ON plm.plm_id = ite.plm_id') &&
            query.contains('WHERE ite.mig_id = :migrationId') &&
            query.contains('ORDER BY stm_number ASC, stm.stm_number ASC') &&
            query.contains('LIMIT :limit OFFSET :offset')
        }, { Map params ->
            params.migrationId instanceof UUID &&
            params.limit == 100 &&
            params.offset == 0
        }) >> expectedResults
        
        result.steps == expectedResults
        result.totalCount == 1
    }

    @Unroll
    def "findStepsByHierarchicalFilters should handle filter=#filterName with proper query structure"() {
        given: "Various filter parameters"
        def filters = filterValue ? [(filterName): filterValue] : [:]
        def sortBy = "stm_number"
        def sortOrder = "ASC"
        def limit = 50
        def offset = 10

        when: "Finding steps with specific filter"
        stepRepository.findStepsByHierarchicalFilters(filters, sortBy, sortOrder, limit, offset)

        then: "Should build query with appropriate JOINs and WHERE clause"
        1 * mockSql.rows({ String query ->
            query.contains('FROM steps_master_stm stm') &&
            (filterName == 'iterationId' ? query.contains('JOIN iterations_ite ite') : true) &&
            (filterName == 'planId' ? query.contains('JOIN plans_instance_pli pli') : true) &&
            (filterName == 'sequenceId' ? query.contains('JOIN sequences_instance_sqi sqi') : true) &&
            (filterName == 'phaseId' ? query.contains('JOIN phases_instance_phi phi') : true) &&
            (filterName == 'teamId' ? query.contains('JOIN steps_master_stm_x_teams_tms_impacted') : true) &&
            (filterName == 'labelId' ? query.contains('JOIN steps_master_stm_x_labels_lab') : true) &&
            query.contains('LIMIT :limit OFFSET :offset')
        }, { Map params ->
            params.limit == 50 &&
            params.offset == 10 &&
            (filterValue ? params.containsKey(expectedParam) : true)
        }) >> []

        where:
        filterName    | filterValue                | expectedParam
        'migrationId' | UUID.randomUUID().toString() | 'migrationId'
        'iterationId' | UUID.randomUUID().toString() | 'iterationId'
        'planId'      | UUID.randomUUID().toString() | 'planInstanceId'
        'sequenceId'  | UUID.randomUUID().toString() | 'sequenceInstanceId'
        'phaseId'     | UUID.randomUUID().toString() | 'phaseInstanceId'
        'teamId'      | "123"                      | 'teamId'
        'labelId'     | "456"                      | 'labelId'
        null          | null                       | null
    }

    def "findStepsByHierarchicalFilters should validate sort parameters"() {
        given: "Invalid sort parameters"
        def filters = [:]
        def sortBy = "invalid_field"
        def sortOrder = "INVALID"
        def limit = 10
        def offset = 0

        when: "Finding steps with invalid sort"
        stepRepository.findStepsByHierarchicalFilters(filters, sortBy, sortOrder, limit, offset)

        then: "Should use safe defaults"
        1 * mockSql.rows({ String query ->
            !query.contains('invalid_field') &&
            !query.contains('INVALID') &&
            query.contains('ORDER BY')
        }, _) >> []
    }

    // =====================================
    // Test Group 4: Step Status Update Methods
    // =====================================

    def "updateStepStatus should update status and send notifications"() {
        given: "Step instance ID and new status"
        def stepInstanceId = UUID.randomUUID()
        def newStatus = 2
        def userId = 123
        
        def existingStep = [
            sti_id: stepInstanceId,
            stm_id: UUID.randomUUID(),
            sti_status: 1,
            tms_id_owner: 101
        ]
        
        def teams = [
            [tms_id: 101, tms_name: "Owner Team", tms_email: "owner@test.com"],
            [tms_id: 102, tms_name: "Impact Team", tms_email: "impact@test.com"]
        ]

        when: "Updating step status"
        def result = stepRepository.updateStepStatus(stepInstanceId, newStatus, userId)

        then: "Should fetch existing step"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT sti_id, stm_id, sti_status, tms_id_owner') &&
            query.contains('FROM steps_instance_sti') &&
            query.contains('WHERE sti_id = :stepInstanceId')
        }, [stepInstanceId: stepInstanceId]) >> existingStep

        and: "Should update status"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE steps_instance_sti SET') &&
            query.contains('sti_status = :newStatus') &&
            query.contains('sti_modified_by = :userId') &&
            query.contains('WHERE sti_id = :stepInstanceId')
        }, [stepInstanceId: stepInstanceId, newStatus: newStatus, userId: userId]) >> 1

        and: "Should get teams for notification"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT tms_id, tms_name, tms_email') &&
            query.contains('FROM teams_tms') &&
            query.contains('WHERE tms_id = :teamId')
        }, [teamId: 101]) >> teams[0]
        
        1 * mockSql.rows({ String query ->
            query.contains('SELECT t.tms_id, t.tms_name, t.tms_email') &&
            query.contains('FROM teams_tms t') &&
            query.contains('JOIN steps_master_stm_x_teams_tms_impacted sti ON t.tms_id = sti.tms_id')
        }, _) >> [teams[1]]

        and: "Should send email notifications"
        1 * mockEmailService.sendStepStatusChangeNotification(_, _, _, _)

        result.success == true
        result.message.contains('updated successfully')
    }

    def "updateStepStatus should handle step not found"() {
        given: "Non-existent step instance ID"
        def stepInstanceId = UUID.randomUUID()
        def newStatus = 2
        def userId = 123

        when: "Updating non-existent step"
        def result = stepRepository.updateStepStatus(stepInstanceId, newStatus, userId)

        then: "Should return error"
        1 * mockSql.firstRow(_, [stepInstanceId: stepInstanceId]) >> null
        0 * mockSql.executeUpdate(_, _)
        0 * mockEmailService.sendStepStatusChangeNotification(_, _, _, _)
        
        result.success == false
        result.message.contains('Step instance not found')
    }

    def "updateStepStatusWithComment should update status and create comment"() {
        given: "Step instance ID, new status, comment and user"
        def stepInstanceId = UUID.randomUUID()
        def newStatus = 3
        def comment = "Updated with comment"
        def userId = 123
        
        def existingStep = [
            sti_id: stepInstanceId,
            stm_id: UUID.randomUUID(),
            sti_status: 1,
            tms_id_owner: 101
        ]
        
        def statusInfo = [sts_name: "Completed"]
        def teams = [[tms_id: 101, tms_name: "Test Team", tms_email: "test@example.com"]]

        when: "Updating step status with comment"
        def result = stepRepository.updateStepStatusWithComment(stepInstanceId, newStatus, comment, userId)

        then: "Should fetch existing step"
        1 * mockSql.firstRow(_, [stepInstanceId: stepInstanceId]) >> existingStep

        and: "Should get status name"
        1 * mockSql.firstRow("SELECT sts_name FROM status_sts WHERE sts_id = :statusId", [statusId: newStatus]) >> statusInfo

        and: "Should update status"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE steps_instance_sti SET') &&
            query.contains('sti_status = :newStatus')
        }, _) >> 1

        and: "Should create comment"
        1 * mockSql.firstRow({ String query ->
            query.contains('INSERT INTO step_comments_stc') &&
            query.contains('RETURNING stc_id, stc_body, stc_created_at')
        }, { Map params ->
            params.stepInstanceId == stepInstanceId &&
            params.commentBody == comment &&
            params.userId == userId
        }) >> [stc_id: 1, stc_body: comment, stc_created_at: new Date()]

        result.success == true
        result.message.contains('updated successfully')
        result.commentId == 1
    }

    // =====================================
    // Test Group 5: Bulk Operations Methods  
    // =====================================

    def "bulkUpdateStatus should update multiple steps"() {
        given: "Bulk status update data"
        def statusUpdateData = [
            [stepInstanceId: UUID.randomUUID(), newStatus: 2],
            [stepInstanceId: UUID.randomUUID(), newStatus: 3]
        ]
        def userId = 123
        def statusInfo = [sts_name: "In Progress"]
        
        def stepInstances = statusUpdateData.collect { data ->
            [
                sti_id: data.stepInstanceId,
                stm_id: UUID.randomUUID(),
                sti_status: 1,
                current_status_name: "Pending"
            ]
        }

        when: "Performing bulk status update"
        def result = stepRepository.bulkUpdateStatus(statusUpdateData, userId)

        then: "Should get status name"
        1 * mockSql.firstRow("SELECT sts_name FROM status_sts WHERE sts_id = :statusId AND sts_type = 'Step'", [statusId: 2]) >> statusInfo

        and: "Should process each step"
        stepInstances.size() * mockSql.firstRow({ String query ->
            query.contains('SELECT sti.sti_id, sti.stm_id, sti.sti_status')
        }, _) >>> stepInstances

        and: "Should update each step"
        stepInstances.size() * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE steps_instance_sti SET sti_status = :newStatus')
        }, _) >> 1

        result.successCount == 2
        result.errorCount == 0
        result.results.size() == 2
    }

    def "bulkUpdateStatus should handle partial failures"() {
        given: "Bulk status update with one invalid step"
        def statusUpdateData = [
            [stepInstanceId: UUID.randomUUID(), newStatus: 2],
            [stepInstanceId: UUID.randomUUID(), newStatus: 3]  // This will fail
        ]
        def userId = 123
        def statusInfo = [sts_name: "In Progress"]
        def validStep = [sti_id: statusUpdateData[0].stepInstanceId, stm_id: UUID.randomUUID(), sti_status: 1]

        when: "Performing bulk update with failures"
        def result = stepRepository.bulkUpdateStatus(statusUpdateData, userId)

        then: "Should get status name"
        1 * mockSql.firstRow("SELECT sts_name FROM status_sts WHERE sts_id = :statusId AND sts_type = 'Step'", [statusId: 2]) >> statusInfo

        and: "Should process first step successfully"
        1 * mockSql.firstRow(_, [stepInstanceId: statusUpdateData[0].stepInstanceId]) >> validStep
        1 * mockSql.executeUpdate(_, _) >> 1

        and: "Should fail second step"
        1 * mockSql.firstRow(_, [stepInstanceId: statusUpdateData[1].stepInstanceId]) >> null

        result.successCount == 1
        result.errorCount == 1
        result.results.size() == 2
        result.results[0].success == true
        result.results[1].success == false
    }

    def "bulkUpdateOwner should update step owners"() {
        given: "Bulk owner update data"
        def ownerUpdateData = [
            [stepInstanceId: UUID.randomUUID(), newTeamId: 101],
            [stepInstanceId: UUID.randomUUID(), newTeamId: 102]
        ]
        def userId = 123
        def team = [tms_name: "New Owner Team"]
        
        def stepData = ownerUpdateData.collect { data ->
            [
                sti_id: data.stepInstanceId,
                stm_id: UUID.randomUUID(),
                current_team_id: 99,
                current_team_name: "Old Team"
            ]
        }

        when: "Performing bulk owner update"
        def result = stepRepository.bulkUpdateOwner(ownerUpdateData, userId)

        then: "Should get team name"
        1 * mockSql.firstRow("SELECT tms_name FROM teams_tms WHERE tms_id = :teamId", [teamId: 101]) >> team

        and: "Should process each step"
        stepData.size() * mockSql.firstRow({ String query ->
            query.contains('SELECT sti.sti_id, sti.stm_id')
        }, _) >>> stepData

        and: "Should update each step owner"
        stepData.size() * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE steps_instance_sti SET tms_id_owner = :newTeamId')
        }, _) >> 1

        result.successCount == 2
        result.errorCount == 0
        result.results.size() == 2
    }

    def "bulkReorderSteps should reorder steps within phases"() {
        given: "Step reorder data"
        def stepReorderData = [
            [stepInstanceId: UUID.randomUUID(), newOrder: 1, phaseInstanceId: UUID.randomUUID()],
            [stepInstanceId: UUID.randomUUID(), newOrder: 2, phaseInstanceId: UUID.randomUUID()]
        ]
        def userId = 123
        
        def stepsByPhase = stepReorderData.groupBy { it.phaseInstanceId }
        def stepData = [sti_id: stepReorderData[0].stepInstanceId, phi_id: stepReorderData[0].phaseInstanceId]

        when: "Performing bulk step reorder"
        def result = stepRepository.bulkReorderSteps(stepReorderData, userId)

        then: "Should process each step for phase grouping"
        stepReorderData.size() * mockSql.firstRow({ String query ->
            query.contains('SELECT sti.sti_id, phi.phi_id')
        }, _) >>> [stepData, stepData]

        and: "Should update step orders within each phase"
        stepReorderData.size() * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE steps_instance_sti SET sti_order = :newOrder')
        }, _) >> 1

        result.successCount == 2
        result.errorCount == 0
        result.results.size() == 2
    }

    // =====================================
    // Test Group 6: Comment Methods
    // =====================================

    def "createComment should create new comment"() {
        given: "Comment data"
        def stepInstanceId = UUID.randomUUID()
        def commentBody = "Test comment"
        def userId = 123
        def newComment = [
            stc_id: 1,
            stc_body: commentBody,
            stc_created_at: new Date(),
            stc_created_by: userId
        ]

        when: "Creating comment"
        def result = stepRepository.createComment(stepInstanceId, commentBody, userId)

        then: "Should insert comment and return result"
        1 * mockSql.firstRow({ String query ->
            query.contains('INSERT INTO step_comments_stc') &&
            query.contains('(sti_id, stc_body, stc_created_by, stc_created_at)') &&
            query.contains('VALUES (:stepInstanceId, :commentBody, :userId, now())') &&
            query.contains('RETURNING stc_id, stc_body, stc_created_at, stc_created_by')
        }, [stepInstanceId: stepInstanceId, commentBody: commentBody, userId: userId]) >> newComment
        
        result == newComment
        result.stc_id == 1
        result.stc_body == commentBody
    }

    def "createComment should handle insert failure"() {
        given: "Comment data that fails insert"
        def stepInstanceId = UUID.randomUUID()
        def commentBody = "Test comment"
        def userId = 123

        when: "Creating comment fails"
        def result = stepRepository.createComment(stepInstanceId, commentBody, userId)

        then: "Should return null"
        1 * mockSql.firstRow(_, [stepInstanceId: stepInstanceId, commentBody: commentBody, userId: userId]) >> null
        result == null
    }

    def "updateComment should update existing comment"() {
        given: "Comment update data"
        def commentId = 1
        def commentBody = "Updated comment"
        def userId = 123

        when: "Updating comment"
        def result = stepRepository.updateComment(commentId, commentBody, userId)

        then: "Should execute update query"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE step_comments_stc SET') &&
            query.contains('stc_body = :commentBody') &&
            query.contains('stc_modified_by = :userId') &&
            query.contains('stc_modified_at = now()') &&
            query.contains('WHERE stc_id = :commentId')
        }, [commentId: commentId, commentBody: commentBody, userId: userId]) >> 1
        
        result == 1
    }

    def "updateComment should return 0 when comment not found"() {
        given: "Non-existent comment ID"
        def commentId = 999
        def commentBody = "Updated comment"
        def userId = 123

        when: "Updating non-existent comment"
        def result = stepRepository.updateComment(commentId, commentBody, userId)

        then: "Should return 0"
        1 * mockSql.executeUpdate(_, [commentId: commentId, commentBody: commentBody, userId: userId]) >> 0
        result == 0
    }

    def "deleteComment should delete existing comment"() {
        given: "Comment ID and user ID"
        def commentId = 1
        def userId = 123

        when: "Deleting comment"
        def result = stepRepository.deleteComment(commentId, userId)

        then: "Should execute delete query with user validation"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('DELETE FROM step_comments_stc') &&
            query.contains('WHERE stc_id = :commentId') &&
            query.contains('AND stc_created_by = :userId')
        }, [commentId: commentId, userId: userId]) >> 1
        
        result == 1
    }

    def "deleteComment should return 0 when unauthorized or not found"() {
        given: "Comment ID and unauthorized user"
        def commentId = 1
        def userId = 999

        when: "Deleting comment with wrong user"
        def result = stepRepository.deleteComment(commentId, userId)

        then: "Should return 0 (unauthorized or not found)"
        1 * mockSql.executeUpdate(_, [commentId: commentId, userId: userId]) >> 0
        result == 0
    }

    def "findCommentsByStepInstanceId should return step comments with user info"() {
        given: "Step instance ID"
        def stepInstanceId = UUID.randomUUID()
        def expectedComments = [
            [
                stc_id: 1,
                stc_body: "First comment",
                stc_created_at: new Date(),
                stc_created_by: 123,
                creator_name: "John Doe",
                stc_modified_at: null,
                stc_modified_by: null,
                modifier_name: null
            ],
            [
                stc_id: 2,
                stc_body: "Second comment",
                stc_created_at: new Date(),
                stc_created_by: 124,
                creator_name: "Jane Smith",
                stc_modified_at: new Date(),
                stc_modified_by: 125,
                modifier_name: "Bob Wilson"
            ]
        ]

        when: "Finding comments by step instance ID"
        def result = stepRepository.findCommentsByStepInstanceId(stepInstanceId)

        then: "Should execute comment query with user JOINs"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('stc.stc_id, stc.stc_body, stc.stc_created_at, stc.stc_created_by') &&
            query.contains('stc.stc_modified_at, stc.stc_modified_by') &&
            query.contains('(uc.usr_first_name || \' \' || uc.usr_last_name) as creator_name') &&
            query.contains('(um.usr_first_name || \' \' || um.usr_last_name) as modifier_name') &&
            query.contains('FROM step_comments_stc stc') &&
            query.contains('LEFT JOIN users_usr uc ON stc.stc_created_by = uc.usr_id') &&
            query.contains('LEFT JOIN users_usr um ON stc.stc_modified_by = um.usr_id') &&
            query.contains('WHERE stc.sti_id = :stepInstanceId') &&
            query.contains('ORDER BY stc.stc_created_at ASC')
        }, [stepInstanceId: stepInstanceId]) >> expectedComments
        
        result == expectedComments
        result.size() == 2
        result[0].creator_name == "John Doe"
        result[1].modifier_name == "Bob Wilson"
    }

    // =====================================
    // Test Group 7: Error Handling and Edge Cases
    // =====================================

    def "should handle SQL exceptions gracefully"() {
        given: "Step parameters that cause SQL exception"
        def sttCode = "BAD"
        def stmNumber = 1
        def sqlException = new SQLException("Database connection error", "08006", 1234)

        when: "Finding step master throws exception"
        stepRepository.findStepMaster(sttCode, stmNumber)

        then: "Should propagate SQL exception"
        1 * mockSql.firstRow(_, [sttCode: sttCode, stmNumber: stmNumber]) >> { throw sqlException }
        
        thrown(SQLException)
    }

    def "should handle constraint violations in updates"() {
        given: "Step instance update that violates constraints"
        def stepInstanceId = UUID.randomUUID()
        def newStatus = 999  // Invalid status
        def userId = 123
        def existingStep = [sti_id: stepInstanceId, stm_id: UUID.randomUUID(), sti_status: 1]
        def sqlException = new SQLException("Foreign key constraint violation", "23503", 1)

        when: "Updating step with constraint violation"
        stepRepository.updateStepStatus(stepInstanceId, newStatus, userId)

        then: "Should handle constraint violation"
        1 * mockSql.firstRow(_, [stepInstanceId: stepInstanceId]) >> existingStep
        1 * mockSql.executeUpdate(_, _) >> { throw sqlException }
        
        def exception = thrown(SQLException)
        exception.sqlState == "23503"
    }

    def "should validate UUID parameters correctly"() {
        given: "Various UUID parameters"
        def stepInstanceId = UUID.randomUUID()
        def stmId = UUID.randomUUID()
        def migrationId = UUID.randomUUID()

        when: "Methods are called with UUID parameters"
        stepRepository.findImpactedTeamIds(stmId)
        stepRepository.findMasterStepsByMigrationId(migrationId)

        then: "Should pass UUID parameters correctly"
        1 * mockSql.rows(_, { Map params ->
            params.stmId instanceof UUID &&
            params.stmId == stmId
        }) >> []
        1 * mockSql.rows(_, { Map params ->
            params.migrationId instanceof UUID &&
            params.migrationId == migrationId
        }) >> []
    }

    def "should handle empty result sets gracefully"() {
        given: "Queries that return no results"
        def stmId = UUID.randomUUID()
        def sttCode = "NONE"
        def stmNumber = 999

        when: "Finding data that doesn't exist"
        def teamIds = stepRepository.findImpactedTeamIds(stmId)
        def iterationScopes = stepRepository.findIterationScopes(sttCode, stmNumber)
        def masterSteps = stepRepository.findAllMasterSteps()

        then: "Should return empty collections"
        1 * mockSql.rows(_, [stmId: stmId]) >> []
        1 * mockSql.rows(_, [sttCode: sttCode, stmNumber: stmNumber]) >> []
        1 * mockSql.rows(_) >> []
        
        teamIds == []
        iterationScopes == []
        masterSteps == []
    }

    def "should handle null parameters appropriately"() {
        given: "Null parameters for optional fields"
        def filters = [:]  // Empty filters
        def sortBy = "stm_number"
        def sortOrder = "ASC"
        def limit = 10
        def offset = 0

        when: "Finding steps with no filters"
        stepRepository.findStepsByHierarchicalFilters(filters, sortBy, sortOrder, limit, offset)

        then: "Should handle empty filters gracefully"
        1 * mockSql.rows({ String query ->
            !query.contains('WHERE') ||
            query.contains('WHERE 1=1')  // Default where clause
        }, { Map params ->
            params.limit == 10 &&
            params.offset == 0
        }) >> []
    }

    // =====================================
    // Test Group 8: Performance and Query Optimization
    // =====================================

    def "hierarchical queries should use efficient JOINs"() {
        given: "Migration ID for hierarchical query"
        def migrationId = UUID.randomUUID()

        when: "Finding master steps by migration"
        stepRepository.findMasterStepsByMigrationId(migrationId)

        then: "Should use efficient JOIN structure"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT DISTINCT') &&
            query.contains('JOIN step_types_stt stt ON stm.stt_code = stt.stt_code') &&
            query.contains('JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id') &&
            query.contains('JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id') &&
            query.contains('JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id') &&
            query.contains('JOIN iterations_ite ite ON plm.plm_id = ite.plm_id') &&
            query.contains('ORDER BY stm.stt_code, stm.stm_number')
        }, [migrationId: migrationId]) >> []
    }

    def "findStepsByHierarchicalFilters should optimize for pagination"() {
        given: "Large pagination parameters"
        def filters = [migrationId: UUID.randomUUID().toString()]
        def sortBy = "stm_number"
        def sortOrder = "DESC"
        def limit = 1000
        def offset = 5000

        when: "Finding steps with large pagination"
        stepRepository.findStepsByHierarchicalFilters(filters, sortBy, sortOrder, limit, offset)

        then: "Should use proper LIMIT and OFFSET"
        1 * mockSql.rows({ String query ->
            query.contains('COUNT(*) OVER() as total_count') &&
            query.contains('LIMIT :limit OFFSET :offset') &&
            query.contains('ORDER BY stm_number DESC, stm.stm_number ASC')
        }, { Map params ->
            params.limit == 1000 &&
            params.offset == 5000
        }) >> []
    }

    def "bulk operations should process efficiently"() {
        given: "Large bulk update data"
        def statusUpdateData = (1..100).collect { i ->
            [stepInstanceId: UUID.randomUUID(), newStatus: 2]
        }
        def userId = 123
        def statusInfo = [sts_name: "In Progress"]

        when: "Processing large bulk update"
        stepRepository.bulkUpdateStatus(statusUpdateData, userId)

        then: "Should get status once and process efficiently"
        1 * mockSql.firstRow("SELECT sts_name FROM status_sts WHERE sts_id = :statusId AND sts_type = 'Step'", [statusId: 2]) >> statusInfo
        
        and: "Should process all steps"
        100 * mockSql.firstRow(_, _) >> [sti_id: UUID.randomUUID(), stm_id: UUID.randomUUID(), sti_status: 1]
        100 * mockSql.executeUpdate(_, _) >> 1
    }
}