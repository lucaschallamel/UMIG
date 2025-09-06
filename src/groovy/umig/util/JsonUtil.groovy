package umig.util

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import groovy.util.logging.Slf4j

/**
 * JSON Utility for Shared ObjectMapper Performance Optimization
 * 
 * Addresses PR feedback for US-056F: ObjectMapper instances were being created
 * repeatedly in DTO toJson() and fromJson() methods causing performance issues.
 * 
 * This utility provides a thread-safe, shared ObjectMapper instance with proper
 * module registration for Java 8 time types.
 * 
 * Performance benefits:
 * - Single ObjectMapper instance across application
 * - Thread-safe for concurrent access
 * - Modules registered once at initialization
 * - Reduces GC pressure from repeated instantiation
 * 
 * @since US-056F Performance Optimization
 */
@Slf4j
class JsonUtil {
    
    /**
     * Shared, thread-safe ObjectMapper instance
     * Configured with Java 8 time support and optimized for UMIG DTOs
     */
    private static final ObjectMapper MAPPER = createOptimizedMapper()
    
    /**
     * Create and configure the shared ObjectMapper instance
     * @return Configured ObjectMapper with required modules
     */
    private static ObjectMapper createOptimizedMapper() {
        ObjectMapper mapper = new ObjectMapper()
        
        // Register modules for Java 8 time types (LocalDateTime, etc.)
        mapper.registerModule(new JavaTimeModule())
        
        log.debug("Initialized shared ObjectMapper with Java 8 time module support")
        return mapper
    }
    
    /**
     * Convert object to JSON string using shared ObjectMapper
     * @param object Object to serialize
     * @return JSON string representation
     * @throws IllegalArgumentException if object is null
     * @throws RuntimeException if serialization fails
     */
    static String toJson(Object object) {
        if (object == null) {
            throw new IllegalArgumentException("Cannot serialize null object to JSON")
        }
        
        try {
            return MAPPER.writeValueAsString(object)
        } catch (Exception e) {
            log.error("Failed to serialize object to JSON: ${e.message}", e)
            throw new RuntimeException("JSON serialization failed: ${e.message}", e)
        }
    }
    
    /**
     * Convert JSON string to object using shared ObjectMapper
     * @param jsonString JSON string to deserialize
     * @param targetClass Target class type
     * @return Deserialized object of specified type
     * @throws IllegalArgumentException if jsonString is null or empty, or targetClass is null
     * @throws RuntimeException if deserialization fails
     */
    static <T> T fromJson(String jsonString, Class<T> targetClass) {
        if (!jsonString?.trim()) {
            throw new IllegalArgumentException("JSON string cannot be null or empty")
        }
        if (targetClass == null) {
            throw new IllegalArgumentException("Target class cannot be null")
        }
        
        try {
            return MAPPER.readValue(jsonString, targetClass)
        } catch (Exception e) {
            log.error("Failed to deserialize JSON to ${targetClass.simpleName}: ${e.message}", e)
            throw new RuntimeException("JSON deserialization failed for ${targetClass.simpleName}: ${e.message}", e)
        }
    }
    
    /**
     * Convert JSON string to object with lenient error handling
     * Returns null instead of throwing exception on parsing errors
     * 
     * @param jsonString JSON string to deserialize
     * @param targetClass Target class type
     * @return Deserialized object or null if parsing fails
     */
    static <T> T fromJsonSafe(String jsonString, Class<T> targetClass) {
        if (!jsonString?.trim() || targetClass == null) {
            return null
        }
        
        try {
            return MAPPER.readValue(jsonString, targetClass)
        } catch (Exception e) {
            log.warn("Safe JSON deserialization failed for ${targetClass.simpleName}: ${e.message}")
            return null
        }
    }
    
    /**
     * Get the shared ObjectMapper instance for advanced usage
     * @return Thread-safe ObjectMapper instance
     */
    static ObjectMapper getMapper() {
        return MAPPER
    }
}