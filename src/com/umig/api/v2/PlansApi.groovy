package com.umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import com.umig.repository.ImplementationPlanRepository
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID

@BaseScript CustomEndpointDelegate delegate

final ImplementationPlanRepository planRepository = new ImplementationPlanRepository()

private UUID getPlanIdFromPath(HttpServletRequest request) {
    def extraPath = getAdditionalPath(request)
    if (extraPath) {
        def pathParts = extraPath.split('/').findAll { it }
        if (pathParts) {
            try {
                return UUID.fromString(pathParts[0])
            } catch (IllegalArgumentException e) {
                return null
            }
        }
    }
    return null
}

// Endpoint for handling Implementation Plans. The method name 'plans' becomes part of the URL.
// ScriptRunner differentiates between GET, POST, etc. based on the httpMethod parameter.

plans(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    final UUID planId = getPlanIdFromPath(request)

    if (planId != null) {
        def plan = planRepository.findPlanById(planId)
        if (plan) {
            return Response.ok(new JsonBuilder(plan).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Plan with ID ${planId} not found."]).toString()).build()
        }
    } else {
        def plans = planRepository.findAllPlans()
        return Response.ok(new JsonBuilder(plans).toString()).build()
    }
}

plans(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        Map planData = new JsonSlurper().parseText(body) as Map
        def newPlan = planRepository.createPlan(planData)
        if (newPlan) {
            return Response.status(Response.Status.CREATED).entity(new JsonBuilder(newPlan).toString()).build()
        } else {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Failed to create plan."]).toString()).build()
        }
    } catch (Exception e) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid request body: ${e.message}"]).toString()).build()
    }
}

plans(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    final UUID planId = getPlanIdFromPath(request)
    if (planId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Plan ID is required for PUT method."]).toString()).build()
    }

    try {
        Map planData = new JsonSlurper().parseText(body) as Map
        def updatedPlan = planRepository.updatePlan(planId, planData)
        if (updatedPlan) {
            return Response.ok(new JsonBuilder(updatedPlan).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Plan with ID ${planId} not found for update."]).toString()).build()
        }
    } catch (Exception e) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid request body: ${e.message}"]).toString()).build()
    }
}

plans(httpMethod: "DELETE", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    final UUID planId = getPlanIdFromPath(request)
    if (planId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Plan ID is required for DELETE method."]).toString()).build()
    }

    if (planRepository.deletePlan(planId)) {
        return Response.noContent().build()
    } else {
        return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Plan with ID ${planId} not found for deletion."]).toString()).build()
    }
}
