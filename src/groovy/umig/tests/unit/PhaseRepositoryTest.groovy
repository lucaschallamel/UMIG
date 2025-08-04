#!/usr/bin/env groovy
/**
 * Unit Test for PhaseRepository
 * Tests repository methods with specific SQL query mocks following ADR-026
 * 
 * Prerequisites:
 * - Spock Framework for testing
 * - Mock DatabaseUtil for SQL operations
 * 
 * Run from project root: ./src/groovy/umig/tests/run-unit-tests.sh
 */

@Grab('org.spockframework:spock-core:2.3-groovy-4.0')
@Grab('org.postgresql:postgresql:42.7.3')

import spock.lang.Specification
import spock.lang.Unroll
import umig.repository.PhaseRepository
import java.util.UUID

class PhaseRepositoryTest extends Specification {
    
    PhaseRepository repository
    def mockSql
    
    def setup() {
        repository = new PhaseRepository()
        mockSql = Mock()
    }
    
    // ==================== MASTER PHASE TESTS ====================
    
    def "findAllMasterPhases should return all master phases with hierarchical data"() {
        given: "mock SQL returns phases with sequence, plan and team data"
        def expectedResults = [
            [phm_id: UUID.randomUUID(), phm_name: 'Phase 1', sqm_name: 'Sequence 1', plm_name: 'Plan 1', tms_name: 'Team 1'],
            [phm_id: UUID.randomUUID(), phm_name: 'Phase 2', sqm_name: 'Sequence 2', plm_name: 'Plan 2', tms_name: 'Team 2']
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findAllMasterPhases is called"
        def result = repository.findAllMasterPhases()
        
        then: "SQL query is executed with exact structure"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('phm.phm_id') &&
            query.contains('phm.sqm_id') &&
            query.contains('phm.phm_order') &&
            query.contains('phm.phm_name') &&
            query.contains('phm.phm_description') &&
            query.contains('phm.predecessor_phm_id') &&
            query.contains('FROM phases_master_phm phm') &&
            query.contains('JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id') &&
            query.contains('JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id') &&
            query.contains('LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id') &&
            query.contains('LEFT JOIN phases_master_phm pred ON phm.predecessor_phm_id = pred.phm_id') &&
            query.contains('ORDER BY plm.plm_name, sqm.sqm_order, phm.phm_order')
        }) >> expectedResults
        
        and: "returns expected data"
        result == expectedResults
    }
    
    def "findMasterPhasesBySequenceId should filter by sequence ID with specific SQL pattern"() {
        given: "a sequence ID and expected phases"
        def sequenceId = UUID.randomUUID()
        def expectedResults = [
            [phm_id: UUID.randomUUID(), phm_name: 'Phase 1', phm_order: 1],
            [phm_id: UUID.randomUUID(), phm_name: 'Phase 2', phm_order: 2]
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findMasterPhasesBySequenceId is called"
        def result = repository.findMasterPhasesBySequenceId(sequenceId)
        
        then: "SQL query validates exact structure with parameter binding"
        1 * mockSql.rows({ String query ->
            query.contains('FROM phases_master_phm phm') &&
            query.contains('JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id') &&
            query.contains('LEFT JOIN phases_master_phm pred ON phm.predecessor_phm_id = pred.phm_id') &&
            query.contains('WHERE phm.sqm_id = :sequenceId') &&
            query.contains('ORDER BY phm.phm_order')
        }, [sequenceId: sequenceId]) >> expectedResults
        
        and: "returns filtered phases"
        result == expectedResults
    }
    
    def "findMasterPhaseById should return specific phase with full join details"() {
        given: "a phase ID and expected phase data"
        def phaseId = UUID.randomUUID()
        def expectedPhase = [
            phm_id: phaseId,
            phm_name: 'Test Phase',
            sqm_name: 'Test Sequence',
            plm_name: 'Test Plan',
            tms_name: 'Test Team'
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findMasterPhaseById is called"
        def result = repository.findMasterPhaseById(phaseId)
        
        then: "SQL firstRow query validates exact structure"
        1 * mockSql.firstRow({ String query ->
            query.contains('FROM phases_master_phm phm') &&
            query.contains('JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id') &&
            query.contains('JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id') &&
            query.contains('LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id') &&
            query.contains('LEFT JOIN phases_master_phm pred ON phm.predecessor_phm_id = pred.phm_id') &&
            query.contains('WHERE phm.phm_id = :phaseId')
        }, [phaseId: phaseId]) >> expectedPhase
        
        and: "returns the phase"
        result == expectedPhase
    }
    
    def "createMasterPhase should validate sequence existence and handle order conflicts"() {
        given: "phase creation data"
        def sequenceId = UUID.randomUUID()
        def phaseData = [
            sqm_id: sequenceId,
            phm_name: 'New Phase',
            phm_description: 'Test Description',
            phm_order: 2
        ]
        def newPhaseId = UUID.randomUUID()
        def sequenceExists = [sqm_id: sequenceId]
        def maxOrder = [next_order: 3]
        def orderConflict = [phm_id: UUID.randomUUID()]
        def insertResult = [phm_id: newPhaseId]
        def expectedPhase = [phm_id: newPhaseId, phm_name: 'New Phase']
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "createMasterPhase is called"
        def result = repository.createMasterPhase(phaseData)
        
        then: "validates sequence exists"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT sqm_id FROM sequences_master_sqm') &&
            query.contains('WHERE sqm_id = :sequenceId')
        }, [sequenceId: sequenceId]) >> sequenceExists
        
        and: "checks for order conflicts"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT phm_id FROM phases_master_phm') &&
            query.contains('WHERE sqm_id = :sequenceId AND phm_order = :order')
        }, [sequenceId: sequenceId, order: 2]) >> orderConflict
        
        and: "shifts existing phases to make room"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE phases_master_phm') &&
            query.contains('SET phm_order = phm_order + 1') &&
            query.contains('WHERE sqm_id = :sequenceId AND phm_order >= :order')
        }, [sequenceId: sequenceId, order: 2]) >> 1
        
        and: "inserts new phase with exact fields"
        1 * mockSql.firstRow({ String query ->
            query.contains('INSERT INTO phases_master_phm') &&
            query.contains('sqm_id, phm_order, phm_name, phm_description') &&
            query.contains('created_by, updated_by') &&
            query.contains('RETURNING phm_id')
        }, phaseData) >> insertResult
        
        and: "calls findMasterPhaseById to return complete data"
        1 * mockSql.firstRow({ String query ->
            query.contains('WHERE phm.phm_id = :phaseId')
        }, [phaseId: newPhaseId]) >> expectedPhase
        
        and: "returns created phase"
        result == expectedPhase
    }
    
    def "createMasterPhase should auto-assign order when not provided"() {
        given: "phase data without order"
        def sequenceId = UUID.randomUUID()
        def phaseData = [
            sqm_id: sequenceId,
            phm_name: 'New Phase',
            phm_description: 'Test Description'
        ]
        def sequenceExists = [sqm_id: sequenceId]
        def maxOrder = [next_order: 3]
        def noOrderConflict = null
        def newPhaseId = UUID.randomUUID()
        def insertResult = [phm_id: newPhaseId]
        def expectedPhase = [phm_id: newPhaseId, phm_name: 'New Phase']
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "createMasterPhase is called"
        def result = repository.createMasterPhase(phaseData)
        
        then: "validates sequence exists"
        1 * mockSql.firstRow(_, [sequenceId: sequenceId]) >> sequenceExists
        
        and: "auto-assigns next order"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT COALESCE(MAX(phm_order), 0) + 1 as next_order') &&
            query.contains('FROM phases_master_phm') &&
            query.contains('WHERE sqm_id = :sequenceId')
        }, [sequenceId: sequenceId]) >> maxOrder
        
        and: "checks for order conflicts with auto-assigned order"
        1 * mockSql.firstRow(_, [sequenceId: sequenceId, order: 3]) >> noOrderConflict
        
        and: "inserts phase with auto-assigned order"
        1 * mockSql.firstRow(_, { Map params ->
            params.phm_order == 3
        }) >> insertResult
        
        and: "returns created phase data"
        1 * mockSql.firstRow(_, [phaseId: newPhaseId]) >> expectedPhase
        result == expectedPhase
    }
    
    def "createMasterPhase should detect circular dependencies"() {
        given: "phase data with predecessor that would create cycle"
        def sequenceId = UUID.randomUUID()
        def predecessorId = UUID.randomUUID()
        def phaseData = [
            sqm_id: sequenceId,
            phm_name: 'New Phase',
            predecessor_phm_id: predecessorId
        ]
        def sequenceExists = [sqm_id: sequenceId]
        def circularDependency = [has_cycle: true]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "createMasterPhase is called"
        repository.createMasterPhase(phaseData)
        
        then: "validates sequence exists"
        1 * mockSql.firstRow(_, [sequenceId: sequenceId]) >> sequenceExists
        
        and: "checks for circular dependency using recursive CTE"
        1 * mockSql.firstRow({ String query ->
            query.contains('WITH RECURSIVE dependency_chain AS') &&
            query.contains('SELECT phm_id, predecessor_phm_id, 1 as depth, ARRAY[phm_id] as path') &&
            query.contains('FROM phases_master_phm') &&
            query.contains('WHERE phm_id = :candidatePredecessorId') &&
            query.contains('UNION ALL') &&
            query.contains('JOIN dependency_chain dc ON p.phm_id = dc.predecessor_phm_id') &&
            query.contains('WHERE p.phm_id != ALL(dc.path) AND dc.depth < 100') &&
            query.contains('SELECT EXISTS') &&
            query.contains('WHERE :targetPhaseId = ANY(path)')
        }, [candidatePredecessorId: predecessorId, sequenceId: sequenceId, targetPhaseId: null]) >> circularDependency
        
        and: "throws IllegalArgumentException for circular dependency"
        thrown(IllegalArgumentException)
    }
    
    def "updateMasterPhase should build dynamic update query"() {
        given: "phase update data"
        def phaseId = UUID.randomUUID()
        def sequenceId = UUID.randomUUID()
        def updateData = [
            phm_name: 'Updated Phase',
            phm_description: 'Updated Description'
        ]
        def currentPhase = [sqm_id: sequenceId, predecessor_phm_id: null]
        def updatedPhase = [phm_id: phaseId, phm_name: 'Updated Phase']
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateMasterPhase is called"
        def result = repository.updateMasterPhase(phaseId, updateData)
        
        then: "gets current phase data"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT sqm_id, predecessor_phm_id FROM phases_master_phm') &&
            query.contains('WHERE phm_id = :phaseId')
        }, [phaseId: phaseId]) >> currentPhase
        
        and: "executes dynamic update with only provided fields"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE phases_master_phm SET') &&
            query.contains('phm_name = :phm_name') &&
            query.contains('phm_description = :phm_description') &&
            query.contains("updated_by = 'system'") &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains('WHERE phm_id = :phaseId')
        }, { Map params ->
            params.phaseId == phaseId &&
            params.phm_name == 'Updated Phase' &&
            params.phm_description == 'Updated Description'
        }) >> 1
        
        and: "returns updated phase data"
        1 * mockSql.firstRow(_, [phaseId: phaseId]) >> updatedPhase
        result == updatedPhase
    }
    
    def "deleteMasterPhase should check all dependencies before deletion"() {
        given: "phase ID to delete"
        def phaseId = UUID.randomUUID()
        def noInstances = [instance_count: 0L]
        def noReferences = [ref_count: 0L]
        def noSteps = [step_count: 0L]
        def noControls = [control_count: 0L]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "deleteMasterPhase is called"
        def result = repository.deleteMasterPhase(phaseId)
        
        then: "checks for phase instances"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT COUNT(*) as instance_count') &&
            query.contains('FROM phases_instance_phi') &&
            query.contains('WHERE phm_id = :phaseId')
        }, [phaseId: phaseId]) >> noInstances
        
        and: "checks for predecessor references"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT COUNT(*) as ref_count') &&
            query.contains('FROM phases_master_phm') &&
            query.contains('WHERE predecessor_phm_id = :phaseId')
        }, [phaseId: phaseId]) >> noReferences
        
        and: "checks for steps"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT COUNT(*) as step_count') &&
            query.contains('FROM steps_master_stm') &&
            query.contains('WHERE phm_id = :phaseId')
        }, [phaseId: phaseId]) >> noSteps
        
        and: "checks for controls"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT COUNT(*) as control_count') &&
            query.contains('FROM controls_master_ctm') &&
            query.contains('WHERE phm_id = :phaseId')
        }, [phaseId: phaseId]) >> noControls
        
        and: "deletes the phase"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('DELETE FROM phases_master_phm') &&
            query.contains('WHERE phm_id = :phaseId')
        }, [phaseId: phaseId]) >> 1
        
        and: "returns success"
        result == true
    }
    
    def "deleteMasterPhase should return false when phase has instances"() {
        given: "phase ID with instances"
        def phaseId = UUID.randomUUID()
        def hasInstances = [instance_count: 3L]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "deleteMasterPhase is called"
        def result = repository.deleteMasterPhase(phaseId)
        
        then: "checks for instances and finds some"
        1 * mockSql.firstRow(_, [phaseId: phaseId]) >> hasInstances
        
        and: "returns false without further checks"
        0 * mockSql.executeUpdate(_, _)
        result == false
    }
    
    // ==================== INSTANCE PHASE TESTS ====================
    
    def "findPhaseInstances should use hierarchical filtering with type safety"() {
        given: "filters with multiple criteria"
        def filters = [
            migrationId: UUID.randomUUID().toString(),
            iterationId: UUID.randomUUID().toString(),
            planInstanceId: UUID.randomUUID().toString(),
            sequenceInstanceId: UUID.randomUUID().toString(),
            teamId: '123',
            statusId: '456'
        ]
        def expectedResults = [
            [phi_id: UUID.randomUUID(), phi_name: 'Instance 1'],
            [phi_id: UUID.randomUUID(), phi_name: 'Instance 2']
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findPhaseInstances is called"
        def result = repository.findPhaseInstances(filters)
        
        then: "SQL query validates exact hierarchical joins and filters"
        1 * mockSql.rows({ String query ->
            // Validate main SELECT structure
            query.contains('SELECT') &&
            query.contains('phi.phi_id') &&
            query.contains('phi.sqi_id') &&
            query.contains('phi.phm_id') &&
            query.contains('phi.phi_status') &&
            query.contains('phi.phi_order') &&
            // Validate hierarchical joins
            query.contains('FROM phases_instance_phi phi') &&
            query.contains('JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id') &&
            query.contains('JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id') &&
            query.contains('JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id') &&
            query.contains('JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id') &&
            query.contains('JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id') &&
            query.contains('JOIN iterations_ite itr ON pli.ite_id = itr.ite_id') &&
            query.contains('JOIN migrations_mig mig ON itr.mig_id = mig.mig_id') &&
            query.contains('LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id') &&
            query.contains('LEFT JOIN status_sts sts ON sts.sts_name = phi.phi_status AND sts.sts_type = \'Phase\'') &&
            query.contains('LEFT JOIN phases_instance_phi pred ON phi.predecessor_phi_id = pred.phi_id') &&
            // Validate WHERE conditions
            query.contains('WHERE 1=1') &&
            query.contains('AND mig.mig_id = :migrationId') &&
            query.contains('AND pli.ite_id = :iterationId') &&
            query.contains('AND sqi.pli_id = :planInstanceId') &&
            query.contains('AND phi.sqi_id = :sequenceInstanceId') &&
            query.contains('AND plm.tms_id = :teamId') &&
            query.contains('AND sts.sts_id = :statusId') &&
            query.contains('ORDER BY phi.phi_order, phi.created_at')
        }, { Map params ->
            // Validate parameter types (ADR-031)
            params.migrationId instanceof UUID &&
            params.iterationId instanceof UUID &&
            params.planInstanceId instanceof UUID &&
            params.sequenceInstanceId instanceof UUID &&
            params.teamId instanceof Integer &&
            params.statusId instanceof Integer
        }) >> expectedResults
        
        and: "returns filtered results"
        result == expectedResults
    }
    
    def "findPhaseInstanceById should return instance with full hierarchical data"() {
        given: "instance ID and expected full data"
        def instanceId = UUID.randomUUID()
        def expectedInstance = [
            phi_id: instanceId,
            phi_name: 'Test Instance',
            master_name: 'Master Phase',
            sqi_name: 'Sequence Instance',
            pli_name: 'Plan Instance',
            itr_name: 'Iteration'
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findPhaseInstanceById is called"
        def result = repository.findPhaseInstanceById(instanceId)
        
        then: "SQL firstRow validates complete hierarchical query"
        1 * mockSql.firstRow({ String query ->
            query.contains('FROM phases_instance_phi phi') &&
            query.contains('JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id') &&
            query.contains('JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id') &&
            query.contains('JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id') &&
            query.contains('JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id') &&
            query.contains('WHERE phi.phi_id = :instanceId')
        }, [instanceId: instanceId]) >> expectedInstance
        
        and: "returns complete instance data"
        result == expectedInstance
    }
    
    def "createPhaseInstance should implement full attribute instantiation with transaction"() {
        given: "instance creation parameters"
        def masterPhaseId = UUID.randomUUID()
        def sequenceInstanceId = UUID.randomUUID()
        def overrides = [phi_status: 'IN_PROGRESS', phi_name: 'Custom Name']
        def sequenceInstance = [sqi_id: sequenceInstanceId]
        def masterPhase = [
            phm_id: masterPhaseId,
            phm_name: 'Master Phase',
            phm_description: 'Master Description',
            phm_order: 1,
            predecessor_phm_id: null
        ]
        def newInstanceId = UUID.randomUUID()
        def insertResult = [phi_id: newInstanceId]
        def expectedInstance = [phi_id: newInstanceId, phi_name: 'Custom Name']
        
        and: "DatabaseUtil.withSql is mocked with transaction support"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "createPhaseInstance is called"
        def result = repository.createPhaseInstance(masterPhaseId, sequenceInstanceId, overrides)
        
        then: "verifies sequence instance exists"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT sqi_id FROM sequences_instance_sqi') &&
            query.contains('WHERE sqi_id = :sequenceInstanceId')
        }, [sequenceInstanceId: sequenceInstanceId]) >> sequenceInstance
        
        and: "gets master phase data"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT phm_id, phm_name, phm_description, phm_order, predecessor_phm_id') &&
            query.contains('FROM phases_master_phm') &&
            query.contains('WHERE phm_id = :masterPhaseId')
        }, [masterPhaseId: masterPhaseId]) >> masterPhase
        
        and: "inserts phase instance with attribute instantiation"
        1 * mockSql.firstRow({ String query ->
            query.contains('INSERT INTO phases_instance_phi') &&
            query.contains('sqi_id, phm_id, phi_status, phi_name, phi_description') &&
            query.contains('phi_order, predecessor_phi_id, created_by, updated_by') &&
            query.contains('RETURNING phi_id')
        }, { Map params ->
            params.sqi_id == sequenceInstanceId &&
            params.phm_id == masterPhaseId &&
            params.phi_status == 'IN_PROGRESS' &&
            params.phi_name == 'Custom Name' &&
            params.phi_description == 'Master Description' &&
            params.phi_order == 1
        }) >> insertResult
        
        and: "returns complete instance data"
        1 * mockSql.firstRow(_, [instanceId: newInstanceId]) >> expectedInstance
        result == expectedInstance
    }
    
    def "createPhaseInstance should handle predecessor mapping"() {
        given: "instance creation with master predecessor"
        def masterPhaseId = UUID.randomUUID()
        def sequenceInstanceId = UUID.randomUUID()
        def predecessorMasterId = UUID.randomUUID()
        def predecessorInstanceId = UUID.randomUUID()
        def sequenceInstance = [sqi_id: sequenceInstanceId]
        def masterPhase = [
            phm_id: masterPhaseId,
            phm_name: 'Master Phase',
            phm_description: 'Master Description',
            phm_order: 2,
            predecessor_phm_id: predecessorMasterId
        ]
        def predecessorInstance = [phi_id: predecessorInstanceId]
        def newInstanceId = UUID.randomUUID()
        def insertResult = [phi_id: newInstanceId]
        def expectedInstance = [phi_id: newInstanceId, phi_name: 'Master Phase']
        
        and: "DatabaseUtil.withSql is mocked with transaction support"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "createPhaseInstance is called"
        def result = repository.createPhaseInstance(masterPhaseId, sequenceInstanceId)
        
        then: "verifies sequence instance exists"
        1 * mockSql.firstRow(_, [sequenceInstanceId: sequenceInstanceId]) >> sequenceInstance
        
        and: "gets master phase data with predecessor"
        1 * mockSql.firstRow(_, [masterPhaseId: masterPhaseId]) >> masterPhase
        
        and: "finds corresponding predecessor instance"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT phi.phi_id') &&
            query.contains('FROM phases_instance_phi phi') &&
            query.contains('WHERE phi.phm_id = :predecessorMasterId') &&
            query.contains('AND phi.sqi_id = :sequenceInstanceId')
        }, [predecessorMasterId: predecessorMasterId, sequenceInstanceId: sequenceInstanceId]) >> predecessorInstance
        
        and: "inserts with mapped predecessor"
        1 * mockSql.firstRow(_, { Map params ->
            params.predecessor_phi_id == predecessorInstanceId
        }) >> insertResult
        
        and: "returns instance data"
        1 * mockSql.firstRow(_, [instanceId: newInstanceId]) >> expectedInstance
        result == expectedInstance
    }
    
    def "updatePhaseInstance should build dynamic update query"() {
        given: "instance update data"
        def instanceId = UUID.randomUUID()
        def updates = [
            phi_name: 'Updated Instance',
            phi_status: 'COMPLETED',
            phi_end_time: new Date()
        ]
        def instanceExists = [phi_id: instanceId]
        def updatedInstance = [phi_id: instanceId, phi_name: 'Updated Instance']
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updatePhaseInstance is called"
        def result = repository.updatePhaseInstance(instanceId, updates)
        
        then: "checks if instance exists"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT phi_id FROM phases_instance_phi') &&
            query.contains('WHERE phi_id = :instanceId')
        }, [instanceId: instanceId]) >> instanceExists
        
        and: "executes dynamic update with only provided fields"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE phases_instance_phi SET') &&
            query.contains('phi_name = :phi_name') &&
            query.contains('phi_status = :phi_status') &&
            query.contains('phi_end_time = :phi_end_time') &&
            query.contains("updated_by = 'system'") &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains('WHERE phi_id = :instanceId')
        }, { Map params ->
            params.instanceId == instanceId &&
            params.phi_name == 'Updated Instance' &&
            params.phi_status == 'COMPLETED'
        }) >> 1
        
        and: "returns updated instance data"
        1 * mockSql.firstRow(_, [instanceId: instanceId]) >> updatedInstance
        result == updatedInstance
    }
    
    def "deletePhaseInstance should check for step dependencies"() {
        given: "instance ID to delete"
        def instanceId = UUID.randomUUID()
        def noSteps = [step_count: 0L]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "deletePhaseInstance is called"
        def result = repository.deletePhaseInstance(instanceId)
        
        then: "checks for step instances"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT COUNT(*) as step_count') &&
            query.contains('FROM steps_instance_sti') &&
            query.contains('WHERE phi_id = :instanceId')
        }, [instanceId: instanceId]) >> noSteps
        
        and: "deletes the instance"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('DELETE FROM phases_instance_phi') &&
            query.contains('WHERE phi_id = :instanceId')
        }, [instanceId: instanceId]) >> 1
        
        and: "returns success"
        result == true
    }
    
    // ==================== CONTROL POINT TESTS ====================
    
    def "findControlPoints should handle master phase queries"() {
        given: "master phase ID"
        def phaseId = UUID.randomUUID()
        def isMasterPhase = [phm_id: phaseId]
        def expectedControls = [
            [ctm_id: UUID.randomUUID(), ctm_name: 'Control 1', control_type: 'master'],
            [ctm_id: UUID.randomUUID(), ctm_name: 'Control 2', control_type: 'master']
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findControlPoints is called"
        def result = repository.findControlPoints(phaseId)
        
        then: "checks if it's a master phase"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT phm_id FROM phases_master_phm') &&
            query.contains('WHERE phm_id = :phaseId')
        }, [phaseId: phaseId]) >> isMasterPhase
        
        and: "returns master controls"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('ctm.ctm_id') &&
            query.contains('ctm.phm_id') &&
            query.contains('ctm.ctm_order') &&
            query.contains('ctm.ctm_name') &&
            query.contains('ctm.ctm_is_critical') &&
            query.contains("'master' as control_type") &&
            query.contains('FROM controls_master_ctm ctm') &&
            query.contains('WHERE ctm.phm_id = :phaseId') &&
            query.contains('ORDER BY ctm.ctm_order')
        }, [phaseId: phaseId]) >> expectedControls
        
        and: "returns master control data"
        result == expectedControls
    }
    
    def "findControlPoints should handle instance phase queries"() {
        given: "instance phase ID"
        def phaseId = UUID.randomUUID()
        def notMasterPhase = null
        def isInstancePhase = [phi_id: phaseId]
        def expectedControls = [
            [cti_id: UUID.randomUUID(), cti_name: 'Control Instance 1', control_type: 'instance'],
            [cti_id: UUID.randomUUID(), cti_name: 'Control Instance 2', control_type: 'instance']
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findControlPoints is called"
        def result = repository.findControlPoints(phaseId)
        
        then: "checks if it's a master phase"
        1 * mockSql.firstRow(_, [phaseId: phaseId]) >> notMasterPhase
        
        and: "checks if it's an instance phase"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT phi_id FROM phases_instance_phi') &&
            query.contains('WHERE phi_id = :phaseId')
        }, [phaseId: phaseId]) >> isInstancePhase
        
        and: "returns instance controls"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('cti.cti_id') &&
            query.contains('cti.sti_id') &&
            query.contains('cti.ctm_id') &&
            query.contains('cti.cti_status') &&
            query.contains('cti.cti_is_critical') &&
            query.contains("'instance' as control_type") &&
            query.contains('FROM controls_instance_cti cti') &&
            query.contains('JOIN controls_master_ctm ctm ON cti.ctm_id = ctm.ctm_id') &&
            query.contains('JOIN steps_instance_sti sti ON cti.sti_id = sti.sti_id') &&
            query.contains('WHERE sti.phi_id = :phaseId') &&
            query.contains('ORDER BY cti.cti_order')
        }, [phaseId: phaseId]) >> expectedControls
        
        and: "returns instance control data"
        result == expectedControls
    }
    
    def "validateControlPoints should calculate comprehensive validation results"() {
        given: "phase instance ID"
        def phaseId = UUID.randomUUID()
        def controls = [
            [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: true, cti_name: 'Critical Control 1'],
            [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: false, cti_name: 'Normal Control 1'],
            [cti_id: UUID.randomUUID(), cti_status: 'PENDING', cti_is_critical: true, cti_name: 'Critical Control 2'],
            [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: false, cti_name: 'Normal Control 2']
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "validateControlPoints is called"
        def result = repository.validateControlPoints(phaseId)
        
        then: "queries control instances with status and criticality"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('cti.cti_id') &&
            query.contains('cti.cti_status') &&
            query.contains('cti.cti_is_critical') &&
            query.contains('cti.cti_name') &&
            query.contains('FROM controls_instance_cti cti') &&
            query.contains('JOIN controls_master_ctm ctm ON cti.ctm_id = ctm.ctm_id') &&
            query.contains('JOIN steps_instance_sti sti ON cti.sti_id = sti.sti_id') &&
            query.contains('WHERE sti.phi_id = :phaseId')
        }, [phaseId: phaseId]) >> controls
        
        and: "returns comprehensive validation results"
        result.total_controls == 4
        result.passed_controls == 2
        result.failed_controls == 1
        result.pending_controls == 1
        result.critical_controls == 2
        result.failed_critical_controls == 0
        result.all_controls_passed == false
        result.no_critical_failures == true
        result.can_proceed == false
        result.failed_critical_names == []
    }
    
    def "updateControlPoint should handle status updates with conditional timestamps"() {
        given: "control update parameters"
        def controlId = UUID.randomUUID()
        def status = [
            cti_status: 'PASSED',
            usr_id_it_validator: 123,
            usr_id_biz_validator: 456
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateControlPoint is called"
        def result = repository.updateControlPoint(controlId, status)
        
        then: "executes update with conditional timestamp logic"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE controls_instance_cti SET') &&
            query.contains('cti_status = :cti_status') &&
            query.contains('cti_validated_at = CURRENT_TIMESTAMP') &&
            query.contains('usr_id_it_validator = :usr_id_it_validator') &&
            query.contains('usr_id_biz_validator = :usr_id_biz_validator') &&
            query.contains("updated_by = 'system'") &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains('WHERE cti_id = :controlId')
        }, { Map params ->
            params.controlId == controlId &&
            params.cti_status == 'PASSED' &&
            params.usr_id_it_validator == 123 &&
            params.usr_id_biz_validator == 456
        }) >> 1
        
        and: "returns success"
        result == true
    }
    
    def "overrideControl should update control to PASSED with override tracking"() {
        given: "control override parameters"
        def controlId = UUID.randomUUID()
        def reason = 'Emergency override'
        def overrideBy = 'admin'
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "overrideControl is called"
        def result = repository.overrideControl(controlId, reason, overrideBy)
        
        then: "executes override update"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE controls_instance_cti') &&
            query.contains("SET cti_status = 'PASSED'") &&
            query.contains('cti_validated_at = CURRENT_TIMESTAMP') &&
            query.contains('updated_by = :overrideBy') &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains('WHERE cti_id = :controlId')
        }, [controlId: controlId, overrideBy: overrideBy]) >> 1
        
        and: "returns success"
        result == true
    }
    
    // ==================== ORDERING TESTS ====================
    
    def "updateMasterPhaseOrder should update individual phase order"() {
        given: "phase ID and new order"
        def phaseId = UUID.randomUUID()
        def newOrder = 5
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateMasterPhaseOrder is called"
        def result = repository.updateMasterPhaseOrder(phaseId, newOrder)
        
        then: "executes update with exact parameters"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE phases_master_phm') &&
            query.contains('SET phm_order = :newOrder') &&
            query.contains("updated_by = 'system'") &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains('WHERE phm_id = :phaseId')
        }, [phaseId: phaseId, newOrder: newOrder]) >> 1
        
        and: "returns success"
        result == true
    }
    
    def "updateMasterPhaseOrder should return false when no rows updated"() {
        given: "phase ID and new order"
        def phaseId = UUID.randomUUID()
        def newOrder = 5
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateMasterPhaseOrder is called"
        def result = repository.updateMasterPhaseOrder(phaseId, newOrder)
        
        then: "executes update but affects no rows"
        1 * mockSql.executeUpdate(_, _) >> 0
        
        and: "returns false"
        result == false
    }
    
    def "updatePhaseInstanceOrder should update individual instance order"() {
        given: "instance ID and new order"
        def phaseId = UUID.randomUUID()
        def newOrder = 3
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updatePhaseInstanceOrder is called"
        def result = repository.updatePhaseInstanceOrder(phaseId, newOrder)
        
        then: "executes update with exact parameters"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE phases_instance_phi') &&
            query.contains('SET phi_order = :newOrder') &&
            query.contains("updated_by = 'system'") &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains('WHERE phi_id = :phaseId')
        }, [phaseId: phaseId, newOrder: newOrder]) >> 1
        
        and: "returns success"
        result == true
    }
    
    def "updatePhaseInstanceOrder should return false when no rows updated"() {
        given: "instance ID and new order"
        def phaseId = UUID.randomUUID()
        def newOrder = 3
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updatePhaseInstanceOrder is called"
        def result = repository.updatePhaseInstanceOrder(phaseId, newOrder)
        
        then: "executes update but affects no rows"
        1 * mockSql.executeUpdate(_, _) >> 0
        
        and: "returns false"
        result == false
    }
    
    def "reorderMasterPhases should use transaction for bulk updates"() {
        given: "sequence and phase order map"
        def sequenceId = UUID.randomUUID()
        def phaseOrderMap = [
            (UUID.randomUUID()): 1,
            (UUID.randomUUID()): 2,
            (UUID.randomUUID()): 3
        ]
        
        and: "DatabaseUtil.withSql is mocked with transaction support"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "reorderMasterPhases is called"
        def result = repository.reorderMasterPhases(sequenceId, phaseOrderMap)
        
        then: "executes update for each phase in transaction"
        3 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE phases_master_phm') &&
            query.contains('SET phm_order = :newOrder') &&
            query.contains("updated_by = 'system'") &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains('WHERE phm_id = :phaseId AND sqm_id = :sequenceId')
        }, { Map params ->
            params.sequenceId == sequenceId &&
            phaseOrderMap.containsKey(params.phaseId) &&
            params.newOrder == phaseOrderMap[params.phaseId]
        }) >> 1
        
        and: "returns success"
        result == true
    }
    
    def "reorderPhaseInstances should use transaction for bulk updates"() {
        given: "sequence instance and phase order map"
        def sequenceInstanceId = UUID.randomUUID()
        def phaseOrderMap = [
            (UUID.randomUUID()): 1,
            (UUID.randomUUID()): 2
        ]
        
        and: "DatabaseUtil.withSql is mocked with transaction support"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "reorderPhaseInstances is called"
        def result = repository.reorderPhaseInstances(sequenceInstanceId, phaseOrderMap)
        
        then: "executes update for each instance in transaction"
        2 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE phases_instance_phi') &&
            query.contains('SET phi_order = :newOrder') &&
            query.contains("updated_by = 'system'") &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains('WHERE phi_id = :phaseId AND sqi_id = :sequenceInstanceId')
        }, { Map params ->
            params.sequenceInstanceId == sequenceInstanceId &&
            phaseOrderMap.containsKey(params.phaseId) &&
            params.newOrder == phaseOrderMap[params.phaseId]
        }) >> 1
        
        and: "returns success"
        result == true
    }
    
    def "normalizePhaseOrder should handle master sequences"() {
        given: "master sequence ID"
        def sequenceId = UUID.randomUUID()
        def isMasterSequence = [sqm_id: sequenceId]
        def phases = [
            [phm_id: UUID.randomUUID()],
            [phm_id: UUID.randomUUID()],
            [phm_id: UUID.randomUUID()]
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "normalizePhaseOrder is called"
        def result = repository.normalizePhaseOrder(sequenceId)
        
        then: "checks if it's a master sequence"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT sqm_id FROM sequences_master_sqm') &&
            query.contains('WHERE sqm_id = :sequenceId')
        }, [sequenceId: sequenceId]) >> isMasterSequence
        
        and: "gets phases ordered by current order and creation time"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT phm_id') &&
            query.contains('FROM phases_master_phm') &&
            query.contains('WHERE sqm_id = :sequenceId') &&
            query.contains('ORDER BY phm_order, created_at')
        }, [sequenceId: sequenceId]) >> phases
        
        and: "updates each phase with consecutive order"
        3 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE phases_master_phm') &&
            query.contains('SET phm_order = :newOrder') &&
            query.contains("updated_by = 'system'") &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains('WHERE phm_id = :phaseId')
        }, { Map params ->
            phases.collect { it.phm_id }.contains(params.phaseId) &&
            params.newOrder in [1, 2, 3]
        }) >> 1
        
        and: "returns success"
        result == true
    }
    
    def "normalizePhaseOrder should handle instance sequences"() {
        given: "sequence instance ID"
        def sequenceId = UUID.randomUUID()
        def notMasterSequence = null
        def isInstanceSequence = [sqi_id: sequenceId]
        def phases = [
            [phi_id: UUID.randomUUID()],
            [phi_id: UUID.randomUUID()]
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "normalizePhaseOrder is called"
        def result = repository.normalizePhaseOrder(sequenceId)
        
        then: "checks if it's a master sequence"
        1 * mockSql.firstRow(_, [sequenceId: sequenceId]) >> notMasterSequence
        
        and: "checks if it's an instance sequence"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT sqi_id FROM sequences_instance_sqi') &&
            query.contains('WHERE sqi_id = :sequenceId')
        }, [sequenceId: sequenceId]) >> isInstanceSequence
        
        and: "gets instance phases ordered by current order and creation time"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT phi_id') &&
            query.contains('FROM phases_instance_phi') &&
            query.contains('WHERE sqi_id = :sequenceId') &&
            query.contains('ORDER BY phi_order, created_at')
        }, [sequenceId: sequenceId]) >> phases
        
        and: "updates each instance with consecutive order"
        2 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE phases_instance_phi') &&
            query.contains('SET phi_order = :newOrder') &&
            query.contains("updated_by = 'system'") &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            query.contains('WHERE phi_id = :phaseId')
        }, { Map params ->
            phases.collect { it.phi_id }.contains(params.phaseId) &&
            params.newOrder in [1, 2]
        }) >> 1
        
        and: "returns success"
        result == true
    }
    
    // ==================== PROGRESS TESTS ====================
    
    def "calculatePhaseProgress should handle step completion statistics"() {
        given: "phase instance ID"
        def phaseId = UUID.randomUUID()
        def stats = [
            total_steps: 10,
            completed_steps: 6,
            skipped_steps: 2
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "calculatePhaseProgress is called"
        def result = repository.calculatePhaseProgress(phaseId)
        
        then: "queries step completion statistics"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT') &&
            query.contains('COUNT(*) as total_steps') &&
            query.contains("COUNT(CASE WHEN sti.sti_status = 'COMPLETED' THEN 1 END) as completed_steps") &&
            query.contains("COUNT(CASE WHEN sti.sti_status = 'SKIPPED' THEN 1 END) as skipped_steps") &&
            query.contains('FROM steps_instance_sti sti') &&
            query.contains('WHERE sti.phi_id = :phaseId')
        }, [phaseId: phaseId]) >> stats
        
        and: "calculates progress including skipped steps"
        result == 80.0 // (6 completed + 2 skipped) / 10 total = 80%
    }
    
    @Unroll
    def "calculatePhaseProgress should return #expected for completed=#completed, skipped=#skipped, total=#total"() {
        given: "phase statistics"
        def phaseId = UUID.randomUUID()
        def stats = [
            total_steps: total,
            completed_steps: completed,
            skipped_steps: skipped
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow(_, _) >> stats
        
        when: "calculatePhaseProgress is called"
        def result = repository.calculatePhaseProgress(phaseId)
        
        then: "returns correct percentage"
        result == expected
        
        where:
        completed | skipped | total | expected
        0         | 0       | 0     | 0.0
        5         | 0       | 10    | 50.0
        3         | 2       | 10    | 50.0
        10        | 0       | 10    | 100.0
        8         | 2       | 10    | 100.0
    }
    
    // ==================== UTILITY METHOD TESTS ====================
    
    def "hasPhaseInstances should validate instance existence with count query"() {
        given: "master phase ID"
        def masterPhaseId = UUID.randomUUID()
        def instanceCount = [instance_count: 3L]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "hasPhaseInstances is called"
        def result = repository.hasPhaseInstances(masterPhaseId)
        
        then: "SQL firstRow validates exact count query structure"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT COUNT(*) as instance_count') &&
            query.contains('FROM phases_instance_phi') &&
            query.contains('WHERE phm_id = :masterPhaseId')
        }, [masterPhaseId: masterPhaseId]) >> instanceCount
        
        and: "returns true for existing instances"
        result == true
    }
    
    @Unroll
    def "hasPhaseInstances should return #expected for count #count"() {
        given: "master phase ID and count result"
        def masterPhaseId = UUID.randomUUID()
        def instanceCount = [instance_count: count]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow(_, _) >> instanceCount
        
        when: "hasPhaseInstances is called"
        def result = repository.hasPhaseInstances(masterPhaseId)
        
        then: "returns correct boolean value"
        result == expected
        
        where:
        count | expected
        0L    | false
        1L    | true
        5L    | true
        null  | false
    }
    
    def "getPhaseStatistics should handle master sequences"() {
        given: "master sequence ID"
        def sequenceId = UUID.randomUUID()
        def isMasterSequence = [sqm_id: sequenceId]
        def stats = [
            total_phases: 5,
            first_created: new Date(),
            last_updated: new Date()
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "getPhaseStatistics is called"
        def result = repository.getPhaseStatistics(sequenceId)
        
        then: "checks if it's a master sequence"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT sqm_id FROM sequences_master_sqm') &&
            query.contains('WHERE sqm_id = :sequenceId')
        }, [sequenceId: sequenceId]) >> isMasterSequence
        
        and: "gets master phase statistics"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT') &&
            query.contains('COUNT(*) as total_phases') &&
            query.contains('MIN(created_at) as first_created') &&
            query.contains('MAX(updated_at) as last_updated') &&
            query.contains('FROM phases_master_phm') &&
            query.contains('WHERE sqm_id = :sequenceId')
        }, [sequenceId: sequenceId]) >> stats
        
        and: "returns master statistics"
        result.total_phases == 5
        result.sequence_type == 'master'
        result.first_created == stats.first_created
        result.last_updated == stats.last_updated
    }
    
    def "getPhaseStatistics should handle instance sequences with completion rate"() {
        given: "sequence instance ID"
        def sequenceId = UUID.randomUUID()
        def notMasterSequence = null
        def isInstanceSequence = [sqi_id: sequenceId]
        def stats = [
            total_phases: 10,
            not_started: 3,
            in_progress: 4,
            completed: 3,
            first_created: new Date(),
            last_updated: new Date()
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "getPhaseStatistics is called"
        def result = repository.getPhaseStatistics(sequenceId)
        
        then: "checks if it's a master sequence"
        1 * mockSql.firstRow(_, [sequenceId: sequenceId]) >> notMasterSequence
        
        and: "checks if it's an instance sequence"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT sqi_id FROM sequences_instance_sqi') &&
            query.contains('WHERE sqi_id = :sequenceId')
        }, [sequenceId: sequenceId]) >> isInstanceSequence
        
        and: "gets instance phase statistics with status breakdown"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT') &&
            query.contains('COUNT(*) as total_phases') &&
            query.contains("COUNT(CASE WHEN phi_status = 'NOT_STARTED' THEN 1 END) as not_started") &&
            query.contains("COUNT(CASE WHEN phi_status = 'IN_PROGRESS' THEN 1 END) as in_progress") &&
            query.contains("COUNT(CASE WHEN phi_status = 'COMPLETED' THEN 1 END) as completed") &&
            query.contains('FROM phases_instance_phi') &&
            query.contains('WHERE sqi_id = :sequenceId')
        }, [sequenceId: sequenceId]) >> stats
        
        and: "returns instance statistics with calculated completion rate"
        result.total_phases == 10
        result.not_started == 3
        result.in_progress == 4
        result.completed == 3
        result.completion_rate == 30.0 // 3/10 * 100
        result.sequence_type == 'instance'
    }
    
    // ==================== ERROR HANDLING TESTS ====================
    
    def "createMasterPhase should return null for non-existent sequence"() {
        given: "phase data with non-existent sequence"
        def sequenceId = UUID.randomUUID()
        def phaseData = [sqm_id: sequenceId, phm_name: 'Test Phase']
        def sequenceNotFound = null
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "createMasterPhase is called"
        def result = repository.createMasterPhase(phaseData)
        
        then: "validates sequence and finds none"
        1 * mockSql.firstRow(_, [sequenceId: sequenceId]) >> sequenceNotFound
        
        and: "returns null without further processing"
        0 * mockSql.executeUpdate(_, _)
        result == null
    }
    
    def "updateMasterPhase should return null for non-existent phase"() {
        given: "non-existent phase ID"
        def phaseId = UUID.randomUUID()
        def updateData = [phm_name: 'Updated Name']
        def phaseNotFound = null
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateMasterPhase is called"
        def result = repository.updateMasterPhase(phaseId, updateData)
        
        then: "checks for existing phase and finds none"
        1 * mockSql.firstRow(_, [phaseId: phaseId]) >> phaseNotFound
        
        and: "returns null without further processing"
        0 * mockSql.executeUpdate(_, _)
        result == null
    }
    
    def "updateMasterPhase should return existing data when no updates provided"() {
        given: "phase ID with empty updates"
        def phaseId = UUID.randomUUID()
        def currentPhase = [sqm_id: UUID.randomUUID(), predecessor_phm_id: null]
        def existingPhase = [phm_id: phaseId, phm_name: 'Existing Phase']
        def emptyUpdates = [:]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateMasterPhase is called with empty updates"
        def result = repository.updateMasterPhase(phaseId, emptyUpdates)
        
        then: "gets current phase data"
        1 * mockSql.firstRow(_, [phaseId: phaseId]) >> currentPhase
        
        and: "skips update and returns existing data"
        0 * mockSql.executeUpdate(_, _)
        1 * mockSql.firstRow(_, [phaseId: phaseId]) >> existingPhase
        result == existingPhase
    }
    
    def "createPhaseInstance should return null for non-existent sequence instance"() {
        given: "instance creation with non-existent sequence instance"
        def masterPhaseId = UUID.randomUUID()
        def sequenceInstanceId = UUID.randomUUID()
        def sequenceNotFound = null
        
        and: "DatabaseUtil.withSql is mocked with transaction support"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "createPhaseInstance is called"
        def result = repository.createPhaseInstance(masterPhaseId, sequenceInstanceId)
        
        then: "checks for sequence instance and finds none"
        1 * mockSql.firstRow(_, [sequenceInstanceId: sequenceInstanceId]) >> sequenceNotFound
        
        and: "returns null without further processing"
        0 * mockSql.firstRow(_, [masterPhaseId: masterPhaseId])
        result == null
    }
    
    def "updatePhaseInstance should return null for non-existent instance"() {
        given: "non-existent instance ID"
        def instanceId = UUID.randomUUID()
        def updates = [phi_name: 'Updated Name']
        def instanceNotFound = null
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updatePhaseInstance is called"
        def result = repository.updatePhaseInstance(instanceId, updates)
        
        then: "checks for existing instance and finds none"
        1 * mockSql.firstRow(_, [instanceId: instanceId]) >> instanceNotFound
        
        and: "returns null without further processing"
        0 * mockSql.executeUpdate(_, _)
        result == null
    }
    
    def "deletePhaseInstance should return false when instance has steps"() {
        given: "instance ID with steps"
        def instanceId = UUID.randomUUID()
        def hasSteps = [step_count: 5L]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "deletePhaseInstance is called"
        def result = repository.deletePhaseInstance(instanceId)
        
        then: "checks for steps and finds some"
        1 * mockSql.firstRow(_, [instanceId: instanceId]) >> hasSteps
        
        and: "returns false without deletion"
        0 * mockSql.executeUpdate(_, _)
        result == false
    }
    
    def "updateControlPoint should return false when no status provided"() {
        given: "control ID with empty status"
        def controlId = UUID.randomUUID()
        def emptyStatus = [:]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateControlPoint is called"
        def result = repository.updateControlPoint(controlId, emptyStatus)
        
        then: "returns false without executing update"
        0 * mockSql.executeUpdate(_, _)
        result == false
    }
    
    def "updateControlPoint should return false when update affects no rows"() {
        given: "control update that affects no rows"
        def controlId = UUID.randomUUID()
        def status = [cti_status: 'PASSED']
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateControlPoint is called"
        def result = repository.updateControlPoint(controlId, status)
        
        then: "executes update but affects no rows"
        1 * mockSql.executeUpdate(_, _) >> 0
        
        and: "returns false"
        result == false
    }
    
    def "overrideControl should return false when update affects no rows"() {
        given: "control override that affects no rows"
        def controlId = UUID.randomUUID()
        def reason = 'Test override'
        def overrideBy = 'admin'
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "overrideControl is called"
        def result = repository.overrideControl(controlId, reason, overrideBy)
        
        then: "executes update but affects no rows"
        1 * mockSql.executeUpdate(_, _) >> 0
        
        and: "returns false"
        result == false
    }
    
    def "findControlPoints should return empty list for invalid phase ID"() {
        given: "invalid phase ID"
        def phaseId = UUID.randomUUID()
        def notMasterPhase = null
        def notInstancePhase = null
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findControlPoints is called"
        def result = repository.findControlPoints(phaseId)
        
        then: "checks both master and instance tables"
        1 * mockSql.firstRow(_, [phaseId: phaseId]) >> notMasterPhase
        1 * mockSql.firstRow(_, [phaseId: phaseId]) >> notInstancePhase
        
        and: "returns empty list"
        result == []
    }
    
    def "validateControlPoints should handle critical control failures"() {
        given: "phase with failed critical controls"
        def phaseId = UUID.randomUUID()
        def controls = [
            [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: true, cti_name: 'Critical Control 1'],
            [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: false, cti_name: 'Normal Control 1']
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.rows(_, _) >> controls
        
        when: "validateControlPoints is called"
        def result = repository.validateControlPoints(phaseId)
        
        then: "returns validation results with critical failure"
        result.total_controls == 2
        result.passed_controls == 1
        result.failed_controls == 1
        result.critical_controls == 1
        result.failed_critical_controls == 1
        result.all_controls_passed == false
        result.no_critical_failures == false
        result.can_proceed == false
        result.failed_critical_names == ['Critical Control 1']
    }
    
    def "calculatePhaseProgress should handle null and zero values correctly"() {
        given: "phase with null statistics"
        def phaseId = UUID.randomUUID()
        def stats = [
            total_steps: null,
            completed_steps: null,
            skipped_steps: null
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow(_, _) >> stats
        
        when: "calculatePhaseProgress is called"
        def result = repository.calculatePhaseProgress(phaseId)
        
        then: "returns 0.0 for null values"
        result == 0.0
    }
    
    def "getPhaseStatistics should return empty map for invalid sequence ID"() {
        given: "invalid sequence ID"
        def sequenceId = UUID.randomUUID()
        def notMasterSequence = null
        def notInstanceSequence = null
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "getPhaseStatistics is called"
        def result = repository.getPhaseStatistics(sequenceId)
        
        then: "checks both sequence types"
        1 * mockSql.firstRow(_, [sequenceId: sequenceId]) >> notMasterSequence
        1 * mockSql.firstRow(_, [sequenceId: sequenceId]) >> notInstanceSequence
        
        and: "returns empty map"
        result == [:]
    }
    
    def "createMasterPhase should handle SQL exceptions"() {
        given: "phase data that causes SQL exception"
        def sequenceId = UUID.randomUUID()
        def phaseData = [sqm_id: sequenceId, phm_name: 'Test Phase']
        def sequenceExists = [sqm_id: sequenceId]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow(_, [sequenceId: sequenceId]) >> sequenceExists
        mockSql.firstRow(_, _) >> { throw new RuntimeException("Database error") }
        
        when: "createMasterPhase is called"
        repository.createMasterPhase(phaseData)
        
        then: "exception is propagated"
        thrown(RuntimeException)
    }
    
    def "updateMasterPhase should handle circular dependency exceptions"() {
        given: "phase update with circular dependency"
        def phaseId = UUID.randomUUID()
        def sequenceId = UUID.randomUUID()
        def predecessorId = UUID.randomUUID()
        def updateData = [predecessor_phm_id: predecessorId]
        def currentPhase = [sqm_id: sequenceId, predecessor_phm_id: null]
        def circularDependency = [has_cycle: true]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow({ String query ->
            query.contains('SELECT sqm_id, predecessor_phm_id')
        }, [phaseId: phaseId]) >> currentPhase
        mockSql.firstRow({ String query ->
            query.contains('WITH RECURSIVE dependency_chain')
        }, _) >> circularDependency
        
        when: "updateMasterPhase is called"
        repository.updateMasterPhase(phaseId, updateData)
        
        then: "throws IllegalArgumentException for circular dependency"
        thrown(IllegalArgumentException)
    }
    
    def "reorderMasterPhases should handle transaction exceptions"() {
        given: "phase order map that causes exception"
        def sequenceId = UUID.randomUUID()
        def phaseOrderMap = [(UUID.randomUUID()): 1]
        
        and: "DatabaseUtil.withSql is mocked with failing transaction"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { throw new RuntimeException("Transaction failed") }
        
        when: "reorderMasterPhases is called"
        repository.reorderMasterPhases(sequenceId, phaseOrderMap)
        
        then: "exception is propagated"
        thrown(RuntimeException)
    }
    
    def "reorderPhaseInstances should handle transaction exceptions"() {
        given: "phase order map that causes exception"
        def sequenceInstanceId = UUID.randomUUID()
        def phaseOrderMap = [(UUID.randomUUID()): 1]
        
        and: "DatabaseUtil.withSql is mocked with failing transaction"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { throw new RuntimeException("Transaction failed") }
        
        when: "reorderPhaseInstances is called"
        repository.reorderPhaseInstances(sequenceInstanceId, phaseOrderMap)
        
        then: "exception is propagated"
        thrown(RuntimeException)
    }
    
    def "normalizePhaseOrder should handle SQL exceptions"() {
        given: "sequence ID that causes SQL exception"
        def sequenceId = UUID.randomUUID()
        def isMasterSequence = [sqm_id: sequenceId]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow(_, [sequenceId: sequenceId]) >> isMasterSequence
        mockSql.rows(_, _) >> { throw new RuntimeException("Database error") }
        
        when: "normalizePhaseOrder is called"
        repository.normalizePhaseOrder(sequenceId)
        
        then: "exception is propagated"
        thrown(RuntimeException)
    }
}