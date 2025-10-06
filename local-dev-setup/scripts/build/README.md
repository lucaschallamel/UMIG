# Build System Scripts

Purpose: Build orchestration, validation, packaging, and release management for UMIG ScriptRunner application

## Structure

```
build/
├── BuildOrchestrator.js              # Master build coordinator (23KB)
├── BuildValidator.js                 # Pre-build validation (23KB)
├── MetadataGenerator.js              # Build metadata and manifests (29KB)
├── SourcePackager.js                 # Source code packaging (34KB)
├── VersionManager.js                 # Version control and tagging (8KB)
└── test-manifest-integration.js      # Manifest integration tests (5KB)
```

## Components

### BuildOrchestrator.js

- **Purpose**: Coordinates entire build process
- **Features**: Multi-stage builds (dev, UAT, prod), parallel task execution, error handling
- **Stages**: Validation → Packaging → Metadata → Testing → Release
- **Usage**: Called by `npm run build:*` commands

### BuildValidator.js

- **Purpose**: Pre-build validation and quality gates
- **Checks**: Syntax validation, dependency checks, test status, security scans
- **Output**: Validation report with pass/fail status
- **Integration**: Blocks build if validation fails

### MetadataGenerator.js

- **Purpose**: Generates build manifests and metadata
- **Creates**: manifest.json, version.json, changelog summaries
- **Content**: Build timestamp, version, file checksums, dependencies
- **Usage**: Embedded in packaged releases

### SourcePackager.js

- **Purpose**: Packages source code for deployment
- **Features**: File filtering, minification, compression, artifact creation
- **Output**: Deployable .zip packages (84% size reduction in prod)
- **Optimization**: Tree-shaking, dead code elimination

### VersionManager.js

- **Purpose**: Semantic versioning and git tagging
- **Features**: Version bumping (major/minor/patch), git tag creation
- **Format**: Follows SemVer (1.2.3)
- **Usage**: Called during release builds

## Build Commands

```bash
# Development build (with source maps, tests included)
npm run build:dev

# UAT build (optimized, tests excluded)
npm run build:uat

# Production build (maximum optimization, 84% size reduction)
npm run build:prod
```

## Build Process Flow

```
1. Validation (BuildValidator)
   ↓
2. Version Management (VersionManager)
   ↓
3. Source Packaging (SourcePackager)
   ↓
4. Metadata Generation (MetadataGenerator)
   ↓
5. Testing (test-manifest-integration)
   ↓
6. Artifact Output (build/ directory)
```

## Build Artifacts

Output location: `/local-dev-setup/build/`

- **umig-{version}-dev.zip** - Development build
- **umig-{version}-uat.zip** - UAT build
- **umig-{version}-prod.zip** - Production build
- **manifest.json** - Build metadata
- **checksums.txt** - File integrity verification

## Configuration

Build configuration in `package.json`:

- Build scripts (build:dev, build:uat, build:prod)
- File inclusion/exclusion patterns
- Optimization settings
- Version numbering

## Testing

```bash
# Run manifest integration tests
node scripts/build/test-manifest-integration.js

# Full build with validation
npm run build:dev
```

## Integration

- **CI/CD**: Called by GitHub Actions workflows
- **Deployment**: Artifacts deployed to Confluence via ScriptRunner
- **Quality Gates**: Validates before allowing builds
- **Version Control**: Syncs with git tags and releases

---

_Last Updated: 2025-10-06_
