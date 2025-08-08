# UMIG Project Reorganization Guide
## US-032 Infrastructure Consolidation

### Overview

As part of US-032 (Confluence upgrade to 9.2.7), UMIG underwent a comprehensive file reorganization to improve maintainability and consolidate infrastructure tooling. This guide documents the changes and provides migration paths for team members.

### Key Changes

#### 1. Infrastructure Consolidation
- **Previous**: Infrastructure scripts scattered across multiple locations
- **Current**: All infrastructure tools consolidated under `local-dev-setup/infrastructure/`
- **Impact**: Centralized operations, easier maintenance

#### 2. Test Organization
- **Previous**: Tests scattered with inconsistent organization
- **Current**: Structured test hierarchy under `src/groovy/umig/tests/`
- **New**: Dedicated `upgrade/` directory for US-032 validation tests

#### 3. Documentation Archival
- **New**: `docs/archived/us-032-confluence-upgrade/` for upgrade documentation
- **Purpose**: Historical record of upgrade process and outcomes

### Directory Mapping

| Old Location | New Location | Purpose |
|-------------|--------------|---------|
| `infrastructure/backup/` | `local-dev-setup/infrastructure/backup/` | Enterprise backup system |
| `infrastructure/upgrade/` | `local-dev-setup/infrastructure/upgrade/` | Upgrade automation |
| `scripts/maintenance/` | `local-dev-setup/infrastructure/` | Maintenance operations |
| `scripts/backup/` | `local-dev-setup/infrastructure/backup/` | Backup operations |
| `src/groovy/umig/tests/system/upgrade-validation/` | `src/groovy/umig/tests/upgrade/` | Upgrade-specific tests |

### Command Updates

#### Infrastructure Operations
```bash
# OLD (no longer valid)
./scripts/maintenance/validate-system.sh
./scripts/backup/backup-system.sh
./infrastructure/backup/backup-all.sh

# NEW (current paths)
./local-dev-setup/infrastructure/verify-provisioning.sh
./local-dev-setup/infrastructure/backup/backup-all.sh
./local-dev-setup/infrastructure/upgrade/upgrade-confluence.sh
```

#### Test Execution
```bash
# OLD (scattered locations)
./src/groovy/umig/tests/system/upgrade-validation/run-all-tests.sh

# NEW (organized structure)
./src/groovy/umig/tests/upgrade/run-all-tests.sh
./src/groovy/umig/tests/upgrade/test-container-health.sh
./src/groovy/umig/tests/upgrade/test-database-connectivity.sh
./src/groovy/umig/tests/upgrade/test-api-endpoints.sh
./src/groovy/umig/tests/upgrade/test-scriptrunner.sh
```

### Benefits of Reorganization

1. **Centralized Infrastructure**: All ops tools in one location
2. **Consistent Test Organization**: Clear hierarchy and purpose
3. **Historical Documentation**: Proper archival of upgrade process
4. **Simplified Maintenance**: Easier to find and update scripts
5. **Better Developer Experience**: Logical organization reduces confusion

### Migration Checklist

- [ ] Update local bookmarks and shortcuts
- [ ] Review any custom scripts referencing old paths
- [ ] Update CI/CD pipelines if they reference old paths
- [ ] Verify IDE configurations point to new test locations
- [ ] Update any documentation references to old structure

### Quick Reference Card

```bash
# Infrastructure Operations
cd local-dev-setup/infrastructure/
./verify-provisioning.sh              # System health
./backup/backup-all.sh                # Enterprise backup
./upgrade/upgrade-confluence.sh       # Confluence upgrade

# Test Execution
cd src/groovy/umig/tests/
./run-integration-tests.sh           # Integration tests
./run-unit-tests.sh                  # Unit tests
./upgrade/run-all-tests.sh           # Upgrade validation
```

### Related Documentation

- **US-032 Complete**: `docs/archived/us-032-confluence-upgrade/US-032-COMPLETE.md`
- **Sprint 4 Execution Plan**: `docs/roadmap/sprint4/US032-Execution-Plan-Report.md`
- **Infrastructure Operations**: `local-dev-setup/infrastructure/backup/README.md`
- **Test Framework**: `src/groovy/umig/tests/upgrade/README.md`
- **Solution Architecture**: `docs/solution-architecture.md`

### Implementation Timeline

- **Completed**: Directory reorganization, path updates, documentation consolidation
- **In Progress**: Documentation updates to reflect new structure
- **Next Steps**: Team training on new structure, CI/CD pipeline updates

### Support

For questions about the reorganization or assistance with migration:
1. Review this guide and related documentation
2. Check the updated CLAUDE.md for correct command paths
3. Refer to infrastructure README files for detailed operations

---

**Last Updated**: August 8, 2025  
**US-032 Status**: COMPLETE  
**Reorganization Status**: IMPLEMENTED