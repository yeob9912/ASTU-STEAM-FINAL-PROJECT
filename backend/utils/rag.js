import { GoogleGenAI } from "@google/genai";
import Chunk from '../models/Chunk.js';

// Initialize Gemini with the new @google/genai SDK (forcing stable v1 API version)
const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
        apiVersion: "v1"
    }
});

const embedText = async (text, isAddingData = false) => {
    console.log(`Embedding text (isAddingData: ${isAddingData})...`);
    try {
        const textArray = Array.isArray(text) ? text : [text];
        const response = await ai.models.embedContent({
            model: "gemini-embedding-001",
            contents: textArray,
        });

        // The response contains an array of embeddings
        const embeddings = response.embeddings.map(e => e.values);
        console.log(`Embedding generation successful. Processed ${embeddings.length} chunks.`);
        return Array.isArray(text) ? embeddings : embeddings[0];
    } catch (error) {
        console.error("❌ Embedding error:", error.message);
        throw error;
    }
};

// Custom lightweight text splitter to replace broken langchain dependency
const chunkText = async (text) => {
    const chunkSize = 1000;
    const chunkOverlap = 200;

    let chunks = [];
    let position = 0;

    while (position < text.length) {
        let end = position + chunkSize;
        if (end > text.length) end = text.length;

        // Try to find a natural break point (paragraph or sentence)
        if (end < text.length) {
            const lastNewline = text.lastIndexOf('\n', end);
            if (lastNewline > position + (chunkSize / 2)) {
                end = lastNewline + 1;
            } else {
                const lastPeriod = text.lastIndexOf('. ', end);
                if (lastPeriod > position + (chunkSize / 2)) {
                    end = lastPeriod + 2;
                }
            }
        }

        const chunk = text.slice(position, end).trim();
        if (chunk) chunks.push(chunk);

        position = end - chunkOverlap;
        if (position >= text.length || end === text.length) break;
        if (position < 0) position = 0;
    }

    return chunks;
};

const vectorSearch = async (queryText, limit = 5) => {
    console.log(`\n=== VECTOR SEARCH START ===`);
    console.log(`Query: "${queryText}"`);
    try {
        console.log(`Step 1: Generating query embedding...`);
        const queryVector = await embedText(queryText, false);
        console.log(`✅ Query embedding generated (${queryVector.length} dimensions)`);

        const agg = [
            {
                $vectorSearch: {
                    index: "compliant", // Match user's Atlas index name
                    path: "embedding",
                    queryVector: queryVector,
                    numCandidates: 200,
                    limit: limit,
                },
            },
            {
                $project: {
                    _id: 0,
                    text: 1,
                    score: { $meta: "vectorSearchScore" },
                },
            }
        ];

        console.log(`Step 2: Executing MongoDB vector search...`);
        const results = await Chunk.aggregate(agg);
        console.log(`✅ Vector Search complete! Found ${results.length} chunks.`);
        
        if (results.length > 0) {
            return results;
        }
        console.log(`⚠️ Vector Search returned 0 results. Falling back to regex keyword search...`);
    } catch (error) {
        console.error("❌ Vector Search failed:", error.message);
        console.log(`⚠️ Falling back to regex keyword search...`);
    }

    // Fallback: Perform a regex-based keyword search on the text field
    try {
        const words = queryText.split(/\s+/).filter(w => w.trim().length > 2);
        let queryObj = {};
        if (words.length > 0) {
            queryObj = { $or: words.map(word => ({ text: { $regex: word, $options: 'i' } })) };
        } else {
            queryObj = { text: { $regex: queryText, $options: 'i' } };
        }
        const fallbackResults = await Chunk.find(queryObj).limit(limit);
        console.log(`✅ Regex Fallback Search complete! Found ${fallbackResults.length} chunks.`);
        return fallbackResults.map(doc => ({ text: doc.text }));
    } catch (fallbackError) {
        console.error("❌ Regex Fallback Search failed:", fallbackError.message);
        return [];
    }
};

const generateAnswer = async (query, contextChunks) => {
    if (!contextChunks || contextChunks.length === 0) {
        return (async function* () {
            yield { text: "i have no such like information please use other source !." };
        })();
    }

    const context = contextChunks.map(c => c.text).join("\n\n");

    const prompt = `
You are a helpful AI Assistant. Your goal is to provide accurate and helpful information based STRICTLY on the provided KNOWLEDGE BASE DATA.

KNOWLEDGE BASE DATA:
---
${context}
---

USER QUESTION: ${query}

STRICT INSTRUCTIONS:
1. Use the provided KNOWLEDGE BASE DATA to answer the user's question as accurately as possible.
2. If the information is NOT present in the provided data, you MUST reply EXACTLY with "i have no such like information please use other source !." and nothing else.
3. CRITICAL: Your answer MUST be extremely concise. Answer in a MAXIMUM of 3 to 4 lines. NEVER exceed 4 lines. Give straight to the point answers.
4. DO NOT mention that you are using provided data, contexts, or a knowledge base. Talk naturally like a human assistant.
5. If the user's message is a general greeting, you can respond naturally in 1-2 lines.
`;

    try {
        const modelName = "gemini-2.5-flash";
        // Google Gen AI API returns 404 for gemini-2.5-flash.
        // We route it to gemini-3.5-flash internally to prevent 404 on the stable v1 endpoint.
        const activeModel = modelName === "gemini-2.5-flash" ? "gemini-3.5-flash" : modelName;

        const responseStream = await ai.models.generateContentStream({
            model: activeModel,
            contents: prompt,
        });
        return responseStream;
    } catch (err) {
        console.error("❌ Gemini Generation Error:", err.message);
        throw err;
    }
};

export { embedText, chunkText, vectorSearch, generateAnswer };
