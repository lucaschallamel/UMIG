package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.StepRepository
import umig.repository.StatusRepository
import umig.repository.UserRepository
import umig.service.UserService
import umig.utils.DatabaseUtil
import umig.utils.EmailService
import umig.utils.EnhancedEmailService
import umig.utils.StepNotificationIntegration
import umig.utils.UrlConstructionService
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.GroovyRowResult
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID
import java.sql.SQLException

// Type safety achieved through explicit casting per ADR-031 standards
@BaseScript CustomEndpointDelegate delegate

/**
 * Steps API - repositories instantiated within methods to avoid class loading issues
 */

// Import repositories at compile time but instantiate lazily

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
steps(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request) as String
    List<String> pathParts = extraPath?.split('/')?.findAll { String it -> it } as List<String> ?: [] as List<String>
    
    // Lazy load repositories to avoid class loading issues
    Closure<StepRepository> getStepRepository = { ->
        return new StepRepository() as StepRepository
    }
    Closure<StatusRepository> getStatusRepository = { ->
        return new StatusRepository() as StatusRepository
    }
    Closure<UserRepository> getUserRepository = { ->
        return new UserRepository() as UserRepository
    }
    
    // Parse and validate query parameters for filtering with type safety (ADR-031) - inline
    Closure<Map<String, Object>> parseAndValidateFilters = { MultivaluedMap<String, String> qParams ->
        Map<String, Object> filters = [:] as Map<String, Object>
        
        // UUID parameters with explicit casting and validation
        if (qParams.getFirst("migrationId")) {
            try {
                filters.migrationId = UUID.fromString(qParams.getFirst("migrationId") as String) as UUID
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid migrationId format: must be a valid UUID") as IllegalArgumentException
            }
        }
        
        if (qParams.getFirst("iterationId")) {
            try {
                filters.iterationId = UUID.fromString(qParams.getFirst("iterationId") as String) as UUID
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid iterationId format: must be a valid UUID") as IllegalArgumentException
            }
        }
        
        if (qParams.getFirst("planId")) {
            try {
                filters.planId = UUID.fromString(qParams.getFirst("planId") as String) as UUID
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid planId format: must be a valid UUID") as IllegalArgumentException
            }
        }
        
        if (qParams.getFirst("sequenceId")) {
            try {
                filters.sequenceId = UUID.fromString(qParams.getFirst("sequenceId") as String) as UUID
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid sequenceId format: must be a valid UUID") as IllegalArgumentException
            }
        }
        
        if (qParams.getFirst("phaseId")) {
            try {
                filters.phaseId = UUID.fromString(qParams.getFirst("phaseId") as String) as UUID
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid phaseId format: must be a valid UUID") as IllegalArgumentException
            }
        }
        
        if (qParams.getFirst("labelId")) {
            try {
                filters.labelId = Integer.parseInt(qParams.getFirst("labelId") as String) as Integer
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid labelId format: must be a valid integer") as IllegalArgumentException
            }
        }
        
        // Integer parameters with explicit casting and validation
        if (qParams.getFirst("teamId")) {
            try {
                filters.teamId = Integer.parseInt(qParams.getFirst("teamId") as String) as Integer
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid teamId format: must be a valid integer") as IllegalArgumentException
            }
        }
        
        if (qParams.getFirst("statusId")) {
            try {
                filters.statusId = Integer.parseInt(qParams.getFirst("statusId") as String) as Integer
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid statusId format: must be a valid integer") as IllegalArgumentException
            }
        }
        
        // String parameters with validation
        if (qParams.getFirst("status")) {
            String status = qParams.getFirst("status") as String
            if (status.trim().isEmpty()) {
                throw new IllegalArgumentException("Status parameter cannot be empty") as IllegalArgumentException
            }
            filters.status = status.toUpperCase() as String
        }
        
        return filters as Map<String, Object>
    }
    
    // Validate pagination parameters with type safety and limits - inline
    Closure<Map<String, Integer>> validatePaginationParams = { MultivaluedMap<String, String> qParams ->
        Integer limit = 100 as Integer  // default limit
        Integer offset = 0 as Integer   // default offset
        
        if (qParams.getFirst("limit")) {
            try {
                Integer requestedLimit = Integer.parseInt(qParams.getFirst("limit") as String) as Integer
                if (requestedLimit <= 0) {
                    throw new IllegalArgumentException("Limit must be greater than 0") as IllegalArgumentException
                }
                if (requestedLimit > 1000) {
                    throw new IllegalArgumentException("Limit cannot exceed 1000") as IllegalArgumentException
                }
                limit = requestedLimit as Integer
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid limit format: must be a valid integer") as IllegalArgumentException
            }
        }
        
        if (qParams.getFirst("offset")) {
            try {
                Integer requestedOffset = Integer.parseInt(qParams.getFirst("offset") as String) as Integer
                if (requestedOffset < 0) {
                    throw new IllegalArgumentException("Offset cannot be negative") as IllegalArgumentException
                }
                offset = requestedOffset as Integer
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid offset format: must be a valid integer") as IllegalArgumentException
            }
        }
        
        return [limit: limit, offset: offset] as Map<String, Integer>
    }
    
    // Enhanced error handling with SQL state mapping and context - inline
    Closure<Response> handleError = { Exception e, String context ->
        if (e instanceof IllegalArgumentException) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: e.message as String,
                    context: context as String,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") as String
                ] as Map).toString() as String)
                .build() as Response
        }
        
        // SQL state mappings (ADR-031)
        String errorMessage = (e.message?.toLowerCase() ?: "") as String
        if (errorMessage.contains("23503") || errorMessage.contains("foreign key")) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Invalid reference: related entity not found" as String,
                    context: context as String,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") as String
                ] as Map).toString() as String)
                .build() as Response
        }
        
        if (errorMessage.contains("23505") || errorMessage.contains("unique constraint")) {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([
                    error: "Duplicate entry: resource already exists" as String,
                    context: context as String,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") as String
                ] as Map).toString() as String)
                .build() as Response
        }
        
        // Default internal server error
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Internal server error: ${e.message}" as String,
                context: context as String,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") as String
            ] as Map).toString() as String)
            .build() as Response
    }
    
    // GET /steps/instance/{stepInstanceId} - return step instance details with instructions
    if (pathParts.size() == 2 && pathParts[0] == 'instance') {
        String stepInstanceId = pathParts[1] as String
        
        try {
            // Try to parse as UUID first
            UUID stepInstanceUuid = UUID.fromString(stepInstanceId) as UUID
            StepRepository stepRepository = getStepRepository() as StepRepository
            Map<String, Object> stepDetails = stepRepository.findStepInstanceDetailsById(stepInstanceUuid) as Map<String, Object>
            
            if (!stepDetails) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Step instance not found for ID: ${stepInstanceId}"] as Map).toString() as String)
                    .build() as Response
            }
            
            return Response.ok(new JsonBuilder(stepDetails).toString() as String).build() as Response
            
        } catch (IllegalArgumentException e) {
            // If not a valid UUID, try to parse as step code for backward compatibility
            try {
                StepRepository stepRepository = getStepRepository() as StepRepository
                Map<String, Object> stepDetails = stepRepository.findStepInstanceDetailsByCode(stepInstanceId) as Map<String, Object>
                
                if (!stepDetails) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Step instance not found for code: ${stepInstanceId}"] as Map).toString() as String)
                        .build() as Response
                }
                
                return Response.ok(new JsonBuilder(stepDetails).toString() as String).build() as Response
                
            } catch (Exception ex) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid step instance ID format: ${stepInstanceId}"] as Map).toString() as String)
                    .build() as Response
            }
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to load step details: ${e.message}"] as Map).toString() as String)
                .build() as Response
        }
    }
    
    // GET /steps/{stepInstanceId}/comments - return comments for a step instance
    if (pathParts.size() == 2 && pathParts[1] == 'comments') {
        try {
            String stepInstanceId = pathParts[0] as String
            UUID stepInstanceUuid = UUID.fromString(stepInstanceId) as UUID
            StepRepository stepRepository = getStepRepository() as StepRepository
            List<Map<String, Object>> comments = stepRepository.findCommentsByStepInstanceId(stepInstanceUuid) as List<Map<String, Object>>
            
            return Response.ok(new JsonBuilder(comments).toString() as String).build() as Response
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step instance ID format"] as Map).toString() as String)
                .build() as Response
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch comments: ${e.message}"] as Map).toString() as String)
                .build() as Response
        }
    }
    
    // GET /steps/master/{id} - return specific master step
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            UUID stepId = UUID.fromString(pathParts[1]) as UUID
            StepRepository stepRepository = getStepRepository() as StepRepository
            Map<String, Object> masterStep = stepRepository.findMasterStepById(stepId) as Map<String, Object>
            
            if (!masterStep) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master step not found for ID: ${stepId}"] as Map).toString() as String)
                    .build() as Response
            }
            
            return Response.ok(new JsonBuilder(masterStep).toString() as String).build() as Response
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step ID format"] as Map).toString() as String)
                .build() as Response
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to retrieve master step: ${e.message}"] as Map).toString() as String)
                .build() as Response
        }
    }
    
    // GET /steps/master - return master steps with Admin GUI support
    if (pathParts.size() == 1 && pathParts[0] == 'master') {
        try {
            // Extract query parameters for Admin GUI support
            Map<String, Object> filters = [:] as Map<String, Object>
            Integer pageNumber = 1 as Integer
            Integer pageSize = 50 as Integer
            String sortField = null as String
            String sortDirection = 'asc' as String

            // Extract standard parameters
            queryParams.keySet().each { String param ->
                String value = queryParams.getFirst(param) as String
                switch (param) {
                    case 'page':
                        pageNumber = Integer.parseInt(value as String) as Integer
                        break
                    case 'size':
                        pageSize = Integer.parseInt(value as String) as Integer
                        break
                    case 'sort':
                        sortField = value as String
                        break
                    case 'direction':
                        sortDirection = value as String
                        break
                    default:
                        filters[param] = value as String
                }
            }

            // Validate sort field (removed stm_status as master steps don't have status)
            List<String> allowedSortFields = ['stm_id', 'stm_name', 'stm_order', 'created_at', 'updated_at', 'instruction_count', 'instance_count', 'plm_name', 'sqm_name', 'phm_name'] as List<String>
            if (sortField && !allowedSortFields.contains(sortField)) {
                return Response.status(400)
                    .entity(new JsonBuilder([error: "Invalid sort field: ${sortField}. Allowed fields: ${allowedSortFields.join(', ')}", code: 400] as Map).toString() as String)
                    .build() as Response
            }

            StepRepository stepRepository = getStepRepository() as StepRepository
            Map<String, Object> result = stepRepository.findMasterStepsWithFilters(filters as Map<String, Object>, pageNumber as int, pageSize as int, sortField as String, sortDirection as String) as Map<String, Object>
            return Response.ok(new JsonBuilder(result).toString() as String).build() as Response
        } catch (SQLException e) {
            log.error("Database error in steps master GET: ${e.message}", e)
            int statusCode = mapSqlStateToHttpStatus(e.getSQLState()) as int
            return Response.status(statusCode)
                .entity(new JsonBuilder([error: e.message, code: statusCode] as Map).toString() as String)
                .build() as Response
        } catch (Exception e) {
            log.error("Unexpected error in steps master GET: ${e.message}", e)
            return Response.status(500)
                .entity(new JsonBuilder([error: "Internal server error", code: 500] as Map).toString() as String)
                .build() as Response
        }
    }
    
    // GET /steps/summary - return dashboard summary metrics
    if (pathParts.size() == 1 && pathParts[0] == 'summary') {
        try {
            String migrationId = queryParams.getFirst("migrationId") as String
            if (!migrationId) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "migrationId parameter is required for summary"]).toString())
                    .build()
            }
            
            UUID migrationUuid = UUID.fromString(migrationId as String)
            StepRepository stepRepository = getStepRepository()
            Map<String, Object> summary = stepRepository.getStepsSummary(migrationUuid)
            
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
            String migrationId = queryParams.getFirst("migrationId") as String
            if (!migrationId) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "migrationId parameter is required for progress tracking"] as Map).toString() as String)
                    .build() as Response
            }
            
            UUID migrationUuid = UUID.fromString(migrationId as String) as UUID
            StepRepository stepRepository = getStepRepository() as StepRepository
            Map<String, Object> progress = stepRepository.getStepsProgress(migrationUuid) as Map<String, Object>
            
            return Response.ok(new JsonBuilder(progress).toString() as String).build() as Response
            
        } catch (IllegalArgumentException e) {
            return handleError(e, "GET /steps/progress")
        } catch (Exception e) {
            return handleError(e, "GET /steps/progress")
        }
    }
    
    // GET /steps/export - return steps data for export (JSON/CSV)
    if (pathParts.size() == 1 && pathParts[0] == 'export') {
        try {
            Map<String, Object> filters = parseAndValidateFilters(queryParams)
            String format = (queryParams.getFirst("format") ?: "json") as String
            
            if (!["json", "csv"].contains(format.toLowerCase())) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Format must be 'json' or 'csv'"]).toString())
                    .build()
            }
            
            // Use enhanced repository method for export
            StepRepository stepRepository = getStepRepository()
            Map<String, Object> exportData = stepRepository.findStepsWithFilters(filters, 10000, 0, "export")
            
            if (format.toLowerCase() == "csv") {
                // Generate CSV format - inline method
                List<Map<String, Object>> steps = exportData.data as List<Map<String, Object>>
                String csvContent
                if (!steps || steps.isEmpty()) {
                    csvContent = "No data available"
                } else {
                    List<String> headers = [
                        "Step ID", "Step Code", "Step Name", "Status", "Team", 
                        "Sequence", "Phase", "Duration (min)", "Created At", "Updated At"
                    ]
                    
                    List<String> csvLines = [headers.join(",")]
                    
                    steps.each { Map<String, Object> step ->
                        Map<String, Object> stepMap = step as Map<String, Object>
                        String line = [
                            "\"${stepMap.id ?: ''}\"",
                            "\"${stepMap.code ?: ''}\"", 
                            "\"${stepMap.name ?: ''}\"",
                            "\"${stepMap.status ?: ''}\"",
                            "\"${stepMap.teamName ?: 'Unassigned'}\"",
                            "\"${stepMap.sequenceName ?: ''}\"",
                            "\"${stepMap.phaseName ?: ''}\"",
                            stepMap.durationMinutes ?: 0,
                            "\"${stepMap.createdAt ?: ''}\"",
                            "\"${stepMap.updatedAt ?: ''}\""
                        ].join(",")
                        csvLines.add(line)
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
    if (pathParts.isEmpty()) {
        try {
            // Parse and validate parameters with type safety
            Map<String, Object> filters = parseAndValidateFilters(queryParams)
            Map<String, Integer> pagination = validatePaginationParams(queryParams)
            
            // DEBUG: Log the filters and pagination for troubleshooting
            println "StepsApi DEBUG: filters = ${filters}"
            println "StepsApi DEBUG: pagination = ${pagination}"
            
            // Check if this is a simple list request or enhanced filtering
            boolean useEnhancedMethod = queryParams.getFirst("enhanced") == "true" || 
                                       queryParams.getFirst("limit") || 
                                       queryParams.getFirst("offset")
            
            StepRepository stepRepository = getStepRepository()
            
            if (useEnhancedMethod) {
                // Use enhanced repository method with pagination
                Map<String, Object> result = stepRepository.findStepsWithFilters(
                    filters, 
                    pagination.limit as Integer, 
                    pagination.offset as Integer,
                    "list"
                )
                
                return Response.ok(new JsonBuilder(result).toString()).build()
            } else {
                // Backward compatibility: use original grouping logic
                println "StepsApi DEBUG: About to call findFilteredStepInstances with filters: ${filters}"
                List<Map<String, Object>> steps = stepRepository.findFilteredStepInstances(filters)
                println "StepsApi DEBUG: findFilteredStepInstances returned ${steps?.size()} steps"
            
            // Group steps by sequence and phase for frontend consumption
            Map<String, Map<String, Object>> groupedSteps = [:]
            
            steps.each { Map<String, Object> stepItem ->
                Map<String, Object> step = stepItem as Map<String, Object>
                String sequenceKey = "${step.sequenceNumber}-${step.sequenceId}"
                String phaseKey = "${step.phaseNumber}-${step.phaseId}"
                
                if (!groupedSteps[sequenceKey]) {
                    groupedSteps[sequenceKey] = [
                        id: step.sequenceId,
                        name: step.sequenceName,
                        number: step.sequenceNumber,
                        phases: [:]
                    ]
                }
                
                Map<String, Object> sequenceMap = groupedSteps[sequenceKey] as Map<String, Object>
                Map<String, Map<String, Object>> phasesMap = sequenceMap.phases as Map<String, Map<String, Object>>
                
                if (!phasesMap[phaseKey]) {
                    phasesMap[phaseKey] = [
                        id: step.phaseId,
                        name: step.phaseName,
                        number: step.phaseNumber,
                        steps: []
                    ]
                }
                
                Map<String, Object> phaseMap = phasesMap[phaseKey] as Map<String, Object>
                List<Map<String, Object>> stepsList = phaseMap.steps as List<Map<String, Object>>
                
                // Fetch labels for this step
                List<Map<String, Object>> stepLabels = []
                try {
                    // Convert stmId to UUID if it's a string
                    UUID stmId = step.stmId instanceof UUID ? step.stmId : UUID.fromString(step.stmId.toString())
                    stepLabels = stepRepository.findLabelsByStepId(stmId) as List<Map<String, Object>>
                } catch (Exception e) {
                    // If label fetching fails, continue with empty labels
                    stepLabels = []
                }
                
                // Add step to phase
                stepsList.add([
                    id: step.id,
                    code: "${step.sttCode}-${String.format('%03d', step.stmNumber)}",
                    name: step.name,
                    status: step.status,
                    durationMinutes: step.durationMinutes,
                    ownerTeamId: step.ownerTeamId,
                    ownerTeamName: step.ownerTeamName ?: 'Unassigned',
                    labels: stepLabels
                ])
            }
            
            // Convert to arrays and sort
            List<Map<String, Object>> result = groupedSteps.values().collect { Map<String, Object> sequenceItem ->
                Map<String, Object> sequence = sequenceItem as Map<String, Object>
                Map<String, Map<String, Object>> phasesMap = sequence.phases as Map<String, Map<String, Object>>
                
                List<Map<String, Object>> phasesList = phasesMap.values().collect { Map<String, Object> phaseItem ->
                    Map<String, Object> phase = phaseItem as Map<String, Object>
                    List<Map<String, Object>> stepsList = phase.steps as List<Map<String, Object>>
                    
                    return [
                        id: phase.id,
                        name: phase.name,
                        number: phase.number,
                        steps: stepsList.sort { Map<String, Object> stepItem -> (stepItem as Map<String, Object>).code }
                    ] as Map<String, Object>
                }
                phasesList.sort { Map<String, Object> phaseItem -> (phaseItem as Map<String, Object>).number }
                
                return [
                    id: sequence.id,
                    name: sequence.name,
                    number: sequence.number,
                    phases: phasesList
                ] as Map<String, Object>
            }
            result.sort { Map<String, Object> sequenceItem -> (sequenceItem as Map<String, Object>).number }
            
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
steps(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request) as String
    List<String> pathParts = extraPath?.split('/')?.findAll { String it -> it } as List<String> ?: [] as List<String>
    
    // Lazy load repositories to avoid class loading issues
    Closure<StepRepository> getStepRepository = { ->
        return new StepRepository() as StepRepository
    }
    Closure<StatusRepository> getStatusRepository = { ->
        return new StatusRepository() as StatusRepository
    }
    Closure<UserRepository> getUserRepository = { ->
        return new UserRepository() as UserRepository
    }
    
    // Enhanced error handling with SQL state mapping and context - inline
    Closure<Response> handleError = { Exception e, String context ->
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
        String errorMessage = (e.message?.toLowerCase() ?: "") as String
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
            Map<String, Object> requestData = new groovy.json.JsonSlurper().parseText(body) as Map<String, Object>
            List<String> stepIds = (requestData.stepIds as List<String>) ?: [] as List<String>
            Integer statusId = requestData.statusId as Integer
            Integer userId = requestData.userId as Integer
            
            // Validation
            if (!stepIds || stepIds.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "stepIds array is required"]).toString())
                    .build()
            }
            
            // Validate statusId using database
            StatusRepository statusRepository = getStatusRepository()
            if (!statusId) {
                List<Map<String, Object>> validStatuses = statusRepository.findStatusesByType('Step') as List<Map<String, Object>>
                String statusOptions = validStatuses.collect { Map<String, Object> status -> "${status.id}=${status.name}" }.join(', ') as String
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "statusId is required", 
                        validOptions: statusOptions
                    ]).toString())
                    .build()
            }
            
            // Validate status ID against database - single source of truth
            if (!statusRepository.isValidStatusId(statusId, 'Step')) {
                List<Integer> validStatusIds = statusRepository.getValidStatusIds('Step') as List<Integer>
                List<Map<String, Object>> availableStatuses = statusRepository.findStatusesByType('Step') as List<Map<String, Object>>
                String statusOptions = availableStatuses.collect { Map<String, Object> status -> "${status.id}=${status.name}" }.join(', ') as String
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
            for (String stepId : stepIds) {
                try {
                    stepUuids.add(UUID.fromString(stepId as String))
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid step ID format: ${stepId}"]).toString())
                        .build()
                }
            }
            
            // Perform bulk update using enhanced repository method
            StepRepository stepRepository = getStepRepository()
            Map<String, Object> repositoryResult = stepRepository.bulkUpdateStepStatus(stepUuids, statusId, userId) as Map<String, Object>
            Map<String, Object> result = repositoryResult as Map<String, Object>
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
            Map<String, Object> requestData = new groovy.json.JsonSlurper().parseText(body) as Map<String, Object>
            List<String> stepIds = (requestData.stepIds as List<String>) ?: [] as List<String>
            Integer teamId = requestData.teamId as Integer
            Integer userId = requestData.userId as Integer
            
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
            List<UUID> stepUuids = [] as List<UUID>
            for (String stepId : stepIds) {
                try {
                    stepUuids.add(UUID.fromString(stepId as String) as UUID)
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid step ID format: ${stepId}"] as Map).toString() as String)
                        .build() as Response
                }
            }
            
            // Perform bulk assignment using enhanced repository method
            StepRepository stepRepository = getStepRepository() as StepRepository
            Map<String, Object> repositoryResult = stepRepository.bulkAssignSteps(stepUuids, teamId, userId) as Map<String, Object>
            Map<String, Object> result = repositoryResult as Map<String, Object>
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
            Map<String, Object> requestData = new groovy.json.JsonSlurper().parseText(body) as Map<String, Object>
            List<Map<String, Object>> reorderData = (requestData.steps as List<Map<String, Object>>) ?: [] as List<Map<String, Object>>
            
            // Validation
            if (!reorderData || reorderData.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "steps array is required with id and newOrder fields"]).toString())
                    .build()
            }
            
            // Validate reorder data structure
            for (Map<String, Object> step : reorderData) {
                if (!step.id || step.newOrder == null) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Each step must have 'id' and 'newOrder' fields"] as Map).toString() as String)
                        .build() as Response
                }
                
                try {
                    UUID.fromString(step.id as String) as UUID
                    Integer.parseInt(step.newOrder.toString()) as Integer
                } catch (Exception e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid id or newOrder format in step data"] as Map).toString() as String)
                        .build() as Response
                }
            }
            
            // Perform bulk reordering using enhanced repository method
            StepRepository stepRepository = getStepRepository() as StepRepository
            Map<String, Object> repositoryResult = stepRepository.bulkReorderSteps(reorderData) as Map<String, Object>
            Map<String, Object> result = repositoryResult as Map<String, Object>
            
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
    
    // PUT /steps/{stepInstanceId}/status - individual step status update
    if (pathParts.size() == 2 && pathParts[1] == 'status') {
        try {
            String stepInstanceId = pathParts[0] as String
            UUID stepInstanceUuid = UUID.fromString(stepInstanceId as String) as UUID
            
            // Validate request body
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"] as Map).toString() as String)
                    .build() as Response
            }
            
            // Parse request body with type safety
            Map<String, Object> requestData = new groovy.json.JsonSlurper().parseText(body) as Map<String, Object>
            Integer statusId = requestData.statusId as Integer
            
            // Get user context using UserService for intelligent fallback handling
            Map<String, Object> userContext = null as Map<String, Object>
            Integer userId = null as Integer
            
            try {
                userContext = UserService.getCurrentUserContext() as Map<String, Object>
                userId = userContext.userId as Integer
                
                // Log the user context for debugging
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "StepsApi: Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}' (userId: ${userId})"
                }
            } catch (Exception e) {
                // If UserService fails, try to use frontend-provided userId
                println "StepsApi: UserService failed (${e.message}), checking for frontend userId"
                userContext = null as Map<String, Object>
            }
            
            // CRITICAL FIX: If no valid user context from ThreadLocal, use frontend-provided userId
            if (!userId && requestData.userId) {
                try {
                    userId = requestData.userId as Integer
                    println "StepsApi: Using frontend-provided userId: ${userId}"
                } catch (Exception e) {
                    println "StepsApi: Invalid frontend userId: ${requestData.userId}"
                }
            }
            
            // Final fallback log
            if (!userId) {
                println "StepsApi: WARNING - No valid userId available for audit trail"
            }
            
            // BACKWARD COMPATIBILITY: Support legacy status field for gradual migration
            StatusRepository statusRepository = getStatusRepository()
            if (!statusId && requestData.status) {
                // Convert status name to ID using database lookup for backward compatibility
                String statusName = (requestData.status as String).toUpperCase() as String
                Map<String, Object> statusRecord = statusRepository.findStatusByNameAndType(statusName, 'Step') as Map<String, Object>
                
                if (statusRecord) {
                    statusId = (statusRecord as Map).id as Integer
                } else {
                    List<Map<String, Object>> availableStatuses = statusRepository.findStatusesByType('Step') as List<Map<String, Object>>
                    String statusNames = availableStatuses.collect { Map<String, Object> it -> it.name }.join(', ') as String
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([
                            error: "Invalid status name '${statusName}'. Use statusId instead, or valid status names: ${statusNames}"
                        ]).toString())
                        .build()
                }
            }
            
            if (!statusId) {
                List<Map<String, Object>> validStatuses = statusRepository.findStatusesByType('Step') as List<Map<String, Object>>
                String statusOptions = validStatuses.collect { Map<String, Object> status -> "${status.id}=${status.name}" }.join(', ') as String
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "Missing required field: statusId", 
                        validOptions: statusOptions
                    ]).toString())
                    .build()
            }
            
            // Validate status ID against database - single source of truth
            if (!statusRepository.isValidStatusId(statusId, 'Step')) {
                List<Integer> validStatusIds = statusRepository.getValidStatusIds('Step') as List<Integer>
                List<Map<String, Object>> availableStatuses = statusRepository.findStatusesByType('Step') as List<Map<String, Object>>
                String statusOptions = availableStatuses.collect { Map<String, Object> status -> "${status.id}=${status.name}" }.join(', ') as String
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "Invalid statusId '${statusId}' for Step entities",
                        validStatusIds: validStatusIds,
                        validOptions: statusOptions
                    ]).toString())
                    .build()
            }
            
            // Update step status and send notifications
            StepRepository stepRepository = getStepRepository() as StepRepository
            Map<String, Object> repositoryResult = stepRepository.updateStepInstanceStatusWithNotification(stepInstanceUuid, statusId, userId) as Map<String, Object>
            Map<String, Object> result = repositoryResult as Map<String, Object>
            
            if ((result.success as Boolean)) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Step status updated successfully",
                    stepInstanceId: stepInstanceId,
                    statusId: statusId,
                    emailsSent: result.emailsSent ?: 0
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
steps(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request) as String
    List<String> pathParts = extraPath?.split('/')?.findAll { String it -> it } as List<String> ?: [] as List<String>
    
    // Lazy load repositories to avoid class loading issues
    Closure<StepRepository> getStepRepository = { ->
        return new StepRepository() as StepRepository
    }
    Closure<StatusRepository> getStatusRepository = { ->
        return new StatusRepository() as StatusRepository
    }
    Closure<UserRepository> getUserRepository = { ->
        return new UserRepository() as UserRepository
    }
    
    // Enhanced error handling with SQL state mapping and context - inline
    Closure<Response> handleError = { Exception e, String context ->
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
        String errorMessage = (e.message?.toLowerCase() ?: "") as String
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
    
    // POST /steps/{stepInstanceId}/open
    if (pathParts.size() == 2 && pathParts[1] == 'open') {
        try {
            String stepInstanceId = pathParts[0] as String
            UUID stepInstanceUuid = UUID.fromString(stepInstanceId) as UUID
            
            // Parse request body
            Map<String, Object> requestData = [:] as Map<String, Object>
            if (body) {
                requestData = new groovy.json.JsonSlurper().parseText(body) as Map<String, Object>
            }
            
            // Get user context using UserService
            Map<String, Object> userContext = null as Map<String, Object>
            try {
                userContext = UserService.getCurrentUserContext() as Map<String, Object>
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "StepsApi (open): Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}'"
                }
            } catch (Exception e) {
                println "StepsApi (open): UserService failed (${e.message}), using null userId"
                userContext = [userId: null] as Map<String, Object>
            }
            
            Integer userId = userContext?.userId as Integer
            
            // Mark step as opened and send notifications
            StepRepository stepRepository = getStepRepository() as StepRepository
            Map<String, Object> repositoryResult = stepRepository.openStepInstanceWithNotification(stepInstanceUuid, userId) as Map<String, Object>
            Map<String, Object> result = repositoryResult as Map<String, Object>
            
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
            String stepInstanceId = pathParts[0] as String
            String instructionId = pathParts[2] as String
            UUID stepInstanceUuid = UUID.fromString(stepInstanceId) as UUID
            UUID instructionUuid = UUID.fromString(instructionId) as UUID
            
            // Parse request body
            Map<String, Object> requestData = [:] as Map<String, Object>
            if (body) {
                requestData = new groovy.json.JsonSlurper().parseText(body) as Map<String, Object>
            }
            
            // Get user context using UserService
            Map<String, Object> userContext = null as Map<String, Object>
            Integer userId = null as Integer
            
            try {
                userContext = UserService.getCurrentUserContext() as Map<String, Object>
                userId = userContext.userId as Integer
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "StepsApi (complete): Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}'"
                }
            } catch (Exception e) {
                println "StepsApi (complete): UserService failed (${e.message}), checking for frontend userId"
                userContext = null as Map<String, Object>
            }
            
            // CRITICAL FIX: If no valid user context from ThreadLocal, use frontend-provided userId
            if (!userId && requestData.userId) {
                try {
                    userId = requestData.userId as Integer
                    println "StepsApi (complete): Using frontend-provided userId: ${userId}"
                } catch (Exception e) {
                    println "StepsApi (complete): Invalid frontend userId: ${requestData.userId}"
                }
            }
            
            // Final fallback log
            if (!userId) {
                println "StepsApi (complete): WARNING - No valid userId available for audit trail"
            }
            
            // Complete instruction and send notifications
            StepRepository stepRepository = getStepRepository() as StepRepository
            Map<String, Object> repositoryResult = stepRepository.completeInstructionWithNotification(instructionUuid, stepInstanceUuid, userId) as Map<String, Object>
            Map<String, Object> result = repositoryResult as Map<String, Object>
            
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
            String stepInstanceId = pathParts[0] as String
            String instructionId = pathParts[2] as String
            UUID stepInstanceUuid = UUID.fromString(stepInstanceId) as UUID
            UUID instructionUuid = UUID.fromString(instructionId) as UUID
            
            // Parse request body
            Map<String, Object> requestData = [:] as Map<String, Object>
            if (body) {
                requestData = new groovy.json.JsonSlurper().parseText(body) as Map<String, Object>
            }
            
            // Get user context using UserService
            Map<String, Object> userContext = null as Map<String, Object>
            Integer userId = null as Integer
            
            try {
                userContext = UserService.getCurrentUserContext()
                userId = userContext.userId as Integer
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "StepsApi (incomplete): Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}'"
                }
            } catch (Exception e) {
                println "StepsApi (incomplete): UserService failed (${e.message}), checking for frontend userId"
                userContext = null
            }
            
            // CRITICAL FIX: If no valid user context from ThreadLocal, use frontend-provided userId
            if (!userId && requestData.userId) {
                try {
                    userId = requestData.userId as Integer
                    println "StepsApi (incomplete): Using frontend-provided userId: ${userId}"
                } catch (Exception e) {
                    println "StepsApi (incomplete): Invalid frontend userId: ${requestData.userId}"
                }
            }
            
            // Final fallback log
            if (!userId) {
                println "StepsApi (incomplete): WARNING - No valid userId available for audit trail"
            }
            
            // Mark instruction as incomplete and send notifications
            StepRepository stepRepository = getStepRepository()
            Map<String, Object> repositoryResult = stepRepository.uncompleteInstructionWithNotification(instructionUuid, stepInstanceUuid, userId) as Map<String, Object>
            Map<String, Object> result = repositoryResult as Map<String, Object>
            
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
    
        // POST /steps/{stepInstanceId}/send-email - manual email sending with enhanced mobile templates
    if (pathParts.size() == 2 && pathParts[1] == 'send-email') {
        try {
            String stepInstanceId = pathParts[0] as String
            UUID stepInstanceUuid = UUID.fromString(stepInstanceId) as UUID
            
            // Parse request body for optional userId
            Map<String, Object> requestData = [:] as Map<String, Object>
            if (body) {
                try {
                    // Fix Line 1294: Explicit casting for JsonSlurper result
                    requestData = new groovy.json.JsonSlurper().parseText(body) as Map<String, Object>
                } catch (Exception e) {
                    // Ignore parsing errors, proceed with empty requestData
                }
            }
            
            // Get user context for audit logging
            Integer userId = null
            try {
                umig.service.UserService userService = new umig.service.UserService()
                Map<String, Object> userContext = userService.getCurrentUserContext() as Map<String, Object>
                userId = userContext?.userId as Integer
            } catch (Exception e) {
                // If UserService fails, try to get userId from request body
                Map<String, Object> requestMap = requestData as Map<String, Object>
                if (requestMap.userId) {
                    try {
                        userId = requestMap.userId as Integer
                    } catch (Exception parseError) {
                        // Ignore parse error
                    }
                }
            }
            
            // Get step instance and related data for email
            Map<String, Object> stepInstance = getStepRepository().findStepInstanceDetailsById(stepInstanceUuid) as Map<String, Object>
            if (!stepInstance) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Step instance not found"]).toString())
                    .build()
            }
            
            // Fix Line 1327: Explicit return type casting for recipients map
            // Get team information for recipient configuration
            Map<String, List<String>> recipients = DatabaseUtil.withSql { sql ->
                // TO: Assigned team (owner team)
                Map<String, Object> assignedTeam = sql.firstRow('''
                    SELECT tms.tms_email, tms.tms_name 
                    FROM teams_tms tms
                    JOIN steps_master_stm stm ON tms.tms_id = stm.tms_id_owner
                    JOIN steps_instance_sti sti ON stm.stm_id = sti.stm_id
                    WHERE sti.sti_id = :stepInstanceId
                ''', [stepInstanceId: stepInstanceUuid])
                
                // Fix Line 1338: Explicit casting for sql.rows() result
                // CC: Impacted teams
                List<GroovyRowResult> impactedTeamRows = sql.rows('''
                    SELECT DISTINCT tms.tms_email, tms.tms_name
                    FROM teams_tms tms
                    JOIN steps_master_stm_x_teams_tms_impacted imp ON tms.tms_id = imp.tms_id_impacted
                    JOIN steps_master_stm stm ON imp.stm_id = stm.stm_id
                    JOIN steps_instance_sti sti ON stm.stm_id = sti.stm_id
                    WHERE sti.sti_id = :stepInstanceId
                ''', [stepInstanceId: stepInstanceUuid])
                
                // Convert GroovyRowResult to proper Map<String, Object> format
                List<Map<String, Object>> impactedTeams = impactedTeamRows.collect { row ->
                    [tms_email: row.tms_email, tms_name: row.tms_name] as Map<String, Object>
                }
                
                // BCC: IT_CUTOVER team
                Map<String, Object> itCutoverTeam = sql.firstRow('''
                    SELECT tms_email, tms_name 
                    FROM teams_tms 
                    WHERE UPPER(tms_name) = 'IT_CUTOVER' 
                    OR UPPER(tms_name) = 'IT CUTOVER'
                    LIMIT 1
                ''')
                
                // Return properly typed map with explicit casting for each value
                return [
                    to: assignedTeam ? [assignedTeam.tms_email as String] : ([] as List<String>),
                    cc: impactedTeams.collect { (it.tms_email as String) } as List<String>,
                    bcc: itCutoverTeam ? [itCutoverTeam.tms_email as String] : ([] as List<String>)
                ] as Map<String, List<String>>
            } as Map<String, List<String>>
            
            // Call enhanced email service with proper recipient configuration
            umig.utils.EnhancedEmailService emailService = new umig.utils.EnhancedEmailService()
            Map<String, Object> emailResult = emailService.sendStepEmailWithRecipients(
                stepInstance,
                recipients.to as List<String>,
                recipients.cc as List<String>,
                recipients.bcc as List<String>,
                userId,
                (stepInstance.migration_code ?: stepInstance.get('migration_code')) as String,
                (stepInstance.iteration_code ?: stepInstance.get('iteration_code')) as String
            ) as Map<String, Object>
            
            // Log audit event
            DatabaseUtil.withSql { sql ->
                sql.execute('''
                    INSERT INTO audit_log_aud (
                        usr_id, 
                        aud_action, 
                        aud_entity_type, 
                        aud_entity_id, 
                        aud_details
                    ) VALUES (
                        :userId, 
                        'EMAIL_SENT', 
                        'steps_instance_sti', 
                        :entityId, 
                        :details
                    )
                ''', [
                    userId: userId,
                    entityId: stepInstanceUuid,
                    details: new groovy.json.JsonBuilder([
                        to: recipients.to,
                        cc: recipients.cc,
                        bcc: recipients.bcc,
                        template: 'enhanced_mobile',
                        timestamp: new Date().format("yyyy-MM-dd HH:mm:ss")
                    ]).toString()
                ])
            }
            
            Integer totalRecipients = recipients.to.size() + recipients.cc.size() + recipients.bcc.size() as Integer
            
            return Response.ok(new JsonBuilder([
                success: true,
                message: "Email sent successfully using enhanced mobile template",
                stepInstanceId: stepInstanceId,
                recipientCount: totalRecipients,
                recipients: [
                    to: recipients.to.size(),
                    cc: recipients.cc.size(),
                    bcc: recipients.bcc.size()
                ],
                emailsSent: 1
            ]).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to send email: ${e.message}"]).toString())
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
statuses(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request)
    List<String> pathParts = extraPath?.split('/')?.findAll { it } as List<String> ?: []
    
    // Lazy load repositories to avoid class loading issues
    Closure<StatusRepository> getStatusRepository = { ->
        return new StatusRepository()
    }
    
    // GET /statuses/step - return all step statuses
    if (pathParts.size() == 1 && pathParts[0] == 'step') {
        try {
            StatusRepository statusRepository = getStatusRepository()
            List<Map<String, Object>> statuses = statusRepository.findStatusesByType('Step') as List<Map<String, Object>>
            
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
        String entityType = pathParts[0] as String
        // Capitalize first letter to match database values
        entityType = entityType.substring(0, 1).toUpperCase() + entityType.substring(1).toLowerCase()
        
        try {
            StatusRepository statusRepository = getStatusRepository()
            List<Map<String, Object>> statuses = statusRepository.findStatusesByType(entityType) as List<Map<String, Object>>
            
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
            StatusRepository statusRepository = getStatusRepository()
            List<Map<String, Object>> statuses = statusRepository.findAllStatuses() as List<Map<String, Object>>
            
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
comments(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request)
    List<String> pathParts = extraPath?.split('/')?.findAll { it } as List<String> ?: []
    
    // Lazy load repositories to avoid class loading issues
    Closure<StepRepository> getStepRepository = { ->
        return new StepRepository()
    }
    
    // GET /steps/{stepInstanceId}/comments
    if (pathParts.size() == 2 && pathParts[1] == 'comments') {
        try {
            UUID stepInstanceId = UUID.fromString(pathParts[0]) as UUID
            StepRepository stepRepository = getStepRepository()
            List<Map<String, Object>> comments = stepRepository.findCommentsByStepInstanceId(stepInstanceId) as List<Map<String, Object>>
            
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
comments(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request)
    List<String> pathParts = extraPath?.split('/')?.findAll { it } as List<String> ?: []
    
    // Lazy load repositories to avoid class loading issues
    Closure<StepRepository> getStepRepository = { ->
        return new StepRepository()
    }
    
    // POST /steps/{stepInstanceId}/comments
    if (pathParts.size() == 2 && pathParts[1] == 'comments') {
        try {
            UUID stepInstanceId = UUID.fromString(pathParts[0]) as UUID
            
            // Parse request body
            Map<String, Object> requestData = new groovy.json.JsonSlurper().parseText(body) as Map<String, Object>
            String commentBody = requestData.body as String
            
            // Get user context using UserService for intelligent fallback handling
            Map<String, Object> userContext = null as Map<String, Object>
            Integer userId = null as Integer
            
            try {
                userContext = UserService.getCurrentUserContext()
                userId = userContext.userId as Integer
                
                // Log the user context for debugging
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "StepsApi (POST /comments): Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}' (userId: ${userContext.userId})"
                }
            } catch (Exception e) {
                println "StepsApi (POST /comments): UserService failed (${e.message}), checking for frontend userId"
                userContext = null
            }
            
            // CRITICAL FIX: If no valid user context from ThreadLocal, use frontend-provided userId
            if (!userId && requestData.userId) {
                try {
                    userId = requestData.userId as Integer
                    println "StepsApi (POST /comments): Using frontend-provided userId: ${userId}"
                } catch (Exception e) {
                    println "StepsApi (POST /comments): Invalid frontend userId: ${requestData.userId}"
                }
            }
            
            // Final fallback log
            if (!userId) {
                println "StepsApi (POST /comments): WARNING - No valid userId available for audit trail"
            }
            
            if (!commentBody || commentBody.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Comment body is required"]).toString())
                    .build()
            }
            
            StepRepository stepRepository = getStepRepository()
            Map<String, Object> result = stepRepository.createComment(stepInstanceId, commentBody, userId) as Map<String, Object>
            
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
comments(httpMethod: "PUT", groups: ["confluence-users"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request)
    List<String> pathParts = extraPath?.split('/')?.findAll { it } as List<String> ?: []
    
    // Lazy load repositories to avoid class loading issues
    Closure<StepRepository> getStepRepository = { ->
        return new StepRepository()
    }
    
    // PUT /comments/{commentId}
    if (pathParts.size() == 1) {
        try {
            Integer commentId = Integer.parseInt(pathParts[0]) as Integer
            
            // Parse request body
            Map<String, Object> requestData = new groovy.json.JsonSlurper().parseText(body) as Map<String, Object>
            String commentBody = requestData.body as String
            
            // Get user context using UserService for intelligent fallback handling
            Map<String, Object> userContext = null as Map<String, Object>
            try {
                userContext = UserService.getCurrentUserContext()
                
                // Log the user context for debugging
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "StepsApi (PUT /comments): Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}' (userId: ${userContext.userId})"
                }
            } catch (Exception e) {
                // If UserService fails, fall back to null userId (acceptable for repository)
                println "StepsApi (PUT /comments): UserService failed (${e.message}), proceeding with null userId for audit"
                userContext = [userId: null, confluenceUsername: "unknown"]
            }
            
            Integer userId = userContext?.userId as Integer
            
            if (!commentBody || commentBody.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Comment body is required"]).toString())
                    .build()
            }
            
            StepRepository stepRepository = getStepRepository()
            Boolean success = stepRepository.updateComment(commentId, commentBody, userId) as Boolean
            
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
 * Handles DELETE requests for deleting comments.
 * - DELETE /comments/{commentId} -> deletes a comment
 */
comments(httpMethod: "DELETE", groups: ["confluence-users"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request)
    List<String> pathParts = extraPath?.split('/')?.findAll { it } as List<String> ?: []
    
    // Lazy load repositories to avoid class loading issues
    Closure<StepRepository> getStepRepository = { ->
        return new StepRepository()
    }
    
    // DELETE /comments/{commentId}
    if (pathParts.size() == 1) {
        try {
            Integer commentId = Integer.parseInt(pathParts[0]) as Integer
            Integer userId = 1 as Integer // Default to user 1 for now
            
            StepRepository stepRepository = getStepRepository()
            Boolean success = stepRepository.deleteComment(commentId, userId) as Boolean
            
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

/**
 * POST /steps/instance/{stepInstanceId}/send-email
 * Send email notification for a step instance with enhanced features
 */
stepEmail(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request)
    List<String> pathParts = extraPath?.split('/')?.findAll { it } as List<String> ?: []
    
    // POST /steps/instance/{stepInstanceId}/send-email
    if (pathParts.size() >= 3 && pathParts[0] == 'instance' && pathParts[2] == 'send-email') {
        try {
            String stepInstanceIdStr = pathParts[1] as String
            UUID stepInstanceId = UUID.fromString(stepInstanceIdStr) as UUID
            
            // Parse request body
            def slurper = new JsonSlurper()
            Map<String, Object> emailData = slurper.parseText(body) as Map<String, Object>
            
            List<String> recipients = emailData.recipients as List<String> ?: []
            String subject = emailData.subject as String ?: ""
            String message = emailData.message as String ?: ""
            Boolean includeInstructions = emailData.includeInstructions as Boolean ?: false
            Boolean includeComments = emailData.includeComments as Boolean ?: false
            Integer userId = emailData.userId as Integer ?: 1
            
            if (recipients.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Recipients list cannot be empty"]).toString())
                    .build()
            }
            
            // Use StepNotificationIntegration for enhanced email features
            StepNotificationIntegration integrator = new StepNotificationIntegration()
            
            // Send enhanced email notification
            Map<String, Object> result = (DatabaseUtil.withSql { sql ->
                // Get step details
                def stepQuery = '''
                    SELECT sti.sti_id, sti.sti_name, sti.sti_status, stm.stt_code, stm.stm_number,
                           stm.stm_name, mig.mig_name as migration_name, itn.itn_code as iteration_code,
                           mig.mig_code as migration_code
                    FROM steps_instance_sti sti
                    INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    LEFT JOIN phase_instance_phi phi ON sti.phi_id = phi.phi_id
                    LEFT JOIN sequence_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    LEFT JOIN plan_instance_pli pli ON sqi.pli_id = pli.pli_id
                    LEFT JOIN iteration_instance_ini ini ON pli.ini_id = ini.ini_id
                    LEFT JOIN iteration_types_itn itn ON ini.itt_id = itn.itt_id
                    LEFT JOIN migration_mig mig ON ini.mig_id = mig.mig_id
                    WHERE sti.sti_id = :stepInstanceId
                '''
                
                def stepInstance = sql.firstRow(stepQuery, [stepInstanceId: stepInstanceId])
                
                if (!stepInstance) {
                    return [
                        success: false,
                        error: "Step instance not found"
                    ]
                }
                
                // Send email using EnhancedEmailService
                EnhancedEmailService emailService = new EnhancedEmailService()
                
                // Build email content
                StringBuilder emailBody = new StringBuilder()
                emailBody.append("<h3>Step Details: ${stepInstance.stt_code}-${String.format('%03d', stepInstance.stm_number)}</h3>")
                emailBody.append("<p><strong>Step Name:</strong> ${stepInstance.sti_name}</p>")
                emailBody.append("<p><strong>Migration:</strong> ${stepInstance.migration_name}</p>")
                
                if (message) {
                    emailBody.append("<hr/>")
                    emailBody.append("<p><strong>Message:</strong></p>")
                    emailBody.append("<p>${message}</p>")
                }
                
                if (includeInstructions) {
                    // Get instructions
                    def instructionsQuery = '''
                        SELECT ini.ini_name, ini.ini_description, ini.ini_is_completed
                        FROM instructions_instance_ini ini
                        WHERE ini.sti_id = :stepInstanceId
                        ORDER BY ini.ini_order
                    '''
                    def instructions = sql.rows(instructionsQuery, [stepInstanceId: stepInstanceId])
                    
                    if (!instructions.isEmpty()) {
                        emailBody.append("<hr/>")
                        emailBody.append("<h4>Instructions:</h4>")
                        emailBody.append("<ul>")
                        instructions.each { inst ->
                            String status = inst.ini_is_completed ? "✅" : "⏳"
                            emailBody.append("<li>${status} ${inst.ini_name}: ${inst.ini_description ?: 'No description'}</li>")
                        }
                        emailBody.append("</ul>")
                    }
                }
                
                if (includeComments) {
                    // Get comments
                    def commentsQuery = '''
                        SELECT sic.sic_content, sic.created_by, sic.created_at
                        FROM step_instance_comments_sic sic
                        WHERE sic.sti_id = :stepInstanceId
                        ORDER BY sic.created_at DESC
                        LIMIT 10
                    '''
                    def comments = sql.rows(commentsQuery, [stepInstanceId: stepInstanceId])
                    
                    if (!comments.isEmpty()) {
                        emailBody.append("<hr/>")
                        emailBody.append("<h4>Recent Comments:</h4>")
                        comments.each { comment ->
                            emailBody.append("<div style='margin: 10px 0; padding: 10px; background: #f5f5f5;'>")
                            emailBody.append("<p><strong>${comment.created_by}</strong> - ${comment.created_at}</p>")
                            emailBody.append("<p>${comment.sic_content}</p>")
                            emailBody.append("</div>")
                        }
                    }
                }
                
                // Add URL link if available
                String migrationCode = stepInstance.migration_code as String ?: "unknown"
                String iterationCode = stepInstance.iteration_code as String ?: "default"
                String stepCode = "${stepInstance.stt_code}-${String.format('%03d', stepInstance.stm_number)}"
                
                String stepUrl = UrlConstructionService.buildStepViewUrl(
                    stepInstanceId,
                    migrationCode,
                    iterationCode,
                    stepCode
                )
                
                if (stepUrl) {
                    emailBody.append("<hr/>")
                    emailBody.append("<p><a href='${stepUrl}' style='padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;'>View Step in UMIG</a></p>")
                }
                
                // Send the email
                int emailsSent = 0
                recipients.each { recipient ->
                    try {
                        // Use static method from EmailService class
                        EmailService.sendEmail(
                            [recipient as String],
                            subject,
                            emailBody.toString()
                        )
                        emailsSent++
                    } catch (Exception e) {
                        log.warn("Failed to send email to ${recipient}: ${e.message}")
                    }
                }
                
                // Log audit entry
                def auditInsert = '''
                    INSERT INTO audit_log_aud (
                        aud_entity_type, aud_entity_id, aud_action,
                        aud_user_id, aud_details, aud_timestamp
                    ) VALUES (
                        'STEP_EMAIL', :entityId, 'EMAIL_SENT',
                        :userId, :details, CURRENT_TIMESTAMP
                    )
                '''
                
                sql.execute(auditInsert, [
                    entityId: stepInstanceId,
                    userId: userId,
                    details: "Email sent to ${emailsSent} recipients"
                ])
                
                return [
                    success: true,
                    emailsSent: emailsSent,
                    recipientCount: recipients.size(),
                    message: "Email sent successfully"
                ]
            }) as Map<String, Object>
            
            if (result.success as Boolean) {
                return Response.ok(new JsonBuilder(result).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: result.error ?: "Failed to send email"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            log.error("Error sending step email", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to send email: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid email endpoint"]).toString())
        .build()
}

// Helper method to get current user from Confluence context
private Object getCurrentUser() {
    try {
        return com.atlassian.confluence.user.AuthenticatedUserThreadLocal.get() as Object
    } catch (Exception e) {
        log.warn("StepsApi: Could not get current user", e)
        return null as Object
    }
}

// Helper method to get UserRepository instance
private UserRepository getUserRepository() {
    return new UserRepository() as UserRepository
}

// Helper method to get StatusRepository instance
private StatusRepository getStatusRepository() {
    return new StatusRepository() as StatusRepository
}

// Helper method to get StepRepository instance
private StepRepository getStepRepository() {
    return new StepRepository() as StepRepository
}

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

