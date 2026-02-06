import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MessageCircle, Mail, Calendar } from 'lucide-react';
import ChatView from './ChatView';
import EmailView from './EmailView';
import CalendarView from './CalendarView';

const tabs = [
  { id: 'chat', label: 'Live Chat', icon: MessageCircle },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'calendar', label: 'Book', icon: Calendar },
];

export default function SupportPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('chat');

  const handleSwitchToCalendar = () => {
    setActiveTab('calendar');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end p-4 md:p-6 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-[85vh] md:h-[700px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2D0A0A] to-[#4A1515] px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_69487d2cd5b55089ee0d9113/ede5f8e54_image.png"
                alt="MiKO"
                className="h-8 object-contain"
              />
              <div>
                <h2 className="text-white font-medium text-sm">MiKO Patient Support</h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/70 text-xs">AI-Assisted • 24/7</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-white/10 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-[#3D1010] shadow-lg'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <ChatView
              onBookClick={handleSwitchToCalendar}
              onSwitchToCalendar={handleSwitchToCalendar}
            />
          )}
          {activeTab === 'email' && <EmailView />}
          {activeTab === 'calendar' && <CalendarView />}
        </div>
      </motion.div>
    </motion.div>
  );
}
