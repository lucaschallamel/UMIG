# Technical Context

## Technologies Used

- **Backend:** Groovy (ScriptRunner) for REST API endpoints and business logic.
- **API Specification:** OpenAPI (`docs/api/openapi.yaml`) as the definitive contract for all endpoints.
- **Database:** PostgreSQL, with schema migrations managed via Liquibase.
- **Testing:** Automated tests (Jest for data utilities, Postman for API), with collections regenerated from the OpenAPI spec. Integration tests run against a live database (ADR-019).
- **Containerisation:** Podman for local development and deployment.
- **Local Development Orchestration:** Node.js and the `umig-local` CLI for managing the local development environment scripts (ADR-025).

## Development Setup

- All API changes must begin with updates to the OpenAPI specification, ensuring the implementation and documentation remain synchronised.
- The backend is implemented in Groovy scripts, following formalised patterns for routing, idempotency, and error handling (ADR-023).
- Postman collections are regenerated after OpenAPI changes to keep automated tests aligned with the current API contract.
- The local development environment is now orchestrated via the `umig-local` CLI, providing a streamlined and consistent setup (ADR-025).
- All data generator scripts and their tests adhere to a consistent 3-digit numeric prefix naming convention for robust ordering and traceability.
- ScriptRunner is installed manually via the Confluence UI (ADR-007) and uses its built-in database connection pooling (ADR-010).

## Technical Constraints and Conventions

- **Error Handling:** All database and application errors are mapped to precise HTTP status codes, as per the new standard (ADR-023).
- **Idempotency:** PUT and DELETE operations on associations are idempotent.
- **Data Model:** The core data model is iteration-centric, providing flexibility for managing migration plans across different iterations (ADR-024). The `controls_master_ctm` table now includes a `ctm_code` for enhanced data clarity. User-team membership is now many-to-many (ADR-022). Dedicated comment tables for step-level and instance-level comments have been introduced (ADR-021).
- **Testing:** The test suite adheres to `ADR-026`, mandating precise SQL query mocks and improved test isolation for reliability. Deprecated `faker` API calls have been replaced, and critical Jest configuration issues have been resolved, ensuring the test suite runs successfully without warnings. Integration tests are a separate suite (ADR-019).
- **Documentation:** Developer guides and ADRs are maintained to ensure onboarding and ongoing development are efficient and consistent. Database naming conventions are formalised (ADR-014).
- **Frontend:** Built with vanilla JavaScript due to "no external frameworks" constraint (ADR-004). AJAX polling is used for real-time updates (ADR-005). SPA + REST pattern for admin UIs (ADR-020).
- **Application Structure:** Pure ScriptRunner application structure with packaged backend code, macros, and web assets (ADR-018).

## Dependencies

- All dependencies are declared explicitly and managed via project manifests.
- No implicit reliance on system-wide packages.
