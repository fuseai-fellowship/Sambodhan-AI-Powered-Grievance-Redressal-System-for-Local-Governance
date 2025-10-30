
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
      <div className="absolute bottom-6 right-6 w-full max-w-md rounded-2xl shadow-2xl bg-linear-to-br from-indigo-700 to-purple-800 border-2 border-indigo-400 animate-fade-in-up pointer-events-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-300 bg-indigo-800 rounded-t-2xl">
          <span className="text-lg font-semibold text-white">Sambodhan AI Chatbot</span>
          <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors p-1 rounded-full hover:bg-indigo-600" title="Close Chatbot" aria-label="Close Chatbot">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
  <div ref={chatRef} className="p-4 h-80 overflow-y-auto flex flex-col gap-2 bg-linear-to-br from-indigo-700 to-purple-800 rounded-b-2xl">
          <div className="flex flex-col gap-2 flex-1 justify-end">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  msg.sender === "bot"
                    ? "self-start bg-indigo-600 text-white px-4 py-2 rounded-2xl max-w-xs shadow"
                    : "self-end bg-white text-indigo-800 px-4 py-2 rounded-2xl max-w-xs shadow border border-indigo-200"
                }
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="self-start bg-indigo-500 text-white px-4 py-2 rounded-2xl max-w-xs shadow animate-pulse opacity-80">
                Sambodhan AI is typing...
              </div>
            )}
          </div>
          {error && <div className="text-red-200 text-xs mt-1">{error}</div>}
          <form
            className="flex gap-2 mt-2"
            onSubmit={handleSend}
          >
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 rounded-xl bg-indigo-100 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
              disabled={loading}
            />
            <button
              type="submit"
              className="bg-linear-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl font-semibold shadow hover:scale-105 transition-transform"
              title="Send"
              aria-label="Send"
              disabled={!input.trim() || loading}
            >{loading ? '...' : 'Send'}</button>
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
      <div className="min-h-screen bg-gray-50">
        {/* Main Content Only */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">
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
