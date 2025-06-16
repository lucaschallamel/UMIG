# Project Progress

## 1. What Works / Completed

*   **Phase 0: Discovery & Design**
    *   Initial requirements have been gathered.
    *   The core problems with the existing system have been documented.
    *   A high-level architectural plan and data model have been designed.
    *   **Decision:** A final architectural direction, the **Confluence-Integrated Application**, has been selected and ratified based on the bank's strict technical constraints.
    *   **Decision:** The technology stack has been finalised.
    *   The design for the new "Planning Feature" has been completed and integrated into the architecture.

## 2. What's Left to Build (MVP Scope)

*   **Phase 1: Setup**
    *   Provision and configure the PostgreSQL database instance.
    *   Implement the full, finalised database schema.
    *   Configure the Confluence space and necessary ScriptRunner listeners.
*   **Phase 2: Backend Development (ScriptRunner)**
    *   Build the core REST endpoints for all CRUD operations (Plans, Chapters, Steps, Tasks, Controls, etc.).
    *   Implement the backend logic for the `event_log` system.
    *   Implement the backend logic for the Planning Feature, including the HTML export endpoint.
    *   Connect to the Exchange server for email notifications.
*   **Phase 3: Frontend Development (Confluence Macro)**
    *   Build the HTML structure and CSS for the main dashboard.
    *   Write the JavaScript for fetching and rendering the runbook state (via polling).
    *   Develop the UI components for changing status, adding comments, and interacting with controls.
    *   Build the "Planner" view UI.
*   **Phase 4: Deployment & Testing**
    *   Deploy the macro and scripts to a staging Confluence instance.
    *   Define a data import strategy and process for the existing runbook.
    *   Conduct User Acceptance Testing (UAT) with the cutover pilots.

## 3. Known Issues & Risks

*   **Risk:** The four-week timeline is extremely aggressive. Development with "vanilla" JavaScript is more time-consuming than with modern frameworks.
*   **Risk:** Potential performance bottlenecks in ScriptRunner under heavy load during a cutover weekend must be considered and tested.
*   **To Do:** A data import/migration plan from the existing Draw.io/Excel files into the new PostgreSQL schema must be designed and executed.