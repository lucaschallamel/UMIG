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

class StepView {
  constructor() {
    this.config = window.UMIG_STEP_CONFIG || {
      api: { baseUrl: "/rest/scriptrunner/latest/custom" },
    };
    this.currentStepInstanceId = null;
    this.userRole = this.config.user?.role || "NORMAL";
    this.isAdmin = this.config.user?.isAdmin || false;
    this.userId = this.config.user?.id || null;

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

    // Load step details
    await this.loadStepDetails(migrationName, iterationName, stepId, container);
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

      // Build query parameters
      const queryParams = new URLSearchParams({
        migrationName: migrationName,
        iterationName: iterationName,
        stepCode: stepCode,
      });

      const response = await fetch(
        `${this.config.api.baseUrl}/stepViewApi/instance?${queryParams}`,
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

  renderStepView(stepData, container) {
    const summary = stepData.stepSummary || {};
    const instructions = stepData.instructions || [];
    const impactedTeams = stepData.impactedTeams || [];
    const comments = stepData.comments || [];

    let html = `
            <div class="step-view-header">
                <h2>📋 ${this.escapeHtml(summary.StepCode || "Unknown")} - ${this.escapeHtml(summary.Name || "Unknown Step")}</h2>
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
            
            <div class="step-view-content">
                <div class="step-info" data-sti-id="${summary.ID || ""}">
                    ${this.renderStepSummary(summary)}
                    ${this.renderLabels(summary.Labels)}
                    ${this.renderInstructions(instructions)}
                    ${this.renderImpactedTeams(impactedTeams)}
                    ${this.renderComments(comments)}
                </div>
            </div>
        `;

    container.innerHTML = html;

    // Apply role-based controls
    this.applyRoleBasedControls();

    // Attach event listeners
    this.attachEventListeners();
  }

  renderStepSummary(summary) {
    const statusDisplay = this.getStatusDisplay(summary.Status);
    const durationDisplay = summary.Duration
      ? `${summary.Duration} minute${summary.Duration !== 1 ? "s" : ""}`
      : "Not specified";

    return `
            <div class="step-summary-section">
                <h3>📊 SUMMARY</h3>
                <table class="aui">
                    <tbody>
                        <tr>
                            <th>Status</th>
                            <td>
                                <div class="step-status-container">
                                    ${statusDisplay}
                                    <select id="step-status-dropdown" class="pilot-only select" style="display: none;">
                                        <!-- Will be populated dynamically -->
                                    </select>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <th>Duration</th>
                            <td>${durationDisplay}</td>
                        </tr>
                        <tr>
                            <th>Assigned Team</th>
                            <td>${this.escapeHtml(summary.AssignedTeam || "Unassigned")}</td>
                        </tr>
                        ${
                          summary.PredecessorCode
                            ? `
                        <tr>
                            <th>Predecessor</th>
                            <td>${this.escapeHtml(summary.PredecessorCode)}${summary.PredecessorName ? `: ${this.escapeHtml(summary.PredecessorName)}` : ""}</td>
                        </tr>
                        `
                            : ""
                        }
                        ${
                          summary.TargetEnvironment
                            ? `
                        <tr>
                            <th>Environment</th>
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

      // Clear the textarea and reload the view
      textarea.value = "";
      this.showNotification("Comment added successfully", "success");

      // Reload the step details to show the new comment
      const params = new URLSearchParams(window.location.search);
      const stepId = params.get("stepid");
      if (stepId) {
        const container = document.getElementById("umig-step-view-root");
        await this.loadStepDetails(stepId, container);
      }
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

          // Remove the comment from DOM
          const commentDiv = document.querySelector(
            `[data-comment-id="${commentId}"]`,
          );
          if (commentDiv) {
            commentDiv.remove();
          }

          // Update the comment count
          const commentsHeader = document.querySelector(".comments-section h3");
          if (commentsHeader) {
            const currentCount =
              parseInt(commentsHeader.textContent.match(/\d+/)[0]) || 0;
            commentsHeader.textContent = `💬 COMMENTS (${Math.max(0, currentCount - 1)})`;
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
    return `<span style="color: ${color}; font-weight: bold;">${status || "UNKNOWN"}</span>`;
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

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Add CSS animations
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
`;
document.head.appendChild(style);

// Initialize the step view
window.stepView = new StepView();
