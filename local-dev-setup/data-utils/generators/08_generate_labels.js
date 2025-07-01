const { faker } = require('../lib/utils');

/**
 * Generates 2-5 labels per migration and randomly associates them with canonical steps.
 * Each label is unique within its migration.
 */
async function generateLabels(config, options = {}) {
  const { clientOverride: client } = options;
  if (!client) {
    throw new Error('A database client must be provided in options.clientOverride');
  }

  console.log('Generating labels and assigning to canonical steps...');
  try {
    // Fetch all migrations
    const migRes = await client.query('SELECT mig_id FROM migrations_mig');
    const migrations = migRes.rows;
    if (migrations.length === 0) throw new Error('No migrations found.');

    // Collect all label IDs across all migrations
    const allLabelIds = [];
    for (const migration of migrations) {
      const { mig_id } = migration;

      // Generate 2-5 unique labels for this migration
      const numLabels = faker.number.int({ min: 2, max: 5 });
      const labelIds = [];
      const labelNames = new Set();
      for (let l = 0; l < numLabels; l++) {
        let lbl_name;
        do {
          lbl_name = faker.word.noun() + '_' + faker.string.alpha({ length: 3, casing: 'upper' });
        } while (labelNames.has(lbl_name));
        labelNames.add(lbl_name);
        const lbl_description = faker.lorem.sentence();
        const lbl_color = faker.internet.color();
        const insertRes = await client.query(
          `INSERT INTO labels_lbl (mig_id, lbl_name, lbl_description, lbl_color, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING lbl_id`,
          [mig_id, lbl_name, lbl_description, lbl_color, 1]
        );
        labelIds.push(insertRes.rows[0].lbl_id);
      }
      allLabelIds.push(...labelIds);

      // Fetch all canonical steps for this migration
      const stepsRes = await client.query(
        `SELECT stm.stm_id FROM steps_master_stm stm
         INNER JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
         INNER JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
         WHERE sqm.mig_id = $1`,
        [mig_id]
      );
      const steps = stepsRes.rows;
      for (const { stm_id } of steps) {
        // 50% chance to assign a label
        if (faker.number.int({ min: 0, max: 1 }) === 1 && labelIds.length > 0) {
          const lbl_id = faker.helpers.arrayElement(labelIds);
          await client.query(
            `INSERT INTO labels_lbl_x_steps_master_stm (lbl_id, stm_id, created_by) VALUES ($1, $2, $3)`,
            [lbl_id, stm_id, 1]
          );
        }
      }
    }
    // --- Assign labels to applications ---
    // Fetch all applications
    const appsRes = await client.query('SELECT app_id FROM applications_app');
    const applications = appsRes.rows;
    for (const { app_id } of applications) {
      // Randomly assign 0–2 labels per application
      const numAppLabels = faker.number.int({ min: 0, max: 2 });
      // Ensure no duplicates and handle case where numAppLabels > allLabelIds.length
      const assignedLabelIds = faker.helpers.arrayElements(allLabelIds, Math.min(numAppLabels, allLabelIds.length));
      for (const lbl_id of assignedLabelIds) {
        // Insert if not already present (avoid duplicate assignments)
        await client.query(
          `INSERT INTO labels_lbl_x_applications_app (lbl_id, app_id, created_by)
           SELECT $1, $2, $3 WHERE NOT EXISTS (
             SELECT 1 FROM labels_lbl_x_applications_app WHERE lbl_id = $1 AND app_id = $2
           )`,
          [lbl_id, app_id, 1]
        );
      }
    }
    console.log('Finished generating labels and associations.');
  } catch (error) {
    console.error('Error generating labels:', error);
    throw error;
  }
}

module.exports = { generateLabels };
