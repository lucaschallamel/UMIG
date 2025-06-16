# Technology Context

## 1. Approved Core Technologies

* **Platform Host:** Atlassian Confluence.
* **Backend Logic:** Atlassian ScriptRunner for Confluence (Groovy).
* **Frontend:** Standard HTML5, CSS3, and JavaScript (ES6+). No external frameworks or utility libraries permitted.
* **Database:** PostgreSQL (dedicated instance, not Confluence’s internal DB).
* **Visualization Aid:** Draw.io (Diagrams.net) plugin for Confluence (for diagrams only, not as a data source).
* **Deployment & Configuration:**
    * **Containerization:** Podman for local orchestration of Confluence, PostgreSQL, and MailHog.
    * **Scripting:** Ansible for environment setup and configuration management.
    * **Memory Allocation:** Confluence container memory set to 6GB for stability.
* **Enterprise Integrations:**
    * **Authentication:** Enterprise Active Directory (via Confluence's native integration).
    * **Email:** Enterprise Exchange Server (via ScriptRunner's built-in mail functions).

## 2. Development Setup

* **Version Control:** Git.
* **IDE:** Visual Studio Code with plugins for JavaScript and Groovy.
* **Collaboration Tools:** Atlassian JIRA for task management.
* **Local Dev Environment:** Podman/Ansible orchestration, manual ScriptRunner plugin installation via Confluence UI Marketplace (automated install is not supported due to reliability concerns). Live reload validated for backend and frontend.

## 3. Technical Constraints

* **No External Frameworks:** The frontend must be built with "vanilla" JavaScript. No external libraries like React, Vue, Angular, or even utility libraries are permitted.
* **Platform Dependency:** The application's performance and availability are tightly coupled to the enterprise Confluence instance.
* **Database Choice:** SQLite is explicitly disallowed due to concurrency requirements; only PostgreSQL is permitted.
* **Manual Steps for Reliability:** Manual installation of the ScriptRunner plugin is now required for local development to ensure stability and reproducibility.

## 4. Locked Patterns for MVP

* All technology and development patterns are now locked for the MVP phase. Any changes require explicit review and documentation.
