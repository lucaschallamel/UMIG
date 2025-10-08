/**
 * Phase 2: Excel Import Implementation
 * Imports teams, users, and applications from Excel files
 */

const ExcelReader = require("../lib/excel/excel-reader");
const LookupCache = require("../lib/db/lookup-cache");
const IMPORT_CONFIG = require("../config/import-config");
const chalk = require("chalk");

// Excel files use database column names directly (no mapping needed)
const SCHEMAS = {
  teams: {
    columns: {
      tms_name: "tms_name",
      tms_email: "tms_email",
      tms_description: "tms_description",
    },
    required: ["tms_name"], // Only tms_name is required per database schema
    maxLength: {
      tms_name: 64, // VARCHAR(64) per database schema
      tms_email: 255, // VARCHAR(255) per database schema
      tms_description: 500, // TEXT field, reasonable limit
    },
    patterns: {
      tms_email: "^[^@]+@[^@]+\\.[^@]+$", // Simple email validation (only if provided)
    },
  },
  users: {
    columns: {
      usr_code: "usr_code",
      usr_first_name: "usr_first_name",
      usr_last_name: "usr_last_name",
      usr_email: "usr_email",
      usr_is_admin: "usr_is_admin",
    },
    required: ["usr_code", "usr_first_name", "usr_last_name", "usr_email"],
    maxLength: {
      usr_code: 3, // VARCHAR(3) per database schema - CRITICAL
      usr_first_name: 50, // VARCHAR(50) per database schema
      usr_last_name: 50, // VARCHAR(50) per database schema
      usr_email: 255, // VARCHAR(255) per database schema
    },
  },
  applications: {
    columns: {
      app_code: "app_code",
      app_name: "app_name",
      app_description: "app_description",
    },
    required: ["app_code", "app_name"],
    maxLength: {
      app_code: 50, // VARCHAR(50) per database schema
      app_name: 64, // VARCHAR(64) per database schema
      app_description: 500, // TEXT field, reasonable limit
    },
  },
  step_types: {
    columns: {
      stt_code: "stt_code",
      stt_name: "stt_name",
      stt_color: "stt_color",
    },
    required: ["stt_code", "stt_name"],
    maxLength: {
      stt_code: 3, // VARCHAR(3) per database schema
      stt_name: 50, // VARCHAR(50) per database schema
      stt_color: 7, // VARCHAR(7) for hex colors like #1ba1e2
    },
    patterns: {
      stt_color: "^#[0-9A-Fa-f]{6}$", // Hex color validation
    },
  },

  sequences: {
    columns: {
      sqm_name: "sqm_name",
      sqm_description: "sqm_description",
    },
    required: ["sqm_name"],
    maxLength: {
      sqm_name: 255, // VARCHAR(255) per database schema
      // sqm_description is TEXT, no limit
    },
  },
};

class ExcelImporter {
  constructor(pool) {
    this.pool = pool;
    this.excelReader = new ExcelReader();
    this.lookupCache = new LookupCache(pool);
    this.audit = IMPORT_CONFIG.audit;
  }

  /**
   * Import all Excel files
   * @param {Object} files - File paths {teams, users, apps}
   * @param {boolean} dryRun - Validation only, no imports
   * @returns {Promise<Object>} Import results
   */
  async importAll(files, dryRun = false) {
    console.log(chalk.blue("\n=== Phase 2: Excel Import ===\n"));

    const results = {};

    // Import in dependency order
    // 1. Step types (no dependencies)
    if (files.step_types) {
      results.step_types = await this.importStepTypes(files.step_types, dryRun);
    }

    // 2. Applications (no dependencies)
    if (files.apps) {
      results.applications = await this.importApplications(files.apps, dryRun);
    }

    // 3. Sequences (depends on default plan existing)
    if (files.sequences) {
      results.sequences = await this.importSequences(files.sequences, dryRun);
    }

    // 4. Teams (no dependencies)
    if (files.teams) {
      results.teams = await this.importTeams(files.teams, dryRun);
    }

    // 5. Users (depends on teams)
    if (files.users) {
      results.users = await this.importUsers(files.users, dryRun);
    }

    this.printSummary(results);
    return results;
  }

  /**
   * Import teams from Excel
   * @param {string} filePath - Path to teams.xlsx
   * @param {boolean} dryRun - Validation only
   * @returns {Promise<Object>} Import results
   */
  async importTeams(filePath, dryRun = false) {
    console.log(chalk.cyan(`\n📊 Importing Teams from ${filePath}...`));

    const startTime = Date.now();

    try {
      // Read Excel file
      const data = await this.excelReader.readSheet(filePath);
      console.log(`   Read ${data.length} team records`);

      // Validate schema
      const validation = this.excelReader.validateSchema(data, SCHEMAS.teams);
      if (!validation.valid) {
        console.error(chalk.red("   ❌ Validation failed:"));
        validation.errors.forEach((err) =>
          console.error(chalk.red(`      - ${err}`)),
        );
        return {
          success: false,
          inserted: 0,
          updated: 0,
          errors: validation.errors,
        };
      }

      if (validation.warnings.length > 0) {
        console.warn(chalk.yellow("   ⚠️  Warnings:"));
        validation.warnings.forEach((warn) =>
          console.warn(chalk.yellow(`      - ${warn}`)),
        );
      }

      if (dryRun) {
        console.log(
          chalk.green("   ✅ Validation passed (dry run, no import)"),
        );
        return {
          success: true,
          dryRun: true,
          validated: data.length,
        };
      }

      // Import in batches
      let inserted = 0;
      let updated = 0;
      const errors = [];

      const batches = this.createBatches(data, IMPORT_CONFIG.batchSize.excel);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(
          `   Processing batch ${i + 1}/${batches.length} (${batch.length} records)...`,
        );

        const batchResult = await this.insertTeamBatch(batch);
        inserted += batchResult.inserted;
        updated += batchResult.updated;
        errors.push(...batchResult.errors);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        chalk.green(
          `   ✅ Teams import complete: ${inserted} inserted, ${updated} updated (${duration}s)`,
        ),
      );

      return {
        success: errors.length === 0,
        inserted,
        updated,
        errors,
        duration: parseFloat(duration),
      };
    } catch (error) {
      console.error(chalk.red(`   ❌ Teams import failed: ${error.message}`));
      return {
        success: false,
        inserted: 0,
        updated: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Insert batch of teams with idempotent upsert
   * @param {Array<Object>} teams - Team records
   * @returns {Promise<Object>} Batch result
   */
  async insertTeamBatch(teams) {
    const client = await this.pool.connect();
    let inserted = 0;
    let updated = 0;
    const errors = [];

    try {
      await client.query("BEGIN");

      for (const team of teams) {
        try {
          // Default email for teams without email (tms_email allows duplicates after migration 039)
          // Generate unique email using team name for NULL/empty values only
          const emailValue =
            team["tms_email"] && team["tms_email"].trim() !== ""
              ? team["tms_email"]
              : `noemail.${team["tms_name"].toLowerCase().replace(/[^a-z0-9]/g, "_")}@ubp.ch`;

          const query = `
            INSERT INTO teams_tms (
              tms_name,
              tms_email,
              tms_description,
              created_by,
              updated_by,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (tms_name) DO UPDATE SET
              tms_email = EXCLUDED.tms_email,
              tms_description = EXCLUDED.tms_description,
              updated_by = EXCLUDED.updated_by,
              updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
          `;

          const result = await client.query(query, [
            team["tms_name"],
            emailValue,
            team["tms_description"] || null,
            this.audit.createdBy,
            this.audit.updatedBy,
          ]);

          // xmax = 0 means INSERT, xmax != 0 means UPDATE
          if (result.rows[0].inserted) {
            inserted++;
          } else {
            updated++;
          }
        } catch (error) {
          errors.push({
            team: team["tms_name"],
            error: error.message,
          });
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return { inserted, updated, errors };
  }

  /**
   * Import users from Excel
   * @param {string} filePath - Path to users.xlsx
   * @param {boolean} dryRun - Validation only
   * @returns {Promise<Object>} Import results
   */
  async importUsers(filePath, dryRun = false) {
    console.log(chalk.cyan(`\n👥 Importing Users from ${filePath}...`));

    const startTime = Date.now();

    try {
      const data = await this.excelReader.readSheet(filePath);
      console.log(`   Read ${data.length} user records`);

      const validation = this.excelReader.validateSchema(data, SCHEMAS.users);
      if (!validation.valid) {
        console.error(chalk.red("   ❌ Validation failed:"));
        validation.errors.forEach((err) =>
          console.error(chalk.red(`      - ${err}`)),
        );
        return {
          success: false,
          inserted: 0,
          updated: 0,
          errors: validation.errors,
        };
      }

      if (dryRun) {
        console.log(
          chalk.green("   ✅ Validation passed (dry run, no import)"),
        );
        return { success: true, dryRun: true, validated: data.length };
      }

      let inserted = 0;
      let updated = 0;
      const errors = [];

      const batches = this.createBatches(data, IMPORT_CONFIG.batchSize.excel);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(
          `   Processing batch ${i + 1}/${batches.length} (${batch.length} records)...`,
        );

        const batchResult = await this.insertUserBatch(batch);
        inserted += batchResult.inserted;
        updated += batchResult.updated;
        errors.push(...batchResult.errors);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        chalk.green(
          `   ✅ Users import complete: ${inserted} inserted, ${updated} updated (${duration}s)`,
        ),
      );

      return {
        success: errors.length === 0,
        inserted,
        updated,
        errors,
        duration: parseFloat(duration),
      };
    } catch (error) {
      console.error(chalk.red(`   ❌ Users import failed: ${error.message}`));
      return {
        success: false,
        inserted: 0,
        updated: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Insert batch of users with idempotent upsert
   * @param {Array<Object>} users - User records
   * @returns {Promise<Object>} Batch result
   */
  async insertUserBatch(users) {
    const client = await this.pool.connect();
    let inserted = 0;
    let updated = 0;
    const errors = [];

    try {
      await client.query("BEGIN");

      for (const user of users) {
        try {
          const query = `
            INSERT INTO users_usr (
              usr_code,
              usr_first_name,
              usr_last_name,
              usr_email,
              usr_is_admin,
              created_by,
              updated_by,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (usr_code) DO UPDATE SET
              usr_first_name = EXCLUDED.usr_first_name,
              usr_last_name = EXCLUDED.usr_last_name,
              usr_email = EXCLUDED.usr_email,
              usr_is_admin = EXCLUDED.usr_is_admin,
              updated_by = EXCLUDED.updated_by,
              updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
          `;

          // Parse is_admin status (handle boolean/string)
          let isAdmin = false;
          if (
            user["usr_is_admin"] !== undefined &&
            user["usr_is_admin"] !== null
          ) {
            if (typeof user["usr_is_admin"] === "boolean") {
              isAdmin = user["usr_is_admin"];
            } else {
              const adminStr = user["usr_is_admin"].toString().toLowerCase();
              isAdmin =
                adminStr === "true" || adminStr === "1" || adminStr === "yes";
            }
          }

          const result = await client.query(query, [
            user["usr_code"],
            user["usr_first_name"],
            user["usr_last_name"],
            user["usr_email"],
            isAdmin,
            this.audit.createdBy,
            this.audit.updatedBy,
          ]);

          if (result.rows[0].inserted) {
            inserted++;
          } else {
            updated++;
          }
        } catch (error) {
          errors.push({
            user: user["usr_code"],
            error: error.message,
          });
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return { inserted, updated, errors };
  }

  /**
   * Import applications from Excel
   * @param {string} filePath - Path to applications.xlsx
   * @param {boolean} dryRun - Validation only
   * @returns {Promise<Object>} Import results
   */
  async importApplications(filePath, dryRun = false) {
    console.log(chalk.cyan(`\n📱 Importing Applications from ${filePath}...`));

    const startTime = Date.now();

    try {
      const data = await this.excelReader.readSheet(filePath);
      console.log(`   Read ${data.length} application records`);

      const validation = this.excelReader.validateSchema(
        data,
        SCHEMAS.applications,
      );
      if (!validation.valid) {
        console.error(chalk.red("   ❌ Validation failed:"));
        validation.errors.forEach((err) =>
          console.error(chalk.red(`      - ${err}`)),
        );
        return {
          success: false,
          inserted: 0,
          updated: 0,
          errors: validation.errors,
        };
      }

      if (dryRun) {
        console.log(
          chalk.green("   ✅ Validation passed (dry run, no import)"),
        );
        return { success: true, dryRun: true, validated: data.length };
      }

      let inserted = 0;
      let updated = 0;
      const errors = [];

      const batches = this.createBatches(data, IMPORT_CONFIG.batchSize.excel);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(
          `   Processing batch ${i + 1}/${batches.length} (${batch.length} records)...`,
        );

        const batchResult = await this.insertApplicationBatch(batch);
        inserted += batchResult.inserted;
        updated += batchResult.updated;
        errors.push(...batchResult.errors);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        chalk.green(
          `   ✅ Applications import complete: ${inserted} inserted, ${updated} updated (${duration}s)`,
        ),
      );

      return {
        success: errors.length === 0,
        inserted,
        updated,
        errors,
        duration: parseFloat(duration),
      };
    } catch (error) {
      console.error(
        chalk.red(`   ❌ Applications import failed: ${error.message}`),
      );
      return {
        success: false,
        inserted: 0,
        updated: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Insert batch of applications with idempotent upsert
   * @param {Array<Object>} applications - Application records
   * @returns {Promise<Object>} Batch result
   */
  async insertApplicationBatch(applications) {
    const client = await this.pool.connect();
    let inserted = 0;
    let updated = 0;
    const errors = [];

    try {
      await client.query("BEGIN");

      for (const app of applications) {
        try {
          const query = `
            INSERT INTO applications_app (
              app_code,
              app_name,
              app_description,
              created_by,
              updated_by,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (app_code) DO UPDATE SET
              app_name = EXCLUDED.app_name,
              app_description = EXCLUDED.app_description,
              updated_by = EXCLUDED.updated_by,
              updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
          `;

          const result = await client.query(query, [
            app["app_code"],
            app["app_name"],
            app["app_description"] || null,
            this.audit.createdBy,
            this.audit.updatedBy,
          ]);

          if (result.rows[0].inserted) {
            inserted++;
          } else {
            updated++;
          }
        } catch (error) {
          errors.push({
            application: app["app_code"],
            error: error.message,
          });
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return { inserted, updated, errors };
  }

  /**
   * Create batches from array
   * @param {Array} array - Source array
   * @param {number} batchSize - Batch size
   * @returns {Array<Array>} Array of batches
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Import step types from Excel
   * @param {string} filePath - Path to step_types.xlsx
   * @param {boolean} dryRun - Validation only
   * @returns {Promise<Object>} Import results
   */
  async importStepTypes(filePath, dryRun = false) {
    console.log(chalk.yellow(`\n📋 Importing step types from ${filePath}...`));

    try {
      const startTime = Date.now();
      const rows = await this.excelReader.readSheet(filePath);

      if (rows.length === 0) {
        throw new Error("No data found in Excel file");
      }

      console.log(chalk.gray(`   Found ${rows.length} rows to process`));

      // Validate schema
      const validation = this.excelReader.validateSchema(
        rows,
        SCHEMAS.step_types,
      );
      if (!validation.valid) {
        console.error(chalk.red("   ❌ Validation failed:"));
        validation.errors.forEach((err) =>
          console.error(chalk.red(`      - ${err}`)),
        );
        return {
          success: false,
          inserted: 0,
          updated: 0,
          errors: validation.errors,
        };
      }

      if (validation.warnings.length > 0) {
        console.warn(chalk.yellow("   ⚠️  Warnings:"));
        validation.warnings.forEach((warn) =>
          console.warn(chalk.yellow(`      - ${warn}`)),
        );
      }

      console.log(chalk.green(`   ✅ Validation passed`));

      if (dryRun) {
        console.log(
          chalk.blue(`   [DRY RUN] Would import ${rows.length} step types`),
        );
        return {
          success: true,
          inserted: 0,
          updated: 0,
          errors: [],
          dryRun: true,
        };
      }

      // Import in batches
      const batches = this.createBatches(rows, IMPORT_CONFIG.batchSize.excel);
      let inserted = 0;
      let updated = 0;
      const errors = [];

      for (const [index, batch] of batches.entries()) {
        console.log(
          chalk.gray(`   Processing batch ${index + 1}/${batches.length}...`),
        );
        const result = await this.insertStepTypeBatch(batch);
        inserted += result.inserted;
        updated += result.updated;
        errors.push(...result.errors);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        chalk.green(
          `   ✅ Step types import complete: ${inserted} inserted, ${updated} updated (${duration}s)`,
        ),
      );

      return {
        success: errors.length === 0,
        inserted,
        updated,
        errors,
        duration: parseFloat(duration),
      };
    } catch (error) {
      console.error(
        chalk.red(`   ❌ Step types import failed: ${error.message}`),
      );
      return {
        success: false,
        inserted: 0,
        updated: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Insert batch of step types with idempotent upsert
   * @param {Array<Object>} stepTypes - Step type records
   * @returns {Promise<Object>} Batch result
   */
  async insertStepTypeBatch(stepTypes) {
    const client = await this.pool.connect();
    let inserted = 0;
    let updated = 0;
    const errors = [];

    try {
      await client.query("BEGIN");

      for (const stepType of stepTypes) {
        try {
          const query = `
            INSERT INTO step_types_stt (
              stt_code,
              stt_name,
              stt_color,
              created_by,
              updated_by,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (stt_code) DO UPDATE SET
              stt_name = EXCLUDED.stt_name,
              stt_color = EXCLUDED.stt_color,
              updated_by = EXCLUDED.updated_by,
              updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
          `;

          const result = await client.query(query, [
            stepType["stt_code"],
            stepType["stt_name"],
            stepType["stt_color"] || null,
            this.audit.createdBy,
            this.audit.updatedBy,
          ]);

          if (result.rows[0].inserted) {
            inserted++;
          } else {
            updated++;
          }
        } catch (error) {
          errors.push({
            stepType: stepType["stt_code"],
            error: error.message,
          });
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return { inserted, updated, errors };
  }

  /**
   * Import sequences from Excel
   * @param {string} filePath - Path to sequences.xlsx
   * @param {boolean} dryRun - Validation only
   * @returns {Promise<Object>} Import results
   */
  async importSequences(filePath, dryRun = false) {
    console.log(chalk.yellow(`\n📋 Importing sequences from ${filePath}...`));

    try {
      const startTime = Date.now();
      const rows = await this.excelReader.readSheet(filePath);

      if (rows.length === 0) {
        throw new Error("No data found in Excel file");
      }

      console.log(chalk.gray(`   Found ${rows.length} rows to process`));

      // Validate schema
      const validation = this.excelReader.validateSchema(
        rows,
        SCHEMAS.sequences,
      );
      if (!validation.valid) {
        console.error(chalk.red("   ❌ Validation failed:"));
        validation.errors.forEach((err) =>
          console.error(chalk.red(`      - ${err}`)),
        );
        return {
          success: false,
          inserted: 0,
          updated: 0,
          errors: validation.errors,
        };
      }

      if (validation.warnings.length > 0) {
        console.warn(chalk.yellow("   ⚠️  Warnings:"));
        validation.warnings.forEach((warn) =>
          console.warn(chalk.yellow(`      - ${warn}`)),
        );
      }

      console.log(chalk.green(`   ✅ Validation passed`));

      if (dryRun) {
        console.log(
          chalk.blue(`   [DRY RUN] Would import ${rows.length} sequences`),
        );
        return {
          success: true,
          inserted: 0,
          updated: 0,
          errors: [],
          dryRun: true,
        };
      }

      // Import in batches
      const batches = this.createBatches(rows, IMPORT_CONFIG.batchSize.excel);
      let inserted = 0;
      let updated = 0;
      const errors = [];

      for (const [index, batch] of batches.entries()) {
        console.log(
          chalk.gray(`   Processing batch ${index + 1}/${batches.length}...`),
        );
        const result = await this.insertSequenceBatch(batch);
        inserted += result.inserted;
        updated += result.updated;
        errors.push(...result.errors);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        chalk.green(
          `   ✅ Sequences import complete: ${inserted} inserted, ${updated} updated (${duration}s)`,
        ),
      );

      return {
        success: errors.length === 0,
        inserted,
        updated,
        errors,
        duration: parseFloat(duration),
      };
    } catch (error) {
      console.error(
        chalk.red(`   ❌ Sequences import failed: ${error.message}`),
      );
      return {
        success: false,
        inserted: 0,
        updated: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Insert batch of sequences with idempotent upsert
   * @param {Array<Object>} sequences - Sequence records
   * @returns {Promise<Object>} Batch result
   */
  async insertSequenceBatch(sequences) {
    const client = await this.pool.connect();
    let inserted = 0;
    let updated = 0;
    const errors = [];

    try {
      await client.query("BEGIN");

      // Get default plan ID (assuming "Default Plan" exists from bootstrap)
      const planResult = await client.query(
        `SELECT plm_id FROM plans_master_plm WHERE plm_name = $1 LIMIT 1`,
        ["Default Plan"],
      );

      if (planResult.rows.length === 0) {
        throw new Error(
          "Default plan not found - please ensure bootstrap data is loaded first",
        );
      }

      const plm_id = planResult.rows[0].plm_id;

      for (const sequence of sequences) {
        try {
          // Get next sqm_order for this plan
          const orderResult = await client.query(
            `SELECT COALESCE(MAX(sqm_order), 0) + 1 AS next_order
             FROM sequences_master_sqm
             WHERE plm_id = $1`,
            [plm_id],
          );
          const sqm_order = orderResult.rows[0].next_order;

          const query = `
            INSERT INTO sequences_master_sqm (
              plm_id,
              sqm_order,
              sqm_name,
              sqm_description,
              created_by,
              updated_by,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (plm_id, sqm_name) DO UPDATE SET
              sqm_description = EXCLUDED.sqm_description,
              updated_by = EXCLUDED.updated_by,
              updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
          `;

          const result = await client.query(query, [
            plm_id,
            sqm_order,
            sequence["sqm_name"],
            sequence["sqm_description"] || null,
            this.audit.createdBy,
            this.audit.updatedBy,
          ]);

          if (result.rows[0].inserted) {
            inserted++;
          } else {
            updated++;
          }
        } catch (error) {
          errors.push({
            sequence: sequence["sqm_name"],
            error: error.message,
          });
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return { inserted, updated, errors };
  }

  /**
   * Print import summary
   * @param {Object} results - Import results
   */
  printSummary(results) {
    console.log(chalk.blue("\n=== Import Summary ===\n"));

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const [entity, result] of Object.entries(results)) {
      if (result.success || result.dryRun) {
        if (result.dryRun) {
          console.log(
            chalk.green(`${entity}: ${result.validated} records validated ✅`),
          );
        } else {
          console.log(
            chalk.green(
              `${entity}: ${result.inserted} inserted, ${result.updated} updated ✅`,
            ),
          );
          totalInserted += result.inserted;
          totalUpdated += result.updated;
        }
      } else {
        console.log(chalk.red(`${entity}: ${result.errors.length} errors ❌`));
        // Show first 5 errors for debugging
        result.errors.slice(0, 5).forEach((err) => {
          console.error(chalk.red(`   - ${JSON.stringify(err)}`));
        });
        if (result.errors.length > 5) {
          console.error(
            chalk.red(`   ... and ${result.errors.length - 5} more errors`),
          );
        }
        totalErrors += result.errors.length;
      }
    }

    if (!results.teams?.dryRun) {
      console.log(
        chalk.blue(
          `\nTotal: ${totalInserted} inserted, ${totalUpdated} updated, ${totalErrors} errors`,
        ),
      );
    }
  }
}

module.exports = ExcelImporter;
