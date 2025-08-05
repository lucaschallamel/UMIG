#!/usr/bin/env groovy
/**
 * Unit Test for InstructionRepository
 * Tests all 19 repository methods with specific SQL query mocks following ADR-026
 * 
 * ADR-026 Compliance:
 * - Mandatory specific SQL query validation
 * - Exact table name, JOIN, and WHERE clause validation
 * - Type safety validation for all parameters
 * - Error handling and SQL state mapping verification
 * 
 * Prerequisites:
 * - Spock Framework for testing
 * - Mock DatabaseUtil for SQL operations
 * 
 * Run from project root: ./src/groovy/umig/tests/run-unit-tests.sh
 */

@Grab('org.spockframework:spock-core:2.3-groovy-3.0')
@Grab('org.postgresql:postgresql:42.7.3')

import spock.lang.Specification
import spock.lang.Unroll
import umig.repository.InstructionRepository
import java.util.UUID
import java.sql.SQLException

class InstructionRepositorySpec extends Specification {
    
    InstructionRepository repository
    def mockSql
    
    def setup() {
        repository = new InstructionRepository()
        mockSql = Mock()
    }
    
    // ==================== MASTER INSTRUCTION TESTS ====================
    
    def "findMasterInstructionsByStepId should return all master instructions for step with hierarchical data"() {
        given: "a step master ID and expected results"
        def stepId = UUID.randomUUID()
        def expectedResults = [
            [
                inm_id: UUID.randomUUID(),
                stm_id: stepId,
                tms_id: 123,
                ctm_id: UUID.randomUUID(),
                inm_order: 1,
                inm_body: 'Master Instruction 1',
                inm_duration_minutes: 30,
                tms_name: 'Infrastructure Team',
                ctm_name: 'Pre-Deploy Check',
                created_at: new Date(),
                updated_at: new Date()
            ],
            [
                inm_id: UUID.randomUUID(),
                stm_id: stepId,
                tms_id: 456,
                ctm_id: null,
                inm_order: 2,
                inm_body: 'Master Instruction 2',
                inm_duration_minutes: 15,
                tms_name: 'Database Team',
                ctm_name: null,
                created_at: new Date(),
                updated_at: new Date()
            ]
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findMasterInstructionsByStepId is called"
        def result = repository.findMasterInstructionsByStepId(stepId)
        
        then: "SQL query validates exact structure"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('inm.inm_id') &&
            query.contains('inm.stm_id') &&
            query.contains('inm.tms_id') &&
            query.contains('inm.ctm_id') &&
            query.contains('inm.inm_order') &&
            query.contains('inm.inm_body') &&
            query.contains('inm.inm_duration_minutes') &&
            query.contains('tms.tms_name') &&
            query.contains('ctm.ctm_name') &&
            query.contains('inm.created_at') &&
            query.contains('inm.updated_at') &&
            query.contains('FROM instructions_master_inm inm') &&
            query.contains('LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id') &&
            query.contains('LEFT JOIN controls_master_ctm ctm ON inm.ctm_id = ctm.ctm_id') &&
            query.contains('WHERE inm.stm_id = :stmId') &&
            query.contains('ORDER BY inm.inm_order ASC')
        }, [stmId: stepId]) >> expectedResults
        
        and: "returns expected data"
        result == expectedResults
    }
    
    def "findMasterInstructionsByStepId should throw IllegalArgumentException for null step ID"() {
        when: "findMasterInstructionsByStepId is called with null"
        repository.findMasterInstructionsByStepId(null)
        
        then: "throws IllegalArgumentException"
        thrown(IllegalArgumentException)
    }
    
    def "findMasterInstructionById should return specific master instruction with full details"() {
        given: "a master instruction ID and expected instruction"
        def instructionId = UUID.randomUUID()
        def expectedInstruction = [
            inm_id: instructionId,
            stm_id: UUID.randomUUID(),
            tms_id: 789,
            ctm_id: UUID.randomUUID(),
            inm_order: 3,
            inm_body: 'Test Master Instruction',
            inm_duration_minutes: 45,
            tms_name: 'Security Team',
            ctm_name: 'Security Validation',
            created_at: new Date(),
            updated_at: new Date()
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findMasterInstructionById is called"
        def result = repository.findMasterInstructionById(instructionId)
        
        then: "SQL firstRow query validates exact structure"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT') &&
            query.contains('inm.inm_id') &&
            query.contains('inm.stm_id') &&
            query.contains('inm.tms_id') &&
            query.contains('inm.ctm_id') &&
            query.contains('inm.inm_order') &&
            query.contains('inm.inm_body') &&
            query.contains('inm.inm_duration_minutes') &&
            query.contains('tms.tms_name') &&
            query.contains('ctm.ctm_name') &&
            query.contains('inm.created_at') &&
            query.contains('inm.updated_at') &&
            query.contains('FROM instructions_master_inm inm') &&
            query.contains('LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id') &&
            query.contains('LEFT JOIN controls_master_ctm ctm ON inm.ctm_id = ctm.ctm_id') &&
            query.contains('WHERE inm.inm_id = :inmId')
        }, [inmId: instructionId]) >> expectedInstruction
        
        and: "returns the instruction"
        result == expectedInstruction
    }
    
    def "createMasterInstruction should create new instruction with type safety validation"() {
        given: "instruction creation parameters"
        def stepId = UUID.randomUUID()
        def teamId = 123
        def controlId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            tmsId: teamId.toString(),
            ctmId: controlId.toString(),
            inmOrder: '2',
            inmBody: 'New Master Instruction',
            inmDurationMinutes: '30'
        ]
        def newInstructionId = UUID.randomUUID()
        def insertResult = [inm_id: newInstructionId]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "createMasterInstruction is called"
        def result = repository.createMasterInstruction(params)
        
        then: "inserts instruction with exact parameter validation and type casting"
        1 * mockSql.firstRow({ String query ->
            query.contains('INSERT INTO instructions_master_inm') &&
            query.contains('stm_id, tms_id, ctm_id, inm_order, inm_body, inm_duration_minutes') &&
            query.contains('created_by, created_at, updated_by, updated_at') &&
            query.contains('VALUES') &&
            query.contains(':stmId, :tmsId, :ctmId, :inmOrder, :inmBody, :inmDurationMinutes') &&
            query.contains("'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP") &&
            query.contains('RETURNING inm_id')
        }, { Map insertParams ->
            insertParams.stmId == stepId &&
            insertParams.tmsId == teamId &&
            insertParams.ctmId == controlId &&
            insertParams.inmOrder == 2 &&
            insertParams.inmBody == 'New Master Instruction' &&
            insertParams.inmDurationMinutes == 30
        }) >> insertResult
        
        and: "returns created instruction ID"
        result == newInstructionId
    }
    
    def "createMasterInstruction should handle null optional parameters"() {
        given: "instruction creation with minimal parameters"
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Minimal Instruction'
        ]
        def newInstructionId = UUID.randomUUID()
        def insertResult = [inm_id: newInstructionId]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "createMasterInstruction is called"
        def result = repository.createMasterInstruction(params)
        
        then: "inserts instruction with null values"
        1 * mockSql.firstRow(_, { Map insertParams ->
            insertParams.stmId == stepId &&
            insertParams.tmsId == null &&
            insertParams.ctmId == null &&
            insertParams.inmOrder == 1 &&
            insertParams.inmBody == 'Minimal Instruction' &&
            insertParams.inmDurationMinutes == null
        }) >> insertResult
        
        and: "returns created instruction ID"
        result == newInstructionId
    }
    
    def "createMasterInstruction should throw IllegalArgumentException for missing required parameters"() {
        given: "incomplete parameters"
        def params = [inmBody: 'Incomplete Instruction']
        
        when: "createMasterInstruction is called"
        repository.createMasterInstruction(params)
        
        then: "throws IllegalArgumentException"
        thrown(IllegalArgumentException)
    }
    
    def "createMasterInstruction should handle SQL foreign key constraint violations"() {
        given: "parameters with invalid references"
        def params = [
            stmId: UUID.randomUUID().toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction'
        ]
        def sqlException = new SQLException("Foreign key constraint", "23503")
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow(_, _) >> { throw sqlException }
        
        when: "createMasterInstruction is called"
        repository.createMasterInstruction(params)
        
        then: "throws IllegalArgumentException with foreign key message"
        def ex = thrown(IllegalArgumentException)
        ex.message.contains("Referenced step, team, or control does not exist")
    }
    
    def "createMasterInstruction should handle SQL unique constraint violations"() {
        given: "parameters that violate unique constraints"
        def params = [
            stmId: UUID.randomUUID().toString(),
            inmOrder: '1',
            inmBody: 'Duplicate Order Instruction'
        ]
        def sqlException = new SQLException("Unique constraint violation", "23505")
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow(_, _) >> { throw sqlException }
        
        when: "createMasterInstruction is called"
        repository.createMasterInstruction(params)
        
        then: "throws IllegalArgumentException with unique constraint message"
        def ex = thrown(IllegalArgumentException)
        ex.message.contains("Instruction order already exists for this step")
    }
    
    def "updateMasterInstruction should build dynamic update query with type safety"() {
        given: "instruction ID and update parameters"
        def instructionId = UUID.randomUUID()
        def params = [
            tmsId: '456',
            ctmId: UUID.randomUUID().toString(),
            inmOrder: '3',
            inmBody: 'Updated Instruction Body',
            inmDurationMinutes: '45'
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateMasterInstruction is called"
        def result = repository.updateMasterInstruction(instructionId, params)
        
        then: "executes dynamic update with exact field validation"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE instructions_master_inm') &&
            query.contains('SET') &&
            query.contains('tms_id = :tmsId') &&
            query.contains('ctm_id = :ctmId') &&
            query.contains('inm_order = :inmOrder') &&
            query.contains('inm_body = :inmBody') &&
            query.contains('inm_duration_minutes = :inmDurationMinutes') &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains("updated_by = 'system'") &&
            query.contains('WHERE inm_id = :inmId')
        }, { Map updateParams ->
            updateParams.inmId == instructionId &&
            updateParams.tmsId == 456 &&  // Type conversion to Integer
            updateParams.ctmId instanceof UUID &&
            updateParams.inmOrder == 3 &&  // Type conversion to Integer
            updateParams.inmBody == 'Updated Instruction Body' &&
            updateParams.inmDurationMinutes == 45  // Type conversion to Integer
        }) >> 1
        
        and: "returns affected rows count"
        result == 1
    }
    
    def "updateMasterInstruction should return 0 when no updates provided"() {
        given: "instruction ID with empty updates"
        def instructionId = UUID.randomUUID()
        def emptyParams = [:]
        
        when: "updateMasterInstruction is called"
        def result = repository.updateMasterInstruction(instructionId, emptyParams)
        
        then: "returns 0 without executing update"
        0 * mockSql.executeUpdate(_, _)
        result == 0
    }
    
    def "deleteMasterInstruction should delete instruction and instances in transaction"() {
        given: "instruction ID to delete"
        def instructionId = UUID.randomUUID()
        
        and: "DatabaseUtil.withSql is mocked with transaction support"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "deleteMasterInstruction is called"
        def result = repository.deleteMasterInstruction(instructionId)
        
        then: "deletes instances first (foreign key constraint)"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('DELETE FROM instructions_instance_ini') &&
            query.contains('WHERE inm_id = :inmId')
        }, [inmId: instructionId]) >> 2
        
        and: "then deletes master instruction"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('DELETE FROM instructions_master_inm') &&
            query.contains('WHERE inm_id = :inmId')
        }, [inmId: instructionId]) >> 1
        
        and: "returns affected rows from master deletion"
        result == 1
    }
    
    def "reorderMasterInstructions should reorder instructions in transaction with type safety"() {
        given: "step ID and order data"
        def stepId = UUID.randomUUID()
        def instruction1Id = UUID.randomUUID()
        def instruction2Id = UUID.randomUUID()
        def orderData = [
            [inmId: instruction1Id.toString(), newOrder: '2'],
            [inmId: instruction2Id.toString(), newOrder: '1']
        ]
        
        and: "DatabaseUtil.withSql is mocked with transaction support"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "reorderMasterInstructions is called"
        def result = repository.reorderMasterInstructions(stepId, orderData)
        
        then: "updates each instruction with exact validation"
        2 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE instructions_master_inm') &&
            query.contains('SET inm_order = :newOrder') &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains("updated_by = 'system'") &&
            query.contains('WHERE inm_id = :inmId AND stm_id = :stmId')
        }, { Map params ->
            params.stmId == stepId &&
            [instruction1Id, instruction2Id].contains(params.inmId) &&
            params.newOrder in [1, 2]
        }) >> 1
        
        and: "returns total affected rows"
        result == 2
    }
    
    def "reorderMasterInstructions should handle SQL duplicate order violations"() {
        given: "parameters that would cause duplicate orders"
        def stepId = UUID.randomUUID()
        def orderData = [[inmId: UUID.randomUUID().toString(), newOrder: '1']]
        def sqlException = new SQLException("Duplicate key", "23505")
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        mockSql.executeUpdate(_, _) >> { throw sqlException }
        
        when: "reorderMasterInstructions is called"
        repository.reorderMasterInstructions(stepId, orderData)
        
        then: "throws IllegalArgumentException with duplicate order message"
        def ex = thrown(IllegalArgumentException)
        ex.message.contains("Duplicate order values detected")
    }
    
    // ==================== INSTANCE INSTRUCTION TESTS ====================
    
    def "findInstanceInstructionsByStepInstanceId should return instance instructions with master details"() {
        given: "a step instance ID and expected results"
        def stepInstanceId = UUID.randomUUID()
        def expectedResults = [
            [
                ini_id: UUID.randomUUID(),
                sti_id: stepInstanceId,
                inm_id: UUID.randomUUID(),
                ini_is_completed: false,
                ini_completed_at: null,
                usr_id_completed_by: null,
                tms_id: 123,
                cti_id: UUID.randomUUID(),
                ini_order: 1,
                ini_body: 'Instance Instruction 1',
                ini_duration_minutes: 30,
                master_order: 1,
                master_body: 'Master Instruction 1',
                master_duration: 30,
                tms_name: 'Infrastructure Team',
                usr_first_name: null,
                usr_last_name: null,
                usr_email: null,
                created_at: new Date(),
                updated_at: new Date()
            ],
            [
                ini_id: UUID.randomUUID(),
                sti_id: stepInstanceId,
                inm_id: UUID.randomUUID(),
                ini_is_completed: true,
                ini_completed_at: new Date(),
                usr_id_completed_by: 789,
                tms_id: 456,
                cti_id: null,
                ini_order: 2,
                ini_body: 'Instance Instruction 2',
                ini_duration_minutes: 15,
                master_order: 2,
                master_body: 'Master Instruction 2',
                master_duration: 15,
                tms_name: 'Database Team',
                usr_first_name: 'John',
                usr_last_name: 'Doe',
                usr_email: 'john.doe@example.com',
                created_at: new Date(),
                updated_at: new Date()
            ]
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findInstanceInstructionsByStepInstanceId is called"
        def result = repository.findInstanceInstructionsByStepInstanceId(stepInstanceId)
        
        then: "SQL query validates exact structure with hierarchical joins"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('ini.ini_id') &&
            query.contains('ini.sti_id') &&
            query.contains('ini.inm_id') &&
            query.contains('ini.ini_is_completed') &&
            query.contains('ini.ini_completed_at') &&
            query.contains('ini.usr_id_completed_by') &&
            query.contains('ini.tms_id') &&
            query.contains('ini.cti_id') &&
            query.contains('ini.ini_order') &&
            query.contains('ini.ini_body') &&
            query.contains('ini.ini_duration_minutes') &&
            query.contains('inm.inm_order as master_order') &&
            query.contains('inm.inm_body as master_body') &&
            query.contains('inm.inm_duration_minutes as master_duration') &&
            query.contains('tms.tms_name') &&
            query.contains('usr.usr_first_name') &&
            query.contains('usr.usr_last_name') &&
            query.contains('usr.usr_email') &&
            query.contains('ini.created_at') &&
            query.contains('ini.updated_at') &&
            query.contains('FROM instructions_instance_ini ini') &&
            query.contains('JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id') &&
            query.contains('LEFT JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id') &&
            query.contains('LEFT JOIN users_usr usr ON ini.usr_id_completed_by = usr.usr_id') &&
            query.contains('WHERE ini.sti_id = :stiId') &&
            query.contains('ORDER BY COALESCE(ini.ini_order, inm.inm_order) ASC')
        }, [stiId: stepInstanceId]) >> expectedResults
        
        and: "returns expected data"
        result == expectedResults
    }
    
    def "findInstanceInstructionById should return specific instance instruction with full details"() {
        given: "an instance instruction ID and expected instruction"
        def instructionId = UUID.randomUUID()
        def expectedInstruction = [
            ini_id: instructionId,
            sti_id: UUID.randomUUID(),
            inm_id: UUID.randomUUID(),
            ini_is_completed: true,
            ini_completed_at: new Date(),
            usr_id_completed_by: 456,
            tms_id: 123,
            cti_id: UUID.randomUUID(),
            ini_order: 2,
            ini_body: 'Test Instance Instruction',
            ini_duration_minutes: 20,
            master_order: 2,
            master_body: 'Test Master Instruction',
            master_duration: 20,
            tms_name: 'Security Team',
            usr_first_name: 'Jane',
            usr_last_name: 'Smith',
            usr_email: 'jane.smith@example.com',
            created_at: new Date(),
            updated_at: new Date()
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findInstanceInstructionById is called"
        def result = repository.findInstanceInstructionById(instructionId)
        
        then: "SQL firstRow query validates exact structure"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT') &&
            query.contains('ini.ini_id') &&
            query.contains('ini.sti_id') &&
            query.contains('ini.inm_id') &&
            query.contains('ini.ini_is_completed') &&
            query.contains('ini.ini_completed_at') &&
            query.contains('ini.usr_id_completed_by') &&
            query.contains('ini.tms_id') &&
            query.contains('ini.cti_id') &&
            query.contains('ini.ini_order') &&
            query.contains('ini.ini_body') &&
            query.contains('ini.ini_duration_minutes') &&
            query.contains('inm.inm_order as master_order') &&
            query.contains('inm.inm_body as master_body') &&
            query.contains('inm.inm_duration_minutes as master_duration') &&
            query.contains('tms.tms_name') &&
            query.contains('usr.usr_first_name') &&
            query.contains('usr.usr_last_name') &&
            query.contains('usr.usr_email') &&
            query.contains('ini.created_at') &&
            query.contains('ini.updated_at') &&
            query.contains('FROM instructions_instance_ini ini') &&
            query.contains('JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id') &&
            query.contains('LEFT JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id') &&
            query.contains('LEFT JOIN users_usr usr ON ini.usr_id_completed_by = usr.usr_id') &&
            query.contains('WHERE ini.ini_id = :iniId')
        }, [iniId: instructionId]) >> expectedInstruction
        
        and: "returns the instruction"
        result == expectedInstruction
    }
    
    def "createInstanceInstructions should create instances from master instructions in transaction"() {
        given: "step instance ID and master instruction IDs"
        def stepInstanceId = UUID.randomUUID()
        def masterId1 = UUID.randomUUID()
        def masterId2 = UUID.randomUUID()
        def masterIds = [masterId1, masterId2]
        def instanceId1 = UUID.randomUUID()
        def instanceId2 = UUID.randomUUID()
        
        and: "DatabaseUtil.withSql is mocked with transaction support"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "createInstanceInstructions is called"
        def result = repository.createInstanceInstructions(stepInstanceId, masterIds)
        
        then: "inserts each instance with exact structure validation"
        2 * mockSql.firstRow({ String query ->
            query.contains('INSERT INTO instructions_instance_ini') &&
            query.contains('sti_id, inm_id, ini_is_completed, tms_id, ini_order, ini_body, ini_duration_minutes') &&
            query.contains('created_by, created_at, updated_by, updated_at') &&
            query.contains('SELECT') &&
            query.contains(':stiId as sti_id') &&
            query.contains('inm.inm_id') &&
            query.contains('false as ini_is_completed') &&
            query.contains('inm.tms_id') &&
            query.contains('inm.inm_order') &&
            query.contains('inm.inm_body') &&
            query.contains('inm.inm_duration_minutes') &&
            query.contains("'system' as created_by") &&
            query.contains('CURRENT_TIMESTAMP as created_at') &&
            query.contains("'system' as updated_by") &&
            query.contains('CURRENT_TIMESTAMP as updated_at') &&
            query.contains('FROM instructions_master_inm inm') &&
            query.contains('WHERE inm.inm_id = :inmId') &&
            query.contains('RETURNING ini_id')
        }, { Map params ->
            params.stiId == stepInstanceId &&
            [masterId1, masterId2].contains(params.inmId)
        }) >> { args -> 
            if (args[1].inmId == masterId1) [ini_id: instanceId1] 
            else [ini_id: instanceId2] 
        }
        
        and: "returns list of created instance IDs"
        result == [instanceId1, instanceId2]
    }
    
    def "createInstanceInstructions should handle empty master instruction list"() {
        given: "step instance ID with empty master instruction list"
        def stepInstanceId = UUID.randomUUID()
        def emptyMasterIds = []
        
        when: "createInstanceInstructions is called"
        repository.createInstanceInstructions(stepInstanceId, emptyMasterIds)
        
        then: "throws IllegalArgumentException"
        thrown(IllegalArgumentException)
    }
    
    def "completeInstruction should mark instruction as completed with user tracking"() {
        given: "instruction instance ID and user ID"
        def instructionId = UUID.randomUUID()
        def userId = 123
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "completeInstruction is called"
        def result = repository.completeInstruction(instructionId, userId)
        
        then: "executes update with exact completion logic"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE instructions_instance_ini') &&
            query.contains('SET') &&
            query.contains('ini_is_completed = true') &&
            query.contains('ini_completed_at = CURRENT_TIMESTAMP') &&
            query.contains('usr_id_completed_by = :userId') &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains("updated_by = 'system'") &&
            query.contains('WHERE ini_id = :iniId AND ini_is_completed = false')
        }, [iniId: instructionId, userId: userId]) >> 1
        
        and: "returns affected rows count"
        result == 1
    }
    
    def "completeInstruction should handle invalid user reference"() {
        given: "instruction ID with invalid user ID"
        def instructionId = UUID.randomUUID()
        def invalidUserId = 999
        def sqlException = new SQLException("Foreign key violation", "23503")
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.executeUpdate(_, _) >> { throw sqlException }
        
        when: "completeInstruction is called"
        repository.completeInstruction(instructionId, invalidUserId)
        
        then: "throws IllegalArgumentException with user message"
        def ex = thrown(IllegalArgumentException)
        ex.message.contains("User does not exist")
    }
    
    def "uncompleteInstruction should mark instruction as not completed"() {
        given: "completed instruction instance ID"
        def instructionId = UUID.randomUUID()
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "uncompleteInstruction is called"
        def result = repository.uncompleteInstruction(instructionId)
        
        then: "executes update with exact uncompletion logic"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE instructions_instance_ini') &&
            query.contains('SET') &&
            query.contains('ini_is_completed = false') &&
            query.contains('ini_completed_at = NULL') &&
            query.contains('usr_id_completed_by = NULL') &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains("updated_by = 'system'") &&
            query.contains('WHERE ini_id = :iniId AND ini_is_completed = true')
        }, [iniId: instructionId]) >> 1
        
        and: "returns affected rows count"
        result == 1
    }
    
    def "bulkCompleteInstructions should complete multiple instructions in transaction with batching"() {
        given: "list of instruction IDs and user ID"
        def userId = 456
        def instructionIds = []
        def batchSize = 150  // Testing batch processing logic
        for (int i = 0; i < batchSize; i++) {
            instructionIds << UUID.randomUUID()
        }
        
        and: "DatabaseUtil.withSql is mocked with transaction support"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "bulkCompleteInstructions is called"
        def result = repository.bulkCompleteInstructions(instructionIds, userId)
        
        then: "executes batch updates with exact structure validation"
        2 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE instructions_instance_ini') &&
            query.contains('SET') &&
            query.contains('ini_is_completed = true') &&
            query.contains('ini_completed_at = CURRENT_TIMESTAMP') &&
            query.contains('usr_id_completed_by = ?') &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains("updated_by = 'system'") &&
            query.contains('WHERE ini_id IN (') &&
            query.contains(') AND ini_is_completed = false')
        }, { List params ->
            params[0] == userId &&  // First parameter is user ID
            params.size() > 1  // Additional parameters are instruction IDs
        }) >> 75  // Each batch updates 75 instructions
        
        and: "returns total affected rows"
        result == 150
    }
    
    def "bulkCompleteInstructions should handle empty instruction list"() {
        given: "empty instruction list"
        def emptyIds = []
        def userId = 123
        
        when: "bulkCompleteInstructions is called"
        repository.bulkCompleteInstructions(emptyIds, userId)
        
        then: "throws IllegalArgumentException"
        thrown(IllegalArgumentException)
    }
    
    // ==================== QUERY AND ANALYTICS TESTS ====================
    
    def "findInstructionsWithHierarchicalFiltering should support complex hierarchical filtering"() {
        given: "filters with multiple hierarchical criteria"
        def filters = [
            migrationId: UUID.randomUUID().toString(),
            iterationId: UUID.randomUUID().toString(),
            planInstanceId: UUID.randomUUID().toString(),
            sequenceInstanceId: UUID.randomUUID().toString(),
            phaseInstanceId: UUID.randomUUID().toString(),
            stepInstanceId: UUID.randomUUID().toString(),
            teamId: '123',
            isCompleted: 'true'
        ]
        def expectedInstructions = [
            [
                ini_id: UUID.randomUUID(),
                sti_id: UUID.fromString(filters.stepInstanceId),
                inm_id: UUID.randomUUID(),
                ini_is_completed: true,
                ini_completed_at: new Date(),
                usr_id_completed_by: 456,
                effective_order: 1,
                effective_body: 'Filtered Instruction 1',
                effective_duration: 30,
                migration_name: 'Test Migration',
                iteration_name: 'Test Iteration',
                plan_name: 'Test Plan',
                sequence_name: 'Test Sequence',
                phase_name: 'Test Phase',
                step_name: 'Test Step',
                team_name: 'Infrastructure Team',
                usr_first_name: 'John',
                usr_last_name: 'Doe'
            ]
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findInstructionsWithHierarchicalFiltering is called"
        def result = repository.findInstructionsWithHierarchicalFiltering(filters)
        
        then: "SQL query validates complete hierarchical structure and filtering"
        1 * mockSql.rows({ String query ->
            // Validate SELECT fields
            query.contains('SELECT') &&
            query.contains('ini.ini_id') &&
            query.contains('ini.sti_id') &&
            query.contains('ini.inm_id') &&
            query.contains('ini.ini_is_completed') &&
            query.contains('ini.ini_completed_at') &&
            query.contains('ini.usr_id_completed_by') &&
            query.contains('COALESCE(ini.ini_order, inm.inm_order) as effective_order') &&
            query.contains('COALESCE(ini.ini_body, inm.inm_body) as effective_body') &&
            query.contains('COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) as effective_duration') &&
            // Validate hierarchy context fields
            query.contains('mig.mig_name as migration_name') &&
            query.contains('ite.ite_name as iteration_name') &&
            query.contains('pli.pli_name as plan_name') &&
            query.contains('sqm.sqm_name as sequence_name') &&
            query.contains('phm.phm_name as phase_name') &&
            query.contains('stm.stm_name as step_name') &&
            query.contains('tms.tms_name as team_name') &&
            query.contains('usr.usr_first_name') &&
            query.contains('usr.usr_last_name') &&
            // Validate FROM and JOINs
            query.contains('FROM instructions_instance_ini ini') &&
            query.contains('JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id') &&
            query.contains('JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id') &&
            query.contains('JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id') &&
            query.contains('JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id') &&
            query.contains('JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id') &&
            query.contains('JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id') &&
            query.contains('JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id') &&
            query.contains('JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id') &&
            query.contains('JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id') &&
            query.contains('JOIN iterations_ite ite ON pli.ite_id = ite.ite_id') &&
            query.contains('JOIN migrations_mig mig ON ite.mig_id = mig.mig_id') &&
            query.contains('LEFT JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id') &&
            query.contains('LEFT JOIN users_usr usr ON ini.usr_id_completed_by = usr.usr_id') &&
            // Validate WHERE conditions
            query.contains('mig.mig_id = :migrationId') &&
            query.contains('ite.ite_id = :iterationId') &&
            query.contains('pli.pli_id = :planInstanceId') &&
            query.contains('sqi.sqi_id = :sequenceInstanceId') &&
            query.contains('phi.phi_id = :phaseInstanceId') &&
            query.contains('sti.sti_id = :stepInstanceId') &&
            query.contains('COALESCE(ini.tms_id, inm.tms_id) = :teamId') &&
            query.contains('ini.ini_is_completed = :isCompleted') &&
            // Validate ORDER BY
            query.contains('ORDER BY') &&
            query.contains('mig.mig_name, ite.ite_name, pli.pli_name, sqm.sqm_order, phm.phm_order') &&
            query.contains('stm.stm_name, COALESCE(ini.ini_order, inm.inm_order)')
        }, { Map params ->
            // Validate type safety (ADR-031)
            params.migrationId instanceof UUID &&
            params.iterationId instanceof UUID &&
            params.planInstanceId instanceof UUID &&
            params.sequenceInstanceId instanceof UUID &&
            params.phaseInstanceId instanceof UUID &&
            params.stepInstanceId instanceof UUID &&
            params.teamId instanceof Integer &&
            params.isCompleted instanceof Boolean
        }) >> expectedInstructions
        
        and: "returns filtered results with summary statistics"
        result.instructions == expectedInstructions
        result.total == 1
        result.completed == 1
        result.pending == 0
        result.completion_percentage == 100.0
    }
    
    def "getInstructionStatisticsByMigration should calculate comprehensive statistics"() {
        given: "migration ID and expected statistics"
        def migrationId = UUID.randomUUID()
        def overallStats = [
            total_instructions: 100,
            completed_instructions: 60,
            pending_instructions: 40,
            avg_completion_time: 25.5,
            estimated_remaining_minutes: 800
        ]
        def teamBreakdown = [
            [
                tms_id: 123,
                tms_name: 'Infrastructure Team',
                total_instructions: 50,
                completed_instructions: 30,
                completion_percentage: 60.0
            ],
            [
                tms_id: 456,
                tms_name: 'Database Team',
                total_instructions: 50,
                completed_instructions: 30,
                completion_percentage: 60.0
            ]
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "getInstructionStatisticsByMigration is called"
        def result = repository.getInstructionStatisticsByMigration(migrationId)
        
        then: "queries overall statistics with exact structure"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT') &&
            query.contains('COUNT(*) as total_instructions') &&
            query.contains('COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_instructions') &&
            query.contains('COUNT(CASE WHEN NOT ini.ini_is_completed THEN 1 END) as pending_instructions') &&
            query.contains('COALESCE(AVG(CASE WHEN ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as avg_completion_time') &&
            query.contains('COALESCE(SUM(CASE WHEN NOT ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as estimated_remaining_minutes') &&
            query.contains('FROM instructions_instance_ini ini') &&
            query.contains('JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id') &&
            query.contains('JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id') &&
            query.contains('JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id') &&
            query.contains('JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id') &&
            query.contains('JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id') &&
            query.contains('JOIN iterations_ite ite ON pli.ite_id = ite.ite_id') &&
            query.contains('WHERE ite.mig_id = :migrationId')
        }, [migrationId: migrationId]) >> overallStats
        
        and: "queries team breakdown with exact structure"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('tms.tms_id') &&
            query.contains('tms.tms_name') &&
            query.contains('COUNT(*) as total_instructions') &&
            query.contains('COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_instructions') &&
            query.contains('CASE') &&
            query.contains('WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) * 100.0 / COUNT(*))') &&
            query.contains('ELSE 0') &&
            query.contains('END as completion_percentage') &&
            query.contains('FROM instructions_instance_ini ini') &&
            query.contains('JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id') &&
            query.contains('JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id') &&
            query.contains('JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id') &&
            query.contains('JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id') &&
            query.contains('JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id') &&
            query.contains('JOIN iterations_ite ite ON pli.ite_id = ite.ite_id') &&
            query.contains('JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id') &&
            query.contains('WHERE ite.mig_id = :migrationId') &&
            query.contains('GROUP BY tms.tms_id, tms.tms_name') &&
            query.contains('ORDER BY tms.tms_name')
        }, [migrationId: migrationId]) >> teamBreakdown
        
        and: "returns comprehensive statistics"
        result.migration_id == migrationId
        result.total_instructions == 100
        result.completed == 60
        result.pending == 40
        result.completion_percentage == 60.0
        result.estimated_remaining_minutes == 800
        result.average_completion_time == 25.5
        result.by_team.size() == 2
        result.by_team[0].tms_id == 123
        result.by_team[0].tms_name == 'Infrastructure Team'
        result.by_team[0].total == 50
        result.by_team[0].completed == 30
        result.by_team[0].percentage == 60.0
    }
    
    def "getInstructionStatisticsByTeam should calculate team-specific statistics"() {
        given: "team ID and expected statistics"
        def teamId = 123
        def teamStats = [
            tms_name: 'Infrastructure Team',
            total_instructions: 75,
            completed_instructions: 45,
            pending_instructions: 30,
            avg_completion_time: 22.5,
            estimated_remaining_minutes: 600
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "getInstructionStatisticsByTeam is called"
        def result = repository.getInstructionStatisticsByTeam(teamId)
        
        then: "queries team statistics with exact structure"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT') &&
            query.contains('tms.tms_name') &&
            query.contains('COUNT(*) as total_instructions') &&
            query.contains('COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_instructions') &&
            query.contains('COUNT(CASE WHEN NOT ini.ini_is_completed THEN 1 END) as pending_instructions') &&
            query.contains('COALESCE(AVG(CASE WHEN ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as avg_completion_time') &&
            query.contains('COALESCE(SUM(CASE WHEN NOT ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as estimated_remaining_minutes') &&
            query.contains('FROM instructions_instance_ini ini') &&
            query.contains('JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id') &&
            query.contains('JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id') &&
            query.contains('WHERE COALESCE(ini.tms_id, inm.tms_id) = :teamId') &&
            query.contains('GROUP BY tms.tms_name')
        }, [teamId: teamId]) >> teamStats
        
        and: "returns team statistics"
        result.tms_id == teamId
        result.tms_name == 'Infrastructure Team'
        result.total_instructions == 75
        result.completed == 45
        result.pending == 30
        result.completion_percentage == 60.0
        result.estimated_remaining_minutes == 600
        result.average_completion_time == 22.5
    }
    
    def "getInstructionStatisticsByTeam should handle non-existent team"() {
        given: "non-existent team ID"
        def teamId = 999
        def noStats = null
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow(_, _) >> noStats
        
        when: "getInstructionStatisticsByTeam is called"
        def result = repository.getInstructionStatisticsByTeam(teamId)
        
        then: "returns default statistics for unknown team"
        result.tms_id == teamId
        result.tms_name == "Unknown Team"
        result.total_instructions == 0
        result.completed == 0
        result.pending == 0
        result.completion_percentage == 0
        result.estimated_remaining_minutes == 0
        result.average_completion_time == 0
    }
    
    def "getInstructionCompletionTimeline should return chronological completion events"() {
        given: "iteration ID and expected timeline"
        def iterationId = UUID.randomUUID()
        def expectedTimeline = [
            [
                ini_id: UUID.randomUUID(),
                ini_completed_at: new Date(System.currentTimeMillis() - 3600000), // 1 hour ago
                usr_id_completed_by: 123,
                usr_first_name: 'John',
                usr_last_name: 'Doe',
                usr_email: 'john.doe@example.com',
                instruction_body: 'First completed instruction',
                tms_name: 'Infrastructure Team',
                step_name: 'Deploy Application',
                phase_name: 'Deployment Phase'
            ],
            [
                ini_id: UUID.randomUUID(),
                ini_completed_at: new Date(System.currentTimeMillis() - 1800000), // 30 minutes ago
                usr_id_completed_by: 456,
                usr_first_name: 'Jane',
                usr_last_name: 'Smith',
                usr_email: 'jane.smith@example.com',
                instruction_body: 'Second completed instruction',
                tms_name: 'Database Team',
                step_name: 'Verify Database',
                phase_name: 'Validation Phase'
            ]
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "getInstructionCompletionTimeline is called"
        def result = repository.getInstructionCompletionTimeline(iterationId)
        
        then: "queries completion timeline with exact structure"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('ini.ini_id') &&
            query.contains('ini.ini_completed_at') &&
            query.contains('ini.usr_id_completed_by') &&
            query.contains('usr.usr_first_name') &&
            query.contains('usr.usr_last_name') &&
            query.contains('usr.usr_email') &&
            query.contains('COALESCE(ini.ini_body, inm.inm_body) as instruction_body') &&
            query.contains('tms.tms_name') &&
            query.contains('stm.stm_name as step_name') &&
            query.contains('phm.phm_name as phase_name') &&
            query.contains('FROM instructions_instance_ini ini') &&
            query.contains('JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id') &&
            query.contains('JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id') &&
            query.contains('JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id') &&
            query.contains('JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id') &&
            query.contains('JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id') &&
            query.contains('JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id') &&
            query.contains('JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id') &&
            query.contains('JOIN iterations_ite ite ON pli.ite_id = ite.ite_id') &&
            query.contains('LEFT JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id') &&
            query.contains('LEFT JOIN users_usr usr ON ini.usr_id_completed_by = usr.usr_id') &&
            query.contains('WHERE ite.ite_id = :iterationId AND ini.ini_is_completed = true') &&
            query.contains('ORDER BY ini.ini_completed_at ASC')
        }, [iterationId: iterationId]) >> expectedTimeline
        
        and: "returns chronological completion events"
        result == expectedTimeline
    }
    
    def "findInstructionsByControlId should return instructions associated with control"() {
        given: "control master ID and expected instructions"
        def controlId = UUID.randomUUID()
        def expectedInstructions = [
            [
                inm_id: UUID.randomUUID(),
                stm_id: UUID.randomUUID(),
                tms_id: 123,
                ctm_id: controlId,
                inm_order: 1,
                inm_body: 'Control-related instruction 1',
                inm_duration_minutes: 20,
                stm_name: 'Validation Step',
                tms_name: 'QA Team',
                ctm_name: 'Quality Control',
                instance_count: 5,
                completed_instances: 3
            ],
            [
                inm_id: UUID.randomUUID(),
                stm_id: UUID.randomUUID(),
                tms_id: 456,
                ctm_id: controlId,
                inm_order: 2,
                inm_body: 'Control-related instruction 2',
                inm_duration_minutes: 15,
                stm_name: 'Approval Step',
                tms_name: 'Management Team',
                ctm_name: 'Quality Control',
                instance_count: 5,
                completed_instances: 5
            ]
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findInstructionsByControlId is called"
        def result = repository.findInstructionsByControlId(controlId)
        
        then: "queries instructions by control with exact structure"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('inm.inm_id') &&
            query.contains('inm.stm_id') &&
            query.contains('inm.tms_id') &&
            query.contains('inm.ctm_id') &&
            query.contains('inm.inm_order') &&
            query.contains('inm.inm_body') &&
            query.contains('inm.inm_duration_minutes') &&
            query.contains('stm.stm_name') &&
            query.contains('tms.tms_name') &&
            query.contains('ctm.ctm_name') &&
            query.contains('COUNT(ini.ini_id) as instance_count') &&
            query.contains('COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_instances') &&
            query.contains('FROM instructions_master_inm inm') &&
            query.contains('JOIN steps_master_stm stm ON inm.stm_id = stm.stm_id') &&
            query.contains('JOIN controls_master_ctm ctm ON inm.ctm_id = ctm.ctm_id') &&
            query.contains('LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id') &&
            query.contains('LEFT JOIN instructions_instance_ini ini ON inm.inm_id = ini.inm_id') &&
            query.contains('WHERE inm.ctm_id = :ctmId') &&
            query.contains('GROUP BY inm.inm_id, inm.stm_id, inm.tms_id, inm.ctm_id, inm.inm_order') &&
            query.contains('inm.inm_body, inm.inm_duration_minutes, stm.stm_name, tms.tms_name, ctm.ctm_name') &&
            query.contains('ORDER BY inm.inm_order ASC')
        }, [ctmId: controlId]) >> expectedInstructions
        
        and: "returns instructions with instance counts"
        result == expectedInstructions
    }
    
    def "cloneMasterInstructions should copy instructions from source to target step"() {
        given: "source and target step master IDs"
        def sourceStepId = UUID.randomUUID()
        def targetStepId = UUID.randomUUID()
        def clonedId1 = UUID.randomUUID()
        def clonedId2 = UUID.randomUUID()
        def cloneResults = [
            [inm_id: clonedId1],
            [inm_id: clonedId2]
        ]
        
        and: "DatabaseUtil.withSql is mocked with transaction support"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "cloneMasterInstructions is called"
        def result = repository.cloneMasterInstructions(sourceStepId, targetStepId)
        
        then: "clones instructions with exact structure validation"
        1 * mockSql.rows({ String query ->
            query.contains('INSERT INTO instructions_master_inm') &&
            query.contains('stm_id, tms_id, ctm_id, inm_order, inm_body, inm_duration_minutes') &&
            query.contains('created_by, created_at, updated_by, updated_at') &&
            query.contains('SELECT') &&
            query.contains(':targetStmId as stm_id') &&
            query.contains('tms_id') &&
            query.contains('ctm_id') &&
            query.contains('inm_order') &&
            query.contains('inm_body') &&
            query.contains('inm_duration_minutes') &&
            query.contains("'system' as created_by") &&
            query.contains('CURRENT_TIMESTAMP as created_at') &&
            query.contains("'system' as updated_by") &&
            query.contains('CURRENT_TIMESTAMP as updated_at') &&
            query.contains('FROM instructions_master_inm') &&
            query.contains('WHERE stm_id = :sourceStmId') &&
            query.contains('ORDER BY inm_order') &&
            query.contains('RETURNING inm_id')
        }, [sourceStmId: sourceStepId, targetStmId: targetStepId]) >> cloneResults
        
        and: "returns list of cloned instruction IDs"
        result == [clonedId1, clonedId2]
    }
    
    def "cloneMasterInstructions should handle source step non-existence"() {
        given: "non-existent source step ID"
        def sourceStepId = UUID.randomUUID()
        def targetStepId = UUID.randomUUID()
        def sqlException = new SQLException("Foreign key violation", "23503")
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        mockSql.rows(_, _) >> { throw sqlException }
        
        when: "cloneMasterInstructions is called"
        repository.cloneMasterInstructions(sourceStepId, targetStepId)
        
        then: "throws IllegalArgumentException with step existence message"
        def ex = thrown(IllegalArgumentException)
        ex.message.contains("Source or target step master does not exist")
    }
    
    def "getTeamWorkload should calculate team workload for specific iteration"() {
        given: "team ID, iteration ID, and expected workload data"
        def teamId = 123
        def iterationId = UUID.randomUUID()
        def workloadStats = [
            tms_name: 'Infrastructure Team',
            total_instructions: 60,
            completed_instructions: 35,
            pending_instructions: 25,
            estimated_remaining_minutes: 500,
            avg_completion_time: 18.5
        ]
        def phaseBreakdown = [
            [
                phm_name: 'Preparation Phase',
                instruction_count: 20,
                completed_count: 15,
                remaining_minutes: 100
            ],
            [
                phm_name: 'Execution Phase',
                instruction_count: 40,
                completed_count: 20,
                remaining_minutes: 400
            ]
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "getTeamWorkload is called"
        def result = repository.getTeamWorkload(teamId, iterationId)
        
        then: "queries workload statistics with exact structure"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT') &&
            query.contains('tms.tms_name') &&
            query.contains('COUNT(*) as total_instructions') &&
            query.contains('COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_instructions') &&
            query.contains('COUNT(CASE WHEN NOT ini.ini_is_completed THEN 1 END) as pending_instructions') &&
            query.contains('COALESCE(SUM(CASE WHEN NOT ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as estimated_remaining_minutes') &&
            query.contains('COALESCE(AVG(CASE WHEN ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as avg_completion_time') &&
            query.contains('FROM instructions_instance_ini ini') &&
            query.contains('JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id') &&
            query.contains('JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id') &&
            query.contains('JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id') &&
            query.contains('JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id') &&
            query.contains('JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id') &&
            query.contains('JOIN iterations_ite ite ON pli.ite_id = ite.ite_id') &&
            query.contains('JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id') &&
            query.contains('WHERE COALESCE(ini.tms_id, inm.tms_id) = :teamId AND ite.ite_id = :iterationId') &&
            query.contains('GROUP BY tms.tms_name')
        }, [teamId: teamId, iterationId: iterationId]) >> workloadStats
        
        and: "queries phase breakdown with exact structure"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('phm.phm_name') &&
            query.contains('COUNT(*) as instruction_count') &&
            query.contains('COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_count') &&
            query.contains('COALESCE(SUM(CASE WHEN NOT ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as remaining_minutes') &&
            query.contains('FROM instructions_instance_ini ini') &&
            query.contains('JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id') &&
            query.contains('JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id') &&
            query.contains('JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id') &&
            query.contains('JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id') &&
            query.contains('JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id') &&
            query.contains('JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id') &&
            query.contains('JOIN iterations_ite ite ON pli.ite_id = ite.ite_id') &&
            query.contains('WHERE COALESCE(ini.tms_id, inm.tms_id) = :teamId AND ite.ite_id = :iterationId') &&
            query.contains('GROUP BY phm.phm_name') &&
            query.contains('ORDER BY phm.phm_name')
        }, [teamId: teamId, iterationId: iterationId]) >> phaseBreakdown
        
        and: "returns comprehensive workload data"
        result.tms_id == teamId
        result.tms_name == 'Infrastructure Team'
        result.iteration_id == iterationId
        result.total_instructions == 60
        result.completed == 35
        result.pending == 25
        result.completion_percentage == 58.33
        result.estimated_remaining_minutes == 500
        result.average_completion_time == 18.5
        result.by_phase.size() == 2
        result.by_phase[0].phase_name == 'Preparation Phase'
        result.by_phase[0].instruction_count == 20
        result.by_phase[0].completed_count == 15
        result.by_phase[0].remaining_minutes == 100
    }
    
    def "getTeamWorkload should handle non-existent team or iteration"() {
        given: "non-existent team ID and iteration ID"
        def teamId = 999
        def iterationId = UUID.randomUUID()
        def noWorkloadStats = null
        def emptyPhaseBreakdown = []
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow(_, _) >> noWorkloadStats
        mockSql.rows(_, _) >> emptyPhaseBreakdown
        
        when: "getTeamWorkload is called"
        def result = repository.getTeamWorkload(teamId, iterationId)
        
        then: "returns default workload data for unknown team"
        result.tms_id == teamId
        result.tms_name == "Unknown Team"
        result.iteration_id == iterationId
        result.total_instructions == 0
        result.completed == 0
        result.pending == 0
        result.completion_percentage == 0
        result.estimated_remaining_minutes == 0
        result.average_completion_time == 0
        result.by_phase == []
    }
    
    // ==================== ERROR HANDLING AND EDGE CASES ====================
    
    @Unroll
    def "null parameter validation should throw IllegalArgumentException for #method with #paramName = #paramValue"() {
        when: "method is called with null parameter"
        repository."$method"(*args)
        
        then: "throws IllegalArgumentException"
        thrown(IllegalArgumentException)
        
        where:
        method                                      | paramName           | paramValue | args
        'findMasterInstructionById'                | 'inmId'             | null       | [null]
        'findInstanceInstructionsByStepInstanceId' | 'stiId'             | null       | [null]
        'findInstanceInstructionById'              | 'iniId'             | null       | [null]
        'completeInstruction'                      | 'iniId'             | null       | [null, 123]
        'completeInstruction'                      | 'userId'            | null       | [UUID.randomUUID(), null]
        'uncompleteInstruction'                    | 'iniId'             | null       | [null]
        'updateMasterInstruction'                  | 'inmId'             | null       | [null, [:]]
        'deleteMasterInstruction'                  | 'inmId'             | null       | [null]
        'reorderMasterInstructions'                | 'stmId'             | null       | [null, []]
        'reorderMasterInstructions'                | 'orderData'         | null       | [UUID.randomUUID(), null]
        'createInstanceInstructions'               | 'stiId'             | null       | [null, [UUID.randomUUID()]]
        'createInstanceInstructions'               | 'inmIds'            | null       | [UUID.randomUUID(), null]
        'bulkCompleteInstructions'                 | 'iniIds'            | null       | [null, 123]
        'bulkCompleteInstructions'                 | 'userId'            | null       | [[UUID.randomUUID()], null]
        'getInstructionStatisticsByMigration'      | 'migrationId'       | null       | [null]
        'getInstructionStatisticsByTeam'           | 'teamId'            | null       | [null]
        'getInstructionCompletionTimeline'         | 'iterationId'       | null       | [null]
        'findInstructionsByControlId'              | 'ctmId'             | null       | [null]
        'cloneMasterInstructions'                  | 'sourceStmId'       | null       | [null, UUID.randomUUID()]
        'cloneMasterInstructions'                  | 'targetStmId'       | null       | [UUID.randomUUID(), null]
        'getTeamWorkload'                          | 'teamId'            | null       | [null, UUID.randomUUID()]
        'getTeamWorkload'                          | 'iterationId'       | null       | [123, null]
    }
    
    def "SQL exception handling should wrap and rethrow runtime exceptions"() {
        given: "mocked SQL that throws SQLException"
        def stepId = UUID.randomUUID()
        def sqlException = new SQLException("Database connection failed", "08001")
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.rows(_, _) >> { throw sqlException }
        
        when: "repository method is called"
        repository.findMasterInstructionsByStepId(stepId)
        
        then: "throws RuntimeException with descriptive message"
        def ex = thrown(RuntimeException)
        ex.message.contains("Failed to find master instructions for step")
        ex.cause == sqlException
    }
    
    def "type safety validation should convert string parameters to correct types"() {
        given: "parameters as strings that need type conversion"
        def params = [
            stmId: UUID.randomUUID().toString(),
            tmsId: '123',
            ctmId: UUID.randomUUID().toString(),
            inmOrder: '2',
            inmBody: 'Test Instruction',
            inmDurationMinutes: '45'
        ]
        def newInstructionId = UUID.randomUUID()
        def insertResult = [inm_id: newInstructionId]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "createMasterInstruction is called with string parameters"
        repository.createMasterInstruction(params)
        
        then: "parameters are converted to correct types (ADR-031 compliance)"
        1 * mockSql.firstRow(_, { Map insertParams ->
            insertParams.stmId instanceof UUID &&
            insertParams.tmsId instanceof Integer &&
            insertParams.ctmId instanceof UUID &&
            insertParams.inmOrder instanceof Integer &&
            insertParams.inmBody instanceof String &&
            insertParams.inmDurationMinutes instanceof Integer
        }) >> insertResult
    }
    
    def "bulk operations should handle transaction failures gracefully"() {
        given: "bulk operation parameters"
        def instructionIds = [UUID.randomUUID(), UUID.randomUUID()]
        def userId = 123
        def transactionException = new RuntimeException("Transaction rollback")
        
        and: "DatabaseUtil.withSql is mocked with failing transaction"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { throw transactionException }
        
        when: "bulkCompleteInstructions is called"
        repository.bulkCompleteInstructions(instructionIds, userId)
        
        then: "transaction exception is propagated"
        def ex = thrown(RuntimeException)
        ex.message.contains("Failed to bulk complete instructions")
        ex.cause == transactionException
    }
    
    def "hierarchical filtering should handle empty filter maps"() {
        given: "empty filters map"
        def emptyFilters = [:]
        def expectedInstructions = []
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findInstructionsWithHierarchicalFiltering is called"
        def result = repository.findInstructionsWithHierarchicalFiltering(emptyFilters)
        
        then: "SQL query contains no WHERE conditions"
        1 * mockSql.rows({ String query ->
            !query.contains('WHERE') || query.contains('WHERE 1=1')  // Only base WHERE clause
        }, [:]) >> expectedInstructions
        
        and: "returns empty results with zero statistics"
        result.instructions == []
        result.total == 0
        result.completed == 0
        result.pending == 0
        result.completion_percentage == 0
    }
    
    def "completion percentage calculations should handle division by zero"() {
        given: "migration ID with no instructions"
        def migrationId = UUID.randomUUID()
        def emptyStats = [
            total_instructions: 0,
            completed_instructions: 0,
            pending_instructions: 0,
            avg_completion_time: 0,
            estimated_remaining_minutes: 0
        ]
        def emptyTeamBreakdown = []
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow(_, _) >> emptyStats
        mockSql.rows(_, _) >> emptyTeamBreakdown
        
        when: "getInstructionStatisticsByMigration is called"
        def result = repository.getInstructionStatisticsByMigration(migrationId)
        
        then: "completion percentage is 0 (no division by zero error)"
        result.completion_percentage == 0
        result.total_instructions == 0
        result.completed == 0
        result.pending == 0
    }
}