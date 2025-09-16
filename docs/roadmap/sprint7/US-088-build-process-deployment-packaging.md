# US-088: Build Process and Deployment Packaging for UAT/Production

**Story ID**: US-088
**Title**: Build Process and Deployment Packaging for UAT/Production
**Sprint**: Sprint 7
**Priority**: HIGH (Critical - Required for UAT deployment)
**Story Points**: 5
**Type**: Technical Enabler
**Theme**: Deployment Infrastructure

## Executive Summary

As a **Development Team**, I need a **comprehensive build and packaging system** so that **the UMIG application can be reliably deployed to UAT and Production environments with consistent, repeatable processes**.

## Business Context

### Business Value

- **Deployment Readiness**: Enables Sprint 7 delivery to UAT environment
- **Risk Mitigation**: Reduces deployment failures through standardized packaging
- **Operational Efficiency**: Automated build process reduces manual errors
- **Compliance**: Establishes audit trail for production deployments
- **Team Velocity**: Streamlines release process for future sprints

### Strategic Alignment

- Critical dependency for US-089 (UAT Environment Setup)
- Prerequisite for US-090 (Production Deployment Pipeline)
- Supports Sprint 7 milestone: "UAT-Ready Application"

## User Story

**As a** DevOps Engineer / Release Manager
**I want** an automated build process that packages the UMIG application for deployment
**So that** I can confidently deploy to UAT and Production environments with minimal risk

## Technical Requirements

### 1. Source Code Packaging

#### 1.1 Application Archive Creation

- **Source Directory**: `/src/groovy/umig/`
- **Inclusion Pattern**:
  - ✅ `/src/groovy/umig/api/` (All REST endpoints)
  - ✅ `/src/groovy/umig/macros/` (Confluence macros)
  - ✅ `/src/groovy/umig/repository/` (Data access layer)
  - ✅ `/src/groovy/umig/utils/` (Utility classes)
  - ✅ `/src/groovy/umig/web/` (Frontend components)
- **Exclusion Pattern**:
  - ❌ `/src/groovy/umig/tests/` (Complete exclusion)
  - ❌ `/src/groovy/umig/**/*.test.groovy`
  - ❌ `/src/groovy/umig/**/Test*.groovy`
- **Output Format**: ZIP archive with optimal compression
- **Naming Convention**: `umig-app-v{version}-{timestamp}.zip`

#### 1.2 Archive Structure Validation

```
umig-app-v{version}-{timestamp}.zip
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

### 2. Database Deployment Options

#### 2.1 Option A - Consolidated SQL Script

- **Input Sources**: All Liquibase changesets in execution order
- **Processing Order**:
  1. Schema creation (`00_create_schema.sql`)
  2. Table definitions (`01_create_tables.sql`)
  3. Indexes and constraints (`02_indexes_constraints.sql`)
  4. Views and procedures (`03_views_procedures.sql`)
  5. Reference data (`04_seed_data.sql`)
  6. Migration-specific data (`05_migration_data.sql`)
- **Output**: `umig-db-full-v{version}.sql`
- **Validation**: PostgreSQL syntax validation
- **Size Estimate**: ~50MB (based on current changeset volume)

#### 2.2 Option B - Liquibase Package

- **Source Directory**: `/local-dev-setup/liquibase/`
- **Inclusion Pattern**:
  - ✅ `db.changelog-master.xml`
  - ✅ `changesets/*.sql`
  - ✅ `liquibase.properties.template`
  - ✅ `README.md` (deployment instructions)
- **Output**: `umig-db-liquibase-v{version}.zip`
- **Additional Files**:
  - Environment-specific property templates
  - Rollback scripts where applicable
  - Liquibase execution wrapper scripts

### 3. Build Script Implementation

#### 3.1 Core Build Script

- **Location**: `/local-dev-setup/scripts/build-release.js`
- **Runtime**: Node.js 16+ compatible
- **Dependencies**: Minimal (archiver, crypto, fs-extra)
- **Configuration**: `build-config.json` for environment-specific settings

#### 3.2 NPM Command Integration

```json
{
  "scripts": {
    "build:uat": "node scripts/build-release.js --env=uat",
    "build:prod": "node scripts/build-release.js --env=prod",
    "build:dev": "node scripts/build-release.js --env=dev --include-tests"
  }
}
```

#### 3.3 Version Management

- **Source**: `package.json` version field (semver format)
- **Git Integration**: Include commit hash and branch info
- **Build Numbering**: `{major}.{minor}.{patch}-{build}`
- **Environment Suffixes**: `-uat`, `-prod`, `-dev`

### 4. Build Artifacts Structure

```
umig-release-v{version}-{env}-{timestamp}/
├── application/
│   └── umig-app-v{version}-{timestamp}.zip          # Application code (45MB est.)
├── database/
│   ├── umig-db-full-v{version}.sql                  # Option A: Consolidated SQL (50MB est.)
│   └── umig-db-liquibase-v{version}.zip             # Option B: Liquibase package (12MB est.)
├── documentation/
│   ├── RELEASE-NOTES.md                             # Sprint 7 release notes
│   ├── DEPLOYMENT-GUIDE.md                          # Step-by-step deployment
│   ├── ROLLBACK-PROCEDURE.md                        # Emergency rollback steps
│   └── CONFIGURATION-GUIDE.md                       # Environment configuration
├── verification/
│   ├── CHECKSUMS.txt                                # SHA256 checksums
│   ├── build-info.json                              # Build metadata
│   └── artifact-manifest.json                       # Complete file inventory
└── scripts/
    ├── deploy.sh                                     # Linux/Mac deployment script
    ├── deploy.ps1                                    # Windows PowerShell script
    └── verify-deployment.js                         # Post-deployment verification
```

## Acceptance Criteria

### AC-1: Build Script Functionality

**GIVEN** a clean development environment
**WHEN** I run `npm run build:uat`
**THEN** the build process should:

- ✅ Complete without errors in <5 minutes
- ✅ Create all required artifacts in correct structure
- ✅ Generate valid checksums for all files
- ✅ Log build progress with timestamps
- ✅ Exit with code 0 on success, non-zero on failure

### AC-2: Source Code Packaging Validation

**GIVEN** the application source code
**WHEN** the build creates the application archive
**THEN** the archive should:

- ✅ Include ALL production Groovy files from specified directories
- ✅ EXCLUDE ALL test files (zero test files in archive)
- ✅ Maintain original directory structure
- ✅ Be <50MB in size (reasonable compression)
- ✅ Be extractable without errors on Windows/Mac/Linux

### AC-3: Database Packaging Options

**GIVEN** the Liquibase changesets
**WHEN** database packaging is executed
**THEN** both options should:

- ✅ **Option A**: Generate syntactically valid PostgreSQL SQL
- ✅ **Option A**: Include all changesets in correct execution order
- ✅ **Option B**: Package complete Liquibase directory structure
- ✅ **Option B**: Include environment-specific property templates
- ✅ Both options execute without syntax errors on test database

### AC-4: Build Metadata and Verification

**GIVEN** a completed build
**WHEN** examining build artifacts
**THEN** metadata should include:

- ✅ Accurate version information from package.json
- ✅ Git commit hash and branch name
- ✅ Build timestamp (ISO 8601 format)
- ✅ File inventory with sizes and checksums
- ✅ Environment configuration used
- ✅ Build script version and Node.js version

### AC-5: Documentation Completeness

**GIVEN** the build artifacts
**WHEN** reviewing documentation
**THEN** documentation should:

- ✅ **DEPLOYMENT-GUIDE.md**: Step-by-step deployment instructions
- ✅ **ROLLBACK-PROCEDURE.md**: Emergency rollback procedures
- ✅ **RELEASE-NOTES.md**: Sprint 7 features and changes
- ✅ **CONFIGURATION-GUIDE.md**: Environment-specific settings
- ✅ All documentation validated for accuracy and completeness

### AC-6: Cross-Platform Compatibility

**GIVEN** build artifacts
**WHEN** tested on different platforms
**THEN** the build should:

- ✅ Execute successfully on Windows 10/11
- ✅ Execute successfully on macOS (Intel and ARM)
- ✅ Execute successfully on Ubuntu Linux
- ✅ Generate identical artifacts across platforms (checksum verification)
- ✅ Deployment scripts work on target platforms

### AC-7: Error Handling and Recovery

**GIVEN** various failure scenarios
**WHEN** the build encounters errors
**THEN** error handling should:

- ✅ Provide clear, actionable error messages
- ✅ Clean up partial artifacts on failure
- ✅ Log error details with context
- ✅ Exit with appropriate error codes
- ✅ Suggest recovery actions where possible

### AC-8: Performance and Resource Requirements

**GIVEN** build execution
**WHEN** monitoring resource usage
**THEN** performance should meet:

- ✅ Complete build in <5 minutes on standard development machine
- ✅ Memory usage <1GB during build
- ✅ Temporary disk usage <200MB
- ✅ No memory leaks or resource exhaustion
- ✅ Efficient compression (>70% for source code)

## Testing Requirements

### Unit Testing

- ✅ **Build Script Functions**: Archive creation, checksum generation, version parsing
- ✅ **File Filtering**: Test exclusion logic with mock directory structures
- ✅ **Error Scenarios**: Invalid paths, permission errors, disk space issues
- ✅ **Configuration Parsing**: Environment-specific build configurations

### Integration Testing

- ✅ **End-to-End Build**: Complete build process with real source code
- ✅ **Archive Extraction**: Verify archives extract correctly on all platforms
- ✅ **Database Validation**: SQL scripts execute on clean PostgreSQL instance
- ✅ **Checksum Verification**: All generated checksums match actual file contents

### Acceptance Testing

- ✅ **UAT Deployment Simulation**: Deploy artifacts to UAT-like environment
- ✅ **Rollback Testing**: Verify rollback procedures work correctly
- ✅ **Performance Benchmarking**: Build time and resource usage measurement
- ✅ **Cross-Platform Validation**: Identical artifacts across operating systems

## Implementation Plan

### Phase 1: Core Build Infrastructure (Sprint 7, Week 1)

1. Create build script framework in `/local-dev-setup/scripts/build-release.js`
2. Implement source code filtering and archiving
3. Add NPM command integration
4. Basic error handling and logging

### Phase 2: Database Packaging (Sprint 7, Week 2)

1. Implement Option A: Consolidated SQL generation
2. Implement Option B: Liquibase packaging
3. Add validation for both database options
4. Create database deployment scripts

### Phase 3: Documentation and Validation (Sprint 7, Week 2)

1. Generate comprehensive deployment documentation
2. Implement checksum and metadata generation
3. Cross-platform testing and validation
4. Performance optimization

### Phase 4: Integration and Testing (Sprint 7, Week 3)

1. End-to-end testing with complete source code
2. UAT deployment simulation
3. Team training and documentation review
4. Production readiness assessment

## Dependencies

### Internal Dependencies

- ✅ **US-082-C**: Entity migration standard (completed) - Provides stable data model
- ⚠️ **US-089**: UAT Environment Setup - This story enables US-089
- ⚠️ **US-090**: Production Deployment Pipeline - This story is prerequisite

### External Dependencies

- ✅ **Development Environment**: Complete UMIG development setup
- ✅ **Source Code Stability**: All Sprint 7 development features completed
- ✅ **Database Schema**: All Liquibase changesets finalized
- ❌ **UAT Infrastructure**: UAT environment availability (managed by US-089)

### Technical Dependencies

- ✅ Node.js 16+ (existing development requirement)
- ✅ Git repository access (existing)
- ✅ PostgreSQL client tools (existing)
- ❌ UAT deployment infrastructure (out of scope)

## Risk Assessment

### High Risk (Likelihood: Medium, Impact: High)

1. **Source Code Exclusion Errors**
   - Risk: Test files accidentally included in production build
   - Mitigation: Comprehensive unit tests for file filtering logic
   - Contingency: Manual verification step in deployment guide

2. **Database Migration Ordering**
   - Risk: Liquibase changesets consolidated in wrong order
   - Mitigation: Automated ordering based on Liquibase dependency graph
   - Contingency: Option B (Liquibase package) as fallback

### Medium Risk (Likelihood: Medium, Impact: Medium)

3. **Cross-Platform Archive Issues**
   - Risk: Archive corruption or path issues on different platforms
   - Mitigation: Multi-platform testing in CI/CD pipeline
   - Contingency: Platform-specific build variations

4. **Build Performance Degradation**
   - Risk: Build time exceeds acceptable limits as codebase grows
   - Mitigation: Incremental build capabilities and efficient compression
   - Contingency: Build optimization or parallel processing

### Low Risk (Likelihood: Low, Impact: Medium)

5. **Version Management Conflicts**
   - Risk: Version numbering inconsistencies between package.json and Git
   - Mitigation: Single source of truth (package.json) with Git validation
   - Contingency: Manual version override capability

## Security Considerations

### Secrets and Credentials

- ❌ **No hardcoded credentials** in build artifacts
- ❌ **No environment-specific passwords** in configuration files
- ✅ **Template-based configuration** with placeholder values
- ✅ **Build-time secret exclusion** validation

### Access Control

- ✅ **Build artifacts readable** by deployment automation
- ✅ **Source code protection** through proper file permissions
- ✅ **Deployment scripts** require appropriate privileges
- ✅ **Audit trail** for all build and deployment activities

### Supply Chain Security

- ✅ **Checksum validation** for all artifacts
- ✅ **Build provenance** tracking with Git commit information
- ✅ **Dependency scanning** for Node.js build dependencies
- ✅ **Immutable artifacts** once created and verified

## Rollback Strategy

### Build Rollback

1. **Failed Build Recovery**
   - Clean up partial artifacts automatically
   - Preserve previous successful build artifacts
   - Clear error state and retry capability

2. **Deployment Rollback**
   - Previous version artifacts maintained for 30 days
   - Database rollback scripts generated where possible
   - Application code rollback through ScriptRunner admin interface

### Emergency Procedures

1. **Critical Build Failure**
   - Manual build process documented as fallback
   - Direct ScriptRunner console deployment capability
   - Emergency database schema rollback procedures

2. **Production Deployment Issues**
   - Immediate rollback to previous stable version
   - Database rollback execution (where applicable)
   - Incident escalation and communication procedures

## Definition of Done

### Technical Completion

- ✅ Build script implemented and tested
- ✅ All acceptance criteria verified
- ✅ Cross-platform compatibility confirmed
- ✅ Unit and integration tests passing
- ✅ Performance benchmarks met

### Documentation Completion

- ✅ Deployment guide reviewed and approved
- ✅ Rollback procedures tested and validated
- ✅ Release notes comprehensive and accurate
- ✅ Configuration guide complete with examples

### Team Readiness

- ✅ Development team trained on build process
- ✅ DevOps team trained on deployment procedures
- ✅ UAT deployment simulation completed successfully
- ✅ Production readiness checklist approved

### Quality Assurance

- ✅ Security review completed (no secrets in artifacts)
- ✅ Compliance review for audit requirements
- ✅ Performance validation under load
- ✅ Disaster recovery procedures tested

## Success Metrics

### Quantitative Metrics

- **Build Success Rate**: >99% (target: zero failed builds in Sprint 7)
- **Build Performance**: <5 minutes for complete build
- **Artifact Size**: Application archive <50MB, Database <60MB combined
- **Cross-Platform Success**: 100% identical checksums across platforms

### Qualitative Metrics

- **Team Confidence**: High confidence in deployment process
- **Documentation Quality**: Self-service deployment capability
- **Error Recovery**: Clear error messages and recovery procedures
- **Operational Readiness**: UAT environment ready for Sprint 7 delivery

## Implementation Notes

### Build Script Architecture

```javascript
// /local-dev-setup/scripts/build-release.js
const BuildOrchestrator = {
  validateEnvironment() {
    /* Pre-build validation */
  },
  createApplicationArchive() {
    /* Source code packaging */
  },
  generateDatabaseScripts() {
    /* Both SQL and Liquibase options */
  },
  createDocumentation() {
    /* Auto-generate deployment docs */
  },
  generateMetadata() {
    /* Build info and checksums */
  },
  packageArtifacts() {
    /* Final artifact assembly */
  },
};
```

### Configuration Management

```json
// build-config.json
{
  "environments": {
    "uat": {
      "version_suffix": "-uat",
      "database_option": "liquibase",
      "include_debug": false
    },
    "prod": {
      "version_suffix": "",
      "database_option": "consolidated",
      "include_debug": false
    }
  }
}
```

### Deployment Integration

- Artifacts designed for ScriptRunner console import
- Database scripts compatible with standard PostgreSQL tools
- Documentation includes both automated and manual deployment options
- Integration points defined for future CI/CD pipeline (US-090)

---

**Story Owner**: DevOps Engineering
**Technical Reviewer**: Lead Developer
**Business Stakeholder**: Product Owner
**Created**: 2025-01-16
**Last Updated**: 2025-01-16
**Status**: Ready for Development

---

_This story enables the critical path for UAT deployment and establishes the foundation for production deployment automation in future sprints._
