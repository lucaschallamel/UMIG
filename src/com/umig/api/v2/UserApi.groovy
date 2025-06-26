import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript
import com.umig.repository.UserRepository
import com.umig.utils.errors

@BaseScript CustomEndpointDelegate delegate

users(httpMethod: "GET") { req ->
    try {
        def users = UserRepository.listAll()
        return [status: 200, entity: users]
    } catch (Exception e) {
        return errors.handleApiException(e)
    }
}

user(httpMethod: "GET") { req ->
    try {
        def id = getAdditionalPath(req)?.getAt(0)
        if (!id) return [status: 400, entity: [error: "Missing user id"]]
        def user = UserRepository.findById(id)
        if (!user) return [status: 404, entity: [error: "User not found"]]
        return [status: 200, entity: user]
    } catch (Exception e) {
        return errors.handleApiException(e)
    }
}

updateUser(httpMethod: "PUT") { req ->
    try {
        def id = getAdditionalPath(req)?.getAt(0)
        if (!id) return [status: 400, entity: [error: "Missing user id"]]
        def body = req.JSON
        def updated = UserRepository.updateUser(id, body)
        return [status: 200, entity: updated]
    } catch (Exception e) {
        return errors.handleApiException(e)
    }
}
