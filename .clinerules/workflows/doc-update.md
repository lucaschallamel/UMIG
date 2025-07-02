---
description: A workflow to update the project documentation and memories based on latest changes
---

- Review and summarise the latest changes performed, based on the cascade conversation and on the git status. Be concise but comprehensive.
- **CRITICAL**: If changes affect architecture, update `/docs/solution-architecture.md` as the primary reference
- Do any changes require a new ADR in `/docs/adr/` (archived ADRs in `/docs/adr/archive/` are consolidated in solution-architecture.md)
- Update as required the CHANGELOG
- Update as required the main README file
- Update as required the README files in subfolders
