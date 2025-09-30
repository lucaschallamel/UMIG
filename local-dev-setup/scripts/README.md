# UMIG Development Scripts

Purpose: Development and operational scripts with self-contained architecture and technology-prefixed commands

## Structure

- **generators/** - Data generation scripts (001-100)
- **test-runners/** - Test orchestration layer (24 runners)
- **services/** - Reusable service classes
- **utilities/** - Standalone utility tools (11 utilities)
- **infrastructure/** - Infrastructure setup scripts
- **lib/** - Shared libraries and utilities

## Key Scripts

- **start.js** - Environment startup orchestrator
- **stop.js** - Environment shutdown manager
- **restart.js** - Environment restart with options
- **umig_generate_fake_data.js** - Main data generation coordinator

## Testing Commands

```bash
# JavaScript tests
npm run test:js:unit         # JavaScript unit tests
npm run test:js:integration  # JavaScript integration tests
npm run test:js:components   # Component tests
npm run test:js:security     # Security tests

# Groovy tests
npm run test:groovy:unit     # Groovy unit tests
npm run test:groovy:integration # Groovy integration tests
npm run test:groovy:all      # All Groovy tests

# Cross-technology
npm run test:all:comprehensive # Complete test suite
```

## Infrastructure Commands

```bash
# Groovy JDBC integration
npm run setup:groovy-jdbc    # Setup JDBC drivers
npm run groovy:classpath     # Configure classpath
npm run groovy:classpath:status # Check status

# Health checks
npm run health:check         # System validation
npm run quality:check        # Quality validation
```

## Email Testing

```bash
npm run email:test           # Email testing suite
npm run mailhog:test         # SMTP connectivity
npm run email:demo           # Email demonstrations
```

## Data Operations

```bash
npm run generate-data        # Generate test data
npm run generate-data:erase  # Clear and regenerate
npm run import:csv           # Import CSV data
```

## Features

- Cross-platform support (Windows/macOS/Linux)
- Zero shell script dependencies
- Self-contained test architecture
- Technology-prefixed commands
- Enterprise-grade security testing
- 100% test success rate (64/64 JS, 31/31 Groovy)

## Integration

- PostgreSQL container connectivity
- MailHog SMTP integration
- Jest framework compatibility
- NPM command integration
