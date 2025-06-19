package v1.teams

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import com.onresolve.scriptrunner.db.DatabaseUtil
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import groovy.sql.Sql

@BaseScript CustomEndpointDelegate delegate

def POOL_NAME = 'umig_app_db_pool'

def validateTeamInput(Map input) {
    if (!input || !(input.name instanceof String) || !((input.name as String).trim())) {
        return 'Missing or invalid "name" field.'
    }
    return null
}

def buildErrorResponse(int status, String message) {
    return Response.status(status).entity(new JsonBuilder([error: message]).toString()).build()
}

def parseJsonBody(String body) {
    try {
        def parsed = new JsonSlurper().parseText(body ?: '{}')
        return (parsed instanceof Map) ? (Map) parsed : [:]
    } catch (e) {
        return [:]
    }
}

// CREATE
createTeam(
    httpMethod: "POST", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def inputObj = parseJsonBody(body)
    Map input = (inputObj instanceof Map) ? (Map) inputObj : [:]
    def validationError = validateTeamInput(input)
    if (validationError) return buildErrorResponse(400, validationError.toString())
    try {
        def result = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            result = sql.firstRow(
                '''INSERT INTO teams (name, description) VALUES (?, ?) RETURNING id, name, description, created_at, updated_at''',
                [input.name, input.description]
            )
        }
        return Response.status(201).entity(new JsonBuilder(result).toString()).build()
    } catch (Exception e) {
        if (e.message?.contains('duplicate key value')) {
            return buildErrorResponse(409, 'A team with this name already exists.')
        }
        return buildErrorResponse(500, e.message)
    }
}

// READ ALL
listTeams(
    httpMethod: "GET",
    groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    try {
        def teams = []
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            teams = sql.rows('SELECT * FROM teams ORDER BY name')
        }
        return Response.ok(new JsonBuilder(teams).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}

// READ ONE
getTeam(
    httpMethod: "GET",
    groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def id = queryParams.getFirst('id')
    if (!(id?.toString()?.isInteger())) return buildErrorResponse(400, 'Missing or invalid team id.')
    try {
        def team = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            team = sql.firstRow('SELECT * FROM teams WHERE id = ?', [id.toString().toInteger()])
        }
        if (!team) return buildErrorResponse(404, 'Team not found.')
        return Response.ok(new JsonBuilder(team).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}

// UPDATE
updateTeam(
    httpMethod: "PUT", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def id = queryParams.getFirst('id')
    if (!(id?.toString()?.isInteger())) return buildErrorResponse(400, 'Missing or invalid team id.')
    def inputObj = parseJsonBody(body)
    Map input = (inputObj instanceof Map) ? (Map) inputObj : [:]
    def validationError = validateTeamInput(input)
    if (validationError) return buildErrorResponse(400, validationError.toString())
    try {
        def updated = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            def count = sql.executeUpdate(
                '''UPDATE teams SET name = ?, description = ?, updated_at = NOW() WHERE id = ?''',
                [input.name, input.description, id.toString().toInteger()]
            )
            if (count == 0) return buildErrorResponse(404, 'Team not found.')
            updated = sql.firstRow('SELECT * FROM teams WHERE id = ?', [id.toString().toInteger()])
        }
        return Response.ok(new JsonBuilder(updated).toString()).build()
    } catch (Exception e) {
        if (e.message?.contains('duplicate key value')) {
            return buildErrorResponse(409, 'A team with this name already exists.')
        }
        return buildErrorResponse(500, e.message)
    }
}

// DELETE
deleteTeam(
    httpMethod: "DELETE", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def id = queryParams.getFirst('id')
    if (!(id?.toString()?.isInteger())) return buildErrorResponse(400, 'Missing or invalid team id.')
    try {
        def deleted = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            deleted = sql.firstRow('SELECT * FROM teams WHERE id = ?', [id.toString().toInteger()])
            if (!deleted) return buildErrorResponse(404, 'Team not found.')
            sql.executeUpdate('DELETE FROM teams WHERE id = ?', [id.toString().toInteger()])
        }
        return Response.ok(new JsonBuilder(deleted).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}
