package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.StepRepository
import umig.repository.StatusRepository
import umig.repository.UserRepository
import umig.service.UserService
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID
import java.sql.SQLException

/**
 * Steps API - repositories instantiated within methods to avoid class loading issues
 */
@BaseScript CustomEndpointDelegate delegate

// Import repositories at compile time but instantiate lazily

/**
 * Handles GET requests for Steps with hierarchical filtering for the runsheet.
 * - GET /steps -> returns all steps (not recommended for production)
 * - GET /steps/master -> returns all master steps for dropdowns
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
    
    // Lazy load repositories to avoid class loading issues
    def getStepRepository = { ->
        return new StepRepository()
    }
    def getStatusRepository = { ->
        return new StatusRepository()
    }
    def getUserRepository = { ->
        return new UserRepository()
    }
    
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
                filters.labelId = UUID.fromString(qParams.getFirst("labelId") as String)
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid labelId format: must be a valid UUID")
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
            StepRepository stepRepository = getStepRepository()
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
                StepRepository stepRepository = getStepRepository()
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
            StepRepository stepRepository = getStepRepository()
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

            // Validate sort field
            def allowedSortFields = ['stm_id', 'stm_name', 'stm_status', 'created_at', 'updated_at', 'instruction_count', 'instance_count']
            if (sortField && !allowedSortFields.contains(sortField)) {
                return Response.status(400)
                    .entity(new JsonBuilder([error: "Invalid sort field: ${sortField}. Allowed fields: ${allowedSortFields.join(', ')}", code: 400]).toString())
                    .build()
            }

            StepRepository stepRepository = getStepRepository()
            def result = stepRepository.findMasterStepsWithFilters(filters as Map, pageNumber as int, pageSize as int, sortField as String, sortDirection as String)
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
            StepRepository stepRepository = getStepRepository()
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
            StepRepository stepRepository = getStepRepository()
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
            
            // Use enhanced repository method for export
            StepRepository stepRepository = getStepRepository()
            def exportData = stepRepository.findStepsWithFilters(filters, 10000, 0, "export")
            
            if (format.toLowerCase() == "csv") {
                // Generate CSV format - inline method
                def steps = exportData.data as List
                def csvContent
                if (!steps || steps.isEmpty()) {
                    csvContent = "No data available"
                } else {
                    def headers = [
                        "Step ID", "Step Code", "Step Name", "Status", "Team", 
                        "Sequence", "Phase", "Duration (min)", "Created At", "Updated At"
                    ]
                    
                    def csvLines = [headers.join(",")]
                    
                    steps.each { step ->
                        def stepMap = step as Map
                        def line = [
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
    if (pathParts.empty) {
        try {
            // Parse and validate parameters with type safety
            def filters = parseAndValidateFilters(queryParams)
            def pagination = validatePaginationParams(queryParams)
            
            // Check if this is a simple list request or enhanced filtering
            def useEnhancedMethod = queryParams.getFirst("enhanced") == "true" || 
                                   queryParams.getFirst("limit") || 
                                   queryParams.getFirst("offset")
            
            StepRepository stepRepository = getStepRepository()
            
            if (useEnhancedMethod) {
                // Use enhanced repository method with pagination
                def result = stepRepository.findStepsWithFilters(
                    filters, 
                    pagination.limit as Integer, 
                    pagination.offset as Integer,
                    "list"
                )
                
                return Response.ok(new JsonBuilder(result).toString()).build()
            } else {
                // Backward compatibility: use original grouping logic
                def steps = stepRepository.findFilteredStepInstances(filters)
            
            // Group steps by sequence and phase for frontend consumption
            def groupedSteps = [:]
            
            steps.each { stepItem ->
                def step = stepItem as Map
                def sequenceKey = "${step.sequenceNumber}-${step.sequenceId}"
                def phaseKey = "${step.phaseNumber}-${step.phaseId}"
                
                if (!groupedSteps[sequenceKey]) {
                    groupedSteps[sequenceKey] = [
                        id: step.sequenceId,
                        name: step.sequenceName,
                        number: step.sequenceNumber,
                        phases: [:]
                    ]
                }
                
                def sequenceMap = groupedSteps[sequenceKey] as Map
                def phasesMap = sequenceMap.phases as Map
                
                if (!phasesMap[phaseKey]) {
                    phasesMap[phaseKey] = [
                        id: step.phaseId,
                        name: step.phaseName,
                        number: step.phaseNumber,
                        steps: []
                    ]
                }
                
                def phaseMap = phasesMap[phaseKey] as Map
                def stepsList = phaseMap.steps as List
                
                // Fetch labels for this step
                def stepLabels = []
                try {
                    // Convert stmId to UUID if it's a string
                    def stmId = step.stmId instanceof UUID ? step.stmId : UUID.fromString(step.stmId.toString())
                    stepLabels = stepRepository.findLabelsByStepId(stmId)
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
            def result = groupedSteps.values().collect { sequenceItem ->
                def sequence = sequenceItem as Map
                def phasesMap = sequence.phases as Map
                
                def phasesList = phasesMap.values().collect { phaseItem ->
                    def phase = phaseItem as Map
                    def stepsList = phase.steps as List
                    
                    return [
                        id: phase.id,
                        name: phase.name,
                        number: phase.number,
                        steps: stepsList.sort { stepItem -> (stepItem as Map).code }
                    ]
                }
                phasesList.sort { phaseItem -> (phaseItem as Map).number }
                
                return [
                    id: sequence.id,
                    name: sequence.name,
                    number: sequence.number,
                    phases: phasesList
                ]
            }
            result.sort { sequenceItem -> (sequenceItem as Map).number }
            
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
    
    // Lazy load repositories to avoid class loading issues
    def getStepRepository = { ->
        return new StepRepository()
    }
    def getStatusRepository = { ->
        return new StatusRepository()
    }
    def getUserRepository = { ->
        return new UserRepository()
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
            StatusRepository statusRepository = getStatusRepository()
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
            StepRepository stepRepository = getStepRepository()
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
            StepRepository stepRepository = getStepRepository()
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
            StepRepository stepRepository = getStepRepository()
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
            
            // Get user context using UserService for intelligent fallback handling
            def userContext
            Integer userId = null
            
            try {
                userContext = UserService.getCurrentUserContext()
                userId = userContext.userId as Integer
                
                // Log the user context for debugging
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "StepsApi: Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}' (userId: ${userId})"
                }
            } catch (Exception e) {
                // If UserService fails, try to use frontend-provided userId
                println "StepsApi: UserService failed (${e.message}), checking for frontend userId"
                userContext = null
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
            
            // Update step status and send notifications
            StepRepository stepRepository = getStepRepository()
            def repositoryResult = stepRepository.updateStepInstanceStatusWithNotification(stepInstanceUuid, statusId, userId)
            def result = repositoryResult as Map
            
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
steps(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load repositories to avoid class loading issues
    def getStepRepository = { ->
        return new StepRepository()
    }
    def getStatusRepository = { ->
        return new StatusRepository()
    }
    def getUserRepository = { ->
        return new UserRepository()
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
            
            // Get user context using UserService
            def userContext
            try {
                userContext = UserService.getCurrentUserContext()
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "StepsApi (open): Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}'"
                }
            } catch (Exception e) {
                println "StepsApi (open): UserService failed (${e.message}), using null userId"
                userContext = [userId: null]
            }
            
            Integer userId = userContext?.userId as Integer
            
            // Mark step as opened and send notifications
            StepRepository stepRepository = getStepRepository()
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
            
            // Get user context using UserService
            def userContext
            Integer userId = null
            
            try {
                userContext = UserService.getCurrentUserContext()
                userId = userContext.userId as Integer
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "StepsApi (complete): Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}'"
                }
            } catch (Exception e) {
                println "StepsApi (complete): UserService failed (${e.message}), checking for frontend userId"
                userContext = null
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
            StepRepository stepRepository = getStepRepository()
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
            
            // Get user context using UserService
            def userContext
            Integer userId = null
            
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
    def getStatusRepository = { ->
        return new StatusRepository()
    }
    
    // GET /statuses/step - return all step statuses
    if (pathParts.size() == 1 && pathParts[0] == 'step') {
        try {
            StatusRepository statusRepository = getStatusRepository()
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
            StatusRepository statusRepository = getStatusRepository()
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
            StatusRepository statusRepository = getStatusRepository()
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
    def getStepRepository = { ->
        return new StepRepository()
    }
    
    // GET /steps/{stepInstanceId}/comments
    if (pathParts.size() == 2 && pathParts[1] == 'comments') {
        try {
            def stepInstanceId = UUID.fromString(pathParts[0])
            StepRepository stepRepository = getStepRepository()
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
    def getStepRepository = { ->
        return new StepRepository()
    }
    
    // POST /steps/{stepInstanceId}/comments
    if (pathParts.size() == 2 && pathParts[1] == 'comments') {
        try {
            def stepInstanceId = UUID.fromString(pathParts[0])
            
            // Parse request body
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def commentBody = requestData.body as String
            
            // Get user context using UserService for intelligent fallback handling
            def userContext
            Integer userId = null
            
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
    def getStepRepository = { ->
        return new StepRepository()
    }
    
    // PUT /comments/{commentId}
    if (pathParts.size() == 1) {
        try {
            def commentId = Integer.parseInt(pathParts[0])
            
            // Parse request body
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def commentBody = requestData.body as String
            
            // Get user context using UserService for intelligent fallback handling
            def userContext
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
 * Handles DELETE requests for deleting comments.
 * - DELETE /comments/{commentId} -> deletes a comment
 */
comments(httpMethod: "DELETE", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load repositories to avoid class loading issues
    def getStepRepository = { ->
        return new StepRepository()
    }
    
    // DELETE /comments/{commentId}
    if (pathParts.size() == 1) {
        try {
            def commentId = Integer.parseInt(pathParts[0])
            Integer userId = 1 // Default to user 1 for now
            
            StepRepository stepRepository = getStepRepository()
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

// Helper method to get UserRepository instance
private def getUserRepository() {
    return new UserRepository()
}

// Helper method to get StatusRepository instance
private def getStatusRepository() {
    return new StatusRepository()
}

// Helper method to get StepRepository instance
private def getStepRepository() {
    return new StepRepository()
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

