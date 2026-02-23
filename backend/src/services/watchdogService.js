const cron = require('node-cron');
const CatchSensor = require('../models/CatchSensor');
const User = require('../models/User');
const { Op } = require('sequelize');
const { sendUnifiedNotification } = require('./notificationService');

/**
 * Watchdog Service
 * Runs every 15 minutes and handles persistent repeat alerts for:
 *  - ALARM (triggered):       repeat every 3h until user resets to active
 *  - CONNECTION_LOST (offline): repeat every 8h until sensor comes back online
 *  - LOW_BATTERY:             repeat every 8h until battery is charged
 *
 * "Confirmation" is the natural state change:
 *  - Triggered → user resets sensor to 'active' in Dashboard
 *  - Offline   → sensor sends a message again
 *  - Low batt  → battery charges and next message reports higher %
 */
const setupWatchdog = (io) => {
    console.log('Watchdog: Service initialized (Interval: Every 15 minutes)');

    cron.schedule('*/15 * * * *', async () => {
        console.log('Watchdog: Running checks...');
        try {
            // Fetch all sensors that are owned by a user (unbound sensors are skipped)
            const sensors = await CatchSensor.findAll({
                where: { userId: { [Op.ne]: null } }
            });

            if (sensors.length === 0) return;

            // Batch-load all relevant users to avoid N+1 queries
            const userIds = [...new Set(sensors.map(s => s.userId))];
            const users = await User.findAll({ where: { id: { [Op.in]: userIds } } });
            const userMap = {};
            for (const u of users) userMap[u.id] = u;

            for (const sensor of sensors) {
                const user = userMap[sensor.userId];
                if (!user) continue;

                const catchInterval = 3;   // hours between triggered repeat alerts
                const batteryInterval = 8;   // hours between battery alerts
                const offlineInterval = 8;   // hours before/between offline alerts

                const sensorLabel = sensor.alias || sensor.name || sensor.deviceId || sensor.imei;

                // ── 1. ALARM: repeat alert while sensor remains triggered and not acknowledged ──
                if (sensor.status === 'triggered') {
                    // Skip if user has acknowledged this alarm event
                    const isAcknowledged = !!sensor.alarmAcknowledgedAt && (
                        !sensor.lastCatchAlert ||
                        new Date(sensor.alarmAcknowledgedAt) >= new Date(sensor.lastCatchAlert)
                    );

                    if (isAcknowledged) {
                        console.log(`Watchdog: ✅ Alarm acknowledged for "${sensorLabel}" — skipping re-alert`);
                    } else {
                        const lastAlert = sensor.lastCatchAlert;
                        const sinceAlert = lastAlert ? (Date.now() - new Date(lastAlert).getTime()) / 3600000 : Infinity;
                        if (sinceAlert >= catchInterval) {
                            console.log(`Watchdog: 🚨 Re-alerting TRIGGERED sensor "${sensorLabel}" (${sinceAlert.toFixed(1)}h since last alert)`);
                            await sendUnifiedNotification(user, sensor, 'ALARM');
                        }
                    }
                }

                // ── 2. CONNECTION_LOST: alert if sensor hasn't been seen in offlineInterval hours ──
                if (sensor.lastSeen) {
                    const hoursSinceLastSeen = (Date.now() - new Date(sensor.lastSeen).getTime()) / 3600000;
                    if (hoursSinceLastSeen >= offlineInterval) {
                        console.log(`Watchdog: 📡 Sensor "${sensorLabel}" is OFFLINE (${hoursSinceLastSeen.toFixed(1)}h since last seen)`);

                        // Update status to inactive if not already
                        if (sensor.status !== 'inactive') {
                            await sensor.update({ status: 'inactive' });
                            io.emit('catchSensorUpdate', sensor);
                        }

                        // sendUnifiedNotification handles its own throttle via lastOfflineAlert
                        await sendUnifiedNotification(user, sensor, 'CONNECTION_LOST');
                    }
                }

                // ── 3. LOW_BATTERY: repeat alert while battery stays below threshold ──
                if (sensor.batteryPercent !== null) {
                    const threshold = user.batteryThreshold || 20;
                    if (sensor.batteryPercent < threshold) {
                        const lastAlert = sensor.lastBatteryAlert;
                        const sinceAlert = lastAlert ? (Date.now() - new Date(lastAlert).getTime()) / 3600000 : Infinity;
                        if (sinceAlert >= batteryInterval) {
                            console.log(`Watchdog: 🪫 Re-alerting LOW BATTERY sensor "${sensorLabel}" (${sensor.batteryPercent}% < ${threshold}%)`);
                            await sendUnifiedNotification(user, sensor, 'LOW_BATTERY');
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Watchdog Error:', err);
        }
    });
};

module.exports = { setupWatchdog };
