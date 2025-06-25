const { client } = require('../lib/db');
const { faker } = require('../lib/utils');

/**
 * Generates instance data for each canonical implementation plan, simulating a real migration run.
 * @param {object} config - The main configuration object.
 */
async function generateInstanceData(config) {
  console.log(`Generating instance data for all iterations and plans...`);

  try {
    // Fetch all master plans, iterations, and users
    const plansRes = await client.query('SELECT plm_id FROM plans_master_plm');
    const masterPlanIds = plansRes.rows.map(r => r.plm_id);

    const iterationsRes = await client.query('SELECT ite_id FROM iterations_ite');
    const iterationIds = iterationsRes.rows.map(r => r.ite_id);

    const usersRes = await client.query('SELECT usr_id FROM users_usr');
    const userIds = usersRes.rows.map(r => r.usr_id);

    const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED'];

    if (masterPlanIds.length === 0) {
      throw new Error('Cannot generate instance data without master plans.');
    }
    if (iterationIds.length === 0) {
      throw new Error('Cannot generate instance data without iterations.');
    }
    if (userIds.length === 0) {
      throw new Error('Cannot generate instance data without users.');
    }

    // For each iteration, create an instance of every master plan
    for (const iteId of iterationIds) {
      for (const plmId of masterPlanIds) {
        // 1. Create a Plan Instance from the master plan for this iteration
        const pliRes = await client.query(
          `INSERT INTO plans_instance_pli (plm_id, ite_id, pli_status, usr_id_owner)
           VALUES ($1, $2, 'IN_PROGRESS', $3) RETURNING pli_id`,
          [plmId, iteId, faker.helpers.arrayElement(userIds)]
        );
        const pliId = pliRes.rows[0].pli_id;
        await logAudit(pliId, 'plan_instance', userIds[0], 'CREATED', { master_plan_id: plmId, iteration_id: iteId });

        // 2. Get all sequences for the master plan
        const seqMasterRes = await client.query('SELECT sqm_id FROM sequences_master_sqm WHERE plm_id = $1', [plmId]);
        for (const seqMaster of seqMasterRes.rows) {
          const sqiRes = await client.query(
            `INSERT INTO sequences_instance_sqi (pli_id, sqm_id, sqi_status) VALUES ($1, $2, 'IN_PROGRESS') RETURNING sqi_id`,
            [pliId, seqMaster.sqm_id]
          );
          const sqiId = sqiRes.rows[0].sqi_id;

          // 3. Get all phases for the sequence
          const phaseMasterRes = await client.query('SELECT phm_id FROM phases_master_phm WHERE sqm_id = $1', [seqMaster.sqm_id]);
          for (const phaseMaster of phaseMasterRes.rows) {
            const phiRes = await client.query(
              `INSERT INTO phases_instance_phi (sqi_id, phm_id, phi_status) VALUES ($1, $2, 'IN_PROGRESS') RETURNING phi_id`,
              [sqiId, phaseMaster.phm_id]
            );
            const phiId = phiRes.rows[0].phi_id;

            // 4. Get all steps for the phase
            const stepMasterRes = await client.query('SELECT stm_id FROM steps_master_stm WHERE phm_id = $1', [phaseMaster.phm_id]);
            for (const stepMaster of stepMasterRes.rows) {
              const randomStatus = faker.helpers.arrayElement(statuses);
              const stiRes = await client.query(
                `INSERT INTO steps_instance_sti (phi_id, stm_id, sti_status, usr_id_assignee, sti_comment)
                 VALUES ($1, $2, $3, $4, $5) RETURNING sti_id`,
                [phiId, stepMaster.stm_id, randomStatus, faker.helpers.arrayElement(userIds), faker.lorem.sentence()]
              );
              const stiId = stiRes.rows[0].sti_id;

              // Log the status change for the step
              await logAudit(stiId, 'step_instance', userIds[0], 'STATUS_CHANGED', { new_status: randomStatus });
            }
          }
        }
      }
    }

    console.log('Finished generating instance and audit data.');
  } catch (error) {
    console.error('Error generating instance data:', error);
    throw error;
  }
}

/**
 * Helper to log an audit entry.
 * @param {string} entityId - The UUID of the entity being logged.
 * @param {string} entityType - The type of the entity (e.g., 'step_instance').
 * @param {string} userId - The UUID of the user performing the action.
 * @param {string} action - The action being performed.
 * @param {object} details - A JSONB object with additional details.
 */
async function logAudit(entityId, entityType, userId, action, details) {
  await client.query(
    `INSERT INTO audit_log_aud (aud_entity_id, aud_entity_type, usr_id, aud_action, aud_details)
     VALUES ($1, $2, $3, $4, $5)`,
    [entityId, entityType, userId, action, JSON.stringify(details)]
  );
}

module.exports = { generateInstanceData };