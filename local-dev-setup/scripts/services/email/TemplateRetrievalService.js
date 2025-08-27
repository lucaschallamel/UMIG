import pkg from "pg";
const { Client } = pkg;

/**
 * Enhanced Email Template Retrieval Service
 *
 * Connects to the UMIG database and retrieves email templates
 * for enhanced mobile-responsive email notifications
 *
 * FEATURES:
 * - PostgreSQL database connection management
 * - Email template retrieval by type
 * - Groovy GString placeholder population
 * - Template validation and error handling
 *
 * SUPPORTED TEMPLATE TYPES:
 * - STEP_STATUS_CHANGED
 * - STEP_OPENED
 * - INSTRUCTION_COMPLETED
 * - INSTRUCTION_UNCOMPLETED (future)
 *
 * @author Lucas Challamel
 * @version 2.0 - Consolidated and standardized
 * @created 2025-08-27
 * @updated 2025-08-27 - Housekeeping consolidation
 */
class TemplateRetrievalService {
  constructor() {
    this.dbConfig = {
      host: "localhost",
      port: 5432,
      database: "umig_app_db",
      user: "umig_app_user",
      password: "123456",
    };
  }

  /**
   * Get email template by type from database
   * @param {string} templateType - The template type (e.g., 'STEP_OPENED', 'INSTRUCTION_COMPLETED')
   * @returns {Promise<Object>} Template object with subject and body_html
   */
  async getTemplateByType(templateType) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();
      console.log(`Retrieving template for type: ${templateType}`);

      const query = `
                SELECT emt_name, emt_subject, emt_body_html, emt_type 
                FROM email_templates_emt 
                WHERE emt_type = $1 AND emt_is_active = true
                ORDER BY emt_created_date DESC
                LIMIT 1
            `;

      const result = await client.query(query, [templateType]);

      if (result.rows.length === 0) {
        throw new Error(`No template found for type: ${templateType}`);
      }

      const template = result.rows[0];
      console.log(`Found template: ${template.emt_name}`);

      return {
        name: template.emt_name,
        subject: template.emt_subject,
        bodyHtml: template.emt_body_html,
        type: template.emt_type,
      };
    } catch (error) {
      console.error("Database error:", error.message);
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Get all active email templates from database
   * @returns {Promise<Array>} Array of template objects
   */
  async getAllActiveTemplates() {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();
      console.log("Retrieving all active templates");

      const query = `
                SELECT emt_name, emt_subject, emt_body_html, emt_type 
                FROM email_templates_emt 
                WHERE emt_is_active = true
                ORDER BY emt_type, emt_created_date DESC
            `;

      const result = await client.query(query);
      console.log(`Found ${result.rows.length} active templates`);

      return result.rows.map((row) => ({
        name: row.emt_name,
        subject: row.emt_subject,
        bodyHtml: row.emt_body_html,
        type: row.emt_type,
      }));
    } catch (error) {
      console.error("Database error:", error.message);
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Populate template with test data
   * @param {string} templateHtml - The HTML template with placeholders
   * @param {Object} data - Test data to populate the template
   * @returns {string} Populated HTML template
   */
  populateTemplate(templateHtml, data = {}) {
    // Default test data matching the expected structure
    const defaultData = {
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
    };

    const mergedData = { ...defaultData, ...data };
    let populatedHtml = templateHtml;

    // Replace Groovy GString placeholders with actual values
    // Handle nested object properties
    populatedHtml = populatedHtml.replace(
      /\$\{stepInstance\.(\w+)(?: \?\: "([^"]*)")?\}/g,
      (match, prop, defaultVal) => {
        return mergedData.stepInstance[prop] || defaultVal || "N/A";
      },
    );

    populatedHtml = populatedHtml.replace(
      /\$\{instruction\.(\w+)(?: \?\: "([^"]*)")?\}/g,
      (match, prop, defaultVal) => {
        return mergedData.instruction[prop] || defaultVal || "N/A";
      },
    );

    // Handle simple variables
    populatedHtml = populatedHtml.replace(/\$\{(\w+)\}/g, (match, prop) => {
      return mergedData[prop] || match;
    });

    return populatedHtml;
  }
}

export default TemplateRetrievalService;
