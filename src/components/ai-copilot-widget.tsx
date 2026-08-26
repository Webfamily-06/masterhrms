import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Bot,
  X,
  Send,
  Loader2,
  ChevronDown,
  FileText,
  HelpCircle,
  Maximize2,
  Minimize2,
  CornerDownLeft,
} from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export function AICopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      text: "**Hi there! I'm your Master ERP AI Assistant.**\n\nAsk me anything about company HR policies, leave quotas, double-entry accounting rules, GST invoicing, or ask me to draft announcements and job descriptions!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Fetch quick prompt templates
  const { data: quickTemplates = [] } = useQuery({
    queryKey: ["ai-quick-templates"],
    queryFn: async () => {
      try {
        const res = await api.get("/ai/quick-templates");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  async function handleSendMessage(promptText?: string) {
    const textToSend = promptText || inputPrompt;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsLoading(true);

    try {
      const res = await api.post("/ai/ask", { prompt: textToSend.trim() });
      const aiReply = res?.response || "I have processed your query. Let me know if you need further details.";

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      toast.error(err.message || "AI Assistant service unreachable");
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: "Sorry, I encountered an issue retrieving that answer. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-primary via-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300 border border-white/20"
        >
          <div className="size-6 rounded-full bg-white/20 grid place-items-center animate-pulse">
            <Sparkles className="size-3.5 text-amber-300" />
          </div>
          <span className="text-xs font-bold tracking-wide">AI Copilot</span>
          <span className="absolute -top-1 -right-1 size-3.5 bg-emerald-400 border-2 border-background rounded-full" />
        </button>
      )}

      {/* Interactive AI Chat Panel */}
      {isOpen && (
        <div
          className={`flex flex-col bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            isExpanded ? "w-[92vw] sm:w-[600px] h-[80vh]" : "w-[92vw] sm:w-[380px] h-[520px]"
          }`}
        >
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-primary/90 via-indigo-600/90 to-purple-600/90 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-white/20 grid place-items-center">
                <Bot className="size-4 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight flex items-center gap-1.5">
                  Master ERP Copilot
                  <Badge className="text-[9px] bg-emerald-400 text-slate-900 font-bold py-0 h-3.5">
                    ONLINE
                  </Badge>
                </h3>
                <p className="text-[10px] text-white/80">Enterprise AI Knowledge Base</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-white/80 hover:text-white hover:bg-white/20 rounded-lg"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-white/80 hover:text-white hover:bg-white/20 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-2 border-b bg-muted/40 overflow-x-auto flex items-center gap-1.5 scrollbar-none text-[11px]">
            <span className="text-[10px] font-bold text-muted-foreground shrink-0 uppercase px-1">
              Quick Prompts:
            </span>
            {quickTemplates.map((t: any) => (
              <button
                key={t.id}
                onClick={() => handleSendMessage(t.prompt)}
                className="px-2.5 py-1 rounded-full bg-background border hover:border-primary hover:text-primary transition-colors text-[10px] font-semibold shrink-0 shadow-2xs"
              >
                {t.title}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
            {messages.map((m) => {
              const isAi = m.sender === "ai";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isAi ? "items-start mr-auto max-w-[88%]" : "items-end ml-auto max-w-[85%]"}`}
                >
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-0.5 px-1">
                    <span className="font-semibold">{isAi ? "AI Copilot" : "You"}</span>
                    <span>• {m.timestamp}</span>
                  </div>
                  <div
                    className={`p-3 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                      isAi
                        ? "bg-secondary/70 text-foreground border rounded-tl-xs shadow-xs"
                        : "bg-primary text-primary-foreground rounded-tr-xs shadow-xs font-medium"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-2xl max-w-[80%] border">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">AI Copilot is drafting response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 border-t bg-card flex items-center gap-2">
            <Input
              placeholder="Ask about HR policies, accounting rules, GST..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              className="h-9 text-xs flex-1 bg-background"
            />
            <Button
              size="icon"
              disabled={isLoading || !inputPrompt.trim()}
              onClick={() => handleSendMessage()}
              className="size-9 bg-primary text-primary-foreground shrink-0 rounded-xl"
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
export default AICopilotWidget;
