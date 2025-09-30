# UMIG Data Generator Scripts

Purpose: Automated test data generation for UMIG development with session authentication support

## Overview

Numbered generator scripts (001-100) create comprehensive test data for all UMIG entities with dependency-aware execution order and session authentication integration.

## Prerequisites

- **Node.js 18+**
- **PostgreSQL 14** running
- **UMIG stack operational** (`npm start`)
- **Clean database state**

## Quick Start

```bash
# Generate all test data
npm run generate-data

# Generate with database reset
npm run generate-data:erase

# Session authentication validation
npm run auth:capture-session
export JSESSIONID=YOUR_SESSION_ID
npm run validate:generated-data
```

## Script Organization

### Numbering Convention

```
001-020: Foundation (Users, Teams, Environments, Applications)
021-040: Migration Hierarchy (Migrations, Iterations, Plans)
041-060: Execution Hierarchy (Sequences, Phases, Steps)
061-080: Details (Instructions, Controls, Labels)
081-100: Advanced/Bulk Operations
```

## Generator Categories

### Foundation Entities (001-020)

- **001**: Confluence Users
- **005**: Environments
- **010**: Applications
- **015**: Labels
- **020**: Teams

### Migration Hierarchy (021-040)

- **025**: Migrations
- **030**: Iterations
- **035**: Plans (Master)
- **040**: Plans (Instance)

### Execution Hierarchy (041-060)

- **045**: Sequences (Master)
- **050**: Sequences (Instance)
- **055**: Phases
- **060**: Steps

## Usage

```bash
# Individual generators (dependency order required)
node scripts/generators/001_generate_confluence_users.js
node scripts/generators/025_generate_migrations.js

# Complete suite
npm run generate-data

# With session validation
JSESSIONID=$JSESSIONID npm run generate-data:validate
```

## Data Characteristics

- **Status Values**: ADR-035 & TD-003 normalized
- **Audit Fields**: created_by, updated_by timestamps
- **Scale**: 5 migrations, 30 iterations, 13,500+ steps
- **Performance**: ~306 records/sec average

## Session Authentication

```bash
# Obtain session
npm run auth:capture-session

# Validate via API
JSESSIONID=$JSESSIONID node scripts/generators/validate_with_session.js
```

## Best Practices

1. Run generators in numerical sequence
2. Ensure clean database state
3. Verify container status
4. Use session validation for API testing
5. Monitor generation performance
