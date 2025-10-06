import { faker } from "@faker-js/faker";
import { client } from "../lib/db.js";

/**
 * Environment Generator - Smart Preservation Pattern
 *
 * CRITICAL DEPENDENCIES:
 * - Migration 022 creates: DEV environment (env_id=1, env_code='DEV')
 * - Migration 035 creates: PROD (env_id=2), UAT (env_id=3) + 21 system configurations
 *
 * PRESERVATION STRATEGY:
 * - NEVER truncate environments_env table (would break foreign key constraints)
 * - DELETE only generator-created environments (env_id NOT IN (1,2,3)) for clean regeneration
 * - SKIP creation of DEV/PROD/UAT environments (use existing from migrations)
 * - PRESERVE all migration-created data while enabling generator flexibility
 *
 * This pattern prevents foreign key violations while allowing repeatable generation.
 */

/**
 * Selectively erases generator-created environments while preserving migration-created ones.
 * Preserves DEV (env_id=1) from migration 022, PROD/UAT (env_id=2,3) from migration 035.
 * @param {object} client - The PostgreSQL client.
 */
async function eraseEnvironmentsTable(client) {
  console.log("Erasing generator-created environments and associations...");

  try {
    // First, remove join table associations for generator-created environments only
    // Preserve migration-created environments: DEV (1), PROD (2), UAT (3)
    await client.query(`
      DELETE FROM environments_env_x_applications_app 
      WHERE env_id NOT IN (1, 2, 3)
    `);
    console.log(
      "  - Removed application associations for generator-created environments",
    );

    await client.query(`
      DELETE FROM environments_env_x_iterations_ite 
      WHERE env_id NOT IN (1, 2, 3)
    `);
    console.log(
      "  - Removed iteration associations for generator-created environments",
    );

    // Delete generator-created environments (preserve DEV, PROD, UAT from migrations)
    const deleteResult = await client.query(`
      DELETE FROM environments_env 
      WHERE env_id NOT IN (1, 2, 3)
    `);
    console.log(
      `  - Deleted ${deleteResult.rowCount} generator-created environments (preserved DEV/PROD/UAT from migrations)`,
    );

    console.log(
      "Finished erasing generator-created environments (DEV/PROD/UAT environments preserved).",
    );
  } catch (error) {
    console.error(`Error erasing environments table: ${error}`);
    throw error;
  }
}

/**
 * Generates all environments from the config file and links them to apps and iterations.
 * DEPENDENCIES:
 * - Migration 022 creates DEV environment (env_id=1)
 * - Migration 035 creates PROD/UAT environments (env_id=2,3)
 * Now follows specific rules for iteration types.
 * @param {Array<object>} environments - Array of environment objects to create.
 * @param {object} options - Generation options, e.g., { reset: boolean }.
 */
async function generateAllEnvironments(environments, options = {}) {
  if (options.erase) {
    await eraseEnvironmentsTable(client);
  }

  console.log("Generating environments...");

  // Verify migration-created environments exist (DEV from 022, PROD/UAT from 035)
  const migrationEnvCheck = await client.query(
    "SELECT env_id, env_code FROM environments_env WHERE env_id IN (1, 2, 3) ORDER BY env_id",
  );
  if (migrationEnvCheck.rows.length < 3) {
    throw new Error(
      "Migration-created environments not found. Expected DEV (env_id=1), PROD (env_id=2), UAT (env_id=3). Please ensure migrations 022 and 035 have been executed.",
    );
  }
  console.log(
    `  ✓ Verified ${migrationEnvCheck.rows.length} migration-created environments exist:`,
    migrationEnvCheck.rows
      .map((r) => `${r.env_code} (env_id=${r.env_id})`)
      .join(", "),
  );

  // Create environments and store mapping by name
  // Skip migration-created environments: DEV (022), PROD/UAT (035)
  const envByName = {};
  const MIGRATION_ENV_NAMES = ["DEV", "PROD", "UAT"];
  const MIGRATION_ENV_IDS = { DEV: 1, PROD: 2, UAT: 3 };

  for (const env of environments) {
    // Skip migration-created environments
    if (MIGRATION_ENV_NAMES.includes(env.name)) {
      console.log(
        `  - Skipping ${env.name} environment (preserved from migration)`,
      );
      envByName[env.name] = MIGRATION_ENV_IDS[env.name];
      continue;
    }

    const query = `
      INSERT INTO environments_env (env_id, env_code, env_name, env_description, created_by, created_at, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (env_id) DO NOTHING
      RETURNING env_id, env_name;
    `;
    const res = await client.query(query, [
      env.env_id,
      env.name,
      env.name,
      env.description || `Generated ${env.name} environment`,
      "generator",
      new Date(),
      "generator",
      new Date(),
    ]);
    if (res.rows.length > 0) {
      envByName[res.rows[0].env_name] = res.rows[0].env_id;
    } else {
      // Environment already exists, fetch its ID
      const existingRes = await client.query(
        "SELECT env_id, env_name FROM environments_env WHERE env_id = $1",
        [env.env_id],
      );
      if (existingRes.rows.length > 0) {
        envByName[existingRes.rows[0].env_name] = existingRes.rows[0].env_id;
      }
    }
  }

  // If environments already existed, fetch them
  if (Object.keys(envByName).length === 0) {
    const allEnvsRes = await client.query(
      "SELECT env_id, env_name FROM environments_env",
    );
    allEnvsRes.rows.forEach((row) => {
      envByName[row.env_name] = row.env_id;
    });
  }

  // Final safety check: Ensure all migration-created environments are available for linking
  for (const envName of MIGRATION_ENV_NAMES) {
    if (!envByName[envName]) {
      const envCheck = await client.query(
        "SELECT env_id FROM environments_env WHERE env_id = $1",
        [MIGRATION_ENV_IDS[envName]],
      );
      if (envCheck.rows.length > 0) {
        envByName[envName] = MIGRATION_ENV_IDS[envName];
        console.log(
          `  ✓ Added ${envName} environment to mapping (env_id=${MIGRATION_ENV_IDS[envName]})`,
        );
      } else {
        throw new Error(
          `CRITICAL: ${envName} environment (env_id=${MIGRATION_ENV_IDS[envName]}) missing - migrations may not have run`,
        );
      }
    }
  }

  console.log("Finished generating environments.");
  console.log(
    `  ✓ Environment mapping: ${Object.keys(envByName).length} environments available for linking`,
  );

  if (Object.keys(envByName).length === 0) {
    console.log("No environments found or created, skipping linking.");
    return;
  }

  // Get environment roles
  const roleRows = await client.query(
    "SELECT enr_id, enr_name FROM environment_roles_enr",
  );
  const roleByName = {};
  roleRows.rows.forEach((row) => {
    roleByName[row.enr_name] = row.enr_id;
  });

  // Link to applications (unchanged)
  console.log("Linking environments to applications...");
  const applications = await client.query(
    "SELECT app_id FROM applications_app",
  );
  if (applications.rows.length > 0) {
    for (const envName in envByName) {
      const envId = envByName[envName];
      const appsToLink = faker.helpers.arrayElements(
        applications.rows,
        faker.number.int({ min: 1, max: 3 }),
      );
      for (const app of appsToLink) {
        await client.query(
          "INSERT INTO environments_env_x_applications_app (env_id, app_id) VALUES ($1, $2) ON CONFLICT (env_id, app_id) DO NOTHING",
          [envId, app.app_id],
        );
      }
    }
  }

  // Link to iterations with specific rules
  console.log("Linking environments to iterations with type-specific rules...");
  const iterations = await client.query(
    "SELECT ite_id, itt_code, ite_name FROM iterations_ite",
  );

  if (iterations.rows.length === 0) {
    console.log("No iterations to link. Skipping.");
    return;
  }

  // Get non-PROD environments for RUN and DR iterations
  const nonProdEnvNames = Object.keys(envByName).filter(
    (name) => name !== "PROD",
  );

  for (const iter of iterations.rows) {
    console.log(`  Processing ${iter.itt_code} iteration: ${iter.ite_name}`);

    if (iter.itt_code === "CUTOVER") {
      // CUTOVER: PROD environment in PROD role, others for TEST/BACKUP
      // Assign PROD environment to PROD role
      await client.query(
        "INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING",
        [envByName["PROD"], iter.ite_id, roleByName["PROD"]],
      );

      // Assign random non-PROD environments to TEST and BACKUP roles
      const testEnv = faker.helpers.arrayElement(nonProdEnvNames);
      const backupEnv = faker.helpers.arrayElement(nonProdEnvNames);

      await client.query(
        "INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING",
        [envByName[testEnv], iter.ite_id, roleByName["TEST"]],
      );

      await client.query(
        "INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING",
        [envByName[backupEnv], iter.ite_id, roleByName["BACKUP"]],
      );
    } else {
      // RUN and DR: Never use PROD environment, use others for all roles
      // Randomly assign non-PROD environments to each role
      const prodRoleEnv = faker.helpers.arrayElement(nonProdEnvNames);
      const testEnv = faker.helpers.arrayElement(nonProdEnvNames);
      const backupEnv = faker.helpers.arrayElement(nonProdEnvNames);

      await client.query(
        "INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING",
        [envByName[prodRoleEnv], iter.ite_id, roleByName["PROD"]],
      );

      await client.query(
        "INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING",
        [envByName[testEnv], iter.ite_id, roleByName["TEST"]],
      );

      await client.query(
        "INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING",
        [envByName[backupEnv], iter.ite_id, roleByName["BACKUP"]],
      );
    }
  }

  // Log summary
  const summary = await client.query(`
    SELECT 
      ite.itt_code,
      COUNT(DISTINCT ite.ite_id) as iteration_count,
      COUNT(DISTINCT eei.ite_id) as iterations_with_envs
    FROM iterations_ite ite
    LEFT JOIN environments_env_x_iterations_ite eei ON ite.ite_id = eei.ite_id
    GROUP BY ite.itt_code
  `);

  console.log("\nEnvironment assignment summary:");
  summary.rows.forEach((row) => {
    console.log(
      `  ${row.itt_code}: ${row.iterations_with_envs}/${row.iteration_count} iterations have environments`,
    );
  });

  console.log("Finished linking environments.");
}

export { generateAllEnvironments, eraseEnvironmentsTable };
