# Development Scripts

Purpose: Development and operational scripts with self-contained architecture and technology-prefixed commands

## Structure

```
scripts/
├── build/                   # Build orchestration and packaging (6 files)
├── generators/              # Data generation scripts (001-100 numbered)
├── test-runners/            # Test orchestration layer (24 runners)
├── services/                # Reusable service classes (database, email, etc.)
├── utilities/               # Standalone utility tools (11 utilities)
├── infrastructure/          # Infrastructure setup scripts
├── maintenance/             # System maintenance utilities
├── performance/             # Performance testing and benchmarking
├── lib/                     # Shared libraries and utilities
├── utils/                   # Common utility functions
├── start.js                 # Environment startup orchestrator
├── stop.js                  # Environment shutdown manager
├── restart.js               # Environment restart with options
└── umig_generate_fake_data.js # Main data generation coordinator
```

## Key Components

### Root Scripts (4 core files)

- **start.js** - Starts complete development stack (Podman/Docker containers)
- **stop.js** - Graceful shutdown of all services
- **restart.js** - Restart with options (clean, preserve data, reset)
- **umig_generate_fake_data.js** - Fake data generation coordinator

### build/ (6 files)

- **BuildOrchestrator.js** - Master build coordinator
- **BuildValidator.js** - Pre-build validation
- **MetadataGenerator.js** - Build metadata generation
- **SourcePackager.js** - Source packaging (84% size reduction)
- **VersionManager.js** - Semantic versioning
- **test-manifest-integration.js** - Build integration tests

### generators/ (Data Generation)

- 001-100 numbered data generators
- CSV import utilities
- Fake data generation for testing
- Hierarchical entity creation (migrations → iterations → steps)

### test-runners/ (24 Test Orchestrators)

- Technology-prefixed test commands (test:js:_, test:groovy:_)
- Unit, integration, e2e, security test runners
- Component and entity test orchestration
- Test result aggregation and reporting

### services/ (Reusable Services)

- Database service classes
- Email service integration (MailHog)
- API client services
- Authentication utilities

### utilities/ (11 Standalone Tools)

- Health check utilities
- JDBC driver setup
- Classpath management
- Log viewing and analysis
- Session authentication capture

### infrastructure/ (Environment Setup)

- Groovy JDBC integration
- Container orchestration helpers
- Environment validation
- System prerequisites checks

## Command Categories

### Environment Management

```bash
npm start                    # Start development stack
npm stop                     # Stop all services
npm run restart:erase        # Clean restart
```

### Testing Commands

```bash
# JavaScript tests (Jest)
npm run test:js:unit
npm run test:js:integration
npm run test:js:components
npm run test:js:security

# Groovy tests (self-contained)
npm run test:groovy:unit
npm run test:groovy:integration
npm run test:groovy:all

# Combined
npm run test:all:comprehensive
npm run test:all:quick
```

### Build Commands

```bash
npm run build:dev            # Development build
npm run build:uat            # UAT build
npm run build:prod           # Production build (84% optimized)
```

### Email Testing

```bash
npm run mailhog:test         # SMTP connectivity test
npm run mailhog:check        # Check message count
npm run mailhog:clear        # Clear test inbox
npm run email:test           # Comprehensive email tests
```

### Infrastructure

```bash
npm run health:check         # System health validation
npm run setup:groovy-jdbc    # JDBC driver setup
npm run groovy:classpath:status # Classpath verification
npm run auth:capture-session # Capture browser session
```

### Data Operations

```bash
npm run generate-data        # Generate test data
npm run generate-data:erase  # Clear and regenerate (WARNING)
```

## Features

- **Cross-platform**: Windows/macOS/Linux support via Node.js
- **Zero shell dependencies**: Pure Node.js scripts (no bash/sh)
- **Self-contained tests**: Groovy tests run independently
- **Technology-prefixed**: Clear command structure (test:js:_, test:groovy:_)
- **Parallel execution**: Optimized test and build processes
- **Enterprise security**: 28 security test scenarios

## Architecture Principles

1. **Self-Contained**: Each script can run independently
2. **Composable**: Scripts can be orchestrated together
3. **Validated**: Pre-execution validation and health checks
4. **Logged**: Comprehensive logging and error reporting
5. **Tested**: Integration tests for critical scripts

## Configuration

Scripts use configuration from:

- **package.json** - NPM commands and script definitions
- **.env** - Environment variables (database credentials, etc.)
- **podman-compose.yml** - Container configuration
- **jest.config.\*.js** - Test framework configuration

## Success Rates

- **JavaScript Tests**: 64/64 passing (100%)
- **Groovy Tests**: 43/43 passing (100%)
- **Component Tests**: 95%+ coverage
- **Security Tests**: 28/28 scenarios passing

---

_Last Updated: 2025-10-06_
