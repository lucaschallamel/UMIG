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
        def writer = new StringWriter()
        def xml = new MarkupBuilder(writer)

        // This div is the container where our JavaScript will render the table of Implementation Plans.
        xml.div(id: "umig-ip-macro-container", class: "umig-ip-macro-container") {
            p("Loading Implementation Plans...")
        }

        return writer.toString()
    }
}
