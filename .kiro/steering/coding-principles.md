# Core Coding Principles

## Fundamental Principles

- **[SF] Simplicity First**: Always choose the simplest viable solution
- **[RP] Readability Priority**: Code must be immediately understandable by humans and AI
- **[DM] Dependency Minimalism**: No new libraries without explicit request or justification
- **[ISA] Industry Standards Adherence**: Follow established conventions for language/tech stack
- **[SD] Strategic Documentation**: Comment only complex logic, avoid documenting the obvious
- **[TDT] Test-Driven Thinking**: Design all code to be easily testable from inception

## Workflow Standards

- **[WF-FOCUS]** Focus on areas of code relevant to the task
- **[WF-SCOPE]** Do not touch code unrelated to the task
- **[WF-TEST]** Write thorough tests for all major functionality
- **[WF-ARCH]** Avoid major changes to working patterns unless explicitly requested
- **[WF-IMPACT]** Consider what other code areas might be affected by changes

## Code Quality Guarantees

- **[DRY]** No duplicate code - reuse or extend existing functionality
- **[CA]** Clean Architecture - generate cleanly formatted, logically structured code
- **[REH]** Robust Error Handling - handle all edge cases and external interactions
- **[AC]** Atomic Changes - make small, self-contained modifications

## Code Smell Detection

Proactively identify and suggest refactoring for:

- Functions exceeding 30 lines
- Files exceeding 300 lines
- Nested conditionals beyond 2 levels
- Classes with more than 5 public methods

## Security & Performance

- **[IV]** Input Validation - validate all external data before processing
- **[RM]** Resource Management - close connections and free resources appropriately
- **[CMV]** Constants Over Magic Values - use named constants, no magic strings/numbers
- **[SFT]** Security-First Thinking - implement proper auth, authorization, data protection
- **[PA]** Performance Awareness - consider computational complexity and resource usage

## Commit Standards

Use conventional commit format:

```
type(scope): concise description

[optional body with details]
[optional footer with breaking changes/issue references]
```

Types: feat, fix, docs, style, refactor, perf, test, chore

## AI Communication Guidelines

- **[RAT]** Rule Application Tracking - tag applied rules with abbreviations (e.g., [SF], [DRY])
- **[EDC]** Explanation Depth Control - scale detail based on complexity
- **[AS]** Alternative Suggestions - offer alternative approaches with pros/cons
- **[KBT]** Knowledge Boundary Transparency - communicate when requests exceed capabilities
- **[TR]** Transparent Reasoning - explicitly reference which rules influenced decisions
- **[CWM]** Context Window Management - be mindful of AI context limitations
