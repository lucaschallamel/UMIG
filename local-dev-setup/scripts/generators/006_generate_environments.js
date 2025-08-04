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
 * Now follows specific rules for iteration types.
 * @param {Array<object>} environments - Array of environment objects to create.
 * @param {object} options - Generation options, e.g., { reset: boolean }.
 */
async function generateAllEnvironments(environments, options = {}) {
  if (options.erase) {
    await eraseEnvironmentsTable(client);
  }

  console.log('Generating environments...');
  
  // Create environments and store mapping by name
  const envByName = {};
  for (const env of environments) {
    const query = `
      INSERT INTO environments_env (env_code, env_name, env_description, created_by, created_at, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (env_code) DO NOTHING
      RETURNING env_id, env_name;
    `;
    const res = await client.query(query, [env.name, env.name, env.description, 'generator', new Date(), 'generator', new Date()]);
    if (res.rows.length > 0) {
      envByName[res.rows[0].env_name] = res.rows[0].env_id;
    }
  }
  
  // If environments already existed, fetch them
  if (Object.keys(envByName).length === 0) {
    const allEnvsRes = await client.query('SELECT env_id, env_name FROM environments_env');
    allEnvsRes.rows.forEach(row => {
      envByName[row.env_name] = row.env_id;
    });
  }
  
  console.log('Finished generating environments.');

  if (Object.keys(envByName).length === 0) {
    console.log('No environments found or created, skipping linking.');
    return;
  }

  // Get environment roles
  const roleRows = await client.query('SELECT enr_id, enr_name FROM environment_roles_enr');
  const roleByName = {};
  roleRows.rows.forEach(row => {
    roleByName[row.enr_name] = row.enr_id;
  });

  // Link to applications (unchanged)
  console.log('Linking environments to applications...');
  const applications = await client.query('SELECT app_id FROM applications_app');
  if (applications.rows.length > 0) {
    for (const envName in envByName) {
      const envId = envByName[envName];
      const appsToLink = faker.helpers.arrayElements(applications.rows, faker.number.int({ min: 1, max: 3 }));
      for (const app of appsToLink) {
        await client.query(
          'INSERT INTO environments_env_x_applications_app (env_id, app_id) VALUES ($1, $2) ON CONFLICT (env_id, app_id) DO NOTHING',
          [envId, app.app_id]
        );
      }
    }
  }

  // Link to iterations with specific rules
  console.log('Linking environments to iterations with type-specific rules...');
  const iterations = await client.query('SELECT ite_id, itt_code, ite_name FROM iterations_ite');
  
  if (iterations.rows.length === 0) {
    console.log('No iterations to link. Skipping.');
    return;
  }

  // Get non-PROD environments for RUN and DR iterations
  const nonProdEnvNames = Object.keys(envByName).filter(name => name !== 'PROD');
  
  for (const iter of iterations.rows) {
    console.log(`  Processing ${iter.itt_code} iteration: ${iter.ite_name}`);
    
    if (iter.itt_code === 'CUTOVER') {
      // CUTOVER: PROD environment in PROD role, others for TEST/BACKUP
      // Assign PROD environment to PROD role
      await client.query(
        'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING',
        [envByName['PROD'], iter.ite_id, roleByName['PROD']]
      );
      
      // Assign random non-PROD environments to TEST and BACKUP roles
      const testEnv = faker.helpers.arrayElement(nonProdEnvNames);
      const backupEnv = faker.helpers.arrayElement(nonProdEnvNames);
      
      await client.query(
        'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING',
        [envByName[testEnv], iter.ite_id, roleByName['TEST']]
      );
      
      await client.query(
        'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING',
        [envByName[backupEnv], iter.ite_id, roleByName['BACKUP']]
      );
      
    } else {
      // RUN and DR: Never use PROD environment, use others for all roles
      // Randomly assign non-PROD environments to each role
      const prodRoleEnv = faker.helpers.arrayElement(nonProdEnvNames);
      const testEnv = faker.helpers.arrayElement(nonProdEnvNames);
      const backupEnv = faker.helpers.arrayElement(nonProdEnvNames);
      
      await client.query(
        'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING',
        [envByName[prodRoleEnv], iter.ite_id, roleByName['PROD']]
      );
      
      await client.query(
        'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING',
        [envByName[testEnv], iter.ite_id, roleByName['TEST']]
      );
      
      await client.query(
        'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3) ON CONFLICT (env_id, ite_id) DO NOTHING',
        [envByName[backupEnv], iter.ite_id, roleByName['BACKUP']]
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
  
  console.log('\nEnvironment assignment summary:');
  summary.rows.forEach(row => {
    console.log(`  ${row.itt_code}: ${row.iterations_with_envs}/${row.iteration_count} iterations have environments`);
  });
  
  console.log('Finished linking environments.');
}

export { generateAllEnvironments, eraseEnvironmentsTable };