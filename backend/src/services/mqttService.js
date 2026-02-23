const mqtt = require('mqtt');
const CatchSensor = require('../models/CatchSensor');
const Reading = require('../models/Reading');
const User = require('../models/User');
const CatchShare = require('../models/CatchShare');
const PushSubscription = require('../models/PushSubscription');
const LoraMetadata = require('../models/LoraMetadata');
const { sendUnifiedNotification } = require('./notificationService');

/** Convert battery voltage (mV) to percentage. Range: 3300mV (0%) → 4200mV (100%) */
const voltageToBatteryPercent = (mV) => Math.min(100, Math.max(0, Math.floor((mV - 3300) / 9)));


const setupMQTT = (io, aedes) => {
    // 1. Path A: Internal NB-IoT Broker (Aedes)

    if (aedes) {
        aedes.on('publish', async (packet, client) => {
            if (packet.topic.startsWith('$SYS')) return; // Ignore system topics
            console.log(`MQTT: 📥 Internal Broker received publish on: ${packet.topic}`);
            if (packet.topic && packet.topic.startsWith('catches/') && packet.topic.endsWith('/data')) {
                handleMQTTMessage(packet.topic, packet.payload, io, 'NB-IOT');
            }
        });
    }

    // 2. Path B: External NB-IoT Broker (Optional)
    if (process.env.NBIOT_MQTT_BROKER) {
        connectToBroker({
            name: 'External NB-IoT',
            url: `mqtt://${process.env.NBIOT_MQTT_BROKER}`,
            port: process.env.NBIOT_MQTT_PORT || 1883,
            username: process.env.NBIOT_MQTT_USER,
            password: process.env.NBIOT_MQTT_PASS,
            topic: process.env.NBIOT_MQTT_TOPIC || 'catches/+/data'
        }, (topic, payload) => handleMQTTMessage(topic, payload, io, 'NB-IOT'));
    }

    // 3. Path C: LoRaWAN via TTN (External MQTT Broker)
    if (process.env.TTN_MQTT_USER) {
        const ttnPort = process.env.TTN_MQTT_PORT || 1883;
        const protocol = ttnPort == 8883 ? 'mqtts' : 'mqtt';
        const brokerUrl = `${protocol}://${process.env.TTN_MQTT_BROKER || 'eu1.cloud.thethings.network'}:${ttnPort}`;

        console.log(`MQTT: 🔍 TTN Config Check - User: ${process.env.TTN_MQTT_USER?.substring(0, 5)}..., Pass-Length: ${process.env.TTN_MQTT_PASS?.length}, URL: ${brokerUrl}`);

        connectToBroker({
            name: 'LoRaWAN (TTN)',
            url: brokerUrl,
            username: process.env.TTN_MQTT_USER,
            password: process.env.TTN_MQTT_PASS,
            topic: '#' // Use wildcard as specific topics are being rejected
        }, (topic, payload) => {
            if (topic.endsWith('/up')) {
                handleMQTTMessage(topic, payload, io, 'LORAWAN');
            } else {
                console.log(`MQTT: Ignored TTN Topic: ${topic}`);
            }
        });
    } else {
        console.log('MQTT: ℹ️ LoRaWAN (TTN) not configured (missing TTN_MQTT_USER).');
    }
};

const connectToBroker = (config, onMessage) => {
    console.log(`MQTT: Connecting to ${config.name} Broker: ${config.url}`);
    const client = mqtt.connect(config.url, {
        username: config.username,
        password: config.password,
    });

    client.on('connect', () => {
        console.log(`MQTT: ✅ Connected to ${config.name} Broker`);
        client.subscribe(config.topic, (err) => {
            if (err) console.error(`MQTT: Failed to subscribe to ${config.topic}`, err);
            else console.log(`MQTT: Subscribed to ${config.topic}`);
        });
    });

    client.on('packetreceive', (packet) => {
        if (packet.cmd === 'publish') {
            // Keep minimal for production
        }
    });

    client.on('message', (topic, payload) => {
        console.log(`MQTT: Received message on ${config.name} topic: ${topic}`);
        onMessage(topic, payload);
    });

    client.on('error', (err) => {
        console.error(`MQTT ${config.name} Error:`, err);
    });

    return client;
};


const handleMQTTMessage = async (topic, payload, io, pathType) => {
    try {
        let normalizedData = null;
        let deviceId = null;

        if (pathType === 'NB-IOT') {
            // Path A: NB-IoT Binary (4 Bytes)
            // Payload format: [Status (1), Voltage (2), RSSI (1)]
            if (payload.length < 4) return;

            deviceId = topic.split('/')[1];
            const statusByte = payload.readUInt8(0);
            const voltage = payload.readUInt16BE(1);
            const rssi = payload.readUInt8(3);

            normalizedData = {
                type: 'NB-IOT',
                status: statusByte === 0x01 ? 'active' : 'triggered',
                batteryVoltage: voltage,
                batteryPercent: voltageToBatteryPercent(voltage),
                rssi: -rssi,
                lastReading: new Date()
            };
        } else if (pathType === 'LORAWAN') {
            // Path B: LoRaWAN JSON (TTN Format)
            let json;
            try {
                json = JSON.parse(payload.toString());
            } catch (pErr) {
                console.error(`MQTT: Failed to parse LoRaWAN JSON on topic ${topic}:`, pErr.message);
                return;
            }


            // Handle both array-wrapped (simulate) and single-object (real) JSON
            const data = Array.isArray(json) ? json[0] : (json.data || json);
            if (!data.end_device_ids) return;

            deviceId = data.end_device_ids.device_id;
            const uplink = data.uplink_message;
            if (!uplink) return;

            console.log(`MQTT: Processing LoRaWAN Message for ${deviceId}`);

            // Priority 1: Use Decoded Payload if available
            let status = 'active';
            let voltage = 0;
            let batteryPercent = 0;

            if (uplink.decoded_payload) {
                const dp = uplink.decoded_payload;
                const statusStr = (dp.status || '').toLowerCase();
                status = (statusStr === 'triggered' || statusStr === 'closed') ? 'triggered' : 'active';

                // Voltage can be in mV or V
                voltage = dp.batteryVoltage > 100 ? dp.batteryVoltage : Math.round(dp.batteryVoltage * 1000);
                batteryPercent = dp.batteryPercent || 0;
            }
            // Priority 2: Fallback to binary parsing of frm_payload if decoded_payload is missing or 0
            else if (uplink.frm_payload) {
                const buffer = Buffer.from(uplink.frm_payload, 'base64');
                if (buffer.length >= 3) {
                    const statusByte = buffer.readUInt8(0);
                    // Use the 3-byte format seen in the dump: AQ39 -> 01 0d fd -> 3581mV
                    // Or the 4-byte format seen in the other dump: AQzkUA== -> 01 0c e4 50 -> 3300mV 80%
                    status = statusByte === 0x01 ? 'active' : 'triggered';
                    voltage = buffer.readUInt16BE(1);
                    if (buffer.length >= 4) {
                        batteryPercent = buffer.readUInt8(3);
                    } else {
                        batteryPercent = voltageToBatteryPercent(voltage);

                    }
                }
            }

            // Extract Metadata
            const rssi = uplink.rx_metadata?.[0]?.rssi || 0;
            const snr = uplink.rx_metadata?.[0]?.snr || 0;
            const gatewayId = uplink.rx_metadata?.[0]?.gateway_ids?.gateway_id || 'unknown';
            const gatewayCount = uplink.rx_metadata?.length || 1;
            const fCnt = uplink.f_cnt || 0;
            const sf = uplink.settings?.data_rate?.lora?.spreading_factor || 0;

            normalizedData = {
                deviceId,
                type: 'LORAWAN',
                status: status, // Standardized key
                batteryPercent,
                rssi,
                snr,
                gatewayId,
                gatewayCount,
                fCnt,
                spreadingFactor: sf,
                batteryVoltage: voltage, // Ensure consistent property name (mV)
                lastVoltage: voltage / 1000, // Keep for backward compatibility if needed
                lastSeen: new Date()
            };

            // console.log(`MQTT: Normalized LoRaWAN Data for ${deviceId}:`, JSON.stringify(normalizedData, null, 2));
        }



        if (normalizedData && deviceId) {
            await updateCatchSensorData(deviceId, normalizedData, io);
        }
    } catch (err) {
        console.error('MQTT Handler Error:', err);
    }
};

const updateCatchSensorData = async (deviceId, data, io) => {
    try {
        let catchSensor = await CatchSensor.findOne({
            where: data.type === 'NB-IOT' ? { imei: deviceId } : { deviceId: deviceId },
            include: data.type === 'LORAWAN' ? [{ model: LoraMetadata, as: 'lorawanCatchSensor' }] : []
        });

        console.log(`MQTT: Search result for ${deviceId}: ${catchSensor ? 'Found' : 'NOT FOUND'}`);

        if (!catchSensor) {
            console.log(`MQTT: 🆕 Auto-provisioning new device: ${deviceId}`);
            try {
                catchSensor = await CatchSensor.create({
                    name: `New Device ${deviceId}`,
                    alias: deviceId,
                    type: data.type,
                    deviceId: data.type === 'LORAWAN' ? deviceId : null,
                    imei: data.type === 'NB-IOT' ? deviceId : null,
                    status: data.status,
                    userId: null // Unbound
                });
                console.log(`MQTT: ✅ Created new catch sensor: ${catchSensor.id}`);
            } catch (createErr) {
                console.error('MQTT: Failed to auto-provision catch sensor:', createErr);
                return;
            }
        }

        // 1. Update Core Fields
        catchSensor.type = data.type;

        // Clear acknowledgment ONLY when a new trigger event arrives (transition from active -> triggered).
        // This prevents "flapping" or heartbeat messages from clearing the user's acknowledgment.
        if (data.status === 'triggered' && catchSensor.status === 'active') {
            catchSensor.alarmAcknowledgedAt = null;
            catchSensor.lastCatchAlert = null;
        }

        if (data.type === 'NB-IOT') {
            catchSensor.imei = deviceId;
            catchSensor.status = data.status || 'active';
            catchSensor.batteryVoltage = data.batteryVoltage;
            catchSensor.batteryPercent = data.batteryPercent;
            catchSensor.rssi = data.rssi;
            catchSensor.lastSeen = new Date();
            await catchSensor.save();
        } else {
            // LoRaWAN Unified
            catchSensor.deviceId = deviceId;
            catchSensor.status = data.status || 'active';
            catchSensor.batteryVoltage = data.batteryVoltage; // Already in mV from normalizedData
            catchSensor.batteryPercent = data.batteryPercent;
            catchSensor.lastSeen = data.lastSeen || new Date();

            await catchSensor.save();

            await LoraMetadata.upsert({
                catchSensorId: catchSensor.id,
                loraRssi: data.rssi,
                snr: data.snr,
                spreadingFactor: data.spreadingFactor,
                gatewayId: data.gatewayId,
                gatewayCount: data.gatewayCount || 1,
                fCnt: data.fCnt || 0
            });

            // 3. Refetch to get the updated metadata object
            catchSensor = await CatchSensor.findByPk(catchSensor.id, {
                include: [{ model: LoraMetadata, as: 'lorawanCatchSensor' }]
            });
        }


        await Reading.create({
            catchSensorId: catchSensor.id,
            value: data.batteryVoltage,
            type: data.status === 'triggered' ? 'alarm' : 'status',
            status: data.status,
            batteryPercent: data.batteryPercent,
            rssi: data.rssi,
            snr: data.snr,
            gatewayId: data.gatewayId,
            gatewayCount: data.gatewayCount,
            fCnt: data.fCnt,
            spreadingFactor: data.spreadingFactor
        });

        // 4. Send Notifications (Wait for these to update timestamps if needed)
        if (catchSensor.userId) {
            const user = await User.findByPk(catchSensor.userId);
            if (user) {
                const threshold = user.batteryThreshold || 20;

                if (catchSensor.status === 'triggered') {
                    await sendUnifiedNotification(user, catchSensor, 'ALARM');
                } else if (catchSensor.batteryPercent !== null && catchSensor.batteryPercent < threshold) {
                    await sendUnifiedNotification(user, catchSensor, 'LOW_BATTERY');
                }
            }
        }

        // 5. Emit Update to Clients (Now contains the new alert timestamps)
        const roomName = `user_${catchSensor.userId}`;
        io.to(roomName).emit('catchSensorUpdate', catchSensor);
        console.log(`MQTT: 📢 Emitted update for ${catchSensor.name} (${deviceId}). Status: ${catchSensor.status}, Batt: ${catchSensor.batteryPercent}%`);

    } catch (err) {
        console.error('updateCatchSensorData Error:', err);
    }
};


module.exports = { setupMQTT };
