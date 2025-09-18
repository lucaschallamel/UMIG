package umig.service

import groovy.transform.CompileStatic
import groovy.util.logging.Slf4j
import umig.repository.StatusRepository
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * Service for centralized status management across all entity types.
 * Provides cached access to status data from the status_sts table.
 *
 * Part of TD-003: Eliminate Hardcoded Status Values
 *
 * @since Sprint 7
 * @author UMIG Development Team
 */
@CompileStatic
@Slf4j
class StatusService {

    // Repository for database access
    private final StatusRepository statusRepository

    // Cache configuration
    private static final long CACHE_TTL_MS = TimeUnit.MINUTES.toMillis(5) // 5 minute cache
    private static final Map<String, CacheEntry> statusCache = new ConcurrentHashMap<>()

    // Valid entity types
    private static final Set<String> VALID_ENTITY_TYPES = new HashSet<>([
        'Migration', 'Iteration', 'Plan', 'Sequence', 'Phase', 'Step', 'Control'
    ])

    /**
     * Cache entry wrapper with TTL tracking
     */
    @CompileStatic
    private static class CacheEntry {
        final Object data
        final long expiryTime

        CacheEntry(Object data, long ttlMs) {
            this.data = data
            this.expiryTime = System.currentTimeMillis() + ttlMs
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expiryTime
        }
    }

    /**
     * Constructor with lazy initialization support
     */
    StatusService() {
        this.statusRepository = new StatusRepository()
        log.info("StatusService initialized with ${CACHE_TTL_MS}ms cache TTL")
    }

    /**
     * Constructor for dependency injection (testing)
     */
    StatusService(StatusRepository repository) {
        this.statusRepository = repository
        log.info("StatusService initialized with custom repository")
    }

    /**
     * Get all statuses for a specific entity type with caching
     * @param entityType The type of entity (Step, Phase, etc.)
     * @return List of status maps with id, name, color, type
     */
    List<Map> getStatusesByType(String entityType) {
        // Defensive validation
        if (!entityType?.trim()) {
            log.warn("StatusService: Empty entity type provided")
            return []
        }

        // Normalize entity type
        entityType = entityType.trim()

        // Validate entity type
        if (!VALID_ENTITY_TYPES.contains(entityType)) {
            log.warn("StatusService: Invalid entity type '${entityType}'")
            return []
        }

        // Check cache first
        String cacheKey = "type:${entityType}"
        CacheEntry cached = statusCache.get(cacheKey)

        if (cached && !cached.isExpired()) {
            log.debug("StatusService: Cache hit for entity type '${entityType}'")
            return (List<Map>) cached.data
        }

        // Fetch from database
        try {
            log.debug("StatusService: Cache miss for entity type '${entityType}', fetching from database")
            List<Map> statuses = statusRepository.findStatusesByType(entityType) as List<Map>

            // Store in cache
            statusCache.put(cacheKey, new CacheEntry(statuses, CACHE_TTL_MS))

            log.info("StatusService: Retrieved ${statuses.size()} statuses for entity type '${entityType}'")
            return statuses

        } catch (Exception e) {
            log.error("StatusService: Error fetching statuses for entity type '${entityType}'", e)
            return []
        }
    }

    /**
     * Get a specific status by name and entity type
     * @param statusName The name of the status (e.g., 'IN_PROGRESS')
     * @param entityType The type of entity
     * @return Status map or null if not found
     */
    Map getStatusByNameAndType(String statusName, String entityType) {
        // Defensive validation
        if (!statusName?.trim() || !entityType?.trim()) {
            log.warn("StatusService: Empty status name or entity type provided")
            return null
        }

        // Normalize inputs
        statusName = statusName.trim().toUpperCase()
        entityType = entityType.trim()

        // Check cache first
        String cacheKey = "name:${entityType}:${statusName}"
        CacheEntry cached = statusCache.get(cacheKey)

        if (cached && !cached.isExpired()) {
            log.debug("StatusService: Cache hit for status '${statusName}' of type '${entityType}'")
            return (Map) cached.data
        }

        // Fetch from database
        try {
            Map status = statusRepository.findStatusByNameAndType(statusName, entityType) as Map

            // Store in cache (even if null to prevent repeated lookups)
            statusCache.put(cacheKey, new CacheEntry(status, CACHE_TTL_MS))

            if (status) {
                log.debug("StatusService: Found status '${statusName}' for entity type '${entityType}'")
            } else {
                log.warn("StatusService: Status '${statusName}' not found for entity type '${entityType}'")
            }

            return status

        } catch (Exception e) {
            log.error("StatusService: Error fetching status '${statusName}' for entity type '${entityType}'", e)
            return null
        }
    }

    /**
     * Get all statuses across all entity types (admin functionality)
     * @return List of all status maps
     */
    List<Map> getAllStatuses() {
        String cacheKey = "all:statuses"
        CacheEntry cached = statusCache.get(cacheKey)

        if (cached && !cached.isExpired()) {
            log.debug("StatusService: Cache hit for all statuses")
            return (List<Map>) cached.data
        }

        try {
            List<Map> allStatuses = statusRepository.findAllStatuses() as List<Map>

            // Store in cache
            statusCache.put(cacheKey, new CacheEntry(allStatuses, CACHE_TTL_MS))

            log.info("StatusService: Retrieved ${allStatuses.size()} total statuses")
            return allStatuses

        } catch (Exception e) {
            log.error("StatusService: Error fetching all statuses", e)
            return []
        }
    }

    /**
     * Validate if a status ID is valid for a given entity type
     * @param statusId The status ID to validate
     * @param entityType The type of entity
     * @return true if valid, false otherwise
     */
    boolean isValidStatusId(Integer statusId, String entityType) {
        if (!statusId || !entityType?.trim()) {
            return false
        }

        // Check cache for the entity type's statuses
        List<Map> statuses = getStatusesByType(entityType)

        // Look for the ID in cached results
        return statuses.any { Map status ->
            status.id == statusId
        }
    }

    /**
     * Get valid status names for a given entity type
     * @param entityType The type of entity
     * @return List of valid status names
     */
    List<String> getValidStatusNames(String entityType) {
        List<Map> statuses = getStatusesByType(entityType)
        return statuses.collect { Map status ->
            (String) status.name
        }
    }

    /**
     * Get status dropdown options formatted for frontend
     * @param entityType The type of entity
     * @return List of maps with value, text, and cssClass
     */
    List<Map> getDropdownOptions(String entityType) {
        List<Map> statuses = getStatusesByType(entityType)

        List<Map> dropdownOptions = statuses.collect { Map status ->
            [
                value: status.name,
                text: formatStatusDisplay((String) status.name),
                cssClass: getStatusCssClass((String) status.name),
                color: status.color
            ] as Map
        }

        return dropdownOptions
    }

    /**
     * Format status name for display (e.g., IN_PROGRESS -> In Progress)
     */
    String formatStatusDisplay(String statusName) {
        if (!statusName) return ''

        // Special cases
        switch (statusName) {
            case 'TODO': return 'To Do'
            case 'IN_PROGRESS': return 'In Progress'
            default:
                // Convert SNAKE_CASE to Title Case
                return statusName.toLowerCase()
                    .split('_')
                    .collect { String word ->
                        word.capitalize()
                    }
                    .join(' ')
        }
    }

    /**
     * Get CSS class for status styling
     */
    String getStatusCssClass(String statusName) {
        if (!statusName) return 'status-unknown'

        return "status-${statusName.toLowerCase().replace('_', '-')}"
    }

    /**
     * Get default status for a given entity type
     * @param entityType The type of entity (Step, Phase, etc.)
     * @return Default status name, fallback to 'PENDING'
     */
    String getDefaultStatus(String entityType) {
        if (!entityType?.trim()) {
            log.warn("StatusService: Empty entity type provided for default status")
            return 'PENDING'
        }

        try {
            // Get statuses for this entity type
            List<Map> statuses = getStatusesByType(entityType.trim())

            if (statuses.isEmpty()) {
                log.warn("StatusService: No statuses found for entity type '${entityType}', using fallback")
                return 'PENDING'
            }

            // Look for common default statuses in order of preference
            String[] preferredDefaults = ['PENDING', 'TODO', 'NOT_STARTED', 'PLANNED']

            for (String preferred : preferredDefaults) {
                Map foundStatus = statuses.find { Map status ->
                    ((String) status.name).equalsIgnoreCase(preferred)
                }
                if (foundStatus) {
                    log.debug("StatusService: Found default status '${foundStatus.name}' for entity type '${entityType}'")
                    return (String) foundStatus.name
                }
            }

            // If no preferred default found, use the first status available
            Map firstStatus = statuses[0]
            String defaultStatus = (String) firstStatus.name
            log.debug("StatusService: Using first available status '${defaultStatus}' as default for entity type '${entityType}'")
            return defaultStatus

        } catch (Exception e) {
            log.error("StatusService: Error getting default status for entity type '${entityType}'", e)
            return 'PENDING'
        }
    }

    /**
     * Clear the status cache (admin functionality)
     */
    void clearCache() {
        int previousSize = statusCache.size()
        statusCache.clear()
        log.info("StatusService: Cleared cache (removed ${previousSize} entries)")
    }

    /**
     * Get cache statistics (for monitoring)
     * @return Map with cache statistics
     */
    Map getCacheStatistics() {
        int totalEntries = statusCache.size()
        int expiredEntries = (statusCache.values().count { CacheEntry entry ->
            entry.isExpired()
        }) as int
        int activeEntries = totalEntries - expiredEntries

        return [
            totalEntries: totalEntries,
            activeEntries: activeEntries,
            expiredEntries: expiredEntries,
            cacheTTLMs: CACHE_TTL_MS,
            validEntityTypes: VALID_ENTITY_TYPES.toList()
        ]
    }

    /**
     * Pre-warm the cache for critical entity types on startup
     */
    void prewarmCache() {
        log.info("StatusService: Pre-warming cache for critical entity types")

        // Pre-warm the most commonly used entity types
        ['Step', 'Phase', 'Sequence', 'Iteration'].each { String entityType ->
            getStatusesByType(entityType)
        }

        log.info("StatusService: Cache pre-warming complete")
    }

    /**
     * Get available entity types
     * @return Set of valid entity types
     */
    Set<String> getAvailableEntityTypes() {
        return new HashSet<>(VALID_ENTITY_TYPES)
    }
}