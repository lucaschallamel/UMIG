const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

describe('Canonical and Instance Data Generation Integration Tests', () => {
  let client;

  beforeAll(async () => {
    // These tests assume data has been generated via `umig_generate_fake_data.js --reset`
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

  test('Each canonical plan should have at least one migration iteration instance', async () => {
    const res = await client.query(`
      SELECT ipc.ipc_id, COUNT(mic.mic_id) AS instance_count
      FROM implementation_plans_canonical_ipc ipc
      LEFT JOIN migration_iterations_mic mic ON ipc.ipc_id = mic.ipc_id
      GROUP BY ipc.ipc_id
    `);
    
    const plansWithNoInstances = res.rows.filter(plan => parseInt(plan.instance_count, 10) === 0);
    expect(plansWithNoInstances).toEqual([]);
  });

  test('Instance hierarchy should match the canonical plan', async () => {
    const canonicalPlanRes = await client.query('SELECT ipc_id FROM implementation_plans_canonical_ipc LIMIT 1');
    const ipcId = canonicalPlanRes.rows[0].ipc_id;

    const iterationRes = await client.query('SELECT mic_id FROM migration_iterations_mic WHERE ipc_id = $1 LIMIT 1', [ipcId]);
    const micId = iterationRes.rows[0].mic_id;

    const masterSeqCount = await client.query('SELECT COUNT(*) FROM sequences_master_sqm WHERE ipc_id = $1', [ipcId]);
    const instanceSeqCount = await client.query('SELECT COUNT(*) FROM sequences_instance_sqi WHERE mic_id = $1', [micId]);
    expect(instanceSeqCount.rows[0].count).toEqual(masterSeqCount.rows[0].count);

    const masterStepCount = await client.query(`
        SELECT COUNT(*)
        FROM steps_master_stm stm
        JOIN chapters_master_chm chm ON stm.chm_id = chm.chm_id
        JOIN sequences_master_sqm sqm ON chm.sqm_id = sqm.sqm_id
        WHERE sqm.ipc_id = $1
    `, [ipcId]);

    const instanceStepCount = await client.query(`
        SELECT COUNT(*)
        FROM steps_instance_sti sti
        JOIN chapters_instance_chi chi ON sti.chi_id = chi.chi_id
        JOIN sequences_instance_sqi sqi ON chi.sqi_id = sqi.sqi_id
        WHERE sqi.mic_id = $1
    `, [micId]);

    expect(instanceStepCount.rows[0].count).toEqual(masterStepCount.rows[0].count);
  });

  test('Every step instance should be assigned to a user', async () => {
    const res = await client.query('SELECT COUNT(*) FROM steps_instance_sti WHERE assignee_usr_id IS NULL');
    const count = parseInt(res.rows[0].count, 10);
    expect(count).toBe(0);
  });

  test('Audit log should contain entries for each migration iteration', async () => {
    const res = await client.query(`
      SELECT mic.mic_id, COUNT(aud.aud_id) AS log_count
      FROM migration_iterations_mic mic
      LEFT JOIN audit_log_aud aud ON mic.mic_id = aud.entity_id AND aud.entity_type = 'migration_iteration'
      GROUP BY mic.mic_id
    `);

    const iterationsWithNoLogs = res.rows.filter(iter => parseInt(iter.log_count, 10) === 0);
    expect(iterationsWithNoLogs).toEqual([]);
  });
});