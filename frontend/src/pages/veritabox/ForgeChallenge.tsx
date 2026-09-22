import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import {
  Play, Sparkles, ArrowLeft, Loader2,
  Terminal, History, Zap, CheckCircle2,
  XCircle, Clock, Cpu, ShieldCheck, HelpCircle, Trophy,
  RotateCcw, AlignLeft, Maximize2, Minimize2, Lightbulb,
  FileCode, Settings, PlaySquare
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { forgeApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";

const LANGUAGE_DEFAULTS: Record<string, string> = {
  "C++": `#include <iostream>\nusing namespace std;\n\nint main() {\n    // your code here\n    return 0;\n}`,
  "C": `#include <stdio.h>\n\nint main() {\n    // your code here\n    return 0;\n}`,
  "Python": `# your code here\n`,
  "JavaScript": `// your code here\n`
};

export default function ForgeChallenge() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Editor & IDE State
  const [language, setLanguage] = useState("C");
  const [code, setCode] = useState(LANGUAGE_DEFAULTS["C"]);
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(13);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<"description" | "editorial" | "submissions">("description");
  
  // Console State
  const [customInput, setCustomInput] = useState("");
  const [runResult, setRunResult] = useState<any>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<"testcase" | "result">("testcase");
  const [verdictStatus, setVerdictStatus] = useState<string | null>(null);
  
  const consolePanelRef = useRef<ImperativePanelHandle>(null);

  // Responsive mobile split layout flag
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Queries
  const { data: challenge, isLoading: loadingChallenge } = useQuery({
    queryKey: ["challenge", id],
    queryFn: () => forgeApi.getById(id!),
    enabled: !!id,
  });

  const { data: submissions, isLoading: loadingSubmissions } = useQuery({
    queryKey: ["challenge-submissions", id],
    queryFn: () => forgeApi.getSubmissions(id!),
    enabled: !!id,
  });

  const hasSolved = submissions?.some((sub: any) => sub.status === 'Accepted');

  // Setup default templates & retrieve from local storage cache
  useEffect(() => {
    if (challenge) {
      const cached = localStorage.getItem(`forge_code_${challenge._id}_${language}`);
      if (cached) {
        setCode(cached);
      } else {
        setCode(LANGUAGE_DEFAULTS[language] || LANGUAGE_DEFAULTS["C"]);
      }
    }
  }, [language, challenge]);

  // Set default custom input from example input once loaded
  useEffect(() => {
    if (challenge) {
      setCustomInput(challenge.exampleInput || "");
    }
  }, [challenge]);

  // Handle manual code edits
  const handleCodeChange = (val: string | undefined) => {
    const updated = val || "";
    setCode(updated);
    if (challenge) {
      localStorage.setItem(`forge_code_${challenge._id}_${language}`, updated);
    }
  };

  // Run Custom Code Mutation
  const runMutation = useMutation({
    mutationFn: () => forgeApi.run(id!, code, language, customInput),
    onMutate: () => {
      setVerdictStatus("RUNNING");
      setActiveConsoleTab("result");
      
      // Auto expand console if collapsed
      const panel = consolePanelRef.current;
      if (panel && panel.isCollapsed()) {
        panel.expand(35);
      }
    },
    onSuccess: (data) => {
      setRunResult(data);
      setVerdictStatus(null);
      toast.success("Execution completed successfully.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Compilation sequence failure.");
      setVerdictStatus(null);
    }
  });

  // Submit Code Mutation
  const submissionMutation = useMutation({
    mutationFn: () => forgeApi.submit(id!, code, language),
    onMutate: () => {
      setVerdictStatus("SUBMITTING");
      setActiveConsoleTab("result");
      
      // Auto expand console if collapsed
      const panel = consolePanelRef.current;
      if (panel && panel.isCollapsed()) {
        panel.expand(35);
      }
    },
    onSuccess: (data) => {
      setRunResult(data); // Display submission results in Console Result tab
      if (data.status === 'Accepted') {
        toast.success("CHALLENGE SOLVED", { description: `Reputation awarded: +${challenge?.reputationReward || 50} pts` });
      } else {
        toast.error("VERDICT: " + data.status.toUpperCase(), { description: "Review output mismatches or errors in console." });
      }
      queryClient.invalidateQueries({ queryKey: ["challenge-submissions", id] });
      queryClient.invalidateQueries({ queryKey: ["challenges"] }); // Invalidate catalog to refresh solve status
      queryClient.invalidateQueries({ queryKey: ["user"] });
      setVerdictStatus(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Compilation sequence failure.");
      setVerdictStatus(null);
    },
  });

  // Reset template
  const handleResetCode = () => {
    if (window.confirm("Reset current editor code to default skeleton template?")) {
      const defaultText = LANGUAGE_DEFAULTS[language] || "";
      setCode(defaultText);
      if (challenge) {
        localStorage.setItem(`forge_code_${challenge._id}_${language}`, defaultText);
      }
      toast.info("Skeletal code restored.");
    }
  };

  // Format code
  const formatCode = () => {
    try {
      setCode(code.trim());
      toast.success("Code text formatted and aligned.");
    } catch (e) {
      toast.error("Format failure.");
    }
  };

  // Load a past submission into the editor
  const handleLoadSubmission = (sub: any) => {
    if (window.confirm(`Load this submission code from ${formatDistanceShort(sub.createdAt)}? This will replace your current code.`)) {
      setLanguage(sub.language);
      setCode(sub.code);
      if (challenge) {
        localStorage.setItem(`forge_code_${challenge._id}_${sub.language}`, sub.code);
      }
      toast.success("Submission code loaded into editor.");
    }
  };

  // Toggle resizable console panel programmatically
  const toggleConsole = () => {
    const panel = consolePanelRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand(35);
      } else {
        panel.collapse();
      }
    }
  };

  if (loadingChallenge) {
    return (
      <VeritaBoxLayout hideSidebar={true}>
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <Zap className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-[12px] font-mono text-muted-foreground uppercase tracking-widest">Accessing Challenge Brief...</p>
        </div>
      </VeritaBoxLayout>
    );
  }

  if (!challenge) {
    return (
      <VeritaBoxLayout hideSidebar={true}>
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
          <XCircle className="h-12 w-12 text-destructive/40" />
          <h2 className="text-[20px] font-black uppercase tracking-widest text-muted-foreground">Challenge Redacted</h2>
          <Link to="/forge"><button className="h-10 px-5 bg-secondary border border-border rounded text-[11px] font-bold uppercase tracking-widest hover:bg-border transition-all">← Catalog</button></Link>
        </div>
      </VeritaBoxLayout>
    );
  }



  const getMonacoLang = () => {
    if (language === "Python") return "python";
    if (language === "JavaScript") return "javascript";
    return "cpp";
  };

  return (
    <VeritaBoxLayout hideSidebar={true}>
      <div className="w-full h-[calc(100vh-48px)] flex flex-col p-3 md:p-4 overflow-hidden relative min-h-0 bg-background/50">
        
        {/* Compact Header row */}
        <div className="flex items-center justify-between mb-3 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link 
              to="/forge" 
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-primary transition-all uppercase tracking-widest"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <div className="h-4 w-px bg-border/60" />
            <h1 className="text-[15px] md:text-[17px] font-black tracking-tight text-foreground truncate max-w-[200px] sm:max-w-none">
              {challenge.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Pill 
              variant={challenge.difficulty === 'Elite' ? 'danger' : challenge.difficulty === 'Operative' ? 'warning' : 'success'} 
              className="h-5 text-[9px] uppercase font-bold tracking-widest"
            >
              {challenge.difficulty}
            </Pill>
            <div className="flex items-center gap-1.5 text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide">
              <Trophy className="h-3 w-3" />
              +{challenge.reputationReward || 50} EXP
            </div>
          </div>
        </div>

        {/* ── SPLIT SCREEN WORKSPACE ── */}
        <div className="flex-1 flex flex-col border border-border bg-card/10 rounded-xl overflow-hidden relative min-h-0">
          <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} className="h-full items-stretch">
            
            {/* LEFT PANEL: Description, Hints & Submissions */}
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="flex flex-col h-full bg-[#0d0d0f]/95 border-r border-border/80 overflow-hidden">
                
                {/* Left panel headers (Tabs) - Hackathon Flat Button Style */}
                <div className="flex items-center bg-secondary/5 border-b border-border/40 px-4 h-12 shrink-0">
                  <div className="flex gap-2">
                    {[
                      { id: "description", label: "Description" },
                      { id: "editorial", label: "Editorial" },
                      { id: "submissions", label: "Submissions" }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveLeftTab(t.id as any)}
                        className={`text-[12px] px-3.5 py-1.5 border rounded transition-colors uppercase font-mono tracking-wider font-bold ${
                          activeLeftTab === t.id
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Left Tab content area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-card/25">
                  
                  {/* TAB 1: DESCRIPTION */}
                  {activeLeftTab === "description" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Pill variant={challenge.difficulty === 'Elite' ? 'danger' : challenge.difficulty === 'Operative' ? 'warning' : 'success'} className="h-5 text-[9px] uppercase font-bold tracking-widest">
                            {challenge.difficulty}
                          </Pill>
                          {challenge.tags?.map(t => (
                            <Pill key={t} className="h-5 text-[9px] uppercase font-bold tracking-widest bg-secondary/50">#{t}</Pill>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5 text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide">
                          <Trophy className="h-3 w-3" />
                          +{challenge.reputationReward || 50} EXP
                        </div>
                      </div>

                      <h2 className="text-[20px] font-black tracking-tight text-foreground">{challenge.title}</h2>

                      {hasSolved && (
                        <div className="p-3.5 bg-success/15 border border-success/30 text-success rounded text-[12px] flex items-start gap-2.5 leading-relaxed font-semibold">
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                          <div>
                            <span className="block font-black uppercase tracking-wider text-[11px]">Mission Complete</span>
                            You have solved this tactical target. Additional submissions are locked to secure the registry.
                          </div>
                        </div>
                      )}



                      <div className="prose prose-sm dark:prose-invert max-w-none text-[13.5px] leading-relaxed text-foreground/80">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {challenge.problemStatement}
                        </ReactMarkdown>
                      </div>

                      {challenge.constraints && (
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Sector Constraints
                          </h4>
                          <pre className="bg-secondary/30 p-3.5 border border-border/60 rounded text-[12px] font-mono text-muted-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {challenge.constraints}
                          </pre>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Terminal className="h-3.5 w-3.5" /> Sample Input
                          </h4>
                          <pre className="bg-secondary/40 p-4 border border-border rounded text-[11.5px] font-mono text-muted-foreground/85 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {challenge.exampleInput || "None"}
                          </pre>
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Expected Output
                          </h4>
                          <pre className="bg-secondary/40 p-4 border border-border rounded text-[11.5px] font-mono text-muted-foreground/85 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {challenge.exampleOutput || "None"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: EDITORIAL */}
                  {activeLeftTab === "editorial" && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary border-b border-border/60 pb-2">
                        <Lightbulb className="h-4 w-4" /> Tactical Intel Briefing
                      </div>
                      
                      <div className="space-y-4 text-[13.5px] leading-relaxed text-foreground/80">
                        <p>
                          Welcome to the Code Forge sandbox. For hints on this problem, consider the difficulty parameters:
                        </p>
                        
                        <div className="p-4 bg-secondary/20 border border-border rounded space-y-2">
                          <h4 className="font-bold text-foreground">Suggested Approach</h4>
                          <p className="text-muted-foreground text-[12.5px]">
                            {challenge.tags?.includes("Graph")
                              ? "Graph traversal and shortest paths. Standard implementations such as Dijkstra or BFS are effective. Remember to scale latency estimates using floating-point values."
                              : challenge.tags?.includes("Strings")
                              ? "Window-based optimization. Two-pointer strategy can establish boundaries and shrink windows to satisfy substring parameters efficiently."
                              : "Optimize loops to avoid time limit locks. Break early or use simple linear space hash structures to maintain data checks in O(N)."}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-bold text-foreground text-[13px]">Complexity Goals</h4>
                          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                            <div className="p-3 bg-secondary/10 border border-border rounded">
                              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Time Complexity</span>
                              <span className="font-mono text-primary font-black">O(N log N) or O(N)</span>
                            </div>
                            <div className="p-3 bg-secondary/10 border border-border rounded">
                              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Space Complexity</span>
                              <span className="font-mono text-primary font-black">O(N) aux space</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-border">
                          <button
                            onClick={() => {
                              toast.info("Tactical hint deployed.", {
                                description: challenge.tags?.includes("Graph")
                                  ? "Consider how retransmissions increase overall path cost: expected cost = latency / (1 - loss_probability)."
                                  : "Keep check counts for characters to guarantee all requirements in window matching."
                              });
                            }}
                            className="w-full h-10 border border-border text-[11px] font-bold uppercase tracking-widest rounded hover:bg-secondary transition-all"
                          >
                            Deploy Live Hint
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SUBMISSIONS HISTORY */}
                  {activeLeftTab === "submissions" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                          <History className="h-4 w-4" /> Solvers Log
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/60">{submissions?.length || 0} attempts committed</span>
                      </div>

                      <div className="space-y-2">
                        {loadingSubmissions ? (
                          <div className="flex justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : submissions && submissions.length > 0 ? (
                          submissions.map((sub: any) => {
                            const isAccepted = sub.status === 'Accepted';
                            return (
                              <div
                                key={sub._id}
                                onClick={() => handleLoadSubmission(sub)}
                                className={cn(
                                  "flex items-center justify-between p-3.5 rounded border bg-card/40 text-[12px] font-mono hover:border-primary/50 cursor-pointer transition-all hover:bg-secondary/10 group"
                                )}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    {isAccepted ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                                    )}
                                    <span className={cn("font-black uppercase tracking-wider text-[11px] group-hover:underline", isAccepted ? "text-success" : "text-destructive")}>
                                      {sub.status}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground/60">
                                    Language: {sub.language}
                                  </div>
                                </div>
                                <div className="text-right space-y-1 text-[11px] text-muted-foreground/80">
                                  <div>{sub.runtime}ms | {sub.memory ? `${(sub.memory / 1024).toFixed(1)}MB` : "—"}</div>
                                  <div className="text-[9px] text-muted-foreground/50">{formatDistanceShort(sub.createdAt)}</div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-10 opacity-40 italic text-[12.5px] text-muted-foreground bg-secondary/5 rounded border border-dashed">
                            No submissions committed in this registry.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* RIGHT PANEL: Editor (Monaco) & Bottom Interactive Console */}
            <ResizablePanel defaultSize={60} minSize={30}>
              <ResizablePanelGroup direction="vertical" className="h-full">
                
                {/* Right Top Panel: Monaco Editor */}
                <ResizablePanel defaultSize={65} minSize={30}>
                  <div className={cn(
                    "flex flex-col h-full bg-[#1e1e1e] relative overflow-hidden",
                    isFullScreen && "fixed inset-0 z-50 bg-[#1e1e1e]"
                  )}>
                    {/* Editor Control Headers */}
                    <div className="p-2 bg-secondary/10 border-b border-border flex items-center justify-between h-11 shrink-0 z-10">
                      <div className="flex items-center gap-2">
                        {/* Language Selection */}
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="text-[10px] font-black uppercase tracking-widest bg-card border border-border rounded h-7 px-2.5 outline-none focus:border-primary/50"
                        >
                          <option>C</option>
                          <option>C++</option>
                          <option>JavaScript</option>
                          <option>Python</option>
                        </select>

                        {/* Editor Configs Dropdown */}
                        <div className="flex items-center gap-1 border-l border-border pl-2">
                          <select
                            value={fontSize}
                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                            className="text-[10px] font-mono bg-transparent border-none rounded h-7 px-1.5 outline-none hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                          >
                            <option value={12}>12px</option>
                            <option value={13}>13px</option>
                            <option value={14}>14px</option>
                            <option value={16}>16px</option>
                          </select>
                          <select
                            value={editorTheme}
                            onChange={(e) => setEditorTheme(e.target.value)}
                            className="text-[10px] font-mono bg-transparent border-none rounded h-7 px-1.5 outline-none hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                          >
                            <option value="vs-dark">Dark Theme</option>
                            <option value="light">Light Theme</option>
                          </select>
                        </div>
                      </div>

                      {/* Tool Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleResetCode}
                          title="Reset Code Template"
                          className="h-7 w-7 border border-border hover:bg-secondary/40 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={formatCode}
                          title="Format Code"
                          className="h-7 w-7 border border-border hover:bg-secondary/40 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                        >
                          <AlignLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setIsFullScreen(!isFullScreen)}
                          title="Toggle Fullscreen"
                          className="h-7 w-7 border border-border hover:bg-secondary/40 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                        >
                          {isFullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Monaco Editor Component */}
                    <div className="flex-1 relative overflow-hidden bg-[#1e1e1e]">
                      {verdictStatus && (
                        <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
                          <div className="relative h-12 w-12">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/25 border-t-primary animate-spin" />
                            <Cpu className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
                          </div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary animate-pulse">
                            {verdictStatus === "RUNNING" ? "Running Code..." : "Submitting solution..."}
                          </div>
                        </div>
                      )}

                      <Editor
                        height="100%"
                        language={getMonacoLang()}
                        theme={editorTheme}
                        value={code}
                        onChange={handleCodeChange}
                        options={{
                          minimap: { enabled: false },
                          fontSize: fontSize,
                          lineNumbers: "on",
                          roundedSelection: true,
                          scrollBeyondLastLine: false,
                          cursorStyle: "line",
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle />

                {/* Right Bottom Panel: Interactive Console */}
                <ResizablePanel defaultSize={35} minSize={0} collapsible ref={consolePanelRef}>
                  <div className="flex flex-col h-full bg-card/65 border-t border-border overflow-hidden">
                    
                    {/* Console Tab Headers */}
                    <div className="flex items-center justify-between bg-secondary/15 border-b border-border px-3 h-10 shrink-0 select-none">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setActiveConsoleTab("testcase")}
                          className={cn(
                            "h-7 px-2.5 text-[10px] font-black uppercase tracking-wider rounded transition-colors flex items-center gap-1.5",
                            activeConsoleTab === "testcase"
                              ? "bg-secondary text-foreground border border-border"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Terminal className="h-3 w-3" /> Testcase
                        </button>
                        <button
                          onClick={() => setActiveConsoleTab("result")}
                          className={cn(
                            "h-7 px-2.5 text-[10px] font-black uppercase tracking-wider rounded transition-colors flex items-center gap-1.5",
                            activeConsoleTab === "result"
                              ? "bg-secondary text-foreground border border-border"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <PlaySquare className="h-3 w-3" /> Result
                        </button>
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground/60 uppercase">Interactive Terminal</span>
                    </div>

                    {/* Console Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4 bg-card/45 custom-scrollbar">
                      
                      {/* Console Input: Custom input text area */}
                      {activeConsoleTab === "testcase" && (
                        <div className="h-full flex flex-col space-y-2">
                          <label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground flex items-center gap-1">
                            Editable Input Stream
                          </label>
                          <textarea
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            placeholder="Provide custom mock values for code input solve(input)..."
                            className="flex-1 w-full bg-secondary/20 border border-border rounded-lg p-3 font-mono text-[12px] text-foreground outline-none focus:border-primary/50 resize-none min-h-[80px]"
                          />
                        </div>
                      )}

                      {/* Console Result: Outputs, stdout, mismatches */}
                      {activeConsoleTab === "result" && (
                        <div className="space-y-4">
                          {!runResult ? (
                            <div className="py-10 text-center text-[12px] text-muted-foreground/60 italic">
                              Run your code to display diagnostic outputs.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Verdict Badge */}
                              <div className="flex items-center gap-3">
                                {runResult.status === 'Accepted' ? (
                                  <div className="flex items-center gap-1.5 text-success bg-success/15 border border-success/30 px-3 py-1 rounded text-[12px] font-black uppercase tracking-wider">
                                    <CheckCircle2 className="h-4 w-4" /> Accepted
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-destructive bg-destructive/15 border border-destructive/30 px-3 py-1 rounded text-[12px] font-black uppercase tracking-wider">
                                    <XCircle className="h-4 w-4" /> {runResult.status || 'Wrong Answer'}
                                  </div>
                                )}
                              </div>

                              {/* Test Case Result Iteration */}
                              {runResult.testCaseResults?.map((tc: any, index: number) => {
                                const passed = tc.status === 'Passed';
                                return (
                                  <Surface key={index} className="p-4 bg-secondary/10 border-border/80 space-y-3">
                                    <div className="flex items-center justify-between text-[11px] font-bold font-mono">
                                      <span className={cn(passed ? "text-success" : "text-destructive")}>
                                        Case #{tc.caseIndex} : {tc.status}
                                      </span>
                                      {tc.message && <span className="text-muted-foreground/60 text-[10px] font-normal">{tc.message}</span>}
                                    </div>

                                    {/* Expected vs Actual output values */}
                                    <div className="grid md:grid-cols-2 gap-4 text-[12px] font-mono">
                                      <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-muted-foreground/50 tracking-wider">Your Output</span>
                                        <pre className="bg-secondary p-3 border border-border rounded overflow-x-auto text-foreground max-h-[100px] leading-relaxed">
                                          {tc.output !== undefined ? tc.output : "No output detected"}
                                        </pre>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-muted-foreground/50 tracking-wider">Expected Output</span>
                                        <pre className="bg-secondary p-3 border border-border rounded overflow-x-auto text-muted-foreground max-h-[100px] leading-relaxed">
                                          {tc.expected !== undefined ? tc.expected : challenge.exampleOutput}
                                        </pre>
                                      </div>
                                    </div>

                                    {/* Stdout trace */}
                                    {tc.stdout && (
                                      <div className="space-y-1">
                                        <span className="text-[9px] uppercase font-black text-muted-foreground/50 tracking-wider flex items-center gap-1">
                                          Stdout logs
                                        </span>
                                        <pre className="bg-[#1e1e1e] p-3 rounded font-mono text-[11.5px] text-info overflow-x-auto max-h-[100px] border border-border/40 leading-relaxed">
                                          {tc.stdout}
                                        </pre>
                                      </div>
                                    )}
                                  </Surface>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                </ResizablePanel>

              </ResizablePanelGroup>
            </ResizablePanel>

          </ResizablePanelGroup>
        </div>

        {/* ── FOOTER WORKSPACE BUTTON BAR ── */}
        <div className="h-14 bg-secondary/10 border border-border border-t-0 rounded-b-xl px-4 flex items-center justify-between shrink-0 bg-card/30">
          <button
            onClick={toggleConsole}
            className="h-9 px-4 border border-border hover:bg-secondary text-[11.5px] font-black uppercase tracking-wider rounded flex items-center gap-2 transition-all"
          >
            <Terminal className="h-4 w-4 text-primary" />
            Console
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || submissionMutation.isPending}
              className="h-9 px-4 border border-border hover:bg-secondary text-[11.5px] font-black uppercase tracking-wider rounded flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 text-primary" /> Run Code</>}
            </button>
            <button
              onClick={() => submissionMutation.mutate()}
              disabled={runMutation.isPending || submissionMutation.isPending || hasSolved}
              className="h-9 px-5 bg-foreground text-background font-black text-[11.5px] uppercase tracking-widest rounded flex items-center gap-1.5 transition-all disabled:opacity-50 hover:opacity-90 shadow-md shadow-primary/5 disabled:cursor-not-allowed"
            >
              {submissionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-background" />
                  {hasSolved ? "Solved" : "Submit"}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </VeritaBoxLayout>
  );
}

function formatDistanceShort(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}
