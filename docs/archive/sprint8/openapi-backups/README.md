# OpenAPI Specification Backups

This directory contains historical backups of the OpenAPI specification created during Sprint 8 API documentation work.

## Purpose

- **Version Preservation**: Maintains snapshots of OpenAPI specs before major updates
- **Rollback Capability**: Enables restoration to previous versions if needed
- **Historical Reference**: Documents evolution of API specification over time

## Backup Naming Convention

Format: `openapi-v{version}-backup-{timestamp}.yaml`

Example: `openapi-v2.12.0-backup-20251008-053126.yaml`

- Version: 2.12.0
- Date: October 8, 2025
- Time: 05:31:26

## Current Backups

### openapi-v2.12.0-backup-20251008-053126.yaml

- **Size**: 507KB (16,204 lines)
- **Created**: October 8, 2025, 05:31:26
- **Purpose**: Pre-v2.13.0 update backup
- **Context**: Backup before adding GET /users/current endpoint and fixing UserRelationships paths
- **Related Documentation**:
  - `/docs/api/OPENAPI-UPDATE-SUMMARY-v2.13.0.md` - Changes made in v2.13.0
  - `/docs/archive/Sprint8_archive/API-Documentation-Comprehensive-Report-20251008.md` - Full analysis

## Restoration Process

To restore a backup:

```bash
# 1. Backup current version first
cp docs/api/openapi.yaml docs/api/openapi.yaml.backup-$(date +%Y%m%d-%H%M%S)

# 2. Restore desired version
cp docs/archive/sprint8/openapi-backups/openapi-v2.12.0-backup-20251008-053126.yaml docs/api/openapi.yaml

# 3. Validate restored specification
npm run validate:openapi
```

## Maintenance

- Backups are created automatically before major OpenAPI updates
- Keep backups for at least 2 major versions back
- Archive older backups if disk space becomes a concern
- Update this README when adding new backups

---

_Last Updated: October 8, 2025_
