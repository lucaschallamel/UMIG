/**
 * UMIG Import Queue Management GUI - US-034 Enhancement
 *
 * Provides user interface for:
 * - Import queue monitoring
 * - Schedule management
 * - Resource utilization tracking
 * - Import request management
 *
 * Integrates with the new US-034 database tables:
 * - stg_import_queue_management_iqm
 * - stg_import_resource_locks_irl  
 * - stg_scheduled_import_schedules_sis
 * - stg_schedule_execution_history_seh
 *
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 2 Integration
 */

(function () {
  "use strict";

  // Import Queue Management namespace
  window.importQueueGui = {
    // State management
    state: {
      currentView: 'queue',
      refreshInterval: 5000, // 5 seconds
      refreshTimer: null,
      selectedRequest: null,
      selectedSchedule: null,
      queueData: null,
      scheduleData: null,
      resourceData: null
    },

    // API endpoints  
    api: {
      baseUrl: '/rest/scriptrunner/latest/custom',
      endpoints: {
        queue: '/import-queue',
        request: '/import-request',
        schedules: '/import-schedules',
        resources: '/import-resources'
      }
    },

    /**
     * Initialize Import Queue GUI
     */
    init() {
      console.log('Initializing Import Queue Management GUI');
      this.setupEventHandlers();
      this.initializeViews();
      this.startAutoRefresh();
      this.loadQueueStatus();
    },

    /**
     * Setup event handlers for queue management
     */
    setupEventHandlers() {
      // View switching
      $(document).on('click', '[data-queue-view]', (e) => {
        e.preventDefault();
        const view = $(e.target).data('queue-view');
        this.switchView(view);
      });

      // Queue management actions
      $(document).on('click', '[data-queue-action]', (e) => {
        e.preventDefault();
        const action = $(e.target).data('queue-action');
        const requestId = $(e.target).data('request-id');
        this.handleQueueAction(action, requestId);
      });

      // Schedule management actions
      $(document).on('click', '[data-schedule-action]', (e) => {
        e.preventDefault();
        const action = $(e.target).data('schedule-action');
        const scheduleId = $(e.target).data('schedule-id');
        this.handleScheduleAction(action, scheduleId);
      });

      // Refresh controls
      $(document).on('click', '[data-refresh]', (e) => {
        e.preventDefault();
        this.refreshCurrentView();
      });

      // Auto-refresh toggle
      $(document).on('change', '#auto-refresh-toggle', (e) => {
        if (e.target.checked) {
          this.startAutoRefresh();
        } else {
          this.stopAutoRefresh();
        }
      });
    },

    /**
     * Initialize view containers
     */
    initializeViews() {
      const $container = $('#import-queue-container');
      if ($container.length === 0) {
        console.warn('Import queue container not found');
        return;
      }

      // Create view navigation
      const navHtml = `
        <div class="import-queue-nav">
          <ul class="nav nav-tabs">
            <li class="active">
              <a href="#" data-queue-view="queue">
                <i class="fa fa-list"></i> Queue Status
              </a>
            </li>
            <li>
              <a href="#" data-queue-view="schedules">
                <i class="fa fa-calendar"></i> Schedules
              </a>
            </li>
            <li>
              <a href="#" data-queue-view="resources">
                <i class="fa fa-tachometer"></i> Resources
              </a>
            </li>
          </ul>
          <div class="nav-controls">
            <label class="checkbox">
              <input type="checkbox" id="auto-refresh-toggle" checked>
              Auto Refresh (5s)
            </label>
            <button class="aui-button aui-button-compact" data-refresh>
              <i class="fa fa-refresh"></i> Refresh
            </button>
          </div>
        </div>
      `;

      // Create view content areas
      const contentHtml = `
        <div class="import-queue-content">
          <div id="queue-view" class="queue-view active">
            <div class="loading-indicator">
              <i class="fa fa-spinner fa-spin"></i> Loading queue status...
            </div>
          </div>
          <div id="schedules-view" class="queue-view">
            <div class="loading-indicator">
              <i class="fa fa-spinner fa-spin"></i> Loading schedules...
            </div>
          </div>
          <div id="resources-view" class="queue-view">
            <div class="loading-indicator">
              <i class="fa fa-spinner fa-spin"></i> Loading resource status...
            </div>
          </div>
        </div>
      `;

      $container.html(navHtml + contentHtml);
    },

    /**
     * Switch between different views
     */
    switchView(viewName) {
      // Update navigation
      $('.import-queue-nav .nav li').removeClass('active');
      $(`[data-queue-view="${viewName}"]`).closest('li').addClass('active');

      // Update content
      $('.queue-view').removeClass('active');
      $(`#${viewName}-view`).addClass('active');

      // Update state and load data
      this.state.currentView = viewName;
      this.loadViewData(viewName);
    },

    /**
     * Load data for specific view
     */
    async loadViewData(viewName) {
      try {
        switch (viewName) {
          case 'queue':
            await this.loadQueueStatus();
            break;
          case 'schedules':
            await this.loadSchedules();
            break;
          case 'resources':
            await this.loadResources();
            break;
        }
      } catch (error) {
        console.error(`Failed to load ${viewName} data:`, error);
        this.showError(`Failed to load ${viewName} data`, error.message);
      }
    },

    /**
     * Load queue status and active imports
     */
    async loadQueueStatus() {
      try {
        const response = await $.get(`${this.api.baseUrl}${this.api.endpoints.queue}`);
        this.state.queueData = response;
        this.renderQueueView(response);
      } catch (error) {
        console.error('Failed to load queue status:', error);
        this.showError('Failed to load queue status', error.responseText);
      }
    },

    /**
     * Render queue status view
     */
    renderQueueView(data) {
      const $view = $('#queue-view');
      
      // System overview
      const systemHtml = `
        <div class="queue-overview">
          <div class="overview-cards">
            <div class="overview-card">
              <h3>Active Imports</h3>
              <div class="metric-value">${data.queue?.activeRequests?.length || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Queued Requests</h3>
              <div class="metric-value">${data.queue?.queuedRequests?.length || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Available Slots</h3>
              <div class="metric-value">${data.system?.availableSlots || 0}</div>
            </div>
            <div class="overview-card">
              <h3>System Load</h3>
              <div class="metric-value">${this.formatPercentage(data.resources?.systemLoad || 0)}</div>
            </div>
          </div>
        </div>
      `;

      // Active imports table
      const activeImportsHtml = this.renderActiveImportsTable(data.queue?.activeRequests || []);
      
      // Queued requests table  
      const queuedRequestsHtml = this.renderQueuedRequestsTable(data.queue?.queuedRequests || []);

      // System recommendations
      const recommendationsHtml = `
        <div class="system-recommendations">
          <h3><i class="fa fa-lightbulb-o"></i> System Recommendations</h3>
          <ul>
            ${(data.recommendations || []).map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      `;

      const html = systemHtml + activeImportsHtml + queuedRequestsHtml + recommendationsHtml;
      $view.html(html);
    },

    /**
     * Render active imports table
     */
    renderActiveImportsTable(activeImports) {
      if (activeImports.length === 0) {
        return '<div class="no-data"><i class="fa fa-info-circle"></i> No active imports</div>';
      }

      const tableHtml = `
        <div class="active-imports">
          <h3><i class="fa fa-cog fa-spin"></i> Active Imports</h3>
          <table class="aui active-imports-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Type</th>
                <th>User</th>
                <th>Progress</th>
                <th>Started</th>
                <th>ETA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${activeImports.map(request => `
                <tr>
                  <td>
                    <span class="request-id" title="${request.requestId}">
                      ${request.requestId.substring(0, 8)}...
                    </span>
                  </td>
                  <td>${request.importType || 'N/A'}</td>
                  <td>${request.userId || 'Unknown'}</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${request.progress || 0}%"></div>
                    </div>
                    <span class="progress-text">${request.progress || 0}%</span>
                  </td>
                  <td>${this.formatTimestamp(request.startedAt)}</td>
                  <td>${this.formatDuration(request.estimatedCompletion)}</td>
                  <td>
                    <button class="aui-button aui-button-compact" 
                            data-queue-action="cancel" 
                            data-request-id="${request.requestId}"
                            title="Cancel Import">
                      <i class="fa fa-stop"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      return tableHtml;
    },

    /**
     * Render queued requests table
     */
    renderQueuedRequestsTable(queuedRequests) {
      if (queuedRequests.length === 0) {
        return '<div class="no-data"><i class="fa fa-info-circle"></i> No queued requests</div>';
      }

      const tableHtml = `
        <div class="queued-requests">
          <h3><i class="fa fa-hourglass-half"></i> Queued Requests</h3>
          <table class="aui queued-requests-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Request ID</th>
                <th>Type</th>
                <th>User</th>
                <th>Priority</th>
                <th>Queued</th>
                <th>Est. Wait</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${queuedRequests.map((request, index) => `
                <tr>
                  <td><span class="queue-position">#${index + 1}</span></td>
                  <td>
                    <span class="request-id" title="${request.requestId}">
                      ${request.requestId.substring(0, 8)}...
                    </span>
                  </td>
                  <td>${request.importType || 'N/A'}</td>
                  <td>${request.userId || 'Unknown'}</td>
                  <td>
                    <span class="priority priority-${request.priority > 10 ? 'high' : request.priority > 5 ? 'medium' : 'low'}">
                      ${request.priority || 5}
                    </span>
                  </td>
                  <td>${this.formatTimestamp(request.queuedAt)}</td>
                  <td>${this.formatDuration(request.estimatedWaitTime)}</td>
                  <td>
                    <button class="aui-button aui-button-compact" 
                            data-queue-action="cancel" 
                            data-request-id="${request.requestId}"
                            title="Cancel Request">
                      <i class="fa fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      return tableHtml;
    },

    /**
     * Load import schedules
     */
    async loadSchedules() {
      try {
        const response = await $.get(`${this.api.baseUrl}${this.api.endpoints.schedules}`);
        this.state.scheduleData = response;
        this.renderSchedulesView(response);
      } catch (error) {
        console.error('Failed to load schedules:', error);
        this.showError('Failed to load schedules', error.responseText);
      }
    },

    /**
     * Render schedules view
     */
    renderSchedulesView(data) {
      const $view = $('#schedules-view');
      
      // Schedule overview
      const overviewHtml = `
        <div class="schedule-overview">
          <div class="overview-cards">
            <div class="overview-card">
              <h3>Active Schedules</h3>
              <div class="metric-value">${data.statistics?.activeSchedules || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Executing</h3>
              <div class="metric-value">${data.statistics?.executingSchedules || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Recurring</h3>
              <div class="metric-value">${data.statistics?.recurringSchedules || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Success Rate</h3>
              <div class="metric-value">${this.calculateSuccessRate(data.statistics)}</div>
            </div>
          </div>
          <div class="schedule-actions">
            <button class="aui-button aui-button-primary" data-schedule-action="create">
              <i class="fa fa-plus"></i> Create Schedule
            </button>
          </div>
        </div>
      `;

      // Schedules table
      const schedulesHtml = this.renderSchedulesTable(data.schedules || []);

      const html = overviewHtml + schedulesHtml;
      $view.html(html);
    },

    /**
     * Render schedules table
     */
    renderSchedulesTable(schedules) {
      if (schedules.length === 0) {
        return '<div class="no-data"><i class="fa fa-info-circle"></i> No schedules configured</div>';
      }

      const tableHtml = `
        <div class="schedules-list">
          <h3><i class="fa fa-calendar"></i> Import Schedules</h3>
          <table class="aui schedules-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Next Execution</th>
                <th>Recurring</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Success Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${schedules.map(schedule => `
                <tr>
                  <td>
                    <strong>${schedule.scheduleName || 'Unnamed'}</strong>
                    <div class="schedule-description">${schedule.scheduleDescription || ''}</div>
                  </td>
                  <td>${schedule.importType || 'Standard'}</td>
                  <td>${this.formatTimestamp(schedule.nextExecution)}</td>
                  <td>
                    <span class="recurring-badge ${schedule.recurring ? 'recurring-yes' : 'recurring-no'}">
                      ${schedule.recurring ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    <span class="priority priority-${schedule.priority > 10 ? 'high' : schedule.priority > 5 ? 'medium' : 'low'}">
                      ${schedule.priority || 5}
                    </span>
                  </td>
                  <td>
                    <span class="status status-${(schedule.status || 'active').toLowerCase()}">
                      ${schedule.status || 'Active'}
                    </span>
                  </td>
                  <td>${this.formatPercentage(schedule.successRate || 0)}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="aui-button aui-button-compact" 
                              data-schedule-action="edit" 
                              data-schedule-id="${schedule.scheduleId}"
                              title="Edit Schedule">
                        <i class="fa fa-edit"></i>
                      </button>
                      <button class="aui-button aui-button-compact" 
                              data-schedule-action="run" 
                              data-schedule-id="${schedule.scheduleId}"
                              title="Run Now">
                        <i class="fa fa-play"></i>
                      </button>
                      <button class="aui-button aui-button-compact" 
                              data-schedule-action="delete" 
                              data-schedule-id="${schedule.scheduleId}"
                              title="Delete Schedule">
                        <i class="fa fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      return tableHtml;
    },

    /**
     * Load resource utilization data
     */
    async loadResources() {
      try {
        const response = await $.get(`${this.api.baseUrl}${this.api.endpoints.resources}`);
        this.state.resourceData = response;
        this.renderResourcesView(response);
      } catch (error) {
        console.error('Failed to load resources:', error);
        this.showError('Failed to load resources', error.responseText);
      }
    },

    /**
     * Render resources view
     */
    renderResourcesView(data) {
      const $view = $('#resources-view');
      
      // Resource overview
      const overviewHtml = `
        <div class="resource-overview">
          <div class="overview-cards">
            <div class="overview-card">
              <h3>Memory Usage</h3>
              <div class="metric-value">${this.formatPercentage(data.systemStatus?.memoryUtilizationPercent || 0)}</div>
              <div class="metric-bar">
                <div class="metric-fill" style="width: ${data.systemStatus?.memoryUtilizationPercent || 0}%"></div>
              </div>
            </div>
            <div class="overview-card">
              <h3>Active Locks</h3>
              <div class="metric-value">${data.resourceLocks?.length || 0}</div>
            </div>
            <div class="overview-card">
              <h3>DB Connections</h3>
              <div class="metric-value">${data.systemStatus?.dbConnectionsUsed || 0} / ${data.systemStatus?.dbConnectionsTotal || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Disk Space</h3>
              <div class="metric-value">${this.formatPercentage(data.systemStatus?.diskUtilizationPercent || 0)}</div>
              <div class="metric-bar">
                <div class="metric-fill" style="width: ${data.systemStatus?.diskUtilizationPercent || 0}%"></div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Resource locks table
      const locksHtml = this.renderResourceLocksTable(data.resourceLocks || []);

      // Resource recommendations
      const recommendationsHtml = `
        <div class="resource-recommendations">
          <h3><i class="fa fa-lightbulb-o"></i> Resource Recommendations</h3>
          <ul>
            ${(data.recommendations || []).map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      `;

      const html = overviewHtml + locksHtml + recommendationsHtml;
      $view.html(html);
    },

    /**
     * Render resource locks table
     */
    renderResourceLocksTable(locks) {
      if (locks.length === 0) {
        return '<div class="no-data"><i class="fa fa-info-circle"></i> No active resource locks</div>';
      }

      const tableHtml = `
        <div class="resource-locks">
          <h3><i class="fa fa-lock"></i> Active Resource Locks</h3>
          <table class="aui resource-locks-table">
            <thead>
              <tr>
                <th>Resource Type</th>
                <th>Resource ID</th>
                <th>Lock Type</th>
                <th>Locked By</th>
                <th>Locked At</th>
                <th>Duration</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              ${locks.map(lock => `
                <tr>
                  <td>${lock.resourceType}</td>
                  <td>${lock.resourceId}</td>
                  <td>
                    <span class="lock-type lock-${lock.lockType.toLowerCase()}">
                      ${lock.lockType}
                    </span>
                  </td>
                  <td>${lock.lockedByRequest || 'Unknown'}</td>
                  <td>${this.formatTimestamp(lock.lockedAt)}</td>
                  <td>${this.formatDuration(Date.now() - new Date(lock.lockedAt).getTime())}</td>
                  <td>${this.formatTimestamp(lock.expiresAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      return tableHtml;
    },

    /**
     * Handle queue actions
     */
    async handleQueueAction(action, requestId) {
      try {
        switch (action) {
          case 'cancel':
            await this.cancelRequest(requestId);
            break;
        }
      } catch (error) {
        console.error(`Failed to handle queue action ${action}:`, error);
        this.showError(`Failed to ${action} request`, error.message);
      }
    },

    /**
     * Handle schedule actions
     */
    async handleScheduleAction(action, scheduleId) {
      try {
        switch (action) {
          case 'create':
            this.showCreateScheduleModal();
            break;
          case 'edit':
            this.showEditScheduleModal(scheduleId);
            break;
          case 'run':
            await this.runScheduleNow(scheduleId);
            break;
          case 'delete':
            await this.deleteSchedule(scheduleId);
            break;
        }
      } catch (error) {
        console.error(`Failed to handle schedule action ${action}:`, error);
        this.showError(`Failed to ${action} schedule`, error.message);
      }
    },

    /**
     * Cancel import request
     */
    async cancelRequest(requestId) {
      const reason = prompt('Enter cancellation reason (optional):') || 'User requested cancellation';
      
      const response = await $.ajax({
        url: `${this.api.baseUrl}${this.api.endpoints.request}/${requestId}`,
        type: 'DELETE',
        data: JSON.stringify({ reason: reason }),
        contentType: 'application/json'
      });

      if (response.success) {
        this.showSuccess('Request cancelled successfully');
        this.refreshCurrentView();
      } else {
        throw new Error(response.error || 'Failed to cancel request');
      }
    },

    /**
     * Auto-refresh functionality
     */
    startAutoRefresh() {
      this.stopAutoRefresh(); // Clear any existing timer
      this.state.refreshTimer = setInterval(() => {
        this.refreshCurrentView();
      }, this.state.refreshInterval);
    },

    stopAutoRefresh() {
      if (this.state.refreshTimer) {
        clearInterval(this.state.refreshTimer);
        this.state.refreshTimer = null;
      }
    },

    refreshCurrentView() {
      this.loadViewData(this.state.currentView);
    },

    /**
     * Utility methods
     */
    formatTimestamp(timestamp) {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleString();
    },

    formatDuration(milliseconds) {
      if (!milliseconds || milliseconds < 0) return 'N/A';
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      } else {
        return `${seconds}s`;
      }
    },

    formatPercentage(value) {
      return `${Math.round(value || 0)}%`;
    },

    calculateSuccessRate(statistics) {
      const total = (statistics?.totalExecutions || 0);
      const successful = (statistics?.successfulExecutions || 0);
      if (total === 0) return 'N/A';
      return this.formatPercentage((successful / total) * 100);
    },

    showSuccess(message) {
      // Implement AUI flag or notification
      console.log('Success:', message);
    },

    showError(title, message) {
      // Implement AUI flag or notification
      console.error(title + ':', message);
    }
  };

  // Auto-initialize when DOM is ready
  $(document).ready(() => {
    if ($('#import-queue-container').length > 0) {
      window.importQueueGui.init();
    }
  });

})();