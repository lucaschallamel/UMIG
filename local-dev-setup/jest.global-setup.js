const { connect } = require('./lib/db');

module.exports = async () => {
    console.log('[SETUP_LOG] Running global setup...');
    await connect();
    console.log('[SETUP_LOG] Global setup complete.');
};
