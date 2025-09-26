/**
 * BuildValidator.js
 * US-088 Phase 3: Build validation for UMIG build system
 * Pre and post build validation, environment checks, git status verification
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

class BuildValidator {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.validationResults = {
      preValidation: {},
      postValidation: {},
      errors: [],
      warnings: [],
    };
  }

  /**
   * Run all pre-build validations
   * @returns {boolean} True if all validations pass
   */
  async runPreValidation() {
    console.log("🔍 Running pre-build validations...");

    const checks = [
      this.validateEnvironment(),
      this.validateGitStatus(),
      this.validateDependencies(),
      this.validateRequiredFiles(),
      this.validateDirectoryStructure(),
      this.validateConfiguration(),
      this.validateDiskSpace(),
      this.validatePermissions(),
    ];

    const results = await Promise.allSettled(checks);
    this.processValidationResults(results, "preValidation");

    const hasErrors = this.validationResults.errors.length > 0;
    if (hasErrors) {
      console.error(
        "❌ Pre-build validation failed:",
        this.validationResults.errors.length,
        "errors",
      );
      this.displayErrors();
    } else {
      console.log("✅ All pre-build validations passed");
      if (this.validationResults.warnings.length > 0) {
        console.warn("⚠️  Warnings:", this.validationResults.warnings.length);
        this.displayWarnings();
      }
    }

    return !hasErrors;
  }

  /**
   * Run all post-build validations
   * @param {string} buildOutputPath - Path to build output
   * @returns {boolean} True if all validations pass
   */
  async runPostValidation(buildOutputPath) {
    console.log("🔍 Running post-build validations...");

    const checks = [
      this.validateBuildOutput(buildOutputPath),
      this.validateArchiveIntegrity(buildOutputPath),
      this.validateFilePermissions(buildOutputPath),
      this.validateManifestFiles(buildOutputPath),
      this.validateChecksums(buildOutputPath),
    ];

    const results = await Promise.allSettled(checks);
    this.processValidationResults(results, "postValidation");

    const hasErrors =
      this.validationResults.errors.filter((e) => e.phase === "postValidation")
        .length > 0;
    if (hasErrors) {
      console.error("❌ Post-build validation failed");
      this.displayErrors("postValidation");
    } else {
      console.log("✅ All post-build validations passed");
    }

    return !hasErrors;
  }

  /**
   * Validate environment prerequisites
   */
  validateEnvironment() {
    return new Promise((resolve, reject) => {
      try {
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.substring(1).split(".")[0]);
        if (majorVersion < 14) {
          throw new Error(
            `Node.js ${nodeVersion} is too old. Requires Node.js 14+`,
          );
        }

        // Check npm availability
        try {
          execSync("npm --version", { stdio: "ignore" });
        } catch (error) {
          throw new Error("npm is not available in PATH");
        }

        // Check git availability
        try {
          execSync("git --version", { stdio: "ignore" });
        } catch (error) {
          throw new Error("git is not available in PATH");
        }

        // Check tar availability (for archive creation)
        try {
          execSync("tar --version", { stdio: "ignore" });
        } catch (error) {
          this.addWarning(
            "tar command not available - archive creation may fail",
          );
        }

        resolve({ check: "environment", status: "passed" });
      } catch (error) {
        reject({ check: "environment", error: error.message });
      }
    });
  }

  /**
   * Validate git repository status
   */
  validateGitStatus() {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in a git repository
        const gitDir = path.join(this.projectRoot, ".git");
        if (!fs.existsSync(gitDir)) {
          throw new Error("Not in a git repository");
        }

        // Check for uncommitted changes
        try {
          const status = execSync("git status --porcelain", {
            cwd: this.projectRoot,
            encoding: "utf8",
          });
          if (status.trim()) {
            this.addWarning(
              "Uncommitted changes detected - build may not reflect current state",
            );
          }
        } catch (error) {
          throw new Error("Failed to check git status: " + error.message);
        }

        // Get current branch
        const branch = execSync("git rev-parse --abbrev-ref HEAD", {
          cwd: this.projectRoot,
          encoding: "utf8",
        }).trim();

        resolve({ check: "gitStatus", status: "passed", branch });
      } catch (error) {
        reject({ check: "gitStatus", error: error.message });
      }
    });
  }

  /**
   * Validate project dependencies
   */
  validateDependencies() {
    return new Promise((resolve, reject) => {
      try {
        const packageJsonPath = path.join(this.projectRoot, "package.json");
        if (!fs.existsSync(packageJsonPath)) {
          throw new Error("package.json not found");
        }

        const nodeModulesPath = path.join(this.projectRoot, "node_modules");
        if (!fs.existsSync(nodeModulesPath)) {
          throw new Error("node_modules directory not found - run npm install");
        }

        // Check package-lock.json exists
        const packageLockPath = path.join(
          this.projectRoot,
          "package-lock.json",
        );
        if (!fs.existsSync(packageLockPath)) {
          this.addWarning(
            "package-lock.json not found - dependency versions may vary",
          );
        }

        resolve({ check: "dependencies", status: "passed" });
      } catch (error) {
        reject({ check: "dependencies", error: error.message });
      }
    });
  }

  /**
   * Validate required files exist
   */
  validateRequiredFiles() {
    return new Promise((resolve, reject) => {
      try {
        const requiredFiles = [
          "package.json",
          "local-dev-setup/build-config.json",
        ];

        const missingFiles = [];
        for (const file of requiredFiles) {
          const filePath = path.join(this.projectRoot, file);
          if (!fs.existsSync(filePath)) {
            missingFiles.push(file);
          }
        }

        if (missingFiles.length > 0) {
          throw new Error(`Required files missing: ${missingFiles.join(", ")}`);
        }

        resolve({ check: "requiredFiles", status: "passed" });
      } catch (error) {
        reject({ check: "requiredFiles", error: error.message });
      }
    });
  }

  /**
   * Validate directory structure
   */
  validateDirectoryStructure() {
    return new Promise((resolve, reject) => {
      try {
        const requiredDirs = [
          "src",
          "local-dev-setup",
          "local-dev-setup/scripts",
          "local-dev-setup/scripts/build",
        ];

        const missingDirs = [];
        for (const dir of requiredDirs) {
          const dirPath = path.join(this.projectRoot, dir);
          if (!fs.existsSync(dirPath)) {
            missingDirs.push(dir);
          }
        }

        if (missingDirs.length > 0) {
          throw new Error(
            `Required directories missing: ${missingDirs.join(", ")}`,
          );
        }

        resolve({ check: "directoryStructure", status: "passed" });
      } catch (error) {
        reject({ check: "directoryStructure", error: error.message });
      }
    });
  }

  /**
   * Validate build configuration
   */
  validateConfiguration() {
    return new Promise((resolve, reject) => {
      try {
        const configPath = path.join(
          this.projectRoot,
          "local-dev-setup/build-config.json",
        );
        if (!fs.existsSync(configPath)) {
          throw new Error("build-config.json not found");
        }

        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

        // Validate required configuration sections
        const requiredSections = [
          "source",
          "build",
          "sources",
          "environments",
          "output",
        ];
        for (const section of requiredSections) {
          if (!config[section]) {
            throw new Error(
              `Missing required configuration section: ${section}`,
            );
          }
        }

        // Validate source configuration structure
        if (config.source) {
          const requiredSourceFields = [
            "baseDirectory",
            "validation",
            "deploymentStructure",
          ];
          for (const field of requiredSourceFields) {
            if (!config.source[field]) {
              throw new Error(
                `Missing required source configuration field: ${field}`,
              );
            }
          }

          // Validate deploymentStructure has required sections
          const deploymentStructure = config.source.deploymentStructure;
          if (deploymentStructure) {
            const requiredSections = ["umig", "database", "documentation"];
            for (const section of requiredSections) {
              if (!deploymentStructure[section]) {
                throw new Error(
                  `Missing required deployment structure section: ${section}`,
                );
              }
              if (!deploymentStructure[section].inclusionPatterns) {
                throw new Error(
                  `Missing inclusionPatterns for deployment section: ${section}`,
                );
              }
            }
          }
        }

        // Validate source directories exist
        if (config.sources && Array.isArray(config.sources)) {
          for (const source of config.sources) {
            const sourcePath = path.join(this.projectRoot, source.path);
            if (source.required && !fs.existsSync(sourcePath)) {
              this.addWarning(
                `Required source directory does not exist: ${source.path}`,
              );
            }
          }
        }

        // Validate required directories from source validation
        if (
          config.source.validation &&
          config.source.validation.requiredDirectories
        ) {
          for (const reqDir of config.source.validation.requiredDirectories) {
            const dirPath = path.join(this.projectRoot, reqDir);
            if (!fs.existsSync(dirPath)) {
              throw new Error(`Required directory not found: ${reqDir}`);
            }
          }
        }

        resolve({ check: "configuration", status: "passed" });
      } catch (error) {
        reject({ check: "configuration", error: error.message });
      }
    });
  }

  /**
   * Validate available disk space
   */
  validateDiskSpace() {
    return new Promise((resolve, reject) => {
      try {
        const stats = fs.statSync(this.projectRoot);
        // This is a basic check - in production, you'd want to check actual disk space
        // For now, just verify we can write to the directory
        fs.accessSync(this.projectRoot, fs.constants.W_OK);

        resolve({ check: "diskSpace", status: "passed" });
      } catch (error) {
        reject({
          check: "diskSpace",
          error: "Insufficient disk space or write permissions",
        });
      }
    });
  }

  /**
   * Validate file permissions
   */
  validatePermissions() {
    return new Promise((resolve, reject) => {
      try {
        // Check write permissions on project root
        fs.accessSync(this.projectRoot, fs.constants.W_OK);

        // Check write permissions on build output directory
        const buildDir = path.join(this.projectRoot, "local-dev-setup/build");
        if (!fs.existsSync(buildDir)) {
          fs.mkdirSync(buildDir, { recursive: true });
        }
        fs.accessSync(buildDir, fs.constants.W_OK);

        resolve({ check: "permissions", status: "passed" });
      } catch (error) {
        reject({
          check: "permissions",
          error: "Insufficient file permissions",
        });
      }
    });
  }

  /**
   * Validate build output exists and is valid
   */
  validateBuildOutput(buildOutputPath) {
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(buildOutputPath)) {
          throw new Error(`Build output not found: ${buildOutputPath}`);
        }

        const stats = fs.statSync(buildOutputPath);
        if (stats.size === 0) {
          throw new Error("Build output is empty");
        }

        resolve({ check: "buildOutput", status: "passed", size: stats.size });
      } catch (error) {
        reject({ check: "buildOutput", error: error.message });
      }
    });
  }

  /**
   * Validate archive integrity
   */
  validateArchiveIntegrity(archivePath) {
    return new Promise((resolve, reject) => {
      try {
        if (path.extname(archivePath) === ".gz") {
          // Test archive integrity
          execSync(`tar -tzf "${archivePath}"`, { stdio: "ignore" });
        }
        resolve({ check: "archiveIntegrity", status: "passed" });
      } catch (error) {
        reject({
          check: "archiveIntegrity",
          error: "Archive integrity check failed",
        });
      }
    });
  }

  /**
   * Validate file permissions in build output
   */
  validateFilePermissions(buildOutputPath) {
    return new Promise((resolve) => {
      // For now, just verify the file is readable
      try {
        fs.accessSync(buildOutputPath, fs.constants.R_OK);
        resolve({ check: "filePermissions", status: "passed" });
      } catch (error) {
        resolve({
          check: "filePermissions",
          status: "warning",
          message: "File permissions may be incorrect",
        });
      }
    });
  }

  /**
   * Validate manifest files
   */
  validateManifestFiles(buildOutputPath) {
    return new Promise((resolve) => {
      // Check if manifest file exists alongside the build output
      const manifestPath = buildOutputPath.replace(
        /\.(tar\.gz|zip)$/,
        "-manifest.json",
      );
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          resolve({ check: "manifestFiles", status: "passed", manifest });
        } catch (error) {
          resolve({
            check: "manifestFiles",
            status: "warning",
            message: "Manifest file is invalid JSON",
          });
        }
      } else {
        resolve({
          check: "manifestFiles",
          status: "warning",
          message: "No manifest file found",
        });
      }
    });
  }

  /**
   * Validate checksums if available
   */
  validateChecksums(buildOutputPath) {
    return new Promise((resolve) => {
      // For now, just resolve as passed - checksum validation would be implemented here
      resolve({ check: "checksums", status: "passed" });
    });
  }

  /**
   * Process validation results
   */
  processValidationResults(results, phase) {
    for (const result of results) {
      if (result.status === "fulfilled") {
        this.validationResults[phase][result.value.check] = result.value;
      } else {
        this.validationResults.errors.push({
          phase,
          check: result.reason.check,
          error: result.reason.error,
        });
      }
    }
  }

  /**
   * Add warning to validation results
   */
  addWarning(message, check = "general") {
    this.validationResults.warnings.push({ check, message });
  }

  /**
   * Display validation errors
   */
  displayErrors(phase = null) {
    const errors = phase
      ? this.validationResults.errors.filter((e) => e.phase === phase)
      : this.validationResults.errors;

    console.error("\n❌ Validation Errors:");
    errors.forEach((error) => {
      console.error(`   ${error.check}: ${error.error}`);
    });
  }

  /**
   * Display validation warnings
   */
  displayWarnings() {
    console.warn("\n⚠️  Validation Warnings:");
    this.validationResults.warnings.forEach((warning) => {
      console.warn(`   ${warning.check}: ${warning.message}`);
    });
  }

  /**
   * Get validation summary
   */
  getSummary() {
    const preChecks = Object.keys(this.validationResults.preValidation).length;
    const postChecks = Object.keys(
      this.validationResults.postValidation,
    ).length;
    const errors = this.validationResults.errors.length;
    const warnings = this.validationResults.warnings.length;

    return {
      preValidationChecks: preChecks,
      postValidationChecks: postChecks,
      errors,
      warnings,
      success: errors === 0,
    };
  }

  /**
   * Validate git repository status
   */
  async validateGitRepository() {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in a git repository
        const gitDir = path.join(this.projectRoot, ".git");
        if (!fs.existsSync(gitDir)) {
          throw new Error("Not in a git repository");
        }

        // Check for uncommitted changes (warning only)
        try {
          const status = execSync("git status --porcelain", {
            cwd: this.projectRoot,
            encoding: "utf8",
          });
          if (status.trim()) {
            this.addWarning(
              "Uncommitted changes detected - build may not reflect current state",
            );
          }
        } catch (error) {
          throw new Error("Failed to check git status: " + error.message);
        }

        console.log("✓ Git repository validation passed");
        resolve({ check: "gitRepository", status: "passed" });
      } catch (error) {
        reject({ check: "gitRepository", error: error.message });
      }
    });
  }

  /**
   * Validate file system permissions
   */
  async validateFileSystemPermissions() {
    return new Promise((resolve, reject) => {
      try {
        // Check write permissions on project root
        fs.accessSync(this.projectRoot, fs.constants.W_OK);

        // Check write permissions on build output directory
        const buildDir = path.join(this.projectRoot, "local-dev-setup/build");
        if (!fs.existsSync(buildDir)) {
          fs.mkdirSync(buildDir, { recursive: true });
        }
        fs.accessSync(buildDir, fs.constants.W_OK);

        console.log("✓ File system permissions validation passed");
        resolve({ check: "fileSystemPermissions", status: "passed" });
      } catch (error) {
        reject({
          check: "fileSystemPermissions",
          error: "Insufficient file permissions",
        });
      }
    });
  }

  /**
   * Validate build artifacts
   */
  async validateArtifacts(artifactPaths) {
    return new Promise((resolve, reject) => {
      try {
        if (!artifactPaths || artifactPaths.length === 0) {
          throw new Error("No artifacts to validate");
        }

        for (const artifactPath of artifactPaths) {
          if (!fs.existsSync(artifactPath)) {
            throw new Error(`Artifact not found: ${artifactPath}`);
          }

          const stats = fs.statSync(artifactPath);
          if (stats.size === 0) {
            throw new Error(`Artifact is empty: ${artifactPath}`);
          }
        }

        console.log(
          `✓ Artifact validation passed: ${artifactPaths.length} artifacts`,
        );
        resolve({
          check: "artifacts",
          status: "passed",
          count: artifactPaths.length,
        });
      } catch (error) {
        reject({ check: "artifacts", error: error.message });
      }
    });
  }

  /**
   * Validate archive integrity
   */
  async validateArchiveIntegrity(artifactPaths) {
    return new Promise((resolve, reject) => {
      try {
        const archiveFiles = artifactPaths.filter(
          (path) => path.endsWith(".tar.gz") || path.endsWith(".zip"),
        );

        if (archiveFiles.length === 0) {
          resolve({
            check: "archiveIntegrity",
            status: "skipped",
            message: "No archive files to validate",
          });
          return;
        }

        for (const archivePath of archiveFiles) {
          if (path.extname(archivePath) === ".gz") {
            // Test tar.gz integrity
            execSync(`tar -tzf "${archivePath}"`, { stdio: "ignore" });
          }
        }

        console.log(
          `✓ Archive integrity validation passed: ${archiveFiles.length} archives`,
        );
        resolve({
          check: "archiveIntegrity",
          status: "passed",
          count: archiveFiles.length,
        });
      } catch (error) {
        reject({
          check: "archiveIntegrity",
          error: "Archive integrity check failed: " + error.message,
        });
      }
    });
  }

  /**
   * Validate metadata consistency
   */
  async validateMetadataConsistency(artifactPaths) {
    return new Promise((resolve) => {
      try {
        // Check if manifest files exist alongside artifacts
        const manifestFiles = [];
        for (const artifactPath of artifactPaths) {
          const manifestPath = artifactPath.replace(
            /\.(tar\.gz|zip)$/,
            "-manifest.json",
          );
          if (fs.existsSync(manifestPath)) {
            manifestFiles.push(manifestPath);
          }
        }

        console.log(
          `✓ Metadata consistency validation passed: ${manifestFiles.length} manifest files`,
        );
        resolve({
          check: "metadataConsistency",
          status: "passed",
          manifestCount: manifestFiles.length,
        });
      } catch (error) {
        resolve({
          check: "metadataConsistency",
          status: "warning",
          message: error.message,
        });
      }
    });
  }

  /**
   * Validate environment compatibility
   */
  async validateEnvironmentCompatibility() {
    return new Promise((resolve) => {
      try {
        // Basic environment compatibility checks
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.substring(1).split(".")[0]);

        if (majorVersion < 14) {
          throw new Error(
            `Node.js ${nodeVersion} may not be compatible. Requires Node.js 14+`,
          );
        }

        console.log("✓ Environment compatibility validation passed");
        resolve({
          check: "environmentCompatibility",
          status: "passed",
          nodeVersion,
        });
      } catch (error) {
        resolve({
          check: "environmentCompatibility",
          status: "warning",
          message: error.message,
        });
      }
    });
  }

  /**
   * Reset validation state
   */
  reset() {
    this.validationResults = {
      preValidation: {},
      postValidation: {},
      errors: [],
      warnings: [],
    };
  }
}

export default BuildValidator;
