import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface } from "@/components/veritabox/UI";
import { 
  Trophy, Users, Loader2, Building2, ChevronLeft
} from "lucide-react";
import { chaptersApi, resolveAssetUrl } from "@/lib/api";

export default function ChapterLeaderboard() {
  const { data: chapters, isLoading } = useQuery({
    queryKey: ["chapters-leaderboard"],
    queryFn: () => chaptersApi.getAll(),
  });

  const sortedChapters = chapters?.sort((a, b) => (b.stats?.totalReputation || 0) - (a.stats?.totalReputation || 0)) || [];
  const topThree = sortedChapters.slice(0, 3);
  const remaining = sortedChapters.slice(3);

  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1200px] px-6 py-8">
          <div className="mb-4">
            <Link to="/chapters" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider">
              <ChevronLeft className="h-3 w-3" /> Back to Institutes
            </Link>
          </div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Global Rankings</div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Leaderboard</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground max-w-xl">
            Celebrating the most active and collaborative engineering sectors in the network. Points are awarded for build logs, hardware deployments, and community contributions.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-6 py-10">
        {/* Podium */}
        {sortedChapters.length > 0 && (
          <div className="grid md:grid-cols-3 gap-4 mb-10 items-end">
            {/* Rank 2 */}
            {topThree[1] && (
              <Link to={`/chapters/${topThree[1].slug}`} className="order-2 md:order-1">
                <Surface hover className="p-6 text-center relative border-border/50 group">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary border border-border text-[9px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">Rank #2</div>
                  <div className="h-14 w-14 rounded bg-secondary/80 border border-border mx-auto mb-3 flex items-center justify-center overflow-hidden">
                    {topThree[1].logoUrl ? <img src={resolveAssetUrl(topThree[1].logoUrl)} className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-muted-foreground/50" />}
                  </div>
                  <h3 className="text-[13px] font-semibold tracking-tight group-hover:text-primary transition-colors line-clamp-1">{topThree[1].name}</h3>
                  <div className="text-[10px] text-muted-foreground mt-0.5 uppercase line-clamp-1">{topThree[1].university}</div>
                  <div className="mt-4 text-[16px] font-bold text-foreground">{(topThree[1].stats?.totalReputation || 0).toLocaleString()} <span className="text-[9px] font-normal text-muted-foreground uppercase">XP</span></div>
                </Surface>
              </Link>
            )}

            {/* Rank 1 */}
            {topThree[0] && (
              <Link to={`/chapters/${topThree[0].slug}`} className="order-1 md:order-2">
                <Surface hover className="p-8 text-center relative border-primary bg-primary/[0.02] group">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3.5 py-0.5 rounded uppercase tracking-wider">Champion</div>
                  <div className="h-16 w-16 rounded bg-secondary/80 border border-primary/20 mx-auto mb-4 flex items-center justify-center overflow-hidden">
                    {topThree[0].logoUrl ? <img src={resolveAssetUrl(topThree[0].logoUrl)} className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-primary" />}
                  </div>
                  <h3 className="text-[15px] font-semibold tracking-tight group-hover:text-primary transition-colors line-clamp-1">{topThree[0].name}</h3>
                  <div className="text-[11px] text-muted-foreground mt-0.5 uppercase font-medium line-clamp-1">{topThree[0].university}</div>
                  <div className="mt-5 text-[22px] font-bold text-primary">{(topThree[0].stats?.totalReputation || 0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground uppercase">XP</span></div>
                  <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {topThree[0].memberCount || 0} members</span>
                  </div>
                </Surface>
              </Link>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <Link to={`/chapters/${topThree[2].slug}`} className="order-3">
                <Surface hover className="p-6 text-center relative border-border/50 group">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary border border-border text-[9px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">Rank #3</div>
                  <div className="h-14 w-14 rounded bg-secondary/80 border border-border mx-auto mb-3 flex items-center justify-center overflow-hidden">
                    {topThree[2].logoUrl ? <img src={resolveAssetUrl(topThree[2].logoUrl)} className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-muted-foreground/50" />}
                  </div>
                  <h3 className="text-[13px] font-semibold tracking-tight group-hover:text-primary transition-colors line-clamp-1">{topThree[2].name}</h3>
                  <div className="text-[10px] text-muted-foreground mt-0.5 uppercase line-clamp-1">{topThree[2].university}</div>
                  <div className="mt-4 text-[16px] font-bold text-foreground">{(topThree[2].stats?.totalReputation || 0).toLocaleString()} <span className="text-[9px] font-normal text-muted-foreground uppercase">XP</span></div>
                </Surface>
              </Link>
            )}
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {remaining.length > 0 && (
            <div className="px-4 grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              <div className="col-span-1">Rank</div>
              <div className="col-span-7">Institute</div>
              <div className="col-span-2 text-center">Operatives</div>
              <div className="col-span-2 text-right">Reputation</div>
            </div>
          )}
          {remaining.map((c, i) => (
            <Link key={c._id} to={`/chapters/${c.slug}`}>
              <Surface hover className="p-3 grid grid-cols-12 items-center group">
                <div className="col-span-1 font-mono text-[13px] text-muted-foreground group-hover:text-primary transition-colors font-bold">#{i + 4}</div>
                <div className="col-span-7 flex items-center gap-3">
                  <div className="h-8 w-8 bg-secondary rounded border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    {c.logoUrl ? <img src={resolveAssetUrl(c.logoUrl)} className="h-full w-full object-cover" /> : <Building2 className="h-4 w-4 text-muted-foreground/30" />}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold tracking-tight group-hover:text-primary transition-colors">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase truncate max-w-[250px]">{c.university}</div>
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-[12px] text-muted-foreground font-mono">{c.memberCount || 0}</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-[13px] font-bold font-mono">{(c.stats?.totalReputation || 0).toLocaleString()} XP</span>
                </div>
              </Surface>
            </Link>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
