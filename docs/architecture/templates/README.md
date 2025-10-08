# Architecture Templates

Standardized templates for documenting architecture building blocks and technical interfaces in UMIG.

## Purpose

These templates ensure consistency and completeness when documenting architectural components:

- Architecture Building Blocks (ABBs) - Technology-agnostic capability specifications
- Solution Building Blocks (SBBs) - Technology-specific implementation patterns
- Interface Specifications - Groovy interface contracts

## Templates

### Architecture Building Block Template

**File**: [abb-template.md](abb-template.md)
**Purpose**: Define technology-agnostic architectural capabilities
**Usage**: Copy template to create new ABB specifications

**Structure**:

- Executive summary and capability definition
- Core and optional capabilities with quality attributes
- Integration points and dependencies
- Quality requirements (performance, security, reliability)
- Lifecycle and governance information

**Classifications**:

- Data Management
- Security Services
- Integration Services
- Process Management
- Presentation Services

### Solution Building Block Template

**File**: [sbb-template.md](sbb-template.md)
**Purpose**: Document technology-specific implementations of ABBs
**Usage**: Copy template when implementing an ABB with specific technologies

**Structure**:

- Technical specification and implementation details
- Core implementation code examples (Groovy)
- Configuration requirements and dependencies
- Testing requirements and deployment guidelines
- Performance metrics and monitoring

**Classifications**:

- Core Pattern
- Data Access Pattern
- Service Pattern
- UI Pattern

### Interface Specification Template

**File**: [interface-template.groovy](interface-template.groovy)
**Purpose**: Define Groovy interface contracts
**Usage**: Copy template when creating new service or component interfaces

**Structure**:

- Interface metadata (purpose, version, author)
- Related ABB/SBB references
- Groovy interface definition with type safety (@CompileStatic, @TypeChecked)
- Method signatures with documentation

## Template Usage Guidelines

### Creating an ABB

1. Copy `abb-template.md` to `/docs/architecture/` with naming: `ABB-[Category]-[NNN]-[Name].md`
2. Fill in executive summary and capability definitions
3. Define quality attributes and requirements
4. Document integration points
5. Submit for architecture review

**Example**: `ABB-SEC-001-Authentication-Service.md`

### Creating an SBB

1. Identify the ABB being implemented
2. Copy `sbb-template.md` to `/docs/architecture/` with naming: `SBB-[Category]-[NNN]-[Name].md`
3. Specify technology stack and implementation approach
4. Include working code examples
5. Define testing and deployment requirements
6. Link to implementing ABB

**Example**: `SBB-SEC-001-ScriptRunner-Auth-Implementation.md`

### Creating an Interface

1. Copy `interface-template.groovy` to appropriate source directory
2. Define package and imports
3. Add @CompileStatic and @TypeChecked annotations
4. Document method contracts
5. Reference related ABB/SBB
6. Follow Groovy coding standards (ADR-031)

## Integration with Architecture

### Relationship to ADRs

- ADRs document **decisions** and rationale
- ABBs define **capabilities** and requirements
- SBBs provide **implementations** and patterns

### Relationship to TOGAF

- ABBs align with TOGAF Architecture Building Blocks (technology-agnostic)
- SBBs align with TOGAF Solution Building Blocks (technology-specific)
- Templates support Phase D (Technology Architecture) deliverables

### Quality Standards

- All templates require version control
- Status tracking: Draft → Review → Approved → Deprecated
- Quality attributes must be measurable
- Implementation code must follow ADR standards

## Template Maintenance

**Version**: 1.0
**Status**: Active
**Review Cycle**: Quarterly or when TOGAF phases evolve

**Updates**: When creating updates to templates:

1. Version the template file
2. Document changes in template header
3. Update this README with changelog
4. Notify architecture team

## Related Documentation

- **[Architecture Decision Records](../adr/README.md)** - Architectural decisions and rationale
- **[TOGAF Phase D - Architecture Building Blocks Catalog](../UMIG%20-%20TOGAF%20Phase%20D%20-%20Architecture%20Building%20Blocks%20Catalog.md)** - Current ABB catalog
- **[Architecture Requirements Specification](../UMIG%20-%20TOGAF%20Phases%20A-D%20-%20Architecture%20Requirements%20Specification.md)** - Central architecture hub

---

**Template Status**: 3 active templates | ABB + SBB + Interface | TOGAF-aligned | Version 1.0
