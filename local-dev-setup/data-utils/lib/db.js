const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Find and load .env file from the parent directory
const envPath = path.resolve(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env file not found in /local-dev-setup. Please create it from .env.example.');
  process.exit(1);
}
dotenv.config({ path: envPath });

// Helper to ensure required environment variables are set
function requireEnv(varName) {
  if (!process.env[varName]) {
    console.error(`ERROR: Required environment variable ${varName} is missing from .env.`);
    process.exit(1);
  }
  return process.env[varName];
}

// Database configuration object
const DB_CONFIG = {
  host: requireEnv('POSTGRES_HOST'),
  port: requireEnv('POSTGRES_PORT'),
  user: requireEnv('UMIG_DB_USER'),
  password: requireEnv('UMIG_DB_PASSWORD'),
  database: requireEnv('UMIG_DB_NAME'),
};

// Create a new client instance
const client = new Client(DB_CONFIG);

// Add detailed event logging for diagnostics
client.on('connect', () => {
  console.log('[DB_LOG] Client has connected');
});

client.on('end', () => {
  console.log('[DB_LOG] Client has disconnected');
});

client.on('error', (err) => {
  console.error('[DB_LOG] Database client error:', err.stack);
});

// Export the client and connect/disconnect functions
module.exports = {
  client,
  connect: async () => {
    await client.connect();
    console.log('Connected to database.');
  },
  disconnect: async () => {
    await client.end();
    console.log('Disconnected from database.');
  }
};