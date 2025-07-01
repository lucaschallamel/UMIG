---
description: This is the basic workflow to gather last changes, prepare a relevant commit message and commit the staged code changes
---

This workflow guides the creation of high-quality, comprehensive commit messages and PR descriptions that accurately reflect all changes made in the current session or feature branch, adhering strictly to the Conventional Commits 1.0 standard and project documentation best practices.

**1. Gather Evidence of 'The What' (All Changes):**

* **Analyze the Diff:** Run `git diff --staged` for staged changes.
* **Review Full Commit Range:** Run `git log <base_branch>..HEAD --stat` to see all commits since the branch point. Review each commit for features, migrations, refactors, and docs. Do not rely solely on the latest staged diff.
* **Check Status:** Run `git status --porcelain` to identify any untracked or unstaged files that might be related and should be included. Prompt the user if potentially related files are unstaged.
* **Chronological Narrative:** Review the dev journal, progress log, changelog, and any ADRs for all features, migrations, and refactors in the session/branch. Ensure that features added earlier in the session are not omitted from the summary.

**2. Synthesize a Complete Feature/Change List:**

* Before drafting the commit or PR message, make a bullet-point list of all major features, migrations, refactors, and documentation changes from the session/branch.
* Confirm that each is represented in the commit message and, if relevant, the PR description.

**3. Establish the 'Why' (The Rationale):**

* **Review Session Context:** Meticulously review the session's conversation log, dev journal, and any associated tickets to understand the problems solved, decisions made, and overall goals.
* **Consult Documentation:** Cross-reference the dev journal, progress log, and changelog to ensure the rationale for each change is clear and traceable.

**4. Synthesise and Write the Commit Message:**

The goal is to create a message that is not just a list of changes, but a clear explanation for future developers (and yourself).

* **Structure (Conventional Commits):**
  * **Type:** Choose a type from the allowed list (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`).
  * **Scope (Optional):** Identify the part of the codebase the changes affect (e.g., `db`, `api`, `auth`, `docs`).
  * **Subject:** Write a concise summary (under 50 characters) of the change in the imperative mood (e.g., "Add," "Fix," "Change," not "Added," "Fixed," "Changed").
  * **Body (Optional but Encouraged):** Use the body to explain the "what" and "why." Describe the problem before the change and how the new code addresses it. Explain any significant design choices.
  * **Footer (Optional):** Use the footer for `BREAKING CHANGE:` notifications or to reference issue numbers (e.g., `Closes #123`).

* **Draft the Message:** Synthesise the evidence from all previous steps into a complete commit message following the structure above. The body should tell the story of the changes, covering all major features and refactors from the session/branch.

**5. For Pull Requests: Ensure Full Narrative Coverage**

* When preparing a PR, use the same comprehensive review:
  * List all commits since the branch point (`git log <base_branch>..HEAD --oneline`).
  * Summarise the full narrative, not just the last commit or diff.
  * Ensure the PR description covers all major features, migrations, refactors, and documentation changes from the branch/session.
  * Reference the dev journal, changelog, and progress log for additional context.

**6. Await Confirmation and Commit:**

* Present the generated commit message (and PR description, if relevant) to the user for review.
* After receiving confirmation, execute the `git commit` command (and proceed with PR creation if appropriate).

---

**Key Principles:**
- Never rely solely on the latest diff or staged changes—always review the full branch/session history.
- Use all available documentation (dev journal, changelog, ADRs, progress log) to ensure no feature or migration is omitted.
- The commit message and PR description must together provide a comprehensive, chronological record of all work performed.