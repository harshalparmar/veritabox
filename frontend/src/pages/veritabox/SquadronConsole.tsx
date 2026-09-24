import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { VeritaBoxLayout, PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, ToggleSwitch } from "@/components/veritabox/UI";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi, resolveAssetUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  Loader2, Users, Settings, ArrowLeft,
  ShieldAlert, DoorOpen, Globe, Cpu, 
  Code2, ShieldCheck, Copy, Check, Trash2,
  UserCheck, Shield, Crown, Key, ExternalLink
} from "lucide-react";

export default function SquadronConsole() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [roleMatrix, setRoleMatrix] = useState<Record<string, string>>({});
  const [tempName, setTempName] = useState("");
  const [tempBio, setTempBio] = useState("");

  // Selected squadron details
  const { data: activeSquadDetails, isLoading: loadingDetails, error } = useQuery({
    queryKey: ["squad-details", id],
    queryFn: () => hackathonsApi.getTeamById(id!),
    enabled: !!id,
  });

  // Sync state when squad details are fetched
  useEffect(() => {
    if (activeSquadDetails) {
      if (activeSquadDetails.memberRoles) {
        setRoleMatrix(activeSquadDetails.memberRoles);
      }
      setTempName(activeSquadDetails.teamName || "");
      setTempBio(activeSquadDetails.squadronBio || "");
    }
  }, [activeSquadDetails]);

  // Mutator: Kick Member (Commander only)
  const kickMemberMutation = useMutation({
    mutationFn: (params: { teamId: string; userId: string }) => 
      hackathonsApi.removeMember(params.teamId, params.userId),
    onSuccess: () => {
      toast.success("OPERATIVE REMOVED", {
        description: "The operative was detached from the squad roster.",
      });
      queryClient.invalidateQueries({ queryKey: ["squad-details", id] });
      queryClient.invalidateQueries({ queryKey: ["my-squads"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove member"),
  });

  // Mutator: Leave Squadron
  const leaveSquadMutation = useMutation({
    mutationFn: (teamId: string) => hackathonsApi.leaveSquadron(teamId),
    onSuccess: () => {
      toast.success("SQUAD ABANDONED", {
        description: "You have successfully left the unit.",
      });
      queryClient.invalidateQueries({ queryKey: ["my-squads"] });
      navigate("/squadrons");
    },
    onError: (err: any) => toast.error(err.message || "Failed to leave squadron"),
  });

  // Mutator: Dissolve Squadron (Commander only)
  const dissolveSquadMutation = useMutation({
    mutationFn: (teamId: string) => hackathonsApi.dissolveSquadron(teamId),
    onSuccess: () => {
      toast.success("SQUADRON DISSOLVED", {
        description: "The unit has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["my-squads"] });
      navigate("/squadrons");
    },
    onError: (err: any) => toast.error(err.message || "Failed to dissolve squadron"),
  });

  // Mutator: Synchronize Squadron Settings
  const updateSquadSettingsMutation = useMutation({
    mutationFn: (params: { teamId: string; data: any; label: string }) => 
      hackathonsApi.manageSquadron(params.teamId, params.data),
    onSuccess: (data, variables) => {
      toast.success(`${variables.label.toUpperCase()} SYNCHRONIZED`, {
        description: "Squadron configuration updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["squad-details", id] });
      queryClient.invalidateQueries({ queryKey: ["my-squads"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update settings"),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success("INVITE CODE COPIED", {
      description: "Code copied to clipboard.",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'Architect': return <Globe className="h-3.5 w-3.5" />;
      case 'Systems Specialist': return <Cpu className="h-3.5 w-3.5" />;
      case 'Logic Engineer': return <Code2 className="h-3.5 w-3.5" />;
      case 'QA/Proctor Guardian': return <ShieldCheck className="h-3.5 w-3.5" />;
      default: return <Users className="h-3.5 w-3.5" />;
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'Architect': return 'text-amber-500 bg-amber-500/5 border-amber-500/20';
      case 'Systems Specialist': return 'text-purple-500 bg-purple-500/5 border-purple-500/20';
      case 'Logic Engineer': return 'text-cyan-500 bg-cyan-500/5 border-cyan-500/20';
      case 'QA/Proctor Guardian': return 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20';
      default: return 'text-muted-foreground bg-secondary/20 border-border';
    }
  };

  if (loadingDetails) {
    return (
      <VeritaBoxLayout>
        <PageContent>
          <div className="flex justify-center items-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
          </div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  if (error || !activeSquadDetails) {
    return (
      <VeritaBoxLayout>
        <PageContent>
          <div className="max-w-2xl mx-auto py-16 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
            <h2 className="text-lg font-bold uppercase tracking-wider">Console Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wide leading-relaxed">
              The requested squadron does not exist or you lack correct operational authority to access this console.
            </p>
            <Link to="/squadrons" className="inline-flex items-center gap-2 mt-6 h-9 px-4 bg-secondary hover:bg-border border border-border text-[11px] font-bold uppercase tracking-wider rounded transition-colors">
              <ArrowLeft className="h-4 w-4" /> Return to HQ
            </Link>
          </div>
        </PageContent>
      </VeritaBoxLayout>
    );
  }

  const isCommander = (activeSquadDetails.leader as any)?._id === user?._id;

  return (
    <VeritaBoxLayout>
      <PageContent>
        <div className="w-full space-y-4">
          
          {/* Back link */}
          <div className="flex items-center justify-between">
            <Link 
              to="/squadrons" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Squadron HQ
            </Link>

            <Link 
              to={`/squadron/${activeSquadDetails.slug || activeSquadDetails._id}`} 
              className="h-8 px-3 border border-border hover:bg-secondary rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all text-muted-foreground hover:text-foreground"
            >
              Public Profile <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            
            {/* LEFT 2 COLUMNS: MEMBERS & OVERVIEW */}
            <div className="lg:col-span-2 space-y-4">
              <Surface className="p-4 md:p-5 space-y-5 border border-border/60 relative overflow-hidden bg-background/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/20 pb-3 gap-3">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                      Operational Console
                    </span>
                    <h4 className="text-[20px] font-bold tracking-wider uppercase text-foreground mt-0.5">{activeSquadDetails.teamName}</h4>
                  </div>
                  
                  {activeSquadDetails.inviteCode && (
                    <div className="h-8 border border-border bg-secondary/15 px-2.5 rounded-lg flex items-center gap-2 shrink-0">
                      <span className="text-[9px] uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-1"><Key className="h-3 w-3" /> Invite:</span>
                      <span className="font-mono text-[11.5px] font-semibold text-foreground tracking-wider">{activeSquadDetails.inviteCode}</span>
                      <button 
                        onClick={() => copyToClipboard(activeSquadDetails.inviteCode)}
                        className="h-5 w-5 rounded hover:bg-secondary/40 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                        title="Copy Code"
                      >
                        {copiedCode === activeSquadDetails.inviteCode ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Members List */}
                <div className="space-y-3">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground pb-1.5 border-b border-border/20 flex items-center justify-between">
                    <span>Roster Directory</span>
                    <span className="font-mono">{activeSquadDetails.members?.length || 0} / {activeSquadDetails.maxMembers || 5} Operatives</span>
                  </div>

                  <div className="grid gap-2">
                    {activeSquadDetails.members?.map((member: any) => {
                      const isMemberCommander = member._id === (activeSquadDetails.leader as any)?._id;
                      const currentRole = roleMatrix[member._id] || (isMemberCommander ? 'Architect' : 'Operative');
                      
                      return (
                        <div key={member._id} className="p-3 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border/60 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg border border-border/60 overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
                              {member.avatarUrl ? (
                                <img src={resolveAssetUrl(member.avatarUrl)} className="h-full w-full object-cover" />
                              ) : (
                                <span className="font-bold text-[12px] text-muted-foreground/80 uppercase">
                                  {member.name?.substring(0,2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="text-[13px] font-bold flex items-center gap-1.5 leading-none">
                                <span className="text-foreground/90">{member.name}</span>
                                {isMemberCommander && (
                                  <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-lg">
                                    Leader
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1">
                                Reputation: <span className="font-mono text-foreground/75 font-semibold">{member.reputationPoints || 0}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {/* Specialized Role Selection */}
                            {isCommander && !isMemberCommander ? (
                              <select 
                                value={currentRole}
                                onChange={(e) => {
                                  const updatedRoles = { ...roleMatrix, [member._id]: e.target.value };
                                  setRoleMatrix(updatedRoles);
                                  updateSquadSettingsMutation.mutate({
                                    teamId: id!,
                                    data: { memberRoles: updatedRoles },
                                    label: "Role Matrix"
                                  });
                                }}
                                className="bg-background border border-border text-[9px] font-bold uppercase rounded-lg px-2.5 py-1 outline-none focus:border-primary cursor-pointer text-muted-foreground focus:text-foreground"
                              >
                                <option value="Operative">Operative</option>
                                <option value="Architect">Architect</option>
                                <option value="Systems Specialist">Systems Specialist</option>
                                <option value="Logic Engineer">Logic Engineer</option>
                                <option value="QA/Proctor Guardian">QA/Proctor Guardian</option>
                              </select>
                            ) : (
                              <span className={cn(
                                "text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border flex items-center gap-1.5",
                                getRoleColor(currentRole)
                              )}>
                                {getRoleIcon(currentRole)} {currentRole}
                              </span>
                            )}

                            {/* Evict Member */}
                            {isCommander && !isMemberCommander && (
                              <button 
                                onClick={() => {
                                  if(confirm(`Are you sure you want to remove operative [${member.name}] from the squad?`)) {
                                    kickMemberMutation.mutate({ teamId: id!, userId: member._id });
                                  }
                                }}
                                className="h-7 w-7 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0"
                                title="Remove Member"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Surface>
            </div>

            {/* RIGHT COLUMN: CONFIG & CONTROLS */}
            <div className="space-y-4">
              
              {/* Configuration Settings */}
              {isCommander && (
                <Surface className="p-4 md:p-5 space-y-4 border border-border/60 bg-background/40 rounded-xl">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground pb-1.5 border-b border-border/20">
                    Configuration Settings
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Squadron Designation</label>
                      <input 
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder="Squadron Name"
                        className="w-full h-8 bg-secondary/20 border border-border text-[11px] font-bold uppercase rounded-lg px-3 outline-none focus:border-primary text-foreground"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Max Member Capacity</label>
                      <select 
                        value={activeSquadDetails.maxMembers || 5}
                        onChange={(e) => {
                          updateSquadSettingsMutation.mutate({
                            teamId: id!,
                            data: { maxMembers: Number(e.target.value) },
                            label: "Member Capacity Limit"
                          });
                        }}
                        className="w-full h-8 bg-secondary/20 border border-border text-[11px] font-bold uppercase rounded-lg px-2 outline-none focus:border-primary text-foreground"
                      >
                        {[2,3,4,5,6,7,8,9,10].map(n => (
                          <option key={n} value={n} className="bg-background">{n} Members</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Objectives & Mission Brief</label>
                      <textarea 
                        value={tempBio}
                        onChange={(e) => setTempBio(e.target.value)}
                        placeholder="Operational goals & strategy..."
                        rows={4}
                        className="w-full bg-secondary/20 border border-border text-[11px] rounded-lg px-3 py-2 outline-none focus:border-primary text-foreground resize-none leading-relaxed"
                      />
                    </div>

                    <button
                      onClick={() => {
                        updateSquadSettingsMutation.mutate({
                          teamId: id!,
                          data: { teamName: tempName, squadronBio: tempBio },
                          label: "Directives & Designation"
                        });
                      }}
                      disabled={updateSquadSettingsMutation.isPending || !tempName.trim()}
                      className="w-full h-8 bg-primary hover:brightness-110 text-primary-foreground font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 rounded-lg transition-all disabled:opacity-50"
                    >
                      {updateSquadSettingsMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Save Directives"
                      )}
                    </button>
                  </div>
                </Surface>
              )}

              {/* Action Controls */}
              <Surface className="p-4 md:p-5 border border-border/60 bg-background/40 rounded-xl space-y-3">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground pb-1.5 border-b border-border/20">
                  Security Controls
                </div>

                {isCommander ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-primary/80">
                      <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Commander Authority Active</span>
                    </div>
                    <button 
                      onClick={() => {
                        if (confirm("WARNING: Disbanding this squadron permanently deletes the invite registry and breaks Circuit Lab coupling. This operation is irreversible. Proceed?")) {
                          dissolveSquadMutation.mutate(id!);
                        }
                      }}
                      className="w-full h-8 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground border border-destructive/20 font-bold uppercase tracking-wider text-[9px] rounded-lg flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Trash2 className="h-3 w-3" /> Dissolve Taskforce
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-muted-foreground/60 text-[9px] uppercase tracking-wider font-mono">
                      Operative Credentials Active
                    </div>
                    <button 
                      onClick={() => {
                        if (confirm("Are you sure you want to detach from this squadron? You will lose coupling with their builds.")) {
                          leaveSquadMutation.mutate(id!);
                        }
                      }}
                      className="w-full h-8 border border-destructive/30 hover:bg-destructive/10 text-destructive font-bold uppercase tracking-wider text-[9px] rounded-lg flex items-center justify-center gap-1.5 transition-all"
                    >
                      <DoorOpen className="h-3 w-3" /> Leave Taskforce
                    </button>
                  </div>
                )}
              </Surface>
            </div>

          </div>
        </div>
      </PageContent>
    </VeritaBoxLayout>
  );
}
