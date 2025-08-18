import com.onresolve.scriptrunner.runner.customisers.WithPlugin
import com.onresolve.scriptrunner.runner.customisers.PluginModule
@WithPlugin("com.onresolve.scriptrunner.runner")

import com.onresolve.scriptrunner.db.DatabaseUtil

// Check if user endpoint is working
println "=== Checking User Endpoint ==="

// Test direct database query
DatabaseUtil.withSql('umig_db_pool') { sql ->
    println "\n1. Testing direct database query for user 'admin':"
    def user = sql.firstRow('''
        SELECT u.*, r.rls_code 
        FROM users_usr u
        LEFT JOIN roles_rls r ON u.rls_id = r.rls_id
        WHERE u.usr_code = :username
    ''', [username: 'admin'])
    
    if (user) {
        println "   User found:"
        println "   - ID: ${user.usr_id}"
        println "   - Username: ${user.usr_code}"
        println "   - Email: ${user.usr_email}"
        println "   - Is Admin: ${user.usr_is_admin}"
        println "   - Role ID: ${user.rls_id}"
        println "   - Role Code: ${user.rls_code}"
    } else {
        println "   User 'admin' not found in database!"
    }
    
    println "\n2. All available roles:"
    sql.rows('SELECT * FROM roles_rls ORDER BY rls_id').each { role ->
        println "   - ID: ${role.rls_id}, Code: ${role.rls_code}"
    }
}

println "\n3. ScriptRunner endpoint status:"
println "   The /user/context endpoint should be available at:"
println "   /rest/scriptrunner/latest/custom/user/context?username=admin"
println ""
println "   If you're getting a 404, try:"
println "   1. Go to Confluence Admin > ScriptRunner > Built-in Scripts"
println "   2. Click 'Clear caches'"
println "   3. Refresh your browser"
println ""
println "   Alternatively, you can temporarily disable role checking by:"
println "   - Setting this.userRole = 'ADMIN' and this.isAdmin = true"
println "   - In iteration-view.js line 93-94 and 99-100"