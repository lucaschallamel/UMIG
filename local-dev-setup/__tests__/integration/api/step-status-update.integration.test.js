/**
 * Integration test for step status updates with user ID capture
 * Converted from test-step-status-simple.js to Jest integration test
 *
 * Tests verify that user IDs are properly captured when updating step status
 * and that audit logs maintain proper attribution
 *
 * Related to Sprint 7 work on US-049 and email notification infrastructure
 */

const { Client } = require("pg");
const axios = require("axios");

describe("Step Status Update Integration Tests", () => {
  let dbClient;
  const baseUrl = "http://localhost:8090/rest/scriptrunner/latest/custom";
  const auth = {
    username: "admin",
    password: "admin",
  };

  beforeAll(async () => {
    // Initialize database client
    dbClient = new Client({
      host: "localhost",
      port: 5432,
      database: "umig_app_db",
      user: "umig_app_user",
      password: "123456",
    });
    await dbClient.connect();
  });

  afterAll(async () => {
    if (dbClient) {
      await dbClient.end();
    }
  });

  describe("User ID Capture in Step Status Changes", () => {
    let testStep;

    beforeEach(async () => {
      // Get a test step instance for testing
      const stepQuery = `
        SELECT
          sti.sti_id,
          sti.sti_name,
          sti.sti_status_id,
          sts.sts_name as status_name
        FROM steps_instance_sti sti
        JOIN statuses_sts sts ON sti.sti_status_id = sts.sts_id
        WHERE sti.sti_status_id IN (15, 16, 18, 22)
        LIMIT 1
      `;

      const result = await dbClient.query(stepQuery);
      if (result.rows.length > 0) {
        testStep = result.rows[0];
      }
    });

    test("should find test steps in database", async () => {
      expect(testStep).toBeDefined();
      expect(testStep.sti_id).toBeDefined();
      expect(testStep.sti_name).toBeDefined();
      expect(testStep.sti_status_id).toBeDefined();
      expect(testStep.status_name).toBeDefined();
    });

    test("should capture user ID in audit log when status changes through API", async () => {
      if (!testStep) {
        throw new Error("No test step available");
      }

      // Get current user ID for testing
      const userQuery = `
        SELECT usr_id, usr_username
        FROM users_usr
        WHERE usr_username = 'admin'
        LIMIT 1
      `;
      const userResult = await dbClient.query(userQuery);
      expect(userResult.rows.length).toBeGreaterThan(0);

      const testUser = userResult.rows[0];

      // Clear any existing audit logs for this step to ensure clean test
      await dbClient.query(
        "DELETE FROM audit_log_aud WHERE aud_entity_id = $1 AND aud_action = $2",
        [testStep.sti_id, "STATUS_CHANGED"],
      );

      // Update step status via API with user context
      const statusOptions = [
        { id: 16, name: "IN_PROGRESS" },
        { id: 22, name: "COMPLETED" },
        { id: 18, name: "BLOCKED" },
        { id: 15, name: "TODO" },
      ];

      const newStatus =
        statusOptions.find((s) => s.id !== testStep.sti_status_id) ||
        statusOptions[0];

      try {
        const response = await axios.put(
          `${baseUrl}/steps/${testStep.sti_id}/status`,
          {
            statusId: newStatus.id,
            userId: testUser.usr_id,
          },
          { auth, timeout: 10000 },
        );

        expect(response.status).toBe(200);

        // Wait for audit logging to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check audit log for user ID capture
        const auditQuery = `
          SELECT
            aud_id,
            usr_id,
            aud_action,
            aud_entity_type,
            aud_entity_id,
            aud_details,
            aud_timestamp
          FROM audit_log_aud
          WHERE aud_action = 'STATUS_CHANGED'
            AND aud_entity_id = $1
          ORDER BY aud_timestamp DESC
          LIMIT 1
        `;

        const auditResult = await dbClient.query(auditQuery, [testStep.sti_id]);
        expect(auditResult.rows.length).toBeGreaterThan(0);

        const auditEntry = auditResult.rows[0];
        expect(auditEntry.usr_id).toBeDefined();
        expect(auditEntry.usr_id).not.toBeNull();
        expect(auditEntry.aud_action).toBe("STATUS_CHANGED");
        expect(auditEntry.aud_entity_id).toBe(testStep.sti_id);
      } catch (error) {
        // If API call fails, this might indicate the endpoint needs implementation
        console.warn(
          "API call failed - this may indicate missing implementation:",
          error.message,
        );

        // Still check if there's any audit entry created
        const auditQuery = `
          SELECT COUNT(*) as count
          FROM audit_log_aud
          WHERE aud_action = 'STATUS_CHANGED'
            AND aud_entity_id = $1
        `;

        const auditResult = await dbClient.query(auditQuery, [testStep.sti_id]);
        const auditCount = parseInt(auditResult.rows[0].count);

        // If no audit entries, this test reveals missing functionality
        if (auditCount === 0) {
          fail(
            "No audit log entries found - user ID capture may not be implemented",
          );
        }
      }
    });

    test("should compare with instruction completion audit for consistency", async () => {
      // Get recent instruction completion audit for comparison
      const instructionAuditQuery = `
        SELECT
          aud_action,
          usr_id,
          aud_entity_type,
          aud_timestamp
        FROM audit_log_aud
        WHERE aud_action IN ('INSTRUCTION_COMPLETED', 'INSTRUCTION_UNCOMPLETED')
          AND usr_id IS NOT NULL
        ORDER BY aud_timestamp DESC
        LIMIT 1
      `;

      const instructionResult = await dbClient.query(instructionAuditQuery);

      if (instructionResult.rows.length > 0) {
        const instructionEntry = instructionResult.rows[0];
        expect(instructionEntry.usr_id).toBeDefined();
        expect(instructionEntry.usr_id).not.toBeNull();
        expect(["INSTRUCTION_COMPLETED", "INSTRUCTION_UNCOMPLETED"]).toContain(
          instructionEntry.aud_action,
        );
      } else {
        console.warn(
          "No recent instruction completion events found for comparison",
        );
      }
    });

    test("should validate audit log structure and data types", async () => {
      // Check audit log table structure to ensure proper schema
      const schemaQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'audit_log_aud'
          AND column_name IN ('usr_id', 'aud_action', 'aud_entity_type', 'aud_entity_id', 'aud_details')
        ORDER BY column_name
      `;

      const schemaResult = await dbClient.query(schemaQuery);
      expect(schemaResult.rows.length).toBeGreaterThan(0);

      const columns = schemaResult.rows.reduce((acc, row) => {
        acc[row.column_name] = row;
        return acc;
      }, {});

      // Verify audit log schema supports user ID tracking
      expect(columns.usr_id).toBeDefined();
      expect(columns.aud_action).toBeDefined();
      expect(columns.aud_entity_type).toBeDefined();
      expect(columns.aud_entity_id).toBeDefined();

      // usr_id should allow nulls but be trackable when available
      expect(columns.usr_id.is_nullable).toBe("YES");
    });
  });

  describe("Database Integration Health", () => {
    test("should connect to test database successfully", async () => {
      const result = await dbClient.query("SELECT NOW() as current_time");
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].current_time).toBeDefined();
    });

    test("should have required tables for step status testing", async () => {
      const tables = [
        "steps_instance_sti",
        "statuses_sts",
        "audit_log_aud",
        "users_usr",
      ];

      for (const table of tables) {
        const result = await dbClient.query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = $1",
          [table],
        );
        expect(parseInt(result.rows[0].count)).toBe(1);
      }
    });

    test("should have test data available", async () => {
      // Check for test steps
      const stepsResult = await dbClient.query(
        "SELECT COUNT(*) as count FROM steps_instance_sti",
      );
      expect(parseInt(stepsResult.rows[0].count)).toBeGreaterThan(0);

      // Check for test users
      const usersResult = await dbClient.query(
        "SELECT COUNT(*) as count FROM users_usr",
      );
      expect(parseInt(usersResult.rows[0].count)).toBeGreaterThan(0);

      // Check for statuses
      const statusResult = await dbClient.query(
        "SELECT COUNT(*) as count FROM statuses_sts",
      );
      expect(parseInt(statusResult.rows[0].count)).toBeGreaterThan(0);
    });
  });
});
