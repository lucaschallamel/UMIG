/**
 * Table Manager Module
 *
 * Handles table rendering, sorting, pagination, and data display functionality.
 */

(function () {
  "use strict";

  // Table Manager
  const TableManager = {
    /**
     * Initialize table manager
     */
    init: function () {
      this.bindEvents();
    },

    /**
     * Bind table-related events
     */
    bindEvents: function () {
      // Only bind events once to avoid duplicates
      if (this.eventsbound) return;
      this.eventsbound = true;

      // Table header sorting
      document.addEventListener("click", (e) => {
        if (e.target.matches("[data-field]")) {
          this.handleSort(e.target);
        }
      });

      // Pagination controls
      document.addEventListener("click", (e) => {
        // Handle specific pagination buttons
        if (e.target.matches("#firstPageBtn")) {
          this.goToPage(1);
        } else if (e.target.matches("#prevPageBtn")) {
          this.goToPreviousPage();
        } else if (e.target.matches("#nextPageBtn")) {
          this.goToNextPage();
        } else if (e.target.matches("#lastPageBtn")) {
          const state = window.AdminGuiState
            ? window.AdminGuiState.getState()
            : {};
          if (state.pagination) {
            this.goToPage(state.pagination.totalPages);
          }
        } else if (e.target.matches(".page-number")) {
          this.handlePageNumber(e.target);
        }
      });

      // Page size change - use event delegation
      document.addEventListener("change", (e) => {
        if (e.target.matches("#pageSize")) {
          this.handlePageSizeChange(e.target);
        }
      });

      // Row selection (only bind if feature flags are enabled)
      document.addEventListener("click", (e) => {
        if (
          e.target.matches(".row-checkbox") &&
          window.EntityConfig &&
          window.EntityConfig.getFeatureFlag("enableRowSelection")
        ) {
          this.handleRowSelection(e.target);
        } else if (
          e.target.matches(".select-all-checkbox") &&
          window.EntityConfig &&
          window.EntityConfig.getFeatureFlag("enableSelectAll")
        ) {
          this.handleSelectAll(e.target);
        }
      });

      // Action buttons
      document.addEventListener("click", (e) => {
        if (e.target.matches(".btn-table-action")) {
          this.handleTableAction(e.target);
        }
      });
    },

    /**
     * Render data table
     * @param {Array} data - Table data
     * @param {string} entityType - Entity type
     * @param {HTMLElement} container - Container element
     */
    renderTable: function (data, entityType, container) {
      console.log("TableManager.renderTable called with container:", container);

      // Find the table wrapper - it should be inside the container
      let tableWrapper = container.querySelector(".table-wrapper");
      if (!tableWrapper) {
        // If container IS the table-wrapper, use it
        if (
          container.classList &&
          container.classList.contains("table-wrapper")
        ) {
          tableWrapper = container;
        } else {
          // Look for an existing table to find its wrapper
          const existingTable = container.querySelector(".data-table");
          if (
            existingTable &&
            existingTable.parentElement.classList.contains("table-wrapper")
          ) {
            tableWrapper = existingTable.parentElement;
          }
        }
      }

      if (!data || data.length === 0) {
        this.renderEmptyTable(tableWrapper || container, entityType);
        return;
      }

      const entity = window.EntityConfig
        ? window.EntityConfig.getEntity(entityType)
        : null;
      if (!entity) {
        console.error("Entity configuration not found:", entityType);
        console.error(
          "Available entities:",
          window.EntityConfig
            ? Object.keys(window.EntityConfig.getAllEntities())
            : "EntityConfig not loaded",
        );
        console.error("Looking for entityType:", entityType);
        console.error("EntityConfig loaded?", !!window.EntityConfig);
        return;
      }

      const tableHtml = this.buildTableHtml(data, entity);

      if (tableWrapper) {
        console.log("Updating table-wrapper content");
        tableWrapper.innerHTML = tableHtml;
      } else {
        console.warn(
          "No table-wrapper found, looking for alternative update method",
        );
        // Try to preserve pagination by only updating the table
        const existingTable = container.querySelector(".data-table");
        if (existingTable) {
          // Create a temporary div to hold the new table
          const temp = document.createElement("div");
          temp.innerHTML = tableHtml;
          const newTable = temp.querySelector(".data-table");
          if (newTable) {
            existingTable.parentNode.replaceChild(newTable, existingTable);
          }
        } else {
          // Last resort - but this will remove pagination
          console.error(
            "Warning: Updating entire container - pagination may be lost",
          );
          container.innerHTML = tableHtml;
        }
      }

      // Apply status colors after rendering
      if (window.StatusColorService) {
        // Determine entity type for status lookup
        const statusEntityType = this.getStatusEntityType(entityType);
        window.StatusColorService.applyStatusColors(
          container,
          statusEntityType,
        );
      }

      // Update selection UI after rendering
      setTimeout(() => {
        this.updateSelectionUI();
      }, 50);
    },

    /**
     * Get the appropriate entity type for status lookup
     * @param {string} entityType - The entity type from EntityConfig
     * @returns {string} The entity type to use for status lookup
     */
    getStatusEntityType: function (entityType) {
      // Map entity types to their status types
      const statusTypeMap = {
        migrations: "Migration",
        iterations: "Iteration",
        plans: "Plan",
        sequences: "Sequence",
        phases: "Phase",
        steps: "Step",
        instructions: "Instruction",
      };

      return statusTypeMap[entityType] || "Step";
    },

    /**
     * Build table HTML
     * @param {Array} data - Table data
     * @param {Object} entity - Entity configuration
     * @returns {string} Table HTML
     */
    buildTableHtml: function (data, entity) {
      const headerHtml = this.buildTableHeader(entity);
      const bodyHtml = this.buildTableBody(data, entity);

      return `
                <table class="data-table" id="dataTable">
                    <thead id="tableHeader">
                        ${headerHtml}
                    </thead>
                    <tbody id="tableBody">
                        ${bodyHtml}
                    </tbody>
                </table>
            `;
    },

    /**
     * Build table header
     * @param {Object} entity - Entity configuration
     * @returns {string} Header HTML
     */
    buildTableHeader: function (entity) {
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const sortField = state.sortField;
      const sortDirection = state.sortDirection;

      let headerHtml = "<tr>";

      // Add selection checkbox column (conditionally based on feature flag)
      if (
        window.EntityConfig &&
        window.EntityConfig.getFeatureFlag("enableSelectAll")
      ) {
        headerHtml +=
          '<th class="selection-column"><input type="checkbox" class="select-all-checkbox"></th>';
      }

      // Add data columns
      entity.tableColumns.forEach((column) => {
        const field = entity.fields.find((f) => f.key === column);
        const label = field ? field.label : this.formatColumnName(column);
        const sortable = entity.sortMapping && entity.sortMapping[column];

        let sortIcon = "";
        if (sortable) {
          // Check if this column is currently sorted by comparing the mapped field
          const mappedField = entity.sortMapping[column];
          if (sortField === mappedField) {
            sortIcon = sortDirection === "asc" ? " ▲" : " ▼";
          }
        }

        headerHtml += `<th ${sortable ? `data-field="${column}"` : ""}>${label}${sortIcon}</th>`;
      });

      // Add actions column
      headerHtml += '<th class="actions-column">Actions</th>';
      headerHtml += "</tr>";

      return headerHtml;
    },

    /**
     * Build table body
     * @param {Array} data - Table data
     * @param {Object} entity - Entity configuration
     * @returns {string} Body HTML
     */
    buildTableBody: function (data, entity) {
      let bodyHtml = "";

      if (data && Array.isArray(data) && data.length > 0) {
        data.forEach((row) => {
          bodyHtml += this.buildTableRow(row, entity);
        });
      } else {
        // Show empty message
        let colSpan = entity.tableColumns.length + 1; // +1 for actions column
        // Add 1 more for checkbox column if enabled
        if (
          window.EntityConfig &&
          window.EntityConfig.getFeatureFlag("enableRowSelection")
        ) {
          colSpan += 1;
        }
        bodyHtml = `
                    <tr>
                        <td colspan="${colSpan}" class="text-center">
                            <p>No data available</p>
                        </td>
                    </tr>
                `;
      }

      return bodyHtml;
    },

    /**
     * Build table row
     * @param {Object} row - Row data
     * @param {Object} entity - Entity configuration
     * @returns {string} Row HTML
     */
    buildTableRow: function (row, entity) {
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const selectedRows = state.selectedRows || new Set();
      const rowId = row[entity.fields[0].key]; // Use first field as ID
      const isSelected = selectedRows.has(rowId?.toString());

      let rowHtml = `<tr class="${isSelected ? "selected" : ""}">`;

      // Selection checkbox (conditionally based on feature flag)
      if (
        window.EntityConfig &&
        window.EntityConfig.getFeatureFlag("enableRowSelection")
      ) {
        rowHtml += `<td><input type="checkbox" class="row-checkbox" value="${rowId}" ${isSelected ? "checked" : ""}></td>`;
      }

      // Data columns
      entity.tableColumns.forEach((column) => {
        let value = row[column];
        let formattedValue;

        // Handle special display columns
        if (column === "role_display") {
          // Check if user is super admin first
          if (
            row.usr_is_admin === true ||
            row.usr_is_admin === "true" ||
            row.usr_is_admin === 1
          ) {
            formattedValue = this.formatRoleDisplay("Super Admin");
          } else {
            // Get role from role_name or rls_id
            const roleName = row.role_name || row.role_display;
            const roleId = row.rls_id;

            if (roleName) {
              formattedValue = this.formatRoleDisplay(roleName);
            } else if (roleId) {
              // Map role ID to name
              const roleMap = { 1: "Admin", 2: "User", 3: "Pilot" };
              formattedValue = this.formatRoleDisplay(
                roleMap[roleId] || "Unknown",
              );
            } else {
              formattedValue = this.formatRoleDisplay("No Role");
            }
          }
        } else if (column === "status_display") {
          // Get status from usr_active
          const isActive = row.usr_active;
          formattedValue = this.formatStatusDisplay(isActive);
        } else {
          // Check for custom renderers
          // Use the entity configuration that was already passed in
          if (entity?.customRenderers?.[column]) {
            formattedValue = entity.customRenderers[column](value, row);
          } else {
            formattedValue = this.formatCellValue(value, column, entity);
          }
        }

        rowHtml += `<td>${formattedValue}</td>`;
      });

      // Actions column
      rowHtml += `<td class="actions-column">${this.buildActionButtons(rowId, entity)}</td>`;
      rowHtml += "</tr>";

      return rowHtml;
    },

    /**
     * Build action buttons
     * @param {string} rowId - Row ID
     * @param {Object} entity - Entity configuration
     * @returns {string} Action buttons HTML
     */
    buildActionButtons: function (rowId, entity) {
      const currentEntity = window.AdminGuiState
        ? window.AdminGuiState.getState().currentEntity
        : "";

      return `
                <div class="action-buttons">
                    <button class="btn-table-action" data-action="view" data-id="${rowId}" title="View">
                        👁️
                    </button>
                    <button class="btn-table-action" data-action="edit" data-id="${rowId}" title="Edit">
                        ✏️
                    </button>
                    <button class="btn-table-action" data-action="delete" data-id="${rowId}" title="Delete">
                        🗑️
                    </button>
                </div>
            `;
    },

    /**
     * Format cell value for display
     * @param {*} value - Cell value
     * @param {string} column - Column name
     * @param {Object} entity - Entity configuration
     * @returns {string} Formatted value
     */
    formatCellValue: function (value, column, entity) {
      if (value === null || value === undefined) {
        return "";
      }

      const field = entity.fields.find((f) => f.key === column);

      // Format based on field type
      if (field) {
        switch (field.type) {
          case "boolean":
            return window.UiUtils
              ? window.UiUtils.formatBoolean(value)
              : value
                ? "Yes"
                : "No";
          case "datetime":
            return window.UiUtils ? window.UiUtils.formatDate(value) : value;
          case "date":
            return window.UiUtils
              ? window.UiUtils.formatDate(value, false)
              : value;
        }
      }

      // Special column formatting
      if (column.includes("status")) {
        return window.UiUtils ? window.UiUtils.formatStatus(value) : value;
      }

      // Default: escape HTML and return
      return window.UiUtils
        ? window.UiUtils.sanitizeHtml(value.toString())
        : value.toString();
    },

    /**
     * Format column name for display
     * @param {string} column - Column name
     * @returns {string} Formatted column name
     */
    formatColumnName: function (column) {
      return column.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    },

    /**
     * Render empty table
     * @param {HTMLElement} container - Container element
     * @param {string} entityType - Entity type
     */
    renderEmptyTable: function (container, entityType) {
      const entity = window.EntityConfig
        ? window.EntityConfig.getEntity(entityType)
        : null;
      const entityName = entity ? entity.name : entityType;

      if (window.UiUtils) {
        window.UiUtils.showEmptyState(
          container,
          `No ${entityName.toLowerCase()} found`,
          `Add ${entityName.slice(0, -1)}`,
          () => {
            if (window.ModalManager) {
              window.ModalManager.showEditModal(null);
            }
          },
        );
      } else {
        container.innerHTML = `<div class="empty-state">No ${entityName.toLowerCase()} found</div>`;
      }
    },

    /**
     * Render pagination controls
     * @param {HTMLElement} container - Container element
     */
    renderPagination: function (container) {
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const pagination = state.pagination || {
        currentPage: 1,
        pageSize: 50,
        totalItems: 0,
        totalPages: 1,
      };

      console.log("TableManager.renderPagination called with:", pagination);

      // Update pagination info
      const paginationInfo = document.getElementById("paginationInfo");
      if (paginationInfo) {
        if (pagination.totalItems > 0) {
          const start = (pagination.currentPage - 1) * pagination.pageSize + 1;
          const end = Math.min(
            pagination.currentPage * pagination.pageSize,
            pagination.totalItems,
          );
          paginationInfo.textContent = `Showing ${start}-${end} of ${pagination.totalItems} items`;
        } else {
          paginationInfo.textContent = "No items to display";
        }
      }

      // Update pagination buttons
      const firstBtn = document.getElementById("firstPageBtn");
      const prevBtn = document.getElementById("prevPageBtn");
      const nextBtn = document.getElementById("nextPageBtn");
      const lastBtn = document.getElementById("lastPageBtn");

      if (firstBtn) firstBtn.disabled = pagination.currentPage === 1;
      if (prevBtn) prevBtn.disabled = pagination.currentPage === 1;
      if (nextBtn)
        nextBtn.disabled = pagination.currentPage === pagination.totalPages;
      if (lastBtn)
        lastBtn.disabled = pagination.currentPage === pagination.totalPages;

      // Update page numbers
      const pageNumbersContainer = document.getElementById("pageNumbers");
      if (pageNumbersContainer) {
        const pageNumbers = this.getPageNumbers(
          pagination.currentPage,
          pagination.totalPages,
        );
        let pageNumbersHtml = "";

        pageNumbers.forEach((pageNum) => {
          if (pageNum === "...") {
            pageNumbersHtml += '<span class="page-ellipsis">...</span>';
          } else {
            pageNumbersHtml += `<button class="page-number ${pageNum === pagination.currentPage ? "active" : ""}" data-page="${pageNum}">${pageNum}</button>`;
          }
        });

        pageNumbersContainer.innerHTML = pageNumbersHtml;
      }

      // Update page size selector
      const pageSizeSelect = document.getElementById("pageSize");
      if (
        pageSizeSelect &&
        pagination.pageSize &&
        pageSizeSelect.value !== pagination.pageSize.toString()
      ) {
        pageSizeSelect.value = pagination.pageSize.toString();
      }
    },

    /**
     * Build pagination HTML
     * @param {Object} pagination - Pagination data
     * @returns {string} Pagination HTML
     */
    buildPaginationHtml: function (pagination) {
      const currentPage = pagination.currentPage || 1;
      const totalPages = pagination.totalPages || 1;
      const totalItems = pagination.totalItems || 0;

      let paginationHtml = '<div class="table-footer">';

      // Items info
      paginationHtml += `<div class="pagination-info">Showing ${totalItems} items</div>`;

      // Pagination controls
      paginationHtml += '<div class="pagination-controls">';

      // Previous button
      paginationHtml += `<button class="pagination-btn" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>Previous</button>`;

      // Page numbers
      paginationHtml += '<div class="page-numbers">';
      const pageNumbers = this.getPageNumbers(currentPage, totalPages);
      pageNumbers.forEach((pageNum) => {
        if (pageNum === "...") {
          paginationHtml += '<span class="page-ellipsis">...</span>';
        } else {
          paginationHtml += `<button class="page-number ${pageNum === currentPage ? "active" : ""}" data-page="${pageNum}">${pageNum}</button>`;
        }
      });
      paginationHtml += "</div>";

      // Next button
      paginationHtml += `<button class="pagination-btn" data-page="next" ${currentPage === totalPages ? "disabled" : ""}>Next</button>`;

      paginationHtml += "</div>";
      paginationHtml += "</div>";

      return paginationHtml;
    },

    /**
     * Get page numbers to display
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     * @returns {Array} Page numbers array
     */
    getPageNumbers: function (currentPage, totalPages) {
      const pageNumbers = [];
      const maxVisible = 5;

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) {
            pageNumbers.push(i);
          }
          pageNumbers.push("...");
          pageNumbers.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pageNumbers.push(1);
          pageNumbers.push("...");
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pageNumbers.push(i);
          }
        } else {
          pageNumbers.push(1);
          pageNumbers.push("...");
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pageNumbers.push(i);
          }
          pageNumbers.push("...");
          pageNumbers.push(totalPages);
        }
      }

      return pageNumbers;
    },

    /**
     * Handle table sorting
     * @param {HTMLElement} header - Header element
     */
    handleSort: function (header) {
      const field = header.dataset.field;
      if (!field) return;

      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const currentSortField = state.sortField;
      const currentSortDirection = state.sortDirection;

      // Get the entity configuration to use sortMapping
      const entityType = state.currentEntity;
      const entity = window.EntityConfig
        ? window.EntityConfig.getEntity(entityType)
        : null;

      // Map display column to actual database field using sortMapping
      let actualSortField = field;
      if (entity && entity.sortMapping && entity.sortMapping[field]) {
        actualSortField = entity.sortMapping[field];
      }

      let newDirection = "asc";
      if (
        currentSortField === actualSortField &&
        currentSortDirection === "asc"
      ) {
        newDirection = "desc";
      }

      if (window.AdminGuiState) {
        window.AdminGuiState.search.setSort(actualSortField, newDirection);
      }

      // Reload data
      if (window.AdminGuiController) {
        window.AdminGuiController.loadCurrentSection();
      }
    },

    /**
     * Go to specific page
     * @param {number} page - Page number
     */
    goToPage: function (page) {
      console.log(`TableManager.goToPage called with page: ${page}`);
      
      if (window.AdminGuiState) {
        const stateBefore = window.AdminGuiState.getState();
        console.log("State before page change:", { 
          currentPage: stateBefore.currentPage, 
          pageSize: stateBefore.pageSize 
        });
        
        window.AdminGuiState.pagination.setCurrentPage(page);
        
        const stateAfter = window.AdminGuiState.getState();
        console.log("State after page change:", { 
          currentPage: stateAfter.currentPage, 
          pageSize: stateAfter.pageSize 
        });
      }

      // Reload data
      if (window.AdminGuiController) {
        console.log("Reloading current section...");
        window.AdminGuiController.loadCurrentSection();
      }
    },

    /**
     * Go to previous page
     */
    goToPreviousPage: function () {
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const currentPage = state.pagination?.currentPage || 1;

      if (currentPage > 1) {
        this.goToPage(currentPage - 1);
      }
    },

    /**
     * Go to next page
     */
    goToNextPage: function () {
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const currentPage = state.pagination?.currentPage || 1;
      const totalPages = state.pagination?.totalPages || 1;

      if (currentPage < totalPages) {
        this.goToPage(currentPage + 1);
      }
    },

    /**
     * Handle page number click
     * @param {HTMLElement} button - Page number button
     */
    handlePageNumber: function (button) {
      const page = parseInt(button.dataset.page);
      if (isNaN(page)) return;

      if (window.AdminGuiState) {
        window.AdminGuiState.pagination.setCurrentPage(page);
      }

      // Reload data
      if (window.AdminGuiController) {
        window.AdminGuiController.loadCurrentSection();
      }
    },

    /**
     * Handle page size change
     * @param {HTMLElement} select - Page size select
     */
    handlePageSizeChange: function (select) {
      const pageSize = parseInt(select.value);
      if (isNaN(pageSize)) return;

      console.log("Page size changed to:", pageSize);

      if (window.AdminGuiState) {
        const stateBefore = window.AdminGuiState.getState();
        console.log("State before page size change:", { 
          currentPage: stateBefore.currentPage, 
          pageSize: stateBefore.pageSize,
          totalItems: stateBefore.pagination?.totalItems
        });

        // Reset to first page when changing page size
        window.AdminGuiState.pagination.setCurrentPage(1);
        window.AdminGuiState.pagination.setPageSize(pageSize);

        const stateAfter = window.AdminGuiState.getState();
        console.log("State after page size change:", { 
          currentPage: stateAfter.currentPage, 
          pageSize: stateAfter.pageSize,
          totalItems: stateAfter.pagination?.totalItems
        });
      }

      // Add a small delay to ensure state is properly set
      setTimeout(() => {
        // Reload data
        if (window.AdminGuiController) {
          console.log("Reloading data with new page size...");
          window.AdminGuiController.loadCurrentSection();
        }
      }, 10);
    },

    /**
     * Handle row selection
     * @param {HTMLElement} checkbox - Row checkbox
     */
    handleRowSelection: function (checkbox) {
      const rowId = checkbox.value;

      if (window.AdminGuiState) {
        if (checkbox.checked) {
          window.AdminGuiState.selection.selectRow(rowId);
        } else {
          window.AdminGuiState.selection.deselectRow(rowId);
        }
      }

      // Update UI after selection change
      this.updateSelectionUI();
    },

    /**
     * Handle select all checkbox
     * @param {HTMLElement} checkbox - Select all checkbox
     */
    handleSelectAll: function (checkbox) {
      const rowCheckboxes = document.querySelectorAll(".row-checkbox");

      if (window.AdminGuiState) {
        if (checkbox.checked) {
          // Select all rows
          rowCheckboxes.forEach((rowCheckbox) => {
            rowCheckbox.checked = true;
            window.AdminGuiState.selection.selectRow(rowCheckbox.value);
          });
        } else {
          // Deselect all rows
          rowCheckboxes.forEach((rowCheckbox) => {
            rowCheckbox.checked = false;
            window.AdminGuiState.selection.deselectRow(rowCheckbox.value);
          });
        }
      }

      // Update UI after selection change
      this.updateSelectionUI();
    },

    /**
     * Update selection-related UI elements
     */
    updateSelectionUI: function () {
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const selectedRows = state.selectedRows || new Set();
      const selectedCount = selectedRows.size;

      // Update bulk actions button (only if bulk actions are enabled)
      if (
        window.EntityConfig &&
        window.EntityConfig.getFeatureFlag("enableBulkActions")
      ) {
        const bulkActionsBtn = document.getElementById("bulkActionsBtn");
        if (bulkActionsBtn) {
          bulkActionsBtn.disabled = selectedCount === 0;

          // Update button text to show count
          if (selectedCount > 0) {
            bulkActionsBtn.textContent = `Bulk Actions (${selectedCount})`;
          } else {
            bulkActionsBtn.textContent = "Bulk Actions";
          }
        }
      }

      // Update select-all checkbox state (only if selection is enabled)
      if (
        window.EntityConfig &&
        window.EntityConfig.getFeatureFlag("enableSelectAll")
      ) {
        const selectAllCheckbox = document.querySelector(
          ".select-all-checkbox",
        );
        const rowCheckboxes = document.querySelectorAll(".row-checkbox");

        if (selectAllCheckbox && rowCheckboxes.length > 0) {
          const allSelected = Array.from(rowCheckboxes).every(
            (checkbox) => checkbox.checked,
          );
          const someSelected = Array.from(rowCheckboxes).some(
            (checkbox) => checkbox.checked,
          );

          selectAllCheckbox.checked = allSelected;
          selectAllCheckbox.indeterminate = someSelected && !allSelected;
        }
      }
    },

    /**
     * Handle table action
     * @param {HTMLElement} button - Action button
     */
    handleTableAction: function (button) {
      const action = button.dataset.action;
      const id = button.dataset.id;

      switch (action) {
        case "view":
          this.handleViewAction(id);
          break;
        case "edit":
          this.handleEditAction(id);
          break;
        case "delete":
          this.handleDeleteAction(id);
          break;
      }
    },

    /**
     * Handle view action
     * @param {string} id - Row ID
     */
    handleViewAction: function (id) {
      if (window.ModalManager) {
        window.ModalManager.showViewModal(id);
      }
    },

    /**
     * Handle edit action
     * @param {string} id - Row ID
     */
    handleEditAction: function (id) {
      if (window.ModalManager) {
        window.ModalManager.showEditModal(id);
      }
    },

    /**
     * Handle delete action
     * @param {string} id - Row ID
     */
    handleDeleteAction: function (id) {
      if (window.UiUtils) {
        window.UiUtils.showConfirmDialog(
          "Are you sure you want to delete this item?",
          () => {
            if (window.AdminGuiController) {
              window.AdminGuiController.deleteEntity(id);
            }
          },
        );
      }
    },

    /**
     * Format role display with colored label
     * @param {string} role - Role name
     * @returns {string} Formatted role HTML
     */
    formatRoleDisplay: function (role) {
      const roleClasses = {
        "Super Admin": "role-badge role-superadmin",
        Admin: "role-badge role-admin",
        User: "role-badge role-user",
        Pilot: "role-badge role-pilot",
        "No Role": "role-badge role-none",
      };

      const roleClass = roleClasses[role] || "role-badge role-none";
      return `<span class="${roleClass}">${role}</span>`;
    },

    /**
     * Format status display with colored label
     * @param {boolean} isActive - Active status
     * @returns {string} Formatted status HTML
     */
    formatStatusDisplay: function (isActive) {
      if (isActive === true || isActive === "true" || isActive === 1) {
        return '<span class="status-badge status-active">Active</span>';
      } else {
        return '<span class="status-badge status-inactive">Inactive</span>';
      }
    },
  };

  // Export to global namespace
  window.TableManager = TableManager;
})();
