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
* **ScriptRunner Integration Patterns:** Critical deployment patterns established through US-001 completion (31 July 2025)
  * **Lazy Repository Loading:** Prevents class loading conflicts in ScriptRunner environment
  * **Connection Pool Configuration:** Dedicated 'umig_db_pool' setup with PostgreSQL JDBC
  * **Single File Per Endpoint:** Eliminates ScriptRunner endpoint confusion
  * **Type Safety Enforcement:** Explicit UUID.fromString() and Integer.parseInt() casting for all parameters
* **Testing:** A formal integration testing framework (ADR-019) is established, and specificity in test mocks is enforced (ADR-026).
* **Data Utilities:** Node.js is adopted for data utilities (ADR-013), with comprehensive synthetic data generation using 3-digit prefixed generators.
* **Database Naming Conventions:** Standardised database naming conventions (ADR-014) are implemented across all entities.
* **Control and Instruction Refactoring:** Controls are linked to phases, and instructions are streamlined (ADR-016).
* **Dev Environment Orchestration:** Node.js-based orchestration (ADR-025) replaces shell scripts for the local development environment.
* **Modular Frontend Architecture:** JavaScript applications are built with modular architecture (8-module pattern) replacing monolithic approaches.
* **Documentation Standards:** Comprehensive API documentation with OpenAPI specifications and generated Postman collections ensure consistency.
* **Architecture Documentation:** All 33 ADRs consolidated into solution-architecture.md as single source of truth.
* **Instructions API Pattern:** Template-based instruction management (US-004, 5 August 2025)
  * **Template Architecture:** Master/instance pattern supporting instruction templates with execution instances
  * **Hierarchical Integration:** Complete filtering across migration→iteration→plan→sequence→phase→step levels
  * **Workflow Integration:** Seamless integration with Steps, Teams, Labels, and Controls for complete instruction lifecycle
  * **Bulk Operations:** Efficient multi-instruction management for complex migration scenarios
  * **Executive Documentation:** Stakeholder-ready architecture presentations and comprehensive technical documentation
* **Controls API Pattern:** Quality gate management system (US-005, 6 August 2025)
  * **Quality Gate Architecture:** Phase-level control points with critical/non-critical types per ADR-016
  * **Control Status Lifecycle:** PENDING → VALIDATED/FAILED → OVERRIDDEN workflow with audit trail
  * **Progress Calculation:** Real-time status tracking with weighted aggregation for phase completion
  * **Bulk Operations:** Efficient control instantiation and validation across multiple phases
  * **Emergency Override:** Critical path functionality with full audit trail capturing reason, actor, and timestamp
  * **Database Validation:** 184 control instances with proper hierarchical relationships and 41.85% critical distribution
* **Association Management Pattern:** Many-to-many relationships are managed through dedicated API endpoints with add/remove functionality and proper UI integration.
* **Dynamic Filtering Pattern:** Hierarchical dropdowns dynamically filter based on parent selections (e.g., steps filtered by selected migration).
* **Data Import Strategy:** Efficient bulk loading using PostgreSQL `\copy` command (ADR-028) for importing Confluence JSON exports.
* **Standalone Step View Pattern:** URL parameter-driven macros for focused task execution with complete feature parity to main interfaces.
* **Custom Confirmation Dialog Pattern:** Promise-based confirmation system replacing native dialogs to prevent UI flickering in complex modal contexts.
* **Environment Assignment Rules:** Strict business rules ensuring RUN/DR iterations avoid PROD environment whilst CUTOVER iterations always have PROD assigned.
* **Data Generation Patterns:** Uniqueness tracking and retry logic with automatic suffix generation for preventing constraint violations.
* **Development Infrastructure Patterns:** Enhanced tooling established through US-001 (31 July 2025)
  * **Automated Postman Collection Generation:** 28,374-line collection with auto-auth and dynamic baseUrl configuration
  * **Environment-Driven Configuration:** .env and .env.example enhanced for Podman database environments
  * **Documentation Streamlining:** 72% reduction in CLAUDE.md complexity whilst improving clarity and usability
* **Structured Documentation Organization:** Complete roadmap reorganization (31 July 2025)
  * **Sprint-Based Organization:** `/docs/roadmap/sprint3/` subfolder with user stories, technical tasks, and progress tracking
  * **UI/UX Centralization:** `/docs/roadmap/ux-ui/` subfolder with interface specifications, design assets, and templates
  * **Clear Separation of Concerns:** Development (sprints) vs Design (ux-ui) with dedicated README files
  * **Scalable Structure:** Ready for sprint1/, sprint2/, sprint3/ expansion and additional UI components
* **Control Point System Patterns:** Enterprise-grade quality gate management (4 August 2025)
  * **Multi-Type Validation:** MANDATORY/OPTIONAL/CONDITIONAL control types with state machine (PENDING→VALIDATED/FAILED→OVERRIDDEN)
  * **Emergency Override Capability:** Critical path functionality with full audit trail capturing reason, actor, and timestamp
  * **Weighted Progress Aggregation:** 70% step completion + 30% control point validation for accurate phase progress
  * **Transaction-Safe Operations:** Control point updates wrapped in database transactions with rollback capability
  * **Hierarchical Validation:** Control points cascade through phases with parent-child validation dependencies
* **Groovy Static Type Checking Patterns:** Enhanced type safety for production reliability (5 August 2025)
  * **Explicit Type Casting:** All query parameters cast explicitly (UUID.fromString(), Integer.parseInt(), Boolean.valueOf())
  * **Collection Type Safety:** Proper List<Map> declarations with explicit casting for query results
  * **Method Signature Standardisation:** Clear parameter types and return types across all API endpoints and repositories
  * **Variable Declaration:** Explicit 'def' declarations preventing undeclared variable errors
  * **Static Analysis Compliance:** Full Groovy 3.0.15 compatibility with enhanced IDE support and error detection
  * **Error Prevention:** Compile-time validation eliminating ClassCastException and NoSuchMethodException runtime errors

## 3. Component Relationships

* `Confluence Page` -> hosts -> `Custom Macro (HTML/JS/CSS)`
* `Custom Macro` -> makes AJAX calls to -> `ScriptRunner REST Endpoints`
* `ScriptRunner REST Endpoints` -> execute logic and query -> `PostgreSQL Database`
* `ScriptRunner` -> sends email via -> `Confluence Mail API / MailHog (local testing)`
* `EmailService` -> processes templates with -> `SimpleTemplateEngine`
* `Email System` -> logs all events to -> `audit_log_aud` table with JSONB details
