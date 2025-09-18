package umig.service

import umig.dto.StepInstanceDTO
import umig.dto.StepMasterDTO
import umig.dto.CommentDTO
import umig.utils.DatabaseUtil
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.sql.Timestamp
import java.util.UUID

/**
 * Step Data Transformation Service for US-056-A Service Layer Standardization
 * 
 * Provides comprehensive data transformation between different formats used across UMIG:
 * - Database result rows → StepInstanceDTO (instances) & StepMasterDTO (masters)
 * - Legacy Step entities → StepInstanceDTO  
 * - StepInstanceDTO → Database parameters
 * - StepInstanceDTO/StepMasterDTO → Email template data
 * 
 * This service eliminates inconsistent data transformations that caused template rendering
 * failures and provides a single source of truth for Step data format conversion.
 * 
 * Following UMIG patterns:
 * - ADR-031 Type Safety with explicit casting
 * - Defensive programming with comprehensive null safety
 * - DatabaseUtil integration for transaction support
 * - Comprehensive error handling and logging
 * 
 * @since US-056-A Phase 1
 * @author UMIG Development Team
 */
class StepDataTransformationService {
    
    private static final Logger log = LoggerFactory.getLogger(StepDataTransformationService.class)
    
    // ========================================
    // DATABASE ROW TO DTO TRANSFORMATION
    // ========================================
    
    /**
     * Transform database result row to StepInstanceDTO
     * 
     * Handles instance execution fields with defensive null checking and type conversion.
     * Used for Step instances (steps_instance_sti) with execution data.
     * 
     * @param row Database result row (GroovyRowResult or Map)
     * @return Fully populated StepInstanceDTO
     * @throws IllegalArgumentException if row is null or missing required fields
     */
    StepInstanceDTO fromDatabaseRow(Map row) {
        if (!row) {
            throw new IllegalArgumentException("Database row cannot be null")
        }
        
        log.debug("Transforming database row to DTO: {}", row.keySet())
        
        try {
            return StepInstanceDTO.builder()
                // Core identification - with defensive UUID handling
                .stepId(safeUUIDToString(row.stm_id ?: row.sti_id))
                .stepInstanceId(safeUUIDToString(row.sti_id))
                .stepName(safeString(row.stm_name ?: row.sti_name))
                .stepDescription(safeString(row.stm_description ?: row.sti_description))
                .stepStatus(safeString(row.step_status ?: row.sti_status ?: 'PENDING'))
                
                // Team assignment
                .assignedTeamId(safeUUIDToString(row.tms_id ?: row.assigned_team_id))
                .assignedTeamName(safeString(row.team_name ?: row.tms_name))
                
                // Hierarchical context
                .migrationId(safeUUIDToString(row.migration_id))
                .migrationCode(safeString(row.migration_name))
                .iterationId(safeUUIDToString(row.iteration_id))
                .iterationCode(safeString(row.iteration_type))
                .sequenceId(safeUUIDToString(row.sequence_id))
                .phaseId(safeUUIDToString(row.phase_id))
                
                // Temporal fields with proper LocalDateTime conversion
                .createdDate(safeTimestampToLocalDateTime(row.created_date))
                .lastModifiedDate(safeTimestampToLocalDateTime(row.last_modified_date))
                // .isActive(safeBoolean(row.is_active, true))  // REMOVED - No sti_is_active column exists
                // .priority(safeInteger(row.priority, 5))  // REMOVED - No sti_priority column exists
                
                // Extended metadata
                .stepType(safeString(row.stt_code))
                .stepCategory(safeString(row.stt_name))
                .estimatedDuration(safeInteger(row.stm_duration_minutes))
                .actualDuration(safeInteger(row.sti_duration_minutes))
                
                // Progress tracking with safe integer conversion
                .dependencyCount(safeInteger(row.dependency_count, 0))
                .completedDependencies(safeInteger(row.completed_dependencies, 0))
                .instructionCount(safeInteger(row.instruction_count, 0))
                .completedInstructions(safeInteger(row.completed_instructions, 0))
                
                // Comment integration
                .hasActiveComments(safeBoolean(row.has_active_comments, false))
                .lastCommentDate(safeTimestampToLocalDateTime(row.last_comment_date))
                
                .build()
                
        } catch (Exception e) {
            log.error("Failed to transform database row to DTO: ${e.message}", e)
            log.error("Row data: {}", row)
            throw new RuntimeException("Database row transformation failed: ${e.message}", e)
        }
    }
    
    /**
     * Transform multiple database rows to DTO list with batch optimization
     * 
     * @param rows List of database result rows
     * @return List of StepInstanceDTOs
     */
    List<StepInstanceDTO> batchTransformFromDatabaseRows(List<Map> rows) {
        if (!rows) {
            return []
        }
        
        log.debug("Batch transforming {} database rows to DTOs", rows.size())
        
        try {
            return rows.collect { row ->
                fromDatabaseRow(row)
            }
        } catch (Exception e) {
            log.error("Batch transformation from database rows failed: ${e.message}", e)
            throw new RuntimeException("Batch database transformation failed: ${e.message}", e)
        }
    }
    
    // ========================================
    // MASTER DTO TRANSFORMATION METHODS (US-056F)
    // ========================================
    
    /**
     * Transform database result row to StepMasterDTO
     * 
     * Handles master-only fields with defensive null checking and type conversion.
     * Used for Step master templates (steps_master_stm) without execution data.
     * 
     * @param row Database result row (GroovyRowResult or Map)
     * @return Fully populated StepMasterDTO
     * @throws IllegalArgumentException if row is null or missing required fields
     */
    StepMasterDTO fromMasterDatabaseRow(Map row) {
        if (!row) {
            throw new IllegalArgumentException("Database row cannot be null")
        }
        
        log.debug("Transforming master database row to StepMasterDTO: {}", row.keySet())
        
        try {
            return StepMasterDTO.builder()
                // Core identification - master specific fields
                .withStepMasterId(safeUUIDToString(row.stm_id ?: row.stepMasterId))
                .withStepTypeCode(safeString(row.stt_code ?: row.stepTypeCode))
                .withStepNumber(safeInteger(row.stm_number ?: row.stepNumber))
                .withStepName(safeString(row.stm_name ?: row.stepName))
                .withStepDescription(safeString(row.stm_description ?: row.stepDescription))
                
                // Hierarchical context - parent phase only for masters
                .withPhaseId(safeUUIDToString(row.phm_id ?: row.phaseId))
                
                // Temporal fields - ISO string format for masters
                .withCreatedDate(safeTimestampToISOString(row.created_at))
                .withLastModifiedDate(safeTimestampToISOString(row.updated_at))
                // .withIsActive(safeBoolean(row.stm_is_active ?: row.is_active, true))  // REMOVED - Neither stm_is_active nor is_active columns exist
                
                // Computed metadata fields
                .withInstructionCount(safeInteger(row.instruction_count, 0))
                .withInstanceCount(safeInteger(row.instance_count, 0))
                
                .build()
                
        } catch (Exception e) {
            log.error("Failed to transform master database row to StepMasterDTO: ${e.message}", e)
            log.error("Row data: {}", row)
            throw new RuntimeException("Master database row transformation failed: ${e.message}", e)
        }
    }
    
    /**
     * Transform multiple master database rows to StepMasterDTO list with batch optimization
     * 
     * @param rows List of master database result rows
     * @return List of StepMasterDTOs
     */
    List<StepMasterDTO> fromMasterDatabaseRows(List<Map> rows) {
        if (!rows) {
            return []
        }
        
        log.debug("Batch transforming {} master database rows to StepMasterDTOs", rows.size())
        
        try {
            return rows.collect { row ->
                fromMasterDatabaseRow(row)
            }
        } catch (Exception e) {
            log.error("Batch transformation from master database rows failed: ${e.message}", e)
            throw new RuntimeException("Batch master database transformation failed: ${e.message}", e)
        }
    }
    
    // ========================================
    // INSTANCE DTO TRANSFORMATION METHODS (RENAMED FOR CLARITY)
    // ========================================
    
    /**

    
    // ========================================
    // LEGACY ENTITY TO DTO TRANSFORMATION  
    // ========================================
    
    /**
     * Transform legacy Step entity to StepInstanceDTO
     * 
     * Supports migration from existing Step domain objects to unified DTO format.
     * Handles various legacy field naming conventions and data structures.
     * 
     * @param step Legacy step entity (Map or domain object)
     * @return StepInstanceDTO
     */
    StepInstanceDTO fromStepEntity(Map step) {
        if (!step) {
            throw new IllegalArgumentException("Step entity cannot be null")
        }
        
        log.debug("Transforming legacy Step entity to DTO")
        
        try {
            return StepInstanceDTO.builder()
                // Handle legacy field variations
                .stepId(safeUUIDToString(step.id ?: step.stepId ?: step.stm_id))
                .stepInstanceId(safeUUIDToString(step.instanceId ?: step.stepInstanceId ?: step.sti_id))
                .stepName(safeString(step.name ?: step.stepName ?: step.title))
                .stepDescription(safeString(step.description ?: step.stepDescription ?: step.details))
                .stepStatus(safeString(step.status ?: step.stepStatus ?: 'PENDING'))
                
                // Legacy team assignment patterns - ADR-031 Type Safety Compliance
                .assignedTeamId(safeUUIDToString(step.teamId ?: step.assignedTeamId ?: (step.team ? (step.team as Map).id : null)))
                .assignedTeamName(safeString(step.teamName ?: step.assignedTeamName ?: (step.team ? (step.team as Map).name : null)))
                
                // Legacy hierarchical context - ADR-031 Type Safety Compliance
                .migrationId(safeUUIDToString(step.migrationId ?: (step.migration ? (step.migration as Map).id : null)))
                .migrationCode(safeString(step.migrationCode ?: (step.migration ? (step.migration as Map).code : null)))
                .iterationId(safeUUIDToString(step.iterationId ?: (step.iteration ? (step.iteration as Map).id : null)))
                .iterationCode(safeString(step.iterationCode ?: (step.iteration ? (step.iteration as Map).code : null)))
                .sequenceId(safeUUIDToString(step.sequenceId ?: (step.sequence ? (step.sequence as Map).id : null)))
                .phaseId(safeUUIDToString(step.phaseId ?: (step.phase ? (step.phase as Map).id : null)))
                
                // Legacy temporal handling
                .createdDate(safeDateToLocalDateTime(step.createdDate ?: step.dateCreated))
                .lastModifiedDate(safeDateToLocalDateTime(step.lastModifiedDate ?: step.dateModified ?: step.updatedDate))
                .isActive(safeBoolean(step.active ?: step.isActive, true))
                .priority(safeInteger(step.priority, 5))
                
                // Legacy metadata
                .stepType(safeString(step.type ?: step.stepType))
                .stepCategory(safeString(step.category ?: step.stepCategory))
                .estimatedDuration(safeInteger(step.estimatedDuration ?: step.estimatedMinutes))
                .actualDuration(safeInteger(step.actualDuration ?: step.actualMinutes))
                
                .build()
                
        } catch (Exception e) {
            log.error("Failed to transform legacy Step entity to DTO: ${e.message}", e)
            throw new RuntimeException("Legacy entity transformation failed: ${e.message}", e)
        }
    }
    
    // ========================================
    // DTO TO DATABASE PARAMETERS  
    // ========================================
    
    /**
     * Convert StepInstanceDTO to database insert/update parameters
     * 
     * Transforms DTO back to database format for persistence operations.
     * Handles UUID conversion, date formatting, and null value mapping.
     * 
     * @param dto StepInstanceDTO to convert
     * @return Map of database parameters ready for SQL operations
     */
    Map<String, Object> toDatabaseParams(StepInstanceDTO dto) {
        if (!dto) {
            throw new IllegalArgumentException("StepInstanceDTO cannot be null")
        }
        
        // Validate DTO before conversion
        List<String> errors = dto.validate()
        if (errors) {
            throw new IllegalArgumentException("Invalid DTO for database conversion: ${errors.join(', ')}")
        }
        
        log.debug("Converting DTO to database parameters for stepId: {}", dto.stepId)
        
        try {
            Map<String, Object> params = [:]
            
            // Core identification
            params.stm_id = safeStringToUUID(dto.stepId)
            params.sti_id = safeStringToUUID(dto.stepInstanceId)
            params.stm_name = dto.stepName
            params.stm_description = dto.stepDescription
            params.sti_status = dto.stepStatus
            
            // Team assignment
            params.tms_id = safeStringToUUID(dto.assignedTeamId)
            
            // Hierarchical context
            params.mig_id = safeStringToUUID(dto.migrationId)
            params.itr_id = safeStringToUUID(dto.iterationId)
            params.seq_id = safeStringToUUID(dto.sequenceId)
            params.phm_id = safeStringToUUID(dto.phaseId)
            
            // Temporal fields - using standard column names
            params.created_at = safeLocalDateTimeToTimestamp(dto.createdDate)
            params.updated_at = safeLocalDateTimeToTimestamp(dto.lastModifiedDate)
            // params.sti_is_active = dto.isActive  -- column doesn't exist in schema
            // params.sti_priority = dto.priority  -- column doesn't exist in schema

            // Extended metadata - using correct column names
            params.stm_duration_minutes = dto.estimatedDuration
            params.sti_duration_minutes = dto.actualDuration
            
            // Remove null values to avoid database constraint issues
            return params.findAll { key, value -> value != null }
            
        } catch (Exception e) {
            log.error("Failed to convert DTO to database parameters: ${e.message}", e)
            throw new RuntimeException("DTO to database conversion failed: ${e.message}", e)
        }
    }
    
    // ========================================
    // DTO TO EMAIL TEMPLATE DATA
    // ========================================
    
    /**
     * Convert StepInstanceDTO to email template variable map
     * 
     * This is the critical method that resolves template rendering failures by providing
     * consistent, safe data structure for email template processing.
     * 
     * @param dto StepInstanceDTO to convert
     * @return Map suitable for email template processing with defensive defaults
     */
    Map<String, Object> toEmailTemplateData(StepInstanceDTO dto) {
        if (!dto) {
            log.warn("Null DTO provided to email template conversion, returning empty map")
            return [:]
        }
        
        log.debug("Converting DTO to email template data for stepId: {}", dto.stepId)
        
        try {
            Map<String, Object> templateData = dto.toTemplateMap()
            
            // Add email-specific formatting and safety measures
            templateData.stepDisplayName = templateData.stepName ?: "Unnamed Step"
            templateData.statusDisplayName = formatStatusForDisplay(dto.stepStatus)
            templateData.priorityDisplayName = formatPriorityForDisplay(dto.priority)
            
            // Format dates for email display
            templateData.createdDateFormatted = formatDateForEmail(dto.createdDate)
            templateData.lastModifiedDateFormatted = formatDateForEmail(dto.lastModifiedDate)
            templateData.lastCommentDateFormatted = formatDateForEmail(dto.lastCommentDate)
            
            // Progress indicators for email
            templateData.dependencyProgressText = formatProgressText(
                dto.completedDependencies ?: 0, 
                dto.dependencyCount ?: 0, 
                "dependencies"
            )
            templateData.instructionProgressText = formatProgressText(
                dto.completedInstructions ?: 0,
                dto.instructionCount ?: 0,
                "instructions"
            )
            
            // Status indicators for email styling
            templateData.statusClass = mapStatusToEmailClass(dto.stepStatus)
            templateData.priorityClass = mapPriorityToEmailClass(dto.priority)
            
            // Defensive defaults for template safety
            templateData.each { key, value ->
                if (value == null) {
                    templateData[key] = ""
                }
            }
            
            log.debug("Successfully converted DTO to email template data with {} fields", templateData.size())
            return templateData
            
        } catch (Exception e) {
            log.error("Failed to convert DTO to email template data: ${e.message}", e)
            log.error("DTO: {}", dto)
            
            // Return safe fallback data to prevent template rendering failures
            return createSafeEmailTemplateFallback(dto)
        }
    }
    
    /**
     * Create safe fallback email template data when conversion fails
     * 
     * @param dto Original DTO (may be partially valid)
     * @return Minimal safe template data
     */
    private Map<String, Object> createSafeEmailTemplateFallback(StepInstanceDTO dto) {
        return [
            stepId: dto?.stepId ?: "unknown",
            stepInstanceId: dto?.stepInstanceId ?: "",
            stepName: dto?.stepName ?: "Unknown Step",
            stepDescription: dto?.stepDescription ?: "",
            stepStatus: dto?.stepStatus ?: "UNKNOWN",
            assignedTeamName: dto?.assignedTeamName ?: "Unassigned",
            migrationCode: dto?.migrationCode ?: "",
            iterationCode: dto?.iterationCode ?: "",
            priority: dto?.priority ?: 5,
            statusDisplayName: "Unknown Status",
            priorityDisplayName: "Medium Priority",
            createdDateFormatted: "",
            lastModifiedDateFormatted: "",
            dependencyProgressText: "0/0 dependencies",
            instructionProgressText: "0/0 instructions",
            statusClass: "status-unknown",
            priorityClass: "priority-medium",
            isActive: true,
            hasActiveComments: false,
            recentComments: []
        ]
    }
    
    // ========================================
    // BATCH TRANSFORMATION METHODS
    // ========================================
    
    /**
     * Batch transform DTOs to email template data
     * 
     * @param dtos List of DTOs to transform
     * @return List of email template data maps
     */
    List<Map<String, Object>> batchTransformToEmailTemplateData(List<StepInstanceDTO> dtos) {
        if (!dtos) {
            return []
        }
        
        log.debug("Batch transforming {} DTOs to email template data", dtos.size())
        
        return dtos.collect { dto ->
            toEmailTemplateData(dto)
        }
    }
    
    /**
     * Batch transform DTOs to database parameters
     * 
     * @param dtos List of DTOs to transform
     * @return List of database parameter maps
     */
    List<Map<String, Object>> batchTransformToDatabaseParams(List<StepInstanceDTO> dtos) {
        if (!dtos) {
            return []
        }
        
        log.debug("Batch transforming {} DTOs to database parameters", dtos.size())
        
        return dtos.collect { dto ->
            toDatabaseParams(dto)
        }
    }
    
    // ========================================
    // UTILITY AND HELPER METHODS
    // ========================================
    
    /**
     * Safely convert UUID to string, handling null values
     */
    private String safeUUIDToString(Object uuid) {
        if (uuid == null) return null
        if (uuid instanceof String) return uuid as String
        if (uuid instanceof UUID) return uuid.toString()
        return uuid.toString()
    }
    
    /**
     * Safely convert string to UUID, handling null and invalid formats
     */
    private UUID safeStringToUUID(String uuidString) {
        if (!uuidString) return null
        try {
            return UUID.fromString(uuidString)
        } catch (IllegalArgumentException e) {
            log.warn("Invalid UUID format: {}", uuidString)
            return null
        }
    }
    
    /**
     * Safely convert object to string with null handling
     */
    private String safeString(Object value) {
        return value?.toString()
    }
    
    /**
     * Safely convert object to integer with default value
     */
    private Integer safeInteger(Object value, Integer defaultValue = null) {
        if (value == null) return defaultValue
        if (value instanceof Integer) return value as Integer
        if (value instanceof Number) return ((Number) value).intValue()
        try {
            return Integer.parseInt(value.toString())
        } catch (NumberFormatException e) {
            log.debug("Failed to parse integer: {}, using default: {}", value, defaultValue)
            return defaultValue
        }
    }
    
    /**
     * Safely convert object to boolean with default value
     */
    private Boolean safeBoolean(Object value, Boolean defaultValue = false) {
        if (value == null) return defaultValue
        if (value instanceof Boolean) return value as Boolean
        if (value instanceof String) {
            String str = value.toString().toLowerCase()
            return str in ['true', '1', 'yes', 'y']
        }
        return defaultValue
    }
    
    /**
     * Safely convert Timestamp/Date to LocalDateTime
     */
    private LocalDateTime safeTimestampToLocalDateTime(Object timestamp) {
        if (timestamp == null) return null
        if (timestamp instanceof LocalDateTime) return timestamp as LocalDateTime
        if (timestamp instanceof Timestamp) return ((Timestamp) timestamp).toLocalDateTime()
        if (timestamp instanceof java.sql.Date) return ((java.sql.Date) timestamp).toLocalDate().atStartOfDay()
        if (timestamp instanceof java.util.Date) return new Timestamp(((java.util.Date) timestamp).time).toLocalDateTime()
        
        // Try parsing string formats
        if (timestamp instanceof String) {
            try {
                return LocalDateTime.parse(timestamp as String)
            } catch (DateTimeParseException e) {
                log.debug("Failed to parse LocalDateTime from string: {}", timestamp)
                return null
            }
        }
        
        return null
    }
    
    /**
     * Safely convert timestamp to ISO string format for StepMasterDTO
     * Returns null for null inputs, formatted ISO string for valid timestamps
     */
    private String safeTimestampToISOString(Object timestamp) {
        LocalDateTime localDateTime = safeTimestampToLocalDateTime(timestamp)
        if (localDateTime == null) return null
        
        try {
            return localDateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        } catch (Exception e) {
            log.debug("Failed to format LocalDateTime to ISO string: {}", localDateTime)
            return localDateTime.toString()
        }
    }
    
    /**
     * Safely convert Date to LocalDateTime for legacy support
     */
    private LocalDateTime safeDateToLocalDateTime(Object date) {
        return safeTimestampToLocalDateTime(date)
    }
    
    /**
     * Convert LocalDateTime to Timestamp for database storage
     */
    private Timestamp safeLocalDateTimeToTimestamp(LocalDateTime dateTime) {
        return dateTime ? Timestamp.valueOf(dateTime) : null
    }
    
    /**
     * Format status for email display
     */
    private String formatStatusForDisplay(String status) {
        if (!status) return "Unknown"
        
        switch (status.toUpperCase()) {
            case 'PENDING': return 'Pending'
            case 'IN_PROGRESS': return 'In Progress'
            case 'COMPLETED': return 'Completed'
            case 'FAILED': return 'Failed'
            case 'CANCELLED': return 'Cancelled'
            default: return status.toLowerCase().tokenize('_').collect { it.capitalize() }.join(' ')
        }
    }
    
    /**
     * Format priority for email display
     */
    private String formatPriorityForDisplay(Integer priority) {
        if (priority == null) return "Medium Priority"
        
        if (priority >= 8) return "High Priority"
        if (priority >= 6) return "Medium-High Priority"  
        if (priority >= 4) return "Medium Priority"
        if (priority >= 2) return "Low-Medium Priority"
        return "Low Priority"
    }
    
    /**
     * Format date for email display
     */
    private String formatDateForEmail(LocalDateTime dateTime) {
        if (!dateTime) return ""
        
        try {
            return dateTime.format(DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm"))
        } catch (Exception e) {
            log.debug("Failed to format date for email: {}", dateTime)
            return dateTime.toString()
        }
    }
    
    /**
     * Format progress text for email
     */
    private String formatProgressText(int completed, int total, String itemType) {
        if (total == 0) return "No ${itemType}"
        // ADR-031 Type Safety: Convert to double for Math.round() compatibility
        double percentage = ((double) completed / (double) total) * 100.0
        return "${completed}/${total} ${itemType} (${Math.round(percentage)}%)"
    }
    
    /**
     * Map status to email CSS class
     */
    private String mapStatusToEmailClass(String status) {
        if (!status) return "status-unknown"
        
        switch (status.toUpperCase()) {
            case 'PENDING': return 'status-pending'
            case 'IN_PROGRESS': return 'status-in-progress'
            case 'COMPLETED': return 'status-completed'
            case 'FAILED': return 'status-failed'
            case 'CANCELLED': return 'status-cancelled'
            default: return 'status-unknown'
        }
    }
    
    /**
     * Map priority to email CSS class
     */
    private String mapPriorityToEmailClass(Integer priority) {
        if (priority == null) return "priority-medium"
        
        if (priority >= 8) return "priority-high"
        if (priority >= 6) return "priority-medium-high"
        if (priority >= 4) return "priority-medium"
        if (priority >= 2) return "priority-low-medium"
        return "priority-low"
    }
}