# System Patterns

## 1. System Architecture

The system is a **Confluence-Integrated Application**, leveraging Atlassian Confluence as the host platform and central entry point for all users.

1. **Host Platform:** A dedicated Atlassian Confluence page serves as the application container.
2. **Frontend:** A custom Confluence Macro built with **HTML, JavaScript (ES6+), and CSS**. No external frameworks or utility libraries are permitted. The macro renders the live dashboard and planner views.
3. **Backend:** **Atlassian ScriptRunner** (Groovy) provides backend business logic, exposing custom REST API endpoints consumed by the frontend.
4. **Database:** A central **PostgreSQL** database is the single source of truth for all application data, schedules, statuses, and audit logs. Data is explicitly stored outside of Confluence. **Database schema is managed by Liquibase** with version-controlled migrations.
5. **Local Development:** Podman and Ansible are used for local orchestration of Confluence, PostgreSQL, and MailHog. ScriptRunner plugin installation is performed manually via the Confluence UI Marketplace for reliability. Confluence container memory is set to 6GB to ensure stability. Live reload is validated for both backend and frontend assets. **Environment lifecycle is managed by orchestration scripts (`start.sh`/`stop.sh`) with health checks and automated database migrations.**

## 2. Key Technical Decisions

* **Confluence-Integrated Model:** Chosen to maximize use of existing enterprise infrastructure, reduce risk, and accelerate delivery.
* **AJAX Polling for Real-Time Updates:** The frontend polls ScriptRunner REST endpoints at regular intervals (e.g., every 5–10 seconds) to fetch the latest state and update the DOM. WebSockets and SSE were rejected due to platform constraints.
* **Data Model:** A normalized relational model using UUIDs for internal keys, with human-readable identifiers stored separately.
* **Database Migration Strategy (2025-06-17):** Liquibase CLI is integrated into the development environment startup sequence, automatically applying version-controlled SQL migrations from `/liquibase/changelogs`. This ensures consistent schema evolution across all environments.
* **Planning Feature Pattern:** The `chapter_schedules` table stores planned timings for each chapter/iteration. A dedicated ScriptRunner endpoint generates a shareable HTML table for macro-plans.
* **Auditing Pattern:** An immutable `event_log` table is populated by backend logic on every state-changing operation.
* **Decoupled Orchestration Engine:** Core logic and data are separate from Confluence. PostgreSQL holds the state, ScriptRunner acts as the orchestration engine, and Confluence provides the UI shell.
* **Single Source of Truth for Schema:** Liquibase is the authoritative source for all database schema changes. The `postgres/init-db.sh` script only handles database and user creation, with all table/schema logic removed.

## 3. Component Relationships

* `Confluence Page` → hosts → `Custom Macro (HTML/JS/CSS)`
* `Custom Macro` → makes AJAX calls to → `ScriptRunner REST Endpoints`
* `ScriptRunner REST Endpoints` → execute logic and query → `PostgreSQL Database`
* `ScriptRunner` → sends email via → `Enterprise Exchange Server`

## 4. Development & Deployment Patterns

* **Local Dev Environment:** Podman/Ansible orchestration, manual plugin install, memory allocation at 6GB, live reload for rapid iteration.
* **Environment Orchestration (2025-06-17):** Comprehensive `start.sh` and `stop.sh` scripts manage the full lifecycle of the development environment:
    * `start.sh`: Starts PostgreSQL, waits for readiness, runs Liquibase migrations, starts Confluence and MailHog
    * `stop.sh`: Gracefully stops all containers in reverse order
    * Health checks ensure proper service startup sequencing
* **Database Migration Automation (2025-06-17):** 
    * Liquibase CLI runs automatically during environment startup
    * Version-controlled SQL scripts in `/liquibase/changelogs/`
    * Credentials passed as command-line arguments for reliability
    * Relative path resolution ensures portability across development machines
* **Manual Steps for Reliability:** Manual installation of ScriptRunner plugin is now the standard for local development to ensure stability and reproducibility.
* **Documentation:** All patterns, decisions, and changes are captured in ADRs, README, and CHANGELOG for traceability and onboarding.
