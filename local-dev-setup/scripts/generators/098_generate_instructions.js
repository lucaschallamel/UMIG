import { faker } from '../lib/utils.js';
import { client } from '../lib/db.js';

/**
 * Truncates the instructions tables in correct order.
 * @param {object} dbClient - The PostgreSQL client.
 */
async function eraseInstructionsTables(dbClient) {
  console.log('Erasing instructions_instance_ini and instructions_master_inm tables...');
  try {
    await dbClient.query('TRUNCATE TABLE instructions_instance_ini RESTART IDENTITY CASCADE');
    await dbClient.query('TRUNCATE TABLE instructions_master_inm RESTART IDENTITY CASCADE');
    console.log('  - Tables truncated.');
  } catch (error) {
    console.error(`Error erasing instructions tables: ${error}`);
    throw error;
  }
}

/**
 * Generates instructions for each master step and all step instances.
 * @param {object} config - Main config object.
 * @param {object} options - Generation options, e.g., { erase: boolean, clientOverride: object }.
 */
async function generateInstructions(config, options = {}) {
  const dbClient = options.clientOverride || client;
  if (options.erase) {
    await eraseInstructionsTables(dbClient);
  }

  // Fetch all required master data
  const stepsRes = await dbClient.query('SELECT stm_id FROM steps_master_stm');
  const teamsRes = await dbClient.query('SELECT tms_id FROM teams_tms');
  const controlsRes = await dbClient.query('SELECT ctm_id FROM controls_master_ctm');

  if (!stepsRes.rows.length || !teamsRes.rows.length) {
    throw new Error('Cannot generate instructions: missing steps or teams.');
  }

  // Use config for instructions generation
  const instrCfg = config.INSTRUCTIONS || {
    PER_STEP: { MIN: 1, MAX: 5 },
    BODY_TYPE: 'sentence',
    DURATION_MIN: 5,
    DURATION_MAX: 30,
    REQUIRE_TEAM: true,
    OPTIONAL_CONTROL: true
  };

  const instructionsMasters = [];
  for (const { stm_id } of stepsRes.rows) {
    const numInstructions = faker.number.int({ min: instrCfg.PER_STEP.MIN, max: instrCfg.PER_STEP.MAX });
    for (let order = 1; order <= numInstructions; order++) {
      // Always require a team
      const tms_id = instrCfg.REQUIRE_TEAM
        ? faker.helpers.arrayElement(teamsRes.rows).tms_id
        : null;
      // Optionally associate a control
      const ctm_id = (instrCfg.OPTIONAL_CONTROL && controlsRes.rows.length && faker.datatype.boolean())
        ? faker.helpers.arrayElement(controlsRes.rows).ctm_id
        : null;
      // Random description
      const inm_body = instrCfg.BODY_TYPE === 'sentence'
        ? faker.lorem.sentence()
        : faker.lorem.paragraph();
      // Random duration
      const inm_duration_minutes = faker.number.int({ min: instrCfg.DURATION_MIN, max: instrCfg.DURATION_MAX });
      instructionsMasters.push({ stm_id, tms_id, ctm_id, inm_order: order, inm_body, inm_duration_minutes });
    }
  }

  // Insert instructions_master_inm and collect their generated IDs
  const inmIdMap = new Map(); // Map stm_id => [inm_id,...]
  for (const instr of instructionsMasters) {
    const res = await dbClient.query(
      `INSERT INTO instructions_master_inm (stm_id, tms_id, ctm_id, inm_order, inm_body, inm_duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING inm_id`,
      [instr.stm_id, instr.tms_id, instr.ctm_id, instr.inm_order, instr.inm_body, instr.inm_duration_minutes]
    );
    if (!inmIdMap.has(instr.stm_id)) inmIdMap.set(instr.stm_id, []);
    inmIdMap.get(instr.stm_id).push(res.rows[0].inm_id);
  }

  console.log(`Inserted ${instructionsMasters.length} instruction masters.`);
}

export { generateInstructions, eraseInstructionsTables };
