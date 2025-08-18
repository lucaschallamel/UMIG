import groovy.lang.Grab
@GrabConfig(systemClassLoader=true)
@Grab('org.codehaus.groovy:groovy-sql:3.0.15')
@Grab('org.postgresql:postgresql:42.7.3')
@GrabExclude('xml-apis:xml-apis')
@GrabExclude('xerces:xercesImpl')
@GrabExclude('xml-resolver:xml-resolver')
@GrabExclude('xalan:xalan')
@GrabExclude('commons-logging:commons-logging')
@Grab('org.codehaus.groovy.modules.http-builder:http-builder:0.7.1')
import groovy.sql.Sql
import groovyx.net.http.RESTClient

/**
 * Loads key-value pairs from a .env file.
 * @param path The path to the .env file.
 * @return A map of the environment variables.
 */
def loadEnv(String path) {
    def props = [:]
    def envFile = new File(path)
    if (envFile.exists()) {
        envFile.eachLine { line ->
            if (line.contains('=')) {
                def (key, value) = line.split('=', 2)
                props[key.trim()] = value.trim()
            }
        }
    } else {
        println "Warning: .env file not found at ${path}"
    }
    return props
}

// --- Database Connection ---
def env = loadEnv('local-dev-setup/.env')

def dbHost = 'localhost'
def dbPort = 5432
def dbName = env.UMIG_DB_NAME
def dbUser = env.UMIG_DB_USER
def dbPassword = env.UMIG_DB_PASSWORD
def dbUrl = "jdbc:postgresql://${dbHost}:${dbPort}/${dbName}"

def sql = Sql.newInstance(dbUrl, dbUser, dbPassword, 'org.postgresql.Driver')

// --- Function Under Test (with direct SQL queries) ---
Map getStepViewData(String stepId, def sql) {
    def (sttCode, stmNumberStr) = stepId.tokenize('-')
    def stmNumber = stmNumberStr as Integer

    // --- Data Retrieval (using direct SQL) ---
    def stepDetails = sql.firstRow('SELECT * FROM steps_master_stm WHERE stt_code = ? AND stm_number = ?', [sttCode, stmNumber])
    if (!stepDetails) {
        return [error: "Step with ID ${stepId} not found."]
    }

    def instructions = sql.rows('SELECT * FROM instructions_master_inm WHERE stm_id = ? ORDER BY inm_order', [stepDetails.stm_id])
    def impactedTeamIds = sql.rows('SELECT tms_id FROM steps_master_stm_x_teams_tms_impacted WHERE stm_id = ?', [stepDetails.stm_id])
    def impactedTeams = impactedTeamIds.collect { team -> sql.firstRow('SELECT tms_name FROM teams_tms WHERE tms_id = ?', [team.tms_id]) }
    def statusType = sql.firstRow('SELECT stt_name FROM step_types_stt WHERE stt_code = ?', [stepDetails.stt_code])?.stt_name

    // --- Data Assembly ---
    def stepSummary = [
        'ID'          : stepId,
        'Name'        : stepDetails.stm_name,
        'Description' : stepDetails.stm_description,
        'Type'        : statusType,
        
    ]

    def formattedInstructions = instructions.collect {
        [
            'Order'      : it.inm_order,
            'Description': it.inm_body
        ]
    }

    def formattedTeams = impactedTeams.collect { it.tms_name }

    return [
        stepSummary : stepSummary,
        instructions: formattedInstructions,
        impactedTeams: formattedTeams
    ]
}

// --- Test Execution ---






println "Running integration test for getStepViewData..."
println "Connecting to database at ${dbUrl}..."

try {
    def result = getStepViewData('BGO-4', sql)
    println "--- Test Result ---"
    println groovy.json.JsonOutput.prettyPrint(groovy.json.JsonOutput.toJson(result))
    println "\n✅ Integration test completed successfully!"
} catch (Exception e) {
    println "❌ Integration test failed!"
    e.printStackTrace()
} finally {
    sql.close()
}
