const express = require('express');
const Reading = require('../models/Reading');
const CatchSensor = require('../models/CatchSensor');
const router = express.Router();

const CatchShare = require('../models/CatchShare');

// Get readings for a specific catch sensor
router.get('/:catchSensorId', async (req, res) => {
    try {
        const catchSensorId = req.params.catchSensorId;
        const userId = req.user.id;

        // Check if user is owner
        const catchSensor = await CatchSensor.findOne({ where: { id: catchSensorId, userId: userId } });

        if (!catchSensor) {
            // Check if user has shared access
            const share = await CatchShare.findOne({ where: { catchSensorId: catchSensorId, userId: userId } });
            if (!share) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const readings = await Reading.findAll({
            where: { catchSensorId: catchSensorId },
            order: [['timestamp', 'DESC']],
            limit: 50
        });
        res.json(readings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit a new reading
router.post('/', async (req, res) => {
    try {
        const { catchSensorId, value, type, batteryVoltage, batteryPercent, signalStrength, status } = req.body;

        // Check if catch sensor exists
        const catchSensor = await CatchSensor.findByPk(catchSensorId);
        if (!catchSensor) return res.status(404).json({ error: 'CatchSensor not found' });

        const newReading = await Reading.create({ catchSensorId, value, type });

        // Update catch sensor metrics
        const updates = { lastSeen: new Date() };
        if (batteryVoltage !== undefined) updates.batteryVoltage = batteryVoltage;
        if (batteryPercent !== undefined) updates.batteryPercent = batteryPercent;
        if (signalStrength !== undefined) updates.rsrp = signalStrength; // Mapping signalStrength to rsrp
        if (status !== undefined) updates.status = status;

        await catchSensor.update(updates);

        // Broadcast update via socket.io
        const updatedCatch = await CatchSensor.findByPk(catchSensorId);
        req.io.emit('CatchSensorUpdate', updatedCatch);

        res.status(201).json(newReading);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

