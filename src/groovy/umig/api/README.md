# API Coding Patterns (UMIG)

**Purpose**: Mandatory coding patterns for REST API endpoints ensuring stability and maintainability within ScriptRunner environment

## Key Components

- **Core APIs** - TeamsApi, UsersApi, StepsApi, InstructionsApi, EnvironmentsApi, ApplicationsApi, LabelsApi plus 8 hierarchical APIs
- **Foundation Integration** - Enterprise-grade security (8.5/10 rating), caching (70% hit rate), performance enhancement (30% improvement)
- **Authentication** - groups: ["confluence-users"] with CustomEndpointDelegate pattern
- **Repository pattern** - All database access through repository layer with DatabaseUtil.withSql mandatory

## Critical Patterns

- **Type safety** - ADR-031 explicit casting: UUID.fromString(param as String), Integer.parseInt(param as String)
- **Hierarchical filtering** - Use instance IDs (pli_id, sqi_id, phi_id) NOT master IDs
- **Error handling** - SQL state mappings: 23503→400, 23505→409, clear error messages
- **Security** - 8-phase security controls, XSS/CSRF protection, rate limiting, comprehensive headers

## Testing Standards

- **Technology-prefixed commands** - npm run test:api:security (49 tests), test:api:performance, test:groovy:api
- **Coverage requirements** - 95%+ test coverage, foundation service integration validation
- **Security validation** - Per-endpoint penetration testing, XSS/CSRF/rate limiting validation
