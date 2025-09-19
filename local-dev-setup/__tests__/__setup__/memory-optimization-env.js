/**
 * TD-005 Phase 2: Memory Optimization Environment Setup
 *
 * Environment setup for memory-optimized testing during TD-005 Phase 2.
 * Configures Node.js and Jest for optimal memory usage.
 *
 * @version 2.0 (TD-005 Phase 2)
 * @author gendev-test-suite-generator
 * @priority High (Memory Optimization)
 */

// Set memory optimization environment variables
process.env.NODE_ENV = "test";
process.env.NODE_OPTIONS =
  process.env.NODE_OPTIONS || "--max-old-space-size=1024";

// Memory optimization settings
process.env.TD005_MEMORY_LIMIT = "512"; // MB
process.env.TD005_EXECUTION_LIMIT = "2000"; // ms
process.env.TD005_PHASE = "Phase2";

// Garbage collection optimization
if (global.gc) {
  // Force garbage collection before tests if available
  global.gc();
}

// Memory monitoring
const originalMemoryUsage = process.memoryUsage;
let memorySnapshots = [];

process.memoryUsage = function () {
  const usage = originalMemoryUsage.call(this);

  // Track memory snapshots for TD-005 compliance monitoring
  memorySnapshots.push({
    timestamp: Date.now(),
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rss: usage.rss,
  });

  // Keep only last 50 snapshots to prevent memory accumulation
  if (memorySnapshots.length > 50) {
    memorySnapshots = memorySnapshots.slice(-50);
  }

  return usage;
};

// Global memory compliance check function
global.checkTD005MemoryCompliance = function () {
  const current = process.memoryUsage();
  const limitMB = parseInt(process.env.TD005_MEMORY_LIMIT || "512");
  const limitBytes = limitMB * 1024 * 1024;

  return {
    compliant: current.heapUsed < limitBytes,
    usage: current,
    limit: limitBytes,
    utilizationPercent: (current.heapUsed / limitBytes) * 100,
    snapshots: memorySnapshots.slice(-10), // Last 10 snapshots
  };
};

// Set up global cleanup handlers
global.td005Cleanup = function () {
  // Clear memory snapshots
  memorySnapshots = [];

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
};

// Performance optimization settings
if (typeof performance !== "undefined") {
  // Clear performance entries to prevent memory accumulation
  setInterval(() => {
    if (performance.getEntries) {
      const entries = performance.getEntries();
      if (entries.length > 100) {
        performance.clearMeasures();
        performance.clearMarks();
        performance.clearResourceTimings();
      }
    }
  }, 30000); // Every 30 seconds
}

console.log("🚀 TD-005 Phase 2 Memory Optimization Environment Initialized");
console.log(`  Memory Limit: ${process.env.TD005_MEMORY_LIMIT}MB`);
console.log(`  Execution Limit: ${process.env.TD005_EXECUTION_LIMIT}ms`);
console.log(`  Node Options: ${process.env.NODE_OPTIONS}`);
