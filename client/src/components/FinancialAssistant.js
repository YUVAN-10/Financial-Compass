import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { SparklesIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';

const FinancialAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hi! I can help you track expenses. Try saying "Added 500 for lunch" or "How much did I spend this month?"' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            // Create an axios instance with the auth header manually if the global interceptor isn't sufficient or to be safe
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };

            const response = await axios.post('/api/ai/chat', { message: userMessage }, config);

            // Add AI response
            if (response.data.success) {
                setMessages(prev => [...prev, { role: 'assistant', text: response.data.message }]);

                // Special handling for actions
                if (response.data.action === 'create') {
                    toast.success('Transaction added successfully!', {
                        icon: '✅',
                        style: {
                            borderRadius: '10px',
                            background: '#10B981',
                            color: '#fff',
                        },
                    });
                    // Optionally trigger a refresh of transactions/dashboard here if we had a global context for it
                }
            } else {
                setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I encountered an issue processing that." }]);
            }

        } catch (error) {
            console.error('AI Chat Error:', error);
            const errorMessage = error.response?.data?.message || "I'm having trouble connecting to the server right now.";
            setMessages(prev => [...prev, { role: 'assistant', text: errorMessage }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-4 rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 group"
                >
                    <SparklesIcon className="h-6 w-6 animate-pulse" />
                    <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Ask AI
                    </span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[500px] animate-slide-up origin-bottom-right">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="h-5 w-5" />
                            <h3 className="font-bold">Financial AI</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-4">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'bg-emerald-600 text-white rounded-br-none'
                                        : 'bg-white border border-emerald-100 shadow-sm text-gray-700 rounded-bl-none'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-emerald-100 shadow-sm p-3 rounded-2xl rounded-bl-none flex gap-1">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={sendMessage} className="p-4 bg-white border-t border-emerald-100">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Add expense or ask a question..."
                                className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm transition-all"
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed p-1.5 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                                <PaperAirplaneIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </form>

                </div>
            )}
        </>
    );
};

export default FinancialAssistant;
