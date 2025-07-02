# Technical Context

## Technologies Used

- **Backend:** Groovy (ScriptRunner) for REST API endpoints and business logic.
- **API Specification:** OpenAPI (`docs/api/openapi.yaml`) as the definitive contract for all endpoints.
- **Database:** PostgreSQL, with schema migrations managed via Liquibase.
- **Testing:** Automated tests (Jest for data utilities, Postman for API), with collections regenerated from the OpenAPI spec.
- **Containerisation:** Podman for local development and deployment.
- **Local Development Orchestration:** Node.js for managing the local development environment scripts.

## Development Setup

- All API changes must begin with updates to the OpenAPI specification, ensuring the implementation and documentation remain synchronised.
- The backend is implemented in Groovy scripts, following formalised patterns for routing, idempotency, and error handling.
- Postman collections are regenerated after OpenAPI changes to keep automated tests aligned with the current API contract.
- The local development environment is now orchestrated via Node.js scripts, providing a streamlined and consistent setup.

## Technical Constraints and Conventions

- **Error Handling:** All database and application errors are mapped to precise HTTP status codes, as per the new standard (see ADR-023).
- **Idempotency:** PUT and DELETE operations on associations are idempotent.
- **Data Model:** The core data model is iteration-centric, providing flexibility for managing migration plans across different iterations (see ADR-024).
- **Documentation:** Developer guides and ADRs are maintained to ensure onboarding and ongoing development are efficient and consistent.

## Dependencies

- All dependencies are declared explicitly and managed via project manifests.
- No implicit reliance on system-wide packages.
