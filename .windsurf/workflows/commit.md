---
description: This is the basic workflow to gather last changes, prepare a relevant commit message and commit the staged code changes
---
This workflow guides the creation of a high-quality, comprehensive commit message that accurately reflects all staged changes, adhering strictly to the Conventional Commits 1.0 standard.

**1. Gather Evidence of 'The What' (The Staged Changes):**

*   **Analyze the Diff:** Perform a thorough review of all staged changes by running `git diff --staged`. This is the primary source of truth for the commit. Go beyond file names and analyze the actual code changes to understand the technical modifications.
*   **Check Status:** Run `git status --porcelain` to identify any untracked or unstaged files that might be related and should be included. Prompt the user if potentially related files are unstaged.

**2. Establish the 'Why' (The Rationale):**

*   **Review Session Context:** A commit message without context is incomplete. Meticulously review the current session's conversation log to understand the problem that was solved, the decisions that were made, and the overall goal of the changes.
*   **Consult Dev Journal:** If a development journal entry was created during the session, review it to synthesise the high-level narrative.

**3. Synthesise and Write the Commit Message:**

The goal is to create a message that is not just a list of changes, but a clear explanation for future developers (and yourself).

*   **Structure (Conventional Commits):**
    *   **Type:** Choose a type from the allowed list (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`).
    *   **Scope (Optional):** Identify the part of the codebase the changes affect (e.g., `db`, `api`, `auth`, `docs`).
    *   **Subject:** Write a concise summary (under 50 characters) of the change in the imperative mood (e.g., "Add," "Fix," "Change," not "Added," "Fixed," "Changed").
    *   **Body (Optional but Encouraged):** Use the body to explain the "what" and "why." Describe the problem before the change and how the new code addresses it. Explain any significant design choices.
    *   **Footer (Optional):** Use the footer for `BREAKING CHANGE:` notifications or to reference issue numbers (e.g., `Closes #123`).

*   **Draft the Message:** Synthesise the evidence from steps 1 and 2 into a complete commit message following the structure above. The body should tell the story of the changes.

**4. Await Confirmation and Commit:**

*   Present the generated commit message to the user for review.
*   After receiving confirmation, execute the `git commit` command.