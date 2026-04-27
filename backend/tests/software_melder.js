const crypto = require('crypto');
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
const envPath = fs.existsSync(path.resolve(process.cwd(), '.env')) 
    ? path.resolve(process.cwd(), '.env')
    : path.resolve(__dirname, '../../.env');

require('dotenv').config({ path: envPath });

const MASTER_SALT = process.env.MASTER_SALT || '';
const DEFAULT_HOST = process.env.DB_HOST || '127.0.0.1';
const MQTT_PORT = process.argv[6] || 1884; // Allow custom port as 7th argument (indexed after existing ones)
const BROKER_URL = process.env.MQTT_BROKER_URL || `mqtt://${DEFAULT_HOST}:${MQTT_PORT}`;
const MQTT_USER = process.env.INTERNAL_MQTT_USER;
const MQTT_PASS = process.env.INTERNAL_MQTT_PASS;
const ANONYMIZE = process.env.MQTT_ANONYMIZE_TOPICS === 'true';

/**
 * Anonymizes an identifier using a hash.
 */
function anonymizeId(id) {
    if (!MASTER_SALT) return id;
    return crypto.createHash('sha256').update(id + MASTER_SALT).digest('hex').substring(0, 16).toUpperCase();
}

/**
 * Derives a 32-byte AES-256 key from an IMEI and the MASTER_SALT.
 */
function deriveKey(imei) {
    if (!MASTER_SALT) return null;
    return crypto.createHash('sha256').update(imei + MASTER_SALT).digest();
}

// Configuration from CLI
const args = process.argv.slice(2);
const imei = args[0] || 'SIM_IMEI_123456';
const status = args[1] === 'triggered' ? 0x00 : 0x01; // 0x01 = active, 0x00 = triggered
const voltage = parseInt(args[2]) || 4150; // mV
const rsrp = parseInt(args[3]) || 65;

const fCntFile = path.resolve(__dirname, `melder_${imei}.fCnt`);

async function runMelder() {
    console.log(`\n🚀 Software Melder Simulator (Master Salt Mode) [IMEI: ${imei}]`);
    console.log(`📍 Broker: ${BROKER_URL}`);

    if (!MASTER_SALT) {
        console.error('❌ Error: MASTER_SALT must be set in .env');
        process.exit(1);
    }

    const client = mqtt.connect(BROKER_URL, {
        clientId: `melder_${imei}`,
        clean: true,
        username: MQTT_USER,
        password: MQTT_PASS
    });

    client.on('connect', async () => {
        console.log('✅ Connected to MQTT Broker');

        // Derive key algorithmically
        const individualKey = deriveKey(imei);
        console.log('🔐 Derived individual key for this session (No handshake needed)');

        // 2. Data Reporting Flow
        console.log(`\n📊 Preparing Data Report [Status: ${status === 0 ? 'TRIGGERED' : 'ACTIVE'}, Volt: ${voltage}mV, RSRP: ${rsrp}]`);

        let fCnt = 0;
        if (fs.existsSync(fCntFile)) {
            fCnt = parseInt(fs.readFileSync(fCntFile, 'utf8'));
        }
        fCnt++;
        fs.writeFileSync(fCntFile, fCnt.toString());

        const data = Buffer.alloc(16);
        data.writeUInt8(status, 0);
        data.writeUInt16BE(voltage, 1);
        data.writeUInt8(rsrp, 3);
        data.writeUInt32BE(fCnt, 4);

        const cipher = crypto.createCipheriv('aes-256-ecb', individualKey, null);
        cipher.setAutoPadding(false);
        const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);

        const topicIdentifier = ANONYMIZE ? anonymizeId(imei) : imei;
        const dataTopic = `catches/${topicIdentifier}/data`;
        const dataPayload = encryptedData.toString('hex').toUpperCase();

        if (ANONYMIZE) {
            console.log(`🕵️‍♂️ Topic Anonymization ACTIVE [Topic identifier: ${topicIdentifier}]`);
        }

        console.log(`📤 Publishing Encrypted Data to ${dataTopic} (length: ${dataPayload.length})...`);
        client.publish(dataTopic, dataPayload, { qos: 1 }, (err) => {
            if (err) console.error('❌ MQTT Publish failed:', err);
            else console.log('🚀 Message sent successfully!');
            
            client.end();
            console.log('👋 Simulator finished.\n');
        });
    });

    client.on('error', (err) => {
        console.error('❌ MQTT Error:', err);
        process.exit(1);
    });
}

runMelder();
