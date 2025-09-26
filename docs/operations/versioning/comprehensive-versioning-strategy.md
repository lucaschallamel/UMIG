# UMIG Comprehensive Versioning Strategy v1.0

**Document**: ADR-061 Implementation Guide
**Author**: Lucas Challamel
**Date**: 2025-09-25
**Status**: PROPOSED
**Sprint**: US-088 (Build Process and Deployment Packaging)

## Executive Summary

UMIG requires a comprehensive versioning strategy that addresses its multi-component architecture while maintaining operational simplicity. This document defines a unified approach that balances component tracking with deployment clarity.

## 1. Versioning Architecture Overview

### 1.1 Multi-Component Structure

```
UMIG Application v1.x.y
├── Database Schema (Liquibase changelogs: 001-031+)
├── REST API v2.x (Established API versioning)
├── UI Components v1.x (25+ JavaScript components)
├── Backend Services (Groovy 3.0.15/ScriptRunner 9.21.0)
└── Testing Infrastructure (JS + Groovy dual-stack)
```

### 1.2 Unified Versioning Philosophy

- **Primary Identity**: UMIG Application version (v1.x.y)
- **Internal Tracking**: Component versions for operational visibility
- **Deployment Focus**: Single version for production deployments
- **Rollback Support**: Component-level granularity when needed

## 2. Version Structure & Semantics

### 2.1 UMIG Application Version Format

```
v{MAJOR}.{MINOR}.{PATCH}[-{PRE-RELEASE}][+{BUILD-METADATA}]

Examples:
✅ v1.2.0                 (Production Release)
✅ v1.3.0-rc.1           (Release Candidate)
✅ v1.2.1+build.20240925 (Patch with build info)
✅ v2.0.0-alpha.1        (Major version preview)
```

### 2.2 Version Increment Rules

- **MAJOR (x.0.0)**: Breaking API changes, database schema breaking changes, architectural shifts
- **MINOR (1.x.0)**: New features, component additions, non-breaking API enhancements
- **PATCH (1.2.x)**: Bug fixes, security patches, performance improvements
- **PRE-RELEASE**: alpha → beta → rc.{n} → production
- **BUILD-METADATA**: Timestamp, build number, commit hash for deployment tracking

### 2.3 Component Version Tracking Matrix

| Component            | Version Scheme        | Example      | Compatibility        |
| -------------------- | --------------------- | ------------ | -------------------- |
| **UMIG App**         | v1.x.y                | v1.2.0       | **Primary Version**  |
| **Database Schema**  | Sequential + Semantic | 031 → v1.2.0 | Maps to UMIG version |
| **REST API**         | Independent v2.x      | v2.3.1       | Backward compatible  |
| **UI Components**    | Aligned v1.x          | v1.2.0       | Aligned with UMIG    |
| **Backend Services** | Aligned v1.x          | v1.2.0       | Aligned with UMIG    |

## 3. Build Artifact Strategy

### 3.1 Artifact Naming Convention

```bash
# Production Deployments
umig-app-v{version}-{timestamp}.zip
umig-app-v1.2.0-20240925.143055.zip

# Pre-release Deployments
umig-app-v{version}-{timestamp}.zip
umig-app-v1.3.0-rc.1-20240925.143055.zip

# Development/CI Builds
umig-app-v{version}+{build-info}-{timestamp}.zip
umig-app-v1.2.1+ci.1234-20240925.143055.zip
```

### 3.2 Build Metadata Files

#### 3.2.1 `build-manifest.json` (Primary Metadata)

```json
{
  "umig": {
    "version": "1.2.0",
    "buildTimestamp": "2024-09-25T14:30:55Z",
    "buildNumber": "1234",
    "gitCommit": "abc123def456",
    "gitBranch": "main",
    "buildEnvironment": "ci"
  },
  "components": {
    "database": {
      "schemaVersion": "031",
      "semanticVersion": "1.2.0",
      "latestChangelog": "031_dto_performance_optimization.sql",
      "migrationStrategy": "liquibase"
    },
    "api": {
      "version": "2.3.1",
      "compatibilityLevel": "v2.x",
      "endpoints": 27,
      "breaking": false
    },
    "ui": {
      "version": "1.2.0",
      "componentCount": 25,
      "securityRating": "8.5/10",
      "architecture": "ComponentOrchestrator"
    },
    "backend": {
      "version": "1.2.0",
      "groovyVersion": "3.0.15",
      "scriptrunnerVersion": "9.21.0",
      "repositoryPattern": "unified"
    }
  },
  "dependencies": {
    "confluence": "8.5.x",
    "postgresql": "14.x",
    "java": "11+",
    "node": "18+"
  },
  "compatibility": {
    "minimumUmigVersion": "1.1.0",
    "databaseUpgrade": true,
    "apiBackwardCompatible": true,
    "uiMigrationRequired": false
  }
}
```

#### 3.2.2 `deployment-info.json` (Deployment Tracking)

```json
{
  "deployment": {
    "packageVersion": "1.2.0",
    "deploymentId": "umig-prod-20240925-143055",
    "environment": "production",
    "deployedBy": "automation",
    "deployedAt": "2024-09-25T14:45:30Z",
    "rollbackVersion": "1.1.2"
  },
  "validation": {
    "healthChecks": ["database", "api", "ui", "authentication"],
    "migrationStatus": "completed",
    "configurationValid": true,
    "securityScan": "passed"
  },
  "monitoring": {
    "metricsEndpoint": "/admin/metrics",
    "healthEndpoint": "/admin/health",
    "versionEndpoint": "/admin/version",
    "componentStatus": "/admin/components"
  }
}
```

## 4. File Location Strategy

### 4.1 Version Information Distribution

```
/
├── package.json                     # UMIG application version (primary)
├── build-manifest.json              # Build-time component matrix (generated)
├── deployment-info.json             # Runtime deployment tracking (generated)
├── docs/
│   ├── api/openapi.yaml             # API version documentation
│   └── version-compatibility.md    # Version compatibility matrix
├── liquibase/
│   ├── changelogs/                  # Sequential database versions
│   └── version-mapping.json        # Changelog → semantic mapping
├── src/groovy/umig/
│   ├── version/                     # Version utilities and constants
│   └── admin/version-endpoint.groovy # Runtime version API
└── local-dev-setup/
    ├── package.json                 # Dev tooling version
    └── scripts/build/               # Version generation scripts
```

### 4.2 Runtime Version Exposure

```groovy
// /rest/scriptrunner/latest/custom/admin/version
{
  "umig": {
    "version": "1.2.0",
    "build": "20240925.143055",
    "environment": "production"
  },
  "components": {
    "database": "031 (v1.2.0)",
    "api": "v2.3.1",
    "ui": "v1.2.0 (25 components)",
    "backend": "v1.2.0 (Groovy 3.0.15)"
  },
  "health": "healthy",
  "uptime": "72h 15m"
}
```

## 5. Deployment Tracking Strategy

### 5.1 Environment Version Matrix

```
Environment    | UMIG Version | Database | API    | Components | Status
---------------|--------------|----------|--------|------------|--------
Development    | 1.3.0-dev    | 032-dev  | 2.4.0  | 1.3.0      | Active
UAT            | 1.2.0-rc.2   | 031      | 2.3.1  | 1.2.0      | Testing
Production     | 1.1.2        | 030      | 2.3.0  | 1.1.2      | Stable
```

### 5.2 Deployment Validation Pipeline

```bash
# Pre-deployment validation
1. Version compatibility check
2. Database migration validation
3. API backward compatibility verification
4. Component integration testing
5. Security scan and approval

# Post-deployment verification
1. Health endpoint validation (/admin/health)
2. Version endpoint confirmation (/admin/version)
3. Component status verification (/admin/components)
4. Functional smoke testing
5. Performance baseline validation
```

### 5.3 Rollback Strategy

```bash
# Rollback Decision Matrix
Severity       | Component      | Action
---------------|----------------|---------------------------
CRITICAL       | Any            | Full application rollback
HIGH           | Database       | Schema rollback + app rollback
HIGH           | API Breaking   | API version rollback + notifications
MEDIUM         | UI Components  | Component-level rollback
LOW            | Backend        | Hot-fix deployment
```

## 6. Integration Points

### 6.1 Git Integration

```bash
# Git tagging strategy
git tag -a v1.2.0 -m "UMIG v1.2.0 - Production Release"
git tag -a v1.3.0-rc.1 -m "UMIG v1.3.0 Release Candidate 1"

# Branch to version mapping
main         → v1.x.0 (production releases)
release/*    → v1.x.0-rc.n (release candidates)
develop      → v1.x.0-dev (development versions)
hotfix/*     → v1.x.y (patch releases)
```

### 6.2 Liquibase Integration

```sql
-- Version mapping table
CREATE TABLE version_tracking (
    changelog_id VARCHAR(10) PRIMARY KEY,  -- '031'
    semantic_version VARCHAR(20),          -- '1.2.0'
    umig_version VARCHAR(20),              -- '1.2.0'
    deployed_at TIMESTAMP,
    environment VARCHAR(20)
);
```

### 6.3 ScriptRunner Integration

```groovy
// Version constants
class UMIGVersion {
    static final String VERSION = "1.2.0"
    static final String BUILD = "20240925.143055"
    static final String API_VERSION = "v2.3.1"
    static final String COMPONENT_VERSION = "1.2.0"

    static Map getFullVersionInfo() {
        return [
            umig: VERSION,
            build: BUILD,
            api: API_VERSION,
            components: COMPONENT_VERSION,
            database: DatabaseVersionUtil.getCurrentVersion()
        ]
    }
}
```

## 7. Operational Procedures

### 7.1 Version Release Process

```bash
# 1. Version Planning
- Define version increment (major/minor/patch)
- Update component compatibility matrix
- Plan database schema changes

# 2. Development Phase
- Update package.json version
- Generate component version matrix
- Update API documentation versions

# 3. Build Phase
- Generate build-manifest.json
- Create deployment artifacts
- Run integration testing

# 4. Deployment Phase
- Generate deployment-info.json
- Execute deployment pipeline
- Verify version endpoints
- Update environment tracking

# 5. Post-Deployment
- Monitor health endpoints
- Validate version consistency
- Update documentation
- Communicate to stakeholders
```

### 7.2 Version Validation Checklist

- [ ] UMIG version updated in package.json
- [ ] Component versions aligned or documented
- [ ] Database changelog → semantic version mapped
- [ ] API version compatibility verified
- [ ] Build manifest generated and valid
- [ ] Deployment info populated correctly
- [ ] Health endpoints returning correct versions
- [ ] Environment tracking updated
- [ ] Rollback plan documented and tested

## 8. Success Criteria

### 8.1 Operational Success Metrics

- **Version Clarity**: Any deployment can be unambiguously identified
- **Component Tracking**: All component versions visible in production
- **Rollback Capability**: Any component can be rolled back with clear impact assessment
- **Integration Seamless**: Existing tools (Git, Liquibase, ScriptRunner) work transparently
- **Operational Visibility**: Monitoring tools can track and alert on version mismatches

### 8.2 Development Team Benefits

- Clear versioning strategy for all components
- Simplified build and deployment artifact management
- Automated version generation and tracking
- Comprehensive rollback and recovery procedures
- Integration with existing development workflows

## 9. Implementation Roadmap

### Phase 1: Foundation (Sprint 7 - US-088)

- [ ] Create version tracking utilities
- [ ] Update package.json with unified versioning
- [ ] Generate build-manifest.json structure
- [ ] Create version endpoint API

### Phase 2: Integration (Sprint 8)

- [ ] Integrate with build pipeline
- [ ] Create deployment tracking
- [ ] Update Liquibase version mapping
- [ ] Implement rollback procedures

### Phase 3: Operational (Sprint 9)

- [ ] Environment tracking dashboard
- [ ] Monitoring and alerting integration
- [ ] Documentation and training
- [ ] UAT validation and production deployment

## 10. Conclusion

This versioning strategy provides UMIG with:

- **Operational Simplicity**: Single UMIG version for production communication
- **Component Visibility**: Full component tracking for debugging and rollback
- **Deployment Confidence**: Comprehensive validation and rollback capabilities
- **Tool Integration**: Seamless integration with existing development tools
- **Scalability**: Framework supports future architectural evolution

The strategy balances the complexity of multi-component architecture with the operational need for clear, unambiguous version identification in production environments.
