# UMIG Version Management Procedures

**Document**: Operational Version Management Guide
**Version**: 1.0
**Last Updated**: 2025-09-25
**Owner**: Development Team
**Reference**: [ADR-066 - UMIG Comprehensive Versioning Strategy](../../architecture/adr/ADR-066-UMIG-Comprehensive-Versioning-Strategy.md)

## Overview

This document provides step-by-step operational procedures for managing UMIG versions across all environments. It serves as the primary reference for version planning, release coordination, and day-to-day version management tasks.

## Version Structure Reference

### UMIG Application Versioning

```
Format: v{MAJOR}.{MINOR}.{PATCH}[-{PRE-RELEASE}][+{BUILD-METADATA}]

Production Examples:
✅ v1.2.0                 (Production Release)
✅ v1.2.1                 (Patch Release)
✅ v1.3.0                 (Minor Release)
✅ v2.0.0                 (Major Release)

Pre-Release Examples:
✅ v1.3.0-alpha.1         (Alpha Release)
✅ v1.3.0-beta.2          (Beta Release)
✅ v1.3.0-rc.1           (Release Candidate)

Development Examples:
✅ v1.2.1+dev.feature     (Development Build)
✅ v1.2.0+hotfix.security (Hotfix Build)
✅ v1.3.0+ci.1234         (CI Build)
```

### Version Increment Decision Matrix

| Change Type                   | Version Increment | Examples                                                  |
| ----------------------------- | ----------------- | --------------------------------------------------------- |
| **Breaking API Changes**      | MAJOR (x.0.0)     | API endpoint removal, Database schema breaking changes    |
| **Database Breaking Changes** | MAJOR (x.0.0)     | Column removal, Data type changes affecting existing data |
| **Architectural Shifts**      | MAJOR (x.0.0)     | Component architecture overhaul, Technology stack changes |
| **New Features**              | MINOR (1.x.0)     | New API endpoints, New UI components, Feature additions   |
| **Component Additions**       | MINOR (1.x.0)     | New entity managers, New service integrations             |
| **API Enhancements**          | MINOR (1.x.0)     | New optional parameters, Response field additions         |
| **Bug Fixes**                 | PATCH (1.2.x)     | Defect repairs, Logic corrections                         |
| **Security Patches**          | PATCH (1.2.x)     | Vulnerability fixes, Security hardening                   |
| **Performance Improvements**  | PATCH (1.2.x)     | Optimization changes, Speed enhancements                  |

## Daily Operations Procedures

### 1. Version Planning and Coordination

#### 1.1 Sprint Version Planning

```bash
# Determine version increment for upcoming sprint
# Run from project root

# Step 1: Analyze planned changes
echo "Analyzing Sprint Changes:"
echo "- New features: [LIST_FEATURES]"
echo "- Breaking changes: [LIST_BREAKING_CHANGES]"
echo "- Bug fixes: [LIST_BUG_FIXES]"

# Step 2: Determine version increment
# Use Version Increment Decision Matrix above

# Step 3: Update planning documentation
echo "Next Version: v[MAJOR].[MINOR].[PATCH]"
```

#### 1.2 Component Version Alignment Check

```bash
# Check current component version alignment
# Run before any version updates

# Database schema version check
echo "Database Schema: $(liquibase status | grep "changesets have not been applied")"

# API version check
echo "API Version: $(grep -r "API_VERSION" src/groovy/umig/ | head -1)"

# UI component version check
echo "UI Components: $(grep -r "version" src/groovy/umig/web/js/ | wc -l) components"

# Package.json version check
echo "Application Version: $(node -p "require('./package.json').version")"
```

### 2. Version Release Process

#### 2.1 Pre-Release Version Updates

**Step 1: Update Application Version**

```bash
# Update package.json version
npm version [major|minor|patch] --no-git-tag-version

# Verify version update
echo "Updated to version: $(node -p "require('./package.json').version")"
```

**Step 2: Update Component Versions**

```groovy
// Update src/groovy/umig/version/UMIGVersion.groovy
class UMIGVersion {
    static final String VERSION = "1.2.0"  // ← Update this
    static final String BUILD = getCurrentBuild()
    static final String API_VERSION = "v2.3.1"  // ← Update if needed
    static final String COMPONENT_VERSION = "1.2.0"  // ← Update this
}
```

**Step 3: Update Database Version Mapping**

```sql
-- Add entry to version_tracking table
INSERT INTO version_tracking (
    changelog_id,
    semantic_version,
    umig_version,
    deployed_at,
    environment
) VALUES (
    '031',  -- Current changelog ID
    '1.2.0',  -- Semantic version
    '1.2.0',  -- UMIG version
    CURRENT_TIMESTAMP,
    'development'
);
```

#### 2.2 Build Artifact Generation

**Step 1: Generate Build Manifest**

```bash
# Run build manifest generation
npm run build:manifest

# Verify manifest generation
cat build-manifest.json | jq '.umig.version'
```

**Step 2: Create Deployment Package**

```bash
# Generate deployment package
npm run build:package

# Verify package creation
ls -la dist/umig-app-v*.zip
```

**Step 3: Validate Package Contents**

```bash
# Validate package structure
npm run validate:package

# Manual validation
unzip -l dist/umig-app-v*.zip | head -20
```

#### 2.3 Git Version Tagging

**Step 1: Create Version Tag**

```bash
# Create annotated tag for production release
git tag -a v1.2.0 -m "UMIG v1.2.0 - Production Release

Features:
- [Feature 1 description]
- [Feature 2 description]

Bug Fixes:
- [Bug fix 1 description]
- [Bug fix 2 description]

Breaking Changes:
- [Breaking change description if any]
"

# Push tag to remote
git push origin v1.2.0
```

**Step 2: Create Pre-Release Tags**

```bash
# For release candidates
git tag -a v1.3.0-rc.1 -m "UMIG v1.3.0 Release Candidate 1"

# For alpha/beta releases
git tag -a v1.3.0-alpha.1 -m "UMIG v1.3.0 Alpha 1"
git tag -a v1.3.0-beta.1 -m "UMIG v1.3.0 Beta 1"
```

### 3. Environment Version Management

#### 3.1 Development Environment Version Updates

**Daily Development Version Management**

```bash
# Update development version
npm version prerelease --preid=dev --no-git-tag-version

# Example: 1.2.0 → 1.2.1-dev.0
echo "Development version: $(node -p "require('./package.json').version")"

# Generate development build
npm run build:development
```

#### 3.2 UAT Environment Version Promotion

**Promoting to UAT Environment**

```bash
# Create release candidate version
npm version prerelease --preid=rc --no-git-tag-version

# Example: 1.2.1-dev.0 → 1.3.0-rc.1
# Generate UAT build
npm run build:uat

# Deploy to UAT (manual process)
echo "Deploy dist/umig-app-v*-rc.*.zip to UAT environment"
```

#### 3.3 Production Version Deployment

**Production Deployment Process**

```bash
# Finalize production version (remove pre-release identifier)
npm version [major|minor|patch] --no-git-tag-version

# Generate production build
npm run build:production

# Create deployment tag
git tag -a v$(node -p "require('./package.json').version") -m "Production Release v$(node -p "require('./package.json').version")"

# Production deployment (manual process)
echo "Deploy dist/umig-app-v*.zip to production environment"
```

## Version Validation Procedures

### 1. Version Consistency Validation

#### 1.1 Cross-Component Version Check

```bash
#!/bin/bash
# scripts/version-validation/check-version-consistency.sh

validate_version_consistency() {
    local app_version=$(node -p "require('./package.json').version")
    local groovy_version=$(grep "VERSION = " src/groovy/umig/version/UMIGVersion.groovy | cut -d'"' -f2)

    echo "=== Version Consistency Check ==="
    echo "Application Version: $app_version"
    echo "Groovy Version: $groovy_version"

    if [[ "$app_version" != "$groovy_version" ]]; then
        echo "❌ VERSION MISMATCH DETECTED"
        echo "Application and Groovy versions must be aligned"
        exit 1
    fi

    echo "✅ Version consistency validated"
}

validate_version_consistency
```

#### 1.2 Build Manifest Validation

```bash
#!/bin/bash
# Validate build manifest content

validate_build_manifest() {
    if [[ ! -f "build-manifest.json" ]]; then
        echo "❌ Build manifest not found"
        exit 1
    fi

    local manifest_version=$(cat build-manifest.json | jq -r '.umig.version')
    local package_version=$(node -p "require('./package.json').version")

    if [[ "$manifest_version" != "$package_version" ]]; then
        echo "❌ Build manifest version mismatch"
        exit 1
    fi

    echo "✅ Build manifest validation passed"
}

validate_build_manifest
```

### 2. Runtime Version Verification

#### 2.1 Health Endpoint Validation

```bash
# Verify version endpoints return correct information
curl -s "${UMIG_BASE_URL}/admin/version" | jq '{
    version: .umig.version,
    build: .umig.build,
    components: .components
}'
```

#### 2.2 Component Version Verification

```javascript
// Browser console verification
fetch("/rest/scriptrunner/latest/custom/admin/components")
  .then((response) => response.json())
  .then((data) => {
    console.log("Component Versions:", {
      orchestrator: data.orchestrator.status,
      entityManagers: Object.keys(data.entityManagers).length,
      services: Object.keys(data.services).length,
    });
  });
```

## Troubleshooting Common Version Issues

### 1. Version Drift Resolution

#### Problem: Components showing different versions

```bash
# Diagnosis
echo "Checking version drift..."

# Application version
app_ver=$(node -p "require('./package.json').version")
echo "App Version: $app_ver"

# Groovy version
groovy_ver=$(grep "VERSION = " src/groovy/umig/version/UMIGVersion.groovy | cut -d'"' -f2)
echo "Groovy Version: $groovy_ver"

# Resolution
if [[ "$app_ver" != "$groovy_ver" ]]; then
    echo "Updating Groovy version to match application..."
    sed -i '' "s/VERSION = \".*\"/VERSION = \"$app_ver\"/" src/groovy/umig/version/UMIGVersion.groovy
    echo "✅ Version drift resolved"
fi
```

### 2. Build Manifest Issues

#### Problem: Build manifest generation fails

```bash
# Diagnosis
echo "Checking build environment..."
node --version
npm --version
git status --porcelain

# Resolution
echo "Regenerating build manifest..."
npm run build:manifest

# Validate
if [[ -f "build-manifest.json" ]]; then
    echo "✅ Build manifest generated successfully"
    cat build-manifest.json | jq '.umig.version'
else
    echo "❌ Build manifest generation failed"
    echo "Check package.json and Git repository status"
fi
```

### 3. Git Tag Issues

#### Problem: Version tag conflicts

```bash
# Check existing tags
git tag -l "v*" | sort -V

# Remove conflicting tag (if needed)
git tag -d v1.2.0
git push origin --delete v1.2.0

# Recreate tag
git tag -a v1.2.0 -m "UMIG v1.2.0 - Production Release"
git push origin v1.2.0
```

## Version Documentation Updates

### 1. Release Notes Generation

#### 1.1 Automated Changelog Generation

```bash
# Generate changelog from Git commits
git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:"- %s" > CHANGES.md

echo "Changelog generated in CHANGES.md"
```

#### 1.2 Version Compatibility Matrix Updates

```bash
# Update compatibility documentation
echo "Updating version compatibility matrix..."

# Add new version to compatibility documentation
cat >> docs/version-compatibility.md << EOF

## Version v$(node -p "require('./package.json').version")
- **Database Schema**: $(liquibase status | grep "changesets" | wc -l) changesets
- **API Version**: v2.3.1 (backward compatible)
- **UI Components**: 25 components loaded
- **Rollback Support**: Previous 3 minor versions supported
EOF
```

### 2. Environment Documentation

#### 2.1 Environment Version Tracking

```bash
# Update environment status documentation
update_environment_status() {
    local env=$1
    local version=$2

    cat >> docs/environment-status.md << EOF

### $env Environment
- **Version**: $version
- **Updated**: $(date -Iseconds)
- **Status**: Active
- **Health**: $(curl -s "${UMIG_BASE_URL}/admin/health" | jq -r '.status // "Unknown"')
EOF
}

# Usage
update_environment_status "Production" "v1.2.0"
update_environment_status "UAT" "v1.3.0-rc.1"
update_environment_status "Development" "v1.3.0-dev"
```

## Quick Reference Commands

### Essential Version Commands

```bash
# Check current version
npm run version:check

# Update version (interactive)
npm run version:update

# Generate build artifacts
npm run build:all

# Validate version consistency
npm run version:validate

# Deploy version tag
npm run version:tag

# Generate release notes
npm run changelog:generate
```

### Emergency Version Operations

```bash
# Emergency version rollback preparation
npm run version:rollback:prepare

# Quick version drift fix
npm run version:sync

# Emergency build generation
npm run build:emergency
```

## Integration with CI/CD

### 1. Automated Version Validation

```yaml
# .github/workflows/version-validation.yml
name: Version Validation
on: [push, pull_request]

jobs:
  validate-versions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate Version Consistency
        run: ./scripts/version-validation/check-version-consistency.sh
```

### 2. Automated Build Artifact Generation

```yaml
# Version-triggered build automation
name: Build and Package
on:
  push:
    tags:
      - "v*"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Build Artifacts
        run: |
          npm run build:manifest
          npm run build:package
          npm run validate:package
```

## Support and Escalation

### Version Management Support Contacts

- **Technical Lead**: Version strategy and complex resolution
- **DevOps Team**: CI/CD and deployment version issues
- **Database Team**: Schema version mapping and migration issues
- **QA Team**: Version validation and testing coordination

### Escalation Triggers

- Version drift affecting multiple environments
- Build artifact generation failures blocking deployments
- Cross-component version compatibility issues
- Emergency rollback version selection

---

**Next Steps**: After following these procedures, refer to:

- [Build Artifact Specifications](build-artifact-specifications.md) for detailed artifact management
- [Deployment Tracking Guide](deployment-tracking-guide.md) for environment monitoring
- [Rollback Compatibility Procedures](rollback-compatibility-procedures.md) for version rollback operations
