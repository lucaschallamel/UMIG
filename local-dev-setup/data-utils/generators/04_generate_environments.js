const { client } = require('../lib/db');
const { faker, ENVIRONMENTS } = require('../lib/utils');

/**
 * Generates the base environments from the constants file.
 * @param {object} client - The PostgreSQL client.
 */
async function generateEnvironments(client) {
  console.log('Generating environments...');
  for (const env of ENVIRONMENTS) {
    const description = faker.company.catchPhrase();
    await client.query(
      `INSERT INTO environments_env (env_name, env_code, env_description) VALUES ($1, $1, $2) ON CONFLICT (env_code) DO NOTHING`,
      [env.name, description]
    );
  }
  console.log('Finished generating environments.');
}

/**
 * Links environments to iterations based on iteration type (RUN, DR, CUTOVER).
 * @param {object} client - The PostgreSQL client.
 */
async function generateEnvironmentIterationLinks(client) {
  console.log('Linking environments to iterations...');
  const envRes = await client.query('SELECT env_id, env_name FROM environments_env');
  const envs = envRes.rows;

  const envRolesRes = await client.query('SELECT enr_id, enr_name FROM environment_roles_enr');
  const envRoles = envRolesRes.rows;
  const prodRoleId = envRoles.find(r => r.enr_name === 'PROD')?.enr_id;
  const backupRoleId = envRoles.find(r => r.enr_name === 'BACKUP')?.enr_id;
  const testRoleId = envRoles.find(r => r.enr_name === 'TEST')?.enr_id;

  if (envs.length < 3 || !prodRoleId || !backupRoleId || !testRoleId) {
    console.warn('Warning: At least 3 environments and all required roles (PROD, BACKUP, TEST) must exist.');
    return;
  }

  const iterRes = await client.query('SELECT ite_id, itt_code FROM iterations_ite');
  const iterations = iterRes.rows;
  const prodEnv = envs.find(e => e.env_name === 'PROD');
  const nonProdEnvs = envs.filter(e => e.env_name !== 'PROD');

  for (const iter of iterations) {
    const shuffledNonProd = [...nonProdEnvs].sort(() => 0.5 - Math.random());

    if (iter.itt_code === 'CUTOVER') {
      // Rule: CUTOVER uses the real PROD env + 1 TEST + 1 BACKUP
      if (prodEnv && shuffledNonProd.length >= 2) {
        // Link to real PROD with PROD role
        await client.query('INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [prodEnv.env_id, iter.ite_id, prodRoleId]);
        // Link to a non-prod env with TEST role
        await client.query('INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [shuffledNonProd[0].env_id, iter.ite_id, testRoleId]);
        // Link to another non-prod env with BACKUP role
        await client.query('INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [shuffledNonProd[1].env_id, iter.ite_id, backupRoleId]);
      }
    } else if (iter.itt_code === 'RUN' || iter.itt_code === 'DR') {
      // Rule: RUN/DR use non-prod envs for all 3 roles (PROD, TEST, BACKUP)
      if (shuffledNonProd.length >= 3) {
        // Link to a non-prod env with PROD role
        await client.query('INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [shuffledNonProd[0].env_id, iter.ite_id, prodRoleId]);
        // Link to another non-prod env with TEST role
        await client.query('INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [shuffledNonProd[1].env_id, iter.ite_id, testRoleId]);
        // Link to a third non-prod env with BACKUP role
        await client.query('INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [shuffledNonProd[2].env_id, iter.ite_id, backupRoleId]);
      }
    }
  }
  console.log('Finished linking environments to iterations.');
}

/**
 * Links applications to environments.
 * - All apps linked to PROD and EV1.
 * - Other envs get a random subset of apps.
 * @param {object} client - The PostgreSQL client.
 */
async function generateEnvironmentApplicationLinks(client) {
  console.log('Linking applications to environments...');
  const envRes = await client.query('SELECT env_id, env_name FROM environments_env');
  const appRes = await client.query('SELECT app_id FROM applications_app');
  const envs = envRes.rows;
  const apps = appRes.rows;

  if (envs.length < 2 || apps.length === 0) {
    console.warn('Warning: Not enough environments or applications to link.');
    return;
  }

  const prodEnv = envs.find(e => e.env_name === 'PROD');
  const testEnvs = envs.filter(e => e.env_name.startsWith('EV')); // Assuming 'EV' envs are for testing

  if (!prodEnv || testEnvs.length === 0) {
    console.warn('Warning: PROD or a suitable TEST environment not found for linking.');
    return;
  }

  // Rule 1: All apps must be on PROD
  // Rule 2: All apps must be on at least one TEST environment.
  const designatedTestEnv = testEnvs[0]; // We'll use the first available TEST env

  for (const app of apps) {
    // Link to PROD
    await client.query(
      'INSERT INTO environments_env_x_applications_app (env_id, app_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [prodEnv.env_id, app.app_id]
    );
    // Link to the designated TEST environment
    await client.query(
      'INSERT INTO environments_env_x_applications_app (env_id, app_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [designatedTestEnv.env_id, app.app_id]
    );
  }

  // For all other TEST environments, link a random subset of apps
  for (const env of testEnvs.slice(1)) {
    const shuffled = [...apps].sort(() => 0.5 - Math.random());
    const numLinks = faker.number.int({ min: 1, max: apps.length });
    for (let i = 0; i < numLinks; i++) {
      await client.query(
        'INSERT INTO environments_env_x_applications_app (env_id, app_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [env.env_id, shuffled[i].app_id]
      );
    }
  }
  console.log('Finished linking applications to environments.');
}

/**
 * Truncates all tables related to environments and their links.
 * @param {object} client - The PostgreSQL client.
 */
async function resetEnvironmentsTables(client) {
  console.log('Resetting environments tables...');
  const tablesToReset = [
    'environments_env_x_iterations_ite',
    'environments_env_x_applications_app',
    'environments_env'
  ];
  try {
    for (const table of tablesToReset) {
      await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      console.log(`  - Table ${table} truncated.`);
    }
    console.log('Finished resetting environments tables.');
  } catch (error) {
    console.error(`Error resetting environments tables: ${error}`);
    throw error;
  }
}

/**
 * Main function to generate environments and all related links.
 * @param {object} options - Command line options, e.g., { reset: true }.
 */
async function generateAllEnvironments(options = {}) {
  try {
    if (options.reset) {
      await resetEnvironmentsTables(client);
    }
    await generateEnvironments(client);
    // Note: Linking functions depend on other generators (iterations, apps) having run first.
    // The main orchestrator script will handle the correct execution order.
    await generateEnvironmentIterationLinks(client);
    await generateEnvironmentApplicationLinks(client);
  } catch (error) {
    console.error('Error generating environments and links:', error);
    throw error;
  }
}

module.exports = { generateAllEnvironments };