/**
 * Import Configuration
 * Settings for batch sizes, concurrency, and quality gates
 */

const IMPORT_CONFIG = {
  // Batch sizes for bulk operations
  batchSize: {
    excel: 50, // Records per Excel batch insert
    hierarchy: 10, // Concurrent HTML file parsing
    validation: 100, // Records per validation batch
  },

  // Concurrency limits
  concurrency: {
    htmlParsing: 10, // Max concurrent HTML parse operations
    dbInserts: 1, // Sequential DB inserts (transaction safety)
    validation: 5, // Concurrent validation queries
  },

  // Quality gates and success criteria
  qualityGates: {
    excel: {
      successRate: 100, // All records must import (%)
      maxFkViolations: 0, // Zero foreign key errors
      maxDuplicates: 0, // No duplicate violations
      maxTimeSeconds: 30, // 30 seconds max
    },
    hierarchy: {
      successRate: 99, // Allow 1% failure for bad data (%)
      maxOrphans: 0, // No orphaned records
      maxTimeSeconds: 600, // 10 minutes max (1,177 files)
      minIndexUsage: 100, // All lookups must use indexes (%)
    },
    validation: {
      maxJunctionErrors: 0, // Perfect FK integrity
      maxOrphanRecords: 0,
      maxTimeSeconds: 60, // 1 minute validation
    },
  },

  // Performance targets (with TD-103 indexes)
  performanceTargets: {
    excelImportSeconds: 30, // <30s for 380 records
    hierarchyImportMinutes: 10, // <10min for 1,177 files
    lookupMilliseconds: 1, // <1ms per FK resolution
    validationSeconds: 60, // <60s complete integrity check
  },

  // File paths
  paths: {
    excelData: "../../db/import-data",
    htmlData: "../../db/import-data/rawData",
    reports: "./reports",
  },

  // Audit trail settings
  audit: {
    createdBy: "migration",
    updatedBy: "migration",
  },
};

module.exports = IMPORT_CONFIG;
