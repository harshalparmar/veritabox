/**
 * SkillQuiz.tsx — Quiz taking interface for learning content.
 * Server-side grading — never trusts frontend score.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface } from "@/components/VeritaBox/UI";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { learningApi } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Cpu, Trophy, BookOpen } from "lucide-react";

export default function SkillQuiz() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();

  const [quizData, setQuizData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { selectedAnswer?: string; selectedAnswers?: string[] }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contentId) return;
    learningApi.getQuiz(contentId)
      .then(setQuizData)
      .catch(err => setError(err?.message || "Quiz not available"))
      .finally(() => setLoading(false));
  }, [contentId]);

  const handleSelect = (questionIndex: number, answer: string, type: string) => {
    if (type === "MultiSelect") {
      const current = answers[questionIndex]?.selectedAnswers || [];
      const updated = current.includes(answer)
        ? current.filter(a => a !== answer)
        : [...current, answer];
      setAnswers(prev => ({ ...prev, [questionIndex]: { selectedAnswers: updated } }));
    } else {
      setAnswers(prev => ({ ...prev, [questionIndex]: { selectedAnswer: answer } }));
    }
  };

  const handleSubmit = async () => {
    if (!contentId) return;

    // Check all questions answered
    const unanswered = quizData.questions.filter((_: any, i: number) => {
      const a = answers[i];
      return !a?.selectedAnswer && (!a?.selectedAnswers || a.selectedAnswers.length === 0);
    });
    if (unanswered.length > 0) {
      toast.warning(`Please answer all ${unanswered.length} remaining question(s).`);
      return;
    }

    setSubmitting(true);
    try {
      const formattedAnswers = quizData.questions.map((_: any, i: number) => ({
        questionIndex: i,
        selectedAnswer: answers[i]?.selectedAnswer || "",
        selectedAnswers: answers[i]?.selectedAnswers || []
      }));

      const res = await learningApi.submitQuiz(contentId, formattedAnswers);
      setResult(res);
      if (res.attempt.passed) {
        toast.success(`Quiz passed! ${res.attempt.percentageScore}%`, { duration: 4000 });
      } else {
        toast.error(`Quiz failed. ${res.attempt.percentageScore}% (need ${quizData.passScore}%)`, { duration: 4000 });
      }
    } catch (err: any) {
      if (err?.message?.includes("already passed")) {
        toast.info("You already passed this quiz!");
        navigate(-1);
      } else {
        toast.error(err?.message || "Failed to submit quiz");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <VeritaBoxLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading quiz…</span>
        </div>
      </VeritaBoxLayout>
    );
  }

  if (error) {
    return (
      <VeritaBoxLayout>
        <PageContent>
          <div className="max-w-lg mx-auto text-center py-16">
            <XCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  const questions = quizData?.questions || [];

  // ── Results screen ────────────────────────────────────────────────
  if (result) {
    const passed = result.attempt.passed;
    const score = result.attempt.percentageScore;
    return (
      <VeritaBoxLayout>
        <PageContent>
          <div className="max-w-lg mx-auto space-y-5">
            <div className="text-center py-6">
              {passed ? (
                <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              ) : (
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
              )}
              <h2 className="text-xl font-semibold">{passed ? "Quiz Passed!" : "Quiz Failed"}</h2>
              <p className="text-3xl font-bold text-primary mt-1">{score}%</p>
              <p className="text-sm text-muted-foreground mt-1">
                {result.attempt.totalScore}/{result.attempt.maxScore} points · Pass score: {quizData.passScore}%
              </p>
            </div>

            {/* Question-by-question feedback */}
            <div className="space-y-3">
              {result.scoredAnswers?.map((a: any, i: number) => (
                <Surface key={i} className={`p-4 ${a.isCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="flex items-start gap-2">
                    {a.isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-[13px] font-medium">{questions[i]?.questionText}</p>
                      {!a.isCorrect && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Correct: <span className="text-green-600 dark:text-green-400 font-medium">
                            {a.correctAnswer || (a.correctAnswers || []).join(", ")}
                          </span>
                        </p>
                      )}
                      {a.explanation && (
                        <p className="text-[11px] text-muted-foreground mt-1 italic">{a.explanation}</p>
                      )}
                    </div>
                  </div>
                </Surface>
              ))}
            </div>

            {/* Weak areas guidance */}
            {!result.attempt.passed && result.weakAreas?.length > 0 && (
              <Surface className="p-4 border-warning/30 bg-warning/5">
                <p className="text-[12px] font-medium mb-2 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-warning" />
                  Areas to Review
                </p>
                <div className="space-y-2">
                  {result.weakAreas.map((area: any, i: number) => (
                    <div key={i} className="text-[12px] text-muted-foreground flex items-start gap-2">
                      <span className="text-warning mt-0.5">→</span>
                      <div>
                        <p>{area.message}</p>
                        {area.link && (
                          <button onClick={() => navigate(area.link)} className="text-primary text-[11px] underline mt-0.5">
                            Review Theory →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                Back to Topic
              </Button>
              {!passed && (
                <Button className="flex-1" onClick={() => { setResult(null); setAnswers({}); setCurrentQ(0); }}>
                  Try Again
                </Button>
              )}
              {passed && (
                <Button className="flex-1" onClick={() => navigate("/checklist")}>
                  View Checklist
                </Button>
              )}
            </div>
          </div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  const question = questions[currentQ];
  const currentAnswer = answers[currentQ];
  const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0;

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="max-w-lg mx-auto space-y-5">
          {/* Header */}
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-3"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <div className="flex items-center gap-2 mb-1.5">
              <Cpu className="h-4 w-4 text-primary" />
              <h1 className="text-lg font-semibold">{quizData.title} — Quiz</h1>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="flex-1 h-1" />
              <span className="text-[11px] text-muted-foreground shrink-0">
                {currentQ + 1}/{questions.length}
              </span>
            </div>
          </div>

          {/* Question */}
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
              {question.type === "MultiSelect" && (
                <p className="text-[10px] text-muted-foreground mt-2">Select all that apply</p>
              )}
            </Surface>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
              disabled={currentQ === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>

            {currentQ < questions.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setCurrentQ(q => q + 1)}
                className="gap-1 ml-auto"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
                className="gap-1 ml-auto"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {submitting ? "Submitting…" : "Submit Quiz"}
              </Button>
            )}
          </div>

          {/* Attempt info */}
          {quizData && (
            <p className="text-center text-[10px] text-muted-foreground">
              Attempt {quizData.attemptsUsed + 1} of {quizData.maxAttempts} · Pass score: {quizData.passScore}%
            </p>
          )}
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
