package umig.repository

import umig.utils.DatabaseUtil
import java.util.UUID

/**
 * Repository class for managing Sequences data.
 * Handles operations for both master sequences (sequences_master_sqm) and sequence instances (sequences_instance_sqi).
 * Following the canonical-first approach with consolidated operations.
 * Implements ordering logic, dependency management, and hierarchical filtering.
 */
class SequenceRepository {

    // ==================== MASTER SEQUENCE OPERATIONS ====================
    
    /**
     * Retrieves all master sequences with status and plan information.
     * @return List of master sequences with enriched data
     */
    def findAllMasterSequences() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    sqm.sqm_id, 
                    sqm.plm_id, 
                    sqm.sqm_order, 
                    sqm.sqm_name, 
                    sqm.sqm_description, 
                    sqm.predecessor_sqm_id,
                    sqm.created_by,
                    sqm.created_at,
                    sqm.updated_by,
                    sqm.updated_at,
                    plm.plm_name,
                    plm.plm_description as plan_description,
                    plm.tms_id,
                    tms.tms_name,
                    pred.sqm_name as predecessor_name
                FROM sequences_master_sqm sqm
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN sequences_master_sqm pred ON sqm.predecessor_sqm_id = pred.sqm_id
                ORDER BY plm.plm_name, sqm.sqm_order
            """)
        }
    }
    
    /**
     * Finds master sequences filtered by plan ID.
     * @param planId The UUID of the master plan
     * @return List of sequences belonging to the plan
     */
    def findMasterSequencesByPlanId(UUID planId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    sqm.sqm_id, 
                    sqm.plm_id, 
                    sqm.sqm_order, 
                    sqm.sqm_name, 
                    sqm.sqm_description, 
                    sqm.predecessor_sqm_id,
                    sqm.created_by,
                    sqm.created_at,
                    sqm.updated_by,
                    sqm.updated_at,
                    plm.plm_name,
                    plm.plm_description as plan_description,
                    pred.sqm_name as predecessor_name
                FROM sequences_master_sqm sqm
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN sequences_master_sqm pred ON sqm.predecessor_sqm_id = pred.sqm_id
                WHERE sqm.plm_id = :planId
                ORDER BY sqm.sqm_order
            """, [planId: planId])
        }
    }
    
    /**
     * Finds a specific master sequence by ID.
     * @param sequenceId The UUID of the master sequence
     * @return Map containing sequence details or null if not found
     */
    def findMasterSequenceById(UUID sequenceId) {
        DatabaseUtil.withSql { sql ->
            def row = sql.firstRow("""
                SELECT 
                    sqm.sqm_id, 
                    sqm.plm_id, 
                    sqm.sqm_order, 
                    sqm.sqm_name, 
                    sqm.sqm_description, 
                    sqm.predecessor_sqm_id,
                    sqm.created_by,
                    sqm.created_at,
                    sqm.updated_by,
                    sqm.updated_at,
                    plm.plm_name,
                    plm.plm_description as plan_description,
                    plm.tms_id,
                    tms.tms_name,
                    pred.sqm_name as predecessor_name,
                    COALESCE(phase_counts.phase_count, 0) as phase_count,
                    COALESCE(instance_counts.instance_count, 0) as instance_count
                FROM sequences_master_sqm sqm
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN sequences_master_sqm pred ON sqm.predecessor_sqm_id = pred.sqm_id
                LEFT JOIN (
                    SELECT sqm_id, COUNT(*) as phase_count
                    FROM phases_master_phm
                    GROUP BY sqm_id
                ) phase_counts ON sqm.sqm_id = phase_counts.sqm_id
                LEFT JOIN (
                    SELECT sqm_id, COUNT(*) as instance_count
                    FROM sequences_instance_sqi
                    GROUP BY sqm_id
                ) instance_counts ON sqm.sqm_id = instance_counts.sqm_id
                WHERE sqm.sqm_id = :sequenceId
            """, [sequenceId: sequenceId])
            
            
            return row
        }
    }
    
    /**
     * Finds master sequences with advanced filtering, pagination, and computed fields for Admin GUI.
     * Implements the proven pattern from migrations entity with sequence-specific relationships.
     * @param filters Map containing optional filters (status, ownerId, search, startDateFrom, startDateTo)
     * @param pageNumber Page number (1-based, default: 1)
     * @param pageSize Items per page (1-100, default: 50)
     * @param sortField Field to sort by (default: sqm_name)
     * @param sortDirection Sort direction (asc/desc, default: asc)
     * @return Map containing data, pagination info, and applied filters
     */
    def findMasterSequencesWithFilters(Map filters, int pageNumber = 1, int pageSize = 50, String sortField = null, String sortDirection = 'asc') {
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
            
            // Plan ID filtering for dynamic dropdown functionality
            if (filters.planId) {
                whereConditions << "sqm.plm_id = ?"
                params << UUID.fromString(filters.planId as String)
            }
            
            // Owner ID filtering (team-based ownership through plan)
            if (filters.ownerId) {
                whereConditions << "plm.tms_id = ?"
                params << Integer.parseInt(filters.ownerId as String)
            }
            
            // Search functionality across name and description
            if (filters.search) {
                whereConditions << "(sqm.sqm_name ILIKE ? OR sqm.sqm_description ILIKE ?)"
                params << "%${filters.search}%".toString()
                params << "%${filters.search}%".toString()
            }
            
            // Date range filtering on creation date
            if (filters.startDateFrom && filters.startDateTo) {
                whereConditions << "sqm.created_at BETWEEN ? AND ?"
                params << filters.startDateFrom
                params << filters.startDateTo
            }
            
            def whereClause = whereConditions ? "WHERE " + whereConditions.join(" AND ") : ""
            
            // Count query
            def countQuery = """
                SELECT COUNT(DISTINCT sqm.sqm_id) as total
                FROM sequences_master_sqm sqm
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                ${whereClause}
            """
            def totalCount = sql.firstRow(countQuery, params)?.total ?: 0
            
            // Validate sort field
            def allowedSortFields = ['sqm_id', 'sqm_name', 'plm_name', 'sqm_order', 'created_at', 'updated_at', 'phase_count', 'instance_count']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'sqm_name'
            }
            sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
            
            // Data query with computed fields
            def offset = (pageNumber - 1) * pageSize
            def dataQuery = """
                SELECT DISTINCT sqm.sqm_id, sqm.plm_id, sqm.sqm_name, sqm.sqm_description, 
                       sqm.sqm_order, sqm.predecessor_sqm_id, sqm.created_by, sqm.created_at, 
                       sqm.updated_by, sqm.updated_at,
                       plm.plm_name, plm.tms_id, tms.tms_name,
                       COALESCE(phase_counts.phase_count, 0) as phase_count,
                       COALESCE(instance_counts.instance_count, 0) as instance_count
                FROM sequences_master_sqm sqm
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN (
                    SELECT sqm_id, COUNT(*) as phase_count
                    FROM phases_master_phm
                    GROUP BY sqm_id
                ) phase_counts ON sqm.sqm_id = phase_counts.sqm_id
                LEFT JOIN (
                    SELECT sqm_id, COUNT(*) as instance_count
                    FROM sequences_instance_sqi
                    GROUP BY sqm_id
                ) instance_counts ON sqm.sqm_id = instance_counts.sqm_id
                ${whereClause}
                ORDER BY ${
                    if (['phase_count', 'instance_count'].contains(sortField)) {
                        sortField
                    } else if (sortField == 'plm_name') {
                        'plm.' + sortField
                    } else {
                        'sqm.' + sortField
                    }
                } ${sortDirection}
                LIMIT ${pageSize} OFFSET ${offset}
            """
            
            def sequences = sql.rows(dataQuery, params)
            
            return [
                data: sequences,
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
     * Creates a new master sequence.
     * @param sequenceData Map containing sequence data (plm_id, sqm_name, sqm_description, sqm_order, predecessor_sqm_id)
     * @return Map containing the created sequence or null on failure
     */
    def createMasterSequence(Map sequenceData) {
        DatabaseUtil.withSql { sql ->
            // Validate plan exists
            def planExists = sql.firstRow(
                'SELECT plm_id FROM plans_master_plm WHERE plm_id = :planId', 
                [planId: sequenceData.plm_id]
            )
            if (!planExists) {
                return null
            }
            
            // Check for circular dependency if predecessor is specified
            if (sequenceData.predecessor_sqm_id) {
                UUID planId = sequenceData.plm_id as UUID
                UUID predecessorId = sequenceData.predecessor_sqm_id as UUID
                if (hasCircularDependency(sql, planId, predecessorId, null)) {
                    throw new IllegalArgumentException("Circular dependency detected")
                }
            }
            
            // Auto-assign order if not provided
            if (!sequenceData.sqm_order) {
                def maxOrder = sql.firstRow("""
                    SELECT COALESCE(MAX(sqm_order), 0) + 1 as next_order
                    FROM sequences_master_sqm 
                    WHERE plm_id = :planId
                """, [planId: sequenceData.plm_id])
                sequenceData.sqm_order = maxOrder.next_order
            }
            
            // Check for order conflicts
            def orderConflict = sql.firstRow("""
                SELECT sqm_id FROM sequences_master_sqm 
                WHERE plm_id = :planId AND sqm_order = :order
            """, [planId: sequenceData.plm_id, order: sequenceData.sqm_order])
            
            if (orderConflict) {
                // Shift existing sequences to make room
                sql.executeUpdate("""
                    UPDATE sequences_master_sqm 
                    SET sqm_order = sqm_order + 1,
                        updated_by = 'system',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE plm_id = :planId AND sqm_order >= :order
                """, [planId: sequenceData.plm_id, order: sequenceData.sqm_order])
            }
            
            def result = sql.firstRow("""
                INSERT INTO sequences_master_sqm (
                    plm_id, sqm_order, sqm_name, sqm_description, predecessor_sqm_id,
                    created_by, updated_by
                ) VALUES (
                    :plm_id, :sqm_order, :sqm_name, :sqm_description, :predecessor_sqm_id,
                    'system', 'system'
                )
                RETURNING sqm_id
            """, sequenceData)
            
            if (result?.sqm_id) {
                return findMasterSequenceById(result.sqm_id as UUID)
            }
            return null
        }
    }
    
    /**
     * Updates an existing master sequence.
     * @param sequenceId The UUID of the sequence to update
     * @param sequenceData Map containing fields to update
     * @return Map containing the updated sequence or null if not found
     */
    def updateMasterSequence(UUID sequenceId, Map sequenceData) {
        DatabaseUtil.withSql { sql ->
            // Check if sequence exists and get current data
            def currentSequence = sql.firstRow(
                'SELECT plm_id, predecessor_sqm_id FROM sequences_master_sqm WHERE sqm_id = :sequenceId', 
                [sequenceId: sequenceId]
            )
            if (!currentSequence) {
                return null
            }
            
            // Check for circular dependency if predecessor is being updated
            if (sequenceData.predecessor_sqm_id && 
                sequenceData.predecessor_sqm_id != currentSequence.predecessor_sqm_id) {
                UUID planId = currentSequence.plm_id as UUID
                UUID predecessorId = sequenceData.predecessor_sqm_id as UUID
                if (hasCircularDependency(sql, planId, predecessorId, sequenceId)) {
                    throw new IllegalArgumentException("Circular dependency detected")
                }
            }
            
            // Build dynamic update query
            def setClauses = []
            def queryParams = [:]
            def updatableFields = ['sqm_name', 'sqm_description', 'sqm_order', 'predecessor_sqm_id']
            
            sequenceData.each { key, value ->
                if (key in updatableFields) {
                    setClauses.add("${key} = :${key}")
                    queryParams[key] = value
                }
            }
            
            if (setClauses.isEmpty()) {
                return findMasterSequenceById(sequenceId)
            }
            
            queryParams['sequenceId'] = sequenceId
            setClauses.add("updated_by = 'system'")
            setClauses.add("updated_at = CURRENT_TIMESTAMP")
            
            def updateQuery = "UPDATE sequences_master_sqm SET ${setClauses.join(', ')} WHERE sqm_id = :sequenceId"
            sql.executeUpdate(updateQuery, queryParams)
            
            return findMasterSequenceById(sequenceId)
        }
    }
    
    /**
     * Updates the order of a master sequence with dependency validation.
     * @param sequenceId The UUID of the sequence
     * @param newOrder The new order number
     * @param predecessorId Optional predecessor UUID for dependency
     * @return true if updated successfully, false otherwise
     */
    def reorderMasterSequence(UUID sequenceId, Integer newOrder, UUID predecessorId = null) {
        DatabaseUtil.withSql { sql ->
            sql.withTransaction {
                // Get current sequence data
                def currentSequence = sql.firstRow("""
                    SELECT plm_id, sqm_order 
                    FROM sequences_master_sqm 
                    WHERE sqm_id = :sequenceId
                """, [sequenceId: sequenceId])
                
                if (!currentSequence) {
                    return false
                }
                
                UUID planId = currentSequence.plm_id as UUID
                Integer currentOrder = currentSequence.sqm_order as Integer
                
                // Check for circular dependency if predecessor is specified
                if (predecessorId) {
                    if (hasCircularDependency(sql, planId, predecessorId, sequenceId)) {
                        throw new IllegalArgumentException("Circular dependency detected")
                    }
                }
                
                // Normalize order numbers to create gaps if needed
                normalizeSequenceOrdering(sql, planId)
                
                // Update sequence positions
                if (newOrder.compareTo(currentOrder) > 0) {
                    // Moving down - shift sequences up
                    sql.executeUpdate("""
                        UPDATE sequences_master_sqm 
                        SET sqm_order = sqm_order - 1,
                            updated_by = 'system',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE plm_id = :planId 
                            AND sqm_order > :currentOrder 
                            AND sqm_order <= :newOrder
                    """, [planId: planId, currentOrder: currentOrder, newOrder: newOrder])
                } else if (newOrder < currentOrder) {
                    // Moving up - shift sequences down
                    sql.executeUpdate("""
                        UPDATE sequences_master_sqm 
                        SET sqm_order = sqm_order + 1,
                            updated_by = 'system',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE plm_id = :planId 
                            AND sqm_order >= :newOrder 
                            AND sqm_order < :currentOrder
                    """, [planId: planId, currentOrder: currentOrder, newOrder: newOrder])
                }
                
                // Update the target sequence
                sql.executeUpdate("""
                    UPDATE sequences_master_sqm 
                    SET sqm_order = :newOrder,
                        predecessor_sqm_id = :predecessorId,
                        updated_by = 'system',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE sqm_id = :sequenceId
                """, [sequenceId: sequenceId, newOrder: newOrder, predecessorId: predecessorId])
                
                return true
            }
        }
    }
    
    /**
     * Soft deletes a master sequence by checking dependencies.
     * @param sequenceId The UUID of the sequence to delete
     * @return true if deleted successfully, false otherwise
     */
    def softDeleteMasterSequence(UUID sequenceId) {
        DatabaseUtil.withSql { sql ->
            // Check if sequence has instances
            def hasInstances = sql.firstRow("""
                SELECT COUNT(*) as instance_count
                FROM sequences_instance_sqi
                WHERE sqm_id = :sequenceId
            """, [sequenceId: sequenceId])
            
            if ((hasInstances?.instance_count as Long ?: 0L) > 0) {
                return false // Cannot delete sequence with instances
            }
            
            // Check if sequence is referenced as predecessor
            def hasReferences = sql.firstRow("""
                SELECT COUNT(*) as ref_count
                FROM sequences_master_sqm
                WHERE predecessor_sqm_id = :sequenceId
            """, [sequenceId: sequenceId])
            
            if ((hasReferences?.ref_count as Long ?: 0L) > 0) {
                return false // Cannot delete sequence referenced by others
            }
            
            // Note: Currently sequences_master_sqm doesn't have soft_delete_flag
            // For now, we'll just check if deletion is possible
            return sql.firstRow('SELECT sqm_id FROM sequences_master_sqm WHERE sqm_id = :sequenceId', [sequenceId: sequenceId]) != null
        }
    }
    
    // ==================== INSTANCE SEQUENCE OPERATIONS ====================
    
    /**
     * Finds sequence instances with hierarchical filtering.
     * @param filters Map containing optional filters (migrationId, iterationId, planInstanceId, teamId, statusId)
     * @return List of sequence instances with enriched data
     */
    def findSequenceInstancesByFilters(Map filters) {
        DatabaseUtil.withSql { sql ->
            def query = """
                SELECT 
                    sqi.sqi_id,
                    sqi.pli_id,
                    sqi.sqm_id,
                    sqi.sqi_status,
                    sqi.sqi_start_time,
                    sqi.sqi_end_time,
                    sqi.sqi_name,
                    sqi.sqi_description,
                    sqi.sqi_order,
                    sqi.predecessor_sqi_id,
                    sqi.created_by,
                    sqi.created_at,
                    sqi.updated_by,
                    sqi.updated_at,
                    sqm.sqm_name as master_name,
                    sqm.sqm_description as master_description,
                    sqm.sqm_order as master_order,
                    pli.pli_name,
                    plm.plm_name,
                    plm.tms_id,
                    tms.tms_name,
                    itr.ite_name,
                    mig.mig_name,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    sts.sts_type,
                    pred.sqi_name as predecessor_name
                FROM sequences_instance_sqi sqi
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite itr ON pli.ite_id = itr.ite_id
                JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN status_sts sts ON sqi.sqi_status = sts.sts_id
                LEFT JOIN sequences_instance_sqi pred ON sqi.predecessor_sqi_id = pred.sqi_id
                WHERE 1=1
            """
            
            def params = [:]
            
            // Add filters with type safety (ADR-031)
            if (filters.migrationId) {
                query += ' AND mig.mig_id = :migrationId'
                params.migrationId = UUID.fromString(filters.migrationId as String)
            }
            
            if (filters.iterationId) {
                query += ' AND pli.ite_id = :iterationId'
                params.iterationId = UUID.fromString(filters.iterationId as String)
            }
            
            if (filters.planInstanceId) {
                query += ' AND sqi.pli_id = :planInstanceId'
                params.planInstanceId = UUID.fromString(filters.planInstanceId as String)
            }
            
            if (filters.teamId) {
                query += ' AND plm.tms_id = :teamId'
                params.teamId = Integer.parseInt(filters.teamId as String)
            }
            
            if (filters.statusId) {
                query += ' AND sts.sts_id = :statusId'
                params.statusId = Integer.parseInt(filters.statusId as String)
            }
            
            query += ' ORDER BY sqi.sqi_order, sqi.created_at'
            
            def results = sql.rows(query, params)
            return results.collect { row ->
                enrichSequenceInstanceWithStatusMetadata(row)
            }
        }
    }
    
    /**
     * Finds a specific sequence instance by ID with full details.
     * @param instanceId The UUID of the sequence instance
     * @return Map containing instance details or null if not found
     */
    def findSequenceInstanceById(UUID instanceId) {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                SELECT 
                    sqi.sqi_id,
                    sqi.pli_id,
                    sqi.sqm_id,
                    sqi.sqi_status,
                    sqi.sqi_start_time,
                    sqi.sqi_end_time,
                    sqi.sqi_name,
                    sqi.sqi_description,
                    sqi.sqi_order,
                    sqi.predecessor_sqi_id,
                    sqi.created_by,
                    sqi.created_at,
                    sqi.updated_by,
                    sqi.updated_at,
                    sqm.sqm_name as master_name,
                    sqm.sqm_description as master_description,
                    sqm.sqm_order as master_order,
                    pli.pli_name,
                    plm.plm_name,
                    plm.tms_id,
                    tms.tms_name,
                    itr.ite_name,
                    mig.mig_name,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    sts.sts_type,
                    pred.sqi_name as predecessor_name
                FROM sequences_instance_sqi sqi
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite itr ON pli.ite_id = itr.ite_id
                JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN status_sts sts ON sqi.sqi_status = sts.sts_id
                LEFT JOIN sequences_instance_sqi pred ON sqi.predecessor_sqi_id = pred.sqi_id
                WHERE sqi.sqi_id = :instanceId
            """, [instanceId: instanceId])
            
            return result ? enrichSequenceInstanceWithStatusMetadata(result) : null
        }
    }
    
    /**
     * Creates sequence instances from all master sequences in a plan.
     * Implements full attribute instantiation (ADR-029).
     * @param planInstanceId The UUID of the plan instance
     * @param userId The ID of the user creating instances
     * @return List of created sequence instances
     */
    def createSequenceInstancesFromMaster(UUID planInstanceId, Integer userId) {
        DatabaseUtil.withSql { sql ->
            sql.withTransaction {
                // Verify plan instance exists and get master plan ID
                def planInstance = sql.firstRow("""
                    SELECT plm_id FROM plans_instance_pli 
                    WHERE pli_id = :planInstanceId
                """, [planInstanceId: planInstanceId])
                
                if (!planInstance) {
                    return []
                }
                
                // Get all master sequences for the plan
                def masterSequences = sql.rows("""
                    SELECT sqm_id, sqm_name, sqm_description, sqm_order, predecessor_sqm_id
                    FROM sequences_master_sqm 
                    WHERE plm_id = :masterPlanId
                    ORDER BY sqm_order
                """, [masterPlanId: planInstance.plm_id])
                
                def createdInstances = []
                def masterToInstanceMap = [:]
                
                // First pass: Create all instances without predecessor references
                masterSequences.each { masterSeq ->
                    def instanceData = [
                        pli_id: planInstanceId,
                        sqm_id: masterSeq.sqm_id,
                        sqi_status: getDefaultSequenceInstanceStatusId(sql),
                        sqi_name: masterSeq.sqm_name,
                        sqi_description: masterSeq.sqm_description,
                        sqi_order: masterSeq.sqm_order,
                        predecessor_sqi_id: null // Will be set in second pass
                    ]
                    
                    def result = sql.firstRow("""
                        INSERT INTO sequences_instance_sqi (
                            pli_id, sqm_id, sqi_status, sqi_name, sqi_description, 
                            sqi_order, predecessor_sqi_id, created_by, updated_by
                        ) VALUES (
                            :pli_id, :sqm_id, :sqi_status, :sqi_name, :sqi_description,
                            :sqi_order, :predecessor_sqi_id, 'system', 'system'
                        )
                        RETURNING sqi_id
                    """, instanceData)
                    
                    if (result?.sqi_id) {
                        masterToInstanceMap[masterSeq.sqm_id] = result.sqi_id
                        createdInstances.add(result.sqi_id as UUID)
                    }
                }
                
                // Second pass: Update predecessor references
                masterSequences.each { masterSeq ->
                    if (masterSeq.predecessor_sqm_id && masterToInstanceMap[masterSeq.predecessor_sqm_id]) {
                        def instanceId = masterToInstanceMap[masterSeq.sqm_id]
                        def predecessorInstanceId = masterToInstanceMap[masterSeq.predecessor_sqm_id]
                        
                        sql.executeUpdate("""
                            UPDATE sequences_instance_sqi 
                            SET predecessor_sqi_id = :predecessorInstanceId,
                                updated_by = 'system',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE sqi_id = :instanceId
                        """, [instanceId: instanceId, predecessorInstanceId: predecessorInstanceId])
                    }
                }
                
                // Return created instances with full details
                return createdInstances.collect { instanceId ->
                    findSequenceInstanceById(instanceId as UUID)
                }
            }
        }
    }
    
    /**
     * Updates a sequence instance.
     * @param instanceId The UUID of the instance to update
     * @param updates Map containing fields to update
     * @return Map containing the updated instance or null if not found
     */
    def updateSequenceInstance(UUID instanceId, Map updates) {
        DatabaseUtil.withSql { sql ->
            // Check if instance exists
            if (!sql.firstRow('SELECT sqi_id FROM sequences_instance_sqi WHERE sqi_id = :instanceId', [instanceId: instanceId])) {
                return null
            }
            
            // Build dynamic update query
            def setClauses = []
            def queryParams = [:]
            def updatableFields = ['sqi_name', 'sqi_description', 'sqi_status', 'sqi_order', 'predecessor_sqi_id', 'sqi_start_time', 'sqi_end_time']
            
            updates.each { key, value ->
                if (key in updatableFields) {
                    setClauses.add("${key} = :${key}")
                    queryParams[key] = value
                }
            }
            
            if (setClauses.isEmpty()) {
                return findSequenceInstanceById(instanceId)
            }
            
            queryParams['instanceId'] = instanceId
            setClauses.add("updated_by = 'system'")
            setClauses.add("updated_at = CURRENT_TIMESTAMP")
            
            def updateQuery = "UPDATE sequences_instance_sqi SET ${setClauses.join(', ')} WHERE sqi_id = :instanceId"
            sql.executeUpdate(updateQuery, queryParams)
            
            return findSequenceInstanceById(instanceId)
        }
    }
    
    /**
     * Updates only the status of a sequence instance.
     * @param instanceId The UUID of the instance
     * @param statusId The new status ID (INTEGER)
     * @param userId The user making the update
     * @return true if updated successfully, false otherwise
     */
    def updateSequenceInstanceStatus(UUID instanceId, Integer statusId, Integer userId) {
        DatabaseUtil.withSql { sql ->
            // Verify status exists and is Sequence type
            def status = sql.firstRow("""
                SELECT sts_id, sts_name 
                FROM status_sts 
                WHERE sts_id = :statusId AND sts_type = 'Sequence'
            """, [statusId: statusId])
            
            if (!status) {
                return false
            }
            
            def statusName = status.sts_name
            def rowsUpdated = sql.executeUpdate("""
                UPDATE sequences_instance_sqi 
                SET sqi_status = :statusId,
                    updated_by = 'system',
                    updated_at = CURRENT_TIMESTAMP,
                    sqi_start_time = CASE 
                        WHEN :statusName = 'IN_PROGRESS' AND sqi_start_time IS NULL 
                        THEN CURRENT_TIMESTAMP 
                        ELSE sqi_start_time 
                    END,
                    sqi_end_time = CASE 
                        WHEN :statusName = 'COMPLETED' 
                        THEN CURRENT_TIMESTAMP 
                        ELSE NULL 
                    END
                WHERE sqi_id = :instanceId
            """, [instanceId: instanceId, statusId: statusId, statusName: statusName])
            
            return rowsUpdated > 0
        }
    }
    
    /**
     * Deletes a sequence instance.
     * @param instanceId The UUID of the instance to delete
     * @return true if deleted successfully, false otherwise
     */
    def deleteSequenceInstance(UUID instanceId) {
        DatabaseUtil.withSql { sql ->
            def rowsDeleted = sql.executeUpdate("""
                DELETE FROM sequences_instance_sqi 
                WHERE sqi_id = :instanceId
            """, [instanceId: instanceId])
            
            return rowsDeleted > 0
        }
    }
    
    // ==================== ORDERING & DEPENDENCY OPERATIONS ====================
    
    /**
     * Validates sequence ordering within a plan for consistency.
     * @param planId The UUID of the plan (master or instance)
     * @param isInstance Whether this is for instance sequences (true) or master (false)
     * @return Map containing validation results and issues
     */
    def validateSequenceOrdering(UUID planId, boolean isInstance = false) {
        DatabaseUtil.withSql { sql ->
            def issues = []
            def tableName = isInstance ? 'sequences_instance_sqi' : 'sequences_master_sqm'
            def planColumn = isInstance ? 'pli_id' : 'plm_id'
            def orderColumn = isInstance ? 'sqi_order' : 'sqm_order'
            def predecessorColumn = isInstance ? 'predecessor_sqi_id' : 'predecessor_sqm_id'
            def idColumn = isInstance ? 'sqi_id' : 'sqm_id'
            def nameColumn = isInstance ? 'sqi_name' : 'sqm_name'
            
            // Check for duplicate order numbers
            def duplicateOrders = sql.rows("""
                SELECT ${orderColumn}, COUNT(*) as count_duplicates
                FROM ${tableName}
                WHERE ${planColumn} = :planId
                GROUP BY ${orderColumn}
                HAVING COUNT(*) > 1
            """, [planId: planId])
            
            duplicateOrders.each { duplicate ->
                issues.add([
                    type: 'DUPLICATE_ORDER',
                    order: duplicate[orderColumn],
                    count: duplicate.count_duplicates
                ])
            }
            
            // Check for gaps in ordering
            def sequences = sql.rows("""
                SELECT ${idColumn}, ${nameColumn}, ${orderColumn}
                FROM ${tableName}
                WHERE ${planColumn} = :planId
                ORDER BY ${orderColumn}
            """, [planId: planId])
            
            def expectedOrder = 1
            sequences.each { seq ->
                if (seq[orderColumn] != expectedOrder) {
                    issues.add([
                        type: 'ORDER_GAP',
                        expected: expectedOrder,
                        actual: seq[orderColumn],
                        sequence_name: seq[nameColumn]
                    ])
                }
                expectedOrder = (seq[orderColumn] as Integer) + 1
            }
            
            // Check for circular dependencies
            def circularDeps = findCircularDependencies(sql, planId, isInstance)
            circularDeps.each { cycle ->
                issues.add([
                    type: 'CIRCULAR_DEPENDENCY',
                    cycle: cycle
                ])
            }
            
            return [
                valid: issues.isEmpty(),
                issues: issues,
                total_sequences: sequences.size()
            ]
        }
    }
    
    /**
     * Normalizes sequence ordering to eliminate gaps and ensure consecutive numbering.
     * @param sql Database connection
     * @param planId The UUID of the plan
     * @param isInstance Whether this is for instance sequences
     */
    def normalizeSequenceOrdering(groovy.sql.Sql sql, UUID planId, boolean isInstance = false) {
        def tableName = isInstance ? 'sequences_instance_sqi' : 'sequences_master_sqm'
        def planColumn = isInstance ? 'pli_id' : 'plm_id'
        def orderColumn = isInstance ? 'sqi_order' : 'sqm_order'
        def idColumn = isInstance ? 'sqi_id' : 'sqm_id'
        
        // Get sequences in current order
        def sequences = sql.rows("""
            SELECT ${idColumn}
            FROM ${tableName}
            WHERE ${planColumn} = :planId
            ORDER BY ${orderColumn}, created_at
        """, [planId: planId])
        
        // Reassign consecutive order numbers
        sequences.eachWithIndex { seq, index ->
            Integer newOrder = index + 1
            sql.executeUpdate("""
                UPDATE ${tableName}
                SET ${orderColumn} = :newOrder,
                    updated_by = 'system',
                    updated_at = CURRENT_TIMESTAMP
                WHERE ${idColumn} = :sequenceId
            """, [newOrder: newOrder, sequenceId: seq[idColumn]])
        }
    }
    
    /**
     * Checks for circular dependencies in sequence predecessors.
     * @param sql Database connection
     * @param planId The UUID of the plan
     * @param candidatePredecessorId The UUID of the proposed predecessor
     * @param targetSequenceId The UUID of the sequence being updated (null for new sequences)
     * @return true if circular dependency would be created
     */
    def hasCircularDependency(groovy.sql.Sql sql, UUID planId, UUID candidatePredecessorId, UUID targetSequenceId = null) {
        // Use recursive CTE to detect cycles
        def result = sql.firstRow("""
            WITH RECURSIVE dependency_chain AS (
                -- Base case: start from the candidate predecessor
                SELECT sqm_id, predecessor_sqm_id, 1 as depth, ARRAY[sqm_id] as path
                FROM sequences_master_sqm 
                WHERE sqm_id = :candidatePredecessorId AND plm_id = :planId
                
                UNION ALL
                
                -- Recursive case: follow the predecessor chain
                SELECT s.sqm_id, s.predecessor_sqm_id, dc.depth + 1, dc.path || s.sqm_id
                FROM sequences_master_sqm s
                JOIN dependency_chain dc ON s.sqm_id = dc.predecessor_sqm_id
                WHERE s.sqm_id != ALL(dc.path) AND dc.depth < 100 -- Prevent infinite loops
            )
            SELECT EXISTS (
                SELECT 1 FROM dependency_chain 
                WHERE :targetSequenceId = ANY(path)
            ) as has_cycle
        """, [
            candidatePredecessorId: candidatePredecessorId,
            planId: planId,
            targetSequenceId: targetSequenceId
        ])
        
        return result?.getAt('has_cycle') ?: false
    }
    
    /**
     * Finds all circular dependencies in a plan's sequences.
     * @param sql Database connection
     * @param planId The UUID of the plan
     * @param isInstance Whether this is for instance sequences
     * @return List of circular dependency chains
     */
    def findCircularDependencies(groovy.sql.Sql sql, UUID planId, boolean isInstance = false) {
        def tableName = isInstance ? 'sequences_instance_sqi' : 'sequences_master_sqm'
        def planColumn = isInstance ? 'pli_id' : 'plm_id'
        def predecessorColumn = isInstance ? 'predecessor_sqi_id' : 'predecessor_sqm_id'
        def idColumn = isInstance ? 'sqi_id' : 'sqm_id'
        def nameColumn = isInstance ? 'sqi_name' : 'sqm_name'
        
        def cycles = sql.rows("""
            WITH RECURSIVE dependency_chain AS (
                SELECT ${idColumn}, ${predecessorColumn}, 1 as depth, 
                       ARRAY[${idColumn}] as path,
                       ARRAY[(SELECT ${nameColumn} FROM ${tableName} WHERE ${idColumn} = t.${idColumn})] as name_path
                FROM ${tableName} t
                WHERE ${planColumn} = :planId AND ${predecessorColumn} IS NOT NULL
                
                UNION ALL
                
                SELECT s.${idColumn}, s.${predecessorColumn}, dc.depth + 1, 
                       dc.path || s.${idColumn},
                       dc.name_path || (SELECT ${nameColumn} FROM ${tableName} WHERE ${idColumn} = s.${idColumn})
                FROM ${tableName} s
                JOIN dependency_chain dc ON s.${idColumn} = dc.${predecessorColumn}
                WHERE s.${idColumn} != ALL(dc.path) AND dc.depth < 100 -- Prevent infinite loops
            )
            SELECT DISTINCT name_path as cycle
            FROM dependency_chain 
            WHERE ${idColumn} = ANY(path[1:array_length(path,1)-1])
        """, [planId: planId])
        
        return cycles.collect { it.getAt('cycle') }
    }
    
    // ==================== UTILITY OPERATIONS ====================
    
    /**
     * Checks if a master sequence has any instances.
     * @param masterSequenceId The UUID of the master sequence
     * @return true if instances exist, false otherwise
     */
    def hasSequenceInstances(UUID masterSequenceId) {
        DatabaseUtil.withSql { sql ->
            def count = sql.firstRow("""
                SELECT COUNT(*) as instance_count
                FROM sequences_instance_sqi
                WHERE sqm_id = :masterSequenceId
            """, [masterSequenceId: masterSequenceId])
            
            return (count?.instance_count as Long ?: 0L) > 0
        }
    }
    
    /**
     * Finds all sequences (master or instance) associated with a team.
     * @param teamId The team ID
     * @return List of sequences owned by the team
     */
    def findSequencesByTeamId(Integer teamId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    'master' as sequence_type,
                    sqm.sqm_id as sequence_id,
                    sqm.sqm_name as sequence_name,
                    sqm.sqm_description as sequence_description,
                    sqm.sqm_order,
                    plm.plm_name as plan_name,
                    sqm.created_at,
                    sqm.updated_at
                FROM sequences_master_sqm sqm
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                WHERE plm.tms_id = :teamId
                
                UNION ALL
                
                SELECT 
                    'instance' as sequence_type,
                    sqi.sqi_id as sequence_id,
                    sqi.sqi_name as sequence_name,
                    sqi.sqi_description as sequence_description,
                    sqi.sqi_order,
                    pli.pli_name as plan_name,
                    sqi.created_at,
                    sqi.updated_at
                FROM sequences_instance_sqi sqi
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                WHERE plm.tms_id = :teamId
                
                ORDER BY created_at DESC
            """, [teamId: teamId])
        }
    }
    
    /**
     * Gets sequence statistics for a plan.
     * @param planId The UUID of the plan (master or instance)
     * @param isInstance Whether this is for instance sequences
     * @return Map containing sequence statistics
     */
    def getSequenceStatistics(UUID planId, boolean isInstance = false) {
        DatabaseUtil.withSql { sql ->
            def tableName = isInstance ? 'sequences_instance_sqi' : 'sequences_master_sqm'
            def planColumn = isInstance ? 'pli_id' : 'plm_id'
            def statusColumn = isInstance ? 'sqi_status' : "'ACTIVE'"
            
            def stats = sql.firstRow("""
                SELECT 
                    COUNT(*) as total_sequences,
                    COUNT(CASE WHEN ${statusColumn} = 'PLANNING' THEN 1 END) as planning,
                    COUNT(CASE WHEN ${statusColumn} = 'IN_PROGRESS' THEN 1 END) as in_progress,
                    COUNT(CASE WHEN ${statusColumn} = 'COMPLETED' THEN 1 END) as completed,
                    MIN(created_at) as first_created,
                    MAX(updated_at) as last_updated
                FROM ${tableName}
                WHERE ${planColumn} = :planId
            """, [planId: planId])
            
            def completionRate = 0.0
            if ((stats.total_sequences as Integer) > 0) {
                completionRate = ((stats.completed as Double) / (stats.total_sequences as Double)) * 100.0
            }
            
            return [
                total_sequences: stats.total_sequences,
                planning: stats.planning,
                in_progress: stats.in_progress,
                completed: stats.completed,
                completion_rate: completionRate,
                first_created: stats.first_created,
                last_updated: stats.last_updated
            ]
        }
    }
    
    // ==================== STATUS METADATA ENRICHMENT ====================
    
    /**
     * Enriches sequence instance data with status metadata while maintaining backward compatibility.
     * @param row Database row containing sequence instance and status data
     * @return Enhanced sequence instance map with statusMetadata
     */
    private Map enrichSequenceInstanceWithStatusMetadata(Map row) {
        return [
            sqi_id: row.sqi_id,
            pli_id: row.pli_id,
            sqm_id: row.sqm_id,
            sqi_status: row.sts_name ?: 'UNKNOWN', // Backward compatibility - return status name as string
            sqi_start_time: row.sqi_start_time,
            sqi_end_time: row.sqi_end_time,
            sqi_name: row.sqi_name,
            sqi_description: row.sqi_description,
            sqi_order: row.sqi_order,
            predecessor_sqi_id: row.predecessor_sqi_id,
            created_by: row.created_by ?: null,
            created_at: row.created_at,
            updated_by: row.updated_by ?: null,
            updated_at: row.updated_at,
            // Master sequence details
            master_name: row.master_name,
            master_description: row.master_description,
            master_order: row.master_order,
            // Plan and hierarchy details
            pli_name: row.pli_name,
            plm_name: row.plm_name,
            tms_id: row.tms_id,
            tms_name: row.tms_name,
            ite_name: row.ite_name ?: null,
            mig_name: row.mig_name ?: null,
            predecessor_name: row.predecessor_name,
            // Enhanced status metadata
            statusMetadata: row.sts_id ? [
                id: row.sts_id,
                name: row.sts_name,
                color: row.sts_color,
                type: row.sts_type
            ] : null
        ]
    }
    
    /**
     * Gets the default status ID for new sequence instances.
     * @param sql Active SQL connection
     * @return Integer status ID for 'PLANNING' Sequence status
     */
    private Integer getDefaultSequenceInstanceStatusId(groovy.sql.Sql sql) {
        Map defaultStatus = sql.firstRow("""
            SELECT sts_id 
            FROM status_sts 
            WHERE sts_name = 'PLANNING' AND sts_type = 'Sequence'
            LIMIT 1
        """) as Map
        
        // Fallback to any Sequence status if PLANNING not found
        if (!defaultStatus) {
            defaultStatus = sql.firstRow("""
                SELECT sts_id 
                FROM status_sts 
                WHERE sts_type = 'Sequence'
                LIMIT 1
            """) as Map
        }
        
        return (defaultStatus?.sts_id as Integer) ?: 1 // Ultimate fallback
    }

}