package umig.repository

import umig.utils.DatabaseUtil
import umig.utils.EmailService
import umig.utils.AuthenticationService
import umig.service.StepDataTransformationService
import umig.dto.StepInstanceDTO
import umig.dto.StepMasterDTO
// Note: Audit logging is temporarily disabled
// import umig.repository.InstructionRepository  // Not used
// import umig.repository.AuditLogRepository      // Temporarily disabled
import java.util.UUID
import java.sql.SQLException
import java.sql.Timestamp
import groovy.sql.Sql

/**
 * Repository for STEP master and instance data, including impacted teams and iteration scopes.
 */
class StepRepository {
    
    /**
     * Service for transforming database rows to StepInstanceDTO and StepMasterDTO
     * Following US-056F Dual DTO Architecture pattern
     */
    private final StepDataTransformationService transformationService = new StepDataTransformationService()
    /**
     * Fetches master STEP data by code and number.
     */
    def findStepMaster(String sttCode, Integer stmNumber) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow('''
                SELECT stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name, stm.stm_description
                FROM steps_master_stm stm
                WHERE stm.stt_code = :sttCode AND stm.stm_number = :stmNumber
            ''', [sttCode: sttCode, stmNumber: stmNumber])
        }
    }

    /**
     * Fetches all impacted team IDs for a STEP (from join table).
     */
    def findImpactedTeamIds(UUID stmId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows('''
                SELECT tms_id
                FROM steps_master_stm_x_teams_tms_impacted
                WHERE stm_id = :stmId
            ''', [stmId: stmId])*.tms_id
        }
    }

    /**
     * Fetches all iteration types for a STEP (from join table).
     */
    def findIterationScopes(String sttCode, Integer stmNumber) {
        DatabaseUtil.withSql { sql ->
            return sql.rows('''
                SELECT itt_id
                FROM steps_master_stm_x_iteration_types_itt
                WHERE stt_code = :sttCode AND stm_number = :stmNumber
            ''', [sttCode: sttCode, stmNumber: stmNumber])*.itt_id
        }
    }

    /**
     * Fetches all master steps with basic information for dropdowns
     * @return List of master steps with id, code, number, name, and type
     */
    def findAllMasterSteps() {
        DatabaseUtil.withSql { sql ->
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
            ''')        }
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
    def findMasterStepsWithFilters(Map filters, int pageNumber = 1, int pageSize = 50, String sortField = null, String sortDirection = 'asc') {
        DatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            def whereConditions = []
            def params = []
            
            // Build dynamic WHERE clause
            // Note: Status filtering removed for master steps as they don't have status
            // Status is only available for step instances (steps_instance_sti)
            
            // Owner ID filtering (phases own steps via phm_id)
            if (filters.ownerId) {
                whereConditions << "stm.phm_id = ?"
                params << UUID.fromString(filters.ownerId as String)
            }
            
            // Search functionality
            if (filters.search) {
                whereConditions << "(stm.stm_name ILIKE ? OR stm.stm_description ILIKE ?)"
                params << "%${filters.search}%".toString()
                params << "%${filters.search}%".toString()
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
            def totalCount = sql.firstRow(countQuery, params)?.total ?: 0
            
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
            
            def steps = sql.rows(dataQuery, params)
            def enrichedSteps = steps.collect { enrichMasterStepWithStatusMetadata(it) }
            
            return [
                data: enrichedSteps,
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
     * Enriches master step data without status information (master steps don't have status).
     * @param row Database row containing master step data
     * @return Enhanced step map suitable for Admin GUI
     */
    private Map enrichMasterStepWithStatusMetadata(Map row) {
        return [
            stm_id: row.stm_id,
            // Core step fields
            stm_name: row.stm_name,
            stm_description: row.stm_description,
            stm_number: row.stm_number,
            stm_order: row.stm_number, // Frontend expects stm_order, which corresponds to stm_number in database
            stm_duration_minutes: row.stm_duration_minutes,
            phm_id: row.phm_id,
            tms_id_owner: row.tms_id_owner,
            stt_code: row.stt_code,
            enr_id_target: row.enr_id_target,
            stm_id_predecessor: row.stm_id_predecessor,
            // NEW FIELDS - Additional attributes for VIEW modal display
            team_name: row.team_name,
            step_code: row.step_code,
            environment_role_name: row.environment_role_name,
            predecessor_name: row.predecessor_name,
            predecessor_code: row.predecessor_code,
            // Audit fields - added for VIEW modal display
            created_by: row.created_by,
            created_at: row.created_at,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            // Hierarchy fields from JOINs
            plm_name: row.plm_name,
            sqm_name: row.sqm_name,
            phm_name: row.phm_name,
            // Computed fields from joins
            instruction_count: row.instruction_count ?: 0,
            instance_count: row.instance_count ?: 0
            // Note: Master steps don't have status - status exists only on step instances
        ]
    }

    /**
     * Finds a single master step by ID with hierarchy data and computed fields
     * @param stepId The UUID of the master step
     * @return Map containing master step data or null if not found
     */
    def findMasterStepById(UUID stepId) {
        DatabaseUtil.withSql { sql ->
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
            
            return result ? enrichMasterStepWithStatusMetadata(result) : null
        }
    }

    /**
     * Fetches master steps filtered by migration ID
     * @param migrationId The UUID of the migration to filter by
     * @return List of master steps that belong to the specified migration
     */
    def findMasterStepsByMigrationId(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
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
        }
    }

    /**
     * Fetches the first step instance for a given master step, for the first plan instance of the first iteration/migration (per current MVP logic).
     */
    def findFirstStepInstance(String sttCode, Integer stmNumber) {
        DatabaseUtil.withSql { sql ->
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
        }
    }

    /**
     * Fetches filtered step instances for the runsheet with hierarchical filtering.
     * Returns steps grouped by sequence and phase with all required attributes.
     */
    List<Map> findFilteredStepInstances(Map filters) {
        DatabaseUtil.withSql { sql ->
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
            
            def params = [:]
            
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
            
            def results = sql.rows(query, params)
            
            // Transform results to frontend-compatible format
            return results.collect { row ->
                enrichStepInstanceWithStatusMetadata(row)
            } as List<Map>
        }
    }

    /**
     * Fetches all labels associated with a step master.
     * @param stmId The UUID of the step master
     * @return A list of labels with id, name, description, and color
     */
    def findLabelsByStepId(UUID stmId) {
        DatabaseUtil.withSql { sql ->
            def results = sql.rows('''
                SELECT l.lbl_id, l.lbl_name, l.lbl_description, l.lbl_color
                FROM labels_lbl l
                JOIN labels_lbl_x_steps_master_stm lxs ON l.lbl_id = lxs.lbl_id
                WHERE lxs.stm_id = :stmId
                ORDER BY l.lbl_name
            ''', [stmId: stmId])
            
            return results.collect { row ->
                [
                    id: row.lbl_id,
                    name: row.lbl_name,
                    description: row.lbl_description,
                    color: row.lbl_color
                ]
            }
        }
    }

    /**
     * Updates step instance status and sends notification emails.
     * @param stepInstanceId The UUID of the step instance
     * @param statusId The new status ID (Integer)
     * @param userId Optional user ID for audit logging
     * @return Map with success status and email send results
     */
    Map updateStepInstanceStatusWithNotification(UUID stepInstanceId, Integer statusId, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
            try {
                println "StepRepository.updateStepInstanceStatusWithNotification called:"
                println "  - stepInstanceId: ${stepInstanceId}"
                println "  - statusId: ${statusId}"
                println "  - userId: ${userId}"
                
                // Validate status exists and get status name
                def status = sql.firstRow("SELECT sts_id, sts_name FROM status_sts WHERE sts_id = :statusId AND sts_type = 'Step'", 
                    [statusId: statusId])
                
                if (!status) {
                    return [success: false, error: "Invalid status ID: ${statusId}"]
                }
                
                println "  - Status name: ${status.sts_name}"
                
                def statusName = status.sts_name
                
                // Get current step instance data with all fields needed for email templates
                def stepInstance = sql.firstRow('''
                    SELECT 
                        sti.sti_id, sti.sti_name, sti.sti_status, sti.stm_id, sti.sti_duration_minutes,
                        stm.stt_code as sti_code, stm.stm_number, stm.tms_id_owner, stm.stm_description as sti_description,
                        mig.mig_name as migration_name,
                        ite.ite_name as iteration_name,
                        plm.plm_name as plan_name,
                        owner_team.tms_name as team_name,
                        -- Environment information
                        enr.enr_name as environment_role_name,
                        env.env_name as environment_name,
                        -- Impacted teams (comma-separated list)
                        COALESCE(
                            STRING_AGG(impacted_team.tms_name, ', ' ORDER BY impacted_team.tms_name), 
                            ''
                        ) as impacted_teams,
                        -- Recent comments (for email template) - simple empty list for compatibility
                        '' as recentComments
                    FROM steps_instance_sti sti
                    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    LEFT JOIN teams_tms owner_team ON stm.tms_id_owner = owner_team.tms_id
                    LEFT JOIN environment_roles_enr enr ON sti.enr_id = enr.enr_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    -- Join to get actual environment name for this iteration and role
                    LEFT JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id AND eei.enr_id = sti.enr_id
                    LEFT JOIN environments_env env ON eei.env_id = env.env_id
                    -- Join to get impacted teams  
                    LEFT JOIN steps_master_stm_x_teams_tms_impacted impacted_rel ON stm.stm_id = impacted_rel.stm_id
                    LEFT JOIN teams_tms impacted_team ON impacted_rel.tms_id = impacted_team.tms_id
                    WHERE sti.sti_id = :stepInstanceId
                    GROUP BY sti.sti_id, sti.sti_name, sti.sti_status, sti.stm_id, sti.sti_duration_minutes,
                             stm.stt_code, stm.stm_number, stm.tms_id_owner, stm.stm_description,
                             mig.mig_name, ite.ite_name, plm.plm_name, owner_team.tms_name,
                             enr.enr_name, env.env_name
                ''', [stepInstanceId: stepInstanceId])
                
                if (!stepInstance) {
                    return [success: false, error: "Step instance not found"]
                }
                
                // Debug: Log all fields available in stepInstance
                println "  - Repository stepInstance fields: ${stepInstance.keySet()}"
                println "  - Repository stepInstance.recentComments: ${stepInstance.recentComments}"
                println "  - Repository stepInstance.impacted_teams: ${stepInstance.impacted_teams}"
                
                def oldStatusId = stepInstance.sti_status
                
                // Get old status name for notification
                def oldStatus = sql.firstRow("SELECT sts_name FROM status_sts WHERE sts_id = :oldStatusId", [oldStatusId: oldStatusId])?.sts_name
                
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
                    return [success: false, error: "Failed to update step status"]
                }
                
                // Get teams for notification (owner team + impacted teams)
                def teams = getTeamsForNotification(sql, stepInstance.stm_id as UUID, stepInstance.tms_id_owner as Integer)
                
                // Get IT cutover team (for now, we'll skip this since we don't have role field)
                def cutoverTeam = null
                
                // Send notification
                EmailService.sendStepStatusChangedNotification(
                    stepInstance as Map, 
                    teams, 
                    cutoverTeam as Map,
                    oldStatus as String, 
                    statusName as String,
                    userId
                )
                
                return [success: true, emailsSent: teams.size() + (cutoverTeam ? 1 : 0)]
                
            } catch (Exception e) {
                return [success: false, error: e.message]
            }
        }
    }

    /**
     * Marks a step instance as opened by a PILOT and sends notifications.
     * @param stepInstanceId The UUID of the step instance
     * @param userId Optional user ID for audit logging
     * @return Map with success status and email send results
     */
    Map openStepInstanceWithNotification(UUID stepInstanceId, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Get step instance data with all fields needed for email templates
                def stepInstance = sql.firstRow('''
                    SELECT 
                        sti.sti_id, sti.sti_name, sti.stm_id, sti.sti_status, sti.sti_duration_minutes,
                        stm.stt_code as sti_code, stm.stm_number, stm.tms_id_owner, stm.stm_description as sti_description,
                        mig.mig_name as migration_name,
                        ite.ite_name as iteration_name,
                        plm.plm_name as plan_name,
                        owner_team.tms_name as team_name,
                        -- Environment information
                        enr.enr_name as environment_role_name,
                        env.env_name as environment_name,
                        -- Impacted teams (comma-separated list)
                        COALESCE(
                            STRING_AGG(impacted_team.tms_name, ', ' ORDER BY impacted_team.tms_name), 
                            ''
                        ) as impacted_teams,
                        -- Recent comments (for email template) - simple empty list for compatibility
                        '' as recentComments
                    FROM steps_instance_sti sti
                    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    LEFT JOIN teams_tms owner_team ON stm.tms_id_owner = owner_team.tms_id
                    LEFT JOIN environment_roles_enr enr ON sti.enr_id = enr.enr_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    -- Join to get actual environment name for this iteration and role
                    LEFT JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id AND eei.enr_id = sti.enr_id
                    LEFT JOIN environments_env env ON eei.env_id = env.env_id
                    -- Join to get impacted teams  
                    LEFT JOIN steps_master_stm_x_teams_tms_impacted impacted_rel ON stm.stm_id = impacted_rel.stm_id
                    LEFT JOIN teams_tms impacted_team ON impacted_rel.tms_id = impacted_team.tms_id
                    WHERE sti.sti_id = :stepInstanceId
                    GROUP BY sti.sti_id, sti.sti_name, sti.sti_status, sti.stm_id, sti.sti_duration_minutes,
                             stm.stt_code, stm.stm_number, stm.tms_id_owner, stm.stm_description,
                             mig.mig_name, ite.ite_name, plm.plm_name, owner_team.tms_name,
                             enr.enr_name, env.env_name
                ''', [stepInstanceId: stepInstanceId])
                
                if (!stepInstance) {
                    return [success: false, error: "Step instance not found"]
                }
                
                // Check if already opened
                // Convert status ID to name for backward compatibility check
                def statusName = sql.firstRow("SELECT sts_name FROM status_sts WHERE sts_id = :statusId", [statusId: stepInstance.sti_status])?.sts_name
                if (statusName in ['OPEN', 'IN_PROGRESS', 'COMPLETED']) {
                    return [success: false, error: "Step has already been opened (status: ${stepInstance.sti_status})"]
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
                    return [success: false, error: "Failed to open step"]
                }
                
                // Get teams for notification
                def teams = getTeamsForNotification(sql, stepInstance.stm_id as UUID, stepInstance.tms_id_owner as Integer)
                
                // Send notification
                EmailService.sendStepOpenedNotification(
                    stepInstance as Map,
                    teams,
                    userId
                )
                
                return [success: true, emailsSent: teams.size()]
                
            } catch (Exception e) {
                return [success: false, error: e.message]
            }
        }
    }

    /**
     * Marks an instruction as completed and sends notifications.
     * @param instructionId The UUID of the instruction instance
     * @param stepInstanceId The UUID of the step instance
     * @param userId Optional user ID for audit logging
     * @return Map with success status and email send results
     */
    Map completeInstructionWithNotification(UUID instructionId, UUID stepInstanceId, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
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
                ''', [instructionId: instructionId])
                
                if (!instruction) {
                    return [success: false, error: "Instruction not found"]
                }
                
                // Check if already completed
                if (instruction.ini_is_completed) {
                    return [success: false, error: "Instruction already completed"]
                }
                
                // Get step instance data with all fields needed for email templates
                def stepInstance = sql.firstRow('''
                    SELECT 
                        sti.sti_id, sti.sti_name, sti.stm_id, sti.sti_duration_minutes,
                        stm.stt_code as sti_code, stm.stm_number, stm.tms_id_owner, stm.stm_description as sti_description,
                        mig.mig_name as migration_name,
                        ite.ite_name as iteration_name,
                        plm.plm_name as plan_name,
                        owner_team.tms_name as team_name,
                        -- Environment information
                        enr.enr_name as environment_role_name,
                        env.env_name as environment_name,
                        -- Impacted teams (comma-separated list)
                        COALESCE(
                            STRING_AGG(impacted_team.tms_name, ', ' ORDER BY impacted_team.tms_name), 
                            ''
                        ) as impacted_teams,
                        -- Recent comments (for email template) - simple empty list for compatibility
                        '' as recentComments
                    FROM steps_instance_sti sti
                    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    LEFT JOIN teams_tms owner_team ON stm.tms_id_owner = owner_team.tms_id
                    LEFT JOIN environment_roles_enr enr ON sti.enr_id = enr.enr_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    -- Join to get actual environment name for this iteration and role
                    LEFT JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id AND eei.enr_id = sti.enr_id
                    LEFT JOIN environments_env env ON eei.env_id = env.env_id
                    -- Join to get impacted teams  
                    LEFT JOIN steps_master_stm_x_teams_tms_impacted impacted_rel ON stm.stm_id = impacted_rel.stm_id
                    LEFT JOIN teams_tms impacted_team ON impacted_rel.tms_id = impacted_team.tms_id
                    WHERE sti.sti_id = :stepInstanceId
                    GROUP BY sti.sti_id, sti.sti_name, sti.sti_status, sti.stm_id, sti.sti_duration_minutes,
                             stm.stt_code, stm.stm_number, stm.tms_id_owner, stm.stm_description,
                             mig.mig_name, ite.ite_name, plm.plm_name, owner_team.tms_name,
                             enr.enr_name, env.env_name
                ''', [stepInstanceId: stepInstanceId])
                
                if (!stepInstance) {
                    return [success: false, error: "Step instance not found"]
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
                    return [success: false, error: "Failed to complete instruction"]
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
                
                // Get teams for notification - including instruction team
                def teams = getTeamsForNotificationWithInstructionTeam(
                    sql, 
                    stepInstance.stm_id as UUID, 
                    stepInstance.tms_id_owner as Integer,
                    instruction.instruction_team_id as Integer
                )
                
                // Send notification
                EmailService.sendInstructionCompletedNotification(
                    instruction as Map,
                    stepInstance as Map,
                    teams,
                    userId
                )
                
                return [success: true, emailsSent: teams.size()]
                
            } catch (Exception e) {
                return [success: false, error: e.message]
            }
        }
    }

    /**
     * Mark an instruction as incomplete and send notification to relevant teams.
     * @param instructionId The UUID of the instruction instance
     * @param stepInstanceId The UUID of the step instance
     * @param userId Optional user ID for audit logging
     * @return Map with success status and email send results
     */
    Map uncompleteInstructionWithNotification(UUID instructionId, UUID stepInstanceId, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
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
                ''', [instructionId: instructionId])
                
                if (!instruction) {
                    return [success: false, error: "Instruction not found"]
                }
                
                // Check if already incomplete
                if (!instruction.ini_is_completed) {
                    return [success: false, error: "Instruction is already incomplete"]
                }
                
                // Get step instance data with all fields needed for email templates
                def stepInstance = sql.firstRow('''
                    SELECT 
                        sti.sti_id, sti.sti_name, sti.stm_id, sti.sti_duration_minutes,
                        stm.stt_code as sti_code, stm.stm_number, stm.tms_id_owner, stm.stm_description as sti_description,
                        mig.mig_name as migration_name,
                        ite.ite_name as iteration_name,
                        plm.plm_name as plan_name,
                        owner_team.tms_name as team_name,
                        -- Environment information
                        enr.enr_name as environment_role_name,
                        env.env_name as environment_name,
                        -- Impacted teams (comma-separated list)
                        COALESCE(
                            STRING_AGG(impacted_team.tms_name, ', ' ORDER BY impacted_team.tms_name), 
                            ''
                        ) as impacted_teams,
                        -- Recent comments (for email template) - simple empty list for compatibility
                        '' as recentComments
                    FROM steps_instance_sti sti
                    JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    LEFT JOIN teams_tms owner_team ON stm.tms_id_owner = owner_team.tms_id
                    LEFT JOIN environment_roles_enr enr ON sti.enr_id = enr.enr_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    -- Join to get actual environment name for this iteration and role
                    LEFT JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id AND eei.enr_id = sti.enr_id
                    LEFT JOIN environments_env env ON eei.env_id = env.env_id
                    -- Join to get impacted teams  
                    LEFT JOIN steps_master_stm_x_teams_tms_impacted impacted_rel ON stm.stm_id = impacted_rel.stm_id
                    LEFT JOIN teams_tms impacted_team ON impacted_rel.tms_id = impacted_team.tms_id
                    WHERE sti.sti_id = :stepInstanceId
                    GROUP BY sti.sti_id, sti.sti_name, sti.sti_status, sti.stm_id, sti.sti_duration_minutes,
                             stm.stt_code, stm.stm_number, stm.tms_id_owner, stm.stm_description,
                             mig.mig_name, ite.ite_name, plm.plm_name, owner_team.tms_name,
                             enr.enr_name, env.env_name
                ''', [stepInstanceId: stepInstanceId])
                
                if (!stepInstance) {
                    return [success: false, error: "Step instance not found"]
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
                    return [success: false, error: "Failed to mark instruction as incomplete"]
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
                
                // Get teams for notification - including instruction team
                def teams = getTeamsForNotificationWithInstructionTeam(
                    sql, 
                    stepInstance.stm_id as UUID, 
                    stepInstance.tms_id_owner as Integer,
                    instruction.instruction_team_id as Integer
                )
                
                // Send notification
                EmailService.sendInstructionUncompletedNotification(
                    instruction as Map,
                    stepInstance as Map,
                    teams,
                    userId
                )
                
                return [success: true, emailsSent: teams.size()]
                
            } catch (Exception e) {
                return [success: false, error: e.message]
            }
        }
    }

    /**
     * Helper method to get all teams that should receive notifications for a step.
     * Includes owner team and impacted teams.
     */
    private List<Map> getTeamsForNotification(Sql sql, UUID stmId, Integer ownerTeamId) {
        def teams = []
        
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
        def uniqueTeams = teams.unique { team -> (team as Map).tms_id }
        
        return uniqueTeams as List<Map>
    }
    
    /**
     * Helper method to get all teams that should receive notifications for a step,
     * including the instruction-specific team.
     * Includes owner team, impacted teams, and instruction team.
     */
    private List<Map> getTeamsForNotificationWithInstructionTeam(Sql sql, UUID stmId, Integer ownerTeamId, Integer instructionTeamId) {
        def teams = []
        
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
        def uniqueTeams = teams.unique { team -> (team as Map).tms_id }
        
        return uniqueTeams as List<Map>
    }
    
    /**
     * Find step instance details by step instance ID (UUID)
     * @param stepInstanceId Step instance UUID
     * @return Step instance details with instructions and comments
     */
    def findStepInstanceDetailsById(UUID stepInstanceId) {
        DatabaseUtil.withSql { Sql sql ->
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
            ''', [stmId: stepInstance.stm_id])
            
            // Get impacted teams using the master step ID
            def impactedTeamIds = sql.rows('''
                SELECT tms_id
                FROM steps_master_stm_x_teams_tms_impacted
                WHERE stm_id = :stmId
            ''', [stmId: stepInstance.stm_id])*.tms_id
            
            def impactedTeams = []
            impactedTeamIds.each { teamId ->
                def team = sql.firstRow('SELECT tms_name FROM teams_tms WHERE tms_id = :teamId', [teamId: teamId])
                if (team) {
                    impactedTeams << team.tms_name
                }
            }
            
            // Get comments for this step instance
            def comments = findCommentsByStepInstanceId(stepInstanceId)
            
            // Get labels for this step (using master step ID)
            List labels = []
            if (stepInstance.stm_id) {
                try {
                    labels = findLabelsByStepId(stepInstance.stm_id as UUID) as List
                    println "DEBUG: Found ${labels.size()} labels for step ${stepInstance.stm_id}"
                } catch (Exception e) {
                    println "ERROR fetching labels: ${e.message}"
                }
            }
            
            return [
                stepSummary: [
                    ID: stepInstance.sti_id,
                    Name: stepInstance.sti_name ?: stepInstance.master_name,
                    Description: stepInstance.stm_description,
                    StatusID: stepInstance.sti_status,  // Changed from Status to StatusID for consistency
                    Duration: stepInstance.sti_duration_minutes ?: stepInstance.master_duration,
                    AssignedTeam: stepInstance.owner_team_name ?: 'Unassigned',
                    StepCode: "${stepInstance.stt_code}-${String.format('%03d', stepInstance.stm_number)}",
                    // Hierarchy information
                    MigrationName: stepInstance.migration_name,
                    IterationName: stepInstance.iteration_name,
                    PlanName: stepInstance.plan_name,
                    SequenceName: stepInstance.sequence_name,
                    PhaseName: stepInstance.phase_name,
                    // Predecessor information
                    PredecessorCode: stepInstance.predecessor_stt_code && stepInstance.predecessor_stm_number ? 
                        "${stepInstance.predecessor_stt_code}-${String.format('%03d', stepInstance.predecessor_stm_number)}" : null,
                    PredecessorName: stepInstance.predecessor_name,
                    // Environment role
                    TargetEnvironment: stepInstance.environment_role_name ? 
                        (stepInstance.environment_name ? 
                            "${stepInstance.environment_role_name} (${stepInstance.environment_name})" : 
                            "${stepInstance.environment_role_name} (!No Environment Assigned Yet!)") : 
                        'Not specified',
                    // Iteration types (scope)
                    IterationTypes: iterationTypes.collect { it.itt_code },
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
    def findStepInstanceDetailsByCode(String stepCode) {
        DatabaseUtil.withSql { Sql sql ->
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
            ''', [stmId: stepMaster.stm_id])
            
            if (!stepInstance) {
                // If no instance exists, return master data only
                // Get owner team name for master
                def ownerTeam = null
                if (stepMaster.tms_id_owner) {
                    ownerTeam = sql.firstRow('SELECT tms_name FROM teams_tms WHERE tms_id = :teamId', [teamId: stepMaster.tms_id_owner])
                }
                
                return [
                    stepSummary: [
                        ID: stepCode,
                        Name: stepMaster.stm_name,
                        Description: stepMaster.stm_description,
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
            ''', [stiId: stepInstance.sti_id])
            
            // Get impacted teams using the master step ID
            def impactedTeamIds = sql.rows('''
                SELECT tms_id
                FROM steps_master_stm_x_teams_tms_impacted
                WHERE stm_id = :stmId
            ''', [stmId: stepMaster.stm_id])*.tms_id
            
            def impactedTeams = []
            impactedTeamIds.each { teamId ->
                def team = sql.firstRow('SELECT tms_name FROM teams_tms WHERE tms_id = :teamId', [teamId: teamId])
                if (team) {
                    impactedTeams << team.tms_name
                }
            }
            
            // Get comments for this step instance
            def comments = findCommentsByStepInstanceId(stepInstance.sti_id as UUID)
            
            // Get labels for this step (using master step ID) - ADDED
            List labels = []
            if (stepMaster.stm_id) {
                try {
                    labels = findLabelsByStepId(stepMaster.stm_id as UUID) as List
                    println "DEBUG: Found ${labels.size()} labels for step ${stepMaster.stm_id}"
                } catch (Exception e) {
                    println "ERROR fetching labels: ${e.message}"
                }
            }
            
            return [
                stepSummary: [
                    ID: stepCode,
                    Name: stepInstance.sti_name ?: stepMaster.stm_name,
                    Description: stepMaster.stm_description,
                    // Changed to StatusID for consistency with findStepInstanceDetailsById
                    StatusID: stepInstance.sti_status,
                    AssignedTeam: stepInstance.owner_team_name ?: 'Unassigned',
                    Duration: stepMaster.stm_duration_minutes,
                    sti_id: stepInstance.sti_id?.toString(),  // Include step instance ID for comments
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
    private Map enrichStepInstanceWithStatusMetadata(Map row) {
        // Get status metadata if status is an ID
        def statusMetadata = null
        def statusName = row.sti_status
        
        if (row.sti_status instanceof Number) {
            // Status is already an ID, get the name and metadata
            def statusInfo = DatabaseUtil.withSql { sql ->
                sql.firstRow("SELECT sts_name, sts_color, sts_type FROM status_sts WHERE sts_id = :statusId", 
                    [statusId: row.sti_status])
            }
            if (statusInfo) {
                statusName = statusInfo.sts_name
                statusMetadata = [
                    id: row.sti_status,
                    name: statusInfo.sts_name,
                    color: statusInfo.sts_color,
                    type: statusInfo.sts_type
                ]
            }
        }
        
        return [
            id: row.sti_id,
            stmId: row.stm_id,
            sttCode: row.stt_code,
            stmNumber: row.stm_number,
            name: row.sti_name ?: row.master_name,
            status: statusName, // Backward compatibility - return status name as string
            durationMinutes: row.sti_duration_minutes,
            ownerTeamId: row.tms_id_owner,
            ownerTeamName: row.owner_team_name,
            // Hierarchy context
            sequenceId: row.sqm_id,
            sequenceName: row.sqm_name,
            sequenceNumber: row.sqm_order,
            phaseId: row.phm_id,
            phaseName: row.phm_name,
            phaseNumber: row.phm_order,
            planId: row.plm_id,
            planName: row.plm_name,
            iterationId: row.ite_id,
            iterationName: row.ite_name,
            migrationId: row.mig_id,
            migrationName: row.mig_name,
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
                    pageCount: Math.ceil(totalCount / (double) limit) as Integer
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
                            // Get current step data for notification with all fields needed for email templates
                            def stepInstance = sql.firstRow('''
                                SELECT 
                                    sti.sti_id, sti.sti_name, sti.stm_id, sti.sti_status, sti.sti_duration_minutes,
                                    stm.stt_code as sti_code, stm.stm_number, stm.tms_id_owner, stm.stm_description as sti_description,
                                    owner_team.tms_name as team_name
                                FROM steps_instance_sti sti
                                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                                LEFT JOIN teams_tms owner_team ON stm.tms_id_owner = owner_team.tms_id
                                WHERE sti.sti_id = :stepId
                            ''', [stepId: stepId])
                            
                            if (!stepInstance) {
                                results.add([stepId: stepId, success: false, error: "Step not found"])
                                errorCount++
                                return
                            }
                            
                            def oldStatusId = stepInstance.sti_status
                            
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
                            ''', [teamId: teamId, userId: userId ?: 'system', stmId: stepData.stm_id])
                            
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
    private Map enrichStepInstanceWithAdvancedMetadata(Map row) {
        return [
            id: row.sti_id,
            stmId: row.stm_id,
            sttCode: row.stt_code,
            stmNumber: row.stm_number,
            stepCode: "${row.stt_code}-${String.format('%03d', row.stm_number)}",
            name: row.sti_name ?: row.master_name,
            description: row.stm_description,
            status: row.status_name ?: row.sti_status, // Backward compatibility
            statusMetadata: row.status_name ? [
                id: row.sti_status,
                name: row.status_name,
                color: row.sts_color,
                type: row.sts_type
            ] : null,
            durationMinutes: row.sti_duration_minutes,
            startTime: row.sti_start_time,
            endTime: row.sti_end_time,
            ownerTeamId: row.tms_id_owner,
            ownerTeamName: row.owner_team_name,
            // Hierarchy context
            sequenceId: row.sqm_id,
            sequenceName: row.sqm_name,
            sequenceOrder: row.sqm_order,
            phaseId: row.phm_id,
            phaseName: row.phm_name,
            phaseOrder: row.phm_order,
            planId: row.plm_id,
            planName: row.plm_name,
            // Instance IDs for hierarchical filtering
            planInstanceId: row.pli_id,
            sequenceInstanceId: row.sqi_id,
            phaseInstanceId: row.phi_id,
            iterationId: row.ite_id,
            iterationName: row.ite_name,
            migrationId: row.mig_id,
            migrationName: row.mig_name
        ] as Map
    }
    
    // ========================================
    // US-056-A: DTO-BASED REPOSITORY METHODS
    // ========================================
    
    /**
     * Import the transformation service for DTO conversion
     */
    private static getTransformationService() {
        return new umig.service.StepDataTransformationService()
    }
    
    // ========================================
    // MASTER DTO METHODS (US-056F DUAL DTO ARCHITECTURE)
    // ========================================
    
    /**
     * Find step master by ID and return as StepMasterDTO
     * @param stepMasterId Step master ID (UUID)
     * @return StepMasterDTO or null if not found
     */
    def findMasterByIdAsDTO(UUID stepMasterId) {
        DatabaseUtil.withSql { sql ->
            def row = sql.firstRow('''
                SELECT stm.stm_id,
                       stm.stt_code,
                       stm.stm_number,
                       stm.stm_name,
                       stm.stm_description,
                       stm.phm_id,
                       stm.created_date,
                       stm.last_modified_date,
                       stm.is_active,
                       (SELECT COUNT(*) FROM instructions_master_inm 
                        WHERE inm.stm_id = stm.stm_id) as instruction_count,
                       (SELECT COUNT(*) FROM steps_instance_sti 
                        WHERE sti.stm_id = stm.stm_id) as instance_count
                FROM steps_master_stm stm
                WHERE stm.stm_id = :stepMasterId
            ''', [stepMasterId: stepMasterId])
            
            return row ? transformationService.fromMasterDatabaseRow(row) : null
        }
    }
    
    /**
     * Find all step masters and return as StepMasterDTOs
     * @return List of StepMasterDTOs
     */
    def findAllMastersAsDTO() {
        DatabaseUtil.withSql { sql ->
            def rows = sql.rows('''
                SELECT stm.stm_id,
                       stm.stt_code,
                       stm.stm_number,
                       stm.stm_name,
                       stm.stm_description,
                       stm.phm_id,
                       stm.created_date,
                       stm.last_modified_date,
                       stm.is_active,
                       (SELECT COUNT(*) FROM instructions_master_inm 
                        WHERE inm.stm_id = stm.stm_id) as instruction_count,
                       (SELECT COUNT(*) FROM steps_instance_sti 
                        WHERE sti.stm_id = stm.stm_id) as instance_count
                FROM steps_master_stm stm
                ORDER BY stm.stt_code, stm.stm_number
            ''')
            
            return transformationService.fromMasterDatabaseRows(rows as List<Map>)
        }
    }
    
    /**
     * Find step masters by phase ID and return as StepMasterDTOs
     * @param phaseId Phase master ID (UUID)
     * @return List of StepMasterDTOs for the phase
     */
    def findMastersByPhaseIdAsDTO(UUID phaseId) {
        DatabaseUtil.withSql { sql ->
            def rows = sql.rows('''
                SELECT stm.stm_id,
                       stm.stt_code,
                       stm.stm_number,
                       stm.stm_name,
                       stm.stm_description,
                       stm.phm_id,
                       stm.created_date,
                       stm.last_modified_date,
                       stm.is_active,
                       (SELECT COUNT(*) FROM instructions_master_inm 
                        WHERE inm.stm_id = stm.stm_id) as instruction_count,
                       (SELECT COUNT(*) FROM steps_instance_sti 
                        WHERE sti.stm_id = stm.stm_id) as instance_count
                FROM steps_master_stm stm
                WHERE stm.phm_id = :phaseId
                ORDER BY stm.stm_number
            ''', [phaseId: phaseId])
            
            return transformationService.fromMasterDatabaseRows(rows as List<Map>)
        }
    }
    
    // ========================================
    // INSTANCE DTO METHODS (RENAMED FOR CLARITY)
    // ========================================
    
    /**
     * Find step by ID and return as StepInstanceDTO (renamed from findByIdAsDTO)
     * @param stepId Step master or instance ID
     * @return StepInstanceDTO or null if not found
     */
    def findByIdAsDTO(UUID stepId) {
        DatabaseUtil.withSql { sql ->
            def row = sql.firstRow(buildDTOBaseQuery() + '''
                WHERE (stm.stm_id = :stepId OR sti.sti_id = :stepId)
                AND sti.sti_is_active = true
            ''', [stepId: stepId])
            
            return row ? transformationService.fromDatabaseRow(row) : null
        }
    }
    
    /**
     * Find step by instance ID and return as StepInstanceDTO  
     * @param stepInstanceId Step instance ID
     * @return StepInstanceDTO or null if not found
     */
    def findByInstanceIdAsDTO(UUID stepInstanceId) {
        DatabaseUtil.withSql { sql ->
            def row = sql.firstRow(buildDTOBaseQuery() + '''
                WHERE sti.sti_id = :stepInstanceId
                AND sti.sti_is_active = true
            ''', [stepInstanceId: stepInstanceId])
            
            return row ? transformationService.fromDatabaseRow(row) : null
        }
    }
    
    /**
     * Find all steps in a phase and return as StepInstanceDTO list
     * @param phaseId Phase ID (use instance ID for proper hierarchical filtering)
     * @return List of StepInstanceDTOs
     */
    def findByPhaseIdAsDTO(UUID phaseId) {
        DatabaseUtil.withSql { sql ->
            def rows = sql.rows(buildDTOBaseQuery() + '''
                WHERE (phi.phi_id = :phaseId OR stm.phm_id = :phaseId)
                AND sti.sti_is_active = true
                ORDER BY stm.stm_order, sti.sti_created_date
            ''', [phaseId: phaseId])
            
            return transformationService.batchTransformFromDatabaseRows(rows as List<Map>)
        }
    }
    
    /**
     * Find all steps in a migration and return as StepDataTransferObject list
     * @param migrationId Migration ID  
     * @return List of StepDataTransferObjects
     */
    def findByMigrationIdAsDTO(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            def rows = sql.rows(buildDTOBaseQuery() + '''
                WHERE mig.mig_id = :migrationId
                AND sti.sti_is_active = true
                ORDER BY sqm.sqm_order, phm.phm_order, stm.stm_order, sti.sti_created_date
            ''', [migrationId: migrationId])
            
            return transformationService.batchTransformFromDatabaseRows(rows as List<Map>)
        }
    }
    
    /**
     * Find all steps in an iteration and return as StepDataTransferObject list
     * @param iterationId Iteration ID
     * @return List of StepDataTransferObjects  
     */
    def findByIterationIdAsDTO(UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            def rows = sql.rows(buildDTOBaseQuery() + '''
                WHERE ite.ite_id = :iterationId
                AND sti.sti_is_active = true
                ORDER BY sqm.sqm_order, phm.phm_order, stm.stm_order, sti.sti_created_date
            ''', [iterationId: iterationId])
            
            return transformationService.batchTransformFromDatabaseRows(rows as List<Map>)
        }
    }
    
    /**
     * Find steps by status and return as StepDataTransferObject list
     * @param status Step status (PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
     * @param limit Maximum number of results (default: 100)
     * @return List of StepDataTransferObjects
     */
    def findByStatusAsDTO(String status, int limit = 100) {
        DatabaseUtil.withSql { sql ->
            def rows = sql.rows(buildDTOBaseQuery() + '''
                WHERE sti.sti_status = :status
                AND sti.sti_is_active = true
                ORDER BY sti.sti_priority DESC, sti.sti_last_modified_date DESC
                LIMIT :limit
            ''', [status: status, limit: limit])
            
            return transformationService.batchTransformFromDatabaseRows(rows as List<Map>)
        }
    }
    
    /**
     * Find steps assigned to a team and return as StepDataTransferObject list
     * @param teamId Team ID
     * @return List of StepDataTransferObjects
     */
    def findByAssignedTeamIdAsDTO(UUID teamId) {
        DatabaseUtil.withSql { sql ->
            def rows = sql.rows(buildDTOBaseQuery() + '''
                WHERE tms.tms_id = :teamId
                AND sti.sti_is_active = true
                ORDER BY sti.sti_priority DESC, sti.sti_status, sti.sti_created_date
            ''', [teamId: teamId])
            
            return transformationService.batchTransformFromDatabaseRows(rows as List<Map>)
        }
    }
    
    /**
     * Find steps with active comments and return as StepDataTransferObject list
     * @param limit Maximum number of results (default: 50)  
     * @return List of StepDataTransferObjects
     */
    def findStepsWithActiveCommentsAsDTO(int limit = 50) {
        DatabaseUtil.withSql { sql ->
            def rows = sql.rows(buildDTOBaseQuery() + '''
                WHERE comment_count > 0
                AND sti.sti_is_active = true
                ORDER BY last_comment_date DESC
                LIMIT :limit
            ''', [limit: limit])
            
            return transformationService.batchTransformFromDatabaseRows(rows as List<Map>)
        }
    }
    
    /**
     * Create a new step from StepDataTransferObject
     * Supports both step master and step instance creation
     * 
     * @param stepDTO Step data transfer object to create
     * @return Created StepDataTransferObject with generated IDs
     * @throws IllegalArgumentException If required fields are missing
     * @throws SQLException If database constraint violations occur
     */
    def createDTO(StepDataTransferObject stepDTO) {
        if (!stepDTO) {
            throw new IllegalArgumentException("StepDataTransferObject cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                UUID newInstanceId
                sql.withTransaction { txnSql ->
                    UUID newStepId
                    
                    // For DTO-based operations, we work with step instances directly
                    // Master step creation is handled separately if needed
                    if (!stepDTO.stepId) {
                        if (!stepDTO.stepType || !stepDTO.stepName) {
                            throw new IllegalArgumentException("Step creation requires stepType and stepName")
                        }
                        
                        newStepId = UUID.randomUUID()
                        stepDTO.stepId = newStepId.toString()
                        
                        // Note: Master step creation would be handled by a separate service
                        // For now, we'll create the instance with a generated master ID
                        def masterParams = [
                            stm_id: newStepId,
                            stt_code: stepDTO.stepType,
                            stm_number: 1, // Default step number for DTO operations
                            stm_name: stepDTO.stepName,
                            stm_description: stepDTO.stepDescription,
                            phm_id: stepDTO.phaseId ? UUID.fromString(stepDTO.phaseId) : null,
                            stm_order: 1, // Default order for DTO operations
                            stm_estimated_duration: stepDTO.estimatedDuration,
                            stm_is_critical: false, // Default for DTO operations
                            stm_created_date: new Timestamp(System.currentTimeMillis()),
                            stm_last_modified_date: new Timestamp(System.currentTimeMillis())
                        ]
                        
                        def insertMasterSql = '''
                            INSERT INTO steps_master_stm (
                                stm_id, stt_code, stm_number, stm_name, stm_description, phm_id,
                                stm_order, stm_estimated_duration, stm_is_critical, 
                                stm_created_date, stm_last_modified_date
                            ) VALUES (
                                :stm_id, :stt_code, :stm_number, :stm_name, :stm_description, :phm_id,
                                :stm_order, :stm_estimated_duration, :stm_is_critical,
                                :stm_created_date, :stm_last_modified_date
                            )
                        '''
                        
                        sql.executeUpdate(insertMasterSql, masterParams)
                        // stepId is already set above for DTO consistency
                    } else {
                        newStepId = UUID.fromString(stepDTO.stepId)
                    }
                    
                    // Create step instance if required data is present
                    newInstanceId = UUID.randomUUID()
                    
                    def instanceParams = [
                        sti_id: newInstanceId,
                        stm_id: newStepId,
                        phi_id: stepDTO.phaseId ? UUID.fromString(stepDTO.phaseId) : null,
                        tms_id: stepDTO.assignedTeamId ? UUID.fromString(stepDTO.assignedTeamId) : null,
                        sti_name: stepDTO.stepName,
                        sti_description: stepDTO.stepDescription,
                        sti_status: stepDTO.stepStatus ?: 'PENDING',
                        sti_priority: stepDTO.priority ?: 5,
                        sti_planned_start_date: stepDTO.createdDate ? Timestamp.valueOf(stepDTO.createdDate) : null,
                        sti_planned_end_date: stepDTO.lastModifiedDate ? Timestamp.valueOf(stepDTO.lastModifiedDate) : null,
                        sti_is_active: stepDTO.isActive ?: true,
                        sti_created_date: new Timestamp(System.currentTimeMillis()),
                        sti_last_modified_date: new Timestamp(System.currentTimeMillis())
                    ]
                    
                    def insertInstanceSql = '''
                        INSERT INTO steps_instance_sti (
                            sti_id, stm_id, phi_id, tms_id, sti_name, sti_description,
                            sti_status, sti_priority, sti_planned_start_date, sti_planned_end_date,
                            sti_is_active, sti_created_date, sti_last_modified_date
                        ) VALUES (
                            :sti_id, :stm_id, :phi_id, :tms_id, :sti_name, :sti_description,
                            :sti_status, :sti_priority, :sti_planned_start_date, :sti_planned_end_date,
                            :sti_is_active, :sti_created_date, :sti_last_modified_date
                        )
                    '''
                    
                    sql.executeUpdate(insertInstanceSql, instanceParams)
                    stepDTO.stepInstanceId = newInstanceId
                    
                    // Handle impacted teams relationships
                    // Note: StepDataTransferObject currently doesn't support impacted teams collection
                    // This would need to be handled by a separate service method if required
                    // For now, we'll use the assignedTeamId as a default relationship
                    if (stepDTO.assignedTeamId) {
                        def teamParams = [stm_id: newStepId, tms_id: UUID.fromString(stepDTO.assignedTeamId)]
                        def insertTeamSql = '''
                            INSERT INTO steps_master_stm_x_teams_tms_impacted (stm_id, tms_id)
                            VALUES (:stm_id, :tms_id)
                        '''
                        sql.executeUpdate(insertTeamSql, teamParams)
                    }
                    
                    // Handle iteration types relationships
                    // Note: StepDataTransferObject currently doesn't support iteration types collection
                    // This would need to be handled by a separate service method if required
                    // For now, we'll skip this relationship as it's not available in the DTO
                    // If needed, this could be added to the DTO in a future enhancement
                }
                
                // Return the created DTO with populated IDs
                // Use the step instance ID we just created
                stepDTO.stepInstanceId = newInstanceId.toString()
                return findByIdAsDTO(newInstanceId)
                
            } catch (SQLException e) {
                // Map SQL states to appropriate HTTP codes following ADR pattern
                if (e.getSQLState() == '23503') { // Foreign key constraint
                    throw new IllegalArgumentException("Referenced entity not found: ${e.message}", e)
                } else if (e.getSQLState() == '23505') { // Unique constraint
                    throw new IllegalStateException("Step already exists: ${e.message}", e)
                }
                throw e
            }
        }
    }
    
    /**
     * Update an existing step from StepDataTransferObject
     * Supports both step master and step instance updates with optimistic locking
     * 
     * @param stepDTO Step data transfer object to update
     * @return Updated StepDataTransferObject
     * @throws IllegalArgumentException If stepDTO is invalid or required IDs are missing
     * @throws IllegalStateException If optimistic locking fails or record not found
     * @throws SQLException If database constraint violations occur
     */
    def updateDTO(StepDataTransferObject stepDTO) {
        if (!stepDTO) {
            throw new IllegalArgumentException("StepDataTransferObject cannot be null")
        }
        if (!stepDTO.stepInstanceId && !stepDTO.stepId) {
            throw new IllegalArgumentException("Either stepInstanceId or stepId must be provided for updates")
        }
        
        return DatabaseUtil.withSql { sql ->
            try {
                sql.withTransaction { txnSql ->
                    def now = new Timestamp(System.currentTimeMillis())
                    def updated = false
                    
                    // Update step master if stepId is provided and data has changed
                    if (stepDTO.stepId) {
                        def masterParams = [
                            stm_id: UUID.fromString(stepDTO.stepId),
                            stt_code: stepDTO.stepType,
                            stm_number: 1, // Default for DTO operations
                            stm_name: stepDTO.stepName,
                            stm_description: stepDTO.stepDescription,
                            phm_id: stepDTO.phaseId ? UUID.fromString(stepDTO.phaseId) : null,
                            stm_order: 1, // Default for DTO operations
                            stm_estimated_duration: stepDTO.estimatedDuration,
                            stm_is_critical: false, // Default for DTO operations
                            stm_last_modified_date: now
                        ]
                        
                        def updateMasterSql = '''
                            UPDATE steps_master_stm SET
                                stt_code = :stt_code,
                                stm_number = :stm_number,
                                stm_name = :stm_name,
                                stm_description = :stm_description,
                                phm_id = :phm_id,
                                stm_order = :stm_order,
                                stm_estimated_duration = :stm_estimated_duration,
                                stm_is_critical = :stm_is_critical,
                                stm_last_modified_date = :stm_last_modified_date
                            WHERE stm_id = :stm_id
                        '''
                        
                        def masterUpdateCount = sql.executeUpdate(updateMasterSql, masterParams)
                        if (masterUpdateCount == 0) {
                            throw new IllegalStateException("Step master not found or no changes applied: ${stepDTO.stepId}")
                        }
                        updated = true
                        
                        // Update impacted teams relationships
                        // First, remove existing relationships
                        sql.executeUpdate('''
                            DELETE FROM steps_master_stm_x_teams_tms_impacted 
                            WHERE stm_id = :stm_id
                        ''', [stm_id: UUID.fromString(stepDTO.stepId)])
                        
                        // Add new relationships - using assignedTeamId as default
                        if (stepDTO.assignedTeamId) {
                            def teamParams = [stm_id: UUID.fromString(stepDTO.stepId), tms_id: UUID.fromString(stepDTO.assignedTeamId)]
                            def insertTeamSql = '''
                                INSERT INTO steps_master_stm_x_teams_tms_impacted (stm_id, tms_id)
                                VALUES (:stm_id, :tms_id)
                            '''
                            sql.executeUpdate(insertTeamSql, teamParams)
                        }
                        
                        // Update iteration types relationships
                        // First, remove existing relationships
                        sql.executeUpdate('''
                            DELETE FROM steps_master_stm_x_iteration_types_itt 
                            WHERE stm_id = :stm_id
                        ''', [stm_id: UUID.fromString(stepDTO.stepId)])
                        
                        // Skip iteration types relationships - not supported in current DTO
                        // This would need to be handled by a separate service method if required
                    }
                    
                    // Update step instance if stepInstanceId is provided
                    if (stepDTO.stepInstanceId) {
                        def instanceParams = [
                            sti_id: UUID.fromString(stepDTO.stepInstanceId),
                            phi_id: stepDTO.phaseId ? UUID.fromString(stepDTO.phaseId) : null,
                            tms_id: stepDTO.assignedTeamId ? UUID.fromString(stepDTO.assignedTeamId) : null,
                            sti_name: stepDTO.stepName,
                            sti_description: stepDTO.stepDescription,
                            sti_status: stepDTO.stepStatus,
                            sti_priority: stepDTO.priority,
                            sti_planned_start_date: stepDTO.createdDate ? Timestamp.valueOf(stepDTO.createdDate) : null,
                            sti_planned_end_date: stepDTO.lastModifiedDate ? Timestamp.valueOf(stepDTO.lastModifiedDate) : null,
                            sti_actual_start_date: null, // Not available in current DTO
                            sti_actual_end_date: null, // Not available in current DTO
                            sti_last_modified_date: now
                        ]
                        
                        def updateInstanceSql = '''
                            UPDATE steps_instance_sti SET
                                phi_id = :phi_id,
                                tms_id = :tms_id,
                                sti_name = :sti_name,
                                sti_description = :sti_description,
                                sti_status = :sti_status,
                                sti_priority = :sti_priority,
                                sti_planned_start_date = :sti_planned_start_date,
                                sti_planned_end_date = :sti_planned_end_date,
                                sti_actual_start_date = :sti_actual_start_date,
                                sti_actual_end_date = :sti_actual_end_date,
                                sti_last_modified_date = :sti_last_modified_date
                            WHERE sti_id = :sti_id AND sti_is_active = true
                        '''
                        
                        def instanceUpdateCount = sql.executeUpdate(updateInstanceSql, instanceParams)
                        if (instanceUpdateCount == 0) {
                            throw new IllegalStateException("Step instance not found or no changes applied: ${stepDTO.stepInstanceId}")
                        }
                        updated = true
                    }
                    
                    if (!updated) {
                        throw new IllegalStateException("No updates performed - invalid or unchanged data")
                    }
                }
                
                // Return the updated DTO
                def targetId = stepDTO.stepInstanceId ?: stepDTO.stepId
                return findByIdAsDTO(UUID.fromString(targetId as String))
            } catch (SQLException e) {
                // Map SQL states to appropriate HTTP codes following ADR pattern
                if (e.getSQLState() == '23503') { // Foreign key constraint
                    throw new IllegalArgumentException("Referenced entity not found: ${e.message}", e)
                } else if (e.getSQLState() == '23505') { // Unique constraint
                    throw new IllegalStateException("Duplicate entry: ${e.message}", e)
                }
                throw e
            }
        }
    }
    
    /**
     * Save (create or update) a step from StepDataTransferObject
     * Determines whether to create or update based on presence of IDs
     * 
     * @param stepDTO Step data transfer object to save
     * @return Saved StepDataTransferObject
     */
    def saveDTO(StepDataTransferObject stepDTO) {
        if (!stepDTO) {
            throw new IllegalArgumentException("StepDataTransferObject cannot be null")
        }
        
        // Determine if this is a create or update operation
        if (stepDTO.stepInstanceId || stepDTO.stepId) {
            // If IDs are present, verify the entity exists
            def targetId = stepDTO.stepInstanceId ?: stepDTO.stepId
            def existing = findByIdAsDTO(UUID.fromString(targetId as String))
            if (existing) {
                return updateDTO(stepDTO)
            }
        }
        
        // If no existing entity found or no IDs provided, create new
        return createDTO(stepDTO)
    }
    
    /**
     * Batch save multiple steps from StepDataTransferObject list
     * Optimized for performance with transaction management
     * 
     * @param stepDTOs List of Step data transfer objects to save
     * @return List of saved StepDataTransferObjects
     */
    def batchSaveDTO(List<StepDataTransferObject> stepDTOs) {
        if (!stepDTOs) {
            return []
        }
        
        def results = []
        DatabaseUtil.withSql { sql ->
            sql.withTransaction { txnSql ->
                stepDTOs.each { stepDTO ->
                    results.add(saveDTO(stepDTO))
                }
            }
        }
        
        return results
    }
    
    /**
     * Build the comprehensive base query for DTO population
     * This query includes all fields needed for StepDataTransferObject construction
     * @return SQL query string
     */
    private String buildDTOBaseQuery() {
        return '''
            SELECT 
                -- Core step identification
                stm.stm_id,
                sti.sti_id,
                COALESCE(sti.sti_name, stm.stm_name) as stm_name,
                COALESCE(sti.sti_description, stm.stm_description) as stm_description,
                sti.sti_status as step_status,
                
                -- Team assignment
                tms.tms_id,
                tms.tms_name as team_name,
                
                -- Hierarchical context  
                mig.mig_id as migration_id,
                mig.mig_code as migration_code,
                ite.ite_id as iteration_id,
                ite.ite_code as iteration_code,
                sqm.sqm_id as sequence_id,
                phm.phm_id as phase_id,
                
                -- Temporal fields
                sti.sti_created_date as created_date,
                sti.sti_last_modified_date as last_modified_date,
                sti.sti_is_active as is_active,
                sti.sti_priority as priority,
                
                -- Extended metadata
                stt.stt_code as step_type,
                stt.stt_name as step_category,
                stm.stm_estimated_duration as estimated_duration,
                sti.sti_actual_duration as actual_duration,
                
                -- Progress tracking with computed values
                COALESCE(dep_counts.dependency_count, 0) as dependency_count,
                COALESCE(dep_counts.completed_dependencies, 0) as completed_dependencies,
                COALESCE(inst_counts.instruction_count, 0) as instruction_count,
                COALESCE(inst_counts.completed_instructions, 0) as completed_instructions,
                
                -- Comment integration
                COALESCE(comment_counts.comment_count, 0) as comment_count,
                CASE WHEN comment_counts.comment_count > 0 THEN true ELSE false END as has_active_comments,
                comment_counts.last_comment_date
                
            FROM steps_instance_sti sti
            JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
            JOIN step_types_stt stt ON stm.stt_code = stt.stt_code
            
            -- Hierarchical joins
            JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
            JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
            
            -- Instance hierarchy for proper filtering
            LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
            LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
            LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
            
            -- Migration and iteration context
            LEFT JOIN migrations_mig mig ON pli.mig_id = mig.mig_id
            LEFT JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
            
            -- Team assignment
            LEFT JOIN teams_tms tms ON sti.assigned_team_id = tms.tms_id
            
            -- Dependency counts subquery
            LEFT JOIN (
                SELECT 
                    sti_id,
                    COUNT(*) as dependency_count,
                    SUM(CASE WHEN dependency_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_dependencies
                FROM step_dependencies_sde 
                WHERE is_active = true
                GROUP BY sti_id
            ) dep_counts ON sti.sti_id = dep_counts.sti_id
            
            -- Instruction counts subquery
            LEFT JOIN (
                SELECT 
                    sti_id,
                    COUNT(*) as instruction_count,
                    SUM(CASE WHEN ini_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_instructions
                FROM instructions_instance_ini
                WHERE ini_is_active = true
                GROUP BY sti_id
            ) inst_counts ON sti.sti_id = inst_counts.sti_id
            
            -- Comment counts and latest comment date
            LEFT JOIN (
                SELECT 
                    sti_id,
                    COUNT(*) as comment_count,
                    MAX(created_at) as last_comment_date
                FROM step_instance_comments_sic
                WHERE is_active = true
                GROUP BY sti_id
            ) comment_counts ON sti.sti_id = comment_counts.sti_id
        '''
    }
    
    /**
     * Find steps with filters and return as StepDataTransferObject list with pagination
     * Enhanced version of existing findMasterStepsWithFilters that returns DTOs
     * @param filters Map of filter parameters  
     * @param pageNumber Page number (1-based)
     * @param pageSize Number of items per page
     * @param sortField Field to sort by
     * @param sortDirection Sort direction (asc/desc)
     * @return Map with DTO data, pagination info, and filters
     */
    def findStepsWithFiltersAsDTO(Map filters, int pageNumber = 1, int pageSize = 50, String sortField = 'created_date', String sortDirection = 'desc') {
        DatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            def whereConditions = []
            def params = [:]
            
            // Build dynamic WHERE clause
            if (filters.migrationId) {
                whereConditions << "mig.mig_id = :migrationId"
                params.migrationId = UUID.fromString(filters.migrationId as String)
            }
            
            if (filters.iterationId) {
                whereConditions << "ite.ite_id = :iterationId"
                params.iterationId = UUID.fromString(filters.iterationId as String)
            }
            
            if (filters.assignedTeamId) {
                whereConditions << "tms.tms_id = :assignedTeamId"
                params.assignedTeamId = UUID.fromString(filters.assignedTeamId as String)
            }
            
            if (filters.status) {
                whereConditions << "sti.sti_status = :status"
                params.status = filters.status as String
            }
            
            if (filters.stepType) {
                whereConditions << "stt.stt_code = :stepType"
                params.stepType = filters.stepType as String
            }
            
            if (filters.priority) {
                whereConditions << "sti.sti_priority = :priority"
                params.priority = Integer.parseInt(filters.priority as String)
            }
            
            if (filters.hasActiveComments) {
                if (filters.hasActiveComments as Boolean) {
                    whereConditions << "comment_counts.comment_count > 0"
                } else {
                    whereConditions << "(comment_counts.comment_count IS NULL OR comment_counts.comment_count = 0)"
                }
            }
            
            // Always filter for active step instances
            whereConditions << "sti.sti_is_active = true"
            
            def whereClause = whereConditions ? "WHERE ${whereConditions.join(' AND ')}" : ""
            
            // Build ORDER BY clause with safe field mapping
            def sortFieldMap = [
                'created_date': 'sti.sti_created_date',
                'modified_date': 'sti.sti_last_modified_date', 
                'name': 'stm_name',
                'status': 'sti.sti_status',
                'priority': 'sti.sti_priority',
                'team': 'tms.tms_name'
            ]
            
            def actualSortField = sortFieldMap[sortField] ?: 'sti.sti_created_date'
            def actualSortDirection = (sortDirection?.toLowerCase() == 'asc') ? 'ASC' : 'DESC'
            def orderByClause = "ORDER BY ${actualSortField} ${actualSortDirection}"
            
            // Execute count query for pagination
            def countQuery = """
                SELECT COUNT(DISTINCT sti.sti_id)
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                JOIN step_types_stt stt ON stm.stt_code = stt.stt_code
                JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                LEFT JOIN migrations_mig mig ON pli.mig_id = mig.mig_id
                LEFT JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                LEFT JOIN teams_tms tms ON sti.assigned_team_id = tms.tms_id
                LEFT JOIN (
                    SELECT sti_id, COUNT(*) as comment_count
                    FROM step_instance_comments_sic
                    WHERE is_active = true
                    GROUP BY sti_id
                ) comment_counts ON sti.sti_id = comment_counts.sti_id
                ${whereClause}
            """
            
            def totalCount = sql.firstRow(countQuery, params)[0] as Integer
            def totalPages = Math.ceil(totalCount / (double) pageSize) as Integer
            
            // Execute main query with pagination  
            def offset = (pageNumber - 1) * pageSize
            params.limit = pageSize
            params.offset = offset
            
            def dataQuery = buildDTOBaseQuery() + """
                ${whereClause}
                ${orderByClause}
                LIMIT :limit OFFSET :offset
            """
            
            def rows = sql.rows(dataQuery, params)
            def dtos = transformationService.batchTransformFromDatabaseRows(rows as List<Map>)
            
            return [
                data: dtos,
                pagination: [
                    currentPage: pageNumber,
                    pageSize: pageSize,
                    totalCount: totalCount,
                    totalPages: totalPages,
                    hasNextPage: pageNumber < totalPages,
                    hasPreviousPage: pageNumber > 1
                ],
                filters: filters,
                sorting: [
                    field: sortField,
                    direction: sortDirection
                ]
            ]
        }
    }
}
