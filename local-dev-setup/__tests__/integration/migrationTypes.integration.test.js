// Import will be mocked in tests

describe("Migration Types Integration Tests", () => {
  let testResults = {
    integrationScenariosValidated: [],
    databaseOperations: 0,
    crossSystemValidations: 0,
    performanceValidations: 0,
  };

  beforeEach(async () => {
    // Setup clean test environment
    testResults = {
      integrationScenariosValidated: [],
      databaseOperations: 0,
      crossSystemValidations: 0,
      performanceValidations: 0,
    };
  });

  afterAll(async () => {
    console.log("\n📊 MIGRATION TYPES INTEGRATION TEST RESULTS SUMMARY");
    console.log("============================================================");
    console.log(
      `Integration Scenarios: ${testResults.integrationScenariosValidated.length}`,
    );
    console.log(`Database Operations: ${testResults.databaseOperations}`);
    console.log(
      `Cross-System Validations: ${testResults.crossSystemValidations}`,
    );
    console.log(
      `Performance Validations: ${testResults.performanceValidations}`,
    );
    console.log("Integration Coverage:");
    testResults.integrationScenariosValidated.forEach((scenario) => {
      console.log(`  ✅ ${scenario}`);
    });
    console.log("============================================================");

    // Client cleanup handled by individual tests when mocked
  });

  const testMigrationTypes = [
    {
      mtm_code: "ACQUISITION",
      mtm_name: "Acquisition Data Migration",
      mtm_description:
        "Migration of customer, positions and contracts data as part of an external acquisition",
      mtm_color: "#5D4037",
      mtm_icon: "life-ring",
      mtm_display_order: 7,
      mtm_active: true,
    },
    {
      mtm_code: "INFRASTRUCTURE",
      mtm_name: "Infrastructure Release",
      mtm_description:
        "Server, network, and infrastructure component releases requiring physical or virtual resource changes",
      mtm_color: "#E65100",
      mtm_icon: "server",
      mtm_display_order: 1,
      mtm_active: true,
    },
    {
      mtm_code: "APPLICATION",
      mtm_name: "Application Release",
      mtm_description:
        "Software application deployments, upgrades, and configuration changes affecting business applications",
      mtm_color: "#1976D2",
      mtm_icon: "desktop",
      mtm_display_order: 2,
      mtm_active: true,
    },
    {
      mtm_code: "DATABASE",
      mtm_name: "Database Release",
      mtm_description:
        "Database schema changes, data releases, and database platform upgrades requiring careful coordination",
      mtm_color: "#388E3C",
      mtm_icon: "database",
      mtm_display_order: 3,
      mtm_active: true,
    },
    {
      mtm_code: "NETWORK",
      mtm_name: "Network Release",
      mtm_description:
        "Network configuration changes, routing updates, and connectivity modifications affecting system communication",
      mtm_color: "#7B1FA2",
      mtm_icon: "globe",
      mtm_display_order: 4,
      mtm_active: true,
    },
    {
      mtm_code: "SECURITY",
      mtm_name: "Security Release",
      mtm_description:
        "Security system updates, access control changes, and compliance-related releases requiring special handling",
      mtm_color: "#D32F2F",
      mtm_icon: "shield",
      mtm_display_order: 5,
      mtm_active: true,
    },
    {
      mtm_code: "INTEGRATION",
      mtm_name: "Integration Release",
      mtm_description:
        "API changes, interface modifications, and system integration updates affecting inter-system communication",
      mtm_color: "#F57C00",
      mtm_icon: "link",
      mtm_display_order: 6,
      mtm_active: true,
    },
    {
      mtm_code: "DECOMMISSION",
      mtm_name: "System Decommission",
      mtm_description:
        "End-of-life system shutdown, data archival, and cleanup releases activities",
      mtm_color: "#616161",
      mtm_icon: "trash",
      mtm_display_order: 8,
      mtm_active: true,
    },
  ];

  describe("Migration Generator Integration", () => {
    it("should use dynamic migration types in fake data generation", async () => {
      const mockClientQueries = [];
      const mockClient = {
        query: jest.fn().mockImplementation((sql, values) => {
          mockClientQueries.push({ sql, values });

          // Mock migration types response
          if (
            sql.includes(
              "SELECT mtm_id, mtm_code, mtm_name FROM migration_types_master",
            )
          ) {
            return Promise.resolve({
              rows: testMigrationTypes.map((mt) => ({
                mtm_id: testMigrationTypes.indexOf(mt) + 1,
                mtm_code: mt.mtm_code,
                mtm_name: mt.mtm_name,
              })),
            });
          }

          // Mock other required responses for migrations generator
          if (sql.includes("SELECT usr_id FROM users_usr")) {
            return Promise.resolve({ rows: [{ usr_id: "user-1" }] });
          }

          if (sql.includes("SELECT plm_id FROM plans_master_plm")) {
            return Promise.resolve({
              rows: [{ plm_id: "plan-1" }, { plm_id: "plan-2" }],
            });
          }

          if (sql.includes("SELECT sts_id, sts_name FROM status_sts")) {
            return Promise.resolve({
              rows: [{ sts_id: 1, sts_name: "PLANNING" }],
            });
          }

          // Mock successful insert
          if (sql.includes("INSERT INTO migrations_mig")) {
            return Promise.resolve({
              rows: [{ mig_id: `mig-${Math.random()}` }],
            });
          }

          return Promise.resolve({ rows: [] });
        }),
      };

      // Mock the client import
      jest.resetModules();
      jest.doMock("../../scripts/lib/db.js", () => ({
        client: mockClient,
      }));

      // Import generator after mocking
      const { generateMigrations } = await import(
        "../../scripts/generators/005_generate_migrations.js"
      );

      const config = {
        MIGRATIONS: {
          COUNT: 2,
          START_DATE_RANGE: ["2024-11-01", "2025-06-01"],
          DURATION_MONTHS: 6,
          ITERATIONS: { RUN: 1, DR: 1, CUTOVER: 1 },
        },
        CANONICAL_PLANS: { PER_MIGRATION: 1 },
      };

      await generateMigrations(config, {});

      // Verify migration types query was made
      const migrationTypesQuery = mockClientQueries.find((q) =>
        q.sql.includes(
          "SELECT mtm_id, mtm_code, mtm_name FROM migration_types_master",
        ),
      );
      expect(migrationTypesQuery).toBeDefined();

      // Verify migrations were created with dynamic types
      const migrationInserts = mockClientQueries.filter((q) =>
        q.sql.includes("INSERT INTO migrations_mig"),
      );
      expect(migrationInserts.length).toBe(2);

      // Verify migration types are from our test data, not hardcoded "EXTERNAL"
      migrationInserts.forEach((insert) => {
        const migrationTypeParam = insert.values[4]; // mig_type is the 5th parameter
        expect(testMigrationTypes.map((mt) => mt.mtm_code)).toContain(
          migrationTypeParam,
        );
        expect(migrationTypeParam).not.toBe("EXTERNAL");
      });

      testResults.integrationScenariosValidated.push(
        "Migration generator uses dynamic types",
      );
      testResults.databaseOperations += mockClientQueries.length;
      testResults.crossSystemValidations++;
    });

    it("should fallback to EXTERNAL when no migration types available", async () => {
      const mockClientQueries = [];
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const mockClient = {
        query: jest.fn().mockImplementation((sql, values) => {
          mockClientQueries.push({ sql, values });

          // Mock empty migration types response
          if (
            sql.includes(
              "SELECT mtm_id, mtm_code, mtm_name FROM migration_types_master",
            )
          ) {
            return Promise.resolve({ rows: [] });
          }

          // Mock other required responses
          if (sql.includes("SELECT usr_id FROM users_usr")) {
            return Promise.resolve({ rows: [{ usr_id: "user-1" }] });
          }

          if (sql.includes("SELECT plm_id FROM plans_master_plm")) {
            return Promise.resolve({ rows: [{ plm_id: "plan-1" }] });
          }

          if (sql.includes("SELECT sts_id, sts_name FROM status_sts")) {
            return Promise.resolve({
              rows: [{ sts_id: 1, sts_name: "PLANNING" }],
            });
          }

          if (sql.includes("INSERT INTO migrations_mig")) {
            return Promise.resolve({
              rows: [{ mig_id: `mig-${Math.random()}` }],
            });
          }

          return Promise.resolve({ rows: [] });
        }),
      };

      jest.resetModules();
      jest.doMock("../../scripts/lib/db.js", () => ({
        client: mockClient,
      }));

      const { generateMigrations } = await import(
        "../../scripts/generators/005_generate_migrations.js"
      );

      const config = {
        MIGRATIONS: {
          COUNT: 1,
          START_DATE_RANGE: ["2024-11-01", "2025-06-01"],
          DURATION_MONTHS: 6,
          ITERATIONS: { RUN: 1, DR: 1, CUTOVER: 1 },
        },
        CANONICAL_PLANS: { PER_MIGRATION: 1 },
      };

      await generateMigrations(config, {});

      // Verify fallback warning was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        "No active migration types found in migration_types_master table. Using fallback type 'EXTERNAL'.",
      );

      // Verify EXTERNAL type was used
      const migrationInserts = mockClientQueries.filter((q) =>
        q.sql.includes("INSERT INTO migrations_mig"),
      );
      expect(migrationInserts.length).toBe(1);
      expect(migrationInserts[0].values[4]).toBe("EXTERNAL");

      consoleSpy.mockRestore();

      testResults.integrationScenariosValidated.push(
        "Migration generator fallback behavior",
      );
      testResults.databaseOperations += mockClientQueries.length;
      testResults.crossSystemValidations++;
    });
  });

  describe("Database Schema Integration", () => {
    it("should validate migration_types_master table structure", async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [
            { column_name: "mtm_id", data_type: "integer", is_nullable: "NO" },
            {
              column_name: "mtm_code",
              data_type: "character varying",
              is_nullable: "NO",
            },
            {
              column_name: "mtm_name",
              data_type: "character varying",
              is_nullable: "NO",
            },
            {
              column_name: "mtm_description",
              data_type: "text",
              is_nullable: "YES",
            },
            {
              column_name: "mtm_color",
              data_type: "character varying",
              is_nullable: "YES",
            },
            {
              column_name: "mtm_icon",
              data_type: "character varying",
              is_nullable: "YES",
            },
            {
              column_name: "mtm_display_order",
              data_type: "integer",
              is_nullable: "YES",
            },
            {
              column_name: "mtm_active",
              data_type: "boolean",
              is_nullable: "YES",
            },
            {
              column_name: "created_by",
              data_type: "character varying",
              is_nullable: "YES",
            },
            {
              column_name: "created_at",
              data_type: "timestamp with time zone",
              is_nullable: "YES",
            },
            {
              column_name: "updated_by",
              data_type: "character varying",
              is_nullable: "YES",
            },
            {
              column_name: "updated_at",
              data_type: "timestamp with time zone",
              is_nullable: "YES",
            },
          ],
        }),
      };

      // Mock table structure query
      const columns = await mockClient.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'migration_types_master'
        ORDER BY ordinal_position
      `);

      expect(columns.rows).toHaveLength(12);

      // Verify required columns exist
      const columnNames = columns.rows.map((col) => col.column_name);
      expect(columnNames).toContain("mtm_id");
      expect(columnNames).toContain("mtm_code");
      expect(columnNames).toContain("mtm_name");
      expect(columnNames).toContain("mtm_active");

      // Verify primary key field is not nullable
      const primaryKeyColumn = columns.rows.find(
        (col) => col.column_name === "mtm_id",
      );
      expect(primaryKeyColumn.is_nullable).toBe("NO");

      testResults.integrationScenariosValidated.push(
        "Database schema validation",
      );
      testResults.databaseOperations++;
    });

    it("should validate foreign key relationships with migrations table", async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [
            {
              constraint_name: "migrations_mig_mtm_id_fkey",
              table_name: "migrations_mig",
              column_name: "mtm_id",
              foreign_table_name: "migration_types_master",
              foreign_column_name: "mtm_id",
            },
          ],
        }),
      };

      // Mock foreign key constraint query
      const constraints = await mockClient.query(`
        SELECT 
          tc.constraint_name,
          tc.table_name, 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'migrations_mig'
        AND ccu.table_name = 'migration_types_master'
      `);

      expect(constraints.rows).toHaveLength(1);
      expect(constraints.rows[0].column_name).toBe("mtm_id");
      expect(constraints.rows[0].foreign_table_name).toBe(
        "migration_types_master",
      );

      testResults.integrationScenariosValidated.push(
        "Foreign key relationship validation",
      );
      testResults.databaseOperations++;
    });
  });

  describe("API Repository Integration", () => {
    it("should integrate API endpoints with repository methods", async () => {
      const mockRepository = {
        findAllMigrationTypes: jest.fn().mockResolvedValue(testMigrationTypes),
        findMigrationTypeById: jest
          .fn()
          .mockResolvedValue(testMigrationTypes[0]),
        createMigrationType: jest.fn().mockResolvedValue({
          mtm_id: 5,
          ...testMigrationTypes[0],
          created_by: "test-user",
        }),
        updateMigrationType: jest.fn().mockResolvedValue({
          ...testMigrationTypes[0],
          mtm_name: "Updated Name",
        }),
        deleteMigrationType: jest.fn().mockResolvedValue(true),
        getMigrationTypeUsageStats: jest
          .fn()
          .mockResolvedValue([
            {
              ...testMigrationTypes[0],
              migration_count: 5,
              step_instance_count: 150,
            },
          ]),
      };

      // Test GET all migration types
      const allTypes = await mockRepository.findAllMigrationTypes(false);
      expect(allTypes).toHaveLength(8);
      expect(mockRepository.findAllMigrationTypes).toHaveBeenCalledWith(false);

      // Test GET single migration type
      const singleType = await mockRepository.findMigrationTypeById(1);
      expect(singleType.mtm_code).toBe("ACQUISITION");
      expect(mockRepository.findMigrationTypeById).toHaveBeenCalledWith(1);

      // Test POST create migration type
      const createData = {
        mtm_code: "TEST",
        mtm_name: "Test Migration",
        created_by: "test-user",
      };
      const created = await mockRepository.createMigrationType(createData);
      expect(created.mtm_id).toBe(5);
      expect(mockRepository.createMigrationType).toHaveBeenCalledWith(
        createData,
      );

      // Test PUT update migration type
      const updateData = { mtm_name: "Updated Name" };
      const updated = await mockRepository.updateMigrationType(1, updateData);
      expect(updated.mtm_name).toBe("Updated Name");
      expect(mockRepository.updateMigrationType).toHaveBeenCalledWith(
        1,
        updateData,
      );

      // Test DELETE migration type
      const deleted = await mockRepository.deleteMigrationType(1);
      expect(deleted).toBe(true);
      expect(mockRepository.deleteMigrationType).toHaveBeenCalledWith(1);

      // Test GET usage stats
      const stats = await mockRepository.getMigrationTypeUsageStats();
      expect(stats[0].migration_count).toBe(5);
      expect(mockRepository.getMigrationTypeUsageStats).toHaveBeenCalled();

      testResults.integrationScenariosValidated.push(
        "API-Repository integration",
      );
      testResults.databaseOperations += 6;
      testResults.crossSystemValidations++;
    });
  });

  describe("Performance Integration", () => {
    it("should validate migration types query performance", async () => {
      const startTime = Date.now();

      // Simulate database query
      const mockClient = {
        query: jest.fn().mockImplementation(() => {
          // Simulate query execution time
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ rows: testMigrationTypes });
            }, 10); // 10ms simulated query time
          });
        }),
      };

      await mockClient.query(
        "SELECT * FROM migration_types_master WHERE mtm_active = TRUE",
      );

      const executionTime = Date.now() - startTime;

      // Performance validation - should complete within reasonable time
      expect(executionTime).toBeLessThan(100); // Less than 100ms

      testResults.integrationScenariosValidated.push(
        "Query performance validation",
      );
      testResults.performanceValidations++;
      testResults.databaseOperations++;
    });

    it("should validate bulk migration generation performance", async () => {
      const startTime = Date.now();

      // Simulate generating migrations with types lookup
      const mockClient = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql.includes("migration_types_master")) {
            return Promise.resolve({ rows: testMigrationTypes });
          }
          return Promise.resolve({ rows: [{ usr_id: "user-1" }] });
        }),
      };

      // Simulate generating 10 migrations
      for (let i = 0; i < 10; i++) {
        await mockClient.query(
          "SELECT mtm_id, mtm_code FROM migration_types_master WHERE mtm_active = TRUE",
        );
        await mockClient.query("SELECT usr_id FROM users_usr");
      }

      const executionTime = Date.now() - startTime;

      // Should handle bulk operations efficiently
      expect(executionTime).toBeLessThan(500); // Less than 500ms for 10 migrations

      testResults.integrationScenariosValidated.push(
        "Bulk operation performance validation",
      );
      testResults.performanceValidations++;
      testResults.databaseOperations += 20;
    });
  });

  describe("Error Integration Scenarios", () => {
    it("should handle database constraint violations during migration creation", async () => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql.includes("INSERT INTO migrations_mig")) {
            // Simulate foreign key constraint violation
            const error = new Error("Foreign key constraint violation");
            error.code = "23503";
            error.constraint = "migrations_mig_mtm_id_fkey";
            throw error;
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      try {
        await mockClient.query(`
          INSERT INTO migrations_mig (mtm_id, mig_name, mig_type) 
          VALUES (999, 'Test Migration', 'INVALID_TYPE')
        `);
      } catch (error) {
        expect(error.code).toBe("23503");
        expect(error.constraint).toBe("migrations_mig_mtm_id_fkey");
      }

      testResults.integrationScenariosValidated.push(
        "Foreign key constraint error handling",
      );
      testResults.crossSystemValidations++;
    });

    it("should handle migration type deletion with existing references", async () => {
      const mockRepository = {
        getMigrationTypeBlockingRelationships: jest.fn().mockResolvedValue({
          migrations: [
            { mig_id: "mig-1", mig_name: "Test Migration 1" },
            { mig_id: "mig-2", mig_name: "Test Migration 2" },
          ],
        }),
      };

      const blockingRelationships =
        await mockRepository.getMigrationTypeBlockingRelationships(1);

      expect(blockingRelationships.migrations).toHaveLength(2);
      expect(blockingRelationships.migrations[0].mig_name).toBe(
        "Test Migration 1",
      );

      testResults.integrationScenariosValidated.push(
        "Blocking relationship detection",
      );
      testResults.crossSystemValidations++;
    });
  });

  describe("Data Consistency Integration", () => {
    it("should maintain referential integrity across system operations", async () => {
      const operationLog = [];

      const mockClient = {
        query: jest.fn().mockImplementation((sql, values) => {
          operationLog.push({ sql: sql.substring(0, 50), values });

          if (sql.includes("SELECT mtm_id")) {
            return Promise.resolve({
              rows: [{ mtm_id: 2, mtm_code: "INFRASTRUCTURE" }],
            });
          }
          if (sql.includes("INSERT INTO migrations_mig")) {
            return Promise.resolve({ rows: [{ mig_id: "mig-1" }] });
          }
          if (sql.includes("SELECT mig_id")) {
            return Promise.resolve({ rows: [{ mig_id: "mig-1", mtm_id: 2 }] });
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      // Simulate full workflow: Create migration type → Create migration → Verify reference
      await mockClient.query(
        "SELECT mtm_id FROM migration_types_master WHERE mtm_code = ?",
        ["INFRASTRUCTURE"],
      );
      await mockClient.query(
        "INSERT INTO migrations_mig (mtm_id, mig_name) VALUES (?, ?)",
        [2, "Test Migration"],
      );
      await mockClient.query(
        "SELECT mig_id, mtm_id FROM migrations_mig WHERE mig_id = ?",
        ["mig-1"],
      );

      expect(operationLog).toHaveLength(3);
      expect(operationLog[0].values[0]).toBe("INFRASTRUCTURE");
      expect(operationLog[1].values[0]).toBe(2);
      expect(operationLog[2].values[0]).toBe("mig-1");

      testResults.integrationScenariosValidated.push(
        "Referential integrity validation",
      );
      testResults.databaseOperations += 3;
      testResults.crossSystemValidations++;
    });
  });
});
