# UMIG Development & Operations

**Version:** 2025-08-27  
**Part of:** [UMIG Solution Architecture](./solution-architecture.md)  
**Navigation:** [Architecture Foundation](./architecture-foundation.md) | [API & Data Architecture](./api-data-architecture.md) | [Specialized Features](./specialized-features.md) | [Implementation Patterns](./implementation-patterns.md)

## Overview

This document defines the development environment, testing frameworks, quality assurance methodologies, and operational patterns for the UMIG project. It establishes comprehensive standards for DevOps practices, testing strategies, and infrastructure modernization.

---

## 1. Development Environment & Operations

### 1.1. Local Development Environment ([ADR-006], [ADR-025])

- **Containerization:** The entire local stack (Confluence, PostgreSQL, MailHog) is containerized using **Podman**.
- **Orchestration:** The environment is managed by **Podman Compose** and orchestrated by a suite of **NodeJS scripts**.
- **Management:** Developers **must** use the provided wrapper scripts (`npm run start`, `npm run stop`, etc.) to manage the environment.

### 1.2. Development Environment Evolution ([ADR-025])

The development environment has evolved to prioritize reliability and developer experience:

#### Current Architecture (Node.js-based)

- **Orchestration:** Development environment is orchestrated by **Node.js scripts** using specialized libraries:
  - `execa`: For reliable subprocess execution with proper error handling
  - `commander`: For CLI interface and argument parsing
  - `chalk`: For colored console output and developer feedback
- **Management Commands:**
  - `npm run start`: Start complete development stack
  - `npm run stop`: Graceful shutdown of all services
  - `npm run restart`: Restart with optional `--reset` flag for database cleanup

#### Historical Evolution

- **Original Approach:** Shell scripts (bash/sh) for environment management
- **Migration Rationale:**
  - Improved cross-platform compatibility (Windows, macOS, Linux)
  - Better error handling and process management
  - Enhanced developer feedback and logging
  - More reliable container orchestration

### 1.3. Plugin & Dependency Management ([ADR-007])

- **ScriptRunner Installation:** The ScriptRunner for Confluence plugin **must** be installed manually from the Atlassian Marketplace via the Confluence UI after the first startup.
- **Rationale:** Automated installation approaches (marketplace URL injection, plugin copying) have proven unreliable due to:
  - Confluence startup timing dependencies
  - Marketplace authentication complexities
  - Container file system permission issues
- **Process:** Developers must manually install ScriptRunner via the Confluence UI (`http://localhost:8090`) after initial environment startup.

### 1.4. Data Utilities ([ADR-013])

- **Language:** All data generation, import, and utility scripts are written in **NodeJS**.
- **Idempotency:** Data generation scripts must be idempotent and include a `--reset` flag that only truncates the tables managed by that script.
- **Rationale:** Node.js provides excellent database connectivity, JSON handling, and integration with the development environment orchestration.

### 1.5. Infrastructure Modernization (August 2025)

#### Complete Cross-Platform Compatibility Achievement

**Status**: 100% shell script elimination achieved with JavaScript modernization and enhanced cross-platform compatibility

#### Infrastructure Modernization Achievement 🌐

- **Primary Achievement**: 100% cross-platform compatibility (Windows/macOS/Linux)
- **Shell Scripts Eliminated**: 14+ shell scripts → JavaScript equivalents with enhanced functionality
- **Test Runner Enhancement**: 13 specialized test runners with comprehensive validation
- **NPM Script Modernization**: 30+ commands updated with standardized interface

| Original Shell Script                 | JavaScript Replacement          | Enhancement    |
| ------------------------------------- | ------------------------------- | -------------- |
| `run-unit-tests.sh`                   | `npm run test:unit`             | ✅ Enhanced    |
| `run-integration-tests.sh`            | `npm run test:integration`      | ✅ Enhanced    |
| `run-authenticated-tests.sh`          | `npm run test:integration:auth` | ✅ Enhanced    |
| `run-all-integration-tests.sh`        | `npm run test:integration:core` | ✅ Enhanced    |
| `run-uat-validation.sh`               | `npm run test:uat`              | ✅ Enhanced    |
| `run-enhanced-iterationview-tests.sh` | `npm run test:iterationview`    | ✅ Enhanced    |
| `api-smoke-test.sh`                   | `npm run quality:api`           | ✅ New Feature |
| `immediate-health-check.sh`           | `npm run health:check`          | ✅ New Feature |
| `master-quality-check.sh`             | `npm run quality:check`         | ✅ New Feature |
| `test-mailhog-smtp.sh`                | `npm run mailhog:test`          | ✅ Enhanced    |
| `validate-stepview-status-fix.sh`     | `npm run validate:stepview`     | ✅ New Feature |

#### Technical Benefits Achieved 🚀

- **Cross-Platform**: Native Windows PowerShell, macOS/Linux terminal support
- **Error Handling**: Enhanced error reporting and debugging capabilities
- **Maintainability**: Consistent JavaScript codebase across testing infrastructure
- **Development Experience**: Better IDE support and debugging tools
- **CI/CD Ready**: Seamless GitHub Actions and automated testing integration
- **Service Architecture**: Foundation patterns for US-056 JSON-Based Step Data Architecture

### 1.6. Data Import Strategy ([ADR-028])

The system implements an efficient strategy for importing large volumes of JSON data from Confluence exports:

#### Import Architecture

- **Approach:** Use PostgreSQL's native `\copy` command with staging tables
- **Performance:** Capable of importing 500+ JSON files in under 3 minutes
- **Technology:** Shell script orchestration with SQL transformation logic

#### Implementation Pattern

1. **Staging Table:** Temporary table with single JSONB column for raw data
2. **Bulk Load:** Use `psql \copy` to load JSON files into staging table
3. **Transformation:** SQL queries to extract and transform JSON into normalized tables
4. **Validation:** Constraint checking and data integrity verification
5. **Cleanup:** Drop staging table after successful import

#### Key Benefits

- **No New Dependencies:** Uses only PostgreSQL and standard shell tools
- **Transactional:** All-or-nothing import with rollback capability
- **Idempotent:** Can be run multiple times without data corruption
- **Performance:** Orders of magnitude faster than row-by-row insertion
- **Flexibility:** JSON structure can evolve without breaking import process

#### Example Usage

```bash
# Import Confluence export files
./import-confluence-data.sh /path/to/json/files/*.json

# Import with specific target schema
./import-confluence-data.sh --schema umig_staging /path/to/exports/
```

---

## 2. Testing & Quality Assurance

### 2.1. Integration Testing ([ADR-019])

- A formal integration testing suite exists in the `/tests/integration` directory.
- These tests are written in Groovy and run against the live, containerized PostgreSQL database to validate the integration between application code and the database schema.

### 2.2. Testing Standards & Mock Requirements ([ADR-026])

#### Mock Specificity Requirements

- **Mandatory Specificity:** All test mocks (for unit and integration tests) **must** be highly specific and validate exact SQL query structure.
- **Forbidden Patterns:** Generic matchers (e.g., `string.contains('SELECT')`) are strictly prohibited.
- **Required Validation:** Mocks must validate:
  - Exact table names and aliases
  - Specific JOIN conditions and column references
  - WHERE clause predicates and parameter binding
  - ORDER BY and other SQL clauses

#### Rationale & Historical Context

- **Critical Incident:** A production regression occurred when an incorrect column name in a JOIN condition passed tests due to generic SQL validation.
- **Risk Mitigation:** Specific mocks catch SQL query regressions that generic patterns miss.
- **Trade-off Acceptance:** The brittleness of specific mocks is an accepted trade-off for correctness and regression prevention.

#### Implementation Standards

- **Test Reliability:** Tests must fail immediately when SQL structure changes, ensuring deliberate review of database access patterns.
- **Maintenance Overhead:** The additional maintenance burden of updating specific mocks is justified by the prevention of production SQL errors.
- **Coverage Requirements:** All database access points must have corresponding specific mock validations.

### 2.3. Testing Framework Consolidation ([ADR-037] - US-037 ✅ COMPLETE)

#### Architecture Decision Record - ADR-037

**Context:** During US-024 Steps API refactoring, we identified significant complexity and maintenance overhead in our testing infrastructure with 8 different test scripts creating confusion and duplicated functionality.

**Decision:** Implement Testing Framework Consolidation Strategy that reduces test scripts from 8 to 4 specialized runners while maintaining 100% of current functionality.

**Status:** ✅ COMPLETE (August 27, 2025) - Landmark achievement with 100% success across all 6 integration tests migrated with perfect ADR-031 compliance. Framework foundation established with BaseIntegrationTest + IntegrationTestHttpClient architecture providing 36% code reduction, 80% development velocity improvement, and systematic prevention of technical debt accumulation.

#### Consolidated Testing Architecture

**Four Essential Test Categories:**

1. **Unit Test Runner**: Groovy unit tests, service layer validation, utility functions
2. **Integration Test Runner**: Database connectivity, repository patterns, Liquibase migrations
3. **API Test Runner**: REST endpoint validation, authentication, HTTP status codes
4. **System Test Runner**: End-to-end workflows, cross-component integration, performance

#### Shared Infrastructure Components

```groovy
// Consolidated configuration management
class TestConfiguration {
    static loadEnvironment()
    static setupDatabase()
    static configureAuthentication()
    static getTestData()
}

// Shared utility functions
class TestUtilities {
    static generateTestData()
    static cleanupTestData()
    static validateResponse()
    static performanceMetrics()
}
```

#### Implementation Benefits

**Complexity Reduction:**

- **50% Script Reduction**: From 8 to 4 specialized test runners
- **Centralized Configuration**: Single point of configuration per test category
- **Shared Infrastructure**: Common utilities eliminate code duplication
- **Clear Execution Patterns**: Consistent interface across all test categories

**Standardized Execution Interface:**

```bash
# NPM-based testing commands (migrated from shell scripts August 2025)
npm run test:unit                 # Unit tests for repositories and core logic
npm run test:integration          # Integration tests for all APIs
npm run test:integration:auth     # Authenticated integration tests
npm run test:uat                  # User acceptance testing validation
npm run test:all                  # Complete test suite execution
```

#### Implementation Achievement (US-037) ✅

**Framework Foundation Complete:**

- **BaseIntegrationTest Framework**: 475-line comprehensive testing foundation with automatic cleanup tracking, performance validation, and reusable infrastructure
- **IntegrationTestHttpClient**: 304-line standardised HTTP client with ScriptRunner authentication compatibility and comprehensive error handling
- **HttpResponse Container**: Data container class with timing metrics, JSON parsing helpers, and success validation patterns
- **Test Migration Success**: ALL 6 integration tests successfully migrated (ApplicationsApi, EnvironmentsApi, MigrationsApi, ControlsApi, PhasesApi, CrossApiTest)

**Technical Excellence Achieved:**

- **Perfect ADR-031 Compliance**: Static type checking with explicit casting throughout testing framework
- **Code Quality Impact**: 36% code reduction in individual tests through systematic framework approach
- **Development Velocity**: 80% improvement in future test development through standardised patterns
- **Zero External Dependencies**: Complete ADR-036 compliance maintaining pure Groovy testing approach
- **Systematic Prevention**: Technical debt accumulation prevented through consistent framework patterns

### 2.4. Testing Patterns from US-036

The US-036 implementation established comprehensive testing methodologies that serve as patterns for future development:

- **Cross-Role Testing Matrix**: Systematic validation across NORMAL/PILOT/ADMIN user roles ensuring proper access control and feature availability
- **Performance Optimization Results**: Achieved 97% server load reduction through smart polling mechanisms, providing benchmarks for future optimizations
- **Browser Compatibility Framework**: Established testing protocols for Chrome, Firefox, Safari, and Edge ensuring consistent user experience across platforms
- **BGO-002 Reference Test Case Pattern**: Complex scenario testing methodology for edge cases and integration boundary conditions
- **Visual Alignment Validation Methodology**: 40-point validation framework ensuring consistent UI presentation and user experience quality

### 2.5. Database Quality Validation Framework ([ADR-040] - US-024)

#### Architecture Decision Record - ADR-040

**Context:** US-024 identified the need for comprehensive database layer validation capabilities beyond basic integration testing, including performance benchmarking and data integrity checking.

**Decision:** Implement Database Quality Validation Framework that provides comprehensive database layer validation, performance benchmarking, and data integrity checking through direct SQL validation.

#### Framework Architecture

**DatabaseQualityValidator Framework:**

```groovy
class DatabaseQualityValidator {
    private DatabaseUtil databaseUtil
    private PerformanceBenchmark benchmark
    private IntegrityChecker integrity
    private SchemaValidator schema

    def validateDatabaseHealth() {
        def results = [:]
        results.performance = benchmark.runPerformanceTests()
        results.integrity = integrity.validateDataIntegrity()
        results.schema = schema.validateSchemaConsistency()
        results.constraints = validateConstraints()
        return results
    }
}
```

**Performance Benchmarking Module:**

- Connection pooling effectiveness
- Query execution time analysis
- Index usage validation
- Concurrency testing
- Scalability assessment

**Data Integrity Validation:**

- Foreign key constraint violations
- Unique constraint violations
- Check constraint validation
- Business rule compliance
- Referential integrity verification

#### Validation Categories

**Performance Metrics:**

- Query execution time (average, min, max)
- Connection pool utilization
- Index effectiveness scores
- Transaction throughput
- Concurrent operation handling

**Integrity Metrics:**

- Constraint violation detection
- Business rule compliance scoring
- Data consistency validation
- Orphaned record identification
- Relationship integrity verification

**Schema Metrics:**

- Table structure consistency
- Index optimization analysis
- Constraint completeness validation
- Migration status verification
- Schema evolution tracking

#### Benefits and Impact

**Database Reliability:**

- **Comprehensive Database Coverage**: Direct validation of database layer functionality
- **Performance Monitoring**: Ability to track and optimize database performance
- **Data Integrity Assurance**: Automated validation of constraints and relationships
- **Proactive Issue Detection**: Early identification of database problems

**Development Confidence:**

- **Quality Metrics**: Measurable database quality indicators
- **Development Confidence**: Higher confidence in database layer reliability
- **Performance Optimization**: Identification of optimization opportunities
- **Enterprise Readiness**: Production-grade database validation capabilities

---

## 3. Documentation & Quality Management

### 3.1. Documentation Consolidation Methodology ([ADR-038] - US-024)

#### Architecture Decision Record - ADR-038

**Context:** Documentation analysis during US-024 revealed significant proliferation and redundancy across multiple locations with 6 testing-related files containing substantial content overlap.

**Decision:** Implement Systematic Documentation Consolidation Methodology that reduces file count by ~50% while achieving zero information loss through strategic consolidation and hierarchical organization.

#### Consolidation Framework

**Zero Information Loss Principle:**

- Complete content audit before consolidation
- Comprehensive cross-reference mapping
- Validation of information uniqueness
- Archival of historical context where needed

**Hierarchical Consolidation Pattern:**

```markdown
Primary Document (Master)
├── Core Concepts (Essential information)
├── Detailed Implementation (Technical depth)  
├── Examples & Patterns (Practical guidance)
├── Related References (Cross-links)
└── Historical Context (Archived decisions)
```

#### Implementation Results

**Documentation Structure Optimization:**

**Before Consolidation:**

```
├── testing-framework-setup.md
├── testing-best-practices.md
├── testing-troubleshooting.md
├── api-testing-guide.md
├── integration-testing.md
└── test-data-management.md
```

**After Consolidation:**

```
├── testing-comprehensive-guide.md
│   ├── Core Testing Concepts
│   ├── Framework Setup & Configuration
│   ├── Testing Categories (Unit/Integration/API/System)
│   ├── Best Practices & Patterns
│   ├── Troubleshooting & Common Issues
│   └── Advanced Topics & Extensions
└── testing-quick-reference.md
```

**Benefits Achieved:**

- **50% File Reduction**: Streamlined documentation structure
- **Improved Discoverability**: Centralized location for related topics
- **Enhanced Maintainability**: Single source of truth per topic area
- **Better Navigation**: Clear hierarchical structure with cross-references
- **Consistency Improvement**: Standardized format and organization patterns
- **Zero Information Loss**: All valuable content preserved and accessible

### 3.2. Technical Debt Prioritization Methodology ([ADR-041] - Sprint 5)

#### Architecture Decision Record - ADR-041

**Context:** Sprint 5 reached capacity planning phase with technical debt issues requiring prioritization between MVP timeline constraints and long-term quality assurance needs.

**Decision:** Implement Technical Debt Prioritization Methodology with accelerated resolution framework that balances MVP delivery requirements against systematic technical debt accumulation prevention.

#### Decision Framework

**Evaluation Criteria:**

- **MVP Timeline Impact**: Assessment of technical debt effect on August 28, 2025 deadline
- **Quality Risk Assessment**: Systematic analysis of technical debt affecting production stability
- **Resource Availability**: Team capacity utilization analysis (72% → 92% expansion evaluation)
- **Stakeholder Impact**: Effect on UAT preparation and deployment readiness
- **Long-term Maintainability**: Prevention of compound technical debt interest

**Prioritization Matrix:**

| Priority    | Description                  | Action Framework                | Risk Tolerance   |
| ----------- | ---------------------------- | ------------------------------- | ---------------- |
| P0 Critical | MVP blocking issues          | Immediate acceleration          | Zero tolerance   |
| P1 High     | Quality affecting production | Sprint acceleration if possible | Low tolerance    |
| P2 Medium   | Maintainability concerns     | Sprint 6 deferral consideration | Medium tolerance |
| P3 Low      | Future optimization          | Backlog management              | High tolerance   |

#### Sprint 5 Application

**US-037 Acceleration Decision:**

**Technical Debt Analysis:**

- **Category**: Integration Testing Framework Standardization
- **Scope**: Authentication patterns, error handling consistency, performance benchmarking
- **Impact**: Systematic inconsistencies affecting all API endpoints
- **Risk**: Compound technical debt preventing production stability

**Decision Outcome**: Move US-037 (5 points) from Sprint 6 to Sprint 5, increasing scope from 18 to 23 points (72% → 92% capacity)

**Risk Management Framework:**

- **Capacity Utilization**: 92% (minimal 8% buffer)
- **Execution Risk**: High intensity requiring enhanced monitoring
- **Mitigation Strategy**: Leverage existing US-022 infrastructure foundation
- **Contingency Planning**: Ready Sprint 6 deferral if critical issues emerge

#### Benefits and Strategic Value

**Technical Debt Prevention:**

- **Systematic Resolution**: Complete standardization preventing framework fragmentation
- **Production Readiness**: Enhanced quality metrics supporting MVP deployment confidence
- **Compound Interest Prevention**: Early resolution preventing technical debt accumulation
- **Quality Assurance**: Systematic improvement maintaining production stability

---

## 4. Quality Assurance Framework

### 4.1. Cross-Platform Development Infrastructure

#### Quality Assurance Framework (Cross-Platform - August 27, 2025)

**Complete NPM Command Suite:**

```bash
# Environment Management
npm install && npm start     # Setup & start
npm stop                     # Stop services
npm run restart:erase        # Reset everything
npm run generate-data:erase  # Generate fake data

# Testing (NPM-based - Shell Scripts Migrated ✅ August 2025)
npm test                     # Node.js tests
npm run test:unit           # Groovy unit tests (repositories and core logic)
npm run test:integration     # Core integration tests for all APIs
npm run test:integration:auth # Integration tests with authentication support
npm run test:integration:core # Comprehensive integration test suite
npm run test:uat            # User acceptance testing validation
npm run test:uat:quick      # Quick UAT validation (essential tests)
npm run test:iterationview  # IterationView UI component tests
npm run test:all            # Complete test suite (unit + integration + UAT)
npm run test:groovy         # Groovy-specific tests (unit + integration)

# Story-Specific Testing
npm run test:us022          # US-022 integration test expansion
npm run test:us028          # US-028 enhanced IterationView tests

# Email Testing Framework (Enhanced - August 27, 2025)
npm run email:test           # Complete email testing framework (database + jest)
npm run email:test:database  # Database-driven email template testing
npm run email:test:jest      # Jest-based email template validation
npm run email:test:comprehensive # Comprehensive Groovy email test suite
npm run email:test:enhanced  # Enhanced email test runner with real templates
npm run email:demo           # Email demonstration system
npm run test:us039           # US-039 email notification testing (alias)
npm run test:us039:comprehensive # US-039 comprehensive testing

# MailHog Integration (SMTP Testing)
npm run mailhog:test        # Test SMTP connectivity to MailHog
npm run mailhog:check       # Check MailHog inbox message count
npm run mailhog:clear       # Clear all messages from MailHog inbox

# Quality Assurance Framework (Cross-Platform - August 27, 2025)
npm run health:check        # System health monitoring (JavaScript)
npm run quality:check       # Master quality assurance framework
npm run quality:api         # API endpoint smoke testing
npm run validate:stepview   # StepView status validation
```

### 4.2. Performance Standards & Metrics

**Performance Benchmarks:**

- **API Response Time**: <500ms for standard operations
- **Database Query Performance**: <100ms for basic queries
- **UI Load Time**: <3s for complete page loading
- **Real-time Update Interval**: 60-second optimal polling
- **Memory Usage**: <512MB for standard operations

**Quality Gates:**

- **Test Coverage**: ≥80% unit test coverage
- **Integration Success Rate**: 100% for critical paths
- **Performance Regression**: 0% tolerance for critical operations
- **Security Validation**: Zero critical vulnerabilities
- **Cross-platform Compatibility**: 100% across Windows/macOS/Linux

### 4.3. Continuous Integration Standards

**CI/CD Pipeline Requirements:**

- **Automated Testing**: All test suites must pass
- **Code Quality Validation**: Static analysis and style checking
- **Security Scanning**: Vulnerability detection and mitigation
- **Performance Testing**: Benchmark validation
- **Documentation Verification**: Completeness and accuracy checks

**Deployment Readiness Criteria:**

- **Test Suite Completion**: 100% pass rate required
- **Performance Standards**: All benchmarks met
- **Security Clearance**: Zero critical issues
- **Documentation Currency**: All changes documented
- **Rollback Readiness**: Recovery procedures validated

---

## 5. Operational Excellence

### 5.1. Infrastructure Components

**Container Stack:**

- **Confluence**: Atlassian Confluence 9.2.7
- **Database**: PostgreSQL 14 with connection pooling
- **SMTP Testing**: MailHog for email validation
- **Orchestration**: Podman Compose with service isolation

**Development Services:**

- **Configuration Management**: Environment-specific settings
- **Data Generation**: Automated test data creation
- **Backup Systems**: Enterprise backup/restore capabilities
- **Monitoring**: Health checks and performance metrics

### 5.2. Development Best Practices

**Code Quality Standards:**

- **Static Type Checking**: Groovy static compilation where applicable
- **Explicit Type Casting**: Mandatory for all ScriptRunner operations
- **Error Handling**: Comprehensive exception management
- **Documentation**: Inline comments and external documentation
- **Version Control**: Conventional commits with clear messages

**Security Standards:**

- **Input Validation**: All user inputs validated
- **SQL Injection Prevention**: Parameterized queries only
- **Authentication**: Confluence-native authentication integration
- **Authorization**: Role-based access control enforcement
- **Audit Logging**: Comprehensive activity tracking

---

## 6. Reference Documentation

### 6.1. Consolidated ADR References

This Development & Operations documentation consolidates the following architectural decisions:

### Development Environment & Operations

- [ADR-006](../adr/archive/ADR-006-Podman-and-Ansible-for-Local-Development-Environment.md) - Podman and Ansible for Local Development Environment
- [ADR-007](../adr/archive/ADR-007-local-dev-setup-plugin-installation.md) - Local Dev Setup Plugin Installation
- [ADR-013](../adr/archive/ADR-013-Data-Utilities-Language-NodeJS.md) - Data Utilities Language: NodeJS
- [ADR-025](../adr/archive/ADR-025-NodeJS-based-Dev-Environment-Orchestration.md) - NodeJS-based Dev Environment Orchestration
- [ADR-028](../adr/archive/ADR-028-data-import-strategy-for-confluence-json.md) - Data Import Strategy for Confluence JSON

### Testing & Quality Assurance

- [ADR-019](../adr/archive/ADR-019-Integration-Testing-Framework.md) - Integration Testing Framework
- [ADR-026](../adr/archive/ADR-026-Specific-Mocks-In-Tests.md) - Specific Mocks in Tests
- [ADR-036](../adr/ADR-036-integration-testing-framework.md) - Integration Testing Framework (US-025)
- [ADR-037](../adr/ADR-037-testing-framework-consolidation-strategy.md) - Testing Framework Consolidation Strategy
- [ADR-038](../adr/ADR-038-documentation-consolidation-methodology.md) - Documentation Consolidation Methodology
- [ADR-040](../adr/ADR-040-database-quality-validation-framework.md) - Database Quality Validation Framework
- [ADR-041](../adr/ADR-041-technical-debt-prioritization-methodology.md) - Technical Debt Prioritization Methodology

---

## Navigation

- **Previous:** [API & Data Architecture](./api-data-architecture.md) - REST API design, database patterns, and data management
- **Next:** [Specialized Features](./specialized-features.md) - Email notifications, authentication, and UI components
- **Related:** [Implementation Patterns](./implementation-patterns.md) - Type safety, filtering, and coding patterns
- **See Also:** [Main Architecture Index](./solution-architecture.md) - Complete architecture navigation

---

_Part of UMIG Solution Architecture Documentation_
