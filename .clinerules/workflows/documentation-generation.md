---
description: Documentation generation workflow with GENDEV agent orchestration for technical docs, user guides, API docs, and knowledge management
---

# Documentation Generation Workflow

**AI-enhanced documentation creation with multi-format publishing and integrated knowledge management**

## Purpose

Orchestrate GENDEV agents to create comprehensive, maintainable documentation across technical specs, user guides, API docs, and knowledge bases.

## When to Use

- New project documentation or modernization
- API documentation generation
- User guide and tutorial development
- Technical specifications and architecture docs
- Knowledge base creation and maintenance

## Prerequisites

- GENDEV agents available
- Documentation standards established
- Publishing platform configured
- Target audience identified

## Workflow Steps

### Phase 1: Planning & Strategy

```bash
# Documentation requirements and architecture
/gd:documentation-generator --validation_level=enterprise --content_strategy=multi_format
/gd:documentation-generator --validation_level=enterprise
```

**Deliverables:** Audience analysis, content architecture, navigation design, success metrics

### Phase 2: Technical Documentation

```bash
# API and architecture documentation
/gd:documentation-generator --validation_level=standard
/gd:documentation-generator --validation_level=standard
/gd:documentation-generator --validation_level=enterprise
```

**Deliverables:** OpenAPI specs, interactive API docs, architecture diagrams, ADRs, code documentation

### Phase 3: User Documentation

```bash
# User guides and setup documentation
/gd:documentation-generator --validation_level=enterprise --format_style=tutorial
/gd:documentation-generator --validation_level=standard
```

**Deliverables:** Getting started guides, tutorials, installation docs, troubleshooting guides

### Phase 4: Process Documentation

```bash
# Development and operational procedures
/gd:documentation-generator --validation_level=standard
/gd:documentation-generator --validation_level=standard
```

**Deliverables:** Development workflows, coding standards, operational procedures, incident response guides

### Phase 5: Training & Knowledge Base

```bash
# Educational content and knowledge management
/gd:training-change-manager --validation_level=enterprise
/gd:documentation-generator --validation_level=standard
```

**Deliverables:** Training modules, video tutorials, searchable knowledge base, best practices

### Phase 6: Quality Assurance

```bash
# Content review and validation
/gd:code-reviewer
/gd:test-suite-generator --validation_level=standard
```

**Quality Gates:**

- Content accuracy: 100% technical validation
- Usability: User testing and feedback integration
- Accessibility: WCAG 2.1 AA compliance
- Completeness: Full feature coverage

### Phase 7: Publishing & Distribution

```bash
# Multi-format publishing and integration
/gd:documentation-generator --validation_level=standard
/gd:documentation-generator --validation_level=standard
```

**Deliverables:** HTML/PDF/mobile formats, documentation portal, in-app help, API integration

### Phase 8: Maintenance & Evolution

```bash
# Ongoing maintenance and optimization
/gd:documentation-generator --validation_level=standard
/gd:documentation-generator --validation_level=standard
```

**Activities:** Automated updates, version control, user feedback integration, continuous improvement

## Documentation Standards

### Quality Standards

- **Accuracy:** 100% technical validation
- **Completeness:** Comprehensive feature coverage
- **Clarity:** Audience-appropriate writing
- **Consistency:** Unified style and terminology
- **Accessibility:** WCAG 2.1 AA compliance

### Maintenance Standards

- **Currency:** Updates within 30 days of changes
- **Review:** Quarterly comprehensive validation
- **Feedback:** 2-week response to user input
- **Analytics:** Monthly usage review

## Success Criteria

- 100% feature and API coverage
- Positive user feedback and task completion
- Full accessibility compliance
- Effective search and navigation
- Automated update processes
- Active community engagement

## Troubleshooting

### Common Issues

**Content Quality:** Inaccurate/outdated information, inconsistent style
**Technical:** Build failures, integration complexity, performance issues
**Maintenance:** Manual processes, insufficient feedback collection

### Resolution

1. Implement comprehensive review processes
2. Use automation for updates and publishing
3. Focus on user needs and feedback
4. Leverage appropriate tools for efficiency

## Documentation Checklist

- [ ] Requirements and audience analysis completed
- [ ] Content architecture defined
- [ ] Technical documentation created and validated
- [ ] User guides and tutorials developed
- [ ] API documentation generated and tested
- [ ] Process documentation completed
- [ ] Training materials created
- [ ] Quality assurance completed
- [ ] Multi-format publishing implemented
- [ ] Search and navigation validated
- [ ] Analytics and feedback implemented

## Related GENDEV Agents

**Primary:** documentation-generator, api-documentation-generator, user-guide-creator, content-architect, documentation-strategist

**Supporting:** architecture-documenter, code-documenter, setup-guide-creator, process-documenter, operations-documenter, training-material-creator, knowledge-base-builder, content-reviewer, documentation-tester, documentation-publisher, documentation-integrator, documentation-maintainer, documentation-optimizer

## Integration Points

- **Prerequisites:** All development workflows
- **Parallel:** feature-development, api-development
- **Triggers:** Benefits all workflows
- **Integrates:** Project documentation standards (Rules 03, 07)

## Best Practices

1. User-centric approach for task success
2. High standards for accuracy and completeness
3. Leverage automation for consistency
4. Implement feedback loops for improvement
5. Multi-format accessibility support
6. Foster community contribution
7. Seamless workflow integration
8. Fast, searchable documentation experience
