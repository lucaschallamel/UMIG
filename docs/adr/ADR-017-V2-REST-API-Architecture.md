# ADR-017: V2 REST API Architecture and Conventions

- **Status:** Proposed
- **Date:** 2025-06-25
- **Deciders:** Lucas Challamel, Cascade

## Context and Problem Statement

The initial V1 API was implemented with action-oriented endpoints (e.g., `/createTeam`, `/listPersons`), which is not a RESTful approach. With the introduction of a new, more complex data model separating canonical and instance entities, the V1 API is no longer fit for purpose. A scalable, predictable, and industry-standard API architecture is required for the V2 implementation to ensure long-term maintainability and ease of use for client applications.

## Decision Drivers

- **Maintainability:** The API structure must be intuitive and easy to extend as new features are added.
- **Scalability:** The design must support a growing number of resources and complex relationships.
- **Industry Standards:** Adherence to REST principles and the OpenAPI specification is crucial for interoperability and attracting developer talent.
- **Clarity:** The API must clearly reflect the core business logic, especially the separation between master "playbooks" (canonical) and live "runs" (instance).
- **Security:** The API should not expose implementation details and should be secure against common vulnerabilities like enumeration attacks.

## Considered Options

- **Option 1: Evolve the V1 API:** Continue adding action-based endpoints to the existing V1 API.
  - Pros: Faster in the short term for a single new feature.
  - Cons: Leads to a sprawling, inconsistent, and hard-to-document API. Does not address the underlying architectural mismatch with the new data model.
- **Option 2: Adopt a strict RESTful Architecture for V2:** Design a new, versioned API from the ground up based on REST principles, with resources, standard HTTP verbs, and a hierarchical structure.
  - Pros: Aligns with industry best practices, highly scalable, and produces a clean, predictable, and self-documenting API. Directly mirrors the new data model's logic.
  - Cons: Requires a larger initial effort to deprecate V1 and implement the V2 foundation.

## Decision Outcome

Chosen option: **"Option 2: Adopt a strict RESTful Architecture for V2"**, because it provides a robust and scalable foundation that directly aligns with our sophisticated data model and long-term project goals. The initial investment in a clean architecture will significantly reduce future maintenance costs and development friction.

The V2 API will adhere to the following principles:

1. **Versioning:** All endpoints will be prefixed with `/api/v2`.
2. **Resource-Oriented:** URLs will be noun-based (e.g., `/users`, `/plans`).
3. **Standard HTTP Methods:** `GET`, `POST`, `PUT`/`PATCH`, and `DELETE` will be used for their standard semantic meanings.
4. **Hierarchical Paths:** Nested routes will represent relationships (e.g., `/plans/{planId}/sequences`).
5. **UUIDs in Path:** Resource identifiers (especially UUIDs) will be placed in the URL path (e.g., `/plans/{planId}`), not in query parameters.
6. **Server-Generated IDs:** The server is responsible for generating all primary keys (both UUIDs and Integers) upon resource creation (`POST`). The client receives the full object with its new ID in the response.
7. **Clear Separation:** The API will have distinct endpoint groups for Canonical (master) and Instance (execution) data.

### Positive Consequences

- The API will be intuitive for new developers to learn and use.
- The OpenAPI specification becomes a reliable contract for frontend and backend teams.
- The architecture is highly scalable and can easily accommodate future resources.
- Using path-based UUIDs enhances security against enumeration attacks.

### Negative Consequences

- The V1 API and its associated Groovy scripts will need to be formally deprecated and eventually removed.
- There is an upfront cost to building the new routing and handler infrastructure for V2.

## Validation

This decision will be considered successful when:

- The V2 API is fully documented in an `openapi.yaml` file.
- The foundational endpoints (`/users`, `/teams`) are successfully implemented in Groovy following this new architecture.
- A client (e.g., Postman) can successfully perform full CRUD operations on the new V2 endpoints.
