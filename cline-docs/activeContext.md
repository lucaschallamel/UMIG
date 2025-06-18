# Active Context

## 1. Current Work Focus

The project has completed its architectural pivot, environment stabilization, and database migration strategy implementation. The local development environment is now fully automated and production-ready. The current focus has shifted to core feature development, with initial implementation of the Implementation Plan macro's backend and addressing a critical database connectivity issue.

## 2. Recent Changes & Decisions (Updated: 2025-06-18)

* **Architectural Pivot Complete:** The project decisively moved from an initial "blue sky" architecture (React, BaaS, WebSockets) to a strictly enterprise-compliant solution, as required by the bank's technology portfolio.
* **Final Architecture:** The application is a Confluence-Integrated Application:
  - Frontend: Custom Confluence macro using vanilla JS, HTML, and CSS (no frameworks or utility libraries).
  - Backend: Atlassian ScriptRunner (Groovy) exposes REST APIs, running inside the Confluence JVM.
  - Database: Dedicated PostgreSQL instance (not Confluence's internal DB) with Liquibase migrations.
  - Real-Time: AJAX polling, not WebSockets/SSE, due to ScriptRunner/Confluence limitations.
* **Local Dev Environment Fully Automated (2025-06-17):**
  - Podman and Ansible are used for local orchestration of Confluence, PostgreSQL, and MailHog.
  - ScriptRunner plugin installation is now manual via the Confluence UI Marketplace, as automated install via `Containerfile` was unreliable and caused OOM crashes.
  - Confluence container memory was increased from 2GB to 6GB to prevent OOM errors.
  - Both backend (Groovy) and frontend (JS/CSS) live-reload workflows are validated and working.
  - Automated database migrations with Liquibase CLI integrated into startup sequence.
  - Environment orchestration scripts (`start.sh`/`stop.sh`) with robust health checks.
  - Single source of truth for database schema - Liquibase manages all schema changes.
* **Database Migration Strategy (2025-06-17):**
  - Liquibase CLI successfully integrated into environment startup sequence.
  - Database schema changes automatically applied from version-controlled SQL scripts (`/liquibase/changelogs`).
  - Initial migration script created for `teams` and `team_members` tables.
  - Refactored `postgres/init-db.sh` to be idempotent and only handle database/user creation.
  - Established Liquibase as the single source of truth for database schema.
* **Initial Implementation Plan Backend (2025-06-18):**
  - Started development of the Implementation Plan macro backend with initial `ImplementationPlanManager.groovy`.
  - Encountered critical database connectivity issue: `java.sql.SQLException: org.postgresql.Driver not found`.
  - Attempted to resolve by containerizing the PostgreSQL JDBC driver in the custom Confluence image (documented in ADR-009).
  - Strategic pivot to use ScriptRunner's built-in Database Connection resource feature instead of direct JDBC driver inclusion.
* **Documentation Discipline:** All changes and decisions are thoroughly documented in ADRs, README, and CHANGELOG.

## 3. Next Steps

1. Configure ScriptRunner's Database Connection pool in the UI to resolve the database connectivity issue.
2. Refactor `ImplementationPlanManager.groovy` to use `DatabaseUtil.withSql()` for reliable database access.
3. Clean up the `Containerfile` by removing redundant JDBC driver `COPY` instructions once the new approach is validated.
4. Continue development of the core CRUD API endpoints for all main entities (Plans, Chapters, Steps, Tasks, Controls, etc.).
5. Start building the frontend macro UI in vanilla JavaScript, focusing on the main dashboard and planner view.
6. Implement backend logic for the event log and planning feature, including HTML export.
7. Prepare for deployment and user acceptance testing after initial feature development.

## 4. Key Risks & Considerations

* The four-week timeline remains aggressive, especially given the vanilla JS constraint.
* Manual steps (e.g., plugin install) are now preferred for reliability.
* Performance and scalability of ScriptRunner under load must be validated during development.
* All technical and architectural decisions are now locked for the MVP phase.
* Database connectivity must be established reliably before frontend development can proceed effectively.

## 5. Recent Technical Challenges (2025-06-18)

* **JDBC Driver Integration:** Encountered persistent `java.sql.SQLException: org.postgresql.Driver not found` errors despite multiple attempts to include the driver in the Confluence container.
* **Docker Image Validation:** Identified and corrected an invalid base image tag in the `Containerfile`, moving from `:8.5.22` to a valid `:8.5.6-jdk17`.
* **Driver Bundling Verification:** Verified driver-bundling strategy, including file paths, permissions, and ownership, but issues persisted.
* **Strategic Pivot:** Decided to adopt ScriptRunner's best-practice Database Connection resource approach instead of manual driver bundling to unblock development.
* **Environment Restart Protocol:** Established correct procedure for restarting the environment, confirming that `./stop.sh` must be run to clear old containers before a fresh start.
