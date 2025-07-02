import { faker } from '../lib/utils.js';
import { client } from '../lib/db.js';

/**
 * Truncates tables related to instance data.
 */
async function eraseInstanceDataTables(client) {
  console.log('Erasing instance data tables...');
  // Order is important for truncation due to foreign keys. Start from the "bottom" up.
  const tablesToReset = [
    'controls_instance_cti',
    'instructions_instance_ini',
    'steps_instance_sti',
    'phases_instance_phi',
    'sequences_instance_sqi',
    'plans_instance_pli',
  ];
  try {
    for (const table of tablesToReset) {
      const res = await client.query(`SELECT to_regclass('public."${table}"');`);
      if (res.rows[0].to_regclass) {
        await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
        console.log(`  - Table ${table} truncated.`);
      } else {
        console.log(`  - Table ${table} does not exist, skipping truncation.`);
      }
    }
    console.log('Finished erasing instance data tables.');
  } catch (error) {
    console.error(`Error erasing instance data tables: ${error}`);
    throw error;
  }
}

/**
 * Generates instance data for each iteration.
 * This function creates a concrete, executable instance of a master plan for each iteration.
 */
async function generateInstanceData(config, options = {}) {
  if (options.erase) {
    await eraseInstanceDataTables(client);
  }

  console.log('Generating instance data...');

  // Get required master data. These must exist before instances can be created.
  const iterations = await client.query('SELECT ite_id, plm_id FROM iterations_ite');
  const users = await client.query('SELECT usr_id FROM users_usr');

    if (iterations.rows.length === 0 || users.rows.length === 0) {
    throw new Error('Cannot generate instance data: Missing master data (iterations or users).');
  }

  // For each iteration, create an instance of the specific master plan it is linked to.
  for (const iteration of iterations.rows) {
    const masterPlanId = iteration.plm_id;
    if (!masterPlanId) {
      console.warn(`  - Skipping iteration ${iteration.ite_id} as it has no linked master plan.`);
      continue;
    }
    const ownerId = faker.helpers.arrayElement(users.rows).usr_id;

    // 1. Create Plan Instance (pli)
    const pliRes = await client.query(
      `INSERT INTO plans_instance_pli (plm_id, ite_id, pli_name, pli_description, pli_status, usr_id_owner)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING pli_id`,
      [
        masterPlanId,
        iteration.ite_id,
        `Instance of Plan ${masterPlanId.substring(0, 8)} for Iteration ${iteration.ite_id.substring(0, 8)}`,
        faker.lorem.sentence(),
        'NOT_STARTED',
        ownerId,
      ]
    );
    const planInstanceId = pliRes.rows[0].pli_id;

    const masterSequences = await client.query('SELECT sqm_id FROM sequences_master_sqm WHERE plm_id = $1 ORDER BY sqm_order', [masterPlanId]);

    for (const masterSequence of masterSequences.rows) {
      // 2. Create Sequence Instance (sqi)
      const sqiRes = await client.query(
        `INSERT INTO sequences_instance_sqi (pli_id, sqm_id, sqi_status)
         VALUES ($1, $2, $3) RETURNING sqi_id`,
        [planInstanceId, masterSequence.sqm_id, 'NOT_STARTED']
      );
      const sequenceInstanceId = sqiRes.rows[0].sqi_id;

      const masterPhases = await client.query('SELECT phm_id FROM phases_master_phm WHERE sqm_id = $1 ORDER BY phm_order', [masterSequence.sqm_id]);

      for (const masterPhase of masterPhases.rows) {
        // 3. Create Phase Instance (phi)
        const phiRes = await client.query(
          `INSERT INTO phases_instance_phi (sqi_id, phm_id, phi_status)
           VALUES ($1, $2, $3) RETURNING phi_id`,
          [sequenceInstanceId, masterPhase.phm_id, 'NOT_STARTED']
        );
        const phaseInstanceId = phiRes.rows[0].phi_id;

        const masterSteps = await client.query('SELECT stm_id FROM steps_master_stm WHERE phm_id = $1 ORDER BY stm_number', [masterPhase.phm_id]);

        for (const masterStep of masterSteps.rows) {
          // 4. Create Step Instance (sti)
          const stiRes = await client.query(
            `INSERT INTO steps_instance_sti (phi_id, stm_id, sti_status)
             VALUES ($1, $2, $3) RETURNING sti_id`,
            [phaseInstanceId, masterStep.stm_id, 'NOT_STARTED']
          );
          const stepInstanceId = stiRes.rows[0].sti_id;

          // The master plans currently don't have instructions, but this logic is here for future use.
          const masterInstructions = await client.query('SELECT inm_id FROM instructions_master_inm WHERE stm_id = $1', [masterStep.stm_id]);

          for (const masterInstruction of masterInstructions.rows) {
            // 5. Create Instruction Instance (ini)
            await client.query(
              `INSERT INTO instructions_instance_ini (sti_id, inm_id, ini_is_completed)
               VALUES ($1, $2, $3)`,
              [stepInstanceId, masterInstruction.inm_id, false]
            );
          }

          // 6. Create Control Instances (cti) for the step's phase
          const masterControls = await client.query('SELECT ctm_id FROM controls_master_ctm WHERE phm_id = $1', [masterPhase.phm_id]);

          for (const masterControl of masterControls.rows) {
            await client.query(
              `INSERT INTO controls_instance_cti (sti_id, ctm_id, cti_status)
               VALUES ($1, $2, $3)`,
              [stepInstanceId, masterControl.ctm_id, 'PENDING']
            );
          }
        }
      }
    }
  }
  console.log('Finished generating instance data.');
}

export { generateInstanceData, eraseInstanceDataTables };
