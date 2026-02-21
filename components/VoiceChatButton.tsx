"use client";

import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { useVoiceChat } from "./VoiceChatProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function VoiceChatButton() {
  const { toggleChat, isOpen } = useVoiceChat();

  if (isOpen) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleChat}
            className="fixed bottom-4 right-4 z-40 rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="icon"
          >
            <Mic className="w-6 h-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Voice Chat with AI</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
