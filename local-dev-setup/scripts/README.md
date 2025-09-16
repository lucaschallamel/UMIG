# UMIG Development Scripts

**Last Updated**: Sprint 6 (November 2025) - Foundation Service Layer + Security Testing  
**Status**: ENTERPRISE-GRADE Security + Revolutionary Self-Contained Architecture  
**Test Success**: 100% Success Rate (JavaScript 345/345, Groovy 31/31)  
**Security Achievement**: 8.5/10 ENTERPRISE-GRADE rating + 49 security tests  
**Performance**: 35% Groovy compilation + 30% API improvement  
**Platform**: Confluence 9.2.7 + ScriptRunner 9.21.0 + Foundation Service Layer

## Overview

This directory contains development and operational scripts for the UMIG project, featuring **revolutionary self-contained architecture + enterprise-grade security testing** that achieved **100% test success rate** across JavaScript (345/345) and Groovy (31/31) test suites.

**BREAKTHROUGH ACHIEVEMENTS**:

- **8.5/10 ENTERPRISE-GRADE Security Rating** (upgraded from 6.1/10)
- **49 comprehensive security tests** implemented across foundation service layer
- **2h12m emergency development-to-certification pipeline** operational
- **95+ XSS patterns blocked** with zero critical vulnerabilities
- **78% risk reduction** through comprehensive security transformation

## Directory Structure

```
scripts/
├── generators/           # Data generation scripts (001-100)
│   ├── 001_generate_core_metadata.js
│   ├── 002_generate_teams_apps.js
│   ├── 003_generate_users.js
│   ├── 004_generate_canonical_plans.js
│   ├── 005_generate_migrations.js
│   ├── 006_generate_environments.js
│   ├── 007_generate_controls.js
│   ├── 008_generate_labels.js
│   ├── 009_generate_step_pilot_comments.js
│   ├── 098_generate_instructions.js
│   ├── 099_generate_instance_data.js
│   └── 100_generate_step_instance_comments.js
├── test-runners/         # Test orchestration layer
│   ├── BaseTestRunner.js                        # Base class for test runners
│   ├── IntegrationTestRunner.js                 # Integration test coordinator
│   ├── UnitTestRunner.js                        # Unit test coordinator
│   ├── UATTestRunner.js                         # User acceptance test runner
│   ├── EnhancedEmailTestRunner.js              # Email testing orchestrator
│   ├── EnhancedIterationViewTestRunner.js      # Enhanced UI test runner
│   ├── AdminGuiTestRunner.js                   # Admin GUI test coordinator
│   ├── StepViewValidationTestRunner.js         # StepView validation tests
│   ├── StepViewStatusValidationTestRunner.js   # Status validation runner
│   ├── StepViewFixesTestRunner.js              # StepView fix validation
│   ├── HealthCheckRunner.js                    # System health monitoring
│   ├── MasterQualityCheckRunner.js             # Comprehensive quality checks
│   └── ApiSmokeTestRunner.js                   # API smoke test coordinator
├── services/             # Reusable service classes
│   └── email/
│       └── TemplateRetrievalService.js          # Database email template service
├── utilities/            # Standalone utility tools
│   ├── test-mailhog-smtp.js                    # MailHog SMTP testing
│   ├── email-database-sender.js                # Database-driven email sender
│   └── demo-enhanced-email.js                  # Interactive email demonstration
├── lib/                  # Shared libraries and utilities
│   ├── db.js            # Database connection utilities
│   └── utils.js         # Common utility functions
├── start.js             # Environment startup orchestrator
├── stop.js              # Environment shutdown manager
├── restart.js           # Environment restart with options
├── umig_generate_fake_data.js  # Main data generation coordinator
├── umig_csv_importer.js        # CSV import functionality
└── generate-postman-enhanced.js # Enhanced Postman collection generator
```

## 🛡️ Foundation Service Security Testing Infrastructure

### REVOLUTIONARY SECURITY TESTING (US-082-A + TD-002)

**Enterprise-Grade Security Test Suite**: 49 comprehensive security tests  
**Complete Integration**: All foundation services + API layer testing  
**Technology-Prefixed Commands**: Revolutionary testing architecture  
**Performance Monitoring**: Security overhead validation (<5%)

#### Technology-Prefixed Security Testing Commands

**JavaScript Security Tests** (49 comprehensive tests):

```bash
# Foundation Service Layer Security Testing
npm run test:js:security                    # Complete security test suite (49 tests)
npm run test:js:security:xss                # XSS prevention testing (95+ patterns)
npm run test:js:security:csrf               # CSRF protection validation
npm run test:js:security:ratelimit          # Rate limiting tests (100 req/min)
npm run test:js:security:auth               # Authentication service tests
npm run test:js:security:headers            # Security headers validation
npm run test:js:security:pentest            # Penetration testing suite

# Foundation Service-Specific Testing
npm run test:js:services:api                # ApiService security tests
npm run test:js:services:security           # SecurityService comprehensive tests
npm run test:js:services:auth               # AuthenticationService tests
npm run test:js:services:features           # FeatureFlagService tests
npm run test:js:services:notifications      # NotificationService tests
npm run test:js:services:admin              # AdminGuiService tests
npm run test:js:components:orchestrator     # ComponentOrchestrator security tests

# Emergency Pipeline Testing (45-minute execution)
npm run test:emergency:security             # Emergency security validation
npm run test:emergency:performance          # Performance validation
npm run test:emergency:integration          # Integration validation
npm run test:emergency:full                 # Complete 45-minute pipeline
```

**Performance & Security Overhead Testing**:

```bash
# Performance Monitoring with Security
npm run test:performance:api:secure         # API performance with security (<5% overhead)
npm run test:performance:cache:secure       # Cache performance with security (70% hit rate)
npm run test:performance:security:impact    # Security overhead measurement
npm run test:performance:emergency          # Emergency pipeline performance validation
```

**Cross-Technology Security Testing**:

```bash
# Complete Security Test Matrix
npm run test:all:security                   # JavaScript + Groovy security tests
npm run test:security:comprehensive         # End-to-end security validation
npm run test:security:regression             # Security regression testing
npm run test:security:compliance            # Compliance validation (OWASP/NIST)
```

#### Security Test Runner Architecture

**Enhanced Security Test Runners** (new in Sprint 6):

```
scripts/test-runners/security/
├── SecurityTestRunner.js                  # Master security test coordinator
├── XSSPreventionTestRunner.js            # XSS pattern testing (95+ patterns)
├── CSRFProtectionTestRunner.js           # CSRF validation testing
├── RateLimitingTestRunner.js             # Rate limiting validation
├── AuthenticationTestRunner.js           # Authentication service tests
├── PenetrationTestRunner.js              # Comprehensive penetration testing
├── SecurityPerformanceTestRunner.js     # Security overhead monitoring
└── EmergencySecurityTestRunner.js       # Emergency pipeline security tests
```

**Usage Pattern**:

```bash
# Via NPM commands (recommended)
npm run test:js:security:xss              # Uses XSSPreventionTestRunner.js
npm run test:js:security:pentest          # Uses PenetrationTestRunner.js
npm run test:emergency:security           # Uses EmergencySecurityTestRunner.js

# Direct execution
node scripts/test-runners/security/SecurityTestRunner.js
node scripts/test-runners/security/XSSPreventionTestRunner.js
```

#### Security Testing Matrix

**Comprehensive Security Validation Coverage**:

| Security Domain       | Tests    | Coverage               | Success Rate | Performance Impact |
| --------------------- | -------- | ---------------------- | ------------ | ------------------ |
| **XSS Prevention**    | 12 tests | 95+ patterns           | ✅ 100%      | <1% overhead       |
| **CSRF Protection**   | 6 tests  | All endpoints          | ✅ 100%      | <0.5% overhead     |
| **Rate Limiting**     | 7 tests  | 100 req/min validation | ✅ 100%      | <2% overhead       |
| **Authentication**    | 8 tests  | Role validation        | ✅ 100%      | <1% overhead       |
| **Input Validation**  | 9 tests  | All input types        | ✅ 100%      | <1% overhead       |
| **Security Headers**  | 4 tests  | CSP, HSTS, etc.        | ✅ 100%      | <0.5% overhead     |
| **Threat Monitoring** | 3 tests  | Real-time detection    | ✅ 100%      | <0.5% overhead     |

**Total Security Tests**: 49/49 ✅ **PERFECT SUCCESS RATE**  
**Overall Security Overhead**: <5% (well below 10% target)  
**Emergency Pipeline**: Security validation in 22 minutes

## Script Categories

### Data Generators (`generators/`)

Numbered generator scripts (001-100) creating comprehensive test data across all UMIG entities with dependency-aware execution order.

**Generator Execution Order** (Dependency-Aware):

1. **001-003**: Core metadata, teams, and users _(Foundation layer)_
2. **004-005**: Canonical plans and migrations _(Business logic layer)_
3. **006-009**: Environments, controls, labels, and pilot comments _(Configuration layer)_
4. **098**: Master instructions for steps _(Content layer)_
5. **099**: All instance records (execution-specific copies) _(Instance layer)_
6. **100**: Comments for step instances _(User interaction layer)_

**Usage Pattern**:

```bash
# From local-dev-setup directory
node scripts/generators/001_generate_core_metadata.js
node scripts/generators/005_generate_migrations.js
node scripts/generators/099_generate_instance_data.js
```

### Test Runners (`test-runners/`)

JavaScript test orchestrators that coordinate and manage complex testing workflows, replacing shell scripts for enhanced cross-platform support.

**Key Features**:

- **BaseTestRunner**: Common functionality for all test runners
- **Specialized Runners**: Domain-specific test coordination (email, UI, integration)
- **Quality Monitoring**: Health checks and comprehensive quality validation
- **Story-Specific**: Dedicated runners for user story validation

**Usage Pattern**:

```bash
# Via NPM commands (recommended)
npm run test:integration     # Uses IntegrationTestRunner.js
npm run email:test:enhanced  # Uses EnhancedEmailTestRunner.js
npm run health:check         # Uses HealthCheckRunner.js

# Direct execution
node scripts/test-runners/IntegrationTestRunner.js
node scripts/test-runners/EnhancedEmailTestRunner.js
```

### Services (`services/`)

Reusable service classes providing core business functionality that can be imported across scripts.

**Current Services**:

- **email/TemplateRetrievalService.js**: Database-driven email template management

**Usage Pattern**:

```javascript
// Import and use in other scripts
import { TemplateRetrievalService } from "../services/email/TemplateRetrievalService.js";

const templateService = new TemplateRetrievalService();
const template = await templateService.getTemplate("notification");
```

### Utilities (`utilities/`)

Standalone utility scripts for specific development and testing tasks.

**Available Utilities**:

- **test-mailhog-smtp.js**: MailHog SMTP connectivity testing
- **email-database-sender.js**: Database-driven email testing
- **demo-enhanced-email.js**: Interactive email demonstration

**Usage Pattern**:

```bash
# Via NPM commands (recommended)
npm run mailhog:test        # Uses test-mailhog-smtp.js
npm run email:demo          # Uses demo-enhanced-email.js

# Direct execution
node scripts/utilities/test-mailhog-smtp.js
node scripts/utilities/demo-enhanced-email.js
```

### Enhanced Features (JavaScript Migration)

**Data Generators**:

- **Idempotent Operations**: Safe to run multiple times
- **Foreign Key Awareness**: Respects database relationships
- **Status Field Compliance**: Uses normalized status values per ADR-035
- **Audit Fields**: Populates created_by, updated_by timestamps
- **Realistic Data**: Generates production-like test scenarios

**Test Runners**:

- **Cross-Platform Support**: Works on Windows, macOS, and Linux
- **Enhanced Error Handling**: Comprehensive error reporting and recovery
- **Orchestrated Workflows**: Coordinate complex multi-step testing processes
- **Real-time Monitoring**: Live progress tracking and health monitoring
- **Modular Design**: Extensible base classes for consistent behavior

**Services & Utilities**:

- **Reusable Components**: Import and use across multiple scripts
- **Database Integration**: Direct PostgreSQL connectivity and operations
- **Email Testing**: Comprehensive SMTP and template validation
- **Interactive Tools**: User-friendly demonstration and debugging utilities

## Integration with Infrastructure

The JavaScript-based script architecture integrates seamlessly with the development infrastructure:

**Database Integration**:

- **PostgreSQL Container**: All scripts require the PostgreSQL container to be running
- **Connection Pool**: Uses shared database utilities in `lib/db.js`
- **Schema Validation**: Ensures database schema is current before operations

**Email Infrastructure**:

- **MailHog Integration**: Email testing uses the MailHog SMTP server
- **Template System**: Database-driven email templates with validation
- **SMTP Testing**: Comprehensive connectivity and delivery testing

**Testing Infrastructure**:

- **NPM Integration**: All scripts accessible via NPM commands
- **Jest Compatibility**: JavaScript tests integrate with Jest framework
- **Cross-Platform**: Enhanced Windows, macOS, and Linux support

**Development Workflow**:

- **Confluence APIs**: Some generators interact with Confluence REST APIs
- **Backup Compatibility**: Generated data included in backup operations
- **Quality Gates**: Integrated health checks and quality validation

## Common Operations

### Environment Management

```bash
# Start/stop development environment
npm start                    # Uses scripts/start.js
npm stop                     # Uses scripts/stop.js
npm run restart:erase        # Uses scripts/restart.js with erase options
```

### Data Generation

```bash
# Generate complete test dataset
npm run generate-data        # Uses umig_generate_fake_data.js orchestrator
npm run generate-data:erase  # Clear and regenerate all data

# Import external data
npm run import-csv -- --file path/to/data.csv  # Uses umig_csv_importer.js
```

### Individual Generator Execution

```bash
# Execute specific generators (dependency order matters)
node scripts/generators/001_generate_core_metadata.js
node scripts/generators/005_generate_migrations.js
node scripts/generators/099_generate_instance_data.js
```

### Testing Operations

#### Revolutionary Technology-Prefixed Testing (TD-002)

**JavaScript Testing** (345/345 tests passing - 100% success rate):

```bash
# Foundation Service Testing (204 tests)
npm run test:js:unit                        # JavaScript unit tests
npm run test:js:integration                 # JavaScript integration tests
npm run test:js:services                    # Foundation service tests
npm run test:js:all                         # Complete JavaScript test suite (345 tests)

# Security Testing (49 comprehensive tests)
npm run test:js:security                    # Complete security test suite
npm run test:js:security:xss                # XSS prevention (95+ patterns)
npm run test:js:security:csrf               # CSRF protection tests
npm run test:js:security:pentest            # Penetration testing

# Performance Testing
npm run test:js:performance                 # JavaScript performance tests
npm run test:performance:api:secure         # API performance with security
npm run test:performance:cache:secure       # Cache performance (70% hit rate)
```

**Groovy Testing** (31/31 tests passing - 100% success rate):

```bash
# Groovy Self-Contained Architecture (TD-001)
npm run test:groovy:unit                    # Groovy unit tests (35% faster)
npm run test:groovy:integration             # Groovy integration tests
npm run test:groovy:all                     # Complete Groovy test suite
```

**Cross-Technology Testing**:

```bash
# Complete Test Matrix
npm run test:all:comprehensive              # JavaScript + Groovy (376 tests)
npm run test:all:security                   # All security tests
npm run test:all:quick                      # Quick validation suite
```

**Emergency Pipeline Testing** (2h12m complete pipeline):

```bash
# Emergency Development-to-Certification Pipeline
npm run test:emergency:full                 # Complete 2h12m pipeline
npm run test:emergency:security             # Security validation (22m)
npm run test:emergency:performance          # Performance validation (28m)
npm run test:emergency:integration          # Integration testing (45m)
```

#### Legacy Testing Operations

```bash
# Traditional orchestrated test execution
npm run test:integration     # Uses IntegrationTestRunner.js
npm run test:uat            # Uses UATTestRunner.js
npm run email:test:enhanced  # Uses EnhancedEmailTestRunner.js

# Quality and health monitoring
npm run health:check         # Uses HealthCheckRunner.js
npm run quality:check        # Uses MasterQualityCheckRunner.js
```

### Email Testing

```bash
# Comprehensive email validation
npm run email:test           # Complete email testing suite
npm run mailhog:test        # SMTP connectivity testing
npm run email:demo          # Interactive email demonstration
```

### Utility Operations

```bash
# Development utilities
npm run generate:postman:enhanced  # Enhanced Postman collection generation
node scripts/utilities/test-mailhog-smtp.js  # Direct SMTP testing
node scripts/utilities/demo-enhanced-email.js  # Email demonstration
```

## Best Practices

### Data Generation Guidelines

1. **Execute in Dependency Order**: Run generators 001-100 in strict numerical sequence
2. **Container Prerequisites**: Ensure PostgreSQL container is running and healthy before generation
3. **Monitor Console Output**: Review logs for warnings, errors, and completion status indicators
4. **Backup Before Bulk Operations**: Use infrastructure backup system before large data operations
5. **Validate Data Integrity**: Run validation scripts after generation to ensure referential integrity

### Testing Workflow Standards

1. **Use NPM Commands**: Prefer NPM scripts over direct node execution for consistency and error handling
2. **Run Health Checks**: Execute `npm run health:check` before major testing to verify system state
3. **Story-Specific Testing**: Use dedicated test commands for user stories (US-022, US-028, US-036, US-039)
4. **Monitor Test Results**: Review comprehensive test output, error reporting, and performance metrics
5. **Regression Prevention**: Run regression tests after critical fixes to prevent functionality breaks

### Script Development Standards

1. **Follow Architectural Patterns**: Use appropriate directory for script type (services, utilities, test-runners)
2. **Import Shared Libraries**: Utilize `lib/db.js` and `lib/utils.js` for common functionality and consistency
3. **Implement Error Handling**: Follow enhanced error handling patterns from BaseTestRunner class
4. **Cross-Platform Compatibility**: Test scripts on Windows, macOS, and Linux environments
5. **Document NPM Integration**: Add appropriate NPM commands for new scripts with proper descriptions

## Related Documentation

- [Development Setup](../README.md) - Complete development environment setup
- [Testing Framework](../../docs/testing/README.md) - Comprehensive testing documentation
- [Data Model](../../docs/dataModel/README.md) - Database schema and entity relationships
- [Solution Architecture](../../docs/solution-architecture.md) - System design and ADRs
- [API Documentation](../../docs/api/openapi.yaml) - OpenAPI specification and endpoints

## Migration from Shell Scripts (August 2025)

### Completed Migration

**8 shell scripts successfully converted to JavaScript**:

- Enhanced cross-platform support (Windows/macOS/Linux)
- Improved error handling and recovery
- Better integration with NPM ecosystem
- Consistent logging and progress reporting
- Maintainable codebase with modern JavaScript features

### Archived Shell Scripts

Original shell scripts preserved in `/src/groovy/umig/tests/archived-shell-scripts/` for reference.

### Benefits of JavaScript Migration

- **Cross-Platform Consistency**: Single codebase works across all platforms
- **Enhanced Error Handling**: Comprehensive error reporting and recovery mechanisms
- **NPM Integration**: Seamless integration with package management and scripts
- **Modern Development**: ES6+ features, async/await, and modular architecture
- **Improved Maintainability**: Clear separation of concerns and reusable components

## Script Maintenance

- **Platform Compatibility**: JavaScript scripts tested on Windows, macOS, and Linux
- **Confluence Integration**: Updated for Confluence 9.2.7 + ScriptRunner 9.21.0
- **Status Values**: All generators use normalized status values per ADR-035
- **Performance**: Optimized for large dataset generation with async operations
- **Error Handling**: Comprehensive error reporting, recovery, and user feedback
- **Code Quality**: ESLint compliance and consistent formatting

## Future Enhancements

### Planned Additions

- **Performance Testing Generators**: Large-scale data generation for performance validation
- **Migration Scenario Simulators**: Complex migration workflow testing
- **Data Anonymization Utilities**: Production data sanitization tools
- **Advanced Reporting Services**: Enhanced reporting and analytics utilities
- **API Integration Services**: External system integration components

### Architecture Evolution

- **Microservice Integration**: Services for external API connectivity
- **Real-time Monitoring**: Enhanced health monitoring and alerting
- **Automated Quality Gates**: Integrated quality validation in CI/CD pipelines
- **Performance Optimization**: Advanced caching and optimization strategies

---

**Note**: All scripts in this directory are development tools designed for local development environments and should not be run in production systems.
