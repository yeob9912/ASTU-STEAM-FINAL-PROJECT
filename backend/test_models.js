require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
    console.log('Testing models...');
    const models = ['text-embedding-004', 'gemini-embedding-001'];
    for (const m of models) {
        try {
            console.log(`Checking ${m}...`);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.embedContent({
                content: { parts: [{ text: "test" }] },
                outputDimensionality: 3072
            });
            console.log(`  ${m} with 3072: SUCCESS (${result.embedding.values.length} dims)`);
        } catch (e) {
            console.log(`  ${m} with 3072: FAILED (${e.message})`);
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.embedContent("test");
                console.log(`  ${m} default: SUCCESS (${result.embedding.values.length} dims)`);
            } catch (e2) {
                console.log(`  ${m} default: FAILED (${e2.message})`);
            }
        }
    }
}
test();
