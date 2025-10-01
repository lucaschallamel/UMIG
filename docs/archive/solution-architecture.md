# UMIG Solution Architecture

**Version:** 2025-08-27  
**Status:** Production Ready | MVP Complete | 49 ADRs Documented  
**Navigation Hub:** Complete architectural documentation across 5 specialized domains

## Overview

This document serves as the central navigation hub for the UMIG (Unified Migration Implementation Guide) project's comprehensive architectural documentation. The complete architecture has been organized into 5 specialized domains, each containing detailed technical specifications, implementation patterns, and architectural decisions.

**Project Status**: Sprint 5 COMPLETE - All core functionality operational with 95%+ test coverage and production-ready quality standards.

---

## 🏗️ Architecture Documentation Structure

### Core Architecture Documents

| Document                                                    | Focus Area                                          | Content                                                    | Size       | ADRs                                       |
| ----------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- | ---------- | ------------------------------------------ |
| **[Architecture Foundation](./architecture-foundation.md)** | Core principles, system structure, technology stack | Foundational architecture, N-tier model, project structure | ~800 lines | ADR-001 to ADR-027                         |
| **[API & Data Architecture](./api-data-architecture.md)**   | REST APIs, database design, data management         | 24 REST endpoints, PostgreSQL patterns, filtering          | ~900 lines | ADR-003, ADR-010, ADR-028-030              |
| **[Development & Operations](./development-operations.md)** | DevOps, testing, CI/CD, infrastructure              | Testing framework, quality gates, deployment               | ~800 lines | ADR-006, ADR-013, ADR-025, ADR-036-038     |
| **[Specialized Features](./specialized-features.md)**       | Email system, authentication, UI enhancements       | Email notifications, RBAC, StepView UI                     | ~700 lines | ADR-039, ADR-043-047                       |
| **[Implementation Patterns](./implementation-patterns.md)** | Code patterns, type safety, service architecture    | DTO patterns, error handling, validation                   | ~900 lines | ADR-031, ADR-034, ADR-039-042, ADR-048-049 |

### Quick Navigation

**🔍 Looking for specific topics?**

- **Getting Started**: [Architecture Foundation → Core Principles](./architecture-foundation.md#2-core-principles--philosophy)
- **API Development**: [API & Data → REST Endpoint Patterns](./api-data-architecture.md#1-rest-api-architecture-patterns)
- **Testing & Quality**: [Development & Operations → Testing Framework](./development-operations.md#2-testing-framework-architecture)
- **Email System**: [Specialized Features → Email Notifications](./specialized-features.md#1-email-notification-architecture-adr-043)
- **Code Standards**: [Implementation Patterns → Type Safety](./implementation-patterns.md#1-type-safety--filtering-patterns)

---

## 🚀 System Architecture Overview

### High-Level Components

The UMIG application follows a **pure ScriptRunner** architecture with four primary components:

1. **Frontend (UI)**: Vanilla JavaScript + Atlassian AUI running within Confluence pages
2. **Backend (API)**: Groovy scripts in ScriptRunner providing RESTful endpoints
3. **Database**: PostgreSQL with Liquibase migrations for schema management
4. **Development Environment**: Podman containerization with Node.js orchestration

### Technology Stack Summary

- **Platform**: Confluence 9.2.7 + ScriptRunner 9.21.0
- **Backend**: Groovy 3.0.15 with static type checking
- **Frontend**: Vanilla JavaScript, Atlassian AUI components
- **Database**: PostgreSQL 14 + Liquibase migrations
- **Containers**: Podman with podman-compose orchestration
- **Testing**: 13 specialized JavaScript test runners (95%+ coverage)

---

## 📊 Project Status & Metrics

### Sprint 5 Achievement Summary (August 28, 2025)

**Core Deliverables: ✅ 100% COMPLETE**

- **Admin GUI Integration**: All 13 entity types with production-ready functionality
- **Email Infrastructure**: Mobile-responsive templates with comprehensive testing
- **Enhanced UI Components**: StepView and IterationView with <3s load times
- **Service Architecture**: Unified DTO foundation with systematic data transformation
- **Quality Framework**: 95%+ test coverage with zero critical defects

**Development Statistics**:

- **Story Points Delivered**: 39/42 planned (93% velocity)
- **Test Coverage**: 95%+ across all components
- **API Endpoints**: 24 fully operational REST APIs
- **Performance**: <3s load times consistently achieved
- **Database Entities**: 19 core entities with complete CRUD operations

### Technical Achievements

**✅ Complete Infrastructure Modernization** (August 27, 2025)

- **100% Cross-Platform Compatibility**: Windows/macOS/Linux native development
- **Shell Script Elimination**: 14+ shell scripts → JavaScript equivalents
- **NPM Script Enhancement**: 30+ commands with standardized interface
- **Service Layer Foundation**: TemplateRetrievalService.js and enhanced utilities

**✅ Architecture Consolidation** (49 ADRs)

All architectural decisions have been systematically documented and consolidated across the 5 domain documents, providing complete guidance for development, maintenance, and future enhancements.

---

## 🗂️ Data Architecture Summary

### Entity Hierarchy

**Core Structure**: Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions

```
5 Migrations
├── 30 Iterations
│   └── 5 Plans per Iteration
│       └── 13 Sequences per Plan
│           └── 43 Phases per Sequence
│               └── 1,443+ Step Instances
```

### Database Design Principles

- **Pattern**: Canonical (`_master_`) vs Instance (`_instance_`) entities
- **Constraints**: Foreign key enforcement with referential integrity
- **Type Safety**: Explicit casting required per ADR-031
- **Filtering**: Instance-based hierarchical filtering using proper entity IDs

---

## 🔧 Development Quick Reference

### Essential Commands

```bash
# Environment Setup
npm install && npm start     # Setup and start all services
npm stop                     # Stop all services
npm run restart:erase        # Reset environment completely

# Testing Framework (Cross-Platform Compatible)
npm test                     # Complete Node.js test suite
npm run test:unit           # Groovy unit tests
npm run test:integration     # Core integration tests
npm run test:all            # Complete test suite execution

# Quality Assurance
npm run health:check        # System health monitoring
npm run quality:check       # Master quality assurance framework
npm run quality:api         # API endpoint smoke testing

# Email Testing Framework
npm run email:test          # Complete email testing framework
npm run email:demo          # Email demonstration system
```

### Development Patterns

**API Development**: Reference `StepsApi.groovy`, `TeamsApi.groovy`, `LabelsApi.groovy`

**Database Access**:

```groovy
DatabaseUtil.withSql { sql ->
    return sql.rows('SELECT * FROM table_name')
}
```

**Type Safety** (ADR-031):

```groovy
params.migrationId = UUID.fromString(filters.migrationId as String)
params.teamId = Integer.parseInt(filters.teamId as String)
```

---

## 📋 Architectural Decision Records (ADRs)

### Complete ADR Index

The following 49 ADRs have been systematically organized across the architectural domains:

#### Foundation & Core Architecture (ADR-001 to ADR-027)

_Documented in: [Architecture Foundation](./architecture-foundation.md)_

- **ADR-001**: Confluence-Integrated Application Architecture
- **ADR-002**: Backend Implementation with Atlassian ScriptRunner
- **ADR-003**: Database Technology: PostgreSQL
- **ADR-004**: Frontend Implementation: Vanilla JavaScript
- **ADR-027**: N-tiers Model Architecture

#### API & Data Management (ADR-028 to ADR-030)

_Documented in: [API & Data Architecture](./api-data-architecture.md)_

- **ADR-028**: API Versioning Strategy
- **ADR-029**: Hierarchical Filtering Implementation
- **ADR-030**: Status Field Database Normalization

#### Development & Operations (ADR-036 to ADR-038)

_Documented in: [Development & Operations](./development-operations.md)_

- **ADR-036**: Zero-Dependency Testing Framework
- **ADR-037**: Testing Framework Consolidation Strategy
- **ADR-038**: Documentation Consolidation Methodology

#### Specialized Features (ADR-043 to ADR-047)

_Documented in: [Specialized Features](./specialized-features.md)_

- **ADR-043**: Email Notification Infrastructure
- **ADR-044**: Mobile-Responsive Email Templates
- **ADR-045**: Template Error Resolution Framework
- **ADR-046**: Service Architecture Foundation

#### Implementation Patterns (ADR-031, ADR-034, ADR-039-042, ADR-048-049)

_Documented in: [Implementation Patterns](./implementation-patterns.md)_

- **ADR-031**: Mandatory Type Safety Enforcement
- **ADR-034**: Liquibase SQL Compatibility Constraints
- **ADR-039**: Enhanced Error Handling Framework
- **ADR-040**: Database Quality Validation Framework
- **ADR-041**: Technical Debt Prioritization Methodology
- **ADR-042**: Dual Authentication Context Management
- **ADR-048**: URL Construction Service Architecture
- **ADR-049**: Service Layer Standardization Architecture

---

## 🎯 Quality Standards & Metrics

### Quality Gates

- **Test Coverage**: ≥95% for all components
- **API Response Time**: <3 seconds for all endpoints
- **Database Performance**: <500ms for standard queries
- **Type Safety**: 100% ADR-031 compliance with explicit casting
- **Error Handling**: Comprehensive error responses with actionable guidance

### Validation Framework

- **Integration Testing**: 100% API endpoint coverage
- **Performance Testing**: Load time and scalability validation
- **Security Testing**: RBAC implementation and vulnerability scanning
- **Cross-Platform Testing**: Windows/macOS/Linux compatibility
- **Browser Testing**: Chrome, Firefox, Safari, Edge validation

---

## 📚 Additional Resources

### Key Documentation

- **API Specification**: [`docs/api/openapi.yaml`](./api/openapi.yaml) - Complete OpenAPI 3.0 specification
- **Data Model**: [`docs/dataModel/README.md`](./dataModel/README.md) - Entity relationships and schema
- **Testing Guide**: [`docs/testing/QUALITY_CHECK_PROCEDURES.md`](./testing/QUALITY_CHECK_PROCEDURES.md) - Quality assurance procedures
- **Development Journal**: [`docs/devJournal/`](./devJournal/) - Sprint progress and technical notes

### Development Environment

- **Confluence**: <http://localhost:8090> (Development instance)
- **PostgreSQL**: localhost:5432 (Database)
- **MailHog**: <http://localhost:8025> (SMTP testing)
- **Container Management**: Podman with podman-compose

### Project Structure

```
UMIG/
├── src/groovy/umig/          # Main application code
│   ├── api/v2/               # REST API endpoints (24 APIs)
│   ├── repository/           # Data access layer
│   ├── tests/                # Testing framework (95%+ coverage)
│   └── web/js/               # Frontend JavaScript
├── local-dev-setup/          # Development environment
├── docs/                     # Architecture documentation (5 domains)
└── mock/                     # Zero-dependency prototypes
```

---

## 🚦 Getting Started

### For New Developers

1. **Start Here**: [Architecture Foundation](./architecture-foundation.md) - Understand core principles and system structure
2. **API Development**: [API & Data Architecture](./api-data-architecture.md) - Learn REST patterns and database design
3. **Development Setup**: [Development & Operations](./development-operations.md) - Environment setup and testing framework

### For System Administrators

1. **Infrastructure**: [Development & Operations](./development-operations.md) - Deployment and operational patterns
2. **Quality Assurance**: [Implementation Patterns](./implementation-patterns.md) - Quality gates and validation frameworks
3. **Monitoring**: [Specialized Features](./specialized-features.md) - System monitoring and email notifications

### For Business Users

1. **Feature Overview**: [Specialized Features](./specialized-features.md) - User-facing functionality and interfaces
2. **Email System**: [Specialized Features → Email Notifications](./specialized-features.md#1-email-notification-architecture-adr-043)
3. **Admin Interface**: [API & Data Architecture → Admin GUI](./api-data-architecture.md#4-admin-gui-integration-patterns)

---

## 🔄 Continuous Evolution

This architecture documentation represents a living system that evolves with the project. Each domain document is maintained independently while this hub provides centralized navigation and project status.

**Last Updated**: August 28, 2025  
**Next Review**: Sprint 6 Planning  
**Architecture Version**: 2.0 (Post-MVP Consolidation)

---

_For specific technical details, implementation patterns, and architectural decisions, navigate to the appropriate domain document using the links above._
