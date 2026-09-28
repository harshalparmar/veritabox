import { useState, useRef, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Bot, User, Loader2, Zap, BrainCircuit, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "assistant" | "user";
  content: string;
  id: string;
}

interface OracleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: string; // The article title or content for context
}

export function OracleDrawer({ open, onOpenChange, context }: OracleDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: `Greetings, operative. I am the VeritaBox Oracle. I have indexed the tactical intel regarding "${context || "this sector"}". How can I assist your mission?`, 
      id: "1" 
    }
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: "user", content: input, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    // Placeholder for AI logic  -  in a real setup, this would call an LLM API
    setTimeout(() => {
      const assistantMsg: Message = { 
        role: "assistant", 
        content: `I've analyzed the mission parameters. Based on the documentation for "${context}", I recommend verifying the power supply rail stability before initiating the protocol. My telemetry suggests an 87% probability of success if these constraints are met.`, 
        id: (Date.now() + 1).toString() 
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);
    }, 1500);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l border-border shadow-2xl">
        <SheetHeader className="p-6 border-b border-border bg-card/30">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <BrainCircuit className="h-6 w-6" />
             </div>
             <div>
                <SheetTitle className="text-[16px] font-bold tracking-tight uppercase">AI Oracle v2.4</SheetTitle>
                <SheetDescription className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                   Neural Link: Active · Context: {context || "Global"}
                </SheetDescription>
             </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {messages.map((m) => (
              <div 
                key={m.id} 
                className={cn(
                  "flex gap-3 animate-fade-in-up",
                  m.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded flex items-center justify-center shrink-0 border",
                  m.role === "assistant" ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary border-border text-foreground"
                )}>
                  {m.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div className={cn(
                  "max-w-[85%] p-3 text-[13.5px] leading-relaxed",
                  m.role === "assistant" ? "bg-secondary/40 rounded-r-lg rounded-bl-lg" : "bg-primary text-primary-foreground rounded-l-lg rounded-br-lg"
                )}>
                  {m.content}
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex gap-3 animate-pulse">
                <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Terminal className="h-4 w-4" />
                </div>
                <div className="bg-secondary/40 rounded-r-lg rounded-bl-lg p-3 flex items-center gap-2">
                   <Loader2 className="h-3 w-3 animate-spin" />
                   <span className="text-[11px] font-mono uppercase tracking-widest">Oracle is thinking...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-border bg-card/10">
          <div className="relative">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask the Oracle..."
              className="pr-10 h-10 border-border bg-background"
            />
            <Button 
               onClick={handleSend}
               disabled={!input.trim() || isThinking}
               size="icon" 
               variant="ghost" 
               className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-primary hover:bg-primary/10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
             <button className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground border border-border p-2 rounded hover:bg-secondary transition-colors text-left flex items-center gap-2">
                <Zap className="h-3 w-3 text-warning" /> Summarize Intel
             </button>
             <button className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground border border-border p-2 rounded hover:bg-secondary transition-colors text-left flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary" /> Key Takeaways
             </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
