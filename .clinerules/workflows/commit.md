---
description: This is the basic workflow to gather last changes, prepare a relevant commit message and commit the staged code changes
---
This workflow guides the creation of a high-quality, comprehensive commit message that accurately reflects all staged changes, adhering strictly to the Conventional Commits 1.0 standard.

**1. Comprehensive Evidence Gathering (MANDATORY - Prevent tunnel vision):**

**1.1. Staged Changes Analysis:**
* **Detailed Diff Review:** Run `git diff --staged --stat` to get both summary and detailed view of all staged changes.
* **File-by-File Analysis:** Run `git diff --staged --name-status` to see the operation type (Modified, Added, Deleted) for each file.
* **Functional Area Classification:** Group staged files by functional area:
  - **API Changes:** `src/groovy/umig/api/`, `src/groovy/umig/repository/`
  - **UI Changes:** `src/groovy/umig/web/js/`, `src/groovy/umig/web/css/`, `src/groovy/umig/macros/`
  - **Documentation:** `docs/`, `README.md`, `CHANGELOG.md`, `*.md` files
  - **Tests:** `src/groovy/umig/tests/`, `local-dev-setup/__tests__/`
  - **Configuration:** `local-dev-setup/liquibase/`, `*.json`, `*.yml`, `*.properties`
  - **Database:** Migration files, schema changes
* **Change Type Analysis:** For each file, determine the type of change:
  - New functionality added
  - Existing functionality modified
  - Bug fixes
  - Refactoring or code cleanup
  - Documentation updates
  - Test additions or modifications

**1.2. Unstaged and Untracked Files Review:**
* **Related Files Check:** Run `git status --porcelain` to identify any untracked or unstaged files that might be related.
* **Completeness Verification:** Ensure all related changes are staged or deliberately excluded.
* **User Prompt:** If potentially related files are unstaged, prompt the user about inclusion.

**1.3. Work Stream Identification:**
* **Primary Work Stream:** Identify the main type of work being committed.
* **Secondary Work Streams:** Identify supporting changes (e.g., tests, documentation, configuration).
* **Cross-Functional Impact:** Note changes that span multiple functional areas.
* **Architecture Impact:** Identify any architectural or pattern changes.

**2. Multi-Context Rationale Analysis (MANDATORY - Address tunnel vision):**

**2.1. Session Context Review:**
* **Conversation Timeline:** Review the entire session conversation to understand the evolution of the work.
* **Initial Problem:** Identify the original problem or task that initiated the changes.
* **Decision Points:** Note key decisions made during the session that influenced the implementation.
* **Scope Evolution:** If the work expanded beyond the initial scope, understand how and why.

**2.2. Development Context:**
* **Dev Journal Review:** If a development journal entry was created during the session, review it for high-level narrative.
* **Related Work:** Check if this commit is part of a larger feature or bug fix spanning multiple commits.
* **Previous Commits:** Review recent commits to understand the progression of work.

**2.3. Business and Technical Context:**
* **Business Impact:** Understand what user-facing or system benefits this change provides.
* **Technical Motivation:** Identify the technical reasons for the changes (performance, maintainability, new features).
* **Problem-Solution Mapping:** For each work stream, clearly understand:
  - What problem was being solved
  - Why this particular solution was chosen
  - What alternatives were considered
  - What the outcome achieves

**2.4. Change Dependencies:**
* **Cross-Stream Dependencies:** How different work streams in this commit depend on each other.
* **External Dependencies:** Any external factors that influenced the changes.
* **Future Implications:** What this change enables or constrains for future development.

**3. Multi-Stream Commit Message Synthesis (MANDATORY - Address tunnel vision):**

The goal is to create a message that comprehensively explains all changes and their context for future developers.

**3.1. Type and Scope Selection:**
* **Primary Type:** Choose the most significant type from the allowed list (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`).
* **Multi-Stream Consideration:** If multiple significant work streams exist, choose the type that best represents the overall impact.
* **Scope Selection:** Identify the primary part of the codebase affected:
  - **Specific Components:** `api`, `ui`, `db`, `auth`, `docs`, `tests`
  - **Functional Areas:** `admin`, `migration`, `iteration`, `planning`
  - **System-Wide:** Use broader scopes for cross-cutting changes

**3.2. Subject Line Construction:**
* **Imperative Mood:** Write a concise summary (under 50 characters) in imperative mood.
* **Multi-Stream Subject:** If multiple work streams are significant, write a subject that captures the overall achievement.
* **Specific vs General:** Balance specificity with comprehensiveness.

**3.3. Body Structure (Enhanced for Multi-Stream):**
* **Primary Change Description:** Start with the main change and its motivation.
* **Work Stream Breakdown:** For each significant work stream:
  - **What Changed:** Specific files, components, or functionality
  - **Why Changed:** Problem being solved or improvement being made
  - **How Changed:** Technical approach or implementation details
  - **Impact:** What this enables or improves
* **Cross-Stream Integration:** How different work streams work together.
* **Technical Decisions:** Explain significant design choices and why alternatives were rejected.
* **Context:** Provide enough context for future developers to understand the change.

**3.4. Footer Considerations:**
* **Breaking Changes:** Use `BREAKING CHANGE:` for any breaking changes with migration notes.
* **Issue References:** Reference related issues (e.g., `Closes #123`, `Relates to #456`).
* **Co-authorship:** Add `Co-Authored-By:` for pair programming or AI assistance.

**3.5. Message Assembly:**
* **Single Coherent Story:** Weave multiple work streams into a single, coherent narrative.
* **Logical Flow:** Organize information in a logical sequence that makes sense to readers.
* **Appropriate Detail:** Include enough detail to understand the change without overwhelming.

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

* Present the generated commit message to the user for review.
* After receiving confirmation, execute the `git commit` command.