/**
 * Bounded Cache Implementation with LRU/LFU Eviction Policies
 *
 * SECURITY: Prevents memory leaks by enforcing maximum cache sizes
 * with proper eviction policies to handle memory pressure.
 *
 * Features:
 * - Configurable maximum size limits
 * - LRU (Least Recently Used) eviction policy
 * - LFU (Least Frequently Used) eviction policy
 * - TTL (Time To Live) support
 * - Memory pressure monitoring
 * - Automatic cleanup and GC optimization
 *
 * @author UMIG Development Team
 * @version 1.0.0
 * @since 2025-01-XX
 */

/**
 * Cache entry with metadata for eviction algorithms
 */
class CacheEntry {
  constructor(key, value, ttl = null) {
    this.key = key;
    this.value = value;
    this.accessCount = 1;
    this.lastAccessed = Date.now();
    this.created = Date.now();
    this.expires = ttl ? this.created + ttl : null;
  }

  /**
   * Mark entry as accessed for LRU/LFU algorithms
   */
  markAccessed() {
    this.lastAccessed = Date.now();
    this.accessCount++;
  }

  /**
   * Check if entry has expired
   */
  isExpired() {
    return this.expires && Date.now() > this.expires;
  }

  /**
   * Get entry size estimate in bytes
   */
  getSize() {
    // Rough estimate: key + value + metadata
    const keySize = this.key.length * 2; // Assume UTF-16
    const valueSize = this._estimateValueSize(this.value);
    const metadataSize = 64; // Overhead for timestamps, counts, etc.
    return keySize + valueSize + metadataSize;
  }

  _estimateValueSize(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === "string") return value.length * 2;
    if (typeof value === "number") return 8;
    if (typeof value === "boolean") return 1;
    if (typeof value === "object") {
      return JSON.stringify(value).length * 2; // Rough estimate
    }
    return 100; // Default estimate for unknown types
  }
}

/**
 * Bounded Cache with Configurable Eviction Policies
 */
class BoundedCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.maxMemory = options.maxMemory || 50 * 1024 * 1024; // 50MB default
    this.ttl = options.ttl || null; // Default TTL in milliseconds
    this.evictionPolicy = options.evictionPolicy || "lru"; // 'lru', 'lfu', 'ttl'
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutes
    this.memoryCheckInterval = options.memoryCheckInterval || 60000; // 1 minute

    // Internal storage
    this.cache = new Map();
    this.accessOrder = new Map(); // For LRU: key -> timestamp
    this.frequencyOrder = new Map(); // For LFU: key -> access count

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      cleanups: 0,
      memoryPressureEvents: 0,
      totalSize: 0,
      estimatedMemoryUsage: 0,
    };

    // Setup automatic cleanup
    this._setupCleanup();
    this._setupMemoryMonitoring();

    // Bind methods to preserve context
    this.get = this.get.bind(this);
    this.set = this.set.bind(this);
    this.delete = this.delete.bind(this);
    this.clear = this.clear.bind(this);
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check expiration
    if (entry.isExpired()) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access metadata
    entry.markAccessed();
    this._updateAccessOrder(key);

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Optional TTL override
   * @returns {boolean} True if successfully cached
   */
  set(key, value, ttl = null) {
    // Use provided TTL or instance default
    const entryTtl = ttl || this.ttl;

    // Check if we need to evict before adding
    if (!this.cache.has(key)) {
      this._enforceMemoryLimits();
    }

    // Create new entry
    const entry = new CacheEntry(key, value, entryTtl);

    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Add new entry
    this.cache.set(key, entry);
    this._updateAccessOrder(key);
    this._updateStats();

    return true;
  }

  /**
   * Delete entry from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key existed
   */
  delete(key) {
    const existed = this.cache.has(key);

    if (existed) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.frequencyOrder.delete(key);
      this._updateStats();
    }

    return existed;
  }

  /**
   * Clear all cached entries
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.frequencyOrder.clear();
    this._updateStats();
    this.stats.cleanups++;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and not expired
   */
  has(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (entry.isExpired()) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      maxSize: this.maxSize,
      maxMemory: this.maxMemory,
      evictionPolicy: this.evictionPolicy,
    };
  }

  /**
   * Get all cache keys (for debugging)
   * @returns {Array} Array of cache keys
   */
  keys() {
    // Filter out expired keys
    const validKeys = [];
    for (const [key, entry] of this.cache) {
      if (!entry.isExpired()) {
        validKeys.push(key);
      }
    }
    return validKeys;
  }

  /**
   * Cleanup expired entries manually
   * @returns {number} Number of entries cleaned up
   */
  cleanup() {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.isExpired()) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.frequencyOrder.delete(key);
        cleanedCount++;
      }
    }

    this._updateStats();
    this.stats.cleanups++;

    return cleanedCount;
  }

  /**
   * Force garbage collection optimization
   */
  optimize() {
    // Clean up expired entries
    const cleaned = this.cleanup();

    // Trigger eviction if needed
    this._enforceMemoryLimits();

    // Compact access order maps
    this._compactMetadata();

    return {
      expiredEntriesRemoved: cleaned,
      finalSize: this.cache.size,
      estimatedMemoryUsage: this.stats.estimatedMemoryUsage,
    };
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy() {
    // Clear all intervals
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
      this.memoryTimer = null;
    }

    // Clear all data
    this.clear();
  }

  /**
   * PRIVATE METHODS
   */

  /**
   * Setup automatic cleanup timer
   * @private
   */
  _setupCleanup() {
    if (this.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.cleanupInterval);
    }
  }

  /**
   * Setup memory pressure monitoring
   * @private
   */
  _setupMemoryMonitoring() {
    if (this.memoryCheckInterval > 0) {
      this.memoryTimer = setInterval(() => {
        this._checkMemoryPressure();
      }, this.memoryCheckInterval);
    }
  }

  /**
   * Check for memory pressure and evict if needed
   * @private
   */
  _checkMemoryPressure() {
    const currentMemory = this.stats.estimatedMemoryUsage;

    if (currentMemory > this.maxMemory * 0.9) {
      // 90% threshold
      this.stats.memoryPressureEvents++;
      this._evictEntries(Math.ceil(this.cache.size * 0.1)); // Evict 10%
    }
  }

  /**
   * Enforce memory and size limits
   * @private
   */
  _enforceMemoryLimits() {
    // Size-based eviction
    while (this.cache.size >= this.maxSize) {
      this._evictOneEntry();
    }

    // Memory-based eviction
    while (
      this.stats.estimatedMemoryUsage > this.maxMemory &&
      this.cache.size > 0
    ) {
      this._evictOneEntry();
    }
  }

  /**
   * Evict multiple entries
   * @param {number} count - Number of entries to evict
   * @private
   */
  _evictEntries(count) {
    for (let i = 0; i < count && this.cache.size > 0; i++) {
      this._evictOneEntry();
    }
  }

  /**
   * Evict one entry based on eviction policy
   * @private
   */
  _evictOneEntry() {
    let keyToEvict;

    switch (this.evictionPolicy) {
      case "lfu": // Least Frequently Used
        keyToEvict = this._findLFUKey();
        break;
      case "ttl": // Shortest TTL first
        keyToEvict = this._findTTLKey();
        break;
      case "lru": // Least Recently Used (default)
      default:
        keyToEvict = this._findLRUKey();
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
      this.stats.evictions++;
    }
  }

  /**
   * Find least recently used key
   * @returns {string} Key to evict
   * @private
   */
  _findLRUKey() {
    let oldestTime = Date.now();
    let oldestKey = null;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Find least frequently used key
   * @returns {string} Key to evict
   * @private
   */
  _findLFUKey() {
    let minAccessCount = Infinity;
    let lfuKey = null;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < minAccessCount) {
        minAccessCount = entry.accessCount;
        lfuKey = key;
      }
    }

    return lfuKey;
  }

  /**
   * Find entry with shortest remaining TTL
   * @returns {string} Key to evict
   * @private
   */
  _findTTLKey() {
    let shortestTtl = Infinity;
    let ttlKey = null;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.expires) {
        const remainingTtl = entry.expires - now;
        if (remainingTtl < shortestTtl) {
          shortestTtl = remainingTtl;
          ttlKey = key;
        }
      }
    }

    // If no TTL entries found, fall back to LRU
    return ttlKey || this._findLRUKey();
  }

  /**
   * Update access order for LRU tracking
   * @param {string} key - Cache key
   * @private
   */
  _updateAccessOrder(key) {
    this.accessOrder.set(key, Date.now());
  }

  /**
   * Update cache statistics
   * @private
   */
  _updateStats() {
    this.stats.totalSize = this.cache.size;

    // Calculate estimated memory usage
    let estimatedMemory = 0;
    for (const entry of this.cache.values()) {
      estimatedMemory += entry.getSize();
    }
    this.stats.estimatedMemoryUsage = estimatedMemory;
  }

  /**
   * Compact metadata maps to reduce memory overhead
   * @private
   */
  _compactMetadata() {
    // Remove stale entries from access order map
    for (const key of this.accessOrder.keys()) {
      if (!this.cache.has(key)) {
        this.accessOrder.delete(key);
      }
    }

    // Remove stale entries from frequency order map
    for (const key of this.frequencyOrder.keys()) {
      if (!this.cache.has(key)) {
        this.frequencyOrder.delete(key);
      }
    }
  }
}

/**
 * Factory function to create bounded caches with common configurations
 */
class BoundedCacheFactory {
  /**
   * Create cache for user sessions (medium size, short TTL)
   */
  static createSessionCache() {
    return new BoundedCache({
      maxSize: 1000,
      maxMemory: 10 * 1024 * 1024, // 10MB
      ttl: 30 * 60 * 1000, // 30 minutes
      evictionPolicy: "lru",
      cleanupInterval: 60000, // 1 minute
    });
  }

  /**
   * Create cache for authentication data (small size, medium TTL)
   */
  static createAuthCache() {
    return new BoundedCache({
      maxSize: 500,
      maxMemory: 5 * 1024 * 1024, // 5MB
      ttl: 60 * 60 * 1000, // 1 hour
      evictionPolicy: "lru",
      cleanupInterval: 300000, // 5 minutes
    });
  }

  /**
   * Create cache for API responses (large size, frequency-based)
   */
  static createApiCache() {
    return new BoundedCache({
      maxSize: 5000,
      maxMemory: 100 * 1024 * 1024, // 100MB
      ttl: 15 * 60 * 1000, // 15 minutes
      evictionPolicy: "lfu",
      cleanupInterval: 120000, // 2 minutes
    });
  }

  /**
   * Create cache for static resources (very large, long TTL)
   */
  static createResourceCache() {
    return new BoundedCache({
      maxSize: 10000,
      maxMemory: 200 * 1024 * 1024, // 200MB
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      evictionPolicy: "lru",
      cleanupInterval: 600000, // 10 minutes
    });
  }
}

// Export for different module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BoundedCache,
    BoundedCacheFactory,
    CacheEntry,
  };
}

if (typeof window !== "undefined") {
  window.BoundedCache = BoundedCache;
  window.BoundedCacheFactory = BoundedCacheFactory;
  window.CacheEntry = CacheEntry;
}

if (typeof define === "function" && define.amd) {
  define("BoundedCache", [], () => ({
    BoundedCache,
    BoundedCacheFactory,
    CacheEntry,
  }));
}
