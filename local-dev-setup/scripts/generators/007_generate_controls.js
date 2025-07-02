import { client } from '../lib/db.js';
import { faker } from '../lib/utils.js';

const CONTROL_TYPES = ['QUALITY', 'COMPLETENESS', 'SECURITY', 'PERFORMANCE', 'COMPLIANCE'];

/**
 * Erases the master controls table.
 * @param {object} dbClient - The database client.
 */
export async function eraseControlsTables(dbClient) {
  console.log('Erasing master controls table...');
  await dbClient.query('TRUNCATE TABLE "controls_master_ctm" RESTART IDENTITY CASCADE');
  console.log('Finished erasing master controls table.');
}

/**
 * Generates master control records.
 * @param {object} config - The configuration object.
 */
export async function generateControls(config, options = {}) {
  const { clientOverride } = options;
  const dbClient = clientOverride || client;

  if (options.erase) {
    await eraseControlsTables(dbClient);
  }

  console.log('Generating master controls...');
  const { COUNT } = config.CONTROLS;

  const phases = await client.query('SELECT phm_id FROM phases_master_phm');
  if (phases.rows.length === 0) {
    throw new Error('Cannot generate controls: No master phases found in the database.');
  }

  let controlCounter = 0;
  const controlQueries = [];
  for (let i = 0; i < COUNT; i++) {
    const phaseId = faker.helpers.arrayElement(phases.rows).phm_id;
    const prefix = faker.helpers.arrayElement(['C', 'K']);
    const code = `${prefix}${(controlCounter++).toString().padStart(4, '0')}`;
    const query = {
      text: `
        INSERT INTO controls_master_ctm (phm_id, ctm_order, ctm_name, ctm_description, ctm_type, ctm_is_critical, ctm_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `,
      values: [
        phaseId,
        i + 1,
        `Control: ${faker.lorem.words(3)}`,
        faker.lorem.sentence(),
        faker.helpers.arrayElement(CONTROL_TYPES),
        faker.datatype.boolean(), // Not deprecated, but consider updating if faker v9+ deprecates this in future
        code,
      ],
    };
    controlQueries.push(client.query(query));
  }

  await Promise.all(controlQueries);
  console.log(`Finished generating ${COUNT} master controls.`);
}
