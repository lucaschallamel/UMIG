---
description: Fast variant for rapid security assessment with essential threat modeling and vulnerability scanning
---

# Security Assessment - Fast Track

**Rapid security validation with vulnerability scanning, compliance checks, and risk prioritization**

## Prerequisites

- Security requirements defined
- Scanning tools available
- Compliance frameworks identified

## Workflow Steps

### Phase 1: Threat Modeling & Risk

```bash
/gd:security-architect --validation_level=standard
/gd:risk-manager --validation_level=standard
```

**Deliverables:** Threat model, attack surface, risk matrix, critical vulnerabilities, mitigation priorities

### Phase 2: Vulnerability Scanning

```bash
/gd:security-analyzer --validation_level=standard
/gd:security-analyzer --validation_level=standard
```

**Deliverables:** Vulnerability report, OWASP compliance, code security issues, API vulnerabilities

### Phase 3: Compliance & Controls

```bash
/gd:security-architect --validation_level=standard
/gd:test-suite-generator --validation_level=standard
```

**Deliverables:** Compliance status, control effectiveness, gap analysis, security test results

### Phase 4: Remediation & Reporting

```bash
/gd:risk-manager --validation_level=standard
/gd:documentation-generator --validation_level=standard
```

**Deliverables:** Remediation roadmap, executive summary, technical report, action items

## Quality Gates

- **Critical**: Zero critical vulnerabilities
- **High Risk**: Remediation plan required
- **Compliance**: Core controls validated
- **Testing**: Security tests passing

## Success Criteria

- Critical risks identified
- Vulnerabilities prioritized
- Compliance validated
- Remediation planned
- Reports delivered

## Quick Troubleshooting

- **False positives**: Validate manually, update rules
- **Complex threats**: Focus on critical assets first
- **Resource constraints**: Prioritize by business impact

## Integration

- **Prerequisites**: architecture-design, code complete
- **Triggers**: deployment-release, compliance audit
