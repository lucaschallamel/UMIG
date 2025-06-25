const { client } = require('../lib/db');
const { faker } = require('../lib/utils');

/**
 * Truncates all tables related to canonical plans and their components.
 * @param {object} client - The PostgreSQL client.
 */
async function resetCanonicalPlansTables(client) {
  console.log('Resetting canonical plan tables...');
  try {
    // Truncating `plans_master_plm` with CASCADE will clear the entire hierarchy:
    // sequences, phases, controls, steps, instructions, and all related link tables.
    await client.query('TRUNCATE TABLE "plans_master_plm" RESTART IDENTITY CASCADE');
    console.log('  - Table plans_master_plm truncated (cascading to all children).');
    console.log('Finished resetting canonical plan tables.');
  } catch (error) {
    console.error(`Error resetting canonical plan tables: ${error}`);
    throw error;
  }
}

/**
 * Generates a complete canonical implementation plan with all its components.
 * @param {object} config - The main configuration object.
 * @param {object} options - Command line options, e.g., { reset: true }.
 */
async function generateCanonicalPlans(config, options = {}) {
  if (options.reset) {
    await resetCanonicalPlansTables(client);
  }
  console.log('Generating 1 canonical implementation plan...');

  try {
    const teamsRes = await client.query('SELECT tms_id FROM teams_tms');
    const teamIds = teamsRes.rows.map(r => r.tms_id);
    if (teamIds.length === 0) {
      throw new Error('Cannot generate canonical plans without teams to assign as owners.');
    }

    const envRolesRes = await client.query('SELECT enr_id FROM environment_roles_enr');
    const envRoleIds = envRolesRes.rows.map(r => r.enr_id);
    if (envRoleIds.length === 0) {
        throw new Error('Environment roles (PROD, TEST, BACKUP) not found.');
    }

    const stepTypesRes = await client.query('SELECT stt_code FROM step_types_stt');
    const stepTypeCodes = stepTypesRes.rows.map(r => r.stt_code);
    if (stepTypeCodes.length === 0) {
        throw new Error('Step types (MAN, AUT, etc.) not found.');
    }

    const iterationTypesRes = await client.query('SELECT itt_code FROM iteration_types_itt');
    const iterationTypeCodes = iterationTypesRes.rows.map(r => r.itt_code);
    if (iterationTypeCodes.length === 0) {
        throw new Error('Iteration types (RUN, DR, CUTOVER) not found.');
    }

    // Per user request, generate only one master canonical plan to act as a template.
    for (let i = 0; i < 1; i++) {
      const planRes = await client.query(
        `INSERT INTO plans_master_plm (plm_name, plm_description, tms_id, plm_status, created_by, updated_by)
         VALUES ($1, $2, $3, 'DRAFT', 'data_generator', 'data_generator') RETURNING plm_id`,
        [
          `Canonical Plan ${faker.company.buzzPhrase()}`,
          faker.lorem.paragraph(),
          faker.helpers.arrayElement(teamIds)
        ]
      );
      const plmId = planRes.rows[0].plm_id;

      let predecessorSqmId = null;
      for (let j = 0; j < 3; j++) { // 3 sequences per plan
        const seqRes = await client.query(
          `INSERT INTO sequences_master_sqm (plm_id, sqm_order, sqm_name, sqm_description, predecessor_sqm_id)
           VALUES ($1, $2, $3, $4, $5) RETURNING sqm_id`,
          [plmId, j + 1, `Sequence ${faker.word.noun()}`, faker.lorem.sentence(), predecessorSqmId]
        );
        predecessorSqmId = seqRes.rows[0].sqm_id;
        const sqmId = seqRes.rows[0].sqm_id;

        let predecessorPhmId = null;
        for (let k = 0; k < 2; k++) { // 2 phases per sequence
          const phaseRes = await client.query(
            `INSERT INTO phases_master_phm (sqm_id, phm_order, phm_name, phm_description, predecessor_phm_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING phm_id`,
            [sqmId, k + 1, `Phase ${faker.commerce.productName()}`, faker.lorem.sentence(), predecessorPhmId]
          );
          predecessorPhmId = phaseRes.rows[0].phm_id;
          const phmId = phaseRes.rows[0].phm_id;

          // Generate controls for the phase
          const controlIds = [];
          const numControls = faker.number.int({ min: 1, max: 3 }); // 1-3 controls per phase
          for (let n = 0; n < numControls; n++) {
            const ctlRes = await client.query(
              `INSERT INTO controls_master_ctm (phm_id, ctm_order, ctm_name, ctm_description, ctm_type, ctm_is_critical)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING ctm_id`,
              [
                phmId,
                n + 1,
                `Control: ${faker.commerce.productAdjective()} Check`,
                faker.lorem.sentence(),
                faker.helpers.arrayElement(['QUALITY', 'COMPLETENESS', 'SECURITY']),
                faker.datatype.boolean()
              ]
            );
            controlIds.push(ctlRes.rows[0].ctm_id);
          }

          let predecessorStmId = null;
          for (let l = 0; l < 5; l++) { // 5 steps per phase
            const ownerTeamId = faker.helpers.arrayElement(teamIds);
            const otherTeamIds = teamIds.filter(id => id !== ownerTeamId);

            const stepRes = await client.query(
              `INSERT INTO steps_master_stm (phm_id, tms_id_owner, stt_code, stm_number, stm_name, stm_description, stm_duration_minutes, stm_id_predecessor, enr_id_target)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING stm_id`,
              [
                phmId,
                ownerTeamId,
                faker.helpers.arrayElement(stepTypeCodes),
                l + 1,
                `Step ${faker.hacker.verb()}`,
                faker.lorem.paragraph(),
                faker.number.int({ min: 5, max: 120 }),
                predecessorStmId,
                faker.helpers.arrayElement(envRoleIds)
              ]
            );
            const stmId = stepRes.rows[0].stm_id;
            predecessorStmId = stmId;

            // Associate step with a random subset of iteration types
            const numIteTypes = faker.number.int({ min: 1, max: iterationTypeCodes.length });
            const selectedIteTypes = faker.helpers.arrayElements(iterationTypeCodes, numIteTypes);

            for (const ittCode of selectedIteTypes) {
              await client.query(
                `INSERT INTO steps_master_stm_x_iteration_types_itt (stm_id, itt_code)
                 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [stmId, ittCode]
              );
            }

            // Associate step with a random subset of impacted teams
            if (otherTeamIds.length > 0) {
              const numImpactedTeams = faker.number.int({ min: 0, max: Math.min(3, otherTeamIds.length) });
              const selectedImpactedTeams = faker.helpers.arrayElements(otherTeamIds, numImpactedTeams);

              for (const impactedTmsId of selectedImpactedTeams) {
                await client.query(
                  `INSERT INTO steps_master_stm_x_teams_tms_impacted (stm_id, tms_id)
                   VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                  [stmId, impactedTmsId]
                );
              }
            }

            // Generate instructions for the step
            const numInstructions = faker.number.int({ min: 1, max: 3 }); // 1-3 instructions per step
            for (let m = 0; m < numInstructions; m++) {
              await client.query(
                `INSERT INTO instructions_master_inm (stm_id, tms_id, ctm_id, inm_order, inm_body, inm_duration_minutes)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  stmId,
                  faker.helpers.arrayElement(teamIds),
                  faker.helpers.arrayElement([null, ...controlIds]), // Can be unassigned
                  m + 1,
                  faker.lorem.paragraphs(2),
                  faker.number.int({ min: 5, max: 60 })
                ]
              );
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
