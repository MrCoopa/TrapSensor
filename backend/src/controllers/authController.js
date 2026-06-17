const User = require('../models/User');
const CatchSensor = require('../models/CatchSensor');
const Reading = require('../models/Reading');
const PushSubscription = require('../models/PushSubscription');
const CatchShare = require('../models/CatchShare');
const sequelize = require('../config/database');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};

/**
 * Refresh Token
 * Called by the client shortly before the current token expires.
 * Requires a valid (not yet expired) token via the protect middleware.
 * Returns a fresh 30-day token so the user stays logged in indefinitely.
 */
const refreshToken = async (req, res) => {
    try {
        const newToken = generateToken(req.user.id);
        console.log(`Auth: 🔄 Token refreshed for user ${req.user.id}`);
        res.json({ token: newToken });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ message: 'Server error during token refresh' });
    }
};

const registerUser = async (req, res) => {
    const { email, name, password } = req.body;

    try {
        const userExists = await User.findOne({ where: { email } });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            email,
            name,
            password,
        });

        if (user) {
            res.status(201).json({
                id: user.id,
                email: user.email,
                name: user.name,
                token: generateToken(user.id),
            });
        }
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });

        if (user && (await user.comparePassword(password))) {
            res.json({
                id: user.id,
                email: user.email,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        console.log(`Password change attempt for user ID: ${req.user.id}`);
        const user = await User.findByPk(req.user.id);

        if (user && (await user.comparePassword(currentPassword))) {
            user.password = newPassword;
            await user.save();
            console.log('Password updated successfully');
            res.json({ message: 'Password updated successfully' });
        } else {
            console.log('Password change failed: Invalid current password');
            res.status(401).json({ message: 'Invalid current password' });
        }
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ message: 'Server error during password change' });
    }
};

const getMe = async (req, res) => {
    const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
    });
    if (user) {
        res.json(user.toJSON());
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const {
            pushoverAppKey,
            pushoverUserKey,
            pushEnabled,
            batteryThreshold,
            batteryAlertInterval,
            offlineAlertInterval,
            catchAlertInterval,
            pushoverEnabled,
            revierweltEnabled,
            dailyStatusEnabled,
            dailyStatusTime
        } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (pushoverAppKey !== undefined) user.pushoverAppKey = pushoverAppKey;
        if (pushoverUserKey !== undefined) user.pushoverUserKey = pushoverUserKey;
        if (pushEnabled !== undefined) user.pushEnabled = pushEnabled;
        if (batteryThreshold !== undefined) user.batteryThreshold = batteryThreshold;
        if (batteryAlertInterval !== undefined) user.batteryAlertInterval = batteryAlertInterval;
        if (offlineAlertInterval !== undefined) user.offlineAlertInterval = offlineAlertInterval;
        if (catchAlertInterval !== undefined) user.catchAlertInterval = catchAlertInterval;
        if (pushoverEnabled !== undefined) user.pushoverEnabled = pushoverEnabled;
        if (revierweltEnabled !== undefined) user.revierweltEnabled = revierweltEnabled;
        if (dailyStatusEnabled !== undefined) user.dailyStatusEnabled = dailyStatusEnabled;
        if (dailyStatusTime !== undefined) user.dailyStatusTime = dailyStatusTime;

        await user.save();
        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                pushoverAppKey: user.pushoverAppKey,
                pushoverUserKey: user.pushoverUserKey,
                pushEnabled: user.pushEnabled,
                batteryThreshold: user.batteryThreshold,
                batteryAlertInterval: user.batteryAlertInterval,
                offlineAlertInterval: user.offlineAlertInterval,
                catchAlertInterval: user.catchAlertInterval,
                pushoverEnabled: user.pushoverEnabled,
                revierweltEnabled: user.revierweltEnabled,
                dailyStatusEnabled: user.dailyStatusEnabled,
                dailyStatusTime: user.dailyStatusTime
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



const deleteUser = async (req, res) => {
    const userId = req.user.id;
    const transaction = await sequelize.transaction();

    try {
        console.log(`Auth: 🗑️ Deleting user ${userId} and all associated data...`);

        // 1. Delete PushSubscriptions
        await PushSubscription.destroy({ where: { userId }, transaction });

        // 2. Delete CatchShares (both where user is sharing, or shared with)
        await CatchShare.destroy({ where: { userId }, transaction });

        // 3. Find all CatchSensors owned by the user
        const sensors = await CatchSensor.findAll({ where: { userId } });
        const sensorIds = sensors.map(s => s.id);

        if (sensorIds.length > 0) {
            // Delete CatchShares associated with user's sensors
            await CatchShare.destroy({ where: { catchSensorId: sensorIds }, transaction });

            // Delete Readings associated with user's sensors
            await Reading.destroy({ where: { catchSensorId: sensorIds }, transaction });

            // Delete the CatchSensors themselves
            await CatchSensor.destroy({ where: { id: sensorIds }, transaction });
        }

        // 4. Finally, delete the User
        await User.destroy({ where: { id: userId }, transaction });

        await transaction.commit();
        console.log(`Auth: ✅ User ${userId} successfully deleted.`);
        res.json({ message: 'User account and all associated data successfully deleted.' });
    } catch (error) {
        await transaction.rollback();
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Server error during user deletion' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    changePassword,
    updateProfile,
    refreshToken,
    deleteUser,
};


