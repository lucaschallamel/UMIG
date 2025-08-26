package umig.utils

import groovy.json.JsonBuilder
import groovy.sql.Sql
import java.util.Date
import java.util.UUID

// Confluence mail imports
import com.atlassian.confluence.mail.ConfluenceMailServerManager
import com.atlassian.mail.Email
import com.atlassian.mail.server.SMTPMailServer
import com.atlassian.sal.api.component.ComponentLocator

// JavaMail imports for MailHog
import javax.mail.*
import javax.mail.internet.*
import java.util.Properties
import java.net.Socket

// Repository imports
import umig.repository.AuditLogRepository
import umig.utils.DatabaseUtil

/**
 * EmailService - Single responsibility email delivery service
 * 
 * This service consolidates all email delivery functionality from the original
 * fragmented services. It provides multiple transport mechanisms while maintaining
 * a clean, testable interface.
 * 
 * Key Features:
 * - Single responsibility: only handles email transport
 * - Multiple transport mechanisms (Confluence SMTP, MailHog, Mock)
 * - Comprehensive error handling and retry logic
 * - Circuit breaker pattern for external services
 * - Rate limiting to prevent spam
 * - Audit logging integration
 * 
 * Replaces functionality from:
 * - Original EmailService.groovy (SMTP methods)
 * - EnhancedEmailService.groovy (sendEmail methods) 
 * - EnhancedEmailNotificationService.groovy (transport logic)
 * - StepNotificationIntegration.groovy (email sending)
 * 
 * @author UMIG Project Team
 * @since 2025-08-26 (Email Service Consolidation)
 */
class EmailService {
    
    // Configuration constants
    private static final String DEFAULT_FROM_ADDRESS = 'umig-system@company.com'
    private static final int MAX_RETRY_ATTEMPTS = 3
    private static final int RATE_LIMIT_PER_MINUTE = 60
    private static final long CIRCUIT_BREAKER_TIMEOUT = 30000 // 30 seconds
    
    // State management for circuit breaker and rate limiting
    private static volatile long lastCircuitBreakerFailure = 0
    private static volatile int currentMinuteEmailCount = 0
    private static volatile long currentMinuteStart = 0
    
    /**
     * Send email to multiple recipients with proper TO/CC/BCC configuration
     * 
     * This is the primary email sending method that all other services should use.
     * It handles all transport mechanisms and error scenarios.
     * 
     * @param toRecipients List of primary recipients (TO)
     * @param ccRecipients List of carbon copy recipients (CC) - optional
     * @param bccRecipients List of blind carbon copy recipients (BCC) - optional
     * @param subject Email subject line
     * @param htmlContent HTML email body content
     * @param auditContext Optional context for audit logging
     * @return EmailResult with success status and details
     */
    static EmailResult sendEmail(List<String> toRecipients, List<String> ccRecipients = null, 
                                List<String> bccRecipients = null, String subject, String htmlContent,
                                Map auditContext = [:]) {
        try {
            // Validate inputs
            def validationResult = validateEmailInputs(toRecipients, ccRecipients, bccRecipients, subject, htmlContent)
            if (!validationResult.valid) {
                return new EmailResult(success: false, error: validationResult.error)
            }
            
            // Check rate limits
            if (!checkRateLimit()) {
                return new EmailResult(success: false, error: "Rate limit exceeded")
            }
            
            // Check circuit breaker
            if (!checkCircuitBreaker()) {
                return new EmailResult(success: false, error: "Email service temporarily unavailable")
            }
            
            // Attempt to send email
            EmailResult result = attemptEmailSend(validationResult.cleanedRecipients as Map, subject, htmlContent)
            
            // Update circuit breaker state
            if (result.success) {
                resetCircuitBreaker()
            } else {
                recordCircuitBreakerFailure()
            }
            
            // Log audit information
            if (auditContext && result.success) {
                logEmailSent(auditContext, result)
            }
            
            return result
            
        } catch (Exception e) {
            println "EmailService: Unexpected error sending email: ${e.message}"
            e.printStackTrace()
            recordCircuitBreakerFailure()
            return new EmailResult(success: false, error: "Unexpected error: ${e.message}")
        }
    }
    
    /**
     * Simplified email sending for backward compatibility
     * Maintains compatibility with existing EmailService.sendEmail() calls
     */
    static boolean sendEmail(List<String> recipients, String subject, String body) {
        def result = sendEmail(recipients, null, null, subject, body)
        return result.success
    }
    
    /**
     * Send email with CC and BCC for backward compatibility
     * Maintains compatibility with existing EmailService.sendEmailWithCCAndBCC() calls
     */
    static boolean sendEmailWithCCAndBCC(String to, String cc, String bcc, 
                                        String subject, String htmlBody, boolean isHtml = true) {
        try {
            // Parse recipients
            def toRecipients = parseRecipientString(to)
            def ccRecipients = parseRecipientString(cc)
            def bccRecipients = parseRecipientString(bcc)
            
            def result = sendEmail(toRecipients, ccRecipients, bccRecipients, subject, htmlBody)
            return result.success
            
        } catch (Exception e) {
            println "EmailService: Error in sendEmailWithCCAndBCC: ${e.message}"
            return false
        }
    }
    
    /**
     * Health check for monitoring email service status
     */
    static Map healthCheck() {
        try {
            def isCircuitBreakerOpen = !checkCircuitBreaker()
            def rateLimitStatus = getRateLimitStatus()
            
            // Test email configuration
            def configStatus = testEmailConfiguration()
            
            return [
                service: 'EmailService',
                status: configStatus.healthy ? 'healthy' : 'degraded',
                circuitBreaker: [
                    open: isCircuitBreakerOpen,
                    lastFailure: new Date(lastCircuitBreakerFailure)
                ],
                rateLimit: rateLimitStatus,
                configuration: configStatus,
                capabilities: [
                    confluenceSmtp: configStatus.confluenceAvailable,
                    mailhogFallback: isLocalDevelopment(),
                    auditLogging: true,
                    rateLimiting: true,
                    circuitBreaker: true
                ],
                timestamp: new Date()
            ]
        } catch (Exception e) {
            return [
                service: 'EmailService',
                status: 'error',
                error: e.message,
                timestamp: new Date()
            ]
        }
    }
    
    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================
    
    /**
     * Validate and clean email inputs
     */
    private static Map validateEmailInputs(List<String> toRecipients, List<String> ccRecipients, 
                                          List<String> bccRecipients, String subject, String htmlContent) {
        def cleanTo = cleanRecipientList(toRecipients)
        def cleanCc = cleanRecipientList(ccRecipients)
        def cleanBcc = cleanRecipientList(bccRecipients)
        
        if (!cleanTo && !cleanCc && !cleanBcc) {
            return [valid: false, error: "No valid recipients provided"]
        }
        
        if (!subject || subject.trim().isEmpty()) {
            return [valid: false, error: "Subject is required"]
        }
        
        if (!htmlContent || htmlContent.trim().isEmpty()) {
            return [valid: false, error: "Email content is required"]
        }
        
        return [
            valid: true,
            cleanedRecipients: [
                to: cleanTo,
                cc: cleanCc,
                bcc: cleanBcc
            ]
        ]
    }
    
    /**
     * Clean and validate recipient list
     */
    private static List<String> cleanRecipientList(List<String> recipients) {
        if (!recipients) return []
        
        return recipients.findAll { recipient ->
            recipient && recipient.trim() && isValidEmailAddress(recipient.trim())
        }.collect { it.trim() }
    }
    
    /**
     * Basic email address validation
     */
    private static boolean isValidEmailAddress(String email) {
        return email.matches(/^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})$/)
    }
    
    /**
     * Parse comma-separated recipient string
     */
    private static List<String> parseRecipientString(String recipients) {
        if (!recipients) return []
        return recipients.split(',').collect { it.trim() }.findAll { it }
    }
    
    /**
     * Check rate limiting
     */
    private static boolean checkRateLimit() {
        long currentTime = System.currentTimeMillis()
        long currentMinute = (currentTime / 60000L) as long
        
        synchronized (EmailService.class) {
            long trackedMinute = (currentMinuteStart / 60000L) as long
            
            if (currentMinute != trackedMinute) {
                // New minute, reset counter
                currentMinuteStart = currentTime
                currentMinuteEmailCount = 0
            }
            
            if (currentMinuteEmailCount >= RATE_LIMIT_PER_MINUTE) {
                return false
            }
            
            currentMinuteEmailCount++
            return true
        }
    }
    
    /**
     * Get rate limit status
     */
    private static Map getRateLimitStatus() {
        return [
            limit: RATE_LIMIT_PER_MINUTE,
            used: currentMinuteEmailCount,
            remaining: Math.max(0, RATE_LIMIT_PER_MINUTE - currentMinuteEmailCount),
            resetTime: new Date(currentMinuteStart + 60000)
        ]
    }
    
    /**
     * Check circuit breaker status
     */
    private static boolean checkCircuitBreaker() {
        long currentTime = System.currentTimeMillis()
        return (currentTime - lastCircuitBreakerFailure) > CIRCUIT_BREAKER_TIMEOUT
    }
    
    /**
     * Record circuit breaker failure
     */
    private static void recordCircuitBreakerFailure() {
        lastCircuitBreakerFailure = System.currentTimeMillis()
    }
    
    /**
     * Reset circuit breaker after successful operation
     */
    private static void resetCircuitBreaker() {
        lastCircuitBreakerFailure = 0
    }
    
    /**
     * Attempt to send email with retry logic
     */
    private static EmailResult attemptEmailSend(Map recipients, String subject, String htmlContent) {
        Exception lastException = null
        
        for (int attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                EmailResult result = sendEmailInternal(recipients, subject, htmlContent)
                if (result.success) {
                    return result
                }
                lastException = new Exception(result.error)
                
            } catch (Exception e) {
                lastException = e
                println "EmailService: Attempt ${attempt} failed: ${e.message}"
                
                if (attempt < MAX_RETRY_ATTEMPTS) {
                    Thread.sleep(1000 * attempt) // Progressive backoff
                }
            }
        }
        
        return new EmailResult(
            success: false,
            error: "Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${lastException?.message}",
            exception: lastException
        )
    }
    
    /**
     * Internal email sending implementation
     */
    private static EmailResult sendEmailInternal(Map recipients, String subject, String htmlContent) {
        // Try Confluence SMTP first
        try {
            ConfluenceMailServerManager mailServerManager = ComponentLocator.getComponent(ConfluenceMailServerManager)
            SMTPMailServer mailServer = mailServerManager.getDefaultSMTPMailServer()
            
            if (mailServer) {
                return sendViaConfluenceSmtp(mailServer, recipients, subject, htmlContent)
            }
        } catch (Exception e) {
            println "EmailService: Confluence SMTP failed: ${e.message}"
        }
        
        // Fallback to MailHog for development
        if (isLocalDevelopment()) {
            return sendViaMailHog(recipients, subject, htmlContent)
        }
        
        return new EmailResult(success: false, error: "No email transport available")
    }
    
    /**
     * Send via Confluence SMTP
     */
    private static EmailResult sendViaConfluenceSmtp(SMTPMailServer mailServer, Map recipients, 
                                                    String subject, String htmlContent) {
        try {
            List<String> toList = recipients.to as List<String> ?: []
            List<String> ccList = recipients.cc as List<String> ?: []
            List<String> bccList = recipients.bcc as List<String> ?: []
            
            int totalRecipients = toList.size() + ccList.size() + bccList.size()
            
            if (totalRecipients == 0) {
                return new EmailResult(success: false, error: "No recipients specified")
            }
            
            // Create primary email
            String primaryRecipient = toList ? toList.first() : (ccList ? ccList.first() : bccList.first())
            Email email = new Email(primaryRecipient)
            email.setSubject(subject)
            email.setBody(htmlContent)
            email.setMimeType("text/html")
            email.setFrom(mailServer.getDefaultFrom() ?: DEFAULT_FROM_ADDRESS)
            
            // Add all recipients
            if (toList) {
                email.setTo(toList.join(','))
            }
            if (ccList) {
                email.setCc(ccList.join(','))
            }
            if (bccList) {
                email.setBcc(bccList.join(','))
            }
            
            // Send the email
            mailServer.send(email)
            
            return new EmailResult(
                success: true,
                recipientCount: totalRecipients,
                transport: 'confluence-smtp',
                messageId: email.getMessageId()
            )
            
        } catch (Exception e) {
            return new EmailResult(success: false, error: "Confluence SMTP error: ${e.message}", exception: e)
        }
    }
    
    /**
     * Send via MailHog for development
     */
    private static EmailResult sendViaMailHog(Map recipients, String subject, String htmlContent) {
        try {
            Properties props = new Properties()
            props.put("mail.smtp.host", "localhost")
            props.put("mail.smtp.port", "1025")
            props.put("mail.smtp.auth", "false")
            
            Session session = Session.getInstance(props)
            MimeMessage message = new MimeMessage(session)
            
            message.setFrom(new InternetAddress(DEFAULT_FROM_ADDRESS, "UMIG System"))
            
            // Set recipients
            List<String> allRecipients = []
            List<String> toList = recipients.to as List<String> ?: []
            List<String> ccList = recipients.cc as List<String> ?: []
            List<String> bccList = recipients.bcc as List<String> ?: []
            
            if (toList) {
                InternetAddress[] toAddresses = toList.collect { new InternetAddress(it as String) } as InternetAddress[]
                message.setRecipients(Message.RecipientType.TO, toAddresses)
                allRecipients.addAll(toList)
            }
            if (ccList) {
                InternetAddress[] ccAddresses = ccList.collect { new InternetAddress(it as String) } as InternetAddress[]
                message.setRecipients(Message.RecipientType.CC, ccAddresses)
                allRecipients.addAll(ccList)
            }
            if (bccList) {
                InternetAddress[] bccAddresses = bccList.collect { new InternetAddress(it as String) } as InternetAddress[]
                message.setRecipients(Message.RecipientType.BCC, bccAddresses)
                allRecipients.addAll(bccList)
            }
            
            message.setSubject(subject)
            message.setContent(htmlContent, "text/html; charset=UTF-8")
            
            Transport.send(message)
            
            return new EmailResult(
                success: true,
                recipientCount: allRecipients.size(),
                transport: 'mailhog',
                messageId: message.getMessageID()
            )
            
        } catch (Exception e) {
            return new EmailResult(success: false, error: "MailHog error: ${e.message}", exception: e)
        }
    }
    
    /**
     * Test email configuration
     */
    private static Map testEmailConfiguration() {
        try {
            def confluenceAvailable = false
            def mailhogAvailable = false
            
            // Test Confluence SMTP
            try {
                ConfluenceMailServerManager mailServerManager = ComponentLocator.getComponent(ConfluenceMailServerManager)
                SMTPMailServer mailServer = mailServerManager.getDefaultSMTPMailServer()
                confluenceAvailable = (mailServer != null)
            } catch (Exception e) {
                // Confluence SMTP not available
            }
            
            // Test MailHog if in development
            if (isLocalDevelopment()) {
                try {
                    Socket socket = new Socket("localhost", 1025)
                    socket.close()
                    mailhogAvailable = true
                } catch (Exception e) {
                    // MailHog not available
                }
            }
            
            return [
                healthy: confluenceAvailable || mailhogAvailable,
                confluenceAvailable: confluenceAvailable,
                mailhogAvailable: mailhogAvailable
            ]
            
        } catch (Exception e) {
            return [
                healthy: false,
                error: e.message
            ]
        }
    }
    
    /**
     * Check if we're in local development mode
     */
    private static boolean isLocalDevelopment() {
        String env = System.getProperty('umig.environment', 'production')
        return env.toLowerCase() in ['local', 'development', 'dev'] || true  // Force local dev mode for testing
    }
    
    /**
     * Log successful email send for audit
     */
    private static void logEmailSent(Map auditContext, EmailResult result) {
        try {
            if (auditContext.userId && auditContext.entityId) {
                DatabaseUtil.withSql { sql ->
                    AuditLogRepository.logEmailSent(
                        sql,
                        auditContext.userId as Integer,
                        auditContext.entityId as UUID,
                        auditContext.recipients as List<String>,
                        auditContext.subject as String,
                        auditContext.templateId as UUID,
                        auditContext.additionalData as Map ?: [:],
                        auditContext.entityType as String ?: 'STEP_INSTANCE'
                    )
                }
            }
        } catch (Exception e) {
            println "EmailService: Error logging email audit: ${e.message}"
            // Don't fail the email send because of audit logging issues
        }
    }
}

/**
 * Email result data class for structured responses
 */
class EmailResult {
    boolean success
    String error
    String messageId
    String transport
    int recipientCount
    Exception exception
    
    String toString() {
        if (success) {
            return "EmailResult[success=true, transport=${transport}, recipients=${recipientCount}, messageId=${messageId}]"
        } else {
            return "EmailResult[success=false, error=${error}]"
        }
    }
}