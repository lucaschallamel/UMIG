---
description: Comprehensive API development workflow with GENDEV agent orchestration for design, implementation, testing, documentation, and versioning
---

# API Development Workflow

**End-to-end API development with AI-enhanced design, implementation, testing, and lifecycle management**

## Purpose

Orchestrate GENDEV agents to deliver high-quality APIs through systematic design, robust implementation, comprehensive testing, complete documentation, and effective version management.

## When to Use

- New API development and implementation
- API modernization and refactoring
- RESTful and GraphQL API development
- Microservice API design
- API versioning and deprecation

## Prerequisites

- GENDEV agents available
- API requirements defined
- Development environment configured
- Design standards established
- Security requirements specified

## Workflow Steps

### Phase 1: API Design & Specification

Please engage our GENDEV requirements analyst to analyze API requirements with medium domain complexity, working within normal timeline constraints and considering approximately 5 key stakeholders.

## MANDATORY VERIFICATION

- [ ] Read the requirements analysis document to confirm stakeholder needs are captured
- [ ] Verify domain complexity assessment is complete
- [ ] Check timeline constraints and deliverables are realistic

Next, work with our GENDEV API designer to create comprehensive API specifications including RESTful design patterns, OpenAPI documentation, and integration guidelines.

## MANDATORY VERIFICATION

- [ ] Read the generated API specification files
- [ ] Verify RESTful design principles are properly applied
- [ ] Check OpenAPI specs are complete and valid

Finally, collaborate with our GENDEV documentation generator to create comprehensive API documentation targeting developer audiences with clear integration examples and interactive elements.

## MANDATORY VERIFICATION

- [ ] Read the generated API documentation
- [ ] Verify developer-focused content with working examples
- [ ] Check documentation completeness against API specifications

**Deliverables:** Requirements analysis, RESTful design, OpenAPI specs, interactive docs, integration tutorials

### Phase 2: API Implementation

Please work with our GENDEV deployment operations manager to establish the API development and deployment environment with standard validation processes.

## MANDATORY VERIFICATION

- [ ] Read deployment configuration files and setup documentation
- [ ] Verify development environment is properly configured
- [ ] Check deployment pipelines are functional

Next, collaborate with our GENDEV code refactoring specialist to implement clean, maintainable API endpoints following established patterns and best practices.

## MANDATORY VERIFICATION

- [ ] Read the implemented API code to confirm clean architecture
- [ ] Verify code follows established patterns and standards
- [ ] Check refactoring improves code maintainability

Then engage our GENDEV database schema designer to create optimized data layer designs with standard validation for API data persistence.

## MANDATORY VERIFICATION

- [ ] Read database schema files and migration scripts
- [ ] Verify data models support API requirements
- [ ] Check schema design follows optimization best practices

**Deliverables:** Framework setup, endpoint implementation, business logic, data layer, error handling

### Phase 3: Security Implementation

Please consult with our GENDEV security architect to design comprehensive API security measures with specific focus on API-level threats including authentication, authorization, and data protection.

## MANDATORY VERIFICATION

- [ ] Read security architecture documentation and implementation plans
- [ ] Verify API-specific security measures are properly designed
- [ ] Check authentication and authorization mechanisms are comprehensive

Next, work with our GENDEV security analyzer to perform thorough security assessment of the API implementation, identifying vulnerabilities and providing remediation guidance.

## MANDATORY VERIFICATION

- [ ] Read security analysis report and vulnerability assessment
- [ ] Verify all critical and high-severity issues are identified
- [ ] Check remediation recommendations are actionable and complete

**Deliverables:** JWT authentication, RBAC, OAuth integration, input validation, rate limiting, security scanning

### Phase 4: API Testing

Please engage our GENDEV test suite generator to create comprehensive unit tests specifically focused on API functionality with a target of 95% code coverage.

## MANDATORY VERIFICATION

- [ ] Read unit test files and coverage reports
- [ ] Verify 95% coverage target is achieved
- [ ] Check unit tests cover all API endpoints and edge cases

Next, work with our GENDEV test suite generator again to create integration tests focusing on API interactions, data flow, and system integration points.

## MANDATORY VERIFICATION

- [ ] Read integration test files and execution results
- [ ] Verify API integration points are thoroughly tested
- [ ] Check test coverage includes authentication and error scenarios

Then collaborate with our GENDEV API designer to validate API contracts and ensure endpoint behavior matches specifications.

## MANDATORY VERIFICATION

- [ ] Read API contract validation results and specification compliance
- [ ] Verify endpoint behavior matches documented specifications
- [ ] Check API contracts are properly validated against implementation

**Deliverables:** 95% unit coverage, integration tests, contract validation, authentication testing

### Phase 5: Performance & Load Testing

Please work with our GENDEV performance optimizer to conduct comprehensive API performance testing including load testing, response time analysis, and scalability assessment.

## MANDATORY VERIFICATION

- [ ] Read performance test results and benchmarking reports
- [ ] Verify response times meet <200ms requirements
- [ ] Check load testing validates scalability requirements

Then engage our GENDEV performance optimizer again to implement optimization recommendations and validate performance improvements across all API endpoints.

## MANDATORY VERIFICATION

- [ ] Read optimization implementation details and performance improvements
- [ ] Verify optimizations are properly implemented
- [ ] Check performance metrics show measurable improvements

**Deliverables:** Load testing, response time metrics, scalability validation, optimization recommendations

### Phase 6: API Gateway & Management

Please collaborate with our GENDEV API designer to configure API gateway settings, rate limiting policies, and traffic management for production readiness.

## MANDATORY VERIFICATION

- [ ] Read API gateway configuration files and policies
- [ ] Verify rate limiting and traffic management are properly configured
- [ ] Check gateway settings align with production requirements

Next, work with our GENDEV resource monitor to establish comprehensive monitoring, analytics, and SLA tracking for API performance and availability.

## MANDATORY VERIFICATION

- [ ] Read monitoring configuration and dashboard setup
- [ ] Verify resource monitoring covers all critical API metrics
- [ ] Check SLA tracking and alerting mechanisms are functional

**Deliverables:** Gateway configuration, rate limiting, monitoring, analytics, SLA tracking

### Phase 7: Documentation & Developer Experience

Please work with our GENDEV documentation generator to create comprehensive interactive API documentation including developer portal, multi-language examples, and sandbox environment.

## MANDATORY VERIFICATION

- [ ] Read the comprehensive API documentation and interactive portal
- [ ] Verify interactive elements and sandbox environment are functional
- [ ] Check multi-language examples are complete and working

Then collaborate with our GENDEV API designer to finalize SDK generation and ensure optimal developer experience with clear onboarding materials.

## MANDATORY VERIFICATION

- [ ] Read SDK documentation and generated client libraries
- [ ] Verify developer onboarding materials are comprehensive
- [ ] Check SDK examples and tutorials are functional

**Deliverables:** Interactive portal, SDK generation, multi-language examples, tutorials, sandbox environment

### Phase 8: Versioning & Lifecycle

Please engage our GENDEV API designer to establish semantic versioning strategy, backward compatibility policies, and migration tools for API lifecycle management.

## MANDATORY VERIFICATION

- [ ] Read versioning strategy documentation and compatibility policies
- [ ] Verify semantic versioning is properly implemented
- [ ] Check migration tools and backward compatibility measures are functional

Finally, work with our GENDEV API designer to implement comprehensive API governance including deprecation policies, lifecycle management, and version transition planning.

## MANDATORY VERIFICATION

- [ ] Read API governance documentation and lifecycle management plans
- [ ] Verify deprecation policies and transition planning are comprehensive
- [ ] Check governance processes support long-term API evolution

**Deliverables:** Semantic versioning, backward compatibility, migration tools, deprecation policy, governance

## API Design Principles

### RESTful Design

- Resource-based URLs (nouns not verbs)
- Proper HTTP methods and status codes
- Stateless and cacheable responses
- HATEOAS when appropriate

### Security Best Practices

- Secure authentication mechanisms
- Fine-grained authorization
- Comprehensive input validation
- Rate limiting and HTTPS only

## Success Criteria

- All endpoints functional with validation
- Response times <200ms
- Zero critical vulnerabilities
- Complete interactive documentation
- > 95% unit test coverage
- Positive developer experience metrics

## Troubleshooting

### Common Issues

**Design:** Inconsistent naming, over/under-engineering, poor error handling
**Implementation:** Performance bottlenecks, database issues, auth problems
**Testing:** Insufficient coverage, integration complexity, contract issues

### Resolution

1. Thorough design reviews
2. Performance optimization (caching, query tuning)
3. Security hardening and audits
4. Comprehensive testing strategies
5. Documentation excellence

## API Development Checklist

- [ ] Requirements analyzed
- [ ] RESTful principles applied
- [ ] OpenAPI spec created
- [ ] Security integrated
- [ ] Versioning defined
- [ ] Endpoints implemented
- [ ] Auth configured
- [ ] Error handling complete
- [ ] Database optimized
- [ ] Unit tests >95%
- [ ] Integration tests complete
- [ ] Contract tests validated
- [ ] Performance verified
- [ ] Security scanned
- [ ] Documentation interactive
- [ ] Examples provided
- [ ] Onboarding established
- [ ] Monitoring configured
- [ ] Lifecycle planned

## Related GENDEV Agents

**Primary:** api-designer, code-generator, security-architect, test-suite-generator, documentation-generator

**Supporting:** requirements-analyst, database-integration-specialist, performance-optimizer, security-analyzer, api-gateway-specialist, system-monitor, developer-experience-specialist, api-versioning-specialist, api-lifecycle-manager, environment-manager

## Integration Points

- **Prerequisites:** architecture-design, requirements
- **Parallel:** security-assessment, performance-optimization
- **Triggers:** feature-development, testing-validation
- **Integrates:** deployment-release, documentation-generation

## Best Practices

1. Design-first approach
2. Security by default
3. Performance awareness
4. Documentation excellence
5. Testing rigor
6. Version management
7. Developer experience focus
8. Comprehensive monitoring
