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
}
