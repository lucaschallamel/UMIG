_Scope: This document outlines the specific patterns and strategies for implementing our Microservice-Oriented Architecture, based on Chris Richardson's "Microservices Patterns". It builds upon the foundational principles in `04-TwelveFactorApp.md` and provides a detailed guide for service design, decomposition, communication, and data management._

Observe the principles set by the book "Microservices Patterns" by Chris Richardson.

### Microservice Patterns & Principles (with Trigram Codes)

- [MON] **Monolithic Architecture:** Structures an application as a single, unified deployable unit. Good for simple applications, but becomes "monolithic hell" as complexity grows.
- [MSA] **Microservice Architecture:** Structures an application as a collection of small, autonomous, and loosely coupled services. This is the core pattern the rest of the book builds upon.
- [DBC] **Decompose by Business Capability:** Define services based on what a business _does_ (e.g., Order Management, Inventory Management) to create stable service boundaries.
- [DSD] **Decompose by Subdomain:** Use Domain-Driven Design (DDD) to define services around specific problem subdomains, aligning service boundaries with the business domain model.
- [RPI] **Remote Procedure Invocation:** A client invokes a service using a synchronous, request/response protocol like REST or gRPC. Simple and familiar but creates tight coupling and can reduce availability.
- [MSG] **Messaging:** Services communicate asynchronously by exchanging messages via a message broker. This promotes loose coupling and improves resilience.
- [CBR] **Circuit Breaker:** Prevents a network or service failure from cascading. After a number of consecutive failures, the breaker trips, and further calls fail immediately.
- [SDC] **Service Discovery:** Patterns for how a client service can find the network location of a service instance in a dynamic cloud environment (self/3rd party registration, client/server-side discovery).
- [DPS] **Database per Service:** Each microservice owns its own data and is solely responsible for it. Fundamental to loose coupling; requires new transaction management strategies.
- [SAG] **Saga:** Master pattern for managing data consistency across services without distributed transactions. Sequence of local transactions, each triggering the next via events/messages, with compensating transactions on failure.
- [OUT] **Transactional Outbox / Polling Publisher / Transaction Log Tailing:** Reliably publish messages/events as part of a local database transaction, ensuring no messages are lost if a service crashes after updating its database but before sending the message.
- [DOM] **Domain Model:** Classic object-oriented approach with classes containing both state and behaviour. Preferred for complex logic.
- [TSF] **Transaction Script:** Procedural approach where a single procedure handles a single request. Simpler, but unmanageable for complex logic.
- [AGG] **Aggregate:** A cluster of related domain objects treated as a single unit, with a root entity. Transactions only ever create or update a single aggregate.
- [DME] **Domain Events:** Aggregates publish events when their state changes. Foundation for event-driven architectures, sagas, and data replication.
- [EVS] **Event Sourcing:** Store the sequence of state-changing events rather than the current state. The current state is derived by replaying events, providing a reliable audit log and simplifying event publishing.
- [APC] **API Composition:** A client (or API Gateway) retrieves data from multiple services and joins it in memory. Simple for basic queries, inefficient for complex joins across large datasets.
- [CQR] **Command Query Responsibility Segregation (CQRS):** Maintain one or more denormalised, read-optimised "view" databases kept up-to-date by subscribing to events from the services that own the data. Separates the command-side (write) from the query-side (read) model.
- [APG] **API Gateway:** A single entry point for all external clients. Routes requests to backend services, can perform API composition, and handles cross-cutting concerns like authentication.
- [BFF] **Backends for Frontends:** A variation of the API Gateway pattern where you have a separate, tailored API gateway for each specific client (e.g., mobile app, web app).
- [CDC] **Consumer-Driven Contract Test:** A test written by the _consumer_ of a service to verify that the _provider_ meets its expectations, ensuring correct communication without slow, brittle end-to-end tests.
- [SCT] **Service Component Test:** Acceptance test for a single service in isolation, using stubs for external dependencies.
- [SVC] **Service as a Container:** Package a service as a container image (e.g., Docker) to encapsulate its technology stack.
- [SRL] **Serverless Deployment:** Deploy services using a platform like AWS Lambda that abstracts away the underlying infrastructure.
- [MSC] **Microservice Chassis:** A framework (e.g., Spring Boot + Spring Cloud) that handles cross-cutting concerns such as config, health checks, metrics, and distributed tracing.
- [SMH] **Service Mesh:** Infrastructure layer (e.g., Istio, Linkerd) that handles inter-service communication concerns like circuit breakers, distributed tracing, and load balancing outside of service code.
- [STR] **Strangler Application:** Strategy for migrating a monolith. Incrementally build new microservices around the monolith, gradually replacing it and avoiding a "big bang" rewrite.

More at <https://microservices.io/patterns/>
