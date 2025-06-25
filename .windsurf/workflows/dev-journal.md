---
description: At the end of each session, we look back at everythig that was said and done, and we write down a Development Journal Entry
---

The Developer Journal is a great way to keep track of our progress and document the way we made design decisions and coding breakthroughs.

The task is to generate a new Developer Journal entry in the 
docs/devJournal
 folder, in markdown format, using the naming convention yyyymmdd-nn.md.

The content of the entry must narrate the session's story. To ensure the full context is captured, you will follow these steps in order:

1. Establish the 'Why' (The High-Level Context):

First, determine the active feature branch by running git branch --show-current.
Then, find and read the most recent previous journal entry to understand the starting point.
Synthesise these with the beginning of our current conversation to state the session's primary goal or the feature being worked on.
2. Gather Evidence of 'The How' (The Journey):

Review the entire ongoing conversation to trace the steps, discussions, and decisions made.
Analyse the recent commit history by running git log --since="YYYY-MM-DD" --stat (using the date of the last journal entry).
Check the current uncommitted changes by running git status --porcelain.
Review any documentation that was modified, such as 
CHANGELOG.md
, 
README.md
, and any files in docs/adr.
3. Synthesise and Write the Narrative:

Begin the journal entry by stating the high-level goal you identified in Step 1.
Narrate the story of the session, explaining the steps taken, the reasoning behind decisions, and any dead-ends or strategic pivots encountered, using the evidence from Step 2.
Conclude with the final state of the project and a clear outline of the immediate next steps.
The tone should be in British English, and the format should be raw markdown. You will be concise but comprehensive and exhaustive.

Avoid the "tunnel vision", just looking at most recent changes: We want to carefully crunch everything that was done so far today, as per the existing conversation, and since the last devJournal entry.