#!/usr/bin/env node
/**
 * TD-015: Email Template Preview Renderer
 * Renders email templates with sample data to show actual appearance
 */

import pg from "pg";
import { createTransport } from "nodemailer";
import chalk from "chalk";

const { Client } = pg;

// PostgreSQL connection
const dbConfig = {
  host: "localhost",
  port: 5432,
  database: "umig_app_db",
  user: "umig_app_user",
  password: "123456",
};

// MailHog SMTP connection
const smtpConfig = {
  host: "localhost",
  port: 1025,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
};

// Sample data for template rendering (realistic values)
const sampleData = {
  STEP_STATUS_CHANGED: {
    stepInstance: {
      sti_id: "c73272a2-6fb3-4e1e-8382-8d64c8739465",
      sti_code: "PHI-001-STP-003",
      sti_name: "Configure Production Database",
      sti_description:
        "Set up production PostgreSQL instance with replication and backup",
      sti_duration_minutes: 45,
      environment_name: "Production",
      team_name: "Database Team",
      predecessor_code: "PHI-001-STP-002",
    },
    migrationCode: "MIG-2025-Q1-001",
    iterationCode: "IT-001",
    oldStatus: "IN_PROGRESS",
    newStatus: "COMPLETED",
    statusColor: "#28a745",
    changedBy: "John Smith",
    changedAt: new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    hasStepViewUrl: true,
    stepViewUrl:
      "http://localhost:8090/display/UMIG/stepView?stepId=c73272a2-6fb3-4e1e-8382-8d64c8739465",
    confluenceBaseUrl: "http://localhost:8090",
    stepViewPageId: "12345678",
    recentComments: [
      {
        author_name: "Jane Doe",
        created_at: "Sep 30, 2025 10:15 AM",
        comment_text:
          "Database backup completed successfully. All pre-checks passed.",
      },
      {
        author_name: "Bob Wilson",
        created_at: "Sep 30, 2025 12:45 PM",
        comment_text:
          "Replication configured and tested. Ready for deployment.",
      },
    ],
    completedInstructions: [
      { ini_name: "Backup current data", ini_status: "COMPLETED" },
      { ini_name: "Stop application services", ini_status: "COMPLETED" },
      { ini_name: "Deploy new schema", ini_status: "COMPLETED" },
    ],
    pendingInstructions: [
      { ini_name: "Restart services", ini_status: "PENDING" },
      { ini_name: "Verify connectivity", ini_status: "PENDING" },
    ],
  },
  STEP_OPENED: {
    stepInstance: {
      sti_id: "edf5f712-5627-49ed-97f2-912c5dc793d1",
      sti_code: "PHI-002-STP-001",
      sti_name: "Application Deployment Verification",
      sti_description:
        "Verify all application components deployed successfully",
      sti_duration_minutes: 30,
      environment_name: "UAT",
      team_name: "DevOps Team",
    },
    migrationCode: "MIG-2025-Q1-001",
    iterationCode: "IT-002",
    openedBy: "Alice Johnson",
    openedAt: new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    hasStepViewUrl: true,
    stepViewUrl:
      "http://localhost:8090/display/UMIG/stepView?stepId=edf5f712-5627-49ed-97f2-912c5dc793d1",
    recentComments: [],
    pendingInstructions: [
      { ini_name: "Check application logs", ini_status: "PENDING" },
      { ini_name: "Run smoke tests", ini_status: "PENDING" },
      { ini_name: "Verify API endpoints", ini_status: "PENDING" },
    ],
  },
  INSTRUCTION_COMPLETED: {
    instruction: {
      ini_id: "550e8400-e29b-41d4-a716-446655440000",
      ini_name: "Complete OWASP Security Assessment",
      ini_description: "Run OWASP ZAP scan and document findings",
    },
    stepInstance: {
      sti_id: "0c34b27f-bce4-4411-9b34-fe05d1cac97d",
      sti_code: "PHI-003-STP-005",
      sti_name: "Security Validation Phase",
      sti_description:
        "Complete all security assessments and penetration tests",
    },
    migrationCode: "MIG-2025-Q1-001",
    iterationCode: "IT-003",
    completedBy: "Mike Chen",
    completedAt: new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    hasStepViewUrl: true,
    stepViewUrl:
      "http://localhost:8090/display/UMIG/stepView?stepId=0c34b27f-bce4-4411-9b34-fe05d1cac97d",
    recentComments: [
      {
        author_name: "Security Team",
        created_at: "Sep 30, 2025 2:30 PM",
        comment_text:
          "OWASP scan completed with 3 medium severity findings. Remediation tickets created.",
      },
    ],
    completedInstructions: [
      {
        ini_name: "Complete OWASP Security Assessment",
        ini_status: "COMPLETED",
      },
      { ini_name: "SQL injection testing", ini_status: "COMPLETED" },
    ],
    pendingInstructions: [
      { ini_name: "XSS vulnerability testing", ini_status: "PENDING" },
      { ini_name: "Final security report", ini_status: "PENDING" },
    ],
  },
};

// Simple GSP-like template processor (JavaScript implementation)
function processTemplate(template, data) {
  let processed = template;

  // Replace ${variable} expressions
  processed = processed.replace(/\$\{([^}]+)\}/g, (match, expression) => {
    try {
      // Handle ternary operators
      if (expression.includes("?") && expression.includes(":")) {
        const ternaryMatch = expression.match(/(.+?)\s*\?\s*(.+?)\s*:\s*(.+)/);
        if (ternaryMatch) {
          const [, condition, trueValue, falseValue] = ternaryMatch;
          const conditionResult = evalExpression(condition.trim(), data);
          return conditionResult
            ? evalExpression(trueValue.trim(), data)
            : evalExpression(falseValue.trim(), data);
        }
      }

      // Simple property access
      return evalExpression(expression.trim(), data) || "";
    } catch (e) {
      return match; // Keep original if evaluation fails
    }
  });

  // Process <% %> scriptlets (simplified - just handle if statements and loops)
  processed = processed.replace(
    /<% if \(([^)]+)\) \{ %>([\s\S]*?)<% \} %>/g,
    (match, condition, content) => {
      try {
        const result = evalExpression(condition.trim(), data);
        return result ? content : "";
      } catch (e) {
        return "";
      }
    },
  );

  // Process loops (simplified)
  processed = processed.replace(
    /<% ([^.]+)\.take\((\d+)\)\.eachWithIndex \{ ([^,]+), ([^}]+) -> %>([\s\S]*?)<% \} %>/g,
    (match, arrayName, count, itemVar, indexVar, content) => {
      try {
        const array = evalExpression(arrayName.trim(), data);
        if (!Array.isArray(array)) return "";

        return array
          .slice(0, parseInt(count))
          .map((item, index) => {
            let itemContent = content;
            // Replace item variable references
            itemContent = itemContent.replace(
              new RegExp(`\\$\\{${itemVar}\\.(\\w+)\\}`, "g"),
              (m, prop) => item[prop] || "",
            );
            itemContent = itemContent.replace(
              new RegExp(`\\$\\{${indexVar}\\}`, "g"),
              index,
            );
            return itemContent;
          })
          .join("");
      } catch (e) {
        return "";
      }
    },
  );

  return processed;
}

function evalExpression(expr, data) {
  // Handle property access like stepInstance.sti_name
  const parts = expr.split(".");
  let value = data;

  for (const part of parts) {
    // Handle && operator
    if (part.includes("&&")) {
      const andParts = part.split("&&").map((p) => p.trim());
      return andParts.every((p) => evalExpression(p, data));
    }

    // Handle string concatenation
    if (part.includes("+")) {
      const concatParts = part.split("+").map((p) => p.trim());
      return concatParts
        .map((p) => {
          if (p.startsWith('"') && p.endsWith('"')) {
            return p.slice(1, -1);
          }
          return evalExpression(p, data);
        })
        .join("");
    }

    if (value === undefined || value === null) return "";
    value = value[part];
  }

  return value;
}

async function sendRenderedEmail(templateType) {
  console.log(
    chalk.blue(`\n📧 Rendering ${templateType} template with real data...\n`),
  );

  // Connect to database
  const client = new Client(dbConfig);
  await client.connect();

  // Get template from database
  const result = await client.query(
    "SELECT emt_subject, emt_body_html FROM email_templates_emt WHERE emt_type = $1 AND emt_is_active = true",
    [templateType],
  );

  await client.end();

  if (result.rows.length === 0) {
    console.log(chalk.red(`❌ Template ${templateType} not found in database`));
    return;
  }

  const template = result.rows[0];
  const data = sampleData[templateType];

  // Process template with sample data
  const renderedSubject = processTemplate(template.emt_subject, data);
  const renderedBody = processTemplate(template.emt_body_html, data);

  console.log(chalk.green(`✅ Template processed successfully`));
  console.log(chalk.gray(`   Subject: ${renderedSubject}`));
  console.log(chalk.gray(`   Body size: ${renderedBody.length} bytes`));

  // Send to MailHog
  const transporter = createTransport(smtpConfig);

  const mailOptions = {
    from: '"UMIG Rendered Preview" <umig-preview@localhost>',
    to: `preview-${templateType.toLowerCase()}@localhost`,
    subject: renderedSubject,
    html: renderedBody,
  };

  await transporter.sendMail(mailOptions);

  console.log(
    chalk.green(
      `✅ Email sent to MailHog: preview-${templateType.toLowerCase()}@localhost\n`,
    ),
  );
}

async function main() {
  console.log(chalk.bold.blue("\n=========================================="));
  console.log(chalk.bold.blue("TD-015: Email Template Preview Renderer"));
  console.log(chalk.bold.blue("==========================================\n"));

  console.log(
    chalk.yellow(
      "This script renders email templates with realistic sample data",
    ),
  );
  console.log(
    chalk.yellow(
      "so you can see what the actual emails will look like in production.\n",
    ),
  );

  try {
    // Clear MailHog inbox first
    console.log(chalk.gray("Clearing MailHog inbox...\n"));
    await fetch("http://localhost:8025/api/v1/messages", { method: "DELETE" });

    // Send all 3 template types with rendered data
    await sendRenderedEmail("STEP_STATUS_CHANGED");
    await sendRenderedEmail("STEP_OPENED");
    await sendRenderedEmail("INSTRUCTION_COMPLETED");

    console.log(chalk.bold.green("=========================================="));
    console.log(chalk.bold.green("✅ All 3 preview emails sent successfully!"));
    console.log(
      chalk.bold.green("==========================================\n"),
    );

    console.log(chalk.bold("Next Steps:"));
    console.log(chalk.gray("  1. Open http://localhost:8025"));
    console.log(
      chalk.gray('  2. Look for emails from "UMIG Rendered Preview"'),
    );
    console.log(chalk.gray("  3. Click on each email and view HTML tab"));
    console.log(chalk.gray("  4. You should now see:"));
    console.log(
      chalk.gray(
        "     • Actual step names instead of ${stepInstance.sti_name}",
      ),
    );
    console.log(chalk.gray("     • Real migration codes (MIG-2025-Q1-001)"));
    console.log(chalk.gray("     • Working StepView URLs"));
    console.log(chalk.gray("     • Rendered comments and instructions"));
    console.log(chalk.gray("     • Status badges with colors\n"));
  } catch (error) {
    console.error(chalk.bold.red("\n❌ Error:"), error.message);
    process.exit(1);
  }
}

main();
