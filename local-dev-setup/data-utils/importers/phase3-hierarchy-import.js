/**
 * Phase 3: Hierarchical Import Implementation
 * Imports hierarchical migration data from JSON files
 *
 * Hierarchy: Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions
 * Data Source: JSON files in rawData/json/
 *
 * Pattern: Canonical (_master_) template definitions only
 * Status: Phase 3 focuses on master/template data, not instance execution records
 */

const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { v4: uuidv4 } = require("uuid");
const IMPORT_CONFIG = require("../config/import-config");
const LookupCache = require("../lib/db/lookup-cache");

/**
 * JSON Step Schema
 * {
 *   "step_type": "TRT",
 *   "step_number": 15222,
 *   "title": "ENGINE - PLAR10 Generation and Dump",
 *   "predecessor": "TRT-15222",
 *   "successor": "TRT-15222",
 *   "primary_team": "ENGINE COMMON",
 *   "impacted_teams": "",
 *   "macro_time_sequence": "C - WEEK-END 1 - CSD",
 *   "time_sequence": "EB - TUESDAY ACTIVITIES",
 *   "task_list": [
 *     {
 *       "instruction_assigned_team": "ENGINE COMMON",
 *       "associated_controls": "[ - ](#)",
 *       "instruction_title": "PLAR10 Generation and Dump",
 *       "instruction_id": "TRT-15222-1",
 *       "nominated_user": ""
 *     }
 *   ]
 * }
 */

class HierarchyImporter {
  constructor(pool) {
    this.pool = pool;
    this.lookupCache = new LookupCache(pool);
    this.audit = IMPORT_CONFIG.audit;

    // Tracking for idempotent inserts
    this.stats = {
      steps: { inserted: 0, updated: 0, skipped: 0, errors: [] },
      instructions: { inserted: 0, updated: 0, skipped: 0, errors: [] },
    };
  }

  /**
   * Import all hierarchical data from JSON directory
   * @param {Object} options - Import options
   * @param {string} options.dataDir - Path to JSON directory
   * @param {boolean} options.dryRun - Validation only
   * @param {number} options.batchSize - Records per batch
   * @param {string} options.migrationFilter - Filter by migration name pattern
   * @returns {Promise<Object>} Import results
   */
  async importAll(options = {}) {
    const {
      dataDir = path.join(__dirname, "../../../db/import-data/rawData/json"),
      dryRun = false,
      batchSize = 50,
      migrationFilter = null,
    } = options;

    console.log(chalk.blue("\n=== Phase 3: Hierarchical Import ===\n"));
    console.log(`Data directory: ${dataDir}`);
    console.log(`Dry run: ${dryRun}`);
    console.log(`Batch size: ${batchSize}`);
    if (migrationFilter) {
      console.log(`Migration filter: ${migrationFilter}`);
    }

    const startTime = Date.now();

    try {
      // Load JSON files
      const jsonFiles = await this.loadJsonFiles(dataDir);
      console.log(chalk.cyan(`\n📁 Found ${jsonFiles.length} JSON files`));

      if (jsonFiles.length === 0) {
        console.log(chalk.yellow("⚠️  No JSON files found"));
        return { success: false, error: "No data files found" };
      }

      // Parse and validate
      const steps = await this.parseSteps(jsonFiles, migrationFilter);
      console.log(
        chalk.cyan(
          `📊 Parsed ${steps.length} steps with ${this.countInstructions(steps)} instructions`,
        ),
      );

      if (dryRun) {
        console.log(chalk.green("\n✅ Validation passed (dry run, no import)"));
        return {
          success: true,
          dryRun: true,
          validated: {
            steps: steps.length,
            instructions: this.countInstructions(steps),
          },
        };
      }

      // Import in hierarchical order with batching
      // Note: LookupCache initializes lazily on first use
      await this.importStepsBatched(steps, batchSize);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      this.printSummary(duration);

      return {
        success:
          this.stats.steps.errors.length === 0 &&
          this.stats.instructions.errors.length === 0,
        duration: parseFloat(duration),
        stats: this.stats,
      };
    } catch (error) {
      console.error(
        chalk.red(`\n❌ Hierarchical import failed: ${error.message}`),
      );
      console.error(error.stack);
      return {
        success: false,
        error: error.message,
        stats: this.stats,
      };
    }
  }

  /**
   * Load all JSON files from directory
   * @param {string} dataDir - Directory path
   * @returns {Promise<Array<Object>>} Parsed JSON objects with file paths
   */
  async loadJsonFiles(dataDir) {
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const results = [];
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(dataDir, file);
        const content = await fs.readFile(filePath, "utf8");
        // Remove BOM if present
        const cleanContent = content.replace(/^\uFEFF/, "");
        const data = JSON.parse(cleanContent);
        results.push({
          file,
          filePath,
          data,
        });
      } catch (error) {
        console.warn(
          chalk.yellow(`⚠️  Failed to parse ${file}: ${error.message}`),
        );
      }
    }

    return results;
  }

  /**
   * Parse steps from JSON files
   * @param {Array<Object>} jsonFiles - Loaded JSON files
   * @param {string} migrationFilter - Optional migration name filter
   * @returns {Promise<Array<Object>>} Parsed steps with instructions
   */
  async parseSteps(jsonFiles, migrationFilter = null) {
    const steps = [];

    for (const { file, data } of jsonFiles) {
      try {
        // Validate required fields
        if (!data.step_type || !data.step_number || !data.title) {
          console.warn(
            chalk.yellow(`⚠️  Skipping ${file}: missing required fields`),
          );
          continue;
        }

        // Generate step code: TYPE-NUMBER (e.g., "TRT-15222")
        const stepCode = `${data.step_type}-${data.step_number}`;

        // Apply migration filter if specified (currently we don't have migration info in JSON)
        // This is a placeholder for future enhancement when migration data is available
        if (migrationFilter && !stepCode.includes(migrationFilter)) {
          continue;
        }

        const step = {
          // Step identification
          stm_code: stepCode,
          stm_title: data.title,
          stm_description: data.title, // Use title as description for now

          // Team assignments
          stm_assigned_team: data.primary_team || null,
          stm_impacted_teams: data.impacted_teams || null,

          // Sequencing
          stm_macro_time_sequence: data.macro_time_sequence || null,
          stm_time_sequence: data.time_sequence || null,
          stm_predecessor: data.predecessor || null,
          stm_successor: data.successor || null,

          // Instructions
          instructions: (data.task_list || []).map((task, index) => ({
            inm_code: task.instruction_id || `${stepCode}-${index + 1}`,
            inm_title: task.instruction_title || "Untitled Instruction",
            inm_description: task.instruction_title || null,
            inm_assigned_team:
              task.instruction_assigned_team || data.primary_team || null,
            inm_nominated_user: task.nominated_user || null,
            inm_associated_controls: task.associated_controls || null,
            inm_sequence_number: index + 1,
          })),
        };

        steps.push(step);
      } catch (error) {
        console.warn(
          chalk.yellow(`⚠️  Error parsing ${file}: ${error.message}`),
        );
      }
    }

    return steps;
  }

  /**
   * Count total instructions across all steps
   * @param {Array<Object>} steps - Parsed steps
   * @returns {number} Total instruction count
   */
  countInstructions(steps) {
    return steps.reduce((sum, step) => sum + step.instructions.length, 0);
  }

  /**
   * Import steps in batches
   * @param {Array<Object>} steps - Parsed steps
   * @param {number} batchSize - Batch size
   */
  async importStepsBatched(steps, batchSize) {
    console.log(
      chalk.cyan(
        `\n🔧 Importing ${steps.length} steps in batches of ${batchSize}...`,
      ),
    );

    const batches = this.createBatches(steps, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(
        chalk.cyan(
          `\n   Processing batch ${i + 1}/${batches.length} (${batch.length} steps)...`,
        ),
      );

      await this.importStepBatch(batch);

      // Progress indicator
      const progress = (((i + 1) / batches.length) * 100).toFixed(1);
      console.log(chalk.gray(`   Progress: ${progress}%`));
    }
  }

  /**
   * Import a batch of steps with their instructions
   * @param {Array<Object>} steps - Batch of steps
   */
  async importStepBatch(steps) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      for (const step of steps) {
        try {
          // Resolve team ID from cache
          const teamId = await this.resolveTeamId(
            client,
            step.stm_assigned_team,
          );

          // Insert/update step
          const stepResult = await this.upsertStep(client, step, teamId);

          if (stepResult.inserted) {
            this.stats.steps.inserted++;
          } else if (stepResult.updated) {
            this.stats.steps.updated++;
          } else {
            this.stats.steps.skipped++;
          }

          // Insert instructions for this step
          const stepId = stepResult.stm_id;
          await this.importInstructions(client, step.instructions, stepId);
        } catch (error) {
          this.stats.steps.errors.push({
            step: step.stm_code,
            error: error.message,
          });
          console.error(
            chalk.red(`      ❌ Step ${step.stm_code}: ${error.message}`),
          );
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Upsert a step (idempotent)
   * @param {Object} client - Database client
   * @param {Object} step - Step data
   * @param {number} teamId - Resolved team ID
   * @returns {Promise<Object>} Result with stm_id
   */
  async upsertStep(client, step, teamId) {
    const query = `
      INSERT INTO steps_master_stm (
        stm_code,
        stm_title,
        stm_description,
        tms_id_assigned,
        stm_impacted_teams,
        stm_macro_time_sequence,
        stm_time_sequence,
        stm_predecessor,
        stm_successor,
        created_by,
        updated_by,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (stm_code) DO UPDATE SET
        stm_title = EXCLUDED.stm_title,
        stm_description = EXCLUDED.stm_description,
        tms_id_assigned = EXCLUDED.tms_id_assigned,
        stm_impacted_teams = EXCLUDED.stm_impacted_teams,
        stm_macro_time_sequence = EXCLUDED.stm_macro_time_sequence,
        stm_time_sequence = EXCLUDED.stm_time_sequence,
        stm_predecessor = EXCLUDED.stm_predecessor,
        stm_successor = EXCLUDED.stm_successor,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING stm_id, (xmax = 0) AS inserted
    `;

    const result = await client.query(query, [
      step.stm_code,
      step.stm_title,
      step.stm_description,
      teamId,
      step.stm_impacted_teams,
      step.stm_macro_time_sequence,
      step.stm_time_sequence,
      step.stm_predecessor,
      step.stm_successor,
      this.audit.createdBy,
      this.audit.updatedBy,
    ]);

    return {
      stm_id: result.rows[0].stm_id,
      inserted: result.rows[0].inserted,
      updated: !result.rows[0].inserted,
    };
  }

  /**
   * Import instructions for a step
   * @param {Object} client - Database client
   * @param {Array<Object>} instructions - Instruction data
   * @param {UUID} stepId - Parent step ID
   */
  async importInstructions(client, instructions, stepId) {
    for (const instruction of instructions) {
      try {
        // Resolve team ID for instruction
        const teamId = await this.resolveTeamId(
          client,
          instruction.inm_assigned_team,
        );

        const result = await this.upsertInstruction(
          client,
          instruction,
          stepId,
          teamId,
        );

        if (result.inserted) {
          this.stats.instructions.inserted++;
        } else if (result.updated) {
          this.stats.instructions.updated++;
        } else {
          this.stats.instructions.skipped++;
        }
      } catch (error) {
        this.stats.instructions.errors.push({
          instruction: instruction.inm_code,
          error: error.message,
        });
        console.error(
          chalk.red(
            `        ❌ Instruction ${instruction.inm_code}: ${error.message}`,
          ),
        );
      }
    }
  }

  /**
   * Upsert an instruction (idempotent)
   * @param {Object} client - Database client
   * @param {Object} instruction - Instruction data
   * @param {UUID} stepId - Parent step ID
   * @param {number} teamId - Resolved team ID
   * @returns {Promise<Object>} Result
   */
  async upsertInstruction(client, instruction, stepId, teamId) {
    const query = `
      INSERT INTO instructions_master_inm (
        inm_code,
        stm_id,
        inm_title,
        inm_description,
        tms_id_assigned,
        inm_sequence_number,
        created_by,
        updated_by,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (inm_code) DO UPDATE SET
        inm_title = EXCLUDED.inm_title,
        inm_description = EXCLUDED.inm_description,
        tms_id_assigned = EXCLUDED.tms_id_assigned,
        inm_sequence_number = EXCLUDED.inm_sequence_number,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING inm_id, (xmax = 0) AS inserted
    `;

    const result = await client.query(query, [
      instruction.inm_code,
      stepId,
      instruction.inm_title,
      instruction.inm_description,
      teamId,
      instruction.inm_sequence_number,
      this.audit.createdBy,
      this.audit.updatedBy,
    ]);

    return {
      inm_id: result.rows[0].inm_id,
      inserted: result.rows[0].inserted,
      updated: !result.rows[0].inserted,
    };
  }

  /**
   * Resolve team name to team ID (with fallback to IT_CUTOVER)
   * @param {Object} client - Database client
   * @param {string} teamName - Team name
   * @returns {Promise<number>} Team ID
   */
  async resolveTeamId(client, teamName) {
    if (!teamName || teamName.trim() === "") {
      // Use IT_CUTOVER as default team
      const result = await client.query(
        "SELECT tms_id FROM teams_tms WHERE tms_name = $1",
        ["IT_CUTOVER"],
      );
      return result.rows[0]?.tms_id || null;
    }

    // Try exact match first
    let result = await client.query(
      "SELECT tms_id FROM teams_tms WHERE tms_name = $1",
      [teamName.trim()],
    );

    if (result.rows.length > 0) {
      return result.rows[0].tms_id;
    }

    // Try case-insensitive match
    result = await client.query(
      "SELECT tms_id FROM teams_tms WHERE UPPER(tms_name) = UPPER($1)",
      [teamName.trim()],
    );

    if (result.rows.length > 0) {
      return result.rows[0].tms_id;
    }

    // Fallback to IT_CUTOVER
    console.warn(
      chalk.yellow(`      ⚠️  Team "${teamName}" not found, using IT_CUTOVER`),
    );
    result = await client.query(
      "SELECT tms_id FROM teams_tms WHERE tms_name = $1",
      ["IT_CUTOVER"],
    );

    return result.rows[0]?.tms_id || null;
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
   * Print import summary
   * @param {string} duration - Duration in seconds
   */
  printSummary(duration) {
    console.log(chalk.blue("\n=== Hierarchical Import Summary ===\n"));

    // Steps summary
    console.log(chalk.cyan("📦 Steps (Master):"));
    console.log(
      chalk.green(
        `   ✅ ${this.stats.steps.inserted} inserted, ${this.stats.steps.updated} updated, ${this.stats.steps.skipped} skipped`,
      ),
    );
    if (this.stats.steps.errors.length > 0) {
      console.log(chalk.red(`   ❌ ${this.stats.steps.errors.length} errors`));
      this.stats.steps.errors.slice(0, 5).forEach((err) => {
        console.error(chalk.red(`      - ${err.step}: ${err.error}`));
      });
      if (this.stats.steps.errors.length > 5) {
        console.error(
          chalk.red(
            `      ... and ${this.stats.steps.errors.length - 5} more errors`,
          ),
        );
      }
    }

    // Instructions summary
    console.log(chalk.cyan("\n📝 Instructions (Master):"));
    console.log(
      chalk.green(
        `   ✅ ${this.stats.instructions.inserted} inserted, ${this.stats.instructions.updated} updated, ${this.stats.instructions.skipped} skipped`,
      ),
    );
    if (this.stats.instructions.errors.length > 0) {
      console.log(
        chalk.red(`   ❌ ${this.stats.instructions.errors.length} errors`),
      );
      this.stats.instructions.errors.slice(0, 5).forEach((err) => {
        console.error(chalk.red(`      - ${err.instruction}: ${err.error}`));
      });
      if (this.stats.instructions.errors.length > 5) {
        console.error(
          chalk.red(
            `      ... and ${this.stats.instructions.errors.length - 5} more errors`,
          ),
        );
      }
    }

    // Totals
    const totalInserted =
      this.stats.steps.inserted + this.stats.instructions.inserted;
    const totalUpdated =
      this.stats.steps.updated + this.stats.instructions.updated;
    const totalErrors =
      this.stats.steps.errors.length + this.stats.instructions.errors.length;

    console.log(chalk.blue(`\n⏱️  Duration: ${duration}s`));
    console.log(
      chalk.blue(
        `📊 Total: ${totalInserted} inserted, ${totalUpdated} updated, ${totalErrors} errors`,
      ),
    );
  }
}

module.exports = HierarchyImporter;
