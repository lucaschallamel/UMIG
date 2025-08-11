---
description: Enhanced AI-assisted workflow to gather changes, analyze context, and create comprehensive commit messages with GENDEV agent integration
---

# Enhanced Commit Workflow with GENDEV Agent Integration

**AI-Assisted workflow for creating comprehensive commit messages with specialized agent expertise**

## Purpose

This enhanced workflow leverages GENDEV agents to ensure:

- Comprehensive change analysis with AI assistance
- High-quality commit messages following Conventional Commits 1.0
- Automated quality validation and security review
- Context-aware documentation and impact assessment
- Consistent application of project standards

## When to Use

- Before every commit to the repository
- When you have staged changes ready for commit
- As part of your regular development workflow
- Before creating pull requests
- When working on complex or multi-faceted changes

## Prerequisites

- Changes are staged (`git add`)
- GENDEV agents are available in your Claude Code environment
- You understand the basic scope of your changes
- Related documentation updates are included
- Tests are passing (if applicable)

This workflow guides the creation of a high-quality, comprehensive commit message that accurately reflects all staged changes, adhering strictly to the Conventional Commits 1.0 standard.

**1. Comprehensive Evidence Gathering (MANDATORY - Prevent tunnel vision):**

**1.1. Staged Changes Analysis:**

- **Detailed Diff Review:** Run `git diff --staged --stat` to get both summary and detailed view of all staged changes.
- **File-by-File Analysis:** Run `git diff --staged --name-status` to see the operation type (Modified, Added, Deleted) for each file.
- **Functional Area Classification:** Group staged files by functional area:
  - **API Changes:** `src/api/`, backend service components
  - **UI Changes:** `src/app/`, frontend components and styling
  - **Documentation:** `docs/memory-bank/`, `docs/devJournal/`, `docs/adr/`, `docs/roadmap/`, README.md files
  - **Tests:** `src/tests/`, `src/tests/e2e/`, `src/tests/postman/`
  - **Configuration:** `local-dev-setup/`, `*.json`, `*.yml`, `*.properties`
  - **Database:** `db/liquibase/`, migration files, schema changes
  - **Utilities:** `src/utils/`, shared components
- **Change Type Analysis:** For each file, determine the type of change:
  - New functionality added
  - Existing functionality modified
  - Bug fixes
  - Refactoring or code cleanup
  - Documentation updates
  - Test additions or modifications

**1.2. Enhanced Unstaged and Untracked Files Analysis:**

**Agent Integration:**

```bash
# Use QA Coordinator for completeness validation
/gd:qa-coordinator --validation_level=standard
```

**Manual Commands:**

```bash
# Check for unstaged changes
git diff

# Check for untracked files
git ls-files --others --exclude-standard
```

**Agent-Enhanced Assessment:**

- Automated detection of related files that should be included
- Identification of temporary files requiring cleanup
- Validation of new files against project standards
- Cross-reference with documentation requirements

**1.3. Intelligent Work Stream Identification:**

**Agent Integration:**

```bash
# Use Context Manager for work stream analysis
/gd:context-manager --context_operation=analyze --quality_threshold=0.9
```

**Enhanced Work Stream Analysis:**

- **Primary work stream**: Main feature/fix with impact assessment
- **Secondary work streams**: Related improvements with dependency mapping
- **Incidental work streams**: Cleanup activities with quality metrics
- **Cross-cutting concerns**: Security, performance, or architectural implications

**2. AI-Assisted Multi-Context Rationale Analysis (MANDATORY - Address tunnel vision):**

**Agent Integration:**

```bash
# Use Requirements Analyst for context understanding
/gd:requirements-analyst --validation_level=enterprise --stakeholder_count=5 --timeline_constraint=normal --domain_complexity=medium
```

**2.1. Enhanced Session Context Review:**

- **Conversation Timeline:** AI-assisted review of session evolution
- **Initial Problem:** Automated identification of root requirements
- **Decision Points:** Agent-tracked decision rationale
- **Scope Evolution:** Impact analysis of scope changes

**2.2. AI-Enhanced Development Context:**

- **Dev Journal Review:** Automated narrative extraction from `docs/devJournal/`
- **Memory Bank Integration:** Cross-reference with `docs/memory-bank/` files
- **ADR References:** Integration with `docs/adr/` for architectural decisions
- **README Maintenance:** Validation of README.md files in affected work folders
- **Related Work:** Cross-commit dependency analysis
- **Previous Commits:** Pattern recognition and consistency checking

**2.3. Comprehensive Business and Technical Context:**

**Agent Benefits:**

- **Business Impact:** Automated stakeholder impact assessment
- **Technical Motivation:** Architecture compliance validation
- **Problem-Solution Mapping:** AI-assisted decision documentation
- **Alternative Analysis:** Automated trade-off documentation

**2.4. Intelligent Change Dependencies:**

- **Cross-Stream Dependencies:** Automated dependency mapping
- **External Dependencies:** Integration impact analysis
- **Future Implications:** Predictive impact assessment

**3. AI-Enhanced Multi-Stream Commit Message Synthesis (MANDATORY - Address tunnel vision):**

**Agent Integration:**

```bash
# Use Documentation Generator for commit message creation
/gd:documentation-generator --doc_type=commit-message --audience_level=expert --format_style=conventional --validation_level=standard
```

The goal is to create a comprehensive, AI-validated message that explains all changes and their context.

**3.1. Intelligent Type and Scope Selection:**

**Agent Benefits:**

- **Primary Type:** AI-assisted analysis of change significance
- **Multi-Stream Consideration:** Automated impact weighting
- **Scope Selection:** Intelligent component classification

**3.2. AI-Optimized Subject Line Construction:**

- **Imperative Mood:** Natural language optimization
- **Multi-Stream Subject:** Automated narrative synthesis
- **Specific vs General:** AI-balanced specificity

**3.3. Context-Rich Body Structure:**

**Agent-Enhanced Structure:**

- **Primary Change Description:** AI-generated motivation analysis
- **Work Stream Breakdown:** Automated impact documentation
- **Cross-Stream Integration:** Dependency visualization
- **Technical Decisions:** AI-assisted rationale capture
- **Context:** Comprehensive future-developer context

**3.4. Automated Footer Construction:**

- **Breaking Changes:** Automated impact detection
- **Issue References:** Intelligent cross-referencing
- **Co-authorship:** Session-based attribution

**3.5. Message Assembly:**

- **Single Coherent Story:** Weave multiple work streams into a single, coherent narrative.
- **Logical Flow:** Organize information in a logical sequence that makes sense to readers.
- **Appropriate Detail:** Include enough detail to understand the change without overwhelming.

**4. Anti-Tunnel Vision Verification (MANDATORY - Use before finalizing):**

Before presenting the commit message, verify you have addressed ALL of the following:

**Content Coverage:**

- [ ] All staged files are explained in the commit message
- [ ] All functional areas touched are documented
- [ ] All work streams are identified and described
- [ ] Change types (feat/fix/docs/etc.) are accurately represented
- [ ] Cross-functional impacts are noted

**Technical Completeness:**

- [ ] Code changes include rationale for the approach taken
- [ ] API changes are summarized with impact
- [ ] UI changes are explained with user impact
- [ ] Database changes include migration details
- [ ] Configuration changes are noted
- [ ] Test changes are explained

**Context and Rationale:**

- [ ] Original problem or motivation is clearly stated
- [ ] Solution approach is justified
- [ ] Technical decisions are explained
- [ ] Alternative approaches are noted (if relevant)
- [ ] Future implications are considered

**Message Quality:**

- [ ] Subject line is under 50 characters and imperative mood
- [ ] Body explains "what" and "why" for each work stream
- [ ] Information is organized in logical flow
- [ ] Appropriate level of detail for future developers
- [ ] Conventional Commits format is followed

**Completeness Verification:**

- [ ] All evidence from steps 1-2 is reflected in the message
- [ ] No significant work is missing from the description
- [ ] Multi-stream nature is properly represented
- [ ] Session context is appropriately captured

**5. Await Confirmation and Commit:**

- Present the generated commit message to the user for review.
- After receiving confirmation, execute the `git commit` command.
