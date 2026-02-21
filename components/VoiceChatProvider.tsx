"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import VoiceChat from "./VoiceChat";

type VoiceChatContextType = {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
};

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

export function useVoiceChat() {
  const context = useContext(VoiceChatContext);
  if (!context) {
    throw new Error("useVoiceChat must be used within VoiceChatProvider");
  }
  return context;
}

export function VoiceChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const toggleChat = () => {
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <VoiceChatContext.Provider value={{ isOpen, openChat, closeChat, toggleChat }}>
      {children}
      {isOpen && (
        <VoiceChat
          onClose={closeChat}
          isMinimized={isMinimized}
          onToggleMinimize={toggleMinimize}
        />
      )}
    </VoiceChatContext.Provider>
  );
}
