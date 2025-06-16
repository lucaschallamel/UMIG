# Project Progress

## 1. What Works / Completed

* **Phase 0: Discovery & Design**
    * Initial requirements gathered and core problems documented.
    * High-level architectural plan and data model designed.
    * **Architectural Pivot Complete:** Final direction is a Confluence-Integrated Application, strictly aligned with the bank's technology portfolio.
    * **Technology Stack Finalized:** Frontend (vanilla JS/HTML/CSS), Backend (ScriptRunner/Groovy), Database (PostgreSQL), Real-time (AJAX polling).
    * **Local Dev Environment Stabilized:** Podman/Ansible orchestration, manual ScriptRunner install via Confluence UI, memory allocation increased to 6GB, live reload validated for backend and frontend.
    * **Documentation Discipline:** All major decisions and changes are captured in ADRs, README, and CHANGELOG.

## 2. What's Left to Build (MVP Scope)

* **Phase 1: Setup**
    * Provision and configure the PostgreSQL database instance.
    * Implement the finalized database schema.
    * Configure the Confluence space and necessary ScriptRunner listeners.
* **Phase 2: Backend Development (ScriptRunner)**
    * Build core REST endpoints for CRUD operations (Plans, Chapters, Steps, Tasks, Controls, etc.).
    * Implement backend logic for the event log system.
    * Implement backend logic for the Planning Feature, including HTML export endpoint.
    * Integrate with Exchange server for email notifications.
* **Phase 3: Frontend Development (Confluence Macro)**
    * Build the HTML structure and CSS for the main dashboard.
    * Write JavaScript for fetching and rendering the runbook state (via polling).
    * Develop UI components for status changes, comments, and controls.
    * Build the "Planner" view UI.
* **Phase 4: Deployment & Testing**
    * Deploy the macro and scripts to a staging Confluence instance.
    * Define and execute a data import strategy for existing runbooks.
    * Conduct User Acceptance Testing (UAT) with cutover pilots.

## 3. Known Issues & Risks

* **Aggressive Timeline:** The four-week MVP timeline is challenging, especially with the vanilla JS constraint.
* **ScriptRunner Performance:** Must validate performance and scalability under load.
* **Manual Steps:** Manual plugin installation is now required for reliability.
* **Data Migration:** A plan for importing/migrating data from Draw.io/Excel to PostgreSQL is still needed.
