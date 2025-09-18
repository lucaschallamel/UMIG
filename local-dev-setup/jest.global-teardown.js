/**
 * Global Jest Teardown for Process Control
 * TD-005 Phase 1 Emergency Stabilization
 *
 * Ensures clean process termination and resource cleanup
 */

export default async function globalTeardown() {
  console.log("🧹 Starting Jest global teardown (TD-005 Emergency)...");

  const startTime = global.testStartTime || Date.now();
  const duration = Date.now() - startTime;
  console.log(`📊 Total test execution time: ${Math.round(duration / 1000)}s`);

  // Clear emergency timer
  if (global.emergencyTimer) {
    clearTimeout(global.emergencyTimer);
    console.log("✅ Emergency timer cleared");
  }

  // Clear memory monitor
  if (global.memoryMonitor) {
    clearInterval(global.memoryMonitor);
    console.log("✅ Memory monitor cleared");
  }

  // Force garbage collection
  if (global.gc) {
    global.gc();
    console.log("✅ Garbage collection forced");
  }

  // Clear any remaining timeouts/intervals
  try {
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
    console.log(
      `✅ Cleared ${highestTimeoutId} potential timeout/interval handles`,
    );
  } catch (error) {
    console.warn("⚠️ Error clearing timeouts/intervals:", error.message);
  }

  // Final memory report
  const finalMemory = process.memoryUsage();
  console.log(
    `📊 Final memory usage: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
  );

  // Check for potential memory leaks
  if (finalMemory.heapUsed > 256 * 1024 * 1024) {
    // 256MB threshold
    console.warn("⚠️ Potential memory leak detected - heap usage above 256MB");
  }

  console.log("✅ Jest global teardown complete (TD-005 Emergency Mode)");
}
