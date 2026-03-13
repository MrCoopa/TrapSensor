const crypto = require('crypto');
require('dotenv').config();

const BOOTSTRAP_KEY = process.env.BOOTSTRAP_KEY || 'BOOTSTRAP_MASTER_KEY_32_CHARS!!!';
const IMEI = 'TEST_IMEI_12345';
const PIN = 'A7X9';
const INDIVIDUAL_KEY = '0123456789ABCDEF0123456789ABCDEF';

async function verifyTOFU() {
    console.log('--- TOFU Verification Start ---');

    try {
        const keyBuf = Buffer.from(BOOTSTRAP_KEY);
        console.log(`   Internal Bootstrap Key Length: ${keyBuf.length} bytes`);
        if (keyBuf.length !== 32) throw new Error(`Bootstrap key must be 32 bytes, got ${keyBuf.length}`);

        // 1. Handshake Simulation
        console.log('1. Simulating Handshake...');
        const cipher = crypto.createCipheriv('aes-256-ecb', keyBuf, null);
        cipher.setAutoPadding(false);
        const encryptedKey = Buffer.concat([cipher.update(Buffer.from(INDIVIDUAL_KEY, 'hex')), cipher.final()]);
        
        console.log(`   Individual Key: ${INDIVIDUAL_KEY}`);
        console.log(`   Encrypted with Bootstrap: ${encryptedKey.toString('hex').toUpperCase()}`);

        const res1 = await fetch('http://127.0.0.1:5000/api/catches/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imei: IMEI,
                payload: encryptedKey.toString('hex')
            })
        });
        if (!res1.ok) throw new Error(`Handshake failed: ${res1.statusText}`);
        console.log('   Handshake message sent to broker.');

        // Wait a bit for backend processing
        await new Promise(r => setTimeout(r, 2000));

        // 2. Encrypted Data Simulation
        console.log('2. Simulating Encrypted Data with NEW key...');
        const data = Buffer.alloc(16);
        data.writeUInt8(0x01, 0); // Active
        data.writeUInt16BE(4150, 1); // 4.15V
        data.writeUInt8(65, 3); // RSSI 65
        data.writeUInt32BE(1, 4); // fCnt 1
        
        const cipher2 = crypto.createCipheriv('aes-256-ecb', Buffer.from(INDIVIDUAL_KEY, 'hex'), null);
        cipher2.setAutoPadding(false);
        const encryptedData = Buffer.concat([cipher2.update(data), cipher2.final()]);
        
        const res2 = await fetch('http://127.0.0.1:5000/api/catches/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imei: IMEI,
                payload: encryptedData.toString('hex')
            })
        });
        if (!res2.ok) throw new Error(`Data simulation failed: ${res2.statusText}`);
        console.log('   Data message sent with individual key.');

        console.log('--- Verification Done. Please check backend logs and database content. ---');
    } catch (err) {
        console.error('Verification Failed:', err.message);
    }
}

verifyTOFU();
