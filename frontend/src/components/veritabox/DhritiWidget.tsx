import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiApi, roadmapApi, checklistApi, progressApi } from "@/lib/api";
import { Loader2, Send, User, Trash2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type DhritiPage = "dashboard" | "roadmaps" | "checklist" | "progress";

const ALLOWED_ROUTES: Record<string, DhritiPage> = {
  "/dashboard": "dashboard",
  "/roadmaps": "roadmaps",
  "/checklist": "checklist",
  "/progress": "progress",
};

const PAGE_GREETINGS: Record<DhritiPage, string> = {
  dashboard: "Welcome back! I can help you plan your day and stay on track.",
  roadmaps: "I see you're exploring your roadmap. Ask me about any phase or topic!",
  checklist: "Let's tackle today's tasks together. Which one should we start with?",
  progress: "Let's look at how you're doing. I can help you spot gaps and plan ahead.",
};

const SUGGESTED_PROMPTS: Record<DhritiPage, string[]> = {
  dashboard: [
    "What should I focus on today?",
    "How's my streak going?",
    "Summarize my progress this week",
  ],
  roadmaps: [
    "What's my current phase about?",
    "What should I learn next?",
    "How much have I completed?",
  ],
  checklist: [
    "Help me plan my study session",
    "Which task should I do first?",
    "How many tasks are left today?",
  ],
  progress: [
    "Where are my skill gaps?",
    "How are my quiz scores?",
    "What areas need more practice?",
  ],
};

function getCurrentPage(pathname: string): DhritiPage | null {
  for (const [route, page] of Object.entries(ALLOWED_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + "/")) return page;
  }
  return null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function DhritiWidget() {
  const location = useLocation();
  const { user } = useAuth();
  const currentPage = getCurrentPage(location.pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [pageContext, setPageContext] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevPageRef = useRef<DhritiPage | null>(null);

  // Reset greeting when page changes
  useEffect(() => {
    if (!currentPage) return;
    if (currentPage !== prevPageRef.current) {
      prevPageRef.current = currentPage;
      const greeting = PAGE_GREETINGS[currentPage];
      const firstName = user?.name?.split(" ")[0] || "";
      setChatHistory([
        { role: "assistant", content: `Hey${firstName ? ` ${firstName}` : ""}! ${greeting}` },
      ]);
    }
  }, [currentPage, user?.name]);

  // Fetch page-specific context to send with messages
  useEffect(() => {
    if (!currentPage) return;
    let cancelled = false;

    const fetchContext = async () => {
      try {
        let ctx = "";
        if (currentPage === "roadmaps" || currentPage === "dashboard") {
          const roadmap = await roadmapApi.getRoadmap();
          if (roadmap) {
            const activePhase = roadmap.phases?.[roadmap.activePhaseIndex];
            const activeModule = activePhase?.modules?.[roadmap.activeModuleIndex];
            const pendingTopics = activeModule?.topics
              ?.filter((t: any) => t.status !== "Completed")
              ?.slice(0, 5)
              ?.map((t: any) => `${t.title} (${t.type}, ${t.status})`) || [];
            ctx += `Roadmap: ${roadmap.careerGoal}, Phase "${activePhase?.title || "?"}" Module "${activeModule?.title || "?"}". `;
            ctx += `Progress: ${roadmap.completedTopics}/${roadmap.totalTopics} topics. `;
            if (pendingTopics.length) ctx += `Next topics: ${pendingTopics.join(", ")}. `;
          }
        }
        if (currentPage === "checklist" || currentPage === "dashboard") {
          const cl = await checklistApi.getChecklist();
          if (cl?.items) {
            const done = cl.items.filter((i: any) => i.status === "Completed").length;
            const pending = cl.items.filter((i: any) => i.status !== "Completed");
            ctx += `Checklist: ${done}/${cl.items.length} done, streak ${cl.streakCount || 0}. `;
            if (pending.length) {
              ctx += `Pending: ${pending.slice(0, 4).map((i: any) => `"${i.title}" (${i.taskType})`).join(", ")}. `;
            }
          }
        }
        if (currentPage === "progress" || currentPage === "dashboard") {
          const overall = await progressApi.getOverall();
          if (overall) {
            ctx += `Overall progress: ${overall.completionPercentage || 0}%, skills verified: ${overall.verifiedSkills || 0}. `;
          }
        }
        if (!cancelled) setPageContext(ctx);
      } catch {
        // silently fail — the backend has its own context
      }
    };
    fetchContext();
    return () => { cancelled = true; };
  }, [currentPage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, chatLoading, isOpen]);

  const handleSendChat = useCallback(async (overrideMsg?: string) => {
    const msg = overrideMsg || chatMessage.trim();
    if (!msg || chatLoading || !currentPage) return;
    if (!overrideMsg) setChatMessage("");

    setChatHistory((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await aiApi.chat(msg, currentPage, pageContext || undefined);
      setChatHistory((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that right now. Try again in a moment." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatMessage, chatLoading, currentPage, pageContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  const clearChat = useCallback(() => {
    if (!currentPage) return;
    const firstName = user?.name?.split(" ")[0] || "";
    setChatHistory([
      { role: "assistant", content: `Hey${firstName ? ` ${firstName}` : ""}! ${PAGE_GREETINGS[currentPage]}` },
    ]);
  }, [currentPage, user?.name]);

  // Don't render on non-allowed pages or for non-authenticated users
  if (!currentPage || !user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-background border border-border shadow-2xl rounded-2xl w-[400px] h-[600px] max-h-[80vh] flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/15 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-none">Dhriti</h3>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {currentPage === "dashboard" ? "Mission Control" : currentPage}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearChat}
                title="Clear chat"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={cn("flex gap-2 w-full", msg.role === "user" && "flex-row-reverse")}
              >
                <div className="shrink-0 mt-0.5">
                  {msg.role === "assistant" ? (
                    <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center border border-primary/30">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center border border-border">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    "text-sm px-3 py-2 rounded-xl max-w-[85%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="dhriti-markdown prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>p+p]:mt-1.5 [&>ul]:my-1 [&>ol]:my-1 [&>li]:my-0 [&>pre]:my-1 [&>h1]:text-sm [&>h2]:text-sm [&>h3]:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-2 w-full">
                <div className="shrink-0">
                  <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <div className="text-sm px-3 py-2 rounded-xl bg-muted rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}

            {/* Suggested prompts — only show at the start */}
            {chatHistory.length <= 1 && !chatLoading && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTED_PROMPTS[currentPage].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendChat(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
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
                <Button
                  onClick={() => handleSendChat()}
                  disabled={chatLoading || !chatMessage.trim()}
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating action button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95 border border-primary/20",
          isOpen
            ? "bg-muted hover:bg-muted text-muted-foreground border-border"
            : "bg-primary hover:bg-primary/90 text-primary-foreground"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </Button>
    </div>
  );
}
