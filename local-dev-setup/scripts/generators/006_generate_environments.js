import { faker } from '@faker-js/faker';
import { client } from '../lib/db.js';

/**
 * Truncates the environments_env table and its related join tables.
 * @param {object} client - The PostgreSQL client.
 */
async function eraseEnvironmentsTable(client) {
  console.log('Erasing environments table and associations...');
  const tables = [
    'environments_env_x_applications_app',
    'environments_env_x_iterations_ite',
    'environments_env',
  ];
  try {
    for (const table of tables) {
      await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      console.log(`  - Table ${table} truncated.`);
    }
    console.log('Finished erasing environments tables.');
  } catch (error) {
    console.error(`Error erasing environments table: ${error}`);
    throw error;
  }
}

/**
 * Generates all environments from the config file and links them to apps and iterations.
 * @param {Array<object>} environments - Array of environment objects to create.
 * @param {object} options - Generation options, e.g., { reset: boolean }.
 */
async function generateAllEnvironments(environments, options = {}) {
  if (options.erase) {
    await eraseEnvironmentsTable(client);
  }

  console.log('Generating environments...');
  const createdEnvIds = [];
  for (const env of environments) {
    const query = `
      INSERT INTO environments_env (env_code, env_name, env_description)
      VALUES ($1, $2, $3)
      ON CONFLICT (env_code) DO NOTHING
      RETURNING env_id;
    `;
    const res = await client.query(query, [env.name, env.name, env.description]);
    if (res.rows.length > 0) {
      createdEnvIds.push(res.rows[0].env_id);
    }
  }
  console.log('Finished generating environments.');

  // If no new environments were created (e.g., they all existed),
  // fetch all environment IDs to ensure linking still happens.
  let allEnvIds = createdEnvIds;
  if (createdEnvIds.length === 0) {
    const allEnvsRes = await client.query('SELECT env_id FROM environments_env');
    allEnvIds = allEnvsRes.rows.map(row => row.env_id);
  }

  if (allEnvIds.length === 0) {
    console.log('No environments found or created, skipping linking.');
    return;
  }

  // Now, link them to applications and iterations
  console.log('Linking environments to applications and iterations...');
  const applications = await client.query('SELECT app_id FROM applications_app');
  const iterations = await client.query('SELECT ite_id FROM iterations_ite');
  const envRoles = await client.query('SELECT enr_id FROM environment_roles_enr');

  if (applications.rows.length === 0 && iterations.rows.length === 0) {
    console.log('No applications or iterations to link. Skipping.');
    return;
  }

  for (const envId of allEnvIds) {
    // Link to a random number of applications
    if (applications.rows.length > 0) {
      const appsToLink = faker.helpers.arrayElements(applications.rows, faker.number.int({ min: 1, max: 3 }));
      for (const app of appsToLink) {
        await client.query(
          'INSERT INTO environments_env_x_applications_app (env_id, app_id) VALUES ($1, $2) ON CONFLICT (env_id, app_id) DO NOTHING',
          [envId, app.app_id]
        );
      }
    }

    // Link to a random number of iterations
    if (iterations.rows.length > 0 && envRoles.rows.length > 0) {
      const itersToLink = faker.helpers.arrayElements(iterations.rows, faker.number.int({ min: 1, max: 5 }));
      for (const iter of itersToLink) {
        const randomRole = faker.helpers.arrayElement(envRoles.rows);
        await client.query(
          'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING',
          [envId, iter.ite_id, randomRole.enr_id]
        );
      }
    }
  }
  console.log('Finished linking environments.');
}

export { generateAllEnvironments, eraseEnvironmentsTable };
