import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, Minimize2, Sparkles, User, History, Search, ChevronRight, ChevronLeft, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGetChats, apiSendMessageStream, apiDeleteChat } from '../api';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [messages, setMessages] = useState([
        { text: 'Hi! I am the ASTU Smart Assistant. How can I help you with your campus issue today?', isBot: true }
    ]);
    const [input, setInput] = useState('');
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const currentChatIdRef = useRef(null); // <-- ADD REF to track latest ID synchronously
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        currentChatIdRef.current = currentChatId;
    }, [currentChatId]);

    // Typing indicator component
    const TypingIndicator = () => (
        <div style={{ display: 'flex', gap: '4px', padding: '12px 16px', background: 'white', borderRadius: '4px 18px 18px 18px', border: '1px solid #f1f5f9', width: 'fit-content' }}>
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
        </div>
    );

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isStreaming]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        const handleOpenChat = () => setIsOpen(true);
        window.addEventListener('resize', handleResize);
        window.addEventListener('open-astu-chatbot', handleOpenChat);

        if (isOpen) fetchHistory();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('open-astu-chatbot', handleOpenChat);
        };
    }, [isOpen]);

    const fetchHistory = async () => {
        try {
            const res = await apiGetChats();
            if (res.success) setChats(res.chats);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const handleDeleteChat = async (e, id) => {
        e.stopPropagation(); // prevent loading the chat when attempting to delete
        try {
            const res = await apiDeleteChat(id);
            if (res.success) {
                setChats(prev => prev.filter(c => c._id !== id));
                if (currentChatId === id) {
                    startNewChat();
                }
            }
        } catch (err) {
            console.error('Failed to delete chat:', err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setMessages(prev => [...prev, { text: userMsg, isBot: false }]);
        setInput('');
        setIsLoading(true);
        setIsStreaming(false);

        // ALWAYS USE LATEST ID
        const activeChatId = currentChatIdRef.current;

        // Optimistic UI for new chat history
        if (!activeChatId) {
            const tempTitle = userMsg.length > 25 ? userMsg.substring(0, 25) + '...' : userMsg;
            setChats(prev => [{ _id: 'temp-' + Date.now(), title: tempTitle, updatedAt: new Date().toISOString() }, ...prev]);
        }

        try {
            const response = await apiSendMessageStream({ message: userMsg, chatId: activeChatId });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let fullText = "";
            let firstChunk = true;
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Keep the last incomplete line in the buffer
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const dataString = line.substring(6).trim();
                            if (!dataString) continue;

                            const data = JSON.parse(dataString);

                            if (data.chatId && !data.done) {
                                if (currentChatIdRef.current !== data.chatId) {
                                    setCurrentChatId(data.chatId);
                                    currentChatIdRef.current = data.chatId; // Immediately update ref too
                                    fetchHistory(); // Fetch real history to replace temp one
                                }
                                continue;
                            }

                            if (data.error) {
                                throw new Error(data.error);
                            }

                            if (data.done) {
                                if (data.chatId) {
                                    setCurrentChatId(data.chatId);
                                    currentChatIdRef.current = data.chatId;
                                }
                                fetchHistory();
                                break;
                            }

                            if (data.text) {
                                if (firstChunk) {
                                    setIsLoading(false);
                                    setIsStreaming(true);
                                    setMessages(prev => [...prev, { text: "", isBot: true }]);
                                    firstChunk = false;
                                }

                                fullText += data.text;
                                setMessages(prev => {
                                    const last = prev[prev.length - 1];
                                    const rest = prev.slice(0, -1);
                                    return [...rest, { ...last, text: fullText }];
                                });
                            }
                        } catch (e) {
                            console.error("Error parsing block:", e, "Line:", line);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { text: "Connection error. Please check your internet and API key.", isBot: true }]);
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    const loadHistory = (chat) => {
        setMessages(chat.messages);
        setCurrentChatId(chat._id);
        setShowHistory(false);
        setTimeout(scrollToBottom, 100);
    };

    const startNewChat = () => {
        setMessages([{ text: 'Hi! I am the ASTU Smart Assistant. How can I help you today?', isBot: true }]);
        setCurrentChatId(null);
        currentChatIdRef.current = null;
        setShowHistory(false);
    };

    const hideScrollbar = { msOverflowStyle: 'none', scrollbarWidth: 'none', WebkitScrollbar: 'display: none' };

    return (
        <div className="chatbot-wrapper" style={{ zIndex: 9999 }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', display: 'flex', flexDirection: 'column', zIndex: 9999 }}>

                        <div style={{ background: 'white', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <button className="btn" style={{ padding: '0.6rem 0.8rem', borderRadius: '12px', background: showHistory ? 'var(--primary)' : 'white', color: showHistory ? 'white' : 'var(--text-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        onClick={() => setShowHistory(!showHistory)}>
                                        <History size={18} />
                                        {!isMobile && <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>History</span>}
                                    </button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div style={{ width: '32px', height: '32px', background: 'var(--primary)', color: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <Bot size={16} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>ASTU Assistant</h3>
                                            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>● Active</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={startNewChat} className="btn glass" style={{ fontSize: '0.85rem', padding: '0.6rem 1rem' }}>New Chat</button>
                                    <button onClick={() => setIsOpen(false)} className="btn" style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', fontWeight: 600, fontSize: '0.9rem' }}>Exit</button>
                                </div>
                            </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                            <AnimatePresence>
                                {showHistory && (
                                    <motion.div initial={{ x: -320, opacity: 0 }} animate={{ x: 0, opacity: 1, width: isMobile ? '100%' : 320 }} exit={{ x: -320, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                        style={{ position: isMobile ? 'absolute' : 'relative', top: 0, left: 0, height: '100%', background: 'white', borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
                                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>CONVERSATIONS</h4>
                                            {isMobile && <button onClick={() => setShowHistory(false)} style={{ border: 'none', background: 'none' }}><X size={20} /></button>}
                                        </div>
                                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', ...hideScrollbar }}>
                                            {chats.map(chat => (
                                                <div key={chat._id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f8fafc' }}>
                                                    <button onClick={() => loadHistory(chat)} style={{ flex: 1, padding: '1rem 0', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: currentChatId === chat._id ? 'var(--primary)' : 'var(--text-main)' }}>
                                                        <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>{chat.title}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(chat.updatedAt).toLocaleDateString()}</div>
                                                    </button>
                                                    <button onClick={(e) => handleDeleteChat(e, chat._id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.5rem' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.5rem', background: '#fafafa', ...hideScrollbar }}>
                                    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {messages.map((msg, i) => (
                                            <div key={i} style={{ alignSelf: msg.isBot ? 'flex-start' : 'flex-end', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: msg.isBot ? 'flex-start' : 'flex-end' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexDirection: msg.isBot ? 'row' : 'row-reverse' }}>
                                                    <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: msg.isBot ? '#eff6ff' : 'var(--primary)15', color: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                        {msg.isBot ? <Sparkles size={11} /> : <User size={11} />}
                                                    </div>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{msg.isBot ? 'AI' : 'You'}</span>
                                                </div>
                                                <div style={{ padding: '0.9rem 1.2rem', borderRadius: msg.isBot ? '4px 18px 18px 18px' : '18px 18px 4px 18px', background: msg.isBot ? 'white' : 'var(--primary)', color: msg.isBot ? 'var(--text-main)' : 'white', fontSize: '0.95rem', lineHeight: '1.6', border: msg.isBot ? '1px solid #f1f5f9' : 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', whiteSpace: 'pre-wrap' }}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: '#eff6ff', color: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Sparkles size={11} /></div>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>AI Thinking</span>
                                                </div>
                                                <TypingIndicator />
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>

                                <div style={{ padding: '1.5rem', background: 'white', borderTop: '1px solid #f1f5f9' }}>
                                    <form onSubmit={handleSend} style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '0.8rem' }}>
                                        <input placeholder="Ask about campus life..." value={input} onChange={e => setInput(e.target.value)} disabled={isLoading || isStreaming}
                                            style={{ flex: 1, background: '#f8fafc', padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none' }} />
                                        <button type="submit" disabled={isLoading || isStreaming || !input.trim()} style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', opacity: (isLoading || isStreaming || !input.trim()) ? 0.6 : 1 }}>
                                            <Send size={20} />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && (
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsOpen(true)}
                    style={{ position: 'fixed', bottom: '2rem', right: '2rem', width: '60px', height: '60px', borderRadius: '20px', background: 'var(--primary)', color: 'white', border: 'none', boxShadow: '0 10px 30px rgba(37, 99, 235, 0.4)', cursor: 'pointer', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <MessageCircle size={28} />
                </motion.button>
            )}
        </div>
    );
};

export default Chatbot;
