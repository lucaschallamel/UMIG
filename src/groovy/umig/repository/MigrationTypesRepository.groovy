package umig.repository

import umig.utils.DatabaseUtil
import groovy.sql.GroovyRowResult

/**
 * Repository class for managing Migration Type data.
 * Handles all database operations for the migration_types_master table.
 * 
 * US-042: Phase 2 - Migration Types Master Data Management
 */
class MigrationTypesRepository {

    /**
     * Retrieves all migration types from the database.
     * @param includeInactive If true, includes inactive migration types (default: false)
     * @return A list of maps, where each map is a migration type.
     */
    def findAllMigrationTypes(boolean includeInactive = false) {
        DatabaseUtil.withSql { sql ->
            def query = """
                SELECT 
                    mtm_id,
                    mtm_code,
                    mtm_name,
                    mtm_description,
                    mtm_color,
                    mtm_icon,
                    mtm_display_order,
                    mtm_active,
                    created_by,
                    created_at,
                    updated_by,
                    updated_at
                FROM migration_types_master
                ${includeInactive ? '' : 'WHERE mtm_active = TRUE'}
                ORDER BY mtm_display_order, mtm_code
            """
            
            return sql.rows(query)
        }
    }

    /**
     * Finds a migration type by its ID.
     * @param mtmId The ID of the migration type to find.
     * @return A map representing the migration type, or null if not found.
     */
    def findMigrationTypeById(Integer mtmId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT 
                    mtm_id,
                    mtm_code,
                    mtm_name,
                    mtm_description,
                    mtm_color,
                    mtm_icon,
                    mtm_display_order,
                    mtm_active,
                    created_by,
                    created_at,
                    updated_by,
                    updated_at
                FROM migration_types_master
                WHERE mtm_id = :mtmId
            """, [mtmId: mtmId])
        }
    }

    /**
     * Finds a migration type by its code.
     * @param mtmCode The code of the migration type to find.
     * @return A map representing the migration type, or null if not found.
     */
    def findMigrationTypeByCode(String mtmCode) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT 
                    mtm_id,
                    mtm_code,
                    mtm_name,
                    mtm_description,
                    mtm_color,
                    mtm_icon,
                    mtm_display_order,
                    mtm_active,
                    created_by,
                    created_at,
                    updated_by,
                    updated_at
                FROM migration_types_master
                WHERE mtm_code = :mtmCode
            """, [mtmCode: mtmCode])
        }
    }

    /**
     * Creates a new migration type.
     * @param params Map containing the migration type data.
     * @return The created migration type as a map.
     */
    def createMigrationType(Map params) {
        DatabaseUtil.withSql { sql ->
            // Validate required fields
            if (!params.mtm_code || !params.mtm_name) {
                throw new IllegalArgumentException("mtm_code and mtm_name are required")
            }

            // Set defaults
            params.mtm_description = params.mtm_description ?: null
            params.mtm_color = params.mtm_color ?: '#6B73FF'
            params.mtm_icon = params.mtm_icon ?: 'layers'
            params.mtm_display_order = params.mtm_display_order ?: 0
            params.mtm_active = params.mtm_active != null ? params.mtm_active : true
            params.created_by = params.created_by ?: 'system'
            params.updated_by = params.updated_by ?: params.created_by

            def result = sql.firstRow("""
                INSERT INTO migration_types_master (
                    mtm_code,
                    mtm_name,
                    mtm_description,
                    mtm_color,
                    mtm_icon,
                    mtm_display_order,
                    mtm_active,
                    created_by,
                    updated_by
                ) VALUES (
                    :mtm_code,
                    :mtm_name,
                    :mtm_description,
                    :mtm_color,
                    :mtm_icon,
                    :mtm_display_order,
                    :mtm_active,
                    :created_by,
                    :updated_by
                ) RETURNING *
            """, params)

            return result
        }
    }

    /**
     * Updates an existing migration type.
     * @param mtmId The ID of the migration type to update.
     * @param params Map containing the fields to update.
     * @return The updated migration type as a map, or null if not found.
     */
    def updateMigrationType(Integer mtmId, Map params) {
        DatabaseUtil.withSql { sql ->
            // Build dynamic update query based on provided params
            def updateFields = []
            def queryParams = [mtm_id: mtmId] as Map<String, Object>

            // List of updatable fields
            def updatableFields = [
                'mtm_code', 'mtm_name', 'mtm_description', 'mtm_color', 
                'mtm_icon', 'mtm_display_order', 'mtm_active'
            ]

            updatableFields.each { field ->
                if (params.containsKey(field)) {
                    updateFields << "${field} = :${field}"
                    queryParams[field] = params[field]
                }
            }

            if (updateFields.isEmpty()) {
                return findMigrationTypeById(mtmId)
            }

            // Always update the updated_by and updated_at fields
            updateFields << "updated_by = :updated_by"
            updateFields << "updated_at = CURRENT_TIMESTAMP"
            queryParams.updated_by = (params.updated_by ?: 'system') as String

            def query = """
                UPDATE migration_types_master
                SET ${updateFields.join(', ')}
                WHERE mtm_id = :mtm_id
                RETURNING *
            """

            return sql.firstRow(query, queryParams)
        }
    }

    /**
     * Updates an existing migration type by code.
     * @param mtmCode The code of the migration type to update.
     * @param params Map containing the fields to update.
     * @return The updated migration type as a map, or null if not found.
     */
    def updateMigrationTypeByCode(String mtmCode, Map params) {
        DatabaseUtil.withSql { sql ->
            // Build dynamic update query based on provided params
            def updateFields = []
            def queryParams = [mtm_code: mtmCode]

            // List of updatable fields (excluding mtm_code to prevent changing the key)
            def updatableFields = [
                'mtm_name', 'mtm_description', 'mtm_color', 
                'mtm_icon', 'mtm_display_order', 'mtm_active'
            ]

            updatableFields.each { field ->
                if (params.containsKey(field)) {
                    updateFields << "${field} = :${field}"
                    queryParams[field] = params[field]
                }
            }

            if (updateFields.isEmpty()) {
                return findMigrationTypeByCode(mtmCode)
            }

            // Always update the updated_by and updated_at fields
            updateFields << "updated_by = :updated_by"
            updateFields << "updated_at = CURRENT_TIMESTAMP"
            queryParams.updated_by = (params.updated_by ?: 'system') as String

            def query = """
                UPDATE migration_types_master
                SET ${updateFields.join(', ')}
                WHERE mtm_code = :mtm_code
                RETURNING *
            """

            return sql.firstRow(query, queryParams)
        }
    }

    /**
     * Deletes a migration type.
     * @param mtmId The ID of the migration type to delete.
     * @return true if deleted, false if not found.
     */
    def deleteMigrationType(Integer mtmId) {
        DatabaseUtil.withSql { sql ->
            def deleted = sql.executeUpdate("""
                DELETE FROM migration_types_master
                WHERE mtm_id = :mtmId
            """, [mtmId: mtmId])
            
            return deleted > 0
        }
    }

    /**
     * Deletes a migration type by code.
     * @param mtmCode The code of the migration type to delete.
     * @return true if deleted, false if not found.
     */
    def deleteMigrationTypeByCode(String mtmCode) {
        DatabaseUtil.withSql { sql ->
            def deleted = sql.executeUpdate("""
                DELETE FROM migration_types_master
                WHERE mtm_code = :mtmCode
            """, [mtmCode: mtmCode])
            
            return deleted > 0
        }
    }

    /**
     * Returns all relationships that block deletion of a migration type.
     * @param mtmId The ID of the migration type.
     * @return Map of relationship type to list of referencing records.
     */
    def getMigrationTypeBlockingRelationships(Integer mtmId) {
        DatabaseUtil.withSql { sql ->
            def blocking = [:]

            // Get the migration type code for relationships
            def migrationType = findMigrationTypeById(mtmId)
            if (!migrationType) return blocking

            // Check migrations using this type
            def migrations = sql.rows("""
                SELECT 
                    m.mig_id, 
                    m.mig_name,
                    m.mig_description
                FROM migrations_mig m
                WHERE m.mtm_id = :mtmId
            """, [mtmId: mtmId])
            if (migrations) blocking['migrations'] = migrations

            // Check if there are any step instances associated with migrations of this type
            def stepInstances = sql.rows("""
                SELECT 
                    si.sti_id,
                    si.sti_name,
                    m.mig_name
                FROM step_instances_sti si
                JOIN iterations_ite i ON i.ite_id = si.ite_id
                JOIN migrations_mig m ON m.mig_id = i.mig_id
                WHERE m.mtm_id = :mtmId
                LIMIT 10
            """, [mtmId: mtmId])
            if (stepInstances) blocking['step_instances'] = stepInstances

            return blocking
        }
    }

    /**
     * Checks if a migration type code already exists.
     * @param mtmCode The code to check.
     * @return true if exists, false otherwise.
     */
    def migrationTypeExists(String mtmCode) {
        DatabaseUtil.withSql { sql ->
            def count = sql.firstRow("""
                SELECT COUNT(*) as count
                FROM migration_types_master
                WHERE mtm_code = :mtmCode
            """, [mtmCode: mtmCode])
            
            return (count.count as Integer) > 0
        }
    }

    /**
     * Checks if a migration type ID exists.
     * @param mtmId The ID to check.
     * @return true if exists, false otherwise.
     */
    def migrationTypeIdExists(Integer mtmId) {
        DatabaseUtil.withSql { sql ->
            def count = sql.firstRow("""
                SELECT COUNT(*) as count
                FROM migration_types_master
                WHERE mtm_id = :mtmId
            """, [mtmId: mtmId])
            
            return (count.count as Integer) > 0
        }
    }

    /**
     * Gets the maximum display order value.
     * @return The maximum display order, or 0 if no migration types exist.
     */
    def getMaxDisplayOrder() {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                SELECT COALESCE(MAX(mtm_display_order), 0) as max_order
                FROM migration_types_master
            """)
            
            return result.max_order
        }
    }

    /**
     * Reorders migration types by updating their display_order values.
     * @param orderMap Map of mtm_id to new display_order values.
     * @return Number of migration types updated.
     */
    def reorderMigrationTypes(Map<Integer, Integer> orderMap) {
        DatabaseUtil.withSql { sql ->
            def updateCount = 0
            
            sql.withTransaction {
                orderMap.each { mtmId, displayOrder ->
                    def updated = sql.executeUpdate("""
                        UPDATE migration_types_master
                        SET mtm_display_order = :displayOrder,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE mtm_id = :mtmId
                    """, [mtmId: mtmId, displayOrder: displayOrder])
                    
                    updateCount += updated
                }
            }
            
            return updateCount
        }
    }

    /**
     * Reorders migration types by code.
     * @param orderMap Map of mtm_code to new display_order values.
     * @return Number of migration types updated.
     */
    def reorderMigrationTypesByCode(Map<String, Integer> orderMap) {
        DatabaseUtil.withSql { sql ->
            def updateCount = 0
            
            sql.withTransaction {
                orderMap.each { mtmCode, displayOrder ->
                    def updated = sql.executeUpdate("""
                        UPDATE migration_types_master
                        SET mtm_display_order = :displayOrder,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE mtm_code = :mtmCode
                    """, [mtmCode: mtmCode, displayOrder: displayOrder])
                    
                    updateCount += updated
                }
            }
            
            return updateCount
        }
    }

    /**
     * Gets migration type usage statistics.
     * @return A list of migration types with their usage counts.
     */
    def getMigrationTypeUsageStats() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    mt.mtm_id,
                    mt.mtm_code,
                    mt.mtm_name,
                    mt.mtm_active,
                    COALESCE(m.migration_count, 0) as migration_count,
                    COALESCE(si.step_instance_count, 0) as step_instance_count
                FROM migration_types_master mt
                LEFT JOIN (
                    SELECT mtm_id, COUNT(*) as migration_count
                    FROM migrations_mig
                    GROUP BY mtm_id
                ) m ON mt.mtm_id = m.mtm_id
                LEFT JOIN (
                    SELECT 
                        mg.mtm_id, 
                        COUNT(si.sti_id) as step_instance_count
                    FROM step_instances_sti si
                    JOIN iterations_ite i ON i.ite_id = si.ite_id
                    JOIN migrations_mig mg ON mg.mig_id = i.mig_id
                    GROUP BY mg.mtm_id
                ) si ON mt.mtm_id = si.mtm_id
                ORDER BY mt.mtm_display_order, mt.mtm_code
            """)
        }
    }

    /**
     * Gets active migration types suitable for dropdowns/selection.
     * @return A list of active migration types with minimal fields.
     */
    def getActiveMigrationTypesForSelection() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    mtm_id,
                    mtm_code,
                    mtm_name,
                    mtm_color,
                    mtm_icon,
                    mtm_display_order
                FROM migration_types_master
                WHERE mtm_active = TRUE
                ORDER BY mtm_display_order, mtm_name
            """)
        }
    }
}