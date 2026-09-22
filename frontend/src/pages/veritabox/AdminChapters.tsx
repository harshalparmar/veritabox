import { AdminLayout } from "@/components/VeritaBox/AdminLayout";
import { PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/VeritaBox/UI";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, Chapter, ChapterApplication, resolveAssetUrl } from "@/lib/api";
import { 
  Building2, Search, Filter, Check, X, 
  Trash2, Eye, Loader2, MoreHorizontal,
  ChevronRight, AlertCircle, FileText, 
  ShieldCheck, MapPin, Users, Send
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function AdminChapters() {
  const [activeTab, setActiveTab] = useState<"Registry" | "Queue">("Registry");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: chapters, isLoading: loadingChapters } = useQuery({
    queryKey: ["admin-chapters"],
    queryFn: () => adminApi.getChapters(),
  });

  const { data: applications, isLoading: loadingApps } = useQuery({
    queryKey: ["admin-chapter-apps"],
    queryFn: () => adminApi.getApplications(),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, adminNote }: { id: string; status: 'Approved' | 'Rejected'; adminNote?: string }) => 
      adminApi.reviewApplication(id, status, adminNote),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-chapter-apps"] });
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
      toast.success(`Application ${data.status.toLowerCase()} successfully`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to review application");
    }
  });

  const filteredChapters = chapters?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.university.toLowerCase().includes(search.toLowerCase())
  );

  const pendingApps = applications?.filter(a => a.status === 'Pending');

  return (
    <AdminLayout>
      <PageContent>
        <div className="mb-6 border-b border-border pb-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin System</span>
          <h1 className="text-[28px] font-semibold tracking-tight mt-1">Institute Command</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Orchestrate the global expansion of VeritaBox institutes and review enlistment requests.</p>
        </div>

        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Stat label="Total Institutes" value={chapters?.length?.toString() || "0"} />
            <Stat label="Pending Apps" value={pendingApps?.length?.toString() || "0"} accent="hsl(var(--warning))" />
            <Stat label="Total Operatives" value={chapters?.reduce((acc, c) => acc + (c.members?.length || 0), 0).toString() || "0"} />
            <Stat label="Global Footprint" value="12 Cities" icon={MapPin} />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-secondary/30 p-1 rounded border border-border w-fit">
            {(["Registry", "Queue"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${ activeTab === tab ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary" }`}
              >
                {tab === "Queue" && pendingApps && pendingApps.length > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                )}
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Registry" ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search institutes by name or university..." 
                  className="w-full h-9 bg-secondary/30 border border-border pl-10 pr-4 text-[12.5px] outline-none rounded focus:border-primary/50 transition-all"
                />
              </div>

              <div className="grid gap-3.5">
                {loadingChapters ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredChapters && filteredChapters.length > 0 ? (
                  filteredChapters.map((chapter) => (
                    <Surface key={chapter._id} className="p-3.5 flex items-center justify-between group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-secondary rounded flex items-center justify-center text-muted-foreground relative overflow-hidden border border-border shrink-0">
                          {chapter.logoUrl ? (
                            <img src={resolveAssetUrl(chapter.logoUrl)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-5 w-5 opacity-40" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13.5px] font-bold">{chapter.name}</span>
                            <Pill className={`text-[9px] h-4 ${
                              chapter.status === 'Active' ? 'bg-success/10 text-success border-success/30' : 'bg-muted/10 text-muted-foreground border-border'
                            }`}>
                              {chapter.status.toUpperCase()}
                            </Pill>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2 uppercase tracking-wider">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {chapter.city}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {chapter.members?.length || 0} Operatives</span>
                            <span>·</span>
                            <span className="text-primary font-mono font-medium">/{chapter.slug}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link to={`/chapters/${chapter.slug}`}>
                          <button className="h-8 px-3 flex items-center justify-center gap-1.5 bg-secondary border border-border rounded text-[10px] font-bold uppercase tracking-widest hover:bg-border transition-colors">
                            <Eye className="h-3.5 w-3.5" /> Dashboard
                          </button>
                        </Link>
                        <button className="h-8 w-8 flex items-center justify-center bg-secondary border border-border rounded hover:bg-border transition-colors">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Surface>
                  ))
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-[12px] border border-dashed border-border rounded">
                    <AlertCircle className="h-5 w-5 mb-1.5 opacity-50" />
                    No institutes found in the registry.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3">
                {loadingApps ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingApps && pendingApps.length > 0 ? (
                  pendingApps.map((app) => (
                    <Surface key={app._id} className="p-5 border-l-4" style={{ borderLeftColor: app.status === 'Pending' ? 'hsl(var(--warning))' : app.status === 'Approved' ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="space-y-3.5 flex-1">
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-[15px] font-bold">{app.universityName}</h3>
                            <Pill className={`text-[9px] ${
                              app.status === 'Pending' ? 'bg-warning/10 text-warning border-warning/30' : 
                              app.status === 'Approved' ? 'bg-success/10 text-success border-success/30' : 
                              'bg-destructive/10 text-destructive border-destructive/30'
                            }`}>
                              {app.status.toUpperCase()}
                            </Pill>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-8">
                            <div className="space-y-0.5">
                              <div className="text-[9px] uppercase font-mono text-muted-foreground">Proposed Identifier</div>
                              <div className="text-[12.5px] font-mono text-primary">VeritaBox.org/institutes/{app.proposedSlug}</div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-[9px] uppercase font-mono text-muted-foreground">Applicant</div>
                              <div className="text-[12.5px]">{app.applicantId?.name} <span className="text-muted-foreground">({app.applicantId?.universityId})</span></div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-[9px] uppercase font-mono text-muted-foreground">Expected Strength</div>
                              <div className="text-[12.5px]">{app.expectedMembers} targeted members</div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-[9px] uppercase font-mono text-muted-foreground">Applied On</div>
                              <div className="text-[12.5px]">{format(new Date(app.createdAt), 'MMMM dd, yyyy')}</div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[9px] uppercase font-mono text-muted-foreground">Mission Statement</div>
                            <p className="text-[12px] text-muted-foreground leading-relaxed">
                              {app.missionStatement}
                            </p>
                          </div>
                        </div>

                        {app.status === 'Pending' && (
                          <div className="flex flex-col gap-2 shrink-0 md:w-44">
                            <button 
                              onClick={() => {
                                if(confirm("Are you sure you want to approve this institute application? This will immediately create an active institute.")) {
                                  reviewMutation.mutate({ id: app._id, status: 'Approved' });
                                }
                              }}
                              disabled={reviewMutation.isPending}
                              className="w-full h-8.5 bg-success/15 text-success border border-success/20 rounded font-bold text-[11px] uppercase tracking-widest hover:bg-success/20 transition-all flex items-center justify-center gap-1.5"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button 
                              onClick={() => {
                                const note = prompt("Enter reason for rejection:");
                                if(note) reviewMutation.mutate({ id: app._id, status: 'Rejected', adminNote: note });
                              }}
                              disabled={reviewMutation.isPending}
                              className="w-full h-8.5 bg-destructive/15 text-destructive border border-destructive/20 rounded font-bold text-[11px] uppercase tracking-widest hover:bg-destructive/20 transition-all flex items-center justify-center gap-1.5"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </Surface>
                  ))
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-[12px] border border-dashed border-border rounded">
                    No applications in the queue.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PageContent>
    </AdminLayout>
  );
}
