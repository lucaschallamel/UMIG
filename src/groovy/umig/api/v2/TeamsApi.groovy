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
final com.umig.repository.UserRepository userRepository = new com.umig.repository.UserRepository()

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

    // Route: PUT /teams/{teamId}/users/{userId} -> Add user to team
    if (pathParts.size() == 3 && pathParts[1] == 'users') {
        def teamId
        def userId
        try {
            teamId = pathParts[0].toInteger()
            userId = pathParts[2].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Team or User ID format."]).toString()).build()
        }

        // Robust: Check both team and user existence before adding
        def team = teamRepository.findTeamById(teamId)
        if (!team) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Team with ID ${teamId} not found."]).toString()).build()
        }
        def user = userRepository.findUserById(userId)
        if (!user) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }
        try {
            def result = teamRepository.addUserToTeam(teamId, userId)
            if (result.status == 'created') {
                return Response.status(Response.Status.CREATED).entity(new JsonBuilder([message: "User ${userId} added to team ${teamId}."]).toString()).build()
            }
            if (result.status == 'exists') {
                return Response.status(Response.Status.OK).entity(new JsonBuilder([message: "User ${userId} is already a member of team ${teamId}."]).toString()).build()
            }
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Failed to add user to team."]).toString()).build()
        } catch (SQLException e) {
            log.warn("Database error adding user ${userId} to team ${teamId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "A database error occurred."]).toString()).build()
        } catch (Exception e) {
            log.error("Unexpected error adding user ${userId} to team ${teamId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Route: PUT /teams/{teamId} -> Update team details
    if (pathParts.size() == 1) {
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

    // Fallback for invalid PUT paths
    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid path for PUT request."]).toString()).build()
}

/**
 * Handles DELETE requests to delete a team.
 * Endpoint: DELETE /teams/{id}
 */
teams(httpMethod: "DELETE", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // Route: DELETE /teams/{teamId}/users/{userId} -> Remove user from team
    if (pathParts.size() == 3 && pathParts[1] == 'users') {
        def teamId
        def userId
        try {
            teamId = pathParts[0].toInteger()
            userId = pathParts[2].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Team or User ID format."]).toString()).build()
        }

        // Robust: Check both team and user existence before removing
        def team = teamRepository.findTeamById(teamId)
        if (!team) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Team with ID ${teamId} not found."]).toString()).build()
        }
        def user = userRepository.findUserById(userId)
        if (!user) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "User with ID ${userId} not found."]).toString()).build()
        }
        try {
            def rowsAffected = teamRepository.removeUserFromTeam(teamId, userId)
            if (rowsAffected > 0) {
                return Response.noContent().build()
            } else {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User with ID ${userId} was not a member of team ${teamId}."]).toString()).build()
            }
        } catch (Exception e) {
            log.error("Unexpected error removing user ${userId} from team ${teamId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Route: DELETE /teams/{teamId} -> Delete a team
    if (pathParts.size() == 1) {
        def teamId
        try {
            teamId = pathParts[0].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Team ID format: '${pathParts[0]}'"]).toString()).build()
        }

        if (teamRepository.findTeamById(teamId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Team with ID ${teamId} not found."]).toString()).build()
        }

        try {
            teamRepository.deleteTeam(teamId)
            return Response.noContent().build()
        } catch (SQLException e) {
            if (e.getSQLState() == '23503') {
                return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([error: "Cannot delete team with ID ${teamId} because it is still referenced by other resources (e.g., as a step owner)."]).toString()).build()
            }
            log.warn("An unexpected database error occurred during team deletion for ID ${teamId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "A database error occurred."]).toString()).build()
        } catch (Exception e) {
            log.error("An unexpected error occurred during team deletion for ID ${teamId}.", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred."]).toString()).build()
        }
    }

    // Fallback for invalid DELETE paths
    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid path for DELETE request."]).toString()).build()
}
