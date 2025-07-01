# Technical Context

## Technologies Used

- **Backend:** Groovy (ScriptRunner) for REST API endpoints and business logic.
- **API Specification:** OpenAPI (`docs/api/openapi.yaml`) as the definitive contract for all endpoints.
- **Database:** PostgreSQL, with schema migrations managed via Liquibase.
- **Testing:** Automated tests (Jest for data utilities, Postman for API), with collections regenerated from the OpenAPI spec.
- **Containerisation:** Podman and Ansible for local development and deployment.

## Development Setup

- All API changes must begin with updates to the OpenAPI specification, ensuring the implementation and documentation remain synchronised.
- The backend is implemented in Groovy scripts, following formalised patterns for routing, idempotency, and error handling.
- Postman collections are regenerated after OpenAPI changes to keep automated tests aligned with the current API contract.

## Technical Constraints and Conventions

- **Error Handling:** All database and application errors are mapped to precise HTTP status codes, as per the new standard (see ADR-023).
- **Idempotency:** PUT and DELETE operations on associations are idempotent.
- **Documentation:** Developer guides and ADRs are maintained to ensure onboarding and ongoing development are efficient and consistent.

## Dependencies

- All dependencies are declared explicitly and managed via project manifests.
- No implicit reliance on system-wide packages.
