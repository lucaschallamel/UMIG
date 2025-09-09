# US-078: Deployment Process Automation

**Story Type**: Infrastructure Enhancement  
**Priority**: High  
**Complexity**: Large  
**Sprint**: Q4 2025  
**Epic**: DevOps & Deployment  
**Related Stories**: US-039-C (Production Deployment), US-053 (Production Monitoring), US-071 (Error Response Standardization)

## Business Context

**Current State**: UMIG deployment relies on manual zip archive creation and ScriptRunner console uploads, creating Dev/Prod parity gaps and security vulnerabilities identified in the Security Architect Response document. Manual processes introduce inconsistency, human error, and lack of proper versioning control across environments.

**Gap Analysis**:

- **DEV Environment**: Podman containers, hot-reload development, comprehensive local testing
- **UAT/PROD Environment**: Manual zip deployment, VM-based infrastructure, limited rollback capabilities
- **Security Concerns**: No secure artifact signing, limited audit trail, manual configuration management

**Business Impact**: $150K+ risk from deployment failures, security vulnerabilities from manual processes, and operational inefficiency requiring 4-6 hour deployment windows.

## User Story

**As a** DevOps engineer  
**I want** automated CI/CD deployment pipelines with secure artifact packaging and validation  
**So that** code changes can be consistently and securely deployed across all environments with confidence, reducing deployment time from 4-6 hours to 15-30 minutes

## Business Value

- **Operational Efficiency**: 85% reduction in deployment time (4-6 hours → 15-30 minutes)
- **Risk Mitigation**: $150K+ value from eliminating manual deployment errors and security vulnerabilities
- **Dev/Prod Parity**: Consistent deployment processes across all environments
- **Audit Compliance**: Complete deployment audit trail with artifact signing and validation
- **Developer Productivity**: 40% faster delivery cycles with automated confidence checks
- **Security Enhancement**: Secure artifact packaging with signing and vulnerability scanning

## Technical Requirements

### 1. CI/CD Pipeline Architecture

**GitHub Actions Workflow** (`/.github/workflows/deploy.yml`):

```yaml
name: UMIG Deployment Pipeline

on:
  push:
    branches: [main, release/*, hotfix/*]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"
          cache-dependency-path: "local-dev-setup/package-lock.json"

      - name: Setup Java/Groovy
        uses: actions/setup-java@v4
        with:
          distribution: "temurin"
          java-version: "11"

      - name: Install Dependencies
        run: |
          cd local-dev-setup
          npm ci

      - name: Database Setup
        run: |
          cd local-dev-setup
          npm run db:setup

      - name: Run Tests
        run: |
          cd local-dev-setup
          npm run test:all

      - name: Security Scan
        uses: github/super-linter@v4
        env:
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Build Artifacts
        run: |
          scripts/build-deployment-package.sh

      - name: Sign Artifacts
        run: |
          scripts/sign-deployment-package.sh
        env:
          SIGNING_KEY: ${{ secrets.DEPLOYMENT_SIGNING_KEY }}

  deploy-uat:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: uat
    steps:
      - name: Deploy to UAT
        run: |
          scripts/deploy-to-environment.sh uat
        env:
          UAT_DEPLOYMENT_TOKEN: ${{ secrets.UAT_DEPLOYMENT_TOKEN }}
          UAT_CONFLUENCE_URL: ${{ secrets.UAT_CONFLUENCE_URL }}

      - name: Run Integration Tests
        run: |
          scripts/run-integration-tests.sh uat

      - name: Deployment Validation
        run: |
          scripts/validate-deployment.sh uat

  deploy-prod:
    needs: [build-and-test, deploy-uat]
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/heads/release/')
    environment: production
    steps:
      - name: Deploy to Production
        run: |
          scripts/deploy-to-environment.sh prod
        env:
          PROD_DEPLOYMENT_TOKEN: ${{ secrets.PROD_DEPLOYMENT_TOKEN }}
          PROD_CONFLUENCE_URL: ${{ secrets.PROD_CONFLUENCE_URL }}

      - name: Run Smoke Tests
        run: |
          scripts/run-smoke-tests.sh prod

      - name: Deployment Validation
        run: |
          scripts/validate-deployment.sh prod

      - name: Create Release Notes
        run: |
          scripts/generate-release-notes.sh
```

### 2. Secure Artifact Packaging System

**Build Script** (`/scripts/build-deployment-package.sh`):

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$ROOT_DIR/build"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERSION=$(git describe --tags --always --dirty)
PACKAGE_NAME="umig-${VERSION}-${TIMESTAMP}"

echo "Building UMIG deployment package: $PACKAGE_NAME"

# Clean build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/package"
mkdir -p "$BUILD_DIR/artifacts"

# Copy source files
cp -r "$ROOT_DIR/src" "$BUILD_DIR/package/"
cp -r "$ROOT_DIR/admin-gui" "$BUILD_DIR/package/"
cp -r "$ROOT_DIR/db" "$BUILD_DIR/package/"

# Copy configuration files
cp "$ROOT_DIR/umig-plugin.groovy" "$BUILD_DIR/package/"
cp "$ROOT_DIR/liquibase.properties" "$BUILD_DIR/package/"

# Generate build metadata
cat > "$BUILD_DIR/package/build-info.json" <<EOF
{
  "version": "$VERSION",
  "timestamp": "$TIMESTAMP",
  "commit": "$(git rev-parse HEAD)",
  "branch": "$(git branch --show-current)",
  "buildNumber": "${GITHUB_RUN_NUMBER:-local}",
  "buildId": "${GITHUB_RUN_ID:-local}"
}
EOF

# Create deployment package
cd "$BUILD_DIR"
zip -r "artifacts/${PACKAGE_NAME}.zip" package/

# Generate checksums
cd artifacts
sha256sum "${PACKAGE_NAME}.zip" > "${PACKAGE_NAME}.zip.sha256"

echo "Deployment package created: $BUILD_DIR/artifacts/${PACKAGE_NAME}.zip"
```

### 3. Environment-Specific Deployment Scripts

**Deployment Script** (`/scripts/deploy-to-environment.sh`):

```bash
#!/bin/bash
set -euo pipefail

ENVIRONMENT=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$ROOT_DIR/environments"

if [[ ! -f "$CONFIG_DIR/$ENVIRONMENT.env" ]]; then
    echo "Error: Environment configuration not found: $CONFIG_DIR/$ENVIRONMENT.env"
    exit 1
fi

source "$CONFIG_DIR/$ENVIRONMENT.env"

echo "Deploying UMIG to environment: $ENVIRONMENT"
echo "Target Confluence: $CONFLUENCE_URL"

# Validate deployment token
if [[ -z "${DEPLOYMENT_TOKEN:-}" ]]; then
    echo "Error: DEPLOYMENT_TOKEN not set for environment $ENVIRONMENT"
    exit 1
fi

# Download latest artifact
LATEST_PACKAGE=$(ls -t build/artifacts/umig-*.zip | head -n1)
if [[ ! -f "$LATEST_PACKAGE" ]]; then
    echo "Error: No deployment package found"
    exit 1
fi

# Verify artifact integrity
CHECKSUM_FILE="${LATEST_PACKAGE}.sha256"
if [[ -f "$CHECKSUM_FILE" ]]; then
    echo "Verifying artifact integrity..."
    sha256sum -c "$CHECKSUM_FILE"
else
    echo "Warning: No checksum file found, skipping integrity verification"
fi

# Backup current deployment
echo "Creating deployment backup..."
curl -s -X GET \
    -H "Authorization: Bearer $DEPLOYMENT_TOKEN" \
    "$CONFLUENCE_URL/rest/scriptrunner/latest/custom/backup" \
    -o "backups/umig-backup-$(date +%Y%m%d_%H%M%S).zip"

# Deploy to ScriptRunner
echo "Uploading deployment package..."
curl -X POST \
    -H "Authorization: Bearer $DEPLOYMENT_TOKEN" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@$LATEST_PACKAGE" \
    "$CONFLUENCE_URL/rest/scriptrunner/latest/admin/deploy"

# Run database migrations
echo "Running database migrations..."
curl -X POST \
    -H "Authorization: Bearer $DEPLOYMENT_TOKEN" \
    -H "Content-Type: application/json" \
    "$CONFLUENCE_URL/rest/scriptrunner/latest/custom/dbMigrate" \
    -d '{"environment": "'$ENVIRONMENT'"}'

echo "Deployment to $ENVIRONMENT completed successfully"
```

### 4. Rollback and Recovery System

**Rollback Script** (`/scripts/rollback-deployment.sh`):

```bash
#!/bin/bash
set -euo pipefail

ENVIRONMENT=$1
BACKUP_FILE=${2:-"latest"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="$(dirname "$SCRIPT_DIR")/environments"

source "$CONFIG_DIR/$ENVIRONMENT.env"

echo "Rolling back UMIG deployment in environment: $ENVIRONMENT"

# Find backup file
if [[ "$BACKUP_FILE" == "latest" ]]; then
    BACKUP_FILE=$(ls -t backups/umig-backup-*.zip | head -n1)
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Restore from backup
echo "Restoring from backup: $BACKUP_FILE"
curl -X POST \
    -H "Authorization: Bearer $DEPLOYMENT_TOKEN" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@$BACKUP_FILE" \
    "$CONFLUENCE_URL/rest/scriptrunner/latest/admin/restore"

# Rollback database migrations if needed
echo "Checking database migration rollback requirements..."
curl -X POST \
    -H "Authorization: Bearer $DEPLOYMENT_TOKEN" \
    -H "Content-Type: application/json" \
    "$CONFLUENCE_URL/rest/scriptrunner/latest/custom/dbRollback" \
    -d '{"environment": "'$ENVIRONMENT'", "backupFile": "'$(basename "$BACKUP_FILE")'"}'

echo "Rollback to $ENVIRONMENT completed successfully"
```

## Acceptance Criteria

### Functional Requirements

**AC-1: Automated CI/CD Pipeline**

- [ ] GitHub Actions workflow triggers on main branch commits and release branches
- [ ] Automated testing (unit, integration, security) runs before deployment
- [ ] Build artifacts are created with version stamping and checksums
- [ ] Deployment packages are digitally signed for integrity verification
- [ ] Pipeline supports both UAT and Production deployment targets
- [ ] Failed deployments trigger automatic rollback procedures

**AC-2: Secure Artifact Management**

- [ ] Deployment packages include complete UMIG application with dependencies
- [ ] Artifacts are cryptographically signed and verified before deployment
- [ ] Build metadata includes version, commit hash, timestamp, and build number
- [ ] Artifact storage includes checksums and integrity validation
- [ ] Deployment packages are immutable and traceable through entire lifecycle

**AC-3: Environment-Specific Deployment**

- [ ] UAT deployment automatically triggers on main branch commits
- [ ] Production deployment requires manual approval and release branch
- [ ] Environment-specific configuration management with secure secrets
- [ ] Database migration automation with rollback capabilities
- [ ] Post-deployment validation includes health checks and smoke tests

**AC-4: Rollback and Recovery**

- [ ] Automatic backup creation before each deployment
- [ ] One-command rollback to previous known good state
- [ ] Database migration rollback with data integrity preservation
- [ ] Recovery time objective (RTO) of <15 minutes for rollback scenarios
- [ ] Rollback testing validation in UAT environment

### Non-Functional Requirements

**Performance**:

- [ ] Deployment time reduced from 4-6 hours to 15-30 minutes
- [ ] Pipeline execution completes within 10 minutes for standard deployments
- [ ] Rollback procedures complete within 5 minutes
- [ ] Zero-downtime deployments for non-breaking changes

**Security**:

- [ ] All artifacts cryptographically signed with enterprise certificates
- [ ] Deployment tokens use least-privilege access principles
- [ ] Secrets management through GitHub Actions encrypted secrets
- [ ] Complete audit trail for all deployment activities
- [ ] Vulnerability scanning integrated into build pipeline

**Reliability**:

- [ ] 99.5% deployment success rate with automated validation
- [ ] Automated rollback on deployment validation failures
- [ ] Comprehensive deployment logging and monitoring
- [ ] Dev/Prod parity validation ensures consistent environments

## Technical Implementation Plan

### Phase 1: CI/CD Foundation (3 days)

1. **Day 1**: GitHub Actions workflow setup with basic build and test automation
2. **Day 2**: Artifact packaging system with signing and integrity verification
3. **Day 3**: Environment configuration management and secrets integration

### Phase 2: Deployment Automation (4 days)

1. **Day 1**: UAT deployment automation with ScriptRunner API integration
2. **Day 2**: Production deployment workflow with approval gates
3. **Day 3**: Database migration automation with Liquibase integration
4. **Day 4**: Post-deployment validation and health check automation

### Phase 3: Rollback and Recovery (2 days)

1. **Day 1**: Automated backup system and rollback procedures
2. **Day 2**: Recovery testing and validation framework

### Phase 4: Monitoring and Optimization (1 day)

1. **Day 1**: Deployment monitoring integration and performance optimization

## Testing Strategy

### Unit Tests

- Build script functionality and error handling
- Deployment script validation logic
- Artifact signing and verification utilities
- Configuration management and environment handling

### Integration Tests

- Complete CI/CD pipeline execution in test environment
- ScriptRunner API integration for deployment and rollback
- Database migration automation with test data
- Cross-environment deployment validation

### User Acceptance Testing

- DevOps team validation of deployment workflows
- System administrator approval of rollback procedures
- Security team validation of artifact signing and secrets management
- Performance validation against deployment time objectives

### Performance Tests

- Pipeline execution time under various load scenarios
- Deployment time validation across different package sizes
- Rollback speed testing with various backup sizes
- Concurrent deployment handling for multiple environments

## Definition of Done

- [ ] All acceptance criteria met and verified through comprehensive testing
- [ ] CI/CD pipeline deployed and functional in GitHub Actions
- [ ] UAT and Production deployment automation tested and validated
- [ ] Rollback procedures tested and recovery time objectives met
- [ ] Security review completed for artifact signing and secrets management
- [ ] Performance benchmarks achieved (15-30 minute deployments)
- [ ] Documentation updated with new deployment procedures
- [ ] Team training completed for DevOps and system administrators
- [ ] Production deployment successfully executed using automated pipeline

## Risks & Mitigation

**Risk**: ScriptRunner API limitations may not support full automation  
**Mitigation**: Comprehensive API testing and fallback to hybrid automation approach

**Risk**: Database migration rollbacks may cause data loss  
**Mitigation**: Extensive backup testing and staged rollback procedures with validation

**Risk**: Complex pipeline configuration may introduce new failure points  
**Mitigation**: Incremental deployment with comprehensive monitoring and alerting

**Risk**: Security vulnerabilities in automated deployment process  
**Mitigation**: Security review at each phase and penetration testing of deployment infrastructure

## Dependencies

- Completion of Sprint 6 infrastructure (PostgreSQL setup, testing framework)
- GitHub Actions runner availability and configuration
- ScriptRunner API documentation and testing environment access
- Enterprise certificate authority for artifact signing
- UAT and Production environment access for deployment testing

## Success Metrics

- **Deployment Time**: 85% reduction (4-6 hours → 15-30 minutes)
- **Deployment Success Rate**: 99.5% automated deployments successful
- **Recovery Time**: <15 minutes for rollback scenarios
- **Security Compliance**: 100% deployment artifacts signed and verified
- **Developer Satisfaction**: >90% positive feedback on deployment experience
- **Operational Efficiency**: 60% reduction in manual deployment effort
- **Audit Compliance**: 100% deployment activities properly logged and traceable

## Economic Impact

- **Development Cost**: $40K (10 days × $4K/day)
- **Risk Mitigation**: $150K+ (elimination of deployment failures and security vulnerabilities)
- **Operational Efficiency**: $75K/year (85% deployment time reduction)
- **Developer Productivity**: $50K/year (40% faster delivery cycles)
- **Compliance Value**: $25K/year (automated audit trail and security controls)
- **Net ROI**: 625%+ within first year

---

**Story Points**: 8  
**Estimated Hours**: 80  
**Business Value Points**: 90  
**Risk Mitigation**: Critical  
**Security Impact**: High

**Created**: 2025-01-09  
**Updated**: 2025-01-09  
**Status**: Backlog  
**Epic Priority**: High  
**Assignee**: TBD (Senior DevOps Engineer + Security Specialist)

---

### Related ADRs and Documentation

- **ADR-053**: CI/CD Pipeline Architecture (TO BE CREATED by this story)
- **ADR-054**: Secure Deployment Artifact Management (TO BE CREATED by this story)
- **US-039-C**: Production Deployment baseline implementation
- **US-053**: Production Monitoring API integration requirements
- **Security Architect Response**: Dev/Prod parity improvement requirements
