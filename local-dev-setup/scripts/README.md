# UMIG Development Scripts

Development and operational scripts with self-contained architecture and technology-prefixed commands.

## Structure

```
scripts/
├── generators/              # Data generation scripts (001-100)
├── test-runners/            # Test orchestration layer (24 runners)
├── services/                # Reusable service classes
├── utilities/               # Standalone utility tools (11 utilities)
├── infrastructure/          # Infrastructure setup scripts
├── lib/                     # Shared libraries and utilities
├── start.js                 # Environment startup orchestrator
├── stop.js                  # Environment shutdown manager
├── restart.js               # Environment restart with options
└── umig_generate_fake_data.js # Main data generation coordinator
```

## Contents

- **Key Scripts**: Environment management (start/stop/restart), data generation coordinator, CSV importer
- **Testing Commands**: Technology-prefixed (test:js:_, test:groovy:_, test:all:\*)
- **Infrastructure**: Groovy JDBC integration, health checks, quality validation
- **Email Testing**: MailHog integration, SMTP connectivity, template demonstrations
- **Data Operations**: Generate test data, CSV import, database operations

## Features

- Cross-platform support (Windows/macOS/Linux)
- Zero shell script dependencies
- Self-contained test architecture
- Enterprise-grade security testing
- 100% test success rate (64/64 JS, 31/31 Groovy)

---

_Last Updated: 2025-10-01_
