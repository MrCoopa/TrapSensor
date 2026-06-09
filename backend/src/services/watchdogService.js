const cron = require('node-cron');
const CatchSensor = require('../models/CatchSensor');
const User = require('../models/User');
const LoraMetadata = require('../models/LoraMetadata');
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

            // Batch-load all relevant users (owners and shared users) to avoid N+1 queries
            const ownerIds = [...new Set(sensors.map(s => s.userId))];
            const CatchShare = require('../models/CatchShare');
            const shares = await CatchShare.findAll({
                where: { catchSensorId: { [Op.in]: sensors.map(s => s.id) } }
            });
            const sharedUserIds = shares.map(share => share.userId);
            const allUserIds = [...new Set([...ownerIds, ...sharedUserIds])];
            
            const users = await User.findAll({ where: { id: { [Op.in]: allUserIds } } });
            const userMap = {};
            for (const u of users) userMap[u.id] = u;

            // Map sensorId to list of authorized user IDs
            const sensorUsersMap = {};
            for (const sensor of sensors) {
                sensorUsersMap[sensor.id] = [sensor.userId].filter(Boolean);
            }
            for (const share of shares) {
                if (sensorUsersMap[share.catchSensorId]) {
                    if (!sensorUsersMap[share.catchSensorId].includes(share.userId)) {
                        sensorUsersMap[share.catchSensorId].push(share.userId);
                    }
                }
            }

            for (const sensor of sensors) {
                const authorizedUserIds = sensorUsersMap[sensor.id] || [];
                if (authorizedUserIds.length === 0) continue;

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
                            for (const uId of authorizedUserIds) {
                                const user = userMap[uId];
                                if (user) {
                                    await sendUnifiedNotification(user, sensor, 'ALARM');
                                }
                            }
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
                            const updatedSensor = await CatchSensor.findByPk(sensor.id, {
                                include: [{ model: LoraMetadata, as: 'lorawanCatchSensor' }]
                            });
                            authorizedUserIds.forEach(uId => {
                                io.to(`user_${uId}`).emit('catchSensorUpdate', updatedSensor);
                            });
                        }

                        // sendUnifiedNotification handles its own throttle via lastOfflineAlert
                        for (const uId of authorizedUserIds) {
                            const user = userMap[uId];
                            if (user) {
                                await sendUnifiedNotification(user, sensor, 'CONNECTION_LOST');
                            }
                        }
                    }
                }

                // ── 3. LOW_BATTERY: repeat alert while battery stays below threshold ──
                if (sensor.batteryPercent !== null) {
                    const lastAlert = sensor.lastBatteryAlert;
                    const sinceAlert = lastAlert ? (Date.now() - new Date(lastAlert).getTime()) / 3600000 : Infinity;
                    if (sinceAlert >= batteryInterval) {
                        for (const uId of authorizedUserIds) {
                            const user = userMap[uId];
                            if (user) {
                                const threshold = user.batteryThreshold || 20;
                                if (sensor.batteryPercent < threshold) {
                                    console.log(`Watchdog: 🪫 Re-alerting LOW BATTERY sensor "${sensorLabel}" for User ${user.email} (${sensor.batteryPercent}% < ${threshold}%)`);
                                    await sendUnifiedNotification(user, sensor, 'LOW_BATTERY');
                                }
                            }
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
