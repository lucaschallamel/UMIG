# UMIG Getting Started Guide

Welcome to UMIG (Unified Migration Implementation Guide)! This guide will help you get up and running as a new developer on the project in under 30 minutes.

## What is UMIG?

UMIG is a bespoke web application that manages complex IT cutover events and data migration projects. It's built as a **pure ScriptRunner application** for Atlassian Confluence, providing a central command and control platform for managing hierarchical implementation plans.

**Key Features:**

- **Hierarchical Planning**: Organize migrations → iterations → plans → sequences → phases → steps → instructions
- **Real-time Collaboration**: Multi-user environment with role-based access
- **Status Tracking**: Complete audit trail with commenting system
- **Email Notifications**: Automated notifications on status changes
- **Interactive Runsheets**: Dynamic, filterable views for live cutover events

## Technology Stack Overview

- **Backend**: Groovy 3.0.15 (ScriptRunner-compatible)
- **Frontend**: Vanilla JavaScript with Atlassian AUI styling
- **Database**: PostgreSQL 14 with Liquibase migrations
- **Development**: Node.js orchestrated Podman containers
- **API**: RESTful endpoints following v2 conventions

## Quick Start (5 minutes)

### 1. Prerequisites Check

Before you begin, ensure you have:

- **Node.js v18+** and npm
- **Podman** and **podman-compose**
- **Git** (for version control)

### 2. Clone and Setup

```bash
# Clone the repository
git clone <repository-url> UMIG
cd UMIG/local-dev-setup

# Install dependencies
npm install

# Start the complete development environment
npm start
```

### 3. Verify Services

Once startup completes, verify these services are running:

- **Confluence**: [http://localhost:8090](http://localhost:8090)
- **PostgreSQL**: localhost:5432
- **MailHog (Email Testing)**: [http://localhost:8025](http://localhost:8025)

### 4. Generate Test Data

```bash
# Generate comprehensive test data
npm run generate-data:erase
```

### 5. Run Tests

```bash
# Verify everything is working
npm test
```

🎉 **Success!** You now have a fully functional UMIG development environment.

## First Steps After Setup

### 1. Configure ScriptRunner Database Connection

**This is a one-time setup** required for API endpoints to work:

1. Navigate to **Confluence Administration** → **ScriptRunner** → **Resources**
2. Add a new **Database Connection Pool**:
   - **Pool Name**: `umig_db_pool`
   - **Driver**: `org.postgresql.Driver`
   - **JDBC URL**: `jdbc:postgresql://umig_postgres:5432/umig_app_db`
   - **User**: `umig_app_user`
   - **Password**: `123456`

### 2. Configure Mail Server (Optional)

For email notifications:

1. Go to **⚙️ Settings** → **General Configuration** → **Mail Servers**
2. Add SMTP Mail Server:
   - **Name**: `MailHog Local Development`
   - **Hostname**: `umig_mailhog`
   - **Port**: `1025`
   - **From Address**: `umig-system@localhost`

### 3. Explore the Admin GUI

1. Open Confluence at [http://localhost:8090](http://localhost:8090)
2. Navigate to a page with the UMIG Admin GUI macro
3. Explore the different entity management interfaces:
   - **Users**: User management with role-based access
   - **Teams**: Team management with member associations
   - **Environments**: Environment management
   - **Applications**: Application catalog
   - **Labels**: Label management with color coding

## Understanding UMIG's Architecture

### Data Model Hierarchy

UMIG uses a **Canonical vs Instance** pattern:

```
Strategic Layer:    Migrations → Iterations → Plans
Canonical Layer:    Plans → Sequences → Phases → Steps → Instructions
Instance Layer:     Live execution tracking (mirrors canonical)
```

- **Master Records** (`*_master_*`): Reusable templates/playbooks
- **Instance Records** (`*_instance_*`): Time-bound execution records

### Key Concepts

- **Migrations**: Strategic initiatives (e.g., "Data Center Move")
- **Iterations**: Delivery cycles (e.g., "Run 1", "Cutover")
- **Plans**: Implementation playbooks (e.g., "Application Migration Plan")
- **Steps**: Granular executable tasks
- **Instructions**: Detailed procedures within steps

## Development Commands Reference

### Environment Management

```bash
npm start                    # Start complete development stack
npm stop                     # Stop all services
npm run restart:erase        # Reset everything (clean slate)
```

### Testing

```bash
npm test                     # Run all tests
npm run test:js:unit         # JavaScript unit tests
npm run test:groovy:unit     # Groovy unit tests
npm run test:all:comprehensive # Complete test suite
```

### Data Generation

```bash
npm run generate-data:erase  # Generate test data with reset
npm run generate-data        # Generate without reset
```

### Email Testing

```bash
npm run email:test           # Test email functionality
npm run mailhog:check        # Check messages in MailHog
```

## Project Structure Overview

```
UMIG/
├── src/groovy/umig/         # Main application code
│   ├── api/v2/              # REST API endpoints
│   ├── macros/v1/           # ScriptRunner macros for UI
│   ├── repository/          # Data access layer
│   ├── tests/               # Groovy tests
│   └── web/js/              # Frontend JavaScript
├── docs/                    # Comprehensive documentation
│   ├── architecture/        # TOGAF architecture docs
│   ├── api/                 # API documentation
│   └── user-guides/         # User guides (this file!)
├── local-dev-setup/         # Development environment
│   ├── scripts/             # Utility scripts
│   ├── __tests__/           # JavaScript tests
│   └── package.json         # npm commands
```

## What's Next?

Now that you have UMIG running, here are your next steps:

1. **[Installation Guide](installation-guide.md)** - Detailed installation instructions
2. **[Development Workflows](development-workflows.md)** - Git workflow, testing, API development
3. **[Coding Standards](coding-standards.md)** - Non-negotiable patterns and best practices
4. **[Architecture Overview](../architecture/)** - Deep dive into system architecture

## Common Issues & Solutions

### "Database connection failed"

- Ensure PostgreSQL is running: `npm run health:check`
- Verify ScriptRunner database pool configuration
- Check containers are running: `podman ps`

### "Tests failing"

- Reset environment: `npm run restart:erase`
- Regenerate data: `npm run generate-data:erase`
- Check logs: `podman logs umig_confluence`

### "Confluence not loading"

- Wait for complete startup (can take 2-3 minutes)
- Check if port 8090 is available
- Restart if needed: `npm run restart`

## Getting Help

- **Documentation**: Comprehensive docs in `/docs` directory
- **Architecture**: See `/docs/architecture/` for design decisions
- **API Reference**: `/docs/api/openapi.yaml` for API documentation
- **Development Journal**: `/docs/devJournal/` for development history

## Contributing

1. **Always start** by reading the architecture documentation
2. **Follow patterns** established in existing code
3. **Write tests** for new functionality
4. **Update documentation** for any changes
5. **Use the established workflows** documented in this guide

---

Welcome to the UMIG development team! 🚀
