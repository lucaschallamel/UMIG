package umig.tests.unit

import spock.lang.Specification
import spock.lang.Subject
import umig.repository.SystemConfigurationRepository
import umig.utils.DatabaseUtil
import groovy.sql.Sql
import java.util.UUID

class SystemConfigurationRepositoryTest extends Specification {

    @Subject
    SystemConfigurationRepository repository = new SystemConfigurationRepository()

    def setup() {
        // Mock DatabaseUtil for unit testing
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            return closure.call(mockSql)
        }
    }

    def cleanup() {
        // Reset metaClass after each test
        DatabaseUtil.metaClass = null
    }

    def "findActiveConfigurationsByEnvironment should return configurations for given environment"() {
        given: "An environment ID and expected configuration data"
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

        when: "Finding active configurations by environment"
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            mockSql.rows(_, [envId: envId]) >> expectedConfigs
            return closure.call(mockSql)
        }
        
        def result = repository.findActiveConfigurationsByEnvironment(envId)

        then: "Should return the expected configurations"
        result == expectedConfigs
    }

    def "findConfigurationsByCategory should return configurations filtered by category"() {
        given: "A category and environment ID"
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

        when: "Finding configurations by category"
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            mockSql.rows(_, [category: category, envId: envId]) >> expectedConfigs
            return closure.call(mockSql)
        }

        def result = repository.findConfigurationsByCategory(category, envId)

        then: "Should return filtered configurations"
        result == expectedConfigs
    }

    def "findConfigurationByKey should return specific configuration"() {
        given: "A configuration key and environment ID"
        def key = "stepview.confluence.space.key"
        def envId = 1
        def expectedConfig = [
            scf_id: UUID.randomUUID(),
            scf_key: key,
            scf_value: "UMIG-DEV",
            env_id: envId
        ]

        when: "Finding configuration by key"
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            mockSql.firstRow(_, [key: key, envId: envId]) >> expectedConfig
            return closure.call(mockSql)
        }

        def result = repository.findConfigurationByKey(key, envId)

        then: "Should return the specific configuration"
        result == expectedConfig
    }

    def "createConfiguration should create new configuration and return UUID"() {
        given: "Configuration parameters"
        def params = [
            envId: 1,
            scfKey: "test.config.key",
            scfCategory: "SYSTEM_SETTING",
            scfValue: "test value",
            scfDescription: "Test configuration",
            scfIsActive: true,
            scfIsSystemManaged: false,
            scfDataType: "STRING"
        ]
        def createdBy = "test_user"

        when: "Creating configuration"
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            mockSql.execute(_, _) >> { String sql, Map sqlParams ->
                assert sqlParams.scfKey == params.scfKey
                assert sqlParams.scfValue == params.scfValue
                assert sqlParams.createdBy == createdBy
                return true
            }
            return closure.call(mockSql)
        }

        def result = repository.createConfiguration(params, createdBy)

        then: "Should return a UUID"
        result instanceof UUID
    }

    def "updateConfigurationValue should update existing configuration"() {
        given: "Configuration ID and new value"
        def scfId = UUID.randomUUID()
        def newValue = "updated value"
        def updatedBy = "test_user"
        def changeReason = "Test update"

        when: "Updating configuration value"
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            mockSql.executeUpdate(_, _) >> { String sql, Map sqlParams ->
                assert sqlParams.newValue == newValue
                assert sqlParams.updatedBy == updatedBy
                assert sqlParams.changeReason == changeReason
                assert sqlParams.scfId == scfId
                return 1 // One row affected
            }
            return closure.call(mockSql)
        }

        def result = repository.updateConfigurationValue(scfId, newValue, updatedBy, changeReason)

        then: "Should return true for successful update"
        result == true
    }

    def "updateConfigurationByKey should update configuration by key and environment"() {
        given: "Configuration key, environment ID, and new value"
        def key = "test.config.key"
        def envId = 1
        def newValue = "updated value"
        def updatedBy = "test_user"

        when: "Updating configuration by key"
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            mockSql.executeUpdate(_, _) >> { String sql, Map sqlParams ->
                assert sqlParams.key == key
                assert sqlParams.envId == envId
                assert sqlParams.newValue == newValue
                assert sqlParams.updatedBy == updatedBy
                return 1
            }
            return closure.call(mockSql)
        }

        def result = repository.updateConfigurationByKey(key, envId, newValue, updatedBy)

        then: "Should return true for successful update"
        result == true
    }

    def "validateConfigurationValue should validate INTEGER data type"() {
        when: "Validating integer values"
        def validResult = repository.validateConfigurationValue("123", "INTEGER")
        def invalidResult = repository.validateConfigurationValue("abc", "INTEGER")

        then: "Should validate correctly"
        validResult.isValid == true
        validResult.errors.isEmpty()
        
        invalidResult.isValid == false
        invalidResult.errors.size() == 1
        invalidResult.errors[0].contains("not a valid integer")
    }

    def "validateConfigurationValue should validate BOOLEAN data type"() {
        when: "Validating boolean values"
        def validTrue = repository.validateConfigurationValue("true", "BOOLEAN")
        def validFalse = repository.validateConfigurationValue("false", "BOOLEAN")
        def invalid = repository.validateConfigurationValue("maybe", "BOOLEAN")

        then: "Should validate correctly"
        validTrue.isValid == true
        validFalse.isValid == true
        
        invalid.isValid == false
        invalid.errors[0].contains("not a valid boolean")
    }

    def "validateConfigurationValue should validate URL data type"() {
        when: "Validating URL values"
        def validUrl = repository.validateConfigurationValue("https://example.com", "URL")
        def invalidUrl = repository.validateConfigurationValue("not-a-url", "URL")

        then: "Should validate correctly"
        validUrl.isValid == true
        
        invalidUrl.isValid == false
        invalidUrl.errors[0].contains("not a valid URL")
    }

    def "validateConfigurationValue should validate JSON data type"() {
        when: "Validating JSON values"
        def validJson = repository.validateConfigurationValue('{"key": "value"}', "JSON")
        def invalidJson = repository.validateConfigurationValue("{invalid json}", "JSON")

        then: "Should validate correctly"
        validJson.isValid == true
        
        invalidJson.isValid == false
        invalidJson.errors[0].contains("not valid JSON")
    }

    def "validateConfigurationValue should validate against regex pattern"() {
        when: "Validating with regex pattern"
        def pattern = "^[A-Z]{3,10}$"
        def validValue = repository.validateConfigurationValue("VALID", "STRING", pattern)
        def invalidValue = repository.validateConfigurationValue("invalid123", "STRING", pattern)

        then: "Should validate against pattern"
        validValue.isValid == true
        
        invalidValue.isValid == false
        invalidValue.errors[0].contains("does not match required pattern")
    }

    def "findConfigurationHistory should return change history"() {
        given: "Configuration ID and expected history"
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

        when: "Finding configuration history"
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            mockSql.rows(_, [scfId: scfId, limit: 50]) >> expectedHistory
            return closure.call(mockSql)
        }

        def result = repository.findConfigurationHistory(scfId)

        then: "Should return change history"
        result == expectedHistory
    }

    def "bulkUpdateConfigurations should update multiple configurations"() {
        given: "List of configurations to update"
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
        ]
        def updatedBy = "test_user"

        when: "Performing bulk update"
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            mockSql.executeUpdate(_, _) >> 1 // Each update affects 1 row
            return closure.call(mockSql)
        }

        def result = repository.bulkUpdateConfigurations(configurations, updatedBy)

        then: "Should return total number of updated configurations"
        result == 2
    }

    def "findConfluenceMacroLocations should delegate to findConfigurationsByCategory"() {
        given: "Expected macro location configurations"
        def envId = 1
        def expectedConfigs = [
            [scf_key: "stepview.confluence.space.key", scf_category: "MACRO_LOCATION"]
        ]

        when: "Finding Confluence macro locations"
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            mockSql.rows(_, [category: "MACRO_LOCATION", envId: envId]) >> expectedConfigs
            return closure.call(mockSql)
        }

        def result = repository.findConfluenceMacroLocations(envId)

        then: "Should return macro location configurations"
        result == expectedConfigs
    }

    def "findConfluenceConfigurationForEnvironment should return structured configuration map"() {
        given: "Environment ID and macro configurations"
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

        when: "Finding Confluence configuration for environment"
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            mockSql.rows(_, [category: "MACRO_LOCATION", envId: envId]) >> macroConfigs
            return closure.call(mockSql)
        }

        def result = repository.findConfluenceConfigurationForEnvironment(envId)

        then: "Should return structured configuration map"
        result.envId == envId
        result.configurations["stepview.confluence.space.key"].value == "UMIG-DEV"
        result.configurations["stepview.confluence.page.id"].value == "12345678"
        result.configurations["stepview.confluence.space.key"].isSystemManaged == true
    }

    def "setConfigurationActiveStatus should update active status"() {
        given: "Configuration ID and active status"
        def scfId = UUID.randomUUID()
        def isActive = false
        def updatedBy = "test_user"

        when: "Setting configuration active status"
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            def mockSql = Mock(Sql)
            mockSql.executeUpdate(_, _) >> { String sql, Map sqlParams ->
                assert sqlParams.isActive == isActive
                assert sqlParams.updatedBy == updatedBy
                assert sqlParams.scfId == scfId
                return 1
            }
            return closure.call(mockSql)
        }

        def result = repository.setConfigurationActiveStatus(scfId, isActive, updatedBy)

        then: "Should return true for successful update"
        result == true
    }
}