import { faker } from '@faker-js/faker';
import { client } from '../lib/db.js';

/**
 * Truncates the users_usr table.
 * @param {object} client - The PostgreSQL client.
 */
async function eraseUsersTable(client) {
  console.log('Erasing users table...');
  try {
    await client.query('TRUNCATE TABLE "users_usr" RESTART IDENTITY CASCADE');
    console.log('  - Table users_usr truncated.');
    console.log('Finished erasing users table.');
  } catch (error) {
    console.error(`Error erasing users table: ${error}`);
    throw error;
  }
}

/**
 * Main function to generate different types of users.
 * @param {object} config - The main configuration object.
 * @param {object} options - Generation options, e.g., { reset: boolean }.
 */
async function generateUsers(config, options = {}) {
  if (options.erase) {
    await eraseUsersTable(client);
  }

  console.log('Generating users...');
  const userTypes = config.USERS;

  // Fetch all roles and map them by code for easy lookup
  const rolesRes = await client.query('SELECT rls_id, rls_code FROM roles_rls');
  const rolesMap = rolesRes.rows.reduce((acc, role) => {
    acc[role.rls_code.toUpperCase()] = role.rls_id;
    return acc;
  }, {});

  for (const type in userTypes) {
    const count = userTypes[type].COUNT;
    const roleName = type.toUpperCase(); // 'NORMAL', 'ADMIN', 'PILOT'
    const roleId = rolesMap[roleName];
    const isAdmin = (roleName === 'ADMIN');

    if (!roleId) {
        console.warn(`Warning: Role '${roleName}' not found in roles_rls table. Skipping user generation for this type.`);
        continue;
    }

    console.log(`  - Generating ${count} ${roleName} users...`);
    for (let i = 0; i < count; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      // Generate a unique email. If it conflicts, the INSERT will just do nothing.
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${faker.string.alphanumeric(4)}@${faker.internet.domainName()}`;

      const query = `
        INSERT INTO users_usr (usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, rls_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (usr_email) DO NOTHING;
      `;

      let inserted = false;
      let attempts = 0;
      while (!inserted && attempts < 10) {
        // Generate a unique 3-character code, regenerating on conflict
        const userCode = (firstName.substring(0, 1) + lastName.substring(0, 1) + faker.string.alphanumeric(1)).toUpperCase();
        try {
            await client.query(query, [userCode, firstName, lastName, email, isAdmin, roleId]);
            inserted = true;
        } catch (e) {
            if (e.code === '23505' && e.constraint && e.constraint.includes('usr_code')) { // unique_violation on usr_code
                attempts++;
            } else {
                throw e; // re-throw other errors
            }
        }
      }
      if (!inserted) {
          console.warn(`    - Could not insert user ${email} after ${attempts} attempts due to usr_code conflicts. Skipping.`);
      }
    }
  }

  console.log('Finished generating users.');

  await linkUsersToTeams(client);
}

/**
 * Links users to a random number of teams.
 * @param {object} client - The PostgreSQL client.
 */
async function linkUsersToTeams(client) {
  console.log('Linking users to teams...');

  const usersRes = await client.query('SELECT usr_id FROM users_usr');
  const teamsRes = await client.query('SELECT tms_id FROM teams_tms');

  if (usersRes.rows.length === 0 || teamsRes.rows.length === 0) {
    console.log('  - No users or teams to link. Skipping.');
    return;
  }

  const allUsers = usersRes.rows;
  const allTeams = teamsRes.rows;

  for (const user of allUsers) {
    // Assign each user to 1 to 3 teams
    const teamsToLink = faker.helpers.arrayElements(
      allTeams,
      faker.number.int({ min: 1, max: 3 })
    );
    for (const team of teamsToLink) {
      await client.query(
        `INSERT INTO teams_tms_x_users_usr (usr_id, tms_id, created_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (tms_id, usr_id) DO NOTHING`,
        [user.usr_id, team.tms_id, user.usr_id] // Using user's own ID as creator
      );
    }
  }

  console.log('Finished linking users to teams.');
}

export { generateUsers, eraseUsersTable };
