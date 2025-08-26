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
  beforeEach(async () => {
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

    // Mock DEV environment existence (created by migration 022)
    client.query.mockImplementation((sql, params) => {
      // Always return DEV environment for existence checks
      if (sql.includes("SELECT env_id, env_name FROM environments_env WHERE env_id = 1")) {
        return Promise.resolve({ 
          rows: [{ env_id: 1, env_name: "DEV" }] 
        });
      }
      if (sql.includes("SELECT env_id FROM environments_env WHERE env_id = 1")) {
        return Promise.resolve({ 
          rows: [{ env_id: 1 }] 
        });
      }
      // Reset to default mock behavior for other queries
      return Promise.resolve({ rows: [] });
    });
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
      // DEV environment existence checks (migration 022 dependency)
      if (sql.includes("SELECT env_id, env_name FROM environments_env WHERE env_id = 1")) {
        return Promise.resolve({ 
          rows: [{ env_id: 1, env_name: "DEV" }] 
        });
      }
      if (sql.includes("SELECT env_id FROM environments_env WHERE env_id = 1")) {
        return Promise.resolve({ 
          rows: [{ env_id: 1 }] 
        });
      }
      
      // DELETE operations for erase functionality
      if (sql.includes("DELETE FROM") && sql.includes("WHERE env_id != 1")) {
        return Promise.resolve({ rowCount: 5 }); // Mock deletion of 5 environments
      }
      
      if (sql.includes("SELECT app_id FROM applications_app"))
        return Promise.resolve({ rows: dbData.apps });
      if (sql.includes("SELECT ite_id, itt_code, ite_name FROM iterations_ite"))
        return Promise.resolve({ rows: dbData.iterations });
      if (sql.includes("SELECT enr_id, enr_name FROM environment_roles_enr"))
        return Promise.resolve({ rows: dbData.envRoles });
      if (sql.includes("INSERT INTO environments_env")) {
        // Skip DEV environment (env_id=1) - it's handled by migration 022
        const envCode = params[1]; // env_code parameter
        if (envCode === "DEV") {
          return Promise.resolve({ rows: [] }); // DEV skipped
        }
        
        envInsertCount++;
        const envId = `env-${envInsertCount + 1}`; // Start from env-2 since env-1 is DEV
        envByName[envCode] = envId;
        return Promise.resolve({
          rows: [{ env_id: envId, env_name: envCode }],
        });
      }
      if (sql.includes("SELECT env_id, env_name FROM environments_env")) {
        // Always include DEV environment from migration
        const rows = [{ env_id: 1, env_name: "DEV" }];
        Object.entries(envByName).forEach(([name, id]) => {
          if (name !== "DEV") {
            rows.push({ env_id: id, env_name: name });
          }
        });
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
      
      // Check for DELETE queries that preserve DEV environment (env_id=1)
      const deleteCalls = client.query.mock.calls.filter((c) =>
        c[0] && c[0].includes("DELETE FROM") && c[0].includes("WHERE env_id != 1"),
      );
      
      expect(deleteCalls.length).toBe(3);
      expect(deleteCalls.map((c) => c[0])).toEqual(
        expect.arrayContaining([
          expect.stringContaining('DELETE FROM environments_env_x_applications_app'),
          expect.stringContaining('DELETE FROM environments_env_x_iterations_ite'),
          expect.stringContaining('DELETE FROM environments_env'),
        ]),
      );
      
      // Verify all DELETE queries preserve DEV environment
      deleteCalls.forEach((call) => {
        expect(call[0]).toContain('WHERE env_id != 1');
      });
    });

    it("should insert all environments from config except DEV", async () => {
      // Add DEV environment to mock config to test skipping behavior
      const environmentsWithDev = [{ name: "DEV", description: "Development environment" }, ...mockEnvironments];
      
      await generateAllEnvironments(environmentsWithDev, {});

      const insertCalls = client.query.mock.calls.filter(
        (c) =>
          c[0] &&
          c[0].includes("INSERT INTO environments_env") &&
          c[0].includes("env_code"),
      );
      
      // Should skip DEV environment, so only insert original mockEnvironments
      expect(insertCalls.length).toBe(mockEnvironments.length);
      
      // Verify DEV environment is not in insert calls
      const insertedEnvCodes = insertCalls.map(call => call[1][1]); // env_code is 2nd parameter
      expect(insertedEnvCodes).not.toContain("DEV");
      
      // Check first environment parameters (env_id, env_code, env_name, env_description), audit fields are dynamic
      expect(insertCalls[0][1].slice(1, 4)).toEqual([
        "PROD",
        "PROD",
        "Production environment",
      ]);
      expect(insertCalls[1][1].slice(1, 4)).toEqual([
        "EV1",
        "EV1",
        "Environment 1",
      ]);
      // Verify audit fields are present (env_id, env_code, env_name, env_description, created_by, created_at, updated_by, updated_at)
      expect(insertCalls[0][1].length).toBe(8);
      expect(insertCalls[0][1][4]).toBe("generator"); // created_by
      expect(insertCalls[0][1][6]).toBe("generator"); // updated_by
    });

    it("should link environments to apps including DEV", async () => {
      // Set up environment by name mapping including DEV
      const envByNameTest = { 
        "DEV": 1, 
        "PROD": "env-2", 
        "EV1": "env-3", 
        "EV2": "env-4",
        "EV3": "env-5",
        "EV4": "env-6",
        "EV5": "env-7"
      };
      
      client.query.mockImplementation((sql, params) => {
        // DEV environment checks
        if (sql.includes("SELECT env_id, env_name FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1, env_name: "DEV" }] });
        }
        if (sql.includes("SELECT env_id FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1 }] });
        }
        
        // Environment creation
        if (sql.includes("INSERT INTO environments_env") && params) {
          const envCode = params[1];
          if (envCode !== "DEV") {
            const envId = envByNameTest[envCode];
            return Promise.resolve({ rows: [{ env_id: envId, env_name: envCode }] });
          }
          return Promise.resolve({ rows: [] });
        }
        
        // Environment selection
        if (sql.includes("SELECT env_id, env_name FROM environments_env") && !sql.includes("WHERE")) {
          return Promise.resolve({ 
            rows: Object.entries(envByNameTest).map(([name, id]) => ({ env_id: id, env_name: name }))
          });
        }
        
        // Other standard mocks
        if (sql.includes("SELECT app_id FROM applications_app"))
          return Promise.resolve({ rows: dbData.apps });
        if (sql.includes("SELECT ite_id, itt_code, ite_name FROM iterations_ite"))
          return Promise.resolve({ rows: dbData.iterations });
        if (sql.includes("SELECT enr_id, enr_name FROM environment_roles_enr"))
          return Promise.resolve({ rows: dbData.envRoles });
          
        // Linking operations - accept all INSERT statements
        if (sql.includes("INSERT INTO"))
          return Promise.resolve({ rows: [] });
          
        return Promise.resolve({ rows: [] });
      });
      
      await generateAllEnvironments(mockEnvironments, {});

      const appLinks = client.query.mock.calls.filter(
        (c) => c[0] && c[0].includes("environments_env_x_applications_app") && c[1],
      );
      // Each environment gets linked to 1 app (based on our faker mock)
      // This includes DEV environment from migration + generated environments  
      // Expected: DEV (from migration) + 6 generated environments = 7 environments total
      expect(appLinks.length).toBeGreaterThanOrEqual(6); // At least the generated environments
    });

    it("should assign environments to iterations based on iteration type", async () => {
      // Set up environment by name mapping including DEV
      const envByNameTest = { 
        "DEV": 1, 
        "PROD": "env-2", 
        "EV1": "env-3", 
        "EV2": "env-4" 
      };
      
      // Set up faker to return predictable non-PROD environments
      faker.helpers.arrayElement.mockImplementation((arr) => {
        // For non-PROD selections, always return first non-PROD option
        if (Array.isArray(arr) && arr.length > 0) {
          return arr.includes("EV1") ? "EV1" : arr[0];
        }
        return arr[0];
      });
      
      client.query.mockImplementation((sql, params) => {
        // DEV environment checks
        if (sql.includes("SELECT env_id, env_name FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1, env_name: "DEV" }] });
        }
        if (sql.includes("SELECT env_id FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1 }] });
        }
        
        // Environment creation
        if (sql.includes("INSERT INTO environments_env") && params) {
          const envCode = params[1];
          if (envCode !== "DEV") {
            const envId = envByNameTest[envCode];
            return Promise.resolve({ rows: [{ env_id: envId, env_name: envCode }] });
          }
          return Promise.resolve({ rows: [] });
        }
        
        // Environment selection
        if (sql.includes("SELECT env_id, env_name FROM environments_env") && !sql.includes("WHERE")) {
          return Promise.resolve({ 
            rows: Object.entries(envByNameTest).map(([name, id]) => ({ env_id: id, env_name: name }))
          });
        }
        
        // Other standard mocks
        if (sql.includes("SELECT app_id FROM applications_app"))
          return Promise.resolve({ rows: dbData.apps });
        if (sql.includes("SELECT ite_id, itt_code, ite_name FROM iterations_ite"))
          return Promise.resolve({ rows: dbData.iterations });
        if (sql.includes("SELECT enr_id, enr_name FROM environment_roles_enr"))
          return Promise.resolve({ rows: dbData.envRoles });
          
        // Linking operations - accept all INSERT statements
        if (sql.includes("INSERT INTO"))
          return Promise.resolve({ rows: [] });
          
        // Summary query
        if (sql.includes("SELECT") && sql.includes("ite.itt_code")) {
          return Promise.resolve({
            rows: [
              { itt_code: "RUN", iteration_count: 1, iterations_with_envs: 1 },
              { itt_code: "DR", iteration_count: 1, iterations_with_envs: 1 },
              { itt_code: "CUTOVER", iteration_count: 1, iterations_with_envs: 1 },
            ],
          });
        }
          
        return Promise.resolve({ rows: [] });
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
      expect(cutoverProdAssignment[1][0]).toBe("env-2"); // PROD environment ID

      // Find RUN/DR iteration PROD role assignments
      const runProdAssignment = iterLinks.find(
        (call) => call[1] && call[1][1] === "ite-1" && call[1][2] === "role-1", // RUN iteration, PROD role
      );

      // RUN should NOT have PROD environment in any role
      expect(runProdAssignment).toBeDefined();
      expect(runProdAssignment[1][0]).not.toBe("env-2"); // Not PROD environment ID
    });

    it("should handle cases with no iterations to link", async () => {
      client.query.mockImplementation((sql) => {
        // DEV environment checks
        if (sql.includes("SELECT env_id, env_name FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1, env_name: "DEV" }] });
        }
        if (sql.includes("SELECT env_id FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1 }] });
        }
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

    it("should throw error if DEV environment is missing", async () => {
      client.query.mockImplementation((sql) => {
        // Simulate missing DEV environment
        if (sql.includes("SELECT env_id, env_name FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [] }); // No DEV environment
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(generateAllEnvironments(mockEnvironments, {})).rejects.toThrow(
        "DEV environment (env_id=1) not found. Please ensure migration 022 has been executed."
      );
    });

    it("should skip DEV environment creation if it exists in config", async () => {
      const environmentsWithDev = [
        { name: "DEV", description: "Development environment" },
        ...mockEnvironments
      ];
      
      await generateAllEnvironments(environmentsWithDev, {});

      // Verify DEV environment was not inserted
      const insertCalls = client.query.mock.calls.filter(
        (c) => c[0] && c[0].includes("INSERT INTO environments_env") && c[1]
      );
      
      const insertedEnvCodes = insertCalls.map(call => call[1][1]); // env_code parameter
      expect(insertedEnvCodes).not.toContain("DEV");
    });

    it("should use existing environments if none are created", async () => {
      const existingEnvs = [
        { env_id: 1, env_name: "DEV" }, // Always include DEV from migration
        ...mockEnvironments.map((env, i) => ({
          env_id: `existing-${i + 2}`, // Start from 2 since DEV is 1
          env_name: env.name,
        }))
      ];

      client.query.mockImplementation((sql, params) => {
        // DEV environment existence checks
        if (sql.includes("SELECT env_id, env_name FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1, env_name: "DEV" }] });
        }
        if (sql.includes("SELECT env_id FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1 }] });
        }
        if (sql.includes("INSERT INTO environments_env"))
          return Promise.resolve({ rows: [] }); // No new envs
        if (sql.includes("SELECT env_id, env_name FROM environments_env") && !sql.includes("WHERE"))
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
    it("should delete non-DEV environments in the correct order", async () => {
      client.query.mockResolvedValue({ rowCount: 5 });
      await eraseEnvironmentsTable(client);
      const calls = client.query.mock.calls.map((c) => c[0].trim());
      
      expect(calls).toEqual([
        expect.stringContaining('DELETE FROM environments_env_x_applications_app'),
        expect.stringContaining('DELETE FROM environments_env_x_iterations_ite'),
        expect.stringContaining('DELETE FROM environments_env'),
      ]);
      
      // Verify all DELETE queries preserve DEV environment (env_id=1)
      calls.forEach((call) => {
        if (call.includes('DELETE FROM')) {
          expect(call).toContain('WHERE env_id != 1');
        }
      });
    });

    it("should throw an error if deletion fails", async () => {
      const dbError = new Error("DB delete failed");
      client.query.mockRejectedValue(dbError);
      await expect(eraseEnvironmentsTable(client)).rejects.toThrow(dbError);
    });
  });

  describe("iteration type rules", () => {
    it("should ensure every iteration gets all three roles", async () => {
      // Set up environment by name mapping including DEV
      const envByNameTest = { 
        "DEV": 1, 
        "PROD": "env-2", 
        "EV1": "env-3", 
        "EV2": "env-4" 
      };
      
      client.query.mockImplementation((sql, params) => {
        // DEV environment checks
        if (sql.includes("SELECT env_id, env_name FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1, env_name: "DEV" }] });
        }
        if (sql.includes("SELECT env_id FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1 }] });
        }
        
        // Environment creation
        if (sql.includes("INSERT INTO environments_env") && params) {
          const envCode = params[1];
          if (envCode !== "DEV") {
            const envId = envByNameTest[envCode];
            return Promise.resolve({ rows: [{ env_id: envId, env_name: envCode }] });
          }
          return Promise.resolve({ rows: [] });
        }
        
        // Environment selection
        if (sql.includes("SELECT env_id, env_name FROM environments_env") && !sql.includes("WHERE")) {
          return Promise.resolve({ 
            rows: Object.entries(envByNameTest).map(([name, id]) => ({ env_id: id, env_name: name }))
          });
        }
        
        // Other standard mocks
        if (sql.includes("SELECT app_id FROM applications_app"))
          return Promise.resolve({ rows: dbData.apps });
        if (sql.includes("SELECT ite_id, itt_code, ite_name FROM iterations_ite"))
          return Promise.resolve({ rows: dbData.iterations });
        if (sql.includes("SELECT enr_id, enr_name FROM environment_roles_enr"))
          return Promise.resolve({ rows: dbData.envRoles });
          
        // Linking operations
        if (sql.includes("INSERT INTO"))
          return Promise.resolve({ rows: [] });
          
        return Promise.resolve({ rows: [] });
      });
      
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
      // Set up environment by name mapping
      const envByNameTest = { 
        "DEV": 1, 
        "PROD": "env-2", 
        "EV1": "env-3", 
        "EV2": "env-4" 
      };
      
      client.query.mockImplementation((sql, params) => {
        // DEV environment checks
        if (sql.includes("SELECT env_id, env_name FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1, env_name: "DEV" }] });
        }
        if (sql.includes("SELECT env_id FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1 }] });
        }
        
        // Environment creation
        if (sql.includes("INSERT INTO environments_env") && params) {
          const envCode = params[1];
          if (envCode !== "DEV") {
            const envId = envByNameTest[envCode];
            return Promise.resolve({ rows: [{ env_id: envId, env_name: envCode }] });
          }
          return Promise.resolve({ rows: [] });
        }
        
        // Environment selection
        if (sql.includes("SELECT env_id, env_name FROM environments_env") && !sql.includes("WHERE")) {
          return Promise.resolve({ 
            rows: Object.entries(envByNameTest).map(([name, id]) => ({ env_id: id, env_name: name }))
          });
        }
        
        // Other standard mocks
        if (sql.includes("SELECT app_id FROM applications_app"))
          return Promise.resolve({ rows: dbData.apps });
        if (sql.includes("SELECT ite_id, itt_code, ite_name FROM iterations_ite"))
          return Promise.resolve({ rows: dbData.iterations });
        if (sql.includes("SELECT enr_id, enr_name FROM environment_roles_enr"))
          return Promise.resolve({ rows: dbData.envRoles });
          
        // Linking operations
        if (sql.includes("INSERT INTO"))
          return Promise.resolve({ rows: [] });
          
        return Promise.resolve({ rows: [] });
      });
      
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
        expect(assignment[1][0]).not.toBe("env-2"); // Should not be PROD environment (env-2 in our test)
      });
    });

    it("should always assign PROD environment to PROD role in CUTOVER iterations", async () => {
      // Set up environment by name mapping
      const envByNameTest = { 
        "DEV": 1, 
        "PROD": "env-2", 
        "EV1": "env-3", 
        "EV2": "env-4" 
      };
      
      client.query.mockImplementation((sql, params) => {
        // DEV environment checks
        if (sql.includes("SELECT env_id, env_name FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1, env_name: "DEV" }] });
        }
        if (sql.includes("SELECT env_id FROM environments_env WHERE env_id = 1")) {
          return Promise.resolve({ rows: [{ env_id: 1 }] });
        }
        
        // Environment creation
        if (sql.includes("INSERT INTO environments_env") && params) {
          const envCode = params[1];
          if (envCode !== "DEV") {
            const envId = envByNameTest[envCode];
            return Promise.resolve({ rows: [{ env_id: envId, env_name: envCode }] });
          }
          return Promise.resolve({ rows: [] });
        }
        
        // Environment selection
        if (sql.includes("SELECT env_id, env_name FROM environments_env") && !sql.includes("WHERE")) {
          return Promise.resolve({ 
            rows: Object.entries(envByNameTest).map(([name, id]) => ({ env_id: id, env_name: name }))
          });
        }
        
        // Other standard mocks
        if (sql.includes("SELECT app_id FROM applications_app"))
          return Promise.resolve({ rows: dbData.apps });
        if (sql.includes("SELECT ite_id, itt_code, ite_name FROM iterations_ite"))
          return Promise.resolve({ rows: dbData.iterations });
        if (sql.includes("SELECT enr_id, enr_name FROM environment_roles_enr"))
          return Promise.resolve({ rows: dbData.envRoles });
          
        // Linking operations
        if (sql.includes("INSERT INTO"))
          return Promise.resolve({ rows: [] });
          
        return Promise.resolve({ rows: [] });
      });
      
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
      expect(cutoverProdAssignment[1][0]).toBe("env-2"); // Should be PROD environment (env-2 in our test)
    });
  });
});
