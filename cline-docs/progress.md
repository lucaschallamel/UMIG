# Progress

## What Works

### Infrastructure and Environment

- ✅ **Local Development Environment**: Fully functional containerized environment with Podman and Podman Compose.
- ✅ **Database Setup**: PostgreSQL database with proper schema and migrations managed by Liquibase.
- ✅ **Confluence Integration**: ScriptRunner successfully integrated with Confluence for backend logic.
- ✅ **Environment Management**: Shell scripts for starting, stopping, and resetting the environment.
- ✅ **Database Connectivity**: ScriptRunner Database Resource Pool configured and working.

### Data Model and Generation

- ✅ **Core Data Model**: Complete database schema with tables for all entities.
- ✅ **Canonical Plan Model**: Implemented separation between canonical (master) and instance (execution) entities.
- ✅ **Data Generation Pipeline**: Fully modular system with single-responsibility generator files.
- ✅ **Test Data**: Comprehensive synthetic data generation for development and testing.
- ✅ **CSV Import**: Flexible CSV import utility with field mapping.
- ✅ **Test Coverage**: Comprehensive test coverage for all generator components.
- ✅ **NPM Integration**: Proper package.json and package-lock.json for Node.js utilities.

### Backend Implementation

- ✅ **REST API**: V2 REST API implemented using the "Pure ScriptRunner Application" pattern.
- ✅ **Repository Layer**: Repository classes implemented with type-safe database access.
- ✅ **Database Access**: Type-safe `withSql` pattern implemented for all database access.
- ✅ **API Documentation**: OpenAPI specification for the REST API.
- ✅ **Error Handling**: Basic error handling for database and API operations.
- ✅ **Integration Testing**: Formal integration testing framework with live database validation.

### Frontend Implementation

- ✅ **Basic Macro**: Initial implementation of the Confluence macro for rendering implementation plans.
- ✅ **CSS Styling**: Basic CSS styling for the macro.
- ✅ **JavaScript Logic**: Initial JavaScript logic for the macro.
- ✅ **UI/UX Documentation**: Comprehensive UI/UX roadmap and detailed STEP View specification.
- ✅ **UI/UX Strategy**: Clear phased approach with prioritisation of end-user components.
- ✅ **UI Framework Pattern**: Established lean architectural pattern for UI components with ScriptRunner macros loading JavaScript assets.
- ✅ **User View Components**: Implemented user view and user list components as proof of concept.
- ✅ **STEP View Backend**: Implemented backend API and repository layer for the STEP View component.

## What's Left to Build

### Backend Implementation

- 🔲 **Service Layer**: Implement a formal service layer for business logic.
- 🔲 **Notification System**: Implement a notification system for status changes.
- 🔲 **Authentication and Authorization**: Implement proper authentication and authorization.
- 🔲 **Validation**: Implement comprehensive validation for all API endpoints.
- 🔲 **Error Handling**: Enhance error handling with proper error codes and messages.
- 🔲 **Logging**: Implement comprehensive logging for all operations.
- 🔲 **Caching**: Implement caching for frequently accessed data.

### Frontend Implementation

- 🔲 **Enhanced Macro**: Enhance the Confluence macro with more features.
- 🔲 **Interactive UI**: Implement interactive UI for plan management.
- 🔲 **Status Updates**: Implement interactive status updates.
- 🔲 **User-Friendly Navigation**: Implement user-friendly navigation.
- 🔲 **Responsive Design**: Ensure responsive design for all screen sizes.
- 🔲 **Accessibility**: Ensure accessibility compliance.
- 🔲 **Localization**: Implement localization support.

### Testing and Quality Assurance

- ✅ **Integration Tests**: Implemented integration testing framework for backend API endpoints.
- ✅ **Test Execution**: Created standardised shell script for running integration tests.
- ✅ **Secure Credentials**: Implemented secure credential management for tests via environment variables.
- 🔲 **End-to-End Tests**: Implement end-to-end tests for the frontend.
- 🔲 **Performance Testing**: Implement performance testing.
- 🔲 **Security Testing**: Implement security testing.
- 🔲 **Load Testing**: Implement load testing.

### Documentation

- 🔲 **User Documentation**: Create comprehensive user documentation.
- 🔲 **API Documentation**: Enhance API documentation with examples and use cases.
- 🔲 **Developer Documentation**: Create comprehensive developer documentation.
- 🔲 **Deployment Documentation**: Create comprehensive deployment documentation.

## Current Status

The project is in the **Development** phase, with a focus on:

1. **Finalising the Node.js Data Utilities**:
   - ✅ Modular generator structure
   - ✅ Canonical plan template
   - ✅ Deterministic instance generation
   - ✅ Legacy removal
   - ✅ Test coverage
   - ✅ NPM integration
   - ✅ Update .gitignore file

2. **Stabilising the Backend Architecture**:
   - ✅ REST API implementation
   - ✅ Repository layer implementation
   - ✅ Database access pattern
   - ✅ API documentation
   - 🔲 Service layer implementation
   - 🔲 Notification system
   - 🔲 Authentication and authorisation

3. **Consolidating the Data Model**:
   - ✅ Entity separation
   - ✅ Control elevation
   - ✅ Naming conventions
   - ✅ Relationship updates
   - ✅ Documentation
   - 🔲 Validation rules
   - 🔲 Indexing strategy

4. **Improving Development Environment**:
   - ✅ Shell scripts
   - ✅ Schema migrations
   - ✅ Reference table protection
   - ✅ Database connectivity
   - 🔲 CI/CD pipeline
   - 🔲 Automated testing
   - 🔲 Deployment automation

5. **Developing UI/UX Components**:
   - ✅ UI/UX roadmap
   - ✅ STEP View specification
   - ✅ UI framework pattern
   - ✅ User view components
   - ✅ STEP View backend API
   - 🔲 STEP View frontend completion
   - 🔲 Dashboard implementation
   - 🔲 Team Management implementation

6. **Establishing Testing Framework**:
   - ✅ Integration testing structure
   - ✅ Database integration tests
   - ✅ Secure credential management
   - ✅ Standardised test execution
   - 🔲 Expanded test coverage
   - 🔲 Test fixtures
   - 🔲 Coverage reporting

## Known Issues

1. **Database Connectivity**:
   - ScriptRunner Database Resource Pool requires manual configuration.
   - Connection pooling parameters need tuning for production.

2. **Data Generation**:
   - Large data sets can cause performance issues.
   - Some edge cases in data generation are not fully tested.

3. **Frontend Integration**:
   - Confluence macro rendering can be slow with large plans.
   - JavaScript performance needs optimization.
   - STEP View frontend implementation is incomplete.

4. **Development Environment**:
   - Podman volume management can be fragile during environment restarts.
   - Liquibase migrations can be slow with large changesets.

5. **Schema Drift**:
   - Risk of misalignment between repository queries and actual database schema.
   - Integration tests help mitigate but require vigilance.

## Evolution of Project Decisions

### Data Model

- **Initial Decision**: Use a flat data model with all entities in a single table.
- **Evolution**: Moved to a hierarchical data model with separate tables for each entity type.
- **Current Approach**: Implemented separation between canonical (master) and instance (execution) entities.

### Backend Architecture

- **Initial Decision**: Use a monolithic Confluence plugin.
- **Evolution**: Moved to a hybrid approach with ScriptRunner and a custom plugin.
- **Current Approach**: Implemented the "Pure ScriptRunner Application" pattern.

### Frontend Implementation

- **Initial Decision**: Use a custom Confluence macro with jQuery.
- **Evolution**: Considered using a modern JavaScript framework.
- **Current Approach**: Settled on vanilla JavaScript for compatibility and simplicity, with a pattern of ScriptRunner macros loading JavaScript assets.

### Testing Strategy

- **Initial Decision**: Rely primarily on unit tests with mocked dependencies.
- **Evolution**: Discovered critical integration issues that unit tests couldn't catch.
- **Current Approach**: Established a formal integration testing framework to validate against the live database.

### Development Environment

- **Initial Decision**: Use Docker for containerization.
- **Evolution**: Evaluated Kubernetes for orchestration.
- **Current Approach**: Settled on Podman and Ansible for simplicity and compatibility.
