# Production Rate Limiting Strategy

## Current Implementation Analysis

**VULNERABILITY IDENTIFIED**: The current rate limiting implementation uses in-memory Maps that are **NOT suitable for production multi-instance deployments**.

### Current Issues

```javascript
// PROBLEMATIC: In-memory rate limiting (SecurityService.js:774-777)
this.rateLimiters = {
  byUser: new Map(), // ❌ Instance-specific, not shared
  byIP: new Map(), // ❌ Instance-specific, not shared
};
```

**Impact in Production**:

- Rate limits apply only per instance, not globally
- Attacker can bypass limits by hitting different instances
- Memory grows unbounded under sustained attack
- No persistence across service restarts

## Production-Ready Distributed Rate Limiting

### Option 1: Redis-Based Rate Limiting (RECOMMENDED)

#### Implementation Architecture

```javascript
/**
 * Production-ready distributed rate limiter using Redis
 */
class DistributedRateLimiter {
  constructor(redisClient, config) {
    this.redis = redisClient;
    this.config = config;
    this.fallbackLimiter = new Map(); // Fallback for Redis failures
  }

  /**
   * Check rate limit using Redis sliding window
   */
  async checkRateLimit(identifier, limit, windowMs) {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(key, "-inf", windowStart);

      // Count current requests in window
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now, now);

      // Set expiration
      pipeline.expire(key, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();
      const currentCount = results[1][1];

      return {
        allowed: currentCount < limit,
        count: currentCount,
        resetTime: now + windowMs,
        retryAfter: Math.ceil(windowMs / 1000),
      };
    } catch (error) {
      console.error("Redis rate limiting failed, using fallback:", error);
      return this._fallbackRateLimit(identifier, limit, windowMs);
    }
  }

  /**
   * Fallback to in-memory rate limiting when Redis fails
   */
  _fallbackRateLimit(identifier, limit, windowMs) {
    // Simple fallback implementation
    const entry = this.fallbackLimiter.get(identifier) || {
      requests: [],
      blocked: false,
    };
    const now = Date.now();

    // Clean old requests
    entry.requests = entry.requests.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    // Check limit
    if (entry.requests.length >= limit) {
      return { allowed: false, count: entry.requests.length };
    }

    // Add current request
    entry.requests.push(now);
    this.fallbackLimiter.set(identifier, entry);

    return { allowed: true, count: entry.requests.length };
  }
}
```

#### Production Configuration

```yaml
# docker-compose.production.yml
version: "3.8"
services:
  redis-rate-limiter:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  umig-app:
    environment:
      - RATE_LIMIT_REDIS_URL=redis://redis-rate-limiter:6379
      - RATE_LIMIT_STRATEGY=distributed
      - RATE_LIMIT_FALLBACK=memory
    depends_on:
      - redis-rate-limiter

volumes:
  redis_data:
```

#### Environment Variables

```bash
# Production Environment Variables
RATE_LIMIT_STRATEGY=distributed         # distributed, memory, hybrid
RATE_LIMIT_REDIS_URL=redis://localhost:6379
RATE_LIMIT_REDIS_PREFIX=umig:rl:        # Key prefix for isolation
RATE_LIMIT_FALLBACK=memory              # Fallback when Redis unavailable
RATE_LIMIT_REDIS_TIMEOUT=5000           # Redis operation timeout (ms)

# Rate Limit Configuration
RATE_LIMIT_PER_USER_LIMIT=100           # Requests per minute per user
RATE_LIMIT_PER_IP_LIMIT=200             # Requests per minute per IP
RATE_LIMIT_BURST_LIMIT=500              # Burst allowance
RATE_LIMIT_WINDOW_MS=60000              # Rolling window (1 minute)

# Security Configuration
RATE_LIMIT_BLOCK_DURATION_MS=300000     # Block duration (5 minutes)
RATE_LIMIT_PROGRESSIVE_DELAY=true       # Enable progressive delays
RATE_LIMIT_MONITOR_ENABLED=true         # Enable rate limit monitoring
```

### Option 2: Database-Based Rate Limiting (Alternative)

For environments where Redis is not available:

```sql
-- Rate limiting table
CREATE TABLE rate_limits (
    identifier VARCHAR(255) NOT NULL,
    request_timestamp BIGINT NOT NULL,
    window_start BIGINT NOT NULL,
    request_count INTEGER DEFAULT 1,
    blocked_until BIGINT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (identifier, window_start),
    INDEX idx_timestamp (request_timestamp),
    INDEX idx_blocked (blocked_until)
);

-- Cleanup expired entries (run periodically)
DELETE FROM rate_limits
WHERE request_timestamp < (UNIX_TIMESTAMP() * 1000) - 300000; -- 5 minutes ago
```

### Option 3: Hybrid Approach (Recommended for High Availability)

```javascript
/**
 * Hybrid rate limiter: Redis primary, database fallback, memory emergency
 */
class HybridRateLimiter {
  constructor(redisClient, dbConnection) {
    this.redis = redisClient;
    this.db = dbConnection;
    this.memory = new Map();
    this.strategy = "redis"; // redis -> database -> memory
  }

  async checkRateLimit(identifier, limit, windowMs) {
    // Try Redis first
    if (this.strategy === "redis" && this.redis.connected) {
      try {
        return await this._redisRateLimit(identifier, limit, windowMs);
      } catch (error) {
        console.warn("Redis rate limiting failed, falling back to database");
        this.strategy = "database";
      }
    }

    // Fallback to database
    if (this.strategy === "database" && this.db.connected) {
      try {
        return await this._databaseRateLimit(identifier, limit, windowMs);
      } catch (error) {
        console.warn("Database rate limiting failed, falling back to memory");
        this.strategy = "memory";
      }
    }

    // Emergency fallback to memory
    return this._memoryRateLimit(identifier, limit, windowMs);
  }
}
```

## Implementation Steps for UMIG

### Step 1: Update SecurityService.js

Replace the current in-memory rate limiting with distributed implementation:

```javascript
// In SecurityService.js constructor:
if (process.env.RATE_LIMIT_STRATEGY === "distributed") {
  this.rateLimiter = new DistributedRateLimiter(
    this._createRedisClient(),
    this.config.rateLimit,
  );
} else {
  // Keep existing implementation for development
  this.rateLimiters = {
    byUser: new Map(),
    byIP: new Map(),
  };
}
```

### Step 2: Add Redis Configuration

```javascript
/**
 * Create Redis client for rate limiting
 */
_createRedisClient() {
  const redis = require('redis');
  const client = redis.createClient({
    url: process.env.RATE_LIMIT_REDIS_URL || 'redis://localhost:6379',
    retry_delay_on_failover: 100,
    max_attempts: 3,
    socket: {
      connectTimeout: 5000,
      commandTimeout: 5000,
    }
  });

  client.on('error', (err) => {
    console.error('Redis rate limiter error:', err);
  });

  client.on('connect', () => {
    console.log('Redis rate limiter connected');
  });

  return client;
}
```

### Step 3: Update Rate Limiting Logic

Replace the `checkRateLimit` method to use distributed limiter:

```javascript
async checkRateLimit(identifier, type = "user") {
  if (!this.config.rateLimit.enabled) {
    return { allowed: true };
  }

  const config = type === "user"
    ? this.config.rateLimit.perUser
    : this.config.rateLimit.perIP;

  // Use distributed rate limiter in production
  if (this.rateLimiter instanceof DistributedRateLimiter) {
    return await this.rateLimiter.checkRateLimit(
      identifier,
      config.limit,
      config.window
    );
  }

  // Fallback to existing in-memory implementation
  return this._memoryRateLimit(identifier, type);
}
```

## Monitoring and Alerting

### Rate Limit Metrics

```javascript
/**
 * Rate limit monitoring
 */
class RateLimitMonitor {
  constructor(metricsCollector) {
    this.metrics = metricsCollector;
  }

  recordRateLimit(identifier, type, allowed, count) {
    this.metrics.increment("rate_limit.requests.total", {
      type,
      allowed: allowed.toString(),
    });

    this.metrics.histogram("rate_limit.requests.count", count, {
      type,
    });

    if (!allowed) {
      this.metrics.increment("rate_limit.blocks.total", { type });
    }
  }
}
```

### CloudWatch/Grafana Dashboard Metrics

- `rate_limit.requests.total` - Total rate limit checks
- `rate_limit.blocks.total` - Total blocked requests
- `rate_limit.redis.errors` - Redis connection failures
- `rate_limit.fallback.usage` - Fallback strategy usage
- `rate_limit.response.time` - Rate limit check response time

## Testing Strategy

### Load Testing

```javascript
// Load test script for rate limiting
const loadtest = require("loadtest");

const options = {
  url: "http://localhost:8090/rest/scriptrunner/latest/custom/test",
  concurrency: 50,
  maxRequests: 10000,
  headers: {
    "X-Forwarded-For": "192.168.1.100", // Simulate same IP
  },
};

loadtest.loadTest(options, (error, result) => {
  if (error) {
    return console.error("Load test failed: %s", error);
  }

  console.log("Tests run successfully");
  console.log("Total requests: %d", result.totalRequests);
  console.log("Rate limited (429): %d", result.statusCodes["429"] || 0);
});
```

### Integration Tests

```javascript
describe("Distributed Rate Limiting", () => {
  it("should enforce limits across multiple instances", async () => {
    const instance1 = new SecurityService(redisClient1);
    const instance2 = new SecurityService(redisClient2);

    // Make requests on instance 1
    for (let i = 0; i < 50; i++) {
      await instance1.checkRateLimit("testuser", "user");
    }

    // Next requests on instance 2 should be limited
    const result = await instance2.checkRateLimit("testuser", "user");
    expect(result.allowed).toBe(false);
  });
});
```

## Migration Plan

1. **Development**: Test with Redis in development environment
2. **Staging**: Deploy Redis alongside existing implementation
3. **Production**:
   - Phase 1: Deploy with fallback enabled
   - Phase 2: Monitor metrics and validate distributed limiting
   - Phase 3: Remove fallback once stable
4. **Rollback**: Environment variable to switch back to memory-based

## Performance Considerations

- **Redis Overhead**: ~1-2ms per rate limit check
- **Memory Usage**: ~100 bytes per tracked identifier in Redis
- **Network Latency**: Co-locate Redis with application instances
- **Fallback Performance**: Memory fallback adds ~0.1ms overhead

## Security Benefits

✅ **Global Rate Limiting**: Attackers cannot bypass by hitting different instances  
✅ **DoS Protection**: Distributed coordination prevents overload  
✅ **Memory Bounds**: Redis provides built-in memory management  
✅ **Persistence**: Rate limit state survives service restarts  
✅ **Monitoring**: Centralized metrics and alerting  
✅ **Scalability**: Handles enterprise-scale request volumes
