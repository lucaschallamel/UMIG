package umig.utils.security

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicInteger

/**
 * Thread-safe rate limiting manager using token bucket algorithm
 * 
 * Features:
 * - Token bucket algorithm for smooth rate limiting
 * - Per-client tracking with automatic cleanup
 * - Memory-efficient with configurable cleanup intervals
 * - Thread-safe operations for high-concurrency environments
 * - Comprehensive logging and monitoring
 * 
 * @version 1.0.0
 * @since Security Enhancement Phase
 */
class RateLimitManager {
    
    private static final Logger log = LoggerFactory.getLogger(RateLimitManager.class)
    
    private static volatile RateLimitManager INSTANCE
    private static final Object LOCK = new Object()
    
    // Token bucket storage: clientKey -> operationType -> TokenBucket
    private final Map<String, Map<String, TokenBucket>> clientBuckets = new ConcurrentHashMap<>()
    
    // Cleanup configuration
    private static final long CLEANUP_INTERVAL_MS = 300000 // 5 minutes
    private static final long BUCKET_EXPIRY_MS = 600000    // 10 minutes
    private volatile long lastCleanupTime = System.currentTimeMillis()
    
    private RateLimitManager() {
        log.info("RateLimitManager initialized with cleanup interval: ${CLEANUP_INTERVAL_MS}ms")
    }
    
    /**
     * Get singleton instance with double-checked locking
     */
    static RateLimitManager getInstance() {
        if (INSTANCE == null) {
            synchronized (LOCK) {
                if (INSTANCE == null) {
                    INSTANCE = new RateLimitManager()
                }
            }
        }
        return INSTANCE
    }
    
    /**
     * Check if operation is allowed for client
     * 
     * @param clientId Client identifier
     * @param operation Operation type (e.g., "labels_get", "labels_post")
     * @param limit Maximum requests per window
     * @param windowMs Window size in milliseconds
     * @return true if allowed, false if rate limit exceeded
     */
    boolean isAllowed(String clientId, String operation, int limit, long windowMs) {
        try {
            // Validate parameters
            if (!clientId || !operation || limit <= 0 || windowMs <= 0) {
                log.warn("Invalid rate limit parameters: clientId=${clientId}, operation=${operation}, limit=${limit}, windowMs=${windowMs}")
                return false
            }
            
            // Get or create token bucket
            TokenBucket bucket = getOrCreateTokenBucket(clientId, operation, limit, windowMs)
            
            // Check if token is available
            boolean allowed = bucket.tryConsume()
            
            if (!allowed) {
                log.warn("Rate limit exceeded for client: ${clientId}, operation: ${operation}")
            }
            
            // Perform cleanup if needed (non-blocking)
            performCleanupIfNeeded()
            
            return allowed
            
        } catch (Exception e) {
            log.error("Error checking rate limit for client: ${clientId}, operation: ${operation}", e)
            // Fail open for availability
            return true
        }
    }
    
    /**
     * Get remaining tokens for client/operation
     */
    int getRemaining(String clientId, String operation) {
        try {
            Map<String, TokenBucket> operationBuckets = clientBuckets.get(clientId)
            if (!operationBuckets) {
                return 0
            }
            
            TokenBucket bucket = operationBuckets.get(operation)
            if (!bucket) {
                return 0
            }
            
            return bucket.getAvailableTokens()
            
        } catch (Exception e) {
            log.error("Error getting remaining tokens for client: ${clientId}, operation: ${operation}", e)
            return 0
        }
    }
    
    /**
     * Get or create token bucket for client/operation combination
     */
    private TokenBucket getOrCreateTokenBucket(String clientId, String operation, int limit, long windowMs) {
        return clientBuckets.computeIfAbsent(clientId, { k -> new ConcurrentHashMap<>() })
                           .computeIfAbsent(operation, { k -> new TokenBucket(limit, windowMs) })
    }
    
    /**
     * Perform cleanup of expired buckets if needed
     */
    private void performCleanupIfNeeded() {
        long now = System.currentTimeMillis()
        if (now - lastCleanupTime > CLEANUP_INTERVAL_MS) {
            // Use async cleanup to avoid blocking
            Thread.startDaemon("RateLimitCleanup") {
                performCleanup(now)
            }
            lastCleanupTime = now
        }
    }
    
    /**
     * Clean up expired token buckets
     */
    private void performCleanup(long currentTime) {
        try {
            int removedClients = 0
            int removedBuckets = 0
            
            Iterator<Map.Entry<String, Map<String, TokenBucket>>> clientIterator = clientBuckets.entrySet().iterator()
            
            while (clientIterator.hasNext()) {
                Map.Entry<String, Map<String, TokenBucket>> clientEntry = clientIterator.next()
                Map<String, TokenBucket> operationBuckets = clientEntry.getValue()
                
                // Clean expired buckets for this client
                Iterator<Map.Entry<String, TokenBucket>> bucketIterator = operationBuckets.entrySet().iterator()
                while (bucketIterator.hasNext()) {
                    Map.Entry<String, TokenBucket> bucketEntry = bucketIterator.next()
                    TokenBucket bucket = bucketEntry.getValue()
                    
                    if (currentTime - bucket.lastAccessTime > BUCKET_EXPIRY_MS) {
                        bucketIterator.remove()
                        removedBuckets++
                    }
                }
                
                // Remove client if no buckets remain
                if (operationBuckets.isEmpty()) {
                    clientIterator.remove()
                    removedClients++
                }
            }
            
            if (removedClients > 0 || removedBuckets > 0) {
                log.debug("Rate limit cleanup completed: removed ${removedClients} clients and ${removedBuckets} buckets")
            }
            
        } catch (Exception e) {
            log.error("Error during rate limit cleanup", e)
        }
    }
    
    /**
     * Get current statistics for monitoring
     */
    Map<String, Object> getStatistics() {
        return [
            totalClients: clientBuckets.size(),
            totalBuckets: clientBuckets.values().sum { it.size() } ?: 0,
            lastCleanupTime: new Date(lastCleanupTime),
            cleanupIntervalMs: CLEANUP_INTERVAL_MS,
            bucketExpiryMs: BUCKET_EXPIRY_MS
        ]
    }
    
    /**
     * Token bucket implementation for rate limiting
     */
    private static class TokenBucket {
        private final int capacity
        private final long refillRateMs
        private final AtomicInteger tokens
        private final AtomicLong lastRefillTime
        volatile long lastAccessTime
        
        TokenBucket(int capacity, long windowMs) {
            this.capacity = capacity
            this.refillRateMs = (windowMs.intdiv(capacity)) as long // Distribute refill over window
            this.tokens = new AtomicInteger(capacity)
            this.lastRefillTime = new AtomicLong(System.currentTimeMillis())
            this.lastAccessTime = System.currentTimeMillis()
        }
        
        boolean tryConsume() {
            lastAccessTime = System.currentTimeMillis()
            refill()
            
            return tokens.getAndUpdate(current -> current > 0 ? current - 1 : current) > 0
        }
        
        int getAvailableTokens() {
            refill()
            return tokens.get()
        }
        
        private void refill() {
            long now = System.currentTimeMillis()
            long lastRefill = lastRefillTime.get()
            long timeSinceRefill = now - lastRefill
            
            if (timeSinceRefill > refillRateMs) {
                int tokensToAdd = (timeSinceRefill.intdiv(refillRateMs)) as int
                if (tokensToAdd > 0) {
                    tokens.updateAndGet(current -> Math.min(capacity, current + tokensToAdd))
                    lastRefillTime.set(now)
                }
            }
        }
    }
}