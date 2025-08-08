// UMIG Iteration View Mockup JavaScript
// Basic interactions and state management

class IterationView {
  constructor() {
    this.selectedStep = "INF-001-010";
    this.filters = {
      migration: "mig-001",
      iteration: "ite-001",
      sequence: "",
      phase: "",
      team: "",
      label: "",
      myTeamsOnly: false,
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadStepDetails(this.selectedStep);
    this.updateFilters();
  }

  bindEvents() {
    // Migration and Iteration selectors
    document
      .getElementById("migration-select")
      .addEventListener("change", (e) => {
        this.filters.migration = e.target.value;
        this.onMigrationChange();
      });

    document
      .getElementById("iteration-select")
      .addEventListener("change", (e) => {
        this.filters.iteration = e.target.value;
        this.onIterationChange();
      });

    // Filter controls
    document
      .getElementById("sequence-filter")
      .addEventListener("change", (e) => {
        this.filters.sequence = e.target.value;
        this.applyFilters();
      });

    document.getElementById("phase-filter").addEventListener("change", (e) => {
      this.filters.phase = e.target.value;
      this.applyFilters();
    });

    document.getElementById("team-filter").addEventListener("change", (e) => {
      this.filters.team = e.target.value;
      this.applyFilters();
    });

    document.getElementById("label-filter").addEventListener("change", (e) => {
      this.filters.label = e.target.value;
      this.applyFilters();
    });

    document.getElementById("my-teams-only").addEventListener("change", (e) => {
      this.filters.myTeamsOnly = e.target.checked;
      this.applyFilters();
    });

    // Step row selection
    document.querySelectorAll(".step-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        this.selectStep(e.currentTarget.dataset.step);
      });
    });

    // Expand/collapse functionality
    document.querySelectorAll(".sequence-header").forEach((header) => {
      header.addEventListener("click", (e) => {
        this.toggleSequence(e.currentTarget);
      });
    });

    document.querySelectorAll(".phase-header").forEach((header) => {
      header.addEventListener("click", (e) => {
        this.togglePhase(e.currentTarget);
      });
    });

    // Instruction checkboxes
    document
      .querySelectorAll('.instruction-row input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
          this.onInstructionToggle(e.target);
        });
      });

    // Comment form
    const commentForm = document.querySelector(".comment-form");
    const commentButton = commentForm.querySelector("button");
    const commentTextarea = commentForm.querySelector("textarea");

    commentButton.addEventListener("click", () => {
      this.addComment(commentTextarea.value);
      commentTextarea.value = "";
    });

    // Action buttons
    document.querySelectorAll(".step-actions button").forEach((button) => {
      button.addEventListener("click", (e) => {
        this.onActionClick(e.target.textContent.trim());
      });
    });
  }

  onMigrationChange() {
    console.log("Migration changed to:", this.filters.migration);
    // In real app, this would trigger API call to get iterations for selected migration
    this.showNotification("Migration context updated", "info");
    this.updateIterationOptions();
  }

  onIterationChange() {
    console.log("Iteration changed to:", this.filters.iteration);
    // In real app, this would trigger API call to get plan data for selected iteration
    this.showNotification("Iteration context updated", "info");
    this.loadRunsheetData();
  }

  updateIterationOptions() {
    // Mock: Update iteration dropdown based on selected migration
    const iterationSelect = document.getElementById("iteration-select");
    const currentValue = iterationSelect.value;

    // Simulate different iterations for different migrations
    const iterationOptions = {
      "mig-001": [
        { value: "ite-001", text: "Iteration 1 - Core Infrastructure" },
        { value: "ite-002", text: "Iteration 2 - Application Migration" },
        { value: "ite-003", text: "Iteration 3 - Data Migration" },
      ],
      "mig-002": [
        { value: "ite-004", text: "Iteration 1 - Cloud Setup" },
        { value: "ite-005", text: "Iteration 2 - Service Migration" },
      ],
      "mig-003": [
        { value: "ite-006", text: "Iteration 1 - Legacy Analysis" },
        { value: "ite-007", text: "Iteration 2 - Modernization" },
      ],
    };

    const options =
      iterationOptions[this.filters.migration] || iterationOptions["mig-001"];

    iterationSelect.innerHTML = "";
    options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.text;
      iterationSelect.appendChild(optionElement);
    });

    // Try to maintain selection if possible
    if (
      Array.from(iterationSelect.options).some(
        (opt) => opt.value === currentValue,
      )
    ) {
      iterationSelect.value = currentValue;
    } else {
      iterationSelect.value = options[0].value;
      this.filters.iteration = options[0].value;
    }
  }

  loadRunsheetData() {
    // Mock: Load runsheet data for selected migration/iteration
    console.log(
      "Loading runsheet data for:",
      this.filters.migration,
      this.filters.iteration,
    );
    // In real app, this would be an API call
    this.showNotification("Runsheet data loaded", "success");
  }

  applyFilters() {
    console.log("Applying filters:", this.filters);

    // Show/hide step rows based on filters
    document.querySelectorAll(".step-row").forEach((row) => {
      let visible = true;

      // Apply team filter
      if (this.filters.team) {
        const teamCell = row.querySelector(".col-team");
        if (teamCell && !teamCell.textContent.includes(this.filters.team)) {
          visible = false;
        }
      }

      // Apply my teams only filter
      if (this.filters.myTeamsOnly) {
        const teamCell = row.querySelector(".col-team");
        // Mock: assume current user is in DB-Team
        if (teamCell && !teamCell.textContent.includes("DB-Team")) {
          visible = false;
        }
      }

      row.style.display = visible ? "grid" : "none";
    });

    // Show/hide sequences and phases based on filters
    document.querySelectorAll(".sequence-section").forEach((section) => {
      const hasVisibleSteps =
        section.querySelectorAll('.step-row:not([style*="display: none"])')
          .length > 0;
      section.style.display = hasVisibleSteps ? "block" : "none";
    });

    this.updateSummaryStats();
  }

  updateSummaryStats() {
    // Update summary statistics based on visible steps
    const visibleSteps = document.querySelectorAll(
      '.step-row:not([style*="display: none"])',
    );
    const total = visibleSteps.length;
    let pending = 0,
      inProgress = 0,
      completed = 0,
      failed = 0;

    visibleSteps.forEach((step) => {
      const status = step.querySelector(".col-status");
      if (status) {
        const statusText = status.textContent.trim();
        switch (statusText) {
          case "Pending":
            pending++;
            break;
          case "In Progress":
            inProgress++;
            break;
          case "Completed":
            completed++;
            break;
          case "Failed":
            failed++;
            break;
        }
      }
    });

    // Update stats display
    const statsElements = document.querySelectorAll(".summary-stats .stat");
    if (statsElements.length >= 5) {
      statsElements[0].textContent = `Total Steps: ${total}`;
      statsElements[1].textContent = `Pending: ${pending}`;
      statsElements[2].textContent = `In Progress: ${inProgress}`;
      statsElements[3].textContent = `Completed: ${completed}`;
      statsElements[4].textContent = `Failed: ${failed}`;
    }
  }

  selectStep(stepId) {
    // Remove previous selection
    document.querySelectorAll(".step-row").forEach((row) => {
      row.classList.remove("selected");
    });

    // Add selection to clicked row
    const selectedRow = document.querySelector(`[data-step="${stepId}"]`);
    if (selectedRow) {
      selectedRow.classList.add("selected");
      this.selectedStep = stepId;
      this.loadStepDetails(stepId);
    }
  }

  loadStepDetails(stepId) {
    console.log("Loading step details for:", stepId);

    // Mock: Update step details panel with selected step data
    // In real app, this would be an API call

    // For now, just show a notification
    this.showNotification(`Step ${stepId} selected`, "info");

    // Mock: Update some dynamic content based on step
    const stepTitle = document.querySelector(".step-title h3");
    if (stepTitle && stepId !== "INF-001-010") {
      const stepData = this.getStepData(stepId);
      if (stepData) {
        stepTitle.textContent = `📋 ${stepId}: ${stepData.title}`;
      }
    }
  }

  getStepData(stepId) {
    // Mock step data
    const stepData = {
      "INF-001-020": {
        title: "Validate Network Connectivity",
        team: "NET-Team",
      },
      "INF-001-030": { title: "Configure Load Balancer", team: "NET-Team" },
      "DAT-002-010": { title: "Stop Application Services", team: "APP-Team" },
      "DAT-002-020": { title: "Export Database Schema", team: "DB-Team" },
      "DAT-002-030": { title: "Transfer Data Files", team: "DB-Team" },
      "VAL-003-010": { title: "Smoke Test Applications", team: "APP-Team" },
      "VAL-003-020": { title: "Performance Baseline Test", team: "APP-Team" },
    };
    return stepData[stepId];
  }

  toggleSequence(sequenceHeader) {
    const icon = sequenceHeader.querySelector(".expand-icon");
    const sequenceSection = sequenceHeader.closest(".sequence-section");
    const phasesSections = sequenceSection.querySelectorAll(".phase-section");

    if (icon.classList.contains("collapsed")) {
      icon.classList.remove("collapsed");
      phasesSections.forEach((phase) => (phase.style.display = "block"));
    } else {
      icon.classList.add("collapsed");
      phasesSections.forEach((phase) => (phase.style.display = "none"));
    }
  }

  togglePhase(phaseHeader) {
    const icon = phaseHeader.querySelector(".expand-icon");
    const phaseSection = phaseHeader.closest(".phase-section");
    const stepsTable = phaseSection.querySelector(".steps-table");

    if (icon.classList.contains("collapsed")) {
      icon.classList.remove("collapsed");
      stepsTable.style.display = "block";
    } else {
      icon.classList.add("collapsed");
      stepsTable.style.display = "none";
    }
  }

  onInstructionToggle(checkbox) {
    const instructionRow = checkbox.closest(".instruction-row");
    const instructionNum = instructionRow.querySelector(".col-num").textContent;

    console.log(
      `Instruction ${instructionNum} ${checkbox.checked ? "completed" : "uncompleted"}`,
    );

    // Visual feedback
    if (checkbox.checked) {
      instructionRow.style.backgroundColor = "rgba(0, 135, 90, 0.1)";
      this.showNotification(
        `Instruction ${instructionNum} marked as completed`,
        "success",
      );
    } else {
      instructionRow.style.backgroundColor = "";
      this.showNotification(
        `Instruction ${instructionNum} marked as incomplete`,
        "info",
      );
    }
  }

  addComment(commentText) {
    if (!commentText.trim()) return;

    console.log("Adding comment:", commentText);

    // Mock: Add comment to the comments list
    const commentsList = document.querySelector(".comments-list");
    const newComment = document.createElement("div");
    newComment.className = "comment";
    newComment.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">Current User (DB-Team)</span>
                <span class="comment-time">Just now</span>
            </div>
            <div class="comment-body">
                "${commentText}"
            </div>
        `;

    commentsList.appendChild(newComment);

    // Update comment count
    const commentHeader = document.querySelector(".comments-section h4");
    const currentCount = parseInt(commentHeader.textContent.match(/\d+/)[0]);
    commentHeader.textContent = `💬 COMMENTS (${currentCount + 1})`;

    this.showNotification("Comment added successfully", "success");
  }

  onActionClick(actionText) {
    console.log("Action clicked:", actionText);

    switch (actionText) {
      case "Mark Instructions Complete":
        this.markInstructionsComplete();
        break;
      case "Update Status":
        this.updateStepStatus();
        break;
      case "Add Comment":
        // Handled in comment form
        break;
      default:
        this.showNotification(`Action: ${actionText}`, "info");
    }
  }

  markInstructionsComplete() {
    // Mark all instructions as complete
    document
      .querySelectorAll('.instruction-row input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = true;
        this.onInstructionToggle(checkbox);
      });

    this.showNotification("All instructions marked as complete", "success");
  }

  updateStepStatus() {
    // Mock: Update step status
    const statusElement = document.querySelector(
      ".metadata-item .status-pending",
    );
    if (statusElement) {
      statusElement.textContent = "In Progress";
      statusElement.className = "value status-progress";
    }

    // Update in runsheet
    const selectedRow = document.querySelector(".step-row.selected");
    if (selectedRow) {
      const statusCell = selectedRow.querySelector(".col-status");
      if (statusCell) {
        statusCell.textContent = "In Progress";
        statusCell.className = "col-status status-progress";
      }
    }

    this.updateSummaryStats();
    this.showNotification("Step status updated to In Progress", "success");
  }

  showNotification(message, type = "info") {
    // Create notification element
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

    // Set background color based on type
    const colors = {
      info: "#0065FF",
      success: "#00875A",
      warning: "#FF8B00",
      error: "#DE350B",
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    // Add CSS animation
    const style = document.createElement("style");
    style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
    document.head.appendChild(style);

    // Add to DOM
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 3000);
  }

  updateFilters() {
    // Initialize filter state
    this.applyFilters();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new IterationView();
});

// Export for potential module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = IterationView;
}
