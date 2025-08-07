# Project Specifications Reference

## Core Specification Documents

### Data Model Specifications

- **Location**: `docs/dataModel/README.md`
- **Purpose**: Comprehensive data model documentation with layered architecture
- **Key Sections**:
  - Strategic Layer (Migrations, Iterations, Teams)
  - Canonical Layer (Plans, Sequences, Phases, Steps, Instructions)
  - Instance Layer (Execution tracking)
  - Association/Join Tables (Many-to-many relationships)
- **Usage**: Reference for database schema, entity relationships, and field definitions

### Architecture Decision Records (ADRs)

- **Location**: `docs/adr/`
- **Key ADRs**:
  - `ADR-029-full-attribute-instantiation-instance-tables.md` - Instance table design
  - `ADR-031-groovy-type-safety-and-filtering-patterns.md` - Type safety patterns
  - `ADR-022-user-team-nn-relationship.md` - User-team relationships
- **Usage**: Reference for architectural decisions and design rationale

### Solution Architecture

- **Location**: `docs/solution-architecture.md`
- **Purpose**: Consolidated architecture guide
- **Usage**: High-level system design and patterns

### API Specifications

- **Location**: `docs/api/`
- **Key Files**:
  - `openapi.yaml` - OpenAPI 3.0 specification
  - `redoc-static.html` - API documentation viewer
  - `postman/` - Postman collection for testing
- **Usage**: REST API contracts and testing

### UI/UX Specifications

- **Location**: `docs/ui-ux/`
- **Key Files**:
  - `iteration-view.md` - Iteration view specification
  - `step-view.md` - Step view specification
- **Usage**: Interface design and behavior specifications

### Development Context

- **Location**: `cline-docs/`
- **Key Files**:
  - `projectBrief.md` - Foundation requirements
  - `productContext.md` - Business context and problems solved
  - `systemPatterns.md` - Technical patterns and decisions
  - `activeContext.md` - Current work focus
  - `progress.md` - Status and completed work
- **Usage**: AI assistant context and project state

## Specification Usage Guidelines

### When to Reference Specs

- **Data Model**: Before creating/modifying database entities or queries
- **ADRs**: When making architectural decisions or understanding existing patterns
- **API Specs**: Before implementing or modifying REST endpoints
- **UI/UX Specs**: Before implementing frontend components or user interactions
- **Development Context**: At start of any development session

### How to Reference Specs

- Use `#[[file:<relative_file_name>]]` syntax in steering files
- Reference specific sections by name when relevant
- Always check specs before implementing new features
- Update specs when making significant changes

### Spec Integration with Kiro

- Treat specs as authoritative source of truth
- Use specs to validate implementation approaches
- Reference specs in design discussions and code reviews
- Ensure new work aligns with documented patterns and decisions

## Key Data Model Entities (from README.md)

### Strategic Layer

- `migrations_mig` - High-level migration programs
- `iterations_ite` - Execution cycles within migrations
- `teams_tms` - Organizational units

### Canonical vs Instance Pattern

- **Master entities** (e.g., `plans_master_plm`) - Reusable templates
- **Instance entities** (e.g., `plans_instance_pli`) - Time-bound executions
- **Override fields** - Instance-specific customizations (added in migration 010)

### Association Tables

- Many-to-many relationships implemented via normalized join tables
- Label relationships for categorization and filtering
- Comment systems for both master and instance levels
