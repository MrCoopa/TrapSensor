const CatchSensor = require('./src/models/CatchSensor');
const sequelize = require('./src/config/database');
const { Op } = require('sequelize');

async function repairCatchSensors() {
    try {
        const eightHoursAgo = new Date(Date.now() - (8 * 60 + 10) * 60 * 1000);

        // Find CatchSensors that are 'inactive' but have been seen recently
        const wronglyOffline = await CatchSensor.findAll({
            where: {
                status: 'inactive',
                lastSeen: { [Op.gt]: eightHoursAgo }
            }
        });

        console.log(`Found ${wronglyOffline.length} CatchSensors to resurrect.`);

        for (const catchSensor of wronglyOffline) {
            console.log(`Resurrecting sensor: ${catchSensor.name} (${catchSensor.id})`);
            await catchSensor.update({ status: 'active' });
        }

        console.log('Repair complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

repairCatchSensors();
