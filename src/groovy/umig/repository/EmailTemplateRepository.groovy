package umig.repository

import groovy.sql.Sql
import java.util.UUID

/**
 * EmailTemplateRepository - Data access layer for email templates
 * 
 * Handles CRUD operations for email templates used in notifications.
 * 
 * @author UMIG Project Team
 * @since 2025-01-16
 */
class EmailTemplateRepository {
    
    /**
     * Find active email template by type
     * 
     * @param sql Database connection
     * @param templateType Template type (STEP_OPENED, INSTRUCTION_COMPLETED, STEP_STATUS_CHANGED)
     * @return Template map or null if not found
     */
    static Map findActiveByType(Sql sql, String templateType) {
        try {
            def template = sql.firstRow("""
                SELECT emt_id, emt_type, emt_name, emt_subject, emt_body_html, emt_body_text,
                       emt_is_active, created_at, updated_at
                FROM email_templates_emt
                WHERE emt_type = ? AND emt_is_active = true
                ORDER BY updated_at DESC
                LIMIT 1
            """, [templateType])

            return template ? (template as Map) : null

        } catch (Exception e) {
            println "EmailTemplateRepository: Error finding template by type ${templateType} - ${e.message}"

            // US-058: Return fallback templates when database table doesn't exist
            if (e.message?.contains("does not exist") || e.message?.contains("email_templates_emt")) {
                println "EmailTemplateRepository: Using fallback template for ${templateType}"
                return getFallbackTemplate(templateType)
            }

            throw e
        }
    }

    /**
     * Get fallback template for development/testing when database table doesn't exist
     * US-058: Ensures emails can be sent even without database templates
     */
    private static Map getFallbackTemplate(String templateType) {
        switch (templateType) {
            case 'STEP_STATUS_CHANGED':
                return [
                    emt_type: 'STEP_STATUS_CHANGED',
                    emt_name: 'Fallback Step Status Changed',
                    emt_subject: '[UMIG] Step Status Changed: \${stepInstance?.sti_name ?: "Unknown Step"}',
                    emt_body_html: '''<html>
<body>
    <h2>Step Status Changed</h2>
    <p><strong>Step:</strong> \${stepInstance?.sti_name ?: "Unknown Step"}</p>
    <p><strong>Status:</strong> \${oldStatus ?: "Unknown"} → \${newStatus ?: "Unknown"}</p>
    <p><strong>Changed By:</strong> \${changedBy ?: "System"}</p>
    <p><strong>Changed At:</strong> \${changedAt ?: "Now"}</p>
    <p>This is an automated notification from UMIG.</p>
</body>
</html>''',
                    emt_is_active: true
                ]

            case 'STEP_OPENED':
                return [
                    emt_type: 'STEP_OPENED',
                    emt_name: 'Fallback Step Opened',
                    emt_subject: '[UMIG] Step Opened: \${stepInstance?.sti_name ?: "Unknown Step"}',
                    emt_body_html: '''<html>
<body>
    <h2>Step Opened</h2>
    <p><strong>Step:</strong> \${stepInstance?.sti_name ?: "Unknown Step"}</p>
    <p><strong>Opened By:</strong> \${openedBy ?: "System"}</p>
    <p><strong>Opened At:</strong> \${openedAt ?: "Now"}</p>
    <p>This is an automated notification from UMIG.</p>
</body>
</html>''',
                    emt_is_active: true
                ]

            case 'INSTRUCTION_COMPLETED':
                return [
                    emt_type: 'INSTRUCTION_COMPLETED',
                    emt_name: 'Fallback Instruction Completed',
                    emt_subject: '[UMIG] Instruction Completed',
                    emt_body_html: '''<html>
<body>
    <h2>Instruction Completed</h2>
    <p><strong>Instruction:</strong> \${instruction?.ini_name ?: "Unknown Instruction"}</p>
    <p><strong>Step:</strong> \${stepInstance?.sti_name ?: "Unknown Step"}</p>
    <p><strong>Completed By:</strong> \${completedBy ?: "System"}</p>
    <p><strong>Completed At:</strong> \${completedAt ?: "Now"}</p>
    <p>This is an automated notification from UMIG.</p>
</body>
</html>''',
                    emt_is_active: true
                ]

            default:
                return null
        }
    }
    
    /**
     * Find all email templates
     * 
     * @param sql Database connection
     * @param activeOnly If true, return only active templates
     * @return List of template maps
     */
    static List<Map> findAll(Sql sql, boolean activeOnly = false) {
        try {
            def query = """
                SELECT emt_id, emt_type, emt_name, emt_subject, emt_body_html, emt_body_text,
                       emt_is_active, created_at, updated_at
                FROM email_templates_emt
            """

            if (activeOnly) {
                query += " WHERE emt_is_active = true"
            }

            query += " ORDER BY emt_type, updated_at DESC"
            
            return sql.rows(query).collect { row -> row as Map }
            
        } catch (Exception e) {
            println "EmailTemplateRepository: Error finding all templates - ${e.message}"
            throw e
        }
    }
    
    /**
     * Create new email template
     * 
     * @param sql Database connection
     * @param templateData Template data map
     * @return Created template ID
     */
    static UUID create(Sql sql, Map templateData) {
        try {
            def templateId = UUID.randomUUID()
            
            sql.execute("""
                INSERT INTO email_templates_emt (
                    emt_id, emt_type, emt_name, emt_subject, emt_body_html, emt_body_text,
                    emt_is_active, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                templateId,
                templateData.emt_type,
                templateData.emt_name,
                templateData.emt_subject,
                templateData.emt_body_html,
                templateData.emt_body_text,
                templateData.emt_is_active ?: true,
                templateData.emt_created_by,
                templateData.emt_updated_by
            ])
            
            return templateId
            
        } catch (Exception e) {
            println "EmailTemplateRepository: Error creating template - ${e.message}"
            throw e
        }
    }
    
    /**
     * Update email template
     * 
     * @param sql Database connection
     * @param templateId Template ID
     * @param templateData Updated template data
     * @return True if updated successfully
     */
    static boolean update(Sql sql, UUID templateId, Map templateData) {
        try {
            def rowsUpdated = sql.executeUpdate("""
                UPDATE email_templates_emt SET
                    emt_type = ?,
                    emt_name = ?,
                    emt_subject = ?,
                    emt_body_html = ?,
                    emt_body_text = ?,
                    emt_is_active = ?,
                    updated_at = NOW(),
                    updated_by = ?
                WHERE emt_id = ?
            """, [
                templateData.emt_type,
                templateData.emt_name,
                templateData.emt_subject,
                templateData.emt_body_html,
                templateData.emt_body_text,
                templateData.emt_is_active,
                templateData.emt_updated_by,
                templateId
            ])
            
            return rowsUpdated > 0
            
        } catch (Exception e) {
            println "EmailTemplateRepository: Error updating template ${templateId} - ${e.message}"
            throw e
        }
    }
    
    /**
     * Deactivate email template
     * 
     * @param sql Database connection
     * @param templateId Template ID
     * @param updatedBy User who deactivated the template
     * @return True if deactivated successfully
     */
    static boolean deactivate(Sql sql, UUID templateId, String updatedBy) {
        try {
            def rowsUpdated = sql.executeUpdate("""
                UPDATE email_templates_emt SET
                    emt_is_active = false,
                    updated_at = NOW(),
                    updated_by = ?
                WHERE emt_id = ?
            """, [updatedBy, templateId])
            
            return rowsUpdated > 0
            
        } catch (Exception e) {
            println "EmailTemplateRepository: Error deactivating template ${templateId} - ${e.message}"
            throw e
        }
    }
    
    /**
     * Delete email template (hard delete)
     * 
     * @param sql Database connection
     * @param templateId Template ID
     * @return True if deleted successfully
     */
    static boolean delete(Sql sql, UUID templateId) {
        try {
            def rowsDeleted = sql.executeUpdate("""
                DELETE FROM email_templates_emt WHERE emt_id = ?
            """, [templateId])
            
            return rowsDeleted > 0
            
        } catch (Exception e) {
            println "EmailTemplateRepository: Error deleting template ${templateId} - ${e.message}"
            throw e
        }
    }
}