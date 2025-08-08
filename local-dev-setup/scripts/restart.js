import { execa } from "execa";
import chalk from "chalk";

const log = console.log;
const { green, yellow, red } = chalk;

/**
 * Main function to orchestrate the restart process.
 * It stops all services (passing through any CLI args) and then starts them again.
 */
const restartServices = async () => {
  // Get any arguments passed to this script (e.g., --erase, --umig)
  const args = process.argv.slice(2);

  try {
    log(yellow("🛑 Stopping all services..."));
    // Execute stop.js as a separate process, inheriting stdio to allow for interactive prompts.
    await execa("node", ["scripts/stop.js", ...args], { stdio: "inherit" });
    log(green("All services stopped."));
    log("\n");

    log(yellow("🚀 Starting all services..."));
    // Execute start.js as a separate process, also inheriting stdio.
    // We pass args here as well for consistency, though start.js may not use them all.
    await execa("node", ["scripts/start.js", ...args], { stdio: "inherit" });
    log(green("✅ Restart complete."));
  } catch (error) {
    // execa with stdio: 'inherit' will automatically stream the error output.
    // We just need to log a final message and exit.
    log(
      red(
        "\nAn error occurred during the restart process. Please check the output above.",
      ),
    );
    process.exit(1);
  }
};

// Self-executing async function to run the main logic
restartServices();
