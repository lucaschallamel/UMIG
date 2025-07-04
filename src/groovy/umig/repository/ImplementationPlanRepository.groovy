package umig.repository

import umig.utils.DatabaseUtil
import java.util.UUID

/**
 * Repository class for managing Implementation Plan data.
 * Handles all database operations for the migrations_mig table.
 */
class ImplementationPlanRepository {

    /**
     * Finds an implementation plan by its UUID.
     * @param planId The UUID of the plan to find.
     * @return A map representing the plan, or null if not found.
     */
    def findPlanById(UUID planId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT mig_id, usr_id_owner, mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date
                FROM migrations_mig
                WHERE mig_id = :planId
            """, [planId: planId])
        }
    }

    /**
     * Retrieves all implementation plans from the database.
     * @return A list of maps, where each map is a plan.
     */
    def findAllPlans() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT mig_id, usr_id_owner, mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date
                FROM migrations_mig
                ORDER BY mig_name
            """)
        }
    }

    /**
     * Creates a new implementation plan in the database.
     * @param planData A map containing the data for the new plan.
     * @return A map representing the newly created plan.
     */
    def createPlan(Map planData) {
        DatabaseUtil.withSql { sql ->
            // The RETURNING clause is essential for getting the auto-generated UUID back
            def insertQuery = """
                INSERT INTO migrations_mig (usr_id_owner, mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date)
                VALUES (:usr_id_owner, :mig_name, :mig_description, :mig_status, :mig_type, :mig_start_date, :mig_end_date)
                RETURNING mig_id
            """

            def result = sql.firstRow(insertQuery, planData)

            if (result && result.mig_id) {
                return findPlanById(result.mig_id as UUID)
            }

            return null
        }
    }

    /**
     * Updates an existing implementation plan.
     * @param planId The UUID of the plan to update.
     * @param planData A map containing the new data for the plan.
     * @return A map representing the updated plan.
     */
    def updatePlan(UUID planId, Map planData) {
        DatabaseUtil.withSql { sql ->
            if (sql.firstRow('SELECT mig_id FROM migrations_mig WHERE mig_id = :planId', [planId: planId]) == null) {
                return null
            }

            def setClauses = []
            def queryParams = [:]
            def updatableFields = ['usr_id_owner', 'mig_name', 'mig_description', 'mig_status', 'mig_type', 'mig_start_date', 'mig_end_date']

            planData.each { key, value ->
                if (key in updatableFields) {
                    setClauses.add("${key} = :${key}")
                    queryParams[key] = value
                }
            }

            if (setClauses.isEmpty()) {
                return
            }

            queryParams['mig_id'] = planId
            def updateQuery = "UPDATE migrations_mig SET ${setClauses.join(', ')} WHERE mig_id = :mig_id"

            sql.executeUpdate(updateQuery, queryParams)
        }
        return findPlanById(planId)
    }

    /**
     * Deletes an implementation plan from the database.
     * @param planId The UUID of the plan to delete.
     * @return true if the plan was deleted, false otherwise.
     */
    def deletePlan(UUID planId) {
        DatabaseUtil.withSql { sql ->
            def deleteQuery = "DELETE FROM migrations_mig WHERE mig_id = :planId"
            def rowsAffected = sql.executeUpdate(deleteQuery, [planId: planId])
            return rowsAffected > 0
        }
    }
}
