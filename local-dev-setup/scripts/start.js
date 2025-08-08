import "dotenv/config";
import { execa } from "execa";
import chalk from "chalk";

const log = console.log;
const { green, yellow, red } = chalk;

const execWithOutput = (command, args) => {
  const promise = execa(command, args);
  promise.stdout?.pipe(process.stdout);
  promise.stderr?.pipe(process.stderr);
  return promise;
};

const checkPostgresHealth = async () => {
  try {
    const { stdout } = await execa("podman", [
      "inspect",
      "--format",
      "{{.State.Health.Status}}",
      "umig_postgres",
    ]);
    return stdout.trim() === "healthy";
  } catch (error) {
    // Container might not be running yet, which is not an error in this context
    return false;
  }
};

const waitForPostgres = async () => {
  log(yellow("[2/4] Waiting for PostgreSQL to be ready..."));
  const readyCheckTimeout = 60000; // 60 seconds
  const readyCheckInterval = 2000; // 2 seconds
  const startTime = Date.now();
  let isReady = false;

  while (Date.now() - startTime < readyCheckTimeout) {
    try {
      // Use pg_isready inside the container. It exits with 0 if ready, non-zero otherwise.
      await execa("podman", [
        "exec",
        "umig_postgres",
        "pg_isready",
        "-U",
        process.env.POSTGRES_USER,
      ]);
      isReady = true;
      break; // Exit loop if ready
    } catch (error) {
      // pg_isready failed, wait and retry
      await new Promise((resolve) => setTimeout(resolve, readyCheckInterval));
      process.stdout.write(yellow("."));
    }
  }

  log(""); // Newline after the dots

  if (!isReady) {
    log(red("Error: Timed out waiting for PostgreSQL to become ready."));
    throw new Error("PostgreSQL readiness check failed.");
  }

  log(green("PostgreSQL is ready for connections."));
};

const ensureUmigDbExists = async () => {
  log(yellow("Ensuring UMIG database and user exist..."));

  const createUserSql = `
    DO \$do\$
    BEGIN
       IF NOT EXISTS (
          SELECT FROM pg_catalog.pg_roles
          WHERE  rolname = '${process.env.UMIG_DB_USER}') THEN
          CREATE ROLE ${process.env.UMIG_DB_USER} LOGIN PASSWORD '${process.env.UMIG_DB_PASSWORD}';
       END IF;
    END \$do\$;
  `;

  const grantPrivilegesSql = `GRANT ALL PRIVILEGES ON DATABASE ${process.env.UMIG_DB_NAME} TO ${process.env.UMIG_DB_USER};`;

  try {
    // 1. Create User if it doesn't exist
    await execa("podman", [
      "exec",
      "umig_postgres",
      "psql",
      "-U",
      process.env.POSTGRES_USER,
      "-d",
      "postgres",
      "-c",
      createUserSql,
    ]);
    log(green("UMIG user check/create complete."));

    // 2. Create Database if it doesn't exist
    try {
      await execa("podman", [
        "exec",
        "umig_postgres",
        "psql",
        "-U",
        process.env.POSTGRES_USER,
        "-d",
        "postgres",
        "-c",
        `CREATE DATABASE ${process.env.UMIG_DB_NAME}`,
      ]);
      log(green("UMIG database created."));
    } catch (e) {
      if (
        e.stderr &&
        e.stderr.includes(
          `database "${process.env.UMIG_DB_NAME}" already exists`,
        )
      ) {
        log(green("UMIG database already exists, skipping creation."));
      } else {
        log(red(`Error creating UMIG database: ${e.stderr || e.message}`));
        throw e;
      }
    }

    // 3. Grant Privileges
    await execa("podman", [
      "exec",
      "umig_postgres",
      "psql",
      "-U",
      process.env.POSTGRES_USER,
      "-d",
      "postgres",
      "-c",
      grantPrivilegesSql,
    ]);
    log(green("UMIG user privileges granted."));
  } catch (error) {
    log(
      red(
        `Failed to ensure UMIG database exists: ${error.stderr || error.message}`,
      ),
    );
    throw error;
  }
};

const runMigrations = async () => {
  log(yellow("[3/4] Running database migrations with local Liquibase..."));
  await execWithOutput("liquibase", [
    `--defaults-file=liquibase/liquibase.properties`,
    `--search-path=./liquibase`,
    `--url=jdbc:postgresql://localhost:5432/${process.env.UMIG_DB_NAME}`,
    `--username=${process.env.UMIG_DB_USER}`,
    `--password=${process.env.UMIG_DB_PASSWORD}`,
    "update",
  ]);
  log(green("Liquibase migrations complete."));
};

const startServices = async () => {
  log(yellow("[1/4] Starting PostgreSQL..."));
  await execWithOutput("podman-compose", ["up", "-d", "postgres"]);

  await waitForPostgres();
  await ensureUmigDbExists();
  await runMigrations();

  log(yellow("[4/4] Starting Confluence and MailHog..."));
  await execWithOutput("podman-compose", ["up", "-d", "confluence", "mailhog"]);

  log(green("\n🚀 Development environment is up and running!"));
  log(green("Confluence: http://localhost:8090"));
  log(green("MailHog:    http://localhost:8025"));
};

(async () => {
  try {
    await startServices();
  } catch (error) {
    log(red("Failed to start the development environment:"));
    log(red(error));
    process.exit(1);
  }
})();
