/**
 * Phase 3: Hierarchical Import Implementation - CORRECTED
 * Imports hierarchical migration data from JSON files per US-104 specifications
 *
 * Hierarchy: Plans → Sequences → Phases → Steps → Instructions
 * Data Source: JSON files in rawData/json/ (1,174 files)
 *
 * Pattern: CASCADE lookup/create for sequences, phases, teams, controls
 * Key Fix: Proper field mapping, instruction body composition, junction tables
 */

const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { v4: uuidv4 } = require("uuid");
const IMPORT_CONFIG = require("../config/import-config");
const { getPool } = require("../lib/db/connection-pool");

/**
 * JSON Step Schema (Actual Format from US-104)
 * {
 *   "step_type": "PRE",
 *   "step_number": 45,
 *   "title": "ENVIRONMENTS - SERVER BACKUPS PREPARATION",
 *   "predecessor": "PRE-12286",
 *   "successor": "PRE-12286",
 *   "primary_team": "IT_ENV",
 *   "impacted_teams": "",
 *   "macro_time_sequence": "A - PREMIGRATION",
 *   "time_sequence": "AA - PRE-MIGRATION - PREPARATION",
 *   "task_list": [
 *     {
 *       "instruction_assigned_team": "IT_ENV",
 *       "associated_controls": "",
 *       "instruction_title": "Do Some Cleaning on BACKUP Repo...",
 *       "instruction_id": "PRE-45-1",
 *       "nominated_user": ""
 *     }
 *   ]
 * }
 */

class HierarchyImporter {
  constructor() {
    this.pool = getPool();
    this.audit = IMPORT_CONFIG.audit;

    // Tracking for import results
    this.stats = {
      sequences: { inserted: 0, reused: 0, errors: [] },
      phases: { inserted: 0, reused: 0, errors: [] },
      steps: { inserted: 0, updated: 0, skipped: 0, errors: [] },
      instructions: { inserted: 0, updated: 0, skipped: 0, errors: [] },
      teams: { inserted: 0, reused: 0, errors: [] },
      controls: { inserted: 0, reused: 0, errors: [] },
      impactRelations: { inserted: 0, errors: [] },
    };

    // Cache for lookups within session
    this.cache = {
      sequences: new Map(), // key: plm_id + sqm_name
      phases: new Map(), // key: sqm_id + phm_name
      teams: new Map(), // key: tms_name
      controls: new Map(), // key: ctm_code
      stepTypes: new Map(), // key: stt_code
    };

    // Default values from bootstrap
    this.defaults = {
      planId: null, // Will be loaded from default plan
      teamId: 1, // IT_CUTOVER default team
    };
  }

  /**
   * Import all hierarchical data from JSON directory
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import results
   */
  async importAll(options = {}) {
    const {
      dataDir = path.join(__dirname, "../../../db/import-data/rawData/json"),
      dryRun = false,
      batchSize = 1, // Process one file at a time for granular transactions
      singleFile = null, // Optional: process single file for testing
    } = options;

    console.log(
      chalk.blue("\n=== Phase 3: Hierarchical Import (CORRECTED) ===\n"),
    );
    console.log(`Data directory: ${dataDir}`);
    console.log(`Dry run: ${dryRun}`);
    if (singleFile) {
      console.log(`Single file mode: ${singleFile}`);
    }

    const startTime = Date.now();

    try {
      // Initialize defaults
      await this.loadDefaults();

      // Load JSON files
      const jsonFiles = singleFile
        ? await this.loadSingleFile(dataDir, singleFile)
        : await this.loadJsonFiles(dataDir);

      console.log(chalk.cyan(`\n📁 Found ${jsonFiles.length} JSON file(s)`));

      if (jsonFiles.length === 0) {
        console.log(chalk.yellow("⚠️  No JSON files found"));
        return { success: false, error: "No data files found" };
      }

      // Parse and validate
      const steps = await this.parseSteps(jsonFiles);
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

      // Import with per-file transactions
      await this.importStepsOneByOne(steps);

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
   * Load default plan ID from database
   */
  async loadDefaults() {
    const client = await this.pool.connect();
    try {
      // Get default plan by name (status doesn't matter for Phase 3 import)
      const result = await client.query(`
        SELECT plm_id FROM plans_master_plm
        WHERE plm_name = 'Default Plan'
        ORDER BY created_at ASC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        throw new Error(
          "No active plan found in plans_master_plm. Please ensure bootstrap data exists.",
        );
      }

      this.defaults.planId = result.rows[0].plm_id;
      console.log(
        chalk.gray(`   Using default plan ID: ${this.defaults.planId}`),
      );

      // Load valid step types from database
      const stepTypesResult = await client.query(`
        SELECT stt_code FROM step_types_stt
        ORDER BY stt_code
      `);

      for (const row of stepTypesResult.rows) {
        this.cache.stepTypes.set(row.stt_code, true);
      }

      console.log(
        chalk.gray(
          `   Loaded ${this.cache.stepTypes.size} valid step types: ${Array.from(this.cache.stepTypes.keys()).join(", ")}`,
        ),
      );
    } finally {
      client.release();
    }
  }

  /**
   * Load all JSON files from directory
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
        this.stats.steps.errors.push({
          file,
          error: `Parse error: ${error.message}`,
        });
      }
    }

    return results;
  }

  /**
   * Load a single JSON file (for testing)
   */
  async loadSingleFile(dataDir, filename) {
    const filePath = path.join(dataDir, filename);
    const content = await fs.readFile(filePath, "utf8");
    const cleanContent = content.replace(/^\uFEFF/, "");
    const data = JSON.parse(cleanContent);

    return [
      {
        file: filename,
        filePath,
        data,
      },
    ];
  }

  /**
   * Parse steps from JSON files
   */
  async parseSteps(jsonFiles) {
    const steps = [];

    for (const { file, data } of jsonFiles) {
      try {
        // Validate required fields
        if (!data.step_type || data.step_number === undefined || !data.title) {
          console.warn(
            chalk.yellow(
              `⚠️  Skipping ${file}: missing required fields (step_type, step_number, or title)`,
            ),
          );
          this.stats.steps.errors.push({
            file,
            error: "Missing required fields",
          });
          continue;
        }

        // Validate step_type against database values (loaded from step_types_stt table)
        if (!this.cache.stepTypes.has(data.step_type)) {
          const validStepTypes = Array.from(this.cache.stepTypes.keys()).join(
            ", ",
          );
          console.warn(
            chalk.yellow(
              `⚠️  Skipping ${file}: invalid step_type '${data.step_type}' (must be one of: ${validStepTypes})`,
            ),
          );
          this.stats.steps.errors.push({
            file,
            error: `Invalid step_type: ${data.step_type}. Valid types: ${validStepTypes}`,
          });
          continue;
        }

        const step = {
          file, // Keep file reference for error reporting
          stt_code: data.step_type,
          stm_number: data.step_number,
          stm_name: data.title,
          primary_team: data.primary_team || null,
          impacted_teams: data.impacted_teams || null,
          macro_time_sequence: data.macro_time_sequence || null,
          time_sequence: data.time_sequence || null,

          // Parse instructions (task_list)
          instructions: (data.task_list || []).map((task, index) => ({
            instruction_id:
              task.instruction_id ||
              `${data.step_type}-${data.step_number}-${index + 1}`,
            instruction_title: task.instruction_title || "Untitled Instruction",
            instruction_assigned_team:
              task.instruction_assigned_team || data.primary_team || null,
            associated_controls: task.associated_controls || null,
            inm_order: index + 1,
          })),
        };

        steps.push(step);
      } catch (error) {
        console.warn(
          chalk.yellow(`⚠️  Error parsing ${file}: ${error.message}`),
        );
        this.stats.steps.errors.push({
          file,
          error: error.message,
        });
      }
    }

    return steps;
  }

  /**
   * Count total instructions
   */
  countInstructions(steps) {
    return steps.reduce((sum, step) => sum + step.instructions.length, 0);
  }

  /**
   * Import steps one by one (per-file transactions)
   */
  async importStepsOneByOne(steps) {
    console.log(
      chalk.cyan(
        `\n🔧 Importing ${steps.length} steps (one transaction per file)...`,
      ),
    );

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const progress = (((i + 1) / steps.length) * 100).toFixed(1);

      console.log(
        chalk.gray(
          `\n   [${i + 1}/${steps.length}] Processing ${step.file} (${progress}%)...`,
        ),
      );

      const client = await this.pool.connect();

      try {
        await client.query("BEGIN");

        // CASCADE: Resolve hierarchy (sequence → phase)
        const phm_id = await this.resolvePhaseId(client, step);

        // CASCADE: Resolve primary team
        const tms_id_owner = await this.lookupOrCreateTeam(
          client,
          step.primary_team,
        );

        // Insert/update step
        const stepResult = await this.upsertStep(
          client,
          step,
          phm_id,
          tms_id_owner,
        );

        if (stepResult.inserted) {
          this.stats.steps.inserted++;
        } else if (stepResult.updated) {
          this.stats.steps.updated++;
        } else {
          this.stats.steps.skipped++;
        }

        // Process impacted teams (junction table)
        if (step.impacted_teams && step.impacted_teams.trim() !== "") {
          await this.processImpactedTeams(
            client,
            stepResult.stm_id,
            step.impacted_teams,
          );
        }

        // Insert instructions
        await this.importInstructions(
          client,
          step.instructions,
          stepResult.stm_id,
          phm_id,
        );

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        this.stats.steps.errors.push({
          file: step.file,
          error: error.message,
        });
        console.error(chalk.red(`      ❌ ${step.file}: ${error.message}`));
      } finally {
        client.release();
      }
    }
  }

  /**
   * CASCADE: Resolve phase ID (sequence → phase lookup/create)
   *
   * Pattern:
   * 1. Lookup/create sequence from macro_time_sequence
   * 2. Lookup/create phase from time_sequence within that sequence
   * 3. Return phm_id for step linkage
   */
  async resolvePhaseId(client, step) {
    // Handle empty sequences/phases
    if (!step.macro_time_sequence || !step.time_sequence) {
      // Create default entries if needed
      const defaultSeqName = step.macro_time_sequence || "UNSPECIFIED SEQUENCE";
      const defaultPhaseName = step.time_sequence || "UNSPECIFIED PHASE";

      const sqm_id = await this.lookupOrCreateSequence(client, defaultSeqName);
      return await this.lookupOrCreatePhase(client, defaultPhaseName, sqm_id);
    }

    // Normal flow: cascade through sequence → phase
    const sqm_id = await this.lookupOrCreateSequence(
      client,
      step.macro_time_sequence,
    );
    return await this.lookupOrCreatePhase(client, step.time_sequence, sqm_id);
  }

  /**
   * CASCADE: Lookup or create sequence
   */
  async lookupOrCreateSequence(client, sequenceName) {
    const cacheKey = `${this.defaults.planId}:${sequenceName}`;

    // Check cache
    if (this.cache.sequences.has(cacheKey)) {
      return this.cache.sequences.get(cacheKey);
    }

    // Lookup in database
    let result = await client.query(
      "SELECT sqm_id FROM sequences_master_sqm WHERE sqm_name = $1 AND plm_id = $2",
      [sequenceName, this.defaults.planId],
    );

    if (result.rows.length > 0) {
      const sqm_id = result.rows[0].sqm_id;
      this.cache.sequences.set(cacheKey, sqm_id);
      this.stats.sequences.reused++;
      return sqm_id;
    }

    // Create new sequence with auto-generated order
    const maxOrder = await client.query(
      "SELECT COALESCE(MAX(sqm_order), 0) + 1 as next_order FROM sequences_master_sqm WHERE plm_id = $1",
      [this.defaults.planId],
    );

    result = await client.query(
      `
      INSERT INTO sequences_master_sqm (
        plm_id, sqm_name, sqm_description, sqm_order,
        created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING sqm_id
    `,
      [
        this.defaults.planId,
        sequenceName,
        sequenceName, // Use name as description
        maxOrder.rows[0].next_order,
        this.audit.createdBy,
        this.audit.updatedBy,
      ],
    );

    const sqm_id = result.rows[0].sqm_id;
    this.cache.sequences.set(cacheKey, sqm_id);
    this.stats.sequences.inserted++;

    console.log(chalk.gray(`      ✨ Created sequence: ${sequenceName}`));

    return sqm_id;
  }

  /**
   * CASCADE: Lookup or create phase (within sequence)
   */
  async lookupOrCreatePhase(client, phaseName, sqm_id) {
    const cacheKey = `${sqm_id}:${phaseName}`;

    // Check cache
    if (this.cache.phases.has(cacheKey)) {
      return this.cache.phases.get(cacheKey);
    }

    // Lookup in database
    let result = await client.query(
      "SELECT phm_id FROM phases_master_phm WHERE phm_name = $1 AND sqm_id = $2",
      [phaseName, sqm_id],
    );

    if (result.rows.length > 0) {
      const phm_id = result.rows[0].phm_id;
      this.cache.phases.set(cacheKey, phm_id);
      this.stats.phases.reused++;
      return phm_id;
    }

    // Create new phase with auto-generated order
    const maxOrder = await client.query(
      "SELECT COALESCE(MAX(phm_order), 0) + 1 as next_order FROM phases_master_phm WHERE sqm_id = $1",
      [sqm_id],
    );

    result = await client.query(
      `
      INSERT INTO phases_master_phm (
        sqm_id, phm_name, phm_description, phm_order,
        created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING phm_id
    `,
      [
        sqm_id,
        phaseName,
        phaseName, // Use name as description
        maxOrder.rows[0].next_order,
        this.audit.createdBy,
        this.audit.updatedBy,
      ],
    );

    const phm_id = result.rows[0].phm_id;
    this.cache.phases.set(cacheKey, phm_id);
    this.stats.phases.inserted++;

    console.log(chalk.gray(`      ✨ Created phase: ${phaseName}`));

    return phm_id;
  }

  /**
   * CASCADE: Lookup or create team
   */
  async lookupOrCreateTeam(client, teamName) {
    if (!teamName || teamName.trim() === "") {
      return this.defaults.teamId; // IT_CUTOVER default
    }

    const normalizedName = teamName.trim();

    // Check cache
    if (this.cache.teams.has(normalizedName)) {
      return this.cache.teams.get(normalizedName);
    }

    // Lookup in database
    let result = await client.query(
      "SELECT tms_id FROM teams_tms WHERE tms_name = $1",
      [normalizedName],
    );

    if (result.rows.length > 0) {
      const tms_id = result.rows[0].tms_id;
      this.cache.teams.set(normalizedName, tms_id);
      this.stats.teams.reused++;
      return tms_id;
    }

    // Create new team
    // Generate email from team name (sanitized for email format)
    // Note: tms_email is non-unique (migration 039), so duplicates are allowed
    const emailLocalPart = normalizedName
      .toLowerCase()
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/[^a-z0-9_.-]/g, "") // Remove invalid email characters
      .substring(0, 64); // Limit local part to 64 chars (RFC 5321)
    const tmsEmail = `${emailLocalPart}@umig.com`;

    result = await client.query(
      `
      INSERT INTO teams_tms (
        tms_name, tms_email, tms_description,
        created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING tms_id
    `,
      [
        normalizedName,
        tmsEmail,
        `Auto-created from import: ${normalizedName}`,
        this.audit.createdBy,
        this.audit.updatedBy,
      ],
    );

    const tms_id = result.rows[0].tms_id;
    this.cache.teams.set(normalizedName, tms_id);
    this.stats.teams.inserted++;

    console.log(chalk.gray(`      ✨ Created team: ${normalizedName}`));

    return tms_id;
  }

  /**
   * CASCADE: Lookup or create control
   * Note: Controls are scoped by phm_id (phase-specific controls)
   */
  async lookupOrCreateControl(client, controlCode, phm_id) {
    if (
      !controlCode ||
      controlCode === "[ - ](#)" ||
      controlCode.trim() === ""
    ) {
      return null;
    }

    const normalizedCode = controlCode.trim();
    const cacheKey = `${phm_id}:${normalizedCode}`;

    // Check cache
    if (this.cache.controls.has(cacheKey)) {
      return this.cache.controls.get(cacheKey);
    }

    // Lookup in database (scoped by phm_id and ctm_code)
    let result = await client.query(
      "SELECT ctm_id FROM controls_master_ctm WHERE phm_id = $1 AND ctm_code = $2",
      [phm_id, normalizedCode],
    );

    if (result.rows.length > 0) {
      const ctm_id = result.rows[0].ctm_id;
      this.cache.controls.set(cacheKey, ctm_id);
      this.stats.controls.reused++;
      return ctm_id;
    }

    // Get next ctm_order for this phase
    const orderResult = await client.query(
      "SELECT COALESCE(MAX(ctm_order), 0) + 1 as next_order FROM controls_master_ctm WHERE phm_id = $1",
      [phm_id],
    );
    const ctm_order = orderResult.rows[0].next_order;

    // Create new control (default ctm_type to 'STANDARD' per user decision)
    result = await client.query(
      `
      INSERT INTO controls_master_ctm (
        phm_id, ctm_code, ctm_name, ctm_description, ctm_order, ctm_type,
        created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING ctm_id
    `,
      [
        phm_id,
        normalizedCode,
        normalizedCode, // Use code as name
        `Auto-created from import: ${normalizedCode}`,
        ctm_order,
        "STANDARD", // ctm_type default per user decision
        this.audit.createdBy,
        this.audit.updatedBy,
      ],
    );

    const ctm_id = result.rows[0].ctm_id;
    this.cache.controls.set(cacheKey, ctm_id);
    this.stats.controls.inserted++;

    console.log(
      chalk.gray(
        `      ✨ Created control: ${normalizedCode} (phase ${phm_id}, order ${ctm_order})`,
      ),
    );

    return ctm_id;
  }

  /**
   * Upsert a step (idempotent)
   *
   * CORRECTED SCHEMA:
   * - stt_code (from step_type)
   * - stm_number (from step_number)
   * - stm_name (from title)
   * - tms_id_owner (from primary_team cascade)
   * - phm_id (from time_sequence cascade)
   */
  async upsertStep(client, step, phm_id, tms_id_owner) {
    const stepCode = `${step.stt_code}-${step.stm_number}`;

    // Default enr_id_target to 1 (PROD) for all steps per user decision
    const enr_id_target = 1;

    const query = `
      INSERT INTO steps_master_stm (
        stt_code,
        stm_number,
        stm_name,
        stm_description,
        tms_id_owner,
        phm_id,
        enr_id_target,
        created_by,
        updated_by,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (phm_id, stt_code, stm_number) DO UPDATE SET
        stm_name = EXCLUDED.stm_name,
        stm_description = EXCLUDED.stm_description,
        tms_id_owner = EXCLUDED.tms_id_owner,
        enr_id_target = EXCLUDED.enr_id_target,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING stm_id, (xmax = 0) AS inserted
    `;

    const result = await client.query(query, [
      step.stt_code,
      step.stm_number,
      step.stm_name,
      step.stm_name, // Use name as description for now
      tms_id_owner,
      phm_id,
      enr_id_target,
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
   * Process impacted teams (junction table)
   */
  async processImpactedTeams(client, stm_id, impactedTeamsStr) {
    if (!impactedTeamsStr || impactedTeamsStr.trim() === "") {
      return;
    }

    // Parse comma-separated team names
    const teamNames = impactedTeamsStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && t !== "");

    for (const teamName of teamNames) {
      try {
        // Ensure team exists
        const tms_id = await this.lookupOrCreateTeam(client, teamName);

        // Create junction table entry
        await client.query(
          `
          INSERT INTO steps_master_stm_x_teams_tms_impacted (stm_id, tms_id)
          VALUES ($1, $2)
          ON CONFLICT (stm_id, tms_id) DO NOTHING
        `,
          [stm_id, tms_id],
        );

        this.stats.impactRelations.inserted++;
      } catch (error) {
        this.stats.impactRelations.errors.push({
          stm_id,
          teamName,
          error: error.message,
        });
        console.error(
          chalk.red(`        ❌ Impact relation ${teamName}: ${error.message}`),
        );
      }
    }
  }

  /**
   * Import instructions for a step
   *
   * CORRECTED:
   * - inm_body: "instruction_id - instruction_title"
   * - inm_order: sequence number
   * - tms_id: from instruction_assigned_team cascade
   * - ctm_id: from associated_controls cascade (nullable)
   */
  async importInstructions(client, instructions, stepId, phm_id) {
    for (const instruction of instructions) {
      try {
        // CASCADE: Resolve team
        const tms_id = await this.lookupOrCreateTeam(
          client,
          instruction.instruction_assigned_team,
        );

        // CASCADE: Resolve control (nullable, scoped to phase)
        const ctm_id = await this.lookupOrCreateControl(
          client,
          instruction.associated_controls,
          phm_id,
        );

        // Compose instruction body: "instruction_id - instruction_title"
        const inm_body = `${instruction.instruction_id} - ${instruction.instruction_title}`;

        const result = await this.upsertInstruction(client, {
          inm_body,
          inm_order: instruction.inm_order,
          stm_id: stepId,
          tms_id,
          ctm_id,
        });

        if (result.inserted) {
          this.stats.instructions.inserted++;
        } else if (result.updated) {
          this.stats.instructions.updated++;
        } else {
          this.stats.instructions.skipped++;
        }
      } catch (error) {
        this.stats.instructions.errors.push({
          instruction: instruction.instruction_id,
          error: error.message,
        });
        console.error(
          chalk.red(
            `        ❌ Instruction ${instruction.instruction_id}: ${error.message}`,
          ),
        );
      }
    }
  }

  /**
   * Upsert an instruction (idempotent) using explicit check-update-insert
   * Note: Using explicit logic instead of ON CONFLICT due to missing UNIQUE constraint
   */
  async upsertInstruction(client, instruction) {
    // Check if instruction already exists
    const checkQuery = `
      SELECT inm_id
      FROM instructions_master_inm
      WHERE stm_id = $1 AND inm_order = $2
    `;

    const existing = await client.query(checkQuery, [
      instruction.stm_id,
      instruction.inm_order,
    ]);

    if (existing.rows.length > 0) {
      // Update existing instruction
      const updateQuery = `
        UPDATE instructions_master_inm
        SET inm_body = $1,
            tms_id = $2,
            ctm_id = $3,
            updated_by = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE stm_id = $5 AND inm_order = $6
        RETURNING inm_id
      `;

      const result = await client.query(updateQuery, [
        instruction.inm_body,
        instruction.tms_id,
        instruction.ctm_id,
        this.audit.updatedBy,
        instruction.stm_id,
        instruction.inm_order,
      ]);

      return {
        inm_id: result.rows[0].inm_id,
        inserted: false,
        updated: true,
      };
    } else {
      // Insert new instruction
      const insertQuery = `
        INSERT INTO instructions_master_inm (
          stm_id,
          inm_body,
          inm_order,
          tms_id,
          ctm_id,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING inm_id
      `;

      const result = await client.query(insertQuery, [
        instruction.stm_id,
        instruction.inm_body,
        instruction.inm_order,
        instruction.tms_id,
        instruction.ctm_id,
        this.audit.createdBy,
        this.audit.updatedBy,
      ]);

      return {
        inm_id: result.rows[0].inm_id,
        inserted: true,
        updated: false,
      };
    }
  }

  /**
   * Print import summary
   */
  printSummary(duration) {
    console.log(chalk.blue("\n=== Hierarchical Import Summary ===\n"));

    // Sequences
    console.log(chalk.cyan("🔗 Sequences:"));
    console.log(
      chalk.green(
        `   ✅ ${this.stats.sequences.inserted} created, ${this.stats.sequences.reused} reused`,
      ),
    );

    // Phases
    console.log(chalk.cyan("📋 Phases:"));
    console.log(
      chalk.green(
        `   ✅ ${this.stats.phases.inserted} created, ${this.stats.phases.reused} reused`,
      ),
    );

    // Teams
    console.log(chalk.cyan("👥 Teams:"));
    console.log(
      chalk.green(
        `   ✅ ${this.stats.teams.inserted} created, ${this.stats.teams.reused} reused`,
      ),
    );

    // Controls
    console.log(chalk.cyan("🔒 Controls:"));
    console.log(
      chalk.green(
        `   ✅ ${this.stats.controls.inserted} created, ${this.stats.controls.reused} reused`,
      ),
    );

    // Steps
    console.log(chalk.cyan("\n📦 Steps:"));
    console.log(
      chalk.green(
        `   ✅ ${this.stats.steps.inserted} inserted, ${this.stats.steps.updated} updated, ${this.stats.steps.skipped} skipped`,
      ),
    );
    if (this.stats.steps.errors.length > 0) {
      console.log(chalk.red(`   ❌ ${this.stats.steps.errors.length} errors`));
      this.stats.steps.errors.slice(0, 5).forEach((err) => {
        console.error(chalk.red(`      - ${err.file}: ${err.error}`));
      });
      if (this.stats.steps.errors.length > 5) {
        console.error(
          chalk.red(
            `      ... and ${this.stats.steps.errors.length - 5} more errors`,
          ),
        );
      }
    }

    // Instructions
    console.log(chalk.cyan("\n📝 Instructions:"));
    console.log(
      chalk.green(
        `   ✅ ${this.stats.instructions.inserted} inserted, ${this.stats.instructions.updated} updated, ${this.stats.instructions.skipped} skipped`,
      ),
    );
    if (this.stats.instructions.errors.length > 0) {
      console.log(
        chalk.red(`   ❌ ${this.stats.instructions.errors.length} errors`),
      );
    }

    // Impact Relations
    console.log(chalk.cyan("\n🔗 Impacted Team Relations:"));
    console.log(
      chalk.green(`   ✅ ${this.stats.impactRelations.inserted} created`),
    );
    if (this.stats.impactRelations.errors.length > 0) {
      console.log(
        chalk.red(`   ❌ ${this.stats.impactRelations.errors.length} errors`),
      );
    }

    // Totals
    const totalInserted =
      this.stats.sequences.inserted +
      this.stats.phases.inserted +
      this.stats.teams.inserted +
      this.stats.controls.inserted +
      this.stats.steps.inserted +
      this.stats.instructions.inserted +
      this.stats.impactRelations.inserted;

    const totalErrors =
      this.stats.steps.errors.length +
      this.stats.instructions.errors.length +
      this.stats.impactRelations.errors.length;

    console.log(chalk.blue(`\n⏱️  Duration: ${duration}s`));
    console.log(chalk.blue(`📊 Total Records Created: ${totalInserted}`));
    console.log(chalk.blue(`📊 Total Errors: ${totalErrors}`));

    if (totalErrors === 0) {
      console.log(chalk.green("\n✅ Import completed successfully!"));
    } else {
      console.log(
        chalk.yellow(`\n⚠️  Import completed with ${totalErrors} errors`),
      );
    }
  }
}

module.exports = HierarchyImporter;
