const express = require('express');
const CatchSensor = require('../models/CatchSensor');
const LoraMetadata = require('../models/LoraMetadata');
const CatchShare = require('../models/CatchShare');
const User = require('../models/User');
const { Op } = require('sequelize');
const router = express.Router();


// Get all catches for the logged-in user (owned + shared)
router.get('/', async (req, res) => {
    try {

        const sharedShares = await CatchShare.findAll({
            where: { userId: req.user.id },
            attributes: ['catchSensorId']
        });
        const sharedCatchIds = sharedShares.map(s => s.catchSensorId);

        const catches = await CatchSensor.findAll({
            where: {
                [Op.or]: [
                    { userId: req.user.id },
                    { id: { [Op.in]: sharedCatchIds } }
                ]
            },
            include: [{ model: LoraMetadata, as: 'lorawanCatchSensor' }]

        });

        res.json(catches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new catch assigned to the logged-in user
router.post('/', async (req, res) => {
    console.log('POST /api/catches - Body:', req.body);
    try {
        const { name, alias, location, imei, deviceId, type = 'NB-IOT', revierweltWebhookUrl, claimingPin } = req.body;
        const identifier = (type === 'LORAWAN' ? deviceId : imei);

        if (!name && !alias) return res.status(400).json({ error: 'Name/Alias ist erforderlich' });
        if (!identifier) return res.status(400).json({ error: `${type === 'LORAWAN' ? 'Device ID' : 'IMEI'} ist erforderlich` });
        if (type === 'NB-IOT' && !claimingPin) return res.status(400).json({ error: 'Claiming-PIN ist für NB-IOT erforderlich' });

        let existingCatch = await CatchSensor.findOne({
            where: {
                [type === 'LORAWAN' ? 'deviceId' : 'imei']: identifier
            }
        });

        if (existingCatch) {
            if (existingCatch.userId) {
                return res.status(400).json({ error: 'Diese Kennung (IMEI/DeviceID) ist bereits registriert und einem anderen Benutzer zugewiesen.' });
            }

            // For NB-IOT, verify the claiming PIN
            if (type === 'NB-IOT' && existingCatch.claimingPin !== claimingPin) {
                return res.status(401).json({ error: 'Ungültige Claiming-PIN für diesen Melder.' });
            }

            console.log(`Catch Claiming: User ${req.user.id} is claiming catch ${identifier}`);
            existingCatch.name = name || alias;
            existingCatch.alias = alias || name;
            existingCatch.location = location;
            existingCatch.revierweltWebhookUrl = revierweltWebhookUrl;
            existingCatch.userId = req.user.id;
            existingCatch.type = type;

            await existingCatch.save();
            return res.status(200).json(existingCatch);
        }

        const newCatch = await CatchSensor.create({
            name: name || alias,
            alias: alias || name,
            location,
            revierweltWebhookUrl,
            imei: type === 'NB-IOT' ? identifier : null,
            deviceId: type === 'LORAWAN' ? identifier : null,
            type,
            userId: req.user.id
        });
        res.status(201).json(newCatch);
    } catch (error) {
        console.error('Catch Creation Error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Diese Kennung ist bereits registriert.' });
        }
        res.status(500).json({ error: error.message });
    }
});


// Update catch status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const userId = req.user.id;
        const { Op } = require('sequelize');
        const CatchShare = require('../models/CatchShare');

        const catchSensor = await CatchSensor.findByPk(req.params.id);
        if (!catchSensor) return res.status(404).json({ error: 'Catch not found' });

        // Check ownership or share
        const share = await CatchShare.findOne({ where: { catchSensorId: req.params.id, userId } });
        if (catchSensor.userId !== userId && !share) {
            return res.status(403).json({ error: 'Access denied' });
        }

        catchSensor.status = status;
        await catchSensor.save();
        res.json(catchSensor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rename/Update catch (owner only)
router.patch('/:id', async (req, res) => {
    try {
        const { name, alias, location, revierweltWebhookUrl } = req.body;
        const catchSensor = await CatchSensor.findOne({ where: { id: req.params.id, userId: req.user.id } });

        if (!catchSensor) return res.status(404).json({ error: 'Falle nicht gefunden oder kein Zugriff' });

        if (name) catchSensor.name = name;
        if (alias) catchSensor.alias = alias;
        if (location !== undefined) catchSensor.location = location;
        if (revierweltWebhookUrl !== undefined) catchSensor.revierweltWebhookUrl = revierweltWebhookUrl;

        await catchSensor.save();

        if (req.io) {
            req.io.emit('catchSensorUpdate', catchSensor);
        }

        res.json(catchSensor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete or remove a catch
router.delete('/:id', async (req, res) => {
    try {
        console.log(`Attempting to delete/remove catch ${req.params.id} for user ${req.user.id}`);
        const userId = req.user.id;
        const catchSensorId = req.params.id;

        const catchSensor = await CatchSensor.findByPk(catchSensorId);
        if (!catchSensor) return res.status(404).json({ error: 'Falle nicht gefunden' });

        // 1. Case: User is Owner -> Full Delete
        if (catchSensor.userId === userId) {
            console.log(`User ${userId} is owner. Deleting catch ${catchSensorId} globally.`);
            await catchSensor.destroy();

            // Emit delete event
            if (req.io) {
                // Dashboard listens mostly for 'catchSensorUpdate', but we should emit delete too if handled, 
                // or just rely on 'catchSensorUpdate' with status if we had soft delete. 
                // Since Dashboard handles adding/updating via socket, let's emit a specialized delete event if needed, 
                // BUT current Dashboard only listens to 'catchSensorUpdate'. 
                // Ideally, we should add a listener for DELETE in Dashboard.
                // However, the user issue is specifically about RENAME not showing up.
                // Let's stick to just the rename fix first to be safe, or add a delete event listener in Dashboard later.
                // Actually, if we delete, we should tell clients.
                req.io.emit('catchSensorDelete', { id: catchSensorId });
            }

            return res.json({ message: 'Melder erfolgreich gelöscht' });
        }

        // 2. Case: User is NOT owner -> Remove share
        const CatchShare = require('../models/CatchShare');
        const share = await CatchShare.findOne({
            where: { catchSensorId, userId }
        });

        if (share) {
            console.log(`User ${userId} is NOT owner but has share. Deleting share for catch ${catchSensorId}.`);
            await share.destroy();
            return res.json({ message: 'Melder aus Ihrer Ansicht entfernt' });
        }

        return res.status(403).json({ error: 'Kein Zugriff auf diesen Melder' });
    } catch (error) {
        console.error('Error deleting/removing catch:', error);
        res.status(500).json({ error: error.message });
    }
});

// Acknowledge alarm — stops repeat notifications without changing sensor status
router.post('/:id/acknowledge', async (req, res) => {
    try {
        const catchSensor = await CatchSensor.findByPk(req.params.id);
        if (!catchSensor) return res.status(404).json({ error: 'Melder nicht gefunden' });

        const CatchShare = require('../models/CatchShare');
        const hasAccess = catchSensor.userId === req.user.id ||
            await CatchShare.findOne({ where: { catchSensorId: req.params.id, userId: req.user.id } });

        if (!hasAccess) return res.status(403).json({ error: 'Kein Zugriff' });

        // Reset both the acknowledgment marker AND the throttle timestamp,
        // so the next incoming trigger sends a push notification immediately.
        await catchSensor.update({
            alarmAcknowledgedAt: new Date(),
        });

        // Push the updated sensor state to the client immediately via Socket.IO,
        // so the UI shows 'Quittiert' even if the simulator keeps sending trigger packets.
        if (catchSensor.userId) {
            const updatedSensor = await catchSensor.reload();
            req.io.to(`user_${catchSensor.userId}`).emit('catchSensorUpdate', updatedSensor);
        }

        res.json({ message: 'Alarm quittiert. Nächster Alarm wird sofort gemeldet.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Resync counter (Variant 1) - Resets lastFCnt and clears resyncRequired flag
router.post('/:id/resync', async (req, res) => {
    try {
        const catchSensor = await CatchSensor.findByPk(req.params.id);
        if (!catchSensor) return res.status(404).json({ error: 'Melder nicht gefunden' });

        const CatchShare = require('../models/CatchShare');
        const hasAccess = catchSensor.userId === req.user.id ||
            await CatchShare.findOne({ where: { catchSensorId: req.params.id, userId: req.user.id } });

        if (!hasAccess) return res.status(403).json({ error: 'Kein Zugriff' });

        await catchSensor.update({
            lastFCnt: -1,
            resyncRequired: false
        });

        if (catchSensor.userId) {
            const updatedSensor = await catchSensor.reload();
            req.io.to(`user_${catchSensor.userId}`).emit('catchSensorUpdate', updatedSensor);
        }

        res.json({ message: 'Zähler erfolgreich zurückgesetzt. Gerät ist wieder einsatzbereit.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.post('/:id/share', async (req, res) => {
    try {
        const { email } = req.body;
        const catchSensorId = req.params.id;
        const User = require('../models/User');
        const CatchShare = require('../models/CatchShare');

        if (!email) return res.status(400).json({ error: 'E-Mail ist erforderlich' });

        const catchSensor = await CatchSensor.findOne({ where: { id: catchSensorId, userId: req.user.id } });
        if (!catchSensor) return res.status(404).json({ error: 'Falle nicht gefunden oder kein Zugriff (Nur Besitzer können teilen)' });

        const targetUser = await User.findOne({ where: { email } });
        if (!targetUser) return res.status(404).json({ error: 'Benutzer mit dieser E-Mail nicht gefunden' });

        if (targetUser.id === req.user.id) return res.status(400).json({ error: 'Sie können die Falle nicht mit sich selbst teilen' });

        await CatchShare.create({
            catchSensorId,
            userId: targetUser.id,
            permission: 'read'
        });

        res.status(201).json({ message: `Falle erfolgreich mit ${email} geteilt` });

    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Falle ist bereits mit diesem Benutzer geteilt' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Remove a share (Unshare)
router.delete('/:id/share/:userId', async (req, res) => {
    try {
        const catchSensorId = req.params.id;
        const targetUserId = req.params.userId;
        const CatchShare = require('../models/CatchShare');

        const catchSensor = await CatchSensor.findOne({ where: { id: catchSensorId, userId: req.user.id } });
        if (!catchSensor) return res.status(404).json({ error: 'Falle nicht gefunden oder kein Zugriff' });

        const deleted = await CatchShare.destroy({
            where: {
                catchSensorId,
                userId: targetUserId
            }
        });

        if (deleted) {
            res.json({ message: 'Freigabe aufgehoben' });
        } else {
            res.status(404).json({ error: 'Freigabe nicht gefunden' });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get users who have access to this catch
router.get('/:id/shares', async (req, res) => {
    try {
        const catchSensorId = req.params.id;
        const User = require('../models/User');
        const CatchShare = require('../models/CatchShare');

        const catchSensor = await CatchSensor.findOne({ where: { id: catchSensorId, userId: req.user.id } });
        if (!catchSensor) return res.status(403).json({ error: 'Nur der Besitzer kann Freigaben sehen' });

        const shares = await CatchShare.findAll({
            where: { catchSensorId },
            include: [{ model: User, attributes: ['id', 'email'] }]
        });

        res.json(shares.map(s => ({
            userId: s.User.id,
            email: s.User.email,
            permission: s.permission,
            createdAt: s.createdAt
        })));

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const mqtt = require('mqtt');

// Simulate MQTT data for a catch
router.post('/simulate', async (req, res) => {
    try {
        const { imei, status, batteryVoltage, rssi, jitter = true, payload: customPayload } = req.body;

        if (!imei) return res.status(400).json({ error: 'IMEI ist erforderlich' });

        let payload;
        if (customPayload) {
            // Use custom hex payload if provided (for testing encrypted packets)
            payload = Buffer.from(customPayload, 'hex');
        } else {
            // Default 4-byte unencrypted payload
            const statusCode = status === 'triggered' ? 0x00 : 0x01;
            let voltage = parseInt(batteryVoltage) || 4200;
            let rssiVal = Math.abs(parseInt(rssi)) || 60;

            if (jitter) {
                voltage += Math.floor(Math.random() * 21) - 10;
                rssiVal += Math.floor(Math.random() * 5) - 2;
            }

            payload = Buffer.alloc(4);
            payload.writeUInt8(statusCode, 0);
            payload.writeUInt16BE(voltage, 1);
            payload.writeUInt8(rssiVal, 3);
        }

        const topic = `catches/${imei}/data`;

        req.aedes.publish({
            topic,
            payload,
            qos: 0,
            retain: false
        }, (err) => {
            if (err) {
                console.error('Direct Simulate Error:', err);
                return res.status(500).json({ error: 'Simulation fehlgeschlagen' });
            }
            res.json({
                message: 'Simulation (Direct) gesendet',
                topic,
                data: customPayload ? { type: 'custom' } : { status, voltage, rssi: -rssi },
                payload: payload.toString('hex')
            });
        });

    } catch (error) {
        console.error('Simulate Route Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

