// Integration tests for environments_applications_eap association rules
// Requirements:
// 1. All applications must be associated with at least the PROD environment.
// 2. All applications must be associated with at least the EV1 environment.
// 3. Each non-special environment (EV2, EV3, ...) must have at least 5 associated applications.
// 4. The comments field must be filled with random text (not null/empty).

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

describe('environments_applications_eap association rules', () => {
  let client;

  beforeAll(async () => {
    // NOTE: These tests expect data to be already generated with:
    // node umig_generate_fake_data.js --env dev --reset
    // DO NOT run the script here - tests should only VERIFY data, not CREATE it
    client = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      user: process.env.UMIG_DB_USER,
      password: process.env.UMIG_DB_PASSWORD,
      database: process.env.UMIG_DB_NAME,
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  test('All applications are associated with PROD and EV1 environments', async () => {
    // Get all environment IDs and names
    const envRes = await client.query('SELECT id, env_name FROM environments_env');
    const prodEnv = envRes.rows.find(e => e.env_name === 'PROD');
    const ev1Env = envRes.rows.find(e => e.env_name === 'EV1');
    expect(prodEnv).toBeDefined();
    expect(ev1Env).toBeDefined();

    // Get all applications
    const appRes = await client.query('SELECT id FROM applications_app');
    const appIds = appRes.rows.map(a => a.id);

    // For each application, check association with PROD and EV1
    for (const appId of appIds) {
      const eapRes = await client.query('SELECT env_id FROM environments_applications_eap WHERE app_id = $1', [appId]);
      const envIds = eapRes.rows.map(r => r.env_id);
      expect(envIds).toContain(prodEnv.id);
      expect(envIds).toContain(ev1Env.id);
    }
  });

  test('Each non-special environment (EV2, EV3, ...) has at least 5 associated applications', async () => {
    const envRes = await client.query("SELECT id, env_name FROM environments_env WHERE env_name NOT IN ('PROD', 'EV1')");
    for (const env of envRes.rows) {
      const eapRes = await client.query('SELECT app_id FROM environments_applications_eap WHERE env_id = $1', [env.id]);
      expect(eapRes.rows.length).toBeGreaterThanOrEqual(5);
    }
  });

  test('Comments field is filled with random text for all associations', async () => {
    const eapRes = await client.query('SELECT comments FROM environments_applications_eap');
    for (const row of eapRes.rows) {
      expect(row.comments).toBeDefined();
      expect(typeof row.comments).toBe('string');
      expect(row.comments.trim().length).toBeGreaterThan(0);
    }
  });
});
