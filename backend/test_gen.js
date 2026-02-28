require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, { apiVersion: 'v1' });

async function testGen() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = "Hello, testing gemini 2.0 flash";
        const result = await model.generateContentStream(prompt);
        let text = "";
        for await (const chunk of result.stream) {
            text += chunk.text();
            console.log("Chunk:", chunk.text());
        }
        console.log("Total:", text);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

testGen();
