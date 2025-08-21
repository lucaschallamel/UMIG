package umig.repository

import umig.utils.DatabaseUtil
import java.util.UUID
import groovy.sql.Sql

/**
 * Repository for SYSTEM_CONFIGURATION data with environment-specific settings,
 * Confluence macro locations, and runtime configuration management.
 * 
 * Supports audit trail and configuration validation.
 */
class SystemConfigurationRepository {

    /**
     * Retrieves all active configurations for a specific environment.
     */
    List findActiveConfigurationsByEnvironment(Integer envId) {
        DatabaseUtil.withSql { sql ->
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
                    scf.scf_validation_pattern,
                    scf.created_by,
                    scf.created_at,
                    scf.updated_by,
                    scf.updated_at,
                    e.env_code,
                    e.env_name
                FROM system_configuration_scf scf
                INNER JOIN environments_env e ON scf.env_id = e.env_id
                WHERE scf.env_id = :envId 
                  AND scf.scf_is_active = true
                ORDER BY scf.scf_category, scf.scf_key
            ''', [envId: envId])
        }
    }

    /**
     * Retrieves configurations by category across all environments or specific environment.
     */
    List findConfigurationsByCategory(String category, Integer envId = null) {
        DatabaseUtil.withSql { sql ->
            def params = [category: category]
            def whereClause = 'WHERE scf.scf_category = :category AND scf.scf_is_active = true'
            
            if (envId != null) {
                whereClause += ' AND scf.env_id = :envId'
                params.envId = envId
            }
            
            return sql.rows("""
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
                    scf.scf_validation_pattern,
                    scf.created_by,
                    scf.created_at,
                    scf.updated_by,
                    scf.updated_at,
                    e.env_code,
                    e.env_name
                FROM system_configuration_scf scf
                INNER JOIN environments_env e ON scf.env_id = e.env_id
                ${whereClause}
                ORDER BY e.env_code, scf.scf_key
            """, params)
        }
    }

    /**
     * Retrieves a specific configuration by key and environment.
     */
    Map findConfigurationByKey(String key, Integer envId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow('''
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
                    scf.scf_validation_pattern,
                    scf.created_by,
                    scf.created_at,
                    scf.updated_by,
                    scf.updated_at,
                    e.env_code,
                    e.env_name
                FROM system_configuration_scf scf
                INNER JOIN environments_env e ON scf.env_id = e.env_id
                WHERE scf.scf_key = :key 
                  AND scf.env_id = :envId
                  AND scf.scf_is_active = true
            ''', [key: key, envId: envId])
        }
    }

    /**
     * Retrieves all Confluence macro location configurations.
     */
    List findConfluenceMacroLocations(Integer envId = null) {
        return findConfigurationsByCategory('MACRO_LOCATION', envId)
    }

    /**
     * Retrieves complete Confluence configuration for a specific environment.
     */
    Map findConfluenceConfigurationForEnvironment(Integer envId) {
        def configs = findConfluenceMacroLocations(envId)
        def result = [
            envId: envId,
            configurations: [:]
        ]
        
        configs.each { config ->
            def configMap = config as Map
            result.configurations[configMap.scf_key as String] = [
                value: configMap.scf_value as String,
                dataType: configMap.scf_data_type as String,
                description: configMap.scf_description as String,
                isSystemManaged: configMap.scf_is_system_managed as Boolean
            ]
        }
        
        return result
    }

    /**
     * Creates a new configuration entry.
     */
    UUID createConfiguration(Map params, String createdBy = 'system') {
        DatabaseUtil.withSql { sql ->
            def configId = UUID.randomUUID()
            
            sql.execute('''
                INSERT INTO system_configuration_scf (
                    scf_id, env_id, scf_key, scf_category, scf_value, 
                    scf_description, scf_is_active, scf_is_system_managed, 
                    scf_data_type, scf_validation_pattern, created_by
                ) VALUES (
                    :scfId, :envId, :scfKey, :scfCategory, :scfValue,
                    :scfDescription, :scfIsActive, :scfIsSystemManaged,
                    :scfDataType, :scfValidationPattern, :createdBy
                )
            ''', [
                scfId: configId,
                envId: params.envId,
                scfKey: params.scfKey,
                scfCategory: params.scfCategory,
                scfValue: params.scfValue,
                scfDescription: params.scfDescription ?: null,
                scfIsActive: params.scfIsActive ?: true,
                scfIsSystemManaged: params.scfIsSystemManaged ?: false,
                scfDataType: params.scfDataType ?: 'STRING',
                scfValidationPattern: params.scfValidationPattern ?: null,
                createdBy: createdBy
            ])
            
            return configId
        }
    }

    /**
     * Updates an existing configuration value.
     */
    boolean updateConfigurationValue(UUID scfId, String newValue, String updatedBy = 'system', String changeReason = null) {
        DatabaseUtil.withSql { sql ->
            def rowsAffected = sql.executeUpdate('''
                UPDATE system_configuration_scf 
                SET scf_value = :newValue,
                    scf_description = COALESCE(:changeReason, scf_description),
                    updated_by = :updatedBy,
                    updated_at = CURRENT_TIMESTAMP
                WHERE scf_id = :scfId AND scf_is_active = true
            ''', [
                newValue: newValue,
                changeReason: changeReason,
                updatedBy: updatedBy,
                scfId: scfId
            ])
            
            return rowsAffected > 0
        }
    }

    /**
     * Updates configuration by key and environment.
     */
    boolean updateConfigurationByKey(String key, Integer envId, String newValue, String updatedBy = 'system', String changeReason = null) {
        DatabaseUtil.withSql { sql ->
            def rowsAffected = sql.executeUpdate('''
                UPDATE system_configuration_scf 
                SET scf_value = :newValue,
                    scf_description = COALESCE(:changeReason, scf_description),
                    updated_by = :updatedBy,
                    updated_at = CURRENT_TIMESTAMP
                WHERE scf_key = :key 
                  AND env_id = :envId 
                  AND scf_is_active = true
            ''', [
                newValue: newValue,
                changeReason: changeReason,
                updatedBy: updatedBy,
                key: key,
                envId: envId
            ])
            
            return rowsAffected > 0
        }
    }

    /**
     * Activates or deactivates a configuration.
     */
    boolean setConfigurationActiveStatus(UUID scfId, boolean isActive, String updatedBy = 'system') {
        DatabaseUtil.withSql { sql ->
            def rowsAffected = sql.executeUpdate('''
                UPDATE system_configuration_scf 
                SET scf_is_active = :isActive,
                    updated_by = :updatedBy,
                    updated_at = CURRENT_TIMESTAMP
                WHERE scf_id = :scfId
            ''', [
                isActive: isActive,
                updatedBy: updatedBy,
                scfId: scfId
            ])
            
            return rowsAffected > 0
        }
    }

    /**
     * Retrieves configuration change history.
     */
    List findConfigurationHistory(UUID scfId, int limit = 50) {
        DatabaseUtil.withSql { sql ->
            return sql.rows('''
                SELECT 
                    sch.sch_id,
                    sch.scf_id,
                    sch.sch_old_value,
                    sch.sch_new_value,
                    sch.sch_change_reason,
                    sch.sch_change_type,
                    sch.created_by,
                    sch.created_at,
                    scf.scf_key,
                    scf.scf_category,
                    e.env_code
                FROM system_configuration_history_sch sch
                INNER JOIN system_configuration_scf scf ON sch.scf_id = scf.scf_id
                INNER JOIN environments_env e ON scf.env_id = e.env_id
                WHERE sch.scf_id = :scfId
                ORDER BY sch.created_at DESC
                LIMIT :limit
            ''', [scfId: scfId, limit: limit])
        }
    }

    /**
     * Validates configuration value against its data type and validation pattern.
     */
    Map validateConfigurationValue(String value, String dataType, String validationPattern = null) {
        Map result = [isValid: true, errors: [] as List<String>]
        
        // Data type validation
        switch (dataType?.toUpperCase()) {
            case 'INTEGER':
                try {
                    Integer.parseInt(value)
                } catch (NumberFormatException e) {
                    result.isValid = false
                    (result.errors as List<String>).add("Value '${value}' is not a valid integer".toString())
                }
                break
            case 'BOOLEAN':
                if (!['true', 'false'].contains(value?.toLowerCase())) {
                    result.isValid = false
                    (result.errors as List<String>).add("Value '${value}' is not a valid boolean (true/false)".toString())
                }
                break
            case 'URL':
                try {
                    new URL(value)
                } catch (MalformedURLException e) {
                    result.isValid = false
                    (result.errors as List<String>).add("Value '${value}' is not a valid URL".toString())
                }
                break
            case 'JSON':
                try {
                    new groovy.json.JsonSlurper().parseText(value)
                } catch (Exception e) {
                    result.isValid = false
                    (result.errors as List<String>).add("Value '${value}' is not valid JSON".toString())
                }
                break
        }
        
        // Pattern validation
        if (validationPattern && value) {
            if (!value.matches(validationPattern)) {
                result.isValid = false
                (result.errors as List<String>).add("Value '${value}' does not match required pattern: ${validationPattern}".toString())
            }
        }
        
        return result
    }

    /**
     * Bulk update configurations for environment deployment scenarios.
     */
    int bulkUpdateConfigurations(List<Map> configurations, String updatedBy = 'system') {
        DatabaseUtil.withSql { sql ->
            def totalUpdated = 0
            
            configurations.each { config ->
                def validation = validateConfigurationValue(
                    config.scfValue as String, 
                    config.scfDataType as String, 
                    config.scfValidationPattern as String
                )
                
                if (validation.isValid) {
                    def rowsAffected = sql.executeUpdate('''
                        UPDATE system_configuration_scf 
                        SET scf_value = :newValue,
                            scf_description = COALESCE(:description, scf_description),
                            updated_by = :updatedBy,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE scf_key = :key 
                          AND env_id = :envId 
                          AND scf_is_active = true
                    ''', [
                        newValue: config.scfValue,
                        description: config.scfDescription,
                        updatedBy: updatedBy,
                        key: config.scfKey,
                        envId: config.envId
                    ])
                    totalUpdated += rowsAffected
                }
            }
            
            return totalUpdated
        }
    }

    /**
     * Retrieves all configurations grouped by environment for admin interfaces.
     */
    Map findAllConfigurationsGroupedByEnvironment() {
        DatabaseUtil.withSql { sql ->
            def configs = sql.rows('''
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
                    scf.scf_validation_pattern,
                    scf.created_by,
                    scf.created_at,
                    scf.updated_by,
                    scf.updated_at,
                    e.env_code,
                    e.env_name
                FROM system_configuration_scf scf
                INNER JOIN environments_env e ON scf.env_id = e.env_id
                WHERE scf.scf_is_active = true
                ORDER BY e.env_code, scf.scf_category, scf.scf_key
            ''')
            
            Map result = [:]
            configs.each { config ->
                def configMap = config as Map
                def envKey = configMap.env_code as String
                if (!result[envKey]) {
                    result[envKey] = [
                        envId: configMap.env_id,
                        envName: configMap.env_name,
                        configurations: [:]
                    ]
                }
                
                def categoryKey = configMap.scf_category as String
                def envData = result[envKey] as Map
                def configurations = envData.configurations as Map
                if (!configurations[categoryKey]) {
                    configurations[categoryKey] = []
                }
                
                (configurations[categoryKey] as List).add(configMap)
            }
            
            return result
        }
    }
}