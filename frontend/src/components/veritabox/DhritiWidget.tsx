import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiApi } from "@/lib/api";
import { Loader2, Send, Bot, User, Trash2, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

export function DhritiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const location = useLocation();
  
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>(() => {
    const saved = localStorage.getItem('dhriti_global_chat');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { role: "assistant", content: "Hello! I'm Dhriti. Need help with what you're looking at?" }
    ];
  });
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('dhriti_global_chat', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, chatLoading, isOpen]);

  const handleSendChat = async () => {
    if (!chatMessage.trim() || chatLoading) return;
    const msg = chatMessage;
    setChatMessage("");
    
    // Inject contextual location
    const contextualMsg = "[Context: User is on page " + location.pathname + "] " + msg;
    
    setChatHistory((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await aiApi.chat(contextualMsg);
      setChatHistory((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (error) {
      setChatHistory((prev) => [...prev, { role: "assistant", content: "Error communicating with AI Core." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-background border border-border shadow-2xl rounded-2xl w-[380px] h-[600px] max-h-[80vh] flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30 backdrop-blur shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-none">Dhriti</h3>
                <span className="text-[10px] text-muted-foreground">Context-Aware</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setChatHistory([{ role: "assistant", content: "Hello! I'm Dhriti." }])}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={cn("flex gap-2 w-full", msg.role === 'user' && "flex-row-reverse")}>
                <div className="shrink-0">
                  {msg.role === 'assistant' ? (
                    <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center border border-primary/30">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center border border-border">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className={cn("text-sm px-3 py-2 rounded-xl max-w-[85%]", msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm")}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {chatLoading && (
              <div className="flex gap-2 w-full">
                <div className="shrink-0">
                  <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <div className="text-sm px-3 py-2 rounded-xl bg-muted rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" /> Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-muted/10 border-t border-border shrink-0">
            <div className="relative flex items-end bg-background border border-border rounded-xl focus-within:ring-1 focus-within:ring-primary">
              <Textarea 
                placeholder="Ask Dhriti..." 
                className="min-h-[44px] max-h-[120px] w-full resize-none bg-transparent border-0 focus-visible:ring-0 py-2.5 px-3 pr-10 text-sm"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <div className="absolute right-1.5 bottom-1.5">
                <Button onClick={handleSendChat} disabled={chatLoading || !chatMessage.trim()} size="icon" className="h-7 w-7 rounded-lg">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Button 
        onClick={() => setIsOpen(!isOpen)} 
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95 border border-primary/20",
          isOpen ? "bg-muted hover:bg-muted text-muted-foreground border-border" : "bg-primary hover:bg-primary/90 text-primary-foreground"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>
    </div>
  );
}
