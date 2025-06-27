---
description: Sprint Review & Retrospective (UMIG)
---

# Sprint Review & Retrospective Workflow

> **Filename convention:** `{yyyymmdd}-sprint-review.md` (e.g., `20250627-sprint-review.md`). Place in `/docs/devJournal/`.

This workflow guides the team through a structured review and retrospective at the end of each sprint or major iteration. It ensures that all accomplishments, learnings, and opportunities for improvement are captured, and that the next sprint is set up for success.

---

## 1. Gather Sprint Context

**Before generating the sprint review document, fill in or confirm the following:**

- **Sprint Dates:** (Enter start and end date, e.g., 2025-06-16 – 2025-06-27)
- **Participants:** (List all team members involved)
- **Branch/Release:** (Run the command below to list all branches created or active during the sprint)
    ```sh
    git branch --format='%(refname:short) %(creatordate:short)' | grep 'YYYY-MM'
    ```
- **Metrics:** (Run the following commands, replacing dates as appropriate)
    - **Commits:**
      ```sh
      git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --oneline | wc -l
      ```
    - **PRs Merged:**
      ```sh
      git log --merges --since="YYYY-MM-DD" --until="YYYY-MM-DD" --oneline | wc -l
      ```
      For details:
      ```sh
      git log --merges --since="YYYY-MM-DD" --until="YYYY-MM-DD" --oneline
      ```
    - **Issues Closed:**
      ```sh
      git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --grep="close[sd]\\|fixe[sd]" --oneline | wc -l
      ```
      For a list:
      ```sh
      git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --grep="close[sd]\\|fixe[sd]" --oneline
      ```
- **Highlights:** (What are the biggest achievements or milestones? E.g., POC completion)
- **Blockers:** (Any major blockers or pain points encountered)
- **Learnings:** (Key technical, process, or team insights)

---

## 2. Generate the Sprint Review Document

Once the above context is filled, generate a new file named `{yyyymmdd}-sprint-review.md` in `/docs/devJournal/` using the following structure:

---

### 1. Sprint Overview

- **Sprint Dates:** (start date – end date)
- **Sprint Goal:** (Summarise the main objective or theme of the sprint)
- **Participants:** (List team members involved)
- **Branch/Release:** (List all relevant branches/tags)

---

### 2. Achievements & Deliverables

- **Major Features Completed:** (Bullet list, with links to PRs or dev journal entries)
- **Technical Milestones:** (E.g., architectural decisions, major refactors, new patterns adopted)
- **Documentation Updates:** (Summarise key documentation, changelog, or ADR updates)
- **Testing & Quality:** (Describe test coverage improvements, integration test results, bug fixes)

---

### 3. Sprint Metrics

- **Commits:** (Paste result)
- **PRs Merged:** (Paste result and details)
- **Issues Closed:** (Paste result and details)
- **Branches Created:** (Paste result)

---

### 4. Review of Sprint Goals

- **What was planned:** (Paste or paraphrase the original sprint goal)
- **What was achieved:** (Honest assessment of goal completion)
- **What was not completed:** (List and explain any items not finished, with reasons)

---

### 5. Demo & Walkthrough

- **Screenshots, GIFs, or short video links:** (if available)
- **Instructions for reviewers:** (How to test/review the new features)

---

### 6. Retrospective

#### What Went Well

- (Successes, effective practices, positive surprises)

#### What Didn’t Go Well

- (Blockers, pain points, technical debt, process issues)

#### What We Learned

- (Technical, process, or team insights)

#### What We’ll Try Next

- (Actions to improve, experiments for next sprint)

---

### 7. Action Items & Next Steps

- (Concrete actions, owners, deadlines for next sprint)

---

### 8. References

- **Dev Journal Entries:** (List all relevant `/docs/devJournal/YYYYMMDD-nn.md` files)
- **ADR(s):** (Link to any new or updated ADRs)
- **Changelog/Docs:** (Links to major documentation changes)
    - CHANGELOG.md
    - .cline-docs/progress.md
    - .cline-docs/activeContext.md

---

> _Use this workflow at the end of each sprint to ensure a culture of continuous improvement, transparency, and knowledge sharing._


> **Filename convention:** `{yyyymmdd}-sprint-review.md` (e.g., `20250627-sprint-review.md`). Place in `/docs/devJournal/`.


This workflow guides the team through a structured review and retrospective at the end of each sprint or major iteration. It ensures that all accomplishments, learnings, and opportunities for improvement are captured, and that the next sprint is set up for success.

---

## 1. Sprint Overview

- **Sprint Dates:** (start date – end date)
- **Sprint Goal:** (Summarise the main objective or theme of the sprint)
- **Participants:** (List team members involved)
- **Branch/Release:** (Relevant branch/tag or release milestone)

---

## 2. Achievements & Deliverables

- **Major Features Completed:** (Bullet list, with links to PRs or dev journal entries)
- **Technical Milestones:** (E.g., architectural decisions, major refactors, new patterns adopted)
- **Documentation Updates:** (Summarise key documentation, changelog, or ADR updates)
- **Testing & Quality:** (Describe test coverage improvements, integration test results, bug fixes)

---

## 3. Sprint Metrics

- **Commits:** (Number or summary, e.g., `git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --oneline | wc -l`)
- **PRs Merged:** (Count and/or links)
- **Issues Closed:** (Count and/or links)
- **Test Coverage:** (Summarise if measured)

---

## 4. Review of Sprint Goals

- **What was planned:** (Paste or paraphrase the original sprint goal)
- **What was achieved:** (Honest assessment of goal completion)
- **What was not completed:** (List and explain any items not finished, with reasons)

---

## 5. Demo & Walkthrough

- **Screenshots, GIFs, or short video links** (if available)
- **Instructions for reviewers:** (How to test/review the new features)

---

## 6. Retrospective

### What Went Well

- (Bullet points: successes, effective practices, positive surprises)

### What Didn’t Go Well

- (Bullet points: blockers, pain points, technical debt, process issues)

### What We Learned

- (Bullet points: technical, process, or team insights)

### What We’ll Try Next

- (Bullet points: actions to improve, experiments for next sprint)

---

## 7. Action Items & Next Steps

- (Bullet list of concrete actions, owners, and deadlines for the next sprint)

---

## 8. References

- **Dev Journal Entries:** (List all relevant `/docs/devJournal/YYYYMMDD-nn.md` files)
- **ADR(s):** (Link to any new or updated ADRs)
- **Changelog/Docs:** (Links to major documentation changes)
- CHANGELOG.md
- .cline-docs/progress.md
- .cline-docs/activeContext.md


---

> _Use this template at the end of each sprint to ensure a culture of continuous improvement, transparency, and knowledge sharing._
