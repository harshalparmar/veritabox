import { useState } from "react";
import { VeritaBoxLayout } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import { Link } from "react-router-dom";
import { 
  Loader2, Target, Search, Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { bountiesApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

const statusVariant = (s: string): any => s === "Open" ? "success" : s === "Assigned" ? "warning" : "default";

export default function Bounties() {
  const [activeFilter, setActiveFilter] = useState("Active");

  const { data: bounties, isLoading } = useQuery({
    queryKey: ["bounties"],
    queryFn: () => bountiesApi.getAll(),
  });

  const filtered = bounties?.filter(b => {
    if (activeFilter === "Active") return b.status === "Open" || b.status === "Assigned";
    if (activeFilter === "Open") return b.status === "Open";
    if (activeFilter === "In Progress") return b.status === "Assigned";
    if (activeFilter === "Resolved") return b.status === "Resolved";
    return true;
  });

  return (
    <VeritaBoxLayout>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Tactical Board</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Bounties</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground max-w-xl">
            Mission-critical tasks issued by Chapters or HQ. Secure the signal, earn reputation, and rank up.
          </p>

          <div className="flex gap-8 mt-8 pt-6 border-t border-border/50 overflow-x-auto scrollbar-none">
            <div className="min-w-fit">
              <div className="text-[10px] uppercase text-muted-foreground tracking-widest font-medium mb-1">Total Pool</div>
              <div className="text-[20px] font-semibold tracking-tight text-foreground">
                 {(bounties?.reduce((acc, b) => acc + (b.pointReward || 0), 0) || 0).toLocaleString()} <span className="text-[11px] text-muted-foreground ml-1">Rep</span>
              </div>
            </div>
            <div className="min-w-fit">
              <div className="text-[10px] uppercase text-muted-foreground tracking-widest font-medium mb-1">Active</div>
              <div className="text-[20px] font-semibold tracking-tight text-foreground">
                 {bounties?.filter(b => b.status === "Open" || b.status === "Assigned").length || 0}
              </div>
            </div>
            <div className="min-w-fit">
              <div className="text-[10px] uppercase text-muted-foreground tracking-widest font-medium mb-1">Resolved</div>
              <div className="text-[20px] font-semibold tracking-tight text-foreground">
                 {bounties?.filter(b => b.status === "Resolved").length || 0}
              </div>
            </div>
            <div className="min-w-fit">
              <div className="text-[10px] uppercase text-muted-foreground tracking-widest font-medium mb-1">Total Payout</div>
              <div className="text-[20px] font-semibold tracking-tight text-foreground">
                 {(bounties?.filter(b => b.status === "Resolved").reduce((acc, b) => acc + (b.pointReward || 0), 0) || 0).toLocaleString()} <span className="text-[11px] text-muted-foreground ml-1">Claimed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {["Active", "Open", "In Progress", "Resolved"].map((t) => (
              <button 
                key={t} 
                onClick={() => setActiveFilter(t)}
                className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${
                  activeFilter === t 
                  ? "bg-foreground text-background border-foreground" 
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search missions..." className="pl-9 h-9 bg-secondary/30 border-border text-[12px] w-full" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
             No active bounties found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered?.map(b => (
              <Link key={b._id} to={`/bounties/${b._id}`}>
                <Surface hover className="group p-5 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <Pill variant={statusVariant(b.status)}>{b.status}</Pill>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{b.difficulty || 'Operative'}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold tracking-tight group-hover:text-primary transition-colors">{b.title}</h3>
                  <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed flex-1 line-clamp-2">
                    {b.description}
                  </p>
                  
                  {b.techStack && b.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                       {b.techStack.slice(0, 3).map((t: string) => (
                         <span key={t} className="text-[10px] text-muted-foreground bg-secondary/50 border border-border/40 px-1.5 py-0.5 rounded">
                            {t}
                         </span>
                       ))}
                       {b.techStack.length > 3 && (
                         <span className="text-[10px] text-muted-foreground">+{b.techStack.length - 3}</span>
                       )}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-border flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-warning">
                      <Target className="h-3.5 w-3.5" /> {b.pointReward || 10} Rep
                    </span>
                    <span className="flex items-center gap-1 ml-auto text-foreground/60">
                      <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(b.createdAt))} ago
                    </span>
                  </div>
                </Surface>
              </Link>
            ))}
          </div>
        )}
      </div>
    </VeritaBoxLayout>
  );
}
