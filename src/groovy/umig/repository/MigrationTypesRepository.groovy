package umig.repository

import umig.utils.DatabaseUtil
import groovy.sql.GroovyRowResult

/**
 * Repository class for managing Migration Type data.
 * Handles all database operations for the migration_types_mit table.
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
            if (includeInactive) {
                return sql.rows("""
                    SELECT 
                        mit_id,
                        mit_code,
                        mit_name,
                        mit_description,
                        mit_color,
                        mit_icon,
                        mit_display_order,
                        mit_active,
                        created_by,
                        created_at,
                        updated_by,
                        updated_at
                    FROM migration_types_mit
                    ORDER BY mit_display_order, mit_code
                """)
            } else {
                return sql.rows("""
                    SELECT 
                        mit_id,
                        mit_code,
                        mit_name,
                        mit_description,
                        mit_color,
                        mit_icon,
                        mit_display_order,
                        mit_active,
                        created_by,
                        created_at,
                        updated_by,
                        updated_at
                    FROM migration_types_mit
                    WHERE mit_active = TRUE
                    ORDER BY mit_display_order, mit_code
                """)
            }
        }
    }

    /**
     * Retrieves all migration types from the database with custom sorting.
     * @param includeInactive If true, includes inactive migration types (default: false)
     * @param sortField The field to sort by (validated against allowed fields)
     * @param sortDirection The sort direction ('asc' or 'desc', default: 'asc')
     * @return A list of maps, where each map is a migration type.
     */
    def findAllMigrationTypesWithSorting(boolean includeInactive = false, String sortField = null, String sortDirection = 'asc') {
        DatabaseUtil.withSql { sql ->
            // Validate sort field to prevent SQL injection (follows ADR-043 type safety)
            def allowedSortFields = ['mit_id', 'mit_code', 'mit_name', 'mit_description', 'mit_color', 'mit_icon', 'mit_display_order', 'mit_active', 'created_by', 'created_at', 'updated_by', 'updated_at']
            
            // Build ORDER BY clause components safely using standard SQL approach
            String primarySort = "mit_display_order ASC"
            String secondarySort = "mit_name ASC"
            
            if (sortField && allowedSortFields.contains(sortField)) {
                // Validate sort direction
                String direction = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
                primarySort = "${sortField} ${direction}"
                
                // Add secondary sort for consistent ordering (following UMIG pattern)
                if (sortField != 'mit_display_order') {
                    secondarySort = "mit_display_order ASC, mit_name ASC"
                } else if (sortField != 'mit_name') {
                    secondarySort = "mit_name ASC"
                } else {
                    secondarySort = "mit_display_order ASC"
                }
            }
            
            // Build the complete ORDER BY clause as a string literal
            String orderByClause = "${primarySort}, ${secondarySort}"
            
            // Base SELECT clause
            String baseSelectClause = """
                SELECT 
                    mit_id,
                    mit_code,
                    mit_name,
                    mit_description,
                    mit_color,
                    mit_icon,
                    mit_display_order,
                    mit_active,
                    created_by,
                    created_at,
                    updated_by,
                    updated_at
                FROM migration_types_mit
            """
            
            if (includeInactive) {
                // Use string concatenation to avoid interpolation issues
                String fullQuery = baseSelectClause + " ORDER BY " + orderByClause
                return sql.rows(fullQuery)
            } else {
                String fullQuery = baseSelectClause + " WHERE mit_active = TRUE ORDER BY " + orderByClause
                return sql.rows(fullQuery)
            }
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
                    mit_id,
                    mit_code,
                    mit_name,
                    mit_description,
                    mit_color,
                    mit_icon,
                    mit_display_order,
                    mit_active,
                    created_by,
                    created_at,
                    updated_by,
                    updated_at
                FROM migration_types_mit
                WHERE mit_id = :mtmId
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
                    mit_id,
                    mit_code,
                    mit_name,
                    mit_description,
                    mit_color,
                    mit_icon,
                    mit_display_order,
                    mit_active,
                    created_by,
                    created_at,
                    updated_by,
                    updated_at
                FROM migration_types_mit
                WHERE mit_code = :mtmCode
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
            if (!params.mit_code || !params.mit_name) {
                throw new IllegalArgumentException("mit_code and mit_name are required")
            }

            // Set defaults
            params.mit_description = params.mit_description ?: null
            params.mit_color = params.mit_color ?: '#6B73FF'
            params.mit_icon = params.mit_icon ?: 'layers'
            params.mit_display_order = params.mit_display_order ?: 0
            params.mit_active = params.mit_active != null ? params.mit_active : true
            params.created_by = params.created_by ?: 'system'
            params.updated_by = params.updated_by ?: params.created_by

            def result = sql.firstRow("""
                INSERT INTO migration_types_mit (
                    mit_code,
                    mit_name,
                    mit_description,
                    mit_color,
                    mit_icon,
                    mit_display_order,
                    mit_active,
                    created_by,
                    updated_by
                ) VALUES (
                    :mit_code,
                    :mit_name,
                    :mit_description,
                    :mit_color,
                    :mit_icon,
                    :mit_display_order,
                    :mit_active,
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
            def queryParams = [mit_id: mtmId] as Map<String, Object>

            // List of updatable fields
            def updatableFields = [
                'mit_code', 'mit_name', 'mit_description', 'mit_color', 
                'mit_icon', 'mit_display_order', 'mit_active'
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
                UPDATE migration_types_mit
                SET ${updateFields.join(', ')}
                WHERE mit_id = :mit_id
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
            def queryParams = [mit_code: mtmCode]

            // List of updatable fields (excluding mit_code to prevent changing the key)
            def updatableFields = [
                'mit_name', 'mit_description', 'mit_color', 
                'mit_icon', 'mit_display_order', 'mit_active'
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
                UPDATE migration_types_mit
                SET ${updateFields.join(', ')}
                WHERE mit_code = :mit_code
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
                DELETE FROM migration_types_mit
                WHERE mit_id = :mtmId
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
                DELETE FROM migration_types_mit
                WHERE mit_code = :mtmCode
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
            def migrationTypeResult = findMigrationTypeById(mtmId)
            if (!migrationTypeResult) return blocking
            
            // Explicit cast to fix static type checking per ADR-031 and ADR-043
            GroovyRowResult migrationType = migrationTypeResult as GroovyRowResult
            String mtmCode = migrationType.mit_code as String
            
            // Check migrations using this type (by code, not ID)
            def migrations = sql.rows("""
                SELECT 
                    m.mig_id, 
                    m.mig_name,
                    m.mig_description
                FROM migrations_mig m
                WHERE m.mig_type = :mtmCode
            """, [mtmCode: mtmCode])
            if (migrations) blocking['migrations'] = migrations

            // Check if there are any step instances associated with migrations of this type
            def stepInstances = sql.rows("""
                SELECT 
                    si.sti_id,
                    si.sti_name,
                    m.mig_name
                FROM steps_instance_sti si
                JOIN phases_instance_phi phi ON phi.phi_id = si.phi_id
                JOIN sequences_instance_sqi sqi ON sqi.sqi_id = phi.sqi_id
                JOIN plans_instance_pli pli ON pli.pli_id = sqi.pli_id
                JOIN iterations_ite i ON i.ite_id = pli.ite_id
                JOIN migrations_mig m ON m.mig_id = i.mig_id
                WHERE m.mig_type = :mtmCode
                LIMIT 10
            """, [mtmCode: mtmCode])
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
                FROM migration_types_mit
                WHERE mit_code = :mtmCode
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
                FROM migration_types_mit
                WHERE mit_id = :mtmId
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
            def queryResult = sql.firstRow("""
                SELECT COALESCE(MAX(mit_display_order), 0) as max_order
                FROM migration_types_mit
            """)
            
            // Explicit cast to fix static type checking per ADR-031 and ADR-043
            GroovyRowResult result = queryResult as GroovyRowResult
            return result.max_order as Integer
        }
    }

    /**
     * Reorders migration types by updating their display_order values.
     * @param orderMap Map of mit_id to new display_order values.
     * @return Number of migration types updated.
     */
    def reorderMigrationTypes(Map<Integer, Integer> orderMap) {
        DatabaseUtil.withSql { sql ->
            def updateCount = 0
            
            sql.withTransaction {
                orderMap.each { mtmId, displayOrder ->
                    def updated = sql.executeUpdate("""
                        UPDATE migration_types_mit
                        SET mit_display_order = :displayOrder,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE mit_id = :mtmId
                    """, [mtmId: mtmId, displayOrder: displayOrder])
                    
                    updateCount += updated
                }
            }
            
            return updateCount
        }
    }

    /**
     * Reorders migration types by code.
     * @param orderMap Map of mit_code to new display_order values.
     * @return Number of migration types updated.
     */
    def reorderMigrationTypesByCode(Map<String, Integer> orderMap) {
        DatabaseUtil.withSql { sql ->
            def updateCount = 0
            
            sql.withTransaction {
                orderMap.each { mtmCode, displayOrder ->
                    def updated = sql.executeUpdate("""
                        UPDATE migration_types_mit
                        SET mit_display_order = :displayOrder,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE mit_code = :mtmCode
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
                    mt.mit_id,
                    mt.mit_code,
                    mt.mit_name,
                    mt.mit_active,
                    COALESCE(m.migration_count, 0) as migration_count,
                    COALESCE(si.step_instance_count, 0) as step_instance_count
                FROM migration_types_mit mt
                LEFT JOIN (
                    SELECT mig_type, COUNT(*) as migration_count
                    FROM migrations_mig
                    GROUP BY mig_type
                ) m ON mt.mit_code = m.mig_type
                LEFT JOIN (
                    SELECT 
                        mg.mig_type, 
                        COUNT(si.sti_id) as step_instance_count
                    FROM steps_instance_sti si
                    JOIN phases_instance_phi phi ON phi.phi_id = si.phi_id
                    JOIN sequences_instance_sqi sqi ON sqi.sqi_id = phi.sqi_id
                    JOIN plans_instance_pli pli ON pli.pli_id = sqi.pli_id
                    JOIN iterations_ite i ON i.ite_id = pli.ite_id
                    JOIN migrations_mig mg ON mg.mig_id = i.mig_id
                    GROUP BY mg.mig_type
                ) si ON mt.mit_code = si.mig_type
                ORDER BY mt.mit_display_order, mt.mit_code
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
                    mit_id,
                    mit_code,
                    mit_name,
                    mit_color,
                    mit_icon,
                    mit_display_order
                FROM migration_types_mit
                WHERE mit_active = TRUE
                ORDER BY mit_display_order, mit_name
            """)
        }
    }
}