# Core Coding Principles

> **Scope:** This document defines the core, universal, and project-agnostic engineering principles that apply to all development work. These are the fundamental rules of good software craftsmanship, independent of any specific project.

## Core Coding Principles

- [SF] **Simplicity First:** Always choose the simplest viable solution. Complex patterns or architectures require explicit justification.
- [RP] **Readability Priority:** Code must be immediately understandable by both humans and AI during future modifications.
- [DM] **Dependency Minimalism:** No new libraries or frameworks without explicit request or compelling justification.
- [ISA] **Industry Standards Adherence:** Follow established conventions for the relevant language and tech stack.
- [SD] **Strategic Documentation:** Comment only complex logic or critical functions. Avoid documenting the obvious.
- [TDT] **Test-Driven Thinking:** Design all code to be easily testable from inception.

## Dependency Management

- [DM-1] Review third-party dependencies for vulnerabilities at least quarterly.
- [DM-2] Prefer signed or verified packages.
- [DM-3] Remove unused or outdated dependencies promptly.
- [DM-4] Document dependency updates in the changelog.

## Coding workflow preferences

- [WF-FOCUS] Focus on the areas of code relevant to the task
- [WF-SCOPE] Do not touch code that is unrelated to the task
- [WF-TEST] Write thorough tests for all major functionality
- [WF-ARCH] Avoid making major changes to the patterns and architecture of how a feature works, after it has shown to work well, unless explicitly structured
- [WF-IMPACT] Always think about what other methods and areas of code might be affected by code changes

## Workflow Standards

- [AC] **Atomic Changes:** Make small, self-contained modifications to improve traceability and rollback capability.
- [CD] **Commit Discipline:** Recommend regular commits with semantic messages using conventional commit format:

```

type(scope): concise description

[optional body with details]

[optional footer with breaking changes/issue references]

```

Types: feat, fix, docs, style, refactor, perf, test, chore
Adhere to the ConventionalCommit specification: <https://www.conventionalcommits.org/en/v1.0.0/#specification>

- [TR] **Transparent Reasoning:** When generating code, explicitly reference which global rules influenced decisions.
- [CWM] **Context Window Management:** Be mindful of AI context limitations. Suggest new sessions when necessary.

## Code Quality Guarantees

- [DRY] **DRY Principle:** No duplicate code. Reuse or extend existing functionality.
- [CA] **Clean Architecture:** Generate cleanly formatted, logically structured code with consistent patterns.
- [REH] **Robust Error Handling:** Integrate appropriate error handling for all edge cases and external interactions.
- [CSD] **Code Smell Detection:** Proactively identify and suggest refactoring for:
  - Functions exceeding 30 lines
  - Files exceeding 300 lines
  - Nested conditionals beyond 2 levels
  - Classes with more than 5 public methods

## Security & Performance Considerations

- [IV] **Input Validation:** All external data must be validated before processing.
- [RM] **Resource Management:** Close connections and free resources appropriately.
- [CMV] **Constants Over Magic Values:** No magic strings or numbers. Use named constants.
- [SFT] **Security-First Thinking:** Implement proper authentication, authorization, and data protection.
- [PA] **Performance Awareness:** Consider computational complexity and resource usage.
- [RL] Rate limit all API endpoints.
- [RLS] Use row-level security always (RLS).
- [CAP] Captcha on all auth routes/signup pages.
- [WAF] If using hosting solution like Vercel, enable attack challenge on their WAF.
- [SEC-1] **DO NOT** read or modify, without prior approval by user:
  - .env files
  - \*_/config/secrets._
  - Any file containing API keys or credentials

## AI Communication Guidelines

- [RAT] **Rule Application Tracking:** When applying rules, tag with the abbreviation in brackets (e.g., [SF], [DRY]).
- [EDC] **Explanation Depth Control:** Scale explanation detail based on complexity, from brief to comprehensive.
- [AS] **Alternative Suggestions:** When relevant, offer alternative approaches with pros/cons.
- [KBT] **Knowledge Boundary Transparency:** Clearly communicate when a request exceeds AI capabilities or project context.
