# UMIG Infrastructure Upgrade Scripts

**Last Updated**: August 8, 2025  
**Purpose**: Automated platform upgrade procedures  
**Current Platform**: Confluence 9.2.7 + ScriptRunner 9.21.0

## Overview

This directory contains scripts for upgrading the UMIG platform components, including Confluence and ScriptRunner upgrades. These scripts were successfully used for the US-032 Infrastructure Modernization completed on August 8, 2025.

## Upgrade Scripts

### upgrade-confluence.sh

Automated Confluence upgrade script that handles the complete upgrade process with zero-downtime deployment.

**Features**:

- Automated backup before upgrade
- Container image updates
- Configuration preservation
- Health check validation
- Rollback capability

**Usage**:

```bash
# From infrastructure/upgrade directory
./upgrade-confluence.sh
```

## Upgrade Process

### Pre-Upgrade Checklist

1. **Backup Current State**:

   ```bash
   ../backup/backup-all.sh
   ```

2. **Verify Current Version**:

   ```bash
   podman exec confluence cat /opt/atlassian/confluence/confluence/WEB-INF/classes/confluence-init.properties
   ```

3. **Check System Health**:

   ```bash
   ../verify-provisioning.sh
   ```

### Upgrade Execution

1. **Run Upgrade Script**:

   ```bash
   ./upgrade-confluence.sh
   ```

2. **Monitor Progress**:
   - Script provides real-time status updates
   - Automatic health checks at each stage
   - Rollback triggered on any failure

3. **Post-Upgrade Validation**:

   ```bash
   ../verify-provisioning.sh
   ```

## Successful US-032 Upgrade

The infrastructure modernization completed on August 8, 2025 achieved:

### Platform Updates

- **Confluence**: 8.5.6 → 9.2.7 (Latest LTS)
- **ScriptRunner**: → 9.21.0 (Latest compatible)
- **Service Interruption**: <5 minutes
- **Data Loss**: Zero

### Validation Results

- ✅ All containers operational
- ✅ Database connectivity verified
- ✅ API endpoints functional (25+)
- ✅ Admin GUI operational (8 modules)
- ✅ ScriptRunner console accessible
- ✅ Email service working
- ✅ Security configuration maintained
- ✅ No performance regression

## Rollback Procedures

If issues occur during upgrade:

1. **Automatic Rollback**:
   - Script detects failures and initiates rollback
   - Previous container images restored
   - Configuration reverted

2. **Manual Rollback**:

   ```bash
   # Stop current containers
   podman-compose down
   
   # Restore from backup
   ../backup/restore-volumes.sh
   ../backup/restore-databases.sh
   
   # Start with previous versions
   podman-compose up -d
   ```

## Configuration Files

### Container Versions

Managed in `podman-compose.yml`:

```yaml
confluence:
  image: atlassian/confluence:9.2.7
  
postgres:
  image: postgres:14-alpine
```

### ScriptRunner Configuration

Updated via Confluence admin interface post-upgrade:

- Version: 9.21.0
- License: Maintained from previous installation
- Scripts: Automatically migrated

## Best Practices

1. **Always Backup First**: Use enterprise backup system before any upgrade
2. **Test in Staging**: Validate upgrade process in non-production first
3. **Schedule Downtime**: Plan for 30-minute maintenance window
4. **Monitor Logs**: Watch container logs during upgrade
5. **Validate Thoroughly**: Run complete validation suite post-upgrade

## Troubleshooting

### Common Issues

**Container Start Failures**:

- Check port availability: `netstat -an | grep 8090`
- Verify volume mounts: `podman volume ls`
- Review logs: `podman logs confluence`

**Database Connection Issues**:

- Verify PostgreSQL is running: `podman ps`
- Check network connectivity: `podman network ls`
- Test connection: `psql -h localhost -U confluence`

**ScriptRunner Compatibility**:

- Ensure version compatibility with Confluence
- Clear ScriptRunner cache if needed
- Reinstall from Marketplace if issues persist

## Related Documentation

- [Infrastructure README](../README.md) - Infrastructure overview
- [Backup Procedures](../backup/README.md) - Backup and restore operations
- [Operations Guide](../../../docs/operations/README.md) - Complete operational procedures
- [US-032 Archive](../../../docs/archived/us-032-confluence-upgrade/) - Detailed upgrade documentation

## Future Upgrades

### Planned Improvements

- Automated version detection
- Blue-green deployment support
- Enhanced health checks
- Performance benchmarking
- Automated rollback testing

### Version Roadmap

- Monitor Confluence LTS releases
- Track ScriptRunner compatibility
- PostgreSQL major version upgrades
- Security patch automation

---

**Note**: These upgrade scripts modify production infrastructure. Always backup before execution and follow change management procedures.