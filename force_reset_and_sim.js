const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');

(async () => {
    console.log('🧹 Cleanup Started...');

    // 1. Delete local key files safely using absolute paths
    const keyPath = path.resolve(__dirname, 'backend/tests/melder_123456789.key');
    const fCntPath = keyPath + '.fCnt';
    
    if(fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
        console.log('🗑️ Local individual key deleted.');
    }
    if(fs.existsSync(fCntPath)) {
        fs.unlinkSync(fCntPath);
    }

    // 2. Clear Database record to force new TOFU handshake
    console.log('🔄 Resetting database lock for 123456789...');
    try {
        const sequelize = new Sequelize('catchsensor', 'root', 'root', { host: '192.168.2.183', dialect: 'mariadb', logging: false });
        await sequelize.query(`UPDATE CatchSensors SET aesKey = NULL, isProvisioned = 0, resyncRequired = 0, lastFCnt = 0 WHERE imei = '123456789'`);
        console.log('✅ Database reset successful.');
    } catch (e) {
        console.error('❌ Database error:', e.message);
    }
    
    // 3. Run Simulator locally to trigger fresh handshake
    console.log('🚀 Starting Simulator for fresh handshake...');
    try {
        const nodePath = 'D:\\CatchSensor\\NodeJS\\node.exe';
        const scriptPath = path.resolve(__dirname, 'backend/tests/software_melder.js');
        const out = execSync(`"${nodePath}" "${scriptPath}" 123456789 active 4000 70`, {encoding:'utf8'});
        console.log(out);
    } catch(e) {
        console.error(e.stdout);
        console.error(e.stderr);
    }
    
    process.exit(0);
})();
