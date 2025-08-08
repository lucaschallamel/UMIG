import { faker } from "../lib/utils.js";
import { client } from "../lib/db.js";

/**
 * Truncates the step_instance_comments_sic table.
 * @param {object} dbClient - The PostgreSQL client.
 */
async function eraseStepInstanceCommentsTable(dbClient) {
  console.log("Erasing step_instance_comments_sic table...");
  try {
    await dbClient.query(
      "TRUNCATE TABLE step_instance_comments_sic RESTART IDENTITY CASCADE",
    );
    console.log("  - Table step_instance_comments_sic truncated.");
  } catch (error) {
    console.error(`Error erasing step_instance_comments_sic: ${error}`);
    throw error;
  }
}

/**
 * Generates instance comments for each step instance.
 * @param {object} config - The main configuration object.
 * @param {object} options - Generation options, e.g., { erase: boolean, clientOverride: object }.
 */
async function generateStepInstanceComments(config, options = {}) {
  const dbClient = options.clientOverride || client;

  if (options.erase) {
    await eraseStepInstanceCommentsTable(dbClient);
  }

  console.log("Generating step instance comments...");

  // Fetch all step instances and users
  const instances = await dbClient.query(
    "SELECT sti_id FROM steps_instance_sti",
  );
  const users = await dbClient.query("SELECT usr_id FROM users_usr");

  if (instances.rows.length === 0 || users.rows.length === 0) {
    console.error(
      "Cannot generate instance comments without step instances and users.",
    );
    return;
  }

  for (const { sti_id } of instances.rows) {
    const comment = faker.lorem.sentence();
    const creatorId = faker.helpers.arrayElement(users.rows).usr_id;
    await dbClient.query(
      "INSERT INTO step_instance_comments_sic (sti_id, comment_body, created_by) VALUES ($1, $2, $3)",
      [sti_id, comment, creatorId],
    );
  }

  console.log(`Inserted ${instances.rows.length} step instance comments.`);
}

export { generateStepInstanceComments, eraseStepInstanceCommentsTable };
