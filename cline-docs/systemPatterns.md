# System Patterns

## 1. System Architecture

The system is designed as a **Confluence-Integrated Application**, leveraging the Atlassian platform as the host.
1. **Host Platform:** A single Atlassian Confluence page serves as the application container and entry point for all users.
2. **Frontend:** A custom Confluence Macro built with **HTML, JavaScript, and CSS**. This macro renders the entire user interface, including the live dashboard and planning views.
3. **Backend:** **Atlassian ScriptRunner** provides the backend business logic. Scripts written in Groovy expose custom REST API endpoints that the frontend JavaScript consumes.
4. **Database:** A central **PostgreSQL** database serves as the single source of truth for all runbook data, schedules, statuses, and audit logs. The application data is explicitly stored outside of Confluence itself.

## 2. Key Technical Decisions

* **Architectural Model:** The Confluence-Integrated model was chosen to maximise the use of the existing technology portfolio, significantly reducing development overhead for authentication, user management, and email integration, thus making the project feasible within the timeline.
* **N-Tier Architecture:** Structured 5-layer architecture (ADR-027) with clear separation of concerns:
  * UI Layer (JavaScript/AUI), Business Process Layer (Groovy), Business Objects Layer, Data Transformation Layer, Data Access Layer (Repository pattern)
* **Real-Time Updates:** The UI achieves a near-real-time feel via **AJAX Polling**. The frontend JavaScript polls the ScriptRunner REST endpoints at regular intervals (5-10 seconds) to fetch the latest state and update the DOM.
* **Data Model:** A normalised relational data model is used, with mixed ID strategies (UUIDs for hierarchical entities, integers for reference entities).
  * **Hierarchical Structure:** The core `Migration > Iteration > Plan > Sequence > Phase > Step > Instruction` hierarchy is modelled with one-to-many relationships.
  * **Many-to-Many Relationships:** Association (join) tables manage complex relationships: `teams_tms_x_users_usr`, `labels_lbl_x_steps_master_stm`, `applications_app_x_environments_env`, `environments_env_x_iterations_ite`.
  * **Instance Data:** Full attribute instantiation for instance tables (ADR-029) implemented for flexibility and auditability.
  * **Iteration-Centric:** The data model is iteration-centric (ADR-024), decoupling migrations from plans and linking iterations to plans.
* **State Management with Payload:** The status of entities is tracked per-iteration using join tables that contain status information as payload, preventing data ambiguity between runs.
* **Auditing Pattern:** An immutable `event_log` table captures every critical action (status change, email sent, user comment) with precise timestamps, event types, relational links, and flexible JSONB fields for contextual details.
* **Email Notification System:** Production-ready automated notifications with template management (ADR-032)
  * Confluence native mail API integration with MailHog for local testing
  * Multi-team notification logic (owner + impacted teams + cutover teams)
  * Template management with HTML/text content and GString variable processing
  * Comprehensive JSONB audit logging for all email events
  * Automatic notifications for step opened, instruction completed, and status changes
* **Role-Based Access Control:** Three-tier permission system (ADR-033)
  * NORMAL (read-only), PILOT (operational), ADMIN (full access) roles
  * Confluence authentication integration with automatic role detection
  * CSS-based UI control (`pilot-only`, `admin-only` classes)
  * Backend validation and frontend enforcement of permissions
* **Planning Feature Pattern:** Dedicated schedule tables store planned start/end times per iteration. ScriptRunner endpoints generate clean, portable HTML artifacts as shareable macro-plans.
* **API Standardisation:** Standardised REST API patterns (ADR-023) are enforced, including detailed error handling, consistent responses, and hierarchical filtering (ADR-030).
* **Type Safety:** Robust Groovy type safety and filtering patterns (ADR-031) are applied, preventing runtime errors through explicit casting.
* **Testing:** A formal integration testing framework (ADR-019) is established, and specificity in test mocks is enforced (ADR-026).
* **Data Utilities:** Node.js is adopted for data utilities (ADR-013), with comprehensive synthetic data generation using 3-digit prefixed generators.
* **Database Naming Conventions:** Standardised database naming conventions (ADR-014) are implemented across all entities.
* **Control and Instruction Refactoring:** Controls are linked to phases, and instructions are streamlined (ADR-016).
* **Dev Environment Orchestration:** Node.js-based orchestration (ADR-025) replaces shell scripts for the local development environment.
* **Modular Frontend Architecture:** JavaScript applications are built with modular architecture (8-module pattern) replacing monolithic approaches.
* **Documentation Standards:** Comprehensive API documentation with OpenAPI specifications and generated Postman collections ensure consistency.
* **Architecture Documentation:** All 33 ADRs consolidated into solution-architecture.md as single source of truth.
* **Association Management Pattern:** Many-to-many relationships are managed through dedicated API endpoints with add/remove functionality and proper UI integration.
* **Dynamic Filtering Pattern:** Hierarchical dropdowns dynamically filter based on parent selections (e.g., steps filtered by selected migration).
* **Data Import Strategy:** Efficient bulk loading using PostgreSQL `\copy` command (ADR-028) for importing Confluence JSON exports.

## 3. Component Relationships

* `Confluence Page` -> hosts -> `Custom Macro (HTML/JS/CSS)`
* `Custom Macro` -> makes AJAX calls to -> `ScriptRunner REST Endpoints`
* `ScriptRunner REST Endpoints` -> execute logic and query -> `PostgreSQL Database`
* `ScriptRunner` -> sends email via -> `Confluence Mail API / MailHog (local testing)`
* `EmailService` -> processes templates with -> `SimpleTemplateEngine`
* `Email System` -> logs all events to -> `audit_log_aud` table with JSONB details
