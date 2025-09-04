# CSV Template Guide

**Version**: 2.0.0  
**Date**: September 3, 2025  
**Status**: Production Ready  
**Templates Location**: `/local-dev-setup/data-utils/CSV_Templates/`

## Overview

This guide provides comprehensive documentation for CSV templates used in the UMIG Data Import System. These templates enable systematic import of base entity data (Teams, Users, Applications, Environments) with proper validation, error handling, and dependency management.

## Quick Reference

| Template File               | Entity Type  | Dependencies   | Sample Records | Required Fields                                            |
| --------------------------- | ------------ | -------------- | -------------- | ---------------------------------------------------------- |
| `teams_template.csv`        | Teams        | None           | 10             | tms_id, tms_name                                           |
| `applications_template.csv` | Applications | None           | 15             | app_id, app_code                                           |
| `environments_template.csv` | Environments | None           | 10             | env_id, env_code                                           |
| `users_template.csv`        | Users        | Teams (tms_id) | 15             | usr_id, usr_code, usr_first_name, usr_last_name, usr_email |

## Import Order Dependencies

**CRITICAL**: Import entities in this exact order due to foreign key dependencies:

1. **Teams** → No dependencies, import first
2. **Applications** → No dependencies, can import anytime
3. **Environments** → No dependencies, can import anytime
4. **Users** → **Depends on Teams** (references tms_id), import last

---

## Teams Template

### File: `teams_template.csv`

**Purpose**: Import organizational team definitions  
**Dependencies**: None (import first)  
**Download URL**: `GET /rest/scriptrunner/latest/custom/import/templates/teams`

### CSV Structure

```csv
tms_id,tms_name,tms_email,tms_description
1,Platform Engineering,platform-eng@company.com,Core platform engineering team responsible for infrastructure
2,Data Engineering,data-eng@company.com,Data platform and analytics team
3,Security Operations,security-ops@company.com,Security and compliance operations team
4,Application Development,app-dev@company.com,Application development and maintenance team
5,DevOps Engineering,devops-eng@company.com,DevOps and release management team
6,Quality Assurance,qa-team@company.com,Quality assurance and testing team
7,Business Analysis,business-analysts@company.com,Business requirements and analysis team
8,Project Management,project-mgmt@company.com,Project management and coordination team
9,Database Administration,dba-team@company.com,Database administration and optimization team
10,Network Operations,network-ops@company.com,Network operations and infrastructure team
```

### Field Specifications

| Field Name        | Type    | Required | Max Length | Unique | Description                       |
| ----------------- | ------- | -------- | ---------- | ------ | --------------------------------- |
| `tms_id`          | Integer | ✅ Yes   | N/A        | ✅ Yes | Primary key identifier for team   |
| `tms_name`        | String  | ✅ Yes   | 64 chars   | ✅ Yes | Team display name                 |
| `tms_email`       | String  | ❌ No    | 255 chars  | ✅ Yes | Team contact email (if provided)  |
| `tms_description` | String  | ❌ No    | Text       | ❌ No  | Team purpose and responsibilities |

### Validation Rules

- **tms_id**: Must be unique positive integer
- **tms_name**: Required, cannot be empty, must be unique across all teams
- **tms_email**: If provided, must be valid email format and unique
- **tms_description**: Optional descriptive text, no length restrictions

### Sample Usage

```bash
# Download template
curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/templates/teams" \
  -o teams_template.csv

# Import teams
curl -X POST "http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/teams" \
  -H "Content-Type: text/csv" \
  --data-binary @teams_prepared.csv
```

---

## Applications Template

### File: `applications_template.csv`

**Purpose**: Import application definitions for migration tracking  
**Dependencies**: None  
**Download URL**: `GET /rest/scriptrunner/latest/custom/import/templates/applications`

### CSV Structure

```csv
app_id,app_code,app_name,app_description
1,CRM001,Customer CRM,Customer relationship management system
2,ERP002,Enterprise ERP,Enterprise resource planning system
3,WEB003,Web Portal,Customer-facing web portal
4,API004,Integration API,RESTful API for external integrations
5,MOB005,Mobile App,Native mobile application
6,BI006,Business Intelligence,Data analytics and reporting platform
7,DWH007,Data Warehouse,Central data warehouse system
8,ETL008,ETL Pipeline,Extract transform load data pipeline
9,DOC009,Document Management,Document storage and management system
10,WF010,Workflow Engine,Business process workflow engine
11,AUTH011,Authentication Service,Single sign-on authentication service
12,LOG012,Logging Service,Centralized logging and monitoring
13,CACHE013,Caching Layer,Distributed caching infrastructure
14,QUEUE014,Message Queue,Asynchronous message processing
15,SEARCH015,Search Engine,Full-text search and indexing service
```

### Field Specifications

| Field Name        | Type    | Required | Max Length | Unique | Description                            |
| ----------------- | ------- | -------- | ---------- | ------ | -------------------------------------- |
| `app_id`          | Integer | ✅ Yes   | N/A        | ✅ Yes | Primary key identifier for application |
| `app_code`        | String  | ✅ Yes   | 50 chars   | ✅ Yes | Application code identifier            |
| `app_name`        | String  | ❌ No    | 64 chars   | ❌ No  | Application display name               |
| `app_description` | String  | ❌ No    | Text       | ❌ No  | Application purpose and functionality  |

### Validation Rules

- **app_id**: Must be unique positive integer
- **app_code**: Required, alphanumeric code, must be unique across all applications
- **app_name**: Optional display name for the application
- **app_description**: Optional descriptive text explaining application purpose

### Sample Usage

```bash
# Download template
curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/templates/applications" \
  -o applications_template.csv

# Import applications
curl -X POST "http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/applications" \
  -H "Content-Type: text/csv" \
  --data-binary @applications_prepared.csv
```

---

## Environments Template

### File: `environments_template.csv`

**Purpose**: Import environment definitions (DEV, TEST, PROD, etc.)  
**Dependencies**: None  
**Download URL**: `GET /rest/scriptrunner/latest/custom/import/templates/environments`

### CSV Structure

```csv
env_id,env_code,env_name,env_description
1,DEV,Development,Development environment for active coding
2,TEST,Testing,Testing and QA validation environment
3,STAGE,Staging,Pre-production staging environment
4,PROD,Production,Production environment for live systems
5,DR,Disaster Recovery,Disaster recovery backup environment
6,SANDBOX,Sandbox,Isolated sandbox for experimentation
7,DEMO,Demo,Demonstration environment for client presentations
8,PERF,Performance,Performance testing and load testing environment
9,SEC,Security,Security testing and vulnerability assessment environment
10,TRAIN,Training,Training environment for user education
```

### Field Specifications

| Field Name        | Type    | Required | Max Length | Unique | Description                            |
| ----------------- | ------- | -------- | ---------- | ------ | -------------------------------------- |
| `env_id`          | Integer | ✅ Yes   | N/A        | ✅ Yes | Primary key identifier for environment |
| `env_code`        | String  | ✅ Yes   | 10 chars   | ✅ Yes | Environment code identifier            |
| `env_name`        | String  | ❌ No    | 64 chars   | ❌ No  | Environment display name               |
| `env_description` | String  | ❌ No    | Text       | ❌ No  | Environment purpose and usage          |

### Validation Rules

- **env_id**: Must be unique positive integer
- **env_code**: Required, short code (max 10 characters), must be unique
- **env_name**: Optional display name for the environment
- **env_description**: Optional descriptive text explaining environment purpose

### Sample Usage

```bash
# Download template
curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/templates/environments" \
  -o environments_template.csv

# Import environments
curl -X POST "http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/environments" \
  -H "Content-Type: text/csv" \
  --data-binary @environments_prepared.csv
```

---

## Users Template

### File: `users_template.csv`

**Purpose**: Import user accounts with team associations and roles  
**Dependencies**: Teams (must be imported first)  
**Download URL**: `GET /rest/scriptrunner/latest/custom/import/templates/users`

### CSV Structure

```csv
usr_id,usr_code,usr_first_name,usr_last_name,usr_email,usr_is_admin,tms_id,rls_id
1,JDO,John,Doe,john.doe@company.com,true,1,1
2,JSM,Jane,Smith,jane.smith@company.com,false,2,2
3,RJO,Robert,Johnson,robert.johnson@company.com,false,3,2
4,MDA,Mary,Davis,mary.davis@company.com,false,4,3
5,JWI,James,Wilson,james.wilson@company.com,false,5,2
6,LBR,Linda,Brown,linda.brown@company.com,true,6,1
7,DAJ,David,Anderson,david.anderson@company.com,false,7,2
8,STA,Sarah,Taylor,sarah.taylor@company.com,false,8,3
9,MIC,Michael,Clark,michael.clark@company.com,false,9,2
10,EML,Emily,Lewis,emily.lewis@company.com,false,10,2
11,CHT,Christopher,Thomas,christopher.thomas@company.com,true,1,1
12,JHA,Jennifer,Hall,jennifer.hall@company.com,false,2,2
13,DAM,Daniel,Martin,daniel.martin@company.com,false,3,2
14,LAG,Laura,Garcia,laura.garcia@company.com,false,4,3
15,MAR,Mark,Rodriguez,mark.rodriguez@company.com,false,5,2
```

### Field Specifications

| Field Name       | Type    | Required | Max Length | Unique | Description                     |
| ---------------- | ------- | -------- | ---------- | ------ | ------------------------------- |
| `usr_id`         | Integer | ✅ Yes   | N/A        | ✅ Yes | Primary key identifier for user |
| `usr_code`       | String  | ✅ Yes   | 3 chars    | ✅ Yes | 3-character user code           |
| `usr_first_name` | String  | ✅ Yes   | 50 chars   | ❌ No  | User's first name               |
| `usr_last_name`  | String  | ✅ Yes   | 50 chars   | ❌ No  | User's last name                |
| `usr_email`      | String  | ✅ Yes   | 255 chars  | ✅ Yes | User's email address            |
| `usr_is_admin`   | Boolean | ❌ No    | N/A        | ❌ No  | Admin privileges (true/false)   |
| `tms_id`         | Integer | ❌ No    | N/A        | ❌ No  | Team assignment (foreign key)   |
| `rls_id`         | Integer | ❌ No    | N/A        | ❌ No  | Role assignment (foreign key)   |

### Validation Rules

- **usr_id**: Must be unique positive integer
- **usr_code**: Required, exactly 3 characters, typically uppercase initials, must be unique
- **usr_first_name**: Required, maximum 50 characters
- **usr_last_name**: Required, maximum 50 characters
- **usr_email**: Required, valid email format, must be unique across all users
- **usr_is_admin**: Optional boolean (true/false), defaults to false if not provided
- **tms_id**: Optional, if provided must reference existing team from teams import
- **rls_id**: Optional, if provided must reference existing role in system

### Foreign Key Dependencies

**CRITICAL**: Users template has foreign key dependency on Teams:

- **tms_id** must reference an existing `tms_id` from the teams table
- Teams must be imported successfully before importing users
- Invalid team references will cause import failures

### Sample Usage

```bash
# Download template
curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/templates/users" \
  -o users_template.csv

# Import users (AFTER importing teams)
curl -X POST "http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/users" \
  -H "Content-Type: text/csv" \
  --data-binary @users_prepared.csv
```

---

## CSV Formatting Standards

### General Formatting Rules

1. **File Encoding**: UTF-8 encoding required for all CSV files
2. **Line Endings**: Unix (LF) or Windows (CRLF) both supported
3. **Header Row**: First row must contain exact column names from templates
4. **Case Sensitivity**: Column names are case-sensitive and must match exactly
5. **Field Separators**: Comma-separated values (CSV standard)
6. **Text Qualifiers**: Use double quotes for fields containing commas or newlines

### Field Value Standards

#### String Fields

- **Empty Values**: Leave blank for NULL values (don't use "null", "NULL", or "N/A")
- **Quoted Values**: Quote strings containing commas: `"Smith, John"`
- **Special Characters**: UTF-8 special characters supported
- **Whitespace**: Leading/trailing whitespace automatically trimmed

#### Numeric Fields

- **Integers**: Plain numbers without quotes: `123`
- **No Formatting**: Don't use thousand separators or currency symbols
- **Valid Range**: Positive integers only for ID fields

#### Boolean Fields

- **Accepted Values**: `true`, `false` (case-insensitive)
- **Alternative Values**: `TRUE`, `False`, `1`, `0` also accepted
- **Default Value**: Empty field defaults to `false` for boolean fields

#### Email Fields

- **Format Validation**: Must be valid email format: `user@domain.com`
- **Uniqueness**: Email addresses must be unique across all users
- **Case Handling**: Email addresses are case-insensitive

### Sample CSV Format Examples

#### Properly Formatted CSV

```csv
usr_id,usr_code,usr_first_name,usr_last_name,usr_email,usr_is_admin,tms_id,rls_id
1,JDO,John,Doe,john.doe@company.com,true,1,1
2,JSM,Jane,Smith,jane.smith@company.com,false,2,
3,RJO,Robert,"Johnson, Jr.",robert.johnson@company.com,FALSE,3,2
```

#### Common Formatting Errors

```csv
# INCORRECT - Don't quote numeric fields
usr_id,usr_code,usr_first_name,usr_last_name,usr_email
"1","JDO","John","Doe","john.doe@company.com"

# INCORRECT - Don't use NULL for empty values
usr_id,usr_code,usr_first_name,usr_last_name,usr_email,tms_id
1,JDO,John,Doe,john.doe@company.com,NULL

# CORRECT - Leave empty fields blank
usr_id,usr_code,usr_first_name,usr_last_name,usr_email,tms_id
1,JDO,John,Doe,john.doe@company.com,
```

---

## Import Process Workflow

### Complete Import Workflow

1. **Download Templates**

   ```bash
   # Download all templates
   curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/templates/teams" -o teams_template.csv
   curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/templates/applications" -o applications_template.csv
   curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/templates/environments" -o environments_template.csv
   curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/templates/users" -o users_template.csv
   ```

2. **Prepare Data Files**
   - Replace template data with actual organizational data
   - Validate data format and field requirements
   - Check foreign key dependencies (users → teams)
   - Save as new files (e.g., `teams_prepared.csv`)

3. **Import in Dependency Order**

   ```bash
   # Step 1: Import Teams (no dependencies)
   curl -X POST "http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/teams" \
     -H "Content-Type: text/csv" \
     --data-binary @teams_prepared.csv

   # Step 2: Import Applications (no dependencies)
   curl -X POST "http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/applications" \
     -H "Content-Type: text/csv" \
     --data-binary @applications_prepared.csv

   # Step 3: Import Environments (no dependencies)
   curl -X POST "http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/environments" \
     -H "Content-Type: text/csv" \
     --data-binary @environments_prepared.csv

   # Step 4: Import Users (depends on teams)
   curl -X POST "http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/users" \
     -H "Content-Type: text/csv" \
     --data-binary @users_prepared.csv
   ```

4. **Validate Import Results**

   ```bash
   # Check import history
   curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/history"

   # Get import statistics
   curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/statistics"
   ```

### Batch Import Alternative

For advanced users, import all entities in a single operation:

```bash
curl -X POST "http://localhost:8090/rest/scriptrunner/latest/custom/import/csv/all" \
  -H "Content-Type: application/json" \
  -d '{
    "teams": "tms_id,tms_name,tms_email,tms_description\n1,Platform Engineering,platform-eng@company.com,Core platform engineering team",
    "applications": "app_id,app_code,app_name,app_description\n1,CRM001,Customer CRM,Customer relationship management system",
    "environments": "env_id,env_code,env_name,env_description\n1,DEV,Development,Development environment",
    "users": "usr_id,usr_code,usr_first_name,usr_last_name,usr_email,usr_is_admin,tms_id,rls_id\n1,JDO,John,Doe,john.doe@company.com,true,1,1"
  }'
```

---

## Error Handling and Troubleshooting

### Common Import Errors

#### 1. Foreign Key Constraint Violations

**Error Message**:

```json
{
  "success": false,
  "error": "Foreign key constraint violation",
  "details": "Referenced team does not exist for user import"
}
```

**Cause**: User references team ID that doesn't exist  
**Resolution**:

- Ensure teams are imported first
- Verify tms_id values in users CSV match existing teams
- Check for typos in team ID references

#### 2. Duplicate Key Violations

**Error Message**:

```json
{
  "success": false,
  "error": "Duplicate data detected",
  "details": "Team name 'Platform Engineering' already exists"
}
```

**Cause**: Attempting to import duplicate records  
**Resolution**:

- Check for duplicate records in CSV file
- Remove or modify duplicate entries
- Consider if re-import is necessary

#### 3. Data Validation Failures

**Error Message**:

```json
{
  "success": false,
  "error": "Invalid data format",
  "details": "Email address 'invalid-email' is not valid"
}
```

**Cause**: Data doesn't meet field validation requirements  
**Resolution**:

- Validate email addresses are properly formatted
- Check field length restrictions
- Ensure required fields are not empty

#### 4. CSV Format Issues

**Error Message**:

```json
{
  "success": false,
  "error": "Invalid CSV format",
  "details": "Missing required column: tms_name"
}
```

**Cause**: CSV structure doesn't match template  
**Resolution**:

- Verify column headers match template exactly
- Check for missing or extra columns
- Ensure proper CSV encoding (UTF-8)

### Troubleshooting Steps

1. **Validate CSV Format**
   - Use CSV validator tool to check file structure
   - Verify column headers match template exactly
   - Check for proper UTF-8 encoding

2. **Check Data Dependencies**
   - Verify import order: Teams → Applications → Environments → Users
   - Validate foreign key references exist
   - Check for circular dependencies

3. **Review Import Statistics**

   ```bash
   curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/statistics"
   ```

   - Check success/failure rates
   - Review processing times
   - Identify patterns in errors

4. **Examine Detailed Import History**
   ```bash
   curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/import/history?limit=50"
   ```

   - Review recent imports
   - Check error messages and details
   - Identify successful import patterns

### Recovery Procedures

#### Rollback Failed Import

```bash
# Rollback specific import batch
curl -X POST "http://localhost:8090/rest/scriptrunner/latest/custom/import/rollback/{batchId}" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Data validation errors require corrections"}'
```

#### Re-import Corrected Data

1. Fix data issues identified in error messages
2. Validate corrected CSV files locally
3. Re-execute import in proper dependency order
4. Monitor import progress and validate results

---

## Advanced Usage Patterns

### Incremental Data Updates

For ongoing maintenance and updates:

1. **Export Current Data**: Extract current system state
2. **Prepare Delta**: Create CSV with only new/changed records
3. **Validate Dependencies**: Ensure referential integrity
4. **Import Changes**: Execute incremental import
5. **Verify Results**: Validate import success and data integrity

### Template Customization

While templates provide standard formats, they can be customized for specific needs:

1. **Additional Fields**: Add custom fields as needed (ensure database schema supports them)
2. **Default Values**: Pre-populate common values to reduce data entry
3. **Data Validation**: Add client-side validation before import
4. **Batch Processing**: Combine multiple entity types for complex imports

### Integration with External Systems

Templates can be generated from external systems:

1. **ERP Integration**: Export user/team data from HR systems
2. **LDAP/AD Integration**: Extract organizational structure
3. **Project Management**: Import team assignments from PM tools
4. **Version Control**: Generate team data from Git repositories

### Data Migration Scenarios

#### Initial System Setup

- Import complete organizational structure
- Establish all base entities before migration data
- Validate relationships and data integrity
- Test with subset before full import

#### Organizational Restructuring

- Export current structure
- Modify team assignments and hierarchies
- Import updated organizational data
- Validate new structure and relationships

#### System Integration

- Map external system entities to UMIG structure
- Transform external data to CSV format
- Execute phased import with validation
- Verify integration success and data consistency

---

## Quality Assurance

### Data Validation Checklist

#### Pre-Import Validation

- [ ] **CSV Format**: Valid UTF-8 encoding, proper headers
- [ ] **Required Fields**: All mandatory fields populated
- [ ] **Data Types**: Correct data types for each field
- [ ] **Field Lengths**: Values within maximum length limits
- [ ] **Unique Constraints**: No duplicate values in unique fields
- [ ] **Foreign Keys**: Valid references to existing records
- [ ] **Email Formats**: Valid email address format
- [ ] **Boolean Values**: Proper true/false values

#### Post-Import Validation

- [ ] **Import Statistics**: Review success/failure counts
- [ ] **Data Integrity**: Verify relationships are correct
- [ ] **Completeness**: Confirm all expected records imported
- [ ] **Accuracy**: Spot-check sample records for accuracy
- [ ] **System Function**: Test system functionality with imported data

### Testing Procedures

#### Unit Testing

```bash
# Test individual entity imports
./test-csv-import.sh teams_template.csv
./test-csv-import.sh users_template.csv
./test-csv-import.sh applications_template.csv
./test-csv-import.sh environments_template.csv
```

#### Integration Testing

```bash
# Test complete import workflow
./test-complete-import-workflow.sh

# Test dependency handling
./test-foreign-key-dependencies.sh

# Test error handling
./test-import-error-scenarios.sh
```

#### Performance Testing

```bash
# Test large dataset imports
./test-large-csv-import.sh 10000-users.csv

# Test concurrent imports
./test-concurrent-import-operations.sh

# Test system resource usage
./monitor-import-performance.sh
```

---

## Best Practices

### Data Preparation Best Practices

1. **Start Small**: Test with small datasets before full import
2. **Validate Locally**: Check data quality before importing
3. **Backup First**: Create system backup before major imports
4. **Document Changes**: Maintain log of data sources and modifications
5. **Version Control**: Track template and data file versions

### Import Execution Best Practices

1. **Follow Dependencies**: Always import in correct order
2. **Monitor Progress**: Watch for errors and performance issues
3. **Validate Results**: Check import statistics and data integrity
4. **Handle Errors**: Address import errors promptly
5. **Document Process**: Maintain runbooks for repeatable imports

### Maintenance Best Practices

1. **Regular Updates**: Keep templates synchronized with schema changes
2. **Performance Monitoring**: Track import performance over time
3. **Error Analysis**: Review and address recurring import issues
4. **User Training**: Keep users updated on template changes and procedures
5. **System Integration**: Coordinate with other system imports and updates

---

## Support and Resources

### Documentation Resources

- **Import API Specification**: `/docs/api/ImportApi-v2-specification.md`
- **User Workflow Guide**: `/docs/user-guides/import-workflow-guide.md`
- **Admin GUI Integration**: `/docs/admin-gui/import-interface-specification.md`
- **Database Schema**: `/docs/dataModel/README.md`

### Template Locations

- **Templates Directory**: `/local-dev-setup/data-utils/CSV_Templates/`
- **Template Files**: Available for download via API endpoints
- **Sample Data**: Each template includes realistic sample data
- **README Documentation**: Additional details in template directory

### API Endpoints

- **Template Downloads**: `GET /import/templates/{entity}`
- **CSV Imports**: `POST /import/csv/{entity}`
- **Batch Import**: `POST /import/csv/all`
- **Import History**: `GET /import/history`
- **Import Statistics**: `GET /import/statistics`

### Troubleshooting Resources

- **Import History API**: Review past imports and errors
- **System Logs**: Check application logs for detailed error information
- **Database Validation**: Query database directly to verify import results
- **Performance Metrics**: Monitor system performance during imports

### Contact Information

- **Technical Support**: UMIG Development Team
- **System Administration**: Confluence Administrators
- **Documentation Updates**: Create issues for template or documentation improvements
- **Feature Requests**: Submit enhancement requests through project management system

---

## Appendix

### Complete Template Downloads

```bash
#!/bin/bash
# Download all CSV templates

BASE_URL="http://localhost:8090/rest/scriptrunner/latest/custom/import/templates"
TEMPLATES=("teams" "users" "applications" "environments")

for template in "${TEMPLATES[@]}"; do
  echo "Downloading ${template} template..."
  curl -X GET "${BASE_URL}/${template}" -o "${template}_template.csv"
  if [ $? -eq 0 ]; then
    echo "✓ ${template}_template.csv downloaded successfully"
  else
    echo "✗ Failed to download ${template}_template.csv"
  fi
done

echo "All templates downloaded to current directory"
```

### Import Validation Script

```bash
#!/bin/bash
# Validate CSV files before import

validate_csv() {
  local file=$1
  local entity=$2

  echo "Validating ${file} for ${entity} import..."

  # Check file exists
  if [ ! -f "$file" ]; then
    echo "✗ File not found: $file"
    return 1
  fi

  # Check file size
  if [ ! -s "$file" ]; then
    echo "✗ File is empty: $file"
    return 1
  fi

  # Check UTF-8 encoding
  if ! file "$file" | grep -q "UTF-8"; then
    echo "⚠ Warning: File may not be UTF-8 encoded"
  fi

  # Check header row based on entity type
  case $entity in
    "teams")
      if ! head -1 "$file" | grep -q "tms_id,tms_name"; then
        echo "✗ Invalid header for teams CSV"
        return 1
      fi
      ;;
    "users")
      if ! head -1 "$file" | grep -q "usr_id,usr_code,usr_first_name"; then
        echo "✗ Invalid header for users CSV"
        return 1
      fi
      ;;
    "applications")
      if ! head -1 "$file" | grep -q "app_id,app_code"; then
        echo "✗ Invalid header for applications CSV"
        return 1
      fi
      ;;
    "environments")
      if ! head -1 "$file" | grep -q "env_id,env_code"; then
        echo "✗ Invalid header for environments CSV"
        return 1
      fi
      ;;
  esac

  echo "✓ ${file} validation passed"
  return 0
}

# Usage examples
# validate_csv teams_prepared.csv teams
# validate_csv users_prepared.csv users
```

### Import Status Monitoring

```bash
#!/bin/bash
# Monitor import progress

monitor_import() {
  local batch_id=$1

  if [ -z "$batch_id" ]; then
    echo "Usage: monitor_import <batch_id>"
    return 1
  fi

  echo "Monitoring import batch: $batch_id"

  while true; do
    status=$(curl -s "http://localhost:8090/rest/scriptrunner/latest/custom/import/batch/$batch_id" | \
             jq -r '.status' 2>/dev/null)

    case $status in
      "COMPLETED")
        echo "✓ Import completed successfully"
        break
        ;;
      "FAILED")
        echo "✗ Import failed"
        break
        ;;
      "IN_PROGRESS")
        echo "⟳ Import in progress..."
        ;;
      *)
        echo "? Unknown status: $status"
        ;;
    esac

    sleep 5
  done
}

# Usage: monitor_import <batch-id-from-import-response>
```

---

**Document Version**: 2.0.0  
**Last Updated**: September 3, 2025  
**Template Version**: Synchronized with ImportApi v2.0  
**Review Schedule**: Updated when CSV templates or import API changes are implemented

This comprehensive guide provides everything needed to successfully use CSV templates for importing base entity data into the UMIG system, with proper validation, error handling, and best practices for data integrity and system reliability.
