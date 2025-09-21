/**
 * Enhanced debug utility for tracing labels through the entire UMIG pipeline
 * Phase 1 Enhancements: Error handling, performance timing, structured logging, configurable parameters
 *
 * Usage:
 *   1. Open iteration view page in browser
 *   2. Open browser console (F12)
 *   3. Copy and paste this script
 *   4. Run: debugLabelsIssue() or debugLabelsIssue({ logLevel: 'DEBUG', pageSize: 10 })
 *
 * @deprecated This is a development utility. For automated testing, use:
 *   - npm run test:js:integration -- --testPathPattern='labels-display-pipeline'
 *
 * TODO: Convert to proper developer tool in src/groovy/umig/web/js/debug/
 */

// Structured logging system
const DebugLogger = {
  levels: { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 },
  currentLevel: 2, // Default to INFO

  setLevel(level) {
    this.currentLevel = this.levels[level] || 2;
  },

  log(level, message, data = null) {
    if (this.levels[level] <= this.currentLevel) {
      const timestamp = new Date().toISOString().slice(11, 23);
      const prefix = `[${timestamp}] [${level}]`;

      if (data) {
        console.log(`${prefix} ${message}`, data);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  },

  error(message, data) {
    this.log("ERROR", message, data);
  },
  warn(message, data) {
    this.log("WARN", message, data);
  },
  info(message, data) {
    this.log("INFO", message, data);
  },
  debug(message, data) {
    this.log("DEBUG", message, data);
  },
};

// Performance timing utility
const PerfTimer = {
  timers: {},

  start(name) {
    this.timers[name] = performance.now();
    DebugLogger.debug(`Timer started: ${name}`);
  },

  end(name) {
    if (this.timers[name]) {
      const duration = performance.now() - this.timers[name];
      DebugLogger.info(`Timer ${name}: ${duration.toFixed(2)}ms`);
      delete this.timers[name];
      return duration;
    }
    DebugLogger.warn(`Timer ${name} was not started`);
    return 0;
  },
};

async function debugLabelsIssue(options = {}) {
  // Configurable parameters with defaults
  const config = {
    logLevel: options.logLevel || "INFO",
    pageSize: options.pageSize || 5,
    maxStepsToCheck: options.maxStepsToCheck || 3,
    includeFullStepData: options.includeFullStepData || false,
    ...options,
  };

  // Set logging level
  DebugLogger.setLevel(config.logLevel);

  PerfTimer.start("total-debug");
  DebugLogger.info("=== ENHANCED LABELS DEBUG TOOL ===");
  DebugLogger.debug("Debug configuration:", config);

  try {
    // 1. Extract URL parameters with error handling
    PerfTimer.start("url-parsing");
    let iterationId, migrationId;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      iterationId = urlParams.get("iterationId");
      migrationId = urlParams.get("migrationId");

      if (!iterationId) {
        throw new Error("No iterationId found in URL parameters");
      }

      DebugLogger.info("URL parameters extracted successfully", {
        iterationId,
        migrationId,
      });
    } catch (error) {
      DebugLogger.error("Failed to extract URL parameters:", error.message);
      throw error;
    } finally {
      PerfTimer.end("url-parsing");
    }

    // 2. Fetch API data with error handling
    PerfTimer.start("api-fetch");
    let apiData;

    try {
      const url = `/rest/scriptrunner/latest/custom/steps?iterationId=${iterationId}&migrationId=${migrationId || ""}&enhanced=true&pageSize=${config.pageSize}`;
      DebugLogger.info("Fetching from API:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      apiData = await response.json();
      DebugLogger.info("API Response received successfully", {
        totalSteps: apiData.data?.length || 0,
        hasData: !!apiData.data,
      });
    } catch (error) {
      DebugLogger.error("API fetch failed:", error.message);
      throw error;
    } finally {
      PerfTimer.end("api-fetch");
    }

    // 3. Analyze API data
    PerfTimer.start("api-analysis");
    try {
      if (apiData.data && apiData.data.length > 0) {
        DebugLogger.info(
          `Analyzing first ${config.maxStepsToCheck} steps of ${apiData.data.length} total`,
        );

        // Check specified number of steps
        apiData.data.slice(0, config.maxStepsToCheck).forEach((step, i) => {
          try {
            const stepName =
              step.stepName || step.stm_name || `Unknown Step ${i + 1}`;
            DebugLogger.info(`Step ${i + 1}: ${stepName}`);

            const hasLabels = "labels" in step;
            const labelsValue = step.labels;
            const labelsType = typeof labelsValue;
            const isArray = Array.isArray(labelsValue);

            DebugLogger.debug("Step label analysis:", {
              hasLabelsField: hasLabels,
              labelsValue: labelsValue,
              labelsType: labelsType,
              isArray: isArray,
            });

            if (labelsValue && isArray && labelsValue.length > 0) {
              DebugLogger.info(`✅ Step has ${labelsValue.length} labels:`);
              labelsValue.forEach((label, labelIndex) => {
                try {
                  DebugLogger.info(
                    `   Label ${labelIndex + 1}: "${label.name || "Unknown"}", color: "${label.color || "None"}"`,
                  );
                } catch (labelError) {
                  DebugLogger.warn(
                    `Error processing label ${labelIndex + 1}:`,
                    labelError.message,
                  );
                }
              });
            } else {
              DebugLogger.warn(
                `❌ Step has no valid labels (has field: ${hasLabels}, is array: ${isArray})`,
              );
            }

            if (config.includeFullStepData) {
              DebugLogger.debug(`Full step ${i + 1} data:`, step);
            }
          } catch (stepError) {
            DebugLogger.error(
              `Error analyzing step ${i + 1}:`,
              stepError.message,
            );
          }
        });
      } else {
        DebugLogger.warn("No step data found in API response");
      }
    } catch (error) {
      DebugLogger.error("API data analysis failed:", error.message);
    } finally {
      PerfTimer.end("api-analysis");
    }

    // 4. Check IterationView transformation
    PerfTimer.start("iteration-view-check");
    try {
      DebugLogger.info("Checking IterationView transformation");

      if (window.iterationView && window.iterationView.flatSteps) {
        const flatStepsCount = window.iterationView.flatSteps.length;
        DebugLogger.info(`IterationView has ${flatStepsCount} flatSteps`);

        const stepsToCheck = Math.min(config.maxStepsToCheck, flatStepsCount);
        const firstFewSteps = window.iterationView.flatSteps.slice(
          0,
          stepsToCheck,
        );

        firstFewSteps.forEach((step, i) => {
          try {
            const stepName = step.name || `Unknown Transformed Step ${i + 1}`;
            DebugLogger.info(`Transformed Step ${i + 1}: ${stepName}`);

            const hasLabels = "labels" in step;
            const labelsValue = step.labels;

            DebugLogger.debug("Transformed step label data:", {
              hasLabels: hasLabels,
              labelsValue: labelsValue,
            });

            if (hasLabels && labelsValue) {
              DebugLogger.info("✅ Transformed step has labels preserved");
            } else {
              DebugLogger.warn("❌ Labels missing in transformed step");
            }
          } catch (stepError) {
            DebugLogger.error(
              `Error checking transformed step ${i + 1}:`,
              stepError.message,
            );
          }
        });
      } else {
        DebugLogger.warn(
          "IterationView or flatSteps not found in window object",
        );
      }
    } catch (error) {
      DebugLogger.error("IterationView check failed:", error.message);
    } finally {
      PerfTimer.end("iteration-view-check");
    }

    // 5. Check transformation mapping
    PerfTimer.start("transformation-mapping");
    try {
      DebugLogger.info("Checking transformFlatStepsToNested mapping");
      const sampleStep = apiData.data && apiData.data[0];

      if (sampleStep) {
        const stepFields = Object.keys(sampleStep).sort();
        DebugLogger.info(`Sample API step has ${stepFields.length} fields`);
        DebugLogger.debug("All step fields:", stepFields);

        const labelsField = sampleStep.labels;
        DebugLogger.info("Labels field in sample step:", labelsField);

        if (!labelsField) {
          DebugLogger.warn(
            "⚠️  Labels field is missing or null in API response",
          );
        }
      } else {
        DebugLogger.warn("No sample step available for field analysis");
      }
    } catch (error) {
      DebugLogger.error("Transformation mapping check failed:", error.message);
    } finally {
      PerfTimer.end("transformation-mapping");
    }

    // 6. Check DOM rendering
    PerfTimer.start("dom-check");
    try {
      DebugLogger.info("Checking DOM rendering");
      const labelCells = document.querySelectorAll(".col-labels");
      DebugLogger.info(`Found ${labelCells.length} label cells in DOM`);

      if (labelCells.length > 0) {
        const cellsToCheck = Math.min(
          config.maxStepsToCheck,
          labelCells.length,
        );
        const firstFew = Array.from(labelCells).slice(0, cellsToCheck);

        firstFew.forEach((cell, i) => {
          try {
            const cellContent = cell.innerHTML;
            DebugLogger.info(
              `Label cell ${i + 1} content: ${cellContent || "(empty)"}`,
            );

            if (!cellContent || cellContent.trim() === "") {
              DebugLogger.warn(`❌ Label cell ${i + 1} is empty`);
            } else {
              DebugLogger.info(`✅ Label cell ${i + 1} has content`);
            }
          } catch (cellError) {
            DebugLogger.error(
              `Error checking DOM cell ${i + 1}:`,
              cellError.message,
            );
          }
        });
      } else {
        DebugLogger.warn(
          "⚠️  No label cells found in DOM - labels may not be rendering",
        );
      }
    } catch (error) {
      DebugLogger.error("DOM check failed:", error.message);
    } finally {
      PerfTimer.end("dom-check");
    }

    // 7. Store debug data with error handling
    try {
      window.debugData = {
        config: config,
        apiData: apiData,
        iterationView: window.iterationView,
        flatSteps: window.iterationView?.flatSteps,
        sequences: window.iterationView?.sequences,
        timestamp: new Date().toISOString(),
        performance: {
          totalTime: PerfTimer.end("total-debug"),
        },
      };

      DebugLogger.info("✅ Debug data stored in window.debugData");
      DebugLogger.info(
        "Access: window.debugData.apiData.data[0] for first API step",
      );
      DebugLogger.info(
        "Access: window.debugData.config for debug configuration",
      );
    } catch (error) {
      DebugLogger.error("Failed to store debug data:", error.message);
    }

    return apiData;
  } catch (error) {
    DebugLogger.error("Debug process failed:", error.message);
    DebugLogger.error("Error stack:", error.stack);

    // Still try to store partial data for analysis
    try {
      window.debugData = {
        config: config,
        error: {
          message: error.message,
          stack: error.stack,
        },
        timestamp: new Date().toISOString(),
      };
      DebugLogger.info("Partial debug data stored despite error");
    } catch (storeError) {
      DebugLogger.error(
        "Failed to store even partial debug data:",
        storeError.message,
      );
    }

    throw error;
  }
}

// Export utilities for reuse
window.debugLabelsIssue = debugLabelsIssue;
window.DebugLogger = DebugLogger;
window.PerfTimer = PerfTimer;

// Enhanced usage instructions
console.info("🔍 Enhanced Labels Debug Tool Loaded");
console.info("");
console.info("Usage Examples:");
console.info(
  "  debugLabelsIssue()                                    # Default: INFO level, 5 steps",
);
console.info(
  '  debugLabelsIssue({ logLevel: "DEBUG" })               # Debug mode with detailed logging',
);
console.info(
  "  debugLabelsIssue({ pageSize: 10, maxStepsToCheck: 5 }) # Check more data",
);
console.info(
  "  debugLabelsIssue({ includeFullStepData: true })       # Include complete step objects",
);
console.info("");
console.info("Configuration Options:");
console.info(
  '  - logLevel: "ERROR", "WARN", "INFO", "DEBUG" (default: "INFO")',
);
console.info("  - pageSize: Number of steps to fetch (default: 5)");
console.info("  - maxStepsToCheck: Steps to analyze in detail (default: 3)");
console.info(
  "  - includeFullStepData: Include complete step objects (default: false)",
);
console.info("");
console.info("Utilities Available:");
console.info('  - DebugLogger.setLevel("DEBUG") # Change log level anytime');
console.info('  - PerfTimer.start/end("name")   # Manual performance timing');
console.info("");
console.info("Results stored in: window.debugData");
console.info("Performance metrics in: window.debugData.performance");
