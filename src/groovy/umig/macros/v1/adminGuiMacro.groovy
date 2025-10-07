package umig.macros

import com.atlassian.confluence.user.AuthenticatedUserThreadLocal
import com.atlassian.user.User
import umig.service.ConfigurationService

/**
 * Admin GUI Macro — UMIG Project
 *
 * Renders the main UMIG Administration Console interface.
 * This macro provides a complete admin interface for SUPERADMIN users
 * to manage Users, Teams, Environments, Applications, and Labels.
 *
 * Features:
 * - Confluence user context integration (pre-populated login)
 * - Role-based access control (SUPERADMIN, ADMIN, PILOT)
 * - Full CRUD operations for core entities
 * - SPA-style interface with dynamic content loading
 *
 * US-098 Phase 5E: Migrated to ConfigurationService with 4-tier hierarchy:
 * 1. Database (environment-specific) - UAT/PROD use '/rest/scriptrunner/latest/custom/web'
 * 2. Database (global)
 * 3. Environment variable - DEV uses .env file UMIG_WEB_ROOT
 * 4. Default value - Fallback to '/rest/scriptrunner/latest/custom/web'
 */

// Get the current Confluence user context
User currentUser = AuthenticatedUserThreadLocal.get()
String confluenceUsername = currentUser?.getName() ?: ""
String confluenceFullName = currentUser?.getFullName() ?: ""
String confluenceEmail = currentUser?.getEmail() ?: ""

// US-098 Configuration Management: Web resources and API base URL
// Use ConfigurationService for environment-aware configuration
def webResourcesPath = ConfigurationService.getString('umig.web.root', '/rest/scriptrunner/latest/custom/web')

// Construct API base URL from request context for environment-aware configuration
// This replaces hard-coded paths in admin-gui.js (US-098 alignment)
def apiBaseUrl = ConfigurationService.getString('umig.api.base.url', null)
if (!apiBaseUrl) {
    // Fallback: construct from web resources path (remove /web suffix)
    // SECURITY: Add null pointer protection for webResourcesPath
    if (webResourcesPath) {
        apiBaseUrl = webResourcesPath.replaceAll('/web$', '')
    } else {
        // Ultimate fallback: use default API path
        apiBaseUrl = '/rest/scriptrunner/latest/custom'
        log.warn("adminGuiMacro: Both apiBaseUrl and webResourcesPath are null, using default: ${apiBaseUrl}")
    }
}

// Version string for JavaScript files (update when deploying changes)
// Using a stable version instead of System.currentTimeMillis() for better caching
def jsVersion = "3.9.8"

// Performance configuration constants
def PERFORMANCE_CONFIG = [
  MODULE_LOAD_DELAY: 10,        // Delay between module loads (ms)
  MAX_LOAD_WAIT_ATTEMPTS: 50,   // Max attempts to wait for modules
  CHECK_INTERVAL: 10,           // Interval between checks (ms)
  DELAYED_LOAD_WAIT: 2000,      // Wait time for delayed loading mode (ms)
  CONSOLE_RESTORE_DELAY: 1000,  // Delay before restoring console methods (ms)
  WARNING_SAMPLE_LIMIT: 3       // Max warning samples to collect
]

return """
<!-- Simple initialization - no performance hacks -->
<script>
console.log('[UMIG] Admin GUI loading...');
</script>

<!-- Resource hints for better loading performance -->
<link rel="dns-prefetch" href="//localhost:8090">
<link rel="preconnect" href="/rest/scriptrunner/latest/custom">



<!-- UMIG Admin GUI Container (normal mode) -->
<div id="umig-admin-gui-root" class="umig-admin-container">
    
    <!-- Login Page -->
    <div id="loginPage" class="login-container">
        <div class="login-box">
            <div class="login-header">
                <h2 class="login-title">UMIG Administration</h2>
                <p class="login-subtitle">Unified Migration Implementation Guide</p>
            </div>
            
            <form id="loginForm" class="login-form">
                <div class="confluence-user-info">
                    <div class="user-context">
                        <strong>Confluence User:</strong> ${confluenceFullName ?: confluenceUsername}
                        ${confluenceEmail ? "<br><small>${confluenceEmail}</small>" : ""}
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="userCode">User Code (Trigram)</label>
                    <input type="text" 
                           id="userCode" 
                           name="userCode"
                           placeholder="Enter your 3-letter code" 
                           maxlength="3" 
                           autocomplete="off"
                           required>
                    <small class="form-help">Your organizational trigram identifier</small>
                </div>
                
                <button type="submit" class="login-btn">
                    <span class="btn-text">Access Admin Console</span>
                    <span class="btn-loading" style="display: none;">Authenticating...</span>
                </button>
                
                <div id="loginError" class="login-error" style="display: none;"></div>
            </form>
            
            <div class="login-footer">
                <small>For administrative access only. Contact IT if you need assistance.</small>
            </div>
        </div>
    </div>

    <!-- Main Admin Dashboard -->
    <div id="dashboardPage" class="admin-dashboard" style="display: none;">
        
        <!-- Header Section -->
        <header class="admin-header">
            <div class="header-left">
                <h1 class="app-title">UMIG Administration Console</h1>
                <span class="app-version">v1.0</span>
            </div>
            <div class="header-right">
                <div class="user-info">
                    <div class="user-details">
                        <span class="user-name" id="userName">Welcome</span>
                        <span class="user-role" id="userRole"></span>
                    </div>
                    <div class="user-actions">
                        <button id="userProfileBtn" class="btn-icon" title="User Profile">
                            <span class="icon-user">👤</span>
                        </button>
                        <button id="logoutBtn" class="btn-logout">Logout</button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content Area -->
        <div class="admin-content">
            
            <!-- Left Navigation Menu -->
            <nav class="admin-nav">
                <div class="nav-content">
                    
                    <!-- SUPERADMIN Section -->
                    <div class="nav-section" id="superadminSection" style="display: none;">
                        <h3 class="nav-section-title">
                            <span class="nav-icon">⚙️</span>
                            Super Admin
                        </h3>
                        <ul class="nav-menu">
                            <li><a href="#" class="nav-item active" data-section="users" data-entity="users">
                                <span class="item-icon">👥</span> Users
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="teams" data-entity="teams">
                                <span class="item-icon">🏢</span> Teams
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="environments" data-entity="environments">
                                <span class="item-icon">🌐</span> Environments
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="applications" data-entity="applications">
                                <span class="item-icon">📱</span> Applications
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="labels" data-entity="labels">
                                <span class="item-icon">🏷️</span> Labels
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="iterationTypes" data-entity="iterationTypes">
                                <span class="item-icon">🔧</span> Iteration Types
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="migrationTypes" data-entity="migrationTypes">
                                <span class="item-icon">📋</span> Migration Types
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="databaseVersionManager" data-entity="databaseVersionManager">
                                <span class="item-icon">🗄️</span> Database Version Manager
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="componentVersionTracker" data-entity="componentVersionTracker">
                                <span class="item-icon">🔍</span> Component Version Tracker
                            </a></li>
                        </ul>
                    </div>

                    <!-- ADMIN Section -->
                    <div class="nav-section" id="adminSection" style="display: none;">
                        <h3 class="nav-section-title">
                            <span class="nav-icon">📋</span>
                            Admin
                        </h3>
                        <ul class="nav-menu">
                            <li><a href="#" class="nav-item" data-section="migrations" data-entity="migrations">
                                <span class="item-icon">🚀</span> Migrations
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="master-plans" data-entity="plans">
                                <span class="item-icon">📑</span> Master Plans
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="master-sequences" data-entity="sequencesmaster">
                                <span class="item-icon">🔗</span> Master Sequences
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="master-phases" data-entity="phasesmaster">
                                <span class="item-icon">⏱️</span> Master Phases
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="master-steps" data-entity="steps-master">
                                <span class="item-icon">📝</span> Master Steps
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="master-controls" data-entity="controls-master">
                                <span class="item-icon">✅</span> Master Controls
                            </a></li>
                        </ul>
                    </div>

                    <!-- PILOT Section -->
                    <div class="nav-section" id="pilotSection" style="display: none;">
                        <h3 class="nav-section-title">
                            <span class="nav-icon">✈️</span>
                            Pilot
                        </h3>
                        <ul class="nav-menu">
                            <li><a href="#" class="nav-item" data-section="iterations" data-entity="iterations">
                                <span class="item-icon">🔄</span> Iterations
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="plans" data-entity="plansinstance">
                                <span class="item-icon">📋</span> Plans
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="sequences" data-entity="sequencesinstance">
                                <span class="item-icon">🔗</span> Sequences
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="phases" data-entity="phasesinstance">
                                <span class="item-icon">⏱️</span> Phases
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="steps" data-entity="steps-instance">
                                <span class="item-icon">📝</span> Steps & Instructions
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="controls" data-entity="controls-instance">
                                <span class="item-icon">✅</span> Controls
                            </a></li>
                            <li><a href="#" class="nav-item" data-section="audit-logs" data-entity="audit-logs">
                                <span class="item-icon">📊</span> Audit Logs
                            </a></li>
                        </ul>
                    </div>
                    
                </div>
            </nav>

            <!-- Right Content Area -->
            <main class="admin-main">
                
                <!-- Content Header -->
                <div class="content-header">
                    <div class="content-title-section">
                        <h2 class="content-title" id="contentTitle">Users Management</h2>
                        <p class="content-description" id="contentDescription">Manage user accounts, roles, and permissions</p>
                    </div>
                    <div class="content-actions">
                        <button class="btn-secondary" id="refreshBtn">
                            <span class="btn-icon">🔄</span> Refresh
                        </button>
                        <button class="btn-primary" id="addNewBtn">
                            <span class="btn-icon">➕</span> <span id="addNewBtnText">Add New User</span>
                        </button>
                    </div>
                </div>

                <!-- Loading State -->
                <div id="loadingState" class="loading-container" style="display: none;">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Loading data...</p>
                    </div>
                </div>

                <!-- Error State -->
                <div id="errorState" class="error-container" style="display: none;">
                    <div class="error-content">
                        <div class="error-icon">⚠️</div>
                        <h3>Something went wrong</h3>
                        <p id="errorMessage">Unable to load data. Please try again.</p>
                        <button class="btn-secondary" onclick="window.adminGui.refreshCurrentSection()">
                            Try Again
                        </button>
                    </div>
                </div>

                <!-- Main Content Container -->
                <div id="mainContent" class="main-content">
                    
                    <!-- Table Container -->
                    <div class="table-container">
                        
                        <!-- Table Controls -->
                        <div class="table-controls">
                            <div class="search-section">
                                <div class="search-input-group">
                                    <input type="text" 
                                           id="globalSearch" 
                                           class="search-input" 
                                           placeholder="Search all fields (3+ chars)...">
                                    <button class="search-clear-btn" id="searchClearBtn" style="display: none;" title="Clear search">✕</button>
                                </div>
                                <div class="filter-controls">
                                    <button class="btn-filter" id="filterBtn">Filter</button>
                                    <button class="btn-export" id="exportBtn" style="display: none;">Export</button>
                                    <button class="btn-bulk" id="bulkActionsBtn" disabled style="display: none;">Bulk Actions</button>
                                </div>
                            </div>
                        </div>

                        <!-- Data Table -->
                        <div class="table-wrapper">
                            <table class="data-table" id="dataTable">
                                <thead id="tableHeader">
                                    <!-- Dynamic headers populated by JavaScript -->
                                </thead>
                                <tbody id="tableBody">
                                    <!-- Dynamic content populated by JavaScript -->
                                </tbody>
                            </table>
                        </div>

                        <!-- Table Footer with Pagination -->
                        <div class="table-footer" id="paginationContainer">
                            <div class="pagination-info">
                                <span id="paginationInfo">Loading...</span>
                            </div>
                            <div class="pagination-controls">
                                <button class="pagination-btn" id="firstPageBtn" disabled>⏮️</button>
                                <button class="pagination-btn" id="prevPageBtn" disabled>◀️</button>
                                <div class="page-numbers" id="pageNumbers">
                                    <!-- Dynamic page numbers -->
                                </div>
                                <button class="pagination-btn" id="nextPageBtn">▶️</button>
                                <button class="pagination-btn" id="lastPageBtn">⏭️</button>
                            </div>
                            <div class="page-size-selector">
                                <label for="pageSize">Show:</label>
                                <select id="pageSize">
                                    <option value="25">25</option>
                                    <option value="50" selected>50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                        </div>
                        
                    </div>
                </div>
                
            </main>
            
        </div>
    </div>

    <!-- Edit/Add Modal -->
    <div id="editModal" class="modal-overlay" style="display: none;">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title" id="modalTitle">Edit Record</h3>
                <button class="modal-close" id="closeModal" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="editForm" class="edit-form">
                    <!-- Dynamic form fields populated by JavaScript -->
                    <div id="formFields"></div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" id="cancelBtn">Cancel</button>
                <button class="btn-danger" id="deleteBtn" style="display: none;">Delete</button>
                <button class="btn-primary" id="saveBtn">Save Changes</button>
            </div>
        </div>
    </div>

    <!-- Confirmation Modal -->
    <div id="confirmModal" class="modal-overlay" style="display: none;">
        <div class="modal modal-small">
            <div class="modal-header">
                <h3 class="modal-title">Confirm Action</h3>
            </div>
            <div class="modal-body">
                <p id="confirmMessage">Are you sure you want to proceed?</p>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" id="confirmCancel">Cancel</button>
                <button class="btn-danger" id="confirmAction">Confirm</button>
            </div>
        </div>
    </div>

    <!-- Environment Details Modal -->
    <div id="envDetailsModal" class="modal-overlay" style="display: none;">
        <div class="modal modal-large">
            <div class="modal-header">
                <h3 class="modal-title" id="envDetailsTitle">Environment Details</h3>
                <button class="modal-close" id="closeEnvDetails" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <div id="envDetailsContent">
                    <!-- Dynamic content populated by JavaScript -->
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" id="closeEnvDetailsBtn">Close</button>
            </div>
        </div>
    </div>

</div>

<!-- Confluence User Context for JavaScript -->
<!-- US-098 Configuration Management: Environment-aware API base URL injection -->
<!-- SECURITY: Using JsonBuilder for automatic XSS protection via proper escaping -->
<script type="text/javascript">
    window.UMIG_CONFIG = ${new groovy.json.JsonBuilder([
        confluence: [
            username: confluenceUsername ?: '',
            fullName: confluenceFullName ?: '',
            email: confluenceEmail ?: ''
        ],
        api: [
            baseUrl: apiBaseUrl,
            webResourcesPath: webResourcesPath
        ],
        environment: [
            code: ConfigurationService.getCurrentEnvironment(),
            detected: "server-side"
        ],
        features: [
            superAdminEnabled: true,
            bulkOperations: true,
            exportEnabled: true
        ]
    ]).toString()};
    console.log('[UMIG] Configuration loaded:', {
        environment: window.UMIG_CONFIG.environment.code,
        apiBaseUrl: window.UMIG_CONFIG.api.baseUrl,
        webResourcesPath: window.UMIG_CONFIG.api.webResourcesPath
    });
</script>

<!-- Optimized CSS loading with critical path optimization -->
<style>
/* Critical CSS for above-the-fold content to prevent FOUC */
.umig-admin-container { opacity: 0; transition: opacity 0.2s ease-in; }
.umig-admin-container.loaded { opacity: 1; }
.login-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.login-box { max-width: 400px; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.loading-container { text-align: center; padding: 2rem; }
.loading-spinner { display: inline-block; width: 2rem; height: 2rem; border: 3px solid #f3f3f3; border-top: 3px solid #0052cc; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>

<!-- Load main CSS after critical styles -->
<link rel="stylesheet" href="${webResourcesPath}/css/admin-gui.css" media="print" onload="this.media='all'; this.onload=null;">
<noscript><link rel="stylesheet" href="${webResourcesPath}/css/admin-gui.css"></noscript>

<!-- Standard JavaScript loading - no complex module loading system -->
<!-- Foundation scripts (load first) -->
<script src="${webResourcesPath}/js/StatusColorService.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/UiUtils.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/AdminGuiState.js?v=${jsVersion}"></script>

<!-- Utility scripts -->
<script src="${webResourcesPath}/js/utils/FeatureToggle.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/utils/PerformanceMonitor.js?v=${jsVersion}"></script>

<!-- Component system -->
<script src="${webResourcesPath}/js/components/SecurityUtils.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/components/EmailUtils.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/components/BaseComponent.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/components/ColorPickerComponent.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/components/ComponentOrchestrator.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/components/TableComponent.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/components/ModalComponent.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/components/FilterComponent.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/components/PaginationComponent.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/components/WelcomeComponent.js?v=${jsVersion}"></script>

<!-- US-088 Phase 2 Components -->
<script src="${webResourcesPath}/js/components/DatabaseVersionManager.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/components/ComponentVersionTracker.js?v=${jsVersion}"></script>

<!-- Status provider (needs SecurityUtils) -->
<script src="${webResourcesPath}/js/utils/StatusProvider.js?v=${jsVersion}"></script>

<!-- Entity configuration -->
<script src="${webResourcesPath}/js/EntityConfig.js?v=${jsVersion}"></script>

<!-- Entity system -->
<script src="${webResourcesPath}/js/entities/BaseEntityManager.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/entities/teams/TeamsEntityManager.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/entities/users/UsersEntityManager.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/entities/environments/EnvironmentsEntityManager.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/entities/applications/ApplicationsEntityManager.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/entities/labels/LabelsEntityManager.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/entities/migration-types/MigrationTypesEntityManager.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/entities/iteration-types/IterationTypesEntityManager.js?v=${jsVersion}"></script>

<!-- Additional managers -->
<script src="${webResourcesPath}/js/ApiClient.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/AuthenticationManager.js?v=${jsVersion}"></script>
<script src="${webResourcesPath}/js/ModalManager.js?v=${jsVersion}"></script>

<!-- Main controller (loads last) -->
<script src="${webResourcesPath}/js/admin-gui.js?v=${jsVersion}"></script>

<!-- Simple initialization -->
<script>
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Show the interface immediately
    const container = document.getElementById('umig-admin-gui-root');
    if (container) {
        container.classList.add('loaded');
    }

    // Initialize admin GUI if available
    if (window.adminGui && typeof window.adminGui.init === 'function') {
        console.log('[UMIG] Initializing Admin GUI...');
        window.adminGui.init();
    } else {
        console.warn('[UMIG] Admin GUI not available for initialization');
    }
});
</script>

<!-- Standard preload hints for better performance -->
<link rel="preload" href="${webResourcesPath}/js/EntityConfig.js?v=${jsVersion}" as="script">
<link rel="preload" href="${webResourcesPath}/js/components/ComponentOrchestrator.js?v=${jsVersion}" as="script">
<link rel="preload" href="${webResourcesPath}/js/entities/BaseEntityManager.js?v=${jsVersion}" as="script">
<link rel="preload" href="${webResourcesPath}/js/admin-gui.js?v=${jsVersion}" as="script">

<!-- Standard JavaScript loading complete -->
"""