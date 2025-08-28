# UMIG Architecture Foundation

**Version:** 2025-08-27  
**Part of:** [UMIG Solution Architecture](./solution-architecture.md)  
**Navigation:** [API & Data](./api-data-architecture.md) | [Development & Operations](./development-operations.md) | [Specialized Features](./specialized-features.md) | [Implementation Patterns](./implementation-patterns.md)

## Overview

This document establishes the foundational architecture principles, system structure, and core technology stack for the UMIG project. It serves as the base reference for all architectural decisions and system design patterns.

---

## 1. Introduction & Scope

This document consolidates all key architectural and solution design decisions for the UMIG project. It serves as the single source of truth for the project's technical and functional architecture, superseding the individual Architectural Decision Records (ADRs) which are now archived. Its purpose is to provide a clear, comprehensive, and up-to-date reference for development, onboarding, and strategic planning.

---

## 2. Core Principles & Philosophy

The UMIG project adheres to a set of core principles that guide all development and architectural decisions:

- **Confluence-Native Integration:** The application is built as a deeply integrated Confluence application, not a standalone system, to leverage existing enterprise infrastructure, user familiarity, and collaboration features. ([ADR-001])
- **Simplicity & Maintainability:** We prioritize simple, direct, and maintainable solutions over complex ones. This is reflected in our choice of a pure ScriptRunner architecture, vanilla JavaScript, and standardized patterns. ([ADR-002], [ADR-004], [ADR-023])
- **Microservice-Inspired Modularity:** While not a full microservices environment, the architecture is modular, with clear separation between the frontend, backend API, database, and development tooling. ([ADR-018])
- **Twelve-Factor App Compliance:** The application follows the principles of the Twelve-Factor App methodology to ensure it is scalable, resilient, and portable across environments. This includes a strict separation of code and configuration, explicit dependency management, and treating logs as event streams.
- **Automation & Reproducibility:** The local development environment and data management tasks are fully automated and orchestrated with NodeJS, Podman, and Ansible to ensure consistency and reliability. ([ADR-006], [ADR-013], [ADR-025])

---

## 3. System Architecture

### 3.1. High-Level Components

The UMIG application consists of four primary, decoupled components:

1. **Frontend (UI):** A client-side application running within the user's browser, rendered inside Confluence pages. It is built with vanilla JavaScript and Atlassian User Interface (AUI) components.
2. **Backend (API):** A set of RESTful endpoints implemented as Groovy scripts within Atlassian ScriptRunner. This layer handles all business logic and data access.
3. **Database:** A PostgreSQL database that serves as the persistent data store for all application entities.
4. **Development Environment:** A containerized local development stack managed by Podman and orchestrated by NodeJS scripts.

### 3.2. N-Tier Architecture Model ([ADR-027])

The UMIG application follows a structured N-Tier architecture to ensure clear separation of concerns and maintainability:

#### Architecture Layers

1. **UI (User Interface) Layer**
   - **Technology:** Vanilla JavaScript with Atlassian AUI components
   - **Responsibilities:** User interaction, visual presentation, client-side validation
   - **Components:** ScriptRunner macros, JavaScript controllers, CSS styling

2. **Business Process Layer**
   - **Technology:** Groovy scripts in ScriptRunner
   - **Responsibilities:** Workflow orchestration, business rules, process coordination
   - **Components:** API endpoint handlers, process orchestrators

3. **Business Objects Definition Layer**
   - **Technology:** Groovy classes and data structures
   - **Responsibilities:** Domain model definitions, business entity representations
   - **Components:** Entity classes, value objects, business rule validators

4. **Data Transformation Layer**
   - **Technology:** Groovy transformation logic
   - **Responsibilities:** Data mapping between layers, format conversions, aggregations
   - **Components:** Repository result mappers, API response builders

5. **Data Access Layer (DAL)**
   - **Technology:** Groovy repository pattern with SQL
   - **Responsibilities:** Database interactions, query optimization, connection management
   - **Components:** Repository classes, DatabaseUtil, SQL query builders

#### Benefits of N-Tier Architecture

- **Improved Structure:** Clear separation between presentation, business logic, and data access
- **Enhanced Scalability:** Each tier can be optimized independently
- **Better Reusability:** Business logic can be shared across different UI components
- **Parallel Development:** Teams can work on different tiers simultaneously
- **Easier Testing:** Each tier can be tested in isolation

### 3.3. Project Structure ([ADR-018])

To support this architecture, the project follows a "Pure ScriptRunner" file structure, avoiding the complexity of a formal Atlassian plugin. **Updated July 2025** to use a consolidated `umig/` namespace:

```
src/
└── groovy/
    └── umig/              # UMIG namespace for all backend code
        ├── macros/        # ScriptRunner Script Macros for UI rendering
        │   └── v1/        # Versioned macro implementations
        ├── api/           # REST API endpoint scripts
        │   ├── v1/, v2/   # Versioned API implementations
        ├── repository/    # Data access layer (repository pattern)
        ├── utils/         # Shared Groovy utilities
        ├── web/           # Frontend assets (JS/CSS) for macros
        │   ├── js/        # JavaScript assets
        │   └── css/       # CSS assets
        └── tests/         # Groovy-based tests (integration/unit)
            ├── apis/      # API endpoint tests
            └── integration/ # Integration tests
```

- **`groovy/umig/`**: All code is under the UMIG namespace for clarity, future-proofing, and avoiding name collisions.
- **`macros/`**: Groovy scripts that render container HTML and load JS/CSS assets; no business logic.
- **`api/`**: REST endpoint scripts using ScriptRunner's CustomEndpointDelegate pattern.
- **`repository/`**: Data access layer following repository pattern for testability and separation of concerns.
- **`web/`**: All frontend assets, versioned and referenced by macros.
- **`tests/`**: Comprehensive test suite for APIs and integration scenarios.

---

## 4. Technology Stack

### 4.1. Backend Technology Stack ([ADR-002])

- **Platform:** Atlassian Confluence 9.2.7 + ScriptRunner 9.21.0 (US-032 upgraded August 2025).
- **Language:** Groovy 3.0.15 (static type checking compatible).
- **Container Runtime:** Podman with podman-compose orchestration.
- **Database:** PostgreSQL 14 with Liquibase migrations.
- **Security:** Patched critical CVEs (CVE-2024-21683, CVE-2023-22527, CVE-2024-1597).

#### Platform Compatibility Notes (US-032)

- **Confluence Version:** Requires Confluence 9.2.7 or later for security compliance and modern feature support.
- **ScriptRunner Version:** Requires ScriptRunner 9.21.0 for full compatibility with Confluence 9.2.7.
- **Container Image:** Uses consolidated atlassian/confluence:9.2.7 image (removed "server" designation).
- **JDK Runtime:** JDK 17 maintained as default runtime environment.
- **Upgrade Path:** Zero-downtime upgrade capability with enterprise backup/restore systems.

### 4.2. Frontend Technology Stack ([ADR-004])

- **Framework:** Vanilla JavaScript and the Atlassian User Interface (AUI) library.
- **Rationale:** This choice prioritizes simplicity, avoids the need for complex build toolchains, and ensures seamless visual integration with Confluence.

### 4.3. Database Technology ([ADR-003])

- **Database Engine:** PostgreSQL 14
- **Migration Management:** Liquibase for schema versioning and changes
- **Connection Management:** ScriptRunner database connection pooling ([ADR-010])
- **Containerization:** JDBC driver containerization for Confluence integration ([ADR-009])

---

## 5. Foundational ADR References

This architecture foundation consolidates the following core architectural decisions:

### Core Architecture & Technology Stack

- [ADR-001](../adr/archive/ADR-001-Confluence-Integrated-Application-Architecture.md) - Confluence-Integrated Application Architecture
- [ADR-002](../adr/archive/ADR-002-Backend-Implementation-with-Atlassian-ScriptRunner.md) - Backend Implementation with Atlassian ScriptRunner
- [ADR-003](../adr/archive/ADR-003-Database-Technology-PostgreSQL.md) - Database Technology: PostgreSQL
- [ADR-004](../adr/archive/ADR-004-Frontend-Implementation-Vanilla-JavaScript.md) - Frontend Implementation: Vanilla JavaScript
- [ADR-005](../adr/archive/ADR-005-Real-time-Update-Mechanism-AJAX-Polling.md) - Real-time Update Mechanism: AJAX Polling
- [ADR-027](../adr/archive/ADR-027-n-tiers-model.md) - N-tiers Model Architecture

### Development Environment & Operations Foundation

- [ADR-006](../adr/archive/ADR-006-Podman-and-Ansible-for-Local-Development-Environment.md) - Podman and Ansible for Local Development Environment
- [ADR-013](../adr/archive/ADR-013-Data-Utilities-Language-NodeJS.md) - Data Utilities Language: NodeJS
- [ADR-025](../adr/archive/ADR-025-NodeJS-based-Dev-Environment-Orchestration.md) - NodeJS-based Dev Environment Orchestration

### Application Structure Foundation

- [ADR-018](../adr/archive/ADR-018-Pure-ScriptRunner-Application-Structure.md) - Pure ScriptRunner Application Structure
- [ADR-020](../adr/archive/ADR-020-spa-rest-admin-entity-management.md) - SPA+REST Admin Entity Management

---

## 6. Real-Time Updates & UI Rendering

### 6.1. UI Rendering Pattern

- **Initial Load:** UI components are rendered via ScriptRunner **Macros**, which create placeholder HTML elements and load the main JavaScript controllers.
- **Dynamic Content:** All dynamic data is fetched from the backend REST APIs via asynchronous JavaScript (AJAX).
- **Real-time Updates ([ADR-005]):** The UI uses **AJAX polling** to periodically refresh data, providing a near-real-time user experience without the complexity of WebSockets.

### 6.2. Component Architecture

- **Macro-Based Rendering:** ScriptRunner macros serve as the entry point for UI components
- **JavaScript Controllers:** Separate controllers manage dynamic behavior and API communication
- **Asset Management:** Versioned CSS and JavaScript assets loaded by macros
- **State Management:** Client-side state management through JavaScript objects and local storage

---

## 7. Infrastructure Modernization (August 2025)

### 7.1. Complete Cross-Platform Compatibility

- **Shell Script Elimination:** 100% elimination of platform-specific shell scripts
- **JavaScript Testing Framework:** 13 specialized test runners with enhanced functionality
- **NPM Script Modernization:** 30+ commands updated with standardized interface
- **Service Layer Foundation:** TemplateRetrievalService.js and enhanced utilities established

### 7.2. Enterprise Infrastructure

- **Container Orchestration:** Podman-compose with service isolation
- **Backup Systems:** Enterprise backup/restore capabilities
- **Upgrade Automation:** Zero-downtime upgrade procedures
- **Quality Assurance:** Automated health monitoring and validation systems

---

## Navigation

- **Next:** [API & Data Architecture](./api-data-architecture.md) - REST API design, database patterns, and data management
- **Related:** [Development & Operations](./development-operations.md) - DevOps, testing, and operational patterns
- **See Also:** [Main Architecture Index](./solution-architecture.md) - Complete architecture navigation

---

_Part of UMIG Solution Architecture Documentation_
