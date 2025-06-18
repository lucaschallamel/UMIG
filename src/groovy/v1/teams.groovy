package v1

import com.onresolve.scriptrunner.runner.rest.Endpoint
import com.onresolve.scriptrunner.runner.rest.security.Authorised
import groovy.json.JsonSlurper
import groovy.json.JsonOutput
import groovy.sql.Sql
import org.apache.log4j.Logger
import org.apache.log4j.Level

import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

// Import the DatabaseConnectionManager to get a connection pool managed by ScriptRunner
import com.onresolve.scriptrunner.db.DatabaseConnectionManager

/**
 * REST endpoint for managing Teams.
 * Handles CRUD operations for the 'teams' table.
 */
@Endpoint(name = "teams")
@Authorised(groups = ["confluence-users"]) // Only allows logged-in Confluence users to access this endpoint
class TeamsEndpoint {

    // It's a good practice to use a logger for debugging and monitoring.
    private final Logger log = Logger.getLogger(TeamsEndpoint.class)

    // --- IMPORTANT --- 
    // This is the name of the database connection you must configure in the ScriptRunner UI.
    // Go to ScriptRunner Admin -> Database Connections -> Add new connection.
    // Use the details from your .env file (host: umig_postgres, db: umig_app_db, etc.)
    private static final String DB_CONNECTION_NAME = "umig_db_connection"

    /**
     * Handles POST requests to /umig/api/v1/teams
     * Creates a new team.
     *
     * @param headers The request headers.
     * @param body The request body, expected to be a JSON object with a 'name' and optional 'description'.
     * @return A Response object.
     */
    Response doPost(MultivaluedMap<String, String> headers, String body) {
        log.setLevel(Level.DEBUG) // Set log level for detailed output during development
        log.debug("Received POST request to create a new team.")

        def slurper = new JsonSlurper()
        def inputData

        try {
            inputData = slurper.parseText(body) as Map
        } catch (Exception e) {
            log.error("Failed to parse request body as JSON.", e)
            return Response.status(Response.Status.BAD_REQUEST).entity([error: "Invalid JSON format"]).build()
        }

        if (!inputData.name) {
            log.warn("Create team request is missing the 'name' field.")
            return Response.status(Response.Status.BAD_REQUEST).entity([error: "'name' field is required"]).build()
        }

        try {
            // Use ScriptRunner's connection manager to get a database connection instance.
            def db = DatabaseConnectionManager.getInstance().getConnection(DB_CONNECTION_NAME)
            if (!db) {
                log.error("Database connection '${DB_CONNECTION_NAME}' not found. Please configure it in ScriptRunner admin.")
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity([error: "Database connection not configured"]).build()
            }

            Sql sql = new Sql(db)
            
            // The 'executeInsert' method returns a list of generated keys.
            def newTeamKeys = sql.executeInsert(
                """INSERT INTO teams (name, description) 
                   VALUES (?, ?) 
                   RETURNING id, name, description, created_at, updated_at""", 
                [inputData.name, inputData.description]
            )

            if (newTeamKeys.isEmpty()) {
                throw new Exception("Database insert did not return the new team record.")
            }

            def newTeam = newTeamKeys.first() // Get the first row from the returned keys

            log.info("Successfully created team with ID: ${newTeam.id}")
            return Response.status(Response.Status.CREATED).entity(JsonOutput.toJson(newTeam)).build()

        } catch (Exception e) {
            // Check for unique constraint violation
            if (e.message.contains("duplicate key value violates unique constraint")) {
                log.warn("Attempted to create a team with a name that already exists: ${inputData.name}")
                return Response.status(Response.Status.CONFLICT).entity([error: "A team with this name already exists."]).build()
            }
            log.error("An unexpected error occurred while creating the team.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity([error: "An internal server error occurred.", details: e.message]).build()
        }
    }

    // TODO: Implement GET, PUT, DELETE methods
}
