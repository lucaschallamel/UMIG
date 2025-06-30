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
 * Truncates the users_usr table.
 * @param {object} client - The PostgreSQL client.
 */
async function resetUsersTable(client) {
  console.log('Resetting users table...');
  try {
    // Use CASCADE to handle any dependent records in other tables
    await client.query('TRUNCATE TABLE "users_usr" RESTART IDENTITY CASCADE');
    console.log('  - Table users_usr truncated.');
  } catch (error) {
    console.error(`Error resetting users table: ${error}`);
    throw error;
  }
}

/**
 * Generates users and assigns them to roles and teams.
 * @param {object} config - The main configuration object.
 * @param {object} options - Command line options, e.g., { reset: true }.
 */
async function generateUsers(config, options = {}) {
  if (options.reset) {
    await resetUsersTable(client);
  }
  console.log('Generating users...');

  // 1. Fetch role IDs and codes
  const rolesRes = await client.query('SELECT rls_id, rls_code FROM roles_rls');
  const roles = rolesRes.rows;
  const roleMap = roles.reduce((acc, role) => {
    acc[role.rls_code] = role.rls_id;
    return acc;
  }, {});

  const requiredRoles = ['ADMIN', 'NORMAL', 'PILOT'];
  if (!requiredRoles.every(role => roleMap[role])) {
    throw new Error('Required roles (ADMIN, NORMAL, PILOT) not found in database.');
  }

  // 2. Fetch team IDs, separating IT_CUTOVER from the rest
  const teamsRes = await client.query('SELECT tms_id, tms_name FROM teams_tms');
  const itCutoverTeamId = teamsRes.rows.find(t => t.tms_name === 'IT_CUTOVER')?.tms_id;
  const normalTeamIds = teamsRes.rows.filter(t => t.tms_name !== 'IT_CUTOVER').map(t => t.tms_id);
  if (!itCutoverTeamId) {
    throw new Error('IT_CUTOVER team not found for admin/pilot user assignment.');
  }
  if (normalTeamIds.length === 0) {
    console.warn('Warning: No non-IT_CUTOVER teams found for user assignment.');
  }

  // 3. Generate all required unique trigrams at once
  const totalUsers = config.USERS.NORMAL.COUNT + config.USERS.ADMIN.COUNT + config.USERS.PILOT.COUNT;
  const trigrams = generateUniqueTrigrams(totalUsers);
  let trigramIndex = 0;

  // 4. Reusable user creation helper
  const createUser = async (roleCode, teamId) => {
    if (trigramIndex >= trigrams.length) return; // Avoid errors if counts mismatch

    const roleId = roleMap[roleCode];

    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${config.TEAMS.EMAIL_DOMAIN}`.replace(/[^a-z0-9_.-@]/g, '');
    const trigram = trigrams[trigramIndex++];

    await client.query(
      `INSERT INTO users_usr (usr_first_name, usr_last_name, usr_code, usr_email, usr_is_admin, tms_id, rls_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (usr_code) DO NOTHING`,
      [firstName, lastName, trigram, email, roleCode === 'ADMIN', teamId, roleId]
    );
  };

  // 5. Generate NORMAL users with specific team assignment logic
  console.log(`Generating ${config.USERS.NORMAL.COUNT} NORMAL users...`);
  if (config.USERS.NORMAL.COUNT > 0 && normalTeamIds.length > 0) {
    const shuffledTeamIds = [...normalTeamIds].sort(() => 0.5 - Math.random());
    for (let i = 0; i < config.USERS.NORMAL.COUNT; i++) {
      const teamId = shuffledTeamIds[i % shuffledTeamIds.length]; // Cycle through teams
      await createUser('NORMAL', teamId);
    }
  }

  // 6. Generate ADMIN and PILOT users, assigning them to IT_CUTOVER team
  console.log(`Generating ${config.USERS.ADMIN.COUNT} ADMIN users...`);
  for (let i = 0; i < config.USERS.ADMIN.COUNT; i++) { await createUser('ADMIN', itCutoverTeamId); }

  console.log(`Generating ${config.USERS.PILOT.COUNT} PILOT users...`);
  for (let i = 0; i < config.USERS.PILOT.COUNT; i++) { await createUser('PILOT', itCutoverTeamId); }

  console.log('Finished generating users.');
}

module.exports = { generateUsers };