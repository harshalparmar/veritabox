import { AdminLayout } from "@/components/veritabox/AdminLayout";
import { PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/veritabox/UI";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feedApi, resolveAssetUrl } from "@/lib/api";
import { 
  Globe, Search, Filter, Trash2, Edit3, 
  MessageCircle, Clock, Users, ArrowUpRight, 
  Loader2, MoreHorizontal, ShieldAlert, CheckCircle2,
  Terminal, Image as ImageIcon, X, MessageSquare, Send
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function AdminMainnet() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [editingSignal, setEditingSignal] = useState<any>(null);
  const [moderatingComments, setModeratingComments] = useState<any>(null);
  
  const queryClient = useQueryClient();

  const { data: signals, isLoading } = useQuery({
    queryKey: ["admin-signals"],
    queryFn: () => feedApi.getAdminSignals(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => feedApi.deleteSignal(id),
    onSuccess: () => {
      toast.success("Signal decommissioned and purged from registry.");
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => feedApi.updateSignal(id, data),
    onSuccess: () => {
      toast.success("Signal updated across the Mainnet.");
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      setEditingSignal(null);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ signalId, commentId }: { signalId: string, commentId: string }) => 
      feedApi.deleteComment(signalId, commentId),
    onSuccess: (data) => {
      toast.success("Comment redacted from tactical logs.");
      // Manually update the moderatingComments signal data to reflect the change
      setModeratingComments(data); 
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const filteredSignals = signals?.filter((s: any) => {
    const matchesSearch = s.content?.toLowerCase().includes(search.toLowerCase()) || 
                          s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
                          s.type?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "All" || s.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types = ["All", "Broadcast", "Intelligence", "Mission", "Warning"];

  return (
    <AdminLayout>
      <div style={{ "--primary": "151.7 88.4% 44.1%", "--ring": "151.7 88.4% 44.1%" } as React.CSSProperties} className="contents">
        <PageContent>
          <div className="space-y-6">
            {/* Tactical Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Stat label="Total Signals" value={signals?.length || 0} />
              <Stat label="Live Broadcasts" value={signals?.filter((s: any) => s.type === 'Broadcast').length || 0} accent="hsl(var(--primary))" />
              <Stat label="Intel Reports" value={signals?.filter((s: any) => s.type === 'Intelligence').length || 0} accent="hsl(var(--info))" />
              <Stat label="Global Chapters" value={new Set(signals?.map((s: any) => s.chapterId?._id)).size || 0} hint="Active sectors" />
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by operative, content, or type..." 
                  className="pl-10 bg-secondary/30 border-border"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {types.map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={cn("text-[12px] px-3 py-1.5 border rounded transition-colors whitespace-nowrap", typeFilter === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Signal Table */}
            <Surface className="overflow-hidden border-border/50">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4">Operative</TableHead>
                    <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4">Type</TableHead>
                    <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4">Signal Content</TableHead>
                    <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4">Chapter</TableHead>
                    <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4 text-center">Interactions</TableHead>
                    <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4 text-right">Timestamp</TableHead>
                    <TableHead className="text-[10px] uppercase font-black tracking-widest h-10 px-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center animate-pulse">
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                          <div className="text-[12px] font-mono text-muted-foreground uppercase tracking-widest">Scanning Tactical Frequencies...</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredSignals?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                        <div className="text-[14px] font-bold text-muted-foreground uppercase tracking-widest">No signals detected in registry</div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSignals?.map((s: any) => (
                      <TableRow key={s._id} className="border-border/40 group hover:bg-secondary/10 transition-colors">
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-secondary border border-border overflow-hidden shrink-0">
                              {s.user?.avatarUrl ? (
                                <img src={resolveAssetUrl(s.user.avatarUrl)} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-[12px] font-bold text-primary">{s.user?.name?.[0]}</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[13px] font-bold text-foreground truncate">{s.user?.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono uppercase truncate">{s.user?.role}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Pill variant={s.type === 'Broadcast' ? 'primary' : s.type === 'Intelligence' ? 'info' : s.type === 'Warning' ? 'danger' : 'default'} className="text-[9px] h-5">
                            {s.type}
                          </Pill>
                        </TableCell>
                        <TableCell className="px-4 py-3 max-w-[300px]">
                          <div className="text-[13px] text-foreground/80 line-clamp-2 leading-relaxed">
                            {s.content || (s.code ? "Code Implementation Signal" : "Media Attached Signal")}
                          </div>
                          <div className="flex gap-2 mt-1.5 opacity-60">
                            {s.code && <Terminal className="h-3 w-3" />}
                            {s.attachments?.length > 0 && <ImageIcon className="h-3 w-3" />}
                            {s.isEdited && <span className="text-[8px] uppercase font-black text-primary">Edited</span>}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="text-[12px] font-medium text-muted-foreground">
                            {s.chapterId?.chapterName || "Global HQ"}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <button 
                            onClick={() => setModeratingComments(s)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-secondary/50 border border-border rounded text-[11px] font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {s.comments?.length || 0}
                          </button>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <div className="text-[12px] font-mono text-muted-foreground uppercase">
                            {format(new Date(s.createdAt), "MMM dd, HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => setEditingSignal(s)}
                              className="h-8 w-8 flex items-center justify-center bg-secondary border border-border rounded hover:bg-border transition-colors text-muted-foreground hover:text-primary"
                              title="Edit Signal"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm("Permanently purge this signal from the tactical feed?")) deleteMutation.mutate(s._id);
                              }}
                              className="h-8 w-8 flex items-center justify-center bg-secondary border border-border rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                              title="Delete Signal"
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

            <div className="py-4 flex justify-between items-center text-[12px] text-muted-foreground">
              <div>Showing {filteredSignals?.length || 0} of {signals?.length || 0} signals</div>
            </div>
          </div>

          {/* Edit Signal Dialog */}
          <Dialog open={!!editingSignal} onOpenChange={(open) => !open && setEditingSignal(null)}>
            <DialogContent className="max-w-2xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-[18px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-primary" /> Modify Tactical Signal
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Signal Content</label>
                  <Textarea 
                    value={editingSignal?.content} 
                    onChange={(e) => setEditingSignal({...editingSignal, content: e.target.value})}
                    className="min-h-[150px] bg-secondary/30 border-border resize-none"
                    placeholder="Enter updated mission details..."
                  />
                </div>
                
                {editingSignal?.code && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Attached Implementation (Code)</label>
                    <Textarea 
                      value={editingSignal?.code} 
                      onChange={(e) => setEditingSignal({...editingSignal, code: e.target.value})}
                      className="min-h-[200px] bg-secondary/50 border-border font-mono text-[13px] resize-none"
                    />
                  </div>
                )}

                <DialogFooter>
                  <button 
                    onClick={() => updateMutation.mutate({ 
                      id: editingSignal._id, 
                      data: { content: editingSignal.content, code: editingSignal.code } 
                    })}
                    disabled={updateMutation.isPending}
                    className="h-11 px-8 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[12px] rounded flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                  >
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Broadcast Changes
                  </button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* Comment Moderation Dialog */}
          <Dialog open={!!moderatingComments} onOpenChange={(open) => !open && setModeratingComments(null)}>
            <DialogContent className="max-w-xl bg-card border-border p-0 overflow-hidden">
              <div className="p-6 border-b border-border/50 bg-secondary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[16px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" /> Comment Registry
                    </h2>
                    <p className="text-[11px] text-muted-foreground uppercase mt-1">Operative: {moderatingComments?.user?.name}</p>
                  </div>
                  <button onClick={() => setModeratingComments(null)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-border transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                {moderatingComments?.comments?.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-[13px] italic">
                    No tactical feedback detected for this signal.
                  </div>
                ) : (
                  moderatingComments?.comments?.map((comment: any) => (
                    <div key={comment._id} className="p-4 bg-secondary/10 border border-border/40 rounded-lg flex gap-4 group">
                      <div className="h-8 w-8 rounded bg-secondary border border-border overflow-hidden shrink-0">
                        {comment.user?.avatarUrl ? (
                          <img src={resolveAssetUrl(comment.user.avatarUrl)} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[11px] font-bold text-muted-foreground">{comment.user?.name?.[0]}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-bold">{comment.user?.name}</span>
                          <span className="text-[9px] font-mono text-muted-foreground uppercase">{format(new Date(comment.createdAt), "MMM dd, HH:mm")}</span>
                        </div>
                        <p className="text-[13px] text-foreground/80 leading-relaxed">{comment.content}</p>
                      </div>
                      <button 
                        onClick={() => deleteCommentMutation.mutate({ signalId: moderatingComments._id, commentId: comment._id })}
                        disabled={deleteCommentMutation.isPending}
                        className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all shrink-0"
                        title="Delete Comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-secondary/30 border-t border-border/50 text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
                  <ShieldAlert className="h-3 w-3" /> Administrative moderation mode active
                </p>
              </div>
            </DialogContent>
          </Dialog>

        </PageContent>
      </div>
    </AdminLayout>
  );
}
