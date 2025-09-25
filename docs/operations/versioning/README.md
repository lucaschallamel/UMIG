# UMIG Versioning Operations Guide

**Document**: Central Navigation for UMIG Versioning Operations
**Version**: 1.0
**Last Updated**: 2025-09-25
**Owner**: Development Team, DevOps Team, Operations Team

## Overview

This directory contains comprehensive operational procedures for UMIG versioning strategy implementation, providing day-to-day guidance for version management, build artifacts, deployment tracking, and rollback operations across all environments.

## Quick Navigation

| Document                                                                      | Purpose                             | Primary Users                      |
| ----------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------- |
| **[Version Management Procedures](version-management-procedures.md)**         | Daily version management workflows  | Development Team, Release Manager  |
| **[Build Artifact Specifications](build-artifact-specifications.md)**         | Artifact creation and management    | DevOps Team, CI/CD Engineers       |
| **[Deployment Tracking Guide](deployment-tracking-guide.md)**                 | Environment monitoring and tracking | Operations Team, DevOps Team       |
| **[Rollback Compatibility Procedures](rollback-compatibility-procedures.md)** | Emergency rollback and recovery     | Operations Team, Incident Response |

## Implementation Architecture

### Architectural Foundation

- **[ADR-066 - UMIG Comprehensive Versioning Strategy](../../architecture/adr/ADR-066-UMIG-Comprehensive-Versioning-Strategy.md)**: Complete architectural decision record
- **[US-088 Implementation](../../roadmap/sprint7/US-088-build-process-deployment-packaging.md)**: Sprint implementation plan

### Version Structure

```
UMIG Application: v{MAJOR}.{MINOR}.{PATCH}[-{PRE-RELEASE}][+{BUILD-METADATA}]

Examples:
✅ v1.2.0                 (Production Release)
✅ v1.3.0-rc.1           (Release Candidate)
✅ v1.2.1+build.20241025 (Development Build)
```

## Common Use Cases

### For Development Teams

#### Daily Development Workflow

1. **Version Planning**: Use [Version Management Procedures](version-management-procedures.md#version-planning-and-coordination)
2. **Component Updates**: Follow [Version Management Procedures](version-management-procedures.md#version-release-process)
3. **Build Validation**: Use [Build Artifact Specifications](build-artifact-specifications.md#build-process-procedures)

#### Sprint Release Workflow

1. **Release Preparation**: [Version Management Procedures](version-management-procedures.md#pre-release-version-updates)
2. **Artifact Generation**: [Build Artifact Specifications](build-artifact-specifications.md#artifact-generation-workflow)
3. **Deployment Monitoring**: [Deployment Tracking Guide](deployment-tracking-guide.md#deployment-history-tracking)

### For DevOps Teams

#### Build Pipeline Management

1. **Artifact Creation**: [Build Artifact Specifications](build-artifact-specifications.md#build-process-procedures)
2. **Package Validation**: [Build Artifact Specifications](build-artifact-specifications.md#package-validation-procedures)
3. **Deployment Tracking**: [Deployment Tracking Guide](deployment-tracking-guide.md#real-time-health-monitoring)

#### CI/CD Integration

1. **Automated Builds**: [Build Artifact Specifications](build-artifact-specifications.md#integration-with-ci-cd)
2. **Version Validation**: [Version Management Procedures](version-management-procedures.md#version-validation-procedures)
3. **Rollback Preparation**: [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#rollback-compatibility-matrix)

### For Operations Teams

#### Environment Management

1. **Health Monitoring**: [Deployment Tracking Guide](deployment-tracking-guide.md#real-time-health-monitoring)
2. **Version Drift Detection**: [Deployment Tracking Guide](deployment-tracking-guide.md#version-drift-detection)
3. **Performance Tracking**: [Deployment Tracking Guide](deployment-tracking-guide.md#performance-baseline-tracking)

#### Incident Response

1. **Rollback Assessment**: [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#rollback-decision-framework)
2. **Emergency Rollback**: [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#manual-emergency-rollback-procedures)
3. **Recovery Validation**: [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#rollback-success-validation)

## Environment-Specific Quick References

### Development Environment

```bash
# Current version check
curl -s "$UMIG_DEV_URL/rest/scriptrunner/latest/custom/admin/version" | jq '.umig.version'

# Health status
curl -s "$UMIG_DEV_URL/rest/scriptrunner/latest/custom/admin/health" | jq '.umig.status'

# Component status
curl -s "$UMIG_DEV_URL/rest/scriptrunner/latest/custom/admin/components" | jq '.orchestrator.status'
```

### UAT Environment

```bash
# Current version check
curl -s "$UMIG_UAT_URL/rest/scriptrunner/latest/custom/admin/version" | jq '.umig.version'

# Health status
curl -s "$UMIG_UAT_URL/rest/scriptrunner/latest/custom/admin/health" | jq '.umig.status'

# Deployment history
./scripts/deployment/query-deployment-history.sh uat 7
```

### Production Environment

```bash
# Current version check
curl -s "$UMIG_PROD_URL/rest/scriptrunner/latest/custom/admin/version" | jq '.umig.version'

# Health status
curl -s "$UMIG_PROD_URL/rest/scriptrunner/latest/custom/admin/health" | jq '.umig.status'

# Performance metrics
curl -s "$UMIG_PROD_URL/rest/scriptrunner/latest/custom/admin/health" | jq '.metrics'
```

## Emergency Procedures Quick Access

### Critical System Issues

1. **Immediate Assessment**: [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#automated-rollback-triggers)
2. **Emergency Rollback**: [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#emergency-rollback-checklist)
3. **Recovery Validation**: [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#rollback-success-validation)

### Version Compatibility Issues

1. **Compatibility Check**: [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#version-compatibility-overview)
2. **Component Analysis**: [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#component-compatibility-details)
3. **Manual Decision Process**: [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#manual-rollback-decision-process)

### Build or Deployment Failures

1. **Artifact Validation**: [Build Artifact Specifications](build-artifact-specifications.md#package-validation-procedures)
2. **Deployment Monitoring**: [Deployment Tracking Guide](deployment-tracking-guide.md#deployment-status-monitor)
3. **Recovery Options**: [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#component-specific-rollback-procedures)

## Essential Commands Reference

### Version Management

```bash
# Check version consistency
npm run version:validate

# Update application version
npm version [major|minor|patch] --no-git-tag-version

# Generate build artifacts
npm run build:all

# Create version tag
git tag -a v$(node -p "require('./package.json').version") -m "Release v$(node -p "require('./package.json').version")"
```

### Health Monitoring

```bash
# Check all environments
for env in dev uat prod; do
  echo "$env: $(curl -s ${env}_url/admin/health | jq -r '.umig.status')"
done

# Monitor deployment progress
./scripts/monitoring/deployment-status-monitor.sh deploy-123 v1.2.0

# Detect version drift
./scripts/monitoring/version-drift-monitor.sh
```

### Emergency Response

```bash
# Execute automated rollback
./scripts/rollback/execute-automated-rollback.sh production v1.2.0 v1.1.2 "critical_issue"

# Manual rollback assessment
./scripts/rollback/manual-rollback-decision.sh production v1.2.0 "issue_description"

# Validate rollback success
./scripts/rollback/validate-rollback-success.sh production v1.1.2
```

## Integration Points

### External Systems Integration

| System           | Integration Point                     | Reference                                                                                     |
| ---------------- | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Git**          | Version tagging and branch management | [Version Management Procedures](version-management-procedures.md#git-version-tagging)         |
| **CI/CD**        | Automated build and deployment        | [Build Artifact Specifications](build-artifact-specifications.md#integration-with-ci-cd)      |
| **Monitoring**   | Health and performance tracking       | [Deployment Tracking Guide](deployment-tracking-guide.md#dashboard-and-reporting-integration) |
| **Notification** | Slack and email alerts                | [Deployment Tracking Guide](deployment-tracking-guide.md#integration-with-external-systems)   |

### Internal System Dependencies

| Component                 | Dependency                | Reference                                                                                                |
| ------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Database**              | Liquibase version mapping | [Version Management Procedures](version-management-procedures.md#database-version-mapping)               |
| **ScriptRunner**          | Groovy version constants  | [Version Management Procedures](version-management-procedures.md#component-version-alignment-check)      |
| **ComponentOrchestrator** | UI component versioning   | [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#ui-component-hot-swap-rollback) |

## Troubleshooting Quick Reference

### Common Issues and Solutions

| Issue                     | Symptoms                              | Solution Reference                                                                                      |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Version Drift**         | Components showing different versions | [Deployment Tracking Guide](deployment-tracking-guide.md#version-drift-detection)                       |
| **Build Failures**        | Artifact generation fails             | [Build Artifact Specifications](build-artifact-specifications.md#troubleshooting-common-issues)         |
| **Health Check Failures** | Services showing unhealthy status     | [Deployment Tracking Guide](deployment-tracking-guide.md#troubleshooting-common-version-issues)         |
| **Rollback Issues**       | Rollback compatibility problems       | [Rollback Compatibility Procedures](rollback-compatibility-procedures.md#troubleshooting-common-issues) |

### Support Escalation Matrix

| Issue Severity | Contact Level                        | Response Time |
| -------------- | ------------------------------------ | ------------- |
| **Critical**   | Technical Lead + Operations Manager  | < 15 minutes  |
| **High**       | Technical Lead or Operations Manager | < 1 hour      |
| **Medium**     | Development Team                     | < 4 hours     |
| **Low**        | Standard support process             | < 24 hours    |

## Documentation Maintenance

### Update Schedule

- **Monthly**: Review and update operational procedures based on lessons learned
- **Quarterly**: Update compatibility matrices and version support policies
- **Per Release**: Update version examples and compatibility references
- **As Needed**: Update emergency procedures based on incident learnings

### Change Management

All changes to operational procedures must:

1. Be reviewed by Technical Lead and Operations Manager
2. Include validation of all cross-references and links
3. Update version history and last-modified dates
4. Be communicated to all teams using these procedures

### Feedback and Improvement

- Submit feedback via: ops-feedback@company.com
- Suggest improvements through: development team channels
- Report errors or inconsistencies: technical-docs@company.com

## Related Documentation

### Architecture Documentation

- **[ADR-066 - UMIG Comprehensive Versioning Strategy](../../architecture/adr/ADR-066-UMIG-Comprehensive-Versioning-Strategy.md)**: Architectural foundation
- **[Sprint 7 Implementation Plan](../../roadmap/sprint7/US-088-build-process-deployment-packaging.md)**: Implementation approach
- **[UMIG Architecture Overview](../../architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md)**: Complete system architecture

### Development Documentation

- **[Version Management Process](../../devJournal/)**: Development team version practices
- **[Testing Infrastructure](../../roadmap/sprint7/TD-012-Implementation-Complete-Report.md)**: Testing framework integration
- **[Component Architecture](../../roadmap/sprint6/US-082-B-component-architecture.md)**: UI component versioning

### Operations Documentation

- **[Environment Setup](../../../local-dev-setup/)**: Local development environment configuration
- **[Monitoring Configuration](../monitoring/)**: System monitoring and alerting setup
- **[Backup and Recovery](../backup/)**: System backup and recovery procedures

---

**Document Status**: Active and Maintained
**Last Review**: 2025-09-25
**Next Review**: 2025-10-25
**Maintainers**: Lucas Challamel (Technical Lead), Operations Team
