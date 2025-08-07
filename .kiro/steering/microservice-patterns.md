# Microservice Architecture Patterns

Based on Chris Richardson's "Microservices Patterns" - observe these principles for service design and implementation.

## Core Architecture Patterns

### Service Decomposition

- **[DBC] Decompose by Business Capability**: Define services based on what business does (e.g., Order Management, Inventory Management)
- **[DSD] Decompose by Subdomain**: Use Domain-Driven Design (DDD) to define services around problem subdomains
- **[MSA] Microservice Architecture**: Structure as collection of small, autonomous, loosely coupled services

### Communication Patterns

- **[RPI] Remote Procedure Invocation**: Synchronous request/response (REST, gRPC) - simple but creates tight coupling
- **[MSG] Messaging**: Asynchronous communication via message broker - promotes loose coupling and resilience
- **[CBR] Circuit Breaker**: Prevent cascading failures - trip breaker after consecutive failures
- **[SDC] Service Discovery**: Client service finds network location of service instances

### Data Management

- **[DPS] Database per Service**: Each microservice owns its data exclusively - fundamental to loose coupling
- **[SAG] Saga**: Manage data consistency across services without distributed transactions
- **[OUT] Transactional Outbox**: Reliably publish messages as part of local database transaction
- **[EVS] Event Sourcing**: Store sequence of state-changing events rather than current state
- **[CQR] CQRS**: Separate command-side (write) from query-side (read) models

### Domain Modeling

- **[DOM] Domain Model**: Object-oriented approach with classes containing state and behavior
- **[TSF] Transaction Script**: Procedural approach - single procedure handles single request
- **[AGG] Aggregate**: Cluster of related domain objects treated as single unit
- **[DME] Domain Events**: Aggregates publish events when state changes

### API & Gateway Patterns

- **[APG] API Gateway**: Single entry point for external clients - routes requests and handles cross-cutting concerns
- **[BFF] Backends for Frontends**: Separate API gateway tailored for each client type
- **[APC] API Composition**: Client retrieves data from multiple services and joins in memory

### Testing Patterns

- **[CDC] Consumer-Driven Contract Test**: Consumer writes test to verify provider meets expectations
- **[SCT] Service Component Test**: Acceptance test for single service in isolation using stubs

### Deployment Patterns

- **[SVC] Service as Container**: Package service as container image (Docker)
- **[SRL] Serverless Deployment**: Deploy using platforms like AWS Lambda
- **[MSC] Microservice Chassis**: Framework handling cross-cutting concerns (config, health checks, metrics)
- **[SMH] Service Mesh**: Infrastructure layer handling inter-service communication (Istio, Linkerd)

### Migration Patterns

- **[STR] Strangler Application**: Incrementally build new microservices around monolith, gradually replacing it
- **[MON] Monolithic Architecture**: Single unified deployable unit - good for simple apps, becomes "monolithic hell"

## UMIG Context Application

For UMIG's ScriptRunner architecture:

- Apply **[DBC]** - services organized around migration management capabilities
- Use **[RPI]** - REST APIs with CustomEndpointDelegate pattern
- Implement **[DPS]** - Each service area owns its database tables
- Apply **[DOM]** - Repository pattern with domain objects
- Use **[AGG]** - Migration → Iteration → Plan → Step hierarchy as aggregates

## Reference

More patterns available at: https://microservices.io/patterns/
