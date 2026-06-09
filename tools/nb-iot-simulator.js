#!/usr/bin/env node
/**
 * CatchSensor NB-IoT MQTT Simulator
 * ──────────────────────────────────
 * Sends NB-IoT sensor payloads to the embedded MQTT broker (port 1884).
 *
 * Payload format (4 bytes):
 *   [0]    Status   : 0x01 = active, 0x00 = triggered
 *   [1-2]  Voltage  : uint16 big-endian (mV), e.g. 4200 = 4.2V
 *   [3]    RSSI     : uint8 absolute value, e.g. 70 = -70 dBm
 *
 * Topic: catches/{imei}/data
 *
 * Usage (interactive):
 *   node nb-iot-simulator.js
 *   node nb-iot-simulator.js --host 192.168.1.100
 *
 * Usage (one-shot CLI):
 *   node nb-iot-simulator.js --host 192.168.1.100 --imei 123456789012345 --status triggered --voltage 3800 --rssi 65
 *
 * Options:
 *   --host     MQTT broker host  (default: localhost)
 *   --port     MQTT broker port  (default: 1884)
 *   --imei     Sensor IMEI
 *   --status   active | triggered  (default: active)
 *   --voltage  Battery voltage in mV  (default: 4200)
 *   --rssi     Signal strength absolute value  (default: 60)
 *   --repeat   Number of times to send  (default: 1)
 *   --interval Seconds between repeats  (default: 5)
 *   --jitter   Add random variation to voltage/rssi  (flag)
 *   --user     MQTT Username
 *   --pass     MQTT Password
 *   --version  MQTT Protocol version (4=3.1.1, 5=5.0) (default: 4)
 */

const mqtt = require('mqtt');
const readline = require('readline');

// ── Parse CLI args ──────────────────────────────────────────────────────────
const args = {};
process.argv.slice(2).forEach((val, i, arr) => {
    if (val.startsWith('--')) {
        const key = val.slice(2);
        const next = arr[i + 1];
        args[key] = (!next || next.startsWith('--')) ? true : next;
    }
});

let BROKER_PORT = parseInt(args.port || '1884');

// Host is either passed via --host, or prompted interactively
let BROKER_HOST = args.host || null;
let BROKER_USER = args.user || null;
let BROKER_PASS = args.pass || null;
let MQTT_VERSION = parseInt(args.version || '4');

// ── Helpers ─────────────────────────────────────────────────────────────────
const buildPayload = (status, voltageMv, rssiAbs) => {
    const buf = Buffer.alloc(4);
    buf.writeUInt8(status === 'triggered' ? 0x00 : 0x01, 0);
    buf.writeUInt16BE(Math.max(0, Math.min(65535, voltageMv)), 1);
    buf.writeUInt8(Math.max(0, Math.min(255, rssiAbs)), 3);
    return buf;
};

const jitter = (val, range) => val + Math.floor(Math.random() * range * 2 - range);

const batteryPercent = (mV) => Math.min(100, Math.max(0, Math.floor((mV - 3300) / 9)));

const colorize = (text, code) => `\x1b[${code}m${text}\x1b[0m`;
const red = (t) => colorize(t, '31');
const green = (t) => colorize(t, '32');
const yellow = (t) => colorize(t, '33');
const cyan = (t) => colorize(t, '36');
const bold = (t) => colorize(t, '1');
const dim = (t) => colorize(t, '2');

const printHeader = (details = null) => {
    console.clear();
    console.log(bold(cyan('\n  🦊 CatchSensor — NB-IoT MQTT Simulator')));
    if (details) {
        console.log(dim(`  Connecting to: ${details}\n`));
    } else {
        console.log(dim(`  Broker: [Enter details below]\n`));
    }
};

// ── Publish single message ───────────────────────────────────────────────────
const sendMessage = (client, imei, status, voltageMv, rssiAbs, useJitter = false) => {
    const v = useJitter ? jitter(voltageMv, 30) : voltageMv;
    const r = useJitter ? jitter(rssiAbs, 5) : rssiAbs;
    const payload = buildPayload(status, v, r);
    const topic = `catches/${imei}/data`;

    client.publish(topic, payload, { qos: 0 }, (err) => {
        if (err) {
            console.log(red(`  ✗ Publish failed: ${err.message}`));
        } else {
            const statusLabel = status === 'triggered' ? red('TRIGGERED') : green('ACTIVE');
            console.log(
                `  ${bold('→')} ${cyan(topic)}\n` +
                `     Status : ${statusLabel}\n` +
                `     Voltage: ${yellow(v + ' mV')}  (${batteryPercent(v)}%)\n` +
                `     RSSI   : -${r} dBm\n` +
                `     Payload: ${dim(payload.toString('hex'))}\n`
            );
        }
    });
};

// ── Connect to broker ────────────────────────────────────────────────────────
const connectToBroker = () => new Promise((resolve, reject) => {
    let url = BROKER_HOST || 'localhost';
    const hasProtocol = url.includes('://');
    const isWS = url.startsWith('ws://') || url.startsWith('wss://') || (!hasProtocol && BROKER_PORT === 1885);

    if (isWS && !hasProtocol) {
        url = `ws://${url}`;
    } else if (!hasProtocol) {
        url = `mqtt://${url}`;
    }

    // Correctly handle port: If it's not already in the URL, add it
    let connectionUrl = url;
    if (!url.includes(':', url.indexOf('://') + 3)) {
        connectionUrl = `${url}:${BROKER_PORT}`;
    }

    const isSecure = connectionUrl.startsWith('wss://') || connectionUrl.startsWith('mqtts://');
    const options = {
        username: BROKER_USER,
        password: BROKER_PASS,
        protocolVersion: MQTT_VERSION,
        connectTimeout: 15000,
        clientId: `catchsensor_sim_${Math.random().toString(16).slice(2, 8)}`,
        // Allow self-signed certificates (e.g. from Nginx Proxy Manager on local network)
        ...(isSecure && { rejectUnauthorized: false })
    };

    const client = mqtt.connect(connectionUrl, options);

    console.log(dim(`  [Protocol: MQTT ${MQTT_VERSION === 5 ? '5.0' : '3.1.1'}]`));
    console.log(dim(`  Attempting connection to ${connectionUrl}...`));

    const timeout = setTimeout(() => {
        client.end();
        reject(new Error(`Connection Timeout: Could not reach ${connectionUrl} within 30s.\n     Server IP reached, but handshake stalled.`));
    }, 30000);

    client.on('packetreceive', (packet) => {
        console.log(dim(`     [Packet In: ${packet.cmd}]`));
    });

    client.on('connect', () => {
        clearTimeout(timeout);
        console.log(green(`  ✓ Connected successfully to ${connectionUrl}\n`));
        resolve(client);
    });

    client.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`MQTT Error: ${err.message}`));
    });

    client.on('close', () => console.log(dim('     Connection closed.')));
    client.on('offline', () => console.log(dim('     Client went offline.')));
    client.on('reconnect', () => console.log(dim('     Retrying...')));
});

// ── One-shot CLI mode ────────────────────────────────────────────────────────
const runCLI = async () => {
    if (!args.imei) {
        console.error(red('  Error: --imei is required for CLI mode'));
        process.exit(1);
    }

    const status = args.status || 'active';
    const voltage = parseInt(args.voltage || '4200');
    const rssi = parseInt(args.rssi || '60');
    const repeat = parseInt(args.repeat || '1');
    const interval = parseFloat(args.interval || '5') * 1000;
    const useJitter = !!args.jitter;

    console.log(bold(cyan('\n  🦊 CatchSensor — NB-IoT MQTT Simulator (CLI mode)')));

    if (!BROKER_HOST) {
        console.error(red('  Error: --host is required. Example: --host 192.168.1.100'));
        process.exit(1);
    }

    let client;
    try {
        client = await connectToBroker();
    } catch (err) {
        console.error(red(`  ✗ ${err.message}`));
        process.exit(1);
    }

    let sent = 0;
    const send = () => {
        sendMessage(client, args.imei, status, voltage, rssi, useJitter);
        sent++;
        if (sent >= repeat) {
            setTimeout(() => { client.end(); process.exit(0); }, 500);
        } else {
            console.log(dim(`  Sending again in ${interval / 1000}s... (${sent}/${repeat})\n`));
            setTimeout(send, interval);
        }
    };
    send();
};

// ── Interactive mode ─────────────────────────────────────────────────────────
const prompt = (rl, question) => new Promise((resolve) => rl.question(question, resolve));

const runInteractive = async () => {
    printHeader();

    // Prompt for broker host and port if not supplied via --host / --port
    if (!BROKER_HOST) {
        const rl0 = readline.createInterface({ input: process.stdin, output: process.stdout });
        BROKER_HOST = await new Promise((resolve) =>
            rl0.question(`  Broker IP / Hostname: `, (a) => { rl0.close(); resolve(a.trim() || 'localhost'); })
        );
        const rl1 = readline.createInterface({ input: process.stdin, output: process.stdout });
        const portInput = await new Promise((resolve) =>
            rl1.question(`  Broker Port ${dim('[1884]')}: `, (a) => { rl1.close(); resolve(a.trim()); })
        );
        if (portInput) BROKER_PORT = parseInt(portInput);
        console.log('');

        // Optional auth
        const userIn = await new Promise(r => {
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            rl.question(`  Username ${dim('(optional)')}: `, a => { rl.close(); r(a.trim()); });
        });
        if (userIn) {
            BROKER_USER = userIn;
            BROKER_PASS = await new Promise(r => {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                rl.question(`  Password: `, a => { rl.close(); r(a.trim()); });
            });
        }
        console.log('');
    }

    let client;
    try {
        client = await connectToBroker();
    } catch (err) {
        console.error(red(`  ✗ ${err.message}`));
        console.log(dim('  Make sure the CatchSensor backend is running (check Port 1884/1885).\n'));
        process.exit(1);
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on('close', () => { client.end(); process.exit(0); });

    let lastImei = '';
    let lastStatus = 'triggered';
    let lastVoltage = 4100;
    let lastRssi = 65;

    // Main loop
    while (true) {
        console.log(bold('  ── Send NB-IoT Message ─────────────────────────────'));

        const imei = await prompt(rl,
            `  IMEI ${lastImei ? dim(`[${lastImei}]`) : ''}: `
        );
        const useImei = imei.trim() || lastImei;
        if (!useImei) { console.log(red('  IMEI required.\n')); continue; }
        lastImei = useImei;

        console.log(`  Status: ${green('1')} active  |  ${red('2')} triggered`);
        const statusInput = await prompt(rl, `  Choice ${dim('[' + (lastStatus === 'triggered' ? '2' : '1') + ']')}: `);
        const status = statusInput.trim() === '1' ? 'active' :
            statusInput.trim() === '2' ? 'triggered' :
                lastStatus;
        lastStatus = status;

        const voltageInput = await prompt(rl,
            `  Battery voltage mV ${dim(`[${lastVoltage}]`)}: `
        );
        const voltage = parseInt(voltageInput.trim()) || lastVoltage;
        lastVoltage = voltage;

        const rssiInput = await prompt(rl,
            `  RSSI absolute (e.g. 65 = -65 dBm) ${dim(`[${lastRssi}]`)}: `
        );
        const rssi = parseInt(rssiInput.trim()) || lastRssi;
        lastRssi = rssi;

        const jitterInput = await prompt(rl, `  Add jitter? ${dim('[y/N]')}: `);
        const useJitter = jitterInput.trim().toLowerCase() === 'y';

        console.log('');
        sendMessage(client, useImei, status, voltage, rssi, useJitter);

        const repeatInput = await prompt(rl, `  Send again? ${dim('[y/N]')}: `);
        if (repeatInput.trim().toLowerCase() !== 'y') {
            console.log(bold('\n  ──────────────────────────────────────────────────\n'));
        }
    }
};

// ── Entry point ──────────────────────────────────────────────────────────────
const hasCLIArgs = args.imei || args.status || args.voltage;
if (hasCLIArgs) {
    runCLI();
} else {
    runInteractive();
}
