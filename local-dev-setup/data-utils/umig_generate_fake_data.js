#!/usr/bin/env node

const { Command } = require('commander');
const { client, connect, disconnect } = require('./lib/db');
const { generateCoreMetadata } = require('./generators/01_generate_core_metadata');
const { generateTeamsAndApps } = require('./generators/02_generate_teams_apps');
const { generateUsers } = require('./generators/03_generate_users');
const { generateAllEnvironments } = require('./generators/04_generate_environments');
const { generateMigrations } = require('./generators/05_generate_migrations');
const { generateCanonicalPlans } = require('./generators/06_generate_canonical_plans');
const { generateInstanceData } = require('./generators/07_generate_instance_data');
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

async function main() {
  const program = new Command();
  program
    .option('--reset', 'Reset the relevant database tables before generating data')
    .option('--script <number>', 'Run only a specific generator script (e.g., 01, 02, etc.)')
    .parse(process.argv);

  const options = program.opts();

  const generators = {
    '01': () => generateCoreMetadata(), // No reset needed
    '02': () => generateTeamsAndApps(CONFIG, options),
    '03': () => generateUsers(CONFIG, options),
    '04': () => generateAllEnvironments(options),
    '05': () => generateMigrations(CONFIG, options),
    '06': () => generateCanonicalPlans(CONFIG, options),
    '07': () => generateInstanceData(CONFIG, options)
  };

  try {
    await connect();

    if (options.script) {
      if (generators[options.script]) {
        console.log(`\nRunning generator script ${options.script}...`);
        await generators[options.script]();
        console.log(`\n✅ Script ${options.script} completed successfully!`);
      } else {
        console.error(`\n❌ Error: Script '${options.script}' not found. Available scripts are: ${Object.keys(generators).join(', ')}`);
        process.exit(1);
      }
    } else {
      console.log('\nStarting full data generation process...');
      // The order of execution is critical to respect foreign key constraints
      for (const key in generators) {
        await generators[key]();
      }
      console.log('\n✅ Full data generation process completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ An error occurred during the data generation process:');
    console.error(error);
    process.exit(1);
  } finally {
    await disconnect();
  }
}

main();