# Technology Context

## 1. Approved Core Technologies

*   **Platform Host:** Atlassian Confluence.
*   **Backend Logic:** Atlassian ScriptRunner for Confluence (using the Groovy language).
*   **Frontend:** Standard HTML5, CSS3, and JavaScript (ES6+).
*   **Database:** PostgreSQL.
*   **Visualisation Aid:** Draw.io (Diagrams.net) plugin for Confluence (as a visual reference, not the source of truth).
*   **Deployment & Configuration:**
    *   **Containerisation:** Podman for any potential standalone service components (though the primary architecture does not require this for the MVP).
    *   **Scripting:** Ansible for environment setup and configuration management.
*   **Enterprise Integrations:**
    *   **Authentication:** Enterprise Active Directory (via Confluence's native integration).
    *   **Email:** Enterprise Exchange Server (via ScriptRunner's built-in mail functions).

## 2. Development Setup

*   **Version Control:** Git.
*   **IDE:** Visual Studio Code with relevant plugins for JavaScript and Groovy.
*   **Collaboration Tools:** Atlassian JIRA for task management.

## 3. Technical Constraints

*   **No External Frameworks:** The frontend must be built with "vanilla" JavaScript. No external libraries like React, Vue, or Angular are permitted. Careful DOM management and state handling in pure JavaScript will be critical.
*   **Platform Dependency:** The application's performance and availability are tightly coupled to the enterprise Confluence instance.
*   **Database Choice:** SQLite is explicitly disallowed for this project due to concurrency requirements.