// NOTE: This import only resolves in the Confluence+ScriptRunner runtime. Safe to ignore IDE warnings locally.
import com.onresolve.scriptrunner.canned.macros.SimpleMacro
import groovy.xml.MarkupBuilder

/**
 * A simple macro to render the root element for the Implementation Plan UI.
 * The actual UI is built by the umig-ip-macro.js script.
 */
class RenderImplementationPlanMacro extends SimpleMacro {

    @Override
    String getMacroName() {
        // This is the name you will use in the Confluence editor: {ip-macro}
        "ip-macro"
    }

    @Override
    boolean hasBody() {
        false
    }

    @Override
    Category getCategory() {
        Category.CONFLUENCE_CONTENT
    }

    @Override
    String execute(Map<String, String> params, String body, com.atlassian.confluence.content.render.xhtml.ConversionContext conversionContext) {
        // The base path for our custom REST endpoint which serves static assets
        def restApiBase = "/rest/scriptrunner/latest/custom/api/v2/web"

        def writer = new StringWriter()
        def xml = new MarkupBuilder(writer)

        // Use 'unparsed' to inject a raw HTML block.
        // This ensures the <link> and <script> tags are rendered correctly by Confluence.
        xml.unparsed(
            """
            <link rel="stylesheet" type="text/css" href="${restApiBase}/css/umig-ip-macro.css">
            <div id="umig-ip-macro-container" class="umig-ip-macro-container">
                <p>Loading Implementation Plans...</p>
            </div>
            <script type="text/javascript" src="${restApiBase}/js/umig-ip-macro.js"></script>
            """
        )

        return writer.toString()
    }
}
