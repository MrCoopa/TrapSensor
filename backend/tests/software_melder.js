const crypto = require('crypto');
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
const envPath = fs.existsSync(path.resolve(process.cwd(), '.env')) 
    ? path.resolve(process.cwd(), '.env')
    : path.resolve(__dirname, '../../.env');

require('dotenv').config({ path: envPath });

const BOOTSTRAP_KEY = process.env.BOOTSTRAP_KEY;
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1884'; // Default port 1884
const MQTT_USER = process.env.INTERNAL_MQTT_USER;
const MQTT_PASS = process.env.INTERNAL_MQTT_PASS;

// Configuration from CLI
const args = process.argv.slice(2);
const imei = args[0] || 'SIM_IMEI_123456';
const status = args[1] === 'triggered' ? 0x00 : 0x01; // 0x01 = active, 0x00 = triggered
const voltage = parseInt(args[2]) || 4150; // mV
const rssi = parseInt(args[3]) || 65;

const keyFile = path.resolve(process.cwd(), `melder_${imei}.key`);

async function runMelder() {
    console.log(`\n🚀 Software Melder Simulator [IMEI: ${imei}]`);
    console.log(`📍 Broker: ${BROKER_URL}`);

    if (!BOOTSTRAP_KEY || BOOTSTRAP_KEY.length !== 32) {
        console.error('❌ Error: BOOTSTRAP_KEY must be 32 characters in .env');
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

        let individualKey;

        // 1. Handshake Flow (only if not already provisioned)
        if (!fs.existsSync(keyFile)) {
            console.log('🔑 No key found. Starting TOFU Handshake...');
            
            // Generate individual 32-byte key
            individualKey = crypto.randomBytes(32);
            
            // Encrypt with bootstrap key
            const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(BOOTSTRAP_KEY), null);
            cipher.setAutoPadding(false);
            const encryptedKey = Buffer.concat([cipher.update(individualKey), cipher.final()]);

            const provTopic = `catches/${imei}/provision`;
            const payload = encryptedKey.toString('hex').toUpperCase();

            console.log(`📤 Publishing Handshake to ${provTopic}...`);
            client.publish(provTopic, payload, { qos: 1 });

            // Store key locally
            fs.writeFileSync(keyFile, individualKey.toString('hex'));
            fs.writeFileSync(keyFile + '.fCnt', '0');
            console.log(`💾 Individual Key stored in ${path.basename(keyFile)}`);
            
            // Small delay to allow backend to process
            await new Promise(r => setTimeout(r, 1000));
        } else {
            individualKey = Buffer.from(fs.readFileSync(keyFile, 'utf8'), 'hex');
            console.log('📖 Used existing individual key from local storage.');
        }

        // 2. Data Reporting Flow
        console.log(`\n📊 Preparing Data Report [Status: ${status === 0 ? 'TRIGGERED' : 'ACTIVE'}, Volt: ${voltage}mV, RSSI: ${rssi}]`);

        const fCnt = parseInt(fs.readFileSync(keyFile + '.fCnt', 'utf8')) + 1;
        fs.writeFileSync(keyFile + '.fCnt', fCnt.toString());

        const data = Buffer.alloc(16);
        data.writeUInt8(status, 0);
        data.writeUInt16BE(voltage, 1);
        data.writeUInt8(rssi, 3);
        data.writeUInt32BE(fCnt, 4);

        const cipher = crypto.createCipheriv('aes-256-ecb', individualKey, null);
        cipher.setAutoPadding(false);
        const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);

        const dataTopic = `catches/${imei}/data`;
        const dataPayload = encryptedData.toString('hex').toUpperCase();

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
