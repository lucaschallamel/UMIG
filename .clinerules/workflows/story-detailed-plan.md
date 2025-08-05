---
description: Workflow to kick off the detailed scoping and planning of a user story, and breakdown into tasks and workitems to be assigned to subagents
agents: gendev-requirementsanalyst, gendev-userstorygenerator, gendev-systemarchitect, gendev-apidesigner, gendev-dataarchitect, gendev-databaseschemadesigner, gendev-dependencymanager, gendev-testsuitegenerator, gendev-projectplanner, gendev-projectorchestrator, gendev-documentationgenerator
---

# Story Detailed Planning Workflow

This workflow provides a systematic approach to analyze, scope, and plan a user story implementation with comprehensive technical design and task breakdown.

## Prerequisites
- User story identifier (e.g., US-004)
- High-level story description
- Sprint context and timeline
- Access to existing patterns and documentation

## UMIG-Specific Patterns to Follow

### ScriptRunner API Pattern
**Reference**: StepsApi.groovy, PlansApi.groovy, SequencesApi.groovy, PhasesApi.groovy
- Base script configuration with `@BaseScript CustomEndpointDelegate delegate`
- Lazy repository loading for ScriptRunner compatibility
- Consolidated endpoint structure (single entry point with path-based routing)
- Security groups: `["confluence-users"]` for all endpoints
- Type safety with explicit casting (ADR-031)

### Repository Pattern
**Reference**: PlanRepository.groovy (451 lines), SequenceRepository.groovy (926 lines), PhaseRepository.groovy (1,139 lines)
- 13-25+ methods per repository following standard categories:
  - Find Operations (4-6 methods): findAllMaster*, findMaster*ById, find*Instances, find*InstanceById
  - Create Operations (2-3 methods): createMaster*, create*InstancesFromMaster
  - Update Operations (2-4 methods): update*InstanceStatus, update*Order (where applicable)
  - Delete Operations (2 methods): deleteMaster*, delete*Instance
  - Advanced Operations (3-12 methods): hierarchical filtering, validation, business logic
- Mandatory use of `DatabaseUtil.withSql` wrapper
- Transaction management for complex operations

### Hierarchical Filtering Pattern (ADR-030)
**Reference**: All API implementations
- Use instance IDs (pli_id, sqi_id, phi_id, sti_id), NOT master IDs
- Support filtering by all parent levels in hierarchy
- Explicit UUID casting for all ID parameters
- Pattern: migration → iteration → plan → sequence → phase → step → instruction

### Audit Fields Compliance (ADR-035)
**Reference**: AuditFieldsUtil.groovy, US-002b implementation
- All tables must have: created_by, created_at, updated_by, updated_at
- Use AuditFieldsUtil.getStandardAuditFields() for inserts
- Use AuditFieldsUtil.getUpdateAuditFields() for updates
- Default actor: 'system' unless user context available

### Testing Patterns (ADR-026)
**Reference**: SequenceRepositoryTest.groovy, PhasesApiIntegrationTest.groovy
- Unit tests with specific SQL query mocks using regex patterns
- Integration tests with 15-20 scenarios covering all endpoints
- 90%+ coverage target
- Performance validation (<200ms response times)

### Error Handling Pattern
**Reference**: All API implementations
- SQL state mapping: 23503→400 (foreign key), 23505→409 (unique constraint)
- Consistent HTTP status codes: 200 (GET), 201 (POST), 204 (PUT/DELETE)
- Meaningful error messages with business context

### Documentation Pattern
**Reference**: PlansAPI.md, SequencesAPI.md, PhasesAPI.md
- Use apiSpecificationTemplate.md for API documentation
- Update openapi.yaml with all endpoints and schemas
- Regenerate Postman collection after API completion
- Include examples for all operations

## Workflow Steps

### 1. Requirements Analysis Phase
**Agent**: gendev-requirementsanalyst

First, analyze and clarify the user story requirements:
- Review the user story description and acceptance criteria
- Identify functional requirements and constraints
- Clarify any ambiguities or assumptions
- Define success criteria and validation points
- Document dependencies on other stories or systems

### 2. User Story Elaboration
**Agent**: gendev-userstorygenerator

Elaborate the user story with complete details:
- Generate detailed user story with acceptance criteria
- Define clear GIVEN/WHEN/THEN scenarios
- Identify edge cases and error conditions
- Specify performance and quality requirements
- Create user personas and use cases if needed

### 3. Technical Architecture Design
**Agent**: gendev-systemarchitect

Design the technical architecture:
- Review existing system architecture and patterns
- Define component architecture for the story
- Identify integration points with existing systems
- Specify architectural decisions and trade-offs
- Document any new patterns or deviations

### 4. API Design Specification
**Agent**: gendev-apidesigner

Design the API endpoints and contracts following UMIG patterns:
- Define REST endpoints using consolidated endpoint structure
- Follow ScriptRunner API pattern with lazy loading
- Specify request/response schemas with type safety
- Use standard security groups: `["confluence-users"]`
- Define error responses with SQL state mapping
- Create OpenAPI specification draft
- Plan for hierarchical filtering support

### 5. Data Architecture Design
**Agent**: gendev-dataarchitect

Design the data architecture:
- Analyze data flow and transformations
- Define data models and relationships
- Specify data validation rules
- Document data migration requirements
- Identify performance considerations

### 6. Database Schema Design
**Agent**: gendev-databaseschemadesigner

Design the database schema changes following UMIG patterns:
- Create table definitions with snake_case naming conventions
- Follow canonical MASTER/INSTANCE table pattern
- Include mandatory audit fields (created_by, created_at, updated_by, updated_at)
- Define indexes and constraints including composite indexes on audit fields
- Create Liquibase migration scripts with rollback capability
- Follow tiered association strategy for junction tables
- Document migration numbers and dependencies

### 7. Dependency Analysis
**Agent**: gendev-dependencymanager

Analyze and manage dependencies:
- Identify code dependencies and impacts
- Review external library requirements
- Assess version compatibility
- Document integration dependencies
- Plan dependency update strategy

### 8. Test Strategy Definition
**Agent**: gendev-testsuitegenerator

Define comprehensive test strategy following UMIG patterns:
- Design unit tests with SQL query mocks using regex patterns
- Plan 15-20 integration test scenarios per API
- Target 90%+ code coverage
- Specify performance requirements (<200ms response times)
- Create validation scripts for direct database testing
- Define test data using existing generators
- Follow ADR-026 specific mock patterns

### 9. Project Planning
**Agent**: gendev-projectplanner

Create detailed project plan:
- Break down story into specific tasks
- Estimate effort for each task
- Define task dependencies and sequencing
- Identify resource requirements
- Create implementation timeline

### 10. Work Orchestration
**Agent**: gendev-projectorchestrator

Orchestrate the implementation work:
- Assign tasks to appropriate agents/developers
- Define parallel work streams
- Establish checkpoints and milestones
- Plan code review and validation points
- Set up progress tracking

### 11. Documentation Planning
**Agent**: gendev-documentationgenerator

Plan documentation requirements:
- Identify documentation deliverables
- Plan API documentation updates
- Schedule README and changelog updates
- Define inline code documentation needs
- Plan knowledge base updates

## Deliverables Checklist

### Technical Specifications
- [ ] Requirements analysis document
- [ ] Detailed user story with acceptance criteria
- [ ] Technical architecture design
- [ ] API specification (OpenAPI format)
- [ ] Data flow diagrams
- [ ] Database schema changes
- [ ] Dependency impact analysis

### Implementation Plan
- [ ] Task breakdown structure
- [ ] Effort estimates per task
- [ ] Implementation sequence
- [ ] Resource assignments
- [ ] Timeline with milestones
- [ ] Risk mitigation plan

### Quality Assurance Plan
- [ ] Unit test specifications
- [ ] Integration test scenarios
- [ ] Performance test criteria
- [ ] Validation procedures
- [ ] Test data requirements

### Documentation Plan
- [ ] API documentation outline
- [ ] Code documentation standards
- [ ] User documentation needs
- [ ] Knowledge transfer materials

## Execution Notes

1. **Sequential Flow**: While some phases can overlap, generally follow the sequence for optimal results
2. **Pattern Reuse**: Leverage existing patterns from completed stories (US-001, US-002, US-003)
3. **Early Validation**: Get stakeholder validation at key checkpoints
4. **Living Document**: Update the plan as new information emerges
5. **Agent Coordination**: Some agents may need multiple iterations

## Quality Gates

Before proceeding to implementation:
- [ ] All technical specifications reviewed and approved
- [ ] No unresolved dependencies or blockers
- [ ] Test strategy covers all acceptance criteria
- [ ] Implementation plan has realistic timelines
- [ ] Documentation plan is comprehensive

## Post-Planning Actions

1. Create implementation tasks in todo list
2. Set up development environment if needed
3. Prepare test data and environments
4. Schedule review checkpoints
5. Communicate plan to stakeholders

---

**Usage**: Execute each step sequentially, allowing agents to build upon previous outputs. The workflow ensures comprehensive planning before implementation begins. 