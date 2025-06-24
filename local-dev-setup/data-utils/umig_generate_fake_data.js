#!/usr/bin/env node

// ============================
// 1. Utility Functions & Consts
// ============================

const { Command } = require('commander');
const { faker } = require('@faker-js/faker');
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const SEQUENCE_NAMES = [
  'PRE-MIGRATION',
  'CSD MIGRATION',
  'INTERIM WEEK',
  'P&C MIGRATION',
  'POST-MIGRATION'
];
const ITERATION_TYPES = ['RUN', 'DR', 'CUTOVER'];
const ITERATION_WINDOW_DAYS = 13;
const ENVIRONMENTS = [
  { name: 'PROD' },
  { name: 'EV1' },
  { name: 'EV2' },
  { name: 'EV3' },
  { name: 'EV4' },
  { name: 'EV5' }
];

function randomDateInRange(startStr, endStr) {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  return new Date(start + Math.random() * (end - start));
}

function getSequenceWindows(iterStart, iterEnd) {
  const seqWindows = [];
  const d = new Date(iterStart);
  // PRE-MIGRATION: Thursday 00:00 → Friday 12:00
  const preMigStart = new Date(d);
  const preMigEnd = new Date(d); preMigEnd.setDate(d.getDate() + 1); preMigEnd.setHours(12,0,0,0);
  seqWindows.push({start: preMigStart, end: preMigEnd});
  // CSD MIGRATION: Friday 12:00 → Monday 06:00
  const csdMigStart = new Date(preMigEnd);
  const csdMigEnd = new Date(d); csdMigEnd.setDate(d.getDate() + ((8 - d.getDay()) % 7 + 4)); csdMigEnd.setHours(6,0,0,0); // Monday after Thursday
  seqWindows.push({start: csdMigStart, end: csdMigEnd});
  // INTERIM WEEK: Monday 06:00 → next Friday 12:00
  const interimStart = new Date(csdMigEnd);
  const interimEnd = new Date(d); interimEnd.setDate(d.getDate() + 8); interimEnd.setHours(12,0,0,0); // Friday next week
  seqWindows.push({start: interimStart, end: interimEnd});
  // P&C MIGRATION: next Friday 12:00 → next Monday 06:00
  const pcmigStart = new Date(interimEnd);
  const pcmigEnd = new Date(d); pcmigEnd.setDate(d.getDate() + 11); pcmigEnd.setHours(6,0,0,0); // Monday next week
  seqWindows.push({start: pcmigStart, end: pcmigEnd});
  // POST-MIGRATION: next Monday 06:00 → next Tuesday (iteration end)
  const postMigStart = new Date(pcmigEnd);
  const postMigEnd = new Date(iterEnd);
  seqWindows.push({start: postMigStart, end: postMigEnd});
  return seqWindows;
}

function nextThursday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (4 - day + 7) % 7; // 4 = Thursday
  if (diff === 0) return d; // already Thursday
  d.setDate(d.getDate() + diff);
  return d;
}

function makeTeamEmail(teamName, domain) {
  // Lowercase, replace spaces with _, remove non-alphanum/underscore
  return (
    teamName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '') + '@' + domain
  );
}

// ============================
// 2. DB & ENV Setup
// ============================

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

const DB_CONFIG = {
  host: requireEnv('POSTGRES_HOST') || 'localhost',
  port: requireEnv('POSTGRES_PORT') || 5432,
  user: requireEnv('UMIG_DB_USER'),
  password: requireEnv('UMIG_DB_PASSWORD'),
  database: requireEnv('UMIG_DB_NAME'),
};
const client = new Client(DB_CONFIG);

// ============================
// 3. Entity Generator Functions
// ============================

// Generate environments_iterations_eit associations
async function generateEnvironmentIterationLinks(client) {
  console.log('Linking environments to iterations...');
  // Fetch all environments
  const envRes = await client.query('SELECT id, env_name FROM environments_env');
  const envs = envRes.rows;
  const prodEnv = envs.find(e => e.env_name === 'PROD');
  const nonProdEnvs = envs.filter(e => e.env_name !== 'PROD');
  if (!prodEnv || nonProdEnvs.length < 2) throw new Error('Not enough environments for associations.');
  // Fetch all iterations with their types and ids
  const iterRes = await client.query('SELECT id, ite_type, mig_id FROM iterations_ite');
  const iterations = iterRes.rows;
  // For each migration, group its iterations
  const itersByMig = {};
  for (const iter of iterations) {
    if (!itersByMig[iter.mig_id]) itersByMig[iter.mig_id] = [];
    itersByMig[iter.mig_id].push(iter);
  }
  for (const migId in itersByMig) {
    const iters = itersByMig[migId];
    // RUN/DR: 3 non-PROD envs, roles PROD/TEST/BACKUP
    for (const iter of iters) {
      if (iter.ite_type === 'RUN' || iter.ite_type === 'DR') {
        // Pick 3 unique non-PROD envs
        const shuffled = [...nonProdEnvs].sort(() => 0.5 - Math.random());
        const roles = ['PROD', 'TEST', 'BACKUP'];
        for (let i = 0; i < 3; i++) {
          await client.query(
            'INSERT INTO environments_iterations_eit (env_id, ite_id, eit_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [shuffled[i % shuffled.length].id, iter.id, roles[i]]
          );
        }
      }
      if (iter.ite_type === 'CUTOVER') {
        // PROD env for PROD role
        await client.query(
          'INSERT INTO environments_iterations_eit (env_id, ite_id, eit_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [prodEnv.id, iter.id, 'PROD']
        );
        // Pick 2 unique non-PROD envs for TEST and BACKUP
        const shuffled = [...nonProdEnvs].sort(() => 0.5 - Math.random());
        await client.query(
          'INSERT INTO environments_iterations_eit (env_id, ite_id, eit_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [shuffled[0].id, iter.id, 'TEST']
        );
        await client.query(
          'INSERT INTO environments_iterations_eit (env_id, ite_id, eit_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [shuffled[1 % shuffled.length].id, iter.id, 'BACKUP']
        );
      }
    }
  }
  console.log('Finished linking environments to iterations.');
}


// Generate environments_applications_eap associations
async function generateEnvironmentApplicationLinks(client) {
  console.log('Linking applications to environments...');
  // Fetch all environments and applications
  const envRes = await client.query('SELECT id, env_name FROM environments_env');
  const appRes = await client.query('SELECT id FROM applications_app');
  const envs = envRes.rows;
  const apps = appRes.rows;
  if (envs.length < 2 || apps.length === 0) {
    throw new Error('Not enough environments or applications to link.');
  }
  // Identify PROD and EV1
  const prodEnv = envs.find(e => e.env_name === 'PROD');
  const ev1Env = envs.find(e => e.env_name === 'EV1');
  if (!prodEnv || !ev1Env) throw new Error('PROD or EV1 environment not found.');
  // Helper to avoid duplicate links
  const inserted = new Set();
  // 1. Link every app to PROD
  for (const app of apps) {
    const key = `${prodEnv.id}_${app.id}`;
    await client.query(
      'INSERT INTO environments_applications_eap (env_id, app_id, comments) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [prodEnv.id, app.id, faker.lorem.sentence()]
    );
    inserted.add(key);
  }
  // 2. Link every app to EV1
  for (const app of apps) {
    const key = `${ev1Env.id}_${app.id}`;
    if (!inserted.has(key)) {
      await client.query(
        'INSERT INTO environments_applications_eap (env_id, app_id, comments) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [ev1Env.id, app.id, faker.lorem.sentence()]
      );
      inserted.add(key);
    }
  }
  // 3. For other envs, associate at least 5 random apps
  for (const env of envs) {
    if (env.env_name === 'PROD' || env.env_name === 'EV1') continue;
    // Pick at least 5 unique random apps
    const shuffled = [...apps].sort(() => 0.5 - Math.random());
    const numLinks = Math.max(5, Math.floor(apps.length / 2)); // Ensure at least 5, or more if small app count
    for (let i = 0; i < numLinks; i++) {
      const app = shuffled[i % apps.length];
      const key = `${env.id}_${app.id}`;
      if (!inserted.has(key)) {
        await client.query(
          'INSERT INTO environments_applications_eap (env_id, app_id, comments) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [env.id, app.id, faker.lorem.sentence()]
        );
        inserted.add(key);
      }
    }
  }
  console.log('Finished linking applications to environments.');
}


// Generate controls_ctl entries
async function generateControls(client, numControls = 30) {
  console.log(`Generating ${numControls} controls...`);
  // Fetch all team ids and names
  const teamsRes = await client.query('SELECT id, tms_name FROM teams_tms');
  const teams = teamsRes.rows;
  if (teams.length < 1) {
    throw new Error('No teams found for control assignment.');
  }
  for (let i = 1; i <= numControls; i++) {
    const ctl_code = `C${String(i).padStart(4, '0')}`;
    const ctl_name = 'Control of ' + faker.lorem.sentence();
    // Pick random teams for producer, it_validator, biz_validator (by id)
    const ctl_producer = teams[Math.floor(Math.random() * teams.length)].id;
    const ctl_it_validator = teams[Math.floor(Math.random() * teams.length)].id;
    const ctl_biz_validator = teams[Math.floor(Math.random() * teams.length)].id;
    const ctl_it_comments = faker.lorem.sentence();
    const ctl_biz_comments = faker.lorem.sentence();
    await client.query(
      `INSERT INTO controls_ctl (ctl_code, ctl_name, ctl_producer, ctl_it_validator, ctl_biz_validator, ctl_it_comments, ctl_biz_comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (ctl_code) DO NOTHING`,
      [ctl_code, ctl_name, ctl_producer, ctl_it_validator, ctl_biz_validator, ctl_it_comments, ctl_biz_comments]
    );
  }
  console.log('Finished generating controls.');
}


async function generateMigration(client, mig) {
  const result = await client.query(
    `INSERT INTO migrations_mig (mig_code, mig_name, mig_description, mig_planned_start_date, mig_planned_end_date, mty_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (mig_code) DO NOTHING RETURNING id`,
    [mig.mig_code, mig.mig_name, mig.mig_description, mig.mig_planned_start_date, mig.mig_planned_end_date, mig.mty_type]
  );
  return { ...mig, id: result.rows[0].id };
}

async function generateIteration(client, migration, type, index, startDate, windowDays = ITERATION_WINDOW_DAYS) {
  const ite_code = `${type}${type === 'CUTOVER' ? '' : index}`;
  const ite_name = `${migration.mig_name} ${ite_code}`;
  const description = faker.lorem.sentence();
  const ite_start_date = new Date(startDate);
  const ite_end_date = new Date(ite_start_date.getTime() + (windowDays - 1) * 24 * 60 * 60 * 1000);
  const result = await client.query(
    `INSERT INTO iterations_ite (mig_id, ite_code, ite_name, ite_type, ite_start_date, ite_end_date, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (ite_code, mig_id) DO NOTHING RETURNING id`,
    [migration.id, ite_code, ite_name, type, ite_start_date, ite_end_date, description]
  );
  return { ...migration, id: result.rows[0].id, ite_start_date, ite_end_date };
}

async function generateSequences(client, migration, iteration, seqWindows) {
  let prevSeqId = 0;
  for (let sqc_order = 1; sqc_order <= SEQUENCE_NAMES.length; sqc_order++) {
    const seqResult = await client.query(
      `INSERT INTO sequences_sqc (mig_id, ite_id, sqc_name, sqc_order, start_date, end_date, sqc_previous)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (mig_id, ite_id, sqc_order) DO NOTHING RETURNING id`,
      [migration.id, iteration.id, SEQUENCE_NAMES[sqc_order - 1], sqc_order, seqWindows[sqc_order-1].start, seqWindows[sqc_order-1].end, prevSeqId === 0 ? null : prevSeqId]
    );
    prevSeqId = seqResult.rows[0].id;
  }
}

async function generateEnvironments(client, envList) {
  for (const env of envList) {
    const name = env.name;
    const description = faker.company.catchPhrase();
    await client.query(
      `INSERT INTO environments_env (env_name, env_code, env_description) VALUES ($1, $1, $2) ON CONFLICT (env_code) DO NOTHING`,
      [name, description]
    );
  }
}

async function generateTeams(client, config) {
  // Always create IT_CUTOVER first
  const domain = config.teams_email_domain;
  const specialTeamName = 'IT_CUTOVER';
  await client.query(
    `INSERT INTO teams_tms (tms_code, tms_name, tms_description, tms_email) VALUES ($1, $2, $3, $4)
     ON CONFLICT (tms_code) DO NOTHING`,
    ['T00', specialTeamName, 'Team for IT Cutover activities', makeTeamEmail(specialTeamName, domain)]
  );

  for (let i = 1; i < config.num_teams; i++) {
    const name = `TEAM_${faker.word.adjective().toUpperCase()}`;
    const code = `T${String(i).padStart(2, '0')}`;
    const description = faker.company.catchPhrase();
    const email = makeTeamEmail(name, domain);
    await client.query(
      `INSERT INTO teams_tms (tms_code, tms_name, tms_description, tms_email) VALUES ($1, $2, $3, $4)
       ON CONFLICT (tms_code) DO NOTHING`,
      [code, name, description, email]
    );
  }
}

// ============================
// 4. Main Data Generation Flow
// ============================

async function confirmReset() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('\nWARNING: This will DELETE ALL DATA from the database. Are you sure you want to continue? (yes/no): ', (answer) => {
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
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
      AND tablename NOT IN ('databasechangelog', 'databasechangeloglock', 'status_sts') -- Protect Liquibase migration tracking tables and status reference data [SFT][CA][REH]
  `);
  const tableNames = rows.map(r => '"' + r.tablename + '"');
  if (tableNames.length > 0) {
    await client.query(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`);
    console.log(`Truncated tables: ${tableNames.join(', ')}`);
  } else {
    console.log('No user tables found to truncate.');
  }
  await client.query('COMMIT');
  console.log('All tables truncated.');
}

async function generateStepTypes(client) {
  // Prepopulate step_type_stt with reference values and color codes [SF][CA][DRY]
  // stt_code, stt_name, stt_description, type_color
  console.log('Prepopulating step_type_stt...');
  const stepTypes = [
    ['TRT', 'TREATMENTS', 'Treatments steps', '#1ba1e2'],
    ['PRE', 'PREPARATION', 'Preparation steps', '#008a00'],
    ['IGO', 'IT GO', 'IT Validation steps', '#7030a0'],
    ['CHK', 'CHECK', 'Controls and check activities', '#ffff00'],
    ['BUS', 'BUS', 'Bus related steps', '#ff00ff'],
    ['SYS', 'SYSTEM', 'System related activities', '#000000'],
    ['GON', 'GO/NOGO', 'Go/No Go steps', '#ff0000'],
    ['BGO', 'BUSINESS GO', 'Business Validation steps', '#ffc000'],
    ['DUM', 'DUMPS', 'Database related activities', '#948a54'],
  ];
  for (const [stt_code, stt_name, stt_description, type_color] of stepTypes) {
    await client.query(
      `INSERT INTO step_type_stt (stt_code, stt_name, stt_description, type_color) VALUES ($1, $2, $3, $4)
       ON CONFLICT (stt_code) DO NOTHING`,
      [stt_code, stt_name, stt_description, type_color]
    );
  }
  console.log('Finished prepopulating step_type_stt.');
}

async function main() {
  try {
    await client.connect();
    console.log('Connected to database.');
    const program = new Command();
    program
      .option('--env <env>', 'Environment (must be "dev" or "test")', 'dev')
      .option('--reset', 'Truncate all data before generating new data (interactive confirmation)')
      .parse(process.argv);
    const options = program.opts();
    if (!['dev', 'test'].includes(options.env)) {
      console.error('Refusing to run: This tool is only for dev/test environments.');
      process.exit(1);
    }
    if (options.reset) {
      const confirmed = await confirmReset();
      if (!confirmed) {
        console.log('Reset operation cancelled. No data was deleted.');
        await client.end();
        process.exit(0);
      }
      await resetDatabase();
    }
    // --- Prepopulate Step Types ---
    await generateStepTypes(client);
    // --- Load config ---
    await generateRoles(client);
    const configPath = path.resolve(__dirname, 'fake_data_config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('Config file fake_data_config.json not found');
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // --- Prepopulate Environments ---
    await generateEnvironments(client, ENVIRONMENTS);
    // --- Prepopulate Teams ---
    await generateTeams(client, config);
    // --- Prepopulate Controls ---
    await generateControls(client, config.num_controls || 30);
    // --- Generate Users ---
    await generateUsers(client, config);
    // --- Prepopulate Applications ---
    await generateApplications(client, config.num_applications || 10);
    // --- Link Applications to Environments ---
    await generateEnvironmentApplicationLinks(client);
    // --- Link Applications to Teams ---
    await generateTeamApplicationLinks(client);
    // --- Generate Migrations ---
    const migrations = [];
    for (let i = 0; i < config.num_migrations; i++) {
      const base = faker.word.noun().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      const suffix = faker.string.alpha(3).toUpperCase();
      const mig_code = (base + '_' + suffix).slice(0, 10);
      const mig_name = faker.location.city() + ' Migration';
      const mig_description = faker.lorem.sentence();
      const mig_planned_start_date = randomDateInRange(config.mig_start_date_range[0], config.mig_start_date_range[1]);
      const mig_planned_end_date = new Date(mig_planned_start_date);
      mig_planned_end_date.setMonth(mig_planned_end_date.getMonth() + config.mig_duration_months);
      migrations.push({
        mig_code,
        mig_name,
        mig_description,
        mig_planned_start_date: mig_planned_start_date.toISOString().slice(0,10),
        mig_planned_end_date: mig_planned_end_date.toISOString().slice(0,10),
        mty_type: config.mig_type,
        iterations: config.iterations
      });
    }
    // Insert Migrations
    for (let i = 0; i < migrations.length; i++) {
      migrations[i] = await generateMigration(client, migrations[i]);
    }
    // --- Generate Iterations & Sequences ---
    for (const mig of migrations) {
      for (const type of ['RUN', 'DR', 'CUTOVER']) {
        const count = type === 'CUTOVER' ? config.iterations.cutover : faker.number.int({ min: config.iterations[type.toLowerCase()].min, max: config.iterations[type.toLowerCase()].max });
        let currentStart = nextThursday(mig.mig_planned_start_date);
        for (let i = 0; i < count; i++) {
          const iteration = await generateIteration(client, mig, type, i, currentStart);
          const seqWindows = getSequenceWindows(iteration.ite_start_date, iteration.ite_end_date);
          await generateSequences(client, mig, iteration, seqWindows);
          currentStart = nextThursday(new Date(iteration.ite_end_date.getTime() + 24 * 60 * 60 * 1000));
        }
      }
    }
    // --- Link Environments to Iterations ---
    await generateEnvironmentIterationLinks(client);
    console.log('Fake data generation complete.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

// Helper to generate a unique trigram (A-Z only)
function generateUniqueTrigrams(count) {
  const trigrams = new Set();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  while (trigrams.size < count) {
    let code = '';
    for (let i = 0; i < 3; i++) {
      code += alphabet[Math.floor(Math.random() * 26)];
    }
    trigrams.add(code);
  }
  return Array.from(trigrams);
}

async function generateApplications(client, numApplications) {
  const trigrams = generateUniqueTrigrams(numApplications);
  for (let i = 0; i < numApplications; i++) {
    const app_code = trigrams[i];
    const app_name = faker.word.noun().toUpperCase().slice(0, 10);
    const app_description = faker.lorem.sentence();
    await client.query(
      `INSERT INTO applications_app (app_code, app_name, app_description) VALUES ($1, $2, $3)
       ON CONFLICT (app_code) DO NOTHING`,
      [app_code, app_name, app_description]
    );
  }
}

async function generateTeamApplicationLinks(client) {
  console.log('Linking applications to teams...');
  const teamsResult = await client.query('SELECT id FROM teams_tms');
  const appsResult = await client.query('SELECT id FROM applications_app');

  const teamIds = teamsResult.rows.map(r => r.id);
  const appIds = appsResult.rows.map(r => r.id);

  if (teamIds.length === 0) {
    console.warn('Warning: No teams found. Skipping application-team linking.');
    return;
  }

  // Assign applications to teams in round-robin (deterministic)
  for (let i = 0; i < appIds.length; i++) {
    const teamId = teamIds[i % teamIds.length];
    await client.query(
      'INSERT INTO teams_applications_tap (tms_id, app_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [teamId, appIds[i]]
    );
  }
  console.log(`Finished linking ${appIds.length} applications to teams.`);
}

async function generateRoles(client) {
  console.log('Populating roles...');
  const roles = ['NORMAL', 'ADMIN', 'PILOT'];
  for (const role of roles) {
    const description = faker.lorem.sentence();
    await client.query(
      'INSERT INTO roles_rls (rle_code, rle_name, rle_description) VALUES ($1, $2, $3)',
      [role, role, description]
    );
  }
  console.log('Finished populating roles.');
}

async function generateUsers(client, config) {
  console.log('Generating users...');

  // 1. Fetch Role IDs
  const rolesResult = await client.query("SELECT id, rle_code FROM roles_rls WHERE rle_code IN ('NORMAL', 'ADMIN', 'PILOT')");
  const roleIds = rolesResult.rows.reduce((acc, row) => { acc[row.rle_code] = row.id; return acc; }, {});
  if (!roleIds.NORMAL || !roleIds.ADMIN || !roleIds.PILOT) {
    throw new Error('Required roles (NORMAL, ADMIN, PILOT) not found.');
  }

  // 2. Fetch Team IDs and separate IT_CUTOVER
  const allTeamsResult = await client.query('SELECT id, tms_name FROM teams_tms');
  const itCutoverTeam = allTeamsResult.rows.find(t => t.tms_name === 'IT_CUTOVER');
  if (!itCutoverTeam) {
    throw new Error('IT_CUTOVER team not found. Please ensure it is created first.');
  }
  const itCutoverTeamId = itCutoverTeam.id;
  const normalTeamIds = allTeamsResult.rows.filter(t => t.tms_name !== 'IT_CUTOVER').map(t => t.id);

  if (normalTeamIds.length === 0) {
    console.warn('Warning: No non-IT_CUTOVER teams found for user assignment.');
  }

  // 3. Generate all required unique trigrams at once
  const totalUsers = config.num_users + config.num_admin_users + config.num_pilot_users;
  const trigrams = generateUniqueTrigrams(totalUsers);
  let trigramIndex = 0;

  // 4. Reusable user creation helper
  const createUser = async (roleId, teamId) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${config.teams_email_domain}`.replace(/[^a-z0-9_.-@]/g, '');
    const trigram = trigrams[trigramIndex++];
    await client.query(
      `INSERT INTO users_usr (usr_first_name, usr_last_name, usr_trigram, usr_email, rle_id, tms_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (usr_trigram) DO NOTHING`,
      [firstName, lastName, trigram, email, roleId, teamId]
    );
  };

  // 5. Generate NORMAL users with specific team assignment logic
  console.log(`Generating ${config.num_users} NORMAL users...`);
  if (config.num_users < normalTeamIds.length) {
    console.warn(`Warning: num_users (${config.num_users}) is less than the number of normal teams (${normalTeamIds.length}). Not all teams will have a user.`);
  }
  const shuffledTeamIds = [...normalTeamIds].sort(() => 0.5 - Math.random());
  for (let i = 0; i < config.num_users; i++) {
    const teamId = shuffledTeamIds[i % shuffledTeamIds.length]; // Cycle through teams
    await createUser(roleIds.NORMAL, teamId);
  }

  // 6. Generate ADMIN and PILOT users, assigning them to IT_CUTOVER team
  console.log(`Generating ${config.num_admin_users} ADMIN users...`);
  for (let i = 0; i < config.num_admin_users; i++) { await createUser(roleIds.ADMIN, itCutoverTeamId); }

  console.log(`Generating ${config.num_pilot_users} PILOT users...`);
  for (let i = 0; i < config.num_pilot_users; i++) { await createUser(roleIds.PILOT, itCutoverTeamId); }

  console.log('Finished generating users.');
}

main();
