const crypto = require('crypto');

// 1. Simulator Side (software_melder.js)
const BOOTSTRAP_KEY = Buffer.from('v9F7k2M4pX8jL5rW3hT6bQ1cN0zY4sA1');
const individualKey = crypto.randomBytes(32);

const cipher1 = crypto.createCipheriv('aes-256-ecb', BOOTSTRAP_KEY, null);
cipher1.setAutoPadding(false);
const encryptedProv = Buffer.concat([cipher1.update(individualKey), cipher1.final()]);
const payloadProv = encryptedProv.toString('hex').toUpperCase();

// 2. Backend Provisioning (mqttService.js)
const decipherProv = crypto.createDecipheriv('aes-256-ecb', BOOTSTRAP_KEY, null);
decipherProv.setAutoPadding(false);
const decryptedProv = Buffer.concat([decipherProv.update(Buffer.from(payloadProv, 'hex')), decipherProv.final()]);
const individualKeyHex = decryptedProv.toString('hex').toUpperCase();

console.log('Original Individual Key (hex):', individualKey.toString('hex').toUpperCase());
console.log('Backend Derived DB Key (hex):  ', individualKeyHex);
console.log('Match?', individualKey.toString('hex').toUpperCase() === individualKeyHex);

// 3. Simulator Data Encryption
const data = Buffer.alloc(16);
data.writeUInt8(1, 0);       // Status = 1 (active)
data.writeUInt16BE(4000, 1); // Voltage = 4000
data.writeUInt8(70, 3);      // RSSI = 70
data.writeUInt32BE(123, 4);  // fCnt = 123

const cipherData = crypto.createCipheriv('aes-256-ecb', individualKey, null);
cipherData.setAutoPadding(false);
const encryptedData = Buffer.concat([cipherData.update(data), cipherData.final()]);
const payloadData = encryptedData.toString('hex').toUpperCase();

// 4. Backend Data Decryption
const backendKeyBuffer = Buffer.from(individualKeyHex, 'hex');

const decipherData = crypto.createDecipheriv('aes-256-ecb', backendKeyBuffer, null);
decipherData.setAutoPadding(false);
const decryptedData = Buffer.concat([decipherData.update(Buffer.from(payloadData, 'hex')), decipherData.final()]);

console.log('Status: ', decryptedData.readUInt8(0));
console.log('Volt:   ', decryptedData.readUInt16BE(1));
console.log('RSSI:   ', decryptedData.readUInt8(3));
console.log('fCnt:   ', decryptedData.readUInt32BE(4));
