const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');
const CatchShare = require('./CatchShare');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        // Do NOT use unique: true here — it creates anonymous indexes that accumulate on every sync({ alter: true }).
        // Use a named index in the model options below instead.
        validate: {
            isEmail: true,
        },
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    password: {

        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user',
    },
    pushoverAppKey: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    pushoverUserKey: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    pushEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    pushoverEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    revierweltEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    batteryThreshold: {
        type: DataTypes.INTEGER,
        defaultValue: 15,
    },
    batteryAlertInterval: {
        type: DataTypes.INTEGER,
        defaultValue: 8, // hours between battery alerts
    },
    offlineAlertInterval: {
        type: DataTypes.INTEGER,
        defaultValue: 8, // hours between offline alerts
    },
    catchAlertInterval: {
        type: DataTypes.INTEGER,
        defaultValue: 3, // hours between triggered (catch) re-alerts
    },
    dailyStatusEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    dailyStatusTime: {
        type: DataTypes.STRING,
        defaultValue: '08:00',
    },
    lastDailyStatusSent: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['email'],
            name: 'users_email_unique'  // Named — Sequelize won't create duplicates
        }
    ],
    hooks: {
        beforeSave: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
    },
});

User.prototype.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

User.hasMany(CatchShare, { foreignKey: 'userId' });
CatchShare.belongsTo(User, { foreignKey: 'userId' });

module.exports = User;

