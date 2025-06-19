# UMIG API Documentation

This folder contains the OpenAPI (Swagger) specification for the UMIG REST API.

- The main API spec is in [`openapi.yaml`](openapi.yaml).
- This describes all REST endpoints implemented in ScriptRunner/Groovy for Confluence integration.

## Viewing the API Documentation

- **Redoc (Recommended):**
  - [Redoc Online Viewer](https://redocly.github.io/redoc/) (copy-paste or upload `openapi.yaml`)
  - Local: `npm install -g redoc-cli` then `redoc-cli serve openapi.yaml`
- **Swagger Editor:**
  - [Swagger Editor](https://editor.swagger.io/) (copy-paste or upload `openapi.yaml`)
- **VS Code Extensions:**
  - Install "Swagger Viewer" or "OpenAPI (Swagger) Editor" for instant preview in VS Code

You can also use this file with OpenAPI Generator to produce client/server code or additional HTML documentation.

## API Testing with Postman

A Postman collection is available for testing the API endpoints.
- Collection: [`postman/UMIG_API_Collection.postman_collection.json`](postman/UMIG_API_Collection.postman_collection.json)
- Usage Instructions: [`postman/README.md`](postman/README.md)
