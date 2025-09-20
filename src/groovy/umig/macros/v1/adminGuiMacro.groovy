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

// Version string for JavaScript files (update when deploying changes)
// Using a stable version instead of System.currentTimeMillis() for better caching
def jsVersion = "3.0.0"

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
<!-- UMIG Ultra-Performance Mode: Aggressive optimization before Confluence loads -->
<script>
// CRITICAL: Ultra-early injection to beat Confluence's batch.js
(function() {
  'use strict';
  
  // Check if already initialized
  if (window.__umigOptimized) return;
  window.__umigOptimized = true;
  
  // Track performance from the very start
  const perfStart = performance.now();
  
  // Initialize performance metrics collection
  window.UMIG_PERFORMANCE_METRICS = {
    startTime: perfStart,
    suppressedWarnings: 0,
    modulesLoaded: 0,
    loadingStrategy: 'ultra-performance',
    resourceCount: 0
  };
  
  // 1. Aggressive console override - capture EVERYTHING
  const originalWarn = console.warn;
  const originalLog = console.log;
  const originalError = console.error;
  
  let suppressedCount = 0;
  let suppressedSamples = [];
  
  // Create a more aggressive filter
  const shouldSuppress = function(args) {
    if (!args || !args[0]) return false;
    const msg = String(args[0]);
    
    // Suppress ALL Confluence/AJS related messages
    const patterns = [
      'AJS', 'ajs', 'deprecated', 'Deprecated', 
      'AUI', 'confluence', 'Confluence',
      'migration', 'jQuery', 'legacy',
      'params', 'Meta', 'batch'
    ];
    
    for (let pattern of patterns) {
      if (msg.includes(pattern)) {
        suppressedCount++;
        if (suppressedSamples.length < ${PERFORMANCE_CONFIG.WARNING_SAMPLE_LIMIT}) {
          suppressedSamples.push(msg.substring(0, 40) + '...');
        }
        return true;
      }
    }
    return false;
  };
  
  // More targeted console override - only suppress Confluence warnings
  const isConfluenceWarning = function(args) {
    if (!args || !args[0]) return false;
    const msg = String(args[0]);
    
    // Only suppress known Confluence/AJS warnings
    const confluencePatterns = [
      'AJS.params', 'AJS.debounce', 'AJS.Meta',
      'window._', 'Dialog is deprecated',
      'AUI', 'confluence.', 'Confluence.'
    ];
    
    // Don't suppress if it's our own code
    if (msg.includes('[UMIG]') || msg.includes('umig-')) {
      return false;
    }
    
    // Check if it's a Confluence warning
    for (let pattern of confluencePatterns) {
      if (msg.includes(pattern)) {
        suppressedCount++;
        window.UMIG_PERFORMANCE_METRICS.suppressedWarnings = suppressedCount;
        if (suppressedSamples.length < ${PERFORMANCE_CONFIG.WARNING_SAMPLE_LIMIT}) {
          suppressedSamples.push(msg.substring(0, 40) + '...');
        }
        return true;
      }
    }
    return false;
  };
  
  // Override console methods with targeted suppression - REDUCED FOR DEBUGGING
  console.warn = function() {
    // Only suppress very specific AJS.params warnings, not everything
    if (arguments[0] && String(arguments[0]).includes('AJS.params is deprecated')) {
      suppressedCount++;
      window.UMIG_PERFORMANCE_METRICS.suppressedWarnings = suppressedCount;
      return;
    }
    // Allow all other warnings through for debugging
    return originalWarn.apply(console, arguments);
  };
  
  console.log = function() {
    // Always allow our own logs and don't suppress other logs
    return originalLog.apply(console, arguments);
  };
  
  console.error = function() {
    // Never suppress errors - they're critical for debugging
    return originalError.apply(console, arguments);
  };
  
  console.log = function() {
    // Always allow our own logs
    if (arguments[0] && String(arguments[0]).includes('[UMIG]')) {
      return originalLog.apply(console, arguments);
    }
    // Only suppress Confluence logs
    if (!isConfluenceWarning(arguments)) {
      return originalLog.apply(console, arguments);
    }
  };
  
  console.error = function() {
    // Never suppress errors - they're important for debugging
    return originalError.apply(console, arguments);
  };
  
  // 2. Defer Confluence's heavy scripts - DISABLED TO PREVENT BATCH.JS CONFLICTS
  /*
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    
    // Intercept script tags
    if (tagName.toLowerCase() === 'script') {
      const originalSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      
      Object.defineProperty(element, 'src', {
        get: function() {
          return originalSrc.get.call(this);
        },
        set: function(value) {
          // Defer non-critical Confluence scripts
          if (value && (value.includes('batch.js') || value.includes('batch-'))) {
            element.async = true;
            element.defer = true;
          }
          return originalSrc.set.call(this, value);
        }
      });
    }
    
    return element;
  };
  */
  
  // Restore createElement to prevent conflicts
  // document.createElement = originalCreateElement;
  
  // Define reportResults function properly
  const reportResults = function() {
    const loadTime = performance.now() - perfStart;
    
    // Finalize performance metrics
    window.UMIG_PERFORMANCE_METRICS.loadTime = loadTime;
    window.UMIG_PERFORMANCE_METRICS.resourceCount = performance.getEntriesByType ? performance.getEntriesByType('resource').length : 0;
    
    // Report results
    console.log('[UMIG] ⚡ Ultra-Performance Mode Active');
    console.log('[UMIG] 🚀 Initial optimization time: ' + loadTime + 'ms');
    console.log('[UMIG] 🤫 Suppressed ' + suppressedCount + ' console messages');
    console.log('[UMIG] 📊 Performance metrics available at window.UMIG_PERFORMANCE_METRICS');
    
    if (suppressedSamples.length > 0) {
      console.log('[UMIG] 📝 Sample suppressed messages:', suppressedSamples);
    }
  };
  
  // Use multiple methods to ensure we run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reportResults);
  } else {
    // DOM already loaded
    setTimeout(reportResults, 0);
  }
  
  // Also use requestAnimationFrame as backup
  if (window.requestAnimationFrame) {
    requestAnimationFrame(function() {
      requestAnimationFrame(reportResults);
    });
  }
})();
</script>

<!-- Resource hints for better loading performance -->
<link rel="dns-prefetch" href="//localhost:8090">
<link rel="preconnect" href="/rest/scriptrunner/latest/custom">

<!-- Two-Stage Delayed Loading Option -->
<script>
(function() {
  // Check URL parameters for loading strategy
  const urlParams = new URLSearchParams(window.location.search);
  const useDelayedLoad = urlParams.get('umig_delay') === 'true';
  
  if (useDelayedLoad) {
    // Stage 1: Show minimal loader while Confluence settles
    document.write('<div id="umig-delayed-loader" style="padding: 50px; text-align: center;">');
    document.write('<h2>UMIG Admin Console</h2>');
    document.write('<div class="loading-spinner" style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #0052cc; border-radius: 50%; animation: spin 1s linear infinite;"></div>');
    document.write('<p>Optimizing performance...</p>');
    document.write('<style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>');
    document.write('</div>');
    
    // Stage 2: Load actual Admin GUI after Confluence settles
    window.addEventListener('load', function() {
      setTimeout(function() {
        console.log('[UMIG] 🎯 Starting delayed load after Confluence initialization');
        
        // Remove the loader
        const loader = document.getElementById('umig-delayed-loader');
        if (loader) {
          loader.style.display = 'none';
        }
        
        // Show the actual Admin GUI
        const adminGui = document.getElementById('umig-admin-gui-root');
        if (adminGui) {
          adminGui.style.display = 'block';
          
          // Scripts will be loaded by ModuleLoader - removed direct loading to prevent race conditions
          // ModuleLoader handles all dependencies properly including EntityManagers
          console.log('[UMIG] ModuleLoader will handle all script loading with proper dependencies');
          
          let loadedCount = 0;
          scripts.forEach(function(src) {
            const script = document.createElement('script');
            script.src = src;
            script.onload = function() {
              loadedCount++;
              if (loadedCount === scripts.length) {
                console.log('[UMIG] ✅ Delayed load complete - Admin GUI ready');
              }
            };
            document.body.appendChild(script);
          });
        }
      }, ${PERFORMANCE_CONFIG.DELAYED_LOAD_WAIT}); // Wait for Confluence to fully settle
    });
    
    // Initially hide the main container
    document.write('<style>#umig-admin-gui-root { display: none; }</style>');
  }
})();
</script>

<!-- Iframe Isolation Option (can be toggled via URL parameter) -->
<script>
(function() {
  // Check if we should use iframe isolation mode
  const urlParams = new URLSearchParams(window.location.search);
  const useIframe = urlParams.get('umig_iframe') === 'true';
  
  if (useIframe) {
    // Create an isolated iframe for the Admin GUI
    document.write('<div id="umig-iframe-container" style="width: 100%; height: 100vh; position: relative;">');
    document.write('<iframe id="umig-admin-iframe" ');
    document.write('src="about:blank" ');
    document.write('style="width: 100%; height: 100%; border: none;" ');
    document.write('sandbox="allow-same-origin allow-scripts allow-forms allow-popups">');
    document.write('</iframe>');
    document.write('</div>');
    
    // After iframe loads, inject our content directly
    window.addEventListener('DOMContentLoaded', function() {
      const iframe = document.getElementById('umig-admin-iframe');
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Copy essential globals to iframe context
      iframe.contentWindow.UMIG_CONFIG = window.UMIG_CONFIG;
      
      // Build the isolated content
      const isolatedContent = document.getElementById('umig-isolated-content');
      if (isolatedContent) {
        iframeDoc.open();
        iframeDoc.write(isolatedContent.innerHTML);
        iframeDoc.close();
      }
      
      console.log('[UMIG] 🔒 Running in iframe isolation mode');
    });
    
    // Hide the normal container
    document.write('<style>#umig-admin-gui-root { display: none; }</style>');
  }
})();
</script>

<!-- Template for iframe content (hidden by default) -->
<script type="text/template" id="umig-isolated-content" style="display: none;">
<!DOCTYPE html>
<html>
<head>
  <title>UMIG Admin Console</title>
  <link rel="stylesheet" href="${webResourcesPath}/css/admin-gui.css">
</head>
<body>
  <div id="umig-admin-gui-root" class="umig-admin-container">
    <!-- Login and main content will be injected here -->
  </div>
  <script>
    // Isolated context - no Confluence interference
    window.UMIG_CONFIG = parent.UMIG_CONFIG;
    console.log('[UMIG] Running in isolated context - no Confluence overhead');
  </script>
  <!-- Modules are loaded by ModuleLoader with proper dependency resolution -->
  <!-- Direct script tags removed to prevent race conditions -->
</body>
</html>
</script>

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

<!-- Revolutionary Module Loading System with Dependency Resolution and Visual Feedback -->
<script>
/**
 * UMIG Advanced Module Loader v3.0
 *
 * Features:
 * - Dependency tree resolution with topological sorting
 * - Retry logic with exponential backoff
 * - Visual loading progress with detailed feedback
 * - Timeout and fallback strategies
 * - Comprehensive error recovery
 * - Module validation and health checks
 */
(function() {
  'use strict';

  const basePath = '${webResourcesPath}/js/';
  const version = '${jsVersion}';

  // Advanced Module Loader Class
  class ModuleLoader {
    constructor() {
      this.basePath = basePath;
      this.version = version;
      this.loadedModules = new Set();
      this.failedModules = new Set();
      this.loadingQueue = new Map();
      this.retryAttempts = new Map();
      this.maxRetries = 3;
      this.retryDelay = 1000; // Base delay for exponential backoff
      this.globalTimeout = 30000; // 30 second total timeout
      this.startTime = performance.now();

      // Initialize visual progress
      this.initProgressIndicator();

      // Module dependency graph
      this.modules = {
        // Foundation modules (no dependencies)
        'StatusColorService.js': {
          dependencies: [],
          exports: 'StatusColorService',
          critical: true,
          timeout: 5000
        },
        'UiUtils.js': {
          dependencies: [],
          exports: 'UiUtils',
          critical: true,
          timeout: 5000
        },
        'AdminGuiState.js': {
          dependencies: [],
          exports: 'AdminGuiState',
          critical: true,
          timeout: 5000
        },
        'EntityConfig.js': {
          dependencies: ['utils/StatusProvider.js'],
          exports: 'EntityConfig',
          critical: true,
          timeout: 5000
        },
        'utils/FeatureToggle.js': {
          dependencies: [],
          exports: 'FeatureToggle',
          critical: false,
          timeout: 3000
        },
        'utils/PerformanceMonitor.js': {
          dependencies: [],
          exports: 'PerformanceMonitor',
          critical: false,
          timeout: 3000
        },

        // Component system (depends on foundation)
        'components/SecurityUtils.js': {
          dependencies: ['UiUtils.js'],
          exports: 'SecurityUtils',
          critical: true,
          timeout: 5000
        },
        'components/BaseComponent.js': {
          dependencies: ['UiUtils.js', 'AdminGuiState.js'],
          exports: 'BaseComponent',
          critical: true,
          timeout: 5000
        },
        'components/ComponentOrchestrator.js': {
          dependencies: ['components/BaseComponent.js', 'components/SecurityUtils.js'],
          exports: 'ComponentOrchestrator',
          critical: true,
          timeout: 8000
        },
        'components/TableComponent.js': {
          dependencies: ['components/BaseComponent.js'],
          exports: 'TableComponent',
          critical: true,
          timeout: 5000
        },
        'components/ModalComponent.js': {
          dependencies: ['components/BaseComponent.js'],
          exports: 'ModalComponent',
          critical: true,
          timeout: 5000
        },
        'components/FilterComponent.js': {
          dependencies: ['components/BaseComponent.js'],
          exports: 'FilterComponent',
          critical: true,
          timeout: 5000
        },
        'components/PaginationComponent.js': {
          dependencies: ['components/BaseComponent.js'],
          exports: 'PaginationComponent',
          critical: true,
          timeout: 5000
        },

        // Entity system (depends on components)
        'entities/BaseEntityManager.js': {
          dependencies: ['components/ComponentOrchestrator.js', 'components/SecurityUtils.js'],
          exports: 'BaseEntityManager',
          critical: true,
          timeout: 8000
        },
        'entities/teams/TeamsEntityManager.js': {
          dependencies: ['entities/BaseEntityManager.js'],
          exports: 'TeamsEntityManager',
          critical: true,
          timeout: 5000
        },
        'entities/users/UsersEntityManager.js': {
          dependencies: ['entities/BaseEntityManager.js'],
          exports: 'UsersEntityManager',
          critical: true,
          timeout: 5000
        },
        'entities/environments/EnvironmentsEntityManager.js': {
          dependencies: ['entities/BaseEntityManager.js'],
          exports: 'EnvironmentsEntityManager',
          critical: true,
          timeout: 5000
        },
        'entities/applications/ApplicationsEntityManager.js': {
          dependencies: ['entities/BaseEntityManager.js'],
          exports: 'ApplicationsEntityManager',
          critical: true,
          timeout: 5000
        },
        'entities/labels/LabelsEntityManager.js': {
          dependencies: ['entities/BaseEntityManager.js'],
          exports: 'LabelsEntityManager',
          critical: true,
          timeout: 5000
        },
        'entities/migration-types/MigrationTypesEntityManager.js': {
          dependencies: ['entities/BaseEntityManager.js'],
          exports: 'MigrationTypesEntityManager',
          critical: true,
          timeout: 5000
        },
        'entities/iteration-types/IterationTypesEntityManager.js': {
          dependencies: ['entities/BaseEntityManager.js'],
          exports: 'IterationTypesEntityManager',
          critical: true,
          timeout: 5000
        },

        // Main controller (depends on everything)
        'admin-gui.js': {
          dependencies: [
            'EntityConfig.js',
            'ModalManager.js',
            'entities/teams/TeamsEntityManager.js',
            'entities/users/UsersEntityManager.js',
            'entities/environments/EnvironmentsEntityManager.js',
            'entities/applications/ApplicationsEntityManager.js',
            'entities/labels/LabelsEntityManager.js',
            'entities/migration-types/MigrationTypesEntityManager.js',
            'entities/iteration-types/IterationTypesEntityManager.js'
          ],
          exports: 'adminGui',
          critical: true,
          timeout: 10000
        },

        // StatusProvider (depends on SecurityUtils)
        'utils/StatusProvider.js': {
          dependencies: ['components/SecurityUtils.js'],
          exports: 'StatusProvider',
          critical: true,
          timeout: 5000
        },

        // Deferred modules (non-critical)
        'ApiClient.js': {
          dependencies: ['UiUtils.js'],
          exports: 'ApiClient',
          critical: false,
          timeout: 3000
        },
        'AuthenticationManager.js': {
          dependencies: ['UiUtils.js'],
          exports: 'AuthenticationManager',
          critical: false,
          timeout: 3000
        },
        'ModalManager.js': {
          dependencies: ['UiUtils.js'],
          exports: 'ModalManager',
          critical: false,
          timeout: 3000
        }
      };
    }

    initProgressIndicator() {
      // Create loading overlay with progress bar
      const overlay = document.createElement('div');
      overlay.id = 'umig-module-loader';
      overlay.innerHTML = `
        <div class="umig-loader-overlay">
          <div class="umig-loader-content">
            <div class="umig-loader-header">
              <h3>🚀 UMIG Admin Console</h3>
              <p>Loading enterprise components...</p>
            </div>

            <div class="umig-progress-container">
              <div class="umig-progress-bar">
                <div class="umig-progress-fill" id="umig-progress-fill"></div>
              </div>
              <div class="umig-progress-text">
                <span id="umig-progress-percent">0%</span>
                <span id="umig-progress-module">Initializing...</span>
              </div>
            </div>

            <div class="umig-loader-details">
              <div class="umig-loader-stats">
                <span id="umig-loaded-count">0</span>/<span id="umig-total-count">0</span> modules loaded
              </div>
              <div class="umig-loader-current" id="umig-current-module">
                Starting module loader...
              </div>
            </div>

            <div class="umig-loader-errors" id="umig-loader-errors" style="display: none;">
              <h4>⚠️ Loading Issues:</h4>
              <ul id="umig-error-list"></ul>
              <button class="umig-retry-btn" id="umig-retry-btn">Retry Failed Modules</button>
            </div>
          </div>
        </div>
      `;

      // Add styles
      overlay.innerHTML += `
        <style>
          .umig-loader-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255, 255, 255, 0.95);
            display: flex; align-items: center; justify-content: center;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .umig-loader-content {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            min-width: 400px;
            max-width: 500px;
          }
          .umig-loader-header h3 {
            margin: 0 0 0.5rem 0;
            color: #0052cc;
            font-size: 1.5rem;
          }
          .umig-loader-header p {
            margin: 0 0 1.5rem 0;
            color: #6b778c;
          }
          .umig-progress-container {
            margin-bottom: 1.5rem;
          }
          .umig-progress-bar {
            width: 100%;
            height: 8px;
            background: #f4f5f7;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 0.5rem;
          }
          .umig-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #0052cc, #4c9aff);
            width: 0%;
            transition: width 0.3s ease;
          }
          .umig-progress-text {
            display: flex;
            justify-content: space-between;
            font-size: 0.875rem;
            color: #6b778c;
          }
          .umig-loader-details {
            padding-top: 1rem;
            border-top: 1px solid #f4f5f7;
          }
          .umig-loader-stats {
            font-weight: 600;
            color: #172b4d;
            margin-bottom: 0.5rem;
          }
          .umig-loader-current {
            font-size: 0.875rem;
            color: #6b778c;
            font-style: italic;
          }
          .umig-loader-errors {
            margin-top: 1rem;
            padding: 1rem;
            background: #ffebe6;
            border-radius: 4px;
            border-left: 4px solid #de350b;
          }
          .umig-loader-errors h4 {
            margin: 0 0 0.5rem 0;
            color: #de350b;
          }
          .umig-loader-errors ul {
            margin: 0 0 1rem 0;
            padding-left: 1.5rem;
          }
          .umig-loader-errors li {
            color: #172b4d;
            margin-bottom: 0.25rem;
          }
          .umig-retry-btn {
            background: #de350b;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
          }
          .umig-retry-btn:hover {
            background: #bf2600;
          }
        </style>
      `;

      document.body.appendChild(overlay);

      // Bind retry button
      const retryBtn = document.getElementById('umig-retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.retryFailedModules();
        });
      }
    }

    updateProgress(loaded, total, currentModule = '') {
      const percent = Math.round((loaded / total) * 100);

      const fillEl = document.getElementById('umig-progress-fill');
      const percentEl = document.getElementById('umig-progress-percent');
      const moduleEl = document.getElementById('umig-progress-module');
      const loadedEl = document.getElementById('umig-loaded-count');
      const totalEl = document.getElementById('umig-total-count');
      const currentEl = document.getElementById('umig-current-module');

      if (fillEl) fillEl.style.width = percent + '%';
      if (percentEl) percentEl.textContent = percent + '%';
      if (moduleEl) moduleEl.textContent = currentModule || 'Processing...';
      if (loadedEl) loadedEl.textContent = loaded;
      if (totalEl) totalEl.textContent = total;
      if (currentEl) currentEl.textContent = currentModule ? `Loading: \${currentModule}` : 'Processing dependencies...';
    }

    showError(module, error) {
      const errorsEl = document.getElementById('umig-loader-errors');
      const errorListEl = document.getElementById('umig-error-list');

      if (errorsEl && errorListEl) {
        errorsEl.style.display = 'block';

        const listItem = document.createElement('li');
        listItem.textContent = `\${module}: \${error}`;
        errorListEl.appendChild(listItem);
      }
    }

    hideLoader() {
      const loader = document.getElementById('umig-module-loader');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
          loader.remove();
        }, 500);
      }
    }

    // Topological sort for dependency resolution
    getLoadOrder() {
      const visited = new Set();
      const visiting = new Set();
      const order = [];

      const visit = (module) => {
        if (visiting.has(module)) {
          throw new Error(`Circular dependency detected involving: \${module}`);
        }
        if (visited.has(module)) return;

        visiting.add(module);

        const moduleInfo = this.modules[module];
        if (moduleInfo && moduleInfo.dependencies) {
          for (const dep of moduleInfo.dependencies) {
            if (this.modules[dep]) {
              visit(dep);
            }
          }
        }

        visiting.delete(module);
        visited.add(module);
        order.push(module);
      };

      // Visit all modules
      for (const module of Object.keys(this.modules)) {
        visit(module);
      }

      return order;
    }

    /**
     * Wait for an export to become available with polling and comprehensive debugging
     */
    waitForExport(exportName, timeout = 1000, pollInterval = 20) {
      return new Promise((resolve, reject) => {
        const startTime = performance.now();
        let pollCount = 0;
        const maxPolls = Math.ceil(timeout / pollInterval);

        console.log(`[UMIG] 🔍 Starting export verification for \${exportName} (timeout: \${timeout}ms, interval: \${pollInterval}ms)`);

        const checkExport = () => {
          pollCount++;
          const elapsed = performance.now() - startTime;

          // Check if export exists
          if (window[exportName]) {
            console.log(`[UMIG] ✅ Export verified: \${exportName} (found after \${pollCount} polls, \${elapsed.toFixed(1)}ms)`);
            resolve();
            return;
          }

          // Log progress every 10 polls or at timeout
          if (pollCount % 10 === 0 || elapsed >= timeout * 0.8) {
            console.log(`[UMIG] 🔍 Still waiting for \${exportName}... (poll \${pollCount}/\${maxPolls}, \${elapsed.toFixed(1)}ms elapsed)`);

            // Debug: Check what's available on window
            const windowKeys = Object.keys(window).filter(key => key.includes('Component')).slice(0, 5);
            console.log(`[UMIG] 🐛 Available *Component keys on window:`, windowKeys);
          }

          // Timeout check
          if (elapsed >= timeout) {
            console.error(`[UMIG] ❌ Export timeout: \${exportName} not available after \${timeout}ms (\${pollCount} polls)`);

            // Final debug dump
            const allComponents = Object.keys(window).filter(key => key.includes('Component'));
            console.log(`[UMIG] 🐛 All *Component exports on window:`, allComponents);
            console.log(`[UMIG] 🐛 Checking window.\${exportName}:`, typeof window[exportName], window[exportName]);

            reject(new Error(`Export \${exportName} not available after \${timeout}ms (\${pollCount} polling attempts)`));
            return;
          }

          // Continue polling
          setTimeout(checkExport, pollInterval);
        };

        // Start checking immediately, then poll
        checkExport();
      });
    }

    async loadScript(module) {
      return new Promise(async (resolve, reject) => {
        const moduleInfo = this.modules[module];
        const scriptUrl = `\${this.basePath}\${module}?v=\${this.version}`;

        // CRITICAL: Check if script is already loaded to prevent duplicates
        const existingScript = document.querySelector(`script[src="\${scriptUrl}"]`);
        if (existingScript) {
          console.log(`[UMIG] ♻️ Module already loaded, skipping: \${module}`);

          // Still verify export is available with polling
          if (moduleInfo.exports) {
            try {
              await this.waitForExport(moduleInfo.exports, 500, 10);
              resolve();
            } catch (error) {
              reject(new Error(`Module \${module} script exists but \${moduleInfo.exports} not available: \${error.message}`));
            }
            return;
          } else {
            resolve(); // No export to check
            return;
          }
        }

        // Also check if module export already exists (script may have loaded differently)
        if (moduleInfo.exports && window[moduleInfo.exports]) {
          console.log(`[UMIG] ⚡ Module export already available: \${module} (\${moduleInfo.exports})`);
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = false;

        const loadTimeout = setTimeout(() => {
          reject(new Error(`Timeout loading \${module} after \${moduleInfo.timeout}ms`));
        }, moduleInfo.timeout || 5000);

        script.onload = async () => {
          clearTimeout(loadTimeout);

          // If no export expected, resolve immediately
          if (!moduleInfo.exports) {
            console.log(`[UMIG] ✅ Module loaded (no export expected): \${module}`);
            resolve();
            return;
          }

          // Use polling to wait for export availability with enhanced debugging
          try {
            console.log(`[UMIG] 🔍 Waiting for export: \${moduleInfo.exports} from module \${module}`);

            // Add script execution debugging
            console.log(`[UMIG] 🐛 Script onload triggered for \${module}, DOM readyState: \${document.readyState}`);

            await this.waitForExport(moduleInfo.exports, 1500, 25); // Increased timeout and interval
            console.log(`[UMIG] ✅ Module loaded and verified: \${module}`);
            resolve();
          } catch (error) {
            console.error(`[UMIG] ❌ Export verification failed for \${module}:`, error);

            // Enhanced error debugging
            console.log(`[UMIG] 🐛 Script debugging for \${module}:`);
            console.log(`[UMIG] 🐛 - Script src: \${script.src}`);
            console.log(`[UMIG] 🐛 - Script loaded: \${script.readyState || 'unknown'}`);
            console.log(`[UMIG] 🐛 - Expected export: \${moduleInfo.exports}`);
            console.log(`[UMIG] 🐛 - Actual window[\${moduleInfo.exports}]:`, window[moduleInfo.exports]);

            reject(new Error(`Module \${module} loaded but \${moduleInfo.exports} not available: \${error.message}`));
          }
        };

        script.onerror = () => {
          clearTimeout(loadTimeout);
          reject(new Error(`Failed to load script: \${script.src}`));
        };

        document.head.appendChild(script);
      });
    }

    async loadModuleWithRetry(module) {
      const moduleInfo = this.modules[module];

      // Check if already loaded successfully
      if (this.loadedModules.has(module)) {
        console.log(`[UMIG] ✅ Module already loaded successfully: \${module}`);
        return true;
      }

      // Check if module export already exists
      if (moduleInfo.exports && window[moduleInfo.exports]) {
        console.log(`[UMIG] ⚡ Module export detected, marking as loaded: \${module}`);
        this.loadedModules.add(module);
        return true;
      }

      let attempts = 0;

      while (attempts < this.maxRetries) {
        try {
          await this.loadScript(module);
          this.loadedModules.add(module);
          this.retryAttempts.delete(module);
          console.log(`[UMIG] ✅ Module successfully loaded and tracked: \${module}`);
          return true;
        } catch (error) {
          attempts++;
          this.retryAttempts.set(module, attempts);

          console.warn(`[UMIG] ⚠️ Failed to load \${module} (attempt \${attempts}/\${this.maxRetries}):`, error.message);

          if (attempts >= this.maxRetries) {
            this.failedModules.add(module);
            this.showError(module, error.message);

            // If it's a critical module, this is serious
            if (moduleInfo.critical) {
              console.error(`[UMIG] 🚨 Critical module failed: \${module}`);
              return false;
            } else {
              console.warn(`[UMIG] 🤷 Non-critical module failed: \${module}`);
              return true; // Continue for non-critical modules
            }
          }

          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempts - 1);
          console.log(`[UMIG] 🔄 Retrying \${module} in \${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      return false;
    }

    async retryFailedModules() {
      const failed = Array.from(this.failedModules);
      this.failedModules.clear();

      // Clear error display
      const errorListEl = document.getElementById('umig-error-list');
      if (errorListEl) {
        errorListEl.innerHTML = '';
      }

      console.log(`[UMIG] 🔄 Retrying \${failed.length} failed modules...`);

      for (const module of failed) {
        await this.loadModuleWithRetry(module);
      }

      // Hide errors if all resolved
      if (this.failedModules.size === 0) {
        const errorsEl = document.getElementById('umig-loader-errors');
        if (errorsEl) {
          errorsEl.style.display = 'none';
        }
      }
    }

    async load() {
      try {
        console.log('[UMIG] 🚀 Starting Advanced Module Loader v3.0');

        const loadOrder = this.getLoadOrder();
        const totalModules = loadOrder.length;
        let loadedCount = 0;

        this.updateProgress(0, totalModules, 'Computing dependencies...');

        console.log('[UMIG] 📋 Load order:', loadOrder);

        // Set global timeout
        const globalTimeoutId = setTimeout(() => {
          console.error('[UMIG] ⏰ Global timeout reached - some modules may not have loaded');
          this.finalizeLoading();
        }, this.globalTimeout);

        // Load modules in dependency order
        for (const module of loadOrder) {
          const moduleInfo = this.modules[module];

          // Skip if already loaded
          if (this.loadedModules.has(module)) {
            loadedCount++;
            this.updateProgress(loadedCount, totalModules, `\${module} (already loaded)`);
            continue;
          }

          this.updateProgress(loadedCount, totalModules, module);

          // Wait for dependencies - check both loading status AND export availability
          const depCheckStartTime = performance.now();
          while (moduleInfo.dependencies.some(dep => {
            const depInfo = this.modules[dep];
            const isLoaded = this.loadedModules.has(dep);
            const exportAvailable = !depInfo.exports || window[depInfo.exports];

            if (!isLoaded || !exportAvailable) {
              console.log(`[UMIG] ⏳ Waiting for dependency \${dep}: loaded=\${isLoaded}, export(\${depInfo.exports})=\${!!exportAvailable}`);
            }

            return !isLoaded || !exportAvailable;
          })) {
            if (performance.now() - depCheckStartTime > 5000) {
              console.error(`[UMIG] ⏰ Dependency timeout for \${module}`);
              // Log which dependencies are missing
              moduleInfo.dependencies.forEach(dep => {
                const depInfo = this.modules[dep];
                const isLoaded = this.loadedModules.has(dep);
                const exportAvailable = !depInfo.exports || window[depInfo.exports];
                if (!isLoaded || !exportAvailable) {
                  console.error(`[UMIG] ❌ Missing dependency: \${dep} - loaded=\${isLoaded}, export=\${!!exportAvailable}`);
                }
              });
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // Load the module
          const success = await this.loadModuleWithRetry(module);
          if (success) {
            loadedCount++;
            this.updateProgress(loadedCount, totalModules, module);
          }
        }

        clearTimeout(globalTimeoutId);

        // Finalize loading
        await this.finalizeLoading();

      } catch (error) {
        console.error('[UMIG] 💥 Fatal error in module loader:', error);
        this.showError('System', error.message);
      }
    }

    async finalizeLoading() {
      const loadTime = performance.now() - this.startTime;
      const successfulModules = this.loadedModules.size;
      const failedModules = this.failedModules.size;
      const totalModules = Object.keys(this.modules).length;

      console.group('🎯 Module Loading Summary');
      console.log(`⏱️  Total time: \${loadTime.toFixed(2)}ms`);
      console.log(`✅ Successful: \${successfulModules}/\${totalModules}`);
      console.log(`❌ Failed: \${failedModules}`);
      console.log(`🔄 Retries attempted: \${Array.from(this.retryAttempts.values()).reduce((a, b) => a + b, 0)}`);

      // Detailed module status
      console.log('📋 Loaded modules:', Array.from(this.loadedModules));
      if (this.failedModules.size > 0) {
        console.log('💥 Failed modules:', Array.from(this.failedModules));
      }

      console.groupEnd();

      // Check if critical modules loaded
      const criticalModules = Object.entries(this.modules)
        .filter(([_, info]) => info.critical)
        .map(([name, _]) => name);

      const failedCritical = criticalModules.filter(module => this.failedModules.has(module));

      if (failedCritical.length === 0) {
        console.log('[UMIG] 🎉 All critical modules loaded successfully!');

        // Update progress to 100%
        this.updateProgress(totalModules, totalModules, 'Complete!');

        // Show the interface
        const container = document.getElementById('umig-admin-gui-root');
        if (container) {
          container.classList.add('loaded');
        }

        // Mark as ready
        document.body.setAttribute('data-umig-ready', 'true');

        // Hide loader after short delay
        setTimeout(() => {
          this.hideLoader();
        }, 1000);

        // Create global reference for debugging
        window.UMIG_MODULE_LOADER = this;

        // Initialize the Admin GUI now that all modules are loaded
        // This is critical - without this, EntityManagers won't be initialized
        if (window.adminGui && typeof window.adminGui.init === 'function') {
          console.log('[UMIG] 🚀 Starting Admin GUI initialization...');
          // Use setTimeout to ensure all module-level code has completed
          setTimeout(() => {
            try {
              window.adminGui.init();
              console.log('[UMIG] ✅ Admin GUI initialized successfully');
            } catch (error) {
              console.error('[UMIG] ❌ Admin GUI initialization failed:', error);
              // Show error but don't block the UI
              this.showError('Initialization Error', 'Admin interface may have limited functionality');
            }
          }, 100);
        } else {
          console.error('[UMIG] ❌ Admin GUI not available for initialization');
          console.log('[UMIG] Available on window:', Object.keys(window).filter(k => k.includes('admin')));
        }

      } else {
        console.error('[UMIG] 🚨 Critical modules failed to load:', failedCritical);
        this.showError('Critical System', `Essential modules failed: \${failedCritical.join(', ')}`);

        // Update progress to show failure
        this.updateProgress(successfulModules, totalModules, `Failed: \${failedCritical.length} critical modules`);

        // Keep loader visible for retry
      }
    }
  }

  // Initialize and start loading
  const loader = new ModuleLoader();

  // Cache verification: Ensure v3.0.0 is properly loaded
  console.log(`[UMIG] 🔄 Advanced Module Loader v3.0 initialized`);
  console.log(`[UMIG] 📦 Cache version: \${version}`);
  console.log(`[UMIG] 🕐 Load timestamp: \${new Date().toISOString()}`);

  // Mark loader as active for admin-gui.js detection
  document.body.setAttribute('data-umig-loader-active', 'true');
  document.body.setAttribute('data-umig-loader-version', version);

  // Start loading when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[UMIG] 🚀 DOM ready, starting module loading...');
      loader.load();
    });
  } else {
    console.log('[UMIG] 🚀 DOM already ready, starting module loading immediately...');
    loader.load();
  }

})();
</script>

<!-- Preload hints for faster subsequent requests -->
<link rel="preload" href="${webResourcesPath}/js/EntityConfig.js?v=${jsVersion}" as="script">
<link rel="preload" href="${webResourcesPath}/js/components/ComponentOrchestrator.js?v=${jsVersion}" as="script">
<link rel="preload" href="${webResourcesPath}/js/entities/BaseEntityManager.js?v=${jsVersion}" as="script">
<link rel="preload" href="${webResourcesPath}/js/entities/teams/TeamsEntityManager.js?v=${jsVersion}" as="script">
<link rel="preload" href="${webResourcesPath}/js/admin-gui.js?v=${jsVersion}" as="script">

<!-- Preserved Warning Suppression for Confluence Compatibility -->
<script>
// Minimal warning suppression for Confluence compatibility
(function() {
  'use strict';

  // Only suppress specific known Confluence warnings that add noise
  if (window.console && console.warn) {
    const originalWarn = console.warn;

    console.warn = function() {
      const message = arguments[0];
      if (message && typeof message === 'string') {
        // Only suppress very specific AJS.params warnings
        if (message.includes('AJS.params is deprecated')) {
          return; // Silent suppression for this specific warning
        }
      }
      originalWarn.apply(console, arguments);
    };
  }
})();
</script>
"""