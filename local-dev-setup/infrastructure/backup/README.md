# UMIG Confluence Upgrade - Backup & Restore System

Comprehensive backup and restore solution for the US-032 Confluence upgrade project.

## ⚠️ CRITICAL: Pre-Upgrade Verification Required

**This system was created after discovering silent backup failures during the Confluence 8.5.6 → 9.2.7 upgrade.**

### Why Verification is Essential

During the Confluence upgrade, backup creation failed silently due to:

1. Podman remote mode limitations (`podman volume export` not supported)
2. Incorrect volume names (missing `local-dev-setup_` prefix)
3. Missing directory creation in backup scripts
4. No verification of backup file sizes

**Result**: Empty backup files (0 bytes) left us without pre-upgrade protection.

### Critical Lessons Learned

- **Never trust exit codes alone** - always verify file sizes
- **Test backup scripts manually** before critical operations
- **Volume names include prefixes** - verify with `podman volume ls`
- **Silent failures are common** - implement verification checks

## 🔍 Mandatory Pre-Upgrade Verification

### Before ANY Upgrade

Follow this verification checklist to prevent backup failures:

1. **Test Backup Scripts Manually**

   ```bash
   cd /path/to/local-dev-setup/infrastructure/backup
   ./backup-volumes.sh
   # CHECK: Files should be > 0 bytes
   ls -lah ../../backups/*/volumes/
   ```

2. **Verify Volume Names**

   ```bash
   # List actual volume names
   podman volume ls | grep -E "confluence|postgres"

   # Should show:
   # local-dev-setup_confluence_data
   # local-dev-setup_postgres_data
   ```

3. **Check Backup Sizes**

   ```bash
   # After backup, verify non-empty files
   LATEST_BACKUP=$(ls -t ../../local-dev-setup/backups/ | head -1)
   du -sh ../../local-dev-setup/backups/$LATEST_BACKUP/*

   # Expected sizes (approximate):
   # - confluence_data.tar.gz: 500-600MB
   # - postgres_data.tar.gz: 300-400MB
   ```

### Automated Verification Script

Create and run this verification script before upgrades:

```bash
#!/bin/bash
# backup-verify.sh

echo "🔍 Verifying backup capability..."

# Test volume backup
cd /path/to/local-dev-setup/infrastructure/backup
./backup-volumes.sh

# Check results
LATEST=$(ls -t ../../local-dev-setup/backups/ | head -1)
BACKUP_DIR="../../local-dev-setup/backups/$LATEST"

# Verify files exist and are not empty
for file in "$BACKUP_DIR"/volumes/*.tar.gz; do
    if [ -f "$file" ]; then
        SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        if [ "$SIZE" -eq 0 ]; then
            echo "❌ CRITICAL: Empty backup file: $file"
            exit 1
        else
            echo "✅ Valid backup: $(basename $file) ($(du -h $file | cut -f1))"
        fi
    fi
done

echo "✅ Backup verification passed"
```

### Known Issues and Solutions

#### Issue 1: Podman Volume Export Fails

**Error**: `cannot use command 'podman volume export' with the remote podman client`

**Solution**: Use container-based backup approach (already implemented):

```bash
podman run --rm \
  --volume "volume_name:/data:ro" \
  --volume "backup_dir:/backup" \
  alpine:latest \
  tar -czf /backup/volume.tar.gz /data
```

#### Issue 2: Empty Backup Files

**Symptom**: Backup files are 0 bytes

**Causes**:

- Volume names incorrect
- Backup directory not created
- Podman command failed silently

**Prevention**:

- Always verify backup file sizes
- Use the verification script above

#### Issue 3: Wrong Volume Names

**Error**: `Volume 'confluence_data' does not exist`

**Solution**: Use correct prefixed names:

- ❌ `confluence_data`
- ✅ `local-dev-setup_confluence_data`

## Overview

This backup system provides enterprise-grade data protection for:

- **Podman Volumes**: `local-dev-setup_confluence_data` and `local-dev-setup_postgres_data`
- **PostgreSQL Databases**: `confluence` and `umig_app_db`
- **Container Configurations**: Complete system state preservation
- **Metadata**: System information and restore instructions

## Quick Start

### Create Complete Backup

```bash
# Navigate to backup directory
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup/infrastructure/backup/

# Run master backup script (recommended)
./backup-all.sh

# Backup will be created in: ../../backups/YYYYMMDD_HHMMSS/
```

### Verify Backup

```bash
# Verify backup integrity (replace with your timestamp)
./verify-backup.sh 20250808_143022

# Quick verification (faster, structure only)
./verify-backup.sh 20250808_143022 --quick
```

### Restore from Backup

```bash
# Complete system restore
./restore-all.sh 20250808_143022

# Restore specific components
./restore-volumes.sh 20250808_143022
./restore-databases.sh 20250808_143022

# Dry run (see what would be restored)
./restore-all.sh 20250808_143022 --dry-run
```

## Script Reference

### 1. backup-all.sh (Master Script)

**Purpose**: Orchestrates complete system backup

**Usage**: `./backup-all.sh`

**Features**:

- ✅ Complete system backup in one command
- ✅ Automatic container stopping/starting
- ✅ Comprehensive verification and logging
- ✅ Integrated cleanup of temporary files
- ✅ Detailed backup summary and metrics

**Output Structure**:

```
backups/YYYYMMDD_HHMMSS/
├── volumes/                    # Volume archives
├── databases/                  # Database dumps
├── schemas/                    # Schema-only backups
├── metadata/                   # Database statistics
├── container_configs/          # Container configurations
├── master_backup_info.txt      # Complete backup information
├── complete_manifest.sha256    # Integrity checksums
└── *.log                      # Detailed logs
```

### 2. backup-volumes.sh

**Purpose**: Backup Podman named volumes

**Usage**: `./backup-volumes.sh`

**Features**:

- ✅ Tar.gz compression for optimal storage
- ✅ Preserves file permissions and ownership
- ✅ Volume metadata export
- ✅ Integrity verification with checksums

### 3. backup-databases.sh

**Purpose**: Backup PostgreSQL databases

**Usage**: `./backup-databases.sh`

**Features**:

- ✅ Multiple backup formats (custom + SQL)
- ✅ Global settings backup (users, roles)
- ✅ Schema-only backups for reference
- ✅ Database statistics and metrics
- ✅ Connection validation before backup

### 4. restore-volumes.sh

**Purpose**: Restore Podman volumes from backup

**Usage**: `./restore-volumes.sh <timestamp> [options]`

**Options**:

- `--dry-run`: Preview restore actions
- `--force`: Overwrite existing volumes

**Safety Features**:

- ✅ Automatic container stopping
- ✅ Backup integrity verification
- ✅ Volume conflict detection
- ✅ Automatic container restart

### 5. restore-databases.sh

**Purpose**: Restore PostgreSQL databases from backup

**Usage**: `./restore-databases.sh <timestamp> [options]`

**Options**:

- `--dry-run`: Preview restore actions
- `--force`: Overwrite existing databases
- `--format custom|sql`: Choose restore format

**Advanced Features**:

- ✅ Connection termination handling
- ✅ Multiple restore format support
- ✅ Application stopping/starting
- ✅ Post-restore statistics

### 6. verify-backup.sh

**Purpose**: Comprehensive backup verification

**Usage**: `./verify-backup.sh <timestamp> [options]`

**Options**:

- `--verbose`: Detailed verification output
- `--quick`: Fast verification (structure only)

**Verification Checks**:

- ✅ Directory structure validation
- ✅ File existence and size checks
- ✅ SHA256 integrity verification
- ✅ Backup completeness assessment
- ✅ Age and metadata validation

## Backup Strategy

### Before Confluence Upgrade

**MANDATORY**: Follow the complete verification process before any upgrade:

```bash
# 1. Pre-flight checks - verify containers are running
podman ps -a | grep -E "confluence|postgres"  # Verify running
podman volume ls | grep local-dev-setup       # Check volumes exist

# 2. Create comprehensive backup
./backup-all.sh

# 3. CRITICAL: Verify backup sizes (NOT just exit codes)
LATEST=$(ls -t ../../local-dev-setup/backups/ | head -1)
ls -lah ../../local-dev-setup/backups/$LATEST/volumes/
# ALL files should be > 0 bytes

# 4. Verify backup integrity
./verify-backup.sh $LATEST

# 5. Test restore process (dry run)
./restore-all.sh $LATEST --dry-run

# 6. Document backup location
echo "Backup created: $LATEST"

# 7. ONLY proceed with upgrade if backups are valid
```

### During Upgrade Issues

```bash
# Quick rollback if upgrade fails
./restore-all.sh YYYYMMDD_HHMMSS --force

# Or restore specific components
./restore-databases.sh YYYYMMDD_HHMMSS --force
```

### After Successful Upgrade

```bash
# Verify new system and create post-upgrade backup
./backup-all.sh
./verify-backup.sh NEW_TIMESTAMP
```

## Recovery from Failed Backup

If you discover empty backups AFTER an upgrade:

1. **DO NOT PANIC** - If upgrade used Stream A (volume preservation), data is intact
2. **Create backup immediately** from current state
3. **Document current versions** for future reference
4. **Test restoration** in a separate environment

## Testing Backup Restoration

```bash
# Test restore in isolated environment
cd infrastructure/backup

# Create test volumes
podman volume create test_confluence_data
podman volume create test_postgres_data

# Restore to test volumes
./restore-volumes.sh --target test_confluence_data --source backup_timestamp
./restore-databases.sh --target test_postgres --source backup_timestamp

# Verify restoration
podman volume inspect test_confluence_data
```

## Best Practices for Backup Operations

1. **Always test backup/restore** before production upgrades
2. **Verify file sizes** - never trust exit codes alone
3. **Keep multiple backups** - rotate but keep at least 3 versions
4. **Document volume names** as they may include prefixes
5. **Use the upgrade script** which now includes verification

## Storage Requirements

### Estimated Backup Sizes

- **Confluence Data**: ~2-5GB (depends on content)
- **PostgreSQL Data**: ~500MB-2GB
- **UMIG App Database**: ~50-200MB
- **Metadata/Configs**: ~10MB
- **Total**: ~3-7GB per backup

### Disk Space Planning

- Maintain at least 3x backup size as free space
- Consider compression ratios (30-50% reduction)
- Plan for multiple backup retention

## Security Considerations

### Access Control

- Scripts require filesystem read/write access
- Podman container management permissions needed
- Database credentials embedded (review security)

### Backup Protection

- Backups contain sensitive data
- Store in secure, access-controlled location
- Consider encryption for off-site storage
- Regular integrity verification

## Troubleshooting

### Common Issues

#### "Container not running"

```bash
# Start containers first
cd ../../
npm start

# Then run backup
cd local-dev-setup/infrastructure/backup/
./backup-all.sh
```

#### "Volume does not exist"

```bash
# Check volume status
podman volume ls

# Verify container names match configuration
podman ps --format "table {{.Names}}"
```

#### "Insufficient disk space"

```bash
# Check available space
df -h .

# Clean old backups if needed
ls -la ../../backups/
rm -rf ../../backups/OLD_TIMESTAMP
```

#### "Backup integrity failed"

```bash
# Re-run verification with verbose output
./verify-backup.sh TIMESTAMP --verbose

# Check log files for specific errors
cat ../../backups/TIMESTAMP/*.log
```

### Recovery Procedures

#### Partial Restore Failure

```bash
# Restore individual components
./restore-volumes.sh TIMESTAMP --force
./restore-databases.sh TIMESTAMP --force --format sql
```

#### Corrupted Backup

```bash
# Try alternative backup format
./restore-databases.sh TIMESTAMP --format sql

# Or use schema + manual data restoration
cat ../../backups/TIMESTAMP/schemas/*.sql
```

## Monitoring and Maintenance

### Regular Tasks

1. **Weekly**: Verify latest backup integrity
2. **Monthly**: Test complete restore process
3. **Quarterly**: Review and clean old backups
4. **Before upgrades**: Always create fresh backup

### Automation Integration

Scripts support integration with:

- Cron jobs for scheduled backups
- CI/CD pipelines for deployment protection
- Monitoring systems for backup verification
- Log aggregation for centralized monitoring

## File Locations

```
UMIG/
├── local-dev-setup/
│   ├── backups/               # All backup data
│   │   └── YYYYMMDD_HHMMSS/  # Timestamped backups
│   └── podman-compose.yml    # Container definitions
└── local-dev-setup/
    ├── infrastructure/
    │   └── backup/            # Backup scripts
        ├── backup-all.sh      # Master backup
        ├── backup-volumes.sh  # Volume backup
        ├── backup-databases.sh # Database backup
        ├── restore-volumes.sh # Volume restore
        ├── restore-databases.sh # Database restore
        ├── verify-backup.sh   # Backup verification
        └── README.md          # This documentation
```

## Support and Updates

### Version Information

- **Script Version**: 2.0
- **Created**: 2025-08-08
- **Author**: gendev-deployment-ops-manager
- **Updated**: 2025-08-08 (Integrated critical verification procedures)
- **Tested**: Confluence 8.5.6 → 9.2.7 upgrade, PostgreSQL 14-alpine, Podman 5.x

### Getting Help

1. Check log files in backup directory
2. Run verification with `--verbose` flag
3. Test with `--dry-run` before actual operations
4. Review container and volume status with Podman commands

---

**⚠️ Important**: Always test restore procedures in a non-production environment before relying on them for critical operations.

**🔍 Critical Learning**: This documentation was enhanced after discovering 0-byte backup files during the Confluence 9.2.7 upgrade. Always verify backup file sizes before proceeding with upgrades.

**✅ Ready**: The backup system with enhanced verification is now ready for reliable upgrade operations.
