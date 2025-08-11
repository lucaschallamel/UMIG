---
description: Comprehensive memory bank update workflow with GENDEV agent orchestration for intelligent knowledge extraction and automated memory organization following Rule 07 standards
---

# Memory Bank Update Workflow

**Systematic memory bank maintenance with AI-enhanced knowledge extraction and organization following Rule 07 - Memory Bank standards**

## Purpose

This workflow orchestrates GENDEV agents to maintain the 6 core memory bank files in `docs/memory-bank/` folder, ensuring comprehensive project knowledge preservation across sessions with intelligent analysis and automated organization.

## When to Use

- After significant project developments or architectural changes
- When user requests "update memory bank" (triggers comprehensive review)
- Following major feature implementations or system modifications
- During project phase transitions or milestone completions
- When context needs clarification for future sessions

## Prerequisites

### Required Project Documentation

- Developer Journal entries in `docs/devJournal/` folder (YYYYMMDD-nn.md format)
- Current `CHANGELOG.md` file with project evolution
- README.md files across work folders and project root
- Architectural Decision Records in `docs/adr/` folder
- Sprint and roadmap documentation in `docs/roadmap/` folder

### AI-Enhanced Prerequisites

**Use `gendev-documentation-generator` for content analysis:**

```bash
/gd:documentation-generator --validation_level=standard
```

**Benefits:** Automated source detection, content classification, priority assessment, scope analysis.

---

## Step 1: AI-Enhanced Source Analysis

### 1.1 Developer Journal Analysis

**Use `gendev-documentation-generator` for journal processing:**

```bash
/gd:documentation-generator --validation_level=standard
```

**Processing:** Content extraction, pattern recognition, knowledge synthesis, temporal analysis.

### 1.2 CHANGELOG Analysis

**Use `gendev-business-process-analyst` for changelog processing:**

```bash
/gd:business-process-analyst
```

**Processing:** Change categorization, impact assessment, memory relevance, evolution tracking.

### 1.3 README Analysis

**Use `gendev-system-architect` for README processing:**

```bash
/gd:system-architect --validation_level=standard
```

**Processing:** Architecture extraction, feature documentation, setup knowledge, cross-reference analysis.

### 1.4 ADR Analysis

**Use `gendev-business-process-analyst` for ADR processing:**

```bash
/gd:business-process-analyst
```

**Processing:** Decision extraction, context analysis, impact assessment, knowledge integration.

---

## Workflow Steps

### Phase 1: Memory Bank Structure Validation

#### 1.1 Core Files Verification

```bash
# Use Requirements Analyst for memory bank compliance
/gd:requirements-analyst --validation_level=enterprise --stakeholder_count=12 --timeline_constraint=normal --domain_complexity=medium
```

**Core Memory Bank Files (Rule 07 - Required):**

1. **`projectbrief.md`**: Foundation document defining scope and requirements
2. **`productContext.md`**: Business context, problems solved, user experience goals
3. **`activeContext.md`**: Current work focus, recent changes, next steps
4. **`systemPatterns.md`**: Architecture, technical decisions, design patterns
5. **`techContext.md`**: Technologies, setup, constraints, dependencies
6. **`progress.md`**: Current status, what works, what's left, known issues

#### 1.2 Documentation Folder Structure Validation

```bash
# Use Project Planner for folder structure compliance
/gd:project-planner --validation_level=standard --timeline_constraint=normal
```

**Required Documentation Structure:**

- `docs/memory-bank/` - Core memory bank files
- `docs/devJournal/` - Development journals (YYYYMMDD-nn.md)
- `docs/adr/` - Architectural Decision Records
- `docs/roadmap/` - Project roadmap and features
- `docs/roadmap/sprint/` - Sprint-specific documentation

### Phase 2: Source Analysis and Knowledge Extraction

#### 2.1 Development Journal Analysis

```bash
# Use Documentation Generator for journal processing
/gd:documentation-generator --validation_level=standard
```

**Processing Activities:**

- Chronological pattern analysis and trend identification
- Technical decision extraction and impact assessment
- Problem-solution mapping and lessons learned
- Cross-reference validation with existing memory bank

#### 2.2 Architecture Decision Records Analysis

```bash
# Use System Architect for ADR processing
/gd:system-architect --validation_level=standard
```

**ADR Processing:**

- Decision context and rationale extraction
- Architectural impact assessment and validation
- Pattern recognition and consistency verification
- Cross-reference with system patterns documentation

#### 2.3 Project Documentation Analysis

```bash
# Use Business Process Analyst for comprehensive documentation review
/gd:business-process-analyst
```

**Documentation Sources:**

- README.md files across all work folders
- CHANGELOG.md for project evolution tracking
- Sprint documentation in `docs/roadmap/sprint/`
- Configuration and setup documentation

---

## Step 3: AI-Enhanced Content Generation

### 3.1 Memory Entry Creation

**Use `gendev-documentation-generator` for memory content creation:**

```bash
/gd:documentation-generator --validation_level=enterprise
```

**Benefits:** Concise summarization, accuracy verification, British English compliance, consistency maintenance.

### 3.2 Quality Assurance

**Use `gendev-qa-coordinator` for memory quality validation:**

```bash
/gd:qa-coordinator --validation_level=enterprise
```

**Benefits:** Content validation, consistency checking, completeness assessment, language compliance.

---

## Step 4: AI-Enhanced Integration and Deployment

### 4.1 Memory Bank Integration

**Use `gendev-documentation-generator` for memory integration:**

```bash
/gd:documentation-generator --validation_level=standard
```

**Benefits:** Seamless merging, conflict resolution, version management, access optimization.

### 4.2 Validation and Testing

**Use `gendev-qa-coordinator` for comprehensive validation:**

```bash
/gd:qa-coordinator --validation_level=enterprise
```

**Benefits:** Functionality testing, accuracy verification, performance assessment, integration testing.

---

## Enhanced Best Practices with AI Integration

### Memory Management

**Use `gendev-documentation-generator` for best practices enforcement:**

```bash
/gd:documentation-generator --validation_level=standard
```

**Benefits:** Concise communication, accuracy maintenance, consistency enforcement, British English standards.

### Maintenance Guidelines

**Benefits:** Regular updates, quality monitoring, content evolution, access optimization.

---

## Enhanced Success Metrics

### Quality Metrics

- Memory Accuracy: 95%+ accuracy in content representation
- Content Completeness: 90%+ coverage of relevant project knowledge
- Consistency Score: 95%+ consistency across entries
- Language Compliance: 100% British English expression

### Efficiency Metrics

- Update Speed: 70% faster with AI assistance
- Content Generation: 80% reduction in manual creation time
- Quality Assurance: 60% faster validation processes
- Integration Time: 50% reduction in integration time

### AI Integration Benefits

- Automated Analysis: 90% reduction in manual analysis time
- Intelligent Organization: 85% improvement in structure optimization
- Quality Enhancement: 75% improvement in content quality
- Maintenance Efficiency: 80% reduction in maintenance effort

---

## Tips for AI-Enhanced Memory Bank Updates

### Effective Agent Usage

- Leverage multiple GENDEV agents for comprehensive analysis
- Use AI feedback loops for continuous improvement
- Maintain context across agent interactions
- Always validate AI-generated content before integration

### Workflow Optimization

- Run multiple AI analyses simultaneously for efficiency
- Use AI to identify and process only changed content
- Implement AI-driven scheduling for regular updates
- Continuously monitor and optimize AI-assisted processes

### Quality Assurance

- Maintain human oversight of AI-generated content
- Implement robust validation protocols for AI outputs
- Integrate feedback loops for continuous improvement
- Use AI-powered error detection and correction mechanisms
