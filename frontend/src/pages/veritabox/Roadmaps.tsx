/**
 * Roadmaps.tsx  -  Main roadmap overview page.
 * Checks onboarding status, shows roadmap with phases/modules/topics.
 * All data from API  -  no mock/hardcoded content.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { SectionTitle, Stat, Surface } from "@/components/veritabox/UI";
import { RoadmapPhaseCard } from "@/components/veritabox/RoadmapPhaseCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { roadmapApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2, Map, Sparkles, RefreshCw, Target, CheckCircle2, Calendar, TrendingUp, AlertCircle
} from "lucide-react";

export default function Roadmaps() {
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState<any>(null);
  const [onboarding, setOnboarding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [adapting, setAdapting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [onboardingData] = await Promise.all([
        roadmapApi.getOnboarding().catch(() => null)
      ]);
      setOnboarding(onboardingData);

      if (onboardingData?.isComplete) {
        const roadmapData = await roadmapApi.getRoadmap().catch(() => null);
        setRoadmap(roadmapData);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load roadmap data");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const result = await roadmapApi.generateRoadmap({ regenerate: true });
      setRoadmap(result);
      toast.success("Roadmap regenerated with latest AI personalization.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to regenerate roadmap");
    } finally {
      setRegenerating(false);
    }
  };

  const loadRoadmap = async () => {
    try {
      const roadmapData = await roadmapApi.getRoadmap().catch(() => null);
      setRoadmap(roadmapData);
    } catch { /* ignore */ }
  };

  const handleAdapt = async () => {
    setAdapting(true);
    try {
      const result = await roadmapApi.adaptRoadmap();
      if (result.adapted && result.adaptations?.length > 0) {
        result.adaptations.forEach((a: any) => toast.info(a.message, { duration: 5000 }));
        loadRoadmap(); // reload to see changes
      } else {
        toast.info("Your roadmap is already well-optimized for your pace.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to adapt roadmap");
    } finally {
      setAdapting(false);
    }
  };

  const handleSelectTopic = (_phase: any, _module: any, topic: any) => {
    // Navigation from Roadmap explicitly disabled.
    // The roadmap should only act as a tracker, not a navigation menu.
  };

  // ── Not started onboarding ────────────────────────────────────────
  if (!loading && !onboarding?.isComplete) {
    return (
      <VeritaBoxLayout>
        <PageContent>
          <div className="max-w-lg mx-auto py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Map className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Start Your Learning Journey</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed">
              Tell us about your career goals and we'll build you a personalized AI-powered roadmap 
              using our platform's real courses, theories, and practice challenges.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-8 text-left">
              {[
                { icon: "🎯", title: "Set Your Goal", desc: "Choose your career path" },
                { icon: "🧠", title: "AI Analysis", desc: "Personalized to your level" },
                { icon: "📋", title: "Daily Plans", desc: "Tasks generated each day" },
              ].map(item => (
                <Surface key={item.title} className="p-3 text-center">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <p className="text-[12px] font-medium">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </Surface>
              ))}
            </div>
            <Button onClick={() => navigate("/roadmaps/onboarding")} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Get Started
            </Button>
          </div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  // ── Has onboarding but no roadmap yet ─────────────────────────────
  if (!loading && onboarding?.isComplete && !roadmap) {
    return (
      <VeritaBoxLayout>
        <PageContent>
          <div className="max-w-lg mx-auto py-16 text-center">
            <h2 className="text-xl font-semibold tracking-tight">Generate Your Roadmap</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Your onboarding profile is complete. Click below to generate your AI-personalized roadmap.
            </p>
            <Button onClick={handleRegenerate} disabled={regenerating} className="gap-2">
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {regenerating ? "Generating…" : "Generate Roadmap"}
            </Button>
          </div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  return (
    <VeritaBoxLayout>
      <PageContent>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">Loading your roadmap…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : roadmap ? (
          <div className="space-y-6">
            {/* Roadmap header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">
                  <Map className="h-3.5 w-3.5" />
                  Learning Roadmap
                  {roadmap.generatedBy === "ai" && (
                    <Badge variant="outline" className="text-[9px] border-primary/30 text-primary gap-1 py-0">
                      <Sparkles className="h-2.5 w-2.5" /> AI Generated
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {roadmap.careerGoalTitle || roadmap.careerGoal?.title || "Your Roadmap"}
                </h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleAdapt} disabled={adapting} className="gap-1.5">
                  {adapting ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
                  {adapting ? "Optimizing…" : "Optimize Pace"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Regenerate
                </Button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat
                label="Overall Progress"
                value={`${roadmap.progressPercentage || 0}%`}
                dotColor="hsl(var(--primary))"
              />
              <Stat
                label="Topics Completed"
                value={`${roadmap.completedTopics || 0}/${roadmap.totalTopics || 0}`}
                dotColor="hsl(var(--success))"
              />
              <Stat
                label="Phases"
                value={roadmap.phases?.length || 0}
                hint={`${roadmap.phases?.filter((p: any) => p.status === "Completed").length || 0} completed`}
                dotColor="hsl(var(--warning))"
              />
              <Stat
                label="Est. Completion"
                value={roadmap.estimatedCompletionDate
                  ? new Date(roadmap.estimatedCompletionDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                  : "–"}
                dotColor="hsl(var(--info))"
              />
            </div>

            {/* Overall progress bar */}
            <Surface className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-medium">Overall Progress</p>
                <p className="text-[13px] font-mono font-semibold text-primary">{roadmap.progressPercentage || 0}%</p>
              </div>
              <Progress value={roadmap.progressPercentage || 0} className="h-2" />
              {roadmap.isCompleted && (
                <div className="flex items-center gap-2 mt-2 text-[12px] text-green-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Roadmap completed!
                </div>
              )}
            </Surface>

            {/* Phases */}
            <div>
              <SectionTitle>Roadmap Phases</SectionTitle>
              <div className="space-y-3">
                {roadmap.phases?.length > 0 ? (
                  roadmap.phases.map((phase: any, pi: number) => (
                    <RoadmapPhaseCard
                      key={pi}
                      phase={phase}
                      phaseIndex={pi}
                      onSelectTopic={handleSelectTopic}
                    />
                  ))
                ) : (
                  <Surface className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No phases found in this roadmap. Try regenerating.
                    </p>
                    <Button variant="outline" size="sm" onClick={handleRegenerate} className="mt-3">
                      Regenerate
                    </Button>
                  </Surface>
                )}
              </div>
            </div>

            {/* Generation context */}
            {roadmap.generationContext && (
              <Surface className="p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Personalization Context
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Level", value: roadmap.generationContext.level },
                    { label: "Daily", value: `${roadmap.generationContext.dailyMinutes}min` },
                    { label: "Days/week", value: roadmap.generationContext.daysPerWeek },
                    { label: "Target", value: `${roadmap.generationContext.targetDurationDays}d` },
                  ].map(({ label, value }) => (
                    <span key={label} className="text-[10px] bg-secondary border border-border rounded px-2 py-0.5">
                      <span className="text-muted-foreground">{label}: </span>
                      <span className="font-medium">{value}</span>
                    </span>
                  ))}
                </div>
              </Surface>
            )}
          </div>
        ) : null}
      </PageContent>
    </VeritaBoxLayout>
  );
}
