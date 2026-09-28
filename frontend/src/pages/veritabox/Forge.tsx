import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { Loader2, CheckCircle2, HelpCircle, Search, X, Trophy, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { forgeApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Forge() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicsExpanded, setTopicsExpanded] = useState(false);

  const { data: challenges, isLoading: isLoadingChallenges } = useQuery({
    queryKey: ["challenges"],
    queryFn: () => forgeApi.getAll(),
  });

  const allTopics = useMemo(() => {
    if (!challenges) return [];
    const tagSet = new Set<string>();
    challenges.forEach((c: any) => {
      c.tags?.forEach((t: string) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [challenges]);

  const stats = useMemo(() => {
    if (!challenges) return { solved: 0, total: 0, rookieSolved: 0, rookieTotal: 0, operativeSolved: 0, operativeTotal: 0, eliteSolved: 0, eliteTotal: 0 };

    let solved = 0;
    let rookieSolved = 0, rookieTotal = 0;
    let operativeSolved = 0, operativeTotal = 0;
    let eliteSolved = 0, eliteTotal = 0;

    challenges.forEach((c: any) => {
      const isSolved = c.solvedStatus === 'Solved';
      if (isSolved) solved++;

      if (c.difficulty === 'Rookie') {
        rookieTotal++;
        if (isSolved) rookieSolved++;
      } else if (c.difficulty === 'Operative') {
        operativeTotal++;
        if (isSolved) operativeSolved++;
      } else if (c.difficulty === 'Elite') {
        eliteTotal++;
        if (isSolved) eliteSolved++;
      }
    });

    return {
      solved,
      total: challenges.length,
      rookieSolved,
      rookieTotal,
      operativeSolved,
      operativeTotal,
      eliteSolved,
      eliteTotal
    };
  }, [challenges]);

  const challengeToIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (challenges) {
      challenges.forEach((c: any, idx: number) => {
        map[c._id] = idx + 1;
      });
    }
    return map;
  }, [challenges]);

  const processedChallenges = useMemo(() => {
    if (!challenges) return [];

    const filtered = challenges.filter((c: any) => {
      if (statusFilter === "Solved" && c.solvedStatus !== "Solved") return false;
      if (topicFilter && (!c.tags || !c.tags.includes(topicFilter))) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title?.toLowerCase().includes(q);
        const matchTag = c.tags?.some((t: string) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchTag) return false;
      }
      return true;
    });

    const solved: any[] = [];
    const unsolved: any[] = [];

    filtered.forEach((c: any) => {
      if (c.solvedStatus === 'Solved') {
        solved.push(c);
      } else {
        unsolved.push(c);
      }
    });

    return [...unsolved, ...solved];
  }, [challenges, statusFilter, topicFilter, searchQuery]);

  const activeFilterCount = [statusFilter !== "All", topicFilter !== null, searchQuery !== ""].filter(Boolean).length;

  return (
    <PublicShell>
      {/* Header Banner */}
      <div className="border-b border-border bg-card/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="mx-auto max-w-[1300px] px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8 relative z-10">
          <div className="max-w-xl">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Tactical Sandbox</div>
            <h1 className="mt-2 text-[24px] sm:text-[32px] font-semibold tracking-tight">Code Forge</h1>
            <p className="mt-2 text-[13px] sm:text-[13.5px] text-muted-foreground leading-relaxed">
              Compile robust solutions, bypass comprehensive test cases, and earn reputation credits in our premium coding arena.
            </p>
          </div>

          {/* Sandbox Status Panel */}
          <div className="w-full md:w-[380px] shrink-0">
            {!isLoadingChallenges && challenges && challenges.length > 0 ? (
              <Surface className="p-4 bg-card/40 border-border/60 space-y-4 backdrop-blur-sm shadow-md">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 flex items-center justify-center shrink-0 bg-secondary/25 rounded-full border border-border/30">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="transparent" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="4" />
                      <circle cx="32" cy="32" r="26" fill="transparent" stroke="hsl(var(--primary))" strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - (stats.solved / (stats.total || 1)))}`}
                        strokeLinecap="round" className="transition-all duration-500 ease-out" />
                    </svg>
                    <div className="text-center z-10 flex flex-col items-center justify-center">
                      <span className="text-[14px] font-mono font-bold leading-none text-foreground">{stats.solved}</span>
                      <div className="w-4 h-px bg-border/80 my-0.5" />
                      <span className="text-[9px] font-mono leading-none text-muted-foreground">{stats.total}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[12.5px] font-bold text-foreground">Sandbox Status</h4>
                    <p className="text-[10.5px] text-muted-foreground leading-relaxed mt-0.5">
                      Solve Rookies to train, Operatives to develop, and Elites to claim high payouts.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-border/30">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-success">
                      <span>Rookie Sector</span>
                      <span>{stats.rookieSolved}/{stats.rookieTotal}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-success transition-all duration-500" style={{ width: `${(stats.rookieSolved / (stats.rookieTotal || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-warning">
                      <span>Operative Sector</span>
                      <span>{stats.operativeSolved}/{stats.operativeTotal}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-warning transition-all duration-500" style={{ width: `${(stats.operativeSolved / (stats.operativeTotal || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-destructive">
                      <span>Elite Sector</span>
                      <span>{stats.eliteSolved}/{stats.eliteTotal}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-destructive transition-all duration-500" style={{ width: `${(stats.eliteSolved / (stats.eliteTotal || 1)) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </Surface>
            ) : (
              <Surface className="p-4 text-center text-muted-foreground text-[11px] bg-card/40 border-dashed">
                No stats resolved.
              </Surface>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-5">

          {/* Filters Bar */}
          <div className="space-y-3">
            {/* Search + Status Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search challenges..."
                  className="w-full h-9 pl-9 pr-8 bg-background border border-border rounded text-[12px] focus:outline-none focus:border-primary/50 transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-2">
                {["All", "Solved"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors uppercase font-mono tracking-wider ${
                      statusFilter === st
                        ? "bg-foreground text-background border-foreground font-black"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {st}
                  </button>
                ))}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setStatusFilter("All"); setTopicFilter(null); setSearchQuery(""); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Topic Filter Chips  -  collapsible */}
            {allTopics.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTopicsExpanded(!topicsExpanded)}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Filter className="h-3 w-3" />
                    Topics
                    {topicFilter && (
                      <span className="text-primary font-semibold normal-case tracking-normal">: {topicFilter}</span>
                    )}
                    {topicsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {topicFilter && (
                    <button
                      onClick={() => setTopicFilter(null)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
                {topicsExpanded && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {allTopics.map(topic => (
                      <button
                        key={topic}
                        onClick={() => setTopicFilter(topicFilter === topic ? null : topic)}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                          topicFilter === topic
                            ? "bg-primary text-primary-foreground border-primary font-semibold"
                            : "border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-secondary/30"
                        )}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results count */}
          {!isLoadingChallenges && (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {processedChallenges.length} challenge{processedChallenges.length !== 1 ? 's' : ''}{topicFilter ? ` in "${topicFilter}"` : ''}
              </p>
            </div>
          )}

          {/* Challenge List */}
          {isLoadingChallenges ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : processedChallenges.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground bg-secondary/5 rounded border border-dashed">
              No active challenges detected matching the filters.
            </div>
          ) : (
            <>
              {/* Desktop Table (hidden on mobile) */}
              <Surface className="overflow-hidden border-border/80 shadow-sm hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border/80">
                      <tr>
                        <th className="px-5 py-4 w-14">#</th>
                        <th className="px-5 py-4">Title</th>
                        <th className="px-5 py-4 w-28">Difficulty</th>
                        <th className="px-5 py-4 w-28 text-center">Acceptance</th>
                        <th className="px-5 py-4 w-28 text-center">Reward</th>
                        <th className="px-5 py-4 w-32 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-[13px]">
                      {processedChallenges.map((c: any) => {
                        const isSolved = c.solvedStatus === 'Solved';
                        const qIndex = challengeToIndexMap[c._id] || 1;
                        return (
                          <tr
                            key={c._id}
                            className={cn(
                              "transition-all group",
                              isSolved ? "opacity-50 bg-secondary/5 text-muted-foreground/80" : "hover:bg-secondary/15"
                            )}
                          >
                            <td className="px-5 py-4 font-mono font-bold">{qIndex}.</td>
                            <td className="px-5 py-4">
                              <Link
                                to={`/forge/${c._id}`}
                                className={cn(
                                  "font-semibold block tracking-tight group-hover:text-primary transition-colors",
                                  isSolved ? "text-muted-foreground/75" : "text-foreground"
                                )}
                              >
                                {c.title}
                              </Link>
                              <span className="text-[10px] text-muted-foreground/60 block mt-0.5">
                                {c.tags?.map((t: string) => `#${t}`).join(' ') || '#General'}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                c.difficulty === 'Elite' ? "bg-destructive/10 text-destructive border-destructive/20" :
                                c.difficulty === 'Operative' ? "bg-warning/10 text-warning border-warning/20" :
                                "bg-success/10 text-success border-success/20"
                              )}>
                                {c.difficulty}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-mono text-[12.5px] text-center">
                              {c.acceptanceRate && c.acceptanceRate > 0 ? `${c.acceptanceRate}%` : " - "}
                            </td>
                            <td className="px-5 py-4 font-mono font-semibold text-primary text-center">
                              +{c.reputationReward || 50} XP
                            </td>
                            <td className="px-5 py-4 text-right pr-5">
                              {(() => {
                                if (isSolved) {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] text-success font-black uppercase tracking-wider bg-success/10 px-2 py-0.5 rounded border border-success/20">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Solved
                                    </span>
                                  );
                                }
                                if (c.solvedStatus === 'Attempted') {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] text-warning font-black uppercase tracking-wider bg-warning/10 px-2 py-0.5 rounded border border-warning/20">
                                      <HelpCircle className="h-3.5 w-3.5 text-warning" /> Attempted
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[10px] font-mono text-muted-foreground/50">Todo</span>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Surface>

              {/* Mobile Card List (hidden on desktop) */}
              <div className="md:hidden space-y-2">
                {processedChallenges.map((c: any) => {
                  const isSolved = c.solvedStatus === 'Solved';
                  const qIndex = challengeToIndexMap[c._id] || 1;
                  return (
                    <Link key={c._id} to={`/forge/${c._id}`}>
                      <Surface
                        hover
                        className={cn(
                          "p-4 transition-all",
                          isSolved && "opacity-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-mono font-bold text-muted-foreground shrink-0">
                                #{qIndex}
                              </span>
                              <span className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0",
                                c.difficulty === 'Elite' ? "bg-destructive/10 text-destructive border-destructive/20" :
                                c.difficulty === 'Operative' ? "bg-warning/10 text-warning border-warning/20" :
                                "bg-success/10 text-success border-success/20"
                              )}>
                                {c.difficulty}
                              </span>
                            </div>
                            <p className={cn(
                              "text-[14px] font-semibold tracking-tight truncate",
                              isSolved ? "text-muted-foreground/75" : "text-foreground"
                            )}>
                              {c.title}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {c.tags?.map((t: string) => (
                                <span key={t} className="text-[9px] text-muted-foreground/60 bg-secondary/40 px-1.5 py-0.5 rounded">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="shrink-0 text-right space-y-1.5">
                            {isSolved ? (
                              <span className="inline-flex items-center gap-1 text-[9px] text-success font-black uppercase tracking-wider bg-success/10 px-1.5 py-0.5 rounded border border-success/20">
                                <CheckCircle2 className="h-3 w-3" /> Solved
                              </span>
                            ) : c.solvedStatus === 'Attempted' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] text-warning font-black uppercase tracking-wider bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">
                                <HelpCircle className="h-3 w-3" /> Tried
                              </span>
                            ) : null}
                            <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-primary justify-end">
                              <Trophy className="h-3 w-3" />
                              +{c.reputationReward || 50}
                            </div>
                            {c.acceptanceRate > 0 && (
                              <p className="text-[9px] font-mono text-muted-foreground/50">{c.acceptanceRate}%</p>
                            )}
                          </div>
                        </div>
                      </Surface>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
