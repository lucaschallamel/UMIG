package com.umig.api.v2

import com.umig.repository.TeamRepository
import com.umig.utils.JsonUtil
import com.umig.utils.RequestUtil

import javax.servlet.http.HttpServletResponse

// This script is executed by ScriptRunner for requests to /api/v2/teams*

// Instantiate the repository to access business logic
def teamRepository = new TeamRepository()

// Check for a path variable (e.g., a team ID like /teams/10)
def teamId = RequestUtil.getPathVariableAsInt(request)

// Main router to handle different HTTP methods
switch (request.method) {
    case 'GET':
        if (teamId) {
            // Handle GET /api/v2/teams/{teamId}
            def team = teamRepository.findTeamById(teamId)
            if (team) {
                JsonUtil.sendSuccess(response, team)
            } else {
                JsonUtil.sendError(response, "Team with ID ${teamId} not found.", HttpServletResponse.SC_NOT_FOUND)
            }
        } else {
            // Handle GET /api/v2/teams
            def teams = teamRepository.findAllTeams()
            JsonUtil.sendSuccess(response, teams)
        }
        break

    case 'POST':
        // Handle POST /api/v2/teams
        try {
            def teamData = JsonUtil.parseRequest(request)
            def newTeam = teamRepository.createTeam(teamData)
            if (newTeam) {
                JsonUtil.sendSuccess(response, newTeam, HttpServletResponse.SC_CREATED)
            } else {
                JsonUtil.sendError(response, "Failed to create team.", HttpServletResponse.SC_INTERNAL_SERVER_ERROR)
            }
        } catch (Exception e) {
            JsonUtil.sendError(response, "Invalid request body: ${e.message}", HttpServletResponse.SC_BAD_REQUEST)
        }
        break

    case 'PUT':
        // Handle PUT /api/v2/teams/{teamId}
        if (teamId) {
            try {
                def teamData = JsonUtil.parseRequest(request)
                def updatedTeam = teamRepository.updateTeam(teamId, teamData)
                if (updatedTeam) {
                    JsonUtil.sendSuccess(response, updatedTeam)
                } else {
                    JsonUtil.sendError(response, "Team with ID ${teamId} not found for update.", HttpServletResponse.SC_NOT_FOUND)
                }
            } catch (Exception e) {
                JsonUtil.sendError(response, "Invalid request body: ${e.message}", HttpServletResponse.SC_BAD_REQUEST)
            }
        } else {
            JsonUtil.sendError(response, "Team ID is required for PUT method.", HttpServletResponse.SC_BAD_REQUEST)
        }
        break

    case 'DELETE':
        // Handle DELETE /api/v2/teams/{teamId}
        if (teamId) {
            if (teamRepository.deleteTeam(teamId)) {
                response.status = HttpServletResponse.SC_NO_CONTENT
            } else {
                JsonUtil.sendError(response, "Team with ID ${teamId} not found for deletion.", HttpServletResponse.SC_NOT_FOUND)
            }
        } else {
            JsonUtil.sendError(response, "Team ID is required for DELETE method.", HttpServletResponse.SC_BAD_REQUEST)
        }
        break

    default:
        JsonUtil.sendError(response, "HTTP method '${request.method}' not supported on this endpoint.", HttpServletResponse.SC_METHOD_NOT_ALLOWED)
        break
}
