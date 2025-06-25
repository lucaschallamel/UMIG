package com.umig.repository

import com.umig.utils.DatabaseUtil
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
        def sql = DatabaseUtil.getSql()
        def plan = sql.firstRow("""
            SELECT mig_id, usr_id_owner, mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date
            FROM migrations_mig
            WHERE mig_id = :planId
        """, [planId: planId])

        return plan
    }

    /**
     * Retrieves all implementation plans from the database.
     * @return A list of maps, where each map is a plan.
     */
    def findAllPlans() {
        def sql = DatabaseUtil.getSql()
        def plans = sql.rows("""
            SELECT mig_id, usr_id_owner, mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date
            FROM migrations_mig
            ORDER BY mig_name
        """)

        return plans
    }

    /**
     * Creates a new implementation plan in the database.
     * @param planData A map containing the data for the new plan.
     * @return A map representing the newly created plan.
     */
    def createPlan(Map planData) {
        def sql = DatabaseUtil.getSql()
        // The RETURNING clause is essential for getting the auto-generated UUID back
        def insertQuery = """
            INSERT INTO migrations_mig (usr_id_owner, mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date)
            VALUES (:usr_id_owner, :mig_name, :mig_description, :mig_status, :mig_type, :mig_start_date, :mig_end_date)
            RETURNING mig_id
        """

        // Ensure optional fields are handled correctly if not present in the map
        planData.mig_start_date = planData.mig_start_date ?: null
        planData.mig_end_date = planData.mig_end_date ?: null
        planData.mig_description = planData.mig_description ?: null

        def generatedKeys = sql.executeInsert(insertQuery, planData)

        if (generatedKeys && generatedKeys[0]) {
            def newId = generatedKeys[0][0] as UUID // Cast to UUID
            return findPlanById(newId)
        }

        return null
    }

    /**
     * Updates an existing implementation plan.
     * @param planId The UUID of the plan to update.
     * @param planData A map containing the new data for the plan.
     * @return A map representing the updated plan.
     */
    def updatePlan(UUID planId, Map planData) {
        def sql = DatabaseUtil.getSql()
        def updateQuery = """
            UPDATE migrations_mig SET
                usr_id_owner = :usr_id_owner,
                mig_name = :mig_name,
                mig_description = :mig_description,
                mig_status = :mig_status,
                mig_type = :mig_type,
                mig_start_date = :mig_start_date,
                mig_end_date = :mig_end_date
            WHERE mig_id = :mig_id
        """

        planData.mig_id = planId
        // Handle optional fields
        planData.mig_start_date = planData.mig_start_date ?: null
        planData.mig_end_date = planData.mig_end_date ?: null
        planData.mig_description = planData.mig_description ?: null

        def updatedRows = sql.executeUpdate(updateQuery, planData)

        if (updatedRows > 0) {
            return findPlanById(planId)
        }

        return null
    }

    /**
     * Deletes an implementation plan from the database.
     * @param planId The UUID of the plan to delete.
     * @return true if the plan was deleted, false otherwise.
     */
    def deletePlan(UUID planId) {
        def sql = DatabaseUtil.getSql()
        def deleteQuery = "DELETE FROM migrations_mig WHERE mig_id = :planId"
        def deletedRows = sql.executeUpdate(deleteQuery, [planId: planId])

        return deletedRows > 0
    }
}
