import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/VeritaBox/AdminLayout";
import { PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Stat, Pill } from "@/components/VeritaBox/UI";
import { 
  Plus, Search, Filter, MoreVertical, 
  Calendar, Users, Trophy, ExternalLink,
  Loader2, AlertCircle, LayoutGrid, List
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminHackathons() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newData, setNewData] = useState({ title: "", description: "", shortDescription: "" });

  const { data: hackathons, isLoading, error } = useQuery({
    queryKey: ["admin-hackathons"],
    queryFn: () => hackathonsApi.getAllAdmin(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string; shortDescription: string }) => hackathonsApi.create(data),
    onSuccess: (data) => {
      toast.success("Mission draft generated in the archives.");
      queryClient.invalidateQueries({ queryKey: ["admin-hackathons"] });
      setShowCreateModal(false);
      setNewData({ title: "", description: "", shortDescription: "" });
      navigate(`/cmd/hackathons/${data._id}/manage`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = hackathons?.filter(h => 
    h.title.toLowerCase().includes(search.toLowerCase()) || 
    h.slug.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: hackathons?.length || 0,
    active: hackathons?.filter(h => h.status === "Live").length || 0,
    drafts: hackathons?.filter(h => h.status === "Draft").length || 0,
  };

  return (
    <AdminLayout>

      <PageContent>
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Stat label="Total Missions" value={stats.total} />
          <Stat label="Active Engagements" value={stats.active} dotColor="hsl(var(--destructive))" />
          <Stat label="Pending Archives" value={stats.drafts} dotColor="hsl(var(--warning))" />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search by title or mission slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 bg-card border border-border pl-10 pr-4 text-[13px] rounded-md outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setShowCreateModal(true)}
                className="h-10 px-5 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[11px] hover:brightness-110 shadow-lg shadow-primary/20 transition-all rounded flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> New Mission
              </button>
          
          <div className="flex items-center gap-2 border border-border p-1 rounded-md bg-card/50">
            <button 
              onClick={() => setView("grid")}
              className={`p-1.5 rounded ${view === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setView("list")}
              className={`p-1.5 rounded ${view === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-destructive/5 border border-destructive/20 rounded-lg">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-3" />
            <p className="text-destructive font-medium">Failed to retrieve mission data.</p>
            <p className="text-[12px] text-muted-foreground mt-1">Please check your network clearance and try again.</p>
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground text-[14px]">No missions found matching your search criteria.</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered?.map((h) => (
              <Surface key={h._id} className="group hover:border-primary/40 transition-all p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Pill variant={
                        h.status === "Live" ? "danger" : 
                        h.status === "Announced" ? "success" : 
                        h.status === "Draft" ? "warning" : "secondary"
                      }>
                        {h.status}
                      </Pill>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase opacity-60">
                        {h.slug}
                      </span>
                    </div>
                    <h3 className="text-[16px] font-bold group-hover:text-primary transition-colors line-clamp-1">{h.title}</h3>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Archive Date: {format(new Date(h.createdAt), "MMM dd, yyyy")}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Operatives: {h.totalParticipants || 0}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link 
                    to={`/cmd/hackathons/${h._id}/manage`}
                    className="flex-1"
                  >
                    <button className="w-full h-8 bg-secondary text-[11px] font-bold uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all">
                      Manage Core
                    </button>
                  </Link>
                  <Link to={`/hackathons/${h.slug}`} target="_blank">
                    <button className="h-8 w-8 flex items-center justify-center border border-border hover:bg-secondary rounded">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </div>
              </Surface>
            ))}
          </div>
        ) : (
          <Surface className="overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Mission</th>
                  <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</th>
                  <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Stats</th>
                  <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Created</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered?.map((h) => (
                  <tr key={h._id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold">{h.title}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{h.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Pill variant={
                        h.status === "Live" ? "danger" : 
                        h.status === "Announced" ? "success" : 
                        h.status === "Draft" ? "warning" : "secondary"
                      }>
                        {h.status}
                      </Pill>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {h.totalParticipants || 0}</span>
                        <span className="flex items-center gap-1.5"><Trophy className="h-3 w-3" /> {h.teamsCount || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(h.createdAt), "dd/MM/yy")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/cmd/hackathons/${h._id}/manage`}>
                          <button className="h-8 px-3 bg-secondary hover:bg-primary/10 hover:text-primary text-[11px] font-bold uppercase rounded transition-all">
                            Manage
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <Surface className="w-full max-w-md p-6 shadow-2xl border-primary/20">
              <h2 className="text-[18px] font-bold mb-1 flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Spawning New Mission
              </h2>
              <p className="text-[13px] text-muted-foreground mb-6">Initialize a new hackathon protocol in draft mode.</p>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Mission Title</label>
                  <input 
                    value={newData.title}
                    onChange={(e) => setNewData({...newData, title: e.target.value})}
                    placeholder="e.g. Robot Wars 2026"
                    className="w-full h-10 bg-secondary px-4 text-[13px] rounded outline-none focus:ring-1 ring-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Mission Summary (Short Description)</label>
                    <span className={`text-[9px] font-mono ${newData.shortDescription.length > 170 ? 'text-destructive' : 'text-primary/50'}`}>
                      {newData.shortDescription.length}/180
                    </span>
                  </div>
                  <textarea 
                    value={newData.shortDescription}
                    onChange={(e) => setNewData({...newData, shortDescription: e.target.value.substring(0, 180)})}
                    placeholder="Provide a high-impact mission summary for cards (required)..."
                    className="w-full h-16 bg-secondary p-3 text-[13px] rounded outline-none focus:ring-1 ring-primary/50 resize-none font-sans"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Description Brief (Markdown)</label>
                  <textarea 
                    value={newData.description}
                    onChange={(e) => setNewData({...newData, description: e.target.value})}
                    placeholder="Detailed description of the mission objectives..."
                    className="w-full h-20 bg-secondary p-3 text-[13px] rounded outline-none focus:ring-1 ring-primary/50 resize-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-10 border border-border hover:bg-secondary text-[13px] font-medium"
                >
                  Abnormal Terminate
                </button>
                <button 
                  onClick={() => createMutation.mutate({
                    title: newData.title,
                    description: newData.description,
                    shortDescription: newData.shortDescription.trim() || newData.description.substring(0, 150).trim() || `${newData.title} Mission Brief.`
                  })}
                  disabled={!newData.title || createMutation.isPending}
                  className="flex-1 h-10 bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Initialize"}
                </button>
              </div>
            </Surface>
          </div>
        )}
      </PageContent>
    </AdminLayout>
  );
}
