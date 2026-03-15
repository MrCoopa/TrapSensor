const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize('catchsensor', process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'mariadb'
});

async function check() {
    try {
        const results = await sequelize.query("SELECT id, name, alias, imei, aesKey, isProvisioned FROM CatchSensors WHERE imei = '123456789'");
        console.log(JSON.stringify(results[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

check();
