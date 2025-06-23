#!/usr/bin/env node

const { Command } = require('commander');
const { faker } = require('@faker-js/faker');
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Load .env from /local-dev-setup
const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env file not found in /local-dev-setup. Please create it from .env.example.');
  process.exit(1);
}
dotenv.config({ path: envPath });

function requireEnv(varName) {
  if (!process.env[varName]) {
    console.error(`ERROR: Required environment variable ${varName} is missing from .env.`);
    process.exit(1);
  }
  return process.env[varName];
}

const program = new Command();
program
  .option('--members-per-team <number>', 'Number of members per team', '5')
  .option('--teams <number>', 'Number of teams to generate', '10')
  .option('--plans <number>', 'Number of implementation plans to generate', '2')
  .option('--env <env>', 'Environment (must be "dev" or "test")', 'dev')
  .option('--reset', 'Truncate all data before generating new data (interactive confirmation)')
  .parse(process.argv);

const options = program.opts();

if (!['dev', 'test'].includes(options.env)) {
  console.error('Refusing to run: This tool is only for dev/test environments.');
  process.exit(1);
}

// DB config from .env
const DB_CONFIG = {
  host: requireEnv('POSTGRES_HOST') || 'localhost',
  port: requireEnv('POSTGRES_PORT') || 5432,
  user: requireEnv('UMIG_DB_USER'),
  password: requireEnv('UMIG_DB_PASSWORD'),
  database: requireEnv('UMIG_DB_NAME'),
};

const client = new Client(DB_CONFIG);

async function confirmReset() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('\nWARNING: This will DELETE ALL DATA from implementation_plans, team_members, and teams tables. Are you sure you want to continue? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function resetDatabase() {
  console.log('Truncating tables: implementation_plans, team_members, teams...');
  // Disable FK checks, truncate in order, re-enable FK checks
  await client.query('BEGIN');
  await client.query('TRUNCATE TABLE implementation_plans RESTART IDENTITY CASCADE');
  await client.query('TRUNCATE TABLE team_members RESTART IDENTITY CASCADE');
  await client.query('TRUNCATE TABLE teams RESTART IDENTITY CASCADE');
  await client.query('COMMIT');
  console.log('All relevant tables truncated.');
}

async function main() {
  try {
    await client.connect();
    console.log('Connected to database.');

    if (options.reset) {
      const confirmed = await confirmReset();
      if (!confirmed) {
        console.log('Reset operation cancelled. No data was deleted.');
        await client.end();
        process.exit(0);
      }
      await resetDatabase();
    }

    // --- Generate Teams ---
    const teamIds = [];
    for (let i = 0; i < Number(options.teams); i++) {
      const teamName = faker.company.name();
      const description = faker.company.catchPhrase();
      const res = await client.query(
        'INSERT INTO teams (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id',
        [teamName, description]
      );
      let teamId;
      if (res.rows.length > 0) {
        teamId = res.rows[0].id;
      } else {
        const lookup = await client.query('SELECT id FROM teams WHERE name = $1', [teamName]);
        teamId = lookup.rows[0].id;
      }
      teamIds.push(teamId);
    }

    // --- Generate Team Members: Exactly N per team ---
    for (const teamId of teamIds) {
      for (let i = 0; i < Number(options.membersPerTeam); i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName });
        const role = faker.person.jobTitle();
        await client.query(
          'INSERT INTO team_members (first_name, last_name, email, role, team_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
          [firstName, lastName, email, role, teamId]
        );
      }
    }

    // --- Generate Implementation Plans ---
    for (let i = 0; i < Number(options.plans); i++) {
      const title = faker.commerce.productName();
      const dataMigrationCode = faker.string.alphanumeric(8);
      const content = faker.lorem.paragraphs(2);
      await client.query(
        'INSERT INTO implementation_plans (title, data_migration_code, content) VALUES ($1, $2, $3)',
        [title, dataMigrationCode, content]
      );
    }

    console.log('Fake data generation complete.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
