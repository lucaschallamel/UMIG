#!/usr/bin/env node

const { Command } = require('commander');
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const readline = require('readline');

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
  .requiredOption('--table <table>', 'Target table: teams or team_members')
  .requiredOption('--csv <file>', 'CSV file to import')
  .requiredOption('--mapping-file <file>', 'Path to JSON mapping file (db_field:csv_header)')
  .option('--env <env>', 'Environment (must be "dev" or "test")', 'dev')
  .option('--reset', 'Truncate all data in the table before import (interactive confirmation)')
  .option('--dry-run', 'Validate input and show what would be imported, but do not modify the database')
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

function loadMappingFile(mappingFilePath) {
  try {
    const mappingJson = fs.readFileSync(mappingFilePath, 'utf-8');
    return JSON.parse(mappingJson);
  } catch (err) {
    console.error('Failed to read or parse mapping file:', err.message);
    process.exit(1);
  }
}

async function confirmReset(table) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(`\nWARNING: This will DELETE ALL DATA from the ${table} table. Are you sure you want to continue? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function resetTable(table) {
  console.log(`Truncating table: ${table}...`);
  await client.query('BEGIN');
  await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
  await client.query('COMMIT');
  console.log(`Table ${table} truncated.`);
}

function validateRow(row, mapping, table) {
  const missing = [];
  for (const dbField of Object.keys(mapping)) {
    const csvField = mapping[dbField];
    if (!row.hasOwnProperty(csvField) || row[csvField] === undefined || row[csvField] === null || String(row[csvField]).trim() === '') {
      missing.push(csvField);
    }
    // Extra validation: email format for team_members
    if (table === 'team_members' && dbField === 'email' && row[csvField]) {
      if (!/^\S+@\S+\.\S+$/.test(row[csvField])) {
        missing.push(csvField + ' (invalid email)');
      }
    }
    // Integer check for team_id
    if (table === 'team_members' && dbField === 'team_id' && row[csvField]) {
      if (!/^\d+$/.test(row[csvField])) {
        missing.push(csvField + ' (not integer)');
      }
    }
  }
  return missing;
}

async function importCsv(table, csvFile, mapping, dryRun) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', async () => {
        try {
          let validRows = 0, invalidRows = 0;
          const errors = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const missing = validateRow(row, mapping, table);
            if (missing.length > 0) {
              invalidRows++;
              errors.push({ row: i + 2, missing, data: row }); // +2 for 1-based, header
              continue;
            }
            validRows++;
            if (!dryRun) {
              const dbFields = Object.keys(mapping);
              const values = dbFields.map(f => row[mapping[f]]);
              const placeholders = dbFields.map((_, i) => `$${i + 1}`).join(', ');
              const sql = `INSERT INTO ${table} (${dbFields.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
              await client.query(sql, values);
            }
          }
          // Report
          if (dryRun) {
            console.log(`\nDRY RUN: Validation complete.`);
            console.log(`Rows in CSV: ${rows.length}`);
            console.log(`Valid rows: ${validRows}`);
            console.log(`Invalid rows: ${invalidRows}`);
            if (errors.length > 0) {
              console.log(`\nFirst 5 errors:`);
              errors.slice(0, 5).forEach(e => {
                console.log(`Row ${e.row}: Missing/Invalid fields: ${e.missing.join(', ')}`);
              });
            }
          } else {
            console.log(`Import complete. Rows processed: ${rows.length}, valid: ${validRows}, invalid/skipped: ${invalidRows}`);
            if (errors.length > 0) {
              console.log(`\nFirst 5 errors:`);
              errors.slice(0, 5).forEach(e => {
                console.log(`Row ${e.row}: Missing/Invalid fields: ${e.missing.join(', ')}`);
              });
            }
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

async function main() {
  try {
    await client.connect();
    console.log('Connected to database.');

    if (options.reset) {
      const confirmed = await confirmReset(options.table);
      if (!confirmed) {
        console.log('Reset operation cancelled. No data was deleted.');
        await client.end();
        process.exit(0);
      }
      await resetTable(options.table);
    }

    const mapping = loadMappingFile(options.mappingFile);
    await importCsv(options.table, options.csv, mapping, options.dryRun);
    if (options.dryRun) {
      console.log('\nNo data was imported (dry run mode).');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
