# Local Development Setup

Purpose: Containerized development environment for UMIG ScriptRunner app
Stack: Confluence 9.2.7, ScriptRunner 9.21.0, PostgreSQL 14, Vanilla JS, Groovy 3.0.15

## Quick Start

```bash
npm start                    # Start complete development stack
npm stop                     # Stop all services
npm run restart:erase        # Reset everything
npm run generate-data:erase  # Generate test data
```

## First-Time Setup

```bash
# If npm start fails:
brew install ansible         # macOS
sudo apt install ansible     # Ubuntu
ansible-playbook setup.yml
npm start
```

## Services

- **Confluence**: http://localhost:8090 (admin / 123456)
- **PostgreSQL**: localhost:5432 (umig_app_user / 123456)
- **MailHog**: http://localhost:8025

## Access

- **ScriptRunner**: Settings → Manage Apps → ScriptRunner → Script Console
- **Admin GUI**: UMIG page → Add UMIG Admin GUI macro

## Testing Commands

```bash
# JavaScript tests
npm run test:js:unit         # Unit tests
npm run test:js:integration  # Integration tests
npm run test:js:components   # Component tests
npm run test:js:security     # Security tests

# Groovy tests
npm run test:groovy:unit     # Unit tests
npm run test:groovy:integration # Integration tests
npm run test:groovy:all      # All Groovy tests

# Combined
npm run test:all:comprehensive # Complete test suite
npm run test:all:quick       # Quick validation
```

## Email Testing

```bash
npm run mailhog:test        # Test SMTP connectivity
npm run mailhog:check       # Check message count
npm run mailhog:clear       # Clear test inbox
npm run email:test          # Email testing
npm run email:demo          # Email demo
```

## API Authentication

```bash
npm run auth:capture-session # Capture session from browser
# Use JSESSIONID in API calls - see SESSION_AUTH_UTILITIES.md
```

## Infrastructure & Data

```bash
npm run health:check         # System validation
npm run generate-data        # Generate test data
npm run generate-data:erase  # Clear and regenerate
npm run setup:groovy-jdbc    # Setup JDBC drivers
npm run groovy:classpath:status # Check classpath
```

## Directory Structure

- **scripts/** - Development and operational scripts
- \***\*tests**/\*\* - Jest testing framework
- **data-utils/** - CSV templates and data importers
- **infrastructure/** - Backup, restore, and upgrade scripts
- **confluence/** - Custom Confluence container files
- **jdbc-drivers/** - Database drivers for Groovy tests

## Key Files

- **package.json** - NPM commands and dependencies
- **podman-compose.yml** - Container orchestration
- **setup.yml** - Ansible automation playbook
- **SESSION_AUTH_UTILITIES.md** - API authentication guide

## Troubleshooting

```bash
# System health
npm run health:check

# Container status
podman ps -a

# Logs
podman logs umig_confluence
podman logs umig_postgres

# Clean restart
npm run restart:erase
```

## Notes

- Uses Podman by default (Docker as fallback)
- Pure vanilla JavaScript (no frameworks)
- Self-contained test architecture
- Technology-prefixed test commands
- Session-based API authentication
