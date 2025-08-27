#!/usr/bin/env node

/**
 * MailHog SMTP Server Test
 * JavaScript equivalent of test-mailhog-smtp.sh
 * Tests UMIG Enhanced Email Service through MailHog
 */

import nodemailer from "nodemailer";
import { execSync } from "child_process";

console.log("============================================================");
console.log("Testing MailHog SMTP Server");
console.log("============================================================");

// Create SMTP transporter for MailHog
const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 1025,
  secure: false, // true for 465, false for other ports
  auth: false, // No authentication needed for MailHog
});

// Email content with mobile-responsive HTML template
const emailContent = {
  from: "test@umig.local",
  to: "user@example.com",
  subject: "UMIG Enhanced Email Test",
  html: `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #0052cc; color: white; padding: 20px; text-align: center;">
            <h1>UMIG Email Test</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
            <h2>Test Email Successful!</h2>
            <p>This is a test of the UMIG Enhanced Email Service through MailHog.</p>
            <p>Step: CHK-006 - System Check</p>
            <p>Status: IN_PROGRESS</p>
            <a href="http://localhost:8090" style="display: inline-block; padding: 10px 20px; background: #0052cc; color: white; text-decoration: none; border-radius: 4px;">View in Confluence</a>
        </div>
    </div>
</body>
</html>`,
};

async function testMailHogSMTP() {
  try {
    console.log("Sending email to MailHog SMTP server...");

    // Send email
    await transporter.sendMail(emailContent);
    console.log("✅ Email sent successfully to MailHog!");

    // Wait a moment for the email to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check MailHog for the message
    try {
      const result = execSync("curl -s http://localhost:8025/api/v2/messages", {
        encoding: "utf8",
      });
      const messages = JSON.parse(result);
      const count = messages.count || 0;

      console.log(`📧 MailHog Status: ${count} message(s) in inbox`);
      console.log("View at: http://localhost:8025");
    } catch (error) {
      console.warn(
        "⚠️  Could not check MailHog message count, but email sending succeeded",
      );
    }
  } catch (error) {
    console.error("❌ Failed to send email to MailHog");
    console.error("Error:", error.message);
    process.exit(1);
  }
}

console.log("============================================================");

// Execute the test
testMailHogSMTP();
