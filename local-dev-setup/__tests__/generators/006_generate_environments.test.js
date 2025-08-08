import { client } from "../../scripts/lib/db.js";
import {
  generateAllEnvironments,
  eraseEnvironmentsTable,
} from "../../scripts/generators/006_generate_environments.js";
import { faker } from "@faker-js/faker";

// Mock dependencies
jest.mock("../../scripts/lib/db.js", () => ({ client: { query: jest.fn() } }));
jest.mock("@faker-js/faker", () => ({
  faker: {
    helpers: {
      arrayElement: jest.fn(),
      arrayElements: jest.fn(),
    },
    number: { int: jest.fn() },
  },
}));

const mockEnvironments = [
  { name: "PROD", description: "Production environment" },
  { name: "EV1", description: "Environment 1" },
  { name: "EV2", description: "Environment 2" },
  { name: "EV3", description: "Environment 3" },
  { name: "EV4", description: "Environment 4" },
  { name: "EV5", description: "Environment 5" },
];

describe("Environments Generator (06_generate_environments.js)", () => {
  let dbData;
  beforeEach(() => {
    client.query = jest.fn(); // Forcefully create a new mock function for each test
    dbData = mockDbWithData();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Setup default faker mocks
    faker.helpers.arrayElement.mockImplementation((arr) => arr[0]);
    faker.helpers.arrayElements.mockImplementation((arr, num) =>
      arr.slice(0, num),
    );
    faker.number.int.mockReturnValue(1); // Default to 1 to keep tests predictable
  });

  const mockDbWithData = () => {
    // This counter is scoped to each call of mockDbWithData, ensuring it resets for each test.
    let envInsertCount = 0;
    const dbData = {
      apps: [{ app_id: "app-1" }],
      iterations: [
        { ite_id: "ite-1", itt_code: "RUN", ite_name: "RUN Iteration 1" },
        { ite_id: "ite-2", itt_code: "DR", ite_name: "DR Iteration 1" },
        {
          ite_id: "ite-3",
          itt_code: "CUTOVER",
          ite_name: "CUTOVER Iteration 1",
        },
      ],
      envRoles: [
        { enr_id: "role-1", enr_name: "PROD" },
        { enr_id: "role-2", enr_name: "TEST" },
        { enr_id: "role-3", enr_name: "BACKUP" },
      ],
      envs: [], // Environments will be created dynamically
    };

    // Track created environments by name
    const envByName = {};

    client.query.mockImplementation((sql, params) => {
      if (sql.includes("SELECT app_id FROM applications_app"))
        return Promise.resolve({ rows: dbData.apps });
      if (sql.includes("SELECT ite_id, itt_code, ite_name FROM iterations_ite"))
        return Promise.resolve({ rows: dbData.iterations });
      if (sql.includes("SELECT enr_id, enr_name FROM environment_roles_enr"))
        return Promise.resolve({ rows: dbData.envRoles });
      if (sql.includes("INSERT INTO environments_env")) {
        const envName = params[0];
        envInsertCount++;
        const envId = `env-${envInsertCount}`;
        envByName[envName] = envId;
        return Promise.resolve({
          rows: [{ env_id: envId, env_name: envName }],
        });
      }
      if (sql.includes("SELECT env_id, env_name FROM environments_env")) {
        const rows = Object.entries(envByName).map(([name, id]) => ({
          env_id: id,
          env_name: name,
        }));
        return Promise.resolve({ rows });
      }
      if (sql.includes("SELECT") && sql.includes("ite.itt_code")) {
        // Summary query
        return Promise.resolve({
          rows: [
            { itt_code: "RUN", iteration_count: 1, iterations_with_envs: 1 },
            { itt_code: "DR", iteration_count: 1, iterations_with_envs: 1 },
            {
              itt_code: "CUTOVER",
              iteration_count: 1,
              iterations_with_envs: 1,
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    dbData.envByName = envByName;
    return dbData;
  };

  describe("generateAllEnvironments", () => {
    it("should call eraseEnvironmentsTable when erase option is true", async () => {
      mockDbWithData();
      await generateAllEnvironments(mockEnvironments, { erase: true });
      const truncateCalls = client.query.mock.calls.filter((c) =>
        c[0].startsWith("TRUNCATE"),
      );
      expect(truncateCalls.length).toBe(3);
      expect(truncateCalls.map((c) => c[0])).toEqual(
        expect.arrayContaining([
          'TRUNCATE TABLE "environments_env_x_applications_app" RESTART IDENTITY CASCADE',
          'TRUNCATE TABLE "environments_env_x_iterations_ite" RESTART IDENTITY CASCADE',
          'TRUNCATE TABLE "environments_env" RESTART IDENTITY CASCADE',
        ]),
      );
    });

    it("should insert all environments from config", async () => {
      await generateAllEnvironments(mockEnvironments, {});

      const insertCalls = client.query.mock.calls.filter(
        (c) =>
          c[0] &&
          c[0].includes("INSERT INTO environments_env") &&
          c[0].includes("env_code"),
      );
      expect(insertCalls.length).toBe(mockEnvironments.length);
      // Check first 3 parameters (env_code, env_name, env_description), audit fields are dynamic
      expect(insertCalls[0][1].slice(0, 3)).toEqual([
        "PROD",
        "PROD",
        "Production environment",
      ]);
      expect(insertCalls[1][1].slice(0, 3)).toEqual([
        "EV1",
        "EV1",
        "Environment 1",
      ]);
      // Verify audit fields are present (created_by, created_at, updated_by, updated_at)
      expect(insertCalls[0][1].length).toBe(7);
      expect(insertCalls[0][1][3]).toBe("generator"); // created_by
      expect(insertCalls[0][1][5]).toBe("generator"); // updated_by
    });

    it("should link environments to apps", async () => {
      await generateAllEnvironments(mockEnvironments, {});

      const appLinks = client.query.mock.calls.filter(
        (c) => c[0] && c[0].includes("environments_env_x_applications_app"),
      );
      // Each environment gets linked to 1 app (based on our faker mock)
      expect(appLinks.length).toBe(mockEnvironments.length);
    });

    it("should assign environments to iterations based on iteration type", async () => {
      // Set up faker to return predictable non-PROD environments
      faker.helpers.arrayElement.mockImplementation((arr) => {
        // For non-PROD selections, always return EV1
        return arr.includes("EV1") ? "EV1" : arr[0];
      });

      await generateAllEnvironments(mockEnvironments, {});

      const iterLinks = client.query.mock.calls.filter(
        (c) =>
          c[0] && c[0].includes("environments_env_x_iterations_ite") && c[1],
      );

      // Each iteration should have 3 role assignments (PROD, TEST, BACKUP)
      expect(iterLinks.length).toBe(9); // 3 iterations × 3 roles

      // Find CUTOVER iteration assignments
      const cutoverProdAssignment = iterLinks.find(
        (call) => call[1] && call[1][1] === "ite-3" && call[1][2] === "role-1", // CUTOVER iteration, PROD role
      );

      // CUTOVER should have PROD environment in PROD role
      expect(cutoverProdAssignment).toBeDefined();
      expect(cutoverProdAssignment[1][0]).toBe("env-1"); // PROD environment ID

      // Find RUN/DR iteration PROD role assignments
      const runProdAssignment = iterLinks.find(
        (call) => call[1] && call[1][1] === "ite-1" && call[1][2] === "role-1", // RUN iteration, PROD role
      );

      // RUN should NOT have PROD environment in any role
      expect(runProdAssignment).toBeDefined();
      expect(runProdAssignment[1][0]).not.toBe("env-1"); // Not PROD environment ID
    });

    it("should handle cases with no iterations to link", async () => {
      client.query.mockImplementation((sql) => {
        if (
          sql.includes("SELECT ite_id, itt_code, ite_name FROM iterations_ite")
        )
          return Promise.resolve({ rows: [] });
        if (sql.includes("INSERT INTO environments_env"))
          return Promise.resolve({
            rows: [{ env_id: "test-id", env_name: "TEST" }],
          });
        return Promise.resolve({ rows: [] });
      });

      await generateAllEnvironments(mockEnvironments, {});
      const iterLinks = client.query.mock.calls.filter(
        (c) => c[0] && c[0].includes("environments_env_x_iterations_ite"),
      );
      expect(iterLinks.length).toBe(0);
    });

    it("should use existing environments if none are created", async () => {
      const existingEnvs = mockEnvironments.map((env, i) => ({
        env_id: `existing-${i}`,
        env_name: env.name,
      }));

      client.query.mockImplementation((sql) => {
        if (sql.includes("INSERT INTO environments_env"))
          return Promise.resolve({ rows: [] }); // No new envs
        if (sql.includes("SELECT env_id, env_name FROM environments_env"))
          return Promise.resolve({ rows: existingEnvs });
        if (sql.includes("SELECT app_id FROM applications_app"))
          return Promise.resolve({ rows: dbData.apps });
        if (
          sql.includes("SELECT ite_id, itt_code, ite_name FROM iterations_ite")
        )
          return Promise.resolve({ rows: dbData.iterations });
        if (sql.includes("SELECT enr_id, enr_name FROM environment_roles_enr"))
          return Promise.resolve({ rows: dbData.envRoles });
        return Promise.resolve({ rows: [] });
      });

      await generateAllEnvironments(mockEnvironments, {});
      const linkCalls = client.query.mock.calls.filter(
        (c) => c[0] && c[0].includes("_x_"),
      );
      expect(linkCalls.length).toBeGreaterThan(0); // Should still create links
    });
  });

  describe("eraseEnvironmentsTable", () => {
    it("should truncate tables in the correct order", async () => {
      client.query.mockResolvedValue({ rows: [] });
      await eraseEnvironmentsTable(client);
      const calls = client.query.mock.calls.map((c) => c[0]);
      expect(calls).toEqual([
        'TRUNCATE TABLE "environments_env_x_applications_app" RESTART IDENTITY CASCADE',
        'TRUNCATE TABLE "environments_env_x_iterations_ite" RESTART IDENTITY CASCADE',
        'TRUNCATE TABLE "environments_env" RESTART IDENTITY CASCADE',
      ]);
    });

    it("should throw an error if truncation fails", async () => {
      const dbError = new Error("DB truncate failed");
      client.query.mockRejectedValue(dbError);
      await expect(eraseEnvironmentsTable(client)).rejects.toThrow(dbError);
    });
  });

  describe("iteration type rules", () => {
    it("should ensure every iteration gets all three roles", async () => {
      await generateAllEnvironments(mockEnvironments, {});

      const iterLinks = client.query.mock.calls.filter(
        (c) =>
          c[0] && c[0].includes("environments_env_x_iterations_ite") && c[1],
      );

      // Group by iteration
      const iterationRoles = {};
      iterLinks.forEach((call) => {
        if (call[1]) {
          const iteId = call[1][1];
          const roleId = call[1][2];
          if (!iterationRoles[iteId]) iterationRoles[iteId] = [];
          iterationRoles[iteId].push(roleId);
        }
      });

      // Each iteration should have all 3 roles
      Object.values(iterationRoles).forEach((roles) => {
        expect(roles).toHaveLength(3);
        expect(roles).toContain("role-1"); // PROD role
        expect(roles).toContain("role-2"); // TEST role
        expect(roles).toContain("role-3"); // BACKUP role
      });
    });

    it("should never assign PROD environment to RUN/DR iterations", async () => {
      await generateAllEnvironments(mockEnvironments, {});

      const iterLinks = client.query.mock.calls.filter(
        (c) =>
          c[0] && c[0].includes("environments_env_x_iterations_ite") && c[1],
      );

      // Check RUN and DR iterations
      const runDrAssignments = iterLinks.filter(
        (call) => call[1] && (call[1][1] === "ite-1" || call[1][1] === "ite-2"), // RUN or DR iterations
      );

      runDrAssignments.forEach((assignment) => {
        expect(assignment[1][0]).not.toBe("env-1"); // Should not be PROD environment
      });
    });

    it("should always assign PROD environment to PROD role in CUTOVER iterations", async () => {
      await generateAllEnvironments(mockEnvironments, {});

      const iterLinks = client.query.mock.calls.filter(
        (c) =>
          c[0] && c[0].includes("environments_env_x_iterations_ite") && c[1],
      );

      // Find CUTOVER + PROD role assignment
      const cutoverProdAssignment = iterLinks.find(
        (call) =>
          call[1] &&
          call[1][1] === "ite-3" && // CUTOVER iteration
          call[1][2] === "role-1", // PROD role
      );

      expect(cutoverProdAssignment).toBeDefined();
      expect(cutoverProdAssignment[1][0]).toBe("env-1"); // Should be PROD environment
    });
  });
});
