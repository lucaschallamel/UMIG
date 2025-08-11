---
description: Comprehensive development journal workflow with GENDEV agent orchestration for systematic session documentation and knowledge preservation
---

# Development Journal Workflow

**Systematic development session documentation with AI-enhanced analysis and comprehensive knowledge capture following project documentation standards**

## Purpose

This workflow orchestrates GENDEV agents to create comprehensive developer journal entries in `docs/devJournal/` folder, ensuring systematic session documentation, knowledge preservation, and README maintenance across all work folders.

## When to Use

- End of each development session or significant work milestone
- After completing major features, bug fixes, or architectural changes
- Before significant context switches or extended breaks
- When documenting complex problem-solving sessions
- As part of regular development workflow discipline

## Prerequisites

- GENDEV agents available in Claude Code environment
- Active development session with substantial work completed
- Understanding of session scope and work streams
- Access to project documentation structure (`docs/` folders)
- Current project state and next steps identified

## Workflow Steps

### Phase 1: Session Context Analysis

#### 1.1 Comprehensive Session Context Establishment

```bash
# Use Context Manager for session analysis
/gd:context-manager
```

**Context Analysis:**

- Session timeline and major milestones identification
- Work stream categorization and relationship mapping
- Technical decision documentation and rationale
- Problem-solution documentation with alternatives considered

#### 1.2 Documentation Structure Validation

```bash
# Use Project Planner for documentation compliance
/gd:project-planner --validation_level=standard --timeline_constraint=normal
```

**Documentation Structure Requirements:**

- Journal entry in `docs/devJournal/` with YYYYMMDD-nn.md format
- README.md files maintained in relevant work folders
- Cross-references to `docs/adr/` for architectural decisions
- Integration with `docs/memory-bank/` for knowledge preservation

### 2. AI-Enhanced Evidence Gathering and Analysis

**Use `gendev-code-reviewer`:**

```bash
/gd:code-reviewer
```

**Use `gendev-documentation-generator`:**

```bash
/gd:documentation-generator --validation_level=standard
```

**Use `gendev-system-architect`:**

```bash
/gd:system-architect --validation_level=standard
```

**Use `gendev-business-process-analyst`:**

```bash
/gd:business-process-analyst
```

**Use `gendev-qa-coordinator`:**

```bash
/gd:qa-coordinator --validation_level=enterprise
```

### 3. AI-Enhanced Narrative Synthesis and Generation

**Use `gendev-documentation-generator`:**

```bash
/gd:documentation-generator --validation_level=enterprise
```

**Use `gendev-documentation-generator`:**

```bash
/gd:documentation-generator --validation_level=standard
```

**Use `gendev-code-reviewer`:**

```bash
/gd:code-reviewer
```

**Use `gendev-qa-coordinator`:**

```bash
/gd:qa-coordinator --validation_level=enterprise
```

### 4. AI-Enhanced Anti-Tunnel Vision Verification

**Use `gendev-qa-coordinator`:**

```bash
/gd:qa-coordinator --validation_level=enterprise
```

- [ ] **Work Stream Identification:** AI-identified and explained multiple work streams
- [ ] **Work Relationship Analysis:** AI-distinguished parallel vs sequential work
- [ ] **Cross-Dependencies:** AI-noted cross-dependencies between work streams
- [ ] **Scope Documentation:** AI-documented scope expansions with reasoning
- [ ] **Code Changes:** AI-ensured "what", "why", "how", and "impact" coverage
- [ ] **Database Changes:** AI-documented database schema changes
- [ ] **API Changes:** AI-included request/response examples
- [ ] **UI Changes:** AI-documented user experience impact
- [ ] **Documentation Changes:** AI-explained documentation necessity
- [ ] **Project State:** AI-verified accurate reflection of current project state
- [ ] **Next Steps:** AI-updated next steps and priorities
- [ ] **Key Learnings:** AI-documented key learnings and patterns
- [ ] **Milestone Significance:** AI-noted project milestone significance
- [ ] **Evidence Matching:** AI-verified evidence from step 2 matches narrative content
- [ ] **Completeness:** AI-ensured no significant work is missing from the story
- [ ] **Decision Justification:** AI-verified technical decisions are justified and explained
- [ ] **Future Understanding:** AI-ensured future developers could understand session impact

### 5. AI-Enhanced Final Review and Confirmation

**Use `gendev-documentation-generator`:**

```bash
/gd:documentation-generator --validation_level=standard
```

- **AI-Generated Summary:** Present AI-enhanced journal entry with comprehensive analysis
- **Quality Metrics:** Provide AI-calculated quality and completeness scores
- **Recommendation Engine:** AI-suggested improvements or additional considerations
- **Await Confirmation:** **DO NOT** proceed with any other actions, especially committing
- **Wait for Instructions:** Wait for explicit confirmation or further instructions from the user

---

## Enhanced Success Metrics

- **Completeness Score:** 95% comprehensive coverage of session activities
- **Technical Depth:** 90% of technical decisions documented with rationale
- **Evidence Coverage:** 100% of gathered evidence reflected in narrative
- **Analysis Time:** 70% reduction in evidence gathering time
- **Documentation Quality:** 85% improvement in narrative depth and clarity
- **Consistency:** 95% adherence to template and format standards

---

## Tips for AI-Enhanced Developer Journal Creation

- **Start with Context:** Use `gendev-context-manager` for comprehensive session understanding
- **Analyze Thoroughly:** Leverage `gendev-code-reviewer` for detailed technical analysis
- **Document Comprehensively:** Use `gendev-documentation-generator` for narrative synthesis
- **Verify Quality:** Apply `gendev-qa-coordinator` for final verification
- **Parallel Analysis:** Run evidence gathering and pattern recognition simultaneously
- **Incremental Documentation:** Build narrative progressively with AI assistance
- **Continuous Verification:** Use AI for ongoing quality checks throughout the process
- **Template Consistency:** Leverage AI to maintain format and style standards
