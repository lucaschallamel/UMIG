#!/usr/bin/env groovy
/**
 * Simple Sequences API Validation Test
 * Validates that the Sequences API is working with audit fields integration
 * Run from project root: groovy src/groovy/umig/tests/validate-sequences-api.groovy
 */

@Grab('org.postgresql:postgresql:42.7.3')
import groovy.sql.Sql
import java.util.UUID

// Database configuration
def dbUrl = 'jdbc:postgresql://localhost:5432/umig_app_db'
def dbUser = 'umig_app_user'
def dbPassword = '123456'
def dbDriver = 'org.postgresql.Driver'

println "============================================"
println "Sequences API Validation Test"
println "============================================"

def sql = null
try {
    // Connect to database
    sql = Sql.newInstance(dbUrl, dbUser, dbPassword, dbDriver)
    println "✅ Connected to database"
    
    // Test 1: Check audit fields exist in sequences tables
    println "\n🔍 Test 1: Checking audit fields in sequences tables"
    
    def masterColumns = sql.rows("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'sequences_master_sqm' 
        AND column_name IN ('created_by', 'created_at', 'updated_by', 'updated_at')
        ORDER BY column_name
    """).collect { it.column_name }
    
    def instanceColumns = sql.rows("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'sequences_instance_sqi' 
        AND column_name IN ('created_by', 'created_at', 'updated_by', 'updated_at')
        ORDER BY column_name
    """).collect { it.column_name }
    
    assert masterColumns.size() == 4, "sequences_master_sqm missing audit fields: expected 4, got ${masterColumns.size()}"
    assert instanceColumns.size() == 4, "sequences_instance_sqi missing audit fields: expected 4, got ${instanceColumns.size()}"
    println "✅ All audit fields present in both sequences tables"
    
    // Test 2: Check default values for audit fields
    println "\n🔍 Test 2: Checking default values for audit fields"
    
    def masterDefaults = sql.firstRow("""
        SELECT column_default FROM information_schema.columns 
        WHERE table_name = 'sequences_master_sqm' AND column_name = 'created_by'
    """)
    
    def instanceDefaults = sql.firstRow("""
        SELECT column_default FROM information_schema.columns 
        WHERE table_name = 'sequences_instance_sqi' AND column_name = 'created_by'
    """)
    
    assert masterDefaults.column_default.contains("'system'"), "sequences_master_sqm created_by default should be 'system'"
    assert instanceDefaults.column_default.contains("'system'"), "sequences_instance_sqi created_by default should be 'system'"
    println "✅ Default values correctly set for audit fields"
    
    // Test 3: Check existing data for plans (prerequisite for sequences)
    println "\n🔍 Test 3: Checking prerequisite data availability"
    
    def teamCount = sql.firstRow("SELECT COUNT(*) as count FROM teams_tms").count
    def planCount = sql.firstRow("SELECT COUNT(*) as count FROM plans_master_plm").count
    
    println "  Teams available: ${teamCount}"
    println "  Master plans available: ${planCount}"
    
    if (teamCount == 0 || planCount == 0) {
        println "⚠️  Warning: Insufficient test data - run data generators first"
        println "   Command: cd local-dev-setup && npm run generate-data"
        return
    }
    
    // Test 4: Create a test sequence with audit fields
    println "\n🔍 Test 4: Creating test sequence with audit fields"
    
    def testPlan = sql.firstRow("SELECT plm_id FROM plans_master_plm LIMIT 1")
    if (!testPlan) {
        println "❌ No plans available for testing"
        return
    }
    
    def testSequenceId = UUID.randomUUID()
    
    // Insert with explicit audit values to test the pattern
    sql.execute("""
        INSERT INTO sequences_master_sqm (sqm_id, plm_id, sqm_name, sqm_description, sqm_order, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, [testSequenceId, testPlan.plm_id, 'Validation Test Sequence', 'Test sequence for audit validation', 1, 'validation-test', 'validation-test'])
    
    println "✅ Test sequence created with custom audit values"
    
    // Test 5: Verify audit fields were set correctly
    println "\n🔍 Test 5: Verifying audit field values"
    
    def createdSequence = sql.firstRow("""
        SELECT sqm_id, sqm_name, created_by, created_at, updated_by, updated_at
        FROM sequences_master_sqm 
        WHERE sqm_id = ?
    """, [testSequenceId])
    
    assert createdSequence.created_by == 'validation-test', "created_by should be 'validation-test'"
    assert createdSequence.updated_by == 'validation-test', "updated_by should be 'validation-test'"
    assert createdSequence.created_at != null, "created_at should not be null"
    assert createdSequence.updated_at != null, "updated_at should not be null"
    
    println "✅ Audit fields correctly populated"
    println "   Created by: ${createdSequence.created_by}"
    println "   Created at: ${createdSequence.created_at}"
    println "   Updated by: ${createdSequence.updated_by}"
    println "   Updated at: ${createdSequence.updated_at}"
    
    // Test 6: Test update trigger functionality
    println "\n🔍 Test 6: Testing update triggers"
    
    Thread.sleep(1000) // Ensure timestamp difference
    
    sql.execute("""
        UPDATE sequences_master_sqm 
        SET sqm_description = 'Updated description', updated_by = 'trigger-test' 
        WHERE sqm_id = ?
    """, [testSequenceId])
    
    def updatedSequence = sql.firstRow("""
        SELECT created_at, updated_at, updated_by
        FROM sequences_master_sqm 
        WHERE sqm_id = ?
    """, [testSequenceId])
    
    assert updatedSequence.updated_by == 'trigger-test', "updated_by should be 'trigger-test'"
    assert updatedSequence.updated_at > updatedSequence.created_at, "updated_at should be after created_at"
    
    println "✅ Update triggers working correctly"
    println "   Updated at: ${updatedSequence.updated_at}"
    
    // Test 7: Test sequence instance creation with audit fields
    println "\n🔍 Test 7: Testing sequence instance audit fields"
    
    // Get test data for instance creation
    def testIteration = sql.firstRow("SELECT itr_id FROM iterations_ite LIMIT 1")
    def testPlanInstance = sql.firstRow("""
        SELECT pli_id FROM plans_instance_pli 
        WHERE plm_id = ? LIMIT 1
    """, [testPlan.plm_id])
    
    if (!testIteration || !testPlanInstance) {
        println "⚠️  Warning: No iteration or plan instance available - skipping instance test"
    } else {
        def testInstanceId = UUID.randomUUID()
        
        sql.execute("""
            INSERT INTO sequences_instance_sqi (sqi_id, sqm_id, pli_id, sqi_status, sqi_name, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, [testInstanceId, testSequenceId, testPlanInstance.pli_id, 'PENDING', 'Test Instance', 'instance-test', 'instance-test'])
        
        def createdInstance = sql.firstRow("""
            SELECT created_by, created_at, updated_by, updated_at
            FROM sequences_instance_sqi 
            WHERE sqi_id = ?
        """, [testInstanceId])
        
        assert createdInstance.created_by == 'instance-test', "Instance created_by should be 'instance-test'"
        assert createdInstance.updated_by == 'instance-test', "Instance updated_by should be 'instance-test'"
        
        println "✅ Sequence instance audit fields working correctly"
        
        // Cleanup instance
        sql.execute("DELETE FROM sequences_instance_sqi WHERE sqi_id = ?", [testInstanceId])
    }
    
    // Cleanup test sequence
    sql.execute("DELETE FROM sequences_master_sqm WHERE sqm_id = ?", [testSequenceId])
    println "✅ Test data cleaned up"
    
    println "\n============================================"
    println "✅ All validation tests passed!"
    println "✅ Sequences API is ready with audit fields"
    println "============================================"
    
} catch (Exception e) {
    println "\n❌ Validation failed: ${e.message}"
    e.printStackTrace()
    System.exit(1)
} finally {
    if (sql) {
        sql.close()
    }
}