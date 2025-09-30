# UMIG (Unified Migration Implementation Guide)

**Purpose**: Pure ScriptRunner application for Atlassian Confluence managing complex IT cutover events and migration workflows

## Architecture Overview

- **Backend**: Groovy 3.0.15 with ScriptRunner 9.21.0, PostgreSQL 14 with Liquibase schema management
- **Frontend**: Vanilla JavaScript with ComponentOrchestrator (186KB+ enterprise component suite)
- **Pattern**: Repository-Service-API architecture with hierarchical data model and foundation service integration
- **Scale**: Handles migrations → iterations → plans → sequences → phases → steps → instructions (1,443+ step instances)

## Key Directories

- **api/** - REST endpoints (21 APIs) with ADR-023 patterns and foundation service integration
- **repository/** - Database access layer with DatabaseUtil.withSql pattern (mandatory)
- **service/** - Business logic layer (US-056) with data transformation and orchestration services
- **utils/** - Core utilities (DatabaseUtil, EmailService, SecurityUtils, AuthenticationService)
- **web/** - Frontend components with ComponentOrchestrator and 8-phase security controls
- **macros/** - ScriptRunner UI macros for container rendering and asset loading
- **tests/** - Self-contained testing architecture (100% pass rate) with technology-prefixed commands
- **dto/** - Data transfer objects with master/instance template separation

## Critical Standards

- **Database pattern**: DatabaseUtil.withSql for ALL data access (no exceptions)
- **Type safety**: Explicit casting mandatory (ADR-031): UUID.fromString(param as String)
- **Security**: groups: ["confluence-users"] authentication with 8-phase security controls
- **Frontend**: NO frameworks - pure vanilla JavaScript with AUI styling only
- **Component architecture**: ComponentOrchestrator with lifecycle management and enterprise security (8.5/10 rating)
- **Testing**: Self-contained Groovy tests, technology-prefixed commands (npm run test:js:_, test:groovy:_)

## Development Commands

- **Environment**: npm start (from local-dev-setup/) - complete development stack
- **Testing**: npm run test:all:comprehensive - complete test suite across technologies
- **Health**: npm run health:check - system validation before development
