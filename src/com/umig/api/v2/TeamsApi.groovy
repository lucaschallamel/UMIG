package com.umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import com.umig.repository.TeamRepository
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import groovy.json.JsonException
import java.sql.SQLException
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

final TeamRepository teamRepository = new TeamRepository()

/**
 * Handles GET requests for Teams.
 * - GET /teams -> returns all teams
 * - GET /teams/{id} -> returns a single team
 * - GET /teams/{id}/members -> returns all members of a team
 */
teams(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // GET /teams
    if (pathParts.empty) {
        def teams = teamRepository.findAllTeams()
        return Response.ok(new JsonBuilder(teams).toString()).build()
    }

    def teamId
    try {
        teamId = pathParts[0].toInteger()
    } catch (NumberFormatException e) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Team ID format: '${pathParts[0]}'"]).toString()).build()
    }

    def team = teamRepository.findTeamById(teamId)
    if (!team) {
        return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Team with ID ${teamId} not found."]).toString()).build()
    }

    // GET /teams/{id}/members
    if (pathParts.size() > 1 && pathParts[1] == "members") {
        def members = teamRepository.findTeamMembers(teamId)
        return Response.ok(new JsonBuilder(members).toString()).build()
    }

    // GET /teams/{id}
    if (pathParts.size() == 1) {
        return Response.ok(new JsonBuilder(team).toString()).build()
    }

    // Fallback for invalid paths like /teams/{id}/something_else
    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid path."]).toString()).build()
}


/**
 * Handles POST requests to create a new team.
 * Endpoint: POST /teams
 */
teams(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        Map teamData = new JsonSlurper().parseText(body) as Map
        def newTeam = teamRepository.createTeam(teamData)

        if (newTeam) {
            return Response.status(Response.Status.CREATED).entity(new JsonBuilder(newTeam).toString()).build()
        } else {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Failed to create team due to an unknown error."]).toString()).build()
        }
    } catch (JsonException e) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid JSON format in request body."]).toString()).build()
    } catch (SQLException e) {
        if (e.getSQLState() == '23505' && e.getMessage().contains("teams_tms_tms_email_key")) {
            return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([error: "A team with this email already exists."]).toString()).build()
        }
        log.warn("An unexpected database error occurred during team creation.", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "A database error occurred."]).toString()).build()
    } catch (Exception e) {
        log.error("An unexpected error occurred during team creation.", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
    }
}

/**
 * Handles PUT requests to update a team.
 * Endpoint: PUT /teams/{id}
 */
teams(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    if (pathParts.size() != 1) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid path. Expecting /teams/{teamId}."]).toString()).build()
    }

    def teamId
    try {
        teamId = pathParts[0].toInteger()
    } catch (NumberFormatException e) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Team ID format: '${pathParts[0]}'"]).toString()).build()
    }

    try {
        Map teamData = new JsonSlurper().parseText(body) as Map
        def updatedTeam = teamRepository.updateTeam(teamId, teamData)

        if (updatedTeam) {
            return Response.ok(new JsonBuilder(updatedTeam).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Team with ID ${teamId} not found for update."]).toString()).build()
        }
    } catch (JsonException e) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid JSON format in request body."]).toString()).build()
    } catch (SQLException e) {
        if (e.getSQLState() == '23505' && e.getMessage().contains("teams_tms_tms_email_key")) {
            return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([error: "A team with this email already exists."]).toString()).build()
        }
        log.warn("An unexpected database error occurred during team update.", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "A database error occurred."]).toString()).build()
    } catch (Exception e) {
        log.error("An unexpected error occurred during team update.", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
    }
}

/**
 * Handles DELETE requests to delete a team.
 * Endpoint: DELETE /teams/{id}
 */
teams(httpMethod: "DELETE", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    if (pathParts.size() != 1) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid path. Expecting /teams/{teamId}."]).toString()).build()
    }

    def teamId
    try {
        teamId = pathParts[0].toInteger()
    } catch (NumberFormatException e) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Team ID format: '${pathParts[0]}'"]).toString()).build()
    }

    if (teamRepository.deleteTeam(teamId)) {
        return Response.noContent().build()
    } else {
        return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Team with ID ${teamId} not found for deletion."]).toString()).build()
    }
}
