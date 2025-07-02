module.exports = async () => {
    const { connect } = await import('./scripts/lib/db.js');
    console.log('[SETUP_LOG] Running global setup...');
    await connect();
    console.log('[SETUP_LOG] Global setup complete.');
};
