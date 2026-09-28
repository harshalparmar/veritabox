import { Link } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { Calendar, Trophy, Loader2, ArrowRight, Users, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { competitionsApi, resolveAssetUrl } from "@/lib/api";
import { useState } from "react";
import { SearchField } from "@/components/veritabox/SearchField";

const statusVariant = (s: string): any => s === "Registration" ? "success" : s === "AbstractSelection" ? "warning" : s === "OfflineCompetition" ? "info" : "default";

export default function CompetitionsList() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ['competitions'],
    queryFn: () => competitionsApi.getAll()
  });

  const filteredCompetitions = competitions.filter((c: any) => {
    const matchesPhase = activeFilter === "All" || c.currentPhase === activeFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [c.title, c.overview, c.problemStatement]
      .some(value => typeof value === "string" && value.toLowerCase().includes(query));
    return matchesPhase && matchesSearch;
  });
  const filterOptions = ["All", "Registration", "AbstractSelection", "OfflineCompetition"];
  const phaseCounts = filterOptions.reduce<Record<string, number>>((counts, phase) => {
    counts[phase] = phase === "All"
      ? competitions.length
      : competitions.filter(competition => competition.currentPhase === phase).length;
    return counts;
  }, {});

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto flex max-w-[1300px] flex-col gap-6 px-6 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Operations / Competitive Programs</div>
            <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Competitions</h1>
            <p className="mt-2 max-w-xl text-[13.5px] text-muted-foreground">
              Follow each competition from registration through abstract review to the final offline round.
            </p>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 divide-x divide-border border border-border bg-background/60">
            <div className="px-4 py-3">
              <div className="text-[10px] font-medium uppercase text-muted-foreground">Registration</div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums">{phaseCounts.Registration}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[10px] font-medium uppercase text-muted-foreground">All programs</div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums">{phaseCounts.All}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 border border-border bg-card/40 p-1" role="group" aria-label="Filter competitions by phase">
          {filterOptions.map((t) => (
            <button 
              key={t} 
              aria-pressed={activeFilter === t}
              onClick={() => setActiveFilter(t)}
              className={`flex items-center gap-2 px-3 py-2 text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                activeFilter === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t === "AbstractSelection" ? "Abstract selection" : t === "OfflineCompetition" ? "Offline competition" : t}
              <span className={`text-[10px] tabular-nums ${activeFilter === t ? "text-background/70" : "text-muted-foreground/70"}`}>{phaseCounts[t]}</span>
            </button>
          ))}
          </div>
          <SearchField label="competitions" placeholder="Search competitions..." value={search} onChange={setSearch} className="sm:max-w-sm" />
        </div>

        {!isLoading && <p className="mb-4 text-[11px] text-muted-foreground">{filteredCompetitions.length} {filteredCompetitions.length === 1 ? "competition" : "competitions"}</p>}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCompetitions?.map((comp: any) => (
              <Link key={comp._id} to={`/competitions/${comp.slug}`} className="group rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <Surface hover className="flex h-full min-h-[340px] flex-col overflow-hidden border-border/80 transition-all group-hover:-translate-y-0.5 group-hover:border-foreground/30 group-hover:shadow-lg">
                  <div className="relative aspect-[16/8] overflow-hidden border-b border-border bg-secondary/60">
                    {comp.thumbnailImage || comp.coverImage ? (
                      <img src={resolveAssetUrl(comp.thumbnailImage || comp.coverImage)} alt={`${comp.title} cover`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-secondary to-background"><Trophy aria-hidden="true" className="h-10 w-10 text-muted-foreground/35" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
                    <Pill variant={statusVariant(comp.currentPhase)} className="absolute left-4 top-4 bg-background/90 font-semibold">
                      {comp.currentPhase === "AbstractSelection" ? "Abstract selection" : comp.currentPhase === "OfflineCompetition" ? "Offline competition" : comp.currentPhase}
                    </Pill>
                    <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white drop-shadow"><Trophy className="h-3.5 w-3.5" />Competition</div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">{comp.title}</h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-[12px] leading-relaxed text-muted-foreground">{comp.overview}</p>
                    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" />{comp.competitionDate ? new Date(comp.competitionDate).toLocaleDateString() : "Date TBA"}</span>
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 shrink-0" />{comp.maxSquadronSize ? `Up to ${comp.maxSquadronSize}` : "Squad size TBA"}</span>
                      <span className="col-span-2 inline-flex items-center justify-end gap-1.5 font-medium text-foreground">Competition details<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
                    </div>
                  </div>
                </Surface>
              </Link>
            ))}
            {filteredCompetitions.length === 0 && (
              <div className="col-span-full border border-dashed border-border bg-card/30 px-6 py-16 text-center">
                <Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" />
                <h2 className="text-[15px] font-semibold text-foreground">No matching competitions</h2>
                <p className="mt-1 text-[12px] text-muted-foreground">Try another search or select a different phase.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
