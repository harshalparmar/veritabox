import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/VeritaBox/UI";
import { 
  Users, Plus, ArrowRight, Loader2, Shield, 
  Terminal, UserPlus, CheckCircle2, AlertTriangle, 
  ChevronRight, Info
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function HackathonRegistration() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'selection' | 'create' | 'join'>('selection');
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const { data: hackathon, isLoading: loadingHackathon } = useQuery({
    queryKey: ["hackathon-id", id],
    queryFn: () => hackathonsApi.getById(id!),
    enabled: !!id,
  });

  const { data: teamStatus, isLoading: loadingTeamStatus } = useQuery({
    queryKey: ["team-status", id],
    queryFn: () => hackathonsApi.getTeamStatus(id!),
    enabled: !!id && !!user,
    retry: false,
  });

  const createTeamMutation = useMutation({
    mutationFn: () => hackathonsApi.register(id!, { teamName }),
    onSuccess: () => {
      toast.success("SQUADRON ESTABLISHED", {
        description: "Your operational unit is now active in the matrix.",
      });
      queryClient.invalidateQueries({ queryKey: ["team-status", id] });
      setMode('selection');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const joinTeamMutation = useMutation({
    mutationFn: () => hackathonsApi.joinTeam(inviteCode),
    onSuccess: () => {
      toast.success("LINK SYNCHRONIZED", {
        description: "You have joined the squadron.",
      });
      queryClient.invalidateQueries({ queryKey: ["team-status", id] });
      setMode('selection');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Solo auto-registration: when minTeamSize === 1 && maxTeamSize === 1, auto-create team
  const isSoloMode = hackathon && hackathon.minTeamSize === 1 && hackathon.maxTeamSize === 1;
  const [soloAttempted, setSoloAttempted] = useState(false);

  const [soloFailed, setSoloFailed] = useState(false);

  useEffect(() => {
    if (isSoloMode && !teamStatus && !loadingTeamStatus && user && !soloAttempted && !createTeamMutation.isPending) {
      setSoloAttempted(true);
      setSoloFailed(false);
      createTeamMutation.mutate(undefined, {
        onError: () => {
          setSoloFailed(true);
          setSoloAttempted(false);
        }
      });
    }
  }, [isSoloMode, teamStatus, loadingTeamStatus, user, soloAttempted]);

  // Redirect if already in a team and hackathon is live
  useEffect(() => {
    if (teamStatus && hackathon?.status === 'Live') {
      // Optional: auto-redirect to arena
      // navigate(`/hackathons/${id}/arena`);
    }
  }, [teamStatus, hackathon, navigate, id]);

  const isLoading = loadingHackathon || loadingTeamStatus;

  if (isLoading) {
    return (
      <VeritaBoxLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </VeritaBoxLayout>
    );
  }

  if (!hackathon) {
    return (
      <VeritaBoxLayout>
        <div className="mx-auto max-w-md py-20 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">MISSION SEGMENT NOT FOUND</h2>
          <p className="text-muted-foreground text-sm">The requested hackathon ID does not exist in the current sector.</p>
          <Link to="/hackathons" className="text-primary hover:underline">Return to Operations</Link>
        </div>
      </VeritaBoxLayout>
    );
  }

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {isSoloMode && createTeamMutation.isPending ? (
              <Surface className="p-12 text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm font-bold uppercase tracking-widest">Registering Solo Entry...</p>
                <p className="text-xs text-muted-foreground">Setting up your individual mission profile.</p>
              </Surface>
            ) : !teamStatus ? (
              <div className="space-y-6">
                {mode === 'selection' && (
                  <div className="grid sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Surface 
                      hover 
                      onClick={() => setMode('create')}
                      className="p-8 border-primary/20 flex flex-col items-center text-center space-y-4 cursor-pointer group"
                    >
                      <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold uppercase tracking-widest">Form New Squadron</h3>
                        <p className="text-[12px] text-muted-foreground">Establish a new operational unit and lead your team to victory.</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Surface>

                    <Surface 
                      hover 
                      onClick={() => setMode('join')}
                      className="p-8 border-info/20 flex flex-col items-center text-center space-y-4 cursor-pointer group"
                    >
                      <div className="h-16 w-16 rounded-full bg-info/10 border border-info/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UserPlus className="h-8 w-8 text-info" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold uppercase tracking-widest">Join Existing Unit</h3>
                        <p className="text-[12px] text-muted-foreground">Enter an 8-character invite code to synchronize with your squadron.</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-info transition-colors" />
                    </Surface>
                  </div>
                )}

                {mode === 'create' && (
                  <Surface className="p-8 space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                      <button onClick={() => setMode('selection')} className="text-muted-foreground hover:text-foreground">← Back</button>
                      <h2 className="text-lg font-bold uppercase tracking-tighter italic">Establish Squadron Identity</h2>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Squadron Designation (Name)</label>
                        <Input 
                          placeholder="e.g. PHANTOM_OPS"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          className="h-12 bg-secondary/30 border-primary/20 text-lg font-mono uppercase"
                          maxLength={24}
                        />
                      </div>
                      <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg flex gap-3 italic text-[12px] text-muted-foreground">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        As the squadron leader, you will be responsible for all mission telemetry transmissions.
                      </div>
                      <button 
                        onClick={() => createTeamMutation.mutate()}
                        disabled={!teamName.trim() || createTeamMutation.isPending}
                        className="w-full h-12 bg-primary text-primary-foreground font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
                      >
                        {createTeamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Form Squadron</>}
                      </button>
                    </div>
                  </Surface>
                )}

                {mode === 'join' && (
                  <Surface className="p-8 space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                      <button onClick={() => setMode('selection')} className="text-muted-foreground hover:text-foreground">← Back</button>
                      <h2 className="text-lg font-bold uppercase tracking-tighter italic">Synchronize with Unit</h2>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Operational Invite Code</label>
                        <Input 
                          placeholder="ENTER CODE"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          className="h-12 bg-secondary/30 border-info/20 text-2xl font-mono text-center tracking-[0.5em]"
                          maxLength={8}
                        />
                      </div>
                      <div className="p-4 bg-info/5 border border-info/10 rounded-lg flex gap-3 italic text-[12px] text-muted-foreground">
                        <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
                        Invite codes are case-sensitive and unique to each squadron.
                      </div>
                      <button 
                        onClick={() => joinTeamMutation.mutate()}
                        disabled={!inviteCode.trim() || joinTeamMutation.isPending}
                        className="w-full h-12 bg-info text-info-foreground font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
                      >
                        {joinTeamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Terminal className="h-4 w-4" /> Sync Link</>}
                      </button>
                    </div>
                  </Surface>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-700">
                <Surface className="p-8 border-success/30 bg-success/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Shield className="h-24 w-24 text-success" />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-lg bg-success/20 flex items-center justify-center border border-success/40">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold uppercase tracking-tighter">Squadron Established</h2>
                      <p className="text-sm text-muted-foreground">Identity: <span className="text-success font-mono font-bold">{teamStatus.teamName}</span></p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border pb-2">Unit Personnel</h3>
                      <div className="space-y-3">
                        {teamStatus.members.map((member: any) => (
                          <div key={member._id} className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center text-[10px] font-bold border border-border">
                              {member.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-[13px] font-medium">{member.name}</div>
                              <div className="text-[10px] text-muted-foreground uppercase">{member.role}</div>
                            </div>
                            {member._id === (typeof teamStatus.leader === 'string' ? teamStatus.leader : teamStatus.leader._id) && (
                              <Pill variant="info" className="h-4 text-[9px]">LEAD</Pill>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border pb-2">Invite Protocol</h3>
                      <div className="p-4 bg-black/40 border border-border rounded-lg text-center space-y-2">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Share Invite Code</div>
                        <div className="text-2xl font-mono font-bold text-primary tracking-[0.3em]">{teamStatus.inviteCode}</div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(teamStatus.inviteCode);
                            toast.success("Code copied to clipboard.");
                          }}
                          className="text-[9px] text-muted-foreground hover:text-primary uppercase font-bold"
                        >
                          Copy to terminal
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground italic">
                      Mission status: <span className="text-foreground uppercase font-bold">{hackathon.status}</span>
                    </div>
                    {hackathon.status === 'Live' ? (
                      <button 
                        onClick={async () => {
                          const entries = teamStatus.arenaEntries || 0;
                          if (entries < 3) {
                            try {
                              await hackathonsApi.logArenaEntry(id!);
                              window.location.href = `/hackathons/${id}/arena`;
                            } catch (err) {
                              console.error("Entry sequence failed", err);
                              window.location.href = `/hackathons/${id}/arena`;
                            }
                          } else {
                            // 4th attempt: Trigger disqualification
                            try {
                              await hackathonsApi.logArenaEntry(id!);
                              toast.error("MISSION TERMINATED", {
                                description: "Maximum entry threshold breached. Squadron disqualified."
                              });
                              queryClient.invalidateQueries({ queryKey: ["team-status", id] });
                            } catch (err) {
                              window.location.reload();
                            }
                          }
                        }}
                        disabled={teamStatus.isDisqualified}
                        className="h-10 px-6 bg-primary text-primary-foreground font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {teamStatus.isDisqualified ? "Access Vector Severed" : teamStatus.arenaEntries >= 3 ? "Final Entry Threshold Reached" : "Enter Arena"} <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <Pill variant="info">Awaiting Mission Start</Pill>
                    )}
                  </div>
                </Surface>
              </div>
            )}
          </div>

          <div className="space-y-4">
             <Stat label="Total Slots" value={hackathon.maxTeams || 100} hint="Squadron capacity" />
             <Stat label="Phase" value={hackathon.status} accent={hackathon.status === 'Live' ? "hsl(var(--destructive))" : "hsl(var(--success))"} />
             
             <Surface className="p-5 space-y-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tactical Brief</div>
                <div className="space-y-2">
                   <p className="text-[12px] leading-relaxed text-foreground/80">{hackathon.description}</p>
                   <Link to={`/hackathons/${hackathon.slug}`} className="text-[11px] text-primary hover:underline flex items-center gap-1 font-bold uppercase">
                     Full Intel <ArrowRight className="h-3 w-3" />
                   </Link>
                </div>
             </Surface>

             <Surface className="p-5 border-warning/30 bg-warning/5">
                <div className="flex items-center gap-2 text-warning font-bold text-[11px] uppercase mb-2">
                   <AlertTriangle className="h-3.5 w-3.5" /> Enlistment Rules
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4 italic">
                   <li>One squadron per operative per mission.</li>
                   <li>Max capacity: {hackathon?.maxTeamSize || 5} members per unit.</li>
                   <li>Squadron leaders handle all transmissions.</li>
                </ul>
             </Surface>
          </div>
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
