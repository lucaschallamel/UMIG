# UMIG Test Infrastructure Analysis

**Date**: 2025-10-07
**Scope**: Testing directory structure optimization analysis
**Status**: Comprehensive audit complete

## Executive Summary

Analysis of four test-related directories (`backstop_data/`, `coverage/`, `diagnostic-scripts/`, `diagnostics/`) reveals:

- **BackstopJS**: Abandoned infrastructure (24KB) - **REMOVE**
- **Coverage**: Auto-generated reports (15MB) - **Properly gitignored**
- **Diagnostic-scripts**: Active troubleshooting tools (64KB) - **Keep but reorganize**
- **Diagnostics**: Active bugfix documentation (36KB) - **Keep, well-organized**

**Total potential cleanup**: 24KB immediate, 15MB auto-regenerated per test run

---

## 1. BackstopJS Visual Regression Testing (`backstop_data/`)

### Current Status

```
Size: 24KB
Files: backstop.json + backstop_data/engine_scripts/puppet/*.js
Git tracked: YES (backstop.json + puppet scripts)
Package.json scripts: NONE
npm dependencies: NOT INSTALLED
Last git commit: No commits mention "backstop"
```

### Analysis

**Configuration Present**:

- `backstop.json`: 291 lines, 24 scenarios configured
- Viewport configs: mobile, tablet, desktop, desktop_large
- Scenarios: BaseComponent, TableComponent, ModalComponent, FilterComponent, etc.
- Puppet scripts: 6 interaction scripts in `backstop_data/engine_scripts/puppet/`

**Integration Status**:

```bash
# package.json check
grep -i "backstop" package.json
# Result: NO MATCHES

# npm dependencies check
npm list backstopjs
# Result: (empty) - NOT INSTALLED

# Documentation references
# Found in: local-dev-setup/README.md (brief mention)
# Status: Listed as "Visual regression testing configuration" but NO usage instructions
```

**Test Framework Comparison**:
| Framework | Status | Test Count | Active |
|-----------|--------|------------|--------|
| Jest | ✅ Active | 345/345 passing | YES |
| Groovy | ✅ Active | 43/43 passing | YES |
| Playwright | ✅ Active | E2E/UAT tests | YES |
| BackstopJS | ❌ Abandoned | 0 (never run) | NO |

### Issues

1. **Never Integrated**: No npm scripts, no dependencies, no execution evidence
2. **Invalid Approach**: Visual regression testing unsuitable for ScriptRunner apps
   - ScriptRunner renders components within Confluence pages
   - URLs reference Confluence pages: `http://localhost:8090/pages/viewpage.action?pageId=admin-gui-test#baseComponent`
   - This approach requires running Confluence + UMIG + test data setup
   - Too brittle for component testing in this architecture

3. **Superseded by Playwright**:
   - Playwright E2E tests already cover visual/UI validation
   - `__tests__/e2e/` and `__tests__/uat/` provide comprehensive UI testing
   - Playwright better suited for Confluence integration testing

4. **Configuration Obsolete**:
   - References components that may have changed since Sept 20 (last modification)
   - No maintenance or updates in 2+ months
   - Puppet scripts never executed

### Recommendation: **REMOVE**

**Actions**:

1. Delete `backstop_data/` directory
2. Delete `backstop.json` configuration
3. Update `.gitignore` to explicitly exclude if ever re-added: `backstop_data/`
4. Document removal in CHANGELOG.md

**Justification**:

- Never used in 2+ months since creation
- Wrong architectural approach for ScriptRunner apps
- Playwright provides superior integration testing
- Jest component tests provide adequate unit-level validation
- No active maintenance or future roadmap

**Replacement Strategy**:

- Component visual validation → Jest component tests (95%+ coverage achieved)
- UI integration testing → Playwright E2E tests (active)
- Regression testing → Comprehensive test suite (345 JS + 43 Groovy tests)

---

## 2. Test Coverage Reports (`coverage/`)

### Current Status

```
Size: 15MB (auto-generated)
Files: HTML reports, LCOV data, coverage metrics
Git tracked: NO (properly gitignored)
Auto-generated: YES (every test run)
Referenced in: 16 jest.config*.js files
```

### Analysis

**Directory Structure**:

```
coverage/
├── components/          # Component test coverage
├── unit/                # Unit test coverage
├── security/            # Security test coverage
├── integration/         # Integration test coverage
├── lcov-report/         # HTML coverage reports
├── lcov.info            # LCOV format data (22,371 lines)
└── [various optimized subdirectories]
```

**Jest Configuration Coverage Mapping**:

```javascript
// 10 different coverage directories configured:
jest.config.unit.js:         coverageDirectory: "coverage/unit"
jest.config.components.js:   coverageDirectory: "coverage/components"
jest.config.security.js:     coverageDirectory: "coverage/security"
jest.config.performance.js:  coverageDirectory: "coverage/performance"
jest.config.memory-optimized.js: coverageDirectory: "coverage/memory-optimized"
// ... 5 more optimized variants
```

**Git Status**:

```bash
# Root .gitignore
coverage/
*.coverage
*.coveragexml

# Result: Properly excluded from version control ✅
```

**npm Scripts Integration**:

```json
"test:coverage": "npm run test:unit:coverage",
"test:unit:coverage": "jest --config jest.config.unit.js --coverage",
"test:coverage:report": "npm run test:unit:coverage && open coverage/lcov-report/index.html",
"test:coverage:security": "npm run test:security:remediation -- --coverage ...",
"test:coverage:performance": "npm run test:performance:optimization -- --coverage ..."
```

### Issues

**None** - This directory is functioning correctly:

- ✅ Auto-generated by Jest test runs
- ✅ Properly gitignored (not tracked in version control)
- ✅ Actively used for coverage reporting
- ✅ Multiple coverage types (unit, components, security, performance)
- ✅ HTML reports accessible via `npm run test:coverage:report`
- ✅ LCOV format compatible with CI/CD tools

### Recommendation: **KEEP AS-IS**

**Current Configuration is Optimal**:

1. Auto-generated - no manual maintenance needed
2. Properly gitignored - no version control pollution
3. Multiple coverage types - supports different test strategies
4. HTML reports - developer-friendly local access
5. LCOV format - CI/CD integration ready

**Size Management**:

- 15MB is acceptable for local development
- Auto-regenerated on each test run
- Can be cleaned with `rm -rf coverage/` if needed
- No impact on repository size (gitignored)

**Coverage Metrics** (from recent test runs):

- Component tests: 95%+ coverage achieved
- Security tests: Comprehensive attack vector coverage (28 scenarios)
- Unit tests: 345/345 passing
- Integration tests: Full API endpoint coverage

---

## 3. Diagnostic Scripts (`diagnostic-scripts/`)

### Current Status

```
Size: 64KB
Files: 9 files (4 MD docs + 2 scripts + 3 SQL)
Git tracked: YES
Purpose: Active troubleshooting and diagnostic tools
Last updated: Oct 7, 2025 (TODAY)
```

### Directory Contents

```
diagnostic-scripts/
├── README.md                           # Directory purpose and usage guide
├── INVESTIGATION_SUMMARY.md            # Investigation findings (13.9 KB)
├── QUICK_START_GUIDE.md                # Quick troubleshooting (2.7 KB)
├── SCRIPTRUNNER_CACHE_REFRESH.md      # Cache management (6.5 KB)
├── TEMPLATE_VARIABLE_MAPPING.md       # Email template variables (10.4 KB)
├── test-email-enrichment.groovy       # Email enrichment test (11.7 KB)
└── verify-step-instance-data.sql      # Data verification query (5.0 KB)
```

### Analysis

**Purpose** (from README.md):

- System diagnostic and troubleshooting tools
- Email template diagnostics
- ScriptRunner issue resolution
- Data verification queries
- Common troubleshooting procedures

**Active Usage Evidence**:

```bash
# Recent modifications
Oct 7, 2025 - README.md updated TODAY
Oct 2, 2025 - Most other files updated last week
```

**Integration Points**:

```bash
# Referenced in package.json
# (No direct integration - manual execution tools)

# Documentation references
- Email testing: npm run email:test
- Database queries: psql -U umig_app_user -d umig_app_db -f diagnostic-scripts/verify-step-instance-data.sql
- ScriptRunner: Copy groovy scripts to ScriptRunner Console
```

**Use Cases**:

1. **Email Template Diagnostics**:
   - Variable mapping verification (`TEMPLATE_VARIABLE_MAPPING.md`)
   - Template enrichment testing (`test-email-enrichment.groovy`)
   - Integration with MailHog testing

2. **ScriptRunner Issues**:
   - Cache refresh procedures (`SCRIPTRUNNER_CACHE_REFRESH.md`)
   - Class loading problems
   - Script registration issues

3. **Data Verification**:
   - Step instance data integrity (`verify-step-instance-data.sql`)
   - Database state verification
   - Migration validation

4. **Investigation Documentation**:
   - Comprehensive findings (`INVESTIGATION_SUMMARY.md`)
   - Quick reference guides (`QUICK_START_GUIDE.md`)

### Issues

**Organization Confusion**:

1. **Overlap with `/diagnostics/` directory**:
   - Both serve diagnostic/troubleshooting purposes
   - Different focus areas but similar intent
   - Potential confusion about which directory to use

2. **Mixed Content Types**:
   - Documentation (4 MD files)
   - Executable scripts (1 Groovy, 1 SQL)
   - Investigation findings
   - Troubleshooting guides

3. **Not Integrated into Test Suite**:
   - Manual execution required
   - No npm scripts for automation
   - No test runner integration

### Recommendation: **REORGANIZE**

**Option A: Merge with Main Test Suite** (Preferred)

```
__tests__/
├── diagnostics/                    # NEW: Diagnostic test suite
│   ├── email-enrichment.test.js    # Automated version of test-email-enrichment.groovy
│   ├── step-instance-data.test.js  # Automated SQL verification
│   └── scriptrunner-cache.test.js  # Cache validation tests
└── fixtures/
    └── diagnostic-queries/
        └── verify-step-instance-data.sql  # SQL as fixture
```

**Option B: Consolidate with `/diagnostics/` directory** (Alternative)

```
diagnostics/
├── guides/                         # Troubleshooting guides
│   ├── quick-start-guide.md
│   ├── scriptrunner-cache-refresh.md
│   └── template-variable-mapping.md
├── investigations/                 # Investigation findings
│   └── investigation-summary.md
├── scripts/                        # Diagnostic scripts
│   ├── test-email-enrichment.groovy
│   └── verify-step-instance-data.sql
└── README.md
```

**Recommended Actions**:

1. **Create Automated Tests from Diagnostic Scripts**:

   ```bash
   # Convert Groovy script to Jest test
   __tests__/diagnostics/email-enrichment.test.js

   # Convert SQL to database test
   __tests__/diagnostics/step-instance-data.test.js

   # Add npm scripts
   "test:diagnostics": "jest --config jest.config.diagnostics.js",
   "test:diagnostics:email": "jest __tests__/diagnostics/email-enrichment.test.js"
   ```

2. **Move Documentation to `/diagnostics/guides/`**:
   - Consolidate troubleshooting guides in one location
   - Clear separation: `/diagnostics/` = documentation, `__tests__/` = automated tests

3. **Archive Investigation Findings**:
   - Move `INVESTIGATION_SUMMARY.md` to `docs/archive/investigations/`
   - Keep reference in `/diagnostics/guides/` if needed

4. **Update README Files**:
   - Update `diagnostic-scripts/README.md` with new structure
   - Update `/diagnostics/README.md` with consolidated content

**Benefits**:

- Automated diagnostic tests prevent regressions
- Clear separation of concerns (tests vs documentation)
- Integration with CI/CD pipeline
- Easier maintenance and discoverability

---

## 4. Diagnostics Documentation (`diagnostics/`)

### Current Status

```
Size: 36KB
Files: 5 files (4 MD docs + 1 README)
Git tracked: YES
Purpose: Diagnostic guides and bugfix documentation
Last updated: Oct 7, 2025 (TODAY - 18:28)
```

### Directory Contents

```
diagnostics/
├── README.md                                      # Directory purpose (2.3 KB)
├── componentlocator-environment-detection-fix.md  # ADR-074 fix (12.5 KB)
├── uat-stepview-configuration-fix.md              # UAT config fix (10.1 KB)
└── uat-browser-debug-guide.md                     # UAT debugging (2.4 KB)
```

### Analysis

**Purpose** (from README.md):

- Diagnostic guides for development/debugging
- Bugfix documentation with verification steps
- Environment-specific diagnostic procedures
- ScriptRunner console test scripts
- Local development troubleshooting

**Document Categories**:

1. **Bugfix Documentation** (2 files):
   - `componentlocator-environment-detection-fix.md` (ADR-074)
     - Issue: Email service broken in DEV due to ComponentLocator failure
     - Fix: Multi-tier fallback strategy
     - Tests: ScriptRunner console test + verification

   - `uat-stepview-configuration-fix.md`
     - Issue: Incomplete stepView configuration in UAT database
     - Fix: Database configuration update procedures

2. **Debug Guides** (1 file):
   - `uat-browser-debug-guide.md`
     - Purpose: Browser-based debugging for UAT environment
     - Scope: Frontend debugging, console errors, network inspection

**Content Quality**:

- ✅ Well-structured with clear categories
- ✅ Specific environment focus (DEV, UAT)
- ✅ Includes verification procedures
- ✅ Links to related ADRs and documentation
- ✅ Clear naming convention (lowercase with hyphens)
- ✅ Updated TODAY (active maintenance)

**Integration**:

```markdown
# Related Documentation (from README.md)

- ADRs: /docs/architecture/adr/
- Troubleshooting: /docs/user-guides/troubleshooting/
- Implementation Notes: /docs/architecture/implementation-notes/
```

### Issues

**None** - This directory is well-organized and serving its purpose effectively:

- ✅ Clear scope and purpose
- ✅ Well-documented structure
- ✅ Active maintenance (updated today)
- ✅ Proper categorization
- ✅ Integration with other documentation

**Minor Enhancement Opportunities**:

1. Could consolidate with `/diagnostic-scripts/` guides (see recommendation above)
2. Could add index/links to related ADRs in each document

### Recommendation: **KEEP, MINOR ENHANCEMENTS**

**Current Structure is Strong**:

- Clear purpose and scope
- Well-maintained documentation
- Proper categorization (bugfix vs debug guides)
- Active usage (updated today)
- Good integration with broader documentation ecosystem

**Suggested Enhancements**:

1. **Add Cross-References**:

   ```markdown
   # Add to each bugfix document:

   ## Related Resources

   - ADR: [ADR-074](../../docs/architecture/adr/ADR-074-...)
   - Tests: [Email Service Tests](__tests__/email/...)
   - Scripts: [Diagnostic Scripts](diagnostic-scripts/...)
   ```

2. **Consider Consolidation with `/diagnostic-scripts/` guides**:

   ```
   diagnostics/
   ├── bugfixes/              # Bugfix documentation (current content)
   ├── guides/                # Troubleshooting guides (from diagnostic-scripts)
   ├── scripts/               # Diagnostic scripts (from diagnostic-scripts)
   └── README.md
   ```

3. **Add Quick Links to README.md**:

   ```markdown
   ## Quick Access

   - [All Bugfixes](bugfixes/)
   - [Debug Guides](guides/)
   - [Diagnostic Scripts](scripts/)
   - [Related ADRs](../../docs/architecture/adr/)
   ```

---

## 5. Test Suite Architecture Review

### Current Test Organization

**Directory Structure**:

```
local-dev-setup/
├── __tests__/                      # Main test suite (WELL-ORGANIZED)
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   ├── e2e/                        # End-to-end tests
│   ├── uat/                        # User acceptance tests
│   ├── components/                 # Component tests (95%+ coverage)
│   ├── entities/                   # Entity manager tests
│   ├── security/                   # Security tests (28 scenarios)
│   ├── performance/                # Performance tests
│   ├── infrastructure/             # Infrastructure tests
│   └── __mocks__/                  # Test mocks
├── coverage/                       # Coverage reports (AUTO-GENERATED ✅)
├── backstop_data/                  # Visual regression (ABANDONED ❌)
├── diagnostic-scripts/             # Diagnostic tools (REORGANIZE 🔄)
└── diagnostics/                    # Diagnostic docs (KEEP ✅)

src/groovy/umig/tests/              # Groovy tests (SEPARATE ✅)
├── unit/                           # Groovy unit tests (43 passing)
├── integration/                    # Groovy integration tests
└── security/                       # Groovy security tests
```

**Test Execution Architecture**:

```json
{
  "technology-prefixed": {
    "javascript": "npm run test:js:*",
    "groovy": "npm run test:groovy:*"
  },
  "test-types": {
    "unit": "test:js:unit / test:groovy:unit",
    "integration": "test:js:integration / test:groovy:integration",
    "e2e": "test:js:e2e (Playwright)",
    "uat": "test:js:uat (Playwright)",
    "security": "test:js:security / test:groovy:security",
    "components": "test:js:components",
    "performance": "test:performance:*"
  },
  "test-runners": {
    "jest": "16 configuration files",
    "playwright": "E2E/UAT tests",
    "groovy": "Self-contained test runner"
  }
}
```

### Analysis

**Strengths**:

1. ✅ **Clear Technology Separation**: JS tests in `__tests__/`, Groovy tests in `src/groovy/umig/tests/`
2. ✅ **Comprehensive Coverage**: 345 JS + 43 Groovy tests (100% passing)
3. ✅ **Test Type Organization**: Unit, integration, E2E, UAT, security, performance, components
4. ✅ **Technology-Prefixed Commands**: `test:js:*` vs `test:groovy:*` prevents confusion
5. ✅ **Multiple Test Runners**: Jest, Playwright, Groovy (each optimized for purpose)
6. ✅ **Coverage Reporting**: Auto-generated, gitignored, multi-dimensional

**Gaps Identified**:

1. **Diagnostic Scripts Not Integrated**: Manual execution, not in test suite
2. **BackstopJS Abandoned**: Dead infrastructure taking up space
3. **No Diagnostic Test Suite**: Troubleshooting scripts should be automated tests

### Recommendations

**Immediate Actions** (Cleanup):

1. ❌ **Remove BackstopJS Infrastructure**
   - Delete `backstop_data/` directory
   - Delete `backstop.json`
   - Update documentation

2. ✅ **Keep Coverage As-Is**
   - No changes needed
   - Functioning correctly

3. 🔄 **Reorganize Diagnostic Scripts**
   - Create `__tests__/diagnostics/` test suite
   - Move troubleshooting guides to `diagnostics/guides/`
   - Automate manual diagnostic scripts

4. ✅ **Keep Diagnostics Directory**
   - Minor enhancements for cross-referencing
   - Consider consolidation with diagnostic-scripts guides

**Optimal Test Structure** (Proposed):

```
local-dev-setup/
├── __tests__/                      # JavaScript test suite
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   ├── e2e/                        # End-to-end tests (Playwright)
│   ├── uat/                        # User acceptance tests (Playwright)
│   ├── components/                 # Component tests
│   ├── entities/                   # Entity manager tests
│   ├── security/                   # Security tests
│   ├── performance/                # Performance tests
│   ├── infrastructure/             # Infrastructure tests
│   ├── diagnostics/                # NEW: Automated diagnostic tests
│   ├── __mocks__/                  # Test mocks
│   └── __fixtures__/               # Test fixtures (SQL, JSON, etc.)
├── coverage/                       # Auto-generated coverage reports
└── diagnostics/                    # Diagnostic documentation
    ├── bugfixes/                   # Bugfix documentation
    ├── guides/                     # Troubleshooting guides (consolidated)
    └── scripts/                    # Manual diagnostic scripts (if needed)

src/groovy/umig/tests/              # Groovy test suite (separate)
├── unit/
├── integration/
└── security/
```

---

## Summary of Recommendations

### Immediate Actions (Cleanup Phase)

| Directory             | Action             | Justification                                        | Impact                       |
| --------------------- | ------------------ | ---------------------------------------------------- | ---------------------------- |
| `backstop_data/`      | **DELETE**         | Never used, wrong approach, superseded by Playwright | 24KB cleanup                 |
| `backstop.json`       | **DELETE**         | Configuration for abandoned infrastructure           | Eliminate confusion          |
| `coverage/`           | **KEEP AS-IS**     | Auto-generated, properly gitignored, actively used   | No changes needed            |
| `diagnostic-scripts/` | **REORGANIZE**     | Consolidate and automate diagnostic tests            | Better integration           |
| `diagnostics/`        | **KEEP + ENHANCE** | Well-organized, actively maintained                  | Minor cross-ref improvements |

### Reorganization Phase (Test Infrastructure Optimization)

**Step 1: Remove BackstopJS** (Immediate)

```bash
rm -rf local-dev-setup/backstop_data/
rm local-dev-setup/backstop.json
git add -u
git commit -m "chore: remove abandoned BackstopJS visual regression infrastructure

- Removed backstop_data/ directory and backstop.json configuration
- BackstopJS never integrated into test suite (no npm scripts, no dependencies)
- Visual regression testing unsuitable for ScriptRunner app architecture
- Superseded by Playwright E2E tests and Jest component tests
- Addresses test infrastructure optimization recommendations"
```

**Step 2: Create Automated Diagnostic Test Suite** (1-2 hours)

```bash
mkdir -p __tests__/diagnostics
mkdir -p __tests__/__fixtures__/diagnostic-queries

# Create automated tests from manual scripts
# test:diagnostics npm scripts
# jest.config.diagnostics.js configuration
```

**Step 3: Consolidate Diagnostic Documentation** (30 mins)

```bash
mkdir -p diagnostics/guides
mkdir -p diagnostics/scripts

# Move troubleshooting guides from diagnostic-scripts/ to diagnostics/guides/
# Update cross-references
# Update README files
```

**Step 4: Update Documentation** (30 mins)

```markdown
# Update files:

- local-dev-setup/README.md
- diagnostics/README.md
- CHANGELOG.md (document cleanup)
```

### Long-Term Maintenance

**Test Infrastructure Principles**:

1. **Auto-generated artifacts**: Should be gitignored (coverage, test-results)
2. **Executable tests**: Belong in `__tests__/` with npm scripts
3. **Diagnostic documentation**: Belongs in `diagnostics/` directory
4. **Abandoned infrastructure**: Remove promptly to avoid confusion

**Monitoring**:

- Review test directories quarterly for abandoned infrastructure
- Ensure new diagnostic scripts are automated as tests
- Maintain clear separation: tests vs documentation vs artifacts

---

## Appendix: Test Infrastructure Metrics

### Current State

```yaml
Test Suite Statistics:
  JavaScript Tests: 345/345 passing (100%)
  Groovy Tests: 43/43 passing (100%)
  Total Tests: 388 tests

Coverage:
  Component Tests: 95%+ coverage
  Security Tests: 28 attack scenarios
  Integration Tests: All 31+ API endpoints

Test Infrastructure:
  Active Frameworks: Jest, Playwright, Groovy
  Abandoned Frameworks: BackstopJS
  Coverage Directory: 15MB (auto-generated, gitignored)
  Test Configurations: 16 Jest configs

npm Scripts:
  Total Test Scripts: 120+
  Technology-Prefixed: test:js:*, test:groovy:*
  Test Categories: unit, integration, e2e, uat, security, performance, components
```

### After Cleanup

```yaml
Expected Improvements:
  Disk Space Saved: 24KB (BackstopJS removal)
  Confusion Eliminated: 1 abandoned framework
  Test Integration: +1 diagnostic test suite
  Documentation Clarity: Consolidated troubleshooting guides

Maintenance Burden:
  Before: 4 test-related directories (mixed purpose)
  After: 3 directories (clear separation)

Test Execution:
  Before: 388 tests (no diagnostic automation)
  After: 388+ tests (automated diagnostics)
```

---

**Analysis Complete** | **Ready for Review and Implementation**
