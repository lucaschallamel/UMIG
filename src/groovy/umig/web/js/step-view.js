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
 *
 * US-036 DOM Robustness Improvements (August 2025):
 * - Fixed .panel-header element lookup failures with defensive programming
 * - Enhanced timing controls for debug function execution
 * - Added safeQuerySelector() utility for robust DOM querying
 * - Implemented smart polling for CSS debug function
 * - Added comprehensive error logging with helpful user guidance
 * - Improved graceful degradation when DOM elements are unavailable
 *
 * TD-003 Phase 2H: StatusProvider Integration
 * - Migrated hardcoded status values to dynamic StatusProvider
 * - Enhanced status dropdown with centralized status management
 * - Integrated status mapping with fallback patterns
 */

/**
 * StepView Real-time Synchronization and Caching System
 *
 * Enhanced with intelligent caching patterns following Enhanced IterationView approach.
 * Features 30-second cache TTL and smart 60-second polling with change detection for real-time updates.
 */
class StepViewCache {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 30000; // 30 seconds
    this.pollingInterval = 60000; // 60 seconds - smart polling
    this.pollingTimer = null;
    this.isPolling = false;
    this.lastRefreshTime = 0;
    this.lastDataSnapshot = null; // Store last data for comparison
  }

  /**
   * Create a snapshot of key data fields for comparison
   */
  createDataSnapshot(stepData) {
    if (!stepData) return null;

    const summary = stepData.stepSummary || {};
    const instructions = stepData.instructions || [];
    const comments = stepData.comments || [];

    return {
      // Status information
      status: summary.Status,
      statusID: summary.StatusID,
      sti_status: summary.sti_status,

      // Instruction completion states
      instructionCount: instructions.length,
      completedInstructions: instructions.filter((i) => i.IsCompleted).length,
      instructionStatuses: instructions.map((i) => ({
        id: i.ID,
        isCompleted: i.IsCompleted,
        completedByUserName: i.CompletedByUserName,
      })),

      // Comments count and latest activity
      commentCount: comments.length,
      latestCommentId:
        comments.length > 0 ? Math.max(...comments.map((c) => c.ID || 0)) : 0,

      // Other relevant fields
      lastModified: summary.LastModified || summary.last_modified,
      version: summary.Version || summary.version || 0,
    };
  }

  /**
   * Compare two data snapshots to detect changes
   */
  hasDataChanged(newData, oldSnapshot) {
    if (!oldSnapshot) return true; // First time, always update
    if (!newData) return false;

    const newSnapshot = this.createDataSnapshot(newData);
    if (!newSnapshot) return false;

    // Compare key fields
    const fieldsToCompare = [
      "status",
      "statusID",
      "sti_status",
      "instructionCount",
      "completedInstructions",
      "commentCount",
      "latestCommentId",
      "lastModified",
      "version",
    ];

    for (const field of fieldsToCompare) {
      if (newSnapshot[field] !== oldSnapshot[field]) {
        console.log(
          `📊 StepView: Data change detected in ${field}:`,
          oldSnapshot[field],
          "→",
          newSnapshot[field],
        );
        return true;
      }
    }

    // Deep compare instruction statuses
    if (
      newSnapshot.instructionStatuses.length !==
      oldSnapshot.instructionStatuses.length
    ) {
      console.log("📊 StepView: Instruction count changed");
      return true;
    }

    for (let i = 0; i < newSnapshot.instructionStatuses.length; i++) {
      const newInst = newSnapshot.instructionStatuses[i];
      const oldInst = oldSnapshot.instructionStatuses[i];

      if (
        newInst.isCompleted !== oldInst.isCompleted ||
        newInst.completedByUserName !== oldInst.completedByUserName
      ) {
        console.log("📊 StepView: Instruction completion status changed");
        return true;
      }
    }

    return false;
  }

  /**
   * Get cached step data or fetch fresh if expired
   */
  async getStepData(
    migrationName,
    iterationName,
    stepCode,
    forceRefresh = false,
  ) {
    const cacheKey = `${migrationName}|${iterationName}|${stepCode}`;
    const now = Date.now();

    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (now - cached.timestamp < this.cacheTTL) {
        console.log("🎯 StepView: Using cached data");
        return cached.data;
      }
    }

    console.log("🔄 StepView: Fetching fresh data");
    return this.fetchStepData(migrationName, iterationName, stepCode);
  }

  /**
   * Fetch step data from API and cache it
   */
  async fetchStepData(migrationName, iterationName, stepCode, retryCount = 0) {
    const config = window.UMIG_STEP_CONFIG || {
      api: { baseUrl: "/rest/scriptrunner/latest/custom" },
    };

    const queryParams = new URLSearchParams({
      migrationName: migrationName,
      iterationName: iterationName,
      stepCode: stepCode,
    });

    try {
      const response = await fetch(
        `${config.api.baseUrl}/stepViewApi/instance?${queryParams}`,
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(
          errorData.error || `Failed to load step: ${response.status}`,
        );
      }

      const stepData = await response.json();

      // Debug logging for DUM-003 status issue - enhanced
      if (stepCode === "DUM-003" || stepCode === "DUM") {
        console.log(
          "🐛 DEBUG DUM API Response - Full data structure:",
          stepData,
        );
        console.log(
          "🐛 DEBUG DUM API Response - Summary only:",
          stepData.summary,
        );
        if (stepData.summary) {
          console.log("🐛 DEBUG DUM Summary fields:", {
            StatusID: stepData.summary.StatusID,
            Status: stepData.summary.Status,
            sti_status: stepData.summary.sti_status,
            AllKeys: Object.keys(stepData.summary),
          });
        }
      }

      if (stepData.error) {
        throw new Error(stepData.error);
      }

      // Success - cache the data and return it
      const cacheKey = `${migrationName}|${iterationName}|${stepCode}`;
      this.cache.set(cacheKey, {
        data: stepData,
        timestamp: Date.now(),
      });

      this.lastRefreshTime = Date.now();
      return stepData;
    } catch (error) {
      // Handle transient "object can not be found" errors with retry logic
      if (
        retryCount < 2 &&
        (error.message.includes("object can not be found") ||
          error.message.includes("not be found here") ||
          error.message.includes("HTTP 404") ||
          error.message.includes("HTTP 500"))
      ) {
        console.warn(
          `🔄 StepView: Transient error (attempt ${retryCount + 1}), retrying in ${500 * (retryCount + 1)}ms...`,
          error.message,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (retryCount + 1)),
        ); // Progressive delay
        return this.fetchStepData(
          migrationName,
          iterationName,
          stepCode,
          retryCount + 1,
        );
      }

      // Log the final error for debugging
      console.error(
        `❌ StepView: Failed to fetch step data after ${retryCount + 1} attempts:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Start real-time synchronization polling
   */
  startPolling(migrationName, iterationName, stepCode, onUpdate) {
    if (this.isPolling) {
      console.log("⚠️ StepView: Polling already active");
      return;
    }

    console.log(
      "🚀 StepView: Starting smart polling (60s interval) with change detection",
    );
    this.isPolling = true;

    // Initialize with current data snapshot
    this.getStepData(migrationName, iterationName, stepCode, true)
      .then((initialData) => {
        this.lastDataSnapshot = this.createDataSnapshot(initialData);
        console.log("📸 StepView: Initial data snapshot created");
      })
      .catch((error) => {
        console.error("❌ StepView: Failed to create initial snapshot:", error);
      });

    this.pollingTimer = setInterval(async () => {
      try {
        // Only poll if the page is visible
        if (document.hidden) {
          console.log("👁️ StepView: Page hidden, skipping poll");
          return;
        }

        console.log("🔍 StepView: Polling for changes...");
        const stepData = await this.getStepData(
          migrationName,
          iterationName,
          stepCode,
          true,
        );

        // Smart change detection using data comparison
        if (this.hasDataChanged(stepData, this.lastDataSnapshot)) {
          console.log("📊 StepView: Data changes detected, updating UI");
          this.lastDataSnapshot = this.createDataSnapshot(stepData);
          onUpdate(stepData);
        } else {
          console.log("✅ StepView: No changes detected, UI update skipped");
        }
      } catch (error) {
        console.error("❌ StepView polling error:", error);
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
    this.lastDataSnapshot = null; // Clear data snapshot
    console.log("🛑 StepView: Smart polling stopped and data snapshot cleared");
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    console.log("🧹 StepView: Cache cleared");
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
      interval: this.pollingInterval,
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
      query: "",
      statusFilter: "all",
      teamFilter: "all",
      completedFilter: "all",
      dateRange: "all",
    };

    this.loadFiltersFromStorage();
  }

  /**
   * Initialize search and filter UI
   */
  initializeSearchUI() {
    const searchContainer = document.createElement("div");
    searchContainer.className = "step-search-container";
    searchContainer.innerHTML = this.getSearchHTML();

    // Insert after step header - using new class names with defensive programming
    const stepHeader = document.querySelector(
      ".panel-header, .step-view-header",
    );
    if (stepHeader) {
      stepHeader.insertAdjacentElement("afterend", searchContainer);
      this.attachSearchListeners();
    } else {
      console.warn(
        "⚠️ StepView: Step header not found for search UI insertion. Search UI will be skipped.",
      );
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
              <!-- Dynamic status options will be populated by StatusProvider -->
            </select>
          </div>
          
          <div class="filter-group" style="background: white !important; color: #172B4D !important;">
            <label for="instruction-filter" style="display: block; margin-bottom: 4px; font-weight: 600; color: #172B4D !important; background: white !important;">Instructions:</label>
            <select id="instruction-filter" class="select">
              <option value="all" ${this.searchState.completedFilter === "all" ? "selected" : ""}>All Instructions</option>
              <option value="completed" ${this.searchState.completedFilter === "completed" ? "selected" : ""}>Completed Only</option>
              <option value="pending" ${this.searchState.completedFilter === "pending" ? "selected" : ""}>Pending Only</option>
            </select>
          </div>
          
          <div class="filter-group" style="background: white !important; color: #172B4D !important;">
            <label for="date-filter" style="display: block; margin-bottom: 4px; font-weight: 600; color: #172B4D !important; background: white !important;">Comments:</label>
            <select id="date-filter" class="select">
              <option value="all" ${this.searchState.dateRange === "all" ? "selected" : ""}>All Comments</option>
              <option value="today" ${this.searchState.dateRange === "today" ? "selected" : ""}>Today</option>
              <option value="week" ${this.searchState.dateRange === "week" ? "selected" : ""}>This Week</option>
              <option value="month" ${this.searchState.dateRange === "month" ? "selected" : ""}>This Month</option>
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
    const searchInput = document.getElementById("step-search-input");
    const toggleFilters = document.getElementById("toggle-filters");
    const clearFilters = document.getElementById("clear-filters");
    const statusFilter = document.getElementById("status-filter");
    const instructionFilter = document.getElementById("instruction-filter");
    const dateFilter = document.getElementById("date-filter");
    const shortcuts = document.querySelectorAll(".search-shortcut");

    // Search input with debouncing
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener("input", (e) => {
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
      toggleFilters.addEventListener("click", () => {
        const advancedFilters = document.getElementById("advanced-filters");
        const toggleText = toggleFilters.querySelector(".filter-toggle-text");

        if (advancedFilters.style.display === "none") {
          advancedFilters.style.display = "flex";
          toggleText.textContent = "Hide Filters";
        } else {
          advancedFilters.style.display = "none";
          toggleText.textContent = "Show Filters";
        }
      });
    }

    // Clear all filters
    if (clearFilters) {
      clearFilters.addEventListener("click", () => {
        this.resetFilters();
        this.performSearch();
      });
    }

    // Filter dropdowns
    if (statusFilter) {
      statusFilter.addEventListener("change", (e) => {
        this.searchState.statusFilter = e.target.value;
        this.performSearch();
        this.saveFiltersToStorage();
      });
    }

    if (instructionFilter) {
      instructionFilter.addEventListener("change", (e) => {
        this.searchState.completedFilter = e.target.value;
        this.performSearch();
        this.saveFiltersToStorage();
      });
    }

    if (dateFilter) {
      dateFilter.addEventListener("change", (e) => {
        this.searchState.dateRange = e.target.value;
        this.performSearch();
        this.saveFiltersToStorage();
      });
    }

    // Quick search shortcuts
    shortcuts.forEach((shortcut) => {
      shortcut.addEventListener("click", (e) => {
        const query = e.target.dataset.query;
        const searchInput = document.getElementById("step-search-input");
        if (searchInput) {
          searchInput.value = query;
          this.searchState.query = query.toLowerCase();
          this.performSearch();
          this.saveFiltersToStorage();
        }
      });
    });

    // TD-003 Phase 2H: Populate status filter dropdown using StatusProvider
    this.populateStatusFilterDropdown();
  }

  /**
   * Populate status filter dropdown using StatusProvider (TD-003 Phase 2H)
   */
  async populateStatusFilterDropdown() {
    const statusFilter = document.getElementById("status-filter");
    if (!statusFilter) {
      console.warn("StepView: Status filter dropdown not found");
      return;
    }

    try {
      // Get status options from StatusProvider
      if (window.StatusProvider) {
        console.debug(
          "StepView: Using StatusProvider for status filter options",
        );
        const statusOptions =
          await window.StatusProvider.getDropdownOptions("Step");

        // Keep the "All Statuses" option and add dynamic options
        const currentSelection = this.searchState.statusFilter;

        // Add status options
        statusOptions.forEach((option) => {
          if (option && option.value) {
            const optionElement = document.createElement("option");
            optionElement.value = option.value;
            optionElement.textContent = option.text || option.value;

            if (currentSelection === option.value) {
              optionElement.selected = true;
            }

            statusFilter.appendChild(optionElement);
          }
        });

        console.debug(
          `StepView: Added ${statusOptions.length} dynamic status options to filter`,
        );
      } else {
        console.warn(
          "StepView: StatusProvider not available, using fallback status options",
        );
        this.populateStatusFilterFallback(statusFilter);
      }
    } catch (error) {
      console.error(
        "StepView: Error populating status filter dropdown:",
        error,
      );
      this.populateStatusFilterFallback(statusFilter);
    }
  }

  /**
   * Fallback method to populate status filter with hardcoded options (TD-003 Phase 2H)
   */
  populateStatusFilterFallback(statusFilter) {
    const fallbackOptions = [
      { value: "PENDING", text: "Pending" },
      { value: "TODO", text: "To Do" },
      { value: "IN_PROGRESS", text: "In Progress" },
      { value: "COMPLETED", text: "Completed" },
      { value: "BLOCKED", text: "Blocked" },
      { value: "FAILED", text: "Failed" },
    ];

    const currentSelection = this.searchState.statusFilter;

    fallbackOptions.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.text;

      if (currentSelection === option.value) {
        optionElement.selected = true;
      }

      statusFilter.appendChild(optionElement);
    });

    console.debug("StepView: Added fallback status options to filter");
  }

  /**
   * Perform search and filtering
   */
  performSearch() {
    const searchResults = {
      instructions: this.filterInstructions(),
      comments: this.filterComments(),
      summary: this.filterSummary(),
    };

    // Apply visual filtering
    this.applyInstructionFiltering(searchResults.instructions);
    this.applyCommentFiltering(searchResults.comments);
    this.applySummaryFiltering(searchResults.summary);

    // Update search results count
    this.updateSearchResultsCount(searchResults);

    console.log("🔍 StepView Search: Applied filters", searchResults);
  }

  /**
   * Filter instructions based on current search state
   */
  filterInstructions() {
    const instructionRows = document.querySelectorAll(".instruction-row");
    const results = [];

    instructionRows.forEach((row, index) => {
      const instructionText =
        row.querySelector(".instruction-body")?.textContent?.toLowerCase() ||
        "";
      const isCompleted = row.classList.contains("completed");

      let matches = true;

      // Text search
      if (
        this.searchState.query &&
        !instructionText.includes(this.searchState.query)
      ) {
        matches = false;
      }

      // Completion filter
      if (this.searchState.completedFilter === "completed" && !isCompleted) {
        matches = false;
      } else if (
        this.searchState.completedFilter === "pending" &&
        isCompleted
      ) {
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
    const comments = document.querySelectorAll(".comment");
    const results = [];

    comments.forEach((comment, index) => {
      const commentText =
        comment.querySelector(".comment-body")?.textContent?.toLowerCase() ||
        "";
      const authorText =
        comment.querySelector(".comment-author")?.textContent?.toLowerCase() ||
        "";
      const timeElement = comment.querySelector(".comment-time");

      let matches = true;

      // Text search (search in both comment body and author)
      if (this.searchState.query) {
        const searchText = commentText + " " + authorText;
        if (!searchText.includes(this.searchState.query)) {
          matches = false;
        }
      }

      // Date filter
      if (this.searchState.dateRange !== "all" && timeElement) {
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
    const summarySection = document.querySelector(".step-summary-section");
    if (!summarySection) return { element: null, matches: true };

    const summaryText = summarySection.textContent?.toLowerCase() || "";
    const currentStatus =
      document
        .querySelector(".step-status-container span")
        ?.textContent?.toLowerCase() || "";

    let matches = true;

    // Text search
    if (
      this.searchState.query &&
      !summaryText.includes(this.searchState.query)
    ) {
      matches = false;
    }

    // Status filter
    if (
      this.searchState.statusFilter !== "all" &&
      !currentStatus.includes(this.searchState.statusFilter.toLowerCase())
    ) {
      matches = false;
    }

    return { element: summarySection, matches };
  }

  /**
   * Apply visual filtering to instructions
   */
  applyInstructionFiltering(results) {
    results.forEach((result) => {
      if (result.matches) {
        result.element.style.display = "";
        result.element.classList.remove("filtered-out");

        // Highlight search terms
        if (this.searchState.query) {
          this.highlightSearchTerm(
            result.element.querySelector(".instruction-body"),
            this.searchState.query,
          );
        } else {
          this.removeHighlights(
            result.element.querySelector(".instruction-body"),
          );
        }
      } else {
        result.element.style.display = "none";
        result.element.classList.add("filtered-out");
      }
    });

    // Show/hide instructions table
    const instructionsSection = document.querySelector(".instructions-section");
    const visibleInstructions = results.filter((r) => r.matches).length;

    if (visibleInstructions === 0 && this.searchState.query) {
      this.showNoResultsMessage(instructionsSection, "instructions");
    } else {
      this.removeNoResultsMessage(instructionsSection);
    }
  }

  /**
   * Apply visual filtering to comments
   */
  applyCommentFiltering(results) {
    results.forEach((result) => {
      if (result.matches) {
        result.element.style.display = "";
        result.element.classList.remove("filtered-out");

        // Highlight search terms
        if (this.searchState.query) {
          this.highlightSearchTerm(
            result.element.querySelector(".comment-body"),
            this.searchState.query,
          );
          this.highlightSearchTerm(
            result.element.querySelector(".comment-author"),
            this.searchState.query,
          );
        } else {
          this.removeHighlights(result.element.querySelector(".comment-body"));
          this.removeHighlights(
            result.element.querySelector(".comment-author"),
          );
        }
      } else {
        result.element.style.display = "none";
        result.element.classList.add("filtered-out");
      }
    });

    // Update comment count display
    const commentsHeader = document.querySelector(".comments-section h3");
    const visibleComments = results.filter((r) => r.matches).length;
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
      result.element.style.display = "";
      result.element.classList.remove("filtered-out");

      // Highlight search terms in summary
      if (this.searchState.query) {
        const textElements = result.element.querySelectorAll("td, th");
        textElements.forEach((el) => {
          if (el.textContent.toLowerCase().includes(this.searchState.query)) {
            this.highlightSearchTerm(el, this.searchState.query);
          }
        });
      } else {
        const textElements = result.element.querySelectorAll("td, th");
        textElements.forEach((el) => this.removeHighlights(el));
      }
    } else {
      result.element.style.opacity = "0.3";
      result.element.classList.add("filtered-out");
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
    const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, "gi");
    const highlightedText = text.replace(
      regex,
      '<mark style="background: #fff2cc; padding: 1px 2px;">$1</mark>',
    );

    if (highlightedText !== text) {
      element.innerHTML = highlightedText;
    }
  }

  /**
   * Remove search highlights
   */
  removeHighlights(element) {
    if (!element) return;

    const marks = element.querySelectorAll("mark");
    marks.forEach((mark) => {
      mark.outerHTML = mark.textContent;
    });
  }

  /**
   * Show no results message
   */
  showNoResultsMessage(container, type) {
    if (!container) return;

    this.removeNoResultsMessage(container);

    const noResultsDiv = document.createElement("div");
    noResultsDiv.className = "no-search-results";
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

    const existingMessage = container.querySelector(".no-search-results");
    if (existingMessage) {
      existingMessage.remove();
    }
  }

  /**
   * Update search results count display
   */
  updateSearchResultsCount(results) {
    const countElement = document.querySelector(".search-results-count");
    if (!countElement) return;

    const visibleInstructions = results.instructions.filter(
      (r) => r.matches,
    ).length;
    const totalInstructions = results.instructions.length;
    const visibleComments = results.comments.filter((r) => r.matches).length;
    const totalComments = results.comments.length;

    if (this.searchState.query || this.hasActiveFilters()) {
      const parts = [];

      if (totalInstructions > 0) {
        parts.push(`${visibleInstructions}/${totalInstructions} instructions`);
      }

      if (totalComments > 0) {
        parts.push(`${visibleComments}/${totalComments} comments`);
      }

      countElement.textContent =
        parts.length > 0 ? `Found: ${parts.join(", ")}` : "";
    } else {
      countElement.textContent = "";
    }
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters() {
    return (
      this.searchState.statusFilter !== "all" ||
      this.searchState.completedFilter !== "all" ||
      this.searchState.dateRange !== "all"
    );
  }

  /**
   * Reset all filters
   */
  resetFilters() {
    this.searchState = {
      query: "",
      statusFilter: "all",
      teamFilter: "all",
      completedFilter: "all",
      dateRange: "all",
    };

    // Reset UI elements
    const searchInput = document.getElementById("step-search-input");
    const statusFilter = document.getElementById("status-filter");
    const instructionFilter = document.getElementById("instruction-filter");
    const dateFilter = document.getElementById("date-filter");

    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "all";
    if (instructionFilter) instructionFilter.value = "all";
    if (dateFilter) dateFilter.value = "all";

    this.saveFiltersToStorage();
  }

  /**
   * Parse relative time strings (e.g., "2 hours ago")
   */
  parseTimeAgo(timeString) {
    const now = new Date();

    if (timeString.includes("just now")) {
      return now;
    }

    const match = timeString.match(/(\d+)\s+(minute|hour|day|week)s?\s+ago/);
    if (!match) return now;

    const value = parseInt(match[1]);
    const unit = match[2];

    const result = new Date(now);

    switch (unit) {
      case "minute":
        result.setMinutes(result.getMinutes() - value);
        break;
      case "hour":
        result.setHours(result.getHours() - value);
        break;
      case "day":
        result.setDate(result.getDate() - value);
        break;
      case "week":
        result.setDate(result.getDate() - value * 7);
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
      case "today":
        return date >= today;
      case "week":
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      case "month":
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
      localStorage.setItem(
        "umig-stepview-filters",
        JSON.stringify(this.searchState),
      );
    } catch (error) {
      console.warn("Failed to save search filters to localStorage:", error);
    }
  }

  /**
   * Load filters from localStorage
   */
  loadFiltersFromStorage() {
    try {
      const saved = localStorage.getItem("umig-stepview-filters");
      if (saved) {
        const parsed = JSON.parse(saved);
        this.searchState = { ...this.searchState, ...parsed };
      }
    } catch (error) {
      console.warn("Failed to load search filters from localStorage:", error);
    }
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

    if (!["PILOT", "ADMIN"].includes(userRole)) {
      console.log(
        "🔒 StepView: PILOT features disabled for user role:",
        userRole,
      );
      return;
    }

    console.log("🚁 StepView: Initializing PILOT features for role:", userRole);

    // Add bulk operations UI
    this.addBulkOperationsUI();

    // Add advanced controls
    this.addAdvancedControls();

    // Add keyboard shortcuts
    this.addKeyboardShortcuts();

    // Add debug information panel
    if (userRole === "ADMIN") {
      this.addDebugPanel();
    }
  }

  /**
   * Add bulk operations interface
   */
  addBulkOperationsUI() {
    const instructionsSection = document.querySelector(".instructions-section");
    if (!instructionsSection) {
      console.warn(
        "⚠️ StepView: Instructions section not found for bulk operations UI. Features will be skipped.",
      );
      return;
    }

    // Create bulk operations toolbar
    const bulkToolbar = document.createElement("div");
    bulkToolbar.className = "pilot-bulk-toolbar";
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

    // Add enable bulk operations toggle first
    const enableBulkBtn = document.createElement("button");
    enableBulkBtn.className = "aui-button aui-button-primary pilot-only";
    enableBulkBtn.textContent = "🚁 Enable Bulk Operations";
    enableBulkBtn.id = "enable-bulk-operations";
    enableBulkBtn.style.marginBottom = "12px";

    // Insert bulk toolbar before instructions table
    const instructionsTable = instructionsSection.querySelector("table.aui");
    if (instructionsTable) {
      // Insert enable button before instructions table
      instructionsTable.parentNode.insertBefore(
        enableBulkBtn,
        instructionsTable,
      );
      // Insert bulk toolbar before instructions table (after the button)
      instructionsTable.parentNode.insertBefore(bulkToolbar, instructionsTable);
    } else {
      console.warn(
        "⚠️ StepView: Instructions table not found for bulk operations UI",
      );
      return;
    }

    // Attach event listeners
    this.attachBulkOperationListeners();
  }

  /**
   * Add advanced controls for PILOT users
   */
  addAdvancedControls() {
    const stepHeader = document.querySelector(
      ".panel-header, .step-view-header",
    );
    if (!stepHeader) {
      console.warn(
        "⚠️ StepView: Step header not found for PILOT advanced controls. Controls will be skipped.",
      );
      return;
    }

    // Check if advanced controls already exist to prevent duplication
    const existing = stepHeader.querySelector(".pilot-advanced-controls");
    if (existing) {
      console.log(
        "🔄 StepView: Advanced controls already exist, skipping creation",
      );
      return;
    }

    // Add advanced controls panel
    const advancedControls = document.createElement("div");
    advancedControls.className = "pilot-advanced-controls";
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
          <button type="button" class="aui-button aui-button-subtle" id="email-step-details" title="Email step details to stakeholders">
            📧 Email Step Details
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
    document.addEventListener("keydown", (e) => {
      // Only handle shortcuts when not in input fields
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) {
        return;
      }

      // Ctrl/Cmd + shortcuts (Extended shortcuts for PILOT/ADMIN users)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "a":
            // Select all instructions - requires bulk operations permission
            if (this.hasPermission("bulk_operations")) {
              e.preventDefault();
              this.selectAllInstructions();
            }
            break;
          case "r":
            // Force refresh - requires force refresh permission
            if (this.hasPermission("force_refresh_cache")) {
              e.preventDefault();
              this.forceRefreshData();
            }
            break;
          case "e":
            // Export data - requires advanced controls permission
            if (this.hasPermission("advanced_controls")) {
              e.preventDefault();
              this.exportStepData();
            }
            break;
          case "f":
            // Focus search - available to all users (basic functionality)
            e.preventDefault();
            this.focusSearchInput();
            break;
          case "m":
            // Email step details - requires email permission (PILOT/ADMIN only)
            if (
              this.hasPermission("email_step_details") &&
              this.pilotFeatures
            ) {
              e.preventDefault();
              this.pilotFeatures.emailStepDetails();
            }
            break;
        }
      }

      // Other shortcuts
      switch (e.key) {
        case "Escape":
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
    const debugPanel = document.createElement("div");
    debugPanel.className = "admin-debug-panel";
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
          <div class="debug-item">Step ID: <span id="debug-step-id">${this.stepView.currentStepInstanceId || "None"}</span></div>
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
    document
      .getElementById("close-debug-panel")
      ?.addEventListener("click", () => {
        debugPanel.remove();
      });
  }

  /**
   * Attach event listeners for bulk operations
   */
  attachBulkOperationListeners() {
    // Enable bulk operations toggle
    document
      .getElementById("enable-bulk-operations")
      ?.addEventListener("click", () => {
        this.toggleBulkOperations();
      });

    // Bulk action buttons
    document
      .getElementById("bulk-complete-btn")
      ?.addEventListener("click", () => {
        this.performBulkOperation("complete");
      });

    document
      .getElementById("bulk-incomplete-btn")
      ?.addEventListener("click", () => {
        this.performBulkOperation("incomplete");
      });

    document
      .getElementById("bulk-duplicate-btn")
      ?.addEventListener("click", () => {
        this.performBulkOperation("duplicate");
      });

    document
      .getElementById("bulk-export-btn")
      ?.addEventListener("click", () => {
        this.performBulkOperation("export");
      });

    // Selection controls
    document
      .getElementById("bulk-select-all")
      ?.addEventListener("click", () => {
        this.selectAllInstructions();
      });

    document
      .getElementById("bulk-clear-selection")
      ?.addEventListener("click", () => {
        this.clearSelection();
      });
  }

  /**
   * Attach event listeners for advanced controls
   */
  attachAdvancedControlListeners() {
    document
      .getElementById("refresh-step-data")
      ?.addEventListener("click", () => {
        this.forceRefreshData();
      });

    document
      .getElementById("export-step-data")
      ?.addEventListener("click", () => {
        this.exportStepData();
      });

    document.getElementById("clone-step")?.addEventListener("click", () => {
      this.cloneStep();
    });

    document.getElementById("step-history")?.addEventListener("click", () => {
      this.showStepHistory();
    });

    document
      .getElementById("email-step-details")
      ?.addEventListener("click", () => {
        if (
          this.validatePermission("email_step_details", "email step details") &&
          this.pilotFeatures
        ) {
          this.pilotFeatures.emailStepDetails();
        }
      });

    document
      .getElementById("edit-step-metadata")
      ?.addEventListener("click", () => {
        this.editStepMetadata();
      });
  }

  /**
   * Toggle bulk operations mode
   */
  toggleBulkOperations() {
    this.bulkOperationsEnabled = !this.bulkOperationsEnabled;
    const toggleBtn = document.getElementById("enable-bulk-operations");
    const bulkToolbar = document.querySelector(".bulk-toolbar-content");

    if (this.bulkOperationsEnabled) {
      toggleBtn.textContent = "❌ Disable Bulk Operations";
      toggleBtn.className = "aui-button pilot-only";
      bulkToolbar.style.display = "block";

      // Add checkboxes to instruction rows
      this.addInstructionCheckboxes();

      this.stepView.showNotification("Bulk operations enabled", "info");
    } else {
      toggleBtn.textContent = "🚁 Enable Bulk Operations";
      toggleBtn.className = "aui-button aui-button-primary pilot-only";
      bulkToolbar.style.display = "none";

      // Remove checkboxes
      this.removeInstructionCheckboxes();
      this.clearSelection();

      this.stepView.showNotification("Bulk operations disabled", "info");
    }
  }

  /**
   * Add checkboxes to instruction rows for bulk selection
   */
  addInstructionCheckboxes() {
    const instructionRows = document.querySelectorAll(".instruction-row");

    instructionRows.forEach((row) => {
      const instructionId = row.querySelector(".instruction-checkbox")?.dataset
        ?.instructionId;
      if (!instructionId) return;

      // Don't add if checkbox already exists
      if (row.querySelector(".bulk-selection-checkbox")) return;

      const bulkCheckbox = document.createElement("input");
      bulkCheckbox.type = "checkbox";
      bulkCheckbox.className = "bulk-selection-checkbox";
      bulkCheckbox.dataset.instructionId = instructionId;
      bulkCheckbox.style.marginRight = "8px";

      // Insert at the beginning of the row
      const firstCell = row.querySelector("td");
      if (firstCell) {
        firstCell.insertBefore(bulkCheckbox, firstCell.firstChild);
      }

      // Add change listener
      bulkCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.selectedInstructions.add(instructionId);
          row.classList.add("bulk-selected");
        } else {
          this.selectedInstructions.delete(instructionId);
          row.classList.remove("bulk-selected");
        }
        this.updateBulkSelectionUI();
      });
    });
  }

  /**
   * Remove bulk selection checkboxes
   */
  removeInstructionCheckboxes() {
    document
      .querySelectorAll(".bulk-selection-checkbox")
      .forEach((checkbox) => {
        checkbox.remove();
      });

    document.querySelectorAll(".instruction-row").forEach((row) => {
      row.classList.remove("bulk-selected");
    });
  }

  /**
   * Select all instructions for bulk operations
   */
  selectAllInstructions() {
    if (!this.bulkOperationsEnabled) return;

    const checkboxes = document.querySelectorAll(".bulk-selection-checkbox");
    checkboxes.forEach((checkbox) => {
      checkbox.checked = true;
      const instructionId = checkbox.dataset.instructionId;
      this.selectedInstructions.add(instructionId);
      checkbox.closest(".instruction-row")?.classList.add("bulk-selected");
    });

    this.updateBulkSelectionUI();
    this.stepView.showNotification("All instructions selected", "info");
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.selectedInstructions.clear();

    document
      .querySelectorAll(".bulk-selection-checkbox")
      .forEach((checkbox) => {
        checkbox.checked = false;
      });

    document.querySelectorAll(".instruction-row").forEach((row) => {
      row.classList.remove("bulk-selected");
    });

    this.updateBulkSelectionUI();
  }

  /**
   * Update bulk selection UI based on current selection
   */
  updateBulkSelectionUI() {
    const selectedCount = this.selectedInstructions.size;
    const countElement = document.getElementById("selected-count");
    const bulkButtons = document.querySelectorAll(
      "#bulk-complete-btn, #bulk-incomplete-btn, #bulk-duplicate-btn, #bulk-export-btn",
    );

    if (countElement) {
      countElement.textContent = selectedCount.toString();
    }

    // Enable/disable bulk action buttons
    bulkButtons.forEach((btn) => {
      btn.disabled = selectedCount === 0;
    });

    // Update debug panel if exists
    const debugSelection = document.getElementById("debug-selection-count");
    if (debugSelection) {
      debugSelection.textContent = `${selectedCount} items`;
    }
  }

  /**
   * Perform bulk operation with security validation
   */
  async performBulkOperation(operation) {
    if (this.selectedInstructions.size === 0) {
      this.stepView.showNotification("No instructions selected", "warning");
      return;
    }

    // Security confirmation for destructive operations
    if (["duplicate", "complete"].includes(operation)) {
      const confirmed = await this.showSecurityConfirmation(
        operation,
        this.selectedInstructions.size,
      );
      if (!confirmed) return;
    }

    this.showBulkProgress(true);

    try {
      switch (operation) {
        case "complete":
          await this.bulkCompleteInstructions();
          break;
        case "incomplete":
          await this.bulkIncompleteInstructions();
          break;
        case "duplicate":
          await this.bulkDuplicateInstructions();
          break;
        case "export":
          await this.bulkExportInstructions();
          break;
      }

      this.stepView.showNotification(
        `Bulk ${operation} completed successfully`,
        "success",
      );

      // Refresh step data to reflect changes
      await this.forceRefreshData();
    } catch (error) {
      console.error(`Bulk ${operation} failed:`, error);
      this.stepView.showNotification(
        `Bulk ${operation} failed: ${error.message}`,
        "error",
      );
    } finally {
      this.showBulkProgress(false);
    }
  }

  /**
   * Show security confirmation dialog
   */
  showSecurityConfirmation(operation, count) {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "security-confirmation-modal";
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
      modal.querySelector("#security-cancel").addEventListener("click", () => {
        modal.remove();
        resolve(false);
      });

      modal.querySelector("#security-confirm").addEventListener("click", () => {
        modal.remove();
        resolve(true);
      });

      // ESC key closes modal
      const handleEsc = (e) => {
        if (e.key === "Escape") {
          modal.remove();
          document.removeEventListener("keydown", handleEsc);
          resolve(false);
        }
      };
      document.addEventListener("keydown", handleEsc);
    });
  }

  /**
   * Show/hide bulk operation progress
   */
  showBulkProgress(show, details = "") {
    const progressDiv = document.getElementById("bulk-progress");
    const detailsSpan = document.getElementById("progress-details");

    if (progressDiv) {
      progressDiv.style.display = show ? "block" : "none";
    }

    if (detailsSpan && details) {
      detailsSpan.textContent = details;
    }
  }

  /**
   * Bulk complete instructions
   */
  async bulkCompleteInstructions() {
    const promises = Array.from(this.selectedInstructions).map(
      async (instructionId, index) => {
        this.showBulkProgress(
          true,
          `Completing ${index + 1}/${this.selectedInstructions.size}`,
        );

        return this.stepView.completeInstruction(
          this.stepView.currentStepInstanceId,
          instructionId,
        );
      },
    );

    await Promise.allSettled(promises);
  }

  /**
   * Bulk incomplete instructions
   */
  async bulkIncompleteInstructions() {
    const promises = Array.from(this.selectedInstructions).map(
      async (instructionId, index) => {
        this.showBulkProgress(
          true,
          `Reverting ${index + 1}/${this.selectedInstructions.size}`,
        );

        return this.stepView.uncompleteInstruction(
          this.stepView.currentStepInstanceId,
          instructionId,
        );
      },
    );

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
          cacheStats: this.stepView.cache.getCacheStats(),
        },
      };

      const dataStr = JSON.stringify(stepData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(dataBlob);
      link.download = `step-${this.stepView.currentStepCode}-${Date.now()}.json`;
      link.click();

      this.stepView.showNotification(
        "Step data exported successfully",
        "success",
      );
    } catch (error) {
      console.error("Export failed:", error);
      this.stepView.showNotification("Export failed", "error");
    }
  }

  /**
   * Force refresh step data
   */
  async forceRefreshData() {
    try {
      this.stepView.cache.clearCache();

      const container = document.querySelector(".step-details-panel");
      if (
        container &&
        this.stepView.currentMigration &&
        this.stepView.currentIteration &&
        this.stepView.currentStepCode
      ) {
        await this.stepView.loadStepDetails(
          this.stepView.currentMigration,
          this.stepView.currentIteration,
          this.stepView.currentStepCode,
          container,
        );

        // Re-initialize PILOT features
        this.initializePilotFeatures();
      }

      this.stepView.showNotification("Step data refreshed", "success");
    } catch (error) {
      console.error("Refresh failed:", error);
      this.stepView.showNotification("Refresh failed", "error");
    }
  }

  /**
   * Get step summary data for export
   */
  getStepSummaryData() {
    const summary = {};
    const summaryTable = document.querySelector(
      ".step-summary-section table.aui tbody",
    );

    if (summaryTable) {
      summaryTable.querySelectorAll("tr").forEach((row) => {
        const th = row.querySelector("th");
        const td = row.querySelector("td");
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
    const instructionRows = document.querySelectorAll(".instruction-row");

    instructionRows.forEach((row) => {
      const checkbox = row.querySelector(".instruction-checkbox");
      const order = row
        .querySelector(".instruction-order")
        ?.textContent?.trim();
      const body = row.querySelector(".instruction-body")?.textContent?.trim();
      const duration = row
        .querySelector(".instruction-duration")
        ?.textContent?.trim();

      if (checkbox && body) {
        instructions.push({
          id: checkbox.dataset.instructionId,
          order: order,
          description: body,
          duration: duration,
          completed: checkbox.checked,
          selected: this.selectedInstructions.has(
            checkbox.dataset.instructionId,
          ),
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
    const commentElements = document.querySelectorAll(".comment");

    commentElements.forEach((comment) => {
      const author = comment
        .querySelector(".comment-author")
        ?.textContent?.trim();
      const time = comment.querySelector(".comment-time")?.textContent?.trim();
      const body = comment.querySelector(".comment-body")?.textContent?.trim();
      const commentId = comment.dataset.commentId;

      if (author && body) {
        comments.push({
          id: commentId,
          author: author,
          time: time,
          body: body,
        });
      }
    });

    return comments;
  }

  /**
   * Update debug information
   */
  updateDebugInfo() {
    const cacheStatus = document.getElementById("debug-cache-status");
    const pollingStatus = document.getElementById("debug-polling-status");
    const lastSync = document.getElementById("debug-last-sync");

    if (cacheStatus && this.stepView.cache) {
      const stats = this.stepView.cache.getCacheStats();
      cacheStatus.textContent = `${stats.size} items, TTL: ${stats.ttl}ms`;
    }

    if (pollingStatus && this.stepView.cache) {
      const stats = this.stepView.cache.getCacheStats();
      pollingStatus.textContent = stats.isPolling
        ? `Active (${stats.interval}ms)`
        : "Inactive";
    }

    if (lastSync && this.stepView.cache) {
      const stats = this.stepView.cache.getCacheStats();
      if (stats.lastRefresh) {
        const ago = Date.now() - stats.lastRefresh;
        lastSync.textContent = `${Math.round(ago / 1000)}s ago`;
      } else {
        lastSync.textContent = "Never";
      }
    }
  }

  /**
   * Add keyboard shortcuts help
   */
  addKeyboardShortcutsHelp() {
    const helpButton = document.createElement("button");
    helpButton.className = "aui-button aui-button-subtle pilot-only";
    helpButton.textContent = "⌨️ Shortcuts";
    helpButton.style.position = "fixed";
    helpButton.style.bottom = "80px";
    helpButton.style.right = "20px";
    helpButton.style.zIndex = "8887";

    helpButton.addEventListener("click", () => {
      this.showKeyboardShortcuts();
    });

    document.body.appendChild(helpButton);
  }

  /**
   * Show keyboard shortcuts modal with role-based shortcuts
   */
  showKeyboardShortcuts() {
    const modal = document.createElement("div");

    // Build shortcuts based on user permissions
    let shortcutsHTML = "";

    // Basic shortcuts available to all users
    shortcutsHTML += `
      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px 0; color: #0052cc;">Basic Shortcuts (All Users)</h4>
        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px 16px; font-size: 14px;">
          <strong>Ctrl/Cmd + F</strong><span>Focus search input</span>
          <strong>Escape</strong><span>Clear selection / Close modals</span>
        </div>
      </div>
    `;

    // Extended shortcuts for PILOT/ADMIN users
    if (
      this.stepView.hasPermission("advanced_controls") ||
      this.stepView.hasPermission("bulk_operations")
    ) {
      shortcutsHTML += `
        <div style="margin-bottom: 16px;">
          <h4 style="margin: 0 0 8px 0; color: #ff8b00;">Extended Shortcuts (PILOT/ADMIN)</h4>
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px 16px; font-size: 14px;">
      `;

      if (this.stepView.hasPermission("bulk_operations")) {
        shortcutsHTML += `<strong>Ctrl/Cmd + A</strong><span>Select all instructions</span>`;
      }
      if (this.stepView.hasPermission("force_refresh_cache")) {
        shortcutsHTML += `<strong>Ctrl/Cmd + R</strong><span>Force refresh data</span>`;
      }
      if (this.stepView.hasPermission("advanced_controls")) {
        shortcutsHTML += `<strong>Ctrl/Cmd + E</strong><span>Export step data</span>`;
      }
      if (this.stepView.hasPermission("email_step_details")) {
        shortcutsHTML += `<strong>Ctrl/Cmd + M</strong><span>Email step details</span>`;
      }

      shortcutsHTML += `
          </div>
        </div>
      `;
    }

    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 24px; border-radius: 8px; max-width: 600px; width: 90%; max-height: 70vh; overflow-y: auto;">
          <h3 style="margin: 0 0 16px 0; display: flex; align-items: center;">
            ⌨️ Keyboard Shortcuts 
            <span style="margin-left: auto; background: #0052cc; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: normal;">
              ${this.stepView.userRole} User
            </span>
          </h3>
          ${shortcutsHTML}
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee; text-align: right;">
            <button class="aui-button aui-button-primary" id="close-shortcuts">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#close-shortcuts").addEventListener("click", () => {
      modal.remove();
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal.firstElementChild.parentElement) {
        modal.remove();
      }
    });
  }

  /**
   * Focus search input for keyboard navigation
   */
  focusSearchInput() {
    const searchInput = document.getElementById("step-search-input");
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  /**
   * Close all modals
   */
  closeModals() {
    document.querySelectorAll('[style*="position: fixed"]').forEach((modal) => {
      if (modal.style.zIndex >= "10000") {
        modal.remove();
      }
    });
  }

  /**
   * Placeholder methods for future implementation
   */
  async bulkDuplicateInstructions() {
    this.stepView.showNotification(
      "Bulk duplicate functionality coming soon",
      "info",
    );
  }

  async bulkExportInstructions() {
    const selectedData = this.getInstructionsData().filter((inst) =>
      this.selectedInstructions.has(inst.id),
    );

    const dataStr = JSON.stringify(selectedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = `selected-instructions-${Date.now()}.json`;
    link.click();
  }

  cloneStep() {
    this.stepView.showNotification(
      "Clone step functionality coming soon",
      "info",
    );
  }

  showStepHistory() {
    this.stepView.showNotification(
      "Step history functionality coming soon",
      "info",
    );
  }

  editStepMetadata() {
    this.stepView.showNotification(
      "Edit metadata functionality coming soon",
      "info",
    );
  }

  /**
   * Email step details to stakeholders (PILOT/ADMIN only)
   */
  async emailStepDetails() {
    if (
      !this.stepView.validatePermission(
        "email_step_details",
        "email step details",
      )
    ) {
      return;
    }

    try {
      // Gather current step data
      const stepData = {
        stepSummary: this.getStepSummaryData(),
        instructions: this.getInstructionsData(),
        comments: this.getCommentsData(),
        metadata: {
          migration: this.stepView.currentMigration,
          iteration: this.stepView.currentIteration,
          stepCode: this.stepView.currentStepCode,
          sentBy: this.stepView.userId,
          sentAt: new Date().toISOString(),
          userRole: this.stepView.userRole,
        },
      };

      // Show email composition dialog
      this.showEmailDialog(stepData);
    } catch (error) {
      console.error("Failed to prepare email data:", error);
      this.stepView.showNotification(
        `Failed to prepare email: ${error.message}`,
        "error",
      );
    }
  }

  /**
   * Show email composition dialog
   */
  showEmailDialog(stepData) {
    const dialog = document.createElement("div");
    dialog.className = "email-dialog-overlay";
    dialog.innerHTML = `
      <div class="email-dialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 600px; max-width: 90vw; z-index: 9999;">
        <div class="email-header" style="padding: 16px; border-bottom: 1px solid #eee; background: #f5f5f5;">
          <h3 style="margin: 0; display: flex; align-items: center;">
            📧 Email Step Details: ${stepData.metadata.stepCode}
            <button type="button" class="close-email-dialog" style="margin-left: auto; background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">&times;</button>
          </h3>
        </div>
        <div class="email-body" style="padding: 16px;">
          <form id="email-step-form">
            <div class="form-group" style="margin-bottom: 16px;">
              <label for="email-recipients" style="display: block; margin-bottom: 4px; font-weight: 600;">To:</label>
              <input type="email" id="email-recipients" name="recipients" multiple placeholder="Enter email addresses (comma separated)" 
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" required>
              <small style="color: #666; font-size: 12px;">Separate multiple emails with commas</small>
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
              <label for="email-subject" style="display: block; margin-bottom: 4px; font-weight: 600;">Subject:</label>
              <input type="text" id="email-subject" name="subject" value="Step Update: ${stepData.metadata.stepCode} in ${stepData.metadata.migration}/${stepData.metadata.iteration}"
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
              <label for="email-message" style="display: block; margin-bottom: 4px; font-weight: 600;">Message:</label>
              <textarea id="email-message" name="message" rows="6" placeholder="Add your message here..."
                style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"></textarea>
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
              <label style="display: flex; align-items: center;">
                <input type="checkbox" id="include-instructions" name="includeInstructions" checked style="margin-right: 8px;">
                Include instruction details in email
              </label>
              <label style="display: flex; align-items: center; margin-top: 8px;">
                <input type="checkbox" id="include-comments" name="includeComments" checked style="margin-right: 8px;">
                Include comments in email
              </label>
            </div>
          </form>
        </div>
        <div class="email-footer" style="padding: 16px; border-top: 1px solid #eee; background: #f5f5f5; display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button" class="aui-button cancel-email">Cancel</button>
          <button type="button" class="aui-button aui-button-primary send-email">📧 Send Email</button>
        </div>
      </div>
      <div class="email-backdrop" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9998;"></div>
    `;

    document.body.appendChild(dialog);

    // Add event listeners
    const closeDialog = () => {
      document.body.removeChild(dialog);
    };

    dialog
      .querySelector(".close-email-dialog")
      .addEventListener("click", closeDialog);
    dialog
      .querySelector(".cancel-email")
      .addEventListener("click", closeDialog);
    dialog
      .querySelector(".email-backdrop")
      .addEventListener("click", closeDialog);

    dialog.querySelector(".send-email").addEventListener("click", () => {
      this.sendStepEmail(stepData, dialog);
    });

    // Focus on recipients field
    dialog.querySelector("#email-recipients").focus();
  }

  /**
   * Send the step email
   */
  async sendStepEmail(stepData, dialog) {
    const form = dialog.querySelector("#email-step-form");
    const formData = new FormData(form);

    const recipients = formData
      .get("recipients")
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email);
    const subject = formData.get("subject");
    const message = formData.get("message");
    const includeInstructions = formData.has("includeInstructions");
    const includeComments = formData.has("includeComments");

    if (recipients.length === 0) {
      this.stepView.showNotification(
        "Please enter at least one email recipient",
        "warning",
      );
      return;
    }

    try {
      // Show loading state
      const sendBtn = dialog.querySelector(".send-email");
      const originalText = sendBtn.textContent;
      sendBtn.textContent = "Sending...";
      sendBtn.disabled = true;

      // Prepare email payload
      const emailPayload = {
        recipients: recipients,
        subject: subject,
        message: message,
        stepData: {
          summary: stepData.stepSummary,
          instructions: includeInstructions ? stepData.instructions : [],
          comments: includeComments ? stepData.comments : [],
          metadata: stepData.metadata,
        },
        includeInstructions: includeInstructions,
        includeComments: includeComments,
      };

      // Send email request to backend
      const response = await fetch(
        `${this.stepView.config.api.baseUrl}/stepViewApi/email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        },
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(
          errorData.error || `Failed to send email: ${response.status}`,
        );
      }

      const result = await response.json();

      // Close dialog and show success message
      document.body.removeChild(dialog);
      this.stepView.showNotification(
        `Email sent successfully to ${recipients.length} recipient(s)`,
        "success",
      );

      // Log the action for audit trail
      this.stepView.logSecurityEvent("email_sent", {
        recipients: recipients.length,
        stepCode: stepData.metadata.stepCode,
        includeInstructions: includeInstructions,
        includeComments: includeComments,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to send email:", error);
      this.stepView.showNotification(
        `Failed to send email: ${error.message}`,
        "error",
      );

      // Restore button state
      const sendBtn = dialog.querySelector(".send-email");
      sendBtn.textContent = originalText;
      sendBtn.disabled = false;
    }
  }
}

class StepView {
  constructor() {
    this.config = window.UMIG_STEP_CONFIG || {
      api: { baseUrl: "/rest/scriptrunner/latest/custom" },
    };
    this.currentStepInstanceId = null;
    this.userContext = null; // Full user context for email/audit operations
    this.userRole = this.config.user?.role || null; // null for unknown users, no fallback to NORMAL
    this.isAdmin = this.config.user?.isAdmin || false;
    this.userId = this.config.user?.id || null;

    // 🚨 CRITICAL RBAC DEBUG: Trace role detection flow
    console.log("🔍 StepView RBAC Debug: Role Detection Analysis");
    console.log("  📋 Raw config.user:", this.config.user);
    console.log("  📋 config.user?.role:", this.config.user?.role);
    console.log("  🎯 Final userRole:", this.userRole);
    console.log("  🔑 userRole type:", typeof this.userRole);
    console.log("  ✅ isAdmin:", this.isAdmin);
    console.log("  ✅ userId:", this.userId);

    // Static badge condition check
    const shouldShowStaticBadge =
      this.userRole === null || this.userRole === undefined;
    console.log("  🎨 Should show static badge:", shouldShowStaticBadge);
    console.log("  🎨 Static badge condition: userRole === null || undefined");

    if (shouldShowStaticBadge) {
      console.log("  🏷️  RBAC Decision: Unknown user → Static badge only");
    } else {
      console.log(
        "  🎛️  RBAC Decision: Known user (" +
          this.userRole +
          ") → Dropdown controls",
      );
    }

    // Initialize cache system for real-time synchronization
    this.cache = new StepViewCache();

    // Store fetched statuses for consistent badge and dropdown display
    this.statusesMap = new Map(); // ID -> {id, name, color}
    this.currentMigration = null;
    this.currentIteration = null;
    this.currentStepCode = null;
    this.currentMigrationName = null;
    this.currentIterationName = null;

    // Initialize search and filtering system
    // US-036: Search/filter functionality removed - not needed for single step view
    // this.searchFilter = new StepViewSearchFilter(); // REMOVED

    // RBAC: Initialize permission system
    this.initializeRBACSystem();

    // Initialize on DOM ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  /**
   * Initialize comprehensive RBAC permission system
   */
  initializeRBACSystem() {
    console.log(
      "🔒 StepView: Initializing RBAC system for role:",
      this.userRole,
    );

    try {
      // Get canonical permissions matrix from single source of truth
      this.permissions = this.getEmergencyPermissions();

      // 🔒 Freeze permissions object for immutability and security
      Object.freeze(this.permissions);

      console.log(
        "✅ RBAC: Permissions matrix initialized successfully with 11 features",
      );
    } catch (error) {
      console.error("🚨 CRITICAL: RBAC initialization failed:", error);

      // Emergency fallback - use method to ensure consistency
      try {
        this.permissions = this.getEmergencyPermissions();
        Object.freeze(this.permissions);
        console.warn("⚠️ RBAC: Emergency fallback permissions applied");
      } catch (fallbackError) {
        console.error(
          "💥 FATAL: Even emergency RBAC fallback failed:",
          fallbackError,
        );
        // Last resort minimal permissions for unknown users
        this.permissions = {};
        Object.freeze(this.permissions);
      }
    }

    // Security event log for ADMIN monitoring
    this.securityLog = [];

    // Debug permission checks for unknown users - MOVED TO AFTER permissions initialization
    if (this.userRole === null || this.userRole === undefined) {
      console.log("🚨 RBAC Debug: Unknown user permission analysis:");
      console.log(
        "  🎛️  update_step_status:",
        this.hasPermission("update_step_status"),
      );
      console.log(
        "  ✅  complete_instructions:",
        this.hasPermission("complete_instructions"),
      );
      console.log("  📝  add_comments:", this.hasPermission("add_comments"));
      console.log(
        "  🔧  advanced_controls:",
        this.hasPermission("advanced_controls"),
      );
      console.log("  📊  Expected: All false for unknown users");
    }
  }

  /**
   * Get canonical permissions matrix - single source of truth
   * @returns {object} - Complete permissions matrix with all 11 permissions
   */
  getEmergencyPermissions() {
    return {
      view_step_details: ["NORMAL", "PILOT", "ADMIN"],
      add_comments: ["NORMAL", "PILOT", "ADMIN"],
      update_step_status: ["NORMAL", "PILOT", "ADMIN"],
      complete_instructions: ["NORMAL", "PILOT", "ADMIN"],
      bulk_operations: ["PILOT", "ADMIN"],
      email_step_details: ["PILOT", "ADMIN"],
      advanced_controls: ["PILOT", "ADMIN"],
      extended_shortcuts: ["PILOT", "ADMIN"],
      debug_panel: ["ADMIN"],
      force_refresh_cache: ["PILOT", "ADMIN"],
      security_logging: ["ADMIN"],
    };
  }

  /**
   * Check if current user has permission for specific feature
   * @param {string} feature - Feature permission key
   * @returns {boolean} - True if user has permission
   */
  hasPermission(feature) {
    // 🛡️ DEFENSIVE: Ensure permissions object exists to prevent crashes
    if (!this.permissions || typeof this.permissions !== "object") {
      console.error(
        "🚨 CRITICAL: permissions object is undefined - reinitializing RBAC system",
      );
      this.initializeRBACSystem();
    }

    const allowed = this.permissions[feature] || [];
    const hasAccess = allowed.includes(this.userRole);

    // 🚨 CRITICAL RBAC DEBUG: Log permission checks for unknown users
    if (this.userRole === null || this.userRole === undefined) {
      console.log(
        `🔒 Permission Check: ${feature} for unknown user (${this.userRole}) → ${hasAccess}`,
      );
      console.log(`   Allowed roles: [${allowed.join(", ")}]`);
    }

    if (!hasAccess) {
      this.logSecurityEvent("permission_denied", {
        feature: feature,
        userRole: this.userRole,
        timestamp: new Date().toISOString(),
        stackTrace: new Error().stack,
      });
    }

    return hasAccess;
  }

  /**
   * Validate permission and show user feedback if denied
   * @param {string} feature - Feature permission key
   * @param {string} action - Action description for user feedback
   * @returns {boolean} - True if permission granted
   */
  validatePermission(feature, action = "perform this action") {
    if (!this.hasPermission(feature)) {
      this.showPermissionDeniedMessage(action, feature);
      return false;
    }
    return true;
  }

  /**
   * Show user-friendly permission denied message
   * @param {string} action - Action that was attempted
   * @param {string} feature - Feature that was denied
   */
  showPermissionDeniedMessage(action, feature) {
    const roleMessages = {
      NORMAL:
        "This action requires elevated permissions. Contact your administrator for PILOT or ADMIN access.",
      PILOT:
        "This action requires ADMIN permissions. Contact your administrator.",
      ADMIN: "Permission denied for security reasons.",
    };

    const message = roleMessages[this.userRole] || "Permission denied.";

    // Create visual feedback
    const notification = document.createElement("div");
    notification.className = "rbac-notification rbac-denied";
    notification.innerHTML = `
      <div class="rbac-icon">🔒</div>
      <div class="rbac-message">
        <strong>Access Denied</strong><br>
        ${message}
      </div>
      <button class="rbac-close" onclick="this.parentElement.remove()">×</button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Log security events for monitoring and audit trail
   * @param {string} event - Event type
   * @param {Object} details - Event details
   */
  logSecurityEvent(event, details = {}) {
    const logEntry = {
      event: event,
      userRole: this.userRole,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...details,
    };

    this.securityLog.push(logEntry);
    console.log("🛡️ StepView Security Log:", logEntry);

    // Keep last 100 entries only
    if (this.securityLog.length > 100) {
      this.securityLog = this.securityLog.slice(-100);
    }

    // Send critical security events to backend (implement as needed)
    if (
      ["permission_denied", "role_override", "unauthorized_access"].includes(
        event,
      )
    ) {
      this.reportSecurityEvent(logEntry);
    }
  }

  /**
   * Report critical security events to backend
   * @param {Object} logEntry - Security log entry
   */
  async reportSecurityEvent(logEntry) {
    try {
      // Implementation would send to backend security endpoint
      // await fetch('/api/security/events', { method: 'POST', body: JSON.stringify(logEntry) });
      console.warn("🚨 Critical security event logged:", logEntry);
    } catch (error) {
      console.error("Failed to report security event:", error);
    }
  }

  /**
   * Get security log (ADMIN only)
   * @returns {Array} Security log entries
   */
  getSecurityLog() {
    if (!this.hasPermission("security_logging")) {
      return [];
    }
    return [...this.securityLog];
  }

  async loadUserContext() {
    // Load full user context for email/audit operations (matches IterationView pattern)
    try {
      const username =
        this.config.confluence?.username || this.config.user?.username;
      if (!username) {
        console.warn("No username available for user context loading");
        this.userContext = { userId: this.userId, role: this.userRole };
        return;
      }

      // TEMPORARY: Skip API call until endpoint is implemented
      // TODO: Implement /user/context endpoint in future sprint
      console.log(
        "🔄 StepView: Using fallback user context (endpoint not implemented)",
      );
      this.userContext = {
        userId: this.userId,
        role: this.userRole,
        username: username,
        isAdmin: this.isAdmin,
      };
      return;

      // Original API call commented out to prevent 404 errors:
      /*
      const response = await fetch(
        `${this.config.api.baseUrl}/user/context?username=${encodeURIComponent(username)}`,
        {
          headers: {
            "X-Atlassian-Token": "no-check",
          },
          credentials: "same-origin",
        },
      );

      if (response.ok) {
        this.userContext = await response.json();
        // Update local properties with context data
        this.userRole = this.userContext.role || this.userRole;
        this.isAdmin = this.userContext.isAdmin || this.isAdmin;
        this.userId = this.userContext.userId || this.userId;
        console.log("User context loaded successfully:", this.userContext);
      } else {
        console.warn("Failed to load user context, using fallback");
        this.userContext = { userId: this.userId, role: this.userRole };
      }
      */
    } catch (error) {
      console.error("Error loading user context:", error);
      this.userContext = { userId: this.userId, role: this.userRole };
    }
  }

  async init() {
    // Load user context first for proper email/audit operations
    await this.loadUserContext();

    const params = new URLSearchParams(window.location.search);
    const migrationName = params.get("mig");
    const iterationName = params.get("ite");
    const stepId = params.get("stepid");

    // RBAC: Development role override (temporary testing capability)
    const urlRoleOverride = params.get("role");
    if (
      urlRoleOverride &&
      ["NORMAL", "PILOT", "ADMIN"].includes(urlRoleOverride.toUpperCase())
    ) {
      console.warn(
        "🧪 StepView: Development role override active:",
        urlRoleOverride.toUpperCase(),
      );
      this.userRole = urlRoleOverride.toUpperCase();
      this.isAdmin = this.userRole === "ADMIN";
      this.logSecurityEvent("role_override", {
        originalRole: this.config.user?.role || "NORMAL",
        overrideRole: this.userRole,
        timestamp: new Date().toISOString(),
      });
    }

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
    container.classList.add("step-details-panel");

    // Load step details with caching
    await this.loadStepDetails(migrationName, iterationName, stepId, container);

    // Start real-time synchronization
    this.startRealTimeSync();

    // Add cleanup on page unload
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  async refreshStepDetails() {
    // Refresh the current step details using cached parameters
    if (
      this.currentMigrationName &&
      this.currentIterationName &&
      this.currentStepCode
    ) {
      const container = document.querySelector(".step-view-container");
      if (container) {
        // Preserve the current step instance ID during refresh
        const preservedStepInstanceId = this.currentStepInstanceId;

        await this.loadStepDetails(
          this.currentMigrationName,
          this.currentIterationName,
          this.currentStepCode,
          container,
        );

        // Restore the step instance ID if it was lost during refresh
        if (!this.currentStepInstanceId && preservedStepInstanceId) {
          this.currentStepInstanceId = preservedStepInstanceId;
          console.warn(
            "Restored step instance ID after refresh:",
            preservedStepInstanceId,
          );
        }
      }
    }
  }

  /**
   * Simple refresh method that follows IterationView's proven pattern
   * Reloads the current step view without complex parameter passing
   */
  async refreshCurrentStepView() {
    try {
      if (
        !this.currentMigrationName ||
        !this.currentIterationName ||
        !this.currentStepCode
      ) {
        console.warn("refreshCurrentStepView: Missing required parameters");
        return;
      }

      // Find the container (use same logic as loadStepDetails initialization)
      const container =
        document.querySelector(".step-details-panel") ||
        document.querySelector(".step-view-container");

      if (!container) {
        console.warn("refreshCurrentStepView: No container found");
        return;
      }

      // Clear cache to ensure fresh data
      this.cache.clearCache();

      // Use the standard loadStepDetails method with current parameters
      await this.loadStepDetails(
        this.currentMigrationName,
        this.currentIterationName,
        this.currentStepCode,
        container,
      );

      // Re-attach comment listeners after refresh
      this.attachCommentListeners();
    } catch (error) {
      console.error("Error refreshing step view:", error);
      this.showNotification("Failed to refresh view", "error");
    }
  }

  /**
   * Load step details with fresh data (bypass cache) - replicates IterationView's working pattern
   * This method mimics how IterationView successfully refreshes comments after save
   */
  async loadStepDetailsWithFreshData(
    migrationName,
    iterationName,
    stepCode,
    container,
  ) {
    try {
      // Show loading state like IterationView does
      container.innerHTML = `
        <div class="aui-message aui-message-info">
          <span class="aui-icon icon-info"></span>
          <p>🔄 Loading step details...</p>
        </div>
      `;

      // Make direct API call like IterationView (bypass cache entirely)
      const stepInstanceResponse = await fetch(
        `/rest/scriptrunner/latest/custom/steps/instance/${encodeURIComponent(this.currentStepInstanceId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Atlassian-Token": "no-check",
          },
          credentials: "same-origin",
        },
      );

      if (!stepInstanceResponse.ok) {
        throw new Error(`HTTP ${stepInstanceResponse.status}`);
      }

      const stepData = await stepInstanceResponse.json();

      if (stepData.error) {
        throw new Error(stepData.error);
      }

      // Transform the API response to match the expected format
      const transformedStepData = {
        stepSummary: stepData,
        migrations: await this.cache.getMigrations(),
        currentStepInstanceId: this.currentStepInstanceId,
      };

      // Render the step view with fresh data (same pattern as normal load)
      this.renderStepView(transformedStepData, container);

      console.log(
        "✅ Step details refreshed with fresh data - comments should be visible",
      );
    } catch (error) {
      console.error("Error loading fresh step details:", error);
      container.innerHTML = `
        <div class="aui-message aui-message-error">
          <span class="aui-icon icon-error"></span>
          <p>Failed to load step details: ${this.escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  async loadStepDetails(migrationName, iterationName, stepCode, container) {
    try {
      // Store parameters for refresh functionality
      this.currentMigrationName = migrationName;
      this.currentIterationName = iterationName;
      this.currentStepCode = stepCode;

      // Show loading state
      container.innerHTML = `
                <div class="aui-message aui-message-info">
                    <span class="aui-icon icon-info"></span>
                    <p>Loading step details for ${this.escapeHtml(stepCode)} in ${this.escapeHtml(migrationName)}/${this.escapeHtml(iterationName)}...</p>
                </div>
            `;

      // Use cache system to get step data
      const stepData = await this.cache.getStepData(
        migrationName,
        iterationName,
        stepCode,
      );

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
    if (
      !this.currentMigration ||
      !this.currentIteration ||
      !this.currentStepCode
    ) {
      console.warn(
        "⚠️ StepView: Cannot start sync - missing context parameters",
      );
      return;
    }

    console.log("🚀 StepView: Starting real-time synchronization");

    this.cache.startPolling(
      this.currentMigration,
      this.currentIteration,
      this.currentStepCode,
      (updatedData) => {
        console.log("📊 StepView: Received real-time update");

        // Update UI with fresh data
        const container = document.querySelector(".step-details-panel");
        if (container) {
          this.renderStepView(updatedData, container);

          // Show subtle notification about update
          this.showNotification("Step data updated", "info");
        }
      },
    );
  }

  /**
   * Clean up resources and stop polling
   */
  cleanup() {
    if (this.cache) {
      this.cache.stopPolling();
      console.log("🧹 StepView: Cleanup completed");
    }
  }

  /**
   * Utility method to safely query DOM elements with defensive programming
   * @param {string} selector - CSS selector
   * @param {string} purpose - Description of what the element is needed for
   * @returns {Element|null} - Found element or null
   */
  safeQuerySelector(selector, purpose = "unknown") {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(
        `⚠️ StepView: Element not found for ${purpose}. Selector: ${selector}`,
      );
      console.log(
        "💡 This may be expected if step data hasn't loaded yet or DOM hasn't fully rendered",
      );
    }
    return element;
  }

  /**
   * Check if StepView DOM is fully initialized
   * @returns {boolean} - True if key elements exist
   */
  isDOMReady() {
    const keyElements = [
      document.querySelector(".step-details-panel"),
      document.querySelector(".panel-header, .step-view-header"),
    ];

    const readyState = keyElements.every((el) => el !== null);
    if (!readyState) {
      console.log(
        "📋 StepView DOM readiness check: Step content not yet fully loaded",
      );
    }
    return readyState;
  }

  renderStepView(stepData, container) {
    const summary = stepData.stepSummary || {};
    const instructions = stepData.instructions || [];
    const impactedTeams = stepData.impactedTeams || [];
    const comments = stepData.comments || [];

    // US-036 Refactored: Simplified header with only essential elements
    let html = `
            <div class="panel-header" style="background-color: white !important; color: #172B4D !important;">
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

    // Populate status dropdowns for all users with current status from stepData
    const currentStatus = summary.StatusID || summary.Status || 21; // Use StatusID first, fallback to Status, then default (21=PENDING)
    this.populateStatusDropdown(currentStatus);

    // Initialize PILOT features AFTER DOM is fully populated
    if (["PILOT", "ADMIN"].includes(this.userRole)) {
      // Create PILOT features instance and initialize after DOM is ready
      this.pilotFeatures = new StepViewPilotFeatures(this);
      // Use setTimeout to ensure DOM is completely rendered before accessing elements
      setTimeout(() => {
        this.pilotFeatures.initializePilotFeatures();
        console.log(
          "🚁 StepView: PILOT features initialized successfully for",
          this.userRole,
          "user",
        );
      }, 50); // Small delay to ensure DOM is ready
    }

    // US-036: Remove search/filter initialization - not needed for single step view
    // this.searchFilter.initializeSearchUI(); // REMOVED

    // Trigger CSS debug after DOM is fully rendered (if available)
    setTimeout(() => {
      if (
        window.debugStepViewCSS &&
        typeof window.debugStepViewCSS === "function"
      ) {
        console.log("🎯 Triggering CSS debug after DOM render completion");
        window.debugStepViewCSS();
      }
    }, 100); // Small delay to ensure DOM painting is complete
  }

  renderStepSummary(summary) {
    // Only show additional details not already in header, plus status dropdown for PILOT users
    // Convert status ID to name if needed - API returns StatusID not Status
    const statusId = summary.StatusID || summary.Status || 21;

    // Debug logging for DUM-003 status issue
    if (summary.StepCode === "DUM-003" || summary.StepCode?.startsWith("DUM")) {
      console.log("🐛 DEBUG DUM Status Rendering:", {
        summaryStepCode: summary.StepCode,
        summaryStatusID: summary.StatusID,
        summaryStatus: summary.Status,
        statusIdUsed: statusId,
        statusNameResolved: this.getStatusNameFromId(statusId),
        allSummaryKeys: Object.keys(summary),
        expectedBlocked: "Should be 26 for BLOCKED",
      });
    }

    const statusName = this.getStatusNameFromId(statusId);
    const statusDisplay = this.createStatusBadge(statusId);

    // Check if we have any additional details to show
    const hasAdditionalDetails =
      summary.PredecessorCode ||
      summary.TargetEnvironment ||
      summary.Description;

    if (!hasAdditionalDetails) {
      // If no additional details, just show the status dropdown for PILOT users
      // US-036: Use unique ID to avoid conflicts with main dropdown
      return `
        <div class="step-summary-section">
          <div class="step-status-container" style="margin-bottom: 16px;">
            <label style="font-weight: 600; margin-bottom: 4px; display: block;">Quick Status Update:</label>
            ${this.userRole === null || this.userRole === undefined ? statusDisplay : ""}
            <select id="step-status-dropdown-summary" class="status-select pilot-only" style="display: none;" data-current-status-id="${statusId}">
              <!-- Note: 'pilot-only' CSS class is historical - actual visibility controlled by update_step_status permission -->
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
                    ${
                      this.hasPermission("complete_instructions")
                        ? `
                        <input type="checkbox" 
                               class="instruction-checkbox normal-user-action" 
                               data-instruction-id="${inst.Id}"
                               data-step-id="${this.currentStepInstanceId}"
                               ${inst.IsCompleted ? "checked" : ""}>
                    `
                        : `
                        <span class="instruction-status-badge ${inst.IsCompleted ? "completed" : "pending"}" 
                              title="${inst.IsCompleted ? "Instruction completed" : "Instruction pending"}">
                            ${inst.IsCompleted ? "✓ DONE" : "○ NOT DONE"}
                        </span>
                    `
                    }
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
                                ${
                                  this.hasPermission("add_comments")
                                    ? `
                                    <button class="btn-edit-comment pilot-only" data-comment-id="${comment.id}" title="Edit">✏️</button>
                                    <button class="btn-delete-comment admin-only" data-comment-id="${comment.id}" title="Delete">🗑️</button>
                                `
                                    : ""
                                }
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
                    <button type="button" class="btn btn-primary" id="add-comment-btn">Add Comment</button>
                </div>
            </div>
        `;

    return html;
  }

  applyRoleBasedControls() {
    console.log(
      "🔒 StepView: Applying comprehensive RBAC controls for role:",
      this.userRole,
    );

    const normalElements = document.querySelectorAll(".normal-only");
    const pilotElements = document.querySelectorAll(".pilot-only");
    const adminElements = document.querySelectorAll(".admin-only");
    const normalUserActions = document.querySelectorAll(".normal-user-action");

    // Apply basic role-based visibility
    normalElements.forEach((el) => {
      el.style.display = this.userRole === "NORMAL" ? "" : "none";
    });

    pilotElements.forEach((el) => {
      // ✅ UPDATED: Special handling for status dropdowns and instruction checkboxes
      const isStatusDropdown = el.id && el.id.includes("step-status-dropdown");
      const isInstructionCheckbox = el.classList.contains(
        "instruction-checkbox",
      );

      let shouldShow;
      if (isStatusDropdown) {
        shouldShow = this.hasPermission("update_step_status");
      } else if (isInstructionCheckbox) {
        shouldShow = this.hasPermission("complete_instructions");
      } else {
        shouldShow =
          this.hasPermission("advanced_controls") ||
          this.hasPermission("bulk_operations");
      }

      el.style.display = shouldShow ? "" : "none";

      // Add visual indicator for restricted features
      if (
        !shouldShow &&
        !el.classList.contains("rbac-restricted-indicator-added")
      ) {
        this.addRestrictedIndicator(el);
      }
    });

    adminElements.forEach((el) => {
      const shouldShow = this.hasPermission("debug_panel");
      el.style.display = shouldShow ? "" : "none";

      // Add visual indicator for restricted features
      if (
        !shouldShow &&
        !el.classList.contains("rbac-restricted-indicator-added")
      ) {
        this.addRestrictedIndicator(el);
      }
    });

    // Normal users can only see checkboxes
    normalUserActions.forEach((el) => {
      el.style.display = this.userRole === "NORMAL" ? "" : "none";
    });

    // Apply feature-specific permission controls
    this.applyFeaturePermissions();

    // Add read-only banner for anonymous users (consistent with IterationView)
    this.addReadOnlyBannerIfNeeded();

    console.log("🔒 StepView: RBAC controls applied successfully");
  }

  /**
   * Apply feature-specific permission controls
   */
  applyFeaturePermissions() {
    // Comment functionality
    const commentForms = document.querySelectorAll(".comment-form");
    commentForms.forEach((form) => {
      if (!this.hasPermission("add_comments")) {
        form.style.display = "none";
        this.addRestrictedIndicator(form.parentElement);
      }
    });

    // Instruction completion checkboxes
    const instructionCheckboxes = document.querySelectorAll(
      "input[data-instruction-id]",
    );
    instructionCheckboxes.forEach((checkbox) => {
      if (!this.hasPermission("complete_instructions")) {
        checkbox.disabled = true;
        checkbox.title =
          "You need elevated permissions to complete instructions";
        this.addRestrictedIndicator(checkbox.closest("td"));
      }
    });

    // Email functionality
    const emailButtons = document.querySelectorAll(
      '[id*="email"], [class*="email"]',
    );
    emailButtons.forEach((button) => {
      if (!this.hasPermission("email_step_details")) {
        button.disabled = true;
        button.title =
          "You need PILOT or ADMIN permissions to email step details";
        this.addRestrictedIndicator(button);
      }
    });

    // Force refresh functionality
    const refreshButtons = document.querySelectorAll(
      '[id*="refresh"], [class*="refresh"]',
    );
    refreshButtons.forEach((button) => {
      if (!this.hasPermission("force_refresh_cache")) {
        button.disabled = true;
        button.title =
          "You need PILOT or ADMIN permissions to force refresh cache";
        this.addRestrictedIndicator(button);
      }
    });
  }

  /**
   * Add read-only banner for anonymous users (consistent with IterationView pattern)
   */
  addReadOnlyBannerIfNeeded() {
    // Add banner only for anonymous/unknown users (null or undefined role)
    if (this.userRole === null || this.userRole === undefined) {
      const container = document.querySelector(".step-view-container");
      if (container && !container.querySelector(".read-only-banner")) {
        const banner = document.createElement("div");
        banner.className = "read-only-banner";
        banner.innerHTML = `
          <div class="banner-content">
            <span class="banner-icon">👁️</span>
            <span class="banner-text">Read-Only Mode - Log in for edit access</span>
          </div>
        `;
        container.insertBefore(banner, container.firstChild);
      }
    }
  }

  /**
   * Add visual indicator for restricted features
   * @param {HTMLElement} element - Element to mark as restricted
   */
  addRestrictedIndicator(element) {
    if (
      !element ||
      element.classList.contains("rbac-restricted-indicator-added")
    )
      return;

    element.classList.add("rbac-restricted-indicator-added");
    element.style.position = "relative";

    const indicator = document.createElement("div");
    indicator.className = "rbac-restricted-indicator";
    indicator.innerHTML = "🔒";
    indicator.title = `Requires elevated permissions (${this.userRole} → PILOT/ADMIN)`;

    element.appendChild(indicator);
  }

  /**
   * Add role indicator to the page
   */
  addRoleIndicator() {
    // Remove existing indicator
    const existingIndicator = document.querySelector(".rbac-role-indicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }

    const indicator = document.createElement("div");
    indicator.className = "rbac-role-indicator";
    indicator.innerHTML = `
      <div class="rbac-role-badge rbac-role-${this.userRole.toLowerCase()}">
        <span class="rbac-role-icon">${this.getRoleIcon()}</span>
        <span class="rbac-role-text">${this.userRole}</span>
        ${this.userRole !== "NORMAL" ? '<span class="rbac-role-elevated">⭐</span>' : ""}
      </div>
    `;

    document.body.appendChild(indicator);
  }

  /**
   * Get role-specific icon
   * @returns {string} Role icon
   */
  getRoleIcon() {
    switch (this.userRole) {
      case "ADMIN":
        return "👑";
      case "PILOT":
        return "🚁";
      case "NORMAL":
        return "👤";
      default:
        return "❓";
    }
  }

  async populateStatusDropdown(currentStatus = null) {
    // US-036: Populate ALL status dropdowns with proper current status selection
    // Enhanced to match iterationView pattern for reliable status synchronization
    const dropdowns = document.querySelectorAll('[id^="step-status-dropdown"]');
    console.log(
      "📊 StepView: Found",
      dropdowns.length,
      "status dropdown(s) to populate",
    );

    if (dropdowns.length === 0) {
      console.warn("📊 StepView: No status dropdowns found!");
      return;
    }

    try {
      console.log(
        "📊 StepView: Fetching statuses from:",
        `${this.config.api.baseUrl}/status?entityType=Step`,
      );
      console.log(
        "📊 StepView: Current Status (raw):",
        currentStatus,
        "Type:",
        typeof currentStatus,
      );

      const response = await fetch(
        `${this.config.api.baseUrl}/status?entityType=Step`,
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const statuses = await response.json();
      console.log(
        "📊 StepView: Successfully loaded",
        statuses.length,
        "statuses:",
        statuses,
      );

      // Store fetched statuses for use in both dropdown and static badge
      this.statusesMap.clear();
      statuses.forEach((status) => {
        this.statusesMap.set(status.id, {
          id: status.id,
          name: status.name,
          color: status.color,
        });
      });
      console.log(
        "📊 StepView: Stored",
        this.statusesMap.size,
        "statuses in statusesMap for consistent badge display",
      );

      // Update static status badges now that we have correct status data
      // Single update with small delay to ensure DOM elements are fully rendered
      // This is the only badge update needed - no duplicate calls required
      setTimeout(() => {
        this.updateStaticStatusBadges();
      }, 100);

      // Handle status ID to name conversion (same logic as iterationView)
      let currentStatusName = null;
      let currentStatusIdForSelection = null;

      if (currentStatus !== null && currentStatus !== undefined) {
        if (typeof currentStatus === "number") {
          // Current status is an ID, need to convert to name
          const statusObj = statuses.find(
            (status) => status.id === currentStatus,
          );
          if (statusObj) {
            currentStatusName = statusObj.name;
            currentStatusIdForSelection = currentStatus;
            console.log(
              `📊 StepView: Converted status ID ${currentStatus} to name: ${currentStatusName}`,
            );
          } else {
            console.warn(
              `📊 StepView: Could not find status name for ID: ${currentStatus}`,
            );
          }
        } else if (typeof currentStatus === "string") {
          // Current status is already a name
          currentStatusName = currentStatus;
          const matchingStatus = statuses.find(
            (s) =>
              (s.name || "").trim().toUpperCase() ===
              (currentStatus || "").trim().toUpperCase(),
          );
          if (matchingStatus) {
            currentStatusIdForSelection = matchingStatus.id;
          }
          console.log(
            `📊 StepView: Using status name directly: ${currentStatusName}`,
          );
        } else {
          console.warn(
            "📊 StepView: Unexpected status type:",
            typeof currentStatus,
            currentStatus,
          );
        }
      }

      // Fallback to data attribute if no parameter provided, then fallback to PENDING
      if (!currentStatusIdForSelection && dropdowns.length > 0) {
        const firstDropdown = dropdowns[0];
        const dataStatusId = firstDropdown.dataset.currentStatusId || "21";
        currentStatusIdForSelection = parseInt(dataStatusId);
        console.log(
          "📊 StepView: Fallback to data attribute status ID:",
          currentStatusIdForSelection,
        );

        // Convert fallback ID to name for logging
        const statusObj = statuses.find(
          (status) => status.id === currentStatusIdForSelection,
        );
        if (statusObj) {
          currentStatusName = statusObj.name;
        }
      }

      // Final fallback to PENDING
      if (!currentStatusIdForSelection) {
        const pendingStatus = statuses.find(
          (s) => (s.name || "").trim().toUpperCase() === "PENDING",
        );
        if (pendingStatus) {
          currentStatusIdForSelection = pendingStatus.id;
          currentStatusName = "PENDING";
        } else {
          currentStatusIdForSelection = 21; // Default PENDING status ID (corrected comment)
          currentStatusName = "PENDING"; // Corrected: ID 21 is PENDING, not TODO
        }
        console.log(
          "📊 StepView: Final fallback to status:",
          currentStatusName,
          "ID:",
          currentStatusIdForSelection,
        );
      }

      // Populate each dropdown individually
      dropdowns.forEach((dropdown, index) => {
        console.log(
          `📊 StepView: Dropdown ${index + 1} - ID: ${dropdown.id}, Setting Status: ${currentStatusName} (ID: ${currentStatusIdForSelection})`,
        );

        // Store the current status as attributes (both name and ID for compatibility)
        dropdown.setAttribute("data-old-status", currentStatusName);
        if (currentStatusIdForSelection !== null) {
          dropdown.setAttribute(
            "data-old-status-id",
            currentStatusIdForSelection,
          );
        }

        // Clear existing options
        dropdown.innerHTML = "";
        let optionSelected = false;

        // Add status options using status IDs as values (same as iterationView)
        statuses.forEach((status) => {
          const option = document.createElement("option");
          option.value = status.id; // Use status ID as value
          option.textContent = status.name.replace(/_/g, " ");
          option.setAttribute("data-color", status.color);
          option.setAttribute("data-status-name", status.name);

          // Apply background color styling to option
          option.style.backgroundColor = status.color;
          const rgb = this.hexToRgb(status.color);
          const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
          option.style.color = brightness > 128 ? "#000" : "#fff";

          // Set selected option based on ID comparison
          if (
            currentStatusIdForSelection !== null &&
            status.id === currentStatusIdForSelection
          ) {
            option.selected = true;
            optionSelected = true;
            console.log(
              `📊 StepView: Selected status: ${status.name} (ID: ${status.id})`,
            );
          }

          dropdown.appendChild(option);
        });

        // Log warning if no option was selected
        if (!optionSelected) {
          console.warn(
            `📊 StepView: No option selected for dropdown ${index + 1}. Current status ID: ${currentStatusIdForSelection}`,
          );
        }

        // Set dropdown background color based on selected status
        this.updateDropdownColor(dropdown);

        console.log(
          `📊 StepView: Dropdown ${index + 1} populated with ${statuses.length} options`,
        );
      });

      console.log(
        "📊 StepView: All status dropdowns populated successfully with current status:",
        currentStatusName,
      );

      // Note: Static badges are updated once above after status data is loaded (line 2718)
      // No duplicate update needed here - first update at 100ms handles all badge synchronization
    } catch (error) {
      console.error("❌ StepView: Error loading statuses:", error);
      // Show error in dropdown
      dropdowns.forEach((dropdown) => {
        dropdown.innerHTML =
          '<option value="">Failed to load statuses</option>';
      });
    }
  }

  attachEventListeners() {
    // US-036: Attach event listeners to ALL status dropdowns
    const statusDropdowns = document.querySelectorAll(
      '[id^="step-status-dropdown"]',
    );
    statusDropdowns.forEach((dropdown) => {
      dropdown.addEventListener("change", (e) => this.handleStatusChange(e));
    });

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
    // Add comment button - remove existing listeners first to prevent duplicates
    const addCommentBtn = document.getElementById("add-comment-btn");
    if (addCommentBtn) {
      // Clone and replace to remove existing event listeners
      const newAddCommentBtn = addCommentBtn.cloneNode(true);
      addCommentBtn.parentNode.replaceChild(newAddCommentBtn, addCommentBtn);
      // Re-select and add event listener
      const refreshedAddCommentBtn = document.getElementById("add-comment-btn");
      if (refreshedAddCommentBtn) {
        refreshedAddCommentBtn.addEventListener("click", () =>
          this.handleAddComment(),
        );
      }
    }

    // Edit comment buttons - remove existing listeners first to prevent duplicates
    const editButtons = document.querySelectorAll(".btn-edit-comment");
    editButtons.forEach((btn) => {
      // Clone and replace to remove existing event listeners
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
    // Re-select the new buttons and add event listeners
    const newEditButtons = document.querySelectorAll(".btn-edit-comment");
    newEditButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleEditComment(e));
    });

    // Delete comment buttons - remove existing listeners first to prevent duplicates
    const deleteButtons = document.querySelectorAll(".btn-delete-comment");
    deleteButtons.forEach((btn) => {
      // Clone and replace to remove existing event listeners
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
    // Re-select the new buttons and add event listeners
    const newDeleteButtons = document.querySelectorAll(".btn-delete-comment");
    newDeleteButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleDeleteComment(e));
    });
  }

  async handleStatusChange(event) {
    const newStatusId = event.target.value;
    // Get the status name from the selected option's data attribute
    const selectedOption = event.target.options[event.target.selectedIndex];
    const newStatusName =
      selectedOption.getAttribute("data-status-name") ||
      selectedOption.textContent;

    console.log(
      `🔄 StepView: Handling status change to ${newStatusName} (ID: ${newStatusId}) for step ${this.currentStepCode}`,
    );

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
            "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
          },
          credentials: "same-origin", // Include cookies for authentication
          body: JSON.stringify({
            statusId: parseInt(newStatusId),
            userId: this.userContext?.userId || this.userId || null,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }

      const result = await response.json();

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

      // Update dropdown color to match new status
      this.updateDropdownColor(event.target);

      // Clear cache to force refresh on next poll
      this.cache.clearCache();

      // Sync the runsheet status in the left panel
      this.syncRunsheetStatus(this.currentStepCode, newStatusName);

      // Show success notification with enhanced details (matching IterationView pattern)
      const message = result.emailsSent
        ? `Status updated to ${newStatusName}. ${result.emailsSent} notifications sent.`
        : `Status updated to ${newStatusName}`;
      this.showNotification(message, "success");
    } catch (error) {
      console.error("Error updating status:", error);
      this.showNotification("Failed to update status", "error");
    }
  }

  /**
   * Synchronize status change with runsheet table in the left panel
   * @param {string} stepCode - Step code to update (e.g., "DUM-003")
   * @param {string} newStatusId - New status ID
   */
  syncRunsheetStatus(stepCode, newStatusId) {
    console.log(
      `🔄 StepView: Syncing runsheet status for step ${stepCode} to status ${newStatusId}`,
    );

    if (!stepCode || !newStatusId) {
      console.warn(
        "⚠️ StepView: Missing stepCode or newStatusId for runsheet sync",
      );
      return;
    }

    try {
      // Find the step row in the runsheet table using data-step attribute
      const stepRow = document.querySelector(`[data-step="${stepCode}"]`);

      if (!stepRow) {
        console.warn(`⚠️ StepView: No runsheet row found for step ${stepCode}`);
        return;
      }

      // Find the status cell within the row
      const statusCell = stepRow.querySelector(".col-status");

      if (!statusCell) {
        console.warn(
          `⚠️ StepView: No status cell found in runsheet row for step ${stepCode}`,
        );
        return;
      }

      // Get the status display (badge) for the new status
      const statusDisplay = this.getStatusDisplayForRunsheet(newStatusId);

      if (statusDisplay) {
        // Update the status cell content and classes
        statusCell.innerHTML = statusDisplay.text;
        statusCell.className = `col-status ${statusDisplay.cssClass}`;

        console.log(
          `✅ StepView: Successfully synced runsheet status for step ${stepCode}`,
        );
      } else {
        console.warn(
          `⚠️ StepView: Could not get status display for status ID ${newStatusId}`,
        );
      }
    } catch (error) {
      console.error(
        `❌ StepView: Error syncing runsheet status for step ${stepCode}:`,
        error,
      );
    }
  }

  /**
   * Get status display information for runsheet synchronization
   * @param {string} statusId - Status ID
   * @returns {Object} Object with text and cssClass properties
   */
  getStatusDisplayForRunsheet(statusId) {
    // Map status IDs to runsheet display format
    const statusMap = {
      21: { text: "Pending", cssClass: "status-pending" },
      22: { text: "In Progress", cssClass: "status-progress" },
      23: { text: "Completed", cssClass: "status-completed" },
      24: { text: "Failed", cssClass: "status-failed" },
      25: { text: "Skipped", cssClass: "status-skipped" },
      26: { text: "Blocked", cssClass: "status-blocked" },
    };

    // Handle both string and numeric status IDs
    const normalizedStatusId = String(statusId);
    return (
      statusMap[normalizedStatusId] || {
        text: "Unknown",
        cssClass: "status-unknown",
      }
    );
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
      let result;
      if (isChecked) {
        result = await this.completeInstruction(stepId, instructionId);
        checkbox.closest(".instruction-row")?.classList.add("completed");
        // Show notification with email count (matching IterationView pattern)
        const message = result.emailsSent
          ? `Instruction marked as complete. ${result.emailsSent} notifications sent.`
          : "Instruction marked as complete";
        this.showNotification(message, "success");
      } else {
        result = await this.uncompleteInstruction(stepId, instructionId);
        checkbox.closest(".instruction-row")?.classList.remove("completed");
        // Show notification with email count (matching IterationView pattern)
        const message = result.emailsSent
          ? `Instruction marked as incomplete. ${result.emailsSent} notifications sent.`
          : "Instruction marked as incomplete";
        this.showNotification(message, "success");
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
          "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
        },
        credentials: "same-origin", // Include cookies for authentication
        body: JSON.stringify({
          userId: this.userContext?.userId || this.userId || null,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to complete instruction: ${response.status}`);
    }

    const result = await response.json();

    // Log email notification info (matching IterationView pattern)
    if (result.emailsSent) {
      console.log(`Email notifications sent: ${result.emailsSent}`);
    }

    return result;
  }

  async uncompleteInstruction(stepId, instructionId) {
    const response = await fetch(
      `${this.config.api.baseUrl}/steps/${stepId}/instructions/${instructionId}/incomplete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
        },
        credentials: "same-origin", // Include cookies for authentication
        body: JSON.stringify({
          userId: this.userContext?.userId || this.userId || null,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to uncomplete instruction: ${response.status}`);
    }

    const result = await response.json();

    // Log email notification info (matching IterationView pattern)
    if (result.emailsSent) {
      console.log(`Email notifications sent: ${result.emailsSent}`);
    }

    return result;
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
            "X-Atlassian-Token": "no-check",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            body: commentText,
            userId: this.userContext?.userId || this.userId || null,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.status}`);
      }

      // Clear the textarea
      textarea.value = "";

      // Follow IterationView's proven pattern: simple refresh using current step instance ID
      if (this.currentStepInstanceId) {
        await this.refreshCurrentStepView();
      }

      this.showNotification("Comment added successfully", "success");
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
                <button class="btn btn-primary btn-sm save-comment-btn" data-comment-id="${commentId}">Save</button>
                <button class="btn btn-secondary btn-sm cancel-comment-btn" data-comment-id="${commentId}">Cancel</button>
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
            "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
          },
          credentials: "same-origin", // Include cookies for authentication
          body: JSON.stringify({
            body: newText,
            userId: this.userId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update comment: ${response.status}`);
      }

      // Follow IterationView's proven pattern: simple refresh using current step instance ID
      if (this.currentStepInstanceId) {
        await this.refreshCurrentStepView();
      }

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
                "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
              },
              credentials: "same-origin", // Include cookies for authentication
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to delete comment: ${response.status}`);
          }

          // Follow IterationView's proven pattern: simple refresh using current step instance ID
          if (this.currentStepInstanceId) {
            await this.refreshCurrentStepView();
          }

          this.showNotification("Comment deleted successfully", "success");
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
                <button class="btn btn-secondary btn-sm" id="cancel-delete-btn">Cancel</button>
                <button class="btn btn-primary btn-sm" id="confirm-delete-btn">Delete</button>
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
    // Create notification element using IterationView pattern
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

    // Set background color based on type (matching IterationView)
    const colors = {
      info: "#0065FF",
      success: "#00875A",
      warning: "#FF8B00",
      error: "#DE350B",
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    // Add CSS animation if not already present
    if (!document.querySelector("#notification-styles")) {
      const style = document.createElement("style");
      style.id = "notification-styles";
      style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
      document.head.appendChild(style);
    }

    // Add to DOM
    document.body.appendChild(notification);

    // Remove after 3 seconds (matching IterationView timing)
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Debug method to test status mapping - can be called from browser console
   */
  testStatusMappings() {
    console.log("🧪 Testing Status ID Mappings:");
    const testIds = [21, 22, 23, 24, 25, 26, 27];
    testIds.forEach((id) => {
      const name = this.getStatusNameFromId(id);
      console.log(`  ID ${id} → ${name}`);
    });
    console.log("Expected: ID 26 → BLOCKED");
  }

  /**
   * Map status ID to status name using fetched status data
   * Falls back to hardcoded mapping if statuses haven't been fetched yet
   */
  getStatusNameFromId(statusId) {
    // US-036: Use fetched statuses data for accurate mapping
    const parsedId = parseInt(statusId);

    // First try to use StatusProvider dynamic data (TD-003 Phase 2H)
    if (this.statusesMap && this.statusesMap.has(parsedId)) {
      const status = this.statusesMap.get(parsedId);
      return status.name;
    }

    // Fallback to hardcoded mapping if StatusProvider not yet loaded (TD-003 Phase 2H)
    // Step statuses start at ID 21 (after Migration:1-4, Plan:5-8, Iteration:9-12, Sequence:13-16, Phase:17-20)
    const statusMap = {
      21: "PENDING", // Corrected: was 20
      22: "TODO", // Corrected: was 21
      23: "IN_PROGRESS", // Corrected: was 22
      24: "COMPLETED", // Corrected: was 23
      25: "FAILED", // Corrected: was 24
      26: "BLOCKED", // Corrected: was 25
      27: "CANCELLED", // Corrected: was 26
    };

    return statusMap[parsedId] || "PENDING";
  }

  /**
   * Update dropdown background color based on selected option
   */
  updateDropdownColor(dropdown) {
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    if (selectedOption) {
      const color = selectedOption.getAttribute("data-color");
      if (color) {
        dropdown.style.backgroundColor = color;
        // Set text color based on background brightness
        const rgb = this.hexToRgb(color);
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        dropdown.style.color = brightness > 128 ? "#000" : "#fff";
      }
    }
  }

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  /**
   * Create a proper status badge with background color using fetched status data
   */
  createStatusBadge(statusId) {
    const parsedId = parseInt(statusId);
    const statusName = this.getStatusNameFromId(statusId);

    // Get color from fetched status data if available
    let color = "#DDDDDD"; // default fallback
    if (this.statusesMap && this.statusesMap.has(parsedId)) {
      const status = this.statusesMap.get(parsedId);
      color = status.color || color;
    } else {
      // Fallback to hardcoded colors if StatusProvider not yet loaded (TD-003 Phase 2H)
      const statusColors = {
        PENDING: "#DDDDDD",
        TODO: "#FFFF00",
        IN_PROGRESS: "#0066CC",
        COMPLETED: "#00AA00",
        FAILED: "#FF0000",
        BLOCKED: "#FF6600",
        CANCELLED: "#CC0000",
      };
      color = statusColors[statusName] || "#DDDDDD";
    }

    const textColor = this.getTextColorForBackground(color);
    const displayText = statusName.replace(/_/g, " ");

    return `<span class="status-badge" style="background-color: ${color}; color: ${textColor}; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; letter-spacing: 0.5px;">${displayText}</span>`;
  }

  /**
   * Update static status badges after statuses have been fetched
   * This ensures consistency between dropdown options and static badges
   * Runs for all users (static badges shown alongside dropdowns for PILOT/ADMIN)
   */
  updateStaticStatusBadges() {
    // US-036: Update badges for all users (static badges are shown alongside dropdowns)

    console.log("🔄 StepView: Updating static badges for all users");

    // Find all static status badges in the DOM (they have the status-badge class)
    const statusBadges = document.querySelectorAll(".status-badge");
    console.log(
      "🔄 StepView: Updating",
      statusBadges.length,
      "static status badge(s)",
    );

    statusBadges.forEach((statusBadge) => {
      // Find the nearby dropdown to get the current status ID
      const container =
        statusBadge.closest(".value") || statusBadge.parentElement;
      const nearbyDropdown = container
        ? container.querySelector('[id*="step-status-dropdown"]')
        : null;

      if (nearbyDropdown) {
        // Get the status ID from the dropdown's data attribute
        const statusId = parseInt(nearbyDropdown.dataset.currentStatusId);
        console.log(
          `🔄 StepView: Processing badge with statusId: ${statusId}, statusesMap has: ${this.statusesMap.has(statusId)}`,
        );

        if (statusId && this.statusesMap.has(statusId)) {
          // Update the badge with fresh data from fetched statuses
          const status = this.statusesMap.get(statusId);
          const textColor = this.getTextColorForBackground(status.color);

          // Update the badge's content and style
          statusBadge.textContent = status.name.replace(/_/g, " ");
          statusBadge.style.backgroundColor = status.color;
          statusBadge.style.color = textColor;

          console.log(
            `📊 StepView: Updated static badge - ID:${statusId} → ${status.name} (${status.color})`,
          );
        } else {
          console.warn(
            `🚨 StepView: Could not update badge - statusId: ${statusId}, statusesMap size: ${this.statusesMap.size}`,
          );
          // Log available status IDs for debugging
          if (this.statusesMap.size > 0) {
            console.log(
              "Available status IDs in map:",
              Array.from(this.statusesMap.keys()),
            );
          }
        }
      } else {
        console.warn(
          `🚨 StepView: Could not find nearby dropdown for badge:`,
          statusBadge,
        );
      }
    });
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
    // US-036: Use fetched statuses data for accurate mapping
    // First try to use fetched status data
    if (this.statusesMap && this.statusesMap.size > 0) {
      for (const [id, status] of this.statusesMap) {
        if (status.name === statusName) {
          return id;
        }
      }
    }

    // Fallback to hardcoded mapping if statuses not yet fetched
    // Step statuses start at ID 21 (after Migration:1-4, Plan:5-8, Iteration:9-12, Sequence:13-16, Phase:17-20)
    const statusMap = {
      PENDING: 21, // Corrected: was 20
      TODO: 22, // Corrected: was 21
      IN_PROGRESS: 23, // Corrected: was 22
      COMPLETED: 24, // Corrected: was 23
      FAILED: 25, // Corrected: was 24
      BLOCKED: 26, // Corrected: was 25
      CANCELLED: 27, // Corrected: was 26
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

    // Define statusDisplay for use in the template
    const statusId = summary.StatusID || summary.Status || "21";
    const statusDisplay = this.createStatusBadge(statusId);

    // US-036 Refactored: Streamlined layout per user requirements
    let html = `
        <div class="step-info" data-sti-id="${summary.ID || ""}">
            <div class="step-title">
                <h3>📋 ${summary.StepCode || "Unknown"} - ${summary.Name || "Unknown Step"}</h3>
            </div>
            
            <div class="step-breadcrumb">
                <span class="breadcrumb-item">${this.escapeHtml(summary.MigrationName || "Migration")}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${this.escapeHtml(summary.IterationName || "Iteration")}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${this.escapeHtml(summary.PlanName || "Plan")}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${this.escapeHtml(summary.SequenceName || "Sequence")}</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item">${this.escapeHtml(summary.PhaseName || "Phase")}</span>
            </div>
            
            <div class="step-key-info">
                <div class="metadata-item">
                    <span class="label">📊 STATUS:</span>
                    <span class="value">
                        ${this.userRole === null || this.userRole === undefined ? statusDisplay : ""}
                        <select id="step-status-dropdown" class="status-dropdown pilot-only" data-step-id="${summary.ID || stepData.stepCode}" data-current-status-id="${summary.StatusID || summary.Status || "21"}" style="padding: 2px 8px; border-radius: 3px; margin-left: 8px; display: none;">
                            <!-- Note: 'pilot-only' CSS class is historical - actual visibility controlled by update_step_status permission -->
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
                <div class="metadata-item teams-row">
                    <div class="teams-inline-container">
                        <div class="team-field">
                            <span class="label">👥 Assigned Team:</span>
                            <span class="value">${summary.AssignedTeam || "Unassigned"}</span>
                        </div>
                        <div class="team-field">
                            <span class="label">👥 Impacted Teams:</span>
                            <span class="value">${impactedTeams.length > 0 ? impactedTeams.join(", ") : "None"}</span>
                        </div>
                    </div>
                </div>
                <div class="metadata-item">
                    <span class="label">📂 Location:</span>
                    <span class="value">${summary.MigrationName || "Migration"} › ${summary.IterationName || "Iteration"} › ${summary.PlanName || "Plan"} › ${summary.SequenceName || "Sequence"} › ${summary.PhaseName || "Phase"}</span>
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

    // Add comment section with IterationView-aligned styling
    html += `
        <div class="comments-section">
            <h4>💬 COMMENTS (${comments.length})</h4>
            <div class="comments-list" id="comments-list">
    `;

    if (comments.length > 0) {
      comments.forEach((comment) => {
        const relativeTime = this.formatTimeAgo(comment.createdAt);
        const teamName = comment.author?.team
          ? ` (${comment.author.team})`
          : "";
        html += `
                <div class="comment" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <span class="comment-author">${this.escapeHtml(comment.author?.name || "Unknown")}${teamName}</span>
                        <span class="comment-time">${relativeTime}</span>
                        <div class="comment-actions">
                            ${
                              this.hasPermission("add_comments")
                                ? `
                                <button class="btn-edit-comment" data-comment-id="${comment.id}" title="Edit">✏️</button>
                                <button class="btn-delete-comment" data-comment-id="${comment.id}" title="Delete">🗑️</button>
                            `
                                : ""
                            }
                        </div>
                    </div>
                    <div class="comment-body" id="comment-body-${comment.id}">${this.escapeHtml(comment.body || "")}</div>
                </div>
            `;
      });
    } else {
      html += `<p class="no-comments">No comments yet. Be the first to add one!</p>`;
    }

    html += `
            </div>
            <div class="comment-form">
                <textarea id="new-comment-text" 
                          placeholder="Add a comment..." 
                          rows="3"></textarea>
                <button type="button" class="btn btn-primary" id="add-comment-btn">Add Comment</button>
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
            margin: 8px 0 12px 0;
            color: #6B778C;
            opacity: 0.9;
        }
        
        .breadcrumb-item {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .breadcrumb-separator {
            margin: 0 4px;
            color: #6B778C;
            opacity: 0.7;
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
        
        /* Read-only instruction status badges for anonymous users */
        .instruction-status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
            min-width: 70px;
        }
        
        .instruction-status-badge.completed {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .instruction-status-badge.pending {
            background-color: #f8f9fa;
            color: #6c757d;
            border: 1px solid #dee2e6;
        }
        
        /* Read-only banner for anonymous users */
        .read-only-banner {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border: 1px solid #ffc107;
            border-radius: 6px;
            margin-bottom: 16px;
            padding: 12px 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .banner-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .banner-icon {
            font-size: 18px;
        }
        
        .banner-text {
            font-weight: 500;
            color: #856404;
            font-size: 14px;
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
    
    /* Teams row styling - both team fields on same line */
    .teams-inline-container {
        display: flex;
        gap: 24px;
        flex-wrap: wrap;
        align-items: baseline;
    }
    
    .team-field {
        flex: 1;
        min-width: 200px;
        display: flex;
        align-items: baseline;
    }
    
    .team-field .label {
        margin-right: 8px;
        font-weight: 600;
    }
    
    .team-field .value {
        color: #6B778C;
    }
    
    /* Mobile responsive - stack team fields vertically on small screens */
    @media screen and (max-width: 767px) {
        .teams-inline-container {
            flex-direction: column;
            gap: 8px;
        }
        
        .team-field {
            min-width: auto;
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

// Enhanced RBAC styling
const rbacStyles = document.createElement("style");
rbacStyles.textContent = `
  /* RBAC Role Indicator Styles */
  .rbac-role-indicator {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9000;
    animation: fadeInSlide 0.5s ease-out;
  }
  
  .rbac-role-badge {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    color: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    backdrop-filter: blur(10px);
  }
  
  .rbac-role-normal {
    background: linear-gradient(135deg, #6b778c 0%, #8993a4 100%);
  }
  
  .rbac-role-pilot {
    background: linear-gradient(135deg, #ff8b00 0%, #ffa724 100%);
  }
  
  .rbac-role-admin {
    background: linear-gradient(135deg, #d04437 0%, #e66353 100%);
  }
  
  .rbac-role-icon {
    margin-right: 6px;
    font-size: 14px;
  }
  
  .rbac-role-elevated {
    margin-left: 6px;
    animation: sparkle 2s ease-in-out infinite;
  }
  
  /* Permission Denied Notification */
  .rbac-notification {
    position: fixed;
    top: 80px;
    right: 20px;
    width: 320px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-left: 4px solid #d04437;
    z-index: 9999;
    display: flex;
    align-items: flex-start;
    animation: slideInRight 0.3s ease-out;
  }
  
  .rbac-denied {
    border-left-color: #d04437;
  }
  
  .rbac-icon {
    font-size: 24px;
    margin-right: 12px;
    flex-shrink: 0;
  }
  
  .rbac-message {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
  }
  
  .rbac-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #6b778c;
    margin-left: 8px;
    flex-shrink: 0;
  }
  
  .rbac-close:hover {
    color: #d04437;
  }
  
  /* Restricted Feature Indicators */
  .rbac-restricted-indicator {
    position: absolute;
    top: -8px;
    right: -8px;
    font-size: 12px;
    background: rgba(208, 68, 55, 0.9);
    color: white;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    line-height: 1;
    z-index: 10;
  }
  
  /* Enhanced RBAC Animations */
  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes sparkle {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.8;
    }
  }
  
  /* Mobile responsive adjustments for RBAC */
  @media (max-width: 768px) {
    .rbac-role-indicator {
      top: 10px;
      right: 10px;
    }
    
    .rbac-role-badge {
      padding: 6px 10px;
      font-size: 11px;
    }
    
    .rbac-notification {
      top: 60px;
      right: 10px;
      left: 10px;
      width: auto;
    }
    
    .email-dialog {
      margin: 20px;
      width: calc(100% - 40px) !important;
    }
  }
`;

document.head.appendChild(rbacStyles);

// CSS Debug Helper Functions
window.debugStepViewCSS = function () {
  console.log("🔍 StepView CSS Debug Helper");
  console.log("============================");

  // Check if step-view.css is loaded
  const stepCSS = document.getElementById("step-view-css");
  if (stepCSS) {
    console.log("✅ step-view.css link element found");
    console.log("🔗 href:", stepCSS.href);
  } else {
    // Fallback: Check for iteration-view.css for backward compatibility
    const iterationCSS = document.getElementById("iteration-view-css");
    if (iterationCSS) {
      console.log(
        "⚠️ Using iteration-view.css (legacy) - consider updating to step-view.css",
      );
      console.log("🔗 href:", iterationCSS.href);
    } else {
      console.error(
        "❌ Neither step-view.css nor iteration-view.css link element found",
      );
    }
  }

  // Check key elements with enhanced error handling
  const rootElement = document.getElementById("umig-step-view-root");
  const panelElement = document.querySelector(".step-details-panel");
  const headerElement = document.querySelector(
    ".panel-header, .step-view-header",
  );

  if (rootElement) {
    console.log("✅ Root element found");
    const rootStyle = window.getComputedStyle(rootElement);
    console.log("📊 Root background:", rootStyle.background);
  } else {
    console.warn(
      "⚠️ Root element NOT found - StepView may not be fully initialized yet",
    );
  }

  if (panelElement) {
    console.log("✅ Panel element found");
    const panelStyle = window.getComputedStyle(panelElement);
    console.log("📊 Panel background:", panelStyle.background);
    console.log("📊 Panel border:", panelStyle.border);
    console.log("📊 Panel box-shadow:", panelStyle.boxShadow);

    // Add temporary debug highlight
    panelElement.classList.add("debug-highlight");
    setTimeout(() => {
      if (panelElement.parentNode) {
        // Check if element still exists
        panelElement.classList.remove("debug-highlight");
      }
    }, 3000);
  } else {
    console.warn(
      "⚠️ Panel element NOT found - Step data may not be loaded yet",
    );
  }

  if (headerElement) {
    console.log("✅ Header element found (.panel-header or .step-view-header)");
    const headerStyle = window.getComputedStyle(headerElement);
    console.log("📊 Header color:", headerStyle.color);
    console.log("📊 Header font-size:", headerStyle.fontSize);
    console.log("📊 Header font-weight:", headerStyle.fontWeight);
    console.log("📊 Header class:", headerElement.className);
  } else {
    console.warn(
      "⚠️ Header element NOT found - This is expected if step details haven't been loaded yet",
    );
    console.log(
      "💡 Header elements are created dynamically when step data loads",
    );
  }

  // Check CSS variables
  const documentStyle = window.getComputedStyle(document.documentElement);
  console.log("🎨 CSS Variables:");
  console.log(
    "  --color-primary:",
    documentStyle.getPropertyValue("--color-primary"),
  );
  console.log(
    "  --color-bg-primary:",
    documentStyle.getPropertyValue("--color-bg-primary"),
  );
  console.log(
    "  --color-border:",
    documentStyle.getPropertyValue("--color-border"),
  );

  // Check for conflicting styles
  const allStyleSheets = document.styleSheets;
  console.log("📋 Total stylesheets loaded:", allStyleSheets.length);

  console.log("💡 To debug further, check:");
  console.log("  1. Browser Network tab for failed CSS requests");
  console.log("  2. Elements tab for applied styles");
  console.log("  3. Run debugStepViewCSS() again after making changes");
};

// Add debug button for ADMIN users
if (
  window.UMIG_STEP_CONFIG &&
  window.UMIG_STEP_CONFIG.user &&
  window.UMIG_STEP_CONFIG.user.isAdmin
) {
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      const versionMarker = document.querySelector(".version-marker");
      if (versionMarker) {
        const debugButton = document.createElement("button");
        debugButton.textContent = "🔍 Debug CSS";
        debugButton.style.cssText =
          "margin-left: 10px; padding: 4px 8px; border: none; border-radius: 3px; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-size: 10px;";
        debugButton.onclick = window.debugStepViewCSS;
        versionMarker.appendChild(debugButton);
      }
    }, 500);
  });
}

// Initialize the step view
window.stepView = new StepView();

// Smart CSS debug auto-run with better timing
function smartDebugRun() {
  if (!window.debugStepViewCSS) return;

  // Use StepView utility method if available, otherwise fallback to direct check
  const isReady =
    window.stepView?.isDOMReady() ||
    document.querySelector(".step-details-panel, .panel-header");

  if (isReady) {
    console.log("🚀 Auto-running CSS debug (DOM ready confirmed)...");
    window.debugStepViewCSS();
  } else {
    console.log("⏳ Deferring CSS debug - waiting for DOM to be ready...");
    // Retry after another 2 seconds, up to 5 attempts
    const currentAttempt = (smartDebugRun.attempts || 0) + 1;
    smartDebugRun.attempts = currentAttempt;

    if (currentAttempt < 5) {
      setTimeout(smartDebugRun, 2000);
    } else {
      console.log(
        "⚠️ CSS debug timeout - running anyway for diagnostic purposes",
      );
      // Run anyway for basic diagnostics
      window.debugStepViewCSS();
    }
  }
}

// Start smart debug after initial delay
setTimeout(smartDebugRun, 2000);
