#!/usr/bin/env node

/**
 * Enhanced Email Database Sender - Production-Ready Testing Tool
 *
 * Retrieves email templates from the UMIG database and sends them to MailHog
 * for comprehensive validation of enhanced mobile-responsive email design
 *
 * FEATURES:
 * - Database-driven template retrieval
 * - Real SMTP testing with MailHog
 * - Mobile-responsive template validation
 * - Groovy GString placeholder population
 * - Multi-template type support (STEP_STATUS_CHANGED, STEP_OPENED, INSTRUCTION_COMPLETED)
 * - Performance monitoring and error handling
 *
 * USAGE:
 *   node scripts/email-database-sender.js
 *   npm run email:test:database
 *
 * @author Lucas Challamel
 * @version 2.0 - Consolidated and standardized
 * @created 2025-08-27
 * @updated 2025-08-27 - Housekeeping consolidation and enhanced documentation
 */

import nodemailer from "nodemailer";
import TemplateRetrievalService from "../services/email/TemplateRetrievalService.js";

// MailHog SMTP configuration
const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 1025,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
});

// Initialize template service
const templateService = new TemplateRetrievalService();

// Test data configurations for each template type
const testConfigurations = [
  {
    templateType: "STEP_STATUS_CHANGED",
    testData: {
      stepInstance: {
        sti_code: "CHK-006",
        sti_name: "Database Connectivity Check",
        migration_name: "Migration Test Suite",
        iteration_name: "Sprint 5 Testing",
        sequence_name: "Pre-Migration Validation",
        phase_name: "Infrastructure Verification",
        sti_duration_minutes: "15",
        sti_status: "IN_PROGRESS",
      },
      instruction: {
        ini_name: "Verify PostgreSQL Connection",
        ini_description:
          "Test database connectivity and validate connection parameters",
      },
      stepUrl: "http://localhost:8090/display/UMIG/StepView?stepId=CHK-006",
      completedAt: new Date().toISOString(),
      completedBy: "Test User",
      changedAt: new Date().toISOString(),
      changedBy: "Test User",
      oldStatus: "OPEN",
      newStatus: "IN_PROGRESS",
      statusColor: "#ffc107",
    },
  },
  {
    templateType: "STEP_OPENED",
    testData: {
      stepInstance: {
        sti_code: "ADV-002",
        sti_name: "Application Deployment Verification",
        migration_name: "APP_DEPLOYMENT_Q3",
        iteration_name: "iteration_002",
        sequence_name: "Application Deployment",
        phase_name: "Production Deployment",
        sti_duration_minutes: "45",
        sti_status: "READY",
      },
      instruction: {
        ini_name: "Deploy Application to Staging",
        ini_description:
          "Deploy application components to staging environment and verify functionality",
      },
      stepUrl: "http://localhost:8090/display/UMIG/StepView?stepId=ADV-002",
      completedAt: new Date().toISOString(),
      completedBy: "System",
      changedAt: new Date().toISOString(),
      changedBy: "DevOps Team",
      oldStatus: "PENDING",
      newStatus: "READY",
      statusColor: "#17a2b8",
    },
  },
  {
    templateType: "INSTRUCTION_COMPLETED",
    testData: {
      stepInstance: {
        sti_code: "SAC-003",
        sti_name: "Security Audit and Compliance Check",
        migration_name: "SEC_COMPLIANCE_2025",
        iteration_name: "iteration_003",
        sequence_name: "Security Validation",
        phase_name: "Compliance Testing",
        sti_duration_minutes: "90",
        sti_status: "COMPLETED",
      },
      instruction: {
        ini_name: "Complete OWASP Assessment",
        ini_description:
          "Complete comprehensive OWASP Top 10 vulnerability assessment",
      },
      stepUrl: "http://localhost:8090/display/UMIG/StepView?stepId=SAC-003",
      completedAt: new Date().toISOString(),
      completedBy: "Security Team",
      changedAt: new Date().toISOString(),
      changedBy: "Security Team",
      oldStatus: "IN_PROGRESS",
      newStatus: "COMPLETED",
      statusColor: "#28a745",
    },
  },
];

async function sendDatabaseTemplateEmails() {
  console.log(
    "🚀 UMIG Database Template Email Test Suite - MailHog Integration",
  );
  console.log("=".repeat(75));
  console.log(
    "📧 Retrieving templates from database and sending to MailHog...",
  );
  console.log(
    "📱 Testing mobile-responsive templates with real database content",
  );
  console.log("=".repeat(75));

  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (let i = 0; i < testConfigurations.length; i++) {
    const config = testConfigurations[i];
    console.log(`\n${i + 1}. Processing ${config.templateType} template...`);

    try {
      // Retrieve template from database
      console.log(`   📋 Retrieving template from database...`);
      const template = await templateService.getTemplateByType(
        config.templateType,
      );

      console.log(`   ✅ Found template: "${template.name}"`);

      // Populate template with test data
      console.log(`   🔧 Populating template with test data...`);
      const populatedHtml = templateService.populateTemplate(
        template.bodyHtml,
        config.testData,
      );
      const populatedSubject = templateService.populateTemplate(
        template.subject,
        config.testData,
      );

      // Send email
      const mailOptions = {
        from: '"UMIG Database Templates" <umig-db-templates@localhost>',
        to: `test-${config.templateType.toLowerCase()}@localhost`,
        subject: `[DB Template] ${populatedSubject}`,
        html: populatedHtml,
        text: `Database Template Test: ${config.templateType}\n\nStep: ${config.testData.stepInstance.sti_name}\nStatus: ${config.testData.stepInstance.sti_status}\n\nThis email was generated using the database template: ${template.name}`,
      };

      console.log(`   📤 Sending email...`);
      await transporter.sendMail(mailOptions);
      console.log(`   ✅ ${config.templateType} email sent successfully`);

      results.push({
        type: config.templateType,
        status: "success",
        template: template.name,
        subject: populatedSubject,
      });

      successCount++;

      // Small delay between emails
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(
        `   ❌ Failed to process ${config.templateType}: ${error.message}`,
      );
      console.log(`   🔍 Error details: ${error.stack}`);

      results.push({
        type: config.templateType,
        status: "error",
        error: error.message,
      });

      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(75));
  console.log("📊 DATABASE TEMPLATE EMAIL RESULTS:");
  console.log(
    `✅ Successfully sent: ${successCount}/${testConfigurations.length} emails`,
  );
  console.log(
    `❌ Failed to send: ${errorCount}/${testConfigurations.length} emails`,
  );

  // Show detailed results
  console.log("\n📋 Detailed Results:");
  results.forEach((result, index) => {
    if (result.status === "success") {
      console.log(`${index + 1}. ✅ ${result.type}`);
      console.log(`   Template: ${result.template}`);
      console.log(`   Subject: ${result.subject}`);
    } else {
      console.log(`${index + 1}. ❌ ${result.type}`);
      console.log(`   Error: ${result.error}`);
    }
  });

  if (successCount > 0) {
    console.log("\n🎯 Next Steps:");
    console.log("1. Open MailHog web interface: http://localhost:8025");
    console.log(
      "2. You should see database-driven email templates in the inbox",
    );
    console.log("3. Compare the emails to the mock template design");
    console.log(
      "4. Verify mobile responsiveness and cross-client compatibility",
    );

    console.log("\n🔍 Template Validation Points:");
    console.log(
      "• Templates match the enhanced-mobile-email-template.html design",
    );
    console.log("• Mobile-responsive layout (320px-1000px breakpoints)");
    console.log("• Proper Groovy GString placeholder replacement");
    console.log("• Email client compatibility (Outlook, Gmail, Apple Mail)");
    console.log("• Professional styling consistent with UMIG branding");
  }

  if (errorCount > 0) {
    console.log("\n⚠️  Issues Found:");
    console.log("• Check database connection and template availability");
    console.log("• Verify PostgreSQL service is running on localhost:5432");
    console.log("• Confirm email templates exist in email_templates_emt table");
  }

  console.log("=".repeat(75));
  console.log("🎉 Database Template Email Test Complete!");

  return {
    success: successCount,
    failed: errorCount,
    total: testConfigurations.length,
    results,
  };
}

// Test function to verify database connectivity
async function testDatabaseConnection() {
  console.log("🔍 Testing database connection...");
  try {
    const templates = await templateService.getAllActiveTemplates();
    console.log(
      `✅ Database connection successful. Found ${templates.length} active templates:`,
    );
    templates.forEach((template) => {
      console.log(`   • ${template.type}: ${template.name}`);
    });
    return true;
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    return false;
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // First test database connection
  testDatabaseConnection()
    .then((dbConnected) => {
      if (!dbConnected) {
        console.log(
          "\n⚠️  Database connection failed. Please ensure PostgreSQL is running and the database is accessible.",
        );
        process.exit(1);
      }

      // If database is connected, proceed with email tests
      return sendDatabaseTemplateEmails();
    })
    .then((results) => {
      console.log(
        `\nTest execution completed: ${results.success}/${results.total} emails sent successfully`,
      );

      if (results.failed > 0) {
        console.log(
          "\n⚠️  Some emails failed to send. Check the error details above.",
        );
      }

      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Fatal error during test execution:", error);
      process.exit(1);
    });
}

export {
  sendDatabaseTemplateEmails,
  testDatabaseConnection,
  testConfigurations,
};
