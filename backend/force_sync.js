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
    revierweltEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
}, { tableName: 'Users' });

async function syncDb() {
    try {
        await sequelize.authenticate();
        console.log('Connected. Syncing...');
        await sequelize.sync({ alter: true });
        console.log('Done! Column should be added.');
        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

syncDb();
