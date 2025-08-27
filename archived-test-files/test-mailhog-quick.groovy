#!/usr/bin/env groovy

/**
 * Quick MailHog Email Test Script
 * Tests basic email functionality through MailHog SMTP server
 */

import javax.mail.*
import javax.mail.internet.*
import java.util.Properties

println "=" * 60
println "Quick MailHog Email Test"
println "=" * 60

// Configure email properties for MailHog
Properties props = new Properties()
props.put("mail.smtp.host", "localhost")
props.put("mail.smtp.port", "1025")
props.put("mail.smtp.auth", "false")
props.put("mail.smtp.starttls.enable", "false")

try {
    // Create session
    Session session = Session.getInstance(props)
    
    // Create message
    MimeMessage message = new MimeMessage(session)
    message.setFrom(new InternetAddress("test@umig.local"))
    message.addRecipient(Message.RecipientType.TO, new InternetAddress("user@example.com"))
    message.setSubject("Test Email from UMIG - ${new Date()}")
    
    // HTML body with mobile-responsive template snippet
    String htmlBody = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0052cc; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f5f5f5; }
            .button { display: inline-block; padding: 10px 20px; background: #0052cc; color: white; text-decoration: none; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>UMIG Email Test</h1>
            </div>
            <div class="content">
                <h2>Test Email Successful!</h2>
                <p>This email was sent at: ${new Date()}</p>
                <p>If you can see this message, MailHog integration is working correctly.</p>
                <a href="http://localhost:8090" class="button">View in Confluence</a>
            </div>
        </div>
    </body>
    </html>
    """
    
    message.setContent(htmlBody, "text/html; charset=utf-8")
    
    // Send message
    println "Sending email to MailHog..."
    Transport.send(message)
    
    println "✅ Email sent successfully!"
    println "Check MailHog at: http://localhost:8025"
    
} catch (Exception e) {
    println "❌ Failed to send email: ${e.message}"
    e.printStackTrace()
}

// Check if message arrived in MailHog
Thread.sleep(1000) // Wait for MailHog to process
def checkUrl = new URL("http://localhost:8025/api/v2/messages")
def response = checkUrl.text
def json = new groovy.json.JsonSlurper().parseText(response)

println "\n📧 MailHog Status:"
println "Total messages: ${json.count}"
if (json.count > 0) {
    println "✅ Email successfully received by MailHog!"
    def latestMessage = json.items[0]
    println "  Subject: ${latestMessage.Content.Headers.Subject[0]}"
    println "  From: ${latestMessage.Content.Headers.From[0]}"
    println "  To: ${latestMessage.Content.Headers.To[0]}"
} else {
    println "⚠️  No messages found in MailHog yet"
}

println "=" * 60