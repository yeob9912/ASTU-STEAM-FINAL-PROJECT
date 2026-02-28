require('dotenv').config();
const mongoose = require('mongoose');

async function createIndex() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        const collection = db.collection('chunk');

        console.log('Creating search index "astu_smart" on collection "chunk"...');

        const indexDefinition = {
            name: "astu_smart",
            type: "vectorSearch",
            definition: {
                "fields": [
                    {
                        "numDimensions": 3072,
                        "path": "embedding",
                        "similarity": "cosine",
                        "type": "vector"
                    }
                ]
            }
        };

        const result = await collection.createSearchIndex(indexDefinition);
        console.log('Index creation initiated:', result);
        console.log('NOTE: It may take a few minutes for the index to become ACTIVE.');

        process.exit(0);
    } catch (e) {
        console.error('FAILED TO CREATE INDEX:', e.message);
        console.error('If this failed, you may need to create the index manually in the MongoDB Atlas UI.');
        console.error('Index Name: astu_smart');
        console.error('Definition:');
        console.error(JSON.stringify({
            "fields": [
                {
                    "numDimensions": 3072,
                    "path": "embedding",
                    "similarity": "cosine",
                    "type": "vector"
                }
            ]
        }, null, 2));
        process.exit(1);
    }
}
createIndex();
