const { CatchSensor } = require('./backend/src/models');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

(async () => {
    try {
        const s = await CatchSensor.findOne({ 
            where: { imei: '5555555555' } 
        });
        if (s) {
            console.log(`Sensor 5555555555:`);
            console.log(`  Last Seen: ${s.lastSeen}`);
            console.log(`  RSRP: ${s.rsrp}`);
            console.log(`  Battery: ${s.batteryVoltage}mV (${s.batteryPercent}%)`);
            console.log(`  Last fCnt: ${s.lastFCnt}`);
        } else {
            console.log("Sensor not found in DB.");
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
})();
