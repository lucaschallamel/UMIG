---
description: Enhanced documentation update workflow with GENDEV agent integration for intelligent analysis, automated content generation, and comprehensive quality assurance.
---

## AI-Enhanced Documentation Update Workflow

### Step 1: Intelligent Change Analysis

**Use `gendev-documentation-generator` for comprehensive change assessment:**

```bash
/gd:documentation-generator --validation_level=standard
```

- **AI-Assisted Review:** Use AI to analyze and summarize latest changes from cascade conversation and git status
- **Intelligent Summarization:** Generate concise but comprehensive change summaries with AI assistance
- **Impact Assessment:** AI-powered evaluation of change implications on documentation

### Step 2: Architecture Documentation Management

**Use `gendev-system-architect` for architecture updates:**

```bash
/gd:system-architect --validation_level=standard
```

- **CRITICAL**: If changes affect architecture, use AI to intelligently update `docs/memory-bank/systemPatterns.md` as the primary reference per Rule 07
- **Automated Analysis:** AI-powered detection of architectural impacts requiring documentation updates
- **Consistency Verification:** Ensure architecture documentation remains the authoritative source

### Step 3: ADR Management with AI

**Use `gendev-business-process-analyst` for ADR assessment:**

```bash
/gd:business-process-analyst
```

- **AI-Assisted ADR Evaluation:** Intelligent assessment of whether changes require new ADR in `docs/adr/`
- **Archive Management:** Ensure archived ADRs in `docs/adr/archive/` are properly consolidated in `docs/memory-bank/systemPatterns.md`
- **Decision Tracking:** AI-powered tracking of architectural decisions and their documentation needs

### Step 4: Comprehensive Documentation Updates

**Use `gendev-documentation-generator` for systematic updates:**

```bash
/gd:documentation-generator --validation_level=enterprise
```

- **CHANGELOG Updates:** AI-assisted updates to CHANGELOG with intelligent categorization and formatting
- **Main README Enhancement:** Intelligent updates to main README file ensuring accuracy and completeness
- **Subfolder README Management:** AI-powered updates to README files in all work folders per Rule 03 scaffolding requirements
- **Memory Bank Updates:** Ensure `docs/memory-bank/` 6 core files reflect current project state per Rule 07
- **Sprint Documentation:** Update `docs/roadmap/` and `docs/roadmap/sprint/` documentation as needed
- **Dev Journal Integration:** Reference relevant entries in `docs/devJournal/` (YYYYMMDD-nn.md format)
- **Cross-Reference Validation:** Automated verification of documentation cross-references and links

### Step 5: Quality Assurance and Validation

**Use `gendev-qa-coordinator` for comprehensive validation:**

```bash
/gd:qa-coordinator --validation_level=enterprise
```

- **Accuracy Verification:** AI-powered verification of all documentation updates
- **Consistency Checking:** Intelligent validation of documentation consistency across all files
- **Completeness Assessment:** Automated assessment of documentation completeness
- **Integration Validation:** AI-assisted verification of proper documentation integration

### Enhanced Benefits

- **Intelligent Analysis:** AI-powered change impact analysis and documentation requirement assessment
- **Automated Content Generation:** AI-assisted generation of high-quality documentation content
- **Quality Assurance:** Multi-agent verification ensuring documentation accuracy and consistency
- **Efficiency Improvement:** Significant reduction in manual documentation update effort
- **Comprehensive Coverage:** AI ensures no documentation aspects are overlooked
