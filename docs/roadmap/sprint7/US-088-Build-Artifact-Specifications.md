# US-088: Build Artifact Specifications

**Document**: Build Process and Deployment Packaging Implementation
**Sprint**: 7 (US-088 - 5 story points)
**Author**: Lucas Challamel
**Date**: 2025-09-25
**Status**: SPECIFICATION

## Build Artifact Naming Conventions

### 1. Primary Artifact Naming

```bash
# Production Releases
umig-app-v{MAJOR}.{MINOR}.{PATCH}-{TIMESTAMP}.zip

Examples:
✅ umig-app-v1.2.0-20240925.143055.zip
✅ umig-app-v1.3.0-20241015.091230.zip
✅ umig-app-v2.0.0-20241201.140000.zip

# Pre-Release Artifacts
umig-app-v{MAJOR}.{MINOR}.{PATCH}-{PRERELEASE}-{TIMESTAMP}.zip

Examples:
✅ umig-app-v1.3.0-rc.1-20240925.143055.zip
✅ umig-app-v1.2.1-beta.1-20240920.102030.zip
✅ umig-app-v2.0.0-alpha.3-20241120.155500.zip

# Development/CI Builds
umig-app-v{MAJOR}.{MINOR}.{PATCH}+{BUILD-INFO}-{TIMESTAMP}.zip

Examples:
✅ umig-app-v1.2.1+ci.1234-20240925.143055.zip
✅ umig-app-v1.3.0+dev.feature-xyz-20240925.143055.zip
✅ umig-app-v1.2.0+hotfix.security-20240925.143055.zip
```

### 2. Artifact Content Structure

```
umig-app-v1.2.0-20240925.143055.zip
├── build-manifest.json              # Primary build metadata
├── deployment-info.json             # Deployment configuration
├── version-compatibility.json       # Component compatibility matrix
├── application/                     # Core application files
│   ├── groovy/                     # Backend Groovy services
│   │   ├── api/v2/                 # REST API endpoints
│   │   ├── repository/             # Data access layer
│   │   ├── service/                # Business logic
│   │   └── utils/                  # Utilities and helpers
│   ├── web/                        # Frontend assets
│   │   ├── js/                     # JavaScript components
│   │   │   ├── components/         # UI component library
│   │   │   └── entities/           # Entity managers
│   │   ├── css/                    # Stylesheets
│   │   └── assets/                 # Static assets
│   └── config/                     # Configuration files
├── database/                        # Database migration scripts
│   ├── liquibase/                  # Liquibase changelogs
│   ├── migrations/                 # Manual migration scripts
│   └── rollback/                   # Rollback procedures
├── scripts/                         # Deployment and utility scripts
│   ├── install.sh                  # Installation script
│   ├── upgrade.sh                  # Upgrade script
│   ├── rollback.sh                 # Rollback script
│   └── health-check.sh             # Post-deployment validation
├── docs/                           # Documentation
│   ├── DEPLOYMENT_GUIDE.md         # Deployment instructions
│   ├── UPGRADE_NOTES.md            # Version-specific upgrade notes
│   └── COMPATIBILITY_MATRIX.md     # Component compatibility
└── tests/                          # Deployment validation tests
    ├── smoke-tests/                # Basic functionality tests
    ├── integration-tests/          # Integration validation
    └── security-tests/             # Security validation
```

## Metadata File Specifications

### 1. build-manifest.json

```json
{
  "$schema": "https://umig.internal/schemas/build-manifest-v1.json",
  "manifest": {
    "version": "1.0",
    "generated": "2024-09-25T14:30:55.123Z",
    "generator": "umig-build-pipeline"
  },
  "umig": {
    "version": "1.2.0",
    "codename": "Velocity",
    "buildTimestamp": "2024-09-25T14:30:55Z",
    "buildNumber": 1234,
    "buildId": "umig-v1.2.0-build.1234",
    "artifactName": "umig-app-v1.2.0-20240925.143055.zip",
    "buildEnvironment": "ci-production",
    "buildAgent": "jenkins-prod-01"
  },
  "git": {
    "repository": "https://github.com/company/UMIG",
    "commit": "abc123def456789",
    "branch": "main",
    "tag": "v1.2.0",
    "committer": "Lucas Challamel",
    "commitMessage": "Release v1.2.0 - US-088 build process implementation",
    "commitTimestamp": "2024-09-25T14:15:30Z"
  },
  "components": {
    "database": {
      "schemaVersion": "031",
      "semanticVersion": "1.2.0",
      "latestChangelog": "031_dto_performance_optimization.sql",
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
      "newEndpoints": ["MigrationsApi", "TeamsApi"],
      "securityLevel": "enterprise",
      "openApiSpec": "docs/api/openapi.yaml"
    },
    "ui": {
      "version": "1.2.0",
      "architecture": "ComponentOrchestrator",
      "componentCount": 25,
      "securityRating": "8.5/10",
      "testCoverage": "92.3%",
      "performanceScore": "A+",
      "accessibility": "WCAG-2.1-AA",
      "components": {
        "core": ["ComponentOrchestrator", "BaseComponent", "SecurityUtils"],
        "ui": ["TableComponent", "ModalComponent", "FilterComponent"],
        "entities": [
          "TeamsEntityManager",
          "UsersEntityManager",
          "ApplicationsEntityManager"
        ]
      }
    },
    "backend": {
      "version": "1.2.0",
      "platform": "ScriptRunner",
      "groovyVersion": "3.0.15",
      "scriptrunnerVersion": "9.21.0",
      "repositoryPattern": "unified-with-enrichment",
      "serviceLayer": "DTO-transformation",
      "testCoverage": {
        "unit": "88.7%",
        "integration": "76.2%",
        "total": "84.1%"
      }
    },
    "testing": {
      "jsFramework": "Jest 29.7.0",
      "groovyFramework": "self-contained",
      "e2eFramework": "Playwright 1.54.1",
      "totalTests": {
        "javascript": 158,
        "groovy": 31,
        "e2e": 47,
        "security": 28
      },
      "passRate": "100%",
      "performanceImprovement": "35%"
    }
  },
  "dependencies": {
    "runtime": {
      "confluence": {
        "minVersion": "8.5.0",
        "maxVersion": "8.9.x",
        "tested": ["8.5.4", "8.7.2"]
      },
      "postgresql": {
        "minVersion": "14.0",
        "maxVersion": "16.x",
        "tested": ["14.9"]
      },
      "java": {
        "minVersion": "11",
        "maxVersion": "17",
        "tested": ["11.0.20"]
      }
    },
    "development": {
      "node": "18.17.0",
      "npm": "9.6.7",
      "groovy": "3.0.15"
    }
  },
  "security": {
    "scanTimestamp": "2024-09-25T14:25:30Z",
    "scanner": "SonarQube Enterprise",
    "vulnerabilities": {
      "critical": 0,
      "high": 0,
      "medium": 2,
      "low": 5,
      "info": 12
    },
    "codeQuality": {
      "coverage": "84.1%",
      "duplications": "2.1%",
      "maintainabilityRating": "A",
      "reliabilityRating": "A",
      "securityRating": "A"
    },
    "compliance": {
      "owasp": "compliant",
      "gdpr": "compliant",
      "security-controls": 47
    }
  },
  "quality": {
    "codeMetrics": {
      "linesOfCode": 45672,
      "technicalDebt": "2.1%",
      "cyclomaticComplexity": 8.3,
      "maintainabilityIndex": "A+"
    },
    "performance": {
      "buildTime": "4m 32s",
      "testExecutionTime": "2m 18s",
      "packageSize": "15.2MB",
      "compressionRatio": "68%"
    }
  }
}
```

### 2. deployment-info.json

```json
{
  "$schema": "https://umig.internal/schemas/deployment-info-v1.json",
  "deployment": {
    "packageVersion": "1.2.0",
    "packageName": "umig-app-v1.2.0-20240925.143055.zip",
    "deploymentId": "umig-prod-20240925-143055",
    "environment": "production",
    "deploymentType": "rolling",
    "deployedBy": "automation-service",
    "deployedAt": "2024-09-25T14:45:30Z",
    "rollbackVersion": "1.1.2",
    "rollbackPackage": "umig-app-v1.1.2-20240910.102030.zip"
  },
  "prerequisites": {
    "systemChecks": [
      {
        "name": "confluence-version",
        "required": "8.5.0+",
        "current": "8.7.2",
        "status": "pass"
      },
      {
        "name": "database-connection",
        "required": "postgresql-14+",
        "current": "postgresql-14.9",
        "status": "pass"
      },
      {
        "name": "scriptrunner-version",
        "required": "9.21.0+",
        "current": "9.21.0",
        "status": "pass"
      }
    ],
    "compatibilityChecks": [
      {
        "component": "api-backward-compatibility",
        "status": "pass",
        "details": "v2.3.1 fully backward compatible with v2.3.0"
      },
      {
        "component": "database-migration",
        "status": "pass",
        "details": "31 changesets ready, no data loss"
      },
      {
        "component": "ui-components",
        "status": "pass",
        "details": "25 components validated, no breaking changes"
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
    "preDeployment": [
      "system-health",
      "database-connectivity",
      "dependency-validation",
      "security-scan"
    ],
    "postDeployment": [
      "application-startup",
      "api-functionality",
      "ui-components",
      "integration-tests",
      "performance-baseline"
    ],
    "healthChecks": {
      "endpoints": [
        "/rest/scriptrunner/latest/custom/admin/health",
        "/rest/scriptrunner/latest/custom/admin/version",
        "/rest/scriptrunner/latest/custom/admin/components"
      ],
      "timeout": 30,
      "retries": 3
    }
  },
  "monitoring": {
    "dashboards": [
      "umig-production-overview",
      "umig-api-performance",
      "umig-component-health"
    ],
    "alerts": [
      "umig-health-check-failed",
      "umig-api-error-rate-high",
      "umig-component-unavailable"
    ],
    "metrics": {
      "collection": "enabled",
      "retention": "90d",
      "endpoints": ["/admin/metrics", "/admin/health", "/admin/version"]
    }
  },
  "rollback": {
    "strategy": "automated",
    "triggers": [
      "health-check-failure",
      "critical-error-threshold",
      "manual-intervention"
    ],
    "procedure": [
      "stop-application",
      "restore-database-backup",
      "deploy-previous-version",
      "restart-services",
      "validate-rollback"
    ],
    "maxRollbackTime": "10m",
    "successCriteria": [
      "application-responsive",
      "database-consistent",
      "no-critical-errors"
    ]
  }
}
```

### 3. version-compatibility.json

```json
{
  "$schema": "https://umig.internal/schemas/version-compatibility-v1.json",
  "compatibility": {
    "version": "1.2.0",
    "generated": "2024-09-25T14:30:55Z",
    "umigVersion": "1.2.0"
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
      },
      "confluence": {
        "min": "8.5.0",
        "max": "8.9.x",
        "tested": ["8.5.4", "8.7.2", "8.8.1"]
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
      "procedures": [
        "database-migration",
        "api-upgrade",
        "ui-migration",
        "config-update"
      ]
    },
    "from-0.9.x": {
      "automatic": false,
      "dataLoss": false,
      "downtime": "<10m",
      "procedures": ["manual-intervention", "data-backup", "full-migration"]
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
    },
    "to-1.0.x": {
      "supported": true,
      "automatic": false,
      "dataLoss": "possible",
      "time": "<15m",
      "procedures": ["manual-review", "data-backup", "full-rollback"]
    }
  },
  "deprecationSchedule": {
    "umig-1.0.x": {
      "deprecatedIn": "1.2.0",
      "endOfLife": "1.4.0",
      "supportUntil": "2025-03-31"
    },
    "api-v2.2.x": {
      "deprecatedIn": "1.2.0",
      "endOfLife": "1.3.0",
      "supportUntil": "2024-12-31"
    }
  }
}
```

## Build Pipeline Integration

### 1. Build Script Updates

```bash
# local-dev-setup/scripts/build/generate-build-manifest.js
const generateBuildManifest = {
  version: process.env.UMIG_VERSION || "1.0.0",
  buildNumber: process.env.BUILD_NUMBER || Date.now(),
  gitCommit: process.env.GIT_COMMIT,
  timestamp: new Date().toISOString()
};

# Version extraction from package.json
const packageJson = require('../../package.json');
const umigVersion = packageJson.version;
```

### 2. Package.json Updates

```json
{
  "name": "umig-application",
  "version": "1.2.0",
  "description": "Unified Migration Implementation Guide",
  "scripts": {
    "build": "npm run build:manifest && npm run build:package",
    "build:manifest": "node scripts/build/generate-build-manifest.js",
    "build:package": "node scripts/build/create-deployment-package.js",
    "build:production": "npm run build && npm run test:all:quick && npm run validate:package",
    "validate:package": "node scripts/build/validate-package.js"
  }
}
```

### 3. CI/CD Integration Points

```yaml
# .github/workflows/build-and-deploy.yml
name: UMIG Build and Deploy
on:
  push:
    tags:
      - "v*"

jobs:
  build:
    steps:
      - name: Generate Build Manifest
        run: npm run build:manifest

      - name: Create Deployment Package
        run: npm run build:package

      - name: Validate Package
        run: npm run validate:package

      - name: Upload Artifact
        uses: actions/upload-artifact@v3
        with:
          name: umig-app-${{ github.ref_name }}-${{ github.run_number }}
          path: dist/umig-app-*.zip
```

## Deployment Validation

### 1. Pre-deployment Checks

```bash
#!/bin/bash
# scripts/deployment/pre-deployment-checks.sh

# Version compatibility validation
validate_version_compatibility() {
    echo "Validating version compatibility..."
    # Check version-compatibility.json requirements
    # Verify database schema compatibility
    # Validate API backward compatibility
}

# System prerequisites validation
validate_prerequisites() {
    echo "Checking system prerequisites..."
    # Confluence version check
    # Database connectivity
    # ScriptRunner version validation
}
```

### 2. Post-deployment Validation

```bash
#!/bin/bash
# scripts/deployment/post-deployment-validation.sh

# Health endpoint validation
validate_health_endpoints() {
    curl -f "${UMIG_BASE_URL}/admin/health" || exit 1
    curl -f "${UMIG_BASE_URL}/admin/version" || exit 1
    curl -f "${UMIG_BASE_URL}/admin/components" || exit 1
}

# Component functionality validation
validate_component_functionality() {
    # Test API endpoints
    # Validate UI component loading
    # Check database connectivity
    # Verify authentication
}
```

This comprehensive build artifact specification provides UMIG with a complete framework for managing multi-component deployments while maintaining operational clarity and rollback capabilities.
