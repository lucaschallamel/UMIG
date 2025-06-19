## [Unreleased]
### Changed
- **API Documentation:**
    - Updated Postman collection (`docs/api/postman/UMIG_API_Collection.postman_collection.json`) with corrected `baseUrl`, comprehensive CRUD endpoints for all entities (Teams, Persons, Plans), accurate endpoint naming, example payloads, and helper variables (`teamId`, `personId`, `planId`).
    - Aligned `docs/api/openapi.yaml` with the Postman collection and actual Groovy API implementation, including correct server URL, standardized endpoint names, and all CRUD operations. Resolved YAML formatting errors (duplicated mapping keys).
    - Updated `docs/api/README.md` to link to the Postman collection and its usage instructions.
    - Updated `docs/api/postman/README.md` with the correct `baseUrl` and information on new helper variables.
### Added
- **Data Model Documentation:** Created formal documentation for the database schema at `docs/dataModel/README.md`, including a Mermaid ERD and detailed table descriptions.
- **API Testing Collection:** Added a version-controlled Postman collection at `docs/api/postman/` for local API testing.
- **Architectural Decision Record (ADR):** Added `ADR-003` to document the standardized approach for database management and documentation.

### Fixed
- **Database Migration System:** Resolved a critical failure in the Liquibase migration process by correcting the master changelog configuration, removing duplicate files, and ensuring all migration scripts are idempotent. The system is now robust and reliable.

### Fixed
- **ScriptRunner REST Endpoints:** Resolved persistent `bundle://` runtime errors for file-based REST endpoints by correcting the Java system properties in the development environment. The configuration now uses `-Dplugin.script.roots` and `-Dplugin.rest.scripts.package` for automatic scanning and registration, eliminating the need for manual UI configuration.

### Added
- **API Documentation:** Introduced OpenAPI (Swagger) documentation for the UMIG REST API at `docs/api/openapi.yaml`.
- **Groovy/ScriptRunner Coding Conventions:** Added `src/groovy/README.md` for workspace rules and best practices.
- **API Doc Tooling:** Recommended Redoc (local/online) and VS Code OpenAPI extensions for viewing and working with the API documentation.
