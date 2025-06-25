# Progress

## What Works

- **Data Generation Pipeline**:
  - Fully modular system with single-responsibility generator files.
  - Single canonical plan template with a fixed, predefined structure (PREMIG, CSD, W12, P&C, POSTMIG).
  - Deterministic generation of exactly two instances per iteration (ACTIVE and DRAFT), with dynamic plan descriptions.
  - All legacy data generators and models have been removed.
  - Comprehensive test coverage for all generator components.

- **Data Model Implementation**:
  - Complete separation of canonical (master) and instance (execution) entities.
  - Controls elevated to phase level, with team ownership and direct instruction association.
  - Standardised naming conventions across all tables and columns.
  - Updated foreign key constraints and relationships.
  - Comprehensive documentation with Mermaid ERD.

- **API & Backend Architecture**:
  - V2 REST API fully implemented using the "Pure ScriptRunner Application" pattern.
  - All repository classes refactored to use the new, type-safe `withSql` pattern for database access.
  - Static analysis warnings eliminated via `@ClosureParams` and explicit type casting.
  - OpenAPI specification downgraded to 3.0.0 for compatibility.
  - New `src/README.md` documents backend conventions and database access patterns.
  - All critical runtime database errors resolved.

- **Database Infrastructure**:
  - Consolidated schema migrations into a unified, idempotent baseline.
  - Protected reference tables during database resets.
  - Complete Liquibase integration with established conventions for changesets, tags, and labels.

- **Testing Framework**:
  - Enhanced Jest tests for plan and instance generation, enforcing deterministic business rules.
  - Rigorous validation of business rules and integration tests for data generation.
  - Updated test fixtures matching the current data model.

- **Documentation**:
  - Detailed data model documentation with visual ERD.
  - Updated README files across the project, including backend and data utilities.
  - Comprehensive developer journal entries and ADRs.
  - Documented backend patterns, database conventions, and migration strategies.

- **Development Environment**:
  - Stable local development setup with Podman and Ansible.
  - Improved shell scripts: `restart.sh` (with `--reset` and confirmation), simplified `stop.sh`.
  - Custom Confluence image includes PostgreSQL JDBC driver.
  - ScriptRunner installed manually for improved reliability.
  - Automated database migrations with Liquibase.

## What's Left to Build

- Finalise and push all documentation and code updates to remote repositories (`main` and feature branches).
- Implement backend services for canonical plan management and execution tracking.
- Develop additional API endpoints for user-facing features.
- Create frontend components for plan visualisation and interaction.
- Build notification system for status changes.
- Implement audit logging for state changes.
- Develop automated schema integrity checks.
- Create a dedicated database naming conventions document.
- Continue refining backend and data generation logic based on feedback and testing.

## Current Status

The project has achieved a stable foundation with:
- A fully implemented canonical data model and robust data generation pipeline.
- Production-ready V2 REST API and backend architecture.
- Comprehensive test coverage and documentation.
- Stable, developer-friendly local environment.

The team is now prepared to shift focus to:
- Backend service and API endpoint implementation.
- Frontend development for user interaction and visualisation.
- Execution tracking features and advanced monitoring capabilities.

## Known Issues

- ADR-015 remains in "Draft" status and needs finalisation.
- ScriptRunner database connection and new backend patterns require ongoing monitoring.
- Some manual steps remain for initial environment setup (e.g., ScriptRunner installation).
- Multiple database naming conventions exist across schema and require harmonisation.

## Evolution of Project Decisions

The project has progressed through several key phases:
1. Initial standalone stack to enterprise-compliant Confluence integration.
2. Ad-hoc scripts to automated Liquibase migrations.
3. Basic data generation to a sophisticated, modular pipeline.
4. Monolithic architecture to clean separation of concerns and robust backend patterns.
5. Manual processes to automated, tested workflows.

All technical decisions and lessons are captured in ADRs and memory bank documentation.
