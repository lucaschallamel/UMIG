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
  const prodEnv = envs.find(e => e.env_name === 'PROD');
  const nonProdEnvs = envs.filter(e => e.env_name !== 'PROD');

  if (!prodEnv || nonProdEnvs.length < 2) {
    console.warn('Warning: Not enough environments for iteration associations.');
    return;
  }

  const iterRes = await client.query('SELECT ite_id, ite_type FROM iterations_ite');
  const iterations = iterRes.rows;

  for (const iter of iterations) {
    if (iter.ite_type === 'RUN' || iter.ite_type === 'DR') {
      const shuffled = [...nonProdEnvs].sort(() => 0.5 - Math.random());
      const roles = ['PROD', 'TEST', 'BACKUP'];
      for (let i = 0; i < 3; i++) {
        await client.query(
          'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, eit_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [shuffled[i % shuffled.length].env_id, iter.ite_id, roles[i]]
        );
      }
    } else if (iter.ite_type === 'CUTOVER') {
      await client.query(
        'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, eit_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [prodEnv.env_id, iter.ite_id, 'PROD']
      );
      const shuffled = [...nonProdEnvs].sort(() => 0.5 - Math.random());
      await client.query(
        'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, eit_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [shuffled[0].env_id, iter.ite_id, 'TEST']
      );
      await client.query(
        'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, eit_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [shuffled[1].env_id, iter.ite_id, 'BACKUP']
      );
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
      'INSERT INTO environments_env_x_applications_app (env_id, app_id, comments) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [prodEnv.env_id, app.app_id, faker.lorem.sentence()]
    );
    await client.query(
      'INSERT INTO environments_env_x_applications_app (env_id, app_id, comments) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [ev1Env.env_id, app.app_id, faker.lorem.sentence()]
    );
  }

  for (const env of envs) {
    if (env.env_name === 'PROD' || env.env_name === 'EV1') continue;
    const shuffled = [...apps].sort(() => 0.5 - Math.random());
    const numLinks = Math.max(5, Math.floor(apps.length / 2));
    for (let i = 0; i < numLinks; i++) {
      const app = shuffled[i % apps.length];
      await client.query(
        'INSERT INTO environments_env_x_applications_app (env_id, app_id, comments) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [env.env_id, app.app_id, faker.lorem.sentence()]
      );
    }
  }
  console.log('Finished linking applications to environments.');
}

/**
 * Main function to generate environments and all related links.
 */
async function generateAllEnvironments() {
  try {
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