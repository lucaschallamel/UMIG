import groovy.xml.MarkupBuilder

/**
 * UMIG Iteration View Macro v1
 * 
 * ScriptRunner Custom Macro for rendering the three-panel Implementation Plan runsheet interface.
 * Integrated from mock assets: iteration-view.html, styles.css, script.js
 * 
 * Features:
 * - Migration and Iteration selection
 * - Runsheet view with steps, instructions, and details
 * - Real-time status updates and commenting
 * - Backend API integration ready
 * 
 * @author UMIG Development Team
 * @version 1.0.0
 * @since ScriptRunner 6.x
 */

// ScriptRunner macro - returns HTML content as string
// The base path for the REST endpoint that serves web resources.
// Assumes an endpoint is configured at '/rest/scriptrunner/latest/custom/web' that serves files from 'src/groovy/umig/web'.
def webResourcesPath = "/rest/scriptrunner/latest/custom/web"

def writer = new StringWriter()

// Build the macro HTML content
writer << '''
<!-- UMIG Iteration View Macro Container -->
<div id="umig-iteration-view-root" class="umig-iteration-view">
    <!-- Load external CSS from ScriptRunner source tree -->
    <link rel="stylesheet" href="${webResourcesPath}/css/iteration-view.css">
    
    <!-- Top Selector Bar -->
    <header class="selector-bar">
        <div class="selector-container">
            <h1 class="view-title">ITERATION VIEW - IMPLEMENTATION PLAN RUNSHEET</h1>
            <div class="selector-controls">
                <div class="selector-group">
                    <label for="migration-select">🔄 MIGRATION:</label>
                    <select id="migration-select" class="selector">
                        <option value="">Loading migrations...</option>
                    </select>
                </div>
                <div class="selector-group">
                    <label for="iteration-select">🗓️ ITERATION:</label>
                    <select id="iteration-select" class="selector">
                        <option value="">Select migration first</option>
                    </select>
                </div>
            </div>
        </div>
    </header>

    <!-- Filter Bar -->
    <section class="filter-bar">
        <div class="filter-container">
            <h2>RUNSHEET FILTERS</h2>
            <div class="filter-controls">
                <div class="filter-group">
                    <label for="sequence-filter">SEQUENCE:</label>
                    <select id="sequence-filter" class="filter-select">
                        <option value="">All</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="phase-filter">PHASE:</label>
                    <select id="phase-filter" class="filter-select">
                        <option value="">All</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="team-filter">TEAM:</label>
                    <select id="team-filter" class="filter-select">
                        <option value="">All</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="label-filter">LABEL:</label>
                    <select id="label-filter" class="filter-select">
                        <option value="">All</option>
                    </select>
                </div>
                <div class="filter-group checkbox-group">
                    <input type="checkbox" id="my-teams-only" class="filter-checkbox">
                    <label for="my-teams-only">My Teams Only</label>
                </div>
            </div>
        </div>
    </section>

    <!-- Main Content Area -->
    <main class="main-content">
        <!-- Left Panel: Runsheet -->
        <section class="runsheet-panel">
            <div class="runsheet-header">
                <h2>RUNSHEET</h2>
                <div class="summary-stats">
                    <span class="stat">Total Steps: <span id="total-steps">0</span></span>
                    <span class="stat stat-pending">Pending: <span id="pending-steps">0</span></span>
                    <span class="stat stat-progress">In Progress: <span id="progress-steps">0</span></span>
                    <span class="stat stat-completed">Completed: <span id="completed-steps">0</span></span>
                    <span class="stat stat-failed">Failed: <span id="failed-steps">0</span></span>
                </div>
            </div>
            
            <div class="runsheet-content">
                <!-- Steps will be dynamically loaded here -->
                <div class="loading-state">
                    <p>Select a migration and iteration to view the runsheet.</p>
                </div>
            </div>
        </section>

        <!-- Right Panel: Step Details -->
        <section class="step-details-panel">
            <div class="step-details-header">
                <h2>STEP DETAILS</h2>
            </div>
            
            <div class="step-details-content">
                <div class="no-selection-state">
                    <p>Select a step from the runsheet to view details.</p>
                </div>
            </div>
        </section>
    </main>
</div>

<!-- Load external JavaScript from ScriptRunner source tree -->
<script src="${webResourcesPath}/js/iteration-view.js"></script>
'''
        
// Return the HTML content
return writer.toString()
