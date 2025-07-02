#!/usr/bin/env node

import { Command } from 'commander';
import { client, connect, disconnect } from './lib/db.js';
import { generateCoreMetadata } from './generators/01_generate_core_metadata.js';
import { generateTeamsAndApps } from './generators/02_generate_teams_apps.js';
import { generateUsers } from './generators/03_generate_users.js';
import { generateCanonicalPlans } from './generators/04_generate_canonical_plans.js';
import { generateMigrations } from './generators/05_generate_migrations.js';
import { generateAllEnvironments } from './generators/06_generate_environments.js';
import { generateInstanceData } from './generators/07_generate_instance_data.js';
import { generateLabels } from './generators/08_generate_labels.js';

import { ENVIRONMENTS } from './lib/utils.js';

// Centralized configuration for data generation
const CONFIG = {
  MIGRATIONS: {
    COUNT: 5,
    TYPE: 'EXTERNAL',
    START_DATE_RANGE: ['2024-11-01', '2025-06-01'],
    DURATION_MONTHS: 6,
    ITERATIONS: {
      RUN: { min: 2, max: 4 },
      DR: { min: 1, max: 3 },
      CUTOVER: 1,
    },
  },
  TEAMS: {
    COUNT: 20,
    EMAIL_DOMAIN: 'umig.com',
  },
  APPLICATIONS: {
    COUNT: 12,
  },
  USERS: {
    NORMAL: { COUNT: 50 },
    ADMIN: { COUNT: 2 },
    PILOT: { COUNT: 4 },
  },
  ENVIRONMENTS,
  CONTROLS: {
    COUNT: 30,
  },
  CANONICAL_PLANS: {
    PER_MIGRATION: 1,
  },
  LABELS: {
    PER_MIGRATION: { MIN: 3, MAX: 8 },
  },
};

async function main() {
  const program = new Command();
  program
    .option('--erase', 'Erase the relevant database tables before generating data')
    .option('--script <number>', 'Run only a specific generator script (e.g., 01, 02, etc.)')
    .parse(process.argv);

  const options = program.opts();

  const generators = {
    '01': () => generateCoreMetadata(), // No reset needed
    '02': () => generateTeamsAndApps(CONFIG, { ...options, clientOverride: client }),
    '03': () => generateUsers(CONFIG, { ...options, clientOverride: client }),
    '04': () => generateCanonicalPlans(CONFIG, { ...options, clientOverride: client }),
    '05': () => generateMigrations(CONFIG, { ...options, clientOverride: client }),
    '06': () => generateAllEnvironments(CONFIG.ENVIRONMENTS, { ...options, clientOverride: client }),
    '07': () => generateInstanceData(CONFIG, { ...options, clientOverride: client }),
    '08': () => generateLabels(CONFIG, { ...options, clientOverride: client })
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
