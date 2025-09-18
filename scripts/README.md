# UMIG Scripts Directory

This directory contains scripts and utilities for the UMIG project, organized by functionality and purpose. All scripts are designed to support development, testing, and deployment workflows.

## Directory Structure

### 📁 us-087/ - US-087 Admin GUI Component Migration Scripts

#### browser-integration/

**Purpose**: Browser-based integration scripts for Confluence macro environments

- `confluence-macro-integration-fixed.js` - **PRODUCTION READY** ✅
  - Working browser integration script for Confluence macro environment
  - Handles Phase 1 feature integration with proper error handling
  - Usage: Copy/paste in browser console on Confluence admin page
  - Status: Fixed version with proper ScriptRunner URL handling

#### testing/

**Purpose**: Integration testing and validation scripts

- `validate-integration.js` - **PRODUCTION READY** ✅
  - Browser-based validation script for US-087 Phase 1 features
  - Tests feature toggles, component lifecycle, and error handling
  - Usage: Run in browser console after macro integration
  - Validates: FeatureToggle, PerformanceMonitor, AdminGUI integration

#### ci-cd/

**Purpose**: Continuous Integration and automated testing scripts

- `test-us087-phase1.js` - **PRODUCTION READY** ✅
  - Node.js-based CI/CD validation script
  - Automated testing for Phase 1 implementation
  - Validates API endpoints, component registration, and feature flags
  - Usage: `node scripts/us-087/ci-cd/test-us087-phase1.js`

#### documentation/

**Purpose**: Testing instructions and guides

- `US-087-TESTING-INSTRUCTIONS.md` - **CURRENT** 📖
  - Comprehensive testing guide for US-087 Phase 1
  - Step-by-step instructions for Confluence macro testing
  - Browser console usage and workflow documentation
  - Troubleshooting guide and common issues

### 📁 utilities/ - General Purpose Utilities

#### security/

**Purpose**: Security analysis and audit tools

- `security-audit-us087.js` - **AUDIT TOOL** 🔒
  - Security audit script for US-087 implementation
  - Validates security controls and compliance
  - Usage: Part of security review process

## Script Categories

### 🚀 Production Ready Scripts

These scripts are thoroughly tested and ready for production use:

- `us-087/browser-integration/confluence-macro-integration-fixed.js`
- `us-087/testing/validate-integration.js`
- `us-087/ci-cd/test-us087-phase1.js`

### 🔧 Development Utilities

Helper scripts for development and testing:

- `utilities/security/security-audit-us087.js`

### 📋 Documentation

Usage guides and instructions:

- `us-087/documentation/US-087-TESTING-INSTRUCTIONS.md`

## Quick Start Commands

### US-087 Phase 1 Testing

```bash
# CI/CD automated validation
node scripts/us-087/ci-cd/test-us087-phase1.js

# Manual browser testing (follow instructions in documentation)
# 1. Open Confluence admin page
# 2. Open browser console (F12)
# 3. Copy/paste: scripts/us-087/browser-integration/confluence-macro-integration-fixed.js
# 4. Copy/paste: scripts/us-087/testing/validate-integration.js
```

### Security Audit

```bash
# Run security audit for US-087
node scripts/utilities/security/security-audit-us087.js
```

## Integration with Package.json

Current package.json scripts that may reference these files:

- No direct references found - scripts are primarily browser-based or manually executed
- CI/CD integration available through Node.js execution

## Development Guidelines

### Adding New Scripts

1. **Categorize by purpose**: Choose appropriate subdirectory
2. **Follow naming convention**: Use kebab-case, include feature ID if applicable
3. **Add documentation**: Update this README with script description
4. **Include usage examples**: Provide clear usage instructions
5. **Mark status**: Indicate production readiness, development stage, etc.

### Script Status Legend

- ✅ **PRODUCTION READY**: Thoroughly tested, production-safe
- 🔧 **DEVELOPMENT**: Under development, may have issues
- 📖 **DOCUMENTATION**: Instructional content
- 🔒 **AUDIT TOOL**: Security or compliance tool
- ⚠️ **DEPRECATED**: Obsolete, scheduled for removal

### Testing Workflow

1. **Development**: Create in appropriate subdirectory
2. **Testing**: Validate functionality in target environment
3. **Documentation**: Add usage instructions to README
4. **Integration**: Add package.json scripts if needed
5. **Production**: Mark as production ready when validated

## File History

### Removed Files (Cleaned Up)

- `confluence-macro-integration.js` - Replaced by -fixed version
- `create-test-ui.js` - Early prototype, superseded
- `test-macro-context.js` - Diagnostic script, no longer needed

### Current Organization

- **Organized**: September 17, 2025
- **Purpose**: Clean, professional structure for US-087 Phase 1
- **Maintainer**: Development Team

## Related Documentation

- **Architecture**: `docs/architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md`
- **Sprint Documentation**: `docs/roadmap/sprint7/US-087-admin-gui-component-migration.md`
- **Testing Infrastructure**: `local-dev-setup/scripts/` for general development scripts

---

_This directory structure supports clear separation of concerns and makes it easy for developers to find and use the appropriate scripts for their needs._
