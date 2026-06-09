const { Sequelize } = require('sequelize');
const sequelize = require('./src/config/database');
const User = require('./src/models/User');
const CatchSensor = require('./src/models/CatchSensor');
const Reading = require('./src/models/Reading');
const { sendUnifiedNotification } = require('./src/services/notificationService');
require('dotenv').config();

async function main() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');

        const user = await User.findOne({ where: { email: 'Test@test.de' } });
        if (!user) {
            console.error('❌ User Test@test.de not found!');
            process.exit(1);
        }
        console.log(`User: ${user.email} (ID: ${user.id})`);

        const imei = '768745453435434343';
        let catchSensor = await CatchSensor.findOne({ where: { imei: imei } });

        if (!catchSensor) {
            catchSensor = await CatchSensor.create({
                name: 'Test',
                userId: user.id,
                type: 'NB-IOT',
                imei: imei,
                status: 'active'
            });
        }

        console.log(`CatchSensor: ${catchSensor.name} (ID: ${catchSensor.id})`);

        // Update Sensor
        catchSensor.status = 'triggered';
        catchSensor.batteryVoltage = 3850;
        catchSensor.batteryPercent = 90;
        catchSensor.rsrp = -65;
        catchSensor.lastSeen = new Date();
        await catchSensor.save();

        // Add Reading
        await Reading.create({
            catchSensorId: catchSensor.id,
            value: 3850,
            type: 'alarm',
            status: 'triggered',
            batteryPercent: 90,
            rsrp: -65
        });

        console.log('✅ Database updated. Triggering notification...');

        // Trigger Notification
        // Mocking io as empty or null since we don't have the real io instance here
        // The service logic sends to PushSubscription and Pushover directly, io is used for Socket.IO which we can't trigger easily from here but that's fine for "Test PWA Push" validation.
        await sendUnifiedNotification(user, catchSensor, 'ALARM');

        console.log('🚀 Test alarm and notification triggered successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
