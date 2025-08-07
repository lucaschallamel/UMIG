package umig.repository

import umig.utils.DatabaseUtil
import java.util.UUID

/**
 * Repository class for managing Phases data.
 * Handles operations for both master phases (phases_master_phm) and phase instances (phases_instance_phi).
 * Following the canonical-first approach with consolidated operations.
 * Implements ordering logic, dependency management, hierarchical filtering, and control point validation.
 */
class PhaseRepository {

    // ==================== MASTER PHASE OPERATIONS ====================
    
    /**
     * Retrieves all master phases with sequence and plan information.
     * @return List of master phases with enriched data
     */
    def findAllMasterPhases() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    phm.phm_id, 
                    phm.sqm_id, 
                    phm.phm_order, 
                    phm.phm_name, 
                    phm.phm_description, 
                    phm.predecessor_phm_id,
                    phm.created_by,
                    phm.created_at,
                    phm.updated_by,
                    phm.updated_at,
                    sqm.sqm_name,
                    sqm.sqm_description as sequence_description,
                    sqm.plm_id,
                    plm.plm_name,
                    plm.plm_description as plan_description,
                    plm.tms_id,
                    tms.tms_name,
                    pred.phm_name as predecessor_name
                FROM phases_master_phm phm
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN phases_master_phm pred ON phm.predecessor_phm_id = pred.phm_id
                ORDER BY plm.plm_name, sqm.sqm_order, phm.phm_order
            """)
        }
    }
    
    /**
     * Finds master phases filtered by sequence ID.
     * @param sequenceId The UUID of the master sequence
     * @return List of phases belonging to the sequence
     */
    def findMasterPhasesBySequenceId(UUID sequenceId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT 
                    phm.phm_id, 
                    phm.sqm_id, 
                    phm.phm_order, 
                    phm.phm_name, 
                    phm.phm_description, 
                    phm.predecessor_phm_id,
                    phm.created_by,
                    phm.created_at,
                    phm.updated_by,
                    phm.updated_at,
                    sqm.sqm_name,
                    sqm.sqm_description as sequence_description,
                    pred.phm_name as predecessor_name
                FROM phases_master_phm phm
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                LEFT JOIN phases_master_phm pred ON phm.predecessor_phm_id = pred.phm_id
                WHERE phm.sqm_id = :sequenceId
                ORDER BY phm.phm_order
            """, [sequenceId: sequenceId])
        }
    }
    
    /**
     * Finds a specific master phase by ID.
     * @param phaseId The UUID of the master phase
     * @return Map containing phase details or null if not found
     */
    def findMasterPhaseById(UUID phaseId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT 
                    phm.phm_id, 
                    phm.sqm_id, 
                    phm.phm_order, 
                    phm.phm_name, 
                    phm.phm_description, 
                    phm.predecessor_phm_id,
                    phm.created_by,
                    phm.created_at,
                    phm.updated_by,
                    phm.updated_at,
                    sqm.sqm_name,
                    sqm.sqm_description as sequence_description,
                    sqm.plm_id,
                    plm.plm_name,
                    plm.plm_description as plan_description,
                    plm.tms_id,
                    tms.tms_name,
                    pred.phm_name as predecessor_name
                FROM phases_master_phm phm
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN phases_master_phm pred ON phm.predecessor_phm_id = pred.phm_id
                WHERE phm.phm_id = :phaseId
            """, [phaseId: phaseId])
        }
    }
    
    /**
     * Creates a new master phase.
     * @param phaseData Map containing phase data (sqm_id, phm_name, phm_description, phm_order, predecessor_phm_id)
     * @return Map containing the created phase or null on failure
     */
    def createMasterPhase(Map phaseData) {
        DatabaseUtil.withSql { sql ->
            try {
                // Validate sequence exists
                def sequenceExists = sql.firstRow(
                    'SELECT sqm_id FROM sequences_master_sqm WHERE sqm_id = :sequenceId', 
                    [sequenceId: phaseData.sqm_id]
                )
                if (!sequenceExists) {
                    return null
                }
                
                // Check for circular dependency if predecessor is specified
                if (phaseData.predecessor_phm_id) {
                    UUID sequenceId = phaseData.sqm_id as UUID
                    UUID predecessorId = phaseData.predecessor_phm_id as UUID
                    if (hasCircularDependency(sql, sequenceId, predecessorId, null)) {
                        throw new IllegalArgumentException("Circular dependency detected")
                    }
                }
                
                // Auto-assign order if not provided
                if (!phaseData.phm_order) {
                    def maxOrder = sql.firstRow("""
                        SELECT COALESCE(MAX(phm_order), 0) + 1 as next_order
                        FROM phases_master_phm 
                        WHERE sqm_id = :sequenceId
                    """, [sequenceId: phaseData.sqm_id])
                    phaseData.phm_order = maxOrder.next_order
                }
                
                // Check for order conflicts
                def orderConflict = sql.firstRow("""
                    SELECT phm_id FROM phases_master_phm 
                    WHERE sqm_id = :sequenceId AND phm_order = :order
                """, [sequenceId: phaseData.sqm_id, order: phaseData.phm_order])
                
                if (orderConflict) {
                    // Shift existing phases to make room
                    sql.executeUpdate("""
                        UPDATE phases_master_phm 
                        SET phm_order = phm_order + 1,
                            updated_by = 'system',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE sqm_id = :sequenceId AND phm_order >= :order
                    """, [sequenceId: phaseData.sqm_id, order: phaseData.phm_order])
                }
                
                def result = sql.firstRow("""
                    INSERT INTO phases_master_phm (
                        sqm_id, phm_order, phm_name, phm_description, predecessor_phm_id,
                        created_by, updated_by
                    ) VALUES (
                        :sqm_id, :phm_order, :phm_name, :phm_description, :predecessor_phm_id,
                        'system', 'system'
                    )
                    RETURNING phm_id
                """, phaseData)
                
                if (result?.phm_id) {
                    return findMasterPhaseById(result.phm_id as UUID)
                }
                return null
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Updates an existing master phase.
     * @param phaseId The UUID of the phase to update
     * @param phaseData Map containing fields to update
     * @return Map containing the updated phase or null if not found
     */
    def updateMasterPhase(UUID phaseId, Map phaseData) {
        DatabaseUtil.withSql { sql ->
            try {
                // Check if phase exists and get current data
                def currentPhase = sql.firstRow(
                    'SELECT sqm_id, predecessor_phm_id FROM phases_master_phm WHERE phm_id = :phaseId', 
                    [phaseId: phaseId]
                )
                if (!currentPhase) {
                    return null
                }
                
                // Check for circular dependency if predecessor is being updated
                if (phaseData.predecessor_phm_id && 
                    phaseData.predecessor_phm_id != currentPhase.predecessor_phm_id) {
                    UUID sequenceId = currentPhase.sqm_id as UUID
                    UUID predecessorId = phaseData.predecessor_phm_id as UUID
                    if (hasCircularDependency(sql, sequenceId, predecessorId, phaseId)) {
                        throw new IllegalArgumentException("Circular dependency detected")
                    }
                }
                
                // Build dynamic update query
                def setClauses = []
                def queryParams = [:]
                def updatableFields = ['phm_name', 'phm_description', 'predecessor_phm_id']
                
                phaseData.each { key, value ->
                    if (key in updatableFields) {
                        setClauses.add("${key} = :${key}")
                        queryParams[key] = value
                    }
                }
                
                if (setClauses.isEmpty()) {
                    return findMasterPhaseById(phaseId)
                }
                
                queryParams['phaseId'] = phaseId
                setClauses.add("updated_by = 'system'")
                setClauses.add("updated_at = CURRENT_TIMESTAMP")
                
                def updateQuery = "UPDATE phases_master_phm SET ${setClauses.join(', ')} WHERE phm_id = :phaseId"
                sql.executeUpdate(updateQuery, queryParams)
                
                return findMasterPhaseById(phaseId)
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Deletes a master phase by checking dependencies.
     * @param phaseId The UUID of the phase to delete
     * @return true if deleted successfully, false otherwise
     */
    def deleteMasterPhase(UUID phaseId) {
        DatabaseUtil.withSql { sql ->
            try {
                // Check if phase has instances
                def hasInstances = sql.firstRow("""
                    SELECT COUNT(*) as instance_count
                    FROM phases_instance_phi
                    WHERE phm_id = :phaseId
                """, [phaseId: phaseId])
                
                if ((hasInstances?.instance_count as Long ?: 0L) > 0) {
                    return false // Cannot delete phase with instances
                }
                
                // Check if phase is referenced as predecessor
                def hasReferences = sql.firstRow("""
                    SELECT COUNT(*) as ref_count
                    FROM phases_master_phm
                    WHERE predecessor_phm_id = :phaseId
                """, [phaseId: phaseId])
                
                if ((hasReferences?.ref_count as Long ?: 0L) > 0) {
                    return false // Cannot delete phase referenced by others
                }
                
                // Check if phase has steps
                def hasSteps = sql.firstRow("""
                    SELECT COUNT(*) as step_count
                    FROM steps_master_stm
                    WHERE phm_id = :phaseId
                """, [phaseId: phaseId])
                
                if ((hasSteps?.step_count as Long ?: 0L) > 0) {
                    return false // Cannot delete phase with steps
                }
                
                // Check if phase has controls
                def hasControls = sql.firstRow("""
                    SELECT COUNT(*) as control_count
                    FROM controls_master_ctm
                    WHERE phm_id = :phaseId
                """, [phaseId: phaseId])
                
                if ((hasControls?.control_count as Long ?: 0L) > 0) {
                    return false // Cannot delete phase with controls
                }
                
                def rowsDeleted = sql.executeUpdate("""
                    DELETE FROM phases_master_phm 
                    WHERE phm_id = :phaseId
                """, [phaseId: phaseId])
                
                return rowsDeleted > 0
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    // ==================== INSTANCE PHASE OPERATIONS ====================
    
    /**
     * Finds phase instances with hierarchical filtering.
     * @param filters Map containing optional filters (migrationId, iterationId, planInstanceId, sequenceInstanceId, teamId, statusId)
     * @return List of phase instances with enriched data
     */
    def findPhaseInstances(Map filters) {
        DatabaseUtil.withSql { sql ->
            // Simplified query to avoid hstore issues
            def query = """
                SELECT 
                    phi.phi_id,
                    phi.sqi_id,
                    phi.phm_id,
                    phi.phi_status,
                    COALESCE(phi.phi_start_time::text, '') as phi_start_time,
                    COALESCE(phi.phi_end_time::text, '') as phi_end_time,
                    phi.phi_order,
                    phi.phi_name,
                    phi.phi_description,
                    phi.predecessor_phi_id,
                    phi.created_at::text as created_at,
                    phi.updated_at::text as updated_at
                FROM phases_instance_phi phi
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
            
            if (filters.sequenceInstanceId) {
                query += ' AND phi.sqi_id = :sequenceInstanceId'
                params.sequenceInstanceId = UUID.fromString(filters.sequenceInstanceId as String)
            }
            
            if (filters.teamId) {
                query += ' AND plm.tms_id = :teamId'
                params.teamId = Integer.parseInt(filters.teamId as String)
            }
            
            if (filters.statusId) {
                query += ' AND sts.sts_id = :statusId'
                params.statusId = Integer.parseInt(filters.statusId as String)
            }
            
            query += ' ORDER BY phi.phi_order, phi.created_at'
            
            return sql.rows(query, params)
        }
    }
    
    /**
     * Finds a specific phase instance by ID with full details.
     * @param instanceId The UUID of the phase instance
     * @return Map containing instance details or null if not found
     */
    def findPhaseInstanceById(UUID instanceId) {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                SELECT 
                    phi.phi_id,
                    phi.sqi_id,
                    phi.phm_id,
                    phi.phi_status,
                    phi.phi_start_time::text as phi_start_time,
                    phi.phi_end_time::text as phi_end_time,
                    phi.phi_order,
                    phi.phi_name,
                    phi.phi_description,
                    phi.predecessor_phi_id,
                    phi.created_by,
                    phi.created_at::text as created_at,
                    phi.updated_by,
                    phi.updated_at::text as updated_at,
                    phm.phm_name as master_name,
                    phm.phm_description as master_description,
                    phm.phm_order as master_order,
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
                    pred.phi_name as predecessor_name
                FROM phases_instance_phi phi
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite itr ON pli.ite_id = itr.ite_id
                JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
                LEFT JOIN teams_tms tms ON plm.tms_id = tms.tms_id
                LEFT JOIN status_sts sts ON phi.phi_status = sts.sts_id
                LEFT JOIN phases_instance_phi pred ON phi.predecessor_phi_id = pred.phi_id
                WHERE phi.phi_id = :instanceId
            """, [instanceId: instanceId])
            
            return result ? enrichPhaseInstanceWithStatusMetadata(result) : null
        }
    }
    
    /**
     * Creates phase instances from all master phases in a sequence.
     * Implements full attribute instantiation (ADR-029).
     * @param masterPhaseId The UUID of the master phase
     * @param sequenceInstanceId The UUID of the sequence instance
     * @param overrides Map containing optional override values
     * @return Map containing the created phase instance
     */
    def createPhaseInstance(UUID masterPhaseId, UUID sequenceInstanceId, Map overrides = [:]) {
        DatabaseUtil.withSql { sql ->
            try {
                sql.withTransaction {
                    // Verify sequence instance exists
                    def sequenceInstance = sql.firstRow("""
                        SELECT sqi_id FROM sequences_instance_sqi 
                        WHERE sqi_id = :sequenceInstanceId
                    """, [sequenceInstanceId: sequenceInstanceId])
                    
                    if (!sequenceInstance) {
                        return null
                    }
                    
                    // Get master phase data
                    def masterPhase = sql.firstRow("""
                        SELECT phm_id, phm_name, phm_description, phm_order, predecessor_phm_id
                        FROM phases_master_phm 
                        WHERE phm_id = :masterPhaseId
                    """, [masterPhaseId: masterPhaseId])
                    
                    if (!masterPhase) {
                        return null
                    }
                    
                    // Handle predecessor mapping if exists
                    UUID predecessorInstanceId = null
                    if (masterPhase.predecessor_phm_id && !overrides.predecessor_phi_id) {
                        // Try to find corresponding predecessor instance
                        def predecessorInstance = sql.firstRow("""
                            SELECT phi.phi_id
                            FROM phases_instance_phi phi
                            WHERE phi.phm_id = :predecessorMasterId 
                                AND phi.sqi_id = :sequenceInstanceId
                        """, [
                            predecessorMasterId: masterPhase.predecessor_phm_id,
                            sequenceInstanceId: sequenceInstanceId
                        ])
                        predecessorInstanceId = predecessorInstance?.phi_id as UUID
                    }
                    
                    def instanceData = [
                        sqi_id: sequenceInstanceId,
                        phm_id: masterPhaseId,
                        phi_status: overrides.phi_status ?: 'PLANNING',
                        phi_name: overrides.phi_name ?: masterPhase.phm_name,
                        phi_description: overrides.phi_description ?: masterPhase.phm_description,
                        phi_order: overrides.phi_order ?: masterPhase.phm_order,
                        predecessor_phi_id: overrides.predecessor_phi_id ?: predecessorInstanceId
                    ]
                    
                    def result = sql.firstRow("""
                        INSERT INTO phases_instance_phi (
                            sqi_id, phm_id, phi_status, phi_name, phi_description, 
                            phi_order, predecessor_phi_id, created_by, updated_by
                        ) VALUES (
                            :sqi_id, :phm_id, :phi_status, :phi_name, :phi_description,
                            :phi_order, :predecessor_phi_id, 'system', 'system'
                        )
                        RETURNING phi_id
                    """, instanceData)
                    
                    if (result?.phi_id) {
                        return findPhaseInstanceById(result.phi_id as UUID)
                    }
                    return null
                }
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Updates a phase instance.
     * @param instanceId The UUID of the instance to update
     * @param updates Map containing fields to update
     * @return Map containing the updated instance or null if not found
     */
    def updatePhaseInstance(UUID instanceId, Map updates) {
        DatabaseUtil.withSql { sql ->
            try {
                // Check if instance exists
                if (!sql.firstRow('SELECT phi_id FROM phases_instance_phi WHERE phi_id = :instanceId', [instanceId: instanceId])) {
                    return null
                }
                
                // Build dynamic update query
                def setClauses = []
                def queryParams = [:]
                def updatableFields = ['phi_name', 'phi_description', 'phi_status', 'phi_order', 'predecessor_phi_id', 'phi_start_time', 'phi_end_time']
                
                updates.each { key, value ->
                    if (key in updatableFields) {
                        setClauses.add("${key} = :${key}")
                        queryParams[key] = value
                    }
                }
                
                if (setClauses.isEmpty()) {
                    return findPhaseInstanceById(instanceId)
                }
                
                queryParams['instanceId'] = instanceId
                setClauses.add("updated_by = 'system'")
                setClauses.add("updated_at = CURRENT_TIMESTAMP")
                
                def updateQuery = "UPDATE phases_instance_phi SET ${setClauses.join(', ')} WHERE phi_id = :instanceId"
                sql.executeUpdate(updateQuery, queryParams)
                
                return findPhaseInstanceById(instanceId)
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Deletes a phase instance.
     * @param instanceId The UUID of the instance to delete
     * @return true if deleted successfully, false otherwise
     */
    def deletePhaseInstance(UUID instanceId) {
        DatabaseUtil.withSql { sql ->
            try {
                // Check if phase has step instances
                def hasSteps = sql.firstRow("""
                    SELECT COUNT(*) as step_count
                    FROM steps_instance_sti
                    WHERE phi_id = :instanceId
                """, [instanceId: instanceId])
                
                if ((hasSteps?.step_count as Long ?: 0L) > 0) {
                    return false // Cannot delete phase with steps
                }
                
                def rowsDeleted = sql.executeUpdate("""
                    DELETE FROM phases_instance_phi 
                    WHERE phi_id = :instanceId
                """, [instanceId: instanceId])
                
                return rowsDeleted > 0
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    // ==================== CONTROL POINT OPERATIONS ====================
    
    /**
     * Finds control points for a phase.
     * @param phaseId The UUID of the phase (master or instance)
     * @return List of control points
     */
    def findControlPoints(UUID phaseId) {
        DatabaseUtil.withSql { sql ->
            // First check if it's a master phase
            def isMasterPhase = sql.firstRow("""
                SELECT phm_id FROM phases_master_phm WHERE phm_id = :phaseId
            """, [phaseId: phaseId])
            
            if (isMasterPhase) {
                // Return master controls for master phase
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
                        'master' as control_type
                    FROM controls_master_ctm ctm
                    WHERE ctm.phm_id = :phaseId
                    ORDER BY ctm.ctm_order
                """, [phaseId: phaseId])
            } else {
                // Check if it's a phase instance and return control instances
                def isInstancePhase = sql.firstRow("""
                    SELECT phi_id FROM phases_instance_phi WHERE phi_id = :phaseId
                """, [phaseId: phaseId])
                
                if (isInstancePhase) {
                    return sql.rows("""
                        SELECT 
                            cti.cti_id,
                            cti.sti_id,
                            cti.ctm_id,
                            cti.cti_status,
                            cti.cti_validated_at,
                            cti.usr_id_it_validator,
                            cti.usr_id_biz_validator,
                            cti.cti_order,
                            cti.cti_name,
                            cti.cti_description,
                            cti.cti_type,
                            cti.cti_is_critical,
                            cti.cti_code,
                            ctm.ctm_name as master_name,
                            'instance' as control_type
                        FROM controls_instance_cti cti
                        JOIN controls_master_ctm ctm ON cti.ctm_id = ctm.ctm_id
                        JOIN steps_instance_sti sti ON cti.sti_id = sti.sti_id
                        WHERE sti.phi_id = :phaseId
                        ORDER BY cti.cti_order
                    """, [phaseId: phaseId])
                }
            }
            
            return []
        }
    }
    
    /**
     * Validates control points for a phase.
     * @param phaseId The UUID of the phase instance
     * @return Map containing validation results
     */
    def validateControlPoints(UUID phaseId) {
        DatabaseUtil.withSql { sql ->
            def controls = sql.rows("""
                SELECT 
                    cti.cti_id,
                    cti.cti_status,
                    cti.cti_is_critical,
                    cti.cti_name
                FROM controls_instance_cti cti
                JOIN controls_master_ctm ctm ON cti.ctm_id = ctm.ctm_id
                JOIN steps_instance_sti sti ON cti.sti_id = sti.sti_id
                WHERE sti.phi_id = :phaseId
            """, [phaseId: phaseId])
            
            def totalControls = controls.size()
            def passedControls = controls.count { it.cti_status == 'PASSED' }
            def failedControls = controls.count { it.cti_status == 'FAILED' }
            def pendingControls = controls.count { it.cti_status == 'PENDING' }
            def criticalControls = controls.findAll { it.cti_is_critical }
            def failedCriticalControls = criticalControls.findAll { it.cti_status == 'FAILED' }
            
            def allControlsPassed = (passedControls == totalControls)
            def noCriticalFailures = (failedCriticalControls.size() == 0)
            def canProceed = allControlsPassed && noCriticalFailures
            
            return [
                total_controls: totalControls,
                passed_controls: passedControls,
                failed_controls: failedControls,
                pending_controls: pendingControls,
                critical_controls: criticalControls.size(),
                failed_critical_controls: failedCriticalControls.size(),
                all_controls_passed: allControlsPassed,
                no_critical_failures: noCriticalFailures,
                can_proceed: canProceed,
                failed_critical_names: failedCriticalControls.collect { it.cti_name }
            ]
        }
    }
    
    /**
     * Updates a control point status.
     * @param controlId The UUID of the control instance
     * @param status Map containing status update (cti_status, usr_id_it_validator, usr_id_biz_validator)
     * @return true if updated successfully, false otherwise
     */
    def updateControlPoint(UUID controlId, Map status) {
        DatabaseUtil.withSql { sql ->
            try {
                def setClauses = []
                Map<String, Object> queryParams = [controlId: controlId]
                
                if (status.cti_status) {
                    setClauses.add("cti_status = :cti_status")
                    queryParams.put("cti_status", status.cti_status as String)
                    
                    if (status.cti_status in ['PASSED', 'FAILED']) {
                        setClauses.add("cti_validated_at = CURRENT_TIMESTAMP")
                    }
                }
                
                if (status.usr_id_it_validator) {
                    setClauses.add("usr_id_it_validator = :usr_id_it_validator")
                    queryParams.put("usr_id_it_validator", status.usr_id_it_validator as Integer)
                }
                
                if (status.usr_id_biz_validator) {
                    setClauses.add("usr_id_biz_validator = :usr_id_biz_validator")
                    queryParams.put("usr_id_biz_validator", status.usr_id_biz_validator as Integer)
                }
                
                if (setClauses.isEmpty()) {
                    return false
                }
                
                setClauses.add("updated_by = 'system'")
                setClauses.add("updated_at = CURRENT_TIMESTAMP")
                
                def updateQuery = "UPDATE controls_instance_cti SET ${setClauses.join(', ')} WHERE cti_id = :controlId"
                def rowsUpdated = sql.executeUpdate(updateQuery, queryParams)
                
                return rowsUpdated > 0
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Overrides a control point with reason and approver.
     * Note: The actual override fields would need to be added to the schema
     * @param controlId The UUID of the control instance
     * @param reason The override reason
     * @param overrideBy The user performing the override
     * @return true if overridden successfully, false otherwise
     */
    def overrideControl(UUID controlId, String reason, String overrideBy) {
        DatabaseUtil.withSql { sql ->
            try {
                // Note: This assumes override fields exist in the schema
                // If not, this would need to be implemented via a separate override table
                def rowsUpdated = sql.executeUpdate("""
                    UPDATE controls_instance_cti 
                    SET cti_status = 'PASSED',
                        cti_validated_at = CURRENT_TIMESTAMP,
                        updated_by = :overrideBy,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE cti_id = :controlId
                """, [controlId: controlId, overrideBy: overrideBy])
                
                // Log the override action (would typically go to an audit table)
                // For now, we'll just return success/failure
                return rowsUpdated > 0
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    // ==================== ORDERING OPERATIONS ====================
    
    /**
     * Reorders master phases within a sequence.
     * @param sequenceId The UUID of the sequence
     * @param phaseOrderMap Map of phase UUID to new order position
     * @return true if reordered successfully, false otherwise
     */
    def reorderMasterPhases(UUID sequenceId, Map<UUID, Integer> phaseOrderMap) {
        DatabaseUtil.withSql { sql ->
            try {
                sql.withTransaction {
                    phaseOrderMap.each { phaseId, newOrder ->
                        sql.executeUpdate("""
                            UPDATE phases_master_phm 
                            SET phm_order = :newOrder,
                                updated_by = 'system',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE phm_id = :phaseId AND sqm_id = :sequenceId
                        """, [phaseId: phaseId, newOrder: newOrder, sequenceId: sequenceId])
                    }
                    return true
                }
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Reorders phase instances within a sequence instance.
     * @param sequenceInstanceId The UUID of the sequence instance
     * @param phaseOrderMap Map of phase instance UUID to new order position
     * @return true if reordered successfully, false otherwise
     */
    def reorderPhaseInstances(UUID sequenceInstanceId, Map<UUID, Integer> phaseOrderMap) {
        DatabaseUtil.withSql { sql ->
            try {
                sql.withTransaction {
                    phaseOrderMap.each { phaseId, newOrder ->
                        sql.executeUpdate("""
                            UPDATE phases_instance_phi 
                            SET phi_order = :newOrder,
                                updated_by = 'system',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE phi_id = :phaseId AND sqi_id = :sequenceInstanceId
                        """, [phaseId: phaseId, newOrder: newOrder, sequenceInstanceId: sequenceInstanceId])
                    }
                    return true
                }
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Updates the order of a master phase.
     * @param phaseId The UUID of the phase
     * @param newOrder The new order number
     * @return true if updated successfully, false otherwise
     */
    def updateMasterPhaseOrder(UUID phaseId, Integer newOrder) {
        DatabaseUtil.withSql { sql ->
            try {
                def rowsUpdated = sql.executeUpdate("""
                    UPDATE phases_master_phm 
                    SET phm_order = :newOrder,
                        updated_by = 'system',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE phm_id = :phaseId
                """, [phaseId: phaseId, newOrder: newOrder])
                
                return rowsUpdated > 0
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Updates the order of a phase instance.
     * @param phaseId The UUID of the phase instance
     * @param newOrder The new order number
     * @return true if updated successfully, false otherwise
     */
    def updatePhaseInstanceOrder(UUID phaseId, Integer newOrder) {
        DatabaseUtil.withSql { sql ->
            try {
                def rowsUpdated = sql.executeUpdate("""
                    UPDATE phases_instance_phi 
                    SET phi_order = :newOrder,
                        updated_by = 'system',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE phi_id = :phaseId
                """, [phaseId: phaseId, newOrder: newOrder])
                
                return rowsUpdated > 0
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    /**
     * Normalizes phase ordering to eliminate gaps and ensure consecutive numbering.
     * @param sequenceId The UUID of the sequence (master or instance)
     * @return true if normalized successfully, false otherwise
     */
    def normalizePhaseOrder(UUID sequenceId) {
        DatabaseUtil.withSql { sql ->
            try {
                // Check if it's a master sequence
                def isMasterSequence = sql.firstRow("""
                    SELECT sqm_id FROM sequences_master_sqm WHERE sqm_id = :sequenceId
                """, [sequenceId: sequenceId])
                
                if (isMasterSequence) {
                    // Normalize master phases
                    def phases = sql.rows("""
                        SELECT phm_id
                        FROM phases_master_phm
                        WHERE sqm_id = :sequenceId
                        ORDER BY phm_order, created_at
                    """, [sequenceId: sequenceId])
                    
                    phases.eachWithIndex { phase, index ->
                        Integer newOrder = index + 1
                        sql.executeUpdate("""
                            UPDATE phases_master_phm
                            SET phm_order = :newOrder,
                                updated_by = 'system',
                                updated_at = CURRENT_TIMESTAMP
                            WHERE phm_id = :phaseId
                        """, [newOrder: newOrder, phaseId: phase.phm_id])
                    }
                } else {
                    // Check if it's a sequence instance
                    def isInstanceSequence = sql.firstRow("""
                        SELECT sqi_id FROM sequences_instance_sqi WHERE sqi_id = :sequenceId
                    """, [sequenceId: sequenceId])
                    
                    if (isInstanceSequence) {
                        // Normalize instance phases
                        def phases = sql.rows("""
                            SELECT phi_id
                            FROM phases_instance_phi
                            WHERE sqi_id = :sequenceId
                            ORDER BY phi_order, created_at
                        """, [sequenceId: sequenceId])
                        
                        phases.eachWithIndex { phase, index ->
                            Integer newOrder = index + 1
                            sql.executeUpdate("""
                                UPDATE phases_instance_phi
                                SET phi_order = :newOrder,
                                    updated_by = 'system',
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE phi_id = :phaseId
                            """, [newOrder: newOrder, phaseId: phase.phi_id])
                        }
                    }
                }
                
                return true
            } catch (Exception e) {
                throw e
            }
        }
    }
    
    // ==================== PROGRESS OPERATIONS ====================
    
    /**
     * Calculates progress for a phase based on step completion.
     * @param phaseId The UUID of the phase instance
     * @return Double representing completion percentage (0.0 to 100.0)
     */
    def calculatePhaseProgress(UUID phaseId) {
        DatabaseUtil.withSql { sql ->
            def stats = sql.firstRow("""
                SELECT 
                    COUNT(*) as total_steps,
                    COUNT(CASE WHEN sti.sti_status = 'COMPLETED' THEN 1 END) as completed_steps,
                    COUNT(CASE WHEN sti.sti_status = 'SKIPPED' THEN 1 END) as skipped_steps
                FROM steps_instance_sti sti
                WHERE sti.phi_id = :phaseId
            """, [phaseId: phaseId])
            
            def totalSteps = stats.total_steps as Integer ?: 0
            def completedSteps = stats.completed_steps as Integer ?: 0
            def skippedSteps = stats.skipped_steps as Integer ?: 0
            
            if (totalSteps == 0) {
                return 0.0
            }
            
            // Include skipped steps as "completed" for progress calculation
            def effectivelyCompleted = completedSteps + skippedSteps
            double progressPercentage = (effectivelyCompleted.doubleValue() / totalSteps.doubleValue()) * 100.0d
            
            return Math.round(progressPercentage * 100.0d) / 100.0d // Round to 2 decimal places
        }
    }
    
    // ==================== UTILITY OPERATIONS ====================
    
    /**
     * Checks for circular dependencies in phase predecessors.
     * @param sql Database connection
     * @param sequenceId The UUID of the sequence
     * @param candidatePredecessorId The UUID of the proposed predecessor
     * @param targetPhaseId The UUID of the phase being updated (null for new phases)
     * @return true if circular dependency would be created
     */
    def hasCircularDependency(groovy.sql.Sql sql, UUID sequenceId, UUID candidatePredecessorId, UUID targetPhaseId = null) {
        // Use recursive CTE to detect cycles
        def result = sql.firstRow("""
            WITH RECURSIVE dependency_chain AS (
                -- Base case: start from the candidate predecessor
                SELECT phm_id, predecessor_phm_id, 1 as depth, ARRAY[phm_id] as path
                FROM phases_master_phm 
                WHERE phm_id = :candidatePredecessorId AND sqm_id = :sequenceId
                
                UNION ALL
                
                -- Recursive case: follow the predecessor chain
                SELECT p.phm_id, p.predecessor_phm_id, dc.depth + 1, dc.path || p.phm_id
                FROM phases_master_phm p
                JOIN dependency_chain dc ON p.phm_id = dc.predecessor_phm_id
                WHERE p.phm_id != ALL(dc.path) AND dc.depth < 100 -- Prevent infinite loops
            )
            SELECT EXISTS (
                SELECT 1 FROM dependency_chain 
                WHERE :targetPhaseId = ANY(path)
            ) as has_cycle
        """, [
            candidatePredecessorId: candidatePredecessorId,
            sequenceId: sequenceId,
            targetPhaseId: targetPhaseId
        ])
        
        return result?.getAt('has_cycle') ?: false
    }
    
    /**
     * Checks if a master phase has any instances.
     * @param masterPhaseId The UUID of the master phase
     * @return true if instances exist, false otherwise
     */
    def hasPhaseInstances(UUID masterPhaseId) {
        DatabaseUtil.withSql { sql ->
            def count = sql.firstRow("""
                SELECT COUNT(*) as instance_count
                FROM phases_instance_phi
                WHERE phm_id = :masterPhaseId
            """, [masterPhaseId: masterPhaseId])
            
            return (count?.instance_count as Long ?: 0L) > 0
        }
    }
    
    /**
     * Gets phase statistics for a sequence.
     * @param sequenceId The UUID of the sequence (master or instance)
     * @return Map containing phase statistics
     */
    def getPhaseStatistics(UUID sequenceId) {
        DatabaseUtil.withSql { sql ->
            // Check if it's a master sequence
            def isMasterSequence = sql.firstRow("""
                SELECT sqm_id FROM sequences_master_sqm WHERE sqm_id = :sequenceId
            """, [sequenceId: sequenceId])
            
            if (isMasterSequence) {
                def stats = sql.firstRow("""
                    SELECT 
                        COUNT(*) as total_phases,
                        MIN(created_at) as first_created,
                        MAX(updated_at) as last_updated
                    FROM phases_master_phm
                    WHERE sqm_id = :sequenceId
                """, [sequenceId: sequenceId])
                
                return [
                    total_phases: stats.total_phases,
                    first_created: stats.first_created,
                    last_updated: stats.last_updated,
                    sequence_type: 'master'
                ]
            } else {
                // Check if it's a sequence instance
                def isInstanceSequence = sql.firstRow("""
                    SELECT sqi_id FROM sequences_instance_sqi WHERE sqi_id = :sequenceId
                """, [sequenceId: sequenceId])
                
                if (isInstanceSequence) {
                    def stats = sql.firstRow("""
                        SELECT 
                            COUNT(*) as total_phases,
                            COUNT(CASE WHEN phi_status = 'PLANNING' THEN 1 END) as planning,
                            COUNT(CASE WHEN phi_status = 'IN_PROGRESS' THEN 1 END) as in_progress,
                            COUNT(CASE WHEN phi_status = 'COMPLETED' THEN 1 END) as completed,
                            MIN(created_at) as first_created,
                            MAX(updated_at) as last_updated
                        FROM phases_instance_phi
                        WHERE sqi_id = :sequenceId
                    """, [sequenceId: sequenceId])
                    
                    def completionRate = 0.0
                    if ((stats.total_phases as Integer) > 0) {
                        completionRate = ((stats.completed as Double) / (stats.total_phases as Double)) * 100.0
                    }
                    
                    return [
                        total_phases: stats.total_phases,
                        planning: stats.planning,
                        in_progress: stats.in_progress,
                        completed: stats.completed,
                        completion_rate: completionRate,
                        first_created: stats.first_created,
                        last_updated: stats.last_updated,
                        sequence_type: 'instance'
                    ]
                }
            }
            
            return [:]
        }
    }
    
    // ==================== STATUS METADATA ENRICHMENT ====================
    
    /**
     * Enriches phase instance data with status metadata while maintaining backward compatibility.
     * @param row Database row containing phase instance and status data
     * @return Enhanced phase instance map with statusMetadata
     */
    private Map enrichPhaseInstanceWithStatusMetadata(Map row) {
        return [
            phi_id: row.phi_id,
            sqi_id: row.sqi_id,
            phm_id: row.phm_id,
            phi_status: row.sts_name ?: 'UNKNOWN', // Backward compatibility - return status name as string
            phi_start_time: row.phi_start_time,
            phi_end_time: row.phi_end_time,
            phi_name: row.phi_name,
            phi_description: row.phi_description,
            phi_order: row.phi_order,
            predecessor_phi_id: row.predecessor_phi_id,
            created_by: row.created_by ?: null,
            created_at: row.created_at,
            updated_by: row.updated_by ?: null,
            updated_at: row.updated_at,
            // Master phase details
            master_name: row.master_name ?: null,
            master_description: row.master_description ?: null,
            master_order: row.master_order ?: null,
            // Sequence and plan hierarchy
            sqi_name: row.sqi_name ?: null,
            sqm_name: row.sqm_name ?: null,
            plm_name: row.plm_name ?: null,
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
     * Gets the default status ID for new phase instances.
     * @param sql Active SQL connection
     * @return Integer status ID for 'PLANNING' Phase status
     */
    private Integer getDefaultPhaseInstanceStatusId(groovy.sql.Sql sql) {
        Map defaultStatus = sql.firstRow("""
            SELECT sts_id 
            FROM status_sts 
            WHERE sts_name = 'PLANNING' AND sts_type = 'Phase'
            LIMIT 1
        """) as Map
        
        // Fallback to any Phase status if PLANNING not found
        if (!defaultStatus) {
            defaultStatus = sql.firstRow("""
                SELECT sts_id 
                FROM status_sts 
                WHERE sts_type = 'Phase'
                LIMIT 1
            """) as Map
        }
        
        return (defaultStatus?.sts_id as Integer) ?: 1 // Ultimate fallback
    }
}