const { Client } = require('pg');
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

describe('Data Generation Script Integration Tests', () => {
  let client;

  beforeAll(async () => {
    // NOTE: These tests expect data to be already generated with:
    // node umig_generate_fake_data.js --env dev --reset
    // DO NOT run the script here - tests should only VERIFY data, not CREATE it
    
    // Connect to the database to run checks
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

  test('Each team should have at least one member', async () => {
    const res = await client.query(`
      SELECT t.tms_name, COUNT(u.id) AS member_count
      FROM teams_tms t
      LEFT JOIN users_usr u ON t.id = u.tms_id
      GROUP BY t.id, t.tms_name
    `);
    
    const teamsWithNoMembers = res.rows.filter(team => parseInt(team.member_count, 10) === 0);
    expect(teamsWithNoMembers).toEqual([]);
  });

  test('Each user should belong to exactly one team', async () => {
    const res = await client.query('SELECT COUNT(*) FROM users_usr WHERE tms_id IS NULL');
    const count = parseInt(res.rows[0].count, 10);
    expect(count).toBe(0);
  });

  test('Each application should be assigned to exactly one team', async () => {
    const res = await client.query(`
      SELECT a.app_code, COUNT(tap.tms_id) AS team_count
      FROM applications_app a
      LEFT JOIN teams_applications_tap tap ON a.id = tap.app_id
      GROUP BY a.id, a.app_code
    `);

    const appsNotAssignedToOneTeam = res.rows.filter(app => parseInt(app.team_count, 10) !== 1);
    expect(appsNotAssignedToOneTeam).toEqual([]);
  });

  test('There should be at least 1 ADMIN user, and they must be in the IT_CUTOVER team', async () => {
    const res = await client.query(`
      SELECT t.tms_name
      FROM users_usr u
      JOIN roles_rls r ON u.rle_id = r.id
      JOIN teams_tms t ON u.tms_id = t.id
      WHERE r.rle_code = 'ADMIN'
    `);
    
    const config = require('../fake_data_config.json');
    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    expect(res.rows.length).toBe(config.num_admin_users);
    res.rows.forEach(user => {
      expect(user.tms_name).toBe('IT_CUTOVER');
    });
  });

  test('There should be at least 2 PILOT users, and they must be in the IT_CUTOVER team', async () => {
    const res = await client.query(`
      SELECT t.tms_name
      FROM users_usr u
      JOIN roles_rls r ON u.rle_id = r.id
      JOIN teams_tms t ON u.tms_id = t.id
      WHERE r.rle_code = 'PILOT'
    `);

    const config = require('../fake_data_config.json');
    expect(res.rows.length).toBeGreaterThanOrEqual(2);
    expect(res.rows.length).toBe(config.num_pilot_users);
    res.rows.forEach(user => {
      expect(user.tms_name).toBe('IT_CUTOVER');
    });
  });
});
