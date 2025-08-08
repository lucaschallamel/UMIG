module.exports = async () => {
  try {
    const { disconnect } = await import("./scripts/lib/db.js");
    console.log("[TEARDOWN_LOG] Running global teardown...");
    await disconnect();
    console.log("[TEARDOWN_LOG] Global teardown complete.");
  } catch (error) {
    console.error("Jest global teardown failed:", error);
    process.exit(1);
  }
};
