const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const sequelize = new Sequelize(
    'catchsensor',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'root',
    {
        host: '192.168.2.183',
        dialect: 'mysql',
        logging: console.log
    }
);

const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },
    pushoverAppKey: { type: DataTypes.STRING, allowNull: true },
    pushoverUserKey: { type: DataTypes.STRING, allowNull: true },
    pushEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    pushoverEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    revierweltEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    batteryThreshold: { type: DataTypes.INTEGER, defaultValue: 15 },
    batteryAlertInterval: { type: DataTypes.INTEGER, defaultValue: 8 },
    offlineAlertInterval: { type: DataTypes.INTEGER, defaultValue: 8 },
    catchAlertInterval: { type: DataTypes.INTEGER, defaultValue: 3 }
}, { tableName: 'Users' });

async function restore() {
    try {
        await sequelize.authenticate();
        console.log('Connected. Restoring schema...');
        await sequelize.sync({ alter: true });
        console.log('Restoration Complete.');
        process.exit(0);
    } catch (error) {
        console.error('Restoration failed:', error);
        process.exit(1);
    }
}

restore();
