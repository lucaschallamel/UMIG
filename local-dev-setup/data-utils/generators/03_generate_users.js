const { client } = require('../lib/db');
const { faker } = require('../lib/utils');

/**
 * Generates a specified number of unique trigrams.
 * @param {number} count - The number of unique trigrams to generate.
 * @returns {Set<string>} A set of unique trigrams.
 */
function generateUniqueTrigrams(count) {
  const trigrams = new Set();
  while (trigrams.size < count) {
    trigrams.add(faker.string.alpha({ length: 3, casing: 'upper' }));
  }
  return Array.from(trigrams);
}

/**
 * Generates users and assigns them to roles and teams.
 * @param {object} config - The main configuration object.
 */
async function generateUsers(config) {
  console.log('Generating users...');

  // 1. Fetch role IDs
  const rolesRes = await client.query('SELECT id, rle_code FROM roles_rls');
  const roleIds = rolesRes.rows.reduce((acc, row) => {
    acc[row.rle_code] = row.id;
    return acc;
  }, {});
  if (!roleIds.ADMIN || !roleIds.NORMAL || !roleIds.PILOT) {
    throw new Error('Required roles (ADMIN, NORMAL, PILOT) not found.');
  }

  // 2. Fetch team IDs, separating IT_CUTOVER from the rest
  const teamsRes = await client.query('SELECT id, tms_name FROM teams_tms');
  const itCutoverTeamId = teamsRes.rows.find(t => t.tms_name === 'IT_CUTOVER')?.id;
  const normalTeamIds = teamsRes.rows.filter(t => t.tms_name !== 'IT_CUTOVER').map(t => t.id);
  if (!itCutoverTeamId) {
    throw new Error('IT_CUTOVER team not found for admin/pilot user assignment.');
  }
  if (normalTeamIds.length === 0) {
    console.warn('Warning: No non-IT_CUTOVER teams found for user assignment.');
  }

  // 3. Generate all required unique trigrams at once
  const totalUsers = config.num_users + config.num_admin_users + config.num_pilot_users;
  const trigrams = generateUniqueTrigrams(totalUsers);
  let trigramIndex = 0;

  // 4. Reusable user creation helper
  const createUser = async (roleId, teamId) => {
    if (trigramIndex >= trigrams.length) return; // Avoid errors if counts mismatch
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
  if (config.num_users > 0 && normalTeamIds.length > 0) {
    const shuffledTeamIds = [...normalTeamIds].sort(() => 0.5 - Math.random());
    for (let i = 0; i < config.num_users; i++) {
      const teamId = shuffledTeamIds[i % shuffledTeamIds.length]; // Cycle through teams
      await createUser(roleIds.NORMAL, teamId);
    }
  }

  // 6. Generate ADMIN and PILOT users, assigning them to IT_CUTOVER team
  console.log(`Generating ${config.num_admin_users} ADMIN users...`);
  for (let i = 0; i < config.num_admin_users; i++) { await createUser(roleIds.ADMIN, itCutoverTeamId); }

  console.log(`Generating ${config.num_pilot_users} PILOT users...`);
  for (let i = 0; i < config.num_pilot_users; i++) { await createUser(roleIds.PILOT, itCutoverTeamId); }

  console.log('Finished generating users.');
}

module.exports = { generateUsers };