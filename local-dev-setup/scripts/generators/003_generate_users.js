import { faker } from "../lib/utils.js";
import { client } from "../lib/db.js";

/**
 * Truncates the users_usr table.
 * @param {object} client - The PostgreSQL client.
 */
async function eraseUsersTable(client) {
  console.log("Erasing users table...");
  try {
    await client.query('TRUNCATE TABLE "users_usr" RESTART IDENTITY CASCADE');
    console.log("  - Table users_usr truncated.");
    console.log("Finished erasing users table.");
  } catch (error) {
    console.error(`Error erasing users table: ${error}`);
    throw error;
  }
}

/**
 * Creates the ADM superadmin user with fixed credentials.
 * This user is essential for Admin GUI authentication.
 * @param {object} client - The PostgreSQL client.
 * @param {object} rolesMap - Map of role codes to role IDs.
 */
async function createAdmUser(client, rolesMap) {
  console.log("  - Creating ADM superadmin user...");

  const adminRoleId = rolesMap["ADMIN"];
  if (!adminRoleId) {
    throw new Error("ADMIN role not found - required for ADM user creation");
  }

  const query = `
    INSERT INTO users_usr (
      usr_code, usr_first_name, usr_last_name, usr_email, 
      usr_is_admin, rls_id, usr_active, created_by, created_at, updated_by, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (usr_code) 
    DO UPDATE SET 
      usr_is_admin = EXCLUDED.usr_is_admin,
      usr_active = EXCLUDED.usr_active,
      rls_id = EXCLUDED.rls_id,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;
  `;

  try {
    await client.query(query, [
      "ADM", // usr_code - fixed for authentication
      "System", // usr_first_name
      "Administrator", // usr_last_name
      "admin@system.local", // usr_email
      true, // usr_is_admin - superadmin flag
      adminRoleId, // rls_id - ADMIN role
      true, // usr_active - always active
      "generator", // created_by
      new Date(), // created_at
      "generator", // updated_by
      new Date(), // updated_at
    ]);

    console.log("    ✅ ADM superadmin user created/updated successfully");
  } catch (error) {
    console.error(`    ❌ Failed to create ADM user: ${error.message}`);
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

  console.log("Generating users...");
  const userTypes = config.USERS;

  // Fetch all roles and map them by code for easy lookup
  const rolesRes = await client.query("SELECT rls_id, rls_code FROM roles_rls");
  const rolesMap = rolesRes.rows.reduce((acc, role) => {
    acc[role.rls_code.toUpperCase()] = role.rls_id;
    return acc;
  }, {});

  // Validate that all required roles from the config exist in the database
  const requiredRoleNames = Object.keys(userTypes).sort(); // Sort for deterministic error messages
  const missingRoles = requiredRoleNames.filter(
    (roleName) => !rolesMap[roleName.toUpperCase()],
  );
  if (missingRoles.length > 0) {
    throw new Error(
      `Required roles (${requiredRoleNames.join(", ")}) not found in database.`,
    );
  }

  // First, ensure the ADM superadmin user exists
  await createAdmUser(client, rolesMap);

  for (const type in userTypes) {
    const count = userTypes[type].COUNT;
    const roleName = type.toUpperCase(); // 'NORMAL', 'ADMIN', 'PILOT'
    const roleId = rolesMap[roleName];
    const isAdmin = roleName === "ADMIN";

    // This check is now redundant due to the validation above, but kept as a safeguard.
    if (!roleId) {
      console.warn(
        `Warning: Role '${roleName}' not found in roles_rls table. Skipping user generation for this type.`,
      );
      continue;
    }

    console.log(`  - Generating ${count} ${roleName} users...`);
    for (let i = 0; i < count; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      // Generate a unique email. If it conflicts, the INSERT will just do nothing.
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${faker.string.alphanumeric(4)}@${faker.internet.domainName()}`;

      const query = `
        INSERT INTO users_usr (usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, rls_id, usr_active, created_by, created_at, updated_by, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (usr_email) DO NOTHING;
      `;

      let inserted = false;
      let attempts = 0;
      while (!inserted && attempts < 10) {
        // Generate a unique 3-character code, regenerating on conflict
        const userCode = (
          firstName.substring(0, 1) +
          lastName.substring(0, 1) +
          faker.string.alphanumeric(1)
        ).toUpperCase();
        // Set usr_active to TRUE for all generated users (default active status)
        const isActive = true;
        try {
          await client.query(query, [
            userCode,
            firstName,
            lastName,
            email,
            isAdmin,
            roleId,
            isActive,
            "generator",
            new Date(),
            "generator",
            new Date(),
          ]);
          inserted = true;
        } catch (e) {
          if (
            e.code === "23505" &&
            e.constraint &&
            e.constraint.includes("usr_code")
          ) {
            // unique_violation on usr_code
            attempts++;
          } else {
            throw e; // re-throw other errors
          }
        }
      }
      if (!inserted) {
        console.warn(
          `    - Could not insert user ${email} after ${attempts} attempts due to usr_code conflicts. Skipping.`,
        );
      }
    }
  }

  console.log("Finished generating users.");

  await linkUsersToTeams(client, config);
}

/**
 * Links users to teams based on their roles.
 * - ADMIN and PILOT users are linked to the IT_CUTOVER team.
 * - NORMAL users are distributed among the other teams.
 * @param {object} client - The PostgreSQL client.
 * @param {object} config - The main configuration object.
 */
async function linkUsersToTeams(client, config) {
  console.log("Linking users to teams...");

  // Fetch all users with their roles
  const usersRes = await client.query(`
    SELECT u.usr_id, r.rls_code
    FROM users_usr u
    JOIN roles_rls r ON u.rls_id = r.rls_id
  `);
  const allUsers = usersRes.rows;

  // Fetch all teams
  const teamsRes = await client.query("SELECT tms_id, tms_name FROM teams_tms");
  const allTeams = teamsRes.rows;

  if (allUsers.length === 0 || allTeams.length === 0) {
    console.log("  - No users or teams to link. Skipping.");
    return;
  }

  const itCutoverTeam = allTeams.find((t) => t.tms_name === "IT_CUTOVER");
  const normalTeams = allTeams.filter((t) => t.tms_name !== "IT_CUTOVER");

  const adminPilotUsers = allUsers.filter((u) =>
    ["ADMIN", "PILOT"].includes(u.rls_code.toUpperCase()),
  );
  const normalUsers = allUsers.filter(
    (u) => u.rls_code.toUpperCase() === "NORMAL",
  );

  // Validate IT_CUTOVER team presence if there are admins or pilots
  if (adminPilotUsers.length > 0 && !itCutoverTeam) {
    throw new Error(
      "IT_CUTOVER team not found for admin/pilot user assignment.",
    );
  }

  // Link ADMIN and PILOT users to IT_CUTOVER team
  if (itCutoverTeam) {
    for (const user of adminPilotUsers) {
      await client.query(
        `INSERT INTO teams_tms_x_users_usr (usr_id, tms_id, created_at, created_by)
         VALUES ($1, $2, $3, $4) ON CONFLICT (tms_id, usr_id) DO NOTHING`,
        [user.usr_id, itCutoverTeam.tms_id, new Date(), "generator"],
      );
    }
  }

  // Distribute NORMAL users among other teams
  if (normalUsers.length > 0) {
    if (normalTeams.length === 0) {
      console.warn(
        "Warning: No non-IT_CUTOVER teams found for user assignment.",
      );
      return;
    }
    // Simple distribution: assign each normal user to a team, cycling through the teams
    for (let i = 0; i < normalUsers.length; i++) {
      const user = normalUsers[i];
      const team = normalTeams[i % normalTeams.length]; // Cycle through teams
      await client.query(
        `INSERT INTO teams_tms_x_users_usr (usr_id, tms_id, created_at, created_by)
         VALUES ($1, $2, $3, $4) ON CONFLICT (tms_id, usr_id) DO NOTHING`,
        [user.usr_id, team.tms_id, new Date(), "generator"],
      );
    }
  }

  console.log("Finished linking users to teams.");
}

export { generateUsers, eraseUsersTable };
