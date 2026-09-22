/**
 * RoadmapOnboarding.tsx — Multi-step onboarding wizard for roadmap generation.
 * All data (career goals, skills) comes from backend API — no hardcoding.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, SectionTitle } from "@/components/VeritaBox/UI";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { roadmapApi } from "@/lib/api";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Loader2, Sparkles, Check, Clock } from "lucide-react";

const STEPS = ["Career Goal", "Your Level", "Skills", "Schedule", "Review"];

export default function RoadmapOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Data from API
  const [careerGoals, setCareerGoals] = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Form state
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [selectedGoalTitle, setSelectedGoalTitle] = useState("");
  const [currentLevel, setCurrentLevel] = useState("Beginner");
  const [selfReportedSkills, setSelfReportedSkills] = useState<Record<string, boolean>>({});
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [targetDurationDays, setTargetDurationDays] = useState(90);
  const [preferredStyle, setPreferredStyle] = useState("Mixed");

  // Load career goals from API
  useEffect(() => {
    setLoadingGoals(true);
    roadmapApi.getCareerGoals()
      .then(setCareerGoals)
      .catch(() => toast.error("Failed to load career goals"))
      .finally(() => setLoadingGoals(false));
  }, []);

  // Load skills when career goal changes
  useEffect(() => {
    if (!selectedGoalId) return;
    setLoadingSkills(true);
    setSelfReportedSkills({});
    roadmapApi.getSkillsForGoal(selectedGoalId)
      .then(setAvailableSkills)
      .catch(() => toast.error("Failed to load skills"))
      .finally(() => setLoadingSkills(false));
  }, [selectedGoalId]);

  const canProceed = () => {
    if (step === 0) return !!selectedGoalId;
    if (step === 1) return !!currentLevel;
    if (step === 2) return true;  // skill selection is optional
    if (step === 3) return dailyMinutes >= 15 && daysPerWeek >= 1;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleGenerateRoadmap = async () => {
    setGenerating(true);
    try {
      // Save onboarding profile
      const skillsList = availableSkills.map(s => ({
        skillId: s._id,
        known: selfReportedSkills[s._id] || false
      }));

      await roadmapApi.saveOnboarding({
        careerGoalId: selectedGoalId,
        currentLevel,
        selfReportedSkills: skillsList,
        dailyMinutes,
        daysPerWeek,
        targetDurationDays,
        preferredStyle,
      });

      // Generate AI roadmap
      await roadmapApi.generateRoadmap();

      toast.success("Your personalized roadmap is ready!", { duration: 4000 });
      navigate("/roadmaps");
    } catch (err: any) {
      const msg = err?.message || "Failed to generate roadmap";
      if (msg.includes("already exists")) {
        navigate("/roadmaps");
      } else {
        toast.error(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-Powered Roadmap Generation
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Build Your Learning Roadmap</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tell us about your goals and we'll create a personalized roadmap using content from our platform.
            </p>
          </div>

          {/* Step progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
              <span className="text-[11px] font-medium text-primary">{STEPS[step]}</span>
            </div>
            <Progress value={((step + 1) / STEPS.length) * 100} className="h-1" />
            <div className="flex justify-between mt-2">
              {STEPS.map((s, i) => (
                <span key={i} className={`text-[9px] uppercase tracking-wider ${i <= step ? "text-primary" : "text-muted-foreground/50"}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Step content */}
          <Surface className="p-6">
            {/* Step 0: Career Goal */}
            {step === 0 && (
              <div>
                <SectionTitle>What is your career goal?</SectionTitle>
                <p className="text-[12px] text-muted-foreground mb-4">
                  Choose the role you want to work towards. Your roadmap will be tailored to this goal.
                </p>
                {loadingGoals ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading career goals…</span>
                  </div>
                ) : careerGoals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No career goals available yet. Please ask an admin to add some.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {careerGoals.map(goal => (
                      <button
                        key={goal._id}
                        onClick={() => { setSelectedGoalId(goal._id); setSelectedGoalTitle(goal.title); }}
                        className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ selectedGoalId === goal._id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
                      >
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center text-lg shrink-0 ${
                          selectedGoalId === goal._id ? "bg-primary/10" : "bg-secondary"
                        }`}>
                          🎯
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium">{goal.title}</p>
                          {goal.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{goal.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5">~{goal.suggestedDurationDays} days</p>
                        </div>
                        {selectedGoalId === goal._id && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Current Level */}
            {step === 1 && (
              <div>
                <SectionTitle>What is your current level?</SectionTitle>
                <p className="text-[12px] text-muted-foreground mb-4">
                  Be honest — this helps us personalize your roadmap. We'll verify skills through assessments.
                </p>
                <div className="space-y-2">
                  {[
                    { value: "Beginner", label: "Beginner", desc: "I'm just starting out. Little to no experience." },
                    { value: "Intermediate", label: "Intermediate", desc: "I know some basics. I've built small projects." },
                    { value: "Advanced", label: "Advanced", desc: "I have solid experience. Looking to fill gaps and specialize." },
                  ].map(l => (
                    <button
                      key={l.value}
                      onClick={() => setCurrentLevel(l.value)}
                      className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ currentLevel === l.value ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
                    >
                      <div className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors shrink-0 ${ currentLevel === l.value ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`} />
                      <div>
                        <p className="text-[13px] font-medium">{l.label}</p>
                        <p className="text-[11px] text-muted-foreground">{l.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                  <p className="text-[11px] text-yellow-600 dark:text-yellow-400">
                    ⚠️ Skills you self-report here are <strong>not verified</strong>. Diagnostic assessments are required for verification.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Skills */}
            {step === 2 && (
              <div>
                <SectionTitle>What do you already know?</SectionTitle>
                <p className="text-[12px] text-muted-foreground mb-4">
                  Check off skills you're familiar with. These will be marked as <strong>Self-Reported</strong> (not verified) until you take an assessment.
                </p>
                {loadingSkills ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading skills…</span>
                  </div>
                ) : availableSkills.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">
                    No skills defined for this career goal yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {availableSkills.map(skill => (
                      <label
                        key={skill._id}
                        className="flex items-center gap-3 p-2.5 rounded-md border border-border hover:border-foreground/20 hover:bg-accent/20 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selfReportedSkills[skill._id] || false}
                          onChange={e => setSelfReportedSkills(prev => ({ ...prev, [skill._id]: e.target.checked }))}
                          className="h-4 w-4 accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium">{skill.name}</p>
                          <p className="text-[11px] text-muted-foreground">{skill.category} · {skill.difficulty}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">~{skill.estimatedHours}h</span>
                      </label>
                    ))}
                  </div>
                )}
                {Object.values(selfReportedSkills).some(Boolean) && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    {Object.values(selfReportedSkills).filter(Boolean).length} skill(s) selected as self-reported. You can take diagnostic assessments later to verify them.
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Schedule */}
            {step === 3 && (
              <div>
                <SectionTitle>How much time can you commit?</SectionTitle>
                <p className="text-[12px] text-muted-foreground mb-5">
                  Your daily checklist will be generated based on this schedule.
                </p>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[12px] font-medium">Daily learning time</label>
                      <span className="text-[13px] font-mono text-primary font-semibold">{dailyMinutes} min/day</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={240}
                      step={15}
                      value={dailyMinutes}
                      onChange={e => setDailyMinutes(parseInt(e.target.value))}
                      className="w-full h-1.5 accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>15 min</span><span>1 hour</span><span>2 hours</span><span>4 hours</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[12px] font-medium">Days per week</label>
                      <span className="text-[13px] font-mono text-primary font-semibold">{daysPerWeek} days/week</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map(d => (
                        <button
                          key={d}
                          onClick={() => setDaysPerWeek(d)}
                          className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ daysPerWeek >= d ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium block mb-2">Target duration</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[30, 60, 90, 180].map(d => (
                        <button
                          key={d}
                          onClick={() => setTargetDurationDays(d)}
                          className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ targetDurationDays === d ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
                        >
                          {d < 30 ? `${d}d` : d < 60 ? "1 mo" : d < 90 ? "2 mo" : d < 180 ? "3 mo" : "6 mo"}
                          <br /><span className="text-[9px]">{d} days</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-md">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      Total learning time: <strong className="text-foreground">
                        {Math.round((targetDurationDays / 7) * daysPerWeek * dailyMinutes / 60)} hours
                      </strong> over {targetDurationDays} days
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div>
                <SectionTitle>Review your profile</SectionTitle>
                <p className="text-[12px] text-muted-foreground mb-5">
                  We'll use this to generate a personalized roadmap. You can regenerate later.
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Career Goal", value: selectedGoalTitle },
                    { label: "Current Level", value: currentLevel },
                    {
                      label: "Self-Reported Skills",
                      value: Object.entries(selfReportedSkills)
                        .filter(([, v]) => v)
                        .map(([id]) => availableSkills.find(s => s._id === id)?.name || id)
                        .join(", ") || "None selected"
                    },
                    { label: "Daily Learning Time", value: `${dailyMinutes} min/day` },
                    { label: "Days per Week", value: `${daysPerWeek} days` },
                    { label: "Target Duration", value: `${targetDurationDays} days` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between py-2 border-b border-border/60 last:border-b-0 gap-4">
                      <span className="text-[12px] text-muted-foreground shrink-0">{label}</span>
                      <span className="text-[12px] font-medium text-right">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 p-3 bg-primary/5 border border-primary/20 rounded-md">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-[12px]">
                      <strong>AI will generate your roadmap</strong> using only existing platform content. 
                      Every item will be validated against our database.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Surface>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 0 || generating}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-1.5"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerateRoadmap}
                disabled={generating}
                className="gap-1.5"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate My Roadmap
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
