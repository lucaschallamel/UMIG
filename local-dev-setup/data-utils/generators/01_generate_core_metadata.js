const { client } = require('../lib/db');

/**
 * Pre-populates the roles_rls table with default roles.
 * @param {object} client - The PostgreSQL client.
 */
async function generateRoles(client) {
  console.log('Prepopulating roles_rls...');
  const roles = [
    ['ADMIN', 'Full access to all system features.'],
    ['NORMAL', 'Standard user with access to create and manage implementation plans.'],
    ['PILOT', 'User with access to pilot features and functionalities.']
  ];

  for (const [rls_code, rls_description] of roles) {
    await client.query(
      'INSERT INTO roles_rls (rls_code, rls_description) VALUES ($1, $2) ON CONFLICT (rls_code) DO NOTHING',
      [rls_code, rls_description]
    );
  }
  console.log('Finished prepopulating roles_rls.');
}

/**
 * Pre-populates the step_types_stt table with default step types.
 * @param {object} client - The PostgreSQL client.
 */
async function generateStepTypes(client) {
  console.log('Prepopulating step_types_stt...');
  const stepTypes = [
    ['TRT', 'TREATMENTS', '#1ba1e2'],
    ['PRE', 'PREPARATION', '#008a00'],
    ['IGO', 'IT GO', '#7030a0'],
    ['CHK', 'CHECK', '#ffff00'],
    ['BUS', 'BUS', '#ff00ff'],
    ['SYS', 'SYSTEM', '#000000'],
    ['GON', 'GO/NOGO', '#ff0000'],
    ['BGO', 'BUSINESS GO', '#ffc000'],
    ['DUM', 'DUMPS', '#948a54']
  ];

  for (const [stt_code, stt_name, stt_color] of stepTypes) {
    await client.query(
      'INSERT INTO step_types_stt (stt_code, stt_name, stt_color) VALUES ($1, $2, $3) ON CONFLICT (stt_code) DO NOTHING',
      [stt_code, stt_name, stt_color]
    );
  }
  console.log('Finished prepopulating step_types_stt.');
}

/**
 * Main function to generate all core metadata.
 */
async function generateCoreMetadata() {
  try {
    await generateRoles(client);
    await generateStepTypes(client);
  } catch (error) {
    console.error('Error generating core metadata:', error);
    throw error;
  }
}

module.exports = { generateCoreMetadata };
