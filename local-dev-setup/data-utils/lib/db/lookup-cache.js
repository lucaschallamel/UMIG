/**
 * Lookup Cache for Foreign Key Resolution
 * Caches entity IDs to minimize database queries during import
 */

class LookupCache {
  constructor(pool) {
    this.pool = pool;
    this.statusCache = new Map(); // Key: "name:type" → Value: sts_id
    this.teamCache = new Map(); // Key: tms_name → Value: tms_id
    this.userCache = new Map(); // Key: usr_email → Value: usr_id
    this.roleCache = new Map(); // Key: rol_name → Value: rol_id
    this.planCache = new Map(); // Key: plm_name → Value: plm_id
  }

  /**
   * Get status IDs by (name, type) tuples
   * Critical pattern: status_sts uses composite lookup
   * @param {Array<{name: string, type: string}>} statusRequests
   * @returns {Promise<Map<string, string>>} Map of name → sts_id
   */
  async getStatusIds(statusRequests) {
    const uncached = statusRequests.filter(
      (req) => !this.statusCache.has(`${req.name}:${req.type}`),
    );

    if (uncached.length > 0) {
      // Build dynamic query for multiple (name, type) pairs
      const placeholders = uncached
        .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
        .join(",");

      const query = `
        SELECT sts_id, sts_name, sts_type
        FROM status_sts
        WHERE (sts_name, sts_type) IN (${placeholders})
      `;

      const params = uncached.flatMap((r) => [r.name, r.type]);
      const result = await this.pool.query(query, params);

      // Cache results
      result.rows.forEach((row) => {
        this.statusCache.set(`${row.sts_name}:${row.sts_type}`, row.sts_id);
      });
    }

    // Return Map with requested statuses
    return new Map(
      statusRequests.map((req) => [
        req.name,
        this.statusCache.get(`${req.name}:${req.type}`),
      ]),
    );
  }

  /**
   * Get team ID by name (NOT tms_code - doesn't exist per ADR-059)
   * @param {string} teamName - Team name
   * @returns {Promise<string|null>} Team ID or null
   */
  async getTeamByName(teamName) {
    if (!this.teamCache.has(teamName)) {
      const result = await this.pool.query(
        "SELECT tms_id FROM teams_tms WHERE tms_name = $1",
        [teamName],
      );

      if (result.rows.length > 0) {
        this.teamCache.set(teamName, result.rows[0].tms_id);
      } else {
        return null;
      }
    }

    return this.teamCache.get(teamName);
  }

  /**
   * Get user ID by email
   * @param {string} email - User email
   * @returns {Promise<string|null>} User ID or null
   */
  async getUserByEmail(email) {
    if (!this.userCache.has(email)) {
      const result = await this.pool.query(
        "SELECT usr_id FROM users_usr WHERE usr_email = $1",
        [email],
      );

      if (result.rows.length > 0) {
        this.userCache.set(email, result.rows[0].usr_id);
      } else {
        return null;
      }
    }

    return this.userCache.get(email);
  }

  /**
   * Get plan ID by name
   * @param {string} planName - Plan name
   * @returns {Promise<string|null>} Plan ID or null
   */
  async getPlanByName(planName) {
    if (!this.planCache.has(planName)) {
      const result = await this.pool.query(
        "SELECT plm_id FROM plans_master_plm WHERE plm_name = $1",
        [planName],
      );

      if (result.rows.length > 0) {
        this.planCache.set(planName, result.rows[0].plm_id);
      } else {
        return null;
      }
    }

    return this.planCache.get(planName);
  }

  /**
   * Clear all caches
   * Use when entities are created during import
   */
  clearAll() {
    this.statusCache.clear();
    this.teamCache.clear();
    this.userCache.clear();
    this.roleCache.clear();
    this.planCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache size stats
   */
  getStats() {
    return {
      status: this.statusCache.size,
      teams: this.teamCache.size,
      users: this.userCache.size,
      roles: this.roleCache.size,
      plans: this.planCache.size,
    };
  }
}

module.exports = LookupCache;
