const sequelize = require('./src/config/database');

async function repair() {
    console.log('--- Database Repair: PushSubscriptions ---');
    try {
        await sequelize.authenticate();
        console.log('✅ Connection established.');

        // Drop the table to clear the "Too many keys" (ER_TOO_MANY_KEYS) error
        // This is necessary because failed ALTER TABLE attempts in Sequelize sync()
        // can leave many orphaned shadow-keys in MySQL's metadata.
        await sequelize.query('DROP TABLE IF EXISTS `PushSubscriptions`;');
        console.log('✅ Table `PushSubscriptions` dropped. It will be recreated on next server start.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Repair failed:', err);
        process.exit(1);
    }
}

repair();
