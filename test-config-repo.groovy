
// Test SystemConfigurationRepository
import umig.repository.SystemConfigurationRepository

def repo = new SystemConfigurationRepository()
def configs = repo.findConfluenceMacroLocations(1) // Test with env_id 1
println 'Confluence configs for env 1:'
configs.each { key, value ->
    println "${key}: ${value}"
}

