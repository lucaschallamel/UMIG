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
 * Main function to generate all core metadata.
 */
async function generateCoreMetadata() {
  try {
    await generateRoles(client);
  } catch (error) {
    console.error('Error generating core metadata:', error);
    throw error;
  }
}

module.exports = { generateCoreMetadata };