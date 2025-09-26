# UMIG Test Commands - Quick Reference

**Current Status**: Sprint 7 Phase 3 Complete | Technology-Prefixed Architecture

## 🚀 Quick Start Commands

```bash
# Smart testing (adapts to your environment)
npm test                    # Detects infrastructure, runs appropriate tests
npm run test:all:quick      # Quick validation (~158 tests, no infrastructure needed)

# Start full development environment
npm start                   # Starts PostgreSQL, Confluence, MailHog
npm run test:all:comprehensive # Complete test suite (all technologies)
```

## 📊 Technology-Prefixed Commands

### JavaScript Testing (Jest)

```bash
# Core JavaScript testing
npm run test:js:unit           # JavaScript unit tests (Jest)
npm run test:js:integration    # JavaScript integration tests (requires infrastructure)
npm run test:js:e2e           # End-to-end tests (Playwright)
npm run test:js:all           # All JavaScript tests

# Component architecture testing
npm run test:js:components     # Component validation tests (95%+ coverage)
npm run test:js:security       # Component security tests (28 scenarios)
npm run test:js:security:pentest # Penetration testing (21 attack vectors)
```

### Groovy Testing (Self-Contained)

```bash
# Groovy testing (100% pass rate)
npm run test:groovy:unit       # Groovy unit tests (31/31 passing)
npm run test:groovy:integration # Groovy integration tests
npm run test:groovy:all        # All Groovy tests
```

### Cross-Technology Commands

```bash
# Combined testing across technologies
npm run test:all:unit          # Unit tests (JavaScript + Groovy)
npm run test:all:integration   # Integration tests (both technologies)
npm run test:all:comprehensive # Everything (unit + integration + e2e + components + security)
```

## 🎯 Focused Testing Commands

### Component-Specific Testing

```bash
# Test specific components
npm run test:js:components -- --testPathPattern='TeamsEntityManager'
npm run test:js:components -- --testPathPattern='ComponentOrchestrator'
npm run test:js:security -- --testPathPattern='ComponentOrchestrator.pentest'

# Test entity managers
npm run test:js:components -- --testPathPattern='.*EntityManager'
```

### Single Test Execution

```bash
# JavaScript tests (Jest)
npm run test:js:unit -- --testPathPattern='specific.test.js'
npm run test:js:unit -- --testNamePattern='specific test name'

# Groovy tests (direct execution)
groovy src/groovy/umig/tests/unit/SpecificTest.groovy
groovy src/groovy/umig/tests/integration/SpecificIntegrationTest.groovy
```

## 📧 Email & Infrastructure Testing

```bash
# Email testing (requires MailHog)
npm run email:test          # Comprehensive email testing
npm run email:demo          # Demo enhanced email functionality
npm run mailhog:test        # Test SMTP connectivity
npm run mailhog:check       # Check message count
npm run mailhog:clear       # Clear test inbox

# Health checks
npm run health:check        # System health validation
npm run postgres:check      # Database connectivity
npm run confluence:check    # Confluence status
```

## 🛠 Development Environment Commands

```bash
# Environment management
npm start                   # Start complete development stack
npm stop                    # Stop all services
npm run restart:erase       # Reset everything (clean slate)
npm run generate-data:erase # Generate fake data with reset
```

## 📁 Test File Organization

### Test Locations

```
local-dev-setup/__tests__/
├── unit/                   # Unit tests (no infrastructure)
│   ├── components/         # Component tests
│   ├── services/          # Service tests
│   └── entities/          # Entity manager tests
├── integration/            # Integration tests (infrastructure required)
├── e2e/                   # End-to-end tests (Playwright)
├── dom/                   # DOM tests (JSDOM)
├── email/                 # Email tests (MailHog required)
└── security/              # Security tests

src/groovy/umig/tests/
├── unit/                  # Self-contained Groovy unit tests
└── integration/           # Groovy integration tests
```

### Test Patterns

```bash
# Component tests
{Component}.test.js               # Basic component test
{Component}.security.test.js      # Security-focused test
{Component}.pentest.test.js       # Penetration testing

# Service tests
{Service}.test.js                 # Service functionality test
{Service}.integration.test.js     # Integration test

# Entity tests
{Entity}EntityManager.test.js     # Entity manager test
```

## ⚡ Performance & Debugging

```bash
# Performance testing
npm run perf:api -- --endpoint=/teams --iterations=100
npm run perf:components      # Component rendering benchmarks
npm run perf:database        # Database query performance

# Debugging
npm run logs:confluence      # View Confluence logs
npm run logs:postgres        # View PostgreSQL logs
npm run logs:all            # View all container logs

# Test debugging (verbose output)
npm run test:js:unit -- --verbose
npm run test:js:components -- --verbose --testPathPattern='ComponentOrchestrator'
```

## 🎭 Test Categories by Environment

### ✅ No Infrastructure Required (Always Pass)

```bash
npm run test:js:unit        # Unit tests with mocked services
npm run test:groovy:unit    # Self-contained Groovy tests
npm run test:all:quick      # Combined quick validation
```

### 🔗 Partial Infrastructure Required

```bash
npm run test:js:integration # Requires PostgreSQL + Confluence
npm run email:test         # Requires MailHog SMTP
```

### 🎪 Full Infrastructure Required

```bash
npm start                  # Start all services first
npm run test:js:e2e        # End-to-end tests
npm run test:all:comprehensive # Complete test suite
```

## 🔧 Sprint 7 Status & Achievements

### Current Test Status

- **JavaScript Tests**: 96 passed / 146 total (66% pass rate)
- **Groovy Tests**: 31/31 passing (100% pass rate)
- **Component Tests**: 95%+ coverage, 8.5/10 security rating
- **Infrastructure Fixes**: All import/syntax errors resolved

### Recent Improvements

- ✅ Constants integration (73 magic numbers → named constants)
- ✅ Quick fixes applied (import paths, Jest assertions, method calls)
- ✅ Test expansion (+28 more tests now executable)
- ✅ Component loading issues resolved (25/25 components operational)

### Quick Health Check

```bash
# Verify current status
npm run test:all:quick      # Should show ~158 tests passing
npm run health:check        # Should show system status
npm run test:js:components -- --testPathPattern='ComponentOrchestrator' # Should show security tests
```

## 🆘 Common Issues & Quick Fixes

### Import Path Errors

```bash
# Symptom: "Cannot find module" errors
# Fix: Check relative paths in test files
grep -r "require.*\.\./\.\./\.\." __tests__/
```

### Test Timing Issues

```bash
# Symptom: Tests timeout or flaky results
# Fix: Use Jest fake timers
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
```

### Constants Synchronization

```bash
# Symptom: Tests fail after constant changes
# Fix: Import constants from production code
const { ORCHESTRATOR_CONSTANTS } = require('path/to/production/file');
```

## 📚 Related Documentation

- **[TEST_INFRASTRUCTURE_GUIDE.md](./TEST_INFRASTRUCTURE_GUIDE.md)** - Complete testing documentation
- **[CLAUDE.md](../../CLAUDE.md)** - Project-specific test commands and patterns
- **[PHASE-3-TEST-IMPROVEMENTS-REPORT.md](../roadmap/sprint7/PHASE-3-TEST-IMPROVEMENTS-REPORT.md)** - Sprint 7 detailed improvements

---

**Last Updated**: 2025-09-26 | **Sprint**: 7 | **Status**: Phase 3 Complete
**Quick Reference Version**: 1.0 | **Next Update**: Sprint 8 Planning
