# JDBC Drivers

JDBC drivers for UMIG's Groovy database connectivity and self-contained test architecture.

## Structure

```
jdbc-drivers/
└── postgresql-42.7.3.jar            # PostgreSQL JDBC Driver (1.1 MB)
```

## Contents

- **Driver**: PostgreSQL JDBC Driver 42.7.3
- **Compatibility**: Java 8+ / Groovy 3.0.15+
- **Setup**: Automated via `npm run setup:groovy-jdbc`
- **Integration**: Self-contained test architecture (TD-001), technology-prefixed commands (TD-002)
- **Performance**: 35% improvement, 100% test success rate (31/31 Groovy tests)

## Configuration

- Driver class: `org.postgresql.Driver`
- JDBC URL pattern: `jdbc:postgresql://host:port/database`
- Managed via infrastructure scripts with automated setup

---

_Last Updated: 2025-10-01_
