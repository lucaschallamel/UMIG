package umig.repository

import umig.utils.DatabaseUtil
import umig.utils.AuthenticationService
// Note: Email notifications now handled by StepNotificationIntegration
// Note: Audit logging is temporarily disabled
import umig.repository.InstructionRepository
// import umig.repository.AuditLogRepository      // Temporarily disabled
import java.util.UUID
import groovy.sql.Sql
import groovy.sql.GroovyRowResult
import groovy.transform.CompileStatic

/**
 * Repository for STEP master and instance data, including impacted teams and iteration scopes.
 * 
 * NOTIFICATION HANDLING:
 * This repository now focuses solely on database operations. Email notifications
 * are handled by StepNotificationIntegration which provides enhanced notification
 * capabilities with URL generation and improved templates.
 * 
 * Methods with "WithNotification" suffix are deprecated and maintained for backward
 * compatibility only. Use the corresponding methods without the suffix for database
 * operations and let the calling layer handle notifications through StepNotificationIntegration.
 */
@CompileStatic
class StepRepository {
    
    private InstructionRepository instructionRepository = new InstructionRepository()
    
    /**
     * Fetches master STEP data by code and number.
     */
    GroovyRowResult findStepMaster(String sttCode, Integer stmNumber) {
        return DatabaseUtil.withSql { Sql sql ->
            return sql.firstRow('''
                SELECT stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name, stm.stm_description
                FROM steps_master_stm stm
                WHERE stm.stt_code = :sttCode AND stm.stm_number = :stmNumber
            ''', [sttCode: sttCode, stmNumber: stmNumber])
        } as GroovyRowResult
    }

    /**
     * Fetches all impacted team IDs for a STEP (from join table).
     */
    List<Integer> findImpactedTeamIds(UUID stmId) {
        return DatabaseUtil.withSql { Sql sql ->
            def results = sql.rows('''
                SELECT tms_id
                FROM steps_master_stm_x_teams_tms_impacted
                WHERE stm_id = :stmId
            ''', [stmId: stmId])
            return results.collect { GroovyRowResult row -> row['tms_id'] as Integer }
        } as List<Integer>
    }

    /**
     * Fetches all iteration types for a STEP (from join table).
     */
    List<Integer> findIterationScopes(String sttCode, Integer stmNumber) {
        return DatabaseUtil.withSql { Sql sql ->
            def results = sql.rows('''
                SELECT itt_id
                FROM steps_master_stm_x_iteration_types_itt
                WHERE stt_code = :sttCode AND stm_number = :stmNumber
            ''', [sttCode: sttCode, stmNumber: stmNumber])
            return results.collect { GroovyRowResult row -> row['itt_id'] as Integer }
        } as List<Integer>
    }

    /**
     * Fetches all master steps with basic information for dropdowns
     * @return List of master steps with id, code, number, name, and type
     */
    List<GroovyRowResult> findAllMasterSteps() {
        return DatabaseUtil.withSql { Sql sql ->
            return sql.rows('''
                SELECT 
                    stm.stm_id,
                    stm.stt_code,
                    stm.stm_number,
                    stm.stm_name,
                    stm.stm_description,
                    stt.stt_name
                FROM steps_master_stm stm
                JOIN step_types_stt stt ON stm.stt_code = stt.stt_code
                ORDER BY stm.stt_code, stm.stm_number
            ''')
        } as List<GroovyRowResult>
    }

    /**
     * Finds master steps with pagination, sorting, and filtering for Admin GUI
     * @param filters Map of filter parameters
     * @param pageNumber Page number (1-based)
     * @param pageSize Number of items per page
     * @param sortField Field to sort by
     * @param sortDirection Sort direction (asc/desc)
     * @return Map with data, pagination info, and filters
     */
    Map<String, Object> findMasterStepsWithFilters(Map<String, Object> filters, int pageNumber = 1, int pageSize = 50, String sortField = null, String sortDirection = 'asc') {
        return DatabaseUtil.withSql { Sql sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            def whereConditions = [] as List<String>
            def params = [] as List<Object>
            
            // Build dynamic WHERE clause
            // Note: Status filtering removed for master steps as they don't have status
            // Status is only available for step instances (steps_instance_sti)
            
            // Owner ID filtering (phases own steps via phm_id)
            if (filters.ownerId) {
                whereConditions.add("stm.phm_id = ?")
                params.add(UUID.fromString(filters.ownerId as String))
            }
            
            // Search functionality
            if (filters.search) {
                whereConditions.add("(stm.stm_name ILIKE ? OR stm.stm_description ILIKE ?)")
                params.add("%${filters.search}%".toString())
                params.add("%${filters.search}%".toString())
            }
            
            def whereClause = whereConditions ? "WHERE " + whereConditions.join(" AND ") : ""
            
            // Count query with JOINs for hierarchy information
            def countQuery = """
                SELECT COUNT(DISTINCT stm.stm_id) as total
                FROM steps_master_stm stm
                JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                ${whereClause}
            """
            def totalCount = (sql.firstRow(countQuery, params)?.total as Integer) ?: 0
            
            // Validate sort field (removed stm_status as master steps don't have status)
            def allowedSortFields = ['stm_id', 'stm_name', 'stm_number', 'stm_description', 'instruction_count', 'instance_count', 'plm_name', 'sqm_name', 'phm_name', 'team_name', 'step_code', 'environment_role_name', 'predecessor_name']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'stm_name'
            }
            sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
            
            // Data query with computed fields and hierarchy information
            def offset = (pageNumber - 1) * pageSize
            def dataQuery = """
                SELECT DISTINCT stm.*,
                       phm.phm_name,
                       sqm.sqm_name,
                       plm.plm_name,
                       tms.tms_name as team_name,
                       CONCAT(stm.stt_code, '-', LPAD(stm.stm_number::text, 4, '0')) as step_code,
                       enr.enr_name as environment_role_name,
                       pred.stm_name as predecessor_name,
                       CONCAT(pred.stt_code, '-', LPAD(pred.stm_number::text, 4, '0')) as predecessor_code,
                       COALESCE(instruction_counts.instruction_count, 0) as instruction_count,
                       COALESCE(instance_counts.instance_count, 0) as instance_count
                FROM steps_master_stm stm
                JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                LEFT JOIN environment_roles_enr enr ON stm.enr_id_target = enr.enr_id
                LEFT JOIN steps_master_stm pred ON stm.stm_id_predecessor = pred.stm_id
                LEFT JOIN (
                    SELECT stm_id, COUNT(*) as instruction_count
                    FROM instructions_master_inm
                    GROUP BY stm_id
                ) instruction_counts ON stm.stm_id = instruction_counts.stm_id
                LEFT JOIN (
                    SELECT stm_id, COUNT(*) as instance_count
                    FROM steps_instance_sti
                    GROUP BY stm_id
                ) instance_counts ON stm.stm_id = instance_counts.stm_id
                ${whereClause}
                ORDER BY ${['instruction_count', 'instance_count', 'team_name', 'step_code', 'environment_role_name', 'predecessor_name'].contains(sortField) ? sortField : (['plm_name', 'sqm_name', 'phm_name'].contains(sortField) ? sortField : 'stm.' + sortField)} ${sortDirection}
                LIMIT ${pageSize} OFFSET ${offset}
            """
            
            def steps = sql.rows(dataQuery, params) as List<GroovyRowResult>
            def enrichedSteps = steps.collect { GroovyRowResult it -> enrichMasterStepWithStatusMetadata(it as Map<String, Object>) }
            
            return [
                data: enrichedSteps,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: (int) Math.ceil((double) totalCount / (double) pageSize)
                ],
                filters: filters
            ] as Map<String, Object>
        } as Map<String, Object>
    }

    /**
     * Enriches master step data without status information (master steps don't have status).
     * @param row Database row containing master step data
     * @return Enhanced step map suitable for Admin GUI
     */
    private Map<String, Object> enrichMasterStepWithStatusMetadata(Map<String, Object> row) {
        return [
            stm_id: row['stm_id'],
            // Core step fields
            stm_name: row['stm_name'] as String,
            stm_description: row['stm_description'] as String,
            stm_number: row['stm_number'] as Integer,
            stm_order: row['stm_number'] as Integer, // Frontend expects stm_order, which corresponds to stm_number in database
            stm_duration_minutes: row['stm_duration_minutes'] as Integer,
            phm_id: row['phm_id'],
            tms_id_owner: row['tms_id_owner'] as Integer,
            stt_code: row['stt_code'] as String,
            enr_id_target: row['enr_id_target'] as Integer,
            stm_id_predecessor: row['stm_id_predecessor'],
            // NEW FIELDS - Additional attributes for VIEW modal display
            team_name: row['team_name'] as String,
            step_code: row['step_code'] as String,
            environment_role_name: row['environment_role_name'] as String,
            predecessor_name: row['predecessor_name'] as String,
            predecessor_code: row['predecessor_code'] as String,
            // Audit fields - added for VIEW modal display
            created_by: row['created_by'] as String,
            created_at: row['created_at'],
            updated_by: row['updated_by'] as String,
            updated_at: row['updated_at'],
            // Hierarchy fields from JOINs
            plm_name: row['plm_name'] as String,
            sqm_name: row['sqm_name'] as String,
            phm_name: row['phm_name'] as String,
            // Computed fields from joins
            instruction_count: (row['instruction_count'] as Integer) ?: 0,
            instance_count: (row['instance_count'] as Integer) ?: 0
            // Note: Master steps don't have status - status exists only on step instances
        ] as Map<String, Object>
    }

    /**
     * Finds a single master step by ID with hierarchy data and computed fields
     * @param stepId The UUID of the master step
     * @return Map containing master step data or null if not found
     */
    Map<String, Object> findMasterStepById(UUID stepId) {
        return DatabaseUtil.withSql { Sql sql ->
            def result = sql.firstRow("""
                SELECT DISTINCT stm.*,
                       phm.phm_name,
                       sqm.sqm_name,
                       plm.plm_name,
                       tms.tms_name as team_name,
                       CONCAT(stm.stt_code, '-', LPAD(stm.stm_number::text, 4, '0')) as step_code,
                       enr.enr_name as environment_role_name,
                       pred.stm_name as predecessor_name,
                       CONCAT(pred.stt_code, '-', LPAD(pred.stm_number::text, 4, '0')) as predecessor_code,
                       COALESCE(instruction_counts.instruction_count, 0) as instruction_count,
                       COALESCE(instance_counts.instance_count, 0) as instance_count
                FROM steps_master_stm stm
                JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                LEFT JOIN environment_roles_enr enr ON stm.enr_id_target = enr.enr_id
                LEFT JOIN steps_master_stm pred ON stm.stm_id_predecessor = pred.stm_id
                LEFT JOIN (
                    SELECT stm_id, COUNT(*) as instruction_count
                    FROM instructions_master_inm
                    GROUP BY stm_id
                ) instruction_counts ON stm.stm_id = instruction_counts.stm_id
                LEFT JOIN (
                    SELECT stm_id, COUNT(*) as instance_count
                    FROM steps_instance_sti
                    GROUP BY stm_id
                ) instance_counts ON stm.stm_id = instance_counts.stm_id
                WHERE stm.stm_id = :stepId
            """, [stepId: stepId])
            
            return result ? enrichMasterStepWithStatusMetadata(result as Map<String, Object>) : null
        } as Map<String, Object>
    }

    /**
     * Fetches master steps filtered by migration ID
     * @param migrationId The UUID of the migration to filter by
     * @return List of master steps that belong to the specified migration
     */
    List<GroovyRowResult> findMasterStepsByMigrationId(UUID migrationId) {
        return DatabaseUtil.withSql { Sql sql ->
            return sql.rows('''
                SELECT DISTINCT
                    stm.stm_id,
                    stm.stt_code,
                    stm.stm_number,
                    stm.stm_name,
                    stm.stm_description,
                    stt.stt_name
                FROM steps_master_stm stm
                JOIN step_types_stt stt ON stm.stt_code = stt.stt_code
                JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                JOIN iterations_ite ite ON plm.plm_id = ite.plm_id
                WHERE ite.mig_id = :migrationId
                ORDER BY stm.stt_code, stm.stm_number
            ''', [migrationId: migrationId])
        } as List<GroovyRowResult>
    }

    /**
     * Fetches the first step instance for a given master step, for the first plan instance of the first iteration/migration (per current MVP logic).
     */
    GroovyRowResult findFirstStepInstance(String sttCode, Integer stmNumber) {
        return DatabaseUtil.withSql { Sql sql ->
            return sql.firstRow('''
                SELECT sti.*
                FROM steps_instance_sti sti
                JOIN plans_instance_pli pli ON sti.pli_id = pli.pli_id
                JOIN plans_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite ite ON plm.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                WHERE sti.stt_code = :sttCode AND sti.stm_number = :stmNumber
                ORDER BY mig.mig_id, ite.ite_id, plm.plm_id, pli.pli_id, sti.sti_id
                LIMIT 1
            ''', [sttCode: sttCode, stmNumber: stmNumber])
        } as GroovyRowResult
    }

    /**
     * Fetches filtered step instances for the runsheet with hierarchical filtering.
     * Returns steps grouped by sequence and phase with all required attributes.
     */
    List<Map<String, Object>> findFilteredStepInstances(Map<String, Object> filters) {
        return DatabaseUtil.withSql { Sql sql ->
            def query = '''
                SELECT 
                    -- Step instance data
                    sti.sti_id, stm.stt_code, stm.stm_number, sti.sti_name, sti.sti_status, 
                    sti.sti_duration_minutes, stm.tms_id_owner,
                    -- Master step data
                    stm.stm_id, stm.stm_name as master_name,
                    -- Sequence and phase hierarchy
                    sqm.sqm_id, sqm.sqm_name, sqm.sqm_order,
                    phm.phm_id, phm.phm_name, phm.phm_order,
                    -- Plan hierarchy
                    plm.plm_id, plm.plm_name,
                    -- Instance hierarchy
                    pli.pli_id, sqi.sqi_id, phi.phi_id,
                    -- Team owner information
                    tms.tms_name as owner_team_name,
                    -- Iteration and migration context
                    ite.ite_id, ite.ite_name,
                    mig.mig_id, mig.mig_name
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                WHERE 1=1
            '''
            
            def params = [:] as Map<String, Object>
            
            // Add hierarchical filters
            if (filters.migrationId) {
                query += ' AND mig.mig_id = :migrationId'
                params.migrationId = UUID.fromString(filters.migrationId as String)
            }
            
            if (filters.iterationId) {
                query += ' AND ite.ite_id = :iterationId'
                params.iterationId = UUID.fromString(filters.iterationId as String)
            }
            
            if (filters.planId) {
                query += ' AND pli.pli_id = :planId'
                params.planId = UUID.fromString(filters.planId as String)
            }
            
            if (filters.sequenceId) {
                query += ' AND sqi.sqi_id = :sequenceId'
                params.sequenceId = UUID.fromString(filters.sequenceId as String)
            }
            
            if (filters.phaseId) {
                query += ' AND phi.phi_id = :phaseId'
                params.phaseId = UUID.fromString(filters.phaseId as String)
            }
            
            // Add team filter
            if (filters.teamId) {
                query += ' AND stm.tms_id_owner = :teamId'
                params.teamId = Integer.parseInt(filters.teamId as String)
            }
            
            // Add label filter (through step-label join table)
            if (filters.labelId) {
                query += '''
                    AND EXISTS (
                        SELECT 1 FROM labels_lbl_x_steps_master_stm lxs 
                        WHERE lxs.stm_id = stm.stm_id AND lxs.lbl_id = :labelId
                    )
                '''
                params.labelId = Integer.parseInt(filters.labelId as String)
            }
            
            // Order by sequence, phase, and step number
            query += '''
                ORDER BY sqm.sqm_order, phm.phm_order, stm.stm_number
            '''
            
            def results = sql.rows(query, params) as List<GroovyRowResult>
            
            // Transform results to frontend-compatible format
            return results.collect { GroovyRowResult row ->
                enrichStepInstanceWithStatusMetadata(row as Map<String, Object>)
            } as List<Map<String, Object>>
        } as List<Map<String, Object>>
    }

    /**
     * Find step instance by ID with full details including instructions and comments.
     * @param stepInstanceId The UUID of the step instance
     * @return Step instance with all details or null if not found
     */
    Map<String, Object> findStepInstanceById(UUID stepInstanceId) {
        return DatabaseUtil.withSql { Sql sql ->
            def stepData = sql.firstRow('''
                SELECT 
                    -- Step instance data
                    sti.sti_id, stm.stt_code, stm.stm_number, sti.sti_name, sti.sti_status, 
                    sti.sti_duration_minutes, stm.tms_id_owner,
                    -- Master step data
                    stm.stm_id, stm.stm_name as master_name,
                    -- Sequence and phase hierarchy
                    sqm.sqm_id, sqm.sqm_name, sqm.sqm_order,
                    phm.phm_id, phm.phm_name, phm.phm_order,
                    -- Plan hierarchy
                    plm.plm_id, plm.plm_name,
                    -- Instance hierarchy
                    pli.pli_id, sqi.sqi_id, phi.phi_id,
                    -- Team owner information
                    tms.tms_name as owner_team_name,
                    -- Iteration and migration context
                    ite.ite_id, ite.ite_name,
                    mig.mig_id, mig.mig_name
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                WHERE sti.sti_id = :stepInstanceId
            ''', [stepInstanceId: stepInstanceId])
            
            if (!stepData) {
                return null
            }
            
            // Enrich with status metadata and labels
            def enrichedStep = enrichStepInstanceWithStatusMetadata(stepData as Map<String, Object>)
            
            // Add instructions and comments for detailed view
            def instructions = instructionRepository.findInstanceInstructionsByStepInstanceId(stepInstanceId)
            def comments = findCommentsByStepInstanceId(stepInstanceId)
            
            enrichedStep.instructions = instructions
            enrichedStep.comments = comments
            
            return enrichedStep
        } as Map<String, Object>
    }

    /**
     * Fetches all labels associated with a step master.
     * @param stmId The UUID of the step master
     * @return A list of labels with id, name, description, and color
     */
    List<Map<String, Object>> findLabelsByStepId(UUID stmId) {
        return DatabaseUtil.withSql { Sql sql ->
            def results = sql.rows('''
                SELECT l.lbl_id, l.lbl_name, l.lbl_description, l.lbl_color
                FROM labels_lbl l
                JOIN labels_lbl_x_steps_master_stm lxs ON l.lbl_id = lxs.lbl_id
                WHERE lxs.stm_id = :stmId
                ORDER BY l.lbl_name
            ''', [stmId: stmId])
            
            return results.collect { GroovyRowResult row ->
                [
                    id: row['lbl_id'] as Integer,
                    name: row['lbl_name'] as String,
                    description: row['lbl_description'] as String,
                    color: row['lbl_color'] as String
                ] as Map<String, Object>
            } as List<Map<String, Object>>
        } as List<Map<String, Object>>
    }

    /**
     * Updates step instance status (database only - no notifications).
     * @param stepInstanceId The UUID of the step instance
     * @param statusId The new status ID (Integer)
     * @param userId Optional user ID for audit logging
     * @return Map with success status and step data
     */
    Map<String, Object> updateStepInstanceStatus(UUID stepInstanceId, Integer statusId, Integer userId = null) {
        return DatabaseUtil.withSql { Sql sql ->
            try {
                println "StepRepository.updateStepInstanceStatus called:"
                println "  - stepInstanceId: ${stepInstanceId}"
                println "  - statusId: ${statusId}"
                println "  - userId: ${userId}"
                
                // Validate status exists and get status name
                def status = sql.firstRow("SELECT sts_id, sts_name FROM status_sts WHERE sts_id = :statusId AND sts_type = 'Step'", 
                    [statusId: statusId]) as GroovyRowResult
                
                if (!status) {
                    return [success: false, error: "Invalid status ID: ${statusId}"] as Map<String, Object>
                }
                
                println "  - Status name: ${status.sts_name}"
                
                def statusName = status.sts_name as String
                
                // Get current step instance data
                def stepInstance = sql.firstRow('''
                    SELECT 
                        sti.sti_id, sti.sti_name, sti.sti_status, sti.stm_id,
                        stm.stt_code, stm.stm_number, stm.tms_id_owner,
                        mig.mig_name as migration_name,
                        ite.ite_name as iteration_name,
                        plm.plm_name as plan_name
                    FROM steps_instance_sti sti
                    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    WHERE sti.sti_id = :stepInstanceId
                ''', [stepInstanceId: stepInstanceId]) as GroovyRowResult
                
                if (!stepInstance) {
                    return [success: false, error: "Step instance not found"] as Map<String, Object>
                }
                
                def oldStatusId = stepInstance['sti_status'] as Integer
                
                // Get old status name for caller context
                def oldStatus = (sql.firstRow("SELECT sts_name FROM status_sts WHERE sts_id = :oldStatusId", [oldStatusId: oldStatusId])?.sts_name as String)
                
                // Update the status with audit fields
                def updateCount = sql.executeUpdate('''
                    UPDATE steps_instance_sti 
                    SET sti_status = :statusId,
                        sti_end_time = CASE WHEN :statusName = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE sti_end_time END,
                        updated_by = CASE WHEN :userId IS NULL THEN 'confluence_user' ELSE :userId::varchar END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE sti_id = :stepInstanceId
                ''', [statusId: statusId, statusName: statusName, userId: userId, stepInstanceId: stepInstanceId])
                
                if (updateCount != 1) {
                    return [success: false, error: "Failed to update step status"] as Map<String, Object>
                }
                
                return [success: true, stepInstance: stepInstance, oldStatus: oldStatus, newStatus: statusName] as Map<String, Object>
                
            } catch (Exception e) {
                return [success: false, error: e.message] as Map<String, Object>
            }
        } as Map<String, Object>
    }

    /**
     * DEPRECATED: Updates step instance status with notification handling.
     * NOTE: Email notifications are now handled by StepNotificationIntegration.
     * This method remains for backward compatibility.
     * @param stepInstanceId The UUID of the step instance
     * @param statusId The new status ID (Integer)
     * @param userId Optional user ID for audit logging
     * @return Map with success status and mock email results for compatibility
     */
    @Deprecated
    Map<String, Object> updateStepInstanceStatusWithNotification(UUID stepInstanceId, Integer statusId, Integer userId = null) {
        // Call the new method that handles database operations only
        Map<String, Object> result = updateStepInstanceStatus(stepInstanceId, statusId, userId)
        
        if (result['success'] as Boolean) {
            // Return compatibility format with mock email count
            return [success: true, emailsSent: 0] as Map<String, Object>
        } else {
            return result
        }
    }

    /**
     * Marks a step instance as opened by a PILOT (database only - no notifications).
     * @param stepInstanceId The UUID of the step instance
     * @param userId Optional user ID for audit logging
     * @return Map with success status and step data
     */
    Map<String, Object> openStepInstance(UUID stepInstanceId, Integer userId = null) {
        return DatabaseUtil.withSql { Sql sql ->
            try {
                // Get step instance data
                def stepInstance = sql.firstRow('''
                    SELECT 
                        sti.sti_id, sti.sti_name, sti.stm_id, sti.sti_status,
                        stm.stt_code, stm.stm_number, stm.tms_id_owner,
                        mig.mig_name as migration_name,
                        ite.ite_name as iteration_name,
                        plm.plm_name as plan_name
                    FROM steps_instance_sti sti
                    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    WHERE sti.sti_id = :stepInstanceId
                ''', [stepInstanceId: stepInstanceId]) as GroovyRowResult
                
                if (!stepInstance) {
                    return [success: false, error: "Step instance not found"] as Map<String, Object>
                }
                
                // Check if already opened
                // Convert status ID to name for backward compatibility check
                def statusName = sql.firstRow("SELECT sts_name FROM status_sts WHERE sts_id = :statusId", [statusId: stepInstance['sti_status']])?.sts_name
                if (statusName in ['OPEN', 'IN_PROGRESS', 'COMPLETED']) {
                    return [success: false, error: "Step has already been opened (status: ${stepInstance['sti_status']})"] as Map<String, Object>
                }
                
                // Mark as opened by updating status to OPEN
                def updateCount = sql.executeUpdate('''
                    UPDATE steps_instance_sti 
                    SET sti_status = (SELECT sts_id FROM status_sts WHERE sts_name = 'OPEN' AND sts_type = 'Step'),
                        sti_start_time = CURRENT_TIMESTAMP,
                        usr_id_owner = :userId
                    WHERE sti_id = :stepInstanceId
                ''', [userId: userId, stepInstanceId: stepInstanceId])
                
                if (updateCount != 1) {
                    return [success: false, error: "Failed to open step"] as Map<String, Object>
                }
                
                return [success: true, stepInstance: stepInstance] as Map<String, Object>
                
            } catch (Exception e) {
                return [success: false, error: e.message] as Map<String, Object>
            }
        } as Map<String, Object>
    }

    /**
     * DEPRECATED: Marks a step instance as opened by a PILOT with notification handling.
     * NOTE: Email notifications are now handled by StepNotificationIntegration.
     * This method remains for backward compatibility.
     * @param stepInstanceId The UUID of the step instance
     * @param userId Optional user ID for audit logging
     * @return Map with success status and mock email results for compatibility
     */
    @Deprecated
    Map openStepInstanceWithNotification(UUID stepInstanceId, Integer userId = null) {
        // Call the new method that handles database operations only
        Map<String, Object> result = openStepInstance(stepInstanceId, userId)
        
        if (result['success'] as Boolean) {
            // Return compatibility format with mock email count
            return [success: true, emailsSent: 0] as Map<String, Object>
        } else {
            return result
        }
    }

    /**
     * Marks an instruction as completed (database only - no notifications).
     * @param instructionId The UUID of the instruction instance
     * @param stepInstanceId The UUID of the step instance
     * @param userId Optional user ID for audit logging
     * @return Map with success status and instruction data
     */
    Map<String, Object> completeInstruction(UUID instructionId, UUID stepInstanceId, Integer userId = null) {
        return DatabaseUtil.withSql { Sql sql ->
            try {
                // Get instruction data
                def instruction = sql.firstRow('''
                    SELECT 
                        ini.ini_id, ini.ini_is_completed,
                        inm.inm_order, inm.inm_body as ini_name,
                        inm.tms_id as instruction_team_id
                    FROM instructions_instance_ini ini
                    JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                    WHERE ini.ini_id = :instructionId
                ''', [instructionId: instructionId]) as GroovyRowResult
                
                if (!instruction) {
                    return [success: false, error: "Instruction not found"] as Map<String, Object>
                }
                
                // Check if already completed
                if (instruction.ini_is_completed) {
                    return [success: false, error: "Instruction already completed"] as Map<String, Object>
                }
                
                // Get step instance data
                def stepInstance = sql.firstRow('''
                    SELECT 
                        sti.sti_id, sti.sti_name, sti.stm_id,
                        stm.stt_code, stm.stm_number, stm.tms_id_owner,
                        mig.mig_name as migration_name,
                        ite.ite_name as iteration_name,
                        plm.plm_name as plan_name
                    FROM steps_instance_sti sti
                    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    WHERE sti.sti_id = :stepInstanceId
                ''', [stepInstanceId: stepInstanceId]) as GroovyRowResult
                
                if (!stepInstance) {
                    return [success: false, error: "Step instance not found"] as Map<String, Object>
                }
                
                // Complete instruction directly with audit logging
                def updateCount = sql.executeUpdate('''
                    UPDATE instructions_instance_ini 
                    SET 
                        ini_is_completed = true,
                        ini_completed_at = CURRENT_TIMESTAMP,
                        usr_id_completed_by = :userId,
                        updated_at = CURRENT_TIMESTAMP,
                        updated_by = :updatedBy
                    WHERE ini_id = :iniId AND ini_is_completed = false
                ''', [iniId: instructionId, userId: userId, updatedBy: AuthenticationService.getSystemUser()])
                
                if (updateCount != 1) {
                    return [success: false, error: "Failed to complete instruction"] as Map<String, Object>
                }
                
                // Log to audit trail if update was successful
                try {
                    println "StepRepository: Attempting to log instruction completion audit for iniId=${instructionId}, userId=${userId}, stepId=${stepInstanceId}"
                    
                    // Inline audit logging to avoid class loading issues
                    def auditDetails = groovy.json.JsonOutput.toJson([
                        step_instance_id: stepInstanceId.toString(),
                        completion_timestamp: new Date().format('yyyy-MM-dd HH:mm:ss')
                    ])
                    
                    sql.execute("""
                        INSERT INTO audit_log_aud (
                            usr_id, aud_action, aud_entity_type, aud_entity_id, aud_details
                        ) VALUES (?, ?, ?, ?, ?::jsonb)
                    """, [
                        userId,
                        'INSTRUCTION_COMPLETED',
                        'INSTRUCTION_INSTANCE',
                        instructionId,
                        auditDetails
                    ])
                    
                    println "StepRepository: Successfully logged instruction completion audit for iniId=${instructionId}"
                } catch (Exception auditError) {
                    // Audit logging failure shouldn't break the main flow
                    println "StepRepository: Failed to log instruction completion audit - ${auditError.message}"
                    auditError.printStackTrace()
                }
                
                return [success: true, instruction: instruction, stepInstance: stepInstance] as Map<String, Object>
                
            } catch (Exception e) {
                return [success: false, error: e.message] as Map<String, Object>
            }
        } as Map<String, Object>
    }

    /**
     * DEPRECATED: Marks an instruction as completed with notification handling.
     * NOTE: Email notifications are now handled by StepNotificationIntegration.
     * This method remains for backward compatibility.
     * @param instructionId The UUID of the instruction instance
     * @param stepInstanceId The UUID of the step instance
     * @param userId Optional user ID for audit logging
     * @return Map with success status and mock email results for compatibility
     */
    @Deprecated
    Map<String, Object> completeInstructionWithNotification(UUID instructionId, UUID stepInstanceId, Integer userId = null) {
        // Call the new method that handles database operations only
        Map<String, Object> result = completeInstruction(instructionId, stepInstanceId, userId)
        
        if (result['success'] as Boolean) {
            // Return compatibility format with mock email count
            return [success: true, emailsSent: 0] as Map<String, Object>
        } else {
            return result
        }
    }

    /**
     * Mark an instruction as incomplete (database only - no notifications).
     * @param instructionId The UUID of the instruction instance
     * @param stepInstanceId The UUID of the step instance
     * @param userId Optional user ID for audit logging
     * @return Map with success status and instruction data
     */
    Map<String, Object> uncompleteInstruction(UUID instructionId, UUID stepInstanceId, Integer userId = null) {
        return DatabaseUtil.withSql { Sql sql ->
            try {
                // Get instruction data
                def instruction = sql.firstRow('''
                    SELECT 
                        ini.ini_id, ini.ini_is_completed,
                        inm.inm_order, inm.inm_body as ini_name,
                        inm.tms_id as instruction_team_id
                    FROM instructions_instance_ini ini
                    JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                    WHERE ini.ini_id = :instructionId
                ''', [instructionId: instructionId]) as GroovyRowResult
                
                if (!instruction) {
                    return [success: false, error: "Instruction not found"] as Map<String, Object>
                }
                
                // Check if already incomplete
                if (!instruction.ini_is_completed) {
                    return [success: false, error: "Instruction is already incomplete"] as Map<String, Object>
                }
                
                // Get step instance data
                def stepInstance = sql.firstRow('''
                    SELECT 
                        sti.sti_id, sti.sti_name, sti.stm_id,
                        stm.stt_code, stm.stm_number, stm.tms_id_owner,
                        mig.mig_name as migration_name,
                        ite.ite_name as iteration_name,
                        plm.plm_name as plan_name
                    FROM steps_instance_sti sti
                    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    WHERE sti.sti_id = :stepInstanceId
                ''', [stepInstanceId: stepInstanceId]) as GroovyRowResult
                
                if (!stepInstance) {
                    return [success: false, error: "Step instance not found"] as Map<String, Object>
                }
                
                // Uncomplete instruction directly with audit logging
                // First, get the current user info for audit logging
                def instructionInfo = sql.firstRow('''
                    SELECT usr_id_completed_by 
                    FROM instructions_instance_ini 
                    WHERE ini_id = :iniId AND ini_is_completed = true
                ''', [iniId: instructionId])
                
                def updateCount = sql.executeUpdate('''
                    UPDATE instructions_instance_ini 
                    SET 
                        ini_is_completed = false,
                        ini_completed_at = NULL,
                        usr_id_completed_by = NULL,
                        updated_at = CURRENT_TIMESTAMP,
                        updated_by = :updatedBy
                    WHERE ini_id = :iniId AND ini_is_completed = true
                ''', [iniId: instructionId, updatedBy: AuthenticationService.getSystemUser()])
                
                if (updateCount != 1) {
                    return [success: false, error: "Failed to mark instruction as incomplete"] as Map<String, Object>
                }
                
                // Log to audit trail if update was successful
                try {
                    // Use the original completing user ID or provided userId for audit logging
                    def auditUserId = instructionInfo?.usr_id_completed_by as Integer ?: userId
                    println "StepRepository: Attempting to log instruction uncompletion audit for iniId=${instructionId}, auditUserId=${auditUserId}, stepId=${stepInstanceId}"
                    
                    // Inline audit logging to avoid class loading issues
                    def auditDetails = groovy.json.JsonOutput.toJson([
                        step_instance_id: stepInstanceId.toString(),
                        uncomplete_timestamp: new Date().format('yyyy-MM-dd HH:mm:ss')
                    ])
                    
                    sql.execute("""
                        INSERT INTO audit_log_aud (
                            usr_id, aud_action, aud_entity_type, aud_entity_id, aud_details
                        ) VALUES (?, ?, ?, ?, ?::jsonb)
                    """, [
                        auditUserId,
                        'INSTRUCTION_UNCOMPLETED',
                        'INSTRUCTION_INSTANCE',
                        instructionId,
                        auditDetails
                    ])
                    
                    println "StepRepository: Successfully logged instruction uncompletion audit for iniId=${instructionId}"
                } catch (Exception auditError) {
                    // Audit logging failure shouldn't break the main flow
                    println "StepRepository: Failed to log instruction uncompletion audit - ${auditError.message}"
                    auditError.printStackTrace()
                }
                
                return [success: true, instruction: instruction, stepInstance: stepInstance] as Map<String, Object>
                
            } catch (Exception e) {
                return [success: false, error: e.message] as Map<String, Object>
            }
        } as Map<String, Object>
    }

    /**
     * DEPRECATED: Mark an instruction as incomplete with notification handling.
     * NOTE: Email notifications are now handled by StepNotificationIntegration.
     * This method remains for backward compatibility.
     * @param instructionId The UUID of the instruction instance
     * @param stepInstanceId The UUID of the step instance
     * @param userId Optional user ID for audit logging
     * @return Map with success status and mock email results for compatibility
     */
    @Deprecated
    Map<String, Object> uncompleteInstructionWithNotification(UUID instructionId, UUID stepInstanceId, Integer userId = null) {
        // Call the new method that handles database operations only
        Map<String, Object> result = uncompleteInstruction(instructionId, stepInstanceId, userId)
        
        if (result['success'] as Boolean) {
            // Return compatibility format with mock email count
            return [success: true, emailsSent: 0] as Map<String, Object>
        } else {
            return result
        }
    }

    /**
     * Helper method to get all teams that should receive notifications for a step.
     * Includes owner team and impacted teams.
     */
    private List<Map<String, Object>> getTeamsForNotification(Sql sql, UUID stmId, Integer ownerTeamId) {
        def teams = [] as List<Map<String, Object>>
        
        // Add owner team
        if (ownerTeamId) {
            def ownerTeam = sql.firstRow('''
                SELECT tms_id, tms_name, tms_email
                FROM teams_tms
                WHERE tms_id = :teamId
            ''', [teamId: ownerTeamId])
            
            if (ownerTeam) {
                teams.add(ownerTeam as Map)
            }
        }
        
        // Add impacted teams
        def impactedTeams = sql.rows('''
            SELECT DISTINCT t.tms_id, t.tms_name, t.tms_email
            FROM teams_tms t
            JOIN steps_master_stm_x_teams_tms_impacted sti ON t.tms_id = sti.tms_id
            WHERE sti.stm_id = :stmId
        ''', [stmId: stmId])
        
        teams.addAll(impactedTeams as List<Map>)
        
        // Remove duplicates by team ID
        def uniqueTeams = teams.unique { Map<String, Object> team -> team.tms_id }
        
        return uniqueTeams as List<Map<String, Object>>
    }
    
    /**
     * Helper method to get all teams that should receive notifications for a step,
     * including the instruction-specific team.
     * Includes owner team, impacted teams, and instruction team.
     */
    private List<Map<String, Object>> getTeamsForNotificationWithInstructionTeam(Sql sql, UUID stmId, Integer ownerTeamId, Integer instructionTeamId) {
        def teams = [] as List<Map<String, Object>>
        
        // Add owner team
        if (ownerTeamId) {
            def ownerTeam = sql.firstRow('''
                SELECT tms_id, tms_name, tms_email
                FROM teams_tms
                WHERE tms_id = :teamId
            ''', [teamId: ownerTeamId])
            
            if (ownerTeam) {
                teams.add(ownerTeam as Map)
            }
        }
        
        // Add impacted teams
        def impactedTeams = sql.rows('''
            SELECT DISTINCT t.tms_id, t.tms_name, t.tms_email
            FROM teams_tms t
            JOIN steps_master_stm_x_teams_tms_impacted sti ON t.tms_id = sti.tms_id
            WHERE sti.stm_id = :stmId
        ''', [stmId: stmId])
        
        teams.addAll(impactedTeams as List<Map>)
        
        // Add instruction team if different from owner and impacted teams
        if (instructionTeamId) {
            def instructionTeam = sql.firstRow('''
                SELECT tms_id, tms_name, tms_email
                FROM teams_tms
                WHERE tms_id = :teamId
            ''', [teamId: instructionTeamId])
            
            if (instructionTeam) {
                teams.add(instructionTeam as Map)
            }
        }
        
        // Remove duplicates by team ID
        def uniqueTeams = teams.unique { Map<String, Object> team -> team.tms_id }
        
        return uniqueTeams as List<Map<String, Object>>
    }
    
    /**
     * Find step instance details by step instance ID (UUID)
     * @param stepInstanceId Step instance UUID
     * @return Step instance details with instructions and comments
     */
    Map<String, Object> findStepInstanceDetailsById(UUID stepInstanceId) {
        return DatabaseUtil.withSql { Sql sql ->
            // Get the step instance with master data and hierarchy
            def stepInstance = sql.firstRow('''
                SELECT 
                    sti.sti_id,
                    sti.sti_name,
                    sti.sti_status,
                    sti.sti_duration_minutes,
                    sti.phi_id,
                    sti.enr_id,
                    enr.enr_name as environment_role_name,
                    env.env_name as environment_name,
                    stm.stm_id,
                    stm.stt_code,
                    stm.stm_number,
                    stm.stm_name as master_name,
                    stm.stm_description,
                    stm.stm_duration_minutes as master_duration,
                    stm.tms_id_owner,
                    owner_team.tms_name as owner_team_name,
                    stm.stm_id_predecessor,
                    -- Predecessor step info
                    pred_stm.stt_code as predecessor_stt_code,
                    pred_stm.stm_number as predecessor_stm_number,
                    pred_stm.stm_name as predecessor_name,
                    -- Hierarchy data
                    mig.mig_name as migration_name,
                    ite.ite_name as iteration_name,
                    plm.plm_name as plan_name,
                    sqm.sqm_name as sequence_name,
                    phm.phm_name as phase_name
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                LEFT JOIN teams_tms owner_team ON stm.tms_id_owner = owner_team.tms_id
                LEFT JOIN steps_master_stm pred_stm ON stm.stm_id_predecessor = pred_stm.stm_id
                LEFT JOIN environment_roles_enr enr ON sti.enr_id = enr.enr_id
                -- Join to get hierarchy
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                -- Join to get actual environment name for this iteration and role
                LEFT JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id AND eei.enr_id = sti.enr_id
                LEFT JOIN environments_env env ON eei.env_id = env.env_id
                WHERE sti.sti_id = :stepInstanceId
            ''', [stepInstanceId: stepInstanceId])
            
            if (!stepInstance) {
                return null
            }
            
            // Get instructions for this step instance with team information
            def instructions = sql.rows('''
                SELECT 
                    ini.ini_id,
                    ini.ini_is_completed,
                    ini.ini_completed_at,
                    ini.usr_id_completed_by,
                    inm.inm_id,
                    inm.inm_order,
                    inm.inm_body,
                    inm.inm_duration_minutes,
                    inm.tms_id,
                    tms.tms_name as team_name,
                    tms.tms_email as team_email
                FROM instructions_instance_ini ini
                JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id
                WHERE ini.sti_id = :stepInstanceId
                ORDER BY inm.inm_order
            ''', [stepInstanceId: stepInstanceId])
            
            // Get iteration types (scope) for this step
            def iterationTypes = sql.rows('''
                SELECT itt.itt_code, itt.itt_name
                FROM steps_master_stm_x_iteration_types_itt smit
                JOIN iteration_types_itt itt ON smit.itt_code = itt.itt_code
                WHERE smit.stm_id = :stmId
                ORDER BY itt.itt_code
            ''', [stmId: stepInstance['stm_id']])
            
            // Get impacted teams using the master step ID
            def impactedTeamIds = sql.rows('''
                SELECT tms_id
                FROM steps_master_stm_x_teams_tms_impacted
                WHERE stm_id = :stmId
            ''', [stmId: stepInstance['stm_id']])*.tms_id
            
            def impactedTeams = [] as List<String>
            impactedTeamIds.each { teamId ->
                def team = sql.firstRow('SELECT tms_name FROM teams_tms WHERE tms_id = :teamId', [teamId: teamId])
                if (team) {
                    impactedTeams.add(team['tms_name'] as String)
                }
            }
            
            // Get comments for this step instance
            def comments = findCommentsByStepInstanceId(stepInstanceId)
            
            // Get labels for this step (using master step ID)
            List labels = []
            if (stepInstance['stm_id']) {
                try {
                    labels = findLabelsByStepId(stepInstance['stm_id'] as UUID) as List
                    println "DEBUG: Found ${labels.size()} labels for step ${stepInstance['stm_id']}"
                } catch (Exception e) {
                    println "ERROR fetching labels: ${e.message}"
                }
            }
            
            return [
                stepSummary: [
                    ID: stepInstance['sti_id'],
                    Name: stepInstance['sti_name'] ?: stepInstance['master_name'],
                    Description: stepInstance['stm_description'],
                    StatusID: stepInstance['sti_status'],  // Changed from Status to StatusID for consistency
                    Duration: stepInstance['sti_duration_minutes'] ?: stepInstance['master_duration'],
                    AssignedTeam: stepInstance['owner_team_name'] ?: 'Unassigned',
                    StepCode: "${stepInstance['stt_code']}-${String.format('%03d', stepInstance['stm_number'] as Integer)}",
                    // Hierarchy information
                    MigrationName: stepInstance['migration_name'],
                    IterationName: stepInstance['iteration_name'],
                    PlanName: stepInstance['plan_name'],
                    SequenceName: stepInstance['sequence_name'],
                    PhaseName: stepInstance['phase_name'],
                    // Predecessor information
                    PredecessorCode: stepInstance['predecessor_stt_code'] && stepInstance['predecessor_stm_number'] ? 
                        "${stepInstance['predecessor_stt_code']}-${String.format('%03d', stepInstance['predecessor_stm_number'] as Integer)}" : null,
                    PredecessorName: stepInstance['predecessor_name'],
                    // Environment role
                    TargetEnvironment: stepInstance['environment_role_name'] ? 
                        (stepInstance['environment_name'] ? 
                            "${stepInstance['environment_role_name']} (${stepInstance['environment_name']})" : 
                            "${stepInstance['environment_role_name']} (!No Environment Assigned Yet!)") : 
                        'Not specified',
                    // Iteration types (scope)
                    IterationTypes: iterationTypes.collect { it['itt_code'] as String },
                    // Labels
                    Labels: labels
                ],
                instructions: instructions.collect { instruction ->
                    [
                        ID: instruction.ini_id,
                        Description: instruction.inm_body,
                        IsCompleted: instruction.ini_is_completed,
                        CompletedAt: instruction.ini_completed_at,
                        CompletedBy: instruction.usr_id_completed_by,
                        Order: instruction.inm_order,
                        Duration: instruction.inm_duration_minutes,
                        TeamId: instruction.tms_id,
                        Team: instruction.team_name,
                        TeamEmail: instruction.team_email
                    ]
                },
                impactedTeams: impactedTeams,
                comments: comments
            ]
        }
    }

    /**
     * Find step instance details with instructions for the iteration view
     * @param stepCode The step code (e.g., "APP-001")
     * @return Map containing step instance details and instructions
     */
    Map<String, Object> findStepInstanceDetailsByCode(String stepCode) {
        return DatabaseUtil.withSql { Sql sql ->
            if (!stepCode || !stepCode.contains('-')) {
                return null
            }
            
            def parts = stepCode.split('-')
            if (parts.length != 2) {
                return null
            }
            def sttCode = parts[0]
            def stmNumber = Integer.parseInt(parts[1])
            
            // First find the step master
            def stepMaster = sql.firstRow('''
                SELECT stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name, stm.stm_description, stm.stm_duration_minutes, stm.tms_id_owner
                FROM steps_master_stm stm
                WHERE stm.stt_code = :sttCode AND stm.stm_number = :stmNumber
            ''', [sttCode: sttCode, stmNumber: stmNumber])
            
            if (!stepMaster) {
                return null
            }
            
            // Find the most recent step instance WITH complete hierarchical context
            def stepInstance = sql.firstRow('''
                SELECT 
                    sti.sti_id,
                    sti.sti_name,
                    sti.sti_status,
                    sti.sti_duration_minutes,
                    sti.phi_id,
                    sti.enr_id,
                    -- Team information (FIXED JOIN)
                    tms.tms_name as owner_team_name,
                    -- Status information (FIXED)
                    sts.sts_name as status_name,
                    -- Complete hierarchical context
                    mig.mig_name as migration_name,
                    ite.ite_name as iteration_name,
                    plm.plm_name as plan_name,
                    sqm.sqm_name as sequence_name,
                    phm.phm_name as phase_name,
                    -- Environment information
                    enr.enr_name as environment_role_name,
                    env.env_name as environment_name
                FROM steps_instance_sti sti
                -- FIXED: Add the missing steps_master join
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                -- FIXED: Proper team join using the actual foreign key
                LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                -- FIXED: Status name resolution
                LEFT JOIN status_sts sts ON sti.sti_status = sts.sts_id
                -- Complete hierarchy joins
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                -- Environment joins
                LEFT JOIN environment_roles_enr enr ON sti.enr_id = enr.enr_id
                LEFT JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id AND eei.enr_id = sti.enr_id
                LEFT JOIN environments_env env ON eei.env_id = env.env_id
                WHERE sti.stm_id = :stmId
                ORDER BY sti.sti_id DESC
                LIMIT 1
            ''', [stmId: stepMaster['stm_id']])
            
            if (!stepInstance) {
                // If no instance exists, return master data only
                // Get owner team name for master
                def ownerTeam = null
                if (stepMaster['tms_id_owner']) {
                    ownerTeam = sql.firstRow('SELECT tms_name FROM teams_tms WHERE tms_id = :teamId', [teamId: stepMaster['tms_id_owner']])
                }
                
                return [
                    stepSummary: [
                        ID: stepCode,
                        Name: stepMaster['stm_name'],
                        Description: stepMaster['stm_description'],
                        StatusID: 1, // PENDING status ID
                        AssignedTeam: ownerTeam?.tms_name ?: 'Unassigned',
                        // Add empty hierarchical context for consistency
                        MigrationName: null,
                        IterationName: null,
                        PlanName: null,
                        SequenceName: null,
                        PhaseName: null,
                        Labels: []
                    ],
                    instructions: [],
                    impactedTeams: []
                ]
            }
            
            // Get instructions for this step instance with team information
            def instructions = sql.rows('''
                SELECT 
                    ini.ini_id,
                    ini.ini_is_completed,
                    ini.ini_completed_at,
                    ini.usr_id_completed_by,
                    inm.inm_id,
                    inm.inm_order,
                    inm.inm_body,
                    inm.inm_duration_minutes,
                    inm.tms_id,
                    tms.tms_name as team_name,
                    tms.tms_email as team_email
                FROM instructions_instance_ini ini
                JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
                LEFT JOIN teams_tms tms ON inm.tms_id = tms.tms_id
                WHERE ini.sti_id = :stiId
                ORDER BY inm.inm_order
            ''', [stiId: stepInstance['sti_id']])
            
            // Get impacted teams using the master step ID
            def impactedTeamIds = sql.rows('''
                SELECT tms_id
                FROM steps_master_stm_x_teams_tms_impacted
                WHERE stm_id = :stmId
            ''', [stmId: stepMaster['stm_id']])*.tms_id
            
            def impactedTeams = [] as List<String>
            impactedTeamIds.each { teamId ->
                def team = sql.firstRow('SELECT tms_name FROM teams_tms WHERE tms_id = :teamId', [teamId: teamId])
                if (team) {
                    impactedTeams.add(team['tms_name'] as String)
                }
            }
            
            // Get comments for this step instance
            def comments = findCommentsByStepInstanceId(stepInstance['sti_id'] as UUID)
            
            // Get labels for this step (using master step ID) - ADDED
            List labels = []
            if (stepMaster['stm_id']) {
                try {
                    labels = findLabelsByStepId(stepMaster['stm_id'] as UUID) as List
                    println "DEBUG: Found ${labels.size()} labels for step ${stepMaster['stm_id']}"
                } catch (Exception e) {
                    println "ERROR fetching labels: ${e.message}"
                }
            }
            
            return [
                stepSummary: [
                    ID: stepCode,
                    Name: stepInstance.sti_name ?: stepMaster['stm_name'],
                    Description: stepMaster['stm_description'],
                    // Changed to StatusID for consistency with findStepInstanceDetailsById
                    StatusID: stepInstance['sti_status'],
                    AssignedTeam: stepInstance.owner_team_name ?: 'Unassigned',
                    Duration: stepMaster.stm_duration_minutes,
                    sti_id: stepInstance['sti_id']?.toString(),  // Include step instance ID for comments
                    // ADDED: Complete hierarchical context
                    MigrationName: stepInstance.migration_name,
                    IterationName: stepInstance.iteration_name,
                    PlanName: stepInstance.plan_name,
                    SequenceName: stepInstance.sequence_name,
                    PhaseName: stepInstance.phase_name,
                    // ADDED: Environment context
                    TargetEnvironment: stepInstance.environment_role_name ? 
                        (stepInstance.environment_name ? 
                            "${stepInstance.environment_role_name} (${stepInstance.environment_name})" : 
                            "${stepInstance.environment_role_name} (!No Environment Assigned Yet!)") : 
                        'Not specified',
                    // ADDED: Labels
                    Labels: labels
                ],
                instructions: instructions.collect { instruction ->
                    [
                        ID: instruction.ini_id?.toString(),
                        ini_id: instruction.ini_id?.toString(),
                        Order: instruction.inm_order,
                        Description: instruction.inm_body,
                        Duration: instruction.inm_duration_minutes,
                        IsCompleted: instruction.ini_is_completed ?: false,
                        CompletedAt: instruction.ini_completed_at,
                        CompletedBy: instruction.usr_id_completed_by,
                        TeamId: instruction.tms_id,
                        Team: instruction.team_name,
                        TeamEmail: instruction.team_email
                    ]
                },
                impactedTeams: impactedTeams,
                comments: comments
            ]
        }
    }
    
    /**
     * Fetch comments for a step instance
     * @param stepInstanceId The UUID of the step instance
     * @return List of comments with user information
     */
    def findCommentsByStepInstanceId(UUID stepInstanceId) {
        DatabaseUtil.withSql { Sql sql ->
            def comments = sql.rows('''
                SELECT 
                    sic.sic_id,
                    sic.sti_id,
                    sic.comment_body,
                    sic.created_at,
                    sic.updated_at,
                    u.usr_id,
                    u.usr_first_name,
                    u.usr_last_name,
                    u.usr_email,
                    t.tms_name as user_team_name
                FROM step_instance_comments_sic sic
                JOIN users_usr u ON sic.created_by = u.usr_id
                LEFT JOIN teams_tms_x_users_usr tmu ON u.usr_id = tmu.usr_id
                LEFT JOIN teams_tms t ON tmu.tms_id = t.tms_id
                WHERE sic.sti_id = :stepInstanceId
                ORDER BY sic.created_at DESC
            ''', [stepInstanceId: stepInstanceId])
            
            return comments.collect { comment ->
                [
                    id: comment.sic_id,
                    body: comment.comment_body,
                    createdAt: comment.created_at,
                    updatedAt: comment.updated_at,
                    author: [
                        id: comment.usr_id,
                        name: "${comment.usr_first_name} ${comment.usr_last_name}".trim(),
                        email: comment.usr_email,
                        team: comment.user_team_name
                    ]
                ]
            }
        }
    }
    
    /**
     * Create a new comment for a step instance
     * @param stepInstanceId The UUID of the step instance
     * @param commentBody The comment text
     * @param userId The ID of the user creating the comment
     * @return The created comment with ID
     */
    def createComment(UUID stepInstanceId, String commentBody, Integer userId) {
        DatabaseUtil.withSql { Sql sql ->
            def result = sql.firstRow('''
                INSERT INTO step_instance_comments_sic (sti_id, comment_body, created_by)
                VALUES (:stepInstanceId, :commentBody, CASE WHEN :userId IS NULL THEN 57 ELSE :userId END)
                RETURNING sic_id, created_at
            ''', [stepInstanceId: stepInstanceId, commentBody: commentBody, userId: userId])
            
            return [
                id: result.sic_id,
                createdAt: result.created_at
            ]
        }
    }
    
    /**
     * Update an existing comment
     * @param commentId The ID of the comment to update
     * @param commentBody The new comment text
     * @param userId The ID of the user updating the comment
     * @return Success status
     */
    def updateComment(Integer commentId, String commentBody, Integer userId) {
        DatabaseUtil.withSql { Sql sql ->
            def updateCount = sql.executeUpdate('''
                UPDATE step_instance_comments_sic 
                SET comment_body = :commentBody,
                    updated_by = CASE WHEN :userId IS NULL THEN 57 ELSE :userId END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE sic_id = :commentId
            ''', [commentId: commentId, commentBody: commentBody, userId: userId])
            
            return updateCount == 1
        }
    }
    
    /**
     * Delete a comment
     * @param commentId The ID of the comment to delete
     * @param userId The ID of the user attempting to delete (for permission check)
     * @return Success status
     */
    def deleteComment(Integer commentId, Integer userId) {
        DatabaseUtil.withSql { Sql sql ->
            // For now, we'll allow any user to delete any comment
            // In production, you'd want to check if the user created the comment or has admin rights
            def deleteCount = sql.executeUpdate('''
                DELETE FROM step_instance_comments_sic 
                WHERE sic_id = :commentId
            ''', [commentId: commentId])
            
            return deleteCount == 1
        }
    }
    
    /**
     * Enriches step instance data with status metadata while maintaining backward compatibility.
     * @param row Database row containing step instance data
     * @return Enhanced step instance map with statusMetadata
     */
    private Map<String, Object> enrichStepInstanceWithStatusMetadata(Map<String, Object> row) {
        // Get status metadata if status is an ID
        def statusMetadata = null
        def statusName = row['sti_status']
        
        if (row['sti_status'] instanceof Number) {
            // Status is already an ID, get the name and metadata
            def statusInfo = DatabaseUtil.withSql { sql ->
                sql.firstRow("SELECT sts_name, sts_color, sts_type FROM status_sts WHERE sts_id = :statusId", 
                    [statusId: row['sti_status']])
            }
            if (statusInfo) {
                statusName = statusInfo['sts_name'] as String
                statusMetadata = [
                    id: row['sti_status'] as Integer,
                    name: statusInfo['sts_name'] as String,
                    color: statusInfo['sts_color'] as String,
                    type: statusInfo['sts_type'] as String
                ]
            }
        }
        
        // Load labels for this step
        def labels = findLabelsByStepId(row['stm_id'] as UUID)
        
        return [
            id: row['sti_id'],
            stmId: row['stm_id'],
            sttCode: row['stt_code'] as String,
            code: row['stt_code'] as String, // UI compatibility - add 'code' property
            stmNumber: row['stm_number'] as Integer,
            name: (row['sti_name'] ?: row['master_name']) as String,
            status: statusName, // Backward compatibility - return status name as string
            durationMinutes: row['sti_duration_minutes'] as Integer,
            ownerTeamId: row['tms_id_owner'] as Integer,
            ownerTeamName: row['owner_team_name'] as String,
            // Labels support for UI
            labels: labels,
            // Hierarchy context
            sequenceId: row['sqm_id'],
            sequenceName: row['sqm_name'] as String,
            sequenceNumber: row['sqm_order'] as Integer,
            phaseId: row['phm_id'],
            phaseName: row['phm_name'] as String,
            phaseNumber: row['phm_order'] as Integer,
            planId: row['plm_id'],
            planName: row['plm_name'] as String,
            iterationId: row['ite_id'],
            iterationName: row['ite_name'] as String,
            migrationId: row['mig_id'],
            migrationName: row['mig_name'] as String,
            // Enhanced status metadata
            statusMetadata: statusMetadata
        ] as Map
    }

    // ==================== MODERN SPRINT 3 PATTERNS ====================
    
    /**
     * Advanced query method with comprehensive filtering, sorting, and pagination.
     * Following Sprint 3 patterns from SequenceRepository.groovy.
     * @param filters Map containing optional filters
     * @param limit Maximum number of results (max 1000, default 100)
     * @param offset Number of results to skip (default 0)
     * @param sortBy Field to sort by (default: stm_number)
     * @param sortOrder Sort direction ('ASC' or 'DESC', default 'ASC')
     * @return Map containing steps data and pagination metadata
     */
    Map findStepsWithFilters(Map filters, Integer limit = 100, Integer offset = 0, 
                            String sortBy = 'stm_number', String sortOrder = 'ASC') {
        DatabaseUtil.withSql { sql ->
            // Validate and sanitize parameters (ADR-031 type safety)
            limit = Math.min(limit ?: 100, 1000) as Integer
            offset = Math.max(offset ?: 0, 0) as Integer
            sortBy = sanitizeSortField(sortBy)
            sortOrder = (sortOrder?.toUpperCase() in ['ASC', 'DESC']) ? sortOrder.toUpperCase() : 'ASC'
            
            def baseQuery = '''
                SELECT 
                    -- Step instance data
                    sti.sti_id, stm.stt_code, stm.stm_number, sti.sti_name, sti.sti_status, 
                    sti.sti_duration_minutes, stm.tms_id_owner, sti.sti_start_time, sti.sti_end_time,
                    -- Master step data
                    stm.stm_id, stm.stm_name as master_name, stm.stm_description,
                    -- Sequence and phase hierarchy
                    sqm.sqm_id, sqm.sqm_name, sqm.sqm_order,
                    phm.phm_id, phm.phm_name, phm.phm_order,
                    -- Plan hierarchy
                    plm.plm_id, plm.plm_name,
                    -- Instance hierarchy
                    pli.pli_id, sqi.sqi_id, phi.phi_id,
                    -- Team owner information
                    tms.tms_name as owner_team_name,
                    -- Iteration and migration context
                    ite.ite_id, ite.ite_name,
                    mig.mig_id, mig.mig_name,
                    -- Status metadata
                    sts.sts_name as status_name, sts.sts_color, sts.sts_type,
                    -- Count for pagination
                    COUNT(*) OVER() as total_count
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                LEFT JOIN status_sts sts ON sti.sti_status = sts.sts_id
                WHERE 1=1
            '''
            
            def params = [:]
            
            // Add hierarchical filters (ADR-030 compliance - use instance IDs)
            if (filters.migrationId) {
                baseQuery += ' AND mig.mig_id = :migrationId'
                params.migrationId = UUID.fromString(filters.migrationId as String)
            }
            
            if (filters.iterationId) {
                baseQuery += ' AND ite.ite_id = :iterationId'
                params.iterationId = UUID.fromString(filters.iterationId as String)
            }
            
            if (filters.planInstanceId) {
                baseQuery += ' AND pli.pli_id = :planInstanceId'
                params.planInstanceId = UUID.fromString(filters.planInstanceId as String)
            }
            
            if (filters.sequenceInstanceId) {
                baseQuery += ' AND sqi.sqi_id = :sequenceInstanceId'
                params.sequenceInstanceId = UUID.fromString(filters.sequenceInstanceId as String)
            }
            
            if (filters.phaseInstanceId) {
                baseQuery += ' AND phi.phi_id = :phaseInstanceId'
                params.phaseInstanceId = UUID.fromString(filters.phaseInstanceId as String)
            }
            
            // Entity filtering
            if (filters.teamId) {
                baseQuery += ' AND stm.tms_id_owner = :teamId'
                params.teamId = Integer.parseInt(filters.teamId as String)
            }
            
            if (filters.statusId) {
                baseQuery += ' AND sti.sti_status = :statusId'
                params.statusId = Integer.parseInt(filters.statusId as String)
            }
            
            if (filters.stepTypeCode) {
                baseQuery += ' AND stm.stt_code = :stepTypeCode'
                params.stepTypeCode = filters.stepTypeCode as String
            }
            
            // Label filtering (through join table)
            if (filters.labelId) {
                baseQuery += '''
                    AND EXISTS (
                        SELECT 1 FROM labels_lbl_x_steps_master_stm lxs 
                        WHERE lxs.stm_id = stm.stm_id AND lxs.lbl_id = :labelId
                    )
                '''
                params.labelId = Integer.parseInt(filters.labelId as String)
            }
            
            // Search capabilities
            if (filters.searchText) {
                baseQuery += '''
                    AND (UPPER(stm.stm_name) LIKE UPPER(:searchText) 
                         OR UPPER(stm.stm_description) LIKE UPPER(:searchText)
                         OR UPPER(sti.sti_name) LIKE UPPER(:searchText))
                '''
                params.searchText = "%${filters.searchText as String}%"
            }
            
            // Add sorting and pagination
            def orderClause = "ORDER BY ${sortBy} ${sortOrder}, stm.stm_number ASC"
            def paginationClause = "LIMIT :limit OFFSET :offset"
            
            params.limit = limit
            params.offset = offset
            
            def finalQuery = "${baseQuery} ${orderClause} ${paginationClause}"
            
            def results = sql.rows(finalQuery, params)
            def totalCount = results.isEmpty() ? 0 : (results[0].total_count as Integer)
            
            // Transform results with status metadata enrichment
            def enrichedSteps = results.collect { row ->
                enrichStepInstanceWithAdvancedMetadata(row)
            }
            
            return [
                steps: enrichedSteps,
                pagination: [
                    totalCount: totalCount,
                    limit: limit,
                    offset: offset,
                    hasMore: (offset + limit) < totalCount,
                    pageCount: Math.ceil((totalCount / limit) as Double) as Integer
                ],
                filters: filters,
                sorting: [
                    sortBy: sortBy,
                    sortOrder: sortOrder
                ]
            ]
        }
    }
    
    /**
     * Gets summary statistics for steps by migration.
     * Following Sprint 3 aggregation patterns.
     * @param migrationId The UUID of the migration
     * @return Map containing step counts by various dimensions
     */
    Map getStepsSummary(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            def summaryData = [:]
            
            // Overall step counts
            def overallCounts = sql.firstRow('''
                SELECT 
                    COUNT(*) as total_steps,
                    COUNT(CASE WHEN sts.sts_name = 'COMPLETED' THEN 1 END) as completed_steps,
                    COUNT(CASE WHEN sts.sts_name = 'IN_PROGRESS' THEN 1 END) as in_progress_steps,
                    COUNT(CASE WHEN sts.sts_name = 'PENDING' THEN 1 END) as pending_steps,
                    COUNT(CASE WHEN sts.sts_name = 'OPEN' THEN 1 END) as open_steps,
                    AVG(stm.stm_duration_minutes) as avg_duration_minutes
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                LEFT JOIN status_sts sts ON sti.sti_status = sts.sts_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                WHERE ite.mig_id = :migrationId
            ''', [migrationId: migrationId])
            
            summaryData.overall = overallCounts
            
            // Steps by team
            def teamCounts = sql.rows('''
                SELECT 
                    tms.tms_name,
                    COUNT(*) as step_count,
                    COUNT(CASE WHEN sts.sts_name = 'COMPLETED' THEN 1 END) as completed_count
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                LEFT JOIN status_sts sts ON sti.sti_status = sts.sts_id
                LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                WHERE ite.mig_id = :migrationId
                GROUP BY tms.tms_name
                ORDER BY step_count DESC
            ''', [migrationId: migrationId])
            
            summaryData.byTeam = teamCounts
            
            // Steps by phase
            def phaseCounts = sql.rows('''
                SELECT 
                    phm.phm_name,
                    phm.phm_order,
                    COUNT(*) as step_count,
                    COUNT(CASE WHEN sts.sts_name = 'COMPLETED' THEN 1 END) as completed_count,
                    AVG(stm.stm_duration_minutes) as avg_duration_minutes
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                LEFT JOIN status_sts sts ON sti.sti_status = sts.sts_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                WHERE ite.mig_id = :migrationId
                GROUP BY phm.phm_name, phm.phm_order
                ORDER BY phm.phm_order
            ''', [migrationId: migrationId])
            
            summaryData.byPhase = phaseCounts
            
            // Steps by step type
            def typeCounts = sql.rows('''
                SELECT 
                    stm.stt_code,
                    COUNT(*) as step_count,
                    COUNT(CASE WHEN sts.sts_name = 'COMPLETED' THEN 1 END) as completed_count
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                LEFT JOIN status_sts sts ON sti.sti_status = sts.sts_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                WHERE ite.mig_id = :migrationId
                GROUP BY stm.stt_code
                ORDER BY step_count DESC
            ''', [migrationId: migrationId])
            
            summaryData.byType = typeCounts
            
            return summaryData
        }
    }
    
    /**
     * Gets progress tracking metrics for steps by migration.
     * @param migrationId The UUID of the migration
     * @return Map containing progress metrics and bottleneck analysis
     */
    Map getStepsProgress(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            def progressData = [:]
            
            // Overall progress metrics
            def progressMetrics = sql.firstRow('''
                SELECT 
                    COUNT(*) as total_steps,
                    COUNT(CASE WHEN sts.sts_name = 'COMPLETED' THEN 1 END) as completed_steps,
                    ROUND((COUNT(CASE WHEN sts.sts_name = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*)), 2) as completion_percentage,
                    SUM(stm.stm_duration_minutes) as total_estimated_minutes,
                    SUM(CASE WHEN sts.sts_name = 'COMPLETED' THEN stm.stm_duration_minutes ELSE 0 END) as completed_minutes,
                    MIN(sti.sti_start_time) as earliest_start,
                    MAX(sti.sti_end_time) as latest_completion
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                LEFT JOIN status_sts sts ON sti.sti_status = sts.sts_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                WHERE ite.mig_id = :migrationId
            ''', [migrationId: migrationId])
            
            progressData.overall = progressMetrics
            
            // Bottleneck analysis - steps taking longer than expected
            def bottlenecks = sql.rows('''
                SELECT 
                    sti.sti_id,
                    stm.stt_code || '-' || LPAD(stm.stm_number::text, 3, '0') as step_code,
                    stm.stm_name,
                    tms.tms_name as owner_team,
                    stm.stm_duration_minutes as estimated_minutes,
                    EXTRACT(EPOCH FROM (sti.sti_end_time - sti.sti_start_time))/60 as actual_minutes,
                    sts.sts_name as current_status
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                LEFT JOIN status_sts sts ON sti.sti_status = sts.sts_id
                LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                WHERE ite.mig_id = :migrationId
                    AND sti.sti_start_time IS NOT NULL
                    AND (sts.sts_name = 'IN_PROGRESS' OR sti.sti_end_time IS NOT NULL)
                    AND (
                        (sti.sti_end_time IS NULL AND EXTRACT(EPOCH FROM (NOW() - sti.sti_start_time))/60 > stm.stm_duration_minutes * 1.5)
                        OR 
                        (sti.sti_end_time IS NOT NULL AND EXTRACT(EPOCH FROM (sti.sti_end_time - sti.sti_start_time))/60 > stm.stm_duration_minutes * 1.2)
                    )
                ORDER BY 
                    CASE 
                        WHEN sti.sti_end_time IS NULL THEN EXTRACT(EPOCH FROM (NOW() - sti.sti_start_time))/60 - stm.stm_duration_minutes
                        ELSE EXTRACT(EPOCH FROM (sti.sti_end_time - sti.sti_start_time))/60 - stm.stm_duration_minutes
                    END DESC
                LIMIT 10
            ''', [migrationId: migrationId])
            
            progressData.bottlenecks = bottlenecks
            
            // Phase progress breakdown
            def phaseProgress = sql.rows('''
                SELECT 
                    phm.phm_name,
                    phm.phm_order,
                    COUNT(*) as total_steps,
                    COUNT(CASE WHEN sts.sts_name = 'COMPLETED' THEN 1 END) as completed_steps,
                    ROUND((COUNT(CASE WHEN sts.sts_name = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*)), 2) as completion_percentage,
                    SUM(stm.stm_duration_minutes) as total_estimated_minutes,
                    SUM(CASE WHEN sts.sts_name = 'COMPLETED' THEN stm.stm_duration_minutes ELSE 0 END) as completed_minutes
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                LEFT JOIN status_sts sts ON sti.sti_status = sts.sts_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                WHERE ite.mig_id = :migrationId
                GROUP BY phm.phm_name, phm.phm_order
                ORDER BY phm.phm_order
            ''', [migrationId: migrationId])
            
            progressData.phaseProgress = phaseProgress
            
            return progressData
        }
    }
    
    /**
     * Bulk update step instance status with transaction safety.
     * @param stepIds List of step instance UUIDs
     * @param statusId Integer status ID
     * @param userId User ID for audit logging
     * @return Map with success status and update results
     */
    Map bulkUpdateStepStatus(List<UUID> stepIds, Integer statusId, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
            return sql.withTransaction {
                try {
                    // Validate status exists
                    def status = sql.firstRow("SELECT sts_name FROM status_sts WHERE sts_id = :statusId AND sts_type = 'Step'", 
                        [statusId: statusId])
                    
                    if (!status) {
                        return [success: false, error: "Invalid status ID: ${statusId}"]
                    }
                    
                    def results = []
                    def successCount = 0
                    def errorCount = 0
                    
                    stepIds.each { stepId ->
                        try {
                            // Get current step data for notification
                            def stepInstance = sql.firstRow('''
                                SELECT 
                                    sti.sti_id, sti.sti_name, sti.stm_id, sti.sti_status,
                                    stm.stt_code, stm.stm_number, stm.tms_id_owner
                                FROM steps_instance_sti sti
                                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                                WHERE sti.sti_id = :stepId
                            ''', [stepId: stepId])
                            
                            if (!stepInstance) {
                                results.add([stepId: stepId, success: false, error: "Step not found"])
                                errorCount++
                                return
                            }
                            
                            def oldStatusId = stepInstance['sti_status']
                            
                            // Update the status
                            def updateCount = sql.executeUpdate('''
                                UPDATE steps_instance_sti 
                                SET sti_status = :statusId,
                                    sti_end_time = CASE WHEN :statusName = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE sti_end_time END,
                                    updated_by = CASE WHEN :userId IS NULL THEN 'confluence_user' ELSE :userId::varchar END,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE sti_id = :stepId
                            ''', [statusId: statusId, statusName: status.sts_name, userId: userId, stepId: stepId])
                            
                            if (updateCount == 1) {
                                results.add([stepId: stepId, success: true, oldStatus: oldStatusId, newStatus: statusId])
                                successCount++
                            } else {
                                results.add([stepId: stepId, success: false, error: "Update failed"])
                                errorCount++
                            }
                            
                        } catch (Exception e) {
                            results.add([stepId: stepId, success: false, error: e.message])
                            errorCount++
                        }
                    }
                    
                    return [
                        success: errorCount == 0,
                        successCount: successCount,
                        errorCount: errorCount,
                        totalCount: stepIds.size(),
                        results: results,
                        newStatus: status.sts_name
                    ]
                    
                } catch (Exception e) {
                    return [success: false, error: "Bulk operation failed: ${e.message}"]
                }
            }
        }
    }
    
    /**
     * Bulk assign steps to a team with transaction safety.
     * @param stepIds List of step instance UUIDs (targets step master for assignment)
     * @param teamId Integer team ID
     * @param userId User ID for audit logging
     * @return Map with success status and assignment results
     */
    Map bulkAssignSteps(List<UUID> stepIds, Integer teamId, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
            return sql.withTransaction {
                try {
                    // Validate team exists
                    def team = sql.firstRow("SELECT tms_name FROM teams_tms WHERE tms_id = :teamId", [teamId: teamId])
                    
                    if (!team) {
                        return [success: false, error: "Invalid team ID: ${teamId}"]
                    }
                    
                    def results = []
                    def successCount = 0
                    def errorCount = 0
                    
                    stepIds.each { stepId ->
                        try {
                            // Get step master ID from step instance
                            def stepData = sql.firstRow('''
                                SELECT sti.stm_id, stm.tms_id_owner as current_team_id
                                FROM steps_instance_sti sti
                                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                                WHERE sti.sti_id = :stepId
                            ''', [stepId: stepId])
                            
                            if (!stepData) {
                                results.add([stepId: stepId, success: false, error: "Step not found"])
                                errorCount++
                                return
                            }
                            
                            def oldTeamId = stepData.current_team_id
                            
                            // Update team assignment on master step
                            def updateCount = sql.executeUpdate('''
                                UPDATE steps_master_stm 
                                SET tms_id_owner = :teamId,
                                    updated_by = :userId,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE stm_id = :stmId
                            ''', [teamId: teamId, userId: userId ?: 'system', stmId: stepData['stm_id']])
                            
                            if (updateCount == 1) {
                                results.add([stepId: stepId, success: true, oldTeamId: oldTeamId, newTeamId: teamId])
                                successCount++
                            } else {
                                results.add([stepId: stepId, success: false, error: "Update failed"])
                                errorCount++
                            }
                            
                        } catch (Exception e) {
                            results.add([stepId: stepId, success: false, error: e.message])
                            errorCount++
                        }
                    }
                    
                    return [
                        success: errorCount == 0,
                        successCount: successCount,
                        errorCount: errorCount,
                        totalCount: stepIds.size(),
                        results: results,
                        newTeam: team.tms_name
                    ]
                    
                } catch (Exception e) {
                    return [success: false, error: "Bulk assignment failed: ${e.message}"]
                }
            }
        }
    }
    
    /**
     * Bulk reorder steps within phases with transaction safety.
     * @param stepReorderData List of maps with stepId and newOrder
     * @return Map with success status and reorder results
     */
    Map bulkReorderSteps(List<Map> stepReorderData) {
        DatabaseUtil.withSql { sql ->
            return sql.withTransaction {
                try {
                    def results = []
                    def successCount = 0
                    def errorCount = 0
                    
                    // Group by phase for efficient reordering
                    def stepsByPhase = stepReorderData.groupBy { reorderItem ->
                        def stepData = sql.firstRow('''
                            SELECT phi.phi_id
                            FROM steps_instance_sti sti
                            JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                            WHERE sti.sti_id = :stepId
                        ''', [stepId: reorderItem.stepId])
                        return stepData?.phi_id
                    }
                    
                    stepsByPhase.each { phaseId, stepsInPhase ->
                        if (!phaseId) return
                        
                        try {
                            // Sort steps in this phase by new order
                            def sortedSteps = stepsInPhase.sort { it.newOrder as Integer }
                            
                            // Update each step's order
                            sortedSteps.eachWithIndex { reorderItem, index ->
                                def newOrder = index + 1 // 1-based ordering
                                
                                def updateCount = sql.executeUpdate('''
                                    UPDATE steps_master_stm 
                                    SET stm_number = :newOrder,
                                        updated_by = 'system',
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE stm_id = (
                                        SELECT sti.stm_id 
                                        FROM steps_instance_sti sti 
                                        WHERE sti.sti_id = :stepId
                                    )
                                ''', [newOrder: newOrder, stepId: reorderItem.stepId])
                                
                                if (updateCount == 1) {
                                    results.add([stepId: reorderItem.stepId, success: true, newOrder: newOrder])
                                    successCount++
                                } else {
                                    results.add([stepId: reorderItem.stepId, success: false, error: "Reorder failed"])
                                    errorCount++
                                }
                            }
                            
                        } catch (Exception e) {
                            stepsInPhase.each { reorderItem ->
                                results.add([stepId: reorderItem.stepId, success: false, error: e.message])
                                errorCount++
                            }
                        }
                    }
                    
                    return [
                        success: errorCount == 0,
                        successCount: successCount,
                        errorCount: errorCount,
                        totalCount: stepReorderData.size(),
                        results: results
                    ]
                    
                } catch (Exception e) {
                    return [success: false, error: "Bulk reorder failed: ${e.message}"]
                }
            }
        }
    }
    
    // ==================== HELPER METHODS ====================
    
    /**
     * Sanitizes sort field to prevent SQL injection.
     */
    private String sanitizeSortField(String sortBy) {
        def allowedFields = [
            'stm_number', 'sti_name', 'stm_name', 'sti_status', 
            'sti_duration_minutes', 'sqm_order', 'phm_order',
            'tms_name', 'sti_start_time', 'sti_end_time'
        ]
        return sortBy in allowedFields ? sortBy : 'stm_number'
    }
    
    /**
     * Enhanced step instance enrichment with advanced metadata.
     */
    private Map<String, Object> enrichStepInstanceWithAdvancedMetadata(Map<String, Object> row) {
        return [
            id: row['sti_id'],
            stmId: row['stm_id'],
            sttCode: row['stt_code'] as String,
            stmNumber: row['stm_number'] as Integer,
            stepCode: "${row['stt_code']}-${String.format('%03d', row['stm_number'] as Integer)}",
            name: (row['sti_name'] ?: row['master_name']) as String,
            description: row['stm_description'] as String,
            status: (row['status_name'] ?: row['sti_status']) as String, // Backward compatibility
            statusMetadata: row['status_name'] ? [
                id: row['sti_status'] as Integer,
                name: row['status_name'] as String,
                color: row['sts_color'] as String,
                type: row['sts_type'] as String
            ] : null,
            durationMinutes: row['sti_duration_minutes'] as Integer,
            startTime: row['sti_start_time'],
            endTime: row['sti_end_time'],
            ownerTeamId: row['tms_id_owner'] as Integer,
            ownerTeamName: row['owner_team_name'] as String,
            // Hierarchy context
            sequenceId: row['sqm_id'],
            sequenceName: row['sqm_name'] as String,
            sequenceOrder: row['sqm_order'] as Integer,
            phaseId: row['phm_id'],
            phaseName: row['phm_name'] as String,
            phaseOrder: row['phm_order'] as Integer,
            planId: row['plm_id'],
            planName: row['plm_name'] as String,
            // Instance IDs for hierarchical filtering
            planInstanceId: row['pli_id'],
            sequenceInstanceId: row['sqi_id'],
            phaseInstanceId: row['phi_id'],
            iterationId: row['ite_id'],
            iterationName: row['ite_name'] as String,
            migrationId: row['mig_id'],
            migrationName: row['mig_name'] as String
        ] as Map
    }
}
