require('dotenv').config();
const mongoose = require('mongoose');
const { embedText, vectorSearch, generateAnswer } = require('./utils/rag');
const Chunk = require('./models/Chunk');

async function testRAG() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected.");

        const testQuery = "What is ASTU?";
        console.log(`\nTesting RAG with query: "${testQuery}"`);

        // Test 1: Embedding
        console.log("\n--- Test 1: Embedding ---");
        const embedding = await embedText(testQuery);
        console.log(`Embedding length: ${embedding.length} (Expected: 3072)`);

        if (embedding.length !== 3072) {
            console.error("❌ ERROR: Embedding dimensions mismatch!");
        } else {
            console.log("✅ Embedding dimensions OK.");
        }

        // Test 2: Vector Search
        console.log("\n--- Test 2: Vector Search ---");
        const results = await vectorSearch(testQuery, 3);
        console.log(`Found ${results.length} chunks.`);
        results.forEach((r, i) => {
            console.log(`[${i + 1}] Score: ${r.score.toFixed(4)} | Text: ${r.text.substring(0, 100)}...`);
        });

        // Test 3: Generation
        if (results.length > 0) {
            console.log("\n--- Test 3: Generation ---");
            const stream = await generateAnswer(testQuery, results);
            process.stdout.write("Response: ");
            for await (const chunk of stream) {
                process.stdout.write(chunk.text());
            }
            console.log("\n\n✅ Generation complete.");
        } else {
            console.log("\nSkipping Test 3: No context results found to generate answer.");
        }

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected from MongoDB.");
    }
}

testRAG();
