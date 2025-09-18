# US-085: Distributed Rate Limiting & Caching

## Story Metadata

**Story ID**: US-085  
**Epic**: Security & Performance Infrastructure Enhancement  
**Sprint**: Sprint 7 (January 2025)  
**Priority**: P1 (HIGH - Critical scalability and security requirements)  
**Effort**: 8 points  
**Status**: Sprint 7 Ready  
**Timeline**: Sprint 7 (2 weeks)  
**Owner**: Backend Architecture + DevOps  
**Dependencies**: US-082-A Foundation Service Layer (✅ COMPLETE)  
**Risk**: HIGH (Production scaling critical, Redis integration complexity)

## Problem Statement

### Current Rate Limiting Vulnerability (CRITICAL ISSUE)

The current system implements **in-memory rate limiting** which creates a critical DoS vulnerability in multi-instance deployments:

```groovy
// CURRENT VULNERABLE IMPLEMENTATION
class SecurityService {
    private static final Map<String, Integer> requestCounts = [:]
    private static final Map<String, Long> lastRequestTime = [:]

    // THIS FAILS IN MULTI-INSTANCE DEPLOYMENTS!
    def checkRateLimit(String clientId) {
        // Each Confluence instance has its own memory
        // Attacker can bypass limits by hitting different instances
        return requestCounts.get(clientId, 0) < maxRequestsPerWindow
    }
}
```

### Critical Security & Scalability Issues

- **DoS Vulnerability**: In-memory limits can be bypassed in multi-instance Confluence deployments
- **Memory Leaks**: Unbounded cache growth without LRU eviction policies
- **No Cache Coordination**: Multiple instances maintain separate, inconsistent caches
- **Production Risk**: System cannot scale horizontally without security compromise

### Business Impact

- **Security Risk**: Exposed to distributed denial-of-service attacks
- **Scalability Blocker**: Cannot deploy additional Confluence instances safely
- **Performance Degradation**: Memory pressure from unbounded caches
- **Compliance Gap**: Rate limiting requirements not met for production

## User Story

**As a** System Administrator deploying UMIG in production  
**I want** distributed rate limiting and caching infrastructure using Redis  
**So that** rate limits are enforced across all Confluence instances and the system can scale horizontally while maintaining security

### Value Statement

This story addresses critical security vulnerabilities and scalability barriers by implementing Redis-based distributed rate limiting and caching. The solution enables horizontal scaling, prevents DoS attacks, and provides centralized cache coordination essential for production deployment.

## Acceptance Criteria

### AC-085.1: Redis Integration for Distributed Rate Limiting

**Given** UMIG is deployed across multiple Confluence instances  
**When** a client makes API requests to different instances  
**Then** rate limits are enforced consistently across all instances  
**And** rate limit counters are stored in Redis with TTL expiration  
**And** all instances share the same rate limiting state  
**And** Rate limiting works even if some instances are offline

**Implementation Details**:

```groovy
// NEW DISTRIBUTED IMPLEMENTATION
class DistributedSecurityService {
    private RedisTemplate redisTemplate

    def checkRateLimit(String clientId, int maxRequests, int windowSeconds) {
        String key = "rate_limit:${clientId}"
        Long currentCount = redisTemplate.opsForValue().increment(key)

        if (currentCount == 1) {
            redisTemplate.expire(key, windowSeconds, TimeUnit.SECONDS)
        }

        return currentCount <= maxRequests
    }
}
```

### AC-085.2: Cache Size Bounds with LRU Eviction

**Given** the system is processing high volumes of requests  
**When** cache memory approaches configured limits  
**Then** Redis implements LRU (Least Recently Used) eviction policies  
**And** cache size is bounded by maximum memory configuration  
**And** evicted items are logged for monitoring  
**And** cache hit/miss ratios are tracked for optimization

**Configuration**:

```yaml
# Redis Configuration
redis:
  maxmemory: 512mb
  maxmemory-policy: allkeys-lru
  timeout: 5000

# Application Configuration
cache:
  rate_limit_ttl: 900 # 15 minutes
  max_entries_per_key: 1000
  cleanup_interval: 300 # 5 minutes
```

### AC-085.3: Centralized Cache Coordination

**Given** multiple Confluence instances need shared caching  
**When** one instance updates cached data  
**Then** all instances see the updated data within 5 seconds  
**And** cache invalidation is propagated across all instances  
**And** cache keys follow consistent naming conventions  
**And** cache expiration is coordinated centrally

**Cache Key Strategy**:

```
rate_limit:{userId}:{endpoint}     # Rate limiting
api_cache:{endpoint}:{hash}        # API response caching
session_cache:{sessionId}          # Session data
auth_cache:{token}                 # Authentication tokens
```

### AC-085.4: Production Deployment Documentation

**Given** operations teams need to deploy the Redis infrastructure  
**When** implementing distributed caching in production  
**Then** comprehensive deployment documentation is provided including:

- Redis cluster configuration for high availability
- Monitoring and alerting setup for cache performance
- Backup and recovery procedures for Redis data
- Security configuration for Redis authentication and encryption
- Performance tuning guidelines for different load scenarios
- Troubleshooting runbook for common cache issues

## Technical Implementation

### Redis Infrastructure Design

```yaml
# High Availability Redis Configuration
redis_cluster:
  nodes:
    - redis-node-1:6379
    - redis-node-2:6379
    - redis-node-3:6379
  sentinel_nodes:
    - sentinel-1:26379
    - sentinel-2:26379
    - sentinel-3:26379

authentication:
  password: ${REDIS_PASSWORD}
  ssl_enabled: true

monitoring:
  metrics_endpoint: /redis/metrics
  health_check: /redis/health
```

### Service Layer Integration

```groovy
// Enhanced SecurityService with Redis
class EnhancedSecurityService {
    private RedisTemplate<String, Object> redisTemplate
    private RateLimitConfig config

    // Distributed rate limiting
    def checkRateLimit(String identifier, String endpoint) {
        String key = "rate_limit:${identifier}:${endpoint}"
        RateLimitWindow window = config.getWindowFor(endpoint)

        Long count = redisTemplate.opsForValue().increment(key)
        if (count == 1) {
            redisTemplate.expire(key, window.durationSeconds, TimeUnit.SECONDS)
        }

        boolean allowed = count <= window.maxRequests

        // Log rate limit events for monitoring
        logRateLimitEvent(identifier, endpoint, count, allowed)

        return allowed
    }

    // Distributed cache with LRU
    def <T> T getCached(String key, Closure<T> valueProvider) {
        T cached = redisTemplate.opsForValue().get(key)
        if (cached != null) {
            recordCacheHit(key)
            return cached
        }

        T value = valueProvider.call()
        if (value != null) {
            redisTemplate.opsForValue().set(key, value,
                config.getDefaultTTL(), TimeUnit.SECONDS)
            recordCacheMiss(key)
        }

        return value
    }
}
```

### Performance Monitoring Integration

```groovy
// Cache Performance Monitoring
class CacheMetricsService {
    def recordCacheHit(String key) {
        redisTemplate.opsForValue().increment("metrics:cache:hits:${extractKeyType(key)}")
    }

    def recordCacheMiss(String key) {
        redisTemplate.opsForValue().increment("metrics:cache:misses:${extractKeyType(key)}")
    }

    def getCacheStatistics() {
        return [
            hitRate: calculateHitRate(),
            memoryUsage: getRedisMemoryUsage(),
            evictionRate: getEvictionRate(),
            connectionCount: getActiveConnections()
        ]
    }
}
```

## Dependencies and Integration Points

### Prerequisites

- **US-082-A Foundation Service Layer**: ✅ COMPLETE - Provides SecurityService infrastructure
- **Redis Infrastructure**: NEW - Requires deployment of Redis cluster
- **Network Configuration**: UPDATE - Redis connectivity from all Confluence instances

### Integration Points

- **SecurityService Enhancement**: Upgrade existing service with Redis capabilities
- **ApiService Integration**: Add distributed caching for API responses
- **NotificationService**: Use Redis pub/sub for cross-instance notifications
- **Monitoring Integration**: Connect cache metrics to existing monitoring dashboard

### Follow-up Dependencies

- **US-086 Security Hardening Phase 2**: Benefits from distributed rate limiting
- **US-088 Performance Monitoring**: Leverages cache performance metrics
- **Future Scaling**: Enables horizontal scaling of Confluence instances

## Risk Assessment

### Technical Risks

1. **Redis Infrastructure Complexity**
   - **Risk**: Redis cluster setup and maintenance complexity
   - **Mitigation**: Comprehensive documentation, monitoring, managed Redis service option
   - **Likelihood**: Medium | **Impact**: Medium

2. **Network Latency Impact**
   - **Risk**: Redis calls add network latency to every request
   - **Mitigation**: Connection pooling, local fallback, performance monitoring
   - **Likelihood**: Low | **Impact**: Medium

3. **Single Point of Failure**
   - **Risk**: Redis outage affects entire system
   - **Mitigation**: Redis high availability, graceful degradation, circuit breakers
   - **Likelihood**: Low | **Impact**: High

### Business Risks

1. **Production Deployment Complexity**
   - **Risk**: Redis deployment delays production readiness
   - **Mitigation**: Containerized deployment, infrastructure automation, rollback plans
   - **Likelihood**: Medium | **Impact**: Medium

2. **Operational Overhead**
   - **Risk**: Additional infrastructure to monitor and maintain
   - **Mitigation**: Managed Redis service, automated monitoring, operational runbooks
   - **Likelihood**: Medium | **Impact**: Low

## Success Metrics

### Security Metrics

- **Rate Limit Effectiveness**: 100% consistent enforcement across instances
- **DoS Attack Resilience**: Successful mitigation of distributed attacks
- **Cache Security**: Encrypted data at rest and in transit

### Performance Metrics

- **Cache Hit Rate**: Target >85% for frequently accessed data
- **Response Time Impact**: <50ms additional latency for Redis operations
- **Memory Efficiency**: Controlled cache growth with effective LRU eviction
- **Horizontal Scaling**: Linear performance scaling with additional instances

### Operational Metrics

- **Redis Availability**: >99.9% uptime for Redis infrastructure
- **Deployment Success**: Smooth production deployment without downtime
- **Documentation Quality**: Complete operational runbooks and troubleshooting guides

## Quality Gates

### Implementation Quality Gates

- All rate limiting consistently enforced across test instances
- Cache memory usage stays within configured bounds under load
- Performance impact of Redis integration within acceptable limits (<50ms)
- Comprehensive test coverage for distributed scenarios
- Security review of Redis configuration and authentication

### Production Readiness Gates

- Redis high availability configuration validated
- Monitoring and alerting for cache performance implemented
- Backup and disaster recovery procedures tested
- Load testing validates horizontal scaling benefits
- Operational runbooks completed and validated

## Implementation Notes

### Development Phases

1. **Week 1: Redis Integration Foundation**
   - Redis client integration and connection management
   - Basic distributed rate limiting implementation
   - Unit tests for Redis operations

2. **Week 2: Production Features & Documentation**
   - LRU cache implementation and monitoring
   - High availability configuration
   - Deployment documentation and operational runbooks

### Testing Strategy

- **Unit Tests**: Redis client mocking and service logic validation
- **Integration Tests**: Multi-instance rate limiting validation
- **Load Tests**: Cache performance under high volume
- **Failover Tests**: Redis cluster failure scenarios

### Security Considerations

- Redis authentication and SSL/TLS encryption
- Network security for Redis cluster communication
- Data encryption for sensitive cached information
- Audit logging for rate limiting decisions

## Related Documentation

- **Architecture Reference**: `docs/architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md`
- **US-082-A**: Foundation Service Layer implementation
- **Security Framework**: ADR-031 (Type Safety), ADR-042 (Authentication Context)
- **Performance Standards**: Target response times and scalability requirements

## Change Log

| Date       | Version | Changes                | Author |
| ---------- | ------- | ---------------------- | ------ |
| 2025-07-09 | 1.0     | Initial story creation | System |

---

**Story Status**: Ready for Implementation  
**Next Action**: Begin Redis infrastructure setup and SecurityService enhancement  
**Risk Level**: High (critical for production scaling and security)  
**Strategic Priority**: High (enables horizontal scaling and prevents DoS vulnerabilities)
