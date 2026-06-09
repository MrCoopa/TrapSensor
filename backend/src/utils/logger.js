/**
 * Simple Logger Utility to capture console output for the Status Page.
 */
const logs = [];
const MAX_LOGS = 200;

function captureLog(type, args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg);
            } catch (e) {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');

    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    logs.push(logEntry);

    if (logs.length > MAX_LOGS) {
        logs.shift();
    }
}

// Intercept console methods
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
    captureLog('log', args);
    originalLog.apply(console, args);
};

console.info = (...args) => {
    captureLog('info', args);
    originalInfo.apply(console, args);
};

console.warn = (...args) => {
    captureLog('warn', args);
    originalWarn.apply(console, args);
};

console.error = (...args) => {
    captureLog('error', args);
    originalError.apply(console, args);
};

module.exports = {
    getLogs: () => [...logs]
};
