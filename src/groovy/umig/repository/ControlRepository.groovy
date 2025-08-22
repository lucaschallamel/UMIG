package umig.repository

import umig.utils.DatabaseUtil
import java.util.UUID

/**
 * Repository class for managing Controls data.
 * Handles operations for both master controls (controls_master_ctm) and control instances (controls_instance_cti).
 * Following the canonical-first approach with consolidated operations.
 * Implements ordering logic, phase-level associations, hierarchical filtering, and validation tracking.
 */
class ControlRepository {

    // ==================== MASTER CONTROL OPERATIONS ====================
    
    /**
     * Retrieves all master controls with phase, sequence and plan information.
     * @return List of master controls with enriched data
     */
    def findAllMasterControls() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    ctm.ctm_id, 
                    ctm.phm_id, 
                    ctm.ctm_order, 
                    ctm.ctm_name, 
                    ctm.ctm_description, 
                    ctm.ctm_type,
                    ctm.ctm_is_critical,
                    ctm.ctm_code,
                    ctm.created_by,
                    ctm.created_at,
                    ctm.updated_by,
                    ctm.updated_at,
                    phm.phm_name,
                    phm.phm_description as phase_description,
                    phm.sqm_id,
                    sqm.sqm_name,
                    sqm.sqm_description as sequence_description,
                    sqm.plm_id,
                    plm.plm_name,
                    plm.plm_description as plan_description,
                    plm.tms_id,
                    tms.tms_name
                FROM controls_master_ctm ctm
                JOIN phases_master_phm phm ON ctm.phm_id = phm.phm_id
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                ORDER BY plm.plm_name, sqm.sqm_order, phm.phm_order, ctm.ctm_order
            """)
        }
    }
    
    /**
     * Finds a specific master control by ID.
     * @param controlId The UUID of the master control
     * @return Map containing control details or null if not found
     */
    def findMasterControlById(UUID controlId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT 
                    ctm.ctm_id, 
                    ctm.phm_id, 
                    ctm.ctm_order, 
                    ctm.ctm_name, 
                    ctm.ctm_description, 
                    ctm.ctm_type,
                    ctm.ctm_is_critical,
                    ctm.ctm_code,
                    ctm.created_by,
                    ctm.created_at,
                    ctm.updated_by,
                    ctm.updated_at,
                    phm.phm_name,
                    phm.phm_description as phase_description,
                    phm.sqm_id,
                    sqm.sqm_name,
                    sqm.sqm_description as sequence_description,
                    sqm.plm_id,
                    plm.plm_name,
                    plm.plm_description as plan_description,
                    plm.tms_id,
                    tms.tms_name
                FROM controls_master_ctm ctm
                JOIN phases_master_phm phm ON ctm.phm_id = phm.phm_id
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                WHERE ctm.ctm_id = :controlId
            """, [controlId: controlId])
        }
    }
    
    /**
     * Finds master controls filtered by phase ID.
     * @param phaseId The UUID of the master phase
     * @return List of controls belonging to the phase
     */
    def findMasterControlsByPhaseId(UUID phaseId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    ctm.ctm_id, 
                    ctm.phm_id, 
                    ctm.ctm_order, 
                    ctm.ctm_name, 
                    ctm.ctm_description, 
                    ctm.ctm_type,
                    ctm.ctm_is_critical,
                    ctm.ctm_code,
                    ctm.created_by,
                    ctm.created_at,
                    ctm.updated_by,
                    ctm.updated_at,
                    phm.phm_name,
                    phm.phm_description as phase_description
                FROM controls_master_ctm ctm
                JOIN phases_master_phm phm ON ctm.phm_id = phm.phm_id
                WHERE ctm.phm_id = :phaseId
                ORDER BY ctm.ctm_order
            """, [phaseId: phaseId])
        }
    }
    
    /**
     * Finds master controls with Admin GUI support - filtering, pagination, sorting, and computed fields.
     * Following the proven template pattern for consistent Admin GUI integration.
     * @param filters Map containing optional filters (status, search, ownerId, etc.)
     * @param pageNumber Page number for pagination (default: 1)
     * @param pageSize Items per page (default: 50, max: 100)
     * @param sortField Field to sort by (default: ctm_name)
     * @param sortDirection Sort direction - 'asc' or 'desc' (default: 'asc')
     * @return Map containing data, pagination info, and applied filters
     */
    def findMasterControlsWithFilters(Map filters, int pageNumber = 1, int pageSize = 50, String sortField = null, String sortDirection = 'asc') {
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
            
            // Phase ID filtering (controls belong to phases)
            if (filters.phaseId) {
                whereConditions << "e.phm_id = ?"
                params << UUID.fromString(filters.phaseId as String)
            }
            
            // Search functionality (control name and description)
            if (filters.search) {
                whereConditions << "(e.ctm_name ILIKE ? OR e.ctm_description ILIKE ?)"
                params << "%${filters.search}%".toString()
                params << "%${filters.search}%".toString()
            }
            
            // Critical controls only filter
            if (filters.criticalOnly) {
                whereConditions << "e.ctm_is_critical = ?"
                params << true
            }
            
            def whereClause = whereConditions ? "WHERE " + whereConditions.join(" AND ") : ""
            
            // Count query
            def countQuery = """
                SELECT COUNT(DISTINCT e.ctm_id) as total
                FROM controls_master_ctm e
                LEFT JOIN status_sts s ON e.ctm_status = s.sts_id
                ${whereClause}
            """
            def totalCount = sql.firstRow(countQuery, params)?.total ?: 0
            
            // Validate sort field
            def allowedSortFields = ['ctm_id', 'ctm_name', 'ctm_description', 'ctm_type', 'ctm_is_critical', 'ctm_order', 'created_at', 'updated_at', 'instance_count', 'validation_count']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'ctm_name'
            }
            sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
            
            // Data query with computed fields
            def offset = (pageNumber - 1) * pageSize
            def dataQuery = """
                SELECT DISTINCT e.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type,
                       phm.phm_name,
                       COALESCE(instance_counts.instance_count, 0) as instance_count,
                       COALESCE(validation_counts.validation_count, 0) as validation_count
                FROM controls_master_ctm e
                LEFT JOIN status_sts s ON e.ctm_status = s.sts_id
                LEFT JOIN phases_master_phm phm ON e.phm_id = phm.phm_id
                LEFT JOIN (
                    SELECT ctm_id, COUNT(*) as instance_count
                    FROM controls_instance_cti
                    GROUP BY ctm_id
                ) instance_counts ON e.ctm_id = instance_counts.ctm_id
                LEFT JOIN (
                    SELECT ctm_id, COUNT(CASE WHEN cti_status IN (
                        SELECT sts_id FROM status_sts WHERE sts_name IN ('PASSED', 'FAILED') AND sts_type = 'Control'
                    ) THEN 1 END) as validation_count
                    FROM controls_instance_cti
                    GROUP BY ctm_id
                ) validation_counts ON e.ctm_id = validation_counts.ctm_id
                ${whereClause}
                ORDER BY ${['instance_count', 'validation_count'].contains(sortField) ? sortField : 'e.' + sortField} ${sortDirection}
                LIMIT ${pageSize} OFFSET ${offset}
            """
            
            def controls = sql.rows(dataQuery, params)
            def enrichedControls = controls.collect { enrichMasterControlWithStatusMetadata(it) }
            
            return [
                data: enrichedControls,
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
     * Enriches master control data with status metadata while maintaining backward compatibility.
     * @param row Database row containing control and status data
     * @return Enhanced control map with statusMetadata
     */
    private Map enrichMasterControlWithStatusMetadata(Map row) {
        return [
            ctm_id: row.ctm_id,
            phm_id: row.phm_id,
            ctm_order: row.ctm_order,
            ctm_name: row.ctm_name,
            ctm_description: row.ctm_description,
            ctm_type: row.ctm_type,
            ctm_is_critical: row.ctm_is_critical,
            ctm_code: row.ctm_code,
            ctm_status: row.sts_name, // Backward compatibility
            created_by: row.created_by,
            created_at: row.created_at,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            phm_name: row.phm_name,
            // Computed fields from joins
            instance_count: row.instance_count ?: 0,
            validation_count: row.validation_count ?: 0,
            // Enhanced status metadata (consistent across all entities)
            statusMetadata: row.sts_id ? [
                id: row.sts_id,
                name: row.sts_name,
                color: row.sts_color,
                type: row.sts_type
            ] : null
        ]
    }
    
    /**
     * Creates a new master control.
     * @param controlData Map containing control data (phm_id, ctm_name, ctm_description, ctm_type, ctm_is_critical, ctm_code, ctm_order)
     * @return Map containing the created control or null on failure
     */
    def createMasterControl(Map controlData) {
        DatabaseUtil.withSql { sql ->
            try {
                // Validate phase exists
                def phaseExists = sql.firstRow(
                    'SELECT phm_id FROM phases_master_phm WHERE phm_id = :phaseId', 
                    [phaseId: controlData.phm_id]
                )
                if (!phaseExists) {
                    return null
                }
                
                // Auto-assign order if not provided
                if (!controlData.ctm_order) {
                    def maxOrder = sql.firstRow("""
                        SELECT COALESCE(MAX(ctm_order), 0) + 1 as next_order
                        FROM controls_master_ctm 
                        WHERE phm_id = :phaseId
                    """, [phaseId: controlData.phm_id])
                    controlData.ctm_order = maxOrder.next_order
                }
                
                // Check for order conflicts
                def orderConflict = sql.firstRow("""
                    SELECT ctm_id FROM controls_master_ctm 
                    WHERE phm_id = :phaseId AND ctm_order = :order
                """, [phaseId: controlData.phm_id, order: controlData.ctm_order])
                
                if (orderConflict) {
                    // Shift existing controls to make room
                    sql.executeUpdate("""
                        UPDATE controls_master_ctm 
                        SET ctm_order = ctm_order + 1,
                            updated_by = 'system',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE phm_id = :phaseId AND ctm_order >= :order
                    """, [phaseId: controlData.phm_id, order: controlData.ctm_order])
                }
                
                // Validate ctm_code uniqueness if provided
                if (controlData.ctm_code) {
                    def codeExists = sql.firstRow(
                        'SELECT ctm_id FROM controls_master_ctm WHERE ctm_code = :code', 
                        [code: controlData.ctm_code]
                    )
                    if (codeExists) {
                        throw new IllegalArgumentException("Control code already exists: ${controlData.ctm_code}")
                    }
                }
                
                def result = sql.firstRow("""
                    INSERT INTO controls_master_ctm (
                        phm_id, ctm_order, ctm_name, ctm_description, ctm_type, 
                        ctm_is_critical, ctm_code, created_by, updated_by
                    ) VALUES (
                        :phm_id, :ctm_order, :ctm_name, :ctm_description, :ctm_type,
                        :ctm_is_critical, :ctm_code, 'system', 'system'
                    )
                    RETURNING ctm_id
                """, controlData)
                
                if (result?.ctm_id) {
                    return findMasterControlById(result.ctm_id as UUID)
                }
                return null
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Updates an existing master control.
     * @param controlId The UUID of the control to update
     * @param controlData Map containing fields to update
     * @return Map containing the updated control or null if not found
     */
    def updateMasterControl(UUID controlId, Map controlData) {
        DatabaseUtil.withSql { sql ->
            try {
                // Check if control exists
                def currentControl = sql.firstRow(
                    'SELECT ctm_id FROM controls_master_ctm WHERE ctm_id = :controlId', 
                    [controlId: controlId]
                )
                if (!currentControl) {
                    return null
                }
                
                // Validate ctm_code uniqueness if being updated
                if (controlData.ctm_code) {
                    def codeExists = sql.firstRow(
                        'SELECT ctm_id FROM controls_master_ctm WHERE ctm_code = :code AND ctm_id != :controlId', 
                        [code: controlData.ctm_code, controlId: controlId]
                    )
                    if (codeExists) {
                        throw new IllegalArgumentException("Control code already exists: ${controlData.ctm_code}")
                    }
                }
                
                // Build dynamic update query
                def setClauses = []
                def queryParams = [:]
                def updatableFields = ['ctm_name', 'ctm_description', 'ctm_type', 'ctm_is_critical', 'ctm_code']
                
                controlData.each { key, value ->
                    if (key in updatableFields) {
                        setClauses.add("${key} = :${key}")
                        queryParams[key] = value
                    }
                }
                
                if (setClauses.isEmpty()) {
                    return findMasterControlById(controlId)
                }
                
                queryParams['controlId'] = controlId
                setClauses.add("updated_by = 'system'")
                setClauses.add("updated_at = CURRENT_TIMESTAMP")
                
                def updateQuery = "UPDATE controls_master_ctm SET ${setClauses.join(', ')} WHERE ctm_id = :controlId"
                sql.executeUpdate(updateQuery, queryParams)
                
                return findMasterControlById(controlId)
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Deletes a master control by checking dependencies.
     * @param controlId The UUID of the control to delete
     * @return true if deleted successfully, false otherwise
     */
    def deleteMasterControl(UUID controlId) {
        DatabaseUtil.withSql { sql ->
            try {
                // Check if control has instances
                def hasInstances = sql.firstRow("""
                    SELECT COUNT(*) as instance_count
                    FROM controls_instance_cti
                    WHERE ctm_id = :controlId
                """, [controlId: controlId])
                
                if ((hasInstances?.instance_count as Long ?: 0L) > 0) {
                    return false // Cannot delete control with instances
                }
                
                // Check if control is referenced by instructions
                def hasInstructions = sql.firstRow("""
                    SELECT COUNT(*) as instruction_count
                    FROM instructions_master_inm
                    WHERE ctm_id = :controlId
                """, [controlId: controlId])
                
                if ((hasInstructions?.instruction_count as Long ?: 0L) > 0) {
                    return false // Cannot delete control referenced by instructions
                }
                
                def rowsDeleted = sql.executeUpdate("""
                    DELETE FROM controls_master_ctm 
                    WHERE ctm_id = :controlId
                """, [controlId: controlId])
                
                return rowsDeleted > 0
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Reorders master controls within a phase.
     * @param phaseId The UUID of the phase
     * @param orderMap Map of control UUID to new order position
     * @return true if reordered successfully, false otherwise
     */
    def reorderMasterControls(UUID phaseId, Map<UUID, Integer> orderMap) {
        DatabaseUtil.withSql { sql ->
            try {
                sql.withTransaction {
                    orderMap.each { controlId, newOrder ->
                        sql.executeUpdate("""
                            UPDATE controls_master_ctm 
                            SET ctm_order = :newOrder,
                                updated_by = 'system',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE ctm_id = :controlId AND phm_id = :phaseId
                        """, [controlId: controlId, newOrder: newOrder, phaseId: phaseId])
                    }
                    return true
                }
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    // ==================== INSTANCE CONTROL OPERATIONS ====================
    
    /**
     * Validates and transforms filter parameters with proper type casting.
     * Centralizes filter validation logic for better performance and maintainability.
     * @param filters Raw filter map from API request
     * @return Map with properly typed filter values
     */
    private Map validateFilters(Map filters) {
        if (!filters) return [:]
        
        return filters.findAll { k, v -> v != null }.collectEntries { k, v ->
            switch(k) {
                // UUID fields
                case ~/.*Id$/:
                    if (k in ['teamId', 'statusId', 'userId']) {
                        // Integer ID fields
                        return [k, Integer.parseInt(v as String)]
                    } else {
                        // UUID ID fields
                        return [k, UUID.fromString(v as String)]
                    }
                // Integer fields
                case 'limit':
                case 'offset':
                case 'order':
                    return [k, Integer.parseInt(v as String)]
                // String fields
                default:
                    return [k, v as String]
            }
        }
    }
    
    /**
     * Finds control instances with hierarchical filtering.
     * @param filters Map containing optional filters (migrationId, iterationId, planInstanceId, sequenceInstanceId, phaseInstanceId, teamId, statusId)
     * @return List of control instances with enriched data
     */
    def findControlInstances(Map filters) {
        DatabaseUtil.withSql { sql ->
            def query = """
                SELECT 
                    cti.cti_id,
                    cti.phi_id,
                    cti.ctm_id,
                    cti.cti_status,
                    COALESCE(cti.cti_validated_at::text, '') as cti_validated_at,
                    cti.usr_id_it_validator,
                    cti.usr_id_biz_validator,
                    cti.cti_order,
                    cti.cti_name,
                    cti.cti_description,
                    cti.cti_type,
                    cti.cti_is_critical,
                    cti.cti_code,
                    cti.created_at::text as created_at,
                    cti.updated_at::text as updated_at,
                    ctm.ctm_name as master_name,
                    ctm.ctm_description as master_description,
                    ctm.ctm_type as master_type,
                    ctm.ctm_is_critical as master_is_critical,
                    ctm.ctm_code as master_code,
                    phi.phi_name,
                    phm.phm_name,
                    sqi.sqi_name,
                    sqm.sqm_name,
                    pli.pli_name,
                    plm.plm_name,
                    plm.tms_id,
                    tms.tms_name,
                    itr.itr_name,
                    mig.mig_name,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color
                FROM controls_instance_cti cti
                JOIN controls_master_ctm ctm ON cti.ctm_id = ctm.ctm_id
                JOIN phases_instance_phi phi ON cti.phi_id = phi.phi_id
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite itr ON pli.ite_id = itr.ite_id
                JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN status_sts sts ON cti.cti_status = sts.sts_id
                WHERE 1=1
            """
            
            // Use centralized filter validation for better performance
            def validatedFilters = validateFilters(filters)
            def params = [:]
            
            // Add filters with validated types
            if (validatedFilters.migrationId) {
                query += ' AND mig.mig_id = :migrationId'
                params.migrationId = validatedFilters.migrationId
            }
            
            if (validatedFilters.iterationId) {
                query += ' AND pli.ite_id = :iterationId'
                params.iterationId = validatedFilters.iterationId
            }
            
            if (validatedFilters.planInstanceId) {
                query += ' AND sqi.pli_id = :planInstanceId'
                params.planInstanceId = validatedFilters.planInstanceId
            }
            
            if (validatedFilters.sequenceInstanceId) {
                query += ' AND phi.sqi_id = :sequenceInstanceId'
                params.sequenceInstanceId = validatedFilters.sequenceInstanceId
            }
            
            if (validatedFilters.phaseInstanceId) {
                query += ' AND cti.phi_id = :phaseInstanceId'
                params.phaseInstanceId = validatedFilters.phaseInstanceId
            }
            
            if (validatedFilters.teamId) {
                query += ' AND plm.tms_id = :teamId'
                params.teamId = validatedFilters.teamId
            }
            
            if (validatedFilters.statusId) {
                query += ' AND sts.sts_id = :statusId'
                params.statusId = validatedFilters.statusId
            }
            
            query += ' ORDER BY cti.cti_order, cti.created_at'
            
            return sql.rows(query, params)
        }
    }
    
    /**
     * Finds a specific control instance by ID with full details.
     * @param instanceId The UUID of the control instance
     * @return Map containing instance details or null if not found
     */
    def findControlInstanceById(UUID instanceId) {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                SELECT 
                    cti.cti_id,
                    cti.phi_id,
                    cti.ctm_id,
                    cti.cti_status,
                    cti.cti_validated_at::text as cti_validated_at,
                    cti.usr_id_it_validator,
                    cti.usr_id_biz_validator,
                    cti.cti_order,
                    cti.cti_name,
                    cti.cti_description,
                    cti.cti_type,
                    cti.cti_is_critical,
                    cti.cti_code,
                    cti.created_by,
                    cti.created_at::text as created_at,
                    cti.updated_by,
                    cti.updated_at::text as updated_at,
                    ctm.ctm_name as master_name,
                    ctm.ctm_description as master_description,
                    ctm.ctm_order as master_order,
                    ctm.ctm_type as master_type,
                    ctm.ctm_is_critical as master_is_critical,
                    ctm.ctm_code as master_code,
                    phi.phi_name,
                    phm.phm_name,
                    sqi.sqi_name,
                    sqm.sqm_name,
                    pli.pli_name,
                    plm.plm_name,
                    plm.tms_id,
                    tms.tms_name,
                    itr.itr_name,
                    mig.mig_name,
                    sts.sts_id,
                    sts.sts_name,
                    sts.sts_color,
                    it_val.usr_full_name as it_validator_name,
                    biz_val.usr_full_name as biz_validator_name
                FROM controls_instance_cti cti
                JOIN controls_master_ctm ctm ON cti.ctm_id = ctm.ctm_id
                JOIN phases_instance_phi phi ON cti.phi_id = phi.phi_id
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite itr ON pli.ite_id = itr.ite_id
                JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN status_sts sts ON cti.cti_status = sts.sts_id
                LEFT JOIN users_usr it_val ON cti.usr_id_it_validator = it_val.usr_id
                LEFT JOIN users_usr biz_val ON cti.usr_id_biz_validator = biz_val.usr_id
                WHERE cti.cti_id = :instanceId
            """, [instanceId: instanceId])
            
            return result ? enrichControlInstanceWithStatusMetadata(result) : null
        }
    }
    
    /**
     * Creates control instance from master control.
     * Implements full attribute instantiation (ADR-029).
     * @param masterControlId The UUID of the master control
     * @param phaseInstanceId The UUID of the phase instance
     * @param overrides Map containing optional override values
     * @return Map containing the created control instance
     */
    def createControlInstance(UUID masterControlId, UUID phaseInstanceId, Map overrides = [:]) {
        DatabaseUtil.withSql { sql ->
            try {
                sql.withTransaction {
                    // Verify phase instance exists
                    def phaseInstance = sql.firstRow("""
                        SELECT phi_id FROM phases_instance_phi 
                        WHERE phi_id = :phaseInstanceId
                    """, [phaseInstanceId: phaseInstanceId])
                    
                    if (!phaseInstance) {
                        return null
                    }
                    
                    // Get master control data
                    def masterControl = sql.firstRow("""
                        SELECT ctm_id, ctm_name, ctm_description, ctm_order, 
                               ctm_type, ctm_is_critical, ctm_code
                        FROM controls_master_ctm 
                        WHERE ctm_id = :masterControlId
                    """, [masterControlId: masterControlId])
                    
                    if (!masterControl) {
                        return null
                    }
                    
                    def instanceData = [
                        phi_id: phaseInstanceId,
                        ctm_id: masterControlId,
                        cti_status: overrides.cti_status ?: getDefaultControlInstanceStatusId(sql),
                        cti_name: overrides.cti_name ?: masterControl.ctm_name,
                        cti_description: overrides.cti_description ?: masterControl.ctm_description,
                        cti_order: overrides.cti_order ?: masterControl.ctm_order,
                        cti_type: overrides.cti_type ?: masterControl.ctm_type,
                        cti_is_critical: overrides.cti_is_critical ?: masterControl.ctm_is_critical,
                        cti_code: overrides.cti_code ?: masterControl.ctm_code
                    ]
                    
                    def result = sql.firstRow("""
                        INSERT INTO controls_instance_cti (
                            phi_id, ctm_id, cti_status, cti_name, cti_description, 
                            cti_order, cti_type, cti_is_critical, cti_code,
                            created_by, updated_by
                        ) VALUES (
                            :phi_id, :ctm_id, :cti_status, :cti_name, :cti_description,
                            :cti_order, :cti_type, :cti_is_critical, :cti_code,
                            'system', 'system'
                        )
                        RETURNING cti_id
                    """, instanceData)
                    
                    if (result?.cti_id) {
                        return findControlInstanceById(result.cti_id as UUID)
                    }
                    return null
                }
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Creates control instances from all master controls in a phase.
     * @param phaseId The UUID of the master phase
     * @param phaseInstanceId The UUID of the phase instance
     * @return List of created control instances
     */
    def createControlInstancesFromPhase(UUID phaseId, UUID phaseInstanceId) {
        DatabaseUtil.withSql { sql ->
            try {
                def createdInstances = []
                
                sql.withTransaction {
                    // Get all master controls for the phase
                    def masterControls = sql.rows("""
                        SELECT ctm_id
                        FROM controls_master_ctm 
                        WHERE phm_id = :phaseId
                        ORDER BY ctm_order
                    """, [phaseId: phaseId])
                    
                    masterControls.each { masterControl ->
                        def instance = createControlInstance(
                            masterControl.ctm_id as UUID, 
                            phaseInstanceId
                        )
                        if (instance) {
                            createdInstances.add(instance)
                        }
                    }
                }
                
                return createdInstances
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Updates a control instance.
     * @param instanceId The UUID of the instance to update
     * @param updates Map containing fields to update
     * @return Map containing the updated instance or null if not found
     */
    def updateControlInstance(UUID instanceId, Map updates) {
        DatabaseUtil.withSql { sql ->
            try {
                // Check if instance exists
                if (!sql.firstRow('SELECT cti_id FROM controls_instance_cti WHERE cti_id = :instanceId', [instanceId: instanceId])) {
                    return null
                }
                
                // Build dynamic update query
                def setClauses = []
                def queryParams = [:]
                def updatableFields = ['cti_name', 'cti_description', 'cti_status', 'cti_order', 
                                     'cti_type', 'cti_is_critical', 'cti_code', 'usr_id_it_validator', 'usr_id_biz_validator']
                
                updates.each { key, value ->
                    if (key in updatableFields) {
                        setClauses.add("${key} = :${key}")
                        queryParams[key] = value
                    }
                }
                
                if (setClauses.isEmpty()) {
                    return findControlInstanceById(instanceId)
                }
                
                queryParams['instanceId'] = instanceId
                setClauses.add("updated_by = 'system'")
                setClauses.add("updated_at = CURRENT_TIMESTAMP")
                
                def updateQuery = "UPDATE controls_instance_cti SET ${setClauses.join(', ')} WHERE cti_id = :instanceId"
                sql.executeUpdate(updateQuery, queryParams)
                
                return findControlInstanceById(instanceId)
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Validates a control with specific validation data.
     * @param controlId The UUID of the control instance
     * @param validationData Map containing validation info (status, it_validator, biz_validator)
     * @return Map containing the updated control instance or null if not found
     */
    def validateControl(UUID controlId, Map validationData) {
        DatabaseUtil.withSql { sql ->
            try {
                def setClauses = []
                Map<String, Object> queryParams = [controlId: controlId]
                
                if (validationData.cti_status) {
                    // Handle status conversion if string provided
                    def statusId = validationData.cti_status
                    if (statusId instanceof String) {
                        def statusRow = sql.firstRow("""
                            SELECT sts_id FROM status_sts 
                            WHERE sts_name = :statusName AND sts_type = 'Control'
                        """, [statusName: statusId])
                        statusId = statusRow?.sts_id
                    }
                    
                    if (statusId) {
                        setClauses.add("cti_status = :cti_status")
                        queryParams.put("cti_status", statusId as Integer)
                        
                        // Check if this is a completion status
                        def statusName = sql.firstRow("""
                            SELECT sts_name FROM status_sts WHERE sts_id = :statusId
                        """, [statusId: statusId])?.sts_name
                        
                        if (statusName in ['PASSED', 'FAILED']) {
                            setClauses.add("cti_validated_at = CURRENT_TIMESTAMP")
                        }
                    }
                }
                
                if (validationData.usr_id_it_validator) {
                    setClauses.add("usr_id_it_validator = :usr_id_it_validator")
                    queryParams.put("usr_id_it_validator", validationData.usr_id_it_validator as Integer)
                }
                
                if (validationData.usr_id_biz_validator) {
                    setClauses.add("usr_id_biz_validator = :usr_id_biz_validator")
                    queryParams.put("usr_id_biz_validator", validationData.usr_id_biz_validator as Integer)
                }
                
                if (setClauses.isEmpty()) {
                    return findControlInstanceById(controlId)
                }
                
                setClauses.add("updated_by = 'system'")
                setClauses.add("updated_at = CURRENT_TIMESTAMP")
                
                def updateQuery = "UPDATE controls_instance_cti SET ${setClauses.join(', ')} WHERE cti_id = :controlId"
                sql.executeUpdate(updateQuery, queryParams)
                
                return findControlInstanceById(controlId)
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Overrides a control with reason and approver.
     * @param controlId The UUID of the control instance
     * @param reason The override reason
     * @param overrideBy The user performing the override
     * @return Map containing the updated control instance or null if not found
     */
    def overrideControl(UUID controlId, String reason, String overrideBy) {
        DatabaseUtil.withSql { sql ->
            try {
                // Note: Override tracking fields would need to be added to the schema
                // For now, we mark as PASSED and add audit fields
                
                // Get PASSED status ID for Control type
                def passedStatus = sql.firstRow("""
                    SELECT sts_id FROM status_sts 
                    WHERE sts_name = 'PASSED' AND sts_type = 'Control'
                """)
                def passedStatusId = passedStatus?.sts_id ?: 1 // Fallback
                
                def rowsUpdated = sql.executeUpdate("""
                    UPDATE controls_instance_cti 
                    SET cti_status = :passedStatusId,
                        cti_validated_at = CURRENT_TIMESTAMP,
                        updated_by = :overrideBy,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE cti_id = :controlId
                """, [controlId: controlId, overrideBy: overrideBy, passedStatusId: passedStatusId])
                
                if (rowsUpdated > 0) {
                    return findControlInstanceById(controlId)
                }
                return null
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Deletes a control instance.
     * @param instanceId The UUID of the instance to delete
     * @return true if deleted successfully, false otherwise
     */
    def deleteControlInstance(UUID instanceId) {
        DatabaseUtil.withSql { sql ->
            try {
                def rowsDeleted = sql.executeUpdate("""
                    DELETE FROM controls_instance_cti 
                    WHERE cti_id = :instanceId
                """, [instanceId: instanceId])
                
                return rowsDeleted > 0
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    // ==================== ADVANCED OPERATIONS ====================
    
    /**
     * Calculates control progress for a phase based on validation completion.
     * @param phaseId The UUID of the phase instance
     * @return Map containing progress statistics
     */
    def calculatePhaseControlProgress(UUID phaseId) {
        DatabaseUtil.withSql { sql ->
            def stats = sql.firstRow("""
                SELECT 
                    COUNT(*) as total_controls,
                    COUNT(CASE WHEN cti.cti_status = 'PASSED' THEN 1 END) as passed_controls,
                    COUNT(CASE WHEN cti.cti_status = 'FAILED' THEN 1 END) as failed_controls,
                    COUNT(CASE WHEN cti.cti_status = 'PENDING' THEN 1 END) as pending_controls,
                    COUNT(CASE WHEN cti.cti_is_critical = true THEN 1 END) as critical_controls,
                    COUNT(CASE WHEN cti.cti_is_critical = true AND cti.cti_status = 'PASSED' THEN 1 END) as passed_critical,
                    COUNT(CASE WHEN cti.cti_is_critical = true AND cti.cti_status = 'FAILED' THEN 1 END) as failed_critical
                FROM controls_instance_cti cti
                WHERE cti.phi_id = :phaseId
            """, [phaseId: phaseId])
            
            def totalControls = stats.total_controls as Integer ?: 0
            def passedControls = stats.passed_controls as Integer ?: 0
            def failedControls = stats.failed_controls as Integer ?: 0
            def pendingControls = stats.pending_controls as Integer ?: 0
            def criticalControls = stats.critical_controls as Integer ?: 0
            def passedCritical = stats.passed_critical as Integer ?: 0
            def failedCritical = stats.failed_critical as Integer ?: 0
            
            def completionPercentage = 0.0
            if (totalControls > 0) {
                completionPercentage = (passedControls.doubleValue() / totalControls.doubleValue()) * 100.0d
            }
            
            def allControlsPassed = (passedControls == totalControls)
            def noCriticalFailures = (failedCritical == 0)
            def canProceed = allControlsPassed && noCriticalFailures
            
            return [
                total_controls: totalControls,
                passed_controls: passedControls,
                failed_controls: failedControls,
                pending_controls: pendingControls,
                critical_controls: criticalControls,
                passed_critical: passedCritical,
                failed_critical: failedCritical,
                completion_percentage: Math.round(completionPercentage * 100.0d) / 100.0d,
                all_controls_passed: allControlsPassed,
                no_critical_failures: noCriticalFailures,
                can_proceed: canProceed
            ]
        }
    }
    
    /**
     * Validates all controls for a phase in bulk.
     * @param phaseId The UUID of the phase instance
     * @param validationData Map containing bulk validation info (status, it_validator, biz_validator)
     * @return Map containing validation results
     */
    def validateAllPhaseControls(UUID phaseId, Map validationData) {
        DatabaseUtil.withSql { sql ->
            try {
                def setClauses = []
                Map<String, Object> queryParams = [phaseId: phaseId]
                
                if (validationData.cti_status) {
                    // Handle status conversion if string provided
                    def statusId = validationData.cti_status
                    if (statusId instanceof String) {
                        def statusRow = sql.firstRow("""
                            SELECT sts_id FROM status_sts 
                            WHERE sts_name = :statusName AND sts_type = 'Control'
                        """, [statusName: statusId])
                        statusId = statusRow?.sts_id
                    }
                    
                    if (statusId) {
                        setClauses.add("cti_status = :cti_status")
                        queryParams.put("cti_status", statusId as Integer)
                        
                        // Check if this is a completion status
                        def statusName = sql.firstRow("""
                            SELECT sts_name FROM status_sts WHERE sts_id = :statusId
                        """, [statusId: statusId])?.sts_name
                        
                        if (statusName in ['PASSED', 'FAILED']) {
                            setClauses.add("cti_validated_at = CURRENT_TIMESTAMP")
                        }
                    }
                }
                
                if (validationData.usr_id_it_validator) {
                    setClauses.add("usr_id_it_validator = :usr_id_it_validator")
                    queryParams.put("usr_id_it_validator", validationData.usr_id_it_validator as Integer)
                }
                
                if (validationData.usr_id_biz_validator) {
                    setClauses.add("usr_id_biz_validator = :usr_id_biz_validator")
                    queryParams.put("usr_id_biz_validator", validationData.usr_id_biz_validator as Integer)
                }
                
                if (setClauses.isEmpty()) {
                    return [success: false, message: 'No validation data provided']
                }
                
                setClauses.add("updated_by = 'system'")
                setClauses.add("updated_at = CURRENT_TIMESTAMP")
                
                def updateQuery = "UPDATE controls_instance_cti SET ${setClauses.join(', ')} WHERE phi_id = :phaseId"
                def rowsUpdated = sql.executeUpdate(updateQuery, queryParams)
                
                return [
                    success: true,
                    controls_updated: rowsUpdated,
                    validation_status: validationData.cti_status,
                    phase_progress: calculatePhaseControlProgress(phaseId)
                ]
            } catch (Exception e) {
                return [success: false, message: e.message]
            }
        }
    }
    
    /**
     * Gets control validation history for audit trail.
     * @param controlId The UUID of the control instance
     * @return List of validation history records
     */
    def getControlValidationHistory(UUID controlId) {
        DatabaseUtil.withSql { sql ->
            // Note: This would typically query an audit table
            // For now, return the current validation state
            Map control = findControlInstanceById(controlId) as Map
            if (!control) {
                return []
            }
            
            return [
                [
                    cti_id: control['cti_id'],
                    action: 'VALIDATION',
                    status: control['cti_status'],
                    validated_at: control['cti_validated_at'],
                    it_validator: control['it_validator_name'],
                    biz_validator: control['biz_validator_name'],
                    updated_by: control['updated_by'],
                    updated_at: control['updated_at']
                ]
            ]
        }
    }
    
    /**
     * Finds only critical controls for a phase.
     * @param phaseId The UUID of the phase instance
     * @return List of critical control instances
     */
    def findCriticalControls(UUID phaseId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    cti.cti_id,
                    cti.phi_id,
                    cti.ctm_id,
                    cti.cti_status,
                    cti.cti_validated_at::text as cti_validated_at,
                    cti.usr_id_it_validator,
                    cti.usr_id_biz_validator,
                    cti.cti_order,
                    cti.cti_name,
                    cti.cti_description,
                    cti.cti_type,
                    cti.cti_is_critical,
                    cti.cti_code,
                    ctm.ctm_name as master_name,
                    ctm.ctm_description as master_description,
                    it_val.usr_full_name as it_validator_name,
                    biz_val.usr_full_name as biz_validator_name
                FROM controls_instance_cti cti
                JOIN controls_master_ctm ctm ON cti.ctm_id = ctm.ctm_id
                LEFT JOIN users_usr it_val ON cti.usr_id_it_validator = it_val.usr_id
                LEFT JOIN users_usr biz_val ON cti.usr_id_biz_validator = biz_val.usr_id
                WHERE cti.phi_id = :phaseId 
                  AND cti.cti_is_critical = true
                ORDER BY cti.cti_order
            """, [phaseId: phaseId])
        }
    }
    
    /**
     * Exports control report data with filtering options.
     * @param filters Map containing export filters (same as findControlInstances)
     * @return Map containing report data and metadata
     */
    def exportControlReport(Map filters) {
        DatabaseUtil.withSql { sql ->
            List<Map> controls = findControlInstances(filters) as List<Map>
            
            // Calculate summary statistics
            int totalControls = controls.size()
            int passedControls = controls.count { Map it -> it['cti_status'] == 'PASSED' } as int
            int failedControls = controls.count { Map it -> it['cti_status'] == 'FAILED' } as int
            int pendingControls = controls.count { Map it -> it['cti_status'] == 'PENDING' } as int
            int criticalControls = controls.count { Map it -> it['cti_is_critical'] } as int
            List<Map> failedCriticalControls = controls.findAll { Map it -> 
                it['cti_is_critical'] && it['cti_status'] == 'FAILED' 
            }
            
            // Group by phase for phase-level statistics
            Map phaseStats = [:]
            controls.groupBy { Map it -> it['phi_id'] }.each { phaseId, List<Map> phaseControls ->
                int phaseTotal = phaseControls.size()
                int phasePassed = phaseControls.count { Map it -> it['cti_status'] == 'PASSED' } as int
                double phaseCompletion = phaseTotal > 0 ? 
                    ((double) phasePassed / (double) phaseTotal) * 100.0d : 0.0d
                
                phaseStats[phaseId] = [
                    phase_name: phaseControls[0]['phi_name'],
                    total_controls: phaseTotal,
                    passed_controls: phasePassed,
                    completion_percentage: Math.round(phaseCompletion * 100.0d) / 100.0d
                ]
            }
            
            return [
                summary: [
                    total_controls: totalControls,
                    passed_controls: passedControls,
                    failed_controls: failedControls,
                    pending_controls: pendingControls,
                    critical_controls: criticalControls,
                    failed_critical_count: failedCriticalControls.size(),
                    overall_completion: totalControls > 0 ? 
                        Math.round(((double) passedControls / (double) totalControls) * 10000.0d) / 100.0d : 0.0d
                ],
                phase_statistics: phaseStats,
                failed_critical_controls: failedCriticalControls.collect { Map it -> 
                    [cti_id: it['cti_id'], cti_name: it['cti_name'], phi_name: it['phi_name']] 
                },
                control_details: controls,
                export_timestamp: new Date().format("yyyy-MM-dd HH:mm:ss"),
                filters_applied: filters
            ]
        }
    }
    
    // ==================== STATUS METADATA ENRICHMENT ====================
    
    /**
     * Enriches control instance data with status metadata while maintaining backward compatibility.
     * @param row Database row containing control instance and status data
     * @return Enhanced control instance map with statusMetadata
     */
    private Map enrichControlInstanceWithStatusMetadata(Map row) {
        return [
            cti_id: row.cti_id,
            phi_id: row.phi_id,
            ctm_id: row.ctm_id,
            cti_status: row.sts_name ?: 'UNKNOWN', // Backward compatibility - return status name as string
            cti_validated_at: row.cti_validated_at,
            usr_id_it_validator: row.usr_id_it_validator,
            usr_id_biz_validator: row.usr_id_biz_validator,
            cti_order: row.cti_order,
            cti_name: row.cti_name,
            cti_description: row.cti_description,
            cti_type: row.cti_type,
            cti_is_critical: row.cti_is_critical,
            cti_code: row.cti_code,
            created_by: row.created_by ?: null,
            created_at: row.created_at,
            updated_by: row.updated_by ?: null,
            updated_at: row.updated_at,
            master_name: row.master_name,
            master_description: row.master_description,
            master_order: row.master_order ?: null,
            master_type: row.master_type,
            master_is_critical: row.master_is_critical,
            master_code: row.master_code,
            phi_name: row.phi_name,
            phm_name: row.phm_name,
            sqi_name: row.sqi_name,
            sqm_name: row.sqm_name,
            pli_name: row.pli_name,
            plm_name: row.plm_name,
            tms_id: row.tms_id,
            tms_name: row.tms_name,
            itr_name: row.itr_name,
            mig_name: row.mig_name,
            it_validator_name: row.it_validator_name,
            biz_validator_name: row.biz_validator_name,
            // Enhanced status metadata (only when status data is available)
            statusMetadata: row.sts_id ? [
                id: row.sts_id,
                name: row.sts_name,
                color: row.sts_color,
                type: 'Control'
            ] : null
        ]
    }
    
    /**
     * Gets the default status ID for new control instances.
     * @param sql Active SQL connection
     * @return Integer status ID for 'TODO' Control status
     */
    private Integer getDefaultControlInstanceStatusId(groovy.sql.Sql sql) {
        Map defaultStatus = sql.firstRow("""
            SELECT sts_id 
            FROM status_sts 
            WHERE sts_name = 'TODO' AND sts_type = 'Control'
            LIMIT 1
        """) as Map
        
        // Fallback to any Control status if TODO not found
        if (!defaultStatus) {
            defaultStatus = sql.firstRow("""
                SELECT sts_id 
                FROM status_sts 
                WHERE sts_type = 'Control'
                LIMIT 1
            """) as Map
        }
        
        return (defaultStatus?.sts_id as Integer) ?: 1 // Ultimate fallback
    }
}