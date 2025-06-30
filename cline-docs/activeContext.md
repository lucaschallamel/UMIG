# Active Context

## Architectural Milestone: SPA + REST Pattern and Integration Testing

The project has reached a significant milestone with the formal adoption of a dynamic SPA (Single Page Application) + REST pattern for all administrative entity management interfaces, as codified in ADR020. This pattern mandates the use of ScriptRunner REST endpoints for backend CRUD operations and dedicated JavaScript SPAs for frontend rendering, with robust type handling and dynamic form generation. The pattern is now enforced across all new admin UIs, ensuring maintainability, scalability, and a consistent user experience.

A critical integration crisis during STEP View development led to the establishment of a comprehensive integration testing framework. This framework validates backend and database integration against the live environment, preventing "schema drift" and ensuring reliability. All relevant documentation, coding guidelines, and architectural records have been updated to reflect these standards.

## Current Work Focus

1. **Applying SPA + REST Pattern to Admin UIs**:
   - Refactoring and developing all admin interfaces (user, team, plan, etc.) to use the SPA + REST pattern.
   - Ensuring robust type handling and dynamic form rendering in all frontend SPAs.
   - Enforcing repository pattern and defensive type handling in all backend endpoints.

2. **Expanding Integration Test Coverage**:
   - Adding integration tests for all critical API endpoints.
   - Ensuring tests validate against the live database and use secure credential management.
   - Standardising test execution and reporting.

3. **Completing STEP View Frontend**:
   - Finalising the client-side JavaScript for the STEP View, including interactive status updates and instruction completion.
   - Implementing comment functionality and comprehensive error handling.

4. **Ongoing Documentation and Pattern Enforcement**:
   - Keeping all README.md files, ADRs, and coding guidelines up to date with the latest patterns and conventions.
   - Promoting team adoption of the new standards.

## Recent Changes

- **Confluence HTML Importer Utility Initiated**: A new cross-platform utility for importing and extracting structured data from Confluence-exported HTML files has been added (`local-dev-setup/data-utils/Confluence_Importer`). The tool is a work in progress, with documentation updated in the root and utility-specific READMEs. No core application logic was changed during this session.
- **STEP View Macro & SPA MVP Delivered**: The STEP View macro and SPA for rendering migration/release steps in Confluence have been completed and validated as of 27 June 2025. This implementation harmonises frontend and backend payloads, provides robust error handling, and serves as a reference for future migration-related UIs.
- **SPA + REST Pattern Formalised**: ADR020 (noted as ARD020) created, establishing the SPA + REST pattern as the standard for all admin UIs.
- **User Admin SPA Implemented**: Dynamic user management SPA (`user-list.js`, `UserApi.groovy`) now serves as a reference implementation.
- **Type Handling and Dynamic Forms**: Frontend forms now detect and handle booleans, numbers, and emails correctly, with payloads constructed for backend compatibility.
- **Integration Testing Framework Established**: `/tests` directory and `run-integration-tests.sh` created; integration tests now validate against the live database.
- **Repository and API Refactoring**: All backend endpoints and repositories updated for type safety and defensive coding.
- **Comprehensive Documentation**: All relevant documentation updated, including main and component-specific README.md files, ADRs, and the CHANGELOG.

## Next Steps

1. **Immediate Actions**:
   - Push the STEP View feature branch and prepare a pull request for review.
   - Begin applying the SPA + REST pattern to other migration entities (e.g., teams, plans), using the STEP View and user admin SPAs as templates.
   - Gather feedback from stakeholders and end-users to guide further improvements.

2. **Broaden SPA + REST Pattern Adoption**:
   - Scaffold new admin UIs for all entities using the documented approach.

3. **Enhance Integration Testing**:
   - Expand test coverage to all endpoints and entities.
   - Monitor and refine the framework as new features are added.

4. **Promote Team Adoption**:
   - Reference ADR020 and updated documentation in all onboarding and code review processes.
   - Encourage feedback and further refinements as the pattern is exercised.

## Active Decisions and Considerations

- **SPA + REST Pattern**: All admin UIs must follow the SPA + REST pattern as formalised in ADR020.
- **Type Safety**: Strict type handling is enforced on both frontend and backend.
- **Repository Pattern**: All database access must use the repository pattern.
- **Integration Testing**: Integration tests are mandatory for all critical backend features.
- **Documentation**: All patterns and conventions must be documented and kept current.

## Important Patterns and Preferences

- **Frontend**: One JS SPA per entity, dynamic rendering, AUI styling, robust error handling.
- **Backend**: ScriptRunner REST endpoints, repository pattern, defensive coding, JSON responses.
- **Testing**: Distinct unit and integration tests, secure credential management, standardised execution.
- **Documentation**: ADRs for all major decisions, up-to-date README.md files, clear coding guidelines.

## Learnings and Project Insights

- Integration tests are essential to prevent schema drift and ensure reliability.
- Dynamic SPA + REST pattern greatly improves maintainability and scalability of admin UIs.
- Comprehensive documentation and pattern enforcement are key to team alignment and project quality.
