package umig.repository

import umig.utils.DatabaseUtil

/**
 * Repository class for managing Label data.
 * Handles all database operations for the labels_lbl table and hierarchical filtering.
 */
class LabelRepository {

    /**
     * Retrieves all labels from the database.
     * @return A list of labels with frontend-compatible field names.
     */
    def findAllLabels() {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT lbl_id, lbl_name, lbl_description, lbl_color
                FROM labels_lbl
                ORDER BY lbl_name
            """)
            
            // Transform to match frontend expectations
            return results.collect { row ->
                [
                    id: row.lbl_id,
                    name: row.lbl_name,
                    description: row.lbl_description,
                    color: row.lbl_color
                ]
            }
        }
    }

    /**
     * Finds labels involved in a specific migration.
     * @param migrationId The UUID of the migration.
     * @return A list of labels involved in the migration.
     */
    def findLabelsByMigrationId(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT DISTINCT l.lbl_id, l.lbl_name, l.lbl_description, l.lbl_color
                FROM labels_lbl l
                JOIN labels_lbl_x_steps_master_stm lxs ON l.lbl_id = lxs.lbl_id
                JOIN steps_master_stm s ON lxs.stm_id = s.stm_id
                JOIN phases_master_phm p ON s.phm_id = p.phm_id
                JOIN sequences_master_sqm sq ON p.sqm_id = sq.sqm_id
                JOIN plans_master_plm pl ON sq.plm_id = pl.plm_id
                JOIN iterations_ite i ON pl.plm_id = i.plm_id
                WHERE i.mig_id = :migrationId
                ORDER BY l.lbl_name
            """, [migrationId: migrationId])
            
            // Transform to match frontend expectations
            return results.collect { row ->
                [
                    id: row.lbl_id,
                    name: row.lbl_name,
                    description: row.lbl_description,
                    color: row.lbl_color
                ]
            }
        }
    }

    /**
     * Finds labels involved in a specific iteration.
     * @param iterationId The UUID of the iteration.
     * @return A list of labels involved in the iteration.
     */
    def findLabelsByIterationId(UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT DISTINCT l.lbl_id, l.lbl_name, l.lbl_description, l.lbl_color
                FROM labels_lbl l
                JOIN labels_lbl_x_steps_master_stm lxs ON l.lbl_id = lxs.lbl_id
                JOIN steps_master_stm s ON lxs.stm_id = s.stm_id
                JOIN phases_master_phm p ON s.phm_id = p.phm_id
                JOIN sequences_master_sqm sq ON p.sqm_id = sq.sqm_id
                JOIN plans_master_plm pl ON sq.plm_id = pl.plm_id
                JOIN iterations_ite i ON pl.plm_id = i.plm_id
                WHERE i.ite_id = :iterationId
                ORDER BY l.lbl_name
            """, [iterationId: iterationId])
            
            // Transform to match frontend expectations
            return results.collect { row ->
                [
                    id: row.lbl_id,
                    name: row.lbl_name,
                    description: row.lbl_description,
                    color: row.lbl_color
                ]
            }
        }
    }

    /**
     * Finds all labels with pagination support.
     * @param pageNumber The page number (1-based)
     * @param pageSize The number of items per page
     * @param searchTerm Optional search term to filter labels
     * @param sortField The field to sort by
     * @param sortDirection The sort direction (asc/desc)
     * @return A map containing items and total count
     */
    Map findAllLabelsWithPagination(int pageNumber = 1, int pageSize = 50, String searchTerm = null, String sortField = 'lbl_id', String sortDirection = 'asc') {
        DatabaseUtil.withSql { sql ->
            def offset = (pageNumber - 1) * pageSize
            def params = [:]
            
            // Base query parts
            def selectClause = """
                SELECT 
                    l.lbl_id,
                    l.lbl_name,
                    l.lbl_description,
                    l.lbl_color,
                    l.mig_id,
                    l.created_at,
                    l.created_by,
                    m.mig_name,
                    u.usr_first_name,
                    u.usr_last_name,
                    COALESCE(app_counts.app_count, 0)::INTEGER AS application_count,
                    COALESCE(step_counts.step_count, 0)::INTEGER AS step_count
            """
            
            def fromClause = """
                FROM labels_lbl l
                LEFT JOIN migrations_mig m ON l.mig_id = m.mig_id
                LEFT JOIN users_usr u ON l.created_by = u.usr_id
                LEFT JOIN (
                    SELECT lbl_id, COUNT(*)::INTEGER AS app_count
                    FROM labels_lbl_x_applications_app
                    GROUP BY lbl_id
                ) app_counts ON l.lbl_id = app_counts.lbl_id
                LEFT JOIN (
                    SELECT lbl_id, COUNT(*)::INTEGER AS step_count
                    FROM labels_lbl_x_steps_master_stm
                    GROUP BY lbl_id
                ) step_counts ON l.lbl_id = step_counts.lbl_id
            """
            
            def whereClause = ""
            if (searchTerm?.trim()) {
                whereClause = """
                    WHERE (
                        LOWER(l.lbl_name) LIKE LOWER(:searchTerm) OR
                        LOWER(l.lbl_description) LIKE LOWER(:searchTerm) OR
                        LOWER(m.mig_name) LIKE LOWER(:searchTerm)
                    )
                """
                params.searchTerm = "%${searchTerm.trim()}%"
            }
            
            // Validate and apply sort field
            def validSortFields = ['lbl_id', 'lbl_name', 'lbl_description', 'lbl_color', 'mig_name', 'application_count', 'step_count', 'created_at']
            if (!validSortFields.contains(sortField)) {
                sortField = 'lbl_id'
            }
            
            // For aggregate columns and joined columns, we need to reference the alias
            def orderByColumn = sortField
            if (sortField in ['application_count', 'step_count']) {
                orderByColumn = sortField
            } else if (sortField == 'mig_name') {
                orderByColumn = "m.mig_name"
            } else {
                orderByColumn = "l.${sortField}"
            }
            
            def orderByClause = "ORDER BY ${orderByColumn} ${sortDirection.toLowerCase() == 'desc' ? 'DESC' : 'ASC'}"
            
            // Get total count
            def countQuery = "SELECT COUNT(*) as total FROM labels_lbl l LEFT JOIN migrations_mig m ON l.mig_id = m.mig_id ${whereClause}"
            def totalCount = sql.firstRow(countQuery, params).total as Long
            
            // Get paginated results
            def query = """
                ${selectClause}
                ${fromClause}
                ${whereClause}
                ${orderByClause}
                LIMIT :limit OFFSET :offset
            """
            
            params.limit = pageSize
            params.offset = offset
            
            def labels = sql.rows(query, params)
            
            // Transform results to match frontend expectations
            def items = labels.collect { row ->
                [
                    lbl_id: row.lbl_id,
                    lbl_name: row.lbl_name,
                    lbl_description: row.lbl_description,
                    lbl_color: row.lbl_color,
                    mig_id: row.mig_id,
                    mig_name: row.mig_name,
                    created_at: row.created_at,
                    created_by: row.created_by,
                    created_by_name: row.usr_first_name ? "${row.usr_first_name} ${row.usr_last_name}" : null,
                    application_count: row.application_count,
                    step_count: row.step_count
                ]
            }
            
            return [
                items: items,
                total: totalCount.intValue(),
                page: pageNumber,
                size: pageSize,
                totalPages: Math.ceil(totalCount.doubleValue() / pageSize) as Integer
            ]
        }
    }

    /**
     * Finds a label by its ID with full details.
     * @param labelId The ID of the label to find.
     * @return A map representing the label with related data, or null if not found.
     */
    Map findLabelById(int labelId) {
        DatabaseUtil.withSql { sql ->
            def label = sql.firstRow("""
                SELECT 
                    l.lbl_id,
                    l.lbl_name,
                    l.lbl_description,
                    l.lbl_color,
                    l.mig_id,
                    l.created_at,
                    l.created_by,
                    m.mig_name,
                    u.usr_first_name,
                    u.usr_last_name
                FROM labels_lbl l
                LEFT JOIN migrations_mig m ON l.mig_id = m.mig_id
                LEFT JOIN users_usr u ON l.created_by = u.usr_id
                WHERE l.lbl_id = :labelId
            """, [labelId: labelId])

            if (label) {
                // Transform to proper structure
                def result = [
                    lbl_id: label.lbl_id,
                    lbl_name: label.lbl_name,
                    lbl_description: label.lbl_description,
                    lbl_color: label.lbl_color,
                    mig_id: label.mig_id,
                    mig_name: label.mig_name,
                    created_at: label.created_at,
                    created_by: label.created_by,
                    created_by_name: label.usr_first_name ? "${label.usr_first_name} ${label.usr_last_name}" : null
                ]

                // Get related applications
                result.applications = sql.rows("""
                    SELECT a.app_id, a.app_code, a.app_name
                    FROM applications_app a
                    JOIN labels_lbl_x_applications_app lxa ON a.app_id = lxa.app_id
                    WHERE lxa.lbl_id = :labelId
                    ORDER BY a.app_code
                """, [labelId: labelId])

                // Get related steps count
                def stepCount = sql.firstRow("""
                    SELECT COUNT(*) as count
                    FROM labels_lbl_x_steps_master_stm
                    WHERE lbl_id = :labelId
                """, [labelId: labelId])
                result.step_count = stepCount.count

                return result
            }

            return null
        }
    }

    /**
     * Creates a new label.
     * @param label A map containing the label data.
     * @return The created label with its generated ID.
     */
    Map createLabel(Map label) {
        DatabaseUtil.withSql { sql ->
            def keys = sql.executeInsert("""
                INSERT INTO labels_lbl (lbl_name, lbl_description, lbl_color, mig_id, created_by, created_at)
                VALUES (:lbl_name, :lbl_description, :lbl_color, :mig_id, :created_by, NOW())
            """, label)
            
            label.lbl_id = keys[0][0]
            return label
        }
    }

    /**
     * Updates an existing label.
     * @param labelId The ID of the label to update.
     * @param updates A map containing the fields to update.
     * @return The updated label.
     */
    Map updateLabel(int labelId, Map updates) {
        DatabaseUtil.withSql { sql ->
            // Build dynamic UPDATE query based on provided fields
            def setClause = []
            def params = [lbl_id: labelId]
            
            if (updates.containsKey('lbl_name')) {
                setClause.add('lbl_name = :lbl_name')
                params.lbl_name = updates.lbl_name
            }
            
            if (updates.containsKey('lbl_description')) {
                setClause.add('lbl_description = :lbl_description')
                params.lbl_description = updates.lbl_description
            }
            
            if (updates.containsKey('lbl_color')) {
                setClause.add('lbl_color = :lbl_color')
                params.lbl_color = updates.lbl_color
            }
            
            if (updates.containsKey('mig_id')) {
                setClause.add('mig_id = :mig_id')
                params.mig_id = updates.mig_id
            }
            
            if (setClause.isEmpty()) {
                // No updates to perform
                return findLabelById(labelId)
            }
            
            def query = """
                UPDATE labels_lbl
                SET ${setClause.join(', ')}
                WHERE lbl_id = :lbl_id
            """
            
            sql.executeUpdate(query, params)
            
            return findLabelById(labelId)
        }
    }

    /**
     * Deletes a label.
     * @param labelId The ID of the label to delete.
     * @return true if deleted successfully, false otherwise.
     */
    boolean deleteLabel(int labelId) {
        DatabaseUtil.withSql { sql ->
            def rowsAffected = sql.executeUpdate("""
                DELETE FROM labels_lbl WHERE lbl_id = :labelId
            """, [labelId: labelId])
            
            return rowsAffected > 0
        }
    }

    /**
     * Returns all relationships that block deletion of a label.
     * @param labelId The ID of the label.
     * @return Map of relationship type to list of referencing records.
     */
    Map getLabelBlockingRelationships(int labelId) {
        DatabaseUtil.withSql { sql ->
            def blocking = [:]

            // Applications
            def applications = sql.rows("""
                SELECT a.app_id, a.app_code, a.app_name
                FROM applications_app a
                JOIN labels_lbl_x_applications_app lxa ON a.app_id = lxa.app_id
                WHERE lxa.lbl_id = :labelId
                ORDER BY a.app_code
            """, [labelId: labelId])
            
            if (applications) {
                blocking.applications = applications
            }

            // Steps
            def stepCount = sql.firstRow("""
                SELECT COUNT(*) as count
                FROM labels_lbl_x_steps_master_stm
                WHERE lbl_id = :labelId
            """, [labelId: labelId])
            
            if ((stepCount.count as Integer) > 0) {
                blocking.steps = [count: stepCount.count as Integer]
            }

            return blocking
        }
    }

    /**
     * Finds labels involved in a specific plan instance.
     * @param planInstanceId The UUID of the plan instance.
     * @return A list of labels involved in the plan instance.
     */
    def findLabelsByPlanId(UUID planInstanceId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT DISTINCT l.lbl_id, l.lbl_name, l.lbl_description, l.lbl_color
                FROM labels_lbl l
                JOIN labels_lbl_x_steps_master_stm lxs ON l.lbl_id = lxs.lbl_id
                JOIN steps_master_stm s ON lxs.stm_id = s.stm_id
                JOIN phases_master_phm p ON s.phm_id = p.phm_id
                JOIN sequences_master_sqm sq ON p.sqm_id = sq.sqm_id
                JOIN plans_instance_pli pli ON sq.plm_id = pli.plm_id
                WHERE pli.pli_id = :planInstanceId
                ORDER BY l.lbl_name
            """, [planInstanceId: planInstanceId])
            
            // Transform to match frontend expectations
            return results.collect { row ->
                [
                    id: row.lbl_id,
                    name: row.lbl_name,
                    description: row.lbl_description,
                    color: row.lbl_color
                ]
            }
        }
    }

    /**
     * Finds labels involved in a specific sequence instance.
     * @param sequenceInstanceId The UUID of the sequence instance.
     * @return A list of labels involved in the sequence instance.
     */
    def findLabelsBySequenceId(UUID sequenceInstanceId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT DISTINCT l.lbl_id, l.lbl_name, l.lbl_description, l.lbl_color
                FROM labels_lbl l
                JOIN labels_lbl_x_steps_master_stm lxs ON l.lbl_id = lxs.lbl_id
                JOIN steps_master_stm s ON lxs.stm_id = s.stm_id
                JOIN phases_master_phm p ON s.phm_id = p.phm_id
                JOIN sequences_instance_sqi sqi ON p.sqm_id = sqi.sqm_id
                WHERE sqi.sqi_id = :sequenceInstanceId
                ORDER BY l.lbl_name
            """, [sequenceInstanceId: sequenceInstanceId])
            
            // Transform to match frontend expectations
            return results.collect { row ->
                [
                    id: row.lbl_id,
                    name: row.lbl_name,
                    description: row.lbl_description,
                    color: row.lbl_color
                ]
            }
        }
    }

    /**
     * Finds labels involved in a specific phase instance.
     * This is the core method that implements your requirement:
     * - Get all step instances (STI) in the phase instance
     * - For each STI, get its master STM via stm_id
     * - Find all labels associated with those STMs
     * @param phaseInstanceId The UUID of the phase instance.
     * @return A list of labels involved in the phase instance.
     */
    def findLabelsByPhaseId(UUID phaseInstanceId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
                SELECT DISTINCT l.lbl_id, l.lbl_name, l.lbl_description, l.lbl_color
                FROM labels_lbl l
                JOIN labels_lbl_x_steps_master_stm lxs ON l.lbl_id = lxs.lbl_id
                JOIN steps_master_stm s ON lxs.stm_id = s.stm_id
                JOIN steps_instance_sti sti ON s.stm_id = sti.stm_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                WHERE phi.phi_id = :phaseInstanceId
                ORDER BY l.lbl_name
            """, [phaseInstanceId: phaseInstanceId])
            
            // Transform to match frontend expectations
            return results.collect { row ->
                [
                    id: row.lbl_id,
                    name: row.lbl_name,
                    description: row.lbl_description,
                    color: row.lbl_color
                ]
            }
        }
    }
}