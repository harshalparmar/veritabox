import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api";
import { Loader2, Zap, LayoutGrid, List, Plus, GitFork, History } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const stageVariant = (s: string): any => {
    switch (s) {
        case "Battle-Ready": return "success";
        case "Testing": return "info";
        case "Prototype": return "warning";
        case "Ideation": return "default";
        case "Mission-Complete": return "purple";
        default: return "default";
    }
};

export default function Lab() {
  const [filter, setFilter] = useState("All");
  const { user } = useAuth();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects-mainnet"],
    queryFn: () => projectsApi.getMainnet(),
  });

  const categories = ["All", ...new Set(projects?.flatMap(p => p.techStack || []) || [])];

  const filteredProjects = projects?.filter(p => 
    filter === "All" || p.techStack?.includes(filter)
  );

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Engineering Intel</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Circuit Lab</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground max-w-xl">
            Living build logs — tracking innovation from conceptualization to full-scale mission deployment.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((t) => (
              <button 
                key={t} 
                onClick={() => setFilter(t)}
                className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${
                  filter === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {t}
              </button>
            ))}
            
            {user && (
              <Link to="/lab/new">
                <button className="text-[12px] px-3 py-1.5 bg-primary text-primary-foreground border border-primary rounded hover:brightness-110 transition-colors flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Start Build
                </button>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
            <button className="p-1.5 rounded bg-background shadow-sm text-foreground"><LayoutGrid className="h-3.5 w-3.5" /></button>
            <button className="p-1.5 rounded text-muted-foreground hover:text-foreground"><List className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects?.map(p => (
              <Link key={p._id} to={`/lab/${p._id}`}>
                <Surface hover className="group p-5 h-full flex flex-col justify-between border-border/50 hover:border-primary/20 transition-all rounded-xl min-h-[160px]">
                  <div>
                    {/* Top Row: Icon + Title */}
                    <div className="flex items-center gap-2">
                      <GitFork className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                      <h3 className="text-[14px] font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                        {p.title}
                      </h3>
                      {p.isVerified && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20 font-bold uppercase tracking-widest shrink-0 ml-auto scale-90">
                          Verified
                        </span>
                      )}
                    </div>

                    {/* Tagline / Brief Description */}
                    <p className="text-[12.5px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {p.tagline || p.description || 'No mission briefing provided.'}
                    </p>
                  </div>

                  {/* Bottom Row: Tech Indicator + Stats */}
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border/10">
                    {/* Tech Dot */}
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        p.status === "Battle-Ready" || p.status === "Mission-Complete" ? "bg-emerald-500 animate-pulse" :
                        p.status === "Testing" ? "bg-blue-500" :
                        p.status === "Prototype" ? "bg-amber-500" :
                        "bg-purple-500"
                      )} />
                      <span>{p.techStack?.[0] || "General"}</span>
                    </div>

                    {/* Logs Count Stat */}
                    <div className="flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 opacity-60" />
                      <span>{p.progressMatrix?.length || 0} logs</span>
                    </div>


                  </div>
                </Surface>
              </Link>
            ))}
            
            {(!filteredProjects || filteredProjects.length === 0) && (
              <div className="col-span-full py-24 text-center border-2 border-dashed border-border rounded-3xl bg-secondary/10">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-[18px] font-bold uppercase tracking-widest text-muted-foreground/60">Registry Empty</h3>
                <p className="text-muted-foreground/40 text-[13px] mt-2 max-w-xs mx-auto">
                  No build logs match your current sector filters. Start a new build to expand the knowledge matrix.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
