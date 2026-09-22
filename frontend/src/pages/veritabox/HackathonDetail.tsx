import { useParams, Link } from "react-router-dom";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { Surface, Pill, Stat, SectionTitle } from "@/components/VeritaBox/UI";
import { cn } from "@/lib/utils";
import { Calendar, Users, Trophy, MapPin, ArrowRight, Loader2, Users2, Plus, CheckCircle2, Globe, Info, Shield, Target, Clock, Download, FileText, List, Lock, ShieldAlert } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi, resolveAssetUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import HackathonLeaderboard from "@/components/VeritaBox/HackathonLeaderboard";
import MissionDebriefModal from "@/components/VeritaBox/MissionDebriefModal";
import ReactMarkdown from 'react-markdown';

export default function HackathonDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [debriefRound, setDebriefRound] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'brief' | 'squadron' | 'standings'>('brief');

  const { data: hackathon, isLoading: loadingHackathon } = useQuery({
    queryKey: ["hackathon", slug],
    queryFn: () => hackathonsApi.getBySlug(slug!),
    enabled: !!slug && slug.length > 0,
  });

  const { data: teamStatus, isLoading: loadingTeamStatus } = useQuery({
    queryKey: ["team-status", hackathon?._id],
    queryFn: () => hackathonsApi.getTeamStatus(hackathon?._id!),
    enabled: !!hackathon?._id && !!user,
    retry: false, // Don't retry 404s
  });

  const createTeamMutation = useMutation({
    mutationFn: () => hackathonsApi.register(hackathon?._id!, { teamName }),
    onSuccess: () => {
      toast.success("Squadron formed! Ready for engagement.");
      queryClient.invalidateQueries({ queryKey: ["team-status", hackathon?._id] });
      setTeamName("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const joinTeamMutation = useMutation({
    mutationFn: () => hackathonsApi.joinTeam(inviteCode),
    onSuccess: (data: any) => {
      toast.success(`Joined squadron "${data.teamName}" (${data.members?.length || '?'} members).`);
      queryClient.invalidateQueries({ queryKey: ["team-status", hackathon?._id] });
      setInviteCode("");
      setShowJoinInput(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (loadingHackathon) {
    return (
      <PublicShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicShell>
    );
  }

  if (!hackathon) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-[1400px] px-8 py-20 text-center">
          <h2 className="text-[20px] font-semibold">Hackathon mission not found.</h2>
          <Link to="/hackathons" className="text-primary hover:underline mt-4 inline-block">Return to Operations</Link>
        </div>
      </PublicShell>
    );
  }

  const isLive = hackathon.status === "Live";

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1400px] px-8 py-10">
          <Link to="/hackathons" className="text-[12px] text-muted-foreground hover:text-foreground">← All hackathons</Link>
          <div className="mt-3 flex items-center gap-2">
            <Pill variant={isLive ? "danger" : "success"}>{hackathon.status}</Pill>
            <span className="text-[11px] font-mono text-muted-foreground uppercase">{hackathon.slug}</span>
          </div>
          <h1 className="mt-3 text-[32px] font-semibold tracking-tight">{hackathon.title}</h1>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-2xl line-clamp-2">
            {hackathon.shortDescription}
          </p>
          
          
          {!loadingTeamStatus && !teamStatus && user && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <input 
                  placeholder="Squadron name..."
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="h-9 px-3 bg-card border border-border text-[13px] outline-none rounded focus:border-primary/50"
                />
                <button
                  onClick={() => {
                    if (window.confirm(`Form squadron "${teamName.trim()}"? This cannot be undone easily.`)) {
                      createTeamMutation.mutate();
                    }
                  }}
                  disabled={createTeamMutation.isPending || !teamName.trim()}
                  className="text-[13px] h-9 px-4 bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-2 disabled:opacity-50"
                >
                  Form squadron <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 border-l border-border pl-3">
                {showJoinInput ? (
                  <>
                    <input 
                      placeholder="Invite code..."
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="h-9 w-32 px-3 bg-card border border-border text-[13px] outline-none rounded focus:border-primary/50"
                    />
                    <button
                      onClick={() => {
                        if (window.confirm(`Join squadron with code "${inviteCode}"? You can only be in one squadron per hackathon.`)) {
                          joinTeamMutation.mutate();
                        }
                      }}
                      disabled={joinTeamMutation.isPending || !inviteCode}
                      className="text-[13px] h-9 px-3 border border-primary text-primary hover:bg-primary/10 disabled:opacity-50"
                    >
                      Join
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setShowJoinInput(true)}
                    className="text-[13px] h-9 px-4 border border-foreground/40 hover:bg-secondary inline-flex items-center gap-2"
                  >
                    <Users2 className="h-3.5 w-3.5" /> Join via code
                  </button>
                )}
              </div>
            </div>
          )}
          {!user && (
            <div className="mt-5">
              <Link to="/auth">
                <button className="text-[13px] h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90">Sign in to join mission</button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-[1400px] px-8">
          <div className="flex items-center gap-8 h-14 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('brief')}
              className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", activeTab === 'brief' ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
            >
              <FileText className="h-3.5 w-3.5" /> Mission Briefing
            </button>
            {teamStatus && (
              <button 
                onClick={() => setActiveTab('squadron')}
                className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", activeTab === 'squadron' ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
              >
                <Target className="h-3.5 w-3.5" /> Squadron Operations
              </button>
            )}
            <button 
              onClick={() => setActiveTab('standings')}
              className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", activeTab === 'standings' ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
            >
              <List className="h-3.5 w-3.5" /> Live Standings
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-8 py-8">
        {activeTab === 'brief' && (
          <div className="grid lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="lg:col-span-2 space-y-6">
              <Surface className="p-5 md:p-6 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                <SectionTitle>Mission Briefing</SectionTitle>
                <div className="prose dark:prose-invert prose-sm max-w-none prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-[14px] prose-p:text-muted-foreground prose-p:leading-relaxed">
                  <ReactMarkdown>{hackathon.description}</ReactMarkdown>
                </div>
              </Surface>

              {hackathon.rounds?.length > 0 && (
                <Surface className="p-5 md:p-6 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                  <h2 className="text-[14px] font-semibold uppercase tracking-[0.08em] mb-6 flex items-center gap-2">
                    <List className="h-4 w-4" /> Mission Engagement Timeline
                  </h2>
                  <EngagementTimeline rounds={hackathon.rounds} hackathon={hackathon} teamStatus={teamStatus} />
                </Surface>
              )}

              {hackathon.resources?.length > 0 && (
                <Surface className="p-5 md:p-6 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                  <h2 className="text-[14px] font-semibold uppercase tracking-[0.08em] mb-4 flex items-center gap-2">
                    <Download className="h-4 w-4" /> Resources
                  </h2>
                  <div className="space-y-2">
                    {hackathon.resources.map((res: any, i: number) => (
                      <a key={i} href={resolveAssetUrl(res.url)} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-secondary/20 border border-border/40 rounded hover:bg-secondary/40 transition-colors">
                        <Download className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{res.title}</div>
                          {res.description && <div className="text-[11px] text-muted-foreground">{res.description}</div>}
                        </div>
                      </a>
                    ))}
                  </div>
                </Surface>
              )}
            </div>

            <div className="space-y-4">
              {hackathon.prizes?.length > 0 ? (
                <Surface className="p-5 md:p-6 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                  <h2 className="text-[14px] font-semibold uppercase tracking-[0.08em] mb-4 flex items-center justify-between">
                    Tactical Rewards
                    <Trophy className="h-4 w-4 text-primary" />
                  </h2>
                  <div className="space-y-3">
                    {hackathon.prizes.map((prize: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-secondary/20 border border-border/40 rounded">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{prize.position}</p>
                          <p className="text-[14px] font-bold text-foreground">{prize.reward}</p>
                        </div>
                        {i === 0 && <span className="text-[10px] font-bold text-primary animate-pulse">TOP_PRIZE</span>}
                      </div>
                    ))}
                  </div>
                </Surface>
              ) : (
                <Stat label="Prize pool" value="Reputation" />
              )}

              {hackathon.rules?.length > 0 && (
                <Surface className="p-5 md:p-6 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                  <h2 className="text-[14px] font-semibold uppercase tracking-[0.08em] mb-3">Rules of Engagement</h2>
                  <ol className="list-decimal list-inside space-y-1.5 text-[12.5px] text-muted-foreground">
                    {hackathon.rules.map((rule: string, i: number) => (
                      <li key={i}>{rule}</li>
                    ))}
                  </ol>
                </Surface>
              )}
            </div>
          </div>
        )}

        {activeTab === 'squadron' && teamStatus && (
          <div className="grid lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="lg:col-span-2 space-y-6">
              <Surface className="p-5 md:p-6 border-primary/20 bg-primary/5 rounded-xl hover:border-primary/30 hover:shadow-xs transition-all">
                <h2 className="text-[14px] font-semibold uppercase tracking-[0.08em] mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Tactical Engagement & Squadron Ops
                </h2>
                
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-background/50 border border-border/40 rounded-lg">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Squadron Assigned</p>
                        <p className="text-[16px] font-bold text-primary">{teamStatus.teamName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Invite Code</p>
                        <p className="text-[14px] font-mono font-bold">{teamStatus.inviteCode || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {hackathon.rounds?.some((r: any) => ["Presentation", "Physical Build"].includes(r.type)) && (
                        <Link to={`/hackathons/${hackathon.slug || hackathon._id}/submit`}>
                          <button className="text-[11px] font-bold uppercase tracking-widest h-10 px-6 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-2">
                            <Plus className="h-3.5 w-3.5" /> {teamStatus.projectSubmission?.submittedAt ? "Update Submission" : "Submit Project"}
                          </button>
                        </Link>
                      )}
                      
                      {!teamStatus.isRoundComplete ? (
                        <div className="flex-1">
                          {(() => {
                            const activeRound = hackathon.rounds?.find((r: any) =>
                              r.type === 'Online MCQ' && 
                              r.status === 'Live' &&
                              new Date(r.startTime) <= new Date() &&
                              new Date(r.endTime) >= new Date()
                            );

                            const nextRound = !activeRound ? hackathon.rounds?.find((r: any) => 
                              new Date(r.startTime) > new Date()
                            ) : null;

                            const targetRound = activeRound || nextRound;

                            if (targetRound) {
                              return (
                                <div className="space-y-4">
                                  <div className="p-4 bg-secondary/20 border border-border/40 rounded-lg flex items-center justify-between">
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                                        {activeRound ? "Engagement Window Closing" : "Next Engagement Window"}
                                      </p>
                                      <div className="text-[24px] font-mono font-bold tracking-tighter text-foreground flex items-center gap-1">
                                        <ZeroHourTimer targetDate={activeRound ? activeRound.endTime : targetRound.startTime} />
                                      </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Status</p>
                                      <div className="flex items-center justify-end gap-2">
                                        <span className={`h-2 w-2 rounded-full ${activeRound ? 'bg-destructive animate-pulse' : 'bg-warning'}`} />
                                        <span className="text-[12px] font-bold uppercase">{activeRound ? "Live Engagement" : "Standby"}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {activeRound && (
                                    <button 
                                      onClick={async () => {
                                        const entries = teamStatus.arenaEntries || 0;
                                        if (entries < 3) {
                                          try {
                                            await hackathonsApi.logArenaEntry(hackathon._id);
                                            window.location.href = `/hackathons/${hackathon.slug || hackathon._id}/arena`;
                                          } catch (err: any) {
                                            toast.error("Entry failed", { description: err.message });
                                            return;
                                          }
                                        } else {
                                          try {
                                            await hackathonsApi.logArenaEntry(hackathon._id);
                                            toast.error("MISSION TERMINATED", {
                                              description: "Maximum entry threshold breached. Squadron disqualified."
                                            });
                                            queryClient.invalidateQueries({ queryKey: ["team-status", hackathon._id] });
                                          } catch (err) {
                                            window.location.reload();
                                          }
                                        }
                                      }}
                                      disabled={teamStatus.isDisqualified}
                                      className="w-full h-11 bg-primary text-primary-foreground hover:brightness-110 inline-flex items-center justify-center gap-3 shadow-lg shadow-primary/20 font-bold uppercase tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {teamStatus.isDisqualified ? "Access Vector Severed" : teamStatus.arenaEntries >= 3 ? "Final Entry Threshold Reached" : "Enter Arena"} <ArrowRight className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div className="p-4 bg-secondary/30 border border-border/40 rounded flex items-center gap-3 text-[12px] text-muted-foreground italic">
                                <Clock className="h-4 w-4" /> Final extraction complete. All mission windows are closed.
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex-1 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                          <div>
                            <p className="text-[12px] font-bold text-success uppercase tracking-wider">Mission Phase Complete</p>
                            <p className="text-[10px] text-muted-foreground">All intelligence parameters for the current round have been successfully extracted.</p>
                          </div>
                        </div>
                      )}
                    </div>
                </div>
              </Surface>

              <div className="space-y-4">
                  <SectionTitle>Round Debriefings</SectionTitle>
                  {teamStatus?.finalizedRounds?.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {hackathon.rounds?.filter((r: any) => teamStatus.finalizedRounds?.includes(r.roundNumber))
                        .map((r: any) => (
                          <button 
                            key={r._id}
                            onClick={() => {
                              if (r.status === 'Closed') {
                                setDebriefRound(r.roundNumber);
                              } else {
                                toast.error("Intelligence Restricted", {
                                  description: "Historical debriefs are only authorized after Mission Control officially closes the round."
                                });
                              }
                            }}
                            className={`flex items-center justify-between p-3 bg-background border transition-all group ${r.status === 'Closed' ? 'border-border hover:border-primary/50 cursor-pointer' : 'border-border/20 opacity-60 cursor-not-allowed'}`}
                          >
                            <div className="text-left">
                              <p className="text-[11px] font-bold uppercase tracking-tight text-foreground/80">Round {r.roundNumber}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{r.title}</p>
                            </div>
                            <div className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${r.status === 'Closed' ? 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground' : 'bg-secondary text-muted-foreground/30'}`}>
                              {r.status === 'Closed' ? <Info className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            </div>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted-foreground italic">No historical debriefs available for your squadron yet.</p>
                  )}
              </div>
            </div>

            <div className="space-y-4">
              <Surface className="p-5 md:p-6 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                <h2 className="text-[14px] font-semibold uppercase tracking-[0.08em] mb-4 flex items-center justify-between">
                  Mission Telemetry
                  <ShieldAlert className="h-4 w-4 text-primary" />
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Arena Entries" value={`${teamStatus.arenaEntries || 0} / 3`} accent={(teamStatus.arenaEntries || 0) >= 2 ? "hsl(var(--warning))" : undefined} />
                  <Stat label="Mission Aborts" value={`${teamStatus.abortCount || 0} / 2`} accent={(teamStatus.abortCount || 0) >= 1 ? "hsl(var(--warning))" : undefined} />
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <Stat label="Security Strikes" value={`${teamStatus.warnings || 0} / 6`} accent={(teamStatus.warnings || 0) >= 4 ? "hsl(var(--destructive))" : undefined} />
                </div>
                
              </Surface>
            </div>
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Surface className="p-5 md:p-6 bg-background/40 border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
              <SectionTitle>Mission Standings</SectionTitle>
              <HackathonLeaderboard hackathonId={hackathon._id} />
            </Surface>
          </div>
        )}
      </div>

      {debriefRound !== null && (
        <MissionDebriefModal
          isOpen={debriefRound !== null}
          onClose={() => setDebriefRound(null)}
          hackathonId={hackathon._id}
          roundNumber={debriefRound}
        />
      )}
    </PublicShell>
  );
}

// --- HIGH PRECISION TACTICAL COMPONENTS ---

function ZeroHourTimer({ targetDate }: { targetDate: string | Date }) {
  const [timeLeft, setTimeLeft] = useState<{h: string, m: string, s: string}>({ h: '00', m: '00', s: '00' });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    if (isNaN(target)) {
      setTimeLeft({ h: '00', m: '00', s: '00' });
      return;
    }

    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft({ h: '00', m: '00', s: '00' });
        return;
      }
      setTimeLeft({
        h: Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0'),
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0'),
        s: Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0'),
      });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex items-baseline gap-1 font-mono">
      <span>{timeLeft.h}</span>
      <span className="opacity-40 animate-pulse">:</span>
      <span>{timeLeft.m}</span>
      <span className="opacity-40 animate-pulse">:</span>
      <span>{timeLeft.s}</span>
    </div>
  );
}

function EngagementTimeline({ rounds, hackathon, teamStatus }: { rounds: any[]; hackathon?: any; teamStatus?: any }) {
  const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

  const getRoundTypeLabel = (type: string) => {
    if (type === 'Online MCQ') return 'DIGITAL';
    if (type === 'Coding Contest') return 'CODE';
    if (type === 'Report Submission' || type === 'Data Challenge') return 'SUBMIT';
    return 'FIELD';
  };

  const getRoundTypeColor = (type: string) => {
    if (type === 'Online MCQ') return 'border-primary/20 text-primary bg-primary/5';
    if (type === 'Coding Contest') return 'border-info/20 text-info bg-info/5';
    if (type === 'Report Submission' || type === 'Data Challenge') return 'border-success/20 text-success bg-success/5';
    return 'border-warning/20 text-warning bg-warning/5';
  };

  return (
    <div className="space-y-0 relative pl-6">
      <div className="absolute left-[7px] top-4 bottom-4 w-px bg-border/40" />

      {sortedRounds.map((r, i) => {
        const isLive = r.status === 'Live';
        const isClosed = r.status === 'Closed';
        const hId = hackathon?._id || hackathon?.slug;

        return (
          <div key={r._id} className="relative pb-6 last:pb-0 group">
             <div className={`absolute left-[-22px] top-1.5 h-3 w-3 rounded-full border-2 bg-background z-10 transition-all duration-500 ${isLive ? 'border-destructive scale-125' : isClosed ? 'border-muted-foreground bg-muted-foreground/20' : 'border-border'}`}>
                {isLive && <div className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-50" />}
             </div>

             {isLive && (
               <div className="absolute left-[-22px] top-4 bottom-[-24px] w-[2px] bg-gradient-to-b from-destructive to-transparent animate-pulse" />
             )}

             <div className={`p-3 border rounded-lg transition-all duration-300 ${isLive ? 'border-destructive/30 bg-destructive/5 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 'border-border/40 hover:border-border'}`}>
                <div className="flex flex-col gap-2">
                   <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                         <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[8px] font-mono font-bold text-muted-foreground opacity-50 shrink-0">PHASE_{r.roundNumber.toString().padStart(2, '0')}</span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-bold ${getRoundTypeColor(r.type)}`}>
                               {getRoundTypeLabel(r.type)}
                            </span>
                         </div>
                         <h4 className={`text-[12px] font-bold uppercase tracking-tight line-clamp-1 ${isLive ? 'text-destructive' : 'text-foreground/80'}`}>{r.title}</h4>
                      </div>
                      <span className={`text-[8px] font-bold uppercase tracking-widest shrink-0 mt-1 ${isLive ? 'text-destructive animate-pulse' : isClosed ? 'text-muted-foreground' : 'text-warning'}`}>
                         {isLive ? 'LIVE' : isClosed ? 'DONE' : 'WAIT'}
                      </span>
                   </div>

                   <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] pt-1 border-t border-border/20">
                      <div className="flex items-center gap-1 text-muted-foreground">
                         <Clock className="h-2.5 w-2.5" />
                         <span>{new Date(r.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                         <Target className="h-2.5 w-2.5" />
                         <span>{r.durationMinutes}m</span>
                      </div>
                   </div>

                   {isLive && teamStatus && hId && (
                     <div className="pt-1">
                       {r.type === 'Coding Contest' && (
                         <Link to={`/hackathons/${hId}/rounds/${r.roundNumber}/contest`} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
                           Enter Contest Arena →
                         </Link>
                       )}
                       {['Report Submission', 'Data Challenge'].includes(r.type) && (
                         <Link to={`/hackathons/${hId}/rounds/${r.roundNumber}/submit`} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
                           Submit →
                         </Link>
                       )}
                     </div>
                   )}
                </div>
             </div>
          </div>
        );
      })}
    </div>
  );
}
