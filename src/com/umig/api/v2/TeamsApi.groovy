package com.umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import com.umig.repository.TeamRepository
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

final TeamRepository teamRepository = new TeamRepository()

/**
 * Returns all users for a given team, including audit fields from the join table.
 * Endpoint: GET /teams/{teamId}/members
 */
teamsMembers(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    final Integer teamId = getTeamIdFromPath(request)
    if (teamId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Team ID is required in the path for members endpoint."]).toString()).build()
    }
    def team = teamRepository.findTeamById(teamId)
    if (!team) {
        return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Team with ID ${teamId} not found."]).toString()).build()
    }
    def members = teamRepository.findTeamMembers(teamId)
    return Response.ok(new JsonBuilder(members).toString()).build()
}

private Integer getTeamIdFromPath(HttpServletRequest request) {
    def extraPath = getAdditionalPath(request)
    if (extraPath) {
        def pathParts = extraPath.split('/').findAll { it }
        if (pathParts) {
            try {
                return pathParts[0].toInteger()
            } catch (NumberFormatException e) {
                return null
            }
        }
    }
    return null
}

teams(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    final Integer teamId = getTeamIdFromPath(request)

    if (teamId != null) {
        def team = teamRepository.findTeamById(teamId)
        if (team) {
            return Response.ok(new JsonBuilder(team).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Team with ID ${teamId} not found."]).toString()).build()
        }
    } else {
        def teams = teamRepository.findAllTeams()
        return Response.ok(new JsonBuilder(teams).toString()).build()
    }
}

teams(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        Map teamData = new JsonSlurper().parseText(body) as Map
        def newTeam = teamRepository.createTeam(teamData)
        if (newTeam) {
            return Response.status(Response.Status.CREATED).entity(new JsonBuilder(newTeam).toString()).build()
        } else {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Failed to create team."]).toString()).build()
        }
    } catch (Exception e) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid request body: ${e.message}"]).toString()).build()
    }
}

teams(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    final Integer teamId = getTeamIdFromPath(request)
    if (teamId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Team ID is required for PUT method."]).toString()).build()
    }

    try {
        Map teamData = new JsonSlurper().parseText(body) as Map
        def updatedTeam = teamRepository.updateTeam(teamId, teamData)
        if (updatedTeam) {
            return Response.ok(new JsonBuilder(updatedTeam).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Team with ID ${teamId} not found for update."]).toString()).build()
        }
    } catch (Exception e) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid request body: ${e.message}"]).toString()).build()
    }
}

teams(httpMethod: "DELETE", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    final Integer teamId = getTeamIdFromPath(request)
    if (teamId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Team ID is required for DELETE method."]).toString()).build()
    }

    if (teamRepository.deleteTeam(teamId)) {
        return Response.noContent().build()
    } else {
        return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Team with ID ${teamId} not found for deletion."]).toString()).build()
    }
}
