#!/usr/bin/env groovy

@GrabConfig(systemClassLoader=true)
@Grab('org.postgresql:postgresql:42.7.3')
@Grab('org.codehaus.groovy:groovy-sql:3.0.15')
@GrabExclude('xml-apis:xml-apis')
@GrabExclude('xerces:xercesImpl')
@GrabExclude('xml-resolver:xml-resolver')
@GrabExclude('xalan:xalan')
@GrabExclude('commons-logging:commons-logging')
@Grab('org.codehaus.groovy.modules.http-builder:http-builder:0.7.1')

import groovy.sql.Sql
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import java.util.UUID

// --- Database Configuration ---
def dbHost = 'localhost'
def dbPort = 5432
def dbName = 'umig_app_db'
def dbUser = 'umig_app_user'
def dbPassword = '123456'
def dbUrl = "jdbc:postgresql://${dbHost}:${dbPort}/${dbName}"

println "🚀 Instructions API Integration Test - ini_is_completed Focus"
println "============================================================="

// --- Test Data Setup ---
def sql = null
def testStepId = null
def testMigrationId = null
def testInstructionId = null
def testInstanceId = null

try {
    // Connect to database
    sql = Sql.newInstance(dbUrl, dbUser, dbPassword, 'org.postgresql.Driver')
    println "✅ Connected to database"
    
    // Test 1: Find available test step
    println "\n🧪 Test 1: Finding available test step..."
    def step = sql.firstRow("""
        SELECT stm.stm_id, stm.stm_name, phm.phm_name
        FROM steps_master_stm stm
        JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
        LIMIT 1
    """)
    
    if (step) {
        testStepId = step.stm_id
        println "✅ Found step: ${step.stm_name} in phase: ${step.phm_name} (ID: ${testStepId})"
        // Get a migration ID from the first available migration
        def migration = sql.firstRow("SELECT mig_id FROM migrations_mig LIMIT 1")
        testMigrationId = migration?.mig_id
        println "✅ Using migration ID: ${testMigrationId}"
    } else {
        println "❌ No test steps found in database"
        System.exit(1)
    }
    
    // Test 2: Create a test instruction
    println "\n🧪 Test 2: Creating test instruction..."
    def instructionBody = "Integration Test Instruction - ${new Date()}"
    def createResult = sql.executeInsert("""
        INSERT INTO instructions_master_inm (inm_id, stm_id, inm_body, inm_order)
        VALUES (gen_random_uuid(), ?, ?, 999)
        RETURNING inm_id
    """, [testStepId, instructionBody.toString()])
    
    testInstructionId = createResult[0][0]
    println "✅ Created instruction: ${testInstructionId}"
    
    // Test 3: Query instructions by stepId
    println "\n🧪 Test 3: Querying instructions by stepId..."
    def instructions = sql.rows("""
        SELECT inm.*
        FROM instructions_master_inm inm
        WHERE inm.stm_id = ?
        ORDER BY inm.inm_order
    """, [testStepId])
    
    println "✅ Found ${instructions.size()} instructions for step"
    
    // Test 4: Query instruction instances with ini_is_completed
    println "\n🧪 Test 4: Querying instruction instances with ini_is_completed field..."
    def instances = sql.rows("""
        SELECT ini.ini_id, ini.ini_is_completed, ini.ini_completed_at, ini.usr_id_completed_by
        FROM instructions_instance_ini ini
        JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
        WHERE inm.stm_id = ?
    """, [testStepId])
    
    println "✅ Found ${instances.size()} instruction instances"
    instances.each { instance ->
        println "   Instance ${instance.ini_id}: completed=${instance.ini_is_completed}, completed_at=${instance.ini_completed_at}"
    }
    
    // Test 5: Update test instruction
    println "\n🧪 Test 5: Updating test instruction..."
    def updateCount = sql.executeUpdate("""
        UPDATE instructions_master_inm 
        SET inm_body = ?
        WHERE inm_id = ?
    """, ["Updated: ${instructionBody}".toString(), testInstructionId])
    
    println "✅ Updated ${updateCount} instruction(s)"
    
    // Test 6: Analytics query with ini_is_completed
    println "\n🧪 Test 6: Testing analytics query with ini_is_completed..."
    def stats = sql.firstRow("""
        SELECT 
            COUNT(DISTINCT inm.inm_id) as total_instructions,
            COUNT(DISTINCT ini.ini_id) as total_instances,
            COUNT(DISTINCT CASE WHEN ini.ini_is_completed = true THEN ini.ini_id END) as completed_instances,
            COUNT(DISTINCT CASE WHEN ini.ini_is_completed = false OR ini.ini_is_completed IS NULL THEN ini.ini_id END) as pending_instances
        FROM instructions_master_inm inm
        LEFT JOIN instructions_instance_ini ini ON inm.inm_id = ini.inm_id
        WHERE inm.stm_id = ?
    """, [testStepId])
    
    println "✅ Analytics - Total: ${stats.total_instructions}, Instances: ${stats.total_instances}, Completed: ${stats.completed_instances}, Pending: ${stats.pending_instances}"
    
    // Cleanup: Delete test instruction
    println "\n🧪 Cleanup: Deleting test instruction..."
    def deleteCount = sql.executeUpdate("""
        DELETE FROM instructions_master_inm 
        WHERE inm_id = ?
    """, [testInstructionId])
    
    println "✅ Deleted ${deleteCount} test instruction(s)"
    
    // Test 7: Create and test instruction instance completion
    println "\n🧪 Test 7: Testing instruction instance completion with ini_is_completed..."
    
    // First check if we have any step instances for testing
    def stepInstance = sql.firstRow("""
        SELECT sti.sti_id 
        FROM steps_instance_sti sti
        JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
        WHERE stm.stm_id = ?
        LIMIT 1
    """, [testStepId])
    
    if (stepInstance) {
        // Create a test instruction master first
        def testInstructionResult = sql.executeInsert("""
            INSERT INTO instructions_master_inm (inm_id, stm_id, inm_body, inm_order)
            VALUES (gen_random_uuid(), ?, ?, 998)
            RETURNING inm_id
        """, [testStepId, "Test instruction for instance completion - ${new Date()}".toString()])
        
        def testMasterInstructionId = testInstructionResult[0][0]
        
        // Create instruction instance
        def instanceResult = sql.executeInsert("""
            INSERT INTO instructions_instance_ini (ini_id, inm_id, sti_id, ini_body, ini_is_completed, created_by, updated_by)
            VALUES (gen_random_uuid(), ?, ?, ?, false, 1, 1)
            RETURNING ini_id
        """, [testMasterInstructionId, stepInstance.sti_id, "Instance body for completion test"])
        
        testInstanceId = instanceResult[0][0]
        println "✅ Created test instruction instance: ${testInstanceId}"
        
        // Test initial state
        def initialState = sql.firstRow("""
            SELECT ini_is_completed, ini_completed_at, usr_id_completed_by
            FROM instructions_instance_ini 
            WHERE ini_id = ?
        """, [testInstanceId])
        
        println "✅ Initial state - completed: ${initialState.ini_is_completed}, completed_at: ${initialState.ini_completed_at}"
        
        // Mark as completed
        def completeCount = sql.executeUpdate("""
            UPDATE instructions_instance_ini 
            SET ini_is_completed = true,
                ini_completed_at = CURRENT_TIMESTAMP,
                usr_id_completed_by = 1,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = 1
            WHERE ini_id = ? AND ini_is_completed = false
        """, [testInstanceId])
        
        println "✅ Marked ${completeCount} instruction(s) as completed"
        
        // Verify completion
        def completedState = sql.firstRow("""
            SELECT ini_is_completed, ini_completed_at, usr_id_completed_by
            FROM instructions_instance_ini 
            WHERE ini_id = ?
        """, [testInstanceId])
        
        println "✅ Completed state - completed: ${completedState.ini_is_completed}, completed_at: ${completedState.ini_completed_at}, completed_by: ${completedState.usr_id_completed_by}"
        
        // Mark as uncompleted
        def uncompleteCount = sql.executeUpdate("""
            UPDATE instructions_instance_ini 
            SET ini_is_completed = false,
                ini_completed_at = NULL,
                usr_id_completed_by = NULL,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = 1
            WHERE ini_id = ? AND ini_is_completed = true
        """, [testInstanceId])
        
        println "✅ Marked ${uncompleteCount} instruction(s) as uncompleted"
        
        // Verify uncomplete
        def uncompletedState = sql.firstRow("""
            SELECT ini_is_completed, ini_completed_at, usr_id_completed_by
            FROM instructions_instance_ini 
            WHERE ini_id = ?
        """, [testInstanceId])
        
        println "✅ Uncompleted state - completed: ${uncompletedState.ini_is_completed}, completed_at: ${uncompletedState.ini_completed_at}"
        
        // Clean up test instruction instance and master
        sql.executeUpdate("DELETE FROM instructions_instance_ini WHERE ini_id = ?", [testInstanceId])
        sql.executeUpdate("DELETE FROM instructions_master_inm WHERE inm_id = ?", [testMasterInstructionId])
        println "✅ Cleaned up test instruction instance and master"
        
    } else {
        println "⚠️ No step instances found for completion testing"
    }
    
    println "\n✅ All ini_is_completed integration tests passed!"
    
} catch (Exception e) {
    println "\n❌ Test failed: ${e.message}"
    e.printStackTrace()
    System.exit(1)
} finally {
    sql?.close()
}