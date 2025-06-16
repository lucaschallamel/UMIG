# Active Context

## 1. Current Work Focus

The project is in the **architectural finalisation phase**. The last session's focus was to refine the initial architectural proposal to align it strictly with the bank's approved technology portfolio and to incorporate the new macro-planning feature.

## 2. Recent Changes & Decisions

*   **Pivotal Decision:** The architecture is confirmed as the **Confluence-Integrated Application**. A standalone NodeJS application was rejected due to the high risk to the timeline associated with building a frontend from scratch and integrating with enterprise services.
*   **Technology Confirmation:** The application will be built as a custom macro within Confluence. The frontend will use HTML/JavaScript/CSS. The backend will be implemented using **Atlassian ScriptRunner** (Groovy) exposing custom REST endpoints.
*   **Database Confirmation:** **PostgreSQL** is confirmed as the database. SQLite has been explicitly rejected due to its limitations with concurrent write operations.
*   **Real-Time Pattern:** "Real-time" updates will be implemented via **AJAX polling** from the frontend JavaScript to the ScriptRunner backend, not WebSockets.
*   **Integration Confirmation:** Authentication and user management will be handled by Confluence's native integration with **Enterprise Active Directory**. Email notifications will be sent via ScriptRunner's integration with the enterprise **Exchange Server**.
*   **New Feature Architected:** The "Planning Feature" has been designed. It includes a new database table (`chapter_schedules`) and a ScriptRunner endpoint to generate a shareable HTML macro-plan.

## 3. Next Steps

1.  Provision the PostgreSQL database instance and create the full database schema.
2.  Set up a dedicated Confluence space for the application.
3.  Begin development of the backend REST API endpoints in ScriptRunner for core CRUD operations on steps and tasks.
4.  Begin development of the initial HTML and JavaScript shell for the Confluence macro, focusing first on rendering a static view of the runbook from the database.