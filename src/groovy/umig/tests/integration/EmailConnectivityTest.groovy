#!/usr/bin/env groovy

/**
 * Test script to verify SMTP connectivity to MailHog from Groovy environment
 * Replicates the exact email sending logic from EnhancedEmailService
 */

@Grab('org.postgresql:postgresql:42.7.2')

import javax.mail.*
import javax.mail.internet.*
import java.util.Properties
import java.util.Date

class EmailConnectivityTest {

    static void main(String[] args) {
        println "============================================================"
        println "Testing SMTP connectivity from Groovy to MailHog"
        println "============================================================"

        try {
            // Test MailHog SMTP connectivity using same code as EnhancedEmailService
            def result = sendTestEmailViaMailHog(['test@example.com'], 'Test Subject', '<h1>Test Body</h1>')

            if (result) {
                println "✅ SUCCESS: Email sent successfully to MailHog"
                println "📧 Check MailHog at: http://localhost:8025"
            } else {
                println "❌ FAILURE: Email could not be sent"
            }

        } catch (Exception e) {
            println "❌ ERROR: ${e.message}"
            e.printStackTrace()
        }
    }

    /**
     * Test email sending using exact same logic as EnhancedEmailService.sendEmailViaMailHog
     */
    private static boolean sendTestEmailViaMailHog(List<String> recipients, String subject, String body) {
        try {
            println "EnhancedEmailService: Sending via MailHog (development mode)"

            // MailHog SMTP configuration - EXACT same as EnhancedEmailService
            Properties props = new Properties()
            props.put("mail.smtp.host", "localhost")
            props.put("mail.smtp.port", "1025")
            props.put("mail.smtp.auth", "false")
            props.put("mail.smtp.starttls.enable", "false")

            // Create session
            Session session = Session.getInstance(props)

            // Send to each recipient
            boolean allSent = true
            recipients.each { recipient ->
                try {
                    MimeMessage message = new MimeMessage(session)
                    message.setFrom(new InternetAddress('umig-system@company.com'))
                    message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(recipient))
                    message.setSubject(subject, "UTF-8")
                    message.setContent(body, "text/html; charset=utf-8")
                    message.setSentDate(new Date())

                    Transport.send(message)
                    println "EnhancedEmailService: Email sent successfully to ${recipient}"
                } catch (Exception e) {
                    println "EnhancedEmailService: Failed to send email to ${recipient}: ${e.message}"
                    allSent = false
                }
            }

            return allSent
        } catch (Exception e) {
            println "EnhancedEmailService: Error in sendEmailViaMailHog: ${e.message}"
            return false
        }
    }
}

// Execute the test - self-contained pattern
EmailConnectivityTest.main([] as String[])