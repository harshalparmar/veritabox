import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface } from "@/components/veritabox/UI";
import { Search, Loader2 } from "lucide-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { usersApi, forgeApi, resolveAssetUrl } from "@/lib/api";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Link, useSearchParams } from "react-router-dom";
import React from "react";
import { SearchField } from "@/components/veritabox/SearchField";

export default function Leaderboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "forge" ? "forge" : "global";
  const [activeTab, setActiveTab] = useState<'global' | 'forge'>(initialTab);
  const [chapterFilter, setChapterFilter] = useState("");
  const [search, setSearch] = useState("");

  const handleTabChange = (tab: 'global' | 'forge') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const {
    data: globalData,
    isLoading: isGlobalLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useInfiniteQuery({
    queryKey: ["leaderboard", chapterFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await usersApi.getLeaderboard({ chapter: chapterFilter, page: pageParam, limit: 10 } as any);
      if (Array.isArray(res)) {
        return { leaders: res, nextCursor: undefined };
      }
      return { 
        leaders: res.leaders, 
        nextCursor: res.currentPage < res.totalPages ? res.currentPage + 1 : undefined 
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 1,
    enabled: activeTab === 'global',
  });

  const allLeaders = useMemo(() => {
    return globalData?.pages.flatMap(page => page.leaders) || [];
  }, [globalData]);

  const filteredLeaders = useMemo(() => {
    return allLeaders.filter((l: any) => {
      const searchLower = search.toLowerCase();
      const matchName = l.name ? l.name.toLowerCase().includes(searchLower) : false;
      const matchUsername = l.username ? l.username.toLowerCase().includes(searchLower) : false;
      return matchName || matchUsername;
    });
  }, [allLeaders, search]);

  const { data: forgeData, isLoading: isForgeLoading } = useQuery({
    queryKey: ["forge-leaderboard"],
    queryFn: () => forgeApi.getLeaderboard(),
    enabled: activeTab === 'forge',
  });

  const filteredForge = useMemo(() => {
    if (!forgeData) return [];
    return forgeData.filter((item: any) => {
      const searchLower = search.toLowerCase();
      const matchName = item.user?.name ? item.user.name.toLowerCase().includes(searchLower) : false;
      const matchUsername = item.user?.username ? item.user.username.toLowerCase().includes(searchLower) : false;
      return matchName || matchUsername;
    });
  }, [forgeData, search]);

  const isLoading = activeTab === 'global' ? isGlobalLoading : isForgeLoading;
  const noLeadersFound = activeTab === 'global'
    ? (!filteredLeaders || filteredLeaders.length === 0)
    : (!filteredForge || filteredForge.length === 0);

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Operations</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Leaderboard</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground max-w-xl leading-relaxed">
            The global registry of high-performance operatives. Rankings are calculated based on bounty resolutions, mission successes, and community contributions.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-12">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 flex-wrap mb-8">
          <button
            onClick={() => handleTabChange('global')}
            className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", activeTab === 'global' ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
          >
            Global Network
          </button>
          <button
            onClick={() => handleTabChange('forge')}
            className={cn("flex items-center gap-2 text-[12px] px-3 py-1.5 border rounded transition-colors", activeTab === 'forge' ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")}
          >
            CodeForge Solvers
          </button>
        </div>

        {/* Control Bar */}
        <div className="mb-8 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(14rem,auto)]">
            <SearchField
              label={activeTab === "global" ? "global leaderboard" : "CodeForge leaderboard"}
              onChange={setSearch}
              placeholder={activeTab === 'global' ? "Search operative by name or ID..." : "Search CodeForge solver..."}
              value={search}
            />
        </div>

        <Surface className="overflow-hidden border-border/50 shadow-2xl">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Retrieving tactical data...</div>
            </div>
          ) : activeTab === 'global' ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] sm:text-[13px]">
                  <thead className="bg-secondary/30 text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="text-left px-3 sm:px-6 py-3 sm:py-4 w-12 sm:w-16">Rank</th>
                      <th className="text-left px-3 sm:px-6 py-3 sm:py-4">Operative</th>
                      <th className="text-left px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">Institute</th>
                      <th className="text-right px-3 sm:px-6 py-3 sm:py-4">Reputation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaders.map((o: any, idx: number) => (
                      <tr key={o._id} className={cn(
                        "border-t border-border/40 hover:bg-primary/[0.02] transition-colors group",
                        idx < 3 && "bg-primary/[0.01]"
                      )}>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono">
                          {idx === 0 ? (
                            <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-warning/20 border border-warning/30 flex items-center justify-center text-warning font-bold">
                                1
                            </div>
                          ) : idx === 1 ? (
                            <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
                                2
                            </div>
                          ) : idx === 2 ? (
                            <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                                3
                            </div>
                          ) : (
                            <span className="text-muted-foreground pl-1 sm:pl-2">{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <Link to={`/profile/${o.username || o._id}`} className="flex items-center gap-2 sm:gap-3 group">
                                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-[11px] sm:text-[12px] font-bold group-hover:border-primary/50 transition-colors overflow-hidden shrink-0">
                                    {o.avatarUrl ? <img src={resolveAssetUrl(o.avatarUrl)} alt="" className="h-full w-full object-cover" /> : o.name?.substring(0, 1) || "O"}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-[13px] sm:text-[14px] group-hover:text-primary transition-colors truncate max-w-[120px] sm:max-w-[200px]">{o.name || "Unknown"}</div>
                                    <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">@{o.username || "operative"}</div>
                                </div>
                            </Link>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                            <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
                                <span className="truncate max-w-[150px]">{o.chapter || "Undeclared"}</span>
                            </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                            <div className="font-mono text-[14px] sm:text-[15px] font-bold text-foreground">
                                {(o.reputationPoints || 0).toLocaleString()}
                            </div>
                            <div className="text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">REP_CREDITS</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasNextPage && (
                <div className="p-4 border-t border-border/50 flex justify-center bg-secondary/10">
                  <button 
                    onClick={() => fetchNextPage()} 
                    disabled={isFetchingNextPage}
                    className="h-9 px-6 bg-secondary border border-border hover:bg-border transition-colors text-[11px] font-bold uppercase tracking-widest rounded flex items-center gap-2"
                  >
                    {isFetchingNextPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Load More Operatives"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] sm:text-[13px]">
                <thead className="bg-secondary/30 text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="text-left px-3 sm:px-6 py-3 sm:py-4 w-12 sm:w-16">Rank</th>
                    <th className="text-left px-3 sm:px-6 py-3 sm:py-4">Operative</th>
                    <th className="text-center px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">Solved Targets</th>
                    <th className="text-center px-3 sm:px-6 py-3 sm:py-4 sm:hidden">Solved</th>
                    <th className="text-right px-3 sm:px-6 py-3 sm:py-4">Reputation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForge.map((item: any, idx: number) => {
                    const o = item.user;
                    const solvedCount = item.solvedCount;
                    if (!o) return null;
                    return (
                      <tr key={o._id} className={cn(
                        "border-t border-border/40 hover:bg-primary/[0.02] transition-colors group",
                        idx < 3 && "bg-primary/[0.01]"
                      )}>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono">
                          {idx === 0 ? (
                            <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-warning/20 border border-warning/30 flex items-center justify-center text-warning font-bold">
                                1
                            </div>
                          ) : idx === 1 ? (
                            <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
                                2
                            </div>
                          ) : idx === 2 ? (
                            <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                                3
                            </div>
                          ) : (
                            <span className="text-muted-foreground pl-1 sm:pl-2">{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <Link to={`/profile/${o.username || o._id}`} className="flex items-center gap-2 sm:gap-3 group">
                                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-[11px] sm:text-[12px] font-bold group-hover:border-primary/50 transition-colors overflow-hidden shrink-0">
                                    {o.avatarUrl ? <img src={resolveAssetUrl(o.avatarUrl)} alt="" className="h-full w-full object-cover" /> : o.name?.substring(0, 1) || "O"}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-[13px] sm:text-[14px] group-hover:text-primary transition-colors truncate max-w-[120px] sm:max-w-[200px]">{o.name || "Unknown"}</div>
                                    <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">@{o.username || "operative"}</div>
                                </div>
                            </Link>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-center font-mono text-[13px] sm:text-[14px] font-semibold text-foreground">
                            {solvedCount}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                            <div className="font-mono text-[14px] sm:text-[15px] font-bold text-foreground">
                                {(o.reputationPoints || 0).toLocaleString()}
                            </div>
                            <div className="text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">REP_CREDITS</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Surface>

        {noLeadersFound && !isLoading && (
            <div className="py-20 text-center space-y-4 border-2 border-dashed border-border rounded-3xl mt-8">
                <Search className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                <div className="text-[12px] uppercase font-bold tracking-widest text-muted-foreground/50">No operatives found in this sector.</div>
            </div>
        )}
      </div>
    </PublicShell>
  );
}
