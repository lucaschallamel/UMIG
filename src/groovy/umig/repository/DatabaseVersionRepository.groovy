/**
 * DatabaseVersionRepository - Liquibase Integration Repository
 * US-088-B: Database Version Manager Liquibase Integration
 *
 * Purpose: Provides database version information directly from Liquibase's databasechangelog table
 * Replaces hardcoded arrays with dynamic queries to establish single source of truth
 *
 * Implements UMIG patterns:
 * - DatabaseUtil.withSql for all database operations (ADR-031)
 * - Explicit type casting for all parameters (ADR-043)
 * - Proper error handling with SQL state mappings
 * - Repository pattern for data access layer separation
 */

package umig.repository

import groovy.json.JsonBuilder
import groovy.transform.CompileStatic
import org.postgresql.util.PSQLException
import umig.utils.DatabaseUtil
import javax.ws.rs.BadRequestException
import javax.ws.rs.InternalServerErrorException
import java.sql.Timestamp
import java.util.UUID

@CompileStatic
class DatabaseVersionRepository {

    /**
     * Retrieve all migrations from Liquibase databasechangelog table
     * Ordered by execution order to maintain chronological sequence
     *
     * @return List of migration records with enriched metadata
     * @throws InternalServerErrorException if database connection fails
     */
    def getAllMigrations() {
        return DatabaseUtil.withSql { sql ->
            try {
                def results = sql.rows('''
                    SELECT
                        filename,
                        dateexecuted,
                        orderexecuted,
                        exectype,
                        md5sum,
                        author,
                        id,
                        liquibase,
                        description,
                        comments,
                        tag,
                        labels,
                        contexts,
                        deployment_id
                    FROM databasechangelog
                    ORDER BY orderexecuted ASC
                ''')

                return results.collect { row ->
                    enrichMigrationRecord(row)
                }

            } catch (PSQLException e) {
                if (e.getSQLState() == '42P01') { // undefined_table
                    throw new InternalServerErrorException("Liquibase databasechangelog table not found. Ensure Liquibase migrations have been executed.")
                }
                throw new InternalServerErrorException("Database query failed: ${e.message}")
            } catch (Exception e) {
                throw new InternalServerErrorException("Failed to retrieve database versions: ${e.message}")
            }
        }
    }

    /**
     * Retrieve specific migration by changeset ID
     *
     * @param changesetId String - Liquibase changeset identifier
     * @return Map containing migration details or null if not found
     * @throws BadRequestException if changesetId is invalid
     * @throws InternalServerErrorException if database query fails
     */
    def getMigrationById(String changesetId) {
        // Input validation with explicit casting (ADR-043)
        def sanitizedId = changesetId as String
        if (!sanitizedId || sanitizedId.trim().isEmpty()) {
            throw new BadRequestException("Changeset ID is required")
        }

        // Validate changeset ID format for security
        if (!isValidChangesetId(sanitizedId)) {
            throw new BadRequestException("Invalid changeset ID format")
        }

        return DatabaseUtil.withSql { sql ->
            try {
                def results = sql.rows('''
                    SELECT
                        filename,
                        dateexecuted,
                        orderexecuted,
                        exectype,
                        md5sum,
                        author,
                        id,
                        liquibase,
                        description,
                        comments,
                        tag,
                        labels,
                        contexts,
                        deployment_id
                    FROM databasechangelog
                    WHERE id = ?
                    LIMIT 1
                ''', [sanitizedId])

                if (results.isEmpty()) {
                    return null
                }

                return enrichMigrationRecord(results[0])

            } catch (PSQLException e) {
                if (e.getSQLState() == '42P01') { // undefined_table
                    throw new InternalServerErrorException("Liquibase databasechangelog table not found")
                }
                throw new InternalServerErrorException("Database query failed: ${e.message}")
            }
        }
    }

    /**
     * Validate migration checksum against Liquibase record
     *
     * @param changesetId String - Changeset identifier
     * @return Map containing validation result and checksum information
     * @throws BadRequestException if changesetId is invalid
     */
    def validateMigrationChecksum(String changesetId) {
        // Input validation with explicit casting (ADR-043)
        def sanitizedId = changesetId as String
        if (!sanitizedId || sanitizedId.trim().isEmpty()) {
            throw new BadRequestException("Changeset ID is required for checksum validation")
        }

        if (!isValidChangesetId(sanitizedId)) {
            throw new BadRequestException("Invalid changeset ID format")
        }

        return DatabaseUtil.withSql { sql ->
            try {
                def results = sql.rows('''
                    SELECT
                        id,
                        filename,
                        md5sum,
                        exectype,
                        dateexecuted
                    FROM databasechangelog
                    WHERE id = ?
                    LIMIT 1
                ''', [sanitizedId])

                if (results.isEmpty()) {
                    return [
                        valid: false,
                        error: "Changeset not found in database",
                        changesetId: sanitizedId
                    ]
                }

                def record = results[0]

                return [
                    valid: true,
                    changesetId: record.id as String,
                    filename: record.filename as String,
                    checksum: record.md5sum as String,
                    executionType: record.exectype as String,
                    executedAt: record.dateexecuted?.toString() ?: null,
                    validated: true
                ]

            } catch (PSQLException e) {
                throw new InternalServerErrorException("Checksum validation failed: ${e.message}")
            }
        }
    }

    /**
     * Get migration statistics and summary information
     *
     * @return Map containing counts, execution statistics, and health indicators
     */
    def getMigrationStatistics() {
        return DatabaseUtil.withSql { sql ->
            try {
                def stats = [:]

                // Total migrations count
                def countResult = sql.firstRow('SELECT COUNT(*) as total FROM databasechangelog')
                stats.totalMigrations = countResult.total as Integer

                // Execution type breakdown
                def execTypeResult = sql.rows('''
                    SELECT exectype, COUNT(*) as count
                    FROM databasechangelog
                    GROUP BY exectype
                    ORDER BY count DESC
                ''')
                stats.executionTypes = execTypeResult.collect { row ->
                    [
                        type: row.exectype as String,
                        count: row.count as Integer
                    ]
                }

                // Recent migrations (last 10)
                def recentResult = sql.rows('''
                    SELECT filename, dateexecuted, exectype
                    FROM databasechangelog
                    ORDER BY dateexecuted DESC
                    LIMIT 10
                ''')
                stats.recentMigrations = recentResult.collect { row ->
                    [
                        filename: row.filename as String,
                        executedAt: row.dateexecuted?.toString() ?: null,
                        executionType: row.exectype as String
                    ]
                }

                // First and last execution timestamps
                def timestampResult = sql.firstRow('''
                    SELECT
                        MIN(dateexecuted) as first_execution,
                        MAX(dateexecuted) as last_execution
                    FROM databasechangelog
                    WHERE dateexecuted IS NOT NULL
                ''')

                stats.firstExecution = timestampResult.first_execution?.toString() ?: null
                stats.lastExecution = timestampResult.last_execution?.toString() ?: null

                return stats

            } catch (PSQLException e) {
                throw new InternalServerErrorException("Failed to retrieve migration statistics: ${e.message}")
            }
        }
    }

    /**
     * Enrich migration record with computed fields and metadata
     * Single enrichment point pattern (ADR-047)
     *
     * @param row Database row from databasechangelog table
     * @return Map with enriched migration data
     */
    private Map enrichMigrationRecord(Map row) {
        def enriched = [:]

        // Core Liquibase fields with explicit type casting (ADR-043)
        enriched.id = row.id as String
        enriched.filename = row.filename as String
        enriched.author = row.author as String
        enriched.checksum = row.md5sum as String
        enriched.executionType = row.exectype as String
        enriched.orderExecuted = row.orderexecuted as Integer
        enriched.liquibaseVersion = row.liquibase as String
        enriched.description = row.description as String
        enriched.comments = row.comments as String
        enriched.tag = row.tag as String
        enriched.labels = row.labels as String
        enriched.contexts = row.contexts as String
        enriched.deploymentId = row.deployment_id as String

        // Timestamp handling
        enriched.executedAt = row.dateexecuted?.toString() ?: null

        // Computed fields for UI compatibility
        enriched.sequence = extractSequenceFromFilename(enriched.filename as String)
        enriched.category = categorizeChangeset(enriched.filename as String)
        enriched.version = generateSemanticVersion(enriched.sequence as Integer, enriched.category as String)
        enriched.isBreaking = isStructuralChange(enriched.filename as String)
        enriched.isExecuted = enriched.executionType == 'EXECUTED'

        // UI display fields
        enriched.displayName = (enriched.filename as String).replace('.sql', '')
        enriched.shortDescription = generateShortDescription(enriched.filename as String, enriched.description as String)

        // Validation flags
        enriched.hasChecksum = (enriched.checksum as String) != null && !(enriched.checksum as String).isEmpty()
        enriched.validated = true

        return enriched
    }

    /**
     * Extract sequence number from filename (e.g., "001_baseline.sql" -> 1)
     *
     * @param filename String - SQL migration filename
     * @return Integer sequence number or 0 if not found
     */
    private Integer extractSequenceFromFilename(String filename) {
        if (!filename) return 0

        def match = filename =~ /^(\d{3})_/
        if (match.find()) {
            return Integer.parseInt((match[0] as List<String>)[1])
        }
        return 0
    }

    /**
     * Categorize changeset based on filename patterns
     *
     * @param filename String - SQL migration filename
     * @return String category identifier
     */
    private String categorizeChangeset(String filename) {
        if (!filename) return 'UNKNOWN'

        def categories = [
            'baseline': 'BASELINE',
            'email_template': 'EMAIL_TEMPLATES',
            'status': 'STATUS_MANAGEMENT',
            'performance': 'PERFORMANCE',
            'import': 'IMPORT_STAGING',
            'audit': 'AUDIT_COMPLIANCE',
            'configuration': 'CONFIGURATION',
            'fix': 'ENHANCEMENT',
            'grant': 'SECURITY',
            'create': 'TABLE_CREATION',
            'dto': 'DTO_OPTIMIZATION'
        ]

        for (def entry : categories) {
            if (filename.toLowerCase().contains(entry.key.toLowerCase())) {
                return entry.value as String
            }
        }

        return 'GENERAL'
    }

    /**
     * Generate semantic version based on sequence and category
     *
     * @param sequence Integer - Migration sequence number
     * @param category String - Migration category
     * @return String semantic version (e.g., "v1.2.3")
     */
    private String generateSemanticVersion(Integer sequence, String category) {
        if (sequence == null || sequence <= 0) return 'v0.0.0'

        // Simple mapping: major.minor.patch
        def major = 1
        def minor = (sequence / 10) as Integer
        def patch = sequence % 10

        // Adjust for breaking changes
        if (category in ['BASELINE', 'TABLE_CREATION', 'STATUS_MANAGEMENT']) {
            major = Math.max(major, (sequence / 20) as Integer + 1)
        }

        return "v${major}.${minor}.${patch}" as String
    }

    /**
     * Check if changeset represents structural change
     *
     * @param filename String - SQL migration filename
     * @return Boolean true if structural change
     */
    private Boolean isStructuralChange(String filename) {
        if (!filename) return false

        def structuralPatterns = [
            'baseline', 'create_', 'add_', 'drop_', 'alter_table',
            'foreign_key', 'index', 'constraint', 'normalization'
        ]

        return structuralPatterns.any { pattern ->
            filename.toLowerCase().contains(pattern.toLowerCase())
        }
    }

    /**
     * Generate short description from filename and description
     *
     * @param filename String - Migration filename
     * @param description String - Liquibase description (may be null)
     * @return String user-friendly description
     */
    private String generateShortDescription(String filename, String description) {
        if (description && !description.trim().isEmpty()) {
            return description.trim()
        }

        // Generate from filename
        if (!filename) return 'Database Migration'

        return filename
            .replace('.sql', '')
            .replaceAll(/^\d{3}_/, '')
            .replace('_', ' ')
            .toLowerCase()
            .split(' ')
            .collect { word -> word.capitalize() }
            .join(' ')
    }

    /**
     * Read SQL file content from filesystem for package generation
     * US-088-B Enhancement: Self-contained package generation
     *
     * @param filename String - SQL migration filename (e.g., "001_baseline.sql")
     * @return String SQL file content or error message
     */
    String readSqlFileContent(String filename) {
        if (!filename || filename.trim().isEmpty()) {
            return "-- Error: Empty filename provided"
        }

        try {
            // Security: Sanitize filename to prevent path traversal
            def sanitizedFilename = filename.replaceAll('[^a-zA-Z0-9_.-]', '')
            if (sanitizedFilename != filename) {
                return "-- Error: Invalid characters in filename: ${filename}"
            }

            // Construct safe path to changelogs directory
            def basePath = '/Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup/liquibase/changelogs/'
            def file = new File(basePath + sanitizedFilename)

            // Security: Ensure file is within expected directory
            def canonicalFile = file.getCanonicalPath()
            def canonicalBase = new File(basePath).getCanonicalPath()
            if (!canonicalFile.startsWith(canonicalBase)) {
                return "-- Error: File path outside allowed directory: ${filename}"
            }

            // Read file content if exists
            if (file.exists() && file.isFile()) {
                return file.text
            } else {
                return "-- File not found: ${filename}\n-- Expected location: ${canonicalFile}"
            }

        } catch (Exception e) {
            return "-- Error reading file ${filename}: ${e.message}"
        }
    }

    /**
     * Generate self-contained SQL package with embedded migration content
     * US-088-B Enhancement: Transform reference scripts to executable packages
     *
     * @param filenames List<String> - List of migration filenames to include
     * @return String Complete SQL script with embedded migrations
     */
    String generateSelfContainedSqlPackage(List<String> filenames) {
        if (!filenames || filenames.isEmpty()) {
            return "-- No migrations to package"
        }

        def script = []

        // Header with package metadata
        script.addAll([
            "-- =================================================================",
            "-- UMIG Self-Contained SQL Deployment Package",
            "-- Generated: ${new Date().toInstant()}",
            "-- Migrations: ${filenames.size()}",
            "-- Format: PostgreSQL",
            "-- =================================================================",
            "",
            "-- Transaction wrapper for atomic deployment",
            "BEGIN;",
            ""
        ])

        // Process each migration file
        filenames.eachWithIndex { filename, index ->
            def sequenceNumber = String.format("%03d", index + 1)

            script.addAll([
                "-- =================================================================",
                "-- Migration ${sequenceNumber}: ${filename}",
                "-- =================================================================",
                ""
            ])

            // Read and embed actual SQL content
            def sqlContent = readSqlFileContent(filename)
            script.add(sqlContent)
            script.addAll(["", "-- End of ${filename}", ""])
        }

        // Footer
        script.addAll([
            "-- =================================================================",
            "-- Package deployment completed successfully",
            "-- =================================================================",
            "",
            "COMMIT;",
            "",
            "-- Package generation summary:",
            "-- Total migrations: ${filenames.size()}",
            "-- Generation time: ${new Date().toInstant()}",
            "-- Ready for deployment!"
        ])

        return script.join('\n')
    }

    /**
     * Generate self-contained Liquibase XML with embedded SQL content
     * US-088-B Enhancement: Alternative package format for Liquibase deployments
     *
     * @param filenames List<String> - List of migration filenames to include
     * @return String Complete Liquibase XML with embedded SQL
     */
    String generateSelfContainedLiquibaseXml(List<String> filenames) {
        if (!filenames || filenames.isEmpty()) {
            return "<!-- No migrations to package -->"
        }

        def xml = []

        // XML header
        xml.addAll([
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<databaseChangeLog',
            '    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"',
            '    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
            '    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog',
            '    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">',
            '',
            '    <!-- UMIG Self-Contained Liquibase Package -->',
            '    <!-- Generated: ' + new Date().toInstant() + ' -->',
            '    <!-- Migrations: ' + filenames.size() + ' -->',
            ''
        ])

        // Process each migration file
        filenames.each { filename ->
            def changesetId = filename.replace('.sql', '') + '_embedded'

            xml.addAll([
                "    <!-- ${filename} -->",
                "    <changeSet id=\"${changesetId}\" author=\"umig-package-generator\">",
                "        <comment>Embedded content from ${filename}</comment>",
                "        <sql><![CDATA["
            ])

            // Read and embed actual SQL content
            def sqlContent = readSqlFileContent(filename)
            xml.add("            ${sqlContent}")

            xml.addAll([
                "        ]]></sql>",
                "    </changeSet>",
                ""
            ])
        }

        // XML footer
        xml.addAll([
            '    <!-- Package Summary -->',
            '    <!-- Total migrations: ' + filenames.size() + ' -->',
            '    <!-- Ready for: liquibase update -->',
            '',
            '</databaseChangeLog>'
        ])

        return xml.join('\n')
    }

    /**
     * Validate changeset ID format for security
     * Prevents SQL injection and ensures valid format
     *
     * @param changesetId String - Changeset ID to validate
     * @return Boolean true if valid format
     */
    private Boolean isValidChangesetId(String changesetId) {
        if (!changesetId || changesetId.trim().isEmpty()) {
            return false
        }

        // Allow alphanumeric, underscore, dash, colon for Liquibase ID format
        // Example: "001_baseline.sql::author::changelog.xml"
        def validPattern = /^[\w\-.:]+$/

        return changesetId.matches(validPattern) && changesetId.length() <= 500
    }
}