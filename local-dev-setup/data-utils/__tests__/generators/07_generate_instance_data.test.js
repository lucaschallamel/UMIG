const { client, connect, disconnect } = require('../../lib/db');

// Helper to count rows in a table
async function countRows(table) {
  const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
  return parseInt(res.rows[0].count, 10);
}

describe('Step instance comments generation', () => {
  beforeAll(async () => {
    await connect();
    // The main test suite should have already run the generator.
    // If running this test in isolation, you might need to run the generator first.
  });

  afterAll(async () => {
    await disconnect();
  });

  it('should generate exactly one comment for every step instance', async () => {
    const numStepInstances = await countRows('steps_instance_sti');
    const numStepInstanceComments = await countRows('step_instance_comments_sic');

    expect(numStepInstances).toBeGreaterThan(0);
    expect(numStepInstanceComments).toBe(numStepInstances);
  });

  it('should link each comment to a valid step instance and have plausible content, with audit fields', async () => {
    // Fetch all valid user and step instance IDs
    const usersRes = await client.query('SELECT usr_id FROM users_usr');
    const userIds = usersRes.rows.map(r => r.usr_id);
    expect(userIds.length).toBeGreaterThan(0);

    const stepInstancesRes = await client.query('SELECT sti_id FROM steps_instance_sti');
    const stepInstanceIds = stepInstancesRes.rows.map(r => r.sti_id);
    expect(stepInstanceIds.length).toBeGreaterThan(0);

    const res = await client.query('SELECT sic_id, sti_id, comment_body, created_by, created_at, updated_by, updated_at FROM step_instance_comments_sic');
    expect(res.rows.length).toBeGreaterThan(0);

    for (const row of res.rows) {
      expect(typeof row.sic_id).toBe('number');
      expect(typeof row.sti_id).toBe('string'); // UUID
      expect(stepInstanceIds.includes(row.sti_id)).toBe(true);

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
    }
  });
});
