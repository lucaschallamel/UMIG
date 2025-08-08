module.exports = async () => {
  try {
    const { connect } = await import("./scripts/lib/db.js");
    console.log("[SETUP_LOG] Running global setup...");
    await connect();
    console.log("[SETUP_LOG] Global setup complete.");
  } catch (error) {
    console.error("Jest global setup failed:", error);
    process.exit(1);
  }
};
