require('dotenv').config();
const mongoose = require('mongoose');
const { vectorSearch, generateAnswer } = require('./utils/rag');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('--- Debugging RAG Search ---');

        const query = "What is ASTU?";
        console.log(`Query: ${query}`);

        const results = await vectorSearch(query);
        console.log('Results length:', results.length);

        if (results.length === 0) {
            console.log('NO RESULTS FOUND.');
            // Let's check if the collection actually has documents
            const Chunk = require('./models/Chunk');
            const count = await Chunk.countDocuments();
            console.log('Total Chunks in DB:', count);

            const first = await Chunk.findOne();
            if (first) {
                console.log('First chunk text:', first.text.substring(0, 100));
                console.log('First chunk embedding length:', first.embedding.length);
            }
        } else {
            console.log('Results:', results);
            const stream = await generateAnswer(query, results);
            console.log('Response:');
            for await (const chunk of stream) {
                process.stdout.write(chunk.text());
            }
            console.log('\n--- End of response ---');
        }

        process.exit(0);
    } catch (e) {
        console.error('DEBUG ERROR:', e);
        process.exit(1);
    }
}

debug();
