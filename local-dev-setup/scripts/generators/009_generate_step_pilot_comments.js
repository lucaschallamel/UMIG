import { faker } from "../lib/utils.js";
import { client } from "../lib/db.js";

/**
 * Truncates the step_pilot_comments_spc table.
 * @param {object} dbClient - The PostgreSQL client.
 */
async function eraseStepPilotCommentsTable(dbClient) {
  console.log("Erasing step_pilot_comments_spc table...");
  try {
    await dbClient.query(
      "TRUNCATE TABLE step_pilot_comments_spc RESTART IDENTITY CASCADE",
    );
    console.log("  - Table step_pilot_comments_spc truncated.");
  } catch (error) {
    console.error(`Error erasing step_pilot_comments_spc: ${error}`);
    throw error;
  }
}

/**
 * Generates pilot comments for each master step.
 * @param {object} config - The main configuration object.
 * @param {object} options - Generation options, e.g., { erase: boolean, clientOverride: object }.
 */
async function generateStepPilotComments(config, options = {}) {
  const dbClient = options.clientOverride || client;

  if (options.erase) {
    await eraseStepPilotCommentsTable(dbClient);
  }

  console.log("Generating step pilot comments...");

  // Fetch all master steps and users
  const steps = await dbClient.query("SELECT stm_id FROM steps_master_stm");
  const users = await dbClient.query("SELECT usr_id FROM users_usr");

  if (steps.rows.length === 0 || users.rows.length === 0) {
    console.error("Cannot generate pilot comments without steps and users.");
    return;
  }

  for (const { stm_id } of steps.rows) {
    const comment = faker.lorem.sentence();
    const creatorId = faker.helpers.arrayElement(users.rows).usr_id;
    await dbClient.query(
      "INSERT INTO step_pilot_comments_spc (stm_id, comment_body, created_by) VALUES ($1, $2, $3)",
      [stm_id, comment, creatorId],
    );
  }

  console.log(`Inserted ${steps.rows.length} pilot comments.`);
}

export { generateStepPilotComments, eraseStepPilotCommentsTable };
