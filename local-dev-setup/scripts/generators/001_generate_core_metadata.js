

/**
 * Pre-populates the roles_rls table with default roles.
 * @param {object} client - The PostgreSQL client.
 */
import { client } from '../lib/db.js';

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
 * Pre-populates the status_sts table with default statuses for all entity types.
 * @param {object} client - The PostgreSQL client.
 */
async function generateStatuses(client) {
  console.log('Prepopulating status_sts...');
  
  const statuses = [
    // Migration statuses
    ['PLANNING', '#FFA500', 'Migration'],     // Orange
    ['IN_PROGRESS', '#0066CC', 'Migration'],  // Blue
    ['COMPLETED', '#00AA00', 'Migration'],    // Green
    ['CANCELLED', '#CC0000', 'Migration'],    // Red

    // Plan statuses
    ['PLANNING', '#FFA500', 'Plan'],          // Orange
    ['IN_PROGRESS', '#0066CC', 'Plan'],       // Blue
    ['COMPLETED', '#00AA00', 'Plan'],         // Green
    ['CANCELLED', '#CC0000', 'Plan'],         // Red

    // Iteration statuses
    ['PLANNING', '#FFA500', 'Iteration'],     // Orange
    ['IN_PROGRESS', '#0066CC', 'Iteration'],  // Blue
    ['COMPLETED', '#00AA00', 'Iteration'],    // Green
    ['CANCELLED', '#CC0000', 'Iteration'],    // Red

    // Sequence statuses
    ['PLANNING', '#FFA500', 'Sequence'],      // Orange
    ['IN_PROGRESS', '#0066CC', 'Sequence'],   // Blue
    ['COMPLETED', '#00AA00', 'Sequence'],     // Green
    ['CANCELLED', '#CC0000', 'Sequence'],     // Red

    // Phase statuses
    ['PLANNING', '#FFA500', 'Phase'],         // Orange
    ['IN_PROGRESS', '#0066CC', 'Phase'],      // Blue
    ['COMPLETED', '#00AA00', 'Phase'],        // Green
    ['CANCELLED', '#CC0000', 'Phase'],        // Red

    // Step statuses (more granular)
    ['PENDING', '#DDDDDD', 'Step'],           // Light Grey
    ['TODO', '#FFFF00', 'Step'],              // Yellow
    ['IN_PROGRESS', '#0066CC', 'Step'],       // Blue
    ['COMPLETED', '#00AA00', 'Step'],         // Green
    ['FAILED', '#FF0000', 'Step'],            // Red
    ['BLOCKED', '#FF6600', 'Step'],           // Orange
    ['CANCELLED', '#CC0000', 'Step'],         // Dark Red

    // Control statuses
    ['TODO', '#FFFF00', 'Control'],           // Yellow
    ['PASSED', '#00AA00', 'Control'],         // Green
    ['FAILED', '#FF0000', 'Control'],         // Red
    ['CANCELLED', '#CC0000', 'Control']       // Dark Red
  ];

  for (const [sts_name, sts_color, sts_type] of statuses) {
    await client.query(
      'INSERT INTO status_sts (sts_name, sts_color, sts_type) VALUES ($1, $2, $3) ON CONFLICT (sts_name, sts_type) DO NOTHING',
      [sts_name, sts_color, sts_type]
    );
  }
  console.log('Finished prepopulating status_sts.');
}

/**
 * Main function to generate all core metadata.
 */
async function generateCoreMetadata(options = {}) {
  const dbClient = options.clientOverride || client;
  try {
        await generateRoles(dbClient);
        await generateStepTypes(dbClient);
        await generateStatuses(dbClient);
  } catch (error) {
    console.error('Error generating core metadata:', error);
    throw error;
  }
}

export { generateCoreMetadata };
