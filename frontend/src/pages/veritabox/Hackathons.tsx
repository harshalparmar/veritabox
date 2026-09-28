import { Link } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { Calendar, Users, Trophy, Loader2, ArrowRight, MapPin, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { hackathonsApi, resolveAssetUrl } from "@/lib/api";
import { useState } from "react";
import { SearchField } from "@/components/veritabox/SearchField";

const statusVariant = (s: string): any => s === "Live" ? "danger" : s === "Announced" ? "success" : s === "Published" ? "info" : "default";

export default function Hackathons() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  const { data: hackathons, isLoading } = useQuery({
    queryKey: ["hackathons"],
    queryFn: () => hackathonsApi.getAll(),
  });

  const filteredHackathons = (hackathons || []).filter(h => {
    const matchesStatus = activeFilter === "All" || h.status === activeFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [h.title, h.shortDescription, h.description, h.subCategory, h.chapterScope]
      .some(value => typeof value === "string" && value.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });
  const filterOptions = ["All", "Live", "Announced", "Concluded"];
  const statusCounts = filterOptions.reduce<Record<string, number>>((counts, status) => {
    counts[status] = status === "All"
      ? hackathons?.length || 0
      : hackathons?.filter(hackathon => hackathon.status === status).length || 0;
    return counts;
  }, {});

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto flex max-w-[1300px] flex-col gap-6 px-6 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Operations / Team Missions</div>
            <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Hackathons</h1>
            <p className="mt-2 max-w-xl text-[13.5px] text-muted-foreground">
              Find a mission, bring your squadron, and build toward a shared deadline.
            </p>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 divide-x divide-border border border-border bg-background/60">
            <div className="px-4 py-3">
              <div className="text-[10px] font-medium uppercase text-muted-foreground">Live now</div>
              <div className="mt-1 flex items-center gap-2 text-[18px] font-semibold tabular-nums"><span className="h-2 w-2 rounded-full bg-danger" />{statusCounts.Live}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[10px] font-medium uppercase text-muted-foreground">Announced</div>
              <div className="mt-1 text-[18px] font-semibold tabular-nums">{statusCounts.Announced}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 border border-border bg-card/40 p-1" role="group" aria-label="Filter hackathons by status">
          {filterOptions.map((t) => (
            <button 
              key={t} 
              aria-pressed={activeFilter === t}
              onClick={() => setActiveFilter(t)}
              className={`flex items-center gap-2 px-3 py-2 text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                activeFilter === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {t}
              <span className={`text-[10px] tabular-nums ${activeFilter === t ? "text-background/70" : "text-muted-foreground/70"}`}>{statusCounts[t]}</span>
            </button>
          ))}
          </div>
          <SearchField label="hackathons" placeholder="Search missions, category, scope..." value={search} onChange={setSearch} className="sm:max-w-sm" />
        </div>

        {!isLoading && <p className="mb-4 text-[11px] text-muted-foreground">{filteredHackathons.length} {filteredHackathons.length === 1 ? "mission" : "missions"}</p>}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredHackathons.map(h => (
              <Link key={h._id} to={`/hackathons/${h.slug}`} className="group rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <Surface hover className="flex h-full min-h-[340px] flex-col overflow-hidden border-border/80 transition-all group-hover:-translate-y-0.5 group-hover:border-foreground/30 group-hover:shadow-lg">
                  <div className="relative aspect-[16/8] overflow-hidden border-b border-border bg-secondary/60">
                    {h.thumbnailImage || h.bannerImage ? (
                      <img src={resolveAssetUrl(h.thumbnailImage || h.bannerImage)} alt={`${h.title} thumbnail`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-secondary to-background"><Trophy aria-hidden="true" className="h-10 w-10 text-muted-foreground/35" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
                    <Pill variant={statusVariant(h.status)} className="absolute left-4 top-4">{h.status}</Pill>
                    {h.subCategory && <span className="absolute bottom-3 left-4 text-[10px] font-semibold uppercase tracking-wider text-white drop-shadow">{h.subCategory}</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">{h.title}</h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-[12px] leading-relaxed text-muted-foreground">{h.shortDescription || h.description}</p>
                    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                      <span className="flex min-w-0 items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{h.rounds?.[0]?.startTime ? new Date(h.rounds[0].startTime).toLocaleDateString() : "Date TBA"}</span></span>
                      {h.chapterScope && <span className="flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{h.chapterScope}</span></span>}
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 shrink-0" />{h.teamCount ?? 0} teams</span>
                      <span className="inline-flex items-center justify-end gap-1.5 font-medium text-foreground">Details<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
                    </div>
                  </div>
                </Surface>
              </Link>
            ))}
            {filteredHackathons.length === 0 && (
              <div className="col-span-full border border-dashed border-border bg-card/30 px-6 py-16 text-center">
                <Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" />
                <h2 className="text-[15px] font-semibold text-foreground">No matching hackathons</h2>
                <p className="mt-1 text-[12px] text-muted-foreground">Try another search or choose a different status.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
