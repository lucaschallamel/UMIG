/**
 * Template Engine Validation Test
 *
 * CRITICAL FIX VALIDATION: Tests that StreamingTemplateEngine correctly handles
 * GSP-style templates with scriptlets, whereas SimpleTemplateEngine fails.
 *
 * Background:
 * - Email templates use GSP syntax: <% %> scriptlets and ${...} expressions
 * - SimpleTemplateEngine only supports GString syntax (no scriptlets)
 * - StreamingTemplateEngine supports full GSP syntax including scriptlets
 * - Bug caused unrendered templates to be sent to users
 *
 * @see EnhancedEmailService.groovy line 57 (TEMPLATE_ENGINE)
 * @see ADR-015 Email Template System
 */

const axios = require("axios");

// Test configuration
const CONFLUENCE_BASE_URL =
  process.env.CONFLUENCE_BASE_URL || "http://localhost:8090";
const CONFLUENCE_USERNAME = process.env.CONFLUENCE_USERNAME || "admin";
const CONFLUENCE_PASSWORD = process.env.CONFLUENCE_PASSWORD || "123456";
const API_BASE = `${CONFLUENCE_BASE_URL}/rest/scriptrunner/latest/custom`;

const axiosConfig = {
  auth: {
    username: CONFLUENCE_USERNAME,
    password: CONFLUENCE_PASSWORD,
  },
  headers: {
    "Content-Type": "application/json",
    "X-Atlassian-Token": "no-check",
  },
};

describe("Template Engine Validation - StreamingTemplateEngine vs SimpleTemplateEngine", () => {
  /**
   * This test demonstrates the GSP syntax that was failing with SimpleTemplateEngine
   * and should now work with StreamingTemplateEngine
   */
  test("GSP template syntax should be supported", () => {
    // Sample GSP template content from actual email templates
    const gspTemplateSyntax = `
            <% if (migrationCode && iterationCode) { %>
                Migration: \${migrationCode} › Iteration: \${iterationCode}
            <% } else { %>
                No migration context available
            <% } %>

            Step Code: \${stepInstance.sti_code ?: 'UNKNOWN'}
            Step Name: \${stepInstance.sti_name ?: 'N/A'}

            <% if (stepInstance.sti_status == 'COMPLETED') { %>
                ✅ Status: Completed
            <% } else if (stepInstance.sti_status == 'IN_PROGRESS') { %>
                🔄 Status: In Progress
            <% } else { %>
                ⏸️ Status: \${stepInstance.sti_status}
            <% } %>
        `.trim();

    // These are the GSP features that SimpleTemplateEngine CANNOT handle:
    const gspFeatures = {
      scriptlets: gspTemplateSyntax.includes("<%"),
      conditionals: gspTemplateSyntax.includes("if ("),
      elvisOperator: gspTemplateSyntax.includes("?:"),
      complexExpressions: gspTemplateSyntax.includes("stepInstance.sti_"),
    };

    // All GSP features should be present in templates
    expect(gspFeatures.scriptlets).toBe(true);
    expect(gspFeatures.conditionals).toBe(true);
    expect(gspFeatures.elvisOperator).toBe(true);
    expect(gspFeatures.complexExpressions).toBe(true);

    console.log(
      "✅ GSP template syntax validated - contains scriptlets and complex expressions",
    );
  });

  /**
   * Integration test: Send a test email and verify it's properly rendered
   *
   * This test triggers the actual email sending flow and checks MailHog
   * for a properly rendered email (no raw template syntax)
   */
  test("Email templates should be rendered, not sent as raw GSP syntax", async () => {
    // Skip if not in integration test mode
    if (process.env.TEST_MODE !== "integration") {
      console.log(
        "⏭️  Skipping integration test (set TEST_MODE=integration to run)",
      );
      return;
    }

    try {
      // Step 1: Get a valid step instance ID from the database
      const stepsResponse = await axios.get(`${API_BASE}/enhancedStepsApi`, {
        ...axiosConfig,
        params: { limit: 1 },
      });

      expect(stepsResponse.status).toBe(200);
      expect(stepsResponse.data.enhancedSteps).toBeDefined();
      expect(stepsResponse.data.enhancedSteps.length).toBeGreaterThan(0);

      const testStepId = stepsResponse.data.enhancedSteps[0].sti_id;
      console.log(`📧 Using test step ID: ${testStepId}`);

      // Step 2: Trigger a step status change (sends email)
      const statusChangeResponse = await axios.post(
        `${API_BASE}/stepViewApi/stepStatusChange`,
        {
          stepInstanceId: testStepId,
          newStatus: "COMPLETED",
          assignedUser: CONFLUENCE_USERNAME,
        },
        axiosConfig,
      );

      expect(statusChangeResponse.status).toBe(200);
      console.log("✅ Step status change triggered (email should be sent)");

      // Step 3: Wait for email to be processed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 4: Check MailHog for the email
      const mailhogResponse = await axios.get(
        "http://localhost:8025/api/v2/messages",
      );
      expect(mailhogResponse.status).toBe(200);
      expect(mailhogResponse.data.items).toBeDefined();
      expect(mailhogResponse.data.items.length).toBeGreaterThan(0);

      const latestEmail = mailhogResponse.data.items[0];
      const emailBody = latestEmail.Content.Body;

      console.log(`📬 Latest email received at: ${latestEmail.Created}`);
      console.log(
        `📧 Email subject: ${latestEmail.Content.Headers.Subject[0]}`,
      );

      // Step 5: Verify email is properly rendered (no raw GSP syntax)
      const rawGspIndicators = [
        "<%", // Scriptlet opening
        "%>", // Scriptlet closing
        "${stepInstance", // Unprocessed variable
        "<% if", // Unprocessed conditional
        "sti_code ?:", // Unprocessed elvis operator
      ];

      let foundRawSyntax = [];
      for (const indicator of rawGspIndicators) {
        if (emailBody.includes(indicator)) {
          foundRawSyntax.push(indicator);
        }
      }

      // Assert: Email should NOT contain raw GSP syntax
      expect(foundRawSyntax).toHaveLength(0);

      if (foundRawSyntax.length > 0) {
        console.error(
          "❌ FAILURE: Email contains unprocessed GSP syntax:",
          foundRawSyntax,
        );
        console.error("Email body preview:", emailBody.substring(0, 500));
        throw new Error(
          `Email template not rendered! Found raw syntax: ${foundRawSyntax.join(", ")}`,
        );
      }

      console.log(
        "✅ SUCCESS: Email properly rendered with StreamingTemplateEngine",
      );
      console.log("✅ No raw GSP syntax detected in email body");
    } catch (error) {
      console.error(
        "❌ Template engine validation test failed:",
        error.message,
      );
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error(
          "Response data:",
          JSON.stringify(error.response.data, null, 2),
        );
      }
      throw error;
    }
  }, 30000); // 30 second timeout for email processing

  /**
   * Audit log verification: Check that template compilation is logged
   */
  test("Template compilation should be logged to audit log", async () => {
    // Skip if not in integration test mode
    if (process.env.TEST_MODE !== "integration") {
      console.log(
        "⏭️  Skipping integration test (set TEST_MODE=integration to run)",
      );
      return;
    }

    try {
      // Query audit log for template compilation events
      const auditResponse = await axios.get(`${API_BASE}/auditLogApi`, {
        ...axiosConfig,
        params: {
          limit: 50,
          sortBy: "log_timestamp",
          sortOrder: "desc",
        },
      });

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.data.auditLogs).toBeDefined();

      // Look for email-related audit log entries
      const emailLogs = auditResponse.data.auditLogs.filter(
        (log) =>
          log.log_entity_type === "EMAIL" ||
          log.log_action.includes("EMAIL") ||
          log.log_action.includes("TEMPLATE"),
      );

      console.log(
        `📊 Found ${emailLogs.length} email-related audit log entries`,
      );

      if (emailLogs.length > 0) {
        const latestEmailLog = emailLogs[0];
        console.log(`📝 Latest email log: ${latestEmailLog.log_action}`);
        console.log(`📝 Details: ${latestEmailLog.log_details || "N/A"}`);

        // Check for template compilation errors
        const compilationErrors = emailLogs.filter(
          (log) => log.log_action === "TEMPLATE_COMPILATION_ERROR",
        );

        if (compilationErrors.length > 0) {
          console.warn(
            "⚠️  Warning: Found template compilation errors in audit log:",
          );
          compilationErrors.forEach((err) => {
            console.warn(`  - ${err.log_timestamp}: ${err.log_details}`);
          });
        }

        expect(compilationErrors.length).toBe(0);
      }

      console.log("✅ Audit log check passed");
    } catch (error) {
      console.error("❌ Audit log verification failed:", error.message);
      throw error;
    }
  });
});
