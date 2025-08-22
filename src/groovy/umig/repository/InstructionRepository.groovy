package umig.repository

import umig.utils.DatabaseUtil
import umig.utils.AuthenticationService
import umig.repository.AuditLogRepository
import java.util.UUID
import java.sql.SQLException
import groovy.sql.Sql
import groovy.sql.GroovyRowResult

/**
 * Repository for INSTRUCTION master and instance data following UMIG patterns.
 * Implements all 19 required methods with proper table/column names and type safety.
 * 
 * Tables:
 * - instructions_master_inm: Master instruction templates
 * - instructions_instance_ini: Instance instruction execution records
 */
class InstructionRepository {

    // ==================== MASTER INSTRUCTION METHODS ====================

    /**
     * Finds all master instructions for a given step master ID, ordered by sequence.
     * @param stmId UUID of the step master
     * @return List of master instructions with team and control details
     */
    def findMasterInstructionsByStepId(UUID stmId) {
        if (!stmId) {
            throw new IllegalArgumentException("Step master ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                return sql.rows('''
                    SELECT 
                        inm.inm_id,
                        inm.stm_id,
                        inm.tms_id,
                        inm.ctm_id,
                        inm.inm_order,
                        inm.inm_body,
                        inm.inm_duration_minutes,
                        tms.tms_name,
                        ctm.ctm_name,
                        inm.created_at,
                        inm.updated_at
                    FROM instructions_master_inm inm
                    LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id
                    LEFT JOIN controls_master_ctm ctm ON inm.ctm_id = ctm.ctm_id
                    WHERE inm.stm_id = :stmId
                    ORDER BY inm.inm_order ASC
                ''', [stmId: stmId])
            } catch (SQLException e) {
                throw new RuntimeException("Failed to find master instructions for step ${stmId}", e)
            }
        }
    }

    /**
     * Finds a specific master instruction by ID.
     * @param inmId UUID of the master instruction
     * @return Master instruction details or null if not found
     */
    def findMasterInstructionById(UUID inmId) {
        if (!inmId) {
            throw new IllegalArgumentException("Master instruction ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                return sql.firstRow('''
                    SELECT 
                        inm.inm_id,
                        inm.stm_id,
                        inm.tms_id,
                        inm.ctm_id,
                        inm.inm_order,
                        inm.inm_body,
                        inm.inm_duration_minutes,
                        tms.tms_name,
                        ctm.ctm_name,
                        inm.created_at,
                        inm.updated_at
                    FROM instructions_master_inm inm
                    LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id
                    LEFT JOIN controls_master_ctm ctm ON inm.ctm_id = ctm.ctm_id
                    WHERE inm.inm_id = :inmId
                ''', [inmId: inmId])
            } catch (SQLException e) {
                throw new RuntimeException("Failed to find master instruction ${inmId}", e)
            }
        }
    }

    /**
     * Finds instruction masters with filters - alias for consistency with Admin GUI patterns.
     * @param filters Map of filter criteria
     * @param pageNumber Page number (1-based)
     * @param pageSize Number of items per page (max 100)
     * @param sortField Field to sort by
     * @param sortDirection Sort direction (asc/desc)
     * @return Map with data, pagination info, and applied filters
     */
    def findInstructionMastersWithFilters(Map filters, int pageNumber = 1, int pageSize = 50, String sortField = null, String sortDirection = 'asc') {
        return findMasterInstructionsWithFilters(filters, pageNumber, pageSize, sortField, sortDirection)
    }

    /**
     * Finds master instructions with filters, pagination, sorting, and computed fields for Admin GUI.
     * @param filters Map of filter criteria
     * @param pageNumber Page number (1-based)
     * @param pageSize Number of items per page (max 100)
     * @param sortField Field to sort by
     * @param sortDirection Sort direction (asc/desc)
     * @return Map with data, pagination info, and applied filters
     */
    def findMasterInstructionsWithFilters(Map filters, int pageNumber = 1, int pageSize = 50, String sortField = null, String sortDirection = 'asc') {
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
            
            // Owner ID filtering
            if (filters.ownerId) {
                whereConditions << "e.usr_id_owner = ?"
                params << Integer.parseInt(filters.ownerId as String)
            }
            
            // Search functionality
            if (filters.search) {
                whereConditions << "(e.inm_name ILIKE ? OR e.inm_description ILIKE ?)"
                params << "%${filters.search}%".toString()
                params << "%${filters.search}%".toString()
            }
            
            // Date range filtering
            if (filters.startDateFrom && filters.startDateTo) {
                whereConditions << "e.inm_start_date BETWEEN ? AND ?"
                params << filters.startDateFrom
                params << filters.startDateTo
            }
            
            def whereClause = whereConditions ? "WHERE " + whereConditions.join(" AND ") : ""
            
            // Count query
            def countQuery = """
                SELECT COUNT(DISTINCT e.inm_id) as total
                FROM instructions_master_inm e
                JOIN status_sts s ON e.inm_status = s.sts_id
                ${whereClause}
            """
            def totalCount = sql.firstRow(countQuery, params)?.total ?: 0
            
            // Validate sort field
            def allowedSortFields = ['inm_id', 'inm_name', 'inm_status', 'created_at', 'updated_at', 'instance_count', 'control_count']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'inm_name'
            }
            sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
            
            // Data query with computed fields
            def offset = (pageNumber - 1) * pageSize
            def dataQuery = """
                SELECT DISTINCT e.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type,
                       COALESCE(instance_counts.instance_count, 0) as instance_count,
                       COALESCE(control_counts.control_count, 0) as control_count
                FROM instructions_master_inm e
                JOIN status_sts s ON e.inm_status = s.sts_id
                LEFT JOIN (
                    SELECT inm_id, COUNT(*) as instance_count
                    FROM instructions_instance_ini
                    GROUP BY inm_id
                ) instance_counts ON e.inm_id = instance_counts.inm_id
                LEFT JOIN (
                    SELECT inm_id, COUNT(DISTINCT cnm_id) as control_count
                    FROM controls_cnm
                    GROUP BY inm_id
                ) control_counts ON e.inm_id = control_counts.inm_id
                ${whereClause}
                ORDER BY ${['instance_count', 'control_count'].contains(sortField) ? sortField : 'e.' + sortField} ${sortDirection}
                LIMIT ${pageSize} OFFSET ${offset}
            """
            
            def entities = sql.rows(dataQuery, params)
            def enrichedEntities = entities.collect { enrichMasterInstructionWithStatusMetadata(it) }
            
            return [
                data: enrichedEntities,
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
     * Enriches instruction data with status metadata while maintaining backward compatibility.
     * @param row Database row containing instruction and status data
     * @return Enhanced instruction map with statusMetadata
     */
    private Map enrichMasterInstructionWithStatusMetadata(Map row) {
        return [
            inm_id: row.inm_id,
            // Core entity fields
            inm_name: row.inm_name,
            inm_description: row.inm_description,
            inm_status: row.sts_name, // Backward compatibility
            // Audit fields
            created_by: row.created_by,
            created_at: row.created_at,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            // Computed fields from joins
            instance_count: row.instance_count ?: 0,
            control_count: row.control_count ?: 0,
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
     * Creates a new master instruction with type safety.
     * @param params Map containing instruction parameters
     * @return Created instruction ID
     */
    def createMasterInstruction(Map params) {
        if (!params.stmId || !params.inmOrder) {
            throw new IllegalArgumentException("Step ID and order are required")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                // Type safety per ADR-031
                def stmId = UUID.fromString(params.stmId as String)
                def tmsId = params.tmsId ? Integer.parseInt(params.tmsId as String) : null
                def ctmId = params.ctmId ? UUID.fromString(params.ctmId as String) : null
                def inmOrder = Integer.parseInt(params.inmOrder as String)
                def inmBody = params.inmBody as String
                def inmDurationMinutes = params.inmDurationMinutes ? Integer.parseInt(params.inmDurationMinutes as String) : null
                
                // Validate duration is not negative
                if (inmDurationMinutes != null && inmDurationMinutes < 0) {
                    throw new IllegalArgumentException("Duration cannot be negative")
                }
                
                // Get system user from AuthenticationService
                def systemUser = AuthenticationService.getSystemUser()
                
                def result = sql.firstRow('''
                    INSERT INTO instructions_master_inm (
                        stm_id, tms_id, ctm_id, inm_order, inm_body, inm_duration_minutes,
                        created_by, created_at, updated_by, updated_at
                    ) VALUES (
                        :stmId, :tmsId, :ctmId, :inmOrder, :inmBody, :inmDurationMinutes,
                        :createdBy, CURRENT_TIMESTAMP, :updatedBy, CURRENT_TIMESTAMP
                    ) RETURNING inm_id
                ''', [
                    stmId: stmId,
                    tmsId: tmsId,
                    ctmId: ctmId,
                    inmOrder: inmOrder,
                    inmBody: inmBody,
                    inmDurationMinutes: inmDurationMinutes,
                    createdBy: systemUser,
                    updatedBy: systemUser
                ])
                
                return result.inm_id
            } catch (SQLException e) {
                if (e.getSQLState() == '23503') {
                    throw new IllegalArgumentException("Referenced step, team, or control does not exist", e)
                } else if (e.getSQLState() == '23505') {
                    throw new IllegalArgumentException("Instruction order already exists for this step", e)
                }
                throw new RuntimeException("Failed to create master instruction", e)
            }
        }
    }

    /**
     * Updates an existing master instruction.
     * @param inmId UUID of the master instruction to update
     * @param params Map containing updated parameters
     * @return Number of affected rows
     */
    def updateMasterInstruction(UUID inmId, Map params) {
        if (!inmId) {
            throw new IllegalArgumentException("Master instruction ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                def updates = []
                def queryParams = [:]
                queryParams.inmId = inmId
                
                if (params.containsKey('tmsId')) {
                    updates << "tms_id = :tmsId"
                    queryParams.tmsId = params.tmsId as Integer
                }
                if (params.containsKey('ctmId')) {
                    updates << "ctm_id = :ctmId"
                    queryParams.ctmId = params.ctmId as UUID
                }
                if (params.containsKey('inmOrder')) {
                    updates << "inm_order = :inmOrder"
                    queryParams.inmOrder = params.inmOrder as Integer
                }
                if (params.containsKey('inmBody')) {
                    updates << "inm_body = :inmBody"
                    queryParams.inmBody = params.inmBody
                }
                if (params.containsKey('inmDurationMinutes')) {
                    def duration = params.inmDurationMinutes as Integer
                    // Validate duration is not negative
                    if (duration != null && duration < 0) {
                        throw new IllegalArgumentException("Duration cannot be negative")
                    }
                    updates << "inm_duration_minutes = :inmDurationMinutes"
                    queryParams.inmDurationMinutes = duration
                }
                
                if (updates.isEmpty()) {
                    return 0
                }
                
                // Get system user from AuthenticationService
                def systemUser = AuthenticationService.getSystemUser()
                queryParams.updatedBy = systemUser
                
                updates << "updated_at = CURRENT_TIMESTAMP"
                updates << "updated_by = :updatedBy"
                
                return sql.executeUpdate("""
                    UPDATE instructions_master_inm 
                    SET ${updates.join(', ')}
                    WHERE inm_id = :inmId
                """, queryParams)
                
            } catch (SQLException e) {
                if (e.getSQLState() == '23503') {
                    throw new IllegalArgumentException("Referenced team or control does not exist", e)
                } else if (e.getSQLState() == '23505') {
                    throw new IllegalArgumentException("Instruction order already exists for this step", e)
                }
                throw new RuntimeException("Failed to update master instruction ${inmId}", e)
            }
        }
    }

    /**
     * Deletes a master instruction and all its instances.
     * @param inmId UUID of the master instruction to delete
     * @return Number of affected rows
     */
    def deleteMasterInstruction(UUID inmId) {
        if (!inmId) {
            throw new IllegalArgumentException("Master instruction ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                sql.withTransaction {
                    // Delete instances first (foreign key constraint)
                    sql.executeUpdate("""
                        DELETE FROM instructions_instance_ini 
                        WHERE inm_id = :inmId
                    """, [inmId: inmId])
                    
                    // Delete master instruction
                    return sql.executeUpdate("""
                        DELETE FROM instructions_master_inm 
                        WHERE inm_id = :inmId
                    """, [inmId: inmId])
                }
            } catch (SQLException e) {
                throw new RuntimeException("Failed to delete master instruction ${inmId}", e)
            }
        }
    }

    /**
     * Reorders master instructions for a step.
     * @param stmId UUID of the step master
     * @param orderData List of maps containing inmId and newOrder
     * @return Number of affected instructions
     */
    def reorderMasterInstructions(UUID stmId, List<Map> orderData) {
        if (!stmId || !orderData) {
            throw new IllegalArgumentException("Step ID and order data are required")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                sql.withTransaction {
                    def affectedRows = 0
                    
                    orderData.each { item ->
                        def inmId = UUID.fromString(item.inmId as String)
                        def newOrder = Integer.parseInt(item.newOrder as String)
                        
                        // Get system user from AuthenticationService
                        def systemUser = AuthenticationService.getSystemUser()
                        
                        affectedRows += sql.executeUpdate("""
                            UPDATE instructions_master_inm 
                            SET inm_order = :newOrder, updated_at = CURRENT_TIMESTAMP, updated_by = :updatedBy
                            WHERE inm_id = :inmId AND stm_id = :stmId
                        """, [inmId: inmId, newOrder: newOrder, stmId: stmId, updatedBy: systemUser])
                    }
                    
                    return affectedRows
                }
            } catch (SQLException e) {
                if (e.getSQLState() == '23505') {
                    throw new IllegalArgumentException("Duplicate order values detected", e)
                }
                throw new RuntimeException("Failed to reorder master instructions for step ${stmId}", e)
            }
        }
    }

    // ==================== INSTANCE INSTRUCTION METHODS ====================

    /**
     * Finds all instruction instances for a given step instance ID.
     * @param stiId UUID of the step instance
     * @return List of instruction instances with master details
     */
    def findInstanceInstructionsByStepInstanceId(UUID stiId) {
        if (!stiId) {
            throw new IllegalArgumentException("Step instance ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                return sql.rows('''
                    SELECT 
                        ini.ini_id,
                        ini.sti_id,
                        ini.inm_id,
                        ini.ini_is_completed,
                        ini.ini_completed_at,
                        ini.usr_id_completed_by,
                        ini.tms_id,
                        ini.cti_id,
                        ini.ini_order,
                        ini.ini_body,
                        ini.ini_duration_minutes,
                        -- Master instruction details
                        inm.inm_order as master_order,
                        inm.inm_body as master_body,
                        inm.inm_duration_minutes as master_duration,
                        -- Team details
                        tms.tms_name,
                        -- User details
                        usr.usr_first_name,
                        usr.usr_last_name,
                        usr.usr_email,
                        ini.created_at,
                        ini.updated_at
                    FROM instructions_instance_ini ini
                    JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                    LEFT JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id
                    LEFT JOIN users_usr usr ON ini.usr_id_completed_by = usr.usr_id
                    WHERE ini.sti_id = :stiId
                    ORDER BY COALESCE(ini.ini_order, inm.inm_order) ASC
                ''', [stiId: stiId])
            } catch (SQLException e) {
                throw new RuntimeException("Failed to find instance instructions for step instance ${stiId}", e)
            }
        }
    }

    /**
     * Finds a specific instruction instance by ID.
     * @param iniId UUID of the instruction instance
     * @return Instruction instance details or null if not found
     */
    def findInstanceInstructionById(UUID iniId) {
        if (!iniId) {
            throw new IllegalArgumentException("Instance instruction ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                return sql.firstRow('''
                    SELECT 
                        ini.ini_id,
                        ini.sti_id,
                        ini.inm_id,
                        ini.ini_is_completed,
                        ini.ini_completed_at,
                        ini.usr_id_completed_by,
                        ini.tms_id,
                        ini.cti_id,
                        ini.ini_order,
                        ini.ini_body,
                        ini.ini_duration_minutes,
                        -- Master instruction details
                        inm.inm_order as master_order,
                        inm.inm_body as master_body,
                        inm.inm_duration_minutes as master_duration,
                        -- Team details
                        tms.tms_name,
                        -- User details
                        usr.usr_first_name,
                        usr.usr_last_name,
                        usr.usr_email,
                        ini.created_at,
                        ini.updated_at
                    FROM instructions_instance_ini ini
                    JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                    LEFT JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id
                    LEFT JOIN users_usr usr ON ini.usr_id_completed_by = usr.usr_id
                    WHERE ini.ini_id = :iniId
                ''', [iniId: iniId])
            } catch (SQLException e) {
                throw new RuntimeException("Failed to find instance instruction ${iniId}", e)
            }
        }
    }

    /**
     * Creates instruction instances from master instructions for a step instance.
     * @param stiId UUID of the step instance
     * @param inmIds List of master instruction IDs to instantiate
     * @return List of created instance IDs
     */
    def createInstanceInstructions(UUID stiId, List<UUID> inmIds) {
        if (!stiId || !inmIds || inmIds.isEmpty()) {
            throw new IllegalArgumentException("Step instance ID and master instruction IDs are required")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                sql.withTransaction {
                    def createdIds = []
                    
                    inmIds.each { inmId ->
                        def result = sql.firstRow('''
                            INSERT INTO instructions_instance_ini (
                                sti_id, inm_id, ini_is_completed, tms_id, ini_order, ini_body, ini_duration_minutes,
                                created_by, created_at, updated_by, updated_at
                            )
                            SELECT 
                                :stiId as sti_id,
                                inm.inm_id,
                                false as ini_is_completed,
                                inm.tms_id,
                                inm.inm_order,
                                inm.inm_body,
                                inm.inm_duration_minutes,
                                :createdBy as created_by,
                                CURRENT_TIMESTAMP as created_at,
                                :updatedBy as updated_by,
                                CURRENT_TIMESTAMP as updated_at
                            FROM instructions_master_inm inm
                            WHERE inm.inm_id = :inmId
                            RETURNING ini_id
                        ''', [stiId: stiId, inmId: inmId, createdBy: AuthenticationService.getSystemUser(), updatedBy: AuthenticationService.getSystemUser()])
                        
                        if (result) {
                            createdIds << result.ini_id
                        }
                    }
                    
                    return createdIds
                }
            } catch (SQLException e) {
                if (e.getSQLState() == '23503') {
                    throw new IllegalArgumentException("Referenced step instance or master instruction does not exist", e)
                } else if (e.getSQLState() == '23505') {
                    throw new IllegalArgumentException("Instruction instance already exists", e)
                }
                throw new RuntimeException("Failed to create instance instructions for step instance ${stiId}", e)
            }
        }
    }

    /**
     * Marks an instruction instance as completed.
     * @param iniId UUID of the instruction instance
     * @param userId ID of the user completing the instruction
     * @return Number of affected rows
     */
    def completeInstruction(UUID iniId, Integer userId) {
        if (!iniId || !userId) {
            throw new IllegalArgumentException("Instruction instance ID and user ID are required")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                // First, get the step instance ID for audit logging
                def stepInfo = sql.firstRow('''
                    SELECT sti_id 
                    FROM instructions_instance_ini 
                    WHERE ini_id = :iniId AND ini_is_completed = false
                ''', [iniId: iniId])
                
                if (!stepInfo) {
                    return 0 // Instruction not found or already completed
                }
                
                def affectedRows = sql.executeUpdate('''
                    UPDATE instructions_instance_ini 
                    SET 
                        ini_is_completed = true,
                        ini_completed_at = CURRENT_TIMESTAMP,
                        usr_id_completed_by = :userId,
                        updated_at = CURRENT_TIMESTAMP,
                        updated_by = :updatedBy
                    WHERE ini_id = :iniId AND ini_is_completed = false
                ''', [iniId: iniId, userId: userId, updatedBy: AuthenticationService.getSystemUser()])
                
                // Log to audit trail if update was successful
                if (affectedRows > 0) {
                    try {
                        def stepInfoRow = stepInfo as groovy.sql.GroovyRowResult
                        println "InstructionRepository: Attempting to log instruction completion audit for iniId=${iniId}, userId=${userId}, stepId=${stepInfoRow.sti_id}"
                        AuditLogRepository.logInstructionCompleted(sql, userId, iniId, stepInfoRow.sti_id as UUID)
                        println "InstructionRepository: Successfully logged instruction completion audit for iniId=${iniId}"
                    } catch (Exception auditError) {
                        // Audit logging failure shouldn't break the main flow
                        println "InstructionRepository: Failed to log instruction completion audit - ${auditError.message}"
                        auditError.printStackTrace()
                    }
                }
                
                return affectedRows
            } catch (SQLException e) {
                if (e.getSQLState() == '23503') {
                    throw new IllegalArgumentException("User does not exist", e)
                }
                throw new RuntimeException("Failed to complete instruction ${iniId}", e)
            }
        }
    }

    /**
     * Marks an instruction instance as not completed (uncomplete).
     * @param iniId UUID of the instruction instance
     * @return Number of affected rows
     */
    def uncompleteInstruction(UUID iniId) {
        if (!iniId) {
            throw new IllegalArgumentException("Instruction instance ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                // First, get the step instance ID and current user for audit logging
                def instructionInfo = sql.firstRow('''
                    SELECT sti_id, usr_id_completed_by 
                    FROM instructions_instance_ini 
                    WHERE ini_id = :iniId AND ini_is_completed = true
                ''', [iniId: iniId])
                
                if (!instructionInfo) {
                    return 0 // Instruction not found or not completed
                }
                
                def affectedRows = sql.executeUpdate('''
                    UPDATE instructions_instance_ini 
                    SET 
                        ini_is_completed = false,
                        ini_completed_at = NULL,
                        usr_id_completed_by = NULL,
                        updated_at = CURRENT_TIMESTAMP,
                        updated_by = :updatedBy
                    WHERE ini_id = :iniId AND ini_is_completed = true
                ''', [iniId: iniId, updatedBy: AuthenticationService.getSystemUser()])
                
                // Log to audit trail if update was successful
                if (affectedRows > 0) {
                    try {
                        // Use the original completing user ID or null if system uncompleted
                        def instructionInfoRow = instructionInfo as groovy.sql.GroovyRowResult
                        def auditUserId = instructionInfoRow.usr_id_completed_by as Integer
                        println "InstructionRepository: Attempting to log instruction uncompletion audit for iniId=${iniId}, auditUserId=${auditUserId}, stepId=${instructionInfoRow.sti_id}"
                        AuditLogRepository.logInstructionUncompleted(sql, auditUserId, iniId, instructionInfoRow.sti_id as UUID)
                        println "InstructionRepository: Successfully logged instruction uncompletion audit for iniId=${iniId}"
                    } catch (Exception auditError) {
                        // Audit logging failure shouldn't break the main flow
                        println "InstructionRepository: Failed to log instruction uncompletion audit - ${auditError.message}"
                        auditError.printStackTrace()
                    }
                }
                
                return affectedRows
            } catch (SQLException e) {
                throw new RuntimeException("Failed to uncomplete instruction ${iniId}", e)
            }
        }
    }

    /**
     * Marks multiple instruction instances as completed in a single transaction.
     * @param iniIds List of instruction instance IDs
     * @param userId ID of the user completing the instructions
     * @return Number of affected rows
     */
    def bulkCompleteInstructions(List<UUID> iniIds, Integer userId) {
        if (!iniIds || iniIds.isEmpty() || !userId) {
            throw new IllegalArgumentException("Instruction instance IDs and user ID are required")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                sql.withTransaction {
                    def affectedRows = 0
                    def auditEntries = []
                    
                    // Get system user from AuthenticationService
                    def systemUser = AuthenticationService.getSystemUser()
                    
                    // First, get step instance IDs for instructions that will be completed for audit logging
                    def placeholdersForAudit = iniIds.collect { '?' }.join(',')
                    def stepInfosQuery = """
                        SELECT ini_id, sti_id 
                        FROM instructions_instance_ini 
                        WHERE ini_id IN (${placeholdersForAudit}) AND ini_is_completed = false
                    """.toString()
                    def stepInfos = sql.rows(stepInfosQuery, iniIds as List<Object>)
                    
                    // Process in batches of 100 to avoid parameter limits
                    iniIds.collate(100).each { batch ->
                        def placeholders = batch.collect { '?' }.join(',')
                        def allParams = []
                        allParams.add(userId)
                        allParams.add(systemUser)
                        allParams.addAll(batch)
                        
                        def updateCount = sql.executeUpdate("""
                            UPDATE instructions_instance_ini 
                            SET 
                                ini_is_completed = true,
                                ini_completed_at = CURRENT_TIMESTAMP,
                                usr_id_completed_by = ?,
                                updated_at = CURRENT_TIMESTAMP,
                                updated_by = ?
                            WHERE ini_id IN (${placeholders}) AND ini_is_completed = false
                        """.toString(), allParams)
                        
                        affectedRows = affectedRows + updateCount
                    }
                    
                    // Log audit entries for successfully completed instructions
                    if (affectedRows > 0) {
                        try {
                            def stepInfosList = stepInfos as List<GroovyRowResult>
                            println "InstructionRepository: Attempting to log bulk instruction completion audit for ${stepInfosList.size()} instructions"
                            stepInfosList.each { GroovyRowResult stepInfo ->
                                try {
                                    println "InstructionRepository: Logging bulk completion for iniId=${stepInfo.ini_id}, userId=${userId}, stepId=${stepInfo.sti_id}"
                                    AuditLogRepository.logInstructionCompleted(sql, userId, stepInfo.ini_id as UUID, stepInfo.sti_id as UUID)
                                } catch (Exception auditError) {
                                    println "InstructionRepository: Failed to log individual bulk instruction completion audit for ${stepInfo.ini_id} - ${auditError.message}"
                                    auditError.printStackTrace()
                                }
                            }
                        } catch (Exception auditError) {
                            // Audit logging failure shouldn't break the main flow
                            println "InstructionRepository: Failed to log bulk instruction completion audit - ${auditError.message}"
                            auditError.printStackTrace()
                        }
                    }
                    
                    return affectedRows
                }
            } catch (SQLException e) {
                if (e.getSQLState() == '23503') {
                    throw new IllegalArgumentException("User does not exist", e)
                }
                throw new RuntimeException("Failed to bulk complete instructions", e)
            }
        }
    }

    /**
     * Deletes an instruction instance.
     * @param iniId UUID of the instruction instance to delete
     * @return Number of affected rows (1 if deleted successfully, 0 if not found)
     */
    def deleteInstanceInstruction(UUID iniId) {
        if (!iniId) {
            throw new IllegalArgumentException("Instruction instance ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                return sql.executeUpdate("""
                    DELETE FROM instructions_instance_ini 
                    WHERE ini_id = :iniId
                """, [iniId: iniId])
            } catch (SQLException e) {
                if (e.getSQLState() == '23503') {
                    throw new IllegalArgumentException("Cannot delete instruction instance due to foreign key constraint", e)
                }
                throw new RuntimeException("Failed to delete instruction instance ${iniId}", e)
            }
        }
    }

    // ==================== FILTERING AND ANALYTICS METHODS ====================

    /**
     * Finds instructions with hierarchical filtering and full parent context.
     * @param filters Map containing filter parameters
     * @return Map containing instructions list and summary statistics
     */
    def findInstructionsWithHierarchicalFiltering(Map filters) {
        DatabaseUtil.withSql { sql ->
            try {
                def whereConditions = []
                def queryParams = [:]
                
                // Build dynamic WHERE clause based on filters
                if (filters.migrationId) {
                    whereConditions << "mig.mig_id = :migrationId"
                    queryParams.migrationId = UUID.fromString(filters.migrationId as String)
                }
                if (filters.iterationId) {
                    whereConditions << "ite.ite_id = :iterationId"
                    queryParams.iterationId = UUID.fromString(filters.iterationId as String)
                }
                if (filters.planInstanceId) {
                    whereConditions << "pli.pli_id = :planInstanceId"
                    queryParams.planInstanceId = UUID.fromString(filters.planInstanceId as String)
                }
                if (filters.sequenceInstanceId) {
                    whereConditions << "sqi.sqi_id = :sequenceInstanceId"
                    queryParams.sequenceInstanceId = UUID.fromString(filters.sequenceInstanceId as String)
                }
                if (filters.phaseInstanceId) {
                    whereConditions << "phi.phi_id = :phaseInstanceId"
                    queryParams.phaseInstanceId = UUID.fromString(filters.phaseInstanceId as String)
                }
                if (filters.stepInstanceId) {
                    whereConditions << "sti.sti_id = :stepInstanceId"
                    queryParams.stepInstanceId = UUID.fromString(filters.stepInstanceId as String)
                }
                if (filters.teamId) {
                    whereConditions << "COALESCE(ini.tms_id, inm.tms_id) = :teamId"
                    queryParams.teamId = Integer.parseInt(filters.teamId as String)
                }
                if (filters.isCompleted != null) {
                    whereConditions << "ini.ini_is_completed = :isCompleted"
                    queryParams.isCompleted = Boolean.parseBoolean(filters.isCompleted as String)
                }
                
                def whereClause = whereConditions.isEmpty() ? "" : "WHERE ${whereConditions.join(' AND ')}"
                
                def instructions = sql.rows("""
                    SELECT 
                        ini.ini_id,
                        ini.sti_id,
                        ini.inm_id,
                        ini.ini_is_completed,
                        ini.ini_completed_at,
                        ini.usr_id_completed_by,
                        COALESCE(ini.ini_order, inm.inm_order) as effective_order,
                        COALESCE(ini.ini_body, inm.inm_body) as effective_body,
                        COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) as effective_duration,
                        -- Hierarchy context
                        mig.mig_name as migration_name,
                        ite.ite_name as iteration_name,
                        pli.pli_name as plan_name,
                        sqm.sqm_name as sequence_name,
                        phm.phm_name as phase_name,
                        stm.stm_name as step_name,
                        tms.tms_name as team_name,
                        usr.usr_first_name,
                        usr.usr_last_name
                    FROM instructions_instance_ini ini
                    JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                    JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id
                    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    LEFT JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id
                    LEFT JOIN users_usr usr ON ini.usr_id_completed_by = usr.usr_id
                    ${whereClause}
                    ORDER BY 
                        mig.mig_name, ite.ite_name, pli.pli_name, sqm.sqm_order, phm.phm_order, 
                        stm.stm_name, COALESCE(ini.ini_order, inm.inm_order)
                """, queryParams)
                
                // Calculate summary statistics  
                def instructionsList = instructions as List<GroovyRowResult>
                def total = instructionsList.size()
                def completed = instructionsList.count { GroovyRowResult row -> row.ini_is_completed as Boolean }
                def pending = total - completed
                
                return [
                    instructions: instructions,
                    total: total,
                    completed: completed,
                    pending: pending,
                    completion_percentage: total > 0 ? Math.round((double) completed / total * 100 * 100) / 100.0 : 0.0
                ]
                
            } catch (SQLException e) {
                throw new RuntimeException("Failed to find instructions with hierarchical filtering", e)
            }
        }
    }

    /**
     * Gets instruction completion statistics by migration.
     * @param migrationId UUID of the migration
     * @return Map containing completion statistics and team breakdown
     */
    def getInstructionStatisticsByMigration(UUID migrationId) {
        if (!migrationId) {
            throw new IllegalArgumentException("Migration ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                def stats = sql.firstRow('''
                    SELECT 
                        COUNT(*) as total_instructions,
                        COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_instructions,
                        COUNT(CASE WHEN NOT ini.ini_is_completed THEN 1 END) as pending_instructions,
                        COALESCE(AVG(CASE WHEN ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as avg_completion_time,
                        COALESCE(SUM(CASE WHEN NOT ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as estimated_remaining_minutes
                    FROM instructions_instance_ini ini
                    JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                    JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    WHERE ite.mig_id = :migrationId
                ''', [migrationId: migrationId])
                
                def teamBreakdown = sql.rows('''
                    SELECT 
                        tms.tms_id,
                        tms.tms_name,
                        COUNT(*) as total_instructions,
                        COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_instructions,
                        CASE 
                            WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) * 100.0 / COUNT(*))
                            ELSE 0 
                        END as completion_percentage
                    FROM instructions_instance_ini ini
                    JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                    JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id
                    WHERE ite.mig_id = :migrationId
                    GROUP BY tms.tms_id, tms.tms_name
                    ORDER BY tms.tms_name
                ''', [migrationId: migrationId])
                
                def totalInstructions = stats.total_instructions as Integer
                def completedInstructions = stats.completed_instructions as Integer
                def pendingInstructions = stats.pending_instructions as Integer
                def remainingMinutes = stats.estimated_remaining_minutes as Integer
                def avgCompletionTime = stats.avg_completion_time as Double
                
                return [
                    migration_id: migrationId,
                    total_instructions: totalInstructions,
                    completed: completedInstructions,
                    pending: pendingInstructions,
                    completion_percentage: totalInstructions > 0 ? 
                        Math.round(((double) completedInstructions / totalInstructions * 100) * 100) / 100.0 : 0.0,
                    estimated_remaining_minutes: remainingMinutes,
                    average_completion_time: Math.round((double) avgCompletionTime * 100) / 100.0,
                    by_team: teamBreakdown.collect { row ->
                        def teamTotal = row.total_instructions as Integer
                        def teamCompleted = row.completed_instructions as Integer
                        def teamPercentage = row.completion_percentage as Double
                        
                        [
                            tms_id: row.tms_id,
                            tms_name: row.tms_name,
                            total: teamTotal,
                            completed: teamCompleted,
                            percentage: Math.round((double) teamPercentage * 100) / 100.0
                        ]
                    }
                ]
                
            } catch (SQLException e) {
                throw new RuntimeException("Failed to get instruction statistics for migration ${migrationId}", e)
            }
        }
    }

    /**
     * Gets instruction completion statistics by team.
     * @param teamId ID of the team
     * @return Map containing team-specific completion statistics
     */
    def getInstructionStatisticsByTeam(Integer teamId) {
        if (!teamId) {
            throw new IllegalArgumentException("Team ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                def stats = sql.firstRow('''
                    SELECT 
                        tms.tms_name,
                        COUNT(*) as total_instructions,
                        COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_instructions,
                        COUNT(CASE WHEN NOT ini.ini_is_completed THEN 1 END) as pending_instructions,
                        COALESCE(AVG(CASE WHEN ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as avg_completion_time,
                        COALESCE(SUM(CASE WHEN NOT ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as estimated_remaining_minutes
                    FROM instructions_instance_ini ini
                    JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                    JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id
                    WHERE COALESCE(ini.tms_id, inm.tms_id) = :teamId
                    GROUP BY tms.tms_name
                ''', [teamId: teamId])
                
                if (!stats) {
                    return [
                        tms_id: teamId,
                        tms_name: "Unknown Team",
                        total_instructions: 0,
                        completed: 0,
                        pending: 0,
                        completion_percentage: 0,
                        estimated_remaining_minutes: 0,
                        average_completion_time: 0
                    ]
                }
                
                return [
                    tms_id: teamId,
                    tms_name: stats.tms_name,
                    total_instructions: stats.total_instructions,
                    completed: stats.completed_instructions,
                    pending: stats.pending_instructions,
                    completion_percentage: (stats.total_instructions as Long) > 0 ? 
                        Math.round((double) (stats.completed_instructions as Long) / (stats.total_instructions as Long) * 100 * 100) / 100.0 : 0.0,
                    estimated_remaining_minutes: stats.estimated_remaining_minutes,
                    average_completion_time: Math.round((double) stats.avg_completion_time * 100) / 100.0
                ]
                
            } catch (SQLException e) {
                throw new RuntimeException("Failed to get instruction statistics for team ${teamId}", e)
            }
        }
    }

    /**
     * Gets instruction completion timeline for an iteration.
     * @param iterationId UUID of the iteration
     * @return List of completion events ordered by time
     */
    def getInstructionCompletionTimeline(UUID iterationId) {
        if (!iterationId) {
            throw new IllegalArgumentException("Iteration ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                return sql.rows('''
                    SELECT 
                        ini.ini_id,
                        ini.ini_completed_at,
                        ini.usr_id_completed_by,
                        usr.usr_first_name,
                        usr.usr_last_name,
                        usr.usr_email,
                        COALESCE(ini.ini_body, inm.inm_body) as instruction_body,
                        tms.tms_name,
                        stm.stm_name as step_name,
                        phm.phm_name as phase_name
                    FROM instructions_instance_ini ini
                    JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                    JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id
                    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    LEFT JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id
                    LEFT JOIN users_usr usr ON ini.usr_id_completed_by = usr.usr_id
                    WHERE ite.ite_id = :iterationId AND ini.ini_is_completed = true
                    ORDER BY ini.ini_completed_at ASC
                ''', [iterationId: iterationId])
            } catch (SQLException e) {
                throw new RuntimeException("Failed to get instruction completion timeline for iteration ${iterationId}", e)
            }
        }
    }

    /**
     * Finds instructions by control ID.
     * @param ctmId UUID of the control master
     * @return List of instructions associated with the control
     */
    def findInstructionsByControlId(UUID ctmId) {
        if (!ctmId) {
            throw new IllegalArgumentException("Control master ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                return sql.rows('''
                    SELECT 
                        inm.inm_id,
                        inm.stm_id,
                        inm.tms_id,
                        inm.ctm_id,
                        inm.inm_order,
                        inm.inm_body,
                        inm.inm_duration_minutes,
                        stm.stm_name,
                        tms.tms_name,
                        ctm.ctm_name,
                        COUNT(ini.ini_id) as instance_count,
                        COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_instances
                    FROM instructions_master_inm inm
                    JOIN steps_master_stm stm ON inm.stm_id = stm.stm_id
                    JOIN controls_master_ctm ctm ON inm.ctm_id = ctm.ctm_id
                    LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id
                    LEFT JOIN instructions_instance_ini ini ON inm.inm_id = ini.inm_id
                    WHERE inm.ctm_id = :ctmId
                    GROUP BY inm.inm_id, inm.stm_id, inm.tms_id, inm.ctm_id, inm.inm_order, 
                             inm.inm_body, inm.inm_duration_minutes, stm.stm_name, tms.tms_name, ctm.ctm_name
                    ORDER BY inm.inm_order ASC
                ''', [ctmId: ctmId])
            } catch (SQLException e) {
                throw new RuntimeException("Failed to find instructions for control ${ctmId}", e)
            }
        }
    }

    /**
     * Clones master instructions from one step to another.
     * @param sourceStmId UUID of the source step master
     * @param targetStmId UUID of the target step master
     * @return List of created instruction IDs
     */
    def cloneMasterInstructions(UUID sourceStmId, UUID targetStmId) {
        if (!sourceStmId || !targetStmId) {
            throw new IllegalArgumentException("Source and target step master IDs are required")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                sql.withTransaction {
                    def results = sql.rows('''
                        INSERT INTO instructions_master_inm (
                            stm_id, tms_id, ctm_id, inm_order, inm_body, inm_duration_minutes,
                            created_by, created_at, updated_by, updated_at
                        )
                        SELECT 
                            :targetStmId as stm_id,
                            tms_id,
                            ctm_id,
                            inm_order,
                            inm_body,
                            inm_duration_minutes,
                            :createdBy as created_by,
                            CURRENT_TIMESTAMP as created_at,
                            :updatedBy as updated_by,
                            CURRENT_TIMESTAMP as updated_at
                        FROM instructions_master_inm
                        WHERE stm_id = :sourceStmId
                        ORDER BY inm_order
                        RETURNING inm_id
                    ''', [sourceStmId: sourceStmId, targetStmId: targetStmId, 
                          createdBy: AuthenticationService.getSystemUser(), 
                          updatedBy: AuthenticationService.getSystemUser()])
                    
                    return results.collect { it.inm_id }
                }
            } catch (SQLException e) {
                if (e.getSQLState() == '23503') {
                    throw new IllegalArgumentException("Source or target step master does not exist", e)
                } else if (e.getSQLState() == '23505') {
                    throw new IllegalArgumentException("Duplicate instruction order in target step", e)
                }
                throw new RuntimeException("Failed to clone master instructions from ${sourceStmId} to ${targetStmId}", e)
            }
        }
    }

    /**
     * Gets team workload information for a specific iteration.
     * @param teamId ID of the team
     * @param iterationId UUID of the iteration
     * @return Map containing workload statistics and instruction breakdown
     */
    def getTeamWorkload(Integer teamId, UUID iterationId) {
        if (!teamId || !iterationId) {
            throw new IllegalArgumentException("Team ID and iteration ID are required")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                def workloadStats = sql.firstRow('''
                    SELECT 
                        tms.tms_name,
                        COUNT(*) as total_instructions,
                        COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_instructions,
                        COUNT(CASE WHEN NOT ini.ini_is_completed THEN 1 END) as pending_instructions,
                        COALESCE(SUM(CASE WHEN NOT ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as estimated_remaining_minutes,
                        COALESCE(AVG(CASE WHEN ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as avg_completion_time
                    FROM instructions_instance_ini ini
                    JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                    JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN teams_tms tms ON COALESCE(ini.tms_id, inm.tms_id) = tms.tms_id
                    WHERE COALESCE(ini.tms_id, inm.tms_id) = :teamId AND ite.ite_id = :iterationId
                    GROUP BY tms.tms_name
                ''', [teamId: teamId, iterationId: iterationId])
                
                def phaseBreakdown = sql.rows('''
                    SELECT 
                        phm.phm_name,
                        COUNT(*) as instruction_count,
                        COUNT(CASE WHEN ini.ini_is_completed THEN 1 END) as completed_count,
                        COALESCE(SUM(CASE WHEN NOT ini.ini_is_completed THEN COALESCE(ini.ini_duration_minutes, inm.inm_duration_minutes) END), 0) as remaining_minutes
                    FROM instructions_instance_ini ini
                    JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                    JOIN steps_instance_sti sti ON ini.sti_id = sti.sti_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    WHERE COALESCE(ini.tms_id, inm.tms_id) = :teamId AND ite.ite_id = :iterationId
                    GROUP BY phm.phm_name
                    ORDER BY phm.phm_name
                ''', [teamId: teamId, iterationId: iterationId])
                
                if (!workloadStats) {
                    return [
                        tms_id: teamId,
                        tms_name: "Unknown Team",
                        iteration_id: iterationId,
                        total_instructions: 0,
                        completed: 0,
                        pending: 0,
                        completion_percentage: 0,
                        estimated_remaining_minutes: 0,
                        average_completion_time: 0,
                        by_phase: []
                    ]
                }
                
                return [
                    tms_id: teamId,
                    tms_name: workloadStats.tms_name,
                    iteration_id: iterationId,
                    total_instructions: workloadStats.total_instructions,
                    completed: workloadStats.completed_instructions,
                    pending: workloadStats.pending_instructions,
                    completion_percentage: (workloadStats.total_instructions as Long) > 0 ? 
                        Math.round((double) (workloadStats.completed_instructions as Long) / (workloadStats.total_instructions as Long) * 100 * 100) / 100.0 : 0.0,
                    estimated_remaining_minutes: workloadStats.estimated_remaining_minutes,
                    average_completion_time: Math.round((double) workloadStats.avg_completion_time * 100) / 100.0,
                    by_phase: phaseBreakdown.collect { row ->
                        [
                            phase_name: row.phm_name,
                            instruction_count: row.instruction_count,
                            completed_count: row.completed_count,
                            remaining_minutes: row.remaining_minutes
                        ]
                    }
                ]
                
            } catch (SQLException e) {
                throw new RuntimeException("Failed to get team workload for team ${teamId} and iteration ${iterationId}", e)
            }
        }
    }
}
