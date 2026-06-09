const PushSubscription = require('../models/PushSubscription');
const { sendNativeNotification } = require('../services/pushService');

const sequelize = require('../config/database');

exports.subscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;
        const userId = req.user.id;

        if (!endpoint) {
            return res.status(400).json({ error: 'FCM token (endpoint) required' });
        }

        await PushSubscription.upsert({ endpoint, userId });

        res.status(201).json({ message: 'Subscription saved.' });
    } catch (error) {
        console.error('Subscribe Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;
        const userId = req.user.id;
        if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });

        // Only delete if it belongs to this user
        await PushSubscription.destroy({ where: { endpoint, userId } });
        res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
        console.error('Unsubscribe Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.clearAllSubscriptions = async (req, res) => {
    try {
        const userId = req.user.id;
        await PushSubscription.destroy({ where: { userId } });
        res.json({ message: 'Alle Benachrichtigungs-Abos gelöscht.' });
    } catch (error) {
        console.error('Clear Subscriptions Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.testNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const subscriptions = await PushSubscription.findAll({ where: { userId } });

        if (subscriptions.length === 0) {
            return res.status(200).json({
                message: 'Noch kein Gerät registriert. Bitte öffnen Sie die App einmal auf Ihrem Handy.',
                count: 0
            });
        }

        let sentCount = 0;
        for (const sub of subscriptions) {
            try {
                console.log(`Test Notification: Sending Native FCM to ${sub.endpoint.substring(0, 15)}...`);
                await sendNativeNotification(
                    sub.endpoint,
                    'CatchSensor: Test-Push',
                    'Diese Nachricht bestätigt, dass die Benachrichtigungen auf diesem Gerät korrekt konfiguriert sind. 🦊',
                    { type: 'TEST', url: '/setup' }
                );
                sentCount++;
            } catch (err) {
                console.error('Test Notification: Native Push failed:', err.message);
            }
        }

        res.json({ message: `Test-Push an ${sentCount} Gerät(e) gesendet.`, count: sentCount });

    } catch (error) {
        console.error('Test notification error:', error);
        res.status(500).json({ error: 'Failed to send test notification.' });
    }
};
