package umig.tests.unit.api.v2

/**
 * Mock Response class to avoid JAX-RS dependency issues during testing
 */
class MockResponse {
    int status
    Object entity
    
    static MockResponse ok(Object entity = null) {
        new MockResponse(status: 200, entity: entity)
    }
    
    static MockResponse status(int code) {
        new MockResponse(status: code)
    }
    
    static MockResponse notFound() {
        new MockResponse(status: 404)
    }
    
    static MockResponse badRequest() {
        new MockResponse(status: 400)
    }
    
    MockResponse entity(Object entity) {
        this.entity = entity
        return this
    }
    
    MockResponse build() {
        return this
    }
    
    static class Status {
        static final Status OK = new Status(statusCode: 200)
        static final Status BAD_REQUEST = new Status(statusCode: 400)
        static final Status NOT_FOUND = new Status(statusCode: 404)
        static final Status INTERNAL_SERVER_ERROR = new Status(statusCode: 500)
        static final Status NOT_IMPLEMENTED = new Status(statusCode: 501)
        
        int statusCode
    }
}