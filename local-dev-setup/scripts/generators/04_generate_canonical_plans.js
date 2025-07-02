import { faker } from '@faker-js/faker';
import { client } from '../lib/db.js';

async function eraseCanonicalPlanTables(client) {
  console.log('Erasing canonical plan tables...');
  try {
    // The tables are truncated in reverse order of dependency
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
  if (options.erase) {
    await eraseCanonicalPlanTables(client);
  }

  console.log('Generating canonical plans with full hierarchy...');

  const teams = await client.query('SELECT tms_id FROM teams_tms');
  const stepTypes = await client.query('SELECT stt_code FROM step_types_stt');
  const envRoles = await client.query('SELECT enr_id FROM environment_roles_enr');

  if (teams.rows.length === 0 || stepTypes.rows.length === 0 || envRoles.rows.length === 0) {
    console.error('Cannot generate plans: Missing master data (teams, step types, or environment roles).');
    return;
  }

  for (let i = 0; i < config.CANONICAL_PLANS.PER_MIGRATION * config.MIGRATIONS.COUNT; i++) {
    const teamId = faker.helpers.arrayElement(teams.rows).tms_id;

    const planRes = await client.query(
      'INSERT INTO plans_master_plm (tms_id, plm_name, plm_description, plm_status) VALUES ($1, $2, $3, $4) RETURNING plm_id',
      [teamId, `Canonical Plan ${i + 1}`, faker.lorem.sentence(), faker.helpers.arrayElement(['DRAFT', 'ACTIVE'])]
    );
    const plmId = planRes.rows[0].plm_id;

    const numSequences = faker.number.int({ min: 2, max: 4 });
    for (let j = 0; j < numSequences; j++) {
      const seqRes = await client.query(
        'INSERT INTO sequences_master_sqm (plm_id, sqm_order, sqm_name, sqm_description) VALUES ($1, $2, $3, $4) RETURNING sqm_id',
        [plmId, j + 1, `Sequence ${j + 1}: ${faker.lorem.words(3)}`, faker.lorem.sentence()]
      );
      const sqmId = seqRes.rows[0].sqm_id;

      const numPhases = faker.number.int({ min: 2, max: 5 });
      for (let k = 0; k < numPhases; k++) {
        const phaseRes = await client.query(
          'INSERT INTO phases_master_phm (sqm_id, phm_order, phm_name, phm_description) VALUES ($1, $2, $3, $4) RETURNING phm_id',
          [sqmId, k + 1, `Phase ${k + 1}: ${faker.lorem.words(4)}`, faker.lorem.sentence()]
        );
        const phmId = phaseRes.rows[0].phm_id;

        const numSteps = faker.number.int({ min: 3, max: 8 });
        for (let l = 0; l < numSteps; l++) {
          const ownerTeamId = faker.helpers.arrayElement(teams.rows).tms_id;
          const targetEnvRoleId = faker.helpers.arrayElement(envRoles.rows).enr_id;
          await client.query(
            'INSERT INTO steps_master_stm (phm_id, tms_id_owner, stt_code, stm_number, enr_id_target, stm_name, stm_description, stm_duration_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [
              phmId,
              ownerTeamId,
              faker.helpers.arrayElement(stepTypes.rows).stt_code,
              l + 1,
              targetEnvRoleId,
              `Step ${l + 1}: ${faker.lorem.words(5)}`,
              faker.lorem.paragraph(),
              faker.number.int({ min: 5, max: 120 }),
            ]
          );
        }
      }
    }
  }
  console.log('Finished generating canonical plans.');
}

export { generateCanonicalPlans, eraseCanonicalPlanTables };
