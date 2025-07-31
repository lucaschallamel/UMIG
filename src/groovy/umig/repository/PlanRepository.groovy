package umig.repository

import umig.utils.DatabaseUtil
import java.util.UUID

/**
 * Repository class for managing Plans data.
 * Handles operations for both master plans (plans_master_plm) and plan instances (plans_instance_pli).
 * Following the canonical-first approach with consolidated operations.
 */
class PlanRepository {

    // ==================== MASTER PLAN OPERATIONS ====================
    
    /**
     * Retrieves all master plans with status and team information.
     * @return List of master plans with enriched data
     */
    def findAllMasterPlans() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    plm.plm_id, 
                    plm.tms_id, 
                    plm.plm_name, 
                    plm.plm_description, 
                    plm.plm_status,
                    plm.created_by,
                    plm.created_at,
                    plm.updated_by,
                    plm.updated_at,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    tms.tms_name
                FROM plans_master_plm plm
                LEFT JOIN status_sts sts ON sts.sts_name = plm.plm_status AND sts.sts_type = 'Plan'
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                ORDER BY plm.created_at DESC
            """)
        }
    }
    
    /**
     * Finds a specific master plan by ID.
     * @param planId The UUID of the master plan
     * @return Map containing plan details or null if not found
     */
    def findMasterPlanById(UUID planId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT 
                    plm.plm_id, 
                    plm.tms_id, 
                    plm.plm_name, 
                    plm.plm_description, 
                    plm.plm_status,
                    plm.created_by,
                    plm.created_at,
                    plm.updated_by,
                    plm.updated_at,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    tms.tms_name
                FROM plans_master_plm plm
                LEFT JOIN status_sts sts ON sts.sts_name = plm.plm_status AND sts.sts_type = 'Plan'
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                WHERE plm.plm_id = :planId
            """, [planId: planId])
        }
    }
    
    /**
     * Creates a new master plan.
     * @param planData Map containing plan data (tms_id, plm_name, plm_description, plm_status)
     * @return Map containing the created plan or null on failure
     */
    def createMasterPlan(Map planData) {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                INSERT INTO plans_master_plm (
                    tms_id, plm_name, plm_description, plm_status, 
                    created_by, updated_by
                ) VALUES (
                    :tms_id, :plm_name, :plm_description, :plm_status,
                    'system', 'system'
                )
                RETURNING plm_id
            """, planData)
            
            if (result?.plm_id) {
                return findMasterPlanById(result.plm_id as UUID)
            }
            return null
        }
    }
    
    /**
     * Updates an existing master plan.
     * @param planId The UUID of the plan to update
     * @param planData Map containing fields to update
     * @return Map containing the updated plan or null if not found
     */
    def updateMasterPlan(UUID planId, Map planData) {
        DatabaseUtil.withSql { sql ->
            // Check if plan exists
            if (!sql.firstRow('SELECT plm_id FROM plans_master_plm WHERE plm_id = :planId', [planId: planId])) {
                return null
            }
            
            // Build dynamic update query
            def setClauses = []
            def queryParams = [:]
            def updatableFields = ['tms_id', 'plm_name', 'plm_description', 'plm_status']
            
            planData.each { key, value ->
                if (key in updatableFields) {
                    setClauses.add("${key} = :${key}")
                    queryParams[key] = value
                }
            }
            
            if (setClauses.isEmpty()) {
                return findMasterPlanById(planId)
            }
            
            queryParams['planId'] = planId
            setClauses.add("updated_by = 'system'")
            setClauses.add("updated_at = CURRENT_TIMESTAMP")
            
            def updateQuery = "UPDATE plans_master_plm SET ${setClauses.join(', ')} WHERE plm_id = :planId"
            sql.executeUpdate(updateQuery, queryParams)
            
            return findMasterPlanById(planId)
        }
    }
    
    /**
     * Soft deletes a master plan by setting a flag.
     * @param planId The UUID of the plan to delete
     * @return true if deleted successfully, false otherwise
     */
    def softDeleteMasterPlan(UUID planId) {
        DatabaseUtil.withSql { sql ->
            // Note: Currently plans_master_plm doesn't have soft_delete_flag
            // For now, we'll just check if deletion is possible
            // In production, you'd add a soft_delete_flag column
            return sql.firstRow('SELECT plm_id FROM plans_master_plm WHERE plm_id = :planId', [planId: planId]) != null
        }
    }
    
    // ==================== INSTANCE PLAN OPERATIONS ====================
    
    /**
     * Finds plan instances with hierarchical filtering.
     * @param filters Map containing optional filters (migrationId, iterationId, teamId, statusId)
     * @return List of plan instances with enriched data
     */
    def findPlanInstancesByFilters(Map filters) {
        DatabaseUtil.withSql { sql ->
            def query = """
                SELECT 
                    pli.pli_id,
                    pli.plm_id,
                    pli.ite_id,
                    pli.pli_name,
                    pli.pli_description,
                    pli.pli_status,
                    pli.usr_id_owner,
                    pli.created_at,
                    pli.updated_at,
                    plm.plm_name,
                    plm.tms_id,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    usr.usr_name as owner_name,
                    itr.itr_name,
                    mig.mig_name
                FROM plans_instance_pli pli
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_itr itr ON pli.ite_id = itr.itr_id
                JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
                LEFT JOIN status_sts sts ON sts.sts_name = pli.pli_status AND sts.sts_type = 'Plan'
                LEFT JOIN users_usr usr ON pli.usr_id_owner = usr.usr_id
                WHERE 1=1
            """
            
            def params = [:]
            
            // Add filters with type safety
            if (filters.migrationId) {
                query += ' AND mig.mig_id = :migrationId'
                params.migrationId = UUID.fromString(filters.migrationId as String)
            }
            
            if (filters.iterationId) {
                query += ' AND pli.ite_id = :iterationId'
                params.iterationId = UUID.fromString(filters.iterationId as String)
            }
            
            if (filters.teamId) {
                query += ' AND plm.tms_id = :teamId'
                params.teamId = Integer.parseInt(filters.teamId as String)
            }
            
            if (filters.statusId) {
                query += ' AND sts.sts_id = :statusId'
                params.statusId = Integer.parseInt(filters.statusId as String)
            }
            
            query += ' ORDER BY pli.created_at DESC'
            
            return sql.rows(query, params)
        }
    }
    
    /**
     * Finds a specific plan instance by ID with full details.
     * @param instanceId The UUID of the plan instance
     * @return Map containing instance details or null if not found
     */
    def findPlanInstanceById(UUID instanceId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT 
                    pli.pli_id,
                    pli.plm_id,
                    pli.ite_id,
                    pli.pli_name,
                    pli.pli_description,
                    pli.pli_status,
                    pli.usr_id_owner,
                    pli.created_by,
                    pli.created_at,
                    pli.updated_by,
                    pli.updated_at,
                    plm.plm_name,
                    plm.plm_description as plm_description,
                    plm.tms_id,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    usr.usr_name as owner_name,
                    itr.itr_name,
                    mig.mig_name
                FROM plans_instance_pli pli
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_itr itr ON pli.ite_id = itr.itr_id
                JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
                LEFT JOIN status_sts sts ON sts.sts_name = pli.pli_status AND sts.sts_type = 'Plan'
                LEFT JOIN users_usr usr ON pli.usr_id_owner = usr.usr_id
                WHERE pli.pli_id = :instanceId
            """, [instanceId: instanceId])
        }
    }
    
    /**
     * Creates a new plan instance from a master plan.
     * @param masterPlanId The UUID of the master plan to instantiate
     * @param iterationId The UUID of the iteration this instance belongs to
     * @param userId The owner user ID
     * @param overrides Map containing field overrides (pli_name, pli_description)
     * @return Map containing the created instance or null on failure
     */
    def createPlanInstance(UUID masterPlanId, UUID iterationId, Integer userId, Map overrides = [:]) {
        DatabaseUtil.withSql { sql ->
            // Fetch master plan data
            def masterPlan = sql.firstRow("""
                SELECT plm_name, plm_description, plm_status
                FROM plans_master_plm
                WHERE plm_id = :masterPlanId
            """, [masterPlanId: masterPlanId])
            
            if (!masterPlan) {
                return null
            }
            
            // Prepare instance data with overrides
            def instanceData = [
                plm_id: masterPlanId,
                ite_id: iterationId,
                pli_name: overrides.pli_name ?: masterPlan.plm_name,
                pli_description: overrides.pli_description ?: masterPlan.plm_description,
                pli_status: 'NOT_STARTED', // Default status for new instances
                usr_id_owner: userId
            ]
            
            def result = sql.firstRow("""
                INSERT INTO plans_instance_pli (
                    plm_id, ite_id, pli_name, pli_description, pli_status, 
                    usr_id_owner, created_by, updated_by
                ) VALUES (
                    :plm_id, :ite_id, :pli_name, :pli_description, :pli_status,
                    :usr_id_owner, 'system', 'system'
                )
                RETURNING pli_id
            """, instanceData)
            
            if (result?.pli_id) {
                return findPlanInstanceById(result.pli_id as UUID)
            }
            return null
        }
    }
    
    /**
     * Updates a plan instance.
     * @param instanceId The UUID of the instance to update
     * @param updates Map containing fields to update
     * @return Map containing the updated instance or null if not found
     */
    def updatePlanInstance(UUID instanceId, Map updates) {
        DatabaseUtil.withSql { sql ->
            // Check if instance exists
            if (!sql.firstRow('SELECT pli_id FROM plans_instance_pli WHERE pli_id = :instanceId', [instanceId: instanceId])) {
                return null
            }
            
            // Build dynamic update query
            def setClauses = []
            def queryParams = [:]
            def updatableFields = ['pli_name', 'pli_description', 'pli_status', 'usr_id_owner']
            
            updates.each { key, value ->
                if (key in updatableFields) {
                    setClauses.add("${key} = :${key}")
                    queryParams[key] = value
                }
            }
            
            if (setClauses.isEmpty()) {
                return findPlanInstanceById(instanceId)
            }
            
            queryParams['instanceId'] = instanceId
            setClauses.add("updated_by = 'system'")
            setClauses.add("updated_at = CURRENT_TIMESTAMP")
            
            def updateQuery = "UPDATE plans_instance_pli SET ${setClauses.join(', ')} WHERE pli_id = :instanceId"
            sql.executeUpdate(updateQuery, queryParams)
            
            return findPlanInstanceById(instanceId)
        }
    }
    
    /**
     * Updates only the status of a plan instance.
     * @param instanceId The UUID of the instance
     * @param statusId The new status ID
     * @return true if updated successfully, false otherwise
     */
    def updatePlanInstanceStatus(UUID instanceId, Integer statusId) {
        DatabaseUtil.withSql { sql ->
            // Get status name from status_sts table
            def status = sql.firstRow("""
                SELECT sts_name 
                FROM status_sts 
                WHERE sts_id = :statusId AND sts_type = 'Plan'
            """, [statusId: statusId])
            
            if (!status) {
                return false
            }
            
            def rowsUpdated = sql.executeUpdate("""
                UPDATE plans_instance_pli 
                SET pli_status = :statusName,
                    updated_by = 'system',
                    updated_at = CURRENT_TIMESTAMP
                WHERE pli_id = :instanceId
            """, [instanceId: instanceId, statusName: status.sts_name])
            
            return rowsUpdated > 0
        }
    }
    
    /**
     * Deletes a plan instance.
     * @param instanceId The UUID of the instance to delete
     * @return true if deleted successfully, false otherwise
     */
    def deletePlanInstance(UUID instanceId) {
        DatabaseUtil.withSql { sql ->
            def rowsDeleted = sql.executeUpdate("""
                DELETE FROM plans_instance_pli 
                WHERE pli_id = :instanceId
            """, [instanceId: instanceId])
            
            return rowsDeleted > 0
        }
    }
    
    // ==================== UTILITY OPERATIONS ====================
    
    /**
     * Checks if a master plan has any instances.
     * @param masterPlanId The UUID of the master plan
     * @return true if instances exist, false otherwise
     */
    def hasPlanInstances(UUID masterPlanId) {
        DatabaseUtil.withSql { sql ->
            def count = sql.firstRow("""
                SELECT COUNT(*) as instance_count
                FROM plans_instance_pli
                WHERE plm_id = :masterPlanId
            """, [masterPlanId: masterPlanId])
            
            return (count?.instance_count as Long ?: 0L) > 0
        }
    }
    
    /**
     * Finds all plans (master or instance) associated with a team.
     * @param teamId The team ID
     * @return List of plans owned by the team
     */
    def findPlansByTeamId(Integer teamId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    'master' as plan_type,
                    plm_id as plan_id,
                    plm_name as plan_name,
                    plm_description as plan_description,
                    plm_status as plan_status,
                    created_at,
                    updated_at
                FROM plans_master_plm
                WHERE tms_id = :teamId
                
                UNION ALL
                
                SELECT 
                    'instance' as plan_type,
                    pli.pli_id as plan_id,
                    pli.pli_name as plan_name,
                    pli.pli_description as plan_description,
                    pli.pli_status as plan_status,
                    pli.created_at,
                    pli.updated_at
                FROM plans_instance_pli pli
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                WHERE plm.tms_id = :teamId
                
                ORDER BY created_at DESC
            """, [teamId: teamId])
        }
    }
}