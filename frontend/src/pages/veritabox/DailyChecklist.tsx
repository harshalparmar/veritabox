/**
 * DailyChecklist.tsx  -  Real personalized daily learning checklist.
 * All data from backend  -  no hardcoded tasks. Carry-forward, task types, backend validation.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, SectionTitle, Stat } from "@/components/veritabox/UI";
import { TaskCard } from "@/components/veritabox/TaskCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { checklistApi } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, CheckSquare, Flame, Clock, AlertCircle, Trophy } from "lucide-react";

export default function DailyChecklist() {
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ type: string; title: string } | null>(null);

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checklistApi.getChecklist();
      setChecklist(data);
    } catch (err: any) {
      if (err?.message?.includes("No roadmap")) {
        setError("no-roadmap");
      } else {
        setError(err?.message || "Failed to load checklist");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (itemId: string) => {
    if (!checklist) return;
    try {
      const result = await checklistApi.startTask(itemId);
      setChecklist((prev: any) => ({
        ...prev,
        items: prev.items.map((i: any) =>
          i._id === itemId ? { ...i, status: "InProgress", startedAt: new Date().toISOString() } : i
        )
      }));
    } catch { /* ignore */ }
  };

  const handleCompleteTask = async (itemId: string) => {
    if (!checklist || completing) return;
    setCompleting(itemId);
    try {
      const result = await checklistApi.completeTask(itemId);
      setChecklist(result.checklist || result);
      toast.success("Task completed!");

      // Check for milestone celebrations from the updated checklist
      const updatedChecklist = result.checklist || result;
      if (updatedChecklist.isCompleted && !checklist?.isCompleted) {
        setCelebration({ type: 'day', title: 'Daily Checklist Complete!' });
        setTimeout(() => setCelebration(null), 4000);
      }
    } catch (err: any) {
      const msg = err?.message || "";
      const item = checklist.items.find((i: any) => i._id === itemId);
      if (msg.includes("quiz") || msg.includes("assessment") || msg.includes("Quiz")) {
        toast.info("Pass the quiz/assessment to complete this task.");
        if (item?.contentId) navigate(`/learning/quiz/${item.contentId}`);
      } else if (msg.includes("practical") || msg.includes("Practical")) {
        toast.info("Submit your practical work first.");
        if (item?.contentId) navigate(`/learning/topic/${item.contentId}`);
      } else if (msg.includes("theory") || msg.includes("Theory")) {
        toast.info("Complete the theory section first.");
        if (item?.contentId) navigate(`/learning/topic/${item.contentId}`);
      } else if (msg.includes("Diagnostic") || msg.includes("diagnostic")) {
        toast.info("Complete the diagnostic assessment first.");
      } else {
        toast.error(msg || "Failed to complete task");
      }
    } finally {
      setCompleting(null);
    }
  };

  const handleNavigateToTask = (item: any) => {
    handleStartTask(item._id).then(() => {
      if (item.taskType === "Quiz" && item.contentId) {
        navigate(`/learning/quiz/${item.contentId}`);
      } else if (item.contentId) {
        navigate(`/learning/topic/${item.contentId}`);
      } else if (item.taskType === "Diagnostic") {
        navigate(`/diagnostic?skillId=${item.skillId || ""}&skillName=${encodeURIComponent(item.module || "Skill")}`);
      }
    });
  };

  // Computed stats
  const items = checklist?.items || [];
  const totalItems = items.length;
  const completedItems = items.filter((i: any) => i.status === "Completed").length;
  const pendingItems = items.filter((i: any) => i.status !== "Completed" && i.status !== "Skipped");
  const carriedItems = items.filter((i: any) => i.isCarriedForward);
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="space-y-6">
          {/* Celebration overlay */}
          {celebration && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
                 onClick={() => setCelebration(null)}>
              <div className="text-center p-8 animate-in zoom-in-95 duration-500">
                <div className="text-6xl mb-4">{celebration.type === 'day' ? '🏆' : '🎉'}</div>
                <h2 className="text-2xl font-bold mb-2">{celebration.title}</h2>
                <p className="text-muted-foreground text-sm">Great work! Keep the momentum going.</p>
                <p className="text-[10px] text-muted-foreground mt-4">Click anywhere to dismiss</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">
                <CheckSquare className="h-3.5 w-3.5" />
                Daily Checklist
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
              </h1>
            </div>
            {checklist?.streakCount > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-md px-3 py-1.5">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-[12px] font-semibold text-orange-500">{checklist.streakCount} day streak</span>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground text-sm">Loading your checklist…</span>
            </div>
          )}

          {/* Error: no roadmap */}
          {!loading && error === "no-roadmap" && (
            <div className="max-w-md mx-auto py-12 text-center">
              <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">No roadmap yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Create a personalized roadmap first and we'll generate your daily checklist automatically.
              </p>
              <Button onClick={() => navigate("/roadmaps/onboarding")} className="gap-2">
                Build My Roadmap
              </Button>
            </div>
          )}

          {/* Other error */}
          {!loading && error && error !== "no-roadmap" && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm text-destructive font-medium">{error}</p>
                <button onClick={loadChecklist} className="text-[11px] text-destructive underline mt-0.5">Retry</button>
              </div>
            </div>
          )}

          {/* Checklist data */}
          {!loading && !error && checklist && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Tasks Today" value={totalItems} dotColor="hsl(var(--primary))" />
                <Stat label="Completed" value={completedItems} hint={`${progressPercent}%`} dotColor="hsl(var(--success))" />
                <Stat
                  label="Est. Time"
                  value={`${checklist.totalMinutes || 0}m`}
                  hint={`${checklist.completedMinutes || 0}m done`}
                  dotColor="hsl(var(--warning))"
                />
                <Stat
                  label="Carried Over"
                  value={carriedItems.length}
                  hint={carriedItems.length > 0 ? "From yesterday" : "All fresh!"}
                  dotColor={carriedItems.length > 0 ? "hsl(var(--destructive))" : "hsl(var(--success))"}
                />
              </div>

              {/* Progress bar */}
              <Surface className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-medium">Today's Progress</p>
                  <p className="text-[13px] font-mono font-semibold text-primary">{completedItems}/{totalItems}</p>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {checklist.isCompleted && (
                  <div className="flex items-center gap-2 mt-2 text-[12px] text-green-500">
                    <Trophy className="h-3.5 w-3.5" />
                    All tasks completed for today! Great work.
                  </div>
                )}
              </Surface>

              {/* Carried-forward tasks */}
              {carriedItems.length > 0 && (
                <div>
                  <SectionTitle>
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      Incomplete from Yesterday
                    </span>
                  </SectionTitle>
                  <div className="space-y-2">
                    {carriedItems.filter((i: any) => i.status !== "Completed").map((item: any) => (
                      <TaskCard
                        key={item._id}
                        item={item}
                        onStart={handleStartTask}
                        onComplete={handleCompleteTask}
                        onNavigate={handleNavigateToTask}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Today's tasks */}
              <div>
                <SectionTitle>Today's Learning Tasks</SectionTitle>
                {pendingItems.filter((i: any) => !i.isCarriedForward).length === 0 && completedItems === totalItems && totalItems > 0 ? (
                  <Surface className="p-8 text-center border-green-500/30">
                    <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-500">All tasks complete! 🎉</p>
                    <p className="text-[12px] text-muted-foreground mt-1">Come back tomorrow for new tasks.</p>
                  </Surface>
                ) : totalItems === 0 ? (
                  <Surface className="p-8 text-center">
                    {(checklist as any)?.isRestDay ? (
                      <>
                        <div className="text-4xl mb-3">☕</div>
                        <h3 className="text-sm font-semibold mb-1">Rest Day</h3>
                        <p className="text-[12px] text-muted-foreground">
                          Today is a scheduled rest day based on your {(checklist as any)?.daysPerWeek}-day/week plan.
                          Recharge and come back tomorrow!
                        </p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/progress")}>
                          View Your Progress
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          No tasks scheduled for today. Check your roadmap or come back tomorrow.
                        </p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/roadmaps")}>
                          View Roadmap
                        </Button>
                      </>
                    )}
                  </Surface>
                ) : (
                  <div className="space-y-2">
                    {items.filter((i: any) => !i.isCarriedForward).map((item: any) => (
                      <TaskCard
                        key={item._id}
                        item={item}
                        onStart={handleStartTask}
                        onComplete={handleCompleteTask}
                        onNavigate={handleNavigateToTask}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
