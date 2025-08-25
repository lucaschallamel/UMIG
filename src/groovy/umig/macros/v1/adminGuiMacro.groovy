package umig.macros

import com.atlassian.confluence.user.AuthenticatedUserThreadLocal
import com.atlassian.user.User

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
 */

// Get the current Confluence user context
User currentUser = AuthenticatedUserThreadLocal.get()
String confluenceUsername = currentUser?.getName() ?: ""
String confluenceFullName = currentUser?.getFullName() ?: ""
String confluenceEmail = currentUser?.getEmail() ?: ""

// Base path for web resources (CSS/JS)
def webResourcesPath = "/rest/scriptrunner/latest/custom/web"

return """
<!-- UMIG Admin GUI Container -->
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
<script type="text/javascript">
    window.UMIG_CONFIG = {
        confluence: {
            username: "${confluenceUsername}",
            fullName: "${confluenceFullName}",
            email: "${confluenceEmail}"
        },
        api: {
            baseUrl: "/rest/scriptrunner/latest/custom",
            webResourcesPath: "${webResourcesPath}"
        },
        features: {
            superAdminEnabled: true,
            bulkOperations: true,
            exportEnabled: true
        }
    };
</script>

<!-- Load CSS and JavaScript -->
<link rel="stylesheet" href="${webResourcesPath}/css/admin-gui.css">

<!-- Load JavaScript modules in dependency order -->
<script src="${webResourcesPath}/js/StatusColorService.js?v=${System.currentTimeMillis()}"></script>
<script src="${webResourcesPath}/js/EntityConfig.js?v=${System.currentTimeMillis()}"></script>
<script src="${webResourcesPath}/js/UiUtils.js?v=${System.currentTimeMillis()}"></script>
<script src="${webResourcesPath}/js/AdminGuiState.js?v=${System.currentTimeMillis()}"></script>
<script src="${webResourcesPath}/js/ApiClient.js?v=${System.currentTimeMillis()}"></script>
<script src="${webResourcesPath}/js/AuthenticationManager.js?v=${System.currentTimeMillis()}"></script>
<script src="${webResourcesPath}/js/TableManager.js?v=${System.currentTimeMillis()}"></script>
<script src="${webResourcesPath}/js/ModalManager.js?v=${System.currentTimeMillis()}"></script>
<script src="${webResourcesPath}/js/AdminGuiController.js?v=${System.currentTimeMillis()}"></script>

<!-- Debug script to help troubleshoot -->
<script>
console.log('UMIG Admin GUI Debug Info:');
console.log('- StatusColorService loaded:', !!window.StatusColorService);
console.log('- EntityConfig loaded:', !!window.EntityConfig);
console.log('- UiUtils loaded:', !!window.UiUtils);
console.log('- AdminGuiState loaded:', !!window.AdminGuiState);
console.log('- ApiClient loaded:', !!window.ApiClient);
console.log('- AuthenticationManager loaded:', !!window.AuthenticationManager);
console.log('- TableManager loaded:', !!window.TableManager);
console.log('- ModalManager loaded:', !!window.ModalManager);
console.log('- AdminGuiController loaded:', !!window.AdminGuiController);
console.log('- adminGui global object:', !!window.adminGui);
console.log('- UMIG_CONFIG:', window.UMIG_CONFIG);
</script>
"""