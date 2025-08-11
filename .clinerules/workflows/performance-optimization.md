---
description: Performance optimization workflow with GENDEV agent orchestration for analysis, bottleneck identification, and optimization
---

# Performance Optimization Workflow

**AI-enhanced performance optimization with analysis, bottleneck identification, and validation**

## Purpose

Orchestrate GENDEV agents for comprehensive performance optimization through analysis, bottleneck identification, targeted optimization, and validation.

## When to Use

- Performance degradation resolution
- Scalability and capacity planning
- System resource optimization
- Database performance tuning
- Application performance improvement
- Load testing and benchmarking

## Prerequisites

- GENDEV agents available
- Monitoring tools configured
- Baseline metrics established
- Load testing environment ready
- SLA targets defined

## Workflow Steps

### Phase 1: Performance Analysis & Baseline

```bash
/gd:performance-optimizer --validation_level=enterprise
/gd:requirements-analyst --validation_level=standard --timeline_constraint=normal --domain_complexity=medium
```

**Deliverables:** Baseline metrics, resource utilization, SLA validation, trend analysis, growth requirements

### Phase 2: System Performance Profiling

```bash
/gd:performance-optimizer --validation_level=enterprise
/gd:database-schema-designer --validation_level=enterprise
/gd:performance-optimizer --validation_level=enterprise
```

**Deliverables:** CPU/memory profiling, query optimization, infrastructure assessment, bottleneck identification

### Phase 3: Bottleneck Identification

```bash
/gd:performance-optimizer --validation_level=standard
/gd:test-suite-generator --validation_level=standard
```

**Deliverables:** Bottleneck classification, resource contention analysis, load test results, breaking points

### Phase 4: Optimization Strategy

```bash
/gd:performance-optimizer --validation_level=enterprise
/gd:performance-optimizer --validation_level=standard
```

**Deliverables:** Optimization roadmap, ROI analysis, architecture patterns, caching strategy, async processing

### Phase 5: Code & Algorithm Optimization

```bash
/gd:code-refactoring-specialist
/gd:database-schema-designer --validation_level=enterprise
```

**Deliverables:** Algorithm improvements, data structure optimization, query tuning, index optimization

### Phase 6: Caching & Resource Optimization

```bash
/gd:performance-optimizer --validation_level=standard
/gd:resource-monitor
```

**Deliverables:** Multi-tier caching, CDN optimization, runtime tuning, system configuration

### Phase 7: Performance Testing & Validation

```bash
/gd:performance-optimizer --validation_level=standard
/gd:test-suite-generator --validation_level=enterprise
```

**Deliverables:** Before/after comparison, A/B testing, scalability validation, SLA compliance

### Phase 8: Monitoring & Continuous Optimization

```bash
/gd:performance-optimizer --validation_level=enterprise
/gd:performance-optimizer --validation_level=standard
```

**Deliverables:** APM implementation, real-time dashboards, regression detection, continuous improvement

## Performance Standards

### Metrics

- Response: <200ms API, <2s web
- Throughput: Baseline +50%
- Resources: <70% CPU, <80% memory
- Availability: 99.9% uptime
- Scalability: Linear scaling

### Targets

- 50% latency reduction
- 100% throughput increase
- 30% resource efficiency
- 25% cost reduction

### Quality Gates

- No performance regression
- Stability maintained
- Functionality preserved
- Security uncompromised
- Maintainability enhanced

## Success Criteria

- Measurable performance improvement
- SLA targets achieved
- Enhanced scalability
- Improved resource efficiency
- Better user experience
- Comprehensive monitoring operational

## Troubleshooting

### Common Issues

**Analysis:** Incomplete baselines, complex dependencies, tool limitations
**Implementation:** Code regressions, query instability, caching complexity
**Validation:** Environment differences, regression detection challenges

### Resolution

1. Structured methodology
2. Data-driven decisions
3. Incremental implementation
4. Thorough validation
5. Continuous monitoring

## Performance Checklist

- [ ] Baseline metrics established
- [ ] SLA targets validated
- [ ] System profiling completed
- [ ] Bottlenecks prioritized
- [ ] Load testing executed
- [ ] Optimization strategy defined
- [ ] Architecture patterns applied
- [ ] Code optimizations implemented
- [ ] Database tuning deployed
- [ ] Caching configured
- [ ] Resource optimization applied
- [ ] Validation completed
- [ ] Monitoring implemented
- [ ] Documentation updated

## Related GENDEV Agents

**Primary:** performance-optimizer, performance-analyzer, bottleneck-detector, load-testing-specialist, database-performance-specialist

**Supporting:** application-profiler, infrastructure-performance-specialist, optimization-strategist, performance-architect, code-optimizer, database-optimizer, caching-specialist, resource-optimizer, performance-tester, scalability-tester, performance-monitor, continuous-optimizer

## Integration Points

- **Prerequisites:** feature-development, architecture-design
- **Parallel:** testing-validation, security-assessment
- **Triggers:** deployment-release, monitoring setup
- **Integrates:** All workflows for performance

## Best Practices

1. Measurement-driven approach
2. Systematic methodology
3. Incremental implementation
4. Holistic system perspective
5. User-centric optimization
6. Long-term sustainability
7. Continuous improvement
8. Knowledge sharing
