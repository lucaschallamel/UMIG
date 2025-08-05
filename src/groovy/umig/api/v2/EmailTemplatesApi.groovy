package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

import umig.repository.EmailTemplateRepository
import umig.utils.DatabaseUtil

@BaseScript CustomEndpointDelegate delegate

// Field declarations for endpoint configuration
@Field String ENDPOINT_NAME = "emailTemplates"

/**
 * EmailTemplatesApi - REST endpoints for email template management
 * 
 * Provides CRUD operations for email templates used in the UMIG notification system.
 * Follows ADR-023 (Standardized REST API Patterns) and ADR-032 (Email Notification Architecture).
 * 
 * Available endpoints:
 * - GET    /emailTemplates           - List all templates
 * - GET    /emailTemplates/{id}      - Get specific template
 * - POST   /emailTemplates           - Create new template
 * - PUT    /emailTemplates/{id}      - Update template
 * - DELETE /emailTemplates/{id}      - Delete template
 * 
 * @author UMIG Project Team
 * @since 2025-01-16
 */

// GET /emailTemplates - List all email templates
emailTemplates(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body ->
    try {
        def activeOnly = queryParams.getFirst("activeOnly")?.asBoolean() ?: false
        
        def templates = DatabaseUtil.withSql { sql ->
            EmailTemplateRepository.findAll(sql, activeOnly as Boolean)
        }
        
        def response = [
            data: templates,
            total: (templates as List).size()
        ]
        
        return Response.ok(new JsonBuilder(response).toString()).build()
        
    } catch (Exception e) {
        log.error("EmailTemplatesApi: Error listing templates", e)
        def error = [error: "Failed to retrieve email templates: ${e.message}"]
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder(error).toString())
            .build()
    }
}

// GET /emailTemplates/{id} - Get specific email template
emailTemplates(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def templateId = getTemplateIdFromPath(request)
    
    if (!templateId) {
        def error = [error: "Template ID is required"]
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder(error).toString())
            .build()
    }
    
    try {
        def template = DatabaseUtil.withSql { sql ->
            sql.firstRow("""
                SELECT emt_id, emt_type, emt_name, emt_subject, emt_body_html, emt_body_text,
                       emt_is_active, emt_created_date, emt_updated_date, emt_created_by, emt_updated_by
                FROM email_templates_emt 
                WHERE emt_id = ?
            """, [UUID.fromString(templateId)])
        }
        
        if (!template) {
            def error = [error: "Email template not found"]
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder(error).toString())
                .build()
        }
        
        return Response.ok(new JsonBuilder(template).toString()).build()
        
    } catch (Exception e) {
        log.error("EmailTemplatesApi: Error retrieving template ${templateId}", e)
        def error = [error: "Failed to retrieve email template: ${e.message}"]
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder(error).toString())
            .build()
    }
}

// POST /emailTemplates - Create new email template
emailTemplates(httpMethod: "POST", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body ->
    try {
        def json = new JsonSlurper().parseText(body)
        
        // Validate required fields
        def requiredFields = ['emt_type', 'emt_name', 'emt_subject', 'emt_body_html']
        def missingFields = requiredFields.findAll { !json[it] }
        
        if (missingFields) {
            def error = [error: "Missing required fields: ${missingFields.join(', ')}"]
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder(error).toString())
                .build()
        }
        
        // Validate template type
        def validTypes = ['STEP_OPENED', 'INSTRUCTION_COMPLETED', 'STEP_STATUS_CHANGED', 'CUSTOM']
        if (!validTypes.contains(json['emt_type'])) {
            def error = [error: "Invalid template type. Must be one of: ${validTypes.join(', ')}"]
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder(error).toString())
                .build()
        }
        
        def currentUser = getCurrentUser()?['username'] ?: 'system'
        
        def templateData = [
            emt_type: json['emt_type'],
            emt_name: json['emt_name'],
            emt_subject: json['emt_subject'],
            emt_body_html: json['emt_body_html'],
            emt_body_text: json['emt_body_text'] ?: '',
            emt_is_active: json['emt_is_active'] != false,  // Default to true
            emt_created_by: currentUser,
            emt_updated_by: currentUser
        ]
        
        def templateId = DatabaseUtil.withSql { sql ->
            EmailTemplateRepository.create(sql, templateData)
        }
        
        // Retrieve the created template
        def createdTemplate = DatabaseUtil.withSql { sql ->
            sql.firstRow("""
                SELECT emt_id, emt_type, emt_name, emt_subject, emt_body_html, emt_body_text,
                       emt_is_active, emt_created_date, emt_updated_date, emt_created_by, emt_updated_by
                FROM email_templates_emt 
                WHERE emt_id = ?
            """, [templateId])
        }
        
        return Response.status(Response.Status.CREATED)
            .entity(new JsonBuilder(createdTemplate).toString())
            .build()
        
    } catch (Exception e) {
        log.error("EmailTemplatesApi: Error creating template", e)
        
        // Check for unique constraint violation
        if (e.message?.contains('duplicate key value violates unique constraint')) {
            def error = [error: "A template with this name already exists"]
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder(error).toString())
                .build()
        }
        
        def error = [error: "Failed to create email template: ${e.message}"]
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder(error).toString())
            .build()
    }
}

// PUT /emailTemplates/{id} - Update email template
emailTemplates(httpMethod: "PUT", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def templateId = getTemplateIdFromPath(request)
    
    if (!templateId) {
        def error = [error: "Template ID is required"]
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder(error).toString())
            .build()
    }
    
    try {
        def json = new JsonSlurper().parseText(body)
        def currentUser = getCurrentUser()?['username'] ?: 'system'
        
        // Check if template exists
        def existingTemplate = DatabaseUtil.withSql { sql ->
            sql.firstRow("SELECT emt_id FROM email_templates_emt WHERE emt_id = ?", [UUID.fromString(templateId)])
        }
        
        if (!existingTemplate) {
            def error = [error: "Email template not found"]
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder(error).toString())
                .build()
        }
        
        // Validate template type if provided
        if (json['emt_type']) {
            def validTypes = ['STEP_OPENED', 'INSTRUCTION_COMPLETED', 'STEP_STATUS_CHANGED', 'CUSTOM']
            if (!validTypes.contains(json['emt_type'])) {
                def error = [error: "Invalid template type. Must be one of: ${validTypes.join(', ')}"]
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder(error).toString())
                    .build()
            }
        }
        
        def templateData = [
            emt_type: json['emt_type'],
            emt_name: json['emt_name'],
            emt_subject: json['emt_subject'],
            emt_body_html: json['emt_body_html'],
            emt_body_text: json['emt_body_text'],
            emt_is_active: json['emt_is_active'],
            emt_updated_by: currentUser
        ]
        
        // Remove null values to support partial updates
        templateData = templateData.findAll { it.value != null }
        
        def updated = DatabaseUtil.withSql { sql ->
            EmailTemplateRepository.update(sql, UUID.fromString(templateId), templateData)
        }
        
        if (!updated) {
            def error = [error: "Failed to update email template"]
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder(error).toString())
                .build()
        }
        
        // Retrieve the updated template
        def updatedTemplate = DatabaseUtil.withSql { sql ->
            sql.firstRow("""
                SELECT emt_id, emt_type, emt_name, emt_subject, emt_body_html, emt_body_text,
                       emt_is_active, emt_created_date, emt_updated_date, emt_created_by, emt_updated_by
                FROM email_templates_emt 
                WHERE emt_id = ?
            """, [UUID.fromString(templateId)])
        }
        
        return Response.ok(new JsonBuilder(updatedTemplate).toString()).build()
        
    } catch (Exception e) {
        log.error("EmailTemplatesApi: Error updating template ${templateId}", e)
        
        // Check for unique constraint violation
        if (e.message?.contains('duplicate key value violates unique constraint')) {
            def error = [error: "A template with this name already exists"]
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder(error).toString())
                .build()
        }
        
        def error = [error: "Failed to update email template: ${e.message}"]
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder(error).toString())
            .build()
    }
}

// DELETE /emailTemplates/{id} - Delete email template
emailTemplates(httpMethod: "DELETE", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def templateId = getTemplateIdFromPath(request)
    
    if (!templateId) {
        def error = [error: "Template ID is required"]
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder(error).toString())
            .build()
    }
    
    try {
        def deleted = DatabaseUtil.withSql { sql ->
            EmailTemplateRepository.delete(sql, UUID.fromString(templateId))
        }
        
        if (!deleted) {
            def error = [error: "Email template not found"]
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder(error).toString())
                .build()
        }
        
        return Response.noContent().build()
        
    } catch (Exception e) {
        log.error("EmailTemplatesApi: Error deleting template ${templateId}", e)
        def error = [error: "Failed to delete email template: ${e.message}"]
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder(error).toString())
            .build()
    }
}

// Helper method to extract template ID from request path
private String getTemplateIdFromPath(HttpServletRequest request) {
    def path = getAdditionalPath(request)
    return path ? path.tokenize('/').first() : null
}

// Helper method to get current user
private def getCurrentUser() {
    try {
        return com.atlassian.confluence.user.AuthenticatedUserThreadLocal.get()
    } catch (Exception e) {
        log.warn("EmailTemplatesApi: Could not get current user", e)
        return null
    }
}