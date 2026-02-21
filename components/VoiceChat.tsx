"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Volume2, VolumeX, X, Minimize2, Maximize2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type VoiceChatProps = {
  onClose?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
};

export default function VoiceChat({ onClose, isMinimized, onToggleMinimize }: VoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        if (continuousMode) {
          // Auto-send in continuous mode
          sendMessage(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Restart if in continuous mode and not currently loading
        if (continuousMode && !loading) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              console.error("Failed to restart recognition:", e);
            }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [continuousMode, loading]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start recognition:", error);
      }
    }
  };

  const toggleContinuousMode = () => {
    const newMode = !continuousMode;
    setContinuousMode(newMode);
    
    if (newMode && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start continuous mode:", error);
      }
    } else if (!newMode && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speak = (text: string) => {
    if (!synthRef.current || !autoSpeak) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Stop any ongoing speech
    stopSpeaking();

    try {
      const response = await fetch("/api/voice-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Speak the response
      if (autoSpeak) {
        speak(data.message);
      }
    } catch (error) {
      console.error("Voice chat error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggleMinimize}
          className="rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700"
        >
          <Mic className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          <h3 className="font-semibold">Voice AI Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMinimize}
            className="text-white hover:bg-white/20"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-3 border-b bg-gray-50 dark:bg-gray-900 flex gap-2 flex-wrap">
        <Button
          variant={isListening ? "default" : "outline"}
          size="sm"
          onClick={toggleListening}
          className={isListening ? "bg-red-600 hover:bg-red-700" : ""}
        >
          {isListening ? <MicOff className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
          {isListening ? "Stop" : "Push to Talk"}
        </Button>

        <Button
          variant={continuousMode ? "default" : "outline"}
          size="sm"
          onClick={toggleContinuousMode}
          className={continuousMode ? "bg-green-600 hover:bg-green-700" : ""}
        >
          Continuous
        </Button>

        <Button
          variant={autoSpeak ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoSpeak(!autoSpeak)}
        >
          {autoSpeak ? <Volume2 className="w-4 h-4 mr-1" /> : <VolumeX className="w-4 h-4 mr-1" />}
          {autoSpeak ? "On" : "Off"}
        </Button>

        {isSpeaking && (
          <Button variant="outline" size="sm" onClick={stopSpeaking}>
            Stop Speaking
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Voice AI Assistant</p>
            <p className="mt-2 text-sm">
              Click the microphone to start talking, or type your message below.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-100 dark:bg-blue-900 ml-auto max-w-[85%]"
                  : "bg-gray-100 dark:bg-gray-800 mr-auto max-w-[85%]"
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
              <div className="text-xs opacity-50 mt-1">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 mr-auto max-w-[85%]">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Type or speak your message..."
            className="flex-1 resize-none"
            rows={2}
            disabled={loading || continuousMode}
          />
          <Button
            onClick={() => void sendMessage()}
            disabled={loading || !input.trim() || continuousMode}
            className="self-end"
          >
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}
