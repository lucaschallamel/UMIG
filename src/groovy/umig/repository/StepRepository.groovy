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
}
