#!/usr/bin/env node

/**
 * Groovy Test Complexity Analyzer
 *
 * Analyzes all Groovy test files to identify which tests should be isolated
 * based on the hybrid strategy criteria:
 *
 * MANDATORY ISOLATION TRIGGERS:
 * 1. File size >50KB (51,200 bytes)
 * 2. Static nested classes ≥3
 * 3. Compilation time >5 seconds (if measurable)
 *
 * Usage:
 *   node analyze-groovy-test-complexity.js [options]
 *
 * Options:
 *   --json           Output JSON only (no human-readable summary)
 *   --verbose        Show detailed analysis for all files
 *   --help           Show this help message
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const FILE_SIZE_THRESHOLD_KB = 50;
const FILE_SIZE_THRESHOLD_BYTES = 51200;
const STATIC_CLASS_THRESHOLD = 3;

// Project root is 2 levels up from local-dev-setup/scripts/utilities/
const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const TESTS_BASE_DIR = path.join(PROJECT_ROOT, "src/groovy/umig/tests");
const ISOLATED_BASE_DIR = path.join(
  PROJECT_ROOT,
  "local-dev-setup/__tests__/groovy/isolated",
);

/**
 * Recursively find all Groovy files in a directory
 * @param {string} dir - Directory to search
 * @param {string[]} fileList - Accumulator for found files
 * @returns {string[]} Array of absolute file paths
 */
function findGroovyFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findGroovyFiles(filePath, fileList);
    } else if (file.endsWith(".groovy")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// CLI argument parsing
const args = process.argv.slice(2);
const options = {
  json: args.includes("--json"),
  verbose: args.includes("--verbose"),
  help: args.includes("--help"),
};

if (options.help) {
  console.log(`
Groovy Test Complexity Analyzer

Analyzes all Groovy test files to identify which tests should be isolated
based on the hybrid strategy criteria.

MANDATORY ISOLATION TRIGGERS:
1. File size >50KB (51,200 bytes)
2. Static nested classes ≥3
3. Compilation time >5 seconds (if measurable)

Usage:
  node analyze-groovy-test-complexity.js [options]

Options:
  --json           Output JSON only (no human-readable summary)
  --verbose        Show detailed analysis for all files
  --help           Show this help message

Examples:
  # Run analysis with human-readable output
  node analyze-groovy-test-complexity.js

  # Generate JSON report
  node analyze-groovy-test-complexity.js --json > analysis.json

  # Show verbose details for all files
  node analyze-groovy-test-complexity.js --verbose
`);
  process.exit(0);
}

/**
 * Analyzes a single Groovy test file
 * @param {string} filePath - Absolute path to the Groovy file
 * @returns {Object} Analysis results
 */
function analyzeGroovyTest(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const stats = fs.statSync(filePath);

  // Count static nested classes
  // Matches patterns like:
  // - "static class ClassName"
  // - "private static class ClassName"
  // - "public static class ClassName"
  const staticClassPattern = /^\s*(?:public|private)?\s*static\s+class\s+\w+/gm;
  const staticClassMatches = content.match(staticClassPattern) || [];
  const staticClassCount = staticClassMatches.length;

  // File size in KB
  const fileSizeBytes = stats.size;
  const fileSizeKB = Math.round(fileSizeBytes / 1024);

  // Determine isolation need based on criteria
  const exceedsFileSize = fileSizeBytes > FILE_SIZE_THRESHOLD_BYTES;
  const exceedsStaticClasses = staticClassCount >= STATIC_CLASS_THRESHOLD;
  const needsIsolation = exceedsFileSize || exceedsStaticClasses;

  // Build isolation reasons list
  const isolationReasons = [];
  if (exceedsFileSize) isolationReasons.push("file_size");
  if (exceedsStaticClasses) isolationReasons.push("static_class_count");

  // Determine category from path
  const relativePath = path.relative(TESTS_BASE_DIR, filePath);
  const pathParts = relativePath.split(path.sep);
  const category = pathParts[0]; // unit, integration, security, performance, etc.

  // Generate recommended isolation path
  const fileName = path.basename(filePath);
  const subPath = path
    .dirname(relativePath)
    .split(path.sep)
    .slice(1)
    .join(path.sep);
  const recommendedLocation = path.join(
    ISOLATED_BASE_DIR,
    category,
    subPath,
    fileName,
  );

  return {
    filePath: relativePath,
    absolutePath: filePath,
    fileName,
    category,
    fileSizeKB,
    fileSizeBytes,
    staticClassCount,
    staticClassMatches,
    needsIsolation,
    isolationReasons,
    recommendedLocation: needsIsolation ? recommendedLocation : null,
    exceedsFileSize,
    exceedsStaticClasses,
  };
}

/**
 * Categorizes test results into isolation candidates and standard tests
 * @param {Array} allResults - All test analysis results
 * @returns {Object} Categorized results
 */
function categorizeResults(allResults) {
  const isolationCandidates = allResults.filter((r) => r.needsIsolation);
  const standardTests = allResults.filter((r) => !r.needsIsolation);

  // Calculate summary statistics
  const totalSizeToIsolateKB = isolationCandidates.reduce(
    (sum, r) => sum + r.fileSizeKB,
    0,
  );
  const totalSizeToIsolateBytes = isolationCandidates.reduce(
    (sum, r) => sum + r.fileSizeBytes,
    0,
  );

  // Categorize by reason
  const byFileSize = isolationCandidates.filter((r) => r.exceedsFileSize);
  const byStaticClasses = isolationCandidates.filter(
    (r) => r.exceedsStaticClasses,
  );
  const byBothReasons = isolationCandidates.filter(
    (r) => r.exceedsFileSize && r.exceedsStaticClasses,
  );

  return {
    summary: {
      total_tests: allResults.length,
      files_needing_isolation: isolationCandidates.length,
      files_staying_in_src: standardTests.length,
      isolation_percentage: (
        (isolationCandidates.length / allResults.length) *
        100
      ).toFixed(2),
      total_size_to_isolate_kb: totalSizeToIsolateKB,
      total_size_to_isolate_mb: (
        totalSizeToIsolateBytes /
        (1024 * 1024)
      ).toFixed(2),
      isolation_by_reason: {
        file_size_only: byFileSize.length - byBothReasons.length,
        static_classes_only: byStaticClasses.length - byBothReasons.length,
        both_reasons: byBothReasons.length,
      },
    },
    isolation_candidates: isolationCandidates.sort(
      (a, b) => b.fileSizeKB - a.fileSizeKB,
    ),
    standard_tests: standardTests.sort((a, b) => b.fileSizeKB - a.fileSizeKB),
  };
}

/**
 * Generates human-readable console output
 * @param {Object} categorizedResults - Categorized analysis results
 */
function generateHumanReadableOutput(categorizedResults) {
  const { summary, isolation_candidates, standard_tests } = categorizedResults;

  console.log(chalk.cyan.bold("\n🔍 Groovy Test Complexity Analysis"));
  console.log(chalk.cyan("=====================================\n"));

  console.log(chalk.yellow(`Scanning: ${TESTS_BASE_DIR}\n`));

  console.log(chalk.green.bold("📊 Summary:"));
  console.log(`  Total tests: ${chalk.white.bold(summary.total_tests)}`);
  console.log(
    `  Need isolation: ${chalk.red.bold(summary.files_needing_isolation)} (${chalk.red(summary.isolation_percentage + "%")})`,
  );
  console.log(
    `  Stay in src/: ${chalk.green.bold(summary.files_staying_in_src)} (${chalk.green((100 - parseFloat(summary.isolation_percentage)).toFixed(2) + "%")})`,
  );
  console.log(
    `  Total size to move: ${chalk.yellow.bold(summary.total_size_to_isolate_kb + " KB")} (${summary.total_size_to_isolate_mb} MB)`,
  );
  console.log(`\n  Isolation Reasons Breakdown:`);
  console.log(
    `    File size only: ${chalk.yellow(summary.isolation_by_reason.file_size_only)}`,
  );
  console.log(
    `    Static classes only: ${chalk.yellow(summary.isolation_by_reason.static_classes_only)}`,
  );
  console.log(
    `    Both reasons: ${chalk.red(summary.isolation_by_reason.both_reasons)}`,
  );

  if (isolation_candidates.length > 0) {
    console.log(
      chalk.red.bold(
        `\n🚨 Tests Requiring Isolation (${isolation_candidates.length} files):\n`,
      ),
    );

    isolation_candidates.forEach((test, index) => {
      const reasons = test.isolationReasons.join(", ");
      const reasonsDisplay = test.isolationReasons
        .map((r) => {
          if (r === "file_size") return chalk.red("file_size");
          if (r === "static_class_count")
            return chalk.magenta("static_class_count");
          return r;
        })
        .join(", ");

      console.log(
        `  ${chalk.white.bold(index + 1 + ".")} ${chalk.yellow(test.fileName)} ${chalk.gray("(" + test.fileSizeKB + " KB, " + test.staticClassCount + " static classes)")}`,
      );
      console.log(
        `     ${chalk.gray("→")} Category: ${chalk.cyan(test.category)}`,
      );
      console.log(`     ${chalk.gray("→")} Reasons: ${reasonsDisplay}`);
      console.log(
        `     ${chalk.gray("→")} Current: ${chalk.dim(test.filePath)}`,
      );
      console.log(
        `     ${chalk.gray("→")} Move to: ${chalk.green(path.relative(TESTS_BASE_DIR, test.recommendedLocation))}\n`,
      );
    });
  }

  console.log(
    chalk.green.bold(
      `✅ Tests Staying in src/ (${standard_tests.length} files):`,
    ),
  );

  if (options.verbose) {
    console.log("");
    standard_tests.forEach((test, index) => {
      console.log(
        `  ${chalk.white(index + 1 + ".")} ${chalk.gray(test.fileName)} ${chalk.dim("(" + test.fileSizeKB + " KB, " + test.staticClassCount + " static classes)")}`,
      );
      console.log(`     ${chalk.dim("→ " + test.filePath)}\n`);
    });
  } else {
    // Summarize by size ranges
    const under10KB = standard_tests.filter((t) => t.fileSizeKB < 10).length;
    const between10and30KB = standard_tests.filter(
      (t) => t.fileSizeKB >= 10 && t.fileSizeKB < 30,
    ).length;
    const between30and50KB = standard_tests.filter(
      (t) => t.fileSizeKB >= 30 && t.fileSizeKB <= 50,
    ).length;

    console.log(`  - ${chalk.green(under10KB + " files")} <10KB`);
    console.log(`  - ${chalk.green(between10and30KB + " files")} 10-30KB`);
    console.log(
      `  - ${chalk.yellow(between30and50KB + " files")} 30-50KB (approaching threshold)`,
    );
  }

  console.log(chalk.blue.bold("\n💡 Next Steps:"));
  console.log(`  1. Review isolation candidates list above`);
  console.log(
    `  2. Run migration script: ${chalk.cyan("npm run groovy:migrate-tests")}`,
  );
  console.log(
    `  3. Verify tests still pass: ${chalk.cyan("npm run test:groovy:all")}`,
  );
  console.log(`  4. Update documentation with isolation strategy\n`);

  console.log(
    chalk.gray(
      "Analysis complete. Use --json flag for machine-readable output.\n",
    ),
  );
}

/**
 * Main execution function
 */
function main() {
  try {
    if (!options.json) {
      console.log(chalk.gray("Analyzing Groovy test files..."));
    }

    // Find all Groovy test files recursively
    const files = findGroovyFiles(TESTS_BASE_DIR);

    if (files.length === 0) {
      console.error(
        chalk.red("No Groovy test files found in " + TESTS_BASE_DIR),
      );
      process.exit(1);
    }

    // Analyze each file
    const results = files.map(analyzeGroovyTest);

    // Categorize results
    const categorizedResults = categorizeResults(results);

    if (options.json) {
      // JSON output only
      console.log(JSON.stringify(categorizedResults, null, 2));
    } else {
      // Human-readable output
      generateHumanReadableOutput(categorizedResults);
    }
  } catch (error) {
    console.error(chalk.red("Error during analysis:"), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
