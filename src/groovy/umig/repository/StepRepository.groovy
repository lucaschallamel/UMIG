package umig.repository

import umig.utils.DatabaseUtil
import umig.utils.EmailService
import java.util.UUID
import groovy.sql.Sql

/**
 * Repository for STEP master and instance data, including impacted teams and iteration scopes.
 */
class StepRepository {
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
            ''')
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
                [
                    id: row.sti_id,
                    stmId: row.stm_id,
                    sttCode: row.stt_code,
                    stmNumber: row.stm_number,
                    name: row.sti_name ?: row.master_name,
                    status: row.sti_status,
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
                    migrationName: row.mig_name
                ] as Map
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
     * @param newStatus The new status value
     * @param userId Optional user ID for audit logging
     * @return Map with success status and email send results
     */
    Map updateStepInstanceStatusWithNotification(UUID stepInstanceId, String newStatus, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
            try {
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
                ''', [stepInstanceId: stepInstanceId])
                
                if (!stepInstance) {
                    return [success: false, error: "Step instance not found"]
                }
                
                def oldStatus = stepInstance.sti_status
                
                // Update the status
                def updateCount = sql.executeUpdate('''
                    UPDATE steps_instance_sti 
                    SET sti_status = :newStatus,
                        sti_end_time = CASE WHEN :newStatus = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE sti_end_time END
                    WHERE sti_id = :stepInstanceId
                ''', [newStatus: newStatus, stepInstanceId: stepInstanceId])
                
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
                    newStatus,
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
                ''', [stepInstanceId: stepInstanceId])
                
                if (!stepInstance) {
                    return [success: false, error: "Step instance not found"]
                }
                
                // Check if already opened
                if (stepInstance.sti_status == 'OPEN' || stepInstance.sti_status == 'IN_PROGRESS' || stepInstance.sti_status == 'COMPLETED') {
                    return [success: false, error: "Step has already been opened (status: ${stepInstance.sti_status})"]
                }
                
                // Mark as opened by updating status to OPEN
                def updateCount = sql.executeUpdate('''
                    UPDATE steps_instance_sti 
                    SET sti_status = 'OPEN',
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
                        inm.inm_order, inm.inm_body as ini_name
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
                ''', [stepInstanceId: stepInstanceId])
                
                if (!stepInstance) {
                    return [success: false, error: "Step instance not found"]
                }
                
                // Mark instruction as completed
                def updateCount = sql.executeUpdate('''
                    UPDATE instructions_instance_ini 
                    SET ini_is_completed = true,
                        ini_completed_at = CURRENT_TIMESTAMP,
                        usr_id_completed_by = :userId
                    WHERE ini_id = :instructionId
                ''', [userId: userId, instructionId: instructionId])
                
                if (updateCount != 1) {
                    return [success: false, error: "Failed to complete instruction"]
                }
                
                // Get teams for notification
                def teams = getTeamsForNotification(sql, stepInstance.stm_id as UUID, stepInstance.tms_id_owner as Integer)
                
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
            
            // Get instructions for this step instance
            def instructions = sql.rows('''
                SELECT 
                    ini.ini_id,
                    ini.ini_is_completed,
                    ini.ini_completed_at,
                    ini.usr_id_completed_by,
                    inm.inm_id,
                    inm.inm_order,
                    inm.inm_body,
                    inm.inm_duration_minutes
                FROM instructions_instance_ini ini
                JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
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
            
            return [
                stepSummary: [
                    ID: stepInstance.sti_id,
                    Name: stepInstance.sti_name ?: stepInstance.master_name,
                    Description: stepInstance.stm_description,
                    Status: stepInstance.sti_status,
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
                    IterationTypes: iterationTypes.collect { it.itt_code }
                ],
                instructions: instructions.collect { instruction ->
                    [
                        ID: instruction.ini_id,
                        Description: instruction.inm_body,
                        IsCompleted: instruction.ini_is_completed,
                        CompletedAt: instruction.ini_completed_at,
                        CompletedBy: instruction.usr_id_completed_by,
                        Order: instruction.inm_order,
                        Duration: instruction.inm_duration_minutes
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
            
            // Find the most recent step instance (for now, we'll just get any instance)
            // In a real scenario, this should be filtered by the current iteration context
            def stepInstance = sql.firstRow('''
                SELECT 
                    sti.sti_id,
                    sti.sti_name,
                    sti.sti_status,
                    sti.sti_duration_minutes,
                    sti.phi_id,
                    sti.enr_id,
                    tms.tms_name as owner_team_name
                FROM steps_instance_sti sti
                LEFT JOIN teams_tms tms ON :teamId = tms.tms_id
                WHERE sti.stm_id = :stmId
                ORDER BY sti.sti_id DESC
                LIMIT 1
            ''', [stmId: stepMaster.stm_id, teamId: stepMaster.tms_id_owner])
            
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
                        Status: 'NOT_STARTED',
                        AssignedTeam: ownerTeam?.tms_name ?: 'Unassigned'
                    ],
                    instructions: [],
                    impactedTeams: []
                ]
            }
            
            // Get instructions for this step instance
            def instructions = sql.rows('''
                SELECT 
                    ini.ini_id,
                    ini.ini_is_completed,
                    ini.ini_completed_at,
                    ini.usr_id_completed_by,
                    inm.inm_id,
                    inm.inm_order,
                    inm.inm_body,
                    inm.inm_duration_minutes
                FROM instructions_instance_ini ini
                JOIN instructions_master_inm inm ON ini.inm_id = inm.inm_id
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
            
            return [
                stepSummary: [
                    ID: stepCode,
                    Name: stepInstance.sti_name ?: stepMaster.stm_name,
                    Description: stepMaster.stm_description,
                    Status: stepInstance.sti_status,
                    AssignedTeam: stepInstance.owner_team_name ?: 'Unassigned',
                    Duration: stepMaster.stm_duration_minutes,
                    sti_id: stepInstance.sti_id?.toString()  // Include step instance ID for comments
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
                        CompletedBy: instruction.usr_id_completed_by
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
                VALUES (:stepInstanceId, :commentBody, :userId)
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
                    updated_by = :userId,
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
}
