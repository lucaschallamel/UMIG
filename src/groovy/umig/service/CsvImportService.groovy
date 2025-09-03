package umig.service

import groovy.sql.Sql
import umig.utils.DatabaseUtil
import umig.repository.ImportRepository
import org.slf4j.Logger
import org.slf4j.LoggerFactory

/**
 * Service for importing base entity data from CSV files
 * Handles Teams, Users, Applications, and Environments
 * Uses native Groovy CSV parsing compatible with ScriptRunner environment
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034
 */
class CsvImportService {
    
    private static final Logger log = LoggerFactory.getLogger(CsvImportService.class)
    
    private ImportRepository importRepository
    
    CsvImportService() {
        this.importRepository = new ImportRepository()
    }
    
    /**
     * Native Groovy CSV parser compatible with ScriptRunner environment
     * Handles quoted fields, escaped quotes, and embedded commas
     * 
     * @param csvContent The CSV content as a string
     * @return List of String arrays, each representing a row
     */
    private List<String[]> parseCsvContent(String csvContent) {
        if (!csvContent?.trim()) {
            return []
        }
        
        List<String[]> rows = []
        String[] lines = csvContent.split(/\r?\n/)
        
        for (String line : lines) {
            if (line.trim().isEmpty()) {
                continue // Skip empty lines
            }
            
            List<String> fields = []
            StringBuilder currentField = new StringBuilder()
            boolean inQuotes = false
            boolean escapeNext = false
            
            for (int i = 0; i < line.length(); i++) {
                char c = line.charAt(i)
                
                if (escapeNext) {
                    currentField.append(c)
                    escapeNext = false
                } else if (c == '\\') {
                    escapeNext = true
                } else if (c == '"') {
                    inQuotes = !inQuotes
                } else if (c == ',' && !inQuotes) {
                    fields.add(currentField.toString().trim())
                    currentField = new StringBuilder()
                } else {
                    currentField.append(c)
                }
            }
            
            // Add the last field
            fields.add(currentField.toString().trim())
            rows.add(fields as String[])
        }
        
        return rows
    }
    
    /**
     * Import teams from CSV content
     * 
     * @param csvContent CSV content as string
     * @param importSource Source identifier
     * @param userId User performing the import
     * @return Map containing import results
     */
    Map importTeams(String csvContent, String importSource, String userId) {
        log.info("Importing teams from CSV: ${importSource}")
        
        Map result = [
            success: false,
            source: importSource,
            recordsProcessed: 0,
            recordsImported: 0,
            recordsSkipped: 0,
            errors: []
        ]
        
        try {
            List<String[]> rows = parseCsvContent(csvContent)
            
            if (rows.isEmpty()) {
                ((List) result.errors) << "No data found in CSV content"
                return result
            }
            
            String[] headers = rows[0]
            
            // Validate headers
            if (!validateTeamsHeaders(headers)) {
                ((List) result.errors) << "Invalid CSV headers. Expected: tms_id,tms_name,tms_email,tms_description"
                return result
            }
            
            DatabaseUtil.withSql { Sql sql ->
                sql.withTransaction {
                    // Create import batch
                    UUID batchId = importRepository.createImportBatch(
                        sql,
                        importSource,
                        'CSV_TEAMS',
                        userId
                    )
                    result.batchId = batchId
                    
                    // Skip header row and process data rows
                    for (int i = 1; i < rows.size(); i++) {
                        String[] row = rows[i]
                        result.recordsProcessed = ((Integer) result.recordsProcessed) + 1
                        
                        try {
                            // Validate row data
                            if (row.length < 4) {
                                ((List) result.errors) << "Row ${result.recordsProcessed}: Insufficient columns"
                                result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                                continue
                            }
                            
                            // Check if team already exists
                            def existing = sql.firstRow(
                                "SELECT tms_id FROM teams_tms WHERE tms_name = ?",
                                [row[1]]
                            )
                            
                            if (existing) {
                                log.info("Team already exists: ${row[1]}")
                                result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                                continue
                            }
                            
                            // Insert team
                            sql.executeInsert("""
                                INSERT INTO teams_tms (tms_name, tms_email, tms_description)
                                VALUES (?, ?, ?)
                            """, [row[1], row[2], row[3]])
                            
                            result.recordsImported = ((Integer) result.recordsImported) + 1
                            
                        } catch (Exception e) {
                            ((List) result.errors) << "Row ${result.recordsProcessed}: ${e.message}"
                            result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                        }
                    }
                    
                    // Update batch status
                    Map statistics = [
                        recordsProcessed: result.recordsProcessed,
                        recordsImported: result.recordsImported,
                        recordsSkipped: result.recordsSkipped
                    ]
                    
                    importRepository.updateImportBatchStatus(
                        sql,
                        batchId,
                        (result.recordsImported as Integer) > 0 ? 'COMPLETED' : 'FAILED',
                        statistics
                    )
                    
                    result.success = (result.recordsImported as Integer) > 0
                }
            }
            
        } catch (Exception e) {
            log.error("Failed to import teams: ${e.message}", e)
            ((List) result.errors) << "Import failed: ${e.message}"
        }
        
        return result
    }
    
    /**
     * Import users from CSV content
     * 
     * @param csvContent CSV content as string
     * @param importSource Source identifier
     * @param userId User performing the import
     * @return Map containing import results
     */
    Map importUsers(String csvContent, String importSource, String userId) {
        log.info("Importing users from CSV: ${importSource}")
        
        Map result = [
            success: false,
            source: importSource,
            recordsProcessed: 0,
            recordsImported: 0,
            recordsSkipped: 0,
            errors: []
        ]
        
        try {
            List<String[]> rows = parseCsvContent(csvContent)
            
            if (rows.isEmpty()) {
                ((List) result.errors) << "No data found in CSV content"
                return result
            }
            
            String[] headers = rows[0]
            
            // Validate headers
            if (!validateUsersHeaders(headers)) {
                ((List) result.errors) << "Invalid CSV headers. Expected: usr_id,usr_code,usr_first_name,usr_last_name,usr_email,usr_is_admin,tms_id,rls_id"
                return result
            }
            
            DatabaseUtil.withSql { Sql sql ->
                sql.withTransaction {
                    // Create import batch
                    UUID batchId = importRepository.createImportBatch(
                        sql,
                        importSource,
                        'CSV_USERS',
                        userId
                    )
                    result.batchId = batchId
                    
                    // Skip header row and process data rows
                    for (int i = 1; i < rows.size(); i++) {
                        String[] row = rows[i]
                        result.recordsProcessed = ((Integer) result.recordsProcessed) + 1
                        
                        try {
                            // Validate row data
                            if (row.length < 8) {
                                ((List) result.errors) << "Row ${result.recordsProcessed}: Insufficient columns"
                                result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                                continue
                            }
                            
                            // Check if user already exists
                            def existing = sql.firstRow(
                                "SELECT usr_id FROM users_usr WHERE usr_email = ?",
                                [row[4]]
                            )
                            
                            if (existing) {
                                log.info("User already exists: ${row[4]}")
                                result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                                continue
                            }
                            
                            // Validate team exists if specified
                            if (row[6] && !row[6].isEmpty()) {
                                def team = sql.firstRow(
                                    "SELECT tms_id FROM teams_tms WHERE tms_id = ?",
                                    [Integer.parseInt(row[6])]
                                )
                                if (!team) {
                                    ((List) result.errors) << "Row ${result.recordsProcessed}: Team ${row[6]} not found"
                                    result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                                    continue
                                }
                            }
                            
                            // Insert user
                            sql.executeInsert("""
                                INSERT INTO users_usr (
                                    usr_code, usr_first_name, usr_last_name, 
                                    usr_email, usr_is_admin, tms_id, rls_id
                                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                            """, [
                                row[1], row[2], row[3], row[4],
                                Boolean.parseBoolean(row[5]),
                                row[6] ? Integer.parseInt(row[6]) : null,
                                row[7] ? Integer.parseInt(row[7]) : null
                            ])
                            
                            result.recordsImported = ((Integer) result.recordsImported) + 1
                            
                        } catch (Exception e) {
                            ((List) result.errors) << "Row ${result.recordsProcessed}: ${e.message}"
                            result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                        }
                    }
                    
                    // Update batch status
                    Map statistics = [
                        recordsProcessed: result.recordsProcessed,
                        recordsImported: result.recordsImported,
                        recordsSkipped: result.recordsSkipped
                    ]
                    
                    importRepository.updateImportBatchStatus(
                        sql,
                        batchId,
                        (result.recordsImported as Integer) > 0 ? 'COMPLETED' : 'FAILED',
                        statistics
                    )
                    
                    result.success = (result.recordsImported as Integer) > 0
                }
            }
            
        } catch (Exception e) {
            log.error("Failed to import users: ${e.message}", e)
            ((List) result.errors) << "Import failed: ${e.message}"
        }
        
        return result
    }
    
    /**
     * Import applications from CSV content
     */
    Map importApplications(String csvContent, String importSource, String userId) {
        log.info("Importing applications from CSV: ${importSource}")
        
        Map result = [
            success: false,
            source: importSource,
            recordsProcessed: 0,
            recordsImported: 0,
            recordsSkipped: 0,
            errors: []
        ]
        
        try {
            List<String[]> rows = parseCsvContent(csvContent)
            
            if (rows.isEmpty()) {
                ((List) result.errors) << "No data found in CSV content"
                return result
            }
            
            String[] headers = rows[0]
            
            if (!validateApplicationsHeaders(headers)) {
                ((List) result.errors) << "Invalid CSV headers. Expected: app_id,app_code,app_name,app_description"
                return result
            }
            
            DatabaseUtil.withSql { Sql sql ->
                sql.withTransaction {
                    UUID batchId = importRepository.createImportBatch(
                        sql,
                        importSource,
                        'CSV_APPLICATIONS',
                        userId
                    )
                    result.batchId = batchId
                    
                    // Skip header row and process data rows
                    for (int i = 1; i < rows.size(); i++) {
                        String[] row = rows[i]
                        result.recordsProcessed = ((Integer) result.recordsProcessed) + 1
                        
                        try {
                            if (row.length < 4) {
                                ((List) result.errors) << "Row ${result.recordsProcessed}: Insufficient columns"
                                result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                                continue
                            }
                            
                            def existing = sql.firstRow(
                                "SELECT app_id FROM applications_app WHERE app_code = ?",
                                [row[1]]
                            )
                            
                            if (existing) {
                                log.info("Application already exists: ${row[1]}")
                                result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                                continue
                            }
                            
                            sql.executeInsert("""
                                INSERT INTO applications_app (app_code, app_name, app_description)
                                VALUES (?, ?, ?)
                            """, [row[1], row[2], row[3]])
                            
                            result.recordsImported = ((Integer) result.recordsImported) + 1
                            
                        } catch (Exception e) {
                            ((List) result.errors) << "Row ${result.recordsProcessed}: ${e.message}"
                            result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                        }
                    }
                    
                    Map statistics = [
                        recordsProcessed: result.recordsProcessed,
                        recordsImported: result.recordsImported,
                        recordsSkipped: result.recordsSkipped
                    ]
                    
                    importRepository.updateImportBatchStatus(
                        sql,
                        batchId,
                        (result.recordsImported as Integer) > 0 ? 'COMPLETED' : 'FAILED',
                        statistics
                    )
                    
                    result.success = (result.recordsImported as Integer) > 0
                }
            }
            
        } catch (Exception e) {
            log.error("Failed to import applications: ${e.message}", e)
            ((List) result.errors) << "Import failed: ${e.message}"
        }
        
        return result
    }
    
    /**
     * Import environments from CSV content
     */
    Map importEnvironments(String csvContent, String importSource, String userId) {
        log.info("Importing environments from CSV: ${importSource}")
        
        Map result = [
            success: false,
            source: importSource,
            recordsProcessed: 0,
            recordsImported: 0,
            recordsSkipped: 0,
            errors: []
        ]
        
        try {
            List<String[]> rows = parseCsvContent(csvContent)
            
            if (rows.isEmpty()) {
                ((List) result.errors) << "No data found in CSV content"
                return result
            }
            
            String[] headers = rows[0]
            
            if (!validateEnvironmentsHeaders(headers)) {
                ((List) result.errors) << "Invalid CSV headers. Expected: env_id,env_code,env_name,env_description"
                return result
            }
            
            DatabaseUtil.withSql { Sql sql ->
                sql.withTransaction {
                    UUID batchId = importRepository.createImportBatch(
                        sql,
                        importSource,
                        'CSV_ENVIRONMENTS',
                        userId
                    )
                    result.batchId = batchId
                    
                    // Skip header row and process data rows
                    for (int i = 1; i < rows.size(); i++) {
                        String[] row = rows[i]
                        result.recordsProcessed = ((Integer) result.recordsProcessed) + 1
                        
                        try {
                            if (row.length < 4) {
                                ((List) result.errors) << "Row ${result.recordsProcessed}: Insufficient columns"
                                result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                                continue
                            }
                            
                            def existing = sql.firstRow(
                                "SELECT env_id FROM environments_env WHERE env_code = ?",
                                [row[1]]
                            )
                            
                            if (existing) {
                                log.info("Environment already exists: ${row[1]}")
                                result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                                continue
                            }
                            
                            sql.executeInsert("""
                                INSERT INTO environments_env (env_code, env_name, env_description)
                                VALUES (?, ?, ?)
                            """, [row[1], row[2], row[3]])
                            
                            result.recordsImported = ((Integer) result.recordsImported) + 1
                            
                        } catch (Exception e) {
                            ((List) result.errors) << "Row ${result.recordsProcessed}: ${e.message}"
                            result.recordsSkipped = ((Integer) result.recordsSkipped) + 1
                        }
                    }
                    
                    Map statistics = [
                        recordsProcessed: result.recordsProcessed,
                        recordsImported: result.recordsImported,
                        recordsSkipped: result.recordsSkipped
                    ]
                    
                    importRepository.updateImportBatchStatus(
                        sql,
                        batchId,
                        (result.recordsImported as Integer) > 0 ? 'COMPLETED' : 'FAILED',
                        statistics
                    )
                    
                    result.success = (result.recordsImported as Integer) > 0
                }
            }
            
        } catch (Exception e) {
            log.error("Failed to import environments: ${e.message}", e)
            ((List) result.errors) << "Import failed: ${e.message}"
        }
        
        return result
    }
    
    /**
     * Import all base entities in proper sequence
     * Teams -> Applications -> Environments -> Users
     */
    Map importAllBaseEntities(Map csvFiles, String userId) {
        log.info("Importing all base entities")
        
        Map result = [
            success: false,
            importOrder: ['teams', 'applications', 'environments', 'users'],
            results: [:],
            totalImported: 0,
            totalSkipped: 0,
            totalErrors: 0
        ]
        
        // Import in dependency order
        if (csvFiles.teams) {
            Map teamsResult = importTeams(csvFiles.teams as String, 'teams.csv', userId)
            result.results['teams'] = teamsResult
            result.totalImported = (result.totalImported as Integer) + (teamsResult.recordsImported as Integer)
            result.totalSkipped = (result.totalSkipped as Integer) + (teamsResult.recordsSkipped as Integer)
            result.totalErrors = (result.totalErrors as Integer) + ((List) teamsResult.errors).size()
        }
        
        if (csvFiles.applications) {
            Map appsResult = importApplications(csvFiles.applications as String, 'applications.csv', userId)
            result.results['applications'] = appsResult
            result.totalImported = (result.totalImported as Integer) + (appsResult.recordsImported as Integer)
            result.totalSkipped = (result.totalSkipped as Integer) + (appsResult.recordsSkipped as Integer)
            result.totalErrors = (result.totalErrors as Integer) + ((List) appsResult.errors).size()
        }
        
        if (csvFiles.environments) {
            Map envsResult = importEnvironments(csvFiles.environments as String, 'environments.csv', userId)
            result.results['environments'] = envsResult
            result.totalImported = (result.totalImported as Integer) + (envsResult.recordsImported as Integer)
            result.totalSkipped = (result.totalSkipped as Integer) + (envsResult.recordsSkipped as Integer)
            result.totalErrors = (result.totalErrors as Integer) + ((List) envsResult.errors).size()
        }
        
        if (csvFiles.users) {
            Map usersResult = importUsers(csvFiles.users as String, 'users.csv', userId)
            result.results['users'] = usersResult
            result.totalImported = (result.totalImported as Integer) + (usersResult.recordsImported as Integer)
            result.totalSkipped = (result.totalSkipped as Integer) + (usersResult.recordsSkipped as Integer)
            result.totalErrors = (result.totalErrors as Integer) + ((List) usersResult.errors).size()
        }
        
        result.success = (result.totalImported as Integer) > 0
        
        return result
    }
    
    // Header validation methods
    private boolean validateTeamsHeaders(String[] headers) {
        return headers != null && headers.length >= 4 &&
               headers[0] == 'tms_id' &&
               headers[1] == 'tms_name' &&
               headers[2] == 'tms_email' &&
               headers[3] == 'tms_description'
    }
    
    private boolean validateUsersHeaders(String[] headers) {
        return headers != null && headers.length >= 8 &&
               headers[0] == 'usr_id' &&
               headers[1] == 'usr_code' &&
               headers[2] == 'usr_first_name' &&
               headers[3] == 'usr_last_name' &&
               headers[4] == 'usr_email' &&
               headers[5] == 'usr_is_admin' &&
               headers[6] == 'tms_id' &&
               headers[7] == 'rls_id'
    }
    
    private boolean validateApplicationsHeaders(String[] headers) {
        return headers != null && headers.length >= 4 &&
               headers[0] == 'app_id' &&
               headers[1] == 'app_code' &&
               headers[2] == 'app_name' &&
               headers[3] == 'app_description'
    }
    
    private boolean validateEnvironmentsHeaders(String[] headers) {
        return headers != null && headers.length >= 4 &&
               headers[0] == 'env_id' &&
               headers[1] == 'env_code' &&
               headers[2] == 'env_name' &&
               headers[3] == 'env_description'
    }
}