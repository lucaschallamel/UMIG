# Technology Context

## 1. Approved Core Technologies

* **Platform Host:** Atlassian Confluence.
* **Backend Logic:** Atlassian ScriptRunner for Confluence (Groovy).
* **Frontend:** Standard HTML5, CSS3, and JavaScript (ES6+). No external frameworks or utility libraries permitted.
* **Database:** PostgreSQL (dedicated instance, not Confluence's internal DB) with Liquibase for schema migrations.
* **Database Migration Management:** Liquibase CLI for version-controlled, automated schema evolution.
* **Visualization Aid:** Draw.io (Diagrams.net) plugin for Confluence (for diagrams only, not as a data source).
* **Deployment & Configuration:**
    * **Containerization:** Podman for local orchestration of Confluence, PostgreSQL, and MailHog.
    * **Scripting:** Ansible for environment setup and configuration management.
    * **Environment Orchestration:** Shell scripts (`start.sh`/`stop.sh`) for lifecycle management with health checks.
    * **Memory Allocation:** Confluence container memory set to 6GB for stability.
* **Enterprise Integrations:**
    * **Authentication:** Enterprise Active Directory (via Confluence's native integration).
    * **Email:** Enterprise Exchange Server (via ScriptRunner's built-in mail functions).

## 2. Development Setup

* **Version Control:** Git.
* **IDE:** Visual Studio Code with plugins for JavaScript and Groovy.
* **Collaboration Tools:** Atlassian JIRA for task management.
* **Local Dev Environment:** 
    * Podman/Ansible orchestration with automated lifecycle management
    * Manual ScriptRunner plugin installation via Confluence UI Marketplace (automated install is not supported due to reliability concerns)
    * Live reload validated for backend (.groovy) and frontend (.js/.css)
    * Automated database migrations via Liquibase CLI integration
    * Environment health checks and startup sequencing

## 3. Technical Constraints

* **No External Frameworks:** The frontend must be built with "vanilla" JavaScript. No external libraries like React, Vue, Angular, or even utility libraries are permitted.
* **Platform Dependency:** The application's performance and availability are tightly coupled to the enterprise Confluence instance.
* **Database Choice:** SQLite is explicitly disallowed due to concurrency requirements; only PostgreSQL is permitted.
* **Manual Steps for Reliability:** Manual installation of the ScriptRunner plugin is now required for local development to ensure stability and reproducibility.

## 4. Database Migration Patterns (Added 2025-06-17)

* **Migration Tool:** Liquibase CLI (installed locally, not containerized for simplicity).
* **Migration Storage:** Version-controlled SQL scripts in `/liquibase/changelogs/`.
* **Execution Pattern:** Automatic migration execution during environment startup via `start.sh` script.
* **Configuration Management:** Credentials passed as command-line arguments for reliability.
* **Path Resolution:** Relative paths configured to work from script execution context.
* **Schema Authority:** Liquibase is the single source of truth for all database schema changes.

## 5. Locked Patterns for MVP

* All technology and development patterns are now locked for the MVP phase. Any changes require explicit review and documentation.
* Database migration strategy is finalized and automated as of 2025-06-17.
