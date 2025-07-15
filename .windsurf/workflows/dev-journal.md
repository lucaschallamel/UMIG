---
description: At the end of each session, we look back at everything that was said and done, and we write down a Development Journal Entry
---

---
description: At the end of each session, we look back at everything that was said and done, and we write down a Development Journal Entry
---
The Developer Journal is a great way to keep track of our progress and document the way we made design decisions and coding breakthroughs.

The task is to generate a new Developer Journal entry in the `docs/devJournal` folder, in markdown format, using the naming convention `yyyymmdd-nn.md`.

The content of the entry must narrate the session's story. To ensure the full context is captured, you will follow these steps in order:

**1. Establish the 'Why' (The High-Level Context):**

* First, determine the active feature branch by running `git branch --show-current`.
* Then, find and read the most recent previous journal entry to understand the starting point.
* Synthesise these with the beginning of our current conversation to state the session's primary goal or the feature being worked on.

**2. Gather Evidence of 'The How' (The Journey):**

This step is critical to avoid "tunnel vision". You must perform a deep analysis of the entire session using multiple evidence sources.

**2.1. Multi-Source Evidence Gathering (MANDATORY - All sources must be reviewed):**

* **Conversation Chronology:** Create a timeline of the entire session from start to finish. Note every major topic, tool usage, file interaction, and decision point.
* **Git Commit Analysis:** Run `git log --since="YYYY-MM-DD" --stat --oneline` to get a comprehensive view of all commits since the last journal entry. Each commit represents a separate work stream that must be captured.
* **Staged Changes Analysis:** Run `git diff --staged --name-status` to see what's currently staged for commit (if anything).
* **File System Impact:** Run `git status --porcelain` to see all modified, added, and untracked files. Group by functional area (API, UI, docs, tests, etc.).
* **Documentation Trail:** Check for changes in:
  - `CHANGELOG.md` (often contains structured summaries of work)
  - `README.md` and other root-level documentation
  - `docs/` directory (API specs, ADRs, solution architecture)
  - `cline-docs/` (memory bank files)
  - Any workflow executions mentioned in conversation

**2.2. Evidence Cross-Reference (MANDATORY - Prevent tunnel vision):**

* **Workflow Execution Review:** If any workflows were mentioned in the conversation (e.g., `.clinerules/workflows/`), review their outputs and ensure their objectives are captured.
* **API Development Pattern:** If API work was done, check for:
  - New/modified Groovy files in `src/groovy/umig/api/`
  - New/modified repository files in `src/groovy/umig/repository/`
  - Documentation updates in `docs/api/`
  - OpenAPI specification changes
  - Postman collection regeneration
* **UI Development Pattern:** If UI work was done, check for:
  - JavaScript file changes in `src/groovy/umig/web/js/`
  - CSS changes in `src/groovy/umig/web/css/`
  - Macro changes in `src/groovy/umig/macros/`
  - Mock/prototype updates in `mock/`
* **Refactoring Pattern:** If refactoring was done, check for:
  - File moves, renames, or splits
  - Architecture changes reflected in project structure
  - New patterns or modules introduced
  - Breaking changes or deprecations

**2.3. Completeness Verification (MANDATORY - Final check):**

* **Three-Pass Review:** 
  1. **First Pass:** What was the initial request/problem?
  2. **Second Pass:** What were all the intermediate steps and discoveries?
  3. **Third Pass:** What was the final state and all deliverables?
* **Breadth vs Depth Check:** Ensure both technical depth (how things were implemented) and breadth (all areas touched) are captured.
* **Hidden Work Detection:** Look for "invisible" work like:
  - Configuration changes
  - Dependency updates
  - Test file modifications
  - Documentation synchronization
  - Workflow or process improvements

**3. Synthesise and Write the Narrative:**

The goal is to write a detailed, insightful story, not a shallow summary. Prioritise depth and clarity over brevity.

**3.1. Multi-Stream Integration (MANDATORY - Address tunnel vision):**

* **Identify All Work Streams:** Based on evidence gathering, create a list of all distinct work streams (e.g., "API documentation", "Admin GUI refactoring", "Environment API implementation", "Schema consistency fixes").
* **Parallel vs Sequential Work:** Determine which work streams were parallel (done simultaneously) vs sequential (one led to another).
* **Cross-Stream Dependencies:** Note how different work streams influenced each other (e.g., API documentation revealed schema issues that required code changes).
* **Scope Creep Documentation:** If the session expanded beyond initial scope, document how and why this happened.

**3.2. Narrative Structure (Enhanced):**

* **Copy and Fill the Template:** For every new devJournal entry, always copy and fill in the persistent template at `docs/devJournal/devJournalEntryTemplate.md`. This ensures consistency, quality, and traceability across all devJournal entries.
* **Multi-Problem Awareness:** If multiple problems were addressed, structure the narrative to handle multiple concurrent themes rather than forcing a single linear story.
* **Enhanced Story Arc:** The "How" section should follow this comprehensive structure:
    1. **The Initial Problem(s):** Clearly describe all bugs, errors, or tasks at the start of the session. Note if scope expanded.
    2. **The Investigation:** Detail the debugging/analysis process for each work stream. What did we look at first? What were our initial hypotheses? What tools did we use?
    3. **The Breakthrough(s):** Describe key insights or discoveries for each work stream. Note cross-stream insights.
    4. **Implementation and Refinements:** Explain how solutions were implemented across all work streams. Detail code changes and architectural improvements.
    5. **Validation and Documentation:** Describe how we confirmed fixes worked and updated documentation across all areas.
* **Technical Depth Requirements:** For each work stream, ensure you capture:
  - **What changed** (files, code, configuration)
  - **Why it changed** (problem being solved, improvement being made)
  - **How it changed** (technical approach, patterns used)
  - **Impact** (what this enables, what problems it solves)

**3.3. Quality Assurance (MANDATORY - Final verification):**

* **Evidence vs Narrative Cross-Check:** Verify that every piece of evidence from step 2 has been addressed in the narrative.
* **Completeness Audit:** Check that the journal entry would allow someone to understand:
  - The full scope of work accomplished
  - The technical decisions made and why
  - The current state of the project
  - What should be done next
* **Tone and Format:** The tone should be in British English, and the format should be raw markdown.
* **Final Review:** Before presenting the journal entry, re-read it one last time to ensure it captures the full journey and avoids the "tunnel vision" of only looking at the final code or the most recent work.

**4. Anti-Tunnel Vision Checklist (MANDATORY - Use before finalizing):**

Before presenting the journal entry, verify you have addressed ALL of the following:

**Content Coverage:**
- [ ] All git commits since last journal entry are documented
- [ ] All workflow executions mentioned in conversation are captured
- [ ] All file modifications (API, UI, docs, tests, config) are explained
- [ ] All architectural or pattern changes are documented
- [ ] All bug fixes and their root causes are explained
- [ ] All new features and their implementation are detailed

**Work Stream Integration:**
- [ ] Multiple work streams are identified and explained
- [ ] Parallel vs sequential work is clearly distinguished
- [ ] Cross-dependencies between work streams are noted
- [ ] Scope expansions are documented with reasoning

**Technical Depth:**
- [ ] Code changes include the "what", "why", "how", and "impact"
- [ ] Database schema changes are documented
- [ ] API changes include request/response examples
- [ ] UI changes include user experience impact
- [ ] Documentation changes and their necessity are explained

**Project Context:**
- [ ] Current project state is accurately reflected
- [ ] Next steps and priorities are updated
- [ ] Key learnings and patterns are documented
- [ ] Project milestone significance is noted

**Quality Verification:**
- [ ] Evidence from step 2 matches narrative content
- [ ] No significant work is missing from the story
- [ ] Technical decisions are justified and explained
- [ ] Future developers could understand the session's impact

**5. Await Confirmation:**

* After presenting the generated journal entry, **DO NOT** proceed with any other actions, especially committing.
* Wait for explicit confirmation or further instructions from the user.