#!/usr/bin/env node

/**
 * Enhanced Email Demonstration Script
 *
 * Interactive demonstration of US-039 Enhanced Email Notifications
 * Sends sample enhanced emails to MailHog for immediate visual inspection
 *
 * Usage:
 *   node scripts/demo-enhanced-email.js [--template=TYPE] [--count=N]
 *
 * @author Lucas Challamel
 * @version 1.0
 * @created 2025-08-27
 */

import { execSync } from "child_process";
import chalk from "chalk";
import { readFileSync, existsSync } from "fs";

class EnhancedEmailDemo {
  constructor() {
    this.mailhogUrl = "http://localhost:8025";
    this.templateTypes = [
      {
        type: "STEP_STATUS_CHANGED",
        color: "blue",
        description: "Step status change notification",
        status: "COMPLETED",
      },
      {
        type: "STEP_OPENED",
        color: "green",
        description: "Step opened notification",
        status: "IN_PROGRESS",
      },
      {
        type: "INSTRUCTION_COMPLETED",
        color: "teal",
        description: "Instruction completion notification",
        status: "VALIDATED",
      },
    ];

    this.sampleData = {
      stepName: "Database Migration Verification",
      stepCode: "DEMO-001",
      migrationCode: "TORONTO_CUTOVER",
      iterationCode: "final_run_2025",
      assignedTeam: "Database Team",
      dueDate: "2025-08-28",
      instructions: [
        "Verify all database connections are established successfully",
        "Run integrity check on migrated data tables",
        "Confirm backup procedures are in place and tested",
        "Validate user access permissions post-migration",
        "Document any anomalies or performance issues",
      ],
      metadata: {
        priority: "HIGH",
        environment: "PRODUCTION",
        estimatedDuration: "2-3 hours",
      },
    };
  }

  async run() {
    console.log(chalk.blue.bold("\n🎭 Enhanced Email Notifications Demo"));
    console.log(chalk.blue("=".repeat(55)));
    console.log(
      chalk.blue("US-039 Phase 0: Mobile-Responsive Email Templates"),
    );
    console.log(
      chalk.blue("Real-time MailHog demonstration with visual results"),
    );
    console.log(chalk.blue("=".repeat(55)));

    try {
      await this.checkPrerequisites();
      await this.clearMailHogInbox();
      await this.sendDemoEmails();
      await this.displayResults();
    } catch (error) {
      console.error(chalk.red.bold("\n❌ Demo failed:"), error.message);
      console.error(
        chalk.red("Please ensure MailHog is running and accessible"),
      );
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    console.log(chalk.yellow("\n🔧 Checking Prerequisites"));
    console.log(chalk.yellow("-".repeat(25)));

    // Check MailHog
    const mailhogRunning = await this.checkMailHogConnection();
    console.log(
      `📡 MailHog Service: ${mailhogRunning ? chalk.green("✅ Running") : chalk.red("❌ Not accessible")}`,
    );

    if (!mailhogRunning) {
      throw new Error("MailHog is not accessible at http://localhost:8025");
    }

    // Check email template
    const templatePath =
      "../src/groovy/umig/web/enhanced-mobile-email-template.html";
    const templateExists = existsSync(templatePath);
    console.log(
      `📄 Email Template: ${templateExists ? chalk.green("✅ Found") : chalk.yellow("⚠️ Using fallback")}`,
    );

    // Check nodemailer availability
    try {
      execSync("node -e \"require('nodemailer')\"", { stdio: "ignore" });
      console.log(`📧 Nodemailer: ${chalk.green("✅ Available")}`);
    } catch (error) {
      console.log(`📧 Nodemailer: ${chalk.yellow("⚠️ Installing...")}`);
      execSync("npm install nodemailer --no-save", { stdio: "inherit" });
    }

    console.log(chalk.green("✅ Prerequisites verified"));
  }

  async clearMailHogInbox() {
    try {
      execSync(`curl -X DELETE ${this.mailhogUrl}/api/v1/messages`, {
        stdio: "ignore",
      });
      console.log(chalk.gray("🗑️ MailHog inbox cleared"));
    } catch (error) {
      console.warn(chalk.yellow("⚠️ Could not clear MailHog inbox"));
    }
  }

  async sendDemoEmails() {
    console.log(chalk.cyan("\n📧 Sending Enhanced Email Demonstrations"));
    console.log(chalk.cyan("-".repeat(45)));

    for (const template of this.templateTypes) {
      console.log(chalk.cyan(`\n📨 Sending ${template.type} email...`));
      console.log(`   Description: ${template.description}`);
      console.log(`   Theme Color: ${template.color}`);

      const stepData = {
        ...this.sampleData,
        stepStatus: template.status,
        emailType: template.type,
      };

      try {
        await this.sendEnhancedEmail(template, stepData);
        console.log(
          chalk.green(`   ✅ ${template.type} email sent successfully`),
        );

        // Brief pause between emails
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(
          chalk.red(`   ❌ Failed to send ${template.type}:`, error.message),
        );
      }
    }

    console.log(chalk.green("\n✅ All demonstration emails sent"));
  }

  async sendEnhancedEmail(template, stepData) {
    // Create enhanced email HTML
    const emailHtml = this.generateEnhancedEmailHTML(template, stepData);

    // Send via nodemailer to MailHog
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.createTransport({
      host: "localhost",
      port: 1025,
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: "umig-demo@localhost",
      to: "demo-user@localhost",
      subject: `${stepData.stepName} - ${template.type} | UMIG Enhanced Demo`,
      html: emailHtml,
      text: this.generatePlainTextEmail(template, stepData),
    };

    await transporter.sendMail(mailOptions);
  }

  generateEnhancedEmailHTML(template, stepData) {
    const themeColors = {
      blue: "#007cba",
      green: "#28a745",
      teal: "#17a2b8",
    };

    const primaryColor = themeColors[template.color] || "#007cba";

    return `
<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>${stepData.stepName} - ${template.type} | UMIG</title>
    
    <style>
        /* EMAIL CLIENT COMPATIBILITY RESET */
        html, body, table, tbody, tr, td, div, p, ul, ol, li, h1, h2, h3, h4, h5, h6 {
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
        }
        
        /* UNIVERSAL STYLES */
        * {
            font-family: 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif !important;
        }
        
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-color: #f4f4f4 !important;
        }
        
        /* RESPONSIVE TABLE CONTAINER */
        .email-container {
            max-width: 600px !important;
            margin: 0 auto !important;
            background-color: #ffffff !important;
        }
        
        /* HEADER STYLES */
        .header {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${this.darkenColor(primaryColor, 20)} 100%) !important;
            padding: 30px 20px !important;
            text-align: center !important;
        }
        
        .header h1 {
            color: #ffffff !important;
            font-size: 24px !important;
            font-weight: 600 !important;
            margin-bottom: 10px !important;
        }
        
        .header .subtitle {
            color: #f0f8ff !important;
            font-size: 16px !important;
            margin: 0 !important;
        }
        
        /* CONTENT STYLES */
        .content {
            padding: 30px 20px !important;
        }
        
        .step-info {
            background-color: #f8f9fa !important;
            border-left: 4px solid ${primaryColor} !important;
            padding: 20px !important;
            margin-bottom: 20px !important;
        }
        
        .step-meta {
            display: table !important;
            width: 100% !important;
            margin-bottom: 20px !important;
        }
        
        .meta-item {
            display: table-row !important;
        }
        
        .meta-label {
            display: table-cell !important;
            font-weight: 600 !important;
            color: #495057 !important;
            padding: 5px 15px 5px 0 !important;
            width: 30% !important;
        }
        
        .meta-value {
            display: table-cell !important;
            color: #212529 !important;
            padding: 5px 0 !important;
        }
        
        /* INSTRUCTIONS STYLES */
        .instructions {
            background-color: #fff !important;
            border: 1px solid #dee2e6 !important;
            border-radius: 4px !important;
            padding: 20px !important;
            margin: 20px 0 !important;
        }
        
        .instructions h3 {
            color: ${primaryColor} !important;
            font-size: 18px !important;
            margin-bottom: 15px !important;
        }
        
        .instructions ul {
            list-style: none !important;
            padding: 0 !important;
            margin: 0 !important;
        }
        
        .instructions li {
            padding: 8px 0 !important;
            border-bottom: 1px solid #f1f3f4 !important;
            position: relative !important;
            padding-left: 20px !important;
        }
        
        .instructions li:before {
            content: "✓" !important;
            position: absolute !important;
            left: 0 !important;
            color: ${primaryColor} !important;
            font-weight: bold !important;
        }
        
        .instructions li:last-child {
            border-bottom: none !important;
        }
        
        /* BUTTON STYLES */
        .cta-section {
            text-align: center !important;
            padding: 30px 0 !important;
        }
        
        .cta-button {
            display: inline-block !important;
            padding: 15px 30px !important;
            min-height: 44px !important;
            background-color: ${primaryColor} !important;
            color: #ffffff !important;
            text-decoration: none !important;
            border-radius: 6px !important;
            font-weight: 600 !important;
            font-size: 16px !important;
            line-height: 1.2 !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }
        
        .cta-button:hover {
            background-color: ${this.darkenColor(primaryColor, 10)} !important;
        }
        
        /* FOOTER STYLES */
        .footer {
            background-color: #343a40 !important;
            color: #ffffff !important;
            text-align: center !important;
            padding: 20px !important;
            font-size: 14px !important;
        }
        
        /* MOBILE RESPONSIVE */
        @media only screen and (max-width: 480px) {
            .email-container {
                width: 100% !important;
                max-width: 100% !important;
            }
            
            .content {
                padding: 20px 15px !important;
            }
            
            .header {
                padding: 20px 15px !important;
            }
            
            .header h1 {
                font-size: 20px !important;
            }
            
            .step-info {
                padding: 15px !important;
            }
            
            .meta-label {
                display: block !important;
                font-weight: 600 !important;
                margin-bottom: 5px !important;
            }
            
            .meta-value {
                display: block !important;
                margin-bottom: 15px !important;
            }
            
            .cta-button {
                display: block !important;
                margin: 0 auto !important;
                max-width: 280px !important;
            }
        }
        
        /* EMAIL CLIENT SPECIFIC FIXES */
        /* Outlook */
        @media screen and (-webkit-min-device-pixel-ratio: 0) {
            .email-container {
                max-width: 600px !important;
            }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .content {
                background-color: #1a1a1a !important;
                color: #ffffff !important;
            }
            
            .step-info {
                background-color: #2d2d2d !important;
            }
            
            .instructions {
                background-color: #2d2d2d !important;
                border-color: #444444 !important;
            }
        }
    </style>
    
    <!--[if mso]>
    <style>
        table, tr, td {
            border-collapse: collapse !important;
            mso-table-lspace: 0pt !important;
            mso-table-rspace: 0pt !important;
        }
    </style>
    <![endif]-->
</head>
<body>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0">
                    <!-- HEADER -->
                    <tr>
                        <td class="header">
                            <h1>${stepData.stepName}</h1>
                            <p class="subtitle">${template.description} • ${template.type}</p>
                        </td>
                    </tr>
                    
                    <!-- CONTENT -->
                    <tr>
                        <td class="content">
                            <!-- Step Information -->
                            <div class="step-info">
                                <table class="step-meta" width="100%" cellpadding="0" cellspacing="0">
                                    <tr class="meta-item">
                                        <td class="meta-label">Step Code:</td>
                                        <td class="meta-value"><strong>${stepData.stepCode}</strong></td>
                                    </tr>
                                    <tr class="meta-item">
                                        <td class="meta-label">Status:</td>
                                        <td class="meta-value"><strong>${stepData.stepStatus}</strong></td>
                                    </tr>
                                    <tr class="meta-item">
                                        <td class="meta-label">Migration:</td>
                                        <td class="meta-value">${stepData.migrationCode}</td>
                                    </tr>
                                    <tr class="meta-item">
                                        <td class="meta-label">Iteration:</td>
                                        <td class="meta-value">${stepData.iterationCode}</td>
                                    </tr>
                                    <tr class="meta-item">
                                        <td class="meta-label">Assigned Team:</td>
                                        <td class="meta-value">${stepData.assignedTeam}</td>
                                    </tr>
                                    <tr class="meta-item">
                                        <td class="meta-label">Due Date:</td>
                                        <td class="meta-value">${stepData.dueDate}</td>
                                    </tr>
                                    <tr class="meta-item">
                                        <td class="meta-label">Priority:</td>
                                        <td class="meta-value">${stepData.metadata.priority}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Instructions -->
                            <div class="instructions">
                                <h3>📋 Step Instructions</h3>
                                <ul>
                                    ${stepData.instructions.map((instruction) => `<li>${instruction}</li>`).join("")}
                                </ul>
                            </div>
                            
                            <!-- Call to Action -->
                            <div class="cta-section">
                                <a href="https://confluence.localhost:8090/spaces/UMIG/pages/viewpage.action?mig=${stepData.migrationCode}&ite=${stepData.iterationCode}&stepid=${stepData.stepCode}" 
                                   class="cta-button">
                                    📖 View in Confluence
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td class="footer">
                            <p>🚀 UMIG - Unified Migration Implementation Guide</p>
                            <p>Enhanced Email Notifications • Phase 0 Demo</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
  }

  generatePlainTextEmail(template, stepData) {
    return `
UMIG - ${stepData.stepName}
${template.description} (${template.type})

STEP INFORMATION
================
Step Code: ${stepData.stepCode}
Status: ${stepData.stepStatus}
Migration: ${stepData.migrationCode}
Iteration: ${stepData.iterationCode}
Assigned Team: ${stepData.assignedTeam}
Due Date: ${stepData.dueDate}
Priority: ${stepData.metadata.priority}

INSTRUCTIONS
============
${stepData.instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join("\n")}

VIEW IN CONFLUENCE
==================
https://confluence.localhost:8090/spaces/UMIG/pages/viewpage.action?mig=${stepData.migrationCode}&ite=${stepData.iterationCode}&stepid=${stepData.stepCode}

---
UMIG - Unified Migration Implementation Guide
Enhanced Email Notifications • Phase 0 Demo
        `;
  }

  async displayResults() {
    console.log(chalk.blue("\n🎯 Demonstration Complete!"));
    console.log(chalk.blue("=".repeat(35)));

    // Get current email count
    const messages = await this.getMailHogMessages();
    console.log(`📧 Emails in MailHog: ${chalk.cyan.bold(messages.length)}`);

    // Display access information
    console.log(chalk.yellow("\n📱 View Results:"));
    console.log(
      `   MailHog Web UI: ${chalk.cyan.underline("http://localhost:8025")}`,
    );
    console.log(
      `   API Endpoint: ${chalk.cyan.underline("http://localhost:8025/api/v2/messages")}`,
    );

    // Quick analysis of sent emails
    if (messages.length > 0) {
      console.log(chalk.yellow("\n📊 Email Analysis:"));
      messages.forEach((message, index) => {
        const subject = message.Content?.Headers?.Subject?.[0] || "No Subject";
        const size = this.formatBytes(message.Content?.Size || 0);
        console.log(`   ${index + 1}. ${subject} (${size})`);
      });

      console.log(chalk.yellow("\n🔍 Features to Check in MailHog:"));
      console.log("   ✅ Mobile-responsive layout (resize browser window)");
      console.log(
        '   ✅ Touch-friendly "View in Confluence" button (44px height)',
      );
      console.log("   ✅ Email client compatibility elements");
      console.log("   ✅ Step content rendering with instructions");
      console.log("   ✅ Proper URL construction with parameters");
    }

    console.log(
      chalk.green.bold("\n🎉 Enhanced Email Demo Successfully Completed!"),
    );
    console.log(chalk.gray("Open MailHog in your browser to see the results"));
  }

  // Utility methods
  async checkMailHogConnection() {
    try {
      execSync(`curl -s ${this.mailhogUrl}/api/v2/messages`, {
        stdio: "ignore",
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getMailHogMessages() {
    try {
      const output = execSync(`curl -s ${this.mailhogUrl}/api/v2/messages`, {
        encoding: "utf8",
      });
      const response = JSON.parse(output);
      return response.items || [];
    } catch (error) {
      return [];
    }
  }

  darkenColor(color, percent) {
    // Simple color darkening function
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const B = ((num >> 8) & 0x00ff) + amt;
    const G = (num & 0x0000ff) + amt;
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
        (G < 255 ? (G < 1 ? 0 : G) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// Run the demo if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new EnhancedEmailDemo();
  demo.run().catch((error) => {
    console.error(chalk.red.bold("Demo failed:"), error);
    process.exit(1);
  });
}

export default EnhancedEmailDemo;
