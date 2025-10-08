/**
 * Database Connection Pool Manager
 * Wraps pg.Pool with logging and error handling
 */

const { Pool } = require("pg");
const { getDatabaseConfig, validateConfig } = require("../../config/database");

let pool = null;

/**
 * Get or create connection pool singleton
 * @returns {Pool} PostgreSQL connection pool
 */
function getPool() {
  if (!pool) {
    validateConfig();
    const config = getDatabaseConfig();

    pool = new Pool(config);

    // Log connection events
    pool.on("connect", () => {
      console.log("📊 Database connection established");
    });

    pool.on("error", (err) => {
      console.error("❌ Unexpected database error:", err);
    });
  }

  return pool;
}

/**
 * Execute query with automatic connection management
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(query, params = []) {
  const pool = getPool();
  return pool.query(query, params);
}

/**
 * Execute transaction with automatic commit/rollback
 * @param {Function} callback - Async function receiving client
 * @returns {Promise<*>} Callback return value
 */
async function transaction(callback) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all connections in pool
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("📊 Database connection pool closed");
  }
}

module.exports = {
  getPool,
  query,
  transaction,
  closePool,
};
