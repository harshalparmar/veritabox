/**
 * Progress.tsx — Real database-backed progress dashboard.
 * Replaces hardcoded mockSkills with real API data.
 * Daily and Weekly views. Skill progression. Learning journey.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, SectionTitle, Stat } from "@/components/VeritaBox/UI";
import { SkillStatusBadge, SkillStatusDot } from "@/components/VeritaBox/SkillStatusBadge";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { progressApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2, TrendingUp, Target, Flame, Brain, Calendar, Clock, Trophy,
  CheckCircle2, BookOpen, Cpu, Code, Star, Shield
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { NeonPatternDefs } from "@/components/NeonPatternDefs";
import { useNeonCharts } from "@/hooks/use-neon-charts";
import { useMemo } from "react";

const EVENT_ICONS: Record<string, any> = {
  theory_completed:     BookOpen,
  quiz_passed:          Cpu,
  quiz_failed:          Cpu,
  practical_submitted:  Code,
  practical_verified:   CheckCircle2,
  diagnostic_completed: Target,
  skill_verified:       Star,
  roadmap_generated:    Brain,
  milestone_reached:    Trophy,
};

const EVENT_LABELS: Record<string, string> = {
  theory_viewed:        "Viewed theory",
  theory_completed:     "Completed theory",
  quiz_started:         "Started quiz",
  quiz_submitted:       "Submitted quiz",
  quiz_passed:          "Quiz passed",
  quiz_failed:          "Quiz failed",
  practical_submitted:  "Submitted practical",
  practical_verified:   "Practical verified",
  diagnostic_started:   "Started diagnostic",
  diagnostic_completed: "Diagnostic completed",
  skill_verified:       "Skill verified",
  roadmap_generated:    "Roadmap generated",
  roadmap_adapted:      "Roadmap adapted",
  checklist_completed:  "Daily checklist done",
  milestone_reached:    "Milestone reached",
};

export default function Progress() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [journey, setJourney] = useState<any>(null);
  const [daily, setDaily] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [assessments, setAssessments] = useState<any>(null);
  const [recap, setRecap] = useState<any>(null);
  const [peers, setPeers] = useState<any>(null);
  const [tab, setTab] = useState("overview");

  const { getFill } = useNeonCharts();

  const SKILL_COLORS: Record<string, string> = {
    "Not Started": "hsl(var(--muted-foreground))",
    "Self-Reported": "hsl(var(--info))",
    "Learning": "hsl(var(--warning))",
    "Verified": "hsl(var(--primary))",
    "Proficient": "hsl(var(--success))",
    "Mastered": "hsl(var(--success))"
  };

  const skillStatusData = useMemo(() => {
    const c: Record<string, number> = { "Not Started": 0, "Self-Reported": 0, "Learning": 0, "Verified": 0, "Proficient": 0, "Mastered": 0 };
    skills.forEach(s => { if (s.status in c) c[s.status]++; else c["Not Started"]++; });
    return Object.entries(c).filter(([_, count]) => count > 0).map(([status, count]) => ({
      name: status, value: count, fill: SKILL_COLORS[status]
    }));
  }, [skills]);

  const skillChartConfig: ChartConfig = Object.fromEntries(
    Object.entries(SKILL_COLORS).map(([k, color]) => [k, { label: k, color }])
  );

  const taskStatusData = useMemo(() => {
    return [
      { name: "Assigned", count: daily?.tasksAssigned || 0, fill: "hsl(var(--muted-foreground))" },
      { name: "Completed", count: daily?.tasksCompleted || 0, fill: "hsl(var(--success))" },
      { name: "Pending", count: daily?.tasksPending || 0, fill: "hsl(var(--warning))" },
      { name: "Carried Over", count: daily?.previousIncompleteTasks || 0, fill: "hsl(var(--danger))" }
    ].filter(d => d.count > 0);
  }, [daily]);

  const taskChartConfig: ChartConfig = {
    "Assigned": { label: "Assigned", color: "hsl(var(--muted-foreground))" },
    "Completed": { label: "Completed", color: "hsl(var(--success))" },
    "Pending": { label: "Pending", color: "hsl(var(--warning))" },
    "Carried Over": { label: "Carried Over", color: "hsl(var(--danger))" },
  };

  const skillsProficiencyData = useMemo(() => {
    return skills.map(s => ({
      name: s.skillName,
      proficiency: s.proficiency || 0,
      fill: "hsl(var(--primary))"
    }));
  }, [skills]);

  const dailyBreakdownData = useMemo(() => {
    if (!weekly?.dailyBreakdown) return [];
    return weekly.dailyBreakdown.map((day: any) => ({
      date: new Date(day.date).toLocaleDateString("en-IN", { weekday: "short" }),
      completed: day.completed || 0,
      assigned: day.assigned || 0
    }));
  }, [weekly]);

  const dailyBreakdownConfig: ChartConfig = {
    "completed": { label: "Completed", color: "hsl(var(--success))" },
    "assigned": { label: "Assigned", color: "hsl(var(--muted-foreground))" }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovData, skData, jrData, dData, wData, assData, recapData, peersData] = await Promise.all([
        progressApi.getOverall(),
        progressApi.getSkills(),
        progressApi.getJourney(),
        progressApi.getDailyDashboard(),
        progressApi.getWeeklyDashboard(),
        progressApi.getAssessments(),
        progressApi.getWeeklyRecap().catch(() => null),
        progressApi.getPeerComparison().catch(() => null),
      ]);
      setOverall(ovData);
      setSkills(skData);
      setJourney(jrData);
      setDaily(dData);
      setWeekly(wData);
      setAssessments(assData);
      setRecap(recapData);
      setPeers(peersData);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load progress data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <VeritaBoxLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading your progress…</span>
        </div>
      </VeritaBoxLayout>
    );
  }

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Progress & Analytics
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Your Learning Progress</h1>
            {overall?.careerGoal && (
              <p className="text-sm text-muted-foreground mt-1">
                Career Goal: <span className="font-medium text-foreground">{overall.careerGoal}</span>
              </p>
            )}
          </div>

          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              label="Overall Progress"
              value={`${overall?.percentage || 0}%`}
              hint={`${overall?.completedTopics || 0}/${overall?.totalTopics || 0} topics`}
              dotColor="hsl(var(--primary))"
            />
            <Stat
              label="Current Streak"
              value={`${daily?.currentStreak || 0} days`}
              dotColor="hsl(var(--warning))"
              icon={Flame}
            />
            <Stat
              label="Topics Done"
              value={overall?.completedTopics || 0}
              dotColor="hsl(var(--success))"
            />
            <Stat
              label="Skills Verified"
              value={skills.filter(s => ['Verified', 'Proficient', 'Mastered'].includes(s.status)).length}
              hint={`of ${skills.length} total`}
              dotColor="hsl(var(--primary))"
            />
          </div>


          {/* Tabs */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {[
              { id: "overview", label: "Overview" },
              { id: "skills", label: "Skills" },
              { id: "assessments", label: "Assessments" },
              { id: "daily", label: "Today" },
              { id: "weekly", label: "This Week" },
              { id: "journey", label: "Journey" },
              { id: "recap", label: "Recap" },
              { id: "peers", label: "Peers" }
            ].map((t) => (
              <button 
                key={t.id} 
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${
                  tab === t.id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Tabs value={tab} onValueChange={setTab}>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Stat label="Theory Completed" value={overall?.theoryTopicsCompleted ?? (daily?.theoryCompleted || 0)} icon={BookOpen} />
                <Stat label="Quizzes Passed" value={weekly?.quizzesPassed || 0} icon={Cpu} />
                <Stat label="Learning Today" value={`${daily?.learningTimeMinutes || 0}m`} icon={Clock} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden mb-6 border border-border">
                <NeonPatternDefs colors={[...Object.values(SKILL_COLORS), "hsl(var(--muted-foreground))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--danger))"]} />
                
                {/* Skills Distribution */}
                <Surface className="p-4 bg-background">
                  <p className="text-[13px] font-medium mb-1">Skills Distribution</p>
                  <p className="text-[12px] text-muted-foreground mb-4">Breakdown by verification status</p>
                  {skills.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-[12px]">No skills data available</div>
                  ) : (
                    <ChartContainer config={skillChartConfig} className="min-h-[200px] sm:min-h-[250px] w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie data={skillStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                          {skillStatusData.map((entry, i) => <Cell key={i} {...getFill(entry.fill)} />)}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  )}
                </Surface>

                {/* Today's Tasks Status */}
                <Surface className="p-4 bg-background">
                  <p className="text-[13px] font-medium mb-1">Today's Tasks</p>
                  <p className="text-[12px] text-muted-foreground mb-4">Daily checklist status distribution</p>
                  {taskStatusData.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-[12px]">No tasks today</div>
                  ) : (
                    <ChartContainer config={taskChartConfig} className="min-h-[200px] sm:min-h-[250px] w-full">
                      <BarChart data={taskStatusData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={0}>
                          {taskStatusData.map((entry, i) => <Cell key={i} {...getFill(entry.fill)} />)}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </Surface>
              </div>

              {!overall?.percentage && (
                <Surface className="p-5 text-center border-dashed">
                  <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium mb-1">No roadmap progress yet</p>
                  <p className="text-[12px] text-muted-foreground mb-3">
                    Complete your daily checklist tasks to track progress here.
                  </p>
                  <Button size="sm" onClick={() => navigate("/checklist")}>View Checklist</Button>
                </Surface>
              )}
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="space-y-4">
              <SectionTitle>Skill Progression</SectionTitle>
              {skills.length === 0 ? (
                <Surface className="p-8 text-center">
                  <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No skills tracked yet. Complete onboarding and start learning.</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate("/roadmaps")}>
                    Build Roadmap
                  </Button>
                </Surface>
              ) : (
                <Surface className="p-4 relative">
                  <NeonPatternDefs colors={["hsl(var(--primary))"]} />
                  <p className="text-[13px] font-medium mb-1">Proficiency Levels</p>
                  <p className="text-[12px] text-muted-foreground mb-4">Your evaluated capability per skill</p>
                  
                  <ChartContainer config={{ proficiency: { label: "Proficiency", color: "hsl(var(--primary))" } }} className="min-h-[300px] w-full">
                    <BarChart data={skillsProficiencyData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="proficiency" radius={0}>
                        {skillsProficiencyData.map((entry, i) => <Cell key={i} {...getFill(entry.fill)} />)}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </Surface>
              )}
            </TabsContent>

            {/* Assessments Tab */}
            <TabsContent value="assessments" className="space-y-4">
              <SectionTitle>Test & Assessment Performance</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Average Score" value={`${assessments?.averageScore || 0}%`} icon={Target} dotColor="hsl(var(--primary))" />
                <Stat label="Total Assessments" value={assessments?.totalTaken || 0} icon={Trophy} />
              </div>
              
              <Surface className="p-4">
                <p className="text-[12px] font-medium mb-3">Recent Assessment Outcomes</p>
                {assessments?.recent && assessments.recent.length > 0 ? (
                  <div className="space-y-3">
                    {assessments.recent.map((attempt: any, i: number) => (
                      <div key={i} className="flex items-center justify-between border-b border-border last:border-0 pb-2 last:pb-0">
                        <div>
                          <p className="text-[13px] font-medium">{attempt.topicTitle}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(attempt.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-[12px] font-mono font-medium ${attempt.passed ? 'text-green-500' : 'text-destructive'}`}>
                            {attempt.score}%
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${attempt.passed ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                            {attempt.passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground text-center py-4">No assessments taken yet.</p>
                )}
              </Surface>
            </TabsContent>

            {/* Daily Tab */}
            <TabsContent value="daily" className="space-y-4">
              <SectionTitle>Today's Dashboard</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Tasks Assigned" value={daily?.tasksAssigned || 0} icon={CheckCircle2} />
                <Stat label="Tasks Completed" value={daily?.tasksCompleted || 0} icon={CheckCircle2} />
                <Stat label="Learning Time" value={`${daily?.learningTimeMinutes || 0} min`} icon={Clock} />
                <Stat label="Day Streak" value={daily?.currentStreak || 0} icon={Flame} />
              </div>
              {daily?.theoryCompleted > 0 || daily?.quizzesCompleted > 0 || daily?.practicalsCompleted > 0 ? (
                <Surface className="p-4 space-y-2">
                  {[
                    { label: "Theory topics", value: daily?.theoryCompleted || 0, icon: BookOpen },
                    { label: "Quizzes", value: daily?.quizzesCompleted || 0, icon: Cpu },
                    { label: "Practicals", value: daily?.practicalsCompleted || 0, icon: Code },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-center justify-between py-1 border-b border-border/40 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[12px] text-muted-foreground">{label}</span>
                      </div>
                      <span className="text-[13px] font-medium">{value}</span>
                    </div>
                  ))}
                </Surface>
              ) : (
                <Surface className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No activity yet today.</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate("/checklist")}>
                    Start Today's Tasks
                  </Button>
                </Surface>
              )}
            </TabsContent>

            {/* Weekly Tab */}
            <TabsContent value="weekly" className="space-y-4">
              <SectionTitle>This Week's Summary</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Days Active" value={`${weekly?.completedDays || 0}/7`} icon={Calendar} />
                <Stat label="Tasks Done" value={weekly?.totalCompleted || 0} icon={CheckCircle2} />
                <Stat label="Quizzes Passed" value={weekly?.quizzesPassed || 0} icon={Cpu} />
                <Stat label="Learning Time" value={`${Math.round((weekly?.totalLearningMinutes || 0) / 60)}h`} icon={Clock} />
              </div>

              {weekly?.consistency !== undefined && (
                <Surface className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-medium">Weekly Consistency</p>
                    <p className="text-[13px] font-mono font-semibold text-primary">{weekly.weeklyConsistency || 0}%</p>
                  </div>
                  <ProgressBar value={weekly.weeklyConsistency || 0} className="h-2" />
                </Surface>
              )}

              {/* Daily breakdown */}
              {weekly?.dailyBreakdown?.length > 0 && (
                <Surface className="p-4 relative">
                  <NeonPatternDefs colors={["hsl(var(--success))", "hsl(var(--muted-foreground))"]} />
                  <p className="text-[13px] font-medium mb-1">Daily Breakdown</p>
                  <p className="text-[12px] text-muted-foreground mb-4">Tasks completed vs assigned this week</p>
                  <ChartContainer config={dailyBreakdownConfig} className="min-h-[250px] w-full">
                    <BarChart data={dailyBreakdownData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="completed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="assigned" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.3} />
                    </BarChart>
                  </ChartContainer>
                </Surface>
              )}
            </TabsContent>

            {/* Journey Tab */}
            <TabsContent value="journey" className="space-y-4">
              <SectionTitle>Learning Journey</SectionTitle>
              {journey?.milestones?.length > 0 && (
                <div className="space-y-2">
                  {journey.milestones.map((m: any, i: number) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                          m.status === "Completed" ? "bg-green-500/10 border border-green-500/30 text-green-500" :
                          m.status === "Active" ? "bg-primary/10 border border-primary/30 text-primary" :
                          "bg-secondary border border-border text-muted-foreground"
                        }`}>
                          {m.status === "Completed" ? "✓" : i + 1}
                        </div>
                        {i < journey.milestones.length - 1 && (
                          <div className={`w-px flex-1 my-1 ${m.status === "Completed" ? "bg-green-500/30" : "bg-border"}`} />
                        )}
                      </div>
                      <div className="pb-3 flex-1">
                        <p className={`text-[13px] font-medium ${m.status === "Completed" ? "text-green-500" : m.status === "Active" ? "text-primary" : "text-muted-foreground"}`}>
                          {m.title}
                        </p>
                        {m.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{m.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent events */}
              {journey?.recentEvents?.length > 0 && (
                <div className="mt-4">
                  <SectionTitle>Recent Activity</SectionTitle>
                  <div className="space-y-1.5">
                    {journey.recentEvents.slice(0, 10).map((event: any, i: number) => {
                      const Icon = EVENT_ICONS[event.eventType] || CheckCircle2;
                      return (
                        <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-b-0">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] truncate">{EVENT_LABELS[event.eventType] || event.eventType}</p>
                            {event.title && event.title !== event.eventType.replace(/_/g, ' ') && (
                              <p className="text-[10px] text-muted-foreground truncate">{event.title}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(event.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(!journey?.milestones?.length && !journey?.recentEvents?.length) && (
                <Surface className="p-8 text-center">
                  <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Your journey starts when you begin learning!</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate("/roadmaps")}>
                    Build My Roadmap
                  </Button>
                </Surface>
              )}
            </TabsContent>

            {/* Recap Tab */}
            <TabsContent value="recap" className="space-y-4">
              <SectionTitle>Weekly Recap</SectionTitle>
              {recap ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Tasks Done" value={recap.tasksCompleted || 0} icon={CheckCircle2} />
                    <Stat label="Learning Time" value={`${Math.round((recap.learningMinutes || 0) / 60)}h`} icon={Clock} />
                    <Stat label="Quizzes Passed" value={recap.quizzesPassed || 0} icon={Cpu} />
                    <Stat label="Topics Mastered" value={recap.topicsMastered || 0} icon={Star} />
                  </div>

                  {recap.currentPhase && (
                    <Surface className="p-4">
                      <p className="text-[12px] font-medium mb-2">Current Phase: {recap.currentPhase}</p>
                      <ProgressBar value={recap.phaseProgress || 0} className="h-2" />
                      <p className="text-[10px] text-muted-foreground mt-1">{recap.phaseProgress}% complete</p>
                    </Surface>
                  )}

                  {recap.achievements?.length > 0 && (
                    <Surface className="p-4">
                      <p className="text-[12px] font-medium mb-3">Achievements This Week</p>
                      <div className="flex flex-wrap gap-2">
                        {recap.achievements.map((a: any, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1.5 text-[11px] bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1">
                            <Trophy className="h-3 w-3" />
                            {a.label}
                          </span>
                        ))}
                      </div>
                    </Surface>
                  )}

                  {recap.highlights?.length > 0 && (
                    <Surface className="p-4">
                      <p className="text-[12px] font-medium mb-3">Recent Highlights</p>
                      <div className="space-y-1.5">
                        {recap.highlights.map((h: any, i: number) => {
                          const Icon = EVENT_ICONS[h.eventType] || CheckCircle2;
                          return (
                            <div key={i} className="flex items-center gap-2 py-1 text-[12px]">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="flex-1">{h.title}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(h.date).toLocaleDateString("en-IN", { weekday: "short" })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Surface>
                  )}
                </>
              ) : (
                <Surface className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No data for this week yet. Start learning!</p>
                </Surface>
              )}
            </TabsContent>

            {/* Peers Tab */}
            <TabsContent value="peers" className="space-y-4">
              <SectionTitle>Peer Comparison</SectionTitle>
              {peers?.available ? (
                <>
                  <Surface className="p-5 text-center">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Your Percentile</p>
                    <p className="text-4xl font-bold text-primary">{peers.percentile}%</p>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      You're ahead of {peers.percentile}% of {peers.peerCount} students on the same goal
                    </p>
                  </Surface>

                  <div className="grid grid-cols-3 gap-3">
                    <Stat label="Your Progress" value={`${peers.myProgress}%`} dotColor="hsl(var(--primary))" />
                    <Stat label="Peer Average" value={`${peers.avgPeerProgress}%`} dotColor="hsl(var(--muted-foreground))" />
                    <Stat label="Peer Median" value={`${peers.medianPeerProgress}%`} dotColor="hsl(var(--muted-foreground))" />
                  </div>

                  <Surface className="p-4">
                    <p className="text-[12px] font-medium mb-3">Peer Distribution</p>
                    <div className="space-y-2">
                      {[
                        { label: "0-25%", count: peers.distribution?.below25 || 0, color: "bg-destructive/60" },
                        { label: "25-50%", count: peers.distribution?.below50 || 0, color: "bg-warning/60" },
                        { label: "50-75%", count: peers.distribution?.below75 || 0, color: "bg-primary/60" },
                        { label: "75-100%", count: peers.distribution?.above75 || 0, color: "bg-green-500/60" },
                      ].map((bucket) => {
                        const maxCount = Math.max(peers.distribution?.below25 || 0, peers.distribution?.below50 || 0, peers.distribution?.below75 || 0, peers.distribution?.above75 || 0, 1);
                        return (
                          <div key={bucket.label} className="flex items-center gap-3">
                            <span className="text-[11px] text-muted-foreground w-14 shrink-0">{bucket.label}</span>
                            <div className="flex-1 h-5 bg-secondary rounded overflow-hidden">
                              <div className={`h-full ${bucket.color} rounded`} style={{ width: `${(bucket.count / maxCount) * 100}%` }} />
                            </div>
                            <span className="text-[11px] font-mono w-6 text-right">{bucket.count}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                      Showing {peers.peerCount} students with the same career goal. All data is anonymized.
                    </p>
                  </Surface>
                </>
              ) : (
                <Surface className="p-8 text-center">
                  <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{peers?.message || "Not enough peers for comparison yet."}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">We need at least 3 students on the same career goal.</p>
                </Surface>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
