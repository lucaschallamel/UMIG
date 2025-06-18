import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript
import groovy.json.JsonSlurper
import groovy.sql.Sql
import org.apache.log4j.Logger
import javax.ws.rs.core.Response
import javax.ws.rs.core.MultivaluedMap // Required for delegate closures

@BaseScript CustomEndpointDelegate delegate

// Logger setup
final Logger log = Logger.getLogger("com.umig.scriptrunner.rest.ImplementationPlanManagerDelegate")

// Database connection helper
private Sql getSqlInstance() {
    // TODO: Refactor to use a JNDI DataSource or a ScriptRunner-provided bean for connection pooling and management.
    // These env vars should be set in the Confluence container.
    def dbHost = System.getenv("DB_HOST") ?: "umig_postgres" // Service name in Docker network
    def dbPort = System.getenv("DB_PORT") ?: "5432"
    def dbName = System.getenv("DB_NAME") ?: "umig_db"
    def dbUser = System.getenv("DB_USER") ?: "umig_user"
    def dbPassword = System.getenv("DB_PASSWORD") ?: "umig_password"

    def dbUrl = "jdbc:postgresql://${dbHost}:${dbPort}/${dbName}"
    
    // Ensure the PostgreSQL JDBC driver is available in ScriptRunner's classpath.
    // Typically, add postgresql.jar to <confluence-home>/confluence/WEB-INF/lib
    return Sql.newInstance(dbUrl, dbUser, dbPassword, "org.postgresql.Driver")
}

// --- getAllImplementationPlans ---
delegate.getAllImplementationPlans(
    httpMethod: "GET",
    description: "Retrieves all Implementation Plans."
) { MultivaluedMap queryParams, String body ->
    try {
        def sql = getSqlInstance()
        def implementationPlans = sql.rows("SELECT * FROM implementation_plans ORDER BY id ASC")
        return Response.ok(implementationPlans).build()
    } catch (Exception e) {
        String errorMessage = "Error fetching all Implementation Plans"
        // Check if e.getMessage() is not null and not blank before appending
        if (e.getMessage() != null && !e.getMessage().trim().isEmpty()) {
            errorMessage += ": " + e.getMessage()
        }
        log.error(errorMessage, e) // Log the potentially augmented message and the full exception
        return Response.serverError().entity([error: errorMessage]).build()
    }
}

// --- createImplementationPlan ---
delegate.createImplementationPlan(
    httpMethod: "POST",
    description: "Creates a new Implementation Plan."
) { MultivaluedMap queryParams, String requestBody ->
    try {
        def json = new JsonSlurper().parseText(requestBody)
        if (!json.title) {
            return Response.status(Response.Status.BAD_REQUEST).entity([error: "Title is required for Implementation Plan."]).build()
        }
        def sql = getSqlInstance()
        def generatedRows = sql.executeInsert("INSERT INTO implementation_plans (title, data_migration_code, content) VALUES (?, ?, ?) RETURNING id, title, data_migration_code, content, created_at, updated_at", [json.title, json.data_migration_code ?: null, json.content ?: null])
        
        if (generatedRows && !generatedRows.isEmpty()) {
            def newImplementationPlan = generatedRows[0]
            return Response.status(Response.Status.CREATED).entity(newImplementationPlan).build()
        } else {
            log.error("Failed to create Implementation Plan, no keys returned or insert failed.")
            return Response.serverError().entity([error: "Failed to create Implementation Plan."]).build()
        }
    } catch (Exception e) {
        String errorMessage = "Error creating Implementation Plan"
        // Check if e.getMessage() is not null and not blank before appending
        if (e.getMessage() != null && !e.getMessage().trim().isEmpty()) {
            errorMessage += ": " + e.getMessage()
        }
        log.error(errorMessage, e) // Log the potentially augmented message and the full exception
        return Response.serverError().entity([error: errorMessage]).build()
    }
}

// --- getImplementationPlan ---
delegate.getImplementationPlan(
    httpMethod: "GET",
    description: "Retrieves a specific Implementation Plan by its ID."
) { MultivaluedMap queryParams, String body ->
    Integer id = queryParams.getFirst("id")?.toInteger()
    if (id == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity([error: "ID parameter is required."]).build()
    }
    try {
        def sql = getSqlInstance()
        def implementationPlan = sql.firstRow("SELECT * FROM implementation_plans WHERE id = ?", [id])
        if (implementationPlan) {
            return Response.ok(implementationPlan).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity([error: "Implementation Plan with ID ${id} not found."]).build()
        }
    } catch (Exception e) {
        String logMessage = "Error fetching Implementation Plan"
        String responseMessage = "Error fetching Implementation Plan"
        if (id != null) {
            logMessage += " with ID " + id
            responseMessage += " with ID " + id
        }
        if (e.getMessage() != null && !e.getMessage().trim().isEmpty()) {
            logMessage += ": " + e.getMessage()
            responseMessage += ": " + e.getMessage()
        }
        log.error(logMessage, e)
        return Response.serverError().entity([error: responseMessage]).build()
    }
}

// --- updateImplementationPlan ---
delegate.updateImplementationPlan(
    httpMethod: "PUT",
    description: "Updates an existing Implementation Plan."
) { MultivaluedMap queryParams, String requestBody ->
    Integer id = queryParams.getFirst("id")?.toInteger()
    if (id == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity([error: "ID parameter is required for update."]).build()
    }
    try {
        def json = new JsonSlurper().parseText(requestBody)
        if (!json.title) {
            return Response.status(Response.Status.BAD_REQUEST).entity([error: "Title is required for Implementation Plan."]).build()
        }
        def sql = getSqlInstance()
        
        def existingIp = sql.firstRow("SELECT id FROM implementation_plans WHERE id = ?", [id])
        if (!existingIp) {
            return Response.status(Response.Status.NOT_FOUND).entity([error: "Implementation Plan with ID ${id} not found."]).build()
        }

        int updatedRows = sql.executeUpdate("UPDATE implementation_plans SET title = ?, data_migration_code = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [json.title, json.data_migration_code ?: null, json.content ?: null, id])

        if (updatedRows > 0) {
            def updatedIp = sql.firstRow("SELECT * FROM implementation_plans WHERE id = ?", [id])
            return Response.ok(updatedIp).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity([error: "Implementation Plan with ID ${id} not found or no update occurred."]).build()
        }
    } catch (Exception e) {
        String logMessage = "Error updating Implementation Plan"
        String responseMessage = "Error updating Implementation Plan"
        if (id != null) {
            logMessage += " with ID " + id
            responseMessage += " with ID " + id
        }
        if (e.getMessage() != null && !e.getMessage().trim().isEmpty()) {
            logMessage += ": " + e.getMessage()
            responseMessage += ": " + e.getMessage()
        }
        log.error(logMessage, e)
        return Response.serverError().entity([error: responseMessage]).build()
    }
}

// --- deleteImplementationPlan ---
delegate.deleteImplementationPlan(
    httpMethod: "DELETE",
    description: "Deletes an Implementation Plan by its ID."
) { MultivaluedMap queryParams, String body ->
    Integer id = queryParams.getFirst("id")?.toInteger()
    if (id == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity([error: "ID parameter is required for deletion."]).build()
    }
    try {
        def sql = getSqlInstance()
        
        def existingIp = sql.firstRow("SELECT id FROM implementation_plans WHERE id = ?", [id])
        if (!existingIp) {
            return Response.status(Response.Status.NOT_FOUND).entity([error: "Implementation Plan with ID ${id} not found."]).build()
        }

        int deletedRows = sql.execute("DELETE FROM implementation_plans WHERE id = ?", [id])

        if (deletedRows > 0) {
            return Response.ok([message: "Implementation Plan with ID ${id} deleted successfully."]).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity([error: "Implementation Plan with ID ${id} not found or no deletion occurred."]).build()
        }
    } catch (Exception e) {
        String logMessage = "Error deleting Implementation Plan"
        String responseMessage = "Error deleting Implementation Plan"
        if (id != null) {
            logMessage += " with ID " + id
            responseMessage += " with ID " + id
        }
        if (e.getMessage() != null && !e.getMessage().trim().isEmpty()) {
            logMessage += ": " + e.getMessage()
            responseMessage += ": " + e.getMessage()
        }
        log.error(logMessage, e)
        return Response.serverError().entity([error: responseMessage]).build()
    }
}

