---
description: A Pull Request documentation workflow
---

This workflow guides the creation of a high-quality, comprehensive Pull Request description. A great PR description is the fastest way to get your changes reviewed and merged.

**1. Identify the Scope:**

* **Determine the Base Branch:** Identify the target branch for the merge (e.g., `main`, `develop`).
* **List Commits:** Run `git log <base_branch>..HEAD --oneline` to get a concise list of all commits that will be included in this pull request. This provides the raw material for the description.

**2. Synthesise the Narrative:**

A PR is a story. You need to explain the "why," the "what," and the "how."

* **The "Why" (Motivation):**
  * Review the session context, dev journals, and any associated tickets (e.g., Jira, GitHub Issues).
  * Clearly articulate the problem being solved or the feature being added. What was the state of the application before this change, and what will it be after?

* **The "What" (Implementation):**
  * Summarise the list of commits from step 1 into a coherent narrative. Don't just list the commit messages.
  * Describe the technical approach taken. Were there any significant architectural decisions? Did you add a new library? Why did you choose this solution over others?

**3. Provide Instructions for Reviewers:**

Make it easy for others to review your work.

* **How to Test:**
  * Provide clear, step-by-step instructions on how a reviewer can manually test and verify the changes.
  * What should they look for? What are the expected outcomes? Are there specific edge cases to check?
  * If there are UI changes, include screenshots or GIFs to demonstrate the new behavior.

**4. Draft the Pull Request Description (Markdown):**

Use a structured template to present the information clearly.

* **Title:** The title should follow the Conventional Commits standard (e.g., `feat(api): Add user profile endpoint`).
* **Body Template:**

    ```markdown
    ## Description
    <!-- A clear and concise description of the changes. What is the problem and what is the solution? -->

    ## Related Issues
    <!-- Link to any related issues, e.g., "Closes #123" -->

    ## Changes
    <!-- A high-level summary of the technical changes made. -->
    -
    -
    -

    ## How to Test
    <!-- Step-by-step instructions for the reviewer. -->
    1.
    2.
    3.

    ## Screenshots / GIFs
    <!-- If applicable, add screenshots or GIFs to help demonstrate the changes. -->

    ## Checklist
    - [ ] I have read the [CONTRIBUTING.md](link/to/contributing) document.
    - [ ] My code follows the code style of this project.
    - [ ] I have added tests to cover my changes.
    - [ ] All new and existing tests passed.
    - [ ] I have updated the documentation accordingly.
    ```

**5. Final Review:**

* Present the generated PR title and body to the user for final review and approval before they create the pull request on their Git platform.