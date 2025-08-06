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
    
    /**
     * Enriches migration data with status metadata while maintaining backward compatibility.
     * @param row Database row containing migration and status data
     * @return Enhanced migration map with statusMetadata
     */
    private Map enrichMigrationWithStatusMetadata(Map row) {
        return [
            mig_id: row.mig_id,
            usr_id_owner: row.usr_id_owner,
            mig_name: row.mig_name,
            mig_description: row.mig_description,
            mig_status: row.sts_name, // Backward compatibility - return status name as string
            mig_type: row.mig_type,
            mig_start_date: row.mig_start_date,
            mig_end_date: row.mig_end_date,
            mig_business_cutover_date: row.mig_business_cutover_date,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            // Enhanced status metadata
            statusMetadata: [
                id: row.sts_id,
                name: row.sts_name,
                color: row.sts_color,
                type: row.sts_type
            ]
        ]
    }
    
    /**
     * Enriches iteration data with status metadata while maintaining backward compatibility.
     * @param row Database row containing iteration and status data
     * @return Enhanced iteration map with statusMetadata
     */
    private Map enrichIterationWithStatusMetadata(Map row) {
        return [
            ite_id: row.ite_id,
            mig_id: row.mig_id,
            plm_id: row.plm_id,
            itt_code: row.itt_code,
            ite_name: row.ite_name,
            ite_description: row.ite_description,
            ite_status: row.sts_name, // Backward compatibility - return status name as string
            ite_static_cutover_date: row.ite_static_cutover_date,
            ite_dynamic_cutover_date: row.ite_dynamic_cutover_date,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            // Enhanced status metadata
            statusMetadata: [
                id: row.sts_id,
                name: row.sts_name,
                color: row.sts_color,
                type: row.sts_type
            ]
        ]
    }
}
