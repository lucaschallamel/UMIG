package com.umig.api.v2

import com.umig.repository.ImplementationPlanRepository
import com.umig.utils.JsonUtil

import javax.servlet.http.HttpServletResponse
import java.util.UUID

// This script is executed by ScriptRunner for requests to /api/v2/plans*

// Instantiate the repository to access business logic
def planRepository = new ImplementationPlanRepository()

// Helper function to get UUID from path
def getPlanId = {
    def pathInfo = request.getPathInfo()
    if (pathInfo && pathInfo.size() > 1) {
        def pathParts = pathInfo.split('/')
        if (pathParts.size() > 1 && pathParts[1]) {
            try {
                return UUID.fromString(pathParts[1])
            } catch (IllegalArgumentException e) {
                // Not a valid UUID
                return null
            }
        }
    }
    return null
}

def planId = getPlanId()

// Main router to handle different HTTP methods
switch (request.method) {
    case 'GET':
        if (planId) {
            // Handle GET /api/v2/plans/{planId}
            def plan = planRepository.findPlanById(planId)
            if (plan) {
                JsonUtil.sendSuccess(response, plan)
            } else {
                JsonUtil.sendError(response, "Plan with ID ${planId} not found.", HttpServletResponse.SC_NOT_FOUND)
            }
        } else {
            // Handle GET /api/v2/plans
            def plans = planRepository.findAllPlans()
            JsonUtil.sendSuccess(response, plans)
        }
        break

    case 'POST':
        // Handle POST /api/v2/plans
        try {
            def planData = JsonUtil.parseRequest(request)
            def newPlan = planRepository.createPlan(planData)
            if (newPlan) {
                JsonUtil.sendSuccess(response, newPlan, HttpServletResponse.SC_CREATED)
            } else {
                JsonUtil.sendError(response, "Failed to create plan.", HttpServletResponse.SC_INTERNAL_SERVER_ERROR)
            }
        } catch (Exception e) {
            JsonUtil.sendError(response, "Invalid request body: ${e.message}", HttpServletResponse.SC_BAD_REQUEST)
        }
        break

    case 'PUT':
        // Handle PUT /api/v2/plans/{planId}
        if (planId) {
            try {
                def planData = JsonUtil.parseRequest(request)
                def updatedPlan = planRepository.updatePlan(planId, planData)
                if (updatedPlan) {
                    JsonUtil.sendSuccess(response, updatedPlan)
                } else {
                    JsonUtil.sendError(response, "Plan with ID ${planId} not found for update.", HttpServletResponse.SC_NOT_FOUND)
                }
            } catch (Exception e) {
                JsonUtil.sendError(response, "Invalid request body: ${e.message}", HttpServletResponse.SC_BAD_REQUEST)
            }
        } else {
            JsonUtil.sendError(response, "Plan ID is required for PUT method.", HttpServletResponse.SC_BAD_REQUEST)
        }
        break

    case 'DELETE':
        // Handle DELETE /api/v2/plans/{planId}
        if (planId) {
            if (planRepository.deletePlan(planId)) {
                response.status = HttpServletResponse.SC_NO_CONTENT
            } else {
                JsonUtil.sendError(response, "Plan with ID ${planId} not found for deletion.", HttpServletResponse.SC_NOT_FOUND)
            }
        } else {
            JsonUtil.sendError(response, "Plan ID is required for DELETE method.", HttpServletResponse.SC_BAD_REQUEST)
        }
        break

    default:
        JsonUtil.sendError(response, "HTTP method '${request.method}' not supported on this endpoint.", HttpServletResponse.SC_METHOD_NOT_ALLOWED)
        break
}
