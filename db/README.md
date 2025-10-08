# Database Resources

Overview of UMIG database resources including production data sources, imports, and database dumps.

## Structure

```
/db/
├── import-data/              Production data import sources (US-104)
│   ├── *.xlsx                Excel files with production data
│   ├── *.csv                 Quality validation reports
│   ├── *.ps1                 PowerShell extraction scripts
│   └── rawData/              Scraped HTML source files (1,177 files)
└── *.sql                     Complete database dumps
```

## Key Files

### Database Dumps
- `umig_complete_clean_dump_20251006_165011.sql` - Complete database backup (all tables and data)

### Import Data Sources
- See `/db/import-data/README.md` for production data import sources

## Production Data Import (US-104)

The `/db/import-data/` folder contains source files for importing 15,282+ records across 15 tables:
- Applications (80 records)
- Sequences (500 records)
- Teams (100 records)
- Users (200 records)
- Step types and other reference data

## Related Documentation

- **Database Schema**: `/local-dev-setup/liquibase/changelogs/` (39 changesets defining schema)
- **US-104**: Production Data Import story (complete implementation)
- **TD-103**: Performance optimization prerequisites
- **Data Model**: `/docs/dataModel/UMIG_Data_Model.md`

## Database Management

### Local Development
```bash
npm run restart:erase        # Reset database with fresh schema
npm run generate-data        # Generate synthetic test data
```

### Migrations
- Schema migrations managed via Liquibase in `/local-dev-setup/liquibase/changelogs/`
- Migration execution tracked in `databasechangelog` table

## Notes

- Production data sources are Excel files extracted from HTML via PowerShell script
- Quality reports validate data integrity before import
- Database dumps provide rollback points for major changes
