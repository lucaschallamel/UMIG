import { client } from '../lib/db.js';
import {
  faker,
  randomDateInRange,
  nextThursday,
} from '../lib/utils.js';

/**
 * Truncates all migration-related tables.
 * @param {object} client - The PostgreSQL client.
 */
async function eraseMigrationTables(client) {
  console.log('Erasing migration-related tables...');
  // This script is only responsible for migrations_mig and iterations_ite.
  // The canonical plan tables (sequences, phases, steps) are managed by 04_generate_canonical_plans.js.
  // Tables are listed in order of dependency to respect foreign key constraints
  // (e.g., iterations_ite depends on migrations_mig).
  const tables = ['iterations_ite', 'migrations_mig'];
  for (const table of tables) {
    try {
      await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      console.log(`  - Table ${table} truncated.`);
    } catch (error) {
      console.error(`Error truncating table ${table}:`, error);
      throw error;
    }
  }
  console.log('Finished erasing migration tables.');
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

  console.log('Generating migrations and their associated plans and iterations...');
  const { COUNT, START_DATE_RANGE, DURATION_MONTHS, ITERATIONS, TYPE } = config.MIGRATIONS;
  const { PER_MIGRATION } = config.CANONICAL_PLANS;

  const usersResult = await client.query('SELECT usr_id FROM users_usr');
  if (usersResult.rows.length === 0) {
    throw new Error('Cannot generate migrations: No users found in the database.');
  }
  const users = usersResult.rows;

  const plansResult = await client.query('SELECT plm_id FROM plans_master_plm');
  const requiredPlans = COUNT * PER_MIGRATION;
  if (plansResult.rows.length < requiredPlans) {
    throw new Error(`Cannot generate migrations: Not enough canonical plans available. Need ${requiredPlans}, found ${plansResult.rows.length}.`);
  }
  const plans = [...plansResult.rows]; // Create a mutable copy

  for (let i = 0; i < COUNT; i++) {
    const ownerId = faker.helpers.arrayElement(users).usr_id;
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
      TYPE,
      startDate,
      endDate,
    ]);
    const migId = migResult.rows[0].mig_id;

    // Assign plans to this migration and generate iterations for each plan
    const assignedPlans = plans.splice(0, PER_MIGRATION);
    for (const plan of assignedPlans) {
      await generateIterationsForPlan(migId, plan.plm_id, ITERATIONS, startDate);
    }
  }

  console.log('Finished generating migrations.');
}

async function generateIterationsForPlan(migId, planId, iterationConfig, migStartDate) {
  console.log(`  - Generating iterations for plan ${planId} in migration ${migId}`);
  for (const type in iterationConfig) {
    const config = iterationConfig[type];
    const count = typeof config === 'number' ? config : faker.number.int(config);

    for (let i = 0; i < count; i++) {
      const iterStartDate = nextThursday(migStartDate);
      const iterEndDate = new Date(iterStartDate);
      iterEndDate.setDate(iterEndDate.getDate() + 13); // 2 weeks duration

      const iteQuery = `
        INSERT INTO iterations_ite (mig_id, plm_id, itt_code, ite_name, ite_description, ite_status)
        VALUES ($1, $2, $3, $4, $5, $6);
      `;
      await client.query(iteQuery, [
        migId,
        planId,
        type.toUpperCase(),
        `${type.toUpperCase()} Iteration ${i + 1} for Plan ${planId}`,
        `This is the ${i + 1} iteration of type ${type.toUpperCase()} for migration ${migId} under plan ${planId}`,
        faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
      ]);
    }
  }
}

export { generateMigrations, eraseMigrationTables };
