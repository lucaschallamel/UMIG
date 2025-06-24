const { client } = require('../lib/db');

/**
 * Pre-populates the roles_rls table with default roles.
 * @param {object} client - The PostgreSQL client.
 */
async function generateRoles(client) {
  console.log('Prepopulating roles_rls...');
  const roles = [
    ['ADMIN', 'Administrator', 'Full access to all system features.'],
    ['NORMAL', 'Normal User', 'Standard user with access to create and manage implementation plans.'],
    ['PILOT', 'Pilot User', 'User with access to pilot features and functionalities.']
  ];

  for (const [rle_code, rle_name, rle_description] of roles) {
    await client.query(
      'INSERT INTO roles_rls (rle_code, rle_name, rle_description) VALUES ($1, $2, $3) ON CONFLICT (rle_code) DO NOTHING',
      [rle_code, rle_name, rle_description]
    );
  }
  console.log('Finished prepopulating roles_rls.');
}

/**
 * Pre-populates the step_type_stt table with reference values and color codes.
 * @param {object} client - The PostgreSQL client.
 */
async function generateStepTypes(client) {
  console.log('Prepopulating step_type_stt...');
  const stepTypes = [
    ['TRT', 'TREATMENTS', 'Treatments steps', '#1ba1e2'],
    ['PRE', 'PREPARATION', 'Preparation steps', '#008a00'],
    ['IGO', 'IT GO', 'IT Validation steps', '#7030a0'],
    ['CHK', 'CHECK', 'Controls and check activities', '#ffff00'],
    ['BUS', 'BUS', 'Bus related steps', '#ff00ff'],
    ['SYS', 'SYSTEM', 'System related activities', '#000000'],
    ['GON', 'GO/NOGO', 'Go/No Go steps', '#ff0000'],
    ['BGO', 'BUSINESS GO', 'Business Validation steps', '#ffc000'],
    ['DUM', 'DUMPS', 'Database related activities', '#948a54'],
  ];

  for (const [stt_code, stt_name, stt_description, type_color] of stepTypes) {
    await client.query(
      `INSERT INTO step_type_stt (stt_code, stt_name, stt_description, type_color) VALUES ($1, $2, $3, $4)
       ON CONFLICT (stt_code) DO NOTHING`,
      [stt_code, stt_name, stt_description, type_color]
    );
  }
  console.log('Finished prepopulating step_type_stt.');
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