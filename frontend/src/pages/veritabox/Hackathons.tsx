import { Link } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { Calendar, Users, Trophy, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { hackathonsApi } from "@/lib/api";
import { useState } from "react";

const statusVariant = (s: string): any => s === "Live" ? "danger" : s === "Announced" ? "success" : s === "Draft" ? "info" : "default";

export default function Hackathons() {
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const { data: hackathons, isLoading } = useQuery({
    queryKey: ["hackathons", activeFilter],
    queryFn: () => hackathonsApi.getAll(),
  });

  const filteredHackathons = hackathons?.filter(h => {
    if (activeFilter === "All") return true;
    return h.status === activeFilter;
  });

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Operations</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Hackathons</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground max-w-xl">
            Live and upcoming missions across all chapters. Form a squadron, enter the arena, ship in time.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-8">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {["All", "Live", "Announced", "Concluded"].map((t) => (
            <button 
              key={t} 
              onClick={() => setActiveFilter(t)}
              className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${
                activeFilter === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredHackathons?.map(h => (
              <Link key={h._id} to={`/hackathons/${h.slug}`}>
                <Surface hover className="p-5 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <Pill variant={statusVariant(h.status)}>{h.status}</Pill>
                    <span className="text-[10px] font-mono text-muted-foreground">Global HQ</span>
                  </div>
                  <h3 className="text-[15px] font-semibold tracking-tight">{h.title}</h3>
                  <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed flex-1 line-clamp-3">
                    {h.shortDescription || "No tactical summary provided for this mission."}
                  </p>
                  <div className="mt-4 pt-3 border-t border-border flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {h.rounds?.[0]?.startTime ? new Date(h.rounds[0].startTime).toLocaleDateString() : "TBA"}
                    </span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {h.teamCount ?? 0} teams</span>
                    <span className="flex items-center gap-1 ml-auto text-foreground/80"><Trophy className="h-3 w-3" /> Reputation</span>
                  </div>
                </Surface>
              </Link>
            ))}
            {(!filteredHackathons || filteredHackathons.length === 0) && (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                No active missions detected in this sector.
              </div>
            )}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
