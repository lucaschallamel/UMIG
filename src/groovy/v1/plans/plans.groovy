package v1.plans

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

def validatePlanInput(Map input) {
    if (!input.title?.trim()) {
        return 'Missing or invalid "title" field.'
    }
    return null
}

// CREATE a plan
createPlan(
    httpMethod: "POST", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def input = parseJsonBody(body)
    def validationError = validatePlanInput(input)
    if (validationError) return buildErrorResponse(400, validationError)

    try {
        def result = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            result = sql.firstRow(
                '''INSERT INTO implementation_plans (title, data_migration_code, content) VALUES (?, ?, ?) RETURNING id, title, data_migration_code, content, created_at''',
                [input.title, input.data_migration_code, input.content]
            )
        }
        return Response.status(201).entity(new JsonBuilder(result).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}

// READ ALL plans
listPlans(
    httpMethod: "GET", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    try {
        def plans = []
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            plans = sql.rows('SELECT * FROM implementation_plans ORDER BY title')
        }
        return Response.ok(new JsonBuilder(plans).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}

// READ ONE plan
getPlan(
    httpMethod: "GET", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def id = queryParams.getFirst('id')
    if (!id?.isInteger()) return buildErrorResponse(400, 'Missing or invalid plan id.')

    try {
        def plan = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            plan = sql.firstRow('SELECT * FROM implementation_plans WHERE id = ?', [id.toInteger()])
        }
        if (!plan) return buildErrorResponse(404, 'Plan not found.')
        return Response.ok(new JsonBuilder(plan).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}

// UPDATE a plan
updatePlan(
    httpMethod: "PUT", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def id = queryParams.getFirst('id')
    if (!id?.isInteger()) return buildErrorResponse(400, 'Missing or invalid plan id.')

    def input = parseJsonBody(body)
    def validationError = validatePlanInput(input)
    if (validationError) return buildErrorResponse(400, validationError)

    try {
        def updated = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            def count = sql.executeUpdate(
                '''UPDATE implementation_plans SET title = ?, data_migration_code = ?, content = ?, updated_at = NOW() WHERE id = ?''',
                [input.title, input.data_migration_code, input.content, id.toInteger()]
            )
            if (count == 0) return buildErrorResponse(404, 'Plan not found.')
            updated = sql.firstRow('SELECT * FROM implementation_plans WHERE id = ?', [id.toInteger()])
        }
        return Response.ok(new JsonBuilder(updated).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}

// DELETE a plan
deletePlan(
    httpMethod: "DELETE", groups: ["confluence-administrators"]
) { MultivaluedMap queryParams, String body ->
    def id = queryParams.getFirst('id')
    if (!id?.isInteger()) return buildErrorResponse(400, 'Missing or invalid plan id.')

    try {
        def deleted = null
        DatabaseUtil.withSql(POOL_NAME) { Sql sql ->
            deleted = sql.firstRow('SELECT * FROM implementation_plans WHERE id = ?', [id.toInteger()])
            if (!deleted) return buildErrorResponse(404, 'Plan not found.')
            sql.executeUpdate('DELETE FROM implementation_plans WHERE id = ?', [id.toInteger()])
        }
        return Response.ok(new JsonBuilder(deleted).toString()).build()
    } catch (Exception e) {
        return buildErrorResponse(500, e.message)
    }
}
