# Custom Confluence Image for UMIG

Purpose: Container-based Atlassian Confluence environment with session authentication support

## Container Configuration

### Base Image

```dockerfile
FROM atlassian/confluence:9.2.7
```

### Included Components

- **Confluence Server**: Version 9.2.7
- **PostgreSQL JDBC Driver**: For ScriptRunner database connectivity
- **Java Runtime**: OpenJDK 11
- **Session Management**: JSESSIONID-based authentication support

### Manual Installation Required

- **ScriptRunner Plugin**: Install via Marketplace (ADR-007)
- **UMIG Application**: Deploy separately after container start

## Prerequisites

- **Podman 4.7+** or Docker 20.10+
- **8GB RAM minimum** (16GB recommended)
- **PostgreSQL container** running

## Quick Start

```bash
# Start complete stack
cd ..
npm start

# Access Confluence
# http://localhost:8090
# admin / 123456

# Install ScriptRunner manually
# Settings → Find new apps → Search "ScriptRunner"
```

## Session Authentication (TD-008)

### Container Configuration

```yaml
environment:
  - ATL_AUTOLOGIN_COOKIE_AGE=1800 # 30-minute sessions
  - ATL_PROXY_NAME=localhost
  - ATL_PROXY_PORT=8090
```

### Session Capture

```bash
# Login to Confluence UI
npm run auth:capture-session

# Validate session
curl -H "Cookie: JSESSIONID=$JSESSIONID" \
     -H "X-Requested-With: XMLHttpRequest" \
     http://localhost:8090/rest/api/2/myself
```

## Building

```bash
# Automatic build
npm start  # Builds if not present

# Manual build
podman build -t umig-confluence:9.2.7 -f Containerfile .
```

## Management

```bash
# Start container
npm start

# Check status
podman ps --filter name=umig_confluence

# View logs
podman logs umig_confluence --tail 50

# Health check
podman exec umig_confluence /scripts/health-check.sh
```

## ScriptRunner Installation

1. Access http://localhost:8090 (admin / 123456)
2. Navigate to Settings → Find new apps
3. Search "ScriptRunner for Confluence"
4. Install and accept license
5. Verify in Settings → Manage apps

## Integration

| Component  | Container Name  | Port | Purpose            |
| ---------- | --------------- | ---- | ------------------ |
| Confluence | umig_confluence | 8090 | Application server |
| PostgreSQL | umig_postgres   | 5432 | Database           |
| MailHog    | umig_mailhog    | 8025 | Email testing      |

## Notes

- Container for development use only
- ScriptRunner manual installation required per ADR-007
- Session persistence across container restarts
- SSL configuration not included
