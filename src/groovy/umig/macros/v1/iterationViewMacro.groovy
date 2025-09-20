// ITERATION VIEW Macro — UMIG Project
// Renders the complete iteration view interface with runsheet table and step details.
// This version is a direct, static port of the canonical mock (iteration-view.html) with 100% structure and class fidelity.

import com.atlassian.confluence.user.AuthenticatedUserThreadLocal
import com.atlassian.user.User
import umig.utils.UrlConstructionService
import groovy.json.JsonBuilder

// Get the current Confluence user context
User currentUser = AuthenticatedUserThreadLocal.get()
String confluenceUsername = currentUser?.getName() ?: ""
String confluenceFullName = currentUser?.getFullName() ?: ""
String confluenceEmail = currentUser?.getEmail() ?: ""

def webRoot = System.getenv('UMIG_WEB_ROOT') ?: '/rest/scriptrunner/latest/custom/web'

// Get URL configuration for StepView using the UrlConstructionService
def urlConfig = UrlConstructionService.getUrlConfigurationForEnvironment()
def stepViewBaseUrl = UrlConstructionService.buildStepViewUrlTemplate()

return """
<!-- Canonical CSS for Iteration View -->
<link rel=\"stylesheet\" href=\"${webRoot}/css/iteration-view.css\">

<!-- Confluence User Context for JavaScript - Load BEFORE main script -->
<script type="text/javascript">
    window.UMIG_ITERATION_CONFIG = {
        confluence: {
            username: "${confluenceUsername}",
            fullName: "${confluenceFullName}",
            email: "${confluenceEmail}"
        },
        api: {
            baseUrl: "/rest/scriptrunner/latest/custom"
        },
        ui: {
            roleBasedControls: true
        },
        stepView: {
            baseUrl: "${stepViewBaseUrl ?: ''}",
            urlConfig: ${urlConfig ? new JsonBuilder(urlConfig).toString() : 'null'}
        }
    };
    console.log('IterationView: Configuration loaded', window.UMIG_ITERATION_CONFIG);
</script>

<!-- SecurityUtils for enterprise security - Load BEFORE StatusProvider (ADR-058) -->
<script src=\"${webRoot}/js/components/SecurityUtils.js\"></script>

<!-- StatusProvider for TD-003 status management - Load AFTER SecurityUtils -->
<script src=\"${webRoot}/js/utils/StatusProvider.js\"></script>

<!-- Main JavaScript file - Load AFTER configuration and dependencies -->
<script src=\"${webRoot}/js/iteration-view.js\"></script>

<div class=\"iteration-view\">
    <!-- Top Selector Bar -->
    <header class=\"selector-bar\">
        <div class=\"selector-container\">
            <div class=\"selector-controls\">
                <div class=\"selector-group\">
                    <label for=\"migration-select\">🔄 MIGRATION:</label>
                    <select id=\"migration-select\" class=\"selector\">
                        <option value="">SELECT A MIGRATION</option>
                    </select>
                </div>
                <div class=\"selector-group\">
                    <label for=\"iteration-select\">🗓️ ITERATION:</label>
                    <select id=\"iteration-select\" class=\"selector\">
                        <option value="">SELECT AN ITERATION</option>
                    </select>
                </div>
            </div>
        </div>
    </header>

    <!-- Filter Bar -->
    <section class=\"filter-bar\">
        <div class=\"filter-container\">
            <div class=\"filter-controls\">
                 <div class=\"filter-group\">
                    <label for=\"plan-filter\">PLAN:</label>
                    <select id=\"plan-filter\" class=\"filter-select\">
                        <option value=\"\">All Plans</option>
                    </select>
                </div>
                <div class=\"filter-group\">
                    <label for=\"sequence-filter\">SEQUENCE:</label>
                    <select id=\"sequence-filter\" class=\"filter-select\">
                        <option value=\"\">All Sequences</option>
                    </select>
                </div>
                <div class=\"filter-group\">
                    <label for=\"phase-filter\">PHASE:</label>
                    <select id=\"phase-filter\" class=\"filter-select\">
                        <option value=\"\">All Phases</option>
                    </select>
                </div>
                <div class=\"filter-group\">
                    <label for=\"team-filter\">TEAM:</label>
                    <select id=\"team-filter\" class=\"filter-select\">
                        <option value=\"\">All Teams</option>
                    </select>
                </div>
                <div class=\"filter-group\">
                    <label for=\"label-filter\">LABEL:</label>
                    <select id=\"label-filter\" class=\"filter-select\">
                        <option value=\"\">All Labels</option>
                    </select>
                </div>
            </div>
        </div>
    </section>

    <!-- Main Content Layout -->
    <main class=\"main-content\">
        <!-- Runsheet Panel with Foldable Sequences & Phases -->
        <section class=\"runsheet-panel\">
            <div class=\"runsheet-header\">
                <h2>RUNSHEET</h2>
                <div class=\"summary-stats\">
                    <span class=\"stat\">Total Steps: <span id=\"total-steps\">0</span></span>
                    <span class=\"stat stat-pending\">PENDING: <span id=\"pending-steps\">0</span></span>
                    <span class=\"stat stat-todo\">TODO: <span id=\"todo-steps\">0</span></span>
                    <span class=\"stat stat-progress\">IN PROGRESS: <span id=\"progress-steps\">0</span></span>
                    <span class=\"stat stat-completed\">COMPLETED: <span id=\"completed-steps\">0</span></span>
                    <span class=\"stat stat-failed\">FAILED: <span id=\"failed-steps\">0</span></span>
                    <span class=\"stat stat-blocked\">BLOCKED: <span id=\"blocked-steps\">0</span></span>
                    <span class=\"stat stat-cancelled\">CANCELLED: <span id=\"cancelled-steps\">0</span></span>
                </div>
                <div class=\"runsheet-controls\">
                    <button class=\"btn btn-sm btn-secondary\" id=\"expand-all-btn\">➕ Expand All</button>
                    <button class=\"btn btn-sm btn-secondary\" id=\"collapse-all-btn\">➖ Collapse All</button>
                </div>
            </div>
            <div class=\"runsheet-content\" id=\"runsheet-content\">
                <div class=\"placeholder-message\">
                    <p>📋 Select a migration and iteration to view steps</p>
                </div>
            </div>
        </section>

        <!-- Step Details Panel -->
        <aside class=\"step-details-panel\">
            <div class=\"panel-header\">📄 STEP DETAILS</div>
            <div class=\"step-details-content\">
                <div class=\"placeholder-message\">
                    <p>👋 Select a step from the runsheet to view details</p>
                </div>
            </div>
        </aside>
    </main>
</div>
"""