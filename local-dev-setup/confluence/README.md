# Custom Confluence Container

Container-based Atlassian Confluence environment with session authentication support for UMIG development.

## Structure

```
confluence/
├── Containerfile                    # Dockerfile for Confluence 9.2.7
├── scripts/                         # Container management scripts
└── config/                          # Configuration files
```

## Contents

- **Base Image**: atlassian/confluence:9.2.7
- **Components**: Confluence Server, PostgreSQL JDBC Driver, Java Runtime (OpenJDK 11)
- **Session Management**: JSESSIONID-based authentication support
- **Manual Installation Required**: ScriptRunner Plugin (ADR-007), UMIG Application

## Integration

| Component  | Container Name  | Port | Purpose            |
| ---------- | --------------- | ---- | ------------------ |
| Confluence | umig_confluence | 8090 | Application server |
| PostgreSQL | umig_postgres   | 5432 | Database           |
| MailHog    | umig_mailhog    | 8025 | Email testing      |

---

_Last Updated: 2025-10-01_
