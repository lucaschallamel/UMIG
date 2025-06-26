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

6. **Establishing Integration Testing Framework**:
   - Creating a formal integration testing structure separate from unit tests
   - Implementing tests that validate against the live database
   - Securing database credentials by loading from environment variables
   - Standardising test execution with shell scripts
   - Documenting the testing approach in ADRs and README files
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

### STEP View Implementation

- **UI Framework Pattern**: Established a lean architectural pattern for UI components with ScriptRunner macros loading JavaScript assets.
- **Backend API**: Implemented `stepViewApi.groovy` to fetch and process step data from the database.
- **Frontend Controller**: Created `step-view.js` to handle the client-side rendering and interaction.
- **Repository Layer**: Developed and fixed `StepRepository`, `InstructionRepository`, and `StepTypeRepository` to correctly query the database.
- **Schema Alignment**: Corrected mismatches between repository queries and actual database schema.

### Integration Testing Framework

- **Testing Structure**: Created a new `/tests` directory with a dedicated `/tests/integration` subdirectory.
- **Database Integration**: Implemented tests that connect to the live database to validate API functionality.
- **Secure Credentials**: Added support for loading database credentials from `.env` file rather than hardcoding them.
- **Standardised Execution**: Created `run-integration-tests.sh` to simplify test execution and manage the classpath.
- **Documentation**: Documented the integration testing approach in `ADR-019` and `tests/README.md`.

## Next Steps

1. **Complete STEP View Frontend**:
   - Finish the client-side JavaScript implementation for the STEP View
   - Add interactive status updates and instruction completion functionality
   - Implement comment functionality with rich text support
   - Ensure proper error handling and loading states

2. **Expand Integration Test Coverage**:
   - Add integration tests for other critical API endpoints
   - Implement test fixtures for consistent test data
   - Add test coverage reporting

3. **Implement Backend Services**:
   - Develop services for canonical plan management
   - Create services for execution tracking
   - Implement notification system for status changes

4. **Develop Additional UI Components**:
   - Create dashboard view according to the UI/UX roadmap
   - Implement team management interface
   - Design user-friendly navigation between components

5. **Enhance Error Handling**:
   - Implement comprehensive error handling across all API endpoints
   - Add detailed logging for troubleshooting
   - Create user-friendly error messages

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
   - Integration tests in `tests/integration`

2. **Database Access**:
   - Use ScriptRunner's Database Resource Pool feature
   - Use the type-safe `withSql` pattern
   - Standardize on `umig_db_pool` as the resource pool name

3. **UI Component Pattern**:
   - ScriptRunner macro loads JavaScript asset
   - JavaScript handles UI rendering and API calls
   - Backend API endpoint processes requests and returns JSON
   - Repository layer abstracts database access

4. **Testing Strategy**:
   - Unit tests for isolated component testing
   - Integration tests for validating against live database
   - Secure credential management via environment variables
   - Standardised test execution via shell scripts

5. **Data Generation**:
   - Use modular, single-responsibility generator files
   - Protect reference tables during database resets
   - Use deterministic generation for predictable test results

6. **Documentation**:
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

5. **Integration Testing Importance**:
   - Unit tests with mocks can hide integration issues
   - "Schema drift" between code and database is a critical risk
   - Integration tests against live database are essential for reliability
   - Secure credential management is crucial for test automation
