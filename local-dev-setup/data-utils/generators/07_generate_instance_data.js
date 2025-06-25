const { client } = require('../lib/db');
const { faker } = require('../lib/utils');

/**
 * Generates instance data for each canonical implementation plan, simulating a real migration run.
 * @param {object} config - The main configuration object.
 */
async function generateInstanceData(config) {
  console.log(`Generating instance data for canonical plans...`);

  try {
    const plansRes = await client.query('SELECT ipc_id FROM implementation_plans_canonical_ipc');
    const canonicalPlanIds = plansRes.rows.map(r => r.ipc_id);

    const usersRes = await client.query('SELECT id FROM users_usr');
    const userIds = usersRes.rows.map(r => r.id);

    const statusRes = await client.query('SELECT id, sts_name FROM status_sts');
    const statuses = statusRes.rows;

    if (canonicalPlanIds.length === 0) {
      throw new Error('Cannot generate instance data without canonical plans.');
    }
    if (userIds.length === 0) {
      throw new Error('Cannot generate instance data without users.');
    }

    for (const ipcId of canonicalPlanIds) {
      // 1. Create a Migration Iteration for the plan
      const iterationName = `Iteration ${faker.system.semver()}`;
      const micRes = await client.query(
        `INSERT INTO migration_iterations_mic (ipc_id, name, description, status, created_by)
         VALUES ($1, $2, $3, 'IN_PROGRESS', $4) RETURNING mic_id`,
        [ipcId, iterationName, faker.lorem.sentence(), faker.helpers.arrayElement(userIds)]
      );
      const micId = micRes.rows[0].mic_id;

      // Log the creation of the iteration
      await logAudit(micId, 'migration_iteration', userIds[0], 'CREATED', { name: iterationName });

      // 2. Get all sequences for the canonical plan
      const seqMasterRes = await client.query('SELECT sqm_id FROM sequences_master_sqm WHERE ipc_id = $1', [ipcId]);
      for (const seqMaster of seqMasterRes.rows) {
        const sqiRes = await client.query(
          `INSERT INTO sequences_instance_sqi (mic_id, sqm_id, status) VALUES ($1, $2, 'IN_PROGRESS') RETURNING sqi_id`,
          [micId, seqMaster.sqm_id]
        );
        const sqiId = sqiRes.rows[0].sqi_id;

        // 3. Get all chapters for the sequence
        const chapMasterRes = await client.query('SELECT chm_id FROM chapters_master_chm WHERE sqm_id = $1', [seqMaster.sqm_id]);
        for (const chapMaster of chapMasterRes.rows) {
          const chiRes = await client.query(
            `INSERT INTO chapters_instance_chi (sqi_id, chm_id, status) VALUES ($1, $2, 'IN_PROGRESS') RETURNING chi_id`,
            [sqiId, chapMaster.chm_id]
          );
          const chiId = chiRes.rows[0].chi_id;

          // 4. Get all steps for the chapter
          const stepMasterRes = await client.query('SELECT stm_id FROM steps_master_stm WHERE chm_id = $1', [chapMaster.chm_id]);
          for (const stepMaster of stepMasterRes.rows) {
            const randomStatus = faker.helpers.arrayElement(statuses);
            const stiRes = await client.query(
              `INSERT INTO steps_instance_sti (chi_id, stm_id, status_id, assignee_usr_id, comments)
               VALUES ($1, $2, $3, $4, $5) RETURNING sti_id`,
              [chiId, stepMaster.stm_id, randomStatus.id, faker.helpers.arrayElement(userIds), faker.lorem.sentence()]
            );
            const stiId = stiRes.rows[0].sti_id;

            // Log the status change for the step
            await logAudit(stiId, 'step_instance', userIds[0], 'STATUS_CHANGED', { new_status: randomStatus.sts_name });
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
 * @param {number} userId - The ID of the user performing the action.
 * @param {string} action - The action being performed.
 * @param {object} details - A JSONB object with additional details.
 */
async function logAudit(entityId, entityType, userId, action, details) {
  await client.query(
    `INSERT INTO audit_log_aud (entity_id, entity_type, usr_id, action, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [entityId, entityType, userId, action, JSON.stringify(details)]
  );
}

module.exports = { generateInstanceData };