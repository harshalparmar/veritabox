import { useParams, Link } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Pill, Stat } from "@/components/veritabox/UI";
import {
  Terminal, Shield, Users, Trophy, AlertTriangle,
  Loader2, ArrowRight, Zap, Target, CheckCircle2, ChevronRight, MapPin, ExternalLink,
  Lock, AlertOctagon, Expand, Clock, RefreshCw, Smartphone
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import HackathonLeaderboard from "@/components/veritabox/HackathonLeaderboard";
import { useSecurityEnforcement } from "@/hooks/useSecurityEnforcement";
import { useWebcamProctoring } from "@/hooks/useWebcamProctoring";
import { useLockdown } from "@/hooks/useLockdown";
import { useProctorStore } from "@/store/useProctorStore";
import { useSocket } from "@/contexts/SocketContext";

// Helpers
function normalizeId(val: any): string {
  if (!val) return '';
  return typeof val === 'object' ? String(val._id ?? '') : String(val);
}

function useCountdown(endTime: string | null | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endTime) { setRemaining(null); return; }
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [endTime]);

  if (remaining === null) return null;
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return { remaining, formatted: h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`, isWarning: remaining < 300000, isCritical: remaining < 60000 };
}

// Mobile guard
function MobileGuard({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <Smartphone className="h-12 w-12 text-warning mx-auto" />
          <h2 className="text-[18px] font-bold uppercase text-warning">Mobile Not Supported</h2>
          <p className="text-[13px] text-muted-foreground max-w-[280px]">
            The Arena terminal requires a desktop browser. Please switch to a laptop or desktop to participate.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function HackathonArena() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [securityInitialized, setSecurityInitialized] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<{ questionId: string; answer: string } | null>(null);
  const [offlineNotes, setOfflineNotes] = useState("");
  const [offlineLink, setOfflineLink] = useState("");
  const [onlineMembers, setOnlineMembers] = useState<Set<string>>(new Set());

  // Refs for auto-save (avoid stale closures)
  const selectedOptionRef = useRef<string | null>(null);
  const currentQuestionIndexRef = useRef<number>(0);
  const draftAnswersRef = useRef<any[]>([]);

  const { getSession, resetProctoring } = useProctorStore();
  const session = getSession(id!);
  const isLockdown = session.isLockdown;

  // Clear any persisted strike state from previous sessions on fresh arena mount
  useEffect(() => {
    resetProctoring(id!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 1. Fetch Team/Dashboard Status
  const { data: team, isLoading: loadingTeam, error: teamError } = useQuery<any, any>({
    queryKey: ["hackathon-team", id],
    queryFn: () => hackathonsApi.getTeamStatus(id!),
    enabled: !!id,
    refetchInterval: 15000,
  });

  // 2. Fetch Active Questions
  const { data: questionData, isLoading: loadingQuestions, refetch: refetchQuestions, error: questionError } = useQuery({
    queryKey: ["active-questions", id],
    queryFn: () => hackathonsApi.getActiveQuestions(id!),
    enabled: !!team && !team.isDisqualified && securityInitialized && !isLockdown,
    retry: 1,
  });

  const isActiveSolver = normalizeId(team?.leader) === normalizeId(user?._id);
  const questions = questionData?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const roundInfo = questionData?.roundInfo;
  const isFinished = currentQuestionIndex >= questions.length && questions.length > 0;
  const isOffline = roundInfo?.type && roundInfo.type !== 'Online MCQ';

  // Security & Proctoring Hooks
  const { requestFullscreen, exitFullscreen, strikes } = useSecurityEnforcement(id!, securityInitialized);
  const { startProctoring, stopStream } = useWebcamProctoring(
    id!,
    team?.currentRound || 1,
    roundInfo?.snapshotInterval || 0
  );

  // Countdown timer
  const countdown = useCountdown(roundInfo?.endTime);

  // Track which questionIds have been answered in the CURRENT round
  const currentRoundAnsweredCount = questions.filter((q: any) => 
    (team?.submissions || []).some((s: any) => String(s.questionId) === String(q._id))
  ).length;

  const answeredIds = new Set<string>((team?.submissions || []).map((s: any) => String(s.questionId)));
  const missionSlug = team?.hackathonId?.slug || id;

  // Keep refs in sync
  useEffect(() => { selectedOptionRef.current = selectedOption; }, [selectedOption]);
  useEffect(() => { currentQuestionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);
  useEffect(() => {
    draftAnswersRef.current = questionData?.resumeData?.draftAnswers || [];
  }, [questionData]);

  const submitAnswerMutation = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: string }) =>
      hackathonsApi.submitAnswer(id!, { questionId, answer }),
    onSuccess: (res: any) => {
      toast.success(res.message);
      setSelectedOption(null);
      setPendingAnswer(null);
      setCurrentQuestionIndex(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["hackathon-team", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Submission failed. Use Retry to resend.");
    },
  });

  const handleSubmitAnswer = useCallback((answer: string) => {
    const q = questions[currentQuestionIndexRef.current];
    if (!q) return;
    const payload = { questionId: q._id, answer };
    setPendingAnswer(payload);
    submitAnswerMutation.mutate(payload);
  }, [questions, submitAnswerMutation]);

  const finalizeRoundMutation = useMutation({
    mutationFn: () => hackathonsApi.finalizeRound(id!),
    onSuccess: () => {
      setShowFinalizeConfirm(false);
      // Mission concluded: decommission enforcement before extraction
      stopStream();
      exitFullscreen();
      queryClient.invalidateQueries({ queryKey: ["hackathon-team", id] });
      // Return to base
      window.location.href = `/hackathons/${missionSlug}`;
    },
  });

  // 3A  -  Submit offline deliverable (notes + link) before finalizing
  const submitOfflineDeliverableMutation = useMutation({
    mutationFn: (data: { roundNumber: number; notes: string; link: string }) =>
      hackathonsApi.submitOfflineDeliverable(id!, data),
    onSuccess: () => {
      toast.success("Deliverable submitted", { description: "Your notes and link have been stored. Proceeding to finalize round." });
      setShowFinalizeConfirm(true);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit deliverable.");
    },
  });

  const syncProgressMutation = useMutation({
    mutationFn: (data: { draftAnswers: any[]; lastViewedIndex: number; roundNumber: number }) =>
      hackathonsApi.syncProgress(id!, data),
  });

  // 3. Restore State on Load
  useEffect(() => {
    if (questionData?.resumeData && securityInitialized) {
      const { lastViewedIndex } = questionData.resumeData;
      if (currentQuestionIndex === 0 && lastViewedIndex > 0) {
        setCurrentQuestionIndex(lastViewedIndex);
      }
    }
  }, [questionData, securityInitialized]);

  // 4. Auto-Save Logic (Debounced)  -  uses refs to avoid stale closure
  useEffect(() => {
    if (!securityInitialized || isFinished || isLockdown || !isActiveSolver) return;

    const timer = setTimeout(() => {
      const drafts = [...draftAnswersRef.current];
      const opt = selectedOptionRef.current;
      const idx = currentQuestionIndexRef.current;
      const q = questions[idx];

      if (opt && q) {
        const existingIdx = drafts.findIndex((d: any) => d.questionId === q._id);
        const entry = { questionId: q._id, selectedOption: opt };
        if (existingIdx >= 0) drafts[existingIdx] = entry;
        else drafts.push(entry);
      }

      syncProgressMutation.mutate({
        draftAnswers: drafts,
        lastViewedIndex: idx,
        roundNumber: team?.currentRound || 1
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [selectedOption, currentQuestionIndex, securityInitialized, isFinished, isLockdown, isActiveSolver]);

  // Auto-Submit on 6 strikes
  useEffect(() => {
    if (strikes >= 6 && !isLockdown) {
      finalizeRoundMutation.mutate();
    }
  }, [strikes, isLockdown]);

  // Fail-safe cleanup & redirect on disqualification
  useEffect(() => {
    if (team?.isDisqualified && securityInitialized) {
      stopStream();
      exitFullscreen();
      // Ensure they don't get stuck in the terminal overlay
      setTimeout(() => {
        window.location.href = `/hackathons/${missionSlug}`;
      }, 3000);
    }
  }, [team?.isDisqualified, securityInitialized, stopStream, exitFullscreen, missionSlug]);

  // Socket: live round/question updates + presence
  useEffect(() => {
    if (!socket || !id) return;
    const onQuestionsUpdated = () => refetchQuestions();
    const onRoundStatusChanged = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["hackathon-team", id] });
      queryClient.invalidateQueries({ queryKey: ["active-questions", id] });
      if (data?.status === 'Closed') {
        toast.warning("Round has been closed by Mission Control.");
        // Immediate extraction
        stopStream();
        exitFullscreen();
        window.location.href = `/hackathons/${missionSlug}`;
      }
    };
    const onPresenceUpdate = (data: any) => {
      if (data.hackathonId === id) {
        setOnlineMembers(new Set((data.online as any[]).map(u => String(u.userId))));
      }
    };
    socket.on('QUESTIONS_UPDATED', onQuestionsUpdated);
    socket.on('ROUND_STATUS_CHANGED', onRoundStatusChanged);
    socket.on('presence_update', onPresenceUpdate);
    return () => {
      socket.off('QUESTIONS_UPDATED', onQuestionsUpdated);
      socket.off('ROUND_STATUS_CHANGED', onRoundStatusChanged);
      socket.off('presence_update', onPresenceUpdate);
    };
  }, [socket, id, refetchQuestions, queryClient]);

  const { isFocusLost } = useLockdown(securityInitialized && !isFinished && !isLockdown);

  const handleInitializeSecurity = async () => {
    await requestFullscreen();
    if (isActiveSolver) await startProctoring();
    setSecurityInitialized(true);
    toast.success("SECURITY ENFORCED", {
      description: "Mission environment synchronized. Proctoring active.",
    });
  };

  if (loadingTeam) {
    return (
      <MobileGuard>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileGuard>
    );
  }

  if (!team) {
    return (
      <MobileGuard>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-[600px] px-6 py-20 text-center">
            <h2 className="text-[20px] font-semibold italic text-destructive">UNAUTHORIZED ACCESS</h2>
            <p className="mt-2 text-muted-foreground">Squadron registration not found in this segment.</p>
            <div className="text-[10px] text-muted-foreground/40 mt-4 uppercase font-mono tracking-widest space-y-1">
              <p>Mission: {id}</p>
              <p>Operative: {user?._id}</p>
              {teamError?.response?.data?.message && (
                <p className="text-destructive mt-2">{teamError.response.data.message}</p>
              )}
              {teamError?.response?.data?.debug?.hasTeamsInOtherMissions && (
                <p className="text-warning">Note: You have squadrons in other mission segments, but not this one.</p>
              )}
            </div>
            <Link to={`/hackathons/${missionSlug}`} className="text-primary hover:underline mt-6 inline-block uppercase text-[11px] font-bold tracking-widest">Return to Brief</Link>
          </div>
        </div>
      </MobileGuard>
    );
  }

  return (
    <MobileGuard>
      <div className="min-h-screen bg-background flex flex-col">
        {/* --- CUSTOM ARENA HUD --- */}
        <div className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-[60]">
          <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ 
                  background: team.isDisqualified || isLockdown ? "hsl(var(--destructive))" : "hsl(var(--primary))", 
                  boxShadow: `0 0 8px ${team.isDisqualified || isLockdown ? "hsl(var(--destructive))" : "hsl(var(--primary))"}` 
                }} />
                <h1 className="text-[16px] font-bold uppercase tracking-tight">Mission: {team.teamName}</h1>
              </div>
              <span className="h-4 w-px bg-border/40" />
              <span className="text-[11px] text-muted-foreground uppercase font-mono tracking-wider">{roundInfo?.title || "Active Engagement"}</span>
            </div>
            
            <div className="flex items-center gap-8">
              {countdown && (
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Time Remaining</span>
                  <span className={`text-[18px] font-mono font-bold ${countdown.isCritical ? "text-destructive animate-pulse" : countdown.isWarning ? "text-warning" : "text-primary"}`}>
                    {countdown.formatted}
                  </span>
                </div>
              )}
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Squad Score</span>
                <span className="text-[18px] font-mono font-bold text-foreground leading-none">{team.score?.toLocaleString() || "0"}</span>
              </div>
              <button 
                onClick={async () => {
                  if ((team.abortCount || 0) < 2) {
                    try {
                      // Decommission environment
                      stopStream();
                      await exitFullscreen();
                      await hackathonsApi.logAbort(id!);
                      window.location.href = `/hackathons/${missionSlug}`;
                    } catch (err) {
                      console.error("Abort sequence failed", err);
                      window.location.href = `/hackathons/${missionSlug}`;
                    }
                  }
                }}
                disabled={(team.abortCount || 0) >= 2}
                className="h-9 px-4 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 Abort Mission
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-6">
          <div className="grid lg:grid-cols-3 gap-6 relative">

            {/* OVERLAY: Security Init */}
            {!securityInitialized && !isOffline && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />
                <Surface className="relative z-10 max-w-md w-full p-8 border-primary/30 text-center space-y-6 bg-black/80">
                  <div className="h-16 w-16 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-[18px] font-bold uppercase tracking-wider">Mission Security Protocol</h2>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      To access the intelligence terminal you must enter enforced environment mode.
                      Tab-switching or escaping fullscreen will result in security strikes.
                    </p>
                  </div>
                  <div className="text-left space-y-2 text-[12px] border border-border/50 rounded p-4 bg-secondary/20">
                    <p className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground mb-2">Enforcement conditions</p>
                    {[
                      "Fullscreen mode is required for the duration of the round.",
                      "Switching tabs or minimizing the window triggers a strike.",
                      "Three strikes results in automatic disqualification.",
                    ].map((rule, i) => (
                      <div key={i} className="flex gap-2 text-muted-foreground"><span className="text-primary shrink-0">›</span>{rule}</div>
                    ))}
                    {isActiveSolver && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        <p className="font-bold uppercase text-[10px] tracking-widest text-warning mb-2">Webcam Consent Required</p>
                        <div className="flex gap-2 text-muted-foreground"><span className="text-warning shrink-0">›</span>Your webcam will be activated and periodic snapshots captured for proctoring.</div>
                        <div className="flex gap-2 text-muted-foreground"><span className="text-warning shrink-0">›</span>Snapshots are reviewed only by mission administrators and auto-deleted after 30 days.</div>
                        <div className="flex gap-2 text-muted-foreground"><span className="text-warning shrink-0">›</span>By clicking "Initialize", you consent to this monitoring.</div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleInitializeSecurity}
                    className="w-full h-12 bg-primary text-primary-foreground font-bold uppercase text-[12px] tracking-[0.2em] flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                  >
                    <Expand className="h-4 w-4" /> {isActiveSolver ? "Consent & Initialize Security" : "Initialize Security & Enter"}
                  </button>
                  <p className="text-[10px] text-muted-foreground uppercase italic font-medium">Auto-submission triggers at 6 security strikes.</p>
                </Surface>
              </div>
            )}

            {/* OVERLAY: Disqualified */}
            {team.isDisqualified && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-destructive/10 backdrop-blur-xl" />
                <Surface className="relative z-10 max-w-md w-full p-8 border-destructive/50 text-center space-y-4 bg-black">
                  <AlertOctagon className="h-12 w-12 text-destructive mx-auto" />
                  <h2 className="text-[20px] font-bold text-destructive uppercase">Disqualified</h2>
                  {team.disqualificationReason && (
                    <p className="text-[13px] text-muted-foreground">Reason: {team.disqualificationReason}</p>
                  )}
                  <Link to={`/hackathons/${missionSlug}`}>
                    <button className="w-full h-10 border border-border text-[12px] font-bold uppercase tracking-widest hover:bg-secondary">
                      Return to Briefing
                    </button>
                  </Link>
                </Surface>
              </div>
            )}

            {/* OVERLAY: Focus Lost Warning */}
            {isFocusLost && securityInitialized && !isLockdown && !team?.isDisqualified && (
              <div className="absolute inset-0 z-[65] flex items-center justify-center p-6 -mt-6">
                <div className="absolute inset-0 bg-warning/10 backdrop-blur-sm" />
                <Surface className="relative z-10 max-w-sm w-full p-6 border-warning/50 text-center space-y-4 bg-black/90">
                  <AlertTriangle className="h-10 w-10 text-warning mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-[16px] font-bold text-warning uppercase tracking-widest">Focus Lost</h3>
                    <p className="text-[12px] text-muted-foreground mt-1">Click to return focus to the terminal. Strike recorded.</p>
                  </div>
                  <button
                    onClick={() => window.focus()}
                    className="w-full h-10 bg-warning/20 border border-warning/40 text-warning text-[11px] font-bold uppercase tracking-widest hover:bg-warning/30"
                  >
                    Resume Terminal
                  </button>
                </Surface>
              </div>
            )}

            {/* OVERLAY: Lockdown */}
            {isLockdown && (
              <div className="absolute inset-0 z-[70] flex items-center justify-center p-6 -mt-6">
                <div className="absolute inset-0 bg-destructive/20 backdrop-blur-xl" />
                <Surface className="relative z-10 max-w-md w-full p-8 border-destructive/50 text-center space-y-6 bg-black">
                  <div className="h-16 w-16 bg-destructive/10 border border-destructive/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <Lock className="h-8 w-8 text-destructive" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-[20px] font-bold text-destructive uppercase tracking-tighter">Terminal Terminated</h2>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      Maximum security strikes reached (6/6). Your session has been locked.
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.href = `/hackathons/${missionSlug}`}
                    className="w-full h-12 border border-border text-[12px] font-bold uppercase tracking-widest hover:bg-secondary"
                  >
                    Return to Briefing
                  </button>
                  {user?.role === 'Admin' && (
                    <button
                      onClick={async () => {
                        try {
                          const team = await hackathonsApi.getTeamStatus(id!);
                          if (team?._id) {
                            await hackathonsApi.pardonMissionBreach(id!, team._id, true);
                            resetProctoring(id!);
                            toast.success("Strikes reset via server. Reloading...");
                            setTimeout(() => window.location.reload(), 1000);
                          }
                        } catch (err: any) {
                          toast.error(err.message || "Failed to reset strikes on server.");
                        }
                      }}
                      className="text-[10px] text-primary hover:underline font-bold uppercase"
                    >
                      Admin Override: Reset Strikes
                    </button>
                  )}
                </Surface>
              </div>
            )}

            {/* Finalize Confirmation Dialog */}
            {showFinalizeConfirm && (
              <div className="absolute inset-0 z-[55] flex items-center justify-center p-6 -mt-6">
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
                <Surface className="relative z-10 max-w-sm w-full p-6 border-warning/40 text-center space-y-4 bg-black/90">
                  <AlertTriangle className="h-10 w-10 text-warning mx-auto" />
                  <h3 className="text-[16px] font-bold uppercase">Confirm Early Submission</h3>
                  <p className="text-[12px] text-muted-foreground">
                    This will finalize your round immediately. Unanswered questions will be scored as zero. This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFinalizeConfirm(false)}
                      className="flex-1 h-10 border border-border text-[12px] hover:bg-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => finalizeRoundMutation.mutate()}
                      disabled={finalizeRoundMutation.isPending}
                      className="flex-1 h-10 bg-destructive text-destructive-foreground text-[12px] font-bold disabled:opacity-50"
                    >
                      {finalizeRoundMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Confirm Finalize"}
                    </button>
                  </div>
                </Surface>
              </div>
            )}

            {/* Main Terminal Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-b from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition rounded-xl blur" />
                <Surface className="relative z-10 p-0 border-primary/30 min-h-[500px] flex flex-col bg-black/60 backdrop-blur-xl overflow-hidden">
                  {/* Terminal Header */}
                  <div className="bg-primary/10 px-4 py-2 flex items-center justify-between border-b border-primary/20">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px] font-mono text-primary uppercase tracking-widest font-bold">
                        {isOffline ? "FIELD_DEPLOYMENT.log" : "Arena_Runtime.exe"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-2 w-2 rounded-full bg-destructive/50" />
                      <div className="h-2 w-2 rounded-full bg-warning/50" />
                      <div className="h-2 w-2 rounded-full bg-success/50" />
                    </div>
                  </div>

                  <div className="flex-1 p-6 font-mono">
                    {isOffline ? (
                      <div className="space-y-6 max-w-2xl py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 bg-warning/10 border border-warning/30 rounded-lg flex items-center justify-center shrink-0">
                            <MapPin className="h-7 w-7 text-warning" />
                          </div>
                          <div>
                            <h2 className="text-[18px] font-bold text-warning uppercase tracking-tighter">
                              {roundInfo?.type === 'Presentation' ? 'Presentation Phase' : roundInfo?.type === 'Physical Build' ? 'Physical Build Phase' : 'Field Engagement Phase'}
                            </h2>
                            <p className="text-[12px] text-muted-foreground">Round: {roundInfo?.title || "Active Phase"} · Type: {roundInfo?.type}</p>
                          </div>
                        </div>

                        <div className="p-4 bg-warning/5 border border-warning/20 rounded text-[12px] text-muted-foreground leading-relaxed">
                          {roundInfo?.type === 'Presentation'
                            ? "Report to the designated presentation suite. Judges will evaluate your demo, technical depth, and communication clarity."
                            : roundInfo?.type === 'Physical Build'
                            ? "Head to the physical build arena. Build, iterate, and prepare your hardware/software prototype for evaluation."
                            : "Report to the physical institute arena or designated venue as specified in your mission brief."}
                        </div>

                        {isActiveSolver && (
                          <div className="space-y-4 border border-border/50 rounded p-5 bg-secondary/10">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Round Deliverable Submission (Optional)
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                                  {roundInfo?.type === 'Presentation' ? 'Presentation / Deck Link' : 'Demo / Prototype Link'}
                                </label>
                                <input
                                  type="url"
                                  value={offlineLink}
                                  onChange={e => setOfflineLink(e.target.value)}
                                  placeholder="https://..."
                                  className="w-full h-10 bg-secondary/40 border border-border focus:border-primary/50 px-3 text-[13px] font-mono rounded outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Notes for Judges</label>
                                <textarea
                                  value={offlineNotes}
                                  onChange={e => setOfflineNotes(e.target.value)}
                                  placeholder="Any context, special considerations, or status updates..."
                                  rows={3}
                                  className="w-full bg-secondary/40 border border-border focus:border-primary/50 px-3 py-2 text-[13px] rounded outline-none resize-none"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                // 3A  -  Submit offline deliverable to backend before finalizing
                                if (offlineNotes || offlineLink) {
                                  submitOfflineDeliverableMutation.mutate({
                                    roundNumber: team?.currentRound || 1,
                                    notes: offlineNotes,
                                    link: offlineLink,
                                  });
                                } else {
                                  setShowFinalizeConfirm(true);
                                }
                              }}
                              disabled={submitOfflineDeliverableMutation.isPending}
                              className="h-10 px-6 bg-warning/10 border border-warning/30 text-warning text-[11px] font-bold uppercase tracking-widest hover:bg-warning/20 transition-colors disabled:opacity-50"
                            >
                              {submitOfflineDeliverableMutation.isPending
                                ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                : "Mark Round as Complete"}
                            </button>
                          </div>
                        )}

                        <Link to={`/hackathons/${missionSlug}`} className="inline-flex items-center gap-2 text-[11px] text-primary hover:underline uppercase font-bold">
                          <ExternalLink className="h-3.5 w-3.5" /> View Mission Brief for Site Logistics
                        </Link>
                      </div>
                    ) : !isActiveSolver ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                        <div className="h-16 w-16 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center animate-pulse">
                          <Shield className="h-8 w-8 text-primary/50" />
                        </div>
                        <div>
                          <h3 className="text-[14px] text-primary uppercase font-bold tracking-widest mb-2">Observation Mode</h3>
                          <p className="text-[12px] text-muted-foreground max-w-[300px] leading-relaxed">
                            Only the active solver (Squadron Leader) can interact with the mission console. You are in read-only mode  -  answers can only be submitted by the assigned leader.
                          </p>
                        </div>
                      </div>
                    ) : loadingQuestions ? (
                      <div className="h-full flex flex-col items-center justify-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-[12px] text-muted-foreground font-mono animate-pulse">Loading intelligence feed...</p>
                        <div className="space-y-2 w-full max-w-md">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-primary/5 border border-primary/10 rounded animate-pulse" />
                          ))}
                        </div>
                      </div>
                    ) : isFinished ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                        <CheckCircle2 className="h-16 w-16 text-success" />
                        <div>
                          <h3 className="text-[18px] text-success uppercase font-bold tracking-widest mb-2">Round Synchronized</h3>
                          <p className="text-[12px] text-muted-foreground max-w-[300px]">
                            All active challenges completed. Awaiting next round broadcast from Mission Control.
                          </p>
                        </div>
                        <Link
                          to={`/hackathons/${missionSlug}`}
                          className="text-[11px] text-primary hover:underline uppercase font-bold"
                        >
                          Exit Arena
                        </Link>
                      </div>
                    ) : currentQuestion ? (
                      <div className="space-y-6 max-w-2xl">
                        {/* Question header with points and answered indicator */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-primary/50 text-[11px] font-bold uppercase tracking-widest">
                              Challenge {currentQuestionIndex + 1} / {questions.length}
                            </span>
                            <div className="flex items-center gap-3">
                              {answeredIds.has(String(currentQuestion._id)) && (
                                <span className="text-[10px] text-success flex items-center gap-1 font-bold">
                                  <CheckCircle2 className="h-3 w-3" /> Answered
                                </span>
                              )}
                              {currentQuestion.points && (
                                <span className="text-[10px] text-warning font-mono font-bold">+{currentQuestion.points} pts</span>
                              )}
                            </div>
                          </div>
                          <h2 className="text-[18px] text-foreground leading-tight">{currentQuestion.questionText}</h2>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                          {currentQuestion.options.map((option: string, idx: number) => {
                            const isSelected = selectedOption === option;
                            const isAnswered = answeredIds.has(String(currentQuestion._id));
                            return (
                              <button
                                key={idx}
                                onClick={() => !isAnswered && setSelectedOption(option)}
                                disabled={isAnswered}
                                className={`w-full group relative flex items-center gap-4 p-4 rounded border transition-all text-left ${
                                  isSelected ? "bg-primary/20 border-primary" : "bg-white/5 border-border/40 hover:bg-white/10"
                                } disabled:opacity-60 disabled:cursor-not-allowed`}
                              >
                                <div className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors shrink-0 ${ isSelected ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}>
                                  {isSelected && <div className="h-1.5 w-1.5 bg-background rounded-full" />}
                                </div>
                                <span className="text-[14px] flex-1">{option}</span>
                                <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"} text-primary`} />
                              </button>
                            );
                          })}
                        </div>

                        {/* Submit / Retry */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => selectedOption && handleSubmitAnswer(selectedOption)}
                            disabled={!selectedOption || submitAnswerMutation.isPending}
                            className="flex-1 h-12 bg-primary text-primary-foreground text-[14px] font-bold uppercase tracking-[0.2em] hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                          >
                            {submitAnswerMutation.isPending
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <><Zap className="h-4 w-4" /> Transmit Telemetry</>}
                          </button>
                          {pendingAnswer && submitAnswerMutation.isError && (
                            <button
                              onClick={() => submitAnswerMutation.mutate(pendingAnswer)}
                              disabled={submitAnswerMutation.isPending}
                              title="Retry failed submission"
                              className="h-12 px-4 border border-warning text-warning hover:bg-warning/10 flex items-center gap-2 text-[12px] font-bold"
                            >
                              <RefreshCw className="h-4 w-4" /> Retry
                            </button>
                          )}
                        </div>

                        {/* Question Navigator */}
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
                          {questions.map((_: any, idx: number) => {
                            const qId = String(questions[idx]._id);
                            const done = answeredIds.has(qId);
                            return (
                              <button
                                key={idx}
                                onClick={() => { setCurrentQuestionIndex(idx); setSelectedOption(null); }}
                                className={`h-6 w-6 text-[10px] font-bold rounded transition-all border ${
                                  idx === currentQuestionIndex
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : done
                                    ? "bg-success/20 border-success/50 text-success"
                                    : "bg-white/5 border-border/40 text-muted-foreground hover:bg-white/10"
                                }`}
                              >
                                {idx + 1}
                              </button>
                            );
                          })}
                        </div>

                        {/* Finalize early */}
                        <div className="flex justify-end">
                          <Link
                            to={`/hackathons/${missionSlug}`}
                            className="text-[10px] text-muted-foreground hover:text-primary uppercase font-bold tracking-widest"
                          >
                            Exit Arena
                          </Link>
                        </div>
                      </div>
                     ) : (
                       <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                         <div className="h-12 w-12 bg-secondary border border-border rounded-full flex items-center justify-center opacity-30">
                            <Target className="h-6 w-6" />
                         </div>
                         <div>
                            <p className="text-[14px] text-muted-foreground font-bold uppercase tracking-widest">
                               {questionError ? "INTELLIGENCE_LINK_FAILED" : "NO_CHALLENGES_FOUND"}
                            </p>
                            <p className="text-[12px] text-muted-foreground/60 max-w-[300px] mx-auto mt-1">
                               {questionError 
                                 ? (questionError as any).message || "Mission Control failed to transmit intelligence. Check your network or contact Command."
                                 : "This round does not currently have any active challenges assigned. Awaiting Mission Control update."}
                            </p>
                         </div>
                         {(questionError || !questions.length) && (
                            <button 
                              onClick={() => refetchQuestions()}
                              className="px-4 h-9 bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 rounded mt-4"
                            >
                              Retry Uplink
                            </button>
                         )}
                       </div>
                     )}
                   </div>

                  {/* Status Bar */}
                  <div className="bg-black/40 border-t border-primary/20 px-4 py-2 flex items-center justify-between text-[10px] font-mono">
                    <div className="flex gap-4">
                      <span className={`flex items-center gap-1 ${isLockdown ? "text-destructive" : "text-success"}`}>
                        <Zap className="h-3 w-3" /> {isLockdown ? "LINK_TERMINATED" : "LINK_STABLE"}
                      </span>
                      {countdown && (
                        <span className={countdown.isCritical ? "text-destructive animate-pulse" : countdown.isWarning ? "text-warning" : "text-muted-foreground"}>
                          T-MINUS: {countdown.formatted}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground uppercase">
                      ROLE: <span className="text-primary">{isActiveSolver ? "COMMAND_LEADER" : "OBSERVER"}</span>
                    </div>
                  </div>
                </Surface>
              </div>

            </div>

            {/* Stats Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Answered" value={`${currentRoundAnsweredCount} / ${questions.length || "?"}`} />
                <Stat label="Warnings" value={team.warnings + strikes} accent={(team.warnings + strikes) > 0 ? "hsl(var(--destructive))" : undefined} />
              </div>

              <Surface className="p-5">
                <h3 className="text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> Fleet Personnel
                </h3>
                <div className="space-y-4">
                  {team.members?.map((m: any) => {
                    const memberId = normalizeId(m._id);
                    const leaderId = normalizeId(team.leader);
                    const isLeader = memberId === leaderId;
                    const isOnline = onlineMembers.size > 0 ? onlineMembers.has(memberId) : undefined;
                    return (
                      <div key={m._id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ isLeader ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}>
                              {m.name?.substring(0, 2)?.toUpperCase() || "OP"}
                            </div>
                            {isOnline !== undefined && (
                              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${isOnline ? "bg-success" : "bg-muted-foreground/40"}`} />
                            )}
                          </div>
                          <div>
                            <div className="text-[13px] font-medium">{m.name}</div>
                            <div className="text-[10px] text-muted-foreground">{isOnline === true ? "Online" : isOnline === false ? "Offline" : m.role}</div>
                          </div>
                        </div>
                        {isLeader && <Pill variant="info" className="text-[9px] h-4">Lead</Pill>}
                      </div>
                    );
                  })}
                </div>
              </Surface>



              <Surface className="p-4 border-warning/30 bg-warning/5">
                <div className="flex items-center gap-2 text-warning font-bold text-[11px] uppercase mb-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> Security Protocol
                </div>
                <ul className="text-[11.5px] text-muted-foreground space-y-1.5 list-disc pl-4 italic">
                  <li>Communication outside the team is an instant violation.</li>
                  <li>One lead solver per session (Squadron Leader).</li>
                  <li>Submissions are permanent once transmitted.</li>
                  <li className="text-destructive not-italic font-bold">Leaving this tab will record a strike.</li>
                </ul>
              </Surface>
            </div>
          </div>
        </div>
      </div>
    </MobileGuard>
  );
}

