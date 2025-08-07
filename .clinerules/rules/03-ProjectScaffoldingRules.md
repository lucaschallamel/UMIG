# Project Scaffolding Rules

> **Scope:** This document defines the mandatory file and folder structure for the project. Adherence to this structure is required to ensure consistency and support automated tooling.

## Project structure

The project should include the following files and folders:

- a .clineignore file
- a .gitignore file primed for a regular project managed with CLINE in Microsoft VSCode
- a generic readme.md file
- a blank .gitattributes file
- a license file

- /.clinerules/rules folder to include all project specific rules for the CLINE extension
- /.clinerules/workflows folder to include all project specific workflows for the CLINE extension
- /.windsurf/rules/ folder to include all project specific rules for the Windsurf extension
- /.windsurf/workflows/ folder to include all project specific workflows for the Windsurf extension

- a docs/adr folder to include all project specific Architectural Decisions Records (ADRs)
- a docs/devJournal folder to include all project specific development journals
- a docs/roadmap folder to include all project roadmap and features description
- a docs/roadmap/features folder to include all project specific features and their technical, functional and non-functional requirements (Including UX-UI)

- an src/app folder to include the frontend components of the solution
- an src/api folder to include the backend components of the solution
- an src/utils folder to include the share utilities components of the solution
- an src/tests folder to include the tests components of the solution
- an src/tests/e2e folder to include the end-to-end tests components of the solution
- an src/tests/postman folder to include the postman tests for the API components of the solution

- a db folder to include the database components of the solution
- a db/liquibase folder to include the liquibase components of the solution

- a local-dev-setup folder to include the local development setup components of the solution
