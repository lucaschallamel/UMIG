/**
 * Global Jest Setup for Process Control
 * TD-005 Phase 1 Emergency Stabilization
 *
 * Prevents hanging tests and ensures clean teardown
 */

export default async function globalSetup() {
  console.log("🚀 Starting Jest global setup (TD-005 Emergency)...");

  // Set global timeouts to prevent hanging
  process.env.JEST_TIMEOUT = "15000";
  process.env.EMERGENCY_MODE = "true";

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Set up emergency exit timer (5 minutes max for entire test run)
  global.emergencyTimer = setTimeout(() => {
    console.error("⚠️ EMERGENCY: Tests running over 5 minutes, forcing exit");
    console.error("This indicates hanging tests or infinite loops (TD-005)");
    process.exit(1);
  }, 300000); // 5 minutes

  // Set up process monitoring
  const startTime = Date.now();
  global.testStartTime = startTime;

  // Monitor memory usage
  const memoryCheck = setInterval(() => {
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 512 * 1024 * 1024) {
      // 512MB threshold
      console.warn(
        `⚠️ High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      );
    }
  }, 30000); // Check every 30 seconds

  global.memoryMonitor = memoryCheck;

  console.log("✅ Jest global setup complete (TD-005 Emergency Mode Active)");
}
