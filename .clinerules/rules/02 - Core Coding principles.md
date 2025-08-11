Title: Rule 02 - Code Implementation Standards  
Scope: **HOW** code is implemented - Core principles, security requirements, and implementation standards. Applies to all code creation and modification activities.

# Rule 02 - Code Implementation Standards

This rule establishes the fundamental implementation principles, security requirements, and code-level standards that govern all development work. It defines the essential requirements for creating secure, maintainable, high-quality code with clear traceability of decision-making through principle-based tagging.

## Core Implementation Principles with Mandatory Tagging

**Fundamental Development Principles**:

- **[SF] Simplicity First**: Always prioritise the simplest viable solution that meets requirements. Complex patterns require explicit justification
- **[RP] Readability Priority**: Code must be immediately comprehensible to humans and AI systems during future maintenance
- **[DM] Dependency Minimalism**: Introduce new libraries or frameworks only with explicit request or compelling technical justification
- **[ISA] Industry Standards Adherence**: Follow established language and framework conventions for consistency and maintainability [Note: 3-letter exception for clarity]
- **[SD] Strategic Documentation**: Document complex logic and critical functions; avoid obvious or redundant comments
- **[TDT] Test-Driven Thinking**: Design all code for testability from the initial implementation phase

**Principle Tagging Requirement**: All code decisions must be tagged with relevant principle abbreviations (e.g., [SF], [DRY]) for traceability and learning

## Quality Assurance & Code Excellence Standards

**Mandatory Quality Guarantees**:

- **[DRY] DRY Principle**: Eliminate all code duplication through reuse and extension of existing functionality
- **[CA] Clean Architecture**: Maintain consistently formatted, logically structured code following established patterns
- **[REH] Robust Error Handling**: Implement comprehensive error handling for all edge cases and external system interactions

**Proactive Code Quality Monitoring**:

- **[CSD] Code Smell Detection**: Actively identify and recommend refactoring for:
  - Functions exceeding 30 lines (suggest modular decomposition)
  - Files exceeding 300 lines (recommend logical separation)
  - Nested conditionals beyond 2 levels (flatten complex logic)
  - Classes with more than 5 public methods (consider single responsibility violations)

**Implementation Excellence Guidelines**:

- **[ENV] Environment Awareness**: Code must function correctly across development, test, and production environments
- **[ORG] Organizational Clarity**: Maintain clean, well-organized codebase structure with logical file and component organization
- **[SCM] Script Management**: Avoid embedding one-time scripts in production files; use dedicated utility directories
- **[MOD] Modularity Focus**: Prefer modular, reusable components over monolithic implementations

## Workflow & Change Management Standards

**Workflow Principles**:

- **[FOC] Focus on Relevant Code**: Focus on areas of code relevant to the task
- **[SCP] Scope Protection**: Do not touch code unrelated to the task
- **[TST] Test Coverage**: Write thorough tests for all major functionality
- **[ARC] Architecture Stability**: Avoid major changes to working patterns/architecture unless explicitly requested
- **[IMP] Impact Analysis**: Consider what other methods and areas might be affected by changes

**Change Standards**:

- **[AC] Atomic Changes:** Make small, self-contained modifications for traceability and rollback
- Make only requested changes or those confidently understood and related to the request
- When fixing bugs, exhaust existing implementation options before introducing new patterns
- Remove old implementation when introducing new patterns to avoid duplicate logic

**Commit Standards**:

- **[CD] Commit Discipline:** Regular commits with semantic messages using conventional commit format:

```
type(scope): concise description

[optional body with details]

[optional footer with breaking changes/issue references]
```

Types: feat, fix, docs, style, refactor, perf, test, chore
Adhere to ConventionalCommit specification: https://www.conventionalcommits.org/en/v1.0.0/#specification

## Mandatory Security Implementation Standards

**Core Security Principles**:

- **[IV] Input Validation**: All external data must undergo comprehensive validation before any processing
- **[SFT] Security-First Thinking**: Implement robust authentication, authorization, and data protection as foundational requirements
- **[RM] Resource Management**: Properly close all connections and free system resources to prevent leaks
- **[CMV] Constants Over Magic Values**: Eliminate magic strings and numbers; use descriptive named constants exclusively

**Non-Negotiable Security Controls**:

- **[RL] Rate Limiting**: Implement rate limiting on ALL API endpoints without exception
- **[RLS] Row Level Security**: Apply row-level security consistently across all data access patterns
- **[CAP] CAPTCHA Integration**: Mandatory CAPTCHA implementation on all authentication routes and signup pages
- **[WAF] Web Application Firewall**: Enable attack challenge mechanisms on WAF (e.g., Vercel, Cloudflare)

**Absolute Security Restrictions**:

- **[SPO] Secure Prohibited Operations - Prior Approval Required**:
  - Reading or modifying .env files or environment configuration
  - Accessing _/config/secrets._ or any secrets management files
  - Handling any files containing API keys, credentials, or sensitive authentication data
- **Cross-Reference**: Aligns with Rule 01 compliance and privacy governance requirements

## Performance & Resource Management Standards

**Performance Excellence Requirements**:

- **[PA] Performance Awareness**: Systematically consider computational complexity and resource usage in all implementations
- **[RM] Resource Management**: Implement proper lifecycle management for connections, memory, and system resources

**Architectural Patterns & Code Organization**:

- **API Client Generation**: Use OpenAPI Generator with TypeScript axios template for consistent API client creation
- **Generated Code Location**: Place all auto-generated code in `/src/generated` directory for clear separation
- **Design Patterns**: Prefer composition over inheritance for flexible, maintainable code architecture
- **Data Access**: Implement repository pattern for consistent and testable data access layers
- **Error Handling**: Follow established error handling patterns for consistency across the application

**REST Endpoint Implementation Standards**:

- **Pattern Adherence**: Follow `CustomEndpointDelegate` pattern for REST endpoints in package-scoped Groovy files
- **Package Declaration**: Always declare package namespace at the top of endpoint files
- **Configuration Management**: Configure REST script roots and packages via environment variables for automatic discovery

## Build & Deployment Excellence Standards

**Build System Requirements**:

- **Deployment Simplicity**: Avoid unnecessary build plugin complexity; prioritise script-based, automatable deployment processes
- **Data Management**: Restrict mocking and synthetic data to test environments exclusively; never in development or production
- **Production Safety**: Prohibit stubbing or fake data patterns that could affect development or production environments
- **Configuration Protection**: Never overwrite .env files without explicit user confirmation and backup procedures

## Comprehensive Dependency Management

**Third-Party Dependency Governance**:

- **[QSR] Quarterly Security Review**: Conduct comprehensive vulnerability assessment of all third-party dependencies
- **[PKV] Package Verification**: Prioritise signed or cryptographically verified packages for security assurance
- **[DEH] Dependency Hygiene**: Remove unused or outdated dependencies promptly to reduce attack surface
- **[DCH] Dependency Change Documentation**: Document all dependency updates with rationale in project changelog

**Cross-Reference**: Integrates with Rule 01 quality automation and security framework requirements

## AI Communication & Transparency Standards

**Enhanced Communication Framework**:

- **[RAT] Rule Application Tracking**: Mandatory tagging of all rule applications with principle abbreviations for decision traceability
- **[TR] Transparent Reasoning**: Explicit documentation of which rules and principles influenced specific implementation decisions
- **[EDC] Explanation Depth Control**: Adaptive detail scaling based on complexity and context requirements
- **[AS] Alternative Suggestions**: Proactive offering of alternative approaches with comprehensive pros/cons analysis
- **[KBT] Knowledge Boundary Transparency**: Clear communication when requests exceed current capabilities or available context
- **[CWM] Context Window Management**: Proactive management of AI context limitations with session transition recommendations when necessary

**Integration Excellence**: These communication standards ensure seamless integration with SuperClaude framework and development workflow requirements
