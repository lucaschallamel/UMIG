/**
 * Database Configuration for UMIG Data Import
 * Reads credentials from parent directory .env file
 */

require("dotenv").config({ path: "../../.env" });

const config = {
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
  database: process.env.UMIG_DB_NAME || "umig_app_db",
  user: process.env.UMIG_DB_USER || "umig_app_user",
  password: process.env.UMIG_DB_PASSWORD || "123456",

  // Connection pool settings
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout for new connections
};

/**
 * Get database configuration
 * @returns {Object} PostgreSQL connection config
 */
function getDatabaseConfig() {
  return config;
}

/**
 * Validate database configuration
 * @throws {Error} if required config is missing
 */
function validateConfig() {
  const required = ["host", "port", "database", "user", "password"];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required database configuration: ${missing.join(", ")}`,
    );
  }
}

module.exports = {
  getDatabaseConfig,
  validateConfig,
};
