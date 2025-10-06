# TD-020: Revised Build Packaging Structure

**Story ID**: TD-020
**Title**: Revised Build Packaging Structure Based on US-088 Learnings
**Sprint**: Sprint 8
**Priority**: MEDIUM (Technical Debt - Packaging Refinement)
**Story Points**: 5
**Type**: Technical Debt - Build Process Refinement
**Theme**: Deployment Infrastructure Evolution
**Parent**: US-088 (Build Process and Deployment Packaging)

## Executive Summary

As a **DevOps Engineer**, I need **revised build packaging structure with flat deployment layout and improved organization** so that **deployment processes are simpler, more maintainable, and follow industry best practices for ScriptRunner deployments**.

**Context**: US-088 Phase 1 successfully implemented core build infrastructure with nested archive structure. Production experience and deployment feedback revealed that a flatter, timestamped deployment folder structure would be more maintainable and align better with ScriptRunner deployment patterns.

## Business Context

### Business Value

- **Deployment Simplicity**: Flatter structure reduces nested navigation during deployment
- **Operational Efficiency**: Timestamped folders enable easy version tracking
- **Maintainability**: Uncompressed folders for database/docs improve accessibility
- **ScriptRunner Alignment**: Structure optimized for ScriptRunner console deployment

### Strategic Alignment

- **Builds on US-088 Success**: Leverages Phase 1 infrastructure (BuildOrchestrator, SourcePackager)
- **Deployment Experience**: Incorporates learnings from initial UAT deployment attempts
- **Best Practices**: Aligns with industry standards for artifact packaging
- **Future-Proofing**: Establishes foundation for automated deployment pipelines

## User Story

**As a** DevOps Engineer / Release Manager
**I want** a revised build packaging structure with flat deployment layout
**So that** I can deploy UMIG more efficiently with better organization and version tracking

## Current State Analysis (US-088 Phase 1)

### Existing Implementation

**US-088 Phase 1 Achievements** (September 2025):

- ✅ BuildOrchestrator.js (388 lines) - 6-phase workflow
- ✅ SourcePackager.js (442 lines) - Advanced filtering and archiving
- ✅ Build commands: `npm run build:uat`, `build:dev`, `build:prod`
- ✅ Sub-second builds with 85.5% compression (1.29MB archives)
- ✅ 164 test files successfully excluded from production builds

**Current Archive Structure** (US-088 Phase 1):

```
umig-app-v{version}-{timestamp}.zip
├── build-manifest.json
├── deployment-info.json
├── application/
│   ├── groovy/       # Backend services
│   ├── web/          # Frontend assets
│   └── config/       # Configuration templates
├── database/
│   ├── liquibase/    # Liquibase changelogs
│   └── consolidated/ # Consolidated SQL
└── documentation/    # Deployment guides
```

### Identified Limitations

1. **Nested Archive Complexity**: Single ZIP with nested structure requires extraction
2. **No Timestamped Root Folder**: Difficult to manage multiple deployment versions
3. **Compressed Documentation**: Harder to review deployment docs without extraction
4. **Compressed Database Assets**: Cannot review SQL/Liquibase without extraction
5. **Source Archive Granularity**: All source in single location vs selective compression

## Desired State - TD-020 Revised Structure

### Target Archive Structure

```
umig-deployment-uat-2025-09-25T15-07-47/
├── BUILD-MANIFEST-UAT-2025-09-25T15-07-47.json      # Build metadata
├── BUILD-MANIFEST-COMPONENTS-2025-09-25T15-07-47.json # Component versions
├── database/                                          # UNCOMPRESSED
│   ├── liquibase/
│   │   ├── db.changelog-master.xml
│   │   ├── changesets/
│   │   │   ├── 001-create-schema.sql
│   │   │   ├── 002-create-tables.sql
│   │   │   └── [031 changesets total]
│   │   └── liquibase.properties.template
│   └── consolidated/
│       └── umig-db-full-v1.2.0.sql
├── documentation/                                     # UNCOMPRESSED
│   ├── DEPLOYMENT-GUIDE.md
│   ├── RELEASE-NOTES-v1.2.0.md
│   ├── ROLLBACK-PROCEDURES.md
│   ├── CONFIGURATION-GUIDE.md
│   └── api/
│       └── openapi.yaml
└── umig-src-uat-2025-09-25T15-07-47.tar.gz          # COMPRESSED SOURCE ONLY
    └── [contents of /src/groovy/umig/ excluding /tests]
```

### Key Structural Changes

1. **Timestamped Deployment Folder**: `umig-deployment-{env}-{timestamp}/`
   - Easy version identification
   - No extraction confusion
   - Multiple versions can coexist safely

2. **Multiple BUILD Manifests at Root**:
   - `BUILD-MANIFEST-{ENV}-{timestamp}.json` - Primary build metadata
   - `BUILD-MANIFEST-COMPONENTS-{timestamp}.json` - Component version matrix
   - Easy access without extraction
   - Environment-specific naming

3. **Uncompressed Database Folder**:
   - Direct access to Liquibase changesets for review
   - Easy SQL script inspection
   - Faster changeset modification if needed
   - No extraction step for database team

4. **Uncompressed Documentation Folder**:
   - Immediate access to deployment guides
   - Easy reference during deployment
   - No extraction required for pre-deployment review
   - Supports quick documentation updates

5. **Selective Source Compression**:
   - Only `/src/groovy/umig/` (excluding `/tests`) compressed
   - Timestamped tar.gz: `umig-src-{env}-{timestamp}.tar.gz`
   - Reduced archive size (compress only what needs compression)
   - Separate versioning for source code

## Technical Requirements

### 1. Timestamped Deployment Folder Creation

**Implementation**:

```javascript
// Revised SourcePackager.createDeploymentStructure()
async createDeploymentStructure() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .substring(0, 19); // 2025-09-25T15-07-47

  const deploymentFolderName = `umig-deployment-${this.options.environment}-${timestamp}`;
  const deploymentPath = path.join(this.outputDir, deploymentFolderName);

  await fs.mkdir(deploymentPath, { recursive: true });

  return { deploymentPath, timestamp };
}
```

**Validation**:

- Folder name follows pattern: `umig-deployment-{env}-{ISO-timestamp}`
- Timestamp format: ISO 8601 with hyphens (filesystem-safe)
- Multiple builds don't overwrite (unique timestamps)

### 2. Multiple BUILD Manifests at Root

**Manifest Types**:

**A. BUILD-MANIFEST-{ENV}-{timestamp}.json** (Primary):

```json
{
  "buildInfo": {
    "version": "1.2.0",
    "environment": "uat",
    "timestamp": "2025-09-25T15:07:47Z",
    "buildNumber": "20250925.150747",
    "gitCommit": "0b9f023",
    "gitBranch": "feature/sprint8-us-098"
  },
  "artifacts": {
    "sourceArchive": "umig-src-uat-2025-09-25T15-07-47.tar.gz",
    "sourceSize": "1.29MB",
    "sourceCompression": "85.5%",
    "databaseFolder": "database/",
    "documentationFolder": "documentation/"
  },
  "exclusions": {
    "testFilesExcluded": 164,
    "testDirectoriesExcluded": ["tests/", "**/*.test.groovy"]
  }
}
```

**B. BUILD-MANIFEST-COMPONENTS-{timestamp}.json** (Component Matrix):

```json
{
  "components": {
    "database": {
      "version": "v1.2.0",
      "changesetCount": 31,
      "lastChangeset": "031-add-email-templates.sql"
    },
    "api": {
      "version": "v2.12.0",
      "endpoints": 31,
      "compatibility": "backward-compatible"
    },
    "ui": {
      "version": "v1.2.0",
      "components": 25,
      "javascriptSize": "186KB"
    },
    "backend": {
      "version": "v1.2.0",
      "groovyFiles": 78,
      "repositories": 16
    }
  }
}
```

**Implementation**:

```javascript
// MetadataGenerator - Revised for multiple manifests
async generateBuildManifests(deploymentPath, timestamp, buildInfo) {
  // Primary build manifest
  const primaryManifest = this.createPrimaryManifest(buildInfo, timestamp);
  const primaryPath = path.join(
    deploymentPath,
    `BUILD-MANIFEST-${this.options.environment.toUpperCase()}-${timestamp}.json`
  );
  await fs.writeFile(primaryPath, JSON.stringify(primaryManifest, null, 2));

  // Component version manifest
  const componentManifest = await this.createComponentManifest(buildInfo);
  const componentPath = path.join(
    deploymentPath,
    `BUILD-MANIFEST-COMPONENTS-${timestamp}.json`
  );
  await fs.writeFile(componentPath, JSON.stringify(componentManifest, null, 2));

  return [primaryPath, componentPath];
}
```

### 3. Uncompressed Database Folder

**Directory Structure**:

```
database/
├── liquibase/
│   ├── db.changelog-master.xml
│   ├── changesets/
│   │   ├── 001-create-schema.sql
│   │   ├── 002-create-tables.sql
│   │   └── [...031 changesets]
│   ├── liquibase.properties.template
│   └── README-DATABASE-DEPLOYMENT.md
└── consolidated/
    └── umig-db-full-v1.2.0.sql
```

**Implementation**:

```javascript
// SourcePackager.packageDatabaseAssets() - Revised for uncompressed
async packageDatabaseAssets(deploymentPath) {
  const databaseDir = path.join(deploymentPath, 'database');
  await fs.mkdir(databaseDir, { recursive: true });

  // Copy Liquibase structure (uncompressed)
  const liquibaseSource = path.resolve(__dirname, '../../../local-dev-setup/liquibase');
  const liquibaseDest = path.join(databaseDir, 'liquibase');
  await this.copyDirectory(liquibaseSource, liquibaseDest, {
    exclude: ['*.lock', 'target/', '.git/']
  });

  // Generate consolidated SQL if needed
  if (this.envConfig.database_option === 'consolidated') {
    const consolidatedDir = path.join(databaseDir, 'consolidated');
    await fs.mkdir(consolidatedDir, { recursive: true });
    await this.generateConsolidatedSQL(consolidatedDir);
  }

  // Add database deployment README
  await this.generateDatabaseReadme(databaseDir);
}
```

**Benefits**:

- DBA can review SQL scripts without extraction
- Easy changeset inspection and modification
- Faster deployment troubleshooting
- Supports selective changeset application

### 4. Uncompressed Documentation Folder

**Directory Structure**:

```
documentation/
├── DEPLOYMENT-GUIDE.md
├── RELEASE-NOTES-v1.2.0.md
├── ROLLBACK-PROCEDURES.md
├── CONFIGURATION-GUIDE.md
├── COMPATIBILITY-MATRIX.md
├── MONITORING-GUIDE.md
└── api/
    ├── openapi.yaml
    └── postman/
        └── UMIG_API_V2_Collection.json
```

**Implementation**:

```javascript
// SourcePackager.packageDeploymentDocumentation() - Revised for uncompressed
async packageDeploymentDocumentation(deploymentPath) {
  const docsDir = path.join(deploymentPath, 'documentation');
  await fs.mkdir(docsDir, { recursive: true });

  // Copy deployment guides
  const deploymentDocs = [
    '../docs/operations/DEPLOYMENT-GUIDE.md',
    '../docs/operations/ROLLBACK-PROCEDURES.md',
    '../docs/operations/CONFIGURATION-GUIDE.md'
  ];

  for (const docPath of deploymentDocs) {
    const sourcePath = path.resolve(__dirname, '../../..', docPath);
    const destPath = path.join(docsDir, path.basename(docPath));
    await fs.copyFile(sourcePath, destPath);
  }

  // Generate release notes
  await this.generateReleaseNotes(docsDir);

  // Copy API documentation
  const apiDocsSource = path.resolve(__dirname, '../../../docs/api');
  const apiDocsDest = path.join(docsDir, 'api');
  await this.copyDirectory(apiDocsSource, apiDocsDest, {
    include: ['openapi.yaml', 'postman/**/*.json']
  });
}
```

**Benefits**:

- Immediate access to deployment instructions
- Pre-deployment documentation review
- Easy reference during deployment execution
- Support for last-minute documentation updates

### 5. Selective Source Compression

**Source Archive Structure**:

```
umig-src-uat-2025-09-25T15-07-47.tar.gz
└── [Contents of /src/groovy/umig/ excluding /tests subfolder]
    ├── api/
    │   └── v2/
    ├── macros/
    ├── repository/
    ├── utils/
    └── web/
```

**Implementation**:

```javascript
// SourcePackager.packageUmigCore() - Revised for selective compression
async packageUmigCore(deploymentPath, timestamp) {
  const sourceArchiveName = `umig-src-${this.options.environment}-${timestamp}.tar.gz`;
  const sourceArchivePath = path.join(deploymentPath, sourceArchiveName);

  // Collect source files (excluding tests)
  const sourceFiles = await this.collectSourceFiles({
    include: this.config.source.inclusionPatterns,
    exclude: [
      ...this.config.source.exclusionPatterns,
      'tests/**/*',           // Explicit test directory exclusion
      '**/*.test.groovy',     // Test files
      '**/Test*.groovy'       // Test classes
    ]
  });

  // Create compressed tar.gz archive
  await tar.create(
    {
      gzip: { level: 9 },    // Maximum compression
      file: sourceArchivePath,
      cwd: this.baseDir,
      portable: true,        // Cross-platform compatibility
      preservePaths: false   // Relative paths only
    },
    sourceFiles
  );

  // Validate test exclusion
  await this.validateTestExclusion(sourceArchivePath);

  return sourceArchivePath;
}
```

**Validation Requirements**:

- Zero test files in source archive
- Compression ratio ≥ 70%
- Archive size < 10MB (source only)
- Extractable on Windows/Mac/Linux

## File Modifications Needed

### 1. SourcePackager.js (Primary Changes)

**Modified Methods**:

```javascript
class SourcePackager {
  // MODIFIED: Create timestamped deployment folder structure
  async createDeploymentStructure() {
    /* TD-020 implementation */
  }

  // MODIFIED: Package source as compressed tar.gz only
  async packageUmigCore(deploymentPath, timestamp) {
    /* TD-020 implementation */
  }

  // MODIFIED: Copy database assets uncompressed
  async packageDatabaseAssets(deploymentPath) {
    /* TD-020 implementation */
  }

  // MODIFIED: Copy documentation uncompressed
  async packageDeploymentDocumentation(deploymentPath) {
    /* TD-020 implementation */
  }

  // NEW: Copy directory with filtering
  async copyDirectory(source, dest, options = {}) {
    /* Helper method */
  }

  // NEW: Generate database deployment README
  async generateDatabaseReadme(databaseDir) {
    /* Helper method */
  }

  // NEW: Generate release notes
  async generateReleaseNotes(docsDir) {
    /* Helper method */
  }

  // MODIFIED: Validate test exclusion in tar.gz
  async validateTestExclusion(archivePath) {
    /* Enhanced validation */
  }
}
```

**Estimated Changes**: ~300 lines modified/added (442 total → ~550 total)

### 2. MetadataGenerator.js (Manifest Changes)

**Modified Methods**:

```javascript
class MetadataGenerator {
  // MODIFIED: Generate multiple BUILD manifests
  async generateBuildManifests(deploymentPath, timestamp, buildInfo) {
    /* TD-020 dual manifest implementation */
  }

  // NEW: Create primary build manifest
  createPrimaryManifest(buildInfo, timestamp) {
    /* Primary manifest structure */
  }

  // NEW: Create component version manifest
  async createComponentManifest(buildInfo) {
    /* Component matrix structure */
  }

  // MODIFIED: Update manifest paths for flat structure
  updateManifestPaths(manifest, deploymentPath) {
    /* Path updates */
  }
}
```

**Estimated Changes**: ~200 lines modified/added (287 total → ~400 total)

### 3. BuildOrchestrator.js (Coordination Updates)

**Modified Methods**:

```javascript
class BuildOrchestrator {
  // MODIFIED: Updated Phase 2 for revised structure
  async executePhase2() {
    // Call revised SourcePackager methods
    // Pass timestamp to all packaging methods
    // Update artifact tracking for flat structure
  }

  // MODIFIED: Updated Phase 3 for multiple manifests
  async executePhase3() {
    // Generate primary + component manifests
    // Place manifests at deployment root
    // Update build summary
  }

  // MODIFIED: Updated Phase 4 validation
  async executePhase4() {
    // Validate timestamped folder structure
    // Verify manifest placement
    // Validate uncompressed folders
    // Verify source archive exclusions
  }
}
```

**Estimated Changes**: ~100 lines modified (388 total → ~450 total)

### 4. build-config.json (Configuration Updates)

**Updated Sections**:

```json
{
  "packaging": {
    "structure": "flat-timestamped",
    "manifestCount": 2,
    "uncompressedFolders": ["database", "documentation"],
    "compressedArchives": ["source"],
    "timestampFormat": "ISO-8601-filesystem-safe"
  },

  "source": {
    "archiveFormat": "tar.gz",
    "compressionLevel": 9,
    "excludeTests": true,
    "validateExclusions": true
  },

  "database": {
    "format": "uncompressed-folder",
    "includeLiquibase": true,
    "includeConsolidated": true,
    "includeReadme": true
  },

  "documentation": {
    "format": "uncompressed-folder",
    "includeDeploymentGuides": true,
    "includeReleaseNotes": true,
    "includeApiDocs": true
  }
}
```

**Estimated Changes**: ~50 lines modified/added

### 5. package.json (Build Commands)

**No changes required** - Existing commands work with revised implementation:

```json
{
  "scripts": {
    "build:uat": "node scripts/build-release.js --env=uat",
    "build:prod": "node scripts/build-release.js --env=prod",
    "build:dev": "node scripts/build-release.js --env=dev --include-tests"
  }
}
```

## Task Breakdown with Phases

### Phase 1: Core Structure Refactoring (2 days)

**Tasks**:

1. **Timestamped Folder Creation** (4 hours)
   - Modify `SourcePackager.createDeploymentStructure()`
   - Implement ISO-8601 timestamp generation
   - Add folder name validation
   - Update cleanup logic for timestamped folders

2. **Flat Structure Implementation** (4 hours)
   - Remove nested archive packaging
   - Implement flat folder layout
   - Update path resolution logic
   - Modify artifact tracking

3. **Multiple Manifest Generation** (4 hours)
   - Split manifest generation into primary + components
   - Implement environment-specific naming
   - Add timestamp to manifest filenames
   - Update manifest content structure

4. **Testing & Validation** (4 hours)
   - Unit tests for structure creation
   - Integration tests for manifest generation
   - Validation tests for folder layout
   - Cross-platform path testing

**Deliverables**:

- ✅ Timestamped deployment folder creation
- ✅ Flat structure with multiple manifests at root
- ✅ Updated BuildOrchestrator coordination
- ✅ Comprehensive unit/integration tests

### Phase 2: Uncompressed Folders Implementation (1.5 days)

**Tasks**:

1. **Uncompressed Database Folder** (6 hours)
   - Implement `copyDirectory()` helper method
   - Modify `packageDatabaseAssets()` for uncompressed copy
   - Add Liquibase structure preservation
   - Generate database deployment README
   - Implement consolidated SQL generation

2. **Uncompressed Documentation Folder** (4 hours)
   - Modify `packageDeploymentDocumentation()` for uncompressed copy
   - Implement deployment guide copying
   - Add release notes generation
   - Copy API documentation (OpenAPI, Postman)

3. **Testing & Validation** (2 hours)
   - Unit tests for directory copying
   - Validation tests for folder contents
   - README generation tests
   - Documentation completeness checks

**Deliverables**:

- ✅ Uncompressed database/ folder with Liquibase + consolidated SQL
- ✅ Uncompressed documentation/ folder with guides
- ✅ Helper methods for directory operations
- ✅ Comprehensive validation tests

### Phase 3: Selective Source Compression (1 day)

**Tasks**:

1. **Source Archive Implementation** (4 hours)
   - Modify `packageUmigCore()` for tar.gz creation
   - Implement timestamped archive naming
   - Add test exclusion validation
   - Configure compression settings (level 9)

2. **Test Exclusion Validation** (2 hours)
   - Enhance `validateTestExclusion()` for tar.gz
   - Implement archive content inspection
   - Add comprehensive exclusion checks
   - Generate exclusion report

3. **Testing & Validation** (2 hours)
   - Unit tests for archive creation
   - Test exclusion validation tests
   - Compression ratio verification
   - Cross-platform extraction tests

**Deliverables**:

- ✅ Compressed source tar.gz with timestamp
- ✅ Zero test files in production archives
- ✅ Enhanced validation for test exclusions
- ✅ Cross-platform compatibility verified

### Phase 4: Integration & Documentation (0.5 days)

**Tasks**:

1. **BuildOrchestrator Integration** (2 hours)
   - Update Phase 2 coordination
   - Update Phase 3 manifest generation
   - Update Phase 4 validation
   - Add comprehensive build summary

2. **Documentation Updates** (2 hours)
   - Update US-088 story with TD-020 changes
   - Create TD-020 completion documentation
   - Update deployment guides for new structure
   - Add troubleshooting section

**Deliverables**:

- ✅ Fully integrated build pipeline
- ✅ Updated documentation
- ✅ Deployment guide updates
- ✅ TD-020 completion report

## Testing Approach

### Unit Testing

**Test Coverage Target**: ≥95% for modified/new code

**Test Suites**:

1. **Structure Creation Tests** (`SourcePackager.structure.test.js`):

```javascript
describe("TD-020: Timestamped Deployment Structure", () => {
  test("creates timestamped deployment folder", async () => {
    const { deploymentPath, timestamp } =
      await sourcePackager.createDeploymentStructure();
    expect(deploymentPath).toMatch(
      /umig-deployment-uat-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/,
    );
    expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
  });

  test("creates unique folders for sequential builds", async () => {
    const result1 = await sourcePackager.createDeploymentStructure();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
    const result2 = await sourcePackager.createDeploymentStructure();
    expect(result1.deploymentPath).not.toBe(result2.deploymentPath);
  });
});
```

2. **Manifest Generation Tests** (`MetadataGenerator.manifests.test.js`):

```javascript
describe("TD-020: Multiple BUILD Manifests", () => {
  test("generates primary manifest with environment in filename", async () => {
    const manifests = await metadataGenerator.generateBuildManifests(
      deploymentPath,
      timestamp,
      buildInfo,
    );
    expect(manifests).toHaveLength(2);
    expect(manifests[0]).toMatch(
      /BUILD-MANIFEST-UAT-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json/,
    );
  });

  test("generates component manifest with complete version matrix", async () => {
    const manifests = await metadataGenerator.generateBuildManifests(
      deploymentPath,
      timestamp,
      buildInfo,
    );
    const componentManifest = JSON.parse(
      await fs.readFile(manifests[1], "utf-8"),
    );
    expect(componentManifest.components).toHaveProperty("database");
    expect(componentManifest.components).toHaveProperty("api");
    expect(componentManifest.components).toHaveProperty("ui");
    expect(componentManifest.components).toHaveProperty("backend");
  });
});
```

3. **Uncompressed Folder Tests** (`SourcePackager.folders.test.js`):

```javascript
describe("TD-020: Uncompressed Folders", () => {
  test("database folder contains Liquibase structure uncompressed", async () => {
    await sourcePackager.packageDatabaseAssets(deploymentPath);
    const databasePath = path.join(deploymentPath, "database/liquibase");
    const masterChangelog = path.join(databasePath, "db.changelog-master.xml");
    expect(await fs.access(masterChangelog)).resolves.toBeUndefined();
  });

  test("documentation folder contains deployment guides uncompressed", async () => {
    await sourcePackager.packageDeploymentDocumentation(deploymentPath);
    const docsPath = path.join(deploymentPath, "documentation");
    const deploymentGuide = path.join(docsPath, "DEPLOYMENT-GUIDE.md");
    expect(await fs.access(deploymentGuide)).resolves.toBeUndefined();
  });
});
```

4. **Source Compression Tests** (`SourcePackager.compression.test.js`):

```javascript
describe("TD-020: Selective Source Compression", () => {
  test("source archive excludes all test files", async () => {
    const archivePath = await sourcePackager.packageUmigCore(
      deploymentPath,
      timestamp,
    );
    const files = await tar.list({ file: archivePath });
    const testFiles = files.filter(
      (f) => f.includes("/tests/") || f.includes(".test.groovy"),
    );
    expect(testFiles).toHaveLength(0);
  });

  test("source archive has timestamped filename", async () => {
    const archivePath = await sourcePackager.packageUmigCore(
      deploymentPath,
      timestamp,
    );
    expect(archivePath).toMatch(
      /umig-src-uat-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.tar\.gz/,
    );
  });

  test("source archive achieves >= 70% compression", async () => {
    const archivePath = await sourcePackager.packageUmigCore(
      deploymentPath,
      timestamp,
    );
    const stats = await fs.stat(archivePath);
    const compressionRatio = (1 - stats.size / originalSize) * 100;
    expect(compressionRatio).toBeGreaterThanOrEqual(70);
  });
});
```

### Integration Testing

**Test Scenarios**:

1. **Complete Build Pipeline Test**:

```javascript
describe("TD-020: End-to-End Build Pipeline", () => {
  test("build:uat creates complete deployment package with revised structure", async () => {
    await execAsync("npm run build:uat");

    // Verify timestamped deployment folder
    const deploymentFolder = await findDeploymentFolder("uat");
    expect(deploymentFolder).toMatch(
      /umig-deployment-uat-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/,
    );

    // Verify multiple BUILD manifests at root
    const primaryManifest = path.join(
      deploymentFolder,
      `BUILD-MANIFEST-UAT-*.json`,
    );
    const componentManifest = path.join(
      deploymentFolder,
      `BUILD-MANIFEST-COMPONENTS-*.json`,
    );
    expect(await fs.access(primaryManifest)).resolves.toBeUndefined();
    expect(await fs.access(componentManifest)).resolves.toBeUndefined();

    // Verify uncompressed folders
    expect(
      await fs.access(path.join(deploymentFolder, "database/")),
    ).resolves.toBeUndefined();
    expect(
      await fs.access(path.join(deploymentFolder, "documentation/")),
    ).resolves.toBeUndefined();

    // Verify compressed source archive
    const sourceArchive = path.join(deploymentFolder, `umig-src-uat-*.tar.gz`);
    expect(await fs.access(sourceArchive)).resolves.toBeUndefined();
  });
});
```

2. **Cross-Environment Consistency Test**:

```javascript
describe("TD-020: Cross-Environment Consistency", () => {
  test("dev, uat, prod builds follow same structure", async () => {
    const devBuild = await runBuild("dev");
    const uatBuild = await runBuild("uat");
    const prodBuild = await runBuild("prod");

    // All should have same folder structure
    expect(devBuild.structure).toEqual(uatBuild.structure);
    expect(uatBuild.structure).toEqual(prodBuild.structure);

    // Environment-specific differences only in manifest names
    expect(devBuild.primaryManifest).toMatch(/BUILD-MANIFEST-DEV-/);
    expect(uatBuild.primaryManifest).toMatch(/BUILD-MANIFEST-UAT-/);
    expect(prodBuild.primaryManifest).toMatch(/BUILD-MANIFEST-PROD-/);
  });
});
```

### Acceptance Testing

**Manual Validation Checklist**:

1. **Structure Validation**:
   - [ ] Deployment folder has timestamped name
   - [ ] Multiple builds create unique folders
   - [ ] Folder structure matches specification
   - [ ] All required files/folders present

2. **Manifest Validation**:
   - [ ] Primary manifest at root with environment name
   - [ ] Component manifest at root with timestamp
   - [ ] Manifest content complete and accurate
   - [ ] JSON format valid and parseable

3. **Database Folder Validation**:
   - [ ] Liquibase/ subfolder present
   - [ ] All 31 changesets accessible
   - [ ] db.changelog-master.xml readable
   - [ ] Database README generated

4. **Documentation Folder Validation**:
   - [ ] Deployment guides accessible
   - [ ] Release notes generated
   - [ ] API documentation included
   - [ ] All files readable without extraction

5. **Source Archive Validation**:
   - [ ] Archive has timestamped filename
   - [ ] Zero test files in archive
   - [ ] Archive extracts successfully
   - [ ] Compression ratio ≥ 70%

## Risks and Dependencies

### Risks

1. **Backward Compatibility** (Medium Risk)
   - **Risk**: Existing deployment scripts expect old structure
   - **Mitigation**: Document migration path, provide structure comparison
   - **Contingency**: Maintain `--legacy-structure` flag for compatibility

2. **Disk Space Usage** (Low Risk)
   - **Risk**: Uncompressed folders use more disk space
   - **Mitigation**: Database/docs are small (<10MB), benefits outweigh costs
   - **Contingency**: Optional compression flag for space-constrained environments

3. **Build Performance** (Low Risk)
   - **Risk**: Directory copying slower than single archive
   - **Mitigation**: US-088 achieved sub-second builds, plenty of headroom
   - **Contingency**: Parallel copying if performance degrades

### Dependencies

**Internal**:

- ✅ US-088 Phase 1 Complete (BuildOrchestrator, SourcePackager infrastructure)
- ⚠️ Database schema stability (31 Liquibase changesets)
- ⚠️ Documentation completeness (deployment guides)

**External**:

- ✅ Node.js 16+ (existing requirement)
- ✅ tar package (existing dependency)
- ✅ Cross-platform filesystem support (existing)

**Technical**:

- No new dependencies required
- All changes within existing US-088 infrastructure
- Leverages existing build configuration system

## Implementation Timeline

**Total Estimated Effort**: 5 story points (5 days)

### Week 1 (Sprint 8)

**Days 1-2: Phase 1 - Core Structure Refactoring**

- Timestamped folder creation
- Flat structure implementation
- Multiple manifest generation
- Unit testing

**Days 3-4: Phase 2-3 - Folders & Compression**

- Uncompressed database folder
- Uncompressed documentation folder
- Selective source compression
- Integration testing

**Day 5: Phase 4 - Integration & Documentation**

- BuildOrchestrator integration
- Documentation updates
- Final validation
- TD-020 completion report

### Timeline Assumptions

- **No blockers**: US-088 infrastructure stable and well-tested
- **Clear requirements**: Structure specification complete and validated
- **Resource availability**: Developer available full-time
- **Testing efficiency**: Automated tests provide fast feedback

## Success Metrics

### Quantitative Metrics

- **Structure Compliance**: 100% adherence to TD-020 specification
- **Test Coverage**: ≥95% for modified/new code
- **Build Performance**: Maintain <5 second build time (currently <1 second)
- **Test Exclusion**: Zero test files in production archives (maintain 164 exclusions)
- **Compression Efficiency**: ≥70% for source archive

### Qualitative Metrics

- **Deployment Simplicity**: Reduced navigation steps (flat structure)
- **Documentation Accessibility**: Immediate access without extraction
- **Database Review**: Easy SQL inspection for DBAs
- **Operational Clarity**: Timestamped folders improve version tracking
- **Maintainability**: Simpler structure easier to understand and modify

## Acceptance Criteria

### AC-1: Timestamped Deployment Folder

**GIVEN** a build execution
**WHEN** `npm run build:uat` completes
**THEN** the build should:

- ✅ Create deployment folder with pattern: `umig-deployment-{env}-{ISO-timestamp}`
- ✅ Use ISO 8601 timestamp format with filesystem-safe characters (hyphens)
- ✅ Generate unique folder for each build (no overwrites)
- ✅ Place all artifacts within timestamped folder

### AC-2: Multiple BUILD Manifests at Root

**GIVEN** a completed build
**WHEN** examining deployment folder root
**THEN** manifests should:

- ✅ Include `BUILD-MANIFEST-{ENV}-{timestamp}.json` (primary manifest)
- ✅ Include `BUILD-MANIFEST-COMPONENTS-{timestamp}.json` (component versions)
- ✅ Be at deployment folder root (not nested)
- ✅ Contain complete and accurate build metadata
- ✅ Use environment-specific naming for primary manifest

### AC-3: Uncompressed Database Folder

**GIVEN** a completed build
**WHEN** examining database/ folder
**THEN** database assets should:

- ✅ Exist as uncompressed folder (not archive)
- ✅ Contain Liquibase/ subfolder with all 31 changesets
- ✅ Include db.changelog-master.xml at readable location
- ✅ Include liquibase.properties.template
- ✅ Include consolidated/ subfolder if applicable
- ✅ Include README-DATABASE-DEPLOYMENT.md

### AC-4: Uncompressed Documentation Folder

**GIVEN** a completed build
**WHEN** examining documentation/ folder
**THEN** documentation should:

- ✅ Exist as uncompressed folder (not archive)
- ✅ Contain DEPLOYMENT-GUIDE.md
- ✅ Contain RELEASE-NOTES-v{version}.md
- ✅ Contain ROLLBACK-PROCEDURES.md
- ✅ Contain CONFIGURATION-GUIDE.md
- ✅ Include api/ subfolder with openapi.yaml and Postman collection

### AC-5: Selective Source Compression

**GIVEN** a completed build
**WHEN** examining source archive
**THEN** source packaging should:

- ✅ Create compressed tar.gz archive with timestamped name
- ✅ Archive name pattern: `umig-src-{env}-{timestamp}.tar.gz`
- ✅ Contain ZERO test files (validate 164 exclusions)
- ✅ Achieve ≥70% compression ratio
- ✅ Extract successfully on Windows/Mac/Linux
- ✅ Preserve original directory structure (api/, repository/, utils/, web/)

### AC-6: Build Performance Maintenance

**GIVEN** TD-020 implementation
**WHEN** running build commands
**THEN** performance should:

- ✅ Complete builds in <5 seconds (maintain current <1 second performance)
- ✅ Use <1GB memory during build process
- ✅ Use <200MB temporary disk space
- ✅ Clean up temporary files on completion
- ✅ No performance regression from US-088 Phase 1

### AC-7: Cross-Environment Consistency

**GIVEN** builds for dev, uat, prod environments
**WHEN** comparing deployment structures
**THEN** consistency should show:

- ✅ Identical folder structure across environments
- ✅ Environment-specific differences only in manifest filenames
- ✅ Same test exclusions (164 files) for uat and prod
- ✅ Test inclusion only for dev environment
- ✅ Consistent artifact naming conventions

### AC-8: Backward Compatibility & Migration

**GIVEN** existing deployment processes
**WHEN** adopting TD-020 structure
**THEN** migration should provide:

- ✅ Documentation comparing old vs new structure
- ✅ Migration guide for existing deployment scripts
- ✅ Clear mapping between US-088 Phase 1 and TD-020 structures
- ✅ Troubleshooting guide for common migration issues

## Definition of Done

### Technical Completion

- ✅ All phases (1-4) implemented and tested
- ✅ All acceptance criteria (AC-1 through AC-8) verified
- ✅ Unit test coverage ≥95% for modified code
- ✅ Integration tests passing for all environments (dev/uat/prod)
- ✅ Build performance maintained (<5 seconds)
- ✅ Zero test files in production archives validated

### Documentation Completion

- ✅ TD-020 implementation documented
- ✅ US-088 story updated with TD-020 changes
- ✅ Deployment guide updated for new structure
- ✅ Migration guide created for existing processes
- ✅ Troubleshooting section added
- ✅ API documentation updated if needed

### Quality Assurance

- ✅ Code review completed by senior developer
- ✅ Security review (no secrets in artifacts)
- ✅ Cross-platform testing (Windows/Mac/Linux)
- ✅ Performance benchmarking completed
- ✅ Regression testing passed

### Operational Readiness

- ✅ Development team trained on new structure
- ✅ DevOps team trained on deployment changes
- ✅ Build commands documented and validated
- ✅ Error messages clear and actionable
- ✅ Rollback procedure documented

## Rollback Strategy

### Rollback Triggers

- Build performance regression >500%
- Critical bugs in deployment structure
- Incompatibility with deployment infrastructure
- Team productivity significantly impacted

### Rollback Procedure

1. **Immediate Rollback**:

   ```bash
   git revert <TD-020-commit-range>
   npm install  # Restore dependencies if needed
   npm run build:uat  # Validate US-088 Phase 1 structure restored
   ```

2. **Validation**:
   - Verify US-088 Phase 1 structure restored
   - Validate existing deployment processes work
   - Confirm build performance restored

3. **Communication**:
   - Notify team of rollback
   - Document rollback reason
   - Schedule post-mortem

### Prevention Measures

- Comprehensive testing before merge
- Staged rollout (dev → uat → prod)
- Performance monitoring
- Team feedback collection

## Related Work

### Predecessor Stories

- **US-088**: Build Process and Deployment Packaging (Parent)
  - Phase 1: Core build infrastructure (Complete)
  - TD-020 refines Phase 1 packaging structure

### Successor Stories

- **US-088 Phase 2**: Database version management (Planned)
  - Will leverage TD-020's uncompressed database/ folder
  - Simplified database packaging integration

### Related Technical Debt

- **TD-021**: Automated deployment testing (Future)
- **TD-022**: CI/CD pipeline integration (Future)
- **TD-023**: Cross-environment validation automation (Future)

---

**Story Owner**: DevOps Engineering
**Technical Reviewer**: Lead Developer
**Business Stakeholder**: Product Owner
**Architecture Reviewer**: Solution Architect
**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Status**: Ready for Sprint 8 Implementation

---

_This technical debt story refines US-088 Phase 1 build packaging based on deployment experience and industry best practices, establishing a more maintainable foundation for UAT and production deployments._
