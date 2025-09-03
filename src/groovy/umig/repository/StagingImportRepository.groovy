package umig.repository

import groovy.sql.Sql
import groovy.json.JsonBuilder
import umig.utils.DatabaseUtil
import java.sql.Timestamp
import org.slf4j.Logger
import org.slf4j.LoggerFactory

/**
 * Repository for staging table operations during import process
 * Works with existing stg_steps and stg_step_instructions tables
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034
 */
class StagingImportRepository {
    
    private static final Logger log = LoggerFactory.getLogger(StagingImportRepository.class)
    
    /**
     * Insert a step into the staging table with import batch tracking
     * 
     * @param sql SQL connection
     * @param stepData Map containing step information
     * @param batchId Optional batch ID for tracking
     * @param importSource Source of the import
     * @param userId User performing the import
     * @return Generated step ID
     */
    String createStagingStep(Sql sql, Map stepData, UUID batchId = null, String importSource = null, String userId = null) {
        // Generate composite ID from step_type and step_number
        String stepId = "${stepData.step_type}-${stepData.step_number}"
        
        // Validate step_type is exactly 3 characters
        if ((stepData.step_type as String)?.length() != 3) {
            throw new IllegalArgumentException("Step type must be exactly 3 characters. Got: '${stepData.step_type}'")
        }
        
        try {
            String query = """
                INSERT INTO stg_steps (
                    id,
                    step_type, 
                    step_number,
                    step_title,
                    step_predecessor,
                    step_successor,
                    step_assigned_team,
                    step_impacted_teams,
                    step_macro_time_sequence,
                    step_time_sequence,
                    import_batch_id,
                    import_source,
                    imported_by,
                    imported_at,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                    step_title = EXCLUDED.step_title,
                    step_predecessor = EXCLUDED.step_predecessor,
                    step_successor = EXCLUDED.step_successor,
                    step_assigned_team = EXCLUDED.step_assigned_team,
                    step_impacted_teams = EXCLUDED.step_impacted_teams,
                    step_macro_time_sequence = EXCLUDED.step_macro_time_sequence,
                    step_time_sequence = EXCLUDED.step_time_sequence,
                    import_batch_id = COALESCE(EXCLUDED.import_batch_id, stg_steps.import_batch_id),
                    import_source = COALESCE(EXCLUDED.import_source, stg_steps.import_source),
                    imported_by = COALESCE(EXCLUDED.imported_by, stg_steps.imported_by),
                    imported_at = COALESCE(EXCLUDED.imported_at, stg_steps.imported_at),
                    updated_at = EXCLUDED.updated_at
            """
            
            Timestamp now = new Timestamp(System.currentTimeMillis())
            
            sql.executeInsert(query, [
                stepId,
                stepData.step_type,
                stepData.step_number,
                stepData.title ?: stepData.step_title,
                stepData.predecessor ?: stepData.step_predecessor,
                stepData.successor ?: stepData.step_successor,
                stepData.primary_team ?: stepData.step_assigned_team,
                stepData.impacted_teams ?: stepData.step_impacted_teams,
                stepData.macro_time_sequence ?: stepData.step_macro_time_sequence,
                stepData.time_sequence ?: stepData.step_time_sequence,
                batchId,
                importSource,
                userId,
                now,
                now,
                now
            ])
            
            log.info("Created/updated staging step: ${stepId}")
            return stepId
            
        } catch (Exception e) {
            throw e
        }
    }
    
    /**
     * Insert instructions for a step into the staging table with extended fields
     * 
     * @param sql SQL connection
     * @param stepId The step ID these instructions belong to
     * @param instructions List of instruction maps
     * @return Number of instructions inserted
     */
    int createStagingInstructions(Sql sql, String stepId, List instructions) {
        int count = 0
        int order = 1
        
        instructions.each { instruction ->
            try {
                String query = """
                    INSERT INTO stg_step_instructions (
                        step_id,
                        instruction_id,
                        instruction_text,
                        instruction_assignee,
                        nominated_user,
                        instruction_assigned_team,
                        associated_controls,
                        duration_minutes,
                        instruction_order,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (step_id, instruction_id) DO UPDATE SET
                        instruction_text = EXCLUDED.instruction_text,
                        instruction_assignee = EXCLUDED.instruction_assignee,
                        nominated_user = EXCLUDED.nominated_user,
                        instruction_assigned_team = EXCLUDED.instruction_assigned_team,
                        associated_controls = EXCLUDED.associated_controls,
                        duration_minutes = EXCLUDED.duration_minutes,
                        instruction_order = EXCLUDED.instruction_order,
                        updated_at = EXCLUDED.updated_at
                """
                
                Timestamp now = new Timestamp(System.currentTimeMillis())
                
                sql.executeInsert(query, [
                    stepId,
                    (instruction as Map).instruction_id,
                    (instruction as Map).instruction_title ?: (instruction as Map).instruction_text,
                    (instruction as Map).nominated_user ?: (instruction as Map).instruction_assignee,  // User field
                    (instruction as Map).nominated_user,  // Nominated user from JSON
                    (instruction as Map).instruction_assigned_team,  // Team from JSON
                    (instruction as Map).associated_controls,  // Controls from JSON
                    (instruction as Map).duration_minutes ?: 0,  // Duration if provided
                    order++,  // Increment order for each instruction
                    now,
                    now
                ])
                
                count++
                
            } catch (Exception e) {
                log.error("Error inserting instruction ${(instruction as Map).instruction_id}: ${e.message}")
                // Continue processing other instructions
            }
        }
        
        log.info("Created ${count} staging instructions for step: ${stepId}")
        return count
    }
    
    /**
     * Clear all staging tables
     * 
     * @param sql SQL connection
     */
    void clearStagingTables(Sql sql) {
        // Delete instructions first due to foreign key
        sql.execute("DELETE FROM stg_step_instructions")
        sql.execute("DELETE FROM stg_steps")
        log.info("Cleared all staging tables")
    }
    
    /**
     * Get all steps from staging tables
     * 
     * @return List of staging steps with their instructions
     */
    List getAllStagingSteps() {
        List results = []
        
        DatabaseUtil.withSql { Sql sql ->
            String query = """
                SELECT 
                    s.id,
                    s.step_type,
                    s.step_number,
                    s.step_title,
                    s.step_predecessor,
                    s.step_successor,
                    s.step_assigned_team,
                    s.step_impacted_teams,
                    s.step_macro_time_sequence,
                    s.step_time_sequence,
                    s.created_at,
                    s.updated_at
                FROM stg_steps s
                ORDER BY s.step_type, s.step_number
            """
            
            sql.eachRow(query) { row ->
                Map step = [
                    id: row['id'],
                    step_type: row['step_type'],
                    step_number: row['step_number'],
                    title: row['step_title'],
                    predecessor: row['step_predecessor'],
                    successor: row['step_successor'],
                    primary_team: row['step_assigned_team'],
                    impacted_teams: row['step_impacted_teams'],
                    macro_time_sequence: row['step_macro_time_sequence'],
                    time_sequence: row['step_time_sequence'],
                    created_at: row['created_at'],
                    updated_at: row['updated_at'],
                    instructions: []
                ]
                
                // Get instructions for this step
                String instructQuery = """
                    SELECT 
                        instruction_id,
                        instruction_text,
                        instruction_assignee
                    FROM stg_step_instructions
                    WHERE step_id = ?
                    ORDER BY id
                """
                
                sql.eachRow(instructQuery, [row['id']]) { instRow ->
                    (step.instructions as List) << [
                        instruction_id: instRow['instruction_id'],
                        instruction_text: instRow['instruction_text'],
                        instruction_assignee: instRow['instruction_assignee']
                    ]
                }
                
                results << step
            }
        }
        
        return results
    }
    
    /**
     * Get count of steps in staging
     * 
     * @return Map with counts
     */
    Map getStagingStatistics() {
        Map stats = [:]
        
        DatabaseUtil.withSql { Sql sql ->
            // Count steps by type
            String stepQuery = """
                SELECT 
                    step_type,
                    COUNT(*) as count
                FROM stg_steps
                GROUP BY step_type
            """
            
            Map stepsByType = [:]
            sql.eachRow(stepQuery) { row ->
                stepsByType[(row['step_type'] as String)] = row['count']
            }
            
            // Total steps
            def totalSteps = sql.firstRow("SELECT COUNT(*) as count FROM stg_steps")
            
            // Total instructions
            def totalInstructions = sql.firstRow("SELECT COUNT(*) as count FROM stg_step_instructions")
            
            // Steps with instructions
            def stepsWithInstructions = sql.firstRow("""
                SELECT COUNT(DISTINCT step_id) as count 
                FROM stg_step_instructions
            """)
            
            Integer totalStepCount = totalSteps['count'] as Integer
            Integer totalInstructionCount = totalInstructions['count'] as Integer
            Integer stepsWithInstructionCount = stepsWithInstructions['count'] as Integer
            
            stats = [
                totalSteps: totalStepCount,
                totalInstructions: totalInstructionCount,
                stepsWithInstructions: stepsWithInstructionCount,
                stepsByType: stepsByType,
                averageInstructionsPerStep: totalStepCount > 0 ? 
                    ((totalInstructionCount as Double) / (totalStepCount as Double)).round(2) : 0
            ]
        }
        
        return stats
    }
    
    /**
     * Move data from staging to master tables
     * Creates master step records and associated instructions
     * Note: This is a simplified implementation - phase/sequence/plan linkage 
     * would need to be provided or determined from business rules
     * 
     * @param sql SQL connection
     * @param phaseId Optional phase ID to link steps to (required for master creation)
     * @param batchId Optional batch ID to promote (if null, promotes all)
     * @return Map with migration results
     */
    Map promoteToMasterTables(Sql sql, UUID phaseId = null, UUID batchId = null) {
        Map result = [
            success: false,
            stepsPromoted: 0,
            instructionsPromoted: 0,
            errors: [],
            warnings: []
        ]
        
        // Phase ID is required for master table creation
        if (!phaseId) {
            // Try to find a default phase or create one
            def defaultPhase = sql.firstRow("""
                SELECT phm_id FROM phases_master_phm 
                WHERE phm_name = 'Default Import Phase'
                LIMIT 1
            """)
            
            if (!defaultPhase) {
                (result.errors as List) << "No phase ID provided and no default phase found. Cannot promote to master tables."
                return result
            }
            phaseId = defaultPhase['phm_id'] as UUID
        }
        
        try {
            // Build query for staging steps
            String stepQuery = """
                SELECT 
                    s.id,
                    s.step_type,
                    s.step_number,
                    s.step_title,
                    s.step_predecessor,
                    s.step_successor,
                    s.step_assigned_team,
                    s.step_impacted_teams,
                    s.step_macro_time_sequence,
                    s.step_time_sequence
                FROM stg_steps s
            """
            
            List params = []
            if (batchId) {
                stepQuery += " WHERE s.import_batch_id = ?"
                params << batchId
            }
            
            stepQuery += " ORDER BY s.step_type, s.step_number"
            
            // Process each staging step
            sql.eachRow(stepQuery, params) { stagingStep ->
                try {
                    // Find or create team
                    Integer teamId = findOrCreateTeam(sql, stagingStep['step_assigned_team'] as String)
                    
                    // Check if step already exists in master
                    def existingStep = sql.firstRow("""
                        SELECT stm_id FROM steps_master_stm 
                        WHERE phm_id = ? AND stt_code = ? AND stm_number = ?
                    """, [phaseId, stagingStep['step_type'], stagingStep['step_number']])
                    
                    UUID stepMasterId = existingStep ? (existingStep['stm_id'] as UUID) : null
                    
                    if (!stepMasterId) {
                        // Create new master step
                        // Note: Using default environment role ID 1 - should be configurable
                        def insertResult = sql.executeInsert("""
                            INSERT INTO steps_master_stm (
                                phm_id,
                                tms_id_owner,
                                stt_code,
                                stm_number,
                                enr_id_target,
                                stm_name,
                                stm_description,
                                stm_duration_minutes
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, [
                            phaseId,
                            teamId,
                            stagingStep['step_type'],
                            stagingStep['step_number'],
                            1, // Default environment role - should be configurable
                            stagingStep['step_title'] ?: "Step ${stagingStep['step_type']}-${stagingStep['step_number']}",
                            "Imported from staging: ${stagingStep['step_macro_time_sequence'] ?: ''} / ${stagingStep['step_time_sequence'] ?: ''}",
                            0 // Default duration - could calculate from instructions
                        ])
                        
                        stepMasterId = insertResult[0][0] as UUID
                        log.info("Created master step: ${stepMasterId} for ${stagingStep['id']}")
                    } else {
                        // Update existing master step
                        sql.executeUpdate("""
                            UPDATE steps_master_stm SET
                                stm_name = ?,
                                tms_id_owner = ?
                            WHERE stm_id = ?
                        """, [
                            stagingStep['step_title'] ?: "Step ${stagingStep['step_type']}-${stagingStep['step_number']}",
                            teamId,
                            stepMasterId
                        ])
                        log.info("Updated master step: ${stepMasterId} for ${stagingStep['id']}")
                    }
                    
                    result.stepsPromoted = (result.stepsPromoted as Integer) + 1
                    
                    // Process impacted teams
                    String impactedTeamsStr = stagingStep['step_impacted_teams'] as String
                    if (impactedTeamsStr) {
                        String[] impactedTeams = impactedTeamsStr.split(',')
                        impactedTeams.each { String impactedTeamName ->
                            if (impactedTeamName?.trim()) {
                                Integer impactedTeamId = findOrCreateTeam(sql, impactedTeamName.trim())
                                // Insert into junction table if not exists
                                sql.executeInsert("""
                                    INSERT INTO steps_master_stm_x_teams_tms_impacted (stm_id, tms_id)
                                    VALUES (?, ?)
                                    ON CONFLICT (stm_id, tms_id) DO NOTHING
                                """, [stepMasterId, impactedTeamId])
                            }
                        }
                    }
                    
                    // Process instructions for this step
                    int instructionCount = promoteInstructionsForStep(sql, stagingStep['id'] as String, stepMasterId)
                    result.instructionsPromoted = (result.instructionsPromoted as Integer) + instructionCount
                    
                } catch (Exception e) {
                    log.error("Error promoting step ${stagingStep['id']}: ${e.message}")
                    (result.warnings as List) << "Failed to promote step ${stagingStep['id']}: ${e.message}"
                }
            }
            
            result.success = (result.stepsPromoted as Integer) > 0
            result.message = "Promoted ${result.stepsPromoted} steps and ${result.instructionsPromoted} instructions to master tables"
            
        } catch (Exception e) {
            log.error("Error during promotion to master tables: ${e.message}", e)
            (result.errors as List) << "Promotion failed: ${e.message}"
        }
        
        return result
    }
    
    /**
     * Promote instructions for a specific step
     * 
     * @param sql SQL connection
     * @param stagingStepId Staging step ID
     * @param masterStepId Master step ID
     * @return Number of instructions promoted
     */
    private int promoteInstructionsForStep(Sql sql, String stagingStepId, UUID masterStepId) {
        int count = 0
        
        // Delete existing instructions for clean replacement
        sql.execute("DELETE FROM instructions_master_inm WHERE stm_id = ?", [masterStepId])
        
        // Get instructions from staging
        sql.eachRow("""
            SELECT 
                instruction_id,
                instruction_text,
                instruction_assignee,
                nominated_user,
                instruction_assigned_team,
                associated_controls,
                duration_minutes,
                instruction_order
            FROM stg_step_instructions
            WHERE step_id = ?
            ORDER BY instruction_order, id
        """, [stagingStepId]) { instruction ->
            
            try {
                // Find or create team for instruction if specified
                Integer instructionTeamId = null
                String instructionTeamName = instruction['instruction_assigned_team'] as String
                if (instructionTeamName) {
                    instructionTeamId = findOrCreateTeam(sql, instructionTeamName)
                }
                
                // TODO: Handle control mapping if needed
                // For now, we'll skip control association as it requires control master records
                
                sql.executeInsert("""
                    INSERT INTO instructions_master_inm (
                        stm_id,
                        tms_id,
                        inm_order,
                        inm_body,
                        inm_duration_minutes
                    ) VALUES (?, ?, ?, ?, ?)
                """, [
                    masterStepId,
                    instructionTeamId,
                    instruction['instruction_order'] ?: (count + 1),
                    instruction['instruction_text'] ?: '',
                    instruction['duration_minutes'] ?: 0
                ])
                
                count++
                
            } catch (Exception e) {
                log.error("Error promoting instruction ${instruction['instruction_id']}: ${e.message}")
            }
        }
        
        log.info("Promoted ${count} instructions for step ${masterStepId}")
        return count
    }
    
    /**
     * Find or create a team by name
     * 
     * @param sql SQL connection
     * @param teamName Team name
     * @return Team ID
     */
    private Integer findOrCreateTeam(Sql sql, String teamName) {
        if (!teamName) {
            return null
        }
        
        // Check if team exists
        def existingTeam = sql.firstRow("""
            SELECT tms_id FROM teams_tms 
            WHERE UPPER(tms_name) = UPPER(?)
        """, [teamName])
        
        if (existingTeam) {
            return existingTeam['tms_id'] as Integer
        }
        
        // Create new team
        def result = sql.executeInsert("""
            INSERT INTO teams_tms (tms_name, tms_description)
            VALUES (?, ?)
        """, [teamName, "Auto-created during import"])
        
        Integer teamId = result[0][0] as Integer
        log.info("Created new team: ${teamName} with ID ${teamId}")
        return teamId
    }
    
    /**
     * Validate staging data before promotion
     * 
     * @return Map with validation results
     */
    Map validateStagingData() {
        Map validation = [
            valid: true,
            errors: [],
            warnings: []
        ]
        
        DatabaseUtil.withSql { Sql sql ->
            // Check for steps without instructions
            def orphanSteps = sql.rows("""
                SELECT id, step_title 
                FROM stg_steps s
                WHERE NOT EXISTS (
                    SELECT 1 FROM stg_step_instructions i 
                    WHERE i.step_id = s.id
                )
            """)
            
            if (orphanSteps.size() > 0) {
                (validation.warnings as List) << "Found ${orphanSteps.size()} steps without instructions"
            }
            
            // Check for invalid step types (this won't happen due to ENUM, but good to have)
            def invalidTypes = sql.rows("""
                SELECT DISTINCT step_type 
                FROM stg_steps 
                WHERE step_type NOT IN ('IGO', 'CHK', 'DUM', 'TRT')
            """)
            
            if (invalidTypes.size() > 0) {
                (validation.errors as List) << "Invalid step types found: ${invalidTypes.collect{it['step_type']}.join(', ')}"
                validation.valid = false
            }
            
            // Check for duplicate instruction IDs within same step
            def duplicates = sql.rows("""
                SELECT step_id, instruction_id, COUNT(*) as count
                FROM stg_step_instructions
                GROUP BY step_id, instruction_id
                HAVING COUNT(*) > 1
            """)
            
            if (duplicates.size() > 0) {
                (validation.errors as List) << "Found ${duplicates.size()} duplicate instruction IDs"
                validation.valid = false
            }
        }
        
        return validation
    }
}