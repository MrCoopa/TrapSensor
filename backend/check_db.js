const { Sequelize } = require('sequelize');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const sequelize = new Sequelize(
    'catchsensor', // Lowercase as per docker-compose
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'root',
    {
        host: '192.168.2.183',
        dialect: 'mysql',
        logging: false
    }
);

async function checkSchema() {
    try {
        await sequelize.authenticate();
        console.log('Database connection successful.');
        const [results] = await sequelize.query("DESCRIBE Users");
        console.log('Users table schema:');
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
