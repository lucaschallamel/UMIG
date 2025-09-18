/**
 * BaseComponent - Foundation for all UI Components
 * US-082-B Component Architecture Development
 *
 * Provides core functionality for all components:
 * - Lifecycle management (initialize, render, destroy)
 * - Event handling and delegation
 * - State management
 * - Error boundaries
 * - Performance monitoring
 * - Accessibility support
 */

// Debug logging for loading detection
console.log("[UMIG] BaseComponent.js EXECUTING - START");

// Prevent duplicate declarations in case script loads multiple times
if (typeof BaseComponent === "undefined") {
  console.log(
    "[UMIG] BaseComponent not previously defined, proceeding with definition",
  );

  class BaseComponent {
    constructor(containerId, config = {}) {
      // Container element
      this.containerId = containerId;
      this.container = null;

      // Component configuration
      this.config = {
        debug: false,
        accessibility: true,
        responsive: true,
        performanceMonitoring: true,
        errorBoundary: true,
        ...config,
      };

      // Component state
      this.state = {};
      this.previousState = {};

      // Event listeners registry
      this.listeners = new Map();
      this.domListeners = new Map();

      // Performance metrics
      this.metrics = {
        initTime: null,
        renderCount: 0,
        lastRenderTime: null,
        totalRenderTime: 0,
      };

      // Component status
      this.initialized = false;
      this.destroyed = false;

      // Error state
      this.errorState = null;
    }

    /**
     * Initialize component
     */
    initialize() {
      if (this.initialized) {
        this.logWarning("Component already initialized");
        return;
      }

      const perfMeasure = this.startPerformanceMeasure("initialize");

      try {
        // Get container element
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
          throw new Error(`Container element not found: ${this.containerId}`);
        }

        // Setup error boundary if enabled
        if (this.config.errorBoundary) {
          this.setupErrorBoundary();
        }

        // Setup responsive handling if enabled
        if (this.config.responsive) {
          this.setupResponsiveHandling();
        }

        // Setup accessibility if enabled
        if (this.config.accessibility) {
          this.setupAccessibility();
        }

        // Call component-specific initialization
        this.onInitialize();

        this.initialized = true;
        this.metrics.initTime = Date.now();

        this.endPerformanceMeasure(perfMeasure);
        this.logDebug("Component initialized");
      } catch (error) {
        this.handleError(error, "initialize");
        throw error;
      }
    }

    /**
     * Render component
     */
    render() {
      if (!this.initialized) {
        this.logWarning("Component not initialized");
        return;
      }

      if (this.destroyed) {
        this.logWarning("Component is destroyed");
        return;
      }

      const perfMeasure = this.startPerformanceMeasure("render");
      const startTime = performance.now();

      try {
        // Clear existing content
        this.clearContainer();

        // Check for error state
        if (this.errorState) {
          this.renderError();
          return;
        }

        // Call component-specific rendering
        this.onRender();

        // Setup DOM event listeners
        this.setupDOMListeners();

        // Update metrics
        const renderTime = performance.now() - startTime;
        this.metrics.renderCount++;
        this.metrics.lastRenderTime = renderTime;
        this.metrics.totalRenderTime += renderTime;

        this.endPerformanceMeasure(perfMeasure);
        this.logDebug(`Component rendered in ${renderTime.toFixed(2)}ms`);
      } catch (error) {
        this.handleError(error, "render");
      }
    }

    /**
     * Update component state
     */
    setState(newState) {
      this.previousState = { ...this.state };
      this.state = { ...this.state, ...newState };

      // Check if update should trigger re-render
      if (this.shouldUpdate(this.previousState, this.state)) {
        this.render();
      }

      // Emit state change event
      this.emit("stateChange", {
        previousState: this.previousState,
        currentState: this.state,
      });
    }

    /**
     * Get current state
     */
    getState() {
      return { ...this.state };
    }

    /**
     * Destroy component
     */
    destroy() {
      if (this.destroyed) {
        return;
      }

      try {
        // Call component-specific cleanup
        this.onDestroy();

        // Remove all event listeners
        this.removeAllListeners();

        // Clear DOM listeners
        this.clearDOMListeners();

        // Clear container
        this.clearContainer();

        // Clear responsive handling
        if (this.resizeObserver) {
          this.resizeObserver.disconnect();
        }

        // Clear state
        this.state = {};
        this.previousState = {};

        // Mark as destroyed
        this.destroyed = true;
        this.initialized = false;

        this.logDebug("Component destroyed");
      } catch (error) {
        console.error("Error destroying component:", error);
      }
    }

    /**
     * Event handling
     */
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
      return () => this.off(event, callback);
    }

    off(event, callback) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    }

    emit(event, data) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            this.handleError(error, `event:${event}`);
          }
        });
      }
    }

    removeAllListeners() {
      this.listeners.clear();
    }

    /**
     * DOM Event handling
     */
    addDOMListener(element, event, handler, options = {}) {
      const key = `${element.id || "element"}-${event}`;

      // Remove existing listener if present
      if (this.domListeners.has(key)) {
        const existing = this.domListeners.get(key);
        existing.element.removeEventListener(
          existing.event,
          existing.handler,
          existing.options,
        );
      }

      // Add new listener
      element.addEventListener(event, handler, options);
      this.domListeners.set(key, { element, event, handler, options });
    }

    clearDOMListeners() {
      this.domListeners.forEach(({ element, event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
      this.domListeners.clear();
    }

    /**
     * Error handling
     */
    setupErrorBoundary() {
      this.errorBoundaryHandler = (event) => {
        if (this.container && this.container.contains(event.target)) {
          this.handleError(event.error, "runtime");
          event.preventDefault();
        }
      };
      window.addEventListener("error", this.errorBoundaryHandler);
    }

    handleError(error, context) {
      console.error(`Component error in ${context}:`, error);

      this.errorState = {
        error,
        context,
        timestamp: Date.now(),
      };

      // Emit error event
      this.emit("error", this.errorState);

      // Re-render with error state
      if (this.initialized && !this.destroyed) {
        this.render();
      }
    }

    renderError() {
      if (!this.container) return;

      // Create error container safely
      const errorDiv = document.createElement("div");
      errorDiv.className = "component-error";
      errorDiv.setAttribute("role", "alert");

      // Create heading
      const heading = document.createElement("h3");
      heading.textContent = "Component Error";
      errorDiv.appendChild(heading);

      // Create description
      const description = document.createElement("p");
      description.textContent = "An error occurred in this component.";
      errorDiv.appendChild(description);

      // Create details section
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Error Details";
      details.appendChild(summary);

      const pre = document.createElement("pre");
      // Safely escape error message
      pre.textContent =
        this.errorState.error.stack || this.errorState.error.message;
      details.appendChild(pre);
      errorDiv.appendChild(details);

      // Create reload button safely
      const button = document.createElement("button");
      button.textContent = "Reload Page";
      button.addEventListener("click", () => location.reload());
      errorDiv.appendChild(button);

      // Clear and append safely
      this.clearContainer();
      this.container.appendChild(errorDiv);
    }

    clearError() {
      this.errorState = null;
      this.render();
    }

    /**
     * Responsive handling
     */
    setupResponsiveHandling() {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          this.handleResize(width);
        }
      });

      if (this.container) {
        this.resizeObserver.observe(this.container);
      }
    }

    handleResize(width) {
      const breakpoint = this.getBreakpoint(width);
      if (breakpoint !== this.currentBreakpoint) {
        this.currentBreakpoint = breakpoint;
        this.emit("breakpointChange", breakpoint);
        this.onBreakpointChange(breakpoint);
      }
    }

    getBreakpoint(width) {
      if (width < 768) return "mobile";
      if (width < 1024) return "tablet";
      return "desktop";
    }

    /**
     * Accessibility setup
     */
    setupAccessibility() {
      if (!this.container) return;

      // Ensure container is focusable if needed
      if (!this.container.hasAttribute("tabindex")) {
        this.container.setAttribute("tabindex", "-1");
      }

      // Add ARIA attributes
      if (!this.container.hasAttribute("role")) {
        this.container.setAttribute("role", "region");
      }

      // Add live region for announcements
      this.createLiveRegion();
    }

    createLiveRegion() {
      this.liveRegion = document.createElement("div");
      this.liveRegion.setAttribute("aria-live", "polite");
      this.liveRegion.setAttribute("aria-atomic", "true");
      this.liveRegion.className = "sr-only";
      this.liveRegion.style.position = "absolute";
      this.liveRegion.style.left = "-10000px";
      this.liveRegion.style.width = "1px";
      this.liveRegion.style.height = "1px";
      this.liveRegion.style.overflow = "hidden";
      document.body.appendChild(this.liveRegion);
    }

    announce(message) {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
        // Clear after announcement
        setTimeout(() => {
          if (this.liveRegion) {
            this.liveRegion.textContent = "";
          }
        }, 1000);
      }
    }

    /**
     * Performance monitoring
     */
    startPerformanceMeasure(operation) {
      if (!this.config.performanceMonitoring) return null;

      const markName = `${this.constructor.name}-${operation}-start`;
      performance.mark(markName);
      return { operation, markName };
    }

    endPerformanceMeasure(measure) {
      if (!measure || !this.config.performanceMonitoring) return;

      const endMarkName = `${this.constructor.name}-${measure.operation}-end`;
      const measureName = `${this.constructor.name}-${measure.operation}`;

      performance.mark(endMarkName);
      performance.measure(measureName, measure.markName, endMarkName);
    }

    getPerformanceMetrics() {
      return {
        ...this.metrics,
        averageRenderTime:
          this.metrics.renderCount > 0
            ? this.metrics.totalRenderTime / this.metrics.renderCount
            : 0,
      };
    }

    /**
     * Utility methods
     */
    clearContainer() {
      if (this.container) {
        // Remove all children safely
        while (this.container.firstChild) {
          this.container.removeChild(this.container.firstChild);
        }
      }
    }

    shouldUpdate(previousState, currentState) {
      // Optimized shallow comparison to replace expensive JSON.stringify
      return this.hasStateChanges(previousState, currentState);
    }

    /**
     * Efficient state comparison without JSON serialization
     * Handles nested objects intelligently while maintaining performance
     */
    hasStateChanges(prevState, currentState) {
      // Handle null/undefined cases
      if (prevState === currentState) return false;
      if (!prevState || !currentState) return true;

      // Get keys from both objects
      const prevKeys = Object.keys(prevState);
      const currentKeys = Object.keys(currentState);

      // Quick check for different number of keys
      if (prevKeys.length !== currentKeys.length) return true;

      // Compare each key-value pair
      for (const key of prevKeys) {
        if (!currentKeys.includes(key)) return true;

        const prevValue = prevState[key];
        const currentValue = currentState[key];

        // Direct comparison for primitives
        if (prevValue === currentValue) continue;

        // Handle different types
        if (typeof prevValue !== typeof currentValue) return true;

        // For arrays, compare efficiently
        if (Array.isArray(prevValue)) {
          if (
            !Array.isArray(currentValue) ||
            prevValue.length !== currentValue.length
          ) {
            return true;
          }
          // Shallow array comparison
          for (let i = 0; i < prevValue.length; i++) {
            if (this.compareValues(prevValue[i], currentValue[i]) !== 0) {
              return true;
            }
          }
          continue;
        }

        // For objects, do shallow comparison
        if (prevValue !== null && typeof prevValue === "object") {
          if (currentValue === null || typeof currentValue !== "object") {
            return true;
          }
          // Recursive comparison for one level deep (prevents infinite recursion)
          if (this.shallowObjectCompare(prevValue, currentValue)) {
            return true;
          }
          continue;
        }

        // If we get here, values are different
        return true;
      }

      return false;
    }

    /**
     * Shallow object comparison for one level deep
     */
    shallowObjectCompare(obj1, obj2) {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      if (keys1.length !== keys2.length) return true;

      for (const key of keys1) {
        if (!keys2.includes(key)) return true;
        if (this.compareValues(obj1[key], obj2[key]) !== 0) return true;
      }

      return false;
    }

    /**
     * Compare two values efficiently
     * Returns: 0 for equal, 1 for different, -1 for complex objects
     */
    compareValues(val1, val2) {
      // Direct equality
      if (val1 === val2) return 0;

      // Handle null/undefined
      if (val1 == null || val2 == null) return val1 === val2 ? 0 : 1;

      // Different types
      if (typeof val1 !== typeof val2) return 1;

      // For complex objects, return -1 to indicate need for deeper comparison
      if (typeof val1 === "object") {
        // Handle dates
        if (val1 instanceof Date && val2 instanceof Date) {
          return val1.getTime() === val2.getTime() ? 0 : 1;
        }
        // For other objects, indicate complex comparison needed
        return -1;
      }

      // Primitive values that aren't equal
      return 1;
    }

    logDebug(...args) {
      if (this.config.debug) {
        console.log(`[${this.constructor.name}]`, ...args);
      }
    }

    logWarning(...args) {
      console.warn(`[${this.constructor.name}]`, ...args);
    }

    /**
     * Lifecycle hooks (to be overridden by child components)
     */
    onInitialize() {
      // Override in child components
    }

    onRender() {
      // Override in child components
    }

    onDestroy() {
      // Override in child components
    }

    onBreakpointChange(breakpoint) {
      // Override in child components
    }

    setupDOMListeners() {
      // Override in child components
    }
  }

  console.log("[UMIG] BaseComponent class defined successfully");

  // Export for use in other components
  if (typeof module !== "undefined" && module.exports) {
    module.exports = BaseComponent;
    console.log("[UMIG] BaseComponent exported as module");
  }

  // Make available globally for browser usage
  if (typeof window !== "undefined") {
    window.BaseComponent = BaseComponent;
    console.log(
      "[UMIG] BaseComponent assigned to window:",
      typeof window.BaseComponent,
    );
  } else {
    console.error(
      "[UMIG] ERROR: window object not available for BaseComponent export",
    );
  }

  console.log("[UMIG] BaseComponent export completed successfully");
} else {
  console.log("[UMIG] BaseComponent already defined, skipping redefinition");
} // End of BaseComponent undefined check

console.log("[UMIG] BaseComponent.js EXECUTING - END");
