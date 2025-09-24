# UMIG Installation and Setup Guide

This comprehensive guide will walk you through setting up the UMIG development environment from scratch. Follow these steps carefully to ensure a successful installation.

## Prerequisites

### Required Software

Before installing UMIG, ensure you have the following software installed:

#### 1. Node.js and npm

- **Version**: Node.js v18+ and npm
- **Installation**:
  - **macOS**: `brew install node` or download from [nodejs.org](https://nodejs.org/)
  - **Linux**: Use your package manager or download from [nodejs.org](https://nodejs.org/)
  - **Windows**: Download from [nodejs.org](https://nodejs.org/)
- **Verification**: `node --version && npm --version`

#### 2. Podman and podman-compose

- **Purpose**: Container orchestration for development environment
- **Installation**:
  - **macOS**:
    ```bash
    brew install podman
    brew install podman-compose
    ```
  - **Linux**: Follow [official Podman installation guide](https://podman.io/getting-started/installation)
  - **Windows**: Follow [official Podman installation guide](https://podman.io/getting-started/installation)
- **Verification**: `podman --version && podman-compose --version`

#### 3. Git

- **Purpose**: Version control
- **Installation**:
  - **macOS**: `brew install git` or use Xcode Command Line Tools
  - **Linux**: Use your package manager (e.g., `apt install git`)
  - **Windows**: Download from [git-scm.com](https://git-scm.com/)
- **Verification**: `git --version`

### Optional but Recommended

#### 4. Groovy 3.0.15

- **Purpose**: Command-line testing and development
- **Why this specific version**: Matches ScriptRunner 9.21.0 compatibility
- **Installation (recommended - SDKMAN)**:

  ```bash
  # Install SDKMAN
  curl -s "https://get.sdkman.io" | bash
  source "$HOME/.sdkman/bin/sdkman-init.sh"

  # Install Groovy 3.0.15
  sdk install groovy 3.0.15
  sdk default groovy 3.0.15
  ```

- **Verification**: `groovy --version`

#### 5. Liquibase CLI

- **Purpose**: Database migrations management
- **Installation**:
  - **macOS**: `brew install liquibase`
  - **Linux/Windows**: Download from [liquibase.com](https://www.liquibase.com/download)
- **Verification**: `liquibase --version`

#### 6. Ansible

- **Purpose**: Environment automation
- **Installation**:
  - **macOS**: `brew install ansible`
  - **Linux**: `python3 -m pip install --user ansible`
  - **Windows**: Use WSL with Linux instructions
- **Verification**: `ansible --version`

## System Requirements

### Hardware Requirements

- **RAM**: Minimum 8GB, recommended 16GB+
- **Storage**: Minimum 10GB free space for containers and data
- **CPU**: Modern multi-core processor (Intel/AMD/Apple Silicon)

### Port Requirements

The following ports must be available on your system:

- **8090**: Confluence web interface
- **5432**: PostgreSQL database
- **1025**: MailHog SMTP server
- **8025**: MailHog web interface

## Step-by-Step Installation

### Step 1: Clone the Repository

```bash
# Clone the UMIG repository
git clone <repository-url> UMIG
cd UMIG
```

### Step 2: Navigate to Development Setup

```bash
cd local-dev-setup
```

### Step 3: Install Node.js Dependencies

```bash
# Install all Node.js dependencies
npm install
```

This will install:

- Jest testing framework
- Development utilities
- Build tools
- Container orchestration scripts

### Step 4: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

**Review and customize `.env` file** (optional):

```bash
# Edit environment variables if needed
vim .env  # or use your preferred editor
```

**Key environment variables**:

- `POSTGRES_USER`: Database user (default: `umig_user`)
- `POSTGRES_PASSWORD`: Database password (default: `changeme`)
- `UMIG_DB_USER`: Application database user (default: `umig_app_user`)
- `UMIG_DB_PASSWORD`: Application database password (default: `123456`)

### Step 5: Start the Development Environment

```bash
# Start all services (first time may take 5-10 minutes)
npm start
```

**What this does**:

- Downloads and starts Confluence container
- Downloads and starts PostgreSQL container
- Downloads and starts MailHog container
- Runs database migrations via Liquibase
- Sets up networking between containers

### Step 6: Wait for Complete Startup

Monitor the startup process:

```bash
# Check container status
podman ps

# Monitor Confluence logs (in another terminal)
podman logs -f umig_confluence
```

**Startup is complete when you see**:

- Confluence accessible at [http://localhost:8090](http://localhost:8090)
- No error messages in container logs
- All containers show "Up" status in `podman ps`

### Step 7: Initial Confluence Configuration

**First-time only**: When you first access Confluence, you'll need to complete the setup wizard.

1. **Navigate to Confluence**: [http://localhost:8090](http://localhost:8090)

2. **Database Configuration**:
   - **Database Type**: `PostgreSQL`
   - **Setup Type**: `Simple`
   - **Hostname**: `postgres` (**Important**: Not `localhost`)
   - **Port**: `5432`
   - **Database Name**: `umig_app_db`
   - **Username**: Value from `.env` file (`umig_user` by default)
   - **Password**: Value from `.env` file (`changeme` by default)

3. **Complete Setup Wizard**: Follow the remaining setup steps (license, admin user, etc.)

### Step 8: Configure ScriptRunner Database Connection

**Critical step** for API endpoints to function:

1. **Navigate to ScriptRunner**:
   - Go to **Confluence Administration** → **ScriptRunner** → **Resources**

2. **Add Database Connection Pool**:
   - Click **Add a new resource** → **Database Connection**
   - **Pool Name**: `umig_db_pool` (**Must be exact**)
   - **Driver**: `org.postgresql.Driver`
   - **JDBC URL**: `jdbc:postgresql://umig_postgres:5432/umig_app_db`
   - **User**: `umig_app_user`
   - **Password**: `123456`
   - **JNDI Name**: Leave blank

3. **Save Configuration**: Click **Add**

### Step 9: Configure Mail Server (Optional)

For email notifications in development:

1. **Navigate to Mail Configuration**:
   - Go to **⚙️ Settings** → **General Configuration** → **Mail Servers**

2. **Add SMTP Mail Server**:
   - **Name**: `MailHog Local Development`
   - **From Address**: `umig-system@localhost`
   - **Hostname**: `umig_mailhog` (**Important**: Container name, not localhost)
   - **Port**: `1025`
   - **Username/Password**: Leave blank
   - **Use TLS**: No

3. **Test Configuration**: Send a test email and verify in MailHog at [http://localhost:8025](http://localhost:8025)

### Step 10: Generate Test Data

```bash
# Generate comprehensive test data
npm run generate-data:erase
```

**What this generates**:

- Users and teams
- Applications and environments
- Master plan hierarchy (plans → sequences → phases → steps → instructions)
- Instance execution records
- Comments and audit trail data

### Step 11: Verify Installation

```bash
# Run complete test suite
npm test

# Check system health
npm run health:check

# Verify services are responsive
curl -s http://localhost:8090/status
curl -s http://localhost:8025/api/v1/messages
```

## Post-Installation Configuration

### Groovy JDBC Integration (Optional)

For command-line Groovy testing:

```bash
# Set up Groovy with JDBC integration
npm run setup:groovy-jdbc

# Test Groovy connection
npm run test:groovy:unit
```

### Browser Extensions (Recommended)

For enhanced development experience:

- **Browser Developer Tools**: Essential for frontend debugging
- **JSON Formatter**: For API response inspection
- **REST Client**: For API testing (alternative to Postman)

### IDE Configuration

Recommended IDE settings:

- **VS Code**: Install Groovy and JavaScript extensions
- **IntelliJ IDEA**: Enable Groovy plugin
- **File Associations**: Associate `.groovy` files with Groovy syntax highlighting

## Verification Checklist

After installation, verify these components are working:

### ✅ Services Running

- [ ] Confluence accessible at [http://localhost:8090](http://localhost:8090)
- [ ] PostgreSQL accepting connections on port 5432
- [ ] MailHog web interface at [http://localhost:8025](http://localhost:8025)

### ✅ Configuration Complete

- [ ] ScriptRunner database connection pool configured
- [ ] Mail server configured (optional)
- [ ] Test data generated successfully

### ✅ Testing Framework

- [ ] All tests passing: `npm test`
- [ ] JavaScript tests: `npm run test:js:unit`
- [ ] Groovy tests: `npm run test:groovy:unit`

### ✅ API Endpoints

- [ ] Users API: `curl -s http://localhost:8090/rest/scriptrunner/latest/custom/users`
- [ ] Teams API: `curl -s http://localhost:8090/rest/scriptrunner/latest/custom/teams`
- [ ] Plans API: `curl -s http://localhost:8090/rest/scriptrunner/latest/custom/plans`

## Troubleshooting

### Common Installation Issues

#### Issue: "Port already in use"

**Symptoms**: Error messages about ports 8090, 5432, 1025, or 8025 being in use
**Solution**:

```bash
# Check what's using the ports
lsof -i :8090
lsof -i :5432

# Stop conflicting services or change ports in .env file
```

#### Issue: "Container won't start"

**Symptoms**: Containers fail to start or immediately exit
**Solution**:

```bash
# Check container logs
podman logs umig_confluence
podman logs umig_postgres

# Restart with fresh containers
npm run restart:erase
```

#### Issue: "Database connection failed"

**Symptoms**: ScriptRunner can't connect to database
**Solution**:

1. Verify PostgreSQL container is running: `podman ps`
2. Check database connection details in ScriptRunner configuration
3. Ensure you're using container name `umig_postgres`, not `localhost`

#### Issue: "npm install fails"

**Symptoms**: Package installation errors
**Solution**:

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Issue: "Groovy tests fail"

**Symptoms**: Groovy test execution errors
**Solution**:

```bash
# Ensure Groovy is installed
groovy --version

# Run JDBC setup
npm run setup:groovy-jdbc

# Check classpath configuration
npm run groovy:classpath:status
```

### Performance Issues

#### Slow Startup

- **Cause**: First-time container downloads
- **Solution**: Be patient; subsequent startups are much faster
- **Optimization**: Increase Docker/Podman memory allocation

#### High Memory Usage

- **Cause**: Multiple containers running
- **Solution**: Close unnecessary applications; consider increasing system RAM
- **Monitoring**: Use `podman stats` to monitor resource usage

#### Test Timeouts

- **Cause**: Slow database operations
- **Solution**:
  ```bash
  # Reset database
  npm run restart:erase:umig
  npm run generate-data:erase
  ```

### Platform-Specific Issues

#### macOS with Apple Silicon

- Ensure you're using ARM64-compatible containers
- Some containers may run in emulation mode (slower but functional)

#### Windows with WSL

- Run all commands within WSL environment
- Ensure Docker/Podman is configured for WSL integration

#### Linux with SELinux

- May need to adjust container volume mount options
- Add `:Z` suffix to volume mounts in `podman-compose.yml` if needed

## Getting Help

If you encounter issues not covered here:

1. **Check Documentation**:
   - [Getting Started Guide](getting-started.md)
   - [Development Workflows](development-workflows.md)
   - Architecture documentation in `/docs/architecture/`

2. **Review Logs**:

   ```bash
   # Container logs
   podman logs umig_confluence
   podman logs umig_postgres

   # Application logs
   npm run health:check
   ```

3. **Community Resources**:
   - Project issue tracker
   - Development team communication channels
   - ScriptRunner documentation

## Next Steps

After successful installation:

1. **[Getting Started Guide](getting-started.md)** - Quick introduction to UMIG
2. **[Development Workflows](development-workflows.md)** - Learn the development process
3. **[Coding Standards](coding-standards.md)** - Understand project conventions
4. **[API Documentation](../api/)** - Explore the REST API

---

**Congratulations!** You now have a fully functional UMIG development environment. 🎉
