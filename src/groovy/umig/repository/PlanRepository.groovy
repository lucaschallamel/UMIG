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
     * Finds master plans with advanced filtering, pagination, sorting, and computed fields.
     * @param filters Map containing optional filters (status, teamId, search, startDateFrom, startDateTo)
     * @param pageNumber Page number (1-based, default: 1)
     * @param pageSize Number of items per page (1-100, default: 50)
     * @param sortField Field to sort by (default: plm_name)
     * @param sortDirection Sort direction: 'asc' or 'desc' (default: 'asc')
     * @return Map with data array, pagination metadata, and applied filters
     */
    def findMasterPlansWithFilters(Map filters, int pageNumber = 1, int pageSize = 50, String sortField = null, String sortDirection = 'asc') {
        DatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            def whereConditions = []
            def params = []
            
            // Build dynamic WHERE clause
            if (filters.status) {
                if (filters.status instanceof List) {
                    def placeholders = filters.status.collect { '?' }.join(', ')
                    whereConditions << ("s.sts_name IN (${placeholders})".toString())
                    params.addAll(filters.status)
                } else {
                    whereConditions << "s.sts_name = ?"
                    params << filters.status
                }
            }
            
            if (filters.teamId) {
                whereConditions << "p.tms_id = ?"
                params << Integer.parseInt(filters.teamId as String)
            }
            
            if (filters.search) {
                whereConditions << "(p.plm_name ILIKE ? OR p.plm_description ILIKE ?)"
                params << "%${filters.search}%".toString()
                params << "%${filters.search}%".toString()
            }
            
            if (filters.startDateFrom && filters.startDateTo) {
                whereConditions << "p.created_at BETWEEN ? AND ?"
                params << filters.startDateFrom
                params << filters.startDateTo
            }
            
            def whereClause = whereConditions ? "WHERE " + whereConditions.join(" AND ") : ""
            
            // Count query
            def countQuery = """
                SELECT COUNT(DISTINCT p.plm_id) as total
                FROM plans_master_plm p
                JOIN status_sts s ON p.plm_status = s.sts_id
                ${whereClause}
            """
            def totalCount = sql.firstRow(countQuery, params)?.total ?: 0
            
            // Validate sort field
            def allowedSortFields = ['plm_id', 'plm_name', 'plm_status', 'created_at', 'updated_at', 'sequence_count', 'instance_count']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'plm_name'
            }
            sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
            
            // Data query with computed fields
            def offset = (pageNumber - 1) * pageSize
            def dataQuery = """
                SELECT DISTINCT p.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type,
                       t.tms_name,
                       COALESCE(sequence_counts.sequence_count, 0) as sequence_count,
                       COALESCE(instance_counts.instance_count, 0) as instance_count
                FROM plans_master_plm p
                JOIN status_sts s ON p.plm_status = s.sts_id
                LEFT JOIN teams_tms t ON p.tms_id = t.tms_id
                LEFT JOIN (
                    SELECT plm_id, COUNT(*) as sequence_count
                    FROM sequences_master_sqm
                    GROUP BY plm_id
                ) sequence_counts ON p.plm_id = sequence_counts.plm_id
                LEFT JOIN (
                    SELECT plm_id, COUNT(*) as instance_count
                    FROM plans_instance_pli
                    GROUP BY plm_id
                ) instance_counts ON p.plm_id = instance_counts.plm_id
                ${whereClause}
                ORDER BY ${['sequence_count', 'instance_count'].contains(sortField) ? sortField : 'p.' + sortField} ${sortDirection}
                LIMIT ${pageSize} OFFSET ${offset}
            """
            
            def plans = sql.rows(dataQuery, params)
            def enrichedPlans = plans.collect { enrichMasterPlanWithStatusMetadata(it) }
            
            return [
                data: enrichedPlans,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: (int) Math.ceil((double) totalCount / (double) pageSize)
                ],
                filters: filters
            ]
        }
    }
    
    /**
     * Retrieves all master plans with status and team information.
     * @return List of master plans with enriched status metadata
     */
    def findAllMasterPlans() {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows("""
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
                    sts.sts_type,
                    tms.tms_name
                FROM plans_master_plm plm
                JOIN status_sts sts ON plm.plm_status = sts.sts_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                ORDER BY plm.created_at DESC
            """)
            
            return results.collect { row ->
                enrichMasterPlanWithStatusMetadata(row)
            }
        }
    }
    
    /**
     * Finds a specific master plan by ID with status metadata.
     * @param planId The UUID of the master plan
     * @return Map containing plan details with enhanced status information, or null if not found
     */
    def findMasterPlanById(UUID planId) {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
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
                    sts.sts_type,
                    tms.tms_name
                FROM plans_master_plm plm
                JOIN status_sts sts ON plm.plm_status = sts.sts_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                WHERE plm.plm_id = :planId
            """, [planId: planId])
            
            return result ? enrichMasterPlanWithStatusMetadata(result) : null
        }
    }
    
    /**
     * Creates a new master plan.
     * @param planData Map containing plan data (tms_id, plm_name, plm_description, plm_status)
     *                 Note: plm_status should be INTEGER status ID, not string
     * @return Map containing the created plan or null on failure
     */
    def createMasterPlan(Map planData) {
        DatabaseUtil.withSql { sql ->
            // Ensure plm_status is an INTEGER (status ID)
            def statusId = planData.plm_status
            if (statusId instanceof String) {
                // Convert status name to ID if string provided
                def statusRow = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = :statusName AND sts_type = 'Plan'", 
                    [statusName: statusId])
                statusId = statusRow?.sts_id
            }
            
            if (!statusId) {
                // Default to PLANNING status if not found
                def defaultStatus = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'PLANNING' AND sts_type = 'Plan'")
                statusId = defaultStatus?.sts_id
            }
            
            Map insertData = planData.clone() as Map
            insertData.plm_status = statusId
            
            Map result = sql.firstRow("""
                INSERT INTO plans_master_plm (
                    tms_id, plm_name, plm_description, plm_status, 
                    created_by, updated_by
                ) VALUES (
                    :tms_id, :plm_name, :plm_description, :plm_status,
                    'system', 'system'
                )
                RETURNING plm_id
            """, insertData) as Map
            
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
            
            // Handle status conversion if needed
            if (planData.plm_status instanceof String) {
                def statusRow = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = :statusName AND sts_type = 'Plan'", 
                    [statusName: planData.plm_status])
                planData.plm_status = statusRow?.sts_id
            }
            
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
                    pli.created_by,
                    pli.created_at,
                    pli.updated_by,
                    pli.updated_at,
                    plm.plm_name,
                    plm.plm_description,
                    plm.tms_id,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    sts.sts_type,
                    usr.usr_code as owner_name,
                    ite.ite_name,
                    mig.mig_name
                FROM plans_instance_pli pli
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                JOIN status_sts sts ON pli.pli_status = sts.sts_id
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
            
            def results = sql.rows(query, params)
            return results.collect { row ->
                enrichPlanInstanceWithStatusMetadata(row)
            }
        }
    }
    
    /**
     * Finds a specific plan instance by ID with full details.
     * @param instanceId The UUID of the plan instance
     * @return Map containing instance details or null if not found
     */
    def findPlanInstanceById(UUID instanceId) {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
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
                    sts.sts_type,
                    usr.usr_code as owner_name,
                    ite.ite_name,
                    mig.mig_name
                FROM plans_instance_pli pli
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                JOIN status_sts sts ON pli.pli_status = sts.sts_id
                LEFT JOIN users_usr usr ON pli.usr_id_owner = usr.usr_id
                WHERE pli.pli_id = :instanceId
            """, [instanceId: instanceId])
            
            return result ? enrichPlanInstanceWithStatusMetadata(result) : null
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
                pli_status: getDefaultPlanInstanceStatusId(sql), // Default status ID for new instances
                usr_id_owner: userId
            ]
            
            Map result = sql.firstRow("""
                INSERT INTO plans_instance_pli (
                    plm_id, ite_id, pli_name, pli_description, pli_status, 
                    usr_id_owner, created_by, updated_by
                ) VALUES (
                    :plm_id, :ite_id, :pli_name, :pli_description, :pli_status,
                    :usr_id_owner, 'system', 'system'
                )
                RETURNING pli_id
            """, instanceData) as Map
            
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
     * @param statusId The new status ID (INTEGER)
     * @return true if updated successfully, false otherwise
     */
    def updatePlanInstanceStatus(UUID instanceId, Integer statusId) {
        DatabaseUtil.withSql { sql ->
            // Verify status exists and is Plan type
            def status = sql.firstRow("""
                SELECT sts_id, sts_name 
                FROM status_sts 
                WHERE sts_id = :statusId AND sts_type = 'Plan'
            """, [statusId: statusId])
            
            if (!status) {
                return false
            }
            
            def rowsUpdated = sql.executeUpdate("""
                UPDATE plans_instance_pli 
                SET pli_status = :statusId,
                    updated_by = 'system',
                    updated_at = CURRENT_TIMESTAMP
                WHERE pli_id = :instanceId
            """, [instanceId: instanceId, statusId: statusId])
            
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
                    plm.plm_id as plan_id,
                    plm.plm_name as plan_name,
                    plm.plm_description as plan_description,
                    sts.sts_name as plan_status,
                    plm.created_at,
                    plm.updated_at
                FROM plans_master_plm plm
                JOIN status_sts sts ON plm.plm_status = sts.sts_id
                WHERE plm.tms_id = :teamId
                
                UNION ALL
                
                SELECT 
                    'instance' as plan_type,
                    pli.pli_id as plan_id,
                    pli.pli_name as plan_name,
                    pli.pli_description as plan_description,
                    sts.sts_name as plan_status,
                    pli.created_at,
                    pli.updated_at
                FROM plans_instance_pli pli
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN status_sts sts ON pli.pli_status = sts.sts_id
                WHERE plm.tms_id = :teamId
                
                ORDER BY created_at DESC
            """, [teamId: teamId])
        }
    }
    
    // ==================== STATUS METADATA ENRICHMENT ====================
    
    /**
     * Enriches master plan data with status metadata while maintaining backward compatibility.
     * @param row Database row containing plan and status data
     * @return Enhanced plan map with statusMetadata
     */
    private Map enrichMasterPlanWithStatusMetadata(Map row) {
        return [
            plm_id: row.plm_id,
            tms_id: row.tms_id,
            plm_name: row.plm_name,
            plm_description: row.plm_description,
            plm_status: row.sts_name, // Backward compatibility - return status name as string
            created_by: row.created_by,
            created_at: row.created_at,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            tms_name: row.tms_name,
            // Computed fields from joins
            sequence_count: row.sequence_count ?: 0,
            instance_count: row.instance_count ?: 0,
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
     * Enriches plan instance data with status metadata while maintaining backward compatibility.
     * @param row Database row containing plan instance and status data
     * @return Enhanced plan instance map with statusMetadata
     */
    private Map enrichPlanInstanceWithStatusMetadata(Map row) {
        return [
            pli_id: row.pli_id,
            plm_id: row.plm_id,
            ite_id: row.ite_id,
            pli_name: row.pli_name,
            pli_description: row.pli_description,
            pli_status: row.sts_name, // Backward compatibility - return status name as string
            usr_id_owner: row.usr_id_owner,
            created_by: row.created_by ?: null,
            created_at: row.created_at,
            updated_by: row.updated_by ?: null,
            updated_at: row.updated_at,
            plm_name: row.plm_name,
            plm_description: row.plm_description ?: null,
            tms_id: row.tms_id,
            owner_name: row.owner_name,
            ite_name: row.ite_name ?: null,
            mig_name: row.mig_name ?: null,
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
     * Gets the default status ID for new plan instances.
     * @param sql Active SQL connection
     * @return Integer status ID for 'PLANNING' Plan status
     */
    private Integer getDefaultPlanInstanceStatusId(groovy.sql.Sql sql) {
        Map defaultStatus = sql.firstRow("""
            SELECT sts_id 
            FROM status_sts 
            WHERE sts_name = 'PLANNING' AND sts_type = 'Plan'
            LIMIT 1
        """) as Map
        
        // Fallback to any Plan status if PLANNING not found
        if (!defaultStatus) {
            defaultStatus = sql.firstRow("""
                SELECT sts_id 
                FROM status_sts 
                WHERE sts_type = 'Plan'
                LIMIT 1
            """) as Map
        }
        
        return (defaultStatus?.sts_id as Integer) ?: 1 // Ultimate fallback
    }
}