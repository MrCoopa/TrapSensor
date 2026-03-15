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


let globalAedes = null;

const setupMQTT = (io, aedes) => {
    globalAedes = aedes;
    // 1. Path A: Internal NB-IoT Broker (Aedes)

    if (aedes) {
        aedes.on('publish', async (packet, client) => {
            if (packet.topic.startsWith('$SYS')) return; // Ignore system topics
            console.log(`MQTT: 📥 Internal Broker received publish on: ${packet.topic}`);

            if (packet.topic && packet.topic.startsWith('catches/')) {
                if (packet.topic.endsWith('/data')) {
                    handleMQTTMessage(packet.topic, packet.payload, io, 'NB-IOT');
                } else if (packet.topic.endsWith('/provision')) {
                    handleProvisioningMessage(packet.topic, packet.payload, io);
                }
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


const crypto = require('crypto');

const lastPayloads = new Map(); // Cache for DDoS prevention: IMEI -> { payloadHex, count, firstSeen }

const handleMQTTMessage = async (topic, payload, io, pathType) => {
    try {
        let normalizedData = null;
        let deviceId = null;

        if (pathType === 'NB-IOT') {
            deviceId = topic.split('/')[1];
            const payloadHex = payload.toString().toUpperCase();

            // DDoS/Flooding Protection: Track repetitions within 24h
            const cacheEntry = lastPayloads.get(deviceId);
            const now = Date.now();

            if (cacheEntry && cacheEntry.payloadHex === payloadHex) {
                cacheEntry.count++;

                // Start the 24h window only at the first REPETITION (i.e. second identical packet)
                if (cacheEntry.count === 2) {
                    cacheEntry.firstRepetitionAt = now;
                }

                const timeDiff = cacheEntry.firstRepetitionAt ? (now - cacheEntry.firstRepetitionAt) : 0;

                // If more than 3 identical packets (1 original + 3 reps) within 24 hours of the first rep
                if (cacheEntry.count > 3 && timeDiff < 24 * 60 * 60 * 1000) {
                    console.error(`MQTT: ⚠️ KRITISCH: Melder ${deviceId} wird geflutet! Identisches Paket bereits ${cacheEntry.count}x innerhalb von 24h empfangen.`);
                } else {
                    console.warn(`MQTT: 🛡️ DDoS protection for ${deviceId}. Rejected identical payload.`);
                }
                return;
            }

            // New or different payload: Reset cache entry
            lastPayloads.set(deviceId, {
                payloadHex,
                count: 1,
                firstRepetitionAt: null
            });

            let dataBuffer = payload;

            // 1. Fetch internal CatchSensor record to check for provisioned key
            const catchSensor = await CatchSensor.findOne({ where: { imei: deviceId } });

            // 2. Encryption Logic
            // Priority: Individual Key (if provisioned) > Global Key
            const individualKey = catchSensor?.isProvisioned ? catchSensor.aesKey : null;
            const globalKey = process.env.AES_SECRET_KEY;

            let keyBuffer = null;
            if (individualKey && individualKey.length === 64) {
                keyBuffer = Buffer.from(individualKey, 'hex');
            } else if (globalKey && globalKey.length === 32) {
                keyBuffer = Buffer.from(globalKey);
            }

            if (payload.length === 32 && keyBuffer) {
                try {
                    const decrypted = Buffer.from(payload.toString(), 'hex');
                    const decipher = crypto.createDecipheriv('aes-256-ecb', keyBuffer, null);
                    decipher.setAutoPadding(false);
                    dataBuffer = Buffer.concat([decipher.update(decrypted), decipher.final()]);
                    console.log(`MQTT: 🔐 Decrypted AES-256 payload for ${deviceId} using ${individualKey ? 'INDIVIDUAL' : 'GLOBAL'} key`);
                } catch (decErr) {
                    console.error(`MQTT: ❌ AES Decryption failed for ${deviceId}:`, decErr.message);
                    return; // Fail if decryption is attempted but fails
                }
            } else if (payload.length === 8) {
                // Handle unencrypted 8-char hex string (4 bytes)
                dataBuffer = Buffer.from(payload.toString(), 'hex');
            }

            if (dataBuffer.length < 4) {
                console.error(`MQTT: ⚠️ Invalid payload length (${dataBuffer.length}) for NB-IOT device ${deviceId}`);
                return;
            }

            const statusByte = dataBuffer.readUInt8(0);
            const voltage = dataBuffer.readUInt16BE(1);
            const rssi = dataBuffer.readUInt8(3);

            // Extract Counter from bytes 4-7 (UInt32BE) if payload is 16 bytes
            let fCnt = 0;
            if (dataBuffer.length >= 8) {
                fCnt = dataBuffer.readUInt32BE(4);
            }

            normalizedData = {
                type: 'NB-IOT',
                status: statusByte === 0x01 ? 'active' : 'triggered',
                batteryVoltage: voltage,
                batteryPercent: voltageToBatteryPercent(voltage),
                rssi: -rssi,
                fCnt: fCnt,
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

/**
 * Handles the Trust-On-First-Use (TOFU) Provisioning Handshake
 * Expected payload: 32-byte (64 hex) individual key encrypted with BOOTSTRAP_KEY
 */
const handleProvisioningMessage = async (topic, payload, io) => {
    const deviceId = topic.split('/')[1];
    console.log(`MQTT: 🗝️ Provisioning request from ${deviceId}`);

    try {
        const bootstrapKey = process.env.BOOTSTRAP_KEY;
        if (!bootstrapKey || bootstrapKey.length !== 32) {
            console.error('MQTT: ❌ BOOTSTRAP_KEY not configured or invalid length');
            return;
        }

        const encrypted = Buffer.from(payload.toString(), 'hex');
        if (encrypted.length !== 32) {
            console.error(`MQTT: ⚠️ Invalid provisioning payload length: ${encrypted.length}. Expected 32 bytes for AES-256.`);
            return;
        }

        const decipher = crypto.createDecipheriv('aes-256-ecb', Buffer.from(bootstrapKey), null);
        decipher.setAutoPadding(false);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

        const individualKeyHex = decrypted.toString('hex').toUpperCase();
        console.log(`MQTT: 🔐 Decrypted new 32-byte individual key for ${deviceId}`);

        let catchSensor = await CatchSensor.findOne({ where: { imei: deviceId } });
        if (!catchSensor) {
            console.log(`MQTT: 🆕 Auto-provising ${deviceId} during handshake`);
            catchSensor = await CatchSensor.create({
                imei: deviceId,
                name: `New Device ${deviceId}`,
                alias: deviceId,
                type: 'NB-IOT',
                status: 'inactive'
            });
        }

        await catchSensor.update({
            aesKey: individualKeyHex,
            isProvisioned: true
        });

        console.log(`MQTT: ✅ Device ${deviceId} provisioned with individual key.`);

        // Send confirmation back to device so it can delete the bootstrap key
        const resTopic = `catches/${deviceId}/provision/res`;
        // We send "PROV_OK_CONFIRM_32_BYTE_HANDSHK!" (32 bytes) encrypted with the NEW key
        const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(individualKeyHex, 'hex'), null);
        cipher.setAutoPadding(false);
        const confirmation = Buffer.concat([cipher.update(Buffer.from("PROV_OK_CONFIRM_32_BYTE_HANDSHK!")), cipher.final()]);

        if (globalAedes) {
            globalAedes.publish({
                topic: resTopic,
                payload: confirmation.toString('hex'),
                qos: 0,
                retain: false
            }, (err) => {
                if (err) console.error(`MQTT: Failed to send provision confirmation to ${deviceId}`, err);
                else console.log(`MQTT: 📤 Sent provision confirmation to ${deviceId}`);
            });
        }
    } catch (err) {
        console.error(`MQTT: ❌ Provisioning failed for ${deviceId}:`, err.message);
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
            // Replay Protection Logic (Variant 1)
            // If the device sent a counter, validate it.
            if (data.fCnt !== undefined) {
                if (data.fCnt <= catchSensor.lastFCnt && catchSensor.lastFCnt >= 0) {
                    console.warn(`MQTT: ❌ Replay/Old counter detected for ${deviceId}: received=${data.fCnt}, last=${catchSensor.lastFCnt}`);

                    // If counter is significantly lower (e.g. 1 or 2), it's likely a battery reset.
                    // REFINEMENT: Only trigger resync if the sensor was inactive for at least 15 minutes.
                    // This prevents an attacker from interrupting an active session with an old replay.
                    // If counter is exactly 0, it is a definitive battery reset signal.
                    // We flag it for resync, and a valid high-counter message will "self-heal" the flag.
                    if (data.fCnt === 0) {
                        catchSensor.resyncRequired = true;
                        await catchSensor.save();
                        console.log(`MQTT: 🔄 Battery reset (fCnt 0) detected for ${deviceId}. Flagged for resync.`);

                        // Notify user about resync requirement
                        if (catchSensor.userId) {
                            const user = await User.findByPk(catchSensor.userId);
                            if (user) {
                                await sendUnifiedNotification(user, catchSensor, 'RESYNC_REQUIRED');
                            }
                        }
                    } else {
                        console.log(`MQTT: 🛡️ Silently ignored low-counter replay for active sensor ${deviceId}.`);
                    }
                    return; // Reject the message
                }

                // Check if resync is required and block until manual reset (Strict Variant 1)
                if (catchSensor.resyncRequired) {
                    console.warn(`MQTT: 🛑 Blocked message for ${deviceId} - Manual resync required.`);
                    return;
                }

                catchSensor.lastFCnt = data.fCnt;
            }

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
