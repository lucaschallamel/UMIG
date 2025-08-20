/**
 * Standalone StepView Page Implementation
 *
 * US-036: Creates a completely independent, shareable StepView page that works
 * outside of Confluence for external users. Supports both URL parameter formats:
 * - Human-readable: ?mig=migrationa&ite=run1&stepid=DEC-001
 * - UUID-based: ?ite_id={uuid}
 *
 * Key Features:
 * - Self-contained initialization (no Confluence dependencies)
 * - Role-based functionality (NORMAL/PILOT users)
 * - Mobile-first responsive design
 * - Real-time step data synchronization
 * - Email template preparation for PILOT users
 *
 * @version 1.0.0
 * @author UMIG Development Team
 */

class StandaloneStepView {
  constructor() {
    // Standalone configuration - no Confluence dependencies
    this.config = {
      api: {
        baseUrl: this.detectApiBaseUrl(),
        timeout: 30000,
        retryAttempts: 3,
      },
      polling: {
        enabled: true,
        interval: 30000, // 30 seconds for standalone mode
      },
      email: {
        enabled: true,
        templateGeneration: true,
      },
    };

    // Initialize user context from URL or defaults
    this.userContext = this.initializeUserContext();
    this.currentStepInstanceId = null;
    this.stepContext = null;
    this.refreshTimer = null;

    // Bind methods for event handling
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);

    // Initialize when DOM is ready
    this.initializeWhenReady();
  }

  /**
   * Initialize the standalone page when DOM is ready
   */
  initializeWhenReady() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * Main initialization method - completely standalone
   */
  async initialize() {
    try {
      // Set up the page structure first
      this.setupStandalonePage();

      // Parse and validate URL parameters
      const urlParams = this.parseStepViewParams();
      console.log("[StandaloneStepView] Parsed URL parameters:", urlParams);

      // Resolve step instance from URL parameters
      const stepInstanceData = await this.resolveStepInstance(urlParams);
      console.log(
        "[StandaloneStepView] Resolved step instance:",
        stepInstanceData,
      );

      // Load and render the complete step view
      await this.loadAndRenderStepView(stepInstanceData);

      // Set up standalone page features
      this.setupStandaloneFeatures();

      console.log("[StandaloneStepView] Initialization complete");
    } catch (error) {
      console.error("[StandaloneStepView] Initialization failed:", error);
      this.renderErrorState(error);
    }
  }

  /**
   * Parse URL parameters - supports both formats
   * Format 1: ?mig=migrationa&ite=run1&stepid=DEC-001
   * Format 2: ?ite_id={uuid}
   */
  parseStepViewParams() {
    const params = new URLSearchParams(window.location.search);

    // Check for UUID format first (simpler resolution)
    if (params.has("ite_id")) {
      const iteId = params.get("ite_id");
      if (!this.isValidUUID(iteId)) {
        throw new Error("Invalid iteration ID format. Must be a valid UUID.");
      }
      return {
        type: "uuid",
        ite_id: iteId,
        user_role: params.get("role") || "NORMAL",
        user_id: params.get("user_id") || null,
      };
    }

    // Check for human-readable format
    if (params.has("mig") && params.has("ite") && params.has("stepid")) {
      const migName = params.get("mig");
      const iteName = params.get("ite");
      const stepCode = params.get("stepid");

      // Validate step code format (XXX-nnn)
      if (!this.isValidStepCode(stepCode)) {
        throw new Error("Invalid step code format. Expected format: ABC-123");
      }

      return {
        type: "human-readable",
        mig_name: migName,
        ite_name: iteName,
        step_code: stepCode,
        user_role: params.get("role") || "NORMAL",
        user_id: params.get("user_id") || null,
      };
    }

    // No valid parameters found
    throw new Error(`
      Missing required URL parameters. Use one of these formats:
      
      Format 1 (Human-readable): 
      ?mig=migrationa&ite=run1&stepid=DEC-001
      
      Format 2 (UUID-based): 
      ?ite_id={iteration-uuid}
      
      Optional parameters: &role=NORMAL|PILOT&user_id={uuid}
    `);
  }

  /**
   * Initialize user context from URL parameters
   */
  initializeUserContext() {
    const params = new URLSearchParams(window.location.search);

    return {
      role: params.get("role") || "NORMAL",
      id: params.get("user_id") || this.generateGuestUserId(),
      isGuest: !params.has("user_id"),
      permissions: {
        canEditInstructions: ["NORMAL", "PILOT"].includes(
          params.get("role") || "NORMAL",
        ),
        canChangeStatus: ["PILOT"].includes(params.get("role") || "NORMAL"),
        canAddComments: ["PILOT"].includes(params.get("role") || "NORMAL"),
        canSendEmail: ["PILOT"].includes(params.get("role") || "NORMAL"),
        canEditComments: ["PILOT"].includes(params.get("role") || "NORMAL"),
      },
    };
  }

  /**
   * Resolve step instance from URL parameters using appropriate API calls
   */
  async resolveStepInstance(urlParams) {
    if (urlParams.type === "uuid") {
      return await this.resolveByIterationId(urlParams.ite_id);
    } else {
      return await this.resolveByNames(
        urlParams.mig_name,
        urlParams.ite_name,
        urlParams.step_code,
      );
    }
  }

  /**
   * Resolve step instance using iteration UUID
   */
  async resolveByIterationId(iterationId) {
    const response = await this.fetchWithRetry(
      `${this.config.api.baseUrl}/stepViewApi/byIteration/${iterationId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-StandaloneView": "true",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to resolve step by iteration ID: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Resolve step instance using human-readable names
   */
  async resolveByNames(migrationName, iterationName, stepCode) {
    const queryParams = new URLSearchParams({
      migrationName: migrationName,
      iterationName: iterationName,
      stepCode: stepCode,
      includeContext: "true",
    });

    const response = await this.fetchWithRetry(
      `${this.config.api.baseUrl}/stepViewApi/instance?${queryParams}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-StandaloneView": "true",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `Failed to resolve step: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Load and render the complete step view
   */
  async loadAndRenderStepView(stepInstanceData) {
    const container = document.getElementById("stepview-root");
    if (!container) {
      throw new Error(
        "StepView root container not found. Expected #stepview-root element.",
      );
    }

    // Store step context for later use
    this.stepContext = stepInstanceData;

    if (stepInstanceData.stepSummary?.ID) {
      this.currentStepInstanceId = stepInstanceData.stepSummary.ID;
    }

    // Show loading state
    this.renderLoadingState(container);

    try {
      // Render the complete step view
      this.renderStepView(stepInstanceData, container);

      // Apply role-based controls
      this.applyRoleBasedControls();

      // Attach all event listeners
      this.attachEventListeners();

      // Start polling for updates if enabled
      if (this.config.polling.enabled) {
        this.startPolling();
      }
    } catch (error) {
      console.error("[StandaloneStepView] Error rendering step view:", error);
      this.renderErrorState(error, container);
    }
  }

  /**
   * Setup the standalone page structure and meta information
   */
  setupStandalonePage() {
    // Set page title
    document.title = "UMIG Step View - Loading...";

    // Add viewport meta tag for mobile responsiveness
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement("meta");
      viewport.name = "viewport";
      viewport.content =
        "width=device-width, initial-scale=1.0, user-scalable=yes";
      document.head.appendChild(viewport);
    }

    // Add responsive styles
    this.addStandaloneStyles();

    // Create root container if it doesn't exist
    if (!document.getElementById("stepview-root")) {
      const container = document.createElement("div");
      container.id = "stepview-root";
      container.className = "stepview-standalone-container";

      // Clear body and add container
      document.body.innerHTML = "";
      document.body.appendChild(container);
    }
  }

  /**
   * Setup standalone-specific features
   */
  setupStandaloneFeatures() {
    // Add page visibility change handling for polling
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // Add before unload handling
    window.addEventListener("beforeunload", this.handleBeforeUnload);

    // Add keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Add responsive behavior
    this.setupResponsiveFeatures();

    // Update page title with step information
    this.updatePageTitle();
  }

  /**
   * Render the step view using the established pattern
   */
  renderStepView(stepData, container) {
    const summary = stepData.stepSummary || {};
    const instructions = stepData.instructions || [];
    const impactedTeams = stepData.impactedTeams || [];
    const comments = stepData.comments || [];

    // Build the HTML structure
    let html = `
      <div class="stepview-standalone-header">
        <div class="step-title-section">
          <h1>📋 ${this.escapeHtml(summary.StepCode || "Unknown")} - ${this.escapeHtml(summary.Name || "Unknown Step")}</h1>
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
        </div>
        
        <div class="step-actions-toolbar pilot-only">
          <button type="button" class="btn-email-step" id="email-step-btn" title="Send step details by email">
            📧 Send by Email
          </button>
          <button type="button" class="btn-refresh-step" id="refresh-step-btn" title="Refresh step data">
            🔄 Refresh
          </button>
        </div>
      </div>
      
      <div class="stepview-standalone-content">
        <div class="step-info" data-sti-id="${summary.ID || ""}" data-current-status="${summary.Status || "PENDING"}">
          ${this.renderStepSummary(summary)}
          ${this.renderLabels(summary.Labels)}
          ${this.renderInstructions(instructions)}
          ${this.renderImpactedTeams(impactedTeams)}
          ${this.renderComments(comments)}
        </div>
      </div>
      
      <div class="stepview-standalone-footer">
        <div class="footer-info">
          <span class="user-info">Viewing as: ${this.escapeHtml(this.userContext.role)} ${this.userContext.isGuest ? "(Guest)" : "User"}</span>
          <span class="last-updated" id="last-updated-time">Updated: ${new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Render step summary with role-based controls
   */
  renderStepSummary(summary) {
    const statusDisplay = this.getStatusDisplay(summary.Status);
    const durationDisplay = summary.Duration
      ? `${summary.Duration} minute${summary.Duration !== 1 ? "s" : ""}`
      : "Not specified";

    return `
      <div class="step-summary-section">
        <h2>📊 Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <label>Status</label>
            <div class="step-status-container">
              ${statusDisplay}
              <select id="step-status-dropdown" class="pilot-only status-dropdown" style="display: none;">
                <!-- Will be populated dynamically -->
              </select>
            </div>
          </div>
          
          <div class="summary-item">
            <label>Duration</label>
            <div class="summary-value">${durationDisplay}</div>
          </div>
          
          <div class="summary-item">
            <label>Assigned Team</label>
            <div class="summary-value">${this.escapeHtml(summary.AssignedTeam || "Unassigned")}</div>
          </div>
          
          ${
            summary.PredecessorCode
              ? `
          <div class="summary-item">
            <label>Predecessor</label>
            <div class="summary-value">${this.escapeHtml(summary.PredecessorCode)}${summary.PredecessorName ? `: ${this.escapeHtml(summary.PredecessorName)}` : ""}</div>
          </div>
          `
              : ""
          }
          
          ${
            summary.TargetEnvironment
              ? `
          <div class="summary-item">
            <label>Environment</label>
            <div class="summary-value">${this.escapeHtml(summary.TargetEnvironment)}</div>
          </div>
          `
              : ""
          }
        </div>
        
        ${
          summary.Description
            ? `
        <div class="summary-description">
          <label>Description</label>
          <div class="description-content">${this.escapeHtml(summary.Description)}</div>
        </div>
        `
            : ""
        }
      </div>
    `;
  }

  /**
   * Render labels section
   */
  renderLabels(labels) {
    if (!labels || labels.length === 0) {
      return "";
    }

    const labelHtml = labels
      .map(
        (label) => `
        <span class="step-label" style="background-color: ${label.color || "#e3e5e8"}; color: ${this.getContrastColor(label.color || "#e3e5e8")}">
          ${this.escapeHtml(label.name)}
        </span>
      `,
      )
      .join("");

    return `
      <div class="labels-section">
        <h2>🏷️ Labels</h2>
        <div class="labels-container">
          ${labelHtml}
        </div>
      </div>
    `;
  }

  /**
   * Render instructions with role-based checkboxes
   */
  renderInstructions(instructions) {
    if (!instructions || instructions.length === 0) {
      return `
        <div class="instructions-section">
          <h2>📝 Instructions</h2>
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
                   ${this.userContext.permissions.canEditInstructions ? "" : "disabled"}>
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
        <h2>📝 Instructions</h2>
        <div class="instructions-table-container">
          <table class="instructions-table">
            <thead>
              <tr>
                <th class="checkbox-column">✓</th>
                <th class="order-column">Order</th>
                <th class="description-column">Instruction</th>
                <th class="duration-column">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Render impacted teams section
   */
  renderImpactedTeams(teams) {
    if (!teams || teams.length === 0) {
      return "";
    }

    const teamList = teams
      .map(
        (team) =>
          `<li class="team-item">${this.escapeHtml(team.name || team)}</li>`,
      )
      .join("");

    return `
      <div class="impacted-teams-section">
        <h2>👥 Impacted Teams</h2>
        <ul class="teams-list">
          ${teamList}
        </ul>
      </div>
    `;
  }

  /**
   * Render comments with role-based controls
   */
  renderComments(comments) {
    let html = `
      <div class="comments-section">
        <h2>💬 Comments (${comments.length})</h2>
        <div class="comments-list" id="comments-list">
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
                <button class="btn-edit-comment pilot-only" data-comment-id="${comment.id}" title="Edit comment">✏️</button>
                <button class="btn-delete-comment pilot-only" data-comment-id="${comment.id}" title="Delete comment">🗑️</button>
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
          <div class="comment-input-container">
            <textarea id="new-comment-text" placeholder="Add a comment..." rows="3" class="comment-textarea"></textarea>
            <button type="button" class="btn-add-comment" id="add-comment-btn">Add Comment</button>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  /* ==================================================
   * EVENT HANDLING METHODS
   * ================================================== */

  /**
   * Attach all event listeners
   */
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

    // Toolbar buttons
    const emailBtn = document.getElementById("email-step-btn");
    if (emailBtn) {
      emailBtn.addEventListener("click", () => this.handleEmailStep());
    }

    const refreshBtn = document.getElementById("refresh-step-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.handleRefreshStep());
    }

    // Comment actions
    this.attachCommentListeners();
  }

  /**
   * Attach comment-related event listeners
   */
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

  /**
   * Handle status change for PILOT users
   */
  async handleStatusChange(event) {
    const newStatus = event.target.value;
    if (!this.currentStepInstanceId) {
      this.showNotification(
        "Unable to update status: No step instance ID",
        "error",
      );
      return;
    }

    if (!this.userContext.permissions.canChangeStatus) {
      this.showNotification(
        "You don't have permission to change status",
        "warning",
      );
      return;
    }

    try {
      await this.updateStepStatus(newStatus);
      this.showNotification("Status updated successfully", "success");

      // Update the visual status display
      this.updateStatusDisplay(newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
      this.showNotification("Failed to update status", "error");
      // Revert the dropdown
      event.target.value = this.stepContext?.stepSummary?.Status || "PENDING";
    }
  }

  /**
   * Handle instruction checkbox toggle
   */
  async handleInstructionToggle(event) {
    const checkbox = event.target;
    const instructionId = checkbox.getAttribute("data-instruction-id");
    const stepId = checkbox.getAttribute("data-step-id");
    const isChecked = checkbox.checked;

    if (!instructionId || !stepId) {
      console.error("Missing instruction or step ID");
      return;
    }

    if (!this.userContext.permissions.canEditInstructions) {
      this.showNotification(
        "You don't have permission to modify instructions",
        "warning",
      );
      checkbox.checked = !isChecked; // Revert
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
    } catch (error) {
      checkbox.checked = !isChecked; // Revert on error
      this.showNotification("Failed to update instruction", "error");
    } finally {
      checkbox.disabled = false;
    }
  }

  /**
   * Handle email step functionality for PILOT users
   */
  async handleEmailStep() {
    if (!this.userContext.permissions.canSendEmail) {
      this.showNotification(
        "You don't have permission to send emails",
        "warning",
      );
      return;
    }

    try {
      // Generate email template and send
      await this.generateAndSendEmail();
      this.showNotification("Step details sent by email", "success");
    } catch (error) {
      console.error("Error sending email:", error);
      this.showNotification("Failed to send email", "error");
    }
  }

  /**
   * Handle refresh step data
   */
  async handleRefreshStep() {
    try {
      const urlParams = this.parseStepViewParams();
      const freshData = await this.resolveStepInstance(urlParams);

      const container = document.getElementById("stepview-root");
      await this.loadAndRenderStepView(freshData);

      this.showNotification("Step data refreshed", "success");
      this.updateLastUpdatedTime();
    } catch (error) {
      console.error("Error refreshing step:", error);
      this.showNotification("Failed to refresh step data", "error");
    }
  }

  /**
   * Handle add comment
   */
  async handleAddComment() {
    const textarea = document.getElementById("new-comment-text");
    if (!textarea) return;

    const commentText = textarea.value.trim();
    if (!commentText) {
      this.showNotification("Please enter a comment", "warning");
      return;
    }

    if (!this.userContext.permissions.canAddComments) {
      this.showNotification(
        "You don't have permission to add comments",
        "warning",
      );
      return;
    }

    try {
      await this.addComment(commentText);
      textarea.value = "";
      this.showNotification("Comment added successfully", "success");

      // Refresh comments section
      await this.refreshCommentsSection();
    } catch (error) {
      console.error("Error adding comment:", error);
      this.showNotification("Failed to add comment", "error");
    }
  }

  /**
   * Handle edit comment
   */
  async handleEditComment(event) {
    // Similar to existing implementation but with permission checks
    const commentId = event.target.dataset.commentId;

    if (!this.userContext.permissions.canEditComments) {
      this.showNotification(
        "You don't have permission to edit comments",
        "warning",
      );
      return;
    }

    // Implement edit functionality similar to existing code
    // ... (implementation details as in original)
  }

  /**
   * Handle delete comment
   */
  async handleDeleteComment(event) {
    const commentId = event.target.dataset.commentId;

    if (!this.userContext.permissions.canEditComments) {
      this.showNotification(
        "You don't have permission to delete comments",
        "warning",
      );
      return;
    }

    // Show confirmation and delete
    // ... (implementation details as in original)
  }

  /* ==================================================
   * API INTEGRATION METHODS
   * ================================================== */

  /**
   * Fetch with retry logic for reliability
   */
  async fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            "X-StandaloneView": "true",
            ...options.headers,
          },
        });

        return response;
      } catch (error) {
        lastError = error;
        console.warn(
          `[StandaloneStepView] Fetch attempt ${i + 1} failed:`,
          error,
        );

        if (i < maxRetries - 1) {
          // Wait before retry (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, i) * 1000),
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * Update step status via API
   */
  async updateStepStatus(newStatus) {
    const response = await this.fetchWithRetry(
      `${this.config.api.baseUrl}/steps/${this.currentStepInstanceId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statusId: parseInt(newStatus),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Complete instruction via API
   */
  async completeInstruction(stepId, instructionId) {
    const response = await this.fetchWithRetry(
      `${this.config.api.baseUrl}/steps/${stepId}/instructions/${instructionId}/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: this.userContext.id,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to complete instruction: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Uncomplete instruction via API
   */
  async uncompleteInstruction(stepId, instructionId) {
    const response = await this.fetchWithRetry(
      `${this.config.api.baseUrl}/steps/${stepId}/instructions/${instructionId}/incomplete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: this.userContext.id,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to uncomplete instruction: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Add comment via API
   */
  async addComment(commentText) {
    const response = await this.fetchWithRetry(
      `${this.config.api.baseUrl}/comments/${this.currentStepInstanceId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: commentText,
          userId: this.userContext.id,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Generate and send email template
   */
  async generateAndSendEmail() {
    const response = await this.fetchWithRetry(
      `${this.config.api.baseUrl}/email/step/${this.currentStepInstanceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: this.userContext.id,
          includeInstructions: true,
          includeComments: true,
          templateFormat: "html",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.status}`);
    }

    return response.json();
  }

  /* ==================================================
   * STANDALONE PAGE FEATURES
   * ================================================== */

  /**
   * Apply role-based controls for the standalone view
   */
  applyRoleBasedControls() {
    const userRole = this.userContext.role;
    const permissions = this.userContext.permissions;

    // Show/hide role-specific elements
    const normalElements = document.querySelectorAll(".normal-only");
    const pilotElements = document.querySelectorAll(".pilot-only");
    const normalUserActions = document.querySelectorAll(".normal-user-action");

    // Show elements based on permissions
    normalElements.forEach((el) => {
      el.style.display = userRole === "NORMAL" ? "" : "none";
    });

    pilotElements.forEach((el) => {
      el.style.display =
        permissions.canChangeStatus || permissions.canAddComments ? "" : "none";
    });

    normalUserActions.forEach((el) => {
      el.style.display = permissions.canEditInstructions ? "" : "none";
    });

    // FIXED: Always populate status dropdown for display, show controls based on permissions
    const statusDropdown = document.getElementById("step-status-dropdown");
    if (statusDropdown) {
      // Always populate dropdown so users can see current status
      this.populateStatusDropdown()
        .then(() => {
          // Only show as editable if user has change permissions
          if (permissions.canChangeStatus) {
            statusDropdown.style.display = "";
            statusDropdown.disabled = false;
          } else {
            statusDropdown.style.display = "";
            statusDropdown.disabled = true;
            statusDropdown.title = "Status display only - no edit permission";
          }
        })
        .catch((error) => {
          console.error("Failed to populate status dropdown:", error);
          statusDropdown.innerHTML =
            '<option value="">Error loading statuses</option>';
          statusDropdown.style.display = "";
          statusDropdown.disabled = true;
        });
    }
  }

  /**
   * Populate status dropdown
   */
  async populateStatusDropdown() {
    const dropdown = document.getElementById("step-status-dropdown");
    if (!dropdown) {
      throw new Error("Status dropdown element not found");
    }

    // Show loading state
    dropdown.innerHTML = '<option value="">Loading statuses...</option>';

    try {
      // FIXED: Use direct fetch without custom headers to match working iteration-view.js
      const response = await fetch(`${this.config.api.baseUrl}/statuses/step`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch statuses: ${response.status} ${response.statusText}`,
        );
      }

      const statuses = await response.json();

      if (!statuses || statuses.length === 0) {
        throw new Error("No statuses returned from API");
      }

      const currentStatus = this.stepContext?.stepSummary?.Status || "PENDING";

      dropdown.innerHTML = statuses
        .map(
          (status) => `
          <option value="${status.id}" 
                  ${status.name === currentStatus ? "selected" : ""}
                  style="color: ${status.color || "#000"}">
            ${status.name}
          </option>
        `,
        )
        .join("");

      console.log(
        `[StepView] Successfully loaded ${statuses.length} statuses, current: ${currentStatus}`,
      );
    } catch (error) {
      console.error("[StepView] Error loading statuses:", error);
      dropdown.innerHTML = `<option value="">Error: ${error.message}</option>`;
      throw error; // Re-throw so caller can handle it
    }
  }

  /**
   * Start polling for real-time updates
   */
  startPolling() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      if (!document.hidden) {
        try {
          await this.handleRefreshStep();
        } catch (error) {
          console.error("[StandaloneStepView] Polling error:", error);
          // Don't show notification for polling errors
        }
      }
    }, this.config.polling.interval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Handle page visibility changes
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.stopPolling();
    } else if (this.config.polling.enabled) {
      this.startPolling();
      // Refresh immediately when page becomes visible
      setTimeout(() => this.handleRefreshStep(), 1000);
    }
  }

  /**
   * Handle before page unload
   */
  handleBeforeUnload() {
    this.stopPolling();
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Only if not in input fields
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      switch (e.key) {
        case "r":
        case "R":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.handleRefreshStep();
          }
          break;
        case "e":
        case "E":
          if (
            (e.ctrlKey || e.metaKey) &&
            this.userContext.permissions.canSendEmail
          ) {
            e.preventDefault();
            this.handleEmailStep();
          }
          break;
      }
    });
  }

  /**
   * Setup responsive features
   */
  setupResponsiveFeatures() {
    // Add responsive table wrapper for instructions
    const instructionsTable = document.querySelector(".instructions-table");
    if (instructionsTable) {
      instructionsTable.classList.add("responsive-table");
    }

    // Setup mobile-friendly interactions
    this.setupMobileInteractions();
  }

  /**
   * Setup mobile-specific interactions
   */
  setupMobileInteractions() {
    // Add touch-friendly button sizing
    const buttons = document.querySelectorAll("button");
    buttons.forEach((button) => {
      button.classList.add("touch-friendly");
    });

    // Add swipe gestures for mobile navigation (optional)
    if ("ontouchstart" in window) {
      this.setupSwipeGestures();
    }
  }

  /**
   * Setup swipe gestures for mobile
   */
  setupSwipeGestures() {
    let startX = 0;
    let startY = 0;

    document.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });

    document.addEventListener("touchend", (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // Only act on significant horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          // Swipe right - could trigger refresh
          this.handleRefreshStep();
        }
      }
    });
  }

  /* ==================================================
   * UTILITY METHODS
   * ================================================== */

  /**
   * Detect API base URL based on current environment
   */
  detectApiBaseUrl() {
    // For standalone mode, try to detect the API base URL
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;

    if (currentHost === "localhost" || currentHost === "127.0.0.1") {
      // Development environment
      return `http://${currentHost}:${currentPort || 8090}/rest/scriptrunner/latest/custom`;
    } else {
      // Production environment
      return "/rest/scriptrunner/latest/custom";
    }
  }

  /**
   * Generate a guest user ID for anonymous access
   */
  generateGuestUserId() {
    return "guest-" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Validate UUID format
   */
  isValidUUID(uuid) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(uuid);
  }

  /**
   * Validate step code format (XXX-nnn)
   */
  isValidStepCode(stepCode) {
    const stepCodePattern = /^[A-Z]{3}-\d{3}$/;
    return stepCodePattern.test(stepCode);
  }

  /**
   * Update page title with step information
   */
  updatePageTitle() {
    if (this.stepContext?.stepSummary) {
      const summary = this.stepContext.stepSummary;
      document.title = `UMIG - ${summary.StepCode} - ${summary.Name}`;
    }
  }

  /**
   * Update last updated time display
   */
  updateLastUpdatedTime() {
    const lastUpdatedElement = document.getElementById("last-updated-time");
    if (lastUpdatedElement) {
      lastUpdatedElement.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    }
  }

  /**
   * Update status display visually
   */
  updateStatusDisplay(newStatus) {
    const statusContainer = document.querySelector(".step-status-container");
    if (statusContainer) {
      const statusSpan = statusContainer.querySelector("span:not(.pilot-only)");
      if (statusSpan) {
        statusSpan.outerHTML = this.getStatusDisplay(newStatus);
      }
    }

    // Update step info data attribute
    const stepInfo = document.querySelector(".step-info");
    if (stepInfo) {
      stepInfo.setAttribute("data-current-status", newStatus);
    }
  }

  /**
   * Refresh comments section
   */
  async refreshCommentsSection() {
    try {
      const urlParams = this.parseStepViewParams();
      const freshData = await this.resolveStepInstance(urlParams);

      const commentsSection = document.querySelector(".comments-section");
      if (commentsSection && freshData.comments) {
        const newCommentsHtml = this.renderComments(freshData.comments);
        commentsSection.outerHTML = newCommentsHtml;

        // Reattach comment listeners
        this.attachCommentListeners();
      }
    } catch (error) {
      console.error("Error refreshing comments:", error);
    }
  }

  /* ==================================================
   * UI STATE METHODS
   * ================================================== */

  /**
   * Render loading state
   */
  renderLoadingState(container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <h2>Loading step details...</h2>
        <p>Please wait while we fetch the latest information.</p>
      </div>
    `;
  }

  /**
   * Render error state with retry option
   */
  renderErrorState(error, container = null) {
    const targetContainer =
      container || document.getElementById("stepview-root");
    if (!targetContainer) return;

    targetContainer.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h2>Unable to Load Step</h2>
        <p class="error-message">${this.escapeHtml(error.message)}</p>
        <div class="error-actions">
          <button type="button" class="btn-retry" onclick="window.location.reload()">
            🔄 Retry
          </button>
          <button type="button" class="btn-go-back" onclick="window.history.back()">
            ← Go Back
          </button>
        </div>
        <details class="error-details">
          <summary>Technical Details</summary>
          <pre>${this.escapeHtml(error.stack || error.toString())}</pre>
        </details>
      </div>
    `;
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = "info", duration = 5000) {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
      padding: 16px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideInRight 0.3s ease-out;
    `;

    const iconMap = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };

    const colorMap = {
      success: "#d4edda",
      error: "#f8d7da",
      warning: "#fff3cd",
      info: "#d1ecf1",
    };

    notification.style.backgroundColor = colorMap[type] || colorMap.info;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">${iconMap[type] || iconMap.info}</span>
        <span style="flex: 1;">${this.escapeHtml(message)}</span>
        <button type="button" style="background: none; border: none; font-size: 18px; cursor: pointer; padding: 0; margin-left: 8px;" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease-in";
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  /* ==================================================
   * STYLING METHODS
   * ================================================== */

  /**
   * Add comprehensive standalone styles
   */
  addStandaloneStyles() {
    const style = document.createElement("style");
    style.textContent = `
      /* Reset and base styles */
      * {
        box-sizing: border-box;
      }
      
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #172B4D;
        background-color: #f5f6f7;
      }
      
      /* Main container */
      .stepview-standalone-container {
        max-width: 1200px;
        margin: 0 auto;
        min-height: 100vh;
        background: white;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
      }
      
      /* Header */
      .stepview-standalone-header {
        background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%);
        color: white;
        padding: 24px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 16px;
      }
      
      .step-title-section h1 {
        margin: 0 0 12px 0;
        font-size: 28px;
        font-weight: 600;
      }
      
      .step-breadcrumb {
        font-size: 14px;
        opacity: 0.9;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      
      .breadcrumb-separator {
        margin: 0 4px;
      }
      
      .step-actions-toolbar {
        display: flex;
        gap: 12px;
        flex-shrink: 0;
      }
      
      .step-actions-toolbar button {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
      }
      
      .step-actions-toolbar button:hover {
        background: rgba(255,255,255,0.3);
      }
      
      /* Content */
      .stepview-standalone-content {
        padding: 32px 24px;
      }
      
      /* Sections */
      .step-summary-section,
      .labels-section,
      .instructions-section,
      .impacted-teams-section,
      .comments-section {
        margin-bottom: 32px;
        padding: 24px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e5e8ec;
      }
      
      .step-summary-section h2,
      .labels-section h2,
      .instructions-section h2,
      .impacted-teams-section h2,
      .comments-section h2 {
        margin: 0 0 20px 0;
        font-size: 20px;
        color: #172B4D;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      /* Summary grid */
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .summary-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .summary-item label {
        font-weight: 600;
        color: #6B778C;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .summary-value {
        font-size: 16px;
        color: #172B4D;
      }
      
      .step-status-container {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .status-dropdown {
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .summary-description {
        grid-column: 1 / -1;
      }
      
      .description-content {
        background: white;
        padding: 16px;
        border-radius: 4px;
        border: 1px solid #e5e8ec;
        font-size: 16px;
        line-height: 1.5;
      }
      
      /* Labels */
      .labels-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .step-label {
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      /* Instructions table */
      .instructions-table-container {
        overflow-x: auto;
        background: white;
        border-radius: 4px;
        border: 1px solid #e5e8ec;
      }
      
      .instructions-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      
      .instructions-table th,
      .instructions-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e5e8ec;
      }
      
      .instructions-table th {
        background: #f8f9fa;
        font-weight: 600;
        color: #6B778C;
      }
      
      .checkbox-column { width: 50px; }
      .order-column { width: 80px; }
      .duration-column { width: 100px; }
      
      .instruction-row.completed {
        background-color: #e3fcef;
      }
      
      .instruction-row.completed .instruction-body {
        text-decoration: line-through;
        opacity: 0.7;
      }
      
      .instruction-checkbox {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
      
      /* Teams list */
      .teams-list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }
      
      .team-item {
        background: white;
        padding: 12px 16px;
        border-radius: 4px;
        border: 1px solid #e5e8ec;
        font-weight: 500;
      }
      
      /* Comments */
      .comments-list {
        margin-bottom: 24px;
      }
      
      .comment {
        background: white;
        border: 1px solid #e5e8ec;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }
      
      .comment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 14px;
      }
      
      .comment-author {
        font-weight: 600;
        color: #172B4D;
      }
      
      .comment-time {
        color: #6B778C;
      }
      
      .comment-actions {
        display: flex;
        gap: 8px;
      }
      
      .comment-actions button {
        background: none;
        border: none;
        font-size: 14px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .comment-actions button:hover {
        background: #f4f5f7;
      }
      
      .comment-body {
        color: #172B4D;
        line-height: 1.5;
        white-space: pre-wrap;
      }
      
      .comment-input-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .comment-textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: inherit;
        font-size: 14px;
        resize: vertical;
        min-height: 80px;
      }
      
      .comment-textarea:focus {
        outline: none;
        border-color: #0052CC;
        box-shadow: 0 0 0 2px rgba(0,82,204,0.2);
      }
      
      .btn-add-comment {
        align-self: flex-start;
        background: #0052CC;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .btn-add-comment:hover {
        background: #0065FF;
      }
      
      /* Footer */
      .stepview-standalone-footer {
        background: #f8f9fa;
        padding: 16px 24px;
        border-top: 1px solid #e5e8ec;
        font-size: 14px;
        color: #6B778C;
      }
      
      .footer-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }
      
      /* State styles */
      .loading-state,
      .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 24px;
        text-align: center;
      }
      
      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #0052CC;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 24px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .error-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      .error-actions {
        display: flex;
        gap: 12px;
        margin: 24px 0;
        flex-wrap: wrap;
        justify-content: center;
      }
      
      .error-actions button {
        padding: 10px 20px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .btn-retry {
        background: #0052CC;
        color: white;
        border-color: #0052CC;
      }
      
      .btn-retry:hover {
        background: #0065FF;
      }
      
      .error-details {
        margin-top: 24px;
        max-width: 600px;
      }
      
      .error-details pre {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 4px;
        border: 1px solid #e5e8ec;
        font-size: 12px;
        overflow-x: auto;
        text-align: left;
      }
      
      /* Utility classes */
      .no-data,
      .no-comments {
        color: #6B778C;
        font-style: italic;
        text-align: center;
        padding: 20px;
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        .stepview-standalone-header {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .step-title-section h1 {
          font-size: 22px;
        }
        
        .stepview-standalone-content {
          padding: 20px 16px;
        }
        
        .step-summary-section,
        .labels-section,
        .instructions-section,
        .impacted-teams-section,
        .comments-section {
          padding: 16px;
          margin-bottom: 20px;
        }
        
        .summary-grid {
          grid-template-columns: 1fr;
        }
        
        .step-actions-toolbar {
          width: 100%;
          justify-content: flex-start;
        }
        
        .footer-info {
          flex-direction: column;
          align-items: flex-start;
        }
      }
      
      /* Animations */
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      /* Touch-friendly styles for mobile */
      .touch-friendly {
        min-height: 44px;
        min-width: 44px;
      }
      
      /* Hide elements based on role */
      .pilot-only {
        display: none;
      }
      
      /* Will be shown by JavaScript based on user role */
    `;

    document.head.appendChild(style);
  }

  /**
   * Get status display with color coding
   */
  getStatusDisplay(status) {
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
    return `<span style="color: ${color}; font-weight: 600; font-size: 16px;">${status || "UNKNOWN"}</span>`;
  }

  /**
   * Format time ago display
   */
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

  /**
   * Get contrast color for text on colored backgrounds
   */
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
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (typeof text !== "string") return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Cleanup method for proper disposal
   */
  destroy() {
    // Stop polling
    this.stopPolling();

    // Remove event listeners
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    window.removeEventListener("beforeunload", this.handleBeforeUnload);

    // Clear any timeouts
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }
}

// Initialize the standalone step view when script loads
window.standaloneStepView = new StandaloneStepView();

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = StandaloneStepView;
}
