# Confluence 9.2.7 Upgrade Notes

## Image Changes
- **FROM**: `atlassian/confluence-server:8.5.6-jdk17`
- **TO**: `atlassian/confluence:9.2.7`
- **Reason**: Atlassian consolidated image naming - "server" designation removed, JDK17 is default

## Compatibility Requirements
- **ScriptRunner**: Must upgrade to 9.21.0 (compatible with Confluence 9.2.x)
- **PostgreSQL**: Current 14-alpine is compatible
- **JDK**: 17 (included in base image)

## Breaking Changes to Monitor
1. REST API changes - some deprecated endpoints removed
2. Velocity template changes affecting custom macros
3. Database schema updates (handled automatically by Confluence)

## Post-Upgrade Tasks
1. Upgrade ScriptRunner to 9.21.0 via Marketplace
2. Verify all UMIG scripts still function
3. Test REST API endpoints
4. Validate custom macros rendering

## Rollback Plan
If issues occur:
1. Stop containers: `npm stop`
2. Restore from backup: `./scripts/backup/restore-all.sh [timestamp]`
3. Revert Containerfile to 8.5.6
4. Rebuild and restart: `npm start`