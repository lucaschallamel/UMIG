import com.onresolve.scriptrunner.runner.customisers.WithPlugin
import com.atlassian.plugin.web.WebInterfaceManager
import com.atlassian.plugin.web.descriptors.DefaultWebResourceDescriptor
import com.atlassian.plugin.web.model.DefaultWebResourceModule

/**
 * This script fragment dynamically registers the CSS and JavaScript files
 * required for the Implementation Plan macro.
 */
@WithPlugin
def plugin

def webInterfaceManager = plugin.getContainerManager().getComponent(WebInterfaceManager)

def webResourceDescriptor = new DefaultWebResourceDescriptor(plugin, "ip-macro-resources")

// Define the resource files to be loaded.
// The paths are relative to the ScriptRunner scripts directory, which is where our `src` folder is mounted.
webResourceDescriptor.addResource("css/umig-ip-macro.css")
webResourceDescriptor.addResource("js/umig-ip-macro.js")

// Define the context. This ensures the resources are only loaded when the ip-macro is present on a page.
webResourceDescriptor.addContext("macro.ip-macro")

// Register the web resource so Confluence will load it.
def webResourceModule = new DefaultWebResourceModule(webInterfaceManager, webResourceDescriptor)
webResourceModule.enabled()

log.info("Successfully registered web resources for the Implementation Plan macro.")

return "Web resources for Implementation Plan macro registered."
