---
trigger: always_on
---

# Consolidated Project & Coding Rules

This document contains a consolidated summary of the key rules for this project, derived from the detailed rule files in the repository. Its purpose is to provide a central, scannable reference for all development work.

## 1. Project Guidelines

### Architecture
- The project follows a **Microservice-Oriented Architecture**.
- All development must adhere to the principles in the **Twelve-Factor App** and **Microservice Patterns** rule files.

### Documentation & ADRs
- Keep `README.md`, `CHANGELOG.md`, and other documentation in `/docs` continuously updated.
- Create Architecture Decision Records (ADRs) in `/docs/adr` for all significant architectural changes, including dependency changes, new patterns, or schema modifications.

### Code Style & Patterns
- Use OpenAPI Generator for generating API clients.
- Prefer composition over inheritance.
- Use the repository pattern for data access.
- Follow established error handling patterns.

### Testing
- Mandate unit tests for business logic, integration tests for API endpoints, and E2E tests for critical user flows.
- Ensure all synthetic data generation scripts are idempotent and robust.
- All tests must pass in CI before merging code.

### Security & Quality
- **Input Validation (IV):** Validate all external data before processing.
- **Resource Management (RM):** Close connections and free resources appropriately.
- **Constants Over Magic Values (CMV):** Use named constants instead of magic strings/numbers.
- **Automation:** Use Semgrep for static analysis and MegaLinter for multi-language linting. All tools must pass in CI.
- **Access Control:** Implement Row-Level Security (RLS), rate limiting, and CAPTCHA on authentication routes.
- **CRITICAL: Do not read or modify `.env` or any other secrets files without explicit user approval.**

### Local Development & CI/CD
- The local environment must be managed via the provided wrapper scripts for Podman/Docker and Ansible.
- All environment configuration must be version-controlled.
- CI/CD pipelines must run all linting, testing, and security scans, blocking merges on failure.

### Database Management
- Use a dedicated tool (e.g., Liquibase) for automated, version-controlled migrations. Manual schema changes are prohibited.
- Maintain an up-to-date Entity Relationship Diagram (ERD) and a changelog for all database changes.
- Adhere to consistent, project-wide naming conventions (e.g., snake_case).

## 2. Core Coding Principles

- **Simplicity First (SF):** Always choose the simplest viable solution.
- **Readability Priority (RP):** Code must be immediately understandable by others.
- **Dependency Minimalism (DM):** Do not add new libraries without clear justification.
- **Industry Standards Adherence (ISA):** Follow established conventions for the language and stack.
- **Strategic Documentation (SD):** Comment only on complex logic, not the obvious.
- **Test-Driven Thinking (TDT):** Design all code to be inherently testable.
- **Atomic Changes (AC):** Make small, self-contained modifications.
- **Commit Discipline (CD):** Use Conventional Commit messages (`type(scope): message`).
- **DRY Principle:** Do not repeat yourself; reuse and extend existing functionality.
- **Clean Architecture (CA):** Generate cleanly formatted, logically structured code.
- **Robust Error Handling (REH):** Integrate comprehensive error handling for all edge cases.
- **Code Smell Detection (CSD):** Proactively refactor functions/files that are too long or have deep nesting.

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

- **Decomposition:**
  - **By Business Capability:** Define services based on what a business *does* (e.g., Order Management).
  - **By Subdomain (DDD):** Define services around specific problem subdomains.
- **Communication:**
  - **Asynchronous Messaging:** Prefer for inter-service communication to promote loose coupling and resilience.
  - **Synchronous RPI (REST/gRPC):** Use where appropriate, but be aware of tighter coupling.
  - **Circuit Breaker:** Prevent network or service failures from cascading.
  - **Service Discovery:** Enable clients to find service instances in a dynamic environment.
- **Data Management:**
  - **Database per Service:** Each microservice owns and is solely responsible for its own data.
  - **Saga Pattern:** Manage data consistency across services using a sequence of local transactions.
  - **Transactional Outbox:** Reliably publish events/messages as part of a local database transaction.
- **Querying:**
  - **API Composition:** A client or API Gateway retrieves and joins data from multiple services. Simple but can be inefficient.
  - **CQRS (Command Query Responsibility Segregation):** Maintain denormalized, read-optimized view databases for complex queries.
- **External APIs:**
  - **API Gateway:** A single entry point for all external clients, handling routing, composition, and cross-cutting concerns.
  - **Backends for Frontends (BFF):** A tailored API gateway for each specific client type (e.g., mobile vs. web).
- **Testing:**
  - **Consumer-Driven Contract Tests:** Ensure services can communicate correctly without full end-to-end tests.
  - **Service Component Tests:** Test individual services in isolation, using stubs for dependencies.
- **Deployment & Cross-Cutting Concerns:**
  - **Containerization:** Package each service as a container (e.g., Docker).
  - **Microservice Chassis / Service Mesh:** Use frameworks or infrastructure layers to handle concerns like config, health checks, and tracing.
- **Refactoring:**
  - **Strangler Application:** Incrementally migrate a monolith by building new microservices around it.