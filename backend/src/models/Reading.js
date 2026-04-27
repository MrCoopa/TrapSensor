const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const CatchSensor = require('./CatchSensor');

const Reading = sequelize.define('Reading', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    catchSensorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: CatchSensor,
            key: 'id',
        },
    },
    value: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    batteryPercent: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    rsrp: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    snr: { type: DataTypes.FLOAT, allowNull: true },
    gatewayId: { type: DataTypes.STRING, allowNull: true },
    gatewayCount: { type: DataTypes.INTEGER, allowNull: true },
    fCnt: { type: DataTypes.INTEGER, allowNull: true },
    spreadingFactor: { type: DataTypes.INTEGER, allowNull: true }
}, {
    timestamps: false,
    indexes: [
        {
            fields: ['catchSensorId']
        },
        {
            fields: ['timestamp']
        }
    ]
});

CatchSensor.hasMany(Reading, { foreignKey: 'catchSensorId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Reading.belongsTo(CatchSensor, { foreignKey: 'catchSensorId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

module.exports = Reading;

