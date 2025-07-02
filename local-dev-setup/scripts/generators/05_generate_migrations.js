import { faker } from '@faker-js/faker';
import { client } from '../lib/db.js';
import {
  randomDateInRange,
  nextThursday,
  getSequenceWindows,
  SEQUENCE_NAMES,
} from '../lib/utils.js';

/**
 * Truncates all migration-related tables.
 * @param {object} client - The PostgreSQL client.
 */
async function eraseMigrationTables(client) {
  console.log('Erasing migration-related tables...');
  const tables = [
    'iterations_ite',
    'steps_master_stm',
    'phases_master_phm',
    'sequences_master_sqm',
    'migrations_mig',
  ];
  try {
    for (const table of tables) {
      await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      console.log(`  - Table ${table} truncated.`);
    }
    console.log('Finished erasing migration tables.');
  } catch (error) {
    console.error(`Error erasing migration tables: ${error}`);
    throw error;
  }
}

/**
 * Main function to generate migrations and their related data.
 * @param {object} config - The main configuration object.
 * @param {object} options - Generation options, e.g., { reset: boolean }.
 */
async function generateMigrations(config, options = {}) {
  if (options.erase) {
    await eraseMigrationTables(client);
  }

  console.log('Generating migrations...');
  const { COUNT, START_DATE_RANGE, DURATION_MONTHS, ITERATIONS } = config.MIGRATIONS;

  // Get all users to assign as owners
  const users = await client.query('SELECT usr_id FROM users_usr');
  if (users.rows.length === 0) {
    console.error('Cannot generate migrations without users. Please generate users first.');
    return;
  }

  for (let i = 0; i < COUNT; i++) {
    const ownerId = faker.helpers.arrayElement(users.rows).usr_id;
    const startDate = randomDateInRange(START_DATE_RANGE[0], START_DATE_RANGE[1]);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + DURATION_MONTHS);

    const migQuery = `
      INSERT INTO migrations_mig (usr_id_owner, mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING mig_id;
    `;
    const migResult = await client.query(migQuery, [
      ownerId,
      `Migration ${i + 1}: ${faker.company.catchPhrase()}`,
      faker.lorem.sentence(),
      faker.helpers.arrayElement(['PLANNING', 'IN_PROGRESS', 'COMPLETED']),
      'MIGRATION',
      startDate,
      endDate,
    ]);
    const migId = migResult.rows[0].mig_id;

    // Generate iterations for this migration
    await generateIterationsForMigration(migId, startDate, ITERATIONS);
  }

  console.log('Finished generating migrations.');
}

/**
 * Generates iterations for a given migration.
 * @param {string} migId - The UUID of the migration.
 * @param {Date} migStartDate - The start date of the migration.
 * @param {object} iterationConfig - The configuration for iterations.
 */
async function generateIterationsForMigration(migId, migStartDate, iterationConfig) {
  // Fetch all master plans to link to iterations
  const masterPlans = await client.query('SELECT plm_id FROM plans_master_plm');
  if (masterPlans.rows.length === 0) {
    console.error('Cannot generate iterations without master plans. Please generate canonical plans first.');
    return;
  }

  for (const type in iterationConfig) {
    const count = faker.number.int(iterationConfig[type]);
    for (let i = 0; i < count; i++) {
      const iterStartDate = nextThursday(migStartDate);
      const iterEndDate = new Date(iterStartDate);
      iterEndDate.setDate(iterEndDate.getDate() + 13);

      const planId = faker.helpers.arrayElement(masterPlans.rows).plm_id;

      const iteQuery = `
        INSERT INTO iterations_ite (mig_id, plm_id, itt_code, ite_name, ite_description, ite_status)
        VALUES ($1, $2, $3, $4, $5, $6);
      `;
      await client.query(iteQuery, [
        migId,
        planId,
        type,
        `${type} Iteration ${i + 1}`,
        `This is the ${i + 1} iteration of type ${type} for migration ${migId}`,
        faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
      ]);
    }
  }
}

export { generateMigrations, eraseMigrationTables };
