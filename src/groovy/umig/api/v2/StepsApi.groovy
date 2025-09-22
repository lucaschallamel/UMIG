package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.StepRepository
import umig.repository.StatusRepository
import umig.repository.UserRepository
import umig.utils.DatabaseUtil
import umig.utils.StepNotificationIntegration
import umig.dto.StepInstanceDTO
import umig.dto.StepMasterDTO
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID
import java.sql.SQLException

/**
 * Steps API - repositories instantiated at script level
 */
@BaseScript CustomEndpointDelegate delegate

// Instantiate repositories at script level (following TeamsApi pattern)
final StepRepository stepRepository = new StepRepository()
final StatusRepository statusRepository = new StatusRepository()
final UserRepository userRepository = new UserRepository()

/**
 * Handles GET requests for Steps with hierarchical filtering for the runsheet.
 * - GET /steps -> returns all steps (not recommended for production)
 * - GET /steps/master -> returns all master steps for dropdowns
 * - GET /steps/master/{id} -> returns specific master step by ID
 * - GET /steps?migrationId={uuid} -> returns steps in a migration
 * - GET /steps?iterationId={uuid} -> returns steps in an iteration
 * - GET /steps?planId={uuid} -> returns steps in a plan
 * - GET /steps?sequenceId={uuid} -> returns steps in a sequence
 * - GET /steps?phaseId={uuid} -> returns steps in a phase
 * - GET /steps?teamId={uuid} -> returns steps owned by a team
 * - GET /steps?labelId={uuid} -> returns steps with a label
 * 
 * Multiple filters can be combined for progressive refinement.
 * Results are ordered by sequence number, phase number, and step number.
 */
steps(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // Parse and validate query parameters for filtering with type safety (ADR-031) - inline
    def parseAndValidateFilters = { MultivaluedMap qParams ->
        def filters = [:]
        
        // UUID parameters with explicit casting and validation
        if (qParams.getFirst("migrationId")) {
            try {
                filters.migrationId = UUID.fromString(qParams.getFirst("migrationId") as String)
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid migrationId format: must be a valid UUID")
            }
        }
        
        if (qParams.getFirst("iterationId")) {
            try {
                filters.iterationId = UUID.fromString(qParams.getFirst("iterationId") as String)
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid iterationId format: must be a valid UUID")
            }
        }
        
        if (qParams.getFirst("planId")) {
            try {
                filters.planId = UUID.fromString(qParams.getFirst("planId") as String)
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid planId format: must be a valid UUID")
            }
        }
        
        if (qParams.getFirst("sequenceId")) {
            try {
                filters.sequenceId = UUID.fromString(qParams.getFirst("sequenceId") as String)
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid sequenceId format: must be a valid UUID")
            }
        }
        
        if (qParams.getFirst("phaseId")) {
            try {
                filters.phaseId = UUID.fromString(qParams.getFirst("phaseId") as String)
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid phaseId format: must be a valid UUID")
            }
        }
        
        if (qParams.getFirst("labelId")) {
            try {
                filters.labelId = Integer.parseInt(qParams.getFirst("labelId") as String)
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid labelId format: must be a valid integer")
            }
        }
        
        // Integer parameters with explicit casting and validation
        if (qParams.getFirst("teamId")) {
            try {
                filters.teamId = Integer.parseInt(qParams.getFirst("teamId") as String)
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid teamId format: must be a valid integer")
            }
        }
        
        if (qParams.getFirst("statusId")) {
            try {
                filters.statusId = Integer.parseInt(qParams.getFirst("statusId") as String)
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid statusId format: must be a valid integer")
            }
        }
        
        // String parameters with validation
        if (qParams.getFirst("status")) {
            def status = qParams.getFirst("status") as String
            if (status.trim().isEmpty()) {
                throw new IllegalArgumentException("Status parameter cannot be empty")
            }
            filters.status = status.toUpperCase()
        }
        
        return filters
    }
    
    // Validate pagination parameters with type safety and limits - inline
    def validatePaginationParams = { MultivaluedMap qParams ->
        def limit = 100  // default limit
        def offset = 0   // default offset
        
        if (qParams.getFirst("limit")) {
            try {
                def requestedLimit = Integer.parseInt(qParams.getFirst("limit") as String)
                if (requestedLimit <= 0) {
                    throw new IllegalArgumentException("Limit must be greater than 0")
                }
                if (requestedLimit > 1000) {
                    throw new IllegalArgumentException("Limit cannot exceed 1000")
                }
                limit = requestedLimit
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid limit format: must be a valid integer")
            }
        }
        
        if (qParams.getFirst("offset")) {
            try {
                def requestedOffset = Integer.parseInt(qParams.getFirst("offset") as String)
                if (requestedOffset < 0) {
                    throw new IllegalArgumentException("Offset cannot be negative")
                }
                offset = requestedOffset
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid offset format: must be a valid integer")
            }
        }
        
        return [limit: limit, offset: offset]
    }
    
    // Enhanced error handling with SQL state mapping and context - inline
    def handleError = { Exception e, String context ->
        if (e instanceof IllegalArgumentException) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: e.message,
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        // SQL state mappings (ADR-031)
        def errorMessage = e.message?.toLowerCase() ?: ""
        if (errorMessage.contains("23503") || errorMessage.contains("foreign key")) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Invalid reference: related entity not found",
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        if (errorMessage.contains("23505") || errorMessage.contains("unique constraint")) {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([
                    error: "Duplicate entry: resource already exists",
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        // Default internal server error
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Internal server error: ${e.message}",
                context: context,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]).toString())
            .build()
    }
    
    // GET /steps/instance/{stepInstanceId} - return step instance details with instructions
    if (pathParts.size() == 2 && pathParts[0] == 'instance') {
        def stepInstanceId = pathParts[1]
        
        try {
            // Try to parse as UUID first
            UUID stepInstanceUuid = UUID.fromString(stepInstanceId)
            // Use script-level repository instance
            def stepDetails = stepRepository.findStepInstanceDetailsById(stepInstanceUuid)
            
            if (!stepDetails) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Step instance not found for ID: ${stepInstanceId}"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(stepDetails).toString()).build()
            
        } catch (IllegalArgumentException e) {
            // If not a valid UUID, try to parse as step code for backward compatibility
            try {
                // Use script-level repository instance
                def stepDetails = stepRepository.findStepInstanceDetailsByCode(stepInstanceId)
                
                if (!stepDetails) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Step instance not found for code: ${stepInstanceId}"]).toString())
                        .build()
                }
                
                return Response.ok(new JsonBuilder(stepDetails).toString()).build()
                
            } catch (Exception ex) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid step instance ID format: ${stepInstanceId}"]).toString())
                    .build()
            }
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to load step details: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /steps/{stepInstanceId}/comments - return comments for a step instance
    if (pathParts.size() == 2 && pathParts[1] == 'comments') {
        try {
            def stepInstanceId = pathParts[0]
            UUID stepInstanceUuid = UUID.fromString(stepInstanceId)
            // Use script-level repository instance
            def comments = stepRepository.findCommentsByStepInstanceId(stepInstanceUuid)
            
            return Response.ok(new JsonBuilder(comments).toString()).build()
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch comments: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /steps/master/{id} - return specific master step
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            def stepId = UUID.fromString(pathParts[1])
            // Use script-level repository instance
            def masterStepDTO = stepRepository.findMasterByIdAsDTO(stepId)
            
            if (!masterStepDTO) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master step not found for ID: ${stepId}"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(masterStepDTO).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to retrieve master step: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /steps/master - return master steps with Admin GUI support
    if (pathParts.size() == 1 && pathParts[0] == 'master') {
        try {
            // Extract query parameters for Admin GUI support
            def filters = [:]
            def pageNumber = 1
            def pageSize = 50
            def sortField = null
            def sortDirection = 'asc'

            // Extract standard parameters
            queryParams.keySet().each { param ->
                def value = queryParams.getFirst(param)
                switch (param) {
                    case 'page':
                        pageNumber = Integer.parseInt(value as String)
                        break
                    case 'size':
                        pageSize = Integer.parseInt(value as String)
                        break
                    case 'sort':
                        sortField = value as String
                        break
                    case 'direction':
                        sortDirection = value as String
                        break
                    default:
                        filters[param] = value
                }
            }

            // Validate sort field (removed stm_status as master steps don't have status)
            def allowedSortFields = ['stm_id', 'stm_name', 'stm_order', 'created_at', 'updated_at', 'instruction_count', 'instance_count', 'plm_name', 'sqm_name', 'phm_name']
            if (sortField && !allowedSortFields.contains(sortField)) {
                return Response.status(400)
                    .entity(new JsonBuilder([error: "Invalid sort field: ${sortField}. Allowed fields: ${allowedSortFields.join(', ')}", code: 400]).toString())
                    .build()
            }

            // Use script-level repository instance
            def result = stepRepository.findMasterStepsWithFiltersAsDTO(filters as Map, pageNumber as int, pageSize as int, sortField as String, sortDirection as String)
            return Response.ok(new JsonBuilder(result).toString()).build()
        } catch (SQLException e) {
            log.error("Database error in steps master GET: ${e.message}", e)
            def statusCode = mapSqlStateToHttpStatus(e.getSQLState())
            return Response.status(statusCode)
                .entity(new JsonBuilder([error: e.message, code: statusCode]).toString())
                .build()
        } catch (Exception e) {
            log.error("Unexpected error in steps master GET: ${e.message}", e)
            return Response.status(500)
                .entity(new JsonBuilder([error: "Internal server error", code: 500]).toString())
                .build()
        }
    }
    
    // GET /steps/summary - return dashboard summary metrics
    if (pathParts.size() == 1 && pathParts[0] == 'summary') {
        try {
            def migrationId = queryParams.getFirst("migrationId") as String
            if (!migrationId) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "migrationId parameter is required for summary"]).toString())
                    .build()
            }
            
            def migrationUuid = UUID.fromString(migrationId as String)
            // Use script-level repository instance
            def summary = stepRepository.getStepsSummary(migrationUuid)
            
            return Response.ok(new JsonBuilder(summary).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return handleError(e, "GET /steps/summary")
        } catch (Exception e) {
            return handleError(e, "GET /steps/summary")
        }
    }
    
    // GET /steps/progress - return progress tracking data  
    if (pathParts.size() == 1 && pathParts[0] == 'progress') {
        try {
            def migrationId = queryParams.getFirst("migrationId") as String
            if (!migrationId) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "migrationId parameter is required for progress tracking"]).toString())
                    .build()
            }
            
            def migrationUuid = UUID.fromString(migrationId as String)
            // Use script-level repository instance
            def progress = stepRepository.getStepsProgress(migrationUuid)
            
            return Response.ok(new JsonBuilder(progress).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return handleError(e, "GET /steps/progress")
        } catch (Exception e) {
            return handleError(e, "GET /steps/progress")
        }
    }
    
    // GET /steps/export - return steps data for export (JSON/CSV)
    if (pathParts.size() == 1 && pathParts[0] == 'export') {
        try {
            def filters = parseAndValidateFilters(queryParams)
            def format = (queryParams.getFirst("format") ?: "json") as String
            
            if (!["json", "csv"].contains(format.toLowerCase())) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Format must be 'json' or 'csv'"]).toString())
                    .build()
            }
            
            // Use enhanced repository method for export with DTO transformation
            // Use script-level repository instance
            Map<String, Object> exportResult = stepRepository.findStepsWithFiltersAsDTO_v2(filters, 1, 10000, 'created_date', 'desc') as Map<String, Object>
            Map<String, Object> exportData = [data: exportResult.data]
            
            if (format.toLowerCase() == "csv") {
                // Generate CSV format - inline method
                List<StepInstanceDTO> steps = (exportData.data as List<StepInstanceDTO>) ?: []
                String csvContent
                if (!steps || steps.isEmpty()) {
                    csvContent = "No data available"
                } else {
                    List<String> headers = [
                        "Step ID", "Step Code", "Step Name", "Status", "Team", 
                        "Sequence", "Phase", "Duration (min)", "Created At", "Updated At"
                    ]
                    
                    List<String> csvLines = [headers.join(",")]
                    
                    steps.each { StepInstanceDTO stepDTO ->
                        // Map DTO properties to expected CSV format (ADR-031 Type Safety)
                        String stepCode = "${stepDTO.stepType ?: 'UNK'}-${stepDTO.stepInstanceId ? stepDTO.stepInstanceId.toString().substring(0, 8) : 'UNKNOWN'}"
                        String status = stepDTO.stepStatus ?: ''
                        Integer durationMinutes = stepDTO.estimatedDuration ?: stepDTO.actualDuration ?: 0
                        String createdDate = stepDTO.createdDate?.toString() ?: ''
                        String lastModifiedDate = stepDTO.lastModifiedDate?.toString() ?: ''
                        String sequenceName = stepDTO.sequenceName ?: '' // Now using actual sequence name from DTO
                        String phaseName = stepDTO.phaseName ?: '' // Now using actual phase name from DTO
                        
                        List<String> line = [
                            "\"${stepDTO.stepInstanceId ?: ''}\"".toString(),
                            "\"${stepCode}\"".toString(), 
                            "\"${stepDTO.stepName ?: ''}\"".toString(),
                            "\"${status}\"".toString(),
                            "\"${stepDTO.assignedTeamName ?: 'Unassigned'}\"".toString(),
                            "\"${sequenceName}\"".toString(),
                            "\"${phaseName}\"".toString(),
                            durationMinutes.toString(),
                            "\"${createdDate}\"".toString(),
                            "\"${lastModifiedDate}\"".toString()
                        ]
                        csvLines.add(line.join(","))
                    }
                    
                    csvContent = csvLines.join("\n")
                }
                
                return Response.ok(csvContent)
                    .header("Content-Type", "text/csv")
                    .header("Content-Disposition", "attachment; filename=steps_export.csv")
                    .build()
            } else {
                // Default JSON format
                return Response.ok(new JsonBuilder(exportData).toString())
                    .header("Content-Type", "application/json")
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return handleError(e, "GET /steps/export")
        } catch (Exception e) {
            return handleError(e, "GET /steps/export")
        }
    }
    
    // GET /steps with query parameters for hierarchical filtering (MODERNIZED)
    if (pathParts.empty) {
        try {
            // Parse and validate parameters with type safety
            def filters = parseAndValidateFilters(queryParams)
            def pagination = validatePaginationParams(queryParams)
            
            // Check if this is a simple list request or enhanced filtering
            def useEnhancedMethod = queryParams.getFirst("enhanced") == "true" || 
                                   queryParams.getFirst("limit") || 
                                   queryParams.getFirst("offset")
            
            // Use script-level repository instance
            
            if (useEnhancedMethod) {
                // Use enhanced repository method with pagination and DTO transformation
                def result = stepRepository.findStepsWithFiltersAsDTO_v2(
                    filters,
                    1, // pageNumber
                    pagination.limit as Integer,
                    'created_date',
                    'desc'
                )
                
                return Response.ok(new JsonBuilder(result).toString()).build()
            } else {
                // Backward compatibility: use DTO version for proper service layer integration  
                List<StepInstanceDTO> stepDTOs = stepRepository.findFilteredStepInstancesAsDTO(filters) as List<StepInstanceDTO>
                
                // Transform DTOs to maintain existing API contract structure (ADR-031 Type Safety)
                List<Map<String, Object>> steps = stepDTOs.collect { StepInstanceDTO stepDTO ->
                    [
                        id: stepDTO.stepInstanceId,
                        stmId: stepDTO.stepId,
                        sttCode: stepDTO.stepType,
                        stmNumber: 1, // stepNumber not available in DTO, using default
                        name: stepDTO.stepName,
                        status: stepDTO.stepStatus, // Corrected property name
                        durationMinutes: stepDTO.estimatedDuration ?: stepDTO.actualDuration ?: 0, // Corrected property name
                        ownerTeamId: stepDTO.assignedTeamId,
                        ownerTeamName: stepDTO.assignedTeamName ?: 'Unassigned',
                        sequenceId: stepDTO.sequenceId, // Corrected property name
                        sequenceNumber: stepDTO.sequenceNumber ?: 1, // Now using actual sequence order from DTO
                        sequenceName: stepDTO.sequenceName ?: '', // Now using actual sequence name from DTO
                        phaseId: stepDTO.phaseId, // Corrected property name
                        phaseNumber: stepDTO.phaseNumber ?: 1, // Now using actual phase order from DTO
                        phaseName: stepDTO.phaseName ?: '' // Now using actual phase name from DTO
                    ] as Map<String, Object>
                }
            
            // Group steps by sequence and phase for frontend consumption (ADR-031 Type Safety)
            Map<String, Map<String, Object>> groupedSteps = [:]
            
            steps.each { Map<String, Object> stepItem ->
                Map<String, Object> step = stepItem
                String sequenceKey = "${step.sequenceNumber}-${step.sequenceId}"
                String phaseKey = "${step.phaseNumber}-${step.phaseId}"
                
                if (!groupedSteps[sequenceKey]) {
                    groupedSteps[sequenceKey] = [
                        id: step.sequenceId,
                        name: step.sequenceName,
                        number: step.sequenceNumber,
                        phases: [:] as Map<String, Map<String, Object>>
                    ] as Map<String, Object>
                }
                
                Map<String, Object> sequenceMap = groupedSteps[sequenceKey]
                Map<String, Map<String, Object>> phasesMap = sequenceMap.phases as Map<String, Map<String, Object>>
                
                if (!phasesMap[phaseKey]) {
                    phasesMap[phaseKey] = [
                        id: step.phaseId,
                        name: step.phaseName,
                        number: step.phaseNumber,
                        steps: [] as List<Map<String, Object>>
                    ] as Map<String, Object>
                }
                
                Map<String, Object> phaseMap = phasesMap[phaseKey]
                List<Map<String, Object>> stepsList = phaseMap.steps as List<Map<String, Object>>
                
                // Fetch labels for this step (ADR-031 Type Safety)
                List<Map<String, Object>> stepLabels = []
                try {
                    // Convert stmId to UUID if it's a string
                    UUID stmId = step.stmId instanceof UUID ? (UUID) step.stmId : UUID.fromString(step.stmId.toString())
                    stepLabels = stepRepository.findLabelsByStepId(stmId) as List<Map<String, Object>>
                } catch (Exception e) {
                    // If label fetching fails, continue with empty labels
                    stepLabels = []
                }
                
                // Add step to phase (ADR-031 Type Safety)
                Map<String, Object> stepMap = [
                    id: step.id,
                    code: "${step.sttCode}-${String.format('%03d', step.stmNumber as Integer)}",
                    name: step.name,
                    status: step.status,
                    durationMinutes: step.durationMinutes,
                    ownerTeamId: step.ownerTeamId,
                    ownerTeamName: step.ownerTeamName ?: 'Unassigned',
                    labels: stepLabels
                ] as Map<String, Object>
                stepsList.add(stepMap)
            }
            
            // Convert to arrays and sort (ADR-031 Type Safety)
            List<Map<String, Object>> result = groupedSteps.values().collect { Map<String, Object> sequenceItem ->
                Map<String, Object> sequence = sequenceItem
                Map<String, Map<String, Object>> phasesMap = sequence.phases as Map<String, Map<String, Object>>
                
                List<Map<String, Object>> phasesList = phasesMap.values().collect { Map<String, Object> phaseItem ->
                    Map<String, Object> phase = phaseItem
                    List<Map<String, Object>> stepsList = phase.steps as List<Map<String, Object>>
                    
                    return [
                        id: phase.id,
                        name: phase.name,
                        number: phase.number,
                        steps: stepsList.sort { Map<String, Object> stepItem -> stepItem.code as String }
                    ] as Map<String, Object>
                }
                phasesList.sort { Map<String, Object> phaseItem -> phaseItem.number as Integer }
                
                return [
                    id: sequence.id,
                    name: sequence.name,
                    number: sequence.number,
                    phases: phasesList
                ] as Map<String, Object>
            }
            result.sort { Map<String, Object> sequenceItem -> sequenceItem.number as Integer }
            
            return Response.ok(new JsonBuilder(result).toString()).build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid UUID format: ${e.message}"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}


/**
 * Handles PUT requests for bulk step operations.
 * - PUT /steps/bulk/status -> bulk status updates
 * - PUT /steps/bulk/assign -> bulk team assignments  
 * - PUT /steps/bulk/reorder -> bulk step reordering
 */
steps(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Enhanced error handling with SQL state mapping and context - inline
    def handleError = { Exception e, String context ->
        if (e instanceof IllegalArgumentException) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: e.message,
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        // SQL state mappings (ADR-031)
        def errorMessage = e.message?.toLowerCase() ?: ""
        if (errorMessage.contains("23503") || errorMessage.contains("foreign key")) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Invalid reference: related entity not found",
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        if (errorMessage.contains("23505") || errorMessage.contains("unique constraint")) {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([
                    error: "Duplicate entry: resource already exists",
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        // Default internal server error
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Internal server error: ${e.message}",
                context: context,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]).toString())
            .build()
    }
    
    // PUT /steps/bulk/status - bulk status updates
    if (pathParts.size() == 2 && pathParts[0] == 'bulk' && pathParts[1] == 'status') {
        try {
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            // Parse request body
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def stepIds = requestData.stepIds as List<String>
            def statusId = requestData.statusId as Integer
            def userId = requestData.userId as Integer
            
            // Validation
            if (!stepIds || stepIds.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "stepIds array is required"]).toString())
                    .build()
            }
            
            // Validate statusId using database
            // Use script-level statusRepository instance
            if (!statusId) {
                def validStatuses = statusRepository.findStatusesByType('Step')
                def statusOptions = validStatuses.collect { Map status -> "${status.id}=${status.name}" }.join(', ')
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "statusId is required", 
                        validOptions: statusOptions
                    ]).toString())
                    .build()
            }
            
            // Validate status ID against database - single source of truth
            if (!statusRepository.isValidStatusId(statusId, 'Step')) {
                def validStatusIds = statusRepository.getValidStatusIds('Step')
                def availableStatuses = statusRepository.findStatusesByType('Step')
                def statusOptions = availableStatuses.collect { Map status -> "${status.id}=${status.name}" }.join(', ')
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "Invalid statusId '${statusId}' for Step entities",
                        validStatusIds: validStatusIds,
                        validOptions: statusOptions
                    ]).toString())
                    .build()
            }
            
            // Convert string IDs to UUIDs with validation
            List<UUID> stepUuids = []
            for (def stepId : stepIds) {
                try {
                    stepUuids.add(UUID.fromString(stepId as String))
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid step ID format: ${stepId}"]).toString())
                        .build()
                }
            }
            
            // Perform bulk update using enhanced repository method
            // Use script-level repository instance
            def repositoryResult = stepRepository.bulkUpdateStepStatus(stepUuids, statusId, userId)
            def result = repositoryResult as Map
            if ((result.success as Boolean)) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Bulk status update completed",
                    updatedCount: (result.updatedCount ?: 0) as Integer,
                    failedCount: (result.failedCount ?: 0) as Integer,
                    failures: (result.failures ?: []) as List
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: (result.error ?: "Bulk update failed") as String]).toString())
                    .build()
            }
            
        } catch (Exception e) {
            return handleError(e, "PUT /steps/bulk/status")
        }
    }
    
    // PUT /steps/bulk/assign - bulk team assignments
    if (pathParts.size() == 2 && pathParts[0] == 'bulk' && pathParts[1] == 'assign') {
        try {
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            // Parse request body
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def stepIds = requestData.stepIds as List<String>
            def teamId = requestData.teamId as Integer
            def userId = requestData.userId as Integer
            
            // Validation
            if (!stepIds || stepIds.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "stepIds array is required"]).toString())
                    .build()
            }
            
            if (!teamId) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "teamId is required"]).toString())
                    .build()
            }
            
            // Convert string IDs to UUIDs with validation
            List<UUID> stepUuids = []
            for (def stepId : stepIds) {
                try {
                    stepUuids.add(UUID.fromString(stepId as String))
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid step ID format: ${stepId}"]).toString())
                        .build()
                }
            }
            
            // Perform bulk assignment using enhanced repository method
            // Use script-level repository instance
            def repositoryResult = stepRepository.bulkAssignSteps(stepUuids, teamId, userId)
            def result = repositoryResult as Map
            if ((result.success as Boolean)) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Bulk team assignment completed",
                    assignedCount: (result.assignedCount ?: 0) as Integer,
                    failedCount: (result.failedCount ?: 0) as Integer,
                    failures: (result.failures ?: []) as List
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: (result.error ?: "Bulk assignment failed") as String]).toString())
                    .build()
            }
            
        } catch (Exception e) {
            return handleError(e, "PUT /steps/bulk/assign")
        }
    }
    
    // PUT /steps/bulk/reorder - bulk step reordering
    if (pathParts.size() == 2 && pathParts[0] == 'bulk' && pathParts[1] == 'reorder') {
        try {
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            // Parse request body
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def reorderData = requestData.steps as List<Map>
            
            // Validation
            if (!reorderData || reorderData.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "steps array is required with id and newOrder fields"]).toString())
                    .build()
            }
            
            // Validate reorder data structure
            for (def step : reorderData) {
                if (!step.id || step.newOrder == null) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Each step must have 'id' and 'newOrder' fields"]).toString())
                        .build()
                }
                
                try {
                    UUID.fromString(step.id as String)
                    Integer.parseInt(step.newOrder.toString())
                } catch (Exception e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid id or newOrder format in step data"]).toString())
                        .build()
                }
            }
            
            // Perform bulk reordering using enhanced repository method
            // Use script-level repository instance
            def repositoryResult = stepRepository.bulkReorderSteps(reorderData)
            def result = repositoryResult as Map
            
            if ((result.success as Boolean)) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Bulk reordering completed",
                    reorderedCount: (result.reorderedCount ?: 0) as Integer,
                    failedCount: (result.failedCount ?: 0) as Integer,
                    failures: (result.failures ?: []) as List
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: (result.error ?: "Bulk reordering failed") as String]).toString())
                    .build()
            }
            
        } catch (Exception e) {
            return handleError(e, "PUT /steps/bulk/reorder")
        }
    }
    
    // PUT /steps/master/{id} - master step update (US-056C Phase 2 - DTO Pattern)
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            // Parse step ID from path with type safety (ADR-031)
            def stepId = UUID.fromString(pathParts[1])
            
            // Parse request body
            def json = new groovy.json.JsonSlurper()
            def stepData = json.parseText(body) as Map
            
            // Use repository DTO method for update
            // Use script-level repository instance
            def updatedStepDTO = stepRepository.updateMasterFromDTO(stepId, stepData)
            
            return Response.ok(updatedStepDTO.toJson()).build()
            
        } catch (IllegalArgumentException e) {
            return handleError(e, "PUT /steps/master/{id}")
        } catch (SQLException e) {
            def httpStatus = mapSqlStateToHttpStatus(e.getSQLState())
            def errorMessage = e.getMessage()
            
            // Provide more specific error messages for common violations
            if (e.getSQLState() == '23505') {
                errorMessage = "A step with the same phase, type, and number already exists"
            } else if (e.getSQLState() == '23503') {
                if (errorMessage.contains("phm_id")) {
                    errorMessage = "Invalid phase ID"
                } else if (errorMessage.contains("tms_id")) {
                    errorMessage = "Invalid team ID"
                } else if (errorMessage.contains("stt_code")) {
                    errorMessage = "Invalid step type code"
                } else if (errorMessage.contains("enr_id")) {
                    errorMessage = "Invalid environment role ID"
                }
            }
            
            return Response.status(httpStatus)
                .entity(new JsonBuilder([error: errorMessage]).toString())
                .build()
        } catch (Exception e) {
            return handleError(e, "PUT /steps/master/{id}")
        }
    }
    
    // PUT /steps/instance/{id} - instance step update (US-056C Phase 2 - DTO Pattern)
    if (pathParts.size() == 2 && pathParts[0] == 'instance') {
        try {
            // Parse step instance ID from path with type safety (ADR-031)
            def stepInstanceId = UUID.fromString(pathParts[1])
            
            // Parse request body
            def json = new groovy.json.JsonSlurper()
            def instanceData = json.parseText(body) as Map
            
            // Use repository DTO method for update
            // Use script-level repository instance
            def updatedInstanceDTO = stepRepository.updateInstanceFromDTO(stepInstanceId, instanceData)
            
            return Response.ok(updatedInstanceDTO.toJson()).build()
            
        } catch (IllegalArgumentException e) {
            return handleError(e, "PUT /steps/instance/{id}")
        } catch (SQLException e) {
            def httpStatus = mapSqlStateToHttpStatus(e.getSQLState())
            def errorMessage = e.getMessage()
            
            // Provide more specific error messages for common violations
            if (e.getSQLState() == '23505') {
                errorMessage = "A step instance with similar parameters already exists"
            } else if (e.getSQLState() == '23503') {
                if (errorMessage.contains("phi_id")) {
                    errorMessage = "Invalid phase ID"
                } else if (errorMessage.contains("tms_id")) {
                    errorMessage = "Invalid team ID"
                } else if (errorMessage.contains("stt_code")) {
                    errorMessage = "Invalid step type code"
                }
            }
            
            return Response.status(httpStatus)
                .entity(new JsonBuilder([error: errorMessage]).toString())
                .build()
        } catch (Exception e) {
            return handleError(e, "PUT /steps/instance/{id}")
        }
    }
    
    // PUT /steps/{stepInstanceId}/status - individual step status update
    if (pathParts.size() == 2 && pathParts[1] == 'status') {
        try {
            def stepInstanceId = pathParts[0]
            def stepInstanceUuid = UUID.fromString(stepInstanceId as String)
            
            // Validate request body
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            // Parse request body with type safety
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def statusId = requestData.statusId as Integer
            
            // Simple authentication pattern like TeamsApi/UsersApi
            Integer userId = requestData.userId ? (requestData.userId as Integer) : null
            
            // BACKWARD COMPATIBILITY: Support legacy status field for gradual migration
            // Use script-level statusRepository instance
            if (!statusId && requestData.status) {
                // Convert status name to ID using database lookup for backward compatibility
                def statusName = (requestData.status as String).toUpperCase()
                def statusRecord = statusRepository.findStatusByNameAndType(statusName, 'Step')
                
                if (statusRecord) {
                    statusId = (statusRecord as Map).id as Integer
                } else {
                    def availableStatuses = statusRepository.findStatusesByType('Step')
                    def statusNames = availableStatuses.collect { Map it -> it.name }.join(', ')
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([
                            error: "Invalid status name '${statusName}'. Use statusId instead, or valid status names: ${statusNames}"
                        ]).toString())
                        .build()
                }
            }
            
            if (!statusId) {
                def validStatuses = statusRepository.findStatusesByType('Step')
                def statusOptions = validStatuses.collect { Map status -> "${status.id}=${status.name}" }.join(', ')
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "Missing required field: statusId", 
                        validOptions: statusOptions
                    ]).toString())
                    .build()
            }
            
            // Validate status ID against database - single source of truth
            if (!statusRepository.isValidStatusId(statusId, 'Step')) {
                def validStatusIds = statusRepository.getValidStatusIds('Step')
                def availableStatuses = statusRepository.findStatusesByType('Step')
                def statusOptions = availableStatuses.collect { Map status -> "${status.id}=${status.name}" }.join(', ')
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "Invalid statusId '${statusId}' for Step entities",
                        validStatusIds: validStatusIds,
                        validOptions: statusOptions
                    ]).toString())
                    .build()
            }
            
            // Update step status and send enhanced notifications with URLs
            // Use StepNotificationIntegration for enhanced email functionality
            def integrationResult = StepNotificationIntegration.updateStepStatusWithEnhancedNotifications(stepInstanceUuid, statusId, userId)
            def result = integrationResult as Map
            
            if ((result.success as Boolean)) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: result.message ?: "Step status updated successfully",
                    stepInstanceId: stepInstanceId,
                    statusId: statusId,
                    emailsSent: result.emailsSent ?: 0,
                    enhancedNotification: result.enhancedNotification ?: false,
                    migrationCode: result.migrationCode ?: null,
                    iterationCode: result.iterationCode ?: null,
                    contextMissing: result.contextMissing ?: false
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: (result.error ?: "Failed to update step status") as String]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return handleError(e, "PUT /steps/{stepInstanceId}/status")
        } catch (Exception e) {
            return handleError(e, "PUT /steps/{stepInstanceId}/status")
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}

/**
 * Handles POST requests for step-related actions.
 * - POST /steps/{stepInstanceId}/open -> marks step as opened by PILOT and sends notifications
 * - POST /steps/{stepInstanceId}/instructions/{instructionId}/complete -> marks instruction as completed
 * 
 * Request body should contain:
 * {
 *   "userId": 123 (optional, for audit logging)
 * }
 */
steps(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Enhanced error handling with SQL state mapping and context - inline
    def handleError = { Exception e, String context ->
        if (e instanceof IllegalArgumentException) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: e.message,
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        // SQL state mappings (ADR-031)
        def errorMessage = e.message?.toLowerCase() ?: ""
        if (errorMessage.contains("23503") || errorMessage.contains("foreign key")) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Invalid reference: related entity not found",
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        if (errorMessage.contains("23505") || errorMessage.contains("unique constraint")) {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([
                    error: "Duplicate entry: resource already exists",
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        // Default internal server error
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Internal server error: ${e.message}",
                context: context,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]).toString())
            .build()
    }
    
    // POST /steps/master - create a new master step (US-056C Phase 2 - DTO Pattern)
    if (pathParts.size() == 1 && pathParts[0] == 'master') {
        try {
            // Parse request body
            def json = new groovy.json.JsonSlurper()
            def stepData = json.parseText(body) as Map
            
            // Use repository DTO method for creation
            // Use script-level repository instance
            def createdStepDTO = stepRepository.createMasterFromDTO(stepData)
            
            return Response.status(Response.Status.CREATED)
                .entity(createdStepDTO.toJson())
                .build()
                
        } catch (IllegalArgumentException e) {
            return handleError(e, "POST /steps/master")
        } catch (SQLException e) {
            def httpStatus = mapSqlStateToHttpStatus(e.getSQLState())
            def errorMessage = e.getMessage()
            
            // Provide more specific error messages for common violations
            if (e.getSQLState() == '23505') {
                errorMessage = "A step with the same phase, type, and number already exists"
            } else if (e.getSQLState() == '23503') {
                if (errorMessage.contains("phm_id")) {
                    errorMessage = "Invalid phase ID"
                } else if (errorMessage.contains("tms_id")) {
                    errorMessage = "Invalid team ID"
                } else if (errorMessage.contains("stt_code")) {
                    errorMessage = "Invalid step type code"
                } else if (errorMessage.contains("enr_id")) {
                    errorMessage = "Invalid environment role ID"
                }
            }
            
            return Response.status(httpStatus)
                .entity(new JsonBuilder([error: errorMessage]).toString())
                .build()
        } catch (Exception e) {
            return handleError(e, "POST /steps/master")
        }
    }
    
    // POST /steps/instance - create a new step instance (US-056C Phase 2 - DTO Pattern)
    if (pathParts.size() == 1 && pathParts[0] == 'instance') {
        try {
            // Parse request body
            def json = new groovy.json.JsonSlurper()
            def instanceData = json.parseText(body) as Map
            
            // Use repository DTO method for creation
            // Use script-level repository instance
            def createdInstanceDTO = stepRepository.createInstanceFromDTO(instanceData)
            
            return Response.status(Response.Status.CREATED)
                .entity(createdInstanceDTO.toJson())
                .build()
                
        } catch (IllegalArgumentException e) {
            return handleError(e, "POST /steps/instance")
        } catch (SQLException e) {
            def httpStatus = mapSqlStateToHttpStatus(e.getSQLState())
            def errorMessage = e.getMessage()
            
            // Provide more specific error messages for common violations
            if (e.getSQLState() == '23505') {
                errorMessage = "A step instance with similar parameters already exists"
            } else if (e.getSQLState() == '23503') {
                if (errorMessage.contains("phi_id")) {
                    errorMessage = "Invalid phase ID"
                } else if (errorMessage.contains("tms_id")) {
                    errorMessage = "Invalid team ID"
                } else if (errorMessage.contains("stt_code")) {
                    errorMessage = "Invalid step type code"
                }
            }
            
            return Response.status(httpStatus)
                .entity(new JsonBuilder([error: errorMessage]).toString())
                .build()
        } catch (Exception e) {
            return handleError(e, "POST /steps/instance")
        }
    }
    
    // POST /steps/{stepInstanceId}/open
    if (pathParts.size() == 2 && pathParts[1] == 'open') {
        try {
            def stepInstanceId = pathParts[0]
            def stepInstanceUuid = UUID.fromString(stepInstanceId)
            
            // Parse request body
            def requestData = [:]
            if (body) {
                requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            }
            
            // Simple authentication pattern like TeamsApi/UsersApi
            Integer userId = (requestData && requestData.userId) ? (requestData.userId as Integer) : null
            
            // Mark step as opened and send notifications
            // Use script-level repository instance
            def repositoryResult = stepRepository.openStepInstanceWithNotification(stepInstanceUuid, userId)
            def result = repositoryResult as Map
            
            if ((result.success as Boolean)) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Step opened successfully",
                    stepInstanceId: stepInstanceId,
                    emailsSent: result.emailsSent ?: 0
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: (result.error ?: "Failed to open step") as String]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return handleError(e, "POST /steps/{stepInstanceId}/open")
        } catch (Exception e) {
            return handleError(e, "POST /steps/{stepInstanceId}/open")
        }
    }
    
    // POST /steps/{stepInstanceId}/instructions/{instructionId}/complete
    if (pathParts.size() == 4 && pathParts[1] == 'instructions' && pathParts[3] == 'complete') {
        try {
            def stepInstanceId = pathParts[0]
            def instructionId = pathParts[2]
            def stepInstanceUuid = UUID.fromString(stepInstanceId)
            def instructionUuid = UUID.fromString(instructionId)
            
            // Parse request body
            def requestData = [:]
            if (body) {
                requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            }
            
            // Simple authentication pattern like TeamsApi/UsersApi
            Integer userId = requestData.userId ? (requestData.userId as Integer) : null
            
            // Complete instruction and send notifications
            // Use script-level repository instance
            def repositoryResult = stepRepository.completeInstructionWithNotification(instructionUuid, stepInstanceUuid, userId)
            def result = repositoryResult as Map
            
            if ((result.success as Boolean)) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Instruction completed successfully",
                    instructionId: instructionId,
                    stepInstanceId: stepInstanceId,
                    emailsSent: result.emailsSent ?: 0
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: (result.error ?: "Failed to complete instruction") as String]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to complete instruction: ${e.message}"]).toString())
                .build()
        }
    }
    
    // POST /steps/{stepInstanceId}/instructions/{instructionId}/incomplete
    if (pathParts.size() == 4 && pathParts[1] == 'instructions' && pathParts[3] == 'incomplete') {
        try {
            def stepInstanceId = pathParts[0]
            def instructionId = pathParts[2]
            def stepInstanceUuid = UUID.fromString(stepInstanceId)
            def instructionUuid = UUID.fromString(instructionId)
            
            // Parse request body
            def requestData = [:]
            if (body) {
                requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            }
            
            // Simple authentication pattern like TeamsApi/UsersApi
            Integer userId = requestData.userId ? (requestData.userId as Integer) : null
            
            // Mark instruction as incomplete and send notifications
            // Use script-level repository instance
            def repositoryResult = stepRepository.uncompleteInstructionWithNotification(instructionUuid, stepInstanceUuid, userId)
            def result = repositoryResult as Map
            
            if ((result.success as Boolean)) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Instruction marked as incomplete",
                    emailsSent: result.emailsSent ?: 0
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: (result.error ?: "Failed to mark instruction as incomplete") as String]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to mark instruction as incomplete: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}
// Note: Multi-method comment endpoints removed due to ScriptRunner limitations
// Comment functionality is handled by separate endpoints below

/**
 * GET endpoint to fetch status options for Step entities
 * Returns all statuses from status_sts table where sts_type = 'Step'
 * Used for populating the dynamic color-coded status dropdown
 */
statuses(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load repositories to avoid class loading issues
    
    // GET /statuses/step - return all step statuses
    if (pathParts.size() == 1 && pathParts[0] == 'step') {
        try {
            // Use script-level statusRepository instance
            def statuses = statusRepository.findStatusesByType('Step')
            
            return Response.ok(new JsonBuilder(statuses).toString()).build()
        } catch (Exception e) {
            log.error("Error fetching step statuses", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch statuses: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /statuses/{type} - return statuses for any entity type
    if (pathParts.size() == 1) {
        def entityType = pathParts[0]
        // Capitalize first letter to match database values
        entityType = entityType.substring(0, 1).toUpperCase() + entityType.substring(1).toLowerCase()
        
        try {
            // Use script-level statusRepository instance
            def statuses = statusRepository.findStatusesByType(entityType)
            
            if (!statuses || (statuses as List).size() == 0) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "No statuses found for type: ${entityType}"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(statuses).toString()).build()
        } catch (Exception e) {
            log.error("Error fetching statuses for type: ${entityType}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch statuses: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /statuses - return all statuses
    if (pathParts.isEmpty()) {
        try {
            // Use script-level statusRepository instance
            def statuses = statusRepository.findAllStatuses()
            
            return Response.ok(new JsonBuilder(statuses).toString()).build()
        } catch (Exception e) {
            log.error("Error fetching all statuses", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch statuses: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid status endpoint"]).toString())
        .build()
}

/**
 * Handles GET requests for step comments.
 * - GET /steps/{stepInstanceId}/comments -> returns all comments for a step instance
 */
comments(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load repositories to avoid class loading issues
    
    // GET /steps/{stepInstanceId}/comments
    if (pathParts.size() == 2 && pathParts[1] == 'comments') {
        try {
            def stepInstanceId = UUID.fromString(pathParts[0])
            // Use script-level repository instance
            def comments = stepRepository.findCommentsByStepInstanceId(stepInstanceId)
            
            return Response.ok(new JsonBuilder(comments).toString()).build()
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch comments: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([
            error: "Invalid comments endpoint usage",
            message: "To access comments, use: /rest/scriptrunner/latest/custom/steps/{stepInstanceId}/comments",
            example: "/rest/scriptrunner/latest/custom/steps/f9aa535d-4d8b-447c-9d89-16494f678702/comments"
        ]).toString())
        .build()
}

/**
 * Handles POST requests for creating comments.
 * - POST /steps/{stepInstanceId}/comments -> creates a new comment
 * 
 * Request body should contain:
 * {
 *   "body": "Comment text",
 *   "userId": 123 (optional)
 * }
 */
comments(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load repositories to avoid class loading issues
    
    // POST /steps/{stepInstanceId}/comments
    if (pathParts.size() == 2 && pathParts[1] == 'comments') {
        try {
            def stepInstanceId = UUID.fromString(pathParts[0])
            
            // Parse request body
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def commentBody = requestData.body as String
            
            // Simple authentication pattern like TeamsApi/UsersApi
            Integer userId = requestData.userId ? (requestData.userId as Integer) : null
            
            if (!commentBody || commentBody.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Comment body is required"]).toString())
                    .build()
            }
            
            // Use script-level repository instance
            def result = stepRepository.createComment(stepInstanceId, commentBody, userId)
            
            return Response.ok(new JsonBuilder([
                success: true,
                commentId: (result as Map).id,
                createdAt: (result as Map).createdAt
            ]).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            println "ERROR in comments POST endpoint: ${e.message}"
            e.printStackTrace()
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to create comment: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([
            error: "Invalid comments endpoint usage",
            message: "To create a comment, use: POST /rest/scriptrunner/latest/custom/steps/{stepInstanceId}/comments",
            example: "POST /rest/scriptrunner/latest/custom/steps/f9aa535d-4d8b-447c-9d89-16494f678702/comments with comment data in the request body"
        ]).toString())
        .build()
}

/**
 * Handles PUT requests for updating comments.
 * - PUT /comments/{commentId} -> updates a comment
 * 
 * Request body should contain:
 * {
 *   "body": "Updated comment text",
 *   "userId": 123 (optional)
 * }
 */
comments(httpMethod: "PUT", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load repositories to avoid class loading issues
    
    // PUT /comments/{commentId}
    if (pathParts.size() == 1) {
        try {
            def commentId = Integer.parseInt(pathParts[0])
            
            // Parse request body
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def commentBody = requestData.body as String
            
            // Simple authentication pattern like TeamsApi/UsersApi
            Integer userId = requestData.userId ? (requestData.userId as Integer) : null
            
            if (!commentBody || commentBody.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Comment body is required"]).toString())
                    .build()
            }
            
            // Use script-level repository instance
            def success = stepRepository.updateComment(commentId, commentBody, userId)
            
            if (success) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Comment updated successfully"
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Comment not found"]).toString())
                    .build()
            }
            
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid comment ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to update comment: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([
            error: "Invalid comments endpoint usage", 
            message: "To update a comment, use: PUT /rest/scriptrunner/latest/custom/comments/{commentId}",
            example: "PUT /rest/scriptrunner/latest/custom/comments/123 with updated comment data in the request body"
        ]).toString())
        .build()
}

/**
 * Handles DELETE requests for steps.
 * - DELETE /steps/master/{id} -> deletes/archives a master step (US-056C Phase 2)
 */
steps(httpMethod: "DELETE", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Enhanced error handling with SQL state mapping and context
    def handleError = { Exception e, String context ->
        if (e instanceof IllegalArgumentException) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: e.message,
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        if (e instanceof IllegalStateException) {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([
                    error: e.message,
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        // Default internal server error
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Internal server error: ${e.message}",
                context: context,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]).toString())
            .build()
    }
    
    // DELETE /steps/master/{id} - delete/archive a master step (US-056C Phase 2 - DTO Pattern)
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            // Parse step ID from path with type safety (ADR-031)
            def stepId = UUID.fromString(pathParts[1])
            
            // Use repository DTO method for deletion
            // Use script-level repository instance
            def deleted = stepRepository.deleteMaster(stepId)
            
            if (deleted) {
                return Response.noContent().build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([
                        error: "Step master not found",
                        stepId: stepId.toString()
                    ]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return handleError(e, "DELETE /steps/master/{id}")
        } catch (IllegalStateException e) {
            return handleError(e, "DELETE /steps/master/{id}")
        } catch (Exception e) {
            return handleError(e, "DELETE /steps/master/{id}")
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid endpoint"]).toString())
        .build()
}

/**
 * Handles DELETE requests for deleting comments.
 * - DELETE /comments/{commentId} -> deletes a comment
 */
comments(httpMethod: "DELETE", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load repositories to avoid class loading issues
    
    // DELETE /comments/{commentId}
    if (pathParts.size() == 1) {
        try {
            def commentId = Integer.parseInt(pathParts[0])
            Integer userId = 1 // Default to user 1 for now
            
            // Use script-level repository instance
            def success = stepRepository.deleteComment(commentId, userId)
            
            if (success) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Comment deleted successfully"
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Comment not found"]).toString())
                    .build()
            }
            
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid comment ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to delete comment: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([
            error: "Invalid comments endpoint usage",
            message: "To delete a comment, use: DELETE /rest/scriptrunner/latest/custom/comments/{commentId}",
            example: "DELETE /rest/scriptrunner/latest/custom/comments/123"
        ]).toString())
        .build()
}

// Helper method to get current user from Confluence context
private def getCurrentUser() {
    try {
        return com.atlassian.confluence.user.AuthenticatedUserThreadLocal.get()
    } catch (Exception e) {
        log.warn("StepsApi: Could not get current user", e)
        return null
    }
}

// Repository instances are defined at script level - no helper methods needed

// Master step POST and PUT functionality moved to the main handlers above to avoid conflicts

/**
 * Maps SQL state codes to appropriate HTTP status codes
 */
private static int mapSqlStateToHttpStatus(String sqlState) {
    switch (sqlState) {
        case '23503': return 400 // Foreign key violation
        case '23505': return 409 // Unique violation
        case '23514': return 400 // Check constraint violation
        default: return 500     // General server error
    }
}

