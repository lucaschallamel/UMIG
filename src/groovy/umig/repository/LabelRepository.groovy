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