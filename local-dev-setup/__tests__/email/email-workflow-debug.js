#!/usr/bin/env node

/**
 * Email Workflow Debug Test
 *
 * This script simulates the exact email workflow that should happen when
 * a status change occurs in stepView/iterationView to identify the silent failure.
 */

import { Client } from "pg";
import chalk from "chalk";
import nodemailer from "nodemailer";
import fetch from "node-fetch";

// Database configuration
const dbConfig = {
  host: "localhost",
  port: 5432,
  database: "umig_app_db",
  user: "umig_app_user",
  password: "123456",
};

async function testEmailWorkflow() {
  console.log(chalk.blue.bold("\n🔍 UMIG Email Workflow Debug Test"));
  console.log(chalk.blue("====================================\n"));

  const client = new Client(dbConfig);

  try {
    // Connect to database
    await client.connect();
    console.log(chalk.green("✅ Database connected"));

    // Step 1: Get a sample step instance with all context
    console.log(
      chalk.yellow("\n📋 Step 1: Getting step instance with full context..."),
    );

    const stepQuery = `
      SELECT
        sti.sti_id as step_instance_id,
        sti.sti_name as step_instance_name,
        sti.sti_status as current_status_id,
        stm.stm_name as step_master_name,
        mig.mig_name as migration_code,
        ite.ite_name as iteration_code,
        tms.tms_name as owner_team_name,
        tms.tms_email as owner_team_email
      FROM steps_instance_sti sti
      INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
      LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
      LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
      LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
      LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
      LEFT JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
      LEFT JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
      WHERE sti.sti_name IS NOT NULL
      AND mig.mig_name IS NOT NULL
      AND ite.ite_name IS NOT NULL
      LIMIT 1
    `;

    const stepResult = await client.query(stepQuery);
    if (stepResult.rows.length === 0) {
      console.log(chalk.red("❌ No suitable step instance found for testing"));
      return;
    }

    const step = stepResult.rows[0];
    console.log(chalk.green(`✅ Found step: ${step.step_instance_name}`));
    console.log(chalk.gray(`   Step ID: ${step.step_instance_id}`));
    console.log(chalk.gray(`   Migration: ${step.migration_code}`));
    console.log(chalk.gray(`   Iteration: ${step.iteration_code}`));
    console.log(
      chalk.gray(
        `   Owner Team: ${step.owner_team_name} (${step.owner_team_email})`,
      ),
    );

    // Step 2: Check if email templates exist
    console.log(chalk.yellow("\n📋 Step 2: Checking email templates..."));

    const templateQuery = `
      SELECT emt_type, emt_subject, emt_body_html, emt_is_active
      FROM email_templates_emt
      WHERE emt_type IN ('STEP_STATUS_CHANGED', 'STEP_STATUS_CHANGED_WITH_URL')
      AND emt_is_active = true
    `;

    const templateResult = await client.query(templateQuery);
    console.log(
      chalk.green(
        `✅ Found ${templateResult.rows.length} active email templates`,
      ),
    );

    templateResult.rows.forEach((template) => {
      console.log(
        chalk.gray(`   ${template.emt_type}: ${template.emt_subject}`),
      );
    });

    if (templateResult.rows.length === 0) {
      console.log(
        chalk.red(
          "❌ No active email templates found - this could be the issue!",
        ),
      );
      return;
    }

    // Step 3: Test MailHog connectivity
    console.log(chalk.yellow("\n📋 Step 3: Testing MailHog connectivity..."));

    const transporter = nodemailer.createTransport({
      host: "localhost",
      port: 1025,
      secure: false,
      auth: false,
    });

    try {
      await transporter.verify();
      console.log(chalk.green("✅ MailHog SMTP connection successful"));
    } catch (smtpError) {
      console.log(
        chalk.red(`❌ MailHog SMTP connection failed: ${smtpError.message}`),
      );
      console.log(
        chalk.yellow("   This could be the cause of the silent email failure!"),
      );
    }

    // Step 4: Test actual email send
    console.log(chalk.yellow("\n📋 Step 4: Testing actual email send..."));

    const testEmail = {
      from: "umig-system@company.com",
      to: step.owner_team_email || "test@example.com",
      subject: `[UMIG TEST] Step Status Debug Test`,
      html: `
        <html>
          <body>
            <h2>Email Workflow Test</h2>
            <p>Step: ${step.step_instance_name}</p>
            <p>Migration: ${step.migration_code}</p>
            <p>Iteration: ${step.iteration_code}</p>
            <p>This email was sent during debugging to identify the silent failure.</p>
          </body>
        </html>
      `,
    };

    try {
      const info = await transporter.sendMail(testEmail);
      console.log(chalk.green(`✅ Test email sent successfully`));
      console.log(chalk.gray(`   Message ID: ${info.messageId}`));

      // Check MailHog message count
      const mailhogResponse = await fetch(
        "http://localhost:8025/api/v2/messages",
      );
      const mailhogData = await mailhogResponse.json();
      console.log(
        chalk.blue(`📬 MailHog inbox now has ${mailhogData.count} messages`),
      );
    } catch (emailError) {
      console.log(chalk.red(`❌ Test email failed: ${emailError.message}`));
      console.log(
        chalk.yellow("   This is likely the root cause of the silent failure!"),
      );
    }

    // Step 5: Test team lookup for notifications
    console.log(
      chalk.yellow("\n📋 Step 5: Testing team lookup for notifications..."),
    );

    const teamQuery = `
      SELECT DISTINCT tms.tms_id, tms.tms_name, tms.tms_email
      FROM teams_tms tms
      WHERE tms.tms_id IN (
          -- Owner team
          SELECT stm.tms_id_owner
          FROM steps_instance_sti sti
          INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
          WHERE sti.sti_id = $1
          UNION
          -- Impacted teams
          SELECT sit.tms_id
          FROM steps_instance_sti sti
          INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
          INNER JOIN steps_master_stm_x_teams_tms_impacted sit ON stm.stm_id = sit.stm_id
          WHERE sti.sti_id = $1
      )
      AND tms.tms_email IS NOT NULL
      AND tms.tms_email != ''
    `;

    const teamResult = await client.query(teamQuery, [step.step_instance_id]);
    console.log(
      chalk.green(
        `✅ Found ${teamResult.rows.length} teams with valid email addresses`,
      ),
    );

    if (teamResult.rows.length === 0) {
      console.log(chalk.red("❌ No teams found with valid email addresses!"));
      console.log(
        chalk.yellow("   This could be why emails are failing silently"),
      );
    } else {
      teamResult.rows.forEach((team) => {
        console.log(chalk.gray(`   ${team.tms_name}: ${team.tms_email}`));
      });
    }

    // Step 6: Summary and recommendations
    console.log(chalk.blue.bold("\n📊 Summary and Analysis:"));
    console.log(chalk.blue("=========================\n"));

    const issues = [];
    const successes = [];

    if (templateResult.rows.length > 0) {
      successes.push("Email templates exist and are active");
    } else {
      issues.push("No active email templates found");
    }

    if (teamResult.rows.length > 0) {
      successes.push(
        `Found ${teamResult.rows.length} teams with valid email addresses`,
      );
    } else {
      issues.push("No teams found with valid email addresses");
    }

    try {
      await transporter.verify();
      successes.push("MailHog SMTP connectivity works");
    } catch {
      issues.push("MailHog SMTP connectivity failed");
    }

    console.log(chalk.green.bold("✅ Successes:"));
    successes.forEach((success) => console.log(chalk.green(`   • ${success}`)));

    if (issues.length > 0) {
      console.log(chalk.red.bold("\n❌ Potential Issues:"));
      issues.forEach((issue) => console.log(chalk.red(`   • ${issue}`)));
      console.log(chalk.yellow("\n💡 Recommendations:"));
      console.log(
        chalk.yellow(
          "   1. Check the EnhancedEmailService logs during an actual workflow",
        ),
      );
      console.log(
        chalk.yellow(
          "   2. Verify team email addresses are properly configured",
        ),
      );
      console.log(
        chalk.yellow("   3. Ensure email templates are active in the database"),
      );
      console.log(
        chalk.yellow("   4. Test SMTP connectivity during the actual workflow"),
      );
    } else {
      console.log(
        chalk.green.bold("\n🎉 All components appear to be working!"),
      );
      console.log(
        chalk.yellow(
          "   The issue may be in the integration logic or exception handling.",
        ),
      );
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error during workflow test: ${error.message}`));
    console.error(chalk.gray(error.stack));
  } finally {
    await client.end();
    console.log(chalk.gray("\n🔒 Database connection closed"));
  }
}

// Run the test
testEmailWorkflow().catch(console.error);
