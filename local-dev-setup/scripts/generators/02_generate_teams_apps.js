import { client } from '../lib/db.js';
import { faker, makeTeamEmail } from '../lib/utils.js';

/**
 * Generates teams, ensuring the 'IT_CUTOVER' team is always created first.
 * @param {object} client - The PostgreSQL client.
 * @param {object} config - Configuration object with num_teams and teams_email_domain.
 */
async function generateTeams(client, config) {
  console.log(`Generating ${config.TEAMS.COUNT} teams...`);
  const domain = config.TEAMS.EMAIL_DOMAIN;

  // A single loop to generate all teams, ensuring IT_CUTOVER is always first.
  for (let i = 0; i < config.TEAMS.COUNT; i++) {
    let name, description, email;

    if (i === 0) {
      // The first team is always IT_CUTOVER for consistency in user assignments.
      name = 'IT_CUTOVER';
      description = 'Team for IT Cutover activities';
      email = makeTeamEmail(name, domain);
    } else {
      // Generate random teams for the rest.
      const department = faker.commerce.department();
      const teamType = faker.helpers.arrayElement(['Team', 'Group', 'Squad', 'Unit', 'Department', 'Division']);
      name = `${department} ${teamType}`;
      description = faker.company.catchPhrase();
      email = makeTeamEmail(name, domain);
    }

    await client.query(
      `INSERT INTO teams_tms (tms_name, tms_description, tms_email) VALUES ($1, $2, $3)
       ON CONFLICT (tms_email) DO NOTHING`,
      [name, description, email]
    );
  }
  console.log('Finished generating teams.');
}

/**
 * Generates a specified number of applications.
 * @param {object} client - The PostgreSQL client.
 * @param {object} config - Configuration object with num_apps.
 */
async function generateApplications(client, config) {
  console.log(`Generating ${config.APPLICATIONS.COUNT} applications...`);
  for (let i = 1; i <= config.APPLICATIONS.COUNT; i++) {
    const app_code = `APP${String(i).padStart(3, '0')}`;
    const app_name = faker.commerce.productName();
    const app_description = faker.lorem.sentence();
    await client.query(
      `INSERT INTO applications_app (app_code, app_name, app_description) VALUES ($1, $2, $3)
       ON CONFLICT (app_code) DO NOTHING`,
      [app_code, app_name, app_description]
    );
  }
  console.log('Finished generating applications.');
}

/**
 * Links teams to a random number of applications.
 * @param {object} client - The PostgreSQL client.
 */
async function generateTeamApplicationLinks(client) {
  console.log('Linking teams to applications...');
  const teamsResult = await client.query('SELECT tms_id FROM teams_tms');
  const teams = teamsResult.rows;
  const appsResult = await client.query('SELECT app_id FROM applications_app');
  const apps = appsResult.rows;

  if (teams.length === 0 || apps.length === 0) {
    throw new Error('Cannot link teams and applications: No teams or applications found.');
  }

  for (const team of teams) {
    const numLinks = faker.number.int({ min: 1, max: 5 });
    const linksToCreate = Math.min(numLinks, apps.length);

    if (linksToCreate > 0) {
      const appsToLink = faker.helpers.arrayElements(apps, linksToCreate);
      for (const appToLink of appsToLink) {
        await client.query(
          'INSERT INTO teams_tms_x_applications_app (tms_id, app_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [team.tms_id, appToLink.app_id]
        );
      }
    }
  }
  console.log('Finished linking teams to applications.');
}

/**
 * Truncates all tables related to teams and applications.
 * @param {object} client - The PostgreSQL client.
 */
async function eraseTeamsAndAppsTables(client) {
  console.log('Erasing teams and applications tables...');
  const tablesToReset = [
    'teams_tms_x_applications_app',
    'teams_tms',
    'applications_app'
  ];
  try {
    for (const table of tablesToReset) {
      // Use CASCADE to handle foreign key dependencies
      await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      console.log(`  - Table ${table} truncated.`);
    }
    console.log('Finished erasing teams and applications tables.');
  } catch (error) {
    console.error(`Error erasing teams and applications tables: ${error}`);
    throw error;
  }
}

/**
 * Main orchestrator function for generating teams, applications, and their links.
 * @param {object} config - The main configuration object.
 * @param {object} options - Generation options, e.g., { reset: boolean }.
 */
async function generateTeamsAndApps(config, options = {}) {
  try {
    if (options.erase) {
      await eraseTeamsAndAppsTables(client);
    }
    await generateTeams(client, config);
    await generateApplications(client, config);
    await generateTeamApplicationLinks(client);
  } catch (error) {
    console.error('Error generating teams and applications:', error);
    throw error;
  }
}

export {
  generateTeamsAndApps,
  generateTeams,
  generateApplications,
  generateTeamApplicationLinks,
  eraseTeamsAndAppsTables,
};
