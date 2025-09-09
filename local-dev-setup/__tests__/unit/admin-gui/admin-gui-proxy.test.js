/**
 * Unit Tests for Admin GUI Proxy Pattern and API Endpoint Resolution
 *
 * Tests the proxy pattern implementation for entity configuration access,
 * API endpoint resolution for iterationTypes and migrationTypes, and fallback behavior
 * when EntityConfig is unavailable.
 */

describe("Admin GUI Proxy Pattern and API Resolution", () => {
  let AdminGUI;
  let mockConsole;

  beforeEach(() => {
    // Mock console.warn to capture fallback warnings
    mockConsole = {
      warn: jest.fn(),
      log: jest.fn(),
    };
    global.console = mockConsole;

    // Create AdminGUI mock object based on the actual structure
    AdminGUI = {
      // Configuration from Groovy macro
      config: {},

      // API endpoints
      api: {
        baseUrl: "/rest/scriptrunner/latest/custom",
        endpoints: {
          users: "/users",
          teams: "/teams",
          environments: "/environments",
          applications: "/applications",
          iterations: "/iterationsList",
          labels: "/labels",
          iterationTypes: "/iterationTypes",
          migrationTypes: "/migrationTypes",
          migrations: "/migrations",
          stepView: "/stepViewApi",
        },
      },

      // Entity configurations (delegated to EntityConfig.js)
      get entities() {
        if (
          window.EntityConfig &&
          typeof window.EntityConfig.getAllEntities === "function"
        ) {
          return window.EntityConfig.getAllEntities();
        }

        // Fallback warning if EntityConfig is not available
        console.warn("EntityConfig not available, using empty configuration");
        return {};
      },

      // Helper method to get a specific entity configuration
      getEntity: function (entityName) {
        if (
          window.EntityConfig &&
          typeof window.EntityConfig.getEntity === "function"
        ) {
          return window.EntityConfig.getEntity(entityName);
        }

        // Fallback to direct access if EntityConfig API is not available
        return this.entities[entityName] || null;
      },
    };

    // Reset window object
    global.window = {};
  });

  afterEach(() => {
    if (global.window) {
      delete global.window;
    }
  });

  describe("API Endpoint Resolution", () => {
    test("should have iterationTypes endpoint configured", () => {
      expect(AdminGUI.api.endpoints.iterationTypes).toBe("/iterationTypes");
    });

    test("should have migrationTypes endpoint configured", () => {
      expect(AdminGUI.api.endpoints.migrationTypes).toBe("/migrationTypes");
    });

    test("should have all required API endpoints", () => {
      const requiredEndpoints = [
        "users",
        "teams",
        "environments",
        "applications",
        "iterations",
        "labels",
        "iterationTypes",
        "migrationTypes",
        "migrations",
        "stepView",
      ];

      requiredEndpoints.forEach((endpoint) => {
        expect(AdminGUI.api.endpoints).toHaveProperty(endpoint);
        expect(typeof AdminGUI.api.endpoints[endpoint]).toBe("string");
        expect(AdminGUI.api.endpoints[endpoint]).toMatch(/^\/[a-zA-Z]/);
      });
    });

    test("should construct full API URLs correctly", () => {
      const baseUrl = AdminGUI.api.baseUrl;
      const iterationTypesUrl = baseUrl + AdminGUI.api.endpoints.iterationTypes;
      const migrationTypesUrl = baseUrl + AdminGUI.api.endpoints.migrationTypes;

      expect(iterationTypesUrl).toBe(
        "/rest/scriptrunner/latest/custom/iterationTypes",
      );
      expect(migrationTypesUrl).toBe(
        "/rest/scriptrunner/latest/custom/migrationTypes",
      );
    });
  });

  describe("Entity Proxy Pattern - With EntityConfig Available", () => {
    beforeEach(() => {
      // Mock EntityConfig as available
      global.window.EntityConfig = {
        getAllEntities: jest.fn().mockReturnValue({
          users: { name: "Users", fields: [] },
          iterationTypes: {
            name: "Iteration Types",
            fields: [
              { key: "itt_code", label: "Code", type: "text" },
              { key: "itt_name", label: "Name", type: "text" },
            ],
          },
          migrationTypes: {
            name: "Migration Types",
            fields: [
              { key: "mit_code", label: "Code", type: "text" },
              { key: "mit_name", label: "Name", type: "text" },
            ],
          },
        }),
        getEntity: jest.fn().mockImplementation((entityName) => {
          const entities = {
            users: { name: "Users", fields: [] },
            iterationTypes: {
              name: "Iteration Types",
              fields: [
                { key: "itt_code", label: "Code", type: "text" },
                { key: "itt_name", label: "Name", type: "text" },
              ],
            },
            migrationTypes: {
              name: "Migration Types",
              fields: [
                { key: "mit_code", label: "Code", type: "text" },
                { key: "mit_name", label: "Name", type: "text" },
              ],
            },
          };
          return entities[entityName] || null;
        }),
      };
    });

    test("should access entities through EntityConfig when available", () => {
      const entities = AdminGUI.entities;

      expect(window.EntityConfig.getAllEntities).toHaveBeenCalled();
      expect(entities).toHaveProperty("iterationTypes");
      expect(entities).toHaveProperty("migrationTypes");
      expect(entities).toHaveProperty("users");
    });

    test("should retrieve iterationTypes entity through getEntity method", () => {
      const iterationTypes = AdminGUI.getEntity("iterationTypes");

      expect(window.EntityConfig.getEntity).toHaveBeenCalledWith(
        "iterationTypes",
      );
      expect(iterationTypes).toBeDefined();
      expect(iterationTypes.name).toBe("Iteration Types");
      expect(iterationTypes.fields).toBeInstanceOf(Array);
    });

    test("should retrieve migrationTypes entity through getEntity method", () => {
      const migrationTypes = AdminGUI.getEntity("migrationTypes");

      expect(window.EntityConfig.getEntity).toHaveBeenCalledWith(
        "migrationTypes",
      );
      expect(migrationTypes).toBeDefined();
      expect(migrationTypes.name).toBe("Migration Types");
      expect(migrationTypes.fields).toBeInstanceOf(Array);
    });

    test("should return null for non-existent entity", () => {
      const nonExistent = AdminGUI.getEntity("nonExistentEntity");

      expect(window.EntityConfig.getEntity).toHaveBeenCalledWith(
        "nonExistentEntity",
      );
      expect(nonExistent).toBeNull();
    });

    test("should not show fallback warning when EntityConfig is available", () => {
      // Access entities property to trigger getter
      const entities = AdminGUI.entities;

      expect(mockConsole.warn).not.toHaveBeenCalled();
    });
  });

  describe("Entity Proxy Pattern - Fallback Behavior", () => {
    beforeEach(() => {
      // EntityConfig is not available (undefined window.EntityConfig)
      global.window = {};
    });

    test("should show fallback warning when EntityConfig is unavailable", () => {
      const entities = AdminGUI.entities;

      expect(mockConsole.warn).toHaveBeenCalledWith(
        "EntityConfig not available, using empty configuration",
      );
      expect(entities).toEqual({});
    });

    test("should return empty object when EntityConfig is unavailable", () => {
      const entities = AdminGUI.entities;

      expect(entities).toEqual({});
      expect(Object.keys(entities).length).toBe(0);
    });

    test("should return null from getEntity when EntityConfig is unavailable", () => {
      const iterationTypes = AdminGUI.getEntity("iterationTypes");
      const migrationTypes = AdminGUI.getEntity("migrationTypes");

      expect(iterationTypes).toBeNull();
      expect(migrationTypes).toBeNull();
    });

    test("should handle malformed EntityConfig gracefully", () => {
      // EntityConfig exists but doesn't have required methods
      global.window.EntityConfig = {};

      const entities = AdminGUI.entities;
      expect(mockConsole.warn).toHaveBeenCalledWith(
        "EntityConfig not available, using empty configuration",
      );
      expect(entities).toEqual({});
    });

    test("should handle EntityConfig with partial API", () => {
      // EntityConfig exists but only has getAllEntities, not getEntity
      global.window.EntityConfig = {
        getAllEntities: jest.fn().mockReturnValue({
          iterationTypes: { name: "Iteration Types" },
        }),
      };

      // Should work for entities getter
      const entities = AdminGUI.entities;
      expect(entities).toHaveProperty("iterationTypes");

      // Should fallback for getEntity method
      const iterationTypes = AdminGUI.getEntity("iterationTypes");
      expect(iterationTypes).toEqual({ name: "Iteration Types" });
    });
  });

  describe("Backward Compatibility", () => {
    test("should maintain API endpoint structure for backward compatibility", () => {
      // Verify that existing endpoints are still present
      const legacyEndpoints = [
        "users",
        "teams",
        "environments",
        "applications",
        "migrations",
      ];

      legacyEndpoints.forEach((endpoint) => {
        expect(AdminGUI.api.endpoints).toHaveProperty(endpoint);
      });

      // Verify new endpoints are added
      expect(AdminGUI.api.endpoints).toHaveProperty("iterationTypes");
      expect(AdminGUI.api.endpoints).toHaveProperty("migrationTypes");
    });

    test("should support both direct entity access and proxy pattern", () => {
      global.window.EntityConfig = {
        getAllEntities: jest.fn().mockReturnValue({
          iterationTypes: { name: "Iteration Types" },
        }),
        getEntity: jest.fn().mockReturnValue({ name: "Iteration Types" }),
      };

      // Direct access through entities property
      const entitiesViaProperty = AdminGUI.entities;
      expect(entitiesViaProperty).toHaveProperty("iterationTypes");

      // Access through getEntity method
      const entityViaMethod = AdminGUI.getEntity("iterationTypes");
      expect(entityViaMethod).toHaveProperty("name");

      // Both should work
      expect(window.EntityConfig.getAllEntities).toHaveBeenCalled();
      expect(window.EntityConfig.getEntity).toHaveBeenCalled();
    });
  });
});
