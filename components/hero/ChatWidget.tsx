'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface ChatWidgetProps {
  onClick?: () => void;
}

export default function ChatWidget({ onClick }: ChatWidgetProps) {
  return (
    <motion.div 
      className="fixed bottom-6 right-6 z-20"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.8, type: 'spring' }}
    >
      <button 
        onClick={onClick}
        className="w-14 h-14 rounded-full backdrop-blur-xl bg-white/30 border border-white/30 flex items-center justify-center shadow-xl hover:bg-white/50 transition-all"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6 text-zinc-900" />
      </button>
    </motion.div>
  );
}
