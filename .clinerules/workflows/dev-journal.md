---
description: At the end of each session, we look back at everything that was said and done, and we write down a Development Journal Entry
---
The Developer Journal is a great way to keep track of our progress and document the way we made design decisions and coding breakthroughs.

The task is to generate a new Developer Journal entry in the `docs/devJournal` folder, in markdown format, using the naming convention `yyyymmdd-nn.md`.

The content of the entry must narrate the session's story. To ensure the full context is captured, you will follow these steps in order:

**1. Establish the 'Why' (The High-Level Context):**

*   First, determine the active feature branch by running `git branch --show-current`.
*   Then, find and read the most recent previous journal entry to understand the starting point.
*   Synthesise these with the beginning of our current conversation to state the session's primary goal or the feature being worked on.

**2. Gather Evidence of 'The How' (The Journey):**

This step is critical to avoid "tunnel vision". You must perform a deep analysis of the entire session.

*   **Full Conversation Review:** Meticulously review the entire conversation log from the beginning of the session. Create a mental map of the narrative: the initial problem, the investigative steps, the dead-ends, the "aha!" moments, and the final solution.
*   **Code Interaction Analysis:** List every file that was viewed, edited, or created. For each file, summarise *why* it was touched and what the outcome was. This goes beyond a simple `git status`.
*   **Git History Analysis:** Analyse the recent commit history by running `git log --since="YYYY-MM-DD" --stat` (using the date of the last journal entry).
*   **Documentation Review:** Review any documentation that was modified, such as [CHANGELOG.md](cci:7://file:///Users/lucaschallamel/Documents/GitHub/UMIG/CHANGELOG.md:0:0-0:0), [README.md](cci:7://file:///Users/lucaschallamel/Documents/GitHub/UMIG/README.md:0:0-0:0), and any files in `docs/adr`.

**3. Synthesise and Write the Narrative:**

The goal is to write a detailed, insightful story, not a shallow summary. Prioritise depth and clarity over brevity.

*   **Structure the Narrative:** The "How" section of the journal should follow a clear story arc:
    1.  **The Initial Problem:** Clearly describe the bug, error, or task at the start of the session.
    2.  **The Investigation:** Detail the debugging process. What did we look at first? What were our initial hypotheses? What tools did we use to investigate?
    3.  **The Breakthrough:** Describe the key insight or discovery that led to the solution. This is often the most important part of the story.
    4.  **Implementation and Refinements:** Explain how the solution was implemented. Detail the code changes and explain *why* they were the right fix. Mention any refactoring or architectural improvements made along the way (e.g., adopting a new pattern).
    5.  **Validation and Documentation:** Describe how we confirmed the fix worked and how we updated the project's documentation to reflect the changes.
*   **Tone and Format:** The tone should be in British English, and the format should be raw markdown.
*   **Final Review:** Before presenting the journal entry, re-read it one last time to ensure it captures the full journey and avoids the "tunnel vision" of only looking at the final code.

**4. Await Confirmation:**

*   After presenting the generated journal entry, **DO NOT** proceed with any other actions, especially committing.
*   Wait for explicit confirmation or further instructions from the user.