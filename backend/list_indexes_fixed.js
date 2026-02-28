require('dotenv').config();
const mongoose = require('mongoose');

async function listIndexes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('chunk');

        console.log('Listing search indexes for collection "chunk"...');
        const indexes = await collection.listSearchIndexes().toArray();
        console.log(JSON.stringify(indexes, null, 2));

        process.exit(0);
    } catch (e) {
        console.error('FAILED TO LIST INDEXES:', e.message);
        process.exit(1);
    }
}
listIndexes();
