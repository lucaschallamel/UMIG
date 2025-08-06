---
description: Enhanced API specification and test generation workflow with GENDEV agent integration.
---

# Enhanced API Spec & Test Generation Workflow with GENDEV Integration

Establishes `openapi.yaml` as single source of truth with GENDEV agents for intelligent analysis, validation, and test generation. Postman collection is **always generated** - **NEVER edit JSON directly.**

## Enhanced Guiding Principles

- **OpenAPI Source of Truth:** All changes in `docs/api/openapi.yaml`
- **AI-Enhanced Validation:** GENDEV agents provide comprehensive analysis
- **Intelligent Test Generation:** Automated test suites with edge cases
- **Generated Artifacts:** Postman collection treated as build output
- **Continuous QA:** AI validation prevents downstream issues
- **Documentation Sync:** Automated updates ensure consistency

## Enhanced Steps with GENDEV Integration

### 1. AI-Enhanced API Analysis and Specification Updates

#### 1.1 Intelligent Source Code Analysis

**Use `gendev-api-designer` for comprehensive API analysis:**
```bash
/gd:apidesigner --analysis_type=source_code --target_language=groovy --project_context=existing
```

**Benefits:** Automated endpoint detection, breaking change identification, parameter analysis, consistency validation.

#### 1.2 AI-Assisted Specification Design

**Use `gendev-system-architect` for architectural validation:**
```bash
/gd:systemarchitect --architecture_type=api --focus_area=specification --project_context=microservices
```

**Manual Steps Enhanced by AI:**
- **Identify API Changes:** AI analysis of Groovy source code (`src/com/umig/api/v2/*.groovy`)
- **Edit the Spec:** AI-guided updates to `paths` and `components/schemas`
- **Best Practice:** Use `allOf` patterns for non-destructive schema extension
- **IDE Integration:** OpenAPI-aware IDE with real-time validation

### 2. AI-Enhanced Specification Validation

#### 2.1 Comprehensive AI Validation

**Use `gendev-qa-coordinator` for multi-dimensional validation:**
```bash
/gd:qacoordinator --validation_type=api_specification --scope=comprehensive --standards=openapi3
```

**Validation Areas:** Syntax (OpenAPI 3.0+ compliance), semantic (consistency), security (auth patterns), performance (optimization), documentation (completeness).

#### 2.2 AI-Powered Error Resolution

**Use `gendev-code-reviewer` for issue identification and resolution:**
```bash
/gd:codereviewer --review_type=api_specification --focus=validation_errors
```

**Enhanced Process:** AI validation before proceeding, multi-tool validation, zero-error policy, real-time feedback.

### 3. AI-Enhanced Test Collection Generation

#### 3.1 Intelligent Test Strategy Planning

**Use `gendev-test-suite-generator` for comprehensive test planning:**
```bash
/gd:testsuitegenerator --test_type=api --coverage=comprehensive --framework=postman
```

**AI-Enhanced Generation:** Edge case identification, realistic test data, negative testing, performance scenarios.

#### 3.2 Enhanced Collection Generation

**Navigate to directory:**
```bash
cd docs/api/postman
```

**AI-Enhanced Generation:**
```bash
npx openapi-to-postmanv2 -s ../openapi.yaml -o ./UMIG_API_V2_Collection.postman_collection.json -p -O folderStrategy=Tags,includeAuthInfoInExample=true,optimizeConversion=true
```

**Post-Generation Enhancement:**
```bash
/gd:testsuitegenerator --enhancement_type=postman_collection --focus=comprehensive_coverage
```

### 4. AI-Enhanced Verification and Testing

#### 4.1 Intelligent Change Analysis

**Use `gendev-code-reviewer` for comprehensive diff analysis:**
```bash
/gd:codereviewer --review_type=api_changes --scope=specification_and_tests
```

**AI-Enhanced Review:** Semantic diff analysis, breaking change detection, test coverage verification, documentation consistency.

#### 4.2 Automated Testing and Validation

**Use `gendev-qa-coordinator` for comprehensive testing:**
```bash
/gd:qacoordinator --testing_type=api_integration --environment=development
```

**Enhanced Testing:** Automated collection import, environment-specific testing, response validation, performance benchmarking.

### 5. AI-Enhanced Documentation and Deployment

#### 5.1 Automated Documentation Generation

**Use `gendev-documentation-generator` for comprehensive documentation:**
```bash
/gd:documentationgenerator --doc_type=api_changes --format=comprehensive --audience=developers
```

**AI-Generated Documentation:** Change impact analysis, migration guides, integration examples, changelog entries.

#### 5.2 Intelligent Commit Strategy

**Use `gendev-code-reviewer` for commit optimization:**
```bash
/gd:codereviewer --review_type=pre_commit --scope=api_specification
```

**Enhanced Commit Process:** Atomic commits, semantic messages, comprehensive staging, pre-commit validation.

#### 5.3 AI-Enhanced Documentation Updates

**Use `gendev-documentation-generator` for ecosystem updates:**
```bash
/gd:documentationgenerator --update_type=api_ecosystem --scope=comprehensive
```

**Documentation Synchronization:** Developer journal updates, API documentation, integration guides, team communication.

---

## Enhanced Success Metrics

### Quality Metrics
- **Specification Accuracy:** 99.9% consistency between code and OpenAPI spec
- **Test Coverage:** 100% endpoint coverage with comprehensive scenarios
- **Validation Success:** Zero specification errors before generation
- **Documentation Completeness:** 95% automated coverage

### Efficiency Metrics
- **Generation Time:** 80% reduction in manual creation time
- **Error Detection:** 95% of issues caught before manual testing
- **Documentation Sync:** 90% reduction in lag
- **Review Efficiency:** 70% faster change review

### AI Integration Benefits
- **Intelligent Analysis:** Automated API change detection
- **Comprehensive Validation:** Multi-dimensional quality assurance
- **Enhanced Testing:** AI-generated edge cases and performance scenarios
- **Automated Documentation:** Consistent, comprehensive updates

---

## Enhanced Key Principles

### Core Principles
- **Single Source of Truth:** OpenAPI specification as authoritative source
- **AI-Enhanced Quality:** GENDEV agents provide comprehensive validation
- **Zero Manual Postman Editing:** Generated artifacts never manually modified
- **Comprehensive Coverage:** Every endpoint tested with AI scenarios

### AI Integration Principles
- **Intelligent Automation:** AI handles repetitive tasks
- **Human-AI Collaboration:** AI augments decision-making
- **Continuous Improvement:** AI suggests optimizations
- **Quality Assurance:** Multiple agents provide validation

### Best Practices
- **Agent Orchestration:** Use multiple GENDEV agents
- **Iterative Enhancement:** Continuously improve with AI insights
- **Documentation-First:** AI ensures synchronization
- **Proactive Quality:** AI prevents issues

---

## Tips for AI-Enhanced API Specification Management

### Effective Agent Usage
1. **Start with Analysis:** Begin with `gendev-api-designer`
2. **Validate Early:** Use `gendev-qa-coordinator` before changes
3. **Document Continuously:** Leverage `gendev-documentation-generator`
4. **Review Comprehensively:** Use `gendev-code-reviewer` for validation

### Workflow Optimization
1. **Parallel Processing:** Run validation and documentation simultaneously
2. **Incremental Updates:** Use AI for minimal change sets
3. **Automated Testing:** Integrate AI tests into CI/CD
4. **Continuous Monitoring:** Use AI for specification health checks

### Quality Assurance
1. **Multi-Agent Validation:** Different agents for different aspects
2. **Comprehensive Testing:** Include AI edge cases and performance tests
3. **Documentation Consistency:** Ensure artifact synchronization
4. **Change Impact Analysis:** Understand modification implications
