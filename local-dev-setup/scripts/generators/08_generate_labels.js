import { faker } from '@faker-js/faker';
import { client } from '../lib/db.js';

/**
 * Truncates tables related to labels in the correct order.
 * @param {object} client - The PostgreSQL client.
 */
async function eraseLabelsTables(client) {
  console.log('Erasing labels tables...');
  // Truncate join tables first, then the main labels table.
  const tablesToReset = [
    'labels_lbl_x_steps_master_stm',
    'labels_lbl_x_applications_app',
    'labels_lbl',
  ];
  try {
    for (const table of tablesToReset) {
      await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      console.log(`  - Table ${table} truncated.`);
    }
    console.log('Finished erasing labels tables.');
  } catch (error) {
    console.error(`Error erasing labels tables: ${error}`);
    throw error;
  }
}

/**
 * Generates labels and associates them with steps and applications.
 * @param {object} config - The main configuration object.
 * @param {object} options - Generation options, e.g., { reset: boolean }.
 */
async function generateLabels(config, options = {}) {
  if (options.erase) {
    await eraseLabelsTables(client);
  }

  console.log('Generating labels and associations...');

  // Fetch all necessary parent data
  const migrations = await client.query('SELECT mig_id FROM migrations_mig');
  const masterSteps = await client.query('SELECT stm_id FROM steps_master_stm');
  const applications = await client.query('SELECT app_id FROM applications_app');
  const users = await client.query('SELECT usr_id FROM users_usr');

  if (migrations.rows.length === 0 || users.rows.length === 0) {
    console.error('Cannot generate labels without migrations and users. Please generate them first.');
    return;
  }

  const allLabelIds = [];

  // 1. Create labels for each migration
  for (const { mig_id } of migrations.rows) {
    const numLabels = faker.number.int({ min: config.LABELS.PER_MIGRATION.MIN, max: config.LABELS.PER_MIGRATION.MAX });
    const creatorId = faker.helpers.arrayElement(users.rows).usr_id;

    for (let i = 0; i < numLabels; i++) {
      const res = await client.query(
        `INSERT INTO labels_lbl (mig_id, lbl_name, lbl_description, lbl_color, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING lbl_id`,
        [
          mig_id,
          faker.lorem.words({ min: 1, max: 3 }),
          faker.lorem.sentence(),
          faker.internet.color(),
          creatorId,
        ]
      );
      allLabelIds.push(res.rows[0].lbl_id);
    }
  }

  if (allLabelIds.length === 0) {
    console.log('No labels were generated, skipping associations.');
    return;
  }

  // 2. Associate labels with a random subset of master steps
  if (masterSteps.rows.length > 0) {
    const stepsToLabel = faker.helpers.arrayElements(masterSteps.rows, Math.floor(masterSteps.rows.length / 2)); // Label half the steps
    for (const { stm_id } of stepsToLabel) {
      const labelId = faker.helpers.arrayElement(allLabelIds);
      const creatorId = faker.helpers.arrayElement(users.rows).usr_id;
      await client.query(
        `INSERT INTO labels_lbl_x_steps_master_stm (lbl_id, stm_id, created_by)
         VALUES ($1, $2, $3) ON CONFLICT (lbl_id, stm_id) DO NOTHING`,
        [labelId, stm_id, creatorId]
      );
    }
  }

  // 3. Associate labels with a random subset of applications
  if (applications.rows.length > 0) {
    const appsToLabel = faker.helpers.arrayElements(applications.rows, Math.floor(applications.rows.length / 2)); // Label half the apps
    for (const { app_id } of appsToLabel) {
      const labelId = faker.helpers.arrayElement(allLabelIds);
      const creatorId = faker.helpers.arrayElement(users.rows).usr_id;
      await client.query(
        `INSERT INTO labels_lbl_x_applications_app (lbl_id, app_id, created_by)
         VALUES ($1, $2, $3) ON CONFLICT (lbl_id, app_id) DO NOTHING`,
        [labelId, app_id, creatorId.toString()] // created_by is VARCHAR in this table
      );
    }
  }

  console.log('Finished generating labels and associations.');
}

export { generateLabels, eraseLabelsTables };
