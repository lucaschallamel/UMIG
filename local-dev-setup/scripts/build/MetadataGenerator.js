/**
 * MetadataGenerator.js
 * US-088 Phase 3: Metadata generation for UMIG build system
 * Generates build manifests, integrates with ComponentVersionTracker concepts, multiple export formats
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import os from 'os';

class MetadataGenerator {
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.metadata = {
            build: {},
            project: {},
            environment: {},
            files: [],
            dependencies: {},
            git: {},
            system: {},
            validation: {},
            components: {}
        };
    }

    /**
     * Generate complete build metadata
     * @param {object} buildInfo - Build information from BuildOrchestrator
     * @param {object} versionInfo - Version information from VersionManager
     * @param {object} validationResults - Results from BuildValidator
     * @returns {object} Complete metadata object
     */
    generateBuildMetadata(buildInfo, versionInfo, validationResults) {
        console.log('📊 Generating build metadata...');

        this.collectProjectMetadata();
        this.collectEnvironmentMetadata();
        this.collectGitMetadata();
        this.collectSystemMetadata();
        this.collectDependencyMetadata();
        this.collectComponentMetadata();

        // Integrate provided information
        this.metadata.build = {
            ...buildInfo,
            timestamp: new Date().toISOString(),
            duration: buildInfo.endTime ? buildInfo.endTime - buildInfo.startTime : null,
            success: buildInfo.success || false,
            outputPath: buildInfo.outputPath,
            outputSize: this.getFileSize(buildInfo.outputPath)
        };

        this.metadata.version = versionInfo;
        this.metadata.validation = validationResults;

        // Generate file manifest
        if (buildInfo.outputPath && fs.existsSync(buildInfo.outputPath)) {
            this.generateFileManifest(buildInfo.outputPath);
        }

        console.log('✅ Build metadata generated successfully');
        return this.metadata;
    }

    /**
     * Generate simplified deployment manifest for recipients
     * @param {object} buildInfo - Build information
     * @param {object} versionInfo - Version information
     * @param {string} environment - Target environment
     * @returns {object} Simplified deployment manifest
     */
    generateDeploymentManifest(buildInfo, versionInfo, environment = 'dev') {
        console.log('📋 Generating deployment manifest...');

        // Collect essential component info
        this.collectComponentMetadata();

        // Calculate archive size if available
        const archiveSize = buildInfo.artifactPaths && buildInfo.artifactPaths.length > 0
            ? this.getFileSize(buildInfo.artifactPaths[0])
            : 0;

        const buildDuration = buildInfo.endTime && buildInfo.startTime
            ? Math.round((buildInfo.endTime - buildInfo.startTime) / 1000)
            : null;

        const deploymentManifest = {
            packageInfo: {
                name: "UMIG Deployment Package",
                version: versionInfo.version || '1.0.0',
                environment: environment,
                buildDate: new Date().toLocaleString('en-AU', {
                    timeZone: 'Europe/Zurich',
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }),
                buildDuration: buildDuration ? `${buildDuration}s` : 'unknown'
            },
            contents: {
                umig: {
                    files: this.metadata.components?.summary?.totalComponents || 0,
                    description: "Core ScriptRunner application with admin GUI components"
                },
                database: {
                    files: "36+",
                    description: "Liquibase migrations and database assets"
                },
                documentation: {
                    files: "6+",
                    description: "Deployment guides and setup instructions"
                }
            },
            deployment: {
                instructions: "See README.md for deployment steps",
                requirements: ["ScriptRunner 9.21+", "PostgreSQL 14+"],
                archiveSize: archiveSize > 0 ? this.formatBytes(archiveSize) : 'unknown'
            },
            buildInfo: {
                gitCommit: versionInfo.gitCommit || 'unknown',
                gitBranch: versionInfo.gitBranch || 'unknown',
                nodeVersion: versionInfo.nodeVersion || process.version,
                buildHost: this.metadata.environment?.hostname || 'unknown'
            }
        };

        console.log('✅ Deployment manifest generated successfully');
        return deploymentManifest;
    }

    /**
     * Generate user-friendly README.md for deployment recipients
     * @param {object} versionInfo - Version information
     * @param {string} environment - Target environment
     * @returns {string} README.md content
     */
    generateDeploymentReadme(versionInfo, environment = 'dev') {
        const buildDate = new Date().toLocaleString('en-AU', {
            timeZone: 'Europe/Zurich',
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const version = versionInfo.version || '1.0.0';
        const envLabel = environment.toUpperCase();

        return `# UMIG Deployment Package

**Version**: ${version}
**Environment**: ${envLabel}
**Build Date**: ${buildDate}
**Git Commit**: ${versionInfo.gitCommit || 'unknown'}

## Package Contents

This deployment package contains everything needed to deploy UMIG (Unified Migration Implementation Guide) to your ${envLabel} environment.

### 📁 Directory Structure

- **\`umig/\`** - Core ScriptRunner application files
  - Web components and admin GUI
  - API endpoints and business logic
  - Groovy services and repositories

- **\`database/\`** - Database deployment assets
  - Liquibase migration scripts
  - Database schema definitions
  - Setup and configuration scripts

- **\`documentation/\`** - Deployment guides
  - Installation instructions
  - Configuration requirements
  - Troubleshooting guides

## 🚀 Quick Deployment

### Prerequisites
- **ScriptRunner**: Version 9.21.0 or higher
- **PostgreSQL**: Version 14 or higher
- **Confluence**: Compatible with your ScriptRunner version

### Deployment Steps

1. **Extract Package**
   \`\`\`bash
   tar -xzf umig-deployment-${environment}-*.tar.gz
   cd umig-deployment/
   \`\`\`

2. **Database Setup**
   - Follow instructions in \`database/README.md\`
   - Run Liquibase migrations: \`liquibase update\`

3. **ScriptRunner Deployment**
   - Copy \`umig/\` contents to your ScriptRunner directory
   - Restart Confluence to load new scripts
   - Access admin GUI at: \`/plugins/servlet/upm\`

### 📋 Post-Deployment Verification

- [ ] Database migrations completed successfully
- [ ] ScriptRunner scripts loaded without errors
- [ ] Admin GUI accessible and functional
- [ ] API endpoints responding correctly

## 📞 Support

**Technical Contact**: UMIG Development Team
**Documentation**: See \`documentation/\` directory
**Issues**: Check Confluence logs and ScriptRunner console

---

*Package generated: ${buildDate}*
*Build System: UMIG Build Orchestrator v${versionInfo.nodeVersion || 'unknown'}*
`;
    }

    /**
     * Collect project-specific metadata
     */
    collectProjectMetadata() {
        try {
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                this.metadata.project = {
                    name: packageJson.name || 'unknown',
                    description: packageJson.description || '',
                    version: packageJson.version || '0.0.0',
                    author: packageJson.author || 'unknown',
                    license: packageJson.license || 'unknown',
                    repository: packageJson.repository || null,
                    homepage: packageJson.homepage || null,
                    keywords: packageJson.keywords || [],
                    engines: packageJson.engines || {},
                    scripts: packageJson.scripts ? Object.keys(packageJson.scripts) : []
                };
            }

            // Collect build configuration
            const buildConfigPath = path.join(this.projectRoot, 'local-dev-setup/build-config.json');
            if (fs.existsSync(buildConfigPath)) {
                const buildConfig = JSON.parse(fs.readFileSync(buildConfigPath, 'utf8'));
                this.metadata.project.buildConfig = {
                    sources: buildConfig.sources?.length || 0,
                    excludePatterns: buildConfig.excludePatterns?.length || 0,
                    includePatterns: buildConfig.includePatterns?.length || 0,
                    environments: buildConfig.environments ? Object.keys(buildConfig.environments) : []
                };
            }
        } catch (error) {
            console.warn('Could not collect project metadata:', error.message);
        }
    }

    /**
     * Collect environment metadata
     */
    collectEnvironmentMetadata() {
        this.metadata.environment = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            hostname: os.hostname(),
            user: process.env.USER || process.env.USERNAME || 'unknown',
            cwd: process.cwd(),
            pid: process.pid,
            memory: process.memoryUsage(),
            cpus: os.cpus().length,
            loadAverage: process.platform !== 'win32' ? os.loadavg() : null,
            uptime: os.uptime(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: Intl.DateTimeFormat().resolvedOptions().locale
        };

        // Add environment variables (filtered for security)
        this.metadata.environment.variables = this.getFilteredEnvironmentVariables();
    }

    /**
     * Collect git metadata
     */
    collectGitMetadata() {
        try {
            this.metadata.git = {
                commit: this.execGit('git rev-parse HEAD'),
                shortCommit: this.execGit('git rev-parse --short HEAD'),
                branch: this.execGit('git rev-parse --abbrev-ref HEAD'),
                tag: this.getGitTag(),
                remoteUrl: this.getGitRemoteUrl(),
                author: this.execGit('git log -1 --pretty=format:"%an"'),
                authorEmail: this.execGit('git log -1 --pretty=format:"%ae"'),
                commitDate: this.execGit('git log -1 --pretty=format:"%ai"'),
                commitMessage: this.execGit('git log -1 --pretty=format:"%s"'),
                isDirty: this.isGitDirty(),
                stats: this.getGitStats()
            };
        } catch (error) {
            console.warn('Could not collect git metadata:', error.message);
            this.metadata.git = { error: error.message };
        }
    }

    /**
     * Collect system metadata
     */
    collectSystemMetadata() {
        this.metadata.system = {
            os: {
                type: os.type(),
                release: os.release(),
                version: os.version(),
                platform: os.platform(),
                arch: os.arch()
            },
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                usage: process.memoryUsage()
            },
            network: os.networkInterfaces(),
            timestamp: new Date().toISOString(),
            buildTime: Date.now()
        };
    }

    /**
     * Collect dependency metadata
     */
    collectDependencyMetadata() {
        try {
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                
                this.metadata.dependencies = {
                    production: packageJson.dependencies || {},
                    development: packageJson.devDependencies || {},
                    optional: packageJson.optionalDependencies || {},
                    peer: packageJson.peerDependencies || {},
                    bundled: packageJson.bundledDependencies || []
                };

                // Count dependencies
                this.metadata.dependencies.counts = {
                    production: Object.keys(this.metadata.dependencies.production).length,
                    development: Object.keys(this.metadata.dependencies.development).length,
                    total: Object.keys({
                        ...this.metadata.dependencies.production,
                        ...this.metadata.dependencies.development
                    }).length
                };

                // Get installed versions
                this.collectInstalledVersions();
            }
        } catch (error) {
            console.warn('Could not collect dependency metadata:', error.message);
        }
    }

    /**
     * Collect component metadata (ComponentVersionTracker integration)
     */
    collectComponentMetadata() {
        try {
            const componentDirs = [
                'src/groovy/umig/web/js/components',
                'src/groovy/umig/web/js/entities'
            ];

            this.metadata.components = {
                summary: {
                    totalComponents: 0,
                    totalSize: 0,
                    lastModified: null
                },
                details: []
            };

            for (const componentDir of componentDirs) {
                const fullPath = path.join(this.projectRoot, componentDir);
                if (fs.existsSync(fullPath)) {
                    this.scanComponentDirectory(fullPath, componentDir);
                }
            }

            // Sort components by last modified
            this.metadata.components.details.sort((a, b) => 
                new Date(b.lastModified) - new Date(a.lastModified)
            );

        } catch (error) {
            console.warn('Could not collect component metadata:', error.message);
        }
    }

    /**
     * Scan directory for component files
     */
    scanComponentDirectory(dirPath, relativePath) {
        const files = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const file of files) {
            const fullPath = path.join(dirPath, file.name);
            const relativeFilePath = path.join(relativePath, file.name);
            
            if (file.isDirectory()) {
                this.scanComponentDirectory(fullPath, relativeFilePath);
            } else if (file.isFile() && file.name.endsWith('.js')) {
                const stats = fs.statSync(fullPath);
                const content = fs.readFileSync(fullPath, 'utf8');
                
                const componentInfo = {
                    name: file.name,
                    path: relativeFilePath,
                    size: stats.size,
                    lastModified: stats.mtime.toISOString(),
                    lines: content.split('\n').length,
                    checksum: crypto.createHash('sha256').update(content).digest('hex'),
                    type: this.detectComponentType(content)
                };

                this.metadata.components.details.push(componentInfo);
                this.metadata.components.summary.totalComponents++;
                this.metadata.components.summary.totalSize += stats.size;
                
                if (!this.metadata.components.summary.lastModified || 
                    new Date(stats.mtime) > new Date(this.metadata.components.summary.lastModified)) {
                    this.metadata.components.summary.lastModified = stats.mtime.toISOString();
                }
            }
        }
    }

    /**
     * Detect component type from content
     */
    detectComponentType(content) {
        if (content.includes('class ') && content.includes('extends BaseComponent')) {
            return 'Component';
        }
        if (content.includes('class ') && content.includes('EntityManager')) {
            return 'EntityManager';
        }
        if (content.includes('ComponentOrchestrator')) {
            return 'Orchestrator';
        }
        if (content.includes('SecurityUtils')) {
            return 'Security';
        }
        return 'JavaScript';
    }

    /**
     * Generate file manifest for build output
     */
    generateFileManifest(outputPath) {
        try {
            const stats = fs.statSync(outputPath);
            const content = fs.readFileSync(outputPath);
            const checksum = crypto.createHash('sha256').update(content).digest('hex');
            const md5 = crypto.createHash('md5').update(content).digest('hex');
            
            this.metadata.files = [{
                name: path.basename(outputPath),
                path: outputPath,
                size: stats.size,
                created: stats.birthtime.toISOString(),
                modified: stats.mtime.toISOString(),
                checksum: {
                    sha256: checksum,
                    md5: md5
                },
                permissions: stats.mode,
                type: path.extname(outputPath)
            }];
        } catch (error) {
            console.warn('Could not generate file manifest:', error.message);
        }
    }

    /**
     * Export metadata to file in specified format
     * @param {string} outputPath - Output file path
     * @param {string} format - json, yaml, xml, html
     */
    exportMetadata(outputPath, format = 'json') {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        let content;
        switch (format.toLowerCase()) {
            case 'json':
                content = JSON.stringify(this.metadata, null, 2);
                break;
            case 'yaml':
                content = this.toYaml(this.metadata);
                break;
            case 'xml':
                content = this.toXml(this.metadata);
                break;
            case 'html':
                content = this.toHtml(this.metadata);
                break;
            case 'env':
                content = this.toEnv(this.metadata);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

        fs.writeFileSync(outputPath, content);
        console.log(`📊 Metadata exported to ${outputPath} (format: ${format})`);

        return {
            path: outputPath,
            format,
            size: content.length
        };
    }

    /**
     * Export deployment manifest with timestamped filename
     * @param {string} outputDir - Output directory
     * @param {object} deploymentManifest - Simplified manifest object
     * @returns {object} Export result with path and size
     */
    exportDeploymentManifest(outputDir, deploymentManifest) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `build-manifest-${timestamp}.json`;
        const outputPath = path.join(outputDir, filename);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const content = JSON.stringify(deploymentManifest, null, 2);
        fs.writeFileSync(outputPath, content);

        console.log(`📋 Deployment manifest exported: ${filename}`);

        return {
            path: outputPath,
            filename: filename,
            format: 'json',
            size: content.length
        };
    }

    /**
     * Export deployment README with standard filename
     * @param {string} outputDir - Output directory
     * @param {string} readmeContent - README.md content
     * @returns {object} Export result with path and size
     */
    exportDeploymentReadme(outputDir, readmeContent) {
        const outputPath = path.join(outputDir, 'README.md');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, readmeContent);

        console.log(`📖 Deployment README exported: README.md`);

        return {
            path: outputPath,
            filename: 'README.md',
            format: 'markdown',
            size: readmeContent.length
        };
    }

    /**
     * Convert metadata to YAML format (simple implementation)
     */
    toYaml(obj, depth = 0) {
        const indent = '  '.repeat(depth);
        let yaml = '';
        
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) {
                yaml += `${indent}${key}: null\n`;
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                yaml += `${indent}${key}:\n`;
                yaml += this.toYaml(value, depth + 1);
            } else if (Array.isArray(value)) {
                yaml += `${indent}${key}:\n`;
                value.forEach(item => {
                    if (typeof item === 'object') {
                        yaml += `${indent}  -\n`;
                        yaml += this.toYaml(item, depth + 2);
                    } else {
                        yaml += `${indent}  - ${item}\n`;
                    }
                });
            } else {
                yaml += `${indent}${key}: ${JSON.stringify(value)}\n`;
            }
        }
        
        return yaml;
    }

    /**
     * Convert metadata to XML format (simple implementation)
     */
    toXml(obj, rootElement = 'metadata') {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n`;
        xml += this.objectToXml(obj, 1);
        xml += `</${rootElement}>\n`;
        return xml;
    }

    /**
     * Convert object to XML elements
     */
    objectToXml(obj, depth) {
        const indent = '  '.repeat(depth);
        let xml = '';
        
        for (const [key, value] of Object.entries(obj)) {
            const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
            
            if (value === null || value === undefined) {
                xml += `${indent}<${safeKey} />\n`;
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                xml += `${indent}<${safeKey}>\n`;
                xml += this.objectToXml(value, depth + 1);
                xml += `${indent}</${safeKey}>\n`;
            } else if (Array.isArray(value)) {
                xml += `${indent}<${safeKey}>\n`;
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        xml += `${indent}  <item index="${index}">\n`;
                        xml += this.objectToXml(item, depth + 2);
                        xml += `${indent}  </item>\n`;
                    } else {
                        xml += `${indent}  <item index="${index}">${this.escapeXml(item)}</item>\n`;
                    }
                });
                xml += `${indent}</${safeKey}>\n`;
            } else {
                xml += `${indent}<${safeKey}>${this.escapeXml(value)}</${safeKey}>\n`;
            }
        }
        
        return xml;
    }

    /**
     * Convert metadata to HTML report format
     */
    toHtml(metadata) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UMIG Build Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #007cba; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .info-item { background: #f9f9f9; padding: 10px; border-radius: 3px; }
        .info-item strong { color: #007cba; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
        .success { color: #28a745; } .warning { color: #ffc107; } .error { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>UMIG Build Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Build Version:</strong> ${metadata.version?.version || 'Unknown'}</p>
        <p><strong>Status:</strong> <span class="${metadata.build?.success ? 'success' : 'error'}">${metadata.build?.success ? 'SUCCESS' : 'FAILED'}</span></p>
    </div>

    <div class="section">
        <h2>Build Information</h2>
        <div class="info-grid">
            <div class="info-item"><strong>Duration:</strong> ${metadata.build?.duration ? (metadata.build.duration / 1000).toFixed(2) + 's' : 'N/A'}</div>
            <div class="info-item"><strong>Output Size:</strong> ${metadata.build?.outputSize ? this.formatBytes(metadata.build.outputSize) : 'N/A'}</div>
            <div class="info-item"><strong>Components:</strong> ${metadata.components?.summary?.totalComponents || 0}</div>
            <div class="info-item"><strong>Git Commit:</strong> ${metadata.git?.shortCommit || 'Unknown'}</div>
        </div>
    </div>

    <div class="section">
        <h2>Project Information</h2>
        <div class="info-grid">
            <div class="info-item"><strong>Name:</strong> ${metadata.project?.name || 'Unknown'}</div>
            <div class="info-item"><strong>Version:</strong> ${metadata.project?.version || 'Unknown'}</div>
            <div class="info-item"><strong>Description:</strong> ${metadata.project?.description || 'N/A'}</div>
            <div class="info-item"><strong>License:</strong> ${metadata.project?.license || 'Unknown'}</div>
        </div>
    </div>

    <div class="section">
        <h2>Environment</h2>
        <div class="info-grid">
            <div class="info-item"><strong>Node.js:</strong> ${metadata.environment?.nodeVersion || 'Unknown'}</div>
            <div class="info-item"><strong>Platform:</strong> ${metadata.environment?.platform || 'Unknown'}</div>
            <div class="info-item"><strong>Architecture:</strong> ${metadata.environment?.arch || 'Unknown'}</div>
            <div class="info-item"><strong>Hostname:</strong> ${metadata.environment?.hostname || 'Unknown'}</div>
        </div>
    </div>

    <div class="section">
        <h2>Components</h2>
        ${metadata.components?.details?.length ? `
            <table>
                <thead>
                    <tr><th>Component</th><th>Type</th><th>Size</th><th>Lines</th><th>Last Modified</th></tr>
                </thead>
                <tbody>
                    ${metadata.components.details.slice(0, 10).map(comp => `
                        <tr>
                            <td>${comp.name}</td>
                            <td>${comp.type}</td>
                            <td>${this.formatBytes(comp.size)}</td>
                            <td>${comp.lines}</td>
                            <td>${new Date(comp.lastModified).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>No components found</p>'}
    </div>

    <script>
        // Add interactive features if needed
        console.log('UMIG Build Report loaded');
    </script>
</body>
</html>`;
    }

    /**
     * Convert metadata to environment file format
     */
    toEnv(metadata) {
        const env = [];
        env.push('# UMIG Build Metadata Environment Variables');
        env.push(`BUILD_TIMESTAMP=${metadata.build?.timestamp || ''}`);
        env.push(`BUILD_SUCCESS=${metadata.build?.success || 'false'}`);
        env.push(`BUILD_VERSION=${metadata.version?.version || ''}`);
        env.push(`BUILD_COMMIT=${metadata.git?.commit || ''}`);
        env.push(`BUILD_BRANCH=${metadata.git?.branch || ''}`);
        env.push(`PROJECT_NAME=${metadata.project?.name || ''}`);
        env.push(`NODE_VERSION=${metadata.environment?.nodeVersion || ''}`);
        env.push(`PLATFORM=${metadata.environment?.platform || ''}`);
        return env.join('\n') + '\n';
    }

    // Helper methods
    execGit(command) {
        return execSync(command, { cwd: this.projectRoot, encoding: 'utf8' }).trim();
    }

    getGitTag() {
        try {
            return this.execGit('git describe --tags --exact-match');
        } catch {
            return null;
        }
    }

    getGitRemoteUrl() {
        try {
            return this.execGit('git config --get remote.origin.url');
        } catch {
            return null;
        }
    }

    isGitDirty() {
        try {
            return this.execGit('git status --porcelain').length > 0;
        } catch {
            return false;
        }
    }

    getGitStats() {
        try {
            const stats = {};
            stats.totalCommits = parseInt(this.execGit('git rev-list --count HEAD'));
            stats.contributors = parseInt(this.execGit('git shortlog -s -n | wc -l'));
            return stats;
        } catch {
            return {};
        }
    }

    getFileSize(filePath) {
        try {
            return fs.statSync(filePath).size;
        } catch {
            return 0;
        }
    }

    getFilteredEnvironmentVariables() {
        const allowedVars = ['NODE_ENV', 'CI', 'BUILD_NUMBER', 'BRANCH_NAME'];
        const filtered = {};
        allowedVars.forEach(key => {
            if (process.env[key]) {
                filtered[key] = process.env[key];
            }
        });
        return filtered;
    }

    collectInstalledVersions() {
        try {
            const packageLockPath = path.join(this.projectRoot, 'package-lock.json');
            if (fs.existsSync(packageLockPath)) {
                const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
                this.metadata.dependencies.installed = packageLock.packages || {};
            }
        } catch (error) {
            console.warn('Could not collect installed versions:', error.message);
        }
    }

    escapeXml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

export default MetadataGenerator;
