---
trigger: always_on
---

# Consolidated Project & Coding Rules

This document contains a consolidated summary of the key rules for this project, derived from the detailed rule files in the repository. Its purpose is to provide a central, scannable reference for all development work.

---

## Reference Codes & Trigrams Index

Below are all reference codes and trigrams used throughout the UMIG rulebook for precise, unambiguous governance and review:

### Core Coding Principles & Workflow
- [SF] Simplicity First
- [RP] Readability Priority
- [DM] Dependency Minimalism
- [ISA] Industry Standards Adherence
- [SD] Strategic Documentation
- [TDT] Test-Driven Thinking
- [DM-1] Review dependencies for vulnerabilities
- [DM-2] Prefer signed/verified packages
- [DM-3] Remove unused/outdated dependencies
- [DM-4] Document dependency updates
- [WF-FOCUS] Focus on code relevant to the task
- [WF-SCOPE] Don’t touch unrelated code
- [WF-TEST] Write thorough tests
- [WF-ARCH] Avoid major changes to proven patterns
- [WF-IMPACT] Consider impact on other code
- [AC] Atomic Changes
- [CD] Commit Discipline
- [TR] Transparent Reasoning
- [CWM] Context Window Management
- [DRY] DRY Principle
- [CA] Clean Architecture
- [REH] Robust Error Handling
- [CSD] Code Smell Detection

### Security & Performance
- [IV] Input Validation
- [RM] Resource Management
- [CMV] Constants Over Magic Values
- [SFT] Security-First Thinking
- [PA] Performance Awareness
- [RL] Rate Limit APIs
- [RLS] Row-Level Security
- [CAP] Captcha on Auth
- [WAF] Web Application Firewall
- [SEC-1] No secrets access without approval

### AI Communication
- [RAT] Rule Application Tracking
- [EDC] Explanation Depth Control
- [AS] Alternative Suggestions
- [KBT] Knowledge Boundary Transparency

### Microservice Patterns (Chris Richardson)
- [MON] Monolithic Architecture
- [MSA] Microservice Architecture
- [DBC] Decompose by Business Capability
- [DSD] Decompose by Subdomain
- [RPI] Remote Procedure Invocation
- [MSG] Messaging
- [CBR] Circuit Breaker
- [SDC] Service Discovery
- [DPS] Database per Service
- [SAG] Saga
- [OUT] Transactional Outbox
- [DOM] Domain Model
- [TSF] Transaction Script
- [AGG] Aggregate
- [DME] Domain Events
- [EVS] Event Sourcing
- [APC] API Composition
- [CQR] Command Query Responsibility Segregation
- [APG] API Gateway
- [BFF] Backends for Frontends
- [CDC] Consumer-Driven Contract Test
- [SCT] Service Component Test
- [SVC] Service as a Container
- [SRL] Serverless Deployment
- [MSC] Microservice Chassis
- [SMH] Service Mesh
- [STR] Strangler Application

---

## 1. Project Guidelines

### Architecture
- [MSA] The project follows a **Microservice-Oriented Architecture**.
- [TFA][MSA] All development must adhere to the principles in the **Twelve-Factor App** and [MSA] **Microservice Patterns** rule files.

### Documentation & ADRs
- [SD] Keep `README.md`, `CHANGELOG.md`, and other documentation in `/docs` continuously updated.
- [SD] Create Architecture Decision Records (ADRs) in `/docs/adr` for all significant architectural changes, including dependency changes, new patterns, or schema modifications.

### Code Style & Patterns
- [ISA] Use OpenAPI Generator for generating API clients.
- [CA] Prefer composition over inheritance.
- [CA] Use the repository pattern for data access.
- [REH] Follow established error handling patterns.

### Testing
- [WF-TEST] Mandate unit tests for business logic, integration tests for API endpoints, and E2E tests for critical user flows.
- [AC][CSD] Ensure all synthetic data generation scripts are idempotent and robust.
- [WF-TEST] All tests must pass in CI before merging code.

### Security & Quality
- [IV] **Input Validation:** Validate all external data before processing.
- [RM] **Resource Management:** Close connections and free resources appropriately.
- [CMV] **Constants Over Magic Values:** Use named constants instead of magic strings/numbers.
- [SFT][PA] **Automation:** Use Semgrep for static analysis and MegaLinter for multi-language linting. All tools must pass in CI.
- [RLS][RL][CAP] **Access Control:** Implement Row-Level Security (RLS), rate limiting, and CAPTCHA on authentication routes.
- [SEC-1] **CRITICAL: Do not read or modify `.env` or any other secrets files without explicit user approval.**

### Local Development & CI/CD
- [CA] The local environment must be managed via the provided wrapper scripts for Podman/Docker and Ansible.
- [DM] All environment configuration must be version-controlled.
- CI/CD pipelines must run all linting, testing, and security scans, blocking merges on failure.

### Database Management
- [DPS] Use a dedicated tool (e.g., Liquibase) for automated, version-controlled migrations. Manual schema changes are prohibited.
- [DME] Maintain an up-to-date Entity Relationship Diagram (ERD) and a changelog for all database changes.
- [CA] Adhere to consistent, project-wide naming conventions (e.g., snake_case).

## 2. Core Coding Principles

- [SF] **Simplicity First:** Always choose the simplest viable solution.
- [RP] **Readability Priority:** Code must be immediately understandable by others.
- [DM] **Dependency Minimalism:** Do not add new libraries without clear justification.
- [ISA] **Industry Standards Adherence:** Follow established conventions for the language and stack.
- [SD] **Strategic Documentation:** Comment only on complex logic, not the obvious.
- [TDT] **Test-Driven Thinking:** Design all code to be inherently testable.
- [AC] **Atomic Changes:** Make small, self-contained modifications.
- [CD] **Commit Discipline:** Use Conventional Commit messages (`type(scope): message`).
- [DRY] **DRY Principle:** Do not repeat yourself; reuse and extend existing functionality.
- [CA] **Clean Architecture:** Generate cleanly formatted, logically structured code.
- [REH] **Robust Error Handling:** Integrate comprehensive error handling for all edge cases.
- [CSD] **Code Smell Detection:** Proactively refactor functions/files that are too long or have deep nesting.

## 3. Project Scaffolding

- The mandatory project structure includes: `.clineignore`, `.gitignore`, `README.md`, `LICENSE`, a `/.clinerules` folder, an `/app` folder for frontend, and an `/api` folder for backend.

## 4. The Twelve-Factor App Principles

1. **Codebase:** One codebase tracked in revision control, many deploys. A single codebase manages a single app.
2. **Dependencies:** Explicitly declare and isolate dependencies. Never rely on implicit system-wide packages.
3. **Config:** Store configuration in the environment. Enforce a strict separation between code and config.
4. **Backing Services:** Treat backing services as attached resources. Services are swappable and accessed via URLs/credentials in config.
5. **Build, Release, Run:** Strictly separate build, release, and run stages. Builds are immutable.
6. **Processes:** Execute the app as one or more stateless processes. Any state must be stored in a backing service.
7. **Port Binding:** Export services via port binding. The app is self-contained and does not rely on a runtime-injected webserver.
8. **Concurrency:** Scale out via the process model. Design for horizontal scaling by adding more concurrent processes.
9. **Disposability:** Maximize robustness with fast startup and graceful shutdown. Processes should be disposable and robust against sudden death.
10. **Dev/Prod Parity:** Keep development, staging, and production as similar as possible to catch bugs early.
11. **Logs:** Treat logs as event streams. Write to standard output and let the execution environment handle aggregation.
12. **Admin Processes:** Run admin/management tasks as one-off processes in the same environment as the application.

## 5. Microservice Architecture Patterns

- [DBC] **Decomposition:**
  - [DBC] **By Business Capability:** Define services based on what a business *does* (e.g., Order Management).
  - [DSD] **By Subdomain:** Define services around specific problem subdomains.
- [MSG][RPI][CBR][SDC] **Communication:**
  - [MSG] **Asynchronous Messaging:** Prefer for inter-service communication to promote loose coupling and resilience.
  - [RPI] **Synchronous RPI (REST/gRPC):** Use where appropriate, but be aware of tighter coupling.
  - [CBR] **Circuit Breaker:** Prevent network or service failures from cascading.
  - [SDC] **Service Discovery:** Enable clients to find service instances in a dynamic environment.
- [DPS][SAG][OUT] **Data Management:**
  - [DPS] **Database per Service:** Each microservice owns and is solely responsible for its own data.
  - [SAG] **Saga Pattern:** Manage data consistency across services using a sequence of local transactions.
  - [OUT] **Transactional Outbox:** Reliably publish events/messages as part of a local database transaction.
- [APC][CQR] **Querying:**
  - [APC] **API Composition:** A client or API Gateway retrieves and joins data from multiple services. Simple but can be inefficient.
  - [CQR] **CQRS (Command Query Responsibility Segregation):** Maintain denormalized, read-optimized view databases for complex queries.
- [APG][BFF] **External APIs:**
  - [APG] **API Gateway:** A single entry point for all external clients, handling routing, composition, and cross-cutting concerns.
  - [BFF] **Backends for Frontends (BFF):** A tailored API gateway for each specific client type (e.g., mobile vs. web).
- [CDC][SCT] **Testing:**
  - [CDC] **Consumer-Driven Contract Tests:** Ensure services can communicate correctly without full end-to-end tests.
  - [SCT] **Service Component Tests:** Test individual services in isolation, using stubs for dependencies.
- [SVC][MSC][SMH] **Deployment & Cross-Cutting Concerns:**
  - [SVC] **Containerization:** Package each service as a container (e.g., Docker).
  - [MSC][SMH] **Microservice Chassis / Service Mesh:** Use frameworks or infrastructure layers to handle concerns like config, health checks, and tracing.
- [STR] **Refactoring:**
  - [STR] **Strangler Application:** Incrementally migrate a monolith by building new microservices around it.