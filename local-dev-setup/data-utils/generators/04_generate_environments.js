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

  if (envs.length < 2 || !prodRoleId || !backupRoleId || !testRoleId) {
    console.warn('Warning: Required environments or roles (PROD, BACKUP, TEST) not found.');
    return;
  }

  const iterRes = await client.query('SELECT ite_id, itt_code FROM iterations_ite');
  const iterations = iterRes.rows;
  const prodEnv = envs.find(e => e.env_name === 'PROD');

  for (const iter of iterations) {
    if (iter.itt_code === 'CUTOVER') {
      // For CUTOVER, only link the PROD environment with the PROD role.
      if (prodEnv) {
        await client.query(
          'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [prodEnv.env_id, iter.ite_id, prodRoleId]
        );
      }
    } else if (iter.itt_code === 'RUN' || iter.itt_code === 'DR') {
      // For RUN/DR, link PROD, BACKUP, and some TEST environments
      const shuffledEnvs = [...envs].sort(() => 0.5 - Math.random());
      
      if (shuffledEnvs.length > 0) {
        await client.query(
          'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [shuffledEnvs[0].env_id, iter.ite_id, prodRoleId]
        );
      }

      if (shuffledEnvs.length > 1) {
        await client.query(
          'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [shuffledEnvs[1].env_id, iter.ite_id, backupRoleId]
        );
      }

      const numTestEnvs = faker.number.int({ min: 1, max: Math.min(3, shuffledEnvs.length - 2) });
      for (let k = 2; k < 2 + numTestEnvs && k < shuffledEnvs.length; k++) {
        await client.query(
          'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [shuffledEnvs[k].env_id, iter.ite_id, testRoleId]
        );
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
  const ev1Env = envs.find(e => e.env_name === 'EV1');
  if (!prodEnv || !ev1Env) {
      console.warn('Warning: PROD or EV1 environment not found for linking.');
      return;
  }

  for (const app of apps) {
    await client.query(
      'INSERT INTO environments_env_x_applications_app (env_id, app_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [prodEnv.env_id, app.app_id]
    );
    await client.query(
      'INSERT INTO environments_env_x_applications_app (env_id, app_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [ev1Env.env_id, app.app_id]
    );
  }

  for (const env of envs) {
    if (env.env_name === 'PROD' || env.env_name === 'EV1') continue;
    const shuffled = [...apps].sort(() => 0.5 - Math.random());
    const numLinks = Math.max(5, Math.floor(apps.length / 2));
    for (let i = 0; i < numLinks; i++) {
      const app = shuffled[i % apps.length];
      await client.query(
        'INSERT INTO environments_env_x_applications_app (env_id, app_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [env.env_id, app.app_id]
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