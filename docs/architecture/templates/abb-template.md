### `abb-template.md` - Architecture Building Block Template

````markdown
# Architecture Building Block: [ABB-XXX-NNN]

**Classification:** [Data Management | Security Services | Integration Services | Process Management | Presentation Services]  
**Category:** Technology-Agnostic Specification  
**Version:** 1.0  
**Status:** [Draft | Review | Approved | Deprecated]  
**Date:** [YYYY-MM-DD]

## Executive Summary

[One paragraph description of what capability this ABB provides and why it's needed]

## Capability Definition

### Core Capabilities

| Capability         | Description    | Quality Attributes                              |
| ------------------ | -------------- | ----------------------------------------------- |
| **[Capability 1]** | [What it does] | [Quality requirement, e.g., Reliability: 99.9%] |
| **[Capability 2]** | [What it does] | [Quality requirement]                           |
| **[Capability 3]** | [What it does] | [Quality requirement]                           |

### Optional Capabilities

| Capability       | Description    | When Required            |
| ---------------- | -------------- | ------------------------ |
| **[Optional 1]** | [What it does] | [Conditions when needed] |

## Required Interfaces

### Interface Specification

```text
[InterfaceName] {
    // Required Operations (must be implemented)
    + operation1(param: Type): ReturnType
    + operation2(param: Type): ReturnType

    // Optional Operations (may be implemented)
    ? optionalOp(param: Type): ReturnType

    // Events (if applicable)
    ! eventName(data: EventData): void
}
```
````

### Interface Contracts

| Operation    | Preconditions              | Postconditions            | Invariants                 |
| ------------ | -------------------------- | ------------------------- | -------------------------- |
| `operation1` | [What must be true before] | [What must be true after] | [What always remains true] |

## Information Model

### Data Entities

| Entity     | Description          | Relationships              |
| ---------- | -------------------- | -------------------------- |
| [Entity 1] | [What it represents] | [How it relates to others] |

### State Model

```text
[State Diagram or Description]
Initial State → State 1 → State 2 → Final State
```

## Quality Requirements

### Mandatory Requirements

| Quality Attribute | Requirement   | Measurement    |
| ----------------- | ------------- | -------------- |
| **Availability**  | [Requirement] | [How measured] |
| **Performance**   | [Requirement] | [How measured] |
| **Security**      | [Requirement] | [How measured] |
| **Scalability**   | [Requirement] | [How measured] |

### Trade-offs

| Attribute 1 | vs  | Attribute 2 | Decision Guidance        |
| ----------- | --- | ----------- | ------------------------ |
| [Attribute] | vs  | [Attribute] | [How to decide priority] |

## Implementation Requirements

### Mandatory Patterns

- [Pattern 1: Description and rationale]
- [Pattern 2: Description and rationale]

### Prohibited Patterns

- [Anti-pattern 1: What not to do and why]
- [Anti-pattern 2: What not to do and why]

## Compliance Requirements

### Standards

| Standard        | Requirement              | Validation        |
| --------------- | ------------------------ | ----------------- |
| [Standard name] | [What must be compliant] | [How to validate] |

### Regulations

| Regulation   | Applicability     | Requirements      |
| ------------ | ----------------- | ----------------- |
| [Regulation] | [When applicable] | [What's required] |

## Implementation Guidance

### Recommended Approach

1. [Step 1: High-level guidance]
2. [Step 2: High-level guidance]
3. [Step 3: High-level guidance]

### Common Pitfalls

- [Pitfall 1: What to avoid]
- [Pitfall 2: What to avoid]

## Validation Criteria

### Acceptance Tests

| Test     | Purpose             | Pass Criteria           |
| -------- | ------------------- | ----------------------- |
| [Test 1] | [What it validates] | [Definition of success] |

### Compliance Checklist

- [ ] All mandatory interfaces implemented
- [ ] Quality requirements met
- [ ] Standards compliance verified
- [ ] Security requirements satisfied
- [ ] Documentation complete

## Known Implementations

| Implementation | Technology   | Status   | Reference  |
| -------------- | ------------ | -------- | ---------- |
| [SBB-XXX-NNN]  | [Technology] | [Status] | [Link/Doc] |

## Dependencies

### Required ABBs

- [ABB-XXX-NNN]: [Why required]

### Optional ABBs

- [ABB-XXX-NNN]: [When beneficial]

## Version History

| Version | Date   | Author   | Changes               |
| ------- | ------ | -------- | --------------------- |
| 1.0     | [Date] | [Author] | Initial specification |

## Approval

- **Business Owner:** [Name, Date]
- **Technical Owner:** [Name, Date]
- **Architecture Board:** [Approval Date]

```

```
