#!/usr/bin/env groovy
/**
 * Unit Test for SequenceRepository
 * Tests repository methods with specific SQL query mocks following ADR-026
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
import umig.repository.SequenceRepository
import java.util.UUID

class SequenceRepositoryTest extends Specification {
    
    SequenceRepository repository
    def mockSql
    
    def setup() {
        repository = new SequenceRepository()
        mockSql = Mock()
    }
    
    // ==================== MASTER SEQUENCE TESTS ====================
    
    def "findAllMasterSequences should return all master sequences with enriched data"() {
        given: "mock SQL returns sequences with plan and team data"
        def expectedResults = [
            [sqm_id: UUID.randomUUID(), sqm_name: 'Sequence 1', plm_name: 'Plan 1', tms_name: 'Team 1'],
            [sqm_id: UUID.randomUUID(), sqm_name: 'Sequence 2', plm_name: 'Plan 2', tms_name: 'Team 2']
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findAllMasterSequences is called"
        def result = repository.findAllMasterSequences()
        
        then: "SQL query is executed with exact structure"
        1 * mockSql.rows({ String query ->
            query.contains('SELECT') &&
            query.contains('sqm.sqm_id') &&
            query.contains('sqm.plm_id') &&
            query.contains('sqm.sqm_order') &&
            query.contains('sqm.sqm_name') &&
            query.contains('FROM sequences_master_sqm sqm') &&
            query.contains('JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id') &&
            query.contains('LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id') &&
            query.contains('LEFT JOIN sequences_master_sqm pred ON sqm.predecessor_sqm_id = pred.sqm_id') &&
            query.contains('ORDER BY plm.plm_name, sqm.sqm_order')
        }) >> expectedResults
        
        and: "returns expected data"
        result == expectedResults
    }
    
    def "findMasterSequencesByPlanId should filter by plan ID with specific SQL pattern"() {
        given: "a plan ID and expected sequences"
        def planId = UUID.randomUUID()
        def expectedResults = [
            [sqm_id: UUID.randomUUID(), sqm_name: 'Seq 1', sqm_order: 1],
            [sqm_id: UUID.randomUUID(), sqm_name: 'Seq 2', sqm_order: 2]
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findMasterSequencesByPlanId is called"
        def result = repository.findMasterSequencesByPlanId(planId)
        
        then: "SQL query validates exact structure with parameter binding"
        1 * mockSql.rows({ String query ->
            query.contains('FROM sequences_master_sqm sqm') &&
            query.contains('JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id') &&
            query.contains('WHERE sqm.plm_id = :planId') &&
            query.contains('ORDER BY sqm.sqm_order')
        }, [planId: planId]) >> expectedResults
        
        and: "returns filtered sequences"
        result == expectedResults
    }
    
    def "findMasterSequenceById should return specific sequence with full join details"() {
        given: "a sequence ID and expected sequence data"
        def sequenceId = UUID.randomUUID()
        def expectedSequence = [
            sqm_id: sequenceId,
            sqm_name: 'Test Sequence',
            plm_name: 'Test Plan',
            tms_name: 'Test Team'
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findMasterSequenceById is called"
        def result = repository.findMasterSequenceById(sequenceId)
        
        then: "SQL firstRow query validates exact structure"
        1 * mockSql.firstRow({ String query ->
            query.contains('FROM sequences_master_sqm sqm') &&
            query.contains('JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id') &&
            query.contains('LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id') &&
            query.contains('WHERE sqm.sqm_id = :sequenceId')
        }, [sequenceId: sequenceId]) >> expectedSequence
        
        and: "returns the sequence"
        result == expectedSequence
    }
    
    def "reorderMasterSequence should validate circular dependencies and update ordering"() {
        given: "sequence reorder parameters"
        def sequenceId = UUID.randomUUID()
        def planId = UUID.randomUUID()
        def predecessorId = UUID.randomUUID()
        def newOrder = 3
        def currentSequence = [plm_id: planId, sqm_order: 1]
        
        and: "DatabaseUtil.withSql is mocked with transaction support"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        def mockTransaction = Mock()
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "reorderMasterSequence is called"
        def result = repository.reorderMasterSequence(sequenceId, newOrder, predecessorId)
        
        then: "gets current sequence data with exact query"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT plm_id, sqm_order') &&
            query.contains('FROM sequences_master_sqm') &&
            query.contains('WHERE sqm_id = :sequenceId')
        }, [sequenceId: sequenceId]) >> currentSequence
        
        and: "executes reorder update with specific parameters"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE sequences_master_sqm') &&
            query.contains('SET sqm_order = sqm_order - 1') &&
            query.contains('WHERE plm_id = :planId') &&
            query.contains('AND sqm_order > :currentOrder') &&
            query.contains('AND sqm_order <= :newOrder')
        }, [planId: planId, currentOrder: 1, newOrder: newOrder]) >> 1
        
        and: "updates target sequence with exact fields"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE sequences_master_sqm') &&
            query.contains('SET sqm_order = :newOrder') &&
            query.contains('predecessor_sqm_id = :predecessorId') &&
            query.contains('updated_by = \'system\'') &&
            query.contains('WHERE sqm_id = :sequenceId')
        }, [sequenceId: sequenceId, newOrder: newOrder, predecessorId: predecessorId]) >> 1
        
        and: "returns success"
        result == true
    }
    
    // ==================== INSTANCE SEQUENCE TESTS ====================
    
    def "findSequencesByIteration should use specific hierarchical filtering SQL"() {
        given: "filters with multiple criteria"
        def filters = [
            migrationId: UUID.randomUUID().toString(),
            iterationId: UUID.randomUUID().toString(),
            teamId: '123'
        ]
        def expectedResults = [
            [sqi_id: UUID.randomUUID(), sqi_name: 'Instance 1'],
            [sqi_id: UUID.randomUUID(), sqi_name: 'Instance 2']
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findSequencesByIteration is called"
        def result = repository.findSequencesByIteration(filters)
        
        then: "SQL query validates exact hierarchical joins and filters"
        1 * mockSql.rows({ String query ->
            // Validate main SELECT structure
            query.contains('SELECT') &&
            query.contains('sqi.sqi_id') &&
            query.contains('sqi.pli_id') &&
            query.contains('sqi.sqm_id') &&
            query.contains('sqi.sqi_status') &&
            // Validate hierarchical joins
            query.contains('FROM sequences_instance_sqi sqi') &&
            query.contains('JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id') &&
            query.contains('JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id') &&
            query.contains('JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id') &&
            query.contains('JOIN iterations_ite itr ON pli.ite_id = itr.itr_id') &&
            query.contains('JOIN migrations_mig mig ON itr.mig_id = mig.mig_id') &&
            // Validate WHERE conditions
            query.contains('WHERE 1=1') &&
            query.contains('AND mig.mig_id = :migrationId') &&
            query.contains('AND pli.ite_id = :iterationId') &&
            query.contains('AND plm.tms_id = :teamId') &&
            query.contains('ORDER BY sqi.sqi_order, sqi.created_at')
        }, { Map params ->
            // Validate parameter types (ADR-031)
            params.migrationId instanceof UUID &&
            params.iterationId instanceof UUID &&
            params.teamId instanceof Integer
        }) >> expectedResults
        
        and: "returns filtered results"
        result == expectedResults
    }
    
    def "findSequenceInstanceById should return instance with full hierarchical data"() {
        given: "instance ID and expected full data"
        def instanceId = UUID.randomUUID()
        def expectedInstance = [
            sqi_id: instanceId,
            sqi_name: 'Test Instance',
            master_name: 'Master Sequence',
            pli_name: 'Plan Instance',
            itr_name: 'Iteration'
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findSequenceInstanceById is called"
        def result = repository.findSequenceInstanceById(instanceId)
        
        then: "SQL firstRow validates complete hierarchical query"
        1 * mockSql.firstRow({ String query ->
            query.contains('FROM sequences_instance_sqi sqi') &&
            query.contains('JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id') &&
            query.contains('JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id') &&
            query.contains('WHERE sqi.sqi_id = :instanceId')
        }, [instanceId: instanceId]) >> expectedInstance
        
        and: "returns complete instance data"
        result == expectedInstance
    }
    
    def "updateSequenceInstanceStatus should use conditional timestamp logic"() {
        given: "instance status update parameters"
        def instanceId = UUID.randomUUID()
        def status = 'IN_PROGRESS'
        def userId = 123
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateSequenceInstanceStatus is called"
        def result = repository.updateSequenceInstanceStatus(instanceId, status, userId)
        
        then: "SQL executeUpdate validates conditional timestamp logic"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('UPDATE sequences_instance_sqi') &&
            query.contains('SET sqi_status = :status') &&
            query.contains('updated_by = \'system\'') &&
            query.contains('updated_at = CURRENT_TIMESTAMP') &&
            // Validate conditional start time logic
            query.contains('sqi_start_time = CASE') &&
            query.contains('WHEN :status = \'IN_PROGRESS\' AND sqi_start_time IS NULL') &&
            query.contains('THEN CURRENT_TIMESTAMP') &&
            // Validate conditional end time logic
            query.contains('sqi_end_time = CASE') &&
            query.contains('WHEN :status = \'COMPLETED\'') &&
            query.contains('WHERE sqi_id = :instanceId')
        }, [instanceId: instanceId, status: status]) >> 1
        
        and: "returns success"
        result == true
    }
    
    // ==================== CIRCULAR DEPENDENCY TESTS ====================
    
    def "findCircularDependencies should use recursive CTE for dependency validation"() {
        given: "plan ID and mock SQL"
        def planId = UUID.randomUUID()
        def expectedCycles = [
            ['Seq A', 'Seq B', 'Seq C', 'Seq A'],
            ['Seq X', 'Seq Y', 'Seq X']
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findCircularDependencies is called for master sequences"
        def result = repository.findCircularDependencies(mockSql, planId, false)
        
        then: "SQL query validates recursive CTE pattern for master sequences"
        1 * mockSql.rows({ String query ->
            // Validate CTE structure
            query.contains('WITH RECURSIVE dependency_chain AS') &&
            // Validate base case
            query.contains('SELECT sqm_id, predecessor_sqm_id, 1 as depth') &&
            query.contains('ARRAY[sqm_id] as path') &&
            query.contains('FROM sequences_master_sqm t') &&
            query.contains('WHERE plm_id = :planId AND predecessor_sqm_id IS NOT NULL') &&
            // Validate recursive case
            query.contains('UNION ALL') &&
            query.contains('SELECT s.sqm_id, s.predecessor_sqm_id, dc.depth + 1') &&
            query.contains('dc.path || s.sqm_id') &&
            query.contains('JOIN dependency_chain dc ON s.sqm_id = dc.predecessor_sqm_id') &&
            query.contains('WHERE s.sqm_id != ALL(dc.path) AND dc.depth < 100') &&
            // Validate cycle detection
            query.contains('SELECT DISTINCT name_path as cycle') &&
            query.contains('WHERE sqm_id = ANY(path[1:array_length(path,1)-1])')
        }, [planId: planId]) >> expectedCycles.collect { [cycle: it] }
        
        and: "returns detected cycles"
        result == expectedCycles
    }
    
    def "findCircularDependencies should handle instance sequences with different table names"() {
        given: "plan ID for instance sequences"
        def planId = UUID.randomUUID()
        def expectedCycles = [['Instance A', 'Instance B', 'Instance A']]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "findCircularDependencies is called for instance sequences"
        def result = repository.findCircularDependencies(mockSql, planId, true)
        
        then: "SQL query validates instance-specific table and column names"
        1 * mockSql.rows({ String query ->
            // Validate instance-specific table names
            query.contains('FROM sequences_instance_sqi t') &&
            query.contains('WHERE pli_id = :planId AND predecessor_sqi_id IS NOT NULL') &&
            // Validate instance-specific column names
            query.contains('SELECT sqi_id, predecessor_sqi_id, 1 as depth') &&
            query.contains('SELECT s.sqi_id, s.predecessor_sqi_id, dc.depth + 1') &&
            query.contains('JOIN dependency_chain dc ON s.sqi_id = dc.predecessor_sqi_id') &&
            query.contains('WHERE sqi_id = ANY(path[1:array_length(path,1)-1])')
        }, [planId: planId]) >> expectedCycles.collect { [cycle: it] }
        
        and: "returns instance cycles"
        result == expectedCycles
    }
    
    // ==================== UTILITY METHOD TESTS ====================
    
    def "hasSequenceInstances should validate instance existence with count query"() {
        given: "master sequence ID"
        def masterSequenceId = UUID.randomUUID()
        def instanceCount = [instance_count: 3L]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "hasSequenceInstances is called"
        def result = repository.hasSequenceInstances(masterSequenceId)
        
        then: "SQL firstRow validates exact count query structure"
        1 * mockSql.firstRow({ String query ->
            query.contains('SELECT COUNT(*) as instance_count') &&
            query.contains('FROM sequences_instance_sqi') &&
            query.contains('WHERE sqm_id = :masterSequenceId')
        }, [masterSequenceId: masterSequenceId]) >> instanceCount
        
        and: "returns true for existing instances"
        result == true
    }
    
    @Unroll
    def "hasSequenceInstances should return #expected for count #count"() {
        given: "master sequence ID and count result"
        def masterSequenceId = UUID.randomUUID()
        def instanceCount = [instance_count: count]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.firstRow(_, _) >> instanceCount
        
        when: "hasSequenceInstances is called"
        def result = repository.hasSequenceInstances(masterSequenceId)
        
        then: "returns correct boolean value"
        result == expected
        
        where:
        count | expected
        0L    | false
        1L    | true
        5L    | true
        null  | false
    }
    
    // ==================== ERROR HANDLING TESTS ====================
    
    def "reorderMasterSequence should return false for non-existent sequence"() {
        given: "non-existent sequence ID"
        def sequenceId = UUID.randomUUID()
        def newOrder = 3
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.withTransaction(_) >> { closure -> closure() }
        
        when: "reorderMasterSequence is called"
        def result = repository.reorderMasterSequence(sequenceId, newOrder)
        
        then: "SQL query returns null for non-existent sequence"
        1 * mockSql.firstRow(_, _) >> null
        
        and: "returns false without further SQL calls"
        0 * mockSql.executeUpdate(_, _)
        result == false
    }
    
    def "updateSequenceInstanceStatus should return false when no rows updated"() {
        given: "instance update parameters"
        def instanceId = UUID.randomUUID()
        def status = 'COMPLETED'
        def userId = 123
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateSequenceInstanceStatus is called"
        def result = repository.updateSequenceInstanceStatus(instanceId, status, userId)
        
        then: "SQL executeUpdate returns 0 rows updated"
        1 * mockSql.executeUpdate(_, _) >> 0
        
        and: "returns false"
        result == false
    }
}