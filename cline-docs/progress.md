# Progress

## What Works

- The local development environment is stable and reproducible, using Podman, Ansible, and Liquibase for automated database migrations.
- ScriptRunner for Confluence is reliably installed manually via the Marketplace, ensuring compatibility and stability (ADR-007).
- Database schema management is fully automated and version-controlled with Liquibase, with initial tables for teams and team_members in place.
- The backend (Groovy/ScriptRunner) and frontend (vanilla JS, CSS) codebases are now cleanly separated in the `src/` directory.
- All ADRs are up-to-date and referenced in documentation.
- The Confluence version is consistently set to 8.5.6 across all documentation and setup scripts.

## What's Left to Build

- Complete and test the Implementation Plan macro backend, including all CRUD endpoints and integration with the new ScriptRunner database connection.
- Expand database schema and migrations as new features are defined.
- Continue frontend development for the macro UI, ensuring robust interaction with backend APIs.
- Ongoing documentation updates to reflect new features, changes, and lessons learned.

## Current Status

- The project is on a solid technical footing after a series of architectural pivots and environment stabilisation efforts.
- All major technical decisions are documented in ADRs and reflected in the memory bank.
- The team is focused on backend feature delivery and validating the new database connection pattern in ScriptRunner.

## Known Issues

- The new ScriptRunner database connection pattern requires ongoing monitoring to ensure stability and performance.
- Manual steps remain for initial environment setup (e.g., ScriptRunner installation, database connection configuration in the UI).
- The vanilla JS frontend approach, while compliant, increases complexity and requires strict discipline to maintain code quality.

## Evolution of Project Decisions

- The project has moved from a "blue sky" standalone stack to a pragmatic, enterprise-compliant Confluence-integrated solution.
- Environment setup has been iteratively improved for reliability and developer experience.
- Database management has evolved from ad-hoc scripts to a robust, automated migration system.
- All technical pivots and lessons are captured in the ADRs and memory bank for future reference.
