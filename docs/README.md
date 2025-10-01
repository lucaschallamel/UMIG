# UMIG Documentation

Comprehensive technical and project documentation for the UMIG (Unified Migration Implementation Guide) system - a pure ScriptRunner application for Atlassian Confluence managing complex IT cutover events.

## Purpose

This directory serves as the single source of truth for all UMIG documentation, organised to support developers, stakeholders, architects, and operations teams. Documentation follows enterprise standards with ADR-driven architectural decisions, sprint-based development tracking, and comprehensive API specifications.

## Structure

```
docs/
├── architecture/         # Architecture decisions, TOGAF phases, design patterns (72 ADRs)
│   ├── adr/             # Architectural Decision Records (ADR-001 through ADR-072)
│   ├── security/        # Security architecture patterns and validation
│   └── templates/       # Architecture document templates
├── roadmap/             # Sprint planning, user stories, strategic roadmap
│   ├── sprint{3-10}/   # Sprint-specific documentation and user stories
│   ├── backlog/        # Product backlog and deferred stories
│   └── ux-ui/          # UI/UX specifications and design assets
├── api/                 # REST API documentation (31+ endpoints, OpenAPI v2.12.0)
│   ├── postman/        # Postman collections for API testing
│   └── archived/       # Historical API documentation
├── devJournal/          # Development session logs (100+ entries, YYYYMMDD-NN format)
├── memory-bank/         # Project knowledge base (Rule 07 structure)
├── testing/             # Test strategies, frameworks, quality assurance
│   ├── groovy/         # Groovy test documentation (31/31 passing)
│   ├── entities/       # Entity test specifications
│   └── td-014/         # TD-014 test infrastructure documentation
├── deployment/          # Deployment procedures, environment setup, CI/CD
├── operations/          # Runbooks, monitoring, maintenance procedures
│   └── versioning/     # Version management and rollback procedures
├── security/            # Security policies, compliance, threat models
├── performance/         # Performance testing, optimization guides, benchmarks
├── user-guides/         # End-user documentation and help resources
│   └── troubleshooting/ # Common issues and resolution procedures
├── development/         # Coding standards, development guides, best practices
├── processes/           # Development processes and continuous improvement
├── templates/           # Standard document formats (ADRs, sprints, journals)
├── knowledge-base/      # Consolidated project knowledge and patterns
├── quality-assurance/   # QA procedures and validation frameworks
├── dataModel/           # Database schema, entity relationships, DDL scripts
├── technical/           # Deep technical implementation details and specs
├── releases/            # Version history, release notes, change documentation
│   └── sprint7/        # Sprint 7 release documentation
└── archive/             # Historical documentation and superseded materials
    ├── Sprint6_archives/ # Sprint 6 archived documentation
    ├── Sprint7_archives/ # Sprint 7 archived documentation
    └── Sprint8_archive/  # Sprint 8 archived documentation
```

## Key Documents

### Architecture & Design

- **[TOGAF Architecture Requirements Specification](architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md)** - Central architecture hub linking all 72 ADRs
- **[Architectural Decision Records](architecture/adr/)** - Complete ADR index (ADR-001 through ADR-072)
- **[Security Architecture](architecture/security/)** - Security patterns, ADR-067 through ADR-071
- **[Data Dictionary](architecture/UMIG - Data Dictionary.md)** - Comprehensive data model documentation

### Project Management

- **[Unified Roadmap](roadmap/unified-roadmap.md)** - Strategic project roadmap and business objectives
- **[Sprint Documentation](roadmap/)** - Sprint 3-10 planning and execution documentation
- **[Current Sprint](roadmap/sprint8/)** - Sprint 8: Security Architecture Enhancement

### API & Integration

- **[API Documentation](api/README.md)** - 31+ REST endpoints with OpenAPI specification
- **[OpenAPI Specification](api/openapi.yaml)** - Complete API specification (v2.12.0)
- **[Postman Collections](api/postman/)** - API testing collections with authentication

### Development & Testing

- **[Development Journal](devJournal/)** - Chronological development logs (100+ entries)
- **[Testing Documentation](testing/)** - Test strategies and frameworks (100% pass rate)
- **[Groovy Testing](testing/groovy/)** - Groovy test documentation (31/31 passing)
- **[Memory Bank](memory-bank/)** - Project knowledge base (Rule 07 structure)

## Quick Navigation

### For Current Work

- **Sprint 8 Status**: Security Architecture Enhancement (started 2025-09-26)
- **Branch**: `bugfix/US-058-email-service-iteration-step-views`
- **Latest ADRs**: ADR-067 through ADR-071 (Security Architecture)
- **Recent Journal**: [devJournal/20251001-01.md](devJournal/20251001-01.md)

### For Specific Topics

- **Architecture Decisions** → [architecture/adr/](architecture/adr/) (72 ADRs documented)
- **API Endpoints** → [api/](api/) (31+ endpoints, 100% documented)
- **Database Schema** → [dataModel/](dataModel/) (Entity hierarchy, master/instance patterns)
- **Sprint Planning** → [roadmap/](roadmap/) (Sprint 3-10 with user stories)
- **Test Results** → [testing/](testing/) (JS: 158 tests, Groovy: 31 tests, 100% pass rate)
- **Component Architecture** → [devJournal/20250910-03-emergency-component-architecture.md](devJournal/20250910-03-emergency-component-architecture.md)
- **Security Policies** → [security/](security/) (ComponentOrchestrator 8.5/10 rating)
- **Performance Metrics** → [performance/](performance/) (35% Groovy improvement, 96.2% memory optimisation)

### For Implementation

- **Coding Standards** → [user-guides/coding-standards.md](user-guides/coding-standards.md)
- **Development Workflows** → [user-guides/development-workflows.md](user-guides/development-workflows.md)
- **Installation Guide** → [user-guides/installation-guide.md](user-guides/installation-guide.md)
- **Getting Started** → [user-guides/getting-started.md](user-guides/getting-started.md)

## Current Status (2025-10-01)

**Sprint 8**: Security Architecture Enhancement
**Completion**: Sprint 7 achieved 224% (130/58 points)
**Test Status**: JavaScript 158/158, Groovy 31/31 (100% pass rate)
**API Coverage**: 31+ endpoints fully documented
**ADR Count**: 72 architectural decisions documented
**Branch**: `bugfix/US-058-email-service-iteration-step-views`

## Documentation Standards

### Naming Conventions

- **User Stories**: `US-{XXX}-{title}.md` (e.g., US-082-admin-gui-architecture-refactoring)
- **Technical Debt**: `TD-{XXX}-{title}.md` (e.g., TD-014-groovy-test-coverage-enterprise)
- **Journal Entries**: `YYYYMMDD-NN.md` (e.g., 20251001-01.md)
- **Sprint Reviews**: `YYYYMMDD-sprint-review.md`

### Document Templates

- **[ADR Template](architecture/adr/template.md)** - Architectural Decision Record format
- **[User Story Template](roadmap/backlog/userStoryTemplate.md)** - User story structure
- **[Journal Entry Template](devJournal/devJournalEntryTemplate.md)** - Development journal format
- **[Sprint Review Template](devJournal/sprintReviewTemplate.md)** - Sprint retrospective format

### Cross-References

All documentation maintains bidirectional links to:

- **ADRs**: Architectural decision context and rationale
- **User Stories**: Feature requirements and acceptance criteria
- **Journal Entries**: Implementation details and problem-solving journeys
- **API Specs**: Endpoint documentation and integration patterns

## Related Documentation

### Project Root

- **[CLAUDE.md](../CLAUDE.md)** - AI assistant context and development patterns
- **[README.md](../README.md)** - Project overview and quick start guide
- **[local-dev-setup/README.md](../local-dev-setup/README.md)** - Environment setup and npm commands

### External References

- **TOGAF Framework**: Enterprise architecture methodology
- **ScriptRunner Documentation**: Atlassian ScriptRunner for Confluence
- **PostgreSQL Documentation**: Database implementation reference
- **OpenAPI Specification**: API documentation standard

## Maintenance Guidelines

### Adding New Documentation

1. **Choose appropriate directory** based on content type
2. **Follow naming conventions** for consistency
3. **Use provided templates** for standard documents
4. **Create cross-references** to related documentation
5. **Update README files** in affected directories
6. **Link from parent documents** for discoverability

### Archiving Documentation

1. **Move superseded documentation** to `archive/` directory
2. **Maintain archive README** with archival rationale
3. **Create redirect notes** in original location
4. **Preserve cross-references** with archive links
5. **Update parent documentation** to remove archived references

### Quality Standards

- **✅ British English**: Spelling and terminology (organised, recognised, colour)
- **✅ Concise**: Clear and to-the-point explanations
- **✅ Hierarchical**: Structured information with clear navigation
- **✅ Cross-referenced**: Bidirectional links to related documentation
- **✅ Evidence-based**: Technical claims supported by code, tests, or metrics
- **✅ Maintained**: Regular updates reflecting current project state

---

**Last Updated**: 2025-10-01 | **Total Documents**: 500+ | **ADRs**: 72 | **API Endpoints**: 31+ | **Test Pass Rate**: 100%
