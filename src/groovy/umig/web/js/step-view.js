/**
 * Step View Client-side Controller
 *
 * Provides a standalone view for a single step instance with all features
 * from the iteration view's step details panel:
 * - Role-based controls (NORMAL, PILOT, ADMIN)
 * - Instruction completion tracking
 * - Comment management
 * - Status updates
 * - Email notifications
 */

/**
 * StepView Real-time Synchronization and Caching System
 * 
 * Enhanced with intelligent caching patterns following Enhanced IterationView approach.
 * Features 30-second cache TTL and 2-second polling for real-time updates.
 */
class StepViewCache {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 30000; // 30 seconds
    this.pollingInterval = 2000; // 2 seconds
    this.pollingTimer = null;
    this.isPolling = false;
    this.lastRefreshTime = 0;
  }

  /**
   * Get cached step data or fetch fresh if expired
   */
  async getStepData(migrationName, iterationName, stepCode, forceRefresh = false) {
    const cacheKey = `${migrationName}|${iterationName}|${stepCode}`;
    const now = Date.now();
    
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (now - cached.timestamp < this.cacheTTL) {
        console.log('🎯 StepView: Using cached data');
        return cached.data;
      }
    }

    console.log('🔄 StepView: Fetching fresh data');
    return this.fetchStepData(migrationName, iterationName, stepCode);
  }

  /**
   * Fetch step data from API and cache it
   */
  async fetchStepData(migrationName, iterationName, stepCode) {
    const config = window.UMIG_STEP_CONFIG || {
      api: { baseUrl: "/rest/scriptrunner/latest/custom" }
    };

    const queryParams = new URLSearchParams({
      migrationName: migrationName,
      iterationName: iterationName,
      stepCode: stepCode
    });

    const response = await fetch(
      `${config.api.baseUrl}/stepViewApi/instance?${queryParams}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || `Failed to load step: ${response.status}`);
    }

    const stepData = await response.json();
    
    if (stepData.error) {
      throw new Error(stepData.error);
    }

    // Cache the data
    const cacheKey = `${migrationName}|${iterationName}|${stepCode}`;
    this.cache.set(cacheKey, {
      data: stepData,
      timestamp: Date.now()
    });

    this.lastRefreshTime = Date.now();
    return stepData;
  }

  /**
   * Start real-time synchronization polling
   */
  startPolling(migrationName, iterationName, stepCode, onUpdate) {
    if (this.isPolling) {
      console.log('⚠️ StepView: Polling already active');
      return;
    }

    console.log('🚀 StepView: Starting real-time synchronization');
    this.isPolling = true;

    this.pollingTimer = setInterval(async () => {
      try {
        // Only poll if the page is visible
        if (document.hidden) {
          return;
        }

        const stepData = await this.getStepData(migrationName, iterationName, stepCode, true);
        
        // Check if data has changed by comparing timestamp or key fields
        const currentHash = this.generateDataHash(stepData);
        const previousHash = this.cache.get('lastHash');
        
        if (currentHash !== previousHash) {
          console.log('📊 StepView: Data updated, refreshing UI');
          this.cache.set('lastHash', currentHash);
          onUpdate(stepData);
        }
      } catch (error) {
        console.error('❌ StepView polling error:', error);
        // Don't stop polling on error - might be temporary network issue
      }
    }, this.pollingInterval);
  }

  /**
   * Stop real-time synchronization polling
   */
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isPolling = false;
    console.log('🛑 StepView: Real-time synchronization stopped');
  }

  /**
   * Generate simple hash of critical data for change detection
   */
  generateDataHash(stepData) {
    if (!stepData || !stepData.stepSummary) {
      return '';
    }

    const critical = {
      status: stepData.stepSummary.Status,
      instructionCount: stepData.instructions?.length || 0,
      completedInstructions: stepData.instructions?.filter(i => i.IsCompleted)?.length || 0,
      commentCount: stepData.comments?.length || 0
    };

    return JSON.stringify(critical);
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 StepView: Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      isPolling: this.isPolling,
      lastRefresh: this.lastRefreshTime,
      ttl: this.cacheTTL,
      interval: this.pollingInterval
    };
  }
}

/**
 * StepView Search and Filtering System
 * 
 * Client-side search and filtering capabilities with localStorage persistence.
 * Provides real-time filtering of instructions, comments, and step data.
 */
class StepViewSearchFilter {
  constructor() {
    this.searchState = {
      query: '',
      statusFilter: 'all',
      teamFilter: 'all',
      completedFilter: 'all',
      dateRange: 'all'
    };
    
    this.loadFiltersFromStorage();
  }

  /**
   * Initialize search and filter UI
   */
  initializeSearchUI() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'step-search-container';
    searchContainer.innerHTML = this.getSearchHTML();

    // Insert after step header - using new class names
    const stepHeader = document.querySelector('.panel-header, .step-view-header');
    if (stepHeader) {
      stepHeader.insertAdjacentElement('afterend', searchContainer);
      this.attachSearchListeners();
    }
  }

  /**
   * Generate search and filter HTML
   */
  getSearchHTML() {
    return `
      <div class="search-filters-section" style="margin: 16px 0; padding: 16px; background: white !important; border-radius: 3px; color: #172B4D !important;">
        <div class="search-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; background: white !important; color: #172B4D !important;">
          <h4 style="margin: 0; color: #172B4D !important; background: white !important;">🔍 SEARCH & FILTERS</h4>
          <button id="toggle-filters" class="aui-button aui-button-subtle" type="button">
            <span class="filter-toggle-text">Show Filters</span>
          </button>
          <button id="clear-filters" class="aui-button aui-button-subtle" type="button">Clear All</button>
        </div>
        
        <div class="search-input-container" style="margin-bottom: 12px; background: white !important; color: #172B4D !important;">
          <input type="text" 
                 id="step-search-input" 
                 class="text" 
                 placeholder="Search instructions, comments, or step details..."
                 value="${this.searchState.query}"
                 style="width: 100%; max-width: 400px; background: white !important; background-color: white !important; color: black !important; border: 1px solid #ddd !important; padding: 8px 12px !important; border-radius: 3px !important; font-size: 14px !important;">
          <span class="search-results-count" style="margin-left: 12px; color: #6B778C; font-size: 14px; background: white !important;"></span>
        </div>
        
        <div id="advanced-filters" class="advanced-filters" style="display: none; gap: 16px; flex-wrap: wrap; background: white !important; color: #172B4D !important;">
          <div class="filter-group" style="background: white !important; color: #172B4D !important;">
            <label for="status-filter" style="display: block; margin-bottom: 4px; font-weight: 600; color: #172B4D !important; background: white !important;">Status:</label>
            <select id="status-filter" class="select">
              <option value="all">All Statuses</option>
              <option value="PENDING" ${this.searchState.statusFilter === 'PENDING' ? 'selected' : ''}>Pending</option>
              <option value="TODO" ${this.searchState.statusFilter === 'TODO' ? 'selected' : ''}>To Do</option>
              <option value="IN_PROGRESS" ${this.searchState.statusFilter === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
              <option value="COMPLETED" ${this.searchState.statusFilter === 'COMPLETED' ? 'selected' : ''}>Completed</option>
              <option value="BLOCKED" ${this.searchState.statusFilter === 'BLOCKED' ? 'selected' : ''}>Blocked</option>
              <option value="FAILED" ${this.searchState.statusFilter === 'FAILED' ? 'selected' : ''}>Failed</option>
            </select>
          </div>
          
          <div class="filter-group" style="background: white !important; color: #172B4D !important;">
            <label for="instruction-filter" style="display: block; margin-bottom: 4px; font-weight: 600; color: #172B4D !important; background: white !important;">Instructions:</label>
            <select id="instruction-filter" class="select">
              <option value="all" ${this.searchState.completedFilter === 'all' ? 'selected' : ''}>All Instructions</option>
              <option value="completed" ${this.searchState.completedFilter === 'completed' ? 'selected' : ''}>Completed Only</option>
              <option value="pending" ${this.searchState.completedFilter === 'pending' ? 'selected' : ''}>Pending Only</option>
            </select>
          </div>
          
          <div class="filter-group" style="background: white !important; color: #172B4D !important;">
            <label for="date-filter" style="display: block; margin-bottom: 4px; font-weight: 600; color: #172B4D !important; background: white !important;">Comments:</label>
            <select id="date-filter" class="select">
              <option value="all" ${this.searchState.dateRange === 'all' ? 'selected' : ''}>All Comments</option>
              <option value="today" ${this.searchState.dateRange === 'today' ? 'selected' : ''}>Today</option>
              <option value="week" ${this.searchState.dateRange === 'week' ? 'selected' : ''}>This Week</option>
              <option value="month" ${this.searchState.dateRange === 'month' ? 'selected' : ''}>This Month</option>
            </select>
          </div>
        </div>
        
        <div class="search-shortcuts" style="margin-top: 8px; font-size: 12px; color: #6B778C; background: white !important;">
          <strong style="background: white !important; color: #172B4D !important;">Quick Search:</strong>
          <button class="search-shortcut" data-query="TODO">Todo Items</button> |
          <button class="search-shortcut" data-query="completed">Completed</button> |
          <button class="search-shortcut" data-query="comment">Comments</button> |
          <button class="search-shortcut" data-query="error">Errors</button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to search elements
   */
  attachSearchListeners() {
    const searchInput = document.getElementById('step-search-input');
    const toggleFilters = document.getElementById('toggle-filters');
    const clearFilters = document.getElementById('clear-filters');
    const statusFilter = document.getElementById('status-filter');
    const instructionFilter = document.getElementById('instruction-filter');
    const dateFilter = document.getElementById('date-filter');
    const shortcuts = document.querySelectorAll('.search-shortcut');

    // Search input with debouncing
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchState.query = e.target.value.toLowerCase();
          this.performSearch();
          this.saveFiltersToStorage();
        }, 300);
      });
    }

    // Toggle advanced filters
    if (toggleFilters) {
      toggleFilters.addEventListener('click', () => {
        const advancedFilters = document.getElementById('advanced-filters');
        const toggleText = toggleFilters.querySelector('.filter-toggle-text');
        
        if (advancedFilters.style.display === 'none') {
          advancedFilters.style.display = 'flex';
          toggleText.textContent = 'Hide Filters';
        } else {
          advancedFilters.style.display = 'none';
          toggleText.textContent = 'Show Filters';
        }
      });
    }

    // Clear all filters
    if (clearFilters) {
      clearFilters.addEventListener('click', () => {
        this.resetFilters();
        this.performSearch();
      });
    }

    // Filter dropdowns
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.searchState.statusFilter = e.target.value;
        this.performSearch();
        this.saveFiltersToStorage();
      });
    }

    if (instructionFilter) {
      instructionFilter.addEventListener('change', (e) => {
        this.searchState.completedFilter = e.target.value;
        this.performSearch();
        this.saveFiltersToStorage();
      });
    }

    if (dateFilter) {
      dateFilter.addEventListener('change', (e) => {
        this.searchState.dateRange = e.target.value;
        this.performSearch();
        this.saveFiltersToStorage();
      });
    }

    // Quick search shortcuts
    shortcuts.forEach(shortcut => {
      shortcut.addEventListener('click', (e) => {
        const query = e.target.dataset.query;
        const searchInput = document.getElementById('step-search-input');
        if (searchInput) {
          searchInput.value = query;
          this.searchState.query = query.toLowerCase();
          this.performSearch();
          this.saveFiltersToStorage();
        }
      });
    });
  }

  /**
   * Perform search and filtering
   */
  performSearch() {
    const searchResults = {
      instructions: this.filterInstructions(),
      comments: this.filterComments(),
      summary: this.filterSummary()
    };

    // Apply visual filtering
    this.applyInstructionFiltering(searchResults.instructions);
    this.applyCommentFiltering(searchResults.comments);
    this.applySummaryFiltering(searchResults.summary);

    // Update search results count
    this.updateSearchResultsCount(searchResults);

    console.log('🔍 StepView Search: Applied filters', searchResults);
  }

  /**
   * Filter instructions based on current search state
   */
  filterInstructions() {
    const instructionRows = document.querySelectorAll('.instruction-row');
    const results = [];

    instructionRows.forEach((row, index) => {
      const instructionText = row.querySelector('.instruction-body')?.textContent?.toLowerCase() || '';
      const isCompleted = row.classList.contains('completed');
      
      let matches = true;

      // Text search
      if (this.searchState.query && !instructionText.includes(this.searchState.query)) {
        matches = false;
      }

      // Completion filter
      if (this.searchState.completedFilter === 'completed' && !isCompleted) {
        matches = false;
      } else if (this.searchState.completedFilter === 'pending' && isCompleted) {
        matches = false;
      }

      results.push({ element: row, matches, index });
    });

    return results;
  }

  /**
   * Filter comments based on current search state
   */
  filterComments() {
    const comments = document.querySelectorAll('.comment');
    const results = [];

    comments.forEach((comment, index) => {
      const commentText = comment.querySelector('.comment-body')?.textContent?.toLowerCase() || '';
      const authorText = comment.querySelector('.comment-author')?.textContent?.toLowerCase() || '';
      const timeElement = comment.querySelector('.comment-time');
      
      let matches = true;

      // Text search (search in both comment body and author)
      if (this.searchState.query) {
        const searchText = commentText + ' ' + authorText;
        if (!searchText.includes(this.searchState.query)) {
          matches = false;
        }
      }

      // Date filter
      if (this.searchState.dateRange !== 'all' && timeElement) {
        const commentTime = this.parseTimeAgo(timeElement.textContent);
        if (!this.isWithinDateRange(commentTime, this.searchState.dateRange)) {
          matches = false;
        }
      }

      results.push({ element: comment, matches, index });
    });

    return results;
  }

  /**
   * Filter summary information
   */
  filterSummary() {
    const summarySection = document.querySelector('.step-summary-section');
    if (!summarySection) return { element: null, matches: true };

    const summaryText = summarySection.textContent?.toLowerCase() || '';
    const currentStatus = document.querySelector('.step-status-container span')?.textContent?.toLowerCase() || '';
    
    let matches = true;

    // Text search
    if (this.searchState.query && !summaryText.includes(this.searchState.query)) {
      matches = false;
    }

    // Status filter
    if (this.searchState.statusFilter !== 'all' && 
        !currentStatus.includes(this.searchState.statusFilter.toLowerCase())) {
      matches = false;
    }

    return { element: summarySection, matches };
  }

  /**
   * Apply visual filtering to instructions
   */
  applyInstructionFiltering(results) {
    results.forEach(result => {
      if (result.matches) {
        result.element.style.display = '';
        result.element.classList.remove('filtered-out');
        
        // Highlight search terms
        if (this.searchState.query) {
          this.highlightSearchTerm(result.element.querySelector('.instruction-body'), this.searchState.query);
        } else {
          this.removeHighlights(result.element.querySelector('.instruction-body'));
        }
      } else {
        result.element.style.display = 'none';
        result.element.classList.add('filtered-out');
      }
    });

    // Show/hide instructions table
    const instructionsSection = document.querySelector('.instructions-section');
    const visibleInstructions = results.filter(r => r.matches).length;
    
    if (visibleInstructions === 0 && this.searchState.query) {
      this.showNoResultsMessage(instructionsSection, 'instructions');
    } else {
      this.removeNoResultsMessage(instructionsSection);
    }
  }

  /**
   * Apply visual filtering to comments
   */
  applyCommentFiltering(results) {
    results.forEach(result => {
      if (result.matches) {
        result.element.style.display = '';
        result.element.classList.remove('filtered-out');
        
        // Highlight search terms
        if (this.searchState.query) {
          this.highlightSearchTerm(result.element.querySelector('.comment-body'), this.searchState.query);
          this.highlightSearchTerm(result.element.querySelector('.comment-author'), this.searchState.query);
        } else {
          this.removeHighlights(result.element.querySelector('.comment-body'));
          this.removeHighlights(result.element.querySelector('.comment-author'));
        }
      } else {
        result.element.style.display = 'none';
        result.element.classList.add('filtered-out');
      }
    });

    // Update comment count display
    const commentsHeader = document.querySelector('.comments-section h3');
    const visibleComments = results.filter(r => r.matches).length;
    const totalComments = results.length;
    
    if (commentsHeader) {
      if (visibleComments < totalComments) {
        commentsHeader.textContent = `💬 COMMENTS (${visibleComments}/${totalComments})`;
      } else {
        commentsHeader.textContent = `💬 COMMENTS (${totalComments})`;
      }
    }
  }

  /**
   * Apply visual filtering to summary
   */
  applySummaryFiltering(result) {
    if (!result.element) return;

    if (result.matches) {
      result.element.style.display = '';
      result.element.classList.remove('filtered-out');
      
      // Highlight search terms in summary
      if (this.searchState.query) {
        const textElements = result.element.querySelectorAll('td, th');
        textElements.forEach(el => {
          if (el.textContent.toLowerCase().includes(this.searchState.query)) {
            this.highlightSearchTerm(el, this.searchState.query);
          }
        });
      } else {
        const textElements = result.element.querySelectorAll('td, th');
        textElements.forEach(el => this.removeHighlights(el));
      }
    } else {
      result.element.style.opacity = '0.3';
      result.element.classList.add('filtered-out');
    }
  }

  /**
   * Highlight search terms in text
   */
  highlightSearchTerm(element, searchTerm) {
    if (!element || !searchTerm) return;

    // Remove existing highlights
    this.removeHighlights(element);

    const text = element.textContent;
    const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
    const highlightedText = text.replace(regex, '<mark style="background: #fff2cc; padding: 1px 2px;">$1</mark>');
    
    if (highlightedText !== text) {
      element.innerHTML = highlightedText;
    }
  }

  /**
   * Remove search highlights
   */
  removeHighlights(element) {
    if (!element) return;
    
    const marks = element.querySelectorAll('mark');
    marks.forEach(mark => {
      mark.outerHTML = mark.textContent;
    });
  }

  /**
   * Show no results message
   */
  showNoResultsMessage(container, type) {
    if (!container) return;

    this.removeNoResultsMessage(container);
    
    const noResultsDiv = document.createElement('div');
    noResultsDiv.className = 'no-search-results';
    noResultsDiv.innerHTML = `
      <p style="padding: 16px; color: #6B778C; font-style: italic; text-align: center;">
        No ${type} match your search criteria. Try adjusting your filters or search terms.
      </p>
    `;
    
    container.appendChild(noResultsDiv);
  }

  /**
   * Remove no results message
   */
  removeNoResultsMessage(container) {
    if (!container) return;
    
    const existingMessage = container.querySelector('.no-search-results');
    if (existingMessage) {
      existingMessage.remove();
    }
  }

  /**
   * Update search results count display
   */
  updateSearchResultsCount(results) {
    const countElement = document.querySelector('.search-results-count');
    if (!countElement) return;

    const visibleInstructions = results.instructions.filter(r => r.matches).length;
    const totalInstructions = results.instructions.length;
    const visibleComments = results.comments.filter(r => r.matches).length;
    const totalComments = results.comments.length;

    if (this.searchState.query || this.hasActiveFilters()) {
      const parts = [];
      
      if (totalInstructions > 0) {
        parts.push(`${visibleInstructions}/${totalInstructions} instructions`);
      }
      
      if (totalComments > 0) {
        parts.push(`${visibleComments}/${totalComments} comments`);
      }

      countElement.textContent = parts.length > 0 ? `Found: ${parts.join(', ')}` : '';
    } else {
      countElement.textContent = '';
    }
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters() {
    return this.searchState.statusFilter !== 'all' || 
           this.searchState.completedFilter !== 'all' || 
           this.searchState.dateRange !== 'all';
  }

  /**
   * Reset all filters
   */
  resetFilters() {
    this.searchState = {
      query: '',
      statusFilter: 'all',
      teamFilter: 'all',
      completedFilter: 'all',
      dateRange: 'all'
    };

    // Reset UI elements
    const searchInput = document.getElementById('step-search-input');
    const statusFilter = document.getElementById('status-filter');
    const instructionFilter = document.getElementById('instruction-filter');
    const dateFilter = document.getElementById('date-filter');

    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'all';
    if (instructionFilter) instructionFilter.value = 'all';
    if (dateFilter) dateFilter.value = 'all';

    this.saveFiltersToStorage();
  }

  /**
   * Parse relative time strings (e.g., "2 hours ago")
   */
  parseTimeAgo(timeString) {
    const now = new Date();
    
    if (timeString.includes('just now')) {
      return now;
    }
    
    const match = timeString.match(/(\d+)\s+(minute|hour|day|week)s?\s+ago/);
    if (!match) return now;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const result = new Date(now);
    
    switch (unit) {
      case 'minute':
        result.setMinutes(result.getMinutes() - value);
        break;
      case 'hour':
        result.setHours(result.getHours() - value);
        break;
      case 'day':
        result.setDate(result.getDate() - value);
        break;
      case 'week':
        result.setDate(result.getDate() - (value * 7));
        break;
    }
    
    return result;
  }

  /**
   * Check if a date is within the specified range
   */
  isWithinDateRange(date, range) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case 'today':
        return date >= today;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return date >= monthAgo;
      default:
        return true;
    }
  }

  /**
   * Save filters to localStorage
   */
  saveFiltersToStorage() {
    try {
      localStorage.setItem('umig-stepview-filters', JSON.stringify(this.searchState));
    } catch (error) {
      console.warn('Failed to save search filters to localStorage:', error);
    }
  }

  /**
   * Load filters from localStorage
   */
  loadFiltersFromStorage() {
    try {
      const saved = localStorage.getItem('umig-stepview-filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.searchState = { ...this.searchState, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load search filters from localStorage:', error);
    }
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Clear search and show all items
   */
  clearSearch() {
    this.resetFilters();
    this.performSearch();
  }
}

/**
 * StepView PILOT User Features
 * 
 * Advanced features for PILOT and ADMIN users including bulk operations,
 * advanced controls, and enhanced security validation.
 */
class StepViewPilotFeatures {
  constructor(stepView) {
    this.stepView = stepView;
    this.selectedInstructions = new Set();
    this.bulkOperationsEnabled = false;
  }

  /**
   * Initialize PILOT user features if user has appropriate role
   */
  initializePilotFeatures() {
    const userRole = this.stepView.userRole;
    
    if (!['PILOT', 'ADMIN'].includes(userRole)) {
      console.log('🔒 StepView: PILOT features disabled for user role:', userRole);
      return;
    }

    console.log('🚁 StepView: Initializing PILOT features for role:', userRole);
    
    // Add bulk operations UI
    this.addBulkOperationsUI();
    
    // Add advanced controls
    this.addAdvancedControls();
    
    // Add keyboard shortcuts
    this.addKeyboardShortcuts();
    
    // Add debug information panel
    if (userRole === 'ADMIN') {
      this.addDebugPanel();
    }
  }

  /**
   * Add bulk operations interface
   */
  addBulkOperationsUI() {
    const instructionsSection = document.querySelector('.instructions-section');
    if (!instructionsSection) return;

    // Create bulk operations toolbar
    const bulkToolbar = document.createElement('div');
    bulkToolbar.className = 'pilot-bulk-toolbar';
    bulkToolbar.innerHTML = `
      <div class="bulk-toolbar-content" style="display: none; padding: 12px; background: #e8f4fd; border: 1px solid #0052cc; border-radius: 4px; margin-bottom: 16px;">
        <div class="bulk-toolbar-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <h5 style="margin: 0; color: #0052cc; font-weight: 600;">🚁 PILOT Bulk Operations</h5>
          <div class="selection-count" style="font-size: 12px; color: #6B778C;">
            <span id="selected-count">0</span> instructions selected
          </div>
        </div>
        
        <div class="bulk-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="aui-button aui-button-subtle" id="bulk-complete-btn" disabled>
            ✓ Mark Complete
          </button>
          <button type="button" class="aui-button aui-button-subtle" id="bulk-incomplete-btn" disabled>
            ↶ Mark Incomplete
          </button>
          <button type="button" class="aui-button aui-button-subtle" id="bulk-duplicate-btn" disabled>
            📋 Duplicate Instructions
          </button>
          <button type="button" class="aui-button aui-button-subtle" id="bulk-export-btn" disabled>
            📤 Export Selected
          </button>
          <div style="margin-left: auto;">
            <button type="button" class="aui-button" id="bulk-select-all">Select All</button>
            <button type="button" class="aui-button" id="bulk-clear-selection">Clear</button>
          </div>
        </div>
        
        <div class="bulk-progress" id="bulk-progress" style="display: none; margin-top: 8px;">
          <div class="progress-bar" style="width: 100%; height: 4px; background: #f0f1f2; border-radius: 2px;">
            <div class="progress-fill" style="height: 100%; background: #0052cc; border-radius: 2px; width: 0%; transition: width 0.3s;"></div>
          </div>
          <div class="progress-text" style="font-size: 12px; margin-top: 4px; color: #6B778C;">
            Processing... <span id="progress-details"></span>
          </div>
        </div>
      </div>
    `;

    // Insert bulk toolbar before instructions table
    const instructionsTable = instructionsSection.querySelector('table.aui');
    if (instructionsTable) {
      instructionsTable.parentNode.insertBefore(bulkToolbar, instructionsTable);
    }

    // Add enable bulk operations toggle
    const enableBulkBtn = document.createElement('button');
    enableBulkBtn.className = 'aui-button aui-button-primary pilot-only';
    enableBulkBtn.textContent = '🚁 Enable Bulk Operations';
    enableBulkBtn.id = 'enable-bulk-operations';
    enableBulkBtn.style.marginBottom = '12px';
    
    instructionsSection.insertBefore(enableBulkBtn, bulkToolbar);

    // Attach event listeners
    this.attachBulkOperationListeners();
  }

  /**
   * Add advanced controls for PILOT users
   */
  addAdvancedControls() {
    const stepHeader = document.querySelector('.panel-header, .step-view-header');
    if (!stepHeader) return;

    // Add advanced controls panel
    const advancedControls = document.createElement('div');
    advancedControls.className = 'pilot-advanced-controls';
    advancedControls.innerHTML = `
      <div class="advanced-controls-panel pilot-only" style="margin-top: 12px; padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
        <h5 style="margin: 0 0 8px 0; color: #856404;">⚙️ Advanced Controls</h5>
        <div class="control-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="aui-button aui-button-subtle" id="refresh-step-data">
            🔄 Force Refresh
          </button>
          <button type="button" class="aui-button aui-button-subtle" id="export-step-data">
            📊 Export Step Data
          </button>
          <button type="button" class="aui-button aui-button-subtle" id="clone-step">
            📋 Clone Step
          </button>
          <button type="button" class="aui-button aui-button-subtle" id="step-history">
            📈 View History
          </button>
          <button type="button" class="aui-button aui-button-subtle admin-only" id="edit-step-metadata">
            ⚙️ Edit Metadata
          </button>
        </div>
      </div>
    `;

    stepHeader.appendChild(advancedControls);

    // Attach event listeners
    this.attachAdvancedControlListeners();
  }

  /**
   * Add keyboard shortcuts for power users
   */
  addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when not in input fields
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        return;
      }

      // Ctrl/Cmd + shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            this.selectAllInstructions();
            break;
          case 'r':
            e.preventDefault();
            this.forceRefreshData();
            break;
          case 'e':
            e.preventDefault();
            this.exportStepData();
            break;
          case 'f':
            e.preventDefault();
            this.focusSearchInput();
            break;
        }
      }

      // Other shortcuts
      switch (e.key) {
        case 'Escape':
          this.clearSelection();
          this.closeModals();
          break;
      }
    });

    // Show keyboard shortcuts help
    this.addKeyboardShortcutsHelp();
  }

  /**
   * Add debug panel for ADMIN users
   */
  addDebugPanel() {
    const debugPanel = document.createElement('div');
    debugPanel.className = 'admin-debug-panel';
    debugPanel.innerHTML = `
      <div class="debug-panel admin-only" style="position: fixed; bottom: 20px; right: 20px; width: 300px; background: #1e1e1e; color: #fff; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 11px; z-index: 8888; max-height: 200px; overflow-y: auto;">
        <div class="debug-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 600;">🔧 Debug Panel</span>
          <button id="close-debug-panel" style="background: none; border: none; color: #fff; cursor: pointer;">✕</button>
        </div>
        <div class="debug-content">
          <div class="debug-item">Cache Status: <span id="debug-cache-status">Loading...</span></div>
          <div class="debug-item">Polling: <span id="debug-polling-status">Loading...</span></div>
          <div class="debug-item">Last Sync: <span id="debug-last-sync">Loading...</span></div>
          <div class="debug-item">User Role: <span id="debug-user-role">${this.stepView.userRole}</span></div>
          <div class="debug-item">Step ID: <span id="debug-step-id">${this.stepView.currentStepInstanceId || 'None'}</span></div>
          <div class="debug-item">Selection: <span id="debug-selection-count">0 items</span></div>
        </div>
      </div>
    `;

    document.body.appendChild(debugPanel);

    // Update debug info periodically
    setInterval(() => {
      this.updateDebugInfo();
    }, 2000);

    // Close debug panel listener
    document.getElementById('close-debug-panel')?.addEventListener('click', () => {
      debugPanel.remove();
    });
  }

  /**
   * Attach event listeners for bulk operations
   */
  attachBulkOperationListeners() {
    // Enable bulk operations toggle
    document.getElementById('enable-bulk-operations')?.addEventListener('click', () => {
      this.toggleBulkOperations();
    });

    // Bulk action buttons
    document.getElementById('bulk-complete-btn')?.addEventListener('click', () => {
      this.performBulkOperation('complete');
    });

    document.getElementById('bulk-incomplete-btn')?.addEventListener('click', () => {
      this.performBulkOperation('incomplete');
    });

    document.getElementById('bulk-duplicate-btn')?.addEventListener('click', () => {
      this.performBulkOperation('duplicate');
    });

    document.getElementById('bulk-export-btn')?.addEventListener('click', () => {
      this.performBulkOperation('export');
    });

    // Selection controls
    document.getElementById('bulk-select-all')?.addEventListener('click', () => {
      this.selectAllInstructions();
    });

    document.getElementById('bulk-clear-selection')?.addEventListener('click', () => {
      this.clearSelection();
    });
  }

  /**
   * Attach event listeners for advanced controls
   */
  attachAdvancedControlListeners() {
    document.getElementById('refresh-step-data')?.addEventListener('click', () => {
      this.forceRefreshData();
    });

    document.getElementById('export-step-data')?.addEventListener('click', () => {
      this.exportStepData();
    });

    document.getElementById('clone-step')?.addEventListener('click', () => {
      this.cloneStep();
    });

    document.getElementById('step-history')?.addEventListener('click', () => {
      this.showStepHistory();
    });

    document.getElementById('edit-step-metadata')?.addEventListener('click', () => {
      this.editStepMetadata();
    });
  }

  /**
   * Toggle bulk operations mode
   */
  toggleBulkOperations() {
    this.bulkOperationsEnabled = !this.bulkOperationsEnabled;
    const toggleBtn = document.getElementById('enable-bulk-operations');
    const bulkToolbar = document.querySelector('.bulk-toolbar-content');

    if (this.bulkOperationsEnabled) {
      toggleBtn.textContent = '❌ Disable Bulk Operations';
      toggleBtn.className = 'aui-button pilot-only';
      bulkToolbar.style.display = 'block';
      
      // Add checkboxes to instruction rows
      this.addInstructionCheckboxes();
      
      this.stepView.showNotification('Bulk operations enabled', 'info');
    } else {
      toggleBtn.textContent = '🚁 Enable Bulk Operations';
      toggleBtn.className = 'aui-button aui-button-primary pilot-only';
      bulkToolbar.style.display = 'none';
      
      // Remove checkboxes
      this.removeInstructionCheckboxes();
      this.clearSelection();
      
      this.stepView.showNotification('Bulk operations disabled', 'info');
    }
  }

  /**
   * Add checkboxes to instruction rows for bulk selection
   */
  addInstructionCheckboxes() {
    const instructionRows = document.querySelectorAll('.instruction-row');
    
    instructionRows.forEach(row => {
      const instructionId = row.querySelector('.instruction-checkbox')?.dataset?.instructionId;
      if (!instructionId) return;

      // Don't add if checkbox already exists
      if (row.querySelector('.bulk-selection-checkbox')) return;

      const bulkCheckbox = document.createElement('input');
      bulkCheckbox.type = 'checkbox';
      bulkCheckbox.className = 'bulk-selection-checkbox';
      bulkCheckbox.dataset.instructionId = instructionId;
      bulkCheckbox.style.marginRight = '8px';

      // Insert at the beginning of the row
      const firstCell = row.querySelector('td');
      if (firstCell) {
        firstCell.insertBefore(bulkCheckbox, firstCell.firstChild);
      }

      // Add change listener
      bulkCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedInstructions.add(instructionId);
          row.classList.add('bulk-selected');
        } else {
          this.selectedInstructions.delete(instructionId);
          row.classList.remove('bulk-selected');
        }
        this.updateBulkSelectionUI();
      });
    });
  }

  /**
   * Remove bulk selection checkboxes
   */
  removeInstructionCheckboxes() {
    document.querySelectorAll('.bulk-selection-checkbox').forEach(checkbox => {
      checkbox.remove();
    });
    
    document.querySelectorAll('.instruction-row').forEach(row => {
      row.classList.remove('bulk-selected');
    });
  }

  /**
   * Select all instructions for bulk operations
   */
  selectAllInstructions() {
    if (!this.bulkOperationsEnabled) return;

    const checkboxes = document.querySelectorAll('.bulk-selection-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
      const instructionId = checkbox.dataset.instructionId;
      this.selectedInstructions.add(instructionId);
      checkbox.closest('.instruction-row')?.classList.add('bulk-selected');
    });

    this.updateBulkSelectionUI();
    this.stepView.showNotification('All instructions selected', 'info');
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.selectedInstructions.clear();
    
    document.querySelectorAll('.bulk-selection-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    document.querySelectorAll('.instruction-row').forEach(row => {
      row.classList.remove('bulk-selected');
    });

    this.updateBulkSelectionUI();
  }

  /**
   * Update bulk selection UI based on current selection
   */
  updateBulkSelectionUI() {
    const selectedCount = this.selectedInstructions.size;
    const countElement = document.getElementById('selected-count');
    const bulkButtons = document.querySelectorAll('#bulk-complete-btn, #bulk-incomplete-btn, #bulk-duplicate-btn, #bulk-export-btn');

    if (countElement) {
      countElement.textContent = selectedCount.toString();
    }

    // Enable/disable bulk action buttons
    bulkButtons.forEach(btn => {
      btn.disabled = selectedCount === 0;
    });

    // Update debug panel if exists
    const debugSelection = document.getElementById('debug-selection-count');
    if (debugSelection) {
      debugSelection.textContent = `${selectedCount} items`;
    }
  }

  /**
   * Perform bulk operation with security validation
   */
  async performBulkOperation(operation) {
    if (this.selectedInstructions.size === 0) {
      this.stepView.showNotification('No instructions selected', 'warning');
      return;
    }

    // Security confirmation for destructive operations
    if (['duplicate', 'complete'].includes(operation)) {
      const confirmed = await this.showSecurityConfirmation(operation, this.selectedInstructions.size);
      if (!confirmed) return;
    }

    this.showBulkProgress(true);
    
    try {
      switch (operation) {
        case 'complete':
          await this.bulkCompleteInstructions();
          break;
        case 'incomplete':
          await this.bulkIncompleteInstructions();
          break;
        case 'duplicate':
          await this.bulkDuplicateInstructions();
          break;
        case 'export':
          await this.bulkExportInstructions();
          break;
      }
      
      this.stepView.showNotification(`Bulk ${operation} completed successfully`, 'success');
      
      // Refresh step data to reflect changes
      await this.forceRefreshData();
      
    } catch (error) {
      console.error(`Bulk ${operation} failed:`, error);
      this.stepView.showNotification(`Bulk ${operation} failed: ${error.message}`, 'error');
    } finally {
      this.showBulkProgress(false);
    }
  }

  /**
   * Show security confirmation dialog
   */
  showSecurityConfirmation(operation, count) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'security-confirmation-modal';
      modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 24px; border-radius: 8px; max-width: 400px; width: 90%;">
            <h3 style="margin: 0 0 12px 0; color: #d04437;">🔒 Security Confirmation Required</h3>
            <p style="margin-bottom: 16px;">
              You are about to perform a <strong>${operation}</strong> operation on <strong>${count}</strong> instructions.
              This action cannot be undone.
            </p>
            <div style="background: #fff2cc; padding: 12px; border-radius: 4px; margin-bottom: 16px; font-size: 14px;">
              ⚠️ As a PILOT user, you have elevated permissions. Please confirm this action is intentional.
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
              <button class="aui-button" id="security-cancel">Cancel</button>
              <button class="aui-button aui-button-primary" id="security-confirm">Confirm ${operation}</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Event listeners
      modal.querySelector('#security-cancel').addEventListener('click', () => {
        modal.remove();
        resolve(false);
      });

      modal.querySelector('#security-confirm').addEventListener('click', () => {
        modal.remove();
        resolve(true);
      });

      // ESC key closes modal
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', handleEsc);
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleEsc);
    });
  }

  /**
   * Show/hide bulk operation progress
   */
  showBulkProgress(show, details = '') {
    const progressDiv = document.getElementById('bulk-progress');
    const detailsSpan = document.getElementById('progress-details');
    
    if (progressDiv) {
      progressDiv.style.display = show ? 'block' : 'none';
    }
    
    if (detailsSpan && details) {
      detailsSpan.textContent = details;
    }
  }

  /**
   * Bulk complete instructions
   */
  async bulkCompleteInstructions() {
    const promises = Array.from(this.selectedInstructions).map(async (instructionId, index) => {
      this.showBulkProgress(true, `Completing ${index + 1}/${this.selectedInstructions.size}`);
      
      return this.stepView.completeInstruction(this.stepView.currentStepInstanceId, instructionId);
    });

    await Promise.allSettled(promises);
  }

  /**
   * Bulk incomplete instructions
   */
  async bulkIncompleteInstructions() {
    const promises = Array.from(this.selectedInstructions).map(async (instructionId, index) => {
      this.showBulkProgress(true, `Reverting ${index + 1}/${this.selectedInstructions.size}`);
      
      return this.stepView.uncompleteInstruction(this.stepView.currentStepInstanceId, instructionId);
    });

    await Promise.allSettled(promises);
  }

  /**
   * Export step data (enhanced for PILOT users)
   */
  async exportStepData() {
    try {
      const stepData = {
        stepSummary: this.getStepSummaryData(),
        instructions: this.getInstructionsData(),
        comments: this.getCommentsData(),
        metadata: {
          exportedBy: this.stepView.userId,
          exportedAt: new Date().toISOString(),
          userRole: this.stepView.userRole,
          cacheStats: this.stepView.cache.getCacheStats()
        }
      };

      const dataStr = JSON.stringify(stepData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `step-${this.stepView.currentStepCode}-${Date.now()}.json`;
      link.click();
      
      this.stepView.showNotification('Step data exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.stepView.showNotification('Export failed', 'error');
    }
  }

  /**
   * Force refresh step data
   */
  async forceRefreshData() {
    try {
      this.stepView.cache.clearCache();
      
      const container = document.querySelector(".step-details-panel");
      if (container && this.stepView.currentMigration && this.stepView.currentIteration && this.stepView.currentStepCode) {
        await this.stepView.loadStepDetails(
          this.stepView.currentMigration, 
          this.stepView.currentIteration, 
          this.stepView.currentStepCode, 
          container
        );
        
        // Re-initialize PILOT features
        this.initializePilotFeatures();
      }
      
      this.stepView.showNotification('Step data refreshed', 'success');
    } catch (error) {
      console.error('Refresh failed:', error);
      this.stepView.showNotification('Refresh failed', 'error');
    }
  }

  /**
   * Get step summary data for export
   */
  getStepSummaryData() {
    const summary = {};
    const summaryTable = document.querySelector('.step-summary-section table.aui tbody');
    
    if (summaryTable) {
      summaryTable.querySelectorAll('tr').forEach(row => {
        const th = row.querySelector('th');
        const td = row.querySelector('td');
        if (th && td) {
          summary[th.textContent.trim()] = td.textContent.trim();
        }
      });
    }
    
    return summary;
  }

  /**
   * Get instructions data for export
   */
  getInstructionsData() {
    const instructions = [];
    const instructionRows = document.querySelectorAll('.instruction-row');
    
    instructionRows.forEach(row => {
      const checkbox = row.querySelector('.instruction-checkbox');
      const order = row.querySelector('.instruction-order')?.textContent?.trim();
      const body = row.querySelector('.instruction-body')?.textContent?.trim();
      const duration = row.querySelector('.instruction-duration')?.textContent?.trim();
      
      if (checkbox && body) {
        instructions.push({
          id: checkbox.dataset.instructionId,
          order: order,
          description: body,
          duration: duration,
          completed: checkbox.checked,
          selected: this.selectedInstructions.has(checkbox.dataset.instructionId)
        });
      }
    });
    
    return instructions;
  }

  /**
   * Get comments data for export
   */
  getCommentsData() {
    const comments = [];
    const commentElements = document.querySelectorAll('.comment');
    
    commentElements.forEach(comment => {
      const author = comment.querySelector('.comment-author')?.textContent?.trim();
      const time = comment.querySelector('.comment-time')?.textContent?.trim();
      const body = comment.querySelector('.comment-body')?.textContent?.trim();
      const commentId = comment.dataset.commentId;
      
      if (author && body) {
        comments.push({
          id: commentId,
          author: author,
          time: time,
          body: body
        });
      }
    });
    
    return comments;
  }

  /**
   * Update debug information
   */
  updateDebugInfo() {
    const cacheStatus = document.getElementById('debug-cache-status');
    const pollingStatus = document.getElementById('debug-polling-status');
    const lastSync = document.getElementById('debug-last-sync');
    
    if (cacheStatus && this.stepView.cache) {
      const stats = this.stepView.cache.getCacheStats();
      cacheStatus.textContent = `${stats.size} items, TTL: ${stats.ttl}ms`;
    }
    
    if (pollingStatus && this.stepView.cache) {
      const stats = this.stepView.cache.getCacheStats();
      pollingStatus.textContent = stats.isPolling ? `Active (${stats.interval}ms)` : 'Inactive';
    }
    
    if (lastSync && this.stepView.cache) {
      const stats = this.stepView.cache.getCacheStats();
      if (stats.lastRefresh) {
        const ago = Date.now() - stats.lastRefresh;
        lastSync.textContent = `${Math.round(ago / 1000)}s ago`;
      } else {
        lastSync.textContent = 'Never';
      }
    }
  }

  /**
   * Add keyboard shortcuts help
   */
  addKeyboardShortcutsHelp() {
    const helpButton = document.createElement('button');
    helpButton.className = 'aui-button aui-button-subtle pilot-only';
    helpButton.textContent = '⌨️ Shortcuts';
    helpButton.style.position = 'fixed';
    helpButton.style.bottom = '80px';
    helpButton.style.right = '20px';
    helpButton.style.zIndex = '8887';

    helpButton.addEventListener('click', () => {
      this.showKeyboardShortcuts();
    });

    document.body.appendChild(helpButton);
  }

  /**
   * Show keyboard shortcuts modal
   */
  showKeyboardShortcuts() {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 24px; border-radius: 8px; max-width: 500px; width: 90%; max-height: 70vh; overflow-y: auto;">
          <h3 style="margin: 0 0 16px 0;">⌨️ Keyboard Shortcuts</h3>
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px 16px; font-size: 14px;">
            <strong>Ctrl/Cmd + A</strong><span>Select all instructions</span>
            <strong>Ctrl/Cmd + R</strong><span>Force refresh data</span>
            <strong>Ctrl/Cmd + E</strong><span>Export step data</span>
            <strong>Ctrl/Cmd + F</strong><span>Focus search input</span>
            <strong>Escape</strong><span>Clear selection / Close modals</span>
          </div>
          <div style="margin-top: 20px; text-align: right;">
            <button class="aui-button aui-button-primary" id="close-shortcuts">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#close-shortcuts').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal.firstElementChild.parentElement) {
        modal.remove();
      }
    });
  }

  /**
   * Focus search input for keyboard navigation
   */
  focusSearchInput() {
    const searchInput = document.getElementById('step-search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  /**
   * Close all modals
   */
  closeModals() {
    document.querySelectorAll('[style*="position: fixed"]').forEach(modal => {
      if (modal.style.zIndex >= '10000') {
        modal.remove();
      }
    });
  }

  /**
   * Placeholder methods for future implementation
   */
  async bulkDuplicateInstructions() {
    this.stepView.showNotification('Bulk duplicate functionality coming soon', 'info');
  }

  async bulkExportInstructions() {
    const selectedData = this.getInstructionsData().filter(inst => 
      this.selectedInstructions.has(inst.id)
    );
    
    const dataStr = JSON.stringify(selectedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `selected-instructions-${Date.now()}.json`;
    link.click();
  }

  cloneStep() {
    this.stepView.showNotification('Clone step functionality coming soon', 'info');
  }

  showStepHistory() {
    this.stepView.showNotification('Step history functionality coming soon', 'info');
  }

  editStepMetadata() {
    this.stepView.showNotification('Edit metadata functionality coming soon', 'info');
  }
}

class StepView {
  constructor() {
    this.config = window.UMIG_STEP_CONFIG || {
      api: { baseUrl: "/rest/scriptrunner/latest/custom" },
    };
    this.currentStepInstanceId = null;
    this.userRole = this.config.user?.role || "NORMAL";
    this.isAdmin = this.config.user?.isAdmin || false;
    this.userId = this.config.user?.id || null;
    
    // Initialize cache system for real-time synchronization
    this.cache = new StepViewCache();
    this.currentMigration = null;
    this.currentIteration = null;
    this.currentStepCode = null;
    
    // Initialize search and filtering system
    this.searchFilter = new StepViewSearchFilter();

    // Initialize on DOM ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  async init() {
    const params = new URLSearchParams(window.location.search);
    const migrationName = params.get("mig");
    const iterationName = params.get("ite");
    const stepId = params.get("stepid");
    const container = document.getElementById("umig-step-view-root");

    if (!container) {
      console.error("Step View: Container #umig-step-view-root not found");
      return;
    }

    // Validate required parameters
    const missingParams = [];
    if (!migrationName) missingParams.push("mig (migration name)");
    if (!iterationName) missingParams.push("ite (iteration name)");
    if (!stepId) missingParams.push("stepid (step code)");

    if (missingParams.length > 0) {
      container.innerHTML = `
                <div class="aui-message aui-message-warning">
                    <span class="aui-icon icon-warning"></span>
                    <p>Missing required URL parameters: ${missingParams.join(", ")}</p>
                    <p>Example: ?mig=migrationa&ite=run1&stepid=DEC-001</p>
                </div>
            `;
      return;
    }

    // Store current context
    this.currentMigration = migrationName;
    this.currentIteration = iterationName;
    this.currentStepCode = stepId;

    // Add the step-details-panel class to the container for styling
    container.classList.add('step-details-panel');

    // Load step details with caching
    await this.loadStepDetails(migrationName, iterationName, stepId, container);
    
    // Start real-time synchronization
    this.startRealTimeSync();
    
    // Add cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  async loadStepDetails(migrationName, iterationName, stepCode, container) {
    try {
      // Show loading state
      container.innerHTML = `
                <div class="aui-message aui-message-info">
                    <span class="aui-icon icon-info"></span>
                    <p>Loading step details for ${this.escapeHtml(stepCode)} in ${this.escapeHtml(migrationName)}/${this.escapeHtml(iterationName)}...</p>
                </div>
            `;

      // Use cache system to get step data
      const stepData = await this.cache.getStepData(migrationName, iterationName, stepCode);

      if (stepData.error) {
        throw new Error(stepData.error);
      }

      // Store the step instance ID
      if (stepData.stepSummary?.ID) {
        this.currentStepInstanceId = stepData.stepSummary.ID;
      }

      // Render the step view
      this.renderStepView(stepData, container);
    } catch (error) {
      console.error("Error loading step details:", error);
      container.innerHTML = `
                <div class="aui-message aui-message-error">
                    <span class="aui-icon icon-error"></span>
                    <p>Failed to load step details: ${this.escapeHtml(error.message)}</p>
                </div>
            `;
    }
  }

  /**
   * Start real-time synchronization with intelligent polling
   */
  startRealTimeSync() {
    if (!this.currentMigration || !this.currentIteration || !this.currentStepCode) {
      console.warn('⚠️ StepView: Cannot start sync - missing context parameters');
      return;
    }

    console.log('🚀 StepView: Starting real-time synchronization');
    
    this.cache.startPolling(
      this.currentMigration,
      this.currentIteration,
      this.currentStepCode,
      (updatedData) => {
        console.log('📊 StepView: Received real-time update');
        
        // Update UI with fresh data
        const container = document.querySelector(".step-details-panel");
        if (container) {
          this.renderStepView(updatedData, container);
          
          // Show subtle notification about update
          this.showNotification("Step data updated", "info");
        }
      }
    );
  }

  /**
   * Clean up resources and stop polling
   */
  cleanup() {
    if (this.cache) {
      this.cache.stopPolling();
      console.log('🧹 StepView: Cleanup completed');
    }
  }

  renderStepView(stepData, container) {
    const summary = stepData.stepSummary || {};
    const instructions = stepData.instructions || [];
    const impactedTeams = stepData.impactedTeams || [];
    const comments = stepData.comments || [];

    let html = `
            <div class="panel-header" style="background-color: white !important; color: #172B4D !important;">
                <div class="step-header-content" style="background-color: white !important; color: #172B4D !important;">
                    <div class="step-title-row" style="background-color: white !important; color: #172B4D !important;">
                        <h2 class="step-name" style="background-color: white !important; color: #172B4D !important;">
                            <span class="step-code" style="background-color: white !important; color: #172B4D !important;">📋 ${this.escapeHtml(summary.StepCode || "Unknown")}</span>
                            <span class="step-title-text" style="background-color: white !important; color: #172B4D !important;">${this.escapeHtml(summary.Name || "Unknown Step")}</span>
                        </h2>
                        ${this.createStatusBadge(summary.StatusID || "21")}
                    </div>
                    <div class="step-meta" style="background-color: white !important; color: #172B4D !important;">
                        <span class="step-owner" style="background-color: white !important; color: #172B4D !important;">${summary.AssignedTeamName ? '👥 ' + this.escapeHtml(summary.AssignedTeamName) : '👤 No team assigned'}</span>
                        <span class="step-timing" style="background-color: white !important; color: #172B4D !important;">⏱️ ${summary.Duration ? this.escapeHtml(summary.Duration) + ' minute' + (summary.Duration != 1 ? 's' : '') : 'No duration specified'}</span>
                    </div>
                </div>
                <div class="step-breadcrumb" style="background-color: white !important; color: #172B4D !important;">
                    <span class="breadcrumb-item" style="background-color: white !important; color: #172B4D !important;">${this.escapeHtml(summary.MigrationName || "Migration")}</span>
                    <span class="breadcrumb-separator" style="background-color: white !important; color: #172B4D !important;">›</span>
                    <span class="breadcrumb-item" style="background-color: white !important; color: #172B4D !important;">${this.escapeHtml(summary.IterationName || "Iteration")}</span>
                    <span class="breadcrumb-separator" style="background-color: white !important; color: #172B4D !important;">›</span>
                    <span class="breadcrumb-item" style="background-color: white !important; color: #172B4D !important;">${this.escapeHtml(summary.PlanName || "Plan")}</span>
                    <span class="breadcrumb-separator" style="background-color: white !important; color: #172B4D !important;">›</span>
                    <span class="breadcrumb-item" style="background-color: white !important; color: #172B4D !important;">${this.escapeHtml(summary.SequenceName || "Sequence")}</span>
                    <span class="breadcrumb-separator" style="background-color: white !important; color: #172B4D !important;">›</span>
                    <span class="breadcrumb-item" style="background-color: white !important; color: #172B4D !important;">${this.escapeHtml(summary.PhaseName || "Phase")}</span>
                </div>
                <div class="cache-status" style="background-color: white !important;">
                    <small style="color: #6B778C; background-color: white !important;">
                        🔄 Last updated: <span id="cache-timestamp" style="background-color: white !important;">${new Date().toLocaleTimeString()}</span>
                    </small>
                </div>
            </div>
            
            <div class="step-details-content">
                ${this.doRenderStepDetails(stepData)}
            </div>
        `;

    container.innerHTML = html;

    // Apply role-based controls
    this.applyRoleBasedControls();

    // Attach event listeners
    this.attachEventListeners();
    
    // Initialize search and filtering UI
    this.searchFilter.initializeSearchUI();
    
    // Initialize PILOT features for eligible users
    if (["PILOT", "ADMIN"].includes(this.userRole)) {
      this.pilotFeatures = new StepViewPilotFeatures(this);
      this.pilotFeatures.initializePilotFeatures();
      console.log('🚁 StepView: PILOT features initialized for', this.userRole, 'user');
    }
  }

  renderStepSummary(summary) {
    // Only show additional details not already in header, plus status dropdown for PILOT users
    // Convert status ID to name if needed - API returns StatusID not Status
    const statusId = summary.StatusID || summary.Status || 21;
    const statusName = this.getStatusNameFromId(statusId);
    const statusDisplay = this.createStatusBadge(statusId);
    
    // Check if we have any additional details to show
    const hasAdditionalDetails = summary.PredecessorCode || summary.TargetEnvironment || summary.Description;
    
    if (!hasAdditionalDetails) {
      // If no additional details, just show the status dropdown for PILOT users
      return `
        <div class="step-summary-section">
          <div class="step-status-container" style="margin-bottom: 16px;">
            <label style="font-weight: 600; margin-bottom: 4px; display: block;">Quick Status Update:</label>
            ${statusDisplay}
            <select id="step-status-dropdown" class="pilot-only select" style="display: none;">
              <!-- Will be populated dynamically -->
            </select>
          </div>
        </div>
      `;
    }

    return `
            <div class="step-summary-section">
                <h3>📋 ADDITIONAL DETAILS</h3>
                <table class="aui">
                    <tbody>
                        ${
                          summary.PredecessorCode
                            ? `
                        <tr>
                            <th>Predecessor Step</th>
                            <td>${this.escapeHtml(summary.PredecessorCode)}${summary.PredecessorName ? `: ${this.escapeHtml(summary.PredecessorName)}` : ""}</td>
                        </tr>
                        `
                            : ""
                        }
                        ${
                          summary.TargetEnvironment
                            ? `
                        <tr>
                            <th>Target Environment</th>
                            <td>${this.escapeHtml(summary.TargetEnvironment)}</td>
                        </tr>
                        `
                            : ""
                        }
                        ${
                          summary.Description
                            ? `
                        <tr>
                            <th>Description</th>
                            <td>${this.escapeHtml(summary.Description)}</td>
                        </tr>
                        `
                            : ""
                        }
                    </tbody>
                </table>
            </div>
        `;
  }

  renderLabels(labels) {
    if (!labels || labels.length === 0) {
      return "";
    }

    const labelHtml = labels
      .map(
        (label) => `
            <span class="label" style="background-color: ${label.color || "#e3e5e8"}; color: ${this.getContrastColor(label.color || "#e3e5e8")}">
                ${this.escapeHtml(label.name)}
            </span>
        `,
      )
      .join("");

    return `
            <div class="labels-section">
                <h3>🏷️ LABELS</h3>
                <div class="labels-container">
                    ${labelHtml}
                </div>
            </div>
        `;
  }

  renderInstructions(instructions) {
    if (!instructions || instructions.length === 0) {
      return `
                <div class="instructions-section">
                    <h3>📝 INSTRUCTIONS</h3>
                    <p class="no-data">No instructions defined for this step.</p>
                </div>
            `;
    }

    const rows = instructions
      .map(
        (inst, index) => `
            <tr class="instruction-row ${inst.IsCompleted ? "completed" : ""}">
                <td class="instruction-checkbox-cell">
                    <input type="checkbox" 
                           class="instruction-checkbox normal-user-action" 
                           data-instruction-id="${inst.Id}"
                           data-step-id="${this.currentStepInstanceId}"
                           ${inst.IsCompleted ? "checked" : ""}
                           ${this.userRole === "NORMAL" ? "" : 'style="display: none;"'}>
                </td>
                <td class="instruction-order">${inst.Order}</td>
                <td class="instruction-body">${this.escapeHtml(inst.Description)}</td>
                <td class="instruction-duration">${inst.Duration || "-"} min</td>
            </tr>
        `,
      )
      .join("");

    return `
            <div class="instructions-section">
                <h3>📝 INSTRUCTIONS</h3>
                <table class="aui">
                    <thead>
                        <tr>
                            <th class="normal-user-action" style="width: 40px;">✓</th>
                            <th style="width: 60px;">Order</th>
                            <th>Instruction</th>
                            <th style="width: 80px;">Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
  }

  renderImpactedTeams(teams) {
    if (!teams || teams.length === 0) {
      return "";
    }

    const teamList = teams
      .map((team) => `<li>${this.escapeHtml(team.name || team)}</li>`)
      .join("");

    return `
            <div class="impacted-teams-section">
                <h3>👥 IMPACTED TEAMS</h3>
                <ul>
                    ${teamList}
                </ul>
            </div>
        `;
  }

  renderComments(comments) {
    let html = `
            <div class="comments-section">
                <h3>💬 COMMENTS (${comments.length})</h3>
                <div class="comments-list">
        `;

    if (comments.length === 0) {
      html +=
        '<p class="no-comments">No comments yet. Be the first to add one!</p>';
    } else {
      comments.forEach((comment) => {
        const timeAgo = this.formatTimeAgo(comment.createdAt);
        const teamName = comment.author?.team
          ? ` (${comment.author.team})`
          : "";
        html += `
                    <div class="comment" data-comment-id="${comment.id}">
                        <div class="comment-header">
                            <span class="comment-author">${this.escapeHtml(comment.author.name)}${teamName}</span>
                            <span class="comment-time">${timeAgo}</span>
                            <div class="comment-actions">
                                <button class="btn-edit-comment pilot-only" data-comment-id="${comment.id}" title="Edit">✏️</button>
                                <button class="btn-delete-comment admin-only" data-comment-id="${comment.id}" title="Delete">🗑️</button>
                            </div>
                        </div>
                        <div class="comment-body" id="comment-body-${comment.id}">${this.escapeHtml(comment.body)}</div>
                    </div>
                `;
      });
    }

    html += `
                </div>
                
                <div class="comment-form pilot-only">
                    <textarea id="new-comment-text" placeholder="Add a comment..." rows="3"></textarea>
                    <button type="button" class="aui-button aui-button-primary" id="add-comment-btn">Add Comment</button>
                </div>
            </div>
        `;

    return html;
  }

  applyRoleBasedControls() {
    const normalElements = document.querySelectorAll(".normal-only");
    const pilotElements = document.querySelectorAll(".pilot-only");
    const adminElements = document.querySelectorAll(".admin-only");
    const normalUserActions = document.querySelectorAll(".normal-user-action");

    // Show/hide elements based on role
    normalElements.forEach((el) => {
      el.style.display = this.userRole === "NORMAL" ? "" : "none";
    });

    pilotElements.forEach((el) => {
      el.style.display = ["PILOT", "ADMIN"].includes(this.userRole)
        ? ""
        : "none";
    });

    adminElements.forEach((el) => {
      el.style.display = this.userRole === "ADMIN" ? "" : "none";
    });

    // Normal users can only see checkboxes
    normalUserActions.forEach((el) => {
      el.style.display = this.userRole === "NORMAL" ? "" : "none";
    });

    // Show status dropdown for PILOT/ADMIN
    const statusDropdown = document.getElementById("step-status-dropdown");
    if (statusDropdown && ["PILOT", "ADMIN"].includes(this.userRole)) {
      statusDropdown.style.display = "";
      this.populateStatusDropdown();
    }
  }

  async populateStatusDropdown() {
    const dropdown = document.getElementById("step-status-dropdown");
    if (!dropdown) return;

    try {
      const response = await fetch(`${this.config.api.baseUrl}/statuses/step`);
      if (!response.ok) throw new Error("Failed to fetch statuses");

      const statuses = await response.json();

      // Get current status
      const currentStatus =
        document.querySelector(".step-info")?.dataset?.currentStatus ||
        "PENDING";

      dropdown.innerHTML = statuses
        .map(
          (status) => `
                <option value="${status.sts_code}" 
                        ${status.sts_code === currentStatus ? "selected" : ""}
                        style="color: ${status.sts_color || "#000"}">
                    ${status.sts_name}
                </option>
            `,
        )
        .join("");
    } catch (error) {
      console.error("Error loading statuses:", error);
    }
  }

  attachEventListeners() {
    // Status dropdown
    const statusDropdown = document.getElementById("step-status-dropdown");
    if (statusDropdown) {
      statusDropdown.addEventListener("change", (e) =>
        this.handleStatusChange(e),
      );
    }

    // Instruction checkboxes
    const checkboxes = document.querySelectorAll(".instruction-checkbox");
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) =>
        this.handleInstructionToggle(e),
      );
    });

    // Comment actions
    this.attachCommentListeners();
  }

  attachCommentListeners() {
    // Add comment button
    const addCommentBtn = document.getElementById("add-comment-btn");
    if (addCommentBtn) {
      addCommentBtn.addEventListener("click", () => this.handleAddComment());
    }

    // Edit comment buttons
    const editButtons = document.querySelectorAll(".btn-edit-comment");
    editButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleEditComment(e));
    });

    // Delete comment buttons
    const deleteButtons = document.querySelectorAll(".btn-delete-comment");
    deleteButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleDeleteComment(e));
    });
  }

  async handleStatusChange(event) {
    const newStatus = event.target.value;
    if (!this.currentStepInstanceId) {
      this.showNotification(
        "Unable to update status: No step instance ID",
        "error",
      );
      return;
    }

    try {
      const response = await fetch(
        `${this.config.api.baseUrl}/steps/${this.currentStepInstanceId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
            userId: this.userId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }

      // Update the display
      const statusContainer = document.querySelector(".step-status-container");
      if (statusContainer) {
        const statusSpan = statusContainer.querySelector(
          "span:not(.pilot-only)",
        );
        if (statusSpan) {
          statusSpan.outerHTML = this.getStatusDisplay(newStatus);
        }
      }

      // Clear cache to force refresh on next poll
      this.cache.clearCache();

      this.showNotification("Status updated successfully", "success");
    } catch (error) {
      console.error("Error updating status:", error);
      this.showNotification("Failed to update status", "error");
    }
  }

  async handleInstructionToggle(event) {
    const checkbox = event.target;
    const instructionId = checkbox.getAttribute("data-instruction-id");
    const stepId = checkbox.getAttribute("data-step-id");
    const isChecked = checkbox.checked;

    if (!instructionId || !stepId) {
      console.error("Missing instruction or step ID");
      return;
    }

    checkbox.disabled = true;

    try {
      if (isChecked) {
        await this.completeInstruction(stepId, instructionId);
        checkbox.closest(".instruction-row")?.classList.add("completed");
        this.showNotification("Instruction marked as complete", "success");
      } else {
        await this.uncompleteInstruction(stepId, instructionId);
        checkbox.closest(".instruction-row")?.classList.remove("completed");
        this.showNotification("Instruction marked as incomplete", "success");
      }
      
      // Clear cache to force refresh on next poll
      this.cache.clearCache();
    } catch (error) {
      checkbox.checked = !isChecked; // Revert on error
      this.showNotification("Failed to update instruction", "error");
    } finally {
      checkbox.disabled = false;
    }
  }

  async completeInstruction(stepId, instructionId) {
    const response = await fetch(
      `${this.config.api.baseUrl}/steps/${stepId}/instructions/${instructionId}/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: this.userId,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to complete instruction: ${response.status}`);
    }

    return response.json();
  }

  async uncompleteInstruction(stepId, instructionId) {
    const response = await fetch(
      `${this.config.api.baseUrl}/steps/${stepId}/instructions/${instructionId}/incomplete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: this.userId,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to uncomplete instruction: ${response.status}`);
    }

    return response.json();
  }

  async handleAddComment() {
    const textarea = document.getElementById("new-comment-text");
    const addBtn = document.getElementById("add-comment-btn");

    if (!textarea || !addBtn) return;

    const commentText = textarea.value.trim();
    if (!commentText) {
      this.showNotification("Please enter a comment", "warning");
      return;
    }

    if (!this.currentStepInstanceId) {
      this.showNotification(
        "Unable to add comment: No step instance ID",
        "error",
      );
      return;
    }

    try {
      addBtn.disabled = true;
      textarea.disabled = true;

      const response = await fetch(
        `${this.config.api.baseUrl}/comments/${this.currentStepInstanceId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: commentText,
            userId: this.userId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.status}`);
      }

      // Clear the textarea and clear cache to force refresh
      textarea.value = "";
      this.cache.clearCache();
      this.showNotification("Comment added successfully", "success");

      // The real-time polling will pick up the change automatically
    } catch (error) {
      console.error("Error adding comment:", error);
      this.showNotification("Failed to add comment", "error");
    } finally {
      addBtn.disabled = false;
      textarea.disabled = false;
    }
  }

  async handleEditComment(event) {
    const commentId = event.target.dataset.commentId;
    const bodyDiv = document.getElementById(`comment-body-${commentId}`);

    if (!bodyDiv) return;

    // Check if already in edit mode
    if (bodyDiv.querySelector("textarea")) {
      return;
    }

    const currentText = bodyDiv.textContent;
    bodyDiv.dataset.originalText = currentText;

    const editContainer = document.createElement("div");
    editContainer.innerHTML = `
            <textarea id="edit-comment-${commentId}" rows="3" style="width: 100%;">${this.escapeHtml(currentText)}</textarea>
            <div style="margin-top: 8px;">
                <button class="aui-button aui-button-primary save-comment-btn" data-comment-id="${commentId}">Save</button>
                <button class="aui-button cancel-comment-btn" data-comment-id="${commentId}">Cancel</button>
            </div>
        `;

    bodyDiv.innerHTML = "";
    bodyDiv.appendChild(editContainer);

    // Attach event listeners
    const saveBtn = bodyDiv.querySelector(".save-comment-btn");
    const cancelBtn = bodyDiv.querySelector(".cancel-comment-btn");

    saveBtn.addEventListener("click", () => this.saveCommentEdit(commentId));
    cancelBtn.addEventListener("click", () =>
      this.cancelCommentEdit(commentId),
    );

    // Focus the textarea
    const textarea = document.getElementById(`edit-comment-${commentId}`);
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }

  async saveCommentEdit(commentId) {
    const textarea = document.getElementById(`edit-comment-${commentId}`);
    if (!textarea) return;

    const newText = textarea.value.trim();
    if (!newText) {
      this.showNotification("Comment cannot be empty", "warning");
      return;
    }

    try {
      const response = await fetch(
        `${this.config.api.baseUrl}/comments/${commentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: newText,
            userId: this.userId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update comment: ${response.status}`);
      }

      // Update the display
      const bodyDiv = document.getElementById(`comment-body-${commentId}`);
      if (bodyDiv) {
        bodyDiv.innerHTML = this.escapeHtml(newText);
      }

      // Clear cache to force refresh
      this.cache.clearCache();
      this.showNotification("Comment updated successfully", "success");
    } catch (error) {
      console.error("Error updating comment:", error);
      this.showNotification("Failed to update comment", "error");
    }
  }

  cancelCommentEdit(commentId) {
    const bodyDiv = document.getElementById(`comment-body-${commentId}`);
    if (bodyDiv) {
      const originalText = bodyDiv.dataset.originalText || "";
      bodyDiv.innerHTML = this.escapeHtml(originalText);
    }
  }

  async handleDeleteComment(event) {
    const commentId = event.target.dataset.commentId;

    this.showDeleteConfirmDialog(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      async () => {
        try {
          const response = await fetch(
            `${this.config.api.baseUrl}/comments/${commentId}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to delete comment: ${response.status}`);
          }

          // Clear cache to force refresh
          this.cache.clearCache();
          this.showNotification("Comment deleted successfully", "success");
          
          // The real-time polling will pick up the change automatically
        } catch (error) {
          console.error("Error deleting comment:", error);
          this.showNotification("Failed to delete comment", "error");
        }
      },
    );
  }

  showDeleteConfirmDialog(title, message, onConfirm) {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
            background: white;
            border-radius: 3px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.16);
            padding: 20px;
            width: 400px;
            max-width: 90%;
        `;

    dialog.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #172B4D;">${this.escapeHtml(title)}</h3>
            <p style="margin: 0 0 20px 0; color: #5E6C84;">${this.escapeHtml(message)}</p>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button class="aui-button" id="cancel-delete-btn">Cancel</button>
                <button class="aui-button aui-button-primary" id="confirm-delete-btn">Delete</button>
            </div>
        `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const cancelBtn = dialog.querySelector("#cancel-delete-btn");
    const confirmBtn = dialog.querySelector("#confirm-delete-btn");

    const cleanup = () => {
      overlay.remove();
    };

    cancelBtn.addEventListener("click", cleanup);
    confirmBtn.addEventListener("click", () => {
      cleanup();
      onConfirm();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        cleanup();
      }
    });

    confirmBtn.focus();
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `aui-message aui-message-${type} closeable`;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

    const iconMap = {
      success: "check-circle",
      error: "error",
      warning: "warning",
      info: "info",
    };

    notification.innerHTML = `
            <span class="aui-icon icon-${iconMap[type] || "info"}"></span>
            <p>${this.escapeHtml(message)}</p>
            <span class="aui-icon icon-close" role="button" tabindex="0"></span>
        `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => notification.remove(), 300);
    }, 5000);

    // Close button
    const closeBtn = notification.querySelector(".icon-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => notification.remove());
    }
  }

  /**
   * Map status ID to status name based on database schema
   */
  getStatusNameFromId(statusId) {
    const statusMap = {
      20: 'PENDING',
      21: 'TODO', 
      22: 'IN_PROGRESS',
      23: 'COMPLETED',
      24: 'FAILED',
      25: 'BLOCKED',
      26: 'CANCELLED'
    };
    
    return statusMap[parseInt(statusId)] || 'PENDING';
  }

  /**
   * Create a proper status badge with background color like IterationView
   */
  createStatusBadge(statusId) {
    const statusName = this.getStatusNameFromId(statusId);
    const statusColors = {
      PENDING: "#DDDDDD",
      TODO: "#FFFF00", 
      IN_PROGRESS: "#0066CC",
      COMPLETED: "#00AA00",
      FAILED: "#FF0000",
      BLOCKED: "#FF6600",
      CANCELLED: "#CC0000",
    };

    const color = statusColors[statusName] || "#DDDDDD";
    const textColor = this.getTextColorForBackground(color);
    const displayText = statusName.replace(/_/g, " ");

    return `<span class="status-badge" style="background-color: ${color}; color: ${textColor}; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; letter-spacing: 0.5px;">${displayText}</span>`;
  }

  /**
   * Get appropriate text color (black or white) based on background color
   */
  getTextColorForBackground(bgColor) {
    // Convert hex to RGB
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
  }

  getStatusDisplay(status) {
    // Use the same badge creation as in the header for consistency
    const statusId = this.getStatusIdFromName(status);
    if (statusId) {
      return this.createStatusBadge(statusId);
    }
    
    // Fallback to colored text if no ID found
    const statusColors = {
      PENDING: "#6554C0",
      TODO: "#0052CC",
      IN_PROGRESS: "#FF8B00",
      COMPLETED: "#36B37E",
      FAILED: "#FF5630",
      BLOCKED: "#FF5630",
      CANCELLED: "#6B778C",
    };

    const color = statusColors[status] || "#6B778C";
    return `<span style="color: ${color}; font-weight: bold;">${status || "UNKNOWN"}</span>`;
  }
  
  getStatusIdFromName(statusName) {
    const statusMap = {
      'PENDING': 20,
      'TODO': 21,
      'IN_PROGRESS': 22,
      'COMPLETED': 23,
      'FAILED': 24,
      'BLOCKED': 25,
      'CANCELLED': 26
    };
    
    return statusMap[statusName] || null;
  }

  formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return date.toLocaleDateString();
  }

  getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? "#000000" : "#FFFFFF";
  }

  /**
   * Render step details using exact IterationView structure
   * This method implements 100% structural alignment with IterationView doRenderStepDetails
   */
  doRenderStepDetails(stepData) {
    const summary = stepData.stepSummary || {};
    const instructions = stepData.instructions || [];
    const impactedTeams = stepData.impactedTeams || [];
    const comments = stepData.comments || [];
    
    let html = `
        <div class="step-info" data-sti-id="${summary.ID || ""}">
            <div class="step-title">
                <h3>📋 ${summary.StepCode || "Unknown"} - ${summary.Name || "Unknown Step"}</h3>
            </div>
            
            <div class="step-breadcrumb">
                <span class="breadcrumb-item">${summary.MigrationName || "Migration"}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${summary.PlanName || "Plan"}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${summary.IterationName || "Iteration"}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${summary.SequenceName || "Sequence"}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${summary.PhaseName || "Phase"}</span>
            </div>
            
            <div class="step-key-info">
                <div class="metadata-item">
                    <span class="label">📊 Status:</span>
                    <span class="value">
                        <select id="step-status-dropdown" class="status-dropdown pilot-only" data-step-id="${summary.ID || stepData.stepCode}" style="padding: 2px 8px; border-radius: 3px;">
                            <option value="">Loading...</option>
                        </select>
                    </span>
                </div>
                <div class="metadata-item">
                    <span class="label">⬅️ Predecessor:</span>
                    <span class="value">${summary.PredecessorCode ? `${summary.PredecessorCode}${summary.PredecessorName ? ` - ${summary.PredecessorName}` : ""}` : "-"}</span>
                </div>
            </div>
            
            <div class="step-metadata">
                <div class="metadata-item">
                    <span class="label">🎯 Target Environment:</span>
                    <span class="value">${summary.TargetEnvironment || "Not specified"}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">🔄 Scope:</span>
                    <span class="value">
                        ${
                          summary.IterationTypes &&
                          summary.IterationTypes.length > 0
                            ? summary.IterationTypes.map(
                                (type) =>
                                  `<span class="scope-tag">${type}</span>`,
                              ).join(" ")
                            : '<span style="color: var(--color-text-tertiary); font-style: italic;">None specified</span>'
                        }
                    </span>
                </div>
                <div class="metadata-item teams-container">
                    <div class="team-section">
                        <span class="label">👤 Primary Team:</span>
                        <span class="value">${summary.AssignedTeam || "Not assigned"}</span>
                    </div>
                    <div class="team-section">
                        <span class="label">👥 Impacted Teams:</span>
                        <span class="value">${impactedTeams.length > 0 ? impactedTeams.join(", ") : "None"}</span>
                    </div>
                </div>
                <div class="metadata-item">
                    <span class="label">📂 Location:</span>
                    <span class="value">${summary.SequenceName ? `Sequence: ${summary.SequenceName}` : "Unknown sequence"}${summary.PhaseName ? ` | Phase: ${summary.PhaseName}` : ""}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">⏱️ Duration:</span>
                    <span class="value">${summary.Duration ? `${summary.Duration} min.` : summary.EstimatedDuration ? `${summary.EstimatedDuration} min.` : "45 min."}</span>
                </div>
                ${
                  summary.Labels && summary.Labels.length > 0
                    ? `
                <div class="metadata-item">
                    <span class="label">🏷️ Labels:</span>
                    <span class="value">
                        ${summary.Labels.map((label) => `<span class="label-tag" style="background-color: ${label.color}; color: ${this.getContrastColor(label.color)};">${label.name}</span>`).join(" ")}
                    </span>
                </div>
                `
                    : ""
                }
            </div>
            
            <div class="step-description">
                <h4>📝 Description:</h4>
                <p>${summary.Description || "No description available"}</p>
            </div>
        </div>
    `;
    
    // Add instructions section using IterationView pattern
    if (instructions.length > 0) {
        html += `
            <div class="instructions-section">
                <h4>📋 INSTRUCTIONS</h4>
                <div class="instructions-table">
                    <div class="instructions-header">
                        <div class="col-num">#</div>
                        <div class="col-instruction">Instruction</div>
                        <div class="col-team">Team</div>
                        <div class="col-control">Control</div>
                        <div class="col-duration">Duration</div>
                        <div class="col-complete">✓</div>
                    </div>
        `;
        
        instructions.forEach((instruction, index) => {
            html += `
                <div class="instruction-row ${instruction.IsCompleted ? "completed" : ""}">
                    <div class="col-num">${instruction.Order || index + 1}</div>
                    <div class="col-instruction">${instruction.Description || instruction.Instruction || "No description"}</div>
                    <div class="col-team">${instruction.Team || summary.AssignedTeam || "TBD"}</div>
                    <div class="col-control">${instruction.Control || instruction.ControlCode || `CTRL-${String(index + 1).padStart(2, "0")}`}</div>
                    <div class="col-duration">${instruction.Duration ? `${instruction.Duration} min.` : instruction.EstimatedDuration ? `${instruction.EstimatedDuration} min.` : "5 min."}</div>
                    <div class="col-complete">
                        <input type="checkbox" 
                            class="instruction-checkbox pilot-only" 
                            data-instruction-id="${instruction.ID || instruction.ini_id || instruction.Order || index + 1}"
                            data-step-id="${summary.ID || stepData.stepCode || ""}"
                            data-instruction-index="${index}"
                            ${instruction.IsCompleted ? "checked" : ""}>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Add comment section with real data
    html += `
        <div class="comments-section">
            <h4>💬 COMMENTS (${comments.length})</h4>
            <div class="comments-list" id="comments-list">
    `;
    
    if (comments.length > 0) {
        comments.forEach((comment) => {
            const relativeTime = this.formatTimeAgo(comment.createdAt);
            const teamName = comment.author?.team ? ` (${comment.author.team})` : "";
            html += `
                <div class="comment-item" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <span class="comment-author">${this.escapeHtml(comment.author?.name || "Unknown")}${teamName}</span>
                        <span class="comment-timestamp">${relativeTime}</span>
                    </div>
                    <div class="comment-body">${this.escapeHtml(comment.body || "")}</div>
                </div>
            `;
        });
    } else {
        html += `<p class="no-comments">No comments yet.</p>`;
    }
    
    html += `
            </div>
            <div class="add-comment-section">
                <h5>Add Comment</h5>
                <div class="comment-form">
                    <textarea id="new-comment-text" 
                              class="textarea" 
                              placeholder="Add your comment here..." 
                              rows="3" 
                              style="width: 100%; margin-bottom: 8px;"></textarea>
                    <button id="add-comment-btn" 
                            class="aui-button aui-button-primary" 
                            type="button">
                        Add Comment
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return html;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Add CSS animations and mobile-responsive styles
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    /* Force white background for StepView - overrides dark mode */
    #umig-step-view-root {
        background-color: white !important;
        color: #172B4D !important;
    }
    
    .step-details-panel {
        background-color: white !important;
        color: #172B4D !important;
    }
    
    .step-details-content {
        background-color: white !important;
        color: #172B4D !important;
    }
    
    .step-info {
        background-color: white !important;
        color: #172B4D !important;
    }
    
    /* StepView Header Styles */
    .step-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .step-name {
        margin: 0;
        font-size: 20px;
        color: #172B4D;
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
    }
    
    .step-code {
        color: #6B778C;
        font-weight: 600;
    }
    
    .step-title-text {
        font-weight: 600;
    }
    
    .step-meta {
        display: flex;
        gap: 24px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #DFE1E6;
        color: #6B778C;
        font-size: 13px;
    }
    
    .step-owner, .step-timing {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .status-badge {
        flex-shrink: 0;
    }
    
    /* Mobile-First Responsive Design for StepView */
    
    /* Base Mobile Styles (320px+) */
    @media screen and (max-width: 767px) {
        .panel-header, .step-view-header {
            padding: 12px 16px;
            background: #f8f9fa;
            margin-bottom: 16px;
            border-radius: 4px;
        }
        
        .panel-header h2, .step-view-header h2 {
            font-size: 18px !important;
            line-height: 1.3;
            margin-bottom: 8px;
            word-wrap: break-word;
        }
        
        .step-breadcrumb {
            font-size: 12px;
            flex-wrap: wrap;
            gap: 4px;
            display: flex;
            align-items: center;
        }
        
        .breadcrumb-item {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .cache-status {
            margin-top: 8px;
            font-size: 11px;
        }
        
        /* Header mobile styles */
        .step-title-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
        }
        
        .step-name {
            font-size: 16px !important;
            flex-wrap: wrap;
        }
        
        .step-meta {
            flex-direction: column !important;
            gap: 8px !important;
        }
        
        .status-badge {
            font-size: 10px !important;
            padding: 2px 6px !important;
        }
        
        /* Search filters mobile layout */
        .search-filters-section {
            margin: 12px 0 !important;
            padding: 12px !important;
            border-radius: 4px;
        }
        
        .search-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
        }
        
        .search-header h4 {
            font-size: 16px !important;
            text-align: center;
        }
        
        .search-header .aui-button {
            font-size: 12px;
            padding: 4px 8px;
        }
        
        #step-search-input {
            max-width: 100% !important;
            font-size: 16px; /* Prevents zoom on iOS */
            padding: 8px 12px;
            margin-bottom: 8px;
        }
        
        .search-results-count {
            display: block !important;
            margin-left: 0 !important;
            margin-top: 4px;
            text-align: center;
            font-size: 12px;
        }
        
        .advanced-filters {
            flex-direction: column !important;
            gap: 12px !important;
        }
        
        .filter-group {
            width: 100%;
        }
        
        .filter-group select {
            width: 100%;
            font-size: 14px;
            padding: 6px 8px;
        }
        
        .search-shortcuts {
            text-align: center;
        }
        
        .search-shortcut {
            background: none;
            border: none;
            color: #0052cc;
            text-decoration: underline;
            padding: 2px 4px;
            font-size: 11px;
            cursor: pointer;
        }
        
        /* Step info mobile layout */
        .step-info {
            padding: 0 8px;
        }
        
        .step-summary-section table.aui {
            font-size: 14px;
        }
        
        .step-summary-section th {
            width: 35% !important;
            font-size: 13px;
            padding: 6px 4px;
        }
        
        .step-summary-section td {
            padding: 6px 4px;
            word-wrap: break-word;
        }
        
        /* Instructions mobile layout */
        .instructions-section table.aui {
            display: block;
            width: 100%;
            overflow-x: auto;
            white-space: nowrap;
        }
        
        .instructions-section table.aui thead {
            display: none; /* Hide headers on mobile, use card layout */
        }
        
        .instruction-row {
            display: block !important;
            border: 1px solid #ddd;
            margin-bottom: 8px;
            padding: 12px;
            border-radius: 4px;
            background: #fff;
            white-space: normal;
        }
        
        .instruction-row.completed {
            background: #e8f5e8;
            border-color: #b3d9b3;
        }
        
        .instruction-checkbox-cell {
            display: block !important;
            margin-bottom: 8px;
            text-align: left;
        }
        
        .instruction-checkbox {
            width: 18px !important;
            height: 18px !important;
            margin-right: 8px;
        }
        
        .instruction-order {
            display: inline-block !important;
            background: #f4f5f7;
            padding: 2px 6px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 6px;
        }
        
        .instruction-body {
            display: block !important;
            font-size: 14px;
            line-height: 1.4;
            margin: 8px 0;
            padding-right: 0 !important;
        }
        
        .instruction-duration {
            display: inline-block !important;
            color: #6b778c;
            font-size: 12px;
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
        }
        
        .instruction-duration::before {
            content: "Duration: ";
            font-weight: 600;
        }
        
        /* Labels mobile layout */
        .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        
        .labels-container .label {
            font-size: 11px !important;
            padding: 3px 6px !important;
            border-radius: 3px;
        }
        
        /* Comments mobile layout */
        .comments-section {
            margin-top: 20px;
        }
        
        .comment {
            margin-bottom: 12px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 4px;
            border-left: 3px solid #0052cc;
        }
        
        .comment-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 4px;
            margin-bottom: 8px;
        }
        
        .comment-author {
            font-weight: 600;
            font-size: 14px;
        }
        
        .comment-time {
            font-size: 11px;
            color: #6b778c;
        }
        
        .comment-actions {
            margin-top: 4px;
        }
        
        .comment-actions button {
            font-size: 16px;
            padding: 4px;
            margin-right: 8px;
            background: none;
            border: none;
            cursor: pointer;
        }
        
        .comment-body {
            font-size: 14px;
            line-height: 1.4;
        }
        
        .comment-form {
            margin-top: 16px;
        }
        
        .comment-form textarea {
            width: 100% !important;
            min-height: 80px;
            font-size: 14px;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            resize: vertical;
        }
        
        .comment-form .aui-button {
            width: 100%;
            margin-top: 8px;
            padding: 10px;
            font-size: 14px;
        }
        
        /* Status dropdown mobile */
        .step-status-container select {
            font-size: 14px;
            padding: 4px 8px;
            margin-top: 4px;
        }
        
        /* Notification positioning for mobile */
        .aui-message.closeable {
            position: fixed !important;
            top: 10px !important;
            left: 10px !important;
            right: 10px !important;
            max-width: none !important;
            z-index: 9999;
        }
        
        /* Modal dialog mobile adjustments */
        .step-view-modal-overlay .step-view-modal-dialog {
            width: 95% !important;
            max-width: 95% !important;
            margin: 20px auto;
        }
    }
    
    /* Tablet Styles (768px - 1023px) */
    @media screen and (min-width: 768px) and (max-width: 1023px) {
        .panel-header, .step-view-header {
            padding: 16px 20px;
        }
        
        .panel-header h2, .step-view-header h2 {
            font-size: 22px;
        }
        
        .search-filters-section {
            padding: 16px;
        }
        
        .search-header {
            flex-direction: row !important;
            justify-content: space-between;
        }
        
        .advanced-filters {
            flex-direction: row !important;
            flex-wrap: wrap;
        }
        
        .filter-group {
            flex: 1;
            min-width: 150px;
        }
        
        /* Instructions table - show as table but optimize */
        .instructions-section table.aui thead {
            display: table-header-group;
        }
        
        .instruction-row {
            display: table-row !important;
            margin-bottom: 0;
            padding: 0;
            border: none;
            background: transparent;
        }
        
        .instruction-row td {
            display: table-cell !important;
            padding: 8px 12px;
            border-bottom: 1px solid #f0f1f2;
        }
        
        .instruction-body {
            max-width: 300px;
            word-wrap: break-word;
        }
        
        .comment-header {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between;
        }
        
        .comment-form .aui-button {
            width: auto;
            padding: 6px 16px;
        }
    }
    
    /* Desktop Styles (1024px+) */
    @media screen and (min-width: 1024px) {
        .panel-header, .step-view-header {
            padding: 20px 24px;
        }
        
        .search-filters-section {
            padding: 20px;
        }
        
        .advanced-filters {
            flex-direction: row !important;
            justify-content: flex-start;
        }
        
        .filter-group {
            flex: 0 0 auto;
            margin-right: 20px;
        }
        
        /* Full table layout for instructions */
        .instruction-body {
            max-width: 400px;
        }
    }
    
    /* Touch-friendly improvements */
    @media (hover: none) and (pointer: coarse) {
        .instruction-checkbox,
        .comment-actions button,
        .search-shortcut,
        .aui-button {
            min-height: 44px;
            min-width: 44px;
            touch-action: manipulation;
        }
        
        .instruction-checkbox {
            transform: scale(1.2);
            margin: 8px;
        }
        
        .comment-actions button {
            padding: 8px 12px;
            margin: 4px;
            background: rgba(0,0,0,0.05);
            border-radius: 4px;
        }
        
        /* Prevent zoom on input focus */
        input[type="text"],
        textarea,
        select {
            font-size: 16px !important;
        }
        
        /* Larger tap targets for dropdowns */
        select {
            min-height: 44px;
            padding: 8px 12px;
        }
        
        /* Better touch scrolling */
        .instructions-section table.aui {
            -webkit-overflow-scrolling: touch;
        }
        
        .comments-list {
            -webkit-overflow-scrolling: touch;
        }
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
        .panel-header, .step-view-header {
            background: #1e1e1e;
            color: #ffffff;
        }
        
        .search-filters-section {
            background: #2d2d2d;
            color: #ffffff;
        }
        
        .instruction-row {
            background: #1e1e1e;
            border-color: #444;
            color: #ffffff;
        }
        
        .instruction-row.completed {
            background: #1a3a1a;
            border-color: #4a7a4a;
        }
        
        .comment {
            background: #2d2d2d;
            color: #ffffff;
        }
        
        input, textarea, select {
            background: #1e1e1e;
            color: #ffffff;
            border-color: #444;
        }
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
        .aui-message.closeable {
            animation: none !important;
        }
        
        * {
            transition: none !important;
            animation: none !important;
        }
    }
    
    /* High contrast support */
    @media (prefers-contrast: high) {
        .instruction-row {
            border: 2px solid #000;
        }
        
        .comment {
            border: 2px solid #000;
        }
        
        .label {
            border: 1px solid #000 !important;
        }
    }
    
    /* Status Badge Styles */
    .step-status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        margin-left: 8px;
    }
`;
document.head.appendChild(style);

// CSS Debug Helper Functions
window.debugStepViewCSS = function() {
    console.log('🔍 StepView CSS Debug Helper');
    console.log('============================');
    
    // Check if iteration-view.css is loaded
    const iterationCSS = document.getElementById('iteration-view-css');
    if (iterationCSS) {
        console.log('✅ iteration-view.css link element found');
        console.log('🔗 href:', iterationCSS.href);
    } else {
        console.error('❌ iteration-view.css link element NOT found');
    }
    
    // Check key elements
    const rootElement = document.getElementById('umig-step-view-root');
    const panelElement = document.querySelector('.step-details-panel');
    const headerElement = document.querySelector('.panel-header');
    
    if (rootElement) {
        console.log('✅ Root element found');
        const rootStyle = window.getComputedStyle(rootElement);
        console.log('📊 Root background:', rootStyle.background);
    } else {
        console.error('❌ Root element NOT found');
    }
    
    if (panelElement) {
        console.log('✅ Panel element found');
        const panelStyle = window.getComputedStyle(panelElement);
        console.log('📊 Panel background:', panelStyle.background);
        console.log('📊 Panel border:', panelStyle.border);
        console.log('📊 Panel box-shadow:', panelStyle.boxShadow);
        
        // Add temporary debug highlight
        panelElement.classList.add('debug-highlight');
        setTimeout(() => {
            panelElement.classList.remove('debug-highlight');
        }, 3000);
    } else {
        console.error('❌ Panel element NOT found');
    }
    
    if (headerElement) {
        console.log('✅ Header element found');
        const headerStyle = window.getComputedStyle(headerElement);
        console.log('📊 Header color:', headerStyle.color);
        console.log('📊 Header font-size:', headerStyle.fontSize);
        console.log('📊 Header font-weight:', headerStyle.fontWeight);
    } else {
        console.error('❌ Header element NOT found');
    }
    
    // Check CSS variables
    const documentStyle = window.getComputedStyle(document.documentElement);
    console.log('🎨 CSS Variables:');
    console.log('  --color-primary:', documentStyle.getPropertyValue('--color-primary'));
    console.log('  --color-bg-primary:', documentStyle.getPropertyValue('--color-bg-primary'));
    console.log('  --color-border:', documentStyle.getPropertyValue('--color-border'));
    
    // Check for conflicting styles
    const allStyleSheets = document.styleSheets;
    console.log('📋 Total stylesheets loaded:', allStyleSheets.length);
    
    console.log('💡 To debug further, check:');
    console.log('  1. Browser Network tab for failed CSS requests');
    console.log('  2. Elements tab for applied styles');
    console.log('  3. Run debugStepViewCSS() again after making changes');
};

// Add debug button for ADMIN users
if (window.UMIG_STEP_CONFIG && window.UMIG_STEP_CONFIG.user && window.UMIG_STEP_CONFIG.user.isAdmin) {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            const versionMarker = document.querySelector('.version-marker');
            if (versionMarker) {
                const debugButton = document.createElement('button');
                debugButton.textContent = '🔍 Debug CSS';
                debugButton.style.cssText = 'margin-left: 10px; padding: 4px 8px; border: none; border-radius: 3px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 10px;';
                debugButton.onclick = window.debugStepViewCSS;
                versionMarker.appendChild(debugButton);
            }
        }, 500);
    });
}

// Initialize the step view
window.stepView = new StepView();

// Auto-run CSS debug after initialization
setTimeout(() => {
    if (window.debugStepViewCSS) {
        console.log('🚀 Auto-running CSS debug...');
        window.debugStepViewCSS();
    }
}, 2000);
