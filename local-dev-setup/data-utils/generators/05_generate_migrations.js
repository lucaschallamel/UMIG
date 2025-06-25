const { client } = require('../lib/db');
const { faker } = require('../lib/utils');

/**
 * Generates top-level migrations and their associated iterations (RUN, DR, CUTOVER).
 * @param {object} config - The main configuration object.
 */
async function generateMigrations(config) {
  console.log(`Generating ${config.num_migrations} migrations...`);

  try {
    const usersRes = await client.query('SELECT usr_id FROM users_usr');
    const userIds = usersRes.rows.map(r => r.usr_id);
    if (userIds.length === 0) {
      throw new Error('Cannot generate migrations without users to assign as owners.');
    }

    const envsRes = await client.query('SELECT env_id FROM environments_env');
    const envIds = envsRes.rows.map(r => r.env_id);
    if (envIds.length < 2) { // Need at least a PROD and BACKUP
      throw new Error('Cannot generate iteration environments without at least 2 environments defined.');
    }

    const envRolesRes = await client.query('SELECT enr_id, enr_name FROM environment_roles_enr');
    const envRoles = envRolesRes.rows;
    const prodRoleId = envRoles.find(r => r.enr_name === 'PROD')?.enr_id;
    const backupRoleId = envRoles.find(r => r.enr_name === 'BACKUP')?.enr_id;
    const testRoleId = envRoles.find(r => r.enr_name === 'TEST')?.enr_id;
    if (!prodRoleId || !backupRoleId || !testRoleId) {
        throw new Error('Required environment roles (PROD, TEST, BACKUP) not found.');
    }

    for (let i = 0; i < config.num_migrations; i++) {
      const startDate = faker.date.between({ from: config.mig_start_date_range[0], to: config.mig_start_date_range[1] });
      const endDate = new Date(startDate);
      endDate.setMonth(startDate.getMonth() + config.mig_duration_months);
      const businessCutoverDate = faker.date.soon({ days: 10, refDate: endDate });

      const migRes = await client.query(
        `INSERT INTO migrations_mig (mig_name, mig_description, mig_status, mig_type, mig_start_date, mig_end_date, mig_business_cutover_date, usr_id_owner)
         VALUES ($1, $2, 'IN_PROGRESS', $3, $4, $5, $6, $7) RETURNING mig_id`,
        [
          `Migration for ${faker.company.name()}`,
          faker.lorem.paragraph(),
          faker.helpers.arrayElement(['MIGRATION', 'DR_TEST']),
          startDate,
          endDate,
          businessCutoverDate,
          faker.helpers.arrayElement(userIds)
        ]
      );
      const migId = migRes.rows[0].mig_id;

      // Generate between 1 and 3 iterations for this Migration
      for (const iteType of ['RUN', 'DR', 'CUTOVER']) {
        const typeConfig = config.iterations[iteType.toLowerCase()];
        const count = typeof typeConfig === 'number' ? typeConfig : faker.number.int(typeConfig);

        for (let j = 0; j < count; j++) {
          const staticCutoverDate = faker.date.between({ from: startDate, to: endDate });
          const dynamicCutoverDate = faker.date.between({ from: staticCutoverDate, to: endDate });

          const iteRes = await client.query(
            `INSERT INTO iterations_ite (mig_id, ite_name, ite_description, ite_status, itt_code, ite_static_cutover_date, ite_dynamic_cutover_date)
             VALUES ($1, $2, $3, 'PENDING', $4, $5, $6) RETURNING ite_id`,
            [
              migId,
              `${iteType} #${j + 1}`,
              faker.lorem.sentence(),
              iteType,
              staticCutoverDate,
              dynamicCutoverDate
            ]
          );
          const iteId = iteRes.rows[0].ite_id;

          // Link environments to this iteration with roles
          const shuffledEnvIds = [...envIds].sort(() => 0.5 - Math.random());
          
          // Assign PROD
          await client.query(
            'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3)',
            [shuffledEnvIds[0], iteId, prodRoleId]
          );

          // Assign BACKUP
          await client.query(
            'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3)',
            [shuffledEnvIds[1], iteId, backupRoleId]
          );

          // Assign TEST to a few others
          const numTestEnvs = faker.number.int({ min: 1, max: Math.min(3, shuffledEnvIds.length - 2) });
          for (let k = 2; k < 2 + numTestEnvs && k < shuffledEnvIds.length; k++) {
            await client.query(
              'INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id) VALUES ($1, $2, $3)',
              [shuffledEnvIds[k], iteId, testRoleId]
            );
          }
        }
      }
    }
    console.log('Finished generating migrations and iterations.');
  } catch (error) {
    console.error('Error generating migrations:', error);
    throw error;
  }
}

module.exports = { generateMigrations };
