import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface } from "@/components/veritabox/UI";
import { Loader2, CheckCircle2, HelpCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { forgeApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Forge() {
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: challenges, isLoading: isLoadingChallenges } = useQuery({
    queryKey: ["challenges"],
    queryFn: () => forgeApi.getAll(),
  });

  const stats = useMemo(() => {
    if (!challenges) return { solved: 0, total: 0, rookieSolved: 0, rookieTotal: 0, operativeSolved: 0, operativeTotal: 0, eliteSolved: 0, eliteTotal: 0 };
    
    let solved = 0;
    let rookieSolved = 0, rookieTotal = 0;
    let operativeSolved = 0, operativeTotal = 0;
    let eliteSolved = 0, eliteTotal = 0;

    challenges.forEach(c => {
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

  // Static Question Index Map based on initial load order
  const challengeToIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (challenges) {
      challenges.forEach((c, idx) => {
        map[c._id] = idx + 1;
      });
    }
    return map;
  }, [challenges]);

  // Filter & Sort: Solved questions go to the bottom of the list
  const processedChallenges = useMemo(() => {
    if (!challenges) return [];
    
    const filtered = challenges.filter((c) => {
      if (statusFilter === "All") return true;
      return c.solvedStatus === statusFilter;
    });

    const solved: any[] = [];
    const unsolved: any[] = [];
    
    filtered.forEach(c => {
      if (c.solvedStatus === 'Solved') {
        solved.push(c);
      } else {
        unsolved.push(c);
      }
    });

    return [...unsolved, ...solved];
  }, [challenges, statusFilter]);

  return (
    <PublicShell>
      {/* Header Banner */}
      <div className="border-b border-border bg-card/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="mx-auto max-w-[1300px] px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-8 relative z-10">
          <div className="max-w-xl">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Tactical Sandbox</div>
            <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Code Forge</h1>
            <p className="mt-2 text-[13.5px] text-muted-foreground">
              Compile robust solutions, bypass comprehensive test cases, and earn reputation credits in our premium coding arena.
            </p>
          </div>

          {/* Sandbox Status (Solving Metrics) Panel */}
          <div className="w-full md:w-[380px] shrink-0">
            {!isLoadingChallenges && challenges && challenges.length > 0 ? (
              <Surface className="p-4 bg-card/40 border-border/60 space-y-4 backdrop-blur-sm shadow-md">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 flex items-center justify-center shrink-0 bg-secondary/25 rounded-full border border-border/30">
                    {/* SVG Progress Circle */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                      {/* Background track circle */}
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        fill="transparent"
                        stroke="rgba(255, 255, 255, 0.03)"
                        strokeWidth="4"
                      />
                      {/* Foreground active circle */}
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        fill="transparent"
                        stroke="hsl(var(--primary))"
                        strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - (stats.solved / (stats.total || 1)))}`}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                      />
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

                {/* Progressive bars */}
                <div className="space-y-2.5 pt-2 border-t border-border/30">
                  {/* Rookie Sector */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-success">
                      <span>Rookie Sector</span>
                      <span>{stats.rookieSolved}/{stats.rookieTotal}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success transition-all duration-500" 
                        style={{ width: `${(stats.rookieSolved / (stats.rookieTotal || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Operative Sector */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-warning">
                      <span>Operative Sector</span>
                      <span>{stats.operativeSolved}/{stats.operativeTotal}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-warning transition-all duration-500" 
                        style={{ width: `${(stats.operativeSolved / (stats.operativeTotal || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Elite Sector */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-destructive">
                      <span>Elite Sector</span>
                      <span>{stats.eliteSolved}/{stats.eliteTotal}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-destructive transition-all duration-500" 
                        style={{ width: `${(stats.eliteSolved / (stats.eliteTotal || 1)) * 100}%` }}
                      />
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

      <div className="mx-auto max-w-[1300px] px-6 py-8">
        <div className="space-y-6">
          
          {/* Control bar - Flat hackathon-style button row */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
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
          </div>

          {/* Challenges Professional Data Table */}
          {isLoadingChallenges ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : processedChallenges.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground bg-secondary/5 rounded border border-dashed">
              No active challenges detected matching the filters.
            </div>
          ) : (
            <Surface className="overflow-hidden border-border/80 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border/80">
                    <tr>
                      <th className="px-6 py-4 w-16">#</th>
                      <th className="px-6 py-4">Title</th>
                      <th className="px-6 py-4 w-32">Difficulty</th>
                      <th className="px-6 py-4 w-32 text-center">Acceptance</th>
                      <th className="px-6 py-4 w-32 text-center">Reward</th>
                      <th className="px-6 py-4 w-36 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-[13px]">
                    {processedChallenges.map((c) => {
                      const isSolved = c.solvedStatus === 'Solved';
                      const qIndex = challengeToIndexMap[c._id] || 1;
                      return (
                        <tr 
                          key={c._id} 
                          className={cn(
                            "transition-all group border-b border-border/40",
                            isSolved ? "opacity-50 bg-secondary/5 text-muted-foreground/80" : "hover:bg-secondary/15"
                          )}
                        >
                          <td className="px-6 py-4 font-mono font-bold">
                            {qIndex}.
                          </td>
                          <td className="px-6 py-4">
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
                              {c.tags?.map(t => `#${t}`).join(' ') || '#General'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                              c.difficulty === 'Elite' ? "bg-destructive/10 text-destructive border-destructive/20" :
                              c.difficulty === 'Operative' ? "bg-warning/10 text-warning border-warning/20" :
                              "bg-success/10 text-success border-success/20"
                            )}>
                              {c.difficulty}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-[12.5px] text-center">
                            {c.acceptanceRate && c.acceptanceRate > 0 ? `${c.acceptanceRate}%` : "—"}
                          </td>
                          <td className="px-6 py-4 font-mono font-semibold text-primary text-center">
                            +{c.reputationReward || 50} XP
                          </td>
                          <td className="px-6 py-4 text-right pr-6">
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
          )}
        </div>
      </div>
    </PublicShell>
  );
}
