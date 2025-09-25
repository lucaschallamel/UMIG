/**
 * VersionManager.js
 * US-088 Phase 3: Version management for UMIG build system
 * Manages version strings, reads from package.json, formats per environment
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

class VersionManager {
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.packageJsonPath = path.join(projectRoot, 'package.json');
        this.version = null;
        this.buildNumber = null;
        this.gitCommit = null;
        this.timestamp = null;
    }

    /**
     * Initialize version information from package.json and git
     */
    initialize() {
        try {
            this.loadPackageVersion();
            this.generateBuildNumber();
            this.getGitCommit();
            this.setTimestamp();
            
            console.log(`Version initialized: ${this.getFullVersion()}`);
            return true;
        } catch (error) {
            console.error('Failed to initialize version:', error.message);
            return false;
        }
    }

    /**
     * Load version from package.json
     */
    loadPackageVersion() {
        if (!fs.existsSync(this.packageJsonPath)) {
            throw new Error(`package.json not found at ${this.packageJsonPath}`);
        }

        const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
        this.version = packageJson.version;
        
        if (!this.version) {
            throw new Error('Version not found in package.json');
        }
    }

    /**
     * Generate build number from current timestamp
     */
    generateBuildNumber() {
        const now = new Date();
        this.buildNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    }

    /**
     * Get current git commit hash
     */
    getGitCommit() {
        try {
            this.gitCommit = execSync('git rev-parse --short HEAD', { 
                cwd: this.projectRoot,
                encoding: 'utf8' 
            }).trim();
        } catch (error) {
            console.warn('Could not get git commit hash:', error.message);
            this.gitCommit = 'unknown';
        }
    }

    /**
     * Set build timestamp
     */
    setTimestamp() {
        this.timestamp = new Date().toISOString();
    }

    /**
     * Get version formatted for specific environment
     * @param {string} environment - dev, test, staging, uat, prod
     * @returns {string} Formatted version string
     */
    getVersionForEnvironment(environment = 'dev') {
        const envMap = {
            'dev': () => `${this.version}-dev.${this.buildNumber}+${this.gitCommit}`,
            'test': () => `${this.version}-test.${this.buildNumber}+${this.gitCommit}`,
            'staging': () => `${this.version}-rc.${this.buildNumber}+${this.gitCommit}`,
            'uat': () => `${this.version}-uat.${this.buildNumber}+${this.gitCommit}`,
            'prod': () => this.version,
            'production': () => this.version
        };

        const formatter = envMap[environment.toLowerCase()];
        if (!formatter) {
            throw new Error(`Unknown environment: ${environment}`);
        }

        return formatter();
    }

    /**
     * Get full version with all components
     * @returns {string} Complete version string
     */
    getFullVersion() {
        return `${this.version}-build.${this.buildNumber}+${this.gitCommit}`;
    }

    /**
     * Get semantic version components
     * @returns {object} Version components
     */
    getVersionComponents() {
        const [major, minor, patch] = this.version.split('.').map(Number);
        return {
            major,
            minor,
            patch,
            version: this.version,
            buildNumber: this.buildNumber,
            gitCommit: this.gitCommit,
            timestamp: this.timestamp
        };
    }

    /**
     * Generate version metadata object
     * @param {string} environment
     * @returns {object} Version metadata
     */
    generateVersionMetadata(environment = 'dev') {
        return {
            version: this.getVersionForEnvironment(environment),
            baseVersion: this.version,
            buildNumber: this.buildNumber,
            gitCommit: this.gitCommit,
            gitBranch: this.getGitBranch(),
            timestamp: this.timestamp,
            environment: environment,
            buildDate: new Date().toLocaleDateString('en-AU'),
            buildTime: new Date().toLocaleTimeString('en-AU'),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };
    }

    /**
     * Get current git branch
     * @returns {string} Git branch name
     */
    getGitBranch() {
        try {
            return execSync('git rev-parse --abbrev-ref HEAD', {
                cwd: this.projectRoot,
                encoding: 'utf8'
            }).trim();
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Check if current version is a release version
     * @returns {boolean} True if release version
     */
    isReleaseVersion() {
        return !/-(alpha|beta|rc|dev|test)/.test(this.version);
    }

    /**
     * Increment version number
     * @param {string} type - major, minor, patch
     * @returns {string} New version
     */
    incrementVersion(type = 'patch') {
        const components = this.getVersionComponents();
        
        switch (type.toLowerCase()) {
            case 'major':
                components.major += 1;
                components.minor = 0;
                components.patch = 0;
                break;
            case 'minor':
                components.minor += 1;
                components.patch = 0;
                break;
            case 'patch':
            default:
                components.patch += 1;
                break;
        }

        const newVersion = `${components.major}.${components.minor}.${components.patch}`;
        
        // Update package.json
        const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
        packageJson.version = newVersion;
        fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        
        this.version = newVersion;
        return newVersion;
    }

    /**
     * Validate version format
     * @param {string} version
     * @returns {boolean} True if valid semantic version
     */
    validateVersion(version = this.version) {
        const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
        return semverRegex.test(version);
    }

    /**
     * Validate versioning configuration for build process
     * @returns {Promise<boolean>} True if validation passes
     */
    async validateVersioning() {
        try {
            // Initialize if not already done
            if (!this.version) {
                this.initialize();
            }

            // Validate package.json exists and has version
            if (!fs.existsSync(this.packageJsonPath)) {
                throw new Error('package.json not found');
            }

            if (!this.version) {
                throw new Error('No version found in package.json');
            }

            // Validate version format
            if (!this.validateVersion()) {
                throw new Error(`Invalid version format: ${this.version}`);
            }

            console.log(`✓ Version validation passed: ${this.version}`);
            return true;
        } catch (error) {
            console.error(`❌ Version validation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Export version information to file
     * @param {string} outputPath - Output file path
     * @param {string} environment - Target environment
     * @param {string} format - json, js, env
     */
    exportVersionInfo(outputPath, environment = 'dev', format = 'json') {
        const metadata = this.generateVersionMetadata(environment);
        
        let content;
        switch (format.toLowerCase()) {
            case 'json':
                content = JSON.stringify(metadata, null, 2);
                break;
            case 'js':
                content = `// Auto-generated version information\nexport const VERSION_INFO = ${JSON.stringify(metadata, null, 2)};\n`;
                break;
            case 'env':
                content = Object.entries(metadata)
                    .map(([key, value]) => `${key.toUpperCase()}=${value}`)
                    .join('\n') + '\n';
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

        fs.writeFileSync(outputPath, content);
        console.log(`Version info exported to ${outputPath} (format: ${format})`);
    }

    /**
     * Get version summary for logging
     * @returns {string} Version summary
     */
    getSummary() {
        return [
            `Version: ${this.version}`,
            `Build: ${this.buildNumber}`,
            `Commit: ${this.gitCommit}`,
            `Branch: ${this.getGitBranch()}`,
            `Timestamp: ${this.timestamp}`
        ].join(' | ');
    }
}

export default VersionManager;
