#!/usr/bin/env node

/**
 * UMIG Data Import CLI
 * Command-line interface for importing production data
 */

const { Command } = require("commander");
const chalk = require("chalk");
const path = require("path");
const { getPool, closePool } = require("../lib/db/connection-pool");
const ExcelImporter = require("../importers/phase2-excel-import");
const HierarchyImporter = require("../importers/phase3-hierarchy-import-corrected");

const program = new Command();

program
  .name("import-cli")
  .description("UMIG Production Data Import Utilities (US-104)")
  .version("1.0.0");

// Excel import command
program
  .command("excel")
  .description(
    "Import teams, users, applications, step types, and sequences from Excel files",
  )
  .option(
    "--all",
    "Import all Excel files (step_types, applications, sequences, teams, users)",
  )
  .option("--step-types <path>", "Import step types from specified Excel file")
  .option("--sequences <path>", "Import sequences from specified Excel file")
  .option("--teams <path>", "Import teams from specified Excel file")
  .option("--users <path>", "Import users from specified Excel file")
  .option("--apps <path>", "Import applications from specified Excel file")
  .option("--dry-run", "Validate only, do not import data")
  .action(async (options) => {
    try {
      const pool = getPool();
      console.log(chalk.green("✅ Database connection established"));

      const importer = new ExcelImporter(pool);

      const files = {};

      if (options.all) {
        const basePath = path.join(__dirname, "../../../db/import-data");
        files.step_types = path.join(basePath, "step_types.xlsx");
        files.apps = path.join(basePath, "applications.xlsx");
        files.sequences = path.join(basePath, "sequences.xlsx");
        files.teams = path.join(basePath, "teams.xlsx");
        files.users = path.join(basePath, "users.xlsx");
      } else {
        if (options.stepTypes) files.step_types = options.stepTypes;
        if (options.apps) files.apps = options.apps;
        if (options.sequences) files.sequences = options.sequences;
        if (options.teams) files.teams = options.teams;
        if (options.users) files.users = options.users;
      }

      if (Object.keys(files).length === 0) {
        console.error(
          chalk.red(
            "❌ No files specified. Use --all or specify individual files.",
          ),
        );
        console.log("\nExamples:");
        console.log("  import-cli excel --all");
        console.log("  import-cli excel --step-types step_types.xlsx");
        console.log("  import-cli excel --teams teams.xlsx --users users.xlsx");
        console.log(
          "  import-cli excel --apps applications.xlsx --sequences sequences.xlsx",
        );
        process.exit(1);
      }

      const results = await importer.importAll(files, options.dryRun || false);

      // Determine exit code based on results
      const hasErrors = Object.values(results).some(
        (r) => !r.success && !r.dryRun,
      );
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error(chalk.red(`\n❌ Fatal error: ${error.message}`));
      console.error(error.stack);
      process.exit(1);
    } finally {
      await closePool();
    }
  });

// Hierarchy import command (CORRECTED per US-104)
program
  .command("hierarchy")
  .description(
    "Import hierarchical migration data from JSON files (Phase 3 - CORRECTED)",
  )
  .option(
    "--data-dir <path>",
    "Path to JSON directory",
    path.join(__dirname, "../../../db/import-data/rawData/json"),
  )
  .option("--dry-run", "Validate only, do not import data")
  .option("--file <filename>", "Import single file (for testing)")
  .option(
    "--batch-size <number>",
    "DEPRECATED: Now processes one file per transaction",
    "1",
  )
  .action(async (options) => {
    try {
      console.log(chalk.green("✅ Database connection established"));

      const importer = new HierarchyImporter();

      const importOptions = {
        dataDir: options.dataDir,
        dryRun: options.dryRun || false,
        singleFile: options.file || null,
      };

      console.log(chalk.blue("\n📋 Import Configuration:"));
      console.log(chalk.gray(`   Data Directory: ${importOptions.dataDir}`));
      console.log(chalk.gray(`   Dry Run: ${importOptions.dryRun}`));
      if (importOptions.singleFile) {
        console.log(chalk.gray(`   Single File: ${importOptions.singleFile}`));
      }
      console.log(
        chalk.gray(`   Transaction Pattern: One per file (granular rollback)`),
      );

      const results = await importer.importAll(importOptions);

      // Determine exit code based on results
      const hasErrors = !results.success && !results.dryRun;
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error(chalk.red(`\n❌ Fatal error: ${error.message}`));
      console.error(error.stack);
      process.exit(1);
    } finally {
      await closePool();
    }
  });

// Validation command (placeholder)
program
  .command("validate")
  .description("Validate data integrity and relationships")
  .option("--report <path>", "Output validation report to file")
  .action(async (options) => {
    console.log(chalk.yellow("\n⚠️  Validation command not yet implemented"));
    process.exit(0);
  });

// Benchmark command (placeholder)
program
  .command("benchmark")
  .description("Run performance benchmarks on import operations")
  .action(async (options) => {
    console.log(chalk.yellow("\n⚠️  Benchmark command not yet implemented"));
    process.exit(0);
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
