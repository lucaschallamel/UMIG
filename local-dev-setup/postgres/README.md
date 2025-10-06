# PostgreSQL Container Configuration

Purpose: PostgreSQL database initialization and configuration for UMIG development environment

## Structure

```
postgres/
└── init-db.sh                # Database initialization script
```

## Contents

### init-db.sh

- **Purpose**: Initial database setup and configuration
- **Execution**: Runs automatically on first container start
- **Actions**:
  - Creates `umig_app_db` database
  - Creates `umig_app_user` with appropriate permissions
  - Sets up connection pooling parameters
  - Configures logging and performance settings
  - Initializes Liquibase changelog tracking

## Database Configuration

**Database**: umig_app_db
**User**: umig_app_user
**Password**: 123456 (development only)
**Port**: 5432 (mapped to host)

## Initialization Process

```
1. Container starts
   ↓
2. init-db.sh executes (first run only)
   ↓
3. Database and user created
   ↓
4. Liquibase migrations apply
   ↓
5. Database ready for connections
```

## Manual Operations

```bash
# Connect to database
psql -U umig_app_user -d umig_app_db

# View database logs
npm run logs:postgres
podman logs umig_postgres

# Reset database (WARNING: erases all data)
npm run restart:erase

# Database backup
cd infrastructure/backup
./backup-databases.sh
```

## Container Management

```bash
# Start container
npm start

# Stop container
npm stop

# Restart with clean database
npm run restart:erase

# View container status
podman ps | grep postgres
```

## Data Persistence

- **Volume**: `umig_postgres_data` (Podman volume)
- **Persistence**: Data survives container restarts
- **Reset**: `npm run restart:erase` deletes volume and recreates

## Configuration Files

- **podman-compose.yml** - Container orchestration
- **.env** - Database credentials
- **/liquibase/** - Database schema migrations
- **init-db.sh** - This initialization script

## Related Commands

```bash
# System health check
npm run health:check

# Run Liquibase migrations manually
cd liquibase
liquibase update

# Generate test data
npm run generate-data
npm run generate-data:erase  # With clean database
```

## Troubleshooting

```bash
# Connection refused
podman ps -a                 # Check container status
npm run health:check         # Verify connectivity

# Permission errors
# Check .env credentials match init-db.sh

# Migration failures
npm run logs:postgres        # View error messages
```

## Integration

- **Confluence**: Connects via JDBC driver
- **Liquibase**: Automatic schema versioning
- **Jest Tests**: Test database connections
- **Groovy Tests**: JDBC driver integration

---

_Last Updated: 2025-10-06_
