package umig.tests.utils

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import umig.tests.integration.AuthenticationHelper
import java.net.HttpURLConnection
import java.net.URL

/**
 * Standardized HTTP client for UMIG integration tests.
 * 
 * Features:
 * - Consistent HTTP method implementations (GET, POST, PUT, DELETE)
 * - Integrated authentication via AuthenticationHelper
 * - Performance timing and validation
 * - Standardized error handling and response parsing
 * - ScriptRunner REST endpoint compatibility
 * 
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Security: Integrated with AuthenticationHelper.groovy
 * Performance: <500ms validation capability
 * 
 * Created: 2025-08-27 (US-037 Phase 3)
 * Version: 1.0
 */
class IntegrationTestHttpClient {
    
    private static final String DEFAULT_BASE_URL = "http://localhost:8090/rest/scriptrunner/latest/custom"
    private static final int DEFAULT_TIMEOUT_MS = 30000
    private static final int PERFORMANCE_THRESHOLD_MS = 500
    
    private final String baseUrl
    private final JsonSlurper jsonSlurper = new JsonSlurper()
    private final int timeoutMs
    
    /**
     * Constructor with default configuration
     */
    IntegrationTestHttpClient() {
        this(DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS)
    }
    
    /**
     * Constructor with custom configuration
     * @param baseUrl Base URL for API endpoints
     * @param timeoutMs Request timeout in milliseconds
     */
    IntegrationTestHttpClient(String baseUrl, int timeoutMs) {
        this.baseUrl = baseUrl
        this.timeoutMs = timeoutMs
    }
    
    /**
     * Execute GET request with performance timing
     * @param endpoint API endpoint (relative to baseUrl)
     * @param queryParams Optional query parameters
     * @return HttpResponse object with status, body, and timing information
     */
    HttpResponse get(String endpoint, Map<String, String> queryParams = [:]) {
        def url = buildUrl(endpoint, queryParams)
        return executeRequest(url, "GET", null)
    }
    
    /**
     * Execute POST request with JSON payload
     * @param endpoint API endpoint (relative to baseUrl)
     * @param payload Request payload (will be converted to JSON)
     * @return HttpResponse object with status, body, and timing information
     */
    HttpResponse post(String endpoint, Object payload) {
        def url = buildUrl(endpoint, [:])
        def jsonPayload = payload ? new JsonBuilder(payload).toString() : null
        return executeRequest(url, "POST", jsonPayload)
    }
    
    /**
     * Execute PUT request with JSON payload
     * @param endpoint API endpoint (relative to baseUrl)
     * @param payload Request payload (will be converted to JSON)
     * @return HttpResponse object with status, body, and timing information
     */
    HttpResponse put(String endpoint, Object payload) {
        def url = buildUrl(endpoint, [:])
        def jsonPayload = payload ? new JsonBuilder(payload).toString() : null
        return executeRequest(url, "PUT", jsonPayload)
    }
    
    /**
     * Execute DELETE request
     * @param endpoint API endpoint (relative to baseUrl)
     * @return HttpResponse object with status, body, and timing information
     */
    HttpResponse delete(String endpoint) {
        def url = buildUrl(endpoint, [:])
        return executeRequest(url, "DELETE", null)
    }
    
    /**
     * Execute POST request with custom timeout
     * @param endpoint API endpoint (relative to baseUrl)
     * @param payload Request payload (will be converted to JSON)
     * @param customTimeoutMs Custom timeout in milliseconds
     * @return HttpResponse object with status, body, and timing information
     */
    HttpResponse postWithTimeout(String endpoint, Object payload, int customTimeoutMs) {
        def url = buildUrl(endpoint, [:])
        def jsonPayload = payload ? new JsonBuilder(payload).toString() : null
        return executeRequestWithTimeout(url, "POST", jsonPayload, customTimeoutMs)
    }
    
    /**
     * Execute PUT request with custom timeout
     * @param endpoint API endpoint (relative to baseUrl)
     * @param payload Request payload (will be converted to JSON)
     * @param customTimeoutMs Custom timeout in milliseconds
     * @return HttpResponse object with status, body, and timing information
     */
    HttpResponse putWithTimeout(String endpoint, Object payload, int customTimeoutMs) {
        def url = buildUrl(endpoint, [:])
        def jsonPayload = payload ? new JsonBuilder(payload).toString() : null
        return executeRequestWithTimeout(url, "PUT", jsonPayload, customTimeoutMs)
    }
    
    /**
     * Execute HTTP request with comprehensive error handling and timing
     * @param url Complete URL for the request
     * @param method HTTP method (GET, POST, PUT, DELETE)
     * @param jsonPayload JSON payload for request body (optional)
     * @return HttpResponse object with all response details
     */
    private HttpResponse executeRequest(String url, String method, String jsonPayload) {
        def startTime = System.currentTimeMillis()
        HttpURLConnection connection = null
        
        try {
            // Setup connection
            connection = new URL(url).openConnection() as HttpURLConnection
            connection.requestMethod = method
            connection.connectTimeout = timeoutMs
            connection.readTimeout = timeoutMs
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            
            // Configure authentication
            AuthenticationHelper.configureAuthentication(connection)
            
            // Send payload if present
            if (jsonPayload && (method == "POST" || method == "PUT")) {
                connection.doOutput = true
                connection.outputStream.withWriter("UTF-8") { writer ->
                    writer.write(jsonPayload)
                    writer.flush()
                }
            }
            
            // Execute request and measure timing
            def responseTime = System.currentTimeMillis() - startTime
            def statusCode = connection.responseCode
            def responseBody = ""
            
            // Read response body
            try {
                if (statusCode >= 200 && statusCode < 300) {
                    responseBody = connection.inputStream.text
                } else {
                    responseBody = connection.errorStream?.text ?: ""
                }
            } catch (IOException e) {
                responseBody = "Error reading response: ${e.message}"
            }
            
            def totalTime = System.currentTimeMillis() - startTime
            
            return new HttpResponse(
                statusCode: statusCode,
                body: responseBody,
                responseTimeMs: totalTime,
                url: url,
                method: method,
                success: statusCode >= 200 && statusCode < 300
            )
            
        } catch (Exception e) {
            def totalTime = System.currentTimeMillis() - startTime
            return new HttpResponse(
                statusCode: -1,
                body: "Connection error: ${AuthenticationHelper.sanitizeErrorMessage(e.message)}",
                responseTimeMs: totalTime,
                url: url,
                method: method,
                success: false,
                exception: e
            )
        } finally {
            connection?.disconnect()
        }
    }
    
    /**
     * Execute HTTP request with custom timeout and comprehensive error handling
     * @param url Complete URL for the request
     * @param method HTTP method (GET, POST, PUT, DELETE)
     * @param jsonPayload JSON payload for request body (optional)
     * @param customTimeoutMs Custom timeout in milliseconds
     * @return HttpResponse object with all response details
     */
    private HttpResponse executeRequestWithTimeout(String url, String method, String jsonPayload, int customTimeoutMs) {
        def startTime = System.currentTimeMillis()
        HttpURLConnection connection = null
        
        try {
            // Setup connection
            connection = new URL(url).openConnection() as HttpURLConnection
            connection.requestMethod = method
            connection.connectTimeout = customTimeoutMs
            connection.readTimeout = customTimeoutMs
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            
            // Configure authentication
            AuthenticationHelper.configureAuthentication(connection)
            
            // Send payload if present
            if (jsonPayload && (method == "POST" || method == "PUT")) {
                connection.doOutput = true
                connection.outputStream.withWriter("UTF-8") { writer ->
                    writer.write(jsonPayload)
                    writer.flush()
                }
            }
            
            // Execute request and measure timing
            def responseTime = System.currentTimeMillis() - startTime
            def statusCode = connection.responseCode
            def responseBody = ""
            
            // Read response body
            try {
                if (statusCode >= 200 && statusCode < 300) {
                    responseBody = connection.inputStream.text
                } else {
                    responseBody = connection.errorStream?.text ?: ""
                }
            } catch (IOException e) {
                responseBody = "Error reading response: ${e.message}"
            }
            
            def totalTime = System.currentTimeMillis() - startTime
            
            return new HttpResponse(
                statusCode: statusCode,
                body: responseBody,
                responseTimeMs: totalTime,
                url: url,
                method: method,
                success: statusCode >= 200 && statusCode < 300
            )
            
        } catch (Exception e) {
            def totalTime = System.currentTimeMillis() - startTime
            return new HttpResponse(
                statusCode: -1,
                body: "Connection error: ${AuthenticationHelper.sanitizeErrorMessage(e.message)}",
                responseTimeMs: totalTime,
                url: url,
                method: method,
                success: false,
                exception: e
            )
        } finally {
            connection?.disconnect()
        }
    }
    
    /**
     * Build complete URL with query parameters
     * @param endpoint API endpoint
     * @param queryParams Query parameters map
     * @return Complete URL string
     */
    private String buildUrl(String endpoint, Map<String, String> queryParams) {
        def url = new StringBuilder()
        url.append(baseUrl)
        
        // Add endpoint (ensure it starts with /)
        if (!endpoint.startsWith("/")) {
            url.append("/")
        }
        url.append(endpoint)
        
        // Add query parameters
        if (queryParams && !queryParams.isEmpty()) {
            url.append("?")
            url.append(queryParams.collect { k, v ->
                "${URLEncoder.encode(k as String, 'UTF-8')}=${URLEncoder.encode(v as String, 'UTF-8')}"
            }.join("&"))
        }
        
        return url.toString()
    }
    
    /**
     * Validate response performance against threshold
     * @param response HttpResponse object
     * @param thresholdMs Performance threshold (default 500ms)
     * @throws AssertionError if performance threshold exceeded
     */
    static void validatePerformance(HttpResponse response, int thresholdMs = PERFORMANCE_THRESHOLD_MS) {
        assert response.responseTimeMs <= thresholdMs : 
            "Performance threshold exceeded: ${response.responseTimeMs}ms > ${thresholdMs}ms for ${response.method} ${response.url}"
    }
    
    /**
     * Parse JSON response body safely
     * @param response HttpResponse object
     * @return Parsed JSON object or null if parsing fails
     */
    def parseJsonResponse(HttpResponse response) {
        try {
            if (response.body && !response.body.trim().isEmpty()) {
                return jsonSlurper.parseText(response.body)
            }
        } catch (Exception e) {
            println "⚠️ Failed to parse JSON response: ${e.message}"
            println "Response body: ${response.body}"
        }
        return null
    }
    
    /**
     * Validate successful HTTP response
     * @param response HttpResponse object
     * @param expectedStatus Expected HTTP status code (default 200)
     * @throws AssertionError if validation fails
     */
    static void validateSuccess(HttpResponse response, int expectedStatus = 200) {
        assert response.statusCode == expectedStatus : 
            "Expected status ${expectedStatus}, got ${response.statusCode}. Response: ${response.body}"
        assert response.success : 
            "Request failed: ${response.method} ${response.url} - ${response.body}"
    }
    
    /**
     * Validate error HTTP response
     * @param response HttpResponse object
     * @param expectedStatus Expected error HTTP status code
     * @throws AssertionError if validation fails
     */
    static void validateError(HttpResponse response, int expectedStatus) {
        assert response.statusCode == expectedStatus : 
            "Expected error status ${expectedStatus}, got ${response.statusCode}. Response: ${response.body}"
        assert !response.success : 
            "Expected failure but request succeeded: ${response.method} ${response.url}"
    }
}