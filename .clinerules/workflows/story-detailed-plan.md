---
description: AI-enhanced workflow for detailed user story scoping, planning, and task breakdown using GENDEV agents
agents: gendev-requirementsanalyst, gendev-userstorygenerator, gendev-systemarchitect, gendev-apidesigner, gendev-dataarchitect, gendev-databaseschemadesigner, gendev-dependencymanager, gendev-testsuitegenerator, gendev-projectplanner, gendev-projectorchestrator, gendev-documentationgenerator, gendev-codereviewer, gendev-securityspecialist, gendev-performanceoptimizer
---

# Story Detailed Planning Workflow

AI-enhanced systematic approach to analyze, scope, and plan user story implementation with comprehensive technical design and task breakdown using 14 specialized GENDEV agents.

## Prerequisites

- User story identifier (e.g., US-004)
- High-level story description
- Sprint context and timeline
- Access to existing patterns and documentation
- GENDEV agent ecosystem activated

## UMIG-Specific Patterns

### Core Patterns

- **ScriptRunner API**: `@BaseScript CustomEndpointDelegate` with lazy loading
- **Repository**: 13-25+ methods with `DatabaseUtil.withSql` wrapper
- **Hierarchical Filtering**: Instance IDs with UUID casting (ADR-030)
- **Audit Fields**: Standard fields with AuditFieldsUtil (ADR-035)
- **Testing**: Unit/integration tests with 90%+ coverage (ADR-026)
- **Error Handling**: SQL state mapping with consistent HTTP codes
- **Documentation**: OpenAPI specs with apiSpecificationTemplate.md

## Workflow Steps

### Planning Steps

**1. Requirements Analysis** (gendev-requirementsanalyst + gendev-userstorygenerator)

- Analyze business requirements and constraints
- Clarify ambiguities and define success criteria

**2. User Story Elaboration** (gendev-userstorygenerator + gendev-testsuitegenerator)

- Create detailed story with acceptance criteria
- Define GIVEN/WHEN/THEN scenarios and edge cases

**3. Technical Architecture** (gendev-systemarchitect + gendev-securityspecialist)

- Design system architecture and component interactions
- Security validation and performance considerations

**4. API Design** (gendev-apidesigner + gendev-securityspecialist)

- Design RESTful endpoints following UMIG patterns
- Define schemas with hierarchical filtering

**5. Data Architecture** (gendev-dataarchitect + gendev-databaseschemadesigner)

- Design data models and relationships
- Plan data flow and transformation requirements

**6. Database Schema** (gendev-databaseschemadesigner + gendev-performanceoptimizer)

- Create schema with UMIG audit fields and MASTER/INSTANCE pattern
- Design indexes and Liquibase migration procedures

**7. Dependency Analysis** (gendev-dependencymanager + gendev-systemarchitect)

- Identify technical and business dependencies
- Analyze impact and resolution strategies

**8. Test Strategy** (gendev-testsuitegenerator + gendev-securityspecialist)

- Design comprehensive test strategy with ADR-026 patterns
- Plan unit, integration, security, and performance tests

**9. Project Planning** (gendev-projectplanner + gendev-projectorchestrator)

- Break down work and estimate effort
- Create timeline with milestones and risk mitigation

**10. Work Orchestration** (gendev-projectorchestrator + gendev-codereviewer)

- Coordinate resources and implementation sequence
- Monitor progress and facilitate collaboration

**11. Documentation Planning** (gendev-documentationgenerator + gendev-apidesigner)

- Plan documentation strategy and OpenAPI specifications
- Coordinate technical and API documentation

## AI-Enhanced Integration & Quality Assurance

### Cross-Agent Validation Points

**Agents**: gendev-codereviewer, gendev-securityspecialist, gendev-performanceoptimizer

- **Security Review**: gendev-securityspecialist validates all API endpoints, data models, and access patterns
- **Performance Analysis**: gendev-performanceoptimizer reviews database schema, query patterns, and response times
- **Code Quality**: gendev-codereviewer ensures adherence to UMIG patterns and coding standards
- **Integration Testing**: gendev-testsuitegenerator coordinates with all agents for comprehensive test coverage

## Deliverables Checklist

### Technical Specifications

- [ ] Requirements analysis (gendev-requirementsanalyst)
- [ ] Detailed user story (gendev-userstorygenerator)
- [ ] Technical architecture (gendev-systemarchitect)
- [ ] API specification (gendev-apidesigner)
- [ ] Data flow diagrams (gendev-dataarchitect)
- [ ] Database schema (gendev-databaseschemadesigner)
- [ ] Dependency analysis (gendev-dependencymanager)

### Implementation Plan

- [ ] Task breakdown (gendev-projectplanner)
- [ ] Effort estimates (gendev-requirementsanalyst)
- [ ] Implementation sequence (gendev-projectorchestrator)
- [ ] Resource assignments (gendev-projectorchestrator)
- [ ] Timeline with milestones (gendev-projectplanner)
- [ ] Risk mitigation (gendev-systemarchitect)

### Quality Assurance Plan

- [ ] Unit test specifications (gendev-testsuitegenerator)
- [ ] Integration scenarios (gendev-testsuitegenerator)
- [ ] Performance criteria (gendev-performanceoptimizer)
- [ ] Security validation (gendev-securityspecialist)
- [ ] Code review standards (gendev-codereviewer)

### Documentation Plan

- [ ] API documentation (gendev-documentationgenerator)
- [ ] Code documentation (gendev-documentationgenerator)
- [ ] Architecture documentation in `docs/memory-bank/systemPatterns.md` (gendev-systemarchitect)
- [ ] Memory Bank updates for 6 core files per Rule 07 (gendev-documentationgenerator)
- [ ] README.md files for affected work folders per Rule 03 (gendev-documentationgenerator)
- [ ] Dev Journal planning entry in `docs/devJournal/` (gendev-documentationgenerator)
- [ ] ADR creation in `docs/adr/` if architectural (gendev-systemarchitect)
- [ ] Knowledge transfer (gendev-documentationgenerator)

## AI-Enhanced Execution Notes

1. **Agent Orchestration**: gendev-projectorchestrator coordinates all agent interactions
2. **Pattern Reuse**: Leverage existing patterns with gendev-systemarchitect guidance
3. **Continuous Validation**: gendev-codereviewer and gendev-securityspecialist provide ongoing validation
4. **Performance Monitoring**: gendev-performanceoptimizer ensures optimal design decisions
5. **Quality Gates**: Multiple agent validation at each checkpoint

## AI-Enhanced Quality Gates

Before proceeding to implementation:

- [ ] Technical specs validated by gendev-systemarchitect and gendev-codereviewer
- [ ] Dependencies resolved by gendev-dependencymanager
- [ ] Test strategy approved by gendev-testsuitegenerator
- [ ] Security validated by gendev-securityspecialist
- [ ] Performance approved by gendev-performanceoptimizer
- [ ] Timeline confirmed by gendev-projectplanner

## Post-Planning Actions

1. Create implementation tasks in todo list
2. Set up development environment if needed
3. Prepare test data and environments
4. Schedule review checkpoints
5. Update Memory Bank files in `docs/memory-bank/` per Rule 07
6. Create planning dev journal entry in `docs/devJournal/` (YYYYMMDD-nn.md)
7. Update relevant README.md files per Rule 03
8. Communicate plan to stakeholders

---

**AI-Enhanced Usage**: Execute steps with coordinated GENDEV agent collaboration. Each agent builds upon previous outputs while maintaining cross-validation. The workflow ensures comprehensive AI-powered planning before implementation begins.

**Agent Coordination**: gendev-projectorchestrator manages the entire workflow, ensuring optimal agent utilization and seamless handoffs between planning phases.
