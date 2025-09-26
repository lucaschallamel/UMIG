# UMIG Build Package Guide

## How to Build a Package of the Application

**IMPORTANT**: US-088 Phase 2 has completed the build metadata infrastructure (ComponentVersionTracker, DatabaseVersionManager integration), but Phase 3 (actual build script implementation) is still pending. Currently, you can access build metadata but cannot yet create deployment packages.

## Current Status (Phase 2 Complete, Phase 3 Pending)

### What You CAN Do Now (Phase 2 Complete)

#### Access Build Metadata in Browser Console

```javascript
// Navigate to Admin GUI (http://localhost:8090/confluence/admin-gui)
// Open browser console and run:

// Get comprehensive build manifest
const manifest = await ComponentVersionTracker.getEnhancedBuildManifest();
console.log(manifest);

// Get database version info
const dbInfo = window.databaseVersionManager.getBuildMetadata();
console.log(dbInfo);

// Export build information in different formats
const json = await ComponentVersionTracker.exportBuildManifest("json");
const yaml = await ComponentVersionTracker.exportBuildManifest("yaml");
const summary = await ComponentVersionTracker.exportBuildManifest("summary");
const report =
  await ComponentVersionTracker.exportBuildManifest("deployment-report");
```

#### Access Health Status via API

```bash
curl -X GET \
  -u "admin:admin" \
  http://localhost:8090/rest/scriptrunner/latest/custom/databaseVersions/health
```

### What You CANNOT Do Yet (Phase 3 Pending)

The actual build scripts (`BuildOrchestrator.js`, `SourcePackager.js`, etc.) have not been implemented yet. The npm commands exist but will fail with module not found errors:

- ❌ `npm run build:dev` - Not yet implemented
- ❌ `npm run build:uat` - Not yet implemented
- ❌ `npm run build:prod` - Not yet implemented
- ❌ `npm run build:validate` - Not yet implemented

## Build Process Overview

### What Happens During Build

1. **Version Collection** (Phase 2 Integration)
   - ComponentVersionTracker gathers version data
   - DatabaseVersionManager provides migration info
   - Build manifest generated with component matrix

2. **Source Packaging** (Phase 1)
   - Collects all Groovy source files
   - Collects all JavaScript/CSS/HTML files
   - Excludes test files (except in dev)
   - Creates compressed archive

3. **Metadata Generation** (Phase 2)

   ```javascript
   // Build manifest includes:
   {
     buildId: "unique-identifier",
     timestamp: "ISO-8601",
     environment: "dev|uat|prod",
     components: {
       database: { version: "1.19.4", migrations: 50 },
       api: { version: "2.4.0" },
       ui: { version: "1.0.0" },
       backend: { version: "1.0.0" }
     },
     health: {
       score: 85,
       status: "HEALTHY",
       categories: { ... }
     },
     deployment: {
       readiness: true,
       blockers: [],
       requirements: [ ... ]
     }
   }
   ```

4. **Output Structure**
   ```
   build/artifacts/
   ├── umig-{env}-v{version}-{timestamp}.tar.gz  # Source archive
   ├── build-manifest.json                       # Component versions & health
   ├── deployment-report.txt                     # Human-readable report
   └── checksums.md5                            # File integrity
   ```

## Build Options

### Validation Only (Dry Run)

```bash
npm run build:validate
```

Checks configuration without building anything.

### Verbose Output

```bash
npm run build:dev:verbose
npm run build:uat:verbose
npm run build:prod:verbose
```

Shows detailed build process information.

### Custom Options

```bash
node scripts/build-release.js \
  --env=uat \
  --include-tests \
  --verbose \
  --dry-run
```

## Using Build Manifest Data

### In Browser Console (Admin GUI)

```javascript
// Get current build information
const manifest = await ComponentVersionTracker.getEnhancedBuildManifest();
console.log(manifest);

// Export in different formats
const json = await ComponentVersionTracker.exportBuildManifest("json");
const yaml = await ComponentVersionTracker.exportBuildManifest("yaml");
const summary = await ComponentVersionTracker.exportBuildManifest("summary");
const report =
  await ComponentVersionTracker.exportBuildManifest("deployment-report");
```

### Via Health API

```bash
curl -X GET \
  -u "admin:admin" \
  http://localhost:8090/rest/scriptrunner/latest/custom/databaseVersions/health
```

## Build Artifacts Location

All build artifacts are stored in:

```
local-dev-setup/build/artifacts/
```

## What's Included in Package

### Development Package

- ✅ All source code (api/, repository/, utils/, web/)
- ✅ Test files
- ✅ Debug information
- ✅ Development metadata

### UAT Package

- ✅ Production source code
- ❌ Test files
- ❌ Debug information
- ✅ Health endpoints
- ✅ Component version matrix
- ✅ Deployment readiness assessment

### Production Package

- ✅ Production source code only
- ❌ Test files
- ❌ Debug information
- ✅ Health endpoints
- ✅ Full metadata
- ✅ Rollback procedures (Phase 3)
- ✅ Deployment validation

## Current Limitations (Phase 2)

### What's Working

- ✅ Source code packaging
- ✅ Environment-specific builds
- ✅ Component version tracking
- ✅ Build manifest generation
- ✅ Health status integration
- ✅ Deployment readiness assessment

### What's Not Yet Implemented (Phase 3)

- ⏳ Database migration packaging
- ⏳ Liquibase changeset bundling
- ⏳ Cross-platform validation
- ⏳ Performance monitoring
- ⏳ Automated documentation generation
- ⏳ Rollback script generation

## CI/CD Integration

### Jenkins Example

```groovy
stage('Build Package') {
    steps {
        sh 'npm run build:uat'
        archiveArtifacts artifacts: 'build/artifacts/**/*'
    }
}

stage('Validate Deployment Readiness') {
    steps {
        script {
            def manifest = readJSON file: 'build/artifacts/build-manifest.json'
            if (!manifest.deployment.readiness) {
                error "Deployment blocked: ${manifest.deployment.blockers}"
            }
        }
    }
}
```

### GitHub Actions Example

```yaml
- name: Build UAT Package
  run: |
    cd local-dev-setup
    npm run build:uat

- name: Check Build Health
  run: |
    HEALTH=$(cat build/artifacts/build-manifest.json | jq -r '.health.status')
    if [[ $HEALTH != "HEALTHY" ]]; then
      echo "Build health check failed: $HEALTH"
      exit 1
    fi

- name: Upload Artifacts
  uses: actions/upload-artifact@v2
  with:
    name: umig-uat-package
    path: local-dev-setup/build/artifacts/
```

## Troubleshooting

### Build Fails with "Configuration validation failed"

- Check Node.js version (requires v16+)
- Ensure git repository is clean
- Verify filesystem permissions

### "Component version not found"

- Ensure services are running (`npm start`)
- Refresh ScriptRunner cache if needed
- Check ComponentVersionTracker is initialized

### Build artifacts not created

- Check `build/artifacts/` directory permissions
- Ensure enough disk space (needs ~200MB temp space)
- Look for errors in verbose mode

## Next Steps (Phase 3)

Phase 3 will add:

1. Database migration packaging
2. Liquibase changeset bundling
3. Rollback script generation
4. Cross-platform validation
5. Automated documentation
6. Performance metrics

## Summary - Current Capabilities

### Phase 2 Complete ✅

You now have:

1. **Build Metadata Infrastructure**: ComponentVersionTracker and DatabaseVersionManager integration
2. **Health Assessment**: Comprehensive health endpoint at `/databaseVersions/health`
3. **Deployment Readiness**: Assessment available via `getEnhancedBuildManifest()`
4. **Multiple Export Formats**: JSON, YAML, summary, deployment-report
5. **Component Registration**: Static registration system for build-time component discovery

### Phase 3 Pending ⏳

To actually build packages, Phase 3 needs to implement:

1. `BuildOrchestrator.js` - Main build coordination
2. `SourcePackager.js` - Source code packaging
3. `VersionManager.js` - Version management
4. `BuildValidator.js` - Build validation
5. `MetadataGenerator.js` - Metadata file generation

### Interim Solution

Until Phase 3 is complete, you can:

1. Access build metadata via browser console in Admin GUI
2. Use health endpoint for deployment validation
3. Manually package source files if needed:
   ```bash
   # Manual packaging example (interim solution)
   cd src/groovy/umig
   tar -czf umig-source.tar.gz \
     --exclude="tests" \
     --exclude="*.test.groovy" \
     --exclude="*.backup" \
     api/ repository/ utils/ web/
   ```

The build infrastructure is ready for automation, but the automation scripts themselves are part of US-088 Phase 3 (remaining 2.0 story points).

---

_Last Updated: 2025-09-25_
_US-088 Phase 2 Complete_
_Build System Version: 1.0.0_
