const { Client } = require('pg');
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Integration tests for environments_iterations_eit associations
 *
 * Rules:
 * - For each RUN or DR iteration: 3 associated environments (excluding PROD), roles: PROD, TEST, BACKUP
 * - For each CUTOVER iteration: PROD env for PROD role, 2 other envs for TEST and BACKUP
 */
describe('environments_iterations_eit association rules', () => {
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

  test('RUN/DR iterations: 3 non-PROD envs, correct roles', async () => {
    // Get all envs
    const envRes = await client.query('SELECT id, env_name FROM environments_env');
    const envs = envRes.rows;
    const prodEnv = envs.find(e => e.env_name === 'PROD');
    const nonProdEnvIds = envs.filter(e => e.env_name !== 'PROD').map(e => e.id);

    // Get all RUN/DR iterations
    const iterRes = await client.query(`SELECT id, ite_type FROM iterations_ite WHERE ite_type IN ('RUN','DR')`);
    for (const iter of iterRes.rows) {
      const eitRes = await client.query(`SELECT env_id, eit_role FROM environments_iterations_eit WHERE ite_id = $1`, [iter.id]);
      expect(eitRes.rows.length).toBe(3);
      // All envs must not be PROD
      eitRes.rows.forEach(link => {
        expect(nonProdEnvIds).toContain(link.env_id);
      });
      // Roles: PROD, TEST, BACKUP (all present, no duplicates)
      const roles = eitRes.rows.map(r => r.eit_role).sort();
      expect(roles).toEqual(['BACKUP','PROD','TEST']);
    }
  });

  test('CUTOVER iteration: PROD env for PROD role, two other envs for TEST and BACKUP', async () => {
    // Get all envs
    const envRes = await client.query('SELECT id, env_name FROM environments_env');
    const envs = envRes.rows;
    const prodEnv = envs.find(e => e.env_name === 'PROD');
    const nonProdEnvIds = envs.filter(e => e.env_name !== 'PROD').map(e => e.id);

    // Get all CUTOVER iterations
    const iterRes = await client.query(`SELECT id FROM iterations_ite WHERE ite_type = 'CUTOVER'`);
    for (const iter of iterRes.rows) {
      const eitRes = await client.query(`SELECT env_id, eit_role FROM environments_iterations_eit WHERE ite_id = $1`, [iter.id]);
      expect(eitRes.rows.length).toBe(3);
      // Must have exactly one PROD, one TEST, one BACKUP
      const roles = eitRes.rows.map(r => r.eit_role).sort();
      expect(roles).toEqual(['BACKUP','PROD','TEST']);
      // Check the PROD role is linked to the PROD env
      const prodLink = eitRes.rows.find(r => r.eit_role === 'PROD');
      expect(prodLink.env_id).toBe(prodEnv.id);
      // TEST and BACKUP must not be PROD env
      eitRes.rows.filter(r => r.eit_role !== 'PROD').forEach(link => {
        expect(nonProdEnvIds).toContain(link.env_id);
      });
    }
  });
});
