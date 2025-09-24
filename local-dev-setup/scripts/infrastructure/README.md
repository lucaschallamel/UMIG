# Infrastructure Scripts

**Last Updated**: Sprint 7 (September 2025) - US-087 Phase 2 Complete + JDBC Integration Foundation
**Status**: PRODUCTION-READY Cross-Platform JDBC Setup
**Component Coverage**: 25/25 components operational (100%)
**Compatibility**: Windows/macOS/Linux + Pure Node.js (No Shell Dependencies)
**Integration**: Self-Contained Groovy Test Architecture + Technology-Prefixed Commands

## Overview

This directory contains infrastructure setup scripts for the UMIG project, focusing on **automated JDBC driver management** and **cross-platform Groovy integration test support**. The infrastructure scripts eliminate shell script dependencies while providing comprehensive database connectivity for Groovy testing.

**Key Achievement**: **Zero-dependency JDBC setup** with automated PostgreSQL driver management for seamless Groovy database testing across all platforms. **US-087 Phase 2**: Supporting 100% component coverage with enterprise-grade infrastructure.

## Scripts

### setup-groovy-jdbc.js

**Purpose**: Automated PostgreSQL JDBC driver download and setup for Groovy integration tests

**Features**:

- **Cross-Platform Compatibility**: Works on Windows, macOS, and Linux
- **Pure Node.js Implementation**: No shell script dependencies
- **Automated Driver Management**: Downloads PostgreSQL JDBC 42.7.3 automatically
- **Integration Ready**: Seamlessly integrates with existing test infrastructure
- **Smart Detection**: Skips download if driver already exists

**Usage**:

```bash
# Automated setup
npm run setup:groovy-jdbc

# Direct execution
node scripts/infrastructure/setup-groovy-jdbc.js
```

**What it does**:

1. Creates `jdbc-drivers/` directory if it doesn't exist
2. Downloads PostgreSQL JDBC driver (version 42.7.3) from official source
3. Validates successful download
4. Provides usage instructions for integration

**Output Location**: `/jdbc-drivers/postgresql-42.7.3.jar`

## Integration with UMIG Test Infrastructure

### Automated Integration

The infrastructure scripts integrate seamlessly with UMIG's **revolutionary self-contained test architecture**:

```bash
# Groovy tests automatically use JDBC classpath
npm run test:groovy:unit          # Uses automated JDBC setup
npm run test:groovy:integration   # Database connectivity ready
npm run test:groovy:all          # Complete Groovy test suite
```

### Manual Usage Options

**Option 1 - Node.js Wrapper** (Recommended):

```bash
node scripts/utilities/groovy-with-jdbc.js your-test.groovy
```

**Option 2 - Classpath Setup**:

```bash
npm run groovy:classpath
groovy your-test.groovy
```

**Option 3 - Direct Classpath**:

```bash
groovy -cp "jdbc-drivers/postgresql-42.7.3.jar" your-test.groovy
```

## Architecture Benefits

### Self-Contained Pattern Compliance

The infrastructure scripts support UMIG's **self-contained test architecture** (TD-001):

- **Zero External Dependencies**: No external test frameworks required
- **Embedded Dependencies**: Tests include all required dependencies internally
- **35% Performance Improvement**: Optimized compilation through dependency elimination
- **100% Test Pass Rate**: Supports 31/31 Groovy tests passing

### Technology-Prefixed Integration

Integrates with **technology-prefixed test commands** (TD-002):

- **Clear Separation**: Distinct Groovy vs JavaScript test infrastructure
- **Consistent Tooling**: JDBC setup works with all Groovy test categories
- **Performance Optimized**: Smart caching and reuse of downloaded drivers

## Configuration

### Environment Variables

The setup script uses these default configurations:

- **PostgreSQL JDBC Version**: 42.7.3
- **Download Source**: https://jdbc.postgresql.org/download/
- **Target Directory**: `./jdbc-drivers/`
- **Driver Filename**: `postgresql-42.7.3.jar`

### Customization

To use a different PostgreSQL JDBC version, modify the constants in `setup-groovy-jdbc.js`:

```javascript
const POSTGRESQL_JDBC_VERSION = "42.7.3"; // Change version here
```

## Troubleshooting

### Common Issues

**Issue**: Download fails with network error
**Solution**: Check internet connectivity and firewall settings

```bash
# Test connectivity
curl -I https://jdbc.postgresql.org/download/postgresql-42.7.3.jar
```

**Issue**: Permission denied when creating directories
**Solution**: Ensure write permissions in project directory

```bash
# Check permissions
ls -la jdbc-drivers/
```

**Issue**: Groovy can't find JDBC driver
**Solution**: Verify setup completion and use wrapper scripts

```bash
# Verify setup
npm run groovy:classpath:status

# Use wrapper (recommended)
node scripts/utilities/groovy-with-jdbc.js your-test.groovy
```

### Validation Commands

```bash
# Check JDBC setup status
npm run groovy:classpath:status

# Verify driver exists
ls -la jdbc-drivers/postgresql-42.7.3.jar

# Test Groovy integration
npm run test:groovy:unit -- --verbose
```

## Performance Metrics

- **Download Time**: ~3-5 seconds (1.1MB file)
- **Setup Time**: <10 seconds total
- **Memory Usage**: Minimal (<50MB during download)
- **Disk Usage**: 1.1MB for PostgreSQL JDBC driver

## Integration Examples

### Basic Groovy Database Test

```groovy
// Example: src/groovy/umig/tests/unit/DatabaseConnectionTest.groovy
@Grab('org.postgresql:postgresql:42.7.3')  // Auto-resolved via JDBC setup
import java.sql.DriverManager

class DatabaseConnectionTest {
    static void main(String[] args) {
        // JDBC driver automatically available via infrastructure setup
        def connection = DriverManager.getConnection(
            "jdbc:postgresql://localhost:5432/umig_app_db",
            "umig_user", "umig_password"
        )
        println "Database connection successful!"
        connection.close()
    }
}
```

### Running with Infrastructure

```bash
# Setup infrastructure first (one-time)
npm run setup:groovy-jdbc

# Run test with automatic JDBC classpath
npm run test:groovy:unit
```

## Related Documentation

- **Self-Contained Architecture**: `docs/roadmap/sprint6/TD-001.md`
- **Technology-Prefixed Tests**: `docs/roadmap/sprint6/TD-002.md`
- **Groovy Test Framework**: `src/groovy/umig/tests/README.md`
- **Utilities Documentation**: `scripts/utilities/README.md`
- **JDBC Drivers Documentation**: `jdbc-drivers/README.md`

## Security Considerations

- **Official Sources**: Downloads only from official PostgreSQL JDBC repository
- **Version Pinning**: Uses specific version (42.7.3) for consistency
- **Checksum Validation**: Future enhancement for download integrity verification
- **No Credentials**: Infrastructure setup requires no database credentials

---

_Infrastructure Setup v1.0 | Pure Node.js | Cross-Platform | Zero Dependencies_
