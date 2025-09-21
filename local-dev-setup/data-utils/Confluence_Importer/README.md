---
version: 1.0.0
last_updated: 2025-09-21
tested_with:
  confluence: "9.2.7"
  scriptrunner: "9.21.0"
  postgres: "14"
  node: "18.17.0"
maintainer: "UMIG Development Team"
related_docs:
  - ../CSV_Templates/README.md
  - ../../SESSION_AUTH_UTILITIES.md
  - ../../../docs/roadmap/sprint7/TD-008-session-based-authentication-infrastructure.md
---

# Confluence HTML Importer

**Purpose**: Extract structured data from exported Confluence HTML files and import into UMIG PostgreSQL database
**Status**: Core functionality implemented with session authentication integration (TD-008)
**Sprint**: Enhanced in Sprint 7 for session-based authentication support

## Overview

This importer provides cross-platform scripts for extracting structured data from Confluence HTML exports and importing them into the UMIG PostgreSQL database. The scripts handle authentication, data extraction, transformation, and validation.

## Prerequisites

- **Node.js 18+** for session authentication utilities
- **PostgreSQL 14** with UMIG database configured
- **jq** for JSON processing (`sudo apt-get install jq`)
- **Confluence session** (for authenticated API operations)
- **UMIG stack running** (`npm start` from project root)

## Quick Start

```bash
# 1. Export HTML from Confluence
# Navigate to Confluence pages and export as HTML

# 2. Place files in rawData/ directory
cp ~/Downloads/*.html ./rawData/

# 3. Extract data (choose based on need)
./scrape_html_oneline.sh rawData/input.html  # For DB import
./scrape_html.sh rawData/input.html           # For debugging

# 4. Import into PostgreSQL
./import_cutover_data.sh

# 5. Validate import (requires session authentication)
npm run validate:import -- --session-id=YOUR_SESSION_ID
```

## Directory Structure

```
Confluence_Importer/
├── rawData/                    # Input HTML files
│   └── json/                  # Generated JSON output
├── scripts/
│   ├── scrape_html.sh         # Debug-friendly multi-line JSON
│   ├── scrape_html_oneline.sh # PostgreSQL-compatible JSON
│   ├── scrape_html.ps1        # PowerShell alternative
│   ├── import_cutover_data.sh # Database import script
│   └── validate_import.js     # Node.js validation with session auth
├── docs/                       # Additional documentation
└── README.md                   # This file
```

## Session Authentication Integration (TD-008)

As of Sprint 7, the importer integrates with session-based authentication for secure API operations:

### Obtaining Session ID

```bash
# 1. Login to Confluence
# Navigate to http://localhost:8090 and login as admin:123456

# 2. Capture session
cd ../../  # Navigate to local-dev-setup
npm run auth:capture-session

# 3. Use session ID in validation
export JSESSIONID=YOUR_SESSION_ID
```

### API Validation with Session

```javascript
// validate_import.js uses session authentication
const sessionId = process.env.JSESSIONID || process.argv[2];
const headers = {
  Cookie: `JSESSIONID=${sessionId}`,
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json",
};
```

## Extracted Fields

The scripts extract the following fields from HTML:

| Field           | Description                | JSON Key        |
| --------------- | -------------------------- | --------------- |
| Title           | Page title                 | `title`         |
| Heading         | Primary heading            | `heading`       |
| Author          | Content author             | `author`        |
| Last Modified   | Modification timestamp     | `lastModified`  |
| Cutover Date    | Business data cutover date | `cutoverDate`   |
| Instructions    | Step-by-step instructions  | `instructions`  |
| Status          | Migration status           | `status`        |
| Team Assignment | Responsible team           | `teamId`        |
| Environment     | Target environment         | `environmentId` |

## Usage Examples

### Linux/macOS - PostgreSQL Import

```bash
# Generate compact JSON for database import
./scrape_html_oneline.sh rawData/migration_plan.html

# Output: rawData/json/migration_plan.json (one-line JSON)
# Import to database
./import_cutover_data.sh
```

### Linux/macOS - Debug/Inspection

```bash
# Generate human-readable JSON for debugging
./scrape_html.sh rawData/migration_plan.html

# View extracted data
cat rawData/json/migration_plan.json | jq '.'
```

### Windows PowerShell

```powershell
# Extract data using PowerShell
./scrape_html.ps1 rawData/migration_plan.html | Out-File output.json

# Convert to CSV if needed
./scrape_html.ps1 rawData/migration_plan.html | ConvertTo-Csv | Out-File output.csv
```

### Bulk Processing

```bash
# Process all HTML files
for file in rawData/*.html; do
    ./scrape_html_oneline.sh "$file"
done

# Import all JSON files
for file in rawData/json/*.json; do
    psql -U umig_app_user -d umig_app_db -c "\copy import_queue (data) FROM '$file'"
done
```

## Database Import Process

### 1. Prepare Import Queue

```sql
-- Clear existing queue if needed
TRUNCATE TABLE import_queue;

-- Verify queue is ready
SELECT COUNT(*) FROM import_queue;
```

### 2. Import JSON Data

```bash
# Single file import
psql -U umig_app_user -d umig_app_db -c "\copy import_queue (data) FROM 'rawData/json/input.json'"

# Bulk import
./import_cutover_data.sh
```

### 3. Process Import Queue

```sql
-- Process imported data through stored procedures
CALL process_import_queue();

-- Verify import results
SELECT status, COUNT(*)
FROM import_queue
GROUP BY status;
```

### 4. Validate with Session Authentication

```bash
# Set session ID
export JSESSIONID=YOUR_SESSION_ID_FROM_BROWSER

# Run validation
node scripts/validate_import.js

# Check API endpoint
curl -H "Cookie: JSESSIONID=$JSESSIONID" \
     -H "X-Requested-With: XMLHttpRequest" \
     "http://localhost:8090/rest/scriptrunner/latest/custom/importqueue"
```

## Troubleshooting

### Common Issues and Solutions

#### Session Authentication Errors

```
Error: 401 Unauthorized
```

**Solution**:

1. Ensure you're logged into Confluence (http://localhost:8090)
2. Extract fresh JSESSIONID using `npm run auth:capture-session`
3. Session expires after ~30 minutes, refresh if needed

#### JSON Parsing Errors

```
Error: Invalid JSON format
```

**Solution**:

1. Ensure `jq` is installed: `sudo apt-get install jq`
2. Check for unescaped quotes in HTML content
3. Use debug script to identify problematic fields

#### Database Connection Issues

```
Error: psql: FATAL: password authentication failed
```

**Solution**:

1. Verify PostgreSQL credentials in `.env`
2. Ensure database is running: `npm run health:check`
3. Check connection: `psql -U umig_app_user -d umig_app_db -c "SELECT 1"`

#### Import Queue Processing Failures

```
Error: Foreign key constraint violation
```

**Solution**:

1. Verify reference data exists (teams, environments, etc.)
2. Run data generation if needed: `npm run generate-data`
3. Check import queue status: `SELECT * FROM import_queue WHERE status = 'ERROR'`

### Debug Commands

```bash
# Check jq installation
jq --version

# Test database connection
psql -U umig_app_user -d umig_app_db -c "SELECT version()"

# Verify session authentication
curl -I -H "Cookie: JSESSIONID=$JSESSIONID" http://localhost:8090/rest/api/2/myself

# Check import queue
psql -U umig_app_user -d umig_app_db -c "SELECT * FROM import_queue ORDER BY created_at DESC LIMIT 10"

# View error details
psql -U umig_app_user -d umig_app_db -c "SELECT error_message FROM import_queue WHERE status = 'ERROR'"
```

## Performance Optimization

### Batch Processing

```bash
# Process files in parallel
find rawData -name "*.html" -print0 | \
    xargs -0 -P 4 -I {} ./scrape_html_oneline.sh {}
```

### Database Optimization

```sql
-- Add indexes for faster processing
CREATE INDEX idx_import_queue_status ON import_queue(status);
CREATE INDEX idx_import_queue_created ON import_queue(created_at);

-- Analyze tables after bulk import
ANALYZE import_queue;
```

## Security Considerations

1. **Session Security**: Never commit JSESSIONID values to version control
2. **Input Validation**: All imported data is sanitized before database insertion
3. **SQL Injection**: Use parameterized queries in all database operations
4. **File Permissions**: Ensure rawData/ directory has appropriate permissions
5. **Sensitive Data**: Audit HTML files for PII before processing

## Integration with CSV Templates

For structured data import, consider using CSV templates instead:

```bash
# Convert HTML extract to CSV format
cd ../CSV_Templates
./convert_json_to_csv.sh ../Confluence_Importer/rawData/json/input.json
```

See [CSV Templates README](../CSV_Templates/README.md) for details.

## Related Documentation

- [Session Authentication Utilities](../../SESSION_AUTH_UTILITIES.md)
- [TD-008: Session-Based Authentication](../../../docs/roadmap/sprint7/TD-008-session-based-authentication-infrastructure.md)
- [CSV Import Templates](../CSV_Templates/README.md)
- [API Testing Guide](../../../docs/api/api-testing-quick-reference.md)

## Maintenance

### Regular Tasks

1. **Clear old import data**: `TRUNCATE import_queue CASCADE`
2. **Archive processed files**: `mv rawData/json/*.json rawData/archive/`
3. **Update session utilities**: Check for updates in TD-008 documentation
4. **Validate import procedures**: Run test imports monthly

### Version History

- **v1.0.0** (2025-09-21): Added session authentication support (TD-008)
- **v0.9.0** (2025-08): Initial implementation with basic HTML scraping
- **v0.8.0** (2025-07): Added PostgreSQL import functionality

---

**Note**: Core logic is implemented and functional. Additional field extraction rules and automated testing are planned for future sprints. Contributions welcome!
