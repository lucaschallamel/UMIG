package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.LabelRepository
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import groovy.json.JsonException
import java.sql.SQLException
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

final LabelRepository labelRepository = new LabelRepository()

/**
 * Handles GET requests for Labels.
 * - GET /labels -> returns all labels with pagination
 * - GET /labels/{id} -> returns a single label with full details
 * - GET /labels?migrationId={uuid} -> returns labels involved in migration
 * - GET /labels?iterationId={uuid} -> returns labels involved in iteration
 * - GET /labels?planId={uuid} -> returns labels involved in plan
 * - GET /labels?sequenceId={uuid} -> returns labels involved in sequence
 * - GET /labels?phaseId={uuid} -> returns labels involved in phase
 */
labels(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    try {
        // GET /labels/{id}
        if (pathParts.size() == 1) {
            try {
                def labelId = Integer.parseInt(pathParts[0])
                def label = labelRepository.findLabelById(labelId)
                if (!label) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Label not found"]).toString())
                        .build()
                }
                return Response.ok(new JsonBuilder(label).toString()).build()
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid label ID format"]).toString())
                    .build()
            }
        }

        // GET /labels/{id}/steps
        if (pathParts.size() == 2 && pathParts[1] == 'steps') {
            try {
                def labelId = Integer.parseInt(pathParts[0])
                
                // First check if label exists
                def label = labelRepository.findLabelById(labelId)
                if (!label) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Label not found"]).toString())
                        .build()
                }
                
                // Get steps associated with this label
                def steps = DatabaseUtil.withSql { sql ->
                    sql.rows("""
                        SELECT 
                            s.stm_id,
                            s.stm_number as stm_step_number,
                            s.stm_name as stm_title,
                            s.stm_description,
                            s.stt_code,
                            st.stt_name
                        FROM steps_master_stm s
                        JOIN step_types_stt st ON s.stt_code = st.stt_code
                        JOIN labels_lbl_x_steps_master_stm lxs ON s.stm_id = lxs.stm_id
                        WHERE lxs.lbl_id = :labelId
                        ORDER BY s.stm_number
                    """, [labelId: labelId])
                }
                
                // Transform to frontend-friendly format
                def formattedSteps = steps.collect { step ->
                    [
                        stm_id: step.stm_id,
                        step_number: step.stm_step_number,
                        step_title: step.stm_title,
                        step_description: step.stm_description,
                        step_type: step.stt_code,
                        step_type_name: step.stt_name
                    ]
                }
                
                return Response.ok(new JsonBuilder(formattedSteps).toString()).build()
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid label ID format"]).toString())
                    .build()
            }
        }

            // GET /labels with query parameters for hierarchical filtering
            if (pathParts.empty) {
                def labels
                
                // Check for hierarchical filtering query parameters
                if (queryParams.getFirst('migrationId')) {
                    try {
                        def migrationId = UUID.fromString(queryParams.getFirst('migrationId') as String)
                        labels = labelRepository.findLabelsByMigrationId(migrationId)
                    } catch (IllegalArgumentException e) {
                        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid migration ID format"]).toString()).build()
                    }
                } else if (queryParams.getFirst('iterationId')) {
                    try {
                        def iterationId = UUID.fromString(queryParams.getFirst('iterationId') as String)
                        labels = labelRepository.findLabelsByIterationId(iterationId)
                    } catch (IllegalArgumentException e) {
                        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid iteration ID format"]).toString()).build()
                    }
                } else if (queryParams.getFirst('planId')) {
                    try {
                        def planId = UUID.fromString(queryParams.getFirst('planId') as String)
                        labels = labelRepository.findLabelsByPlanId(planId)
                    } catch (IllegalArgumentException e) {
                        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid plan ID format"]).toString()).build()
                    }
                } else if (queryParams.getFirst('sequenceId')) {
                    try {
                        def sequenceId = UUID.fromString(queryParams.getFirst('sequenceId') as String)
                        labels = labelRepository.findLabelsBySequenceId(sequenceId)
                    } catch (IllegalArgumentException e) {
                        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid sequence ID format"]).toString()).build()
                    }
                } else if (queryParams.getFirst('phaseId')) {
                    try {
                        def phaseId = UUID.fromString(queryParams.getFirst('phaseId') as String)
                        labels = labelRepository.findLabelsByPhaseId(phaseId)
                    } catch (IllegalArgumentException e) {
                        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid phase ID format"]).toString()).build()
                    }
                } else {
                    // Check for pagination parameters
                    def page = queryParams.getFirst('page')
                    def size = queryParams.getFirst('size')
                    def search = queryParams.getFirst('search')
                    def sort = queryParams.getFirst('sort')
                    def direction = queryParams.getFirst('direction')
                    
                    // If pagination parameters exist, use paginated endpoint
                    if (page || size || search || sort || direction) {
                        // Parse pagination parameters with defaults
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
                                if (pageSize < 1) pageSize = 50
                                if (pageSize > 200) pageSize = 200  // Maximum page size
                            } catch (NumberFormatException e) {
                                return Response.status(Response.Status.BAD_REQUEST)
                                    .entity(new JsonBuilder([error: "Invalid page size format"]).toString())
                                    .build()
                            }
                        }
                        
                        // Parse sort parameters
                        String sortField = 'lbl_id'  // Default sort field
                        String sortDirection = 'asc'
                        
                        if (sort && ['lbl_id', 'lbl_name', 'lbl_description', 'lbl_color', 'mig_name', 'application_count', 'step_count', 'created_at'].contains(sort as String)) {
                            sortField = sort as String
                        }
                        
                        if (direction && ['asc', 'desc'].contains((direction as String).toLowerCase())) {
                            sortDirection = (direction as String).toLowerCase()
                        }
                        
                        // Validate search term
                        String searchTerm = search as String
                        if (searchTerm && searchTerm.trim().length() < 2) {
                            searchTerm = null  // Ignore very short search terms
                        }
                        
                        // Get paginated labels
                        def result = labelRepository.findAllLabelsWithPagination(pageNumber, pageSize, searchTerm, sortField, sortDirection)
                        return Response.ok(new JsonBuilder(result).toString()).build()
                    } else {
                        // Default: return all labels without pagination
                        labels = labelRepository.findAllLabels()
                        return Response.ok(new JsonBuilder(labels).toString()).build()
                    }
                }
                
                return Response.ok(new JsonBuilder(labels).toString()).build()
            }

            // Fallback for invalid paths
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid path."]).toString()).build()

    } catch (SQLException e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred: ${e.message}"]).toString())
            .build()
    }
}

/**
 * Handles POST requests for Labels.
 * - POST /labels -> creates a new label
 * - POST /labels/{id}/applications/{appId} -> add application association
 * - POST /labels/{id}/steps/{stepId} -> add step association
 */
labels(httpMethod: "POST", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    try {
        // POST /labels/{id}/applications/{appId}
        if (pathParts.size() == 3 && pathParts[1] == 'applications') {
            def labelId
            def applicationId
            try {
                labelId = Integer.parseInt(pathParts[0])
                applicationId = Integer.parseInt(pathParts[2])
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid ID format"]).toString())
                    .build()
            }

            // Check if label exists
            def label = labelRepository.findLabelById(labelId)
            if (!label) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Label not found"]).toString())
                    .build()
            }

            // Add association
            try {
                DatabaseUtil.withSql { sql ->
                    sql.executeInsert("""
                        INSERT INTO labels_lbl_x_applications_app (lbl_id, app_id)
                        VALUES (:labelId, :applicationId)
                    """, [labelId: labelId, applicationId: applicationId])
                }
                
                return Response.ok(new JsonBuilder([message: "Application associated successfully"]).toString()).build()
            } catch (SQLException e) {
                if (e.getSQLState() == "23505") { // Unique constraint violation
                    return Response.status(Response.Status.CONFLICT)
                        .entity(new JsonBuilder([error: "Application already associated with this label"]).toString())
                        .build()
                } else if (e.getSQLState() == "23503") { // Foreign key violation
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid application ID"]).toString())
                        .build()
                }
                throw e
            }
        }
        
        // POST /labels/{id}/steps/{stepId}
        if (pathParts.size() == 3 && pathParts[1] == 'steps') {
            def labelId
            def stepId
            try {
                labelId = Integer.parseInt(pathParts[0])
                stepId = UUID.fromString(pathParts[2])
            } catch (Exception e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid ID format"]).toString())
                    .build()
            }

            // Check if label exists
            def label = labelRepository.findLabelById(labelId)
            if (!label) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Label not found"]).toString())
                    .build()
            }

            // Add association
            try {
                DatabaseUtil.withSql { sql ->
                    sql.executeInsert("""
                        INSERT INTO labels_lbl_x_steps_master_stm (lbl_id, stm_id)
                        VALUES (:labelId, :stepId)
                    """, [labelId: labelId, stepId: stepId])
                }
                
                return Response.ok(new JsonBuilder([message: "Step associated successfully"]).toString()).build()
            } catch (SQLException e) {
                if (e.getSQLState() == "23505") { // Unique constraint violation
                    return Response.status(Response.Status.CONFLICT)
                        .entity(new JsonBuilder([error: "Step already associated with this label"]).toString())
                        .build()
                } else if (e.getSQLState() == "23503") { // Foreign key violation
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid step ID"]).toString())
                        .build()
                }
                throw e
            }
        }

        // POST /labels - create new label
        if (pathParts.empty) {
            def payload
            try {
                payload = new JsonSlurper().parseText(body) as Map
            } catch (JsonException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid JSON payload"]).toString())
                    .build()
            }

            // Validate required fields
            if (!payload.lbl_name || !payload.lbl_color || !payload.mig_id) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing required fields: lbl_name, lbl_color, and mig_id are required"]).toString())
                    .build()
            }

            // Validate mig_id format
            UUID migrationId
            try {
                migrationId = UUID.fromString(payload.mig_id as String)
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid migration ID format"]).toString())
                    .build()
            }

            // Get current user ID (in a real implementation, this would come from the session)
            // For now, we'll use a placeholder
            def currentUserId = 1 // TODO: Get from session/authentication context

            def labelData = [
                lbl_name: payload.lbl_name,
                lbl_description: payload.lbl_description ?: '',
                lbl_color: payload.lbl_color,
                mig_id: migrationId,
                created_by: currentUserId
            ]

            try {
                def createdLabel = labelRepository.createLabel(labelData)
                return Response.status(Response.Status.CREATED)
                    .entity(new JsonBuilder(createdLabel).toString())
                    .build()
            } catch (SQLException e) {
                if (e.getSQLState() == "23505") {
                    return Response.status(Response.Status.CONFLICT)
                        .entity(new JsonBuilder([error: "A label with this name already exists in this migration"]).toString())
                        .build()
                }
                if (e.getSQLState() == "23503") {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid migration ID: migration does not exist"]).toString())
                        .build()
                }
                throw e
            }
        }

        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid path"]).toString())
            .build()

    } catch (SQLException e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred: ${e.message}"]).toString())
            .build()
    }
}

/**
 * Handles PUT requests for Labels.
 * - PUT /labels/{id} -> updates an existing label
 */
labels(httpMethod: "PUT", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    try {
        // PUT /labels/{id}
        if (pathParts.size() == 1) {
            def labelId
            try {
                labelId = Integer.parseInt(pathParts[0])
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid label ID format"]).toString())
                    .build()
            }

            def payload
            try {
                payload = new JsonSlurper().parseText(body) as Map
            } catch (JsonException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid JSON payload"]).toString())
                    .build()
            }

            // Validate required fields
            if (!payload.lbl_name || !payload.lbl_color) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing required fields: lbl_name and lbl_color are required"]).toString())
                    .build()
            }

            // Check if label exists
            def existingLabel = labelRepository.findLabelById(labelId)
            if (!existingLabel) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Label not found"]).toString())
                    .build()
            }

            def updates = [
                lbl_name: payload.lbl_name,
                lbl_description: payload.lbl_description ?: '',
                lbl_color: payload.lbl_color
            ]
            
            // Add migration ID if provided and different from current
            if (payload.mig_id && payload.mig_id != existingLabel.mig_id.toString()) {
                try {
                    updates.mig_id = UUID.fromString(payload.mig_id as String)
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid migration ID format"]).toString())
                        .build()
                }
            }

            try {
                def updatedLabel = labelRepository.updateLabel(labelId, updates)
                return Response.ok(new JsonBuilder(updatedLabel).toString()).build()
            } catch (SQLException e) {
                if (e.getSQLState() == "23505") {
                    return Response.status(Response.Status.CONFLICT)
                        .entity(new JsonBuilder([error: "A label with this name already exists in this migration"]).toString())
                        .build()
                }
                throw e
            }
        }

        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid path"]).toString())
            .build()

    } catch (SQLException e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred: ${e.message}"]).toString())
            .build()
    }
}

/**
 * Handles DELETE requests for Labels.
 * - DELETE /labels/{id} -> deletes a label
 * - DELETE /labels/{id}/applications/{appId} -> remove application association
 * - DELETE /labels/{id}/steps/{stepId} -> remove step association
 */
labels(httpMethod: "DELETE", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    try {
        // DELETE /labels/{id}/applications/{appId}
        if (pathParts.size() == 3 && pathParts[1] == 'applications') {
            def labelId
            def applicationId
            try {
                labelId = Integer.parseInt(pathParts[0])
                applicationId = Integer.parseInt(pathParts[2])
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid ID format"]).toString())
                    .build()
            }

            // Remove association
            def rowsDeleted = DatabaseUtil.withSql { sql ->
                sql.executeUpdate("""
                    DELETE FROM labels_lbl_x_applications_app
                    WHERE lbl_id = :labelId AND app_id = :applicationId
                """, [labelId: labelId, applicationId: applicationId])
            }

            if (rowsDeleted > 0) {
                return Response.ok(new JsonBuilder([message: "Application association removed successfully"]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Association not found"]).toString())
                    .build()
            }
        }
        
        // DELETE /labels/{id}/steps/{stepId}
        if (pathParts.size() == 3 && pathParts[1] == 'steps') {
            def labelId
            def stepId
            try {
                labelId = Integer.parseInt(pathParts[0])
                stepId = UUID.fromString(pathParts[2])
            } catch (Exception e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid ID format"]).toString())
                    .build()
            }

            // Remove association
            def rowsDeleted = DatabaseUtil.withSql { sql ->
                sql.executeUpdate("""
                    DELETE FROM labels_lbl_x_steps_master_stm
                    WHERE lbl_id = :labelId AND stm_id = :stepId
                """, [labelId: labelId, stepId: stepId])
            }

            if (rowsDeleted > 0) {
                return Response.ok(new JsonBuilder([message: "Step association removed successfully"]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Association not found"]).toString())
                    .build()
            }
        }

        // DELETE /labels/{id}
        if (pathParts.size() == 1) {
            def labelId
            try {
                labelId = Integer.parseInt(pathParts[0])
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid label ID format"]).toString())
                    .build()
            }

            // Check for blocking relationships
            def blockingRelationships = labelRepository.getLabelBlockingRelationships(labelId)
            if (!blockingRelationships.isEmpty()) {
                def message = "Cannot delete label. It has existing relationships: "
                def parts = []
                if (blockingRelationships.containsKey('applications')) {
                    def appList = blockingRelationships.applications as List
                    parts.add("${appList.size()} application(s)")
                }
                if (blockingRelationships.containsKey('steps')) {
                    def stepInfo = blockingRelationships.steps as Map
                    parts.add("${stepInfo.count} step(s)")
                }
                message += parts.join(", ")
                
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([
                        error: message,
                        relationships: blockingRelationships
                    ]).toString())
                    .build()
            }

            def deleted = labelRepository.deleteLabel(labelId)
            if (deleted) {
                return Response.noContent().build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Label not found"]).toString())
                    .build()
            }
        }

        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid path"]).toString())
            .build()

    } catch (SQLException e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred: ${e.message}"]).toString())
            .build()
    }
}