#!/usr/bin/env groovy

@Grab('org.postgresql:postgresql:42.7.3')
@Grab('org.codehaus.groovy:groovy-sql:3.0.15')

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

println "🚀 Instructions API Integration Test"
println "======================================"

// --- Test Data Setup ---
def sql = null
def testStepId = UUID.fromString("0360e412-aa59-410a-b7e0-8fbec452949b")
def testMigrationId = null
def testInstructionId = null

try {
    // Connect to database
    sql = Sql.newInstance(dbUrl, dbUser, dbPassword, 'org.postgresql.Driver')
    println "✅ Connected to database"
    
    // Test 1: Check if test step exists
    println "\n🧪 Test 1: Verifying test step exists..."
    def step = sql.firstRow("""
        SELECT stm.stm_id, stm.stm_name, phm.phm_name
        FROM steps_master_stm stm
        JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
        WHERE stm.stm_id = ?
    """, [testStepId])
    
    if (step) {
        println "✅ Found step: ${step.stm_name} in phase: ${step.phm_name}"
        // Get a migration ID from the first available migration
        def migration = sql.firstRow("SELECT mig_id FROM migrations_mig LIMIT 1")
        testMigrationId = migration?.mig_id
    } else {
        println "❌ Test step not found: ${testStepId}"
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
    
    // Test 4: Query instruction instances
    println "\n🧪 Test 4: Querying instruction instances..."
    def instances = sql.rows("""
        SELECT ini.*
        FROM instructions_instance_ini ini
        JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
        WHERE inm.stm_id = ?
    """, [testStepId])
    
    println "✅ Found ${instances.size()} instruction instances"
    
    // Test 5: Update test instruction
    println "\n🧪 Test 5: Updating test instruction..."
    def updateCount = sql.executeUpdate("""
        UPDATE instructions_master_inm 
        SET inm_body = ?
        WHERE inm_id = ?
    """, ["Updated: ${instructionBody}".toString(), testInstructionId])
    
    println "✅ Updated ${updateCount} instruction(s)"
    
    // Test 6: Analytics query
    println "\n🧪 Test 6: Testing analytics query..."
    def stats = sql.firstRow("""
        SELECT 
            COUNT(DISTINCT inm.inm_id) as total_instructions,
            COUNT(DISTINCT ini.ini_id) as total_instances,
            COUNT(DISTINCT CASE WHEN ini.ini_completed_at IS NOT NULL THEN ini.ini_id END) as completed_instances
        FROM instructions_master_inm inm
        LEFT JOIN instructions_instance_ini ini ON inm.inm_id = ini.inm_id
        WHERE inm.stm_id = ?
    """, [testStepId])
    
    println "✅ Analytics - Total: ${stats.total_instructions}, Instances: ${stats.total_instances}, Completed: ${stats.completed_instances}"
    
    // Cleanup: Delete test instruction
    println "\n🧪 Cleanup: Deleting test instruction..."
    def deleteCount = sql.executeUpdate("""
        DELETE FROM instructions_master_inm 
        WHERE inm_id = ?
    """, [testInstructionId])
    
    println "✅ Deleted ${deleteCount} test instruction(s)"
    
    println "\n✅ All integration tests passed!"
    
} catch (Exception e) {
    println "\n❌ Test failed: ${e.message}"
    e.printStackTrace()
    System.exit(1)
} finally {
    sql?.close()
}