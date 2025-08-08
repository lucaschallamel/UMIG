# US-032 Confluence 9.2.7 Upgrade - Execution Guide

## Status: Ready for Execution

All preparatory work has been completed. The upgrade infrastructure is in place and ready for deployment.

## ✅ Completed Preparations

### 1. Infrastructure Analysis
- Analyzed current setup: Confluence 8.5.6, PostgreSQL 14, Podman containers
- Identified upgrade path: Stream A (Container image replacement)
- Confirmed data preservation strategy via named volumes

### 2. Backup System Created
**Location**: `/local-dev-setup/scripts/backup/`
- `backup-all.sh` - Master backup orchestration
- `backup-volumes.sh` - Podman volume backups
- `backup-databases.sh` - PostgreSQL backups
- `restore-*.sh` - Restoration scripts
- `verify-backup.sh` - Integrity verification
- Full SHA256 checksums and error handling

### 3. Upgrade Infrastructure
**Location**: `/local-dev-setup/`
- Updated `confluence/Containerfile` to Confluence 9.2.7
- Created `scripts/upgrade-confluence.sh` - Automated upgrade script
- Added `confluence/UPGRADE-NOTES-9.2.7.md` - Migration documentation

### 4. Test Suite Deployed
**Location**: `/local-dev-setup/tests/upgrade-validation/`
- `test-container-health.sh` - Container validation
- `test-database-connectivity.sh` - Database testing
- `test-api-endpoints.sh` - API validation
- `test-scriptrunner.sh` - ScriptRunner verification
- `run-all-tests.sh` - Master test runner

## 🚀 Ready to Execute

### Quick Start Commands

```bash
# 1. Navigate to local-dev-setup
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup

# 2. Run the upgrade (includes automatic backup)
./scripts/upgrade-confluence.sh

# 3. After upgrade completes, run validation tests
./tests/upgrade-validation/run-all-tests.sh
```

### Manual Step-by-Step Execution

If you prefer manual control:

```bash
# Step 1: Create backup
cd scripts/backup
./backup-all.sh

# Step 2: Build new image
cd ../..
podman-compose build --no-cache confluence

# Step 3: Deploy new container
podman-compose stop confluence
podman-compose rm -f confluence
podman-compose up -d confluence

# Step 4: Wait for startup (5 minutes)
# Monitor: podman logs -f umig_confluence

# Step 5: Run tests
cd tests/upgrade-validation
./run-all-tests.sh

# Step 6: Upgrade ScriptRunner via UI
# Navigate to: http://localhost:8090
# Go to: Manage Apps → Find new apps → Search "ScriptRunner"
# Upgrade to version 9.21.0
```

## 📋 Post-Upgrade Checklist

- [ ] Confluence accessible at http://localhost:8090
- [ ] Container health check passing
- [ ] Database connections working
- [ ] ScriptRunner upgraded to 9.21.0
- [ ] UMIG REST APIs responding
- [ ] Integration tests passing
- [ ] Document any issues encountered

## 🔄 Rollback Plan

If issues occur:

```bash
# Quick rollback using script
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup
./scripts/upgrade-confluence.sh rollback

# OR manual rollback
podman-compose stop confluence
podman tag localhost/umig-confluence:8.5.6-backup localhost/umig-confluence:latest
sed -i 's/confluence:9.2.7/confluence-server:8.5.6-jdk17/' confluence/Containerfile
podman-compose up -d confluence

# OR restore from backup
cd scripts/backup
./restore-all.sh [backup-timestamp]
```

## 📊 Success Criteria

1. ✅ Confluence 9.2.7 running successfully
2. ✅ All data preserved (users, spaces, content)
3. ✅ ScriptRunner 9.21.0 installed and functional
4. ✅ All UMIG APIs operational
5. ✅ Integration tests passing
6. ✅ No data loss or corruption

## 🎯 Next Actions

**You are now ready to execute the upgrade!**

1. Run `./scripts/upgrade-confluence.sh` to start
2. Monitor the output and logs
3. Run validation tests after completion
4. Upgrade ScriptRunner via UI
5. Document results in sprint review

## 📝 Notes

- Estimated execution time: 15-30 minutes
- Backup creation: 5 minutes
- Container upgrade: 5-10 minutes
- ScriptRunner upgrade: 5 minutes
- Testing: 5 minutes

All GENDEV agents have successfully prepared the infrastructure. The upgrade is ready for execution with comprehensive safety measures in place.