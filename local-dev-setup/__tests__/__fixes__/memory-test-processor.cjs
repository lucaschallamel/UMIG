/**
 * TD-005 Phase 2: Memory Test Results Processor
 *
 * Custom Jest test results processor for monitoring memory usage
 * during TD-005 Phase 2 infrastructure restoration tests.
 *
 * @version 2.0 (TD-005 Phase 2)
 * @author gendev-test-suite-generator
 * @priority High (Memory Monitoring)
 */

/**
 * Process test results and monitor memory usage
 */
function processResults(results) {
  const memoryUsage = process.memoryUsage();
  const memoryMB = {
    heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(1),
    heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(1),
    external: (memoryUsage.external / 1024 / 1024).toFixed(1),
    rss: (memoryUsage.rss / 1024 / 1024).toFixed(1),
  };

  // TD-005 memory compliance check
  const memoryLimit = 512; // MB
  const isCompliant = memoryUsage.heapUsed < memoryLimit * 1024 * 1024;

  console.log("\n🧠 TD-005 Memory Usage Report:");
  console.log(
    `  Heap Used: ${memoryMB.heapUsed}MB / ${memoryLimit}MB (${((memoryUsage.heapUsed / (memoryLimit * 1024 * 1024)) * 100).toFixed(1)}%)`,
  );
  console.log(`  Heap Total: ${memoryMB.heapTotal}MB`);
  console.log(`  External: ${memoryMB.external}MB`);
  console.log(`  RSS: ${memoryMB.rss}MB`);
  console.log(
    `  Memory Compliance: ${isCompliant ? "✅ COMPLIANT" : "❌ NON-COMPLIANT"}`,
  );

  // Add memory data to results
  results.memoryUsage = {
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal,
    external: memoryUsage.external,
    rss: memoryUsage.rss,
    timestamp: Date.now(),
    compliant: isCompliant,
    limit: memoryLimit * 1024 * 1024,
    utilizationPercent:
      (memoryUsage.heapUsed / (memoryLimit * 1024 * 1024)) * 100,
  };

  if (!isCompliant) {
    console.warn(`⚠️ Memory usage exceeds TD-005 limit of ${memoryLimit}MB`);
  }

  return results;
}

module.exports = processResults;
