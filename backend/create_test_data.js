const CatchSensor = require('./src/models/CatchSensor');
const Reading = require('./src/models/Reading');
const sequelize = require('./src/config/database');
const { Op } = require('sequelize');

async function createTestData() {
    try {
        // Find the catch sensor
        const catchSensor = await CatchSensor.findOne({
            where: {
                [Op.or]: [
                    { name: 'Hühnermobil' },
                    { alias: 'Hühnermobil' },
                    { name: 'Hühnerhaus' },
                    { alias: 'Hühnerhaus' }
                ]
            }
        });

        if (!catchSensor) {
            console.error('CatchSensor "Hühnermobil/Hühnerhaus" nicht gefunden.');
            process.exit(1);
        }

        console.log(`Erstelle Testdaten für: ${catchSensor.name} (${catchSensor.id})`);

        // Clear existing readings for a clean test set if desired? 
        // No, let's just add to it.

        const now = new Date();
        const testReadings = [];

        // 1. A series of status updates over the last 24 hours
        for (let i = 24; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000); // Hourly
            const batteryDecay = Math.max(0, 100 - (24 - i) * 0.5); // Slow decay

            testReadings.push({
                catchSensorId: catchSensor.id,
                value: 3800 - (24 - i) * 10, // Voltage in mV
                type: 'status',
                status: 'active',
                batteryPercent: Math.round(batteryDecay),
                rsrp: -70 - Math.floor(Math.random() * 10),
                timestamp: time,
                snr: 8.5 + (Math.random() * 2),
                gatewayId: 'eui-test-gateway-1',
                gatewayCount: 1,
                fCnt: 100 + (24 - i),
                spreadingFactor: 7
            });
        }

        // 2. An alarm event 2 hours ago
        testReadings.push({
            catchSensorId: catchSensor.id,
            value: 3650,
            type: 'alarm',
            status: 'triggered',
            batteryPercent: 45,
            rsrp: -75,
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            snr: 7.2,
            gatewayId: 'eui-test-gateway-1',
            gatewayCount: 2,
            fCnt: 125,
            spreadingFactor: 7
        });

        // 3. A final status update (resurrection) 1 hour ago
        testReadings.push({
            catchSensorId: catchSensor.id,
            value: 3640,
            type: 'status',
            status: 'active',
            batteryPercent: 44,
            rsrp: -78,
            timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
            snr: 6.8,
            gatewayId: 'eui-test-gateway-1',
            gatewayCount: 1,
            fCnt: 126,
            spreadingFactor: 7
        });

        await Reading.bulkCreate(testReadings);

        // Update the sensor's main fields to reflect the last reading
        await catchSensor.update({
            status: 'active',
            batteryVoltage: 3640,
            batteryPercent: 44,
            lastSeen: new Date(now.getTime() - 1 * 60 * 60 * 1000)
        });

        console.log('✅ Testdaten erfolgreich erstellt.');
        process.exit(0);
    } catch (err) {
        console.error('Fehler beim Erstellen der Testdaten:', err);
        process.exit(1);
    }
}

createTestData();

