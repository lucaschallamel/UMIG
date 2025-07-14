package umig.repository

import umig.utils.DatabaseUtil

/**
 * Repository for STEP master and instance data, including impacted teams and iteration scopes.
 */
class StepRepository {
    /**
     * Fetches master STEP data by code and number.
     */
    def findStepMaster(String sttCode, Integer stmNumber) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow('''
                SELECT stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name, stm.stm_description
                FROM steps_master_stm stm
                WHERE stm.stt_code = :sttCode AND stm.stm_number = :stmNumber
            ''', [sttCode: sttCode, stmNumber: stmNumber])
        }
    }

    /**
     * Fetches all impacted team IDs for a STEP (from join table).
     */
    def findImpactedTeamIds(UUID stmId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows('''
                SELECT tms_id
                FROM steps_master_stm_x_teams_tms_impacted
                WHERE stm_id = :stmId
            ''', [stmId: stmId])*.tms_id
        }
    }

    /**
     * Fetches all iteration types for a STEP (from join table).
     */
    def findIterationScopes(String sttCode, Integer stmNumber) {
        DatabaseUtil.withSql { sql ->
            return sql.rows('''
                SELECT itt_id
                FROM steps_master_stm_x_iteration_types_itt
                WHERE stt_code = :sttCode AND stm_number = :stmNumber
            ''', [sttCode: sttCode, stmNumber: stmNumber])*.itt_id
        }
    }

    /**
     * Fetches the first step instance for a given master step, for the first plan instance of the first iteration/migration (per current MVP logic).
     */
    def findFirstStepInstance(String sttCode, Integer stmNumber) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow('''
                SELECT sti.*
                FROM steps_instance_sti sti
                JOIN plans_instance_pli pli ON sti.pli_id = pli.pli_id
                JOIN plans_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite ite ON plm.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                WHERE sti.stt_code = :sttCode AND sti.stm_number = :stmNumber
                ORDER BY mig.mig_id, ite.ite_id, plm.plm_id, pli.pli_id, sti.sti_id
                LIMIT 1
            ''', [sttCode: sttCode, stmNumber: stmNumber])
        }
    }

    /**
     * Fetches filtered step instances for the runsheet with hierarchical filtering.
     * Returns steps grouped by sequence and phase with all required attributes.
     */
    List<Map> findFilteredStepInstances(Map filters) {
        DatabaseUtil.withSql { sql ->
            def query = '''
                SELECT 
                    -- Step instance data
                    sti.sti_id, stm.stt_code, stm.stm_number, sti.sti_name, sti.sti_status, 
                    sti.sti_duration_minutes, stm.tms_id_owner,
                    -- Master step data
                    stm.stm_id, stm.stm_name as master_name,
                    -- Sequence and phase hierarchy
                    sqm.sqm_id, sqm.sqm_name, sqm.sqm_order,
                    phm.phm_id, phm.phm_name, phm.phm_order,
                    -- Plan hierarchy
                    plm.plm_id, plm.plm_name,
                    -- Instance hierarchy
                    pli.pli_id, sqi.sqi_id, phi.phi_id,
                    -- Team owner information
                    tms.tms_name as owner_team_name,
                    -- Iteration and migration context
                    ite.ite_id, ite.ite_name,
                    mig.mig_id, mig.mig_name
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                WHERE 1=1
            '''
            
            def params = [:]
            
            // Add hierarchical filters
            if (filters.migrationId) {
                query += ' AND mig.mig_id = :migrationId'
                params.migrationId = UUID.fromString(filters.migrationId as String)
            }
            
            if (filters.iterationId) {
                query += ' AND ite.ite_id = :iterationId'
                params.iterationId = UUID.fromString(filters.iterationId as String)
            }
            
            if (filters.planId) {
                query += ' AND pli.pli_id = :planId'
                params.planId = UUID.fromString(filters.planId as String)
            }
            
            if (filters.sequenceId) {
                query += ' AND sqi.sqi_id = :sequenceId'
                params.sequenceId = UUID.fromString(filters.sequenceId as String)
            }
            
            if (filters.phaseId) {
                query += ' AND phi.phi_id = :phaseId'
                params.phaseId = UUID.fromString(filters.phaseId as String)
            }
            
            // Add team filter
            if (filters.teamId) {
                query += ' AND stm.tms_id_owner = :teamId'
                params.teamId = Integer.parseInt(filters.teamId as String)
            }
            
            // Add label filter (through step-label join table)
            if (filters.labelId) {
                query += '''
                    AND EXISTS (
                        SELECT 1 FROM labels_lbl_x_steps_master_stm lxs 
                        WHERE lxs.stm_id = stm.stm_id AND lxs.lbl_id = :labelId
                    )
                '''
                params.labelId = Integer.parseInt(filters.labelId as String)
            }
            
            // Order by sequence, phase, and step number
            query += '''
                ORDER BY sqm.sqm_order, phm.phm_order, stm.stm_number
            '''
            
            def results = sql.rows(query, params)
            
            // Transform results to frontend-compatible format
            return results.collect { row ->
                [
                    id: row.sti_id,
                    stmId: row.stm_id,
                    sttCode: row.stt_code,
                    stmNumber: row.stm_number,
                    name: row.sti_name ?: row.master_name,
                    status: row.sti_status,
                    durationMinutes: row.sti_duration_minutes,
                    ownerTeamId: row.tms_id_owner,
                    ownerTeamName: row.owner_team_name,
                    // Hierarchy context
                    sequenceId: row.sqm_id,
                    sequenceName: row.sqm_name,
                    sequenceNumber: row.sqm_order,
                    phaseId: row.phm_id,
                    phaseName: row.phm_name,
                    phaseNumber: row.phm_order,
                    planId: row.plm_id,
                    planName: row.plm_name,
                    iterationId: row.ite_id,
                    iterationName: row.ite_name,
                    migrationId: row.mig_id,
                    migrationName: row.mig_name
                ] as Map
            } as List<Map>
        }
    }

    /**
     * Fetches all labels associated with a step master.
     * @param stmId The UUID of the step master
     * @return A list of labels with id, name, description, and color
     */
    def findLabelsByStepId(UUID stmId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows('''
                SELECT l.lbl_id, l.lbl_name, l.lbl_description, l.lbl_color
                FROM labels_lbl l
                JOIN labels_lbl_x_steps_master_stm lxs ON l.lbl_id = lxs.lbl_id
                WHERE lxs.stm_id = :stmId
                ORDER BY l.lbl_name
            ''', [stmId: stmId])
            
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
