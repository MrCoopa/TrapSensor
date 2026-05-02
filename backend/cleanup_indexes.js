const sequelize = require('./src/config/database');

async function cleanup() {
    try {
        console.log('--- PushSubscriptions Index Cleanup ---');
        
        // 1. Show all indexes
        const [results] = await sequelize.query('SHOW INDEX FROM PushSubscriptions');
        
        // 2. Identify redundant indexes (Sequelize often creates indexes named endpoint, endpoint_2, etc.)
        const indexesToDrop = results
            .filter(idx => idx.Key_name !== 'PRIMARY' && idx.Key_name !== 'push_subs_endpoint_unique')
            .map(idx => idx.Key_name);

        if (indexesToDrop.length === 0) {
            console.log('No redundant indexes found.');
            return;
        }

        console.log(`Found ${indexesToDrop.length} redundant indexes. Dropping...`);

        for (const indexName of indexesToDrop) {
            try {
                console.log(`Dropping index: ${indexName}`);
                await sequelize.query(`ALTER TABLE PushSubscriptions DROP INDEX \`${indexName}\``);
            } catch (err) {
                console.warn(`Failed to drop ${indexName}: ${err.message}`);
            }
        }

        console.log('Cleanup finished.');
    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        process.exit();
    }
}

cleanup();
