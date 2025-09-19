---
description: AI-enhanced workflow for detailed user story scoping, planning, and task breakdown using GENDEV agents
agents: requirements-analyst, user-story-generator, system-architect, api-designer, data-architect, database-schema-designer, dependency-manager, test-suite-generator, project-planner, project-orchestrator, documentation-generator, code-reviewer, security-specialist, performance-optimizer
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

**1. Requirements Analysis**

Please engage our GENDEV requirements analyst together with our user story generator to conduct comprehensive requirements analysis, focusing on business requirements evaluation, constraint identification, ambiguity clarification, and success criteria definition.

## MANDATORY VERIFICATION

- [ ] Read requirements analysis reports and business constraint documentation
- [ ] Verify ambiguity clarification and success criteria are comprehensive and clear
- [ ] Check business requirements evaluation and constraint identification are thorough
- [ ] Report actual requirements analysis effectiveness and success criteria completeness

**2. User Story Elaboration**

Please collaborate with our GENDEV user story generator together with our test suite generator to perform comprehensive user story elaboration, focusing on detailed story creation with acceptance criteria, GIVEN/WHEN/THEN scenario definition, and edge case identification.

## MANDATORY VERIFICATION

- [ ] Read user story documentation and acceptance criteria specifications
- [ ] Verify GIVEN/WHEN/THEN scenarios and edge cases are comprehensive
- [ ] Check detailed story creation and acceptance criteria are thorough
- [ ] Report actual user story elaboration effectiveness and scenario completeness

**3. Technical Architecture**

Please work with our GENDEV system architect together with our security specialist to design comprehensive technical architecture, focusing on system architecture design, component interaction planning, security validation, and performance considerations.

## MANDATORY VERIFICATION

- [ ] Read technical architecture documentation and component interaction designs
- [ ] Verify security validation and performance considerations are comprehensive
- [ ] Check system architecture design and component planning are thorough
- [ ] Report actual technical architecture effectiveness and security validation completeness

**4. API Design**

Please engage our GENDEV API designer together with our security specialist to create comprehensive API design, focusing on RESTful endpoint design following UMIG patterns, schema definition with hierarchical filtering, and security integration.

## MANDATORY VERIFICATION

- [ ] Read API design documentation and endpoint specifications
- [ ] Verify UMIG pattern compliance and hierarchical filtering implementation
- [ ] Check RESTful endpoint design and schema definitions are comprehensive
- [ ] Report actual API design effectiveness and security integration completeness

**5. Data Architecture**

Please collaborate with our GENDEV data architect together with our database schema designer to establish comprehensive data architecture, focusing on data model design, relationship mapping, data flow planning, and transformation requirement specification.

## MANDATORY VERIFICATION

- [ ] Read data architecture documentation and model designs
- [ ] Verify relationship mapping and data flow planning are comprehensive
- [ ] Check data models and transformation requirements are thorough
- [ ] Report actual data architecture effectiveness and design completeness

**6. Database Schema**

Please work with our GENDEV database schema designer together with our performance optimizer to create comprehensive database schema, focusing on UMIG audit field implementation, MASTER/INSTANCE pattern design, index optimization, and Liquibase migration procedure development.

## MANDATORY VERIFICATION

- [ ] Read database schema documentation and migration procedures
- [ ] Verify UMIG audit fields and MASTER/INSTANCE pattern implementation
- [ ] Check index design and Liquibase migrations are comprehensive
- [ ] Report actual schema design effectiveness and performance optimization completeness

**7. Dependency Analysis**

Please engage our GENDEV dependency manager together with our system architect to conduct comprehensive dependency analysis, focusing on technical dependency identification, business dependency mapping, impact assessment, and resolution strategy development.

## MANDATORY VERIFICATION

- [ ] Read dependency analysis reports and impact assessments
- [ ] Verify technical and business dependencies are comprehensively identified
- [ ] Check impact analysis and resolution strategies are thorough
- [ ] Report actual dependency analysis effectiveness and resolution planning completeness

**8. Test Strategy**

Please collaborate with our GENDEV test suite generator together with our security specialist to develop comprehensive test strategy, focusing on ADR-026 pattern implementation, unit test planning, integration test design, security test specification, and performance test development.

## MANDATORY VERIFICATION

- [ ] Read test strategy documentation and ADR-026 pattern implementation
- [ ] Verify unit, integration, security, and performance tests are comprehensive
- [ ] Check test planning and specification are thorough
- [ ] Report actual test strategy effectiveness and coverage completeness

**9. Project Planning**

Please work with our GENDEV project planner together with our project orchestrator to establish comprehensive project planning, focusing on work breakdown structure creation, effort estimation, timeline development with milestones, and risk mitigation planning.

## MANDATORY VERIFICATION

- [ ] Read project planning documentation and work breakdown structures
- [ ] Verify effort estimates and timeline milestones are comprehensive
- [ ] Check risk mitigation planning and resource allocation are thorough
- [ ] Report actual project planning effectiveness and timeline accuracy

**10. Work Orchestration**

Please engage our GENDEV project orchestrator together with our code reviewer to coordinate comprehensive work orchestration, focusing on resource coordination, implementation sequence planning, progress monitoring, and collaboration facilitation.

## MANDATORY VERIFICATION

- [ ] Read work orchestration plans and resource allocation documentation
- [ ] Verify implementation sequence and progress monitoring are comprehensive
- [ ] Check resource coordination and collaboration plans are thorough
- [ ] Report actual orchestration effectiveness and coordination completeness

**11. Documentation Planning**

Please collaborate with our GENDEV documentation generator together with our API designer to develop comprehensive documentation planning, focusing on documentation strategy development, OpenAPI specification creation, technical documentation coordination, and API documentation alignment.

## MANDATORY VERIFICATION

- [ ] Read documentation planning strategies and OpenAPI specifications
- [ ] Verify technical and API documentation coordination is comprehensive
- [ ] Check documentation strategy and specification creation are thorough
- [ ] Report actual documentation planning effectiveness and alignment completeness

## AI-Enhanced Integration & Quality Assurance

### Cross-Agent Validation Points

Please coordinate with our GENDEV code reviewer, security specialist, and performance optimizer for comprehensive cross-validation:

- **Security Review**: Request our security specialist to validate all API endpoints, data models, and access patterns
- **Performance Analysis**: Engage our performance optimizer to review database schema, query patterns, and response times
- **Code Quality**: Work with our code reviewer to ensure adherence to UMIG patterns and coding standards
- **Integration Testing**: Collaborate with our test suite generator to coordinate comprehensive test coverage

## MANDATORY VERIFICATION

- [ ] Read security validation reports for API endpoints and access patterns
- [ ] Verify performance analysis of database schema and query patterns
- [ ] Check code quality review and UMIG pattern adherence documentation
- [ ] Report actual cross-validation effectiveness and test coverage completeness

## Deliverables Checklist

### Technical Specifications

- [ ] Requirements analysis (completed by requirements analyst)
- [ ] Detailed user story (completed by user story generator)
- [ ] Technical architecture (completed by system architect)
- [ ] API specification (completed by API designer)
- [ ] Data flow diagrams (completed by data architect)
- [ ] Database schema (completed by database schema designer)
- [ ] Dependency analysis (completed by dependency manager)

### Implementation Plan

- [ ] Task breakdown (completed by project planner)
- [ ] Effort estimates (completed by requirements analyst)
- [ ] Implementation sequence (completed by project orchestrator)
- [ ] Resource assignments (completed by project orchestrator)
- [ ] Timeline with milestones (completed by project planner)
- [ ] Risk mitigation (completed by system architect)

### Quality Assurance Plan

- [ ] Unit test specifications (completed by test suite generator)
- [ ] Integration scenarios (completed by test suite generator)
- [ ] Performance criteria (completed by performance optimizer)
- [ ] Security validation (completed by security specialist)
- [ ] Code review standards (completed by code reviewer)

### Documentation Plan

- [ ] API documentation (completed by documentation generator)
- [ ] Code documentation (completed by documentation generator)
- [ ] Architecture documentation in `docs/memory-bank/systemPatterns.md` (completed by system architect)
- [ ] Memory Bank updates for 6 core files per Rule 07 (completed by documentation generator)
- [ ] README.md files for affected work folders per Rule 03 (completed by documentation generator)
- [ ] Dev Journal planning entry in `docs/devJournal/` (completed by documentation generator)
- [ ] ADR creation in `docs/architecture/adr/` if architectural (completed by system architect)
- [ ] Knowledge transfer (completed by documentation generator)

## AI-Enhanced Execution Notes

1. **Agent Orchestration**: Our project orchestrator coordinates all agent interactions
2. **Pattern Reuse**: Leverage existing patterns with system architect guidance
3. **Continuous Validation**: Our code reviewer and security specialist provide ongoing validation
4. **Performance Monitoring**: Our performance optimizer ensures optimal design decisions
5. **Quality Gates**: Multiple agent validation at each checkpoint

## AI-Enhanced Quality Gates

Before proceeding to implementation:

- [ ] Technical specs validated by system architect and code reviewer
- [ ] Dependencies resolved by dependency manager
- [ ] Test strategy approved by test suite generator
- [ ] Security validated by security specialist
- [ ] Performance approved by performance optimizer
- [ ] Timeline confirmed by project planner

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

**Agent Coordination**: Our project orchestrator manages the entire workflow, ensuring optimal agent utilization and seamless handoffs between planning phases.
