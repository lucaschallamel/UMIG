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
 * Helper function to determine if an attribute should be overridden
 * @returns {boolean} True if attribute should be overridden, false otherwise
 */
function shouldOverrideAttribute() {
  // 30% chance of overriding any attribute
  return Math.random() < 0.3;
}

/**
 * Helper function to generate override values for specific field types
 * @param {string} type - The field type ('name', 'description', 'order', 'boolean', etc.)
 * @param {any} originalValue - The original value from the master record (if available)
 * @returns {any} A value appropriate for the field type
 */
function generateOverrideValue(type, originalValue = null) {
  switch(type) {
    case 'name':
      return faker.lorem.words(2).substring(0, 50); // Keep names reasonably short
    case 'description':
      return faker.lorem.sentence(5);
    case 'order':
      // Produce a number slightly different from the original, if provided
      return originalValue ? 
        Math.max(1, originalValue + Math.floor(Math.random() * 5) - 2) : 
        Math.floor(Math.random() * 10) + 1;
    case 'boolean':
      // 50% chance of being true or false, regardless of original value
      return Math.random() > 0.5;
    case 'duration':
      // Random duration between 5-60 minutes
      return Math.floor(Math.random() * 56) + 5;
    case 'code':
      return `OVERRIDE_${faker.lorem.words(1).toUpperCase()}_${Math.floor(Math.random() * 100)}`;
    case 'type':
      return faker.helpers.arrayElement(['CHECK', 'ACTION', 'DECISION']);
    default:
      return null;
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
    console.log(`Creating plan instance for iteration ${iteration.ite_id} using master plan ${masterPlanId}`);
    
    const pliRes = await client.query(
      `INSERT INTO plans_instance_pli (
        plm_id, ite_id, pli_name, pli_description, pli_status, usr_id_owner,
        created_by, updated_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING pli_id`,
      [
        masterPlanId,
        iteration.ite_id,
        `Instance of Plan ${masterPlanId.toString().substring(0, 8)} for Iteration ${iteration.ite_id.toString().substring(0, 8)}`,
        faker.lorem.sentence(),
        'NOT_STARTED',
        ownerId,
        'data_generator',
        'data_generator'
      ]
    );
    const planInstanceId = pliRes.rows[0].pli_id;

    // Get all sequences for this master plan
    const masterSequences = await client.query(
      'SELECT sqm_id, sqm_name, sqm_description, sqm_order, predecessor_sqm_id FROM sequences_master_sqm WHERE plm_id = $1 ORDER BY sqm_order', 
      [masterPlanId]
    );
    console.log(`  Found ${masterSequences.rows.length} master sequences for plan ${masterPlanId}`);

    for (const masterSequence of masterSequences.rows) {
      // 2. Create Sequence Instance (sqi)
      console.log(`    Creating sequence instance for master sequence ${masterSequence.sqm_id}`);
      
      // Prepare override values for sequence instance
      const sqi_name = shouldOverrideAttribute() ? generateOverrideValue('name') : masterSequence.sqm_name;
      const sqi_description = shouldOverrideAttribute() ? generateOverrideValue('description') : masterSequence.sqm_description;
      const sqi_order = shouldOverrideAttribute() ? generateOverrideValue('order', masterSequence.sqm_order) : masterSequence.sqm_order;
      const predecessor_sqi_id = masterSequence.predecessor_sqm_id; // Keep original predecessor reference

      const sqiRes = await client.query(
        `INSERT INTO sequences_instance_sqi 
          (pli_id, sqm_id, sqi_status, sqi_name, sqi_description, sqi_order, predecessor_sqi_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING sqi_id`,
        [
          planInstanceId, 
          masterSequence.sqm_id, 
          'NOT_STARTED',
          sqi_name,
          sqi_description,
          sqi_order,
          predecessor_sqi_id
        ]
      );
      const sequenceInstanceId = sqiRes.rows[0].sqi_id;

      // Get all phases for this sequence
      const masterPhases = await client.query(
        'SELECT phm_id, phm_name, phm_description, phm_order, predecessor_phm_id FROM phases_master_phm WHERE sqm_id = $1 ORDER BY phm_order', 
        [masterSequence.sqm_id]
      );
      console.log(`      Found ${masterPhases.rows.length} master phases for sequence ${masterSequence.sqm_id}`);

      for (const masterPhase of masterPhases.rows) {
        // 3. Create Phase Instance (phi)
        console.log(`        Creating phase instance for master phase ${masterPhase.phm_id}`);
        
        // Prepare override values for phase instance
        const phi_name = shouldOverrideAttribute() ? generateOverrideValue('name') : masterPhase.phm_name;
        const phi_description = shouldOverrideAttribute() ? generateOverrideValue('description') : masterPhase.phm_description;
        const phi_order = shouldOverrideAttribute() ? generateOverrideValue('order', masterPhase.phm_order) : masterPhase.phm_order;
        const predecessor_phi_id = masterPhase.predecessor_phm_id; // Keep original predecessor reference

        const phiRes = await client.query(
          `INSERT INTO phases_instance_phi 
            (sqi_id, phm_id, phi_status, phi_name, phi_description, phi_order, predecessor_phi_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING phi_id`,
          [
            sequenceInstanceId, 
            masterPhase.phm_id, 
            'NOT_STARTED',
            phi_name,
            phi_description,
            phi_order,
            predecessor_phi_id
          ]
        );
        const phaseInstanceId = phiRes.rows[0].phi_id;

        // Get all steps for this phase
        const masterSteps = await client.query(
          'SELECT stm_id, stm_name, stm_description, stm_duration_minutes, stm_id_predecessor, enr_id_target FROM steps_master_stm WHERE phm_id = $1 ORDER BY stm_number', 
          [masterPhase.phm_id]
        );
        console.log(`          Found ${masterSteps.rows.length} master steps for phase ${masterPhase.phm_id}`);

        for (const masterStep of masterSteps.rows) {
          // 4. Create Step Instance (sti)
          console.log(`            Creating step instance for master step ${masterStep.stm_id}`);
          
          // Prepare override values for step instance
          const sti_name = shouldOverrideAttribute() ? generateOverrideValue('name') : masterStep.stm_name;
          const sti_description = shouldOverrideAttribute() ? generateOverrideValue('description') : masterStep.stm_description;
          const sti_duration_minutes = shouldOverrideAttribute() ? generateOverrideValue('duration') : masterStep.stm_duration_minutes;
          const sti_id_predecessor = masterStep.stm_id_predecessor; // Keep original predecessor reference
          
          // Handle enr_id_target type mismatch: master has INTEGER, instance expects UUID
          // The schema has a mismatch - master.enr_id_target is INTEGER but instance.enr_id_target is UUID
          // Since these reference different things, set to null and let application use master value
          const enr_id_target = null;

          const stiRes = await client.query(
            `INSERT INTO steps_instance_sti (
              phi_id, stm_id, sti_status, 
              sti_name, sti_description, sti_duration_minutes, 
              sti_id_predecessor, enr_id_target, usr_id_owner, usr_id_assignee
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING sti_id`,
            [
              phaseInstanceId, 
              masterStep.stm_id, 
              'NOT_STARTED',
              sti_name,
              sti_description,
              sti_duration_minutes,
              sti_id_predecessor,
              enr_id_target,
              ownerId, // usr_id_owner
              ownerId  // usr_id_assignee (same as owner for now)
            ]
          );
          const stepInstanceId = stiRes.rows[0].sti_id;

          // 5. Create Instruction Instances (ini) for this step
          const masterInstructions = await client.query(
            'SELECT inm_id, inm_order, inm_body, inm_duration_minutes, tms_id, ctm_id FROM instructions_master_inm WHERE stm_id = $1 ORDER BY inm_order', 
            [masterStep.stm_id]
          );
          console.log(`              Found ${masterInstructions.rows.length} master instructions for step ${masterStep.stm_id}`);

          for (const masterInstruction of masterInstructions.rows) {
            // Prepare override values for instruction instance
            const ini_order = shouldOverrideAttribute() ? generateOverrideValue('order', masterInstruction.inm_order) : masterInstruction.inm_order;
            const ini_body = shouldOverrideAttribute() ? generateOverrideValue('description') : masterInstruction.inm_body;
            const ini_duration_minutes = shouldOverrideAttribute() ? generateOverrideValue('duration') : masterInstruction.inm_duration_minutes;
            // Copy tms_id directly from master instruction (both INTEGER now)
            const tms_id = masterInstruction.tms_id;
            const cti_id = masterInstruction.ctm_id; // Keep original control reference (both UUID)
            
            try {
              await client.query(
                `INSERT INTO instructions_instance_ini (
                  sti_id, inm_id, ini_is_completed, 
                  tms_id, cti_id, ini_order, ini_body, ini_duration_minutes
                )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  stepInstanceId, 
                  masterInstruction.inm_id, 
                  false, // ini_is_completed
                  tms_id,
                  cti_id,
                  ini_order,
                  ini_body,
                  ini_duration_minutes
                ]
              );
            } catch (error) {
              console.error(`                ❌ Failed to create instruction instance: ${error.message}`);
              throw error;
            }
          }
        }

        // 6. Create Control Instances (cti) for this phase
        // Controls are linked to phases, not individual steps
        const masterControls = await client.query(
          'SELECT ctm_id, ctm_order, ctm_name, ctm_description, ctm_type, ctm_is_critical, ctm_code FROM controls_master_ctm WHERE phm_id = $1 ORDER BY ctm_order', 
          [masterPhase.phm_id]
        );
        console.log(`          Found ${masterControls.rows.length} master controls for phase ${masterPhase.phm_id}`);

        // For each control, create instances for each step in this phase
        const stepInstancesInPhase = await client.query('SELECT sti_id FROM steps_instance_sti WHERE phi_id = $1', [phaseInstanceId]);
        for (const stepInstanceResult of stepInstancesInPhase.rows) {
          const stepInstanceId = stepInstanceResult.sti_id;
          
          for (const masterControl of masterControls.rows) {
            // Prepare override values for control instance
            const cti_order = shouldOverrideAttribute() ? generateOverrideValue('order', masterControl.ctm_order) : masterControl.ctm_order;
            const cti_name = shouldOverrideAttribute() ? generateOverrideValue('name') : masterControl.ctm_name;
            const cti_description = shouldOverrideAttribute() ? generateOverrideValue('description') : masterControl.ctm_description;
            const cti_type = shouldOverrideAttribute() ? generateOverrideValue('type') : masterControl.ctm_type;
            const cti_is_critical = shouldOverrideAttribute() ? generateOverrideValue('boolean') : masterControl.ctm_is_critical;
            const cti_code = shouldOverrideAttribute() ? generateOverrideValue('code') : masterControl.ctm_code;
            
            await client.query(
              `INSERT INTO controls_instance_cti (
                sti_id, ctm_id, cti_status,
                cti_order, cti_name, cti_description,
                cti_type, cti_is_critical, cti_code
              )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                stepInstanceId, 
                masterControl.ctm_id, 
                'PENDING',
                cti_order,
                cti_name,
                cti_description,
                cti_type,
                cti_is_critical,
                cti_code
              ]
            );
          }
        }
      }
    }
  }
  console.log('Finished generating instance data.');
}

export { generateInstanceData, eraseInstanceDataTables };