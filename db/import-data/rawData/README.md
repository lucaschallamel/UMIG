# Raw HTML Source Data

Scraped HTML files (1,177 files) serving as source for production data extraction.

## Content

HTML files containing structured production data exported from legacy system:
- Application configurations and metadata
- Sequence definitions with execution order
- Team assignments and ownership
- User roles and permissions
- Step type templates and instructions

## File Structure

All HTML files follow consistent structure enabling automated extraction:
- Structured tables with labeled data fields
- Hierarchical relationships preserved in HTML structure
- Metadata embedded in HTML attributes

## Processing

### Extraction Script
- **Script**: `/db/import-data/scrape_data_batch_v4.ps1`
- **Process**: Parses HTML → Extracts structured data → Generates Excel files
- **Validation**: Quality checks during extraction with CSV reports

### Output
- **Excel Files**: `/db/import-data/*.xlsx` (5 files)
- **Quality Reports**: `/db/import-data/quality_report_*.csv`

## Data Pipeline

```
1,177 HTML files (rawData/)
    ↓
PowerShell extraction script
    ↓
Structured Excel files (*.xlsx)
    ↓
Database import (15,282+ records)
```

## Related Documentation

- **Import Sources**: `/db/import-data/README.md`
- **US-104**: Production Data Import story
- **Extraction Script**: `scrape_data_batch_v4.ps1` in parent directory

## Notes

- HTML files are read-only source data (do not modify)
- Re-running extraction script regenerates Excel files from HTML sources
- Preserves complete audit trail from legacy system export
