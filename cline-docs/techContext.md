# Technology Context

## 1. Approved Core Technologies

* **Platform Host:** Atlassian Confluence with ScriptRunner for Confluence plugin.
* **Backend Logic:** Atlassian ScriptRunner for Confluence (using the Groovy language with static type checking).
* **Frontend:** Standard HTML5, CSS3, and JavaScript (ES6+) with modular architecture patterns.
* **Database:** PostgreSQL 14 with Liquibase for schema management.
* **Visualisation Aid:** Draw.io (Diagrams.net) plugin for Confluence (as a visual reference, not the source of truth).
* **Deployment & Configuration:**
  * **Containerisation:** Podman for local development environment with comprehensive orchestration.
  * **Scripting:** Node.js for environment setup and configuration management (replacing Ansible).
* **Enterprise Integrations:**
  * **Authentication:** Enterprise Active Directory (via Confluence's native integration).
  * **Email:** Confluence native mail API with MailHog for local testing (ADR-032).
* **Data Utilities:** Node.js for comprehensive data generation, import scripts, and synthetic data creation.
* **API Documentation:** OpenAPI 3.0 specifications with generated Postman collections.
* **Testing:** Jest for Node.js utilities, Groovy for integration tests.

## 2. Development Setup

* **Version Control:** Git with feature branch workflow.
* **IDE:** Visual Studio Code with relevant plugins for JavaScript, Groovy, and OpenAPI.
* **Collaboration Tools:** Atlassian JIRA for task management.
* **Local Development:** Node.js orchestrated Podman containers with PostgreSQL, Confluence, and MailHog.
* **Data Generation:** Comprehensive synthetic data generators with 3-digit prefixes (001-101).
* **API Testing:** Postman collections automatically generated from OpenAPI specifications.

## 3. Technical Constraints

* **No External Frameworks:** The frontend must be built with "vanilla" JavaScript. No external libraries like React, Vue, or Angular are permitted. Modular architecture achieved through IIFE patterns and careful DOM management.
* **Platform Dependency:** The application's performance and availability are tightly coupled to the enterprise Confluence instance.
* **Database Choice:** SQLite is explicitly disallowed for this project due to concurrency requirements.
* **Type Safety:** Explicit casting required in Groovy for static type checking compliance.
* **API Standards:** All endpoints must follow standardised REST patterns with proper error handling.

## 4. Proven Patterns

* **Canonical vs Instance:** Reusable master templates with time-bound execution instances with full attribute instantiation (ADR-029).
* **Hierarchical Filtering:** Progressive filtering across Migration → Iteration → Plan → Sequence → Phase levels (ADR-030).
* **SPA + REST:** Single-page applications with RESTful backend APIs.
* **N-Tier Architecture:** 5-layer separation of concerns (UI, Business Process, Business Objects, Data Transformation, Data Access) (ADR-027).
* **Modular JavaScript:** 8-module architecture (EntityConfig, UiUtils, AdminGuiState, ApiClient, AuthenticationManager, TableManager, ModalManager, AdminGuiController).
* **Error Handling:** SQL state mapping with detailed error messages (23503→400, 23505→409).
* **Type Safety:** Robust Groovy patterns with explicit casting for UUID and Integer parameters (ADR-031).
* **Documentation:** All 33 ADRs consolidated into solution-architecture.md as single source of truth.
* **Association Management:** Dedicated API endpoints for managing many-to-many relationships with UI integration.
* **Dynamic UI Updates:** Event-driven updates with onchange handlers for cascading selections.
* **Accessibility:** Color picker implementations with contrast calculation for readability.
* **Email Notification System:** Template-based notifications with GString processing, multi-team routing, and JSONB audit logging (ADR-032).
* **Template Management:** Database-stored email templates with HTML/text content and variable substitution.
* **Testing Framework:** ScriptRunner Console integration for end-to-end email notification testing.
* **Role-Based Access Control:** Three-tier permission system with Confluence integration (ADR-033).
* **Data Import:** Efficient bulk loading using PostgreSQL `\copy` command for JSON imports (ADR-028).
