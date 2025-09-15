/**
 * EnvironmentsEntityManager Unit Tests - US-082-C Phase 2
 *
 * Comprehensive unit tests for the EnvironmentsEntityManager component
 * using Jest framework with established testing patterns from TD-002.
 *
 * Test Coverage:
 * - Entity manager initialization and configuration
 * - CRUD operations with mocked API responses
 * - Component integration with ComponentOrchestrator
 * - Security validation and error handling
 * - Performance benchmarks and edge cases
 *
 * @version 1.0.0
 * @created 2025-01-15 (US-082-C Phase 2)
 * @framework Jest with DOM environment
 * @coverage Target: >95% statement coverage
 * @performance Target: <100ms per test
 */

// Import with destructuring for Jest compatibility after consolidation
const {
  EnvironmentsEntityManager,
} = require("../../../src/groovy/umig/web/js/entities/environments/EnvironmentsEntityManager.js");

// Mock dependencies
jest.mock(
  "../../../src/groovy/umig/web/js/entities/BaseEntityManager.js",
  () => {
    return {
      BaseEntityManager: class MockBaseEntityManager {
        constructor(config) {
          this.entityType = config.entityType;
          this.config = config;
          this.orchestrator = null;
          this.currentData = [];
          this.currentFilters = {};
          this.currentSort = null;
          this.currentPage = 1;
          this.totalRecords = 0;
          this.securityContext = {
            entityType: this.entityType,
            sessionId: "test-session-123",
          };
        }

        async initialize(container, options = {}) {
          this.orchestrator = {
            createComponent: jest.fn().mockResolvedValue({
              type: "mock-component",
              updateData: jest.fn(),
              updatePagination: jest.fn(),
              show: jest.fn(),
              destroy: jest.fn(),
            }),
            on: jest.fn(),
            showNotification: jest.fn(),
            destroy: jest.fn(),
          };
          return Promise.resolve();
        }

        async loadData(filters, sort, page, pageSize) {
          return {
            data: this.currentData,
            total: this.totalRecords,
            page: page,
            pageSize: pageSize,
            loadTime: 45.2,
          };
        }

        async createEntity(data) {
          return { env_id: 999, ...data };
        }

        async updateEntity(id, data) {
          return { env_id: id, ...data };
        }

        async deleteEntity(id) {
          return true;
        }

        _trackPerformance(operation, duration) {
          // Mock performance tracking
        }

        _trackError(operation, error) {
          // Mock error tracking
        }

        _auditLog(operation, entityId, data) {
          // Mock audit logging
        }

        _validateEntityData(data, operation) {
          // Base validation that can be overridden
          if (!data) {
            throw new Error("Entity data is required");
          }
        }

        destroy() {
          // Mock cleanup
        }
      },
    };
  },
);

jest.mock("../../../src/groovy/umig/web/js/components/SecurityUtils.js", () => {
  return {
    SecurityUtils: {
      validateInput: jest.fn().mockReturnValue({
        isValid: true,
        sanitizedData: {},
        errors: [],
      }),
      preventXSS: jest.fn((data) => data),
      checkRateLimit: jest.fn().mockReturnValue(true),
      logSecurityEvent: jest.fn(),
      ValidationException: class ValidationException extends Error {},
      SecurityException: class SecurityException extends Error {},
    },
  };
});

// Mock fetch API
global.fetch = jest.fn();

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
};

describe("EnvironmentsEntityManager", () => {
  let environmentsManager;
  let mockContainer;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup DOM mocks
    mockContainer = {
      innerHTML: "",
      style: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    // Setup default fetch responses
    global.fetch.mockImplementation((url, options) => {
      // Extract base URL without query parameters
      const baseUrl = url.split("?")[0];

      const responses = {
        "/rest/scriptrunner/latest/custom/environments": {
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              data: [
                {
                  env_id: 1,
                  env_code: "DEV",
                  env_name: "Development",
                  application_count: 5,
                  iteration_count: 2,
                },
                {
                  env_id: 2,
                  env_code: "TEST",
                  env_name: "Testing",
                  application_count: 3,
                  iteration_count: 1,
                },
                {
                  env_id: 3,
                  env_code: "PROD",
                  env_name: "Production",
                  application_count: 8,
                  iteration_count: 4,
                },
              ],
              pagination: {
                currentPage: 1,
                pageSize: 20,
                totalItems: 3,
                totalPages: 1,
              },
            }),
        },
        "/rest/scriptrunner/latest/custom/environments/roles": {
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve([
              {
                enr_id: 1,
                enr_name: "SOURCE",
                enr_description: "Source Environment",
              },
              {
                enr_id: 2,
                enr_name: "TARGET",
                enr_description: "Target Environment",
              },
            ]),
        },
      };

      const response = responses[baseUrl] || {
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      };

      return Promise.resolve(response);
    });

    // Create fresh instance
    environmentsManager = new EnvironmentsEntityManager();
  });

  afterEach(() => {
    if (environmentsManager) {
      environmentsManager.destroy();
      environmentsManager = null;
    }
  });

  describe("Initialization", () => {
    test("should initialize with correct entity type and configuration", () => {
      expect(environmentsManager.entityType).toBe("environments");
      expect(environmentsManager.config).toBeDefined();
      expect(environmentsManager.config.tableConfig).toBeDefined();
      expect(environmentsManager.config.modalConfig).toBeDefined();
      expect(environmentsManager.config.filterConfig).toBeDefined();
      expect(environmentsManager.config.paginationConfig).toBeDefined();
    });

    test("should have correct table configuration", () => {
      const tableConfig = environmentsManager.config.tableConfig;

      expect(tableConfig.columns).toHaveLength(5);
      expect(tableConfig.columns[0].key).toBe("env_code");
      expect(tableConfig.columns[1].key).toBe("env_name");
      expect(tableConfig.columns[3].key).toBe("application_count");
      expect(tableConfig.columns[4].key).toBe("iteration_count");

      expect(tableConfig.actions.view).toBe(true);
      expect(tableConfig.actions.edit).toBe(true);
      expect(tableConfig.actions.delete).toBe(true);
      expect(tableConfig.actions.applications).toBe(true);
      expect(tableConfig.actions.iterations).toBe(true);
    });

    test("should have correct modal configuration", () => {
      const modalConfig = environmentsManager.config.modalConfig;

      expect(modalConfig.fields).toHaveLength(3);
      expect(modalConfig.fields[0].name).toBe("env_code");
      expect(modalConfig.fields[1].name).toBe("env_name");
      expect(modalConfig.fields[2].name).toBe("env_description");

      expect(modalConfig.title.create).toBe("Create New Environment");
      expect(modalConfig.title.edit).toBe("Edit Environment");
      expect(modalConfig.title.view).toBe("Environment Details");
    });

    test("should have correct filter configuration", () => {
      const filterConfig = environmentsManager.config.filterConfig;

      expect(filterConfig.enabled).toBe(true);
      expect(filterConfig.persistent).toBe(true);
      expect(filterConfig.filters).toHaveLength(5);
      expect(filterConfig.quickFilters).toHaveLength(3);
    });

    test("should initialize environment-specific state", () => {
      expect(environmentsManager.availableRoles).toEqual([]);
      expect(environmentsManager.availableApplications).toEqual([]);
      expect(environmentsManager.availableIterations).toEqual([]);
      expect(environmentsManager.applicationAssociationModal).toBeNull();
      expect(environmentsManager.iterationAssociationModal).toBeNull();
      expect(environmentsManager.relationshipViewer).toBeNull();
    });

    test("should initialize successfully with container", async () => {
      const startTime = performance.now();

      await environmentsManager.initialize(mockContainer);

      const duration = performance.now() - startTime;

      expect(environmentsManager.orchestrator).toBeDefined();
      expect(environmentsManager.availableRoles).toHaveLength(2);
      expect(duration).toBeLessThan(100); // Performance target
    });
  });

  describe("Data Operations", () => {
    beforeEach(async () => {
      await environmentsManager.initialize(mockContainer);
    });

    test("should fetch entity data correctly", async () => {
      const startTime = performance.now();

      const result = await environmentsManager._fetchEntityData(
        { search: "DEV" },
        { column: "env_code", direction: "asc" },
        1,
        20,
      );

      const duration = performance.now() - startTime;

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(duration).toBeLessThan(200); // Performance target

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/rest/scriptrunner/latest/custom/environments",
        ),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    test("should create entity data correctly", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            env_id: 4,
            env_code: "UAT",
            env_name: "User Acceptance Testing",
            env_description: "Environment for UAT",
          }),
      });

      const testData = {
        env_code: "UAT",
        env_name: "User Acceptance Testing",
        env_description: "Environment for UAT",
      };

      const startTime = performance.now();

      const result = await environmentsManager._createEntityData(testData);

      const duration = performance.now() - startTime;

      expect(result.env_id).toBe(4);
      expect(result.env_code).toBe("UAT");
      expect(result.env_name).toBe("User Acceptance Testing");
      expect(duration).toBeLessThan(200); // Performance target

      expect(global.fetch).toHaveBeenCalledWith(
        "/rest/scriptrunner/latest/custom/environments",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(testData),
        }),
      );
    });

    test("should update entity data correctly", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            env_id: 1,
            env_code: "DEV",
            env_name: "Development Updated",
            env_description: "Updated development environment",
          }),
      });

      const updateData = {
        env_code: "DEV",
        env_name: "Development Updated",
        env_description: "Updated development environment",
      };

      const startTime = performance.now();

      const result = await environmentsManager._updateEntityData(1, updateData);

      const duration = performance.now() - startTime;

      expect(result.env_id).toBe(1);
      expect(result.env_name).toBe("Development Updated");
      expect(duration).toBeLessThan(200); // Performance target

      expect(global.fetch).toHaveBeenCalledWith(
        "/rest/scriptrunner/latest/custom/environments/1",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(updateData),
        }),
      );
    });

    test("should delete entity data correctly", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const startTime = performance.now();

      await environmentsManager._deleteEntityData(1);

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(200); // Performance target

      expect(global.fetch).toHaveBeenCalledWith(
        "/rest/scriptrunner/latest/custom/environments/1",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            Accept: "application/json",
          }),
        }),
      );
    });

    test("should handle delete with blocking relationships", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            error:
              "Cannot delete environment with ID 3 due to existing relationships",
            blocking_relationships: {
              applications: [{ app_id: 1, app_name: "Critical App" }],
              iterations: [{ ite_id: "123", ite_name: "Release 1.0" }],
            },
          }),
      });

      await expect(environmentsManager._deleteEntityData(3)).rejects.toThrow(
        "Cannot delete environment",
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "/rest/scriptrunner/latest/custom/environments/3",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });

  describe("Validation", () => {
    test("should validate entity data for create operation", () => {
      const validData = {
        env_code: "DEV",
        env_name: "Development",
        env_description: "Development environment",
      };

      expect(() => {
        environmentsManager._validateEntityData(validData, "create");
      }).not.toThrow();
    });

    test("should reject invalid environment code", () => {
      const invalidData = {
        env_code: "DEV@#$",
        env_name: "Development",
      };

      expect(() => {
        environmentsManager._validateEntityData(invalidData, "create");
      }).toThrow("Environment code contains invalid characters");
    });

    test("should reject environment code that is too short", () => {
      const invalidData = {
        env_code: "D",
        env_name: "Development",
      };

      expect(() => {
        environmentsManager._validateEntityData(invalidData, "create");
      }).toThrow("Environment code must be between 2 and 20 characters");
    });

    test("should reject environment code that is too long", () => {
      const invalidData = {
        env_code: "A".repeat(25),
        env_name: "Development",
      };

      expect(() => {
        environmentsManager._validateEntityData(invalidData, "create");
      }).toThrow("Environment code must be between 2 and 20 characters");
    });

    test("should reject environment name that is too short", () => {
      const invalidData = {
        env_code: "DEV",
        env_name: "De",
      };

      expect(() => {
        environmentsManager._validateEntityData(invalidData, "create");
      }).toThrow("Environment name must be between 3 and 100 characters");
    });

    test("should reject environment description that is too long", () => {
      const invalidData = {
        env_code: "DEV",
        env_name: "Development",
        env_description: "A".repeat(510),
      };

      expect(() => {
        environmentsManager._validateEntityData(invalidData, "create");
      }).toThrow("Environment description must not exceed 500 characters");
    });
  });

  describe("Environment-Specific Methods", () => {
    beforeEach(async () => {
      await environmentsManager.initialize(mockContainer);
    });

    test("should get environment by ID", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            env_id: 1,
            env_code: "DEV",
            env_name: "Development",
            applications: [
              { app_id: 1, app_code: "APP1", app_name: "Application 1" },
            ],
            iterations: [
              { ite_id: "123", ite_name: "Iteration 1", role_name: "SOURCE" },
            ],
          }),
      });

      const result = await environmentsManager.getEnvironmentById(1);

      expect(result.env_id).toBe(1);
      expect(result.env_code).toBe("DEV");
      expect(result.applications).toHaveLength(1);
      expect(result.iterations).toHaveLength(1);

      expect(global.fetch).toHaveBeenCalledWith(
        "/rest/scriptrunner/latest/custom/environments/1",
      );
    });

    test("should get environment iterations grouped by role", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            SOURCE: {
              role_description: "Source Environment",
              iterations: [
                {
                  ite_id: "123",
                  ite_name: "Iteration 1",
                  ite_type: "MIGRATION",
                  ite_status: "ACTIVE",
                },
              ],
            },
            TARGET: {
              role_description: "Target Environment",
              iterations: [
                {
                  ite_id: "456",
                  ite_name: "Iteration 2",
                  ite_type: "MIGRATION",
                  ite_status: "PLANNED",
                },
              ],
            },
          }),
      });

      const result = await environmentsManager.getEnvironmentIterations(1);

      expect(result["SOURCE"]).toBeDefined();
      expect(result["TARGET"]).toBeDefined();
      expect(result["SOURCE"].iterations).toHaveLength(1);
      expect(result["TARGET"].iterations).toHaveLength(1);

      expect(global.fetch).toHaveBeenCalledWith(
        "/rest/scriptrunner/latest/custom/environments/1/iterations",
      );
    });

    test("should handle application management action", async () => {
      const environmentData = { env_id: 1, env_name: "Development" };

      await environmentsManager._manageApplications(environmentData);

      expect(console.log).toHaveBeenCalledWith(
        "[EnvironmentsEntityManager] Managing applications for environment:",
        1,
      );
    });

    test("should handle iteration management action", async () => {
      const environmentData = { env_id: 1, env_name: "Development" };

      await environmentsManager._manageIterations(environmentData);

      expect(console.log).toHaveBeenCalledWith(
        "[EnvironmentsEntityManager] Managing iterations for environment:",
        1,
      );
    });
  });

  describe("Error Handling", () => {
    test("should handle fetch errors gracefully", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        environmentsManager._fetchEntityData({}, null, 1, 20),
      ).rejects.toThrow("Failed to load environments: Network error");
    });

    test("should handle create errors gracefully", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({ error: "Environment code already exists" }),
      });

      await expect(
        environmentsManager._createEntityData({ env_code: "DEV" }),
      ).rejects.toThrow(
        "Failed to create environment: Environment code already exists",
      );
    });

    test("should handle update errors gracefully", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Environment not found" }),
      });

      await expect(
        environmentsManager._updateEntityData(999, { env_name: "Updated" }),
      ).rejects.toThrow("Failed to update environment: Environment not found");
    });
  });

  describe("Performance", () => {
    test("should meet performance targets for initialization", async () => {
      const startTime = performance.now();

      await environmentsManager.initialize(mockContainer);

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Target: <100ms for initialization
    });

    test("should meet performance targets for data operations", async () => {
      await environmentsManager.initialize(mockContainer);

      const operations = [
        () => environmentsManager._fetchEntityData({}, null, 1, 20),
        () =>
          environmentsManager._createEntityData({
            env_code: "TEST",
            env_name: "Test",
          }),
        () => environmentsManager._updateEntityData(1, { env_name: "Updated" }),
        () => environmentsManager.getEnvironmentById(1),
      ];

      for (const operation of operations) {
        const startTime = performance.now();

        try {
          await operation();
        } catch (error) {
          // Some operations might fail due to mocking, but we're testing performance
        }

        const duration = performance.now() - startTime;
        expect(duration).toBeLessThan(200); // Target: <200ms per operation
      }
    });
  });

  describe("Cleanup", () => {
    test("should cleanup resources properly", async () => {
      await environmentsManager.initialize(mockContainer);

      // Add some mock components
      environmentsManager.applicationAssociationModal = { destroy: jest.fn() };
      environmentsManager.iterationAssociationModal = { destroy: jest.fn() };
      environmentsManager.relationshipViewer = { destroy: jest.fn() };

      environmentsManager.destroy();

      expect(environmentsManager.applicationAssociationModal).toBeNull();
      expect(environmentsManager.iterationAssociationModal).toBeNull();
      expect(environmentsManager.relationshipViewer).toBeNull();
      expect(environmentsManager.availableRoles).toEqual([]);
      expect(environmentsManager.availableApplications).toEqual([]);
      expect(environmentsManager.availableIterations).toEqual([]);

      expect(console.log).toHaveBeenCalledWith(
        "[EnvironmentsEntityManager] Cleaning up environment-specific resources",
      );
    });
  });
});
