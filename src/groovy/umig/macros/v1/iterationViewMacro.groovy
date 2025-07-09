// ITERATION VIEW Macro — UMIG Project
// Renders the complete iteration view interface with runsheet table and step details.
// This version is a direct, static port of the canonical mock (iteration-view.html) with 100% structure and class fidelity.

def webRoot = System.getenv('UMIG_WEB_ROOT') ?: '/rest/scriptrunner/latest/custom/web'

return """
<!-- Canonical CSS and JS for Iteration View (static mock fidelity) -->
<link rel=\"stylesheet\" href=\"${webRoot}/css/iteration-view.css\">
<script src=\"${webRoot}/js/iteration-view.js\"></script>

<div class=\"iteration-view\">
    <!-- Top Selector Bar -->
    <header class=\"selector-bar\">
        <div class=\"selector-container\">
            <h1 class=\"view-title\">ITERATION VIEW - IMPLEMENTATION PLAN RUNSHEET</h1>
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
            <h2>RUNSHEET FILTERS</h2>
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
                <div class=\"checkbox-group\">
                    <input type=\"checkbox\" id=\"my-teams-only\">
                    <label for=\"my-teams-only\">MY TEAMS ONLY</label>
                </div>
            </div>
        </div>
    </section>

    <!-- Main Content Layout -->
    <main class=\"main-content\">
        <!-- Runsheet Panel with Foldable Sequences & Phases -->
        <section class=\"runsheet-panel\">
            <div class=\"panel-header\">📋 IMPLEMENTATION RUNSHEET</div>
            <div class=\"runsheet-sequence\">
                <div class=\"sequence-header\">SEQUENCE 1: Pre-Migration Preparation</div>
                <div class=\"phase-header\">PHASE 1.1: Environment Setup</div>
                <table class=\"runsheet-table\">
                    <thead>
                        <tr>
                            <th>CODE</th><th>TITLE</th><th>TEAM</th><th>STATUS</th><th>DURATION</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class=\"step-row\"><td>INF-001-010</td><td>Backup Primary Database</td><td>DB-Team</td><td class=\"status-pending\">Pending</td><td>45 min</td></tr>
                        <tr class=\"step-row\"><td>INF-001-020</td><td>Validate Network Connectivity</td><td>NET-Team</td><td class=\"status-pending\">Pending</td><td>30 min</td></tr>
                        <tr class=\"step-row\"><td>INF-001-030</td><td>Configure Load Balancer</td><td>NET-Team</td><td class=\"status-pending\">Pending</td><td>60 min</td></tr>
                    </tbody>
                </table>
            </div>
            <div class=\"runsheet-sequence\">
                <div class=\"sequence-header\">SEQUENCE 2: Data Migration</div>
                <div class=\"phase-header\">PHASE 2.1: Database Cutover</div>
                <table class=\"runsheet-table\">
                    <thead>
                        <tr>
                            <th>CODE</th><th>TITLE</th><th>TEAM</th><th>STATUS</th><th>DURATION</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class=\"step-row\"><td>DAT-002-010</td><td>Stop Application Services</td><td>APP-Team</td><td class=\"status-pending\">Pending</td><td>15 min</td></tr>
                        <tr class=\"step-row\"><td>DAT-002-020</td><td>Export Database Schema</td><td>DB-Team</td><td class=\"status-pending\">Pending</td><td>30 min</td></tr>
                        <tr class=\"step-row\"><td>DAT-002-030</td><td>Transfer Data Files</td><td>DB-Team</td><td class=\"status-pending\">Pending</td><td>120 min</td></tr>
                    </tbody>
                </table>
            </div>
            <div class=\"runsheet-sequence\">
                <div class=\"sequence-header\">SEQUENCE 3: Post-Migration Validation</div>
                <div class=\"phase-header\">PHASE 3.1: System Testing</div>
                <table class=\"runsheet-table\">
                    <thead>
                        <tr>
                            <th>CODE</th><th>TITLE</th><th>TEAM</th><th>STATUS</th><th>DURATION</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class=\"step-row\"><td>VAL-003-010</td><td>Smoke Test Applications</td><td>APP-Team</td><td class=\"status-pending\">Pending</td><td>45 min</td></tr>
                        <tr class=\"step-row\"><td>VAL-003-020</td><td>Performance Baseline Test</td><td>APP-Team</td><td class=\"status-pending\">Pending</td><td>60 min</td></tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- Step Details Panel -->
        <aside class=\"step-details-panel\">
            <div class=\"panel-header\">📄 STEP DETAILS</div>
            <div class=\"step-details-content\">
                <div class=\"step-header\">INF-001-010: Backup Primary Database</div>
                <div class=\"step-meta\">
                    <span>Target Environment: <b>Production</b></span> |
                    <span>Scope: <b>RUN</b> <b>DR</b> <b>CUTOVER</b></span> |
                    <span>Teams: <b>DB-Team, NET-Team, APP-Team</b></span> |
                    <span>Location: <b>Sequence 1 - Pre-Migration | Phase 1.1 - Environment Setup</b></span> |
                    <span>Duration: <b>45 min</b></span> |
                    <span>Status: <b>Pending</b></span>
                </div>
                <div class=\"section-title\">INSTRUCTIONS</div>
                <table class=\"instructions-table\">
                    <thead><tr><th>#</th><th>INSTRUCTION</th><th>TEAM</th><th>CONTROL</th><th>DURATION</th><th></th></tr></thead>
                    <tbody>
                        <tr><td>1</td><td>Access backup server console</td><td>DB-Team</td><td>CTRL-01</td><td>5 min</td><td><input type=\"checkbox\"></td></tr>
                        <tr><td>2</td><td>Execute backup script</td><td>DB-Team</td><td>CTRL-02</td><td>35 min</td><td><input type=\"checkbox\"></td></tr>
                        <tr><td>3</td><td>Verify backup file integrity</td><td>DB-Team</td><td>CTRL-03</td><td>5 min</td><td><input type=\"checkbox\"></td></tr>
                    </tbody>
                </table>
                <div class=\"section-title\">COMMENTS (3)</div>
                <div class=\"comments-list\">
                    <div class=\"comment\"><span class=\"comment-author\">John Smith (DB-Team)</span> <span class=\"comment-time\">2 hours ago</span><div class=\"comment-body\">"Backup server space verified - 2TB available"</div></div>
                    <div class=\"comment\"><span class=\"comment-author\">Sarah Johnson (NET-Team)</span> <span class=\"comment-time\">1 hour ago</span><div class=\"comment-body\">"Network connectivity to backup server confirmed"</div></div>
                    <div class=\"comment\"><span class=\"comment-author\">Mike Chen (DB-Team)</span> <span class=\"comment-time\">30 minutes ago</span><div class=\"comment-body\">"Ready to begin backup process"</div></div>
                </div>
                <div class=\"comment-form\">
                    <textarea placeholder=\"Add a comment...\" rows=\"3\"></textarea>
                    <button class=\"btn btn-primary\">Add Comment</button>
                </div>
                <div class=\"step-actions\">
                    <button class=\"btn btn-primary\">Start Step</button>
                    <button class=\"btn btn-primary\">Complete</button>
                    <button class=\"btn btn-warning\">Block</button>
                    <button class=\"btn btn-secondary\">Edit</button>
                </div>
            </div>
        </aside>
    </main>
</div>
"""