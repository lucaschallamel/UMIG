# Active Context

## 1. Current Work Focus

The project has completed its architectural pivot and environment stabilization. The current focus is on beginning core feature development, with a stable, reproducible local development environment in place. The team is now ready to implement backend CRUD APIs in ScriptRunner and start building the frontend macro UI in vanilla JavaScript.

## 2. Recent Changes & Decisions

* **Architectural Pivot Complete:** The project decisively moved from an initial "blue sky" architecture (React, BaaS, WebSockets) to a strictly enterprise-compliant solution, as required by the bank's technology portfolio.
* **Final Architecture:** The application is a Confluence-Integrated Application:
  - Frontend: Custom Confluence macro using vanilla JS, HTML, and CSS (no frameworks or utility libraries).
  - Backend: Atlassian ScriptRunner (Groovy) exposes REST APIs, running inside the Confluence JVM.
  - Database: Dedicated PostgreSQL instance (not Confluence’s internal DB).
  - Real-Time: AJAX polling, not WebSockets/SSE, due to ScriptRunner/Confluence limitations.
* **Local Dev Environment Stabilized:**
  - Podman and Ansible are used for local orchestration of Confluence, PostgreSQL, and MailHog.
  - ScriptRunner plugin installation is now manual via the Confluence UI Marketplace, as automated install via `Containerfile` was unreliable and caused OOM crashes.
  - Confluence container memory was increased from 2GB to 6GB to prevent OOM errors.
  - Both backend (Groovy) and frontend (JS/CSS) live-reload workflows are validated and working.
* **Documentation Discipline:** All changes and decisions are thoroughly documented in ADRs, README, and CHANGELOG.

## 3. Next Steps

1. Begin development of the core CRUD API endpoints in ScriptRunner for all main entities (Plans, Chapters, Steps, Tasks, Controls, etc.).
2. Start building the frontend macro UI in vanilla JavaScript, focusing on the main dashboard and planner view.
3. Implement backend logic for the event log and planning feature, including HTML export.
4. Prepare for deployment and user acceptance testing after initial feature development.

## 4. Key Risks & Considerations

* The four-week timeline remains aggressive, especially given the vanilla JS constraint.
* Manual steps (e.g., plugin install) are now preferred for reliability.
* Performance and scalability of ScriptRunner under load must be validated during development.
* All technical and architectural decisions are now locked for the MVP phase.
