# UMIG Data Generator Scripts

Automated test data generation for UMIG development with session authentication support and dependency-aware execution.

## Structure

```
generators/
├── 001_generate_confluence_users.js      # Foundation: Confluence users
├── 005_generate_environments.js          # Foundation: Environments
├── 010_generate_applications.js          # Foundation: Applications
├── 015_generate_labels.js                # Foundation: Labels
├── 020_generate_teams.js                 # Foundation: Teams
├── 025_generate_migrations.js            # Migration hierarchy: Migrations
├── 030_generate_iterations.js            # Migration hierarchy: Iterations
├── 035_generate_plans_master.js          # Migration hierarchy: Plans (master)
├── 040_generate_plans_instance.js        # Migration hierarchy: Plans (instance)
├── 045_generate_sequences_master.js      # Execution hierarchy: Sequences (master)
├── 050_generate_sequences_instance.js    # Execution hierarchy: Sequences (instance)
├── 055_generate_phases.js                # Execution hierarchy: Phases
└── 060_generate_steps.js                 # Execution hierarchy: Steps
```

## Contents

- **Numbering Convention**: 001-020 (Foundation), 021-040 (Migration hierarchy), 041-060 (Execution hierarchy), 061-080 (Details), 081-100 (Advanced)
- **Generator Categories**: Foundation entities, migration hierarchy, execution hierarchy, with dependency-aware ordering
- **Data Characteristics**: ADR-035 & TD-003 normalized status values, audit fields, 13,500+ steps, ~306 records/sec performance
- **Session Authentication**: Integration with session capture and API validation

---

_Last Updated: 2025-10-01_
