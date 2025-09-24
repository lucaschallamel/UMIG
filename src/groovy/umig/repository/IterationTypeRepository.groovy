package umig.repository

import umig.utils.DatabaseUtil
import groovy.sql.GroovyRowResult

/**
 * Repository class for managing Iteration Type data.
 * Handles all database operations for the iteration_types_itt table.
 * 
 * US-043: Phase 1 - Database Foundation
 */
class IterationTypeRepository {

    /**
     * Retrieves all iteration types from the database.
     * @param includeInactive If true, includes inactive iteration types (default: false)
     * @return A list of maps, where each map is an iteration type.
     */
    def findAllIterationTypes(boolean includeInactive = false) {
        DatabaseUtil.withSql { sql ->
            if (includeInactive) {
                return sql.rows("""
                    SELECT
                        it.itt_code,
                        it.itt_name,
                        it.itt_description,
                        it.itt_color,
                        it.itt_icon,
                        it.itt_display_order,
                        it.itt_active,
                        it.created_by,
                        it.created_at,
                        it.updated_by,
                        it.updated_at,
                        COALESCE(i.iteration_count, 0) as iteration_count
                    FROM iteration_types_itt it
                    LEFT JOIN (
                        SELECT itt_code, COUNT(*) as iteration_count
                        FROM iterations_ite
                        GROUP BY itt_code
                    ) i ON it.itt_code = i.itt_code
                    ORDER BY it.itt_display_order, it.itt_code
                """)
            } else {
                return sql.rows("""
                    SELECT
                        it.itt_code,
                        it.itt_name,
                        it.itt_description,
                        it.itt_color,
                        it.itt_icon,
                        it.itt_display_order,
                        it.itt_active,
                        it.created_by,
                        it.created_at,
                        it.updated_by,
                        it.updated_at,
                        COALESCE(i.iteration_count, 0) as iteration_count
                    FROM iteration_types_itt it
                    LEFT JOIN (
                        SELECT itt_code, COUNT(*) as iteration_count
                        FROM iterations_ite
                        GROUP BY itt_code
                    ) i ON it.itt_code = i.itt_code
                    WHERE it.itt_active = TRUE
                    ORDER BY it.itt_display_order, it.itt_code
                """)
            }
        }
    }

    /**
     * Retrieves iteration types with pagination and sorting support for Admin GUI.
     * @param pageNumber The page number (1-based)
     * @param pageSize The number of records per page
     * @param includeInactive If true, includes inactive iteration types
     * @param sortField Optional field to sort by (default: itt_display_order)
     * @param sortDirection Optional sort direction ('asc' or 'desc', default: 'asc')
     * @return A map containing paginated iteration types data and metadata
     */
    def findAllIterationTypesWithPagination(int pageNumber = 1, int pageSize = 50, boolean includeInactive = false, String sortField = null, String sortDirection = 'asc') {
        DatabaseUtil.withSql { sql ->
            // Validate and set default sort parameters (added iteration_count to allowed sort fields)
            def allowedSortFields = ['itt_code', 'itt_name', 'itt_description', 'itt_color', 'itt_icon', 'itt_display_order', 'itt_active', 'created_by', 'created_at', 'updated_by', 'updated_at', 'iteration_count']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'itt_display_order'
            }

            def direction = (sortDirection && ['asc', 'desc'].contains(sortDirection.toLowerCase())) ? sortDirection.toUpperCase() : 'ASC'

            // Calculate offset
            int offset = (pageNumber - 1) * pageSize

            // Count query needs to match the JOIN structure for accurate counts
            def countQuery = includeInactive ?
                """SELECT COUNT(*) as total FROM iteration_types_itt""" :
                """SELECT COUNT(*) as total FROM iteration_types_itt WHERE itt_active = TRUE"""

            def totalCount = sql.firstRow(countQuery).total as Integer

            // Build main query with LEFT JOIN for iteration_count and conditional WHERE clause
            String baseSelect = """SELECT
                    it.itt_code,
                    it.itt_name,
                    it.itt_description,
                    it.itt_color,
                    it.itt_icon,
                    it.itt_display_order,
                    it.itt_active,
                    it.created_by,
                    it.created_at,
                    it.updated_by,
                    it.updated_at,
                    COALESCE(i.iteration_count, 0) as iteration_count
                FROM iteration_types_itt it
                LEFT JOIN (
                    SELECT itt_code, COUNT(*) as iteration_count
                    FROM iterations_ite
                    GROUP BY itt_code
                ) i ON it.itt_code = i.itt_code"""

            String whereClause = includeInactive ? "" : " WHERE it.itt_active = TRUE"

            // Handle sorting - iteration_count is a computed field, others need it. prefix
            String sortColumn = (sortField == 'iteration_count') ? 'iteration_count' : 'it.' + sortField
            String orderByClause = " ORDER BY " + sortColumn + " " + direction
            String limitClause = " LIMIT " + pageSize + " OFFSET " + offset

            def dataQuery = baseSelect + whereClause + orderByClause + limitClause
            def iterationTypes = sql.rows(dataQuery)

            // Calculate pagination metadata
            int totalPages = Math.ceil((totalCount as double) / (pageSize as double)) as Integer

            return [
                data: iterationTypes,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: totalPages,
                    hasNext: pageNumber < totalPages,
                    hasPrevious: pageNumber > 1
                ],
                sort: [
                    field: sortField,
                    direction: direction.toLowerCase()
                ]
            ]
        }
    }

    /**
     * Finds an iteration type by its code.
     * @param ittCode The code of the iteration type to find.
     * @return A map representing the iteration type, or null if not found.
     */
    def findIterationTypeByCode(String ittCode) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT
                    it.itt_code,
                    it.itt_name,
                    it.itt_description,
                    it.itt_color,
                    it.itt_icon,
                    it.itt_display_order,
                    it.itt_active,
                    it.created_by,
                    it.created_at,
                    it.updated_by,
                    it.updated_at,
                    COALESCE(i.iteration_count, 0) as iteration_count
                FROM iteration_types_itt it
                LEFT JOIN (
                    SELECT itt_code, COUNT(*) as iteration_count
                    FROM iterations_ite
                    GROUP BY itt_code
                ) i ON it.itt_code = i.itt_code
                WHERE it.itt_code = :ittCode
            """, [ittCode: ittCode])
        }
    }

    /**
     * Creates a new iteration type.
     * @param params Map containing the iteration type data.
     * @return The created iteration type as a map.
     */
    def createIterationType(Map params) {
        DatabaseUtil.withSql { sql ->
            // Validate required fields
            if (!params.itt_code || !params.itt_name) {
                throw new IllegalArgumentException("itt_code and itt_name are required")
            }

            // Set defaults
            params.itt_description = params.itt_description ?: null
            params.itt_color = params.itt_color ?: '#6B73FF'
            params.itt_icon = params.itt_icon ?: 'play-circle'
            params.itt_display_order = params.itt_display_order ?: 0
            params.itt_active = params.itt_active != null ? params.itt_active : true
            params.created_by = params.created_by ?: 'system'
            params.updated_by = params.updated_by ?: params.created_by

            def result = sql.firstRow("""
                INSERT INTO iteration_types_itt (
                    itt_code,
                    itt_name,
                    itt_description,
                    itt_color,
                    itt_icon,
                    itt_display_order,
                    itt_active,
                    created_by,
                    updated_by
                ) VALUES (
                    :itt_code,
                    :itt_name,
                    :itt_description,
                    :itt_color,
                    :itt_icon,
                    :itt_display_order,
                    :itt_active,
                    :created_by,
                    :updated_by
                ) RETURNING *
            """, params)

            return result
        }
    }

    /**
     * Updates an existing iteration type.
     * @param ittCode The code of the iteration type to update.
     * @param params Map containing the fields to update.
     * @return The updated iteration type as a map, or null if not found.
     */
    def updateIterationType(String ittCode, Map params) {
        DatabaseUtil.withSql { sql ->
            // Build dynamic update query based on provided params
            def updateFields = []
            def queryParams = [itt_code: ittCode]

            // List of updatable fields
            def updatableFields = [
                'itt_name', 'itt_description', 'itt_color', 
                'itt_icon', 'itt_display_order', 'itt_active'
            ]

            updatableFields.each { field ->
                if (params.containsKey(field)) {
                    updateFields << "${field} = :${field}"
                    queryParams[field] = params[field]
                }
            }

            if (updateFields.isEmpty()) {
                return findIterationTypeByCode(ittCode)
            }

            // Always update the updated_by and updated_at fields
            updateFields << "updated_by = :updated_by"
            updateFields << "updated_at = CURRENT_TIMESTAMP"
            queryParams.updated_by = params.updated_by ?: 'system'

            def query = """
                UPDATE iteration_types_itt
                SET ${updateFields.join(', ')}
                WHERE itt_code = :itt_code
                RETURNING *
            """

            return sql.firstRow(query, queryParams)
        }
    }

    /**
     * Deletes an iteration type.
     * @param ittCode The code of the iteration type to delete.
     * @return true if deleted, false if not found.
     */
    def deleteIterationType(String ittCode) {
        DatabaseUtil.withSql { sql ->
            def deleted = sql.executeUpdate("""
                DELETE FROM iteration_types_itt
                WHERE itt_code = :ittCode
            """, [ittCode: ittCode])
            
            return deleted > 0
        }
    }

    /**
     * Returns all relationships that block deletion of an iteration type.
     * @param ittCode The code of the iteration type.
     * @return Map of relationship type to list of referencing records.
     */
    def getIterationTypeBlockingRelationships(String ittCode) {
        DatabaseUtil.withSql { sql ->
            def blocking = [:]

            // Check iterations using this type
            def iterations = sql.rows("""
                SELECT 
                    i.ite_id, 
                    i.ite_name,
                    m.mig_name
                FROM iterations_ite i
                JOIN migrations_mig m ON m.mig_id = i.mig_id
                WHERE i.itt_code = :ittCode
            """, [ittCode: ittCode])
            if (iterations) blocking['iterations'] = iterations

            // Check steps_master linked to this iteration type
            def steps = sql.rows("""
                SELECT 
                    s.stm_id,
                    s.stm_name,
                    s.stm_description
                FROM steps_master_stm_x_iteration_types_itt sit
                JOIN steps_master_stm s ON s.stm_id = sit.stm_id
                WHERE sit.itt_code = :ittCode
            """, [ittCode: ittCode])
            if (steps) blocking['steps_master'] = steps

            return blocking
        }
    }

    /**
     * Checks if an iteration type code already exists.
     * @param ittCode The code to check.
     * @return true if exists, false otherwise.
     */
    def iterationTypeExists(String ittCode) {
        DatabaseUtil.withSql { sql ->
            def count = sql.firstRow("""
                SELECT COUNT(*) as count
                FROM iteration_types_itt
                WHERE itt_code = :ittCode
            """, [ittCode: ittCode])
            
            return (count.count as Integer) > 0
        }
    }

    /**
     * Gets the maximum display order value.
     * @return The maximum display order, or 0 if no iteration types exist.
     */
    def getMaxDisplayOrder() {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                SELECT COALESCE(MAX(itt_display_order), 0) as max_order
                FROM iteration_types_itt
            """)
            
            return result.max_order
        }
    }

    /**
     * Reorders iteration types by updating their display_order values.
     * @param orderMap Map of itt_code to new display_order values.
     * @return Number of iteration types updated.
     */
    def reorderIterationTypes(Map<String, Integer> orderMap) {
        DatabaseUtil.withSql { sql ->
            def updateCount = 0
            
            sql.withTransaction {
                orderMap.each { ittCode, displayOrder ->
                    def updated = sql.executeUpdate("""
                        UPDATE iteration_types_itt
                        SET itt_display_order = :displayOrder,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE itt_code = :ittCode
                    """, [ittCode: ittCode, displayOrder: displayOrder])
                    
                    updateCount += updated
                }
            }
            
            return updateCount
        }
    }

    /**
     * Gets iteration type usage statistics.
     * @return A list of iteration types with their usage counts.
     */
    def getIterationTypeUsageStats() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT
                    it.itt_code,
                    it.itt_name,
                    it.itt_active,
                    COALESCE(i.iteration_count, 0) as iteration_count,
                    COALESCE(s.step_count, 0) as step_count
                FROM iteration_types_itt it
                LEFT JOIN (
                    SELECT itt_code, COUNT(*) as iteration_count
                    FROM iterations_ite
                    GROUP BY itt_code
                ) i ON it.itt_code = i.itt_code
                LEFT JOIN (
                    SELECT itt_code, COUNT(*) as step_count
                    FROM steps_master_stm_x_iteration_types_itt
                    GROUP BY itt_code
                ) s ON it.itt_code = s.itt_code
                ORDER BY it.itt_display_order, it.itt_code
            """)
        }
    }
}