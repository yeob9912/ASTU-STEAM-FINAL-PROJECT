require('dotenv').config();
const mongoose = require('mongoose');
const Chunk = require('./models/Chunk');

async function list() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const count = await Chunk.countDocuments();
        console.log('TOTAL CHUNKS IN DB:', count);

        const all = await Chunk.find().limit(50).select('text metadata');
        all.forEach((c, i) => {
            console.log(`[${i}] File: ${c.metadata?.fileName || 'Unknown'} | Snippet: ${c.text.substring(0, 80).replace(/\n/g, ' ')}...`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
list();
