const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const CatchShare = require('./CatchShare');

const CatchSensor = sequelize.define('CatchSensor', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    alias: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    type: {
        type: DataTypes.ENUM('NB-IOT', 'LORAWAN'),
        defaultValue: 'NB-IOT',
    },
    imei: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    deviceId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'triggered'),
        defaultValue: 'inactive',
    },
    batteryVoltage: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    batteryPercent: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    rssi: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    lastSeen: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    batteryThreshold: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    lastBatteryAlert: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    lastOfflineAlert: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    lastCatchAlert: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    alarmAcknowledgedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Set when user acknowledges an alarm. Cleared when a new trigger event arrives.'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    revierweltWebhookUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Optional Revierwelt Webhook URL'
    }
}, {
    tableName: 'CatchSensors',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['imei'] },
        { unique: true, fields: ['deviceId'] },
        { fields: ['userId'] },
        { fields: ['type'] },
        { fields: ['status'] }
    ]
});

CatchSensor.hasMany(CatchShare, { foreignKey: 'catchSensorId', onDelete: 'CASCADE' });
CatchShare.belongsTo(CatchSensor, { foreignKey: 'catchSensorId', onDelete: 'CASCADE' });

module.exports = CatchSensor;

