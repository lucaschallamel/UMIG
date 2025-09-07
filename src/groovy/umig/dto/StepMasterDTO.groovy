package umig.dto

import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.ObjectMapper
import umig.utils.JsonUtil
import groovy.transform.ToString
import groovy.transform.EqualsAndHashCode
import groovy.util.logging.Slf4j

/**
 * Step Master Data Transfer Object for US-056F Dual DTO Architecture
 * 
 * Represents template/blueprint Step entities without execution data.
 * This DTO is specifically for Step master records that define the template,
 * not the runtime execution instances.
 * 
 * Following UMIG patterns:
 * - ADR-031 Type Safety with explicit casting
 * - ADR-047 Single enrichment point pattern
 * - Defensive programming with null safety
 * - camelCase naming for JSON consistency
 * - Jackson integration for serialization
 * 
 * @since US-056F Sprint 6
 * @author UMIG Development Team
 */
@ToString(includeNames = true)
@EqualsAndHashCode(includes = ['stepMasterId'])
@JsonIgnoreProperties(ignoreUnknown = true)
@Slf4j
class StepMasterDTO {
    
    // ========================================
    // CORE MASTER IDENTIFICATION
    // ========================================
    
    /** Primary step master identifier (UUID as string for JSON compatibility) */
    @JsonProperty("stepMasterId")
    String stepMasterId
    
    /** Step type code (e.g., 'CUTOVER', 'PREPARATION', 'VALIDATION') */
    @JsonProperty("stepTypeCode")
    String stepTypeCode
    
    /** Step number within the type sequence */
    @JsonProperty("stepNumber")
    Integer stepNumber
    
    /** Human-readable step name */
    @JsonProperty("stepName")
    String stepName
    
    /** Detailed step description */
    @JsonProperty("stepDescription")
    String stepDescription
    
    // ========================================
    // HIERARCHICAL CONTEXT
    // ========================================
    
    /** Parent phase identifier (UUID as string) */
    @JsonProperty("phaseId")
    String phaseId
    
    // ========================================
    // TEMPORAL FIELDS (TEMPLATE METADATA)
    // ========================================
    
    /** Creation date in ISO-8601 format */
    @JsonProperty("createdDate")
    String createdDate
    
    /** Last modification date in ISO-8601 format */
    @JsonProperty("lastModifiedDate")
    String lastModifiedDate
    
    /** Active status flag */
    @JsonProperty("isActive")
    Boolean isActive
    
    // ========================================
    // COMPUTED METADATA FIELDS
    // ========================================
    
    /** Count of associated instruction templates */
    @JsonProperty("instructionCount")
    Integer instructionCount
    
    /** Count of instances created from this master */
    @JsonProperty("instanceCount")
    Integer instanceCount
    
    // ========================================
    // SERIALIZATION AND VALIDATION
    // ========================================
    
    /**
     * Convert DTO to JSON string representation
     * @return JSON string representation of the DTO
     */
    String toJson() {
        return JsonUtil.toJson(this)
    }
    
    /**
     * Create DTO from JSON string
     * @param json JSON string representation
     * @return StepMasterDTO instance
     */
    static StepMasterDTO fromJson(String json) {
        return JsonUtil.fromJson(json, StepMasterDTO.class)
    }
    
    /**
     * Validate required fields are present
     * @return true if all required fields are present
     */
    boolean isValid() {
        return stepMasterId != null && 
               stepTypeCode != null && 
               stepNumber != null && 
               stepName != null
    }
    
    /**
     * Builder pattern for creating StepMasterDTO instances
     */
    static class Builder {
        private StepMasterDTO dto = new StepMasterDTO()
        
        Builder withStepMasterId(String stepMasterId) {
            dto.stepMasterId = stepMasterId
            return this
        }
        
        Builder withStepTypeCode(String stepTypeCode) {
            dto.stepTypeCode = stepTypeCode
            return this
        }
        
        Builder withStepNumber(Integer stepNumber) {
            dto.stepNumber = stepNumber
            return this
        }
        
        Builder withStepName(String stepName) {
            dto.stepName = stepName
            return this
        }
        
        Builder withStepDescription(String stepDescription) {
            dto.stepDescription = stepDescription
            return this
        }
        
        Builder withPhaseId(String phaseId) {
            dto.phaseId = phaseId
            return this
        }
        
        Builder withCreatedDate(String createdDate) {
            dto.createdDate = createdDate
            return this
        }
        
        Builder withLastModifiedDate(String lastModifiedDate) {
            dto.lastModifiedDate = lastModifiedDate
            return this
        }
        
        Builder withIsActive(Boolean isActive) {
            dto.isActive = isActive
            return this
        }
        
        Builder withInstructionCount(Integer instructionCount) {
            dto.instructionCount = instructionCount
            return this
        }
        
        Builder withInstanceCount(Integer instanceCount) {
            dto.instanceCount = instanceCount
            return this
        }
        
        StepMasterDTO build() {
            if (!dto.isValid()) {
                log.warn("Building StepMasterDTO with missing required fields")
            }
            return dto
        }
    }
    
    /**
     * Factory method to create a builder
     * @return New Builder instance
     */
    static Builder builder() {
        return new Builder()
    }
    
    /**
     * Create a defensive copy of this DTO
     * @return New StepMasterDTO instance with same values
     */
    StepMasterDTO copy() {
        return builder()
            .withStepMasterId(this.stepMasterId)
            .withStepTypeCode(this.stepTypeCode)
            .withStepNumber(this.stepNumber)
            .withStepName(this.stepName)
            .withStepDescription(this.stepDescription)
            .withPhaseId(this.phaseId)
            .withCreatedDate(this.createdDate)
            .withLastModifiedDate(this.lastModifiedDate)
            .withIsActive(this.isActive)
            .withInstructionCount(this.instructionCount)
            .withInstanceCount(this.instanceCount)
            .build()
    }
}