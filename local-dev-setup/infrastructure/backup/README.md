# UMIG Confluence Backup & Restore System

Enterprise-grade backup and restore solution with SHA256 integrity verification and comprehensive validation procedures.

## Structure

```
backup/
├── backup-all.sh                    # Master backup orchestrator
├── backup-databases.sh              # PostgreSQL database backup
├── backup-volumes.sh                # Podman volume backup
├── restore-databases.sh             # Database restoration
├── restore-volumes.sh               # Volume restoration
└── verify-backup.sh                 # Integrity verification
```

## Contents

- **Backup Scripts**: Complete system, database-specific, volume-specific backups
- **Restore Scripts**: Full system restoration, component-specific restoration, dry-run mode
- **Verification**: SHA256 checksums, size validation, structure verification
- **Critical Features**: Pre-upgrade verification mandatory, silent failure prevention, volume name validation

## Quick Operations

- Create backup: `./backup-all.sh`
- Verify backup: `./verify-backup.sh TIMESTAMP`
- Restore system: `./restore-all.sh TIMESTAMP`

## Critical Lessons

- Always verify file sizes (not just exit codes)
- Test backup scripts manually before critical operations
- Volume names include prefixes (local-dev-setup\_)
- Empty backup files (0 bytes) indicate silent failures

---

_Last Updated: 2025-10-01_
