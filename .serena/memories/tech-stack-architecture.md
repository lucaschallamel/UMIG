# UMIG Technology Stack & Architecture

## Core Technology Stack
- **Backend**: Groovy with Atlassian ScriptRunner
- **Frontend**: Vanilla JavaScript with Atlassian User Interface (AUI) components
- **Database**: PostgreSQL with Liquibase migrations
- **Development Environment**: Podman containers with NodeJS orchestration
- **Architecture**: RESTful v2 APIs with N-tier separation

## Architecture Patterns
- **N-Tier Architecture**: Clear separation between presentation, business logic, data access layers
- **Repository Pattern**: All database access encapsulated in repository classes
- **REST API Design**: Standardized v2 endpoints with consistent patterns
- **Master/Instance Pattern**: Canonical templates with instance overrides for customization
- **Hierarchical Filtering**: Progressive refinement using parent entity IDs

## Key Architectural Decisions (from solution-architecture.md)
- **ADR-001**: Confluence-native integration (not standalone)
- **ADR-002**: ScriptRunner backend for Confluence integration
- **ADR-003**: PostgreSQL for enterprise-grade data management
- **ADR-004**: Vanilla JavaScript (no frameworks) for simplicity
- **ADR-027**: N-tier model for maintainability
- **ADR-030**: Hierarchical filtering patterns
- **ADR-031**: Type safety with explicit casting

## Development Philosophy
- **Simplicity over complexity**: Direct, maintainable solutions
- **Confluence-native**: Leverage existing enterprise infrastructure
- **Type safety**: Explicit casting for all parameters (ADR-031)
- **Repository pattern**: All data access through repositories
- **Standardized patterns**: Consistent API and database access patterns