Title: Rule 03 - Project Structure & Organisation  
Scope: **WHERE** things belong - Physical project layout, file organization, and structural standards. Applies to all software project creation and organization activities.

# Rule 03 - Project Structure & Organisation

This rule establishes the mandatory file and folder structure standards for all software projects. Consistent adherence to this organizational framework ensures project maintainability, supports automated tooling integration, and facilitates seamless team collaboration across all development lifecycle activities.

## Mandatory Root Level Structure

**Essential Project Foundation Files**:

- `.gitignore` - Comprehensive exclusion configuration for Claude Code in VS Code with JavaScript, Python, SQL, NPM patterns
- `.gitattributes` - Git attributes configuration for line endings, merge strategies, and file handling
- `README.md` - Primary project documentation with setup, usage, and contribution instructions
- `LICENSE.md` - Project licensing terms and conditions (use appropriate template for project type)
- `CODE_OF_CONDUCT.md` - Community standards and behavioral expectations (template-based)
- `CONTRIBUTING.md` - Detailed contribution guidelines and development workflow documentation
- `CHANGELOG.md` - Version tracking and release documentation following semantic versioning standards

**Cross-Reference**: Integration with Rule 01 documentation standards and Rule 02 version control practices

## Comprehensive Documentation Architecture (`/docs/`)

**Knowledge Management & Institutional Memory**:

- `docs/memory-bank/` - Persistent memory bank implementation according to Rule 07 Memory Bank specifications
- `docs/adr/` - Architectural Decision Records with standardized template for all major technical decisions
- `docs/devJournal/` - Development journals following `YYYYMMDD-nn.md` naming convention for session tracking

**Strategic Planning & Requirements Management**:

- `docs/roadmap/` - High-level project roadmap with feature descriptions and strategic objectives
- `docs/roadmap/sprint/` - Sprint-specific planning including user stories, technical requirements, functional specifications, non-functional requirements, and UX-UI guidelines

**Technical Documentation & Operational Guides**:

- `docs/api/` - Comprehensive API documentation, specifications, and integration guides
- `docs/deployment/` - Complete deployment procedures, runbooks, and operational guides
- `docs/troubleshooting/` - Common issues database, solutions, and diagnostic procedures

**Cross-Reference**: Aligns with Rule 01 documentation discipline and Rule 06 business documentation requirements

## Comprehensive Source Code Architecture (`/src/`)

**Primary Application Components**:

- `src/app/` - Frontend components, user interface elements, and client-side application logic
- `src/api/` - Backend services, API endpoints, and server-side business logic
- `src/utils/` - Shared utility functions, common code libraries, and cross-cutting concerns
- `src/generated/` - Auto-generated code including API clients, type definitions, and framework artifacts

**Complete Testing Infrastructure**:

- `src/tests/` - Comprehensive test suites and testing utility infrastructure
- `src/tests/unit/` - Component and module-level unit tests organized by functionality
- `src/tests/integration/` - Integration test suites for API endpoints and service interactions
- `src/tests/e2e/` - End-to-end test scenarios covering complete user workflows
- `src/tests/postman/` - Postman collections for API testing and validation
- `src/tests/fixtures/` - Test data, mock objects, and synthetic data for testing scenarios

**Configuration & Static Resources**:

- `src/config/` - Application configuration files, environment-specific settings, and feature flags
- `src/assets/` - Static assets including images, fonts, icons, and multimedia resources
- `src/styles/` - Stylesheets, design system files, CSS modules, and theming configurations

**Cross-Reference**: Supports Rule 02 testing requirements and Rule 04 Twelve-Factor App configuration principles

## Database Infrastructure & Management (`/db/`)

**Schema & Migration Management**:

- `db/liquibase/` - Database migration scripts and changelogs for version-controlled schema evolution
- `db/migrations/` - Raw migration files organized chronologically for database structure changes
- `db/seeds/` - Initial data scripts, reference data, and development environment setup data
- `db/backups/` - Database backup scripts, restoration procedures, and backup configuration management

**Database Documentation & Objects**:

- `db/schemas/` - Entity Relationship Diagrams (ERDs), schema documentation, and data modeling artifacts
- `db/procedures/` - Stored procedures, database functions, and complex query implementations
- `db/views/` - Database views, materialized views, and reporting query abstractions

**Mandatory Database Naming Standards**:

- **Consistency Requirement**: Implement clear, consistent, project-wide naming conventions across all database objects
- **Case Convention**: Use `snake_case` exclusively for all identifiers (tables, columns, constraints, indexes)
- **Prefix/Suffix Standards**: Document and enforce prefix/suffix conventions (e.g., `tbl_` for tables, `_fk` for foreign keys, `idx_` for indexes)
- **Reserved Word Avoidance**: Prohibit use of database reserved words and ambiguous abbreviations in all naming
- **Enforcement Mechanism**: Integrate naming convention validation into code review processes and automated linting systems

**Cross-Reference**: Supports Rule 02 data management standards and Rule 01 quality automation requirements

## Local Development Environment (`/local-dev-setup/`)

**Containerized Environment Configuration**:

- `local-dev-setup/docker/` - Docker configurations, compose files, and container orchestration
- `local-dev-setup/ansible/` - Ansible playbooks for automated environment provisioning and configuration
- `local-dev-setup/scripts/` - Wrapper scripts for environment lifecycle (start, stop, reset, health checks)
- `local-dev-setup/config/` - Local development configuration templates and environment-specific settings

**Development Tooling & Resources**:

- `local-dev-setup/tools/` - Development utility scripts, helpers, and automation tools
- `local-dev-setup/data/` - Sample data sets, development fixtures, and test data generators
- `local-dev-setup/ssl/` - SSL certificates, private keys, and HTTPS development configuration

**Cross-Reference**: Aligns with Rule 00 containerization strategy and Rule 04 environment configuration principles

## Build & Deployment Infrastructure

**Build System Architecture**:

- `build/` - Build artifacts, compiled outputs, and distribution packages
- `build/scripts/` - Build automation scripts and custom build tools
- `build/configs/` - Environment-specific build configurations and optimization settings

**Deployment & Infrastructure Management**:

- `deploy/` - Deployment configurations, scripts, and automation tools
- `deploy/k8s/` - Kubernetes manifests, configurations, and orchestration files
- `deploy/terraform/` - Infrastructure as Code definitions and provisioning scripts
- `deploy/ansible/` - Deployment automation playbooks and configuration management

**Continuous Integration & Deployment**:

- `.github/` - GitHub Actions workflows, templates, and automation configurations
- `.gitlab-ci.yml` - GitLab CI configuration and pipeline definitions (when applicable)
- `jenkins/` - Jenkins pipeline definitions and job configurations (when applicable)

## Environment & Configuration Management

**Multi-Environment Configuration**:

- `environments/` - Environment-specific configurations and settings management
- `environments/dev/` - Development environment settings and local development overrides
- `environments/test/` - Testing environment configurations and validation settings
- `environments/prod/` - Production environment settings and security configurations

**Security & Secrets Management**:

- `secrets/` - Encrypted secrets and secure configurations (git-ignored with `.gitkeep`)
- `.env.example` - Environment variable template with documentation and examples
- `.env.local.example` - Local development environment template and configuration guide

## Quality Assurance & Monitoring Infrastructure

**Code Quality & Standards**:

- `quality/` - Quality assurance configurations, reports, and standards enforcement
- `quality/linting/` - Linter configurations, custom rules, and code style enforcement
- `quality/security/` - Security scanning configurations, vulnerability assessments, and audit tools
- `quality/coverage/` - Code coverage reports, configurations, and quality metrics

**Performance & Operational Monitoring**:

- `monitoring/` - Application monitoring configurations, observability tools, and alerting systems
- `performance/` - Performance testing scripts, benchmarks, and optimization tools
- `logs/` - Log file storage, rotation configurations, and analysis tools (git-ignored with `.gitkeep`)

## Operations & Maintenance Framework

**Operational Automation**:

- `scripts/` - Operational scripts, maintenance automation, and utility tools
- `scripts/backup/` - Backup automation scripts, restoration procedures, and data management
- `scripts/monitoring/` - Health check scripts, monitoring automation, and system validation
- `scripts/cleanup/` - Cleanup routines, maintenance tasks, and system optimization

**Templates & Standards**:

- `templates/` - Project templates, boilerplates, and standardized structures
- `templates/adr/` - Architectural Decision Record templates and documentation standards
- `templates/sprint/` - Sprint planning templates, review formats, and project management tools
- `templates/journal/` - Development journal templates and session documentation formats

## Version Control Integration & Standards

**Git Repository Management**:

- **Structure Preservation**: All folder structures must be represented and maintained in version control
- **Empty Directory Management**: Use `.gitkeep` files to maintain empty directory structure integrity
- **Exclusion Management**: Ensure `.gitignore` properly excludes build artifacts, logs, secrets, and temporary files
- **Content Separation**: Maintain clear separation between versioned source content and generated/compiled artifacts

**Cross-Reference**: Supports Rule 01 change management, Rule 02 version control standards, and integration with all other rules
