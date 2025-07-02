# Technical Context

## 1. Approved Core Technologies

*   **Platform Host:** Atlassian Confluence.
*   **Backend Logic:** Atlassian ScriptRunner for Confluence (using the Groovy language).
*   **Frontend:** Standard HTML5, CSS3, and JavaScript (ES6+).
*   **Database:** PostgreSQL.
*   **Visualisation Aid:** Draw.io (Diagrams.net) plugin for Confluence (as a visual reference, not the source of truth).
*   **Deployment & Configuration:**
    *   **Containerisation:** Podman for local development environment.
    *   **Scripting:** Ansible for environment setup and configuration management.
    *   **Local Dev Orchestration:** Node.js for managing the local development environment scripts (`umig-local` CLI).
*   **Enterprise Integrations:**
    *   **Authentication:** Enterprise Active Directory (via Confluence's native integration).
    *   **Email:** Enterprise Exchange Server (via ScriptRunner's built-in mail functions).

## 2. Development Setup

*   **Version Control:** Git.
*   **IDE:** Visual Studio Code with relevant plugins for JavaScript and Groovy.
*   **Collaboration Tools:** Atlassian JIRA for task management.
*   **Database Migrations:** Liquibase is the exclusive tool for managing all database schema changes.
*   **Database Connectivity:** ScriptRunner's built-in Database Resource Pool (`umig_db_pool`) is used for all database connections.
*   **Data Utilities:** All data generation, import, and utility scripts are written in Node.js.
*   **Testing:** Jest for unit tests (Node.js scripts) and Groovy-based integration tests for backend APIs.

## 3. Technical Constraints

*   **No External Frontend Frameworks:** The frontend must be built with "vanilla" JavaScript. No external libraries like React, Vue, or Angular are permitted. Careful DOM management and state handling in pure JavaScript will be critical.
*   **Platform Dependency:** The application's performance and availability are tightly coupled to the enterprise Confluence instance.
*   **Database Choice:** SQLite is explicitly disallowed for this project due to concurrency requirements.
*   **Time:** The four-week deadline for the MVP is the primary constraint and dictates a pragmatic approach that prioritises speed and core functionality.
*   **Security:** All authentication, API endpoints, and data storage must be secure.
