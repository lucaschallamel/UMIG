# CSV Import Templates

This directory contains CSV templates for importing base entity data into the UMIG system.

## Templates Available

### 1. teams_template.csv

- **Purpose**: Import team definitions
- **Required Fields**: tms_id, tms_name, tms_email, tms_description
- **Dependencies**: None (import first)
- **Sample Records**: 10 teams included

### 2. applications_template.csv

- **Purpose**: Import application definitions
- **Required Fields**: app_id, app_code, app_name, app_description
- **Dependencies**: None
- **Sample Records**: 15 applications included

### 3. environments_template.csv

- **Purpose**: Import environment definitions
- **Required Fields**: env_id, env_code, env_name, env_description
- **Dependencies**: None
- **Sample Records**: 10 environments included

### 4. users_template.csv

- **Purpose**: Import user accounts
- **Required Fields**: usr_id, usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, tms_id, rls_id
- **Dependencies**: Teams must be imported first (references tms_id)
- **Sample Records**: 15 users included

## Import Order

Due to foreign key dependencies, import entities in this order:

1. Teams (no dependencies)
2. Applications (no dependencies)
3. Environments (no dependencies)
4. Users (depends on Teams via tms_id)

## Usage

### Via npm Script (Recommended)

```bash
# Import CSV file using the integrated import script
npm run import-csv -- --file path/to/your/file.csv

# Examples with these templates
npm run import-csv -- --file data-utils/CSV_Templates/teams_template.csv
npm run import-csv -- --file data-utils/CSV_Templates/applications_template.csv
npm run import-csv -- --file data-utils/CSV_Templates/environments_template.csv
npm run import-csv -- --file data-utils/CSV_Templates/users_template.csv
```

### Via API Endpoints

```bash
# Import teams
curl -X POST http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/teams \
  -H "Content-Type: text/csv" \
  --data-binary @teams_template.csv

# Import applications
curl -X POST http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/applications \
  -H "Content-Type: text/csv" \
  --data-binary @applications_template.csv

# Import environments
curl -X POST http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/environments \
  -H "Content-Type: text/csv" \
  --data-binary @environments_template.csv

# Import users (after teams)
curl -X POST http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/users \
  -H "Content-Type: text/csv" \
  --data-binary @users_template.csv
```

### Via Import Service (Groovy)

```groovy
import umig.service.CsvImportService

def csvService = new CsvImportService()

// Import teams
def teamsResult = csvService.importTeams(
    new File('teams_template.csv').text,
    'teams_template.csv',
    'admin'
)

// Import all base entities in proper order
def allResults = csvService.importAllBaseEntities([
    teams: new File('teams_template.csv').text,
    applications: new File('applications_template.csv').text,
    environments: new File('environments_template.csv').text,
    users: new File('users_template.csv').text
], 'admin')
```

## CSV Format Rules

1. **Headers Required**: First row must contain exact column names
2. **No Quotes**: Don't quote values unless they contain commas
3. **UTF-8 Encoding**: Files must be UTF-8 encoded
4. **Line Endings**: Unix (LF) or Windows (CRLF) both supported
5. **Empty Values**: Leave blank for NULL values
6. **Boolean Values**: Use `true` or `false` (case-insensitive)
7. **Integer References**: Foreign keys must be valid integers

## Validation Rules

### Teams

- `tms_name`: Required, max 64 characters
- `tms_email`: Optional but must be unique if provided, max 255 characters
- `tms_description`: Optional text field

### Users

- `usr_code`: Required, exactly 3 characters, must be unique
- `usr_first_name`: Required, max 50 characters
- `usr_last_name`: Required, max 50 characters
- `usr_email`: Required, must be unique, max 255 characters
- `usr_is_admin`: Boolean, defaults to false
- `tms_id`: Optional, must reference existing team
- `rls_id`: Optional, must reference existing role

### Applications

- `app_code`: Required, unique, max 50 characters
- `app_name`: Optional, max 64 characters
- `app_description`: Optional text field

### Environments

- `env_code`: Required, unique, max 10 characters
- `env_name`: Optional, max 64 characters
- `env_description`: Optional text field

## Error Handling

The import service will:

1. Skip duplicate records (based on unique keys)
2. Continue processing after errors
3. Report detailed error messages per row
4. Track statistics: processed, imported, skipped
5. Create import batch records for auditing

## Integration with US-034

These CSV templates are part of the US-034 Data Import Strategy:

- Provides base entity data required before importing steps/instructions
- Works alongside the JSON extraction from Confluence HTML
- Enables complete migration configuration setup
- Supports both initial load and incremental updates

## Related Files

- **Import Service**: `/src/groovy/umig/service/CsvImportService.groovy`
- **Import API**: `/src/groovy/umig/api/v2/ImportApi.groovy`
- **Import Repository**: `/src/groovy/umig/repository/ImportRepository.groovy`
- **JSON Extraction**: `/local-dev-setup/data-utils/Confluence_Importer/`
