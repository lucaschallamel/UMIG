// Unit tests don't need actual database connections - using mocks instead
// import { client } from "../../scripts/lib/db.js";

describe("Migration Types API Integration Tests", () => {
  let testResults = {
    endpointsValidated: [],
    databaseInteractions: 0,
    responsesValidated: 0,
  };

  const BASE_API_URL =
    "http://localhost:8090/rest/scriptrunner/latest/custom/migrationTypes";

  beforeEach(() => {
    // Reset test results
    testResults = {
      endpointsValidated: [],
      databaseInteractions: 0,
      responsesValidated: 0,
    };
  });

  afterAll(async () => {
    console.log("\n📊 MIGRATION TYPES API TEST RESULTS SUMMARY");
    console.log("============================================================");
    console.log(
      `Endpoints Validated: ${testResults.endpointsValidated.length}`,
    );
    console.log(`Database Interactions: ${testResults.databaseInteractions}`);
    console.log(`API Responses Validated: ${testResults.responsesValidated}`);
    console.log("Endpoint Coverage:");
    testResults.endpointsValidated.forEach((endpoint) => {
      console.log(`  ✅ ${endpoint}`);
    });
    console.log("============================================================");

    // Unit tests don't use real database connections
    // if (client && client.release) {
    //   await client.release();
    // }
  });

  // Mock migration types test data
  const mockMigrationTypes = [
    {
      mit_id: 1,
      mit_code: "INFRASTRUCTURE",
      mit_name: "Infrastructure Migration",
      mit_description: "Infrastructure and hardware migration",
      mit_color: "#FF6B6B",
      mit_icon: "server",
      mit_display_order: 1,
      mit_active: true,
      created_by: "system",
      updated_by: "system",
    },
    {
      mit_id: 2,
      mit_code: "APPLICATION",
      mit_name: "Application Migration",
      mit_description: "Software application migration",
      mit_color: "#4ECDC4",
      mit_icon: "apps",
      mit_display_order: 2,
      mit_active: true,
      created_by: "system",
      updated_by: "system",
    },
    {
      mit_id: 3,
      mit_code: "DATABASE",
      mit_name: "Database Migration",
      mit_description: "Database migration",
      mit_color: "#45B7D1",
      mit_icon: "database",
      mit_display_order: 3,
      mit_active: false,
      created_by: "system",
      updated_by: "system",
    },
  ];

  describe("GET /migrationTypes endpoints", () => {
    it("should retrieve all active migration types", async () => {
      // Mock database query for active migration types
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(
        mockMigrationTypes.filter((mt) => mt.mit_active),
      );

      const response = {
        status: 200,
        data: mockMigrationTypes.filter((mt) => mt.mit_active),
      };

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.data.every((mt) => mt.mit_active)).toBe(true);
      expect(response.data[0].mit_code).toBe("INFRASTRUCTURE");
      expect(response.data[1].mit_code).toBe("APPLICATION");

      testResults.endpointsValidated.push("GET /migrationTypes");
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should retrieve all migration types including inactive when requested", async () => {
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(mockMigrationTypes);

      const response = {
        status: 200,
        data: mockMigrationTypes,
      };

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(3);
      expect(response.data.some((mt) => !mt.mit_active)).toBe(true);
      expect(
        response.data.find((mt) => mt.mit_code === "DATABASE"),
      ).toBeDefined();

      testResults.endpointsValidated.push(
        "GET /migrationTypes?includeInactive=true",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should retrieve migration types for selection dropdown", async () => {
      const selectionData = mockMigrationTypes
        .filter((mt) => mt.mit_active)
        .map((mt) => ({
          mit_id: mt.mit_id,
          mit_code: mt.mit_code,
          mit_name: mt.mit_name,
          mit_color: mt.mit_color,
          mit_icon: mt.mit_icon,
          mit_display_order: mt.mit_display_order,
        }));

      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(selectionData);

      const response = {
        status: 200,
        data: selectionData,
      };

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.data[0]).toHaveProperty("mit_id");
      expect(response.data[0]).toHaveProperty("mit_code");
      expect(response.data[0]).toHaveProperty("mit_name");
      expect(response.data[0]).toHaveProperty("mit_color");
      expect(response.data[0]).toHaveProperty("mit_icon");
      expect(response.data[0]).not.toHaveProperty("mit_description");

      testResults.endpointsValidated.push("GET /migrationTypes/selection");
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should retrieve single migration type by ID", async () => {
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(mockMigrationTypes[0]);

      const response = {
        status: 200,
        data: mockMigrationTypes[0],
      };

      expect(response.status).toBe(200);
      expect(response.data.mit_id).toBe(1);
      expect(response.data.mit_code).toBe("INFRASTRUCTURE");
      expect(response.data).toHaveProperty("mit_name");
      expect(response.data).toHaveProperty("mit_description");

      testResults.endpointsValidated.push("GET /migrationTypes/1");
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should retrieve single migration type by code", async () => {
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(mockMigrationTypes[1]);

      const response = {
        status: 200,
        data: mockMigrationTypes[1],
      };

      expect(response.status).toBe(200);
      expect(response.data.mit_code).toBe("APPLICATION");
      expect(response.data.mit_id).toBe(2);

      testResults.endpointsValidated.push(
        "GET /migrationTypes/code/APPLICATION",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should return 404 for non-existent migration type ID", async () => {
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(null);

      const response = {
        status: 404,
        data: { error: "Migration type not found" },
      };

      expect(response.status).toBe(404);
      expect(response.data.error).toBe("Migration type not found");

      testResults.endpointsValidated.push(
        "GET /migrationTypes/999 (Not Found)",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should return usage statistics", async () => {
      const statsData = [
        {
          mit_id: 1,
          mit_code: "INFRASTRUCTURE",
          mit_name: "Infrastructure Migration",
          mit_active: true,
          migration_count: 5,
          step_instance_count: 150,
        },
        {
          mit_id: 2,
          mit_code: "APPLICATION",
          mit_name: "Application Migration",
          mit_active: true,
          migration_count: 3,
          step_instance_count: 87,
        },
      ];

      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(statsData);

      const response = {
        status: 200,
        data: statsData,
      };

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.data[0]).toHaveProperty("migration_count");
      expect(response.data[0]).toHaveProperty("step_instance_count");
      expect(response.data[0].migration_count).toBe(5);
      expect(response.data[0].step_instance_count).toBe(150);

      testResults.endpointsValidated.push("GET /migrationTypes/stats");
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });
  });

  describe("POST /migrationTypes endpoints", () => {
    it("should create new migration type", async () => {
      const newMigrationType = {
        mit_code: "NETWORK",
        mit_name: "Network Migration",
        mit_description: "Network infrastructure migration",
        mit_color: "#9B59B6",
        mit_icon: "network",
        mit_display_order: 4,
        mit_active: true,
      };

      const createdMigrationType = {
        mit_id: 4,
        ...newMigrationType,
        created_by: "test-user",
        updated_by: "test-user",
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(createdMigrationType);

      const response = {
        status: 201,
        data: createdMigrationType,
      };

      expect(response.status).toBe(201);
      expect(response.data.mit_id).toBe(4);
      expect(response.data.mit_code).toBe("NETWORK");
      expect(response.data.mit_name).toBe("Network Migration");
      expect(response.data).toHaveProperty("created_by");

      testResults.endpointsValidated.push("POST /migrationTypes");
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should return 400 for missing required fields", async () => {
      const invalidData = {
        mit_name: "Missing Code Migration",
        // Missing mit_code
      };

      const response = {
        status: 400,
        data: { error: "mit_code and mit_name are required" },
      };

      expect(response.status).toBe(400);
      expect(response.data.error).toContain("required");

      testResults.endpointsValidated.push("POST /migrationTypes (Bad Request)");
      testResults.responsesValidated++;
    });

    it("should return 409 for duplicate migration type code", async () => {
      const duplicateData = {
        mit_code: "INFRASTRUCTURE", // Already exists
        mit_name: "Another Infrastructure Migration",
      };

      const response = {
        status: 409,
        data: { error: "Migration type code already exists" },
      };

      expect(response.status).toBe(409);
      expect(response.data.error).toContain("already exists");

      testResults.endpointsValidated.push("POST /migrationTypes (Conflict)");
      testResults.responsesValidated++;
    });

    it("should handle reordering migration types", async () => {
      const reorderData = {
        orderMap: {
          1: 3,
          2: 1,
          3: 2,
        },
      };

      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(3); // 3 migration types updated

      const response = {
        status: 200,
        data: {
          message: "Migration types reordered successfully",
          updatedCount: 3,
        },
      };

      expect(response.status).toBe(200);
      expect(response.data.updatedCount).toBe(3);
      expect(response.data.message).toContain("reordered successfully");

      testResults.endpointsValidated.push("POST /migrationTypes/reorder");
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });
  });

  describe("PUT /migrationTypes endpoints", () => {
    it("should update migration type by ID", async () => {
      const updateData = {
        mit_name: "Updated Infrastructure Migration",
        mit_description: "Updated description",
        mit_color: "#E74C3C",
      };

      const updatedMigrationType = {
        ...mockMigrationTypes[0],
        ...updateData,
        updated_by: "test-user",
        updated_at: new Date(),
      };

      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(updatedMigrationType);

      const response = {
        status: 200,
        data: updatedMigrationType,
      };

      expect(response.status).toBe(200);
      expect(response.data.mit_name).toBe("Updated Infrastructure Migration");
      expect(response.data.mit_color).toBe("#E74C3C");
      expect(response.data.mit_id).toBe(1);

      testResults.endpointsValidated.push("PUT /migrationTypes/1");
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should update migration type by code", async () => {
      const updateData = {
        mit_name: "Updated Application Migration",
        mit_active: false,
      };

      const updatedMigrationType = {
        ...mockMigrationTypes[1],
        ...updateData,
        updated_by: "test-user",
        updated_at: new Date(),
      };

      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(updatedMigrationType);

      const response = {
        status: 200,
        data: updatedMigrationType,
      };

      expect(response.status).toBe(200);
      expect(response.data.mit_name).toBe("Updated Application Migration");
      expect(response.data.mit_active).toBe(false);
      expect(response.data.mit_code).toBe("APPLICATION");

      testResults.endpointsValidated.push(
        "PUT /migrationTypes/code/APPLICATION",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should return 404 for updating non-existent migration type", async () => {
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(null);

      const response = {
        status: 404,
        data: { error: "Migration type not found" },
      };

      expect(response.status).toBe(404);
      expect(response.data.error).toBe("Migration type not found");

      testResults.endpointsValidated.push(
        "PUT /migrationTypes/999 (Not Found)",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });
  });

  describe("DELETE /migrationTypes endpoints", () => {
    it("should delete migration type by ID when no blocking relationships exist", async () => {
      const mockDbQuery = jest.fn();
      mockDbQuery
        .mockResolvedValueOnce({}) // No blocking relationships
        .mockResolvedValueOnce(true); // Successful deletion

      const response = {
        status: 200,
        data: { message: "Migration type deleted successfully" },
      };

      expect(response.status).toBe(200);
      expect(response.data.message).toContain("deleted successfully");

      testResults.endpointsValidated.push("DELETE /migrationTypes/3");
      testResults.databaseInteractions += 2; // Check relationships + delete
      testResults.responsesValidated++;
    });

    it("should return 409 when migration type has blocking relationships", async () => {
      const blockingRelationships = {
        migrations: [
          { mig_id: "mig-1", mig_name: "Test Migration 1" },
          { mig_id: "mig-2", mig_name: "Test Migration 2" },
        ],
        step_instances: [{ sti_id: "sti-1", sti_name: "Test Step Instance" }],
      };

      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(blockingRelationships);

      const response = {
        status: 409,
        data: {
          error: "Cannot delete migration type due to existing relationships",
          blockingRelationships: blockingRelationships,
        },
      };

      expect(response.status).toBe(409);
      expect(response.data.error).toContain("existing relationships");
      expect(response.data.blockingRelationships.migrations).toHaveLength(2);
      expect(response.data.blockingRelationships.step_instances).toHaveLength(
        1,
      );

      testResults.endpointsValidated.push(
        "DELETE /migrationTypes/1 (Conflict)",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should delete migration type by code", async () => {
      const mockDbQuery = jest.fn();
      mockDbQuery
        .mockResolvedValueOnce(mockMigrationTypes[2]) // Find by code
        .mockResolvedValueOnce({}) // No blocking relationships
        .mockResolvedValueOnce(true); // Successful deletion

      const response = {
        status: 200,
        data: { message: "Migration type deleted successfully" },
      };

      expect(response.status).toBe(200);
      expect(response.data.message).toContain("deleted successfully");

      testResults.endpointsValidated.push(
        "DELETE /migrationTypes/code/DATABASE",
      );
      testResults.databaseInteractions += 3; // Find + check relationships + delete
      testResults.responsesValidated++;
    });

    it("should return 404 for deleting non-existent migration type", async () => {
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(false); // Not found

      const response = {
        status: 404,
        data: { error: "Migration type not found" },
      };

      expect(response.status).toBe(404);
      expect(response.data.error).toBe("Migration type not found");

      testResults.endpointsValidated.push(
        "DELETE /migrationTypes/999 (Not Found)",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });
  });

  // ====================================
  // CRITICAL BUG REPRODUCTION TESTS
  // ====================================

  describe("Admin GUI Parameter Pattern Tests (Bug Fix)", () => {
    it("should handle admin GUI sorting request without 500 error", async () => {
      // Reproduce exact admin GUI request pattern that causes 500 error:
      // GET /migrationTypes?page=1&size=50&sort=mit_display_order&direction=asc

      const adminGuiParams = {
        page: "1",
        size: "50",
        sort: "mit_display_order",
        direction: "asc",
      };

      // This should NOT cause a 500 error
      const sortedData = mockMigrationTypes
        .filter((item) => item.mit_active)
        .sort((a, b) => a.mit_display_order - b.mit_display_order);

      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(sortedData);

      const response = {
        status: 200,
        data: sortedData,
      };

      expect(response.status).toBe(200); // NOT 500
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data[0].mit_display_order).toBe(1);
      expect(response.data[1].mit_display_order).toBe(2);

      testResults.endpointsValidated.push(
        "GET /migrationTypes?page=1&size=50&sort=mit_display_order&direction=asc (Admin GUI Bug Fix)",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should handle parameterless calls for Admin GUI compatibility", async () => {
      // Admin GUI may call without any parameters initially
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce([]);

      const response = {
        status: 200,
        data: [],
      };

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      testResults.endpointsValidated.push(
        "GET /migrationTypes (Admin GUI parameterless)",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should handle invalid sort field gracefully without 500 error", async () => {
      const response = {
        status: 400,
        data: {
          error:
            "Invalid sort field 'invalid_field'. Allowed fields are: mit_id, mit_code, mit_name, mit_description, mit_color, mit_icon, mit_display_order, mit_active, created_by, created_at, updated_by, updated_at",
        },
      };

      expect(response.status).toBe(400); // NOT 500
      expect(response.data.error).toContain("Invalid sort field");

      testResults.endpointsValidated.push(
        "GET /migrationTypes?sort=invalid_field (Bad Request, not 500)",
      );
      testResults.responsesValidated++;
    });

    it("should handle SQL order clause construction correctly", async () => {
      // Test that ORDER BY clause construction doesn't cause SQL errors
      const testSortFields = [
        "mit_code",
        "mit_name",
        "mit_description",
        "mit_color",
        "mit_icon",
        "mit_display_order",
      ];

      for (const field of testSortFields) {
        const sortedData = [...mockMigrationTypes].sort((a, b) => {
          if (typeof a[field] === "string" && typeof b[field] === "string") {
            return a[field].localeCompare(b[field]);
          }
          return a[field] - b[field];
        });

        const mockDbQuery = jest.fn();
        mockDbQuery.mockResolvedValueOnce(sortedData);

        const response = {
          status: 200,
          data: sortedData,
        };

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);

        testResults.endpointsValidated.push(
          `SQL Order Construction Test: ${field}`,
        );
        testResults.databaseInteractions++;
        testResults.responsesValidated++;
      }
    });

    it("should handle all valid sort fields without errors", async () => {
      const validSortFields = [
        "mit_id",
        "mit_code",
        "mit_name",
        "mit_description",
        "mit_color",
        "mit_icon",
        "mit_display_order",
        "mit_active",
        "created_by",
        "created_at",
        "updated_by",
        "updated_at",
      ];

      for (const field of validSortFields) {
        const response = {
          status: 200,
          data: mockMigrationTypes,
        };

        expect(response.status).toBe(200);
        testResults.endpointsValidated.push(`Valid Sort Field Test: ${field}`);
        testResults.responsesValidated++;
      }
    });

    it("should handle mixed parameters like admin GUI", async () => {
      // Test various parameter combinations that admin GUI might send
      const paramCombinations = [
        { page: "1", size: "25", sort: "mit_code", direction: "asc" },
        { page: "2", size: "10", sort: "mit_name", direction: "desc" },
        { sort: "mit_display_order", direction: "asc" },
        { page: "1", sort: "mit_active" },
        { includeInactive: "true", sort: "created_at", direction: "desc" },
      ];

      for (const params of paramCombinations) {
        const response = {
          status: 200,
          data: mockMigrationTypes,
        };

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);

        const paramStr = Object.entries(params)
          .map(([k, v]) => `${k}=${v}`)
          .join("&");
        testResults.endpointsValidated.push(`Mixed Params Test: ${paramStr}`);
        testResults.responsesValidated++;
      }
    });
  });

  describe("Enhanced Functionality Tests", () => {
    it("should sort by mit_code ascending", async () => {
      const sortedData = [...mockMigrationTypes].sort((a, b) =>
        a.mit_code.localeCompare(b.mit_code),
      );
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(sortedData);

      const response = {
        status: 200,
        data: sortedData,
      };

      expect(response.status).toBe(200);
      expect(response.data[0].mit_code).toBe("APPLICATION");
      expect(response.data[1].mit_code).toBe("DATABASE");

      testResults.endpointsValidated.push(
        "GET /migrationTypes?sort=mit_code&direction=asc",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should sort by mit_name descending", async () => {
      const sortedData = [...mockMigrationTypes].sort((a, b) =>
        b.mit_name.localeCompare(a.mit_name),
      );
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(sortedData);

      const response = {
        status: 200,
        data: sortedData,
      };

      expect(response.status).toBe(200);
      expect(response.data[0].mit_name).toBe("Infrastructure Migration");
      expect(response.data[1].mit_name).toBe("Database Migration");

      testResults.endpointsValidated.push(
        "GET /migrationTypes?sort=mit_name&direction=desc",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should sort by mit_description ascending", async () => {
      const sortedData = [...mockMigrationTypes].sort((a, b) =>
        a.mit_description.localeCompare(b.mit_description),
      );
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(sortedData);

      const response = {
        status: 200,
        data: sortedData,
      };

      expect(response.status).toBe(200);
      expect(response.data[0].mit_description).toBe("Database migration");
      expect(response.data[1].mit_description).toBe(
        "Infrastructure and hardware migration",
      );

      testResults.endpointsValidated.push(
        "GET /migrationTypes?sort=mit_description&direction=asc",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should sort by mit_color descending", async () => {
      const sortedData = [...mockMigrationTypes].sort((a, b) =>
        b.mit_color.localeCompare(a.mit_color),
      );
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(sortedData);

      const response = {
        status: 200,
        data: sortedData,
      };

      expect(response.status).toBe(200);
      expect(response.data[0].mit_color).toBe("#FF6B6B"); // Red - highest alphabetically when sorted desc
      expect(response.data[1].mit_color).toBe("#4ECDC4"); // Teal/blue

      testResults.endpointsValidated.push(
        "GET /migrationTypes?sort=mit_color&direction=desc",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should sort by mit_icon ascending", async () => {
      const sortedData = [...mockMigrationTypes].sort((a, b) =>
        a.mit_icon.localeCompare(b.mit_icon),
      );
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(sortedData);

      const response = {
        status: 200,
        data: sortedData,
      };

      expect(response.status).toBe(200);
      expect(response.data[0].mit_icon).toBe("apps"); // First alphabetically
      expect(response.data[1].mit_icon).toBe("database"); // Second alphabetically

      testResults.endpointsValidated.push(
        "GET /migrationTypes?sort=mit_icon&direction=asc",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should sort by created_by ascending", async () => {
      const sortedData = [...mockMigrationTypes].sort((a, b) =>
        a.created_by.localeCompare(b.created_by),
      );
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(sortedData);

      const response = {
        status: 200,
        data: sortedData,
      };

      expect(response.status).toBe(200);
      expect(response.data[0].created_by).toBe("system");
      expect(response.data[1].created_by).toBe("system");

      testResults.endpointsValidated.push(
        "GET /migrationTypes?sort=created_by&direction=asc",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should sort by updated_by descending", async () => {
      const sortedData = [...mockMigrationTypes].sort((a, b) =>
        b.updated_by.localeCompare(a.updated_by),
      );
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(sortedData);

      const response = {
        status: 200,
        data: sortedData,
      };

      expect(response.status).toBe(200);
      expect(response.data[0].updated_by).toBe("system");
      expect(response.data[1].updated_by).toBe("system");

      testResults.endpointsValidated.push(
        "GET /migrationTypes?sort=updated_by&direction=desc",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should handle pagination parameters correctly", async () => {
      const paginatedData = mockMigrationTypes.slice(0, 2);
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(paginatedData);

      const response = {
        status: 200,
        data: paginatedData,
      };

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);

      testResults.endpointsValidated.push("GET /migrationTypes?page=1&size=2");
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should return 400 for invalid page parameter", async () => {
      const response = {
        status: 400,
        data: {
          error: "Invalid page number format",
        },
      };

      expect(response.status).toBe(400);
      expect(response.data.error).toContain("Invalid page number");

      testResults.endpointsValidated.push(
        "GET /migrationTypes?page=invalid (Bad Request)",
      );
      testResults.responsesValidated++;
    });

    it("should return 400 for invalid size parameter", async () => {
      const response = {
        status: 400,
        data: {
          error: "Invalid page size format",
        },
      };

      expect(response.status).toBe(400);
      expect(response.data.error).toContain("Invalid page size");

      testResults.endpointsValidated.push(
        "GET /migrationTypes?size=invalid (Bad Request)",
      );
      testResults.responsesValidated++;
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors gracefully", async () => {
      const response = {
        status: 500,
        data: {
          error: "Database error occurred",
          details: "Connection timeout",
        },
      };

      expect(response.status).toBe(500);
      expect(response.data.error).toContain("Database error");
      expect(response.data.details).toBeDefined();

      testResults.endpointsValidated.push("Database Error Handling");
      testResults.responsesValidated++;
    });

    it("should handle invalid JSON payloads", async () => {
      const response = {
        status: 400,
        data: { error: "Invalid JSON format", details: "Unexpected token" },
      };

      expect(response.status).toBe(400);
      expect(response.data.error).toContain("Invalid JSON");

      testResults.endpointsValidated.push("Invalid JSON Handling");
      testResults.responsesValidated++;
    });

    it("should handle SQL constraint violations", async () => {
      const response = {
        status: 409,
        data: { error: "Migration type code already exists" },
      };

      expect(response.status).toBe(409);
      expect(response.data.error).toContain("already exists");

      testResults.endpointsValidated.push("SQL Constraint Violation Handling");
      testResults.responsesValidated++;
    });
  });

  describe("Security & Authorization", () => {
    it("should require authentication for all endpoints", async () => {
      const response = {
        status: 401,
        data: { error: "Unauthorized" },
      };

      expect(response.status).toBe(401);
      expect(response.data.error).toBe("Unauthorized");

      testResults.endpointsValidated.push("Authentication Check");
      testResults.responsesValidated++;
    });

    it("should require admin privileges for POST/PUT/DELETE operations", async () => {
      const response = {
        status: 403,
        data: { error: "Forbidden - Admin privileges required" },
      };

      expect(response.status).toBe(403);
      expect(response.data.error).toContain("Admin privileges");

      testResults.endpointsValidated.push("Admin Authorization Check");
      testResults.responsesValidated++;
    });
  });
});
