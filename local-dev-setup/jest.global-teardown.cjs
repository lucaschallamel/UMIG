module.exports = async () => {
    const { disconnect } = await import('./scripts/lib/db.js');
    console.log('[TEARDOWN_LOG] Running global teardown...');
    await disconnect();
    console.log('[TEARDOWN_LOG] Global teardown complete.');
};
