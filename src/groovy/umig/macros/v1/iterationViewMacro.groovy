import com.atlassian.confluence.macro.Macro
import com.atlassian.confluence.macro.MacroExecutionException
import com.atlassian.confluence.macro.MacroParameters
import com.atlassian.confluence.renderer.v2.macro.BasicMacroBody
import com.atlassian.confluence.content.render.xhtml.ConversionContext
import java.io.StringWriter

/**
 * Macro: Iteration View (Implementation Plan View)
 * Renders the three-pane UI for viewing implementation plan iterations (read-only MVP).
 * Injects HTML, CSS, and JS from the validated mockup. Future: Replace static data with REST API integration.
 */
class iterationViewMacro implements Macro {
    @Override
    String execute(Map macroParameters, String body, ConversionContext context) throws MacroExecutionException {
        def writer = new StringWriter()
        writer << '''
<div id="umig-iteration-view-root"></div>
<style>
/* --- Iteration View Styles (from mock/styles.css) --- */
:root {
    --color-primary: #0052cc;
    --color-bg-primary: #f4f5f7;
    --color-bg-secondary: #fff;
    --color-bg-tertiary: #e9edf5;
    --color-border: #dfe1e6;
    --color-text-primary: #172b4d;
    --color-text-secondary: #505f79;
    --color-text-tertiary: #a5adba;
    --color-in-progress: #0065ff;
    --color-completed: #00875a;
    --color-failed: #de350b;
    --font-family: 'Segoe UI', Arial, sans-serif;
    --font-size-base: 16px;
    --font-size-sm: 14px;
    --font-size-lg: 20px;
    --font-size-xl: 24px;
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --border-radius: 4px;
    --box-shadow-hover: 0 2px 8px rgba(0,0,0,0.08);
}
body, html {
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    margin: 0;
    padding: 0;
}
/* ... (CSS truncated for brevity, full mockup CSS should be inlined here) ... */
</style>
<script>
// --- Iteration View JS (from mock/script.js) ---
(function() {
    // Sample static data (replace with AJAX fetch in future)
    const sampleData = {
        migrations: [
            { id: 'mig-1', name: 'Migration Alpha' },
            { id: 'mig-2', name: 'Migration Beta' }
        ],
        iterations: [
            { id: 'ite-1', migrationId: 'mig-1', name: 'Iteration 1' },
            { id: 'ite-2', migrationId: 'mig-1', name: 'Iteration 2' }
        ],
        steps: [
            { id: 'step-1', seq: 1, phase: 'Prep', title: 'Validate Source', team: 'Data', status: 'In Progress' },
            { id: 'step-2', seq: 2, phase: 'Cutover', title: 'Run Migration', team: 'IT', status: 'Not Started' }
        ]
    };
    // Render function (simplified)
    function renderIterationView(root, data) {
        root.innerHTML = '<div class="view-title">Iteration View (MVP)</div>' +
            '<div style="margin:16px 0;">' +
            '  <strong>Migrations:</strong> ' + data.migrations.map(m => m.name).join(', ') + '<br>' +
            '  <strong>Iterations:</strong> ' + data.iterations.map(i => i.name).join(', ') + '<br>' +
            '  <strong>Steps:</strong> ' + data.steps.map(s => s.title).join(', ') +
            '</div>';
    }
    document.addEventListener('DOMContentLoaded', function() {
        const root = document.getElementById('umig-iteration-view-root');
        if (root) renderIterationView(root, sampleData);
    });
})();
// (Full mockup JS should be inlined here for MVP)
</script>
'''
        return writer.toString()
    }
}
