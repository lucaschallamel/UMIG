package v1.persons

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

def validatePersonInput(Map input) {
    if (!input.first_name?.trim() || !input.last_name?.trim() || !input.email?.trim()) {
        return 'Missing or invalid fields. "first_name", "last_name", and "email" are required.'
    }
    return null
}

// CREATE a person
createPerson(
    httpMethod: "POST", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def input = parseJsonBody(body)
    def validationError = validatePersonInput(input)
    if (validationError) return buildErrorResponse(400, validationError)

    try {
        def result = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            result = sql.firstRow(
                '''INSERT INTO team_members (first_name, last_name, email, role) VALUES (?, ?, ?, ?) RETURNING id, first_name, last_name, email, role, created_at''',
                [input.first_name, input.last_name, input.email, input.role]
            )
        }
        return Response.status(201).entity(new JsonBuilder(result).toString()).build()
    } catch (Exception e) {
        if (e.message?.contains('duplicate key value')) {
            return buildErrorResponse(409, 'A person with this email already exists.')
        }
        return buildErrorResponse(500, e.message)
    }
}

// READ ALL persons
listPersons(
    httpMethod: "GET", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    try {
        def persons = []
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            persons = sql.rows('SELECT id, first_name, last_name, email, role, team_id, created_at, updated_at FROM team_members ORDER BY last_name, first_name')
        }
        return Response.ok(new JsonBuilder(persons).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}

// READ ONE person
getPerson(
    httpMethod: "GET", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def id = queryParams.getFirst('id')
    if (!id?.isInteger()) return buildErrorResponse(400, 'Missing or invalid person id.')

    try {
        def person = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            person = sql.firstRow('SELECT * FROM team_members WHERE id = ?', [id.toInteger()])
        }
        if (!person) return buildErrorResponse(404, 'Person not found.')
        return Response.ok(new JsonBuilder(person).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}

// UPDATE a person
updatePerson(
    httpMethod: "PUT", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def id = queryParams.getFirst('id')
    if (!id?.isInteger()) return buildErrorResponse(400, 'Missing or invalid person id.')

    def input = parseJsonBody(body)
    def validationError = validatePersonInput(input)
    if (validationError) return buildErrorResponse(400, validationError)

    try {
        def updated = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            def count = sql.executeUpdate(
                '''UPDATE team_members SET first_name = ?, last_name = ?, email = ?, role = ?, updated_at = NOW() WHERE id = ?''',
                [input.first_name, input.last_name, input.email, input.role, id.toInteger()]
            )
            if (count == 0) return buildErrorResponse(404, 'Person not found.')
            updated = sql.firstRow('SELECT * FROM team_members WHERE id = ?', [id.toInteger()])
        }
        return Response.ok(new JsonBuilder(updated).toString()).build()
    } catch (Exception e) {
        if (e.message?.contains('duplicate key value')) {
            return buildErrorResponse(409, 'A person with this email already exists.')
        }
        return buildErrorResponse(500, e.message)
    }
}

// DELETE a person
deletePerson(
    httpMethod: "DELETE", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def id = queryParams.getFirst('id')
    if (!id?.isInteger()) return buildErrorResponse(400, 'Missing or invalid person id.')

    try {
        def deleted = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            deleted = sql.firstRow('SELECT * FROM team_members WHERE id = ?', [id.toInteger()])
            if (!deleted) return buildErrorResponse(404, 'Person not found.')
            sql.executeUpdate('DELETE FROM team_members WHERE id = ?', [id.toInteger()])
        }
        return Response.ok(new JsonBuilder(deleted).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}
