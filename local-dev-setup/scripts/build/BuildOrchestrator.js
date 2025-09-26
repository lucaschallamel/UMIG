/**
 * BuildOrchestrator.js - US-088 Phase 3: Build Process Coordination
 *
 * Main build coordination class that orchestrates the 4-phase build workflow:
 * 1. Pre-build validation and environment checks
 * 2. Source code packaging with inclusion/exclusion logic
 * 3. Version management and metadata generation
 * 4. Post-build validation and artifact verification
 *
 * @module BuildOrchestrator
 * @version 1.0.0 - Phase 3 Implementation
 * @created 2025-09-25
 * @pattern ES6 modules with comprehensive error handling
 * @compliance UMIG patterns, cross-platform compatibility
 */

import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import chalk from "chalk";
import * as tar from "tar";

import SourcePackager from "./SourcePackager.js";
import VersionManager from "./VersionManager.js";
import BuildValidator from "./BuildValidator.js";
import MetadataGenerator from "./MetadataGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BuildOrchestrator - Coordinates the complete build process
 *
 * Follows 4-phase workflow as defined in build-config.json:
 * - Phase 1: Pre-build validation
 * - Phase 2: Source packaging
 * - Phase 3: Version and metadata generation
 * - Phase 4: Post-build validation
 */
export class BuildOrchestrator {
  constructor(options = {}) {
    this.options = {
      environment: options.environment || "dev",
      includeTests: options.includeTests || false,
      verbose: options.verbose || false,
      dryRun: options.dryRun || false,
      ...options,
    };

    // Initialize build state
    this.buildState = {
      phase: 0,
      startTime: null,
      endTime: null,
      artifactPaths: [],
      errors: [],
      warnings: [],
    };

    // Load build configuration
    this.config = null;
    this.initialized = false;

    // Initialize build components
    this.validator = null;
    this.sourcePackager = null;
    this.versionManager = null;
    this.metadataGenerator = null;
  }

  /**
   * Initialize the build orchestrator with configuration
   * @private
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load build configuration
      const configPath = path.resolve(__dirname, "../../build-config.json");
      const configContent = await fs.readFile(configPath, "utf8");
      this.config = JSON.parse(configContent);

      // Get environment-specific configuration
      const envConfig = this.config.environments[this.options.environment];
      if (!envConfig) {
        throw new Error(`Unknown environment: ${this.options.environment}`);
      }

      // Initialize build components with configuration
      const projectRoot = path.resolve(__dirname, "../../..");
      const localDevSetupRoot = path.resolve(__dirname, "../..");
      this.validator = new BuildValidator(projectRoot);
      this.sourcePackager = new SourcePackager(this.config, this.options);
      this.versionManager = new VersionManager(localDevSetupRoot);
      this.metadataGenerator = new MetadataGenerator(projectRoot);

      this.initialized = true;

      if (this.options.verbose) {
        console.log(
          chalk.gray(
            `✓ BuildOrchestrator initialized for ${this.options.environment} environment`,
          ),
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize BuildOrchestrator: ${error.message}`,
      );
    }
  }

  /**
   * Validate configuration without executing build
   */
  async validateConfiguration() {
    await this.initialize();

    if (this.options.verbose) {
      console.log(chalk.blue("\n🔍 Configuration Validation"));
    }

    try {
      // Validate build configuration
      await this.validator.validateConfiguration();

      // Validate environment setup
      await this.validator.validateEnvironment();

      // Validate source paths
      await this.sourcePackager.validateSourcePaths();

      // Validate version configuration
      await this.versionManager.validateVersioning();

      if (this.options.verbose) {
        console.log(
          chalk.green("✓ All configuration validation checks passed"),
        );
      }

      return true;
    } catch (error) {
      console.error(
        chalk.red(`❌ Configuration validation failed: ${error.message}`),
      );
      throw error;
    }
  }

  /**
   * Execute the complete build process
   */
  async executeBuild() {
    await this.initialize();

    this.buildState.startTime = new Date();

    try {
      if (this.options.verbose) {
        console.log(chalk.blue("\n🚀 Starting 4-Phase Build Process"));
        console.log(chalk.gray(`Environment: ${this.options.environment}`));
        console.log(chalk.gray(`Include Tests: ${this.options.includeTests}`));
        console.log("");
      }

      // Phase 1: Pre-build validation
      console.log(chalk.blue("🔄 Executing Phase 1..."));
      await this.executePhase1();
      console.log(chalk.green("✓ Phase 1 completed, transitioning to Phase 2"));

      // Phase 2: Source packaging
      console.log(chalk.blue("🔄 Executing Phase 2..."));
      await this.executePhase2();
      console.log(chalk.green("✓ Phase 2 completed, transitioning to Phase 3"));

      // Phase 3: Version and metadata generation
      console.log(chalk.blue("🔄 Executing Phase 3..."));
      await this.executePhase3();
      console.log(chalk.green("✓ Phase 3 completed, transitioning to Phase 4"));

      // Phase 4: Post-build validation
      console.log(chalk.blue("🔄 Executing Phase 4..."));
      await this.executePhase4();
      console.log(chalk.green("✓ Phase 4 completed"));

      this.buildState.endTime = new Date();
      const duration = this.buildState.endTime - this.buildState.startTime;

      console.log(chalk.green("\n✅ Build Process Completed Successfully"));
      if (this.options.verbose) {
        console.log(chalk.gray(`Duration: ${Math.round(duration / 1000)}s`));
        console.log(
          chalk.gray(`Artifacts: ${this.buildState.artifactPaths.length}`),
        );
        this.displayBuildSummary();
      }
    } catch (error) {
      this.buildState.errors.push(error);
      console.error(
        chalk.red(
          `❌ Build failed in Phase ${this.buildState.phase}: ${error.message}`,
        ),
      );
      throw error;
    }
  }

  /**
   * Phase 1: Pre-build validation and environment checks
   * @private
   */
  async executePhase1() {
    this.buildState.phase = 1;

    if (this.options.verbose) {
      console.log(chalk.blue("📋 Phase 1: Pre-build Validation"));
    }

    try {
      // Environment validation
      await this.validator.validateEnvironment();

      // Configuration validation
      await this.validator.validateConfiguration();

      // Git repository validation
      await this.validator.validateGitRepository();

      // File system permissions
      await this.validator.validateFileSystemPermissions();

      if (this.options.verbose) {
        console.log(
          chalk.green("✓ Phase 1 completed: All pre-build validations passed"),
        );
      }
    } catch (error) {
      throw new Error(`Phase 1 validation failed: ${error.message}`);
    }
  }

  /**
   * Phase 2: Focused deployment packaging with structured organization
   * @private
   */
  async executePhase2() {
    this.buildState.phase = 2;

    if (this.options.verbose) {
      console.log(chalk.blue("📦 Phase 2: Focused Deployment Packaging"));
    }

    try {
      console.log(chalk.blue("  📁 Creating build directories..."));
      // Create build directories
      await this.createBuildDirectories();
      console.log(chalk.gray("    ✓ Build directories created successfully"));

      console.log(chalk.blue("  📦 Packaging source code..."));
      // Phase 2 now just creates the package structure without deployment metadata
      // Metadata will be added in Phase 3 for better integration
      const deploymentArtifacts = await this.sourcePackager.packageSource();
      console.log(
        chalk.gray(
          `    ✓ Source packaging completed: ${deploymentArtifacts.length} artifacts`,
        ),
      );
      this.buildState.artifactPaths.push(...deploymentArtifacts);

      // Package additional database artifacts if legacy mode is enabled
      if (this.shouldIncludeLegacyDatabasePackaging()) {
        console.log(chalk.blue("  🗄️  Packaging legacy database artifacts..."));
        const dbArtifacts = await this.sourcePackager.packageDatabase();
        console.log(
          chalk.gray(
            `    ✓ Database packaging completed: ${dbArtifacts.length} artifacts`,
          ),
        );
        this.buildState.artifactPaths.push(...dbArtifacts);
      } else {
        console.log(
          chalk.gray(
            "    ℹ️  Legacy database packaging skipped for this environment",
          ),
        );
      }

      if (this.options.verbose) {
        console.log(
          chalk.green(
            `✓ Phase 2 completed: ${deploymentArtifacts.length} deployment artifacts created`,
          ),
        );
      }
    } catch (error) {
      console.error(
        chalk.red(`❌ Phase 2 error at step: ${this.buildState.phase}`),
      );
      console.error(chalk.red(`Error details: ${error.message}`));
      if (error.stack && this.options.verbose) {
        console.error(chalk.gray("Stack trace:"), error.stack);
      }
      throw new Error(`Phase 2 deployment packaging failed: ${error.message}`);
    }
  }

  /**
   * Phase 3: Version management and metadata generation with deployment integration
   * @private
   */
  async executePhase3() {
    this.buildState.phase = 3;

    if (this.options.verbose) {
      console.log(chalk.blue("📄 Phase 3: Version and Metadata Generation"));
    }

    try {
      // Generate version information with proper initialization
      this.versionManager.initialize();
      const versionInfo = this.versionManager.generateVersionMetadata(
        this.options.environment,
      );

      // Generate simplified deployment manifest
      const deploymentManifest =
        this.metadataGenerator.generateDeploymentManifest(
          this.buildState,
          versionInfo,
          this.options.environment,
        );

      // Generate deployment README
      const deploymentReadme = this.metadataGenerator.generateDeploymentReadme(
        versionInfo,
        this.options.environment,
      );

      // Add metadata directly to existing deployment archives (avoid re-packaging loop)
      if (this.buildState.artifactPaths.length > 0) {
        if (this.options.verbose) {
          console.log(
            chalk.blue(
              "    📋 Integrating deployment metadata into existing package...",
            ),
          );
        }

        // Add metadata to each existing deployment artifact
        const enhancedArtifacts = [];
        for (const artifactPath of this.buildState.artifactPaths) {
          // Only enhance tar.gz deployment packages, skip other artifacts
          if (
            artifactPath.includes("deployment") &&
            artifactPath.endsWith(".tar.gz")
          ) {
            const enhancedPath = await this.addMetadataToExistingArchive(
              artifactPath,
              deploymentManifest,
              deploymentReadme,
            );
            enhancedArtifacts.push(enhancedPath);
          } else {
            // Keep other artifacts unchanged (separate manifest files, etc.)
            enhancedArtifacts.push(artifactPath);
          }
        }

        // Update the artifact paths with enhanced versions
        this.buildState.artifactPaths = enhancedArtifacts;
      }

      // Also export metadata separately for build system reference
      const outputDir = path.resolve(
        __dirname,
        "../../../",
        this.config.build.outputDirectory,
      );
      const separateManifestResult =
        this.metadataGenerator.exportDeploymentManifest(
          outputDir,
          deploymentManifest,
        );
      const separateReadmeResult =
        this.metadataGenerator.exportDeploymentReadme(
          outputDir,
          deploymentReadme,
        );

      // Track these as additional artifacts (not for deployment but for reference)
      this.buildState.artifactPaths.push(
        separateManifestResult.path,
        separateReadmeResult.path,
      );

      if (this.options.verbose) {
        console.log(
          chalk.green(
            "✓ Phase 3 completed: Deployment manifest and README integrated into package",
          ),
        );
      }
    } catch (error) {
      throw new Error(`Phase 3 metadata generation failed: ${error.message}`);
    }
  }

  /**
   * Phase 4: Post-build validation and artifact verification
   * @private
   */
  async executePhase4() {
    this.buildState.phase = 4;

    if (this.options.verbose) {
      console.log(chalk.blue("✅ Phase 4: Post-build Validation"));
    }

    try {
      // Validate all created artifacts
      await this.validator.validateArtifacts(this.buildState.artifactPaths);

      // Validate archive integrity
      await this.validator.validateArchiveIntegrity(
        this.buildState.artifactPaths,
      );

      // Validate metadata consistency
      await this.validator.validateMetadataConsistency(
        this.buildState.artifactPaths,
      );

      // Environment-specific validation
      if (
        this.config.environments[this.options.environment]
          .compatibility_validation
      ) {
        await this.validator.validateEnvironmentCompatibility();
      }

      if (this.options.verbose) {
        console.log(
          chalk.green("✓ Phase 4 completed: All post-build validations passed"),
        );
      }
    } catch (error) {
      const errorMessage =
        error.error || error.message || JSON.stringify(error);
      throw new Error(`Phase 4 validation failed: ${errorMessage}`);
    }
  }

  /**
   * Create build output directories
   * @private
   */
  async createBuildDirectories() {
    const outputDir = path.resolve(
      __dirname,
      "../../../",
      this.config.build.outputDirectory,
    );
    const tempDir = path.resolve(
      __dirname,
      "../../../",
      this.config.build.tempDirectory,
    );

    try {
      await fs.mkdir(outputDir, { recursive: true });
      await fs.mkdir(tempDir, { recursive: true });

      if (this.options.verbose) {
        console.log(chalk.gray(`✓ Build directories created: ${outputDir}`));
      }
    } catch (error) {
      throw new Error(`Failed to create build directories: ${error.message}`);
    }
  }

  /**
   * Check if legacy database packaging should be included for current environment
   * @private
   */
  shouldIncludeLegacyDatabasePackaging() {
    const envConfig = this.config.environments[this.options.environment];
    // Legacy database packaging is only needed for specific configurations
    return envConfig.legacy_database_option === "consolidated";
  }

  /**
   * Display build summary with progress reporting
   * @private
   */
  displayBuildSummary() {
    console.log(chalk.blue("\n📊 Build Summary"));
    console.log(chalk.gray("Artifacts created:"));

    this.buildState.artifactPaths.forEach((artifactPath) => {
      const relativePath = path.relative(process.cwd(), artifactPath);
      console.log(chalk.gray(`  • ${relativePath}`));
    });

    if (this.buildState.warnings.length > 0) {
      console.log(
        chalk.yellow(`\n⚠️  ${this.buildState.warnings.length} warning(s):`),
      );
      this.buildState.warnings.forEach((warning) => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }

    const envConfig = this.config.environments[this.options.environment];
    console.log(chalk.gray(`\nEnvironment: ${this.options.environment}`));
    console.log(chalk.gray(`Version format: ${envConfig.version_format}`));
    console.log(chalk.gray(`Compression: ${envConfig.compression}`));
    console.log(chalk.gray(`Validation: ${envConfig.validation_strictness}`));
  }

  /**
   * Add warning to build state
   * @param {string} message - Warning message
   */
  addWarning(message) {
    this.buildState.warnings.push(message);
    if (this.options.verbose) {
      console.log(chalk.yellow(`⚠️  ${message}`));
    }
  }

  /**
   * Get build state for external access
   */
  getBuildState() {
    return { ...this.buildState };
  }

  /**
   * Get configuration for external access
   */
  getConfiguration() {
    return { ...this.config };
  }

  /**
   * Add metadata files directly to existing tar.gz archive without re-packaging
   * Extracts archive, adds metadata files, re-compresses to avoid infinite loop
   * @private
   * @param {string} archivePath - Path to existing deployment archive
   * @param {object} deploymentManifest - Deployment manifest object
   * @param {string} deploymentReadme - README content string
   * @returns {string} Path to enhanced archive
   */
  async addMetadataToExistingArchive(
    archivePath,
    deploymentManifest,
    deploymentReadme,
  ) {
    const tempDir = path.resolve(
      __dirname,
      "../../../",
      this.config.build.tempDirectory,
    );
    const tempExtractionDir = path.join(
      tempDir,
      `metadata-enhancement-${Date.now()}`,
    );

    try {
      if (this.options.verbose) {
        console.log(
          chalk.gray(
            "      📂 Extracting existing archive for metadata integration...",
          ),
        );
      }

      // Create temporary extraction directory
      await fs.mkdir(tempExtractionDir, { recursive: true });

      // Extract the existing tar.gz archive
      await tar.extract({
        file: archivePath,
        cwd: tempExtractionDir,
      });

      // Add deployment manifest if provided
      if (deploymentManifest) {
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, 19);
        const manifestPath = path.join(
          tempExtractionDir,
          `DEPLOYMENT_MANIFEST_${timestamp}.json`,
        );
        await fs.writeFile(
          manifestPath,
          JSON.stringify(deploymentManifest, null, 2),
          "utf8",
        );

        if (this.options.verbose) {
          console.log(
            chalk.gray(
              `      ✓ Added deployment manifest: ${path.basename(manifestPath)}`,
            ),
          );
        }
      }

      // Add deployment README if provided
      if (deploymentReadme) {
        const readmePath = path.join(tempExtractionDir, "DEPLOYMENT_README.md");
        await fs.writeFile(readmePath, deploymentReadme, "utf8");

        if (this.options.verbose) {
          console.log(chalk.gray("      ✓ Added deployment README"));
        }
      }

      // Create new archive name maintaining proper .tar.gz extension
      const parsedPath = path.parse(archivePath);
      // For .tar.gz files, we need to handle the double extension properly
      let enhancedArchiveName;
      if (parsedPath.name.endsWith(".tar") && parsedPath.ext === ".gz") {
        // Handle .tar.gz properly: remove .tar from name, add -enhanced, then restore .tar.gz
        const baseName = parsedPath.name.slice(0, -4); // remove .tar
        enhancedArchiveName = `${baseName}-enhanced.tar.gz`;
      } else {
        // Fallback for other extensions
        enhancedArchiveName = `${parsedPath.name}-enhanced${parsedPath.ext}`;
      }
      const enhancedArchivePath = path.join(
        parsedPath.dir,
        enhancedArchiveName,
      );

      // Re-compress the archive with metadata included
      await tar.create(
        {
          gzip: true,
          file: enhancedArchivePath,
          cwd: tempExtractionDir,
        },
        await fs.readdir(tempExtractionDir),
      );

      // Clean up temporary extraction directory
      await fs.rm(tempExtractionDir, { recursive: true, force: true });

      // Remove original archive and replace with enhanced version
      await fs.unlink(archivePath);

      if (this.options.verbose) {
        console.log(
          chalk.gray(
            "      ✓ Metadata integration completed, archive enhanced",
          ),
        );
      }

      return enhancedArchivePath;
    } catch (error) {
      // Clean up on error
      try {
        await fs.rm(tempExtractionDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn(
          chalk.yellow(
            `Warning: Failed to clean up temp directory: ${cleanupError.message}`,
          ),
        );
      }
      throw new Error(`Failed to add metadata to archive: ${error.message}`);
    }
  }
}

export default BuildOrchestrator;
