# UMIG Deployment Package

**Version**: 1.0.0-uat.20251007.1135+9afc4b81
**Environment**: UAT
**Build Date**: Tuesday 7 October 2025 at 11:35 am
**Git Commit**: 9afc4b81

## Package Contents

This deployment package contains everything needed to deploy UMIG (Unified Migration Implementation Guide) to your UAT environment.

### 📁 Directory Structure

- **`umig/`** - Core ScriptRunner application files
  - Web components and admin GUI
  - API endpoints and business logic
  - Groovy services and repositories

- **`database/`** - Database deployment assets
  - Liquibase migration scripts
  - Database schema definitions
  - Setup and configuration scripts

- **`documentation/`** - Deployment guides
  - Installation instructions
  - Configuration requirements
  - Troubleshooting guides

## 🚀 Quick Deployment

### Prerequisites
- **ScriptRunner**: Version 9.21.0 or higher
- **PostgreSQL**: Version 14 or higher
- **Confluence**: Compatible with your ScriptRunner version

### Deployment Steps

1. **Extract Package**
   ```bash
   tar -xzf umig-deployment-uat-*.tar.gz
   cd umig-deployment/
   ```

2. **Database Setup**
   - Follow instructions in `database/README.md`
   - Run Liquibase migrations: `liquibase update`

3. **ScriptRunner Deployment**
   - Copy `umig/` contents to your ScriptRunner directory
   - Restart Confluence to load new scripts
   - Access admin GUI at: `/plugins/servlet/upm`

### 📋 Post-Deployment Verification

- [ ] Database migrations completed successfully
- [ ] ScriptRunner scripts loaded without errors
- [ ] Admin GUI accessible and functional
- [ ] API endpoints responding correctly

## 📞 Support

**Technical Contact**: UMIG Development Team
**Documentation**: See `documentation/` directory
**Issues**: Check Confluence logs and ScriptRunner console

---

*Package generated: Tuesday 7 October 2025 at 11:35 am*
*Build System: UMIG Build Orchestrator vv22.20.0*
