# Project Guidelines

> **Scope:** This document outlines high-level, project-specific guidelines, policies, and standards unique to this project. It serves as the primary entry point to the rule system, linking to more detailed principles in other files. For universal coding principles, see `02-CoreCodingPrinciples.md`. For mandatory file structure, see `03-ProjectScaffoldingRules.md`. For cloud-native development, see `04-TwelveFactorApp.md`. For our service architecture, see `05-MicroServiceOrientedArchitecture.md`.

## Documentation Requirements

- Update relevant documentation in /docs when modifying features
- Keep README.md in sync with new capabilities
- Maintain changelog entries in CHANGELOG.md

## Documentation Discipline

- All major changes must be reflected in README, ADRs, dev journals, and changelogs.
- Use and maintain templates for sprint reviews and journal entries.
- Document onboarding steps, environment requirements, and common pitfalls in README files.

## Accessibility & Inclusion

- All UI components must meet WCAG 2.1 AA accessibility standards.
- Ensure sufficient color contrast, keyboard navigation, and screen reader support.
- Use inclusive language in documentation and user-facing text.
- Accessibility must be tested as part of code review and release.

## Architecture

- This project follows a **Microservice-Oriented Architecture**.
- All development must adhere to the principles outlined in `04-TwelveFactorApp.md` for cloud-native compatibility and `05-MicroServiceOrientedArchitecture.md` for service design and implementation patterns.

## Architecture Decision Records

Create ADRs in /docs/adr for:

- Major dependency changes
- Architectural pattern changes
- New integration patterns
- Database schema changes
  Follow template in /docs/adr/template.md

## Code Style & Patterns

- Generate API clients using OpenAPI Generator
- Use TypeScript axios template
- Place generated code in /src/generated
- Prefer composition over inheritance
- Use repository pattern for data access
- Follow error handling pattern in /src/utils/errors.ts

## REST API Implementation

- REST endpoints must follow the `CustomEndpointDelegate` pattern and reside in package-scoped Groovy files.
- Always declare the package at the top of each endpoint file.
- Configure REST script roots and packages via environment variables for auto-discovery.

## Testing Standards

- Unit tests required for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows

## Testing & Data Utilities

- All critical endpoints and data utilities must have integration tests.
- Synthetic data scripts must be idempotent, robust, and never modify migration tracking tables.
- Document the behavior and safety of all data utility scripts.

## Security & Performance Considerations

- **Input Validation (IV):** All external data must be validated before processing.
- **Resource Management (RM):** Close connections and free resources appropriately.
- **Constants Over Magic Values (CMV):** No magic strings or numbers. Use named constants.
- **Security-First Thinking (SFT):** Implement proper authentication, authorization, and data protection.
- **Performance Awareness (PA):** Consider computational complexity and resource usage.
- Rate limit all api endpoints
- Use row level security always (RLS)
- Captcha on all auth routes/signup pages
- If using hosting solution like vercel, enable attack challenge on their WAF
- DO NOT read or modify, without prior approval by user:
  - .env files
  - \*_/config/secrets._
  - Any file containing API keys or credentials

## Security & Quality Automation

- Integrate Semgrep for static analysis and security scanning in all projects.
- Use MegaLinter (or equivalent) for multi-language linting and formatting.
- Supplement with language/framework-specific linters (e.g., ESLint for JS/TS, flake8 for Python, RuboCop for Ruby).
- All linting and static analysis tools must be run in CI/CD pipelines; merges are blocked on failure.
- Linter and static analysis configurations must be version-controlled and documented at the project root.
- Regularly review and update linter/analysis rules to address new threats and maintain code quality.
- Document and version-control all ignore rules and linter configs.
- CI checks must pass before merging any code.

## Miscellaneous recommendations

- Always prefer simple solutions
- Avoid duplication of code whenever possible, which means checking for other areas of the codebase that might already have similar code and functionality
- Write code that takes into account the different environments: dev, test, and prod
- You are careful to only make changes that are requested or you are confident are well understood and related to the change being requested
- When fixing an issue or bug, do not introduce a new pattern or technology without first exhausting all options for the existing implementation. And if you finally do this, make sure to remove the old implementation afterwards so we don't have duplicate logic.
- Keep the codebase very clean and organized
- Avoid writing scripts in files if possible, especially if the script is likely only to be run once
- Avoid having files over 200-300 lines

## Project Structure

- Avoid unnecessary plugin or build complexity; prefer script-based, automatable deployment.
- Mocking data is only needed for tests, never mock data for dev or prod
- Never add stubbing or fake data patterns to code that affects the dev or prod environments
- Never overwrite my .env file without first asking and confirming

## Automation & CI/CD

- All code must pass linting and formatting checks in CI before merge.
- CI must run all tests (unit, integration, E2E) and block merges on failure.
- Add new linters or formatters only with team consensus.

## Local Development Environment

- Use Podman or Docker and Ansible for local environment setup.
- Provide wrapper scripts for starting, stopping, and resetting the environment; avoid direct Ansible or container CLI usage.
- Ensure all environment configuration is version-controlled.

## Branching & Release Policy

- Follow [your branching model, e.g. Git Flow or trunk-based] for all work.
- Use semantic versioning for releases.
- Release branches must be code-frozen and pass all CI checks before tagging.

## Incident Response

- Maintain an incident log documenting bugs, outages, and recovery actions.
- After any incident, hold a retrospective and update runbooks as needed.
- Critical incidents must be reviewed in the next team meeting.

## Data Privacy & Compliance

- All data handling must comply with applicable privacy laws (e.g., GDPR, CCPA).
- Never log or store sensitive data insecurely.
- Review and document data flows for compliance annually.

## Database Migration & Change Management

- Use a dedicated, automated migration tool (e.g., Liquibase, Flyway) for all schema changes.
- Store all migration scripts under version control, alongside application code.
- All environments (dev, test, prod) must be migrated using the same process and scripts.
- Manual, ad-hoc schema changes are prohibited.
- All migrations must be documented with rationale and expected outcomes.

## Database Management & Documentation

- Maintain an up-to-date Entity Relationship Diagram (ERD).
- Use templates for documenting schema changes, migrations, and rationale.
- Document all reference data and non-obvious constraints.
- Maintain a changelog for all database changes.
- Review and update database documentation as part of the development workflow.

## Database Naming Conventions

- Use clear, consistent, and project-wide naming conventions for tables, columns, indexes, and constraints.
- Prefer snake_case for all identifiers.
- Prefix/suffix conventions must be documented (e.g., `tbl_` for tables, `_fk` for foreign keys).
- Avoid reserved words and ambiguous abbreviations.
- Enforce naming conventions in code review and automated linting where possible.
