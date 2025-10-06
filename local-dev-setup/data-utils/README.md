# Data Utilities

Purpose: Data management tools for CSV templates, Confluence imports, and data generation

## Structure

```
data-utils/
├── CSV_Templates/           # CSV template files for data import
├── Confluence_Importer/     # Confluence data import utilities
│   ├── Data_Integration/    # Integration scripts and utilities
│   └── rawData/             # Raw data files for import
└── archives/                # Historical data and backups
```

## Components

### CSV_Templates/

- **Purpose**: Template CSV files for bulk data import
- **Content**: Entity templates (migrations, iterations, steps, users, teams, etc.)
- **Usage**: Used by data generators and manual import processes
- **Format**: Standard CSV with headers matching database schema

### Confluence_Importer/

- **Purpose**: Import data from external sources into UMIG
- **Features**: CSV parsing, validation, transformation, bulk insert
- **Integration**: Uses staging tables (stg\_\*) for intermediate storage
- **Workflow**: Raw data → Validation → Transformation → Database insertion

### archives/

- **Purpose**: Historical data backups and deprecated files
- **Content**: Old data snapshots, migration archives
- **Usage**: Reference and rollback purposes

## Data Generation Workflow

```
1. CSV Templates (CSV_Templates/)
   ↓
2. Data Generation (umig_generate_fake_data.js)
   ↓
3. Staging Tables (stg_* database tables)
   ↓
4. Validation & Transformation (Confluence_Importer/)
   ↓
5. Final Tables (migrations, iterations, steps, etc.)
```

## Commands

```bash
# Generate fake data
npm run generate-data

# Clear database and regenerate
npm run generate-data:erase  # WARNING: Erases all data

# Import from CSV
# Use scripts in Confluence_Importer/Data_Integration/
```

## Data Scale

Generated data typically includes:

- 5 migrations
- 30 iterations
- 1,443+ step instances
- Multiple users, teams, environments
- Complete entity hierarchies

## CSV Template Structure

Templates follow database schema:

- Column headers match database field names
- UUID fields generated during import
- Foreign key relationships maintained
- Audit fields (created_at, created_by) auto-populated

## Integration Points

- **Database**: Staging tables (stg*import*\*, stg_import_queue)
- **Scripts**: `/scripts/generators/` (001-100 numbered generators)
- **API**: Import endpoints for validation and processing
- **UI**: Admin GUI import functionality

## Data Validation

Import process includes:

- Schema validation (required fields, data types)
- Referential integrity checks (foreign keys)
- Business rule validation (unique constraints, status values)
- Data transformation (format standardization)

## Related Files

- `/scripts/umig_generate_fake_data.js` - Main data generation coordinator
- `/scripts/generators/` - Individual entity generators
- `/liquibase/changelogs/009_create_stg_import_tables.sql` - Staging table definitions
- `/liquibase/changelogs/025-026_*.sql` - Import table extensions

---

_Last Updated: 2025-10-06_
