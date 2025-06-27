# Progress

## What Works

### Infrastructure and Environment

- ✅ **Local Development Environment**: Fully functional containerised environment with Podman and Podman Compose.
- ✅ **Database Setup**: PostgreSQL database with schema and migrations managed by Liquibase.
- ✅ **Confluence Integration**: ScriptRunner successfully integrated with Confluence for backend logic.
- ✅ **Environment Management**: Shell scripts for starting, stopping, and resetting the environment.
- ✅ **Database Connectivity**: ScriptRunner Database Resource Pool configured and working.

### Data Model and Generation

- ✅ **Core Data Model**: Complete schema with canonical (master) and instance (execution) entities.
- ✅ **Data Generation Pipeline**: Modular, single-responsibility generator files for synthetic data.
- ✅ **Test Data**: Comprehensive synthetic data generation for development and testing.
- ✅ **CSV Import**: Flexible CSV import utility with field mapping.
- ✅ **Test Coverage**: Comprehensive test coverage for all generator components.
- ✅ **NPM Integration**: Proper package.json and package-lock.json for Node.js utilities.

### Backend Implementation

- ✅ **REST API**: V2 REST API implemented using the "Pure ScriptRunner Application" pattern.
- ✅ **Repository Layer**: Repository classes implemented with type-safe database access.
- ✅ **Database Access**: Type-safe `withSql` pattern for all database access.
- ✅ **API Documentation**: OpenAPI specification for the REST API.
- ✅ **Error Handling**: Basic error handling for database and API operations.
- ✅ **Integration Testing**: Formal integration testing framework with live database validation.
- ✅ **SPA + REST Pattern**: SPA + REST pattern (ADR020) adopted as standard for all admin UIs, with user management SPA as reference implementation.

### Frontend Implementation

- ✅ **Macro Pattern**: Minimal Confluence macros loading dedicated JS assets for UI components.
- ✅ **UI/UX Documentation**: Comprehensive UI/UX roadmap and detailed STEP View specification.
- ✅ **UI Framework Pattern**: Lean architectural pattern for UI components.
- ✅ **User View Components**: Implemented user view and user list components as proof of concept.
- ✅ **STEP View Macro & SPA MVP**: STEP View macro and SPA for rendering migration/release steps in Confluence completed and validated (27 June 2025). This serves as a reference implementation for future migration-related UIs.
- ✅ **Dynamic Forms**: Admin SPAs now render forms dynamically from entity fields, with robust type handling.

## What's Left to Build

### Backend Implementation

- 🔲 **Service Layer**: Implement a formal service layer for business logic.
- 🔲 **Notification System**: Implement a notification system for status changes.
- 🔲 **Authentication and Authorisation**: Implement proper authentication and authorisation.
- 🔲 **Validation**: Implement comprehensive validation for all API endpoints.
- 🔲 **Error Handling**: Enhance error handling with proper error codes and messages.
- 🔲 **Logging**: Implement comprehensive logging for all operations.
- 🔲 **Caching**: Implement caching for frequently accessed data.

### Frontend Implementation

- 🔲 **Broaden SPA + REST Pattern**: Scaffold admin UIs for all entities (teams, plans, etc.) using the SPA + REST pattern.
- 🔲 **Dashboard Implementation**: Implement dashboard view as per UI/UX roadmap.
- 🔲 **Team Management Implementation**: Implement team management SPA.
- 🔲 **User-Friendly Navigation**: Implement user-friendly navigation.
- 🔲 **Responsive Design**: Ensure responsive design for all screen sizes.
- 🔲 **Accessibility**: Ensure accessibility compliance.
- 🔲 **Localisation**: Implement localisation support.

### Testing and Quality Assurance

- ✅ **Integration Tests**: Integration testing framework for backend API endpoints.
- ✅ **Test Execution**: Standardised shell script for running integration tests.
- ✅ **Secure Credentials**: Secure credential management for tests via environment variables.
- 🔲 **Expanded Test Coverage**: Add integration tests for all endpoints and entities.
- 🔲 **Test Fixtures**: Implement test fixtures for consistent test data.
- 🔲 **Coverage Reporting**: Add test coverage reporting.
- 🔲 **End-to-End Tests**: Implement end-to-end tests for the frontend.
- 🔲 **Performance Testing**: Implement performance testing.
- 🔲 **Security Testing**: Implement security testing.
- 🔲 **Load Testing**: Implement load testing.

### Documentation

- ✅ **Pattern Documentation**: All major patterns and conventions documented in ADRs and README.md files.
- 🔲 **User Documentation**: Create comprehensive user documentation.
- 🔲 **API Documentation**: Enhance API documentation with examples and use cases.
- 🔲 **Developer Documentation**: Create comprehensive developer documentation.
- 🔲 **Deployment Documentation**: Create comprehensive deployment documentation.

## Current Status

The project is in the **Development** phase, with a focus on:

1. **Adopting and Enforcing SPA + REST Pattern**:
   - ✅ SPA + REST pattern formalised (ADR020)
   - ✅ User admin SPA implemented as reference
   - 🔲 Broaden adoption to all admin UIs

2. **Expanding Integration Testing**:
   - ✅ Integration testing framework established
   - 🔲 Expand test coverage to all endpoints and entities

3. **Broaden SPA + REST Pattern Adoption**:
   - 🔲 Scaffold admin UIs for all entities using the SPA + REST pattern, using STEP View and user admin SPAs as templates

4. **Ongoing Documentation and Pattern Enforcement**:
   - ✅ All relevant documentation updated
   - 🔲 Continue to update as new patterns emerge

## Known Issues

1. **Database Connectivity**:
   - ScriptRunner Database Resource Pool requires manual configuration.
   - Connection pooling parameters need tuning for production.

2. **Data Generation**:
   - Large data sets can cause performance issues.
   - Some edge cases in data generation are not fully tested.

3. **Frontend Integration**:
   - Confluence macro rendering can be slow with large plans.
   - JavaScript performance needs optimisation.
   - STEP View frontend implementation is incomplete.

4. **Development Environment**:
   - Podman volume management can be fragile during environment restarts.
   - Liquibase migrations can be slow with large changesets.

5. **Schema Drift**:
   - Risk of misalignment between repository queries and actual database schema.
   - Integration tests now mitigate this risk, but require ongoing vigilance.

## Evolution of Project Decisions

### Data Model

- **Initial Decision**: Use a flat data model with all entities in a single table.
- **Evolution**: Moved to a hierarchical data model with separate tables for each entity type.
- **Current Approach**: Implemented separation between canonical (master) and instance (execution) entities.

### Backend Architecture

- **Initial Decision**: Use a monolithic Confluence plugin.
- **Evolution**: Moved to a hybrid approach with ScriptRunner and a custom plugin.
- **Current Approach**: "Pure ScriptRunner Application" pattern, with SPA + REST pattern for admin UIs.

### Frontend Implementation

- **Initial Decision**: Use a custom Confluence macro with jQuery.
- **Evolution**: Considered using a modern JavaScript framework.
- **Current Approach**: Vanilla JavaScript SPA pattern, with macros loading JS assets and dynamic form rendering.

### Testing Strategy

- **Initial Decision**: Rely primarily on unit tests with mocked dependencies.
- **Evolution**: Discovered critical integration issues that unit tests could not catch.
- **Current Approach**: Formal integration testing framework, validating against the live database.

### Development Environment

- **Initial Decision**: Use Docker for containerisation.
- **Evolution**: Evaluated Kubernetes for orchestration.
- **Current Approach**: Podman and Ansible for simplicity and compatibility.
