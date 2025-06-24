#!/usr/bin/env node

const { Command } = require('commander');
const { client, connect, disconnect } = require('./lib/db');
const { generateCoreMetadata } = require('./generators/01_generate_core_metadata');
const { generateTeamsAndApps } = require('./generators/02_generate_teams_apps');
const { generateUsers } = require('./generators/03_generate_users');
const { generateAllEnvironments } = require('./generators/04_generate_environments');
const { generateLegacyPlans } = require('./generators/05_generate_legacy_plans');
const { generateCanonicalPlans } = require('./generators/06_generate_canonical_plans');
const readline = require('readline');

// Centralized configuration for data generation
const CONFIG = {
  num_migrations: 5,
  mig_type: 'EXTERNAL',
  mig_start_date_range: ['2024-11-01', '2025-06-01'],
  mig_duration_months: 6,
  iterations: {
    run: { min: 2, max: 4 },
    dr: { min: 1, max: 3 },
    cutover: 1
  },
  num_teams: 20,
  teams_email_domain: 'umig.com',
  num_apps: 12,
  num_users: 50,
  num_pilot_users: 4,
  num_admin_users: 2,
  num_controls: 30,
  num_canonical_plans: 5
};

async function confirmReset() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\nWARNING: This will DELETE ALL DATA from the database. Are you sure? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function resetDatabase() {
  console.log('Truncating ALL user tables in the database...');
  await client.query('BEGIN');
  const { rows } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE 'sql_%'
    AND tablename NOT IN ('databasechangelog', 'databasechangeloglock', 'status_sts')
  `);
  const tableNames = rows.map(r => `"${r.tablename}"`);
  if (tableNames.length > 0) {
    await client.query(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`);
    console.log(`Truncated tables: ${tableNames.join(', ')}`);
  } else {
    console.log('No user tables found to truncate.');
  }
  await client.query('COMMIT');
  console.log('All tables truncated.');
}

async function main() {
  const program = new Command();
  program
    .option('--reset', 'Reset the database by truncating all tables before generating data')
    .parse(process.argv);

  const options = program.opts();

  try {
    await connect();

    if (options.reset) {
      if (await confirmReset()) {
        await resetDatabase();
      } else {
        console.log('Aborting data generation.');
        return;
      }
    }

    console.log('\nStarting data generation process...');
    // The order of execution is critical to respect foreign key constraints
    await generateCoreMetadata();
    await generateTeamsAndApps(CONFIG);
    await generateUsers(CONFIG);
    await generateLegacyPlans(CONFIG); // Must run before environments to create iterations
    await generateAllEnvironments();
    //await generateCanonicalPlans(CONFIG); // Our new tables!

    console.log('\n✅ Data generation process completed successfully!');

  } catch (error) {
    console.error('\n❌ An error occurred during the data generation process:');
    console.error(error);
    process.exit(1);
  } finally {
    await disconnect();
  }
}

main();