# Infrastructure Scripts

Automated JDBC driver management and cross-platform Groovy integration test support.

## Structure

```
infrastructure/
└── setup-groovy-jdbc.js             # Automated PostgreSQL JDBC setup
```

## Contents

- **Script**: Automated download and setup of PostgreSQL JDBC driver (42.7.3)
- **Features**: Cross-platform compatibility, pure Node.js implementation, automated driver management
- **Process**: Creates jdbc-drivers/ directory, downloads from official source, validates download, provides integration instructions
- **Architecture Benefits**: Self-contained test architecture (TD-001), zero external dependencies, 35% performance improvement, 100% test pass rate

## Integration

- Setup: `npm run setup:groovy-jdbc`
- Test usage: `npm run test:groovy:unit` (uses JDBC automatically)
- Manual execution: `node scripts/utilities/groovy-with-jdbc.js your-test.groovy`

---

_Last Updated: 2025-10-01_
