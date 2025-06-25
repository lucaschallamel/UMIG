const { client } = require('../lib/db');
const { faker, makeTeamEmail } = require('../lib/utils');

/**
 * Generates teams, ensuring the 'IT_CUTOVER' team is always created first.
 * @param {object} client - The PostgreSQL client.
 * @param {object} config - Configuration object with num_teams and teams_email_domain.
 */
async function generateTeams(client, config) {
  console.log(`Generating ${config.num_teams} teams...`);
  const domain = config.teams_email_domain;

  // Always create IT_CUTOVER first for user assignment stability
  const specialTeamName = 'IT_CUTOVER';
  await client.query(
    `INSERT INTO teams_tms (tms_name, tms_description, tms_email) VALUES ($1, $2, $3)
     ON CONFLICT (tms_email) DO NOTHING`,
    [specialTeamName, 'Team for IT Cutover activities', makeTeamEmail(specialTeamName, domain)]
  );

  for (let i = 1; i < config.num_teams; i++) {
    const name = `TEAM_${faker.word.adjective().toUpperCase()}`.replace(/ /g, '_');
    const description = faker.company.catchPhrase();
    const email = makeTeamEmail(name, domain);
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
  console.log(`Generating ${config.num_apps} applications...`);
  for (let i = 1; i <= config.num_apps; i++) {
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
 * Links teams to applications randomly.
 * @param {object} client - The PostgreSQL client.
 */
async function generateTeamApplicationLinks(client) {
  console.log('Linking teams to applications...');
  const teamRes = await client.query('SELECT tms_id FROM teams_tms');
  const appRes = await client.query('SELECT app_id FROM applications_app');
  const teams = teamRes.rows;
  const apps = appRes.rows;

  if (teams.length === 0 || apps.length === 0) {
    console.warn('Warning: No teams or applications found to link.');
    return;
  }

  // Each team is linked to a random number of apps (between 1 and 5)
  for (const team of teams) {
    const shuffledApps = [...apps].sort(() => 0.5 - Math.random());
    const numLinks = faker.number.int({ min: 1, max: Math.min(5, apps.length) });
    for (let i = 0; i < numLinks; i++) {
      await client.query(
        'INSERT INTO teams_tms_x_applications_app (tms_id, app_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [team.tms_id, shuffledApps[i].app_id]
      );
    }
  }
  console.log('Finished linking teams to applications.');
}

/**
 * Main function to generate teams, applications, and their links.
 * @param {object} config - The main configuration object.
 */
async function generateTeamsAndApps(config) {
  try {
    await generateTeams(client, config);
    await generateApplications(client, config);
    await generateTeamApplicationLinks(client);
  } catch (error) {
    console.error('Error generating teams and applications:', error);
    throw error;
  }
}

module.exports = { generateTeamsAndApps };