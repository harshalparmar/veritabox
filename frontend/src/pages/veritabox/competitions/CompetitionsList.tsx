import { Link } from "react-router-dom";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { Surface, Pill } from "@/components/VeritaBox/UI";
import { Calendar, Users, Trophy, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { competitionsApi } from "@/lib/api";
import { useState } from "react";

const statusVariant = (s: string): any => s === "Registration" ? "success" : s === "AbstractSelection" ? "warning" : s === "Offline" ? "danger" : "default";

export default function CompetitionsList() {
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ['competitions'],
    queryFn: () => competitionsApi.getAll()
  });

  const filteredCompetitions = competitions.filter((c: any) => {
    if (activeFilter === "All") return true;
    return c.currentPhase === activeFilter;
  });

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Operations</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Competitions</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground max-w-xl">
            Test your capabilities against the network. Form a squadron or operate solo. Progress through the phases to reach the final offline engagement.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-8">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {["All", "Registration", "AbstractSelection", "Offline"].map((t) => (
            <button 
              key={t} 
              onClick={() => setActiveFilter(t)}
              className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors ${
                activeFilter === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t === "AbstractSelection" ? "Abstract Selection" : t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCompetitions?.map((comp: any) => (
              <Link key={comp._id} to={`/competitions/${comp.slug}`}>
                <Surface hover className="h-full flex flex-col overflow-hidden group">
                  <div className="h-40 w-full overflow-hidden relative">
                    <div className="absolute top-3 right-3 z-10">
                      <Pill variant={statusVariant(comp.currentPhase)} className="backdrop-blur-md bg-background/80 font-bold">
                        {comp.currentPhase === "AbstractSelection" ? "ABSTRACT SELECTION" : comp.currentPhase.toUpperCase()}
                      </Pill>
                    </div>
                    <img src={(comp.thumbnailImage || comp.coverImage)?.startsWith('/') ? `http://localhost:5000${comp.thumbnailImage || comp.coverImage}` : (comp.thumbnailImage || comp.coverImage)} alt={comp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-end mb-3">
                      <span className="text-[10px] font-mono text-muted-foreground">Global HQ</span>
                    </div>
                    <h3 className="text-[15px] font-semibold tracking-tight">{comp.title}</h3>
                    <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed flex-1 line-clamp-3">
                      {comp.overview || "No tactical summary provided for this mission."}
                    </p>
                    <div className="mt-4 pt-3 border-t border-border flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {comp.competitionDate ? new Date(comp.competitionDate).toLocaleDateString() : "TBA"}
                      </span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Solo & Squadrons</span>
                      <span className="flex items-center gap-1 ml-auto text-foreground/80"><Trophy className="h-3 w-3" /> Reputation</span>
                    </div>
                  </div>
                </Surface>
              </Link>
            ))}
            {(!filteredCompetitions || filteredCompetitions.length === 0) && (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                No active competitions detected in this sector.
              </div>
            )}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
