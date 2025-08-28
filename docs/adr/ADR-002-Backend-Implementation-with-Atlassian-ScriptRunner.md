# ADR-002: Backend Implementation with Atlassian ScriptRunner

- **Status:** Accepted
- **Date:** 2025-06-16
- **Deciders:** UMIG Project Team
- **Technical Story:** N/A

## Context and Problem Statement

Given the decision to build a Confluence-Integrated Application (ADR-001), a backend mechanism is required to handle business logic, data persistence operations, and expose REST APIs for the frontend macro. This mechanism must integrate seamlessly with Confluence and adhere to the approved technology stack.

## Decision Drivers

- **Integration with Confluence:** The backend solution must be deeply integrated with or run within the Confluence environment.
- **Approved Technologies:** Must be part of the bank's approved technology portfolio (`techContext.md`).
- **REST API Capability:** Need to expose custom REST endpoints for the frontend JavaScript to consume.
- **Database Interaction:** Ability to connect to and interact with the chosen PostgreSQL database (ADR-003).
- **Enterprise Service Integration:** Capability to integrate with other enterprise services like Exchange for email.
- **Developer Skills:** Availability of skills or ease of learning for the chosen technology.

## Considered Options

- **Option 1: Atlassian ScriptRunner (Groovy) (Chosen)**
  - Description: Utilize Atlassian ScriptRunner for Confluence to write custom Groovy scripts that can be exposed as REST endpoints. ScriptRunner runs within the Confluence JVM.
  - Pros: Deep integration with Confluence, allowing access to Confluence APIs and context. Part of the approved technology stack (`techContext.md`). Supports Groovy, a flexible JVM language. Built-in capabilities for REST endpoints, database connections, and mail integration.
  - Cons: Logic runs within the Confluence JVM, potentially impacting Confluence performance if scripts are poorly written or too resource-intensive. Debugging can sometimes be more challenging than in a standalone application. Version compatibility with Confluence and ScriptRunner itself needs management.
- **Option 2: Developing a separate Java-based Confluence Plugin (OSGi)**
  - Description: Building a traditional Confluence plugin (OSGi bundle) using Java to provide backend services.
  - Pros: Offers the most powerful and flexible integration with Confluence. Full access to Confluence APIs and extension points.
  - Cons: Significantly higher development complexity and longer development cycles compared to ScriptRunner. Requires deeper knowledge of Atlassian plugin development (OSGi, Maven, Atlassian SDK). Steeper learning curve. Potentially overkill for the defined scope of UMIG if ScriptRunner can meet the needs.
- **Option 3: External Microservice with API Gateway**
  - Description: Develop a standalone microservice (e.g., using Java/Spring Boot, Python/Flask, or even NodeJS if an exception was made) hosted outside Confluence, with an API Gateway managing access. The Confluence macro would call this external service.
  - Pros: Decouples backend logic from Confluence, allowing independent scaling and technology choices for the backend.
  - Cons: Introduces network latency. Adds complexity for authentication and authorization between Confluence and the external service. Requires separate hosting, deployment, and monitoring infrastructure. Contradicts the primary driver of leveraging existing Confluence infrastructure to reduce complexity and risk (as per ADR-001).

## Decision Outcome

Chosen option: **"Atlassian ScriptRunner (Groovy)"**.

This option was selected because ScriptRunner provides the best balance of deep Confluence integration, rapid development capabilities, and alignment with the approved technology stack (`techContext.md`). It allows for the creation of custom REST endpoints directly within Confluence using Groovy, a language well-suited for scripting and integration tasks. This avoids the higher complexity and development overhead of building a full OSGi Confluence plugin and aligns with the project's goal of leveraging existing infrastructure as established in ADR-001. ScriptRunner's built-in features for database connectivity and mail integration are also beneficial.

### Positive Consequences

- Rapid development of backend REST APIs.
- Tight integration with Confluence context and APIs.
- Leverages an approved and supported tool within the enterprise.
- Simplified deployment as scripts are managed within Confluence.

### Negative Consequences (if any)

- Performance of ScriptRunner scripts can impact overall Confluence performance if not carefully managed.
- Debugging and testing might be less straightforward than in a dedicated IDE for a standalone application.
- Potential limitations in very complex scenarios compared to a full Java plugin.

## Validation

- Successful implementation of required backend REST endpoints for CRUD operations and business logic.
- Stable and performant operation under load, without negatively impacting Confluence.
- Ease of maintenance and extension of backend scripts.

## Pros and Cons of the Options

(Covered in "Considered Options" section)

## Links

- ADR-001: Confluence-Integrated Application Architecture
- `cline-docs/techContext.md`
- `cline-docs/systemPatterns.md`

## Amendment History

- N/A
