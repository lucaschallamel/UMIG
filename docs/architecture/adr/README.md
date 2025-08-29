# Architectural Decision Records (ADRs)

This directory contains all Architectural Decision Records for the UMIG project, organized in a consolidated single-folder structure for easy navigation and reference.

## Structure

All ADRs are maintained in this single directory (`docs/adr/`) with a flat structure for simplified access and maintenance.

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

### Advanced Patterns & Service Architecture (ADR-041+)

- **[ADR-041](ADR-041-technical-debt-prioritization-methodology.md)** - Technical Debt Prioritization Methodology
- **[ADR-042](ADR-042-dual-authentication-context-management.md)** - Dual Authentication Context Management
- **[ADR-043](ADR-043-postgresql-jdbc-type-casting-standards.md)** - PostgreSQL JDBC Type Casting Standards
- **[ADR-044](ADR-044-scriptrunner-repository-access-patterns.md)** - ScriptRunner Repository Access Patterns
- **[ADR-047](ADR-047-layer-separation-anti-patterns.md)** - Layer Separation Anti-Patterns
- **[ADR-048](ADR-048-url-construction-service-architecture.md)** - URL Construction Service Architecture
- **[ADR-049](ADR-049-service-layer-standardization-architecture.md)** - Service Layer Standardization Architecture

## ADR Process

All architectural decisions follow a standard template and are documented using the format defined in [template.md](template.md).

## Related Documentation

For comprehensive architectural guidance, also refer to:

- **[UMIG Solution Architecture](../architecture/)** - Consolidated architectural documentation organized by TOGAF phases
- **[Implementation Tracker](ADR%20-%20Implementation%20Tracker.md)** - Current status of all architectural decisions

## Total ADRs: 43 documented decisions
