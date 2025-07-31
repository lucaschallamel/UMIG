#!/usr/bin/env groovy
/**
 * Simplified Unit Test for Plans API
 * Tests core logic of PlanRepository without JAX-RS dependencies
 * Run: groovy PlansApiUnitTestSimple.groovy
 */

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper

// --- Mock Database Util ---
class DatabaseUtil {
    static def withSql(Closure closure) {
        def mockSql = new MockSql()
        return closure.call(mockSql)
    }
}

class MockSql {
    def rows(String query, Map params = [:]) {
        if (query.contains("plans_master_plm") && query.contains("ORDER BY")) {
            // findAllMasterPlans
            return [
                [
                    plm_id: UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
                    tms_id: 1,
                    plm_name: "Test Plan 1",
                    plm_description: "Description 1",
                    plm_status: "DRAFT",
                    sts_name: "Draft",
                    sts_color: "#808080",
                    tms_name: "Team Alpha",
                    created_by: "system",
                    created_at: new Date(),
                    updated_by: "system",
                    updated_at: new Date()
                ]
            ]
        }
        
        if (query.contains("plans_instance_pli") && params.migrationId) {
            // findPlanInstancesByFilters with migration filter
            return []
        }
        
        if (query.contains("plans_instance_pli")) {
            // findPlanInstancesByFilters
            return [
                [
                    pli_id: UUID.fromString("323e4567-e89b-12d3-a456-426614174000"),
                    plm_id: UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
                    ite_id: UUID.fromString("423e4567-e89b-12d3-a456-426614174000"),
                    pli_name: "Instance 1",
                    pli_description: "Instance Description 1",
                    pli_status: "IN_PROGRESS",
                    sts_name: "In Progress",
                    sts_color: "#0000FF",
                    usr_id_owner: 1,
                    owner_name: "John Doe",
                    plm_name: "Test Plan 1",
                    itr_name: "Iteration 1",
                    mig_name: "Migration 1",
                    created_at: new Date(),
                    updated_at: new Date()
                ]
            ]
        }
        
        return []
    }
    
    def firstRow(String query, Map params = [:]) {
        if (query.contains("plans_master_plm") && params.planId?.toString() == "123e4567-e89b-12d3-a456-426614174000") {
            // findMasterPlanById
            return [
                plm_id: params.planId,
                tms_id: 1,
                plm_name: "Test Plan 1",
                plm_description: "Description 1",
                plm_status: "DRAFT",
                sts_name: "Draft",
                sts_color: "#808080",
                tms_name: "Team Alpha",
                created_by: "system",
                created_at: new Date(),
                updated_by: "system",
                updated_at: new Date()
            ]
        }
        
        if (query.contains("plans_master_plm") && query.contains("RETURNING")) {
            // createMasterPlan
            return [plm_id: UUID.randomUUID()]
        }
        
        if (query.contains("plans_instance_pli") && params.instanceId?.toString() == "323e4567-e89b-12d3-a456-426614174000") {
            // findPlanInstanceById
            return [
                pli_id: params.instanceId,
                plm_id: UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
                ite_id: UUID.fromString("423e4567-e89b-12d3-a456-426614174000"),
                pli_name: "Instance 1",
                pli_description: "Instance Description 1",
                pli_status: "IN_PROGRESS",
                sts_name: "In Progress",
                sts_color: "#0000FF",
                usr_id_owner: 1,
                owner_name: "John Doe",
                plm_name: "Test Plan 1",
                plm_description: "Test Plan Description",
                tms_id: 1,
                itr_name: "Iteration 1",
                mig_name: "Migration 1",
                created_by: "system",
                created_at: new Date(),
                updated_by: "system",
                updated_at: new Date()
            ]
        }
        
        if (query.contains("plans_instance_pli") && query.contains("RETURNING")) {
            // createPlanInstance
            return [pli_id: UUID.randomUUID()]
        }
        
        if (query.contains("status_sts") && params.statusId == 5) {
            return [sts_name: "COMPLETED"]
        }
        
        if (query.contains("SELECT plm_name") && params.masterPlanId?.toString() == "123e4567-e89b-12d3-a456-426614174000") {
            // Master plan data for instance creation
            return [
                plm_name: "Test Plan 1",
                plm_description: "Description 1",
                plm_status: "DRAFT"
            ]
        }
        
        if (query.contains("COUNT(*)") && query.contains("plans_instance_pli")) {
            // hasPlanInstances
            return [instance_count: 0]
        }
        
        return null
    }
    
    def executeUpdate(String query, Map params = [:]) {
        if (query.contains("UPDATE plans_master_plm")) {
            return 1
        }
        if (query.contains("UPDATE plans_instance_pli")) {
            return 1
        }
        if (query.contains("DELETE FROM plans_instance_pli")) {
            return 1
        }
        return 0
    }
}

// Copy of PlanRepository class for testing
import java.util.UUID

class PlanRepository {

    // ==================== MASTER PLAN OPERATIONS ====================
    
    def findAllMasterPlans() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    plm.plm_id, 
                    plm.tms_id, 
                    plm.plm_name, 
                    plm.plm_description, 
                    plm.plm_status,
                    plm.created_by,
                    plm.created_at,
                    plm.updated_by,
                    plm.updated_at,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    tms.tms_name
                FROM plans_master_plm plm
                LEFT JOIN status_sts sts ON sts.sts_name = plm.plm_status AND sts.sts_type = 'Plan'
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                ORDER BY plm.created_at DESC
            """)
        }
    }
    
    def findMasterPlanById(UUID planId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT 
                    plm.plm_id, 
                    plm.tms_id, 
                    plm.plm_name, 
                    plm.plm_description, 
                    plm.plm_status,
                    plm.created_by,
                    plm.created_at,
                    plm.updated_by,
                    plm.updated_at,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    tms.tms_name
                FROM plans_master_plm plm
                LEFT JOIN status_sts sts ON sts.sts_name = plm.plm_status AND sts.sts_type = 'Plan'
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                WHERE plm.plm_id = :planId
            """, [planId: planId])
        }
    }
    
    def createMasterPlan(Map planData) {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                INSERT INTO plans_master_plm (
                    tms_id, plm_name, plm_description, plm_status, 
                    created_by, updated_by
                ) VALUES (
                    :tms_id, :plm_name, :plm_description, :plm_status,
                    'system', 'system'
                )
                RETURNING plm_id
            """, planData)
            
            if (result?.plm_id) {
                return findMasterPlanById(result.plm_id as UUID)
            }
            return null
        }
    }
    
    def updateMasterPlan(UUID planId, Map planData) {
        DatabaseUtil.withSql { sql ->
            // Check if plan exists
            if (!sql.firstRow('SELECT plm_id FROM plans_master_plm WHERE plm_id = :planId', [planId: planId])) {
                return null
            }
            
            // Build dynamic update query
            def setClauses = []
            def queryParams = [:]
            def updatableFields = ['tms_id', 'plm_name', 'plm_description', 'plm_status']
            
            planData.each { key, value ->
                if (key in updatableFields) {
                    setClauses.add("${key} = :${key}")
                    queryParams[key] = value
                }
            }
            
            if (setClauses.isEmpty()) {
                return findMasterPlanById(planId)
            }
            
            queryParams['planId'] = planId
            setClauses.add("updated_by = 'system'")
            setClauses.add("updated_at = CURRENT_TIMESTAMP")
            
            def updateQuery = "UPDATE plans_master_plm SET ${setClauses.join(', ')} WHERE plm_id = :planId"
            sql.executeUpdate(updateQuery, queryParams)
            
            return findMasterPlanById(planId)
        }
    }
    
    def softDeleteMasterPlan(UUID planId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow('SELECT plm_id FROM plans_master_plm WHERE plm_id = :planId', [planId: planId]) != null
        }
    }
    
    // ==================== INSTANCE PLAN OPERATIONS ====================
    
    def findPlanInstancesByFilters(Map filters) {
        DatabaseUtil.withSql { sql ->
            def query = """
                SELECT 
                    pli.pli_id,
                    pli.plm_id,
                    pli.ite_id,
                    pli.pli_name,
                    pli.pli_description,
                    pli.pli_status,
                    pli.usr_id_owner,
                    pli.created_at,
                    pli.updated_at,
                    plm.plm_name,
                    plm.tms_id,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    usr.usr_name as owner_name,
                    itr.itr_name,
                    mig.mig_name
                FROM plans_instance_pli pli
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_itr itr ON pli.ite_id = itr.itr_id
                JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
                LEFT JOIN status_sts sts ON sts.sts_name = pli.pli_status AND sts.sts_type = 'Plan'
                LEFT JOIN users_usr usr ON pli.usr_id_owner = usr.usr_id
                WHERE 1=1
            """
            
            def params = [:]
            
            // Add filters with type safety
            if (filters.migrationId) {
                query += ' AND mig.mig_id = :migrationId'
                params.migrationId = UUID.fromString(filters.migrationId as String)
            }
            
            if (filters.iterationId) {
                query += ' AND pli.ite_id = :iterationId'
                params.iterationId = UUID.fromString(filters.iterationId as String)
            }
            
            if (filters.teamId) {
                query += ' AND plm.tms_id = :teamId'
                params.teamId = Integer.parseInt(filters.teamId as String)
            }
            
            if (filters.statusId) {
                query += ' AND sts.sts_id = :statusId'
                params.statusId = Integer.parseInt(filters.statusId as String)
            }
            
            query += ' ORDER BY pli.created_at DESC'
            
            return sql.rows(query, params)
        }
    }
    
    def findPlanInstanceById(UUID instanceId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT 
                    pli.pli_id,
                    pli.plm_id,
                    pli.ite_id,
                    pli.pli_name,
                    pli.pli_description,
                    pli.pli_status,
                    pli.usr_id_owner,
                    pli.created_by,
                    pli.created_at,
                    pli.updated_by,
                    pli.updated_at,
                    plm.plm_name,
                    plm.plm_description as plm_description,
                    plm.tms_id,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    usr.usr_name as owner_name,
                    itr.itr_name,
                    mig.mig_name
                FROM plans_instance_pli pli
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_itr itr ON pli.ite_id = itr.itr_id
                JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
                LEFT JOIN status_sts sts ON sts.sts_name = pli.pli_status AND sts.sts_type = 'Plan'
                LEFT JOIN users_usr usr ON pli.usr_id_owner = usr.usr_id
                WHERE pli.pli_id = :instanceId
            """, [instanceId: instanceId])
        }
    }
    
    def createPlanInstance(UUID masterPlanId, UUID iterationId, Integer userId, Map overrides = [:]) {
        DatabaseUtil.withSql { sql ->
            // Fetch master plan data
            def masterPlan = sql.firstRow("""
                SELECT plm_name, plm_description, plm_status
                FROM plans_master_plm
                WHERE plm_id = :masterPlanId
            """, [masterPlanId: masterPlanId])
            
            if (!masterPlan) {
                return null
            }
            
            // Prepare instance data with overrides
            def instanceData = [
                plm_id: masterPlanId,
                ite_id: iterationId,
                pli_name: overrides.pli_name ?: masterPlan.plm_name,
                pli_description: overrides.pli_description ?: masterPlan.plm_description,
                pli_status: 'NOT_STARTED', // Default status for new instances
                usr_id_owner: userId
            ]
            
            def result = sql.firstRow("""
                INSERT INTO plans_instance_pli (
                    plm_id, ite_id, pli_name, pli_description, pli_status, 
                    usr_id_owner, created_by, updated_by
                ) VALUES (
                    :plm_id, :ite_id, :pli_name, :pli_description, :pli_status,
                    :usr_id_owner, 'system', 'system'
                )
                RETURNING pli_id
            """, instanceData)
            
            if (result?.pli_id) {
                return findPlanInstanceById(result.pli_id as UUID)
            }
            return null
        }
    }
    
    def updatePlanInstance(UUID instanceId, Map updates) {
        DatabaseUtil.withSql { sql ->
            // Check if instance exists
            if (!sql.firstRow('SELECT pli_id FROM plans_instance_pli WHERE pli_id = :instanceId', [instanceId: instanceId])) {
                return null
            }
            
            // Build dynamic update query
            def setClauses = []
            def queryParams = [:]
            def updatableFields = ['pli_name', 'pli_description', 'pli_status', 'usr_id_owner']
            
            updates.each { key, value ->
                if (key in updatableFields) {
                    setClauses.add("${key} = :${key}")
                    queryParams[key] = value
                }
            }
            
            if (setClauses.isEmpty()) {
                return findPlanInstanceById(instanceId)
            }
            
            queryParams['instanceId'] = instanceId
            setClauses.add("updated_by = 'system'")
            setClauses.add("updated_at = CURRENT_TIMESTAMP")
            
            def updateQuery = "UPDATE plans_instance_pli SET ${setClauses.join(', ')} WHERE pli_id = :instanceId"
            sql.executeUpdate(updateQuery, queryParams)
            
            return findPlanInstanceById(instanceId)
        }
    }
    
    def updatePlanInstanceStatus(UUID instanceId, Integer statusId) {
        DatabaseUtil.withSql { sql ->
            // Get status name from status_sts table
            def status = sql.firstRow("""
                SELECT sts_name 
                FROM status_sts 
                WHERE sts_id = :statusId AND sts_type = 'Plan'
            """, [statusId: statusId])
            
            if (!status) {
                return false
            }
            
            def rowsUpdated = sql.executeUpdate("""
                UPDATE plans_instance_pli 
                SET pli_status = :statusName,
                    updated_by = 'system',
                    updated_at = CURRENT_TIMESTAMP
                WHERE pli_id = :instanceId
            """, [instanceId: instanceId, statusName: status.sts_name])
            
            return rowsUpdated > 0
        }
    }
    
    def deletePlanInstance(UUID instanceId) {
        DatabaseUtil.withSql { sql ->
            def rowsDeleted = sql.executeUpdate("""
                DELETE FROM plans_instance_pli 
                WHERE pli_id = :instanceId
            """, [instanceId: instanceId])
            
            return rowsDeleted > 0
        }
    }
    
    // ==================== UTILITY OPERATIONS ====================
    
    def hasPlanInstances(UUID masterPlanId) {
        DatabaseUtil.withSql { sql ->
            def count = sql.firstRow("""
                SELECT COUNT(*) as instance_count
                FROM plans_instance_pli
                WHERE plm_id = :masterPlanId
            """, [masterPlanId: masterPlanId])
            
            return count?.instance_count > 0
        }
    }
    
    def findPlansByTeamId(Integer teamId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    'master' as plan_type,
                    plm_id as plan_id,
                    plm_name as plan_name,
                    plm_description as plan_description,
                    plm_status as plan_status,
                    created_at,
                    updated_at
                FROM plans_master_plm
                WHERE tms_id = :teamId
                
                UNION ALL
                
                SELECT 
                    'instance' as plan_type,
                    pli.pli_id as plan_id,
                    pli.pli_name as plan_name,
                    pli.pli_description as plan_description,
                    pli.pli_status as plan_status,
                    pli.created_at,
                    pli.updated_at
                FROM plans_instance_pli pli
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                WHERE plm.tms_id = :teamId
                
                ORDER BY created_at DESC
            """, [teamId: teamId])
        }
    }
}

// --- Test Runner ---
class PlanRepositoryTests {
    def planRepository = new PlanRepository()
    
    void runTests() {
        println "Running Plan Repository Unit Tests..."
        int passed = 0
        int failed = 0
        
        // Test 1: findAllMasterPlans
        try {
            def plans = planRepository.findAllMasterPlans()
            assert plans.size() == 1
            assert plans[0].plm_name == "Test Plan 1"
            assert plans[0].plm_status == "DRAFT"
            println "✅ Test 1 passed: findAllMasterPlans"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 1 failed: ${e.message}"
            failed++
        }
        
        // Test 2: findMasterPlanById - found
        try {
            def plan = planRepository.findMasterPlanById(UUID.fromString("123e4567-e89b-12d3-a456-426614174000"))
            assert plan != null
            assert plan.plm_name == "Test Plan 1"
            assert plan.tms_id == 1
            println "✅ Test 2 passed: findMasterPlanById (found)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 2 failed: ${e.message}"
            failed++
        }
        
        // Test 3: findMasterPlanById - not found
        try {
            def plan = planRepository.findMasterPlanById(UUID.fromString("999e4567-e89b-12d3-a456-426614174000"))
            assert plan == null
            println "✅ Test 3 passed: findMasterPlanById (not found)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 3 failed: ${e.message}"
            failed++
        }
        
        // Test 4: createMasterPlan
        try {
            def planData = [
                tms_id: 1,
                plm_name: "New Plan",
                plm_description: "New Description",
                plm_status: "DRAFT"
            ]
            def result = planRepository.createMasterPlan(planData)
            assert result != null
            assert result.plm_id != null
            println "✅ Test 4 passed: createMasterPlan"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 4 failed: ${e.message}"
            failed++
        }
        
        // Test 5: updateMasterPlan
        try {
            def planId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000")
            def updates = [plm_name: "Updated Name"]
            def result = planRepository.updateMasterPlan(planId, updates)
            assert result != null
            println "✅ Test 5 passed: updateMasterPlan"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 5 failed: ${e.message}"
            failed++
        }
        
        // Test 6: softDeleteMasterPlan
        try {
            def planId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000")
            def result = planRepository.softDeleteMasterPlan(planId)
            assert result == true
            println "✅ Test 6 passed: softDeleteMasterPlan"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 6 failed: ${e.message}"
            failed++
        }
        
        // Test 7: findPlanInstancesByFilters - no filters
        try {
            def instances = planRepository.findPlanInstancesByFilters([:])
            assert instances.size() == 1
            assert instances[0].pli_name == "Instance 1"
            println "✅ Test 7 passed: findPlanInstancesByFilters (no filters)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 7 failed: ${e.message}"
            failed++
        }
        
        // Test 8: findPlanInstancesByFilters - with migration filter
        try {
            def filters = [migrationId: "999e4567-e89b-12d3-a456-426614174000"]
            def instances = planRepository.findPlanInstancesByFilters(filters)
            assert instances.size() == 0
            println "✅ Test 8 passed: findPlanInstancesByFilters (with filter)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 8 failed: ${e.message}"
            failed++
        }
        
        // Test 9: findPlanInstanceById - found
        try {
            def instance = planRepository.findPlanInstanceById(UUID.fromString("323e4567-e89b-12d3-a456-426614174000"))
            assert instance != null
            assert instance.pli_name == "Instance 1"
            assert instance.pli_status == "IN_PROGRESS"
            println "✅ Test 9 passed: findPlanInstanceById (found)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 9 failed: ${e.message}"
            failed++
        }
        
        // Test 10: createPlanInstance
        try {
            def masterPlanId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000")
            def iterationId = UUID.fromString("423e4567-e89b-12d3-a456-426614174000")
            def overrides = [pli_name: "Custom Instance"]
            def result = planRepository.createPlanInstance(masterPlanId, iterationId, 1, overrides)
            assert result != null
            assert result.pli_id != null
            println "✅ Test 10 passed: createPlanInstance"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 10 failed: ${e.message}"
            failed++
        }
        
        // Test 11: updatePlanInstance
        try {
            def instanceId = UUID.fromString("323e4567-e89b-12d3-a456-426614174000")
            def updates = [pli_name: "Updated Instance"]
            def result = planRepository.updatePlanInstance(instanceId, updates)
            assert result != null
            println "✅ Test 11 passed: updatePlanInstance"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 11 failed: ${e.message}"
            failed++
        }
        
        // Test 12: updatePlanInstanceStatus
        try {
            def instanceId = UUID.fromString("323e4567-e89b-12d3-a456-426614174000")
            def result = planRepository.updatePlanInstanceStatus(instanceId, 5)
            assert result == true
            println "✅ Test 12 passed: updatePlanInstanceStatus"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 12 failed: ${e.message}"
            failed++
        }
        
        // Test 13: deletePlanInstance
        try {
            def instanceId = UUID.fromString("323e4567-e89b-12d3-a456-426614174000")
            def result = planRepository.deletePlanInstance(instanceId)
            assert result == true
            println "✅ Test 13 passed: deletePlanInstance"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 13 failed: ${e.message}"
            failed++
        }
        
        // Test 14: hasPlanInstances
        try {
            def masterPlanId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000")
            def result = planRepository.hasPlanInstances(masterPlanId)
            assert result == false
            println "✅ Test 14 passed: hasPlanInstances"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 14 failed: ${e.message}"
            failed++
        }
        
        println "\n========== Test Summary =========="
        println "Total tests: ${passed + failed}"
        println "Passed: ${passed}"
        println "Failed: ${failed}"
        println "Success rate: ${passed / (passed + failed) * 100}%"
        println "=================================="
        
        if (failed > 0) {
            System.exit(1)
        }
    }
}

// Run the tests
def tests = new PlanRepositoryTests()
tests.runTests()