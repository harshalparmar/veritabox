import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/veritabox/UI";
import {
  Play, Loader2, CheckCircle2, XCircle, Clock, Trophy,
  ChevronLeft, Send, Terminal, AlertCircle, Code2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "next-themes";

const LANGUAGE_DEFAULTS: Record<string, string> = {
  "C++": `#include <iostream>\nusing namespace std;\n\nint main() {\n    // your code here\n    return 0;\n}`,
  "C": `#include <stdio.h>\n\nint main() {\n    // your code here\n    return 0;\n}`,
  "Python": `# your code here\n`,
  "JavaScript": `// your code here\n`
};

export default function ContestArena() {
  const { id, roundNumber } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const rn = parseInt(roundNumber || "1");

  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [language, setLanguage] = useState("C++");
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [customInput, setCustomInput] = useState("");
  const [runResult, setRunResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"problem" | "result">("problem");

  const code = selectedProblem ? (codeMap[selectedProblem] ?? LANGUAGE_DEFAULTS[language]) : LANGUAGE_DEFAULTS[language];
  const setCode = (val: string) => {
    if (selectedProblem) setCodeMap(prev => ({ ...prev, [selectedProblem]: val }));
  };

  const { data: contestData, isLoading } = useQuery({
    queryKey: ["contest-problems", id, rn],
    queryFn: () => hackathonsApi.getContestProblems(id!, rn),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const problems = contestData?.problems || [];
  const roundInfo = contestData?.round;
  const currentProblem = problems.find((p: any) => p._id === selectedProblem);

  // Auto-select first problem
  useEffect(() => {
    if (problems.length > 0 && !selectedProblem) {
      setSelectedProblem(problems[0]._id);
    }
  }, [problems, selectedProblem]);

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!roundInfo?.endTime) return;
    const interval = setInterval(() => {
      const diff = new Date(roundInfo.endTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("TIME'S UP");
        clearInterval(interval);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [roundInfo?.endTime]);

  const runMutation = useMutation({
    mutationFn: () => hackathonsApi.contestRun(id!, rn, { code, language, input: customInput }),
    onSuccess: (data) => {
      setRunResult(data);
      setActiveTab("result");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const submitMutation = useMutation({
    mutationFn: () => hackathonsApi.contestSubmit(id!, rn, { code, language, challengeId: selectedProblem! }),
    onSuccess: (data) => {
      setRunResult(data.evaluation);
      setActiveTab("result");
      if (data.evaluation.status === "Accepted") {
        toast.success("Accepted! Problem solved.");
      } else {
        toast.error(`Verdict: ${data.evaluation.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ["contest-problems", id, rn] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <VeritaBoxLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </VeritaBoxLayout>
    );
  }

  const isLive = roundInfo?.status === "Live";

  return (
    <VeritaBoxLayout>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 shrink-0">
          <div className="flex items-center gap-3">
            <Link to={`/hackathons/${id}`} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="text-sm font-bold">{roundInfo?.title || "Contest"}</span>
            <Pill variant={isLive ? "danger" : "primary"}>{roundInfo?.status}</Pill>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm font-mono font-bold">
              <Clock className="h-4 w-4 text-warning" />
              <span className={timeLeft === "TIME'S UP" ? "text-destructive" : "text-warning"}>{timeLeft}</span>
            </div>
            <Link
              to={`/hackathons/${id}/rounds/${rn}/leaderboard`}
              className="text-xs font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
            >
              <Trophy className="h-3.5 w-3.5" /> Leaderboard
            </Link>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Problem sidebar */}
          <div className="w-14 border-r border-border bg-card/30 overflow-y-auto shrink-0">
            {problems.map((p: any, idx: number) => {
              const status = p.solveStatus;
              return (
                <button
                  key={p._id}
                  onClick={() => setSelectedProblem(p._id)}
                  className={cn(
                    "w-full h-14 flex flex-col items-center justify-center text-xs font-bold border-b border-border transition-colors",
                    selectedProblem === p._id ? "bg-primary/10 text-primary border-l-2 border-l-primary" : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <span className="text-[10px]">{String.fromCharCode(65 + idx)}</span>
                  {status?.solved ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5" />
                  ) : status?.attempts > 0 ? (
                    <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/30 mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Problem description / result panel */}
            <div className="w-full md:w-[400px] border-r border-border overflow-y-auto shrink-0">
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab("problem")}
                  className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-widest text-center border-b-2 transition-colors",
                    activeTab === "problem" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Problem
                </button>
                <button
                  onClick={() => setActiveTab("result")}
                  className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-widest text-center border-b-2 transition-colors",
                    activeTab === "result" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Result
                </button>
              </div>

              {activeTab === "problem" && currentProblem && (
                <div className="p-4 space-y-4">
                  <div>
                    <h2 className="text-lg font-bold">{currentProblem.title}</h2>
                    <Pill variant={currentProblem.difficulty === "Easy" ? "success" : currentProblem.difficulty === "Medium" ? "warning" : "danger"} className="mt-1">
                      {currentProblem.difficulty}
                    </Pill>
                  </div>
                  <div className="prose dark:prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentProblem.problemStatement}</ReactMarkdown>
                  </div>
                  {currentProblem.constraints && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Constraints</h4>
                      <pre className="text-xs bg-secondary/50 p-2 rounded border border-border whitespace-pre-wrap">{currentProblem.constraints}</pre>
                    </div>
                  )}
                  {currentProblem.exampleInput && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Input</h4>
                        <pre className="text-xs bg-secondary/50 p-2 rounded border border-border whitespace-pre-wrap">{currentProblem.exampleInput}</pre>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Output</h4>
                        <pre className="text-xs bg-secondary/50 p-2 rounded border border-border whitespace-pre-wrap">{currentProblem.exampleOutput}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "result" && (
                <div className="p-4 space-y-3">
                  {runResult ? (
                    <>
                      <div className={cn("p-3 rounded border text-sm font-bold",
                        runResult.status === "Accepted" ? "bg-success/10 border-success/20 text-success" : "bg-destructive/10 border-destructive/20 text-destructive"
                      )}>
                        {runResult.status}
                      </div>
                      {runResult.testCaseResults?.map((tc: any) => (
                        <div key={tc.caseIndex} className="p-2 bg-secondary/30 rounded border border-border text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold">Case #{tc.caseIndex}</span>
                            <span className={tc.status === "Passed" ? "text-success" : "text-destructive"}>{tc.status}</span>
                          </div>
                          {tc.message && <div className="text-muted-foreground">{tc.message}</div>}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Run or submit your code to see results.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Code editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Editor toolbar */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/50 shrink-0">
                <div className="flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={language}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      const currentCode = selectedProblem ? codeMap[selectedProblem] : undefined;
                      if (currentCode && currentCode !== LANGUAGE_DEFAULTS[language]) {
                        if (!window.confirm(`Switch to ${newLang}? Your current code for this problem will be replaced with the ${newLang} template.`)) return;
                      }
                      setLanguage(newLang);
                      if (selectedProblem) setCodeMap(prev => ({ ...prev, [selectedProblem]: LANGUAGE_DEFAULTS[newLang] || "" }));
                    }}
                    className="h-7 bg-card border border-border px-2 text-xs rounded"
                  >
                    {Object.keys(LANGUAGE_DEFAULTS).map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runMutation.mutate()}
                    disabled={runMutation.isPending || !isLive}
                    className="h-7 px-3 flex items-center gap-1 bg-secondary text-foreground text-xs font-bold rounded hover:bg-secondary/80 disabled:opacity-50"
                  >
                    {runMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} Run
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedProblem) return;
                      submitMutation.mutate();
                    }}
                    disabled={submitMutation.isPending || !isLive || !selectedProblem || currentProblem?.solveStatus?.solved}
                    className="h-7 px-3 flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold rounded hover:brightness-110 disabled:opacity-50"
                  >
                    {submitMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Submit
                  </button>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language={language === "C++" ? "cpp" : language === "C" ? "c" : language.toLowerCase()}
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    wordWrap: "on",
                    tabSize: 4,
                  }}
                />
              </div>

              {/* Custom input */}
              <div className="border-t border-border shrink-0">
                <div className="px-3 py-1.5 flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Custom Input</span>
                </div>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="w-full h-16 bg-card/50 border-t border-border p-2 text-xs font-mono resize-none focus:outline-none"
                  placeholder="Enter custom test input..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </VeritaBoxLayout>
  );
}
