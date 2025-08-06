import { faker } from '../lib/utils.js';
import { client } from '../lib/db.js';

async function eraseCanonicalPlanTables(client) {
  console.log('Erasing canonical plan tables...');
  try {
    // The tables are truncated in reverse order of dependency
    await client.query('TRUNCATE TABLE "steps_master_stm_x_teams_tms_impacted" RESTART IDENTITY CASCADE');
    console.log('  - Table steps_master_stm_x_teams_tms_impacted truncated.');
    await client.query('TRUNCATE TABLE "steps_master_stm_x_iteration_types_itt" RESTART IDENTITY CASCADE');
    console.log('  - Table steps_master_stm_x_iteration_types_itt truncated.');
    await client.query('TRUNCATE TABLE "steps_master_stm" RESTART IDENTITY CASCADE');
    console.log('  - Table steps_master_stm truncated.');
    await client.query('TRUNCATE TABLE "phases_master_phm" RESTART IDENTITY CASCADE');
    console.log('  - Table phases_master_phm truncated.');
    await client.query('TRUNCATE TABLE "sequences_master_sqm" RESTART IDENTITY CASCADE');
    console.log('  - Table sequences_master_sqm truncated.');
    await client.query('TRUNCATE TABLE "plans_master_plm" RESTART IDENTITY CASCADE');
    console.log('  - Table plans_master_plm truncated.');
    console.log('Finished erasing canonical plan tables.');
  } catch (error) {
    console.error(`Error erasing canonical plan tables: ${error}`);
    throw error;
  }
}

async function generateCanonicalPlans(config, options = {}) {
  const dbClient = options.clientOverride || client;

  if (options.erase) {
    await eraseCanonicalPlanTables(dbClient);
  }

  console.log('Generating canonical plans with full hierarchy...');

  const teams = await dbClient.query('SELECT tms_id FROM teams_tms');
  const stepTypes = await dbClient.query('SELECT stt_code FROM step_types_stt');
  const envRoles = await dbClient.query('SELECT enr_id FROM environment_roles_enr');
  const iterationTypes = await dbClient.query('SELECT itt_code FROM iteration_types_itt');

  // Fetch available statuses from status_sts table
  const planStatusesResult = await dbClient.query('SELECT sts_id, sts_name FROM status_sts WHERE sts_type = $1', ['Plan']);
  const planStatusIds = planStatusesResult.rows.map(row => row.sts_id);

  if (teams.rows.length === 0 || stepTypes.rows.length === 0 || envRoles.rows.length === 0 || iterationTypes.rows.length === 0 || planStatusIds.length === 0) {
    throw new Error('Cannot generate plans: Missing master data (teams, step types, environment roles, iteration types, or plan statuses).');
  }

  for (let i = 0; i < config.CANONICAL_PLANS.PER_MIGRATION * config.MIGRATIONS.COUNT; i++) {
    const teamId = faker.helpers.arrayElement(teams.rows).tms_id;

    const planRes = await dbClient.query(
      'INSERT INTO plans_master_plm (tms_id, plm_name, plm_description, plm_status, created_by, created_at, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING plm_id',
      [teamId, `Canonical Plan ${i + 1}`, faker.lorem.sentence(), faker.helpers.arrayElement(planStatusIds), 'generator', new Date(), 'generator', new Date()]
    );
    const plmId = planRes.rows[0].plm_id;

    const numSequences = faker.number.int({ min: 2, max: 4 });
    for (let j = 0; j < numSequences; j++) {
      const seqRes = await dbClient.query(
        'INSERT INTO sequences_master_sqm (plm_id, sqm_order, sqm_name, sqm_description, created_by, created_at, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING sqm_id',
        [plmId, j + 1, `Sequence ${j + 1}: ${faker.lorem.words(3)}`, faker.lorem.sentence(), 'generator', new Date(), 'generator', new Date()]
      );
      const sqmId = seqRes.rows[0].sqm_id;

      const numPhases = faker.number.int({ min: 2, max: 5 });
      for (let k = 0; k < numPhases; k++) {
        const phaseRes = await dbClient.query(
          'INSERT INTO phases_master_phm (sqm_id, phm_order, phm_name, phm_description, created_by, created_at, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING phm_id',
          [sqmId, k + 1, `Phase ${k + 1}: ${faker.lorem.words(4)}`, faker.lorem.sentence(), 'generator', new Date(), 'generator', new Date()]
        );
        const phmId = phaseRes.rows[0].phm_id;

        const numSteps = faker.number.int({ min: 3, max: 8 });
        for (let l = 0; l < numSteps; l++) {
          const ownerTeamId = faker.helpers.arrayElement(teams.rows).tms_id;
          const targetEnvRoleId = faker.helpers.arrayElement(envRoles.rows).enr_id;
          const stepRes = await dbClient.query(
            'INSERT INTO steps_master_stm (phm_id, tms_id_owner, stt_code, stm_number, enr_id_target, enr_id, stm_name, stm_description, stm_duration_minutes, created_by, created_at, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING stm_id',
            [
              phmId,
              ownerTeamId,
              faker.helpers.arrayElement(stepTypes.rows).stt_code,
              l + 1,
              targetEnvRoleId,
              faker.helpers.arrayElement(envRoles.rows).enr_id, // Add enr_id column
              `Step ${l + 1}: ${faker.lorem.words(5)}`,
              faker.lorem.paragraph(),
              faker.number.int({ min: 5, max: 120 }),
              'generator',
              new Date(),
              'generator',
              new Date()
            ]
          );
          const stmId = stepRes.rows[0].stm_id;

          // Link step to impacted teams
          const numImpactedTeams = faker.number.int({ min: 1, max: 3 });
          if (teams.rows.length > 0) {
            const impactedTeams = faker.helpers.arrayElements(teams.rows, numImpactedTeams);
            for (const team of impactedTeams) {
              await dbClient.query(
                'INSERT INTO steps_master_stm_x_teams_tms_impacted (stm_id, tms_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [stmId, team.tms_id]
              );
            }
          }

          // Link step to iteration types
          const numIterationTypes = faker.number.int({ min: 1, max: 2 });
          if (iterationTypes.rows.length > 0) {
                        const iterationTypesToLink = faker.helpers.arrayElements(iterationTypes.rows, numIterationTypes);
            for (const itt of iterationTypesToLink) {
              await dbClient.query(
                'INSERT INTO steps_master_stm_x_iteration_types_itt (stm_id, itt_code) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [stmId, itt.itt_code]
              );
            }
          }
        }
      }
    }
  }
  console.log('Finished generating canonical plans.');
}

export { generateCanonicalPlans, eraseCanonicalPlanTables };
