require('dotenv').config();
const mongoose = require('mongoose');

async function checkAll() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = mongoose.connection.db.admin();

        console.log('--- DATABASES ---');
        const dbs = await admin.listDatabases();
        for (let d of dbs.databases) {
            console.log(`DB: ${d.name}`);
            const db = mongoose.connection.useDb(d.name).db;
            const collections = await db.listCollections().toArray();
            for (let c of collections) {
                const count = await db.collection(c.name).countDocuments();
                console.log(`  - Collection: ${c.name}, Count: ${count}`);
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkAll();
