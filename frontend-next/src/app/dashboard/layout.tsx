
'use client';
import React, { useState } from 'react';
import chatbotTriggerStyles from './ChatbotTrigger.module.css';
import apiClient from '@/lib/api-client';
// Simple Chatbot Modal Component
function ChatbotModal({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! How can I help you today?" }
  ]);
  const [context, setContext] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  React.useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message to backend
  const { user } = require('@/contexts/AuthContext').useAuth();
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setMessages(msgs => [...msgs, { sender: "user", text: input }]);
    setLoading(true);
    setError(null);
    const userMessage = input;
    setInput("");
    try {
      // Always send context with every message
      const payload: any = { message: userMessage, context };
      if (user) {
        payload.user_id = user.id;
        payload.user_name = user.name;
        payload.user_email = user.email;
        payload.user_phone = user.phone;
      }
      const res = await apiClient.post("/chatbot/message", payload);
      setMessages(msgs => [...msgs, { sender: "bot", text: res.data.reply }]);
      // Update context from bot reply if present
      if (res.data?.data?.context) {
        setContext(res.data.data.context);
      }
    } catch (err: any) {
      setMessages(msgs => [...msgs, { sender: "bot", text: "Sorry, I couldn't process your request. Please try again." }]);
      setError("Failed to get response from chatbot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Only the chatbot window is interactive, no overlay */}
      <div className="absolute bottom-6 right-6 w-full max-w-md rounded-2xl shadow-2xl bg-white border border-gray-200 animate-fade-in-up pointer-events-auto overflow-hidden">
        {/* Header with gradient */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#003C88] to-[#0052b3] border-b border-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold text-white block">Sambodhan AI</span>
              <span className="text-xs text-blue-100">Government Assistant</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10" 
            title="Close Chatbot" 
            aria-label="Close Chatbot"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chat Messages Area */}
        <div ref={chatRef} className="p-5 h-96 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
          <div className="flex flex-col gap-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={msg.sender === "bot" ? "flex items-start gap-2" : "flex items-start gap-2 justify-end"}
              >
                {msg.sender === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div
                  className={
                    msg.sender === "bot"
                      ? "bg-gradient-to-br from-blue-50 to-blue-100 text-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[85%] shadow-sm border border-blue-200"
                      : "bg-gradient-to-br from-[#003C88] to-[#0052b3] text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-md"
                  }
                >
                  <div className={msg.sender === "bot" ? "text-sm leading-relaxed whitespace-pre-wrap font-medium" : "text-sm leading-relaxed whitespace-pre-wrap"}>
                    {msg.text}
                  </div>
                </div>
                {msg.sender === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-sm text-gray-600 font-medium">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        {error && (
          <div className="px-5 py-2 bg-red-50 border-t border-red-200">
            <div className="text-red-700 text-xs flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}
        <div className="px-5 py-4 bg-white border-t border-gray-200">
          <form className="flex gap-3" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 rounded-xl bg-gray-50 text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
              disabled={loading}
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-[#003C88] to-[#0052b3] hover:from-[#002a66] hover:to-[#003c88] text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              title="Send"
              aria-label="Send"
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              <span>{loading ? 'Sending' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the 3D robot viewer to avoid SSR issues
const Robot3DViewer = dynamic(() => import('@/components/Robot3DViewer'), { ssr: false });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chatbotOpen, setChatbotOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 w-full">
        {/* Main Content - No padding wrapper, let children handle their own layout */}
        <main className="w-full">
          {children}
        </main>

        {/* Chatbot - Fixed bottom-left corner */}
        {!chatbotOpen && (
          <div className={chatbotTriggerStyles.chatbotTriggerExtremeBottomLeft}>
            <button
              className="transition-all duration-300 hover:scale-110 focus:outline-none border-0 bg-transparent p-0 m-0"
              title="Open Chatbot"
              aria-label="Open Chatbot"
              style={{ width: 84, height: 84, boxShadow: 'none', borderRadius: 0, background: 'none' }}
              onClick={() => setChatbotOpen(true)}
            >
              {/* 3D Robot AI Assistant Icon - no circle, fills area */}
              <div style={{ width: 140, height: 140, pointerEvents: 'none' }}>
                {/* Dynamically import Robot3DViewer as before */}
                {require('next/dynamic')(() => import('@/components/Robot3DViewer'), { ssr: false })({ width: 140, height: 140 })}
              </div>
            </button>
          </div>
        )}
        {chatbotOpen && <ChatbotModal onClose={() => setChatbotOpen(false)} />}
      </div>
    </ProtectedRoute>
  );
}
