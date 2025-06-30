---
description: How to safely refine the data model, update migrations, and keep data generation and tests in sync
---

# Data Model Refinement & Synchronisation Workflow

This workflow ensures every data model change is robust, consistent, and reflected across migrations, documentation, data generation, and tests.

---

## 1. Reference the Authoritative Sources

Before making or reviewing any data model change, consult these key documents:
- `/docs/dataModel/README.md` — Data model documentation and ERD
- `/local-dev-setup/liquibase/changelogs/001_unified_baseline.sql` — Baseline schema (Liquibase)
- `/docs/adr/ADR-008-Database-Migration-Strategy-with-Liquibase.md` — Migration strategy
- `/docs/adr/ADR-014-database-naming-conventions.md` — Naming conventions
- `/docs/adr/ADR-012_standardized_database_management_and_documentation.md` — Schema/documentation discipline

## 2. Plan the Change

- Identify the business or technical rationale for the change.
- Determine the impact on existing tables, columns, relationships, and constraints.
- Draft or update the ERD as needed.

## 3. Update the Schema

- Create or edit the appropriate Liquibase changelog(s) (never edit the baseline directly after project start).
- Follow naming conventions and migration strategy as per ADRs.
- Document every change with clear comments in the changelog.

## 4. Update Data Model Documentation

- Reflect all changes in `/docs/dataModel/README.md` (ERD, field lists, rationale).
- If the change is significant, consider updating or creating an ADR.

## 5. Synchronise Data Generation Scripts

- Review and update `local-dev-setup/data-utils/umig_generate_fake_data.js` (FAKER-based generator).
- Adjust or add generators in `local-dev-setup/data-utils/generators/` as needed.
- Ensure all generated data matches the new/updated schema.

## 6. Update and Extend Tests

- Update all related tests in `local-dev-setup/data-utils/__tests__/` to cover new/changed fields and relationships.
- Add new fixture data if needed.
- Ensure tests remain non-destructive and deterministic.

## 7. Validate

- Run all migrations in a fresh environment (dev/test).
- Run the data generation script and all tests; confirm no failures or regressions.
- Review the ERD and documentation for completeness and accuracy.

## 8. Document and Communicate

- Update `CHANGELOG.md` with a summary of the data model change.
- If required, update the main `README.md` and any relevant ADRs.
- Consider adding a Developer Journal entry to narrate the rationale and process.

---

> _Use this workflow every time you refine the data model to maintain project discipline, testability, and documentation integrity._
