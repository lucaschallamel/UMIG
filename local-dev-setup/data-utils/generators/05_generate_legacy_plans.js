const { client } = require('../lib/db');
const { faker, SEQUENCE_NAMES, getSequenceWindows, randomDateInRange } = require('../lib/utils');

async function generateLegacyControls(client, config) {
  console.log(`Generating ${config.num_controls} legacy controls...`);
  const teamsRes = await client.query('SELECT id FROM teams_tms');
  const teams = teamsRes.rows;
  if (teams.length < 1) {
    throw new Error('No teams found for control assignment.');
  }
  for (let i = 1; i <= config.num_controls; i++) {
    const ctl_code = `C${String(i).padStart(4, '0')}`;
    await client.query(
      `INSERT INTO controls_ctl (ctl_code, ctl_name, ctl_producer, ctl_it_validator, ctl_biz_validator, ctl_it_comments, ctl_biz_comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (ctl_code) DO NOTHING`,
      [
        ctl_code,
        'Control of ' + faker.lorem.sentence(4),
        faker.helpers.arrayElement(teams).id,
        faker.helpers.arrayElement(teams).id,
        faker.helpers.arrayElement(teams).id,
        faker.lorem.sentence(),
        faker.lorem.sentence()
      ]
    );
  }
  console.log('Finished generating legacy controls.');
}

async function generateLegacyPlans(config) {
  console.log('Generating legacy implementation plans...');
  try {
    // Fetch data needed for FK relationships
    const sttRes = await client.query('SELECT id FROM step_type_stt');
    const stepTypeIds = sttRes.rows.map(r => r.id);
    if (stepTypeIds.length === 0) throw new Error('No step_type_stt found.');

    const teamsRes = await client.query('SELECT id FROM teams_tms');
    const teamIds = teamsRes.rows.map(r => r.id);
    if (teamIds.length === 0) throw new Error('No teams_tms found.');

    const usersRes = await client.query('SELECT id FROM users_usr');
    const userIds = usersRes.rows.map(r => r.id);
    if (userIds.length === 0) throw new Error('No users_usr found.');

    // Generate Migrations -> Iterations -> Sequences -> Chapters -> Steps -> Instructions
    for (let i = 1; i <= config.num_migrations; i++) {
      // Migration config
      const mig_type = config.mig_type;
      const mig_planned_start_date = randomDateInRange(config.mig_start_date_range[0], config.mig_start_date_range[1]);
      const mig_planned_end_date = new Date(mig_planned_start_date);
      mig_planned_end_date.setMonth(mig_planned_end_date.getMonth() + config.mig_duration_months);
      const mig_code = `MIG-${i.toString().padStart(3, '0')}`;
      const mig_name = `Legacy Migration ${i}`;
      const mig_description = faker.lorem.sentence();

      // Insert migration
      const migRes = await client.query(
        `INSERT INTO migrations_mig (mig_code, mig_name, mig_description, mig_planned_start_date, mig_planned_end_date, mty_type)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          mig_code,
          mig_name,
          mig_description,
          mig_planned_start_date,
          mig_planned_end_date,
          mig_type
        ]
      );
      const migId = migRes.rows[0].id;

      // Iterations config
      const runCount = Math.floor(Math.random() * (config.iterations.run.max - config.iterations.run.min + 1)) + config.iterations.run.min;
      const drCount = Math.floor(Math.random() * (config.iterations.dr.max - config.iterations.dr.min + 1)) + config.iterations.dr.min;
      const cutoverCount = config.iterations.cutover;
      const iterationTypes = [
        ...Array(runCount).fill('RUN'),
        ...Array(drCount).fill('DR'),
        ...Array(cutoverCount).fill('CUTOVER')
      ];
      // Shuffle iterationTypes for some randomness
      for (let j = iterationTypes.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [iterationTypes[j], iterationTypes[k]] = [iterationTypes[k], iterationTypes[j]];
      }

      for (let j = 0; j < iterationTypes.length; j++) {
        const iterType = iterationTypes[j];
        const ite_code = `${iterType.slice(0, 3)}-${j + 1}`;
        const ite_name = `${iterType} Iteration ${j + 1} for MIG ${i}`;
        const description = `Auto-generated ${iterType} iteration for migration ${i}`;

        const iterRes = await client.query(
          `INSERT INTO iterations_ite (ite_code, ite_name, ite_type, mig_id, description)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [
            ite_code,
            ite_name,
            iterType,
            migId,
            description
          ]
        );
        const iterId = iterRes.rows[0].id;

        // Insert sequences, chapters, steps, instructions for this iteration
        const seqWindows = getSequenceWindows(mig_planned_start_date, mig_planned_end_date);
        let prevSeqId = null;
        for (let s = 0; s < SEQUENCE_NAMES.length; s++) {
          const seqRes = await client.query(
            `INSERT INTO sequences_sqc (mig_id, ite_id, sqc_name, sqc_order, start_date, end_date, sqc_previous)
             VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (mig_id, ite_id, sqc_order) DO NOTHING RETURNING id`,
            [migId, iterId, SEQUENCE_NAMES[s], s + 1, seqWindows[s].start, seqWindows[s].end, prevSeqId]
          );
          if (seqRes.rows.length === 0) continue;
          const seqId = seqRes.rows[0].id;
          prevSeqId = seqId;

          let prevChaId = null;
          for (let k = 1; k <= 3; k++) { // 3 chapters per sequence
            const cha_code = `CH${seqId}${k}`;
            const chaRes = await client.query(
              `INSERT INTO chapter_cha (cha_code, cha_name, sqc_id, cha_previous) VALUES ($1, $2, $3, $4) RETURNING id`,
              [cha_code, `Chapter ${faker.word.noun()}`, seqId, prevChaId]
            );
            const chaId = chaRes.rows[0].id;
            prevChaId = chaId;

            let prevStpId = null;
            for (let l = 1; l <= 5; l++) { // 5 steps per chapter
              const stpRes = await client.query(
                `INSERT INTO steps_stp (stp_name, cha_id, tms_id, stt_type, stp_previous, stp_description, owner_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [`Step ${faker.word.verb()}`, chaId, faker.helpers.arrayElement(teamIds), faker.helpers.arrayElement(stepTypeIds), prevStpId, faker.lorem.paragraph(), faker.helpers.arrayElement(userIds)]
              );
              const stpId = stpRes.rows[0].id;
              prevStpId = stpId;

              for (let m = 1; m <= 2; m++) { // 2 instructions per step
                const ins_code = `INS${stpId}${m}`;
                await client.query(
                  `INSERT INTO instructions_ins (ins_code, ins_description, stp_id, tms_id) VALUES ($1, $2, $3, $4)`,
                  [ins_code, faker.hacker.phrase(), stpId, faker.helpers.arrayElement(teamIds)]
                );
              }
            }
          }
        }
      }
    }
    await generateLegacyControls(client, config);
    console.log('Finished generating legacy implementation plans.');
  } catch (error) {
    console.error('Error generating legacy plans:', error);
    throw error;
  }
}

module.exports = { generateLegacyPlans };