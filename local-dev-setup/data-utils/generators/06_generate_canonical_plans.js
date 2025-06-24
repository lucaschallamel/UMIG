const { client } = require('../lib/db');
const { faker } = require('../lib/utils');

/**
 * Generates a complete canonical implementation plan with all its components.
 * @param {object} config - The main configuration object.
 */
async function generateCanonicalPlans(config) {
  console.log(`Generating ${config.num_canonical_plans} canonical implementation plans...`);

  try {
    const teamsRes = await client.query('SELECT id FROM teams_tms');
    const teamIds = teamsRes.rows.map(r => r.id);
    if (teamIds.length === 0) {
      throw new Error('Cannot generate canonical plans without teams to assign as owners.');
    }

    for (let i = 0; i < config.num_canonical_plans; i++) {
      const planRes = await client.query(
        `INSERT INTO implementation_plans_canonical_ipc (ipc_name, ipc_description, ipc_owner_team_id, ipc_status, created_by, updated_by)
         VALUES ($1, $2, $3, 'DRAFT', 'data_generator', 'data_generator') RETURNING ipc_id`,
        [
          `Canonical Plan ${faker.company.buzzPhrase()}`,
          faker.lorem.paragraph(),
          faker.helpers.arrayElement(teamIds)
        ]
      );
      const ipcId = planRes.rows[0].ipc_id;

      let predecessorSqmId = null;
      for (let j = 0; j < 3; j++) { // 3 sequences per plan
        const seqRes = await client.query(
          `INSERT INTO sequences_master_sqm (ipc_id, sequence_order, sqm_name, sqm_description, predecessor_sqm_id)
           VALUES ($1, $2, $3, $4, $5) RETURNING sqm_id`,
          [ipcId, j + 1, `Sequence ${faker.word.noun()}`, faker.lorem.sentence(), predecessorSqmId]
        );
        const sqmId = seqRes.rows[0].sqm_id;
        predecessorSqmId = sqmId;

        let predecessorChmId = null;
        for (let k = 0; k < 2; k++) { // 2 chapters per sequence
          const chapRes = await client.query(
            `INSERT INTO chapters_master_chm (sqm_id, chapter_order, name, description, predecessor_chm_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING chm_id`,
            [sqmId, k + 1, `Chapter ${faker.commerce.productName()}`, faker.lorem.sentence(), predecessorChmId]
          );
          const chmId = chapRes.rows[0].chm_id;
          predecessorChmId = chmId;

          let predecessorStmId = null;
          for (let l = 0; l < 5; l++) { // 5 steps per chapter
            const stepRes = await client.query(
              `INSERT INTO steps_master_stm (chm_id, step_order, name, description, type, predecessor_stm_id)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING stm_id`,
              [chmId, l + 1, `Step ${faker.hacker.verb()}`, faker.lorem.paragraph(), faker.helpers.arrayElement(['MANUAL', 'AUTOMATED', 'VALIDATION']), predecessorStmId]
            );
            const stmId = stepRes.rows[0].stm_id;
            predecessorStmId = stmId;

            let predecessorInmId = null;
            for (let m = 0; m < 2; m++) { // 2 instructions per step
              const insRes = await client.query(
                `INSERT INTO instructions_master_inm (stm_id, instruction_order, title, body, format, duration_min, predecessor_inm_id)
                 VALUES ($1, $2, $3, $4, 'markdown', $5, $6) RETURNING inm_id`,
                [stmId, m + 1, `Instruction: ${faker.hacker.phrase()}`, faker.lorem.paragraphs(2), faker.number.int({ min: 5, max: 60 }), predecessorInmId]
              );
              predecessorInmId = insRes.rows[0].inm_id;
            }

            let predecessorCtlId = null;
            for (let n = 0; n < 1; n++) { // 1 control per step
              const ctlRes = await client.query(
                `INSERT INTO controls_master_ctl (stm_id, control_order, name, description, type, critical, predecessor_ctl_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ctl_id`,
                [stmId, n + 1, `Control: ${faker.commerce.productAdjective()} Check`, faker.lorem.sentence(), faker.helpers.arrayElement(['QUALITY', 'COMPLETENESS', 'SECURITY']), faker.datatype.boolean(), predecessorCtlId]
              );
              predecessorCtlId = ctlRes.rows[0].ctl_id;
            }
          }
        }
      }
    }
    console.log('Finished generating canonical implementation plans.');
  } catch (error) {
    console.error('Error generating canonical plans:', error);
    throw error;
  }
}

module.exports = { generateCanonicalPlans };