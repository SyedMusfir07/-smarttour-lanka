'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib';

interface Message {
  id: number;
  text: string;
  translatedText?: string;
  from: 'user' | 'provider';
  time: string;
  originalLang?: string;
}

const quickReplies = ['👍 Great!', '📍 Share location', '⏰ Confirm time', '💲 Discuss pricing', '🔄 Reschedule'];

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Bonjour! Je suis disponible demain matin.',
      translatedText: 'Hello! I am available tomorrow morning.',
      from: 'provider',
      time: '9:14 AM',
      originalLang: 'French',
    },
    {
      id: 2,
      text: 'Perfect! Can we start at 8 AM in Sigiriya?',
      from: 'user',
      time: '9:15 AM',
    },
    {
      id: 3,
      text: 'Oui, parfait! Je serai là à 8h00.',
      translatedText: 'Yes, perfect! I will be there at 8:00.',
      from: 'provider',
      time: '9:16 AM',
      originalLang: 'French',
    },
    {
      id: 4,
      text: 'Great, I have 4 people in my group!',
      from: 'user',
      time: '9:16 AM',
    },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (!newMessage.trim()) return;
    setMessages([
      ...messages,
      {
        id: messages.length + 1,
        text: newMessage,
        from: 'user',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setNewMessage('');
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted">Please log in to use chat</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in -mx-4 px-0 flex flex-col h-[80vh]">
      {/* ── Chat Header ────────────────────────────────────────────── */}
      <div className="bg-primary text-white px-4 py-3 flex items-center gap-3 shadow-md">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-lg flex-shrink-0">
          🧭
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Ravi Bandara</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-ping" />
            <p className="text-[10px] opacity-80">Online · Responds instantly</p>
          </div>
        </div>
        <div className="text-[9px] bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap">
          🌍 Auto-translating EN ⇄ FR
        </div>
      </div>

      {/* ── Messages Area ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
        <p className="text-center text-[10px] text-muted bg-white/80 rounded-full px-3 py-1 w-fit mx-auto">Today · 9:14 AM</p>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${
              msg.from === 'user'
                ? 'bg-teal-50 rounded-[14px_4px_14px_14px]'
                : 'bg-green-50 rounded-[4px_14px_14px_14px]'
            } px-4 py-2.5 shadow-sm`}>
              <p className="text-sm text-ink">{msg.text}</p>
              {msg.translatedText && (
                <>
                  <div className="flex items-center gap-1 mt-1.5 text-[9px] text-muted bg-white/50 rounded-full px-2 py-0.5 w-fit">
                    <span>🌍 {msg.originalLang} → English · Translated</span>
                  </div>
                  <p className="text-xs text-muted italic mt-1 pl-1 border-l-2 border-gray-300">
                    &ldquo;{msg.translatedText}&rdquo;
                  </p>
                </>
              )}
              <p className={`text-[9px] text-muted mt-1 ${msg.from === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.time} {msg.from === 'user' && <span className="ml-0.5">✓✓</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Replies ──────────────────────────────────────────── */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-gray-100 bg-white">
        {quickReplies.map((reply, i) => (
          <button
            key={i}
            onClick={() => {
              setMessages([
                ...messages,
                {
                  id: messages.length + 1,
                  text: reply,
                  from: 'user',
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ]);
            }}
            className="whitespace-nowrap px-3 py-1.5 rounded-full border border-primary/40 text-primary text-[10px] font-medium hover:bg-primary-light hover:border-primary transition-all flex-shrink-0"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* ── Input Area ─────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message…"
            className="flex-1 px-4 py-2.5 rounded-full bg-pearl border border-gray-100 outline-none text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-all disabled:opacity-40 shadow-sm"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
