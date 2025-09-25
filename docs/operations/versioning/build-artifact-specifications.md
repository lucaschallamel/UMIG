# UMIG Build Artifact Specifications

**Document**: Operational Build Artifact Management Guide
**Version**: 1.0
**Last Updated**: 2025-09-25
**Owner**: DevOps Team, Development Team
**Reference**: [ADR-066 - UMIG Comprehensive Versioning Strategy](../../architecture/adr/ADR-066-UMIG-Comprehensive-Versioning-Strategy.md)

## Overview

This document provides comprehensive specifications for UMIG build artifacts, including naming conventions, content structure, metadata requirements, and operational procedures for artifact management across all environments.

## Build Artifact Naming Conventions

### Primary Artifact Format

```bash
# Production Releases
umig-app-v{MAJOR}.{MINOR}.{PATCH}-{TIMESTAMP}.zip

Examples:
✅ umig-app-v1.2.0-20241025.143055.zip
✅ umig-app-v1.3.0-20241115.091230.zip
✅ umig-app-v2.0.0-20241201.140000.zip
```

### Pre-Release Artifacts

```bash
# Release Candidates
umig-app-v{MAJOR}.{MINOR}.{PATCH}-{PRERELEASE}-{TIMESTAMP}.zip

Examples:
✅ umig-app-v1.3.0-rc.1-20241025.143055.zip
✅ umig-app-v1.2.1-beta.1-20241020.102030.zip
✅ umig-app-v2.0.0-alpha.3-20241120.155500.zip
```

### Development Builds

```bash
# Development/CI Builds
umig-app-v{MAJOR}.{MINOR}.{PATCH}+{BUILD-INFO}-{TIMESTAMP}.zip

Examples:
✅ umig-app-v1.2.1+ci.1234-20241025.143055.zip
✅ umig-app-v1.3.0+dev.feature-xyz-20241025.143055.zip
✅ umig-app-v1.2.0+hotfix.security-20241025.143055.zip
```

## Artifact Content Structure

### Standard Package Layout

```
umig-app-v1.2.0-20241025.143055.zip
├── build-manifest.json              # Primary build metadata
├── deployment-info.json             # Deployment configuration template
├── version-compatibility.json       # Component compatibility matrix
├── application/                     # Core application files
│   ├── groovy/                     # Backend Groovy services
│   │   ├── api/v2/                 # REST API endpoints (27 files)
│   │   ├── repository/             # Data access layer (15 files)
│   │   ├── service/                # Business logic services (8 files)
│   │   ├── utils/                  # Utilities and helpers (12 files)
│   │   └── version/                # Version management classes
│   ├── web/                        # Frontend assets
│   │   ├── js/                     # JavaScript components
│   │   │   ├── components/         # UI component library (25+ files)
│   │   │   └── entities/           # Entity managers (8 files)
│   │   ├── css/                    # Stylesheets and themes
│   │   └── assets/                 # Static assets (images, fonts)
│   └── config/                     # Configuration templates
├── database/                        # Database migration scripts
│   ├── liquibase/                  # Liquibase changelogs (031+ files)
│   ├── migrations/                 # Manual migration scripts
│   └── rollback/                   # Rollback procedures
├── scripts/                         # Deployment and utility scripts
│   ├── install.sh                  # Installation script
│   ├── upgrade.sh                  # Upgrade script
│   ├── rollback.sh                 # Rollback script
│   └── health-check.sh             # Post-deployment validation
├── docs/                           # Deployment documentation
│   ├── DEPLOYMENT_GUIDE.md         # Environment-specific instructions
│   ├── UPGRADE_NOTES.md            # Version-specific changes
│   └── COMPATIBILITY_MATRIX.md     # Component compatibility reference
└── tests/                          # Deployment validation tests
    ├── smoke-tests/                # Basic functionality validation
    ├── integration-tests/          # Cross-component validation
    └── security-tests/             # Security validation scripts
```

## Metadata File Specifications

### 1. Build Manifest (build-manifest.json)

**Primary build metadata and component tracking**

```json
{
  "$schema": "https://umig.internal/schemas/build-manifest-v1.json",
  "manifest": {
    "version": "1.0",
    "generated": "2024-10-25T14:30:55.123Z",
    "generator": "umig-build-pipeline"
  },
  "umig": {
    "version": "1.2.0",
    "codename": "Velocity",
    "buildTimestamp": "2024-10-25T14:30:55Z",
    "buildNumber": 1234,
    "buildId": "umig-v1.2.0-build.1234",
    "artifactName": "umig-app-v1.2.0-20241025.143055.zip",
    "buildEnvironment": "ci-production",
    "buildAgent": "jenkins-prod-01"
  },
  "git": {
    "repository": "https://github.com/company/UMIG",
    "commit": "abc123def456789",
    "branch": "main",
    "tag": "v1.2.0",
    "committer": "Lucas Challamel",
    "commitMessage": "Release v1.2.0 - Enhanced versioning strategy",
    "commitTimestamp": "2024-10-25T14:15:30Z"
  },
  "components": {
    "database": {
      "schemaVersion": "031",
      "semanticVersion": "1.2.0",
      "latestChangelog": "031_enhanced_version_tracking.sql",
      "migrationStrategy": "liquibase",
      "totalChangesets": 31,
      "rollbackSupported": true,
      "dataLoss": false
    },
    "api": {
      "version": "2.3.1",
      "compatibilityLevel": "v2.x",
      "endpoints": 27,
      "breakingChanges": false,
      "deprecatedEndpoints": [],
      "newEndpoints": ["VersionApi", "ComponentStatusApi"],
      "securityLevel": "enterprise"
    },
    "ui": {
      "version": "1.2.0",
      "architecture": "ComponentOrchestrator",
      "componentCount": 25,
      "securityRating": "8.5/10",
      "testCoverage": "92.3%",
      "performanceScore": "A+"
    },
    "backend": {
      "version": "1.2.0",
      "groovyVersion": "3.0.15",
      "scriptrunnerVersion": "9.21.0",
      "repositoryPattern": "unified-with-enrichment",
      "serviceLayer": "DTO-transformation"
    }
  },
  "quality": {
    "testResults": {
      "javascript": { "total": 158, "passed": 158, "coverage": "92.3%" },
      "groovy": { "total": 31, "passed": 31, "coverage": "88.7%" },
      "integration": { "total": 47, "passed": 47, "coverage": "76.2%" },
      "security": { "total": 28, "passed": 28, "vulnerabilities": 0 }
    },
    "codeQuality": {
      "maintainabilityRating": "A",
      "reliabilityRating": "A",
      "securityRating": "A",
      "technicalDebt": "2.1%"
    }
  }
}
```

### 2. Deployment Information (deployment-info.json)

**Deployment configuration and tracking template**

```json
{
  "$schema": "https://umig.internal/schemas/deployment-info-v1.json",
  "deployment": {
    "packageVersion": "1.2.0",
    "packageName": "umig-app-v1.2.0-20241025.143055.zip",
    "deploymentType": "rolling",
    "estimatedDowntime": "<2m",
    "rollbackVersion": "1.1.2",
    "rollbackPackage": "umig-app-v1.1.2-20241010.102030.zip"
  },
  "prerequisites": {
    "systemRequirements": {
      "confluence": { "min": "8.5.0", "max": "8.9.x", "tested": ["8.7.2"] },
      "postgresql": { "min": "14.0", "max": "16.x", "tested": ["14.9"] },
      "java": { "min": "11", "max": "17", "tested": ["11.0.20"] },
      "scriptrunner": { "min": "9.21.0", "tested": ["9.21.0"] }
    },
    "compatibilityChecks": [
      {
        "component": "api-backward-compatibility",
        "requirement": "v2.3.1 backward compatible with v2.3.0",
        "validation": "automated"
      },
      {
        "component": "database-migration",
        "requirement": "31 changesets ready, no data loss",
        "validation": "liquibase-validate"
      }
    ]
  },
  "migration": {
    "databaseChanges": {
      "changesets": [31],
      "estimatedTime": "45 seconds",
      "dataLoss": false,
      "rollbackSupported": true,
      "backupRequired": true
    },
    "applicationChanges": {
      "configUpdates": 3,
      "fileReplacements": ["api/*.groovy", "web/js/**/*.js"],
      "serviceRestart": true,
      "cacheInvalidation": true
    }
  },
  "validation": {
    "healthChecks": [
      "/rest/scriptrunner/latest/custom/admin/health",
      "/rest/scriptrunner/latest/custom/admin/version",
      "/rest/scriptrunner/latest/custom/admin/components"
    ],
    "smokeTests": [
      "api-endpoint-availability",
      "ui-component-loading",
      "database-connectivity",
      "authentication-validation"
    ]
  }
}
```

### 3. Version Compatibility (version-compatibility.json)

**Component compatibility matrix and upgrade/rollback paths**

```json
{
  "$schema": "https://umig.internal/schemas/version-compatibility-v1.json",
  "compatibility": {
    "version": "1.2.0",
    "generated": "2024-10-25T14:30:55Z"
  },
  "matrix": {
    "umig-1.2.0": {
      "database": {
        "minSchema": "030",
        "maxSchema": "031",
        "migration": "automatic",
        "rollback": "supported"
      },
      "api": {
        "version": "v2.3.1",
        "backward": ["v2.3.0", "v2.2.x"],
        "forward": ["v2.4.0-alpha"],
        "breaking": false
      },
      "ui": {
        "version": "1.2.0",
        "compatible": ["1.1.x", "1.0.5+"],
        "migration": "hot-swap",
        "components": 25
      }
    }
  },
  "upgradeMatrix": {
    "from-1.1.x": {
      "automatic": true,
      "dataLoss": false,
      "downtime": "<2m",
      "procedures": ["database-migration", "config-update", "component-refresh"]
    },
    "from-1.0.x": {
      "automatic": true,
      "dataLoss": false,
      "downtime": "<5m",
      "procedures": ["database-migration", "api-upgrade", "ui-migration"]
    }
  },
  "rollbackMatrix": {
    "to-1.1.2": {
      "supported": true,
      "automatic": true,
      "dataLoss": false,
      "time": "<5m",
      "procedures": [
        "application-stop",
        "database-rollback",
        "artifact-restore"
      ]
    }
  }
}
```

## Build Process Procedures

### 1. Artifact Generation Workflow

#### Step 1: Pre-Build Validation

```bash
#!/bin/bash
# scripts/build/pre-build-validation.sh

validate_pre_build() {
    echo "=== Pre-Build Validation ==="

    # Version consistency check
    echo "Checking version consistency..."
    npm run version:validate || exit 1

    # Test execution
    echo "Running test suites..."
    npm run test:all:quick || exit 1

    # Code quality check
    echo "Validating code quality..."
    npm run quality:check || exit 1

    # Security scan
    echo "Running security scan..."
    npm run security:scan || exit 1

    echo "✅ Pre-build validation passed"
}

validate_pre_build
```

#### Step 2: Build Manifest Generation

```bash
#!/bin/bash
# scripts/build/generate-build-manifest.sh

generate_build_manifest() {
    local version=$(node -p "require('./package.json').version")
    local timestamp=$(date -Iseconds)
    local build_number=${BUILD_NUMBER:-$(date +%s)}
    local git_commit=$(git rev-parse HEAD)
    local git_branch=$(git rev-parse --abbrev-ref HEAD)

    echo "Generating build manifest for version $version..."

    # Create build manifest
    cat > build-manifest.json << EOF
{
  "manifest": {
    "version": "1.0",
    "generated": "$timestamp",
    "generator": "umig-build-pipeline"
  },
  "umig": {
    "version": "$version",
    "buildTimestamp": "$timestamp",
    "buildNumber": $build_number,
    "buildId": "umig-v$version-build.$build_number",
    "artifactName": "umig-app-v$version-$(date +%Y%m%d.%H%M%S).zip"
  },
  "git": {
    "commit": "$git_commit",
    "branch": "$git_branch",
    "tag": "v$version"
  },
  "components": $(generate_component_manifest)
}
EOF

    echo "✅ Build manifest generated: build-manifest.json"
}

generate_component_manifest() {
    # Extract component versions and metadata
    cat << EOF
{
  "database": {
    "schemaVersion": "$(get_latest_changeset)",
    "semanticVersion": "$(node -p "require('./package.json').version")",
    "totalChangesets": $(ls liquibase/changelogs/*.sql | wc -l),
    "rollbackSupported": true
  },
  "api": {
    "version": "$(grep API_VERSION src/groovy/umig/version/UMIGVersion.groovy | cut -d'\"' -f2)",
    "endpoints": $(find src/groovy/umig/api/v2 -name "*.groovy" | wc -l),
    "breakingChanges": false
  },
  "ui": {
    "version": "$(node -p "require('./package.json').version")",
    "componentCount": $(find src/groovy/umig/web/js/components -name "*.js" | wc -l),
    "architecture": "ComponentOrchestrator"
  }
}
EOF
}

generate_build_manifest
```

#### Step 3: Package Creation

```bash
#!/bin/bash
# scripts/build/create-deployment-package.sh

create_deployment_package() {
    local version=$(node -p "require('./package.json').version")
    local timestamp=$(date +%Y%m%d.%H%M%S)
    local artifact_name="umig-app-v$version-$timestamp.zip"

    echo "Creating deployment package: $artifact_name"

    # Create temporary directory
    local temp_dir="/tmp/umig-build-$(date +%s)"
    mkdir -p "$temp_dir"

    # Copy application files
    echo "Copying application files..."
    mkdir -p "$temp_dir/application"
    rsync -av --exclude='node_modules' --exclude='.git' \
        src/groovy/ "$temp_dir/application/groovy/"
    rsync -av src/web/ "$temp_dir/application/web/"

    # Copy database files
    echo "Copying database files..."
    mkdir -p "$temp_dir/database"
    rsync -av liquibase/ "$temp_dir/database/liquibase/"

    # Copy deployment scripts
    echo "Copying deployment scripts..."
    mkdir -p "$temp_dir/scripts"
    cp scripts/deployment/*.sh "$temp_dir/scripts/"

    # Copy metadata files
    echo "Copying metadata files..."
    cp build-manifest.json "$temp_dir/"
    cp deployment-info.json "$temp_dir/" 2>/dev/null || generate_deployment_info > "$temp_dir/deployment-info.json"
    cp version-compatibility.json "$temp_dir/" 2>/dev/null || generate_compatibility_matrix > "$temp_dir/version-compatibility.json"

    # Create documentation
    echo "Generating documentation..."
    mkdir -p "$temp_dir/docs"
    generate_deployment_docs > "$temp_dir/docs/DEPLOYMENT_GUIDE.md"
    generate_upgrade_notes > "$temp_dir/docs/UPGRADE_NOTES.md"

    # Create tests
    echo "Including validation tests..."
    mkdir -p "$temp_dir/tests"
    cp -r tests/deployment/* "$temp_dir/tests/" 2>/dev/null || true

    # Create ZIP archive
    echo "Creating ZIP archive..."
    cd "$temp_dir"
    zip -r "../../dist/$artifact_name" . -q
    cd - > /dev/null

    # Cleanup
    rm -rf "$temp_dir"

    echo "✅ Deployment package created: dist/$artifact_name"
    ls -lh "dist/$artifact_name"
}

create_deployment_package
```

### 2. Package Validation Procedures

#### Automated Package Validation

```bash
#!/bin/bash
# scripts/build/validate-package.sh

validate_package() {
    local package_path="$1"

    if [[ -z "$package_path" ]]; then
        package_path=$(ls -1t dist/umig-app-v*.zip | head -1)
    fi

    echo "=== Package Validation ==="
    echo "Package: $package_path"

    # Check package exists
    if [[ ! -f "$package_path" ]]; then
        echo "❌ Package not found: $package_path"
        exit 1
    fi

    # Check package size
    local size=$(stat -f%z "$package_path" 2>/dev/null || stat -c%s "$package_path")
    if [[ $size -lt 1048576 ]]; then  # Less than 1MB
        echo "❌ Package too small: $size bytes"
        exit 1
    fi

    # Validate package contents
    echo "Validating package contents..."
    local temp_dir="/tmp/validate-$(date +%s)"
    mkdir -p "$temp_dir"
    unzip -q "$package_path" -d "$temp_dir"

    # Check required files
    local required_files=(
        "build-manifest.json"
        "deployment-info.json"
        "version-compatibility.json"
        "application/groovy/"
        "application/web/"
        "database/liquibase/"
        "scripts/"
        "docs/"
    )

    for file in "${required_files[@]}"; do
        if [[ ! -e "$temp_dir/$file" ]]; then
            echo "❌ Missing required file/directory: $file"
            rm -rf "$temp_dir"
            exit 1
        fi
    done

    # Validate metadata files
    echo "Validating metadata files..."

    # Build manifest validation
    if ! jq -e '.umig.version' "$temp_dir/build-manifest.json" > /dev/null; then
        echo "❌ Invalid build manifest format"
        rm -rf "$temp_dir"
        exit 1
    fi

    # Version consistency check
    local manifest_version=$(jq -r '.umig.version' "$temp_dir/build-manifest.json")
    local package_version=$(echo "$package_path" | sed -E 's/.*-v([0-9]+\.[0-9]+\.[0-9]+[^-]*).*/\1/')

    if [[ "$manifest_version" != "$package_version" ]]; then
        echo "❌ Version mismatch: manifest($manifest_version) != package($package_version)"
        rm -rf "$temp_dir"
        exit 1
    fi

    # Cleanup
    rm -rf "$temp_dir"

    echo "✅ Package validation passed"
    echo "Package size: $(numfmt --to=iec $size)"
    echo "Version: $manifest_version"
}

validate_package "$1"
```

## Artifact Storage and Management

### 1. Artifact Repository Structure

```bash
# Artifact storage organization
artifacts/
├── releases/
│   ├── v1.2.0/
│   │   ├── umig-app-v1.2.0-20241025.143055.zip
│   │   ├── build-manifest.json
│   │   └── deployment-report.json
│   ├── v1.1.2/
│   └── v1.0.5/
├── pre-releases/
│   ├── v1.3.0-rc.1/
│   ├── v1.3.0-beta.1/
│   └── v1.3.0-alpha.1/
└── development/
    ├── feature-branches/
    ├── hotfixes/
    └── ci-builds/
```

### 2. Artifact Lifecycle Management

#### Retention Policies

```bash
#!/bin/bash
# scripts/artifact-management/cleanup-old-artifacts.sh

cleanup_old_artifacts() {
    local retention_days_prod=365      # 1 year for production
    local retention_days_rc=90         # 3 months for release candidates
    local retention_days_dev=30        # 1 month for development builds

    echo "=== Artifact Cleanup ==="

    # Clean development builds
    find artifacts/development -name "*.zip" -mtime +$retention_days_dev -delete
    echo "Cleaned development artifacts older than $retention_days_dev days"

    # Clean release candidates (keep production releases)
    find artifacts/pre-releases -name "*-rc.*" -mtime +$retention_days_rc -delete
    find artifacts/pre-releases -name "*-beta.*" -mtime +$retention_days_rc -delete
    find artifacts/pre-releases -name "*-alpha.*" -mtime +$retention_days_dev -delete
    echo "Cleaned pre-release artifacts"

    # Report storage usage
    echo "Current storage usage:"
    du -sh artifacts/* | sort -h
}

cleanup_old_artifacts
```

### 3. Artifact Security and Integrity

#### Checksum Generation and Validation

```bash
#!/bin/bash
# scripts/artifact-management/generate-checksums.sh

generate_checksums() {
    local artifact_path="$1"
    local checksum_file="${artifact_path}.checksums"

    echo "Generating checksums for: $artifact_path"

    # Generate multiple checksums for verification
    {
        echo "# UMIG Artifact Checksums"
        echo "# Generated: $(date -Iseconds)"
        echo "# Artifact: $(basename "$artifact_path")"
        echo ""
        echo "## SHA256"
        sha256sum "$artifact_path"
        echo ""
        echo "## SHA512"
        sha512sum "$artifact_path"
        echo ""
        echo "## MD5 (legacy compatibility)"
        md5sum "$artifact_path"
    } > "$checksum_file"

    echo "✅ Checksums generated: $checksum_file"
}

validate_checksums() {
    local artifact_path="$1"
    local checksum_file="${artifact_path}.checksums"

    if [[ ! -f "$checksum_file" ]]; then
        echo "❌ Checksum file not found: $checksum_file"
        return 1
    fi

    echo "Validating checksums for: $artifact_path"

    # Extract and validate SHA256
    local expected_sha256=$(grep -A1 "## SHA256" "$checksum_file" | tail -1 | cut -d' ' -f1)
    local actual_sha256=$(sha256sum "$artifact_path" | cut -d' ' -f1)

    if [[ "$expected_sha256" != "$actual_sha256" ]]; then
        echo "❌ SHA256 checksum mismatch"
        echo "Expected: $expected_sha256"
        echo "Actual:   $actual_sha256"
        return 1
    fi

    echo "✅ Checksum validation passed"
    return 0
}
```

## Integration with CI/CD

### 1. GitHub Actions Integration

```yaml
# .github/workflows/build-artifacts.yml
name: Build Artifacts
on:
  push:
    tags:
      - "v*"
  workflow_dispatch:

jobs:
  build-artifacts:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install Dependencies
        run: npm ci

      - name: Run Pre-Build Validation
        run: |
          npm run version:validate
          npm run test:all:quick
          npm run security:scan

      - name: Generate Build Manifest
        run: npm run build:manifest

      - name: Create Deployment Package
        run: npm run build:package

      - name: Validate Package
        run: npm run validate:package

      - name: Generate Checksums
        run: |
          for package in dist/umig-app-v*.zip; do
            ./scripts/artifact-management/generate-checksums.sh "$package"
          done

      - name: Upload Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: umig-deployment-packages
          path: |
            dist/umig-app-v*.zip
            dist/umig-app-v*.zip.checksums
          retention-days: 90
```

### 2. Jenkins Pipeline Integration

```groovy
// Jenkinsfile for artifact generation
pipeline {
    agent any

    environment {
        BUILD_NUMBER = "${env.BUILD_NUMBER}"
        GIT_COMMIT = "${env.GIT_COMMIT}"
    }

    stages {
        stage('Pre-Build Validation') {
            steps {
                sh 'npm run version:validate'
                sh 'npm run test:all:quick'
                sh 'npm run security:scan'
            }
        }

        stage('Generate Artifacts') {
            steps {
                sh 'npm run build:manifest'
                sh 'npm run build:package'
                sh 'npm run validate:package'
            }
        }

        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: 'dist/umig-app-v*.zip*', fingerprint: true
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'dist',
                    reportFiles: 'build-manifest.json',
                    reportName: 'Build Manifest'
                ])
            }
        }
    }
}
```

## Troubleshooting Common Issues

### 1. Build Manifest Generation Issues

#### Problem: Missing component information

```bash
# Diagnosis
echo "Checking component detection..."

# Verify file structure
find src/groovy/umig -name "*.groovy" | wc -l
find src/groovy/umig/web/js -name "*.js" | wc -l
find liquibase/changelogs -name "*.sql" | wc -l

# Resolution
echo "Regenerating component manifest..."
npm run build:manifest:force

# Validation
jq '.components' build-manifest.json
```

### 2. Package Size Issues

#### Problem: Package too large or too small

```bash
# Check package contents
unzip -l dist/umig-app-v*.zip | tail -20

# Identify large files
unzip -l dist/umig-app-v*.zip | sort -k1 -nr | head -10

# Resolution for large packages
echo "Excluding unnecessary files..."
# Update rsync excludes in create-deployment-package.sh

# Resolution for small packages
echo "Checking missing files..."
# Verify all required directories are included
```

### 3. Version Mismatch Issues

#### Problem: Package version doesn't match manifest

```bash
# Extract package version
package_version=$(ls dist/umig-app-v*.zip | sed -E 's/.*-v([0-9]+\.[0-9]+\.[0-9]+[^-]*).*/\1/')

# Extract manifest version
manifest_version=$(jq -r '.umig.version' build-manifest.json)

# Resolution
if [[ "$package_version" != "$manifest_version" ]]; then
    echo "Regenerating with correct version..."
    npm run build:clean
    npm run build:all
fi
```

## Quick Reference

### Essential Commands

```bash
# Generate build manifest
npm run build:manifest

# Create deployment package
npm run build:package

# Validate package
npm run validate:package

# Full build process
npm run build:all

# Clean build artifacts
npm run build:clean
```

### Package Information Commands

```bash
# Show package contents
unzip -l dist/umig-app-v*.zip

# Extract manifest
unzip -p dist/umig-app-v*.zip build-manifest.json | jq .

# Validate checksums
./scripts/artifact-management/validate-checksums.sh dist/umig-app-v*.zip

# Package size
ls -lh dist/umig-app-v*.zip
```

---

**Next Steps**: After creating build artifacts, refer to:

- [Version Management Procedures](version-management-procedures.md) for version coordination
- [Deployment Tracking Guide](deployment-tracking-guide.md) for deployment monitoring
- [Rollback Compatibility Procedures](rollback-compatibility-procedures.md) for rollback planning
