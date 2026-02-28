require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        console.log('--- DB INFO ---');
        console.log('Database Name:', db.databaseName);

        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        const chunks = db.collection('chunks');
        const count = await chunks.countDocuments();
        console.log('Chunks Count:', count);

        if (count > 0) {
            const sample = await chunks.findOne();
            console.log('Sample Text snippet:', sample.text.substring(0, 100));
            console.log('Sample Embedding Length:', sample.embedding.length);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
