---
description: Security assessment workflow with GENDEV agent orchestration for threat modeling, vulnerability scanning, and compliance
---

# Security Assessment Workflow

**AI-enhanced security assessment with threat modeling, vulnerability analysis, and compliance validation**

## Purpose

Orchestrate GENDEV agents for thorough security assessments through threat modeling, vulnerability scanning, compliance validation, and hardening.

## When to Use

- Security audits and compliance
- Threat modeling and risk analysis
- Vulnerability and penetration testing
- Security architecture review
- Incident response investigation

## Prerequisites

- GENDEV agents available
- Security requirements defined
- Security scanning tools access
- Threat intelligence available
- Security policies established

## Workflow Steps

### Phase 1: Security Planning & Scope

```bash
/gd:security-architect --validation_level=enterprise --compliance_framework=iso27001,nist
/gd:resource-monitor
```

**Deliverables:** Assessment scope, compliance alignment, asset inventory, risk methodology, trust zones

### Phase 2: Threat Modeling & Risk Analysis

```bash
/gd:security-architect --validation_level=standard
/gd:risk-manager --validation_level=standard
```

**Deliverables:** STRIDE analysis, attack surface map, risk matrix, threat scenarios, mitigation strategies

### Phase 3: Vulnerability Assessment

```bash
/gd:security-analyzer --validation_level=enterprise
/gd:security-analyzer --validation_level=strict
/gd:security-analyzer --validation_level=enterprise
```

**Deliverables:** Network/system scans, OWASP Top 10 testing, SAST/DAST results, API security validation

### Phase 4: Penetration Testing

```bash
/gd:security-analyzer --validation_level=standard
/gd:security-analyzer --validation_level=enterprise
```

**Deliverables:** Network/web app penetration tests, APT simulation, privilege escalation tests, response validation

### Phase 5: Compliance Assessment

```bash
/gd:security-analyzer --validation_level=enterprise
/gd:security-analyzer --validation_level=standard
```

**Deliverables:** Regulatory compliance validation, control effectiveness, gap analysis, evidence collection

### Phase 6: Security Architecture Review

```bash
/gd:security-architect --validation_level=standard
/gd:security-architect --validation_level=enterprise
```

**Deliverables:** Architecture validation, defense-in-depth assessment, infrastructure hardening, access controls

### Phase 7: Security Testing & Validation

```bash
/gd:test-suite-generator --validation_level=enterprise
/gd:risk-manager --validation_level=enterprise
```

**Deliverables:** Security test suite, incident response validation, disaster recovery testing, forensics capability

### Phase 8: Reporting & Remediation

```bash
/gd:security-analyzer --validation_level=standard
/gd:risk-manager --validation_level=enterprise
```

**Deliverables:** Executive/technical reports, risk prioritization, remediation roadmap, progress tracking

## Security Standards

### Severity Classification

- **Critical**: Immediate exploitation, high impact
- **High**: Likely exploitation, significant impact
- **Medium**: Possible exploitation, moderate impact
- **Low**: Difficult exploitation, minimal impact

### Risk Matrix

- **Critical**: Immediate action
- **High**: 30-day remediation
- **Medium**: 90-day remediation
- **Low**: 180-day remediation

### Compliance Frameworks

ISO 27001, NIST CSF, OWASP, PCI DSS, GDPR/HIPAA

## Success Criteria

- Comprehensive vulnerability identification
- Accurate risk quantification
- Regulatory compliance validation
- Effective remediation execution
- Improved security posture
- Complete documentation

## Troubleshooting

### Common Issues

**Assessment:** Scope definition, false positives, access limitations
**Technical:** Complex architecture, legacy systems, cloud security
**Organizational:** Stakeholder alignment, resource constraints

### Resolution

1. Follow structured methodologies
2. Risk-based prioritization
3. Clear stakeholder communication
4. Leverage automation
5. Continuous improvement

## Security Assessment Checklist

- [ ] Scope and objectives defined
- [ ] Compliance requirements identified
- [ ] Asset inventory completed
- [ ] Threat modeling executed
- [ ] Risk assessment applied
- [ ] Vulnerability scanning completed
- [ ] SAST/DAST performed
- [ ] Penetration testing executed
- [ ] Compliance validated
- [ ] Controls assessed
- [ ] Gap analysis completed
- [ ] Evidence collected
- [ ] Reports generated
- [ ] Remediation planned

## Related GENDEV Agents

**Primary:** security-analyst, threat-modeling-specialist, penetration-tester, compliance-auditor, security-architect

**Supporting:** security-planner, asset-manager, risk-analyst, security-scanner, code-security-analyzer, dynamic-security-tester, red-team-specialist, control-assessor, infrastructure-security-specialist, security-test-generator, incident-simulator, security-reporter, remediation-manager

## Integration Points

- **Prerequisites:** architecture-design, system documentation
- **Parallel:** code-review-quality, performance-optimization
- **Triggers:** feature-development, deployment-release
- **Integrates:** All workflows for security validation

## Best Practices

1. Risk-based assessment approach
2. Continuous security monitoring
3. Clear stakeholder communication
4. Automation for efficiency
5. Current threat intelligence
6. Regulatory compliance alignment
7. Comprehensive documentation
8. Practical remediation focus
