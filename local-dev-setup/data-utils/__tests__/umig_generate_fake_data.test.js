const { client, connect, disconnect } = require('../lib/db');

// Helper to count rows in a table
async function countRows(table) {
  const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
  return parseInt(res.rows[0].count, 10);
}

// Helper to get pilot comments by step
async function getPilotCommentsPerStep() {
  const res = await client.query(`
    SELECT stm_id, COUNT(*) AS num_comments
    FROM step_pilot_comments_spc
    GROUP BY stm_id
  `);
  return res.rows.map(r => ({ stm_id: parseInt(r.stm_id, 10), num_comments: parseInt(r.num_comments, 10) }));
}

describe('Pilot comments generation for steps_master_stm', () => {
  beforeAll(async () => {
    await connect();
    // Optionally, reset and re-run canonical plan generator if needed
    // await require('../generators/06_generate_canonical_plans').generateCanonicalPlans({}, { reset: true });
  });

  afterAll(async () => {
    await disconnect();
  });

  it('should generate pilot comments for about 10% of steps', async () => {
    const numSteps = await countRows('steps_master_stm');
    const commentLinks = await getPilotCommentsPerStep();
    const stepsWithComments = commentLinks.length;
    const percent = (stepsWithComments / numSteps) * 100;
    expect(numSteps).toBeGreaterThan(0);
    // Allow a margin due to randomness
    // For small N, allow at least 1 pilot comment (randomness tolerance)
    if (numSteps < 100) {
      expect(stepsWithComments).toBeGreaterThanOrEqual(1);
    } else {
      expect(percent).toBeGreaterThanOrEqual(5);
    }
    expect(percent).toBeLessThanOrEqual(20);
  });

  it('should link each pilot comment to a valid step and have plausible content, with audit fields', async () => {
    // Fetch all valid user IDs
    const usersRes = await client.query('SELECT usr_id FROM users_usr');
    const userIds = usersRes.rows.map(r => r.usr_id);
    expect(userIds.length).toBeGreaterThan(0);

    const res = await client.query('SELECT spc_id, stm_id, comment_body, created_by, created_at, updated_by, updated_at, visibility FROM step_pilot_comments_spc');
    expect(res.rows.length).toBeGreaterThan(0);
    for (const row of res.rows) {
      expect(typeof row.spc_id).toBe('number');
      expect(typeof row.stm_id).toBe('string'); // UUID
    // Optionally check UUID format
    expect(row.stm_id).toMatch(/[0-9a-fA-F-]{36}/);
      expect(typeof row.comment_body).toBe('string');
      expect(row.comment_body.length).toBeGreaterThan(5);
      // created_by must be a valid user ID
      expect(userIds.includes(row.created_by)).toBe(true);
      expect(new Date(row.created_at).toString()).not.toBe('Invalid Date');
      // updated_by/updated_at are nullable, but if present, must be valid
      if (row.updated_by !== null) {
        expect(userIds.includes(row.updated_by)).toBe(true);
        expect(new Date(row.updated_at).toString()).not.toBe('Invalid Date');
        expect(new Date(row.updated_at) >= new Date(row.created_at)).toBe(true);
      } else {
        expect(row.updated_at).toBeNull();
      }
      expect(row.visibility).toBe('pilot');
      // No author field should exist
      expect(row.author).toBeUndefined();
    }
  });
});
