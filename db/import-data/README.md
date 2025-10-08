# Production Data Import Sources

Source files for US-104 Production Data Import (15,282+ records across 15 tables).

## Excel Files

### Master Data
- `applications.xlsx` - 80 application records with technical metadata
- `teams.xlsx` - 100 team records with ownership relationships
- `users.xlsx` - 200 user records with roles and team assignments

### Sequence Data
- `sequences.xlsx` - 500 sequence records with execution order and dependencies

### Reference Data
- `step_types.xlsx` - Step type definitions and templates

## Quality Reports (CSV)

- `quality_report_*.csv` - Validation reports for data integrity checks
  - Record counts and foreign key validation
  - Duplicate detection results
  - Data quality metrics

## Extraction Scripts

- `scrape_data_batch_v4.ps1` - PowerShell script for HTML data extraction
  - Processes 1,177 HTML files from `/rawData/`
  - Generates Excel files with structured data
  - Includes validation and quality reporting

## Processing Workflow

```
rawData/ (HTML files)
    ↓ (PowerShell extraction)
*.xlsx (Structured data)
    ↓ (Validation)
quality_report_*.csv
    ↓ (Import)
Database tables (15,282+ records)
```

## Data Volume (US-104)

- **Total Records**: 15,282+
- **Tables Affected**: 15
- **Source Files**: 1,177 HTML files
- **Output Files**: 5 Excel files + quality reports

## Related Documentation

- **US-104**: Production Data Import implementation story
- **TD-103**: Performance optimization prerequisites
- **Database Schema**: `/local-dev-setup/liquibase/changelogs/`
- **Raw Source**: `/db/import-data/rawData/README.md`

## Notes

- Excel files are generated from scraped HTML sources
- Quality reports must show zero errors before production import
- PowerShell script version v4 includes enhanced validation
