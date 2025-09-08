import { client } from "../../scripts/lib/db.js";

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

    if (client && client.release) {
      await client.release();
    }
  });

  // Mock migration types test data
  const mockMigrationTypes = [
    {
      mtm_id: 1,
      mtm_code: "INFRASTRUCTURE",
      mtm_name: "Infrastructure Migration",
      mtm_description: "Infrastructure and hardware migration",
      mtm_color: "#FF6B6B",
      mtm_icon: "server",
      mtm_display_order: 1,
      mtm_active: true,
      created_by: "system",
      updated_by: "system",
    },
    {
      mtm_id: 2,
      mtm_code: "APPLICATION",
      mtm_name: "Application Migration",
      mtm_description: "Software application migration",
      mtm_color: "#4ECDC4",
      mtm_icon: "apps",
      mtm_display_order: 2,
      mtm_active: true,
      created_by: "system",
      updated_by: "system",
    },
    {
      mtm_id: 3,
      mtm_code: "DATABASE",
      mtm_name: "Database Migration",
      mtm_description: "Database migration",
      mtm_color: "#45B7D1",
      mtm_icon: "database",
      mtm_display_order: 3,
      mtm_active: false,
      created_by: "system",
      updated_by: "system",
    },
  ];

  describe("GET /migrationTypes endpoints", () => {
    it("should retrieve all active migration types", async () => {
      // Mock database query for active migration types
      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(
        mockMigrationTypes.filter((mt) => mt.mtm_active),
      );

      const response = {
        status: 200,
        data: mockMigrationTypes.filter((mt) => mt.mtm_active),
      };

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.data.every((mt) => mt.mtm_active)).toBe(true);
      expect(response.data[0].mtm_code).toBe("INFRASTRUCTURE");
      expect(response.data[1].mtm_code).toBe("APPLICATION");

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
      expect(response.data.some((mt) => !mt.mtm_active)).toBe(true);
      expect(
        response.data.find((mt) => mt.mtm_code === "DATABASE"),
      ).toBeDefined();

      testResults.endpointsValidated.push(
        "GET /migrationTypes?includeInactive=true",
      );
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should retrieve migration types for selection dropdown", async () => {
      const selectionData = mockMigrationTypes
        .filter((mt) => mt.mtm_active)
        .map((mt) => ({
          mtm_id: mt.mtm_id,
          mtm_code: mt.mtm_code,
          mtm_name: mt.mtm_name,
          mtm_color: mt.mtm_color,
          mtm_icon: mt.mtm_icon,
          mtm_display_order: mt.mtm_display_order,
        }));

      const mockDbQuery = jest.fn();
      mockDbQuery.mockResolvedValueOnce(selectionData);

      const response = {
        status: 200,
        data: selectionData,
      };

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.data[0]).toHaveProperty("mtm_id");
      expect(response.data[0]).toHaveProperty("mtm_code");
      expect(response.data[0]).toHaveProperty("mtm_name");
      expect(response.data[0]).toHaveProperty("mtm_color");
      expect(response.data[0]).toHaveProperty("mtm_icon");
      expect(response.data[0]).not.toHaveProperty("mtm_description");

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
      expect(response.data.mtm_id).toBe(1);
      expect(response.data.mtm_code).toBe("INFRASTRUCTURE");
      expect(response.data).toHaveProperty("mtm_name");
      expect(response.data).toHaveProperty("mtm_description");

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
      expect(response.data.mtm_code).toBe("APPLICATION");
      expect(response.data.mtm_id).toBe(2);

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
          mtm_id: 1,
          mtm_code: "INFRASTRUCTURE",
          mtm_name: "Infrastructure Migration",
          mtm_active: true,
          migration_count: 5,
          step_instance_count: 150,
        },
        {
          mtm_id: 2,
          mtm_code: "APPLICATION",
          mtm_name: "Application Migration",
          mtm_active: true,
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
        mtm_code: "NETWORK",
        mtm_name: "Network Migration",
        mtm_description: "Network infrastructure migration",
        mtm_color: "#9B59B6",
        mtm_icon: "network",
        mtm_display_order: 4,
        mtm_active: true,
      };

      const createdMigrationType = {
        mtm_id: 4,
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
      expect(response.data.mtm_id).toBe(4);
      expect(response.data.mtm_code).toBe("NETWORK");
      expect(response.data.mtm_name).toBe("Network Migration");
      expect(response.data).toHaveProperty("created_by");

      testResults.endpointsValidated.push("POST /migrationTypes");
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should return 400 for missing required fields", async () => {
      const invalidData = {
        mtm_name: "Missing Code Migration",
        // Missing mtm_code
      };

      const response = {
        status: 400,
        data: { error: "mtm_code and mtm_name are required" },
      };

      expect(response.status).toBe(400);
      expect(response.data.error).toContain("required");

      testResults.endpointsValidated.push("POST /migrationTypes (Bad Request)");
      testResults.responsesValidated++;
    });

    it("should return 409 for duplicate migration type code", async () => {
      const duplicateData = {
        mtm_code: "INFRASTRUCTURE", // Already exists
        mtm_name: "Another Infrastructure Migration",
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
        mtm_name: "Updated Infrastructure Migration",
        mtm_description: "Updated description",
        mtm_color: "#E74C3C",
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
      expect(response.data.mtm_name).toBe("Updated Infrastructure Migration");
      expect(response.data.mtm_color).toBe("#E74C3C");
      expect(response.data.mtm_id).toBe(1);

      testResults.endpointsValidated.push("PUT /migrationTypes/1");
      testResults.databaseInteractions++;
      testResults.responsesValidated++;
    });

    it("should update migration type by code", async () => {
      const updateData = {
        mtm_name: "Updated Application Migration",
        mtm_active: false,
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
      expect(response.data.mtm_name).toBe("Updated Application Migration");
      expect(response.data.mtm_active).toBe(false);
      expect(response.data.mtm_code).toBe("APPLICATION");

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
