package v1.teams

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import com.onresolve.scriptrunner.db.DatabaseUtil
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import groovy.sql.Sql

@BaseScript CustomEndpointDelegate delegate

def POOL_NAME = 'umig_app_db_pool'

def buildErrorResponse(int status, String message) {
    return Response.status(status).entity(new JsonBuilder([error: message]).toString()).build()
}

// ASSIGN: Assign a person to a team
assignPersonToTeam(
    httpMethod: "PUT", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def personId = queryParams.getFirst('person_id')
    def teamId = queryParams.getFirst('team_id')

    if (!personId?.isInteger()) return buildErrorResponse(400, 'Missing or invalid person_id parameter.')
    if (!teamId?.isInteger()) return buildErrorResponse(400, 'Missing or invalid team_id parameter.')

    try {
        def updatedPerson = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            // Check if person and team exist
            def person = sql.firstRow('SELECT id FROM team_members WHERE id = ?', [personId.toInteger()])
            if (!person) return buildErrorResponse(404, 'Person not found.')
            def team = sql.firstRow('SELECT id FROM teams WHERE id = ?', [teamId.toInteger()])
            if (!team) return buildErrorResponse(404, 'Team not found.')

            // Assign person to team
            sql.executeUpdate(
                'UPDATE team_members SET team_id = ?, updated_at = NOW() WHERE id = ?',
                [teamId.toInteger(), personId.toInteger()]
            )
            
            updatedPerson = sql.firstRow('SELECT * FROM team_members WHERE id = ?', [personId.toInteger()])
        }
        return Response.ok(new JsonBuilder(updatedPerson).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}

// READ: List all members for a given team
listTeamMembers(
    httpMethod: "GET", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def teamId = queryParams.getFirst('team_id')
    if (!teamId?.isInteger()) return buildErrorResponse(400, 'Missing or invalid team_id parameter.')

    try {
        def members = []
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            members = sql.rows('SELECT * FROM team_members WHERE team_id = ? ORDER BY last_name, first_name', [teamId.toInteger()])
        }
        return Response.ok(new JsonBuilder(members).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}

// REMOVE: Remove a person from a team (by setting team_id to null)
removePersonFromTeam(
    httpMethod: "PUT", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def personId = queryParams.getFirst('person_id')
    if (!personId?.isInteger()) return buildErrorResponse(400, 'Missing or invalid person_id parameter.')

    try {
        def updatedPerson = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            // Check if person exists
            def person = sql.firstRow('SELECT id FROM team_members WHERE id = ?', [personId.toInteger()])
            if (!person) return buildErrorResponse(404, 'Person not found.')
            
            // Set team_id to null
            sql.executeUpdate(
                'UPDATE team_members SET team_id = NULL, updated_at = NOW() WHERE id = ?',
                [personId.toInteger()]
            )
            
            updatedPerson = sql.firstRow('SELECT * FROM team_members WHERE id = ?', [personId.toInteger()])
        }
        return Response.ok(new JsonBuilder(updatedPerson).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}
