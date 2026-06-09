const crypto = require('crypto');

/**
 * Decrypts a CatchSensor NB-IoT payload
 * @param {Buffer|string} payload - The received MQTT payload (Hex string or Buffer)
 * @param {string} secretKey - The 16-character AES key from config.h
 * @returns {object|null} - Decrypted data or null if failed
 */
function decryptCatchSensorPayload(payload, secretKey) {
    try {
        // 1. Ensure we have a 16-byte Buffer
        let encryptedBuffer;
        if (typeof payload === 'string') {
            encryptedBuffer = Buffer.from(payload, 'hex');
        } else {
            // If it's a buffer of hex ASCII chars, convert it
            const hexStr = payload.toString();
            if (hexStr.length === 32) {
                encryptedBuffer = Buffer.from(hexStr, 'hex');
            } else {
                encryptedBuffer = payload;
            }
        }

        if (encryptedBuffer.length !== 16) {
            console.error('Invalid encrypted payload length:', encryptedBuffer.length);
            return null;
        }

        // 2. Decrypt using AES-256-ECB (Key must be 32 bytes)
        const decipher = crypto.createDecipheriv('aes-256-ecb', Buffer.from(secretKey), null);
        decipher.setAutoPadding(false); // We handle padding manually (zero-padding)

        let decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);

        // 3. Parse our 4-byte original format
        // [0] Status, [1-2] Voltage (mV), [3] RSSI
        return {
            statusByte: decrypted.readUInt8(0),
            voltageMv: decrypted.readUInt16BE(1),
            rssiAbs: decrypted.readUInt8(3),
            status: decrypted.readUInt8(0) === 0x01 ? 'active' : 'triggered'
        };
    } catch (err) {
        console.error('Decryption failed:', err.message);
        return null;
    }
}

// --- Beispiel-Aufruf ---
const MY_SECRET_KEY = "CATCHSENSOR_KEY1"; // Muss mit config.h übereinstimmen
const RECEIVED_HEX = "B5A1...32_ZEICHEN_HEX..."; // Beispiel-Wert vom MQTT

const result = decryptCatchSensorPayload(RECEIVED_HEX, MY_SECRET_KEY);
if (result) {
    console.log('Erfolgreich entschlüsselt:', result);
    // { statusByte: 1, voltageMv: 4150, rssiAbs: 65, status: 'active' }
}
