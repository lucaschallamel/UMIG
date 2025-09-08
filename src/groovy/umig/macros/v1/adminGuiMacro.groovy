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
def jsVersion = "2.4.0"

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
  
  // Override console methods with targeted suppression
  console.warn = function() {
    if (!isConfluenceWarning(arguments)) {
      return originalWarn.apply(console, arguments);
    }
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
  
  // 2. Defer Confluence's heavy scripts
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
  
  // 3. Optimize AJS if it exists
  if (typeof AJS !== 'undefined' && AJS.params) {
    // Cache AJS.params access
    const paramsCache = {};
    const originalParams = AJS.params;
    
    AJS.params = new Proxy(originalParams, {
      get: function(target, prop) {
        if (!(prop in paramsCache)) {
          paramsCache[prop] = target[prop];
        }
        return paramsCache[prop];
      }
    });
  }
  
  // 4. Report optimization results after DOM is ready
  const reportResults = function() {
    const perfEnd = performance.now();
    const loadTime = (perfEnd - perfStart).toFixed(2);
    
    // Restore console methods after initial load
    setTimeout(function() {
      console.warn = originalWarn;
      console.log = originalLog;
      console.error = originalError;
      document.createElement = originalCreateElement;
      
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
    }, ${PERFORMANCE_CONFIG.CONSOLE_RESTORE_DELAY}); // Wait before restoring console methods
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
          
          // Now load the scripts
          const scripts = [
            '${webResourcesPath}/js/EntityConfig.js?v=${jsVersion}',
            '${webResourcesPath}/js/ModalManager.js?v=${jsVersion}',
            '${webResourcesPath}/js/AdminGuiController.js?v=${jsVersion}',
            '${webResourcesPath}/js/admin-gui.js?v=${jsVersion}'
          ];
          
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
  <!-- Load modules in isolation -->
  <script src="${webResourcesPath}/js/EntityConfig.js?v=${jsVersion}"></script>
  <script src="${webResourcesPath}/js/ModalManager.js?v=${jsVersion}"></script>
  <script src="${webResourcesPath}/js/AdminGuiController.js?v=${jsVersion}"></script>
  <script src="${webResourcesPath}/js/admin-gui.js?v=${jsVersion}"></script>
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

<!-- Optimized JavaScript loading with lazy loading and bundling -->
<!-- Critical modules loaded synchronously for immediate functionality -->
<script>
// Intelligent script loader with performance optimization
(function() {
  'use strict';
  
  const basePath = '${webResourcesPath}/js/';
  const version = '${jsVersion}';
  
  // Critical modules needed for initial render (load immediately)
  const criticalModules = [
    'StatusColorService.js',
    'EntityConfig.js',
    'UiUtils.js',
    'AdminGuiState.js'
  ];
  
  // Deferred modules loaded after critical path (lazy load)
  const deferredModules = [
    'ApiClient.js',
    'AuthenticationManager.js', 
    'TableManager.js',
    'ModalManager.js',
    'AdminGuiController.js'
  ];
  
  // Load script with caching and error handling
  function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = basePath + src + '?v=' + version;
    script.async = false; // Preserve execution order
    
    script.onload = callback;
    script.onerror = function() {
      console.error('Failed to load:', src);
      if (callback) callback();
    };
    
    document.head.appendChild(script);
  }
  
  // Load modules in batches for optimal performance
  function loadModuleBatch(modules, callback) {
    let loaded = 0;
    const total = modules.length;
    
    if (total === 0) {
      callback && callback();
      return;
    }
    
    modules.forEach(function(module) {
      loadScript(module, function() {
        loaded++;
        if (loaded === total && callback) {
          callback();
        }
      });
    });
  }
  
  // Load critical modules first
  loadModuleBatch(criticalModules, function() {
    console.log('✅ Critical modules loaded');
    
    // Show interface after critical modules are ready
    const container = document.getElementById('umig-admin-gui-root');
    if (container) {
      container.classList.add('loaded');
    }
    
    // Start deferred loading after a short delay to prevent blocking
    setTimeout(function() {
      loadModuleBatch(deferredModules, function() {
        console.log('✅ All modules loaded');
        
        // Trigger performance logging
        if (window.UMIG_LOADER) {
          window.UMIG_LOADER.logPerformance();
        }
        
        // Mark fully loaded for any waiting components
        document.body.setAttribute('data-umig-ready', 'true');
      });
    }, 10);
  });
  
})();
</script>

<!-- Preload hints for faster subsequent requests -->
<link rel="preload" href="${webResourcesPath}/js/EntityConfig.js?v=${jsVersion}" as="script">
<link rel="preload" href="${webResourcesPath}/js/AdminGuiController.js?v=${jsVersion}" as="script">

<!-- Early warning suppression and performance optimization -->
<script>
// CRITICAL: Suppress warnings IMMEDIATELY before any other scripts load
(function() {
  'use strict';
  
  const perfStart = performance.now();
  let suppressCount = 0;
  
  // Aggressive warning suppression - must run before Confluence scripts
  if (window.console && console.warn) {
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.warn = function() {
      const message = arguments[0];
      if (message && typeof message === 'string') {
        // Suppress all Confluence deprecation warnings that slow down loading
        if (message.includes('AJS.params') || 
            message.includes('window._') || 
            message.includes('Dialog') ||
            message.includes('AJS.debounce') ||
            message.includes('deprecated') ||
            message.includes('AJS.') ||
            message.match(/AUI\\s*\\d+\\.\\d+/)) {
          suppressCount++;
          return; // Silent suppression for performance
        }
      }
      originalWarn.apply(console, arguments);
    };
    
    // Also suppress related errors that can slow down initialization
    console.error = function() {
      const message = arguments[0];
      if (message && typeof message === 'string' && message.includes('AJS.')) {
        suppressCount++;
        return;
      }
      originalError.apply(console, arguments);
    };
  }
  
  // Create optimized loader with intelligent module bundling
  window.UMIG_LOADER = {
    loadStart: perfStart,
    suppressCount: suppressCount,
    loadedModules: [],
    criticalModules: ['StatusColorService', 'EntityConfig', 'UiUtils', 'AdminGuiState'],
    deferredModules: ['ApiClient', 'AuthenticationManager', 'TableManager', 'ModalManager'],
    
    // Load modules with priority and bundling
    loadModules: function(modules, callback) {
      let loadedCount = 0;
      const total = modules.length;
      
      modules.forEach(function(module, index) {
        setTimeout(function() {
          // Module is already loaded via script tags, just track completion
          loadedCount++;
          if (loadedCount === total && callback) {
            callback();
          }
        }, index * 2); // Stagger by 2ms to prevent blocking
      });
    },
    
    // Enhanced performance logging
    logPerformance: function() {
      const loadEnd = performance.now();
      const totalTime = loadEnd - this.loadStart;
      
      // Only log in development or when performance is poor
      if (totalTime > 1000 || window.location.href.includes('localhost')) {
        console.group('🚀 UMIG Performance Metrics');
        console.log('📊 Load time:', totalTime.toFixed(2) + 'ms');
        console.log('🤫 Warnings suppressed:', this.suppressCount);
        console.log('📦 Modules loaded:', this.loadedModules.length);
        if (totalTime > 2000) {
          console.warn('⚠️  Slow load detected. Consider clearing browser cache.');
        }
        console.groupEnd();
      }
    }
  };
  
})();
</script>
"""