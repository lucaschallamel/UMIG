/**
 * SourcePackager.js - US-088 Phase 3: Focused Deployment Packaging
 *
 * Creates focused deployment packages with structured directory organization.
 * Generates deployment-ready packages with only essential components.
 *
 * Features:
 * - Structured deployment package creation (umig/, database/, documentation/)
 * - Database schema dump generation with pg_dump
 * - Focused inclusion patterns for deployment-only files
 * - Archive creation with deployment-ready organization
 * - Cross-environment deployment package support
 *
 * @module SourcePackager
 * @version 2.0.0 - Focused Deployment Implementation
 * @created 2025-09-25
 * @pattern ES6 modules with deployment-focused architecture
 * @compliance UMIG deployment patterns, ScriptRunner compatibility
 */

import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import * as tar from 'tar';
import { glob } from 'glob';
import chalk from 'chalk';
import { pipeline } from 'stream/promises';
import zlib from 'zlib';
import { spawn } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SourcePackager - Packages source code according to build configuration
 *
 * Implements file inclusion/exclusion logic, creates compressed archives,
 * and validates source integrity for deployment packaging.
 */
export class SourcePackager {
  constructor(config, options = {}) {
    this.config = config;
    this.options = {
      environment: options.environment || 'dev',
      includeTests: options.includeTests || false,
      verbose: options.verbose || false,
      ...options
    };

    // Environment-specific configuration
    this.envConfig = this.config.environments[this.options.environment];

    // Paths and directories
    this.baseDir = path.resolve(__dirname, '../../../', this.config.source.baseDirectory);
    this.outputDir = path.resolve(__dirname, '../../../', this.config.build.outputDirectory);
    this.tempDir = path.resolve(__dirname, '../../../', this.config.build.tempDirectory);

    // Packaging state
    this.packagedFiles = [];
    this.excludedFiles = [];
    this.validationErrors = [];
  }

  /**
   * Package source code into focused deployment structure
   * @param {object} deploymentManifest - Optional deployment manifest to include
   * @param {string} deploymentReadme - Optional README content to include
   * @returns {string[]} Array of created artifact paths
   */
  async packageSource(deploymentManifest = null, deploymentReadme = null) {
    if (this.options.verbose) {
      console.log(chalk.blue('  📦 Creating focused deployment package...'));
    }

    try {
      console.log(chalk.blue('    🔍 Validating deployment structure...'));
      // Validate deployment structure first
      await this.validateDeploymentStructure();
      console.log(chalk.gray('      ✓ Deployment structure validation passed'));

      console.log(chalk.blue('    📁 Creating deployment directory structure...'));
      // Create deployment structure in temp directory
      const deploymentDir = await this.createDeploymentStructure();
      console.log(chalk.gray(`      ✓ Deployment directory created: ${path.basename(deploymentDir)}`));

      console.log(chalk.blue('    📦 Packaging UMIG core application...'));
      // Package core UMIG application
      await this.packageUmigCore(deploymentDir);
      console.log(chalk.gray('      ✓ UMIG core packaging completed'));

      console.log(chalk.blue('    🗄️  Packaging database assets...'));
      // Package database assets
      await this.packageDatabaseAssets(deploymentDir);
      console.log(chalk.gray('      ✓ Database assets packaging completed'));

      console.log(chalk.blue('    📚 Packaging deployment documentation...'));
      // Package deployment documentation
      await this.packageDeploymentDocumentation(deploymentDir);
      console.log(chalk.gray('      ✓ Documentation packaging completed'));

      // Add deployment manifest and README to archive root
      if (deploymentManifest || deploymentReadme) {
        console.log(chalk.blue('    📋 Adding deployment metadata...'));
        await this.addDeploymentMetadata(deploymentDir, deploymentManifest, deploymentReadme);
        console.log(chalk.gray('      ✓ Deployment metadata added'));
      }

      console.log(chalk.blue('    🗜️  Creating deployment archive...'));
      // Create final deployment archive
      const archivePath = await this.createDeploymentArchive(deploymentDir);
      console.log(chalk.gray(`      ✓ Archive created: ${path.basename(archivePath)}`));

      console.log(chalk.blue('    ✅ Validating created archive...'));
      // Validate created archive
      await this.validateArchive(archivePath);
      console.log(chalk.gray('      ✓ Archive validation passed'));

      if (this.options.verbose) {
        console.log(chalk.gray(`    ✓ Deployment package: ${path.basename(archivePath)}`));
      }

      return [archivePath];

    } catch (error) {
      console.error(chalk.red(`❌ SourcePackager error: ${error.message}`));
      if (error.stack && this.options.verbose) {
        console.error(chalk.gray('SourcePackager stack trace:'), error.stack);
      }
      throw new Error(`Deployment packaging failed: ${error.message}`);
    }
  }

  /**
   * Package database scripts (Liquibase or consolidated)
   * @returns {string[]} Array of created artifact paths
   */
  async packageDatabase() {
    if (this.options.verbose) {
      console.log(chalk.blue('  🗄️ Packaging database scripts...'));
    }

    try {
      const dbArtifacts = [];

      if (this.envConfig.database_option === 'liquibase') {
        const liquibaseArchive = await this.packageLiquibaseScripts();
        dbArtifacts.push(liquibaseArchive);
      } else if (this.envConfig.database_option === 'consolidated') {
        const consolidatedScript = await this.packageConsolidatedDatabase();
        dbArtifacts.push(consolidatedScript);
      }

      if (this.options.verbose && dbArtifacts.length > 0) {
        console.log(chalk.gray(`    ✓ Database artifacts: ${dbArtifacts.length}`));
      }

      return dbArtifacts;

    } catch (error) {
      throw new Error(`Database packaging failed: ${error.message}`);
    }
  }

  /**
   * Create deployment directory structure
   * @private
   * @returns {string} Path to deployment directory
   */
  async createDeploymentStructure() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const deploymentDir = path.join(this.tempDir, `deployment-package-${timestamp}`);

    const structureDirs = [
      path.join(deploymentDir, 'umig'),
      path.join(deploymentDir, 'database'),
      path.join(deploymentDir, 'documentation')
    ];

    for (const dir of structureDirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    if (this.options.verbose) {
      console.log(chalk.gray(`    ✓ Created deployment structure: ${path.relative(this.baseDir, deploymentDir)}`));
    }

    return deploymentDir;
  }

  /**
   * Package UMIG core application files
   * @private
   * @param {string} deploymentDir - Deployment directory path
   */
  async packageUmigCore(deploymentDir) {
    const umigConfig = this.config.source.deploymentStructure.umig;
    const umigDir = path.join(deploymentDir, 'umig');

    if (this.options.verbose) {
      console.log(chalk.blue('    📁 Packaging UMIG core application...'));
    }

    // Collect UMIG core files
    const umigFiles = await this.collectFilesForSection('umig', umigConfig);

    // Copy files to deployment structure maintaining relative paths from src/groovy/umig
    let copiedCount = 0;
    for (const filePath of umigFiles) {
      const relativePath = path.relative(path.join(this.baseDir, 'src/groovy/umig'), filePath);
      const targetPath = path.join(umigDir, relativePath);

      // Ensure target directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // Copy file
      await fs.copyFile(filePath, targetPath);
      copiedCount++;
    }

    if (this.options.verbose) {
      console.log(chalk.gray(`      ✓ Copied ${copiedCount} UMIG core files`));
    }

    return copiedCount;
  }

  /**
   * Package database deployment assets
   * @private
   * @param {string} deploymentDir - Deployment directory path
   */
  async packageDatabaseAssets(deploymentDir) {
    const databaseConfig = this.config.source.deploymentStructure.database;
    const databaseDir = path.join(deploymentDir, 'database');

    if (this.options.verbose) {
      console.log(chalk.blue('    🗄️ Packaging database assets...'));
    }

    // Generate schema dump if enabled
    if (databaseConfig.generateSchemaDump) {
      try {
        await this.generateSchemaDump(databaseDir);
        if (this.options.verbose) {
          console.log(chalk.gray('      ✓ Schema dump completed successfully'));
        }
      } catch (error) {
        if (this.options.verbose) {
          console.log(chalk.yellow(`      ⚠️  Schema dump failed: ${error.message}`));
          console.log(chalk.yellow('      ⚠️  Continuing without schema dump'));
        }
      }
    }

    console.log(chalk.blue('      📁 Collecting Liquibase files...'));
    // Copy Liquibase directory
    const liquibaseFiles = await this.collectFilesForSection('database', databaseConfig);
    console.log(chalk.gray(`      ✓ Found ${liquibaseFiles.length} Liquibase files`));

    const liquibaseTargetDir = path.join(databaseDir, 'liquibase');
    await fs.mkdir(liquibaseTargetDir, { recursive: true });
    console.log(chalk.gray(`      ✓ Created target directory: ${path.basename(liquibaseTargetDir)}`));

    console.log(chalk.blue('      📋 Copying Liquibase files...'));
    let copiedCount = 0;
    for (const filePath of liquibaseFiles) {
      const relativePath = path.relative(path.join(this.baseDir, 'local-dev-setup/liquibase'), filePath);
      const targetPath = path.join(liquibaseTargetDir, relativePath);

      // Ensure target directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // Copy file
      await fs.copyFile(filePath, targetPath);
      copiedCount++;

      if (copiedCount % 10 === 0) {
        console.log(chalk.gray(`      ... copied ${copiedCount}/${liquibaseFiles.length} files`));
      }
    }

    if (this.options.verbose) {
      console.log(chalk.gray(`      ✓ Copied ${copiedCount} Liquibase files`));
    }

    return copiedCount;
  }

  /**
   * Package deployment documentation
   * @private
   * @param {string} deploymentDir - Deployment directory path
   */
  async packageDeploymentDocumentation(deploymentDir) {
    const documentationConfig = this.config.source.deploymentStructure.documentation;
    const documentationTargetDir = path.join(deploymentDir, 'documentation');

    if (this.options.verbose) {
      console.log(chalk.blue('    📚 Packaging deployment documentation...'));
    }

    // Copy deployment documentation
    const documentationFiles = await this.collectFilesForSection('documentation', documentationConfig);

    let copiedCount = 0;
    for (const filePath of documentationFiles) {
      const relativePath = path.relative(path.join(this.baseDir, 'docs/deployment'), filePath);
      const targetPath = path.join(documentationTargetDir, relativePath);

      // Ensure target directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // Copy file
      await fs.copyFile(filePath, targetPath);
      copiedCount++;
    }

    if (this.options.verbose) {
      console.log(chalk.gray(`      ✓ Copied ${copiedCount} documentation files`));
    }

    return copiedCount;
  }

  /**
   * Add deployment manifest and README to deployment package root
   * @private
   * @param {string} deploymentDir - Deployment directory path
   * @param {object} deploymentManifest - Deployment manifest object
   * @param {string} deploymentReadme - README.md content
   */
  async addDeploymentMetadata(deploymentDir, deploymentManifest, deploymentReadme) {
    if (this.options.verbose) {
      console.log(chalk.blue('    📋 Adding deployment metadata to package...'));
    }

    try {
      let addedFiles = 0;

      // Add timestamped deployment manifest
      if (deploymentManifest) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const manifestFilename = `build-manifest-${timestamp}.json`;
        const manifestPath = path.join(deploymentDir, manifestFilename);

        const manifestContent = JSON.stringify(deploymentManifest, null, 2);
        await fs.writeFile(manifestPath, manifestContent, 'utf8');
        addedFiles++;

        if (this.options.verbose) {
          console.log(chalk.gray(`      ✓ Added manifest: ${manifestFilename}`));
        }
      }

      // Add deployment README
      if (deploymentReadme) {
        const readmePath = path.join(deploymentDir, 'README.md');
        await fs.writeFile(readmePath, deploymentReadme, 'utf8');
        addedFiles++;

        if (this.options.verbose) {
          console.log(chalk.gray(`      ✓ Added README: README.md`));
        }
      }

      if (this.options.verbose && addedFiles > 0) {
        console.log(chalk.gray(`    ✓ Added ${addedFiles} deployment metadata files to package`));
      }

    } catch (error) {
      throw new Error(`Failed to add deployment metadata: ${error.message}`);
    }
  }

  /**
   * Collect files for a specific deployment section
   * @private
   * @param {string} sectionName - Section name (umig, database, documentation)
   * @param {object} sectionConfig - Section configuration
   * @returns {string[]} Array of matching file paths
   */
  async collectFilesForSection(sectionName, sectionConfig) {
    const includedFiles = new Set();

    // Process inclusion patterns
    for (const pattern of sectionConfig.inclusionPatterns) {
      const matchedFiles = await this.globPattern(pattern, this.baseDir);
      matchedFiles.forEach(file => includedFiles.add(file));
    }

    // Process exclusion patterns
    const excludedFiles = new Set();
    if (sectionConfig.exclusionPatterns) {
      for (const pattern of sectionConfig.exclusionPatterns) {
        const matchedFiles = await this.globPattern(pattern, this.baseDir);
        matchedFiles.forEach(file => excludedFiles.add(file));
      }
    }

    // Process global exclusion patterns
    if (this.config.source.globalExclusionPatterns) {
      for (const pattern of this.config.source.globalExclusionPatterns) {
        const matchedFiles = await this.globPattern(pattern, this.baseDir);
        matchedFiles.forEach(file => excludedFiles.add(file));
      }
    }

    // Final file list (included - excluded)
    const finalFiles = Array.from(includedFiles).filter(file => !excludedFiles.has(file));

    if (this.options.verbose) {
      console.log(chalk.gray(`      ✓ ${sectionName}: ${finalFiles.length} files (excluded: ${excludedFiles.size})`));
    }

    return finalFiles;
  }

  /**
   * Use glob to find files matching pattern
   * @private
   * @param {string} pattern - Glob pattern
   * @param {string} cwd - Working directory
   * @returns {string[]} Array of matching file paths
   */
  async globPattern(pattern, cwd) {
    try {
      const matches = await glob(pattern, {
        cwd,
        ignore: ['node_modules/**', '.git/**'],
        nodir: true  // Only return files, not directories
      });

      return matches.map(match => path.resolve(cwd, match));
    } catch (error) {
      if (this.options.verbose) {
        console.log(chalk.yellow(`    ⚠️  Pattern '${pattern}' matched no files`));
      }
      return [];
    }
  }

  /**
   * Generate database schema dump using pg_dump
   * @private
   * @param {string} databaseDir - Database directory path
   */
  async generateSchemaDump(databaseDir) {
    console.log(chalk.blue('        🔍 Checking schema dump configuration...'));

    // Check environment-specific override first
    if (this.envConfig.schemaDumpEnabled === false) {
      console.log(chalk.gray(`        ℹ️  Schema dump is disabled for ${this.options.environment} environment`));
      return;
    }

    // Check global configuration
    if (!this.config.database?.schemaDump?.enabled) {
      console.log(chalk.gray('        ℹ️  Schema dump is disabled in global configuration'));
      return;
    }

    const schemaDumpConfig = this.config.database.schemaDump;
    const connectionConfig = this.config.database.connection;
    const outputPath = path.join(databaseDir, schemaDumpConfig.outputFile);

    console.log(chalk.blue('        🗄️ Starting database schema dump generation...'));
    console.log(chalk.gray(`        📍 Output path: ${outputPath}`));

    // Add overall timeout for the entire schema dump operation (15 seconds)
    const overallTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Schema dump operation timed out (15 seconds) - likely database connection issue'));
      }, 15000);
    });

    try {
      console.log(chalk.blue('        🔧 Building pg_dump command...'));
      // Build pg_dump command
      const pgDumpPath = schemaDumpConfig.pgDumpPath || 'pg_dump';
      const args = [
        ...schemaDumpConfig.options,
        `--host=${connectionConfig.host}`,
        `--port=${connectionConfig.port}`,
        `--username=${connectionConfig.username}`,
        `--dbname=${connectionConfig.database}`,
        `--file=${outputPath}`
      ];

      console.log(chalk.gray(`        📋 Command: ${pgDumpPath} ${args.map(arg => arg.includes('--') ? arg : `"${arg}"`).join(' ')}`));

      // Race between pg_dump execution and overall timeout
      await Promise.race([
        this.executePgDump(pgDumpPath, args),
        overallTimeoutPromise
      ]);

      console.log(chalk.blue('        ✅ Verifying schema dump file...'));
      // Verify schema dump was created
      const stat = await fs.stat(outputPath);
      if (stat.size === 0) {
        throw new Error('Generated schema dump is empty');
      }

      console.log(chalk.gray(`        ✓ Schema dump created successfully: ${this.formatSize(stat.size)}`));

    } catch (error) {
      console.log(chalk.red(`        ❌ Schema dump failed: ${error.message}`));
      console.log(chalk.yellow('        ⚠️  This is non-fatal - continuing build without schema dump'));
      console.log(chalk.yellow('        💡 To avoid this: disable schema dump or ensure database is accessible'));

      // Don't fail the entire build for schema dump issues
      // This is intentionally a non-fatal error
    }
  }

  /**
   * Execute pg_dump command with proper environment handling
   * @private
   * @param {string} pgDumpPath - Path to pg_dump executable
   * @param {string[]} args - Command arguments
   */
  async executePgDump(pgDumpPath, args) {
    console.log(chalk.blue(`        🔧 Executing pg_dump: ${pgDumpPath} ${args.join(' ')}`));

    return new Promise((resolve, reject) => {
      const env = { ...process.env };

      // Set PGPASSWORD from environment if available
      if (process.env.POSTGRES_PASSWORD) {
        env.PGPASSWORD = process.env.POSTGRES_PASSWORD;
        console.log(chalk.gray('        ✓ Using POSTGRES_PASSWORD from environment'));
      } else {
        console.log(chalk.yellow('        ⚠️  No POSTGRES_PASSWORD found in environment'));
      }

      console.log(chalk.gray('        🚀 Starting pg_dump process...'));
      const child = spawn(pgDumpPath, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      // Set timeout for pg_dump command (10 seconds to fail fast)
      console.log(chalk.gray('        ⏱️  Setting 10-second timeout for pg_dump'));
      const timeout = setTimeout(() => {
        console.log(chalk.red('        ❌ pg_dump timed out after 10 seconds'));
        child.kill('SIGTERM');
        reject(new Error('pg_dump command timed out (10 seconds) - database connection unavailable'));
      }, 10000);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (this.options.verbose) {
          console.log(chalk.gray('        📄 pg_dump stdout data received'));
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(chalk.yellow(`        ⚠️  pg_dump stderr: ${data.toString().trim()}`));
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        console.log(chalk.gray(`        🏁 pg_dump process closed with code: ${code}`));
        if (code === 0) {
          console.log(chalk.gray('        ✓ pg_dump completed successfully'));
          resolve({ stdout, stderr });
        } else {
          console.log(chalk.red(`        ❌ pg_dump failed with code ${code}`));
          reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        console.log(chalk.red(`        ❌ pg_dump process error: ${error.message}`));
        reject(new Error(`Failed to execute pg_dump: ${error.message}`));
      });
    });
  }

  /**
   * Validate deployment structure and required directories
   * @private
   */
  async validateDeploymentStructure() {
    const errors = [];

    // Check required directories exist
    for (const requiredDir of this.config.source.validation.requiredDirectories) {
      const dirPath = path.join(this.baseDir, requiredDir);
      try {
        const stat = await fs.stat(dirPath);
        if (!stat.isDirectory()) {
          errors.push(`Required path '${requiredDir}' is not a directory`);
        }
      } catch (error) {
        errors.push(`Required directory '${requiredDir}' not found: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      this.validationErrors.push(...errors);
      throw new Error(`Deployment structure validation failed:\n${errors.join('\n')}`);
    }

    // Validate each deployment section
    const deploymentStructure = this.config.source.deploymentStructure;

    for (const [sectionName, sectionConfig] of Object.entries(deploymentStructure)) {
      try {
        const files = await this.collectFilesForSection(sectionName, sectionConfig);
        if (files.length === 0 && sectionName === 'umig') {
          errors.push(`Critical section '${sectionName}' has no files`);
        }
      } catch (error) {
        errors.push(`Section '${sectionName}' validation failed: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      this.validationErrors.push(...errors);
      throw new Error(`Section validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Create deployment archive from structured deployment directory
   * @private
   * @param {string} deploymentDir - Deployment directory path
   * @returns {string} Path to created archive
   */
  async createDeploymentArchive(deploymentDir) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const archiveName = `umig-deployment-${this.options.environment}-${timestamp}.tar.gz`;
    const archivePath = path.join(this.outputDir, archiveName);

    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Get all files and directories to include in archive
      const archiveContents = ['umig', 'database', 'documentation'];

      // Check for manifest and README files in deployment directory
      const deploymentFiles = await fs.readdir(deploymentDir);
      for (const file of deploymentFiles) {
        if (file.startsWith('build-manifest-') && file.endsWith('.json')) {
          archiveContents.push(file);
        } else if (file === 'README.md') {
          archiveContents.push(file);
        }
      }

      // Create tar.gz archive from deployment directory
      await tar.create({
        file: archivePath,
        gzip: this.getCompressionOptions(),
        cwd: deploymentDir,
        portable: true,  // Cross-platform compatibility
        noMtime: false,  // Preserve modification times
      }, archiveContents);

      return archivePath;

    } catch (error) {
      throw new Error(`Failed to create deployment archive: ${error.message}`);
    }
  }

  /**
   * Get compression options based on environment
   * @private
   * @returns {object} Compression configuration
   */
  getCompressionOptions() {
    const compressionLevel = this.envConfig.compression;

    switch (compressionLevel) {
      case 'fast':
        return { level: 1, memLevel: 6 };
      case 'optimal':
        return { level: 6, memLevel: 8 };
      case 'best':
        return { level: 9, memLevel: 9 };
      default:
        return { level: 6, memLevel: 8 };
    }
  }

  /**
   * Package Liquibase database scripts
   * @private
   * @returns {string} Path to created archive
   */
  async packageLiquibaseScripts() {
    const liquibaseDir = path.resolve(__dirname, '../../../', this.config.database.options.liquibase.sourceDirectory);

    try {
      // Check if Liquibase directory exists
      await fs.access(liquibaseDir);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const archiveName = `umig-liquibase-${this.options.environment}-${timestamp}.tar.gz`;
      const archivePath = path.join(this.outputDir, archiveName);

      // Create Liquibase archive
      await tar.create({
        file: archivePath,
        gzip: this.getCompressionOptions(),
        cwd: liquibaseDir,
        portable: true,
      }, ['.']);

      if (this.options.verbose) {
        console.log(chalk.gray(`    ✓ Liquibase archive: ${path.basename(archivePath)}`));
      }

      return archivePath;

    } catch (error) {
      throw new Error(`Failed to package Liquibase scripts: ${error.message}`);
    }
  }

  /**
   * Package consolidated database script
   * @private
   * @returns {string} Path to created script
   */
  async packageConsolidatedDatabase() {
    // This is a placeholder for consolidated database packaging
    // Would typically involve reading all Liquibase changelogs and creating a single SQL file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const version = this.config.version || '1.0.0';
    const scriptName = this.config.database.options.consolidated.outputFile
      .replace('{version}', version)
      .replace('{timestamp}', timestamp);

    const scriptPath = path.join(this.outputDir, scriptName);

    // Create placeholder consolidated script
    const consolidatedContent = `-- UMIG Consolidated Database Script
-- Environment: ${this.options.environment}
-- Version: ${version}
-- Generated: ${new Date().toISOString()}
--
-- This is a placeholder for Phase 3.
-- Future implementation will consolidate all Liquibase changelogs.

-- Placeholder content
SELECT 'Consolidated database script for ${this.options.environment} environment' as status;
`;

    await fs.writeFile(scriptPath, consolidatedContent, 'utf8');

    if (this.options.verbose) {
      console.log(chalk.gray(`    ✓ Consolidated DB script: ${path.basename(scriptPath)}`));
    }

    return scriptPath;
  }

  /**
   * Validate created archive
   * @private
   * @param {string} archivePath - Path to archive to validate
   */
  async validateArchive(archivePath) {
    try {
      // Check archive exists and is readable
      const stat = await fs.stat(archivePath);

      // Check size constraints
      const maxSize = this.parseSize(this.config.source.validation.maxArchiveSize);
      if (stat.size > maxSize) {
        throw new Error(`Archive size (${this.formatSize(stat.size)}) exceeds maximum (${this.config.source.validation.maxArchiveSize})`);
      }

      // Test archive integrity by listing contents
      const archiveContents = [];
      let uncompressedSize = 0;

      await tar.list({
        file: archivePath,
        onentry: (entry) => {
          archiveContents.push(entry.path);
          uncompressedSize += entry.size || 0;
        }
      });

      if (archiveContents.length === 0) {
        throw new Error('Archive appears to be empty');
      }

      // Calculate compression ratio
      const compressionRatio = uncompressedSize > 0 ? ((uncompressedSize - stat.size) / uncompressedSize) * 100 : 0;

      if (compressionRatio < this.config.source.validation.minCompressionRatio) {
        console.log(chalk.yellow(`    ⚠️  Low compression ratio: ${compressionRatio.toFixed(1)}% (minimum: ${this.config.source.validation.minCompressionRatio}%)`));
      }

      if (this.options.verbose) {
        console.log(chalk.gray(`    ✓ Archive size: ${this.formatSize(stat.size)}`));
        console.log(chalk.gray(`    ✓ Compression ratio: ${compressionRatio.toFixed(1)}%`));
        console.log(chalk.gray(`    ✓ Files in archive: ${archiveContents.length}`));
      }

    } catch (error) {
      throw new Error(`Archive validation failed: ${error.message}`);
    }
  }

  /**
   * Validate deployment source paths exist and are accessible
   */
  async validateSourcePaths() {
    try {
      // Check base directory exists
      await fs.access(this.baseDir);

      // Check required deployment directories exist
      for (const requiredDir of this.config.source.validation.requiredDirectories) {
        const dirPath = path.join(this.baseDir, requiredDir);
        try {
          await fs.access(dirPath);
        } catch (error) {
          throw new Error(`Required deployment directory not found: ${requiredDir}`);
        }
      }

      // Validate deployment structure configuration
      if (!this.config.source.deploymentStructure) {
        throw new Error('deploymentStructure configuration is missing');
      }

      const requiredSections = ['umig', 'database', 'documentation'];
      for (const section of requiredSections) {
        if (!this.config.source.deploymentStructure[section]) {
          throw new Error(`deploymentStructure.${section} configuration is missing`);
        }
      }

      if (this.options.verbose) {
        console.log(chalk.gray(`✓ Deployment source paths validated: ${this.baseDir}`));
      }

      return true;

    } catch (error) {
      throw new Error(`Deployment source path validation failed: ${error.message}`);
    }
  }

  /**
   * Parse size string (e.g., "50MB") to bytes
   * @private
   * @param {string} sizeStr - Size string to parse
   * @returns {number} Size in bytes
   */
  parseSize(sizeStr) {
    const units = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)(B|KB|MB|GB)$/i);
    if (!match) throw new Error(`Invalid size format: ${sizeStr}`);

    return parseFloat(match[1]) * units[match[2].toUpperCase()];
  }

  /**
   * Format bytes to human-readable string
   * @private
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted size string
   */
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  /**
   * Get packaging statistics
   * @returns {object} Packaging statistics
   */
  getPackagingStats() {
    return {
      packagedFiles: this.packagedFiles.length,
      excludedFiles: this.excludedFiles.length,
      validationErrors: this.validationErrors.length,
      environment: this.options.environment,
      includeTests: this.options.includeTests
    };
  }
}

export default SourcePackager;