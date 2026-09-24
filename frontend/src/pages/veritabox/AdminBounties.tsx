import { useState } from "react";
import { AdminLayout } from "@/components/veritabox/AdminLayout";
import { PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/veritabox/UI";
import { 
  Plus, Trophy, Calendar, Users, Target, 
  Search, ShieldAlert, Loader2, Save, Trash2, 
  Award, ChevronRight, Terminal, Zap, Edit3, 
  X, Box, CheckCircle2, MessageSquare, ExternalLink,
  Eye, Filter, ArrowUpRight, History, Info, Check
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bountiesApi, adminApi, resolveAssetUrl } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function AdminBounties() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingBounty, setEditingBounty] = useState<any>(null);
  const [reviewingBounty, setReviewingBounty] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");

  const { data: bounties, isLoading } = useQuery({
    queryKey: ["admin-bounties"],
    queryFn: () => bountiesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => bountiesApi.create(data),
    onSuccess: () => {
      toast.success("Mission registry updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-bounties"] });
      setIsAdding(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => bountiesApi.update(id, data),
    onSuccess: () => {
      toast.success("Mission code synchronized.");
      queryClient.invalidateQueries({ queryKey: ["admin-bounties"] });
      setEditingBounty(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bountiesApi.delete(id),
    onSuccess: () => {
      toast.success("Bounty purged from matrix.");
      queryClient.invalidateQueries({ queryKey: ["admin-bounties"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => bountiesApi.resolve(id),
    onSuccess: (data: any) => {
      toast.success(data.message || "Mission resolved.");
      queryClient.invalidateQueries({ queryKey: ["admin-bounties"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredBounties = bounties?.filter((b: any) => {
    const matchesSearch = b.title?.toLowerCase().includes(search.toLowerCase()) || 
                          b.assignedTo?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "Active" 
      ? (b.status === "Open" || b.status === "Assigned") 
      : (statusFilter === "All" || b.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const statuses = ["Active", "Open", "Assigned", "Resolved", "All"];

  return (
    <AdminLayout>
      <PageContent>
        <div className="space-y-6">
          {/* Tactical Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <Stat label="Total Registry" value={bounties?.length || 0} />
             <Stat label="Active Missions" value={bounties?.filter((b: any) => b.status === "Assigned").length || 0} accent="hsl(var(--warning))" />
             <Stat label="Total Resolved" value={bounties?.filter((b: any) => b.status === "Resolved").length || 0} accent="hsl(var(--success))" />
             <Stat label="Payout Value" value={`${bounties?.reduce((acc: any, b: any) => acc + (b.pointReward || 0), 0).toLocaleString()} pts`} hint="Accumulated Rep" />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
              <div className="flex flex-1 items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 max-w-[400px]">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input 
                    placeholder="Search missions or operatives..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-secondary/30 border-border" 
                   />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {statuses.map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn("text-[12px] px-3 py-1.5 border rounded transition-colors whitespace-nowrap", statusFilter === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogTrigger asChild>
                  <button className="h-10 px-6 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[11px] hover:brightness-110 shadow-lg shadow-primary/20 transition-all rounded flex items-center gap-2 whitespace-nowrap">
                    <Plus className="h-4 w-4" /> New Mission
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-[700px] bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-[18px] font-bold uppercase tracking-widest flex items-center gap-2">
                       <Target className="h-5 w-5 text-warning" /> Broadcast New Bounty
                    </DialogTitle>
                  </DialogHeader>
                  <BountyForm 
                    onSubmit={(data) => createMutation.mutate(data)} 
                    isPending={createMutation.isPending} 
                  />
                </DialogContent>
              </Dialog>
          </div>

          <Surface className="overflow-hidden border-border/50">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4">Mission Identifier</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4">Status</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4 text-center">Reward</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4">Assigned Operative</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4 text-center">Submissions</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                      <div className="text-[12px] font-mono text-muted-foreground">Synchronizing Tactical Uplink...</div>
                    </TableCell>
                  </TableRow>
                ) : filteredBounties?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                       <Box className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                       <div className="text-[14px] font-bold text-muted-foreground uppercase tracking-widest">Registry Empty</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBounties?.map((b: any) => (
                    <TableRow key={b._id} className="border-border/40 group hover:bg-secondary/10 transition-colors">
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors">{b.title}</div>
                          <div className="text-[10px] text-muted-foreground font-mono uppercase">Initiated {format(new Date(b.createdAt), "MMM dd, yyyy")}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Pill variant={b.status === "Open" ? "success" : b.status === "Resolved" ? "default" : "warning"} className="text-[9px] font-black uppercase">
                          {b.status}
                        </Pill>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <div className="text-[14px] font-black text-warning">{b.pointReward}</div>
                          <div className="text-[8px] font-black uppercase text-muted-foreground">Rep Pts</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {b.assignedTo ? (
                          <OperativeStatsCell user={b.assignedTo} />
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic">Unassigned</div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <button 
                          onClick={() => setReviewingBounty(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/50 border border-border rounded text-[11px] font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Submissions
                        </button>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                           <Dialog open={editingBounty?._id === b._id} onOpenChange={(open) => !open && setEditingBounty(null)}>
                             <DialogTrigger asChild>
                               <button 
                                onClick={() => setEditingBounty(b)}
                                className="h-8 w-8 flex items-center justify-center bg-secondary border border-border rounded hover:bg-border transition-colors text-muted-foreground hover:text-primary"
                                title="Edit Brief"
                               >
                                  <Edit3 className="h-4 w-4" />
                               </button>
                             </DialogTrigger>
                             <DialogContent className="max-w-[700px] bg-card border-border">
                               <DialogHeader>
                                 <DialogTitle className="text-[18px] font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Edit3 className="h-5 w-5 text-primary" /> Modify Mission Brief
                                 </DialogTitle>
                               </DialogHeader>
                               <BountyForm 
                                 initialData={b} 
                                 onSubmit={(data) => updateMutation.mutate({ id: b._id, data })} 
                                 isPending={updateMutation.isPending} 
                               />
                             </DialogContent>
                           </Dialog>

                           {b.status === "Assigned" && (
                             <button 
                              onClick={() => {
                                if (confirm(`Resolve mission and award ${b.pointReward} points to ${b.assignedTo?.name}?`)) {
                                  resolveMutation.mutate(b._id);
                                }
                              }}
                              disabled={resolveMutation.isPending}
                              className="h-8 w-8 flex items-center justify-center bg-success/10 border border-success/30 rounded hover:bg-success hover:text-white transition-all text-success"
                              title="Resolve Mission"
                             >
                                <CheckCircle2 className="h-4 w-4" />
                             </button>
                           )}

                           <button 
                            onClick={() => {
                              if (confirm("Purge mission from tactical matrix?")) deleteMutation.mutate(b._id);
                            }}
                            className="h-8 w-8 flex items-center justify-center bg-secondary border border-border rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            title="Delete Mission"
                           >
                              <Trash2 className="h-4 w-4" />
                           </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Surface>
        </div>

        {/* Submissions Review Modal */}
        <Dialog open={!!reviewingBounty} onOpenChange={(open) => !open && setReviewingBounty(null)}>
           <DialogContent className="max-w-3xl bg-card border-border p-0 overflow-hidden">
              <div className="p-6 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
                <DialogHeader className="p-0 text-left">
                   <DialogTitle className="text-[18px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <History className="h-5 w-5" /> Submission Matrix
                   </DialogTitle>
                   <p className="text-[11px] text-muted-foreground uppercase mt-1">Mission: {reviewingBounty?.title}</p>
                   <div className="hidden"><DialogDescription>Review operative submissions for this bounty</DialogDescription></div>
                </DialogHeader>
                <button onClick={() => setReviewingBounty(null)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-border transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <SubmissionReviewList bountyId={reviewingBounty?._id} onReviewSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-bounties"] })} />

              <div className="p-4 bg-secondary/30 border-t border-border/50 text-center">
                 <p className="text-[9px] text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
                    <ShieldAlert className="h-3 w-3 text-warning" /> Administrative clearance active for telemetry review
                 </p>
              </div>
           </DialogContent>
        </Dialog>
      </PageContent>
    </AdminLayout>
  );
}

function OperativeStatsCell({ user }: { user: any }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["operative-stats", user._id],
    queryFn: () => adminApi.getOperativeStats(user._id),
  });

  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-secondary border border-border overflow-hidden shrink-0">
        {user.avatarUrl ? (
          <img src={resolveAssetUrl(user.avatarUrl)} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-primary">{user.name?.[0]}</div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold truncate">{user.name}</div>
        <div className="flex items-center gap-2">
           <span className="text-[9px] text-muted-foreground font-mono uppercase">Rep: {user.reputationPoints || 0}</span>
           {!isLoading && stats && (
             <span className={cn(
              "text-[9px] font-black uppercase",
              stats.successRate > 75 ? "text-success" : stats.successRate > 40 ? "text-warning" : "text-destructive"
             )}>
               • {stats.successRate}% SR
             </span>
           )}
        </div>
      </div>
    </div>
  );
}

function SubmissionReviewList({ bountyId, onReviewSuccess }: { bountyId: string, onReviewSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [adminNote, setAdminNote] = useState("");

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["admin-bounty-submissions", bountyId],
    queryFn: () => bountiesApi.getSubmissions(bountyId),
    enabled: !!bountyId,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ subId, status }: { subId: string; status: 'Approved' | 'Rejected' }) => 
      bountiesApi.reviewSubmission(subId, status, adminNote),
    onSuccess: (_, variables) => {
      toast.success(`Submission ${variables.status}`);
      setAdminNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-bounty-submissions", bountyId] });
      onReviewSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4 custom-scrollbar">
       {submissions?.length === 0 ? (
         <div className="py-12 text-center text-muted-foreground text-[14px] italic">No submissions detected for this objective.</div>
       ) : (
         submissions?.map((sub: any) => (
           <Surface key={sub._id} className={cn(
             "p-5 space-y-4 border-l-4",
             sub.status === 'Pending' ? "border-l-warning" : sub.status === 'Approved' ? "border-l-success" : "border-l-destructive"
           )}>
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-secondary border border-border overflow-hidden">
                       {sub.userId?.avatarUrl ? (
                         <img src={resolveAssetUrl(sub.userId.avatarUrl)} className="h-full w-full object-cover" />
                       ) : (
                         <div className="h-full w-full flex items-center justify-center text-[11px] font-bold text-muted-foreground">{sub.userId?.name?.[0]}</div>
                       )}
                    </div>
                    <div>
                       <div className="text-[13px] font-bold">{sub.userId?.name}</div>
                       <div className="text-[9px] text-muted-foreground uppercase">{format(new Date(sub.createdAt), "MMM dd, HH:mm")}</div>
                    </div>
                 </div>
                 <Pill variant={sub.status === 'Pending' ? 'warning' : sub.status === 'Approved' ? 'success' : 'danger'} className="text-[9px] uppercase font-bold">
                    {sub.status}
                 </Pill>
              </div>

              <div className="space-y-3">
                 <div className="p-4 bg-secondary/30 border border-border/50 rounded font-mono text-[13px] text-foreground/80 whitespace-pre-wrap">
                    {sub.proofOfWork}
                 </div>
                 
                 {sub.links && sub.links.length > 0 && (
                   <div className="flex flex-wrap gap-2">
                      {sub.links.map((link: string, idx: number) => (
                        <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded text-[11px] text-primary hover:bg-primary/20 transition-all">
                           <ExternalLink className="h-3 w-3" /> Link {idx + 1}
                        </a>
                      ))}
                   </div>
                 )}
              </div>

              {sub.status === 'Pending' && (
                <div className="pt-4 border-t border-border/50 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Administrative Decision Note</label>
                        <Input 
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder="Approval credentials or rejection reasoning..."
                            className="h-10 bg-background/50 border-border"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => reviewMutation.mutate({ subId: sub._id, status: 'Approved' })}
                            disabled={reviewMutation.isPending}
                            className="flex-1 h-10 bg-success text-white font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:brightness-110 rounded transition-all"
                        >
                            <Check className="h-3.5 w-3.5" /> Approve Proof
                        </button>
                        <button 
                            onClick={() => reviewMutation.mutate({ subId: sub._id, status: 'Rejected' })}
                            disabled={reviewMutation.isPending}
                            className="flex-1 h-10 bg-destructive text-white font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:brightness-110 rounded transition-all"
                        >
                            <X className="h-3.5 w-3.5" /> Reject
                        </button>
                    </div>
                </div>
              )}
           </Surface>
         ))
       )}
    </div>
  );
}

function BountyForm({ onSubmit, isPending, initialData }: { onSubmit: (data: any) => void, isPending: boolean, initialData?: any }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    techStack: initialData?.techStack?.join(", ") || "",
    pointReward: initialData?.pointReward || 10,
    difficulty: initialData?.difficulty || "Operative"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      techStack: formData.techStack.split(",").map(t => t.trim()).filter(Boolean)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
        <div className="space-y-1.5">
           <label className="text-[11px] uppercase font-bold text-muted-foreground ml-1">Mission Identifier (Title)</label>
           <Input 
             required
             value={formData.title}
             onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
             className="bg-secondary/40 border-border" 
           />
        </div>

        <div className="space-y-1.5">
           <label className="text-[11px] uppercase font-bold text-muted-foreground ml-1">Mission Brief (Detailed Description)</label>
           <Textarea 
             required
             value={formData.description}
             onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
             className="bg-secondary/40 border-border min-h-[120px] resize-none" 
           />
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-muted-foreground ml-1">Tech Stack (Comma-Separated)</label>
              <Input 
                value={formData.techStack}
                onChange={(e) => setFormData(prev => ({ ...prev, techStack: e.target.value }))}
                placeholder="React, Node.js, Arduino..."
                className="bg-secondary/40 border-border" 
              />
           </div>
           <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-muted-foreground ml-1">Reputation Payload (Points)</label>
              <Input 
                type="number"
                value={formData.pointReward}
                onChange={(e) => setFormData(prev => ({ ...prev, pointReward: parseInt(e.target.value) || 0 }))}
                className="bg-secondary/40 border-border" 
              />
           </div>
        </div>

        <div className="space-y-1.5">
           <label className="text-[11px] uppercase font-bold text-muted-foreground ml-1">Difficulty Level</label>
           <div className="flex gap-2">
              {['Rookie', 'Operative', 'Elite'].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, difficulty: d }))}
                  className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", formData.difficulty === d ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                >
                  {d}
                </button>
              ))}
           </div>
        </div>

        <DialogFooter>
           <button 
             type="submit"
             disabled={isPending}
             className="h-11 px-8 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[12px] hover:brightness-110 shadow-lg shadow-primary/20 transition-all rounded flex items-center gap-2"
           >
             {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
             {initialData ? "Synchronize Signal" : "Broadcast Mission"}
           </button>
        </DialogFooter>
    </form>
  );
}
