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

```bash
/gd:requirements-analyst --domain_complexity=medium --validation_level=standard --stakeholder_count=5 --timeline_constraint=normal
/gd:api-designer
/gd:documentation-generator --doc_type=api --audience_level=developer --validation_level=standard
```

**Deliverables:** Requirements analysis, RESTful design, OpenAPI specs, interactive docs, integration tutorials

### Phase 2: API Implementation

```bash
/gd:deployment-ops-manager --validation_level=standard
/gd:code-refactoring-specialist
/gd:database-schema-designer --validation_level=standard
```

**Deliverables:** Framework setup, endpoint implementation, business logic, data layer, error handling

### Phase 3: Security Implementation

```bash
/gd:security-architect --security_focus=api --validation_level=standard
/gd:security-analyzer --validation_level=standard
```

**Deliverables:** JWT authentication, RBAC, OAuth integration, input validation, rate limiting, security scanning

### Phase 4: API Testing

```bash
/gd:test-suite-generator --test_focus=api_unit --coverage_target=95 --validation_level=standard
/gd:test-suite-generator --test_focus=api_integration --validation_level=standard
/gd:api-designer
```

**Deliverables:** 95% unit coverage, integration tests, contract validation, authentication testing

### Phase 5: Performance & Load Testing

```bash
/gd:performance-optimizer --validation_level=standard
/gd:performance-optimizer --validation_level=standard
```

**Deliverables:** Load testing, response time metrics, scalability validation, optimization recommendations

### Phase 6: API Gateway & Management

```bash
/gd:api-designer
/gd:resource-monitor
```

**Deliverables:** Gateway configuration, rate limiting, monitoring, analytics, SLA tracking

### Phase 7: Documentation & Developer Experience

```bash
/gd:documentation-generator --doc_type=api_comprehensive --format_style=interactive --validation_level=standard
/gd:api-designer
```

**Deliverables:** Interactive portal, SDK generation, multi-language examples, tutorials, sandbox environment

### Phase 8: Versioning & Lifecycle

```bash
/gd:api-designer
/gd:api-designer
```

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
