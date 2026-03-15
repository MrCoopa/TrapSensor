const { Sequelize } = require('sequelize');
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
        logging: false
    }
);

async function check() {
    try {
        const [results] = await sequelize.query("SELECT id, name, imei, status, batteryPercent, rssi FROM CatchSensors");
        console.log('--- CatchSensors in DB ---');
        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

check();
