# Admin GUI Import Interface Specification

**Version**: 2.0.0  
**Date**: September 3, 2025  
**Status**: Production Ready  
**Integration Target**: UMIG Admin GUI Framework

## Overview

This specification defines the technical requirements for integrating US-034 Data Import Strategy functionality into the UMIG Admin GUI. The interface provides comprehensive import management capabilities including CSV template downloads, file uploads, batch processing, progress monitoring, and rollback operations.

## Admin GUI Integration Architecture

### Integration Points

The Import Interface integrates with the existing UMIG Admin GUI framework through:

1. **Navigation Integration**: Import section added to Admin GUI main navigation
2. **Authentication Integration**: Leverages existing Confluence admin authentication
3. **API Client Integration**: Utilizes standardized API client patterns
4. **UI Component Integration**: Consistent with existing Admin GUI components
5. **Error Handling Integration**: Follows established error handling patterns

### Navigation Structure

```
Admin GUI
├── Data Management
│   ├── Teams Management
│   ├── Users Management
│   ├── Applications Management
│   ├── Environments Management
│   └── Import Management ← NEW
│       ├── CSV Import Interface
│       ├── JSON Import Interface
│       ├── Import History
│       ├── Template Downloads
│       └── Batch Management
```

---

## Import Dashboard Interface

### Dashboard Layout

```html
<div id="import-dashboard" class="admin-section">
  <div class="section-header">
    <h2>Data Import Management</h2>
    <div class="action-buttons">
      <button id="refresh-dashboard" class="btn btn-secondary">Refresh</button>
      <button id="download-templates" class="btn btn-primary">Download Templates</button>
    </div>
  </div>

  <div class="dashboard-stats">
    <div class="stat-card">
      <h3>Total Imports</h3>
      <span class="stat-value" id="total-imports">0</span>
    </div>
    <div class="stat-card">
      <h3>Success Rate</h3>
      <span class="stat-value" id="success-rate">0%</span>
    </div>
    <div class="stat-card">
      <h3>Active Batches</h3>
      <span class="stat-value" id="active-batches">0</span>
    </div>
    <div class="stat-card">
      <h3>Last Import</h3>
      <span class="stat-value" id="last-import">Never</span>
    </div>
  </div>

  <div class="import-sections">
    <div class="import-section csv-import">
      <h3>CSV Base Entity Import</h3>
      <div id="csv-import-interface"></div>
    </div>
    
    <div class="import-section json-import">
      <h3>JSON Migration Data Import</h3>
      <div id="json-import-interface"></div>
    </div>
    
    <div class="import-section history">
      <h3>Import History</h3>
      <div id="import-history-table"></div>
    </div>
  </div>
</div>
```

### Dashboard JavaScript Integration

```javascript
class ImportDashboard {
  constructor() {
    this.apiClient = new ImportApiClient();
    this.csvInterface = new CsvImportInterface();
    this.jsonInterface = new JsonImportInterface();
    this.historyTable = new ImportHistoryTable();
    this.init();
  }

  async init() {
    await this.loadDashboardStats();
    this.csvInterface.init();
    this.jsonInterface.init();
    this.historyTable.init();
    this.setupEventListeners();
    this.startAutoRefresh();
  }

  async loadDashboardStats() {
    try {
      const stats = await this.apiClient.getImportStatistics();
      this.updateDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      this.showError('Failed to load import statistics');
    }
  }

  updateDashboardStats(stats) {
    document.getElementById('total-imports').textContent = stats.totalBatches || 0;
    document.getElementById('success-rate').textContent = 
      `${((stats.completedBatches / stats.totalBatches) * 100).toFixed(1)}%` || '0%';
    document.getElementById('active-batches').textContent = 
      (stats.totalBatches - stats.completedBatches - stats.failedBatches - stats.rolledBackBatches) || 0;
    document.getElementById('last-import').textContent = 
      stats.lastImportDate ? new Date(stats.lastImportDate).toLocaleString() : 'Never';
  }
}
```

---

## CSV Import Interface

### CSV Import Component Layout

```html
<div id="csv-import-interface" class="import-interface">
  <div class="template-section">
    <h4>Step 1: Download Templates</h4>
    <div class="template-downloads">
      <button class="btn btn-outline template-btn" data-entity="teams">
        <i class="icon-download"></i> Teams Template
      </button>
      <button class="btn btn-outline template-btn" data-entity="users">
        <i class="icon-download"></i> Users Template
      </button>
      <button class="btn btn-outline template-btn" data-entity="applications">
        <i class="icon-download"></i> Applications Template
      </button>
      <button class="btn btn-outline template-btn" data-entity="environments">
        <i class="icon-download"></i> Environments Template
      </button>
    </div>
    <div class="template-info">
      <p>⚠️ <strong>Import Order:</strong> Teams → Applications → Environments → Users</p>
    </div>
  </div>

  <div class="upload-section">
    <h4>Step 2: Upload CSV Files</h4>
    <div class="entity-tabs">
      <button class="tab-btn active" data-entity="teams">Teams</button>
      <button class="tab-btn" data-entity="applications">Applications</button>
      <button class="tab-btn" data-entity="environments">Environments</button>
      <button class="tab-btn" data-entity="users">Users</button>
      <button class="tab-btn" data-entity="all">Import All</button>
    </div>

    <div class="upload-area" id="csv-upload-area">
      <div class="drag-drop-zone" id="csv-drag-drop">
        <i class="icon-upload"></i>
        <p>Drag and drop CSV file here or <a href="#" id="csv-file-select">browse files</a></p>
        <input type="file" id="csv-file-input" accept=".csv" style="display: none;">
      </div>
      
      <div class="file-preview" id="csv-file-preview" style="display: none;">
        <div class="file-info">
          <span class="file-name" id="csv-file-name"></span>
          <span class="file-size" id="csv-file-size"></span>
          <button class="btn btn-link remove-file" id="csv-remove-file">Remove</button>
        </div>
        <div class="file-preview-table" id="csv-preview-table"></div>
      </div>

      <div class="import-controls">
        <button class="btn btn-primary" id="csv-import-btn" disabled>Import CSV</button>
        <button class="btn btn-secondary" id="csv-validate-btn" disabled>Validate Only</button>
      </div>
    </div>
  </div>

  <div class="progress-section" id="csv-progress-section" style="display: none;">
    <h4>Import Progress</h4>
    <div class="progress-bar">
      <div class="progress-fill" id="csv-progress-fill"></div>
    </div>
    <div class="progress-details">
      <span id="csv-progress-text">Preparing import...</span>
      <span id="csv-progress-percentage">0%</span>
    </div>
  </div>

  <div class="results-section" id="csv-results-section" style="display: none;">
    <h4>Import Results</h4>
    <div class="results-summary" id="csv-results-summary"></div>
    <div class="results-details" id="csv-results-details"></div>
  </div>
</div>
```

### CSV Import JavaScript Implementation

```javascript
class CsvImportInterface {
  constructor() {
    this.apiClient = new ImportApiClient();
    this.currentEntity = 'teams';
    this.uploadedFile = null;
    this.currentBatchId = null;
  }

  init() {
    this.setupEventListeners();
    this.setupDragDrop();
  }

  setupEventListeners() {
    // Template downloads
    document.querySelectorAll('.template-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.downloadTemplate(e.target.dataset.entity));
    });

    // Entity tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchEntity(e.target.dataset.entity));
    });

    // File selection
    document.getElementById('csv-file-select').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('csv-file-input').click();
    });

    document.getElementById('csv-file-input').addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files[0]);
    });

    // Import controls
    document.getElementById('csv-import-btn').addEventListener('click', () => this.executeImport());
    document.getElementById('csv-validate-btn').addEventListener('click', () => this.validateFile());
    document.getElementById('csv-remove-file').addEventListener('click', () => this.removeFile());
  }

  setupDragDrop() {
    const dropZone = document.getElementById('csv-drag-drop');
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'text/csv') {
        this.handleFileSelect(file);
      } else {
        this.showError('Please select a valid CSV file');
      }
    });
  }

  async downloadTemplate(entity) {
    try {
      const blob = await this.apiClient.downloadCsvTemplate(entity);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      this.showSuccess(`${entity} template downloaded successfully`);
    } catch (error) {
      this.showError(`Failed to download ${entity} template: ${error.message}`);
    }
  }

  switchEntity(entity) {
    this.currentEntity = entity;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-entity="${entity}"]`).classList.add('active');
    this.removeFile(); // Clear current file when switching entities
  }

  handleFileSelect(file) {
    if (!file || file.type !== 'text/csv') {
      this.showError('Please select a valid CSV file');
      return;
    }

    this.uploadedFile = file;
    this.showFilePreview(file);
    this.enableImportControls();
  }

  async showFilePreview(file) {
    document.getElementById('csv-upload-area').style.display = 'none';
    document.getElementById('csv-file-preview').style.display = 'block';
    
    document.getElementById('csv-file-name').textContent = file.name;
    document.getElementById('csv-file-size').textContent = this.formatFileSize(file.size);

    // Show CSV preview
    try {
      const content = await this.readFileContent(file);
      const lines = content.split('\n').slice(0, 6); // Show first 5 rows + header
      this.displayCsvPreview(lines);
    } catch (error) {
      this.showError('Failed to preview CSV file');
    }
  }

  displayCsvPreview(lines) {
    const table = document.createElement('table');
    table.className = 'csv-preview-table';
    
    lines.forEach((line, index) => {
      if (line.trim()) {
        const row = document.createElement('tr');
        const cells = this.parseCsvLine(line);
        
        cells.forEach(cell => {
          const cellElement = document.createElement(index === 0 ? 'th' : 'td');
          cellElement.textContent = cell;
          row.appendChild(cellElement);
        });
        
        table.appendChild(row);
      }
    });

    document.getElementById('csv-preview-table').innerHTML = '';
    document.getElementById('csv-preview-table').appendChild(table);
  }

  async executeImport() {
    if (!this.uploadedFile) {
      this.showError('Please select a CSV file to import');
      return;
    }

    try {
      this.showProgress();
      const content = await this.readFileContent(this.uploadedFile);
      
      let result;
      if (this.currentEntity === 'all') {
        result = await this.executeAllEntitiesImport(content);
      } else {
        result = await this.apiClient.importCsvData(this.currentEntity, content);
      }

      this.currentBatchId = result.batchId;
      this.showResults(result);
      
    } catch (error) {
      this.showError(`Import failed: ${error.message}`);
      this.hideProgress();
    }
  }

  async executeAllEntitiesImport(content) {
    // For 'all' entity type, expect multiple CSV contents
    // This would need to be implemented based on specific requirements
    throw new Error('Import All functionality requires multiple CSV files - please import entities individually');
  }

  showProgress() {
    document.getElementById('csv-progress-section').style.display = 'block';
    document.getElementById('csv-import-btn').disabled = true;
    
    // Simulate progress updates
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      document.getElementById('csv-progress-fill').style.width = `${progress}%`;
      document.getElementById('csv-progress-percentage').textContent = `${progress}%`;
      
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 500);
  }

  showResults(result) {
    this.hideProgress();
    document.getElementById('csv-results-section').style.display = 'block';
    
    const summary = document.getElementById('csv-results-summary');
    if (result.success) {
      summary.className = 'results-summary success';
      summary.innerHTML = `
        <i class="icon-check"></i>
        <strong>Import Successful!</strong>
        Batch ID: ${result.batchId}
      `;
    } else {
      summary.className = 'results-summary error';
      summary.innerHTML = `
        <i class="icon-x"></i>
        <strong>Import Failed</strong>
        ${result.error || 'Unknown error occurred'}
      `;
    }

    const details = document.getElementById('csv-results-details');
    if (result.statistics) {
      details.innerHTML = `
        <div class="stat-row">
          <span>Total Rows:</span>
          <span>${result.statistics.totalRows || 0}</span>
        </div>
        <div class="stat-row">
          <span>Imported:</span>
          <span>${result.statistics.importedRows || 0}</span>
        </div>
        <div class="stat-row">
          <span>Skipped:</span>
          <span>${result.statistics.skippedRows || 0}</span>
        </div>
        <div class="stat-row">
          <span>Errors:</span>
          <span>${result.statistics.errorRows || 0}</span>
        </div>
      `;
    }
  }

  // Utility methods
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  parseCsvLine(line) {
    // Simple CSV parsing - in production, use a proper CSV parser library
    return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  enableImportControls() {
    document.getElementById('csv-import-btn').disabled = false;
    document.getElementById('csv-validate-btn').disabled = false;
  }

  removeFile() {
    this.uploadedFile = null;
    document.getElementById('csv-upload-area').style.display = 'block';
    document.getElementById('csv-file-preview').style.display = 'none';
    document.getElementById('csv-file-input').value = '';
    document.getElementById('csv-import-btn').disabled = true;
    document.getElementById('csv-validate-btn').disabled = true;
  }

  hideProgress() {
    document.getElementById('csv-progress-section').style.display = 'none';
    document.getElementById('csv-import-btn').disabled = false;
  }

  showError(message) {
    // Integrate with existing Admin GUI error handling
    console.error(message);
    // Implementation depends on existing error notification system
  }

  showSuccess(message) {
    // Integrate with existing Admin GUI success handling
    console.log(message);
    // Implementation depends on existing success notification system
  }
}
```

---

## JSON Import Interface

### JSON Import Component Layout

```html
<div id="json-import-interface" class="import-interface">
  <div class="import-type-selection">
    <h4>Import Type</h4>
    <div class="radio-group">
      <label class="radio-option">
        <input type="radio" name="json-import-type" value="single" checked>
        <span>Single JSON File</span>
      </label>
      <label class="radio-option">
        <input type="radio" name="json-import-type" value="batch">
        <span>Batch Import (Multiple Files)</span>
      </label>
    </div>
  </div>

  <div class="single-import-section" id="single-json-import">
    <h4>Single File Import</h4>
    <div class="upload-area">
      <div class="drag-drop-zone" id="json-drag-drop-single">
        <i class="icon-upload"></i>
        <p>Drag and drop JSON file here or <a href="#" id="json-file-select-single">browse files</a></p>
        <input type="file" id="json-file-input-single" accept=".json" style="display: none;">
      </div>
      
      <div class="file-preview" id="json-file-preview-single" style="display: none;">
        <div class="file-info">
          <span class="file-name" id="json-file-name-single"></span>
          <span class="file-size" id="json-file-size-single"></span>
          <button class="btn btn-link remove-file" id="json-remove-file-single">Remove</button>
        </div>
        <div class="json-preview" id="json-preview-single"></div>
      </div>
    </div>

    <div class="import-controls">
      <button class="btn btn-primary" id="json-import-single-btn" disabled>Import JSON</button>
      <button class="btn btn-secondary" id="json-validate-single-btn" disabled>Validate Only</button>
    </div>
  </div>

  <div class="batch-import-section" id="batch-json-import" style="display: none;">
    <h4>Batch Import</h4>
    <div class="batch-upload-area">
      <div class="drag-drop-zone" id="json-drag-drop-batch">
        <i class="icon-upload"></i>
        <p>Drag and drop multiple JSON files here or <a href="#" id="json-file-select-batch">browse files</a></p>
        <input type="file" id="json-file-input-batch" accept=".json" multiple style="display: none;">
      </div>
      
      <div class="batch-files-list" id="batch-files-list" style="display: none;">
        <h5>Selected Files</h5>
        <div class="files-container" id="batch-files-container"></div>
        <button class="btn btn-link" id="clear-batch-files">Clear All Files</button>
      </div>
    </div>

    <div class="import-controls">
      <button class="btn btn-primary" id="json-import-batch-btn" disabled>Import Batch</button>
      <button class="btn btn-secondary" id="json-validate-batch-btn" disabled>Validate All</button>
    </div>
  </div>

  <div class="progress-section" id="json-progress-section" style="display: none;">
    <h4>Import Progress</h4>
    <div class="progress-bar">
      <div class="progress-fill" id="json-progress-fill"></div>
    </div>
    <div class="progress-details">
      <span id="json-progress-text">Processing JSON data...</span>
      <span id="json-progress-percentage">0%</span>
    </div>
    <div class="file-progress" id="json-file-progress" style="display: none;">
      <h5>File Processing Status</h5>
      <div id="file-progress-list"></div>
    </div>
  </div>

  <div class="results-section" id="json-results-section" style="display: none;">
    <h4>Import Results</h4>
    <div class="results-summary" id="json-results-summary"></div>
    <div class="results-details" id="json-results-details"></div>
  </div>
</div>
```

### JSON Import JavaScript Implementation

```javascript
class JsonImportInterface {
  constructor() {
    this.apiClient = new ImportApiClient();
    this.importType = 'single';
    this.singleFile = null;
    this.batchFiles = [];
    this.currentBatchId = null;
  }

  init() {
    this.setupEventListeners();
    this.setupDragDrop();
  }

  setupEventListeners() {
    // Import type selection
    document.querySelectorAll('input[name="json-import-type"]').forEach(radio => {
      radio.addEventListener('change', (e) => this.switchImportType(e.target.value));
    });

    // Single file import
    document.getElementById('json-file-select-single').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('json-file-input-single').click();
    });

    document.getElementById('json-file-input-single').addEventListener('change', (e) => {
      this.handleSingleFileSelect(e.target.files[0]);
    });

    // Batch file import
    document.getElementById('json-file-select-batch').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('json-file-input-batch').click();
    });

    document.getElementById('json-file-input-batch').addEventListener('change', (e) => {
      this.handleBatchFilesSelect(Array.from(e.target.files));
    });

    // Import controls
    document.getElementById('json-import-single-btn').addEventListener('click', () => this.executeSingleImport());
    document.getElementById('json-import-batch-btn').addEventListener('click', () => this.executeBatchImport());
    
    // Remove file controls
    document.getElementById('json-remove-file-single').addEventListener('click', () => this.removeSingleFile());
    document.getElementById('clear-batch-files').addEventListener('click', () => this.clearBatchFiles());
  }

  setupDragDrop() {
    // Single file drag and drop
    const singleDropZone = document.getElementById('json-drag-drop-single');
    this.setupDropZone(singleDropZone, (files) => {
      if (files.length === 1) {
        this.handleSingleFileSelect(files[0]);
      } else {
        this.showError('Please drop only one JSON file for single import');
      }
    });

    // Batch files drag and drop
    const batchDropZone = document.getElementById('json-drag-drop-batch');
    this.setupDropZone(batchDropZone, (files) => {
      this.handleBatchFilesSelect(Array.from(files));
    });
  }

  setupDropZone(dropZone, onDrop) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/json');
      if (files.length > 0) {
        onDrop(files);
      } else {
        this.showError('Please select valid JSON files');
      }
    });
  }

  switchImportType(type) {
    this.importType = type;
    
    if (type === 'single') {
      document.getElementById('single-json-import').style.display = 'block';
      document.getElementById('batch-json-import').style.display = 'none';
    } else {
      document.getElementById('single-json-import').style.display = 'none';
      document.getElementById('batch-json-import').style.display = 'block';
    }
    
    this.resetInterface();
  }

  handleSingleFileSelect(file) {
    if (!file || file.type !== 'application/json') {
      this.showError('Please select a valid JSON file');
      return;
    }

    this.singleFile = file;
    this.showSingleFilePreview(file);
    document.getElementById('json-import-single-btn').disabled = false;
    document.getElementById('json-validate-single-btn').disabled = false;
  }

  async showSingleFilePreview(file) {
    document.getElementById('json-file-preview-single').style.display = 'block';
    document.getElementById('json-file-name-single').textContent = file.name;
    document.getElementById('json-file-size-single').textContent = this.formatFileSize(file.size);

    try {
      const content = await this.readFileContent(file);
      const jsonData = JSON.parse(content);
      this.displayJsonPreview('json-preview-single', jsonData);
    } catch (error) {
      this.showError('Invalid JSON file format');
    }
  }

  handleBatchFilesSelect(files) {
    const validFiles = files.filter(f => f.type === 'application/json');
    if (validFiles.length === 0) {
      this.showError('Please select valid JSON files');
      return;
    }

    this.batchFiles = validFiles;
    this.showBatchFilesPreview(validFiles);
    document.getElementById('json-import-batch-btn').disabled = false;
    document.getElementById('json-validate-batch-btn').disabled = false;
  }

  showBatchFilesPreview(files) {
    document.getElementById('batch-files-list').style.display = 'block';
    const container = document.getElementById('batch-files-container');
    container.innerHTML = '';

    files.forEach((file, index) => {
      const fileElement = document.createElement('div');
      fileElement.className = 'batch-file-item';
      fileElement.innerHTML = `
        <div class="file-info">
          <i class="icon-file-text"></i>
          <span class="file-name">${file.name}</span>
          <span class="file-size">${this.formatFileSize(file.size)}</span>
          <button class="btn btn-link remove-batch-file" data-index="${index}">Remove</button>
        </div>
      `;
      container.appendChild(fileElement);
    });

    // Add event listeners for individual file removal
    container.querySelectorAll('.remove-batch-file').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.removeBatchFile(index);
      });
    });
  }

  async executeSingleImport() {
    if (!this.singleFile) {
      this.showError('Please select a JSON file to import');
      return;
    }

    try {
      this.showProgress();
      const content = await this.readFileContent(this.singleFile);
      
      const result = await this.apiClient.importJsonData({
        source: this.singleFile.name,
        content: content
      });

      this.currentBatchId = result.batchId;
      this.showResults(result);
      
    } catch (error) {
      this.showError(`Import failed: ${error.message}`);
      this.hideProgress();
    }
  }

  async executeBatchImport() {
    if (this.batchFiles.length === 0) {
      this.showError('Please select JSON files to import');
      return;
    }

    try {
      this.showProgress();
      this.showFileProgress();
      
      const filesData = [];
      for (let file of this.batchFiles) {
        const content = await this.readFileContent(file);
        filesData.push({
          filename: file.name,
          content: content
        });
        this.updateFileProgress(file.name, 'prepared');
      }

      const result = await this.apiClient.importBatchData({ files: filesData });
      
      this.currentBatchId = result.batchId;
      this.showResults(result);
      
    } catch (error) {
      this.showError(`Batch import failed: ${error.message}`);
      this.hideProgress();
    }
  }

  showProgress() {
    document.getElementById('json-progress-section').style.display = 'block';
    document.getElementById('json-import-single-btn').disabled = true;
    document.getElementById('json-import-batch-btn').disabled = true;
  }

  showFileProgress() {
    document.getElementById('json-file-progress').style.display = 'block';
    const container = document.getElementById('file-progress-list');
    container.innerHTML = '';

    this.batchFiles.forEach(file => {
      const progressElement = document.createElement('div');
      progressElement.className = 'file-progress-item';
      progressElement.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="file-status" data-file="${file.name}">pending</span>
      `;
      container.appendChild(progressElement);
    });
  }

  updateFileProgress(filename, status) {
    const statusElement = document.querySelector(`[data-file="${filename}"]`);
    if (statusElement) {
      statusElement.textContent = status;
      statusElement.className = `file-status ${status}`;
    }
  }

  displayJsonPreview(containerId, jsonData) {
    const container = document.getElementById(containerId);
    const preview = JSON.stringify(jsonData, null, 2).substring(0, 500);
    container.innerHTML = `<pre><code>${preview}${preview.length < JSON.stringify(jsonData, null, 2).length ? '...' : ''}</code></pre>`;
  }

  showResults(result) {
    this.hideProgress();
    document.getElementById('json-results-section').style.display = 'block';
    
    const summary = document.getElementById('json-results-summary');
    if (result.success) {
      summary.className = 'results-summary success';
      summary.innerHTML = `
        <i class="icon-check"></i>
        <strong>Import Successful!</strong>
        Batch ID: ${result.batchId}
      `;
    } else {
      summary.className = 'results-summary error';
      summary.innerHTML = `
        <i class="icon-x"></i>
        <strong>Import Failed</strong>
        ${result.error || 'Unknown error occurred'}
      `;
    }

    this.displayDetailedResults(result);
  }

  displayDetailedResults(result) {
    const details = document.getElementById('json-results-details');
    let content = '';

    if (result.statistics) {
      content += `
        <div class="stats-section">
          <h5>Import Statistics</h5>
          <div class="stat-row">
            <span>Steps Processed:</span>
            <span>${result.statistics.stepsProcessed || 0}</span>
          </div>
          <div class="stat-row">
            <span>Instructions Created:</span>
            <span>${result.statistics.instructionsCreated || 0}</span>
          </div>
          <div class="stat-row">
            <span>Staging Records:</span>
            <span>${result.statistics.stagingRecords || 0}</span>
          </div>
        </div>
      `;
    }

    if (result.fileResults) {
      content += `
        <div class="file-results-section">
          <h5>File Processing Results</h5>
      `;
      
      result.fileResults.forEach(fileResult => {
        content += `
          <div class="file-result-item ${fileResult.success ? 'success' : 'error'}">
            <strong>${fileResult.filename}</strong>
            <span class="status">${fileResult.success ? 'Success' : 'Failed'}</span>
            ${fileResult.errors && fileResult.errors.length > 0 ? 
              `<div class="errors">${fileResult.errors.join(', ')}</div>` : ''
            }
          </div>
        `;
      });
      
      content += `</div>`;
    }

    details.innerHTML = content;
  }

  resetInterface() {
    this.singleFile = null;
    this.batchFiles = [];
    document.getElementById('json-file-preview-single').style.display = 'none';
    document.getElementById('batch-files-list').style.display = 'none';
    document.getElementById('json-progress-section').style.display = 'none';
    document.getElementById('json-results-section').style.display = 'none';
    document.getElementById('json-import-single-btn').disabled = true;
    document.getElementById('json-import-batch-btn').disabled = true;
  }

  removeSingleFile() {
    this.singleFile = null;
    document.getElementById('json-file-preview-single').style.display = 'none';
    document.getElementById('json-file-input-single').value = '';
    document.getElementById('json-import-single-btn').disabled = true;
  }

  removeBatchFile(index) {
    this.batchFiles.splice(index, 1);
    if (this.batchFiles.length === 0) {
      this.clearBatchFiles();
    } else {
      this.showBatchFilesPreview(this.batchFiles);
    }
  }

  clearBatchFiles() {
    this.batchFiles = [];
    document.getElementById('batch-files-list').style.display = 'none';
    document.getElementById('json-file-input-batch').value = '';
    document.getElementById('json-import-batch-btn').disabled = false;
  }

  hideProgress() {
    document.getElementById('json-progress-section').style.display = 'none';
    document.getElementById('json-import-single-btn').disabled = false;
    document.getElementById('json-import-batch-btn').disabled = false;
  }

  // Utility methods (shared with CsvImportInterface)
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showError(message) {
    console.error(message);
  }

  showSuccess(message) {
    console.log(message);
  }
}
```

---

## Import History Management

### Import History Table Component

```html
<div id="import-history-interface" class="import-interface">
  <div class="history-controls">
    <div class="search-controls">
      <input type="text" id="history-search" placeholder="Search import history..." class="search-input">
      <select id="history-status-filter" class="filter-select">
        <option value="">All Status</option>
        <option value="COMPLETED">Completed</option>
        <option value="FAILED">Failed</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="ROLLED_BACK">Rolled Back</option>
      </select>
      <select id="history-type-filter" class="filter-select">
        <option value="">All Types</option>
        <option value="JSON_SINGLE">JSON Single</option>
        <option value="JSON_BATCH">JSON Batch</option>
        <option value="CSV_TEAMS">CSV Teams</option>
        <option value="CSV_USERS">CSV Users</option>
        <option value="CSV_APPLICATIONS">CSV Applications</option>
        <option value="CSV_ENVIRONMENTS">CSV Environments</option>
      </select>
      <button id="history-refresh" class="btn btn-secondary">Refresh</button>
    </div>
    
    <div class="pagination-controls">
      <button id="history-prev" class="btn btn-outline" disabled>Previous</button>
      <span id="history-page-info">Page 1 of 1</span>
      <button id="history-next" class="btn btn-outline" disabled>Next</button>
    </div>
  </div>

  <div class="history-table-container">
    <table id="history-table" class="data-table">
      <thead>
        <tr>
          <th>Batch ID</th>
          <th>Type</th>
          <th>Source</th>
          <th>Status</th>
          <th>User</th>
          <th>Created</th>
          <th>Duration</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="history-table-body">
        <!-- Dynamic content -->
      </tbody>
    </table>
  </div>

  <div class="batch-details-modal" id="batch-details-modal" style="display: none;">
    <div class="modal-content">
      <div class="modal-header">
        <h4>Import Batch Details</h4>
        <button class="modal-close" id="close-batch-details">&times;</button>
      </div>
      <div class="modal-body" id="batch-details-content">
        <!-- Dynamic content -->
      </div>
      <div class="modal-footer">
        <button id="rollback-batch" class="btn btn-danger" style="display: none;">Rollback Import</button>
        <button id="close-details" class="btn btn-secondary">Close</button>
      </div>
    </div>
  </div>
</div>
```

### Import History JavaScript Implementation

```javascript
class ImportHistoryTable {
  constructor() {
    this.apiClient = new ImportApiClient();
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalPages = 1;
    this.filters = {
      search: '',
      status: '',
      type: ''
    };
    this.selectedBatch = null;
  }

  init() {
    this.setupEventListeners();
    this.loadHistory();
  }

  setupEventListeners() {
    // Search and filters
    document.getElementById('history-search').addEventListener('input', (e) => {
      this.filters.search = e.target.value;
      this.debounceSearch();
    });

    document.getElementById('history-status-filter').addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.loadHistory();
    });

    document.getElementById('history-type-filter').addEventListener('change', (e) => {
      this.filters.type = e.target.value;
      this.loadHistory();
    });

    document.getElementById('history-refresh').addEventListener('click', () => {
      this.loadHistory();
    });

    // Pagination
    document.getElementById('history-prev').addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadHistory();
      }
    });

    document.getElementById('history-next').addEventListener('click', () => {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.loadHistory();
      }
    });

    // Modal controls
    document.getElementById('close-batch-details').addEventListener('click', () => {
      this.closeBatchDetails();
    });

    document.getElementById('close-details').addEventListener('click', () => {
      this.closeBatchDetails();
    });

    document.getElementById('rollback-batch').addEventListener('click', () => {
      this.showRollbackConfirmation();
    });
  }

  debounceSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadHistory();
    }, 500);
  }

  async loadHistory() {
    try {
      const params = {
        limit: this.pageSize,
        offset: (this.currentPage - 1) * this.pageSize,
        ...this.filters
      };

      const response = await this.apiClient.getImportHistory(params);
      this.renderHistoryTable(response.history);
      this.updatePaginationControls(response.totalCount);
      
    } catch (error) {
      this.showError(`Failed to load import history: ${error.message}`);
    }
  }

  renderHistoryTable(history) {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    if (history.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="no-data">No import history found</td>
        </tr>
      `;
      return;
    }

    history.forEach(batch => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="batch-id">${this.truncateText(batch.batchId, 8)}</td>
        <td class="import-type">${batch.importType}</td>
        <td class="source">${this.truncateText(batch.sourceIdentifier, 20)}</td>
        <td class="status">
          <span class="status-badge ${batch.status.toLowerCase()}">${batch.status}</span>
        </td>
        <td class="user">${batch.createdBy}</td>
        <td class="created">${this.formatDateTime(batch.createdDate)}</td>
        <td class="duration">${this.calculateDuration(batch.createdDate, batch.completedDate)}</td>
        <td class="actions">
          <button class="btn btn-link view-details" data-batch-id="${batch.batchId}">View</button>
          ${batch.status === 'COMPLETED' ? 
            `<button class="btn btn-link rollback-action" data-batch-id="${batch.batchId}">Rollback</button>` : 
            ''
          }
        </td>
      `;
      tbody.appendChild(row);
    });

    // Add event listeners for action buttons
    tbody.querySelectorAll('.view-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.showBatchDetails(e.target.dataset.batchId);
      });
    });

    tbody.querySelectorAll('.rollback-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.initateRollback(e.target.dataset.batchId);
      });
    });
  }

  async showBatchDetails(batchId) {
    try {
      const batchDetails = await this.apiClient.getBatchDetails(batchId);
      this.selectedBatch = batchDetails;
      this.renderBatchDetails(batchDetails);
      document.getElementById('batch-details-modal').style.display = 'block';
      
      // Show rollback button if eligible
      if (batchDetails.status === 'COMPLETED') {
        document.getElementById('rollback-batch').style.display = 'inline-block';
      } else {
        document.getElementById('rollback-batch').style.display = 'none';
      }
      
    } catch (error) {
      this.showError(`Failed to load batch details: ${error.message}`);
    }
  }

  renderBatchDetails(batch) {
    const content = document.getElementById('batch-details-content');
    content.innerHTML = `
      <div class="batch-info">
        <div class="info-section">
          <h5>Basic Information</h5>
          <div class="info-grid">
            <div class="info-item">
              <label>Batch ID:</label>
              <span>${batch.batchId}</span>
            </div>
            <div class="info-item">
              <label>Import Type:</label>
              <span>${batch.importType}</span>
            </div>
            <div class="info-item">
              <label>Source:</label>
              <span>${batch.sourceIdentifier}</span>
            </div>
            <div class="info-item">
              <label>Status:</label>
              <span class="status-badge ${batch.status.toLowerCase()}">${batch.status}</span>
            </div>
            <div class="info-item">
              <label>Created By:</label>
              <span>${batch.createdBy}</span>
            </div>
            <div class="info-item">
              <label>Created Date:</label>
              <span>${this.formatDateTime(batch.createdDate)}</span>
            </div>
            ${batch.completedDate ? `
              <div class="info-item">
                <label>Completed Date:</label>
                <span>${this.formatDateTime(batch.completedDate)}</span>
              </div>
              <div class="info-item">
                <label>Duration:</label>
                <span>${this.calculateDuration(batch.createdDate, batch.completedDate)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        ${batch.statistics ? `
          <div class="info-section">
            <h5>Import Statistics</h5>
            <div class="stats-grid">
              ${Object.entries(batch.statistics).map(([key, value]) => `
                <div class="stat-item">
                  <label>${this.formatStatKey(key)}:</label>
                  <span>${value}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${batch.auditTrail && batch.auditTrail.length > 0 ? `
          <div class="info-section">
            <h5>Audit Trail</h5>
            <div class="audit-trail">
              ${batch.auditTrail.map(entry => `
                <div class="audit-entry">
                  <div class="audit-timestamp">${this.formatDateTime(entry.timestamp)}</div>
                  <div class="audit-action">${entry.action}</div>
                  <div class="audit-details">${entry.details}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  async initateRollback(batchId) {
    this.selectedBatchId = batchId;
    this.showRollbackConfirmation();
  }

  showRollbackConfirmation() {
    const reason = prompt('Please provide a reason for rolling back this import batch:');
    if (reason) {
      this.executeRollback(this.selectedBatch?.batchId || this.selectedBatchId, reason);
    }
  }

  async executeRollback(batchId, reason) {
    try {
      const result = await this.apiClient.rollbackImportBatch(batchId, reason);
      this.showSuccess('Import batch rolled back successfully');
      this.closeBatchDetails();
      this.loadHistory(); // Refresh the table
      
    } catch (error) {
      this.showError(`Rollback failed: ${error.message}`);
    }
  }

  updatePaginationControls(totalCount) {
    this.totalPages = Math.ceil(totalCount / this.pageSize);
    
    document.getElementById('history-prev').disabled = this.currentPage <= 1;
    document.getElementById('history-next').disabled = this.currentPage >= this.totalPages;
    document.getElementById('history-page-info').textContent = 
      `Page ${this.currentPage} of ${this.totalPages}`;
  }

  closeBatchDetails() {
    document.getElementById('batch-details-modal').style.display = 'none';
    this.selectedBatch = null;
  }

  // Utility methods
  truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
  }

  calculateDuration(startDate, endDate) {
    if (!endDate) return 'In Progress';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffSecs = Math.round(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}s`;
    if (diffSecs < 3600) return `${Math.round(diffSecs / 60)}m`;
    return `${Math.round(diffSecs / 3600)}h`;
  }

  formatStatKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  showError(message) {
    console.error(message);
  }

  showSuccess(message) {
    console.log(message);
  }
}
```

---

## Import API Client

### Centralized API Client Implementation

```javascript
class ImportApiClient {
  constructor() {
    this.baseUrl = '/rest/scriptrunner/latest/custom/import';
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  async downloadCsvTemplate(entity) {
    const response = await fetch(`${this.baseUrl}/templates/${entity}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`);
    }

    return await response.blob();
  }

  async importCsvData(entity, csvContent) {
    const response = await fetch(`${this.baseUrl}/csv/${entity}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv'
      },
      body: csvContent
    });

    return await this.handleResponse(response);
  }

  async importJsonData(data) {
    const response = await fetch(`${this.baseUrl}/json`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(data)
    });

    return await this.handleResponse(response);
  }

  async importBatchData(data) {
    const response = await fetch(`${this.baseUrl}/batch`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(data)
    });

    return await this.handleResponse(response);
  }

  async createMasterPlan(planData) {
    const response = await fetch(`${this.baseUrl}/master-plan`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(planData)
    });

    return await this.handleResponse(response);
  }

  async getImportHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseUrl}/history?${queryString}`, {
      method: 'GET'
    });

    return await this.handleResponse(response);
  }

  async getBatchDetails(batchId) {
    const response = await fetch(`${this.baseUrl}/batch/${batchId}`, {
      method: 'GET'
    });

    return await this.handleResponse(response);
  }

  async getImportStatistics() {
    const response = await fetch(`${this.baseUrl}/statistics`, {
      method: 'GET'
    });

    return await this.handleResponse(response);
  }

  async rollbackImportBatch(batchId, reason) {
    const response = await fetch(`${this.baseUrl}/rollback/${batchId}`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({ reason })
    });

    return await this.handleResponse(response);
  }

  async updateBatchStatus(batchId, status, statistics = {}) {
    const response = await fetch(`${this.baseUrl}/batch/${batchId}/status`, {
      method: 'PUT',
      headers: this.defaultHeaders,
      body: JSON.stringify({ status, statistics })
    });

    return await this.handleResponse(response);
  }

  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  }
}
```

---

## CSS Styling

### Import Interface Styles

```css
/* Import Dashboard Styles */
.import-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 15px;
}

.section-header h2 {
  margin: 0;
  color: #333;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #007bff;
  text-align: center;
}

.stat-card h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

/* Import Interface Styles */
.import-sections {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.import-section {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 25px;
}

.import-section h3 {
  margin-top: 0;
  color: #495057;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 10px;
}

/* Template Section */
.template-section {
  margin-bottom: 30px;
}

.template-downloads {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.template-btn {
  padding: 8px 16px;
  border: 1px solid #007bff;
  background: white;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-btn:hover {
  background: #007bff;
  color: white;
}

.template-info {
  padding: 10px;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
}

/* Entity Tabs */
.entity-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border-bottom: 1px solid #dee2e6;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn.active {
  border-bottom-color: #007bff;
  color: #007bff;
  font-weight: bold;
}

.tab-btn:hover {
  background: #f8f9fa;
}

/* Upload Area */
.upload-area {
  margin-bottom: 20px;
}

.drag-drop-zone {
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.drag-drop-zone:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.drag-drop-zone.drag-over {
  border-color: #007bff;
  background: #e3f2fd;
}

.drag-drop-zone i {
  font-size: 48px;
  color: #6c757d;
  margin-bottom: 15px;
  display: block;
}

/* File Preview */
.file-preview {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  background: #f8f9fa;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #dee2e6;
}

.file-name {
  font-weight: bold;
  color: #333;
}

.file-size {
  color: #6c757d;
  font-size: 14px;
}

.remove-file {
  color: #dc3545;
  text-decoration: none;
  cursor: pointer;
}

.remove-file:hover {
  text-decoration: underline;
}

/* CSV Preview Table */
.csv-preview-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.csv-preview-table th,
.csv-preview-table td {
  border: 1px solid #dee2e6;
  padding: 8px 12px;
  text-align: left;
  font-size: 14px;
}

.csv-preview-table th {
  background: #f8f9fa;
  font-weight: bold;
}

/* Import Controls */
.import-controls {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}

/* Progress Section */
.progress-section {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 15px;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s;
  width: 0%;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Results Section */
.results-section {
  margin-top: 30px;
}

.results-summary {
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.results-summary.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.results-summary.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.results-details {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f8f9fa;
}

/* Import History Table */
.history-table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.data-table th,
.data-table td {
  border: 1px solid #dee2e6;
  padding: 12px;
  text-align: left;
}

.data-table th {
  background: #f8f9fa;
  font-weight: bold;
  position: sticky;
  top: 0;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge.completed {
  background: #d4edda;
  color: #155724;
}

.status-badge.failed {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.in_progress {
  background: #fff3cd;
  color: #856404;
}

.status-badge.rolled_back {
  background: #e2e3e5;
  color: #383d41;
}

/* Modal Styles */
.batch-details-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90%;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #dee2e6;
}

/* Button Styles */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-outline {
  background: transparent;
  border: 1px solid #007bff;
  color: #007bff;
}

.btn-outline:hover {
  background: #007bff;
  color: white;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-link {
  background: transparent;
  border: none;
  color: #007bff;
  text-decoration: underline;
}

.btn-link:hover {
  text-decoration: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .dashboard-stats {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  
  .template-downloads {
    flex-direction: column;
  }
  
  .import-controls {
    flex-direction: column;
  }
  
  .entity-tabs {
    flex-wrap: wrap;
  }
  
  .modal-content {
    width: 95%;
    margin: 10px;
  }
}
```

---

## Integration Testing

### Test Scenarios for Admin GUI Integration

```javascript
// Test scenarios for Import Interface
describe('Import Interface Integration', () => {
  beforeEach(() => {
    // Initialize mock API client
    this.mockApiClient = new MockImportApiClient();
    this.importDashboard = new ImportDashboard();
  });

  describe('CSV Import Interface', () => {
    test('should download CSV templates successfully', async () => {
      const csvInterface = new CsvImportInterface();
      await csvInterface.downloadTemplate('teams');
      expect(this.mockApiClient.downloadCsvTemplate).toHaveBeenCalledWith('teams');
    });

    test('should handle file upload and validation', async () => {
      const csvInterface = new CsvImportInterface();
      const mockFile = new File(['test,data\n1,value'], 'test.csv', { type: 'text/csv' });
      await csvInterface.handleFileSelect(mockFile);
      expect(csvInterface.uploadedFile).toBe(mockFile);
    });

    test('should execute CSV import with proper error handling', async () => {
      const csvInterface = new CsvImportInterface();
      const mockFile = new File(['test,data\n1,value'], 'test.csv', { type: 'text/csv' });
      csvInterface.uploadedFile = mockFile;
      
      await csvInterface.executeImport();
      expect(this.mockApiClient.importCsvData).toHaveBeenCalled();
    });
  });

  describe('JSON Import Interface', () => {
    test('should handle single JSON file import', async () => {
      const jsonInterface = new JsonImportInterface();
      const mockFile = new File(['{"steps":[]}'], 'test.json', { type: 'application/json' });
      await jsonInterface.handleSingleFileSelect(mockFile);
      expect(jsonInterface.singleFile).toBe(mockFile);
    });

    test('should handle batch JSON import', async () => {
      const jsonInterface = new JsonImportInterface();
      const mockFiles = [
        new File(['{"steps":[]}'], 'test1.json', { type: 'application/json' }),
        new File(['{"steps":[]}'], 'test2.json', { type: 'application/json' })
      ];
      
      await jsonInterface.handleBatchFilesSelect(mockFiles);
      expect(jsonInterface.batchFiles).toEqual(mockFiles);
    });
  });

  describe('Import History Interface', () => {
    test('should load and display import history', async () => {
      const historyTable = new ImportHistoryTable();
      await historyTable.loadHistory();
      expect(this.mockApiClient.getImportHistory).toHaveBeenCalled();
    });

    test('should handle batch rollback operations', async () => {
      const historyTable = new ImportHistoryTable();
      await historyTable.executeRollback('test-batch-id', 'test reason');
      expect(this.mockApiClient.rollbackImportBatch).toHaveBeenCalledWith('test-batch-id', 'test reason');
    });
  });
});

// Mock API Client for Testing
class MockImportApiClient {
  downloadCsvTemplate = jest.fn().mockResolvedValue(new Blob(['test csv'], { type: 'text/csv' }));
  importCsvData = jest.fn().mockResolvedValue({ success: true, batchId: 'test-batch-id' });
  importJsonData = jest.fn().mockResolvedValue({ success: true, batchId: 'test-batch-id' });
  importBatchData = jest.fn().mockResolvedValue({ success: true, batchId: 'test-batch-id' });
  getImportHistory = jest.fn().mockResolvedValue({ history: [], totalCount: 0 });
  getBatchDetails = jest.fn().mockResolvedValue({ batchId: 'test-batch-id', status: 'COMPLETED' });
  rollbackImportBatch = jest.fn().mockResolvedValue({ success: true });
}
```

---

## Deployment Instructions

### Integration Steps for Admin GUI

1. **Add Navigation Entry**
   ```javascript
   // Add to admin-gui navigation configuration
   {
     id: 'import',
     title: 'Import Management',
     icon: 'upload',
     path: '/admin/import',
     requiredPermissions: ['confluence-administrators']
   }
   ```

2. **Register Components**
   ```javascript
   // Register import components with Admin GUI framework
   AdminGuiFramework.registerComponent('ImportDashboard', ImportDashboard);
   AdminGuiFramework.registerComponent('CsvImportInterface', CsvImportInterface);
   AdminGuiFramework.registerComponent('JsonImportInterface', JsonImportInterface);
   AdminGuiFramework.registerComponent('ImportHistoryTable', ImportHistoryTable);
   ```

3. **Add Route Configuration**
   ```javascript
   // Add routing for import interface
   {
     path: '/admin/import',
     component: ImportDashboard,
     requireAuth: true,
     requireAdmin: true
   }
   ```

4. **Include CSS Styles**
   - Add import interface CSS to admin GUI stylesheet
   - Ensure consistent styling with existing components
   - Test responsive design across different screen sizes

5. **Configure API Integration**
   - Verify API endpoints are accessible from Admin GUI context
   - Configure authentication token handling
   - Set up error handling integration with Admin GUI framework

### Testing Checklist

- [ ] Navigation integration works correctly
- [ ] CSV template downloads function properly
- [ ] File upload and validation work across browsers
- [ ] Import progress monitoring displays correctly
- [ ] Error handling integrates with Admin GUI notifications
- [ ] Responsive design works on mobile devices
- [ ] Authentication and authorization function properly
- [ ] Import history table loads and paginates correctly
- [ ] Batch rollback operations complete successfully
- [ ] Modal dialogs display and close properly

---

## Conclusion

This specification provides complete technical requirements for integrating US-034 Data Import Strategy functionality into the UMIG Admin GUI. The interface provides comprehensive import management capabilities while maintaining consistency with existing Admin GUI patterns and user experience.

### Key Features Delivered

1. **Comprehensive Import Dashboard** with statistics and quick access
2. **CSV Import Interface** with template downloads and validation
3. **JSON Import Interface** supporting both single and batch operations
4. **Import History Management** with detailed tracking and rollback capabilities
5. **Progress Monitoring** with real-time updates and status tracking
6. **Error Handling Integration** consistent with Admin GUI patterns

### Integration Benefits

- **Consistent User Experience**: Follows established Admin GUI patterns
- **Comprehensive Functionality**: Full import workflow support
- **Robust Error Handling**: Comprehensive error management and user feedback
- **Performance Optimized**: Efficient API calls and responsive interface
- **Mobile Responsive**: Works across all device types
- **Secure Access**: Proper authentication and authorization integration

This specification enables seamless integration of import functionality into the UMIG Admin GUI, providing users with an intuitive and powerful interface for managing data imports while maintaining system security and data integrity.

---

**Document Version**: 2.0.0  
**Last Updated**: September 3, 2025  
**Integration Status**: Ready for Implementation