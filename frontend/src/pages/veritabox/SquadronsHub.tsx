import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface } from "@/components/veritabox/UI";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Users, Plus, UserCheck, Shield, Crown
} from "lucide-react";
import { SquadronHQIcon } from "@/components/veritabox/PlatformIcons";

export default function SquadronsHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [squadName, setSquadName] = useState("");
  const [maxMembers, setMaxMembers] = useState(5);
  const [inviteCode, setInviteCode] = useState("");
  
  // Filters state
  const [filter, setFilter] = useState<'all' | 'mine' | 'joined'>('all');

  // Fetch all my affiliated squadrons
  const { data: squads, isLoading } = useQuery({
    queryKey: ["my-squads"],
    queryFn: () => hackathonsApi.getTeamsMe(),
    enabled: !!user,
  });

  // Mutator: Create Standalone Squadron
  const createSquadMutation = useMutation({
    mutationFn: (data: { teamName: string; maxMembers: number; isPublic: boolean }) => 
      hackathonsApi.createStandaloneTeam(data),
    onSuccess: (data) => {
      toast.success("STANDALONE SQUAD ESTABLISHED", {
        description: `Tactical unit [${data.teamName}] is now active.`,
      });
      setSquadName("");
      setMaxMembers(5);
      queryClient.invalidateQueries({ queryKey: ["my-squads"] });
      // Redirect directly to the console page of the newly created squadron
      if (data?._id) {
        navigate(`/squadrons/${data._id}/console`);
      }
    },
    onError: (err: any) => toast.error(err.message || "Establishment failed"),
  });

  // Mutator: Join Squadron via Invite Code
  const joinSquadMutation = useMutation({
    mutationFn: (code: string) => hackathonsApi.joinTeam(code),
    onSuccess: (data) => {
      toast.success("SQUADRON ENLISTMENT SUCCESSFUL", {
        description: `You have joined squadron [${data.teamName}].`,
      });
      setInviteCode("");
      queryClient.invalidateQueries({ queryKey: ["my-squads"] });
      // Redirect directly to the console page of the joined squadron
      if (data?._id) {
        navigate(`/squadrons/${data._id}/console`);
      }
    },
    onError: (err: any) => toast.error(err.message || "Enlistment failed"),
  });

  const handleCreateSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadName.trim()) return;
    // backend expects isPublic; we pass false default as requested to remove discoverability from user interface
    createSquadMutation.mutate({ teamName: squadName.trim(), maxMembers, isPublic: false });
  };

  const handleJoinSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    joinSquadMutation.mutate(inviteCode.trim().toUpperCase());
  };

  // Filter logic
  const filteredSquads = squads?.filter(squad => {
    const isLeader = squad.leader === user?._id;
    if (filter === 'mine') return isLeader;
    if (filter === 'joined') return !isLeader;
    return true;
  }) || [];

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          
          {/* ===================== LEFT: SQUADRON LISTINGS ===================== */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filter Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Active Taskforces
              </h3>
              
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'mine', 'joined'] as const).map((type) => {
                  const label = type === 'all' ? 'All' : type === 'mine' ? 'My Squadrons' : 'Joined Squadrons';
                  const active = filter === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setFilter(type)}
                      className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
              </div>
            ) : filteredSquads.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredSquads.map((squad) => {
                  const isLeader = squad.leader === user?._id;
                  return (
                    <Surface
                      key={squad._id}
                      onClick={() => navigate(`/squadrons/${squad._id}/console`)}
                      className="p-4 cursor-pointer transition-all border border-border/50 hover:border-primary/40 bg-background/40 hover:bg-secondary/10 flex flex-col justify-between h-36 group rounded-xl"
                    >
                      {/* Top section */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-[14px] tracking-wider uppercase line-clamp-1 group-hover:text-primary transition-colors">
                            {squad.teamName}
                          </h4>
                          {squad.hackathonId && (
                            <span className="font-mono text-[11px] font-semibold text-warning/90 shrink-0">
                              {squad.score || 0} pts
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-2 leading-relaxed uppercase tracking-wide">
                          {squad.squadronBio || 'No mission briefing synchronized.'}
                        </p>
                      </div>

                      {/* Bottom row */}
                      <div className="flex items-center justify-between border-t border-border/20 pt-2.5 mt-3">
                        <div className="flex gap-1.5 items-center">
                          {isLeader ? (
                            <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                              <Crown className="h-2.5 w-2.5" /> Commander
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded">
                              Operative
                            </span>
                          )}
                          {squad.hackathonId ? (
                            <span className="text-[8px] font-bold uppercase tracking-wider text-info bg-info/10 border border-info/20 px-1.5 py-0.5 rounded">
                              Mission
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold uppercase tracking-wider text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded">
                              Standalone
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/80">
                          <Users className="h-3 w-3 text-muted-foreground/60" />
                          <span>{squad.members?.length || 1}/{squad.maxMembers || 5}</span>
                        </div>
                      </div>
                    </Surface>
                  );
                })}
              </div>
            ) : (
              <Surface className="py-16 text-center border-dashed border-border/60 bg-secondary/5 rounded-xl">
                <Users className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">No Squadrons Found</div>
                <p className="text-[10px] text-muted-foreground mt-2 uppercase max-w-xs mx-auto leading-relaxed">
                  {filter === 'all' 
                    ? "Establish a standalone unit or enter an invite code to enlist."
                    : filter === 'mine' 
                      ? "You are not commanding any squadrons currently."
                      : "You have not joined any squadrons as an operative."}
                </p>
              </Surface>
            )}
          </div>

          {/* ===================== RIGHT: COMMAND & MINTING ===================== */}
          <div className="space-y-4">
            
            {/* Mint New Squadron */}
            <Surface className="p-4 space-y-3 border border-border/50 bg-background/40 rounded-xl">
              <div className="space-y-1">
                <h4 className="text-[12px] font-bold uppercase tracking-[0.15em] text-foreground">
                  Mint Standalone Squad
                </h4>
                <p className="text-[10px] text-muted-foreground uppercase leading-relaxed">
                  Establish a new persistent taskforce.
                </p>
              </div>

              <form onSubmit={handleCreateSquad} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Squadron Name</label>
                  <Input 
                    value={squadName}
                    onChange={(e) => setSquadName(e.target.value)}
                    placeholder="e.g. Omega Wing"
                    className="h-9 bg-secondary/20 text-[12px] font-bold uppercase"
                    disabled={createSquadMutation.isPending}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Max Member Capacity</label>
                  <select 
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Number(e.target.value))}
                    className="w-full h-9 bg-secondary/20 border border-border text-[11px] font-bold uppercase rounded px-2.5 outline-none focus:border-primary text-foreground"
                    disabled={createSquadMutation.isPending}
                  >
                    {[2,3,4,5,6,7,8,9,10].map(n => (
                      <option key={n} value={n} className="bg-background">{n} Members</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit"
                  disabled={createSquadMutation.isPending || !squadName.trim()}
                  className="w-full h-9 bg-primary hover:brightness-110 text-primary-foreground font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 rounded transition-all disabled:opacity-50"
                >
                  {createSquadMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>Establish Unit</>
                  )}
                </button>
              </form>
            </Surface>

            {/* Join Squadron */}
            <Surface className="p-4 space-y-3 border border-border/50 bg-background/40 rounded-xl">
              <div className="space-y-1">
                <h4 className="text-[12px] font-bold uppercase tracking-[0.15em] text-foreground">
                  Enlist in Squad
                </h4>
                <p className="text-[10px] text-muted-foreground uppercase leading-relaxed">
                  Enter an invitation registry code to enlist in a squad roster.
                </p>
              </div>

              <form onSubmit={handleJoinSquad} className="space-y-3 pt-1">
                <Input 
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="INVITE CODE"
                  className="h-9 bg-secondary/20 font-mono tracking-widest text-center font-bold uppercase text-[12px]"
                  disabled={joinSquadMutation.isPending}
                />
                <button 
                  type="submit"
                  disabled={joinSquadMutation.isPending || !inviteCode.trim()}
                  className="w-full h-9 bg-secondary border border-border hover:bg-border text-foreground font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 rounded transition-all disabled:opacity-50"
                >
                  {joinSquadMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>Verify & Enlist</>
                  )}
                </button>
              </form>
            </Surface>

            {/* Strategic Overview */}
            <Surface className="p-4 space-y-3 border border-border/50 bg-background/40 rounded-xl">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-2">
                Strategic Intelligence
              </h4>
              <div className="text-[11px] leading-relaxed text-muted-foreground/80 space-y-3 uppercase tracking-wide">
                <p>
                  Standalone squadrons can collaborate on persistent projects and build logs in the **Circuit Lab** dynamically.
                </p>
                <p>
                  Commanders can allocate taskforces to track telemetry inside the **Circuit Lab** dynamically, establishing multi-layered telemetry logs.
                </p>
              </div>
            </Surface>

          </div>

        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
