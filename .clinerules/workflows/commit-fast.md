---
description: Fast variant for rapid commit workflow with essential change analysis and quality commit messages
---

# Commit Workflow - Fast Track

**Rapid commit creation with change analysis, context capture, and quality validation**

## Prerequisites

- Changes staged (`git add`)
- Basic understanding of change scope
- Tests passing (if applicable)

## Workflow Steps

### Phase 1: Change Analysis & Context

```bash
/gd:qa-coordinator --validation_level=standard
/gd:context-manager
```

**Deliverables:** Staged changes analysis, work stream identification, session context, completeness validation

### Phase 2: Multi-Stream Assessment

```bash
/gd:requirements-analyst --validation_level=standard --timeline_constraint=normal --domain_complexity=medium
git diff --staged --stat && git status --porcelain
```

**Deliverables:** Business/technical context, change dependencies, impact assessment, unstaged file review

### Phase 3: Commit Message Generation

```bash
/gd:documentation-generator --doc_type=commit_message --validation_level=standard
```

**Deliverables:** Conventional Commits format, multi-stream narrative, context-rich body, proper footers

### Phase 4: Anti-Tunnel Vision Verification

```bash
/gd:code-reviewer
```

**Deliverables:** Coverage verification, completeness validation, quality assurance, final commit message

## Quality Gates

- **Coverage**: All staged changes explained
- **Format**: Conventional Commits 1.0 compliance
- **Context**: Business/technical rationale clear
- **Completeness**: No missing work streams

## Success Criteria

- All changes documented
- Context captured
- Format compliant
- Future developers informed
- Anti-tunnel vision verified

## Quick Troubleshooting

- **Missing context**: Review session conversation, check dev journal
- **Incomplete coverage**: Compare commit message against `git diff --staged`
- **Format issues**: Validate against Conventional Commits spec

## Integration

- **Prerequisites**: Development work complete
- **Triggers**: Pull request creation, deployment release
