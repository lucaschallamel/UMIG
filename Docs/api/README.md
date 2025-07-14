# UMIG API V2 Documentation

This folder contains the OpenAPI 3.0 specification for the UMIG V2 REST API. This new API version supersedes the previous V1 API.

- The architectural principles and conventions for the V2 API are documented in **[ADR-017: V2 REST API Architecture and Conventions](../adr/ADR-017-V2-REST-API-Architecture.md)**.
- The detailed technical specification for all endpoints is in **[`openapi.yaml`](openapi.yaml)**.

## Viewing the API Documentation

You can use a variety of tools to view the `openapi.yaml` file in a more user-friendly format.

- **Redocly CLI (Recommended):**
  - [Redoc Online Viewer](https://redocly.github.io/redoc/) (copy-paste or upload `openapi.yaml`)
  - Local: `npm install -g @redocly/cli` then `redocly preview-docs openapi.yaml`
  - *Note: `redoc-cli` is deprecated. Use `@redocly/cli` for all local Redoc documentation tasks. See: <https://www.npmjs.com/package/@redocly/cli>*
- **Swagger Editor:**
  - [Swagger Editor](https://editor.swagger.io/) (copy-paste or upload `openapi.yaml`)
- **VS Code Extensions:**
  - Install "Swagger Viewer" or "OpenAPI (Swagger) Editor" for instant preview in VS Code

You can also use this file with OpenAPI Generator to produce client/server code or additional HTML documentation.

## STEP View Macro & SPA

- The `/stepViewApi` endpoint powers the STEP View macro and SPA, returning structured data for rendering migration/release steps in Confluence.

## API Specifications

Individual API specifications are available for detailed documentation:

### Core APIs
- **[Teams API](TeamsAPI.md)** - Team management with hierarchical filtering
- **[Labels API](LabelsAPI.md)** - Label management with hierarchical filtering
- **[Migrations API](MigrationsAPI.md)** - Migration and iteration management *(to be documented)*
- **[Users API](UsersAPI.md)** - User management *(to be documented)*

### Hierarchical Filtering
The Teams and Labels APIs support hierarchical filtering based on the migration execution hierarchy:
- **Migration Level** - Shows teams/labels involved in entire migration
- **Iteration Level** - Shows teams/labels involved in specific iteration
- **Plan Level** - Shows teams/labels involved in specific plan instance
- **Sequence Level** - Shows teams/labels involved in specific sequence instance
- **Phase Level** - Shows teams/labels involved in specific phase instance

This provides progressive filtering where options become more contextually relevant as users drill down the hierarchy.

## API Testing with Postman

A Postman collection is available for testing the API endpoints. This will be updated to reflect the V2 API.
- Collection: [`postman/UMIG_API_Collection.postman_collection.json`](postman/UMIG_API_Collection.postman_collection.json)
- Usage Instructions: [`postman/README.md`](postman/README.md)
