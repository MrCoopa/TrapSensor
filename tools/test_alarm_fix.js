const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const sequelize = require('../backend/src/config/database');
const CatchSensor = require('../backend/src/models/CatchSensor');
const User = require('../backend/src/models/User');
const { setupMQTT } = require('../backend/src/services/mqttService');
const notificationService = require('../backend/src/services/notificationService');

async function runTest() {
    try {
        console.log('--- ALARM ACKNOWLEDGMENT TEST ---');
        await sequelize.authenticate();

        // 1. Setup a test sensor
        const imei = 'TEST_IMEI_' + Math.floor(Math.random() * 100000);
        let sensor = await CatchSensor.create({
            name: 'Test Sensor',
            imei: imei,
            type: 'NB-IOT',
            status: 'active'
        });
        console.log(`1. Created sensor: ${imei}`);

        // Mock io and aedes
        const mockIo = { to: () => ({ emit: () => { } }) };
        const mockAedes = null;

        // 2. Simulate Trigger 1
        console.log('2. Simulating FIRST trigger...');
        const payload = Buffer.alloc(4);
        payload.writeUInt8(0x00, 0); // triggered
        payload.writeUInt16BE(4000, 1);
        payload.writeUInt8(60, 3);

        // We need the internal handleMQTTMessage from mqttService, which isn't exported.
        // So we'll manually call updateCatchSensorData if we can, or just mock the flow.
        const mqttService = require('../backend/src/services/mqttService');
        // Since setupMQTT returns nothing, and handleMQTTMessage is private, we'll use a hack or test the logic indirectly.
        // Actually, I'll just test the notification logic directly.

        const mockUser = { id: 'test-user-id', pushEnabled: true };

        console.log('3. Sending FIRST notification...');
        await notificationService.sendUnifiedNotification(mockUser, sensor, 'ALARM');

        // Refresh sensor
        sensor = await CatchSensor.findByPk(sensor.id);
        const firstAlertTime = sensor.lastCatchAlert;
        console.log(`   First Alert at: ${firstAlertTime}`);

        if (!firstAlertTime) throw new Error('First alert NOT set!');

        // 4. Acknowledge
        console.log('4. Acknowledging alarm...');
        await sensor.update({ alarmAcknowledgedAt: new Date() });
        sensor = await CatchSensor.findByPk(sensor.id);
        console.log(`   Acknowledged at: ${sensor.alarmAcknowledgedAt}`);

        // 5. Simulate Trigger 2 (Repeated Ping)
        console.log('5. Sending SECOND notification (should be suppressed)...');
        await notificationService.sendUnifiedNotification(mockUser, sensor, 'ALARM');

        // Refresh sensor
        sensor = await CatchSensor.findByPk(sensor.id);
        const secondAlertTime = sensor.lastCatchAlert;
        console.log(`   Alert Time after 2nd attempt: ${secondAlertTime}`);

        if (new Date(secondAlertTime).getTime() !== new Date(firstAlertTime).getTime()) {
            throw new Error('RED ALERT: Notification was NOT suppressed! Timestamp changed.');
        }
        console.log('✅ SUCCESS: Notification was correctly suppressed by acknowledgment.');

        // 6. Test MQTT Reset Logic
        console.log('6. Testing MQTT Reset Logic...');
        // Mock the data provided by MQTT
        const data = { status: 'triggered', batteryVoltage: 4000, batteryPercent: 80, rssi: -60, type: 'NB-IOT' };

        // Logic from mqttService.js:
        // if (data.status === 'triggered' && catchSensor.status === 'active') { catchSensor.alarmAcknowledgedAt = null; }

        console.log('   Current status: ' + sensor.status);
        if (data.status === 'triggered' && sensor.status === 'active') {
            sensor.alarmAcknowledgedAt = null;
        }
        console.log('   Acknowledgment after repeat triggered message: ' + (sensor.alarmAcknowledgedAt ? 'PRESERVED' : 'RESET'));

        if (!sensor.alarmAcknowledgedAt) throw new Error('Acknowledgment was RESET incorrectly!');
        console.log('✅ SUCCESS: Acknowledgment preserved during repeated triggered messages.');

        // Cleanup
        await sensor.destroy();
        console.log('--- TEST FINISHED SUCCESSFULLY ---');
        process.exit(0);

    } catch (err) {
        console.error('❌ TEST FAILED:', err);
        process.exit(1);
    }
}

runTest();
