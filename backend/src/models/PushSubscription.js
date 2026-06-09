const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    endpoint: {
        type: DataTypes.STRING(512), // FCM tokens fit in 512 chars
        allowNull: false
        // unique: true is handled by the named index below
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['endpoint'],
            name: 'push_subs_endpoint_unique'
        }
    ]
});

module.exports = PushSubscription;

