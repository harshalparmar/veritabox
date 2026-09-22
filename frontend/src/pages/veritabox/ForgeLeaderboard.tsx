import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { Surface } from "@/components/VeritaBox/UI";
import { Trophy, Search, ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { forgeApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ForgeLeaderboard() {
  const [search, setSearch] = useState("");

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["forge-leaderboard"],
    queryFn: () => forgeApi.getLeaderboard(),
  });

  const filtered = useMemo(() => {
    if (!leaderboard) return [];
    return leaderboard.filter((item) =>
      item.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.user?.username?.toLowerCase().includes(search.toLowerCase())
    );
  }, [leaderboard, search]);

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

        <div className="mx-auto max-w-[900px] px-6 py-12 relative">
          <Link
            to="/forge"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-primary transition-all uppercase tracking-widest mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Catalog
          </Link>
          <h1 className="text-[36px] font-semibold tracking-tight text-foreground">Forge Rankings</h1>
          <p className="mt-3 text-[13.5px] text-muted-foreground max-w-2xl leading-relaxed">
            The global rankings of elite engineers. Rankings are calculated based on successful sandbox commits and algorithm solves.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-6 py-10">
        {/* -- CONTROL BAR -- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex-1 flex items-center gap-3 px-4 h-11 bg-card border border-border rounded-xl shadow-inner group focus-within:border-primary/50 transition-all max-w-md">
            <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search operative registry..."
              className="bg-transparent text-[13px] flex-1 outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary animate-pulse" /> Active Sector Solvers
          </div>
        </div>

        {/* ── LEADERBOARD GRID ── */}
        <Surface className="overflow-hidden border-border/50 shadow-2xl">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
              <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
                Parsing Solves Table...
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/20 mx-auto" />
              <h4 className="text-[14px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                Registry Silent
              </h4>
              <p className="text-[12px] text-muted-foreground/30 mt-0.5">
                No solvers committed for current filter parameters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-secondary/30 text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4 w-20 text-center">Rank</th>
                    <th className="px-6 py-4 text-left">Operative</th>
                    <th className="px-6 py-4 text-center">Solved Targets</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Reputation</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const o = item.user;
                    const solvedCount = item.solvedCount;
                    if (!o) return null;
                    const initials =
                      o.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2) || "?";
                    return (
                      <tr
                        key={o._id}
                        className={cn(
                          "border-t border-border/40 hover:bg-primary/[0.01] transition-colors group",
                          idx < 3 && "bg-primary/[0.005]"
                        )}
                      >
                        <td className="px-6 py-4 font-mono">
                          {idx === 0 ? (
                            <div className="h-7 w-7 rounded-full bg-warning/20 border border-warning/30 flex items-center justify-center mx-auto">
                              <Trophy className="h-3.5 w-3.5 text-warning" />
                            </div>
                          ) : idx === 1 ? (
                            <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground mx-auto">
                              2
                            </div>
                          ) : idx === 2 ? (
                            <div className="h-7 w-7 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mx-auto">
                              3
                            </div>
                          ) : (
                            <span className="text-muted-foreground block text-center">{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Link to={`/profile/${o.username || o._id}`} className="flex items-center gap-3 group">
                            <div className="h-9 w-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-[12px] font-bold group-hover:border-primary/50 transition-colors overflow-hidden">
                              {o.avatarUrl ? (
                                <img src={o.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                initials
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-[14px] group-hover:text-primary transition-colors">
                                {o.name || "Unknown"}
                              </div>
                              <div className="text-[11px] text-muted-foreground">@{o.username || "operative"}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-[14px] font-semibold text-foreground">
                          {solvedCount}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 h-5 px-2 rounded-full border text-[9px] font-bold uppercase tracking-widest",
                              o.reputationPoints > 500
                                ? "bg-success/10 border-success/30 text-success"
                                : "bg-info/10 border-info/30 text-info"
                            )}
                          >
                            {o.reputationPoints > 500 ? "Master" : "Operative"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-mono text-[15px] font-bold text-foreground">
                            {(o.reputationPoints || 0).toLocaleString()}
                          </div>
                          <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">
                            REP_CREDITS
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Surface>
      </div>
    </PublicShell>
  );
}
