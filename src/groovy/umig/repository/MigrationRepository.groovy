package umig.repository

import umig.utils.DatabaseUtil
import java.util.UUID

/**
 * Repository class for managing Migration data.
 * Handles all database operations for the migrations_mig table.
 */
class MigrationRepository {
    /**
     * Retrieves all migrations from the database.
     * @return A list of maps, where each map is a migration.
     */
    def findAllMigrations() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT mig_id, usr_id_owner, mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date, mig_business_cutover_date, created_by, created_at, updated_by, updated_at
                FROM migrations_mig
                ORDER BY mig_name
            """)
        }
    }

    /**
     * Finds a migration by its UUID.
     * @param migrationId The UUID of the migration to find.
     * @return A map representing the migration, or null if not found.
     */
    def findMigrationById(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT mig_id, usr_id_owner, mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date, mig_business_cutover_date, created_by, created_at, updated_by, updated_at
                FROM migrations_mig
                WHERE mig_id = :migrationId
            """, [migrationId: migrationId])
        }
    }

    /**
     * Finds all iterations for a given migration ID.
     * @param migrationId The UUID of the migration.
     * @return A list of maps, each representing an iteration.
     */
    def findIterationsByMigrationId(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT ite_id, mig_id, plm_id, itt_code, ite_name, ite_description, ite_status,
                       ite_static_cutover_date, ite_dynamic_cutover_date, created_by, created_at, updated_by, updated_at
                FROM iterations_ite
                WHERE mig_id = :migrationId
                ORDER BY ite_static_cutover_date
            """, [migrationId: migrationId])
        }
    }

    /**
     * Finds a single iteration by its UUID.
     * @param iterationId The UUID of the iteration to find.
     * @return A map representing the iteration, or null if not found.
     */
    def findIterationById(UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT ite_id, mig_id, plm_id, itt_code, ite_name, ite_description, ite_status,
                       ite_static_cutover_date, ite_dynamic_cutover_date, created_by, created_at, updated_by, updated_at
                FROM iterations_ite
                WHERE ite_id = :iterationId
            """, [iterationId: iterationId])
        }
    }
    /**
     * Finds all plan instances for a given iteration ID.
     * @param iterationId The UUID of the iteration.
     * @return A list of maps, each representing a plan instance (pli_id, plm_name).
     */
    def findPlanInstancesByIterationId(UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT pli.pli_id, plm.plm_name
                FROM plans_instance_pli pli
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                WHERE pli.ite_id = :iterationId
                ORDER BY plm.plm_name
            """, [iterationId: iterationId])
        }
    }

    /**
     * Finds all sequences for a given plan instance ID.
     * @param planInstanceId The UUID of the plan instance.
     * @return A list of maps, each representing a sequence (sqi_id, sqi_name).
     */
    def findSequencesByPlanInstanceId(UUID planInstanceId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT sqi_id, sqi_name
                FROM sequences_instance_sqi
                WHERE pli_id = :planInstanceId
                ORDER BY sqi_name
            """, [planInstanceId: planInstanceId])
        }
    }

    /**
     * Finds all phases for a given plan instance ID.
     * @param planInstanceId The UUID of the plan instance.
     * @return A list of maps, each representing a phase (phi_id, phi_name).
     */
    def findPhasesByPlanInstanceId(UUID planInstanceId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT phi.phi_id, phi.phi_name
                FROM phases_instance_phi phi
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                WHERE sqi.pli_id = :planInstanceId
                ORDER BY phi.phi_name
            """, [planInstanceId: planInstanceId])
        }
    }

    /**
     * Finds all phases for a given sequence ID.
     * @param sequenceId The UUID of the sequence.
     * @return A list of maps, each representing a phase (phi_id, phi_name).
     */
    def findPhasesBySequenceId(UUID sequenceId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT phi.phi_id, phi.phi_name
                FROM phases_instance_phi phi
                WHERE phi.sqi_id = :sequenceId
                ORDER BY phi.phi_name
            """, [sequenceId: sequenceId])
        }
    }

    /**
     * Finds all sequences for a given iteration ID.
     * @param iterationId The UUID of the iteration.
     * @return A list of maps, each representing a sequence (sqi_id, sqi_name).
     */
    def findSequencesByIterationId(UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT DISTINCT sqi.sqi_id, sqi.sqi_name
                FROM sequences_instance_sqi sqi
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                WHERE pli.ite_id = :iterationId
                ORDER BY sqi.sqi_name
            """, [iterationId: iterationId])
        }
    }

    /**
     * Finds all phases for a given iteration ID.
     * @param iterationId The UUID of the iteration.
     * @return A list of maps, each representing a phase (phi_id, phi_name).
     */
    def findPhasesByIterationId(UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT DISTINCT phi.phi_id, phi.phi_name
                FROM phases_instance_phi phi
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                WHERE pli.ite_id = :iterationId
                ORDER BY phi.phi_name
            """, [iterationId: iterationId])
        }
    }
}
