import Chat from '../models/Chat.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { vectorSearch, generateAnswer } from '../utils/rag.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// @desc   Get all chats for user
// @route  GET /api/chat
// @access Private
const getChatHistory = async (req, res) => {
    try {
        const chats = await Chat.find({ user: req.user._id || req.user.id }).sort({ updatedAt: -1 });
        res.json({ success: true, chats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Send message and get AI response (Streaming)
// @route  POST /api/chat
// @access Private
const sendMessage = async (req, res) => {
    try {
        const { message, chatId } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

        let chat;
        if (chatId) {
            chat = await Chat.findById(chatId);
        }

        if (!chat) {
            chat = new Chat({
                user: req.user._id || req.user.id,
                title: message.substring(0, 40) + (message.length > 40 ? '...' : ''),
                messages: []
            });
        }

        // Add user message
        chat.messages.push({ text: message, isBot: false });
        // Save the chat immediately to ensure we have a valid _id for the frontend
        await chat.save();

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Send the chatId immediately so the frontend can store it before the first text chunk
        res.write(`data: ${JSON.stringify({ chatId: chat._id })}\n\n`);

        const isGreeting = /\b(hello|hi|hey|greetings|morning|evening|how are you|who are you)\b/i.test(message.toLowerCase().trim());
        const isThankYou = /\b(thank you|thanks|thx|appreciate it)\b/i.test(message.toLowerCase().trim());

        let logMsg = `\n[${new Date().toISOString()}] User: ${message}\n`;
        let responseStream;

        if (isGreeting) {
            logMsg += `Greeting detected\n`;
            responseStream = (async function* () {
                yield { text: "Hello , what i can i help you ?" };
            })();
        } else if (isThankYou) {
            logMsg += `Thank you detected\n`;
            responseStream = (async function* () {
                yield { text: "No problem at all! I’m happy to assist whenever you need." };
            })();
        } else {
            logMsg += `Starting RAG search...\n`;
            const contextChunks = await vectorSearch(message);
            logMsg += `Found ${contextChunks.length} chunks\n`;
            responseStream = await generateAnswer(message, contextChunks);
        }
        
        try {
            fs.appendFileSync(path.join(__dirname, '../chat_debug.log'), logMsg);
        } catch (e) {
            console.error('Failed to write debug log:', e.message);
        }

        let fullBotResponse = "";

        for await (const chunk of responseStream) {
            // chunk.text is a property in the new @google/genai SDK
            const chunkText = chunk.text; 
            if (!chunkText) continue;
            
            fullBotResponse += chunkText;

            // To create an attractive typing effect, we stream character by character
            for (const char of chunkText) {
                res.write(`data: ${JSON.stringify({ text: char })}\n\n`);
                await new Promise(resolve => setTimeout(resolve, 15)); // 15ms per character delay
            }
        }

        // Add bot message to history
        chat.messages.push({ text: fullBotResponse, isBot: true });
        await chat.save();

        // Signal end of stream and include the final chatId for the frontend to store
        res.write(`data: ${JSON.stringify({ done: true, chatId: chat._id })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Chat error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
};

// @desc   Delete a chat session
// @route  DELETE /api/chat/:id
// @access Private
const deleteChat = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found' });
        }

        // Make sure user owns chat
        if (chat.user.toString() !== (req.user._id || req.user.id).toString()) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        await Chat.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Chat removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export { getChatHistory, sendMessage, deleteChat };
