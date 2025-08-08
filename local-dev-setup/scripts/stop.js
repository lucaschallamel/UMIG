import "dotenv/config";
import { execa } from "execa";
import chalk from "chalk";
import readline from "readline";

const log = console.log;
const { green, yellow, red } = chalk;

const execWithOutput = (command, args) => {
  const promise = execa(command, args);
  promise.stdout?.pipe(process.stdout);
  promise.stderr?.pipe(process.stderr);
  return promise;
};

const promptUser = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const stopServices = async () => {
  log(
    yellow(
      "Stopping and removing all services defined in podman-compose.yml...",
    ),
  );
  await execWithOutput("podman-compose", ["down"]);
  log(green("Environment stopped."));
};

const eraseUmigDatabase = async () => {
  log(yellow("Ensuring PostgreSQL is running to erase UMIG database..."));
  try {
    const { stdout } = await execa("podman", [
      "inspect",
      "--format",
      "{{.State.Running}}",
      "umig_postgres",
    ]);
    if (stdout.trim() !== "true") {
      await execWithOutput("podman-compose", ["up", "-d", "postgres"]);
    }
  } catch (error) {
    // Container doesn't exist, so start it
    await execWithOutput("podman-compose", ["up", "-d", "postgres"]);
  }

  log(yellow("Waiting for PostgreSQL to be ready..."));
  const readyCheckTimeout = 60000; // 60 seconds
  const readyCheckInterval = 2000; // 2 seconds
  const startTime = Date.now();
  let isReady = false;

  while (Date.now() - startTime < readyCheckTimeout) {
    try {
      await execa("podman", [
        "exec",
        "umig_postgres",
        "pg_isready",
        "-U",
        process.env.POSTGRES_USER,
      ]);
      isReady = true;
      break;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, readyCheckInterval));
      process.stdout.write(yellow("."));
    }
  }
  log("");

  if (!isReady) {
    log(red("Error: Timed out waiting for PostgreSQL to become ready."));
    throw new Error("PostgreSQL readiness check failed.");
  }

  log(green("PostgreSQL is ready for connections."));

  const dbName = process.env.UMIG_DB_NAME;
  const pgUser = process.env.POSTGRES_USER;

  log(yellow(`Terminating all connections to database "${dbName}"...`));
  const terminateConnectionsSql = `
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '${dbName}'
      AND pid <> pg_backend_pid();
  `;
  try {
    // Execute the termination command.
    await execa("podman", [
      "exec",
      "umig_postgres",
      "psql",
      "-U",
      pgUser,
      "-d",
      "postgres",
      "-c",
      terminateConnectionsSql,
    ]);
    log(green("Connections terminated."));
  } catch (error) {
    // This command can fail if there are no connections to terminate, which is not a critical error.
    log(
      yellow(
        `Warning: Could not terminate connections (this is expected if no connections exist).`,
      ),
    );
  }

  log(yellow(`Dropping UMIG database (${dbName})...`));
  const dropDbSql = `DROP DATABASE IF EXISTS ${dbName};`;
  try {
    await execa("podman", [
      "exec",
      "umig_postgres",
      "psql",
      "-U",
      pgUser,
      "-d",
      "postgres",
      "-c",
      dropDbSql,
    ]);
    log(green("UMIG database dropped."));
  } catch (error) {
    log(red(`Failed to drop UMIG database: ${error.stderr || error.message}`));
    throw error;
  }
};

const eraseVolumes = async ({ eraseAll, eraseConfluence }) => {
  if (eraseAll) {
    log(yellow("Erasing UMIG database volume..."));
    try {
      await execa("podman", ["volume", "rm", "local-dev-setup_umig_db_data"]);
      log(green("UMIG database volume removed."));
    } catch (error) {
      log(
        yellow(
          "UMIG database volume not found or could not be removed, skipping.",
        ),
      );
    }
  }
  if (eraseConfluence || eraseAll) {
    log(yellow("Erasing Confluence database and data volumes..."));
    try {
      await execa("podman", [
        "volume",
        "rm",
        "local-dev-setup_confluence_db_data",
      ]);
      log(green("Confluence database volume removed."));
    } catch (error) {
      log(
        yellow(
          "Confluence database volume not found or could not be removed, skipping.",
        ),
      );
    }
    try {
      await execa("podman", [
        "volume",
        "rm",
        "local-dev-setup_confluence_data",
      ]);
      log(green("Confluence data volume removed."));
    } catch (error) {
      log(
        yellow(
          "Confluence data volume not found or could not be removed, skipping.",
        ),
      );
    }
  }
};

export const stop = async () => {
  const args = process.argv;
  const isErase = args.includes("--erase");
  let userConfirmedErase = false;
  const eraseFlags = {
    eraseUmig: args.includes("--umig"),
    eraseConfluence: args.includes("--confluence"),
    eraseAll: args.includes("--all"),
  };

  if (
    isErase &&
    !eraseFlags.eraseUmig &&
    !eraseFlags.eraseConfluence &&
    !eraseFlags.eraseAll
  ) {
    eraseFlags.eraseAll = true;
  }

  if (isErase) {
    let promptMessage =
      "❓ Are you sure you want to perform the following actions?\n";
    if (eraseFlags.eraseUmig && !eraseFlags.eraseAll) {
      promptMessage += `  - Drop and recreate the UMIG application database (${process.env.UMIG_DB_NAME})\n`;
    }
    if (eraseFlags.eraseConfluence) {
      promptMessage += `  - Erase the Confluence database volume (local-dev-setup_confluence_db_data)\n`;
      promptMessage += `  - Erase the Confluence data volume (local-dev-setup_confluence_data)\n`;
    }
    if (eraseFlags.eraseAll) {
      promptMessage += `  - Erase the UMIG database volume (local-dev-setup_umig_db_data)\n`;
      promptMessage += `  - Erase the Confluence database volume (local-dev-setup_confluence_db_data)\n`;
      promptMessage += `  - Erase the Confluence data volume (local-dev-setup_confluence_data)\n`;
    }
    promptMessage += "This is a destructive operation. [y/N] ";

    const answer = await promptUser(yellow(promptMessage));
    if (answer.toLowerCase() === "y") {
      userConfirmedErase = true;
    } else {
      log(green("Skipping erase operation."));
    }
  }

  if (userConfirmedErase) {
    if (eraseFlags.eraseUmig && !eraseFlags.eraseAll) {
      await eraseUmigDatabase();
    }
  }

  await stopServices();

  if (userConfirmedErase) {
    if (eraseFlags.eraseAll || eraseFlags.eraseConfluence) {
      log(yellow("🗑️  Proceeding with volume erase..."));
      await eraseVolumes(eraseFlags);
      log(green("Erase operation complete."));
    }
  }
};

// If called directly, run the stop function
if (
  import.meta.url.startsWith("file://") &&
  process.argv[1] === new URL(import.meta.url).pathname
) {
  (async () => {
    try {
      await stop();
    } catch (error) {
      log(red("Failed to stop the development environment:"));
      log(red(error));
      process.exit(1);
    }
  })();
}
