const { disconnect } = require('./lib/db');

module.exports = async () => {
    console.log('[TEARDOWN_LOG] Running global teardown...');
    await disconnect();
    console.log('[TEARDOWN_LOG] Global teardown complete.');
};
