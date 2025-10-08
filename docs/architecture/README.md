# UMIG Architecture Documentation

Comprehensive architectural documentation for the UMIG (Unified Migration Implementation Guide) platform covering TOGAF framework phases, architecture decision records, and architectural building blocks.

## Purpose

This directory contains the complete architectural blueprint for UMIG, including:

- TOGAF-based enterprise architecture documentation (Phases A-F)
- Architecture Decision Records (ADRs) documenting all significant decisions
- Architecture Building Block (ABB) and Solution Building Block (SBB) templates
- Data architecture, dictionaries, and operational guides
- Security and technical architecture specifications

## Quick Navigation

### Central Architecture Hub

- **[Architecture Requirements Specification](UMIG%20-%20TOGAF%20Phases%20A-D%20-%20Architecture%20Requirements%20Specification.md)** - Primary architectural reference covering TOGAF Phases A-D

### TOGAF Framework Documentation

#### Phase B - Business Architecture

- **[Business Architecture](UMIG%20-%20TOGAF%20Phase%20B%20-%20Business%20Architecture.md)** - Business processes, organizational structure, and business capabilities

#### Phase C - Information Systems Architecture

- **[Application Architecture](UMIG%20-%20TOGAF%20Phase%20C%20-%20Application%20Architecture.md)** - Application portfolio and integration patterns
- **[Data Architecture](UMIG%20-%20TOGAF%20Phase%20C%20-%20Data%20Architecture.md)** - Data models, flows, and entity relationships
- **[Data Dictionary](UMIG%20-%20TOGAF%20Phase%20C%20-%20Data%20Dictionnary.md)** - Comprehensive data element definitions
- **[Data DDL Scripts](UMIG%20-%20TOGAF%20Phase%20C%20-%20Data%20DDL%20Scripts.md)** - Database schema scripts and migrations

#### Phase D - Technology Architecture

- **[Technical Architecture](UMIG%20-%20TOGAF%20Phase%20D%20-%20Technical%20Architecture.md)** - Infrastructure, platforms, and technology stack
- **[Security Architecture](UMIG%20-%20TOGAF%20Phase%20D%20-%20Security%20Architecture.md)** - Security controls, privacy, and compliance
- **[Architecture Building Blocks Catalog](UMIG%20-%20TOGAF%20Phase%20D%20-%20Architecture%20Building%20Blocks%20Catalog.md)** - Reusable architectural components

#### Phases E-F - Migration and Governance

- **[Migration and Governance Document](UMIG%20-%20TOGAF%20Phases%20E-F%20-%20Migration%20and%20Governance%20Document.md)** - Implementation roadmap and architecture governance

### Operational Documentation

- **[Data Dictionary](UMIG%20-%20Data%20Dictionary.md)** - Current operational data dictionary
- **[Data Operations Guide](UMIG%20-%20Data%20Operations%20Guide.md)** - Database operations and management procedures

### Diagrams

- **Architecture Diagrams.drawio** - Visual architecture diagrams (DrawIO format)

## Directory Structure

### `/adr/` - Architecture Decision Records

74 documented architectural decisions covering:

- Core architecture (ADR-001 to ADR-020)
- Data & integration patterns (ADR-021 to ADR-040)
- Advanced patterns & service architecture (ADR-041 to ADR-053)
- Security & component architecture (ADR-054 to ADR-071)
- Testing & environment architecture (ADR-072 to ADR-074)

**See**: [ADR README](adr/README.md) for complete index and details

### `/templates/` - Architecture Templates

Standardized templates for architecture artifacts:

- Architecture Building Block (ABB) template
- Solution Building Block (SBB) template
- Interface specification template

**See**: [Templates README](templates/README.md) for template usage

## Key Architecture Principles

### Technology Stack

- **Backend**: Groovy 3.0.15 with Atlassian ScriptRunner 9.21.0
- **Frontend**: Vanilla JavaScript (no frameworks) with AUI
- **Database**: PostgreSQL 14 with Liquibase migrations
- **Infrastructure**: Podman containers, RESTful v2 APIs
- **Environment**: Confluence-integrated application

### Core Patterns

- **Hierarchical Data Model**: Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions
- **Canonical vs Instance**: `_master_` templates vs `_instance_` execution records
- **Type Safety**: Explicit casting for all database parameters (ADR-031, ADR-043)
- **Security**: Enterprise-grade component security (8.5/10 rating, ADR-054)
- **Testing**: Dual-track strategy with Jest and Groovy (ADR-072)

### Architecture Governance

- All significant decisions documented as ADRs
- TOGAF framework alignment for enterprise architecture
- Schema-first development principle (ADR-059)
- Privacy-first security architecture (ADR-071)

## Related Documentation

- **[API Documentation](/docs/api/)** - REST API specifications (31+ endpoints)
- **[Development Journal](/docs/devJournal/)** - Implementation details and technical decisions
- **[Project Roadmap](/docs/roadmap/)** - Sprint planning and user stories
- **[Testing Documentation](/local-dev-setup/__tests__/)** - Test suites and strategies

## Current Status

**Sprint 8**: Security Architecture Enhancement (Started September 26, 2025)
**Latest ADRs**: ADR-073 (Environment Detection), ADR-074 (Component Compatibility)
**TOGAF Coverage**: Phases A through F documented
**Active Focus**: Enhanced security controls and UAT deployment readiness

---

**Documentation Status**: Complete TOGAF coverage | 74 ADRs | 3 architecture templates | Actively maintained
