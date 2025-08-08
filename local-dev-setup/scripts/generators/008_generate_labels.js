import { faker } from "../lib/utils.js";
import { client } from "../lib/db.js";

/**
 * Truncates tables related to labels in the correct order.
 * @param {object} dbClient - The PostgreSQL client.
 */
async function eraseLabelsTables(dbClient) {
  console.log("Erasing labels tables...");
  // Truncate join tables first, then the main labels table.
  const tablesToReset = [
    "labels_lbl_x_steps_master_stm",
    "labels_lbl_x_applications_app",
    "labels_lbl_x_controls_master_ctm",
    "labels_lbl",
  ];
  try {
    for (const table of tablesToReset) {
      await dbClient.query(
        `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`,
      );
      console.log(`  - Table ${table} truncated.`);
    }
    console.log("Finished erasing labels tables.");
  } catch (error) {
    console.error(`Error erasing labels tables: ${error}`);
    throw error;
  }
}

/**
 * Generates labels and associates them with steps and applications.
 * @param {object} config - The main configuration object.
 * @param {object} options - Generation options, e.g., { reset: boolean, clientOverride: object }.
 */
async function generateLabels(config, options = {}) {
  const dbClient = options.clientOverride || client;

  if (options.erase) {
    await eraseLabelsTables(dbClient);
  }

  console.log("Generating labels and associations...");

  // Fetch all necessary parent data
  const migrations = await dbClient.query("SELECT mig_id FROM migrations_mig");
  const masterSteps = await dbClient.query(
    "SELECT stm_id FROM steps_master_stm",
  );
  const applications = await dbClient.query(
    "SELECT app_id FROM applications_app",
  );
  const controls = await dbClient.query(
    "SELECT ctm_id FROM controls_master_ctm",
  );

  if (migrations.rows.length === 0) {
    console.error(
      "Cannot generate labels without migrations. Please generate them first.",
    );
    return;
  }

  const allLabelIds = [];

  // 1. Create labels for each migration
  for (const { mig_id } of migrations.rows) {
    const numLabels = faker.number.int({
      min: config.LABELS.PER_MIGRATION.MIN,
      max: config.LABELS.PER_MIGRATION.MAX,
    });

    // Track used label names per migration to ensure uniqueness
    const usedLabelNames = new Set();

    for (let i = 0; i < numLabels; i++) {
      let labelName;
      let attempts = 0;

      // Generate unique label name for this migration
      do {
        labelName = faker.lorem.words({ min: 1, max: 3 });
        attempts++;
        // Add a number suffix if we've tried too many times
        if (attempts > 10) {
          labelName = `${labelName}_${i + 1}`;
          break;
        }
      } while (usedLabelNames.has(labelName));

      usedLabelNames.add(labelName);

      const res = await dbClient.query(
        `INSERT INTO labels_lbl (mig_id, lbl_name, lbl_description, lbl_color, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING lbl_id`,
        [
          mig_id,
          labelName,
          faker.lorem.sentence(),
          faker.internet.color(),
          "generator", // Use 'generator' for data generation
        ],
      );
      allLabelIds.push(res.rows[0].lbl_id);
    }
  }

  if (allLabelIds.length === 0) {
    console.log("No labels were generated, skipping associations.");
    return;
  }

  // 2. Associate labels with a random subset of master steps
  if (masterSteps.rows.length > 0) {
    const stepsToLabel = faker.helpers.arrayElements(
      masterSteps.rows,
      Math.floor(masterSteps.rows.length / 2),
    ); // Label half the steps
    for (const { stm_id } of stepsToLabel) {
      const labelId = faker.helpers.arrayElement(allLabelIds);
      await dbClient.query(
        `INSERT INTO labels_lbl_x_steps_master_stm (lbl_id, stm_id, created_at, created_by)
         VALUES ($1, $2, $3, $4) ON CONFLICT (lbl_id, stm_id) DO NOTHING`,
        [labelId, stm_id, new Date(), "generator"],
      );
    }
  }

  // 3. Associate labels with a random subset of applications
  if (applications.rows.length > 0) {
    const appsToLabel = faker.helpers.arrayElements(
      applications.rows,
      Math.floor(applications.rows.length / 2),
    ); // Label half the apps
    for (const { app_id } of appsToLabel) {
      const labelId = faker.helpers.arrayElement(allLabelIds);
      await dbClient.query(
        `INSERT INTO labels_lbl_x_applications_app (lbl_id, app_id, created_at, created_by)
         VALUES ($1, $2, $3, $4) ON CONFLICT (lbl_id, app_id) DO NOTHING`,
        [labelId, app_id, new Date(), "generator"],
      );
    }
  }

  // 4. Associate labels with a random subset of controls
  if (controls.rows.length > 0) {
    const controlsToLabel = faker.helpers.arrayElements(
      controls.rows,
      Math.floor(controls.rows.length / 2),
    ); // Label half the controls
    for (const { ctm_id } of controlsToLabel) {
      const labelId = faker.helpers.arrayElement(allLabelIds);
      await dbClient.query(
        `INSERT INTO labels_lbl_x_controls_master_ctm (lbl_id, ctm_id, created_at, created_by)
         VALUES ($1, $2, $3, $4) ON CONFLICT (lbl_id, ctm_id) DO NOTHING`,
        [labelId, ctm_id, new Date(), "generator"],
      );
    }
  }

  console.log("Finished generating labels and associations.");
}

export { generateLabels, eraseLabelsTables };
