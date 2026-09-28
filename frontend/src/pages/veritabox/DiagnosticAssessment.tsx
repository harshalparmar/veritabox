/**
 * DiagnosticAssessment.tsx  -  Skill verification diagnostic flow.
 * Starts diagnostic, presents questions, grades server-side.
 */

import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface } from "@/components/veritabox/UI";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { learningApi } from "@/lib/api";
import { SkillStatusBadge } from "@/components/veritabox/SkillStatusBadge";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, Cpu, CheckCircle2, XCircle, Target } from "lucide-react";

type Phase = "intro" | "taking" | "result";

export default function DiagnosticAssessmentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const skillId = searchParams.get("skillId") || "";
  const skillName = searchParams.get("skillName") || "Skill";

  const [phase, setPhase] = useState<Phase>("intro");
  const [assessmentId, setAssessmentId] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { selectedAnswer?: string; selectedAnswers?: string[] }>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleStart = async () => {
    if (!skillId) { toast.error("No skill specified."); return; }
    setLoading(true);
    try {
      const data = await learningApi.startDiagnostic(skillId);
      setAssessmentId(data.assessmentId);
      setQuestions(data.questions || []);
      setPhase("taking");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start diagnostic");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (questionIndex: number, answer: string, type: string) => {
    if (type === "MultiSelect") {
      const current = answers[questionIndex]?.selectedAnswers || [];
      const updated = current.includes(answer) ? current.filter(a => a !== answer) : [...current, answer];
      setAnswers(prev => ({ ...prev, [questionIndex]: { selectedAnswers: updated } }));
    } else {
      setAnswers(prev => ({ ...prev, [questionIndex]: { selectedAnswer: answer } }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formattedAnswers = questions.map((_: any, i: number) => ({
        questionIndex: i,
        selectedAnswer: answers[i]?.selectedAnswer || "",
        selectedAnswers: answers[i]?.selectedAnswers || []
      }));
      const res = await learningApi.submitDiagnostic(assessmentId, formattedAnswers);
      setResult(res);
      setPhase("result");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit diagnostic");
    } finally {
      setLoading(false);
    }
  };

  const question = questions[currentQ];
  const currentAnswer = answers[currentQ];
  const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0;

  // ── Intro screen ──────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <VeritaBoxLayout>
        <PageContent>
          <div className="max-w-lg mx-auto py-12">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6">
              <ChevronLeft className="h-3.5 w-3.5" />Back
            </button>
            <div className="text-center mb-8">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Skill Diagnostic: {skillName}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                This assessment verifies your self-reported knowledge of <strong>{skillName}</strong>.
                Answer honestly  -  your roadmap adapts to your real skill level.
              </p>
            </div>
            <Surface className="p-5 space-y-3 mb-6">
              {[
                { label: "Questions", value: "Up to 10" },
                { label: "Time limit", value: "24 hours (not per question)" },
                { label: "Pass score", value: "60% to be Verified" },
                { label: "Retakes", value: "Available after review" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1 border-b border-border/50 last:border-b-0">
                  <span className="text-[12px] text-muted-foreground">{label}</span>
                  <span className="text-[12px] font-medium">{value}</span>
                </div>
              ))}
            </Surface>
            <div className="mb-5 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
              <p className="text-[11px] text-yellow-600 dark:text-yellow-400">
                Results will be saved permanently to your skill profile. Be honest  -  the roadmap adapts to help you learn what you actually need.
              </p>
            </div>
            <Button className="w-full gap-2" onClick={handleStart} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
              {loading ? "Preparing questions…" : "Start Assessment"}
            </Button>
          </div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────
  if (phase === "result" && result) {
    const statusMap: Record<string, { icon: any; color: string; message: string }> = {
      Verified:         { icon: CheckCircle2, color: "text-green-500", message: "Your skill is verified! Your roadmap will skip beginner content for this skill." },
      Proficient:       { icon: CheckCircle2, color: "text-primary",   message: "Excellent! You're proficient. Advanced content unlocked." },
      PartiallyVerified:{ icon: Cpu,          color: "text-orange-500", message: "Good foundation, but some gaps. The roadmap includes targeted review content." },
      NeedsLearning:    { icon: XCircle,      color: "text-destructive", message: "This skill needs work. Your roadmap will cover it from the beginning." },
    };
    const statusInfo = statusMap[result.result] || statusMap.NeedsLearning;
    const StatusIcon = statusInfo.icon;

    return (
      <VeritaBoxLayout>
        <PageContent>
          <div className="max-w-lg mx-auto space-y-5 py-8">
            <div className="text-center">
              <StatusIcon className={`h-12 w-12 mx-auto mb-3 ${statusInfo.color}`} />
              <h2 className="text-xl font-semibold">Assessment Complete</h2>
              <p className="text-3xl font-bold text-primary mt-2">{result.percentageScore}%</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <SkillStatusBadge status={
                  result.result === "PartiallyVerified" ? "Partially Verified" :
                  result.result === "NeedsLearning" ? "Needs Learning" :
                  result.result
                } />
              </div>
              <p className="text-sm text-muted-foreground mt-3 max-w-sm mx-auto">{statusInfo.message}</p>
            </div>

            <Surface className="p-4 text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Your Score</p>
              <p className="text-2xl font-bold">{result.totalScore} / {result.maxScore} pts</p>
            </Surface>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/roadmaps")}>
                View Roadmap
              </Button>
              <Button className="flex-1" onClick={() => navigate("/progress")}>
                View Skills
              </Button>
            </div>
          </div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  // ── Assessment screen ─────────────────────────────────────────────
  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="max-w-lg mx-auto space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Cpu className="h-4 w-4 text-primary" />
              <h1 className="text-lg font-semibold">Diagnostic: {skillName}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="flex-1 h-1" />
              <span className="text-[11px] text-muted-foreground shrink-0">{currentQ + 1}/{questions.length}</span>
            </div>
          </div>

          {question && (
            <Surface className="p-5">
              <p className="text-[13px] font-medium mb-4">{question.questionText}</p>
              <div className="space-y-2">
                {question.options?.map((option: string, oi: number) => {
                  const isSelected = question.type === "MultiSelect"
                    ? (currentAnswer?.selectedAnswers || []).includes(option)
                    : currentAnswer?.selectedAnswer === option;
                  return (
                    <button
                      key={oi}
                      onClick={() => handleSelect(currentQ, option, question.type)}
                      className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ isSelected ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
                    >
                      <div className={`h-4 w-4 rounded-${question.type === "MultiSelect" ? "sm" : "full"} border-2 shrink-0 flex items-center justify-center ${
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {isSelected && <span className="text-background text-[8px] font-bold">✓</span>}
                      </div>
                      {option}
                    </button>
                  );
                })}
              </div>
            </Surface>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0} className="gap-1">
              <ChevronLeft className="h-3.5 w-3.5" />Prev
            </Button>
            {currentQ < questions.length - 1 ? (
              <Button size="sm" onClick={() => setCurrentQ(q => q + 1)} className="gap-1 ml-auto">
                Next<ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={loading} className="gap-1 ml-auto">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {loading ? "Grading…" : "Submit"}
              </Button>
            )}
          </div>
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
