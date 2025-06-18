package com.umig.scriptrunner.rest

import com.onresolve.scriptrunner.runner.rest.Endpoint
import com.onresolve.scriptrunner.runner.rest.RestEndpoint
import groovy.json.JsonSlurper
import groovy.sql.Sql
import org.apache.log4j.Logger // For logging

import javax.ws.rs.QueryParam // For query parameters
import javax.ws.rs.core.MediaType
import javax.ws.rs.core.Response

@RestEndpoint(description = "API for managing UMIG Implementation Plans") // Terminology change
class ImplementationPlanManager { // Class name change

    private final Logger log = Logger.getLogger(getClass())

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

    @Endpoint(name = "getAllImplementationPlans", methods = ["GET"], description = "Retrieves all Implementation Plans.") // Endpoint name and description change
    Response getAllImplementationPlans() { // Method name change
        try {
            def sql = getSqlInstance()
            def implementationPlans = sql.rows("SELECT * FROM implementation_plans ORDER BY id ASC") // Table name change
            return Response.ok(implementationPlans).build()
        } catch (Exception e) {
            log.error("Error fetching all Implementation Plans: ${e.getMessage()}", e) // Log message change
            return Response.serverError().entity([error: "Error fetching all Implementation Plans: ${e.getMessage()}"]).build() // Error message change
        }
    }

    @Endpoint(name = "createImplementationPlan", methods = ["POST"], description = "Creates a new Implementation Plan.") // Endpoint name and description change
    Response createImplementationPlan(String body) { // Method name change
        try {
            def json = new JsonSlurper().parseText(body)
            if (!json.title) {
                return Response.status(Response.Status.BAD_REQUEST).entity([error: "Title is required for Implementation Plan."]).build() // Error message change
            }
            def sql = getSqlInstance()
            // Added data_migration_code to insert and return
            def generatedRows = sql.executeInsert("INSERT INTO implementation_plans (title, data_migration_code, content) VALUES (?, ?, ?) RETURNING id, title, data_migration_code, content, created_at, updated_at", [json.title, json.data_migration_code ?: null, json.content ?: null])
            
            if (generatedRows && !generatedRows.isEmpty()) {
                def newImplementationPlan = generatedRows[0] // Variable name change
                return Response.status(Response.Status.CREATED).entity(newImplementationPlan).build()
            } else {
                log.error("Failed to create Implementation Plan, no keys returned or insert failed.") // Log message change
                return Response.serverError().entity([error: "Failed to create Implementation Plan."]).build() // Error message change
            }
        } catch (Exception e) {
            log.error("Error creating Implementation Plan: ${e.getMessage()}", e) // Log message change
            return Response.serverError().entity([error: "Error creating Implementation Plan: ${e.getMessage()}"]).build() // Error message change
        }
    }

    @Endpoint(name = "getImplementationPlan", methods = ["GET"], description = "Retrieves a specific Implementation Plan by its ID.") // Endpoint name and description change
    Response getImplementationPlan(@QueryParam("id") Integer id) { // Method name change
        if (id == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity([error: "ID parameter is required."]).build()
        }
        try {
            def sql = getSqlInstance()
            def implementationPlan = sql.firstRow("SELECT * FROM implementation_plans WHERE id = ?", [id]) // Table name change, variable name change
            if (implementationPlan) {
                return Response.ok(implementationPlan).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND).entity([error: "Implementation Plan with ID ${id} not found."]).build() // Error message change
            }
        } catch (Exception e) {
            log.error("Error fetching Implementation Plan with ID ${id}: ${e.getMessage()}", e) // Log message change
            return Response.serverError().entity([error: "Error fetching Implementation Plan: ${e.getMessage()}"]).build() // Error message change
        }
    }

    @Endpoint(name = "updateImplementationPlan", methods = ["PUT"], description = "Updates an existing Implementation Plan.") // Endpoint name and description change
    Response updateImplementationPlan(@QueryParam("id") Integer id, String body) { // Method name change
        if (id == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity([error: "ID parameter is required for update."]).build()
        }
        try {
            def json = new JsonSlurper().parseText(body)
            if (!json.title) {
                return Response.status(Response.Status.BAD_REQUEST).entity([error: "Title is required for Implementation Plan."]).build() // Error message change
            }
            def sql = getSqlInstance()
            
            def existingIp = sql.firstRow("SELECT id FROM implementation_plans WHERE id = ?", [id]) // Table name change, variable name change
            if (!existingIp) {
                return Response.status(Response.Status.NOT_FOUND).entity([error: "Implementation Plan with ID ${id} not found."]).build() // Error message change
            }

            // Added data_migration_code to update
            int updatedRows = sql.executeUpdate("UPDATE implementation_plans SET title = ?, data_migration_code = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [json.title, json.data_migration_code ?: null, json.content ?: null, id])

            if (updatedRows > 0) {
                def updatedIp = sql.firstRow("SELECT * FROM implementation_plans WHERE id = ?", [id]) // Table name change, variable name change
                return Response.ok(updatedIp).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND).entity([error: "Implementation Plan with ID ${id} not found or no update occurred."]).build() // Error message change
            }
        } catch (Exception e) {
            log.error("Error updating Implementation Plan with ID ${id}: ${e.getMessage()}", e) // Log message change
            return Response.serverError().entity([error: "Error updating Implementation Plan: ${e.getMessage()}"]).build() // Error message change
        }
    }

    @Endpoint(name = "deleteImplementationPlan", methods = ["DELETE"], description = "Deletes an Implementation Plan by its ID.") // Endpoint name and description change
    Response deleteImplementationPlan(@QueryParam("id") Integer id) { // Method name change
        if (id == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity([error: "ID parameter is required for deletion."]).build()
        }
        try {
            def sql = getSqlInstance()
            
            def existingIp = sql.firstRow("SELECT id FROM implementation_plans WHERE id = ?", [id]) // Table name change, variable name change
            if (!existingIp) {
                return Response.status(Response.Status.NOT_FOUND).entity([error: "Implementation Plan with ID ${id} not found."]).build() // Error message change
            }

            int deletedRows = sql.execute("DELETE FROM implementation_plans WHERE id = ?", [id]) // Table name change

            if (deletedRows > 0) {
                return Response.ok([message: "Implementation Plan with ID ${id} deleted successfully."]).build() // Message change
            } else {
                return Response.status(Response.Status.NOT_FOUND).entity([error: "Implementation Plan with ID ${id} not found or no deletion occurred."]).build() // Error message change
            }
        } catch (Exception e) {
            log.error("Error deleting Implementation Plan with ID ${id}: ${e.getMessage()}", e) // Log message change
            return Response.serverError().entity([error: "Error deleting Implementation Plan: ${e.getMessage()}"]).build() // Error message change
        }
    }
}
