# Technical Context

## 1. Approved Core Technologies

* **Platform Host:** Atlassian Confluence.
* **Backend Logic:** Atlassian ScriptRunner for Confluence (using the Groovy language).
* **Frontend:** Standard HTML5, CSS3, and JavaScript (ES6+).
* **Database:** PostgreSQL.
* **Visualisation Aid:** Draw.io (Diagrams.net) plugin for Confluence (as a visual reference, not the source of truth).
* **Deployment & Configuration:**
  * **Containerisation:** Podman for local development environment (ADR-006, ADR-025).
  * **Scripting:** Ansible for environment setup and configuration management (ADR-006).
  * **Local Dev Orchestration:** Node.js for managing the local development environment scripts (`umig-local` CLI) (ADR-025).
* **Enterprise Integrations:**
  * **Authentication:** Enterprise Active Directory (via Confluence's native integration).
  * **Email:** Enterprise Exchange Server (via ScriptRunner's built-in mail functions).

## 2. Development Setup

* **Version Control:** Git.
* **IDE:** Visual Studio Code with relevant plugins for JavaScript and Groovy.
* **Collaboration Tools:** Atlassian JIRA for task management.
* **Database Migrations:** Liquibase is the exclusive tool for managing all database schema changes (ADR-008).
* **Database Connectivity:** ScriptRunner's built-in Database Resource Pool (`umig_db_pool`) is used for all database connections (ADR-010).
* **Data Utilities:** All data generation, import, and utility scripts are written in Node.js (ADR-013). The Confluence JSON import pipeline leverages existing shell scripts (`scrape_html_oneline.sh`) and `psql \copy` for high-performance, dependency-free data ingestion (ADR-028). **Data Generation Pipeline (2025-07-04):** Modular generators with strict execution order dependencies, ensuring master data exists before instance creation. Enhanced with comprehensive logging and complete field inheritance following ADR-029 principles.
* **Testing:** Jest for unit tests (Node.js scripts) and Groovy-based integration tests for backend APIs (ADR-019). Specific mocks are enforced in tests to prevent regressions (ADR-026).

## 3. Technical Constraints

* **No External Frontend Frameworks:** The frontend must be built with "vanilla" JavaScript. No external libraries like React, Vue, or Angular are permitted. Careful DOM management and state handling in pure JavaScript will be critical (ADR-004).
* **Platform Dependency:** The application's performance and availability are tightly coupled to the enterprise Confluence instance.
* **Database Choice:** SQLite is explicitly disallowed for this project due to concurrency requirements (ADR-003).
* **Time:** The four-week deadline for the MVP is the primary constraint and dictates a pragmatic approach that prioritises speed and core functionality.
* **Security:** All authentication, API endpoints, and data storage must be secure.
* **No New Third-Party Dependencies for Data Import:** The data import strategy must rely exclusively on existing technology stack components (PostgreSQL, shell scripts) to maintain a minimal dependency footprint (ADR-028).

## 4. Development Patterns

* **Repository Pattern:** Centralised data access with connection pooling (ADR-010). **Enhanced (2025-07-04):** Implemented encapsulated database access using `DatabaseUtil.withSql` pattern (e.g., `MigrationRepository.groovy`) for clean architecture separation.
* **Dynamic Data Integration Pattern (2025-07-04):** Robust pattern for macro development where UI selectors are populated dynamically via REST APIs rather than hardcoded in Groovy:
  * Macros provide skeleton HTML with loading states
  * JavaScript handles all data fetching and UI population
  * Clear separation between data access (repository), business logic (API), and presentation (macro/JavaScript)
* **SPA + REST Pattern:** Single-page applications with RESTful backend APIs (ADR-020).
* **Zero External Dependencies:** Pure vanilla JavaScript with no frameworks.
* **Test-Driven Development:** Comprehensive unit and integration testing with Jest and Groovy.
* **Database Migrations:** Liquibase for schema versioning and deployment.
* **Error Handling:** Specific SQL state mappings (23503→400, 23505→409) for robust API responses.
* **Full Attribute Instantiation:** Instance tables replicate all relevant master table attributes for runtime flexibility and auditability (ADR-029).

## 5. Tool Usage Patterns

* **Database Access:** Mandatory use of `DatabaseUtil.withSql` pattern for all database operations.
* **API Endpoints:** Use `CustomEndpointDelegate` with proper error handling and security groups.
* **Frontend Development:** Pure vanilla JavaScript with Atlassian AUI styling.
* **Data Generation:** Modular generators with 3-digit numeric prefixes for execution order.
* **Testing:** Specific SQL query mocks to prevent regressions and ensure test isolation.
