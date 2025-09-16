package umig.utils

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import org.slf4j.Logger
import org.slf4j.LoggerFactory

/**
 * Rate Limiting Utility for UMIG API endpoints
 * Implements token bucket algorithm for request throttling
 * Target security rating: 8.9/10
 * 
 * @since Sprint 7 - US-082-C Entity Migration Standard
 */
class RateLimiter {
    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class)
    private static RateLimiter instance
    
    // Rate limit configurations per endpoint type
    private static final Map<String, RateLimitConfig> ENDPOINT_CONFIGS = [
        'default': new RateLimitConfig(100, 60000), // 100 requests per minute
        'iterationType': new RateLimitConfig(100, 60000), // 100 requests per minute
        'migrationType': new RateLimitConfig(100, 60000), // 100 requests per minute
        'write': new RateLimitConfig(50, 60000), // 50 write requests per minute
        'read': new RateLimitConfig(200, 60000), // 200 read requests per minute
        'admin': new RateLimitConfig(30, 60000), // 30 admin requests per minute
        'import': new RateLimitConfig(10, 60000), // 10 import requests per minute
        'export': new RateLimitConfig(20, 60000) // 20 export requests per minute
    ]
    
    // User request buckets: Map<userId+endpoint, TokenBucket>
    private final Map<String, TokenBucket> userBuckets = new ConcurrentHashMap<>()
    
    // Global rate limit for DoS protection
    private final AtomicInteger globalRequestCount = new AtomicInteger(0)
    private final AtomicLong globalResetTime = new AtomicLong(System.currentTimeMillis() + 60000)
    private static final int GLOBAL_LIMIT = 10000 // 10k requests per minute globally
    
    private RateLimiter() {
        // Start cleanup thread
        startCleanupThread()
    }
    
    static synchronized RateLimiter getInstance() {
        if (instance == null) {
            instance = new RateLimiter()
        }
        return instance
    }
    
    /**
     * Check if request is allowed under rate limits
     * @param userId User identifier (username or IP)
     * @param endpoint Endpoint type for specific limits
     * @param customLimit Optional custom limit (overrides default)
     * @return true if request allowed, false if rate limited
     */
    boolean checkRateLimit(String userId, String endpoint = 'default', Integer customLimit = null) {
        if (!userId) {
            log.warn("Rate limit check called without userId")
            return false
        }
        
        // Check global rate limit first
        if (!checkGlobalLimit()) {
            log.error("Global rate limit exceeded: ${GLOBAL_LIMIT} requests/minute")
            return false
        }
        
        // Get configuration for endpoint
        def config = ENDPOINT_CONFIGS[endpoint] ?: ENDPOINT_CONFIGS['default']
        if (customLimit) {
            config = new RateLimitConfig(customLimit, config.windowMs)
        }
        
        // Get or create token bucket for user+endpoint
        String bucketKey = "${userId}:${endpoint}"
        TokenBucket bucket = userBuckets.computeIfAbsent(bucketKey) { key ->
            new TokenBucket(config.limit, config.windowMs)
        }
        
        // Try to consume a token
        boolean allowed = bucket.tryConsume()
        
        if (!allowed) {
            log.warn("Rate limit exceeded for user=${userId}, endpoint=${endpoint}, limit=${config.limit}/${config.windowMs}ms")
            auditRateLimitEvent(userId, endpoint, false)
        } else {
            log.trace("Rate limit check passed for user=${userId}, endpoint=${endpoint}")
        }
        
        return allowed
    }
    
    /**
     * Get remaining requests for user
     */
    int getRemainingRequests(String userId, String endpoint = 'default') {
        String bucketKey = "${userId}:${endpoint}"
        TokenBucket bucket = userBuckets.get(bucketKey)
        return bucket ? bucket.getAvailableTokens() : (ENDPOINT_CONFIGS[endpoint]?.limit ?: ENDPOINT_CONFIGS['default'].limit)
    }
    
    /**
     * Get time until rate limit resets (in seconds)
     */
    long getResetTimeSeconds(String userId, String endpoint = 'default') {
        String bucketKey = "${userId}:${endpoint}"
        TokenBucket bucket = userBuckets.get(bucketKey)
        if (!bucket) {
            return 0
        }

        long resetTime = bucket.getResetTime()
        long now = System.currentTimeMillis()
        return Math.max(0L, (resetTime - now).intdiv(1000L))
    }
    
    /**
     * Reset rate limit for specific user (admin function)
     */
    void resetUserLimit(String userId, String endpoint = null) {
        if (endpoint) {
            userBuckets.remove("${userId}:${endpoint}")
        } else {
            // Remove all endpoints for user
            userBuckets.keySet().removeIf { key -> key.startsWith("${userId}:") }
        }
        log.info("Rate limit reset for user=${userId}, endpoint=${endpoint ?: 'all'}")
    }
    
    /**
     * Check global rate limit
     */
    private boolean checkGlobalLimit() {
        long now = System.currentTimeMillis()
        long resetTime = globalResetTime.get()
        
        // Reset counter if window expired
        if (now > resetTime) {
            globalRequestCount.set(0)
            globalResetTime.set(now + 60000)
        }
        
        int count = globalRequestCount.incrementAndGet()
        return count <= GLOBAL_LIMIT
    }
    
    /**
     * Cleanup old buckets to prevent memory leak
     */
    private void startCleanupThread() {
        Thread.start {
            while (true) {
                try {
                    Thread.sleep(5 * 60 * 1000) // Clean every 5 minutes
                    
                    long now = System.currentTimeMillis()
                    userBuckets.entrySet().removeIf { entry ->
                        // Remove buckets not used for 10 minutes
                        entry.value.lastAccess + 600000 < now
                    }
                    
                    log.debug("Rate limiter cleanup: ${userBuckets.size()} active buckets")
                } catch (Exception e) {
                    log.error("Error in rate limiter cleanup thread", e)
                }
            }
        }
    }
    
    /**
     * Audit rate limit events
     */
    private void auditRateLimitEvent(String userId, String endpoint, boolean allowed) {
        // In production, write to audit log
        def message = "RateLimit Event: User=${userId}, Endpoint=${endpoint}, Allowed=${allowed}"
        if (!allowed) {
            log.warn(message)
        }
    }
    
    /**
     * Rate limit configuration
     */
    static class RateLimitConfig {
        final int limit
        final long windowMs
        
        RateLimitConfig(int limit, long windowMs) {
            this.limit = limit
            this.windowMs = windowMs
        }
    }
    
    /**
     * Token bucket implementation
     */
    static class TokenBucket {
        private final int capacity
        private final long windowMs
        private final AtomicInteger tokens
        private final AtomicLong windowStart
        private volatile long lastAccess
        
        TokenBucket(int capacity, long windowMs) {
            this.capacity = capacity
            this.windowMs = windowMs
            this.tokens = new AtomicInteger(capacity)
            this.windowStart = new AtomicLong(System.currentTimeMillis())
            this.lastAccess = System.currentTimeMillis()
        }
        
        synchronized boolean tryConsume() {
            refill()
            lastAccess = System.currentTimeMillis()
            
            int available = tokens.get()
            if (available > 0) {
                tokens.decrementAndGet()
                return true
            }
            return false
        }
        
        synchronized void refill() {
            long now = System.currentTimeMillis()
            long windowEnd = windowStart.get() + windowMs
            
            if (now > windowEnd) {
                // Start new window
                tokens.set(capacity)
                windowStart.set(now)
            }
        }
        
        int getAvailableTokens() {
            refill()
            return tokens.get()
        }
        
        long getResetTime() {
            return windowStart.get() + windowMs
        }
    }
}