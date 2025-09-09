#!/usr/bin/env groovy

package umig.tests.unit

import java.util.UUID
import groovy.transform.CompileStatic
import groovy.transform.TypeCheckingMode

/**
 * Unit test for SystemConfigurationRepository - Standalone Groovy Test
 * Converted from Spock to standard Groovy per ADR-036
 * Self-contained with embedded mock classes for ScriptRunner compatibility
 * Uses the most basic mocking approach to avoid MetaClass issues
 */

// ==================== MOCK CLASSES ====================

/**
 * Mock SQL class that simulates database operations
 * Explicit typing for static type checker compatibility
 */
class MockSql {
    Map<String, Object> mockResults = [:]
    String queryCaptured = null
    Object paramsCaptured = null
    String methodCalled = null
    
    List<Map<String, Object>> rows(String query, Map<String, Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'rows'
        return (mockResults['rows'] as List<Map<String, Object>>) ?: []
    }
    
    List<Map<String, Object>> rows(String query, List<Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'rows'
        return (mockResults['rows'] as List<Map<String, Object>>) ?: []
    }
    
    List<Map<String, Object>> rows(String query) {
        queryCaptured = query
        paramsCaptured = [:]
        methodCalled = 'rows'
        return (mockResults['rows'] as List<Map<String, Object>>) ?: []
    }
    
    Map<String, Object> firstRow(String query, Map<String, Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'firstRow'
        return mockResults['firstRow'] as Map<String, Object>
    }
    
    Map<String, Object> firstRow(String query, List<Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'firstRow'
        return mockResults['firstRow'] as Map<String, Object>
    }
    
    Map<String, Object> firstRow(String query) {
        queryCaptured = query
        paramsCaptured = [:]
        methodCalled = 'firstRow'
        return mockResults['firstRow'] as Map<String, Object>
    }
    
    int executeUpdate(String query, Map<String, Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'executeUpdate'
        return (mockResults['executeUpdate'] as Integer) ?: 1
    }
    
    int executeUpdate(String query, List<Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'executeUpdate'
        return (mockResults['executeUpdate'] as Integer) ?: 1
    }
    
    int executeUpdate(String query) {
        queryCaptured = query
        paramsCaptured = [:]
        methodCalled = 'executeUpdate'
        return (mockResults['executeUpdate'] as Integer) ?: 1
    }
    
    boolean execute(String query, Map<String, Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'execute'
        return true
    }
    
    boolean execute(String query, List<Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'execute'
        return true
    }
    
    boolean execute(String query) {
        queryCaptured = query
        paramsCaptured = [:]
        methodCalled = 'execute'
        return true
    }
    
    void setMockResult(String method, Object result) {
        mockResults[method] = result
    }
}

/**
 * Mock DatabaseUtil for testing - completely self-contained
 */
class DatabaseUtil {
    static MockSql mockSql = new MockSql()
    
    static <T> T withSql(Closure<T> closure) {
        return closure(mockSql)
    }
    
    static void resetMock() {
        mockSql = new MockSql()
    }
}

// ==================== REPOSITORY IMPLEMENTATION ====================

/**
 * Repository for SYSTEM_CONFIGURATION data following UMIG patterns.
 * Embedded implementation for self-contained testing.
 */
class SystemConfigurationRepository {

    /**
     * Finds active system configurations for a specific environment
     */
    List<Map<String, Object>> findActiveConfigurationsByEnvironment(Integer envId) {
        if (!envId) {
            throw new IllegalArgumentException("Environment ID cannot be null")
        }
        
        return DatabaseUtil.withSql { MockSql sql ->
            return sql.rows('''
                SELECT 
                    scf.scf_id,
                    scf.env_id,
                    scf.scf_key,
                    scf.scf_category,
                    scf.scf_value,
                    scf.scf_description,
                    scf.scf_is_active,
                    scf.scf_is_system_managed,
                    scf.scf_data_type,
                    env.env_code,
                    env.env_name
                FROM system_configuration_scf scf
                JOIN environment_env env ON scf.env_id = env.env_id
                WHERE scf.env_id = :envId 
                  AND scf.scf_is_active = true
                ORDER BY scf.scf_category, scf.scf_key
            ''', [envId: envId] as Map<String, Object>)
        }
    }

    /**
     * Finds configurations by category for a specific environment
     */
    List<Map<String, Object>> findConfigurationsByCategory(String category, Integer envId) {
        if (!category) {
            throw new IllegalArgumentException("Category cannot be null or empty")
        }
        if (!envId) {
            throw new IllegalArgumentException("Environment ID cannot be null")
        }

        return DatabaseUtil.withSql { MockSql sql ->
            return sql.rows('''
                SELECT scf_key, scf_category, scf_value, env_id
                FROM system_configuration_scf
                WHERE scf_category = :category 
                  AND env_id = :envId
                  AND scf_is_active = true
                ORDER BY scf_key
            ''', [category: category, envId: envId] as Map<String, Object>)
        }
    }

    /**
     * Finds a specific configuration by key and environment
     */
    Map<String, Object> findConfigurationByKey(String key, Integer envId) {
        if (!key) {
            throw new IllegalArgumentException("Configuration key cannot be null or empty")
        }
        if (!envId) {
            throw new IllegalArgumentException("Environment ID cannot be null")
        }

        return DatabaseUtil.withSql { MockSql sql ->
            return sql.firstRow('''
                SELECT scf_id, scf_key, scf_value, env_id
                FROM system_configuration_scf
                WHERE scf_key = :key 
                  AND env_id = :envId
                  AND scf_is_active = true
            ''', [key: key, envId: envId] as Map<String, Object>)
        }
    }

    /**
     * Creates a new system configuration
     */
    UUID createConfiguration(Map<String, Object> params, String createdBy) {
        def scfId = UUID.randomUUID()
        
        DatabaseUtil.withSql { MockSql sql ->
            sql.executeUpdate('''
                INSERT INTO system_configuration_scf (
                    scf_id, env_id, scf_key, scf_category, scf_value, 
                    scf_description, scf_is_active, scf_is_system_managed, 
                    scf_data_type, created_by, created_at, updated_by, updated_at
                ) VALUES (
                    :scfId, :envId, :scfKey, :scfCategory, :scfValue,
                    :scfDescription, :scfIsActive, :scfIsSystemManaged,
                    :scfDataType, :createdBy, NOW(), :createdBy, NOW()
                )
            ''', [
                scfId: scfId,
                envId: params.envId,
                scfKey: params.scfKey,
                scfCategory: params.scfCategory,
                scfValue: params.scfValue,
                scfDescription: params.scfDescription,
                scfIsActive: params.scfIsActive,
                scfIsSystemManaged: params.scfIsSystemManaged,
                scfDataType: params.scfDataType,
                createdBy: createdBy
            ] as Map<String, Object>)
        }
        
        return scfId
    }

    /**
     * Updates configuration value with audit logging
     */
    boolean updateConfigurationValue(UUID scfId, String newValue, String updatedBy, String changeReason = null) {
        return DatabaseUtil.withSql { MockSql sql ->
            def updateCount = sql.executeUpdate('''
                UPDATE system_configuration_scf 
                SET scf_value = :newValue, 
                    updated_by = :updatedBy, 
                    updated_at = NOW()
                WHERE scf_id = :scfId
            ''', [
                newValue: newValue,
                updatedBy: updatedBy,
                scfId: scfId
            ] as Map<String, Object>)
            
            return updateCount > 0
        }
    }

    /**
     * Updates configuration by key and environment
     */
    boolean updateConfigurationByKey(String key, Integer envId, String newValue, String updatedBy) {
        return DatabaseUtil.withSql { MockSql sql ->
            def updateCount = sql.executeUpdate('''
                UPDATE system_configuration_scf 
                SET scf_value = :newValue, 
                    updated_by = :updatedBy, 
                    updated_at = NOW()
                WHERE scf_key = :key 
                  AND env_id = :envId
            ''', [
                newValue: newValue,
                updatedBy: updatedBy,
                key: key,
                envId: envId
            ] as Map<String, Object>)
            
            return updateCount > 0
        }
    }

    /**
     * Validates configuration value based on data type and optional pattern
     */
    Map<String, Object> validateConfigurationValue(String value, String dataType, String pattern = null) {
        List<String> errors = []
        boolean isValid = true

        if (!value) {
            return [isValid: true, errors: errors] as Map<String, Object>
        }

        switch (dataType?.toUpperCase()) {
            case 'INTEGER':
                try {
                    Integer.parseInt(value)
                } catch (NumberFormatException e) {
                    errors << ("Value '${value}' is not a valid integer" as String)
                    isValid = false
                }
                break
                
            case 'BOOLEAN':
                if (!(value.toLowerCase() in ['true', 'false'])) {
                    errors << ("Value '${value}' is not a valid boolean (must be 'true' or 'false')" as String)
                    isValid = false
                }
                break
                
            case 'URL':
                try {
                    new URL(value)
                } catch (MalformedURLException e) {
                    errors << ("Value '${value}' is not a valid URL" as String)
                    isValid = false
                }
                break
                
            case 'JSON':
                try {
                    new groovy.json.JsonSlurper().parseText(value)
                } catch (Exception e) {
                    errors << ("Value '${value}' is not valid JSON" as String)
                    isValid = false
                }
                break
        }

        if (pattern && isValid) {
            if (!(value ==~ pattern)) {
                errors << ("Value '${value}' does not match required pattern: ${pattern}" as String)
                isValid = false
            }
        }

        return [isValid: isValid, errors: errors] as Map<String, Object>
    }

    /**
     * Finds configuration history for audit trail
     */
    List<Map<String, Object>> findConfigurationHistory(UUID scfId) {
        return DatabaseUtil.withSql { MockSql sql ->
            return sql.rows('''
                SELECT sch_id, scf_id, sch_old_value, sch_new_value, 
                       sch_change_reason, sch_change_type, created_by, created_at
                FROM system_configuration_history_sch
                WHERE scf_id = :scfId
                ORDER BY created_at DESC
            ''', [scfId: scfId] as Map<String, Object>)
        }
    }

    /**
     * Bulk updates multiple configurations
     */
    int bulkUpdateConfigurations(List<Map<String, Object>> configurations, String updatedBy) {
        int updateCount = 0
        
        DatabaseUtil.withSql { MockSql sql ->
            configurations.each { Map<String, Object> config ->
                def count = sql.executeUpdate('''
                    UPDATE system_configuration_scf 
                    SET scf_value = :scfValue, 
                        scf_description = :scfDescription,
                        updated_by = :updatedBy, 
                        updated_at = NOW()
                    WHERE scf_key = :scfKey 
                      AND env_id = :envId
                ''', [
                    scfValue: config.scfValue,
                    scfDescription: config.scfDescription,
                    updatedBy: updatedBy,
                    scfKey: config.scfKey,
                    envId: config.envId
                ] as Map<String, Object>)
                updateCount += count
            }
        }
        
        return updateCount
    }

    /**
     * Finds Confluence macro location configurations
     */
    List<Map<String, Object>> findConfluenceMacroLocations(Integer envId) {
        return DatabaseUtil.withSql { MockSql sql ->
            return sql.rows('''
                SELECT scf_key, scf_category
                FROM system_configuration_scf
                WHERE env_id = :envId 
                  AND scf_category = 'MACRO_LOCATION'
                  AND scf_is_active = true
                ORDER BY scf_key
            ''', [envId: envId] as Map<String, Object>)
        }
    }

    /**
     * Finds Confluence configuration for environment with structured output
     */
    Map<String, Object> findConfluenceConfigurationForEnvironment(Integer envId) {
        List<Map<String, Object>> configs = DatabaseUtil.withSql { MockSql sql ->
            return sql.rows('''
                SELECT scf_key, scf_value, scf_data_type, scf_description, scf_is_system_managed
                FROM system_configuration_scf
                WHERE env_id = :envId 
                  AND scf_category = 'MACRO_LOCATION'
                  AND scf_is_active = true
                ORDER BY scf_key
            ''', [envId: envId] as Map<String, Object>)
        }

        Map<String, Object> result = [
            envId: envId,
            configurations: [:] as Map<String, Map<String, Object>>
        ]

        configs.each { Map<String, Object> config ->
            (result.configurations as Map<String, Map<String, Object>>)[config.scf_key as String] = [
                value: config.scf_value,
                dataType: config.scf_data_type,
                description: config.scf_description,
                isSystemManaged: config.scf_is_system_managed
            ] as Map<String, Object>
        }

        return result
    }

    /**
     * Sets configuration active/inactive status
     */
    boolean setConfigurationActiveStatus(UUID scfId, Boolean isActive, String updatedBy) {
        return DatabaseUtil.withSql { MockSql sql ->
            def updateCount = sql.executeUpdate('''
                UPDATE system_configuration_scf 
                SET scf_is_active = :isActive, 
                    updated_by = :updatedBy, 
                    updated_at = NOW()
                WHERE scf_id = :scfId
            ''', [
                isActive: isActive,
                updatedBy: updatedBy,
                scfId: scfId
            ] as Map<String, Object>)
            
            return updateCount > 0
        }
    }
}

// ==================== TEST CLASS ====================

@CompileStatic(TypeCheckingMode.SKIP)
class SystemConfigurationRepositoryTestClass {

    SystemConfigurationRepository repository = new SystemConfigurationRepository()
    
    void testFindActiveConfigurationsByEnvironment() {
        println "Testing findActiveConfigurationsByEnvironment..."
        
        def envId = 1
        def expectedConfigs = [
            [
                scf_id: UUID.randomUUID(),
                env_id: envId,
                scf_key: "stepview.confluence.space.key",
                scf_category: "MACRO_LOCATION",
                scf_value: "UMIG-DEV",
                scf_description: "Development space key",
                scf_is_active: true,
                scf_is_system_managed: true,
                scf_data_type: "STRING",
                env_code: "DEV",
                env_name: "Development"
            ]
        ]
        
        DatabaseUtil.mockSql.setMockResult('rows', expectedConfigs)
        def result = repository.findActiveConfigurationsByEnvironment(envId)
        
        assert result == expectedConfigs
        println "✓ findActiveConfigurationsByEnvironment test passed"
    }
    
    void testFindConfigurationsByCategory() {
        println "Testing findConfigurationsByCategory..."
        
        def category = "MACRO_LOCATION"
        def envId = 1
        def expectedConfigs = [
            [
                scf_key: "stepview.confluence.space.key",
                scf_category: category,
                scf_value: "UMIG-DEV",
                env_id: envId
            ],
            [
                scf_key: "stepview.confluence.page.id",
                scf_category: category,
                scf_value: "12345678",
                env_id: envId
            ]
        ]
        
        DatabaseUtil.mockSql.setMockResult('rows', expectedConfigs)
        def result = repository.findConfigurationsByCategory(category, envId)
        
        assert result == expectedConfigs
        println "✓ findConfigurationsByCategory test passed"
    }
    
    void testFindConfigurationByKey() {
        println "Testing findConfigurationByKey..."
        
        def key = "stepview.confluence.space.key"
        def envId = 1
        def expectedConfig = [
            scf_id: UUID.randomUUID(),
            scf_key: key,
            scf_value: "UMIG-DEV",
            env_id: envId
        ]
        
        DatabaseUtil.mockSql.setMockResult('firstRow', expectedConfig)
        def result = repository.findConfigurationByKey(key, envId)
        
        assert result == expectedConfig
        println "✓ findConfigurationByKey test passed"
    }
    
    void testCreateConfiguration() {
        println "Testing createConfiguration..."
        
        Map<String, Object> params = [
            envId: 1,
            scfKey: "test.config.key",
            scfCategory: "SYSTEM_SETTING",
            scfValue: "test value",
            scfDescription: "Test configuration",
            scfIsActive: true,
            scfIsSystemManaged: false,
            scfDataType: "STRING"
        ] as Map<String, Object>
        def createdBy = "test_user"
        
        DatabaseUtil.resetMock() // Ensure clean state
        def result = repository.createConfiguration(params, createdBy)
        
        assert result instanceof UUID
        println "✓ createConfiguration test passed"
    }
    
    void testUpdateConfigurationValue() {
        println "Testing updateConfigurationValue..."
        
        def scfId = UUID.randomUUID()
        def newValue = "updated value"
        def updatedBy = "test_user"
        def changeReason = "Test update"
        
        DatabaseUtil.mockSql.setMockResult('executeUpdate', 1)
        def result = repository.updateConfigurationValue(scfId, newValue, updatedBy, changeReason)
        
        assert result == true
        println "✓ updateConfigurationValue test passed"
    }
    
    void testUpdateConfigurationByKey() {
        println "Testing updateConfigurationByKey..."
        
        def key = "test.config.key"
        def envId = 1
        def newValue = "updated value"
        def updatedBy = "test_user"
        
        DatabaseUtil.mockSql.setMockResult('executeUpdate', 1)
        def result = repository.updateConfigurationByKey(key, envId, newValue, updatedBy)
        
        assert result == true
        println "✓ updateConfigurationByKey test passed"
    }
    
    void testValidateConfigurationValueInteger() {
        println "Testing validateConfigurationValue for INTEGER..."
        
        Map<String, Object> validResult = repository.validateConfigurationValue("123", "INTEGER")
        assert (validResult.isValid as Boolean) == true
        assert ((validResult.errors as List<String>)).isEmpty()
        
        Map<String, Object> invalidResult = repository.validateConfigurationValue("abc", "INTEGER")
        assert (invalidResult.isValid as Boolean) == false
        assert ((invalidResult.errors as List<String>)).size() == 1
        assert ((invalidResult.errors as List<String>)[0]).contains("not a valid integer")
        
        println "✓ validateConfigurationValue INTEGER test passed"
    }
    
    void testValidateConfigurationValueBoolean() {
        println "Testing validateConfigurationValue for BOOLEAN..."
        
        Map<String, Object> validTrue = repository.validateConfigurationValue("true", "BOOLEAN")
        assert (validTrue.isValid as Boolean) == true
        
        Map<String, Object> validFalse = repository.validateConfigurationValue("false", "BOOLEAN")
        assert (validFalse.isValid as Boolean) == true
        
        Map<String, Object> invalid = repository.validateConfigurationValue("maybe", "BOOLEAN")
        assert (invalid.isValid as Boolean) == false
        assert ((invalid.errors as List<String>)[0]).contains("not a valid boolean")
        
        println "✓ validateConfigurationValue BOOLEAN test passed"
    }
    
    void testValidateConfigurationValueUrl() {
        println "Testing validateConfigurationValue for URL..."
        
        Map<String, Object> validUrl = repository.validateConfigurationValue("https://example.com", "URL")
        assert (validUrl.isValid as Boolean) == true
        
        Map<String, Object> invalidUrl = repository.validateConfigurationValue("not-a-url", "URL")
        assert (invalidUrl.isValid as Boolean) == false
        assert ((invalidUrl.errors as List<String>)[0]).contains("not a valid URL")
        
        println "✓ validateConfigurationValue URL test passed"
    }
    
    void testValidateConfigurationValueJson() {
        println "Testing validateConfigurationValue for JSON..."
        
        Map<String, Object> validJson = repository.validateConfigurationValue('{"key": "value"}', "JSON")
        assert (validJson.isValid as Boolean) == true
        
        Map<String, Object> invalidJson = repository.validateConfigurationValue("{invalid json}", "JSON")
        assert (invalidJson.isValid as Boolean) == false
        assert ((invalidJson.errors as List<String>)[0]).contains("not valid JSON")
        
        println "✓ validateConfigurationValue JSON test passed"
    }
    
    void testValidateConfigurationValueRegex() {
        println "Testing validateConfigurationValue with regex pattern..."
        
        def pattern = '^[A-Z]{3,10}$'
        Map<String, Object> validValue = repository.validateConfigurationValue("VALID", "STRING", pattern)
        assert (validValue.isValid as Boolean) == true
        
        Map<String, Object> invalidValue = repository.validateConfigurationValue("invalid123", "STRING", pattern)
        assert (invalidValue.isValid as Boolean) == false
        assert ((invalidValue.errors as List<String>)[0]).contains("does not match required pattern")
        
        println "✓ validateConfigurationValue regex test passed"
    }
    
    void testFindConfigurationHistory() {
        println "Testing findConfigurationHistory..."
        
        def scfId = UUID.randomUUID()
        def expectedHistory = [
            [
                sch_id: UUID.randomUUID(),
                scf_id: scfId,
                sch_old_value: "old value",
                sch_new_value: "new value",
                sch_change_reason: "Test change",
                sch_change_type: "UPDATE",
                created_by: "test_user",
                created_at: new Date()
            ]
        ]
        
        DatabaseUtil.mockSql.setMockResult('rows', expectedHistory)
        def result = repository.findConfigurationHistory(scfId)
        
        assert result == expectedHistory
        println "✓ findConfigurationHistory test passed"
    }
    
    void testBulkUpdateConfigurations() {
        println "Testing bulkUpdateConfigurations..."
        
        def configurations = [
            [
                envId: 1,
                scfKey: "key1",
                scfValue: "value1",
                scfDataType: "STRING",
                scfDescription: "Description 1"
            ],
            [
                envId: 1,
                scfKey: "key2",
                scfValue: "123",
                scfDataType: "INTEGER",
                scfDescription: "Description 2"
            ]
        ] as List<Map<String, Object>>
        def updatedBy = "test_user"
        
        DatabaseUtil.mockSql.setMockResult('executeUpdate', 1)
        def result = repository.bulkUpdateConfigurations(configurations, updatedBy)
        
        assert result == 2
        println "✓ bulkUpdateConfigurations test passed"
    }
    
    void testFindConfluenceMacroLocations() {
        println "Testing findConfluenceMacroLocations..."
        
        def envId = 1
        def expectedConfigs = [
            [scf_key: "stepview.confluence.space.key", scf_category: "MACRO_LOCATION"]
        ]
        
        DatabaseUtil.mockSql.setMockResult('rows', expectedConfigs)
        def result = repository.findConfluenceMacroLocations(envId)
        
        assert result == expectedConfigs
        println "✓ findConfluenceMacroLocations test passed"
    }
    
    void testFindConfluenceConfigurationForEnvironment() {
        println "Testing findConfluenceConfigurationForEnvironment..."
        
        def envId = 1
        def macroConfigs = [
            [
                scf_key: "stepview.confluence.space.key",
                scf_value: "UMIG-DEV",
                scf_data_type: "STRING",
                scf_description: "Space key",
                scf_is_system_managed: true
            ],
            [
                scf_key: "stepview.confluence.page.id",
                scf_value: "12345678",
                scf_data_type: "STRING",
                scf_description: "Page ID",
                scf_is_system_managed: true
            ]
        ]
        
        DatabaseUtil.mockSql.setMockResult('rows', macroConfigs)
        Map<String, Object> result = repository.findConfluenceConfigurationForEnvironment(envId)
        
        assert result.envId == envId
        // Fix: Proper type casting for map access
        Map<String, Map<String, Object>> configurations = result.configurations as Map<String, Map<String, Object>>
        assert configurations["stepview.confluence.space.key"]["value"] == "UMIG-DEV"
        assert configurations["stepview.confluence.page.id"]["value"] == "12345678"
        assert configurations["stepview.confluence.space.key"]["isSystemManaged"] == true
        println "✓ findConfluenceConfigurationForEnvironment test passed"
    }
    
    void testSetConfigurationActiveStatus() {
        println "Testing setConfigurationActiveStatus..."
        
        def scfId = UUID.randomUUID()
        def isActive = false
        def updatedBy = "test_user"
        
        DatabaseUtil.mockSql.setMockResult('executeUpdate', 1)
        def result = repository.setConfigurationActiveStatus(scfId, isActive, updatedBy)
        
        assert result == true
        println "✓ setConfigurationActiveStatus test passed"
    }
    
}

// ==================== MAIN EXECUTION ====================

// Main method for standalone execution per ADR-036
def test = new SystemConfigurationRepositoryTestClass()
def totalTests = 0
def passedTests = 0
List<Map<String, Object>> failedTests = []

println "\n=== Running SystemConfigurationRepositoryTest ==="
println "Testing pattern: ADR-036 (Pure Groovy, no external dependencies)\n"

def testMethods = [
    'testFindActiveConfigurationsByEnvironment',
    'testFindConfigurationsByCategory',
    'testFindConfigurationByKey',
    'testCreateConfiguration',
    'testUpdateConfigurationValue',
    'testUpdateConfigurationByKey',
    'testValidateConfigurationValueInteger',
    'testValidateConfigurationValueBoolean',
    'testValidateConfigurationValueUrl',
    'testValidateConfigurationValueJson',
    'testValidateConfigurationValueRegex',
    'testFindConfigurationHistory',
    'testBulkUpdateConfigurations',
    'testFindConfluenceMacroLocations',
    'testFindConfluenceConfigurationForEnvironment',
    'testSetConfigurationActiveStatus'
]

testMethods.each { methodName ->
    totalTests++
    try {
        DatabaseUtil.resetMock() // Reset mock state for each test
        test.invokeMethod(methodName, null)
        passedTests++
    } catch (AssertionError | Exception e) {
        failedTests << ([test: methodName as Object, error: e.message as Object] as Map<String, Object>)
        println "✗ ${methodName} failed: ${e.message}"
    }
}

println "\n=== Test Summary ==="
println "Total: ${totalTests}"
println "Passed: ${passedTests}"
println "Failed: ${failedTests.size()}"
// Fix: Convert to double before Math.round()
def successRate = Math.round((passedTests * 100.0 / totalTests) as double)
println "Success rate: ${successRate}%"

if (failedTests) {
    println "\nFailed tests:"
    failedTests.each { failure ->
        Map<String, Object> failureMap = failure as Map<String, Object>
        println "  - ${failureMap.test}: ${failureMap.error}"
    }
    System.exit(1)
} else {
    println "\n✅ All tests passed!"
    System.exit(0)
}