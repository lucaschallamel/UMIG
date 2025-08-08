# UMIG Infrastructure Operations

Comprehensive infrastructure management tools for UMIG Confluence environment operations, maintenance, and disaster recovery.

## Directory Structure

```
infrastructure/
├── backup/                 # Enterprise backup and restore system
│   ├── backup-all.sh      # Complete system backup orchestrator
│   ├── backup-databases.sh # PostgreSQL database backup
│   ├── backup-volumes.sh   # Podman volume backup
│   ├── restore-databases.sh # Database restoration with verification
│   ├── restore-volumes.sh  # Volume restoration with integrity checks
│   ├── verify-backup.sh    # SHA256 backup verification
│   └── README.md          # Detailed backup system documentation
└── upgrade/               # Platform upgrade automation
    └── upgrade-confluence.sh # Confluence upgrade orchestrator
```

## Quick Start

### Daily Operations

```bash
# Complete system backup (recommended daily)
./backup/backup-all.sh

# Verify backup integrity
./backup/verify-backup.sh

# Check system health
podman ps -a
podman volume ls
```

### Upgrade Operations

```bash
# Upgrade Confluence (includes backup)
./upgrade/upgrade-confluence.sh

# Manual upgrade steps if needed
cd /path/to/local-dev-setup
npm stop
# Update Containerfile with new version
podman-compose build
podman-compose up -d
```

## Backup System

### ⚠️ Critical Backup Verification

**MANDATORY before ANY upgrade**: The backup system was enhanced after silent failures during Confluence 8.5.6 → 9.2.7 upgrade left us with 0-byte backup files.

**Quick Verification Commands**:
```bash
# 1. Test backup creation
./backup/backup-all.sh

# 2. CRITICAL: Verify file sizes (not just exit codes)
LATEST=$(ls -t ../local-dev-setup/backups/ | head -1)
ls -lah ../local-dev-setup/backups/$LATEST/volumes/
# Files should be 500-600MB (confluence) and 300-400MB (postgres)

# 3. Only proceed if backups are non-empty
```

**See [backup/README.md](backup/README.md) for complete verification checklist and troubleshooting.**

### Overview

Enterprise-grade backup system with SHA256 integrity verification, automated scheduling support, and comprehensive restore capabilities.

### Features

- **Complete System Backup**: Orchestrated backup of all components
- **Incremental Support**: Efficient backup strategies for large datasets
- **Integrity Verification**: SHA256 checksums for all backups
- **Automated Rotation**: Configurable retention policies
- **Disaster Recovery**: Full system restoration capabilities

### Backup Components

#### 1. Database Backup (`backup-databases.sh`)
- PostgreSQL dumps with compression
- Transactional consistency guaranteed
- Separate backups for each database
- Point-in-time recovery support

#### 2. Volume Backup (`backup-volumes.sh`)
- Confluence data volume preservation
- File system snapshots
- Metadata preservation
- Permission retention

#### 3. Verification System (`verify-backup.sh`)
- SHA256 checksum validation
- Backup completeness verification
- Restoration readiness assessment
- Automated health checks

### Backup Schedule Recommendations

| Component | Frequency | Retention | Priority |
|-----------|-----------|-----------|----------|
| Database | Daily | 30 days | Critical |
| Volumes | Weekly | 4 weeks | High |
| Full System | Weekly | 2 months | Critical |
| Archives | Monthly | 1 year | Medium |

### Restoration Process

#### Quick Restore
```bash
# Restore latest backup
./backup/restore-databases.sh latest
./backup/restore-volumes.sh latest
```

#### Point-in-Time Recovery
```bash
# Restore from specific backup
./backup/restore-databases.sh 2025-08-08_10-30
./backup/restore-volumes.sh 2025-08-08_10-30
```

## Upgrade System

### Confluence Upgrade Process

The `upgrade-confluence.sh` script provides automated Confluence upgrades with:

- Pre-flight environment validation
- Automatic backup creation
- Container-based upgrade (Stream A approach)
- Health check verification
- Rollback capabilities

### Upgrade Workflow

1. **Pre-Upgrade Phase**
   - Environment validation
   - Dependency verification
   - Full system backup
   - Risk assessment

2. **Upgrade Execution**
   - Service shutdown
   - Container image update
   - Volume preservation
   - Configuration migration

3. **Post-Upgrade Phase**
   - Service startup
   - Health verification
   - Smoke testing
   - Performance validation

### Manual Upgrade Steps

If automated upgrade fails:

```bash
# 1. Stop services
cd /path/to/local-dev-setup
npm stop

# 2. Update Confluence version
vim confluence/Containerfile
# Change: FROM atlassian/confluence:OLD_VERSION
# To: FROM atlassian/confluence:NEW_VERSION

# 3. Rebuild and start
podman-compose build
podman-compose up -d

# 4. Install ScriptRunner manually via UI
# Navigate to Confluence Admin > Manage Apps > Find new apps
```

## Disaster Recovery

### Recovery Time Objectives (RTO)

| Scenario | Target RTO | Actual RTO | Recovery Method |
|----------|------------|------------|-----------------|
| Service Crash | 5 min | 2 min | Automatic restart |
| Data Corruption | 30 min | 15 min | Volume restore |
| Complete Failure | 2 hours | 1 hour | Full restore |
| Platform Upgrade Failure | 1 hour | 30 min | Rollback procedure |

### Recovery Procedures

#### Level 1: Service Recovery
```bash
# Quick service restart
podman-compose restart confluence

# With verification
podman ps -a
curl -f http://localhost:8090/status || echo "Service not responding"
```

#### Level 2: Data Recovery
```bash
# Stop services
npm stop

# Restore data
./backup/restore-volumes.sh latest

# Restart services
npm start
```

#### Level 3: Complete Recovery
```bash
# Full system restore
./backup/restore-databases.sh latest
./backup/restore-volumes.sh latest
npm start
```

## Monitoring and Health Checks

### Daily Health Checks
```bash
# Service status
podman ps -a | grep -E "confluence|postgres|mailhog"

# Volume status
podman volume ls | grep -E "confluence_data|postgres_data"

# Database connectivity
PGPASSWORD=123456 psql -h localhost -U umig_app_user -d umig_app_db -c "SELECT 1"

# Confluence health
curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/status
```

### Performance Monitoring
```bash
# Resource usage
podman stats --no-stream

# Disk usage
df -h | grep -E "podman|containers"

# Database size
PGPASSWORD=123456 psql -h localhost -U umig_app_user -d umig_app_db -c "
  SELECT pg_database_size('umig_app_db')/1024/1024 as size_mb;
"
```

## Security Considerations

### Access Control
- All scripts require appropriate file system permissions
- Database operations use environment variables for credentials
- Backup encryption recommended for sensitive data

### Credential Management
```bash
# Never commit credentials
# Use environment variables
export POSTGRES_PASSWORD="secure_password"
export CONFLUENCE_LICENSE_KEY="your_license_key"
```

### Backup Security
- Store backups in secure location
- Implement encryption for sensitive backups
- Regular verification of backup integrity
- Access logging for audit trails

## Troubleshooting

### Common Issues

#### Backup Failures
```bash
# Check disk space
df -h /path/to/backups

# Verify permissions
ls -la ./backup/

# Test database connectivity
PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U umig_user -d umig_db -c "SELECT 1"
```

#### Restoration Issues
```bash
# Verify backup integrity
./backup/verify-backup.sh 2025-08-08_10-30

# Check service status
podman ps -a

# Review logs
podman logs umig_confluence
podman logs umig_postgres
```

#### Upgrade Problems
```bash
# Check current version
podman images | grep confluence

# Verify volume mounts
podman volume inspect confluence_data

# Review upgrade logs
tail -f /tmp/confluence-upgrade-*.log
```

## Best Practices

1. **Regular Backups**: Implement automated daily backups
2. **Verification**: Always verify backups after creation
3. **Documentation**: Document all changes and procedures
4. **Testing**: Regularly test restoration procedures
5. **Monitoring**: Implement continuous health monitoring
6. **Security**: Keep credentials secure and rotate regularly
7. **Updates**: Stay current with security patches

## Support and Resources

### Internal Resources
- Main documentation: `/docs/solution-architecture.md`
- API documentation: `/docs/api/openapi.yaml`
- Development setup: `/local-dev-setup/README.md`

### External Resources
- [Confluence Administration](https://confluence.atlassian.com/doc/)
- [ScriptRunner Documentation](https://docs.adaptavist.com/sr4conf/)
- [PostgreSQL Backup Guide](https://www.postgresql.org/docs/14/backup.html)
- [Podman Documentation](https://docs.podman.io/)

## Version History

- **v2.0** (2025-08-08): Post-Confluence 9.2.7 upgrade
  - Enhanced backup system with SHA256 verification
  - Automated upgrade procedures
  - Comprehensive disaster recovery
  
- **v1.0** (2025-08-01): Initial infrastructure setup
  - Basic backup scripts
  - Manual procedures

## Contact

For infrastructure issues or questions:
- Check runbooks in this directory first
- Review logs in `/tmp/` and container logs
- Escalate to infrastructure team if needed

---

*Last Updated: August 8, 2025*  
*Confluence Version: 9.2.7*  
*ScriptRunner Version: 9.21.0*