package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.MigrationRepository
import groovy.json.JsonBuilder
import groovy.json.JsonException
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field
import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import java.util.UUID
import org.apache.log4j.LogManager
import org.apache.log4j.Logger

@BaseScript CustomEndpointDelegate delegate

@Field
final MigrationRepository migrationRepository = new MigrationRepository()

@Field
final Logger log = LogManager.getLogger(getClass())

/**
 * GET /migrations - List all migrations with pagination, filtering, and search
 * GET /migrations/{id} - Get single migration with metadata
 * GET /migrations/{id}/iterations - Get iterations for a migration
 * GET /migrations/dashboard/summary - Dashboard summary data
 * GET /migrations/dashboard/progress - Progress aggregation data
 * GET /migrations/dashboard/metrics - Performance metrics
 */
migrations(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []

    try {
        // Handle dashboard endpoints first
        if (pathParts.size() >= 2 && pathParts[0] == 'dashboard') {
            switch(pathParts[1]) {
                case 'summary':
                    def summary = migrationRepository.getDashboardSummary()
                    return Response.ok(new JsonBuilder([data: summary]).toString()).build()
                    
                case 'progress':
                    def migrationIdParam = queryParams.getFirst('migrationId')
                    def dateFromParam = queryParams.getFirst('dateFrom')
                    def dateToParam = queryParams.getFirst('dateTo')
                    
                    UUID migrationId = null
                    Date dateFrom = null
                    Date dateTo = null
                    
                    if (migrationIdParam) {
                        try {
                            migrationId = UUID.fromString(migrationIdParam as String)
                        } catch (IllegalArgumentException e) {
                            return Response.status(Response.Status.BAD_REQUEST)
                                .entity(new JsonBuilder([error: "Invalid migration ID format"]).toString())
                                .build()
                        }
                    }
                    
                    // Parse dates if provided
                    if (dateFromParam) {
                        try {
                            dateFrom = Date.parse('yyyy-MM-dd', dateFromParam as String)
                        } catch (Exception e) {
                            return Response.status(Response.Status.BAD_REQUEST)
                                .entity(new JsonBuilder([error: "Invalid dateFrom format. Use YYYY-MM-DD"]).toString())
                                .build()
                        }
                    }
                    
                    if (dateToParam) {
                        try {
                            dateTo = Date.parse('yyyy-MM-dd', dateToParam as String)
                        } catch (Exception e) {
                            return Response.status(Response.Status.BAD_REQUEST)
                                .entity(new JsonBuilder([error: "Invalid dateTo format. Use YYYY-MM-DD"]).toString())
                                .build()
                        }
                    }
                    
                    def progress = migrationRepository.getProgressAggregation(migrationId, dateFrom, dateTo)
                    return Response.ok(new JsonBuilder([data: progress]).toString()).build()
                    
                case 'metrics':
                    def period = queryParams.getFirst('period') ?: 'month'
                    def migrationIdParam = queryParams.getFirst('migrationId')
                    
                    UUID migrationId = null
                    if (migrationIdParam) {
                        try {
                            migrationId = UUID.fromString(migrationIdParam as String)
                        } catch (IllegalArgumentException e) {
                            return Response.status(Response.Status.BAD_REQUEST)
                                .entity(new JsonBuilder([error: "Invalid migration ID format"]).toString())
                                .build()
                        }
                    }
                    
                    if (!['day', 'week', 'month', 'quarter'].contains(period)) {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "Invalid period. Must be: day, week, month, or quarter"]).toString())
                            .build()
                    }
                    
                    // Performance metrics not yet implemented in repository
                    // Return placeholder data for now
                    def metrics = [
                        period: period,
                        migrationId: migrationId,
                        message: "Performance metrics endpoint placeholder - repository method not yet implemented",
                        completionRate: 0,
                        avgDuration: 0,
                        statusDistribution: [:],
                        trends: []
                    ]
                    return Response.ok(new JsonBuilder([data: metrics]).toString()).build()
                    
                default:
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Unknown dashboard endpoint"]).toString())
                        .build()
            }
        }
        
        // Handle bulk operations
        if (pathParts.size() >= 2 && pathParts[0] == 'bulk') {
            return Response.status(Response.Status.METHOD_NOT_ALLOWED)
                .entity(new JsonBuilder([error: "Bulk operations require POST or PUT method"]).toString())
                .build()
        }
        // The order of these checks is critical. Go from most specific to least specific.
        if (pathParts.size() == 8 && pathParts[5] == 'sequences' && pathParts[7] == 'phases') {
            // GET /migrations/{migId}/iterations/{iteId}/plan-instances/{pliId}/sequences/{seqId}/phases
            def sequenceId = pathParts[6]
            try {
                def phases = migrationRepository.findPhasesBySequenceId(UUID.fromString(sequenceId))
                def result = phases.collect { [id: it['phi_id'], name: it['phi_name']] }
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid sequence UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 6 && pathParts[5] == "sequences") {
            // GET /migrations/{migId}/iterations/{iteId}/plan-instances/{pliId}/sequences
            def planInstanceId = pathParts[4]
            try {
                def sequences = migrationRepository.findSequencesByPlanInstanceId(UUID.fromString(planInstanceId))
                def result = sequences.collect { [id: it['sqi_id'], name: it['sqi_name']] }
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid plan instance UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 6 && pathParts[3] == "sequences" && pathParts[5] == "phases") {
            // GET /migrations/{migId}/iterations/{iteId}/sequences/{seqId}/phases
            def sequenceId = pathParts[4]
            try {
                def phases = migrationRepository.findPhasesBySequenceId(UUID.fromString(sequenceId))
                def result = phases.collect { [id: it['phi_id'], name: it['phi_name']] }
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid sequence UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 6 && pathParts[3] == "plan-instances" && pathParts[5] == "phases") {
            // GET /migrations/{migId}/iterations/{iteId}/plan-instances/{pliId}/phases
            def planInstanceId = pathParts[4]
            try {
                def phases = migrationRepository.findPhasesByPlanInstanceId(UUID.fromString(planInstanceId))
                def result = phases.collect { [id: it['phi_id'], name: it['phi_name']] }
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid plan instance UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 4 && pathParts[3] == "plan-instances") {
            // GET /migrations/{migId}/iterations/{iteId}/plan-instances
            def iterationId = pathParts[2]
            try {
                def planInstances = migrationRepository.findPlanInstancesByIterationId(UUID.fromString(iterationId))
                def result = planInstances.collect { [id: it['pli_id'], name: it['plm_name']] }
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid iteration UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 4 && pathParts[3] == "sequences") {
            // GET /migrations/{migId}/iterations/{iteId}/sequences
            def iterationId = pathParts[2]
            try {
                def sequences = migrationRepository.findSequencesByIterationId(UUID.fromString(iterationId))
                def result = sequences.collect { [id: it['sqi_id'], name: it['sqi_name']] }
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid iteration UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 4 && pathParts[3] == "phases") {
            // GET /migrations/{migId}/iterations/{iteId}/phases
            def iterationId = pathParts[2]
            try {
                def phases = migrationRepository.findPhasesByIterationId(UUID.fromString(iterationId))
                def result = phases.collect { [id: it['phi_id'], name: it['phi_name']] }
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid iteration UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 3 && pathParts[1] == "iterations") {
            // GET /migrations/{migId}/iterations/{iteId}
            def iterationId = pathParts[2]
            try {
                def iteration = migrationRepository.findIterationById(UUID.fromString(iterationId))
                if (!iteration) {
                    return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Iteration not found"]).toString()).build()
                }
                def result = [
                    id: iteration['ite_id'],
                    migrationId: iteration['mig_id'],
                    name: iteration['ite_name'],
                    code: iteration['itt_code'],  // Add iteration type code for URL construction
                    description: iteration['ite_description'],
                    status: iteration['ite_status'],
                    staticCutoverDate: iteration['ite_static_cutover_date'],
                    dynamicCutoverDate: iteration['ite_dynamic_cutover_date']
                ]
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid iteration UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 2 && pathParts[1] == "iterations") {
            // /migrations/{id}/iterations
            def migrationId = pathParts[0]
            try {
                def iterationsRaw = migrationRepository.findIterationsByMigrationId(UUID.fromString(migrationId))
                def iterations = iterationsRaw.collect { iteration ->
                    [
                        id: iteration['ite_id'],
                        migrationId: iteration['mig_id'],
                        name: iteration['ite_name'],
                        code: iteration['itt_code'],  // Add iteration type code for URL construction
                        description: iteration['ite_description'],
                        status: iteration['ite_status'],
                        staticCutoverDate: iteration['ite_static_cutover_date'],
                        dynamicCutoverDate: iteration['ite_dynamic_cutover_date']
                    ]
                }
                return Response.ok(new JsonBuilder(iterations).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid migration UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 1) {
            // /migrations/{id}
            def migrationId = pathParts[0]
            try {
                def migration = migrationRepository.findMigrationById(UUID.fromString(migrationId))
                if (!migration) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Migration not found"]).toString())
                        .build()
                }
                // Status metadata is already included by the repository's enrichMigrationWithStatusMetadata
                return Response.ok(new JsonBuilder(migration).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid migration UUID"]).toString()).build()
            }
        } else if (!pathParts) {
            // GET /migrations with query parameters
            def page = queryParams.getFirst('page')
            def size = queryParams.getFirst('size')
            def search = queryParams.getFirst('search')
            def sort = queryParams.getFirst('sort')
            def direction = queryParams.getFirst('direction')
            def status = queryParams.getFirst('status')
            def dateFrom = queryParams.getFirst('dateFrom')
            def dateTo = queryParams.getFirst('dateTo')
            def teamId = queryParams.getFirst('teamId')
            def ownerId = queryParams.getFirst('ownerId')
            
            // Build filters map
            Map filters = [:]
            
            // Parse pagination parameters
            int pageNumber = 1
            int pageSize = 50
            
            if (page) {
                try {
                    pageNumber = Integer.parseInt(page as String)
                    if (pageNumber < 1) pageNumber = 1
                } catch (NumberFormatException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid page number format"]).toString())
                        .build()
                }
            }
            
            if (size) {
                try {
                    pageSize = Integer.parseInt(size as String)
                    if (pageSize < 1 || pageSize > 100) pageSize = 50
                } catch (NumberFormatException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid page size format"]).toString())
                        .build()
                }
            }
            
            // Validate search term
            if (search) {
                String searchTerm = (search as String).trim()
                if (searchTerm.length() > 100) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Search term too long (max 100 characters)"]).toString())
                        .build()
                }
                filters.search = searchTerm
            }
            
            // Validate sort parameters
            String sortField = null
            String sortDirection = 'asc'
            
            if (sort) {
                def allowedSortFields = ['mig_id', 'mig_name', 'mig_status', 'mig_type', 'created_at', 'updated_at', 'mig_start_date', 'mig_end_date', 'iteration_count', 'plan_count']
                if (allowedSortFields.contains(sort as String)) {
                    sortField = sort as String
                } else {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid sort field. Allowed: ${allowedSortFields.join(', ')}"]).toString())
                        .build()
                }
            }
            
            if (direction && ['asc', 'desc'].contains((direction as String).toLowerCase())) {
                sortDirection = (direction as String).toLowerCase()
            }
            
            // Parse filter parameters
            if (status) {
                // Support comma-separated status values
                filters.status = (status as String).split(',').collect { it.trim() }
            }
            
            if (dateFrom) {
                try {
                    filters.dateFrom = Date.parse('yyyy-MM-dd', dateFrom as String)
                } catch (Exception e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid dateFrom format. Use YYYY-MM-DD"]).toString())
                        .build()
                }
            }
            
            if (dateTo) {
                try {
                    filters.dateTo = Date.parse('yyyy-MM-dd', dateTo as String)
                } catch (Exception e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid dateTo format. Use YYYY-MM-DD"]).toString())
                        .build()
                }
            }
            
            if (teamId) {
                try {
                    filters.teamId = Integer.parseInt(teamId as String)
                } catch (NumberFormatException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid team ID format"]).toString())
                        .build()
                }
            }
            
            if (ownerId) {
                try {
                    filters.ownerId = Integer.parseInt(ownerId as String)
                } catch (NumberFormatException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid owner ID format"]).toString())
                        .build()
                }
            }
            
            // Get filtered and paginated migrations using the existing method
            def result = migrationRepository.findMigrationsWithFilters(filters, pageNumber, pageSize, sortField, sortDirection)
            
            // If this is a simple request without pagination parameters (used by iteration-view.js populateFilter),
            // return the data array directly in the expected format for backward compatibility
            if (!page && !size && !search && !sort && !direction && !status && !dateFrom && !dateTo && !teamId && !ownerId) {
                // Cast to Map for static type checking compliance
                Map<String, Object> resultMap = result as Map<String, Object>
                List<Map> dataList = resultMap.data as List<Map>
                def simplifiedMigrations = dataList.collect { Map migration ->
                    [
                        id: migration.mig_id,
                        name: migration.mig_name
                    ]
                }
                return Response.ok(new JsonBuilder(simplifiedMigrations).toString()).build()
            }
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Unknown endpoint"]).toString()).build()
        }
    } catch (Exception e) {
        log.error("Unexpected error in GET /migrations", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Internal error", details: e.getMessage()]).toString())
            .build()
    }
}

/**
 * POST /migrations - Create new migration
 * POST /migrations/bulk/export - Bulk export migrations
 */
migrations(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []
    
    // Declare migrationData at method scope for static type checking compliance
    Map migrationData = null
    
    try {
        // Handle bulk export
        if (pathParts.size() >= 2 && pathParts[0] == 'bulk' && pathParts[1] == 'export') {
            Map exportData = new JsonSlurper().parseText(body) as Map
            
            // Validate request body
            if (!exportData.migrationIds || !(exportData.migrationIds instanceof List)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "migrationIds is required and must be an array"]).toString())
                    .build()
            }
            
            def format = exportData.format ?: 'json'
            if (!['json', 'csv'].contains(format)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid format. Must be 'json' or 'csv'"]).toString())
                    .build()
            }
            
            def includeIterations = exportData.includeIterations ?: false
            
            // Parse migration IDs
            List<UUID> migrationIds = []
            try {
                exportData.migrationIds.each { id ->
                    migrationIds << UUID.fromString(id as String)
                }
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid migration ID format in list"]).toString())
                    .build()
            }
            
            def exportResult = migrationRepository.bulkExportMigrations(migrationIds, format as String, includeIterations as Boolean)
            return Response.ok(new JsonBuilder(exportResult).toString()).build()
        }
        
        // Create new migration
        if (!pathParts) {
            migrationData = new JsonSlurper().parseText(body) as Map
            log.info("POST /migrations - Creating migration with data: ${migrationData}")
            
            // Validate required fields
            if (!migrationData.mig_name && !migrationData.name) {
                log.warn("POST /migrations - Missing migration name. Data: ${migrationData}")
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Migration name is required"]).toString())
                    .build()
            }
            
            try {
                Map newMigration = migrationRepository.create(migrationData) as Map
                log.info("POST /migrations - Successfully created migration: ${newMigration?.mig_id}")
                
                if (newMigration) {
                    return Response.status(Response.Status.CREATED)
                        .entity(new JsonBuilder(newMigration).toString())
                        .build()
                } else {
                    log.error("POST /migrations - Repository returned null for migration creation")
                    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(new JsonBuilder([error: "Failed to create migration - no data returned"]).toString())
                        .build()
                }
            } catch (IllegalArgumentException e) {
                log.error("POST /migrations - Validation error: ${e.message}", e)
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: e.message]).toString())
                    .build()
            } catch (Exception e) {
                log.error("POST /migrations - Unexpected error during creation: ${e.message}", e)
                throw e // Let the outer catch handle SQL exceptions
            }
        }
        
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Unknown endpoint"]).toString())
            .build()
            
    } catch (JsonException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
            .build()
    } catch (SQLException e) {
        def status = mapSqlExceptionToHttpStatus(e)
        def message = mapSqlExceptionToMessage(e)
        log.error("POST /migrations - SQL Exception: State=${e.SQLState}, Code=${e.errorCode}, Message=${e.message}. Input data: ${migrationData}", e)
        return Response.status(status)
            .entity(new JsonBuilder([
                error: message, 
                debug: "SQL State: ${e.SQLState}, Error Code: ${e.errorCode}",
                inputData: migrationData ? migrationData.findAll { k, v -> k != 'mig_description' } : [:] // Exclude potentially long description
            ]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in POST /migrations", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred"]).toString())
            .build()
    }
}

/**
 * PUT /migrations/{id} - Update migration
 * PUT /migrations/bulk/status - Bulk status update
 */
migrations(httpMethod: "PUT", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []
    
    // Declare migrationData at method scope for static type checking compliance
    Map migrationData = null
    
    try {
        // Handle bulk status update
        if (pathParts.size() >= 2 && pathParts[0] == 'bulk' && pathParts[1] == 'status') {
            Map statusData = new JsonSlurper().parseText(body) as Map
            
            // Validate request body
            if (!statusData.migrationIds || !(statusData.migrationIds instanceof List)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "migrationIds is required and must be an array"]).toString())
                    .build()
            }
            
            if (!statusData.newStatus) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "newStatus is required"]).toString())
                    .build()
            }
            
            // Parse migration IDs
            List<UUID> migrationIds = []
            try {
                statusData.migrationIds.each { id ->
                    migrationIds << UUID.fromString(id as String)
                }
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid migration ID format in list"]).toString())
                    .build()
            }
            
            // Bulk update not yet implemented in repository
            // Return placeholder response for now
            def result = [
                updated: [],
                failed: migrationIds.collect { [migrationId: it, error: "Bulk update not yet implemented in repository"] },
                summary: [
                    total: migrationIds.size(),
                    updated: 0,
                    failed: migrationIds.size(),
                    message: "Bulk status update endpoint placeholder - repository method not yet implemented"
                ]
            ]
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        // Update single migration
        if (pathParts.size() == 1) {
            def migrationId
            try {
                migrationId = UUID.fromString(pathParts[0])
            } catch (IllegalArgumentException e) {
                log.warn("PUT /migrations - Invalid UUID format: ${pathParts[0]}")
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid migration UUID"]).toString())
                    .build()
            }
            
            migrationData = new JsonSlurper().parseText(body) as Map
            log.info("PUT /migrations/${migrationId} - Updating with data: ${migrationData}")
            
            try {
                def updatedMigration = migrationRepository.update(migrationId, migrationData)
                
                if (updatedMigration) {
                    log.info("PUT /migrations/${migrationId} - Successfully updated migration")
                    return Response.ok(new JsonBuilder(updatedMigration).toString()).build()
                } else {
                    log.warn("PUT /migrations/${migrationId} - Migration not found")
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Migration not found"]).toString())
                        .build()
                }
            } catch (IllegalArgumentException e) {
                log.error("PUT /migrations/${migrationId} - Validation error: ${e.message}", e)
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: e.message]).toString())
                    .build()
            } catch (Exception e) {
                log.error("PUT /migrations/${migrationId} - Unexpected error during update: ${e.message}", e)
                throw e // Let the outer catch handle SQL exceptions
            }
        }
        
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Unknown endpoint"]).toString())
            .build()
            
    } catch (JsonException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
            .build()
    } catch (SQLException e) {
        def status = mapSqlExceptionToHttpStatus(e)
        def message = mapSqlExceptionToMessage(e)
        return Response.status(status)
            .entity(new JsonBuilder([error: message]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in PUT /migrations", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred"]).toString())
            .build()
    }
}

/**
 * DELETE /migrations/{id} - Delete migration
 */
migrations(httpMethod: "DELETE", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []
    
    if (pathParts.size() != 1) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid path for DELETE request"]).toString())
            .build()
    }
    
    def migrationId
    try {
        migrationId = UUID.fromString(pathParts[0])
    } catch (IllegalArgumentException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid migration UUID"]).toString())
            .build()
    }
    
    try {
        // Check if migration exists
        def migration = migrationRepository.findMigrationById(migrationId)
        if (!migration) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Migration not found"]).toString())
                .build()
        }
        
        migrationRepository.delete(migrationId)
        return Response.noContent().build()
        
    } catch (SQLException e) {
        if (e.getSQLState() == '23503') {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([error: "Cannot delete migration - it has associated iterations or is referenced by other resources"]).toString())
                .build()
        }
        log.warn("Database error deleting migration ${migrationId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "A database error occurred"]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error deleting migration ${migrationId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred"]).toString())
            .build()
    }
}

/**
 * Helper method to map SQL exceptions to HTTP status codes
 */
private Response.Status mapSqlExceptionToHttpStatus(SQLException e) {
    def sqlState = e.getSQLState()
    switch (sqlState) {
        case '23503': // Foreign key violation
            return Response.Status.CONFLICT
        case '23505': // Unique constraint violation
            return Response.Status.CONFLICT
        case '23502': // Not null violation
            return Response.Status.BAD_REQUEST
        default:
            return Response.Status.INTERNAL_SERVER_ERROR
    }
}

/**
 * Helper method to map SQL exceptions to user-friendly messages
 */
private String mapSqlExceptionToMessage(SQLException e) {
    def sqlState = e.getSQLState()
    def message = e.getMessage()
    
    switch (sqlState) {
        case '23503':
            if (message.contains('usr_id_owner')) {
                return "Invalid owner user ID - user does not exist"
            }
            return "Foreign key constraint violation - referenced resource does not exist"
            
        case '23505':
            if (message.contains('mig_name')) {
                return "A migration with this name already exists"
            }
            return "Unique constraint violation - duplicate value not allowed"
            
        case '23502':
            return "Required field is missing"
            
        default:
            log.warn("Unmapped SQL exception: ${sqlState} - ${message}", e)
            return "A database error occurred"
    }
}
