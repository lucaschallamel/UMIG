# Architecture Decision Records (ADRs)

Comprehensive archive of architectural decisions for UMIG platform covering 72+ decisions across security, database, frontend, testing, and system design.

## Purpose

- Document all significant architectural decisions with rationale
- Provide historical context for design choices
- Enable informed evolution of system architecture
- Support onboarding and knowledge transfer
- Maintain single source of truth for architectural patterns

## Current Status (Sprint 8)

**Total ADRs**: 72 documented decisions (ADR-001 through ADR-072)
**Latest Updates**: Security Architecture (ADR-067 through ADR-071) - September 2025
**Active Development**: Sprint 8 Security Architecture Enhancement
**Implementation Tracking**: [ADR Implementation Tracker](ADR%20-%20Implementation%20Tracker.md)

## ADR Index

### Implementation Management

- **[ADR - Implementation Tracker](ADR%20-%20Implementation%20Tracker.md)** - Comprehensive tracking of all architectural decisions and their implementation status

### Core Architecture (ADR-001 to ADR-010)

- **[ADR-001](ADR-001-Confluence-Integrated-Application-Architecture.md)** - Confluence-Integrated Application Architecture
- **[ADR-002](ADR-002-Backend-Implementation-with-Atlassian-ScriptRunner.md)** - Backend Implementation with Atlassian ScriptRunner
- **[ADR-003](ADR-003-Database-Technology-PostgreSQL.md)** - Database Technology: PostgreSQL
- **[ADR-004](ADR-004-Frontend-Implementation-Vanilla-JavaScript.md)** - Frontend Implementation: Vanilla JavaScript
- **[ADR-005](ADR-005-Real-time-Update-Mechanism-AJAX-Polling.md)** - Real-time Update Mechanism: AJAX Polling
- **[ADR-006](ADR-006-Podman-and-Ansible-for-Local-Development-Environment.md)** - Podman and Ansible for Local Development Environment
- **[ADR-007](ADR-007-local-dev-setup-plugin-installation.md)** - Local Dev Setup Plugin Installation
- **[ADR-008](ADR-008-Database-Migration-Strategy-with-Liquibase.md)** - Database Migration Strategy with Liquibase
- **[ADR-009](ADR-009-Containerize-JDBC-Driver-for-Confluence.md)** - Containerize JDBC Driver for Confluence
- **[ADR-010](ADR-010-Database-Connection-Pooling-with-ScriptRunner.md)** - Database Connection Pooling with ScriptRunner

### API Architecture & Integration (ADR-011 to ADR-020)

- **[ADR-011](ADR-011-ScriptRunner-REST-Endpoint-Configuration.md)** - ScriptRunner REST Endpoint Configuration
- **[ADR-012](ADR-012_standardized_database_management_and_documentation.md)** - Standardized Database Management and Documentation
- **[ADR-013](ADR-013-Data-Utilities-Language-NodeJS.md)** - Data Utilities Language: NodeJS
- **[ADR-014](ADR-014-database-naming-conventions.md)** - Database Naming Conventions
- **[ADR-015](ADR-015-canonical-implementation-plan-model.md)** - Canonical Implementation Plan Model
- **[ADR-016](ADR-016-control-and-instruction-model-refactoring.md)** - Control and Instruction Model Refactoring
- **[ADR-017](ADR-017-V2-REST-API-Architecture.md)** - V2 REST API Architecture
- **[ADR-018](ADR-018-Pure-ScriptRunner-Application-Structure.md)** - Pure ScriptRunner Application Structure
- **[ADR-019](ADR-019-Integration-Testing-Framework.md)** - Integration Testing Framework
- **[ADR-020](ADR-020-spa-rest-admin-entity-management.md)** - SPA REST Admin Entity Management

### Data & User Management (ADR-021 to ADR-030)

- **[ADR-021](ADR-021%20-%20adr-step-comments.md)** - ADR Step Comments
- **[ADR-022](ADR-022-user-team-nn-relationship.md)** - User Team N:N Relationship
- **[ADR-023](ADR-023-Standardized-Rest-Api-Patterns.md)** - Standardized REST API Patterns
- **[ADR-024](ADR-024-iteration-centric-data-model.md)** - Iteration-Centric Data Model
- **[ADR-025](ADR-025-NodeJS-based-Dev-Environment-Orchestration.md)** - NodeJS-based Dev Environment Orchestration
- **[ADR-026](ADR-026-Specific-Mocks-In-Tests.md)** - Specific Mocks in Tests
- **[ADR-027](ADR-027-n-tiers-model.md)** - N-Tiers Model
- **[ADR-028](ADR-028-data-import-strategy-for-confluence-json.md)** - Data Import Strategy for Confluence JSON
- **[ADR-029](ADR-029-full-attribute-instantiation-instance-tables.md)** - Full Attribute Instantiation Instance Tables
- **[ADR-030](ADR-030-hierarchical-filtering-pattern.md)** - Hierarchical Filtering Pattern

### Quality & Security (ADR-031 to ADR-040)

- **[ADR-031](ADR-031-groovy-type-safety-and-filtering-patterns.md)** - Groovy Type Safety and Filtering Patterns
- **[ADR-032](ADR-032-email-notification-architecture.md)** - Email Notification Architecture
- **[ADR-033](ADR-033-role-based-access-control-implementation.md)** - Role-Based Access Control Implementation
- **[ADR-034](ADR-034-liquibase-sql-compatibility-constraints.md)** - Liquibase SQL Compatibility Constraints
- **[ADR-035](ADR-035-status-field-normalization.md)** - Status Field Normalization
- **[ADR-036](ADR-036-integration-testing-framework.md)** - Integration Testing Framework
- **[ADR-037](ADR-037-testing-framework-consolidation-strategy.md)** - Testing Framework Consolidation Strategy
- **[ADR-038](ADR-038-documentation-consolidation-methodology.md)** - Documentation Consolidation Methodology
- **[ADR-039](ADR-039-enhanced-error-handling-and-user-guidance.md)** - Enhanced Error Handling and User Guidance
- **[ADR-040](ADR-040-database-quality-validation-framework.md)** - Database Quality Validation Framework

### Advanced Patterns & Service Architecture (ADR-041 to ADR-049)

- **[ADR-041](ADR-041-technical-debt-prioritization-methodology.md)** - Technical Debt Prioritization Methodology
- **[ADR-042](ADR-042-dual-authentication-context-management.md)** - Dual Authentication Context Management
- **[ADR-043](ADR-043-postgresql-jdbc-type-casting-standards.md)** - PostgreSQL JDBC Type Casting Standards
- **[ADR-044](ADR-044-scriptrunner-repository-access-patterns.md)** - ScriptRunner Repository Access Patterns
- **[ADR-047](ADR-047-layer-separation-anti-patterns.md)** - Layer Separation Anti-Patterns
- **[ADR-048](ADR-048-url-construction-service-architecture.md)** - URL Construction Service Architecture
- **[ADR-049](ADR-049-service-layer-standardization-architecture.md)** - Service Layer Standardization Architecture

### Runtime & Testing Architecture (ADR-050 to ADR-053)

- **[ADR-050](ADR-050-Runtime-Dynamic-Class-Loading-Solution.md)** - Runtime Dynamic Class Loading Solution
- **[ADR-051](ADR-051-ui-level-rbac-interim-solution.md)** - UI-Level RBAC Interim Solution
- **[ADR-052](ADR-052-self-contained-test-architecture-pattern.md)** - Self-Contained Test Architecture Pattern
- **[ADR-053](ADR-053-technology-prefixed-test-commands-architecture.md)** - Technology-Prefixed Test Commands Architecture

### Security Architecture (ADR-054)

- **[ADR-054](ADR-054-enterprise-component-security-architecture-pattern.md)** - Enterprise Component Security Architecture Pattern

### Process Architecture (ADR-055)

- **[ADR-055](ADR-055-multi-agent-security-collaboration-workflow-architecture.md)** - Multi-Agent Security Collaboration Workflow Architecture

### Data Migration & Implementation Patterns (ADR-056 to ADR-063)

- **[ADR-056](ADR-056-entity-migration-specification-pattern.md)** - Entity Migration Specification Pattern
- **[ADR-057](ADR-057-javascript-module-loading-anti-pattern.md)** - JavaScript Module Loading Anti-Pattern
- **[ADR-058](ADR-058-global-securityutils-access-pattern.md)** - Global SecurityUtils Access Pattern
- **[ADR-059](ADR-059-sql-schema-first-development-principle.md)** - SQL Schema-First Development Principle
- **[ADR-060](ADR-060-baseentitymanager-interface-compatibility-pattern.md)** - BaseEntityManager Interface Compatibility Pattern
- **[ADR-061](ADR-061-stepview-rbac-security-implementation.md)** - StepView RBAC Security Implementation
- **[ADR-062](ADR-062-Modal-Component-Render-Override.md)** - Modal Component Render Override
- **[ADR-063](ADR-063-pagination-component-interaction-pattern.md)** - Pagination Component Interaction Pattern

### Versioning & Security Architecture (ADR-064 to ADR-071)

- **[ADR-064](ADR-064-umig-namespace-prefixing-confluence-isolation.md)** - UMIG Namespace Prefixing Confluence Isolation
- **[ADR-065](ADR-065-Phased-Implementation-Strategy.md)** - Phased Implementation Strategy
- **[ADR-066](ADR-066-UMIG-Comprehensive-Versioning-Strategy.md)** - UMIG Comprehensive Versioning Strategy
- **[ADR-067](ADR-067-Session-Security-Enhancement.md)** - Session Security Enhancement
- **[ADR-068](ADR-068-SecurityUtils-Enhancement.md)** - SecurityUtils Enhancement
- **[ADR-069](ADR-069-Component-Security-Boundary-Enforcement.md)** - Component Security Boundary Enforcement
- **[ADR-070](ADR-070-Component-Lifecycle-Security.md)** - Component Lifecycle Security
- **[ADR-071](ADR-071-Privacy-First-Security-Architecture.md)** - Privacy-First Security Architecture

### Testing Architecture (ADR-072)

- **[ADR-072](ADR-072-dual-track-testing-strategy.md)** - Dual-Track Testing Strategy - Manual Groovy + Automated Jest Integration

## ADR Categories

### Core Architecture (ADR-001 to ADR-020)

Foundation patterns including Confluence integration, ScriptRunner backend, PostgreSQL database, vanilla JavaScript frontend, REST API architecture, and testing framework.

### Data & Integration (ADR-021 to ADR-040)

User management, team relationships, iteration-centric model, hierarchical filtering, email notifications, RBAC implementation, and quality validation.

### Advanced Patterns (ADR-041 to ADR-053)

Technical debt methodology, authentication contexts, type casting standards, repository patterns, runtime class loading, and self-contained test architecture.

### Security & Component Architecture (ADR-054 to ADR-071)

**Latest Sprint 8 Focus**: Enterprise component security (ADR-054), multi-agent workflows (ADR-055), entity migration (ADR-056), JavaScript module loading (ADR-057), SecurityUtils patterns (ADR-058), schema-first development (ADR-059), BaseEntityManager interface (ADR-060), StepView RBAC (ADR-061), pagination patterns (ADR-063), namespace prefixing (ADR-064), versioning strategy (ADR-066), **session security enhancement (ADR-067)**, **SecurityUtils enhancement (ADR-068)**, **component security boundaries (ADR-069)**, **component lifecycle security (ADR-070)**, **privacy-first architecture (ADR-071)**.

### Testing Excellence (ADR-072)

Dual-track testing strategy with manual Groovy and automated Jest integration.

## Key ADR Highlights

**Security Architecture (Sprint 8)**:

- ADR-067: Session Security Enhancement - Privacy-compliant session management
- ADR-068: SecurityUtils Enhancement - XSS/CSRF protection framework
- ADR-069: Component Security Boundary Enforcement - 8.5/10 security rating
- ADR-070: Component Lifecycle Security - Secure component initialisation
- ADR-071: Privacy-First Security Architecture - GDPR compliance patterns

**Foundation Patterns**:

- ADR-003: PostgreSQL database with Liquibase migrations
- ADR-004: Vanilla JavaScript frontend (no frameworks)
- ADR-017: V2 REST API architecture (31+ endpoints)
- ADR-031: Groovy type safety with explicit casting
- ADR-044: ScriptRunner repository access patterns

**Testing & Quality**:

- ADR-052: Self-contained test architecture (100% pass rate)
- ADR-053: Technology-prefixed test commands
- ADR-072: Dual-track testing strategy (Jest + Groovy)

## ADR Process

**Template**: [template.md](template.md) - Standard ADR format for all decisions
**Status Values**: Accepted, Superseded, Deprecated
**Approval**: Technical review required before acceptance
**Updates**: Document superseding decisions with cross-references

## Related Documentation

- **[TOGAF Architecture Specification](../UMIG%20-%20TOGAF%20Phases%20A-D%20-%20Architecture%20Requirements%20Specification.md)** - Central architectural hub (Phases A-D)
- **[API Documentation](/docs/api/)** - REST API specifications (31+ endpoints)
- **[Development Journal](/docs/devJournal/)** - Implementation details and decisions
- **[Project Roadmap](/docs/roadmap/)** - Sprint planning and user stories

## Creating New ADRs

1. Copy [template.md](template.md) to `ADR-{NNN}-{title-in-kebab-case}.md`
2. Fill in all sections: Context, Decision, Rationale, Consequences, Alternatives
3. Link related ADRs and documentation
4. Submit for technical review
5. Update this index after acceptance
6. Update [ADR Implementation Tracker](ADR%20-%20Implementation%20Tracker.md)

---

**Status**: 72 documented decisions | Latest: ADR-072 (Dual-Track Testing) | Sprint 8: Security Architecture Enhancement
