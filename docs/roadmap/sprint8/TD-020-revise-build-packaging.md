# TD-020: Revise Build Packaging Structure - Self-Contained Source Distribution

**Story Type**: Technical Debt
**Priority**: Medium
**Story Points**: 5
**Sprint**: Sprint 8
**Created**: 2025-10-06
**Status**: 📋 READY FOR IMPLEMENTATION

---

## User Story

**As a** deployment engineer
**I want** the build packaging to produce a self-contained deployment folder with compressed source code
**So that** releases are easier to distribute and deploy with clear separation of concerns

---

## Business Value

- **Deployment Efficiency**: Clear separation between runtime artifacts and source code improves deployment clarity
- **Distribution Simplification**: Single compressed source archive reduces file transfer complexity
- **Professional Standards**: Industry-standard packaging structure aligns with enterprise deployment practices
- **Operational Clarity**: Uncompressed manifests and supporting files enable quick validation without extraction
- **Security**: Compressed source reduces attack surface during distribution

---

## Context

This is an iteration on Sprint 7's **US-088 Build Process & Deployment Packaging**. The original implementation (Phase 1) successfully delivered:

- ✅ BuildOrchestrator.js (6-phase workflow)
- ✅ SourcePackager.js (test exclusion, 85.5% compression)
- ✅ Sub-second build performance
- ✅ Complete test file exclusion (164 files)

**Current State**: Build creates `umig-app-v{version}-{timestamp}.zip` with everything packaged together in single archive.

**Desired State**: Build creates timestamped deployment folder with:

- Uncompressed BUILD manifests at root
- Uncompressed database/ folder at root
- Uncompressed documentation/ folder at root
- Single compressed source archive (`umig-src-{env}-{timestamp}.tar.gz`) containing only `/src/groovy/umig/` (excluding tests)

**Reference**:

- US-088: `/docs/roadmap/sprint7/US-088-build-process-deployment-packaging.md`
- US-088 Build Specs: `/docs/roadmap/sprint7/US-088-Build-Artifact-Specifications.md`

---

## Acceptance Criteria

### AC1: Deployment Folder Structure Created

**Given** a build execution for UAT or Production
**When** the build process completes successfully
**Then** a timestamped deployment folder is created with naming convention:

```
umig-deployment-{env}-{timestamp}/
```

**Example**: `umig-deployment-uat-2025-10-06T15-07-47/`

### AC2: BUILD Manifests at Root Level

**Given** the deployment folder structure
**When** examining the root directory contents
**Then** the following JSON manifest files exist at deployment folder root (uncompressed):

- `BUILD-MANIFEST-{env}-{timestamp}.json` (comprehensive build metadata)
- `BUILD-INFO-{env}-{timestamp}.json` (deployment configuration)
- `VERSION-COMPATIBILITY-{env}-{timestamp}.json` (component compatibility matrix)

**Example**:

```
umig-deployment-uat-2025-10-06T15-07-47/
├── BUILD-MANIFEST-uat-2025-10-06T15-07-47.json
├── BUILD-INFO-uat-2025-10-06T15-07-47.json
├── VERSION-COMPATIBILITY-uat-2025-10-06T15-07-47.json
```

### AC3: Uncompressed Database Folder at Root

**Given** the deployment folder structure
**When** examining the root directory contents
**Then** an uncompressed `database/` folder exists containing:

- `liquibase/` directory with all changelogs
- `migrations/` directory with SQL scripts
- `rollback/` directory with rollback procedures
- All database-related files remain uncompressed for immediate inspection

**Example**:

```
umig-deployment-uat-2025-10-06T15-07-47/
└── database/
    ├── liquibase/
    │   ├── db.changelog-master.xml
    │   └── changesets/
    ├── migrations/
    └── rollback/
```

### AC4: Uncompressed Documentation Folder at Root

**Given** the deployment folder structure
**When** examining the root directory contents
**Then** an uncompressed `documentation/` folder exists containing:

- `DEPLOYMENT-GUIDE.md`
- `UPGRADE-NOTES.md`
- `COMPATIBILITY-MATRIX.md`
- `ROLLBACK-PROCEDURES.md`
- All documentation files remain uncompressed for immediate review

**Example**:

```
umig-deployment-uat-2025-10-06T15-07-47/
└── documentation/
    ├── DEPLOYMENT-GUIDE.md
    ├── UPGRADE-NOTES.md
    ├── COMPATIBILITY-MATRIX.md
    └── ROLLBACK-PROCEDURES.md
```

### AC5: Source Code Compressed Archive

**Given** the deployment folder structure
**When** examining the root directory contents
**Then** a single compressed source archive exists with naming convention:

```
umig-src-{env}-{timestamp}.tar.gz
```

**Contains**: Complete `/src/groovy/umig/` directory structure
**Excludes**: `/src/groovy/umig/tests/` directory and all test files
**Compression**: gzip compression with tar archive format
**Location**: Deployment folder root level

**Example**:

```
umig-deployment-uat-2025-10-06T15-07-47/
└── umig-src-uat-2025-10-06T15-07-47.tar.gz
    └── (contains: api/, macros/, repository/, utils/, web/)
```

### AC6: Test Files Excluded from Source Archive

**Given** the source archive `umig-src-{env}-{timestamp}.tar.gz`
**When** extracting and examining archive contents
**Then**:

- Zero files from `/src/groovy/umig/tests/` directory are present
- No `*.test.groovy` files are present
- No `Test*.groovy` files are present
- Production source code directories are complete (api/, repository/, utils/, web/, macros/)
- Archive size is significantly smaller than development builds (which include tests)

**Validation Command**:

```bash
tar -tzf umig-src-uat-*.tar.gz | grep -E "(tests/|Test.*\.groovy|.*\.test\.groovy)" | wc -l
# Expected output: 0
```

### AC7: Build Scripts Updated for New Structure

**Given** the existing build infrastructure from US-088 Phase 1
**When** reviewing `/local-dev-setup/scripts/build/` directory
**Then**:

- `BuildOrchestrator.js` updated to create deployment folder structure
- `SourcePackager.js` updated to generate tar.gz instead of zip
- `MetadataGenerator.js` updated to place manifests at deployment folder root
- All build phase logic maintains compatibility with existing US-088 implementation
- No breaking changes to `npm run build:uat` and `npm run build:prod` commands

### AC8: Package.json Commands Remain Compatible

**Given** the updated build scripts
**When** executing existing NPM commands
**Then**:

- `npm run build:uat` creates UAT deployment folder successfully
- `npm run build:prod` creates Production deployment folder successfully
- `npm run build:dev` creates Development package (with tests included for debugging)
- Build completion time remains sub-second to ~2 seconds (performance maintained)
- No new required parameters or breaking changes to command interface

### AC9: Timestamp Format Consistency

**Given** all build artifacts and folder names
**When** examining timestamp values
**Then**:

- All timestamps use ISO 8601 format: `YYYY-MM-DDTHH-MM-SS`
- All timestamps are in UTC timezone
- Same timestamp value used across all artifacts in single build execution
- Timestamp format compatible with filesystem naming restrictions (no colons in path segments)

**Example**: `2025-10-06T15-07-47` (valid filesystem name, ISO 8601 compatible)

### AC10: Documentation Updated

**Given** the revised build packaging implementation
**When** reviewing documentation
**Then**:

- US-088 story updated with TD-020 cross-reference
- Build artifact specifications document reflects new structure
- Deployment guide includes instructions for new folder layout
- Migration notes explain differences from Phase 1 packaging
- All examples and screenshots updated to show new structure

---

## Technical Implementation Details

### File Structure Changes

**Before (US-088 Phase 1)**:

```
umig-app-v1.2.0-20240925.143055.zip (single compressed archive)
├── build-manifest.json
├── application/
├── database/
├── documentation/
└── tests/
```

**After (TD-020)**:

```
umig-deployment-uat-2025-10-06T15-07-47/ (deployment folder)
├── BUILD-MANIFEST-uat-2025-10-06T15-07-47.json
├── BUILD-INFO-uat-2025-10-06T15-07-47.json
├── VERSION-COMPATIBILITY-uat-2025-10-06T15-07-47.json
├── database/ (uncompressed)
│   ├── liquibase/
│   ├── migrations/
│   └── rollback/
├── documentation/ (uncompressed)
│   ├── DEPLOYMENT-GUIDE.md
│   ├── UPGRADE-NOTES.md
│   ├── COMPATIBILITY-MATRIX.md
│   └── ROLLBACK-PROCEDURES.md
└── umig-src-uat-2025-10-06T15-07-47.tar.gz (source code compressed)
```

### Source Archive Internal Structure

**Contents of `umig-src-{env}-{timestamp}.tar.gz`**:

```
src/groovy/umig/
├── api/
│   ├── v2/
│   │   ├── ApplicationsApi.groovy
│   │   ├── StepsApi.groovy
│   │   └── [22 other API files]
│   └── [legacy API files]
├── macros/
│   ├── UMIGMacro.groovy
│   └── [macro implementations]
├── repository/
│   ├── StepRepository.groovy
│   └── [15 other repositories]
├── utils/
│   ├── DatabaseUtil.groovy
│   └── [utility classes]
└── web/
    ├── js/
    │   ├── components/
    │   │   ├── ComponentOrchestrator.js (186KB)
    │   │   └── [component files]
    │   └── [frontend assets]
    └── css/
        └── [stylesheets]
```

**Excluded**: Entire `/src/groovy/umig/tests/` directory (164 test files from US-088)

### Build Script Modifications

**File**: `/local-dev-setup/scripts/build/BuildOrchestrator.js`

**Required Changes**:

1. Create deployment folder instead of single archive
2. Generate timestamped folder name using ISO 8601 format
3. Place manifests directly in deployment folder root (not nested)
4. Copy database/ and documentation/ folders uncompressed
5. Invoke SourcePackager to create tar.gz source archive

**File**: `/local-dev-setup/scripts/build/SourcePackager.js`

**Required Changes**:

1. Change archive format from ZIP to TAR.GZ
2. Implement tar + gzip compression using Node.js libraries
3. Update test exclusion logic to maintain US-088 Phase 1 behavior
4. Place source archive at deployment folder root level
5. Update archive naming convention to `umig-src-{env}-{timestamp}.tar.gz`

**File**: `/local-dev-setup/scripts/build/MetadataGenerator.js`

**Required Changes**:

1. Update manifest output paths to deployment folder root
2. Add timestamp to manifest filenames for clarity
3. Maintain all existing metadata content from US-088 Phase 1
4. Ensure manifest names include environment identifier

### Package.json Command Updates

**No Breaking Changes Required** - Commands maintain same interface:

```json
{
  "scripts": {
    "build:uat": "node scripts/build-release.js --env=uat",
    "build:prod": "node scripts/build-release.js --env=prod",
    "build:dev": "node scripts/build-release.js --env=dev --include-tests"
  }
}
```

**Internal behavior changes**:

- `--env=uat` creates `umig-deployment-uat-{timestamp}/` folder
- `--env=prod` creates `umig-deployment-prod-{timestamp}/` folder
- `--include-tests` flag includes tests in source archive for development builds

---

## Dependencies

### Internal Dependencies

- ✅ **US-088 Phase 1**: Build infrastructure complete (BuildOrchestrator, SourcePackager, MetadataGenerator)
- ✅ **Build Scripts**: Existing build script architecture operational
- ✅ **Test Exclusion**: 164 test file exclusion logic from US-088 Phase 1

### External Dependencies

- ✅ **Node.js**: tar and gzip libraries for compression (built-in or npm packages)
- ✅ **File System**: Write permissions for deployment folder creation
- ❌ **UAT Infrastructure**: UAT environment availability (managed separately)

### Technical Dependencies

- Node.js 16+ with tar/gzip compression support
- Existing US-088 Phase 1 build infrastructure
- File system permissions for folder creation and tar.gz generation

---

## Risk Assessment

### Medium Risk: Archive Format Compatibility

**Risk**: tar.gz format may have compatibility issues on Windows deployment targets
**Likelihood**: Low-Medium
**Impact**: Medium
**Mitigation**:

- Test extraction on Windows, macOS, Linux platforms
- Provide extraction instructions in deployment documentation
- Consider platform-specific extraction scripts if needed
  **Contingency**: Fall back to zip format for source archive if tar.gz proves incompatible

### Low Risk: Build Performance Impact

**Risk**: Creating deployment folder + tar.gz may slow build process
**Likelihood**: Low
**Impact**: Low
**Mitigation**:

- Benchmark build times before and after changes
- Optimize tar.gz compression settings for speed vs size tradeoff
- Maintain US-088 Phase 1 performance standards (sub-second builds)
  **Contingency**: Adjust compression levels or implement parallel processing

### Low Risk: Documentation Synchronization

**Risk**: Documentation may become outdated with packaging structure changes
**Likelihood**: Low
**Impact**: Low
**Mitigation**:

- Update all relevant documentation in same PR/commit
- Include documentation review in Definition of Done
- Cross-reference TD-020 in US-088 documentation
  **Contingency**: Create follow-up documentation task if gaps identified

---

## Definition of Done

### Technical Completion

- [ ] BuildOrchestrator.js updated for deployment folder creation
- [ ] SourcePackager.js updated for tar.gz generation
- [ ] MetadataGenerator.js updated for root-level manifest placement
- [ ] Test exclusion validated (zero test files in source archive)
- [ ] Timestamp format implemented consistently (ISO 8601 with filesystem compatibility)
- [ ] All build scripts maintain US-088 Phase 1 performance standards

### Testing Completion

- [ ] UAT build tested successfully on macOS (development environment)
- [ ] Production build tested successfully on macOS (development environment)
- [ ] Development build tested with --include-tests flag
- [ ] tar.gz extraction validated on Windows/macOS/Linux
- [ ] Build performance benchmarked (target: <2 seconds total build time)
- [ ] Test file exclusion verified (164 test files excluded as per US-088 Phase 1)

### Documentation Completion

- [ ] US-088 story updated with TD-020 cross-reference
- [ ] Build artifact specifications document reflects new structure
- [ ] Deployment guide includes new folder layout instructions
- [ ] Migration notes explain differences from Phase 1
- [ ] All examples and screenshots updated

### Quality Assurance

- [ ] Code reviewed and approved
- [ ] No breaking changes to existing build commands
- [ ] Cross-platform compatibility validated
- [ ] Documentation accuracy verified
- [ ] Performance standards maintained

---

## Success Metrics

### Quantitative Metrics

- **Build Time**: <2 seconds for UAT/Production builds (maintaining US-088 Phase 1 standards)
- **Source Archive Size**: ~1.3MB (similar to US-088 Phase 1 with 85.5% compression)
- **Test Exclusion Rate**: 100% (zero test files in UAT/Production source archives)
- **Cross-Platform Success**: 100% extraction success on Windows, macOS, Linux

### Qualitative Metrics

- **Deployment Clarity**: Improved structure clarity with uncompressed manifests and documentation
- **Distribution Efficiency**: Single source archive simplifies file transfer
- **Professional Standards**: Packaging aligns with enterprise deployment best practices
- **Operational Excellence**: Deployment engineers can inspect manifests without extraction

---

## Implementation Notes

### Timestamp Format Specification

**ISO 8601 with Filesystem Compatibility**:

```
Format: YYYY-MM-DDTHH-MM-SS
Example: 2025-10-06T15-07-47
Timezone: UTC
Rationale: ISO 8601 standard, filesystem-safe (no colons in path segments)
```

### Archive Compression Strategy

**tar.gz Benefits**:

- Industry standard for source code distribution
- Excellent compression ratios for text-heavy content (Groovy/JavaScript)
- Universal extraction support across platforms
- Preserves file permissions and directory structure

**Compression Settings**:

- gzip level: 6 (balanced speed/size) or 9 (maximum compression)
- tar format: ustar (universal compatibility)

### Build Script Architecture Alignment

**Maintain US-088 Phase 1 Design**:

- 6-phase BuildOrchestrator workflow preserved
- SourcePackager test exclusion logic unchanged
- MetadataGenerator comprehensive metadata generation maintained
- All existing build quality gates preserved

---

## Related Work

### Sprint 7 Foundation

- **US-088**: Build Process and Deployment Packaging (Phase 1 Complete)
- **US-088-B**: Database Version Manager Liquibase Integration
- **US-088-C**: Enhanced Database Version Manager Capabilities

### Sprint 8 Context

- **US-098**: Configuration Management System (recently completed)
- **TD-014-B**: Repository Layer Testing (completed)
- **TD-016**: Email Notification System (completed)
- **TD-017**: Email Service Optimization (completed)

### Future Enhancements

- **US-088 Phase 2**: Database version management and SQL consolidation (planned)
- **US-089**: UAT Environment Setup (requires deployment artifacts from this story)
- **US-090**: Production Deployment Pipeline (future sprint)

---

**Story Owner**: DevOps Engineering / Build Infrastructure
**Technical Reviewer**: Lead Developer
**Business Stakeholder**: Product Owner
**Architecture Reviewer**: Solution Architect
**Sprint**: Sprint 8
**Last Updated**: 2025-10-06

---

_This technical debt story refines the build packaging architecture from US-088 Phase 1 to provide professional, self-contained deployment artifacts with clear separation of concerns and improved operational clarity._
