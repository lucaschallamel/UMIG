package umig.dto

import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.ObjectMapper
import umig.utils.JsonUtil
import umig.service.StatusService
import groovy.transform.ToString
import groovy.transform.EqualsAndHashCode
import groovy.util.logging.Slf4j

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Step Instance Data Transfer Object for US-056F Dual DTO Architecture
 * 
 * Represents Step **instance** entities (execution records) with runtime execution data.
 * Part of US-056F dual DTO architecture - renamed from StepDataTransferObject for clarity.
 * 
 * Instance DTOs contain execution-specific fields:
 * - Execution status and assignments
 * - Runtime progress tracking
 * - Team assignments and ownership
 * - Execution timestamps and duration
 * 
 * Following UMIG patterns:
 * - ADR-031 Type Safety with explicit casting
 * - Defensive programming with null safety
 * - camelCase naming for JSON consistency
 * - Jackson integration for serialization
 * 
 * @since US-056F Dual DTO Architecture (renamed from StepDataTransferObject)
 * @author UMIG Development Team
 */
@ToString(includeNames = true, excludes = ['comments'])
@EqualsAndHashCode(includes = ['stepId', 'stepInstanceId'])
@JsonIgnoreProperties(ignoreUnknown = true)
@Slf4j
class StepInstanceDTO {

    // ========================================
    // TD-003 PHASE 2B: STATUS SERVICE INTEGRATION
    // ========================================

    /** StatusService for centralized status management (lazy loading) */
    private static StatusService statusService

    /**
     * Get StatusService instance with lazy loading pattern
     * @return StatusService instance
     */
    private static StatusService getStatusService() {
        if (!statusService) {
            statusService = new StatusService()
            log.debug("StepInstanceDTO: StatusService lazy loaded for validation")
        }
        return statusService
    }

    // ========================================
    // CORE STEP IDENTIFICATION
    // ========================================
    
    /** Primary step identifier (UUID as string for JSON compatibility) */
    @JsonProperty("stepId")
    String stepId
    
    /** Step instance identifier for specific executions */
    @JsonProperty("stepInstanceId") 
    String stepInstanceId
    
    /** Human-readable step name */
    @JsonProperty("stepName")
    String stepName
    
    /** Detailed step description */
    @JsonProperty("stepDescription")
    String stepDescription
    
    /** Current step status (dynamically loaded from status configuration) */
    @JsonProperty("stepStatus")
    String stepStatus
    
    // ========================================
    // TEAM ASSIGNMENT AND OWNERSHIP
    // ========================================

    /** Assigned team identifier */
    @JsonProperty("assignedTeamId")
    String assignedTeamId

    /** Assigned team display name */
    @JsonProperty("assignedTeamName")
    String assignedTeamName

    // ========================================
    // ENVIRONMENT AND IMPACTED TEAMS
    // ========================================

    /** Target environment name for step execution */
    @JsonProperty("environmentName")
    String environmentName

    /** Target environment identifier */
    @JsonProperty("environmentId")
    String environmentId

    /** Comma-separated list of impacted team names */
    @JsonProperty("impactedTeams")
    String impactedTeams

    // ========================================
    // PREDECESSOR RELATIONSHIP
    // ========================================

    /** Predecessor step code (e.g., "BUS-30") */
    @JsonProperty("predecessorCode")
    String predecessorCode

    /** Predecessor step name */
    @JsonProperty("predecessorName")
    String predecessorName

    /** Predecessor step identifier */
    @JsonProperty("predecessorId")
    String predecessorId

    // ========================================
    // HIERARCHICAL CONTEXT
    // ========================================
    
    /** Parent migration identifier */
    @JsonProperty("migrationId")
    String migrationId
    
    /** Migration code for display */
    @JsonProperty("migrationCode")
    String migrationCode
    
    /** Parent iteration identifier */
    @JsonProperty("iterationId")
    String iterationId
    
    /** Iteration code for display */
    @JsonProperty("iterationCode")
    String iterationCode
    
    /** Parent sequence identifier */
    @JsonProperty("sequenceId")
    String sequenceId
    
    /** Parent sequence name */
    @JsonProperty("sequenceName")
    String sequenceName

    /** Sequence order number (from sqi_order) */
    @JsonProperty("sequenceNumber")
    Integer sequenceNumber

    /** Parent phase identifier */
    @JsonProperty("phaseId")
    String phaseId

    /** Parent phase name */
    @JsonProperty("phaseName")
    String phaseName

    /** Phase order number (from phi_order) */
    @JsonProperty("phaseNumber")
    Integer phaseNumber

    /** Step number from master table (e.g., 3 for BGO-3) */
    @JsonProperty("stepNumber")
    Integer stepNumber

    /** Complete step code (e.g., BGO-3) combining type and number */
    @JsonProperty("stepCode")
    String getStepCode() {
        return (stepType && stepNumber) ? "${stepType}-${stepNumber}" : null
    }

    // ========================================
    // TEMPORAL AND STATUS FIELDS
    // ========================================
    
    /** Step creation timestamp */
    @JsonProperty("createdDate")
    LocalDateTime createdDate
    
    /** Last modification timestamp */
    @JsonProperty("lastModifiedDate")
    LocalDateTime lastModifiedDate
    
    /** Active status indicator */
    @JsonProperty("isActive")
    Boolean isActive = true
    
    /** Priority level (1-10, higher = more important) */
    @JsonProperty("priority")
    Integer priority = 5
    
    // ========================================
    // EXTENDED METADATA
    // ========================================
    
    /** Step classification type */
    @JsonProperty("stepType")
    String stepType
    
    /** Step category for grouping */
    @JsonProperty("stepCategory")
    String stepCategory
    
    /** Estimated duration in minutes */
    @JsonProperty("estimatedDuration")
    Integer estimatedDuration
    
    /** Actual duration in minutes */
    @JsonProperty("actualDuration")
    Integer actualDuration
    
    /** Total number of dependencies */
    @JsonProperty("dependencyCount")
    Integer dependencyCount = 0
    
    /** Number of completed dependencies */
    @JsonProperty("completedDependencies")
    Integer completedDependencies = 0
    
    /** Total number of instructions */
    @JsonProperty("instructionCount")
    Integer instructionCount = 0
    
    /** Number of completed instructions */
    @JsonProperty("completedInstructions")
    Integer completedInstructions = 0
    
    // ========================================
    // COMMENT INTEGRATION
    // ========================================

    /** Recent comments (limit to last 5 for performance) */
    @JsonProperty("comments")
    List<CommentDTO> comments = []

    /** Indicates if there are active/unresolved comments */
    @JsonProperty("hasActiveComments")
    Boolean hasActiveComments = false

    /** Timestamp of most recent comment */
    @JsonProperty("lastCommentDate")
    LocalDateTime lastCommentDate

    // ========================================
    // ASSOCIATED ENTITIES
    // ========================================

    /** List of label objects inherited from step master */
    @JsonProperty("labels")
    List<Map<String, Object>> labels

    // ========================================
    // COMPUTED PROPERTIES
    // ========================================
    
    /**
     * Calculate dependency completion percentage
     * @return Percentage (0-100) or null if no dependencies
     */
    @JsonProperty("dependencyCompletionPercentage")
    Double getDependencyCompletionPercentage() {
        if (dependencyCount == null || dependencyCount == 0) {
            return null
        }
        
        def completed = completedDependencies ?: 0
        // ADR-031 Type Safety: Convert to double for Math.round() compatibility
        double percentage = ((double) completed / (double) dependencyCount) * 100.0d
        return Math.round(percentage * 100.0d) / 100.0d  // Round to 2 decimals
    }
    
    /**
     * Calculate instruction completion percentage
     * @return Percentage (0-100) or null if no instructions
     */
    @JsonProperty("instructionCompletionPercentage")
    Double getInstructionCompletionPercentage() {
        if (instructionCount == null || instructionCount == 0) {
            return null
        }
        
        def completed = completedInstructions ?: 0
        // ADR-031 Type Safety: Convert to double for Math.round() compatibility  
        double percentage = ((double) completed / (double) instructionCount) * 100.0d
        return Math.round(percentage * 100.0d) / 100.0d  // Round to 2 decimals
    }
    
    /**
     * Determine if step is ready to start based on dependencies
     * @return true if all dependencies completed or no dependencies exist
     */
    @JsonProperty("isReadyToStart")
    Boolean getIsReadyToStart() {
        if (dependencyCount == null || dependencyCount == 0) {
            return true
        }
        
        def completed = completedDependencies ?: 0
        return completed >= dependencyCount
    }
    
    // ========================================
    // VALIDATION AND SCHEMA SUPPORT
    // ========================================
    
    /**
     * Validate DTO data against business rules
     * @return List of validation errors (empty if valid)
     */
    List<String> validate() {
        List<String> errors = []
        
        // Required field validation
        if (!stepId) errors.add("stepId is required")
        if (!stepName) errors.add("stepName is required")
        if (!stepStatus) errors.add("stepStatus is required")
        
        // UUID format validation
        if (stepId && !isValidUUID(stepId)) errors.add("stepId must be valid UUID format")
        if (stepInstanceId && !isValidUUID(stepInstanceId)) errors.add("stepInstanceId must be valid UUID format")
        
        // Status validation
        if (stepStatus && !isValidStatus(stepStatus)) {
            errors.add("stepStatus must be a valid status for Step entities")
        }
        
        // Priority validation
        if (priority != null && (priority < 1 || priority > 10)) {
            errors.add("priority must be between 1 and 10")
        }
        
        // Duration validation
        if (estimatedDuration != null && estimatedDuration < 0) {
            errors.add("estimatedDuration cannot be negative")
        }
        if (actualDuration != null && actualDuration < 0) {
            errors.add("actualDuration cannot be negative")
        }
        
        // Count validation
        if (dependencyCount != null && dependencyCount < 0) {
            errors.add("dependencyCount cannot be negative")
        }
        if (completedDependencies != null && completedDependencies < 0) {
            errors.add("completedDependencies cannot be negative")
        }
        if (instructionCount != null && instructionCount < 0) {
            errors.add("instructionCount cannot be negative")
        }
        if (completedInstructions != null && completedInstructions < 0) {
            errors.add("completedInstructions cannot be negative")
        }
        
        // Cross-field validation
        if (dependencyCount != null && completedDependencies != null && completedDependencies > dependencyCount) {
            errors.add("completedDependencies cannot exceed dependencyCount")
        }
        if (instructionCount != null && completedInstructions != null && completedInstructions > instructionCount) {
            errors.add("completedInstructions cannot exceed instructionCount")
        }
        
        return errors
    }
    
    /**
     * Validate UUID string format
     * @param uuidString UUID to validate
     * @return true if valid UUID format
     */
    private static boolean isValidUUID(String uuidString) {
        try {
            UUID.fromString(uuidString)
            return true
        } catch (IllegalArgumentException e) {
            return false
        }
    }
    
    /**
     * Validate step status value - TD-003 Phase 2B Migration
     * Uses StatusService for centralized status management
     * @param status Status to validate
     * @return true if valid status
     */
    private static boolean isValidStatus(String status) {
        try {
            List<String> validStatuses = getStatusService().getValidStatusNames('Step')
            return status in validStatuses
        } catch (Exception e) {
            log.warn("StepInstanceDTO: Failed to validate status '${status}' via StatusService: ${e.message}")
            // Fallback to prevent validation failures from blocking the system
            return status != null && status.trim().length() > 0
        }
    }
    
    // ========================================
    // JSON SERIALIZATION METHODS
    // ========================================
    
    /**
     * Convert DTO to JSON string
     * @return JSON representation
     */
    String toJson() {
        return JsonUtil.toJson(this)
    }
    
    /**
     * Create DTO from JSON string
     * @param jsonString JSON representation
     * @return StepInstanceDTO instance
     */
    static StepInstanceDTO fromJson(String jsonString) {
        return JsonUtil.fromJson(jsonString, StepInstanceDTO.class)
    }
    
    /**
     * Convert DTO to Map for template processing
     * @return Map representation suitable for email templates
     */
    Map<String, Object> toTemplateMap() {
        Map<String, Object> map = [:]
        
        // Core identification
        map.stepId = stepId
        map.stepInstanceId = stepInstanceId
        map.stepName = stepName ?: ""
        map.stepDescription = stepDescription ?: ""
        map.stepStatus = stepStatus ?: "UNKNOWN"
        
        // Team information
        map.assignedTeamId = assignedTeamId
        map.assignedTeamName = assignedTeamName ?: "Unassigned"

        // Environment and impacted teams for email templates
        map.environmentId = environmentId
        map.environmentName = environmentName ?: ""
        map.impactedTeams = impactedTeams ?: ""

        // Predecessor information for email templates
        map.predecessorId = predecessorId
        map.predecessorCode = predecessorCode ?: ""
        map.predecessorName = predecessorName ?: ""

        // Hierarchical context
        map.migrationId = migrationId
        map.migrationCode = migrationCode ?: ""
        map.iterationId = iterationId
        map.iterationCode = iterationCode ?: ""
        map.sequenceId = sequenceId
        map.sequenceName = sequenceName
        map.sequenceNumber = sequenceNumber
        map.phaseId = phaseId
        map.phaseName = phaseName
        map.phaseNumber = phaseNumber
        
        // Timestamps (formatted for display)
        map.createdDate = createdDate?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        map.lastModifiedDate = lastModifiedDate?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        map.isActive = isActive ?: false
        map.priority = priority ?: 5
        
        // Extended metadata
        map.stepType = stepType ?: ""
        map.stepCategory = stepCategory ?: ""
        map.estimatedDuration = estimatedDuration ?: 0
        map.actualDuration = actualDuration ?: 0
        
        // Progress information
        map.dependencyCount = dependencyCount ?: 0
        map.completedDependencies = completedDependencies ?: 0
        map.instructionCount = instructionCount ?: 0
        map.completedInstructions = completedInstructions ?: 0
        
        // Computed values
        map.dependencyCompletionPercentage = getDependencyCompletionPercentage()
        map.instructionCompletionPercentage = getInstructionCompletionPercentage()
        map.isReadyToStart = getIsReadyToStart()
        
        // Comment information
        map.hasActiveComments = hasActiveComments ?: false
        map.lastCommentDate = lastCommentDate?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        map.commentCount = comments?.size() ?: 0
        
        // Recent comments for email display (US-056B Template Integration)
        map.recentComments = comments?.take(3)?.collect { comment ->
            // Use CommentDTO's toTemplateMap() for consistent template integration
            if (comment instanceof CommentDTO) {
                return comment.toTemplateMap()
            } else {
                // Fallback for legacy comment objects
                return [
                    comment_id: comment.commentId ?: "",
                    comment_text: comment.text ?: "",
                    author_id: comment.authorId ?: "",
                    author_name: comment.authorName ?: "Anonymous",
                    created_at: comment.createdDate?.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) ?: "",
                    is_active: comment.isActive ?: true,
                    is_resolved: comment.isResolved ?: false,
                    formatted_date: comment.createdDate?.format(DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm")) ?: "Recent",
                    is_recent: comment.createdDate?.isAfter(LocalDateTime.now().minusHours(24)) ?: false
                ]
            }
        } ?: []
        
        return map
    }
    
    // ========================================
    // DEFENSIVE CONSTRUCTION METHODS
    // ========================================
    
    /**
     * Safe builder pattern for DTO construction
     */
    static class Builder {
        private StepInstanceDTO dto = new StepInstanceDTO()
        
        Builder stepId(String stepId) { dto.stepId = stepId; return this }
        Builder stepInstanceId(String stepInstanceId) { dto.stepInstanceId = stepInstanceId; return this }
        Builder stepName(String stepName) { dto.stepName = stepName; return this }
        Builder stepDescription(String stepDescription) { dto.stepDescription = stepDescription; return this }
        Builder stepStatus(String stepStatus) { dto.stepStatus = stepStatus; return this }
        Builder assignedTeamId(String teamId) { dto.assignedTeamId = teamId; return this }
        Builder assignedTeamName(String teamName) { dto.assignedTeamName = teamName; return this }
        Builder environmentId(String environmentId) { dto.environmentId = environmentId; return this }
        Builder environmentName(String environmentName) { dto.environmentName = environmentName; return this }
        Builder impactedTeams(String impactedTeams) { dto.impactedTeams = impactedTeams; return this }
        Builder predecessorId(String predecessorId) { dto.predecessorId = predecessorId; return this }
        Builder predecessorCode(String predecessorCode) { dto.predecessorCode = predecessorCode; return this }
        Builder predecessorName(String predecessorName) { dto.predecessorName = predecessorName; return this }
        Builder migrationId(String migrationId) { dto.migrationId = migrationId; return this }
        Builder migrationCode(String migrationCode) { dto.migrationCode = migrationCode; return this }
        Builder iterationId(String iterationId) { dto.iterationId = iterationId; return this }
        Builder iterationCode(String iterationCode) { dto.iterationCode = iterationCode; return this }
        Builder sequenceId(String sequenceId) { dto.sequenceId = sequenceId; return this }
        Builder sequenceName(String sequenceName) { dto.sequenceName = sequenceName; return this }
        Builder sequenceNumber(Integer sequenceNumber) { dto.sequenceNumber = sequenceNumber; return this }
        Builder phaseId(String phaseId) { dto.phaseId = phaseId; return this }
        Builder phaseName(String phaseName) { dto.phaseName = phaseName; return this }
        Builder phaseNumber(Integer phaseNumber) { dto.phaseNumber = phaseNumber; return this }
        Builder stepNumber(Integer stepNumber) { dto.stepNumber = stepNumber; return this }
        Builder priority(Integer priority) { dto.priority = priority; return this }
        Builder stepType(String stepType) { dto.stepType = stepType; return this }
        Builder stepCategory(String stepCategory) { dto.stepCategory = stepCategory; return this }
        Builder estimatedDuration(Integer duration) { dto.estimatedDuration = duration; return this }
        Builder actualDuration(Integer duration) { dto.actualDuration = duration; return this }
        Builder dependencyCount(Integer count) { dto.dependencyCount = count; return this }
        Builder completedDependencies(Integer count) { dto.completedDependencies = count; return this }
        Builder instructionCount(Integer count) { dto.instructionCount = count; return this }
        Builder completedInstructions(Integer count) { dto.completedInstructions = count; return this }
        Builder comments(List<CommentDTO> comments) { dto.comments = comments ?: []; return this }
        Builder hasActiveComments(Boolean hasActive) { dto.hasActiveComments = hasActive; return this }
        Builder lastCommentDate(LocalDateTime date) { dto.lastCommentDate = date; return this }
        Builder isActive(Boolean active) { dto.isActive = active; return this }
        Builder createdDate(LocalDateTime date) { dto.createdDate = date; return this }
        Builder lastModifiedDate(LocalDateTime date) { dto.lastModifiedDate = date; return this }
        Builder labels(List<Map<String, Object>> labels) { dto.labels = labels; return this }
        
        StepInstanceDTO build() {
            // Set default timestamps if not provided
            if (!dto.createdDate) {
                dto.createdDate = LocalDateTime.now()
            }
            if (!dto.lastModifiedDate) {
                dto.lastModifiedDate = LocalDateTime.now()
            }
            
            // Validate before returning
            List<String> errors = dto.validate()
            if (errors) {
                throw new IllegalArgumentException("StepInstanceDTO validation failed: ${errors.join(', ')}")
            }
            
            return dto
        }
    }
    
    /**
     * Create new builder instance
     * @return Builder for fluent construction
     */
    static Builder builder() {
        return new Builder()
    }
    
    /**
     * Create DTO with minimal required fields
     * @param stepId Step identifier
     * @param stepName Step name  
     * @param stepStatus Step status
     * @return Validated StepInstanceDTO
     */
    static StepInstanceDTO create(String stepId, String stepName, String stepStatus) {
        return builder()
            .stepId(stepId)
            .stepName(stepName)
            .stepStatus(stepStatus)
            .build()
    }
}