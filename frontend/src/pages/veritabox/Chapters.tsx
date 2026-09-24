import { Link } from "react-router-dom";
import { PublicShell } from "@/components/veritabox/PublicShell";
import { Surface, Pill } from "@/components/veritabox/UI";
import { MapPin, Users, Trophy, Search, Plus, Loader2, Globe, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { chaptersApi, Chapter, resolveAssetUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Chapters() {
  const { profile } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const data = await chaptersApi.getAll();
        setChapters(data);
      } catch (error) {
        console.error("Error fetching chapters:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, []);

  const filteredChapters = chapters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Global Network</div>
              <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Institutes</h1>
              <p className="mt-2 text-[13.5px] text-muted-foreground max-w-xl leading-relaxed">
                Autonomous engineering hubs located within universities, focused on building the future of robotics and AI.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link to="/chapters/leaderboard">
                <button className="h-9 px-4 border border-border hover:bg-secondary text-[12px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 rounded">
                  <Trophy className="h-3.5 w-3.5 text-warning" /> Leaderboard
                </button>
              </Link>
              {profile?.chapterId ? (
                <Link to="/dashboard/chapter">
                  <button className="h-9 px-5 bg-primary text-primary-foreground font-bold text-[12px] uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5 rounded">
                    Institute Command
                  </button>
                </Link>
              ) : (
                (profile?.role === "Teacher" || profile?.role === "Faculty" || profile?.role === "Admin") ? (
                  <Link to="/chapters/apply">
                    <button className="h-9 px-5 bg-foreground text-background font-bold text-[12px] uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-1.5 rounded">
                      <Plus className="h-3.5 w-3.5" /> Start Institute
                    </button>
                  </Link>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-8">
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search by university, city, or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 bg-card/50 border border-border pl-10 pr-4 text-[12px] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-widest animate-pulse">Scanning Network...</span>
          </div>
        ) : filteredChapters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredChapters.map(c => (
              <Link key={c._id} to={`/chapters/${c.slug}`} className="group">
                <Surface hover className="p-5 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-9 w-9 bg-secondary/50 rounded flex items-center justify-center border border-border group-hover:border-primary/20 transition-colors">
                        {c.logoUrl ? (
                          <img src={resolveAssetUrl(c.logoUrl)} alt={c.name} className="h-5 w-5 object-contain" />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
                        )}
                      </div>
                      {c.stats?.rank && (
                        <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                          <span className="text-[9px] text-primary uppercase font-bold tracking-wider">Rank</span>
                          <span className="text-[11px] font-bold text-primary">#{c.stats.rank}</span>
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-[14px] font-semibold tracking-tight group-hover:text-primary transition-colors line-clamp-1">{c.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 uppercase tracking-wider">{c.university}</p>
                    
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-3">
                      <MapPin className="h-3.5 w-3.5 opacity-60" />
                      <span className="uppercase tracking-tight">{c.city}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 opacity-60" /> {c.memberCount || 0} operatives
                    </span>
                    <span className="flex items-center gap-1 font-bold text-foreground">
                      <Trophy className="h-3.5 w-3.5 text-warning" /> {c.stats?.totalReputation ? (c.stats.totalReputation / 1000).toFixed(1) + 'k' : '0.0k'} Rep
                    </span>
                  </div>
                </Surface>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-14 w-14 bg-secondary/30 rounded-full flex items-center justify-center border border-border border-dashed">
              <Search className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[14px] font-bold uppercase tracking-wider text-muted-foreground">No matching nodes found</h3>
              <p className="text-[11.5px] text-muted-foreground/60 max-w-xs leading-normal">Adjust your search query or apply to start a new institute in your university.</p>
            </div>
            {(profile?.role === "Teacher" || profile?.role === "Faculty" || profile?.role === "Admin") && (
              <Link to="/chapters/apply">
                <button className="h-9 px-5 border border-border hover:bg-secondary text-[11px] font-bold uppercase tracking-widest transition-all rounded">
                  Initiate New Institute
                </button>
              </Link>
            )}
          </div>
        )}
      </div>

    </PublicShell>
  );
}
