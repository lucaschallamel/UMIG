/**
 * Interface Definition: [Interface Name]
 * 
 * Purpose: [Brief description of interface purpose]
 * Version: 1.0
 * Date: [YYYY-MM-DD]
 * Author: [Author Name]
 * 
 * Related ABB: [ABB-XXX-NNN]
 * Related SBB: [SBB-XXX-NNN]
 */

package com.umig.architecture.interfaces

import groovy.transform.CompileStatic
import groovy.transform.TypeChecked

/**
 * Primary interface definition
 * 
 * This interface defines [what it defines]
 * 
 * @since 1.0
 */
@CompileStatic
interface [InterfaceName] {
    
    // ============================================
    // Core Operations (Mandatory)
    // ============================================
    
    /**
     * [Operation description]
     * 
     * @param param1 [Parameter description]
     * @param param2 [Parameter description]
     * @return [Return value description]
     * @throws [ExceptionType] [When thrown]
     */
    ReturnType mandatoryOperation(ParamType1 param1, ParamType2 param2) throws ExceptionType
    
    // ============================================
    // Query Operations (Read-only)
    // ============================================
    
    /**
     * [Query operation description]
     * 
     * @param id [Parameter description]
     * @return [Return value description]
     */
    ReadType queryOperation(IdentifierType id)
    
    // ============================================
    // Command Operations (State-changing)
    // ============================================
    
    /**
     * [Command operation description]
     * 
     * @param command [Command description]
     * @return [Result description]
     */
    CommandResult executeCommand(CommandType command)
    
    // ============================================
    // Validation Operations
    // ============================================
    
    /**
     * Validates [what it validates]
     * 
     * @param input [Input to validate]
     * @return ValidationResult containing status and errors
     */
    ValidationResult validate(InputType input)
}

/**
 * Supporting Data Transfer Objects
 */
@CompileStatic
class ValidationResult {
    boolean valid
    List<String> errors = []
    Map<String, Object> metadata = [:]
}

/**
 * Request/Response DTOs
 */
@CompileStatic
class OperationRequest {
    String requestId
    Map<String, Object> parameters
    Date timestamp
}

@CompileStatic
class OperationResponse {
    String requestId
    boolean success
    Object data
    List<String> messages = []
    Date timestamp
}

/**
 * Exception definitions
 */
class InterfaceException extends Exception {
    String errorCode
    Map<String, Object> context
    
    InterfaceException(String message, String errorCode, Map context = [:]) {
        super(message)
        this.errorCode = errorCode
        this.context = context
    }
}

/**
 * Constants and Enumerations
 */
enum OperationStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    FAILED,
    CANCELLED
}

/**
 * Factory interface (if applicable)
 */
@CompileStatic
interface [InterfaceName]Factory {
    /**
     * Creates an instance of [InterfaceName]
     * 
     * @param config Configuration parameters
     * @return Configured instance
     */
    [InterfaceName] createInstance(Map<String, Object> config)
}

/**
 * Callback interface (if async operations)
 */
@CompileStatic
interface [InterfaceName]Callback {
    void onSuccess(OperationResponse response)
    void onError(InterfaceException error)
    void onProgress(int percentComplete, String message)
}

/**
 * Default implementation abstract class (optional)
 */
@CompileStatic
abstract class Abstract[InterfaceName] implements [InterfaceName] {
    
    protected Map<String, Object> configuration = [:]
    
    // Common implementation that subclasses can use
    protected ValidationResult createValidationResult(boolean valid, String... errors) {
        new ValidationResult(
            valid: valid,
            errors: errors as List
        )
    }
    
    // Template method pattern (if applicable)
    protected abstract void doSpecificOperation()
    
    void templateOperation() {
        preProcess()
        doSpecificOperation()
        postProcess()
    }
    
    protected void preProcess() {
        // Default preprocessing
    }
    
    protected void postProcess() {
        // Default postprocessing
    }
}

/**
 * Interface compliance test trait
 */
@TypeChecked
trait [InterfaceName]ComplianceTest {
    
    abstract [InterfaceName] createTestSubject()
    
    void testMandatoryOperations() {
        def subject = createTestSubject()
        assert subject != null
        // Add compliance tests
    }
    
    void testErrorHandling() {
        def subject = createTestSubject()
        // Test error scenarios
    }
}