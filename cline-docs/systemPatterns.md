# System Patterns

## 1. System Architecture

The system is designed as a **Confluence-Integrated Application**, leveraging the Atlassian platform as the host.
1.  **Host Platform:** A single Atlassian Confluence page serves as the application container and entry point for all users.
2.  **Frontend:** A custom Confluence Macro built with **HTML, JavaScript, and CSS**. This macro renders the entire user interface, including the live dashboard and planning views.
3.  **Backend:** **Atlassian ScriptRunner** provides the backend business logic. Scripts written in Groovy expose custom REST API endpoints that the frontend JavaScript consumes.
4.  **Database:** A central **PostgreSQL** database serves as the single source of truth for all runbook data, schedules, statuses, and audit logs. The application data is explicitly stored outside of Confluence itself.

## 2. Key Technical Decisions

*   **Architectural Model:** The Confluence-Integrated model was chosen to maximise the use of the existing technology portfolio, significantly reducing development overhead for authentication, user management, and email integration, thus making the project feasible within the timeline.
*   **Real-Time Updates:** The UI will achieve a near-real-time feel via **AJAX Polling**. The frontend JavaScript will poll the ScriptRunner REST endpoints at a regular interval (e.g., every 5-10 seconds) to fetch the latest state and update the DOM.
*   **Data Model:** The core normalised relational data model is used, employing UUIDs for internal keys and storing human-readable identifiers separately. Key aspects include:
    *   **Canonical vs. Instance:** Clear separation between reusable master plans/steps and their executable instances.
    *   **Hierarchy:** `Implementation Plan > Macro-Phase > Chapter > Step > Task`.
    *   **Many-to-Many Relationships:** Association (join) tables are used for `step_dependencies`, `step_iteration_scope`, `task_controls_link`, and `teams_tms_x_users_usr` (for user-team membership).
    *   **Control Status per Iteration:** The status of a `Control` is tracked per-iteration using a join table (`control_iteration_status`) that contains the status (`PASSED`, `FAILED`) as payload.
*   **Planning Feature Pattern:** A dedicated table, `chapter_schedules`, stores the planned start/end times for each chapter per iteration. A specific ScriptRunner endpoint (`/schedule/export`) is responsible for querying this data and generating a clean, portable HTML `<table>` as a shareable artifact.
*   **Auditing Pattern:** An immutable `event_log` table will capture every critical action (status change, email sent, user comment). Each log entry will have a precise timestamp, event type, relational links, and a flexible JSONB field for contextual details. This pattern ensures full auditability and facilitates analytics.
*   **Decoupled Orchestration Engine:** While integrated within Confluence, the core logic and data are separate. The PostgreSQL database holds the state, and ScriptRunner acts as the brain, ensuring the system is more than just a documentation add-on.

## 3. Component Relationships

```mermaid
erDiagram
    Confluence --o| CustomMacro : "hosts"
    CustomMacro --o| ScriptRunnerAPI : "makes AJAX calls to"
    ScriptRunnerAPI --o| PostgreSQLDB : "queries"
    ScriptRunnerAPI --o| ExchangeServer : "sends email via"
```

For a detailed Entity Relationship Diagram (ERD) of the data model, refer to `docs/dataModel/README.md`.
