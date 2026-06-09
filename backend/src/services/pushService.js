const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const PushSubscription = require('../models/PushSubscription');

// Initialize Firebase Admin SDK
// Priority: 1. FIREBASE_SERVICE_ACCOUNT_B64 env var, 2. serviceAccountKey.json file
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
let firebaseInitialized = false;

try {
    let serviceAccount = null;

    // 1. Try env var first (preferred for Docker/Portainer)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
        console.log('Push Service: Firebase credentials loaded from env var. ✅');
    }
    // 2. Fallback to file (local dev)
    else if (fs.existsSync(serviceAccountPath) && fs.lstatSync(serviceAccountPath).isFile()) {
        serviceAccount = require(serviceAccountPath);
        console.log('Push Service: Firebase credentials loaded from file. ✅');
    }

    if (serviceAccount) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('Push Service: Firebase Admin SDK initialized successfully. ✅');
        firebaseInitialized = true;
    } else {
        console.warn('Push Service: ⚠️ No Firebase credentials found (env var or file). Native Push (FCM) will not work.');
    }
} catch (error) {
    console.error('Push Service: ❌ Error initializing Firebase Admin SDK:', error.message);
}

const sendNativeNotification = async (token, title, body, data = {}) => {
    if (!firebaseInitialized) {
        console.warn('Push Service: Skipping Native Push - Firebase not initialized.');
        return;
    }

    const message = {
        token: token,
        notification: {
            title: title,
            body: body
        },
        data: {
            // Capacitor Push plugin puts data in 'data' field
            ...data,
            landing_page: data.url || '/', // Custom data
            click_action: 'FCM_PLUGIN_ACTIVITY' // Required for some plugins
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'catch-channel', // Must match channel created in App
                icon: 'ic_stat_notification',
                color: '#1b3a2e',
                priority: 'max',
                defaultSound: true
            }
        }
    };

    try {
        console.log(`Push Service: Sending Native FCM to token: ${token.substring(0, 20)}...`);
        const response = await admin.messaging().send(message);
        console.log('Push Service: Native FCM sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Push Service: Error sending Native FCM:', error.message);
        if (error.code === 'messaging/registration-token-not-registered') {
            console.warn(`Push Service: Token expired/invalid — auto-deleting from DB: ${token.substring(0, 20)}...`);
            try {
                await PushSubscription.destroy({ where: { endpoint: token } });
                console.log('Push Service: Stale token removed from DB.');
            } catch (dbErr) {
                console.error('Push Service: Failed to remove stale token from DB:', dbErr.message);
            }
        }
        throw error;
    }
};

module.exports = { sendNativeNotification };

