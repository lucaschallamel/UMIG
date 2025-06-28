# Core Coding Principles

> **Scope:** This document defines the core, universal, and project-agnostic engineering principles that apply to all development work. These are the fundamental rules of good software craftsmanship, independent of any specific project.

## Core Coding Principles
* **Simplicity First (SF):** Always choose the simplest viable solution. Complex patterns or architectures require explicit justification.
* **Readability Priority (RP):** Code must be immediately understandable by both humans and AI during future modifications.
* **Dependency Minimalism (DM):** No new libraries or frameworks without explicit request or compelling justification.
* **Industry Standards Adherence (ISA):** Follow established conventions for the relevant language and tech stack.
* **Strategic Documentation (SD):** Comment only complex logic or critical functions. Avoid documenting the obvious.
* **Test-Driven Thinking (TDT):** Design all code to be easily testable from inception.

## Dependency Management
- Review third-party dependencies for vulnerabilities at least quarterly.
- Prefer signed or verified packages.
- Remove unused or outdated dependencies promptly.
- Document dependency updates in the changelog.

## Coding workflow preferences
- Focus on the areas of code relevant to the task
- Do not touch code that is uniflated to the task
- Write thorough tests for all major functionality
- Avoid making major changes to the patterns and architecture of how a feature works, after it has shown to work well, unless explicitly structed
- Always think about what other methods and areas of code might be affected by code changes

## Workflow Standards
* **Atomic Changes (AC):** Make small, self-contained modifications to improve traceability and rollback capability.
* **Commit Discipline (CD):** Recommend regular commits with semantic messages using conventional commit format:
```

type(scope): concise description

[optional body with details]

[optional footer with breaking changes/issue references]

```
Types: feat, fix, docs, style, refactor, perf, test, chore
Adhere to the ConventionalCommit specification: <https://www.conventionalcommits.org/en/v1.0.0/#specification>
* **Transparent Reasoning (TR):** When generating code, explicitly reference which global rules influenced decisions.
* **Context Window Management (CWM):** Be mindful of AI context limitations. Suggest new sessions when necessary.
## Code Quality Guarantees
* **DRY Principle (DRY):** No duplicate code. Reuse or extend existing functionality.
* **Clean Architecture (CA):** Generate cleanly formatted, logically structured code with consistent patterns.
* **Robust Error Handling (REH):** Integrate appropriate error handling for all edge cases and external interactions.
* **Code Smell Detection (CSD):** Proactively identify and suggest refactoring for:
* Functions exceeding 30 lines
* Files exceeding 300 lines
* Nested conditionals beyond 2 levels
* Classes with more than 5 public methods

## Security & Performance Considerations  
* **Input Validation (IV):** All external data must be validated before processing.
* **Resource Management (RM):** Close connections and free resources appropriately.
* **Constants Over Magic Values (CMV):** No magic strings or numbers. Use named constants.
* **Security-First Thinking (SFT):** Implement proper authentication, authorization, and data protection.
* **Performance Awareness (PA):** Consider computational complexity and resource usage.
* Rate limit all api endpoints
* Use row level security always (RLS)
* Captcha on all auth routes/signup pages
* If using hosting solution like vercel, enafple attack challenge on their WAF
* DO NOT read or modify, without prior approval by user:
  - .env files
  - **/config/secrets.*
  - Any file containing API keys or credentials
## AI Communication Guidelines
* **Rule Application Tracking (RAT):** When applying rules, tag with the abbreviation in brackets (e.g., [SF], [DRY]).
* **Explanation Depth Control (EDC):** Scale explanation detail based on complexity, from brief to comprehensive.
* **Alternative Suggestions (AS):** When relevant, offer alternative approaches with pros/cons.
* **Knowledge Boundary Transparency (KBT):** Clearly communicate when a request exceeds AI capabilities or project context.
