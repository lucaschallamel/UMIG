#!/usr/bin/env node

import { Command } from 'commander';
import { client, connect, disconnect } from './lib/db.js';
import { generateCoreMetadata } from './generators/001_generate_core_metadata.js';
import { generateTeamsAndApps } from './generators/002_generate_teams_apps.js';
import { generateUsers } from './generators/003_generate_users.js';
import { generateCanonicalPlans } from './generators/004_generate_canonical_plans.js';
import { generateStepPilotComments } from './generators/009_generate_step_pilot_comments.js';
import { generateStepInstanceComments } from './generators/100_generate_step_instance_comments.js';
import { generateInstructions } from './generators/098_generate_instructions.js';
import { generateMigrations } from './generators/005_generate_migrations.js';
import { generateAllEnvironments } from './generators/006_generate_environments.js';
import { generateInstanceData } from './generators/099_generate_instance_data.js';
import { generateLabels } from './generators/008_generate_labels.js';
import { generateControls } from './generators/007_generate_controls.js';

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
  INSTRUCTIONS: {
    // For instructions_master_inm
    PER_STEP: { MIN: 1, MAX: 5 }, // Each step gets 1-5 instructions
    BODY_TYPE: 'sentence', // faker.lorem.sentence()
    DURATION_MIN: 5,       // minutes
    DURATION_MAX: 30,      // minutes
    REQUIRE_TEAM: true,    // tms_id is required
    OPTIONAL_CONTROL: true, // ctm_id can be null or random
    // For instructions_instance_ini
    INSTANTIATE_FOR_ALL_STEP_INSTANCES: true
  }
};

async function main() {
  const program = new Command();
  program
    .allowUnknownOption(true)
    .option('--erase', 'Erase the relevant database tables before generating data')
    .option('--script <number>', 'Run only a specific generator script (e.g., 01, 02, etc.)')
    .parse(process.argv);

  const options = program.opts();
  // Detect --<3-digit> generator flags (e.g., --099)
  const argGenerators = process.argv.filter(arg => /^--\d{3}$/.test(arg)).map(arg => arg.slice(2));

  const generators = {
    '001': () => generateCoreMetadata(), // No reset needed
    '002': () => generateTeamsAndApps(CONFIG, { ...options, clientOverride: client }),
    '003': () => generateUsers(CONFIG, { ...options, clientOverride: client }),
    '004': () => generateCanonicalPlans(CONFIG, { ...options, clientOverride: client }),
    // Insert pilot comments after canonical plans
    '009': () => generateStepPilotComments(CONFIG, { ...options, clientOverride: client }),
    '005': () => generateMigrations(CONFIG, { ...options, clientOverride: client }),
    '006': () => generateAllEnvironments(CONFIG.ENVIRONMENTS, { ...options, clientOverride: client }),
    '008': () => generateLabels(CONFIG, { ...options, clientOverride: client }),
    '007': () => generateControls(CONFIG, { ...options, clientOverride: client }),
    '098': () => generateInstructions(CONFIG, { ...options, clientOverride: client }),
    '099': () => generateInstanceData(CONFIG, { ...options, clientOverride: client }),
    // Insert instance comments after all instance data
    '100': () => generateStepInstanceComments(CONFIG, { ...options, clientOverride: client })
  };

  try {
    await connect();

    if (argGenerators.length > 0) {
      for (const genNum of argGenerators) {
        if (generators[genNum]) {
          console.log(`\n[INFO] Running generator ${genNum}...`);
          await generators[genNum]();
          console.log(`\n✅ Script ${genNum} completed successfully!`);
        } else {
          console.error(`\n❌ Error: Script '${genNum}' not found. Available scripts are: ${Object.keys(generators).join(', ')}`);
          process.exit(1);
        }
      }
    } else if (options.script) {
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
      const scriptKeys = Object.keys(generators)
        .sort((a, b) => Number(a) - Number(b));
      for (const key of scriptKeys) {
        console.log(`\n[INFO] Running generator ${key}...`);
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
