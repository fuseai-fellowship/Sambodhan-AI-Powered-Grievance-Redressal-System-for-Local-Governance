
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
      // Send to correct backend endpoint and include user info if available
      const payload: any = { message: userMessage };
      if (user) {
        payload.user_id = user.id;
        payload.user_name = user.name;
        payload.user_email = user.email;
        payload.user_phone = user.phone;
      }
      const res = await apiClient.post("/chatbot/message", payload);
      setMessages(msgs => [...msgs, { sender: "bot", text: res.data.reply }]);
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
  <div className="absolute bottom-6 left-6 w-full max-w-md rounded-2xl shadow-2xl bg-linear-to-br from-indigo-700 to-purple-800 border-2 border-indigo-400 animate-fade-in-up pointer-events-auto">
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
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Complaints', href: '/dashboard/complaints', icon: FileText },
    { name: 'File Complaint', href: '/dashboard/file-complaint', icon: PlusCircle },
    { name: 'Profile', href: '/dashboard/profile', icon: User },
  ];

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-linear-to-b from-indigo-700 to-indigo-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-6 bg-indigo-800 border-b border-indigo-600">
            <h1 className="text-xl font-bold text-white">Sambodhan</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-indigo-200"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-indigo-600">
            <div className="flex items-center space-x-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-indigo-200 truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-800 text-white'
                      : 'text-indigo-100 hover:bg-indigo-800 hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-indigo-600">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-indigo-100 rounded-lg hover:bg-indigo-800 hover:text-white transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:pl-64">
          {/* Top Bar */}
          <div className="sticky top-0 z-10 flex h-16 bg-white border-b border-gray-200 shadow-sm">
            <button
              type="button"
              className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1 flex justify-between items-center px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl font-semibold text-gray-800">
                {navigation.find((item) => item.href === pathname)?.name || 'Dashboard'}
              </h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Welcome, <span className="font-medium">{user?.name}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <main className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>

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
          <Robot3DViewer width={140} height={140} />
        </div>
      </button>
    </div>
  )}
  {chatbotOpen && <ChatbotModal onClose={() => setChatbotOpen(false)} />}
      </div>
    </ProtectedRoute>
  );
}
