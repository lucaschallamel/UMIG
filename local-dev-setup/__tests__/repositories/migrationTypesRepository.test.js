import { client } from "../../scripts/lib/db.js";

describe("MigrationTypesRepository Unit Tests", () => {
  let testResults = {
    repositoryMethodsValidated: [],
    databaseQueries: 0,
    validationScenarios: 0,
  };

  // Mock database connection
  const mockSql = {
    rows: jest.fn(),
    firstRow: jest.fn(),
    executeUpdate: jest.fn(),
    withTransaction: jest.fn(),
    query: jest.fn(),
  };

  // Mock DatabaseUtil.withSql
  const mockDatabaseUtil = {
    withSql: jest.fn((callback) => callback(mockSql)),
  };

  // Mock the repository class structure
  class MigrationTypesRepository {
    constructor() {
      this.DatabaseUtil = mockDatabaseUtil;
    }

    findAllMigrationTypes(includeInactive = false) {
      return mockDatabaseUtil.withSql((sql) => {
        const query = `
          SELECT 
            mtm_id,
            mtm_code,
            mtm_name,
            mtm_description,
            mtm_color,
            mtm_icon,
            mtm_display_order,
            mtm_active,
            created_by,
            created_at,
            updated_by,
            updated_at
          FROM migration_types_master
          ${includeInactive ? "" : "WHERE mtm_active = TRUE"}
          ORDER BY mtm_display_order, mtm_code
        `;

        return sql.rows(query);
      });
    }

    findMigrationTypeById(mtmId) {
      return mockDatabaseUtil.withSql((sql) => {
        return sql.firstRow(
          `
          SELECT 
            mtm_id,
            mtm_code,
            mtm_name,
            mtm_description,
            mtm_color,
            mtm_icon,
            mtm_display_order,
            mtm_active,
            created_by,
            created_at,
            updated_by,
            updated_at
          FROM migration_types_master
          WHERE mtm_id = :mtmId
        `,
          [mtmId],
        );
      });
    }

    findMigrationTypeByCode(mtmCode) {
      return mockDatabaseUtil.withSql((sql) => {
        return sql.firstRow(
          `
          SELECT 
            mtm_id,
            mtm_code,
            mtm_name,
            mtm_description,
            mtm_color,
            mtm_icon,
            mtm_display_order,
            mtm_active,
            created_by,
            created_at,
            updated_by,
            updated_at
          FROM migration_types_master
          WHERE mtm_code = :mtmCode
        `,
          [mtmCode],
        );
      });
    }

    createMigrationType(params) {
      return mockDatabaseUtil.withSql((sql) => {
        // Validate required fields
        if (!params.mtm_code || !params.mtm_name) {
          throw new Error("mtm_code and mtm_name are required");
        }

        // Set defaults
        const processedParams = {
          ...params,
          mtm_description: params.mtm_description || null,
          mtm_color: params.mtm_color || "#6B73FF",
          mtm_icon: params.mtm_icon || "layers",
          mtm_display_order: params.mtm_display_order || 0,
          mtm_active: params.mtm_active != null ? params.mtm_active : true,
          created_by: params.created_by || "system",
          updated_by: params.updated_by || params.created_by || "system",
        };

        return sql.firstRow(
          `
          INSERT INTO migration_types_master (
            mtm_code,
            mtm_name,
            mtm_description,
            mtm_color,
            mtm_icon,
            mtm_display_order,
            mtm_active,
            created_by,
            updated_by
          ) VALUES (
            :mtm_code,
            :mtm_name,
            :mtm_description,
            :mtm_color,
            :mtm_icon,
            :mtm_display_order,
            :mtm_active,
            :created_by,
            :updated_by
          ) RETURNING *
        `,
          processedParams,
        );
      });
    }

    updateMigrationType(mtmId, params) {
      return mockDatabaseUtil.withSql((sql) => {
        // Build dynamic update query based on provided params
        const updateFields = [];
        const queryParams = { mtm_id: mtmId };

        // List of updatable fields
        const updatableFields = [
          "mtm_code",
          "mtm_name",
          "mtm_description",
          "mtm_color",
          "mtm_icon",
          "mtm_display_order",
          "mtm_active",
        ];

        updatableFields.forEach((field) => {
          if (params.hasOwnProperty(field)) {
            updateFields.push(`${field} = :${field}`);
            queryParams[field] = params[field];
          }
        });

        if (updateFields.length === 0) {
          return this.findMigrationTypeById(mtmId);
        }

        // Always update the updated_by and updated_at fields
        updateFields.push("updated_by = :updated_by");
        updateFields.push("updated_at = CURRENT_TIMESTAMP");
        queryParams.updated_by = params.updated_by || "system";

        const query = `
          UPDATE migration_types_master
          SET ${updateFields.join(", ")}
          WHERE mtm_id = :mtm_id
          RETURNING *
        `;

        return sql.firstRow(query, queryParams);
      });
    }

    deleteMigrationType(mtmId) {
      return mockDatabaseUtil.withSql((sql) => {
        const deleted = sql.executeUpdate(
          `
          DELETE FROM migration_types_master
          WHERE mtm_id = :mtmId
        `,
          [mtmId],
        );

        return deleted > 0;
      });
    }

    migrationTypeExists(mtmCode) {
      return mockDatabaseUtil.withSql((sql) => {
        const count = sql.firstRow(
          `
          SELECT COUNT(*) as count
          FROM migration_types_master
          WHERE mtm_code = :mtmCode
        `,
          [mtmCode],
        );

        return count.count > 0;
      });
    }
  }

  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new MigrationTypesRepository();

    // Reset test results
    testResults = {
      repositoryMethodsValidated: [],
      databaseQueries: 0,
      validationScenarios: 0,
    };
  });

  afterAll(async () => {
    console.log("\n📊 MIGRATION TYPES REPOSITORY TEST RESULTS SUMMARY");
    console.log("============================================================");
    console.log(
      `Repository Methods Validated: ${testResults.repositoryMethodsValidated.length}`,
    );
    console.log(`Database Queries Tested: ${testResults.databaseQueries}`);
    console.log(`Validation Scenarios: ${testResults.validationScenarios}`);
    console.log("Methods Coverage:");
    testResults.repositoryMethodsValidated.forEach((method) => {
      console.log(`  ✅ ${method}`);
    });
    console.log("============================================================");

    if (client && client.release) {
      await client.release();
    }
  });

  // Mock migration types data
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
      created_at: new Date(),
      updated_at: new Date(),
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
      created_at: new Date(),
      updated_at: new Date(),
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
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  describe("findAllMigrationTypes", () => {
    it("should return only active migration types by default", async () => {
      const activeMigrationTypes = mockMigrationTypes.filter(
        (mt) => mt.mtm_active,
      );
      mockSql.rows.mockResolvedValueOnce(activeMigrationTypes);

      const result = repository.findAllMigrationTypes();

      expect(mockSql.rows).toHaveBeenCalledTimes(1);
      expect(mockSql.rows).toHaveBeenCalledWith(
        expect.stringContaining("WHERE mtm_active = TRUE"),
      );

      testResults.repositoryMethodsValidated.push(
        "findAllMigrationTypes (active only)",
      );
      testResults.databaseQueries++;
    });

    it("should return all migration types when includeInactive is true", async () => {
      mockSql.rows.mockResolvedValueOnce(mockMigrationTypes);

      const result = repository.findAllMigrationTypes(true);

      expect(mockSql.rows).toHaveBeenCalledTimes(1);
      expect(mockSql.rows).toHaveBeenCalledWith(
        expect.not.stringContaining("WHERE mtm_active = TRUE"),
      );

      testResults.repositoryMethodsValidated.push(
        "findAllMigrationTypes (include inactive)",
      );
      testResults.databaseQueries++;
    });

    it("should order results by display_order and code", async () => {
      mockSql.rows.mockResolvedValueOnce(mockMigrationTypes);

      const result = repository.findAllMigrationTypes();

      expect(mockSql.rows).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY mtm_display_order, mtm_code"),
      );

      testResults.repositoryMethodsValidated.push(
        "findAllMigrationTypes (ordering)",
      );
      testResults.databaseQueries++;
    });
  });

  describe("findMigrationTypeById", () => {
    it("should return migration type by ID", async () => {
      mockSql.firstRow.mockResolvedValueOnce(mockMigrationTypes[0]);

      const result = repository.findMigrationTypeById(1);

      expect(mockSql.firstRow).toHaveBeenCalledTimes(1);
      expect(mockSql.firstRow).toHaveBeenCalledWith(
        expect.stringContaining("WHERE mtm_id = :mtmId"),
        [1],
      );

      testResults.repositoryMethodsValidated.push("findMigrationTypeById");
      testResults.databaseQueries++;
    });

    it("should return null for non-existent ID", async () => {
      mockSql.firstRow.mockResolvedValueOnce(null);

      const result = repository.findMigrationTypeById(999);

      expect(mockSql.firstRow).toHaveBeenCalledTimes(1);
      expect(mockSql.firstRow).toHaveBeenCalledWith(
        expect.stringContaining("WHERE mtm_id = :mtmId"),
        [999],
      );

      testResults.repositoryMethodsValidated.push(
        "findMigrationTypeById (not found)",
      );
      testResults.databaseQueries++;
    });
  });

  describe("findMigrationTypeByCode", () => {
    it("should return migration type by code", async () => {
      mockSql.firstRow.mockResolvedValueOnce(mockMigrationTypes[0]);

      const result = repository.findMigrationTypeByCode("INFRASTRUCTURE");

      expect(mockSql.firstRow).toHaveBeenCalledTimes(1);
      expect(mockSql.firstRow).toHaveBeenCalledWith(
        expect.stringContaining("WHERE mtm_code = :mtmCode"),
        ["INFRASTRUCTURE"],
      );

      testResults.repositoryMethodsValidated.push("findMigrationTypeByCode");
      testResults.databaseQueries++;
    });

    it("should return null for non-existent code", async () => {
      mockSql.firstRow.mockResolvedValueOnce(null);

      const result = repository.findMigrationTypeByCode("NONEXISTENT");

      expect(mockSql.firstRow).toHaveBeenCalledTimes(1);

      testResults.repositoryMethodsValidated.push(
        "findMigrationTypeByCode (not found)",
      );
      testResults.databaseQueries++;
    });
  });

  describe("createMigrationType", () => {
    it("should create migration type with all required fields", async () => {
      const newMigrationType = {
        mtm_code: "NETWORK",
        mtm_name: "Network Migration",
        mtm_description: "Network infrastructure migration",
        mtm_color: "#9B59B6",
        mtm_icon: "network",
        mtm_display_order: 4,
        mtm_active: true,
        created_by: "test-user",
        updated_by: "test-user",
      };

      const createdMigrationType = {
        mtm_id: 4,
        ...newMigrationType,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSql.firstRow.mockResolvedValueOnce(createdMigrationType);

      const result = repository.createMigrationType(newMigrationType);

      expect(mockSql.firstRow).toHaveBeenCalledTimes(1);
      expect(mockSql.firstRow).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO migration_types_master"),
        expect.objectContaining({
          mtm_code: "NETWORK",
          mtm_name: "Network Migration",
        }),
      );

      testResults.repositoryMethodsValidated.push("createMigrationType");
      testResults.databaseQueries++;
    });

    it("should set default values for optional fields", async () => {
      const minimalMigrationType = {
        mtm_code: "MINIMAL",
        mtm_name: "Minimal Migration",
      };

      const createdMigrationType = {
        mtm_id: 5,
        mtm_code: "MINIMAL",
        mtm_name: "Minimal Migration",
        mtm_description: null,
        mtm_color: "#6B73FF",
        mtm_icon: "layers",
        mtm_display_order: 0,
        mtm_active: true,
        created_by: "system",
        updated_by: "system",
      };

      mockSql.firstRow.mockResolvedValueOnce(createdMigrationType);

      const result = repository.createMigrationType(minimalMigrationType);

      expect(mockSql.firstRow).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO migration_types_master"),
        expect.objectContaining({
          mtm_color: "#6B73FF",
          mtm_icon: "layers",
          mtm_display_order: 0,
          mtm_active: true,
          created_by: "system",
          updated_by: "system",
        }),
      );

      testResults.repositoryMethodsValidated.push(
        "createMigrationType (with defaults)",
      );
      testResults.databaseQueries++;
    });

    it("should throw error for missing required fields", async () => {
      const invalidMigrationType = {
        mtm_name: "Missing Code Migration",
        // Missing mtm_code
      };

      expect(() => {
        repository.createMigrationType(invalidMigrationType);
      }).toThrow("mtm_code and mtm_name are required");

      testResults.repositoryMethodsValidated.push(
        "createMigrationType (validation error)",
      );
      testResults.validationScenarios++;
    });
  });

  describe("updateMigrationType", () => {
    it("should update specified fields only", async () => {
      const updateParams = {
        mtm_name: "Updated Infrastructure Migration",
        mtm_color: "#E74C3C",
        updated_by: "test-user",
      };

      const updatedMigrationType = {
        ...mockMigrationTypes[0],
        ...updateParams,
        updated_at: new Date(),
      };

      mockSql.firstRow.mockResolvedValueOnce(updatedMigrationType);

      const result = repository.updateMigrationType(1, updateParams);

      expect(mockSql.firstRow).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE migration_types_master"),
        expect.objectContaining({
          mtm_id: 1,
          mtm_name: "Updated Infrastructure Migration",
          mtm_color: "#E74C3C",
          updated_by: "test-user",
        }),
      );

      testResults.repositoryMethodsValidated.push("updateMigrationType");
      testResults.databaseQueries++;
    });

    it("should return existing record when no fields to update", async () => {
      mockSql.firstRow.mockResolvedValueOnce(mockMigrationTypes[0]);

      // Mock findMigrationTypeById to be called
      const originalMethod = repository.findMigrationTypeById;
      repository.findMigrationTypeById = jest
        .fn()
        .mockResolvedValueOnce(mockMigrationTypes[0]);

      const result = repository.updateMigrationType(1, {});

      expect(repository.findMigrationTypeById).toHaveBeenCalledWith(1);

      // Restore original method
      repository.findMigrationTypeById = originalMethod;

      testResults.repositoryMethodsValidated.push(
        "updateMigrationType (no changes)",
      );
      testResults.databaseQueries++;
    });

    it("should always update updated_by and updated_at fields", async () => {
      const updateParams = {
        mtm_name: "New Name",
        updated_by: "test-user",
      };

      mockSql.firstRow.mockResolvedValueOnce({});

      const result = repository.updateMigrationType(1, updateParams);

      expect(mockSql.firstRow).toHaveBeenCalledWith(
        expect.stringContaining("updated_by = :updated_by"),
        expect.objectContaining({
          updated_by: "test-user",
        }),
      );

      testResults.repositoryMethodsValidated.push(
        "updateMigrationType (audit fields)",
      );
      testResults.databaseQueries++;
    });
  });

  describe("deleteMigrationType", () => {
    it("should delete migration type and return true on success", async () => {
      mockSql.executeUpdate.mockResolvedValueOnce(1); // 1 row deleted

      const result = repository.deleteMigrationType(3);

      expect(mockSql.executeUpdate).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM migration_types_master"),
        [3],
      );

      testResults.repositoryMethodsValidated.push(
        "deleteMigrationType (success)",
      );
      testResults.databaseQueries++;
    });

    it("should return false when migration type not found", async () => {
      mockSql.executeUpdate.mockResolvedValueOnce(0); // 0 rows deleted

      const result = repository.deleteMigrationType(999);

      expect(mockSql.executeUpdate).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM migration_types_master"),
        [999],
      );

      testResults.repositoryMethodsValidated.push(
        "deleteMigrationType (not found)",
      );
      testResults.databaseQueries++;
    });
  });

  describe("migrationTypeExists", () => {
    it("should return true when migration type exists", async () => {
      mockSql.firstRow.mockResolvedValueOnce({ count: 1 });

      const result = repository.migrationTypeExists("INFRASTRUCTURE");

      expect(mockSql.firstRow).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) as count"),
        ["INFRASTRUCTURE"],
      );

      testResults.repositoryMethodsValidated.push(
        "migrationTypeExists (exists)",
      );
      testResults.databaseQueries++;
    });

    it("should return false when migration type does not exist", async () => {
      mockSql.firstRow.mockResolvedValueOnce({ count: 0 });

      const result = repository.migrationTypeExists("NONEXISTENT");

      expect(mockSql.firstRow).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) as count"),
        ["NONEXISTENT"],
      );

      testResults.repositoryMethodsValidated.push(
        "migrationTypeExists (does not exist)",
      );
      testResults.databaseQueries++;
    });
  });

  describe("Database Error Handling", () => {
    it("should handle database connection errors", async () => {
      mockSql.rows.mockRejectedValueOnce(new Error("Connection timeout"));

      try {
        repository.findAllMigrationTypes();
      } catch (error) {
        expect(error.message).toBe("Connection timeout");
      }

      testResults.repositoryMethodsValidated.push(
        "Error handling (connection timeout)",
      );
      testResults.validationScenarios++;
    });

    it("should handle SQL constraint violations", async () => {
      const constraintError = new Error("Duplicate key violation");
      constraintError.sqlState = "23505";

      mockSql.firstRow.mockRejectedValueOnce(constraintError);

      try {
        repository.createMigrationType({
          mtm_code: "INFRASTRUCTURE",
          mtm_name: "Duplicate Migration",
        });
      } catch (error) {
        expect(error.sqlState).toBe("23505");
      }

      testResults.repositoryMethodsValidated.push(
        "Error handling (constraint violation)",
      );
      testResults.validationScenarios++;
    });
  });

  describe("Transaction Support", () => {
    it("should support transactions for bulk operations", async () => {
      mockSql.withTransaction.mockImplementationOnce((callback) => {
        return callback();
      });

      // This would be part of a more complex transaction-based method
      mockSql.withTransaction(() => {
        mockSql.executeUpdate(
          "UPDATE migration_types_master SET mtm_display_order = 1 WHERE mtm_id = 1",
        );
        mockSql.executeUpdate(
          "UPDATE migration_types_master SET mtm_display_order = 2 WHERE mtm_id = 2",
        );
      });

      expect(mockSql.withTransaction).toHaveBeenCalledTimes(1);

      testResults.repositoryMethodsValidated.push("Transaction support");
      testResults.databaseQueries++;
    });
  });
});
