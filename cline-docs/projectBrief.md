# Project Brief

## Overview

UMIG is a unified migration and integration guide platform designed to streamline and standardise complex migration processes. The project aims to provide robust, maintainable, and user-friendly tools for managing migration steps, team membership, and associated data, with a strong emphasis on clarity, consistency, and automation.

## Recent Milestones

### API Robustness & Error Handling (2025-07-02)
The project has significantly enhanced the robustness and error handling of its REST APIs. This includes:
- **Teams API Membership Endpoints:** `PUT` and `DELETE` for `/teams/{teamId}/users/{userId}` now enforce robust existence checks, prevent duplicate associations, and return clear RESTful responses.
- **Users API Robustness:** `DELETE /users/{id}` returns detailed JSON for blocking relationships, and `POST /users` features robust input validation.
- **API Stability and Pattern Standardization:** `UsersApi.groovy` has been refactored to align with the simple, stable patterns established in `TeamsApi.groovy`, resolving critical runtime and serialization errors. `ADR-023` has been updated with mandatory implementation patterns.

### Iteration-Centric Data Model (2025-07-02)
The core data model has been refactored to be "iteration-centric" ("Model C"). The `iterations_ite` table now links a migration to a master plan via `plm_id`, allowing a single migration to use different plans for different iterations. The `controls_master_ctm` table now includes a `ctm_code` for unique, human-readable business keys. This is formalised in `ADR-024`.

### Node.js-based Local Development Orchestration (2025-07-02)
The entire local development setup has been refactored to use a Node.js-based orchestration layer, replacing shell scripts with Node.js equivalents and introducing a unified `umig-local` CLI for environment management. This is formalised in `ADR-025`.

### Test Suite Stability and Reliability (2025-07-02)
The project's test suite has been significantly stabilised and hardened through precise SQL query mocks and improved test isolation, adhering to the new `ADR-026` standard for specific mocks in tests. Deprecated `faker` API calls have been replaced, and critical Jest configuration issues have been resolved, ensuring the test suite runs successfully without warnings.

### Generator Naming Convention Overhaul (2025-07-02)
All data generator scripts and their corresponding tests now follow a consistent 3-digit numeric prefix naming convention, ensuring robust ordering, traceability, and simplified maintenance.

### User-Team Many-to-Many Relationship (2025-07-01)
The user-team membership model has been migrated to a many-to-many relationship using the `teams_tms_x_users_usr` join table, enhancing flexibility and auditability. This is formalised in `ADR-022`.

### Step-Level and Instance-Level Comments (2025-06-30)
Dedicated comment tables (`step_pilot_comments_spc`, `step_instance_comments_sic`) have been introduced to capture collaborative feedback and audit trails directly on canonical plan steps and executed step instances. This is formalised in `ADR-021`.

## Core Goals

- Deliver a reliable, extensible migration management system.
- Ensure all APIs and user interfaces are consistent, well-documented, and easy to use.
- Maintain a single source of truth for all API contracts via OpenAPI specifications.
- Foster a development culture of clarity, error resilience, and best practice adherence.
