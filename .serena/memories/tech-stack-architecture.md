# UMIG Technology Stack & Architecture

## Core Technology Stack
- **Backend**: Groovy with Atlassian ScriptRunner
- **Frontend**: Vanilla JavaScript with Atlassian User Interface (AUI) components
- **Database**: PostgreSQL with Liquibase migrations
- **Development Environment**: Podman containers with NodeJS orchestration
- **Architecture**: RESTful v2 APIs with N-tier separation

## Architecture Patterns (Production Proven)
- **N-Tier Architecture**: Clear separation between presentation, business logic, data access layers
- **Repository Pattern**: All database access encapsulated in repository classes (20+ methods per major repository)
- **REST API Design**: Standardized v2 endpoints with 20+ endpoints per major API
- **Master/Instance Pattern**: Canonical templates with full attribute instantiation (ADR-029)
- **Hierarchical Filtering**: Progressive refinement using parent entity IDs (ADR-030)
- **Quality Gate Architecture**: Control point validation with emergency override capabilities (ADR-016)
- **Type Safety Patterns**: Full Groovy 3.0.15 static type checking compatibility with explicit casting

## Key Architectural Decisions (from solution-architecture.md)
- **ADR-001**: Confluence-native integration (not standalone)
- **ADR-002**: ScriptRunner backend for Confluence integration
- **ADR-003**: PostgreSQL for enterprise-grade data management
- **ADR-004**: Vanilla JavaScript (no frameworks) for simplicity
- **ADR-027**: N-tier model for maintainability
- **ADR-030**: Hierarchical filtering patterns
- **ADR-031**: Type safety with explicit casting (enhanced with Groovy 3.0.15 compatibility)
- **ADR-032**: Email notification architecture with template management
- **ADR-033**: Role-based access control implementation
- **ADR-034**: Static type checking patterns for ScriptRunner
- **ADR-035**: Database audit fields standardization

## Development Philosophy (Proven in Production)
- **Simplicity over complexity**: Direct, maintainable solutions with 90%+ test coverage
- **Confluence-native**: Deep integration leveraging enterprise infrastructure
- **Type safety**: Enhanced with full Groovy 3.0.15 static type checking compatibility
- **Repository pattern**: All data access through repositories with comprehensive business logic
- **Standardized patterns**: Consistent API patterns across 5 major APIs with 100+ endpoints
- **Quality-first approach**: Comprehensive testing, documentation, and validation at all levels
- **Performance optimization**: Sub-200ms response times with database query optimization