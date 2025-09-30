# JDBC Drivers

Purpose: JDBC drivers for UMIG's Groovy database connectivity and self-contained test architecture

## Current Drivers

### postgresql-42.7.3.jar

- **Driver**: PostgreSQL JDBC Driver
- **Version**: 42.7.3 (Latest stable release)
- **Size**: 1,089,312 bytes (1.1 MB)
- **Compatibility**: Java 8+ / Groovy 3.0.15+

## Setup

```bash
# Automatic setup (recommended)
npm run setup:groovy-jdbc

# Check status
npm run groovy:classpath:status
```

## Usage

```bash
# Via npm commands (uses JDBC automatically)
npm run test:groovy:unit
npm run test:groovy:integration

# Manual execution with JDBC
node scripts/utilities/groovy-with-jdbc.js your-script.groovy

# Direct classpath
groovy -cp "jdbc-drivers/postgresql-42.7.3.jar" your-script.groovy
```

## Integration

- Self-contained test architecture (TD-001)
- Technology-prefixed commands (TD-002)
- Zero external dependencies
- 35% performance improvement
- 100% test success rate (31/31 Groovy tests)

## Configuration

```yaml
driver_name: postgresql-42.7.3.jar
driver_class: org.postgresql.Driver
jdbc_url_pattern: jdbc:postgresql://host:port/database
```

## Troubleshooting

```bash
# Check driver exists
ls -la jdbc-drivers/postgresql-42.7.3.jar

# Recreate setup
npm run setup:groovy-jdbc

# Test with wrapper
node scripts/utilities/groovy-with-jdbc.js your-test.groovy
```

## Notes

- Downloaded from official PostgreSQL JDBC repository
- Automated management via infrastructure scripts
- CVE compliance with latest security patches
- Cross-platform compatibility (Windows/macOS/Linux)
