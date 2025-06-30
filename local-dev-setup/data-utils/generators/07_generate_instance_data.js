const { faker } = require('../lib/utils');

/**
 * Truncates all tables related to instance data and audit logs.
 * @param {object} dbClient - The PostgreSQL client.
 */
async function resetInstanceDataTables(dbClient) {
  console.log('Resetting instance data and audit log tables...');
  try {
    // Truncating `plans_instance_pli` will cascade to all other instance tables.
    await dbClient.query('TRUNCATE TABLE "plans_instance_pli" RESTART IDENTITY CASCADE');
    console.log('  - Table plans_instance_pli truncated (cascading to all children).');

    // The audit log must be cleared separately.
    await dbClient.query('TRUNCATE TABLE "audit_log_aud" RESTART IDENTITY CASCADE');
    console.log('  - Table audit_log_aud truncated.');

    console.log('Finished resetting instance data tables.');
  } catch (error) {
    console.error(`Error resetting instance data tables: ${error}`);
    throw error;
  }
}

/**
 * Generates instance data for each canonical implementation plan, simulating a real migration run.
 * @param {object} config - The main configuration object.
 * @param {object} options - Command line options, e.g., { reset: true, clientOverride: dbClient }.
 */
async function generateInstanceData(config, options = {}) {
  // This pattern allows the function to be used in tests (with clientOverride)
  // and as a standalone script (which will require the db client itself).
  const dbClient = options.clientOverride || require('../lib/db').client;

  if (options.reset) {
    await resetInstanceDataTables(dbClient);
  }
  console.log(`Generating instance data for all iterations and plans...`);

  try {
    // Fetch all master plans, iterations, and users
    const plansRes = await dbClient.query('SELECT plm_id, plm_name FROM plans_master_plm');
    const masterPlans = plansRes.rows;

    const iterationsRes = await dbClient.query('SELECT ite_id, ite_name, itt_code FROM iterations_ite');
    const iterations = iterationsRes.rows;

    const usersRes = await dbClient.query('SELECT usr_id FROM users_usr');
    const userIds = usersRes.rows.map(r => r.usr_id);

    const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED'];

    if (masterPlans.length === 0) {
      throw new Error('Cannot generate instance data without master plans.');
    }
    if (iterations.length === 0) {
      throw new Error('Cannot generate instance data without iterations.');
    }
    if (userIds.length === 0) {
      throw new Error('Cannot generate instance data without users.');
    }

    // For each iteration, create two instances (ACTIVE and DRAFT) of the single master plan.
    const masterPlan = masterPlans[0]; // There is only one master plan now.

    for (const iteration of iterations) {
      // --- Create the ACTIVE instance with a full hierarchy ---
      const activePliName = `${masterPlan.plm_name} - ${iteration.ite_name} (Active)`;
      const activeDescription = `Active instance of plan '${masterPlan.plm_name}' for the ${iteration.itt_code} iteration '${iteration.ite_name}'.`;
      const activePliRes = await dbClient.query(
        `INSERT INTO plans_instance_pli (plm_id, ite_id, pli_name, pli_description, pli_status, usr_id_owner)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING pli_id`,
        [masterPlan.plm_id, iteration.ite_id, activePliName, activeDescription, 'ACTIVE', faker.helpers.arrayElement(userIds)]
      );
      const activePliId = activePliRes.rows[0].pli_id;
      await logAudit(dbClient, activePliId, 'plan_instance', userIds[0], 'CREATED', { status: 'ACTIVE' });

      // Generate the full instance hierarchy for the ACTIVE plan
      const seqMasterRes = await dbClient.query('SELECT sqm_id FROM sequences_master_sqm WHERE plm_id = $1', [masterPlan.plm_id]);
      for (const seqMaster of seqMasterRes.rows) {
        const sqiRes = await dbClient.query(`INSERT INTO sequences_instance_sqi (pli_id, sqm_id, sqi_status) VALUES ($1, $2, 'IN_PROGRESS') RETURNING sqi_id`, [activePliId, seqMaster.sqm_id]);
        const sqiId = sqiRes.rows[0].sqi_id;

        const phaseMasterRes = await dbClient.query('SELECT phm_id FROM phases_master_phm WHERE sqm_id = $1', [seqMaster.sqm_id]);
        for (const phaseMaster of phaseMasterRes.rows) {
          const phiRes = await dbClient.query(`INSERT INTO phases_instance_phi (sqi_id, phm_id, phi_status) VALUES ($1, $2, 'IN_PROGRESS') RETURNING phi_id`, [sqiId, phaseMaster.phm_id]);
          const phiId = phiRes.rows[0].phi_id;

          const stepMasterRes = await dbClient.query('SELECT stm_id FROM steps_master_stm WHERE phm_id = $1', [phaseMaster.phm_id]);
          for (const stepMaster of stepMasterRes.rows) {
            const randomStatus = faker.helpers.arrayElement(statuses);
            const stiRes = await dbClient.query(`INSERT INTO steps_instance_sti (phi_id, stm_id, sti_status, usr_id_assignee) VALUES ($1, $2, $3, $4) RETURNING sti_id`, [phiId, stepMaster.stm_id, randomStatus, faker.helpers.arrayElement(userIds)]);
            const stiId = stiRes.rows[0].sti_id;
            await logAudit(dbClient, stiId, 'step_instance', userIds[0], 'STATUS_CHANGED', { new_status: randomStatus });
          }
        }
      }

      // --- Create the DRAFT instance (hierarchy not needed) ---
      const draftPliName = `${masterPlan.plm_name} - ${iteration.ite_name} (Draft)`;
      const draftDescription = `Draft instance of plan '${masterPlan.plm_name}' for the ${iteration.itt_code} iteration '${iteration.ite_name}'.`;
      const draftPliRes = await dbClient.query(
        `INSERT INTO plans_instance_pli (plm_id, ite_id, pli_name, pli_description, pli_status, usr_id_owner)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING pli_id`,
        [masterPlan.plm_id, iteration.ite_id, draftPliName, draftDescription, 'DRAFT', faker.helpers.arrayElement(userIds)]
      );
      const draftPliId = draftPliRes.rows[0].pli_id;
      await logAudit(dbClient, draftPliId, 'plan_instance', userIds[0], 'CREATED', { status: 'DRAFT' });
    }

    console.log('Finished generating instance and audit data.');
  } catch (error) {
    console.error('Error generating instance data:', error);
    throw error;
  }
}

/**
 * Helper to log an audit entry.
 * @param {object} dbClient - The PostgreSQL client.
 * @param {string} entityId - The UUID of the entity being logged.
 * @param {string} entityType - The type of the entity (e.g., 'step_instance').
 * @param {string} userId - The UUID of the user performing the action.
 * @param {string} action - The action being performed.
 * @param {object} details - A JSONB object with additional details.
 */
async function logAudit(dbClient, entityId, entityType, userId, action, details) {
  await dbClient.query(
    `INSERT INTO audit_log_aud (aud_entity_id, aud_entity_type, usr_id, aud_action, aud_details)
     VALUES ($1, $2, $3, $4, $5)`,
    [entityId, entityType, userId, action, JSON.stringify(details)]
  );
}

module.exports = { generateInstanceData };