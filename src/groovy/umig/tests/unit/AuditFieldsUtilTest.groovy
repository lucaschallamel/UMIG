package umig.tests.unit

import java.sql.Timestamp
import umig.utils.AuditFieldsUtil

/**
 * Unit tests for AuditFieldsUtil class.
 * Tests all methods for managing audit fields across UMIG database operations.
 * 
 * Run this test in ScriptRunner console or as part of the test suite.
 * 
 * @author UMIG Development Team
 * @since 2025-08-04
 */
class AuditFieldsUtilTest {
    
    static void main(String[] args) {
        def test = new AuditFieldsUtilTest()
        test.runAllTests()
    }
    
    void runAllTests() {
        println "Starting AuditFieldsUtil Unit Tests..."
        println "=" * 60
        
        int passed = 0
        int failed = 0
        
        // Test setCreateAuditFields
        if (testSetCreateAuditFields()) passed++ else failed++
        if (testSetCreateAuditFieldsWithUsername()) passed++ else failed++
        if (testSetCreateAuditFieldsPreservesExisting()) passed++ else failed++
        
        // Test setUpdateAuditFields
        if (testSetUpdateAuditFields()) passed++ else failed++
        if (testSetUpdateAuditFieldsWithUsername()) passed++ else failed++
        if (testSetUpdateAuditFieldsDoesNotAddCreateFields()) passed++ else failed++
        
        // Test validateAuditFields
        if (testValidateAuditFieldsComplete()) passed++ else failed++
        if (testValidateAuditFieldsUpdateOnly()) passed++ else failed++
        if (testValidateAuditFieldsMissingFields()) passed++ else failed++
        
        // Test addAuditFields
        if (testAddAuditFieldsPreservesExisting()) passed++ else failed++
        if (testAddAuditFieldsForUpdate()) passed++ else failed++
        if (testAddAuditFieldsWithEmptyMap()) passed++ else failed++
        
        // Test SQL generation methods
        if (testCreateInsertWithAudit()) passed++ else failed++
        if (testCreateUpdateWithAudit()) passed++ else failed++
        if (testCreateInsertWithAuditCustomUsername()) passed++ else failed++
        
        // Test getCurrentUsername
        if (testGetCurrentUsername()) passed++ else failed++
        if (testGetCurrentUsernameWithContext()) passed++ else failed++
        
        // Test formatAuditInfo
        if (testFormatAuditInfo()) passed++ else failed++
        if (testFormatAuditInfoWithNulls()) passed++ else failed++
        
        // Test getDefaultAuditFields
        if (testGetDefaultAuditFields()) passed++ else failed++
        if (testGetDefaultAuditFieldsWithUsername()) passed++ else failed++
        
        // Test integration helpers
        if (testPrepareInsertParams()) passed++ else failed++
        if (testPrepareUpdateParams()) passed++ else failed++
        
        // Test edge cases
        if (testNullParameterMap()) passed++ else failed++
        if (testEmptyStringUsername()) passed++ else failed++
        if (testLongUsername()) passed++ else failed++
        if (testTimestampPrecision()) passed++ else failed++
        if (testConcurrentTimestamps()) passed++ else failed++
        if (testDatabaseUtilIntegration()) passed++ else failed++
        
        println "=" * 60
        println "Test Results: ${passed} passed, ${failed} failed"
        println "Overall: ${failed == 0 ? 'SUCCESS ✅' : 'FAILURE ❌'}"
        
        if (failed > 0) {
            System.exit(1)
        }
    }
    
    // Test setCreateAuditFields
    boolean testSetCreateAuditFields() {
        try {
            Map<String, Object> params = [:]
            AuditFieldsUtil.setCreateAuditFields(params)
            
            assert params.created_by == 'system' : "created_by should be 'system'"
            assert params.created_at instanceof Timestamp : "created_at should be Timestamp"
            assert params.updated_by == 'system' : "updated_by should be 'system'"
            assert params.updated_at instanceof Timestamp : "updated_at should be Timestamp"
            assert params.created_at == params.updated_at : "Timestamps should match for new records"
            
            println "✅ testSetCreateAuditFields passed"
            return true
        } catch (AssertionError e) {
            println "❌ testSetCreateAuditFields failed: ${e.message}"
            return false
        }
    }
    
    boolean testSetCreateAuditFieldsWithUsername() {
        try {
            Map<String, Object> params = [:]
            AuditFieldsUtil.setCreateAuditFields(params, 'testuser')
            
            assert params.created_by == 'testuser' : "created_by should be 'testuser'"
            assert params.updated_by == 'testuser' : "updated_by should be 'testuser'"
            
            println "✅ testSetCreateAuditFieldsWithUsername passed"
            return true
        } catch (AssertionError e) {
            println "❌ testSetCreateAuditFieldsWithUsername failed: ${e.message}"
            return false
        }
    }
    
    boolean testSetCreateAuditFieldsPreservesExisting() {
        try {
            Map<String, Object> params = [name: 'test', value: 123]
            AuditFieldsUtil.setCreateAuditFields(params)
            
            assert params.name == 'test' : "Existing field 'name' should be preserved"
            assert params.value == 123 : "Existing field 'value' should be preserved"
            assert params.created_by != null : "Audit fields should be added"
            
            println "✅ testSetCreateAuditFieldsPreservesExisting passed"
            return true
        } catch (AssertionError e) {
            println "❌ testSetCreateAuditFieldsPreservesExisting failed: ${e.message}"
            return false
        }
    }
    
    // Test setUpdateAuditFields
    boolean testSetUpdateAuditFields() {
        try {
            Map<String, Object> params = [:]
            AuditFieldsUtil.setUpdateAuditFields(params)
            
            assert params.updated_by == 'system' : "updated_by should be 'system'"
            assert params.updated_at instanceof Timestamp : "updated_at should be Timestamp"
            assert !params.containsKey('created_by') : "Should not add created_by"
            assert !params.containsKey('created_at') : "Should not add created_at"
            
            println "✅ testSetUpdateAuditFields passed"
            return true
        } catch (AssertionError e) {
            println "❌ testSetUpdateAuditFields failed: ${e.message}"
            return false
        }
    }
    
    boolean testSetUpdateAuditFieldsWithUsername() {
        try {
            Map<String, Object> params = [:]
            AuditFieldsUtil.setUpdateAuditFields(params, 'updateuser')
            
            assert params.updated_by == 'updateuser' : "updated_by should be 'updateuser'"
            
            println "✅ testSetUpdateAuditFieldsWithUsername passed"
            return true
        } catch (AssertionError e) {
            println "❌ testSetUpdateAuditFieldsWithUsername failed: ${e.message}"
            return false
        }
    }
    
    boolean testSetUpdateAuditFieldsDoesNotAddCreateFields() {
        try {
            Map<String, Object> params = [created_by: 'original', created_at: new Timestamp(1000)]
            String originalCreatedBy = params.created_by as String
            Timestamp originalCreatedAt = params.created_at as Timestamp
            
            AuditFieldsUtil.setUpdateAuditFields(params)
            
            assert params.created_by == originalCreatedBy : "created_by should not be modified"
            assert params.created_at == originalCreatedAt : "created_at should not be modified"
            
            println "✅ testSetUpdateAuditFieldsDoesNotAddCreateFields passed"
            return true
        } catch (AssertionError e) {
            println "❌ testSetUpdateAuditFieldsDoesNotAddCreateFields failed: ${e.message}"
            return false
        }
    }
    
    // Test validateAuditFields
    boolean testValidateAuditFieldsComplete() {
        try {
            Map<String, Object> params = [
                created_by: 'test',
                created_at: new Timestamp(System.currentTimeMillis()),
                updated_by: 'test',
                updated_at: new Timestamp(System.currentTimeMillis())
            ]
            
            assert AuditFieldsUtil.validateAuditFields(params) : "Should validate complete audit fields"
            assert AuditFieldsUtil.validateAuditFields(params, false) : "Should validate with checkUpdate=false"
            
            println "✅ testValidateAuditFieldsComplete passed"
            return true
        } catch (AssertionError e) {
            println "❌ testValidateAuditFieldsComplete failed: ${e.message}"
            return false
        }
    }
    
    boolean testValidateAuditFieldsUpdateOnly() {
        try {
            Map<String, Object> params = [
                updated_by: 'test',
                updated_at: new Timestamp(System.currentTimeMillis())
            ]
            
            assert AuditFieldsUtil.validateAuditFields(params, true) : "Should validate update-only fields"
            assert !AuditFieldsUtil.validateAuditFields(params, false) : "Should fail full validation"
            
            println "✅ testValidateAuditFieldsUpdateOnly passed"
            return true
        } catch (AssertionError e) {
            println "❌ testValidateAuditFieldsUpdateOnly failed: ${e.message}"
            return false
        }
    }
    
    boolean testValidateAuditFieldsMissingFields() {
        try {
            Map<String, Object> params = [created_by: 'test']
            
            assert !AuditFieldsUtil.validateAuditFields(params) : "Should fail with missing fields"
            assert !AuditFieldsUtil.validateAuditFields(params, true) : "Should fail update validation"
            
            println "✅ testValidateAuditFieldsMissingFields passed"
            return true
        } catch (AssertionError e) {
            println "❌ testValidateAuditFieldsMissingFields failed: ${e.message}"
            return false
        }
    }
    
    // Test addAuditFields
    boolean testAddAuditFieldsPreservesExisting() {
        try {
            Timestamp existingTime = new Timestamp(1000)
            Map<String, Object> params = [
                created_by: 'existing',
                created_at: existingTime,
                data: 'test'
            ]
            
            AuditFieldsUtil.addAuditFields(params)
            
            assert params.created_by == 'existing' : "Should preserve existing created_by"
            assert params.created_at == existingTime : "Should preserve existing created_at"
            assert params.updated_by != null : "Should add updated_by"
            assert params.updated_at != null : "Should add updated_at"
            
            println "✅ testAddAuditFieldsPreservesExisting passed"
            return true
        } catch (AssertionError e) {
            println "❌ testAddAuditFieldsPreservesExisting failed: ${e.message}"
            return false
        }
    }
    
    boolean testAddAuditFieldsForUpdate() {
        try {
            Map<String, Object> params = [data: 'test']
            AuditFieldsUtil.addAuditFields(params, 'updater', true)
            
            assert !params.containsKey('created_by') : "Should not add created_by for update"
            assert !params.containsKey('created_at') : "Should not add created_at for update"
            assert params.updated_by == 'updater' : "Should add updated_by"
            assert params.updated_at != null : "Should add updated_at"
            
            println "✅ testAddAuditFieldsForUpdate passed"
            return true
        } catch (AssertionError e) {
            println "❌ testAddAuditFieldsForUpdate failed: ${e.message}"
            return false
        }
    }
    
    boolean testAddAuditFieldsWithEmptyMap() {
        try {
            Map<String, Object> params = [:]
            AuditFieldsUtil.addAuditFields(params)
            
            assert params.size() == 4 : "Should add all 4 audit fields"
            assert params.created_by == 'system'
            assert params.updated_by == 'system'
            
            println "✅ testAddAuditFieldsWithEmptyMap passed"
            return true
        } catch (AssertionError e) {
            println "❌ testAddAuditFieldsWithEmptyMap failed: ${e.message}"
            return false
        }
    }
    
    // Test SQL generation methods
    boolean testCreateInsertWithAudit() {
        try {
            Map<String, Object> fields = [name: 'test', value: 123]
            String sql = AuditFieldsUtil.createInsertWithAudit('test_table', fields)
            
            assert sql.contains('INSERT INTO test_table') : "Should contain INSERT statement"
            assert sql.contains('created_by') : "Should include created_by"
            assert sql.contains('created_at') : "Should include created_at"
            assert sql.contains('updated_by') : "Should include updated_by"
            assert sql.contains('updated_at') : "Should include updated_at"
            assert sql.contains(':name') : "Should include original fields"
            
            println "✅ testCreateInsertWithAudit passed"
            return true
        } catch (AssertionError e) {
            println "❌ testCreateInsertWithAudit failed: ${e.message}"
            return false
        }
    }
    
    boolean testCreateUpdateWithAudit() {
        try {
            Map<String, Object> fields = [name: 'updated']
            String sql = AuditFieldsUtil.createUpdateWithAudit('test_table', fields, 'id = :id')
            
            assert sql.contains('UPDATE test_table') : "Should contain UPDATE statement"
            assert sql.contains('updated_by = :updated_by') : "Should include updated_by"
            assert sql.contains('updated_at = :updated_at') : "Should include updated_at"
            assert sql.contains('WHERE id = :id') : "Should include WHERE clause"
            
            println "✅ testCreateUpdateWithAudit passed"
            return true
        } catch (AssertionError e) {
            println "❌ testCreateUpdateWithAudit failed: ${e.message}"
            return false
        }
    }
    
    boolean testCreateInsertWithAuditCustomUsername() {
        try {
            Map<String, Object> fields = [name: 'test']
            String sql = AuditFieldsUtil.createInsertWithAudit('test_table', fields, 'customuser')
            
            // The SQL contains placeholders, but the method should have set up the audit fields
            assert sql.contains('created_by') : "Should include created_by field"
            
            println "✅ testCreateInsertWithAuditCustomUsername passed"
            return true
        } catch (AssertionError e) {
            println "❌ testCreateInsertWithAuditCustomUsername failed: ${e.message}"
            return false
        }
    }
    
    // Test getCurrentUsername
    boolean testGetCurrentUsername() {
        try {
            String username = AuditFieldsUtil.getCurrentUsername()
            
            assert username == 'system' : "Default should be 'system'"
            
            println "✅ testGetCurrentUsername passed"
            return true
        } catch (AssertionError e) {
            println "❌ testGetCurrentUsername failed: ${e.message}"
            return false
        }
    }
    
    boolean testGetCurrentUsernameWithContext() {
        try {
            Map<String, Object> mockContext = [user: 'contextuser']
            String username = AuditFieldsUtil.getCurrentUsername(mockContext)
            
            // Currently returns 'system' as TODO implementation
            assert username == 'system' : "Should return 'system' until implemented"
            
            println "✅ testGetCurrentUsernameWithContext passed"
            return true
        } catch (AssertionError e) {
            println "❌ testGetCurrentUsernameWithContext failed: ${e.message}"
            return false
        }
    }
    
    // Test formatAuditInfo
    boolean testFormatAuditInfo() {
        try {
            Map<String, Object> params = [
                created_by: 'creator',
                created_at: new Timestamp(System.currentTimeMillis()),
                updated_by: 'updater',
                updated_at: new Timestamp(System.currentTimeMillis())
            ]
            
            String info = AuditFieldsUtil.formatAuditInfo(params)
            
            assert info.contains('creator') : "Should contain created_by"
            assert info.contains('updater') : "Should contain updated_by"
            assert info.contains('Created:') : "Should have Created label"
            assert info.contains('Updated:') : "Should have Updated label"
            
            println "✅ testFormatAuditInfo passed"
            return true
        } catch (AssertionError e) {
            println "❌ testFormatAuditInfo failed: ${e.message}"
            return false
        }
    }
    
    boolean testFormatAuditInfoWithNulls() {
        try {
            Map<String, Object> params = [:]
            String info = AuditFieldsUtil.formatAuditInfo(params)
            
            assert info.contains('null') : "Should handle null values"
            
            println "✅ testFormatAuditInfoWithNulls passed"
            return true
        } catch (AssertionError e) {
            println "❌ testFormatAuditInfoWithNulls failed: ${e.message}"
            return false
        }
    }
    
    // Test getDefaultAuditFields
    boolean testGetDefaultAuditFields() {
        try {
            Map<String, Object> fields = AuditFieldsUtil.getDefaultAuditFields()
            
            assert fields.size() == 4 : "Should return 4 audit fields"
            assert fields.created_by == 'system'
            assert fields.updated_by == 'system'
            assert fields.created_at != null
            assert fields.updated_at != null
            
            println "✅ testGetDefaultAuditFields passed"
            return true
        } catch (AssertionError e) {
            println "❌ testGetDefaultAuditFields failed: ${e.message}"
            return false
        }
    }
    
    boolean testGetDefaultAuditFieldsWithUsername() {
        try {
            Map<String, Object> fields = AuditFieldsUtil.getDefaultAuditFields('testuser')
            
            assert fields.created_by == 'testuser'
            assert fields.updated_by == 'testuser'
            
            println "✅ testGetDefaultAuditFieldsWithUsername passed"
            return true
        } catch (AssertionError e) {
            println "❌ testGetDefaultAuditFieldsWithUsername failed: ${e.message}"
            return false
        }
    }
    
    // Test integration helpers
    boolean testPrepareInsertParams() {
        try {
            Map<String, Object> params = [name: 'test', value: 123]
            Map<String, Object> result = AuditFieldsUtil.prepareInsertParams(params)
            
            assert result.name == 'test' : "Should preserve original fields"
            assert result.created_by == 'system' : "Should add audit fields"
            assert result == params : "Should modify in place"
            
            println "✅ testPrepareInsertParams passed"
            return true
        } catch (AssertionError e) {
            println "❌ testPrepareInsertParams failed: ${e.message}"
            return false
        }
    }
    
    boolean testPrepareUpdateParams() {
        try {
            Map<String, Object> params = [name: 'updated']
            Map<String, Object> result = AuditFieldsUtil.prepareUpdateParams(params, 'updater')
            
            assert result.name == 'updated' : "Should preserve original fields"
            assert result.updated_by == 'updater' : "Should add update audit fields"
            assert !result.containsKey('created_by') : "Should not add create fields"
            
            println "✅ testPrepareUpdateParams passed"
            return true
        } catch (AssertionError e) {
            println "❌ testPrepareUpdateParams failed: ${e.message}"
            return false
        }
    }
    
    // Test edge cases
    boolean testNullParameterMap() {
        try {
            // This should handle gracefully or throw meaningful error
            Map<String, Object> params = null
            try {
                AuditFieldsUtil.setCreateAuditFields(params)
                assert false : "Should handle null params"
            } catch (NullPointerException e) {
                // Expected behavior - null params should throw NPE
                assert true
            }
            
            println "✅ testNullParameterMap passed"
            return true
        } catch (AssertionError e) {
            println "❌ testNullParameterMap failed: ${e.message}"
            return false
        }
    }
    
    boolean testEmptyStringUsername() {
        try {
            Map<String, Object> params = [:]
            AuditFieldsUtil.setCreateAuditFields(params, '')
            
            assert params.created_by == 'system' : "Empty string should default to 'system'"
            
            println "✅ testEmptyStringUsername passed"
            return true
        } catch (AssertionError e) {
            println "❌ testEmptyStringUsername failed: ${e.message}"
            return false
        }
    }
    
    boolean testLongUsername() {
        try {
            String longUsername = 'a' * 300 // Exceeds VARCHAR(255)
            Map<String, Object> params = [:]
            AuditFieldsUtil.setCreateAuditFields(params, longUsername)
            
            // Should accept but database will truncate/error
            assert params.created_by == longUsername : "Should accept long username"
            assert (params.created_by as String).length() == 300 : "Util doesn't truncate"
            
            println "✅ testLongUsername passed"
            return true
        } catch (AssertionError e) {
            println "❌ testLongUsername failed: ${e.message}"
            return false
        }
    }
    
    boolean testTimestampPrecision() {
        try {
            Map<String, Object> params1 = [:]
            Map<String, Object> params2 = [:]
            
            Thread.sleep(10) // Ensure different timestamps
            
            AuditFieldsUtil.setCreateAuditFields(params1)
            Thread.sleep(10)
            AuditFieldsUtil.setCreateAuditFields(params2)
            
            assert params1.created_at != params2.created_at : "Timestamps should differ"
            
            println "✅ testTimestampPrecision passed"
            return true
        } catch (AssertionError e) {
            println "❌ testTimestampPrecision failed: ${e.message}"
            return false
        }
    }
    
    boolean testConcurrentTimestamps() {
        try {
            Map<String, Object> params = [:]
            AuditFieldsUtil.setCreateAuditFields(params)
            
            assert ((Timestamp) params.created_at).equals((Timestamp) params.updated_at) : "Create timestamps should match"
            
            Thread.sleep(100)
            AuditFieldsUtil.setUpdateAuditFields(params)
            
            assert ((Timestamp) params.updated_at).after((Timestamp) params.created_at) : "Update should be after create"
            
            println "✅ testConcurrentTimestamps passed"
            return true
        } catch (AssertionError e) {
            println "❌ testConcurrentTimestamps failed: ${e.message}"
            return false
        }
    }
    
    boolean testDatabaseUtilIntegration() {
        try {
            // Test that our util works with DatabaseUtil patterns
            Map<String, Object> params = [
                plm_id: 'test-id',
                plm_name: 'Test Plan',
                plm_description: 'Test Description'
            ]
            
            // Simulate DatabaseUtil.withSql pattern
            Map<String, Object> preparedParams = AuditFieldsUtil.prepareInsertParams(params)
            
            assert preparedParams.containsKey('plm_id') : "Original fields preserved"
            assert preparedParams.containsKey('created_by') : "Audit fields added"
            assert preparedParams.size() == 7 : "Should have 3 original + 4 audit fields"
            
            println "✅ testDatabaseUtilIntegration passed"
            return true
        } catch (AssertionError e) {
            println "❌ testDatabaseUtilIntegration failed: ${e.message}"
            return false
        }
    }
}