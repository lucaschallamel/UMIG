# US-034 Enhanced Data Import Architecture - User Guide

**Date**: January 16, 2025  
**Status**: ✅ COMPREHENSIVE USER GUIDE COMPLETE - PRODUCTION READY  
**Version**: 2.0 (Database-Backed Queue Management User Documentation)

## Executive Summary

This comprehensive user guide provides step-by-step instructions for using the **US-034 Enhanced Data Import Architecture**. The system features **database-backed queue management**, **real-time monitoring**, **concurrent import processing**, and **enterprise-grade reliability** with complete administrative control.

### Key Features Available

- ✅ **Import Queue Management** - Real-time queue monitoring with job tracking
- ✅ **Concurrent Processing** - Up to 3 simultaneous imports with priority management
- ✅ **Advanced Scheduling** - Cron-like scheduling with recurring import support
- ✅ **Resource Monitoring** - Real-time resource utilization and health tracking
- ✅ **Job Management Interface** - Complete job lifecycle management (create, update, cancel)
- ✅ **Performance Analytics** - Historical performance tracking and optimization
- ✅ **Admin GUI Integration** - Mobile-responsive interface with real-time updates
- ✅ **Audit Trail** - Complete operation logging and compliance tracking

## Getting Started

### Prerequisites

- **User Role**: Confluence user with `["confluence-users"]` group membership
- **Browser**: Modern web browser with JavaScript enabled (Chrome 90+, Firefox 88+, Safari 14+)
- **Permissions**: Import queue management requires admin-level access
- **Network**: Stable connection for real-time monitoring and job submission

### Access Requirements

1. **Login to UMIG**: Navigate to your UMIG Confluence instance
2. **Admin GUI Access**: Import queue management available through Admin GUI
3. **API Access**: 7 REST endpoints available at `/rest/scriptrunner/latest/custom/`
4. **Queue Interface**: Real-time queue monitoring with auto-refresh capabilities

## Import Methods Overview

### 1. JSON Import Methods

| Method                 | Use Case                | File Limit | Batch Limit |
| ---------------------- | ----------------------- | ---------- | ----------- |
| **Single JSON Import** | Individual JSON file    | 50MB       | 1 file      |
| **Batch JSON Import**  | Multiple JSON files     | 50MB total | 1,000 files |
| **Master Plan Import** | Complex migration plans | 50MB       | -           |

### 2. CSV Import Methods

| Method               | Use Case                | File Limit | Row Limit        |
| -------------------- | ----------------------- | ---------- | ---------------- |
| **Teams CSV**        | Team data import        | 10MB       | 10,000 rows      |
| **Users CSV**        | User account import     | 10MB       | 10,000 rows      |
| **Applications CSV** | Application catalog     | 10MB       | 10,000 rows      |
| **Environments CSV** | Environment definitions | 10MB       | 10,000 rows      |
| **All Entities CSV** | Complete entity import  | 10MB each  | 10,000 rows each |

## Step-by-Step Import Instructions

### JSON Import Procedures

#### Single JSON File Import

1. **Prepare Your JSON File**

   ```json
   {
     "source": "migration_data",
     "content": {
       "teams": [
         {
           "team_name": "Infrastructure Team",
           "team_description": "Manages servers and infrastructure",
           "team_lead": "john.doe"
         }
       ],
       "users": [
         {
           "username": "john.doe",
           "display_name": "John Doe",
           "email": "john@company.com",
           "role": "admin"
         }
       ]
     }
   }
   ```

2. **Execute Import via API**

   ```bash
   curl -X POST http://localhost:8090/rest/api/v2/import/json \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer YOUR_TOKEN" \\
        -d @your_data.json
   ```

3. **Monitor Import Progress**
   ```bash
   curl -X GET http://localhost:8090/rest/api/v2/import/batch/{batchId} \\
        -H "Authorization: Bearer YOUR_TOKEN"
   ```

#### Batch JSON Import

1. **Prepare Batch Request**

   ```json
   {
     "files": [
       {
         "filename": "teams.json",
         "content": "{ \"teams\": [...] }"
       },
       {
         "filename": "users.json",
         "content": "{ \"users\": [...] }"
       }
     ],
     "userId": "admin"
   }
   ```

2. **Execute Batch Import**
   ```bash
   curl -X POST http://localhost:8090/rest/api/v2/import/batch \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer YOUR_TOKEN" \\
        -d @batch_request.json
   ```

### CSV Import Procedures

#### Teams CSV Import

1. **Download Template**

   ```bash
   curl -X GET http://localhost:8090/rest/api/v2/import/templates/teams \\
        -H "Authorization: Bearer YOUR_TOKEN" \\
        -o teams_template.csv
   ```

2. **Prepare Your CSV Data**

   ```csv
   team_name,team_description,team_lead
   "Infrastructure Team","Manages servers and infrastructure","john.doe"
   "Development Team","Application development","jane.smith"
   "QA Team","Quality assurance and testing","bob.wilson"
   ```

3. **Import Teams CSV**
   ```bash
   curl -X POST http://localhost:8090/rest/api/v2/import/csv/teams \\
        -H "Content-Type: text/csv" \\
        -H "Authorization: Bearer YOUR_TOKEN" \\
        --data-binary @teams.csv
   ```

#### Users CSV Import (Requires Teams First)

1. **Download Template**

   ```bash
   curl -X GET http://localhost:8090/rest/api/v2/import/templates/users \\
        -H "Authorization: Bearer YOUR_TOKEN" \\
        -o users_template.csv
   ```

2. **Prepare Users CSV (After Teams Import)**

   ```csv
   username,display_name,email,role
   "john.doe","John Doe","john@company.com","admin"
   "jane.smith","Jane Smith","jane@company.com","user"
   "bob.wilson","Bob Wilson","bob@company.com","user"
   ```

3. **Import Users CSV**
   ```bash
   curl -X POST http://localhost:8090/rest/api/v2/import/csv/users \\
        -H "Content-Type: text/csv" \\
        -H "Authorization: Bearer YOUR_TOKEN" \\
        --data-binary @users.csv
   ```

#### All Entities CSV Import (Batch)

1. **Prepare Combined Request**

   ```json
   {
     "teams": "team_name,team_description,team_lead\\n...",
     "users": "username,display_name,email,role\\n...",
     "applications": "app_name,app_description,app_owner\\n...",
     "environments": "env_name,env_description,env_type\\n..."
   }
   ```

2. **Execute Combined Import**
   ```bash
   curl -X POST http://localhost:8090/rest/api/v2/import/csv/all \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer YOUR_TOKEN" \\
        -d @all_entities.json
   ```

## Large File Import Guidelines

### File Size Management

#### Optimal File Sizes for Best Performance

| File Type            | Recommended Size | Maximum Size | Processing Method   |
| -------------------- | ---------------- | ------------ | ------------------- |
| **JSON Files**       | <5MB             | 50MB         | Chunked processing  |
| **CSV Files**        | <2MB             | 10MB         | Streaming parser    |
| **Batch Operations** | <20MB total      | 50MB total   | Parallel processing |

#### Large File Processing Strategies

1. **Split Large Files** - Divide files larger than recommended sizes:

   ```bash
   # Split large CSV file into smaller chunks
   split -l 5000 large_file.csv chunk_

   # Import each chunk separately
   for file in chunk_*; do
       curl -X POST http://localhost:8090/rest/api/v2/import/csv/teams \\
            -H "Content-Type: text/csv" \\
            --data-binary @$file
   done
   ```

2. **Use Batch Import** - Combine multiple smaller files:

   ```json
   {
     "files": [
       { "filename": "batch1.json", "content": "..." },
       { "filename": "batch2.json", "content": "..." },
       { "filename": "batch3.json", "content": "..." }
     ]
   }
   ```

3. **Monitor Memory Usage** - Track system resources during large imports:
   ```bash
   # Check import statistics during large operations
   curl -X GET http://localhost:8090/rest/api/v2/import/statistics
   ```

### Large Dataset Best Practices

#### Memory-Efficient Import Patterns

1. **Sequential Processing** - Import entities in dependency order:

   ```
   1. Teams (base entities)
   2. Users (depends on Teams)
   3. Applications (independent)
   4. Environments (independent)
   ```

2. **Chunked Processing** - Break large datasets into manageable chunks:

   ```bash
   # Process 1000 records at a time
   for i in {0..9}; do
       start=$((i * 1000))
       end=$((start + 999))
       sed -n "${start},${end}p" large_dataset.csv > chunk_${i}.csv
       # Import chunk_${i}.csv
   done
   ```

3. **Progress Monitoring** - Track large import operations:

   ```bash
   # Start import and capture batch ID
   BATCH_ID=$(curl -X POST .../import/batch | jq -r '.batchId')

   # Monitor progress
   while true; do
       STATUS=$(curl -X GET .../import/batch/${BATCH_ID} | jq -r '.status')
       echo "Import status: $STATUS"
       if [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ]; then
           break
       fi
       sleep 5
   done
   ```

## Concurrent Import Coordination

### Multi-User Import Management

#### Understanding Import Conflicts

**Potential Conflicts**:

- Multiple users importing the same entity types simultaneously
- Overlapping data that could create duplicates
- Resource contention during large import operations

#### Coordination Strategies

1. **Check Active Imports Before Starting**

   ```bash
   # Check for active import operations
   curl -X GET http://localhost:8090/rest/api/v2/import/history?status=IN_PROGRESS
   ```

2. **Coordinate Import Timing**

   ```bash
   # Schedule imports during low-usage periods
   # Check system load before starting
   curl -X GET http://localhost:8090/rest/api/v2/import/statistics
   ```

3. **Use Import Comments for Coordination**
   ```json
   {
     "files": [...],
     "userId": "admin",
     "comment": "Weekly team data update - coordinated with Jane"
   }
   ```

#### Import Queue Management

1. **Sequential Import Pattern** - One user at a time:

   ```bash
   # Wait for previous import to complete
   while [ $(curl -s .../import/history?status=IN_PROGRESS | jq length) -gt 0 ]; do
       echo "Waiting for active imports to complete..."
       sleep 30
   done

   # Start your import
   curl -X POST .../import/batch -d @your_data.json
   ```

2. **Parallel Import by Entity Type** - Different users, different entities:

   ```
   User A: Teams and Users
   User B: Applications
   User C: Environments
   ```

3. **Scheduled Import Windows** - Time-based coordination:
   ```
   Morning (8-10 AM): Team data imports
   Afternoon (2-4 PM): Application data imports
   Evening (6-8 PM): Environment data imports
   ```

## Preview Functionality

### Data Validation Before Import

#### Using Preview Mode

1. **Preview JSON Import**

   ```bash
   curl -X POST http://localhost:8090/rest/api/v2/import/json/preview \\
        -H "Content-Type: application/json" \\
        -d @your_data.json
   ```

2. **Preview CSV Import**
   ```bash
   curl -X POST http://localhost:8090/rest/api/v2/import/csv/teams/preview \\
        -H "Content-Type: text/csv" \\
        --data-binary @teams.csv
   ```

#### Preview Response Analysis

```json
{
  "preview": {
    "recordCount": 150,
    "validRecords": 145,
    "invalidRecords": 5,
    "duplicates": 2,
    "errors": [
      {
        "row": 23,
        "error": "Missing required field: team_lead",
        "data": "Infrastructure Team,Manages servers,"
      }
    ],
    "warnings": [
      {
        "row": 45,
        "warning": "Duplicate team name detected",
        "data": "Development Team,Application development,jane.smith"
      }
    ]
  },
  "estimated": {
    "processingTime": "12 seconds",
    "memoryUsage": "8.5 MB"
  }
}
```

#### Using Preview Results

1. **Fix Data Issues** - Address errors and warnings before import
2. **Validate Estimates** - Confirm processing time and resource usage
3. **Proceed with Confidence** - Import validated data

## Import Status Monitoring

### Real-time Progress Tracking

#### Monitoring Active Imports

1. **Get Import Status**

   ```bash
   curl -X GET http://localhost:8090/rest/api/v2/import/batch/{batchId}
   ```

2. **Monitor Import Progress**
   ```json
   {
     "batchId": "550e8400-e29b-41d4-a716-446655440000",
     "status": "IN_PROGRESS",
     "progress": {
       "currentStep": "Processing Teams",
       "completedRecords": 75,
       "totalRecords": 150,
       "percentComplete": 50.0,
       "estimatedTimeRemaining": "30 seconds"
     },
     "performance": {
       "startTime": "2025-09-04T10:15:30Z",
       "processingRate": "2.5 records/second",
       "memoryUsage": "15.2 MB"
     }
   }
   ```

#### Import History and Analytics

1. **View Import History**

   ```bash
   curl -X GET "http://localhost:8090/rest/api/v2/import/history?limit=10"
   ```

2. **Get Import Statistics**

   ```bash
   curl -X GET http://localhost:8090/rest/api/v2/import/statistics
   ```

3. **Performance Analytics**
   ```json
   {
     "totalImports": 45,
     "successRate": 97.8,
     "averageProcessingTime": "8.5 seconds",
     "totalRecordsImported": 12750,
     "performance": {
       "averageSpeed": "3.2 records/second",
       "peakSpeed": "5.8 records/second",
       "averageMemoryUsage": "12.3 MB"
     }
   }
   ```

## Rollback Procedures

### Complete Import Reversal

#### When to Use Rollback

- **Data Import Errors** - Incorrect or corrupted data imported
- **Duplicate Data** - Accidental duplicate imports
- **Test Data Cleanup** - Remove test import data
- **Migration Corrections** - Reverse incorrect migration data

#### Rollback Execution

1. **Identify Batch to Rollback**

   ```bash
   # Find the batch ID from import history
   curl -X GET http://localhost:8090/rest/api/v2/import/history
   ```

2. **Execute Rollback**

   ```bash
   curl -X POST http://localhost:8090/rest/api/v2/import/rollback/{batchId} \\
        -H "Content-Type: application/json" \\
        -d '{
          "reason": "Incorrect team data imported",
          "userId": "admin"
        }'
   ```

3. **Verify Rollback Completion**
   ```bash
   curl -X GET http://localhost:8090/rest/api/v2/import/batch/{batchId}
   ```

#### Rollback Response Analysis

```json
{
  "rollback": {
    "batchId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "ROLLED_BACK",
    "recordsRemoved": 150,
    "tablesAffected": ["tbl_teams", "tbl_users"],
    "rollbackTime": "2025-09-04T11:30:45Z"
  },
  "audit": {
    "rollbackBy": "admin",
    "rollbackReason": "Incorrect team data imported",
    "originalImportDate": "2025-09-04T10:15:30Z",
    "rollbackDuration": "2.3 seconds"
  }
}
```

## Troubleshooting Guide

### Common Import Issues

#### File Format Errors

**Issue**: Invalid file format or encoding

```json
{
  "error": "Invalid CSV format - missing required headers",
  "securityCode": "VALIDATION_ERROR"
}
```

**Solution**:

1. Download CSV template using `/import/templates/{entity}` endpoint
2. Verify CSV headers match template exactly
3. Check file encoding (UTF-8 required)
4. Validate CSV structure with preview mode

#### Security Validation Failures

**Issue**: File size or security validation errors

```json
{
  "error": "CSV content exceeds 10MB maximum size limit",
  "threatLevel": "MEDIUM",
  "securityCode": "CSV_SIZE_VIOLATION"
}
```

**Solutions**:

- **File Size**: Split large files into smaller chunks (see Large File Guidelines)
- **File Extension**: Use only .json, .csv, or .txt files
- **Path Traversal**: Use simple filenames without special characters
- **Request Size**: Keep total request under 50MB limit

#### Memory and Performance Issues

**Issue**: Import operations timeout or fail due to memory

```json
{
  "error": "Import operation timed out after 60 seconds",
  "details": "Consider reducing file size or using chunked processing"
}
```

**Solutions**:

1. **Reduce File Size** - Split into smaller chunks
2. **Use Streaming Mode** - Enable for large CSV files
3. **Schedule During Off-Hours** - Avoid peak usage times
4. **Monitor System Resources** - Check `/import/statistics` before large imports

#### Data Dependency Errors

**Issue**: Missing required dependencies

```json
{
  "error": "Cannot import users - required teams not found",
  "details": "Import teams before importing users"
}
```

**Solution**:

1. **Follow Import Order**: Teams → Users → Applications → Environments
2. **Verify Dependencies**: Check that required entities exist
3. **Use Combined Import**: Use `/import/csv/all` for automatic sequencing

#### Concurrent Import Conflicts

**Issue**: Multiple imports running simultaneously

```json
{
  "error": "Import conflict detected - another import in progress",
  "suggestion": "Wait for current import to complete or coordinate with other users"
}
```

**Solutions**:

1. **Check Active Imports**: Use `/import/history?status=IN_PROGRESS`
2. **Coordinate with Team**: Communicate with other administrators
3. **Schedule Imports**: Use different time windows for different users
4. **Monitor Queue**: Use import statistics to plan timing

### Performance Optimization Tips

#### For Large File Imports

1. **Use Optimal File Sizes**
   - JSON: 5MB chunks for best performance
   - CSV: 2MB chunks recommended
   - Total request: <20MB for optimal response times

2. **Monitor System Resources**

   ```bash
   # Check system performance before large imports
   curl -X GET http://localhost:8090/rest/api/v2/import/statistics
   ```

3. **Use Batch Processing**
   - Combine multiple small files rather than one large file
   - Process during low-usage hours for better performance

#### For High-Volume Operations

1. **Enable Parallel Processing** - Available automatically for batch imports
2. **Use Streaming Mode** - Enabled by default for CSV imports >1MB
3. **Monitor Memory Usage** - Check progress regularly for large imports
4. **Plan Import Timing** - Avoid peak system usage periods

### Error Code Reference

| Error Code                 | Meaning                         | Solution                         |
| -------------------------- | ------------------------------- | -------------------------------- |
| `INPUT_SIZE_VIOLATION`     | File/request too large          | Split into smaller files         |
| `FILE_EXTENSION_VIOLATION` | Invalid file type               | Use only .json, .csv, .txt files |
| `PATH_TRAVERSAL_VIOLATION` | Security path validation failed | Use simple filenames             |
| `CSV_SIZE_VIOLATION`       | CSV file exceeds 10MB           | Split CSV into smaller files     |
| `CSV_ROWS_VIOLATION`       | CSV exceeds 10,000 rows         | Process in chunks                |
| `BATCH_SIZE_VIOLATION`     | Batch exceeds 1,000 files       | Reduce batch size                |
| `VALIDATION_ERROR`         | Data format validation failed   | Fix data format, use templates   |

## Best Practices Summary

### Data Preparation Best Practices

1. **Use Templates** - Always download and use official CSV templates
2. **Validate Data** - Use preview mode to check data before import
3. **Follow Dependencies** - Import entities in correct order (Teams → Users)
4. **Test with Small Sets** - Validate process with small datasets first
5. **Backup Before Import** - Consider data backup before large imports

### Import Execution Best Practices

1. **Monitor Progress** - Track import status for long operations
2. **Check System Load** - Verify system capacity before large imports
3. **Coordinate with Team** - Communicate with other administrators
4. **Document Imports** - Keep records of import activities
5. **Verify Results** - Confirm data accuracy after import completion

### Security and Compliance Best Practices

1. **Validate File Sources** - Ensure data comes from trusted sources
2. **Review Data Content** - Check for sensitive information before import
3. **Use Appropriate Permissions** - Ensure proper authorization for import operations
4. **Monitor Security Logs** - Review security events after imports
5. **Follow Change Management** - Use proper approval processes for production imports

---

**User Guide Status**: COMPLETE ✅  
**Target Users**: UMIG Administrators and Power Users  
**Review Date**: March 2026 (or upon significant feature updates)  
**Support**: Contact UMIG Support Team for additional assistance
