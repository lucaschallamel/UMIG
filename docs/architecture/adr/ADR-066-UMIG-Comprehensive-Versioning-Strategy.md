# ADR-066: UMIG Comprehensive Versioning Strategy

**Status**: Accepted
**Date**: 2025-09-25
**Decision Makers**: Development Team, Technical Leadership
**Architecture Review**: US-088 Implementation Team

## Context

UMIG has evolved into a sophisticated multi-component architecture encompassing database schema (Liquibase changelogs), REST APIs (v2.x), UI components (25+ JavaScript components), backend services (Groovy/ScriptRunner), and comprehensive testing infrastructure. As the application matures and deployment frequency increases, the lack of a unified versioning strategy has created operational challenges:

### Problem Statement

**Multi-Component Versioning Complexity**:

- **Database Schema**: Sequential numbering (001-031+) disconnected from application versioning
- **REST API**: Independent v2.x versioning creating compatibility confusion
- **UI Components**: Ad-hoc versioning without clear alignment to application releases
- **Backend Services**: No systematic version tracking for Groovy services
- **Testing Infrastructure**: Dual-stack (JavaScript/Groovy) without version coordination

**Operational Challenges**:

1. **Deployment Ambiguity**: No clear way to identify what was deployed in production
2. **Rollback Complexity**: Uncertainty about component compatibility during rollbacks
3. **Version Drift**: Components can become misaligned without detection
4. **Integration Issues**: Difficulty tracking which component versions work together
5. **Support Challenges**: Customer issues difficult to diagnose without clear version identification

**Current State Analysis**:

- Database schema at changeset 031 with no semantic mapping
- REST API at v2.3.1 with backward compatibility concerns
- UI components at various stages of ComponentOrchestrator architecture
- No unified build artifact strategy for multi-environment deployments

## Decision

Implement a **comprehensive multi-component versioning strategy** that balances operational simplicity with component-level granularity, providing clear version identification for production deployments while maintaining component tracking for debugging and rollback scenarios.

### Core Principles

1. **Unified Application Identity**: Single UMIG version (v1.x.y) as primary production identifier
2. **Component Transparency**: Full component version visibility for operational troubleshooting
3. **Semantic Versioning**: Adherence to SemVer 2.0 principles for predictable version management
4. **Deployment Traceability**: Complete artifact tracking from build to production deployment
5. **Rollback Capability**: Component-level granularity for targeted rollback operations

### Versioning Architecture

#### Primary Versioning Structure

```
UMIG Application Version: v{MAJOR}.{MINOR}.{PATCH}[-{PRE-RELEASE}][+{BUILD-METADATA}]

Examples:
✅ v1.2.0                 (Production Release)
✅ v1.3.0-rc.1           (Release Candidate)
✅ v1.2.1+build.20240925 (Patch with build info)
✅ v2.0.0-alpha.1        (Major version preview)
```

#### Component Version Alignment Strategy

| Component            | Versioning Strategy            | Alignment           | Example      |
| -------------------- | ------------------------------ | ------------------- | ------------ |
| **UMIG Application** | Semantic (Primary)             | N/A                 | v1.2.0       |
| **Database Schema**  | Sequential → Semantic Mapping  | Aligned             | 031 → v1.2.0 |
| **REST API**         | Independent with Compatibility | Backward Compatible | v2.3.1       |
| **UI Components**    | Aligned with Application       | Aligned             | v1.2.0       |
| **Backend Services** | Aligned with Application       | Aligned             | v1.2.0       |

#### Version Increment Rules

- **MAJOR (x.0.0)**: Breaking API changes, database schema breaking changes, architectural shifts
- **MINOR (1.x.0)**: New features, component additions, non-breaking API enhancements
- **PATCH (1.2.x)**: Bug fixes, security patches, performance improvements
- **PRE-RELEASE**: alpha → beta → rc.{n} → production progression
- **BUILD-METADATA**: Timestamp, build number, commit hash for deployment tracking

### Build Artifact Strategy

#### Artifact Naming Convention

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

#### Build Metadata Files

**Primary Metadata (`build-manifest.json`)**:

- UMIG version and build information
- Complete component version matrix
- Git commit details and branch information
- Dependency versions and compatibility levels
- Security scan results and compliance status
- Quality metrics and test coverage

**Deployment Tracking (`deployment-info.json`)**:

- Deployment environment and timestamp
- Rollback target and compatibility information
- Migration requirements and validation results
- Health check endpoints and monitoring configuration

**Compatibility Matrix (`version-compatibility.json`)**:

- Component compatibility relationships
- Upgrade and rollback compatibility paths
- Migration procedures and requirements
- Deprecation schedules and support timelines

### Integration Points

#### Git Integration

```bash
# Git tagging strategy aligned with versioning
git tag -a v1.2.0 -m "UMIG v1.2.0 - Production Release"
git tag -a v1.3.0-rc.1 -m "UMIG v1.3.0 Release Candidate 1"

# Branch to version mapping
main         → v1.x.0 (production releases)
release/*    → v1.x.0-rc.n (release candidates)
develop      → v1.x.0-dev (development versions)
hotfix/*     → v1.x.y (patch releases)
```

#### Database Integration

```sql
-- Version tracking table for schema-semantic mapping
CREATE TABLE version_tracking (
    changelog_id VARCHAR(10) PRIMARY KEY,  -- '031'
    semantic_version VARCHAR(20),          -- '1.2.0'
    umig_version VARCHAR(20),              -- '1.2.0'
    deployed_at TIMESTAMP,
    environment VARCHAR(20)
);
```

#### Runtime Version Exposure

```groovy
// Version constants and runtime access
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

## Alternatives Considered

### Alternative 1: Component-Independent Versioning

**Approach**: Allow each component to version independently without coordination
**Rejected Because**:

- Increases operational complexity for production deployments
- Makes rollback decisions extremely difficult due to compatibility matrix complexity
- Creates customer support challenges with unclear version identification
- Requires extensive documentation to track component compatibility

### Alternative 2: Monolithic Single Version

**Approach**: Force all components to use identical version numbers
**Rejected Because**:

- API versioning independence is required for backward compatibility
- Database schema evolution doesn't align with application feature releases
- Testing infrastructure requires independent evolution cycles
- Limits flexibility for component-specific hotfixes and patches

### Alternative 3: Build Number Only Versioning

**Approach**: Use sequential build numbers instead of semantic versioning
**Rejected Because**:

- Eliminates semantic meaning from version numbers
- Makes compatibility determination impossible without lookup tables
- Provides no indication of change severity or impact
- Industry standard practices favor semantic versioning for clarity

### Alternative 4: Date-Based Versioning

**Approach**: Use date-based version identifiers (e.g., 2024.09.25)
**Rejected Because**:

- Provides no indication of change magnitude or compatibility
- Makes rollback target selection difficult without additional metadata
- Industry tooling and practices are optimized for semantic versioning
- Calendar-based versioning doesn't reflect development velocity or change impact

## Consequences

### Positive Outcomes

**Operational Clarity**:

- ✅ Clear production deployment identification with single UMIG version
- 🔍 Complete component visibility for troubleshooting and debugging
- 📊 Standardized build artifacts with comprehensive metadata
- 🔄 Predictable rollback compatibility matrix with automated validation

**Development Efficiency**:

- 🚀 Streamlined build and deployment processes with consistent artifact naming
- 📈 Improved development velocity through clear version progression
- 🔧 Enhanced debugging capabilities with component-level version tracking
- 📋 Standardized release planning with semantic version increments

**Risk Mitigation**:

- 🛡️ Version drift detection and automated alerting
- 📱 Comprehensive rollback procedures with compatibility validation
- 🔒 Security compliance tracking through version-specific metadata
- 📊 Performance baseline tracking aligned with version releases

**Stakeholder Benefits**:

- 👥 Clear communication of deployment status and version identification
- 📞 Improved customer support with precise version identification
- 📈 Enhanced monitoring and alerting with version-aware metrics
- 🎯 Simplified production issue resolution with component traceability

### Potential Risks and Mitigations

**Risk 1: Version Alignment Complexity**

- **Mitigation**: Automated build scripts ensure component version synchronization
- **Monitoring**: Version drift detection alerts for misaligned components
- **Process**: Clear procedures for handling version alignment issues

**Risk 2: Backward Compatibility Management**

- **Mitigation**: Comprehensive compatibility matrix with automated validation
- **Testing**: Extensive backward compatibility testing in CI/CD pipeline
- **Documentation**: Clear deprecation schedules and migration guides

**Risk 3: Build Process Overhead**

- **Mitigation**: Optimized build scripts with parallel component processing
- **Automation**: Automated metadata generation and validation
- **Performance**: Build process performance monitoring and optimization

**Risk 4: Team Adoption Challenges**

- **Mitigation**: Comprehensive training and documentation for new versioning process
- **Support**: Technical leadership involvement during transition period
- **Tools**: Enhanced tooling to simplify version management tasks

### Implementation Guidelines

#### Version Release Process

1. **Version Planning**: Define version increment based on change analysis
2. **Component Alignment**: Update component versions according to alignment strategy
3. **Build Generation**: Automated build manifest and metadata generation
4. **Validation Testing**: Comprehensive compatibility and functionality testing
5. **Deployment Execution**: Staged deployment with version validation at each step
6. **Post-Deployment**: Health monitoring and version verification across environments

#### Quality Gates

- **Version Consistency**: All aligned components must match UMIG version
- **Compatibility Validation**: Backward compatibility verified for API and database changes
- **Build Quality**: Security scans, test coverage, and performance baselines validated
- **Metadata Completeness**: Build manifest, deployment info, and compatibility matrix complete

#### Success Criteria

- **Deployment Clarity**: Any deployment can be unambiguously identified by UMIG version
- **Component Visibility**: All component versions accessible through runtime endpoints
- **Rollback Confidence**: Automated rollback target selection with compatibility validation
- **Tool Integration**: Seamless integration with existing Git, Liquibase, and ScriptRunner workflows

## Related Decisions

- **ADR-008**: Database Migration Strategy with Liquibase (schema versioning foundation)
- **ADR-017**: V2 REST API Architecture (API versioning independence)
- **ADR-049**: Service Layer Standardization Architecture (backend component organization)
- **ADR-053**: Technology-Prefixed Test Commands Architecture (testing infrastructure versioning)
- **ADR-054**: Enterprise Component Security Architecture Pattern (UI component versioning)
- **US-088**: Build Process and Deployment Packaging (implementation vehicle)

## References

- [UMIG Comprehensive Versioning Strategy](../operations/versioning/comprehensive-versioning-strategy.md) - Complete strategy document
- [US-088 Implementation](../roadmap/sprint7/US-088-build-process-deployment-packaging.md) - Sprint implementation plan
- [Build Artifact Specifications](../roadmap/sprint7/US-088-Build-Artifact-Specifications.md) - Detailed artifact requirements
- [Operational Monitoring Strategy](../roadmap/sprint7/US-088-Operational-Monitoring-Strategy.md) - Version tracking implementation
- [Rollback Compatibility Procedures](../roadmap/sprint7/US-088-Rollback-Compatibility-Procedures.md) - Version-aware rollback procedures
- [Semantic Versioning 2.0.0](https://semver.org/) - Industry standard reference

---

**Decision Authority**: Development Team, Technical Leadership
**Implementation Status**: Approved for US-088 Implementation
**Next Review**: Sprint 8 Planning Session
**Success Criteria**: Unified versioning operational across all UMIG components with <5 minute deployment identification capability
