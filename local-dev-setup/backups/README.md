# Database Backups

Purpose: Automated backup archives of UMIG PostgreSQL database and Podman volumes

## Structure

```
backups/
├── YYYYMMDD_HHMMSS/         # Timestamped backup directories
│   ├── databases/           # PostgreSQL database dumps
│   ├── volumes/             # Podman volume archives
│   └── checksums.sha256     # SHA256 integrity verification
└── README.md
```

## Backup Contents

### databases/

- **Format**: PostgreSQL custom format (.dump)
- **Compression**: Built-in PostgreSQL compression
- **Content**: Complete database schema and data
- **Restore**: Use `pg_restore` command

### volumes/

- **Format**: Tar archives (.tar)
- **Compression**: Optional gzip (.tar.gz)
- **Content**: Podman volume data (Confluence home, attachments)
- **Restore**: Extract to volume location

### checksums.sha256

- **Purpose**: Integrity verification
- **Format**: SHA256 checksums for all backup files
- **Usage**: Verify backup integrity before restore

## Backup Creation

```bash
# Manual backup
cd infrastructure/backup
./backup-all.sh

# Automated via npm
npm run backup:create

# Backup only databases
./backup-databases.sh

# Backup only volumes
./backup-volumes.sh
```

## Backup Verification

```bash
# Verify backup integrity
cd infrastructure/backup
./verify-backup.sh /path/to/backup/YYYYMMDD_HHMMSS

# Manual verification
cd backups/YYYYMMDD_HHMMSS
sha256sum -c checksums.sha256
```

## Restore Operations

```bash
# Restore complete system
cd infrastructure/backup
./restore-databases.sh /path/to/backup/YYYYMMDD_HHMMSS
./restore-volumes.sh /path/to/backup/YYYYMMDD_HHMMSS

# Restore specific database
pg_restore -U umig_app_user -d umig_app_db /path/to/backup.dump
```

## Backup Schedule

- **Development**: Manual backups before major changes
- **Production**: Automated daily backups (recommended)
- **Retention**: Keep 7 daily, 4 weekly, 12 monthly (recommended)

## Backup Storage

- **Local**: `/local-dev-setup/backups/`
- **Size**: Varies (typically 10-100MB per backup)
- **Cleanup**: Manual deletion of old backups recommended

## Disaster Recovery

### RTO (Recovery Time Objective)

- Database restore: ~5 minutes
- Volume restore: ~10 minutes
- Total system recovery: ~15 minutes

### RPO (Recovery Point Objective)

- Frequency determines data loss window
- Daily backups: Up to 24 hours data loss
- Hourly backups: Up to 1 hour data loss

## Related Scripts

- `/infrastructure/backup/backup-all.sh` - Complete backup orchestrator
- `/infrastructure/backup/backup-databases.sh` - Database backup only
- `/infrastructure/backup/backup-volumes.sh` - Volume backup only
- `/infrastructure/backup/restore-databases.sh` - Database restoration
- `/infrastructure/backup/restore-volumes.sh` - Volume restoration
- `/infrastructure/backup/verify-backup.sh` - Integrity verification

## Best Practices

1. **Before major changes**: Create backup before schema migrations or data operations
2. **Regular testing**: Periodically test restore procedures
3. **Offsite storage**: Copy critical backups to external storage
4. **Verify integrity**: Always verify checksums before restore
5. **Document restore**: Keep restore procedure documentation updated

## Troubleshooting

```bash
# Backup failed
npm run logs:postgres        # Check database connectivity
podman ps -a                 # Verify containers running

# Restore failed
# Verify backup integrity first
sha256sum -c checksums.sha256

# Check permissions
ls -la backups/YYYYMMDD_HHMMSS/

# Insufficient space
df -h                        # Check available disk space
du -sh backups/*             # Check backup sizes
```

---

_Last Updated: 2025-10-06_
