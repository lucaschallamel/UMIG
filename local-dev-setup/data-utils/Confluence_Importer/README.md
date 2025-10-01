# Confluence HTML Importer

Extract structured data from exported Confluence HTML files and import into UMIG PostgreSQL database with session authentication support.

## Structure

```
Confluence_Importer/
├── rawData/                         # Input HTML files
│   └── json/                       # Generated JSON output
├── scripts/
│   ├── scrape_html.sh              # Debug-friendly multi-line JSON
│   ├── scrape_html_oneline.sh      # PostgreSQL-compatible JSON
│   ├── scrape_html.ps1             # PowerShell alternative
│   ├── import_cutover_data.sh      # Database import script
│   └── validate_import.js          # Node.js validation with session auth
├── docs/                            # Additional documentation
└── README.md                        # Complete documentation
```

## Contents

- **Extraction Scripts**: Cross-platform HTML parsing to JSON (Bash, PowerShell)
- **Import Pipeline**: JSON to PostgreSQL with validation
- **Session Authentication**: TD-008 integration for secure API operations
- **Data Validation**: Field extraction, format validation, referential integrity
- **Extracted Fields**: Title, heading, author, last modified, cutover date, instructions, status, team assignment, environment

---

_Last Updated: 2025-10-01_
