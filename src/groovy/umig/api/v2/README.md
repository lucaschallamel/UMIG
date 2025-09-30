# UMIG V2 REST APIs

**Purpose**: Complete ScriptRunner REST API implementation with 21 endpoints serving 15+ entity types

## Key Components

- **Entity APIs** - ApplicationsApi, EnvironmentsApi, LabelsApi, TeamsApi, UsersApi (core CRUD operations)
- **Migration APIs** - migrationApi, IterationsApi, PlansApi, SequencesApi, PhasesApi, StepsApi (hierarchical process)
- **Support APIs** - InstructionsApi, ControlsApi, StatusApi, EmailTemplatesApi, SystemConfigurationApi (system management)
- **UI APIs** - stepViewApi, WebApi (component integration)
- **OpenAPI Documentation** - Complete 3.0 specification at /docs/api/openapi.yaml

## Architecture Standards

- **Repository pattern** - All database access through repositories with DatabaseUtil.withSql (ADR-023)
- **Type safety** - Explicit casting mandatory: UUID.fromString(param as String) (ADR-031)
- **Hierarchical filtering** - Instance IDs (pli_id, sqi_id, phi_id) NOT master IDs (ADR-030)
- **Authentication** - groups: ["confluence-users"] with CustomEndpointDelegate pattern
- **Error handling** - SQL state mappings: 23503→400, 23505→409, actionable error messages

## Quality Standards

- **100% operational** - All 21 APIs production ready with 95%+ test coverage
- **Performance targets** - Simple queries <50ms, complex <100ms, bulk <500ms
- **ADR compliance** - Complete validation with comprehensive testing framework
