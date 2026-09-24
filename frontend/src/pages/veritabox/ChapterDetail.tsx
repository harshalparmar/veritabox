import { useParams, Link } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { 
  Users, Award, MapPin, Globe, Loader2,
  ChevronLeft, MessageSquare, TrendingUp, Calendar, Zap,
  Building2, Shield
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { chaptersApi, resolveAssetUrl } from "@/lib/api";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function ChapterDetail() {
  const { id } = useParams();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const { profile } = useAuth();
  
  const { data: chapter, isLoading, error } = useQuery({
    queryKey: ["chapter", id],
    queryFn: () => chaptersApi.getBySlug(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PublicShell>
    );
  }

  if (error || !chapter) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-md py-20 text-center space-y-4">
          <Globe className="h-10 w-10 text-muted-foreground mx-auto opacity-30" />
          <h2 className="text-[16px] font-bold uppercase tracking-wider">Institute Not Found</h2>
          <p className="text-muted-foreground text-[12.5px]">The requested university sector is not active in the network.</p>
          <Link to="/chapters" className="text-primary hover:underline font-bold text-[11px] uppercase tracking-widest block pt-2">Return to Institutes</Link>
        </div>
      </PublicShell>
    );
  }

  const themeColor = chapter.themeColor || "hsl(var(--primary))";

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1400px] w-full px-8 py-8">
          <div className="mb-4">
            <Link to="/chapters" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
              <ChevronLeft className="h-3 w-3" /> Back to Institutes
            </Link>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded bg-secondary/50 border border-border flex items-center justify-center overflow-hidden shrink-0 mt-1">
                {chapter.logoUrl ? (
                  <img src={resolveAssetUrl(chapter.logoUrl)} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Pill variant="info" className="text-[9px] uppercase tracking-wider font-bold h-5 px-2">
                    {chapter.tier || "PROVISIONAL"} Tier
                  </Pill>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">ID: {chapter._id?.substring(0, 8).toUpperCase()}</span>
                </div>
                <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight leading-tight">{chapter.name}</h1>
                <p className="mt-1 text-[12px] text-muted-foreground flex items-center gap-1.5 uppercase font-medium">
                  <MapPin className="h-3.5 w-3.5 opacity-60" /> {chapter.city} · <Globe className="h-3.5 w-3.5 opacity-60" /> {chapter.university}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              {(() => {
                const isLead = chapter.leads?.some((l: any) => l._id === profile?._id || l === profile?._id);
                const isMember = chapter.members?.some((m: any) => m._id === profile?._id || m === profile?._id) || profile?.chapterId === chapter._id;

                if (isLead) {
                  return (
                    <Link to="/dashboard/chapter">
                      <button className="h-9 px-6 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[11px] rounded hover:brightness-110 active:scale-[0.98] transition-all">
                        Institute Command
                      </button>
                    </Link>
                  );
                }
                
                if (isMember) {
                  return (
                    <button disabled className="h-9 px-6 bg-secondary text-foreground font-bold uppercase tracking-widest text-[11px] rounded opacity-70 cursor-not-allowed">
                      You are enlisted here
                    </button>
                  );
                }

                if (!profile) {
                  return (
                    <Link to="/register">
                      <button className="h-9 px-6 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[11px] rounded hover:brightness-110 active:scale-[0.98] transition-all">
                        Log in to Enlist
                      </button>
                    </Link>
                  );
                }

                return (
                  <button 
                    onClick={() => setIsJoinModalOpen(true)}
                    className="h-9 px-6 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[11px] rounded hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    Enlist in Institute
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] w-full px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Description */}
            <Surface className="p-6 bg-background/40 border border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Institute Briefing</h2>
              <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                {chapter.description || "Initializing chapter briefing. This sector coordinates technical operations and robotics design pipelines locally."}
              </p>
            </Surface>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Surface className="p-4 flex flex-col justify-between bg-background/40 border border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Operatives</span>
                <span className="text-[20px] font-bold mt-2">{chapter.members?.length || 0}</span>
              </Surface>
              <Surface className="p-4 flex flex-col justify-between bg-background/40 border border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Net Reputation</span>
                <span className="text-[20px] font-bold mt-2">{(chapter.stats?.totalReputation || 0).toLocaleString()} XP</span>
              </Surface>
              <Surface className="p-4 flex flex-col justify-between bg-background/40 border border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Active Bounties</span>
                <span className="text-[20px] font-bold mt-2 text-warning">{chapter.stats?.activeBounties || 0}</span>
              </Surface>
              <Surface className="p-4 flex flex-col justify-between bg-background/40 border border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">HW Allocation</span>
                <span className="text-[20px] font-bold mt-2 text-info">{chapter.stats?.hardwareUtilization || 0}%</span>
              </Surface>
            </div>

            {/* Feeds */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5 mb-3">
                  <Zap className="h-4 w-4 text-primary" /> Sector Logs
                </h3>
                <Surface className="divide-y divide-border/40 overflow-hidden bg-background/40 border border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="p-4 flex gap-3 hover:bg-secondary/10 transition-colors">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-[12.5px] font-medium">Build log reported on "Mesh-Link V1"</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono uppercase">by @operative-{i+1} · 2 hours ago</div>
                      </div>
                    </div>
                  ))}
                </Surface>
              </div>
              
              <div>
                <h3 className="text-[12px] font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5 mb-3">
                  <Calendar className="h-4 w-4 text-primary" /> Regional Schedule
                </h3>
                <Surface className="p-6 text-center border border-dashed border-border/60 bg-background/40 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all flex flex-col items-center justify-center min-h-[160px]">
                  <div className="opacity-45 text-center">
                    <Shield className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-[12px] font-medium">No upcoming regional sessions found.</p>
                    <button className="text-[10px] uppercase font-bold text-primary mt-1 hover:underline">Request Event</button>
                  </div>
                </Surface>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Surface className="p-5 bg-background/40 border border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
              <h3 className="text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-success" /> Sector Health
              </h3>
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-[10px] uppercase font-mono mb-1">
                    <span className="text-muted-foreground">Rep. Velocity</span>
                    <span className="text-success font-bold">+{chapter.stats?.reputationVelocity || 0} XP/wk</span>
                  </div>
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-success" style={{ width: '65%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] uppercase font-mono mb-1">
                    <span className="text-muted-foreground">Compute Power</span>
                    <span className="text-success">84%</span>
                  </div>
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-success" style={{ width: '84%' }} />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-[10px] uppercase font-mono mb-1">
                    <span className="text-muted-foreground">Global Rank</span>
                    <span className="text-primary font-bold">#{chapter.stats?.rank || "--"}</span>
                  </div>
                </div>
              </div>
            </Surface>

            <Surface className="p-5 bg-background/40 border border-border/60 rounded-xl hover:border-foreground/30 hover:shadow-xs transition-all">
              <h3 className="text-[12px] font-bold uppercase tracking-widest mb-4">Tactical Leads</h3>
              <div className="space-y-2 flex flex-col">
                {chapter.leads?.map((lead: any) => (
                  <Link key={lead._id} to={`/profile/${lead.username || lead._id}`} className="p-2 rounded-lg hover:bg-secondary/40 border border-transparent hover:border-border/30 transition-all flex items-center gap-2.5 group">
                    <div className="h-8 w-8 rounded-lg bg-secondary border border-border flex items-center justify-center font-semibold text-primary group-hover:border-primary/50 transition-all shrink-0 overflow-hidden">
                      {lead.avatarUrl ? <img src={lead.avatarUrl} className="h-full w-full object-cover" /> : lead.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-bold group-hover:text-primary transition-all truncate leading-none">{lead.name}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1.5">Institute Lead</div>
                    </div>
                  </Link>
                ))}
                {(!chapter.leads || chapter.leads.length === 0) && (
                  <p className="text-[11px] text-muted-foreground italic pl-1">No sector leads assigned.</p>
                )}
              </div>
            </Surface>
          </div>
        </div>
      </div>

      <JoinRequestModal 
        isOpen={isJoinModalOpen} 
        onClose={() => setIsJoinModalOpen(false)} 
        chapter={chapter} 
      />
    </PublicShell>
  );
}

function JoinRequestModal({ isOpen, onClose, chapter }: { isOpen: boolean, onClose: () => void, chapter: any }) {
  const [formData, setFormData] = useState({ universityId: "", motivation: "", skills: "" });

  const applyMutation = useMutation({
    mutationFn: (data: any) => chaptersApi.applyToJoin(chapter._id, data),
    onSuccess: () => {
      toast.success("Enlistment request transmitted.", {
        description: "The sector leads will review your credentials shortly."
      });
      onClose();
    },
    onError: (err: any) => toast.error(err.message)
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] bg-card border-border shadow-2xl rounded-sm">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-bold uppercase tracking-wider">Sector Enlistment Protocol</DialogTitle>
          <DialogDescription className="text-[11.5px] mt-1">
            Requesting authorization to join the {chapter.name} engineering sector.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">University ID / Roll Number</label>
            <input 
              value={formData.universityId}
              onChange={e => setFormData({...formData, universityId: e.target.value})}
              placeholder="e.g. 2021BCS012"
              className="w-full h-9 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tactical Motivation</label>
            <textarea 
              value={formData.motivation}
              onChange={e => setFormData({...formData, motivation: e.target.value})}
              placeholder="Why do you wish to join this sector?"
              className="w-full min-h-[90px] bg-secondary/50 border border-border rounded p-3 text-[12px] outline-none focus:border-primary/50 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Specialized Skills</label>
            <input 
              value={formData.skills}
              onChange={e => setFormData({...formData, skills: e.target.value})}
              placeholder="ROS2, CAD, Python, PCB Design..."
              className="w-full h-9 bg-secondary/50 border border-border rounded px-3 text-[12px] outline-none focus:border-primary/50"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <button onClick={onClose} className="h-9 px-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Cancel</button>
          <button 
            onClick={() => applyMutation.mutate({...formData, skills: formData.skills.split(',').map(s => s.trim())})}
            disabled={applyMutation.isPending}
            className="h-9 px-6 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[11px] rounded shadow-lg shadow-primary/20 hover:brightness-110 flex items-center gap-2"
          >
            {applyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Transmit Request"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
