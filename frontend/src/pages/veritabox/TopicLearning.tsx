/**
 * TopicLearning.tsx — Theory learning page with Learn → Try → Verify flow.
 * All content from backend API — no hardcoded data. Dhriti AI help available.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, SectionTitle, Pill } from "@/components/VeritaBox/UI";
import { Button } from "@/components/ui/button";
import { learningApi, aiApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2, BookOpen, Cpu, Code, ExternalLink, Bot, ChevronLeft,
  CheckCircle2, Send, Info, Clock, Timer, Play, Pause
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Tab = "learn" | "try" | "resources";

export default function TopicLearning() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<any>(null);
  const [studentProgress, setStudentProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("learn");
  const [completingTheory, setCompletingTheory] = useState(false);
  const [theoryCompleted, setTheoryCompleted] = useState(false);

  // Dhriti AI
  const [dhritiQuestion, setDhritiQuestion] = useState("");
  const [dhritiReply, setDhritiReply] = useState("");
  const [askingDhriti, setAskingDhriti] = useState(false);

  // Focus Timer
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Practical submission
  const [practicalText, setPracticalText] = useState("");
  const [practicalCode, setPracticalCode] = useState("");
  const [submittingPractical, setSubmittingPractical] = useState(false);
  const [practicalSubmitted, setPracticalSubmitted] = useState(false);
  const [practicalStatus, setPracticalStatus] = useState<string | null>(null);

  useEffect(() => {
    if (timerActive) {
      const id = setInterval(() => setTimerSeconds(s => s + 1), 1000);
      setTimerInterval(id);
      return () => clearInterval(id);
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [timerActive]);

  useEffect(() => {
    return () => { if (timerInterval) clearInterval(timerInterval); };
  }, [timerInterval]);

  useEffect(() => {
    if (!topicId) return;
    setLoading(true);
    learningApi.getTopic(topicId)
      .then(data => {
        setTopic(data.content);
        setStudentProgress(data.studentProgress);
        setPracticalSubmitted(data.studentProgress?.practicalSubmitted || false);
        setPracticalStatus(data.studentProgress?.practicalStatus || null);
      })
      .catch(err => toast.error(err?.message || "Failed to load topic"))
      .finally(() => setLoading(false));
  }, [topicId]);

  const handleCompleteTheory = async () => {
    if (!topicId) return;
    setCompletingTheory(true);
    try {
      await learningApi.completeTopic(topicId);
      setTheoryCompleted(true);
      toast.success("Theory marked as completed!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete theory");
    } finally {
      setCompletingTheory(false);
    }
  };

  const handleAskDhriti = async () => {
    if (!dhritiQuestion.trim()) return;
    setAskingDhriti(true);
    setDhritiReply("");
    try {
      const result = await aiApi.explainTopic(topicId || "", dhritiQuestion);
      setDhritiReply(result.reply);
    } catch (err: any) {
      toast.error(err?.message || "Dhriti is unavailable right now");
    } finally {
      setAskingDhriti(false);
    }
  };

  const handleSubmitPractical = async () => {
    if (!topicId) return;
    const submissionType = topic?.practiceTask?.submissionType || "Text";
    const content = submissionType === "Code" ? practicalCode : practicalText;
    if (!content.trim()) {
      toast.error("Please write your submission before submitting.");
      return;
    }
    setSubmittingPractical(true);
    try {
      await learningApi.submitPractical(topicId, {
        submissionType,
        submissionText: submissionType === "Text" || submissionType === "Explanation" ? content : undefined,
        submissionCode: submissionType === "Code" ? content : undefined,
        language: topic?.practiceTask?.language,
      });
      setPracticalSubmitted(true);
      setPracticalStatus("Pending");
      toast.success("Practical submitted! It will be reviewed.");
    } catch (err: any) {
      if (err?.message?.includes("already have")) {
        setPracticalSubmitted(true);
        setPracticalStatus("Pending");
        toast.info("You already submitted this practical.");
      } else {
        toast.error(err?.message || "Failed to submit practical");
      }
    } finally {
      setSubmittingPractical(false);
    }
  };

  if (loading) {
    return (
      <VeritaBoxLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading topic…</span>
        </div>
      </VeritaBoxLayout>
    );
  }

  if (!topic) {
    return (
      <VeritaBoxLayout>
        <PageContent>
          <div className="text-center py-16 text-muted-foreground">Topic not found.</div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "learn", label: "Learn", icon: BookOpen },
    { id: "try", label: "Try", icon: Code },
    { id: "resources", label: "Resources", icon: ExternalLink },
  ];

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Breadcrumb / Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Roadmap
          </button>

          {/* Topic header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Pill variant="primary">{topic.skill?.name || "Topic"}</Pill>
              <Pill variant={topic.difficulty === "Beginner" ? "success" : topic.difficulty === "Intermediate" ? "warning" : "danger"}>
                {topic.difficulty}
              </Pill>
              <span className="text-[11px] text-muted-foreground">~{topic.estimatedMinutes} min</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{topic.title}</h1>
            {topic.description && (
              <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
            )}
          </div>

          {/* Focus Timer */}
          <Surface className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[11px] text-muted-foreground">Focus Timer</p>
                <p className="text-[16px] font-mono font-semibold tabular-nums">
                  {String(Math.floor(timerSeconds / 3600)).padStart(2, '0')}:
                  {String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0')}:
                  {String(timerSeconds % 60).padStart(2, '0')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={timerActive ? "destructive" : "default"}
                className="h-7 text-[11px] gap-1.5"
                onClick={() => setTimerActive(!timerActive)}
              >
                {timerActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {timerActive ? "Pause" : "Start"}
              </Button>
              {timerSeconds > 0 && !timerActive && (
                <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setTimerSeconds(0)}>
                  Reset
                </Button>
              )}
              {topic?.estimatedMinutes && (
                <span className="text-[10px] text-muted-foreground">
                  Est. {topic.estimatedMinutes}m
                </span>
              )}
            </div>
          </Surface>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab: Learn (Theory) */}
          {activeTab === "learn" && (
            <div className="space-y-4">
              <Surface className="p-6">
                {topic.conceptSummary && (
                  <div className="mb-5 p-3 bg-primary/5 border border-primary/20 rounded-md">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Info className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px] font-medium text-primary uppercase tracking-wider">Key Concept</span>
                    </div>
                    <p className="text-[13px]">{topic.conceptSummary}</p>
                  </div>
                )}

                {topic.theoryContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {topic.theoryContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Theory content coming soon.</p>
                )}

                {topic.commonMistakes?.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-destructive mb-2">⚠️ Common Mistakes</p>
                    <ul className="space-y-1">
                      {topic.commonMistakes.map((m: string, i: number) => (
                        <li key={i} className="text-[12px] text-muted-foreground flex items-start gap-1.5">
                          <span className="text-destructive mt-0.5">•</span>{m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {topic.bestPractices?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-green-500 mb-2">✅ Best Practices</p>
                    <ul className="space-y-1">
                      {topic.bestPractices.map((p: string, i: number) => (
                        <li key={i} className="text-[12px] text-muted-foreground flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5">•</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Surface>

              {/* Dhriti AI help */}
              <Surface className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="h-4 w-4 text-primary" />
                  <p className="text-[12px] font-medium">Ask Dhriti (AI Learning Guide)</p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={dhritiQuestion}
                    onChange={e => setDhritiQuestion(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAskDhriti()}
                    placeholder="Ask about this topic…"
                    className="flex-1 text-[12px] bg-secondary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary/50"
                  />
                  <Button size="sm" onClick={handleAskDhriti} disabled={askingDhriti || !dhritiQuestion.trim()}>
                    {askingDhriti ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                {dhritiReply && (
                  <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-md">
                    <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{dhritiReply}</p>
                  </div>
                )}
              </Surface>

              {/* Mark complete action */}
              {topic.quizQuestions?.length > 0 ? (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => navigate(`/learning/quiz/${topicId}`)}
                >
                  <Cpu className="h-4 w-4" />
                  Take Quiz to Complete
                </Button>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={handleCompleteTheory}
                  disabled={completingTheory || theoryCompleted}
                >
                  {completingTheory ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : theoryCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {theoryCompleted ? "Theory Completed!" : "Mark Theory as Completed"}
                </Button>
              )}
            </div>
          )}

          {/* Tab: Try (Practical) */}
          {activeTab === "try" && (
            <div className="space-y-4">
              {topic.practiceTask ? (
                <>
                  <Surface className="p-5">
                    <h3 className="text-[14px] font-semibold mb-2">{topic.practiceTask.title}</h3>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{topic.practiceTask.description}</p>

                    {topic.practiceTask.hints?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Hints</p>
                        <ul className="space-y-1">
                          {topic.practiceTask.hints.map((h: string, i: number) => (
                            <li key={i} className="text-[12px] text-muted-foreground flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">→</span>{h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Surface>

                  {!practicalSubmitted ? (
                    <Surface className="p-4">
                      <p className="text-[12px] font-medium mb-3">Your Submission</p>
                      {topic.practiceTask.submissionType === "Code" ? (
                        <>
                          {topic.practiceTask.starterCode && (
                            <pre className="text-[11px] bg-secondary border border-border rounded p-3 mb-3 overflow-auto">
                              {topic.practiceTask.starterCode}
                            </pre>
                          )}
                          <textarea
                            value={practicalCode}
                            onChange={e => setPracticalCode(e.target.value)}
                            placeholder={`Write your ${topic.practiceTask.language || "code"} here…`}
                            className="w-full h-48 font-mono text-[12px] bg-secondary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary/50 resize-none"
                          />
                        </>
                      ) : (
                        <textarea
                          value={practicalText}
                          onChange={e => setPracticalText(e.target.value)}
                          placeholder="Write your answer here…"
                          className="w-full h-32 text-[12px] bg-secondary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary/50 resize-none"
                        />
                      )}
                      <Button
                        className="w-full mt-3 gap-2"
                        onClick={handleSubmitPractical}
                        disabled={submittingPractical}
                      >
                        {submittingPractical ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Submit Practical
                      </Button>
                    </Surface>
                  ) : (
                    <Surface className={
                      `p-4 border ${practicalStatus === 'Verified' ? 'border-green-500/30 bg-green-500/5' : 
                                  practicalStatus === 'Rejected' || practicalStatus === 'NeedsRevision' ? 'border-destructive/30 bg-destructive/5' : 
                                  'border-yellow-500/30 bg-yellow-500/5'}`
                    }>
                      <div className={
                        `flex items-center gap-2 ${practicalStatus === 'Verified' ? 'text-green-500' : 
                                                 practicalStatus === 'Rejected' || practicalStatus === 'NeedsRevision' ? 'text-destructive' : 
                                                 'text-yellow-500'}`
                      }>
                        {practicalStatus === 'Verified' ? <CheckCircle2 className="h-4 w-4" /> : 
                         practicalStatus === 'Rejected' || practicalStatus === 'NeedsRevision' ? <Info className="h-4 w-4" /> : 
                         <Clock className="h-4 w-4" />}
                        <p className="text-[13px] font-medium">
                          {practicalStatus === 'Verified' ? 'Practical Verified!' :
                           practicalStatus === 'NeedsRevision' ? 'Revision Needed' :
                           practicalStatus === 'Rejected' ? 'Submission Rejected' :
                           'Practical Submitted!'}
                        </p>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-1">
                        {practicalStatus === 'Verified' ? 'Great job! Your submission has been approved.' :
                         practicalStatus === 'NeedsRevision' ? 'Your submission needs some changes. Please review the feedback.' :
                         practicalStatus === 'Rejected' ? 'Your submission was not accepted.' :
                         'Your submission is under review. You\'ll be notified of the result.'}
                      </p>
                    </Surface>
                  )}
                </>
              ) : (
                <Surface className="p-8 text-center">
                  <p className="text-muted-foreground text-sm">No practical task for this topic.</p>
                </Surface>
              )}
            </div>
          )}

          {/* Tab: Resources */}
          {activeTab === "resources" && (
            <div className="space-y-2">
              {topic.resources?.length > 0 ? (
                topic.resources.map((r: any, i: number) => (
                  <Surface key={i} hover className="p-3">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group"
                    >
                      <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center shrink-0">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium group-hover:text-primary transition-colors">{r.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.type}</span>
                          {r.source && <span className="text-[10px] text-muted-foreground">{r.source}</span>}
                          {r.isFree && <span className="text-[9px] bg-green-500/10 text-green-500 border border-green-500/20 rounded px-1">Free</span>}
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </a>
                  </Surface>
                ))
              ) : (
                <Surface className="p-8 text-center">
                  <p className="text-muted-foreground text-sm">No resources listed for this topic.</p>
                </Surface>
              )}

              {/* Quiz CTA if available */}
              {studentProgress?.quizAttempts === 0 && topic.quizQuestions?.length > 0 && (
                <Surface className="p-4 border-primary/30 bg-primary/5 mt-4">
                  <p className="text-[12px] font-medium mb-2">Ready to test your knowledge?</p>
                  <Button size="sm" onClick={() => navigate(`/learning/quiz/${topicId}`)} className="gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    Take the Quiz
                  </Button>
                </Surface>
              )}
            </div>
          )}
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
