# Active Context

## Current Work Focus

The team is currently focused on:

1. **Finalizing the Node.js Data Utilities**:
   - Ensuring proper NPM package management for the data-utils directory
   - Updating the .gitignore file to account for Node.js artifacts
   - Completing comprehensive test coverage for all generator components
   - Documenting the data generation pipeline and its components

2. **Stabilizing the Backend Architecture**:
   - Implementing the "Pure ScriptRunner Application" pattern
   - Refactoring repository classes to use the type-safe `withSql` pattern
   - Eliminating static analysis warnings via `@ClosureParams` and explicit type casting
   - Documenting backend conventions and database access patterns

3. **Consolidating the Data Model**:
   - Completing the separation of canonical (master) and instance (execution) entities
   - Standardizing naming conventions across all tables and columns
   - Updating foreign key constraints and relationships
   - Documenting the data model with comprehensive ERDs

4. **Improving Development Environment**:
   - Enhancing shell scripts for environment lifecycle management
   - Consolidating schema migrations into a unified, idempotent baseline
   - Protecting reference tables during database resets
   - Ensuring reliable database connectivity for ScriptRunner

5. **Developing UI/UX Components**:
   - Implementing the STEP View component as defined in the UI/UX specification
   - Following the phased UI/UX roadmap with focus on end-user components
   - Deferring admin UI in favour of API/Postman approach for MVP
   - Ensuring accessibility and responsive design
## Recent Changes

### Data Generation Pipeline

- **Modular Generator Structure**: Implemented a fully modular system with single-responsibility generator files.
- **Canonical Plan Template**: Created a single canonical plan template with a fixed, predefined structure (PREMIG, CSD, W12, P&C, POSTMIG).
- **Deterministic Instance Generation**: Implemented deterministic generation of exactly two instances per iteration (ACTIVE and DRAFT), with dynamic plan descriptions.
- **Legacy Removal**: Removed all legacy data generators and models.
- **Test Coverage**: Added comprehensive test coverage for all generator components.
- **NPM Integration**: Added proper package.json and package-lock.json for Node.js utilities.

### Data Model

- **Entity Separation**: Completed separation of canonical (master) and instance (execution) entities.
- **Control Elevation**: Elevated controls to phase level, with team ownership and direct instruction association.
- **Naming Conventions**: Standardized naming conventions across all tables and columns.
- **Relationship Updates**: Updated foreign key constraints and relationships.
- **Documentation**: Created comprehensive documentation with Mermaid ERD.

### Backend Architecture

- **REST API**: Fully implemented V2 REST API using the "Pure ScriptRunner Application" pattern.
- **Repository Refactoring**: Refactored all repository classes to use the new, type-safe `withSql` pattern for database access.
- **Static Analysis**: Eliminated static analysis warnings via `@ClosureParams` and explicit type casting.
- **OpenAPI Specification**: Downgraded to 3.0.0 for compatibility.
- **Documentation**: Created new `src/README.md` to document backend conventions and database access patterns.
- **Error Resolution**: Resolved all critical runtime database errors.

### Database Infrastructure

- **Schema Migrations**: Consolidated schema migrations into a unified, idempotent baseline.
- **Reference Table Protection**: Protected reference tables during database resets.
- **Liquibase Integration**: Completed Liquibase integration with established conventions for changesets, tags, and labels.

### UI/UX Documentation

- **UI/UX Roadmap**: Created a comprehensive roadmap outlining the phased approach to UI/UX development.
- **STEP View Specification**: Developed detailed specifications for the STEP View component, including data requirements, UI layout, and interaction patterns.
- **Strategic Approach**: Established a strategic decision to prioritise end-user UI components for MVP while deferring admin interfaces to API/Postman workflows.
- **Documentation Structure**: Created a dedicated `/docs/ui-ux/` directory with standardised templates for UI/UX specifications.

## Next Steps

1. **Update .gitignore File**:
   - Add Node.js specific patterns for the data-utils directory
   - Ensure proper exclusion of node_modules, coverage, and other NPM artifacts

2. **Complete Documentation Updates**:
   - Finalize ADR-015 (Canonical Implementation Plan Model)
   - Create a dedicated database naming conventions document
   - Update all README files to reflect recent changes

3. **Implement Backend Services**:
   - Develop services for canonical plan management
   - Create services for execution tracking
   - Implement notification system for status changes

4. **Implement STEP View Component**:
   - Develop the UI according to the step-view.md specification
   - Implement interactive status updates and instruction completion
   - Create comment functionality with rich text support
   - Ensure proper integration with backend API endpoints

5. **Develop Frontend Components**:
   - Create plan visualisation components
   - Implement interactive status updates
   - Design user-friendly navigation

## Active Decisions and Considerations

1. **NPM Package Management**:
   - Decision to use NPM for managing Node.js utilities
   - Consideration of whether to publish packages to a private registry
   - Evaluation of whether to split utilities into separate packages

2. **Database Naming Conventions**:
   - Decision to standardize on snake_case for all database objects
   - Consideration of whether to use prefixes for different types of objects
   - Evaluation of whether to enforce naming conventions via Liquibase

3. **Backend Architecture**:
   - Decision to use the "Pure ScriptRunner Application" pattern
   - Consideration of whether to introduce a formal service layer
   - Evaluation of whether to implement a more robust dependency injection mechanism

4. **Testing Strategy**:
   - Decision to use Jest for Node.js utilities
   - Consideration of whether to introduce integration tests for the backend
   - Evaluation of whether to implement end-to-end tests for the frontend

## Important Patterns and Preferences

1. **Code Organization**:
   - Backend code in `src/com/umig/{api,repository,utils}`
   - Frontend assets in `src/web/{css,js}`
   - Confluence macros in `src/macros`
   - Node.js utilities in `local-dev-setup/data-utils`

2. **Database Access**:
   - Use ScriptRunner's Database Resource Pool feature
   - Use the type-safe `withSql` pattern
   - Standardize on `umig_db_pool` as the resource pool name

3. **Data Generation**:
   - Use modular, single-responsibility generator files
   - Protect reference tables during database resets
   - Use deterministic generation for predictable test results

4. **Documentation**:
   - Use Mermaid for diagrams
   - Document all major technical decisions in ADRs
   - Keep memory bank up to date with latest developments

## Learnings and Project Insights

1. **ScriptRunner Integration**:
   - ScriptRunner provides a powerful platform for Confluence integration
   - Database connectivity requires careful configuration
   - REST endpoint auto-discovery simplifies API development

2. **Data Model Evolution**:
   - Separation of canonical and instance entities provides flexibility
   - Standardized naming conventions improve maintainability
   - Reference tables should be protected during database resets

3. **Node.js Utilities**:
   - Node.js provides a flexible platform for development utilities
   - Jest provides a robust testing framework
   - NPM package management simplifies dependency management

4. **Development Environment**:
   - Podman and Ansible provide a reliable containerization solution
   - Liquibase simplifies database schema management
   - Shell scripts streamline environment lifecycle management
