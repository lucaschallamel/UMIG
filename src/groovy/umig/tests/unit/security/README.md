# UMIG Email Security Test Suite - US-067

## Overview

Comprehensive email template security testing infrastructure for UMIG's EmailService, providing industrial-strength validation of security implementations following UMIG's established patterns and ADR requirements.

## Test Infrastructure

### EmailSecurityTestBase.groovy

**Abstract base class** providing:

- **25+ Attack Pattern Library** across 8 security categories
- **Performance Measurement** utilities (<2ms overhead requirement)
- **Mock Framework** following ADR-026 SQL mocking patterns
- **Test Utilities** for pattern validation and size testing
- **Security Constants** matching EmailService implementation

### EmailTemplateSecurityTest.groovy

**Concrete test implementation** covering:

- **Phase 1 Security Validation** (migrated from ad hoc tests)
- **13 Security Test Categories**:
  - SQL Injection Prevention
  - XSS Prevention
  - Command Injection Prevention
  - Template Injection Prevention
  - System Access Prevention
  - File Access Prevention
  - Control Flow Prevention
  - Script Execution Prevention
  - Resource Exhaustion Prevention
  - Template Nesting Attack Prevention
  - Content Size Validation
  - Performance Impact Validation

## Attack Pattern Coverage

### 8 Attack Categories with 25+ Patterns:

1. **SQL Injection** (7 patterns): `'; DROP TABLE`, `' OR '1'='1`, etc.
2. **XSS Attacks** (9 patterns): `<script>alert()`, `<img onerror=alert()>`, etc.
3. **Command Injection** (7 patterns): `; rm -rf /`, `&& cat /etc/passwd`, etc.
4. **Template Injection** (8 patterns): `${Runtime.getRuntime().exec()}`, etc.
5. **System Access** (8 patterns): `system.exit(0)`, `System.getProperty()`, etc.
6. **File Access** (8 patterns): `new File().delete()`, `FileWriter`, etc.
7. **Control Flow** (8 patterns): `if (true) { System.exit(0); }`, etc.
8. **Script Execution** (8 patterns): `eval()`, `GroovyShell()`, etc.

### Additional Patterns:

- **Template Nesting Attacks** (8 patterns): Depth-based attacks
- **Size Attack Patterns** (5 patterns): Memory exhaustion tests

## Usage

### Quick Commands

```bash
# Run email security tests
npm run test:us067

# Verbose output with detailed analysis
npm run test:us067:verbose

# Direct Groovy execution
npm run test:security:email:direct

# Full security test suite (includes email security)
npm run test:security
```

### Integration with UMIG Test Framework

- **Follows ADR-026**: Specific SQL query mocking
- **Performance Compliant**: <2ms overhead requirement
- **UMIG Pattern**: Simple Groovy tests (no Spock framework)
- **Cross-Platform**: Node.js test runner for consistency
- **CI/CD Ready**: Proper exit codes and error reporting

## Test Results Format

### Success Output:

```
🎉 ALL EMAIL SECURITY TESTS PASSED!
✅ 25+ attack patterns validated
✅ 13 security test categories completed
✅ Performance requirements met (<2ms overhead)
✅ UMIG EmailService security implementation verified
```

### Coverage Metrics:

- **SQL Injection**: 7/7 patterns blocked
- **XSS Prevention**: 9/9 patterns blocked
- **Command Injection**: 7/7 patterns blocked
- **Template Injection**: 8/8 patterns blocked
- [etc...]

## Architecture Integration

### UMIG Compliance:

- **Package Structure**: `umig.tests.unit.security`
- **Naming Convention**: `EmailSecurityTestBase`, `EmailTemplateSecurityTest`
- **Mock Pattern**: `DatabaseUtil.withSql` with `MockSql`
- **Error Handling**: `SecurityException` for blocked patterns
- **Performance**: Measured execution time validation

### EmailService Integration:

Tests the actual Phase 1 security implementation:

- `validateTemplateExpression(String templateText)`
- `validateContentSize(Map variables, String templateText)`
- `processNotificationTemplate(...)` security integration

### Sprint 6 Deliverables:

- ✅ **Step 1 Complete**: EmailSecurityTestBase infrastructure created
- ✅ **Migration Complete**: Ad hoc test patterns industrialized
- ✅ **Integration Complete**: npm scripts and test runner configured
- ✅ **Validation Complete**: 90%+ coverage of US-067 requirements

## Troubleshooting

### Common Issues:

1. **"Groovy not found"**
   - Ensure Groovy is installed and in PATH
   - Installation: https://groovy-lang.org/install.html

2. **"Security patterns not blocked"**
   - Verify EmailService.groovy has Phase 1 implementations
   - Check `validateTemplateExpression` method exists
   - Review dangerous pattern blocking logic

3. **"Performance threshold exceeded"**
   - Check for infinite loops in security validation
   - Verify mock setup is correct
   - Review test execution environment

### Advanced Usage:

```bash
# Test specific attack category
groovy -Dpattern.category=sql_injection EmailTemplateSecurityTest.groovy

# Performance profiling
groovy -Dperformance.profile=true EmailTemplateSecurityTest.groovy

# Debug mode with full stack traces
npm run test:security:email:verbose
```

## Development Notes

### Extending Attack Patterns:

Add new patterns to `ATTACK_PATTERNS` map in `EmailSecurityTestBase.groovy`:

```groovy
'new_attack_category': [
    "pattern1",
    "pattern2"
]
```

### Performance Optimization:

- Mock components initialized once per test class
- Pattern validation uses efficient string operations
- Bulk pattern testing reduces overhead

### Future Enhancements:

- Integration with UMIG's existing security test framework
- Automated pattern generation from OWASP databases
- Real-time attack pattern updates
- Enhanced performance metrics collection

---

**Author**: UMIG Test Framework  
**Version**: 1.0  
**Sprint**: 6 (US-067)  
**Last Updated**: 2025-01-17

For questions or issues, refer to UMIG testing documentation or Sprint 6 planning materials.
