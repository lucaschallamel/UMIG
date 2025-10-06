# Local Development Setup

Purpose: Containerized development environment for UMIG ScriptRunner application
Stack: Confluence 9.2.7, ScriptRunner 9.21.0, PostgreSQL 14, Vanilla JS, Groovy 3.0.15

## Quick Start

```bash
npm start                    # Start complete development stack
npm stop                     # Stop all services
npm run restart:erase        # Reset everything (clean slate)
npm run generate-data:erase  # Generate test data with reset
```

## Directory Structure

### Core Directories

- **scripts/** - Development and operational scripts (orchestration, testing, utilities)
- ****tests**/** - Jest testing framework (unit, integration, e2e, security)
- **liquibase/** - Database migrations and schema management
- **data-utils/** - CSV templates, data importers, and archives
- **infrastructure/** - Backup, restore, and upgrade utilities
- **confluence/** - Custom Confluence container configuration
- **postgres/** - PostgreSQL container data and initialization
- **jdbc-drivers/** - Database drivers for Groovy tests

### Build & Testing

- **build/** - Build artifacts and packaged releases
- **coverage/** - Test coverage reports (components, unit, integration)
- **test-results/** - Test execution results and logs
- **backstop_data/** - Visual regression testing configuration

### Utilities

- **diagnostic-scripts/** - System diagnostic and troubleshooting tools
- **backups/** - Database backup archives
- **data/** - Runtime data directory

## Key Configuration Files

- **package.json** - NPM commands, dependencies, and test configuration
- **podman-compose.yml** - Container orchestration configuration
- **setup.yml** - Ansible automation playbook for environment setup
- **.env.example** - Environment variables template
- **SESSION_AUTH_UTILITIES.md** - API authentication guide

## Services

- **Confluence**: http://localhost:8090 (admin / 123456)
- **PostgreSQL**: localhost:5432 (umig_app_user / 123456)
- **MailHog**: http://localhost:8025

## Testing Commands

```bash
# JavaScript tests (Jest)
npm run test:js:unit         # Unit tests
npm run test:js:integration  # Integration tests
npm run test:js:components   # Component tests (95%+ coverage)
npm run test:js:security     # Security tests (28 scenarios)

# Groovy tests (43/43 passing)
npm run test:groovy:unit     # Unit tests
npm run test:groovy:integration # Integration tests
npm run test:groovy:all      # All Groovy tests

# Combined testing
npm run test:all:comprehensive # Complete test suite
npm run test:all:quick       # Quick validation (~158 tests)
```

## Infrastructure & Operations

```bash
# System management
npm run health:check         # Verify system health
npm run setup:groovy-jdbc    # Setup JDBC drivers
npm run groovy:classpath:status # Check classpath

# Data operations
npm run generate-data        # Generate test data
npm run generate-data:erase  # Clear and regenerate (WARNING: erases data)

# Email testing (MailHog)
npm run mailhog:test        # Test SMTP connectivity
npm run mailhog:check       # Check message count
npm run mailhog:clear       # Clear test inbox
npm run email:test          # Comprehensive email testing

# API authentication
npm run auth:capture-session # Capture session from browser
```

## First-Time Setup

```bash
# If npm start fails:
brew install ansible         # macOS
sudo apt install ansible     # Ubuntu
ansible-playbook setup.yml
npm start
```

## Access Points

- **ScriptRunner**: Confluence → Settings → Manage Apps → ScriptRunner → Script Console
- **Admin GUI**: UMIG page → Add "UMIG Admin GUI" macro

## Troubleshooting

```bash
# System health check
npm run health:check

# View container status
podman ps -a

# View logs
npm run logs:postgres
npm run logs:confluence
npm run logs:all

# Clean restart
npm run restart:erase
```

## Architecture Notes

- Uses Podman by default (Docker as fallback)
- Pure vanilla JavaScript (no frameworks)
- Self-contained test architecture
- Technology-prefixed test commands (test:js:_, test:groovy:_)
- Session-based API authentication (see SESSION_AUTH_UTILITIES.md)
- Liquibase for database schema versioning
- Zero shell script dependencies (cross-platform Node.js)

---

_Last Updated: 2025-10-06_
