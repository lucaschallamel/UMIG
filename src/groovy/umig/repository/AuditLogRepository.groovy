package umig.repository

import groovy.sql.Sql
import groovy.json.JsonOutput
import java.util.UUID

/**
 * AuditLogRepository - Data access layer for audit logging
 * 
 * Handles audit trail logging for email notifications and other system events.
 * 
 * @author UMIG Project Team
 * @since 2025-01-16
 */
class AuditLogRepository {
    
    /**
     * Log successful email sending
     * 
     * @param sql Database connection
     * @param userId User who triggered the email (nullable)
     * @param entityId Entity ID related to the email
     * @param recipients List of email recipients
     * @param subject Email subject
     * @param templateId Email template used
     * @param additionalData Additional context data
     */
    static void logEmailSent(Sql sql, Integer userId, UUID entityId, List<String> recipients, 
                            String subject, UUID templateId, Map additionalData = [:]) {
        try {
            def details = [
                recipients: recipients,
                subject: subject,
                template_id: templateId?.toString(),
                status: 'SENT'
            ] + additionalData
            
            sql.execute("""
                INSERT INTO audit_log_aud (
                    usr_id, aud_entity_id, aud_entity_type, aud_action, aud_details
                ) VALUES (?, ?, ?, ?, ?::jsonb)
            """, [
                userId,
                entityId,
                'STEP_INSTANCE',
                'EMAIL_SENT',
                JsonOutput.toJson(details)
            ])
            
        } catch (Exception e) {
            println "AuditLogRepository: Error logging email sent - ${e.message}"
            // Don't throw - audit logging failure shouldn't break the main flow
        }
    }
    
    /**
     * Log failed email sending
     * 
     * @param sql Database connection
     * @param userId User who triggered the email (nullable)
     * @param entityId Entity ID related to the email
     * @param recipients List of intended email recipients
     * @param subject Email subject
     * @param errorMessage Error message
     */
    static void logEmailFailed(Sql sql, Integer userId, UUID entityId, List<String> recipients, 
                              String subject, String errorMessage) {
        try {
            def details = [
                recipients: recipients,
                subject: subject,
                status: 'FAILED',
                error_message: errorMessage
            ]
            
            sql.execute("""
                INSERT INTO audit_log_aud (
                    usr_id, aud_entity_id, aud_entity_type, aud_action, aud_details
                ) VALUES (?, ?, ?, ?, ?::jsonb)
            """, [
                userId,
                entityId,
                'STEP_INSTANCE',
                'EMAIL_FAILED',
                JsonOutput.toJson(details)
            ])
            
        } catch (Exception e) {
            println "AuditLogRepository: Error logging email failure - ${e.message}"
            // Don't throw - audit logging failure shouldn't break the main flow
        }
    }
    
    /**
     * Log step status change
     * 
     * @param sql Database connection
     * @param userId User who changed the status
     * @param stepInstanceId Step instance ID
     * @param oldStatus Previous status
     * @param newStatus New status
     */
    static void logStepStatusChange(Sql sql, Integer userId, UUID stepInstanceId, 
                                   String oldStatus, String newStatus) {
        try {
            def details = [
                old_status: oldStatus,
                new_status: newStatus,
                change_timestamp: new Date().format('yyyy-MM-dd HH:mm:ss')
            ]
            
            sql.execute("""
                INSERT INTO audit_log_aud (
                    usr_id, aud_entity_id, aud_entity_type, aud_action, aud_details
                ) VALUES (?, ?, ?, ?, ?::jsonb)
            """, [
                userId,
                stepInstanceId,
                'STEP_INSTANCE',
                'STATUS_CHANGED',
                JsonOutput.toJson(details)
            ])
            
        } catch (Exception e) {
            println "AuditLogRepository: Error logging step status change - ${e.message}"
            // Don't throw - audit logging failure shouldn't break the main flow
        }
    }
    
    /**
     * Log instruction completion
     * 
     * @param sql Database connection
     * @param userId User who completed the instruction
     * @param instructionInstanceId Instruction instance ID
     * @param stepInstanceId Related step instance ID
     */
    static void logInstructionCompleted(Sql sql, Integer userId, UUID instructionInstanceId, UUID stepInstanceId) {
        try {
            def details = [
                step_instance_id: stepInstanceId.toString(),
                completion_timestamp: new Date().format('yyyy-MM-dd HH:mm:ss')
            ]
            
            sql.execute("""
                INSERT INTO audit_log_aud (
                    usr_id, aud_entity_id, aud_entity_type, aud_action, aud_details
                ) VALUES (?, ?, ?, ?, ?::jsonb)
            """, [
                userId,
                instructionInstanceId,
                'INSTRUCTION_INSTANCE',
                'COMPLETED',
                JsonOutput.toJson(details)
            ])
            
        } catch (Exception e) {
            println "AuditLogRepository: Error logging instruction completion - ${e.message}"
            // Don't throw - audit logging failure shouldn't break the main flow
        }
    }
    
    /**
     * Get recent audit log entries
     * 
     * @param sql Database connection
     * @param limit Number of entries to return
     * @param entityType Filter by entity type (optional)
     * @param action Filter by action (optional)
     * @return List of audit log entries
     */
    static List<Map> getRecentEntries(Sql sql, int limit = 50, String entityType = null, String action = null) {
        try {
            def query = """
                SELECT aud_id, aud_user_id, aud_entity_id, aud_entity_type, aud_action,
                       aud_details, aud_timestamp, aud_email_recipients, aud_email_subject,
                       aud_email_status, aud_email_error_message
                FROM audit_log_aud
            """
            
            def params = []
            def conditions = []
            
            if (entityType) {
                conditions.add("aud_entity_type = ?")
                params.add(entityType)
            }
            
            if (action) {
                conditions.add("aud_action = ?")
                params.add(action)
            }
            
            if (conditions) {
                query += " WHERE " + conditions.join(" AND ")
            }
            
            query += " ORDER BY aud_timestamp DESC LIMIT ?"
            params.add(limit)
            
            return sql.rows(query, params).collect { row -> row as Map }
            
        } catch (Exception e) {
            println "AuditLogRepository: Error getting recent entries - ${e.message}"
            throw e
        }
    }
    
    /**
     * Get email statistics
     * 
     * @param sql Database connection
     * @param days Number of days to look back
     * @return Map with email statistics
     */
    static Map getEmailStatistics(Sql sql, int days = 7) {
        try {
            def stats = sql.firstRow("""
                SELECT 
                    COUNT(*) FILTER (WHERE aud_email_status = 'SENT') as emails_sent,
                    COUNT(*) FILTER (WHERE aud_email_status = 'FAILED') as emails_failed,
                    COUNT(DISTINCT aud_user_id) as unique_users,
                    COUNT(DISTINCT aud_entity_id) as unique_entities
                FROM audit_log_aud
                WHERE aud_action IN ('EMAIL_SENT', 'EMAIL_FAILED')
                AND aud_timestamp >= NOW() - INTERVAL '${days} days'
            """)
            
            return stats ? (stats as Map) : [
                emails_sent: 0,
                emails_failed: 0,
                unique_users: 0,
                unique_entities: 0
            ]
            
        } catch (Exception e) {
            println "AuditLogRepository: Error getting email statistics - ${e.message}"
            throw e
        }
    }
}